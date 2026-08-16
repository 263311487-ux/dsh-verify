#!/usr/bin/env node
// dsh-verify — independent browser acceptance testing for agent deliverables.
// Agents self-test and pass; real browsers tell the truth.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const HELP = `dsh-verify — independent browser acceptance testing for agent deliverables
Agents self-test and pass. Real browsers tell the truth.

usage: dsh-verify --spec <spec.json|glob> [options]

options:
  --spec <file>   JSON acceptance spec; supports globs like "specs/*.json" (required)
  --out <dir>     output dir for report.html + screenshots (default: ./dsh-verify-out)
  --url <url>     target URL; overrides spec.serve / spec.base / step path
  --headed        run with a visible browser
  --json          print a machine-readable verdict object to stdout
  --help          show this help

actions:
  goto wait click fill expect_text expect_class capture_style
  expect_style_changed expect_url_contains expect_navigation
  expect_console_errors expect_network_errors screenshot

docs: https://github.com/263311487-ux/dsh-verify
`;

const MIME = { '.html':'text/html', '.htm':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.txt':'text/plain', '.md':'text/markdown', '.woff2':'font/woff2', '.pdf':'application/pdf' };

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const has = (name) => process.argv.includes('--' + name);

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') { i++; if (glob[i + 1] === '/') i++; out += '(?:.*/)?'; }
      else out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else if ('\\^$.|+()[]{}'.includes(c)) out += '\\' + c;
    else out += c;
  }
  return new RegExp('^' + out + '$');
}

async function expandSpecPaths(pattern) {
  if (!/[*?[]/.test(pattern)) return [pattern];
  const rx = globToRegExp(pattern);
  const star = pattern.indexOf('*');
  const root = pattern.slice(0, star).split(sep).slice(0, -1).join(sep) || '.';
  const found = [];
  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (rx.test(p)) found.push(p);
    }
  }
  await walk(root);
  return found.sort();
}

async function serveDir(dir) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let fp = join(root, urlPath);
      if (!fp.startsWith(root)) { res.writeHead(403); return res.end(); }
      let st = await stat(fp).catch(() => null);
      if (st && st.isDirectory()) fp = join(fp, 'index.html');
      const data = await readFile(fp);
      res.writeHead(200, { 'content-type': MIME[extname(fp).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

async function runOne(specPath, outDir, { headed, url }) {
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  const served = spec.serve ? await serveDir(spec.serve) : null;
  const base = served ? served.url : (url || spec.base || 'http://localhost');
  const results = [];
  let browser = null;

  const fail = (step, msg) => results.push({ ...step, ok: false, detail: msg });
  const pass = (step, detail) => results.push({ ...step, ok: true, detail: detail || 'ok' });

  try {
    browser = await chromium.launch({ headless: !headed });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const consoleErrors = [];
    const networkErrors = [];
    page.on('pageerror', (e) => { results.push({ action: 'pageerror', ok: false, detail: String(e) }); });
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) networkErrors.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', (r) => { networkErrors.push(`failed ${r.url()}`); });

    for (const step of spec.steps || []) {
      const a = step.action;
      try {
        if (a === 'goto') { await page.goto(step.url || base + (step.path || '/index.html'), { waitUntil: 'load' }); pass(step, page.url()); }
        else if (a === 'wait') { await page.waitForTimeout(step.ms || 500); pass(step, `${step.ms || 500}ms`); }
        else if (a === 'click') {
          const n = step.count || 1;
          for (let i = 0; i < n; i++) { await page.click(step.selector); await page.waitForTimeout(80); }
          pass(step, `${n}x ${step.selector}`);
        }
        else if (a === 'fill') { await page.fill(step.selector, step.text); pass(step, step.selector); }
        else if (a === 'expect_text') {
          const el = await page.locator(step.selector).first();
          const text = (await el.textContent()).trim();
          const target = String(step.text).trim();
          const ok = step.exact ? text === target : text.includes(target);
          (ok ? pass : fail)(step, `got "${text}"`);
        }
        else if (a === 'expect_class') {
          const el = await page.locator(step.selector).first();
          const cls = await el.getAttribute('class');
          const present = String(step.class).split(/\s+/).every((c) => cls && cls.split(/\s+/).includes(c));
          const want = step.present !== false;
          (present === want ? pass : fail)(step, `class="${cls}" want ${want ? 'has' : 'lacks'} "${step.class}"`);
        }
        else if (a === 'capture_style') {
          const val = await page.locator(step.selector).first().evaluate((el, prop) => getComputedStyle(el)[prop], step.prop);
          page.__vars = page.__vars || {}; page.__vars[step.var] = val;
          pass(step, `${step.var} = ${val}`);
        }
        else if (a === 'expect_style_changed') {
          const before = (page.__vars || {})[step.var];
          const now = await page.locator(step.selector).first().evaluate((el, prop) => getComputedStyle(el)[prop], step.prop);
          (before !== now ? pass : fail)(step, `before "${before}" now "${now}"`);
        }
        else if (a === 'expect_url_contains') {
          const ok = page.url().includes(step.text);
          (ok ? pass : fail)(step, page.url());
        }
        else if (a === 'expect_navigation') {
          if (!step.to) fail(step, 'expect_navigation needs "to"');
          else {
            await page.waitForURL((u) => u.toString().includes(step.to), { timeout: step.timeout || 5000 });
            pass(step, page.url());
          }
        }
        else if (a === 'expect_console_errors') {
          const want = step.present !== false;
          const hasErr = consoleErrors.length > 0;
          (hasErr === want ? pass : fail)(step, hasErr ? consoleErrors.slice(0, 3).join(' | ') : 'no console errors');
        }
        else if (a === 'expect_network_errors') {
          const want = step.present !== false;
          const hasErr = networkErrors.length > 0;
          (hasErr === want ? pass : fail)(step, hasErr ? networkErrors.slice(0, 3).join(' | ') : 'no failed requests');
        }
        else if (a === 'screenshot') {
          const png = await page.screenshot({ fullPage: step.full !== false });
          const name = (step.name || `shot-${results.length}`).replace(/[^\w.-]/g, '_');
          await mkdir(outDir, { recursive: true });
          const fp = join(outDir, name + '.png');
          await writeFile(fp, png);
          pass(step, name + '.png');
        }
        else fail(step, `unknown action "${a}"`);
      } catch (e) {
        fail(step, String(e && e.message || e).slice(0, 300));
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (served) served.close();
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const ok = results.every((r) => r.ok) && total > 0;
  await mkdir(outDir, { recursive: true });

  const rows = results.map((r, i) => {
    const badge = r.ok ? '<span class="b ok">✅</span>' : '<span class="b no">❌</span>';
    const shot = r.action === 'screenshot' && r.ok
      ? `<img class="shot" src="${esc(r.detail)}" alt="${esc(r.detail)}">` : '';
    return `<div class="row ${r.ok ? 'pass' : 'fail'}">
      ${badge}<div class="meta"><code>${esc(i + 1)}. ${esc(r.action)}</code>
      ${r.selector ? ` <code>${esc(r.selector)}</code>` : ''}
      ${r.text ? ` <code>"${esc(r.text)}"</code>` : ''}
      ${r.class ? ` <code>.${esc(r.class)}</code>` : ''}
      ${r.prop ? ` <code>${esc(r.prop)}</code>` : ''}
      <div class="detail">${esc(r.detail || '')}</div></div>${shot}</div>`;
  }).join('\n');

  const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>dsh-verify report</title>
<style>
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#0f1117;color:#e6e8ee;margin:0;padding:32px;line-height:1.6}
.wrap{max-width:860px;margin:0 auto}
h1{font-size:22px;letter-spacing:.02em}
.banner{border-radius:12px;padding:20px 24px;margin:16px 0 24px;font-size:15px}
.banner.ok{background:rgba(46,160,67,.12);border:1px solid rgba(46,160,67,.4)}
.banner.no{background:rgba(248,81,73,.12);border:1px solid rgba(248,81,73,.4)}
.banner .big{font-size:26px;font-weight:700}
.meta{color:#9aa3b2;font-size:13px}
.row{display:flex;gap:12px;padding:12px 14px;border:1px solid #232838;border-radius:10px;margin-bottom:10px;background:#151923}
.row.pass{border-left:3px solid #2ea043}
.row.fail{border-left:3px solid #f85149}
.b{font-size:16px}
.detail{color:#c9d1d9;margin-top:2px;font-size:13px}
.shot{max-width:100%;border-radius:8px;margin-top:10px;border:1px solid #232838}
.summary{color:#7d8590;font-size:13px;margin-bottom:20px}
code{background:#1c212e;padding:1px 6px;border-radius:5px;font-size:12px}
</style></head><body><div class="wrap">
<h1>dsh-verify · 独立验收报告</h1>
<div class="summary">${esc(spec.title || specPath)} · ${total} 步 · ${passed}/${total} 通过 · ${new Date().toISOString().slice(0,19).replace('T',' ')}</div>
<div class="banner ${ok ? 'ok' : 'no'}"><span class="big">${ok ? '✅ 验收通过' : '❌ 验收未通过'}</span> — Agent 自测不可信，真实浏览器说了算。</div>
${rows}
</div></body></html>`;

  await writeFile(join(outDir, 'report.html'), html);
  const failed = results.filter((r) => !r.ok).map((r) => ({ action: r.action, selector: r.selector || null, detail: r.detail || null }));
  return { name: basename(specPath), ok, passed, total, failed, report: join(outDir, 'report.html') };
}

