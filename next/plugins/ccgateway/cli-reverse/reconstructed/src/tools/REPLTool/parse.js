/**
 * tools/REPLTool/parse.ts
 *
 * 脚本解析与静态校验：语法错误定位、import/require 拒绝、覆盖全局检查（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (17)
 * attribution: placement 17
 */
import { require_acorn } from "../../../vendor/acorn/dist/acorn.js";
import { ReplSyntaxError, tagError, instrumentSteps } from "./instrument.js";
import { identity } from "../../utils/identity.js";
import {
  SYNTAX_ERROR_STATUS,
  UNSUPPORTED_SYNTAX_STATUS,
  NAME_COLLISION_STATUS,
  NO_IMPORT_STATUS,
} from "./stopReasons.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { require_walk } from "../../../vendor/acorn-walk/dist/walk.js";
import { isUntrustedObject } from "../../utils/untrustedValues.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n51jggtb.js:60414-60924 placement
/**
 * 解析脚本为 AST，把语法错误转成带行号列的定位错误。
 */
function parseScript(code) {
  let { parse } = require_acorn();
  try {
    return parse(code, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowHashBang: true,
    });
  } catch (error) {
    if (
      !(error instanceof SyntaxError) ||
      !("loc" in error) ||
      typeof error.loc !== "object" ||
      error.loc === null ||
      !("line" in error.loc) ||
      !("column" in error.loc) ||
      typeof error.loc.line !== "number" ||
      typeof error.loc.column !== "number"
    )
      throw error;
    let { line, column } = error.loc;
    let locationSuffix = ` (${line}:${column})`;
    throw new ReplSyntaxError(
      error.message.endsWith(locationSuffix) ? error.message.slice(0, -locationSuffix.length) : error.message,
      {
        line,
        column,
      },
    );
  }
}
//@ chunk-n51jggtb.js:64594-64697 placement
/**
 * Bun.Transpiler 的配置（js、replMode、关闭 macro）与其缓存。
 */
var TRANSPILER_OPTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var transpilerCache;
deferInit("chunk-n51jggtb.js:64594", () => {
  TRANSPILER_OPTIONS = Object.freeze({
    loader: "js",
    replMode: true,
    macro: false,
  });
  transpilerCache = identity(
    {
      cached: undefined,
    },
    (cache) => {
      cache.cached = undefined;
    },
  );
});
//@ chunk-n51jggtb.js:64697-64791 placement
/**
 * 取（或建立并缓存）REPL 专用的 Bun.Transpiler。
 */
function getTranspiler() {
  if (transpilerCache.cached) return transpilerCache.cached;
  transpilerCache.cached = new Bun.Transpiler(TRANSPILER_OPTIONS);
  return transpilerCache.cached;
}
//@ chunk-n51jggtb.js:64791-65152 placement
/**
 * 脚本编译入口：先扫描 import，再 transformSync，最后做插桩；失败时抛出带定位的解析错误。
 */
function prepareScript(code) {
  let transpiler = getTranspiler();
  assertNoImports(transpiler, code);
  let transpiled;
  try {
    transpiled = transpiler.transformSync(code);
  } catch (error) {
    throw tagError(new ReplParseError(code, error), SYNTAX_ERROR_STATUS);
  }
  try {
    return instrumentSteps(transpiled);
  } catch (error) {
    if (!(error instanceof ReplSyntaxError)) throw error;
    let positioned;
    try {
      parseScript(code);
    } catch (error_2) {
      if (error_2 instanceof ReplSyntaxError && error_2.message === error.message) positioned = error_2;
    }
    let place = positioned?.place;
    throw tagError(
      new ReplParseError(code, {
        message: error.message,
        position: place && {
          line: place.line,
          column: place.column + 1,
          lineText: code.split(`
`)[place.line - 1],
        },
      }),
      UNSUPPORTED_SYNTAX_STATUS,
    );
  }
}
//@ chunk-n51jggtb.js:65152-65168 placement
/**
 * 解析错误里最多报告的条数。
 */
