/**
 * utils/systemTheme.ts
 *
 * 系统深浅色主题检测（终端查询缓存或 COLORFGBG）与主题覆盖
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/systemTheme.ts
 * pieces: chunk-34977376.js (11)
 * attribution: callgraph-witnessed 1, layout 5, callgraph-fingerprint 2, fingerprint 2, file-local 1
 */
import { Nz, parseCustomThemeRef, getCustomThemeBase, getCachedCustomTheme } from "./customThemes.js";
import { Btr, getTheme, mergeThemeOverrides } from "./theme.js";
import { env } from "./env.js";

//@ chunk-34977376.js:317-377 callgraph-witnessed = getSystemThemeName (0.736)
function getSystemThemeName() {
  return Nz().cachedSystemTheme() ?? detectFromColorFgBg() ?? "dark";
}
/**
 * 系统主题：优先用缓存的终端查询结果，其次 COLORFGBG。
 */
//@ chunk-34977376.js:377-429 layout
function getSystemTheme() {
  return Nz().cachedSystemTheme() ?? detectFromColorFgBg();
}
//@ chunk-34977376.js:429-476 layout
function getCachedSystemTheme() {
  return Nz().cachedSystemTheme();
}
//@ chunk-34977376.js:476-515 layout
function setSystemTheme(e) {
  Nz().setSystemTheme(e);
}
//@ chunk-34977376.js:515-566 layout
function onSystemThemeChange(e) {
  return Nz().onSystemThemeChange(e);
}
//@ chunk-34977376.js:566-665 callgraph-fingerprint = resolveThemeSetting (0.592)
function resolveThemeSetting(setting) {
  if (setting === "auto") return getSystemThemeName();
  if (Btr(setting)) return setting;
  let t = parseCustomThemeRef(setting);
  return (t && getCustomThemeBase(t)) || "dark";
}
/**
 * 解析主题设置得到主题，再叠加自定义主题覆盖。
 */
//@ chunk-34977376.js:665-753 layout
function getThemeWithOverrides(e) {
  let t = getTheme(resolveThemeSetting(e)),
    n = parseCustomThemeRef(e);
  if (!n) return t;
  return mergeThemeOverrides(t, getCachedCustomTheme(n)?.overrides);
}
//@ chunk-34977376.js:753-852 fingerprint = themeFromOscColor (1)
function themeFromOscColor(data) {
  let rgb = parseOscRgb(data);
  if (!rgb) return;
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b > 0.5 ? "light" : "dark";
}
//@ chunk-34977376.js:852-1135 callgraph-fingerprint = parseOscRgb (1)
function parseOscRgb(data) {
  let rgbMatch = /^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(data);
  if (rgbMatch)
    return { r: hexComponent(rgbMatch[1]), g: hexComponent(rgbMatch[2]), b: hexComponent(rgbMatch[3]) };
  let hashMatch = /^#([0-9a-f]+)$/i.exec(data);
  if (hashMatch && hashMatch[1].length % 3 === 0) {
    let hex = hashMatch[1],
      o = hex.length / 3;
    return {
      r: hexComponent(hex.slice(0, o)),
      g: hexComponent(hex.slice(o, 2 * o)),
      b: hexComponent(hex.slice(2 * o)),
    };
  }
  return;
}
//@ chunk-34977376.js:1135-1194 file-local
function hexComponent(hex) {
  let max = 16 ** hex.length - 1;
  return parseInt(hex, 16) / max;
}
/**
 * 从 COLORFGBG 环境变量推断终端背景：背景色号 0–6 或 8 为 dark，其余 light。
 */
//@ chunk-34977376.js:1194-1385 fingerprint = detectFromColorFgBg (0.815)
function detectFromColorFgBg() {
  let COLORFGBG = env.COLORFGBG;
  if (!COLORFGBG) return;
  let at = COLORFGBG.split(";").at(-1);
  if (at === void 0 || at === "") return;
  let bgNum = Number(at);
  if (!Number.isInteger(bgNum) || bgNum < 0 || bgNum > 15) return;
  return bgNum <= 6 || bgNum === 8 ? "dark" : "light";
}

export {
  getThemeWithOverrides,
  resolveThemeSetting,
  getCachedSystemTheme,
  onSystemThemeChange,
  setSystemTheme,
  getSystemThemeName,
  getSystemTheme,
  themeFromOscColor,
};
