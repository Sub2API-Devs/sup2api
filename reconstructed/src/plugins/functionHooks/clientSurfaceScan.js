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
import { resolve, dirname, relative as relative_2, sep, isAbsolute } from "path";
import { walkAst, exportNameText } from "./moduleScan.js";
import { isDotRelativePath, isScriptFile, acornParser } from "./moduleLoader.js";
import { SCRIPT_EXTENSIONS_TEXT } from "../../utils/plugins/pluginSourceUrl.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-bfnfj4kx.js:35000-35016 placement
var CLIENT = "Client";
//@ chunk-bfnfj4kx.js:35016-35301 placement
function findModuleProperty(objectNode) {
  let found;
  for (let property of objectNode.properties) {
    if (property.type === "SpreadElement") {
      found = found && {
        ...found,
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
      found = {
        property,
        isSpreadAfter: false,
      };
  }
  return found;
}
//@ chunk-bfnfj4kx.js:35301-35812 placement
/**
 * 描述 AST 参数节点类型（用于报错）。
 */
function describeArgument(argument) {
  if (argument === undefined) return "no argument";
  switch (argument.type) {
    case "Identifier":
      return `the variable ${argument.name}`;
    case "TemplateLiteral":
      return "a template with a substitution";
    case "SpreadElement":
      return "a spread";
    case "Literal":
      return `the literal ${argument.raw ?? String(argument.value)}`;
    case "MemberExpression":
      return "a member read";
    case "CallExpression":
      return "a call";
    case "BinaryExpression":
      return "a concatenation";
    case "ObjectExpression":
      return "an object whose plugin or key is not a string literal";
    default:
      return `a ${argument.type}`;
  }
}
//@ chunk-bfnfj4kx.js:35812-36028 placement
/**
 * 读取字面量或无插值模板字符串的值，否则 undefined。被扫描代码多处使用。
 */
function readStaticString(node) {
  if (node.type === "Literal") return typeof node.value === "string" ? node.value : undefined;
  if (node.type !== "TemplateLiteral" || node.expressions.length !== 0) return;
  let cooked = node.quasis[0]?.value.cooked;
  return cooked === undefined || cooked === null ? undefined : cooked;
}
//@ chunk-bfnfj4kx.js:36028-36726 placement
/**
 * 校验 Client 组件的 props 必须是对象字面量并解析 module。
 */
function scanClientProps(node, objectNode) {
  if (!objectNode || objectNode.type !== "ObjectExpression")
    return {
      at: objectNode ?? node,
      problem: `Client takes its props as an object literal ({ module: "./board.tsx", key }), so the surface module it names can be read before it runs (got ${describeArgument(objectNode)})`,
    };
  let moduleProperty = findModuleProperty(objectNode);
  if (!moduleProperty)
    return {
      at: objectNode,
      problem: `Client names no module: give it module, the surface module's path as a string literal ("./board.tsx")`,
    };
  if (moduleProperty.isSpreadAfter)
    return {
      at: moduleProperty.property,
      problem: "a spread after module in Client(...) could replace it: put module after the spread",
    };
  let { value } = moduleProperty.property;
  let staticString = readStaticString(value);
  if (staticString === undefined)
    return {
      at: value,
      problem: `Client module must be a string literal, the surface module's path relative to this file (got ${describeArgument(value)})`,
    };
  return {
    at: value,
    spelled: staticString,
  };
}
//@ chunk-bfnfj4kx.js:36726-36903 placement
var isClientReference = (node) =>
  (node.type === "Identifier" && node.name === CLIENT) ||
  (node.type === "Literal" && node.value === CLIENT) ||
  (node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier" &&
    node.property.name === CLIENT);
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
  let [firstArg, secondArg] = node.arguments;
  return callee.type === "Identifier" &&
    callee.name === REACT_FACTORY_NAME &&
    firstArg !== undefined &&
    firstArg.type !== "SpreadElement" &&
    isClientReference(firstArg)
    ? {
        argument: secondArg,
      }
    : undefined;
}
//@ chunk-bfnfj4kx.js:37132-37302 placement
function scanClientCalls(program) {
  let problems = [];
  walkAst(program, ({ node }) => {
    if (node.type !== "CallExpression") return;
    let match = matchClientCall(node);
    if (match) problems.push(scanClientProps(node, match.argument));
  });
  return problems.toSorted((a, b) => b.at.start - a.at.start);
}
//@ chunk-bfnfj4kx.js:37302-37319 placement
var DEFAULT = "default";
//@ chunk-bfnfj4kx.js:37319-37829 placement
/**
 * 列出模块的导出名。
 */
function listModuleExports(program) {
  let names = [];
  for (let statement of program.body)
    if (statement.type === "ExportDefaultDeclaration") names.push(DEFAULT);
    else if (statement.type === "ExportAllDeclaration") {
      if (statement.exported !== null && statement.exported) names.push(exportNameText(statement.exported));
    } else if (statement.type === "ExportNamedDeclaration") {
      let { declaration } = statement;
      if (declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration")
        names.push(declaration.id.name);
      else if (declaration?.type === "VariableDeclaration") {
        for (let { id } of declaration.declarations) if (id.type === "Identifier") names.push(id.name);
      }
      for (let specifier of statement.specifiers) names.push(exportNameText(specifier.exported));
    }
  return names;
}
//@ chunk-bfnfj4kx.js:37829-37888 placement
/**
 * 大写开头的组件名
 */
var isComponentExportName = (name) => /^[A-Z][A-Za-z0-9]*$/.test(name) && /[a-z]/.test(name);
//@ chunk-bfnfj4kx.js:37888-38200 placement
/**
 * 在 surface 模块中找到组件导出（default 或唯一大写导出）。
 */
function findSurfaceComponent(program) {
  let exportNames = listModuleExports(program);
  if (exportNames.includes(DEFAULT))
    return {
      component: DEFAULT,
    };
  let filtered = exportNames.filter(isComponentExportName);
  let [only] = filtered;
  if (filtered.length === 1 && only !== undefined)
    return {
      component: only,
    };
  return {
    problem: `exports ${filtered.length === 0 ? "no component" : filtered.join(", ")}: give it a default export or a single capitalized one (export function Board(props, surface) { ... })`,
  };
}
//@ chunk-bfnfj4kx.js:38288-38723 placement
/**
 * 校验 Client 模块路径（相对路径、代码扩展名、在插件目录内）。
 */
function checkClientModulePath(request) {
  let { spelled, file, root } = request;
  let label = `Client module "${spelled}"`;
  if (!isDotRelativePath(spelled))
    return {
      problem: `${label} is not relative: spell the surface module's path from this file ("./board.tsx")`,
    };
  if (!isScriptFile(spelled))
    return {
      problem: `${label} is not named like code: a surface module's path ends in ` + SCRIPT_EXTENSIONS_TEXT,
    };
  let resolved = resolve(dirname(file), spelled);
  let relative = relative_2(resolve(root), resolved);
  return relative === ".." || relative.startsWith(`..${sep}`) || isAbsolute(relative)
    ? {
        problem: `${label} leaves the plugin's folder`,
      }
    : {
        module: relative.split(sep).join("/"),
      };
}
//@ chunk-bfnfj4kx.js:38723-38821 placement
/**
 * 解析模块 AST
 */
function parseModuleAst(source) {
  try {
    return acornParser().parse(source, {
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
function rewriteClientModulePaths(source, file, root) {
  if (!source.includes(CLIENT)) return source;
  let program = parseModuleAst(source);
  let rewritten = source;
  for (let problem of program ? scanClientCalls(program) : []) {
    if (!("spelled" in problem)) continue;
    let checked = checkClientModulePath({
      spelled: problem.spelled,
      file,
      root,
    });
    if ("module" in checked)
      rewritten =
        rewritten.slice(0, problem.at.start) +
        jsonStringify(checked.module) +
        rewritten.slice(problem.at.end);
  }
  return rewritten;
}
//@ chunk-bfnfj4kx.js:39062-39347 placement
/**
 * 扫描 hooks 模块全部文件里的 Client 组件，校验 module 路径并返回排序去重的模块列表；有问题时抛扫描拒绝。
 */
function collectClientModules(submission) {
  let modules = new Set();
  for (let [file, scanned] of submission.files)
    for (let problem of scanClientCalls(scanned.scanned.program)) {
      if ("problem" in problem) throw scanned.scanned.refuse(problem.at, problem.problem);
      let checked = checkClientModulePath({
        spelled: problem.spelled,
        file,
        root: submission.root,
      });
      if ("problem" in checked) throw scanned.scanned.refuse(problem.at, checked.problem);
      modules.add(checked.module);
    }
  return [...modules].sort();
}
export {
  rewriteClientModulePaths,
  readStaticString,
  describeArgument,
  collectClientModules,
  findSurfaceComponent,
};
