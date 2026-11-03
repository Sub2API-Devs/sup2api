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
import { E, u, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { MAX_REQUEST_BYTES } from "../../utils/truncateGraphemes.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { formatFileSize } from "../../utils/format.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:173536-173596 placement
/**
 * 请求过大提示的开关 tengu_wobbly_fern（字节上限）与其 zod schema。
 */
var TENGU_WOBBLY_FERN = "tengu_wobbly_fern";
var requestTooLargeLimitSchema = DoctorLazy(() => E().int().positive());
//@ chunk-e6aww6q8.js:173596-173687 placement
function requestTooLargeLimitBytes() {
  let e = requestTooLargeLimitSchema().safeParse(
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WOBBLY_FERN, MAX_REQUEST_BYTES),
  );
  return e.success ? Math.max(MAX_REQUEST_BYTES, e.data) : MAX_REQUEST_BYTES;
}
//@ chunk-e6aww6q8.js:173687-173746 placement
var requestTooLargeErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      type: literal("request_too_large"),
    }),
  }),
);
//@ chunk-e6aww6q8.js:173746-173818 placement
function parseRequestTooLargeError(error) {
  let n = requestTooLargeErrorSchema().safeParse(error);
  return n.success ? n.data : undefined;
}
//@ chunk-e6aww6q8.js:173818-173956 placement
function mediaBytesInMessages(messagesForAPI) {
  return messagesForAPI.reduce(
    (acc, r) =>
      r.type === "user" && Array.isArray(r.message.content)
        ? r.message.content.reduce((acc, h) => acc + mediaBytesOfBlock(h), acc)
        : acc,
    0,
  );
}
//@ chunk-e6aww6q8.js:173956-174007 placement = isMedia (1)
/**
 * 块类型是 image 或 document。
 */
var isImageOrDocumentBlock = (block) => block.type === "image" || block.type === "document";
//@ chunk-e6aww6q8.js:174007-174160 placement
/**
 * image/document 块或 tool_result 里嵌套媒体的 UTF-8 字节数。
 */
function mediaBytesOfBlock(block) {
  if (isImageOrDocumentBlock(block)) return jsonByteLength_2(block);
  if (block.type === "tool_result" && Array.isArray(block.content))
    return block.content.reduce(
      (acc, block) => (isImageOrDocumentBlock(block) ? acc + jsonByteLength_2(block) : acc),
      0,
    );
  return 0;
}
//@ chunk-e6aww6q8.js:174160-174214 placement
function jsonByteLength_2(e) {
  return Buffer.byteLength(jsonStringify(e), "utf8");
}
//@ chunk-e6aww6q8.js:174214-174426 placement
function measureRejectedRequest({ messagesForAPI, limitBytes = requestTooLargeLimitBytes() }) {
  let r = mediaBytesInMessages(messagesForAPI);
  let s = jsonByteLength_2(messagesForAPI.map((h) => h.message.content));
  return {
    kind: s - r > limitBytes ? "unrecoverable" : r > 0 ? "strippable_media" : "compactable",
    bodyBytes: s,
    mediaBytes: r,
    limitBytes,
  };
}
//@ chunk-e6aww6q8.js:174426-174478 placement
function describeSize(mediaBytes) {
  return mediaBytes < 1024 ? "less than 1KB" : formatFileSize(mediaBytes);
}
//@ chunk-e6aww6q8.js:174478-174605 placement
function formatBodySize(e) {
  let n = formatFileSize(e.bodyBytes);
  let r = e.bodyBytes - e.limitBytes;
  return n === formatFileSize(e.limitBytes) && r > 0 ? `${n} (${describeSize(r)} over it)` : n;
}
//@ chunk-e6aww6q8.js:174605-175209 placement
/**
 * 请求过大时的说明：对话大小以及可移除的图片与文档占比。
 */
function formatRequestTooLarge(e) {
  let n = formatFileSize(e.limitBytes);
  let s = `this conversation is about ${formatBodySize(e)}`;
  let h =
    e.mediaBytes === 0
      ? "none of it is images or documents that could be removed"
      : `only ${describeSize(e.mediaBytes)} of it is images or documents that could be removed`;
  let y = `Request too large for the API's ${n} request limit: ${s}, and ${h}, so removing attachments or compacting cannot make it fit.`;
  return getIsNonInteractiveSession()
    ? `${y} Reduce the input (large tool results or pasted content) or start a new session; this conversation cannot continue as is.`
    : `${y} Double press esc to go back past the large content, or /clear to start a new conversation.`;
}
//@ chunk-e6aww6q8.js:175209-175538 placement
/**
 * 请求因图片和附件累积超限时的提示，交互与非交互会话给出不同的处理建议。
 */
function requestTooLargeHint() {
  return getIsNonInteractiveSession()
    ? "Accumulated images and attachments in the conversation pushed the request over the limit. Remove older images or compact the conversation."
    : "Accumulated images and attachments in the conversation pushed the request over the limit. Run /compact, or double press esc to go back and remove attachments.";
}
//@ chunk-e6aww6q8.js:175538-175606 placement
function requestTooLargeWithLimitText() {
  return `Request too large (max ${formatFileSize(MAX_REQUEST_BYTES)}). ${requestTooLargeHint()}`;
}
//@ chunk-e6aww6q8.js:175606-175657 placement
function requestTooLargeText() {
  return `Request too large. ${requestTooLargeHint()}`;
}
//@ chunk-e6aww6q8.js:175657-175816 placement
function formatRequestTooLargeMedia(e) {
  let n = formatFileSize(e.limitBytes);
  let r = `${describeSize(e.mediaBytes)} of about ${formatBodySize(e)} is images or documents`;
  return `Request too large (max ${n}; ${r}). ${requestTooLargeHint()}`;
}
//@ chunk-e6aww6q8.js:175816-175948 placement
function requestTooLargeDebug(e) {
  return `request_body_over_limit: body=${e.bodyBytes}B (messages only) media=${e.mediaBytes}B limit=${e.limitBytes}B`;
}
export {
  requestTooLargeWithLimitText,
  parseRequestTooLargeError,
  formatRequestTooLarge,
  requestTooLargeDebug,
  formatRequestTooLargeMedia,
  mediaBytesInMessages,
  requestTooLargeText,
  measureRejectedRequest,
};
