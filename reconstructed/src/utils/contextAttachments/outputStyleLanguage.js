/**
 * utils/contextAttachments/outputStyleLanguage.ts
 *
 * 2.1.316 新增：输出风格与语言上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { outputStyleAttachmentSchema, languagePreferenceSchema } from "../../constants/prompts.js";

//@ chunk-e6aww6q8.js:107472-107559 placement
function Qkt(e, n) {
  return e === null || n === null ? e === n : e.name === n.name && e.prompt === n.prompt;
}
/**
 * 设置值与上次公告的不同时返回新值包装（相同或都为空返回 undefined）。
 */
//@ chunk-e6aww6q8.js:107559-107663 placement
function changedSettingValue(e, n, r) {
  if (e === void 0) return n === null ? void 0 : { value: n };
  return r(e.value, n) ? void 0 : { value: n };
}
//@ chunk-e6aww6q8.js:107663-107757 placement
function Fio(e) {
  return e.type === "attachment" && e.attachment.type === "output_style_instructions";
}
//@ chunk-e6aww6q8.js:107757-107834 placement
function $io(e) {
  return e.type === "attachment" && e.attachment.type === "language";
}
/**
 * 取消息中最近一次输出风格附件的值。
 */
//@ chunk-e6aww6q8.js:107834-107965 placement
function lastOutputStyleAttachment(e) {
  let last = e.findLast(Fio);
  if (!last) return;
  let safeParse = outputStyleAttachmentSchema().safeParse(last.attachment.style);
  return safeParse.success ? { value: safeParse.data } : void 0;
}
/**
 * 取消息中最近一次语言偏好附件的值。
 */
//@ chunk-e6aww6q8.js:107965-108099 placement
function lastLanguageAttachment(e) {
  let last = e.findLast($io);
  if (!last) return;
  let safeParse = languagePreferenceSchema().safeParse(last.attachment.language);
  return safeParse.success ? { value: safeParse.data } : void 0;
}
/**
 * 压缩后保留的消息中缺少输出风格/语言附件时，从压缩前的消息中带过来。
 */
//@ chunk-e6aww6q8.js:108099-108297 placement
function carryStyleAndLanguageAttachments(e, n) {
  let r = [];
  if (!lastOutputStyleAttachment(n)) {
    let s = lastOutputStyleAttachment(e)?.value;
    if (s) r.push({ type: "output_style_instructions", style: s });
  }
  if (!lastLanguageAttachment(n)) {
    let s = lastLanguageAttachment(e)?.value;
    if (s) r.push({ type: "language", language: s });
  }
  return r;
}

export {
  carryStyleAndLanguageAttachments,
  changedSettingValue,
  lastOutputStyleAttachment,
  Qkt,
  lastLanguageAttachment,
};
