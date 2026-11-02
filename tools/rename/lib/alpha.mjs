// α 等价比较（单模块部分 + 跨模块核对）。
// 用法：
//   import { compareModule, crossCheck } from './alpha.mjs'
//   const r = compareModule(file, srcA, srcB)
//     r = { file, ok, diffs:[{kind, msg, a?, b?}], exportPairs:[[eA,eB]], importPairs:[{target, iA, iB, external}],
//           dynTargets:[file…], stats:{idents, bindings, renamedBindings, exportsRenamed} }
//   const cross = crossCheck(results)   // 跨模块：导出映射必须是双射；导入方 specifier 必须与导出方同步；
//                                       // 被动态 import 的模块导出名不得改变。
// 判定：两边各自用 scope.mjs 独立分析；同步遍历 AST，除标识符外所有节点类型、字段、字面量原文
// （extra.raw）、注释必须一致；每个绑定 / 引用标识符解析到的绑定在两边构成一致的双射；解析为全局的名字必须相同；
// 非绑定名（属性名、标签等）必须相同；导出名 / 导入名记录下来做跨模块核对。
// 忽略的差异：位置信息、ObjectProperty.shorthand（{a} 与 {a:b} 只差是否简写）。
import path from 'node:path';
import { parseModule } from './parse.mjs';
import { analyze, OCC, NAME_ROLE } from './scope.mjs';
import { mentionTokens, basenameIndex, resolveMentions } from './mentions.mjs';

const SKIP_KEYS = new Set(['start', 'end', 'loc', 'range', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens', 'errors']);
const MAX_DIFFS = 20;

function lineCol(src, off) {
  let line = 1;
  let last = -1;
  for (let i = src.indexOf('\n'); i !== -1 && i < off; i = src.indexOf('\n', i + 1)) {
    line++;
    last = i;
  }
  return `${line}:${off - last}`;
}

function snippet(src, node) {
  if (!node || typeof node.start !== 'number') return null;
  const s = Math.max(0, node.start - 40);
  return { at: node.start, pos: lineCol(src, node.start), text: src.slice(s, Math.min(src.length, node.end + 40)) };
}

function relTarget(importer, source) {
  if (typeof source !== 'string' || !(source.startsWith('./') || source.startsWith('../'))) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(importer), source));
}

