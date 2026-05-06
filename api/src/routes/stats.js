const { Router } = require('express');

function createStatsRouter(db) {
  const router = Router();

  router.get('/today', (_req, res) => {
    const date = new Date().toISOString().slice(0, 10);

    const by_category = db
      .prepare(
        `
        SELECT
          category,
          SUM(
            (strftime('%s', COALESCE(ended_at, datetime('now')))
            - strftime('%s', started_at))
          ) AS seconds
        FROM activities
        WHERE date(started_at) = ? AND category != 'idle'
        GROUP BY category
      `
      )
      .all(date);

    const current = db
      .prepare(
        `
        SELECT app_name, window_title, category, started_at
        FROM activities
        WHERE ended_at IS NULL
        ORDER BY id DESC
        LIMIT 1
      `
      )
      .get();

    return res.json({ date, by_category, current: current ?? null });
  });

  router.get('/week', (_req, res) => {
    const rows = db
      .prepare(
        `
        SELECT
          date(started_at) as day,
          category,
          SUM(
            strftime('%s', COALESCE(ended_at, datetime('now')))
            - strftime('%s', started_at)
          ) AS seconds
        FROM activities
        WHERE started_at >= datetime('now', '-7 days') AND category != 'idle'
        GROUP BY day, category
        ORDER BY day
      `
      )
      .all();
    return res.json(rows);
  });

  return router;
}

module.exports = { createStatsRouter };

