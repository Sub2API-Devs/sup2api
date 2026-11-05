/**
 * plugins/functionHooks/hooksModuleScan.ts
 *
 * 2.1.316 新增：静态扫描 hooks 模块源码的 import/export，判断其引用的 $ 能力
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (20)
 * attribution: placement 19, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-5xgkngpb.js:747416-747556 placement
/**
 * 扫描图里任一文件是否使用动态 import()。
 */
function hasDynamicImport(graph) {
  let found = false;
  for (let { scanned } of graph.files.values())
    walkAst(
      scanned.program,
      (visit) => {
        if (visit.node.type === "ImportExpression") found = true;
      },
      () => found,
    );
  return found;
}
//@ chunk-5xgkngpb.js:747556-748135 placement
function scanDefaultExport(program, declaration, name) {
  let seen = new Set();
  for (let statement of program.body) {
    if (statement.type === "ExportDefaultDeclaration") {
      let { declaration: declaration_2 } = statement;
      if (
        declaration_2 === declaration ||
        (declaration_2.type === "Identifier" && name !== undefined && declaration_2.name === name)
      )
        seen.add("default");
      continue;
    }
    if (statement.type !== "ExportNamedDeclaration") continue;
    let { declaration: declaration_2, source, specifiers } = statement;
    if (declaration_2?.type === "FunctionDeclaration" && declaration_2 === declaration)
      seen.add(declaration_2.id.name);
    if (declaration_2?.type === "VariableDeclaration") {
      for (let declaration_3 of declaration_2.declarations)
        if (declaration_3.init === declaration && declaration_3.id.type === "Identifier")
          seen.add(declaration_3.id.name);
    }
    if (source !== null && source !== undefined) continue;
    for (let specifier of specifiers)
      if (name !== undefined && exportNameText(specifier.local) === name)
        seen.add(exportNameText(specifier.exported));
  }
  return seen;
}
//@ chunk-5xgkngpb.js:748135-749237 placement
/**
 * 静态扫描 hooks 模块的 import/export 声明，找出它引用的 $ 能力。
 */
function scanHooksModuleImports(graph, file) {
  let holder = graph.holderFiles.get(file);
  if (holder === undefined) return;
  let { scanned } = holder;
  let holderName = [...scanned.names.functions].find(([, value]) => value === file)?.[0];
  let holders = holderName === undefined ? [] : (scanned.names.read.get(holderName) ?? []);
  let defaults = scanDefaultExport(scanned.program, file, holderName);
  let assignees = [];
  for (let exportName of holders)
    if (scanned.parentOf(exportName)?.type !== "ExportDefaultDeclaration")
      assignees.push({
        reference: exportName,
        scanned,
      });
  for (let file of graph.graph.files.values())
    for (let target of file.scanned.program.body) {
      let source =
        target.type === "ImportDeclaration" ||
        target.type === "ExportAllDeclaration" ||
        target.type === "ExportNamedDeclaration"
          ? target.source
          : undefined;
      if (!(
        defaults.size > 0 &&
        source !== null &&
        source !== undefined &&
        file.links.get(String(source.value)) === scanned.file
      ))
        continue;
      if (
        target.type === "ExportAllDeclaration" ||
        (target.type === "ExportNamedDeclaration" &&
          target.specifiers.some((specifier) => defaults.has(exportNameText(specifier.local)))) ||
        (target.type === "ImportDeclaration" &&
          target.specifiers.some((specifier) => specifier.type === "ImportNamespaceSpecifier"))
      )
        return;
      let specifiers = target.type === "ImportDeclaration" ? target.specifiers : [];
      for (let specifier of specifiers) {
        let target = specifier.type === "ImportSpecifier" ? exportNameText(specifier.imported) : "default";
        let secondTarget = specifier.local.name;
        if (!defaults.has(target)) continue;
        if (exportsName_2(file.scanned.program, secondTarget)) return;
        for (let reference of file.scanned.names.read.get(secondTarget) ?? [])
          assignees.push({
            reference,
            scanned: file.scanned,
          });
      }
    }
  return assignees;
}
//@ chunk-5xgkngpb.js:749237-749918 placement
function scanCallExpressions(graph) {
  let name = new Map();
  let file = new Map();
  let seen = Map.groupBy(graph.holderCalls, (holder) => holder.call);
  let holderName;
  function holders({ reference, scanned }, defaults, index) {
    let entry = scanned.parentOf(reference);
    return (
      entry?.type === "CallExpression" && entry.callee === reference ? (seen.get(entry) ?? []) : []
    ).some(
      (value) =>
        value.callee === defaults &&
        value.position === index &&
        secondDefaults(value.caller, value.callerPosition),
    );
  }
  function secondDefaults(caller, index) {
    holderName ??= hasDynamicImport(graph.graph);
    let index_2 = name.get(caller)?.get(index);
    let entry = file.get(caller)?.has(index) === true;
    if (holderName || entry || index_2 !== undefined) return index_2 ?? false;
    file.set(caller, (file.get(caller) ?? new Set()).add(index));
    let value =
      caller.type === "FunctionExpression" && caller.id !== null && caller.id !== undefined
        ? undefined
        : scanHooksModuleImports(graph, caller);
    let secondValue = caller === graph.register && index === 0;
    let thirdValue =
      value !== undefined &&
      (value.length > 0 || secondValue) &&
      value.every((target) => holders(target, caller, index));
    name.set(caller, (name.get(caller) ?? new Map()).set(index, thirdValue));
    file.get(caller)?.delete(index);
    return thirdValue;
  }
  return secondDefaults;
}
//@ chunk-5xgkngpb.js:749918-750086 placement
/**
 * 判断 on(...) 调用是否紧跟 .catch 成员访问。
 */
