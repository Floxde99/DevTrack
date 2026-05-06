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
    const res = await fetch(`http://localhost:${port}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'activity_start',
        app_name: 'cursor.exe',
        window_title: 'test',
        category: 'coding',
        started_at: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id);
  } finally {
    server.close();
    db.close();
  }
});

