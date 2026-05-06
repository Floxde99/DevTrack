import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRules, parseRulesJson, rulesToJson, validateRules } from './configRules.js';

test('validateRules normalizes numeric priority', () => {
  const v = validateRules([{ app_pattern: 'cursor.exe', category: 'coding', priority: '10' }]);
  assert.equal(v.ok, true);
  assert.equal(v.rules[0].priority, 10);
});

test('parseRulesJson returns friendly errors', () => {
  const v = parseRulesJson('[{"app_pattern":"","category":"nope","priority":"x"}]');
  assert.equal(v.ok, false);
  assert.match(v.error, /invalid/i);
  assert.ok(Array.isArray(v.errors));
  assert.ok(v.errors.length >= 1);
});

test('rulesToJson roundtrips through parseRulesJson', () => {
  const input = [
    { app_pattern: 'cursor.exe', category: 'coding', priority: 10 },
    { app_pattern: 'chrome.exe', category: 'web', priority: 8 },
  ];
  const json = rulesToJson(input);
  const parsed = parseRulesJson(json);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.rules, input);
});

test('filterRules filters by query and category', () => {
  const rules = [
    { app_pattern: 'cursor.exe', category: 'coding', priority: 10 },
    { app_pattern: 'chrome.exe', category: 'web', priority: 8 },
  ];
  assert.equal(filterRules(rules, { query: 'cur' }).length, 1);
  assert.equal(filterRules(rules, { category: 'web' }).length, 1);
  assert.equal(filterRules(rules, { query: '10' }).length, 1);
});

