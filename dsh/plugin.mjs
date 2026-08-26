// dsh/plugin.mjs — DeepSeek Harness (Cordis) plugin entry for dsh-verify.
// cordis.patch.yml references name: dsh-verify; Cordis resolves this module
// through package.json main and loads the name + apply exports.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-verify';

export function apply(ctx) {
  if (!ctx.tools) return;
  import('@deepseek-ai/dsh-tools')
    .then(({ defineTool }) => {
      ctx.tools.register(defineTool({
        name: 'dsh_verify',
        description: 'Witness — independent browser acceptance testing for agent-built web apps. Runs the dsh-verify CLI (real browser; PASS/FAIL with evidence receipts). Use when the agent built or changed a web app and must prove it works in a real browser.',
        parameters: {
          spec: { type: 'string', required: true, description: 'Path or glob to a JSON acceptance spec, e.g. specs/landing.json' },
          url: { type: 'string', description: 'Target URL; overrides spec.serve / spec.base / step path' },
          out: { type: 'string', description: 'Output directory for report.html + screenshots (default: ./dsh-verify-out)' },
          browser: { type: 'string', enum: ['chromium', 'firefox', 'webkit'], description: 'Browser engine (default: chromium)' },
        },
        output: {
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              ok: { type: 'boolean', required: true },
              exitCode: { oneOf: [{ type: 'integer' }, { type: 'null' }], required: true },
              summary: { type: 'string' },
              report: { type: 'string' },
              stderr: { type: 'string' },
            },
          },
          render(_args, value) {
            const v = value ?? {};
            const lines = [];
            lines.push('dsh-verify: ' + (v.ok ? 'PASS' : 'FAIL') + ' (exit ' + (v.exitCode ?? 'n/a') + ')');
            if (v.summary) lines.push(v.summary);
            return [{ type: 'text', text: lines.join('\n') }];
          },
        },
        async execute(args) {
          const bin = fileURLToPath(new URL('../bin/verify.mjs', import.meta.url));
          const argv = [bin, '--json', '--spec', String(args.spec)];
          if (args.url) argv.push('--url', String(args.url));
          if (args.out) argv.push('--out', String(args.out));
          if (args.browser) argv.push('--browser', String(args.browser));
          const r = spawnSync(process.execPath, argv, { encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
          const stdout = (r.stdout || '').trim();
          const stderr = (r.stderr || '').trim();
          return {
            ok: r.status === 0,
            exitCode: r.status,
            summary: stdout.split('\n').slice(-6).join('\n'),
            report: stdout.slice(0, 8000),
            stderr: stderr.slice(0, 2000),
          };
        },
      }));
    })
    .catch(() => {});
}
