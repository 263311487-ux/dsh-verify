#!/usr/bin/env node
// dsh-verify MCP server — let any AI agent (Claude Code, Cursor, Copilot, ...)
// run real-browser acceptance checks on its own deliverables.
// Agents self-test and pass. Real browsers tell the truth.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { runOne } from '../bin/verify.mjs';
import { writeFile, mkdtemp, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const VERSION = require('../package.json').version;

const server = new Server(
  { name: 'dsh-verify', version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'verify_spec',
      description:
        'Run a dsh-verify acceptance spec (JSON file, or glob) against a real headless Chromium. ' +
        'The spec may serve a local static dir (spec.serve) or target any URL (spec.base / step.url). ' +
        'Returns PASS/FAIL with per-step results and a self-contained HTML report path. ' +
        'Exit-code semantics: ok=true means every step passed. This is deterministic — no LLM judges the outcome.',
      inputSchema: {
        type: 'object',
        properties: {
          specPath: { type: 'string', description: 'Path to the spec JSON file or glob (e.g. specs/*.json)' },
          out: { type: 'string', description: 'Output dir for report.html + screenshots (default: ./dsh-verify-out)' },
          url: { type: 'string', description: 'Optional target URL override (spec.base / step path ignored)' },
          headed: { type: 'boolean', description: 'Run with a visible browser (debug only)' },
        },
        required: ['specPath'],
      },
    },
    {
      name: 'verify_url',
      description:
        'Verify a live URL against a list of human-style checks, driven by a real headless Chromium. ' +
        'Checks are dsh-verify steps: goto/click/fill/wait/expect_text/expect_class/capture_style/' +
        'expect_style_changed/expect_url_contains/expect_navigation/expect_console_errors/' +
        'expect_network_errors/screenshot. If no goto step is given, a goto to the url is prepended. ' +
        'Returns PASS/FAIL with per-step results and a self-contained HTML report path. Deterministic — no LLM judges the outcome.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Target URL to open' },
          checks: {
            type: 'array',
            description: 'Human-style checks, e.g. [{action:"click",selector:"#dark-toggle"}, {action:"capture_style",selector:"body",prop:"backgroundColor",var:"bg"}, {action:"expect_style_changed",selector:"body",prop:"backgroundColor",var:"bg"}]',
            items: { type: 'object' },
          },
          out: { type: 'string', description: 'Output dir for report.html + screenshots (default: ./dsh-verify-out)' },
          headed: { type: 'boolean', description: 'Run with a visible browser (debug only)' },
        },
        required: ['url', 'checks'],
      },
    },
    {
      name: 'health',
      description: 'Check that the dsh-verify MCP server and its Chromium browser are ready to run verifications.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

async function chromiumInstalled() {
  try {
    await access(chromium.executablePath());
    return true;
  } catch {
    return false;
  }
}

async function verify(spec, outDir, opts) {
  const r = await runOne(spec, outDir, opts);
  return {
    ok: r.ok,
    passed: r.passed,
    total: r.total,
    failed: r.failed,
    report: r.report,
  };
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const out = args?.out ? resolve(String(args.out)) : resolve('dsh-verify-out');
  try {
    if (name === 'verify_spec') {
      if (!args?.specPath) throw new Error('specPath is required');
      const result = await verify(resolve(String(args.specPath)), out, {
        headed: !!args.headed,
        url: args.url ? String(args.url) : undefined,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
    if (name === 'verify_url') {
      const url = args?.url;
      const checks = args?.checks;
      if (!url) throw new Error('url is required');
      if (!Array.isArray(checks) || checks.length === 0) throw new Error('checks must be a non-empty array');
      const steps = checks.some((c) => c.action === 'goto')
        ? checks
        : [{ action: 'goto', url: String(url) }, ...checks];
      const dir = await mkdtemp(join(tmpdir(), 'dshv-mcp-'));
      const specPath = join(dir, 'spec.json');
      await writeFile(specPath, JSON.stringify({ title: `verify ${url}`, base: String(url), steps }, null, 2));
      const result = await verify(specPath, out, { headed: !!args.headed });
      result.generatedSpec = specPath;
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
    if (name === 'health') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'ok',
            server: `dsh-verify MCP ${VERSION}`,
            chromiumInstalled: await chromiumInstalled(),
            fix: 'if chromiumInstalled is false, run: npx playwright install chromium',
          }),
        }],
      };
    }
    throw new Error(`unknown tool: ${name}`);
  } catch (e) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ ok: false, error: String((e && e.message) || e) }) }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
