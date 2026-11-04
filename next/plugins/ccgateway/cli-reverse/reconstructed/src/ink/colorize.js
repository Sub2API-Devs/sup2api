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
import { chalk } from "../../vendor/chalk/source/index.js";
import { env as env_2 } from "../utils/env.js";
import { inverseText } from "./screen.js";
import { sequential } from "../utils/sequential.js";
import { themeColorCache } from "../utils/theme.js";
import { colorize } from "../../vendor/es-toolkit/dist/server/colors/index.mjs";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-4ymxyb4g.js:7196-7204 placement
var chalkLevel = chalk;
//@ chunk-4ymxyb4g.js:7204-7411 placement
var NO_COLOR_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FORCE_COLOR_FLAGS;
deferInit("chunk-4ymxyb4g.js:7204", () => {
  NO_COLOR_FLAGS = new Set(["--no-color", "--no-colors", "--color=false", "--color=never"]);
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
});
//@ chunk-4ymxyb4g.js:7411-7530 placement
function hasArgvFlag(flags) {
  let index = process.argv.indexOf("--");
  return (index === -1 ? process.argv : process.argv.slice(0, index)).some((arg) => flags.has(arg));
}
//@ chunk-4ymxyb4g.js:7530-7560 placement
var useDetectedColorSupport = () => hasArgvFlag(NO_COLOR_FLAGS);
var useForcedColor = () => hasArgvFlag(FORCE_COLOR_FLAGS);
//@ chunk-4ymxyb4g.js:7560-7659 placement
function disableColorIfNoColor() {
  if (env_2.NO_COLOR && env_2.FORCE_COLOR === undefined && !useForcedColor() && chalkLevel.level > 0) {
    chalkLevel.level = 0;
    return true;
  }
  return false;
}
//@ chunk-4ymxyb4g.js:7659-7744 fingerprint = boostChalkLevelForXtermJs (1)
/**
 * 在 VS Code 终端（xterm.js）里，chalk 颜色等级为 256 色时提升为真彩色。
 */
function boostChalkLevelForXtermJs() {
  if (env_2.TERM_PROGRAM === "vscode" && chalkLevel.level === 2) {
    chalkLevel.level = 3;
    return true;
  }
  return false;
}
//@ chunk-4ymxyb4g.js:7744-7847 layout
var TRUECOLOR_TERMS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4ymxyb4g.js:7744", () => {
  TRUECOLOR_TERMS = new Set([
    "alacritty",
    "contour",
    "foot",
    "ghostty",
    "rio",
    "wezterm",
    "xterm-ghostty",
    "xterm-kitty",
  ]);
});
//@ chunk-4ymxyb4g.js:7847-8006 layout
/**
 * TERM 是已知真彩终端（alacritty、contour、foot、ghostty、rio、wezterm、xterm-kitty 等）且未设 NO_COLOR/FORCE_COLOR 时，把 chalk 等级提升到真彩色。
 */
function boostChalkLevelForTruecolorTerms() {
  if (!process.stdout.isTTY || env_2.NO_COLOR || env_2.FORCE_COLOR !== undefined || useDetectedColorSupport())
    return false;
  let TERM = env_2.TERM;
  if (TERM && TRUECOLOR_TERMS.has(TERM) && chalkLevel.level < 3) {
    chalkLevel.level = 3;
    return true;
  }
  return false;
}
//@ chunk-4ymxyb4g.js:8006-8111 fingerprint = clampChalkLevelForTmux (1)
/**
 * tmux 下把 chalk 等级降到 256 色（tmux 默认不透传真彩），设置 CLAUDE_CODE_TMUX_TRUECOLOR 时不降。
 */
function clampChalkLevelForTmux() {
  if (env_2.CLAUDE_CODE_TMUX_TRUECOLOR) return false;
  if (env_2.TMUX && chalkLevel.level > 2) {
    chalkLevel.level = 2;
    return true;
  }
  return false;
}
//@ chunk-4ymxyb4g.js:8111-8187 placement
/**
 * 函数 clampLevelForAttacher（附着方等级夹到 2）；位于「颜色输出：chalk 级别（--color/--no-color、NO_COLOR/FORCE_COLOR）与着色辅助」模块。
 */
