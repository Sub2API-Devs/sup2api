// Query tool over the analysis data — for team members and AI readers.
//   node tools/q.mjs find <text>          declarations whose names/strings/props contain <text>
//   node tools/q.mjs show <id|name>       formatted source + provenance of one declaration
//   node tools/q.mjs callers <id|name>    declarations that use it
//   node tools/q.mjs callees <id|name>    declarations it uses
//   node tools/q.mjs module <path>        declarations of a reconstructed module (analysis/segments)
//   node tools/q.mjs where <chunk.js>     reconstructed modules a chunk contributes to
//   node tools/q.mjs bindings <id|name>   every binding inside a declaration: naming key (@offset),
//                                         minified name, current best name and its source
//   node tools/q.mjs module-bindings <path>  same, for every declaration of a reconstructed module
// <id> is "chunk-xxx.js#minName"; <name> is a reference/semantic name or a minified name.
// When readable names exist (analysis/names/*.jsonl, naming/semantic-*.jsonl —
// the latter win), `show` prints the
// declaration with them applied (top-level, parameter and local names).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import prettier from 'prettier';

const [cmd, ...args] = process.argv.slice(2);
const bindingsCache = new Map();
const arg = args.join(' ');
const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const D = readJsonl('analysis/scan/decls.jsonl');
const byId = new Map(D.map((d) => [`${d.file}#${d.names[0] ?? '@' + d.start}`, d]));
const match = new Map(readJsonl('analysis/match/decl-map.jsonl').map((m) => [m.id, m]));
const seg = new Map(readJsonl('analysis/segments/decl-path.jsonl').map((m) => [m.id, m]));
const names = new Map(); // file -> Map(offset -> {name, source, via})
const nameFiles = [
  ...(fs.existsSync('analysis/names') ? fs.readdirSync('analysis/names').filter((f) => f.endsWith('.jsonl')).map((f) => path.join('analysis/names', f)) : []),
  ...(fs.existsSync('naming') ? fs.readdirSync('naming').filter((f) => /^semantic-.*.jsonl$/.test(f)).map((f) => path.join('naming', f)) : []),
];
for (const nf of nameFiles) {
  const boost = nf.includes('semantic-') ? 10 : 0;
  for (const n0 of readJsonl(nf)) {
    const n = { ...n0, confidence: (n0.confidence ?? 0.5) + boost };
    let m = names.get(n.file);
    if (!m) names.set(n.file, (m = new Map()));
    const off = +n.key.slice(1);
    if (!m.has(off) || (m.get(off).confidence ?? 0) < (n.confidence ?? 0)) m.set(off, n);
  }
}
const modules = fs.existsSync('analysis/scan/modules.json') ? JSON.parse(fs.readFileSync('analysis/scan/modules.json', 'utf8')) : [];
const exportsOf = new Map(modules.map((m) => [m.file, m.exports ?? {}]));
const idOf = (d) => `${d.file}#${d.names[0] ?? '@' + d.start}`;
const label = (d) => {
  const id = idOf(d);
  const m = match.get(id), s = seg.get(id);
  return `${id}${m?.refName ? `  = ${m.refName}` : ''}  [${s?.path ?? m?.refFile ?? '?'}${s ? ' · ' + s.method : ''}]`;
};

function resolve(x) {
  if (byId.has(x)) return [byId.get(x)];
  const hits = [];
  for (const [id, m] of match) if (m.refName === x) hits.push(byId.get(id));
  if (!hits.length) for (const d of D) if (d.names.includes(x)) hits.push(d);
  return hits.filter(Boolean);
}
function usesOf(d) {
  const out = [];
  for (const r of d.refs) {
    let id;
    if (r.startsWith('=')) {
      const n = r.slice(1);
      id = D.find((x) => x.file === d.file && x.names.includes(n));
      if (id) out.push(id);
      continue;
    }
    const [f, name] = r.split('|');
    const local = exportsOf.get(f)?.[name];
    const t = local && D.find((x) => x.file === f && x.names.includes(local));
    if (t) out.push(t);
  }
  return out;
}

