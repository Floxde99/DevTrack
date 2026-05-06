const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const express = require('express');

const { createDb } = require('../src/db.js');
const { createIdeContextRouter } = require('../src/routes/ideContext.js');

async function makeApp() {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-api-'));
  const db = createDb(join(dir, 'test.db'));
  const app = express();
  app.use(express.json());
  app.use('/api/ide-context', createIdeContextRouter(db));
  return { app, db };
}

test('POST /api/ide-context stores singleton and GET returns it', async () => {
  const { app, db } = await makeApp();
  const server = app.listen(0);
  const { port } = server.address();

  const payload1 = {
    repo_name: 'repo-1',
    repo_path: '/tmp/repo-1',
    git_branch: 'main',
    active_file: 'README.md',
    editor_name: 'Cursor',
    editor_version: '0.0.0',
  };

  const payload2 = {
    repo_name: 'repo-2',
    repo_path: '/tmp/repo-2',
    git_branch: 'dev',
    active_file: 'src/app.js',
    editor_name: 'Cursor',
    editor_version: '0.0.1',
  };

  try {
    const post1 = await fetch(`http://localhost:${port}/api/ide-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload1),
    });
    assert.equal(post1.status, 200);

    const post2 = await fetch(`http://localhost:${port}/api/ide-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload2),
    });
    assert.equal(post2.status, 200);

    const getRes = await fetch(`http://localhost:${port}/api/ide-context`);
    assert.equal(getRes.status, 200);
    const body = await getRes.json();

    assert.ok(body);
    assert.equal(body.repo_name, payload2.repo_name);
    assert.equal(body.repo_path, payload2.repo_path);
    assert.equal(body.git_branch, payload2.git_branch);
    assert.equal(body.active_file, payload2.active_file);
    assert.equal(body.editor_name, payload2.editor_name);
    assert.equal(body.editor_version, payload2.editor_version);
    assert.ok(body.updated_at);

    const count = db.prepare('SELECT COUNT(*) AS n FROM ide_context').get().n;
    assert.equal(count, 1);
    const id = db.prepare('SELECT id FROM ide_context').get().id;
    assert.equal(id, 1);
  } finally {
    server.close();
    db.close();
  }
});

