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

//@ chunk-cgr0tezp.js:797-870 placement
var SURROGATE_PAIR_OR_LONE_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF]|[\uDC00-\uDFFF]/g;
//@ chunk-cgr0tezp.js:870-929 placement
function stripLoneSurrogates(e) {
  return e.replace(SURROGATE_PAIR_OR_LONE_RE, (n) => (n.length === 2 ? n : ""));
}
//@ chunk-cgr0tezp.js:929-1030 placement
var INVISIBLE_CHARS_RE =
  /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/gu;
var MAX_SHORT_TEXT = 1024;
//@ chunk-cgr0tezp.js:1030-1128 placement
/**
 * 清洗遥测字符串（截断、去控制字符）。
 */
function sanitizeTelemetryString(e) {
  if (typeof e !== "string") return "";
  return truncateToLength(
    recursivelySanitizeUnicode_2(e.length > 4096 ? e.slice(0, 4096) : e),
    MAX_SHORT_TEXT,
  );
}
//@ chunk-cgr0tezp.js:1128-1264 placement
function recursivelySanitizeUnicode_2(value) {
  if (typeof value !== "string") return "";
  let n = value;
  for (let j = 0; j < 64; j++) {
    let replaced = stripLoneSurrogates(n).replace(INVISIBLE_CHARS_RE, "");
    if (replaced === n) return replaced;
    n = replaced;
  }
  return "";
}
//@ chunk-cgr0tezp.js:1264-1404 placement
/**
 * 清洗日志行。
 */
function sanitizeLogLine(e) {
  if (typeof e !== "string") return "";
  return (e.length > 4096 ? e.slice(0, 4096) : e)
    .replace(SURROGATE_PAIR_OR_LONE_RE, (r) => (r.length === 2 ? r : " "))
    .replace(INVISIBLE_CHARS_RE, " ");
}
//@ chunk-cgr0tezp.js:1404-1565 placement
/**
 * 反复去除不可见字符直到稳定（过长返回 null）。
 */
function sanitizeRelayUrl(url) {
  if (url.length > 16384) return null;
  let n = url;
  for (let j = 0; j < 64; j++) {
    let replaced = stripLoneSurrogates(n).replace(INVISIBLE_CHARS_RE, "");
    if (replaced === n) return [...replaced].length <= 8192 ? replaced : null;
    n = replaced;
  }
  return null;
}
//@ chunk-cgr0tezp.js:1565-1773 placement
/**
 * 最多列出三个 URL，其余提示数量。
 */
function formatElicitationUrls(e) {
  let mapped = e.slice(0, 3).map((i) => sanitizeRelayUrl(i) ?? "[elicitation URL too long to relay]");
  let r = e.length > 3 ? ` \u2026and ${e.length - 3} more \u2014 re-run in the terminal to see all` : "";
  return `${mapped.join(", ")}${r}`;
}
//@ chunk-cgr0tezp.js:1773-2047 placement
var EXTRA_COMBINING_MARKS =
  "\\u05C8\\u05C9\\u1ADE\\u1ADF\\u1AEC-\\u1AF0\\u{10ECB}-\\u{10ECF}\\u{10EF0}-\\u{10EF9}\\u{1D127}\\u{1D128}\\u{1D250}-\\u{1D252}\\u{1D25B}\\u{1D25C}\\u{1D25F}\\u{1D280}\\u{1D281}";
var COMBINING_MARK_CLASS_2 = `[\\p{M}\\uFF9E\\uFF9F${EXTRA_COMBINING_MARKS}]`;
var LONG_COMBINING_RUN_RE = new RegExp(`${COMBINING_MARK_CLASS_2}{32,}`, "gu");
var COMBINING_MARK_RE = new RegExp(COMBINING_MARK_CLASS_2, "u");
//@ chunk-cgr0tezp.js:2047-2079 placement
var combiningClassCache = new Map();
var combiningClassOrder = [];
var decompositionCache = new Map();
//@ chunk-cgr0tezp.js:2079-2139 placement
function reordersUnderNfd(e, n) {
  return e !== n && (e + n).normalize("NFD") === n + e;
}
//@ chunk-cgr0tezp.js:2139-2518 placement
/**
 * 字符的易混淆替代（缓存）。
 */
