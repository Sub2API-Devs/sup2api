/**
 * plugins/functionHooks/eventPatterns.ts
 *
 * 2.1.316 新增：校验导出声明（不能被重新赋值等）；把标识符解析为本地或导入的函数等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6sf70a86.js (59)
 * attribution: placement 59
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../assets/state-library.js-wy8y4843.txt" with { type: "text" };
import { IDENTIFIER_PATTERN_SOURCE } from "./hookApiSurface.js";
import { HooksError } from "./hooksErrors.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { CLAUDE_CODE } from "./moduleLoader.js";
import { declaredNames, exportNameText } from "./moduleScan.js";
import { readStaticString, describeArgument } from "./clientSurfaceScan.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6sf70a86.js:39589-39622 placement
var regExp_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6sf70a86.js:39589", () => {
  regExp_2 = new RegExp(`^${IDENTIFIER_PATTERN_SOURCE}$`, "u");
});
//@ chunk-6sf70a86.js:39622-39680 placement
/**
 * 字符串是否为事件模式（*、前缀.*、!）。
 */
var isEventPattern = (pattern) => pattern === "*" || pattern.endsWith(".*") || pattern.startsWith("!");
//@ chunk-6sf70a86.js:39680-39719 placement
/**
 * telemetry.* 事件
 */
var isTelemetryEvent = (event) => event.startsWith("telemetry.");
//@ chunk-6sf70a86.js:39719-40300 placement
/**
 * 校验事件名或模式，返回错误说明。
 */
function validateEventPattern(pattern) {
  if (typeof pattern !== "string") return `${typeof pattern} is not an event name or a pattern (a string)`;
  let isNegated = pattern.startsWith("!");
  let body = isNegated ? pattern.slice(1) : pattern;
  if (isNegated && body === "*") return `"${pattern}" is not a pattern: it selects no event`;
  if (isNegated && body.startsWith("!")) return `"${pattern}" is not a pattern: "!" negates once`;
  let isEvery = body === "*";
  let isPrefix = body.endsWith(".*");
  let parts = (isPrefix ? body.slice(0, -2) : body).split(".");
  if (!(isEvery || parts.every((problem) => regExp_2.test(problem))))
    return `"${pattern}" is not an event name or a pattern ("*", "<prefix>.*", or "!" before either)`;
  return {
    isNegated,
    selection: isEvery
      ? {
          kind: "every",
        }
      : isPrefix
        ? {
            kind: "prefix",
            prefix: parts.join("."),
          }
        : {
            kind: "name",
            name: body,
          },
  };
}
//@ chunk-6sf70a86.js:40300-40375 placement
/**
 * 校验并返回模式
 */
function requireEventPattern(pattern) {
  let problem = validateEventPattern(pattern);
  if (typeof problem === "string") throw new HooksError(problem);
  return problem;
}
//@ chunk-6sf70a86.js:40375-40451 placement
/**
 * 精确名前缀
 */
function nameOfEventPattern(pattern) {
  let { selection } = requireEventPattern(pattern);
  return selection.kind === "name" ? selection.name : undefined;
}
//@ chunk-6sf70a86.js:40451-40515 placement
/**
 * 校验失败文本
 */
function eventPatternError(pattern) {
  let problem = validateEventPattern(pattern);
  return typeof problem === "string" ? problem : undefined;
}
//@ chunk-6sf70a86.js:40515-40701 placement
/**
 * 事件名是否匹配模式（支持取反、前缀、精确）。
 */
function matchesEventPattern(pattern, event) {
  let { isNegated, selection } = requireEventPattern(pattern);
  let matched;
  switch (selection.kind) {
    case "every":
      matched = true;
      break;
    case "prefix":
      matched = event.startsWith(`${selection.prefix}.`);
      break;
    case "name":
      matched = event === selection.name;
      break;
  }
  return isNegated ? !matched : matched;
}
//@ chunk-6sf70a86.js:40701-40761 placement
/**
 * 是否路由给用户
 */
