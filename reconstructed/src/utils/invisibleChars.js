/**
 * utils/invisibleChars.ts
 *
 * 不可见字符清除（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qg0af0yq.js (38)
 * attribution: placement 38
 */
import { normalizeFullWidthSpace, truncateWithCount, takeLastChars } from "./stringUtils.js";
import { nco, stripCombiningRepeated } from "./sanitization.js";
import { Yn } from "./stripAnsi.js";

//@ chunk-qg0af0yq.js:957-1127 placement
var NON_PRINTABLE_ASCII_RE = /[^\t\n\x20-\x7e]/,
  LETTER_RE = /^\p{L}$/u,
  MARK_RE = /^\p{M}$/u,
  WHITE_SPACE_RE = /^\p{White_Space}$/u,
  EMOJI_RE = /^[\p{Emoji}\p{Extended_Pictographic}]$/u,
  EXTENDED_PICTOGRAPHIC_RE = /^\p{Extended_Pictographic}$/u,
  MATH_SYMBOL_RE = /^\p{Sm}$/u;
//@ chunk-qg0af0yq.js:1127-1233 placement
function unicodePropertyClassRe(e, n) {
  let joined = n
    .split(" ")
    .map((r) => `\\p{${e}=${r}}`)
    .join("");
  return new RegExp(`^[${joined}]$`, "u");
}
//@ chunk-qg0af0yq.js:1233-1306 placement
function j(e) {
  return { base: unicodePropertyClassRe("Script", e), mark: unicodePropertyClassRe("Script_Extensions", e) };
}
//@ chunk-qg0af0yq.js:1306-1342 placement
function w(e) {
  return { base: e, mark: e };
}
//@ chunk-qg0af0yq.js:1342-2273 placement
var INVISIBLE_CHAR_SCRIPTS =
    /^[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Yezidi}]$/u,
  Ye = /^[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Hanifi_Rohingya}]$/u,
  K = /^\p{Nd}$/u,
  oe = j(
    "Arabic Syriac Nko Mongolian Devanagari Bengali Gurmukhi Gujarati Oriya Tamil Telugu Kannada Malayalam Sinhala Myanmar Khmer Tibetan",
  ),
  Je = j(
    "Devanagari Bengali Gurmukhi Gujarati Oriya Tamil Telugu Kannada Malayalam Sinhala Myanmar Khmer Tibetan Arabic Syriac Tifinagh",
  ),
  qe = j("Arabic Syriac Mongolian Nko"),
  xe = /^[\p{Script=Khmer}\p{Script=Thai}\p{Script=Lao}\p{Script=Myanmar}]$/u,
  Qe = w(xe),
  ae = /^[0-9]$/,
  ue = w(/^\p{Script=Mongolian}$/u),
  en = w(/^\p{Script=Khmer}$/u),
  U = w(/^\p{Script=Egyptian_Hieroglyphs}$/u),
  ce = w(/^\p{Script=Duployan}$/u),
  de = /^\p{Script=Brahmi}$/u,
  nn = /^[\p{Script=Myanmar}\p{Script=Phags_Pa}\p{Script=Manichaean}]$/u;
/**
 * 判断码点是否为不可见字符：控制字符（除 Tab/换行）、软连字符、各类零宽/方向控制、变体选择符、BOM、韩文填充符、标签字符等。
 */
//@ chunk-qg0af0yq.js:2273-2691 placement
function isInvisibleCodePoint(e) {
  if (e < 160) return (e < 32 && e !== 9 && e !== 10) || e >= 127;
  if (e < 8192)
    return (
      e === 173 ||
      e === 847 ||
      e === 1564 ||
      e === 4447 ||
      e === 4448 ||
      e === 6068 ||
      e === 6069 ||
      (e >= 6155 && e <= 6159)
    );
  if (e < 65536)
    return (
      (e >= 8203 && e <= 8207) ||
      (e >= 8232 && e <= 8238) ||
      (e >= 8288 && e <= 8303) ||
      e === 12644 ||
      (e >= 65024 && e <= 65039) ||
      e === 65279 ||
      e === 65440 ||
      (e >= 65520 && e <= 65531)
    );
  return (
    e === 69759 ||
    (e >= 78896 && e <= 78911) ||
    e === 94180 ||
    (e >= 113824 && e <= 113827) ||
    (e >= 119155 && e <= 119162) ||
    (e >= 917504 && e <= 921599)
  );
}
//@ chunk-qg0af0yq.js:2691-2729 placement
var tn = ["gbeng", "gbsct", "gbwls"],
  Se = 5;
