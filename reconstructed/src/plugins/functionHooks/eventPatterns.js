/**
 * plugins/functionHooks/eventPatterns.ts
 *
 * 2.1.316 新增：校验导出声明（不能被重新赋值等）；把标识符解析为本地或导入的函数等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bfnfj4kx.js (59)
 * attribution: placement 59
 */
import __cc_resource_0 from "../../../assets/state-library.js-wy8y4843.txt" with { type: "text" };
import { IDENTIFIER_PATTERN_SOURCE } from "./hookApiSurface.js";
import { HooksError } from "./hooksErrors.js";
import { uniq } from "../../utils/collections.js";
import { CLAUDE_CODE } from "./moduleLoader.js";
import { declaredNames, exportNameText } from "./moduleScan.js";
import { readStaticString, describeArgument } from "./clientSurfaceScan.js";

//@ chunk-bfnfj4kx.js:39545-39578 placement
var regExp_2 = new RegExp(`^${IDENTIFIER_PATTERN_SOURCE}$`, "u");
//@ chunk-bfnfj4kx.js:39578-39636 placement
/**
 * 字符串是否为事件模式（*、前缀.*、!）。
 */
var isEventPattern = (e) => e === "*" || e.endsWith(".*") || e.startsWith("!");
//@ chunk-bfnfj4kx.js:39636-39675 placement
/**
 * telemetry.* 事件
 */
var isTelemetryEvent = (e) => e.startsWith("telemetry.");
//@ chunk-bfnfj4kx.js:39675-40256 placement
/**
 * 校验事件名或模式，返回错误说明。
 */
function validateEventPattern(e) {
  if (typeof e !== "string") return `${typeof e} is not an event name or a pattern (a string)`;
  let o = e.startsWith("!");
  let t = o ? e.slice(1) : e;
  if (o && t === "*") return `"${e}" is not a pattern: it selects no event`;
  if (o && t.startsWith("!")) return `"${e}" is not a pattern: "!" negates once`;
  let r = t === "*";
  let n = t.endsWith(".*");
  let parts = (n ? t.slice(0, -2) : t).split(".");
  if (!(r || parts.every((i) => regExp_2.test(i))))
    return `"${e}" is not an event name or a pattern ("*", "<prefix>.*", or "!" before either)`;
  return {
    isNegated: o,
    selection: r
      ? {
          kind: "every",
        }
      : n
        ? {
            kind: "prefix",
            prefix: parts.join("."),
          }
        : {
            kind: "name",
            name: t,
          },
  };
}
//@ chunk-bfnfj4kx.js:40256-40331 placement
/**
 * 校验并返回模式
 */
function requireEventPattern(e) {
  let o = validateEventPattern(e);
  if (typeof o === "string") throw new HooksError(o);
  return o;
}
//@ chunk-bfnfj4kx.js:40331-40407 placement
/**
 * 精确名前缀
 */
function nameOfEventPattern(e) {
  let { selection } = requireEventPattern(e);
  return selection.kind === "name" ? selection.name : undefined;
}
//@ chunk-bfnfj4kx.js:40407-40471 placement
/**
 * 校验失败文本
 */
function eventPatternError(e) {
  let o = validateEventPattern(e);
  return typeof o === "string" ? o : undefined;
}
//@ chunk-bfnfj4kx.js:40471-40657 placement
/**
 * 事件名是否匹配模式（支持取反、前缀、精确）。
 */
function matchesEventPattern(e, o) {
  let { isNegated, selection } = requireEventPattern(e);
  let n;
  switch (selection.kind) {
    case "every":
      n = true;
      break;
    case "prefix":
      n = o.startsWith(`${selection.prefix}.`);
      break;
    case "name":
      n = o === selection.name;
      break;
  }
  return isNegated ? !n : n;
}
//@ chunk-bfnfj4kx.js:40657-40717 placement
/**
 * 是否路由给用户
 */
function routesToUser(scan, o) {
  return (scan.toUserOn ?? []).some((t) => matchesEventPattern(t, o));
}
//@ chunk-bfnfj4kx.js:40717-40772 placement
/**
 * 按插件是否内置判断是否可监听 telemetry.* 事件。
 */
var matchesEventForPlugin = (pattern, o, t) =>
  matchesEventPattern(pattern, o) && (t.isBuiltin || !isTelemetryEvent(o) || isTelemetryEvent(pattern));
