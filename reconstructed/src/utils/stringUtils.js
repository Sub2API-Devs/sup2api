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
import { ND } from "./swarm/teammateIds.js";
import { replaceControlChars } from "./resultError.js";
import { G } from "../plugins/bundled/claudeTest/appFacts.js";
import { Er } from "../plugins/bundled/claudeTest/runState.js";

/**
 * 把字符串重复 n 次（n 非有限或不大于 0 时视为 0）。旧版名 joinContinuationLines 误配，属第三方或通用工具。
 */
//@ chunk-m41h77x8.js:191-253 placement = joinContinuationLines (0.701)
function repeatString(t, n) {
  return t.repeat(Number.isFinite(n) && n > 0 ? n : 0);
}
//@ chunk-m41h77x8.js:253-315 placement = urlPatternToRegex (1)
function urlPatternToRegex(pattern) {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * 首字母大写。
 */
//@ chunk-m41h77x8.js:315-374 layout = capitalize (1)
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * 按数量选单复数：n===1 用单数，否则用复数（默认单数加 s）。
 */
//@ chunk-m41h77x8.js:374-415 callgraph-witnessed = plural (0)
function plural(n_2, word, pluralWord = word + "s") {
  return n_2 === 1 ? word : pluralWord;
}
/**
 * 按码点统计字符串长度（代理对计 1）。
 */
//@ chunk-m41h77x8.js:415-588 layout
function countCodePoints(t) {
  let n = 0;
  for (let e = 0; e < t.length; e++) {
    let code = t.charCodeAt(e);
    if (code >= 55296 && code <= 56319 && e + 1 < t.length) {
      let code = t.charCodeAt(e + 1);
      if (code >= 56320 && code <= 57343) e++;
    }
    n++;
  }
  return n;
}
/**
 * 按码点截断到 n 个字符。
 */
//@ chunk-m41h77x8.js:588-703 layout
function truncateCodePoints(t, n) {
  if (t.length <= n) return t;
  let e = [];
  for (let r of t) {
    if (e.length >= n) break;
    e.push(r);
  }
  return e.join("");
}
/**
 * 截断到 n 个 UTF-16 单元，切点落在代理对中间时少取一个，保证结果良构。
 */
//@ chunk-m41h77x8.js:703-847 layout
function truncateToLength(t, n) {
  if (n <= 0) return "";
  if (t.length <= n) return t;
  let sliced = t.slice(0, n),
    code = sliced.charCodeAt(n - 1);
  return repairUtf16(code >= 55296 && code <= 56319 ? sliced.slice(0, -1) : sliced);
}
/**
 * 取末尾 n 个 UTF-16 单元，起点落在低代理项时跳过一个。
 */
//@ chunk-m41h77x8.js:847-985 layout
function takeLastChars(t, n) {
  if (n <= 0) return "";
  if (t.length <= n) return t;
  let sliced = t.slice(-n),
    code = sliced.charCodeAt(0);
  return repairUtf16(code >= 56320 && code <= 57343 ? sliced.slice(1) : sliced);
}
/**
 * 中间截断：保留开头 headChars 与结尾 tailChars，中间替换为回调生成的“省略 N 字”文本；长度足够时原样返回。
 */
//@ chunk-m41h77x8.js:985-1120 layout
function truncateMiddle(t, headChars, tailChars, formatOmitted) {
  if (t.length <= headChars + tailChars) return t;
  let i = headChars > 0 ? truncateToLength(t, headChars) : "",
    o = tailChars > 0 ? takeLastChars(t, tailChars) : "";
  return `${i}${formatOmitted(t.length - i.length - o.length)}${o}`;
}
//@ chunk-m41h77x8.js:1120-1221 layout
function repairUtf16(t) {
  if (typeof Buffer < "u") return Buffer.from(t, "utf16le").toString("utf16le");
  return normalizeFullWidthDigits(t);
}
//@ chunk-m41h77x8.js:1221-1426 fingerprint = normalizeFullWidthDigits (1)
function normalizeFullWidthDigits(input) {
  let e = [];
  for (let r = 0; r < input.length; r += 8192) {
    let min = Math.min(r + 8192, input.length),
      uint16Array = new Uint16Array(min - r);
    for (let s = r; s < min; s++) uint16Array[s - r] = input.charCodeAt(s);
    e.push(String.fromCharCode(...uint16Array));
  }
  return e.join("");
}
//@ chunk-m41h77x8.js:1426-1819 layout
var LONE_SURROGATE_PATTERN = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/,
  a = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
  l =
    typeof String.prototype.isWellFormed === "function"
      ? Function.prototype.call.bind(String.prototype.isWellFormed)
      : void 0,
  g =
    typeof String.prototype.toWellFormed === "function"
      ? Function.prototype.call.bind(String.prototype.toWellFormed)
      : void 0;
/**
 * 字符串是否良构（无孤立 UTF-16 代理项）；优先用 String.prototype.isWellFormed。
 */
//@ chunk-m41h77x8.js:1819-1868 layout
function isWellFormedString(t) {
  if (l) return l(t);
  return !LONE_SURROGATE_PATTERN.test(t);
}
/**
 * 把非良构 UTF-16（孤立代理）替换为 U+FFFD；有原生 toWellFormed 时直接用。
 */
//@ chunk-m41h77x8.js:1868-1929 file-local
function normalizeFullWidthSpace(input) {
  if (g) return g(input);
  return input.replace(a, "\uFFFD");
}
/**
 * 去掉字符串中的孤立代理项，得到良构字符串。
 */
//@ chunk-m41h77x8.js:1929-1987 layout
function toWellFormedString(t) {
  if (l && l(t)) return t;
  return t.replace(a, "");
}
/**
 * 深度遍历数组/对象，把非良构字符串原地修复，返回是否有改动（发送 API 前清洗 JSON 用）。
 */
//@ chunk-m41h77x8.js:1987-2403 layout
function repairMalformedStringsDeep(t) {
  let n = !1,
    e = [t];
  while (e.length > 0) {
    let r = e.pop();
    if (Array.isArray(r))
      for (let i = 0; i < r.length; i++) {
        let o = r[i];
        if (typeof o === "string") {
          if (!isWellFormedString(o)) ((r[i] = normalizeFullWidthSpace(o)), (n = !0));
        } else if (o !== null && typeof o === "object") e.push(o);
      }
    else if (r !== null && typeof r === "object") {
      let i = r;
      for (let o of Object.keys(i)) {
        let s = i[o];
        if (typeof s === "string") {
          if (!isWellFormedString(s)) ((i[o] = normalizeFullWidthSpace(s)), (n = !0));
        } else if (s !== null && typeof s === "object") e.push(s);
      }
    }
  }
  return n;
}
/**
 * 深度遍历判断结构中是否含非良构字符串。
 */
//@ chunk-m41h77x8.js:2403-2800 layout
function containsMalformedStringDeep(t) {
  let n = [t];
  while (n.length > 0) {
    let e = n.pop();
    if (Array.isArray(e))
      for (let r = 0; r < e.length; r++) {
        let i = e[r];
        if (typeof i === "string") {
          if (!isWellFormedString(i)) return !0;
        } else if (i !== null && typeof i === "object") n.push(i);
      }
    else if (e !== null && typeof e === "object") {
      let r = e;
      for (let i of Object.keys(r)) {
        let o = r[i];
        if (typeof o === "string") {
          if (!isWellFormedString(o)) return !0;
        } else if (o !== null && typeof o === "object") n.push(o);
      }
    }
  }
  return !1;
}
/**
 * 返回字符串中第一个分隔符之前的部分（找不到分隔符时返回原串）。
 */
//@ chunk-m41h77x8.js:2800-2865 file-local
function firstLineOf(t, n) {
  let index = t.indexOf(n);
  return index === -1 ? t : t.slice(0, index);
}
/**
 * 去掉末尾属于给定字符集合的字符（类似 trimEnd 指定字符）。
 */
//@ chunk-m41h77x8.js:2865-2952 layout
function trimEndChars(t, chars) {
  let e = t.length;
  while (e > 0 && chars.includes(t[e - 1])) e--;
  return t.slice(0, e);
}
/**
 * 若以前缀开头则去掉前缀。
 */
//@ chunk-m41h77x8.js:2952-3012 layout
function stripPrefix(t, n) {
  return t.startsWith(n) ? t.slice(n.length) : t;
}
/**
 * 若以后缀结尾则去掉后缀。
 */
//@ chunk-m41h77x8.js:3012-3081 layout
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
/**
 * 取第一行（firstLineOf(t, '\n')）。
 */
//@ chunk-m41h77x8.js:3234-3266 layout
function getFirstLine(t) {
  return firstLineOf(
    t,
    `
`,
  );
}
/**
 * 统计字符（子串）在字符串中出现的次数，可指定起始位置。
 */
//@ chunk-m41h77x8.js:3266-3357 file-local
function countCharInString(str, char, start = 0) {
  let count = 0,
    index = str.indexOf(char, start);
  while (index !== -1) (count++, (index = str.indexOf(char, index + 1)));
  return count;
}
//@ chunk-m41h77x8.js:3357-3458 layout = normalizeFullWidthDigits (1)
function normalizeFullWidthDigits_2(input) {
  return input.replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248));
}
/**
 * 把全角空格 U+3000 换成普通空格。
 */
