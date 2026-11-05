/**
 * utils/doctorContextWarnings.ts
 *
 * 并入 Markdown 分窗词法与删除线支持检测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/doctorContextWarnings.ts
 * pieces: chunk-6vxyfwtv.js (1), chunk-ptrwzav4.js (8)
 * attribution: fingerprint 1, placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "./env.js";
import { terminalDetector } from "../ink/terminalColorSupport.js";
import { _Lexer } from "../../vendor/marked/lib/marked.esm.js";
import { consumeFirstBlock, hasOverlongLine } from "../components/Markdown.js";
import { lexResult, splitHeadingLines } from "./markdownHeadings.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ptrwzav4.js:1034-1142 placement
var STRIKETHROUGH_TERMINALS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ptrwzav4.js:1034", () => {
  STRIKETHROUGH_TERMINALS = new Set([
    "iTerm.app",
    "vscode",
    "WezTerm",
    "WarpTerminal",
    "Hyper",
    "Tabby",
    "rio",
    "contour",
    "alacritty",
  ]);
});
//@ chunk-ptrwzav4.js:1142-1601 placement
function supportsStrikethrough() {
  if (env.CLAUDE_CODE_FORCE_STRIKETHROUGH) return true;
  let TERM = env.TERM;
  if (env.TERM_PROGRAM === "Apple_Terminal" || TERM === "linux") return false;
  return (
    STRIKETHROUGH_TERMINALS.has(env.TERM_PROGRAM ?? "") ||
    terminalDetector.isGhostty() ||
    terminalDetector.isMintty() ||
    terminalDetector.isJetBrainsIdeTerminal() ||
    env.LC_TERMINAL === "iTerm2" ||
    !!TERM?.includes("kitty") ||
    !!TERM?.includes("alacritty") ||
    !!TERM?.startsWith("foot") ||
    !!env.KITTY_WINDOW_ID ||
    !!env.ALACRITTY_LOG ||
    !!env.KONSOLE_VERSION ||
    !!env.WT_SESSION ||
    !!env.ZED_TERM ||
    parseInt(env.VTE_VERSION ?? "", 10) >= 4400
  );
}
//@ chunk-ptrwzav4.js:1601-1824 placement
/**
 * 单块 Markdown 的最大字符数（16000）。
 */
var MARKDOWN_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_MARKDOWN_BLOCK_CHARS;
var MAX_MARKDOWN_BLOCKS;
var MAX_WINDOW_CHARS;
var MAX_WINDOW_BLOCKS;
var SMALL_MARKDOWN_THRESHOLD;
var GFM_RULES;
var CRLF_RE;
var PROBE_LINE;
var LEADING_NEWLINES_RE;
var TRAILING_NEWLINES_RE;
var regExp;
var MARKDOWN_LIMITS_2;
deferInit("chunk-ptrwzav4.js:1601", () => {
  MARKDOWN_LIMITS = 1000;
  MAX_MARKDOWN_BLOCK_CHARS = 16000;
  MAX_MARKDOWN_BLOCKS = 100;
  MAX_WINDOW_CHARS = 4000;
  MAX_WINDOW_BLOCKS = 100;
  SMALL_MARKDOWN_THRESHOLD = MARKDOWN_LIMITS * MAX_MARKDOWN_BLOCKS;
  GFM_RULES = _Lexer.rules.block.gfm;
  CRLF_RE = /\r\n?/g;
  PROBE_LINE = `x
`;
  LEADING_NEWLINES_RE = /^\n*/;
  TRAILING_NEWLINES_RE = /\n*$/;
  regExp = new RegExp(`^(?:[^\\n]+\\n){1,${MAX_WINDOW_BLOCKS}}? {0,3}(?:=+|-+) *(?:\\n|$)`);
  MARKDOWN_LIMITS_2 = /^(?:[^\n]+\n)+? {0,3}(?:=+|-+) *(?:\n|$)/;
});
//@ chunk-ptrwzav4.js:1824-1917 placement
/**
 * 构造“是否被保持”的计数器守卫。
 */
function createHeldGuard() {
  let depth = 0;
  return {
    isHeld: () => depth > 0,
    during: (fn) => {
      depth += 1;
      try {
        return fn();
      } finally {
        depth -= 1;
      }
    },
  };
}
//@ chunk-ptrwzav4.js:1917-1929 placement
/**
 * 词法分析是否处于保持状态的守卫。
 */
var markdownHeldGuard; // deferred: uses createHeldGuard of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ptrwzav4.js:1917", () => {
  markdownHeldGuard = createHeldGuard();
});
//@ chunk-ptrwzav4.js:1929-2040 placement
function lexInlineHtml(marked, text) {
  let lexer = new _Lexer(marked.defaults);
  if (text.includes("<")) lexer.lex(text);
  return lexer.state.inLink || lexer.state.inRawBlock;
}
//@ chunk-ptrwzav4.js:2040-2162 placement
function isSmallMarkdown(text) {
  let replaced = text.replace(
    CRLF_RE,
    `
`,
  );
  return (
    consumeFirstBlock(lexResult([], replaced, MARKDOWN_LIMITS)).length === replaced.length &&
    !hasOverlongLine(replaced.slice(GFM_RULES.fences.exec(replaced)?.[0].length))
  );
}
//@ chunk-ptrwzav4.js:2162-2258 placement
function lexMarkdownWindowed(highlight, text) {
  let isWindowed = !isSmallMarkdown(text);
  return {
    tokens: isWindowed
      ? markdownHeldGuard.during(() => splitHeadingLines(highlight, text))
      : highlight.lexer(text),
    isWindowed,
  };
}
//@ chunk-6vxyfwtv.js:15162-15386 fingerprint (2.1.88 match: checkUnreachableRules, 0.377)
function checkUnreachableRules(getToolPermissionContext) {
  let joined = [getToolPermissionContext.file, getToolPermissionContext.field]
    .filter((segment) => segment !== "")
    .join(" ");
  let reason =
    getToolPermissionContext.title === null
      ? getToolPermissionContext.code
      : `${getToolPermissionContext.title} (${getToolPermissionContext.code})`;
  return [
    `  ${figures_default.pointer} ${joined === "" ? "" : `${joined}: `}${reason}. ${getToolPermissionContext.message}`,
    ...(getToolPermissionContext.fix === null ? [] : [`    Fix: ${getToolPermissionContext.fix}`]),
  ];
}
export {
  lexMarkdownWindowed,
  checkUnreachableRules,
  supportsStrikethrough,
  MAX_WINDOW_BLOCKS,
  MAX_MARKDOWN_BLOCKS,
  SMALL_MARKDOWN_THRESHOLD,
  GFM_RULES,
  CRLF_RE,
  MARKDOWN_LIMITS,
  MAX_MARKDOWN_BLOCK_CHARS,
  MAX_WINDOW_CHARS,
  regExp,
  PROBE_LINE,
  LEADING_NEWLINES_RE,
  TRAILING_NEWLINES_RE,
  markdownHeldGuard,
  MARKDOWN_LIMITS_2,
  isSmallMarkdown,
  lexInlineHtml,
};
