// Debug: per-chunk coverage (vendor labels vs lead's first-party matches).
//   node --max-old-space-size=12000 tools/vendor/coverage.mjs [top=40]
import fs from 'node:fs';
const top = +(process.argv[2] ?? 40);
const lines = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const fp = new Map();
for (const d of lines('analysis/match/decl-map.jsonl')) if (d.refFile) fp.set(d.id, d.refFile);
const per = new Map();
for (const r of lines('analysis/vendor/index/unit-labels.jsonl')) {
  const file = r.id.split('#')[0];
  const declId = r.id.split('~')[0];
  const c = per.get(file) ?? per.set(file, { file, total: 0, vendor: 0, fp: 0, unknown: 0, pkgs: {} }).get(file);
  c.total += r.bytes;
  if (r.label) {
    c.vendor += r.bytes;
    const p = r.label.fid ? r.label.fid.replace(/@[^@/]+\/.*$/, '') : r.label.kind;
    c.pkgs[p] = (c.pkgs[p] ?? 0) + r.bytes;
  } else if (fp.has(declId)) c.fp += r.bytes;
  else c.unknown += r.bytes;
}
const rows = [...per.values()].sort((a, b) => b.unknown - a.unknown);
let T = 0, Vb = 0, F = 0, Un = 0;
for (const r of rows) {
  T += r.total;
  Vb += r.vendor;
  F += r.fp;
  Un += r.unknown;
}
console.log({ total: T, vendor: Vb, firstPartyMatched: F, unknown: Un });
for (const r of rows.slice(0, top)) console.log(r.file.padEnd(22), String(r.total).padStart(8), 'v', String(r.vendor).padStart(8), 'fp', String(r.fp).padStart(8), 'unk', String(r.unknown).padStart(8), Object.entries(r.pkgs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ':' + v).join(' '));