//@ chunk-m41h77x8.js:3458-3507 layout
function replaceIdeographicSpace(t) {
  return t.replaceAll("\u3000", " ");
}
//@ chunk-m41h77x8.js:3507-3522 callgraph-witnessed = MAX_STRING_LENGTH (0)
var MAX_STRING_LENGTH = 33554432;
//@ chunk-m41h77x8.js:3522-3741 fingerprint = safeJoinLines (1)
function safeJoinLines(lines, delimiter = ",", maxSize = MAX_STRING_LENGTH) {
  let result = "";
  for (let line of lines) {
    let delimiterToAdd = result ? delimiter : "",
      c = delimiterToAdd + line;
    if (result.length + c.length <= maxSize) result += c;
    else {
      let u = maxSize - result.length - delimiterToAdd.length - 14;
      if (u > 0) result += delimiterToAdd + line.slice(0, u) + "...[truncated]";
      else result += "...[truncated]";
      return result;
    }
  }
  return result;
}
/**
 * 有上限的字符串累加器：超过上限后丢弃后续内容并记录被截断的字节数（工具输出截断用）。
 */
//@ chunk-m41h77x8.js:3741-4523 fingerprint = EndTruncatingAccumulator (1)
class EndTruncatingAccumulator {
  maxSize;
  content = "";
  isTruncated = !1;
  totalBytesReceived = 0;
  constructor(t = MAX_STRING_LENGTH) {
    this.maxSize = t;
  }
  append(t) {
    let n = typeof t === "string" ? t : t.toString();
    if (((this.totalBytesReceived += n.length), this.isTruncated && this.content.length >= this.maxSize))
      return;
    if (this.content.length + n.length > this.maxSize) {
      let e = this.maxSize - this.content.length;
      if (e > 0) this.content += n.slice(0, e);
      this.isTruncated = !0;
    } else this.content += n;
  }
  toString() {
    if (!this.isTruncated) return this.content;
    let t = this.totalBytesReceived - this.maxSize,
      rounded = Math.round(t / 1024);
    return (
      this.content +
      `
... [output truncated - ${rounded}KB removed]`
    );
  }
  clear() {
    ((this.content = ""), (this.isTruncated = !1), (this.totalBytesReceived = 0));
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
  let parts = text.split(`
`);
  if (parts.length <= maxLines) return text;
  return (
    parts.slice(0, maxLines).join(`
`) + "\u2026"
  );
}
/**
 * 截断字符串并附上被截掉的字符数。
 */
//@ chunk-m41h77x8.js:4623-4727 placement
function truncateWithCount(t, n) {
  if (t.length <= n) return t;
  let e = truncateToLength(t, n);
  return `${e}\u2026 [+${t.length - e.length} chars]`;
}
/**
 * 在单词边界截断字符串并加省略号（边界太靠前时直接截断）。
 */
//@ chunk-m41h77x8.js:4727-4884 placement
function truncateAtWord(t, n) {
  if (t.length <= n) return t;
  let e = truncateToLength(t, n - 1),
    search = e.search(/\s\S*$/),
    i = search === -1 ? "" : e.slice(0, search).trimEnd();
  return `${i.length > n / 2 ? i : e.trimEnd()}\u2026`;
}
/**
 * 控制字符正则（除换行类空白、全部控制字符）与 Windows 保留设备名正则。
 */
//@ chunk-m41h77x8.js:4884-5030 placement
var CONTROL_CHARS_EXCEPT_WS_RE = /[\x00-\x08\x0E-\x1F\x7F-\x9F]/g,
  ANY_CONTROL_CHAR_RE = /[\x00-\x1F\x7F-\x9F]/,
  WINDOWS_RESERVED_NAME_RE = /^(con|prn|aux|nul|com[0-9\u00B9\u00B2\u00B3]|lpt[0-9\u00B9\u00B2\u00B3])$/;
//@ chunk-m41h77x8.js:5030-5096 placement
function Dr(t) {
  return t.replace(CONTROL_CHARS_EXCEPT_WS_RE, "").replace(/\s+/g, " ").trim();
}
//@ chunk-m41h77x8.js:5096-5171 placement
var d = /[\t\n\v\f\r\u2028\u2029]/g,
  regExp = new RegExp(`${CONTROL_CHARS_EXCEPT_WS_RE.source}|${d.source}`);
//@ chunk-m41h77x8.js:5171-5249 placement
function sLn(t) {
  if (!regExp.test(t)) return t;
  return t.replace(CONTROL_CHARS_EXCEPT_WS_RE, "").replace(d, " ");
}
/**
 * 去掉控制、格式、代理与默认可忽略字符及行/段分隔符。
 */
//@ chunk-m41h77x8.js:5249-5354 placement
function stripFormatChars(t) {
  return t.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}\u2028\u2029]/gu, "");
}
//@ chunk-m41h77x8.js:5354-5555 placement
var ANSI_ESCAPE_RE =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?(?:\u0007|\u001B\u005C|\u009C))|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
//@ chunk-m41h77x8.js:5555-5640 placement
function wh(t) {
  return toWellFormedString(t)
    .replace(ANSI_ESCAPE_RE, "")
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, "");
}
/**
 * 把控制字符、格式字符和默认可忽略码点转成可见形式（ESC→␛、C0→␀ 系列、DEL→␡，其余 \u{…}），保留换行/Tab 以及 emoji 序列中必需的变体选择符、ZWJ 与标签字符。
 */
