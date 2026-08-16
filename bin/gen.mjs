// dsh-verify gen — AI-drafts an acceptance checklist; a real browser still executes it.
// Agents self-test and pass. Real browsers tell the truth. (Drafting is the only AI part.)
import { runOne } from './verify.mjs';
import { chromium } from 'playwright';

export const ACTIONS = [
  'goto', 'wait', 'click', 'fill',
  'expect_text', 'expect_class', 'capture_style', 'expect_style_changed',
  'expect_url_contains', 'expect_navigation',
  'expect_console_errors', 'expect_network_errors', 'screenshot',
];

const SYSTEM = `You draft browser acceptance checklists for AI-agent deliverables. You only WRITE the checklist; a deterministic headless browser EXECUTES it — you never judge the outcome.
Output strictly one JSON object with "title" and "steps". Each step: {"action": "...", ...params}. Allowed actions and their fields:
- goto: url (absolute) or path
- wait: ms
- click: selector, count (optional)
- fill: selector, text
- expect_text: selector, text, exact (optional bool)
- expect_class: selector, class, present (optional bool)
- capture_style: selector, prop (CSS property, camelCase), var (variable name)
- expect_style_changed: selector, prop, var (must match a previous capture_style var)
- expect_url_contains: text
- expect_navigation: to, timeout (optional ms)
- expect_console_errors: present (false = assert no console errors; include this)
- expect_network_errors: present (false = assert no failed requests; include this)
- screenshot: name
Rules:
- Selectors come from the provided page facts; prefer stable ids/roles/button text.
- Cover the user's requirements; if none given, check: page loads, key content present, main interactions work, no console/network errors.
- To verify a style change (e.g. dark mode toggle), always pair capture_style (before) with expect_style_changed (after) on the same element/prop/var.
- 5-15 steps. No markdown, no explanation — only the JSON object.`;

function buildPrompt({ url, requirements, facts }) {
  const f = facts || {};
  return `Target URL: ${url}
User requirements: ${requirements || '(none — draft sensible acceptance checks)'}

Page facts (from a real browser):
- title: ${f.title || ''}
- headings: ${(f.headings || []).join(' | ') || 'none'}
- buttons: ${(f.buttons || []).join(' | ') || 'none'}
- inputs: ${(f.inputs || []).map((i) => `${i.tag}${i.type ? ':' + i.type : ''}${i.placeholder ? ' placeholder=' + i.placeholder : ''}${i.id ? ' #' + i.id : ''}`).join(' | ') || 'none'}
- links: ${(f.links || []).map((l) => `${l.text || l.href}`).join(' | ') || 'none'}
- body text (truncated): ${f.bodyText || ''}

Draft the checklist JSON now.`;
}

export function parseSpec(text) {
  let t = String(text || '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

export function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') return { ok: false, error: 'spec must be an object' };
  const steps = Array.isArray(spec.steps) ? spec.steps : [];
  if (steps.length === 0) return { ok: false, error: 'spec.steps is empty' };
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s || typeof s !== 'object') return { ok: false, error: `step ${i + 1} is not an object` };
    if (!ACTIONS.includes(s.action)) {
      return { ok: false, error: `step ${i + 1}: unknown action "${s.action}" (supported: ${ACTIONS.join(', ')})` };
    }
  }
  return { ok: true, steps };
}

export async function extractPageFacts(page) {
  return page.evaluate(() => {
    const q = (sel) => Array.from(document.querySelectorAll(sel));
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const uniq = (arr) => [...new Set(arr)];
    const buttons = uniq(
      q('button, input[type=button], input[type=submit], [role=button]')
        .filter(visible)
        .map((el) => clean(el.innerText || el.value || el.getAttribute('aria-label') || ''))
        .filter(Boolean),
    ).slice(0, 40);
    const inputs = q('input, textarea, select')
      .filter(visible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        placeholder: clean(el.getAttribute('placeholder') || ''),
        id: el.id || '',
        name: el.getAttribute('name') || '',
      }))
      .filter((x) => x.type !== 'hidden' && (x.placeholder || x.id || x.name || x.tag === 'textarea' || x.tag === 'select'))
      .slice(0, 30);
    const links = q('a[href]')
      .filter(visible)
      .map((el) => ({ text: clean(el.innerText) || clean(el.getAttribute('aria-label') || ''), href: el.getAttribute('href') || '' }))
      .filter((x) => x.text || x.href)
      .slice(0, 30);
    const headings = q('h1, h2, h3').filter(visible).map((el) => clean(el.innerText)).filter(Boolean).slice(0, 15);
    return {
      title: document.title || '',
      headings,
      buttons,
      inputs,
      links,
      bodyText: clean(document.body ? document.body.innerText : '').slice(0, 4000),
      url: location.href,
    };
  });
}

