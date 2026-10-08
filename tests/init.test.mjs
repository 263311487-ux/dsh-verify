import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cli = resolve('bin/verify.mjs');
function scratch(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dshv-init-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function run(cwd, args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, DEEPSEEK_API_KEY: '', OPENAI_API_KEY: '', LLM_API_KEY: '' } });
}

test('init creates a zero-key starter; browser passes it and catches the deliberate failure', t => {
  const cwd = scratch(t);
  const init = run(cwd, ['init']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  const target = join(cwd, 'dsh-verify-starter');
  assert.ok(existsSync(join(target, 'site', 'index.html')));
  for (const [spec, status, verdict] of [['dsh-verify.spec.json', 0, 'PASS'], ['dsh-verify.fail.json', 1, 'FAIL']]) {
    const r = run(target, ['--spec', spec, '--out', verdict.toLowerCase(), '--json']);
    assert.equal(r.status, status, r.stdout + r.stderr);
    const result = JSON.parse(r.stdout.trim().split(String.fromCharCode(10)).pop());
    assert.equal(result.verdict, verdict);
    assert.equal(result.specs[0].total, 5);
    assert.ok(existsSync(join(target, verdict.toLowerCase(), 'report.html')));
    assert.ok(existsSync(join(target, verdict.toLowerCase(), 'final-state.png')));
    if (status === 1) assert.deepEqual(result.specs[0].failed.map(f => f.action), ['expect_text']);
  }
});

test('init accepts a destination containing spaces and preserves a modified starter on rerun', t => {
  const cwd = scratch(t), dest = join(cwd, 'my starter');
  assert.equal(run(cwd, ['init', dest]).status, 0);
  writeFileSync(join(dest, 'site/index.html'), 'user changes');
  const r = run(cwd, ['init', dest]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /refusing to overwrite/i);
  assert.equal(readFileSync(join(dest, 'site/index.html'), 'utf8'), 'user changes');
});

test('init refuses existing directories, files, and symlinks without writing into them', t => {
  const cwd = scratch(t);
  mkdirSync(join(cwd, 'existing'));
  writeFileSync(join(cwd, 'file'), 'keep');
  symlinkSync(join(cwd, 'existing'), join(cwd, 'link'));
  symlinkSync(join(cwd, 'absent'), join(cwd, 'dangling'));
  for (const name of ['existing', 'file', 'link', 'dangling']) {
    const r = run(cwd, ['init', name]);
    assert.equal(r.status, 1, name + r.stderr);
    assert.match(r.stderr, /refusing to overwrite/i);
  }
  assert.deepEqual(readdirSync(join(cwd, 'existing')), []);
  assert.equal(readFileSync(join(cwd, 'file'), 'utf8'), 'keep');
  assert.equal(existsSync(join(cwd, 'absent')), false);
});

test('init validates arguments before writing and provides command help', t => {
  const cwd = scratch(t);
  for (const args of [['--unexpected'], ['one', 'two'], [''], ['--out'], ['one', '--help']]) {
    const r = run(cwd, ['init', ...args]);
    assert.equal(r.status, 2, JSON.stringify(args) + r.stderr);
    assert.match(r.stderr, /usage: dsh-verify init/i);
    assert.deepEqual(readdirSync(cwd), []);
  }
  const r = run(cwd, ['init', '--help']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /usage: dsh-verify init/i);
  assert.deepEqual(readdirSync(cwd), []);
});

test('init does not launch a browser or make HTTP requests', t => {
  const cwd = scratch(t), guard = join(cwd, 'guard.cjs');
  writeFileSync(guard, `const fail = () => { throw new Error('init attempted external work'); };
require('node:net').Socket.prototype.connect = fail;
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) require('node:child_process')[name] = fail;
globalThis.fetch = fail;`);
  const r = spawnSync(process.execPath, ['--require', guard, cli, 'init'], { cwd, encoding: 'utf8', timeout: 10000, env: { ...process.env, DEEPSEEK_API_KEY: '', OPENAI_API_KEY: '', LLM_API_KEY: '' } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(existsSync(join(cwd, 'dsh-verify-starter/dsh-verify.spec.json')));
});

test('MCP registry descriptor and lockfile identify this package version', () => {
  const pkg = JSON.parse(readFileSync('package.json'));
  const server = JSON.parse(readFileSync('server.json'));
  const lock = JSON.parse(readFileSync('package-lock.json'));
  assert.equal(server.version, pkg.version);
  assert.equal(server.packages[0].version, pkg.version);
  assert.equal(server.packages[0].identifier, pkg.name);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
});
