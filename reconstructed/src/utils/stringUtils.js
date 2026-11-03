/**
 * utils/stringUtils.ts
 *
 * 字符串工具：截断（UTF-16 安全、中间截断）、前后缀、良构字符串修复、plural、首行；另混入 deniedModels 条目解析与标签中和代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/stringUtils.ts
 * pieces: chunk-ae5g0zb5.js (1), chunk-bwbq4xvm.js (2), chunk-dcmhvw5a.js (1), chunk-m41h77x8.js (51)
 * attribution: fingerprint 4, placement 26, layout 20, callgraph-witnessed 2, file-local 3
 */
import { MAX_SEED_NAME_CHARS } from "./swarm/teammateIds.js";
import { replaceControlChars } from "./resultError.js";
import { isPlainObjectNonArray } from "../plugins/bundled/claudeTest/appFacts.js";
import { APP_STATE_LABELS } from "../plugins/bundled/claudeTest/runState.js";

//@ chunk-m41h77x8.js:191-253 placement = joinContinuationLines (0.701)
/**
 * 把字符串重复 n 次（n 非有限或不大于 0 时视为 0）。旧版名 joinContinuationLines 误配，属第三方或通用工具。
 */
function repeatString(t, n) {
  return t.repeat(Number.isFinite(n) && n > 0 ? n : 0);
}
//@ chunk-m41h77x8.js:253-315 placement = urlPatternToRegex (1)
function urlPatternToRegex(pattern) {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
//@ chunk-m41h77x8.js:315-374 layout = capitalize (1)
/**
 * 首字母大写。
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
//@ chunk-m41h77x8.js:374-415 callgraph-witnessed = plural (0)
/**
 * 按数量选单复数：n===1 用单数，否则用复数（默认单数加 s）。
 */
function plural(n_2, word, pluralWord = word + "s") {
  return n_2 === 1 ? word : pluralWord;
}
//@ chunk-m41h77x8.js:415-588 layout
/**
 * 按码点统计字符串长度（代理对计 1）。
 */
function countCodePoints(t) {
  let n = 0;
  for (let j = 0; j < t.length; j++) {
    let code = t.charCodeAt(j);
    if (code >= 55296 && code <= 56319 && j + 1 < t.length) {
      let code = t.charCodeAt(j + 1);
      if (code >= 56320 && code <= 57343) j++;
    }
    n++;
  }
  return n;
}
//@ chunk-m41h77x8.js:588-703 layout
/**
 * 按码点截断到 n 个字符。
 */
function truncateCodePoints(t, n) {
  if (t.length <= n) return t;
  let e = [];
  for (let r of t) {
    if (e.length >= n) break;
    e.push(r);
  }
  return e.join("");
}
//@ chunk-m41h77x8.js:703-847 layout
/**
 * 截断到 n 个 UTF-16 单元，切点落在代理对中间时少取一个，保证结果良构。
 */
function truncateToLength(t, n) {
  if (n <= 0) return "";
  if (t.length <= n) return t;
  let sliced = t.slice(0, n);
  let code = sliced.charCodeAt(n - 1);
  return repairUtf16(code >= 55296 && code <= 56319 ? sliced.slice(0, -1) : sliced);
}
//@ chunk-m41h77x8.js:847-985 layout
/**
 * 取末尾 n 个 UTF-16 单元，起点落在低代理项时跳过一个。
 */
function takeLastChars(t, n) {
  if (n <= 0) return "";
  if (t.length <= n) return t;
  let sliced = t.slice(-n);
  let code = sliced.charCodeAt(0);
  return repairUtf16(code >= 56320 && code <= 57343 ? sliced.slice(1) : sliced);
}
//@ chunk-m41h77x8.js:985-1120 layout
/**
 * 中间截断：保留开头 headChars 与结尾 tailChars，中间替换为回调生成的“省略 N 字”文本；长度足够时原样返回。
 */
function truncateMiddle(t, headChars, tailChars, formatOmitted) {
  if (t.length <= headChars + tailChars) return t;
  let i = headChars > 0 ? truncateToLength(t, headChars) : "";
  let o = tailChars > 0 ? takeLastChars(t, tailChars) : "";
  return `${i}${formatOmitted(t.length - i.length - o.length)}${o}`;
}
//@ chunk-m41h77x8.js:1120-1221 layout
function repairUtf16(t) {
  if (typeof Buffer !== "undefined") return Buffer.from(t, "utf16le").toString("utf16le");
  return normalizeFullWidthDigits(t);
}
//@ chunk-m41h77x8.js:1221-1426 fingerprint = normalizeFullWidthDigits (1)
function normalizeFullWidthDigits(input) {
  let e = [];
  for (let r = 0; r < input.length; r += 8192) {
    let min = Math.min(r + 8192, input.length);
    let uint16Array = new Uint16Array(min - r);
    for (let s = r; s < min; s++) uint16Array[s - r] = input.charCodeAt(s);
    e.push(String.fromCharCode(...uint16Array));
  }
  return e.join("");
}
//@ chunk-m41h77x8.js:1426-1819 layout
/**
 * 孤立 UTF-16 代理项模式（非全局版），用于一次性检测。
 */
var LONE_SURROGATE_PATTERN = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
var LONE_SURROGATE_GLOBAL_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
var isWellFormedNative =
  typeof String.prototype.isWellFormed === "function"
    ? Function.prototype.call.bind(String.prototype.isWellFormed)
    : undefined;
var toWellFormedNative =
  typeof String.prototype.toWellFormed === "function"
    ? Function.prototype.call.bind(String.prototype.toWellFormed)
    : undefined;
//@ chunk-m41h77x8.js:1819-1868 layout
/**
 * 字符串是否良构（无孤立 UTF-16 代理项）；优先用 String.prototype.isWellFormed。
 */
function isWellFormedString(t) {
  if (isWellFormedNative) return isWellFormedNative(t);
  return !LONE_SURROGATE_PATTERN.test(t);
}
//@ chunk-m41h77x8.js:1868-1929 file-local
/**
 * 把非良构 UTF-16（孤立代理）替换为 U+FFFD；有原生 toWellFormed 时直接用。
 */
function normalizeFullWidthSpace(input) {
  if (toWellFormedNative) return toWellFormedNative(input);
  return input.replace(LONE_SURROGATE_GLOBAL_RE, "\uFFFD");
}
//@ chunk-m41h77x8.js:1929-1987 layout
/**
 * 去掉字符串中的孤立代理项，得到良构字符串。
 */
function toWellFormedString(t) {
  if (isWellFormedNative && isWellFormedNative(t)) return t;
  return t.replace(LONE_SURROGATE_GLOBAL_RE, "");
}
//@ chunk-m41h77x8.js:1987-2403 layout
/**
 * 深度遍历数组/对象，把非良构字符串原地修复，返回是否有改动（发送 API 前清洗 JSON 用）。
 */
function repairMalformedStringsDeep(t) {
  let n = false;
  let e = [t];
  while (e.length > 0) {
    let r = e.pop();
    if (Array.isArray(r))
      for (let i = 0; i < r.length; i++) {
        let o = r[i];
        if (typeof o === "string") {
          if (!isWellFormedString(o)) {
            r[i] = normalizeFullWidthSpace(o);
            n = true;
          }
        } else if (o !== null && typeof o === "object") e.push(o);
      }
    else if (r !== null && typeof r === "object") {
      let i = r;
      for (let key of Object.keys(i)) {
        let s = i[key];
        if (typeof s === "string") {
          if (!isWellFormedString(s)) {
            i[key] = normalizeFullWidthSpace(s);
            n = true;
          }
        } else if (s !== null && typeof s === "object") e.push(s);
      }
    }
  }
  return n;
}
//@ chunk-m41h77x8.js:2403-2800 layout
/**
 * 深度遍历判断结构中是否含非良构字符串。
 */
function containsMalformedStringDeep(t) {
  let n = [t];
  while (n.length > 0) {
    let e = n.pop();
    if (Array.isArray(e))
      for (let j = 0; j < e.length; j++) {
        let i = e[j];
        if (typeof i === "string") {
          if (!isWellFormedString(i)) return true;
        } else if (i !== null && typeof i === "object") n.push(i);
      }
    else if (e !== null && typeof e === "object") {
      let r = e;
      for (let key of Object.keys(r)) {
        let o = r[key];
        if (typeof o === "string") {
          if (!isWellFormedString(o)) return true;
        } else if (o !== null && typeof o === "object") n.push(o);
      }
    }
  }
  return false;
}
//@ chunk-m41h77x8.js:2800-2865 file-local
/**
 * 返回字符串中第一个分隔符之前的部分（找不到分隔符时返回原串）。
 */
function firstLineOf(t, n) {
  let index = t.indexOf(n);
  return index === -1 ? t : t.slice(0, index);
}
//@ chunk-m41h77x8.js:2865-2952 layout
/**
 * 去掉末尾属于给定字符集合的字符（类似 trimEnd 指定字符）。
 */
function trimEndChars(t, chars) {
  let e = t.length;
  while (e > 0 && chars.includes(t[e - 1])) e--;
  return t.slice(0, e);
}
//@ chunk-m41h77x8.js:2952-3012 layout
/**
 * 若以前缀开头则去掉前缀。
 */
function stripPrefix(t, n) {
  return t.startsWith(n) ? t.slice(n.length) : t;
}
//@ chunk-m41h77x8.js:3012-3081 layout
/**
 * 若以后缀结尾则去掉后缀。
 */
function stripSuffix(t, n) {
  return t.endsWith(n) ? t.slice(0, t.length - n.length) : t;
}
//@ chunk-m41h77x8.js:3081-3104 layout
var ASCII_ONLY_PATTERN = /^[\x00-\x7f]*$/;
//@ chunk-m41h77x8.js:3104-3234 layout
function compareStringsGrouped(t, n) {
  let matches = ASCII_ONLY_PATTERN.test(t);
  if (matches !== ASCII_ONLY_PATTERN.test(n)) return matches ? -1 : 1;
  if (matches) return t.localeCompare(n);
  if (t === n) return 0;
  return t < n ? -1 : 1;
}
//@ chunk-m41h77x8.js:3234-3266 layout
/**
 * 取第一行（firstLineOf(t, '\n')）。
 */
function getFirstLine(t) {
  return firstLineOf(
    t,
    `
`,
  );
}
//@ chunk-m41h77x8.js:3266-3357 file-local
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
//@ chunk-m41h77x8.js:3357-3458 layout = normalizeFullWidthDigits (1)
function normalizeFullWidthDigits_2(input) {
  return input.replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248));
}
//@ chunk-m41h77x8.js:3458-3507 layout
/**
 * 把全角空格 U+3000 换成普通空格。
 */
