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

test('categorize: Outlook-like window is communication', () => {
  assert.equal(categorize('applicationframehost.exe', DEFAULT_RULES, { window_title: 'Inbox - Outlook' }), 'communication');
});

test('categorize: Chrome GitHub URL is coding', () => {
  assert.equal(
    categorize('chrome.exe', DEFAULT_RULES, {
      window_title: 'Issues · Floxde99/DevTrack',
      browser_domain: 'github.com',
      browser_url: 'https://github.com/Floxde99/DevTrack/issues',
    }),
    'coding'
  );
});

test('categorize: Chrome Gmail URL is communication', () => {
  assert.equal(
    categorize('chrome.exe', DEFAULT_RULES, {
      window_title: 'Inbox (2) - flori@gmail.com - Gmail',
      browser_domain: 'mail.google.com',
      browser_url: 'https://mail.google.com/mail/u/0/#inbox',
    }),
    'communication'
  );
});

test('categorize: Chrome Meet URL is meeting', () => {
  assert.equal(
    categorize('chrome.exe', DEFAULT_RULES, {
      window_title: 'Standup - Google Meet',
      browser_domain: 'meet.google.com',
      browser_url: 'https://meet.google.com/abc-defg-hij',
    }),
    'meeting'
  );
});

test('loadRules: returns an array', () => {
  const rules = loadRules([]);
  assert.ok(Array.isArray(rules));
});