/**
 * 匹配 Unicode 标签字符序列（U+E0061–E007A 后跟 U+E007F 结束），序列是允许的标签时返回结束位置，否则 −1。
 */
//@ chunk-qg0af0yq.js:2729-2944 placement
function matchTagSequenceEnd(e, n) {
  let t = "",
    r = n + Se + 1;
  for (let i = n + 1; i <= r && i < e.length; i++) {
    let s = e[i].codePointAt(0) ?? 0;
    if (s === 917631) return tn.includes(t) ? i : -1;
    if (s < 917601 || s > 917626) return -1;
    t += String.fromCharCode(s - 917504);
  }
  return -1;
}
//@ chunk-qg0af0yq.js:2944-5079 placement
function stripInvisibleChars(e) {
  let n = { tags: 0, bidi: 0, zeroWidth: 0, selectors: 0, other: 0 };
  if (!NON_PRINTABLE_ASCII_RE.test(e))
    return { text: e, removedTotal: 0, removedByClass: n, keptConditional: 0 };
  let t = normalizeFullWidthSpace(e),
    r = [],
    i = 0,
    s = t === e ? 0 : countLoneSurrogates(e);
  n.other += s;
  let o = { ring: Array(A).fill(0), next: 0, size: 0, lastWasHidden: !1, keptConditional: 0 },
    a = 0,
    l,
    S;
  for (let g = 0; g < t.length;) {
    let codePoint = t.codePointAt(g),
      x = g + (codePoint > 65535 ? 2 : 1);
    if (!isInvisibleCodePoint(codePoint)) {
      if (codePoint === 10) ((a = x), (l = void 0), (S = void 0));
      else if (codePoint === 127988) {
        let list = Array.from(t.slice(g, g + 2 * (Se + 2))),
          m = matchTagSequenceEnd(list, 0);
        if (m !== -1) {
          (pushRecentCodePoint(o, codePoint, !1), (g = x));
          for (let L = 1; L <= m; L++)
            (pushRecentCodePoint(o, list[L].codePointAt(0), !0), (g += list[L].length));
          continue;
        }
      }
      (pushRecentCodePoint(o, codePoint, !1), (g = x));
      continue;
    }
    if (z(codePoint)) {
      let h = codePoint === 13 && t.charCodeAt(x) === 10;
      if (g > i) r.push(t.slice(i, g));
      if (((i = x), !h))
        (r.push(`
`),
          s++,
          n.other++,
          pushRecentCodePoint(o, 10, !1),
          (a = x),
          (l = void 0),
          (S = void 0));
      g = x;
      continue;
    }
    let p = x < t.length ? t.codePointAt(x) : void 0,
      d = C(o, 0),
      { lastWasHidden: lastWasHidden } = o,
      f = !1;
    switch (codePoint) {
      case 8204:
      case 8205: {
        if (((f = y(o, codePoint === 8204 ? oe : Je)), !f && codePoint === 8205)) {
          let m = d;
          if (m !== void 0 && (m === 65039 || me(m))) {
            if (((m = C(o, 1)), m !== void 0 && (m === 65039 || me(m)))) m = C(o, 2);
          }
          f = d !== void 0 && d !== 8205 && u(EXTENDED_PICTOGRAPHIC_RE, m) && T(p, EXTENDED_PICTOGRAPHIC_RE);
        }
        if (!f && d !== void 0 && !lastWasHidden)
          f =
            codePoint === 8204
              ? R(p, oe) && !u(WHITE_SPACE_RE, d) && !u(MARK_RE, d)
              : R(p, qe) && !u(LETTER_RE, d) && !u(K, d) && !u(MARK_RE, d);
        break;
      }
      case 8203: {
        let h = recentBaseMatches(o, Qe, !0),
          m = T(p, xe) && !u(MARK_RE, p);
        f = (h && (m || T(p, ae))) || (m && G(o, ae));
        break;
      }
      case 65038:
      case 65039:
        f = d !== void 0 && !lastWasHidden && ((d >= 169 && u(EMOJI_RE, d)) || (sn(d) && p === 8419));
        break;
      case 65024:
      case 65025:
      case 65026:
        f =
          d !== void 0 &&
          !lastWasHidden &&
          (u(U.base, d) ||
            (codePoint === 65024 && ((d >= 8704 && d <= 11007 && u(MATH_SYMBOL_RE, d)) || u(nn, d))));
        break;
      case 8206:
      case 8207:
      case 1564:
        if (codePoint === 1564) {
          if (S === void 0) S = hasRtlContextAhead(Ye, t, a);
          f = S;
        } else {
          if (l === void 0) l = hasRtlContextAhead(INVISIBLE_CHAR_SCRIPTS, t, a);
          f = l;
        }
        f =
          f &&
          !lastWasHidden &&
          (p === void 0 || z(p) || (!isInvisibleCodePoint(p) && !u(MARK_RE, p))) &&
          !joinerHasContext(o, p);
        break;
      case 847:
        f = G(o, MARK_RE) || (!lastWasHidden && T(p, MARK_RE));
        break;
      case 6068:
      case 6069:
        f = y(o, en);
        break;
      case 6155:
      case 6156:
      case 6157:
      case 6158:
      case 6159:
        f = y(o, ue) || (!lastWasHidden && R(p, ue));
        break;
      case 69759:
        f = G(o, de) && T(p, de);
        break;
      default:
        if (codePoint >= 78896 && codePoint <= 78911) f = y(o, U) || (!lastWasHidden && R(p, U));
        else if (codePoint >= 113824 && codePoint <= 113827) f = y(o, ce) || (!lastWasHidden && R(p, ce));
    }
    if (f) pushRecentCodePoint(o, codePoint, !0);
    else {
      if (g > i) r.push(t.slice(i, g));
      ((i = x), s++, n[invisibleCategory(codePoint)]++);
    }
    g = x;
  }
  let { keptConditional: keptConditional } = o;
  if (i === 0) return { text: t, removedTotal: s, removedByClass: n, keptConditional: keptConditional };
  return (
    r.push(t.slice(i)),
    { text: r.join(""), removedTotal: s, removedByClass: n, keptConditional: keptConditional }
  );
}
//@ chunk-qg0af0yq.js:5079-5146 placement
function u(e, n) {
  return n !== void 0 && e.test(String.fromCodePoint(n));
}
//@ chunk-qg0af0yq.js:5146-5184 placement
function V(e, n) {
  return u(LETTER_RE, n) && u(e, n);
}
//@ chunk-qg0af0yq.js:5184-5413 placement
function hasRtlContextAhead(e, n, t) {
  for (let r = t; r < n.length;) {
    let codePoint = n.codePointAt(r);
    if (z(codePoint)) return !1;
    if (
      ((codePoint >= 1424 && codePoint <= 2303) ||
        (codePoint >= 64285 && codePoint <= 65023) ||
        (codePoint >= 65136 && codePoint <= 65279) ||
        (codePoint >= 67584 && codePoint <= 69631) ||
        (codePoint >= 124928 && codePoint <= 126975)) &&
      V(e, codePoint)
    )
      return !0;
    r += codePoint > 65535 ? 2 : 1;
  }
  return !1;
}
//@ chunk-qg0af0yq.js:5413-5453 placement
function pe(e) {
  return e === 1600 || u(INVISIBLE_CHAR_SCRIPTS, e);
}
//@ chunk-qg0af0yq.js:5453-5637 placement
function joinerHasContext(e, n) {
  let t = u(LETTER_RE, n);
  if (!t && !u(K, n)) return !1;
  for (let r = 0; r < e.size; r++) {
    let i = C(e, r);
    if (isInvisibleCodePoint(i)) return !0;
    if (u(MARK_RE, i)) continue;
    return t ? u(LETTER_RE, i) && pe(i) === pe(n) : u(K, i);
  }
  return e.size >= A;
}
//@ chunk-qg0af0yq.js:5637-5718 placement
function z(e) {
  return e === 10 || e === 11 || e === 12 || e === 13 || e === 133 || e === 8232 || e === 8233;
}
//@ chunk-qg0af0yq.js:5718-5727 placement
var A = 16;
//@ chunk-qg0af0yq.js:5727-5846 placement
function pushRecentCodePoint(e, n, t) {
  if (((e.ring[e.next] = n), (e.next = (e.next + 1) % A), e.size < A)) e.size++;
  if (((e.lastWasHidden = t), t)) e.keptConditional++;
}
//@ chunk-qg0af0yq.js:5846-5916 placement
function C(e, n) {
  if (n >= e.size) return;
  return e.ring[(e.next - 1 - n + 2 * A) % A];
}
//@ chunk-qg0af0yq.js:5916-5979 placement
function G(e, n) {
  return e.size > 0 && !e.lastWasHidden && u(n, C(e, 0));
}
//@ chunk-qg0af0yq.js:5979-6013 placement
function y(e, n) {
  return recentBaseMatches(e, n, !1);
}
//@ chunk-qg0af0yq.js:6013-6186 placement
function recentBaseMatches(e, n, t) {
  if (e.lastWasHidden) return !1;
  for (let r = 0; r < e.size; r++) {
    let i = C(e, r);
    if (u(MARK_RE, i)) {
      if (!u(n.mark, i)) return !1;
      continue;
    }
    return t ? u(n.base, i) : V(n.base, i);
  }
  return !1;
}
//@ chunk-qg0af0yq.js:6186-6235 placement
function T(e, n) {
  return e !== void 0 && !isInvisibleCodePoint(e) && u(n, e);
}
//@ chunk-qg0af0yq.js:6235-6289 placement
function R(e, n) {
  return e !== void 0 && !isInvisibleCodePoint(e) && V(n.base, e);
}
//@ chunk-qg0af0yq.js:6289-6332 placement
function me(e) {
  return e >= 127995 && e <= 127999;
}
//@ chunk-qg0af0yq.js:6332-6383 placement
function sn(e) {
  return (e >= 48 && e <= 57) || e === 35 || e === 42;
}
//@ chunk-qg0af0yq.js:6383-6578 placement
function countLoneSurrogates(e) {
  let n = 0;
  for (let t = 0; t < e.length; t++) {
    let code = e.charCodeAt(t);
    if (code >= 55296 && code <= 56319) {
      let code = e.charCodeAt(t + 1);
      if (code >= 56320 && code <= 57343) t++;
      else n++;
    } else if (code >= 56320 && code <= 57343) n++;
  }
  return n;
}
//@ chunk-qg0af0yq.js:6578-6874 placement
function invisibleCategory(e) {
  if (e >= 917504 && e <= 917631) return "tags";
  if (e === 1564 || e === 8206 || e === 8207 || (e >= 8234 && e <= 8238) || (e >= 8294 && e <= 8297))
    return "bidi";
  if ((e >= 8203 && e <= 8205) || e === 8288 || e === 65279) return "zeroWidth";
  if ((e >= 65024 && e <= 65039) || (e >= 917760 && e <= 917999) || (e >= 6155 && e <= 6157) || e === 6159)
    return "selectors";
  return "other";
}
//@ chunk-qg0af0yq.js:6874-7270 placement
function formatInvisibleCharsRemoved(e, n = "review", t = "Enter") {
  let r = e === 1 ? "Removed 1 invisible character" : `Removed ${e} invisible characters`;
  switch (n) {
    case "review":
      return `${r} \xB7 review and press ${t} to send`;
    case "empty":
      return `${r} \xB7 nothing left to send`;
    case "sent":
      return `${r} from the launch prompt before sending it`;
    case "cleaned":
      return `${r} from your prompt`;
    case "pasted":
      return `${r} from the pasted text`;
  }
}
/**
 * 显示不安全字符正则（控制字符、方向覆盖、私用区与未分配码点），以及上下文相关的零宽字符正则（ZWJ/ZWNJ 只在不连接字母或表情时匹配）。
 */
