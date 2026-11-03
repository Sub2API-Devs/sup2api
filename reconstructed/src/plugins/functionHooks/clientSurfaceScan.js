/**
 * plugins/functionHooks/clientSurfaceScan.ts
 *
 * 2.1.316 新增：校验 Client 组件的 props 必须是对象字面量并解析 module；描述 AST 参数节点类型（用于报错）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bfnfj4kx.js (17)
 * attribution: placement 17
 */
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
} from "path";
import { walkAst, exportNameText } from "./moduleScan.js";
import { isDotRelativePath, Heo, fos } from "./moduleLoader.js";
import { gps } from "../../utils/plugins/pluginSourceUrl.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-bfnfj4kx.js:35000-35016 placement
var CLIENT = "Client";
//@ chunk-bfnfj4kx.js:35016-35301 placement
function findModuleProperty(e) {
  let o;
  for (let property of e.properties) {
    if (property.type === "SpreadElement") {
      o = o && { ...o, isSpreadAfter: !0 };
      continue;
    }
    let { key: key } = property;
    if (
      !property.computed &&
      property.kind === "init" &&
      ((key.type === "Identifier" && key.name === "module") ||
        (key.type === "Literal" && key.value === "module"))
    )
      o = { property: property, isSpreadAfter: !1 };
  }
  return o;
}
/**
 * 描述 AST 参数节点类型（用于报错）。
 */
//@ chunk-bfnfj4kx.js:35301-35812 placement
function describeArgument(e) {
  if (e === void 0) return "no argument";
  switch (e.type) {
    case "Identifier":
      return `the variable ${e.name}`;
    case "TemplateLiteral":
      return "a template with a substitution";
    case "SpreadElement":
      return "a spread";
    case "Literal":
      return `the literal ${e.raw ?? String(e.value)}`;
    case "MemberExpression":
      return "a member read";
    case "CallExpression":
      return "a call";
    case "BinaryExpression":
      return "a concatenation";
    case "ObjectExpression":
      return "an object whose plugin or key is not a string literal";
    default:
      return `a ${e.type}`;
  }
}
/**
 * 读取字面量或无插值模板字符串的值，否则 undefined。被扫描代码多处使用。
 */
//@ chunk-bfnfj4kx.js:35812-36028 placement
function readStaticString(e) {
  if (e.type === "Literal") return typeof e.value === "string" ? e.value : void 0;
  if (e.type !== "TemplateLiteral" || e.expressions.length !== 0) return;
  let o = e.quasis[0]?.value.cooked;
  return o === void 0 || o === null ? void 0 : o;
}
/**
 * 校验 Client 组件的 props 必须是对象字面量并解析 module。
 */
//@ chunk-bfnfj4kx.js:36028-36726 placement
function scanClientProps(e, o) {
  if (!o || o.type !== "ObjectExpression")
    return {
      at: o ?? e,
      problem: `Client takes its props as an object literal ({ module: "./board.tsx", key }), so the surface module it names can be read before it runs (got ${describeArgument(o)})`,
    };
  let t = findModuleProperty(o);
  if (!t)
    return {
      at: o,
      problem: `Client names no module: give it module, the surface module's path as a string literal ("./board.tsx")`,
    };
  if (t.isSpreadAfter)
    return {
      at: t.property,
      problem: "a spread after module in Client(...) could replace it: put module after the spread",
    };
  let { value: r } = t.property,
    n = readStaticString(r);
  if (n === void 0)
    return {
      at: r,
      problem: `Client module must be a string literal, the surface module's path relative to this file (got ${describeArgument(r)})`,
    };
  return { at: r, spelled: n };
}
//@ chunk-bfnfj4kx.js:36726-36903 placement
var isClientReference = (e) =>
  (e.type === "Identifier" && e.name === CLIENT) ||
  (e.type === "Literal" && e.value === CLIENT) ||
  (e.type === "MemberExpression" &&
    !e.computed &&
    e.property.type === "Identifier" &&
    e.property.name === CLIENT);
//@ chunk-bfnfj4kx.js:36903-36914 placement
var vr = "h";
//@ chunk-bfnfj4kx.js:36914-37132 placement
function matchClientCall(e) {
  let { callee: callee } = e;
  if (callee.type !== "Super" && isClientReference(callee)) return { argument: e.arguments[0] };
  let [t, r] = e.arguments;
  return callee.type === "Identifier" &&
    callee.name === vr &&
    t !== void 0 &&
    t.type !== "SpreadElement" &&
    isClientReference(t)
    ? { argument: r }
    : void 0;
}
//@ chunk-bfnfj4kx.js:37132-37302 placement
function scanClientCalls(e) {
  let o = [];
  return (
    walkAst(e, ({ node: node }) => {
      if (node.type !== "CallExpression") return;
      let r = matchClientCall(node);
      if (r) o.push(scanClientProps(node, r.argument));
    }),
    o.toSorted((t, r) => r.at.start - t.at.start)
  );
}
//@ chunk-bfnfj4kx.js:37302-37319 placement
var DEFAULT = "default";
/**
 * 列出模块的导出名。
 */
