#!/usr/bin/env node
// Builds the reading tree into a runnable Claude Code CLI with Bun 1.4.4, the Bun version the
// official 2.1.316 build was made with (the official ELF embeds Bun 1.4.4).
//
//   node build.mjs [--outdir dist] [--bun <path>] [--any-bun] [--minify] [--sourcemap]
//   node build.mjs run [--outdir dist] [--bun <path>] -- <claude arguments…>   runs the build with Bun
//
// This file is tools/build/build.mjs; tools/emit/readable.mjs copies it to the root of the
// reading tree (reconstructed/build.mjs), next to the generated package.json, so the tree
// builds on its own (`npm run build` in reconstructed/). Everything it reads is inside the
// tree: src/, vendor/, runtime/, assets/. The output directory gets
//   cli.js           the entry (src/entrypoints/cli.js), at the top like the official cli.js
//   chunk-*.js       code split at the dynamic loads (import() / require()), like the official chunks
//   *-<hash>.<ext>   resources imported `with { type: "file" }`
// The CLI runs on Bun: `bun dist/cli.js …`, or `npm start -- …` (= node build.mjs run -- …).
//
// Bun is looked up in this order: --bun, $BUN, node_modules/bun/bin/bun[.exe] or
// node_modules/@oven/bun-*/bin/bun[.exe] in this directory or any parent, `bun` on PATH. Any other version than 1.4.4 is refused unless --any-bun.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes(k);
const OUTDIR = path.resolve(ROOT, opt('--outdir', 'dist'));
const BUN_VERSION = '1.4.4';

// the program's entry points (the official build's entries that the reading tree has): the CLI, and
// the function-hooks worker that the CLI starts as a worker thread from
// <dir of cli.js>/src/plugins/functionHooks/hooks-worker/hooks-worker.js (HOOKS_WORKER_URL)
const ENTRIES = [
  { entry: 'src/entrypoints/cli.js', out: '.' },
  { entry: 'src/plugins/functionHooks/hooks-worker/hooks-worker.js', out: 'src/plugins/functionHooks/hooks-worker' },
];

// `npm ci --ignore-scripts` skips the bun package's postinstall, which leaves only a placeholder in
// node_modules/bun/bin; the real binary is in the platform package node_modules/@oven/bun-<os>-<arch>/bin
function findBun() {
  const explicit = opt('--bun', process.env.BUN);
  if (explicit) return explicit;
  const exe = process.platform === 'win32' ? 'bun.exe' : 'bun';
  const runs = (p) => fs.existsSync(p) && spawnSync(p, ['--version'], { encoding: 'utf8' }).status === 0;
  for (let d = ROOT; ; d = path.dirname(d)) {
    const nm = path.join(d, 'node_modules');
    const oven = path.join(nm, '@oven');
    const platformBins = fs.existsSync(oven) ? fs.readdirSync(oven).filter((n) => n.startsWith('bun-')).map((n) => path.join(oven, n, 'bin', exe)) : [];
    for (const cand of [path.join(nm, 'bun', 'bin', exe), ...platformBins]) if (runs(cand)) return cand;
    if (path.dirname(d) === d) break;
  }
  return 'bun';
}

const bun = findBun();
const ver = spawnSync(bun, ['--version'], { encoding: 'utf8' });
if (ver.error || ver.status !== 0) {
  console.error(`build: cannot run Bun (${bun}): ${ver.error?.message ?? ver.stderr}`);
  process.exit(1);
}
const version = ver.stdout.trim();
if (version !== BUN_VERSION && !flag('--any-bun')) {
  console.error(`build: Bun ${version} at ${bun}; the official build used Bun ${BUN_VERSION} (pass --any-bun to build anyway)`);
  process.exit(1);
}

if (argv[0] === 'run') {
  const dd = argv.indexOf('--');
  const cliArgs = dd >= 0 ? argv.slice(dd + 1) : [];
  const entry = path.join(OUTDIR, 'cli.js');
  if (!fs.existsSync(entry)) { console.error(`build: ${entry} does not exist; run \`npm run build\` first`); process.exit(1); }
  const r = spawnSync(bun, [entry, ...cliArgs], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

fs.rmSync(OUTDIR, { recursive: true, force: true });
const t0 = Date.now();
for (const { entry, out } of ENTRIES) {
  if (!fs.existsSync(path.join(ROOT, entry))) { console.error(`build: missing entry ${entry}`); process.exit(1); }
  const args = [
    'build', path.join(ROOT, entry),
    '--target=bun', '--format=esm', '--splitting',
    '--outdir', path.join(OUTDIR, out),
    '--entry-naming', '[name].[ext]',
    '--chunk-naming', 'chunk-[hash].[ext]',
    '--asset-naming', '[name]-[hash].[ext]',
  ];
  if (flag('--minify')) args.push('--minify');
  if (flag('--sourcemap')) args.push('--sourcemap=linked');
  const r = spawnSync(bun, args, { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) {
    console.error(`build: bun build ${entry} failed (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}
const files = fs.readdirSync(OUTDIR, { recursive: true }).filter((f) => fs.statSync(path.join(OUTDIR, f)).isFile());
console.log(`build: Bun ${version}, ${files.length} files in ${path.relative(process.cwd(), OUTDIR) || '.'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
