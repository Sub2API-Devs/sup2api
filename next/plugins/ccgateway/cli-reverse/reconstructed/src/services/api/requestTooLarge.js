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
import { numberSchema, objectSchema, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { MAX_REQUEST_BYTES } from "../../utils/mediaLimits.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { formatFileSize } from "../../utils/format.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:173536-173596 placement
/**
 * 请求过大提示的开关 tengu_wobbly_fern（字节上限）与其 zod schema。
 */
var TENGU_WOBBLY_FERN; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var requestTooLargeLimitSchema;
deferInit("chunk-e6aww6q8.js:173536", () => {
  TENGU_WOBBLY_FERN = "tengu_wobbly_fern";
  requestTooLargeLimitSchema = DoctorLazy(() => numberSchema().int().positive());
});
//@ chunk-e6aww6q8.js:173596-173687 placement
function requestTooLargeLimitBytes() {
  let data = requestTooLargeLimitSchema().safeParse(
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WOBBLY_FERN, MAX_REQUEST_BYTES),
  );
  return data.success ? Math.max(MAX_REQUEST_BYTES, data.data) : MAX_REQUEST_BYTES;
}
//@ chunk-e6aww6q8.js:173687-173746 placement
var requestTooLargeErrorSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:173687", () => {
  requestTooLargeErrorSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        type: literal("request_too_large"),
      }),
    }),
  );
});
//@ chunk-e6aww6q8.js:173746-173818 placement
function parseRequestTooLargeError(error) {
  let parseError = requestTooLargeErrorSchema().safeParse(error);
  return parseError.success ? parseError.data : undefined;
}
//@ chunk-e6aww6q8.js:173818-173956 placement
function mediaBytesInMessages(messagesForAPI) {
  return messagesForAPI.reduce(
    (acc, message) =>
      message.type === "user" && Array.isArray(message.message.content)
        ? message.message.content.reduce((acc, block) => acc + mediaBytesOfBlock(block), acc)
        : acc,
    0,
  );
}
//@ chunk-e6aww6q8.js:173956-174007 placement (2.1.88 match: isMedia, 1)
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
function jsonByteLength_2(value) {
  return Buffer.byteLength(jsonStringify(value), "utf8");
}
//@ chunk-e6aww6q8.js:174214-174426 placement
function measureRejectedRequest({ messagesForAPI, limitBytes = requestTooLargeLimitBytes() }) {
  let mediaBytes = mediaBytesInMessages(messagesForAPI);
  let bodyBytes = jsonByteLength_2(messagesForAPI.map((message) => message.message.content));
  return {
    kind:
      bodyBytes - mediaBytes > limitBytes
        ? "unrecoverable"
        : mediaBytes > 0
          ? "strippable_media"
          : "compactable",
    bodyBytes,
    mediaBytes,
    limitBytes,
  };
}
//@ chunk-e6aww6q8.js:174426-174478 placement
function describeSize(byteSize) {
  return byteSize < 1024 ? "less than 1KB" : formatFileSize(byteSize);
}
//@ chunk-e6aww6q8.js:174478-174605 placement
function formatBodySize(analysis) {
  let sizeText = formatFileSize(analysis.bodyBytes);
  let overBytes = analysis.bodyBytes - analysis.limitBytes;
  return sizeText === formatFileSize(analysis.limitBytes) && overBytes > 0
    ? `${sizeText} (${describeSize(overBytes)} over it)`
    : sizeText;
}
//@ chunk-e6aww6q8.js:174605-175209 placement
/**
 * 请求过大时的说明：对话大小以及可移除的图片与文档占比。
 */
function formatRequestTooLarge(analysis) {
  let limitText = formatFileSize(analysis.limitBytes);
  let bodyText = `this conversation is about ${formatBodySize(analysis)}`;
  let causeText =
    analysis.mediaBytes === 0
      ? "none of it is images or documents that could be removed"
      : `only ${describeSize(analysis.mediaBytes)} of it is images or documents that could be removed`;
  let message = `Request too large for the API's ${limitText} request limit: ${bodyText}, and ${causeText}, so removing attachments or compacting cannot make it fit.`;
  return getIsNonInteractiveSession()
    ? `${message} Reduce the input (large tool results or pasted content) or start a new session; this conversation cannot continue as is.`
    : `${message} Double press esc to go back past the large content, or /clear to start a new conversation.`;
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
function formatRequestTooLargeMedia(analysis) {
  let limitText = formatFileSize(analysis.limitBytes);
  let mediaText = `${describeSize(analysis.mediaBytes)} of about ${formatBodySize(analysis)} is images or documents`;
  return `Request too large (max ${limitText}; ${mediaText}). ${requestTooLargeHint()}`;
}
//@ chunk-e6aww6q8.js:175816-175948 placement
function requestTooLargeDebug(analysis) {
  return `request_body_over_limit: body=${analysis.bodyBytes}B (messages only) media=${analysis.mediaBytes}B limit=${analysis.limitBytes}B`;
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
