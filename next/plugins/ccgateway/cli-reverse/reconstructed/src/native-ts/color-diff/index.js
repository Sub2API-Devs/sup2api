/**
 * native-ts/color-diff/index.ts
 *
 * 并入颜色差异模块的少量声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/native-ts/color-diff/index.ts
 * pieces: chunk-cwwxybjc.js (54)
 * attribution: fingerprint 21, layout 19, callgraph-fingerprint 4, file-local 3, sole-consumer 2, affinity 1, callgraph-witnessed 1, placement 3
 */
import { basename, extname } from "path";
import { sequential } from "../../utils/sequential.js";
import { ANSI_RESET, ANSI_DIM, ANSI_NORMAL_INTENSITY } from "../../components/MarkdownTable.js";
import { ANSI_COLOR_INDEX } from "../../ink/colorize.js";
import { firstLineOf, repeatString } from "../../utils/stringUtils.js";
import { ensureHighlightLanguage } from "../../utils/cliHighlightLanguages.js";
import {
  MAX_SUBLANGUAGE_CHARS,
  rootHighlightLanguage,
  sublanguageOverflowCheck,
  MAX_SUBLANGUAGE_BYTES,
} from "../../utils/highlight/boundedHighlight.js";
import {
  getMaxCodeChars,
  truncateCode,
  truncatedCharsSuffix,
} from "../../components/HighlightedCode/truncateCode.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { logError } from "../../utils/log.js";
import { mergeCombiningGraphemes, getGraphemeSegmenter } from "../../utils/intl.js";
import { diffArrays } from "../../../vendor/diff/libesm/diff/array.js";
import { BIDI_CONTROL_RANGES, regExp } from "../../ink/render-border.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { regExp_2 } from "../../ink/layout/node.js";
import { getColorModuleUnavailableReason } from "../../components/StructuredDiff/colorDiff.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-cwwxybjc.js:1032-1076 fingerprint (2.1.88 match: rgb, 1)
/**
 * 真彩色 Color（a=255）。
 */
function rgb(r, g, b) {
  return {
    r,
    g,
    b,
    a: 255,
  };
}
//@ chunk-cwwxybjc.js:1076-1114 layout (2.1.88 match: rgb, 1)
/**
 * 调色板索引色（a=0，r 存索引）。
 */
function ansiIdx(index) {
  return {
    r: index,
    g: 0,
    b: 0,
    a: 0,
  };
}
//@ chunk-cwwxybjc.js:1114-1138 callgraph-fingerprint (2.1.88 match: DEFAULT_BG, 1)
/**
 * 终端默认色标记（a=1，输出 39/49）。
 */
var DEFAULT_BG = {
  r: 0,
  g: 0,
  b: 0,
  a: 1,
};
//@ chunk-cwwxybjc.js:1138-1229 fingerprint (2.1.88 match: detectColorMode, 0.919)
/**
 * 颜色模式：主题名含 ansi → ansi；chalk 级别≥3 → truecolor；否则 color256。
 */
function detectColorMode(theme) {
  if (theme.includes("ansi")) return "ansi";
  return sequential.level >= 3 ? "truecolor" : "color256";
}
//@ chunk-cwwxybjc.js:1229-1258 layout
var CUBE_LEVELS = [0, 95, 135, 175, 215, 255];
//@ chunk-cwwxybjc.js:1258-1597 file-local
/**
 * RGB 转 xterm-256 色号：在 6×6×6 色立方与 24 级灰阶中取欧氏距离更近者（与 syntect/ansi_colours 一致）。
 */
function ansi256FromRgb(r_2, g_2, b_2) {
  let cubeLevel = (channel) =>
    channel < 48 ? 0 : channel < 115 ? 1 : channel < 155 ? 2 : channel < 195 ? 3 : channel < 235 ? 4 : 5;
  let qr = cubeLevel(r_2);
  let qg = cubeLevel(g_2);
  let qb = cubeLevel(b_2);
  let cubeIdx = 16 + 36 * qr + 6 * qg + qb;
  let grey = Math.round((r_2 + g_2 + b_2) / 3);
  if (grey < 5) return 16;
  if (grey > 244 && qr === qg && qg === qb) return cubeIdx;
  let greyLevel = Math.max(0, Math.min(23, Math.round((grey - 8) / 10)));
  let greyIdx = 232 + greyLevel;
  let greyRgb = 8 + greyLevel * 10;
  let cubeR = CUBE_LEVELS[qr];
  let cubeG = CUBE_LEVELS[qg];
  let cb = CUBE_LEVELS[qb];
  let dCube = (r_2 - cubeR) ** 2 + (g_2 - cubeG) ** 2 + (b_2 - cb) ** 2;
  return (r_2 - greyRgb) ** 2 + (g_2 - greyRgb) ** 2 + (b_2 - greyRgb) ** 2 < dCube ? greyIdx : cubeIdx;
}
//@ chunk-cwwxybjc.js:1597-1904 fingerprint (2.1.88 match: colorToEscape, 1)
/**
 * Color 转 SGR 转义：索引色 0-7/8-15 用 30-37/90-97（背景 40/100），其余用 38;5；默认色 39/49；真彩色 38;2 或降级到 256 色。
 */
function colorToEscape(c_2, fg, mode) {
  if (c_2.a === 0) {
    let idx = c_2.r;
    if (idx < 8) return `\x1B[${(fg ? 30 : 40) + idx}m`;
    if (idx < 16) return `\x1B[${(fg ? 90 : 100) + (idx - 8)}m`;
    return `\x1B[${fg ? 38 : 48};5;${idx}m`;
  }
  if (c_2.a === 1) return fg ? "\x1B[39m" : "\x1B[49m";
  let codeType = fg ? 38 : 48;
  if (mode === "truecolor") return `\x1B[${codeType};2;${c_2.r};${c_2.g};${c_2.b}m`;
  return `\x1B[${codeType};5;${ansi256FromRgb(c_2.r, c_2.g, c_2.b)}m`;
}
//@ chunk-cwwxybjc.js:1904-2026 fingerprint (2.1.88 match: asTerminalEscaped, 1)
/**
 * 把 [样式, 文本] 块序列拼成带转义的一行（可只输出前景、整行变暗），以 RESET 开头结尾。
 */