function replaceIdeographicSpace(input) {
  return input.replaceAll("\u3000", " ");
}
//@ chunk-m41h77x8.js:3507-3522 callgraph-witnessed = MAX_STRING_LENGTH (0)
var MAX_STRING_LENGTH = 33554432;
//@ chunk-m41h77x8.js:3522-3741 fingerprint = safeJoinLines (1)
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
//@ chunk-m41h77x8.js:3741-4523 fingerprint = EndTruncatingAccumulator (1)
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
//@ chunk-m41h77x8.js:4523-4623 placement
function truncateToLines(text, maxLines) {
  let lines = text.split(`
`);
  if (lines.length <= maxLines) return text;
  return (
    lines.slice(0, maxLines).join(`
`) + "\u2026"
  );
}
//@ chunk-m41h77x8.js:4623-4727 placement
/**
 * 截断字符串并附上被截掉的字符数。
 */
function truncateWithCount(t, n) {
  if (t.length <= n) return t;
  let e = truncateToLength(t, n);
  return `${e}\u2026 [+${t.length - e.length} chars]`;
}
//@ chunk-m41h77x8.js:4727-4884 placement
/**
 * 在单词边界截断字符串并加省略号（边界太靠前时直接截断）。
 */
function truncateAtWord(t, n) {
  if (t.length <= n) return t;
  let e = truncateToLength(t, n - 1);
  let r = e.search(/\s\S*$/);
  let i = r === -1 ? "" : e.slice(0, r).trimEnd();
  return `${i.length > n / 2 ? i : e.trimEnd()}\u2026`;
}
//@ chunk-m41h77x8.js:4884-5030 placement
/**
 * 控制字符正则（除换行类空白、全部控制字符）与 Windows 保留设备名正则。
 */
