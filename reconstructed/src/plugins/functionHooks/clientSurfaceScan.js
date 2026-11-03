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
import { resolve, dirname, relative, sep, isAbsolute } from "path";
import { walkAst, exportNameText } from "./moduleScan.js";
import { isDotRelativePath, isScriptFile, acornParser } from "./moduleLoader.js";
import { SCRIPT_EXTENSIONS_TEXT } from "../../utils/plugins/pluginSourceUrl.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-bfnfj4kx.js:35000-35016 placement
var CLIENT = "Client";
//@ chunk-bfnfj4kx.js:35016-35301 placement
function findModuleProperty(e) {
  let o;
  for (let property of e.properties) {
    if (property.type === "SpreadElement") {
      o = o && {
        ...o,
        isSpreadAfter: true,
      };
      continue;
    }
    let { key } = property;
    if (
      !property.computed &&
      property.kind === "init" &&
      ((key.type === "Identifier" && key.name === "module") ||
        (key.type === "Literal" && key.value === "module"))
    )
      o = {
        property,
        isSpreadAfter: false,
      };
  }
  return o;
}
//@ chunk-bfnfj4kx.js:35301-35812 placement
/**
 * 描述 AST 参数节点类型（用于报错）。
 */
function describeArgument(e) {
  if (e === undefined) return "no argument";
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
//@ chunk-bfnfj4kx.js:35812-36028 placement
/**
 * 读取字面量或无插值模板字符串的值，否则 undefined。被扫描代码多处使用。
 */
function readStaticString(e) {
  if (e.type === "Literal") return typeof e.value === "string" ? e.value : undefined;
  if (e.type !== "TemplateLiteral" || e.expressions.length !== 0) return;
  let cooked = e.quasis[0]?.value.cooked;
  return cooked === undefined || cooked === null ? undefined : cooked;
}
//@ chunk-bfnfj4kx.js:36028-36726 placement
/**
 * 校验 Client 组件的 props 必须是对象字面量并解析 module。
 */
function scanClientProps(node, argument) {
  if (!argument || argument.type !== "ObjectExpression")
    return {
      at: argument ?? node,
      problem: `Client takes its props as an object literal ({ module: "./board.tsx", key }), so the surface module it names can be read before it runs (got ${describeArgument(argument)})`,
    };
  let moduleProperty = findModuleProperty(argument);
  if (!moduleProperty)
    return {
      at: argument,
      problem: `Client names no module: give it module, the surface module's path as a string literal ("./board.tsx")`,
    };
  if (moduleProperty.isSpreadAfter)
    return {
      at: moduleProperty.property,
      problem: "a spread after module in Client(...) could replace it: put module after the spread",
    };
  let { value: r } = moduleProperty.property;
  let staticString = readStaticString(r);
  if (staticString === undefined)
    return {
      at: r,
      problem: `Client module must be a string literal, the surface module's path relative to this file (got ${describeArgument(r)})`,
    };
  return {
    at: r,
    spelled: staticString,
  };
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
/**
 * "h"
 */
var REACT_FACTORY_NAME = "h";
//@ chunk-bfnfj4kx.js:36914-37132 placement
function matchClientCall(node) {
  let { callee } = node;
  if (callee.type !== "Super" && isClientReference(callee))
    return {
      argument: node.arguments[0],
    };
  let [t, r] = node.arguments;
  return callee.type === "Identifier" &&
    callee.name === REACT_FACTORY_NAME &&
    t !== undefined &&
    t.type !== "SpreadElement" &&
    isClientReference(t)
    ? {
        argument: r,
      }
    : undefined;
}
//@ chunk-bfnfj4kx.js:37132-37302 placement
function scanClientCalls(e) {
  let o = [];
  walkAst(e, ({ node }) => {
    if (node.type !== "CallExpression") return;
    let r = matchClientCall(node);
    if (r) o.push(scanClientProps(node, r.argument));
  });
  return o.toSorted((t, r) => r.at.start - t.at.start);
}
//@ chunk-bfnfj4kx.js:37302-37319 placement
var DEFAULT = "default";
//@ chunk-bfnfj4kx.js:37319-37829 placement
/**
 * 列出模块的导出名。
 */
function listModuleExports(e) {
  let o = [];
  for (let t of e.body)
    if (t.type === "ExportDefaultDeclaration") o.push(DEFAULT);
    else if (t.type === "ExportAllDeclaration") {
      if (t.exported !== null && t.exported) o.push(exportNameText(t.exported));
    } else if (t.type === "ExportNamedDeclaration") {
      let { declaration } = t;
      if (declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration")
        o.push(declaration.id.name);
      else if (declaration?.type === "VariableDeclaration") {
        for (let { id } of declaration.declarations) if (id.type === "Identifier") o.push(id.name);
      }
      for (let specifier of t.specifiers) o.push(exportNameText(specifier.exported));
    }
  return o;
}
//@ chunk-bfnfj4kx.js:37829-37888 placement
/**
 * 大写开头的组件名
 */
var isComponentExportName = (e) => /^[A-Z][A-Za-z0-9]*$/.test(e) && /[a-z]/.test(e);
//@ chunk-bfnfj4kx.js:37888-38200 placement
/**
 * 在 surface 模块中找到组件导出（default 或唯一大写导出）。
 */
function findSurfaceComponent(program) {
  let o = listModuleExports(program);
  if (o.includes(DEFAULT))
    return {
      component: DEFAULT,
    };
  let filtered = o.filter(isComponentExportName);
  let [r] = filtered;
  if (filtered.length === 1 && r !== undefined)
    return {
      component: r,
    };
  return {
    problem: `exports ${filtered.length === 0 ? "no component" : filtered.join(", ")}: give it a default export or a single capitalized one (export function Board(props, surface) { ... })`,
  };
}
//@ chunk-bfnfj4kx.js:38288-38723 placement
/**
 * 校验 Client 模块路径（相对路径、代码扩展名、在插件目录内）。
 */
function checkClientModulePath(e) {
  let { spelled, file, root } = e;
  let n = `Client module "${spelled}"`;
  if (!isDotRelativePath(spelled))
    return {
      problem: `${n} is not relative: spell the surface module's path from this file ("./board.tsx")`,
    };
  if (!isScriptFile(spelled))
    return {
      problem: `${n} is not named like code: a surface module's path ends in ` + SCRIPT_EXTENSIONS_TEXT,
    };
  let s = resolve(dirname(file), spelled);
  let p = relative(resolve(root), s);
  return p === ".." || p.startsWith(`..${sep}`) || isAbsolute(p)
    ? {
        problem: `${n} leaves the plugin's folder`,
      }
    : {
        module: p.split(sep).join("/"),
      };
}
//@ chunk-bfnfj4kx.js:38723-38821 placement
/**
 * 解析模块 AST
 */
function parseModuleAst(e) {
  try {
    return acornParser().parse(e, {
      ecmaVersion: "latest",
      sourceType: "module",
    });
  } catch {
    return;
  }
}
//@ chunk-bfnfj4kx.js:38821-39062 placement
/**
 * 链接 hooks 模块时，把源码里 Client 组件的 module 路径替换为解析后的模块路径。
 */
function rewriteClientModulePaths(e, file, root) {
  if (!e.includes(CLIENT)) return e;
  let moduleAst = parseModuleAst(e);
  let n = e;
  for (let s of moduleAst ? scanClientCalls(moduleAst) : []) {
    if (!("spelled" in s)) continue;
    let p = checkClientModulePath({
      spelled: s.spelled,
      file,
      root,
    });
    if ("module" in p) n = n.slice(0, s.at.start) + jsonStringify(p.module) + n.slice(s.at.end);
  }
  return n;
}
//@ chunk-bfnfj4kx.js:39062-39347 placement
/**
 * 扫描 hooks 模块全部文件里的 Client 组件，校验 module 路径并返回排序去重的模块列表；有问题时抛扫描拒绝。
 */
function collectClientModules(e) {
  let o = new Set();
  for (let [t, r] of e.files)
    for (let n of scanClientCalls(r.scanned.program)) {
      if ("problem" in n) throw r.scanned.refuse(n.at, n.problem);
      let s = checkClientModulePath({
        spelled: n.spelled,
        file: t,
        root: e.root,
      });
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
