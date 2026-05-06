const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const express = require('express');

const { createDb } = require('../src/db.js');
const { createEventsRouter } = require('../src/routes/events.js');
const { createActivitiesRouter } = require('../src/routes/activities.js');
const { createStatsRouter } = require('../src/routes/stats.js');
const { createProjectsRouter } = require('../src/routes/projects.js');
const { createRulesRouter } = require('../src/routes/rules.js');

async function makeServer() {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-api-'));
  const db = createDb(join(dir, 'test.db'));

  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/events', createEventsRouter(db, () => {}));
  app.use('/api/activities', createActivitiesRouter(db));
  app.use('/api/stats', createStatsRouter(db));
  app.use('/api/projects', createProjectsRouter(db));
  app.use('/api/rules', createRulesRouter(db));

  const server = app.listen(0);
  const { port } = server.address();

  const base = `http://localhost:${port}`;
  return { base, server, db };
}

test('health + stats + activities endpoints return JSON shapes', async () => {
  const { base, server, db } = await makeServer();
  try {
    const health = await (await fetch(`${base}/health`)).json();
    assert.equal(health.ok, true);

    const statsToday = await (await fetch(`${base}/api/stats/today`)).json();
    assert.ok(typeof statsToday.date === 'string');
    assert.ok(Array.isArray(statsToday.by_category));
    assert.ok(Array.isArray(statsToday.by_project));
    assert.ok(typeof statsToday.total_active_seconds === 'number');
    assert.ok(statsToday.total_active_seconds >= 0 && statsToday.total_active_seconds <= 86400);

    const today = new Date().toISOString().slice(0, 10);
    const activities = await (await fetch(`${base}/api/activities?date=${today}`)).json();
    assert.ok(Array.isArray(activities));

    const weekProjects = await (await fetch(`${base}/api/stats/week/projects`)).json();
    assert.ok(Array.isArray(weekProjects));
  } finally {
    server.close();
    db.close();
  }
});

test('projects CRUD smoke', async () => {
  const { base, server, db } = await makeServer();
  try {
    const created = await (
      await fetch(`${base}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', color: '#123456' }),
      })
    ).json();
    assert.ok(created.id);
    assert.equal(created.name, 'Test');
    assert.equal(created.color, '#123456');

    const list1 = await (await fetch(`${base}/api/projects`)).json();
    assert.ok(Array.isArray(list1));
    assert.ok(list1.some((p) => p.id === created.id));

    const patched = await (
      await fetch(`${base}/api/projects/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
    ).json();
    assert.equal(patched.is_active, 1);

    const created2 = await (
      await fetch(`${base}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test2', color: '#abcdef' }),
      })
    ).json();
    assert.ok(created2.id);

    const patched2 = await (
      await fetch(`${base}/api/projects/${created2.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
    ).json();
    assert.equal(patched2.is_active, 1);

    const listAfterSwitch = await (await fetch(`${base}/api/projects`)).json();
    assert.equal(listAfterSwitch.find((p) => p.id === created2.id)?.is_active, 1);
    assert.equal(listAfterSwitch.find((p) => p.id === created.id)?.is_active, 0);

    const bad = await fetch(`${base}/api/projects/999999`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    });
    assert.equal(bad.status, 404);

    const list2 = await (await fetch(`${base}/api/projects`)).json();
    const stillActive = list2.find((p) => p.id === created2.id);
    assert.equal(stillActive.is_active, 1);

    const del = await fetch(`${base}/api/projects/${created.id}`, { method: 'DELETE' });
    assert.equal(del.status, 204);
  } finally {
    server.close();
    db.close();
  }
});

test('rules PUT accepts array and returns count', async () => {
  const { base, server, db } = await makeServer();
  try {
    const res = await fetch(`${base}/api/rules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { app_pattern: 'cursor.exe', category: 'coding', priority: 10 },
        { app_pattern: 'chrome.exe', category: 'web', priority: 8 },
      ]),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.count, 2);
  } finally {
    server.close();
    db.close();
  }
});