function asTerminalEscaped(blocks, mode, skipBackground, dim) {
  let out = dim ? ANSI_RESET + ANSI_DIM : ANSI_RESET;
  for (let [style, text] of blocks) {
    out += colorToEscape(style.foreground, true, mode);
    if (!skipBackground) out += colorToEscape(style.background, false, mode);
    out += text;
  }
  return out + ANSI_RESET;
}
//@ chunk-cwwxybjc.js:2026-2138 fingerprint (2.1.88 match: defaultSyntaxThemeName, 1)
/**
 * 按界面主题选语法主题名：ansi → ansi；dark → Monokai Extended；其他 → GitHub。
 */
function defaultSyntaxThemeName(themeName) {
  if (themeName.includes("ansi")) return "ansi";
  if (themeName.includes("dark")) return "Monokai Extended";
  return "GitHub";
}
//@ chunk-cwwxybjc.js:2138-3828 fingerprint (2.1.88 match: STORAGE_KEYWORDS, 0.577)
/**
 * highlight.js 作用域到颜色的映射：Monokai Extended（深色）、GitHub（浅色）、ANSI 16 色；STORAGE_KEYWORDS（const/let/function/class/def/fn/struct 等）在 keyword 作用域里改用 _storage 颜色。
 */
var MONOKAI_SCOPES; // deferred: uses rgb of its import cycle while loading; runs once the cycle is complete
var GITHUB_SCOPES;
var STORAGE_KEYWORDS;
var ANSI_SCOPES;
deferInit("chunk-cwwxybjc.js:2138", () => {
  MONOKAI_SCOPES = new Map([
    ["keyword", rgb(249, 38, 114)],
    ["_storage", rgb(102, 217, 239)],
    ["built_in", rgb(166, 226, 46)],
    ["type", rgb(166, 226, 46)],
    ["literal", rgb(190, 132, 255)],
    ["number", rgb(190, 132, 255)],
    ["string", rgb(230, 219, 116)],
    ["title", rgb(166, 226, 46)],
    ["title.function", rgb(166, 226, 46)],
    ["title.class", rgb(166, 226, 46)],
    ["title.class.inherited", rgb(166, 226, 46)],
    ["params", rgb(253, 151, 31)],
    ["comment", rgb(117, 113, 94)],
    ["meta", rgb(117, 113, 94)],
    ["attr", rgb(166, 226, 46)],
    ["attribute", rgb(166, 226, 46)],
    ["variable", rgb(255, 255, 255)],
    ["variable.language", rgb(255, 255, 255)],
    ["property", rgb(255, 255, 255)],
    ["operator", rgb(249, 38, 114)],
    ["punctuation", rgb(248, 248, 242)],
    ["symbol", rgb(190, 132, 255)],
    ["regexp", rgb(230, 219, 116)],
    ["subst", rgb(248, 248, 242)],
  ]);
  GITHUB_SCOPES = new Map([
    ["keyword", rgb(167, 29, 93)],
    ["_storage", rgb(167, 29, 93)],
    ["built_in", rgb(0, 134, 179)],
    ["type", rgb(0, 134, 179)],
    ["literal", rgb(0, 134, 179)],
    ["number", rgb(0, 134, 179)],
    ["string", rgb(24, 54, 145)],
    ["title", rgb(121, 93, 163)],
    ["title.function", rgb(121, 93, 163)],
    ["title.class", rgb(0, 0, 0)],
    ["title.class.inherited", rgb(0, 0, 0)],
    ["params", rgb(0, 134, 179)],
    ["comment", rgb(150, 152, 150)],
    ["meta", rgb(150, 152, 150)],
    ["attr", rgb(0, 134, 179)],
    ["attribute", rgb(0, 134, 179)],
    ["variable", rgb(0, 134, 179)],
    ["variable.language", rgb(0, 134, 179)],
    ["property", rgb(0, 134, 179)],
    ["operator", rgb(167, 29, 93)],
    ["punctuation", rgb(51, 51, 51)],
    ["symbol", rgb(0, 134, 179)],
    ["regexp", rgb(24, 54, 145)],
    ["subst", rgb(51, 51, 51)],
  ]);
  STORAGE_KEYWORDS = new Set([
    "const",
    "let",
    "var",
    "function",
    "class",
    "type",
    "interface",
    "enum",
    "namespace",
    "module",
    "def",
    "fn",
    "func",
    "struct",
    "trait",
    "impl",
  ]);
  ANSI_SCOPES = new Map([
    ["keyword", ansiIdx(13)],
    ["_storage", ansiIdx(14)],
    ["built_in", ansiIdx(14)],
    ["type", ansiIdx(14)],
    ["literal", ansiIdx(12)],
    ["number", ansiIdx(12)],
    ["string", ansiIdx(10)],
    ["title", ansiIdx(11)],
    ["title.function", ansiIdx(11)],
    ["title.class", ansiIdx(11)],
    ["comment", ansiIdx(8)],
    ["meta", ansiIdx(8)],
  ]);
});
//@ chunk-cwwxybjc.js:3828-4884 fingerprint (2.1.88 match: buildTheme, 1)
/**
 * 按主题名与颜色模式组装 diff 主题：增删行背景、增删单词背景、增删标记色、前景、语法作用域表；有 dark/light × 普通/色盲友好（daltonized，新增行用蓝色）× ansi 几种组合；256 色下深色主题的增行背景改用调色板索引。
 */
