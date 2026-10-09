import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertBuggyResult } from '../scripts/check-buggy.mjs';

const good = JSON.stringify({
  verdict: 'FAIL',
  specs: [{ verdict: 'FAIL', failed: [{ action: 'expect_style_changed', selector: '#page', detail: 'before "rgb(1, 2, 3)" now "rgb(1, 2, 3)"' }] }],
});

test('release checker accepts only a FAIL with the missing-style assertion', () => {
  assert.equal(assertBuggyResult(good), true);
  assert.throws(() => assertBuggyResult(JSON.stringify({ verdict: 'PASS', specs: [] })), /FAIL/);
  assert.throws(() => assertBuggyResult(JSON.stringify({
    verdict: 'FAIL', specs: [{ verdict: 'FAIL', failed: [{ action: 'expect_text' }] }],
  })), /expect_style_changed/);
  assert.throws(() => assertBuggyResult('not json'), /JSON/);
});
