import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await mkdtemp(join(tmpdir(), 'dsh-verify-pack-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, { cwd: opts.cwd || root, encoding: 'utf8', timeout: 180000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status})\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

try {
  const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const tarball = join(scratch, `${packageJson.name}-${packageJson.version}.tgz`);
  const packed = JSON.parse(run(npm, ['pack', '--ignore-scripts', '--pack-destination', scratch, '--json']));
  const required = [
    'bin/init.mjs',
    'scripts/check-buggy.mjs',
    'templates/starter/site/index.html',
    'templates/starter/dsh-verify.spec.json',
    'templates/starter/dsh-verify.fail.json',
  ];
  const packedFiles = new Set(packed[0].files.map(file => file.path));
  for (const file of required) {
    if (!packedFiles.has(file)) throw new Error(`packed tarball is missing ${file}`);
  }

  const install = join(scratch, 'install');
  await mkdir(install);
  run(npm, ['install', '--ignore-scripts', '--no-fund', tarball], { cwd: install });
  const audit = JSON.parse(run(npm, ['audit', '--json'], { cwd: install }));
  if (audit.metadata?.vulnerabilities?.total !== 0) throw new Error('packed consumer dependency audit is not clean');
  // Consumers resolve their own supported Playwright version. Download that
  // version's browser, not the source lockfile's potentially older revision.
  run(process.execPath, [join(install, 'node_modules/playwright/cli.js'), 'install', 'chromium'], { cwd: install });
  const installedBin = join(install, 'node_modules', '.bin', process.platform === 'win32' ? 'dsh-verify.cmd' : 'dsh-verify');
  const starter = join(install, 'dsh-verify-starter');
  run(installedBin, ['init'], { cwd: install });
  for (const [spec, expectedCode, expectedVerdict] of [
    ['dsh-verify.spec.json', 0, 'PASS'],
    ['dsh-verify.fail.json', 1, 'FAIL'],
  ]) {
    const result = spawnSync(installedBin, ['--spec', spec, '--out', `out-${expectedVerdict.toLowerCase()}`, '--json'], {
      cwd: starter,
      encoding: 'utf8',
      timeout: 120000,
    });
    if (result.error) throw result.error;
    if (result.status !== expectedCode) throw new Error(`${spec}: expected exit ${expectedCode}, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    const report = JSON.parse(result.stdout.trim().split('\n').at(-1));
    if (report.verdict !== expectedVerdict) throw new Error(`${spec}: expected ${expectedVerdict}, got ${report.verdict}`);
  }
  console.log('packed CLI smoke passed: init, real-browser PASS fixture, and intentional FAIL fixture');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