export async function generateSpec({ url, requirements = '', pageFacts, model, apiKey, baseUrl, provider = 'deepseek', signal }) {
  const key = apiKey || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('no LLM API key — set DEEPSEEK_API_KEY (or pass --api-key)');
  const base = baseUrl || (provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.deepseek.com');
  const mdl = model || (provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-v4-flash');
  if (!pageFacts) throw new Error('pageFacts is required (browse the page first)');

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: mdl,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: buildPrompt({ url, requirements, facts: pageFacts }) }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  let spec;
  try {
    spec = parseSpec(content);
  } catch (e) {
    throw new Error(`LLM returned invalid JSON: ${e.message}`);
  }
  const v = validateSpec(spec);
  if (!v.ok) throw new Error(v.error);
  if (!spec.steps.some((st) => st.action === 'goto')) {
    spec.steps.unshift({ action: 'goto', url });
  }
  spec.title = spec.title || `AI-drafted acceptance spec for ${url}`;
  return { spec, model: mdl, provider };
}

async function fetchFacts(url, { headed = false } = {}) {
  const browser = await chromium.launch({ headless: !headed });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    return await extractPageFacts(page);
  } finally {
    await browser.close().catch(() => {});
  }
}

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const has = (name) => process.argv.includes('--' + name);

export async function main() {
  const url = arg('url');
  if (!url) {
    process.stdout.write(`dsh-verify gen — AI-drafts an acceptance checklist (a real browser executes it)

usage: dsh-verify gen --url <url> [options]

options:
  --url <url>       target page (required)
  --prompt <text>   what a human QA should verify (optional)
  --out <file>      spec output path (default: dsh-verify.gen.json)
  --run             also execute the drafted spec in a real browser
  --model <name>    LLM model (default: deepseek-v4-flash)
  --provider <p>    deepseek | openai (default: deepseek)
  --base-url <url>  LLM API base URL override
  --api-key <key>   LLM API key (default: $DEEPSEEK_API_KEY / $OPENAI_API_KEY)
`);
    process.exit(2);
  }
  const out = arg('out', 'dsh-verify.gen.json');
  console.log(`gen: opening ${url} in a real browser to learn the page...`);
  const facts = await fetchFacts(url, { headed: has('headed') });
  console.log(`gen: page learned (${(facts.buttons || []).length} buttons, ${(facts.inputs || []).length} inputs) — drafting checklist...`);
  const { spec, model } = await generateSpec({ url, requirements: arg('prompt', ''), pageFacts: facts, model: arg('model'), apiKey: arg('api-key'), baseUrl: arg('base-url'), provider: arg('provider', 'deepseek') });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(out, JSON.stringify(spec, null, 2));
  console.log(`gen: checklist drafted by ${model} (${spec.steps.length} steps) -> ${out}`);
  if (has('run')) {
    const r = await runOne(out, arg('outdir', 'dsh-verify-out'), { headed: has('headed') });
    console.log(`gen: executed in real browser -> ${r.ok ? 'PASS' : 'FAIL'} (${r.passed}/${r.total})`);
    console.log(`report: ${r.report}`);
    process.exit(r.ok ? 0 : 1);
  }
  console.log(`next: review ${out}, then run: dsh-verify --spec ${out}`);
}

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(`gen: ${e.message}`); process.exit(1); });
