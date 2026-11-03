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
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import {
  walkAst,
  exportNameText,
  Feo,
  findReferences,
  jUi,
  evaluateLiteral,
  loadHooksModuleGraph,
  buildModuleGraph,
} from "./moduleScan.js";
import { readCommandList, ANTHROPIC } from "./eventPatterns.js";
import { scanRegistrations, scanHooksModuleCached } from "./stateScan.js";
import { Neo, candidateSourcePaths, dos, bareImportError } from "./moduleLoader.js";

/**
 * 扫描图里任一文件是否使用动态 import()。
 */
//@ chunk-e6aww6q8.js:736889-737029 placement
function hasDynamicImport(e) {
  let n = !1;
  for (let { scanned: scanned } of e.files.values())
    walkAst(
      scanned.program,
      (s) => {
        if (s.node.type === "ImportExpression") n = !0;
      },
      () => n,
    );
  return n;
}
//@ chunk-e6aww6q8.js:737029-737608 placement
function scanDefaultExport(e, n, r) {
  let s = new Set();
  for (let h of e.body) {
    if (h.type === "ExportDefaultDeclaration") {
      let { declaration: declaration } = h;
      if (declaration === n || (declaration.type === "Identifier" && r !== void 0 && declaration.name === r))
        s.add("default");
      continue;
    }
    if (h.type !== "ExportNamedDeclaration") continue;
    let { declaration: declaration, source: source, specifiers: specifiers } = h;
    if (declaration?.type === "FunctionDeclaration" && declaration === n) s.add(declaration.id.name);
    if (declaration?.type === "VariableDeclaration") {
      for (let declaration_2 of declaration.declarations)
        if (declaration_2.init === n && declaration_2.id.type === "Identifier") s.add(declaration_2.id.name);
    }
    if (source !== null && source !== void 0) continue;
    for (let L of specifiers)
      if (r !== void 0 && exportNameText(L.local) === r) s.add(exportNameText(L.exported));
  }
  return s;
}
/**
 * 静态扫描 hooks 模块的 import/export 声明，找出它引用的 $ 能力。
 */
//@ chunk-e6aww6q8.js:737608-738706 placement
function scanHooksModuleImports(e, n) {
  let r = e.holderFiles.get(n);
  if (r === void 0) return;
  let { scanned: scanned } = r,
    h = [...scanned.names.functions].find(([, L]) => L === n)?.[0],
    y = h === void 0 ? [] : (scanned.names.read.get(h) ?? []),
    S = scanDefaultExport(scanned.program, n, h),
    w = [];
  for (let L of y)
    if (scanned.parentOf(L)?.type !== "ExportDefaultDeclaration") w.push({ reference: L, scanned: scanned });
  for (let L of e.graph.files.values())
    for (let G of L.scanned.program.body) {
      let Z =
        G.type === "ImportDeclaration" ||
        G.type === "ExportAllDeclaration" ||
        G.type === "ExportNamedDeclaration"
          ? G.source
          : void 0;
      if (!(S.size > 0 && Z !== null && Z !== void 0 && L.links.get(String(Z.value)) === scanned.file))
        continue;
      if (
        G.type === "ExportAllDeclaration" ||
        (G.type === "ExportNamedDeclaration" &&
          G.specifiers.some((specifier) => S.has(exportNameText(specifier.local)))) ||
        (G.type === "ImportDeclaration" &&
          G.specifiers.some((specifier) => specifier.type === "ImportNamespaceSpecifier"))
      )
        return;
      let Ee = G.type === "ImportDeclaration" ? G.specifiers : [];
      for (let Ae of Ee) {
        let Me = Ae.type === "ImportSpecifier" ? exportNameText(Ae.imported) : "default",
          We = Ae.local.name;
        if (!S.has(Me)) continue;
        if (Feo(L.scanned.program, We)) return;
        for (let ze of L.scanned.names.read.get(We) ?? []) w.push({ reference: ze, scanned: L.scanned });
      }
    }
  return w;
}
//@ chunk-e6aww6q8.js:738706-739383 placement
function scanCallExpressions(e) {
  let n = new Map(),
    r = new Map(),
    groupBy = Map.groupBy(e.holderCalls, (w) => w.call),
    h;
  function y({ reference: reference, scanned: scanned }, G, q) {
    let parentOf = scanned.parentOf(reference);
    return (
      parentOf?.type === "CallExpression" && parentOf.callee === reference
        ? (groupBy.get(parentOf) ?? [])
        : []
    ).some((ke) => ke.callee === G && ke.position === q && S(ke.caller, ke.callerPosition));
  }
  function S(w, L) {
    h ??= hasDynamicImport(e.graph);
    let G = n.get(w)?.get(L),
      q = r.get(w)?.has(L) === !0;
    if (h || q || G !== void 0) return G ?? !1;
    r.set(w, (r.get(w) ?? new Set()).add(L));
    let Se =
        w.type === "FunctionExpression" && w.id !== null && w.id !== void 0
          ? void 0
          : scanHooksModuleImports(e, w),
      ke = w === e.register && L === 0,
      we = Se !== void 0 && (Se.length > 0 || ke) && Se.every((Ee) => y(Ee, w, L));
    return (n.set(w, (n.get(w) ?? new Map()).set(L, we)), r.get(w)?.delete(L), we);
  }
  return S;
}
/**
 * 判断 on(...) 调用是否紧跟 .catch 成员访问。
 */
