/**
 * utils/sanitization.ts
 *
 * Unicode 清洗：去掉隐藏/双向控制/标签字符，递归清洗对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sanitization.ts
 * pieces: chunk-cgr0tezp.js (59)
 * attribution: placement 58, fingerprint 1
 */
import { truncateToLength, toWellFormedString, collapseWhitespace } from "./stringUtils.js";
import { stripAnsi } from "./stripAnsi.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-cgr0tezp.js:797-870 placement
var SURROGATE_PAIR_OR_LONE_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF]|[\uDC00-\uDFFF]/g;
//@ chunk-cgr0tezp.js:870-929 placement
function stripLoneSurrogates(text) {
  return text.replace(SURROGATE_PAIR_OR_LONE_RE, (match) => (match.length === 2 ? match : ""));
}
//@ chunk-cgr0tezp.js:929-1030 placement
var INVISIBLE_CHARS_RE =
  /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/gu;
var MAX_SHORT_TEXT = 1024;
//@ chunk-cgr0tezp.js:1030-1128 placement
/**
 * 清洗遥测字符串（截断、去控制字符）。
 */
function sanitizeTelemetryString(value) {
  if (typeof value !== "string") return "";
  return truncateToLength(
    recursivelySanitizeUnicode_2(value.length > 4096 ? value.slice(0, 4096) : value),
    MAX_SHORT_TEXT,
  );
}
//@ chunk-cgr0tezp.js:1128-1264 placement
function recursivelySanitizeUnicode_2(value) {
  if (typeof value !== "string") return "";
  let current = value;
  for (let j = 0; j < 64; j++) {
    let replaced = stripLoneSurrogates(current).replace(INVISIBLE_CHARS_RE, "");
    if (replaced === current) return replaced;
    current = replaced;
  }
  return "";
}
//@ chunk-cgr0tezp.js:1264-1404 placement
/**
 * 清洗日志行。
 */
function sanitizeLogLine(value) {
  if (typeof value !== "string") return "";
  return (value.length > 4096 ? value.slice(0, 4096) : value)
    .replace(SURROGATE_PAIR_OR_LONE_RE, (match) => (match.length === 2 ? match : " "))
    .replace(INVISIBLE_CHARS_RE, " ");
}
//@ chunk-cgr0tezp.js:1404-1565 placement
/**
 * 反复去除不可见字符直到稳定（过长返回 null）。
 */
function sanitizeRelayUrl(url) {
  if (url.length > 16384) return null;
  let current = url;
  for (let j = 0; j < 64; j++) {
    let replaced = stripLoneSurrogates(current).replace(INVISIBLE_CHARS_RE, "");
    if (replaced === current) return [...replaced].length <= 8192 ? replaced : null;
    current = replaced;
  }
  return null;
}
//@ chunk-cgr0tezp.js:1565-1773 placement
/**
 * 最多列出三个 URL，其余提示数量。
 */
function formatElicitationUrls(urls) {
  let mapped = urls.slice(0, 3).map((url) => sanitizeRelayUrl(url) ?? "[elicitation URL too long to relay]");
  let moreNote =
    urls.length > 3 ? ` \u2026and ${urls.length - 3} more \u2014 re-run in the terminal to see all` : "";
  return `${mapped.join(", ")}${moreNote}`;
}
//@ chunk-cgr0tezp.js:1773-2047 placement
var EXTRA_COMBINING_MARKS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COMBINING_MARK_CLASS_2;
var LONG_COMBINING_RUN_RE;
var COMBINING_MARK_RE;
deferInit("chunk-cgr0tezp.js:1773", () => {
  EXTRA_COMBINING_MARKS =
    "\\u05C8\\u05C9\\u1ADE\\u1ADF\\u1AEC-\\u1AF0\\u{10ECB}-\\u{10ECF}\\u{10EF0}-\\u{10EF9}\\u{1D127}\\u{1D128}\\u{1D250}-\\u{1D252}\\u{1D25B}\\u{1D25C}\\u{1D25F}\\u{1D280}\\u{1D281}";
  COMBINING_MARK_CLASS_2 = `[\\p{M}\\uFF9E\\uFF9F${EXTRA_COMBINING_MARKS}]`;
  LONG_COMBINING_RUN_RE = new RegExp(`${COMBINING_MARK_CLASS_2}{32,}`, "gu");
  COMBINING_MARK_RE = new RegExp(COMBINING_MARK_CLASS_2, "u");
});
//@ chunk-cgr0tezp.js:2047-2079 placement
var combiningClassCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var combiningClassOrder;
var decompositionCache;
deferInit("chunk-cgr0tezp.js:2047", () => {
  combiningClassCache = new Map();
  combiningClassOrder = [];
  decompositionCache = new Map();
});
//@ chunk-cgr0tezp.js:2079-2139 placement
function reordersUnderNfd(a, b) {
  return a !== b && (a + b).normalize("NFD") === b + a;
}
//@ chunk-cgr0tezp.js:2139-2518 placement
/**
 * 字符的易混淆替代（缓存）。
 */
