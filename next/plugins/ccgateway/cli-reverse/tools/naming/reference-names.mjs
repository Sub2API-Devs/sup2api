// Derives names for 2.1.316 bindings from the matched reference declarations.
//   node tools/naming/reference-names.mjs [analysis] [out=analysis/names/reference.jsonl]
// For every matched pair (analysis/match/decl-map.jsonl with a `ref`):
//  - top-level: the 316 binding gets the reference declaration's name;
//  - parameters: positional, when both sides are functions with plain
//    identifier parameters (destructured ones are skipped);
//  - locals: the binding declarations inside both bodies are turned into
//    shape signatures (declaration kind + what initialises them) and aligned
//    with an LCS; equal, non-trivial signatures pass their reference name on.
// Output lines: {file, key:"@<offset of the binding identifier>"|"top:<name>",
//   min, name, source:"reference", confidence, via:"top|param|local", ref}
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const A = process.argv[2] ?? 'analysis';
const outFile = process.argv[3] ?? path.join(A, 'names/reference.jsonl');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const REF_ROOT = 'references/claude-code-analysis/src';
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const matches = [...readJsonl(path.join(A, 'match/decl-map.jsonl')).filter((m) => m.ref), ...(fs.existsSync(path.join(A, 'match/local-map.jsonl')) ? readJsonl(path.join(A, 'match/local-map.jsonl')) : [])];
const decls = new Map(readJsonl(path.join(A, 'scan/decls.jsonl')).map((d) => [`${d.file}#${d.names[0] ?? '@' + d.start}`, d]));
const refDecls = new Map(readJsonl(path.join(A, 'reference/decls.jsonl')).map((r) => [`${r.file}#${r.names[0] ?? '@' + r.line}`, r]));