//@ chunk-bfnfj4kx.js:40772-40838 placement
/**
 * Spread/computed/非 init
 */
var isUnsupportedExportShape = (e) => e.type === "SpreadElement" || e.computed || e.kind !== "init";
//@ chunk-bfnfj4kx.js:40838-40958 placement
/**
 * AST 节点是否为名为 o 的对象属性（标识符或字面量键）。
 */
var isNamedProperty = (property, o) =>
  property.type === "Property" &&
  ((property.key.type === "Identifier" && property.key.name === o) ||
    (property.key.type === "Literal" && property.key.value === o));
//@ chunk-bfnfj4kx.js:40958-41265 placement
/**
 * 从字面量/数组字面量取字符串列表。
 */
function literalStrings(e) {
  switch (e.type) {
    case "Literal": {
      let o = e.value;
      return typeof o === "string" ? [o] : undefined;
    }
    case "ArrayExpression": {
      let mapped = e.elements.map((element) => {
        let n = element?.type === "Literal" ? element.value : undefined;
        return typeof n === "string" ? n : undefined;
      });
      return mapped.every((r) => r !== undefined) ? mapped.filter((r) => r !== undefined) : undefined;
    }
    default:
      return;
  }
}
//@ chunk-bfnfj4kx.js:41265-41639 placement
/**
 * 从 AST 读取 command 字段列表。
 */
function readCommandList(matcher) {
  switch (matcher?.type) {
    case "ObjectExpression": {
      let filtered = matcher.properties.filter((property) => isNamedProperty(property, "command"));
      let any = matcher.properties.some(isUnsupportedExportShape);
      let [r] = filtered;
      return !any && filtered.length === 1 && r?.type === "Property" ? literalStrings(r.value) : undefined;
    }
    case "ArrayExpression": {
      let mapped = matcher.elements.map((element) =>
        element === null || element.type === "SpreadElement" ? undefined : readCommandList(element),
      );
      return mapped.every((r) => r !== undefined) ? mapped.flatMap((r) => r ?? []) : undefined;
    }
    default:
      return;
  }
}
//@ chunk-bfnfj4kx.js:41639-41845 placement
/**
 * 扫描中所有 command.run 注册的 matcher 都能静态读出命令名时，返回排序去重的命令列表，否则 undefined。
 */
function collectRunCommands(e) {
  let filtered = [...e.registrations.values()].filter((registration) =>
    matchesEventPattern(registration.event, "command.run"),
  );
  let mapped = filtered.map((n) => readCommandList(n.matcher));
  return filtered.length > 0 && mapped.every((n) => n !== undefined)
    ? uniq(mapped.flatMap((n) => n ?? [])).toSorted()
    : undefined;
}
//@ chunk-bfnfj4kx.js:41845-41897 placement
/**
 * atom/derive/memberOf/read/update
 */
var STATE_LIB_EXPORTS = ["atom", "derive", "memberOf", "read", "update"];
//@ chunk-bfnfj4kx.js:41897-41920 placement
/**
 * 内嵌的 state-library.js 源码文本
 */
var stateLibrarySourceText = __cc_resource_0;
//@ chunk-bfnfj4kx.js:41920-41931 placement
/**
 * 内嵌资源别名
 */
var STATE_RESOURCE = stateLibrarySourceText;
//@ chunk-bfnfj4kx.js:41931-42145 placement
/**
 * 若调用的是从 claude-code 导入且未被遮蔽的状态库函数（atom/derive/memberOf/read/update），返回其名。
 */
function stateLibraryCallKind(scanned, o) {
  let { callee } = o;
  if (callee.type !== "Identifier" || o.optional) return;
  let r = scanned.imports.get(callee.name);
  let found = STATE_LIB_EXPORTS.find((p) => p === r?.imported);
  return r?.specifier === CLAUDE_CODE && found !== undefined && scanned.names.shadowOf(callee) === undefined
    ? found
    : undefined;
}
//@ chunk-bfnfj4kx.js:42145-42196 placement
/**
 * envReads / envWrites
 */
var envScannerField = (e, o) => (o === "env.get" ? e.envReads : e.envWrites);
//@ chunk-bfnfj4kx.js:42196-42319 placement
/**
 * 取扫描图中已链接的文件，不在图中时抛错。
 */
