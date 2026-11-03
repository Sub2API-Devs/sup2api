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
import { INVISIBLE_FORMAT_RANGES, stripCombiningRepeated } from "./sanitization.js";
import { stripAnsi } from "./stripAnsi.js";

//@ chunk-qg0af0yq.js:957-1127 placement
var NON_PRINTABLE_ASCII_RE = /[^\t\n\x20-\x7e]/;
var LETTER_RE = /^\p{L}$/u;
var MARK_RE = /^\p{M}$/u;
var WHITE_SPACE_RE = /^\p{White_Space}$/u;
var EMOJI_RE = /^[\p{Emoji}\p{Extended_Pictographic}]$/u;
var EXTENDED_PICTOGRAPHIC_RE = /^\p{Extended_Pictographic}$/u;
var MATH_SYMBOL_RE = /^\p{Sm}$/u;
//@ chunk-qg0af0yq.js:1127-1233 placement
function unicodePropertyClassRe(e, n) {
  let joined = n
    .split(" ")
    .map((r) => `\\p{${e}=${r}}`)
    .join("");
  return new RegExp(`^[${joined}]$`, "u");
}
//@ chunk-qg0af0yq.js:1233-1306 placement
function scriptAndExtensionClass(e) {
  return {
    base: unicodePropertyClassRe("Script", e),
    mark: unicodePropertyClassRe("Script_Extensions", e),
  };
}
//@ chunk-qg0af0yq.js:1306-1342 placement
function sameScriptRe(e) {
  return {
    base: e,
    mark: e,
  };
}
//@ chunk-qg0af0yq.js:1342-2273 placement
/**
 * 判定不可见字符时使用的 RTL 语言的 base/mark 脚本正则组，以及若干特定脚本的判定正则集合。
 */
var INVISIBLE_CHAR_SCRIPTS =
  /^[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Yezidi}]$/u;
var RTL_CONTEXT_SCRIPTS =
  /^[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Hanifi_Rohingya}]$/u;
var DECIMAL_DIGIT_RE = /^\p{Nd}$/u;
var ZWJ_BASE_SCRIPTS = scriptAndExtensionClass(
  "Arabic Syriac Nko Mongolian Devanagari Bengali Gurmukhi Gujarati Oriya Tamil Telugu Kannada Malayalam Sinhala Myanmar Khmer Tibetan",
);
var ZWNJ_BASE_SCRIPTS = scriptAndExtensionClass(
  "Devanagari Bengali Gurmukhi Gujarati Oriya Tamil Telugu Kannada Malayalam Sinhala Myanmar Khmer Tibetan Arabic Syriac Tifinagh",
);
var ZWJ_STRICT_SCRIPTS = scriptAndExtensionClass("Arabic Syriac Mongolian Nko");
var SOUTHEAST_ASIAN_SCRIPTS = /^[\p{Script=Khmer}\p{Script=Thai}\p{Script=Lao}\p{Script=Myanmar}]$/u;
var southeastAsianScriptClasses = sameScriptRe(SOUTHEAST_ASIAN_SCRIPTS);
var ASCII_DIGIT_RE = /^[0-9]$/;
var MONGOLIAN_SCRIPT_CLASS = sameScriptRe(/^\p{Script=Mongolian}$/u);
var KHMER_SCRIPT_CLASS = sameScriptRe(/^\p{Script=Khmer}$/u);
var EGYPTIAN_HIEROGLYPH_CLASS = sameScriptRe(/^\p{Script=Egyptian_Hieroglyphs}$/u);
var DUPLOYAN_SCRIPT_CLASS = sameScriptRe(/^\p{Script=Duployan}$/u);
var BRAHMI_SCRIPT_RE = /^\p{Script=Brahmi}$/u;
var VERTICAL_ORIENTATION_SCRIPTS = /^[\p{Script=Myanmar}\p{Script=Phags_Pa}\p{Script=Manichaean}]$/u;
//@ chunk-qg0af0yq.js:2273-2691 placement
/**
 * 判断码点是否为不可见字符：控制字符（除 Tab/换行）、软连字符、各类零宽/方向控制、变体选择符、BOM、韩文填充符、标签字符等。
 */
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
var ALLOWED_TAG_SEQUENCES = ["gbeng", "gbsct", "gbwls"];
var MAX_TAG_SEQUENCE_LEN = 5;
//@ chunk-qg0af0yq.js:2729-2944 placement
/**
 * 匹配 Unicode 标签字符序列（U+E0061–E007A 后跟 U+E007F 结束），序列是允许的标签时返回结束位置，否则 −1。
 */
