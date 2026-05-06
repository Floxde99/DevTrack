const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const express = require('express');

const { createDb } = require('../src/db.js');
const { createStatsRouter } = require('../src/routes/stats.js');

function isoSecondsAgo(n) {
  return new Date(Date.now() - n * 1000).toISOString();
}

async function makeServer() {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-api-'));
  const db = createDb(join(dir, 'test.db'));

  const app = express();
  app.use(express.json());
  app.use('/api/stats', createStatsRouter(db));

  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://localhost:${port}`;

  return { base, server, db };
}

test('GET /api/stats/today clips stacked open rows without inflating totals', async () => {
  const { base, server, db } = await makeServer();
  try {
    // Two open rows (ended_at NULL): older must end where the newer starts, not at datetime('now'),
    // otherwise totals balloon (and mixed ISO vs SQLite datetime strings must not break clipping).
    const insert = db.prepare(
      `
      INSERT INTO activities (started_at, ended_at, app_name, window_title, category, project_id)
      VALUES (?, NULL, ?, ?, ?, NULL)
    `
    );

    // Older open row: started 2 hours ago.
    insert.run(isoSecondsAgo(2 * 60 * 60), 'a.exe', 'older', 'coding');
    // Newer open row: started 30 minutes ago.
    insert.run(isoSecondsAgo(30 * 60), 'b.exe', 'latest', 'coding');

    const body = await (await fetch(`${base}/api/stats/today`)).json();

    const codingSeconds = body.by_category.find((r) => r.category === 'coding')?.seconds ?? 0;
    // ~90m + ~30m wall time (~7200s). Wrong clipping previously yielded ~9000s (~2.5h).
    assert.ok(
      codingSeconds >= 6900 && codingSeconds <= 7800,
      `expected ~7200s (~2h wall time), got ${codingSeconds}s`
    );

    assert.ok(typeof body.total_active_seconds === 'number');
    assert.ok(body.total_active_seconds <= 86400);

    assert.ok(body.current, 'expected current activity');
    assert.equal(body.current.app_name, 'b.exe');
  } finally {
    server.close();
    db.close();
  }
});

test('GET /api/stats/today?date=past clears current', async () => {
  const { base, server, db } = await makeServer();
  try {
    const past = '2020-01-01';
    const body = await (await fetch(`${base}/api/stats/today?date=${past}`)).json();
    assert.equal(body.date, past);
    assert.equal(body.current, null);
  } finally {
    server.close();
    db.close();
  }
});