function routesToUser(scan, event) {
  return (scan.toUserOn ?? []).some((pattern) => matchesEventPattern(pattern, event));
}
//@ chunk-6sf70a86.js:40761-40816 placement
/**
 * 按插件是否内置判断是否可监听 telemetry.* 事件。
 */
var matchesEventForPlugin = (event, event_2, plugin) =>
  matchesEventPattern(event, event_2) &&
  (plugin.isBuiltin || !isTelemetryEvent(event_2) || isTelemetryEvent(event));
//@ chunk-6sf70a86.js:40816-40882 placement
/**
 * Spread/computed/非 init
 */
var isUnsupportedExportShape = (property) =>
  property.type === "SpreadElement" || property.computed || property.kind !== "init";
//@ chunk-6sf70a86.js:40882-41002 placement
/**
 * AST 节点是否为名为 o 的对象属性（标识符或字面量键）。
 */
var isNamedProperty = (property, name) =>
  property.type === "Property" &&
  ((property.key.type === "Identifier" && property.key.name === name) ||
    (property.key.type === "Literal" && property.key.value === name));
//@ chunk-6sf70a86.js:41002-41309 placement
/**
 * 从字面量/数组字面量取字符串列表。
 */
function literalStrings(node) {
  switch (node.type) {
    case "Literal": {
      let value = node.value;
      return typeof value === "string" ? [value] : undefined;
    }
    case "ArrayExpression": {
      let mapped = node.elements.map((element) => {
        let secondElement = element?.type === "Literal" ? element.value : undefined;
        return typeof secondElement === "string" ? secondElement : undefined;
      });
      return mapped.every((element) => element !== undefined)
        ? mapped.filter((result) => result !== undefined)
        : undefined;
    }
    default:
      return;
  }
}
//@ chunk-6sf70a86.js:41309-41683 placement
/**
 * 从 AST 读取 command 字段列表。
 */
function readCommandList(matcher) {
  switch (matcher?.type) {
    case "ObjectExpression": {
      let filtered = matcher.properties.filter((property) => isNamedProperty(property, "command"));
      let any = matcher.properties.some(isUnsupportedExportShape);
      let [commandProperty] = filtered;
      return !any && filtered.length === 1 && commandProperty?.type === "Property"
        ? literalStrings(commandProperty.value)
        : undefined;
    }
    case "ArrayExpression": {
      let mapped = matcher.elements.map((element) =>
        element === null || element.type === "SpreadElement" ? undefined : readCommandList(element),
      );
      return mapped.every((commandProperty) => commandProperty !== undefined)
        ? mapped.flatMap((commands) => commands ?? [])
        : undefined;
    }
    default:
      return;
  }
}
//@ chunk-6sf70a86.js:41683-41889 placement
/**
 * 扫描中所有 command.run 注册的 matcher 都能静态读出命令名时，返回排序去重的命令列表，否则 undefined。
 */
function collectRunCommands(graph) {
  let filtered = [...graph.registrations.values()].filter((registration) =>
    matchesEventPattern(registration.event, "command.run"),
  );
  let mapped = filtered.map((registration) => readCommandList(registration.matcher));
  return filtered.length > 0 && mapped.every((rows) => rows !== undefined)
    ? normalizeCaseForComparison_2(mapped.flatMap((row) => row ?? [])).toSorted()
    : undefined;
}
//@ chunk-6sf70a86.js:41889-41941 placement
/**
 * atom/derive/memberOf/read/update
 */
var STATE_LIB_EXPORTS = ["atom", "derive", "memberOf", "read", "update"];
//@ chunk-6sf70a86.js:41941-41964 placement
/**
 * 内嵌的 state-library.js 源码文本
 */
var stateLibrarySourceText = __cc_resource_0;
//@ chunk-6sf70a86.js:41964-41975 placement
/**
 * 内嵌资源别名
 */
var STATE_RESOURCE = stateLibrarySourceText;
//@ chunk-6sf70a86.js:41975-42189 placement
/**
 * 若调用的是从 claude-code 导入且未被遮蔽的状态库函数（atom/derive/memberOf/read/update），返回其名。
 */