export function compareModule(file, srcA, srcB) {
  const diffs = [];
  const out = { file, ok: true, diffs, exportPairs: [], importPairs: [], dynTargets: [], stats: { idents: 0, bindings: 0, renamedBindings: 0 } };
  let astA, astB;
  try {
    astA = parseModule(srcA);
  } catch (e) {
    diffs.push({ kind: 'parse-a', msg: String(e.message) });
  }
  try {
    astB = parseModule(srcB);
  } catch (e) {
    diffs.push({ kind: 'parse-b', msg: String(e.message) });
  }
  if (!astA || !astB) {
    out.ok = false;
    return out;
  }
  const anA = analyze(astA, srcA);
  const anB = analyze(astB, srcB);
  const mapAB = new Map();
  const mapBA = new Map();
  const add = (kind, msg, a, b) => {
    out.ok = false;
    if (diffs.length < MAX_DIFFS) diffs.push({ kind, msg, a: snippet(srcA, a), b: snippet(srcB, b) });
    else if (diffs.length === MAX_DIFFS) diffs.push({ kind: 'truncated', msg: 'more differences omitted' });
  };

  function cmpIdent(a, b, pathStr) {
    out.stats.idents++;
    const oa = a[OCC];
    const ob = b[OCC];
    if (!oa || !ob) {
      if (oa || ob) return add('role', `${pathStr}: identifier role differs (binding vs non-binding)`, a, b);
      const ra = a[NAME_ROLE];
      const rb = b[NAME_ROLE];
      if (ra || rb) {
        if (!ra || !rb || ra.role !== rb.role) return add('role', `${pathStr}: name role differs`, a, b);
        if (ra.role === 'exportName') out.exportPairs.push([a.name, b.name, a, b]);
        else out.importPairs.push({ source: ra.source, iA: a.name, iB: b.name, a, b });
        return;
      }
      if (a.name !== b.name) add('name', `${pathStr}: non-binding name ${a.name} → ${b.name}`, a, b);
      return;
    }
    if (oa.role !== ob.role) return add('role', `${pathStr}: ${oa.role} vs ${ob.role}`, a, b);
    const ba = oa.binding;
    const bb = ob.binding;
    if (ba === null || bb === null) {
      if (ba !== bb) return add('capture', `${pathStr}: ${a.name} resolves to ${ba ? 'a binding' : 'a global'} in A but ${bb ? 'a binding' : 'a global'} (${b.name}) in B`, a, b);
      if (a.name !== b.name) add('global', `${pathStr}: global ${a.name} → ${b.name}`, a, b);
      return;
    }
    if (ba.implicit !== bb.implicit || ba.kind !== bb.kind) return add('binding-kind', `${pathStr}: binding kind ${ba.kind} vs ${bb.kind}`, a, b);
    const m1 = mapAB.get(ba);
    const m2 = mapBA.get(bb);
    if (m1 === undefined && m2 === undefined) {
      mapAB.set(ba, bb);
      mapBA.set(bb, ba);
      return;
    }
    if (m1 !== bb || m2 !== ba) {
      add('bijection', `${pathStr}: ${a.name}→${b.name} breaks the binding bijection (A binding ${ba.name}@${ba.key} ↦ ${m1 ? m1.name + '@' + m1.key : '-'}; B binding ${bb.name}@${bb.key} ↤ ${m2 ? m2.name + '@' + m2.key : '-'})`, a, b);
    }
  }

  // 迭代式同步遍历（避免深递归）
  const stack = [[astA.program, astB.program, 'program']];
  while (stack.length) {
    const [a, b, p] = stack.pop();
    if (a === b) continue;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
      if (a !== b) add('value', `${p}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`, null, null);
      continue;
    }
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) {
        add('shape', `${p}: array length ${a.length} vs ${Array.isArray(b) ? b.length : 'non-array'}`, null, null);
        continue;
      }
      for (let i = a.length - 1; i >= 0; i--) stack.push([a[i], b[i], p + '[' + i + ']']);
      continue;
    }
    if (a.type !== b.type) {
      add('type', `${p}: ${a.type} vs ${b.type}`, a, b);
      continue;
    }
    if (a.type === 'Identifier') {
      cmpIdent(a, b, p);
      continue;
    }
    // extra：只比较字面量原文与括号
    const ea = a.extra;
    const eb = b.extra;
    if (ea || eb) {
      if ((ea?.raw ?? null) !== (eb?.raw ?? null) || (ea?.parenthesized ?? false) !== (eb?.parenthesized ?? false)) add('extra', `${p}: literal raw / parentheses differ`, a, b);
    }
    const keysA = Object.keys(a).filter((k) => !SKIP_KEYS.has(k) && !(a.type === 'ObjectProperty' && k === 'shorthand')).sort();
    const keysB = Object.keys(b).filter((k) => !SKIP_KEYS.has(k) && !(b.type === 'ObjectProperty' && k === 'shorthand')).sort();
    if (keysA.length !== keysB.length || keysA.some((k, i) => k !== keysB[i])) {
      add('shape', `${p}: field set differs (${keysA.join(',')} vs ${keysB.join(',')})`, a, b);
      continue;
    }
    for (let i = keysA.length - 1; i >= 0; i--) {
      const k = keysA[i];
      if (k === 'type') continue;
      stack.push([a[k], b[k], p + '.' + k]);
    }
  }

  // 注释（含文件头 // @bun @bytecode）逐条一致
  const ca = astA.comments ?? [];
  const cb = astB.comments ?? [];
  if (ca.length !== cb.length) add('comments', `comment count ${ca.length} vs ${cb.length}`, null, null);
  else for (let i = 0; i < ca.length; i++) if (ca[i].type !== cb[i].type || ca[i].value !== cb[i].value) add('comments', `comment #${i} differs`, ca[i], cb[i]);

  // 绑定计数：A 的每个被引用或声明的绑定都必须有对应（声明标识符同步遍历时已经配对）
  const realA = anA.bindings.filter((x) => !x.implicit);
  const realB = anB.bindings.filter((x) => !x.implicit);
  if (realA.length !== realB.length) add('bindings', `binding count ${realA.length} vs ${realB.length}`, null, null);
  for (const x of realA) if (!mapAB.has(x)) add('bindings', `A binding ${x.name}@${x.key} has no counterpart`, x.decls[0], null);
  out.stats.bindings = realA.length;
  for (const [x, y] of mapAB) if (!x.implicit && x.name !== y.name) out.stats.renamedBindings++;

  // 直接 eval：链上每个作用域可见的名字集合必须一致（eval 代码按名字查找）
  if (anA.directEvals.length !== anB.directEvals.length) add('eval', `direct eval count ${anA.directEvals.length} vs ${anB.directEvals.length}`, null, null);
  if (anA.directEvals.length) {
    for (const sA of anA.scopes) {
      if (!sA.evalTainted) continue;
      for (const [n, bA] of sA.names) {
        const bB = mapAB.get(bA);
        if (bB && bB.name !== n) add('eval', `binding ${n} visible to a direct eval was renamed to ${bB.name}`, bA.decls[0], bB.decls[0]);
      }
    }
    for (const sB of anB.scopes) {
      if (!sB.evalTainted) continue;
      for (const [n, bB] of sB.names) {
        const bA = mapBA.get(bB);
        if (bA && bA.name !== n) add('eval', `binding ${n} visible to a direct eval in B was renamed`, bA.decls[0], bB.decls[0]);
      }
    }
  }

  // 动态 import 目标
  for (const d of anA.dynImports) {
    const t = relTarget(file, d.source);
    if (t) out.dynTargets.push(t);
  }
  out.mentions = mentionTokens(srcA, anA.staticSources);
  out.staticTargets = [...new Set(anA.importSpecs.map((s) => relTarget(file, s.source)).filter(Boolean))];
  // 命名空间导入与重导出的来源：导出名同样必须不变
  for (const s of anA.importSpecs) if (s.imported === '*') {
    const t = relTarget(file, s.source);
    if (t) out.dynTargets.push(t);
  }
  for (const u of anA.unsupported) {
    const t = u.source ? relTarget(file, u.source) : null;
    if (t) out.dynTargets.push(t);
    out.dynTargets.push(file);
  }
  // 导出名一致性（模块内双射）
  const eAB = new Map();
  const eBA = new Map();
  for (const [ea, eb, na, nb] of out.exportPairs) {
    if ((eAB.has(ea) && eAB.get(ea) !== eb) || (eBA.has(eb) && eBA.get(eb) !== ea)) add('export', `export ${ea}→${eb} is not a bijection`, na, nb);
    eAB.set(ea, eb);
    eBA.set(eb, ea);
  }
  out.exportMap = [...eAB];
  out.stats.exportsRenamed = out.exportMap.filter(([x, y]) => x !== y).length;
  out.importPairs = out.importPairs.map(({ source, iA, iB, a, b }) => ({ target: relTarget(file, source), source, iA, iB, a: a.start, b: b.start }));
  out.exportPairs = undefined;
  return out;
}

