function escapeRegexLiteral(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(pattern) {
  // Only "*" wildcard is supported by design.
  const parts = pattern.split('*').map(escapeRegexLiteral);
  return new RegExp(`^${parts.join('.*')}$`, 'i');
}

function globMatch(pattern, str) {
  if (typeof pattern !== 'string' || typeof str !== 'string') return false;
  if (!pattern.includes('*')) return pattern.localeCompare(str, undefined, { sensitivity: 'accent' }) === 0;
  return globToRegex(pattern).test(str);
}

function isMeetingLike(appName, windowTitle) {
  if (typeof appName !== 'string') return false;
  const app = appName.toLowerCase();
  const isCommsApp = app === 'teams.exe' || app === 'msteams.exe' || app === 'zoom.exe' || app === 'discord.exe';
  if (!isCommsApp) return false;

  const title = typeof windowTitle === 'string' ? windowTitle.toLowerCase() : '';
  if (!title) return false;

  return /(\bcall\b|\bmeeting\b|\bhuddle\b|\bstandup\b|\bwebinar\b|\bjoin\b|\bvoice\b|\bvideo\b)/i.test(title);
}

function categorize(appName, rules, ctx) {
  const safeRules = Array.isArray(rules) ? rules : [];
  const sorted = [...safeRules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of sorted) {
    if (!rule || typeof rule.app_pattern !== 'string') continue;
    if (globMatch(rule.app_pattern, appName)) {
      const base = rule.category ?? 'other';
      if (base !== 'idle' && isMeetingLike(appName, ctx?.window_title)) return 'meeting';
      return base;
    }
  }

  if (isMeetingLike(appName, ctx?.window_title)) return 'meeting';
  return 'other';
}

function loadRules(rawRules) {
  const list = Array.isArray(rawRules) ? rawRules : [];
  return list.map((r) => ({
    app_pattern: r?.app_pattern,
    category: r?.category,
    priority: r?.priority ?? 0,
  }));
}

module.exports = { categorize, loadRules, isMeetingLike };