async function show(d) {
  const src = fs.readFileSync(path.join('original', d.file), 'utf8');
  let code = src.slice(d.start, d.end);
  const nm = names.get(d.file);
  if (nm) {
    // apply known names to identifiers bound inside this declaration, plus
    // top-level bindings of the same chunk (scope-aware via Babel)
    const { default: traverse } = await import('@babel/traverse');
    const ast = parse(src, { sourceType: 'module' });
    const edits = [];
    (traverse.default ?? traverse)(ast, {
      Scope: { enter() {} },
      Identifier(p) {
        if (p.node.start < d.start || p.node.end > d.end) return;
        const b = p.scope.getBinding(p.node.name);
        if (!b) return;
        const n = nm.get(b.identifier.start);
        if (!n) return;
        if (p.parentPath.isObjectProperty({ shorthand: true }) && p.key === 'value') edits.push([p.node.start, p.node.end, `${p.node.name}: ${n.name}`]);
        else if (p.parentPath.isMemberExpression({ computed: false }) && p.key === 'property') return;
        else edits.push([p.node.start, p.node.end, n.name]);
      },
    });
    edits.sort((a, b) => b[0] - a[0]);
    for (const [s, e, t] of edits) code = code.slice(0, s - d.start) + t + code.slice(e - d.start);
  }
  try { code = await prettier.format(code, { parser: 'babel', printWidth: 110 }); } catch {}
  console.log(`// ${label(d)}\n// ${d.file} [${d.start}, ${d.end}) ${d.bytes} bytes`);
  console.log(code);
}

switch (cmd) {
  case 'find': {
    const t = arg.toLowerCase();
    let n = 0;
    for (const d of D) {
      const m = match.get(idOf(d));
      if ([...d.names, m?.refName ?? '', ...d.strings, ...d.props].some((s) => s.toLowerCase().includes(t))) {
        console.log(label(d));
        if (++n >= 60) { console.log('… (truncated)'); break; }
      }
    }
    break;
  }
  case 'show':
    for (const d of resolve(arg).slice(0, 5)) await show(d);
    break;
  case 'callees':
    for (const d of resolve(arg).slice(0, 3)) { console.log('# ' + label(d)); for (const u of usesOf(d)) console.log('  -> ' + label(u)); }
    break;
  case 'callers':
    for (const d of resolve(arg).slice(0, 3)) {
      console.log('# ' + label(d));
      for (const x of D) if (usesOf(x).includes(d)) console.log('  <- ' + label(x));
    }
    break;
  case 'module': {
    const mods = JSON.parse(fs.readFileSync('analysis/segments/modules.json', 'utf8'));
    const m = mods[arg];
    if (!m) { console.log('no such module; candidates:', Object.keys(mods).filter((k) => k.includes(arg)).slice(0, 20)); break; }
    console.log(JSON.stringify({ kind: m.kind, bytes: m.bytes, chunks: m.chunks, methods: m.methods }));
    for (const id of m.decls) console.log('  ' + label(byId.get(id)));
    break;
  }
  case 'where': {
    const mods = JSON.parse(fs.readFileSync('analysis/segments/modules.json', 'utf8'));
    for (const [p, m] of Object.entries(mods)) if (m.chunks[arg]) console.log(`${m.chunks[arg]}\t${p}`);
    break;
  }
  case 'bindings':
    for (const d of resolve(arg).slice(0, 5)) await printBindings(d);
    break;
  case 'module-bindings': {
    const mods = JSON.parse(fs.readFileSync('analysis/segments/modules.json', 'utf8'));
    const m = mods[arg];
    if (!m) { console.log('no such module'); break; }
    for (const id of m.decls) await printBindings(byId.get(id));
    break;
  }
  default:
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 10).join('\n'));
}

async function printBindings(d) {
  const { bindingsOf } = await import('./rename/lib/rename.mjs');
  const src = fs.readFileSync(path.join('original', d.file), 'utf8');
  bindingsCache.get(d.file) ?? bindingsCache.set(d.file, bindingsOf(d.file, src));
  const nm = names.get(d.file);
  console.log('# ' + label(d));
  for (const b of bindingsCache.get(d.file)) {
    if (b.topDeclStart !== d.start) continue;
    const n = nm?.get(b.declStart);
    const ctx = src.slice(b.declStart, b.declStart + 50).replace(/s+/g, ' ');
    console.log(`  ${d.file} ${b.key}	${b.scope}/${b.kind}	${b.name}	-> ${n ? n.name + ' (' + n.source + (n.via ? '/' + n.via : '') + ')' : '-'}	refs=${b.refs}${b.frozen ? ' FROZEN' : ''}	| ${ctx}`);
  }
}
