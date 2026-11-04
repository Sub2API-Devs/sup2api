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
function isSameSettingValue(left, right) {
  return left === null || right === null
    ? left === right
    : left.name === right.name && left.prompt === right.prompt;
}
//@ chunk-e6aww6q8.js:107559-107663 placement
/**
 * 设置值与上次公告的不同时返回新值包装（相同或都为空返回 undefined）。
 */
function changedSettingValue(previous, next, key) {
  if (previous === undefined)
    return next === null
      ? undefined
      : {
          value: next,
        };
  return key(previous.value, next)
    ? undefined
    : {
        value: next,
      };
}
//@ chunk-e6aww6q8.js:107663-107757 placement
/**
 * 判断消息是否为输出风格附件。
 */
function isOutputStyleAttachment(attachment) {
  return attachment.type === "attachment" && attachment.attachment.type === "output_style_instructions";
}
//@ chunk-e6aww6q8.js:107757-107834 placement
/**
 * 判断消息是否为语言设置附件。
 */
function isLanguageAttachment(attachment) {
  return attachment.type === "attachment" && attachment.attachment.type === "language";
}
//@ chunk-e6aww6q8.js:107834-107965 placement
/**
 * 取消息中最近一次输出风格附件的值。
 */
function lastOutputStyleAttachment(messages) {
  let last = messages.findLast(isOutputStyleAttachment);
  if (!last) return;
  let parseResult = outputStyleAttachmentSchema().safeParse(last.attachment.style);
  return parseResult.success
    ? {
        value: parseResult.data,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:107965-108099 placement
/**
 * 取消息中最近一次语言偏好附件的值。
 */
function lastLanguageAttachment(messages) {
  let last = messages.findLast(isLanguageAttachment);
  if (!last) return;
  let parseResult = languagePreferenceSchema().safeParse(last.attachment.language);
  return parseResult.success
    ? {
        value: parseResult.data,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:108099-108297 placement
/**
 * 压缩后保留的消息中缺少输出风格/语言附件时，从压缩前的消息中带过来。
 */
function carryStyleAndLanguageAttachments(messages, messages_2) {
  let lines = [];
  if (!lastOutputStyleAttachment(messages_2)) {
    let styleValue = lastOutputStyleAttachment(messages)?.value;
    if (styleValue)
      lines.push({
        type: "output_style_instructions",
        style: styleValue,
      });
  }
  if (!lastLanguageAttachment(messages_2)) {
    let languageValue = lastLanguageAttachment(messages)?.value;
    if (languageValue)
      lines.push({
        type: "language",
        language: languageValue,
      });
  }
  return lines;
}
export {
  carryStyleAndLanguageAttachments,
  changedSettingValue,
  lastOutputStyleAttachment,
  isSameSettingValue,
  lastLanguageAttachment,
};