function combiningClassOf(codePoint) {
  let cached = combiningClassCache.get(codePoint);
  if (cached !== undefined) return cached;
  let char = String.fromCodePoint(codePoint);
  let entry = null;
  if (char === "\u0334" || reordersUnderNfd(char, "\u0334") || reordersUnderNfd("\u0345", char)) {
    let lo = 0;
    let hi = combiningClassOrder.length;
    while (lo < hi && entry === null) {
      let mid = (lo + hi) >> 1;
      let middle = combiningClassOrder[mid];
      if (reordersUnderNfd(char, middle.sample)) lo = mid + 1;
      else if (reordersUnderNfd(middle.sample, char)) hi = mid;
      else entry = middle;
    }
    if (entry === null) {
      entry = {
        order: lo,
        sample: char,
      };
      combiningClassOrder.splice(lo, 0, entry);
      for (let j = lo + 1; j < combiningClassOrder.length; j++) combiningClassOrder[j].order = j;
    }
  }
  combiningClassCache.set(codePoint, entry);
  return entry;
}
//@ chunk-cgr0tezp.js:2518-2662 placement
function decomposeCodePoint(codePoint) {
  let parts = decompositionCache.get(codePoint);
  if (parts === undefined) {
    parts = Array.from(String.fromCodePoint(codePoint).normalize("NFKD"), (char) => char.codePointAt(0));
    decompositionCache.set(codePoint, parts);
  }
  return parts;
}
//@ chunk-cgr0tezp.js:2662-2674 placement
var FROM_CODE_POINT_CHUNK = 4096;
//@ chunk-cgr0tezp.js:2674-2790 placement
function codePointsToString(codePoints, length) {
  let text = "";
  for (let offset = 0; offset < length; offset += FROM_CODE_POINT_CHUNK)
    text += String.fromCodePoint(
      ...codePoints.subarray(offset, Math.min(offset + FROM_CODE_POINT_CHUNK, length)),
    );
  return text;
}
//@ chunk-cgr0tezp.js:2790-3380 placement
/**
 * 计算易混淆字符骨架。
 */
function canonicalReorderRun(run) {
  let int32Array = new Int32Array(run.length + 16);
  let count = 0;
  for (let index = 0; index < run.length;) {
    let codePoint = run.codePointAt(index);
    index += codePoint > 65535 ? 2 : 1;
    for (let decomposedPoint of decomposeCodePoint(codePoint)) {
      if (count === int32Array.length) {
        let int32Array_2 = new Int32Array(int32Array.length * 2);
        int32Array_2.set(int32Array);
        int32Array = int32Array_2;
      }
      int32Array[count++] = decomposedPoint;
      combiningClassOf(decomposedPoint);
    }
  }
  let int16Array = new Int16Array(count);
  for (let j = 0; j < count; j++) int16Array[j] = combiningClassCache.get(int32Array[j])?.order ?? -1;
  let codePoints = int32Array.slice(0, count);
  let int32Array_2 = new Int32Array(combiningClassOrder.length);
  for (let runStart = 0; runStart < count;) {
    let runEnd = runStart;
    let sorted = true;
    while (runEnd < count && int16Array[runEnd] >= 0) {
      sorted &&= runEnd === runStart || int16Array[runEnd - 1] <= int16Array[runEnd];
      runEnd++;
    }
    if (sorted) {
      runStart = runEnd + 1;
      continue;
    }
    int32Array_2.fill(0);
    for (let i = runStart; i < runEnd; i++) int32Array_2[int16Array[i]]++;
    let offset = runStart;
    for (let j = 0; j < int32Array_2.length; j++) {
      let count = int32Array_2[j];
      int32Array_2[j] = offset;
      offset += count;
    }
    for (let i = runStart; i < runEnd; i++) codePoints[int32Array_2[int16Array[i]]++] = int32Array[i];
    runStart = runEnd;
  }
  return codePointsToString(codePoints, count);
}
//@ chunk-cgr0tezp.js:3380-3434 placement
function reorderLongCombiningRuns(text) {
  return text.length < 32 ? text : text.replace(LONG_COMBINING_RUN_RE, canonicalReorderRun);
}
//@ chunk-cgr0tezp.js:3434-3445 placement
var NORMALIZE_CHUNK = 128;
//@ chunk-cgr0tezp.js:3445-3584 placement
function isNormalizationStarter(codePoint) {
  if (codePoint < 768) return true;
  let decomposed = decompositionCache.get(codePoint);
  if (decomposed === undefined && !COMBINING_MARK_RE.test(String.fromCodePoint(codePoint))) return true;
  return combiningClassOf((decomposed ?? decomposeCodePoint(codePoint))[0]) === null;
}
//@ chunk-cgr0tezp.js:3584-3794 placement = needsWidthCompensation (1)
function nextStarterIndex(text, index) {
  let scanIndex = index;
  if (
    scanIndex < text.length &&
    (text.charCodeAt(scanIndex) & 64512) === 56320 &&
    (text.charCodeAt(scanIndex - 1) & 64512) === 55296
  )
    scanIndex++;
  while (scanIndex < text.length) {
    let cp = text.codePointAt(scanIndex);
    if (isNormalizationStarter(cp)) break;
    scanIndex += cp > 65535 ? 2 : 1;
  }
  return Math.min(scanIndex, text.length);
}
//@ chunk-cgr0tezp.js:3794-3960 placement = needsWidthCompensation (1)
function lastStarterIndex(char) {
  let index = char.length;
  while (index > 0) {
    index--;
    if (
      index > 0 &&
      (char.charCodeAt(index) & 64512) === 56320 &&
      (char.charCodeAt(index - 1) & 64512) === 55296
    )
      index--;
    if (isNormalizationStarter(char.codePointAt(index))) return index;
  }
  return 0;
}
//@ chunk-cgr0tezp.js:3960-4202 placement
/**
 * 分块做 Unicode 规范化（每块 128 码元在规范化起始字符处切开），避免超长组合序列导致的性能问题。
 */
