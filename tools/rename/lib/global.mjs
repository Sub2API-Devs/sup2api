// 跨模块部分：收集每个模块的导入导出事实（moduleFacts），据此决定导出改名（buildGlobalPlan）。
// 用法：
//   import { moduleFacts, buildGlobalPlan, planFromTree } from './global.mjs'
//   const facts = files.map((f) => moduleFacts(f, source))       // 可在 worker 里并行（apply.mjs 就是这样做的）
//   const plan = buildGlobalPlan(facts, naming.modules, { autoImportNames: false })
//   或一步到位（单线程，全语料约 10 秒）：const { plan, facts } = planFromTree('original', naming.modules)
//   plan = { exportRenames: {file: {旧导出名: 新导出名}}, exportLocalNames: {file: {导出名: 导出方请求的本地新名}},
//            frozenExports: {file: 原因}, rejected: [...], conflicts: [...], autoImportNames }
// 规则：
//   - 导出名冻结（只改本地名，导出处写成 `export {新本地名 as 原导出名}`）的模块：
//       被 import("./x.js") 动态加载、被 import * as 引用、参与 export … from 重导出、
//       文件名在任何模块源码里被提及（require("./x.js")、Worker 路径等，按文件名匹配，过近似）、
//       没有被任何模块静态导入（入口、Worker 脚本）。存在非字面量的本地 import() 时全部冻结。
//   - 其余模块：导出名 = exports 表显式给出的名字；否则若导出是 `export {a}`（导出名 = 本地名）且本地 a 有命名条目，
//     导出名跟随 a 的请求名；否则不变。新导出名必须是合法标识符，与模块内其他导出重名时加后缀。
//   - 导入方本地名（没有显式命名条目时）：导出方给该导出的本地请求名 → 否则新导出名（导出名变了时）
//     → 否则（仅 autoImportNames）导入名本身（`import {extname as Qo} from "path"` → extname）。
import path from 'node:path';
import { parseModule, isJsFile, readText, tryParse } from './parse.mjs';
import { listFiles } from './files.mjs';
import { analyze } from './scope.mjs';
import { isValidExportName, suffixed } from './names.mjs';
import { mentionTokens, basenameIndex, resolveMentions } from './mentions.mjs';

export function resolveSource(importerFile, source, knownFiles) {
  if (typeof source !== 'string' || !(source.startsWith('./') || source.startsWith('../'))) return null;
  const p = path.posix.normalize(path.posix.join(path.posix.dirname(importerFile), source));
  return knownFiles.has(p) ? p : null;
}

// 从分析结果提取事实（renameModule 内部也用它，避免重复解析）。
export function factsFromAnalysis(file, an, source) {
  const frozenTop = [];
  const topDecls = [];
  for (const b of an.module.names.values()) {
    if (b.frozen) frozenTop.push(b.name);
    for (const d of b.decls) topDecls.push([d.start, b.name]);
  }
  return {
    file,
    exports: an.exportSpecs.map((e) => ({ exported: e.exported, local: e.localOcc.node.name })),
    exportDefault: an.exportDefault,
    exportDeclNames: an.exportDeclNames,
    dynImports: an.dynImports.map((d) => ({ source: d.source, template: d.template })),
    imports: an.importSpecs.map((s) => ({ source: s.source, imported: s.imported, local: s.localOcc.node.name })),
    frozenTop,
    topDecls,
    unsupported: an.unsupported,
    mentions: source === undefined ? [] : mentionTokens(source, an.staticSources),
  };
}

export function moduleFacts(file, source) {
  const ast = parseModule(source);
  return factsFromAnalysis(file, analyze(ast, source), source);
}