//@ chunk-m41h77x8.js:5640-6371 placement
function escapeControlChars(t) {
  let n = /[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\u2028\u2029]/gu;
  if (!n.test(t)) return t;
  let e = "";
  for (let { segment: segment } of new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(t)) {
    let matches = /\p{Extended_Pictographic}|\p{Regional_Indicator}|^[#*0-9]\uFE0F?\u20E3$/u.test(segment),
      matches_2 = /^\u{1F3F4}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,6}\u{E007F}$/u.test(segment);
    ((n.lastIndex = 0),
      (e += segment.replace(n, (s, c) => {
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
      })));
  }
  return e;
}
//@ chunk-m41h77x8.js:6371-6447 placement
function Mu(t) {
  return escapeControlChars(t).replace(/\n/g, "\u2424").replace(/\t/g, "\u2409");
}
//@ chunk-m41h77x8.js:6447-6521 placement
function U$(t) {
  let n = wh(getFirstLine(t));
  return n.length > 200 ? `${truncateToLength(n, 200)}\u2026` : n;
}
//@ chunk-m41h77x8.js:6521-6557 placement
function bV(t, n) {
  return truncateToLength(ql(t), n);
}
//@ chunk-m41h77x8.js:6557-6610 placement
function ql(t) {
  return stripFormatChars(Dr(t.replace(ANSI_ESCAPE_RE, ""))).trim();
}
//@ chunk-m41h77x8.js:6610-6618 placement
var F = 8;
/**
 * 把值按 JS 字符串转换规则转成字符串：字符串/数字/布尔直接转换，数组递归用逗号连接（限深度），普通对象为 [object Object]，其他返回 undefined。
 */
