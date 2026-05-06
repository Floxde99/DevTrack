const { Router } = require('express');

function createProjectsRouter(db) {
  const router = Router();

  router.get('/', (_req, res) => {
    const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    return res.json(rows);
  });

  router.post('/', (req, res) => {
    const { name, color } = req.body ?? {};
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedColor = typeof color === 'string' && color ? color : '#f59e0b';

    if (!normalizedName) return res.status(400).json({ error: 'name required' });

    const result = db
      .prepare('INSERT INTO projects (name, color) VALUES (?, ?)')
      .run(normalizedName, normalizedColor);

    return res.status(201).json({
      id: result.lastInsertRowid,
      name: normalizedName,
      color: normalizedColor,
    });
  });

  router.patch('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

    const { name, color, is_active } = req.body ?? {};

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'not found' });

    const fields = [];
    const vals = [];

    if (name !== undefined) {
      const n = typeof name === 'string' ? name.trim() : '';
      if (!n) return res.status(400).json({ error: 'name must be non-empty string' });
      fields.push('name = ?');
      vals.push(n);
    }

    if (color !== undefined) {
      if (typeof color !== 'string' || !color) return res.status(400).json({ error: 'color must be string' });
      fields.push('color = ?');
      vals.push(color);
    }

    if (is_active !== undefined) {
      fields.push('is_active = ?');
      vals.push(is_active ? 1 : 0);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });

    const tx = db.transaction(() => {
      if (is_active === true || is_active === 1) {
        db.prepare('UPDATE projects SET is_active = 0').run();
      }
      vals.push(id);
      db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
    });
    tx();

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'not found' });
    return res.json(row);
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return res.status(204).end();
  });

  return router;
}

module.exports = { createProjectsRouter };

