/**
 * utils/doctorContextWarnings.ts
 *
 * 并入 Markdown 分窗词法与删除线支持检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/doctorContextWarnings.ts
 * pieces: chunk-5aas12zq.js (1), chunk-wj577vf9.js (8)
 * attribution: fingerprint 1, placement 8
 */
import { env } from "./env.js";
import { terminalDetector } from "../ink/terminalColorSupport.js";
import { _Lexer } from "../../vendor/marked/lib/marked.esm.js";
import { consumeFirstBlock, hasOverlongLine } from "../components/Markdown.js";
import { lexResult, splitHeadingLines } from "./markdownHeadings.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-wj577vf9.js:1034-1142 placement
var STRIKETHROUGH_TERMINALS = new Set([
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
//@ chunk-wj577vf9.js:1142-1601 placement
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
//@ chunk-wj577vf9.js:1601-1824 placement
/**
 * 单块 Markdown 的最大字符数（16000）。
 */
var MARKDOWN_LIMITS = 1000;
var MAX_MARKDOWN_BLOCK_CHARS = 16000;
var MAX_MARKDOWN_BLOCKS = 100;
var MAX_WINDOW_CHARS = 4000;
var MAX_WINDOW_BLOCKS = 100;
var SMALL_MARKDOWN_THRESHOLD = MARKDOWN_LIMITS * MAX_MARKDOWN_BLOCKS;
var GFM_RULES = _Lexer.rules.block.gfm;
var CRLF_RE = /\r\n?/g;
var PROBE_LINE = `x
`;
var LEADING_NEWLINES_RE = /^\n*/;
var TRAILING_NEWLINES_RE = /\n*$/;
var regExp = new RegExp(`^(?:[^\\n]+\\n){1,${MAX_WINDOW_BLOCKS}}? {0,3}(?:=+|-+) *(?:\\n|$)`);
var MARKDOWN_LIMITS_2 = /^(?:[^\n]+\n)+? {0,3}(?:=+|-+) *(?:\n|$)/;
//@ chunk-wj577vf9.js:1824-1917 placement
/**
 * 构造“是否被保持”的计数器守卫。
 */
function createHeldGuard() {
  let e = 0;
  return {
    isHeld: () => e > 0,
    during: (t) => {
      e += 1;
      try {
        return t();
      } finally {
        e -= 1;
      }
    },
  };
}
//@ chunk-wj577vf9.js:1917-1929 placement
/**
 * 词法分析是否处于保持状态的守卫。
 */
var markdownHeldGuard = createHeldGuard();
//@ chunk-wj577vf9.js:1929-2040 placement
function lexInlineHtml(marked, t) {
  let n = new _Lexer(marked.defaults);
  if (t.includes("<")) n.lex(t);
  return n.state.inLink || n.state.inRawBlock;
}
//@ chunk-wj577vf9.js:2040-2162 placement
function isSmallMarkdown(e) {
  let replaced = e.replace(
    CRLF_RE,
    `
`,
  );
  return (
    consumeFirstBlock(lexResult([], replaced, MARKDOWN_LIMITS)).length === replaced.length &&
    !hasOverlongLine(replaced.slice(GFM_RULES.fences.exec(replaced)?.[0].length))
  );
}
//@ chunk-wj577vf9.js:2162-2258 placement
function lexMarkdownWindowed(marked, t) {
  let n = !isSmallMarkdown(t);
  return {
    tokens: n ? markdownHeldGuard.during(() => splitHeadingLines(marked, t)) : marked.lexer(t),
    isWindowed: n,
  };
}
//@ chunk-5aas12zq.js:15043-15267 fingerprint = checkUnreachableRules (0.377)
function checkUnreachableRules(getToolPermissionContext) {
  let joined = [getToolPermissionContext.file, getToolPermissionContext.field]
    .filter((r) => r !== "")
    .join(" ");
  let t =
    getToolPermissionContext.title === null
      ? getToolPermissionContext.code
      : `${getToolPermissionContext.title} (${getToolPermissionContext.code})`;
  return [
    `  ${figures_default.pointer} ${joined === "" ? "" : `${joined}: `}${t}. ${getToolPermissionContext.message}`,
    ...(getToolPermissionContext.fix === null ? [] : [`    Fix: ${getToolPermissionContext.fix}`]),
  ];
}
export {
  lexMarkdownWindowed,
  MAX_WINDOW_BLOCKS,
  supportsStrikethrough,
  MAX_MARKDOWN_BLOCKS,
  SMALL_MARKDOWN_THRESHOLD,
  GFM_RULES,
  checkUnreachableRules,
  isSmallMarkdown,
  lexInlineHtml,
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
};
