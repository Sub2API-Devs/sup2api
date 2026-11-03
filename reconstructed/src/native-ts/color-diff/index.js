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
import { v, A, J } from "../../components/MarkdownTable.js";
import { ANSI_COLOR_INDEX } from "../../ink/colorize.js";
import { firstLineOf, repeatString } from "../../utils/stringUtils.js";
import { Sce } from "../../utils/cliHighlightLanguages.js";
import { Mhn, rootHighlightLanguage, P2o, L7n } from "../../utils/highlight/boundedHighlight.js";
import { j, truncateCode, bJe } from "../../components/HighlightedCode/truncateCode.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { logError } from "../../utils/log.js";
import { mergeCombiningGraphemes, getGraphemeSegmenter } from "../../utils/intl.js";
import { diffArrays } from "../../../vendor/diff/libesm/diff/array.js";
import { BIDI_CONTROL_RANGES, regExp } from "../../ink/render-border.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { regExp_2 } from "../../ink/layout/node.js";
import { getColorModuleUnavailableReason } from "../../components/StructuredDiff/colorDiff.js";

/**
 * 真彩色 Color（a=255）。
 */
//@ chunk-cwwxybjc.js:1032-1076 fingerprint = rgb (1)
function rgb(r, g, b) {
  return { r: r, g: g, b: b, a: 255 };
}
/**
 * 调色板索引色（a=0，r 存索引）。
 */
//@ chunk-cwwxybjc.js:1076-1114 layout = rgb (1)
function ansiIdx(e) {
  return { r: e, g: 0, b: 0, a: 0 };
}
/**
 * 终端默认色标记（a=1，输出 39/49）。
 */
//@ chunk-cwwxybjc.js:1114-1138 callgraph-fingerprint = DEFAULT_BG (1)
var DEFAULT_BG = { r: 0, g: 0, b: 0, a: 1 };
/**
 * 颜色模式：主题名含 ansi → ansi；chalk 级别≥3 → truecolor；否则 color256。
 */
//@ chunk-cwwxybjc.js:1138-1229 fingerprint = detectColorMode (0.919)
function detectColorMode(theme) {
  if (theme.includes("ansi")) return "ansi";
  return sequential.level >= 3 ? "truecolor" : "color256";
}
//@ chunk-cwwxybjc.js:1229-1258 layout
var CUBE_LEVELS = [0, 95, 135, 175, 215, 255];
/**
 * RGB 转 xterm-256 色号：在 6×6×6 色立方与 24 级灰阶中取欧氏距离更近者（与 syntect/ansi_colours 一致）。
 */
//@ chunk-cwwxybjc.js:1258-1597 file-local
function ansi256FromRgb(r_2, g_2, b_2) {
  let c = (m) => (m < 48 ? 0 : m < 115 ? 1 : m < 155 ? 2 : m < 195 ? 3 : m < 235 ? 4 : 5),
    qr = c(r_2),
    qg = c(g_2),
    qb = c(b_2),
    f = 16 + 36 * qr + 6 * qg + qb,
    grey = Math.round((r_2 + g_2 + b_2) / 3);
  if (grey < 5) return 16;
  if (grey > 244 && qr === qg && qg === qb) return f;
  let greyLevel = Math.max(0, Math.min(23, Math.round((grey - 8) / 10))),
    h = 232 + greyLevel,
    b = 8 + greyLevel * 10,
    g = CUBE_LEVELS[qr],
    y = CUBE_LEVELS[qg],
    k = CUBE_LEVELS[qb],
    S = (r_2 - g) ** 2 + (g_2 - y) ** 2 + (b_2 - k) ** 2;
  return (r_2 - b) ** 2 + (g_2 - b) ** 2 + (b_2 - b) ** 2 < S ? h : f;
}
/**
 * Color 转 SGR 转义：索引色 0-7/8-15 用 30-37/90-97（背景 40/100），其余用 38;5；默认色 39/49；真彩色 38;2 或降级到 256 色。
 */
//@ chunk-cwwxybjc.js:1597-1904 fingerprint = colorToEscape (1)
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
/**
 * 把 [样式, 文本] 块序列拼成带转义的一行（可只输出前景、整行变暗），以 RESET 开头结尾。
 */
