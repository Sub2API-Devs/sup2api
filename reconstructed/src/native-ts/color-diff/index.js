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

//@ chunk-cwwxybjc.js:1032-1076 fingerprint = rgb (1)
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
//@ chunk-cwwxybjc.js:1076-1114 layout = rgb (1)
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
//@ chunk-cwwxybjc.js:1114-1138 callgraph-fingerprint = DEFAULT_BG (1)
/**
 * 终端默认色标记（a=1，输出 39/49）。
 */
var DEFAULT_BG = {
  r: 0,
  g: 0,
  b: 0,
  a: 1,
};
//@ chunk-cwwxybjc.js:1138-1229 fingerprint = detectColorMode (0.919)
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
  let c = (m) => (m < 48 ? 0 : m < 115 ? 1 : m < 155 ? 2 : m < 195 ? 3 : m < 235 ? 4 : 5);
  let qr = c(r_2);
  let qg = c(g_2);
  let qb = c(b_2);
  let cubeIdx = 16 + 36 * qr + 6 * qg + qb;
  let grey = Math.round((r_2 + g_2 + b_2) / 3);
  if (grey < 5) return 16;
  if (grey > 244 && qr === qg && qg === qb) return cubeIdx;
  let greyLevel = Math.max(0, Math.min(23, Math.round((grey - 8) / 10)));
  let greyIdx = 232 + greyLevel;
  let greyRgb = 8 + greyLevel * 10;
  let g = CUBE_LEVELS[qr];
  let y = CUBE_LEVELS[qg];
  let cb = CUBE_LEVELS[qb];
  let dCube = (r_2 - g) ** 2 + (g_2 - y) ** 2 + (b_2 - cb) ** 2;
  return (r_2 - greyRgb) ** 2 + (g_2 - greyRgb) ** 2 + (b_2 - greyRgb) ** 2 < dCube ? greyIdx : cubeIdx;
}
//@ chunk-cwwxybjc.js:1597-1904 fingerprint = colorToEscape (1)
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
//@ chunk-cwwxybjc.js:1904-2026 fingerprint = asTerminalEscaped (1)
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
//@ chunk-cwwxybjc.js:2026-2138 fingerprint = defaultSyntaxThemeName (1)
/**
 * 按界面主题选语法主题名：ansi → ansi；dark → Monokai Extended；其他 → GitHub。
 */
function defaultSyntaxThemeName(themeName) {
  if (themeName.includes("ansi")) return "ansi";
  if (themeName.includes("dark")) return "Monokai Extended";
  return "GitHub";
}
//@ chunk-cwwxybjc.js:2138-3828 fingerprint = STORAGE_KEYWORDS (0.577)
/**
 * highlight.js 作用域到颜色的映射：Monokai Extended（深色）、GitHub（浅色）、ANSI 16 色；STORAGE_KEYWORDS（const/let/function/class/def/fn/struct 等）在 keyword 作用域里改用 _storage 颜色。
 */