function stateLibraryCallKind(scanned, call) {
  let { callee } = call;
  if (callee.type !== "Identifier" || call.optional) return;
  let imported = scanned.imports.get(callee.name);
  let found = STATE_LIB_EXPORTS.find((name) => name === imported?.imported);
  return imported?.specifier === CLAUDE_CODE &&
    found !== undefined &&
    scanned.names.shadowOf(callee) === undefined
    ? found
    : undefined;
}
//@ chunk-6sf70a86.js:42189-42240 placement
/**
 * envReads / envWrites
 */
var envScannerField = (scan, op) => (op === "env.get" ? scan.envReads : scan.envWrites);
//@ chunk-6sf70a86.js:42240-42363 placement
/**
 * 取扫描图中已链接的文件，不在图中时抛错。
 */
function requireLinkedFile({ graph, pluginName }, file) {
  let entry = graph.files.get(file);
  if (entry === undefined) throw new HooksError(`${pluginName}: ${file} was not linked`);
  return entry;
}
//@ chunk-6sf70a86.js:42363-42624 placement
function followReExportLink(graph, from, name) {
  let { scan, linked } = graph;
  let link = linked.links.get(from);
  if (link === undefined)
    throw linked.scanned.refuse(
      undefined,
      `"${name}" is looked for through a re-export from "${from}", which is not a file of the module's own: nothing is followed through it`,
    );
  return {
    scan,
    linked: requireLinkedFile(scan, link),
  };
}
//@ chunk-6sf70a86.js:42624-43298 placement
/**
 * 收集模块自身的导出表（命名、命名空间、星号）。
 */
function collectOwnExports(graph) {
  let { scan, linked } = graph;
  let cached = scan.ownExports.get(linked);
  if (cached !== undefined) return cached;
  let named = new Map();
  let specifiers = new Map();
  let namespaces = new Map();
  let stars = [];
  let foreign = [];
  for (let statement of linked.scanned.program.body) {
    if (statement.type === "ExportDefaultDeclaration") named.set("default", statement);
    if (statement.type === "ExportNamedDeclaration") {
      for (let name of declaredNames(statement.declaration)) named.set(name, statement);
      for (let specifier of statement.specifiers) {
        named.set(exportNameText(specifier.exported), statement);
        specifiers.set(exportNameText(specifier.exported), specifier);
      }
    }
    if (statement.type !== "ExportAllDeclaration") continue;
    let { exported } = statement;
    let target = linked.links.get(String(statement.source.value));
    if (exported !== null && exported !== undefined) {
      namespaces.set(exportNameText(exported), statement);
      continue;
    }
    if (target === undefined) foreign.push(statement);
    else
      stars.push({
        from: linked,
        statement,
        to: requireLinkedFile(scan, target),
      });
  }
  let importFacts = {
    named,
    listed: specifiers,
    namespaces,
    stars,
    foreign,
  };
  scan.ownExports.set(linked, importFacts);
  return importFacts;
}
//@ chunk-6sf70a86.js:43298-43312 placement
/**
 * 500000
 */
var MAX_EXPORT_RESOLVE_STEPS = 500000;
//@ chunk-6sf70a86.js:43312-43626 placement
/**
 * 记录导出解析步数，超过上限时拒绝。
 */
function chargeExportSteps(graph, steps) {
  let { scan, linked } = graph;
  scan.exportSteps.taken += steps;
  if (scan.exportSteps.taken > MAX_EXPORT_RESOLVE_STEPS)
    throw linked.scanned.refuse(
      undefined,
      `the re-exports of "${scan.pluginName}" took ${scan.exportSteps.taken} steps to follow, more than the ${MAX_EXPORT_RESOLVE_STEPS} a scan allows: write fewer \`export *\`, or import each name from the file that declares it`,
    );
}
//@ chunk-6sf70a86.js:43626-43946 placement
/**
 * 把导出名解析为顶层函数声明。
 */
