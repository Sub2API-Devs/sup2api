/**
 * tools/BashTool/bashCommandShape.ts
 *
 * 2.1.316 新增：Bash 命令语法形状分析（替换、展开）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  UNHANDLED_EXEC_WRAPPERS,
  EVAL_LIKE_BUILTINS,
  SUBSCRIPT_EVAL_FLAGS,
  BARE_SUBSCRIPT_NAME_BUILTINS,
  ZSH_DANGEROUS_BUILTINS,
  DECLARATION_LIKE_BUILTINS,
  SHELL_PROGRAM_NAMES,
  TRANSPARENT_LAUNCHER_NAMES,
  parseForSecurity,
} from "../../utils/bash/ast.js";
import { getParserModule } from "../../utils/bash/bashParser.js";
import { runWithRuleOff, withSturdyLanternOff } from "../../utils/bash/bashReadingFlags.js";
import {
  permissionRuleExtractPrefix,
  matchWildcardPattern,
} from "../../utils/permissions/shellRuleMatching.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4879313-4879423 placement
/**
 * Bash 结果中后台运行相关的字段名（任务 id、输出路径、随最终回复结束、cwd 提示）。
 */
var BACKGROUND_OUTPUT_FIELDS = {
  backgroundTaskId: true,
  backgroundOutputPath: true,
  backgroundEndsWithFinalResponse: true,
  backgroundCwdHint: true,
};
//@ chunk-5xgkngpb.js:4879423-4879469 placement
/**
 * 取出后台输出相关字段名列表，用于判定命令是否只触碰这些字段。
 */
function getBackgroundOutputFieldNames(input) {
  return omitAlias(input, Object.keys(BACKGROUND_OUTPUT_FIELDS));
}
//@ chunk-5xgkngpb.js:4879469-4880128 placement
/**
 * Bash 命令形状分析常量：命令长度上限、分隔符节点类型、可忽略的节点类型与未处理的执行包装命令集合。
 */
var MAX_SHAPE_COMMAND_LENGTH; // deferred: uses POSIX_SHELL_NAMES (../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
var COMMAND_SEPARATORS;
var TRIVIAL_NODE_TYPES;
var STRUCTURAL_NODE_TYPES;
var WRAPPER_COMMAND_NAMES_2;
deferInit("chunk-5xgkngpb.js:4879469", () => {
  MAX_SHAPE_COMMAND_LENGTH = 1e4;
  COMMAND_SEPARATORS = new Set([
    "&&",
    "||",
    "|",
    ";",
    "&",
    "|&",
    `
`,
  ]);
  TRIVIAL_NODE_TYPES = new Set([
    ...COMMAND_SEPARATORS,
    "comment",
    "string_content",
    "simple_expansion",
    "variable_name",
    "special_variable_name",
  ]);
  STRUCTURAL_NODE_TYPES = new Set([...COMMAND_SEPARATORS, "comment", "$(", "`", "<(", ">(", ")"]);
  WRAPPER_COMMAND_NAMES_2 = new Set([
    ...UNHANDLED_EXEC_WRAPPERS,
    ...EVAL_LIKE_BUILTINS,
    ...Object.keys(SUBSCRIPT_EVAL_FLAGS),
    ...BARE_SUBSCRIPT_NAME_BUILTINS,
    ...ZSH_DANGEROUS_BUILTINS,
    ...DECLARATION_LIKE_BUILTINS,
    "find",
    "jobs",
    "setpriv",
    "setarch",
    "linux32",
    "linux64",
    "arch",
    "xargs",
    "parallel",
    ...SHELL_PROGRAM_NAMES,
    ...TRANSPARENT_LAUNCHER_NAMES,
    "pkexec",
    "chroot",
    "python",
    "python2",
    "python3",
    "perl",
    "ruby",
    "node",
    "nodejs",
    "deno",
    "bun",
    "php",
    "lua",
    "awk",
    "gawk",
    "valgrind",
    "unbuffer",
    "rlwrap",
    "fakeroot",
    "fakechroot",
    "proot",
    "firejail",
    "caffeinate",
    "taskpolicy",
    "systemd-run",
    "expect",
    "socat",
    "screen",
    "tmux",
    "mawk",
    "nawk",
  ]);
});
//@ chunk-5xgkngpb.js:4880128-4880291 placement
function isWrapperCommandName(text) {
  let lower = text.slice(text.lastIndexOf("/") + 1).toLowerCase();
  return (
    WRAPPER_COMMAND_NAMES_2.has(lower) ||
    WRAPPER_COMMAND_NAMES_2.has(lower.replace(/\.(exe|bat|cmd|com)$/, "").replace(/(?<=[a-z])[\d.]+$/, ""))
  );
}
//@ chunk-5xgkngpb.js:4880291-4880520 placement
var STRING_PART_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EXPANSION_NODE_TYPES;
var WORD_NODE_TYPES;
var SAFE_WORD_RE;
deferInit("chunk-5xgkngpb.js:4880291", () => {
  STRING_PART_TYPES = new Set(['"', "string_content", "command_substitution"]);
  EXPANSION_NODE_TYPES = new Set([
    "simple_expansion",
    "expansion",
    "command_substitution",
    "process_substitution",
  ]);
  WORD_NODE_TYPES = new Set(["word", "string", "concatenation", "number"]);
  SAFE_WORD_RE = /^[\w./+-]+$/;
});
//@ chunk-5xgkngpb.js:4880520-4880756 placement
function isSingleSimpleCommand(children) {
  let filtered = children.filter((child) => !STRUCTURAL_NODE_TYPES.has(child.type));
  if (filtered.length !== 1 || filtered[0].type !== "command") return false;
  let [commandName, ...argumentNodes] = filtered[0].children;
  if (commandName?.type !== "command_name") return false;
  for (let argumentNode of argumentNodes)
    if (!WORD_NODE_TYPES.has(argumentNode.type) && !EXPANSION_NODE_TYPES.has(argumentNode.type)) return false;
  return true;
}
//@ chunk-5xgkngpb.js:4880756-4880933 placement
function getLiteralText(node) {
  if (node.type === "string")
    return node.children
      .filter((child) => child.type !== '"')
      .map(getLiteralText)
      .join("");
  if (node.type === "concatenation") return node.children.map(getLiteralText).join("");
  return node.text;
}
//@ chunk-5xgkngpb.js:4880933-4881977 placement
/**
 * 分析 Bash 命令语法树中的替换与展开，判断命令形状。
 */
