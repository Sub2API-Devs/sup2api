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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-qg0af0yq.js:957-1127 placement
var NON_PRINTABLE_ASCII_RE = /[^\t\n\x20-\x7e]/;
var LETTER_RE = /^\p{L}$/u;
var MARK_RE = /^\p{M}$/u;
var WHITE_SPACE_RE = /^\p{White_Space}$/u;
var EMOJI_RE = /^[\p{Emoji}\p{Extended_Pictographic}]$/u;
var EXTENDED_PICTOGRAPHIC_RE = /^\p{Extended_Pictographic}$/u;
var MATH_SYMBOL_RE = /^\p{Sm}$/u;
//@ chunk-qg0af0yq.js:1127-1233 placement
function unicodePropertyClassRe(propertyName, scriptNames) {
  let joined = scriptNames
    .split(" ")
    .map((scriptName) => `\\p{${propertyName}=${scriptName}}`)
    .join("");
  return new RegExp(`^[${joined}]$`, "u");
}
//@ chunk-qg0af0yq.js:1233-1306 placement
function scriptAndExtensionClass(scriptNames) {
  return {
    base: unicodePropertyClassRe("Script", scriptNames),
    mark: unicodePropertyClassRe("Script_Extensions", scriptNames),
  };
}
//@ chunk-qg0af0yq.js:1306-1342 placement
function sameScriptRe(scriptClass) {
  return {
    base: scriptClass,
    mark: scriptClass,
  };
}
//@ chunk-qg0af0yq.js:1342-2273 placement
/**
 * 判定不可见字符时使用的 RTL 语言的 base/mark 脚本正则组，以及若干特定脚本的判定正则集合。
 */
var INVISIBLE_CHAR_SCRIPTS; // deferred: uses scriptAndExtensionClass of its import cycle while loading; runs once the cycle is complete
var RTL_CONTEXT_SCRIPTS;
var DECIMAL_DIGIT_RE;
var ZWJ_BASE_SCRIPTS;
var ZWNJ_BASE_SCRIPTS;
var ZWJ_STRICT_SCRIPTS;
var SOUTHEAST_ASIAN_SCRIPTS;
var southeastAsianScriptClasses;
var ASCII_DIGIT_RE;
var MONGOLIAN_SCRIPT_CLASS;
var KHMER_SCRIPT_CLASS;
var EGYPTIAN_HIEROGLYPH_CLASS;
var DUPLOYAN_SCRIPT_CLASS;
var BRAHMI_SCRIPT_RE;
var VERTICAL_ORIENTATION_SCRIPTS;
deferInit("chunk-qg0af0yq.js:1342", () => {
  INVISIBLE_CHAR_SCRIPTS =
    /^[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Yezidi}]$/u;
  RTL_CONTEXT_SCRIPTS = /^[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Hanifi_Rohingya}]$/u;
  DECIMAL_DIGIT_RE = /^\p{Nd}$/u;
  ZWJ_BASE_SCRIPTS = scriptAndExtensionClass(
    "Arabic Syriac Nko Mongolian Devanagari Bengali Gurmukhi Gujarati Oriya Tamil Telugu Kannada Malayalam Sinhala Myanmar Khmer Tibetan",
  );
  ZWNJ_BASE_SCRIPTS = scriptAndExtensionClass(
    "Devanagari Bengali Gurmukhi Gujarati Oriya Tamil Telugu Kannada Malayalam Sinhala Myanmar Khmer Tibetan Arabic Syriac Tifinagh",
  );
  ZWJ_STRICT_SCRIPTS = scriptAndExtensionClass("Arabic Syriac Mongolian Nko");
  SOUTHEAST_ASIAN_SCRIPTS = /^[\p{Script=Khmer}\p{Script=Thai}\p{Script=Lao}\p{Script=Myanmar}]$/u;
  southeastAsianScriptClasses = sameScriptRe(SOUTHEAST_ASIAN_SCRIPTS);
  ASCII_DIGIT_RE = /^[0-9]$/;
  MONGOLIAN_SCRIPT_CLASS = sameScriptRe(/^\p{Script=Mongolian}$/u);
  KHMER_SCRIPT_CLASS = sameScriptRe(/^\p{Script=Khmer}$/u);
  EGYPTIAN_HIEROGLYPH_CLASS = sameScriptRe(/^\p{Script=Egyptian_Hieroglyphs}$/u);
  DUPLOYAN_SCRIPT_CLASS = sameScriptRe(/^\p{Script=Duployan}$/u);
  BRAHMI_SCRIPT_RE = /^\p{Script=Brahmi}$/u;
  VERTICAL_ORIENTATION_SCRIPTS = /^[\p{Script=Myanmar}\p{Script=Phags_Pa}\p{Script=Manichaean}]$/u;
});
//@ chunk-qg0af0yq.js:2273-2691 placement
/**
 * 判断码点是否为不可见字符：控制字符（除 Tab/换行）、软连字符、各类零宽/方向控制、变体选择符、BOM、韩文填充符、标签字符等。
 */
