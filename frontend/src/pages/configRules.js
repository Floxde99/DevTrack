export const RULE_CATEGORIES = ['coding', 'web', 'communication', 'terminal', 'design', 'other'];

export function normalizeRule(input) {
  const r = input && typeof input === 'object' ? input : {};
  const app_pattern = typeof r.app_pattern === 'string' ? r.app_pattern.trim() : '';
  const category = typeof r.category === 'string' ? r.category.trim() : '';
  const priority = Number.isFinite(Number(r.priority)) ? Number(r.priority) : 0;

  return {
    app_pattern,
    category,
    priority: Number.isInteger(priority) ? priority : 0,
  };
}

export function validateRules(list) {
  if (!Array.isArray(list)) {
    return { ok: false, error: 'Expected a JSON array of rules.' };
  }

  const errors = [];
  const normalized = list.map((r, index) => {
    const n = normalizeRule(r);
    if (!n.app_pattern) errors.push({ index, field: 'app_pattern', message: 'app_pattern is required.' });
    if (!n.category) errors.push({ index, field: 'category', message: 'category is required.' });
    if (n.category && !RULE_CATEGORIES.includes(n.category)) {
      errors.push({
        index,
        field: 'category',
        message: `category must be one of: ${RULE_CATEGORIES.join(', ')}`,
      });
    }
    if (!Number.isInteger(n.priority)) {
      errors.push({ index, field: 'priority', message: 'priority must be an integer.' });
    }
    return n;
  });

  if (errors.length) return { ok: false, error: 'Some rules are invalid.', errors };
  return { ok: true, rules: normalized };
}

export function filterRules(rules, { query = '', category = 'all' } = {}) {
  const q = query.trim().toLowerCase();
  const cat = category;

  return (rules || []).filter((r) => {
    if (cat !== 'all' && r.category !== cat) return false;
    if (!q) return true;
    return (
      String(r.app_pattern || '').toLowerCase().includes(q) ||
      String(r.category || '').toLowerCase().includes(q) ||
      String(r.priority ?? '').toLowerCase().includes(q)
    );
  });
}

export function rulesToJson(rules) {
  return JSON.stringify((rules || []).map(normalizeRule), null, 2);
}

export function parseRulesJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON.' };
  }
  return validateRules(parsed);
}

