// Merges every naming source into one decision per binding and resolves
// top-level name conflicts, then writes the final naming table consumed by
// the rename engine (tools/rename) and the readable emitter (tools/emit).
//   node tools/naming/resolve.mjs [analysis] [out=naming/final]
//
// Sources (all in the same JSONL line format
//   {file, key:"@<binding identifier offset>", name, source, confidence, via, note?}):
//   analysis/names/*.jsonl         generated (reference.jsonl, vendor.jsonl, auto.jsonl)
//   naming/semantic-*.jsonl        hand/agent-written, highest priority
// Priority: facade (original export names) > semantic > vendor > reference > auto; ties by confidence.
//
// Top-level rules:
//   - a top-level name must be unique inside its chunk (the runnable tree) and
//     inside the reconstructed module it lands in (the readable tree);
//   - an import binding takes the exporter's final name (suffixed on conflict);
//   - minified names that are kept count as taken.
// Output: <out>/top.json  {chunk: {"@off": {name, min, source, confidence, declId, kind}}}
//         <out>/locals.jsonl  local renames that passed (conflicts inside
//                             function scopes are the rename engine's job)
//         <out>/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const A = process.argv[2] ?? 'analysis';
const OUT = process.argv[3] ?? 'naming/final';
fs.mkdirSync(OUT, { recursive: true });
const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const PRIORITY = { facade: 5, semantic: 4, vendor: 3, reference: 2, auto: 1 };
const RESERVED = new Set(['arguments', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'eval', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'undefined', 'NaN', 'Infinity',
  // globals a top-level binding must never shadow
  'process', 'Buffer', 'require', 'module', 'exports', 'globalThis', 'console', 'Promise', 'Symbol', 'Error', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Map', 'Set', 'WeakMap', 'WeakSet', 'JSON', 'Math', 'Date', 'RegExp', 'URL', 'URLSearchParams', 'Bun', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'AbortController', 'AbortSignal', 'TextEncoder', 'TextDecoder', 'Response', 'Request', 'Headers', 'WebSocket', 'ReadableStream', 'WritableStream', 'TransformStream', 'Uint8Array', 'ArrayBuffer', 'DataView', 'Reflect', 'Proxy', 'BigInt', 'Intl', 'TypeError', 'RangeError', 'SyntaxError', 'structuredClone', 'performance', 'crypto', 'navigator', 'window', 'document', 'self', 'global', 'atob', 'btoa', 'Function', 'Event', 'EventTarget', 'Blob', 'File', 'FormData', 'setImmediate', 'clearImmediate', '__dirname', '__filename', 'Iterator', 'AggregateError', 'WeakRef', 'FinalizationRegistry', 'Atomics', 'SharedArrayBuffer', 'Float32Array', 'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Uint16Array', 'Uint32Array', 'Uint8ClampedArray', 'BigInt64Array', 'BigUint64Array', 'escape', 'unescape', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'isNaN', 'isFinite', 'parseInt', 'parseFloat']);
const validName = (n) => /^[A-Za-z_$][\w$]*$/.test(n) && !RESERVED.has(n);

// ---- candidates ----
const cands = new Map(); // file -> Map(off -> best candidate)
const locals = [];
const sources = [...fs.readdirSync(path.join(A, 'names')).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(A, 'names', f)),
  ...(fs.existsSync('naming') ? fs.readdirSync('naming').filter((f) => /^semantic-.*\.jsonl$/.test(f)).map((f) => path.join('naming', f)) : [])];
for (const src of sources) {
  for (const c of readJsonl(src)) {
    if (!validName(c.name)) continue;
    let m = cands.get(c.file);
    if (!m) cands.set(c.file, (m = new Map()));
    const off = +c.key.slice(1);
    const cur = m.get(off);
    const rank = (x) => (PRIORITY[x.source] ?? 0) * 10 + (x.confidence ?? 0.5);
    if (!cur || rank(c) > rank(cur)) m.set(off, c);
  }
}

// ---- top-level bindings per chunk ----
const decls = readJsonl(path.join(A, 'scan/decls.jsonl'));
const declAt = new Map(); // file -> sorted [start,end,id]
for (const d of decls) {
  let a = declAt.get(d.file);
  if (!a) declAt.set(d.file, (a = []));
  a.push([d.start, d.end, `${d.file}#${d.names[0] ?? '@' + d.start}`]);
}
const pathOf = new Map(readJsonl(path.join(A, 'segments/decl-path.jsonl')).map((x) => [x.id, x.path]));
const files = fs.readdirSync('original').filter((f) => /\.(js|mjs)$/.test(f) && !/\.min\.js$/.test(f) && f !== 'hljsBundle.generated.min.js');
const top = new Map(); // file -> Map(off -> binding)
const exportsOf = new Map(); // file -> Map(exportName -> local off)
const importsOf = new Map(); // file -> [{off, local, from, imported}]
for (const file of files) {
  const src = fs.readFileSync(path.join('original', file), 'utf8');
  let ast;
  try { ast = parse(src, { sourceType: 'module' }); } catch { continue; }
  const bindings = new Map();
  const ex = new Map();
  const im = [];
  const byName = new Map();
  const ranges = (declAt.get(file) ?? []).sort((a, b) => a[0] - b[0]);
  const declOf = (off) => { for (const [s, e, id] of ranges) if (off >= s && off < e) return id; return null; };
  const addId = (id) => {
    const declId = declOf(id.start);
    const b = { off: id.start, min: id.name, declId, kind: 'decl' };
    bindings.set(id.start, b);
    byName.set(id.name, b);
  };
  const pat = (p) => {
    if (!p) return;
    if (p.type === 'Identifier') addId(p);
    else if (p.type === 'ObjectPattern') p.properties.forEach((x) => pat(x.value ?? x.argument));
    else if (p.type === 'ArrayPattern') p.elements.forEach(pat);
    else if (p.type === 'AssignmentPattern') pat(p.left);
    else if (p.type === 'RestElement') pat(p.argument);
  };
  for (const n0 of ast.program.body) {
    if (n0.type === 'ImportDeclaration') {
      for (const s of n0.specifiers) {
        const b = { off: s.local.start, min: s.local.name, kind: 'import', from: n0.source.value.replace(/^\.\//, ''), imported: s.type === 'ImportSpecifier' ? (s.imported.name ?? s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*' };
        bindings.set(b.off, b);
        byName.set(b.min, b);
        im.push(b);
      }
      continue;
    }
    if (n0.type === 'ExportNamedDeclaration' && !n0.declaration) {
      for (const s of n0.specifiers) ex.set(s.exported.name ?? s.exported.value, s.local.name);
      continue;
    }
    const n = n0.type === 'ExportNamedDeclaration' || n0.type === 'ExportDefaultDeclaration' ? n0.declaration : n0;
    if (n?.type === 'VariableDeclaration') n.declarations.forEach((d) => pat(d.id));
    else if ((n?.type === 'FunctionDeclaration' || n?.type === 'ClassDeclaration') && n.id) addId(n.id);
  }
  top.set(file, bindings);
  exportsOf.set(file, new Map([...ex].map(([e, l]) => [e, byName.get(l)?.off])));
  importsOf.set(file, im);
}

// ---- choose top-level names ----
const final = new Map(); // file -> Map(off -> {name, ...})
const taken = new Map(); // scope key -> Set(name); scopes: "chunk:<file>" and "mod:<path>"
const take = (k, n) => { let s = taken.get(k); if (!s) taken.set(k, (s = new Set())); s.add(n); };
const isTaken = (k, n) => taken.get(k)?.has(n);
const scopesOf = (file, b) => [`chunk:${file}`, ...(b.kind === 'decl' && b.declId && pathOf.get(b.declId) ? [`mod:${pathOf.get(b.declId)}`] : [])];
const stats = { named: 0, suffixed: 0, kept: 0, imports: 0 };

// pass 1: decided names, most trusted first; kept minified names reserved after
const decided = [];
for (const [file, bindings] of top) for (const b of bindings.values()) if (b.kind === 'decl') {
  const c = cands.get(file)?.get(b.off);
  decided.push({ file, b, c });
}
decided.sort((x, y) => ((PRIORITY[y.c?.source] ?? 0) - (PRIORITY[x.c?.source] ?? 0)) || ((y.c?.confidence ?? 0) - (x.c?.confidence ?? 0)));
// reserve kept minified names first so new names never collide with them
// A kept minified name can still clash inside a reconstructed module that
// gathers declarations from several chunks; the later one gets a chunk tag.
for (const { file, b, c } of decided) {
  if (c) continue;
  const [chunkScope, modScope] = scopesOf(file, b);
  take(chunkScope, b.min);
  if (!modScope) continue;
  if (isTaken(modScope, b.min)) {
    const tag = file.replace(/^chunk-|\.m?js$/g, '').slice(0, 4);
    let name = `${b.min}_${tag}`, i = 2;
    while (isTaken(modScope, name) || isTaken(chunkScope, name)) name = `${b.min}_${tag}${i++}`;
    b.renameTo = name;
    take(chunkScope, name);
    take(modScope, name);
    stats.moduleClashes = (stats.moduleClashes ?? 0) + 1;
  } else take(modScope, b.min);
}
for (const { file, b, c } of decided) {
  let rec;
  if (!c) { rec = b.renameTo ? { name: b.renameTo, min: b.min, source: 'auto', confidence: 0.1, declId: b.declId, kind: 'decl', via: 'module-clash' } : { name: b.min, min: b.min, source: 'minified', confidence: 0, declId: b.declId, kind: 'decl' }; stats.kept++; }
  else {
    const scopes = scopesOf(file, b);
    let name = c.name, i = 2;
    while (scopes.some((k) => isTaken(k, name))) name = `${c.name}_${i++}`;
    if (name !== c.name) stats.suffixed++;
    for (const k of scopes) take(k, name);
    rec = { name, min: b.min, source: c.source, confidence: c.confidence, declId: b.declId, kind: 'decl', ...(c.via ? { via: c.via } : {}) };
    stats.named++;
  }
  let m = final.get(file);
  if (!m) final.set(file, (m = new Map()));
  m.set(b.off, rec);
}
// pass 2: imports follow the exporter
for (const [file, im] of importsOf) {
  const m = final.get(file) ?? new Map();
  final.set(file, m);
  for (const b of im) {
    let want = b.min;
    const exOff = exportsOf.get(b.from)?.get(b.imported);
    const target = exOff !== undefined ? final.get(b.from)?.get(exOff) : null;
    if (target) want = target.name;
    else if (cands.get(file)?.get(b.off)) want = cands.get(file).get(b.off).name;
    let name = want, i = 2;
    while (isTaken(`chunk:${file}`, name)) name = `${want}_${i++}`;
    take(`chunk:${file}`, name);
    m.set(b.off, { name, min: b.min, source: target ? 'import' : want !== b.min ? 'auto' : 'minified', kind: 'import', from: b.from, imported: b.imported });
    stats.imports++;
  }
}
// locals: everything not top-level
for (const [file, m] of cands) {
  const t = top.get(file);
  for (const [off, c] of m) if (!t?.has(off)) locals.push({ file, key: '@' + off, min: c.min, name: c.name, source: c.source, confidence: c.confidence, via: c.via });
}

const out = {};
for (const [file, m] of final) out[file] = Object.fromEntries([...m].map(([off, r]) => ['@' + off, r]));
fs.writeFileSync(path.join(OUT, 'top.json'), JSON.stringify(out));
fs.writeFileSync(path.join(OUT, 'locals.jsonl'), locals.map((l) => JSON.stringify(l)).join('\n') + '\n');
const summary = { ...stats, locals: locals.length, sources: sources.map((s) => s.replace(/\\/g, '/')) };
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(summary);