function buildTheme(themeName, mode) {
  let isDark = themeName.includes("dark");
  let isAnsi = themeName.includes("ansi");
  let isDaltonized = themeName.includes("daltonized");
  let tc = mode === "truecolor";
  if (isAnsi)
    return {
      addLine: DEFAULT_BG,
      addWord: DEFAULT_BG,
      addDecoration: ansiIdx(10),
      deleteLine: DEFAULT_BG,
      deleteWord: DEFAULT_BG,
      deleteDecoration: ansiIdx(9),
      foreground: isDark ? ansiIdx(7) : ansiIdx(0),
      background: DEFAULT_BG,
      scopes: ANSI_SCOPES,
    };
  if (isDark) {
    let fg = rgb(248, 248, 242);
    let deleteLine = rgb(61, 1, 0);
    let deleteWord = rgb(92, 2, 0);
    let deleteDecoration = rgb(220, 90, 90);
    if (isDaltonized)
      return {
        addLine: tc ? rgb(0, 27, 41) : ansiIdx(17),
        addWord: tc ? rgb(0, 48, 71) : ansiIdx(24),
        addDecoration: rgb(81, 160, 200),
        deleteLine,
        deleteWord,
        deleteDecoration,
        foreground: fg,
        background: DEFAULT_BG,
        scopes: MONOKAI_SCOPES,
      };
    return {
      addLine: tc ? rgb(2, 40, 0) : ansiIdx(22),
      addWord: tc ? rgb(4, 71, 0) : ansiIdx(28),
      addDecoration: rgb(80, 200, 80),
      deleteLine,
      deleteWord,
      deleteDecoration,
      foreground: fg,
      background: DEFAULT_BG,
      scopes: MONOKAI_SCOPES,
    };
  }
  let fg = rgb(51, 51, 51);
  let deleteLine = rgb(255, 220, 220);
  let deleteWord = rgb(255, 199, 199);
  let deleteDecoration = rgb(207, 34, 46);
  if (isDaltonized)
    return {
      addLine: rgb(219, 237, 255),
      addWord: rgb(179, 217, 255),
      addDecoration: rgb(36, 87, 138),
      deleteLine,
      deleteWord,
      deleteDecoration,
      foreground: fg,
      background: DEFAULT_BG,
      scopes: GITHUB_SCOPES,
    };
  return {
    addLine: rgb(220, 255, 220),
    addWord: rgb(178, 255, 178),
    addDecoration: rgb(36, 138, 61),
    deleteLine,
    deleteWord,
    deleteDecoration,
    foreground: fg,
    background: DEFAULT_BG,
    scopes: GITHUB_SCOPES,
  };
}
//@ chunk-cwwxybjc.js:5146-5687 sole-consumer (2.1.88 match: toInkColor, 1)
function toInkColor(color) {
  if (color === undefined) return null;
  let match = /^rgb\(\s?(\d{1,3}),\s?(\d{1,3}),\s?(\d{1,3})\s?\)$/.exec(color);
  if (match) return rgb(Number(match[1]), Number(match[2]), Number(match[3]));
  let match_2 = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (match_2) {
    let rgbValue = parseInt(match_2[1], 16);
    return rgb(rgbValue >> 16, (rgbValue >> 8) & 255, rgbValue & 255);
  }
  let match_3 = /^#([0-9a-fA-F]{3})$/.exec(color);
  if (match_3) {
    let [hexR, hexG, hexB] = match_3[1];
    return rgb(parseInt(hexR + hexR, 16), parseInt(hexG + hexG, 16), parseInt(hexB + hexB, 16));
  }
  let match_4 = /^ansi256\(\s?(\d{1,3})\s?\)$/.exec(color);
  if (match_4) return ansiIdx(Number(match_4[1]));
  if (color.startsWith("ansi:")) {
    let index = ANSI_COLOR_INDEX.get(color.slice(5));
    return index === undefined ? null : ansiIdx(index);
  }
  return null;
}
//@ chunk-cwwxybjc.js:5687-5961 sole-consumer
function applyThemeDiffColors(theme, diffColors, dimmed) {
  let inkColor = toInkColor((dimmed ? diffColors.diffAddedDimmed : undefined) ?? diffColors.diffAdded);
  let inkColor_2 = toInkColor((dimmed ? diffColors.diffRemovedDimmed : undefined) ?? diffColors.diffRemoved);
  let inkColor_3 = toInkColor(diffColors.diffAddedWord);
  let inkColor_4 = toInkColor(diffColors.diffRemovedWord);
  return {
    ...theme,
    addLine: inkColor ?? theme.addLine,
    deleteLine: inkColor_2 ?? theme.deleteLine,
    addWord: inkColor_3 ?? theme.addWord,
    deleteWord: inkColor_4 ?? theme.deleteWord,
  };
}
//@ chunk-cwwxybjc.js:5961-6031 affinity (2.1.88 match: asTerminalEscaped, 1)
function defaultStyle(theme) {
  return {
    foreground: theme.foreground,
    background: theme.background,
  };
}
//@ chunk-cwwxybjc.js:6031-6139 fingerprint (2.1.88 match: lineBackground, 1)
function lineBackground(marker, theme) {
  switch (marker) {
    case "+":
      return theme.addLine;
    case "-":
      return theme.deleteLine;
    case " ":
      return theme.background;
  }
}
//@ chunk-cwwxybjc.js:6139-6248 fingerprint (2.1.88 match: wordBackground, 1)
function wordBackground(marker, theme) {
  switch (marker) {
    case "+":
      return theme.addWord;
    case "-":
      return theme.deleteWord;
    case " ":
      return theme.background;
  }
}
//@ chunk-cwwxybjc.js:6248-6368 fingerprint (2.1.88 match: decorationColor, 1)
function decorationColor(marker, theme) {
  switch (marker) {
    case "+":
      return theme.addDecoration;
    case "-":
      return theme.deleteDecoration;
    case " ":
      return theme.foreground;
  }
}
//@ chunk-cwwxybjc.js:6368-6499 fingerprint (2.1.88 match: FILENAME_LANGS, 0.588)
var FILENAME_LANGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cwwxybjc.js:6368", () => {
  FILENAME_LANGS = new Map([
    ["Dockerfile", "dockerfile"],
    ["Makefile", "makefile"],
    ["Rakefile", "ruby"],
    ["Gemfile", "ruby"],
    ["CMakeLists", "cmake"],
  ]);
});
//@ chunk-cwwxybjc.js:6499-7046 fingerprint (2.1.88 match: detectLanguage, 0.973)
/**
 * 识别文件语言：先按文件名（Dockerfile/Makefile 等），再按扩展名，再按首行 shebang（bash/python/node/ruby/perl）或 <?php、<?xml。
 */
