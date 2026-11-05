// Repairs carried parameter names that moved to a neighbouring method. When a version inserts a new
// getter/setter pair into a run of look-alike methods, the local alignment of tools/versions/carry-names.mjs
// can pair each parameter with the one of the next method (2.1.318: `entrypoint` landed on
// replaceWrapUpOffered(e)). For every carried local whose forward and reversed alignments disagree
// (carry-names' <report>-unstable.jsonl), this compares the name of the enclosing method or function
// in both versions; when they differ, it looks up, in the old file, the method with the new method's
// name and takes the old name of its parameter at the same position.
//
//   node --max-old-space-size=6000 tools/versions/fix-moved-params.mjs \
//     --unstable artifacts/versions/carry-316-318-unstable.jsonl --old-tree artifacts/versions/2.1.316-original \
//     --old-final artifacts/versions/2.1.316-naming/final --out naming/semantic-zzzzz-318-moved.jsonl
//
// Inputs : the unstable list, the old tree and its naming/final (top.json + locals.jsonl), original/.
// Output : <out> {file, key, name, source:"semantic", confidence:0.98, note} per repaired binding;
//          prints how many were compared, matched, moved, repaired, and the moved ones it could not repair.
//          Only named methods count (object/class method keys, or function names longer than 3 characters).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const rows = readJsonl(args.unstable);
const oldTop = JSON.parse(fs.readFileSync(path.join(args['old-final'], 'top.json'), 'utf8'));
const oldLoc = new Map(readJsonl(path.join(args['old-final'], 'locals.jsonl')).map((x) => [x.file + x.key, x.name]));
const oldName = (f, off) => oldTop[f]?.['@' + off]?.name ?? oldLoc.get(f + '@' + off) ?? null;

// every named function in a file: [{name, start, end, params: [start offsets of the first identifier]}]
const fnCache = new Map();
function functions(root, file) {
  const k = root + '/' + file;
  if (fnCache.has(k)) return fnCache.get(k);
  const ast = parse(fs.readFileSync(path.join(root, file), 'utf8'), { sourceType: 'module', errorRecovery: true });
  const out = [];
  const keyName = (n) => n.key?.name ?? n.key?.value ?? (n.key?.id?.name ? '#' + n.key.id.name : null);
  const firstId = (p) => (p.type === 'Identifier' ? p.start : p.type === 'AssignmentPattern' ? firstId(p.left) : p.type === 'RestElement' ? firstId(p.argument) : null);
  const walk = (n, hint) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const x of n) walk(x, hint); return; }
    let h = hint;
    if (/^(ObjectMethod|ClassMethod|ClassPrivateMethod|ObjectProperty|ClassProperty|ClassPrivateProperty)$/.test(n.type)) h = keyName(n) ?? hint;
    if (/Function|Method/.test(n.type) && n.params) {
      const name = n.id?.name && n.id.name.length > 3 ? n.id.name : /^(ObjectMethod|ClassMethod|ClassPrivateMethod)$/.test(n.type) ? keyName(n) : h;
      if (name) out.push({ name, start: n.start, end: n.end, params: n.params.map(firstId) });
      h = null; // a nested anonymous function is not its parent's method
    }
    for (const key of Object.keys(n)) if (key !== 'loc') { const v = n[key]; if (v && typeof v === 'object') walk(v, /^(ObjectMethod|ClassMethod|ClassPrivateMethod|ObjectProperty|ClassProperty|ClassPrivateProperty)$/.test(n.type) ? h : (/Function|Method/.test(n.type) ? null : h)); }
  };
  walk(ast.program, null);
  fnCache.set(k, out);
  return out;
}
const innermost = (fns, off) => fns.filter((f) => off >= f.start && off < f.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0] ?? null;

let compared = 0, matched = 0, moved = 0, repaired = 0;
const out = [], unrepaired = [];
for (const r of rows) {
  const of = functions(args['old-tree'], r.oldFile), nf = functions('original', r.newFile);
  const a = innermost(of, r.oldOff), b = innermost(nf, r.newOff);
  if (!a || !b) continue;
  const ai = a.params.indexOf(r.oldOff), bi = b.params.indexOf(r.newOff);
  if (ai < 0 || bi < 0) continue; // only parameters
  compared++;
  if (a.name === b.name && ai === bi) { matched++; continue; }
  moved++;
  // the old method with the new method's name, nearest to the old binding
  const cands = of.filter((f) => f.name === b.name && f.params[bi] != null).sort((x, y) => Math.abs(x.start - r.oldOff) - Math.abs(y.start - r.oldOff));
  const name = cands.length ? oldName(r.oldFile, cands[0].params[bi]) : null;
  if (!name) { unrepaired.push({ new: r.newFile + '@' + r.newOff, oldMethod: a.name, newMethod: b.name }); continue; }
  out.push({ file: r.newFile, key: '@' + r.newOff, name, source: 'semantic', confidence: 0.98, note: `moved-param: ${b.name}(#${bi}) in 316 was ${name}; carry had put the name of ${a.name}(#${ai}) here` });
  repaired++;
}
fs.writeFileSync(args.out, out.map((x) => JSON.stringify(x)).join('\n') + (out.length ? '\n' : ''));
console.log(JSON.stringify({ unstable: rows.length, compared, matched, moved, repaired, unrepaired: unrepaired.length }));
for (const u of unrepaired) console.log('  unrepaired', JSON.stringify(u));
