import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOne } from '../bin/verify.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

for (const browser of ['firefox', 'webkit']) {
  test(`demo passes on ${browser}`, async () => {
    const out = await mkdtemp(join(tmpdir(), `dshv-${browser}-`));
    const r = await runOne(join(root, 'demo', 'fixed.json'), out, { browser });
    assert.equal(r.ok, true, JSON.stringify(r.failed));
    assert.equal(r.passed, r.total);
  });
}

test('unknown browser is rejected', async () => {
  const out = await mkdtemp(join(tmpdir(), 'dshv-bad-'));
  await assert.rejects(() => runOne(join(root, 'demo', 'fixed.json'), out, { browser: 'netscape' }), /unknown browser/);
});

test('spec.browser field selects the engine', async () => {
  const { readFile, writeFile } = await import('node:fs/promises');
  const spec = JSON.parse(await readFile(join(root, 'demo', 'fixed.json'), 'utf8'));
  spec.browser = 'firefox';
  const out = await mkdtemp(join(tmpdir(), 'dshv-specb-'));
  const specPath = join(out, 'spec.json');
  await writeFile(specPath, JSON.stringify(spec));
  const r = await runOne(specPath, out, {});
  assert.equal(r.ok, true, JSON.stringify(r.failed));
});
