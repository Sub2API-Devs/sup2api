/**
 * utils/theme.ts
 *
 * 内置主题调色板：dark/light/dark-ansi/light-ansi/dark-daltonized/light-daltonized 六套，约 75 个颜色键；getTheme 与主题色到 ANSI 的转换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/theme.ts
 * pieces: chunk-g3xfp0ds.js (16)
 * attribution: placement 10, fingerprint 3, layout 3
 */
import { levelGeneration } from "../ink/colorize.js";
import { sequential } from "./sequential.js";
import { isDefaultFgColor, ANSI_COLOR_NAME_SET } from "../ink/terminalColorSupport.js";
import { firstLineOf } from "./stringUtils.js";
import { colorize } from "../../vendor/es-toolkit/dist/server/colors/index.mjs";
import { SETTING_FIELD_LABELS, CONFIG_SOURCE_LABELS } from "./config.js";
import { env } from "./env.js";
import { Chalk } from "../../vendor/chalk/source/index.js";

//@ chunk-g3xfp0ds.js:5481-5491 placement
var MAX_THEME_COLOR_CACHE = 256;
//@ chunk-g3xfp0ds.js:5491-5819 placement
/**
 * 主题颜色缓存（按代次与色彩级别）。
 */
class ThemeColorCache {
  generation = -1;
  level = -1;
  byColor = new Map();
  has(r) {
    let e = levelGeneration();
    if (e !== this.generation || sequential.level !== this.level) {
      this.generation = e;
      this.level = sequential.level;
      this.byColor.clear();
    }
    let n = this.byColor.get(r);
    if (n === undefined) {
      if (this.byColor.size >= MAX_THEME_COLOR_CACHE) this.byColor.clear();
      n = isDefaultFgColor(firstLineOf(colorize(" ", r, "foreground"), " "));
      this.byColor.set(r, n);
    }
    return n;
  }
}
//@ chunk-g3xfp0ds.js:5819-5831 placement
var themeColorCache = new ThemeColorCache();
//@ chunk-g3xfp0ds.js:5831-6027 placement
class BackgroundSequenceCache {
  byColorAndLevel = new Map();
  sequenceFor(r) {
    let e = `${r}|${sequential.level}`;
    let n = this.byColorAndLevel.get(e);
    if (n === undefined) {
      n = firstLineOf(colorize("\x00", r, "background"), "\x00");
      this.byColorAndLevel.set(e, n);
    }
    return n;
  }
}
//@ chunk-g3xfp0ds.js:6027-6039 placement
var backgroundSequenceCache = new BackgroundSequenceCache();
//@ chunk-g3xfp0ds.js:6039-6195 placement
function applyBackgroundColor(text, color) {
  let n = backgroundSequenceCache.sequenceFor(color);
  if (n === "") return text;
  return (
    n +
    text
      .replaceAll("\x1B[0m", `\x1B[0m${n}`)
      .replaceAll("\x1B[49m", n)
      .replaceAll(
        `
`,
        `
${n}`,
      )
  );
}
//@ chunk-g3xfp0ds.js:6195-6240 placement
/**
 * 是否为浅色主题。
 */
function isLightTheme(r) {
  return r.startsWith("light");
}
//@ chunk-g3xfp0ds.js:6240-6300 placement
/**
 * 是否内置主题名。
 */
function isBuiltinThemeName(r) {
  return typeof r === "string" && SETTING_FIELD_LABELS.includes(r);
}
//@ chunk-g3xfp0ds.js:6300-6342 placement
/**
 * 是否为内置主题名。
 */
function isBuiltinTheme(color) {
  return Object.hasOwn(DARK_THEME, color);
}
//@ chunk-g3xfp0ds.js:6342-6429 placement
/**
 * 是否可选主题（内置或 custom: 前缀）。
 */