function isCatchMember(graph, linked) {
  let file = linked.scanned.parentOf(graph);
  return (
    file?.type === "MemberExpression" &&
    file.object === graph &&
    !file.computed &&
    file.property.type === "Identifier" &&
    file.property.name === "catch"
  );
}
//@ chunk-5xgkngpb.js:750086-750397 placement
/**
 * 判断钩子函数是否可能使用第三个参数（next）或 eval（无法静态确定时视为可能）。
 */
function mayRewriteNext(linked, node) {
  let local = node.type === "Identifier" ? linked.scanned.names.functions.get(node.name) : node;
  if (!(
    local?.type === "FunctionExpression" ||
    local?.type === "ArrowFunctionExpression" ||
    local?.type === "FunctionDeclaration"
  ))
    return true;
  let [, , holder] = local.params;
  return (
    (holder !== undefined &&
      (holder.type !== "Identifier" || findReferences(local, holder.name).length > 0)) ||
    findReferences(local, "eval").length > 0
  );
}
//@ chunk-5xgkngpb.js:750397-750698 placement
/**
 * 判断 command.run 注册是否只针对本插件登记的命令且不会把事件传下去。
 */
function isOwnCommandRunHook(member, registration, registeredCommands) {
  let { parentOf } = registration.linked.scanned;
  let catchParent = isCatchMember(member, registration.linked) ? parentOf(member) : undefined;
  let callParent = catchParent === undefined ? undefined : parentOf(catchParent);
  let receiver = [
    ...member.arguments.slice(-1),
    ...(callParent?.type === "CallExpression" ? callParent.arguments : []),
  ];
  let hooksCall = readCommandList(registration.matcher) ?? [];
  return (
    registration.event === "command.run" &&
    !receiver.some((call) => mayRewriteNext(registration.linked, call)) &&
    hooksCall.length > 0 &&
    hooksCall.every((arg) => registeredCommands.has(arg))
  );
}
//@ chunk-5xgkngpb.js:750698-751183 placement
/**
 * 判断某名字的读取点是顶层 const 声明还是某注册的 matcher 位置。
 */