function detectLanguage(filePath, firstLine) {
  let base = basename(filePath);
  let ext = extname(filePath).slice(1);
  let stem = firstLineOf(base, ".");
  let language = FILENAME_LANGS.get(base) ?? FILENAME_LANGS.get(stem);
  if (language) {
    let highlightLanguage = ensureHighlightLanguage(language);
    if (highlightLanguage) return highlightLanguage;
  }
  if (ext) {
    let lang = ensureHighlightLanguage(ext);
    if (lang) return lang;
  }
  if (firstLine) {
    let line = firstLine.startsWith("\uFEFF") ? firstLine.slice(1) : firstLine;
    if (line.startsWith("#!")) {
      if (line.includes("bash") || line.includes("/sh")) return ensureHighlightLanguage("bash");
      if (line.includes("python")) return ensureHighlightLanguage("python");
      if (line.includes("node")) return ensureHighlightLanguage("javascript");
      if (line.includes("ruby")) return ensureHighlightLanguage("ruby");
      if (line.includes("perl")) return ensureHighlightLanguage("perl");
    }
    if (line.startsWith("<?php")) return ensureHighlightLanguage("php");
    if (line.startsWith("<?xml")) return ensureHighlightLanguage("xml");
  }
  return null;
}
//@ chunk-cwwxybjc.js:7046-7234 fingerprint (2.1.88 match: scopeColor, 1)
/**
 * 作用域取色：keyword 中的声明类关键字用 _storage 色；找不到完整作用域时退回首段（如 title.function → title）；都没有用前景色。
 */
function scopeColor(scope, text, theme) {
  if (!scope) return theme.foreground;
  if (scope === "keyword" && STORAGE_KEYWORDS.has(text.trim()))
    return theme.scopes.get("_storage") ?? theme.foreground;
  return theme.scopes.get(scope) ?? theme.scopes.get(firstLineOf(scope, ".")) ?? theme.foreground;
}
//@ chunk-cwwxybjc.js:7234-7412 layout (2.1.88 match: asTerminalEscaped, 1)
/**
 * 递归展开 highlight.js 的 emitter 节点树，按继承的作用域给每段文本配色。
 */
function flattenHljsNode(node, theme, parentScope, out) {
  let scope = node.scope ?? node.kind ?? parentScope;
  for (let child of node.children)
    if (typeof child === "string") {
      let foreground = scopeColor(scope, child, theme);
      out.push([
        {
          foreground,
          background: theme.background,
        },
        child,
      ]);
    } else flattenHljsNode(child, theme, scope, out);
}
//@ chunk-cwwxybjc.js:7412-7554 fingerprint (2.1.88 match: hasRootNode, 1)
function hasRootNode(emitter) {
  return (
    typeof emitter === "object" &&
    emitter !== null &&
    "rootNode" in emitter &&
    typeof emitter.rootNode === "object" &&
    emitter.rootNode !== null &&
    "children" in emitter.rootNode
  );
}
//@ chunk-cwwxybjc.js:7554-8116 fingerprint (2.1.88 match: highlightLine, 0.706)
/**
 * 高亮一行代码：语言未知直接用默认样式；长行先换成受限语言（O2o）避免慢；累计复杂度超过阈值后不再高亮；highlight.js 抛错时关闭此文件的高亮；emitter 形状不符记一次错误。
 */
function highlightLine(state, line, theme) {
  let code =
    line +
    `
`;
  if (!state.lang) return [[defaultStyle(theme), code]];
  if (code.length > MAX_SUBLANGUAGE_CHARS)
    state.limited ??= rootHighlightLanguage(getMaxCodeChars(), state.lang);
  let overflowChars = sublanguageOverflowCheck(code, state.limited ?? state.lang);
  state.squares += overflowChars;
  if (overflowChars > 0 && state.squares > MAX_SUBLANGUAGE_BYTES) return [[defaultStyle(theme), code]];
  let result;
  try {
    result = getMaxCodeChars().highlight(code, {
      language: state.lang,
      ignoreIllegals: true,
    });
  } catch {
    state.lang = null;
    return [[defaultStyle(theme), code]];
  }
  if (!hasRootNode(result._emitter)) {
    if (claimOnce().claim("color_diff_hljs_emitter_shape_error"))
      logError(
        Error(
          `color-diff: hljs emitter shape mismatch (keys: ${Object.keys(result._emitter).join(",")}). Syntax highlighting disabled.`,
        ),
      );
    return [[defaultStyle(theme), code]];
  }
  let blocks = [];
  flattenHljsNode(result._emitter.rootNode, theme, undefined, blocks);
  return sanitizeBlocks(blocks);
}
//@ chunk-cwwxybjc.js:8116-8272 layout
function sanitizeBlocks(blocks) {
  let graphemes = blocks.map(([, text]) => text);
  let merged = mergeCombiningGraphemes(graphemes);
  if (merged === graphemes) return blocks;
  let result = [];
  for (let k = 0; k < blocks.length; k++) {
    let text = merged[k];
    if (text.length > 0) result.push([blocks[k][0], text]);
  }
  return result;
}
//@ chunk-cwwxybjc.js:8272-8283 layout
/**
 * 单词级 diff 改动占比超过 40% 时放弃单词高亮（整行变化太大）。
 */
var CHANGE_THRESHOLD = 0.4;
//@ chunk-cwwxybjc.js:8283-8624 callgraph-fingerprint (2.1.88 match: tokenize, 1)
/**
 * 单词级 diff 的分词：字母数字下划线连续段、空白连续段、其他按单个码点。
 */