function clampLevelForAttacher(attacherLevel) {
  colorSupport.ensureInit();
  if (attacherLevel && chalkLevel.level > 2) {
    chalkLevel.level = 2;
    return true;
  }
  return false;
}
//@ chunk-4ymxyb4g.js:8248-8693 placement
/**
 * 惰性初始化 chalk 颜色级别（解析颜色参数、xterm.js/truecolor 提升、tmux 限制），记下本机级别；clampForAttacher 按附着客户端能力下调级别并递增 generation。
 */
class ChalkLevelController {
  initState = "pending";
  nativeLevel = 0;
  generation = 0;
  ensureInit() {
    if (this.initState !== "pending") return;
    this.initState = "running";
    try {
      disableColorIfNoColor();
      boostChalkLevelForXtermJs();
      boostChalkLevelForTruecolorTerms();
      clampChalkLevelForTmux();
      this.nativeLevel = chalkLevel.level;
      this.initState = "done";
    } catch (error) {
      this.initState = "pending";
      throw error;
    }
  }
  get levelGeneration() {
    this.ensureInit();
    return this.generation;
  }
  clampForAttacher(attacherLevel) {
    this.ensureInit();
    let target =
      attacherLevel !== undefined && attacherLevel < this.nativeLevel ? attacherLevel : this.nativeLevel;
    if (target !== chalkLevel.level) {
      chalkLevel.level = target;
      this.generation++;
    }
  }
}
//@ chunk-4ymxyb4g.js:8693-8705 placement
var colorSupport; // deferred: uses ChalkLevelController of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4ymxyb4g.js:8693", () => {
  colorSupport = new ChalkLevelController();
});
//@ chunk-4ymxyb4g.js:8939-8979 placement
/**
 * 函数 levelGeneration（等级代数）；位于「颜色输出：chalk 级别（--color/--no-color、NO_COLOR/FORCE_COLOR）与着色辅助」模块。
 */
function levelGeneration() {
  return colorSupport.levelGeneration;
}
//@ chunk-4ymxyb4g.js:8979-9017 placement
/**
 * 函数 clampForAttacher（按附着方夹等级）；位于「颜色输出：chalk 级别（--color/--no-color、NO_COLOR/FORCE_COLOR）与着色辅助」模块。
 */
function clampForAttacher(colorLevel) {
  colorSupport.clampForAttacher(colorLevel);
}
//@ chunk-g3xfp0ds.js:4974-5419 fingerprint = applyTextStyles (0.937)
/**
 * 把 TextStyles 用 chalk 套到文本上：反显、删除线、下划线、斜体、粗体、暗淡；faintInk 与 color 相同且为标准 ANSI 色时额外加暗淡；最后前景色、背景色。
 */
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
    themeColorCache.has(styles.color) &&
    (!styles.backgroundColor || themeColorCache.has(styles.backgroundColor))
  )
    result = sequential.dim(result);
  if (styles.color) result = colorize(result, styles.color, "foreground");
  if (styles.backgroundColor) result = colorize(result, styles.backgroundColor, "background");
  return result;
}
//@ chunk-g3xfp0ds.js:5419-5481 fingerprint = applyColor (1)
/**
 * 只套前景色。
 */
function applyColor(text, color) {
  if (!color) return text;
  return colorize(text, color, "foreground");
}
//@ chunk-cwwxybjc.js:4884-5146 fingerprint = colorize (0.57)
var ANSI_COLOR_INDEX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cwwxybjc.js:4884", () => {
  ANSI_COLOR_INDEX = new Map([
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
});
export {
  levelGeneration,
  applyColor,
  clampLevelForAttacher,
  colorSupport,
  chalkLevel,
  applyTextStyles,
  ANSI_COLOR_INDEX,
  clampForAttacher,
};