function requireLinkedFile({ graph, pluginName }, t) {
  let r = graph.files.get(t);
  if (r === undefined) throw new HooksError(`${pluginName}: ${t} was not linked`);
  return r;
}
//@ chunk-bfnfj4kx.js:42319-42580 placement
function followReExportLink(e, o, t) {
  let { scan, linked } = e;
  let s = linked.links.get(o);
  if (s === undefined)
    throw linked.scanned.refuse(
      undefined,
      `"${t}" is looked for through a re-export from "${o}", which is not a file of the module's own: nothing is followed through it`,
    );
  return {
    scan,
    linked: requireLinkedFile(scan, s),
  };
}
//@ chunk-bfnfj4kx.js:42580-43254 placement
/**
 * 收集模块自身的导出表（命名、命名空间、星号）。
 */
function collectOwnExports(e) {
  let { scan, linked } = e;
  let r = scan.ownExports.get(linked);
  if (r !== undefined) return r;
  let n = new Map();
  let s = new Map();
  let p = new Map();
  let i = [];
  let a = [];
  for (let u of linked.scanned.program.body) {
    if (u.type === "ExportDefaultDeclaration") n.set("default", u);
    if (u.type === "ExportNamedDeclaration") {
      for (let g of declaredNames(u.declaration)) n.set(g, u);
      for (let specifier of u.specifiers) {
        n.set(exportNameText(specifier.exported), u);
        s.set(exportNameText(specifier.exported), specifier);
      }
    }
    if (u.type !== "ExportAllDeclaration") continue;
    let { exported } = u;
    let y = linked.links.get(String(u.source.value));
    if (exported !== null && exported !== undefined) {
      p.set(exportNameText(exported), u);
      continue;
    }
    if (y === undefined) a.push(u);
    else
      i.push({
        from: linked,
        statement: u,
        to: requireLinkedFile(scan, y),
      });
  }
  let f = {
    named: n,
    listed: s,
    namespaces: p,
    stars: i,
    foreign: a,
  };
  scan.ownExports.set(linked, f);
  return f;
}
//@ chunk-bfnfj4kx.js:43254-43268 placement
/**
 * 500000
 */
var MAX_EXPORT_RESOLVE_STEPS = 500000;
//@ chunk-bfnfj4kx.js:43268-43582 placement
/**
 * 记录导出解析步数，超过上限时拒绝。
 */
function chargeExportSteps(e, o) {
  let { scan, linked } = e;
  scan.exportSteps.taken += o;
  if (scan.exportSteps.taken > MAX_EXPORT_RESOLVE_STEPS)
    throw linked.scanned.refuse(
      undefined,
      `the re-exports of "${scan.pluginName}" took ${scan.exportSteps.taken} steps to follow, more than the ${MAX_EXPORT_RESOLVE_STEPS} a scan allows: write fewer \`export *\`, or import each name from the file that declares it`,
    );
}
//@ chunk-bfnfj4kx.js:43582-43902 placement
/**
 * 把导出名解析为顶层函数声明。
 */
function resolveExportedFunction(e, o, t) {
  let { names, refuse } = e.scanned;
  let s = t === "default" ? "the default export" : t;
  let p = exportNameText(o.local);
  let i = names.functions.get(p);
  if (i === undefined)
    throw refuse(o, `${s} is exported as "${p}", which is not a function declared at the top of this file`);
  if (names.assigned.has(p)) throw refuse(o, `${s} ("${p}") is assigned to elsewhere`);
  return i;
}
//@ chunk-bfnfj4kx.js:43902-45166 placement
/**
 * 校验导出声明（不能被重新赋值等）。
 */
