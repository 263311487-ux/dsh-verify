import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, cp, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOne } from '../bin/verify.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('visual regression: baseline create -> PASS -> page change FAIL -> update baseline PASS', async () => {
  const work = await mkdtemp(join(tmpdir(), 'dshv-vis-'));
  await cp(join(root, 'demo', 'fixed'), join(work, 'site'), { recursive: true });
  const specPath = join(work, 'spec.json');
  const spec = {
    title: 'visual regression test',
    serve: join(work, 'site'),
    steps: [
      { action: 'goto', path: '/index.html' },
      { action: 'expect_screenshot', name: 'home' },
      { action: 'expect_console_errors', present: false },
    ],
  };
  await writeFile(specPath, JSON.stringify(spec));
  const out = join(work, 'out');

  const first = await runOne(specPath, out, {});
  assert.equal(first.ok, true, JSON.stringify(first.failed));
  assert.ok(first.failed.every((f) => f.action !== 'expect_screenshot'));

  const second = await runOne(specPath, out, {});
  assert.equal(second.ok, true, 'no change must pass');
  assert.ok(second.failed.every((f) => f.action !== 'expect_screenshot'));

  // break the page visually: override body background
  await writeFile(join(work, 'site', 'style.css'), '\nbody { background: #ff0000 !important; }\n', { flag: 'a' });
  const third = await runOne(specPath, out, {});
  assert.equal(third.ok, false, 'visual change must fail');
  const fail = third.failed.find((f) => f.action === 'expect_screenshot');
  assert.ok(fail, 'expect_screenshot must be in failures');
  assert.match(fail.detail, /diff/);
  await access(join(out, 'diffs', 'home-diff.png')).then(() => {}, () => assert.fail('diff image missing'));

  // --update-baselines: refresh and pass again
  const fourth = await runOne(specPath, out, { updateBaselines: true });
  assert.equal(fourth.ok, true, 'update-baselines must pass');
  const fifth = await runOne(specPath, out, {});
  assert.equal(fifth.ok, true, 'new baseline must pass again');
});
