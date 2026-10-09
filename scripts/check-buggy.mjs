import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateExpectedFailure } from './ci-verdict.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function assertBuggyResult(stdout) {
  let result;
  try {
    result = JSON.parse(String(stdout).trim().split('\n').at(-1));
  } catch {
    throw new Error('buggy demo did not produce a JSON result');
  }
  if (result.verdict !== 'FAIL') throw new Error(`expected FAIL verdict, got ${result.verdict}`);
  const spec = result.specs?.[0];
  if (spec?.verdict !== 'FAIL') throw new Error(`expected spec FAIL, got ${spec?.verdict}`);
  const failure = spec.failed?.find(item => item.action === 'expect_style_changed' && item.selector === '#page');
  if (!failure) throw new Error('expected failed expect_style_changed assertion on #page');
  const match = failure.detail?.match(/^before "(.+)" now "(.+)"$/);
  if (!match || match[1] !== match[2]) throw new Error(`expected unchanged computed style, got: ${failure.detail}`);
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const run = spawnSync(process.execPath, [resolve(root, 'bin/verify.mjs'), '--spec', 'demo/buggy.json', '--out', '/tmp/dshv-check-buggy', '--json'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
  });
  if (run.error) throw run.error;
  try {
    const result = JSON.parse(String(run.stdout).trim().split('\n').at(-1));
    validateExpectedFailure({ exitCode: run.status, result });
    assertBuggyResult(run.stdout);
    if (run.status !== 1) throw new Error(`expected CLI exit 1 for the confirmed style failure, got ${run.status}`);
  } catch (error) {
    if (run.stderr) process.stderr.write(run.stderr);
    if (run.stdout) process.stderr.write(run.stdout);
    console.error(`buggy demo check failed: ${error.message}`);
    process.exitCode = 1;
    process.exit();
  }
  console.log('buggy demo: expected expect_style_changed #page failure confirmed (exit 1)');
}
