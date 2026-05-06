const { Router } = require('express');

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDayOrToday(q) {
  const serverToday = new Date().toISOString().slice(0, 10);
  if (typeof q !== 'string') return serverToday;
  const s = q.trim();
  if (!DAY_RE.test(s)) return serverToday;
  const [y, mo, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return serverToday;
  return s;
}

function createStatsRouter(db) {
  const router = Router();

  router.get('/today', (req, res) => {
    const serverToday = new Date().toISOString().slice(0, 10);
    const date = parseDayOrToday(req.query.date);

    const secExpr = `
      CASE
        WHEN strftime('%s', capped_end) - strftime('%s', started_at) < 0 THEN 0
        ELSE strftime('%s', capped_end) - strftime('%s', started_at)
      END
    `;

    const by_category = db
      .prepare(
        `
        WITH day_rows AS (
          SELECT
            id,
            started_at,
            COALESCE(ended_at, datetime('now')) AS raw_end,
            app_name,
            window_title,
            category,
            project_id
          FROM activities
          WHERE date(started_at) = ?
        ),
        ordered AS (
          SELECT
            *,
            LEAD(started_at) OVER (ORDER BY started_at, id) AS next_start
          FROM day_rows
        ),
        clipped AS (
          SELECT
            *,
            CASE
              WHEN next_start IS NULL THEN raw_end
              WHEN strftime('%s', raw_end) < strftime('%s', next_start) THEN raw_end
              ELSE next_start
            END AS effective_end
          FROM ordered
        ),
        capped AS (
          SELECT
            *,
            CASE
              WHEN strftime('%s', effective_end) >= strftime('%s', datetime(?, '+1 day'))
              THEN datetime(?, '+1 day', '-1 second')
              ELSE effective_end
            END AS capped_end
          FROM clipped
        )
        SELECT
          category,
          SUM(${secExpr}) AS seconds
        FROM capped
        GROUP BY category
      `
      )
      .all(date, date, date);

    const by_project = db
      .prepare(
        `
        WITH day_rows AS (
          SELECT
            id,
            started_at,
            COALESCE(ended_at, datetime('now')) AS raw_end,
            app_name,
            window_title,
            category,
            project_id
          FROM activities
          WHERE date(started_at) = ? AND category != 'idle'
        ),
        ordered AS (
          SELECT
            *,
            LEAD(started_at) OVER (ORDER BY started_at, id) AS next_start
          FROM day_rows
        ),
        clipped AS (
          SELECT
            *,
            CASE
              WHEN next_start IS NULL THEN raw_end
              WHEN strftime('%s', raw_end) < strftime('%s', next_start) THEN raw_end
              ELSE next_start
            END AS effective_end
          FROM ordered
        ),
        capped AS (
          SELECT
            *,
            CASE
              WHEN strftime('%s', effective_end) >= strftime('%s', datetime(?, '+1 day'))
              THEN datetime(?, '+1 day', '-1 second')
              ELSE effective_end
            END AS capped_end
          FROM clipped
        )
        SELECT
          c.project_id AS project_id,
          p.name AS name,
          p.color AS color,
          SUM(${secExpr}) AS seconds
        FROM capped c
        LEFT JOIN projects p ON p.id = c.project_id
        GROUP BY c.project_id
        ORDER BY seconds DESC
      `
      )
      .all(date, date, date);

    let current = db
      .prepare(
        `
        SELECT app_name, window_title, browser_domain, browser_url, category, started_at
        FROM activities
        WHERE ended_at IS NULL
        ORDER BY started_at DESC, id DESC
        LIMIT 1
      `
      )
      .get();

    if (date !== serverToday) {
      current = null;
    }

    let total_active_seconds = by_category
      .filter((r) => r.category !== 'idle')
      .reduce((a, r) => a + (Number(r.seconds) || 0), 0);
    total_active_seconds = Math.min(Math.round(total_active_seconds), 86400);

    return res.json({
      date,
      by_category,
      by_project,
      current: current ?? null,
      total_active_seconds,
    });
  });

  router.get('/week', (_req, res) => {
    const secExpr = `
      CASE
        WHEN strftime('%s', capped_end) - strftime('%s', started_at) < 0 THEN 0
        ELSE strftime('%s', capped_end) - strftime('%s', started_at)
      END
    `;

    const rows = db
      .prepare(
        `
        WITH rows7 AS (
          SELECT
            id,
            started_at,
            COALESCE(ended_at, datetime('now')) AS raw_end,
            category,
            project_id
          FROM activities
          WHERE started_at >= datetime('now', '-7 days') AND category != 'idle'
        ),
        ordered AS (
          SELECT
            *,
            LEAD(started_at) OVER (PARTITION BY date(started_at) ORDER BY started_at, id) AS next_start
          FROM rows7
        ),
        clipped AS (
          SELECT
            *,
            CASE
              WHEN next_start IS NULL THEN raw_end
              WHEN strftime('%s', raw_end) < strftime('%s', next_start) THEN raw_end
              ELSE next_start
            END AS effective_end
          FROM ordered
        ),
        capped AS (
          SELECT
            *,
            CASE
              WHEN strftime('%s', effective_end) >= strftime('%s', datetime(date(started_at), '+1 day'))
              THEN datetime(date(started_at), '+1 day', '-1 second')
              ELSE effective_end
            END AS capped_end
          FROM clipped
        )
        SELECT
          date(started_at) as day,
          category,
          SUM(${secExpr}) AS seconds
        FROM capped
        GROUP BY day, category
        ORDER BY day
      `
      )
      .all();
    return res.json(rows);
  });

  router.get('/week/projects', (_req, res) => {
    const secExpr = `
      CASE
        WHEN strftime('%s', capped_end) - strftime('%s', started_at) < 0 THEN 0
        ELSE strftime('%s', capped_end) - strftime('%s', started_at)
      END
    `;

    const rows = db
      .prepare(
        `
        WITH rows7 AS (
          SELECT
            id,
            started_at,
            COALESCE(ended_at, datetime('now')) AS raw_end,
            category,
            project_id
          FROM activities
          WHERE started_at >= datetime('now', '-7 days') AND category != 'idle'
        ),
        ordered AS (
          SELECT
            *,
            LEAD(started_at) OVER (PARTITION BY date(started_at) ORDER BY started_at, id) AS next_start
          FROM rows7
        ),
        clipped AS (
          SELECT
            *,
            CASE
              WHEN next_start IS NULL THEN raw_end
              WHEN strftime('%s', raw_end) < strftime('%s', next_start) THEN raw_end
              ELSE next_start
            END AS effective_end
          FROM ordered
        ),
        capped AS (
          SELECT
            *,
            CASE
              WHEN strftime('%s', effective_end) >= strftime('%s', datetime(date(started_at), '+1 day'))
              THEN datetime(date(started_at), '+1 day', '-1 second')
              ELSE effective_end
            END AS capped_end
          FROM clipped
        )
        SELECT
          c.project_id AS project_id,
          p.name AS name,
          p.color AS color,
          SUM(${secExpr}) AS seconds
        FROM capped c
        LEFT JOIN projects p ON p.id = c.project_id
        GROUP BY c.project_id
        ORDER BY seconds DESC
      `
      )
      .all();
    return res.json(rows);
  });

  return router;
}

module.exports = { createStatsRouter };