function resolveExportedFunction(graph, exported, name) {
  let { names, refuse } = graph.scanned;
  let label = name === "default" ? "the default export" : name;
  let localName = exportNameText(exported.local);
  let declaration = names.functions.get(localName);
  if (declaration === undefined)
    throw refuse(
      exported,
      `${label} is exported as "${localName}", which is not a function declared at the top of this file`,
    );
  if (names.assigned.has(localName))
    throw refuse(exported, `${label} ("${localName}") is assigned to elsewhere`);
  return declaration;
}
//@ chunk-6sf70a86.js:43946-45210 placement
/**
 * 校验导出声明（不能被重新赋值等）。
 */
function checkExportDeclaration(graph, declaration, name) {
  let { names, refuse } = graph.scanned;
  let { functions, assigned } = names;
  let label = name === "default" ? "the default export" : name;
  function declareOne(name, declaration) {
    if (assigned.has(name)) throw refuse(declaration, `${label} ("${name}") is assigned to elsewhere`);
  }
  if (declaration.type === "ExportDefaultDeclaration" && name === "default") {
    let { declaration: declaration_2 } = declaration;
    if (declaration_2.type === "FunctionDeclaration") {
      if (declaration_2.id !== null) declareOne(declaration_2.id.name, declaration_2);
      return declaration_2;
    }
    if (declaration_2.type === "FunctionExpression" || declaration_2.type === "ArrowFunctionExpression")
      return declaration_2;
    let secondDeclaration =
      declaration_2.type === "Identifier" ? functions.get(declaration_2.name) : undefined;
    if (secondDeclaration === undefined || declaration_2.type !== "Identifier")
      throw refuse(
        declaration_2,
        `${label} is something other than a function declared at the top of this file`,
      );
    declareOne(declaration_2.name, declaration_2);
    return secondDeclaration;
  }
  if (declaration.type !== "ExportNamedDeclaration") return;
  let { declaration: declaration_2 } = declaration;
  if (declaration_2?.type === "FunctionDeclaration" && declaration_2.id.name === name) {
    declareOne(name, declaration_2);
    return declaration_2;
  }
  if (declaration_2?.type === "VariableDeclaration") {
    for (let declaration of declaration_2.declarations)
      if (declaration.id.type === "Identifier" && declaration.id.name === name) {
        let { init } = declaration;
        if (
          declaration_2.kind === "const" &&
          (init?.type === "FunctionExpression" || init?.type === "ArrowFunctionExpression")
        )
          return init;
        throw refuse(declaration, `${label} is exported as something other than a const function`);
      }
  }
  if (declaredNames(declaration_2).includes(name))
    throw refuse(
      declaration,
      `${label} is exported as something other than a function declared at the top of this file`,
    );
  let exported = declaration.specifiers.find((specifier) => exportNameText(specifier.exported) === name);
  return exported !== undefined && declaration.source === null
    ? resolveExportedFunction(graph, exported, name)
    : undefined;
}
//@ chunk-6sf70a86.js:45210-45853 placement
/**
 * 解析命名导出（拒绝命名空间导出）。
 */
function resolveNamedExport(graph, name, readExport) {
  let { linked } = graph;
  let ownExports = collectOwnExports(graph);
  let specifier = ownExports.named.get(name);
  let namespace = ownExports.namespaces.get(name);
  if (namespace !== undefined)
    throw linked.scanned.refuse(
      namespace,
      `${name === "default" ? "the default export" : name} is the namespace of "${String(namespace.source.value)}" (export * as), not a function`,
    );
  let secondNamespace = ownExports.listed.get(name);
  let source = specifier?.type === "ExportNamedDeclaration" ? specifier.source : null;
  if (secondNamespace !== undefined && source !== null && source !== undefined)
    return readExport(
      followReExportLink(graph, String(source.value), name),
      exportNameText(secondNamespace.local),
    );
  if (secondNamespace !== undefined)
    return {
      fn: resolveExportedFunction(linked, secondNamespace, name),
      linked,
    };
  let declaration = specifier?.type === "ExportNamedDeclaration" ? specifier.declaration : undefined;
  let value = declaration?.type === "VariableDeclaration";
  chargeExportSteps(graph, value ? declaration.declarations.length : 0);
  let secondValue = specifier === undefined ? undefined : checkExportDeclaration(linked, specifier, name);
  return secondValue === undefined
    ? undefined
    : {
        fn: secondValue,
        linked,
      };
}
//@ chunk-6sf70a86.js:45853-45907 placement
/**
 * Map<k, Set> 追加
 */