//@ chunk-cwwxybjc.js:1904-2026 fingerprint = asTerminalEscaped (1)
function asTerminalEscaped(blocks, mode, skipBackground, dim) {
  let out = dim ? v + A : v;
  for (let [s, o] of blocks) {
    if (((out += colorToEscape(s.foreground, !0, mode)), !skipBackground))
      out += colorToEscape(s.background, !1, mode);
    out += o;
  }
  return out + v;
}
/**
 * 按界面主题选语法主题名：ansi → ansi；dark → Monokai Extended；其他 → GitHub。
 */
//@ chunk-cwwxybjc.js:2026-2138 fingerprint = defaultSyntaxThemeName (1)
function defaultSyntaxThemeName(themeName) {
  if (themeName.includes("ansi")) return "ansi";
  if (themeName.includes("dark")) return "Monokai Extended";
  return "GitHub";
}
/**
 * highlight.js 作用域到颜色的映射：Monokai Extended（深色）、GitHub（浅色）、ANSI 16 色；STORAGE_KEYWORDS（const/let/function/class/def/fn/struct 等）在 keyword 作用域里改用 _storage 颜色。
 */
//@ chunk-cwwxybjc.js:2138-3828 fingerprint = STORAGE_KEYWORDS (0.577)
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
  ]),
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
  ]),
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
  ]),
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
/**
 * 按主题名与颜色模式组装 diff 主题：增删行背景、增删单词背景、增删标记色、前景、语法作用域表；有 dark/light × 普通/色盲友好（daltonized，新增行用蓝色）× ansi 几种组合；256 色下深色主题的增行背景改用调色板索引。
 */
