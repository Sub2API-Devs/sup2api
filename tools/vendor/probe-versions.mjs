// Finds which published version of each matched package was bundled.
//
//   node --max-old-space-size=12000 tools/vendor/probe-versions.mjs [round=1] [minBytes=1500]
//
// Reads analysis/vendor/index/unit-labels.jsonl (tools/vendor/match.mjs) and
// orig-decls.jsonl, asks the registry for each matched package's versions
// (npm view, cached in analysis/vendor/index/registry/), downloads candidate
// tarballs with `npm pack` (registry fetch only: nothing is installed, no
// lifecycle script runs) and unpacks them to
// vendor-ref/node_modules/.versions/<name@version>/package, where
// index-npm.mjs picks them up. The next match run then chooses, per unit,
// among all versions; report.mjs intersects the versions per package.
//
// Candidates (published 2023-01-01 .. 2026-10-31, no prereleases):
//   - versions whose exact string appears in the code matched to the package
//   - round 1: newest patch of each of the newest 8 minor lines, plus the
//     newest of each older major (max 2)
//   - round 2: every patch of the minor line chosen in round 1 and of the next
//     minor line (needs a match run in between; reads index/versions.json)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readJsonl } from './lib/common.mjs';

const pexec = promisify(execFile);
const [round = '1', minBytes = '1500'] = process.argv.slice(2);
const IDX = 'analysis/vendor/index';
const REG = path.join(IDX, 'registry');
const VERS = 'vendor-ref/node_modules/.versions';
const DL = 'vendor-ref/node_modules/.versions/.tgz';
fs.mkdirSync(REG, { recursive: true });
fs.mkdirSync(DL, { recursive: true });
const FROM = '2023-01-01';
const UNTIL = '2026-10-31T23:59:59Z';
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = { ...process.env, HTTPS_PROXY: process.env.HTTPS_PROXY ?? 'http://127.0.0.1:7890' };

// ---------- matched packages ----------
const labels = readJsonl(path.join(IDX, 'unit-labels.jsonl'));
const pkgOfFid = (fid) => fid.match(/^(@?[^@]+)@/)[1];
const verOfFid = (fid) => fid.match(/^@?[^@]+@([^/]+)\//)[1];
const bytes = new Map();
for (const r of labels) if (r.label?.fid) bytes.set(pkgOfFid(r.label.fid), (bytes.get(pkgOfFid(r.label.fid)) ?? 0) + r.bytes);
const pkgs = [...bytes].filter(([, b]) => b >= +minBytes).map(([p]) => p).sort();
console.error('packages', pkgs.length);

// semver strings seen in the code matched to each package
const decls = new Map();
for (const d of readJsonl(path.join(IDX, 'orig-decls.jsonl'))) for (const u of d.units) decls.set(d.id + '~' + u.u, u);
const seenStrings = new Map();
for (const r of labels) {
  if (!r.label?.fid) continue;
  const p = pkgOfFid(r.label.fid);
  for (const t of decls.get(r.id)?.tokens ?? []) if (/^s:v?\d+\.\d+\.\d+$/.test(t)) (seenStrings.get(p) ?? seenStrings.set(p, new Set()).get(p)).add(t.slice(2).replace(/^v/, ''));
}

// ---------- registry metadata ----------
async function meta(p) {
  const f = path.join(REG, p.replace('/', '__') + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  try {
    const { stdout } = await pexec(NPM, ['view', p, 'time', '--json'], { env, shell: process.platform === 'win32', maxBuffer: 64 << 20 });
    const time = JSON.parse(stdout);
    fs.writeFileSync(f, JSON.stringify(time));
    return time;
  } catch (e) {
    fs.writeFileSync(f, '{}');
    return {};
  }
}
async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]);
    }
  }));
  return out;
}
const metas = new Map(pkgs.map((p, i) => [p, null]));
await pool(pkgs, 8, async (p) => metas.set(p, await meta(p)));

const parse = (v) => v.split('.').map(Number);
const cmp = (a, b) => {
  const x = parse(a),
    y = parse(b);
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};
const prev = fs.existsSync(path.join(IDX, 'versions.json')) ? JSON.parse(fs.readFileSync(path.join(IDX, 'versions.json'), 'utf8')) : {};
const want = [];
for (const p of pkgs) {
  const time = metas.get(p) ?? {};
  const all = Object.keys(time).filter((v) => /^\d+\.\d+\.\d+$/.test(v) && time[v] >= FROM && time[v] <= UNTIL).sort(cmp);
  if (!all.length) continue;
  const pick = new Set();
  for (const v of seenStrings.get(p) ?? []) if (time[v]) pick.add(v);
  if (round === '1') {
    const byMinor = new Map();
    for (const v of all) byMinor.set(v.split('.').slice(0, 2).join('.'), v);
    const minors = [...byMinor.values()].sort(cmp);
    for (const v of minors.slice(-8)) pick.add(v);
    const byMajor = new Map();
    for (const v of minors.slice(0, -8)) byMajor.set(v.split('.')[0], v);
    for (const v of [...byMajor.values()].slice(-2)) pick.add(v);
  } else {
    // every patch of the minor line(s) chosen so far and of the next minor
    // line (round 1 only had the newest patch of each line)
    const minors = [...new Set(all.map((v) => v.split('.').slice(0, 2).join('.')))];
    for (const c of prev[p]?.chosen ?? [])
      for (const v of c.versions) {
        const mm = v.split('.').slice(0, 2).join('.');
        const next = minors[minors.indexOf(mm) + 1];
        for (const w of all) if (w.startsWith(mm + '.') || (next && w.startsWith(next + '.'))) pick.add(w);
      }
  }
  for (const v of pick) if (!fs.existsSync(path.join(VERS, `${p.replace('/', '__')}@${v}`, 'package', 'package.json'))) want.push([p, v]);
}
console.error('tarballs to fetch', want.length);
let done = 0,
  failed = 0;
await pool(want, 8, async ([p, v]) => {
  // forward slashes and relative paths: GNU tar reads "D:" as a remote host
  const dir = path.posix.join(VERS, `${p.replace('/', '__')}@${v}`);
  try {
    let file = `${p.replace(/^@/, '').replace('/', '-')}-${v}.tgz`;
    if (!fs.existsSync(path.posix.join(DL, file))) {
      const { stdout } = await pexec(NPM, ['pack', `${p}@${v}`, '--ignore-scripts', '--json', '--pack-destination', DL], { env, shell: process.platform === 'win32', maxBuffer: 64 << 20 });
      file = JSON.parse(stdout)[0].filename;
    }
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('tar', ['--force-local', '-xzf', path.posix.join(DL, file), '-C', dir]);
    fs.rmSync(path.join(DL, file), { force: true });
    // tarballs normally unpack to package/; a few use another top folder
    if (!fs.existsSync(path.join(dir, 'package'))) {
      const top = fs.readdirSync(dir).find((d) => fs.existsSync(path.join(dir, d, 'package.json')));
      if (top) fs.renameSync(path.join(dir, top), path.join(dir, 'package'));
    }
  } catch (e) {
    failed++;
    console.error('fail', p, v, String(e.message).slice(0, 120));
  }
  if (++done % 50 === 0) console.error(done, '/', want.length);
});
console.log(JSON.stringify({ round, packages: pkgs.length, fetched: want.length - failed, failed }));
