const fs = require('node:fs');
const path = require('node:path');

const { getActiveWindow, getIdleSeconds } = require('./window.js');
const { categorize, loadRules } = require('./categorizer.js');
const { applyPrivacyToFields } = require('./privacy.js');
const { DaemonDb } = require('./db.js');
const { ApiClient } = require('./client.js');
const { createBrowserContextServer } = require('./browser-context-server.js');

const configPath = path.resolve(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const db = new DaemonDb(path.resolve(__dirname, config.db_path));
const client = new ApiClient(config.api_url);

let currentActivityId = null;
let currentKey = null;
let currentStartedAt = null;
let lastBrowserContext = null;
let lastIdleSec = null;

function getRules() {
  return loadRules(db.getRules());
}

function isBrowserApp(appName) {
  const a = String(appName || '').toLowerCase();
  return a === 'chrome.exe' || a === 'msedge.exe' || a === 'firefox.exe' || a === 'brave.exe' || a === 'opera.exe';
}

function contextForDb(ctx, privacyCtx) {
  if (!ctx) return { browser_domain: null, browser_url: null, window_title: null };
  const raw = {
    browser_domain: ctx.domain ?? null,
    browser_url: config.browser_capture_full_url ? ctx.url ?? null : null,
    // If we have a web page title, prefer it over generic browser window title.
    window_title: ctx.title ?? null,
  };

  const priv = applyPrivacyToFields(
    { app_name: privacyCtx?.app_name ?? '', exe_path: privacyCtx?.exe_path ?? '' },
    { window_title: raw.window_title ?? '', browser_url: raw.browser_url ?? '' },
    config.privacy
  );

  return {
    browser_domain: raw.browser_domain,
    browser_url: priv.browser_url || null,
    window_title: priv.window_title || null,
  };
}

function splitActivityKey(key) {
  if (!key || typeof key !== 'string') return { app_name: '', category: '' };
  const i = key.indexOf('|');
  if (i <= 0) return { app_name: key, category: '' };
  return { app_name: key.slice(0, i), category: key.slice(i + 1) };
}

function closeCurrentActivity() {
  if (currentActivityId === null) return;
  const ended_at = new Date().toISOString();
  db.closeActivity(currentActivityId, ended_at);

  const { app_name, category } = splitActivityKey(currentKey);

  // API validates app_name + category; without them the POST fails and nothing is broadcast.
  client.postEvent({
    type: 'activity_end',
    app_name,
    category,
    window_title: '',
    started_at: currentStartedAt,
    ended_at,
  });

  currentActivityId = null;
  currentKey = null;
  currentStartedAt = null;
}

function startActivity(info, category) {
  const started_at = new Date().toISOString();
  const ctx = isBrowserApp(info.app_name) ? contextForDb(lastBrowserContext, info) : null;
  currentActivityId = db.upsertActivity({
    started_at,
    app_name: info.app_name,
    window_title: ctx?.window_title ?? info.window_title,
    pid: info.pid ?? null,
    exe_path: info.exe_path ?? '',
    browser_domain: ctx?.browser_domain ?? null,
    browser_url: ctx?.browser_url ?? null,
    activity_level: info.activity_level ?? null,
    category,
    project_id: null,
  });
  currentKey = `${info.app_name}|${category}`;
  currentStartedAt = started_at;

  client.postEvent({
    type: 'activity_start',
    app_name: info.app_name,
    window_title: info.window_title,
    pid: info.pid ?? null,
    exe_path: info.exe_path ?? '',
    activity_level: info.activity_level ?? null,
    browser_domain: ctx?.browser_domain ?? null,
    browser_url: ctx?.browser_url ?? null,
    category,
    started_at,
  });
}

function computeActivityLevel(idleSec) {
  const pollSec = Math.max(0.25, (config.poll_interval_ms ?? 2000) / 1000);
  const was = lastIdleSec;
  lastIdleSec = idleSec;

  if (!Number.isFinite(idleSec) || idleSec < 0) return { active_input: false, activity_level: null };
  if (idleSec >= config.idle_threshold_s) return { active_input: false, activity_level: 'idle' };
  if (idleSec <= 2) return { active_input: true, activity_level: 'active' };

  if (typeof was === 'number' && Number.isFinite(was)) {
    if (idleSec < was - pollSec * 0.5) return { active_input: true, activity_level: 'active' };
  }
  return { active_input: false, activity_level: 'passive' };
}

function tick() {
  const idleSec = getIdleSeconds();
  const isIdle = idleSec >= config.idle_threshold_s;

  const raw = isIdle ? { app_name: '_idle_', window_title: '', pid: null, exe_path: '' } : getActiveWindow();
  const { activity_level } = computeActivityLevel(idleSec);

  const privateFields = applyPrivacyToFields(
    { app_name: raw.app_name, exe_path: raw.exe_path },
    { window_title: raw.window_title, exe_path: raw.exe_path },
    config.privacy
  );

  const info = {
    app_name: raw.app_name,
    window_title: privateFields.window_title,
    pid: raw.pid ?? null,
    exe_path: privateFields.exe_path,
    activity_level,
  };

  const rules = getRules();
  const browserCtx = isBrowserApp(info.app_name)
    ? {
        browser_domain: lastBrowserContext?.domain ?? null,
        browser_url: config.browser_capture_full_url ? lastBrowserContext?.url ?? null : null,
      }
    : {};
  const category = isIdle
    ? 'idle'
    : categorize(info.app_name, rules, {
        window_title: info.window_title,
        ...browserCtx,
      });
  const key = `${info.app_name}|${category}`;

  if (key !== currentKey) {
    closeCurrentActivity();
    startActivity(info, category);
  } else if (currentActivityId !== null && isBrowserApp(info.app_name) && lastBrowserContext) {
    db.updateBrowserContext(currentActivityId, {
      ...contextForDb(lastBrowserContext, info),
      activity_level: info.activity_level,
    });
  } else if (currentActivityId !== null) {
    db.updateBrowserContext(currentActivityId, { activity_level: info.activity_level });
  }
}

function run() {
  console.log('[devtrack daemon] starting...');

  // Optional: browser extension posts domain/url/title here (domain only by default).
  if (Number.isFinite(config.browser_context_port)) {
    createBrowserContextServer({
      port: Number(config.browser_context_port),
      allowFullUrl: Boolean(config.browser_capture_full_url),
      onContext: (ctx) => {
        lastBrowserContext = ctx;
        if (currentActivityId !== null) {
          const a = db.getActivity(currentActivityId);
          if (a && isBrowserApp(a.app_name)) {
            db.updateBrowserContext(currentActivityId, contextForDb(ctx, a));
          }
        }
      },
    });
  }

  setInterval(tick, config.poll_interval_ms);
  setInterval(() => {
    client.flushRetryQueue().catch(() => {});
  }, 30_000);

  const onStop = () => {
    closeCurrentActivity();
    process.exit(0);
  };
  process.on('SIGINT', onStop);
  process.on('SIGTERM', onStop);
}

run();

