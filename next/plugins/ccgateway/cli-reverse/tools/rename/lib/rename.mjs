// 单模块改名：作用域安全的改名规划 + 基于源码偏移的文本替换（未改名部分逐字节保真）。
// 用法（库，供 apply.mjs 与 tools/emit 复用）：
//   import { renameModule, bindingsOf, makeOffsetMap } from './rename.mjs'
//   const r = renameModule(file, source, entry, globalPlan, opts)
//     entry       该文件的命名表（naming.mjs 的模块条目：{top: Map, locals: Map, exports: Map}，或普通对象形式，见 toEntry）
//     globalPlan  global.mjs buildGlobalPlan 的结果（不跨模块时可传 null）
//     opts        { autoImportNames: false }（true = 别名导入没有命名条目时用导入名作本地名）
//   r = { code, edits:[{start,end,text}], offsetMap(o)→o', renamed:[{key,from,to,source,origin}],
//         conflicts:[{key,from,wanted,got,reason}], rejected:[{key,wanted,reason}], warnings:[], stats }
//   offsetMap：原偏移 → 新偏移。区间端点（声明的 start/end）都能精确映射；落在被替换标识符内部的偏移映射到替换文本末尾。
//
//   bindingsOf(file, source) → [{ key:'@偏移', name, scope:'top'|'local', kind, declStart, topDeclStart, refs, frozen }]
//
// 冲突规则（新名字 X 赋给作用域 S 里的绑定 b）：
//   1. S 里已有别的绑定（按当前最终名）叫 X；
//   2. b 的某个引用到 S 之间的内层作用域里有绑定叫 X（b 的引用会被内层遮蔽）；
//   3. S 子树里有名为 X 的引用解析到 S 之外（外层绑定或全局变量，例如 process、require），改名后会被 b 捕获。
//   任何一条成立就试 X_2、X_3……，记录到 conflicts。冻结的绑定（直接 eval 链、Annex B catch var、export 声明、
//   隐式 arguments）不改名，请求记录到 rejected。
import path from 'node:path';
import { parseModule } from './parse.mjs';
import { analyze } from './scope.mjs';
import { isValidBindingName, suffixed } from './names.mjs';
import { moduleEntryFromJSON, namingFromObjects, emptyModule } from './naming.mjs';

const MAX_SUFFIX = 1000000;

// 接受 naming.mjs 的 Map 结构、worker 传来的 JSON 结构、或命名表文件里的原始对象。
export function toEntry(entry) {
  if (!entry) return emptyModule();
  if (entry.top instanceof Map) return entry;
  if (Array.isArray(entry.top)) return moduleEntryFromJSON(entry);
  return namingFromObjects([{ 'inline.js': entry }]).modules.get('inline.js') ?? emptyModule();
}

function relTarget(importer, source) {
  if (!(source.startsWith('./') || source.startsWith('../'))) return null;
  return path.posix.normalize(path.posix.join(path.posix.dirname(importer), source));
}

// 与 S 构成"同一名字空间"的作用域：参数 ↔ 函数体（function f(x){let x} 是语法错误，var x 会与参数合并），
// catch 参数 ↔ catch 块（catch(e){let e} 是语法错误）。
function partnerOf(S) {
  if (S.kind === 'params') return S.children.find((c) => c.kind === 'body') ?? null;
  if (S.kind === 'body' && S.parent?.kind === 'params') return S.parent;
  if (S.kind === 'catch') return S.children.find((c) => c.kind === 'block' && c.node === S.node.body) ?? null;
  if (S.kind === 'block' && S.parent?.kind === 'catch' && S.parent.node.body === S.node) return S.parent;
  return null;
}

