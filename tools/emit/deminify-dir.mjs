// Applies tools/emit/deminify.mjs to every ES module of a tree, e.g. a copy of runnable/,
// so that the runtime comparison (tools/verify/compare.mjs) can prove the transform
// preserves behaviour.
//   node tools/emit/deminify-dir.mjs <src> <dest> [--force] [--no-unify] [--only a.js,b.js] [--report <json>] [--check-printer] [--check-canonical]
// <dest> gets a full copy of <src>; the files the reading-tree emitter treats as modules
// (*.js / *.mjs, not *.min.js) are rewritten in place, everything else is copied as is.
// Files that do not parse as ES modules are left untouched and listed in the report.
// --check-printer additionally checks, per file, that Babel's printer alone (no rule) gives
// back the same AST (printerRoundTrip); differences are listed in the report.
// --check-canonical checks, per file, that input and output have the same canonical form
// (equivalentByCanon in deminify.mjs); differences are listed in the report.
import fs from 'node:fs';
import path from 'node:path';
import { deminifyCode, newStats, addStats, printerRoundTrip, equivalentByCanon } from './deminify.mjs';

const argv = process.argv.slice(2);
const pos = argv.filter((a, i) => !a.startsWith('--') && !['--only', '--report'].includes(argv[i - 1]));
const [SRC, DEST] = pos;
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
if (!SRC || !DEST) {
  console.error('usage: node tools/emit/deminify-dir.mjs <src> <dest> [--force] [--no-unify] [--only a.js,b.js] [--report <json>] [--check-printer] [--check-canonical]');
  process.exit(2);
}
const ONLY = opt('--only', null)?.split(',');
const REPORT = opt('--report', path.join(DEST, '..', path.basename(DEST) + '.deminify.json'));
if (path.resolve(SRC) === path.resolve(DEST)) throw new Error('src and dest must differ');
if (fs.existsSync(DEST)) {
  if (!argv.includes('--force')) throw new Error(DEST + ' exists (use --force)');
  fs.rmSync(DEST, { recursive: true, force: true });
}
fs.cpSync(SRC, DEST, { recursive: true });

const files = fs.readdirSync(DEST, { recursive: true }).map(String).filter((f) => /\.m?js$/.test(f) && !/\.min\.js$/.test(f) && (!ONLY || ONLY.includes(f)));
const total = newStats();
const perFile = {};
const skipped = [];
const printerDiffs = [];
const CHECK_PRINTER = argv.includes('--check-printer');
const CHECK_CANON = argv.includes('--check-canonical');
const canonDiffs = [];
let bytesIn = 0, bytesOut = 0;
const t0 = Date.now();
for (const [i, f] of files.entries()) {
  const p = path.join(DEST, f);
  const src = fs.readFileSync(p, 'utf8');
  if (CHECK_PRINTER) {
    try { const d = printerRoundTrip(src); if (d) printerDiffs.push({ file: f, at: d }); } catch (e) { printerDiffs.push({ file: f, error: e.message.slice(0, 200) }); }
  }
  const r = deminifyCode(src, { unify: !argv.includes('--no-unify') });
  if (r.error) { skipped.push({ file: f, error: r.error.slice(0, 200) }); continue; }
  fs.writeFileSync(p, r.code);
  if (CHECK_CANON) {
    try { const d = equivalentByCanon(src, r.code); if (d) canonDiffs.push({ file: f, at: d }); } catch (e) { canonDiffs.push({ file: f, error: e.message.slice(0, 200) }); }
  }
  addStats(total, r.stats);
  perFile[f] = Object.fromEntries(Object.entries(r.stats).filter(([, v]) => v));
  bytesIn += src.length;
  bytesOut += r.code.length;
  if ((i + 1) % 200 === 0) process.stderr.write(`${i + 1}/${files.length} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
}
const report = { src: SRC, dest: DEST, files: files.length, transformed: files.length - skipped.length, skipped, printerChecked: CHECK_PRINTER, printerDiffs, canonicalChecked: CHECK_CANON, canonDiffs, bytesIn, bytesOut, seconds: (Date.now() - t0) / 1000, total, perFile };
fs.writeFileSync(REPORT, JSON.stringify(report, null, 1));
console.log(JSON.stringify({ files: report.files, transformed: report.transformed, skipped: skipped.length, printerDiffs: CHECK_PRINTER ? printerDiffs.length : undefined, canonDiffs: CHECK_CANON ? canonDiffs.length : undefined, seconds: report.seconds, total }));
