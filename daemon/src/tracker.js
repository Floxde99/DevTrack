const fs = require('node:fs');
const path = require('node:path');

const { getActiveWindow, getIdleSeconds } = require('./window.js');
const { categorize, loadRules } = require('./categorizer.js');
const { DaemonDb } = require('./db.js');
const { ApiClient } = require('./client.js');

const configPath = path.resolve(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const db = new DaemonDb(path.resolve(__dirname, config.db_path));
const client = new ApiClient(config.api_url);

let currentActivityId = null;
let currentKey = null;
let currentStartedAt = null;

function getRules() {
  return loadRules(db.getRules());
}

function closeCurrentActivity() {
  if (currentActivityId === null) return;
  const ended_at = new Date().toISOString();
  db.closeActivity(currentActivityId, ended_at);

  // Best-effort close on API side as well (may be offline).
  client.postEvent({
    type: 'activity_end',
    started_at: currentStartedAt,
    ended_at,
  });

  currentActivityId = null;
  currentKey = null;
  currentStartedAt = null;
}

function startActivity(appName, title, category) {
  const started_at = new Date().toISOString();
  currentActivityId = db.upsertActivity({
    started_at,
    app_name: appName,
    window_title: title,
    category,
    project_id: null,
  });
  currentKey = `${appName}|${category}`;
  currentStartedAt = started_at;

  client.postEvent({
    type: 'activity_start',
    app_name: appName,
    window_title: title,
    category,
    started_at,
  });
}

function tick() {
  const idleSec = getIdleSeconds();
  const isIdle = idleSec >= config.idle_threshold_s;

  const { app_name, window_title } = isIdle ? { app_name: '_idle_', window_title: '' } : getActiveWindow();
  const rules = getRules();
  const category = isIdle ? 'idle' : categorize(app_name, rules);
  const key = `${app_name}|${category}`;

  if (key !== currentKey) {
    closeCurrentActivity();
    startActivity(app_name, window_title, category);
  }
}

function run() {
  console.log('[devtrack daemon] starting...');
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