export function buildGlobalPlan(factsList, namingModules, opts = {}) {
  const autoImportNames = opts.autoImportNames === true;
  const known = new Set(factsList.map((f) => f.file));
  const frozenExports = {};
  const rejected = [];
  const conflicts = [];
  let anyUnknownLocalDyn = false;
  const bidx = basenameIndex(known);
  // 没有被任何模块静态导入的模块（入口、Worker 脚本……）：只能按路径加载，导出名冻结
  const imported = new Set();
  for (const f of factsList) for (const im of f.imports) {
    const t = resolveSource(f.file, im.source, known);
    if (t) imported.add(t);
  }
  for (const f of factsList) if (!imported.has(f.file) && f.exports.length) frozenExports[f.file] ??= 'not statically imported by any module';
  for (const f of factsList) {
    // 按路径提及（require("./x.js")、Worker 路径……）
    for (const t of resolveMentions(f.mentions ?? [], bidx)) frozenExports[t] ??= `file name mentioned in ${f.file}`;
    for (const d of f.dynImports) {
      if (d.source !== null) {
        const t = resolveSource(f.file, d.source, known);
        if (t) frozenExports[t] ??= `dynamic import from ${f.file}`;
      } else if (d.template === null || d.template.startsWith('.')) {
        anyUnknownLocalDyn = true;
      }
    }
    // 重导出（export … from / export * from）：本模块与来源模块的导出名都冻结（不做传递改名）
    for (const u of f.unsupported) {
      frozenExports[f.file] ??= `unsupported ${u.what}`;
      const t = u.source ? resolveSource(f.file, u.source, known) : null;
      if (t) frozenExports[t] ??= `re-exported by ${f.file}`;
    }
    // 命名空间导入（import * as ns from "./x.js"）：ns.foo 按属性名访问，导出名冻结
    for (const im of f.imports) {
      if (im.imported !== '*') continue;
      const t = resolveSource(f.file, im.source, known);
      if (t) frozenExports[t] ??= `namespace import from ${f.file}`;
    }
  }
  const exportRenames = {};
  const exportLocalNames = {};
  for (const f of factsList) {
    const naming = namingModules.get(f.file);
    const frozenTop = new Set(f.frozenTop);
    // 顶层绑定的请求名：top 按名字的条目优先，其次按偏移（"@N"）的条目
    const byName = new Map();
    if (naming) {
      for (const [off, name] of f.topDecls) {
        const s = naming.locals.get(off);
        if (s && !byName.has(name)) byName.set(name, s);
      }
    }
    const localReq = (L) => {
      const s = naming?.top.get(L) ?? byName.get(L);
      return s && !frozenTop.has(L) && s.name !== L ? s.name : null;
    };
    const eln = {};
    for (const e of f.exports) {
      const r = localReq(e.local);
      if (r) eln[e.exported] = r;
    }
    if (Object.keys(eln).length) exportLocalNames[f.file] = eln;

    const reason = anyUnknownLocalDyn ? 'non-literal local dynamic import exists' : frozenExports[f.file];
    // 想要的导出名
    const wants = [];
    for (const e of f.exports) {
      const explicit = naming?.exports.get(e.exported);
      if (e.exported === 'default') {
        if (explicit && explicit.name !== 'default') rejected.push({ file: f.file, export: e.exported, wanted: explicit.name, reason: 'default export cannot be renamed' });
        continue;
      }
      let want = null;
      let src = null;
      if (explicit && explicit.name !== e.exported) {
        want = explicit.name;
        src = 'explicit';
      } else if (!explicit && e.exported === e.local && localReq(e.local)) {
        want = localReq(e.local);
        src = 'follow-local';
      }
      if (!want) continue;
      if (reason) {
        if (src === 'explicit') rejected.push({ file: f.file, export: e.exported, wanted: want, reason: `exports frozen: ${reason}` });
        continue;
      }
      if (!isValidExportName(want)) {
        rejected.push({ file: f.file, export: e.exported, wanted: want, reason: 'invalid identifier' });
        continue;
      }
      wants.push({ old: e.exported, want, src });
    }
    if (!wants.length) continue;
    // 不改的导出名先占位；改名的按 显式 → 跟随 的顺序分配，重名加后缀。
    const renamedOld = new Set(wants.map((w) => w.old));
    const taken = new Set(f.exports.map((e) => e.exported).filter((n) => !renamedOld.has(n)));
    wants.sort((a, b) => (a.src === b.src ? 0 : a.src === 'explicit' ? -1 : 1));
    const map = {};
    for (const w of wants) {
      let n = 1;
      let cand = w.want;
      while (taken.has(cand)) cand = suffixed(w.want, ++n);
      if (n > 1) conflicts.push({ file: f.file, export: w.old, wanted: w.want, got: cand, reason: 'export name taken' });
      taken.add(cand);
      if (cand !== w.old) map[w.old] = cand;
    }
    if (Object.keys(map).length) exportRenames[f.file] = map;
  }
  return { exportRenames, exportLocalNames, frozenExports, anyUnknownLocalDyn, rejected, conflicts, autoImportNames };
}

export function emptyGlobalPlan() {
  return { exportRenames: {}, exportLocalNames: {}, frozenExports: {}, anyUnknownLocalDyn: false, rejected: [], conflicts: [], autoImportNames: false };
}

// 单线程：读整棵树、收集事实、生成计划。不能解析的 .js（资源脚本）跳过。
export function planFromTree(root, namingModules, opts = {}) {
  const facts = [];
  for (const f of listFiles(root)) {
    if (!isJsFile(f)) continue;
    const { text } = readText(path.join(root, f));
    const p = tryParse(text);
    if (p.error) continue;
    facts.push(factsFromAnalysis(f, analyze(p.ast, text), text));
  }
  return { facts, plan: buildGlobalPlan(facts, namingModules ?? new Map(), opts) };
}