function normalizeChunked(text, form) {
  let reordered = reorderLongCombiningRuns(text);
  if (reordered.length <= NORMALIZE_CHUNK) return reordered.normalize(form);
  let pieces = [];
  let carry = "";
  for (let index = 0; index < reordered.length;) {
    let nextIndex = nextStarterIndex(reordered, index + NORMALIZE_CHUNK);
    let char = (carry + reordered.slice(index, nextIndex)).normalize(form);
    let cut = nextIndex === reordered.length ? char.length : lastStarterIndex(char);
    pieces.push(char.slice(0, cut));
    carry = char.slice(cut);
    index = nextIndex;
  }
  return pieces.join("");
}
//@ chunk-cgr0tezp.js:4202-4237 placement
/**
 * NFKC 归一化。
 */
function normalizeNfkc(text) {
  return normalizeChunked(text, "NFKC");
}
//@ chunk-cgr0tezp.js:4237-4273 placement
/**
 * nfkdNormalize：NFKD 规范化。
 */
function nfkdNormalize(text) {
  return normalizeChunked(text, "NFKD");
}
//@ chunk-cgr0tezp.js:4273-5109 placement
/**
 * 框线字符范围与替换表。
 */
var BOX_DRAWING_RANGES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BOX_DRAWING_RANGES;
deferInit("chunk-cgr0tezp.js:4273", () => {
  BOX_DRAWING_RANGES_2 =
    "\u02F9-\u02FC\u230C-\u230F\u231C-\u231F\u239B-\u23CC\u23DC-\u23E1\u2E00-\u2E0D\u2E1C\u2E1D\u2500-\u257F";
  BOX_DRAWING_RANGES = new Map([
    ["\u02C2", "<"],
    ["\u02C3", ">"],
    ["\u1433", ">"],
    ["\u1438", "<"],
    ["\u16B2", "<"],
    ["\u2039", "<"],
    ["\u203A", ">"],
    ["\u226E", "<"],
    ["\u226F", ">"],
    ["\u227A", "<"],
    ["\u227B", ">"],
    ["\u2280", "<"],
    ["\u2281", ">"],
    ["\u22D6", "<"],
    ["\u22D7", ">"],
    ["\u2329", "<"],
    ["\u232A", ">"],
    ["\u276C", "<"],
    ["\u276D", ">"],
    ["\u276E", "<"],
    ["\u276F", ">"],
    ["\u2770", "<"],
    ["\u2771", ">"],
    ["\u27E8", "<"],
    ["\u27E9", ">"],
    ["\u2991", "<"],
    ["\u2992", ">"],
    ["\u2993", "<"],
    ["\u2994", ">"],
    ["\u29FC", "<"],
    ["\u29FD", ">"],
    ["\u2A79", "<"],
    ["\u2A7A", ">"],
    ["\u2AA6", "<"],
    ["\u2AA7", ">"],
    ["\u3008", "<"],
    ["\u3009", ">"],
    ["\uFE3F", "<"],
    ["\uFE40", ">"],
    ["\uFE64", "<"],
    ["\uFE65", ">"],
    ["\uFF1C", "<"],
    ["\uFF1E", ">"],
    ["\uD81B\uDF3F", ">"],
    ["\uD834\uDE36", "<"],
    ["\uD834\uDE37", ">"],
  ]);
});
//@ chunk-cgr0tezp.js:5109-5399 placement
/**
 * 尖括号类易混淆字符表。
 */
