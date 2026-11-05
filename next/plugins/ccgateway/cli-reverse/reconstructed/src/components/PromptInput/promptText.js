/**
 * components/PromptInput/promptText.ts
 *
 * 2.1.316 新增。提示文本处理（占位、截断）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (8)
 * attribution: placement 8
 */
import { MIN_INLINE_TAG_CHARS, createInlineTextTag, MIN_INLINE_TAG_BLOCK } from "../../utils/userTurnTags.js";
import { parsePastedRefs } from "../../history.js";
import { stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import { findSlashMentionRanges } from "../../utils/attachments/skillMentions.js";

//@ chunk-czq1j3j2.js:951507-951825 placement
/**
 * 把输入文本中粘贴占位符之间的普通文字段落各自作为 inline 文本内容（负数 id）加入 pastedContents；文本较短且无特殊标记时不处理，slashOnly 时标记 slashNameOnly。
 */
function addInlineTextContents(contents, text, slashNameOnly = false) {
  if (text.trim().length < MIN_INLINE_TAG_CHARS && !mentionsUltraplan(text) && !slashNameOnly)
    return contents;
  let next = contents;
  let cursor = 0;
  let segments = [];
  for (let ref of parsePastedRefs(text)) {
    if (contents[ref.id] === undefined) continue;
    segments.push(text.slice(cursor, ref.index));
    cursor = ref.index + ref.match.length;
  }
  segments.push(text.slice(cursor));
  for (let segment of segments) {
    let inlineTextTag = createInlineTextTag(segment, next, MIN_INLINE_TAG_BLOCK);
    if (inlineTextTag)
      next = {
        ...next,
        [inlineTextTag.id]: slashNameOnly
          ? {
              ...inlineTextTag,
              slashNameOnly: true,
            }
          : inlineTextTag,
      };
  }
  return next;
}
//@ chunk-czq1j3j2.js:951825-951877 placement
function mentionsUltraplan(inputState) {
  return /ultraplan/i.test(stripInvisibleChars_2(inputState).text);
}
//@ chunk-czq1j3j2.js:951877-951950 placement
function addInlineTextContentsWithFallback(contents, text, normalizeFirst) {
  let next = normalizeFirst ? addInlineTextContents(contents, text) : contents;
  return next === contents && hasTextAfterNfcNormalize(text)
    ? addInlineTextContents(contents, text, true)
    : next;
}
//@ chunk-czq1j3j2.js:951950-952031 placement (2.1.88 match: setCwdState, 1)
function hasTextAfterNfcNormalize(cwd) {
  return [cwd, cwd.normalize("NFC")].some(
    (inputState) => findSlashMentionRanges(stripInvisibleChars_2(inputState).text).length > 0,
  );
}
//@ chunk-czq1j3j2.js:952031-952048 placement
var COMBINING_MARK_RE_2 = /\p{M}/u;
//@ chunk-czq1j3j2.js:952048-952841 placement (2.1.88 match: needsWidthCompensation, 0.769)
function endsWithCombiningMatch(haystack, needle) {
  let endIndex = needle.length;
  while (endIndex > 0) {
    let code = needle.charCodeAt(endIndex - 1);
    let charLength = endIndex > 1 && code >= 56320 && code <= 57343 ? 2 : 1;
    if (!COMBINING_MARK_RE_2.test(needle.slice(endIndex - charLength, endIndex))) break;
    endIndex -= charLength;
  }
  if (endIndex === needle.length || endIndex === 0) return false;
  let sliced = needle.slice(0, endIndex);
  let list = Array.from(needle.slice(endIndex));
  if (!haystack.includes(list.at(-1))) return false;
  let int32Array = new Int32Array(sliced.length);
  for (let idx = 1, prefixLength = 0; idx < sliced.length; idx++) {
    while (prefixLength > 0 && sliced.charCodeAt(idx) !== sliced.charCodeAt(prefixLength))
      prefixLength = int32Array[prefixLength - 1];
    if (sliced.charCodeAt(idx) === sliced.charCodeAt(prefixLength)) prefixLength++;
    int32Array[idx] = prefixLength;
  }
  for (let idx = 0, matched = 0; idx < haystack.length; idx++) {
    while (matched > 0 && haystack.charCodeAt(idx) !== sliced.charCodeAt(matched))
      matched = int32Array[matched - 1];
    if (haystack.charCodeAt(idx) === sliced.charCodeAt(matched)) matched++;
    if (matched < sliced.length) continue;
    matched = int32Array[matched - 1];
    let suffixIndex = 0;
    for (let scanIndex = idx + 1; scanIndex < haystack.length;) {
      let char = String.fromCodePoint(haystack.codePointAt(scanIndex));
      if (!COMBINING_MARK_RE_2.test(char)) break;
      if (char === list[suffixIndex]) suffixIndex++;
      scanIndex += char.length;
    }
    if (suffixIndex === list.length) return true;
  }
  return false;
}
//@ chunk-czq1j3j2.js:952841-952932 placement
function isSyntheticContent(prev) {
  return prev.type === "image" || (prev.type === "text" && prev.unavailable === true) || prev.inline === true;
}
//@ chunk-czq1j3j2.js:952932-952998 placement
function normalizeVimMode(vimMode) {
  return vimMode === "VISUAL" || vimMode === "VISUAL LINE" ? "NORMAL" : vimMode;
}
export {
  normalizeVimMode,
  isSyntheticContent,
  endsWithCombiningMatch,
  addInlineTextContentsWithFallback,
  mentionsUltraplan,
  hasTextAfterNfcNormalize,
};
