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

function categorize(appName, rules) {
  const safeRules = Array.isArray(rules) ? rules : [];
  const sorted = [...safeRules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of sorted) {
    if (!rule || typeof rule.app_pattern !== 'string') continue;
    if (globMatch(rule.app_pattern, appName)) return rule.category ?? 'other';
  }
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

module.exports = { categorize, loadRules };