function tokenize(text) {
  let tokens = [];
  let i = 0;
  while (i < text.length) {
    let ch = text[i];
    if (/[\p{L}\p{N}_]/u.test(ch)) {
      let j = i + 1;
      while (j < text.length && /[\p{L}\p{N}_]/u.test(text[j])) j++;
      tokens.push(text.slice(i, j));
      i = j;
    } else if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      tokens.push(text.slice(i, j));
      i = j;
    } else {
      let len = text.codePointAt(i) > 65535 ? 2 : 1;
      tokens.push(text.slice(i, i + len));
      i += len;
    }
  }
  return tokens;
}
//@ chunk-cwwxybjc.js:8624-8888 file-local
/**
 * 在行标记序列中找相邻的删除块与新增块，按顺序一一配对（用于单词级 diff）。
 */
function findAdjacentPairs(markers) {
  let pairs = [];
  let i = 0;
  while (i < markers.length)
    if (markers[i] === "-") {
      let delStart = i;
      let delEnd = i;
      while (delEnd < markers.length && markers[delEnd] === "-") delEnd++;
      let addEnd = delEnd;
      while (addEnd < markers.length && markers[addEnd] === "+") addEnd++;
      let delCount = delEnd - delStart;
      let addCount = addEnd - delEnd;
      if (delCount > 0 && addCount > 0) {
        let n = Math.min(delCount, addCount);
        for (let k = 0; k < n; k++) pairs.push([delStart + k, delEnd + k]);
        i = addEnd;
      } else i = delEnd;
    } else i++;
  return pairs;
}
//@ chunk-cwwxybjc.js:8888-9191 fingerprint (2.1.88 match: wordDiffStrings, 1)
/**
 * 两行之间的单词级 diff：返回旧行被删范围和新行新增范围；改动占比超过 40% 时返回空。
 */
function wordDiffStrings(oldStr, newStr) {
  let oldTokens = tokenize(oldStr);
  let newTokens = tokenize(newStr);
  let ops = diffArrays(oldTokens, newTokens);
  let totalLen = oldStr.length + newStr.length;
  let changedLen = 0;
  let oldRanges = [];
  let newRanges = [];
  let oldOff = 0;
  let newOff = 0;
  for (let op of ops) {
    let len = op.value.reduce((acc, t) => acc + t.length, 0);
    if (op.removed) {
      changedLen += len;
      oldRanges.push({
        start: oldOff,
        end: oldOff + len,
      });
      oldOff += len;
    } else if (op.added) {
      changedLen += len;
      newRanges.push({
        start: newOff,
        end: newOff + len,
      });
      newOff += len;
    } else {
      oldOff += len;
      newOff += len;
    }
  }
  if (totalLen > 0 && changedLen / totalLen > CHANGE_THRESHOLD) return [[], []];
  return [oldRanges, newRanges];
}
//@ chunk-cwwxybjc.js:9191-9305 callgraph-witnessed (2.1.88 match: removeNewlines, 1)
function splitBlocksOnNewlines(h) {
  h.lines = h.lines.map((line) =>
    line.flatMap(([style, text]) =>
      text
        .split(
          `
`,
        )
        .filter((line) => line.length > 0)
        .map((line) => [style, line]),
    ),
  );
}
//@ chunk-cwwxybjc.js:9305-9419 file-local
function isAmbiguousWidthChar(char) {
  if (char.length !== 1) return false;
  let firstCp = char.codePointAt(0);
  for (let [rangeStart, rangeEnd] of BIDI_CONTROL_RANGES)
    if (firstCp >= rangeStart && firstCp <= rangeEnd) return true;
  return false;
}
//@ chunk-cwwxybjc.js:9419-9443 layout
var PRINTABLE_ASCII = /^[\x20-\x7e]*$/;
//@ chunk-cwwxybjc.js:9443-9509 layout
function graphemeWidth(char) {
  if (char === "\t") return 8;
  if (isAmbiguousWidthChar(char)) return 1;
  return bunStringWidth(char);
}
//@ chunk-cwwxybjc.js:9509-9617 layout
function textWidth(text) {
  if (!regExp_2.test(text)) return bunStringWidth(text);
  let parts = text.split(regExp);
  let width = parts.length - 1;
  for (let part of parts) width += bunStringWidth(part);
  return width;
}
//@ chunk-cwwxybjc.js:9617-9664 layout
function blocksText(line) {
  return line.map(([, text]) => text).join("");
}
//@ chunk-cwwxybjc.js:9664-9675 layout
var WIDTH_CONTEXT_CHARS = 256;
//@ chunk-cwwxybjc.js:9675-9760 layout
function appendedWidth(prefix, text) {
  if (PRINTABLE_ASCII.test(text)) return text.length;
  let sliced = prefix.slice(-WIDTH_CONTEXT_CHARS);
  return textWidth(sliced + text) - textWidth(sliced);
}
//@ chunk-cwwxybjc.js:9760-9835 layout (2.1.88 match: asTerminalEscaped, 1)
function styleEscape(style, mode, skipBackground) {
  return (
    colorToEscape(style.foreground, true, mode) +
    (skipBackground ? "" : colorToEscape(style.background, false, mode))
  );
}
//@ chunk-cwwxybjc.js:9835-9987 layout
function mergeSameStyleBlocks(line, mode, skipBackground) {
  let merged = [];
  let lastEscape = null;
  for (let [style, text] of line) {
    let escapeSequence = styleEscape(style, mode, skipBackground);
    let last = merged.at(-1);
    if (last && escapeSequence === lastEscape) merged[merged.length - 1] = [last[0], last[1] + text];
    else {
      merged.push([style, text]);
      lastEscape = escapeSequence;
    }
  }
  return merged;
}
//@ chunk-cwwxybjc.js:9987-10217 layout
function expandTabs(blocks) {
  if (!blocks.some(([, text]) => text.includes("\t"))) return blocks;
  let lineText = "";
  let column = 0;
  let out = [];
  for (let [style, text] of blocks) {
    let parts = text.split("\t");
    let expandedLineText = "";
    for (let k = 0; k < parts.length; k++) {
      let part = k === 0 ? parts[k] : repeatString(" ", 8 - (column % 8)) + parts[k];
      column += appendedWidth(lineText, part);
      expandedLineText += part;
      lineText += part;
    }
    out.push([style, expandedLineText]);
  }
  return out;
}
//@ chunk-cwwxybjc.js:10217-11590 layout (2.1.88 match: addMarker, 0.806)
/**
 * 把一行的样式块按宽度折行（纯 ASCII 快速路径，其余按字素宽度）；超长时截断并加省略号；有增删标记时用行背景色补齐到整宽。
 */