var MAX_PARSE_ERRORS_SHOWN = 5;
var LINE_TEXT_MAX_CHARS = 200;
//@ chunk-n51jggtb.js:65168-65295 placement
/**
 * 脚本解析失败的 ReplParseError 类型。
 */
let ReplParseError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-n51jggtb.js:65168", () => {
  ReplParseError = class ReplParseError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
    constructor(code, cause) {
      super(formatParseErrors(code, cause), "REPL script failed to parse");
      this.name = "ReplParseError";
      this.stack = undefined;
    }
  };
});
//@ chunk-n51jggtb.js:65295-66463 placement
/**
 * 检查脚本是否覆盖了已有全局：收集声明与赋值目标，产出冲突名单。
 */
function assertNoGlobalOverwrite(code, isGlobalName) {
  let walker = require_walk();
  let ast = parseScript(code);
  let topLevelNames = new Set();
  let assignments = [];
  let scopeNames = new Map();
  let topDeclarations = new Set();
  for (let statement of ast.body)
    if (statement.type === "VariableDeclaration") {
      topDeclarations.add(statement);
      for (let declaration of statement.declarations) collectPatternNames(declaration.id, topLevelNames);
    }
  walker.fullAncestor(ast, (node, state, ancestors) => {
    let parent = ancestors.at(-2);
    switch (node.type) {
      case "AssignmentExpression":
        recordAssignmentTargets(node.left, ancestors, isGlobalName, assignments);
        return;
      case "UpdateExpression":
        recordAssignmentTargets(node.argument, ancestors, isGlobalName, assignments);
        return;
      case "ForInStatement":
      case "ForOfStatement":
        if (node.left.type !== "VariableDeclaration")
          recordAssignmentTargets(node.left, ancestors, isGlobalName, assignments);
        return;
      case "VariableDeclaration": {
        if (topDeclarations.has(node)) return;
        let declScope =
          node.kind === "var"
            ? enclosingFunction(ancestors)
            : parent?.type === "SwitchCase"
              ? ancestors.at(-3)
              : parent;
        if (declScope)
          for (let declaration of node.declarations)
            collectPatternNames(declaration.id, scopeSet(scopeNames, declScope));
        return;
      }
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression": {
        let fnScope = scopeSet(scopeNames, node);
        for (let param of node.params) collectPatternNames(param, fnScope);
        if (node.id) {
          let nameScope = node.type === "FunctionDeclaration" ? parent : node;
          if (nameScope) scopeSet(scopeNames, nameScope).add(node.id.name);
        }
        return;
      }
      case "ClassDeclaration":
      case "ClassExpression":
        if (node.id) {
          let classScope = node.type === "ClassDeclaration" ? parent : node;
          if (classScope) scopeSet(scopeNames, classScope).add(node.id.name);
        }
        return;
      case "CatchClause":
        if (node.param) collectPatternNames(node.param, scopeSet(scopeNames, node));
        return;
      default:
        return;
    }
  });
  let globalOverwrites = new Set([...topLevelNames].filter(isGlobalName));
  for (let { name, scopes } of assignments)
    if (!scopes.some((scope) => scopeNames.get(scope)?.has(name))) globalOverwrites.add(name);
  if (globalOverwrites.size === 0) return;
  throw tagError(new ReplGlobalOverwrite([...globalOverwrites]), NAME_COLLISION_STATUS);
}
//@ chunk-n51jggtb.js:66463-67074 placement
/**
 * 覆盖全局时抛出的 ReplGlobalOverwrite 错误，列出被覆盖的名字。
 */
let ReplGlobalOverwrite; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-n51jggtb.js:66463", () => {
  ReplGlobalOverwrite = class ReplGlobalOverwrite extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(names) {
      let mapped = names.map((name) => `\`${name}\``);
      let list =
        mapped.length === 1
          ? `${mapped[0]}, which is already a global here`
          : `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)}, which are already globals here`;
      super(
        `The script did not run: it would overwrite ${list} (a helper, a tool or a JavaScript built-in). A top-level declaration, or an assignment to a name the script does not declare itself, writes the global and so changes it for every later script. Use another name, or declare it inside a function, where it stays local.`,
        "REPL script would overwrite a global",
      );
      this.name = "ReplGlobalOverwrite";
      this.stack = undefined;
    }
  };
});
//@ chunk-n51jggtb.js:67074-68080 placement
/**
 * 把解析错误整理成模型可读的多段说明（含模板串、三引号等常见坑的提示）。
 */
