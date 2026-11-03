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
function unannouncedVersionMessages(e) {
  let n = [];
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let s = e[idx];
    if (s.type === "assistant" && s.message.model !== SYNTHETIC_MODEL && isLegacyVersionMarker(s)) break;
    if (
      isRemoteSessionChangeAttachment(s) &&
      s.renderedBesideToolResult !== true &&
      typeof messageVersion(s) === "string" &&
      !isLegacyVersionMarker(s)
    )
      n.push(s);
  }
  return n;
}
//@ chunk-e6aww6q8.js:115984-116037 placement
/**
 * 取消息里的 version 字段（没有时 undefined）。
 */
function messageVersion(e) {
  return "version" in e ? e.version : undefined;
}
//@ chunk-e6aww6q8.js:116037-116165 placement
function isLegacyVersionMarker(e) {
  let n = messageVersion(e);
  return typeof n === "string" ? n.startsWith("2.1.287") || n.startsWith("2.1.288-dev.") : "sessionId" in e;
}
//@ chunk-e6aww6q8.js:116165-116225 placement
/**
 * 判断文本是否以库更新提示的两种前缀之一开头。
 */
function isLibraryUpdateMessage(e) {
  return e.startsWith(ATTRIBUTION_HEADER_COMMITS) || e.startsWith(ATTRIBUTION_HEADER_PLACEHOLDER);
}
export { isLibraryUpdateMessage, unannouncedVersionMessages };
