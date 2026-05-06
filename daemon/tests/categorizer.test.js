const assert = require('node:assert/strict');
const { test } = require('node:test');

const { categorize, loadRules } = require('../src/categorizer.js');

const DEFAULT_RULES = [
  { app_pattern: 'cursor.exe', category: 'coding', priority: 10 },
  { app_pattern: 'chrome.exe', category: 'web', priority: 8 },
  { app_pattern: 'discord.exe', category: 'communication', priority: 9 },
  { app_pattern: 'powershell*', category: 'terminal', priority: 7 },
];

test('categorize: cursor.exe -> coding', () => {
  assert.equal(categorize('cursor.exe', DEFAULT_RULES), 'coding');
});

test('categorize: CHROME.EXE (case) -> web', () => {
  assert.equal(categorize('CHROME.EXE', DEFAULT_RULES), 'web');
});

test('categorize: powershell.exe (glob) -> terminal', () => {
  assert.equal(categorize('powershell.exe', DEFAULT_RULES), 'terminal');
});

test('categorize: unknown app -> other', () => {
  assert.equal(categorize('notepad.exe', DEFAULT_RULES), 'other');
});

test('categorize: Teams meeting window -> meeting', () => {
  assert.equal(categorize('teams.exe', DEFAULT_RULES, { window_title: 'Daily Standup Call' }), 'meeting');
});

test('loadRules: returns an array', () => {
  const rules = loadRules([]);
  assert.ok(Array.isArray(rules));
});

