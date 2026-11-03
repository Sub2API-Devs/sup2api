/**
 * services/api/requestTooLarge.ts
 *
 * 2.1.316 新增：请求过大（413）错误的识别与提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { E, u, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { put } from "../../utils/truncateGraphemes.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { formatFileSize } from "../../utils/format.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:173536-173596 placement
var TENGU_WOBBLY_FERN = "tengu_wobbly_fern",
  Mlo = DoctorLazy(() => E().int().positive());
//@ chunk-e6aww6q8.js:173596-173687 placement
function Olo() {
  let safeParse = Mlo().safeParse(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WOBBLY_FERN, put));
  return safeParse.success ? Math.max(put, safeParse.data) : put;
}
//@ chunk-e6aww6q8.js:173687-173746 placement
var Dlo = DoctorLazy(() => u({ error: u({ type: T("request_too_large") }) }));
//@ chunk-e6aww6q8.js:173746-173818 placement
function Avt(e) {
  let safeParse = Dlo().safeParse(e);
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-e6aww6q8.js:173818-173956 placement
function mediaBytesInMessages(e) {
  return e.reduce(
    (n, r) =>
      r.type === "user" && Array.isArray(r.message.content)
        ? r.message.content.reduce((s, h) => s + mediaBytesOfBlock(h), n)
        : n,
    0,
  );
}
/**
 * 块类型是 image 或 document。
 */
//@ chunk-e6aww6q8.js:173956-174007 placement = isMedia (1)
var isImageOrDocumentBlock = (block) => block.type === "image" || block.type === "document";
/**
 * image/document 块或 tool_result 里嵌套媒体的 UTF-8 字节数。
 */
//@ chunk-e6aww6q8.js:174007-174160 placement
function mediaBytesOfBlock(e) {
  if (isImageOrDocumentBlock(e)) return h$e(e);
  if (e.type === "tool_result" && Array.isArray(e.content))
    return e.content.reduce((n, r) => (isImageOrDocumentBlock(r) ? n + h$e(r) : n), 0);
  return 0;
}
//@ chunk-e6aww6q8.js:174160-174214 placement
function h$e(e) {
  return Buffer.byteLength(jsonStringify(e), "utf8");
}
//@ chunk-e6aww6q8.js:174214-174426 placement
function measureRejectedRequest({ messagesForAPI: messagesForAPI, limitBytes: limitBytes = Olo() }) {
  let r = mediaBytesInMessages(messagesForAPI),
    s = h$e(messagesForAPI.map((h) => h.message.content));
  return {
    kind: s - r > limitBytes ? "unrecoverable" : r > 0 ? "strippable_media" : "compactable",
    bodyBytes: s,
    mediaBytes: r,
    limitBytes: limitBytes,
  };
}
//@ chunk-e6aww6q8.js:174426-174478 placement
function w$e(e) {
  return e < 1024 ? "less than 1KB" : formatFileSize(e);
}
//@ chunk-e6aww6q8.js:174478-174605 placement
function formatBodySize(e) {
  let n = formatFileSize(e.bodyBytes),
    r = e.bodyBytes - e.limitBytes;
  return n === formatFileSize(e.limitBytes) && r > 0 ? `${n} (${w$e(r)} over it)` : n;
}
/**
 * 请求过大时的说明：对话大小以及可移除的图片与文档占比。
 */
//@ chunk-e6aww6q8.js:174605-175209 placement
function formatRequestTooLarge(e) {
  let n = formatFileSize(e.limitBytes),
    s = `this conversation is about ${formatBodySize(e)}`,
    h =
      e.mediaBytes === 0
        ? "none of it is images or documents that could be removed"
        : `only ${w$e(e.mediaBytes)} of it is images or documents that could be removed`,
    y = `Request too large for the API's ${n} request limit: ${s}, and ${h}, so removing attachments or compacting cannot make it fit.`;
  return getIsNonInteractiveSession()
    ? `${y} Reduce the input (large tool results or pasted content) or start a new session; this conversation cannot continue as is.`
    : `${y} Double press esc to go back past the large content, or /clear to start a new conversation.`;
}
/**
 * 请求因图片和附件累积超限时的提示，交互与非交互会话给出不同的处理建议。
 */
//@ chunk-e6aww6q8.js:175209-175538 placement
function requestTooLargeHint() {
  return getIsNonInteractiveSession()
    ? "Accumulated images and attachments in the conversation pushed the request over the limit. Remove older images or compact the conversation."
    : "Accumulated images and attachments in the conversation pushed the request over the limit. Run /compact, or double press esc to go back and remove attachments.";
}
//@ chunk-e6aww6q8.js:175538-175606 placement
function Sue() {
  return `Request too large (max ${formatFileSize(put)}). ${requestTooLargeHint()}`;
}
//@ chunk-e6aww6q8.js:175606-175657 placement
function Ivt() {
  return `Request too large. ${requestTooLargeHint()}`;
}
//@ chunk-e6aww6q8.js:175657-175816 placement
function formatRequestTooLargeMedia(e) {
  let n = formatFileSize(e.limitBytes),
    r = `${w$e(e.mediaBytes)} of about ${formatBodySize(e)} is images or documents`;
  return `Request too large (max ${n}; ${r}). ${requestTooLargeHint()}`;
}
//@ chunk-e6aww6q8.js:175816-175948 placement
function requestTooLargeDebug(e) {
  return `request_body_over_limit: body=${e.bodyBytes}B (messages only) media=${e.mediaBytes}B limit=${e.limitBytes}B`;
}

export {
  Sue,
  Avt,
  formatRequestTooLarge,
  requestTooLargeDebug,
  formatRequestTooLargeMedia,
  mediaBytesInMessages,
  Ivt,
  measureRejectedRequest,
};
