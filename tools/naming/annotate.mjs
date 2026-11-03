// Work lists and annotated views for naming parameters and locals by hand.
//
//   node tools/naming/annotate.mjs plan <todo.jsonl> <groups> <out.json> [--tree src|vendor] [--top]
//       todo.jsonl from tools/verify/readability.mjs; groups first-party
//       declarations that still have minified params/locals into <groups>
//       contiguous (by reconstructed path) work lists of similar size.
//   node tools/naming/annotate.mjs show <plan.json> <group> <from> <count> [final]
//   node tools/naming/annotate.mjs id <declId> [final]
//       prints each declaration with every name from <final> applied and
//       every still-minified param/local shown as `<min>_K<offset>`; the
//       offset is the naming key: {"file":"<chunk>","key":"@<offset>","name":…}.
import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';
import { renameModule, bindingsOf } from '../rename/lib/rename.mjs';
import { RESERVED } from './lib/reserved.mjs';

const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const [cmd, ...args] = process.argv.slice(2);

function declIndex() {
  const m = new Map();
  for (const d of readJsonl('analysis/scan/decls.jsonl')) m.set(`${d.file}#${d.names[0] ?? '@' + d.start}`, d);
  return m;
}

if (cmd === 'plan') {
  const [todoPath, groupsArg, out] = args;
  // --tree vendor: third-party code; --top: also top-level bindings
  const TREE = args.includes('--tree') ? args[args.indexOf('--tree') + 1] : 'src';
  const WITH_TOP = args.includes('--top');
  const G = +groupsArg;
  const decls = declIndex();
  const per = new Map();
  for (const t of readJsonl(todoPath)) {
    if ((t.scope === 'top' && !WITH_TOP) || !t.path.startsWith(TREE + '/') || !t.declId) continue;
    let e = per.get(t.declId);
    if (!e) {
      const d = decls.get(t.declId);
      per.set(t.declId, (e = { id: t.declId, file: t.file, start: d?.start, end: d?.end, path: t.path, unnamed: 0, refs: 0 }));
    }
    e.unnamed++;
    e.refs += t.refs;
  }
  const all = [...per.values()].sort((a, b) => a.path.localeCompare(b.path) || a.start - b.start);
  const total = all.reduce((s, e) => s + e.unnamed, 0);
  const target = total / G;
  const groups = Array.from({ length: G }, () => ({ dirs: [], unnamed: 0, decls: [] }));
  let g = 0;
  let lastDir = null;
  for (const e of all) {
    const dir = e.path.split('/').slice(0, 3).join('/');
    if (groups[g].unnamed >= target && g < G - 1 && (dir !== lastDir || groups[g].unnamed >= target * 1.3)) g++;
    if (!groups[g].dirs.includes(dir)) groups[g].dirs.push(dir);
    groups[g].decls.push(e);
    groups[g].unnamed += e.unnamed;
    lastDir = dir;
  }
  fs.writeFileSync(out, JSON.stringify(groups));
  console.log(groups.map((x, i) => `${i}: ${x.decls.length} decls, ${x.unnamed} unnamed, ${x.dirs[0]} .. ${x.dirs.at(-1)}`).join('\n'));
  process.exit(0);
}

const FINAL = (cmd === 'show' ? args[4] : args[1]) ?? 'naming/final';
if (!['show', 'id', 'check'].includes(cmd)) { console.error('usage: plan | show | id | check (see header)'); process.exit(1); }
const top = JSON.parse(fs.readFileSync(path.join(FINAL, 'top.json'), 'utf8'));
const localsByFile = new Map();
for (const l of readJsonl(path.join(FINAL, 'locals.jsonl'))) {
  let m = localsByFile.get(l.file);
  if (!m) localsByFile.set(l.file, (m = {}));
  m[l.key] = l.name;
}

const chunkCache = new Map();
function annotatedChunk(file) {
  if (chunkCache.has(file)) return chunkCache.get(file);
  const src = fs.readFileSync(path.join('original', file), 'utf8');
  const entry = {};
  for (const [k, v] of Object.entries(top[file] ?? {})) entry[k] = v.name;
  Object.assign(entry, localsByFile.get(file) ?? {});
  const minifiedModule = (() => {
    const own = bindingsOf(file, src).filter((b) => b.kind !== 'import');
    return { own, minified: own.filter((b) => b.name.length <= 3).length > own.length * 0.6 };
  })();
  for (const b of minifiedModule.own) {
    if (b.frozen || !minifiedModule.minified || b.name.length > 3) continue;
    // top-level bindings that kept their minified name are marked too
    if (b.scope === 'top' ? !(top[file]?.[b.key] === undefined || top[file][b.key].name === b.name) || b.kind === 'import' : entry[b.key]) continue;
    entry[b.key] = `${b.name}_K${b.key.slice(1)}`;
  }
  const r = renameModule(file, src, entry, null);
  const v = { src, r };
  chunkCache.clear();
  chunkCache.set(file, v);
  return v;
}

