const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const express = require('express');

const { createDb } = require('../src/db.js');
const { createEventsRouter } = require('../src/routes/events.js');

async function makeApp() {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-api-'));
  const db = createDb(join(dir, 'test.db'));
  const app = express();
  app.use(express.json());
  app.use('/api/events', createEventsRouter(db, () => {}));
  return { app, db };
}

test('POST /api/events returns 201 + id', async () => {
  const { app, db } = await makeApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const started_at = new Date().toISOString();
    const res = await fetch(`http://localhost:${port}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'activity_start',
        app_name: 'cursor.exe',
        window_title: 'test',
        category: 'coding',
        started_at,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id);

    const ended_at = new Date(Date.now() + 5_000).toISOString();
    const endRes = await fetch(`http://localhost:${port}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'activity_end',
        started_at,
        ended_at,
      }),
    });
    assert.equal(endRes.status, 200);

    const row = db
      .prepare('SELECT started_at, ended_at FROM activities WHERE id = ?')
      .get(body.id);
    assert.equal(row.started_at, started_at);
    assert.equal(row.ended_at, ended_at);
  } finally {
    server.close();
    db.close();
  }
});

