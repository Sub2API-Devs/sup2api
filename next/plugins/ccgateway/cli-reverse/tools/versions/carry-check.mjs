// Spot check of carried names: for the semantic rows of one old declaration, prints the name with the
// code around its old offset and around the offset it was carried to, so a reader can confirm both
// point at the same variable.
//   node tools/versions/carry-check.mjs <old-tree> <new-tree> <old-naming> <new-naming> <dropped.jsonl> \
//        <old decls.jsonl> <old declaration id> [sample=40] [seed=1]
// Inputs : the trees and naming directories given to tools/versions/carry-names.mjs, its
//          <report>-dropped.jsonl, and the old tree's analysis/scan/decls.jsonl.
// Output : stdout, one block per sampled row: name, old file@offset and context, new file@offset and
//          context (the identifier is marked with [ ]). Rows are matched old→new by order: carry-names
//          writes every table in the old order minus the rows it drops.
import fs from 'node:fs';
import path from 'node:path';

const [OT, NT, ON, NN, DROPPED, ODECLS, ID, SAMPLE = '40', SEED = '1'] = process.argv.slice(2);
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const decl = readJsonl(ODECLS).find((d) => `${d.file}#${d.names[0] ?? '@' + d.start}` === ID);
if (!decl) throw new Error('no declaration ' + ID);
const dropped = new Set(readJsonl(DROPPED).map((d) => d.table + '\u0001' + JSON.stringify(d.row)));
const pairs = [];
for (const f of fs.readdirSync(ON).filter((f) => /^semantic-.*\.jsonl$/.test(f)).sort()) {
  const olds = readJsonl(path.join(ON, f)), news = readJsonl(path.join(NN, f));
  let j = 0;
  for (const o of olds) {
    if (dropped.has(f + '\u0001' + JSON.stringify(o))) continue;
    const n = news[j++];
    const off = +o.key.slice(1);
    if (o.file === decl.file && off >= decl.start && off < decl.end) pairs.push({ table: f, o, n });
  }
  if (j !== news.length) throw new Error(`${f}: ${news.length} new rows, ${j} matched`);
}
const src = new Map();
const text = (root, file) => { const k = root + file; if (!src.has(k)) src.set(k, fs.readFileSync(path.join(root, file), 'utf8')); return src.get(k); };
const ctx = (root, file, off) => {
  const t = text(root, file), m = /^[\w$]+/.exec(t.slice(off)), len = m ? m[0].length : 0;
  return (t.slice(Math.max(0, off - 50), off) + '[' + t.slice(off, off + len) + ']' + t.slice(off + len, off + len + 50)).replace(/\s+/g, ' ');
};
// deterministic sample
let x = +SEED;
const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = [...pairs].sort(() => rnd() - 0.5).slice(0, +SAMPLE).sort((a, b) => +a.o.key.slice(1) - +b.o.key.slice(1));
console.log(`${ID}: ${pairs.length} carried semantic rows, showing ${pick.length}`);
for (const { o, n } of pick) {
  console.log(`\n${o.name}${n.note?.includes('carry:fallback-c') ? '  (fallback-c)' : ''}`);
  console.log(`  old ${o.file}${o.key}: ${ctx(OT, o.file, +o.key.slice(1))}`);
  console.log(`  new ${n.file}${n.key}: ${ctx(NT, n.file, +n.key.slice(1))}`);
}
