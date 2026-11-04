/**
 * utils/contextAttachments/version.ts
 *
 * 2.1.316 新增：版本附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { isRemoteSessionChangeAttachment } from "./remoteSession.js";
import { ATTRIBUTION_HEADER_COMMITS, ATTRIBUTION_HEADER_PLACEHOLDER } from "./attribution.js";

//@ chunk-e6aww6q8.js:115760-115984 placement
/**
 * 从后往前收集上一条带版本标记的助手消息之后、尚未公告的版本附件消息。
 */
function unannouncedVersionMessages(messages) {
  let unannounced = [];
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (
      message.type === "assistant" &&
      message.message.model !== SYNTHETIC_MODEL &&
      isLegacyVersionMarker(message)
    )
      break;
    if (
      isRemoteSessionChangeAttachment(message) &&
      message.renderedBesideToolResult !== true &&
      typeof messageVersion(message) === "string" &&
      !isLegacyVersionMarker(message)
    )
      unannounced.push(message);
  }
  return unannounced;
}
//@ chunk-e6aww6q8.js:115984-116037 placement
/**
 * 取消息里的 version 字段（没有时 undefined）。
 */
function messageVersion(message) {
  return "version" in message ? message.version : undefined;
}
//@ chunk-e6aww6q8.js:116037-116165 placement
function isLegacyVersionMarker(message) {
  let version = messageVersion(message);
  return typeof version === "string"
    ? version.startsWith("2.1.287") || version.startsWith("2.1.288-dev.")
    : "sessionId" in message;
}
//@ chunk-e6aww6q8.js:116165-116225 placement
/**
 * 判断文本是否以库更新提示的两种前缀之一开头。
 */
function isLibraryUpdateMessage(message) {
  return message.startsWith(ATTRIBUTION_HEADER_COMMITS) || message.startsWith(ATTRIBUTION_HEADER_PLACEHOLDER);
}
export { isLibraryUpdateMessage, unannouncedVersionMessages };
