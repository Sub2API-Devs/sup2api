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
/**
 * 字符串是否为事件模式（*、前缀.*、!）。
 */
//@ chunk-bfnfj4kx.js:39578-39636 placement
var isEventPattern = (e) => e === "*" || e.endsWith(".*") || e.startsWith("!");
//@ chunk-bfnfj4kx.js:39636-39675 placement
var ro = (e) => e.startsWith("telemetry.");
/**
 * 校验事件名或模式，返回错误说明。
 */
//@ chunk-bfnfj4kx.js:39675-40256 placement
function validateEventPattern(e) {
  if (typeof e !== "string") return `${typeof e} is not an event name or a pattern (a string)`;
  let startsWith = e.startsWith("!"),
    t = startsWith ? e.slice(1) : e;
  if (startsWith && t === "*") return `"${e}" is not a pattern: it selects no event`;
  if (startsWith && t.startsWith("!")) return `"${e}" is not a pattern: "!" negates once`;
  let r = t === "*",
    endsWith = t.endsWith(".*"),
    parts = (endsWith ? t.slice(0, -2) : t).split(".");
  if (!(r || parts.every((i) => regExp_2.test(i))))
    return `"${e}" is not an event name or a pattern ("*", "<prefix>.*", or "!" before either)`;
  return {
    isNegated: startsWith,
    selection: r
      ? { kind: "every" }
      : endsWith
        ? { kind: "prefix", prefix: parts.join(".") }
        : { kind: "name", name: t },
  };
}
//@ chunk-bfnfj4kx.js:40256-40331 placement
function so(e) {
  let o = validateEventPattern(e);
  if (typeof o === "string") throw new HooksError(o);
  return o;
}
//@ chunk-bfnfj4kx.js:40331-40407 placement
function vSi(e) {
  let { selection: selection } = so(e);
  return selection.kind === "name" ? selection.name : void 0;
}
//@ chunk-bfnfj4kx.js:40407-40471 placement
function jeo(e) {
  let o = validateEventPattern(e);
  return typeof o === "string" ? o : void 0;
}
/**
 * 事件名是否匹配模式（支持取反、前缀、精确）。
 */
