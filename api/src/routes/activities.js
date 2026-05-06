const { Router } = require('express');

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function normalizeDateParam(v) {
  if (!v) return null;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function normalizeStringParam(v) {
  if (!v) return null;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function normalizeIntParam(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  return n;
}

function buildActivitiesQuery({ from, to, category, app_name, project_id }) {
  const where = [];
  const params = [];

  if (from) {
    where.push(`date(a.started_at) >= ?`);
    params.push(from);
  }
  if (to) {
    where.push(`date(a.started_at) <= ?`);
    params.push(to);
  }
  if (category) {
    where.push(`a.category = ?`);
    params.push(category);
  }
  if (app_name) {
    where.push(`a.app_name = ?`);
    params.push(app_name);
  }
  if (project_id !== null && project_id !== undefined) {
    where.push(`a.project_id = ?`);
    params.push(project_id);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return {
    sql: `
      SELECT
        a.*,
        p.name AS project_name,
        p.color AS project_color
      FROM activities a
      LEFT JOIN projects p ON p.id = a.project_id
      ${whereSql}
      ORDER BY a.started_at DESC
    `,
    params,
  };
}

function createActivitiesRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const date = normalizeDateParam(req.query.date);
    const from = normalizeDateParam(req.query.from) ?? date;
    const to = normalizeDateParam(req.query.to) ?? date;
    const category = normalizeStringParam(req.query.category);
    const app_name = normalizeStringParam(req.query.app_name);
    const project_id = normalizeIntParam(req.query.project_id);

    const q = buildActivitiesQuery({ from, to, category, app_name, project_id });
    const rows = db.prepare(q.sql).all(...q.params);
    return res.json(rows);
  });

  router.get('/export', (req, res) => {
    const date = normalizeDateParam(req.query.date);
    const from = normalizeDateParam(req.query.from) ?? date;
    const to = normalizeDateParam(req.query.to) ?? date;
    const category = normalizeStringParam(req.query.category);
    const app_name = normalizeStringParam(req.query.app_name);
    const project_id = normalizeIntParam(req.query.project_id);

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to are required (YYYY-MM-DD)' });
    }

    const q = buildActivitiesQuery({ from, to, category, app_name, project_id });
    const rows = db.prepare(q.sql).all(...q.params);

    const filename = `activities_${from}_to_${to}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const header = [
      'id',
      'started_at',
      'ended_at',
      'app_name',
      'window_title',
      'category',
      'project_id',
      'project_name',
    ];

    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.started_at,
          r.ended_at,
          r.app_name,
          r.window_title,
          r.category,
          r.project_id,
          r.project_name,
        ]
          .map(csvEscape)
          .join(',')
      );
    }

    return res.send(`${lines.join('\n')}\n`);
  });

  return router;
}

module.exports = { createActivitiesRouter };

