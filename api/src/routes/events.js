const { Router } = require('express');

function createEventsRouter(db, broadcast) {
  const router = Router();

  router.post('/', (req, res) => {
    const { app_name, window_title, category, started_at } = req.body ?? {};

    if (!app_name || !category || !started_at) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const result = db
      .prepare(
        `INSERT INTO activities (started_at, app_name, window_title, category)
         VALUES (?, ?, ?, ?)`
      )
      .run(started_at, app_name, window_title ?? '', category);

    if (typeof broadcast === 'function') {
      broadcast({
        type: 'activity_changed',
        app_name,
        window_title: window_title ?? '',
        category,
        started_at,
      });
    }

    return res.status(201).json({ id: result.lastInsertRowid });
  });

  return router;
}

module.exports = { createEventsRouter };

