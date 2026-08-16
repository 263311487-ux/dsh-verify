import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { parseSpec, validateSpec, extractPageFacts, generateSpec } from '../bin/gen.mjs';
import { runOne } from '../bin/verify.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const CANNED_SPEC = {
  title: 'AI-drafted demo checks',
  steps: [
    { action: 'click', selector: '#count-btn', count: 3 },
    { action: 'expect_text', selector: '#count-btn', text: 'Clicked: 3' },
    { action: 'capture_style', selector: '#page', prop: 'backgroundColor', var: 'bg' },
    { action: 'click', selector: '#color-btn' },
    { action: 'wait', ms: 300 },
    { action: 'expect_style_changed', selector: '#page', prop: 'backgroundColor', var: 'bg' },
    { action: 'expect_console_errors', present: false },
    { action: 'expect_network_errors', present: false },
  ],
};

let server, baseUrl, realFetch;

function serve(dir) {
  return createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const fp = join(dir, urlPath === '/' ? 'index.html' : urlPath);
      const data = await readFile(fp);
      res.writeHead(200, { 'content-type': MIME[extname(fp).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('nf');
    }
  });
}

before(async () => {
  server = serve(join(root, 'demo', 'fixed'));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ choices: [{ message: { content: '```json\n' + JSON.stringify(CANNED_SPEC) + '\n```' } }] }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
});

after(async () => {
  globalThis.fetch = realFetch;
  await new Promise((r) => server.close(r));
});

test('parseSpec strips markdown fences and surrounding text', () => {
  const spec = parseSpec('Here you go:\n```json\n{"title":"t","steps":[{"action":"wait","ms":1}]}\n```\nDone.');
  assert.equal(spec.title, 't');
  assert.equal(spec.steps[0].action, 'wait');
});

test('validateSpec rejects unknown actions and empty steps', () => {
  assert.equal(validateSpec({ steps: [{ action: 'hack', selector: 'x' }] }).ok, false);
  assert.equal(validateSpec({ steps: [] }).ok, false);
  assert.equal(validateSpec({ steps: [{ action: 'click', selector: '#a' }] }).ok, true);
});

test('generateSpec drafts a valid spec via LLM (fetch stubbed)', async () => {
  const { spec, model } = await generateSpec({ url: baseUrl, requirements: 'counter and color toggle', pageFacts: { title: 'demo', buttons: ['Clicked: 0', 'Toggle Color'] }, apiKey: 'test-key' });
  assert.equal(spec.steps.length, CANNED_SPEC.steps.length + 1); // auto-prepended goto
  assert.ok(model);
});

test('full chain: real browser facts -> AI spec -> fixed PASS, buggy FAIL', async () => {
  const browser = await chromium.launch({ headless: true });
  let facts;
  try {
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: 'load' });
    facts = await extractPageFacts(page);
    assert.ok(facts.buttons.includes('Toggle Color'));
    assert.ok(facts.buttons.some((b) => b.startsWith('Clicked:')));
  } finally {
    await browser.close().catch(() => {});
  }

  const { spec } = await generateSpec({ url: baseUrl, pageFacts: facts, apiKey: 'test-key' });
  const outDir = join(tmpdir(), `dshv-gen-${Date.now()}`);
  const specPath = join(outDir, 'spec.json');
  await import('node:fs/promises').then(({ mkdir, writeFile }) => mkdir(outDir, { recursive: true }).then(() => writeFile(specPath, JSON.stringify(spec))));

  const fixed = await runOne(specPath, join(outDir, 'fixed'), {});
  assert.equal(fixed.ok, true, JSON.stringify(fixed.failed));

  // same AI-drafted spec against the buggy build must catch the missing .dark style
  await new Promise((r) => server.close(r));
  server = serve(join(root, 'demo', 'buggy'));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const specBuggy = JSON.parse(JSON.stringify(spec));
  specBuggy.steps = specBuggy.steps.map((s) => s.action === 'goto' ? { ...s, url: baseUrl } : s);
  await import('node:fs/promises').then(({ writeFile }) => writeFile(specPath, JSON.stringify(specBuggy)));
  const buggy = await runOne(specPath, join(outDir, 'buggy'), {});
  assert.equal(buggy.ok, false);
  assert.ok(buggy.failed.some((f) => f.action === 'expect_style_changed'));
});