var CONTROL_CHARS_EXCEPT_WS_RE = /[\x00-\x08\x0E-\x1F\x7F-\x9F]/g;
var ANY_CONTROL_CHAR_RE = /[\x00-\x1F\x7F-\x9F]/;
var WINDOWS_RESERVED_NAME_RE = /^(con|prn|aux|nul|com[0-9\u00B9\u00B2\u00B3]|lpt[0-9\u00B9\u00B2\u00B3])$/;
//@ chunk-m41h77x8.js:5030-5096 placement
/**
 * 去控制字符、压缩空白并 trim。
 */
function collapseWhitespace(t) {
  return t.replace(CONTROL_CHARS_EXCEPT_WS_RE, "").replace(/\s+/g, " ").trim();
}
//@ chunk-m41h77x8.js:5096-5171 placement
var LINE_BREAK_RE = /[\t\n\v\f\r\u2028\u2029]/g;
var regExp = new RegExp(`${CONTROL_CHARS_EXCEPT_WS_RE.source}|${LINE_BREAK_RE.source}`);
//@ chunk-m41h77x8.js:5171-5249 placement
/**
 * 若含控制/行分隔字符则替换为空格。
 */
function stripLineBreaks(displayText) {
  if (!regExp.test(displayText)) return displayText;
  return displayText.replace(CONTROL_CHARS_EXCEPT_WS_RE, "").replace(LINE_BREAK_RE, " ");
}
//@ chunk-m41h77x8.js:5249-5354 placement
/**
 * 去掉控制、格式、代理与默认可忽略字符及行/段分隔符。
 */