//@ chunk-e6aww6q8.js:739383-739551 placement
function isCatchMember(e, n) {
  let parentOf = n.scanned.parentOf(e);
  return (
    parentOf?.type === "MemberExpression" &&
    parentOf.object === e &&
    !parentOf.computed &&
    parentOf.property.type === "Identifier" &&
    parentOf.property.name === "catch"
  );
}
/**
 * 判断钩子函数是否可能使用第三个参数（next）或 eval（无法静态确定时视为可能）。
 */
//@ chunk-e6aww6q8.js:739551-739862 placement
function mayRewriteNext(e, n) {
  let s = n.type === "Identifier" ? e.scanned.names.functions.get(n.name) : n;
  if (!(
    s?.type === "FunctionExpression" ||
    s?.type === "ArrowFunctionExpression" ||
    s?.type === "FunctionDeclaration"
  ))
    return !0;
  let [, , y] = s.params;
  return (
    (y !== void 0 && (y.type !== "Identifier" || findReferences(s, y.name).length > 0)) ||
    findReferences(s, "eval").length > 0
  );
}
/**
 * 判断 command.run 注册是否只针对本插件登记的命令且不会把事件传下去。
 */
//@ chunk-e6aww6q8.js:739862-740163 placement
function isOwnCommandRunHook(e, n, r) {
  let { parentOf: parentOf } = n.linked.scanned,
    h = isCatchMember(e, n.linked) ? parentOf(e) : void 0,
    y = h === void 0 ? void 0 : parentOf(h),
    S = [...e.arguments.slice(-1), ...(y?.type === "CallExpression" ? y.arguments : [])],
    w = readCommandList(n.matcher) ?? [];
  return (
    n.event === "command.run" &&
    !S.some((L) => mayRewriteNext(n.linked, L)) &&
    w.length > 0 &&
    w.every((L) => r.has(L))
  );
}
/**
 * 判断某名字的读取点是顶层 const 声明还是某注册的 matcher 位置。
 */