function isInvisibleCodePoint(codePoint) {
  if (codePoint < 160) return (codePoint < 32 && codePoint !== 9 && codePoint !== 10) || codePoint >= 127;
  if (codePoint < 8192)
    return (
      codePoint === 173 ||
      codePoint === 847 ||
      codePoint === 1564 ||
      codePoint === 4447 ||
      codePoint === 4448 ||
      codePoint === 6068 ||
      codePoint === 6069 ||
      (codePoint >= 6155 && codePoint <= 6159)
    );
  if (codePoint < 65536)
    return (
      (codePoint >= 8203 && codePoint <= 8207) ||
      (codePoint >= 8232 && codePoint <= 8238) ||
      (codePoint >= 8288 && codePoint <= 8303) ||
      codePoint === 12644 ||
      (codePoint >= 65024 && codePoint <= 65039) ||
      codePoint === 65279 ||
      codePoint === 65440 ||
      (codePoint >= 65520 && codePoint <= 65531)
    );
  return (
    codePoint === 69759 ||
    (codePoint >= 78896 && codePoint <= 78911) ||
    codePoint === 94180 ||
    (codePoint >= 113824 && codePoint <= 113827) ||
    (codePoint >= 119155 && codePoint <= 119162) ||
    (codePoint >= 917504 && codePoint <= 921599)
  );
}
//@ chunk-qg0af0yq.js:2691-2729 placement
var ALLOWED_TAG_SEQUENCES = ["gbeng", "gbsct", "gbwls"];
var MAX_TAG_SEQUENCE_LEN = 5;
//@ chunk-qg0af0yq.js:2729-2944 placement
/**
 * 匹配 Unicode 标签字符序列（U+E0061–E007A 后跟 U+E007F 结束），序列是允许的标签时返回结束位置，否则 −1。
 */