async function show(d) {
  const { r } = annotatedChunk(d.file);
  let text = r.code.slice(r.offsetMap(d.start), r.offsetMap(d.end));
  try { text = await prettier.format(text, { parser: 'babel', printWidth: 110 }); } catch {}
  const unnamed = new Set(text.match(/\b[\w$]{1,3}_K\d+\b/g) ?? []).size;
  console.log(`=== ${d.id}  →  reconstructed/${d.path}  (file ${d.file}, ${unnamed} unnamed)`);
  console.log(text.trimEnd());
  console.log();
}

if (cmd === 'show') {
  const [planPath, group, from, count] = args;
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'))[+group];
  const list = plan.decls.slice(+from, +from + +count);
  // group by chunk so each chunk is renamed once
  for (const d of list.slice().sort((a, b) => a.file.localeCompare(b.file))) await show(d);
  console.log(`# shown ${list.length} of ${plan.decls.length} (from ${from})`);
} else if (cmd === 'id') {
  const d = declIndex().get(args[0]);
  if (!d) { console.error('no such declaration'); process.exit(1); }
  await show({ id: args[0], file: d.file, start: d.start, end: d.end, path: '?' });
} else if (cmd === 'check') {
  // node tools/naming/annotate.mjs check <names.jsonl> [final]
  // every line must name an existing, non-frozen binding with a valid name;
  // then each touched chunk is renamed with final + these names (0 rejections expected).
  const lines = readJsonl(args[0]);
  const byFile = new Map();
  for (const l of lines) {
    if (!byFile.has(l.file)) byFile.set(l.file, []);
    byFile.get(l.file).push(l);
  }
  const bad = [];
  let conflicts = 0;
  for (const [file, ls] of byFile) {
    if (!fs.existsSync(path.join('original', file))) { bad.push(`${file}: no such chunk`); continue; }
    const src = fs.readFileSync(path.join('original', file), 'utf8');
    const bs = new Map(bindingsOf(file, src).map((b) => [b.key, b]));
    const entry = {};
    for (const [k, v] of Object.entries(top[file] ?? {})) entry[k] = v.name;
    Object.assign(entry, localsByFile.get(file) ?? {});
    for (const l of ls) {
      const b = bs.get(l.key);
      if (!b) bad.push(`${file}${l.key}: no binding at this offset`);
      else if (b.frozen) bad.push(`${file}${l.key}: frozen (${b.frozen})`);
      else if (!/^[A-Za-z_$][\w$]*$/.test(l.name ?? '')) bad.push(`${file}${l.key}: invalid name ${l.name}`);
      // names tools/naming/resolve.mjs drops on merge (reserved words, globals a
      // binding must not shadow, annotate placeholders, the minified name itself)
      else if (RESERVED.has(l.name)) bad.push(`${file}${l.key}: reserved or global name ${l.name} (dropped on merge)`);
      else if (/(?<![\w$])[\w$]{1,3}_K\d+(?!\d)/.test(l.name)) bad.push(`${file}${l.key}: contains an annotate placeholder (${l.name})`);
      // the minified name kept on purpose (a loop index `i`, a short original) is allowed
      else if (l.name === b.name && b.name.length <= 3 && !/^[ijkn]$/.test(l.name)) bad.push(`${file}${l.key}: name equals the minified name ${l.name}`);
      else entry[l.key] = l.name;
    }
    const r = renameModule(file, src, entry, null);
    for (const x of r.rejected) bad.push(`${file}${x.key}: rejected ${x.wanted} (${x.reason})`);
    conflicts += r.conflicts.filter((c) => ls.some((l) => l.key === c.key)).length;
  }
  console.log(`${lines.length} lines, ${byFile.size} chunks, ${bad.length} problems, ${conflicts} suffixed by conflicts`);
  for (const b of bad.slice(0, 50)) console.log('  ' + b);
  process.exit(bad.length ? 1 : 0);
} else {
  console.error('usage: plan | show | id (see header)');
  process.exit(1);
}