function combiningClassOf(e) {
  let n = combiningClassCache.get(e);
  if (n !== undefined) return n;
  let r = String.fromCodePoint(e);
  let i = null;
  if (r === "\u0334" || reordersUnderNfd(r, "\u0334") || reordersUnderNfd("\u0345", r)) {
    let s = 0;
    let o = combiningClassOrder.length;
    while (s < o && i === null) {
      let a = (s + o) >> 1;
      let u = combiningClassOrder[a];
      if (reordersUnderNfd(r, u.sample)) s = a + 1;
      else if (reordersUnderNfd(u.sample, r)) o = a;
      else i = u;
    }
    if (i === null) {
      i = {
        order: s,
        sample: r,
      };
      combiningClassOrder.splice(s, 0, i);
      for (let j = s + 1; j < combiningClassOrder.length; j++) combiningClassOrder[j].order = j;
    }
  }
  combiningClassCache.set(e, i);
  return i;
}
//@ chunk-cgr0tezp.js:2518-2662 placement
function decomposeCodePoint(e) {
  let n = decompositionCache.get(e);
  if (n === undefined) {
    n = Array.from(String.fromCodePoint(e).normalize("NFKD"), (r) => r.codePointAt(0));
    decompositionCache.set(e, n);
  }
  return n;
}
//@ chunk-cgr0tezp.js:2662-2674 placement
var FROM_CODE_POINT_CHUNK = 4096;
//@ chunk-cgr0tezp.js:2674-2790 placement
function codePointsToString(e, n) {
  let r = "";
  for (let i = 0; i < n; i += FROM_CODE_POINT_CHUNK)
    r += String.fromCodePoint(...e.subarray(i, Math.min(i + FROM_CODE_POINT_CHUNK, n)));
  return r;
}
//@ chunk-cgr0tezp.js:2790-3380 placement
/**
 * 计算易混淆字符骨架。
 */