//@ chunk-qg0af0yq.js:7270-7601 placement
var DISPLAY_UNSAFE_CHARS_RE =
    /[\x00-\x1f\x7f-\x9f\u061c\u2028\u2029\u202a-\u202e\u2066-\u2069\p{Co}\p{Cn}]/gu,
  regExp = new RegExp(
    String.raw`[\u200b\u200e\u200f\u2800]|[${nco}\u{110bd}\u{110cd}](?!\p{Nd})|(?<![\p{L}\p{M}\p{Extended_Pictographic}\p{Emoji_Modifier}\ufe0f])[\u200c\u200d]|(?<!\p{M})[\u200c\u200d](?![\p{L}\p{M}\p{Extended_Pictographic}])`,
    "gu",
  );
//@ chunk-qg0af0yq.js:7601-7633 placement
function hr(e) {
  return stripCombiningRepeated(_e(e));
}
/**
 * 把路径等文本转成安全显示形式：规范全角空格，把控制字符、双向控制、私用区、零宽等不可见字符替换为可见转义（与 stripInvisibleChars 的结果对照只替换被移除的字符）。
 */
//@ chunk-qg0af0yq.js:7633-7817 placement
function escapePathForDisplay(e) {
  let replaced = normalizeFullWidthSpace(_e(e)).replace(regExp, he),
    { text: text, removedTotal: removedTotal } = stripInvisibleChars(replaced);
  if (removedTotal === 0) return replaced;
  let list = Array.from(text),
    s = 0,
    o = "";
  for (let a of replaced)
    if (a === list[s]) (s++, (o += a));
    else o += he(a);
  return o;
}
//@ chunk-qg0af0yq.js:7817-7827 placement
var Z = 160;
//@ chunk-qg0af0yq.js:7827-7861 placement
function HD(e) {
  return truncateWithCount(hr(e), Z);
}
/**
 * 路径在磁盘上的指向无法确定（链接或目录无法检查、链接不可解析）时的说明。
 */
