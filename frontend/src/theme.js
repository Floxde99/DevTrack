export const CATEGORY_COLORS = {
  coding: '#fbbf24',
  web: '#ffb95f',
  communication: '#b6edff',
  terminal: '#ee9800',
  design: '#34daff',
  idle: '#ffb4ab',
  other: '#9c8f79',
};

export const CATEGORY_LABELS = {
  coding: 'Coding',
  web: 'Web',
  communication: 'Communication',
  terminal: 'Terminal',
  design: 'Design',
  idle: 'Idle',
  other: 'Autre',
};

export function formatDuration(seconds) {
  const sec = Math.max(0, Math.floor(seconds ?? 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

const BROWSER_APPS = new Set(['chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe', 'opera.exe']);

function normalizeDomain(d) {
  const raw = typeof d === 'string' ? d.trim().toLowerCase() : '';
  if (!raw) return '';
  return raw.startsWith('www.') ? raw.slice(4) : raw;
}

export function appDisplayName(activity) {
  if (!activity || typeof activity !== 'object') return '—';
  const app = typeof activity.app_name === 'string' ? activity.app_name : '';
  const lowerApp = app.toLowerCase();
  if (BROWSER_APPS.has(lowerApp)) {
    const domain = normalizeDomain(activity.browser_domain);
    if (domain) return domain;
    const title = typeof activity.window_title === 'string' ? activity.window_title.trim() : '';
    if (title) return title;
  }
  return app || '—';
}

