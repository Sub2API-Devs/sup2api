/**
 * plugins/functionHooks/hooksModuleScan.ts
 *
 * 2.1.316 新增：静态扫描 hooks 模块源码的 import/export，判断其引用的 $ 能力
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { relative, sep } from "path";
import {
  walkAst,
  exportNameText,
  exportsName_2,
  findReferences,
  appendLiteral,
  evaluateLiteral,
  loadHooksModuleGraph,
  buildModuleGraph,
} from "./moduleScan.js";
import { readCommandList, ANTHROPIC } from "./eventPatterns.js";
import { scanRegistrations, scanHooksModuleCached } from "./stateScan.js";
import {
  builtinSourceRegistry,
  candidateSourcePaths,
  resolveImportSpec,
  bareImportError,
} from "./moduleLoader.js";

//@ chunk-e6aww6q8.js:736889-737029 placement
/**
 * 扫描图里任一文件是否使用动态 import()。
 */
function hasDynamicImport(graph) {
  let n = false;
  for (let { scanned } of graph.files.values())
    walkAst(
      scanned.program,
      (s) => {
        if (s.node.type === "ImportExpression") n = true;
      },
      () => n,
    );
  return n;
}
//@ chunk-e6aww6q8.js:737029-737608 placement
function scanDefaultExport(program, n, r) {
  let s = new Set();
  for (let h of program.body) {
    if (h.type === "ExportDefaultDeclaration") {
      let { declaration } = h;
      if (
        declaration === n ||
        (declaration.type === "Identifier" && r !== undefined && declaration.name === r)
      )
        s.add("default");
      continue;
    }
    if (h.type !== "ExportNamedDeclaration") continue;
    let { declaration, source, specifiers } = h;
    if (declaration?.type === "FunctionDeclaration" && declaration === n) s.add(declaration.id.name);
    if (declaration?.type === "VariableDeclaration") {
      for (let declaration_2 of declaration.declarations)
        if (declaration_2.init === n && declaration_2.id.type === "Identifier") s.add(declaration_2.id.name);
    }
    if (source !== null && source !== undefined) continue;
    for (let specifier of specifiers)
      if (r !== undefined && exportNameText(specifier.local) === r) s.add(exportNameText(specifier.exported));
  }
  return s;
}
//@ chunk-e6aww6q8.js:737608-738706 placement
/**
 * 静态扫描 hooks 模块的 import/export 声明，找出它引用的 $ 能力。
 */