function analyzeCommandShape(command) {
  if (!command) return [];
  if (command.length > MAX_SHAPE_COMMAND_LENGTH) return null;
  let syntaxTree = getParserModule().parse(command);
  if (!syntaxTree) return null;
  if (!isSingleSimpleCommand(syntaxTree.children)) return null;
  let shapes = [];
  let expansionPattern = /\$[({]|`|[<>]\(/;
  let hasDynamicPart = false;
  let visit = (node) => {
    if (node.type === "ERROR") {
      hasDynamicPart = true;
      return;
    }
    if (node.type === "command_substitution" || node.type === "process_substitution") {
      if (!isSingleSimpleCommand(node.children)) {
        hasDynamicPart = true;
        return;
      }
    }
    if (node.type === "string" && node.children.some((child) => !STRING_PART_TYPES.has(child.type))) {
      hasDynamicPart = true;
      return;
    }
    if (
      node.type === "concatenation" &&
      node.children.some((child) => child.type === "simple_expansion" || child.type === "$")
    ) {
      hasDynamicPart = true;
      return;
    }
    if (node.type === "expansion") {
      hasDynamicPart = true;
      return;
    }
    if (node.type === "arithmetic_expansion") {
      hasDynamicPart = true;
      return;
    }
    if (node.type === "raw_string" || node.type === "ansi_c_string") {
      hasDynamicPart = true;
      return;
    }
    if (node.type === "regex" || node.type === "extglob_pattern" || node.type === "word") {
      if (expansionPattern.test(node.text) || (node.type === "word" && node.text.includes("\\")))
        hasDynamicPart = true;
      return;
    }
    if (TRIVIAL_NODE_TYPES.has(node.type)) return;
    if (node.type === "command") {
      let commandNameNode = node.children.find((child) => child.type === "command_name")?.children[0];
      if (
        commandNameNode &&
        (commandNameNode.type !== "word" ||
          !SAFE_WORD_RE.test(commandNameNode.text) ||
          isWrapperCommandName(commandNameNode.text))
      ) {
        hasDynamicPart = true;
        return;
      }
      shapes.push(node.children.map(getLiteralText).join(" "));
    }
    for (let child of node.children) visit(child);
  };
  visit(syntaxTree);
  return hasDynamicPart ? null : shapes;
}
//@ chunk-5xgkngpb.js:4881977-4882047 placement
/**
 * 规则相关性判定中视为“静态”的 AST 节点类型集合（命令替换、简单展开、字符串）。
 */
var STATIC_NODE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4881977", () => {
  STATIC_NODE_TYPES = new Set(["command_substitution", "simple_expansion", "string"]);
});
//@ chunk-5xgkngpb.js:4882047-4882559 placement
/**
 * 为命令生成"规则是否可能与之相关"的判定函数：解析出各子命令（或分析命令形状），前缀规则按词前缀/xargs 包装匹配，通配规则按模式匹配；无法分析时一律相关。
 */
async function buildRuleRelevanceFilter(command) {
  let parsed = await runWithRuleOff(() => withSturdyLanternOff(() => parseForSecurity(command)));
  let shapes;
  let isShapeDerived = false;
  if (parsed.kind === "simple") shapes = parsed.commands.map((command) => command.argv.join(" "));
  else if (parsed.differential || !STATIC_NODE_TYPES.has(parsed.nodeType ?? "")) return () => true;
  else {
    let analyzedShapes = analyzeCommandShape(command);
    if (analyzedShapes === null || analyzedShapes.length === 0) return () => true;
    shapes = analyzedShapes;
    isShapeDerived = true;
  }
  return (rule) => {
    let rulePrefix = permissionRuleExtractPrefix(rule);
    if (isShapeDerived && !(rulePrefix !== null ? !/\s/.test(rulePrefix) : /^[^\s*?[]+\s?\*$/.test(rule)))
      return true;
    return shapes.some((shape) => {
      if (rulePrefix !== null)
        return (
          shape === rulePrefix ||
          shape.startsWith(`${rulePrefix} `) ||
          shape === `xargs ${rulePrefix}` ||
          shape.startsWith(`xargs ${rulePrefix} `)
        );
      return (
        matchWildcardPattern(rule, shape, false, true) ||
        matchWildcardPattern(`xargs ${rule}`, shape, false, true)
      );
    });
  };
}
export { BACKGROUND_OUTPUT_FIELDS, getBackgroundOutputFieldNames, buildRuleRelevanceFilter };