var BRACKET_CONFUSABLES_2; // deferred: uses BOX_DRAWING_RANGES_2 of its import cycle while loading; runs once the cycle is complete
var BRACKET_CONFUSABLES;
var BRACKET_CONFUSABLES_WITH_ANGLES;
deferInit("chunk-cgr0tezp.js:5109", () => {
  BRACKET_CONFUSABLES_2 = new Map([
    ...BOX_DRAWING_RANGES,
    ...Array.from("\u226A\u22D8\u2AA1\u2AF7\u27EA\uFE3D", (char) => [char, "<"]),
    ...Array.from("\u226B\u22D9\u2AA2\u2AF8\u27EB\uFE3E", (char) => [char, ">"]),
  ]);
  BRACKET_CONFUSABLES = new Map([...BRACKET_CONFUSABLES_2, ["\u300A", "<"], ["\u300B", ">"]]);
  BRACKET_CONFUSABLES_WITH_ANGLES = new Set(
    `\u2992\u2994\u2A7A\u2AA7${"\u226B\u22D9\u2AA2\u2AF8\u27EB\uFE3E"}`,
  );
});
//@ chunk-cgr0tezp.js:5399-5465 placement
/**
 * 字符及其易混淆变体。
 */
function withConfusables(char) {
  let result = char;
  for (let [key, value] of BRACKET_CONFUSABLES) if (value === char) result += key;
  return result;
}
//@ chunk-cgr0tezp.js:5465-5556 placement
/**
 * CONTROL_CHARS_RE：控制字符与行分隔符；MAX_CLEAN_IDENTIFIER_LENGTH：干净标识符长度上限；CONTROL_CHARS_OR_ANGLE_RE：控制字符或尖括号（同一声明共 3 个绑定）。
 */
