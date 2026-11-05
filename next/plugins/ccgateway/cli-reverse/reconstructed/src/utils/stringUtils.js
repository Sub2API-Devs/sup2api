/**
 * utils/stringUtils.ts
 *
 * 字符串工具：截断（UTF-16 安全、中间截断）、前后缀、良构字符串修复、plural、首行；另混入 deniedModels 条目解析与标签中和代码
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/stringUtils.ts
 * pieces: chunk-7kayq7nc.js (2), chunk-8824h7w7.js (51), chunk-z20c443b.js (1)
 * attribution: placement 26, fingerprint 3, callgraph-witnessed 2, layout 20, file-local 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { MAX_SEED_NAME_CHARS } from "./swarm/teammateIds.js";
import { replaceControlChars } from "./resultError.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-8824h7w7.js:191-253 placement
/**
 * 把字符串重复 n 次（n 非有限或不大于 0 时视为 0）。旧版名 joinContinuationLines 误配，属第三方或通用工具。
 */
function repeatString(text, count) {
  return text.repeat(Number.isFinite(count) && count > 0 ? count : 0);
}
//@ chunk-8824h7w7.js:253-315 placement (2.1.88 match: urlPatternToRegex, 1)
function urlPatternToRegex(pattern) {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//@ chunk-8824h7w7.js:315-374 fingerprint (2.1.88 match: capitalize, 1)
/**
 * 首字母大写。
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
//@ chunk-8824h7w7.js:374-415 callgraph-witnessed (2.1.88 match: plural, 0)
/**
 * 按数量选单复数：n===1 用单数，否则用复数（默认单数加 s）。
 */
function plural(n_2, word, pluralWord = word + "s") {
  return n_2 === 1 ? word : pluralWord;
}
//@ chunk-8824h7w7.js:415-588 layout
/**
 * 按码点统计字符串长度（代理对计 1）。
 */
function countCodePoints(text) {
  let count = 0;
  for (let j = 0; j < text.length; j++) {
    let code = text.charCodeAt(j);
    if (code >= 55296 && code <= 56319 && j + 1 < text.length) {
      let code = text.charCodeAt(j + 1);
      if (code >= 56320 && code <= 57343) j++;
    }
    count++;
  }
  return count;
}
//@ chunk-8824h7w7.js:588-703 layout
/**
 * 按码点截断到 n 个字符。
 */
function truncateCodePoints(text, maxLength) {
  if (text.length <= maxLength) return text;
  let chars = [];
  for (let char of text) {
    if (chars.length >= maxLength) break;
    chars.push(char);
  }
  return chars.join("");
}
//@ chunk-8824h7w7.js:703-846 layout
/**
 * 截断到 n 个 UTF-16 单元，切点落在代理对中间时少取一个，保证结果良构。
 */
function truncateToLength(text, maxLength) {
  if (maxLength <= 0) return "";
  if (text.length <= maxLength) return text;
  let sliced = text.slice(0, maxLength);
  let code = sliced.charCodeAt(maxLength - 1);
  return repairUtf16(code >= 55296 && code <= 56319 ? sliced.slice(0, -1) : sliced);
}
//@ chunk-8824h7w7.js:846-984 layout
/**
 * 取末尾 n 个 UTF-16 单元，起点落在低代理项时跳过一个。
 */
function takeLastChars(text, maxLength) {
  if (maxLength <= 0) return "";
  if (text.length <= maxLength) return text;
  let sliced = text.slice(-maxLength);
  let code = sliced.charCodeAt(0);
  return repairUtf16(code >= 56320 && code <= 57343 ? sliced.slice(1) : sliced);
}
//@ chunk-8824h7w7.js:984-1117 layout
/**
 * 中间截断：保留开头 headChars 与结尾 tailChars，中间替换为回调生成的“省略 N 字”文本；长度足够时原样返回。
 */
function truncateMiddle(text, headChars, tailChars, formatOmitted) {
  if (text.length <= headChars + tailChars) return text;
  let head = headChars > 0 ? truncateToLength(text, headChars) : "";
  let tail = tailChars > 0 ? takeLastChars(text, tailChars) : "";
  return `${head}${formatOmitted(text.length - head.length - tail.length)}${tail}`;
}
//@ chunk-8824h7w7.js:1117-1218 layout
function repairUtf16(text) {
  if (typeof Buffer !== "undefined") return Buffer.from(text, "utf16le").toString("utf16le");
  return normalizeFullWidthDigits(text);
}
//@ chunk-8824h7w7.js:1218-1423 layout (2.1.88 match: normalizeFullWidthDigits, 1)
function normalizeFullWidthDigits(input) {
  let parts = [];
  for (let start = 0; start < input.length; start += 8192) {
    let min = Math.min(start + 8192, input.length);
    let uint16Array = new Uint16Array(min - start);
    for (let index = start; index < min; index++) uint16Array[index - start] = input.charCodeAt(index);
    parts.push(String.fromCharCode(...uint16Array));
  }
  return parts.join("");
}
//@ chunk-8824h7w7.js:1423-1816 layout
/**
 * 孤立 UTF-16 代理项模式（非全局版），用于一次性检测。
 */
var LONE_SURROGATE_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LONE_SURROGATE_GLOBAL_RE;
var isWellFormedNative;
var toWellFormedNative;
deferInit("chunk-8824h7w7.js:1423", () => {
  LONE_SURROGATE_PATTERN = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
  LONE_SURROGATE_GLOBAL_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
  isWellFormedNative =
    typeof String.prototype.isWellFormed === "function"
      ? Function.prototype.call.bind(String.prototype.isWellFormed)
      : undefined;
  toWellFormedNative =
    typeof String.prototype.toWellFormed === "function"
      ? Function.prototype.call.bind(String.prototype.toWellFormed)
      : undefined;
});
//@ chunk-8824h7w7.js:1816-1865 layout
/**
 * 字符串是否良构（无孤立 UTF-16 代理项）；优先用 String.prototype.isWellFormed。
 */
function isWellFormedString(text) {
  if (isWellFormedNative) return isWellFormedNative(text);
  return !LONE_SURROGATE_PATTERN.test(text);
}
//@ chunk-8824h7w7.js:1865-1926 file-local
/**
 * 把非良构 UTF-16（孤立代理）替换为 U+FFFD；有原生 toWellFormed 时直接用。
 */
function normalizeFullWidthSpace(input) {
  if (toWellFormedNative) return toWellFormedNative(input);
  return input.replace(LONE_SURROGATE_GLOBAL_RE, "\uFFFD");
}
//@ chunk-8824h7w7.js:1926-1984 layout
/**
 * 去掉字符串中的孤立代理项，得到良构字符串。
 */
function toWellFormedString(text) {
  if (isWellFormedNative && isWellFormedNative(text)) return text;
  return text.replace(LONE_SURROGATE_GLOBAL_RE, "");
}
//@ chunk-8824h7w7.js:1984-2400 layout
/**
 * 深度遍历数组/对象，把非良构字符串原地修复，返回是否有改动（发送 API 前清洗 JSON 用）。
 */
function repairMalformedStringsDeep(root) {
  let repaired = false;
  let pending = [root];
  while (pending.length > 0) {
    let current = pending.pop();
    if (Array.isArray(current))
      for (let index = 0; index < current.length; index++) {
        let item = current[index];
        if (typeof item === "string") {
          if (!isWellFormedString(item)) {
            current[index] = normalizeFullWidthSpace(item);
            repaired = true;
          }
        } else if (item !== null && typeof item === "object") pending.push(item);
      }
    else if (current !== null && typeof current === "object") {
      let object = current;
      for (let key of Object.keys(object)) {
        let value = object[key];
        if (typeof value === "string") {
          if (!isWellFormedString(value)) {
            object[key] = normalizeFullWidthSpace(value);
            repaired = true;
          }
        } else if (value !== null && typeof value === "object") pending.push(value);
      }
    }
  }
  return repaired;
}
//@ chunk-8824h7w7.js:2400-2797 layout
/**
 * 深度遍历判断结构中是否含非良构字符串。
 */
function containsMalformedStringDeep(root) {
  let pending = [root];
  while (pending.length > 0) {
    let current = pending.pop();
    if (Array.isArray(current))
      for (let j = 0; j < current.length; j++) {
        let item = current[j];
        if (typeof item === "string") {
          if (!isWellFormedString(item)) return true;
        } else if (item !== null && typeof item === "object") pending.push(item);
      }
    else if (current !== null && typeof current === "object") {
      let object = current;
      for (let key of Object.keys(object)) {
        let value = object[key];
        if (typeof value === "string") {
          if (!isWellFormedString(value)) return true;
        } else if (value !== null && typeof value === "object") pending.push(value);
      }
    }
  }
  return false;
}
//@ chunk-8824h7w7.js:2797-2862 file-local
/**
 * 返回字符串中第一个分隔符之前的部分（找不到分隔符时返回原串）。
 */
function firstLineOf(text, separator) {
  let index = text.indexOf(separator);
  return index === -1 ? text : text.slice(0, index);
}
//@ chunk-8824h7w7.js:2862-2948 layout
/**
 * 去掉末尾属于给定字符集合的字符（类似 trimEnd 指定字符）。
 */
function trimEndChars(text, chars) {
  let end = text.length;
  while (end > 0 && chars.includes(text[end - 1])) end--;
  return text.slice(0, end);
}
//@ chunk-8824h7w7.js:2948-3008 layout
/**
 * 若以前缀开头则去掉前缀。
 */
function stripPrefix(text, prefix) {
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}
//@ chunk-8824h7w7.js:3008-3077 layout
/**
 * 若以后缀结尾则去掉后缀。
 */
function stripSuffix(text, suffix) {
  return text.endsWith(suffix) ? text.slice(0, text.length - suffix.length) : text;
}
//@ chunk-8824h7w7.js:3077-3100 layout
var ASCII_ONLY_PATTERN = /^[\x00-\x7f]*$/;
//@ chunk-8824h7w7.js:3100-3230 layout
function compareStringsGrouped(left, right) {
  let matches = ASCII_ONLY_PATTERN.test(left);
  if (matches !== ASCII_ONLY_PATTERN.test(right)) return matches ? -1 : 1;
  if (matches) return left.localeCompare(right);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
//@ chunk-8824h7w7.js:3230-3262 layout
/**
 * 取第一行（firstLineOf(t, '\n')）。
 */
function getFirstLine(text) {
  return firstLineOf(
    text,
    `
`,
  );
}
//@ chunk-8824h7w7.js:3262-3353 file-local
/**
 * 统计字符（子串）在字符串中出现的次数，可指定起始位置。
 */
function countCharInString(str, char, start = 0) {
  let count = 0;
  let index = str.indexOf(char, start);
  while (index !== -1) {
    count++;
    index = str.indexOf(char, index + 1);
  }
  return count;
}
//@ chunk-8824h7w7.js:3353-3454 layout (2.1.88 match: normalizeFullWidthDigits, 1)
function normalizeFullWidthDigits_2(input) {
  return input.replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248));
}
//@ chunk-8824h7w7.js:3454-3504 layout
/**
 * 把全角空格 U+3000 换成普通空格。
 */
