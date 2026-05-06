const { Router } = require('express');

function normalizeStringOrNull(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function createIdeContextRouter(db) {
  const router = Router();

  router.get('/', (_req, res) => {
    const row = db
      .prepare(
        `
        SELECT
          repo_name,
          repo_path,
          git_branch,
          active_file,
          editor_name,
          editor_version,
          updated_at
        FROM ide_context
        WHERE id = 1
      `
      )
      .get();
    return res.json(row ?? null);
  });

  router.post('/', (req, res) => {
    const body = req.body ?? {};

    const repo_name = normalizeStringOrNull(body.repo_name);
    const repo_path = normalizeStringOrNull(body.repo_path);
    const git_branch = normalizeStringOrNull(body.git_branch);
    const active_file = normalizeStringOrNull(body.active_file);
    const editor_name = normalizeStringOrNull(body.editor_name);
    const editor_version = normalizeStringOrNull(body.editor_version);

    if (!repo_name || !git_branch) {
      return res.status(400).json({ error: 'Missing fields: repo_name, git_branch' });
    }

    db.prepare(
      `
      INSERT INTO ide_context (
        id,
        repo_name,
        repo_path,
        git_branch,
        active_file,
        editor_name,
        editor_version,
        updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        repo_name = excluded.repo_name,
        repo_path = excluded.repo_path,
        git_branch = excluded.git_branch,
        active_file = excluded.active_file,
        editor_name = excluded.editor_name,
        editor_version = excluded.editor_version,
        updated_at = excluded.updated_at
    `
    ).run(repo_name, repo_path, git_branch, active_file, editor_name, editor_version);

    return res.status(200).json({ ok: true });
  });

  return router;
}

module.exports = { createIdeContextRouter };

