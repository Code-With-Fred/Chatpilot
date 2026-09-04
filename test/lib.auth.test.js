const test = require('node:test');
const assert = require('node:assert/strict');
const { safeCompare } = require('../lib/auth');

test('matches identical strings', () => {
  assert.equal(safeCompare('secret123', 'secret123'), true);
});

test('rejects a different string of the same length', () => {
  assert.equal(safeCompare('secret123', 'wrongpass'), false);
});

test('rejects a different string of a different length', () => {
  assert.equal(safeCompare('secret123', 'secret12345'), false);
});

test('rejects non-string input instead of throwing', () => {
  assert.equal(safeCompare(undefined, 'secret'), false);
  assert.equal(safeCompare(null, 'secret'), false);
  assert.equal(safeCompare(42, 'secret'), false);
});