function checkExportDeclaration(e, o, t) {
  let { names, refuse } = e.scanned;
  let { functions, assigned } = names;
  let i = t === "default" ? "the default export" : t;
  function a(name, declaration) {
    if (assigned.has(name)) throw refuse(declaration, `${i} ("${name}") is assigned to elsewhere`);
  }
  if (o.type === "ExportDefaultDeclaration" && t === "default") {
    let { declaration } = o;
    if (declaration.type === "FunctionDeclaration") {
      if (declaration.id !== null) a(declaration.id.name, declaration);
      return declaration;
    }
    if (declaration.type === "FunctionExpression" || declaration.type === "ArrowFunctionExpression")
      return declaration;
    let k = declaration.type === "Identifier" ? functions.get(declaration.name) : undefined;
    if (k === undefined || declaration.type !== "Identifier")
      throw refuse(declaration, `${i} is something other than a function declared at the top of this file`);
    a(declaration.name, declaration);
    return k;
  }
  if (o.type !== "ExportNamedDeclaration") return;
  let { declaration } = o;
  if (declaration?.type === "FunctionDeclaration" && declaration.id.name === t) {
    a(t, declaration);
    return declaration;
  }
  if (declaration?.type === "VariableDeclaration") {
    for (let declaration_2 of declaration.declarations)
      if (declaration_2.id.type === "Identifier" && declaration_2.id.name === t) {
        let { init } = declaration_2;
        if (
          declaration.kind === "const" &&
          (init?.type === "FunctionExpression" || init?.type === "ArrowFunctionExpression")
        )
          return init;
        throw refuse(declaration_2, `${i} is exported as something other than a const function`);
      }
  }
  if (declaredNames(declaration).includes(t))
    throw refuse(o, `${i} is exported as something other than a function declared at the top of this file`);
  let found = o.specifiers.find((specifier) => exportNameText(specifier.exported) === t);
  return found !== undefined && o.source === null ? resolveExportedFunction(e, found, t) : undefined;
}
//@ chunk-bfnfj4kx.js:45166-45809 placement
/**
 * 解析命名导出（拒绝命名空间导出）。
 */
function resolveNamedExport(e, o, t) {
  let { linked } = e;
  let ownExports = collectOwnExports(e);
  let s = ownExports.named.get(o);
  let p = ownExports.namespaces.get(o);
  if (p !== undefined)
    throw linked.scanned.refuse(
      p,
      `${o === "default" ? "the default export" : o} is the namespace of "${String(p.source.value)}" (export * as), not a function`,
    );
  let i = ownExports.listed.get(o);
  let source = s?.type === "ExportNamedDeclaration" ? s.source : null;
  if (i !== undefined && source !== null && source !== undefined)
    return t(followReExportLink(e, String(source.value), o), exportNameText(i.local));
  if (i !== undefined)
    return {
      fn: resolveExportedFunction(linked, i, o),
      linked,
    };
  let declaration = s?.type === "ExportNamedDeclaration" ? s.declaration : undefined;
  let y = declaration?.type === "VariableDeclaration";
  chargeExportSteps(e, y ? declaration.declarations.length : 0);
  let c = s === undefined ? undefined : checkExportDeclaration(linked, s, o);
  return c === undefined
    ? undefined
    : {
        fn: c,
        linked,
      };
}
//@ chunk-bfnfj4kx.js:45809-45863 placement
/**
 * Map<k, Set> 追加
 */
var addToSetInMap = (e, o, t) => {
  e.set(o, (e.get(o) ?? new Set()).add(t));
};
//@ chunk-bfnfj4kx.js:45863-46392 placement
/**
 * 沿 export * 链构建完整导出表。
 */
function buildExportTable(e) {
  let { scan, linked } = e;
  let r = scan.exportTables.get(linked);
  if (r !== undefined) return r;
  let n = new Map();
  let s = new Map();
  let p = [];
  let i = new Set([linked]);
  let a = [linked];
  for (let u = a.pop(); u !== undefined; u = a.pop()) {
    let ownExports = collectOwnExports({
      scan,
      linked: u,
    });
    let y = u === linked ? [] : [...ownExports.named.keys(), ...ownExports.namespaces.keys()];
    chargeExportSteps(e, ownExports.stars.length + y.length + 1);
    if (ownExports.foreign.length > 0) p.push(u);
    for (let c of y) if (c !== "default") n.set(c, (n.get(c) ?? new Set()).add(u));
    for (let star of ownExports.stars) {
      addToSetInMap(s, star.to, star);
      if (!i.has(star.to)) {
        i.add(star.to);
        a.push(star.to);
      }
    }
  }
  let f = {
    givers: n,
    parents: s,
    wild: p,
  };
  scan.exportTables.set(linked, f);
  return f;
}
//@ chunk-bfnfj4kx.js:46392-46641 placement
function collectReExportGivers(e, o) {
  let exportTable = buildExportTable(e);
  let r = new Map();
  let n = new Set();
  let s = [...(exportTable.givers.get(o) ?? []), ...exportTable.wild];
  for (let p = s.pop(); p !== undefined; p = s.pop()) {
    let a = n.has(p) ? [] : [...(exportTable.parents.get(p) ?? [])];
    n.add(p);
    chargeExportSteps(e, a.length + 1);
    for (let f of a) {
      addToSetInMap(r, f.from, f);
      s.push(f.from);
    }
  }
  return r;
}
//@ chunk-bfnfj4kx.js:46641-47353 placement
/**
 * 沿重新导出链查找名字。
 */