//@ chunk-qg0af0yq.js:7861-8022 placement
function unresolvablePathMessage(e) {
  return `Where ${HD(e)} leads on disk could not be determined (a link or directory on the way could not be examined, or the links do not resolve)`;
}
/**
 * 过长路径只保留末尾若干字符显示，前面标注省略的字符数。
 */
//@ chunk-qg0af0yq.js:8022-8137 placement
function truncatePathForDisplay(e) {
  let n = hr(e);
  if (n.length <= Z) return n;
  let t = takeLastChars(n, Z);
  return `[+${n.length - t.length} chars] \u2026${t}`;
}
//@ chunk-qg0af0yq.js:8137-8199 placement
function pIt(e) {
  return e
    .split(
      `
`,
    )
    .map((n) => hr(n)).join(`
`);
}
//@ chunk-qg0af0yq.js:8199-8274 placement
function _e(e) {
  let n = Yn(e);
  return (n === e ? n : n + "\uFFFD").replace(DISPLAY_UNSAFE_CHARS_RE, "\uFFFD");
}
//@ chunk-qg0af0yq.js:8274-8349 placement
function he(e) {
  return `\\u{${e.codePointAt(0).toString(16).toUpperCase()}}`;
}

export {
  hr,
  HD,
  truncatePathForDisplay,
  unresolvablePathMessage,
  stripInvisibleChars,
  formatInvisibleCharsRemoved,
  pIt,
  escapePathForDisplay,
  matchTagSequenceEnd,
};
