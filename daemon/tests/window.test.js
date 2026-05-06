const assert = require('node:assert/strict');
const { test } = require('node:test');

const { getActiveWindow, getIdleSeconds } = require('../src/window.js');

test('getActiveWindow returns object with app_name and window_title', { skip: process.platform !== 'win32' }, () => {
  const result = getActiveWindow();
  assert.ok(result && typeof result === 'object', 'result is an object');
  assert.equal(typeof result.app_name, 'string', 'app_name is string');
  assert.equal(typeof result.window_title, 'string', 'window_title is string');
  assert.ok(result.app_name.length > 0, 'app_name is non-empty');
});

test('getIdleSeconds returns number >= 0', { skip: process.platform !== 'win32' }, () => {
  const idle = getIdleSeconds();
  assert.equal(typeof idle, 'number');
  assert.ok(Number.isFinite(idle));
  assert.ok(idle >= 0);
});