function scanHooksModuleImports(e, n) {
  let r = e.holderFiles.get(n);
  if (r === undefined) return;
  let { scanned } = r;
  let h = [...scanned.names.functions].find(([, L]) => L === n)?.[0];
  let y = h === undefined ? [] : (scanned.names.read.get(h) ?? []);
  let S = scanDefaultExport(scanned.program, n, h);
  let w = [];
  for (let L of y)
    if (scanned.parentOf(L)?.type !== "ExportDefaultDeclaration")
      w.push({
        reference: L,
        scanned,
      });
  for (let file of e.graph.files.values())
    for (let G of file.scanned.program.body) {
      let source =
        G.type === "ImportDeclaration" ||
        G.type === "ExportAllDeclaration" ||
        G.type === "ExportNamedDeclaration"
          ? G.source
          : undefined;
      if (!(
        S.size > 0 &&
        source !== null &&
        source !== undefined &&
        file.links.get(String(source.value)) === scanned.file
      ))
        continue;
      if (
        G.type === "ExportAllDeclaration" ||
        (G.type === "ExportNamedDeclaration" &&
          G.specifiers.some((specifier) => S.has(exportNameText(specifier.local)))) ||
        (G.type === "ImportDeclaration" &&
          G.specifiers.some((specifier) => specifier.type === "ImportNamespaceSpecifier"))
      )
        return;
      let specifiers = G.type === "ImportDeclaration" ? G.specifiers : [];
      for (let specifier of specifiers) {
        let Me = specifier.type === "ImportSpecifier" ? exportNameText(specifier.imported) : "default";
        let We = specifier.local.name;
        if (!S.has(Me)) continue;
        if (exportsName_2(file.scanned.program, We)) return;
        for (let reference of file.scanned.names.read.get(We) ?? [])
          w.push({
            reference,
            scanned: file.scanned,
          });
      }
    }
  return w;
}
//@ chunk-e6aww6q8.js:738706-739383 placement
function scanCallExpressions(e) {
  let n = new Map();
  let r = new Map();
  let s = Map.groupBy(e.holderCalls, (w) => w.call);
  let h;
  function y({ reference, scanned }, G, q) {
    let Z = scanned.parentOf(reference);
    return (Z?.type === "CallExpression" && Z.callee === reference ? (s.get(Z) ?? []) : []).some(
      (ke) => ke.callee === G && ke.position === q && S(ke.caller, ke.callerPosition),
    );
  }
  function S(caller, callerPosition) {
    h ??= hasDynamicImport(e.graph);
    let G = n.get(caller)?.get(callerPosition);
    let q = r.get(caller)?.has(callerPosition) === true;
    if (h || q || G !== undefined) return G ?? false;
    r.set(caller, (r.get(caller) ?? new Set()).add(callerPosition));
    let Se =
      caller.type === "FunctionExpression" && caller.id !== null && caller.id !== undefined
        ? undefined
        : scanHooksModuleImports(e, caller);
    let ke = caller === e.register && callerPosition === 0;
    let we = Se !== undefined && (Se.length > 0 || ke) && Se.every((Ee) => y(Ee, caller, callerPosition));
    n.set(caller, (n.get(caller) ?? new Map()).set(callerPosition, we));
    r.get(caller)?.delete(callerPosition);
    return we;
  }
  return S;
}
//@ chunk-e6aww6q8.js:739383-739551 placement
/**
 * 判断 on(...) 调用是否紧跟 .catch 成员访问。
 */
function isCatchMember(e, linked) {
  let r = linked.scanned.parentOf(e);
  return (
    r?.type === "MemberExpression" &&
    r.object === e &&
    !r.computed &&
    r.property.type === "Identifier" &&
    r.property.name === "catch"
  );
}
//@ chunk-e6aww6q8.js:739551-739862 placement
/**
 * 判断钩子函数是否可能使用第三个参数（next）或 eval（无法静态确定时视为可能）。
 */
function mayRewriteNext(linked, n) {
  let s = n.type === "Identifier" ? linked.scanned.names.functions.get(n.name) : n;
  if (!(
    s?.type === "FunctionExpression" ||
    s?.type === "ArrowFunctionExpression" ||
    s?.type === "FunctionDeclaration"
  ))
    return true;
  let [, , y] = s.params;
  return (
    (y !== undefined && (y.type !== "Identifier" || findReferences(s, y.name).length > 0)) ||
    findReferences(s, "eval").length > 0
  );
}
//@ chunk-e6aww6q8.js:739862-740163 placement
/**
 * 判断 command.run 注册是否只针对本插件登记的命令且不会把事件传下去。
 */
function isOwnCommandRunHook(e, n, registeredCommands) {
  let { parentOf } = n.linked.scanned;
  let h = isCatchMember(e, n.linked) ? parentOf(e) : undefined;
  let y = h === undefined ? undefined : parentOf(h);
  let S = [...e.arguments.slice(-1), ...(y?.type === "CallExpression" ? y.arguments : [])];
  let w = readCommandList(n.matcher) ?? [];
  return (
    n.event === "command.run" &&
    !S.some((L) => mayRewriteNext(n.linked, L)) &&
    w.length > 0 &&
    w.every((L) => registeredCommands.has(L))
  );
}
//@ chunk-e6aww6q8.js:740163-740645 placement
/**
 * 判断某名字的读取点是顶层 const 声明还是某注册的 matcher 位置。
 */