function followReExport(e, o, t) {
  let { scan } = e;
  let reExportGivers = collectReExportGivers(e, o);
  let s = new Set();
  function p(linked) {
    let a = {
      scan,
      linked,
    };
    let ownExports = collectOwnExports(a);
    let u = s.has(linked);
    s.add(linked);
    chargeExportSteps(e, 1);
    if (u) return;
    if (ownExports.named.has(o)) return resolveNamedExport(a, o, t);
    let x = ownExports.namespaces.get(o);
    let c = [
      ...[...(x === undefined ? [] : [x]), ...ownExports.foreign].map((statement) => ({
        statement,
        to: undefined,
      })),
      ...(reExportGivers.get(linked) ?? []),
    ].toSorted((h, k) => h.statement.start - k.statement.start);
    let g;
    chargeExportSteps(e, c.length);
    for (let { statement, to } of c) {
      let j =
        statement.exported !== null && statement.exported !== undefined
          ? resolveNamedExport(a, o, t)
          : p(to ?? followReExportLink(a, String(statement.source.value), o).linked);
      if (j !== undefined && g !== undefined && j.fn !== g.fn)
        throw linked.scanned.refuse(
          statement,
          `${o} is given by more than one \`export *\` of this file, each from a different declaration: the engine binds neither`,
        );
      g = j ?? g;
    }
    return g;
  }
  return p(e.linked);
}
//@ chunk-bfnfj4kx.js:47353-47642 placement
function resolveExport(e, o, readExportCached) {
  let ownExports = collectOwnExports(e);
  let n = ownExports.namespaces.has(o);
  if (ownExports.named.has(o) || (o === "default" && n)) return resolveNamedExport(e, o, readExportCached);
  if (o === "default") return;
  let exportTable = buildExportTable(e);
  let i = exportTable.givers.get(o) ?? new Set();
  let [a] = i;
  if (!(!n && exportTable.wild.length === 0 && i.size <= 1)) return followReExport(e, o, readExportCached);
  if (a === undefined) return;
  return resolveNamedExport(
    {
      scan: e.scan,
      linked: a,
    },
    o,
    readExportCached,
  );
}
//@ chunk-bfnfj4kx.js:47642-48200 placement
/**
 * 带缓存地解析导出（处理循环）。
 */
function readExportCached(e, imported) {
  let { scan, linked } = e;
  let { exportsOpen, exportsUnderWay, exportsHeld } = scan;
  let i = scan.exportsRead.get(linked) ?? new Map();
  let a = exportsHeld.get(linked) ?? new Map();
  let f = exportsOpen.get(linked) ?? new Map();
  let u = f.get(imported);
  let x = a.get(imported);
  if (i.has(imported)) return i.get(imported);
  if (x !== undefined || u !== undefined) {
    exportsUnderWay.lowest = Math.min(exportsUnderWay.lowest, u ?? 0);
    return x?.found;
  }
  let { depth, lowest } = exportsUnderWay;
  chargeExportSteps(e, 1);
  exportsUnderWay.depth = depth + 1;
  exportsUnderWay.lowest = depth;
  exportsOpen.set(linked, f.set(imported, depth));
  exportsHeld.set(linked, a);
  scan.exportsRead.set(linked, i);
  try {
    let g = resolveExport(e, imported, readExportCached);
    if (exportsUnderWay.lowest === depth) i.set(imported, g);
    else
      a.set(imported, {
        found: g,
      });
    return g;
  } finally {
    exportsUnderWay.lowest = Math.min(lowest, exportsUnderWay.lowest);
    exportsUnderWay.depth = depth;
    f.delete(imported);
    if (depth === 0) {
      exportsOpen.clear();
      exportsHeld.clear();
    }
  }
}
//@ chunk-bfnfj4kx.js:48200-48550 placement
/**
 * 把标识符解析为本地顶层函数（禁止重新赋值与遮蔽）。
 */
function resolveLocalFunction(e, { names, refuse, what }) {
  let n = names.functions.get(e.name);
  if (n === undefined) return;
  if (names.assigned.has(e.name)) throw refuse(e, `${what} "${e.name}" is assigned to elsewhere`);
  let s = names.shadowOf(e);
  if (s !== undefined)
    throw refuse(
      s,
      `${what} "${e.name}" is declared more than once in this file: this declaration hides the top-level function where it is used`,
    );
  return n;
}
//@ chunk-bfnfj4kx.js:48550-49649 placement
/**
 * 把标识符解析为本地或导入的函数。
 */
