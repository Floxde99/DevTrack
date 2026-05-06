const { Router } = require('express');

function createRulesRouter(db) {
  const router = Router();

  router.get('/', (_req, res) => {
    const rows = db
      .prepare('SELECT * FROM category_rules ORDER BY priority DESC')
      .all();
    return res.json(rows);
  });

  router.put('/', (req, res) => {
    const rules = req.body;
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'array expected' });

    const insert = db.prepare(
      'INSERT INTO category_rules (app_pattern, category, priority) VALUES (?, ?, ?)'
    );

    const tx = db.transaction((list) => {
      db.prepare('DELETE FROM category_rules').run();
      for (const r of list) {
        if (!r || typeof r !== 'object') continue;
        if (!r.app_pattern || !r.category) continue;
        insert.run(r.app_pattern, r.category, r.priority ?? 0);
      }
    });

    tx(rules);

    const count = db.prepare('SELECT COUNT(*) AS n FROM category_rules').get().n;
    return res.json({ ok: true, count });
  });

  return router;
}

module.exports = { createRulesRouter };