function matchTagSequenceEnd(codePoints, startIndex) {
  let tagText = "";
  let maxEnd = startIndex + MAX_TAG_SEQUENCE_LEN + 1;
  for (let index = startIndex + 1; index <= maxEnd && index < codePoints.length; index++) {
    let codePoint = codePoints[index].codePointAt(0) ?? 0;
    if (codePoint === 917631) return ALLOWED_TAG_SEQUENCES.includes(tagText) ? index : -1;
    if (codePoint < 917601 || codePoint > 917626) return -1;
    tagText += String.fromCharCode(codePoint - 917504);
  }
  return -1;
}
//@ chunk-qg0af0yq.js:2944-5079 placement
function stripInvisibleChars_2(text) {
  let removedByClass = {
    tags: 0,
    bidi: 0,
    zeroWidth: 0,
    selectors: 0,
    other: 0,
  };
  if (!NON_PRINTABLE_ASCII_RE.test(text))
    return {
      text,
      removedTotal: 0,
      removedByClass,
      keptConditional: 0,
    };
  let normalizedText = normalizeFullWidthSpace(text);
  let keptParts = [];
  let sliceStart = 0;
  let removedTotal = normalizedText === text ? 0 : countLoneSurrogates(text);
  removedByClass.other += removedTotal;
  let history = {
    ring: Array(RECENT_HISTORY_SIZE).fill(0),
    next: 0,
    size: 0,
    lastWasHidden: false,
    keptConditional: 0,
  };
  let lineStart = 0;
  let lrmRlmRtlAhead;
  let almRtlAhead;
  for (let cursor = 0; cursor < normalizedText.length;) {
    let codePoint = normalizedText.codePointAt(cursor);
    let nextIndex = cursor + (codePoint > 65535 ? 2 : 1);
    if (!isInvisibleCodePoint(codePoint)) {
      if (codePoint === 10) {
        lineStart = nextIndex;
        lrmRlmRtlAhead = undefined;
        almRtlAhead = undefined;
      } else if (codePoint === 127988) {
        let list = Array.from(normalizedText.slice(cursor, cursor + 2 * (MAX_TAG_SEQUENCE_LEN + 2)));
        let tagEnd = matchTagSequenceEnd(list, 0);
        if (tagEnd !== -1) {
          pushRecentCodePoint(history, codePoint, false);
          cursor = nextIndex;
          for (let idx = 1; idx <= tagEnd; idx++) {
            pushRecentCodePoint(history, list[idx].codePointAt(0), true);
            cursor += list[idx].length;
          }
          continue;
        }
      }
      pushRecentCodePoint(history, codePoint, false);
      cursor = nextIndex;
      continue;
    }
    if (isLineBreakCodePoint(codePoint)) {
      let isCrLf = codePoint === 13 && normalizedText.charCodeAt(nextIndex) === 10;
      if (cursor > sliceStart) keptParts.push(normalizedText.slice(sliceStart, cursor));
      sliceStart = nextIndex;
      if (!isCrLf) {
        keptParts.push(`
`);
        removedTotal++;
        removedByClass.other++;
        pushRecentCodePoint(history, 10, false);
        lineStart = nextIndex;
        lrmRlmRtlAhead = undefined;
        almRtlAhead = undefined;
      }
      cursor = nextIndex;
      continue;
    }
    let nextCodePoint = nextIndex < normalizedText.length ? normalizedText.codePointAt(nextIndex) : undefined;
    let previousCodePoint = recentAt(history, 0);
    let { lastWasHidden } = history;
    let isKeepable = false;
    switch (codePoint) {
      case 8204:
      case 8205: {
        isKeepable = recentBaseMatchesNoSkip(
          history,
          codePoint === 8204 ? ZWJ_BASE_SCRIPTS : ZWNJ_BASE_SCRIPTS,
        );
        if (!isKeepable && codePoint === 8205) {
          let lookbackCodePoint = previousCodePoint;
          if (
            lookbackCodePoint !== undefined &&
            (lookbackCodePoint === 65039 || isEmojiModifier(lookbackCodePoint))
          ) {
            lookbackCodePoint = recentAt(history, 1);
            if (
              lookbackCodePoint !== undefined &&
              (lookbackCodePoint === 65039 || isEmojiModifier(lookbackCodePoint))
            )
              lookbackCodePoint = recentAt(history, 2);
          }
          isKeepable =
            previousCodePoint !== undefined &&
            previousCodePoint !== 8205 &&
            codePointMatches(EXTENDED_PICTOGRAPHIC_RE, lookbackCodePoint) &&
            currentOrPreviousMatches(nextCodePoint, EXTENDED_PICTOGRAPHIC_RE);
        }
        if (!isKeepable && previousCodePoint !== undefined && !lastWasHidden)
          isKeepable =
            codePoint === 8204
              ? previousMatchesScript(nextCodePoint, ZWJ_BASE_SCRIPTS) &&
                !codePointMatches(WHITE_SPACE_RE, previousCodePoint) &&
                !codePointMatches(MARK_RE, previousCodePoint)
              : previousMatchesScript(nextCodePoint, ZWJ_STRICT_SCRIPTS) &&
                !codePointMatches(LETTER_RE, previousCodePoint) &&
                !codePointMatches(DECIMAL_DIGIT_RE, previousCodePoint) &&
                !codePointMatches(MARK_RE, previousCodePoint);
        break;
      }
      case 8203: {
        let isSoutheastAsianBase = recentBaseMatches(history, southeastAsianScriptClasses, true);
        let nextIsSoutheastAsian =
          currentOrPreviousMatches(nextCodePoint, SOUTHEAST_ASIAN_SCRIPTS) &&
          !codePointMatches(MARK_RE, nextCodePoint);
        isKeepable =
          (isSoutheastAsianBase &&
            (nextIsSoutheastAsian || currentOrPreviousMatches(nextCodePoint, ASCII_DIGIT_RE))) ||
          (nextIsSoutheastAsian && previousBaseMatches(history, ASCII_DIGIT_RE));
        break;
      }
      case 65038:
      case 65039:
        isKeepable =
          previousCodePoint !== undefined &&
          !lastWasHidden &&
          ((previousCodePoint >= 169 && codePointMatches(EMOJI_RE, previousCodePoint)) ||
            (isKeycapBase(previousCodePoint) && nextCodePoint === 8419));
        break;
      case 65024:
      case 65025:
      case 65026:
        isKeepable =
          previousCodePoint !== undefined &&
          !lastWasHidden &&
          (codePointMatches(EGYPTIAN_HIEROGLYPH_CLASS.base, previousCodePoint) ||
            (codePoint === 65024 &&
              ((previousCodePoint >= 8704 &&
                previousCodePoint <= 11007 &&
                codePointMatches(MATH_SYMBOL_RE, previousCodePoint)) ||
                codePointMatches(VERTICAL_ORIENTATION_SCRIPTS, previousCodePoint))));
        break;
      case 8206:
      case 8207:
      case 1564:
        if (codePoint === 1564) {
          if (almRtlAhead === undefined)
            almRtlAhead = hasRtlContextAhead(RTL_CONTEXT_SCRIPTS, normalizedText, lineStart);
          isKeepable = almRtlAhead;
        } else {
          if (lrmRlmRtlAhead === undefined)
            lrmRlmRtlAhead = hasRtlContextAhead(INVISIBLE_CHAR_SCRIPTS, normalizedText, lineStart);
          isKeepable = lrmRlmRtlAhead;
        }
        isKeepable =
          isKeepable &&
          !lastWasHidden &&
          (nextCodePoint === undefined ||
            isLineBreakCodePoint(nextCodePoint) ||
            (!isInvisibleCodePoint(nextCodePoint) && !codePointMatches(MARK_RE, nextCodePoint))) &&
          !joinerHasContext(history, nextCodePoint);
        break;
      case 847:
        isKeepable =
          previousBaseMatches(history, MARK_RE) ||
          (!lastWasHidden && currentOrPreviousMatches(nextCodePoint, MARK_RE));
        break;
      case 6068:
      case 6069:
        isKeepable = recentBaseMatchesNoSkip(history, KHMER_SCRIPT_CLASS);
        break;
      case 6155:
      case 6156:
      case 6157:
      case 6158:
      case 6159:
        isKeepable =
          recentBaseMatchesNoSkip(history, MONGOLIAN_SCRIPT_CLASS) ||
          (!lastWasHidden && previousMatchesScript(nextCodePoint, MONGOLIAN_SCRIPT_CLASS));
        break;
      case 69759:
        isKeepable =
          previousBaseMatches(history, BRAHMI_SCRIPT_RE) &&
          currentOrPreviousMatches(nextCodePoint, BRAHMI_SCRIPT_RE);
        break;
      default:
        if (codePoint >= 78896 && codePoint <= 78911)
          isKeepable =
            recentBaseMatchesNoSkip(history, EGYPTIAN_HIEROGLYPH_CLASS) ||
            (!lastWasHidden && previousMatchesScript(nextCodePoint, EGYPTIAN_HIEROGLYPH_CLASS));
        else if (codePoint >= 113824 && codePoint <= 113827)
          isKeepable =
            recentBaseMatchesNoSkip(history, DUPLOYAN_SCRIPT_CLASS) ||
            (!lastWasHidden && previousMatchesScript(nextCodePoint, DUPLOYAN_SCRIPT_CLASS));
    }
    if (isKeepable) pushRecentCodePoint(history, codePoint, true);
    else {
      if (cursor > sliceStart) keptParts.push(normalizedText.slice(sliceStart, cursor));
      sliceStart = nextIndex;
      removedTotal++;
      removedByClass[invisibleCategory(codePoint)]++;
    }
    cursor = nextIndex;
  }
  let { keptConditional } = history;
  if (sliceStart === 0)
    return {
      text: normalizedText,
      removedTotal,
      removedByClass,
      keptConditional,
    };
  keptParts.push(normalizedText.slice(sliceStart));
  return {
    text: keptParts.join(""),
    removedTotal,
    removedByClass,
    keptConditional,
  };
}
//@ chunk-qg0af0yq.js:5079-5146 placement
function codePointMatches(pattern, codePoint) {
  return codePoint !== undefined && pattern.test(String.fromCodePoint(codePoint));
}
//@ chunk-qg0af0yq.js:5146-5184 placement
function isLetterOfScript(scriptClass, codePoint) {
  return codePointMatches(LETTER_RE, codePoint) && codePointMatches(scriptClass, codePoint);
}
//@ chunk-qg0af0yq.js:5184-5413 placement
function hasRtlContextAhead(scriptClass, text, startIndex) {
  for (let index = startIndex; index < text.length;) {
    let codePoint = text.codePointAt(index);
    if (isLineBreakCodePoint(codePoint)) return false;
    if (
      ((codePoint >= 1424 && codePoint <= 2303) ||
        (codePoint >= 64285 && codePoint <= 65023) ||
        (codePoint >= 65136 && codePoint <= 65279) ||
        (codePoint >= 67584 && codePoint <= 69631) ||
        (codePoint >= 124928 && codePoint <= 126975)) &&
      isLetterOfScript(scriptClass, codePoint)
    )
      return true;
    index += codePoint > 65535 ? 2 : 1;
  }
  return false;
}
//@ chunk-qg0af0yq.js:5413-5453 placement
function scriptBucket(codePoint) {
  return codePoint === 1600 || codePointMatches(INVISIBLE_CHAR_SCRIPTS, codePoint);
}
//@ chunk-qg0af0yq.js:5453-5637 placement
function joinerHasContext(history, codePoint) {
  let isLetter = codePointMatches(LETTER_RE, codePoint);
  if (!isLetter && !codePointMatches(DECIMAL_DIGIT_RE, codePoint)) return false;
  for (let idx = 0; idx < history.size; idx++) {
    let recentCodePoint = recentAt(history, idx);
    if (isInvisibleCodePoint(recentCodePoint)) return true;
    if (codePointMatches(MARK_RE, recentCodePoint)) continue;
    return isLetter
      ? codePointMatches(LETTER_RE, recentCodePoint) &&
          scriptBucket(recentCodePoint) === scriptBucket(codePoint)
      : codePointMatches(DECIMAL_DIGIT_RE, recentCodePoint);
  }
  return history.size >= RECENT_HISTORY_SIZE;
}
//@ chunk-qg0af0yq.js:5637-5718 placement
function isLineBreakCodePoint(codePoint) {
  return (
    codePoint === 10 ||
    codePoint === 11 ||
    codePoint === 12 ||
    codePoint === 13 ||
    codePoint === 133 ||
    codePoint === 8232 ||
    codePoint === 8233
  );
}
//@ chunk-qg0af0yq.js:5718-5727 placement
var RECENT_HISTORY_SIZE = 16;
//@ chunk-qg0af0yq.js:5727-5846 placement
function pushRecentCodePoint(history, codePoint, isHidden) {
  history.ring[history.next] = codePoint;
  history.next = (history.next + 1) % RECENT_HISTORY_SIZE;
  if (history.size < RECENT_HISTORY_SIZE) history.size++;
  history.lastWasHidden = isHidden;
  if (isHidden) history.keptConditional++;
}
//@ chunk-qg0af0yq.js:5846-5916 placement
function recentAt(history, offset) {
  if (offset >= history.size) return;
  return history.ring[(history.next - 1 - offset + 2 * RECENT_HISTORY_SIZE) % RECENT_HISTORY_SIZE];
}
//@ chunk-qg0af0yq.js:5916-5979 placement
function previousBaseMatches(history, pattern) {
  return history.size > 0 && !history.lastWasHidden && codePointMatches(pattern, recentAt(history, 0));
}
//@ chunk-qg0af0yq.js:5979-6013 placement
function recentBaseMatchesNoSkip(history, scriptClasses) {
  return recentBaseMatches(history, scriptClasses, false);
}
//@ chunk-qg0af0yq.js:6013-6186 placement
function recentBaseMatches(history, scriptClasses, matchBaseOnly) {
  if (history.lastWasHidden) return false;
  for (let idx = 0; idx < history.size; idx++) {
    let recentCodePoint = recentAt(history, idx);
    if (codePointMatches(MARK_RE, recentCodePoint)) {
      if (!codePointMatches(scriptClasses.mark, recentCodePoint)) return false;
      continue;
    }
    return matchBaseOnly
      ? codePointMatches(scriptClasses.base, recentCodePoint)
      : isLetterOfScript(scriptClasses.base, recentCodePoint);
  }
  return false;
}
//@ chunk-qg0af0yq.js:6186-6235 placement
function currentOrPreviousMatches(codePoint, pattern) {
  return codePoint !== undefined && !isInvisibleCodePoint(codePoint) && codePointMatches(pattern, codePoint);
}
//@ chunk-qg0af0yq.js:6235-6289 placement
function previousMatchesScript(codePoint, scriptClass) {
  return (
    codePoint !== undefined &&
    !isInvisibleCodePoint(codePoint) &&
    isLetterOfScript(scriptClass.base, codePoint)
  );
}
//@ chunk-qg0af0yq.js:6289-6332 placement
function isEmojiModifier(codePoint) {
  return codePoint >= 127995 && codePoint <= 127999;
}
//@ chunk-qg0af0yq.js:6332-6383 placement
function isKeycapBase(codePoint) {
  return (codePoint >= 48 && codePoint <= 57) || codePoint === 35 || codePoint === 42;
}
//@ chunk-qg0af0yq.js:6383-6578 placement
function countLoneSurrogates(text) {
  let loneSurrogateCount = 0;
  for (let idx = 0; idx < text.length; idx++) {
    let code = text.charCodeAt(idx);
    if (code >= 55296 && code <= 56319) {
      let code = text.charCodeAt(idx + 1);
      if (code >= 56320 && code <= 57343) idx++;
      else loneSurrogateCount++;
    } else if (code >= 56320 && code <= 57343) loneSurrogateCount++;
  }
  return loneSurrogateCount;
}
//@ chunk-qg0af0yq.js:6578-6874 placement
function invisibleCategory(codePoint) {
  if (codePoint >= 917504 && codePoint <= 917631) return "tags";
  if (
    codePoint === 1564 ||
    codePoint === 8206 ||
    codePoint === 8207 ||
    (codePoint >= 8234 && codePoint <= 8238) ||
    (codePoint >= 8294 && codePoint <= 8297)
  )
    return "bidi";
  if ((codePoint >= 8203 && codePoint <= 8205) || codePoint === 8288 || codePoint === 65279)
    return "zeroWidth";
  if (
    (codePoint >= 65024 && codePoint <= 65039) ||
    (codePoint >= 917760 && codePoint <= 917999) ||
    (codePoint >= 6155 && codePoint <= 6157) ||
    codePoint === 6159
  )
    return "selectors";
  return "other";
}
//@ chunk-qg0af0yq.js:6874-7270 placement
function formatInvisibleCharsRemoved(removedTotal, context = "review", confirmKey = "Enter") {
  let summary =
    removedTotal === 1 ? "Removed 1 invisible character" : `Removed ${removedTotal} invisible characters`;
  switch (context) {
    case "review":
      return `${summary} \xB7 review and press ${confirmKey} to send`;
    case "empty":
      return `${summary} \xB7 nothing left to send`;
    case "sent":
      return `${summary} from the launch prompt before sending it`;
    case "cleaned":
      return `${summary} from your prompt`;
    case "pasted":
      return `${summary} from the pasted text`;
  }
}
//@ chunk-qg0af0yq.js:7270-7601 placement
/**
 * 显示不安全字符正则（控制字符、方向覆盖、私用区与未分配码点），以及上下文相关的零宽字符正则（ZWJ/ZWNJ 只在不连接字母或表情时匹配）。
 */