function replaceIdeographicSpace(input) {
  return input.replaceAll("\u3000", " ");
}
//@ chunk-8824h7w7.js:3504-3519 callgraph-witnessed (2.1.88 match: MAX_STRING_LENGTH, 0)
var MAX_STRING_LENGTH = 33554432;
//@ chunk-8824h7w7.js:3519-3738 fingerprint (2.1.88 match: safeJoinLines, 1)
function safeJoinLines(lines, delimiter = ",", maxSize = MAX_STRING_LENGTH) {
  let result = "";
  for (let line of lines) {
    let delimiterToAdd = result ? delimiter : "";
    let fullAddition = delimiterToAdd + line;
    if (result.length + fullAddition.length <= maxSize) result += fullAddition;
    else {
      let remainingSpace = maxSize - result.length - delimiterToAdd.length - 14;
      if (remainingSpace > 0) result += delimiterToAdd + line.slice(0, remainingSpace) + "...[truncated]";
      else result += "...[truncated]";
      return result;
    }
  }
  return result;
}
//@ chunk-8824h7w7.js:3738-4520 fingerprint (2.1.88 match: EndTruncatingAccumulator, 1)
/**
 * 有上限的字符串累加器：超过上限后丢弃后续内容并记录被截断的字节数（工具输出截断用）。
 */