class Planner {
  constructor(an, source) {
    this.an = an;
    this.source = source;
    this.final = new Map(); // binding → 新名
    this.finalNames = new Map(); // scope → Map<当前名, binding>（按需从 scope.names 复制）
    this.through = null; // scope → Map<名字, 计数>：子树里以该名字引用、且解析到 scope 之外（或全局）的出现数
    this.hint = new Map(); // "作用域#基名" → 上次用到的后缀序号
    this.conflicts = [];
    this.rejected = [];
    this.renamed = [];
  }
  bump(s, name, d) {
    let m = this.through.get(s);
    if (!m) this.through.set(s, (m = new Map()));
    const v = (m.get(name) ?? 0) + d;
    if (v) m.set(name, v);
    else m.delete(name);
  }
  // 引用（及提升的 var 声明出现）从语法作用域走到绑定作用域（不含）或模块作用域之外。
  buildThrough() {
    this.through = new Map();
    const walk = (o) => {
      const end = o.binding ? o.binding.scope : null;
      for (let s = o.scope; s !== end; s = s.parent) this.bump(s, o.node.name, 1);
    };
    for (const o of this.an.refOccs) walk(o);
    for (const b of this.an.bindings) for (const o of b.passOccs) walk(o);
  }
  namesOf(s) {
    let m = this.finalNames.get(s);
    if (!m) this.finalNames.set(s, (m = new Map(s.names)));
    return m;
  }
  cur(b) {
    return this.final.get(b) ?? b.name;
  }
  // 返回冲突原因或 null
  check(b, X) {
    const S = b.scope;
    const other = this.namesOf(S).get(X);
    if (other && other !== b) return 'same-scope';
    const P = partnerOf(S);
    if (P && this.namesOf(P).has(X)) return 'param-body-or-catch-clash';
    const seen = new Set();
    for (const list of [b.refs, b.passOccs]) {
      for (const r of list) {
        for (let s = r.scope; s !== S; s = s.parent) {
          if (seen.has(s)) break;
          seen.add(s);
          if (this.namesOf(s).has(X)) return 'shadowed-by-inner';
        }
      }
    }
    if (this.through.get(S)?.get(X)) return 'captures-outer-or-global';
    // 直接 eval 按名字查找：链上的绑定不能改成 eval 代码会查的名字（scope.mjs evalNames）
    if (S.evalTainted && (S.evalNames === null || S.evalNames?.has(X))) return 'visible-to-direct-eval';
    // `module {`（如 class A extends module{…}）会被 Babel 当成 module blocks 提案语法而拒绝解析，避开。
    if (X === 'module') {
      for (const list of [b.decls, b.refs.map((r) => r.node)]) {
        for (const n of list) if (/^[ 	]*{/.test(this.source.slice(n.end, n.end + 64))) return 'babel-module-block';
      }
    }
    return null;
  }
  apply(b, X) {
    const old = this.cur(b);
    const m = this.namesOf(b.scope);
    if (m.get(old) === b) m.delete(old);
    m.set(X, b);
    const S = b.scope;
    for (const list of [b.refs, b.passOccs]) {
      for (const r of list) {
        for (let s = r.scope; s !== S; s = s.parent) {
          this.bump(s, old, -1);
          this.bump(s, X, 1);
        }
      }
    }
    if (X === b.name) this.final.delete(b);
    else this.final.set(b, X);
  }
  request(b, want, info) {
    const key = b.key;
    if (b.frozen) {
      // keeping the current name is not a rename: nothing to reject
      if (want !== b.name) this.rejected.push({ key, from: b.name, wanted: want, reason: `frozen: ${b.frozen}`, origin: info.origin });
      return;
    }
    if (!isValidBindingName(want)) {
      this.rejected.push({ key, from: b.name, wanted: want, reason: 'invalid identifier', origin: info.origin });
      return;
    }
    if (want === this.cur(b)) return;
    if (!this.through) this.buildThrough();
    let firstReason = null;
    const hk = b.scope.pre + '#' + want;
    const start = this.hint.get(hk) ?? 1;
    if (start > 1) firstReason = 'name taken in this scope (earlier request)';
    for (let n = start; n <= MAX_SUFFIX; n++) {
      const cand = suffixed(want, n);
      if (cand === this.cur(b)) return;
      const why = this.check(b, cand);
      if (why === null) {
        this.apply(b, cand);
        this.hint.set(hk, n);
        if (n > 1) this.conflicts.push({ key, from: b.name, wanted: want, got: cand, reason: firstReason, origin: info.origin });
        this.renamed.push({ key, scope: b.scope.kind === 'module' ? 'top' : 'local', from: b.name, to: cand, source: info.source, origin: info.origin });
        return;
      }
      if (firstReason === null) firstReason = why;
    }
    this.rejected.push({ key, from: b.name, wanted: want, reason: 'no free suffix', origin: info.origin });
  }
}

export function makeOffsetMap(edits) {
  // edits 已按 start 排序且不重叠
  const n = edits.length;
  const starts = new Array(n);
  const ends = new Array(n);
  const cum = new Array(n + 1); // cum[k] = 前 k 个编辑的长度差之和
  cum[0] = 0;
  for (let i = 0; i < n; i++) {
    starts[i] = edits[i].start;
    ends[i] = edits[i].end;
    cum[i + 1] = cum[i] + edits[i].text.length - (edits[i].end - edits[i].start);
  }
  return function offsetMap(o) {
    // k = 满足 end <= o 的编辑数
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ends[mid] <= o) lo = mid + 1;
      else hi = mid;
    }
    const k = lo;
    if (k < n && starts[k] < o) {
      // 落在第 k 个编辑内部：映射到替换文本末尾
      return ends[k] + cum[k + 1];
    }
    return o + cum[k];
  };
}