function formatParseErrors(code, error) {
  let errors = error instanceof AggregateError ? error.errors : [error];
  let lines = ["The script did not run: it failed to parse, so nothing in it was executed."];
  for (let error of errors.slice(0, MAX_PARSE_ERRORS_SHOWN)) {
    let message =
      error instanceof Error || (typeof error === "object" && error !== null && "message" in error)
        ? String(error.message)
        : String(error);
    let position =
      typeof error === "object" && error !== null && "position" in error ? (error.position ?? {}) : {};
    let positionLabel =
      typeof position.line === "number" && typeof position.column === "number"
        ? `line ${position.line}:${position.column}  `
        : "";
    lines.push(`  ${positionLabel}${message}`);
    if (typeof position.lineText === "string" && position.lineText !== "")
      lines.push(`    ${position.lineText.slice(0, LINE_TEXT_MAX_CHARS)}`);
  }
  if (errors.length > MAX_PARSE_ERRORS_SHOWN)
    lines.push(`  \u2026 and ${errors.length - MAX_PARSE_ERRORS_SHOWN} more`);
  if (code.includes("`"))
    lines.push(
      "A template literal ends at the next backtick and `${` starts an interpolation, so text that contains either (RST ``code``, a shell ${VAR}, a Python f-string) is safer in a '\u2026' or \"\u2026\" string, or read from a file.",
    );
  if (code.includes("'''") || code.includes('"""'))
    lines.push("JavaScript has no triple-quoted strings: use a template literal, or join lines with \\n.");
  return lines.join(`
`);
}
//@ chunk-n51jggtb.js:68080-68168 placement
/**
 * import / require 各语法类别的展示名映射。
 */
var BLOCKED_IMPORT_KIND = {
  "import-statement": "import",
  "dynamic-import": "import",
  "require-call": "require",
};
//@ chunk-n51jggtb.js:68168-68525 placement
/**
 * 遇到 import/require 时抛出“vm 上下文已封闭、只能用工具全局”的错误。
 */