function classifyMatcherHolder(graph, scanned, node) {
  let held = scanned.climbs.heldAt(node);
  if (held === undefined) return;
  let { value, parent } = held;
  if (parent.type === "VariableDeclarator" && parent.init === value) {
    let { id } = parent;
    let kind = scanned.parentOf(parent);
    let name = kind && scanned.parentOf(kind);
    return id.type === "Identifier" &&
      kind?.type === "VariableDeclaration" &&
      kind.kind === "const" &&
      (name?.type === "Program" || name?.type === "ExportNamedDeclaration")
      ? {
          kind: "const",
          name: id.name,
        }
      : undefined;
  }
  let name = parent.type === "CallExpression" ? graph.registrations.get(parent) : undefined;
  return name !== undefined && name.matcher === value
    ? {
        kind: "matcher",
        held: name,
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:751183-751668 placement
/**
 * 生成"名字是否只被用作 matcher（密封）"的递归判断（带缓存与环检测）。
 */
function createSealedNameChecker(graph, isSealedHolder) {
  let cache = new Map();
  let inProgress = new Map();
  function isSealedName(linked, name) {
    let cached = cache.get(linked)?.get(name);
    if (inProgress.get(linked)?.has(name) === true || cached !== undefined) return cached ?? false;
    inProgress.set(linked, (inProgress.get(linked) ?? new Set()).add(name));
    let { scanned } = linked;
    let reads = scanned.names.read.get(name) ?? [];
    let sealed =
      !exportsName_2(scanned.program, name) &&
      reads.length > 0 &&
      reads.every((read) => {
        let holder = classifyMatcherHolder(graph, scanned, read);
        switch (holder?.kind) {
          case "matcher":
            return isSealedHolder(holder.held.holder, holder.held.position);
          case "const":
            return isSealedName(linked, holder.name);
          case undefined:
            return false;
        }
      });
    cache.set(linked, (cache.get(linked) ?? new Map()).set(name, sealed));
    inProgress.get(linked)?.delete(name);
    return sealed;
  }
  return isSealedName;
}
//@ chunk-5xgkngpb.js:751668-752242 placement
/**
 * 汇总扫描到的注册：注册描述、ui.render 的字面 matcher、catch 与 command.run 自有命令信息。
 */
function collectRegistrationFacts(graph) {
  let sealedNameChecker = createSealedNameChecker(graph, scanCallExpressions(graph));
  let scannedByFile = new Map();
  let registrations = [];
  let renderMatchers = [];
  let catchReads = [];
  for (let [index, registration] of graph.registrations) {
    let { event, matcher, linked } = registration;
    let { program, parentOf, names } = linked.scanned;
    let scanned = scannedByFile.get(linked) ?? {
      program,
      parentOf,
      shadowOf: names.shadowOf,
      isSealed: (name) => sealedNameChecker(linked, name),
    };
    scannedByFile.set(linked, scanned);
    let appended = appendLiteral(event, matcher, scanned);
    let isCommandRun = event === "command.run";
    registrations.push(appended);
    catchReads.push({
      registration: appended,
      pattern: event,
      hasCatch: isCatchMember(index, linked),
      isOwnCommand: isOwnCommandRunHook(index, registration, graph.registeredCommands),
      commands: (isCommandRun ? readCommandList(matcher) : undefined) ?? [],
    });
    if (event === "ui.render" && matcher !== undefined)
      renderMatchers.push({
        registration: appended,
        matcher: evaluateLiteral(matcher, scanned),
      });
  }
  return {
    registrations,
    renderMatchers,
    catchReads,
  };
}
//@ chunk-5xgkngpb.js:752242-752361 placement
/**
 * 列出只经由辅助函数间接发生的 $ 调用（按调用名排序）。
 */
function collectHelperCalls(graph, secondGraph) {
  let { via, direct } = scanRegistrations(graph, secondGraph);
  let calls = new Map();
  for (let [from, secondVia] of via) if (!direct.has(from)) calls.set(from, [...secondVia].sort());
  return calls;
}
//@ chunk-5xgkngpb.js:752361-752568 placement
/**
 * 插件校验用：加载 hooks 模块图并返回扫描结果、注册、ui.render matcher、catch 信息与辅助调用。
 */
async function scanHooksModuleForValidation(modulePath, pluginRoot, pluginName) {
  let { graph } = await loadHooksModuleGraph(modulePath, pluginRoot, pluginName);
  let { registrations, renderMatchers, catchReads } = collectRegistrationFacts(
    scanRegistrations(graph, pluginName),
  );
  return {
    scan: scanHooksModuleCached(graph, pluginName),
    registrations,
    renderMatchers,
    catchReads,
    helperCalls: collectHelperCalls(graph, pluginName),
  };
}
//@ chunk-5xgkngpb.js:752568-752818 placement
/**
 * 把模块图转成加载结果：入口源码、其余链接文件、链接关系与扫描结果。
 */
var toModuleLoadResult = (modulePath, loaded, extra) => ({
  source: loaded.source,
  linked: [...loaded.graph.files]
    .filter((file) => file[0] !== modulePath)
    .map((file) => ({
      file: file[0],
      source: file[1].source,
    })),
  links: [...loaded.graph.files].flatMap((file) =>
    [...file[1].links].map((link) => ({
      from: file[0],
      spelled: link[0],
      file: link[1],
    })),
  ),
  scan: scanHooksModuleCached(loaded.graph, extra),
});
//@ chunk-5xgkngpb.js:752818-753011 placement
/**
 * 列出模块图里入口之外的文件（含源码）及所有链接关系。
 */
var listLinkedFiles = (graph, thirdGraph) => ({
  linked: [...graph.files]
    .filter(([file]) => file !== thirdGraph)
    .map(([file, entry]) => ({
      file,
      source: entry.source,
    })),
  links: [...graph.files].flatMap(([file, entry]) =>
    [...entry.links].map(([secondFile, entry]) => ({
      from: file,
      spelled: secondFile,
      file: entry,
    })),
  ),
});
//@ chunk-5xgkngpb.js:753011-753137 placement
/**
 * 扫描 hooks 模块：有构建内置的扫描结果则直接用，否则加载模块图并扫描。
 */
async function scanHooksModule(modulePath, pluginRoot, pluginName) {
  let sealed = builtinSourceRegistry.scan(modulePath);
  return sealed === undefined
    ? toModuleLoadResult(
        modulePath,
        await loadHooksModuleGraph(modulePath, pluginRoot, pluginName),
        pluginName,
      )
    : {
        source: "",
        linked: [],
        links: [],
        scan: sealed,
      };
}
//@ chunk-5xgkngpb.js:753227-753394 placement
/**
 * 为密封插件创建模块解析器：只从给定文本表里取源码，找不到时报错。
 */
var createSealedResolver = (pluginRoot, pluginName, texts) => async (specifier, fromFile) => {
  for (let candidate of candidateSourcePaths(resolveImportSpec(specifier, fromFile))) {
    let source = texts.get(relative(pluginRoot, candidate).split(sep).join("/"));
    if (source !== undefined)
      return {
        file: candidate,
        source,
      };
  }
  throw bareImportError(pluginName, specifier, relative(pluginRoot, fromFile) || fromFile);
};
//@ chunk-5xgkngpb.js:753394-753716 placement
/**
 * 用密封文本（组织下发的插件）构建模块图并扫描，入口不在文本表中时报错。
 */
async function scanSealedHooksModule(options) {
  let source = options.texts.get(relative(options.pluginRoot, options.modulePath).split(sep).join("/"));
  if (source === undefined) throw bareImportError(options.pluginName, options.modulePath, options.pluginName);
  return toModuleLoadResult(
    options.modulePath,
    {
      source,
      graph: await buildModuleGraph(
        {
          file: options.modulePath,
          source,
          root: options.pluginRoot,
        },
        options.pluginName,
        createSealedResolver(options.pluginRoot, options.pluginName, options.texts),
      ),
    },
    options.pluginName,
  );
}
//@ chunk-5xgkngpb.js:753716-753762 layout
var getHooksModuleScan = async (modulePath, pluginRoot, pluginName) =>
  (await scanHooksModule(modulePath, pluginRoot, pluginName)).scan;
//@ chunk-5xgkngpb.js:753762-754118 placement
/**
 * 非内置插件的遥测钩子落在 anthropic 流上时返回拒绝说明（应指定 to: "collector"）。
 */
function telemetryStreamRefusal(scan, ctx) {
  if (!(!ctx.isBuiltin && scan.telemetry?.includes(ANTHROPIC) === true)) return;
  return `its hooks stand on the telemetry stream "${ANTHROPIC}" (a matcher names it, or a telemetry hook names no "to" and so stands on every stream), which is for the plugins built into the CLI; name the collector on each telemetry hook: on("telemetry.log", { to: "collector" }, hook)`;
}
//@ chunk-5xgkngpb.js:754118-754190 placement
/**
 * 遥测引用摘要
 */
function telemetryRefSummary(scan) {
  let joined = scan.telemetry?.join(", ");
  return joined === "" ? "nothing" : joined;
}
export {
  scanHooksModuleForValidation,
  telemetryRefSummary,
  telemetryStreamRefusal,
  listLinkedFiles,
  scanHooksModule,
  scanSealedHooksModule,
  getHooksModuleScan,
};