function stripFormatChars(t) {
  return t.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}\u2028\u2029]/gu, "");
}
//@ chunk-m41h77x8.js:5354-5555 placement
var ANSI_ESCAPE_RE =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?(?:\u0007|\u001B\u005C|\u009C))|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
//@ chunk-m41h77x8.js:5555-5640 placement
/**
 * 转成良构字符串并去掉 ANSI 与控制/格式字符。
 */
function printableText(t) {
  return toWellFormedString(t)
    .replace(ANSI_ESCAPE_RE, "")
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, "");
}
//@ chunk-m41h77x8.js:5640-6371 placement
/**
 * 把控制字符、格式字符和默认可忽略码点转成可见形式（ESC→␛、C0→␀ 系列、DEL→␡，其余 \u{…}），保留换行/Tab 以及 emoji 序列中必需的变体选择符、ZWJ 与标签字符。
 */
function escapeControlChars(t) {
  let n = /[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\u2028\u2029]/gu;
  if (!n.test(t)) return t;
  let e = "";
  for (let { segment } of new Intl.Segmenter(undefined, {
    granularity: "grapheme",
  }).segment(t)) {
    let matches = /\p{Extended_Pictographic}|\p{Regional_Indicator}|^[#*0-9]\uFE0F?\u20E3$/u.test(segment);
    let matches_2 = /^\u{1F3F4}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,6}\u{E007F}$/u.test(segment);
    n.lastIndex = 0;
    e += segment.replace(n, (s, c) => {
      if (
        s ===
          `
` ||
        s === "\t"
      )
        return s;
      let u = s.codePointAt(0) ?? 0;
      if (
        matches &&
        (s === "\uFE0F" ||
          s === "\uFE0E" ||
          s === "\u20E3" ||
          (s === "\u200D" && c + s.length < segment.length) ||
          (matches_2 && u >= 917536 && u <= 917631))
      )
        return s;
      if (u === 27) return "\u241B";
      if (u < 32) return String.fromCodePoint(9216 + u);
      if (u === 127) return "\u2421";
      return `\\u{${u.toString(16).toUpperCase()}}`;
    });
  }
  return e;
}
//@ chunk-m41h77x8.js:6371-6447 placement
/**
 * 把控制字符转成可见符号，换行/制表符转 ␤/␉。
 */