function wrapLines(wrappedLine, effectiveWidth, theme, mode, skipBackground) {
  let out = [];
  for (let line of wrappedLine.lines) {
    let lineStartIndex = out.length;
    let currentBlocks = [];
    let currentText = "";
    let currentWidth = 0;
    for (let [style, text] of expandTabs(mergeSameStyleBlocks(line, mode, skipBackground))) {
      let nextWidth = currentWidth + appendedWidth(currentText, text);
      if (nextWidth <= effectiveWidth) {
        if (text.length > 0) {
          currentBlocks.push([style, text]);
          currentText += text;
          currentWidth = nextWidth;
        }
        continue;
      }
      if (effectiveWidth >= 1 && PRINTABLE_ASCII.test(text)) {
        let consumed = 0;
        let available = effectiveWidth - currentWidth;
        while (text.length - consumed > available) {
          if (available > 0) {
            currentBlocks.push([style, text.slice(consumed, consumed + available)]);
            consumed += available;
          }
          if (currentBlocks.length > 0) {
            out.push(currentBlocks);
            currentBlocks = [];
            currentText = "";
          }
          currentWidth = 0;
          available = effectiveWidth;
        }
        if (consumed < text.length) {
          currentBlocks.push([style, text.slice(consumed)]);
          currentText += text.slice(consumed);
          currentWidth += text.length - consumed;
        }
        continue;
      }
      let graphemeStart = 0;
      let pendingWidth = 0;
      for (let { segment, index } of getGraphemeSegmenter().segment(text)) {
        let graphemeWidth_ = graphemeWidth(segment);
        if (currentWidth + pendingWidth + graphemeWidth_ > effectiveWidth) {
          if (index > graphemeStart) currentBlocks.push([style, text.slice(graphemeStart, index)]);
          if (currentBlocks.length > 0) {
            out.push(currentBlocks);
            currentBlocks = [];
            currentText = "";
            currentWidth = 0;
          }
          graphemeStart = index;
          pendingWidth = 0;
          if (graphemeWidth_ > effectiveWidth) {
            out.push([[style, text.slice(index, index + segment.length)]]);
            graphemeStart = index + segment.length;
            continue;
          }
        }
        pendingWidth += graphemeWidth_;
      }
      if (graphemeStart < text.length) {
        currentBlocks.push([style, text.slice(graphemeStart)]);
        currentText += text.slice(graphemeStart);
        currentWidth = textWidth(currentText);
      }
    }
    if (currentBlocks.length > 0 || out.length === lineStartIndex) out.push(currentBlocks);
  }
  wrappedLine.lines = out;
  wrappedLine.lines = wrappedLine.lines.map((line) => {
    let lineText = blocksText(line);
    if (textWidth(lineText) <= effectiveWidth) return line;
    let max = Math.max(0, effectiveWidth - 1);
    let offsets = [[0, 0, 0]];
    let widthSoFar = 0;
    let blockOffset = 0;
    e: for (let idx = 0; idx < line.length; idx++) {
      let text = line[idx][1];
      for (let { segment, index } of getGraphemeSegmenter().segment(text)) {
        widthSoFar += graphemeWidth(segment);
        if (widthSoFar > max) break e;
        let segmentEnd = index + segment.length;
        offsets.push([idx, segmentEnd, blockOffset + segmentEnd]);
      }
      blockOffset += text.length;
    }
    let low = 0;
    let high = offsets.length - 1;
    while (low < high) {
      let mid = (low + high + 1) >> 1;
      if (textWidth(lineText.slice(0, offsets[mid][2])) <= max) low = mid;
      else high = mid - 1;
    }
    let [blockIndex, charOffset] = offsets[low];
    let sliced = line.slice(0, blockIndex);
    if (charOffset > 0) sliced.push([line[blockIndex][0], line[blockIndex][1].slice(0, charOffset)]);
    let ellipsisStyle = sliced.at(-1)?.[0] ?? line[0][0];
    sliced.push([ellipsisStyle, "\u2026"]);
    return sliced;
  });
  if (wrappedLine.marker && wrappedLine.marker !== " ") {
    let background = lineBackground(wrappedLine.marker, theme);
    let style = {
      foreground: theme.foreground,
      background,
    };
    for (let line of wrappedLine.lines) {
      let lineWidth = textWidth(blocksText(line));
      if (lineWidth < effectiveWidth) line.push([style, repeatString(" ", effectiveWidth - lineWidth)]);
    }
  }
}
//@ chunk-cwwxybjc.js:11590-11901 fingerprint (2.1.88 match: addLineNumber, 1)
/**
 * 在每个折行前加行号栏（首行显示行号，续行空白；上下文行变暗）。
 */
function addLineNumber(h, theme, maxDigits, fullDim) {
  let style = {
    foreground: h.marker ? decorationColor(h.marker, theme) : theme.foreground,
    background: h.marker ? lineBackground(h.marker, theme) : theme.background,
  };
  let shouldDim = h.marker === null || h.marker === " ";
  for (let i = 0; i < h.lines.length; i++) {
    let prefix = i === 0 ? ` ${String(h.lineNumber).padStart(maxDigits)} ` : " ".repeat(maxDigits + 2);
    let wrapped = shouldDim && !fullDim ? `${ANSI_DIM}${prefix}${ANSI_NORMAL_INTENSITY}` : prefix;
    h.lines[i].unshift([style, wrapped]);
  }
}
//@ chunk-cwwxybjc.js:11901-12041 fingerprint (2.1.88 match: addMarker, 1)
function addMarker(h, theme) {
  if (!h.marker) return;
  let style = {
    foreground: decorationColor(h.marker, theme),
    background: lineBackground(h.marker, theme),
  };
  for (let line of h.lines) line.unshift([style, h.marker]);
}
//@ chunk-cwwxybjc.js:12041-12146 callgraph-fingerprint (2.1.88 match: dimContent, 1)
/**
 * ansi 模式下删除行整行变暗。
 */