var addToSetInMap = (map, key, value) => {
  map.set(key, (map.get(key) ?? new Set()).add(value));
};
//@ chunk-6sf70a86.js:45907-46436 placement
/**
 * 沿 export * 链构建完整导出表。
 */
function buildExportTable(graph) {
  let { scan, linked } = graph;
  let cached = scan.exportTables.get(linked);
  if (cached !== undefined) return cached;
  let givers = new Map();
  let parents = new Map();
  let wild = [];
  let seen = new Set([linked]);
  let queue = [linked];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    let ownExports = collectOwnExports({
      scan,
      linked: file,
    });
    let keys = file === linked ? [] : [...ownExports.named.keys(), ...ownExports.namespaces.keys()];
    chargeExportSteps(graph, ownExports.stars.length + keys.length + 1);
    if (ownExports.foreign.length > 0) wild.push(file);
    for (let name of keys)
      if (name !== "default") givers.set(name, (givers.get(name) ?? new Set()).add(file));
    for (let star of ownExports.stars) {
      addToSetInMap(parents, star.to, star);
      if (!seen.has(star.to)) {
        seen.add(star.to);
        queue.push(star.to);
      }
    }
  }
  let table = {
    givers,
    parents,
    wild,
  };
  scan.exportTables.set(linked, table);
  return table;
}
//@ chunk-6sf70a86.js:46436-46685 placement
function collectReExportGivers(graph, name) {
  let exportTable = buildExportTable(graph);
  let givers = new Map();
  let seen = new Set();
  let queue = [...(exportTable.givers.get(name) ?? []), ...exportTable.wild];
  for (let link = queue.pop(); link !== undefined; link = queue.pop()) {
    let table = seen.has(link) ? [] : [...(exportTable.parents.get(link) ?? [])];
    seen.add(link);
    chargeExportSteps(graph, table.length + 1);
    for (let link of table) {
      addToSetInMap(givers, link.from, link);
      queue.push(link.from);
    }
  }
  return givers;
}
//@ chunk-6sf70a86.js:46685-47397 placement
/**
 * 沿重新导出链查找名字。
 */
function followReExport(graph, name, readExport) {
  let { scan } = graph;
  let reExportGivers = collectReExportGivers(graph, name);
  let visited = new Set();
  function visit(linked) {
    let subGraph = {
      scan,
      linked,
    };
    let ownExports = collectOwnExports(subGraph);
    let wasVisited = visited.has(linked);
    visited.add(linked);
    chargeExportSteps(graph, 1);
    if (wasVisited) return;
    if (ownExports.named.has(name)) return resolveNamedExport(subGraph, name, readExport);
    let namespace = ownExports.namespaces.get(name);
    let candidates = [
      ...[...(namespace === undefined ? [] : [namespace]), ...ownExports.foreign].map((statement) => ({
        statement,
        to: undefined,
      })),
      ...(reExportGivers.get(linked) ?? []),
    ].toSorted((a, b) => a.statement.start - b.statement.start);
    let found;
    chargeExportSteps(graph, candidates.length);
    for (let { statement, to } of candidates) {
      let candidate =
        statement.exported !== null && statement.exported !== undefined
          ? resolveNamedExport(subGraph, name, readExport)
          : visit(to ?? followReExportLink(subGraph, String(statement.source.value), name).linked);
      if (candidate !== undefined && found !== undefined && candidate.fn !== found.fn)
        throw linked.scanned.refuse(
          statement,
          `${name} is given by more than one \`export *\` of this file, each from a different declaration: the engine binds neither`,
        );
      found = candidate ?? found;
    }
    return found;
  }
  return visit(graph.linked);
}
//@ chunk-6sf70a86.js:47397-47686 placement
function resolveExport(graph, name, readExport) {
  let ownExports = collectOwnExports(graph);
  let hasNamespace = ownExports.namespaces.has(name);
  if (ownExports.named.has(name) || (name === "default" && hasNamespace))
    return resolveNamedExport(graph, name, readExport);
  if (name === "default") return;
  let exportTable = buildExportTable(graph);
  let resolved = exportTable.givers.get(name) ?? new Set();
  let [secondResolved] = resolved;
  if (!(!hasNamespace && exportTable.wild.length === 0 && resolved.size <= 1))
    return followReExport(graph, name, readExport);
  if (secondResolved === undefined) return;
  return resolveNamedExport(
    {
      scan: graph.scan,
      linked: secondResolved,
    },
    name,
    readExport,
  );
}
//@ chunk-6sf70a86.js:47686-48244 placement
/**
 * 带缓存地解析导出（处理循环）。
 */