function canonicalReorderRun(e) {
  let int32Array = new Int32Array(e.length + 16);
  let r = 0;
  for (let a = 0; a < e.length;) {
    let codePoint = e.codePointAt(a);
    a += codePoint > 65535 ? 2 : 1;
    for (let c of decomposeCodePoint(codePoint)) {
      if (r === int32Array.length) {
        let int32Array_2 = new Int32Array(int32Array.length * 2);
        int32Array_2.set(int32Array);
        int32Array = int32Array_2;
      }
      int32Array[r++] = c;
      combiningClassOf(c);
    }
  }
  let int16Array = new Int16Array(r);
  for (let j = 0; j < r; j++) int16Array[j] = combiningClassCache.get(int32Array[j])?.order ?? -1;
  let sliced = int32Array.slice(0, r);
  let int32Array_2 = new Int32Array(combiningClassOrder.length);
  for (let a = 0; a < r;) {
    let u = a;
    let c = true;
    while (u < r && int16Array[u] >= 0) {
      c &&= u === a || int16Array[u - 1] <= int16Array[u];
      u++;
    }
    if (c) {
      a = u + 1;
      continue;
    }
    int32Array_2.fill(0);
    for (let d = a; d < u; d++) int32Array_2[int16Array[d]]++;
    let l = a;
    for (let j = 0; j < int32Array_2.length; j++) {
      let g = int32Array_2[j];
      int32Array_2[j] = l;
      l += g;
    }
    for (let d = a; d < u; d++) sliced[int32Array_2[int16Array[d]]++] = int32Array[d];
    a = u;
  }
  return codePointsToString(sliced, r);
}
//@ chunk-cgr0tezp.js:3380-3434 placement
function reorderLongCombiningRuns(e) {
  return e.length < 32 ? e : e.replace(LONG_COMBINING_RUN_RE, canonicalReorderRun);
}
//@ chunk-cgr0tezp.js:3434-3445 placement
var NORMALIZE_CHUNK = 128;
//@ chunk-cgr0tezp.js:3445-3584 placement
function isNormalizationStarter(e) {
  if (e < 768) return true;
  let n = decompositionCache.get(e);
  if (n === undefined && !COMBINING_MARK_RE.test(String.fromCodePoint(e))) return true;
  return combiningClassOf((n ?? decomposeCodePoint(e))[0]) === null;
}
//@ chunk-cgr0tezp.js:3584-3794 placement = needsWidthCompensation (1)
function nextStarterIndex(e, n) {
  let r = n;
  if (r < e.length && (e.charCodeAt(r) & 64512) === 56320 && (e.charCodeAt(r - 1) & 64512) === 55296) r++;
  while (r < e.length) {
    let cp = e.codePointAt(r);
    if (isNormalizationStarter(cp)) break;
    r += cp > 65535 ? 2 : 1;
  }
  return Math.min(r, e.length);
}
//@ chunk-cgr0tezp.js:3794-3960 placement = needsWidthCompensation (1)
function lastStarterIndex(char) {
  let n = char.length;
  while (n > 0) {
    n--;
    if (n > 0 && (char.charCodeAt(n) & 64512) === 56320 && (char.charCodeAt(n - 1) & 64512) === 55296) n--;
    if (isNormalizationStarter(char.codePointAt(n))) return n;
  }
  return 0;
}
//@ chunk-cgr0tezp.js:3960-4202 placement
/**
 * 分块做 Unicode 规范化（每块 128 码元在规范化起始字符处切开），避免超长组合序列导致的性能问题。
 */
function normalizeChunked(e, n) {
  let r = reorderLongCombiningRuns(e);
  if (r.length <= NORMALIZE_CHUNK) return r.normalize(n);
  let i = [];
  let s = "";
  for (let o = 0; o < r.length;) {
    let a = nextStarterIndex(r, o + NORMALIZE_CHUNK);
    let char = (s + r.slice(o, a)).normalize(n);
    let c = a === r.length ? char.length : lastStarterIndex(char);
    i.push(char.slice(0, c));
    s = char.slice(c);
    o = a;
  }
  return i.join("");
}
//@ chunk-cgr0tezp.js:4202-4237 placement
/**
 * NFKC 归一化。
 */
function normalizeNfkc(e) {
  return normalizeChunked(e, "NFKC");
}
//@ chunk-cgr0tezp.js:4237-4273 placement
/**
 * nfkdNormalize：NFKD 规范化。
 */
function nfkdNormalize(e) {
  return normalizeChunked(e, "NFKD");
}
//@ chunk-cgr0tezp.js:4273-5109 placement
/**
 * 框线字符范围与替换表。
 */
var BOX_DRAWING_RANGES_2 =
  "\u02F9-\u02FC\u230C-\u230F\u231C-\u231F\u239B-\u23CC\u23DC-\u23E1\u2E00-\u2E0D\u2E1C\u2E1D\u2500-\u257F";