class EndTruncatingAccumulator {
  maxSize;
  content = "";
  isTruncated = false;
  totalBytesReceived = 0;
  constructor(maxSize = MAX_STRING_LENGTH) {
    this.maxSize = maxSize;
  }
  append(data) {
    let str = typeof data === "string" ? data : data.toString();
    this.totalBytesReceived += str.length;
    if (this.isTruncated && this.content.length >= this.maxSize) return;
    if (this.content.length + str.length > this.maxSize) {
      let remainingSpace = this.maxSize - this.content.length;
      if (remainingSpace > 0) this.content += str.slice(0, remainingSpace);
      this.isTruncated = true;
    } else this.content += str;
  }
  toString() {
    if (!this.isTruncated) return this.content;
    let truncatedBytes = this.totalBytesReceived - this.maxSize;
    let truncatedKB = Math.round(truncatedBytes / 1024);
    return (
      this.content +
      `
... [output truncated - ${truncatedKB}KB removed]`
    );
  }
  clear() {
    this.content = "";
    this.isTruncated = false;
    this.totalBytesReceived = 0;
  }
  get length() {
    return this.content.length;
  }
  get truncated() {
    return this.isTruncated;
  }
  get totalBytes() {
    return this.totalBytesReceived;
  }
}
//@ chunk-8824h7w7.js:4520-4620 placement
function truncateToLines(text, maxLines) {
  let lines = text.split(`
`);
  if (lines.length <= maxLines) return text;
  return (
    lines.slice(0, maxLines).join(`
`) + "\u2026"
  );
}
//@ chunk-8824h7w7.js:4620-4723 placement
/**
 * 截断字符串并附上被截掉的字符数。
 */
