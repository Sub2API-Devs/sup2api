// ref-align 的两侧源码装载与标识符分类。
//   load316(file)        → { file, src, ast, an, top: Map(start → 顶层语句), importOf: Map(Binding → {from, imported}) }
//                           作用域分析用 tools/rename/lib/scope.mjs（与改名引擎同一套，绑定键一致）
//   moduleNames(A)       → 316 模块级绑定的旧版名字表（来自已匹配声明的 refName）：
//                           { top: Map(file → Map(压缩名 → 旧版名)), exp: Map("file|导出名" → 旧版名) }
//   idTok316For(S, MN)   → 316 标识符 → token {t:'L'|'M'|'M:<旧版名>'|'G:<名>', b}
//   loadRef(file)        → { ast, bind: WeakMap(标识符节点 → Babel Binding), byLine }，@babel/traverse 作用域分析
//   idTokRef(R)          → 旧版标识符 → token；模块级一律 'M:<名>'
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';
import { parseModule } from '../../rename/lib/parse.mjs';
import { analyze, OCC } from '../../rename/lib/scope.mjs';

const traverse = traverseMod.default ?? traverseMod;
export const REF_ROOT = 'references/claude-code-analysis/src';

export function load316(file) {
  const src = fs.readFileSync(path.join('original', file), 'utf8');
  const ast = parseModule(src);
  const an = analyze(ast, src);
  const top = new Map(ast.program.body.map((n) => [n.start, n]));
  const importOf = new Map();
  for (const s of an.importSpecs) {
    const bd = s.localOcc?.binding;
    if (!bd || typeof s.source !== 'string' || !s.source.startsWith('.')) continue;
    importOf.set(bd, { from: path.posix.normalize(path.posix.join(path.posix.dirname(file), s.source)), imported: s.imported });
  }
  return { file, src, ast, an, top, importOf };
}

export function moduleNames(matches, decls) {
  const top = new Map(), exp = new Map();
  for (const m of matches) {
    if (!m.ref || !m.refName) continue;
    const d = decls.get(m.id);
    if (!d || d.names.length !== 1) continue;
    let t = top.get(d.file);
    if (!t) top.set(d.file, (t = new Map()));
    t.set(d.names[0], m.refName);
    for (const e of d.exported ?? []) exp.set(d.file + '|' + e, m.refName);
  }
  return { top, exp };
}

export function idTok316For(S, MN) {
  const topNames = MN.top.get(S.file);
  return (node) => {
    const occ = node[OCC];
    const bd = occ?.binding;
    if (!bd || bd.implicit) return { t: 'G:' + node.name, b: null };
    if (bd.scope.kind === 'module') {
      let nm;
      if (bd.kind === 'import') {
        const im = S.importOf.get(bd);
        if (im) nm = MN.exp.get(im.from + '|' + im.imported);
      } else nm = topNames?.get(bd.name);
      return { t: nm ? 'M:' + nm : 'M', b: null };
    }
    return { t: 'L', b: bd, d: occ.role === 'decl' };
  };
}

const refCache = new Map();
export function loadRef(file) {
  let r = refCache.get(file);
  if (r) return r;
  if (refCache.size > 120) {
    refCache.delete(refCache.keys().next().value);
    traverse.cache?.clear?.();
  }
  const src = fs.readFileSync(path.join(REF_ROOT, file), 'utf8');
  const ast = parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx', 'decorators-legacy', 'importAttributes'], errorRecovery: true });
  const bind = new WeakMap();
  const visit = (p) => {
    const bd = p.scope.getBinding(p.node.name);
    if (bd) bind.set(p.node, bd);
  };
  traverse(ast, { Identifier: visit, JSXIdentifier: visit });
  const byLine = new Map();
  for (const n of ast.program.body) if (!byLine.has(n.loc.start.line)) byLine.set(n.loc.start.line, n);
  r = { src, ast, bind, byLine };
  refCache.set(file, r);
  return r;
}

export function idTokRef(R) {
  return (node) => {
    const bd = R.bind.get(node);
    if (!bd) return { t: 'G:' + node.name, b: null };
    if (bd.kind === 'module' || bd.scope.block.type === 'Program') return { t: 'M:' + bd.identifier.name, b: null };
    return { t: 'L', b: bd, d: bd.identifier === node };
  };
}
export const refName = (bd) => bd.identifier.name;