function isSelectableThemeName(r) {
  return typeof r === "string" && (CONFIG_SOURCE_LABELS.includes(r) || r.startsWith("custom:"));
}
//@ chunk-g3xfp0ds.js:6429-20980 fingerprint = lightDaltonizedTheme (0.647)
/**
 * 六套主题调色板（每套约 75 个颜色键：claude、permission、planMode、autoAccept、bashBorder、promptBorder、diffAdded/Removed(+Dimmed/Word)、success/error/warning、subtle/inactive、userMessageBackground、rainbow_*、*_FOR_SUBAGENTS_ONLY 等）。
 */
var LIGHT_THEME = {
  autoAccept: "rgb(135,0,255)",
  autoAcceptShimmer: "rgb(208,180,255)",
  skill: "rgb(135,0,255)",
  bashBorder: "rgb(255,0,135)",
  claude: "rgb(215,119,87)",
  claudeShimmer: "rgb(245,149,117)",
  claudeBlue_FOR_SYSTEM_SPINNER: "rgb(87,105,247)",
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: "rgb(117,135,255)",
  permission: "rgb(87,105,247)",
  permissionShimmer: "rgb(137,155,255)",
  planMode: "rgb(0,102,102)",
  ide: "rgb(71,130,200)",
  promptBorder: "rgb(138,138,138)",
  promptBorderShimmer: "rgb(183,183,183)",
  text: "rgb(0,0,0)",
  inverseText: "rgb(255,255,255)",
  inactive: "rgb(102,102,102)",
  inactiveShimmer: "rgb(142,142,142)",
  subtle: "rgb(175,175,175)",
  suggestion: "rgb(87,105,247)",
  remember: "rgb(0,0,255)",
  background: "rgb(0,153,153)",
  success: "rgb(44,122,57)",
  error: "rgb(171,43,63)",
  warning: "rgb(150,108,30)",
  merged: "rgb(135,0,255)",
  warningShimmer: "rgb(200,158,80)",
  diffAdded: "rgb(105,219,124)",
  diffRemoved: "rgb(255,168,180)",
  diffAddedDimmed: "rgb(199,225,203)",
  diffRemovedDimmed: "rgb(253,210,216)",
  diffAddedWord: "rgb(47,157,68)",
  diffRemovedWord: "rgb(209,69,75)",
  red_FOR_SUBAGENTS_ONLY: "rgb(220,38,38)",
  blue_FOR_SUBAGENTS_ONLY: "rgb(106,155,204)",
  green_FOR_SUBAGENTS_ONLY: "rgb(22,163,74)",
  yellow_FOR_SUBAGENTS_ONLY: "rgb(202,138,4)",
  purple_FOR_SUBAGENTS_ONLY: "rgb(130,125,189)",
  orange_FOR_SUBAGENTS_ONLY: "rgb(217,119,87)",
  pink_FOR_SUBAGENTS_ONLY: "rgb(196,102,134)",
  cyan_FOR_SUBAGENTS_ONLY: "rgb(8,145,178)",
  professionalBlue: "rgb(106,155,204)",
  chromeYellow: "rgb(251,188,4)",
  clawd_body: "rgb(215,119,87)",
  clawd_background: "rgb(0,0,0)",
  userMessageBackground: "rgb(240, 240, 240)",
  userMessageBackgroundHover: "rgb(252, 252, 252)",
  composerSidebarBackground: "rgb(245, 245, 245)",
  selectionBg: "rgb(180, 213, 255)",
  bashMessageBackgroundColor: "rgb(250, 245, 250)",
  memoryBackgroundColor: "rgb(230, 245, 250)",
  rate_limit_fill: "rgb(87,105,247)",
  rate_limit_empty: "rgb(39,47,111)",
  fastMode: "rgb(255,106,0)",
  fastModeShimmer: "rgb(255,150,50)",
  effortUltra: "rgb(135,0,255)",
  briefLabelYou: "rgb(37,99,235)",
  briefLabelClaude: "rgb(215,119,87)",
  rainbow_red: "rgb(235,95,87)",
  rainbow_orange: "rgb(245,139,87)",
  rainbow_yellow: "rgb(250,195,95)",
  rainbow_green: "rgb(145,200,130)",
  rainbow_blue: "rgb(130,170,220)",
  rainbow_indigo: "rgb(155,130,200)",
  rainbow_violet: "rgb(200,130,180)",
  rainbow_red_shimmer: "rgb(250,155,147)",
  rainbow_orange_shimmer: "rgb(255,185,137)",
  rainbow_yellow_shimmer: "rgb(255,225,155)",
  rainbow_green_shimmer: "rgb(185,230,180)",
  rainbow_blue_shimmer: "rgb(180,205,240)",
  rainbow_indigo_shimmer: "rgb(195,180,230)",
  rainbow_violet_shimmer: "rgb(230,180,210)",
};
var LIGHT_ANSI_THEME = {
  autoAccept: "ansi:magenta",
  autoAcceptShimmer: "ansi:magentaBright",
  skill: "ansi:magenta",
  bashBorder: "ansi:magenta",
  claude: "ansi:redBright",
  claudeShimmer: "ansi:yellowBright",
  claudeBlue_FOR_SYSTEM_SPINNER: "ansi:blue",
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: "ansi:blueBright",
  permission: "ansi:blue",
  permissionShimmer: "ansi:blueBright",
  planMode: "ansi:cyan",
  ide: "ansi:blueBright",
  promptBorder: "ansi:white",
  promptBorderShimmer: "ansi:whiteBright",
  text: "ansi:black",
  inverseText: "ansi:white",
  inactive: "ansi:blackBright",
  inactiveShimmer: "ansi:white",
  subtle: "ansi:blackBright",
  suggestion: "ansi:blue",
  remember: "ansi:blue",
  background: "ansi:cyan",
  success: "ansi:green",
  error: "ansi:red",
  warning: "ansi:yellow",
  merged: "ansi:magenta",
  warningShimmer: "ansi:yellowBright",
  diffAdded: "ansi:green",
  diffRemoved: "ansi:red",
  diffAddedDimmed: "ansi:green",
  diffRemovedDimmed: "ansi:red",
  diffAddedWord: "ansi:greenBright",
  diffRemovedWord: "ansi:redBright",
  red_FOR_SUBAGENTS_ONLY: "ansi:red",
  blue_FOR_SUBAGENTS_ONLY: "ansi:blue",
  green_FOR_SUBAGENTS_ONLY: "ansi:green",
  yellow_FOR_SUBAGENTS_ONLY: "ansi:yellow",
  purple_FOR_SUBAGENTS_ONLY: "ansi:magenta",
  orange_FOR_SUBAGENTS_ONLY: "ansi:redBright",
  pink_FOR_SUBAGENTS_ONLY: "ansi:magentaBright",
  cyan_FOR_SUBAGENTS_ONLY: "ansi:cyan",
  professionalBlue: "ansi:blueBright",
  chromeYellow: "ansi:yellow",
  clawd_body: "ansi:redBright",
  clawd_background: "ansi:black",
  userMessageBackground: "ansi:white",
  userMessageBackgroundHover: "ansi:whiteBright",
  composerSidebarBackground: "ansi:white",
  selectionBg: "ansi:cyan",
  bashMessageBackgroundColor: "ansi:whiteBright",
  memoryBackgroundColor: "ansi:white",
  rate_limit_fill: "ansi:yellow",
  rate_limit_empty: "ansi:black",
  fastMode: "ansi:red",
  fastModeShimmer: "ansi:redBright",
  effortUltra: "ansi:magenta",
  briefLabelYou: "ansi:blue",
  briefLabelClaude: "ansi:redBright",
  rainbow_red: "ansi:red",
  rainbow_orange: "ansi:redBright",
  rainbow_yellow: "ansi:yellow",
  rainbow_green: "ansi:green",
  rainbow_blue: "ansi:cyan",
  rainbow_indigo: "ansi:blue",
  rainbow_violet: "ansi:magenta",
  rainbow_red_shimmer: "ansi:redBright",
  rainbow_orange_shimmer: "ansi:yellow",
  rainbow_yellow_shimmer: "ansi:yellowBright",
  rainbow_green_shimmer: "ansi:greenBright",
  rainbow_blue_shimmer: "ansi:cyanBright",
  rainbow_indigo_shimmer: "ansi:blueBright",
  rainbow_violet_shimmer: "ansi:magentaBright",
};
var DARK_ANSI_THEME = {
  autoAccept: "ansi:magentaBright",
  autoAcceptShimmer: "ansi:magentaBright",
  skill: "ansi:magentaBright",
  bashBorder: "ansi:magentaBright",
  claude: "ansi:redBright",
  claudeShimmer: "ansi:yellowBright",
  claudeBlue_FOR_SYSTEM_SPINNER: "ansi:blueBright",
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: "ansi:blueBright",
  permission: "ansi:blueBright",
  permissionShimmer: "ansi:blueBright",
  planMode: "ansi:cyanBright",
  ide: "ansi:blue",
  promptBorder: "ansi:white",
  promptBorderShimmer: "ansi:whiteBright",
  text: "ansi:whiteBright",
  inverseText: "ansi:black",
  inactive: "ansi:white",
  inactiveShimmer: "ansi:whiteBright",
  subtle: "ansi:white",
  suggestion: "ansi:blueBright",
  remember: "ansi:blueBright",
  background: "ansi:cyanBright",
  success: "ansi:greenBright",
  error: "ansi:redBright",
  warning: "ansi:yellowBright",
  merged: "ansi:magentaBright",
  warningShimmer: "ansi:yellowBright",
  diffAdded: "ansi:green",
  diffRemoved: "ansi:red",
  diffAddedDimmed: "ansi:green",
  diffRemovedDimmed: "ansi:red",
  diffAddedWord: "ansi:greenBright",
  diffRemovedWord: "ansi:redBright",
  red_FOR_SUBAGENTS_ONLY: "ansi:redBright",
  blue_FOR_SUBAGENTS_ONLY: "ansi:blueBright",
  green_FOR_SUBAGENTS_ONLY: "ansi:greenBright",
  yellow_FOR_SUBAGENTS_ONLY: "ansi:yellowBright",
  purple_FOR_SUBAGENTS_ONLY: "ansi:magentaBright",
  orange_FOR_SUBAGENTS_ONLY: "ansi:redBright",
  pink_FOR_SUBAGENTS_ONLY: "ansi:magentaBright",
  cyan_FOR_SUBAGENTS_ONLY: "ansi:cyanBright",
  professionalBlue: "rgb(106,155,204)",
  chromeYellow: "ansi:yellowBright",
  clawd_body: "ansi:redBright",
  clawd_background: "ansi:black",
  userMessageBackground: "ansi:blackBright",
  userMessageBackgroundHover: "ansi:black",
  composerSidebarBackground: "ansi:blackBright",
  selectionBg: "ansi:blue",
  bashMessageBackgroundColor: "ansi:black",
  memoryBackgroundColor: "ansi:blackBright",
  rate_limit_fill: "ansi:yellow",
  rate_limit_empty: "ansi:white",
  fastMode: "ansi:redBright",
  fastModeShimmer: "ansi:redBright",
  effortUltra: "ansi:magentaBright",
  briefLabelYou: "ansi:whiteBright",
  briefLabelClaude: "ansi:redBright",
  rainbow_red: "ansi:red",
  rainbow_orange: "ansi:redBright",
  rainbow_yellow: "ansi:yellow",
  rainbow_green: "ansi:green",
  rainbow_blue: "ansi:cyan",
  rainbow_indigo: "ansi:blue",
  rainbow_violet: "ansi:magenta",
  rainbow_red_shimmer: "ansi:redBright",
  rainbow_orange_shimmer: "ansi:yellow",
  rainbow_yellow_shimmer: "ansi:yellowBright",
  rainbow_green_shimmer: "ansi:greenBright",
  rainbow_blue_shimmer: "ansi:cyanBright",
  rainbow_indigo_shimmer: "ansi:blueBright",
  rainbow_violet_shimmer: "ansi:magentaBright",
};
var LIGHT_DALTONIZED_THEME = {
  autoAccept: "rgb(135,0,255)",
  autoAcceptShimmer: "rgb(208,180,255)",
  skill: "rgb(135,0,255)",
  bashBorder: "rgb(0,102,204)",
  claude: "rgb(255,153,51)",
  claudeShimmer: "rgb(255,183,101)",
  claudeBlue_FOR_SYSTEM_SPINNER: "rgb(51,102,255)",
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: "rgb(101,152,255)",
  permission: "rgb(51,102,255)",
  permissionShimmer: "rgb(101,152,255)",
  planMode: "rgb(51,102,102)",
  ide: "rgb(71,130,200)",
  promptBorder: "rgb(138,138,138)",
  promptBorderShimmer: "rgb(183,183,183)",
  text: "rgb(0,0,0)",
  inverseText: "rgb(255,255,255)",
  inactive: "rgb(102,102,102)",
  inactiveShimmer: "rgb(142,142,142)",
  subtle: "rgb(175,175,175)",
  suggestion: "rgb(51,102,255)",
  remember: "rgb(51,102,255)",
  background: "rgb(0,153,153)",
  success: "rgb(0,102,153)",
  error: "rgb(204,0,0)",
  warning: "rgb(255,153,0)",
  merged: "rgb(135,0,255)",
  warningShimmer: "rgb(255,183,50)",
  diffAdded: "rgb(153,204,255)",
  diffRemoved: "rgb(255,204,204)",
  diffAddedDimmed: "rgb(209,231,253)",
  diffRemovedDimmed: "rgb(255,233,233)",
  diffAddedWord: "rgb(51,102,204)",
  diffRemovedWord: "rgb(153,51,51)",
  red_FOR_SUBAGENTS_ONLY: "rgb(204,0,0)",
  blue_FOR_SUBAGENTS_ONLY: "rgb(0,102,204)",
  green_FOR_SUBAGENTS_ONLY: "rgb(0,204,0)",
  yellow_FOR_SUBAGENTS_ONLY: "rgb(255,204,0)",
  purple_FOR_SUBAGENTS_ONLY: "rgb(128,0,128)",
  orange_FOR_SUBAGENTS_ONLY: "rgb(255,128,0)",
  pink_FOR_SUBAGENTS_ONLY: "rgb(255,102,178)",
  cyan_FOR_SUBAGENTS_ONLY: "rgb(0,178,178)",
  professionalBlue: "rgb(106,155,204)",
  chromeYellow: "rgb(251,188,4)",
  clawd_body: "rgb(215,119,87)",
  clawd_background: "rgb(0,0,0)",
  userMessageBackground: "rgb(220, 220, 220)",
  userMessageBackgroundHover: "rgb(232, 232, 232)",
  composerSidebarBackground: "rgb(235, 235, 235)",
  selectionBg: "rgb(180, 213, 255)",
  bashMessageBackgroundColor: "rgb(250, 245, 250)",
  memoryBackgroundColor: "rgb(230, 245, 250)",
  rate_limit_fill: "rgb(51,102,255)",
  rate_limit_empty: "rgb(23,46,114)",
  fastMode: "rgb(255,106,0)",
  fastModeShimmer: "rgb(255,150,50)",
  effortUltra: "rgb(135,0,255)",
  briefLabelYou: "rgb(37,99,235)",
  briefLabelClaude: "rgb(255,153,51)",
  rainbow_red: "rgb(235,95,87)",
  rainbow_orange: "rgb(245,139,87)",
  rainbow_yellow: "rgb(250,195,95)",
  rainbow_green: "rgb(145,200,130)",
  rainbow_blue: "rgb(130,170,220)",
  rainbow_indigo: "rgb(155,130,200)",
  rainbow_violet: "rgb(200,130,180)",
  rainbow_red_shimmer: "rgb(250,155,147)",
  rainbow_orange_shimmer: "rgb(255,185,137)",
  rainbow_yellow_shimmer: "rgb(255,225,155)",
  rainbow_green_shimmer: "rgb(185,230,180)",
  rainbow_blue_shimmer: "rgb(180,205,240)",
  rainbow_indigo_shimmer: "rgb(195,180,230)",
  rainbow_violet_shimmer: "rgb(230,180,210)",
};
var DARK_THEME = {
  autoAccept: "rgb(175,135,255)",
  autoAcceptShimmer: "rgb(208,180,255)",
  skill: "rgb(175,135,255)",
  bashBorder: "rgb(253,93,177)",
  claude: "rgb(215,119,87)",
  claudeShimmer: "rgb(235,159,127)",
  claudeBlue_FOR_SYSTEM_SPINNER: "rgb(147,165,255)",
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: "rgb(177,195,255)",
  permission: "rgb(177,185,249)",
  permissionShimmer: "rgb(207,215,255)",
  planMode: "rgb(72,150,140)",
  ide: "rgb(71,130,200)",
  promptBorder: "rgb(136,136,136)",
  promptBorderShimmer: "rgb(166,166,166)",
  text: "rgb(255,255,255)",
  inverseText: "rgb(0,0,0)",
  inactive: "rgb(153,153,153)",
  inactiveShimmer: "rgb(193,193,193)",
  subtle: "rgb(80,80,80)",
  suggestion: "rgb(177,185,249)",
  remember: "rgb(177,185,249)",
  background: "rgb(0,204,204)",
  success: "rgb(78,186,101)",
  error: "rgb(255,107,128)",
  warning: "rgb(255,193,7)",
  merged: "rgb(175,135,255)",
  warningShimmer: "rgb(255,223,57)",
  diffAdded: "rgb(34,92,43)",
  diffRemoved: "rgb(122,41,54)",
  diffAddedDimmed: "rgb(71,88,74)",
  diffRemovedDimmed: "rgb(105,72,77)",
  diffAddedWord: "rgb(56,166,96)",
  diffRemovedWord: "rgb(179,89,107)",
  red_FOR_SUBAGENTS_ONLY: "rgb(220,38,38)",
  blue_FOR_SUBAGENTS_ONLY: "rgb(106,155,204)",
  green_FOR_SUBAGENTS_ONLY: "rgb(22,163,74)",
  yellow_FOR_SUBAGENTS_ONLY: "rgb(202,138,4)",
  purple_FOR_SUBAGENTS_ONLY: "rgb(130,125,189)",
  orange_FOR_SUBAGENTS_ONLY: "rgb(217,119,87)",
  pink_FOR_SUBAGENTS_ONLY: "rgb(196,102,134)",
  cyan_FOR_SUBAGENTS_ONLY: "rgb(8,145,178)",
  professionalBlue: "rgb(106,155,204)",
  chromeYellow: "rgb(251,188,4)",
  clawd_body: "rgb(215,119,87)",
  clawd_background: "rgb(0,0,0)",
  userMessageBackground: "rgb(55, 55, 55)",
  userMessageBackgroundHover: "rgb(70, 70, 70)",
  composerSidebarBackground: "rgb(38, 38, 38)",
  selectionBg: "rgb(38, 79, 120)",
  bashMessageBackgroundColor: "rgb(65, 60, 65)",
  memoryBackgroundColor: "rgb(55, 65, 70)",
  rate_limit_fill: "rgb(177,185,249)",
  rate_limit_empty: "rgb(80,83,112)",
  fastMode: "rgb(255,120,20)",
  fastModeShimmer: "rgb(255,165,70)",
  effortUltra: "rgb(175,135,255)",
  briefLabelYou: "rgb(122,180,232)",
  briefLabelClaude: "rgb(215,119,87)",
  rainbow_red: "rgb(235,95,87)",
  rainbow_orange: "rgb(245,139,87)",
  rainbow_yellow: "rgb(250,195,95)",
  rainbow_green: "rgb(145,200,130)",
  rainbow_blue: "rgb(130,170,220)",
  rainbow_indigo: "rgb(155,130,200)",
  rainbow_violet: "rgb(200,130,180)",
  rainbow_red_shimmer: "rgb(250,155,147)",
  rainbow_orange_shimmer: "rgb(255,185,137)",
  rainbow_yellow_shimmer: "rgb(255,225,155)",
  rainbow_green_shimmer: "rgb(185,230,180)",
  rainbow_blue_shimmer: "rgb(180,205,240)",
  rainbow_indigo_shimmer: "rgb(195,180,230)",
  rainbow_violet_shimmer: "rgb(230,180,210)",
};
var DARK_DALTONIZED_THEME = {
  autoAccept: "rgb(175,135,255)",
  autoAcceptShimmer: "rgb(208,180,255)",
  skill: "rgb(175,135,255)",
  bashBorder: "rgb(51,153,255)",
  claude: "rgb(255,153,51)",
  claudeShimmer: "rgb(255,183,101)",
  claudeBlue_FOR_SYSTEM_SPINNER: "rgb(153,204,255)",
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: "rgb(183,224,255)",
  permission: "rgb(153,204,255)",
  permissionShimmer: "rgb(183,224,255)",
  planMode: "rgb(102,153,153)",
  ide: "rgb(71,130,200)",
  promptBorder: "rgb(136,136,136)",
  promptBorderShimmer: "rgb(166,166,166)",
  text: "rgb(255,255,255)",
  inverseText: "rgb(0,0,0)",
  inactive: "rgb(153,153,153)",
  inactiveShimmer: "rgb(193,193,193)",
  subtle: "rgb(80,80,80)",
  suggestion: "rgb(153,204,255)",
  remember: "rgb(153,204,255)",
  background: "rgb(0,204,204)",
  success: "rgb(51,153,255)",
  error: "rgb(255,102,102)",
  warning: "rgb(255,204,0)",
  merged: "rgb(175,135,255)",
  warningShimmer: "rgb(255,234,50)",
  diffAdded: "rgb(0,68,102)",
  diffRemoved: "rgb(102,0,0)",
  diffAddedDimmed: "rgb(62,81,91)",
  diffRemovedDimmed: "rgb(62,44,44)",
  diffAddedWord: "rgb(0,119,179)",
  diffRemovedWord: "rgb(179,0,0)",
  red_FOR_SUBAGENTS_ONLY: "rgb(255,102,102)",
  blue_FOR_SUBAGENTS_ONLY: "rgb(102,178,255)",
  green_FOR_SUBAGENTS_ONLY: "rgb(102,255,102)",
  yellow_FOR_SUBAGENTS_ONLY: "rgb(255,255,102)",
  purple_FOR_SUBAGENTS_ONLY: "rgb(178,102,255)",
  orange_FOR_SUBAGENTS_ONLY: "rgb(255,178,102)",
  pink_FOR_SUBAGENTS_ONLY: "rgb(255,153,204)",
  cyan_FOR_SUBAGENTS_ONLY: "rgb(102,204,204)",
  professionalBlue: "rgb(106,155,204)",
  chromeYellow: "rgb(251,188,4)",
  clawd_body: "rgb(215,119,87)",
  clawd_background: "rgb(0,0,0)",
  userMessageBackground: "rgb(55, 55, 55)",
  userMessageBackgroundHover: "rgb(70, 70, 70)",
  composerSidebarBackground: "rgb(38, 38, 38)",
  selectionBg: "rgb(38, 79, 120)",
  bashMessageBackgroundColor: "rgb(65, 60, 65)",
  memoryBackgroundColor: "rgb(55, 65, 70)",
  rate_limit_fill: "rgb(153,204,255)",
  rate_limit_empty: "rgb(69,92,115)",
  fastMode: "rgb(255,120,20)",
  fastModeShimmer: "rgb(255,165,70)",
  effortUltra: "rgb(175,135,255)",
  briefLabelYou: "rgb(122,180,232)",
  briefLabelClaude: "rgb(255,153,51)",
  rainbow_red: "rgb(235,95,87)",
  rainbow_orange: "rgb(245,139,87)",
  rainbow_yellow: "rgb(250,195,95)",
  rainbow_green: "rgb(145,200,130)",
  rainbow_blue: "rgb(130,170,220)",
  rainbow_indigo: "rgb(155,130,200)",
  rainbow_violet: "rgb(200,130,180)",
  rainbow_red_shimmer: "rgb(250,155,147)",
  rainbow_orange_shimmer: "rgb(255,185,137)",
  rainbow_yellow_shimmer: "rgb(255,225,155)",
  rainbow_green_shimmer: "rgb(185,230,180)",
  rainbow_blue_shimmer: "rgb(180,205,240)",
  rainbow_indigo_shimmer: "rgb(195,180,230)",
  rainbow_violet_shimmer: "rgb(230,180,210)",
};
//@ chunk-g3xfp0ds.js:20980-21158 fingerprint = getTheme (1)
/**
 * 按主题名取调色板：light/light-ansi/dark-ansi/light-daltonized/dark-daltonized，其他（含 dark）返回 dark 调色板。
 */
