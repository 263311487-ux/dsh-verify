import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(args) {
  return spawnSync(process.execPath, [join(ROOT, 'bin/verify.mjs'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: undefined },
  });
}

test('fixed build passes end-to-end', () => {
  const r = run(['--spec', 'demo/fixed.json', '--out', mkdtempSync(join(tmpdir(), 'dshv-t-' ))]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /PASS \(11\/11\)/);
});

test('buggy build fails on the missing .dark style', () => {
  const r = run(['--spec', 'demo/buggy.json', '--out', mkdtempSync(join(tmpdir(), 'dshv-t-'))]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /FAIL \(10\/11\)/);
  assert.match(r.stdout, /expect_style_changed/);
});

test('--json emits a machine-readable verdict', () => {
  const r = run(['--spec', 'demo/fixed.json', '--out', mkdtempSync(join(tmpdir(), 'dshv-t-')), '--json']);
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(out.verdict, 'PASS');
  assert.equal(out.passed, out.total);
  assert.equal(out.specs.length, 1);
  assert.equal(out.specs[0].failed.length, 0);
  assert.match(out.specs[0].report, /report\.html$/);
});

test('no args prints help and exits 2', () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /usage: dsh-verify/);
});

test('--help exits 0', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /actions:/);
});

test('expect_navigation follows a link to a second page', () => {
  const r = run(['--spec', 'test/fixtures/nav/nav-spec.json', '--out', mkdtempSync(join(tmpdir(), 'dshv-t-'))]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /PASS \(4\/4\)/);
});

test('glob runs many specs and aggregates a FAIL when any fails', () => {
  const r = run(['--spec', 'demo/*.json', '--out', mkdtempSync(join(tmpdir(), 'dshv-t-')), '--json']);
  assert.equal(r.status, 1);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(out.verdict, 'FAIL');
  assert.equal(out.total, 2);
  assert.equal(out.passed, 1);
  const names = out.specs.map((s) => s.name);
  assert.ok(names.includes('buggy.json'));
  assert.ok(names.includes('fixed.json'));
});