var CONTROL_CHARS_RE = /[\x00-\x1f\x7f-\x9f\u2028\u2029]/g;
var MAX_CLEAN_IDENTIFIER_LENGTH = 256;
var CONTROL_CHARS_OR_ANGLE_RE = /[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;
//@ chunk-cgr0tezp.js:5556-5605 placement
function isCleanIdentifier(value) {
  return value.length <= MAX_CLEAN_IDENTIFIER_LENGTH && !CONTROL_CHARS_OR_ANGLE_RE.test(value);
}
//@ chunk-cgr0tezp.js:5605-5645 placement
/**
 * 非空标识符。
 */
function isNonEmptyIdentifier(name) {
  return name.length > 0 && isCleanIdentifier(name);
}
//@ chunk-cgr0tezp.js:5645-5711 placement
/**
 * isAsciiIdentifier：短且仅 ASCII 标识符字符。
 */
function isAsciiIdentifier(value) {
  return value.length <= MAX_CLEAN_IDENTIFIER_LENGTH && /^[A-Za-z0-9_:.-]+$/.test(value);
}
//@ chunk-cgr0tezp.js:5711-5784 placement
/**
 * isUnicodeIdentifier：短且仅 Unicode 标识符字符。
 */
function isUnicodeIdentifier(value) {
  return value.length <= MAX_CLEAN_IDENTIFIER_LENGTH && /^[\p{L}\p{M}\p{N}_:.-]+$/u.test(value);
}
//@ chunk-cgr0tezp.js:5784-5875 placement
/**
 * isSafeRelativePath：短且为不含 .. 的相对路径。
 */
function isSafeRelativePath(workingDirectory) {
  return (
    workingDirectory.length <= MAX_CLEAN_IDENTIFIER_LENGTH &&
    /^(?:\/(?!\.\.?(?:\/|$))[A-Za-z0-9._+@-]+)+$/.test(workingDirectory)
  );
}
//@ chunk-cgr0tezp.js:5875-5973 placement = escapeXml (1)
/**
 * 转义 XML 文本并编码控制字符。
 */
function escapeXmlText(s) {
  return encodeControlChars(s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
}
//@ chunk-cgr0tezp.js:5973-6038 placement
/**
 * 控制字符编码为字符实体。
 */
function encodeControlChars(text) {
  return text.replace(CONTROL_CHARS_RE, (char) => `&#${char.charCodeAt(0)};`);
}
//@ chunk-cgr0tezp.js:6038-6108 placement = escapeXml (0.793)
/**
 * 转义尖括号。
 */
function escapeAngleBrackets(s) {
  return s.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
//@ chunk-cgr0tezp.js:6108-6152 placement
/**
 * 标签内安全文本。
 */
function escapeForTag(value) {
  return encodeControlChars(escapeAngleBrackets(String(value ?? "")));
}
//@ chunk-cgr0tezp.js:6152-6206 placement
/**
 * escapeXmlAttribute：转义后的 XML 属性值。
 */
function escapeXmlAttribute(value) {
  return escapeForTag(value).replaceAll('"', "&quot;");
}
//@ chunk-cgr0tezp.js:6206-6475 placement
var MAX_ATTRIBUTE_LENGTH; // deferred: uses BRACKET_CONFUSABLES_2 of its import cycle while loading; runs once the cycle is complete
var HIDDEN_CHARS_RE;
var SYMBOL_CHARS_RE;
var BRACKET_CONFUSABLES_RE;
var OPEN_BRACKET_RE;
var CLOSE_BRACKET_RE;
deferInit("chunk-cgr0tezp.js:6206", () => {
  MAX_ATTRIBUTE_LENGTH = 2000;
  HIDDEN_CHARS_RE = /[\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{Default_Ignorable_Code_Point}\u2800]/gu;
  SYMBOL_CHARS_RE = new RegExp(`[${BOX_DRAWING_RANGES_2}]|(?![\\x00-\\x7f])[\\p{Sm}\\p{Sk}\\p{So}]`, "gu");
  BRACKET_CONFUSABLES_RE = new RegExp(`[${[...BRACKET_CONFUSABLES_2.keys()].join("")}]`, "gu");
  OPEN_BRACKET_RE = /(?![({\u201A\u201E\u2E42])\p{Ps}/gu;
  CLOSE_BRACKET_RE = /(?![)}])\p{Pe}/gu;
});
//@ chunk-cgr0tezp.js:6475-6725 placement
/**
 * 清洗属性值（长度、不可见字符）。
 */
function sanitizeAttributeValue(value) {
  if (typeof value !== "string" || value.length > MAX_ATTRIBUTE_LENGTH) return null;
  let trimmed = escapeAngleBrackets(
    normalizeNfkc(value.replace(HIDDEN_CHARS_RE, ""))
      .replace(CONTROL_CHARS_RE, " ")
      .replace(SYMBOL_CHARS_RE, " ")
      .replace(/\s+/g, " ")
      .replace(BRACKET_CONFUSABLES_RE, (char) => BRACKET_CONFUSABLES_2.get(char) ?? char)
      .replace(OPEN_BRACKET_RE, "(")
      .replace(CLOSE_BRACKET_RE, ")"),
  ).trim();
  return trimmed === "" || trimmed.length > MAX_ATTRIBUTE_LENGTH ? null : trimmed;
}
//@ chunk-cgr0tezp.js:6725-7145 placement
/**
 * 不可见字符类正则片段。
 */
var INVISIBLE_CHAR_CLASSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var INVISIBLE_CHAR_CLASS_SOURCE;
var INVISIBLE_CHAR_RANGES;
var INVISIBLE_FORMAT_RANGES;
var INVISIBLE_CHARS_RE_SOURCE;
var regExp;
deferInit("chunk-cgr0tezp.js:6725", () => {
  INVISIBLE_CHAR_CLASSES = "\\p{Default_Ignorable_Code_Point}\\u2800";
  INVISIBLE_CHAR_CLASS_SOURCE = `\\p{Cc}\\p{Cf}\\p{Cs}\\p{Co}\\p{Cn}\\u2028\\u2029${INVISIBLE_CHAR_CLASSES}`;
  INVISIBLE_CHAR_RANGES = String.raw`\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\u3164\ufe00-\ufe0f\uffa0\ufff0-\ufffb\uDC00-\uDFFF\uDB40-\uDB43`;
  INVISIBLE_FORMAT_RANGES = String.raw`\u0600-\u0605\u06dd\u070f\u0890\u0891\u08e2`;
  INVISIBLE_CHARS_RE_SOURCE = `[${INVISIBLE_CHAR_RANGES}${INVISIBLE_FORMAT_RANGES}\\ufeff]*`;
  regExp = new RegExp(`[${INVISIBLE_CHAR_RANGES}${INVISIBLE_FORMAT_RANGES}\\ufeff]`);
});
//@ chunk-cgr0tezp.js:7145-7254 placement
/**
 * 在关键词正则字母间插入可选分隔符。
 */
function allowSeparatorsInPattern(pattern) {
  return pattern
    .replace(/([a-z)])(?=[a-z(\[])/gi, `$1${INVISIBLE_CHARS_RE_SOURCE}`)
    .replace(/\[_-\]\?/g, `(?:[_-]${INVISIBLE_CHARS_RE_SOURCE})?`);
}
//@ chunk-cgr0tezp.js:7254-7464 placement
var regExp_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ZWJ_VS_KEEP_CHARS;
var regExp_3;
var regExp_4;
var regExp_5;
var INVISIBLE_CHARS_ALLOWING_ZWJ_RE;
deferInit("chunk-cgr0tezp.js:7254", () => {
  regExp_2 = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}]+`, "gu");
  ZWJ_VS_KEEP_CHARS = "\\u200D\\uFE0E\\uFE0F";
  regExp_3 = new RegExp(`(?:(?![${ZWJ_VS_KEEP_CHARS}])[${INVISIBLE_CHAR_CLASS_SOURCE}])+`, "gu");
  regExp_4 = new RegExp(`(?:(?![${ZWJ_VS_KEEP_CHARS}\\n])[${INVISIBLE_CHAR_CLASS_SOURCE}])+`, "gu");
  regExp_5 = new RegExp(`(?<!\\S)[${ZWJ_VS_KEEP_CHARS}]+`, "gu");
  INVISIBLE_CHARS_ALLOWING_ZWJ_RE = /\p{Cs}/gu;
});
//@ chunk-cgr0tezp.js:7464-7977 placement
/**
 * 去除不可见字符（可保留拼写的连接符）。
 */
function stripInvisibleChars(text, replacement, options) {
  let stripped = stripAnsi(text.replace(INVISIBLE_CHARS_ALLOWING_ZWJ_RE, "\u200B"));
  if (options !== undefined && "keepSpelledJoiners" in options) {
    let joinerPositions = new Set();
    if (stripped.length <= MAX_JOINER_INSPECT_LENGTH && KEEP_JOINER_TEST_RE.test(stripped)) {
      RGI_EMOJI_RE ??= new RegExp("\\p{RGI_Emoji}", "gv");
      for (let pattern of [RGI_EMOJI_RE, regExp_7])
        for (let { index, 0: matchText } of stripped.matchAll(pattern))
          for (let charIndex = index; charIndex < index + matchText.length; charIndex++)
            joinerPositions.add(charIndex);
    }
    return stripped.replace(regExp_2, (run, offset) => {
      let rebuilt = "";
      for (let j = 0; j < run.length; j++)
        rebuilt += joinerPositions.has(offset + j)
          ? run.charAt(j)
          : rebuilt.endsWith(replacement)
            ? ""
            : replacement;
      return rebuilt;
    });
  }
  let keepEmoji = options?.keepNewlines === true || options?.keepEmojiJoiners === true;
  let replaced = stripped.replace(
    options?.keepNewlines ? regExp_4 : keepEmoji ? regExp_3 : regExp_2,
    replacement,
  );
  return keepEmoji ? replaced.replace(regExp_5, "") : replaced;
}
//@ chunk-cgr0tezp.js:7977-9183 placement
/**
 * 不可见字符与组合符正则。
 */
var INVISIBLE_PATTERNS; // deferred: uses zeroWidthJoinerRule of its import cycle while loading; runs once the cycle is complete
var INVISIBLE_SINGLE_RE;
var COMBINING_MARK_CLASS;
var regExp_6;
var COMBINING_REORDER_RE;
var ARABIC_JOINERS_SOURCE;
var mapped;
var ARABIC_LEFT_JOINING_SOURCE;
var regExp_7;
var regExp_8;
var KEEP_JOINER_TEST_RE;
var RGI_EMOJI_RE;
deferInit("chunk-cgr0tezp.js:7977", () => {
  INVISIBLE_PATTERNS = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
  INVISIBLE_SINGLE_RE = /(?! )\p{Zs}|[\uFFFC\u{1D159}\u{13441}\u{13442}\u{16FE4}]|^ | $/u;
  COMBINING_MARK_CLASS = "[\\p{M}\\u1160-\\u11FF\\uD7B0-\\uD7FF]";
  regExp_6 = new RegExp(
    `(?<![\\p{L}\\p{N}\\p{M}])${COMBINING_MARK_CLASS}|${COMBINING_MARK_CLASS}{9}|\\p{Soft_Dotted}\\p{M}*\\u0307|[\\u0131\\u0237]\\p{M}|(?<=[\\p{sc=Latin}\\p{sc=Common}]${COMBINING_MARK_CLASS}*)(?!\\p{sc=Inherited})${COMBINING_MARK_CLASS}`,
    "u",
  );
  COMBINING_REORDER_RE = String.raw`\u0620\u0626\u0628\u062A-\u062E\u0633-\u063F\u0641-\u0647\u0649\u064A\u066E\u066F\u0678-\u0687\u069A-\u06BF\u06C1\u06C2\u06CC\u06CE\u06D0\u06D1\u06FA-\u06FC\u06FF\u0750-\u0758\u075C-\u076A\u076D-\u0770\u0772\u0775-\u0777\u077A-\u077F\u0886\u0889-\u088D\u088F\u08A0-\u08A9\u08AF\u08B0\u08B3-\u08B8\u08BA-\u08C8`;
  ARABIC_JOINERS_SOURCE = String.raw`\u0620\u0622-\u063F\u0641-\u064A\u066E\u066F\u0671-\u0673\u0675-\u06D3\u06D5\u06EE\u06EF\u06FA-\u06FC\u06FF\u0750-\u077F\u0870-\u0882\u0886\u0889-\u088F\u08A0-\u08AC\u08AE-\u08C8`;
  mapped = [2304, 2432, 2688, 2816, 3072, 3200, 3328].map(zeroWidthJoinerRule);
  ARABIC_LEFT_JOINING_SOURCE = String.raw`[\u0D9A-\u0DC6]`;
  regExp_7 = new RegExp(
    [
      ...mapped,
      `\\u200D(?<=${ARABIC_LEFT_JOINING_SOURCE}\\u0DCA.)(?=${ARABIC_LEFT_JOINING_SOURCE})`,
      `\\u200C(?<=[${COMBINING_REORDER_RE}](?:(?=[\\p{sc=Arabic}\\p{sc=Inherited}])(?!\\p{Default_Ignorable_Code_Point})\\p{Mn}){0,8}.)(?=[${ARABIC_JOINERS_SOURCE}])`,
    ].join("|"),
    "gu",
  );
  regExp_8 = new RegExp(`\\u20E3|\\u263A${COMBINING_MARK_CLASS}`, "u");
  KEEP_JOINER_TEST_RE = /[\u200C\u200D\uFE0F\u{E007F}]/u;
});
//@ chunk-cgr0tezp.js:9183-9319 placement
function zeroWidthJoinerRule(base) {
  let leftContext = `[${unicodeEscape(base + 21)}-${unicodeEscape(base + 57)}]`;
  let optionalMark = base === 3328 ? "" : `${unicodeEscape(base + 60)}?`;
  return `[\\u200C\\u200D](?<=${leftContext}${optionalMark}${unicodeEscape(base + 77)}.)(?=${leftContext})`;
}
//@ chunk-cgr0tezp.js:9319-9365 placement
function unicodeEscape(codePoint) {
  return `\\u{${codePoint.toString(16)}}`;
}
//@ chunk-cgr0tezp.js:9365-9488 placement
function neutralizeEmoji(text) {
  if (!KEEP_JOINER_TEST_RE.test(text)) return text;
  RGI_EMOJI_RE ??= new RegExp("\\p{RGI_Emoji}", "gv");
  return text.replace(RGI_EMOJI_RE, "\u263A").replace(regExp_7, "");
}
//@ chunk-cgr0tezp.js:9488-9500 placement
var MAX_JOINER_INSPECT_LENGTH = 4096;
//@ chunk-cgr0tezp.js:9500-9565 placement
/**
 * isNameWithNoJoinerFixes：名字干净且无需连接符处理。
 */
function isNameWithNoJoinerFixes(name) {
  return isCleanIdentifier_2(name) && !name.includes("  ") && !regExp_6.test(neutralizeEmoji(name));
}
//@ chunk-cgr0tezp.js:9565-9681 placement
function isCleanIdentifier_2(name) {
  return (
    isNonEmptyIdentifier(name) &&
    !INVISIBLE_PATTERNS.test(neutralizeEmoji(name)) &&
    !regExp_8.test(neutralizeEmoji(name)) &&
    !/\uFE0F[\u{1F3FB}-\u{1F3FF}]/u.test(name) &&
    !INVISIBLE_SINGLE_RE.test(name)
  );
}
//@ chunk-cgr0tezp.js:9681-9765 placement
var regExp_9; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cgr0tezp.js:9681", () => {
  regExp_9 = new RegExp(
    `[\\p{Cf}\\p{Co}\\p{Cn}\\u2028\\u2029\\u007F-\\u009F${INVISIBLE_CHAR_CLASSES}]`,
    "gu",
  );
});
//@ chunk-cgr0tezp.js:9765-9986 placement
function stripInvisibleChars_2(wellFormedString) {
  let replaced = wellFormedString.replace(/[\p{Cf}\p{Co}\p{Cn}]/gu, "");
  replaced = replaced
    .replace(/[\u200B-\u200F]/g, "")
    .replace(/[\u202A-\u202E]/g, "")
    .replace(/[\u2066-\u2069]/g, "")
    .replace(/[\uFEFF]/g, "")
    .replace(/[\uE000-\uF8FF]/g, "");
  return replaced;
}
//@ chunk-cgr0tezp.js:9986-10078 placement
/**
 * 反复去除组合字符直到稳定。
 */
function stripCombiningRepeated(text) {
  let wellFormedString = toWellFormedString(text);
  for (let j = 0; j < 10; j++) {
    let stripped = stripInvisibleChars_2(wellFormedString);
    if (stripped === wellFormedString) return wellFormedString;
    wellFormedString = stripped;
  }
  return wellFormedString;
}
//@ chunk-cgr0tezp.js:10078-10122 placement
var IGNORABLE_CODE_POINT_RE = /\p{Default_Ignorable_Code_Point}/gu;
//@ chunk-cgr0tezp.js:10122-10169 placement
/**
 * 去掉默认可忽略字符。
 */
function stripIgnorables(text) {
  return collapseWhitespace(stripCombiningRepeated(text).replace(IGNORABLE_CODE_POINT_RE, ""));
}
//@ chunk-cgr0tezp.js:10169-10213 placement
function isAsciiOnly(text) {
  return !/[^\0-\x7f]/.test(text);
}
//@ chunk-cgr0tezp.js:10213-10427 fingerprint = partiallySanitizeUnicode (0.81)
/**
 * 清洗提示词中的危险 Unicode（零宽、双向覆盖、标签字符等），防止隐藏指令注入。
 */
function partiallySanitizeUnicode(prompt) {
  if (isAsciiOnly(prompt)) return prompt;
  let current = prompt;
  let previous = "";
  let iterations = 0;
  let MAX_ITERATIONS = 10;
  while (current !== previous && iterations < MAX_ITERATIONS) {
    previous = current;
    current = normalizeNfkc(current);
    current = stripCombiningRepeated(current);
    iterations++;
  }
  if (iterations >= MAX_ITERATIONS)
    throw Error(
      `Unicode sanitization reached maximum iterations (${MAX_ITERATIONS}) for input: ${prompt.slice(0, 100)}`,
    );
  return current;
}
//@ chunk-cgr0tezp.js:10427-10653 placement
/**
 * 递归清洗 Unicode：字符串走 partiallySanitizeUnicode（去隐藏/双向控制字符等），数组和对象逐项递归，丢弃 __proto__ 键。
 */
function recursivelySanitizeUnicode(value) {
  if (typeof value === "string") return partiallySanitizeUnicode(value);
  if (Array.isArray(value)) return value.map(recursivelySanitizeUnicode);
  if (value !== null && typeof value === "object") {
    let result = {};
    for (let [key, value_2] of Object.entries(value)) {
      let safeKey = recursivelySanitizeUnicode(key);
      if (safeKey !== "__proto__") result[safeKey] = recursivelySanitizeUnicode(value_2);
    }
    return result;
  }
  return value;
}
export {
  escapeForTag,
  MAX_CLEAN_IDENTIFIER_LENGTH,
  escapeXmlText,
  BRACKET_CONFUSABLES_2,
  INVISIBLE_CHAR_CLASS_SOURCE,
  BOX_DRAWING_RANGES_2,
  escapeXmlAttribute,
  isAsciiIdentifier,
  escapeAngleBrackets,
  CONTROL_CHARS_OR_ANGLE_RE,
  isNonEmptyIdentifier,
  stripIgnorables,
  stripCombiningRepeated,
  sanitizeTelemetryString,
  withConfusables,
  allowSeparatorsInPattern,
  INVISIBLE_CHAR_RANGES,
  INVISIBLE_CHARS_RE_SOURCE,
  encodeControlChars,
  sanitizeRelayUrl,
  formatElicitationUrls,
  stripInvisibleChars,
  normalizeNfkc,
  recursivelySanitizeUnicode,
  sanitizeAttributeValue,
  isAsciiOnly,
  partiallySanitizeUnicode,
  BRACKET_CONFUSABLES,
  sanitizeLogLine,
  recursivelySanitizeUnicode_2,
  regExp_9,
  regExp_2,
  MAX_SHORT_TEXT,
  isSafeRelativePath,
  isUnicodeIdentifier,
  isNameWithNoJoinerFixes,
  reorderLongCombiningRuns,
  BRACKET_CONFUSABLES_WITH_ANGLES,
  nfkdNormalize,
  INVISIBLE_FORMAT_RANGES,
  regExp,
};
