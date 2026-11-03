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
/**
 * 判断两个设置值是否相同（都为空，或 name 与 prompt 都一致）。
 */
function isSameSettingValue(e, n) {
  return e === null || n === null ? e === n : e.name === n.name && e.prompt === n.prompt;
}
//@ chunk-e6aww6q8.js:107559-107663 placement
/**
 * 设置值与上次公告的不同时返回新值包装（相同或都为空返回 undefined）。
 */
function changedSettingValue(e, n, r) {
  if (e === undefined)
    return n === null
      ? undefined
      : {
          value: n,
        };
  return r(e.value, n)
    ? undefined
    : {
        value: n,
      };
}
//@ chunk-e6aww6q8.js:107663-107757 placement
/**
 * 判断消息是否为输出风格附件。
 */
function isOutputStyleAttachment(e) {
  return e.type === "attachment" && e.attachment.type === "output_style_instructions";
}
//@ chunk-e6aww6q8.js:107757-107834 placement
/**
 * 判断消息是否为语言设置附件。
 */
function isLanguageAttachment(e) {
  return e.type === "attachment" && e.attachment.type === "language";
}
//@ chunk-e6aww6q8.js:107834-107965 placement
/**
 * 取消息中最近一次输出风格附件的值。
 */
function lastOutputStyleAttachment(e) {
  let last = e.findLast(isOutputStyleAttachment);
  if (!last) return;
  let r = outputStyleAttachmentSchema().safeParse(last.attachment.style);
  return r.success
    ? {
        value: r.data,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:107965-108099 placement
/**
 * 取消息中最近一次语言偏好附件的值。
 */
function lastLanguageAttachment(e) {
  let last = e.findLast(isLanguageAttachment);
  if (!last) return;
  let r = languagePreferenceSchema().safeParse(last.attachment.language);
  return r.success
    ? {
        value: r.data,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:108099-108297 placement
/**
 * 压缩后保留的消息中缺少输出风格/语言附件时，从压缩前的消息中带过来。
 */
function carryStyleAndLanguageAttachments(preCompactMessages, messagesToKeep) {
  let r = [];
  if (!lastOutputStyleAttachment(messagesToKeep)) {
    let s = lastOutputStyleAttachment(preCompactMessages)?.value;
    if (s)
      r.push({
        type: "output_style_instructions",
        style: s,
      });
  }
  if (!lastLanguageAttachment(messagesToKeep)) {
    let s = lastLanguageAttachment(preCompactMessages)?.value;
    if (s)
      r.push({
        type: "language",
        language: s,
      });
  }
  return r;
}
export {
  carryStyleAndLanguageAttachments,
  changedSettingValue,
  lastOutputStyleAttachment,
  isSameSettingValue,
  lastLanguageAttachment,
};