var MONOKAI_SCOPES = new Map([
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
var GITHUB_SCOPES = new Map([
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
var STORAGE_KEYWORDS = new Set([
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
var ANSI_SCOPES = new Map([
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
//@ chunk-cwwxybjc.js:3828-4884 fingerprint = buildTheme (1)
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
//@ chunk-cwwxybjc.js:5146-5687 sole-consumer = toInkColor (1)
function toInkColor(color) {
  if (color === undefined) return null;
  let match = /^rgb\(\s?(\d{1,3}),\s?(\d{1,3}),\s?(\d{1,3})\s?\)$/.exec(color);
  if (match) return rgb(Number(match[1]), Number(match[2]), Number(match[3]));
  let match_2 = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (match_2) {
    let s = parseInt(match_2[1], 16);
    return rgb(s >> 16, (s >> 8) & 255, s & 255);
  }
  let match_3 = /^#([0-9a-fA-F]{3})$/.exec(color);
  if (match_3) {
    let [s, o, f] = match_3[1];
    return rgb(parseInt(s + s, 16), parseInt(o + o, 16), parseInt(f + f, 16));
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
function applyThemeDiffColors(theme, n, t) {
  let inkColor = toInkColor((t ? n.diffAddedDimmed : undefined) ?? n.diffAdded);
  let inkColor_2 = toInkColor((t ? n.diffRemovedDimmed : undefined) ?? n.diffRemoved);
  let inkColor_3 = toInkColor(n.diffAddedWord);
  let inkColor_4 = toInkColor(n.diffRemovedWord);
  return {
    ...theme,
    addLine: inkColor ?? theme.addLine,
    deleteLine: inkColor_2 ?? theme.deleteLine,
    addWord: inkColor_3 ?? theme.addWord,
    deleteWord: inkColor_4 ?? theme.deleteWord,
  };
}
//@ chunk-cwwxybjc.js:5961-6031 affinity = asTerminalEscaped (1)
function defaultStyle(theme) {
  return {
    foreground: theme.foreground,
    background: theme.background,
  };
}
//@ chunk-cwwxybjc.js:6031-6139 fingerprint = lineBackground (1)
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
//@ chunk-cwwxybjc.js:6139-6248 fingerprint = wordBackground (1)
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
//@ chunk-cwwxybjc.js:6248-6368 fingerprint = decorationColor (1)
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
//@ chunk-cwwxybjc.js:6368-6499 fingerprint = FILENAME_LANGS (0.588)
var FILENAME_LANGS = new Map([
  ["Dockerfile", "dockerfile"],
  ["Makefile", "makefile"],
  ["Rakefile", "ruby"],
  ["Gemfile", "ruby"],
  ["CMakeLists", "cmake"],
]);
//@ chunk-cwwxybjc.js:6499-7046 fingerprint = detectLanguage (0.973)
/**
 * 识别文件语言：先按文件名（Dockerfile/Makefile 等），再按扩展名，再按首行 shebang（bash/python/node/ruby/perl）或 <?php、<?xml。
 */
function detectLanguage(filePath, firstLine) {
  let base = basename(filePath);
  let ext = extname(filePath).slice(1);
  let stem = firstLineOf(base, ".");
  let s = FILENAME_LANGS.get(base) ?? FILENAME_LANGS.get(stem);
  if (s) {
    let highlightLanguage = ensureHighlightLanguage(s);
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
//@ chunk-cwwxybjc.js:7046-7234 fingerprint = scopeColor (1)
/**
 * 作用域取色：keyword 中的声明类关键字用 _storage 色；找不到完整作用域时退回首段（如 title.function → title）；都没有用前景色。
 */
function scopeColor(scope, text, theme) {
  if (!scope) return theme.foreground;
  if (scope === "keyword" && STORAGE_KEYWORDS.has(text.trim()))
    return theme.scopes.get("_storage") ?? theme.foreground;
  return theme.scopes.get(scope) ?? theme.scopes.get(firstLineOf(scope, ".")) ?? theme.foreground;
}
//@ chunk-cwwxybjc.js:7234-7412 layout = asTerminalEscaped (1)
/**
 * 递归展开 highlight.js 的 emitter 节点树，按继承的作用域给每段文本配色。
 */
function flattenHljsNode(node, theme, parentScope, out) {
  let r = node.scope ?? node.kind ?? parentScope;
  for (let child of node.children)
    if (typeof child === "string") {
      let foreground = scopeColor(r, child, theme);
      out.push([
        {
          foreground,
          background: theme.background,
        },
        child,
      ]);
    } else flattenHljsNode(child, theme, r, out);
}
//@ chunk-cwwxybjc.js:7412-7554 fingerprint = hasRootNode (1)
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
//@ chunk-cwwxybjc.js:7554-8116 fingerprint = highlightLine (0.706)
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
  let r = sublanguageOverflowCheck(code, state.limited ?? state.lang);
  state.squares += r;
  if (r > 0 && state.squares > MAX_SUBLANGUAGE_BYTES) return [[defaultStyle(theme), code]];
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
  let mapped = blocks.map(([, r]) => r);
  let t = mergeCombiningGraphemes(mapped);
  if (t === mapped) return blocks;
  let c = [];
  for (let k = 0; k < blocks.length; k++) {
    let s = t[k];
    if (s.length > 0) c.push([blocks[k][0], s]);
  }
  return c;
}
//@ chunk-cwwxybjc.js:8272-8283 layout
/**
 * 单词级 diff 改动占比超过 40% 时放弃单词高亮（整行变化太大）。
 */
var CHANGE_THRESHOLD = 0.4;
//@ chunk-cwwxybjc.js:8283-8624 callgraph-fingerprint = tokenize (1)
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
//@ chunk-cwwxybjc.js:8888-9191 fingerprint = wordDiffStrings (1)
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
//@ chunk-cwwxybjc.js:9191-9305 callgraph-witnessed = removeNewlines (1)
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
function isAmbiguousWidthChar(e) {
  if (e.length !== 1) return false;
  let firstCp = e.codePointAt(0);
  for (let [t, c] of BIDI_CONTROL_RANGES) if (firstCp >= t && firstCp <= c) return true;
  return false;
}
//@ chunk-cwwxybjc.js:9419-9443 layout
var PRINTABLE_ASCII = /^[\x20-\x7e]*$/;
//@ chunk-cwwxybjc.js:9443-9509 layout
function graphemeWidth(segment) {
  if (segment === "\t") return 8;
  if (isAmbiguousWidthChar(segment)) return 1;
  return bunStringWidth(segment);
}
//@ chunk-cwwxybjc.js:9509-9617 layout
function textWidth(e) {
  if (!regExp_2.test(e)) return bunStringWidth(e);
  let parts = e.split(regExp);
  let t = parts.length - 1;
  for (let c of parts) t += bunStringWidth(c);
  return t;
}
//@ chunk-cwwxybjc.js:9617-9664 layout
function blocksText(line) {
  return line.map(([, n]) => n).join("");
}
//@ chunk-cwwxybjc.js:9664-9675 layout
var WIDTH_CONTEXT_CHARS = 256;
//@ chunk-cwwxybjc.js:9675-9760 layout
function appendedWidth(e, n) {
  if (PRINTABLE_ASCII.test(n)) return n.length;
  let sliced = e.slice(-WIDTH_CONTEXT_CHARS);
  return textWidth(sliced + n) - textWidth(sliced);
}
//@ chunk-cwwxybjc.js:9760-9835 layout = asTerminalEscaped (1)
function styleEscape(e, mode, skipBackground) {
  return (
    colorToEscape(e.foreground, true, mode) + (skipBackground ? "" : colorToEscape(e.background, false, mode))
  );
}
//@ chunk-cwwxybjc.js:9835-9987 layout
function mergeSameStyleBlocks(line, mode, skipBackground) {
  let c = [];
  let r = null;
  for (let [s, o] of line) {
    let f = styleEscape(s, mode, skipBackground);
    let last = c.at(-1);
    if (last && f === r) c[c.length - 1] = [last[0], last[1] + o];
    else {
      c.push([s, o]);
      r = f;
    }
  }
  return c;
}
//@ chunk-cwwxybjc.js:9987-10217 layout
function expandTabs(e) {
  if (!e.some(([, r]) => r.includes("\t"))) return e;
  let n = "";
  let t = 0;
  let c = [];
  for (let [r, s] of e) {
    let parts = s.split("\t");
    let f = "";
    for (let k = 0; k < parts.length; k++) {
      let d = k === 0 ? parts[k] : repeatString(" ", 8 - (t % 8)) + parts[k];
      t += appendedWidth(n, d);
      f += d;
      n += d;
    }
    c.push([r, f]);
  }
  return c;
}
//@ chunk-cwwxybjc.js:10217-11590 layout = addMarker (0.806)
/**
 * 把一行的样式块按宽度折行（纯 ASCII 快速路径，其余按字素宽度）；超长时截断并加省略号；有增删标记时用行背景色补齐到整宽。
 */
function wrapLines(e, effectiveWidth, theme, c, r) {
  let s = [];
  for (let line of e.lines) {
    let f = s.length;
    let a = [];
    let d = "";
    let h = 0;
    for (let [b, g] of expandTabs(mergeSameStyleBlocks(line, c, r))) {
      let y = h + appendedWidth(d, g);
      if (y <= effectiveWidth) {
        if (g.length > 0) {
          a.push([b, g]);
          d += g;
          h = y;
        }
        continue;
      }
      if (effectiveWidth >= 1 && PRINTABLE_ASCII.test(g)) {
        let p = 0;
        let m = effectiveWidth - h;
        while (g.length - p > m) {
          if (m > 0) {
            a.push([b, g.slice(p, p + m)]);
            p += m;
          }
          if (a.length > 0) {
            s.push(a);
            a = [];
            d = "";
          }
          h = 0;
          m = effectiveWidth;
        }
        if (p < g.length) {
          a.push([b, g.slice(p)]);
          d += g.slice(p);
          h += g.length - p;
        }
        continue;
      }
      let k = 0;
      let S = 0;
      for (let { segment, index } of getGraphemeSegmenter().segment(g)) {
        let C = graphemeWidth(segment);
        if (h + S + C > effectiveWidth) {
          if (index > k) a.push([b, g.slice(k, index)]);
          if (a.length > 0) {
            s.push(a);
            a = [];
            d = "";
            h = 0;
          }
          k = index;
          S = 0;
          if (C > effectiveWidth) {
            s.push([[b, g.slice(index, index + segment.length)]]);
            k = index + segment.length;
            continue;
          }
        }
        S += C;
      }
      if (k < g.length) {
        a.push([b, g.slice(k)]);
        d += g.slice(k);
        h = textWidth(d);
      }
    }
    if (a.length > 0 || s.length === f) s.push(a);
  }
  e.lines = s;
  e.lines = e.lines.map((line) => {
    let f = blocksText(line);
    if (textWidth(f) <= effectiveWidth) return line;
    let max = Math.max(0, effectiveWidth - 1);
    let d = [[0, 0, 0]];
    let h = 0;
    let b = 0;
    e: for (let idx = 0; idx < line.length; idx++) {
      let T = line[idx][1];
      for (let { segment, index } of getGraphemeSegmenter().segment(T)) {
        h += graphemeWidth(segment);
        if (h > max) break e;
        let w = index + segment.length;
        d.push([idx, w, b + w]);
      }
      b += T.length;
    }
    let g = 0;
    let y = d.length - 1;
    while (g < y) {
      let C = (g + y + 1) >> 1;
      if (textWidth(f.slice(0, d[C][2])) <= max) g = C;
      else y = C - 1;
    }
    let [k, S] = d[g];
    let sliced = line.slice(0, k);
    if (S > 0) sliced.push([line[k][0], line[k][1].slice(0, S)]);
    let m = sliced.at(-1)?.[0] ?? line[0][0];
    sliced.push([m, "\u2026"]);
    return sliced;
  });
  if (e.marker && e.marker !== " ") {
    let background = lineBackground(e.marker, theme);
    let style = {
      foreground: theme.foreground,
      background,
    };
    for (let line of e.lines) {
      let d = textWidth(blocksText(line));
      if (d < effectiveWidth) line.push([style, repeatString(" ", effectiveWidth - d)]);
    }
  }
}
//@ chunk-cwwxybjc.js:11590-11901 fingerprint = addLineNumber (1)
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
//@ chunk-cwwxybjc.js:11901-12041 fingerprint = addMarker (1)
function addMarker(h, theme) {
  if (!h.marker) return;
  let style = {
    foreground: decorationColor(h.marker, theme),
    background: lineBackground(h.marker, theme),
  };
  for (let line of h.lines) line.unshift([style, h.marker]);
}
//@ chunk-cwwxybjc.js:12041-12146 callgraph-fingerprint = dimContent (1)
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
function snapRangesToGraphemes(e, ranges) {
  if (ranges.length === 0) return ranges;
  let t = [0];
  for (let o of getGraphemeSegmenter().segment(e)) t.push(o.index + o.segment.length);
  let c = (o) => {
    let f = 0;
    let a = t.length - 1;
    while (f < a) {
      let d = (f + a + 1) >> 1;
      if (t[d] <= o) f = d;
      else a = d - 1;
    }
    return t[f];
  };
  let r = (o) => {
    let f = 0;
    let a = t.length - 1;
    while (f < a) {
      let d = (f + a) >> 1;
      if (t[d] >= o) a = d;
      else f = d + 1;
    }
    return t[f];
  };
  let s = [];
  for (let o of ranges) {
    let f = c(Math.min(o.start, e.length));
    let max = Math.max(f, r(Math.min(o.end, e.length)));
    let last = s.at(-1);
    if (last && f <= last.end) last.end = Math.max(last.end, max);
    else
      s.push({
        start: f,
        end: max,
      });
  }
  return s;
}
//@ chunk-cwwxybjc.js:12637-13280 fingerprint = applyBackground (1)
/**
 * 给增删行着背景：单词级改动范围用单词背景，其余用行背景（按样式块切分）。
 */
function applyBackground(h_2, theme, ranges) {
  if (!h_2.marker) return;
  let lineBg = lineBackground(h_2.marker, theme);
  let wordBg = wordBackground(h_2.marker, theme);
  let joined = h_2.lines.map((line) => line.map(([, h]) => h).join("")).join("");
  let ranges_2 = snapRangesToGraphemes(joined, ranges);
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
        let m = ranges_2[rangeIdx];
        let inRange = pos >= m.start && pos < m.end;
        let next;
        if (inRange) next = Math.min(m.end, textEnd);
        else if (m.start > pos && m.start < textEnd) next = m.start;
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
        if (pos >= m.end) rangeIdx++;
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
//@ chunk-cwwxybjc.js:13280-13396 layout = computeGutterWidth (1)
function getMaxLineNumber(patch) {
  let maxLineNumber = Math.max(0, patch.oldStart + patch.oldLines - 1);
  let max = Math.max(0, patch.newStart + patch.newLines - 1);
  return Math.max(maxLineNumber, max);
}
//@ chunk-cwwxybjc.js:13396-13441 layout
function normalizeMarker(e) {
  return e === "+" || e === "-" ? e : " ";
}
//@ chunk-cwwxybjc.js:13441-13453 layout
var DIFF_GUTTER_BLOCKS = 2;
var FILE_GUTTER_BLOCKS = 1;
//@ chunk-cwwxybjc.js:13453-14737 fingerprint = ColorDiff (0.801)
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
  render(e, n, t, c) {
    let { rows, mode } = this.buildRows(e, n, t, c);
    return rows.map((line) => asTerminalEscaped(line, mode, false, t));
  }
  renderSplit(e, n, t, c) {
    let { rows, mode } = this.buildRows(e, n, t, c);
    return {
      gutters: rows.map((o) => asTerminalEscaped(o.slice(0, DIFF_GUTTER_BLOCKS), mode, false, t)),
      contents: rows.map((o) => asTerminalEscaped(o.slice(DIFF_GUTTER_BLOCKS), mode, false, t)),
    };
  }
  buildRows(themeName, width, dim, c) {
    let mode = detectColorMode(themeName);
    let theme = buildTheme(themeName, mode);
    let theme_2 = c ? applyThemeDiffColors(theme, c, dim) : theme;
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
      let w = {
        marker,
        lineNumber,
        lines: [tokens],
      };
      splitBlocksOnNewlines(w);
      applyBackground(w, theme_2, ranges[i]);
      if (truncatedChars > 0) w.lines[0].push([defaultStyle(theme_2), truncatedCharsSuffix(truncatedChars)]);
      wrapLines(w, effectiveWidth, theme_2, mode, false);
      if (mode === "ansi" && marker === "-") dimContent(w);
      addMarker(w, theme_2);
      addLineNumber(w, theme_2, maxDigits, dim);
      out.push(...w.lines);
    }
    return {
      rows: out,
      mode,
    };
  }
}
//@ chunk-cwwxybjc.js:14737-15473 fingerprint = ColorFile (0.671)
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
  render(e, n, t) {
    let { rows, mode } = this.buildRows(e, n, t);
    return rows.map((line) => asTerminalEscaped(line, mode, true, t));
  }
  renderSplit(e, n, t) {
    let { rows, mode } = this.buildRows(e, n, t);
    return {
      gutters: rows.map((s) => asTerminalEscaped(s.slice(0, FILE_GUTTER_BLOCKS), mode, true, t)),
      contents: rows.map((s) => asTerminalEscaped(s.slice(FILE_GUTTER_BLOCKS), mode, true, t)),
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
      let S = highlightLine(state, code, theme);
      if (truncatedChars > 0) S.push([defaultStyle(theme), truncatedCharsSuffix(truncatedChars)]);
      let p = {
        marker: null,
        lineNumber: i + 1,
        lines: [S],
      };
      splitBlocksOnNewlines(p);
      wrapLines(p, effectiveWidth, theme, mode, true);
      addLineNumber(p, theme, maxDigits, dim);
      out.push(...p.lines);
    }
    return {
      rows: out,
      mode,
    };
  }
}
//@ chunk-cwwxybjc.js:15473-15520 callgraph-fingerprint = getSyntaxTheme (0.397)
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