//@ chunk-e6aww6q8.js:740163-740645 placement
function classifyMatcherHolder(e, n, r) {
  let heldAt = n.climbs.heldAt(r);
  if (heldAt === void 0) return;
  let { value: h, parent: parent } = heldAt;
  if (parent.type === "VariableDeclarator" && parent.init === h) {
    let { id: id } = parent,
      parentOf = n.parentOf(parent),
      Z = parentOf && n.parentOf(parentOf);
    return id.type === "Identifier" &&
      parentOf?.type === "VariableDeclaration" &&
      parentOf.kind === "const" &&
      (Z?.type === "Program" || Z?.type === "ExportNamedDeclaration")
      ? { kind: "const", name: id.name }
      : void 0;
  }
  let w = parent.type === "CallExpression" ? e.registrations.get(parent) : void 0;
  return w !== void 0 && w.matcher === h ? { kind: "matcher", held: w } : void 0;
}
/**
 * 生成"名字是否只被用作 matcher（密封）"的递归判断（带缓存与环检测）。
 */
//@ chunk-e6aww6q8.js:740645-741127 placement
function createSealedNameChecker(e, n) {
  let r = new Map(),
    s = new Map();
  function h(y, S) {
    let w = r.get(y)?.get(S);
    if (s.get(y)?.has(S) === !0 || w !== void 0) return w ?? !1;
    s.set(y, (s.get(y) ?? new Set()).add(S));
    let { scanned: scanned } = y,
      q = scanned.names.read.get(S) ?? [],
      Z =
        !Feo(scanned.program, S) &&
        q.length > 0 &&
        q.every((Se) => {
          let ke = classifyMatcherHolder(e, scanned, Se);
          switch (ke?.kind) {
            case "matcher":
              return n(ke.held.holder, ke.held.position);
            case "const":
              return h(y, ke.name);
            case void 0:
              return !1;
          }
        });
    return (r.set(y, (r.get(y) ?? new Map()).set(S, Z)), s.get(y)?.delete(S), Z);
  }
  return h;
}
/**
 * 汇总扫描到的注册：注册描述、ui.render 的字面 matcher、catch 与 command.run 自有命令信息。
 */
//@ chunk-e6aww6q8.js:741127-741699 placement
function collectRegistrationFacts(e) {
  let n = createSealedNameChecker(e, scanCallExpressions(e)),
    r = new Map(),
    s = [],
    h = [],
    y = [];
  for (let [S, w] of e.registrations) {
    let { event: event, matcher: matcher, linked: linked } = w,
      { program: program, parentOf: parentOf, names: names } = linked.scanned,
      we = r.get(linked) ?? {
        program: program,
        parentOf: parentOf,
        shadowOf: names.shadowOf,
        isSealed: (Ie) => n(linked, Ie),
      };
    r.set(linked, we);
    let Ee = jUi(event, matcher, we),
      Ae = event === "command.run";
    if (
      (s.push(Ee),
      y.push({
        registration: Ee,
        pattern: event,
        hasCatch: isCatchMember(S, linked),
        isOwnCommand: isOwnCommandRunHook(S, w, e.registeredCommands),
        commands: (Ae ? readCommandList(matcher) : void 0) ?? [],
      }),
      event === "ui.render" && matcher !== void 0)
    )
      h.push({ registration: Ee, matcher: evaluateLiteral(matcher, we) });
  }
  return { registrations: s, renderMatchers: h, catchReads: y };
}
/**
 * 列出只经由辅助函数间接发生的 $ 调用（按调用名排序）。
 */
//@ chunk-e6aww6q8.js:741699-741818 placement
function collectHelperCalls(e, n) {
  let { via: via, direct: direct } = scanRegistrations(e, n),
    h = new Map();
  for (let [y, S] of via) if (!direct.has(y)) h.set(y, [...S].sort());
  return h;
}
/**
 * 插件校验用：加载 hooks 模块图并返回扫描结果、注册、ui.render matcher、catch 信息与辅助调用。
 */
//@ chunk-e6aww6q8.js:741818-742025 placement
async function scanHooksModuleForValidation(e, n, r) {
  let { graph: graph } = await loadHooksModuleGraph(e, n, r),
    {
      registrations: registrations,
      renderMatchers: renderMatchers,
      catchReads: catchReads,
    } = collectRegistrationFacts(scanRegistrations(graph, r));
  return {
    scan: scanHooksModuleCached(graph, r),
    registrations: registrations,
    renderMatchers: renderMatchers,
    catchReads: catchReads,
    helperCalls: collectHelperCalls(graph, r),
  };
}
/**
 * 把模块图转成加载结果：入口源码、其余链接文件、链接关系与扫描结果。
 */
