const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { getActiveWindow, getIdleSeconds } = require('../src/window.js');

function detectPowerShell() {
  for (const exe of ['powershell.exe', 'pwsh.exe']) {
    const res = spawnSync(exe, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.Major'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 2_000,
    });
    if (!res.error && res.status === 0) return exe;
  }
  return null;
}

const psExe = process.platform === 'win32' ? detectPowerShell() : null;
const shouldSkip = process.platform !== 'win32' || !psExe;

test('window-info script returns parseable JSON', { skip: shouldSkip }, () => {
  const scriptPath = path.resolve(__dirname, '..', 'scripts', 'window-info.ps1');
  const res = spawnSync(psExe, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 2_000,
    maxBuffer: 1024 * 1024,
  });

  assert.equal(res.status, 0, `PowerShell exited with ${res.status}: ${res.stderr || ''}`);
  const parsed = JSON.parse(res.stdout);
  assert.ok(parsed && typeof parsed === 'object');
  assert.equal(typeof parsed.app_name, 'string');
  assert.ok(parsed.app_name.length > 0);
  assert.equal(typeof parsed.window_title, 'string');
  assert.equal(typeof parsed.idle_seconds, 'number');
});

test('getActiveWindow returns object with app_name and window_title', { skip: shouldSkip }, () => {
  const result = getActiveWindow();
  assert.ok(result && typeof result === 'object', 'result is an object');
  assert.equal(typeof result.app_name, 'string', 'app_name is string');
  assert.equal(typeof result.window_title, 'string', 'window_title is string');
  assert.ok(result.app_name.length > 0, 'app_name is non-empty');
});

test('getIdleSeconds returns number >= 0', { skip: shouldSkip }, () => {
  const idle = getIdleSeconds();
  assert.equal(typeof idle, 'number');
  assert.ok(Number.isFinite(idle));
  assert.ok(idle >= 0);
});

