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
import { Rh } from "../../../vendor/react/cjs/react.production.js";
import { PromptInput } from "./PromptInput.js";
import { MIN_INLINE_TAG_CHARS, createInlineTextTag, MIN_INLINE_TAG_BLOCK } from "../../utils/userTurnTags.js";
import { parsePastedRefs } from "../../history.js";
import { stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import { findSlashMentionRanges } from "../../utils/attachments/skillMentions.js";

//@ chunk-18hwfzwa.js:918585-918601 placement
var PromptInputMemo = Rh(PromptInput);
//@ chunk-18hwfzwa.js:918601-918919 placement
/**
 * 把输入文本中粘贴占位符之间的普通文字段落各自作为 inline 文本内容（负数 id）加入 pastedContents；文本较短且无特殊标记时不处理，slashOnly 时标记 slashNameOnly。
 */
function addInlineTextContents(h, x, D = false) {
  if (x.trim().length < MIN_INLINE_TAG_CHARS && !mentionsUltraplan(x) && !D) return h;
  let L = h;
  let ee = 0;
  let ke = [];
  for (let Re of parsePastedRefs(x)) {
    if (h[Re.id] === undefined) continue;
    ke.push(x.slice(ee, Re.index));
    ee = Re.index + Re.match.length;
  }
  ke.push(x.slice(ee));
  for (let Re of ke) {
    let inlineTextTag = createInlineTextTag(Re, L, MIN_INLINE_TAG_BLOCK);
    if (inlineTextTag)
      L = {
        ...L,
        [inlineTextTag.id]: D
          ? {
              ...inlineTextTag,
              slashNameOnly: true,
            }
          : inlineTextTag,
      };
  }
  return L;
}
//@ chunk-18hwfzwa.js:918919-918972 placement
function mentionsUltraplan(h) {
  return /ultraplan/i.test(stripInvisibleChars_2(h).text);
}
//@ chunk-18hwfzwa.js:918972-919045 placement
function addInlineTextContentsWithFallback(h, cwd, D) {
  let L = D ? addInlineTextContents(h, cwd) : h;
  return L === h && hasTextAfterNfcNormalize(cwd) ? addInlineTextContents(h, cwd, true) : L;
}
//@ chunk-18hwfzwa.js:919045-919127 placement = setCwdState (1)
function hasTextAfterNfcNormalize(cwd) {
  return [cwd, cwd.normalize("NFC")].some(
    (x) => findSlashMentionRanges(stripInvisibleChars_2(x).text).length > 0,
  );
}
//@ chunk-18hwfzwa.js:919127-919144 placement
var COMBINING_MARK_RE_2 = /\p{M}/u;
//@ chunk-18hwfzwa.js:919144-919937 placement = needsWidthCompensation (0.769)
function endsWithCombiningMatch(h, x) {
  let D = x.length;
  while (D > 0) {
    let code = x.charCodeAt(D - 1);
    let Be = D > 1 && code >= 56320 && code <= 57343 ? 2 : 1;
    if (!COMBINING_MARK_RE_2.test(x.slice(D - Be, D))) break;
    D -= Be;
  }
  if (D === x.length || D === 0) return false;
  let sliced = x.slice(0, D);
  let list = Array.from(x.slice(D));
  if (!h.includes(list.at(-1))) return false;
  let int32Array = new Int32Array(sliced.length);
  for (let idx = 1, Be = 0; idx < sliced.length; idx++) {
    while (Be > 0 && sliced.charCodeAt(idx) !== sliced.charCodeAt(Be)) Be = int32Array[Be - 1];
    if (sliced.charCodeAt(idx) === sliced.charCodeAt(Be)) Be++;
    int32Array[idx] = Be;
  }
  for (let idx = 0, Be = 0; idx < h.length; idx++) {
    while (Be > 0 && h.charCodeAt(idx) !== sliced.charCodeAt(Be)) Be = int32Array[Be - 1];
    if (h.charCodeAt(idx) === sliced.charCodeAt(Be)) Be++;
    if (Be < sliced.length) continue;
    Be = int32Array[Be - 1];
    let He = 0;
    for (let We = idx + 1; We < h.length;) {
      let ze = String.fromCodePoint(h.codePointAt(We));
      if (!COMBINING_MARK_RE_2.test(ze)) break;
      if (ze === list[He]) He++;
      We += ze.length;
    }
    if (He === list.length) return true;
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