function readExportCached(graph, name) {
  let { scan, linked } = graph;
  let { exportsOpen, exportsUnderWay, exportsHeld } = scan;
  let readBefore = scan.exportsRead.get(linked) ?? new Map();
  let heldBefore = exportsHeld.get(linked) ?? new Map();
  let entry = exportsOpen.get(linked) ?? new Map();
  let deps = entry.get(name);
  let heldResult = heldBefore.get(name);
  if (readBefore.has(name)) return readBefore.get(name);
  if (heldResult !== undefined || deps !== undefined) {
    exportsUnderWay.lowest = Math.min(exportsUnderWay.lowest, deps ?? 0);
    return heldResult?.found;
  }
  let { depth, lowest } = exportsUnderWay;
  chargeExportSteps(graph, 1);
  exportsUnderWay.depth = depth + 1;
  exportsUnderWay.lowest = depth;
  exportsOpen.set(linked, entry.set(name, depth));
  exportsHeld.set(linked, heldBefore);
  scan.exportsRead.set(linked, readBefore);
  try {
    let value = resolveExport(graph, name, readExportCached);
    if (exportsUnderWay.lowest === depth) readBefore.set(name, value);
    else
      heldBefore.set(name, {
        found: value,
      });
    return value;
  } finally {
    exportsUnderWay.lowest = Math.min(lowest, exportsUnderWay.lowest);
    exportsUnderWay.depth = depth;
    entry.delete(name);
    if (depth === 0) {
      exportsOpen.clear();
      exportsHeld.clear();
    }
  }
}
//@ chunk-6sf70a86.js:48244-48594 placement
/**
 * 把标识符解析为本地顶层函数（禁止重新赋值与遮蔽）。
 */
function resolveLocalFunction(reference, { names, refuse, what }) {
  let declaration = names.functions.get(reference.name);
  if (declaration === undefined) return;
  if (names.assigned.has(reference.name))
    throw refuse(reference, `${what} "${reference.name}" is assigned to elsewhere`);
  let problem = names.shadowOf(reference);
  if (problem !== undefined)
    throw refuse(
      problem,
      `${what} "${reference.name}" is declared more than once in this file: this declaration hides the top-level function where it is used`,
    );
  return declaration;
}
//@ chunk-6sf70a86.js:48594-49693 placement
/**
 * 把标识符解析为本地或导入的函数。
 */