const astCache = new Map();
function ast316(file) {
  if (!astCache.has(file)) {
    if (astCache.size > 40) astCache.delete(astCache.keys().next().value);
    astCache.set(file, parse(fs.readFileSync(path.join('original', file), 'utf8'), { sourceType: 'module' }));
  }
  return astCache.get(file);
}
const refCache = new Map();
function astRef(file) {
  if (!refCache.has(file)) {
    if (refCache.size > 200) refCache.delete(refCache.keys().next().value);
    refCache.set(file, parse(fs.readFileSync(path.join(REF_ROOT, file), 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx', 'decorators-legacy', 'importAttributes'], errorRecovery: true }));
  }
  return refCache.get(file);
}
const topNode316 = (file, start) => ast316(file).program.body.find((n) => n.start === start);
function topNodeRef(file, line) {
  return astRef(file).program.body.find((n) => n.loc.start.line === line);
}
const unwrap = (n) => (n?.type === 'ExportNamedDeclaration' || n?.type === 'ExportDefaultDeclaration' ? n.declaration : n);

// The function a top-level declaration defines (function decl, or const x = () => {} / function(){}).
function fnOf(n) {
  n = unwrap(n);
  if (!n) return null;
  if (/Function/.test(n.type)) return n;
  if (n.type === 'VariableDeclaration' && n.declarations.length === 1) {
    let init = n.declarations[0].init;
    while (init && (init.type === 'TSAsExpression' || init.type === 'TSSatisfiesExpression' || init.type === 'ParenthesizedExpression')) init = init.expression;
    // memo(function X(){}) / forwardRef(...) / useCallback-like wrappers: take the first function argument
    if (init?.type === 'CallExpression') init = init.arguments.find((a) => /Function/.test(a.type)) ?? init;
    if (init && /Function/.test(init.type)) return init;
  }
  return null;
}
function topBindingId(n) {
  n = unwrap(n);
  if (!n) return null;
  if (n.type === 'VariableDeclaration') return n.declarations.length === 1 && n.declarations[0].id.type === 'Identifier' ? n.declarations[0].id : null;
  return n.id ?? null;
}

const SKIP = new Set(['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'typeAnnotation', 'returnType', 'typeParameters', 'typeArguments']);
// Ordered binding declarations inside a function body, nested functions included,
// each with a signature describing how it is introduced/initialised.
function bindingSeq(fn) {
  const seq = [];
  const sigOf = (init) => {
    if (!init) return 'none';
    while (/^TS/.test(init.type) && init.expression) init = init.expression;
    switch (init.type) {
      case 'CallExpression':
      case 'NewExpression': {
        const c = init.callee;
        const callee = c.type === 'MemberExpression' && !c.computed ? '.' + c.property.name : c.type === 'Identifier' ? 'id' : c.type;
        const lit = init.arguments.find((a) => a.type === 'StringLiteral')?.value ?? '';
        return `${init.type[0]}${callee}(${init.arguments.length}${lit ? ',' + lit : ''})`;
      }
      case 'AwaitExpression':
        return 'await:' + sigOf(init.argument);
      case 'MemberExpression':
        return init.computed ? 'mem[]' : 'mem.' + init.property.name;
      case 'StringLiteral':
        return 'str:' + init.value;
      case 'NumericLiteral':
        return 'num:' + init.value;
      case 'BooleanLiteral':
        return 'bool:' + init.value;
      case 'ObjectExpression':
        return 'obj:' + init.properties.map((p) => p.key?.name ?? p.key?.value ?? '…').join(',');
      case 'ArrayExpression':
        return 'arr' + init.elements.length;
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return 'fn' + init.params.length;
      default:
        return init.type;
    }
  };
  (function visit(n) {
    if (!n || typeof n.type !== 'string') return;
    if (/^TS(Interface|TypeAlias)/.test(n.type)) return;
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') seq.push({ id: n.id, sig: 'v:' + sigOf(n.init) });
    else if (n.type === 'VariableDeclarator' && n.id.type === 'ObjectPattern') {
      for (const p of n.id.properties) if (p.type === 'ObjectProperty' && p.value.type === 'Identifier') seq.push({ id: p.value, sig: 'destr:' + (p.key.name ?? p.key.value) + ':' + sigOf(n.init) });
      else if (p.type === 'ObjectProperty' && p.value.type === 'AssignmentPattern' && p.value.left.type === 'Identifier') seq.push({ id: p.value.left, sig: 'destr:' + (p.key.name ?? p.key.value) + ':' + sigOf(n.init) });
    } else if (n.type === 'CatchClause' && n.param?.type === 'Identifier') seq.push({ id: n.param, sig: 'catch' });
    else if (n.type === 'FunctionDeclaration' && n.id) seq.push({ id: n.id, sig: 'fdecl' + n.params.length });
    else if ((n.type === 'ForOfStatement' || n.type === 'ForInStatement') && n.left.type === 'VariableDeclaration' && n.left.declarations[0].id.type === 'Identifier') {
      seq.push({ id: n.left.declarations[0].id, sig: n.type + ':' + (n.right.type === 'MemberExpression' && !n.right.computed ? n.right.property.name : n.right.type) });
      visit(n.right);
      visit(n.body);
      return;
    }
    if (/Function/.test(n.type) && n !== fn) {
      n.params.forEach((p, i) => { if (p.type === 'Identifier') seq.push({ id: p, sig: `param${i}/${n.params.length}` }); });
    }
    for (const k in n) {
      if (SKIP.has(k)) continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v.type === 'string') visit(v);
    }
  })(fn.body);
  return seq;
}
function lcs(a, b) {
  const n = a.length, m = b.length;
  if (n * m > 4e6) return [];
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i].sig === b[j].sig ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i].sig === b[j].sig) { pairs.push([a[i], b[j]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return pairs;
}
const TRIVIAL = /^(v:(none|Identifier|num:0|num:1|bool:\w+|arr0|obj:|LogicalExpression|BinaryExpression|ConditionalExpression|mem\[\]))$/;
const sigCount = (seq) => { const c = new Map(); for (const x of seq) c.set(x.sig, (c.get(x.sig) ?? 0) + 1); return c; };

const ws = fs.createWriteStream(outFile);
const stats = { pairs: 0, top: 0, params: 0, locals: 0, skippedParse: 0 };
matches.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
for (const m of matches) {
  const d = decls.get(m.id), r = refDecls.get(m.ref);
  if (!d || !r) continue;
  stats.pairs++;
  const conf = m.method === 'fingerprint' ? Math.min(0.99, 0.5 + m.score / 2) : m.method === 'fingerprint-shared' ? 0.6 : m.method === 'callgraph-witnessed' ? 0.7 : m.method === 'file-local' ? 0.45 + Math.min(0.3, m.score / 3) : m.method === 'file-last-pair' ? 0.4 : 0.55;
  let n316, nRef;
  try { n316 = topNode316(d.file, d.start); nRef = topNodeRef(r.file, r.line); } catch { stats.skippedParse++; continue; }
  if (!n316 || !nRef) { stats.skippedParse++; continue; }
  const id316 = topBindingId(n316), idRef = topBindingId(nRef);
  if (id316 && idRef && !/^_temp\d*$/.test(idRef.name)) {
    ws.write(JSON.stringify({ file: d.file, key: '@' + id316.start, min: id316.name, name: idRef.name, source: 'reference', confidence: +conf.toFixed(2), via: 'top', ref: m.ref }) + '\n');
    stats.top++;
  }
  const f316 = fnOf(n316), fRef = fnOf(nRef);
  if (!f316 || !fRef) continue;
  if (f316.params.length === fRef.params.length) {
    f316.params.forEach((p, i) => {
      let q = fRef.params[i];
      if (q.type === 'TSParameterProperty') q = q.parameter;
      const pid = p.type === 'Identifier' ? p : p.type === 'AssignmentPattern' && p.left.type === 'Identifier' ? p.left : null;
      const qid = q.type === 'Identifier' ? q : q.type === 'AssignmentPattern' && q.left.type === 'Identifier' ? q.left : null;
      if (pid && qid && qid.name !== '_') {
        ws.write(JSON.stringify({ file: d.file, key: '@' + pid.start, min: pid.name, name: qid.name, source: 'reference', confidence: +(conf * 0.9).toFixed(2), via: 'param', ref: m.ref }) + '\n');
        stats.params++;
      }
    });
  }
  const a = bindingSeq(f316), b = bindingSeq(fRef);
  const ca = sigCount(a), cb = sigCount(b);
  for (const [x, y] of lcs(a, b)) {
    if (TRIVIAL.test(x.sig) && !(ca.get(x.sig) === 1 && cb.get(y.sig) === 1)) continue;
    if (/^_|^\$$/.test(y.id.name) || y.id.name.length < 2) continue;
    ws.write(JSON.stringify({ file: d.file, key: '@' + x.id.start, min: x.id.name, name: y.id.name, source: 'reference', confidence: +(conf * 0.8).toFixed(2), via: 'local', ref: m.ref }) + '\n');
    stats.locals++;
  }
}
ws.end();
console.log(stats);
