// Carries the old version's final file placement (analysis/segments/decl-path.jsonl, whatever method made
// it: placement table, facade, reference match, layout …) to declarations that the new version's
// segmentation left in a scratch directory (_unattributed/, _new/, _misplaced/), through the unit
// pairing of tools/versions/carry-names.mjs. The same code goes to the same file as before.
//
//   node tools/versions/carry-paths.mjs --pairs artifacts/versions/carry-316-318-pairs.jsonl \
//     --old-analysis artifacts/versions/2.1.316-analysis --out naming/placement-carry-316.json
//
// Inputs : the pairs file ({old, new, how, status}); the old analysis/scan/decls.jsonl and
//          analysis/segments/decl-path.jsonl; the new analysis/scan/decls.jsonl and
//          analysis/segments/decl-path.jsonl (run the pipeline first).
// Output : <out> {newDeclId: "path"} in the placement table format (naming/README.md, tools/segment/segment.mjs);
//          only declarations whose new path is a scratch path and whose paired old declaration had a real
//          path; pairs with status "conflict" are skipped. Vendor paths get the "vendor/" prefix.
//          Prints counts by pairing method and status.
// The table sorts before the hand-written placement-* tables, so any of them overrides it.
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;
const scratch = (p) => /(^|\/)_(unattributed|new|misplaced)\//.test(p);
const unitDecl = (decls) => { const m = new Map(); for (const d of decls) { for (const n of d.names) m.set(d.file + ':' + n, idOf(d)); m.set(d.file + ':#' + d.start, idOf(d)); } return m; };
const oldUnit = unitDecl(readJsonl(path.join(args['old-analysis'], 'scan/decls.jsonl')));
const newUnit = unitDecl(readJsonl('analysis/scan/decls.jsonl'));
const oldPath = new Map(readJsonl(path.join(args['old-analysis'], 'segments/decl-path.jsonl')).map((x) => [x.id, x]));
const newPath = new Map(readJsonl('analysis/segments/decl-path.jsonl').map((x) => [x.id, x]));
const out = {}, stats = { carried: 0, byHow: {}, byStatus: {}, skippedConflict: 0, disagree: 0 };
for (const p of readJsonl(args.pairs)) {
  const nd = newUnit.get(p.new), od = oldUnit.get(p.old);
  if (!nd || !od) continue;
  const np = newPath.get(nd), op = oldPath.get(od);
  if (!np || !op || !scratch(np.path) || scratch(op.path)) continue;
  if (p.status === 'conflict') { stats.skippedConflict++; continue; }
  const target = op.kind === 'vendor' && !op.path.startsWith('vendor/') ? 'vendor/' + op.path : op.path;
  if (out[nd] !== undefined) { if (out[nd] !== target) stats.disagree++; continue; } // several bindings of one declaration: first wins
  out[nd] = target;
  stats.carried++;
  stats.byHow[p.how] = (stats.byHow[p.how] ?? 0) + 1;
  stats.byStatus[p.status] = (stats.byStatus[p.status] ?? 0) + 1;
}
fs.writeFileSync(args.out, JSON.stringify(Object.fromEntries(Object.entries(out).sort()), null, 1) + '\n');
console.log(JSON.stringify(stats));
