const { Router } = require('express');

const ALLOWED_CATEGORIES = ['coding', 'web', 'communication', 'terminal', 'design', 'other'];

function validateRulesPayload(rules) {
  if (!Array.isArray(rules)) {
    return { ok: false, error: 'Expected an array of rules.' };
  }

  const errors = [];
  const normalized = [];

  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (!r || typeof r !== 'object') {
      errors.push({ index: i, field: 'rule', message: 'Rule must be an object.' });
      continue;
    }

    const app_pattern = typeof r.app_pattern === 'string' ? r.app_pattern.trim() : '';
    const category = typeof r.category === 'string' ? r.category.trim() : '';
    const priority = Number.isFinite(Number(r.priority)) ? Number(r.priority) : 0;

    if (!app_pattern) errors.push({ index: i, field: 'app_pattern', message: 'app_pattern is required.' });
    if (!category) errors.push({ index: i, field: 'category', message: 'category is required.' });
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      errors.push({
        index: i,
        field: 'category',
        message: `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
      });
    }
    if (!Number.isInteger(priority)) {
      errors.push({ index: i, field: 'priority', message: 'priority must be an integer.' });
    }

    normalized.push({ app_pattern, category, priority: Number.isInteger(priority) ? priority : 0 });
  }

  if (errors.length) {
    return { ok: false, error: 'Some rules are invalid.', errors };
  }

  return { ok: true, rules: normalized };
}

function createRulesRouter(db) {
  const router = Router();

  router.get('/', (_req, res) => {
    const rows = db
      .prepare('SELECT * FROM category_rules ORDER BY priority DESC')
      .all();
    return res.json(rows);
  });

  router.put('/', (req, res) => {
    const validation = validateRulesPayload(req.body);
    if (!validation.ok) return res.status(400).json(validation);

    const insert = db.prepare(
      'INSERT INTO category_rules (app_pattern, category, priority) VALUES (?, ?, ?)'
    );

    const tx = db.transaction((list) => {
      db.prepare('DELETE FROM category_rules').run();
      for (const r of list) {
        insert.run(r.app_pattern, r.category, r.priority ?? 0);
      }
    });

    tx(validation.rules);

    const count = db.prepare('SELECT COUNT(*) AS n FROM category_rules').get().n;
    return res.json({ ok: true, count });
  });

  return router;
}

module.exports = { createRulesRouter };

