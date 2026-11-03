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
import { truncateToLength, toWellFormedString, Dr } from "./stringUtils.js";
import { Yn } from "./stripAnsi.js";

//@ chunk-cgr0tezp.js:797-870 placement
var Pt = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF]|[\uDC00-\uDFFF]/g;
//@ chunk-cgr0tezp.js:870-929 placement
function Nt(e) {
  return e.replace(Pt, (n) => (n.length === 2 ? n : ""));
}
//@ chunk-cgr0tezp.js:929-1030 placement
var INVISIBLE_CHARS_RE =
    /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/gu,
  MAX_SHORT_TEXT = 1024;
/**
 * 清洗遥测字符串（截断、去控制字符）。
 */
//@ chunk-cgr0tezp.js:1030-1128 placement
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
  for (let r = 0; r < 64; r++) {
    let replaced = Nt(n).replace(INVISIBLE_CHARS_RE, "");
    if (replaced === n) return replaced;
    n = replaced;
  }
  return "";
}
/**
 * 清洗日志行。
 */
//@ chunk-cgr0tezp.js:1264-1404 placement
function sanitizeLogLine(e) {
  if (typeof e !== "string") return "";
  return (e.length > 4096 ? e.slice(0, 4096) : e)
    .replace(Pt, (r) => (r.length === 2 ? r : " "))
    .replace(INVISIBLE_CHARS_RE, " ");
}
/**
 * 反复去除不可见字符直到稳定（过长返回 null）。
 */
//@ chunk-cgr0tezp.js:1404-1565 placement
function sanitizeRelayUrl(e) {
  if (e.length > 16384) return null;
  let n = e;
  for (let r = 0; r < 64; r++) {
    let replaced = Nt(n).replace(INVISIBLE_CHARS_RE, "");
    if (replaced === n) return [...replaced].length <= 8192 ? replaced : null;
    n = replaced;
  }
  return null;
}
/**
 * 最多列出三个 URL，其余提示数量。
 */
//@ chunk-cgr0tezp.js:1565-1773 placement
function formatElicitationUrls(e) {
  let mapped = e.slice(0, 3).map((i) => sanitizeRelayUrl(i) ?? "[elicitation URL too long to relay]"),
    r = e.length > 3 ? ` \u2026and ${e.length - 3} more \u2014 re-run in the terminal to see all` : "";
  return `${mapped.join(", ")}${r}`;
}
//@ chunk-cgr0tezp.js:1773-2047 placement
var EXTRA_COMBINING_MARKS =
    "\\u05C8\\u05C9\\u1ADE\\u1ADF\\u1AEC-\\u1AF0\\u{10ECB}-\\u{10ECF}\\u{10EF0}-\\u{10EF9}\\u{1D127}\\u{1D128}\\u{1D250}-\\u{1D252}\\u{1D25B}\\u{1D25C}\\u{1D25F}\\u{1D280}\\u{1D281}",
  COMBINING_MARK_CLASS = `[\\p{M}\\uFF9E\\uFF9F${EXTRA_COMBINING_MARKS}]`,
  LONG_COMBINING_RUN_RE = new RegExp(`${COMBINING_MARK_CLASS}{32,}`, "gu"),
  COMBINING_MARK_RE = new RegExp(COMBINING_MARK_CLASS, "u");
//@ chunk-cgr0tezp.js:2047-2079 placement
var combiningClassCache = new Map(),
  combiningClassOrder = [],
  decompositionCache = new Map();
//@ chunk-cgr0tezp.js:2079-2139 placement
function reordersUnderNfd(e, n) {
  return e !== n && (e + n).normalize("NFD") === n + e;
}
/**
 * 字符的易混淆替代（缓存）。
 */
