const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const express = require('express');

const { createDb } = require('../src/db.js');
const { createEventsRouter } = require('../src/routes/events.js');
const { createIdeContextRouter } = require('../src/routes/ideContext.js');

async function makeApp() {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-api-'));
  const db = createDb(join(dir, 'test.db'));
  const app = express();
  app.use(express.json());
  app.use('/api/ide-context', createIdeContextRouter(db));
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

    const row = db
      .prepare(
        `
        SELECT
          repo_name,
          repo_path,
          git_branch,
          active_file,
          editor_name,
          editor_version
        FROM activities
        WHERE id = ?
      `
      )
      .get(body.id);
    assert.ok(row, 'inserted activity row exists');
  } finally {
    server.close();
    db.close();
  }
});

test('POST /api/events attaches IDE context for coding', async () => {
  const { app, db } = await makeApp();
  const server = app.listen(0);
  const { port } = server.address();

  const idePayload = {
    repo_name: 'my-repo',
    repo_path: '/tmp/my-repo',
    git_branch: 'main',
    active_file: 'src/index.js',
    editor_name: 'Cursor',
    editor_version: '0.1.0',
  };

  try {
    const ideRes = await fetch(`http://localhost:${port}/api/ide-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(idePayload),
    });
    assert.equal(ideRes.status, 200);

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

    const row = db
      .prepare(
        `
        SELECT
          repo_name,
          repo_path,
          git_branch,
          active_file,
          editor_name,
          editor_version
        FROM activities
        WHERE id = ?
      `
      )
      .get(body.id);

    assert.deepEqual(row, idePayload);
  } finally {
    server.close();
    db.close();
  }
});

