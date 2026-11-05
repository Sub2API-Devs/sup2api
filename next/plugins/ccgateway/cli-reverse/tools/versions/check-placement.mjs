// Checks a placement batch's tables before they are merged.
//   node tools/versions/check-placement.mjs <placement.json> [--batch decls.jsonl] [--docs docs.jsonl] [--modules modules.json]
// Inputs : the batch's naming/placement-<code>.json ({declId: "dir/File.ts"}), optionally the batch list
//          (artifacts/tmp/batches/<code>/decls.jsonl), its docs-<code>.jsonl and modules-<code>.json;
//          analysis/scan/decls.jsonl and analysis/segments/modules.json for what exists.
// Output : stdout: counts and every problem; exit 1 when there is a problem.
// Problems: unknown declaration id; id outside the batch; a target that is not a string, is a scratch
//          path (_unattributed/ _new/ _misplaced/), absolute, has "..", or has no .ts/.tsx/.js/.jsx/.mjs/.cjs
//          extension, or differs only in letter case from an existing module path; a docs line without
//          id/doc or for an unknown id; a modules key that no placement in
//          this batch uses and that is not an existing module.
// Coverage (not a problem): batch declarations left unplaced are listed.
import fs from 'node:fs';

const [file, ...rest] = process.argv.slice(2);
const opt = {};
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = rest[i + 1];
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const ids = new Set(readJsonl('analysis/scan/decls.jsonl').map((d) => `${d.file}#${d.names[0] ?? '@' + d.start}`));
const existing = new Set(Object.keys(JSON.parse(fs.readFileSync('analysis/segments/modules.json', 'utf8'))));
const batch = opt.batch ? new Set(readJsonl(opt.batch).map((r) => r.id)) : null;
const bad = [];
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
const targets = new Set();
for (const [id, t] of Object.entries(p)) {
  const target = typeof t === 'string' ? t : t?.path;
  if (!ids.has(id)) bad.push(`${id}: no such declaration`);
  else if (batch && !batch.has(id)) bad.push(`${id}: not in this batch`);
  if (typeof target !== 'string' || !target) { bad.push(`${id}: target is not a path`); continue; }
  if (/(^|\/)_(unattributed|new|misplaced)\//.test(target)) bad.push(`${id}: scratch path ${target}`);
  if (target.startsWith('/') || target.includes('..') || target.includes('\\')) bad.push(`${id}: bad path ${target}`);
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(target)) bad.push(`${id}: no source extension ${target}`);
  targets.add(target.replace(/^vendor\//, ''));
}
let docs = 0, mods = 0;
// a target that differs from an existing module path only in letter case would be a second module
// whose file overwrites the first on a case-insensitive file system (Windows, macOS)
{
  const stem = (s) => s.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');
  const byLower = new Map([...existing].map((e) => [stem(e).toLowerCase(), stem(e)]));
  for (const t of targets) { const e = byLower.get(stem(t).toLowerCase()); if (e !== undefined && e !== stem(t)) bad.push(`${t}: differs only in case from the existing module ${e}`); }
}
if (opt.docs && fs.existsSync(opt.docs)) for (const x of readJsonl(opt.docs)) {
  docs++;
  if (!x.id || !x.doc) bad.push(`docs: line without id/doc ${JSON.stringify(x).slice(0, 80)}`);
  else if (!ids.has(x.id)) bad.push(`docs: ${x.id}: no such declaration`);
}
if (opt.modules && fs.existsSync(opt.modules)) for (const k of Object.keys(JSON.parse(fs.readFileSync(opt.modules, 'utf8')))) {
  mods++;
  const stem = (s) => s.replace(/\.(tsx?|jsx?|mjs|cjs)$/, '');
  const used = [...targets].some((t) => stem(t) === stem(k)) || [...existing].some((e) => stem(e) === stem(k));
  if (!used) bad.push(`modules: ${k}: no placement in this batch and no existing module`);
}
const unplaced = batch ? [...batch].filter((id) => !(id in p)) : [];
console.log(`${Object.keys(p).length} placements, ${targets.size} targets, ${docs} docs, ${mods} module notes, ${bad.length} problems${batch ? `, ${unplaced.length} of ${batch.size} batch declarations unplaced` : ''}`);
for (const b of bad.slice(0, 60)) console.log('  ' + b);
if (unplaced.length) console.log('  unplaced: ' + unplaced.slice(0, 20).join(' ') + (unplaced.length > 20 ? ' …' : ''));
process.exit(bad.length ? 1 : 0);