function classifyMatcherHolder(e, scanned, r) {
  let s = scanned.climbs.heldAt(r);
  if (s === undefined) return;
  let { value: h, parent } = s;
  if (parent.type === "VariableDeclarator" && parent.init === h) {
    let { id } = parent;
    let q = scanned.parentOf(parent);
    let Z = q && scanned.parentOf(q);
    return id.type === "Identifier" &&
      q?.type === "VariableDeclaration" &&
      q.kind === "const" &&
      (Z?.type === "Program" || Z?.type === "ExportNamedDeclaration")
      ? {
          kind: "const",
          name: id.name,
        }
      : undefined;
  }
  let w = parent.type === "CallExpression" ? e.registrations.get(parent) : undefined;
  return w !== undefined && w.matcher === h
    ? {
        kind: "matcher",
        held: w,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:740645-741127 placement
/**
 * 生成"名字是否只被用作 matcher（密封）"的递归判断（带缓存与环检测）。
 */
function createSealedNameChecker(e, n) {
  let r = new Map();
  let s = new Map();
  function h(y, name) {
    let w = r.get(y)?.get(name);
    if (s.get(y)?.has(name) === true || w !== undefined) return w ?? false;
    s.set(y, (s.get(y) ?? new Set()).add(name));
    let { scanned } = y;
    let q = scanned.names.read.get(name) ?? [];
    let Z =
      !exportsName_2(scanned.program, name) &&
      q.length > 0 &&
      q.every((Se) => {
        let ke = classifyMatcherHolder(e, scanned, Se);
        switch (ke?.kind) {
          case "matcher":
            return n(ke.held.holder, ke.held.position);
          case "const":
            return h(y, ke.name);
          case undefined:
            return false;
        }
      });
    r.set(y, (r.get(y) ?? new Map()).set(name, Z));
    s.get(y)?.delete(name);
    return Z;
  }
  return h;
}
//@ chunk-e6aww6q8.js:741127-741699 placement
/**
 * 汇总扫描到的注册：注册描述、ui.render 的字面 matcher、catch 与 command.run 自有命令信息。
 */
function collectRegistrationFacts(e) {
  let sealedNameChecker = createSealedNameChecker(e, scanCallExpressions(e));
  let r = new Map();
  let s = [];
  let h = [];
  let y = [];
  for (let [S, w] of e.registrations) {
    let { event, matcher, linked } = w;
    let { program, parentOf, names } = linked.scanned;
    let we = r.get(linked) ?? {
      program,
      parentOf,
      shadowOf: names.shadowOf,
      isSealed: (Ie) => sealedNameChecker(linked, Ie),
    };
    r.set(linked, we);
    let Ee = appendLiteral(event, matcher, we);
    let Ae = event === "command.run";
    s.push(Ee);
    y.push({
      registration: Ee,
      pattern: event,
      hasCatch: isCatchMember(S, linked),
      isOwnCommand: isOwnCommandRunHook(S, w, e.registeredCommands),
      commands: (Ae ? readCommandList(matcher) : undefined) ?? [],
    });
    if (event === "ui.render" && matcher !== undefined)
      h.push({
        registration: Ee,
        matcher: evaluateLiteral(matcher, we),
      });
  }
  return {
    registrations: s,
    renderMatchers: h,
    catchReads: y,
  };
}
//@ chunk-e6aww6q8.js:741699-741818 placement
/**
 * 列出只经由辅助函数间接发生的 $ 调用（按调用名排序）。
 */
function collectHelperCalls(graph, n) {
  let { via, direct } = scanRegistrations(graph, n);
  let h = new Map();
  for (let [y, S] of via) if (!direct.has(y)) h.set(y, [...S].sort());
  return h;
}
//@ chunk-e6aww6q8.js:741818-742025 placement
/**
 * 插件校验用：加载 hooks 模块图并返回扫描结果、注册、ui.render matcher、catch 信息与辅助调用。
 */
async function scanHooksModuleForValidation(e, n, r) {
  let { graph } = await loadHooksModuleGraph(e, n, r);
  let { registrations, renderMatchers, catchReads } = collectRegistrationFacts(scanRegistrations(graph, r));
  return {
    scan: scanHooksModuleCached(graph, r),
    registrations,
    renderMatchers,
    catchReads,
    helperCalls: collectHelperCalls(graph, r),
  };
}
//@ chunk-e6aww6q8.js:742025-742275 placement
/**
 * 把模块图转成加载结果：入口源码、其余链接文件、链接关系与扫描结果。
 */
var toModuleLoadResult = (e, n, r) => ({
  source: n.source,
  linked: [...n.graph.files]
    .filter((file) => file[0] !== e)
    .map((file) => ({
      file: file[0],
      source: file[1].source,
    })),
  links: [...n.graph.files].flatMap((file) =>
    [...file[1].links].map((link) => ({
      from: file[0],
      spelled: link[0],
      file: link[1],
    })),
  ),
  scan: scanHooksModuleCached(n.graph, r),
});
//@ chunk-e6aww6q8.js:742275-742468 placement
/**
 * 列出模块图里入口之外的文件（含源码）及所有链接关系。
 */
var listLinkedFiles = (graph, n) => ({
  linked: [...graph.files]
    .filter(([r]) => r !== n)
    .map(([r, s]) => ({
      file: r,
      source: s.source,
    })),
  links: [...graph.files].flatMap(([r, s]) =>
    [...s.links].map(([h, y]) => ({
      from: r,
      spelled: h,
      file: y,
    })),
  ),
});
//@ chunk-e6aww6q8.js:742468-742594 placement
/**
 * 扫描 hooks 模块：有构建内置的扫描结果则直接用，否则加载模块图并扫描。
 */
async function scanHooksModule(e, n, r) {
  let s = builtinSourceRegistry.scan(e);
  return s === undefined
    ? toModuleLoadResult(e, await loadHooksModuleGraph(e, n, r), r)
    : {
        source: "",
        linked: [],
        links: [],
        scan: s,
      };
}
//@ chunk-e6aww6q8.js:742684-742851 placement
/**
 * 为密封插件创建模块解析器：只从给定文本表里取源码，找不到时报错。
 */
var createSealedResolver = (pluginRoot, pluginName, texts) => async (s, h) => {
  for (let y of candidateSourcePaths(resolveImportSpec(s, h))) {
    let S = texts.get(relative(pluginRoot, y).split(sep).join("/"));
    if (S !== undefined)
      return {
        file: y,
        source: S,
      };
  }
  throw bareImportError(pluginName, s, relative(pluginRoot, h) || h);
};
//@ chunk-e6aww6q8.js:742851-743173 placement
/**
 * 用密封文本（组织下发的插件）构建模块图并扫描，入口不在文本表中时报错。
 */
async function scanSealedHooksModule(e) {
  let n = e.texts.get(relative(e.pluginRoot, e.modulePath).split(sep).join("/"));
  if (n === undefined) throw bareImportError(e.pluginName, e.modulePath, e.pluginName);
  return toModuleLoadResult(
    e.modulePath,
    {
      source: n,
      graph: await buildModuleGraph(
        {
          file: e.modulePath,
          source: n,
          root: e.pluginRoot,
        },
        e.pluginName,
        createSealedResolver(e.pluginRoot, e.pluginName, e.texts),
      ),
    },
    e.pluginName,
  );
}
//@ chunk-e6aww6q8.js:743173-743529 placement
/**
 * 非内置插件的遥测钩子落在 anthropic 流上时返回拒绝说明（应指定 to: "collector"）。
 */
function telemetryStreamRefusal(e, n) {
  if (!(!n.isBuiltin && e.telemetry?.includes(ANTHROPIC) === true)) return;
  return `its hooks stand on the telemetry stream "${ANTHROPIC}" (a matcher names it, or a telemetry hook names no "to" and so stands on every stream), which is for the plugins built into the CLI; name the collector on each telemetry hook: on("telemetry.log", { to: "collector" }, hook)`;
}
//@ chunk-e6aww6q8.js:743529-743601 placement
/**
 * 遥测引用摘要
 */
function telemetryRefSummary(e) {
  let joined = e.telemetry?.join(", ");
  return joined === "" ? "nothing" : joined;
}
export {
  scanHooksModuleForValidation,
  telemetryRefSummary,
  telemetryStreamRefusal,
  listLinkedFiles,
  scanHooksModule,
  scanSealedHooksModule,
};
