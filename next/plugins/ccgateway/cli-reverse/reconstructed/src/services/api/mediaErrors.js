/**
 * services/api/mediaErrors.ts
 *
 * 2.1.316 新增。请求中图片/文档过多或模型不支持时的错误分类与移除说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { includesWholeWord, locateMediaError, isPdfUnsupportedError } from "./badRequestClassifier.js";
import { API_ERROR_MESSAGE_PREFIX } from "./errors.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:123190-123333 placement
/**
 * 从 API 错误文本判断受影响的媒体类型（request_too_large/媒体预算 → document+image；否则按错误里的块类型）。
 */
function getMediaKindsFromError(message) {
  if (message.includes("request_too_large") || isMediaBudgetError(message))
    return new Set(["document", "image"]);
  let mediaError = classifyMediaError(message);
  return mediaError ? new Set([mediaError.kind]) : undefined;
}
//@ chunk-e6aww6q8.js:123333-123421 placement
/**
 * 错误文本含 "too much media" 或 media_budget。
 */
function isMediaBudgetError(message) {
  return message.toLowerCase().includes("too much media") || includesWholeWord(message, "media_budget");
}
//@ chunk-e6aww6q8.js:123421-123593 placement
/**
 * 从 400 错误消息识别媒体问题：image_block→image，document_block/media_budget→document，否则按 messages.N.content.M 路径解析位置。
 */
function classifyMediaError(message) {
  if (includesWholeWord(message, "image_block"))
    return {
      kind: "image",
    };
  if (includesWholeWord(message, "document_block"))
    return {
      kind: "document",
    };
  if (includesWholeWord(message, "media_budget"))
    return {
      kind: "document",
    };
  return locateMediaError(message);
}
//@ chunk-e6aww6q8.js:124455-124688 placement
/**
 * 模型不接受 PDF、已移除对话中 PDF 的提示文案。
 */
function getPdfUnsupportedByModelMessage() {
  return `${API_ERROR_MESSAGE_PREFIX}: this model does not accept PDF documents, so a PDF in the conversation was removed. Ask Claude to read specific pages of the file instead (they are sent as images), or switch to a model that reads PDFs.`;
}
//@ chunk-e6aww6q8.js:124688-124907 placement
/**
 * 媒体被移除时的错误消息参数：content、apiError=media_removed、media_reason（media_budget/unsupported_by_model/unprocessable）。
 */
function buildMediaRemovedError(kind, message) {
  let pdfUnsupported = kind === "document" && isPdfUnsupportedError(message);
  return {
    content: pdfUnsupported ? getPdfUnsupportedByModelMessage() : getMediaRemovedMessage(kind),
    apiError: "media_removed",
    apiErrorParams: isMediaBudgetError(message)
      ? {
          media_reason: "media_budget",
        }
      : {
          media: kind,
          media_reason: pdfUnsupported ? "unsupported_by_model" : "unprocessable",
        },
  };
}
//@ chunk-e6aww6q8.js:124907-125210 placement
/**
 * "API Error: an image/a document … was removed" 一类提示，交互式时提示双击 esc 编辑。
 */
function getMediaRemovedMessage(kind) {
  let noun = kind === "document" ? "a document" : "an image";
  let tail = getIsNonInteractiveSession()
    ? "Re-read the file with a different approach if you still need it."
    : "Double press esc to edit your message, or re-read the file if you still need it.";
  return `${API_ERROR_MESSAGE_PREFIX}: ${noun} in the conversation could not be processed and was removed. ${tail}`;
}
export {
  getMediaRemovedMessage,
  getPdfUnsupportedByModelMessage,
  getMediaKindsFromError,
  buildMediaRemovedError,
  classifyMediaError,
};