function resolveFunctionReference({ scan, linked }, reference, scope) {
  let { scanned } = linked;
  let localFunction = resolveLocalFunction(reference, {
    names: scanned.names,
    refuse: scanned.refuse,
    what: scope,
  });
  if (localFunction !== undefined)
    return {
      fn: localFunction,
      linked,
    };
  let local = scanned.imports.get(reference.name);
  if (local === undefined)
    throw scanned.refuse(
      reference,
      `${scope} "${reference.name}" is not a function declared at the top of this file (a function declaration, or a const bound to a function), nor imported from one of the module's own files`,
    );
  if (local.imported === undefined)
    throw scanned.refuse(reference, `${scope} "${reference.name}" is a namespace import, not a function`);
  if (scanned.names.assigned.has(reference.name))
    throw scanned.refuse(reference, `${scope} "${reference.name}" is assigned to elsewhere`);
  let target = scanned.names.shadowOf(reference);
  if (target !== undefined)
    throw scanned.refuse(
      target,
      `${scope} "${reference.name}" is declared again in this file, shadowing the import`,
    );
  let name = linked.links.get(local.specifier);
  if (name === undefined)
    throw scanned.refuse(
      reference,
      `${scope} "${reference.name}" is imported from "${local.specifier}", which is not a file of the module's own`,
    );
  let value = readExportCached(
    {
      scan,
      linked: requireLinkedFile(scan, name),
    },
    local.imported,
  );
  if (value === undefined)
    throw scanned.refuse(
      reference,
      `${scope} "${reference.name}" is imported from "${local.specifier}", which exports no function of that name: neither its own nor one it re-exports from a file of the module's own`,
    );
  return value;
}
//@ chunk-6sf70a86.js:49693-49948 placement
function readNamedLiteralArg(call) {
  let [arg] = call.arguments;
  let properties = arg?.type === "ObjectExpression" ? arg.properties : [];
  let any = properties.some(isUnsupportedExportShape);
  let [nameProperty, secondName] = properties.filter((property) => isNamedProperty(property, "name"));
  let value =
    !any && secondName === undefined && nameProperty?.type === "Property" ? nameProperty.value : undefined;
  let other = value?.type === "Literal" ? value.value : undefined;
  return typeof other === "string" ? other : undefined;
}
//@ chunk-6sf70a86.js:49948-50019 placement
/**
 * 记录具名命令
 */
function recordNamedCommand(state, call) {
  let namedLiteralArg = readNamedLiteralArg(call);
  if (namedLiteralArg !== undefined) state.registeredCommands.add(namedLiteralArg);
}
//@ chunk-6sf70a86.js:50019-50247 placement
/**
 * 记录扫描到的 $.state.get/set 调用及其引用常量。
 */
function recordStateCall(state, { call, spelling, named, consts }, scanned) {
  let secondScanned = `${named.plugin}\x00${named.key}`;
  (spelling === "state.get" ? state.stateReads : state.stateWrites).set(secondScanned, named);
  state.stateCalls.add(call);
  for (let followed of consts)
    state.stateConsts.add({
      followed,
      spelling,
      scanned,
    });
}
//@ chunk-6sf70a86.js:50247-50273 placement
var COMMAND_REGISTER = "command.register";
//@ chunk-6sf70a86.js:50273-50571 placement
var DOLLAR_USE_DESCRIPTIONS = {
  VariableDeclarator: "bound to a name",
  AssignmentExpression: "assigned",
  SpreadElement: "spread",
  ReturnStatement: "returned",
  ArrowFunctionExpression: "returned",
  Property: "put in an object",
  ArrayExpression: "put in an array",
  ChainExpression: "optionally chained",
  TemplateLiteral: "put in a template",
};
//@ chunk-6sf70a86.js:50571-50740 placement
/**
 * 描述 $ 在 AST 中的用法（被调用、作为参数、赋值、展开等），用于扫描报错。
 */
function describeDollarUse(use, callee) {
  if (!(use.type === "CallExpression" || use.type === "NewExpression"))
    return DOLLAR_USE_DESCRIPTIONS[use.type] ?? `used in a ${use.type}`;
  return use.callee === callee ? "called" : "passed as an argument";
}
//@ chunk-6sf70a86.js:50740-50756 placement
var PLUGIN = "plugin";
//@ chunk-6sf70a86.js:50756-50785 placement
/**
 * env.get/env.set
 */
var ENV_API_CALLS = ["env.get", "env.set"];
//@ chunk-6sf70a86.js:50785-50813 placement
/**
 * 是否 env 调用
 */
var isEnvApiCall = (op) => ENV_API_CALLS.includes(op);
//@ chunk-6sf70a86.js:50813-50846 placement
/**
 * state.get/state.set
 */
var STATE_API_CALLS = ["state.get", "state.set"];
//@ chunk-6sf70a86.js:50846-50874 placement
/**
 * 是否为保留名。
 */
var isReservedHookName = (op) => STATE_API_CALLS.includes(op);
//@ chunk-6sf70a86.js:50874-50927 placement
/**
 * 标识符或 JSON 引号
 */