//@ chunk-e6aww6q8.js:742025-742275 placement
var toModuleLoadResult = (e, n, r) => ({
  source: n.source,
  linked: [...n.graph.files].filter((s) => s[0] !== e).map((s) => ({ file: s[0], source: s[1].source })),
  links: [...n.graph.files].flatMap((s) =>
    [...s[1].links].map((h) => ({ from: s[0], spelled: h[0], file: h[1] })),
  ),
  scan: scanHooksModuleCached(n.graph, r),
});
/**
 * 列出模块图里入口之外的文件（含源码）及所有链接关系。
 */
//@ chunk-e6aww6q8.js:742275-742468 placement
var listLinkedFiles = (e, n) => ({
  linked: [...e.files].filter(([r]) => r !== n).map(([r, s]) => ({ file: r, source: s.source })),
  links: [...e.files].flatMap(([r, s]) => [...s.links].map(([h, y]) => ({ from: r, spelled: h, file: y }))),
});
/**
 * 扫描 hooks 模块：有构建内置的扫描结果则直接用，否则加载模块图并扫描。
 */
//@ chunk-e6aww6q8.js:742468-742594 placement
async function scanHooksModule(e, n, r) {
  let scan = Neo.scan(e);
  return scan === void 0
    ? toModuleLoadResult(e, await loadHooksModuleGraph(e, n, r), r)
    : { source: "", linked: [], links: [], scan: scan };
}
/**
 * 为密封插件创建模块解析器：只从给定文本表里取源码，找不到时报错。
 */
//@ chunk-e6aww6q8.js:742684-742851 placement
var createSealedResolver = (e, n, r) => async (s, h) => {
  for (let y of candidateSourcePaths(dos(s, h))) {
    let S = r.get(relative_12(e, y).split(sep_21).join("/"));
    if (S !== void 0) return { file: y, source: S };
  }
  throw bareImportError(n, s, relative_12(e, h) || h);
};
/**
 * 用密封文本（组织下发的插件）构建模块图并扫描，入口不在文本表中时报错。
 */
//@ chunk-e6aww6q8.js:742851-743173 placement
async function scanSealedHooksModule(e) {
  let n = e.texts.get(relative_11(e.pluginRoot, e.modulePath).split(sep_20).join("/"));
  if (n === void 0) throw bareImportError(e.pluginName, e.modulePath, e.pluginName);
  return toModuleLoadResult(
    e.modulePath,
    {
      source: n,
      graph: await buildModuleGraph(
        { file: e.modulePath, source: n, root: e.pluginRoot },
        e.pluginName,
        createSealedResolver(e.pluginRoot, e.pluginName, e.texts),
      ),
    },
    e.pluginName,
  );
}
/**
 * 非内置插件的遥测钩子落在 anthropic 流上时返回拒绝说明（应指定 to: "collector"）。
 */
//@ chunk-e6aww6q8.js:743173-743529 placement
function telemetryStreamRefusal(e, n) {
  if (!(!n.isBuiltin && e.telemetry?.includes(ANTHROPIC) === !0)) return;
  return `its hooks stand on the telemetry stream "${ANTHROPIC}" (a matcher names it, or a telemetry hook names no "to" and so stands on every stream), which is for the plugins built into the CLI; name the collector on each telemetry hook: on("telemetry.log", { to: "collector" }, hook)`;
}
//@ chunk-e6aww6q8.js:743529-743601 placement
function kqs(e) {
  let n = e.telemetry?.join(", ");
  return n === "" ? "nothing" : n;
}

export {
  scanHooksModuleForValidation,
  kqs,
  telemetryStreamRefusal,
  listLinkedFiles,
  scanHooksModule,
  scanSealedHooksModule,
};