// 跨模块核对：results 是 compareModule 的结果数组（同一批模块）。
export function crossCheck(results) {
  const diffs = [];
  const exportMaps = new Map();
  const known = new Set(results.map((r) => r.file));
  for (const r of results) if (r.exportMap) exportMaps.set(r.file, new Map(r.exportMap));
  const dyn = new Set();
  for (const r of results) for (const t of r.dynTargets ?? []) dyn.add(t);
  const bidx = basenameIndex(known);
  const imported = new Set();
  for (const r of results) for (const t of r.staticTargets ?? []) imported.add(t);
  for (const f of known) if (!imported.has(f)) dyn.add(f);
  for (const r of results) for (const t of resolveMentions(r.mentions ?? [], bidx)) dyn.add(t);
  for (const r of results) {
    for (const ip of r.importPairs ?? []) {
      if (ip.target !== null && known.has(ip.target) && !exportMaps.has(ip.target)) continue; // 导出方解析失败，模块差异里已报告
      if (ip.target === null || !exportMaps.has(ip.target)) {
        // 外部模块（node 内建、npm 包）或资源：导入名必须不变
        if (ip.iA !== ip.iB) diffs.push({ file: r.file, kind: 'import-external', msg: `import of "${ip.source}": ${ip.iA} → ${ip.iB} (external module, name must not change)`, a: ip.a, b: ip.b });
        continue;
      }
      const em = exportMaps.get(ip.target);
      if (!em.has(ip.iA)) {
        diffs.push({ file: r.file, kind: 'import-missing', msg: `${ip.target} does not export ${ip.iA}`, a: ip.a, b: ip.b });
        continue;
      }
      if (em.get(ip.iA) !== ip.iB) diffs.push({ file: r.file, kind: 'import-sync', msg: `import {${ip.iA}} from ${ip.target}: exporter renamed it to ${em.get(ip.iA)} but importer uses ${ip.iB}`, a: ip.a, b: ip.b });
    }
  }
  for (const t of dyn) {
    const em = exportMaps.get(t);
    if (!em) continue;
    for (const [x, y] of em) if (x !== y) diffs.push({ file: t, kind: 'frozen-export', msg: `export ${x} renamed to ${y} but the module's exports are frozen (import(), import * as, re-export, file name mentioned in code, or never statically imported)` });
  }
  return diffs;
}
