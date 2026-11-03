/**
 * ink/colorize.ts
 *
 * 颜色输出：chalk 级别（--color/--no-color、NO_COLOR/FORCE_COLOR）与着色辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/colorize.ts
 * pieces: chunk-4ymxyb4g.js (14), chunk-cwwxybjc.js (1), chunk-g3xfp0ds.js (2)
 * attribution: placement 10, fingerprint 5, layout 2
 */
import { Z } from "../../vendor/chalk/source/index.js";
import { env as env_2 } from "../utils/env.js";
import { inverseText } from "./screen.js";
import { sequential } from "../utils/sequential.js";
import { B } from "../utils/theme.js";
import { colorize } from "../../vendor/es-toolkit/dist/server/colors/index.mjs";

//@ chunk-4ymxyb4g.js:7196-7204 placement
var u = Z;
//@ chunk-4ymxyb4g.js:7204-7411 placement
var NO_COLOR_FLAGS = new Set(["--no-color", "--no-colors", "--color=false", "--color=never"]),
  FORCE_COLOR_FLAGS = new Set([
    "--color",
    "--colors",
    "--color=true",
    "--color=always",
    "--color=256",
    "--color=16m",
    "--color=full",
    "--color=truecolor",
  ]);
//@ chunk-4ymxyb4g.js:7411-7530 placement
function hasArgvFlag(e) {
  let index = process.argv.indexOf("--");
  return (index === -1 ? process.argv : process.argv.slice(0, index)).some((o) => e.has(o));
}
//@ chunk-4ymxyb4g.js:7530-7560 placement
var te = () => hasArgvFlag(NO_COLOR_FLAGS),
  oe = () => hasArgvFlag(FORCE_COLOR_FLAGS);
//@ chunk-4ymxyb4g.js:7560-7659 placement
function ne() {
  if (env_2.NO_COLOR && env_2.FORCE_COLOR === void 0 && !oe() && u.level > 0) return ((u.level = 0), !0);
  return !1;
}
/**
 * 在 VS Code 终端（xterm.js）里，chalk 颜色等级为 256 色时提升为真彩色。
 */
//@ chunk-4ymxyb4g.js:7659-7744 fingerprint = boostChalkLevelForXtermJs (1)
function boostChalkLevelForXtermJs() {
  if (env_2.TERM_PROGRAM === "vscode" && u.level === 2) return ((u.level = 3), !0);
  return !1;
}
//@ chunk-4ymxyb4g.js:7744-7847 layout
var TRUECOLOR_TERMS = new Set([
  "alacritty",
  "contour",
  "foot",
  "ghostty",
  "rio",
  "wezterm",
  "xterm-ghostty",
  "xterm-kitty",
]);
/**
 * TERM 是已知真彩终端（alacritty、contour、foot、ghostty、rio、wezterm、xterm-kitty 等）且未设 NO_COLOR/FORCE_COLOR 时，把 chalk 等级提升到真彩色。
 */
//@ chunk-4ymxyb4g.js:7847-8006 layout
function boostChalkLevelForTruecolorTerms() {
  if (!process.stdout.isTTY || env_2.NO_COLOR || env_2.FORCE_COLOR !== void 0 || te()) return !1;
  let TERM = env_2.TERM;
  if (TERM && TRUECOLOR_TERMS.has(TERM) && u.level < 3) return ((u.level = 3), !0);
  return !1;
}
/**
 * tmux 下把 chalk 等级降到 256 色（tmux 默认不透传真彩），设置 CLAUDE_CODE_TMUX_TRUECOLOR 时不降。
 */