var DISPLAY_UNSAFE_CHARS_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp;
deferInit("chunk-qg0af0yq.js:7270", () => {
  DISPLAY_UNSAFE_CHARS_RE = /[\x00-\x1f\x7f-\x9f\u061c\u2028\u2029\u202a-\u202e\u2066-\u2069\p{Co}\p{Cn}]/gu;
  regExp = new RegExp(
    String.raw`[\u200b\u200e\u200f\u2800]|[${INVISIBLE_FORMAT_RANGES}\u{110bd}\u{110cd}](?!\p{Nd})|(?<![\p{L}\p{M}\p{Extended_Pictographic}\p{Emoji_Modifier}\ufe0f])[\u200c\u200d]|(?<!\p{M})[\u200c\u200d](?![\p{L}\p{M}\p{Extended_Pictographic}])`,
    "gu",
  );
});
//@ chunk-qg0af0yq.js:7601-7633 placement
/**
 * 去掉文本中的不可见字符（保留合法连接符等）。
 */
function stripInvisibleChars(text) {
  return stripCombiningRepeated(escapeDisplayUnsafeChars(text));
}
//@ chunk-qg0af0yq.js:7633-7817 placement
/**
 * 把路径等文本转成安全显示形式：规范全角空格，把控制字符、双向控制、私用区、零宽等不可见字符替换为可见转义（与 stripInvisibleChars 的结果对照只替换被移除的字符）。
 */