function resolveFunctionReference({ scan, linked }, t, r) {
  let { scanned } = linked;
  let localFunction = resolveLocalFunction(t, {
    names: scanned.names,
    refuse: scanned.refuse,
    what: r,
  });
  if (localFunction !== undefined)
    return {
      fn: localFunction,
      linked,
    };
  let p = scanned.imports.get(t.name);
  if (p === undefined)
    throw scanned.refuse(
      t,
      `${r} "${t.name}" is not a function declared at the top of this file (a function declaration, or a const bound to a function), nor imported from one of the module's own files`,
    );
  if (p.imported === undefined)
    throw scanned.refuse(t, `${r} "${t.name}" is a namespace import, not a function`);
  if (scanned.names.assigned.has(t.name))
    throw scanned.refuse(t, `${r} "${t.name}" is assigned to elsewhere`);
  let i = scanned.names.shadowOf(t);
  if (i !== undefined)
    throw scanned.refuse(i, `${r} "${t.name}" is declared again in this file, shadowing the import`);
  let a = linked.links.get(p.specifier);
  if (a === undefined)
    throw scanned.refuse(
      t,
      `${r} "${t.name}" is imported from "${p.specifier}", which is not a file of the module's own`,
    );
  let f = readExportCached(
    {
      scan,
      linked: requireLinkedFile(scan, a),
    },
    p.imported,
  );
  if (f === undefined)
    throw scanned.refuse(
      t,
      `${r} "${t.name}" is imported from "${p.specifier}", which exports no function of that name: neither its own nor one it re-exports from a file of the module's own`,
    );
  return f;
}
//@ chunk-bfnfj4kx.js:49649-49904 placement
function readNamedLiteralArg(e) {
  let [o] = e.arguments;
  let properties = o?.type === "ObjectExpression" ? o.properties : [];
  let any = properties.some(isUnsupportedExportShape);
  let [n, s] = properties.filter((property) => isNamedProperty(property, "name"));
  let i = !any && s === undefined && n?.type === "Property" ? n.value : undefined;
  let a = i?.type === "Literal" ? i.value : undefined;
  return typeof a === "string" ? a : undefined;
}
//@ chunk-bfnfj4kx.js:49904-49975 placement
/**
 * 记录具名命令
 */
function recordNamedCommand(e, o) {
  let namedLiteralArg = readNamedLiteralArg(o);
  if (namedLiteralArg !== undefined) e.registeredCommands.add(namedLiteralArg);
}
//@ chunk-bfnfj4kx.js:49975-50203 placement
/**
 * 记录扫描到的 $.state.get/set 调用及其引用常量。
 */
function recordStateCall(e, { call: o, spelling, named, consts }, scanned) {
  let p = `${named.plugin}\x00${named.key}`;
  (spelling === "state.get" ? e.stateReads : e.stateWrites).set(p, named);
  e.stateCalls.add(o);
  for (let followed of consts)
    e.stateConsts.add({
      followed,
      spelling,
      scanned,
    });
}
//@ chunk-bfnfj4kx.js:50203-50229 placement
var COMMAND_REGISTER = "command.register";
//@ chunk-bfnfj4kx.js:50229-50527 placement
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
//@ chunk-bfnfj4kx.js:50527-50696 placement
/**
 * 描述 $ 在 AST 中的用法（被调用、作为参数、赋值、展开等），用于扫描报错。
 */
function describeDollarUse(e, o) {
  if (!(e.type === "CallExpression" || e.type === "NewExpression"))
    return DOLLAR_USE_DESCRIPTIONS[e.type] ?? `used in a ${e.type}`;
  return e.callee === o ? "called" : "passed as an argument";
}
//@ chunk-bfnfj4kx.js:50696-50712 placement
var PLUGIN = "plugin";
//@ chunk-bfnfj4kx.js:50712-50741 placement
/**
 * env.get/env.set
 */
var ENV_API_CALLS = ["env.get", "env.set"];
//@ chunk-bfnfj4kx.js:50741-50769 placement
/**
 * 是否 env 调用
 */