//@ chunk-m41h77x8.js:6618-7021 placement
function coerceToPlainString(t, n = 0) {
  if (typeof t === "string") return t;
  if (typeof t === "number" || typeof t === "boolean") return String(t);
  if (Array.isArray(t)) {
    if (n >= F) return;
    let e = [];
    for (let r of t) {
      let i = r === null || r === void 0 ? "" : coerceToPlainString(r, n + 1);
      if (i === void 0) return;
      e.push(i);
    }
    return e.join(",");
  }
  return typeof t === "object" &&
    t !== null &&
    Object.getPrototypeOf(t) === Object.prototype &&
    !Object.hasOwn(t, "toString")
    ? "[object Object]"
    : void 0;
}
//@ chunk-m41h77x8.js:7021-7033 placement
var oEr = 500;
/**
 * 按 UTF-8 字节数截断字符串（不切断字符），长度一定不超限时直接返回原串。
 */
//@ chunk-m41h77x8.js:7033-7338 placement
function truncateUtf8Bytes(t, n) {
  if (t.length * 3 <= n) return t;
  let textEncoder = new TextEncoder(),
    uint8Array = new Uint8Array(Math.max(0, Math.min(n, 4194304))),
    i = 0,
    o = 0;
  while (o < t.length) {
    let s = n - i;
    if (s <= 0) break;
    let c = s < uint8Array.length ? uint8Array.subarray(0, s) : uint8Array,
      { read: read, written: written } = textEncoder.encodeInto(t.slice(o), c);
    if (read === 0) break;
    ((o += read), (i += written));
  }
  return o >= t.length ? t : t.slice(0, o);
}
/**
 * 用足够长的反引号围栏包裹代码块（比内容中最长的反引号串多一个，至少 3 个），可带语言标记。
 */
