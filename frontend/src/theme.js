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