function truncateWithCount(text, maxLength) {
  if (text.length <= maxLength) return text;
  let truncated = truncateToLength(text, maxLength);
  return `${truncated}\u2026 [+${text.length - truncated.length} chars]`;
}
//@ chunk-8824h7w7.js:4723-4879 placement
/**
 * 在单词边界截断字符串并加省略号（边界太靠前时直接截断）。
 */
function truncateAtWord(text, maxLength) {
  if (text.length <= maxLength) return text;
  let truncated = truncateToLength(text, maxLength - 1);
  let lastSpace = truncated.search(/\s\S*$/);
  let wordEnd = lastSpace === -1 ? "" : truncated.slice(0, lastSpace).trimEnd();
  return `${wordEnd.length > maxLength / 2 ? wordEnd : truncated.trimEnd()}\u2026`;
}
//@ chunk-8824h7w7.js:4879-5025 placement
/**
 * 控制字符正则（除换行类空白、全部控制字符）与 Windows 保留设备名正则。
 */
var CONTROL_CHARS_EXCEPT_WS_RE = /[\x00-\x08\x0E-\x1F\x7F-\x9F]/g;
var ANY_CONTROL_CHAR_RE = /[\x00-\x1F\x7F-\x9F]/;
var WINDOWS_RESERVED_NAME_RE = /^(con|prn|aux|nul|com[0-9\u00B9\u00B2\u00B3]|lpt[0-9\u00B9\u00B2\u00B3])$/;
//@ chunk-8824h7w7.js:5025-5091 placement
/**
 * 去控制字符、压缩空白并 trim。
 */
function collapseWhitespace(text) {
  return text.replace(CONTROL_CHARS_EXCEPT_WS_RE, "").replace(/\s+/g, " ").trim();
}
//@ chunk-8824h7w7.js:5091-5166 placement
var LINE_BREAK_RE; // deferred: uses CONTROL_CHARS_EXCEPT_WS_RE of its import cycle while loading; runs once the cycle is complete
var regExp;
deferInit("chunk-8824h7w7.js:5091", () => {
  LINE_BREAK_RE = /[\t\n\v\f\r\u2028\u2029]/g;
  regExp = new RegExp(`${CONTROL_CHARS_EXCEPT_WS_RE.source}|${LINE_BREAK_RE.source}`);
});
//@ chunk-8824h7w7.js:5166-5244 placement
/**
 * 若含控制/行分隔字符则替换为空格。
 */
function stripLineBreaks(displayText) {
  if (!regExp.test(displayText)) return displayText;
  return displayText.replace(CONTROL_CHARS_EXCEPT_WS_RE, "").replace(LINE_BREAK_RE, " ");
}
//@ chunk-8824h7w7.js:5244-5349 placement
/**
 * 去掉控制、格式、代理与默认可忽略字符及行/段分隔符。
 */