//@ chunk-cgr0tezp.js:2139-2518 placement
function combiningClassOf(e) {
  let n = combiningClassCache.get(e);
  if (n !== void 0) return n;
  let fromCodePoint = String.fromCodePoint(e),
    i = null;
  if (
    fromCodePoint === "\u0334" ||
    reordersUnderNfd(fromCodePoint, "\u0334") ||
    reordersUnderNfd("\u0345", fromCodePoint)
  ) {
    let s = 0,
      o = combiningClassOrder.length;
    while (s < o && i === null) {
      let a = (s + o) >> 1,
        u = combiningClassOrder[a];
      if (reordersUnderNfd(fromCodePoint, u.sample)) s = a + 1;
      else if (reordersUnderNfd(u.sample, fromCodePoint)) o = a;
      else i = u;
    }
    if (i === null) {
      ((i = { order: s, sample: fromCodePoint }), combiningClassOrder.splice(s, 0, i));
      for (let a = s + 1; a < combiningClassOrder.length; a++) combiningClassOrder[a].order = a;
    }
  }
  return (combiningClassCache.set(e, i), i);
}
//@ chunk-cgr0tezp.js:2518-2662 placement
function decomposeCodePoint(e) {
  let n = decompositionCache.get(e);
  if (n === void 0)
    ((n = Array.from(String.fromCodePoint(e).normalize("NFKD"), (r) => r.codePointAt(0))),
      decompositionCache.set(e, n));
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
/**
 * 计算易混淆字符骨架。
 */
//@ chunk-cgr0tezp.js:2790-3380 placement
function canonicalReorderRun(e) {
  let int32Array = new Int32Array(e.length + 16),
    r = 0;
  for (let a = 0; a < e.length;) {
    let codePoint = e.codePointAt(a);
    a += codePoint > 65535 ? 2 : 1;
    for (let c of decomposeCodePoint(codePoint)) {
      if (r === int32Array.length) {
        let int32Array_2 = new Int32Array(int32Array.length * 2);
        (int32Array_2.set(int32Array), (int32Array = int32Array_2));
      }
      ((int32Array[r++] = c), combiningClassOf(c));
    }
  }
  let int16Array = new Int16Array(r);
  for (let a = 0; a < r; a++) int16Array[a] = combiningClassCache.get(int32Array[a])?.order ?? -1;
  let sliced = int32Array.slice(0, r),
    int32Array_2 = new Int32Array(combiningClassOrder.length);
  for (let a = 0; a < r;) {
    let u = a,
      c = !0;
    while (u < r && int16Array[u] >= 0) ((c &&= u === a || int16Array[u - 1] <= int16Array[u]), u++);
    if (c) {
      a = u + 1;
      continue;
    }
    int32Array_2.fill(0);
    for (let d = a; d < u; d++) int32Array_2[int16Array[d]]++;
    let l = a;
    for (let d = 0; d < int32Array_2.length; d++) {
      let g = int32Array_2[d];
      ((int32Array_2[d] = l), (l += g));
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
  if (e < 768) return !0;
  let n = decompositionCache.get(e);
  if (n === void 0 && !COMBINING_MARK_RE.test(String.fromCodePoint(e))) return !0;
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
    if ((n--, n > 0 && (char.charCodeAt(n) & 64512) === 56320 && (char.charCodeAt(n - 1) & 64512) === 55296))
      n--;
    if (isNormalizationStarter(char.codePointAt(n))) return n;
  }
  return 0;
}
/**
 * 分块做 Unicode 规范化（每块 128 码元在规范化起始字符处切开），避免超长组合序列导致的性能问题。
 */
//@ chunk-cgr0tezp.js:3960-4202 placement
function normalizeChunked(e, n) {
  let r = reorderLongCombiningRuns(e);
  if (r.length <= NORMALIZE_CHUNK) return r.normalize(n);
  let i = [],
    s = "";
  for (let o = 0; o < r.length;) {
    let a = nextStarterIndex(r, o + NORMALIZE_CHUNK),
      normalized = (s + r.slice(o, a)).normalize(n),
      c = a === r.length ? normalized.length : lastStarterIndex(normalized);
    (i.push(normalized.slice(0, c)), (s = normalized.slice(c)), (o = a));
  }
  return i.join("");
}
/**
 * NFKC 归一化。
 */
//@ chunk-cgr0tezp.js:4202-4237 placement
function normalizeNfkc(e) {
  return normalizeChunked(e, "NFKC");
}
//@ chunk-cgr0tezp.js:4237-4273 placement
function HDi(e) {
  return normalizeChunked(e, "NFKD");
}
/**
 * 框线字符范围与替换表。
 */
//@ chunk-cgr0tezp.js:4273-5109 placement
var BOX_DRAWING_RANGES =
    "\u02F9-\u02FC\u230C-\u230F\u231C-\u231F\u239B-\u23CC\u23DC-\u23E1\u2E00-\u2E0D\u2E1C\u2E1D\u2500-\u257F",
  Cr = new Map([
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
/**
 * 尖括号类易混淆字符表。
 */
//@ chunk-cgr0tezp.js:5109-5399 placement
var BRACKET_CONFUSABLES = new Map([
    ...Cr,
    ...Array.from("\u226A\u22D8\u2AA1\u2AF7\u27EA\uFE3D", (e) => [e, "<"]),
    ...Array.from("\u226B\u22D9\u2AA2\u2AF8\u27EB\uFE3E", (e) => [e, ">"]),
  ]),
  XDn = new Map([...BRACKET_CONFUSABLES, ["\u300A", "<"], ["\u300B", ">"]]),
  NDi = new Set(`\u2992\u2994\u2A7A\u2AA7${"\u226B\u22D9\u2AA2\u2AF8\u27EB\uFE3E"}`);
/**
 * 字符及其易混淆变体。
 */
//@ chunk-cgr0tezp.js:5399-5465 placement
function withConfusables(e) {
  let n = e;
  for (let [r, i] of XDn) if (i === e) n += r;
  return n;
}
//@ chunk-cgr0tezp.js:5465-5556 placement
var zt = /[\x00-\x1f\x7f-\x9f\u2028\u2029]/g,
  RI = 256,
  Ywr = /[\x00-\x1f\x7f-\x9f\u2028\u2029<>]/;
//@ chunk-cgr0tezp.js:5556-5605 placement
function Ir(e) {
  return e.length <= RI && !Ywr.test(e);
}
/**
 * 非空标识符。
 */
//@ chunk-cgr0tezp.js:5605-5645 placement
function isNonEmptyIdentifier(e) {
  return e.length > 0 && Ir(e);
}
//@ chunk-cgr0tezp.js:5645-5711 placement
function mft(e) {
  return e.length <= RI && /^[A-Za-z0-9_:.-]+$/.test(e);
}
//@ chunk-cgr0tezp.js:5711-5784 placement
function Xwr(e) {
  return e.length <= RI && /^[\p{L}\p{M}\p{N}_:.-]+$/u.test(e);
}
//@ chunk-cgr0tezp.js:5784-5875 placement
function obs(e) {
  return e.length <= RI && /^(?:\/(?!\.\.?(?:\/|$))[A-Za-z0-9._+@-]+)+$/.test(e);
}
/**
 * 转义 XML 文本并编码控制字符。
 */
//@ chunk-cgr0tezp.js:5875-5973 placement = escapeXml (1)
function escapeXmlText(s) {
  return encodeControlChars(s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
}
/**
 * 控制字符编码为字符实体。
 */
//@ chunk-cgr0tezp.js:5973-6038 placement
function encodeControlChars(e) {
  return e.replace(zt, (n) => `&#${n.charCodeAt(0)};`);
}
/**
 * 转义尖括号。
 */
//@ chunk-cgr0tezp.js:6038-6108 placement = escapeXml (0.793)
function escapeAngleBrackets(s) {
  return s.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
/**
 * 标签内安全文本。
 */
//@ chunk-cgr0tezp.js:6108-6152 placement
function escapeForTag(e) {
  return encodeControlChars(escapeAngleBrackets(String(e ?? "")));
}
//@ chunk-cgr0tezp.js:6152-6206 placement
function tco(e) {
  return escapeForTag(e).replaceAll('"', "&quot;");
}
//@ chunk-cgr0tezp.js:6206-6475 placement
var MAX_ATTRIBUTE_LENGTH = 2000,
  HIDDEN_CHARS_RE = /[\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{Default_Ignorable_Code_Point}\u2800]/gu,
  SYMBOL_CHARS_RE = new RegExp(`[${BOX_DRAWING_RANGES}]|(?![\\x00-\\x7f])[\\p{Sm}\\p{Sk}\\p{So}]`, "gu"),
  BRACKET_CONFUSABLES_RE = new RegExp(`[${[...BRACKET_CONFUSABLES.keys()].join("")}]`, "gu"),
  OPEN_BRACKET_RE = /(?![({\u201A\u201E\u2E42])\p{Ps}/gu,
  CLOSE_BRACKET_RE = /(?![)}])\p{Pe}/gu;
/**
 * 清洗属性值（长度、不可见字符）。
 */
//@ chunk-cgr0tezp.js:6475-6725 placement
function sanitizeAttributeValue(e) {
  if (typeof e !== "string" || e.length > MAX_ATTRIBUTE_LENGTH) return null;
  let trimmed = escapeAngleBrackets(
    normalizeNfkc(e.replace(HIDDEN_CHARS_RE, ""))
      .replace(zt, " ")
      .replace(SYMBOL_CHARS_RE, " ")
      .replace(/\s+/g, " ")
      .replace(BRACKET_CONFUSABLES_RE, (r) => BRACKET_CONFUSABLES.get(r) ?? r)
      .replace(OPEN_BRACKET_RE, "(")
      .replace(CLOSE_BRACKET_RE, ")"),
  ).trim();
  return trimmed === "" || trimmed.length > MAX_ATTRIBUTE_LENGTH ? null : trimmed;
}
/**
 * 不可见字符类正则片段。
 */
//@ chunk-cgr0tezp.js:6725-7145 placement
var INVISIBLE_CHAR_CLASSES = "\\p{Default_Ignorable_Code_Point}\\u2800",
  RS = `\\p{Cc}\\p{Cf}\\p{Cs}\\p{Co}\\p{Cn}\\u2028\\u2029${INVISIBLE_CHAR_CLASSES}`,
  Tje = String.raw`\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\u3164\ufe00-\ufe0f\uffa0\ufff0-\ufffb\uDC00-\uDFFF\uDB40-\uDB43`,
  nco = String.raw`\u0600-\u0605\u06dd\u070f\u0890\u0891\u08e2`,
  gft = `[${Tje}${nco}\\ufeff]*`,
  regExp = new RegExp(`[${Tje}${nco}\\ufeff]`);
/**
 * 在关键词正则字母间插入可选分隔符。
 */
//@ chunk-cgr0tezp.js:7145-7254 placement
function allowSeparatorsInPattern(e) {
  return e.replace(/([a-z)])(?=[a-z(\[])/gi, `$1${gft}`).replace(/\[_-\]\?/g, `(?:[_-]${gft})?`);
}
//@ chunk-cgr0tezp.js:7254-7464 placement
var regExp_2 = new RegExp(`[${RS}]+`, "gu"),
  qe = "\\u200D\\uFE0E\\uFE0F",
  regExp_3 = new RegExp(`(?:(?![${qe}])[${RS}])+`, "gu"),
  regExp_4 = new RegExp(`(?:(?![${qe}\\n])[${RS}])+`, "gu"),
  regExp_5 = new RegExp(`(?<!\\S)[${qe}]+`, "gu"),
  Wr = /\p{Cs}/gu;
/**
 * 去除不可见字符（可保留拼写的连接符）。
 */
//@ chunk-cgr0tezp.js:7464-7977 placement
function stripInvisibleChars(e, n, r) {
  let i = Yn(e.replace(Wr, "\u200B"));
  if (r !== void 0 && "keepSpelledJoiners" in r) {
    let a = new Set();
    if (i.length <= Xr && Zt.test(i)) {
      we ??= new RegExp("\\p{RGI_Emoji}", "gv");
      for (let u of [we, regExp_7])
        for (let { index: index, 0: l } of i.matchAll(u))
          for (let d = index; d < index + l.length; d++) a.add(d);
    }
    return i.replace(regExp_2, (u, c) => {
      let l = "";
      for (let d = 0; d < u.length; d++) l += a.has(c + d) ? u.charAt(d) : l.endsWith(n) ? "" : n;
      return l;
    });
  }
  let s = r?.keepNewlines === !0 || r?.keepEmojiJoiners === !0,
    replaced = i.replace(r?.keepNewlines ? regExp_4 : s ? regExp_3 : regExp_2, n);
  return s ? replaced.replace(regExp_5, "") : replaced;
}
/**
 * 不可见字符与组合符正则。
 */
//@ chunk-cgr0tezp.js:7977-9183 placement
var INVISIBLE_PATTERNS = new RegExp(`[${RS}]`, "u"),
  Kr = /(?! )\p{Zs}|[\uFFFC\u{1D159}\u{13441}\u{13442}\u{16FE4}]|^ | $/u,
  he = "[\\p{M}\\u1160-\\u11FF\\uD7B0-\\uD7FF]",
  regExp_6 = new RegExp(
    `(?<![\\p{L}\\p{N}\\p{M}])${he}|${he}{9}|\\p{Soft_Dotted}\\p{M}*\\u0307|[\\u0131\\u0237]\\p{M}|(?<=[\\p{sc=Latin}\\p{sc=Common}]${he}*)(?!\\p{sc=Inherited})${he}`,
    "u",
  ),
  Vr = String.raw`\u0620\u0626\u0628\u062A-\u062E\u0633-\u063F\u0641-\u0647\u0649\u064A\u066E\u066F\u0678-\u0687\u069A-\u06BF\u06C1\u06C2\u06CC\u06CE\u06D0\u06D1\u06FA-\u06FC\u06FF\u0750-\u0758\u075C-\u076A\u076D-\u0770\u0772\u0775-\u0777\u077A-\u077F\u0886\u0889-\u088D\u088F\u08A0-\u08A9\u08AF\u08B0\u08B3-\u08B8\u08BA-\u08C8`,
  jr = String.raw`\u0620\u0622-\u063F\u0641-\u064A\u066E\u066F\u0671-\u0673\u0675-\u06D3\u06D5\u06EE\u06EF\u06FA-\u06FC\u06FF\u0750-\u077F\u0870-\u0882\u0886\u0889-\u088F\u08A0-\u08AC\u08AE-\u08C8`,
  mapped = [2304, 2432, 2688, 2816, 3072, 3200, 3328].map(zeroWidthJoinerRule),
  Vt = String.raw`[\u0D9A-\u0DC6]`,
  regExp_7 = new RegExp(
    [
      ...mapped,
      `\\u200D(?<=${Vt}\\u0DCA.)(?=${Vt})`,
      `\\u200C(?<=[${Vr}](?:(?=[\\p{sc=Arabic}\\p{sc=Inherited}])(?!\\p{Default_Ignorable_Code_Point})\\p{Mn}){0,8}.)(?=[${jr}])`,
    ].join("|"),
    "gu",
  ),
  regExp_8 = new RegExp(`\\u20E3|\\u263A${he}`, "u"),
  Zt = /[\u200C\u200D\uFE0F\u{E007F}]/u,
  we;
//@ chunk-cgr0tezp.js:9183-9319 placement
function zeroWidthJoinerRule(e) {
  let n = `[${ke(e + 21)}-${ke(e + 57)}]`,
    r = e === 3328 ? "" : `${ke(e + 60)}?`;
  return `[\\u200C\\u200D](?<=${n}${r}${ke(e + 77)}.)(?=${n})`;
}
//@ chunk-cgr0tezp.js:9319-9365 placement
function ke(e) {
  return `\\u{${e.toString(16)}}`;
}
//@ chunk-cgr0tezp.js:9365-9488 placement
function neutralizeEmoji(e) {
  if (!Zt.test(e)) return e;
  return ((we ??= new RegExp("\\p{RGI_Emoji}", "gv")), e.replace(we, "\u263A").replace(regExp_7, ""));
}
//@ chunk-cgr0tezp.js:9488-9500 placement
var Xr = 4096;
//@ chunk-cgr0tezp.js:9500-9565 placement
function sbs(e) {
  return isCleanIdentifier(e) && !e.includes("  ") && !regExp_6.test(neutralizeEmoji(e));
}
//@ chunk-cgr0tezp.js:9565-9681 placement
function isCleanIdentifier(e) {
  return (
    isNonEmptyIdentifier(e) &&
    !INVISIBLE_PATTERNS.test(neutralizeEmoji(e)) &&
    !regExp_8.test(neutralizeEmoji(e)) &&
    !/\uFE0F[\u{1F3FB}-\u{1F3FF}]/u.test(e) &&
    !Kr.test(e)
  );
}
//@ chunk-cgr0tezp.js:9681-9765 placement
var regExp_9 = new RegExp(
  `[\\p{Cf}\\p{Co}\\p{Cn}\\u2028\\u2029\\u007F-\\u009F${INVISIBLE_CHAR_CLASSES}]`,
  "gu",
);
//@ chunk-cgr0tezp.js:9765-9986 placement
function stripInvisibleChars_2(e) {
  let replaced = e.replace(/[\p{Cf}\p{Co}\p{Cn}]/gu, "");
  return (
    (replaced = replaced
      .replace(/[\u200B-\u200F]/g, "")
      .replace(/[\u202A-\u202E]/g, "")
      .replace(/[\u2066-\u2069]/g, "")
      .replace(/[\uFEFF]/g, "")
      .replace(/[\uE000-\uF8FF]/g, "")),
    replaced
  );
}
/**
 * 反复去除组合字符直到稳定。
 */
//@ chunk-cgr0tezp.js:9986-10078 placement
function stripCombiningRepeated(e) {
  let n = toWellFormedString(e);
  for (let r = 0; r < 10; r++) {
    let i = stripInvisibleChars_2(n);
    if (i === n) return n;
    n = i;
  }
  return n;
}
//@ chunk-cgr0tezp.js:10078-10122 placement
var ti = /\p{Default_Ignorable_Code_Point}/gu;
/**
 * 去掉默认可忽略字符。
 */
//@ chunk-cgr0tezp.js:10122-10169 placement
function stripIgnorables(e) {
  return Dr(stripCombiningRepeated(e).replace(ti, ""));
}
//@ chunk-cgr0tezp.js:10169-10213 placement
function isAsciiOnly(e) {
  return !/[^\0-\x7f]/.test(e);
}
/**
 * 清洗提示词中的危险 Unicode（零宽、双向覆盖、标签字符等），防止隐藏指令注入。
 */
//@ chunk-cgr0tezp.js:10213-10427 fingerprint = partiallySanitizeUnicode (0.81)
function partiallySanitizeUnicode(prompt) {
  if (isAsciiOnly(prompt)) return prompt;
  let current = prompt,
    previous = "",
    iterations = 0,
    MAX_ITERATIONS = 10;
  while (current !== previous && iterations < MAX_ITERATIONS)
    ((previous = current),
      (current = normalizeNfkc(current)),
      (current = stripCombiningRepeated(current)),
      iterations++);
  if (iterations >= MAX_ITERATIONS)
    throw Error(
      `Unicode sanitization reached maximum iterations (${MAX_ITERATIONS}) for input: ${prompt.slice(0, 100)}`,
    );
  return current;
}
/**
 * 递归清洗 Unicode：字符串走 partiallySanitizeUnicode（去隐藏/双向控制字符等），数组和对象逐项递归，丢弃 __proto__ 键。
 */
//@ chunk-cgr0tezp.js:10427-10653 placement
function recursivelySanitizeUnicode(e) {
  if (typeof e === "string") return partiallySanitizeUnicode(e);
  if (Array.isArray(e)) return e.map(recursivelySanitizeUnicode);
  if (e !== null && typeof e === "object") {
    let n = {};
    for (let [r, i] of Object.entries(e)) {
      let s = recursivelySanitizeUnicode(r);
      if (s !== "__proto__") n[s] = recursivelySanitizeUnicode(i);
    }
    return n;
  }
  return e;
}

export {
  escapeForTag,
  RI,
  escapeXmlText,
  tco,
  mft,
  escapeAngleBrackets,
  Ywr,
  isNonEmptyIdentifier,
  BRACKET_CONFUSABLES,
  RS,
  BOX_DRAWING_RANGES,
  stripIgnorables,
  stripCombiningRepeated,
  sanitizeTelemetryString,
  withConfusables,
  allowSeparatorsInPattern,
  Tje,
  gft,
  encodeControlChars,
  sanitizeRelayUrl,
  formatElicitationUrls,
  stripInvisibleChars,
  normalizeNfkc,
  recursivelySanitizeUnicode,
  sanitizeAttributeValue,
  isAsciiOnly,
  partiallySanitizeUnicode,
  XDn,
  sanitizeLogLine,
  recursivelySanitizeUnicode_2,
  regExp_9,
  regExp_2,
  MAX_SHORT_TEXT,
  obs,
  Xwr,
  sbs,
  reorderLongCombiningRuns,
  NDi,
  HDi,
  nco,
  regExp,
};