var quoteIfNeeded = (text) => (/^[\w$@-]+$/.test(text) ? text : JSON.stringify(text));
//@ chunk-6sf70a86.js:50927-50971 placement
/**
 * 状态原子键字符串（plugin.key）。
 */
var stateAtomKey = (key) => `${quoteIfNeeded(key.plugin)}.${quoteIfNeeded(key.key)}`;
//@ chunk-6sf70a86.js:50971-51014 placement
/**
 * 用空实现探测钩子回调。
 */
var probeHookCallback = (probe) =>
  probe(
    () => false,
    (onValue, value) => value(),
    (onStale) => onStale(),
  );
//@ chunk-6sf70a86.js:51014-51091 placement
/**
 * 字符串是否形如 name@builtin。
 */
var isBuiltinSuffixed = (pluginStorageId) =>
  pluginStorageId.endsWith("@builtin") &&
  pluginStorageId.indexOf("@") === pluginStorageId.length - 8 &&
  pluginStorageId.length > 8;
//@ chunk-6sf70a86.js:51091-51111 placement
var ANTHROPIC = "anthropic";
//@ chunk-6sf70a86.js:51111-51144 placement
/**
 * anthropic/collector
 */
var CORE_SOURCES = ["anthropic", "collector"];
//@ chunk-6sf70a86.js:51144-51171 placement
/**
 * 是否核心来源
 */
var isCoreSource = (source) => CORE_SOURCES.includes(source);
//@ chunk-6sf70a86.js:51171-51186 placement
/**
 * 核心来源标识 "core"。
 */
var CORE_ORIGIN = "core";
//@ chunk-6sf70a86.js:51186-51220 placement
/**
 * 最后一个扣留者
 */
var topWithholder = (entry) => entry.withheldBy?.at(-1);
//@ chunk-6sf70a86.js:51220-51272 placement
/**
 * 被插件移除的说明
 */
var removedByPluginText = (spelling, plugin) => `$.${spelling}: removed by plugin \`${plugin}\``;
//@ chunk-6sf70a86.js:51272-51377 placement
/**
 * 列出 hooks 模块及其界面模块的全部文件（入口与链接文件，含源码）。
 */
var hooksModuleFiles = (hooksModule) =>
  [hooksModule, ...(hooksModule.surfaceModules ?? [])].flatMap((surfaceModule) => [
    {
      file: surfaceModule.modulePath,
      source: surfaceModule.source,
    },
    ...surfaceModule.linked,
  ]);
//@ chunk-6sf70a86.js:51377-51628 placement
/**
 * $.env.get/set 的第一个参数必须是字面量字符串，返回之，否则抛扫描错误。
 */
function readLiteralEnvName(call, name, refuse) {
  let [arg] = call.arguments;
  let secondName = arg !== undefined && arg.type !== "SpreadElement" ? readStaticString(arg) : undefined;
  if (secondName === undefined)
    throw refuse(
      arg ?? call,
      `$.${name} takes a literal name as its first argument, so the variables a module reads and writes can be listed (got ${describeArgument(arg)})`,
    );
  return secondName;
}
export {
  stateAtomKey,
  matchesEventPattern,
  isBuiltinSuffixed,
  CORE_ORIGIN,
  isEventPattern,
  eventPatternError,
  nameOfEventPattern,
  matchesEventForPlugin,
  hooksModuleFiles,
  readCommandList,
  ANTHROPIC,
  removedByPluginText,
  isEnvApiCall,
  isReservedHookName,
  PLUGIN,
  readLiteralEnvName,
  COMMAND_REGISTER,
  describeDollarUse,
  resolveFunctionReference,
  envScannerField,
  recordNamedCommand,
  recordStateCall,
  stateLibraryCallKind,
  checkExportDeclaration,
  requireLinkedFile,
  CORE_SOURCES,
  isCoreSource,
  isNamedProperty,
  isTelemetryEvent,
  collectRunCommands,
  STATE_RESOURCE,
  probeHookCallback,
  routesToUser,
  topWithholder,
};
