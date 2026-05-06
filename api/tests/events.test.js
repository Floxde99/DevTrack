const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const express = require('express');

const { createDb } = require('../src/db.js');
const { createEventsRouter } = require('../src/routes/events.js');
const { createIdeContextRouter } = require('../src/routes/ideContext.js');

async function makeApp(broadcasts) {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-api-'));
  const db = createDb(join(dir, 'test.db'));
  const app = express();
  app.use(express.json());
  app.use('/api/ide-context', createIdeContextRouter(db));
  app.use('/api/events', createEventsRouter(db, broadcasts ? (p) => broadcasts.push(p) : () => {}));
  return { app, db };
}

test('POST /api/events returns 202 ok', async () => {
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

    assert.equal(res.status, 202);
    const body = await res.json();
    assert.equal(body.ok, true);
  } finally {
    server.close();
    db.close();
  }
});

test('POST /api/events still accepts coding events (no DB insert)', async () => {
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

    assert.equal(res.status, 202);
  } finally {
    server.close();
    db.close();
  }
});

test('compat broadcast keeps type activity_changed for dashboard reload', async () => {
  const messages = [];
  const { app, db } = await makeApp(messages);
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'activity_start',
        app_name: 'chrome.exe',
        window_title: 'Google',
        category: 'web',
        started_at: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 202);
    const compat = messages.filter((m) => m.type === 'activity_changed');
    assert.equal(compat.length, 1);
    assert.equal(compat[0].app_name, 'chrome.exe');
    assert.equal(compat[0].category, 'web');
  } finally {
    server.close();
    db.close();
  }
});

test('POST /api/events activity_end validates and broadcasts', async () => {
  const messages = [];
  const { app, db } = await makeApp(messages);
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'activity_end',
        app_name: 'cursor.exe',
        category: 'coding',
        window_title: '',
        started_at: new Date(Date.now() - 3600_000).toISOString(),
        ended_at: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 202);
    assert.ok(messages.some((m) => m.type === 'activity_changed' && m.ended_at));
  } finally {
    server.close();
    db.close();
  }
});

