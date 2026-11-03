/**
 * utils/messages/systemMessages.ts
 *
 * 2.1.316 新增：系统消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { randomUUID } from "crypto";

//@ chunk-e6aww6q8.js:91361-91483 placement
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
//@ chunk-e6aww6q8.js:91483-92031 placement
/**
 * 把附件文本合并进系统消息：内容为空时整体作为临时内容（ephemeral），否则主体与临时后缀分开保存；需要时记录折叠的附件区间偏移与只含名称的版本。
 */
function foldAttachmentText(message, text, ephemeralText, nameOnlyText, spans) {
  let current = message.ephemeral ? "" : message.message.content;
  if (text && spans && spans.length > 0) {
    let L = current ? current.length + 2 : 0;
    message.foldedAttachmentSpans = [
      ...(message.foldedAttachmentSpans ?? []),
      ...spans.map((span) => ({
        ...span,
        start: span.start + L,
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
//@ chunk-e6aww6q8.js:92031-92078 placement
/**
 * 用空格连接两个非空部分（有一个为空则返回另一个）。
 */
function joinParts(e, n) {
  return e && n
    ? `${e}

${n}`
    : e || n;
}
export { foldAttachmentText, createApiSystemMessage, joinParts };