function stripFormatChars(text) {
  return text.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}\u2028\u2029]/gu, "");
}
//@ chunk-8824h7w7.js:5349-5550 placement
var ANSI_ESCAPE_RE =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?(?:\u0007|\u001B\u005C|\u009C))|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
//@ chunk-8824h7w7.js:5550-5635 placement
/**
 * 转成良构字符串并去掉 ANSI 与控制/格式字符。
 */
function printableText(text) {
  return toWellFormedString(text)
    .replace(ANSI_ESCAPE_RE, "")
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, "");
}
//@ chunk-8824h7w7.js:5635-6366 placement
/**
 * 把控制字符、格式字符和默认可忽略码点转成可见形式（ESC→␛、C0→␀ 系列、DEL→␡，其余 \u{…}），保留换行/Tab 以及 emoji 序列中必需的变体选择符、ZWJ 与标签字符。
 */
function escapeControlChars(text) {
  let controlPattern = /[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\u2028\u2029]/gu;
  if (!controlPattern.test(text)) return text;
  let out = "";
  for (let { segment } of new Intl.Segmenter(undefined, {
    granularity: "grapheme",
  }).segment(text)) {
    let matches = /\p{Extended_Pictographic}|\p{Regional_Indicator}|^[#*0-9]\uFE0F?\u20E3$/u.test(segment);
    let matches_2 = /^\u{1F3F4}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,6}\u{E007F}$/u.test(segment);
    controlPattern.lastIndex = 0;
    out += segment.replace(controlPattern, (char, offset) => {
      if (
        char ===
          `
` ||
        char === "\t"
      )
        return char;
      let codePoint = char.codePointAt(0) ?? 0;
      if (
        matches &&
        (char === "\uFE0F" ||
          char === "\uFE0E" ||
          char === "\u20E3" ||
          (char === "\u200D" && offset + char.length < segment.length) ||
          (matches_2 && codePoint >= 917536 && codePoint <= 917631))
      )
        return char;
      if (codePoint === 27) return "\u241B";
      if (codePoint < 32) return String.fromCodePoint(9216 + codePoint);
      if (codePoint === 127) return "\u2421";
      return `\\u{${codePoint.toString(16).toUpperCase()}}`;
    });
  }
  return out;
}
//@ chunk-8824h7w7.js:6366-6442 placement
/**
 * 把控制字符转成可见符号，换行/制表符转 ␤/␉。
 */
function escapeControlCharsForDisplay(text) {
  return escapeControlChars(text).replace(/\n/g, "\u2424").replace(/\t/g, "\u2409");
}
//@ chunk-8824h7w7.js:6442-6515 placement
/**
 * 取首行可打印文本并按 200 字符截断。
 */
function oneLineClipped(text) {
  let firstLine = printableText(getFirstLine(text));
  return firstLine.length > 200 ? `${truncateToLength(firstLine, 200)}\u2026` : firstLine;
}
//@ chunk-8824h7w7.js:6515-6550 placement
/**
 * 清洗后按长度截断。
 */
function clippedMessage(text, maxLength) {
  return truncateToLength(cleanForDisplay(text), maxLength);
}
//@ chunk-8824h7w7.js:6550-6603 placement
/**
 * 去 ANSI、控制字符并压缩空白的一行文本。
 */
function cleanForDisplay(text) {
  return stripFormatChars(collapseWhitespace(text.replace(ANSI_ESCAPE_RE, ""))).trim();
}
//@ chunk-8824h7w7.js:6603-6611 placement
var MAX_COERCE_DEPTH = 8;
//@ chunk-8824h7w7.js:6611-7014 placement
/**
 * 把值按 JS 字符串转换规则转成字符串：字符串/数字/布尔直接转换，数组递归用逗号连接（限深度），普通对象为 [object Object]，其他返回 undefined。
 */
function coerceToPlainString(value, depth = 0) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (depth >= MAX_COERCE_DEPTH) return;
    let parts = [];
    for (let item of value) {
      let converted = item === null || item === undefined ? "" : coerceToPlainString(item, depth + 1);
      if (converted === undefined) return;
      parts.push(converted);
    }
    return parts.join(",");
  }
  return typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype &&
    !Object.hasOwn(value, "toString")
    ? "[object Object]"
    : undefined;
}
//@ chunk-8824h7w7.js:7014-7026 placement
/**
 * 截断提示的默认字符上限（500）。
 */
