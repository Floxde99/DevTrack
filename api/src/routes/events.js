const { Router } = require('express');

function createEventsRouter(db, broadcast) {
  const router = Router();

  router.post('/', (req, res) => {
    const { app_name, window_title, category, started_at } = req.body ?? {};

    if (!app_name || !category || !started_at) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const ideContext =
      category === 'coding'
        ? db
            .prepare(
              `
              SELECT
                repo_name,
                repo_path,
                git_branch,
                active_file,
                editor_name,
                editor_version
              FROM ide_context
              WHERE id = 1
            `
            )
            .get()
        : null;

    const result = db
      .prepare(
        `INSERT INTO activities (
           started_at,
           app_name,
           window_title,
           category,
           repo_name,
           repo_path,
           git_branch,
           active_file,
           editor_name,
           editor_version
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        started_at,
        app_name,
        window_title ?? '',
        category,
        ideContext?.repo_name ?? null,
        ideContext?.repo_path ?? null,
        ideContext?.git_branch ?? null,
        ideContext?.active_file ?? null,
        ideContext?.editor_name ?? null,
        ideContext?.editor_version ?? null
      );

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