var isEnvApiCall = (e) => ENV_API_CALLS.includes(e);
//@ chunk-bfnfj4kx.js:50769-50802 placement
/**
 * state.get/state.set
 */
var STATE_API_CALLS = ["state.get", "state.set"];
//@ chunk-bfnfj4kx.js:50802-50830 placement
/**
 * 是否为保留名。
 */
var isReservedHookName = (e) => STATE_API_CALLS.includes(e);
//@ chunk-bfnfj4kx.js:50830-50883 placement
/**
 * 标识符或 JSON 引号
 */
var quoteIfNeeded = (e) => (/^[\w$@-]+$/.test(e) ? e : JSON.stringify(e));
//@ chunk-bfnfj4kx.js:50883-50927 placement
/**
 * 状态原子键字符串（plugin.key）。
 */
var stateAtomKey = (e) => `${quoteIfNeeded(e.plugin)}.${quoteIfNeeded(e.key)}`;
//@ chunk-bfnfj4kx.js:50927-50970 placement
/**
 * 用空实现探测钩子回调。
 */
var probeHookCallback = (e) =>
  e(
    () => false,
    (o, t) => t(),
    (o) => o(),
  );
//@ chunk-bfnfj4kx.js:50970-51047 placement
/**
 * 字符串是否形如 name@builtin。
 */
var isBuiltinSuffixed = (pluginStorageId) =>
  pluginStorageId.endsWith("@builtin") &&
  pluginStorageId.indexOf("@") === pluginStorageId.length - 8 &&
  pluginStorageId.length > 8;
//@ chunk-bfnfj4kx.js:51047-51067 placement
var ANTHROPIC = "anthropic";
//@ chunk-bfnfj4kx.js:51067-51100 placement
/**
 * anthropic/collector
 */
var CORE_SOURCES = ["anthropic", "collector"];
//@ chunk-bfnfj4kx.js:51100-51127 placement
/**
 * 是否核心来源
 */
var isCoreSource = (e) => CORE_SOURCES.includes(e);
//@ chunk-bfnfj4kx.js:51127-51142 placement
/**
 * 核心来源标识 "core"。
 */
var CORE_ORIGIN = "core";
//@ chunk-bfnfj4kx.js:51142-51176 placement
/**
 * 最后一个扣留者
 */
var topWithholder = (e) => e.withheldBy?.at(-1);
//@ chunk-bfnfj4kx.js:51176-51228 placement
/**
 * 被插件移除的说明
 */
var removedByPluginText = (e, o) => `$.${e}: removed by plugin \`${o}\``;
//@ chunk-bfnfj4kx.js:51228-51333 placement
/**
 * 列出 hooks 模块及其界面模块的全部文件（入口与链接文件，含源码）。
 */
var hooksModuleFiles = (e) =>
  [e, ...(e.surfaceModules ?? [])].flatMap((o) => [
    {
      file: o.modulePath,
      source: o.source,
    },
    ...o.linked,
  ]);
//@ chunk-bfnfj4kx.js:51333-51583 placement
/**
 * $.env.get/set 的第一个参数必须是字面量字符串，返回之，否则抛扫描错误。
 */
function readLiteralEnvName(e, o, refuse) {
  let [r] = e.arguments;
  let s = r !== undefined && r.type !== "SpreadElement" ? readStaticString(r) : undefined;
  if (s === undefined)
    throw refuse(
      r ?? e,
      `$.${o} takes a literal name as its first argument, so the variables a module reads and writes can be listed (got ${describeArgument(r)})`,
    );
  return s;
}
export {
  isReservedHookName,
  probeHookCallback,
  routesToUser,
  matchesEventPattern,
  isEventPattern,
  removedByPluginText,
  topWithholder,
  CORE_ORIGIN,
  matchesEventForPlugin,
  eventPatternError,
  isBuiltinSuffixed,
  STATE_RESOURCE,
  stateAtomKey,
  PLUGIN,
  isEnvApiCall,
  readLiteralEnvName,
  COMMAND_REGISTER,
  describeDollarUse,
  resolveFunctionReference,
  envScannerField,
  recordNamedCommand,
  recordStateCall,
  stateLibraryCallKind,
  nameOfEventPattern,
  checkExportDeclaration,
  requireLinkedFile,
  CORE_SOURCES,
  isCoreSource,
  isNamedProperty,
  isTelemetryEvent,
  collectRunCommands,
  hooksModuleFiles,
  readCommandList,
  ANTHROPIC,
};
