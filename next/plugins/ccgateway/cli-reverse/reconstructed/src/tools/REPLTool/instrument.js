/**
 * tools/REPLTool/instrument.ts
 *
 * 在脚本 AST 上插入 __replStep() 计步调用并校验保留名（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (10)
 * attribution: placement 10
 */
import { require_walk } from "../../../vendor/acorn-walk/dist/walk.js";
import { parseScript } from "./parse.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n51jggtb.js:60201-60281 placement
/**
 * __replStep 插桩用的标识与代码片段常量。
 */
var STEP_FN_NAME = "__replStep";
var BLOCK_STEP_PREFIX = "{__replStep();";
var EXPR_STEP_PREFIX = "(__replStep(),";
var BLOCK_STEP_SUFFIX = ";__replStep();";
//@ chunk-n51jggtb.js:60296-60327 placement
/**
 * 返回固定 300000000（步数预算）。
 */
function replStepBudget() {
  return 300000000;
}
//@ chunk-n51jggtb.js:60327-60345 placement
/**
 * "bun:wrap" 常量名。
 */
var BUN_WRAP = "bun:wrap";
//@ chunk-n51jggtb.js:60345-60414 placement
/**
 * 带位置的插桩错误类型。
 */
class ReplSyntaxError extends Error {
  place;
  constructor(message, place) {
    super(message);
    this.place = place;
  }
}
//@ chunk-n51jggtb.js:60924-62367 placement
/**
 * 在 AST 上插入 __replStep() 调用：函数体加计步、顶层包一层快照，并校验保留名与 with 块。
 */
function instrumentSteps(code) {
  let walker = require_walk();
  let ast = parseScript(code);
  let insertions = [];
  let stepFn = findStepFunction(ast);
  if (stepFn !== undefined && !stepFn.async)
    insertions.push({
      at: stepFn.start,
      text: "async ",
    });
  let instrumentBlock = (body) => {
    if (body.type === "BlockStatement") {
      let last = body.body.findLast(
        (statement) => statement.type === "ExpressionStatement" && statement.directive !== undefined,
      );
      insertions.push(
        last === undefined
          ? {
              at: body.start + 1,
              text: "__replStep();",
            }
          : {
              at: last.end,
              text: ";__replStep();",
            },
      );
      return;
    }
    insertions.push({
      at: body.start,
      text: "{__replStep();",
    });
    insertions.push({
      at: body.end,
      text: "}",
    });
  };
  let instrumentArrow = (arrow) => {
    if (arrow.body.type === "BlockStatement") {
      instrumentBlock(arrow.body);
      return;
    }
    insertions.push({
      at: arrow.body.start,
      text: "(__replStep(),",
    });
    insertions.push({
      at: arrow.body.end,
      text: ")",
    });
  };
  walker.full(ast, (node) => {
    switch (node.type) {
      case "Identifier":
        if (node.name === "__replStep")
          throw SyntaxError("REPL: the name __replStep is reserved. Use another name.");
        return;
      case "WithStatement":
        throw SyntaxError("REPL: a with block is not supported.");
      case "ImportExpression":
        if (node.source.type === "Literal" && node.source.value === BUN_WRAP)
          throw new ReplSyntaxError(
            "This script uses syntax that REPL code cannot run, such as a decorator, an `accessor` field or a `using` declaration: it needs helper functions that are loaded by import, and REPL code cannot import.",
          );
        return;
      case "ForStatement":
      case "ForInStatement":
      case "ForOfStatement":
      case "WhileStatement":
      case "DoWhileStatement":
      case "FunctionDeclaration":
      case "FunctionExpression":
        instrumentBlock(node.body);
        return;
      case "ArrowFunctionExpression":
        instrumentArrow(node);
        return;
      default:
        return;
    }
  });
  let sorted = insertions
    .map((insertion, made) => ({
      ...insertion,
      made,
    }))
    .sort((a, b) => b.at - a.at || b.made - a.made);
  let out = code;
  for (let { at, text } of sorted) out = out.slice(0, at) + text + out.slice(at);
  return out;
}
//@ chunk-n51jggtb.js:62367-63056 placement
/**
 * 识别“var 声明 + 末尾表达式”的老式 REPL 返回写法。
 */
function findStepFunction(ast) {
  let last = ast.body.at(-1);
  if (last === undefined) return;
  if (
    ast.body
      .slice(0, -1)
      .every(
        (bodyStatement) =>
          bodyStatement.type === "VariableDeclaration" &&
          bodyStatement.kind === "var" &&
          bodyStatement.declarations.every(
            (declaration) => declaration.id.type === "Identifier" && !declaration.init,
          ),
      ) &&
    last.type === "ExpressionStatement" &&
    last.expression.type === "CallExpression" &&
    last.expression.arguments.length === 0
  ) {
    let callee = last.expression.callee;
    if (
      (callee.type === "ArrowFunctionExpression" || callee.type === "FunctionExpression") &&
      callee.params.length === 0 &&
      !callee.generator
    )
      return callee;
  }
  let names = Error(
    "REPL: the script was not run. The REPL tool could not prepare it to run; this is a fault in the tool, not in the script. The same script will fail the same way, so write it another way, and tell the user.",
  );
  names.stack = undefined;
  throw names;
}
//@ chunk-n51jggtb.js:63056-63075 placement
/**
 * 存放 Promise 替换说明的 WeakMap。
 */
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n51jggtb.js:63056", () => {
  weakMap = new WeakMap();
});
//@ chunk-n51jggtb.js:63075-63113 placement
/**
 * 把错误登记进 WeakMap 后返回该错误。
 */
function tagError(error, label) {
  weakMap.set(error, label);
  return error;
}
//@ chunk-n51jggtb.js:63113-63333 placement
/**
 * Promise 被当字符串拼接时的提示原文。
 */
var UNAWAITED_PROMISE_MESSAGE =
  "REPL: unawaited Promise coerced to string. A result used inline needs 'await' \u2014 e.g. const c = await file(f).text(); await write(f, c + s). Only the top-level keys of a returned object are awaited for you.";
//@ chunk-n51jggtb.js:63333-63532 placement
/**
 * 把 TypeError 映射成“Promise 未 await”的说明。
 */
function errorLabelOf(error, message) {
  let label =
    (typeof error === "object" && error !== null) || typeof error === "function"
      ? weakMap.get(error)
      : undefined;
  if (label !== undefined) return label;
  return message === `TypeError: ${UNAWAITED_PROMISE_MESSAGE}`
    ? "TypeError: a Promise was used without await"
    : undefined;
}
export {
  tagError,
  STEP_FN_NAME,
  ReplSyntaxError,
  instrumentSteps,
  replStepBudget,
  UNAWAITED_PROMISE_MESSAGE,
  BLOCK_STEP_PREFIX,
  EXPR_STEP_PREFIX,
  BLOCK_STEP_SUFFIX,
  errorLabelOf,
};