//@ chunk-bfnfj4kx.js:40471-40657 placement
function matchesEventPattern(e, o) {
  let { isNegated: isNegated, selection: selection } = so(e),
    n;
  switch (selection.kind) {
    case "every":
      n = !0;
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
function mos(e, o) {
  return (e.toUserOn ?? []).some((t) => matchesEventPattern(t, o));
}
/**
 * 按插件是否内置判断是否可监听 telemetry.* 事件。
 */
//@ chunk-bfnfj4kx.js:40717-40772 placement
var matchesEventForPlugin = (e, o, t) => matchesEventPattern(e, o) && (t.isBuiltin || !ro(o) || ro(e));
//@ chunk-bfnfj4kx.js:40772-40838 placement
var po = (e) => e.type === "SpreadElement" || e.computed || e.kind !== "init";
/**
 * AST 节点是否为名为 o 的对象属性（标识符或字面量键）。
 */
//@ chunk-bfnfj4kx.js:40838-40958 placement
var isNamedProperty = (e, o) =>
  e.type === "Property" &&
  ((e.key.type === "Identifier" && e.key.name === o) || (e.key.type === "Literal" && e.key.value === o));
/**
 * 从字面量/数组字面量取字符串列表。
 */
//@ chunk-bfnfj4kx.js:40958-41265 placement
function literalStrings(e) {
  switch (e.type) {
    case "Literal": {
      let o = e.value;
      return typeof o === "string" ? [o] : void 0;
    }
    case "ArrayExpression": {
      let mapped = e.elements.map((element) => {
        let n = element?.type === "Literal" ? element.value : void 0;
        return typeof n === "string" ? n : void 0;
      });
      return mapped.every((r) => r !== void 0) ? mapped.filter((r) => r !== void 0) : void 0;
    }
    default:
      return;
  }
}
/**
 * 从 AST 读取 command 字段列表。
 */
//@ chunk-bfnfj4kx.js:41265-41639 placement
function readCommandList(e) {
  switch (e?.type) {
    case "ObjectExpression": {
      let filtered = e.properties.filter((property) => isNamedProperty(property, "command")),
        any = e.properties.some(po),
        [r] = filtered;
      return !any && filtered.length === 1 && r?.type === "Property" ? literalStrings(r.value) : void 0;
    }
    case "ArrayExpression": {
      let mapped = e.elements.map((element) =>
        element === null || element.type === "SpreadElement" ? void 0 : readCommandList(element),
      );
      return mapped.every((r) => r !== void 0) ? mapped.flatMap((r) => r ?? []) : void 0;
    }
    default:
      return;
  }
}
/**
 * 扫描中所有 command.run 注册的 matcher 都能静态读出命令名时，返回排序去重的命令列表，否则 undefined。
 */
//@ chunk-bfnfj4kx.js:41639-41845 placement
function collectRunCommands(e) {
  let filtered = [...e.registrations.values()].filter((n) => matchesEventPattern(n.event, "command.run")),
    mapped = filtered.map((n) => readCommandList(n.matcher));
  return filtered.length > 0 && mapped.every((n) => n !== void 0)
    ? uniq(mapped.flatMap((n) => n ?? [])).toSorted()
    : void 0;
}
//@ chunk-bfnfj4kx.js:41845-41897 placement
var Dg = ["atom", "derive", "memberOf", "read", "update"];
//@ chunk-bfnfj4kx.js:41897-41920 placement
var _r = __cc_resource_0;
//@ chunk-bfnfj4kx.js:41920-41931 placement
var Weo = _r;
/**
 * 若调用的是从 claude-code 导入且未被遮蔽的状态库函数（atom/derive/memberOf/read/update），返回其名。
 */
//@ chunk-bfnfj4kx.js:41931-42145 placement
function stateLibraryCallKind(e, o) {
  let { callee: callee } = o;
  if (callee.type !== "Identifier" || o.optional) return;
  let r = e.imports.get(callee.name),
    found = Dg.find((p) => p === r?.imported);
  return r?.specifier === CLAUDE_CODE && found !== void 0 && e.names.shadowOf(callee) === void 0
    ? found
    : void 0;
}
//@ chunk-bfnfj4kx.js:42145-42196 placement
var ao = (e, o) => (o === "env.get" ? e.envReads : e.envWrites);
/**
 * 取扫描图中已链接的文件，不在图中时抛错。
 */
//@ chunk-bfnfj4kx.js:42196-42319 placement
function requireLinkedFile({ graph: graph, pluginName: pluginName }, t) {
  let r = graph.files.get(t);
  if (r === void 0) throw new HooksError(`${pluginName}: ${t} was not linked`);
  return r;
}
//@ chunk-bfnfj4kx.js:42319-42580 placement
function followReExportLink(e, o, t) {
  let { scan: scan, linked: linked } = e,
    s = linked.links.get(o);
  if (s === void 0)
    throw linked.scanned.refuse(
      void 0,
      `"${t}" is looked for through a re-export from "${o}", which is not a file of the module's own: nothing is followed through it`,
    );
  return { scan: scan, linked: requireLinkedFile(scan, s) };
}
/**
 * 收集模块自身的导出表（命名、命名空间、星号）。
 */
//@ chunk-bfnfj4kx.js:42580-43254 placement
function collectOwnExports(e) {
  let { scan: scan, linked: linked } = e,
    r = scan.ownExports.get(linked);
  if (r !== void 0) return r;
  let n = new Map(),
    s = new Map(),
    p = new Map(),
    i = [],
    a = [];
  for (let u of linked.scanned.program.body) {
    if (u.type === "ExportDefaultDeclaration") n.set("default", u);
    if (u.type === "ExportNamedDeclaration") {
      for (let g of declaredNames(u.declaration)) n.set(g, u);
      for (let specifier of u.specifiers)
        (n.set(exportNameText(specifier.exported), u), s.set(exportNameText(specifier.exported), specifier));
    }
    if (u.type !== "ExportAllDeclaration") continue;
    let { exported: exported } = u,
      y = linked.links.get(String(u.source.value));
    if (exported !== null && exported !== void 0) {
      p.set(exportNameText(exported), u);
      continue;
    }
    y === void 0 ? a.push(u) : i.push({ from: linked, statement: u, to: requireLinkedFile(scan, y) });
  }
  let f = { named: n, listed: s, namespaces: p, stars: i, foreign: a };
  return (scan.ownExports.set(linked, f), f);
}
//@ chunk-bfnfj4kx.js:43254-43268 placement
var Wo = 500000;
/**
 * 记录导出解析步数，超过上限时拒绝。
 */
//@ chunk-bfnfj4kx.js:43268-43582 placement
function chargeExportSteps(e, o) {
  let { scan: scan, linked: linked } = e;
  if (((scan.exportSteps.taken += o), scan.exportSteps.taken > Wo))
    throw linked.scanned.refuse(
      void 0,
      `the re-exports of "${scan.pluginName}" took ${scan.exportSteps.taken} steps to follow, more than the ${Wo} a scan allows: write fewer \`export *\`, or import each name from the file that declares it`,
    );
}
/**
 * 把导出名解析为顶层函数声明。
 */
//@ chunk-bfnfj4kx.js:43582-43902 placement
function resolveExportedFunction(e, o, t) {
  let { names: names, refuse: refuse } = e.scanned,
    s = t === "default" ? "the default export" : t,
    p = exportNameText(o.local),
    i = names.functions.get(p);
  if (i === void 0)
    throw refuse(o, `${s} is exported as "${p}", which is not a function declared at the top of this file`);
  if (names.assigned.has(p)) throw refuse(o, `${s} ("${p}") is assigned to elsewhere`);
  return i;
}
/**
 * 校验导出声明（不能被重新赋值等）。
 */
//@ chunk-bfnfj4kx.js:43902-45166 placement
function checkExportDeclaration(e, o, t) {
  let { names: names, refuse: refuse } = e.scanned,
    { functions: functions, assigned: assigned } = names,
    i = t === "default" ? "the default export" : t;
  function a(c, g) {
    if (assigned.has(c)) throw refuse(g, `${i} ("${c}") is assigned to elsewhere`);
  }
  if (o.type === "ExportDefaultDeclaration" && t === "default") {
    let { declaration: declaration } = o;
    if (declaration.type === "FunctionDeclaration") {
      if (declaration.id !== null) a(declaration.id.name, declaration);
      return declaration;
    }
    if (declaration.type === "FunctionExpression" || declaration.type === "ArrowFunctionExpression")
      return declaration;
    let k = declaration.type === "Identifier" ? functions.get(declaration.name) : void 0;
    if (k === void 0 || declaration.type !== "Identifier")
      throw refuse(declaration, `${i} is something other than a function declared at the top of this file`);
    return (a(declaration.name, declaration), k);
  }
  if (o.type !== "ExportNamedDeclaration") return;
  let { declaration: declaration } = o;
  if (declaration?.type === "FunctionDeclaration" && declaration.id.name === t)
    return (a(t, declaration), declaration);
  if (declaration?.type === "VariableDeclaration") {
    for (let declaration_2 of declaration.declarations)
      if (declaration_2.id.type === "Identifier" && declaration_2.id.name === t) {
        let { init: init } = declaration_2;
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
  return found !== void 0 && o.source === null ? resolveExportedFunction(e, found, t) : void 0;
}
/**
 * 解析命名导出（拒绝命名空间导出）。
 */
//@ chunk-bfnfj4kx.js:45166-45809 placement
function resolveNamedExport(e, o, t) {
  let { linked: linked } = e,
    n = collectOwnExports(e),
    s = n.named.get(o),
    p = n.namespaces.get(o);
  if (p !== void 0)
    throw linked.scanned.refuse(
      p,
      `${o === "default" ? "the default export" : o} is the namespace of "${String(p.source.value)}" (export * as), not a function`,
    );
  let i = n.listed.get(o),
    a = s?.type === "ExportNamedDeclaration" ? s.source : null;
  if (i !== void 0 && a !== null && a !== void 0)
    return t(followReExportLink(e, String(a.value), o), exportNameText(i.local));
  if (i !== void 0) return { fn: resolveExportedFunction(linked, i, o), linked: linked };
  let x = s?.type === "ExportNamedDeclaration" ? s.declaration : void 0,
    y = x?.type === "VariableDeclaration";
  chargeExportSteps(e, y ? x.declarations.length : 0);
  let c = s === void 0 ? void 0 : checkExportDeclaration(linked, s, o);
  return c === void 0 ? void 0 : { fn: c, linked: linked };
}
//@ chunk-bfnfj4kx.js:45809-45863 placement
var co = (e, o, t) => {
  e.set(o, (e.get(o) ?? new Set()).add(t));
};
/**
 * 沿 export * 链构建完整导出表。
 */
//@ chunk-bfnfj4kx.js:45863-46392 placement
function buildExportTable(e) {
  let { scan: scan, linked: linked } = e,
    r = scan.exportTables.get(linked);
  if (r !== void 0) return r;
  let n = new Map(),
    s = new Map(),
    p = [],
    i = new Set([linked]),
    a = [linked];
  for (let u = a.pop(); u !== void 0; u = a.pop()) {
    let x = collectOwnExports({ scan: scan, linked: u }),
      y = u === linked ? [] : [...x.named.keys(), ...x.namespaces.keys()];
    if ((chargeExportSteps(e, x.stars.length + y.length + 1), x.foreign.length > 0)) p.push(u);
    for (let c of y) if (c !== "default") n.set(c, (n.get(c) ?? new Set()).add(u));
    for (let star of x.stars) if ((co(s, star.to, star), !i.has(star.to))) (i.add(star.to), a.push(star.to));
  }
  let f = { givers: n, parents: s, wild: p };
  return (scan.exportTables.set(linked, f), f);
}
//@ chunk-bfnfj4kx.js:46392-46641 placement
function collectReExportGivers(e, o) {
  let t = buildExportTable(e),
    r = new Map(),
    n = new Set(),
    s = [...(t.givers.get(o) ?? []), ...t.wild];
  for (let p = s.pop(); p !== void 0; p = s.pop()) {
    let a = n.has(p) ? [] : [...(t.parents.get(p) ?? [])];
    (n.add(p), chargeExportSteps(e, a.length + 1));
    for (let f of a) (co(r, f.from, f), s.push(f.from));
  }
  return r;
}
/**
 * 沿重新导出链查找名字。
 */
//@ chunk-bfnfj4kx.js:46641-47353 placement
function followReExport(e, o, t) {
  let { scan: scan } = e,
    n = collectReExportGivers(e, o),
    s = new Set();
  function p(i) {
    let a = { scan: scan, linked: i },
      f = collectOwnExports(a),
      u = s.has(i);
    if ((s.add(i), chargeExportSteps(e, 1), u)) return;
    if (f.named.has(o)) return resolveNamedExport(a, o, t);
    let x = f.namespaces.get(o),
      toSorted = [
        ...[...(x === void 0 ? [] : [x]), ...f.foreign].map((h) => ({ statement: h, to: void 0 })),
        ...(n.get(i) ?? []),
      ].toSorted((h, k) => h.statement.start - k.statement.start),
      g;
    chargeExportSteps(e, toSorted.length);
    for (let { statement: statement, to: to } of toSorted) {
      let j =
        statement.exported !== null && statement.exported !== void 0
          ? resolveNamedExport(a, o, t)
          : p(to ?? followReExportLink(a, String(statement.source.value), o).linked);
      if (j !== void 0 && g !== void 0 && j.fn !== g.fn)
        throw i.scanned.refuse(
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
function resolveExport(e, o, t) {
  let r = collectOwnExports(e),
    n = r.namespaces.has(o);
  if (r.named.has(o) || (o === "default" && n)) return resolveNamedExport(e, o, t);
  if (o === "default") return;
  let p = buildExportTable(e),
    i = p.givers.get(o) ?? new Set(),
    [a] = i;
  if (!(!n && p.wild.length === 0 && i.size <= 1)) return followReExport(e, o, t);
  if (a === void 0) return;
  return resolveNamedExport({ scan: e.scan, linked: a }, o, t);
}
/**
 * 带缓存地解析导出（处理循环）。
 */
//@ chunk-bfnfj4kx.js:47642-48200 placement
function readExportCached(e, o) {
  let { scan: scan, linked: linked } = e,
    { exportsOpen: exportsOpen, exportsUnderWay: exportsUnderWay, exportsHeld: exportsHeld } = scan,
    i = scan.exportsRead.get(linked) ?? new Map(),
    a = exportsHeld.get(linked) ?? new Map(),
    f = exportsOpen.get(linked) ?? new Map(),
    u = f.get(o),
    x = a.get(o);
  if (i.has(o)) return i.get(o);
  if (x !== void 0 || u !== void 0)
    return ((exportsUnderWay.lowest = Math.min(exportsUnderWay.lowest, u ?? 0)), x?.found);
  let { depth: depth, lowest: lowest } = exportsUnderWay;
  (chargeExportSteps(e, 1),
    (exportsUnderWay.depth = depth + 1),
    (exportsUnderWay.lowest = depth),
    exportsOpen.set(linked, f.set(o, depth)),
    exportsHeld.set(linked, a),
    scan.exportsRead.set(linked, i));
  try {
    let g = resolveExport(e, o, readExportCached);
    return (exportsUnderWay.lowest === depth ? i.set(o, g) : a.set(o, { found: g }), g);
  } finally {
    if (
      ((exportsUnderWay.lowest = Math.min(lowest, exportsUnderWay.lowest)),
      (exportsUnderWay.depth = depth),
      f.delete(o),
      depth === 0)
    )
      (exportsOpen.clear(), exportsHeld.clear());
  }
}
/**
 * 把标识符解析为本地顶层函数（禁止重新赋值与遮蔽）。
 */
//@ chunk-bfnfj4kx.js:48200-48550 placement
function resolveLocalFunction(e, { names: names, refuse: refuse, what: what }) {
  let n = names.functions.get(e.name);
  if (n === void 0) return;
  if (names.assigned.has(e.name)) throw refuse(e, `${what} "${e.name}" is assigned to elsewhere`);
  let shadowOf = names.shadowOf(e);
  if (shadowOf !== void 0)
    throw refuse(
      shadowOf,
      `${what} "${e.name}" is declared more than once in this file: this declaration hides the top-level function where it is used`,
    );
  return n;
}
/**
 * 把标识符解析为本地或导入的函数。
 */
//@ chunk-bfnfj4kx.js:48550-49649 placement
function resolveFunctionReference({ scan: scan, linked: linked }, t, r) {
  let { scanned: scanned } = linked,
    s = resolveLocalFunction(t, { names: scanned.names, refuse: scanned.refuse, what: r });
  if (s !== void 0) return { fn: s, linked: linked };
  let p = scanned.imports.get(t.name);
  if (p === void 0)
    throw scanned.refuse(
      t,
      `${r} "${t.name}" is not a function declared at the top of this file (a function declaration, or a const bound to a function), nor imported from one of the module's own files`,
    );
  if (p.imported === void 0)
    throw scanned.refuse(t, `${r} "${t.name}" is a namespace import, not a function`);
  if (scanned.names.assigned.has(t.name))
    throw scanned.refuse(t, `${r} "${t.name}" is assigned to elsewhere`);
  let shadowOf = scanned.names.shadowOf(t);
  if (shadowOf !== void 0)
    throw scanned.refuse(shadowOf, `${r} "${t.name}" is declared again in this file, shadowing the import`);
  let a = linked.links.get(p.specifier);
  if (a === void 0)
    throw scanned.refuse(
      t,
      `${r} "${t.name}" is imported from "${p.specifier}", which is not a file of the module's own`,
    );
  let f = readExportCached({ scan: scan, linked: requireLinkedFile(scan, a) }, p.imported);
  if (f === void 0)
    throw scanned.refuse(
      t,
      `${r} "${t.name}" is imported from "${p.specifier}", which exports no function of that name: neither its own nor one it re-exports from a file of the module's own`,
    );
  return f;
}
//@ chunk-bfnfj4kx.js:49649-49904 placement
function readNamedLiteralArg(e) {
  let [o] = e.arguments,
    t = o?.type === "ObjectExpression" ? o.properties : [],
    any = t.some(po),
    [n, s] = t.filter((f) => isNamedProperty(f, "name")),
    i = !any && s === void 0 && n?.type === "Property" ? n.value : void 0,
    a = i?.type === "Literal" ? i.value : void 0;
  return typeof a === "string" ? a : void 0;
}
//@ chunk-bfnfj4kx.js:49904-49975 placement
function xo(e, o) {
  let t = readNamedLiteralArg(o);
  if (t !== void 0) e.registeredCommands.add(t);
}
/**
 * 记录扫描到的 $.state.get/set 调用及其引用常量。
 */
//@ chunk-bfnfj4kx.js:49975-50203 placement
function recordStateCall(e, { call: o, spelling: spelling, named: named, consts: consts }, s) {
  let p = `${named.plugin}\x00${named.key}`;
  ((spelling === "state.get" ? e.stateReads : e.stateWrites).set(p, named), e.stateCalls.add(o));
  for (let a of consts) e.stateConsts.add({ followed: a, spelling: spelling, scanned: s });
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
/**
 * 描述 $ 在 AST 中的用法（被调用、作为参数、赋值、展开等），用于扫描报错。
 */
//@ chunk-bfnfj4kx.js:50527-50696 placement
function describeDollarUse(e, o) {
  if (!(e.type === "CallExpression" || e.type === "NewExpression"))
    return DOLLAR_USE_DESCRIPTIONS[e.type] ?? `used in a ${e.type}`;
  return e.callee === o ? "called" : "passed as an argument";
}
//@ chunk-bfnfj4kx.js:50696-50712 placement
var PLUGIN = "plugin";
//@ chunk-bfnfj4kx.js:50712-50741 placement
var Kr = ["env.get", "env.set"];
//@ chunk-bfnfj4kx.js:50741-50769 placement
var kSi = (e) => Kr.includes(e);
//@ chunk-bfnfj4kx.js:50769-50802 placement
var qr = ["state.get", "state.set"];
/**
 * 是否为保留名。
 */
//@ chunk-bfnfj4kx.js:50802-50830 placement
var isReservedHookName = (e) => qr.includes(e);
//@ chunk-bfnfj4kx.js:50830-50883 placement
var qo = (e) => (/^[\w$@-]+$/.test(e) ? e : JSON.stringify(e));
/**
 * 状态原子键字符串（plugin.key）。
 */
//@ chunk-bfnfj4kx.js:50883-50927 placement
var stateAtomKey = (e) => `${qo(e.plugin)}.${qo(e.key)}`;
/**
 * 用空实现探测钩子回调。
 */
//@ chunk-bfnfj4kx.js:50927-50970 placement
var probeHookCallback = (e) =>
  e(
    () => !1,
    (o, t) => t(),
    (o) => o(),
  );
/**
 * 字符串是否形如 name@builtin。
 */
//@ chunk-bfnfj4kx.js:50970-51047 placement
var isBuiltinSuffixed = (e) => e.endsWith("@builtin") && e.indexOf("@") === e.length - 8 && e.length > 8;
//@ chunk-bfnfj4kx.js:51047-51067 placement
var ANTHROPIC = "anthropic";
//@ chunk-bfnfj4kx.js:51067-51100 placement
var ke = ["anthropic", "collector"];
//@ chunk-bfnfj4kx.js:51100-51127 placement
var Wh = (e) => ke.includes(e);
/**
 * 核心来源标识 "core"。
 */
//@ chunk-bfnfj4kx.js:51127-51142 placement
var CORE_ORIGIN = "core";
//@ chunk-bfnfj4kx.js:51142-51176 placement
var KUi = (e) => e.withheldBy?.at(-1);
//@ chunk-bfnfj4kx.js:51176-51228 placement
var gos = (e, o) => `$.${e}: removed by plugin \`${o}\``;
/**
 * 列出 hooks 模块及其界面模块的全部文件（入口与链接文件，含源码）。
 */
//@ chunk-bfnfj4kx.js:51228-51333 placement
var hooksModuleFiles = (e) =>
  [e, ...(e.surfaceModules ?? [])].flatMap((o) => [{ file: o.modulePath, source: o.source }, ...o.linked]);
/**
 * $.env.get/set 的第一个参数必须是字面量字符串，返回之，否则抛扫描错误。
 */
//@ chunk-bfnfj4kx.js:51333-51583 placement
function readLiteralEnvName(e, o, t) {
  let [r] = e.arguments,
    s = r !== void 0 && r.type !== "SpreadElement" ? readStaticString(r) : void 0;
  if (s === void 0)
    throw t(
      r ?? e,
      `$.${o} takes a literal name as its first argument, so the variables a module reads and writes can be listed (got ${describeArgument(r)})`,
    );
  return s;
}

export {
  isReservedHookName,
  probeHookCallback,
  mos,
  matchesEventPattern,
  isEventPattern,
  gos,
  KUi,
  CORE_ORIGIN,
  matchesEventForPlugin,
  jeo,
  isBuiltinSuffixed,
  Weo,
  stateAtomKey,
  PLUGIN,
  kSi,
  readLiteralEnvName,
  COMMAND_REGISTER,
  describeDollarUse,
  resolveFunctionReference,
  ao,
  xo,
  recordStateCall,
  stateLibraryCallKind,
  vSi,
  checkExportDeclaration,
  requireLinkedFile,
  ke,
  Wh,
  isNamedProperty,
  ro,
  collectRunCommands,
  hooksModuleFiles,
  readCommandList,
  ANTHROPIC,
};