function dimContent(h) {
  for (let line of h.lines)
    if (line.length > 0) {
      line[0][1] = ANSI_DIM + line[0][1];
      let last = line.length - 1;
      line[last][1] = line[last][1] + ANSI_NORMAL_INTENSITY;
    }
}
//@ chunk-cwwxybjc.js:12146-12637 layout
function snapRangesToGraphemes(text, ranges) {
  if (ranges.length === 0) return ranges;
  let boundaries = [0];
  for (let grapheme of getGraphemeSegmenter().segment(text))
    boundaries.push(grapheme.index + grapheme.segment.length);
  let snapStart = (offset) => {
    let low = 0;
    let high = boundaries.length - 1;
    while (low < high) {
      let mid = (low + high + 1) >> 1;
      if (boundaries[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return boundaries[low];
  };
  let snapEnd = (offset) => {
    let low = 0;
    let high = boundaries.length - 1;
    while (low < high) {
      let mid = (low + high) >> 1;
      if (boundaries[mid] >= offset) high = mid;
      else low = mid + 1;
    }
    return boundaries[low];
  };
  let snapped = [];
  for (let range of ranges) {
    let start = snapStart(Math.min(range.start, text.length));
    let max = Math.max(start, snapEnd(Math.min(range.end, text.length)));
    let last = snapped.at(-1);
    if (last && start <= last.end) last.end = Math.max(last.end, max);
    else
      snapped.push({
        start,
        end: max,
      });
  }
  return snapped;
}
//@ chunk-cwwxybjc.js:12637-13280 fingerprint (2.1.88 match: applyBackground, 1)
/**
 * 给增删行着背景：单词级改动范围用单词背景，其余用行背景（按样式块切分）。
 */
function applyBackground(h_2, theme, ranges) {
  if (!h_2.marker) return;
  let lineBg = lineBackground(h_2.marker, theme);
  let wordBg = wordBackground(h_2.marker, theme);
  let text = h_2.lines.map((line) => line.map(([, text]) => text).join("")).join("");
  let ranges_2 = snapRangesToGraphemes(text, ranges);
  let rangeIdx = 0;
  let byteOff = 0;
  for (let idx = 0; idx < h_2.lines.length; idx++) {
    let newLine = [];
    for (let [style, text] of h_2.lines[idx]) {
      let textStart = byteOff;
      let textEnd = byteOff + text.length;
      while (rangeIdx < ranges_2.length && ranges_2[rangeIdx].end <= textStart) rangeIdx++;
      if (rangeIdx >= ranges_2.length) {
        newLine.push([
          {
            ...style,
            background: lineBg,
          },
          text,
        ]);
        byteOff = textEnd;
        continue;
      }
      let remaining = text;
      let pos = textStart;
      while (remaining.length > 0 && rangeIdx < ranges_2.length) {
        let range = ranges_2[rangeIdx];
        let inRange = pos >= range.start && pos < range.end;
        let next;
        if (inRange) next = Math.min(range.end, textEnd);
        else if (range.start > pos && range.start < textEnd) next = range.start;
        else next = textEnd;
        let segLen = next - pos;
        let seg = remaining.slice(0, segLen);
        newLine.push([
          {
            ...style,
            background: inRange ? wordBg : lineBg,
          },
          seg,
        ]);
        remaining = remaining.slice(segLen);
        pos = next;
        if (pos >= range.end) rangeIdx++;
      }
      if (remaining.length > 0)
        newLine.push([
          {
            ...style,
            background: lineBg,
          },
          remaining,
        ]);
      byteOff = textEnd;
    }
    h_2.lines[idx] = newLine;
  }
}
//@ chunk-cwwxybjc.js:13280-13396 layout (2.1.88 match: computeGutterWidth, 1)
function getMaxLineNumber(patch) {
  let maxLineNumber = Math.max(0, patch.oldStart + patch.oldLines - 1);
  let max = Math.max(0, patch.newStart + patch.newLines - 1);
  return Math.max(maxLineNumber, max);
}
//@ chunk-cwwxybjc.js:13396-13441 layout
function normalizeMarker(marker) {
  return marker === "+" || marker === "-" ? marker : " ";
}
//@ chunk-cwwxybjc.js:13441-13453 layout
var DIFF_GUTTER_BLOCKS = 2;
var FILE_GUTTER_BLOCKS = 1;
//@ chunk-cwwxybjc.js:13453-14737 fingerprint (2.1.88 match: ColorDiff, 0.801)
/**
 * 带语法高亮与单词级 diff 的 hunk 渲染器（2.1.88 中替代原生 Rust color-diff 的 TS 实现）：buildRows 依次求颜色模式、主题（可被用户 diff 颜色覆盖）、语言、行号，配对增删行做单词 diff，逐行高亮（删除行不高亮）、着背景、折行、加标记与行号；render 输出整行，renderSplit 输出行号栏与内容两列。
 */
class ColorDiff {
  hunk;
  filePath;
  firstLine;
  prefixContent;
  constructor(hunk, firstLine, filePath, prefixContent) {
    this.hunk = hunk;
    this.filePath = filePath;
    this.firstLine = firstLine;
    this.prefixContent = prefixContent ?? null;
  }
  render(themeName, width, dim, diffColors) {
    let { rows, mode } = this.buildRows(themeName, width, dim, diffColors);
    return rows.map((line) => asTerminalEscaped(line, mode, false, dim));
  }
  renderSplit(themeName, width, dim, diffColors) {
    let { rows, mode } = this.buildRows(themeName, width, dim, diffColors);
    return {
      gutters: rows.map((row) => asTerminalEscaped(row.slice(0, DIFF_GUTTER_BLOCKS), mode, false, dim)),
      contents: rows.map((row) => asTerminalEscaped(row.slice(DIFF_GUTTER_BLOCKS), mode, false, dim)),
    };
  }
  buildRows(themeName, width, dim, diffColors) {
    let mode = detectColorMode(themeName);
    let theme = buildTheme(themeName, mode);
    let theme_2 = diffColors ? applyThemeDiffColors(theme, diffColors, dim) : theme;
    let state = {
      lang: detectLanguage(this.filePath, this.firstLine),
      stack: null,
      squares: 0,
    };
    this.prefixContent;
    let maxDigits = String(getMaxLineNumber(this.hunk)).length;
    let oldLine = this.hunk.oldStart;
    let newLine = this.hunk.newStart;
    let effectiveWidth = Math.max(1, width - maxDigits - 2 - 1);
    let entries = this.hunk.lines.map((rawLine) => {
      let marker = normalizeMarker(rawLine.slice(0, 1));
      let { code, truncatedChars } = truncateCode(rawLine, 1);
      let lineNumber;
      switch (marker) {
        case "+":
          lineNumber = newLine++;
          break;
        case "-":
          lineNumber = oldLine++;
          break;
        case " ":
          lineNumber = newLine;
          oldLine++;
          newLine++;
          break;
      }
      return {
        lineNumber,
        marker,
        code,
        truncatedChars,
      };
    });
    let ranges = entries.map(() => []);
    if (!dim) {
      let markers = entries.map((e) => e.marker);
      for (let [delIdx, addIdx] of findAdjacentPairs(markers)) {
        let [delR, addR] = wordDiffStrings(entries[delIdx].code, entries[addIdx].code);
        ranges[delIdx] = delR;
        ranges[addIdx] = addR;
      }
    }
    let out = [];
    for (let i = 0; i < entries.length; i++) {
      let { lineNumber, marker, code, truncatedChars } = entries[i];
      let tokens = marker === "-" ? [[defaultStyle(theme_2), code]] : highlightLine(state, code, theme_2);
      let wrappedLine = {
        marker,
        lineNumber,
        lines: [tokens],
      };
      splitBlocksOnNewlines(wrappedLine);
      applyBackground(wrappedLine, theme_2, ranges[i]);
      if (truncatedChars > 0)
        wrappedLine.lines[0].push([defaultStyle(theme_2), truncatedCharsSuffix(truncatedChars)]);
      wrapLines(wrappedLine, effectiveWidth, theme_2, mode, false);
      if (mode === "ansi" && marker === "-") dimContent(wrappedLine);
      addMarker(wrappedLine, theme_2);
      addLineNumber(wrappedLine, theme_2, maxDigits, dim);
      out.push(...wrappedLine.lines);
    }
    return {
      rows: out,
      mode,
    };
  }
}
//@ chunk-cwwxybjc.js:14737-15473 fingerprint (2.1.88 match: ColorFile, 0.671)
/**
 * 整文件语法高亮渲染器（带行号，不做 diff）。
 */
class ColorFile {
  code;
  filePath;
  constructor(code, filePath) {
    this.code = code;
    this.filePath = filePath;
  }
  render(themeName, width, dim) {
    let { rows, mode } = this.buildRows(themeName, width, dim);
    return rows.map((line) => asTerminalEscaped(line, mode, true, dim));
  }
  renderSplit(themeName, width, dim) {
    let { rows, mode } = this.buildRows(themeName, width, dim);
    return {
      gutters: rows.map((row) => asTerminalEscaped(row.slice(0, FILE_GUTTER_BLOCKS), mode, true, dim)),
      contents: rows.map((row) => asTerminalEscaped(row.slice(FILE_GUTTER_BLOCKS), mode, true, dim)),
    };
  }
  buildRows(themeName, width, dim) {
    let mode = detectColorMode(themeName);
    let theme = buildTheme(themeName, mode);
    let lines = this.code.split(`
`);
    if (lines.at(-1) === "") lines.pop();
    let firstLine = lines[0] ?? null;
    let state = {
      lang: detectLanguage(this.filePath, firstLine),
      stack: null,
      squares: 0,
    };
    let maxDigits = String(lines.length).length;
    let effectiveWidth = Math.max(1, width - maxDigits - 2);
    let out = [];
    for (let i = 0; i < lines.length; i++) {
      let { code, truncatedChars } = truncateCode(lines[i]);
      let tokens = highlightLine(state, code, theme);
      if (truncatedChars > 0) tokens.push([defaultStyle(theme), truncatedCharsSuffix(truncatedChars)]);
      let wrappedLine = {
        marker: null,
        lineNumber: i + 1,
        lines: [tokens],
      };
      splitBlocksOnNewlines(wrappedLine);
      wrapLines(wrappedLine, effectiveWidth, theme, mode, true);
      addLineNumber(wrappedLine, theme, maxDigits, dim);
      out.push(...wrappedLine.lines);
    }
    return {
      rows: out,
      mode,
    };
  }
}
//@ chunk-cwwxybjc.js:15473-15520 callgraph-fingerprint (2.1.88 match: getSyntaxTheme, 0.397)
function getSyntaxTheme(themeName) {
  return {
    theme: defaultSyntaxThemeName(themeName),
    source: null,
  };
}
//@ chunk-cwwxybjc.js:15597-15639 placement
/**
 * 颜色差异能力不可用时返回 null，否则返回 ColorDiff。
 */
function getColorDiff() {
  return getColorModuleUnavailableReason() === null ? ColorDiff : null;
}
//@ chunk-cwwxybjc.js:15639-15681 placement
/**
 * 颜色模块不可用时返回 null，否则返回 ColorFile。
 */
function getColorFile() {
  return getColorModuleUnavailableReason() === null ? ColorFile : null;
}
//@ chunk-cwwxybjc.js:15681-15728 placement
/**
 * 颜色模块可用时返回指定语法主题，否则 null。
 */
function getColorSyntaxTheme(themeName) {
  return getColorModuleUnavailableReason() === null ? getSyntaxTheme(themeName) : null;
}
export { getColorDiff, getColorSyntaxTheme, getColorFile };