function printFailed(f) {
  for (const x of f) console.log(`  ❌ ${x.action}${x.selector ? ' ' + x.selector : ''}: ${x.detail}`);
}

async function main() {
  if (has('help')) { process.stdout.write(HELP); process.exit(0); }
  const pattern = arg('spec');
  if (!pattern) { process.stdout.write(HELP); process.exit(2); }
  const specPaths = await expandSpecPaths(pattern);
  if (specPaths.length === 0) { console.error(`no specs matched: ${pattern}`); process.exit(2); }
  const outDir = resolve(arg('out', 'dsh-verify-out'));
  const multi = specPaths.length > 1;
  const results = [];

  for (const sp of specPaths) {
    const specOut = multi ? join(outDir, basename(sp).replace(/\.json$/, '')) : outDir;
    const r = await runOne(sp, specOut, { headed: has('headed'), url: arg('url') });
    results.push(r);
    if (multi) {
      console.log(`${r.ok ? '[PASS]' : '[FAIL]'} ${sp} (${r.passed}/${r.total})`);
      if (!r.ok) printFailed(r.failed);
    } else {
      console.log(`\ndsh-verify: ${r.ok ? 'PASS' : 'FAIL'} (${r.passed}/${r.total})`);
      if (!r.ok) printFailed(r.failed);
      console.log(`report: ${r.report}`);
    }
  }

  const allOk = results.length > 0 && results.every((r) => r.ok);
  if (has('json')) {
    process.stdout.write(JSON.stringify({
      verdict: allOk ? 'PASS' : 'FAIL',
      specs: results.map((r) => ({ name: r.name, verdict: r.ok ? 'PASS' : 'FAIL', passed: r.passed, total: r.total, failed: r.failed, report: r.report })),
      passed: results.filter((r) => r.ok).length,
      total: results.length,
    }) + '\n');
  }
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
