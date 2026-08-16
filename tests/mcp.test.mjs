import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const DEMO = join(root, 'demo', 'fixed');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

let server, baseUrl, transport, client;

before(async () => {
  server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const fp = join(DEMO, urlPath === '/' ? 'index.html' : urlPath);
      const data = await readFile(fp);
      res.writeHead(200, { 'content-type': MIME[extname(fp).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(root, 'mcp', 'server.mjs')],
  });
  client = new Client({ name: 'dsh-verify-mcp-test', version: '0.0.1' });
  await client.connect(transport);
});

after(async () => {
  await client.close();
  await new Promise((r) => server.close(r));
});

const out = join(tmpdir(), `dshv-mcp-test-${Date.now()}`);

test('tools/list exposes verify_spec, verify_url, health', async () => {
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name);
  assert.ok(names.includes('verify_spec'));
  assert.ok(names.includes('verify_url'));
  assert.ok(names.includes('health'));
});

test('health reports server ready', async () => {
  const res = await client.callTool({ name: 'health', arguments: {} });
  const h = JSON.parse(res.content[0].text);
  assert.equal(h.status, 'ok');
});

test('verify_url passes on the fixed build (live URL path)', async () => {
  const res = await client.callTool({
    name: 'verify_url',
    arguments: {
      url: baseUrl,
      checks: [
        { action: 'click', selector: '#count-btn', count: 3 },
        { action: 'expect_text', selector: '#count-btn', text: 'Clicked: 3' },
        { action: 'capture_style', selector: '#page', prop: 'backgroundColor', var: 'bg' },
        { action: 'click', selector: '#color-btn' },
        { action: 'wait', ms: 300 },
        { action: 'expect_style_changed', selector: '#page', prop: 'backgroundColor', var: 'bg' },
        { action: 'expect_console_errors', present: false },
      ],
      out,
    },
  });
  const result = JSON.parse(res.content[0].text);
  assert.equal(result.ok, true);
  assert.ok(result.passed >= 8);
  assert.equal(result.total, 8); // auto-prepended goto + 7 checks
});

test('verify_spec: fixed build PASS, buggy build FAIL — detection works through MCP', async () => {
  const okRes = await client.callTool({
    name: 'verify_spec',
    arguments: { specPath: join(root, 'demo', 'fixed.json'), out },
  });
  assert.equal(JSON.parse(okRes.content[0].text).ok, true);

  const badRes = await client.callTool({
    name: 'verify_spec',
    arguments: { specPath: join(root, 'demo', 'buggy.json'), out },
  });
  const bad = JSON.parse(badRes.content[0].text);
  assert.equal(bad.ok, false);
  assert.ok(bad.failed.length > 0);
  assert.ok(bad.failed.some((f) => f.action === 'expect_style_changed'));
});
