/**
 * utils/systemTheme.ts
 *
 * 系统深浅色主题检测（终端查询缓存或 COLORFGBG）与主题覆盖
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/systemTheme.ts
 * pieces: chunk-0fgj42c8.js (9)
 * attribution: callgraph-witnessed 1, layout 5, callgraph-fingerprint 1, fingerprint 2
 */
import {
  getCustomThemeRegistry,
  parseCustomThemeRef,
  getCustomThemeBase,
  getCachedCustomTheme,
} from "./customThemes.js";
import { isBuiltinThemeName, getTheme, mergeThemeOverrides } from "./theme.js";
import { SETTLED_GREY } from "../components/LogoV2/AnimatedAsterisk.js";
import { env } from "./env.js";

//@ chunk-0fgj42c8.js:317-377 callgraph-witnessed (2.1.88 match: getSystemThemeName, 0.736)
function getSystemThemeName() {
  return getCustomThemeRegistry().cachedSystemTheme() ?? detectFromColorFgBg() ?? "dark";
}
//@ chunk-0fgj42c8.js:377-429 layout
/**
 * 系统主题：优先用缓存的终端查询结果，其次 COLORFGBG。
 */
function getSystemTheme() {
  return getCustomThemeRegistry().cachedSystemTheme() ?? detectFromColorFgBg();
}
//@ chunk-0fgj42c8.js:429-476 layout
function getCachedSystemTheme() {
  return getCustomThemeRegistry().cachedSystemTheme();
}
//@ chunk-0fgj42c8.js:476-515 layout
function setSystemTheme(theme) {
  getCustomThemeRegistry().setSystemTheme(theme);
}
//@ chunk-0fgj42c8.js:515-566 layout
function onSystemThemeChange(listener) {
  return getCustomThemeRegistry().onSystemThemeChange(listener);
}
//@ chunk-0fgj42c8.js:566-665 callgraph-fingerprint (2.1.88 match: resolveThemeSetting, 0.592)
function resolveThemeSetting(setting) {
  if (setting === "auto") return getSystemThemeName();
  if (isBuiltinThemeName(setting)) return setting;
  let customThemeRef = parseCustomThemeRef(setting);
  return (customThemeRef && getCustomThemeBase(customThemeRef)) || "dark";
}
//@ chunk-0fgj42c8.js:665-753 layout
/**
 * 解析主题设置得到主题，再叠加自定义主题覆盖。
 */
function getThemeWithOverrides(setting) {
  let theme = getTheme(resolveThemeSetting(setting));
  let customThemeRef = parseCustomThemeRef(setting);
  if (!customThemeRef) return theme;
  return mergeThemeOverrides(theme, getCachedCustomTheme(customThemeRef)?.overrides);
}
//@ chunk-0fgj42c8.js:753-852 fingerprint (2.1.88 match: themeFromOscColor, 1)
function themeFromOscColor(data) {
  let rgb = SETTLED_GREY(data);
  if (!rgb) return;
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b > 0.5 ? "light" : "dark";
}
//@ chunk-0fgj42c8.js:1194-1385 fingerprint (2.1.88 match: detectFromColorFgBg, 0.815)
/**
 * 从 COLORFGBG 环境变量推断终端背景：背景色号 0–6 或 8 为 dark，其余 light。
 */
function detectFromColorFgBg() {
  let colorfgbg = env.COLORFGBG;
  if (!colorfgbg) return;
  let last = colorfgbg.split(";").at(-1);
  if (last === undefined || last === "") return;
  let bgNum = Number(last);
  if (!Number.isInteger(bgNum) || bgNum < 0 || bgNum > 15) return;
  return bgNum <= 6 || bgNum === 8 ? "dark" : "light";
}
export {
  resolveThemeSetting,
  getSystemTheme,
  getThemeWithOverrides,
  themeFromOscColor,
  setSystemTheme,
  getSystemThemeName,
  onSystemThemeChange,
  getCachedSystemTheme,
};