function getTheme(themeName) {
  switch (themeName) {
    case "light":
      return LIGHT_THEME;
    case "light-ansi":
      return LIGHT_ANSI_THEME;
    case "dark-ansi":
      return DARK_ANSI_THEME;
    case "light-daltonized":
      return LIGHT_DALTONIZED_THEME;
    case "dark-daltonized":
      return DARK_DALTONIZED_THEME;
    default:
      return DARK_THEME;
  }
}
//@ chunk-g3xfp0ds.js:21158-21443 layout = toInkColor (1)
/**
 * 颜色值是否合法：rgb(r,g,b)、#RGB/#RRGGBB、ansi256(n)、ansi:<名字>。
 */
function isValidThemeColor(color) {
  if (typeof color !== "string") return false;
  if (/^rgb\(\s?\d{1,3},\s?\d{1,3},\s?\d{1,3}\s?\)$/.test(color)) return true;
  if (/^#[0-9a-fA-F]{6}$/.test(color) || /^#[0-9a-fA-F]{3}$/.test(color)) return true;
  if (/^ansi256\(\d{1,3}\)$/.test(color)) return true;
  if (color.startsWith("ansi:")) return ANSI_COLOR_NAME_SET.has(color.slice(5));
  return false;
}
//@ chunk-g3xfp0ds.js:21443-21567 layout
function mergeThemeOverrides(theme, e) {
  if (!e) return theme;
  let n = {
    ...theme,
  };
  for (let [key, value] of Object.entries(e))
    if (Object.hasOwn(theme, key) && isValidThemeColor(value)) n[key] = value;
  return n;
}
//@ chunk-g3xfp0ds.js:21567-21625 layout = chalkForChart (1)
var chalkForChart =
  env.terminal === "Apple_Terminal"
    ? new Chalk({
        level: 2,
      })
    : sequential;
//@ chunk-g3xfp0ds.js:21625-21925 fingerprint = themeColorToAnsi (0.797)
/**
 * 把主题色值转为 ANSI 转义（rgb → 真彩、ansi: → 16 色）。
 */
function themeColorToAnsi(themeColor) {
  let rgbMatch = themeColor.match(/rgb\(\s?(\d+),\s?(\d+),\s?(\d+)\s?\)/);
  if (rgbMatch) {
    let g = parseInt(rgbMatch[1], 10);
    let t = parseInt(rgbMatch[2], 10);
    let s = parseInt(rgbMatch[3], 10);
    let colored = chalkForChart.rgb(g, t, s)("X");
    return colored.slice(0, colored.indexOf("X"));
  }
  if (sequential.level === 0) return "";
  let n = colorize("X", themeColor, "foreground");
  let index = n.indexOf("X");
  return index > 0 ? n.slice(0, index) : "\x1B[35m";
}
export {
  isValidThemeColor,
  themeColorToAnsi,
  getTheme,
  isBuiltinThemeName,
  mergeThemeOverrides,
  themeColorCache,
  isSelectableThemeName,
  isLightTheme,
  isBuiltinTheme,
  applyBackgroundColor,
};
