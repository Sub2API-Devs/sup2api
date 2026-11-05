/**
 * utils/messages/systemMessages.ts
 *
 * 2.1.316 新增：系统消息
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";

//@ chunk-5xgkngpb.js:94166-94288 placement
/**
 * 创建一条 api_system 类型的系统消息（随机 uuid 与当前时间）。
 */
function createApiSystemMessage(content) {
  return {
    type: "api_system",
    message: {
      role: "system",
      content,
    },
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-5xgkngpb.js:94288-94836 placement
/**
 * 把附件文本合并进系统消息：内容为空时整体作为临时内容（ephemeral），否则主体与临时后缀分开保存；需要时记录折叠的附件区间偏移与只含名称的版本。
 */
function foldAttachmentText(message, text, ephemeralText, nameOnlyText, spans) {
  let current = message.ephemeral ? "" : message.message.content;
  if (text && spans && spans.length > 0) {
    let offset = current ? current.length + 2 : 0;
    message.foldedAttachmentSpans = [
      ...(message.foldedAttachmentSpans ?? []),
      ...spans.map((span) => ({
        ...span,
        start: span.start + offset,
      })),
    ];
  }
  if (text && (nameOnlyText !== undefined || message.nameOnlyContent !== undefined))
    message.nameOnlyContent = joinParts(message.nameOnlyContent ?? current, nameOnlyText ?? text);
  let merged = joinParts(current, text);
  let ephemeral = joinParts(
    message.ephemeral ? message.message.content : (message.ephemeralSuffix ?? ""),
    ephemeralText,
  );
  if (merged === "") {
    message.message.content = ephemeral;
    message.ephemeral = true;
    delete message.ephemeralSuffix;
    return;
  }
  message.message.content = merged;
  delete message.ephemeral;
  if (ephemeral === "") delete message.ephemeralSuffix;
  else message.ephemeralSuffix = ephemeral;
}
//@ chunk-5xgkngpb.js:94836-94883 placement
/**
 * 用空格连接两个非空部分（有一个为空则返回另一个）。
 */
function joinParts(first, second) {
  return first && second
    ? `${first}

${second}`
    : first || second;
}
export { createApiSystemMessage, joinParts, foldAttachmentText };