//@ chunk-m41h77x8.js:7338-7505 placement
function fenceCodeBlock(t, n = "") {
  let reduced = (t.match(/`+/g) ?? []).reduce((i, o) => Math.max(i, o.length), 0),
    repeat = "`".repeat(Math.max(3, reduced + 1));
  return `${repeat}${n.replace(/[`\s].*$/s, "")}
${t}
${repeat}`;
}
//@ chunk-m41h77x8.js:7505-7532 placement
var Eft = /(\u2026|\.\.\.)$/;
//@ chunk-bwbq4xvm.js:775124-775209 placement
function stripControlCharsTruncated(e) {
  return [...e.replace(/[\x00-\x1f\x7f-\x9f]/g, "")].slice(0, ND).join("");
}
//@ chunk-bwbq4xvm.js:775209-775255 placement
function sanitizeSessionTitle(e) {
  return stripControlCharsTruncated(replaceControlChars(e.trim())).trim();
}
//@ chunk-ae5g0zb5.js:38606-39033 fingerprint = capitalize (1)
function capitalize_2(e, n) {
  let r = null;
  try {
    r = e === void 0 ? null : JSON.parse(e);
  } catch {
    r = null;
  }
  let o = G(r) ? r.name : null,
    s =
      typeof o === "string" &&
      o.length <= 214 &&
      /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(o)
        ? o
        : null,
    a = n.length <= 214 && /^[A-Za-z0-9][A-Za-z0-9-._~]*$/.test(n) ? n : null,
    trimmed = (s ?? a ?? "")
      .replace(/^@[^/]*\//, "")
      .replace(/[-._~]+/g, " ")
      .trim()
      .slice(0, 30)
      .trim(),
    c = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return Er.test(c) ? c : null;
}
/**
 * NFC 规范化后转小写，用于大小写不敏感的名字/路径比较（被 50 多处使用）。
 */
//@ chunk-dcmhvw5a.js:141176-141231 placement = setCwdState (1)
function nfcLower(cwd) {
  return cwd.normalize("NFC").toLowerCase();
}

export {
  firstLineOf,
  plural,
  countCharInString,
  truncateToLength,
  urlPatternToRegex,
  Dr,
  ql,
  bV,
  oEr,
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
  U$,
  stripPrefix,
  takeLastChars,
  toWellFormedString,
  Eft,
  normalizeFullWidthSpace,
  stripSuffix,
  ANY_CONTROL_CHAR_RE,
  truncateCodePoints,
  truncateToLines,
  normalizeFullWidthDigits_2,
  wh,
  CONTROL_CHARS_EXCEPT_WS_RE,
  containsMalformedStringDeep,
  truncateAtWord,
  nfcLower,
  stripFormatChars,
  truncateUtf8Bytes,
  Mu,
  EndTruncatingAccumulator,
  truncateMiddle,
  WINDOWS_RESERVED_NAME_RE,
  sLn,
  capitalize_2,
  escapeControlChars,
  coerceToPlainString,
  safeJoinLines,
  repairUtf16,
  replaceIdeographicSpace,
  fenceCodeBlock,
};