function escapePathForDisplay(inputPath) {
  let replaced = normalizeFullWidthSpace(escapeDisplayUnsafeChars(inputPath)).replace(regExp, unicodeEscape);
  let { text, removedTotal } = stripInvisibleChars_2(replaced);
  if (removedTotal === 0) return replaced;
  let list = Array.from(text);
  let keptIndex = 0;
  let escaped = "";
  for (let character of replaced)
    if (character === list[keptIndex]) {
      keptIndex++;
      escaped += character;
    } else escaped += unicodeEscape(character);
  return escaped;
}
//@ chunk-qg0af0yq.js:7817-7827 placement
var MAX_DISPLAY_PATH_CHARS = 160;
//@ chunk-qg0af0yq.js:7827-7861 placement
/**
 * 清理不可见字符并截断到展示宽度，用于展示路径。
 */
function truncatePathForDisplay(path) {
  return truncateWithCount(stripInvisibleChars(path), MAX_DISPLAY_PATH_CHARS);
}
//@ chunk-qg0af0yq.js:7861-8022 placement
/**
 * 路径在磁盘上的指向无法确定（链接或目录无法检查、链接不可解析）时的说明。
 */
function unresolvablePathMessage(path) {
  return `Where ${truncatePathForDisplay(path)} leads on disk could not be determined (a link or directory on the way could not be examined, or the links do not resolve)`;
}
//@ chunk-qg0af0yq.js:8022-8137 placement
/**
 * 过长路径只保留末尾若干字符显示，前面标注省略的字符数。
 */
function truncatePathForDisplay_2(path) {
  let stripped = stripInvisibleChars(path);
  if (stripped.length <= MAX_DISPLAY_PATH_CHARS) return stripped;
  let tail = takeLastChars(stripped, MAX_DISPLAY_PATH_CHARS);
  return `[+${stripped.length - tail.length} chars] \u2026${tail}`;
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
function escapeDisplayUnsafeChars(text) {
  let withoutAnsi = stripAnsi(text);
  return (withoutAnsi === text ? withoutAnsi : withoutAnsi + "\uFFFD").replace(
    DISPLAY_UNSAFE_CHARS_RE,
    "\uFFFD",
  );
}
//@ chunk-qg0af0yq.js:8274-8349 placement
function unicodeEscape(character) {
  return `\\u{${character.codePointAt(0).toString(16).toUpperCase()}}`;
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