function escapeControlCharsForDisplay(t) {
  return escapeControlChars(t).replace(/\n/g, "\u2424").replace(/\t/g, "\u2409");
}
//@ chunk-m41h77x8.js:6447-6521 placement
/**
 * 取首行可打印文本并按 200 字符截断。
 */
function oneLineClipped(t) {
  let n = printableText(getFirstLine(t));
  return n.length > 200 ? `${truncateToLength(n, 200)}\u2026` : n;
}
//@ chunk-m41h77x8.js:6521-6557 placement
/**
 * 清洗后按长度截断。
 */
function clippedMessage(t, n) {
  return truncateToLength(cleanForDisplay(t), n);
}
//@ chunk-m41h77x8.js:6557-6610 placement
/**
 * 去 ANSI、控制字符并压缩空白的一行文本。
 */
function cleanForDisplay(t) {
  return stripFormatChars(collapseWhitespace(t.replace(ANSI_ESCAPE_RE, ""))).trim();
}
//@ chunk-m41h77x8.js:6610-6618 placement
var MAX_COERCE_DEPTH = 8;
//@ chunk-m41h77x8.js:6618-7021 placement
/**
 * 把值按 JS 字符串转换规则转成字符串：字符串/数字/布尔直接转换，数组递归用逗号连接（限深度），普通对象为 [object Object]，其他返回 undefined。
 */
function coerceToPlainString(t, n = 0) {
  if (typeof t === "string") return t;
  if (typeof t === "number" || typeof t === "boolean") return String(t);
  if (Array.isArray(t)) {
    if (n >= MAX_COERCE_DEPTH) return;
    let e = [];
    for (let r of t) {
      let i = r === null || r === undefined ? "" : coerceToPlainString(r, n + 1);
      if (i === undefined) return;
      e.push(i);
    }
    return e.join(",");
  }
  return typeof t === "object" &&
    t !== null &&
    Object.getPrototypeOf(t) === Object.prototype &&
    !Object.hasOwn(t, "toString")
    ? "[object Object]"
    : undefined;
}
//@ chunk-m41h77x8.js:7021-7033 placement
/**
 * 截断提示的默认字符上限（500）。
 */
var MAX_CLIP_CHARS = 500;
//@ chunk-m41h77x8.js:7033-7338 placement
/**
 * 按 UTF-8 字节数截断字符串（不切断字符），长度一定不超限时直接返回原串。
 */
function truncateUtf8Bytes(t, n) {
  if (t.length * 3 <= n) return t;
  let textEncoder = new TextEncoder();
  let uint8Array = new Uint8Array(Math.max(0, Math.min(n, 4194304)));
  let i = 0;
  let o = 0;
  while (o < t.length) {
    let s = n - i;
    if (s <= 0) break;
    let c = s < uint8Array.length ? uint8Array.subarray(0, s) : uint8Array;
    let { read, written } = textEncoder.encodeInto(t.slice(o), c);
    if (read === 0) break;
    o += read;
    i += written;
  }
  return o >= t.length ? t : t.slice(0, o);
}
//@ chunk-m41h77x8.js:7338-7505 placement
/**
 * 用足够长的反引号围栏包裹代码块（比内容中最长的反引号串多一个，至少 3 个），可带语言标记。
 */
