const DEFAULTS = {
  daemonHost: '127.0.0.1',
  daemonPort: 7337,
  captureFullUrl: false,
  postIntervalMs: 5000
};

function toDomain(url) {
  if (typeof url !== 'string' || !url) return '';
  try {
    return new URL(url).hostname || '';
  } catch {
    return '';
  }
}

async function getConfig() {
  const cfg = await chrome.storage.sync.get(DEFAULTS);
  return {
    daemonHost: cfg.daemonHost,
    daemonPort: Number(cfg.daemonPort),
    captureFullUrl: Boolean(cfg.captureFullUrl),
    postIntervalMs: Math.max(1000, Number(cfg.postIntervalMs) || DEFAULTS.postIntervalMs)
  };
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs && tabs[0] ? tabs[0] : null;
}

async function postContext(tab) {
  if (!tab) return;
  const cfg = await getConfig();
  if (!Number.isFinite(cfg.daemonPort)) return;

  const url = typeof tab.url === 'string' ? tab.url : '';
  const domain = toDomain(url);
  if (!domain) return; // ignore chrome://, about:, etc.

  const payload = {
    domain,
    title: typeof tab.title === 'string' ? tab.title : null
  };
  if (cfg.captureFullUrl) payload.url = url;

  const endpoint = `http://${cfg.daemonHost}:${cfg.daemonPort}/browser/context`;
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {
    // best-effort; daemon may be offline
  }
}

let lastSentKey = '';

async function tick() {
  const tab = await getActiveTab();
  const url = typeof tab?.url === 'string' ? tab.url : '';
  const domain = toDomain(url);
  const title = typeof tab?.title === 'string' ? tab.title : '';

  const key = `${domain}|${title}`;
  if (!domain) return;
  if (key === lastSentKey) return;

  lastSentKey = key;
  await postContext(tab);
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.sync.set(DEFAULTS);
});

chrome.tabs.onActivated.addListener(() => {
  tick().catch(() => {});
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title) {
    tick().catch(() => {});
  }
});

chrome.windows.onFocusChanged.addListener(() => {
  tick().catch(() => {});
});

setInterval(() => {
  tick().catch(() => {});
}, DEFAULTS.postIntervalMs);