//@ chunk-cwwxybjc.js:3828-4884 fingerprint = buildTheme (1)
function buildTheme(themeName, mode) {
  let isDark = themeName.includes("dark"),
    isAnsi = themeName.includes("ansi"),
    isDaltonized = themeName.includes("daltonized"),
    tc = mode === "truecolor";
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
    let fg = rgb(248, 248, 242),
      deleteLine = rgb(61, 1, 0),
      deleteWord = rgb(92, 2, 0),
      deleteDecoration = rgb(220, 90, 90);
    if (isDaltonized)
      return {
        addLine: tc ? rgb(0, 27, 41) : ansiIdx(17),
        addWord: tc ? rgb(0, 48, 71) : ansiIdx(24),
        addDecoration: rgb(81, 160, 200),
        deleteLine: deleteLine,
        deleteWord: deleteWord,
        deleteDecoration: deleteDecoration,
        foreground: fg,
        background: DEFAULT_BG,
        scopes: MONOKAI_SCOPES,
      };
    return {
      addLine: tc ? rgb(2, 40, 0) : ansiIdx(22),
      addWord: tc ? rgb(4, 71, 0) : ansiIdx(28),
      addDecoration: rgb(80, 200, 80),
      deleteLine: deleteLine,
      deleteWord: deleteWord,
      deleteDecoration: deleteDecoration,
      foreground: fg,
      background: DEFAULT_BG,
      scopes: MONOKAI_SCOPES,
    };
  }
  let fg = rgb(51, 51, 51),
    deleteLine = rgb(255, 220, 220),
    deleteWord = rgb(255, 199, 199),
    deleteDecoration = rgb(207, 34, 46);
  if (isDaltonized)
    return {
      addLine: rgb(219, 237, 255),
      addWord: rgb(179, 217, 255),
      addDecoration: rgb(36, 87, 138),
      deleteLine: deleteLine,
      deleteWord: deleteWord,
      deleteDecoration: deleteDecoration,
      foreground: fg,
      background: DEFAULT_BG,
      scopes: GITHUB_SCOPES,
    };
  return {
    addLine: rgb(220, 255, 220),
    addWord: rgb(178, 255, 178),
    addDecoration: rgb(36, 138, 61),
    deleteLine: deleteLine,
    deleteWord: deleteWord,
    deleteDecoration: deleteDecoration,
    foreground: fg,
    background: DEFAULT_BG,
    scopes: GITHUB_SCOPES,
  };
}
//@ chunk-cwwxybjc.js:5146-5687 sole-consumer = toInkColor (1)
function toInkColor(color) {
  if (color === void 0) return null;
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
    let s = ANSI_COLOR_INDEX.get(color.slice(5));
    return s === void 0 ? null : ansiIdx(s);
  }
  return null;
}
//@ chunk-cwwxybjc.js:5687-5961 sole-consumer
function applyThemeDiffColors(e, n, t) {
  let c = toInkColor((t ? n.diffAddedDimmed : void 0) ?? n.diffAdded),
    r = toInkColor((t ? n.diffRemovedDimmed : void 0) ?? n.diffRemoved),
    s = toInkColor(n.diffAddedWord),
    o = toInkColor(n.diffRemovedWord);
  return {
    ...e,
    addLine: c ?? e.addLine,
    deleteLine: r ?? e.deleteLine,
    addWord: s ?? e.addWord,
    deleteWord: o ?? e.deleteWord,
  };
}
//@ chunk-cwwxybjc.js:5961-6031 affinity = asTerminalEscaped (1)
function defaultStyle(e) {
  return { foreground: e.foreground, background: e.background };
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
/**
 * 识别文件语言：先按文件名（Dockerfile/Makefile 等），再按扩展名，再按首行 shebang（bash/python/node/ruby/perl）或 <?php、<?xml。
 */
//@ chunk-cwwxybjc.js:6499-7046 fingerprint = detectLanguage (0.973)
function detectLanguage(filePath, firstLine) {
  let base = basename(filePath),
    ext = extname(filePath).slice(1),
    r = firstLineOf(base, "."),
    s = FILENAME_LANGS.get(base) ?? FILENAME_LANGS.get(r);
  if (s) {
    let o = Sce(s);
    if (o) return o;
  }
  if (ext) {
    let o = Sce(ext);
    if (o) return o;
  }
  if (firstLine) {
    let line = firstLine.startsWith("\uFEFF") ? firstLine.slice(1) : firstLine;
    if (line.startsWith("#!")) {
      if (line.includes("bash") || line.includes("/sh")) return Sce("bash");
      if (line.includes("python")) return Sce("python");
      if (line.includes("node")) return Sce("javascript");
      if (line.includes("ruby")) return Sce("ruby");
      if (line.includes("perl")) return Sce("perl");
    }
    if (line.startsWith("<?php")) return Sce("php");
    if (line.startsWith("<?xml")) return Sce("xml");
  }
  return null;
}
/**
 * 作用域取色：keyword 中的声明类关键字用 _storage 色；找不到完整作用域时退回首段（如 title.function → title）；都没有用前景色。
 */
//@ chunk-cwwxybjc.js:7046-7234 fingerprint = scopeColor (1)
function scopeColor(scope, text, theme) {
  if (!scope) return theme.foreground;
  if (scope === "keyword" && STORAGE_KEYWORDS.has(text.trim()))
    return theme.scopes.get("_storage") ?? theme.foreground;
  return theme.scopes.get(scope) ?? theme.scopes.get(firstLineOf(scope, ".")) ?? theme.foreground;
}
/**
 * 递归展开 highlight.js 的 emitter 节点树，按继承的作用域给每段文本配色。
 */
//@ chunk-cwwxybjc.js:7234-7412 layout = asTerminalEscaped (1)
function flattenHljsNode(node, theme, parentScope, out) {
  let r = node.scope ?? node.kind ?? parentScope;
  for (let s of node.children)
    if (typeof s === "string") {
      let o = scopeColor(r, s, theme);
      out.push([{ foreground: o, background: theme.background }, s]);
    } else flattenHljsNode(s, theme, r, out);
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
/**
 * 高亮一行代码：语言未知直接用默认样式；长行先换成受限语言（O2o）避免慢；累计复杂度超过阈值后不再高亮；highlight.js 抛错时关闭此文件的高亮；emitter 形状不符记一次错误。
 */
//@ chunk-cwwxybjc.js:7554-8116 fingerprint = highlightLine (0.706)
function highlightLine(state, line, theme) {
  let code =
    line +
    `
`;
  if (!state.lang) return [[defaultStyle(theme), code]];
  if (code.length > Mhn) state.limited ??= rootHighlightLanguage(j(), state.lang);
  let r = P2o(code, state.limited ?? state.lang);
  if (((state.squares += r), r > 0 && state.squares > L7n)) return [[defaultStyle(theme), code]];
  let result;
  try {
    result = j().highlight(code, { language: state.lang, ignoreIllegals: !0 });
  } catch {
    return ((state.lang = null), [[defaultStyle(theme), code]]);
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
  return (flattenHljsNode(result._emitter.rootNode, theme, void 0, blocks), sanitizeBlocks(blocks));
}
//@ chunk-cwwxybjc.js:8116-8272 layout
function sanitizeBlocks(e) {
  let mapped = e.map(([, r]) => r),
    t = mergeCombiningGraphemes(mapped);
  if (t === mapped) return e;
  let c = [];
  for (let r = 0; r < e.length; r++) {
    let s = t[r];
    if (s.length > 0) c.push([e[r][0], s]);
  }
  return c;
}
/**
 * 单词级 diff 改动占比超过 40% 时放弃单词高亮（整行变化太大）。
 */
//@ chunk-cwwxybjc.js:8272-8283 layout
var CHANGE_THRESHOLD = 0.4;
/**
 * 单词级 diff 的分词：字母数字下划线连续段、空白连续段、其他按单个码点。
 */
//@ chunk-cwwxybjc.js:8283-8624 callgraph-fingerprint = tokenize (1)
function tokenize(text) {
  let tokens = [],
    t = 0;
  while (t < text.length) {
    let ch = text[t];
    if (/[\p{L}\p{N}_]/u.test(ch)) {
      let r = t + 1;
      while (r < text.length && /[\p{L}\p{N}_]/u.test(text[r])) r++;
      (tokens.push(text.slice(t, r)), (t = r));
    } else if (/\s/.test(ch)) {
      let r = t + 1;
      while (r < text.length && /\s/.test(text[r])) r++;
      (tokens.push(text.slice(t, r)), (t = r));
    } else {
      let len = text.codePointAt(t) > 65535 ? 2 : 1;
      (tokens.push(text.slice(t, t + len)), (t += len));
    }
  }
  return tokens;
}
/**
 * 在行标记序列中找相邻的删除块与新增块，按顺序一一配对（用于单词级 diff）。
 */
//@ chunk-cwwxybjc.js:8624-8888 file-local
function findAdjacentPairs(markers) {
  let pairs = [],
    t = 0;
  while (t < markers.length)
    if (markers[t] === "-") {
      let c = t,
        r = t;
      while (r < markers.length && markers[r] === "-") r++;
      let s = r;
      while (s < markers.length && markers[s] === "+") s++;
      let o = r - c,
        f = s - r;
      if (o > 0 && f > 0) {
        let min = Math.min(o, f);
        for (let d = 0; d < min; d++) pairs.push([c + d, r + d]);
        t = s;
      } else t = r;
    } else t++;
  return pairs;
}
/**
 * 两行之间的单词级 diff：返回旧行被删范围和新行新增范围；改动占比超过 40% 时返回空。
 */
//@ chunk-cwwxybjc.js:8888-9191 fingerprint = wordDiffStrings (1)
function wordDiffStrings(oldStr, newStr) {
  let oldTokens = tokenize(oldStr),
    newTokens = tokenize(newStr),
    ops = diffArrays(oldTokens, newTokens),
    totalLen = oldStr.length + newStr.length,
    o = 0,
    f = [],
    a = [],
    d = 0,
    h = 0;
  for (let op of ops) {
    let len = op.value.reduce((y, k) => y + k.length, 0);
    if (op.removed) ((o += len), f.push({ start: d, end: d + len }), (d += len));
    else if (op.added) ((o += len), a.push({ start: h, end: h + len }), (h += len));
    else ((d += len), (h += len));
  }
  if (totalLen > 0 && o / totalLen > CHANGE_THRESHOLD) return [[], []];
  return [f, a];
}
//@ chunk-cwwxybjc.js:9191-9305 callgraph-witnessed = removeNewlines (1)
function splitBlocksOnNewlines(h) {
  h.lines = h.lines.map((line) =>
    line.flatMap(([t, c]) =>
      c
        .split(
          `
`,
        )
        .filter((r) => r.length > 0)
        .map((r) => [t, r]),
    ),
  );
}
//@ chunk-cwwxybjc.js:9305-9419 file-local
function isAmbiguousWidthChar(e) {
  if (e.length !== 1) return !1;
  let firstCp = e.codePointAt(0);
  for (let [t, c] of BIDI_CONTROL_RANGES) if (firstCp >= t && firstCp <= c) return !0;
  return !1;
}
//@ chunk-cwwxybjc.js:9419-9443 layout
var PRINTABLE_ASCII = /^[\x20-\x7e]*$/;
//@ chunk-cwwxybjc.js:9443-9509 layout
function graphemeWidth(e) {
  if (e === "\t") return 8;
  if (isAmbiguousWidthChar(e)) return 1;
  return bunStringWidth(e);
}
//@ chunk-cwwxybjc.js:9509-9617 layout
function textWidth(e) {
  if (!regExp_2.test(e)) return bunStringWidth(e);
  let parts = e.split(regExp),
    t = parts.length - 1;
  for (let c of parts) t += bunStringWidth(c);
  return t;
}
//@ chunk-cwwxybjc.js:9617-9664 layout
function blocksText(e) {
  return e.map(([, n]) => n).join("");
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
function styleEscape(e, n, t) {
  return colorToEscape(e.foreground, !0, n) + (t ? "" : colorToEscape(e.background, !1, n));
}
//@ chunk-cwwxybjc.js:9835-9987 layout
function mergeSameStyleBlocks(e, n, t) {
  let c = [],
    r = null;
  for (let [s, o] of e) {
    let f = styleEscape(s, n, t),
      at = c.at(-1);
    if (at && f === r) c[c.length - 1] = [at[0], at[1] + o];
    else (c.push([s, o]), (r = f));
  }
  return c;
}
//@ chunk-cwwxybjc.js:9987-10217 layout
function expandTabs(e) {
  if (!e.some(([, r]) => r.includes("\t"))) return e;
  let n = "",
    t = 0,
    c = [];
  for (let [r, s] of e) {
    let parts = s.split("\t"),
      f = "";
    for (let a = 0; a < parts.length; a++) {
      let d = a === 0 ? parts[a] : repeatString(" ", 8 - (t % 8)) + parts[a];
      ((t += appendedWidth(n, d)), (f += d), (n += d));
    }
    c.push([r, f]);
  }
  return c;
}
/**
 * 把一行的样式块按宽度折行（纯 ASCII 快速路径，其余按字素宽度）；超长时截断并加省略号；有增删标记时用行背景色补齐到整宽。
 */
//@ chunk-cwwxybjc.js:10217-11590 layout = addMarker (0.806)
function wrapLines(e, n, t, c, r) {
  let s = [];
  for (let line of e.lines) {
    let f = s.length,
      a = [],
      d = "",
      h = 0;
    for (let [b, g] of expandTabs(mergeSameStyleBlocks(line, c, r))) {
      let y = h + appendedWidth(d, g);
      if (y <= n) {
        if (g.length > 0) (a.push([b, g]), (d += g), (h = y));
        continue;
      }
      if (n >= 1 && PRINTABLE_ASCII.test(g)) {
        let p = 0,
          m = n - h;
        while (g.length - p > m) {
          if (m > 0) (a.push([b, g.slice(p, p + m)]), (p += m));
          if (a.length > 0) (s.push(a), (a = []), (d = ""));
          ((h = 0), (m = n));
        }
        if (p < g.length) (a.push([b, g.slice(p)]), (d += g.slice(p)), (h += g.length - p));
        continue;
      }
      let k = 0,
        S = 0;
      for (let { segment: segment, index: index } of getGraphemeSegmenter().segment(g)) {
        let C = graphemeWidth(segment);
        if (h + S + C > n) {
          if (index > k) a.push([b, g.slice(k, index)]);
          if (a.length > 0) (s.push(a), (a = []), (d = ""), (h = 0));
          if (((k = index), (S = 0), C > n)) {
            (s.push([[b, g.slice(index, index + segment.length)]]), (k = index + segment.length));
            continue;
          }
        }
        S += C;
      }
      if (k < g.length) (a.push([b, g.slice(k)]), (d += g.slice(k)), (h = textWidth(d)));
    }
    if (a.length > 0 || s.length === f) s.push(a);
  }
  if (
    ((e.lines = s),
    (e.lines = e.lines.map((line) => {
      let f = blocksText(line);
      if (textWidth(f) <= n) return line;
      let max = Math.max(0, n - 1),
        d = [[0, 0, 0]],
        h = 0,
        b = 0;
      e: for (let C = 0; C < line.length; C++) {
        let T = line[C][1];
        for (let { segment: segment, index: index } of getGraphemeSegmenter().segment(T)) {
          if (((h += graphemeWidth(segment)), h > max)) break e;
          let w = index + segment.length;
          d.push([C, w, b + w]);
        }
        b += T.length;
      }
      let g = 0,
        y = d.length - 1;
      while (g < y) {
        let C = (g + y + 1) >> 1;
        if (textWidth(f.slice(0, d[C][2])) <= max) g = C;
        else y = C - 1;
      }
      let [k, S] = d[g],
        sliced = line.slice(0, k);
      if (S > 0) sliced.push([line[k][0], line[k][1].slice(0, S)]);
      let m = sliced.at(-1)?.[0] ?? line[0][0];
      return (sliced.push([m, "\u2026"]), sliced);
    })),
    e.marker && e.marker !== " ")
  ) {
    let o = lineBackground(e.marker, t),
      style = { foreground: t.foreground, background: o };
    for (let line of e.lines) {
      let d = textWidth(blocksText(line));
      if (d < n) line.push([style, repeatString(" ", n - d)]);
    }
  }
}
/**
 * 在每个折行前加行号栏（首行显示行号，续行空白；上下文行变暗）。
 */
//@ chunk-cwwxybjc.js:11590-11901 fingerprint = addLineNumber (1)
function addLineNumber(h, theme, maxDigits, fullDim) {
  let style = {
      foreground: h.marker ? decorationColor(h.marker, theme) : theme.foreground,
      background: h.marker ? lineBackground(h.marker, theme) : theme.background,
    },
    shouldDim = h.marker === null || h.marker === " ";
  for (let o = 0; o < h.lines.length; o++) {
    let f = o === 0 ? ` ${String(h.lineNumber).padStart(maxDigits)} ` : " ".repeat(maxDigits + 2),
      a = shouldDim && !fullDim ? `${A}${f}${J}` : f;
    h.lines[o].unshift([style, a]);
  }
}
//@ chunk-cwwxybjc.js:11901-12041 fingerprint = addMarker (1)
function addMarker(h, theme) {
  if (!h.marker) return;
  let style = { foreground: decorationColor(h.marker, theme), background: lineBackground(h.marker, theme) };
  for (let line of h.lines) line.unshift([style, h.marker]);
}
/**
 * ansi 模式下删除行整行变暗。
 */
//@ chunk-cwwxybjc.js:12041-12146 callgraph-fingerprint = dimContent (1)
function dimContent(h) {
  for (let line of h.lines)
    if (line.length > 0) {
      line[0][1] = A + line[0][1];
      let last = line.length - 1;
      line[last][1] = line[last][1] + J;
    }
}
//@ chunk-cwwxybjc.js:12146-12637 layout
function snapRangesToGraphemes(e, n) {
  if (n.length === 0) return n;
  let t = [0];
  for (let o of getGraphemeSegmenter().segment(e)) t.push(o.index + o.segment.length);
  let c = (o) => {
      let f = 0,
        a = t.length - 1;
      while (f < a) {
        let d = (f + a + 1) >> 1;
        if (t[d] <= o) f = d;
        else a = d - 1;
      }
      return t[f];
    },
    r = (o) => {
      let f = 0,
        a = t.length - 1;
      while (f < a) {
        let d = (f + a) >> 1;
        if (t[d] >= o) a = d;
        else f = d + 1;
      }
      return t[f];
    },
    s = [];
  for (let o of n) {
    let f = c(Math.min(o.start, e.length)),
      max = Math.max(f, r(Math.min(o.end, e.length))),
      at = s.at(-1);
    if (at && f <= at.end) at.end = Math.max(at.end, max);
    else s.push({ start: f, end: max });
  }
  return s;
}
/**
 * 给增删行着背景：单词级改动范围用单词背景，其余用行背景（按样式块切分）。
 */
//@ chunk-cwwxybjc.js:12637-13280 fingerprint = applyBackground (1)
function applyBackground(h_2, theme, ranges) {
  if (!h_2.marker) return;
  let lineBg = lineBackground(h_2.marker, theme),
    wordBg = wordBackground(h_2.marker, theme),
    joined = h_2.lines.map((line) => line.map(([, h]) => h).join("")).join(""),
    o = snapRangesToGraphemes(joined, ranges),
    f = 0,
    a = 0;
  for (let d = 0; d < h_2.lines.length; d++) {
    let newLine = [];
    for (let [b, g] of h_2.lines[d]) {
      let y = a,
        k = a + g.length;
      while (f < o.length && o[f].end <= y) f++;
      if (f >= o.length) {
        (newLine.push([{ ...b, background: lineBg }, g]), (a = k));
        continue;
      }
      let S = g,
        p = y;
      while (S.length > 0 && f < o.length) {
        let m = o[f],
          inRange = p >= m.start && p < m.end,
          next;
        if (inRange) next = Math.min(m.end, k);
        else if (m.start > p && m.start < k) next = m.start;
        else next = k;
        let M = next - p,
          seg = S.slice(0, M);
        if (
          (newLine.push([{ ...b, background: inRange ? wordBg : lineBg }, seg]),
          (S = S.slice(M)),
          (p = next),
          p >= m.end)
        )
          f++;
      }
      if (S.length > 0) newLine.push([{ ...b, background: lineBg }, S]);
      a = k;
    }
    h_2.lines[d] = newLine;
  }
}
//@ chunk-cwwxybjc.js:13280-13396 layout = computeGutterWidth (1)
function getMaxLineNumber(patch) {
  let max = Math.max(0, patch.oldStart + patch.oldLines - 1),
    max_2 = Math.max(0, patch.newStart + patch.newLines - 1);
  return Math.max(max, max_2);
}
//@ chunk-cwwxybjc.js:13396-13441 layout
function normalizeMarker(e) {
  return e === "+" || e === "-" ? e : " ";
}
//@ chunk-cwwxybjc.js:13441-13453 layout
var DIFF_GUTTER_BLOCKS = 2,
  FILE_GUTTER_BLOCKS = 1;
/**
 * 带语法高亮与单词级 diff 的 hunk 渲染器（2.1.88 中替代原生 Rust color-diff 的 TS 实现）：buildRows 依次求颜色模式、主题（可被用户 diff 颜色覆盖）、语言、行号，配对增删行做单词 diff，逐行高亮（删除行不高亮）、着背景、折行、加标记与行号；render 输出整行，renderSplit 输出行号栏与内容两列。
 */
//@ chunk-cwwxybjc.js:13453-14737 fingerprint = ColorDiff (0.801)
class ColorDiff {
  hunk;
  filePath;
  firstLine;
  prefixContent;
  constructor(e, n, t, c) {
    ((this.hunk = e), (this.filePath = t), (this.firstLine = n), (this.prefixContent = c ?? null));
  }
  render(e, n, t, c) {
    let { rows: rows, mode: mode } = this.buildRows(e, n, t, c);
    return rows.map((o) => asTerminalEscaped(o, mode, !1, t));
  }
  renderSplit(e, n, t, c) {
    let { rows: rows, mode: mode } = this.buildRows(e, n, t, c);
    return {
      gutters: rows.map((o) => asTerminalEscaped(o.slice(0, DIFF_GUTTER_BLOCKS), mode, !1, t)),
      contents: rows.map((o) => asTerminalEscaped(o.slice(DIFF_GUTTER_BLOCKS), mode, !1, t)),
    };
  }
  buildRows(e, n, t, c) {
    let r = detectColorMode(e),
      s = buildTheme(e, r),
      o = c ? applyThemeDiffColors(s, c, t) : s,
      a = { lang: detectLanguage(this.filePath, this.firstLine), stack: null, squares: 0 };
    this.prefixContent;
    let d = String(getMaxLineNumber(this.hunk)).length,
      oldStart = this.hunk.oldStart,
      newStart = this.hunk.newStart,
      max = Math.max(1, n - d - 2 - 1),
      mapped = this.hunk.lines.map((line) => {
        let m = normalizeMarker(line.slice(0, 1)),
          { code: code, truncatedChars: truncatedChars } = truncateCode(line, 1),
          M;
        switch (m) {
          case "+":
            M = newStart++;
            break;
          case "-":
            M = oldStart++;
            break;
          case " ":
            ((M = newStart), oldStart++, newStart++);
            break;
        }
        return { lineNumber: M, marker: m, code: code, truncatedChars: truncatedChars };
      }),
      mapped_2 = mapped.map(() => []);
    if (!t) {
      let mapped_3 = mapped.map((m) => m.marker);
      for (let [m, C] of findAdjacentPairs(mapped_3)) {
        let [T, M] = wordDiffStrings(mapped[m].code, mapped[C].code);
        ((mapped_2[m] = T), (mapped_2[C] = M));
      }
    }
    let S = [];
    for (let p = 0; p < mapped.length; p++) {
      let { lineNumber: lineNumber, marker: marker, code: code, truncatedChars: truncatedChars } = mapped[p],
        _ = marker === "-" ? [[defaultStyle(o), code]] : highlightLine(a, code, o),
        w = { marker: marker, lineNumber: lineNumber, lines: [_] };
      if ((splitBlocksOnNewlines(w), applyBackground(w, o, mapped_2[p]), truncatedChars > 0))
        w.lines[0].push([defaultStyle(o), bJe(truncatedChars)]);
      if ((wrapLines(w, max, o, r, !1), r === "ansi" && marker === "-")) dimContent(w);
      (addMarker(w, o), addLineNumber(w, o, d, t), S.push(...w.lines));
    }
    return { rows: S, mode: r };
  }
}
/**
 * 整文件语法高亮渲染器（带行号，不做 diff）。
 */
//@ chunk-cwwxybjc.js:14737-15473 fingerprint = ColorFile (0.671)
class ColorFile {
  code;
  filePath;
  constructor(e, n) {
    ((this.code = e), (this.filePath = n));
  }
  render(e, n, t) {
    let { rows: rows, mode: mode } = this.buildRows(e, n, t);
    return rows.map((s) => asTerminalEscaped(s, mode, !0, t));
  }
  renderSplit(e, n, t) {
    let { rows: rows, mode: mode } = this.buildRows(e, n, t);
    return {
      gutters: rows.map((s) => asTerminalEscaped(s.slice(0, FILE_GUTTER_BLOCKS), mode, !0, t)),
      contents: rows.map((s) => asTerminalEscaped(s.slice(FILE_GUTTER_BLOCKS), mode, !0, t)),
    };
  }
  buildRows(e, n, t) {
    let c = detectColorMode(e),
      r = buildTheme(e, c),
      parts = this.code.split(`
`);
    if (parts.at(-1) === "") parts.pop();
    let o = parts[0] ?? null,
      a = { lang: detectLanguage(this.filePath, o), stack: null, squares: 0 },
      d = String(parts.length).length,
      max = Math.max(1, n - d - 2),
      b = [];
    for (let g = 0; g < parts.length; g++) {
      let { code: code, truncatedChars: truncatedChars } = truncateCode(parts[g]),
        S = highlightLine(a, code, r);
      if (truncatedChars > 0) S.push([defaultStyle(r), bJe(truncatedChars)]);
      let p = { marker: null, lineNumber: g + 1, lines: [S] };
      (splitBlocksOnNewlines(p), wrapLines(p, max, r, c, !0), addLineNumber(p, r, d, t), b.push(...p.lines));
    }
    return { rows: b, mode: c };
  }
}
//@ chunk-cwwxybjc.js:15473-15520 callgraph-fingerprint = getSyntaxTheme (0.397)
function getSyntaxTheme(themeName) {
  return { theme: defaultSyntaxThemeName(themeName), source: null };
}
//@ chunk-cwwxybjc.js:15597-15639 placement
function $Ps() {
  return getColorModuleUnavailableReason() === null ? ColorDiff : null;
}
//@ chunk-cwwxybjc.js:15639-15681 placement
function JFn() {
  return getColorModuleUnavailableReason() === null ? ColorFile : null;
}
//@ chunk-cwwxybjc.js:15681-15728 placement
function Gyo(e) {
  return getColorModuleUnavailableReason() === null ? getSyntaxTheme(e) : null;
}

export { $Ps, Gyo, JFn };
