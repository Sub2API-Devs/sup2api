/**
 * tools/BashTool/bashCommandShape.ts
 *
 * 2.1.316 新增：Bash 命令语法形状分析（替换、展开）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { runWithRuleOff } from "../../utils/bash/bashReadingFlags.js";
import {
  permissionRuleExtractPrefix,
  matchWildcardPattern,
} from "../../utils/permissions/shellRuleMatching.js";

//@ chunk-e6aww6q8.js:4759074-4759184 placement
/**
 * Bash 结果中后台运行相关的字段名（任务 id、输出路径、随最终回复结束、cwd 提示）。
 */
var BACKGROUND_OUTPUT_FIELDS = {
  backgroundTaskId: true,
  backgroundOutputPath: true,
  backgroundEndsWithFinalResponse: true,
  backgroundCwdHint: true,
};
//@ chunk-e6aww6q8.js:4759184-4759230 placement
/**
 * 取出后台输出相关字段名列表，用于判定命令是否只触碰这些字段。
 */
function getBackgroundOutputFieldNames(e) {
  return Uo(e, Object.keys(BACKGROUND_OUTPUT_FIELDS));
}
//@ chunk-e6aww6q8.js:4759230-4759889 placement
/**
 * Bash 命令形状分析常量：命令长度上限、分隔符节点类型、可忽略的节点类型与未处理的执行包装命令集合。
 */
var MAX_SHAPE_COMMAND_LENGTH = 1e4;
var COMMAND_SEPARATORS = new Set([
  "&&",
  "||",
  "|",
  ";",
  "&",
  "|&",
  `
`,
]);
var TRIVIAL_NODE_TYPES = new Set([
  ...COMMAND_SEPARATORS,
  "comment",
  "string_content",
  "simple_expansion",
  "variable_name",
  "special_variable_name",
]);
var STRUCTURAL_NODE_TYPES = new Set([...COMMAND_SEPARATORS, "comment", "$(", "`", "<(", ">(", ")"]);
var WRAPPER_COMMAND_NAMES_2 = new Set([
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
//@ chunk-e6aww6q8.js:4759889-4760052 placement
function isWrapperCommandName(text) {
  let lower = text.slice(text.lastIndexOf("/") + 1).toLowerCase();
  return (
    WRAPPER_COMMAND_NAMES_2.has(lower) ||
    WRAPPER_COMMAND_NAMES_2.has(lower.replace(/\.(exe|bat|cmd|com)$/, "").replace(/(?<=[a-z])[\d.]+$/, ""))
  );
}
//@ chunk-e6aww6q8.js:4760052-4760281 placement
var STRING_PART_TYPES = new Set(['"', "string_content", "command_substitution"]);
var EXPANSION_NODE_TYPES = new Set([
  "simple_expansion",
  "expansion",
  "command_substitution",
  "process_substitution",
]);
var WORD_NODE_TYPES = new Set(["word", "string", "concatenation", "number"]);
var SAFE_WORD_RE = /^[\w./+-]+$/;
//@ chunk-e6aww6q8.js:4760281-4760517 placement
function isSingleSimpleCommand(children) {
  let filtered = children.filter((h) => !STRUCTURAL_NODE_TYPES.has(h.type));
  if (filtered.length !== 1 || filtered[0].type !== "command") return false;
  let [r, ...s] = filtered[0].children;
  if (r?.type !== "command_name") return false;
  for (let h of s) if (!WORD_NODE_TYPES.has(h.type) && !EXPANSION_NODE_TYPES.has(h.type)) return false;
  return true;
}
//@ chunk-e6aww6q8.js:4760517-4760694 placement
function getLiteralText(e) {
  if (e.type === "string")
    return e.children
      .filter((child) => child.type !== '"')
      .map(getLiteralText)
      .join("");
  if (e.type === "concatenation") return e.children.map(getLiteralText).join("");
  return e.text;
}
//@ chunk-e6aww6q8.js:4760694-4761738 placement
/**
 * 分析 Bash 命令语法树中的替换与展开，判断命令形状。
 */
function analyzeCommandShape(e) {
  if (!e) return [];
  if (e.length > MAX_SHAPE_COMMAND_LENGTH) return null;
  let n = getParserModule().parse(e);
  if (!n) return null;
  if (!isSingleSimpleCommand(n.children)) return null;
  let r = [];
  let s = /\$[({]|`|[<>]\(/;
  let h = false;
  let y = (S) => {
    if (S.type === "ERROR") {
      h = true;
      return;
    }
    if (S.type === "command_substitution" || S.type === "process_substitution") {
      if (!isSingleSimpleCommand(S.children)) {
        h = true;
        return;
      }
    }
    if (S.type === "string" && S.children.some((child) => !STRING_PART_TYPES.has(child.type))) {
      h = true;
      return;
    }
    if (
      S.type === "concatenation" &&
      S.children.some((child) => child.type === "simple_expansion" || child.type === "$")
    ) {
      h = true;
      return;
    }
    if (S.type === "expansion") {
      h = true;
      return;
    }
    if (S.type === "arithmetic_expansion") {
      h = true;
      return;
    }
    if (S.type === "raw_string" || S.type === "ansi_c_string") {
      h = true;
      return;
    }
    if (S.type === "regex" || S.type === "extglob_pattern" || S.type === "word") {
      if (s.test(S.text) || (S.type === "word" && S.text.includes("\\"))) h = true;
      return;
    }
    if (TRIVIAL_NODE_TYPES.has(S.type)) return;
    if (S.type === "command") {
      let w = S.children.find((child) => child.type === "command_name")?.children[0];
      if (w && (w.type !== "word" || !SAFE_WORD_RE.test(w.text) || isWrapperCommandName(w.text))) {
        h = true;
        return;
      }
      r.push(S.children.map(getLiteralText).join(" "));
    }
    for (let child of S.children) y(child);
  };
  y(n);
  return h ? null : r;
}
//@ chunk-e6aww6q8.js:4761738-4761808 placement
/**
 * 规则相关性判定中视为“静态”的 AST 节点类型集合（命令替换、简单展开、字符串）。
 */
var STATIC_NODE_TYPES = new Set(["command_substitution", "simple_expansion", "string"]);
//@ chunk-e6aww6q8.js:4761808-4762311 placement
/**
 * 为命令生成"规则是否可能与之相关"的判定函数：解析出各子命令（或分析命令形状），前缀规则按词前缀/xargs 包装匹配，通配规则按模式匹配；无法分析时一律相关。
 */
async function buildRuleRelevanceFilter(e) {
  let n = await runWithRuleOff(() => parseForSecurity(e));
  let r;
  let s = false;
  if (n.kind === "simple") r = n.commands.map((command) => command.argv.join(" "));
  else if (n.differential || !STATIC_NODE_TYPES.has(n.nodeType ?? "")) return () => true;
  else {
    let h = analyzeCommandShape(e);
    if (h === null || h.length === 0) return () => true;
    r = h;
    s = true;
  }
  return (h) => {
    let y = permissionRuleExtractPrefix(h);
    if (s && !(y !== null ? !/\s/.test(y) : /^[^\s*?[]+\s?\*$/.test(h))) return true;
    return r.some((S) => {
      if (y !== null)
        return S === y || S.startsWith(`${y} `) || S === `xargs ${y}` || S.startsWith(`xargs ${y} `);
      return matchWildcardPattern(h, S, false, true) || matchWildcardPattern(`xargs ${h}`, S, false, true);
    });
  };
}
export { buildRuleRelevanceFilter, BACKGROUND_OUTPUT_FIELDS, getBackgroundOutputFieldNames };