var BOX_DRAWING_RANGES = new Map([
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
//@ chunk-cgr0tezp.js:5109-5399 placement
/**
 * 尖括号类易混淆字符表。
 */
var BRACKET_CONFUSABLES_2 = new Map([
  ...BOX_DRAWING_RANGES,
  ...Array.from("\u226A\u22D8\u2AA1\u2AF7\u27EA\uFE3D", (e) => [e, "<"]),
  ...Array.from("\u226B\u22D9\u2AA2\u2AF8\u27EB\uFE3E", (e) => [e, ">"]),
]);
var BRACKET_CONFUSABLES = new Map([...BRACKET_CONFUSABLES_2, ["\u300A", "<"], ["\u300B", ">"]]);
var BRACKET_CONFUSABLES_WITH_ANGLES = new Set(
  `\u2992\u2994\u2A7A\u2AA7${"\u226B\u22D9\u2AA2\u2AF8\u27EB\uFE3E"}`,
);
//@ chunk-cgr0tezp.js:5399-5465 placement
/**
 * 字符及其易混淆变体。
 */
function withConfusables(e) {
  let n = e;
  for (let [r, i] of BRACKET_CONFUSABLES) if (i === e) n += r;
  return n;
}
//@ chunk-cgr0tezp.js:5465-5556 placement
/**
 * CONTROL_CHARS_RE：控制字符与行分隔符；MAX_CLEAN_IDENTIFIER_LENGTH：干净标识符长度上限；CONTROL_CHARS_OR_ANGLE_RE：控制字符或尖括号（同一声明共 3 个绑定）。
 */
var CONTROL_CHARS_RE = /[\x00-\x1f\x7f-\x9f\u2028\u2029]/g;
var MAX_CLEAN_IDENTIFIER_LENGTH = 256;
var CONTROL_CHARS_OR_ANGLE_RE = /[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;
//@ chunk-cgr0tezp.js:5556-5605 placement
function isCleanIdentifier(e) {
  return e.length <= MAX_CLEAN_IDENTIFIER_LENGTH && !CONTROL_CHARS_OR_ANGLE_RE.test(e);
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
function isAsciiIdentifier(e) {
  return e.length <= MAX_CLEAN_IDENTIFIER_LENGTH && /^[A-Za-z0-9_:.-]+$/.test(e);
}
//@ chunk-cgr0tezp.js:5711-5784 placement
/**
 * isUnicodeIdentifier：短且仅 Unicode 标识符字符。
 */
function isUnicodeIdentifier(e) {
  return e.length <= MAX_CLEAN_IDENTIFIER_LENGTH && /^[\p{L}\p{M}\p{N}_:.-]+$/u.test(e);
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
function encodeControlChars(e) {
  return e.replace(CONTROL_CHARS_RE, (n) => `&#${n.charCodeAt(0)};`);
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
function escapeForTag(e) {
  return encodeControlChars(escapeAngleBrackets(String(e ?? "")));
}
//@ chunk-cgr0tezp.js:6152-6206 placement
/**
 * escapeXmlAttribute：转义后的 XML 属性值。
 */
function escapeXmlAttribute(e) {
  return escapeForTag(e).replaceAll('"', "&quot;");
}
//@ chunk-cgr0tezp.js:6206-6475 placement
var MAX_ATTRIBUTE_LENGTH = 2000;
var HIDDEN_CHARS_RE = /[\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{Default_Ignorable_Code_Point}\u2800]/gu;
var SYMBOL_CHARS_RE = new RegExp(`[${BOX_DRAWING_RANGES_2}]|(?![\\x00-\\x7f])[\\p{Sm}\\p{Sk}\\p{So}]`, "gu");
var BRACKET_CONFUSABLES_RE = new RegExp(`[${[...BRACKET_CONFUSABLES_2.keys()].join("")}]`, "gu");
var OPEN_BRACKET_RE = /(?![({\u201A\u201E\u2E42])\p{Ps}/gu;
var CLOSE_BRACKET_RE = /(?![)}])\p{Pe}/gu;
//@ chunk-cgr0tezp.js:6475-6725 placement
/**
 * 清洗属性值（长度、不可见字符）。
 */
function sanitizeAttributeValue(e) {
  if (typeof e !== "string" || e.length > MAX_ATTRIBUTE_LENGTH) return null;
  let trimmed = escapeAngleBrackets(
    normalizeNfkc(e.replace(HIDDEN_CHARS_RE, ""))
      .replace(CONTROL_CHARS_RE, " ")
      .replace(SYMBOL_CHARS_RE, " ")
      .replace(/\s+/g, " ")
      .replace(BRACKET_CONFUSABLES_RE, (r) => BRACKET_CONFUSABLES_2.get(r) ?? r)
      .replace(OPEN_BRACKET_RE, "(")
      .replace(CLOSE_BRACKET_RE, ")"),
  ).trim();
  return trimmed === "" || trimmed.length > MAX_ATTRIBUTE_LENGTH ? null : trimmed;
}
//@ chunk-cgr0tezp.js:6725-7145 placement
/**
 * 不可见字符类正则片段。
 */
var INVISIBLE_CHAR_CLASSES = "\\p{Default_Ignorable_Code_Point}\\u2800";
var INVISIBLE_CHAR_CLASS_SOURCE = `\\p{Cc}\\p{Cf}\\p{Cs}\\p{Co}\\p{Cn}\\u2028\\u2029${INVISIBLE_CHAR_CLASSES}`;
var INVISIBLE_CHAR_RANGES = String.raw`\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\u3164\ufe00-\ufe0f\uffa0\ufff0-\ufffb\uDC00-\uDFFF\uDB40-\uDB43`;
var INVISIBLE_FORMAT_RANGES = String.raw`\u0600-\u0605\u06dd\u070f\u0890\u0891\u08e2`;
var INVISIBLE_CHARS_RE_SOURCE = `[${INVISIBLE_CHAR_RANGES}${INVISIBLE_FORMAT_RANGES}\\ufeff]*`;
var regExp = new RegExp(`[${INVISIBLE_CHAR_RANGES}${INVISIBLE_FORMAT_RANGES}\\ufeff]`);
//@ chunk-cgr0tezp.js:7145-7254 placement
/**
 * 在关键词正则字母间插入可选分隔符。
 */
function allowSeparatorsInPattern(e) {
  return e
    .replace(/([a-z)])(?=[a-z(\[])/gi, `$1${INVISIBLE_CHARS_RE_SOURCE}`)
    .replace(/\[_-\]\?/g, `(?:[_-]${INVISIBLE_CHARS_RE_SOURCE})?`);
}
//@ chunk-cgr0tezp.js:7254-7464 placement
var regExp_2 = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}]+`, "gu");
var ZWJ_VS_KEEP_CHARS = "\\u200D\\uFE0E\\uFE0F";
var regExp_3 = new RegExp(`(?:(?![${ZWJ_VS_KEEP_CHARS}])[${INVISIBLE_CHAR_CLASS_SOURCE}])+`, "gu");
var regExp_4 = new RegExp(`(?:(?![${ZWJ_VS_KEEP_CHARS}\\n])[${INVISIBLE_CHAR_CLASS_SOURCE}])+`, "gu");
var regExp_5 = new RegExp(`(?<!\\S)[${ZWJ_VS_KEEP_CHARS}]+`, "gu");
var INVISIBLE_CHARS_ALLOWING_ZWJ_RE = /\p{Cs}/gu;
//@ chunk-cgr0tezp.js:7464-7977 placement
/**
 * 去除不可见字符（可保留拼写的连接符）。
 */
function stripInvisibleChars(e, n, r) {
  let i = stripAnsi(e.replace(INVISIBLE_CHARS_ALLOWING_ZWJ_RE, "\u200B"));
  if (r !== undefined && "keepSpelledJoiners" in r) {
    let a = new Set();
    if (i.length <= MAX_JOINER_INSPECT_LENGTH && KEEP_JOINER_TEST_RE.test(i)) {
      RGI_EMOJI_RE ??= new RegExp("\\p{RGI_Emoji}", "gv");
      for (let u of [RGI_EMOJI_RE, regExp_7])
        for (let { index, 0: l } of i.matchAll(u)) for (let d = index; d < index + l.length; d++) a.add(d);
    }
    return i.replace(regExp_2, (u, c) => {
      let l = "";
      for (let j = 0; j < u.length; j++) l += a.has(c + j) ? u.charAt(j) : l.endsWith(n) ? "" : n;
      return l;
    });
  }
  let s = r?.keepNewlines === true || r?.keepEmojiJoiners === true;
  let replaced = i.replace(r?.keepNewlines ? regExp_4 : s ? regExp_3 : regExp_2, n);
  return s ? replaced.replace(regExp_5, "") : replaced;
}
//@ chunk-cgr0tezp.js:7977-9183 placement
/**
 * 不可见字符与组合符正则。
 */
var INVISIBLE_PATTERNS = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
var INVISIBLE_SINGLE_RE = /(?! )\p{Zs}|[\uFFFC\u{1D159}\u{13441}\u{13442}\u{16FE4}]|^ | $/u;
var COMBINING_MARK_CLASS = "[\\p{M}\\u1160-\\u11FF\\uD7B0-\\uD7FF]";
var regExp_6 = new RegExp(
  `(?<![\\p{L}\\p{N}\\p{M}])${COMBINING_MARK_CLASS}|${COMBINING_MARK_CLASS}{9}|\\p{Soft_Dotted}\\p{M}*\\u0307|[\\u0131\\u0237]\\p{M}|(?<=[\\p{sc=Latin}\\p{sc=Common}]${COMBINING_MARK_CLASS}*)(?!\\p{sc=Inherited})${COMBINING_MARK_CLASS}`,
  "u",
);
var COMBINING_REORDER_RE = String.raw`\u0620\u0626\u0628\u062A-\u062E\u0633-\u063F\u0641-\u0647\u0649\u064A\u066E\u066F\u0678-\u0687\u069A-\u06BF\u06C1\u06C2\u06CC\u06CE\u06D0\u06D1\u06FA-\u06FC\u06FF\u0750-\u0758\u075C-\u076A\u076D-\u0770\u0772\u0775-\u0777\u077A-\u077F\u0886\u0889-\u088D\u088F\u08A0-\u08A9\u08AF\u08B0\u08B3-\u08B8\u08BA-\u08C8`;
var ARABIC_JOINERS_SOURCE = String.raw`\u0620\u0622-\u063F\u0641-\u064A\u066E\u066F\u0671-\u0673\u0675-\u06D3\u06D5\u06EE\u06EF\u06FA-\u06FC\u06FF\u0750-\u077F\u0870-\u0882\u0886\u0889-\u088F\u08A0-\u08AC\u08AE-\u08C8`;
var mapped = [2304, 2432, 2688, 2816, 3072, 3200, 3328].map(zeroWidthJoinerRule);
var ARABIC_LEFT_JOINING_SOURCE = String.raw`[\u0D9A-\u0DC6]`;
var regExp_7 = new RegExp(
  [
    ...mapped,
    `\\u200D(?<=${ARABIC_LEFT_JOINING_SOURCE}\\u0DCA.)(?=${ARABIC_LEFT_JOINING_SOURCE})`,
    `\\u200C(?<=[${COMBINING_REORDER_RE}](?:(?=[\\p{sc=Arabic}\\p{sc=Inherited}])(?!\\p{Default_Ignorable_Code_Point})\\p{Mn}){0,8}.)(?=[${ARABIC_JOINERS_SOURCE}])`,
  ].join("|"),
  "gu",
);
var regExp_8 = new RegExp(`\\u20E3|\\u263A${COMBINING_MARK_CLASS}`, "u");
var KEEP_JOINER_TEST_RE = /[\u200C\u200D\uFE0F\u{E007F}]/u;
var RGI_EMOJI_RE;
//@ chunk-cgr0tezp.js:9183-9319 placement
function zeroWidthJoinerRule(e) {
  let n = `[${unicodeEscape(e + 21)}-${unicodeEscape(e + 57)}]`;
  let r = e === 3328 ? "" : `${unicodeEscape(e + 60)}?`;
  return `[\\u200C\\u200D](?<=${n}${r}${unicodeEscape(e + 77)}.)(?=${n})`;
}
//@ chunk-cgr0tezp.js:9319-9365 placement
function unicodeEscape(e) {
  return `\\u{${e.toString(16)}}`;
}
//@ chunk-cgr0tezp.js:9365-9488 placement
function neutralizeEmoji(e) {
  if (!KEEP_JOINER_TEST_RE.test(e)) return e;
  RGI_EMOJI_RE ??= new RegExp("\\p{RGI_Emoji}", "gv");
  return e.replace(RGI_EMOJI_RE, "\u263A").replace(regExp_7, "");
}
//@ chunk-cgr0tezp.js:9488-9500 placement
var MAX_JOINER_INSPECT_LENGTH = 4096;
//@ chunk-cgr0tezp.js:9500-9565 placement
/**
 * isNameWithNoJoinerFixes：名字干净且无需连接符处理。
 */
function isNameWithNoJoinerFixes(e) {
  return isCleanIdentifier_2(e) && !e.includes("  ") && !regExp_6.test(neutralizeEmoji(e));
}
//@ chunk-cgr0tezp.js:9565-9681 placement
function isCleanIdentifier_2(e) {
  return (
    isNonEmptyIdentifier(e) &&
    !INVISIBLE_PATTERNS.test(neutralizeEmoji(e)) &&
    !regExp_8.test(neutralizeEmoji(e)) &&
    !/\uFE0F[\u{1F3FB}-\u{1F3FF}]/u.test(e) &&
    !INVISIBLE_SINGLE_RE.test(e)
  );
}
//@ chunk-cgr0tezp.js:9681-9765 placement
var regExp_9 = new RegExp(
  `[\\p{Cf}\\p{Co}\\p{Cn}\\u2028\\u2029\\u007F-\\u009F${INVISIBLE_CHAR_CLASSES}]`,
  "gu",
);
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
function stripCombiningRepeated(e) {
  let wellFormedString = toWellFormedString(e);
  for (let j = 0; j < 10; j++) {
    let i = stripInvisibleChars_2(wellFormedString);
    if (i === wellFormedString) return wellFormedString;
    wellFormedString = i;
  }
  return wellFormedString;
}
//@ chunk-cgr0tezp.js:10078-10122 placement
var IGNORABLE_CODE_POINT_RE = /\p{Default_Ignorable_Code_Point}/gu;
//@ chunk-cgr0tezp.js:10122-10169 placement
/**
 * 去掉默认可忽略字符。
 */
function stripIgnorables(e) {
  return collapseWhitespace(stripCombiningRepeated(e).replace(IGNORABLE_CODE_POINT_RE, ""));
}
//@ chunk-cgr0tezp.js:10169-10213 placement
function isAsciiOnly(e) {
  return !/[^\0-\x7f]/.test(e);
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
function recursivelySanitizeUnicode(e) {
  if (typeof e === "string") return partiallySanitizeUnicode(e);
  if (Array.isArray(e)) return e.map(recursivelySanitizeUnicode);
  if (e !== null && typeof e === "object") {
    let n = {};
    for (let [key, value] of Object.entries(e)) {
      let s = recursivelySanitizeUnicode(key);
      if (s !== "__proto__") n[s] = recursivelySanitizeUnicode(value);
    }
    return n;
  }
  return e;
}
export {
  escapeForTag,
  MAX_CLEAN_IDENTIFIER_LENGTH,
  escapeXmlText,
  escapeXmlAttribute,
  isAsciiIdentifier,
  escapeAngleBrackets,
  CONTROL_CHARS_OR_ANGLE_RE,
  isNonEmptyIdentifier,
  BRACKET_CONFUSABLES_2,
  INVISIBLE_CHAR_CLASS_SOURCE,
  BOX_DRAWING_RANGES_2,
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