//@ chunk-4ymxyb4g.js:8006-8111 fingerprint = clampChalkLevelForTmux (1)
function clampChalkLevelForTmux() {
  if (env_2.CLAUDE_CODE_TMUX_TRUECOLOR) return !1;
  if (env_2.TMUX && u.level > 2) return ((u.level = 2), !0);
  return !1;
}
//@ chunk-4ymxyb4g.js:8111-8187 placement
function cAi(e) {
  if ((p.ensureInit(), e && u.level > 2)) return ((u.level = 2), !0);
  return !1;
}
/**
 * 惰性初始化 chalk 颜色级别（解析颜色参数、xterm.js/truecolor 提升、tmux 限制），记下本机级别；clampForAttacher 按附着客户端能力下调级别并递增 generation。
 */
//@ chunk-4ymxyb4g.js:8248-8693 placement
class ChalkLevelController {
  initState = "pending";
  nativeLevel = 0;
  generation = 0;
  ensureInit() {
    if (this.initState !== "pending") return;
    this.initState = "running";
    try {
      (ne(),
        boostChalkLevelForXtermJs(),
        boostChalkLevelForTruecolorTerms(),
        clampChalkLevelForTmux(),
        (this.nativeLevel = u.level),
        (this.initState = "done"));
    } catch (error) {
      throw ((this.initState = "pending"), error);
    }
  }
  get levelGeneration() {
    return (this.ensureInit(), this.generation);
  }
  clampForAttacher(e) {
    this.ensureInit();
    let r = e !== void 0 && e < this.nativeLevel ? e : this.nativeLevel;
    if (r !== u.level) ((u.level = r), this.generation++);
  }
}
//@ chunk-4ymxyb4g.js:8693-8705 placement
var p = new ChalkLevelController();
//@ chunk-4ymxyb4g.js:8939-8979 placement
function kBe() {
  return p.levelGeneration;
}
//@ chunk-4ymxyb4g.js:8979-9017 placement
function uAi(e) {
  p.clampForAttacher(e);
}
/**
 * 把 TextStyles 用 chalk 套到文本上：反显、删除线、下划线、斜体、粗体、暗淡；faintInk 与 color 相同且为标准 ANSI 色时额外加暗淡；最后前景色、背景色。
 */
//@ chunk-g3xfp0ds.js:4974-5419 fingerprint = applyTextStyles (0.937)
function applyTextStyles(text, styles) {
  let result = text;
  if (styles.inverse) result = inverseText(result);
  if (styles.strikethrough) result = sequential.strikethrough(result);
  if (styles.underline) result = sequential.underline(result);
  if (styles.italic) result = sequential.italic(result);
  if (styles.bold) result = sequential.bold(result);
  if (styles.dim) result = sequential.dim(result);
  if (
    styles.faintInk &&
    styles.faintInk === styles.color &&
    !styles.bold &&
    !styles.dim &&
    !styles.inverse &&
    B.has(styles.color) &&
    (!styles.backgroundColor || B.has(styles.backgroundColor))
  )
    result = sequential.dim(result);
  if (styles.color) result = colorize(result, styles.color, "foreground");
  if (styles.backgroundColor) result = colorize(result, styles.backgroundColor, "background");
  return result;
}
/**
 * 只套前景色。
 */
//@ chunk-g3xfp0ds.js:5419-5481 fingerprint = applyColor (1)
function applyColor(text, color) {
  if (!color) return text;
  return colorize(text, color, "foreground");
}
//@ chunk-cwwxybjc.js:4884-5146 fingerprint = colorize (0.57)
var ANSI_COLOR_INDEX = new Map([
  ["black", 0],
  ["red", 1],
  ["green", 2],
  ["yellow", 3],
  ["blue", 4],
  ["magenta", 5],
  ["cyan", 6],
  ["white", 7],
  ["blackBright", 8],
  ["redBright", 9],
  ["greenBright", 10],
  ["yellowBright", 11],
  ["blueBright", 12],
  ["magentaBright", 13],
  ["cyanBright", 14],
  ["whiteBright", 15],
]);

export { kBe, applyColor, cAi, p, u, applyTextStyles, ANSI_COLOR_INDEX, uAi };