function assertNoImports(transpiler, code) {
  let imports;
  try {
    imports = transpiler.scanImports(code.replace(/^#!.*/, ""));
  } catch {
    return;
  }
  for (let { kind } of imports) {
    let label = BLOCKED_IMPORT_KIND[kind];
    if (!label) continue;
    throw tagError(
      Error(
        `Module loading (${label}) is not available in REPL \u2014 the vm context is sealed. ` +
          "Use the tool globals instead: await Read({file_path: '...'}), await Glob({pattern: '...'}), the registered shell tool, etc.",
      ),
      NO_IMPORT_STATUS,
    );
  }
}
//@ chunk-n51jggtb.js:68525-68681 placement
/**
 * 从内容对象里取出 value 字段。
 */
function unwrapValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (isUntrustedObject(value)) return value;
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(value, "value");
  return ownPropertyDescriptor && "value" in ownPropertyDescriptor ? ownPropertyDescriptor.value : value;
}
//@ chunk-n51jggtb.js:68681-68874 placement
/**
 * 找到最后一个函数/静态块/Program 节点，用于定位函数体。
 */
function enclosingFunction(ancestors) {
  return ancestors
    .slice(0, -1)
    .findLast(
      (node) =>
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression" ||
        node.type === "StaticBlock" ||
        node.type === "Program",
    );
}
//@ chunk-n51jggtb.js:68874-68954 placement
/**
 * 按 key 取出或新建 Set（用于作用域收集）。
 */
function scopeSet(map, node) {
  let existing = map.get(node);
  if (existing) return existing;
  let names = new Set();
  map.set(node, names);
  return names;
}
//@ chunk-n51jggtb.js:68954-69051 placement
/**
 * 校验名字不在当前作用域内时，记录名字与作用域链。
 */
function recordAssignmentTargets(target, ancestors, isGlobalName, out) {
  let names = new Set();
  collectPatternNames(target, names);
  for (let name of names)
    if (isGlobalName(name))
      out.push({
        name,
        scopes: [...ancestors],
      });
}
//@ chunk-n51jggtb.js:69051-69443 placement
/**
 * 递归收集解构模式里出现的标识符名。
 */
function collectPatternNames(pattern, out) {
  switch (pattern.type) {
    case "Identifier":
      out.add(pattern.name);
      return;
    case "ArrayPattern":
      for (let element of pattern.elements) if (element) collectPatternNames(element, out);
      return;
    case "ObjectPattern":
      for (let property of pattern.properties)
        collectPatternNames(property.type === "RestElement" ? property.argument : property.value, out);
      return;
    case "AssignmentPattern":
      collectPatternNames(pattern.left, out);
      return;
    case "RestElement":
      collectPatternNames(pattern.argument, out);
      return;
    case "ParenthesizedExpression":
      collectPatternNames(pattern.expression, out);
      return;
    default:
      return;
  }
}
//@ chunk-n51jggtb.js:165259-166632 placement
/**
 * 抽查脚本里“拼写完整”的 shell 命令集合，用于判断额外检查是否必要。
 */
function plainShellCommands(code) {
  let walker = require_walk();
  let commands = new Set();
  let identifierRefs = 0;
  let commandRefs = 0;
  let hasDynamic = false;
  try {
    walker.full(parseScript(code), (node) => {
      if (node.type === "Identifier" && (node.name === "$" || node.name === BASH_TOOL_NAME)) {
        identifierRefs++;
        hasDynamic ||= code.slice(node.start, node.end) !== node.name;
        return;
      }
      if (
        node.type === "TaggedTemplateExpression" &&
        node.tag.type === "Identifier" &&
        node.tag.name === "$"
      ) {
        commandRefs++;
        if (node.quasi.expressions.length === 0)
          commands.add(
            (node.quasi.quasis[0]?.value.raw ?? "").replace(
              /\\\\|\\(\$\{|`)/g,
              (match, group) => group ?? match,
            ),
          );
        return;
      }
      if (
        node.type === "MemberExpression" &&
        node.object.type === "Identifier" &&
        (node.object.name === "$" || node.object.name === BASH_TOOL_NAME)
      ) {
        commandRefs++;
        return;
      }
      if (
        node.type !== "CallExpression" ||
        node.callee.type !== "Identifier" ||
        (node.callee.name !== "$" && node.callee.name !== BASH_TOOL_NAME)
      )
        return;
      commandRefs++;
      let [arg] = node.arguments;
      hasDynamic ||=
        arg?.type === "ObjectExpression" &&
        arg.properties.some(
          (property) =>
            property.type === "Property" && code.slice(property.key.start, property.key.end).includes("\\"),
        );
      let commandArg =
        node.callee.name === "$"
          ? arg
          : arg?.type === "ObjectExpression" &&
              arg.properties.every((property) => property.type === "Property" && !property.computed)
            ? arg.properties
                .flatMap((property) =>
                  property.type === "Property" &&
                  ((property.key.type === "Identifier" && property.key.name === "command") ||
                    (property.key.type === "Literal" && property.key.value === "command"))
                    ? [property.value]
                    : [],
                )
                .at(-1)
            : undefined;
      if (
        commandArg?.type === "Literal" &&
        typeof commandArg.value === "string" &&
        commandArg.raw?.includes("\\") === false
      )
        commands.add(commandArg.value);
      if (
        commandArg?.type === "TemplateLiteral" &&
        commandArg.expressions.length === 0 &&
        commandArg.quasis[0] !== undefined &&
        commandArg.quasis[0].value.cooked === commandArg.quasis[0].value.raw
      )
        commands.add(commandArg.quasis[0].value.raw);
    });
  } catch (error) {
    if (!(error instanceof ReplSyntaxError)) logError(error);
    return;
  }
  return identifierRefs === commandRefs && !hasDynamic ? commands : new Set();
}
export { parseScript, plainShellCommands, prepareScript, assertNoGlobalOverwrite, unwrapValue };
