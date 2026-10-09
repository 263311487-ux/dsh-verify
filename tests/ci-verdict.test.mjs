import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateExpectedFailure } from '../scripts/ci-verdict.mjs';

const failedBrowserAssertion = {
  exitCode: 1,
  result: { verdict: 'FAIL', specs: [{failed: [{action: 'expect_style_changed', selector: '#page', detail: 'background unchanged'}]}]}
};

test('only the intentional .dark style assertion qualifies as expected failure', () => {
  assert.deepEqual(validateExpectedFailure(failedBrowserAssertion), {ok: true});
});

test('unexpected runtime failures cannot satisfy the expected-failure job', () => {
  for (const exitCode of [0, 2, 127]) {
    assert.throws(() => validateExpectedFailure({...failedBrowserAssertion, exitCode}), /exit code 1/);
  }
});

test('an unrelated assertion failure cannot satisfy the expected-failure job', () => {
  const unrelated = structuredClone(failedBrowserAssertion);
  unrelated.result.specs[0].failed[0].action = 'goto';
  assert.throws(() => validateExpectedFailure(unrelated), /expect_style_changed/);
});

test('missing or malformed browser verdict cannot qualify as expected failure', () => {
  for (const result of [null, {}, {verdict: 'FAIL', specs: []},
    {verdict: 'PASS', specs: [{failed: [{action: 'expect_style_changed'}]}]}]) {
    assert.throws(() => validateExpectedFailure({exitCode: 1, result}), /verdict|failure/);
  }
});
