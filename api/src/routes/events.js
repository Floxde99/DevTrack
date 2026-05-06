const { Router } = require('express');

function createEventsRouter(db, broadcast) {
  const router = Router();

  router.post('/', (req, res) => {
    const body = req.body ?? {};
    const type = body.type ?? 'activity_start';

    if (type === 'activity_start') {
      const { app_name, window_title, category, started_at } = body;

      if (!app_name || !category || !started_at) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      const result = db
        .prepare(
          `INSERT INTO activities (started_at, app_name, window_title, category)
           VALUES (?, ?, ?, ?)`
        )
        .run(started_at, app_name, window_title ?? '', category);
      const id = Number(result.lastInsertRowid);

      if (typeof broadcast === 'function') {
        const payload = {
          type: 'activity_start',
          id,
          app_name,
          window_title: window_title ?? '',
          category,
          started_at,
        };
        broadcast(payload);
        broadcast({ type: 'activity_changed', ...payload });
      }

      return res.status(201).json({ id });
    }

    if (type === 'activity_end') {
      const { activity_id, started_at, ended_at } = body;
      if (!ended_at) return res.status(400).json({ error: 'Missing fields' });

      let info;
      if (activity_id) {
        info = db
          .prepare(`UPDATE activities SET ended_at = ? WHERE id = ? AND ended_at IS NULL`)
          .run(ended_at, activity_id);
      } else if (started_at) {
        info = db
          .prepare(
            `
            UPDATE activities
            SET ended_at = ?
            WHERE id = (
              SELECT id
              FROM activities
              WHERE ended_at IS NULL AND started_at = ?
              ORDER BY id DESC
              LIMIT 1
            )
          `
          )
          .run(ended_at, started_at);
      } else {
        info = db
          .prepare(
            `
            UPDATE activities
            SET ended_at = ?
            WHERE id = (
              SELECT id
              FROM activities
              WHERE ended_at IS NULL
              ORDER BY id DESC
              LIMIT 1
            )
          `
          )
          .run(ended_at);
      }

      if (info.changes === 0) return res.status(404).json({ error: 'No open activity to close' });

      if (typeof broadcast === 'function') {
        const payload = {
          type: 'activity_end',
          id: activity_id ?? null,
          started_at: started_at ?? null,
          ended_at,
        };
        broadcast(payload);
        broadcast({ type: 'activity_changed', ...payload });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown event type: ${type}` });
  });

  return router;
}

module.exports = { createEventsRouter };