//@ chunk-bfnfj4kx.js:37319-37829 placement
function listModuleExports(e) {
  let o = [];
  for (let t of e.body)
    if (t.type === "ExportDefaultDeclaration") o.push(DEFAULT);
    else if (t.type === "ExportAllDeclaration") {
      if (t.exported !== null && t.exported) o.push(exportNameText(t.exported));
    } else if (t.type === "ExportNamedDeclaration") {
      let { declaration: declaration } = t;
      if (declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration")
        o.push(declaration.id.name);
      else if (declaration?.type === "VariableDeclaration") {
        for (let { id: id } of declaration.declarations) if (id.type === "Identifier") o.push(id.name);
      }
      for (let specifier of t.specifiers) o.push(exportNameText(specifier.exported));
    }
  return o;
}
//@ chunk-bfnfj4kx.js:37829-37888 placement
var Or = (e) => /^[A-Z][A-Za-z0-9]*$/.test(e) && /[a-z]/.test(e);
/**
 * 在 surface 模块中找到组件导出（default 或唯一大写导出）。
 */
//@ chunk-bfnfj4kx.js:37888-38200 placement
function findSurfaceComponent(e) {
  let o = listModuleExports(e);
  if (o.includes(DEFAULT)) return { component: DEFAULT };
  let filtered = o.filter(Or),
    [r] = filtered;
  if (filtered.length === 1 && r !== void 0) return { component: r };
  return {
    problem: `exports ${filtered.length === 0 ? "no component" : filtered.join(", ")}: give it a default export or a single capitalized one (export function Board(props, surface) { ... })`,
  };
}
/**
 * 校验 Client 模块路径（相对路径、代码扩展名、在插件目录内）。
 */
//@ chunk-bfnfj4kx.js:38288-38723 placement
function checkClientModulePath(e) {
  let { spelled: spelled, file: file, root: root } = e,
    n = `Client module "${spelled}"`;
  if (!isDotRelativePath(spelled))
    return {
      problem: `${n} is not relative: spell the surface module's path from this file ("./board.tsx")`,
    };
  if (!Heo(spelled))
    return { problem: `${n} is not named like code: a surface module's path ends in ` + gps };
  let s = resolve_4(dirname_3(file), spelled),
    p = relative_5(resolve_4(root), s);
  return p === ".." || p.startsWith(`..${sep_5}`) || isAbsolute_3(p)
    ? { problem: `${n} leaves the plugin's folder` }
    : { module: p.split(sep_5).join("/") };
}
//@ chunk-bfnfj4kx.js:38723-38821 placement
function Ir(e) {
  try {
    return fos().parse(e, { ecmaVersion: "latest", sourceType: "module" });
  } catch {
    return;
  }
}
/**
 * 链接 hooks 模块时，把源码里 Client 组件的 module 路径替换为解析后的模块路径。
 */
//@ chunk-bfnfj4kx.js:38821-39062 placement
function rewriteClientModulePaths(e, o, t) {
  if (!e.includes(CLIENT)) return e;
  let r = Ir(e),
    n = e;
  for (let s of r ? scanClientCalls(r) : []) {
    if (!("spelled" in s)) continue;
    let p = checkClientModulePath({ spelled: s.spelled, file: o, root: t });
    if ("module" in p) n = n.slice(0, s.at.start) + jsonStringify(p.module) + n.slice(s.at.end);
  }
  return n;
}
/**
 * 扫描 hooks 模块全部文件里的 Client 组件，校验 module 路径并返回排序去重的模块列表；有问题时抛扫描拒绝。
 */
//@ chunk-bfnfj4kx.js:39062-39347 placement
function collectClientModules(e) {
  let o = new Set();
  for (let [t, r] of e.files)
    for (let n of scanClientCalls(r.scanned.program)) {
      if ("problem" in n) throw r.scanned.refuse(n.at, n.problem);
      let s = checkClientModulePath({ spelled: n.spelled, file: t, root: e.root });
      if ("problem" in s) throw r.scanned.refuse(n.at, s.problem);
      o.add(s.module);
    }
  return [...o].sort();
}

export {
  rewriteClientModulePaths,
  readStaticString,
  describeArgument,
  collectClientModules,
  findSurfaceComponent,
};
