const { Router } = require('express');

function createEventsRouter(db, broadcast) {
  const router = Router();

  router.post('/', (req, res) => {
    // IMPORTANT: SQLite `activities` is written by the daemon (source of truth).
    // The API receives events only to broadcast them over WebSocket.
    const body = req.body ?? {};
    const type = body.type ?? 'activity_start';
    const { app_name, window_title, category, started_at } = body;

    if (type === 'activity_end') {
      if (!app_name || !category || !started_at || !body.ended_at) {
        return res.status(400).json({ error: 'Missing fields' });
      }
    } else if (!app_name || !category || !started_at) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (typeof broadcast === 'function') {
      const payload = {
        type,
        app_name,
        window_title: window_title ?? '',
        category,
        started_at,
        ended_at: body.ended_at ?? null,
        project_id: body.project_id ?? null,
        pid: body.pid ?? null,
        exe_path: body.exe_path ?? null,
        activity_level: body.activity_level ?? null,
        browser_domain: body.browser_domain ?? null,
        browser_url: body.browser_url ?? null,
      };
      broadcast(payload);
      // Dashboard listens for `activity_changed`. Spread payload first so its `type` does not overwrite.
      broadcast({ ...payload, type: 'activity_changed' });
    }

    return res.status(202).json({ ok: true });
  });

  return router;
}

module.exports = { createEventsRouter };