var MAX_CLIP_CHARS = 500;
//@ chunk-8824h7w7.js:7026-7331 placement
/**
 * 按 UTF-8 字节数截断字符串（不切断字符），长度一定不超限时直接返回原串。
 */
function truncateUtf8Bytes(text, maxBytes) {
  if (text.length * 3 <= maxBytes) return text;
  let textEncoder = new TextEncoder();
  let uint8Array = new Uint8Array(Math.max(0, Math.min(maxBytes, 4194304)));
  let writtenBytes = 0;
  let readChars = 0;
  while (readChars < text.length) {
    let remainingBytes = maxBytes - writtenBytes;
    if (remainingBytes <= 0) break;
    let target = remainingBytes < uint8Array.length ? uint8Array.subarray(0, remainingBytes) : uint8Array;
    let { read, written } = textEncoder.encodeInto(text.slice(readChars), target);
    if (read === 0) break;
    readChars += read;
    writtenBytes += written;
  }
  return readChars >= text.length ? text : text.slice(0, readChars);
}
//@ chunk-8824h7w7.js:7331-7498 placement
/**
 * 用足够长的反引号围栏包裹代码块（比内容中最长的反引号串多一个，至少 3 个），可带语言标记。
 */
function fenceCodeBlock(code, language = "") {
  let reduced = (code.match(/`+/g) ?? []).reduce((acc, run) => Math.max(acc, run.length), 0);
  let fence = "`".repeat(Math.max(3, reduced + 1));
  return `${fence}${language.replace(/[`\s].*$/s, "")}
${code}
${fence}`;
}
//@ chunk-8824h7w7.js:7498-7525 placement
/**
 * 已以省略号结尾的文本模式。
 */
var TRAILING_ELLIPSIS_RE = /(\u2026|\.\.\.)$/;
//@ chunk-z20c443b.js:141322-141377 placement (2.1.88 match: setCwdState, 1)
/**
 * NFC 规范化后转小写，用于大小写不敏感的名字/路径比较（被 50 多处使用）。
 */
function nfcLower(cwd) {
  return cwd.normalize("NFC").toLowerCase();
}
//@ chunk-7kayq7nc.js:824228-824313 placement
function stripControlCharsTruncated(text) {
  return [...text.replace(/[\x00-\x1f\x7f-\x9f]/g, "")].slice(0, MAX_SEED_NAME_CHARS).join("");
}
//@ chunk-7kayq7nc.js:824313-824359 placement
function sanitizeSessionTitle(title) {
  return stripControlCharsTruncated(replaceControlChars(title.trim())).trim();
}
export {
  firstLineOf,
  trimEndChars,
  plural,
  urlPatternToRegex,
  countCharInString,
  truncateUtf8Bytes,
  truncateToLength,
  countCodePoints,
  CONTROL_CHARS_EXCEPT_WS_RE,
  containsMalformedStringDeep,
  repairMalformedStringsDeep,
  getFirstLine,
  sanitizeSessionTitle,
  capitalize,
  cleanForDisplay,
  stripLineBreaks,
  isWellFormedString,
  normalizeFullWidthSpace,
  toWellFormedString,
  collapseWhitespace,
  truncateWithCount,
  clippedMessage,
  truncateCodePoints,
  escapeControlChars,
  escapeControlCharsForDisplay,
  nfcLower,
  replaceIdeographicSpace,
  takeLastChars,
  stripPrefix,
  truncateAtWord,
  compareStringsGrouped,
  repeatString,
  ANY_CONTROL_CHAR_RE,
  stripSuffix,
  MAX_CLIP_CHARS,
  WINDOWS_RESERVED_NAME_RE,
  repairUtf16,
  oneLineClipped,
  EndTruncatingAccumulator,
  safeJoinLines,
  printableText,
  truncateMiddle,
  stripFormatChars,
  fenceCodeBlock,
  TRAILING_ELLIPSIS_RE,
  truncateToLines,
  normalizeFullWidthDigits_2,
  coerceToPlainString,
};
