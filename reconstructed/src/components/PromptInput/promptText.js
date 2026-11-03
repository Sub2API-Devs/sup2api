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
import { zSt, createInlineTextTag, o9n } from "../../utils/userTurnTags.js";
import { parsePastedRefs } from "../../history.js";
import { stripInvisibleChars as stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import { findSlashMentionRanges } from "../../utils/attachments/skillMentions.js";

//@ chunk-18hwfzwa.js:918585-918601 placement
var Kbe = Rh(PromptInput);
/**
 * 把输入文本中粘贴占位符之间的普通文字段落各自作为 inline 文本内容（负数 id）加入 pastedContents；文本较短且无特殊标记时不处理，slashOnly 时标记 slashNameOnly。
 */
//@ chunk-18hwfzwa.js:918601-918919 placement
function addInlineTextContents(h, x, D = !1) {
  if (x.trim().length < zSt && !qbe(x) && !D) return h;
  let L = h,
    ee = 0,
    ke = [];
  for (let Re of parsePastedRefs(x)) {
    if (h[Re.id] === void 0) continue;
    (ke.push(x.slice(ee, Re.index)), (ee = Re.index + Re.match.length));
  }
  ke.push(x.slice(ee));
  for (let Re of ke) {
    let Be = createInlineTextTag(Re, L, o9n);
    if (Be) L = { ...L, [Be.id]: D ? { ...Be, slashNameOnly: !0 } : Be };
  }
  return L;
}
//@ chunk-18hwfzwa.js:918919-918972 placement
function qbe(h) {
  return /ultraplan/i.test(stripInvisibleChars_2(h).text);
}
//@ chunk-18hwfzwa.js:918972-919045 placement
function W3(h, x, D) {
  let L = D ? addInlineTextContents(h, x) : h;
  return L === h && hasTextAfterNfcNormalize(x) ? addInlineTextContents(h, x, !0) : L;
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
    let code = x.charCodeAt(D - 1),
      Be = D > 1 && code >= 56320 && code <= 57343 ? 2 : 1;
    if (!COMBINING_MARK_RE_2.test(x.slice(D - Be, D))) break;
    D -= Be;
  }
  if (D === x.length || D === 0) return !1;
  let sliced = x.slice(0, D),
    list = Array.from(x.slice(D));
  if (!h.includes(list.at(-1))) return !1;
  let int32Array = new Int32Array(sliced.length);
  for (let Re = 1, Be = 0; Re < sliced.length; Re++) {
    while (Be > 0 && sliced.charCodeAt(Re) !== sliced.charCodeAt(Be)) Be = int32Array[Be - 1];
    if (sliced.charCodeAt(Re) === sliced.charCodeAt(Be)) Be++;
    int32Array[Re] = Be;
  }
  for (let Re = 0, Be = 0; Re < h.length; Re++) {
    while (Be > 0 && h.charCodeAt(Re) !== sliced.charCodeAt(Be)) Be = int32Array[Be - 1];
    if (h.charCodeAt(Re) === sliced.charCodeAt(Be)) Be++;
    if (Be < sliced.length) continue;
    Be = int32Array[Be - 1];
    let He = 0;
    for (let We = Re + 1; We < h.length;) {
      let fromCodePoint = String.fromCodePoint(h.codePointAt(We));
      if (!COMBINING_MARK_RE_2.test(fromCodePoint)) break;
      if (fromCodePoint === list[He]) He++;
      We += fromCodePoint.length;
    }
    if (He === list.length) return !0;
  }
  return !1;
}
//@ chunk-18hwfzwa.js:919937-920028 placement
function j3(h) {
  return h.type === "image" || (h.type === "text" && h.unavailable === !0) || h.inline === !0;
}
//@ chunk-18hwfzwa.js:920028-920094 placement
function l9e(h) {
  return h === "VISUAL" || h === "VISUAL LINE" ? "NORMAL" : h;
}

export { l9e, j3, endsWithCombiningMatch, W3, qbe, hasTextAfterNfcNormalize, Kbe };
