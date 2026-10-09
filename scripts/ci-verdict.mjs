/** CI accepts a buggy-demo failure only when the intended style assertion failed. */
export function validateExpectedFailure({exitCode, result}) {
  if (exitCode !== 1) throw new Error(`expected browser-verdict exit code 1, received ${exitCode}`);
  if (!result || result.verdict !== 'FAIL' || !Array.isArray(result.specs) || !result.specs.length) {
    throw new Error('expected a structured FAIL verdict with spec results');
  }
  const failures = result.specs.flatMap(spec => Array.isArray(spec.failed) ? spec.failed : []);
  if (result.specs.length !== 1 || failures.length !== 1 ||
      failures[0].action !== 'expect_style_changed' || failures[0].selector !== '#page') {
    throw new Error('expected action expect_style_changed for selector #page to fail');
  }
  return {ok: true};
}
