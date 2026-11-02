// Debug viewer: prints the unit labels of one chunk in order.
//   node tools/vendor/show-chunk.mjs <chunk-file> [from] [count]
import fs from 'node:fs';
const [file, from = 0, count = 200] = process.argv.slice(2);
const src = fs.readFileSync('original/' + file, 'utf8');
const rows = fs.readFileSync('analysis/vendor/index/unit-labels.jsonl', 'utf8').split('\n').filter((l) => l.includes(`"${file}#`)).map((l) => JSON.parse(l));
const decls = new Map();
for (const l of fs.readFileSync('analysis/vendor/index/orig-decls.jsonl', 'utf8').split('\n')) {
  if (!l.includes(`"file":"${file}"`)) continue;
  const d = JSON.parse(l);
  for (const u of d.units) decls.set(d.id + '~' + u.u, u);
}
for (const r of rows.slice(+from, +from + +count)) {
  const u = decls.get(r.id);
  const snippet = src.slice(u.start, Math.min(u.end, u.start + 90)).replace(/\s+/g, ' ');
  const lab = r.label ? `${r.label.method} ${r.label.fid ?? r.label.kind} ${r.label.score}` : r.cand ? `-- (cand ${r.cand.fid} ${r.cand.score})` : '--';
  console.log(`${r.id.padEnd(28)} ${String(r.bytes).padStart(6)} w=${String(r.w).padStart(5)} ${r.wrap ?? ''} | ${lab} | ${snippet}`);
}