function matchTagSequenceEnd(e, n) {
  let t = "";
  let r = n + MAX_TAG_SEQUENCE_LEN + 1;
  for (let i = n + 1; i <= r && i < e.length; i++) {
    let s = e[i].codePointAt(0) ?? 0;
    if (s === 917631) return ALLOWED_TAG_SEQUENCES.includes(t) ? i : -1;
    if (s < 917601 || s > 917626) return -1;
    t += String.fromCharCode(s - 917504);
  }
  return -1;
}
//@ chunk-qg0af0yq.js:2944-5079 placement
function stripInvisibleChars_2(e) {
  let n = {
    tags: 0,
    bidi: 0,
    zeroWidth: 0,
    selectors: 0,
    other: 0,
  };
  if (!NON_PRINTABLE_ASCII_RE.test(e))
    return {
      text: e,
      removedTotal: 0,
      removedByClass: n,
      keptConditional: 0,
    };
  let t = normalizeFullWidthSpace(e);
  let r = [];
  let i = 0;
  let s = t === e ? 0 : countLoneSurrogates(e);
  n.other += s;
  let o = {
    ring: Array(RECENT_HISTORY_SIZE).fill(0),
    next: 0,
    size: 0,
    lastWasHidden: false,
    keptConditional: 0,
  };
  let a = 0;
  let l;
  let S;
  for (let g = 0; g < t.length;) {
    let codePoint = t.codePointAt(g);
    let x = g + (codePoint > 65535 ? 2 : 1);
    if (!isInvisibleCodePoint(codePoint)) {
      if (codePoint === 10) {
        a = x;
        l = undefined;
        S = undefined;
      } else if (codePoint === 127988) {
        let list = Array.from(t.slice(g, g + 2 * (MAX_TAG_SEQUENCE_LEN + 2)));
        let m = matchTagSequenceEnd(list, 0);
        if (m !== -1) {
          pushRecentCodePoint(o, codePoint, false);
          g = x;
          for (let idx = 1; idx <= m; idx++) {
            pushRecentCodePoint(o, list[idx].codePointAt(0), true);
            g += list[idx].length;
          }
          continue;
        }
      }
      pushRecentCodePoint(o, codePoint, false);
      g = x;
      continue;
    }
    if (isLineBreakCodePoint(codePoint)) {
      let h = codePoint === 13 && t.charCodeAt(x) === 10;
      if (g > i) r.push(t.slice(i, g));
      i = x;
      if (!h) {
        r.push(`
`);
        s++;
        n.other++;
        pushRecentCodePoint(o, 10, false);
        a = x;
        l = undefined;
        S = undefined;
      }
      g = x;
      continue;
    }
    let p = x < t.length ? t.codePointAt(x) : undefined;
    let d = recentAt(o, 0);
    let { lastWasHidden } = o;
    let f = false;
    switch (codePoint) {
      case 8204:
      case 8205: {
        f = recentBaseMatchesNoSkip(o, codePoint === 8204 ? ZWJ_BASE_SCRIPTS : ZWNJ_BASE_SCRIPTS);
        if (!f && codePoint === 8205) {
          let m = d;
          if (m !== undefined && (m === 65039 || isEmojiModifier(m))) {
            m = recentAt(o, 1);
            if (m !== undefined && (m === 65039 || isEmojiModifier(m))) m = recentAt(o, 2);
          }
          f =
            d !== undefined &&
            d !== 8205 &&
            codePointMatches(EXTENDED_PICTOGRAPHIC_RE, m) &&
            currentOrPreviousMatches(p, EXTENDED_PICTOGRAPHIC_RE);
        }
        if (!f && d !== undefined && !lastWasHidden)
          f =
            codePoint === 8204
              ? previousMatchesScript(p, ZWJ_BASE_SCRIPTS) &&
                !codePointMatches(WHITE_SPACE_RE, d) &&
                !codePointMatches(MARK_RE, d)
              : previousMatchesScript(p, ZWJ_STRICT_SCRIPTS) &&
                !codePointMatches(LETTER_RE, d) &&
                !codePointMatches(DECIMAL_DIGIT_RE, d) &&
                !codePointMatches(MARK_RE, d);
        break;
      }
      case 8203: {
        let h = recentBaseMatches(o, southeastAsianScriptClasses, true);
        let m = currentOrPreviousMatches(p, SOUTHEAST_ASIAN_SCRIPTS) && !codePointMatches(MARK_RE, p);
        f =
          (h && (m || currentOrPreviousMatches(p, ASCII_DIGIT_RE))) ||
          (m && previousBaseMatches(o, ASCII_DIGIT_RE));
        break;
      }
      case 65038:
      case 65039:
        f =
          d !== undefined &&
          !lastWasHidden &&
          ((d >= 169 && codePointMatches(EMOJI_RE, d)) || (isKeycapBase(d) && p === 8419));
        break;
      case 65024:
      case 65025:
      case 65026:
        f =
          d !== undefined &&
          !lastWasHidden &&
          (codePointMatches(EGYPTIAN_HIEROGLYPH_CLASS.base, d) ||
            (codePoint === 65024 &&
              ((d >= 8704 && d <= 11007 && codePointMatches(MATH_SYMBOL_RE, d)) ||
                codePointMatches(VERTICAL_ORIENTATION_SCRIPTS, d))));
        break;
      case 8206:
      case 8207:
      case 1564:
        if (codePoint === 1564) {
          if (S === undefined) S = hasRtlContextAhead(RTL_CONTEXT_SCRIPTS, t, a);
          f = S;
        } else {
          if (l === undefined) l = hasRtlContextAhead(INVISIBLE_CHAR_SCRIPTS, t, a);
          f = l;
        }
        f =
          f &&
          !lastWasHidden &&
          (p === undefined ||
            isLineBreakCodePoint(p) ||
            (!isInvisibleCodePoint(p) && !codePointMatches(MARK_RE, p))) &&
          !joinerHasContext(o, p);
        break;
      case 847:
        f = previousBaseMatches(o, MARK_RE) || (!lastWasHidden && currentOrPreviousMatches(p, MARK_RE));
        break;
      case 6068:
      case 6069:
        f = recentBaseMatchesNoSkip(o, KHMER_SCRIPT_CLASS);
        break;
      case 6155:
      case 6156:
      case 6157:
      case 6158:
      case 6159:
        f =
          recentBaseMatchesNoSkip(o, MONGOLIAN_SCRIPT_CLASS) ||
          (!lastWasHidden && previousMatchesScript(p, MONGOLIAN_SCRIPT_CLASS));
        break;
      case 69759:
        f = previousBaseMatches(o, BRAHMI_SCRIPT_RE) && currentOrPreviousMatches(p, BRAHMI_SCRIPT_RE);
        break;
      default:
        if (codePoint >= 78896 && codePoint <= 78911)
          f =
            recentBaseMatchesNoSkip(o, EGYPTIAN_HIEROGLYPH_CLASS) ||
            (!lastWasHidden && previousMatchesScript(p, EGYPTIAN_HIEROGLYPH_CLASS));
        else if (codePoint >= 113824 && codePoint <= 113827)
          f =
            recentBaseMatchesNoSkip(o, DUPLOYAN_SCRIPT_CLASS) ||
            (!lastWasHidden && previousMatchesScript(p, DUPLOYAN_SCRIPT_CLASS));
    }
    if (f) pushRecentCodePoint(o, codePoint, true);
    else {
      if (g > i) r.push(t.slice(i, g));
      i = x;
      s++;
      n[invisibleCategory(codePoint)]++;
    }
    g = x;
  }
  let { keptConditional } = o;
  if (i === 0)
    return {
      text: t,
      removedTotal: s,
      removedByClass: n,
      keptConditional,
    };
  r.push(t.slice(i));
  return {
    text: r.join(""),
    removedTotal: s,
    removedByClass: n,
    keptConditional,
  };
}
//@ chunk-qg0af0yq.js:5079-5146 placement
function codePointMatches(e, n) {
  return n !== undefined && e.test(String.fromCodePoint(n));
}
//@ chunk-qg0af0yq.js:5146-5184 placement
function isLetterOfScript(base, n) {
  return codePointMatches(LETTER_RE, n) && codePointMatches(base, n);
}
//@ chunk-qg0af0yq.js:5184-5413 placement
function hasRtlContextAhead(e, n, t) {
  for (let r = t; r < n.length;) {
    let codePoint = n.codePointAt(r);
    if (isLineBreakCodePoint(codePoint)) return false;
    if (
      ((codePoint >= 1424 && codePoint <= 2303) ||
        (codePoint >= 64285 && codePoint <= 65023) ||
        (codePoint >= 65136 && codePoint <= 65279) ||
        (codePoint >= 67584 && codePoint <= 69631) ||
        (codePoint >= 124928 && codePoint <= 126975)) &&
      isLetterOfScript(e, codePoint)
    )
      return true;
    r += codePoint > 65535 ? 2 : 1;
  }
  return false;
}
//@ chunk-qg0af0yq.js:5413-5453 placement
function scriptBucket(e) {
  return e === 1600 || codePointMatches(INVISIBLE_CHAR_SCRIPTS, e);
}
//@ chunk-qg0af0yq.js:5453-5637 placement
function joinerHasContext(e, n) {
  let t = codePointMatches(LETTER_RE, n);
  if (!t && !codePointMatches(DECIMAL_DIGIT_RE, n)) return false;
  for (let idx = 0; idx < e.size; idx++) {
    let i = recentAt(e, idx);
    if (isInvisibleCodePoint(i)) return true;
    if (codePointMatches(MARK_RE, i)) continue;
    return t
      ? codePointMatches(LETTER_RE, i) && scriptBucket(i) === scriptBucket(n)
      : codePointMatches(DECIMAL_DIGIT_RE, i);
  }
  return e.size >= RECENT_HISTORY_SIZE;
}
//@ chunk-qg0af0yq.js:5637-5718 placement
function isLineBreakCodePoint(e) {
  return e === 10 || e === 11 || e === 12 || e === 13 || e === 133 || e === 8232 || e === 8233;
}
//@ chunk-qg0af0yq.js:5718-5727 placement
var RECENT_HISTORY_SIZE = 16;
//@ chunk-qg0af0yq.js:5727-5846 placement
function pushRecentCodePoint(e, n, t) {
  e.ring[e.next] = n;
  e.next = (e.next + 1) % RECENT_HISTORY_SIZE;
  if (e.size < RECENT_HISTORY_SIZE) e.size++;
  e.lastWasHidden = t;
  if (t) e.keptConditional++;
}
//@ chunk-qg0af0yq.js:5846-5916 placement
function recentAt(e, n) {
  if (n >= e.size) return;
  return e.ring[(e.next - 1 - n + 2 * RECENT_HISTORY_SIZE) % RECENT_HISTORY_SIZE];
}
//@ chunk-qg0af0yq.js:5916-5979 placement
function previousBaseMatches(e, n) {
  return e.size > 0 && !e.lastWasHidden && codePointMatches(n, recentAt(e, 0));
}
//@ chunk-qg0af0yq.js:5979-6013 placement
function recentBaseMatchesNoSkip(e, n) {
  return recentBaseMatches(e, n, false);
}
//@ chunk-qg0af0yq.js:6013-6186 placement
function recentBaseMatches(e, n, t) {
  if (e.lastWasHidden) return false;
  for (let idx = 0; idx < e.size; idx++) {
    let i = recentAt(e, idx);
    if (codePointMatches(MARK_RE, i)) {
      if (!codePointMatches(n.mark, i)) return false;
      continue;
    }
    return t ? codePointMatches(n.base, i) : isLetterOfScript(n.base, i);
  }
  return false;
}
//@ chunk-qg0af0yq.js:6186-6235 placement
function currentOrPreviousMatches(e, n) {
  return e !== undefined && !isInvisibleCodePoint(e) && codePointMatches(n, e);
}
//@ chunk-qg0af0yq.js:6235-6289 placement
function previousMatchesScript(e, n) {
  return e !== undefined && !isInvisibleCodePoint(e) && isLetterOfScript(n.base, e);
}
//@ chunk-qg0af0yq.js:6289-6332 placement
function isEmojiModifier(e) {
  return e >= 127995 && e <= 127999;
}
//@ chunk-qg0af0yq.js:6332-6383 placement
function isKeycapBase(e) {
  return (e >= 48 && e <= 57) || e === 35 || e === 42;
}
//@ chunk-qg0af0yq.js:6383-6578 placement
function countLoneSurrogates(e) {
  let n = 0;
  for (let idx = 0; idx < e.length; idx++) {
    let code = e.charCodeAt(idx);
    if (code >= 55296 && code <= 56319) {
      let code = e.charCodeAt(idx + 1);
      if (code >= 56320 && code <= 57343) idx++;
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
function formatInvisibleCharsRemoved(removedTotal, n = "review", t = "Enter") {
  let r =
    removedTotal === 1 ? "Removed 1 invisible character" : `Removed ${removedTotal} invisible characters`;
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
//@ chunk-qg0af0yq.js:7270-7601 placement
/**
 * 显示不安全字符正则（控制字符、方向覆盖、私用区与未分配码点），以及上下文相关的零宽字符正则（ZWJ/ZWNJ 只在不连接字母或表情时匹配）。
 */
var DISPLAY_UNSAFE_CHARS_RE =
  /[\x00-\x1f\x7f-\x9f\u061c\u2028\u2029\u202a-\u202e\u2066-\u2069\p{Co}\p{Cn}]/gu;
var regExp = new RegExp(
  String.raw`[\u200b\u200e\u200f\u2800]|[${INVISIBLE_FORMAT_RANGES}\u{110bd}\u{110cd}](?!\p{Nd})|(?<![\p{L}\p{M}\p{Extended_Pictographic}\p{Emoji_Modifier}\ufe0f])[\u200c\u200d]|(?<!\p{M})[\u200c\u200d](?![\p{L}\p{M}\p{Extended_Pictographic}])`,
  "gu",
);
//@ chunk-qg0af0yq.js:7601-7633 placement
/**
 * 去掉文本中的不可见字符（保留合法连接符等）。
 */
function stripInvisibleChars(e) {
  return stripCombiningRepeated(escapeDisplayUnsafeChars(e));
}
//@ chunk-qg0af0yq.js:7633-7817 placement
/**
 * 把路径等文本转成安全显示形式：规范全角空格，把控制字符、双向控制、私用区、零宽等不可见字符替换为可见转义（与 stripInvisibleChars 的结果对照只替换被移除的字符）。
 */
function escapePathForDisplay(e) {
  let replaced = normalizeFullWidthSpace(escapeDisplayUnsafeChars(e)).replace(regExp, unicodeEscape);
  let { text, removedTotal } = stripInvisibleChars_2(replaced);
  if (removedTotal === 0) return replaced;
  let list = Array.from(text);
  let s = 0;
  let o = "";
  for (let a of replaced)
    if (a === list[s]) {
      s++;
      o += a;
    } else o += unicodeEscape(a);
  return o;
}
//@ chunk-qg0af0yq.js:7817-7827 placement
var MAX_DISPLAY_PATH_CHARS = 160;
//@ chunk-qg0af0yq.js:7827-7861 placement
/**
 * 清理不可见字符并截断到展示宽度，用于展示路径。
 */
function truncatePathForDisplay(e) {
  return truncateWithCount(stripInvisibleChars(e), MAX_DISPLAY_PATH_CHARS);
}
//@ chunk-qg0af0yq.js:7861-8022 placement
/**
 * 路径在磁盘上的指向无法确定（链接或目录无法检查、链接不可解析）时的说明。
 */
function unresolvablePathMessage(e) {
  return `Where ${truncatePathForDisplay(e)} leads on disk could not be determined (a link or directory on the way could not be examined, or the links do not resolve)`;
}
//@ chunk-qg0af0yq.js:8022-8137 placement
/**
 * 过长路径只保留末尾若干字符显示，前面标注省略的字符数。
 */
function truncatePathForDisplay_2(e) {
  let n = stripInvisibleChars(e);
  if (n.length <= MAX_DISPLAY_PATH_CHARS) return n;
  let t = takeLastChars(n, MAX_DISPLAY_PATH_CHARS);
  return `[+${n.length - t.length} chars] \u2026${t}`;
}
//@ chunk-qg0af0yq.js:8137-8199 placement
/**
 * 按行清理不可见字符后重新拼接。
 */
function stripInvisibleCharsMultiLine(details) {
  return details
    .split(
      `
`,
    )
    .map((line) => stripInvisibleChars(line)).join(`
`);
}
//@ chunk-qg0af0yq.js:8199-8274 placement
function escapeDisplayUnsafeChars(e) {
  let n = stripAnsi(e);
  return (n === e ? n : n + "\uFFFD").replace(DISPLAY_UNSAFE_CHARS_RE, "\uFFFD");
}
//@ chunk-qg0af0yq.js:8274-8349 placement
function unicodeEscape(e) {
  return `\\u{${e.codePointAt(0).toString(16).toUpperCase()}}`;
}
export {
  stripInvisibleChars,
  truncatePathForDisplay,
  truncatePathForDisplay_2,
  unresolvablePathMessage,
  formatInvisibleCharsRemoved,
  stripInvisibleChars_2,
  stripInvisibleCharsMultiLine,
  escapePathForDisplay,
  matchTagSequenceEnd,
};
