const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const { createDb } = require('../src/db.js');

test('createDb crée les 3 tables', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-api-'));
  const db = createDb(join(dir, 'test.db'));

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);

  assert.ok(tables.includes('activities'));
  assert.ok(tables.includes('projects'));
  assert.ok(tables.includes('category_rules'));

  db.close();
});

test('createDb insère des règles par défaut', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-api-'));
  const db = createDb(join(dir, 'test.db'));

  const rules = db.prepare('SELECT * FROM category_rules').all();
  assert.ok(rules.length > 0);
  assert.ok(rules.some((r) => r.category === 'coding'), 'règle coding présente');

  db.close();
});

