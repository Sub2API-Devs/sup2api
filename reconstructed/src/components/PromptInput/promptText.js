/**
 * components/PromptInput/promptText.ts
 *
 * 2.1.316 新增。提示文本处理（占位、截断）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 9
 */
import { memo } from "../../../vendor/react/cjs/react.production.js";
import { PromptInput } from "./PromptInput.js";
import { MIN_INLINE_TAG_CHARS, createInlineTextTag, MIN_INLINE_TAG_BLOCK } from "../../utils/userTurnTags.js";
import { parsePastedRefs } from "../../history.js";
import { stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import { findSlashMentionRanges } from "../../utils/attachments/skillMentions.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:918585-918601 placement
var PromptInputMemo; // deferred: uses PromptInput (./PromptInput.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:918585", () => {
  PromptInputMemo = memo(PromptInput);
});
//@ chunk-18hwfzwa.js:918601-918919 placement
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
//@ chunk-18hwfzwa.js:918919-918972 placement
function mentionsUltraplan(inputState) {
  return /ultraplan/i.test(stripInvisibleChars_2(inputState).text);
}
//@ chunk-18hwfzwa.js:918972-919045 placement
function addInlineTextContentsWithFallback(contents, text, normalizeFirst) {
  let next = normalizeFirst ? addInlineTextContents(contents, text) : contents;
  return next === contents && hasTextAfterNfcNormalize(text)
    ? addInlineTextContents(contents, text, true)
    : next;
}
//@ chunk-18hwfzwa.js:919045-919127 placement = setCwdState (1)
function hasTextAfterNfcNormalize(cwd) {
  return [cwd, cwd.normalize("NFC")].some(
    (inputState) => findSlashMentionRanges(stripInvisibleChars_2(inputState).text).length > 0,
  );
}
//@ chunk-18hwfzwa.js:919127-919144 placement
var COMBINING_MARK_RE_2 = /\p{M}/u;
//@ chunk-18hwfzwa.js:919144-919937 placement = needsWidthCompensation (0.769)
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
//@ chunk-18hwfzwa.js:919937-920028 placement
function isSyntheticContent(prev) {
  return prev.type === "image" || (prev.type === "text" && prev.unavailable === true) || prev.inline === true;
}
//@ chunk-18hwfzwa.js:920028-920094 placement
function normalizeVimMode(vimMode) {
  return vimMode === "VISUAL" || vimMode === "VISUAL LINE" ? "NORMAL" : vimMode;
}
export {
  PromptInputMemo,
  normalizeVimMode,
  isSyntheticContent,
  endsWithCombiningMatch,
  addInlineTextContentsWithFallback,
  mentionsUltraplan,
  hasTextAfterNfcNormalize,
};
