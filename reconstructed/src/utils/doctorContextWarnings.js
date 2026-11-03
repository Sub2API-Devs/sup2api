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
import { f2 } from "../../vendor/marked/lib/marked.esm.js";
import { re, hasOverlongLine } from "../components/Markdown.js";
import { lexResult, splitHeadingLines } from "./markdownHeadings.js";
import { re as re_2 } from "../../vendor/@inquirer/figures/dist/esm/index.js";

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
  if (env.CLAUDE_CODE_FORCE_STRIKETHROUGH) return !0;
  let TERM = env.TERM;
  if (env.TERM_PROGRAM === "Apple_Terminal" || TERM === "linux") return !1;
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
var MARKDOWN_LIMITS = 1000,
  de = 16000,
  Te = 100,
  et = 4000,
  Y = 100,
  be = MARKDOWN_LIMITS * Te,
  gfm = f2.rules.block.gfm,
  ye = /\r\n?/g,
  tt = `x
`,
  nt = /^\n*/,
  rt = /\n*$/,
  regExp = new RegExp(`^(?:[^\\n]+\\n){1,${Y}}? {0,3}(?:=+|-+) *(?:\\n|$)`),
  ke = /^(?:[^\n]+\n)+? {0,3}(?:=+|-+) *(?:\n|$)/;
//@ chunk-wj577vf9.js:1824-1917 placement
function st() {
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
var ee = st();
//@ chunk-wj577vf9.js:1929-2040 placement
function lexInlineHtml(e, t) {
  let n = new f2(e.defaults);
  return (t.includes("<") && n.lex(t), n.state.inLink || n.state.inRawBlock);
}
//@ chunk-wj577vf9.js:2040-2162 placement
function isSmallMarkdown(e) {
  let replaced = e.replace(
    ye,
    `
`,
  );
  return (
    re(lexResult([], replaced, MARKDOWN_LIMITS)).length === replaced.length &&
    !hasOverlongLine(replaced.slice(gfm.fences.exec(replaced)?.[0].length))
  );
}
//@ chunk-wj577vf9.js:2162-2258 placement
function lexMarkdownWindowed(e, t) {
  let n = !isSmallMarkdown(t);
  return { tokens: n ? ee.during(() => splitHeadingLines(e, t)) : e.lexer(t), isWindowed: n };
}
//@ chunk-5aas12zq.js:15043-15267 fingerprint = checkUnreachableRules (0.377)
function checkUnreachableRules(getToolPermissionContext) {
  let joined = [getToolPermissionContext.file, getToolPermissionContext.field]
      .filter((r) => r !== "")
      .join(" "),
    t =
      getToolPermissionContext.title === null
        ? getToolPermissionContext.code
        : `${getToolPermissionContext.title} (${getToolPermissionContext.code})`;
  return [
    `  ${re_2.pointer} ${joined === "" ? "" : `${joined}: `}${t}. ${getToolPermissionContext.message}`,
    ...(getToolPermissionContext.fix === null ? [] : [`    Fix: ${getToolPermissionContext.fix}`]),
  ];
}

export {
  lexMarkdownWindowed,
  Y,
  supportsStrikethrough,
  Te,
  be,
  gfm,
  checkUnreachableRules,
  isSmallMarkdown,
  lexInlineHtml,
  ye,
  MARKDOWN_LIMITS,
  de,
  et,
  regExp,
  tt,
  nt,
  rt,
  ee,
  ke,
};