export function applyEdits(source, edits) {
  edits.sort((a, b) => a.start - b.start);
  const parts = [];
  let pos = 0;
  for (const e of edits) {
    if (e.start < pos) throw new Error(`overlapping edits at ${e.start}`);
    parts.push(source.slice(pos, e.start), e.text);
    pos = e.end;
  }
  parts.push(source.slice(pos));
  return parts.join('');
}

export function renameModule(file, source, entryIn, globalPlan, opts = {}) {
  const entry = toEntry(entryIn);
  const ast = opts.ast ?? parseModule(source);
  const an = opts.analysis ?? analyze(ast, source);
  return renameAnalyzed(file, source, an, entry, globalPlan, opts);
}

export function renameAnalyzed(file, source, an, entry, globalPlan, opts = {}) {
  const gp = { exportRenames: {}, exportLocalNames: {}, autoImportNames: false, ...(globalPlan ?? {}) };
  const autoImportNames = opts.autoImportNames ?? gp.autoImportNames ?? false;
  const warnings = [];
  const P = new Planner(an, source);

  // 声明偏移 → 绑定
  const byDecl = new Map();
  for (const b of an.bindings) for (const d of b.decls) byDecl.set(d.start, b);

  const requested = new Set();
  const reqs = [];
  const firstSpec = new Map();
  for (const [name, spec] of entry.top) {
    const b = an.module.names.get(name);
    if (!b) {
      warnings.push({ kind: 'unknown-top', key: name, wanted: spec.name });
      continue;
    }
    reqs.push({ b, spec, origin: 'top' });
  }
  for (const [off, spec] of entry.locals) {
    const b = byDecl.get(off);
    if (!b) {
      warnings.push({ kind: 'unknown-local', key: '@' + off, wanted: spec.name });
      continue;
    }
    reqs.push({ b, spec, origin: 'local' });
  }
  const order = (x) => (x.b.decls.length ? Math.min(...x.b.decls.map((d) => d.start)) : 0);
  reqs.sort((x, y) => (x.origin === y.origin ? order(x) - order(y) : x.origin === 'top' ? -1 : 1));
  for (const r of reqs) {
    if (requested.has(r.b)) {
      // 同一绑定有多个声明（var a; var a;）或同时按名字和偏移给了名字：名字相同时静默，不同时以先处理者为准并告警
      const first = firstSpec.get(r.b);
      if (first.name !== r.spec.name) warnings.push({ kind: 'duplicate-request', key: r.b.key, wanted: r.spec.name, kept: first.name });
      continue;
    }
    requested.add(r.b);
    firstSpec.set(r.b, r.spec);
    P.request(r.b, r.spec.name, { source: r.spec.source, origin: r.origin });
  }

  // 导入方默认别名
  const exportRenamesHere = gp.exportRenames[file] ?? {};
  const finalImported = (s) => {
    if (s.importedRaw === null) return null;
    const t = relTarget(file, s.source);
    if (t && gp.exportRenames[t] && Object.hasOwn(gp.exportRenames[t], s.imported)) return gp.exportRenames[t][s.imported];
    return s.imported;
  };
  for (const s of an.importSpecs) {
    if (s.importedRaw === null) continue; // default / namespace 导入
    const b = s.localOcc.binding;
    if (requested.has(b)) continue;
    const t = relTarget(file, s.source);
    const fi = finalImported(s);
    let want = null;
    if (t && gp.exportLocalNames[t] && Object.hasOwn(gp.exportLocalNames[t], s.imported)) want = gp.exportLocalNames[t][s.imported];
    else if (fi !== s.imported) want = fi;
    else if (autoImportNames && s.importedIsIdent && fi !== b.name && isValidBindingName(fi)) want = fi;
    if (want && want !== b.name && !b.frozen) {
      requested.add(b);
      P.request(b, want, { source: 'auto', origin: 'import-default' });
    }
  }

  // 生成编辑
  const edits = [];
  const specEdits = new Set();
  for (const [b, F] of P.final) {
    for (const o of b.declOccs.concat(b.refs)) {
      const c = o.ctx;
      if (c === null) edits.push({ start: o.node.start, end: o.node.end, text: F });
      else if (c.kind === 'shorthand') edits.push({ start: o.node.start, end: o.node.end, text: `${c.keyRaw}:${F}` });
      else specEdits.add(c.spec);
    }
  }
  for (const s of an.importSpecs) {
    if (s.importedRaw === null) continue;
    const fi = finalImported(s);
    const importedChanged = fi !== s.imported;
    const local = P.cur(s.localOcc.binding);
    if (!importedChanged && local === s.localOcc.node.name) continue;
    const importedText = importedChanged ? fi : s.importedRaw;
    const text = (importedChanged || s.importedIsIdent) && importedText === local ? local : `${importedText} as ${local}`;
    edits.push({ start: s.spec.start, end: s.spec.end, text });
    specEdits.delete(s.spec);
  }
  for (const e of an.exportSpecs) {
    const newE = Object.hasOwn(exportRenamesHere, e.exported) ? exportRenamesHere[e.exported] : null;
    const local = e.localOcc.binding ? P.cur(e.localOcc.binding) : e.localOcc.node.name;
    if (newE === null && local === e.localOcc.node.name) continue;
    const exportedText = newE ?? e.exportedRaw;
    const text = (newE !== null || e.exportedIsIdent) && exportedText === local ? local : `${local} as ${exportedText}`;
    edits.push({ start: e.spec.start, end: e.spec.end, text });
    specEdits.delete(e.spec);
  }
  if (specEdits.size) throw new Error(`${file}: internal error, unhandled specifier edits`);
  const code = edits.length ? applyEdits(source, edits) : source;
  if (!edits.length) edits.sort((a, b) => a.start - b.start);

  return {
    code,
    edits,
    offsetMap: makeOffsetMap(edits),
    renamed: P.renamed,
    conflicts: P.conflicts,
    rejected: P.rejected,
    warnings,
    directEvals: an.directEvals,
    annexB: an.annexB,
    stats: {
      bindings: an.bindings.filter((b) => !b.implicit).length,
      renamed: P.final.size,
      edits: edits.length,
      frozen: an.bindings.filter((b) => b.frozen && !b.implicit).length,
    },
  };
}

// 列出模块里所有（非隐式）绑定，供命名者引用。
export function bindingsOf(file, source, opts = {}) {
  const ast = opts.ast ?? parseModule(source);
  const an = opts.analysis ?? analyze(ast, source);
  const starts = ast.program.body.map((n) => n.start);
  const topOf = (o) => {
    let lo = 0;
    let hi = starts.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= o) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans < 0 ? null : starts[ans];
  };
  const out = [];
  for (const b of an.bindings) {
    if (b.implicit) continue;
    const declStart = Math.min(...b.decls.map((d) => d.start));
    out.push({
      key: '@' + declStart,
      name: b.name,
      scope: b.scope.kind === 'module' ? 'top' : 'local',
      kind: b.kind,
      declStart,
      topDeclStart: topOf(declStart),
      refs: b.refs.length,
      frozen: b.frozen,
    });
  }
  out.sort((a, b) => a.declStart - b.declStart);
  return out;
}
