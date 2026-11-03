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
import { DIt } from "../../utils/bash/bashReadingFlags.js";
import {
  permissionRuleExtractPrefix,
  matchWildcardPattern,
} from "../../utils/permissions/shellRuleMatching.js";

/**
 * Bash 结果中后台运行相关的字段名（任务 id、输出路径、随最终回复结束、cwd 提示）。
 */
//@ chunk-e6aww6q8.js:4759074-4759184 placement
var BACKGROUND_OUTPUT_FIELDS = {
  backgroundTaskId: !0,
  backgroundOutputPath: !0,
  backgroundEndsWithFinalResponse: !0,
  backgroundCwdHint: !0,
};
//@ chunk-e6aww6q8.js:4759184-4759230 placement
function RVn(e) {
  return Uo(e, Object.keys(BACKGROUND_OUTPUT_FIELDS));
}
/**
 * Bash 命令形状分析常量：命令长度上限、分隔符节点类型、可忽略的节点类型与未处理的执行包装命令集合。
 */
//@ chunk-e6aww6q8.js:4759230-4759889 placement
var MAX_SHAPE_COMMAND_LENGTH = 1e4,
  COMMAND_SEPARATORS = new Set([
    "&&",
    "||",
    "|",
    ";",
    "&",
    "|&",
    `
`,
  ]),
  TRIVIAL_NODE_TYPES = new Set([
    ...COMMAND_SEPARATORS,
    "comment",
    "string_content",
    "simple_expansion",
    "variable_name",
    "special_variable_name",
  ]),
  STRUCTURAL_NODE_TYPES = new Set([...COMMAND_SEPARATORS, "comment", "$(", "`", "<(", ">(", ")"]),
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
//@ chunk-e6aww6q8.js:4759889-4760052 placement
function isWrapperCommandName(e) {
  let lower = e.slice(e.lastIndexOf("/") + 1).toLowerCase();
  return (
    WRAPPER_COMMAND_NAMES_2.has(lower) ||
    WRAPPER_COMMAND_NAMES_2.has(lower.replace(/\.(exe|bat|cmd|com)$/, "").replace(/(?<=[a-z])[\d.]+$/, ""))
  );
}
//@ chunk-e6aww6q8.js:4760052-4760281 placement
var STRING_PART_TYPES = new Set(['"', "string_content", "command_substitution"]),
  EXPANSION_NODE_TYPES = new Set([
    "simple_expansion",
    "expansion",
    "command_substitution",
    "process_substitution",
  ]),
  WORD_NODE_TYPES = new Set(["word", "string", "concatenation", "number"]),
  SAFE_WORD_RE = /^[\w./+-]+$/;
//@ chunk-e6aww6q8.js:4760281-4760517 placement
function isSingleSimpleCommand(e) {
  let filtered = e.filter((h) => !STRUCTURAL_NODE_TYPES.has(h.type));
  if (filtered.length !== 1 || filtered[0].type !== "command") return !1;
  let [r, ...s] = filtered[0].children;
  if (r?.type !== "command_name") return !1;
  for (let h of s) if (!WORD_NODE_TYPES.has(h.type) && !EXPANSION_NODE_TYPES.has(h.type)) return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:4760517-4760694 placement
function getLiteralText(e) {
  if (e.type === "string")
    return e.children
      .filter((n) => n.type !== '"')
      .map(getLiteralText)
      .join("");
  if (e.type === "concatenation") return e.children.map(getLiteralText).join("");
  return e.text;
}
/**
 * 分析 Bash 命令语法树中的替换与展开，判断命令形状。
 */
//@ chunk-e6aww6q8.js:4760694-4761738 placement
function analyzeCommandShape(e) {
  if (!e) return [];
  if (e.length > MAX_SHAPE_COMMAND_LENGTH) return null;
  let parse = getParserModule().parse(e);
  if (!parse) return null;
  if (!isSingleSimpleCommand(parse.children)) return null;
  let r = [],
    s = /\$[({]|`|[<>]\(/,
    h = !1,
    y = (S) => {
      if (S.type === "ERROR") {
        h = !0;
        return;
      }
      if (S.type === "command_substitution" || S.type === "process_substitution") {
        if (!isSingleSimpleCommand(S.children)) {
          h = !0;
          return;
        }
      }
      if (S.type === "string" && S.children.some((w) => !STRING_PART_TYPES.has(w.type))) {
        h = !0;
        return;
      }
      if (
        S.type === "concatenation" &&
        S.children.some((w) => w.type === "simple_expansion" || w.type === "$")
      ) {
        h = !0;
        return;
      }
      if (S.type === "expansion") {
        h = !0;
        return;
      }
      if (S.type === "arithmetic_expansion") {
        h = !0;
        return;
      }
      if (S.type === "raw_string" || S.type === "ansi_c_string") {
        h = !0;
        return;
      }
      if (S.type === "regex" || S.type === "extglob_pattern" || S.type === "word") {
        if (s.test(S.text) || (S.type === "word" && S.text.includes("\\"))) h = !0;
        return;
      }
      if (TRIVIAL_NODE_TYPES.has(S.type)) return;
      if (S.type === "command") {
        let w = S.children.find((L) => L.type === "command_name")?.children[0];
        if (w && (w.type !== "word" || !SAFE_WORD_RE.test(w.text) || isWrapperCommandName(w.text))) {
          h = !0;
          return;
        }
        r.push(S.children.map(getLiteralText).join(" "));
      }
      for (let w of S.children) y(w);
    };
  return (y(parse), h ? null : r);
}
//@ chunk-e6aww6q8.js:4761738-4761808 placement
var fRs = new Set(["command_substitution", "simple_expansion", "string"]);
/**
 * 为命令生成"规则是否可能与之相关"的判定函数：解析出各子命令（或分析命令形状），前缀规则按词前缀/xargs 包装匹配，通配规则按模式匹配；无法分析时一律相关。
 */
//@ chunk-e6aww6q8.js:4761808-4762311 placement
async function buildRuleRelevanceFilter(e) {
  let n = await DIt(() => parseForSecurity(e)),
    r,
    s = !1;
  if (n.kind === "simple") r = n.commands.map((command) => command.argv.join(" "));
  else if (n.differential || !fRs.has(n.nodeType ?? "")) return () => !0;
  else {
    let h = analyzeCommandShape(e);
    if (h === null || h.length === 0) return () => !0;
    ((r = h), (s = !0));
  }
  return (h) => {
    let y = permissionRuleExtractPrefix(h);
    if (s && !(y !== null ? !/\s/.test(y) : /^[^\s*?[]+\s?\*$/.test(h))) return !0;
    return r.some((S) => {
      if (y !== null)
        return S === y || S.startsWith(`${y} `) || S === `xargs ${y}` || S.startsWith(`xargs ${y} `);
      return matchWildcardPattern(h, S, !1, !0) || matchWildcardPattern(`xargs ${h}`, S, !1, !0);
    });
  };
}

export { buildRuleRelevanceFilter, BACKGROUND_OUTPUT_FIELDS, RVn };