function fenceCodeBlock(t, n = "") {
  let reduced = (t.match(/`+/g) ?? []).reduce((acc, o) => Math.max(acc, o.length), 0);
  let r = "`".repeat(Math.max(3, reduced + 1));
  return `${r}${n.replace(/[`\s].*$/s, "")}
${t}
${r}`;
}
//@ chunk-m41h77x8.js:7505-7532 placement
/**
 * 已以省略号结尾的文本模式。
 */
var TRAILING_ELLIPSIS_RE = /(\u2026|\.\.\.)$/;
//@ chunk-bwbq4xvm.js:775124-775209 placement
function stripControlCharsTruncated(e) {
  return [...e.replace(/[\x00-\x1f\x7f-\x9f]/g, "")].slice(0, MAX_SEED_NAME_CHARS).join("");
}
//@ chunk-bwbq4xvm.js:775209-775255 placement
function sanitizeSessionTitle(e) {
  return stripControlCharsTruncated(replaceControlChars(e.trim())).trim();
}
//@ chunk-ae5g0zb5.js:38606-39033 fingerprint = capitalize (1)
function capitalize_2(e, n) {
  let r = null;
  try {
    r = e === undefined ? null : JSON.parse(e);
  } catch {
    r = null;
  }
  let o = isPlainObjectNonArray(r) ? r.name : null;
  let s =
    typeof o === "string" &&
    o.length <= 214 &&
    /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(o)
      ? o
      : null;
  let a = n.length <= 214 && /^[A-Za-z0-9][A-Za-z0-9-._~]*$/.test(n) ? n : null;
  let trimmed = (s ?? a ?? "")
    .replace(/^@[^/]*\//, "")
    .replace(/[-._~]+/g, " ")
    .trim()
    .slice(0, 30)
    .trim();
  let c = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return APP_STATE_LABELS.test(c) ? c : null;
}
//@ chunk-dcmhvw5a.js:141176-141231 placement = setCwdState (1)
/**
 * NFC 规范化后转小写，用于大小写不敏感的名字/路径比较（被 50 多处使用）。
 */
function nfcLower(cwd) {
  return cwd.normalize("NFC").toLowerCase();
}
export {
  firstLineOf,
  plural,
  countCharInString,
  truncateToLength,
  urlPatternToRegex,
  collapseWhitespace,
  cleanForDisplay,
  clippedMessage,
  MAX_CLIP_CHARS,
  isWellFormedString,
  countCodePoints,
  truncateWithCount,
  getFirstLine,
  sanitizeSessionTitle,
  trimEndChars,
  capitalize,
  repairMalformedStringsDeep,
  repeatString,
  compareStringsGrouped,
  oneLineClipped,
  stripPrefix,
  takeLastChars,
  toWellFormedString,
  TRAILING_ELLIPSIS_RE,
  normalizeFullWidthSpace,
  stripSuffix,
  ANY_CONTROL_CHAR_RE,
  truncateCodePoints,
  truncateToLines,
  normalizeFullWidthDigits_2,
  printableText,
  CONTROL_CHARS_EXCEPT_WS_RE,
  containsMalformedStringDeep,
  truncateAtWord,
  nfcLower,
  stripFormatChars,
  truncateUtf8Bytes,
  escapeControlCharsForDisplay,
  EndTruncatingAccumulator,
  truncateMiddle,
  WINDOWS_RESERVED_NAME_RE,
  stripLineBreaks,
  capitalize_2,
  escapeControlChars,
  coerceToPlainString,
  safeJoinLines,
  repairUtf16,
  replaceIdeographicSpace,
  fenceCodeBlock,
};
