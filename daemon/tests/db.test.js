const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const { DaemonDb } = require('../src/db.js');

test('upsertActivity creates then closes an activity', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'daemon-'));
  const db = new DaemonDb(join(dir, 'test.db'));

  const id = db.upsertActivity({
    app_name: 'cursor.exe',
    window_title: 'test',
    category: 'coding',
    project_id: null,
    started_at: new Date().toISOString(),
  });

  assert.equal(typeof id, 'number');
  assert.ok(Number.isFinite(id));
  assert.ok(id > 0);

  db.closeActivity(id, new Date().toISOString());

  const row = db.getActivity(id);
  assert.ok(row, 'row exists');
  assert.ok(row.ended_at !== null);
  db.close();
});

test('getRules returns an array', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'daemon-'));
  const db = new DaemonDb(join(dir, 'test.db'));
  const rules = db.getRules();
  assert.ok(Array.isArray(rules));
  db.close();
});

