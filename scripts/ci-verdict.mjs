/** CI accepts a buggy-demo failure only when the intended style assertion failed. */
export function validateExpectedFailure({exitCode, result}) {
  if (exitCode !== 1) throw new Error(`expected browser-verdict exit code 1, received ${exitCode}`);
  if (!result || result.verdict !== 'FAIL' || !Array.isArray(result.specs) || !result.specs.length) {
    throw new Error('expected a structured FAIL verdict with spec results');
  }
  const failures = result.specs.flatMap(spec => Array.isArray(spec.failed) ? spec.failed : []);
  if (!failures.some(failure => failure.action === 'expect_style_changed' && failure.selector === '#page')) {
    throw new Error('expected action expect_style_changed for selector #page to fail');
  }
  return {ok: true};
}
