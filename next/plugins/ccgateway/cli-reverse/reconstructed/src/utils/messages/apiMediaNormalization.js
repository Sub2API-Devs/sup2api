/**
 * utils/messages/apiMediaNormalization.ts
 *
 * 2.1.316 新增：发往 API 前的媒体规范化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { isPdfUnsupportedError } from "../../services/api/badRequestClassifier.js";
import { truncateToLength } from "../stringUtils.js";
import { isObjectBlock, hasImageBlock as hasImageBlock_2 } from "../toolResultStorage.js";
import { parseWebpHeader } from "../imageFormats.js";

//@ chunk-e6aww6q8.js:125210-125892 placement
/**
 * 把模型或 API 不接受的图片与文档替换为说明文字。
 */
function replaceUnsupportedMedia(kind, errorMessage) {
  if (kind === "document" && isPdfUnsupportedError(errorMessage))
    return "[Document removed: this model does not accept whole PDF documents. This is not a problem with the file; if it is a file on disk, read specific pages with the Read tool's pages parameter (returned as images), and do not read it again without pages.]";
  let label = kind === "document" ? "Document" : "Image";
  let detail = truncateToLength(
    errorMessage
      .replace(/.*messages[.[]\d+[\].]+content[.[]\d+[\].]+\S*:?\s*/, "")
      .replace(/["}]+\s*$/, "")
      .replace(/\s+/g, " ")
      .trim(),
    200,
  );
  let detailSuffix = detail.length > 0 ? ` (${detail})` : "";
  return `[${label} removed: the API could not process this ${kind}${detailSuffix}. The file may be unsupported or corrupt; do not retry reading it. If you need to inspect it, use a shell command instead.]`;
}
//@ chunk-e6aww6q8.js:125892-126115 placement
function replaceMatchingBlock(block, matches, replacement) {
  if (!isObjectBlock(block)) return block;
  if (matches(block)) return replacement;
  if (
    block.type === "tool_result" &&
    "content" in block &&
    Array.isArray(block.content) &&
    block.content.some((innerBlock) => isObjectBlock(innerBlock) && matches(innerBlock))
  )
    return {
      ...block,
      content: block.content.map((innerBlock) =>
        isObjectBlock(innerBlock) && matches(innerBlock) ? replacement : innerBlock,
      ),
    };
  return block;
}
//@ chunk-e6aww6q8.js:126115-126294 placement
function replaceNestedBlock(block, nestedContentIdx, kind, replacement) {
  if (
    block.type !== "tool_result" ||
    !("content" in block) ||
    !Array.isArray(block.content) ||
    block.content[nestedContentIdx]?.type !== kind
  )
    return block;
  return {
    ...block,
    content: block.content.map((innerBlock, innerIndex) =>
      innerIndex === nestedContentIdx ? replacement : innerBlock,
    ),
  };
}
//@ chunk-e6aww6q8.js:126294-126742 placement
/**
 * 把某条用户消息中指定位置（可为 tool_result 内的嵌套位置）的不支持媒体块替换成说明文字，返回新消息列表；未变化时返回原列表。
 */
function replaceUnsupportedMediaAt(messagesForAPI, location, errorMessage) {
  let message = messagesForAPI[location.messageIdx];
  if (message?.type !== "user" || !Array.isArray(message.message.content)) return messagesForAPI;
  let block = message.message.content[location.contentIdx];
  if (!block) return messagesForAPI;
  let replacement = {
    type: "text",
    text: replaceUnsupportedMedia(location.kind, errorMessage),
  };
  let nextBlock =
    location.nestedContentIdx !== undefined
      ? replaceNestedBlock(block, location.nestedContentIdx, location.kind, replacement)
      : replaceMatchingBlock(block, (innerBlock) => innerBlock.type === location.kind, replacement);
  if (nextBlock === block) return messagesForAPI;
  let nextMessage = {
    ...message,
    message: {
      ...message.message,
      content: message.message.content.map((contentBlock, contentIndex) =>
        contentIndex === location.contentIdx ? nextBlock : contentBlock,
      ),
    },
  };
  return messagesForAPI.map((message, messageIndex) =>
    messageIndex === location.messageIdx ? nextMessage : message,
  );
}
//@ chunk-e6aww6q8.js:126742-126820 placement
var MEDIA_BLOCK_SOURCES = {
  image: {
    url: true,
    file: true,
  },
  document: {
    url: true,
    file: true,
    text: true,
    content: true,
  },
};
//@ chunk-e6aww6q8.js:126820-126967 placement
function isUnsupportedMediaSource(block, kind) {
  if (block.type !== kind) return false;
  let source = "source" in block ? block.source : undefined;
  return !(
    isObjectBlock(source) &&
    typeof source.type === "string" &&
    Object.hasOwn(MEDIA_BLOCK_SOURCES[kind], source.type)
  );
}
//@ chunk-e6aww6q8.js:126967-127182 placement
function replaceInUserMessage(message, matches, replacement) {
  if (message.type !== "user" || !Array.isArray(message.message.content)) return message;
  let changed = false;
  let content = message.message.content.map((block) => {
    let nextBlock = replaceMatchingBlock(block, matches, replacement);
    if (nextBlock !== block) changed = true;
    return nextBlock;
  });
  return changed
    ? {
        ...message,
        message: {
          ...message.message,
          content,
        },
      }
    : message;
}
//@ chunk-e6aww6q8.js:127182-127396 placement
/**
 * 从后往前找到最后一条含该类不支持来源媒体的用户消息，替换为说明文字，返回新消息列表与该消息下标。
 */
function replaceLastUnsupportedMedia(messagesForAPI, kind, errorMessage) {
  let replacement = {
    type: "text",
    text: replaceUnsupportedMedia(kind, errorMessage),
  };
  let matches = (block) => isUnsupportedMediaSource(block, kind);
  for (let idx = messagesForAPI.length - 1; idx >= 0; idx--) {
    let message = messagesForAPI[idx];
    if (!message) continue;
    let nextMessage = replaceInUserMessage(message, matches, replacement);
    if (nextMessage !== message)
      return {
        messages: messagesForAPI.map((message, messageIndex) =>
          messageIndex === idx ? nextMessage : message,
        ),
        carrierIdx: idx,
      };
  }
  return;
}
//@ chunk-e6aww6q8.js:127396-127502 placement
var IMAGE_TOO_LARGE_ERROR_RE =
  /base64\.data: (At least one of the image dimensions exceed max allowed size[^:]*: (\d+) pixels)/;
//@ chunk-e6aww6q8.js:127502-127565 placement
/**
 * 从"图片过大"错误信息中取出上限数值。
 */
function tooLargeLimitFromError(errorDetails) {
  let match = IMAGE_TOO_LARGE_ERROR_RE.exec(errorDetails);
  return match ? Number(match[2]) : undefined;
}
//@ chunk-e6aww6q8.js:127565-127851 placement (2.1.88 match: isBase64ImageBlock, 0.885)
function isBase64ImageBlock(messagesForAPI, errorMessage) {
  let match = IMAGE_TOO_LARGE_ERROR_RE.exec(errorMessage);
  if (!match?.[1]) return messagesForAPI;
  let maxDimension = Number(match[2]);
  let replacement = {
    type: "text",
    text: replaceUnsupportedMedia("image", match[1]),
  };
  let mapped = messagesForAPI.map((message) =>
    replaceInUserMessage(
      message,
      (block) => {
        let header = hasImageBlock_2(block)
          ? parseWebpHeader(Buffer.from(block.source.data, "base64"))
          : undefined;
        return header !== undefined && Math.max(header.width, header.height) > maxDimension;
      },
      replacement,
    ),
  );
  return mapped.some((message, index) => message !== messagesForAPI[index]) ? mapped : messagesForAPI;
}
//@ chunk-e6aww6q8.js:129314-129356 placement
/**
 * 判断消息是否为 fallback 类型。
 */
function isFallbackMessage(block) {
  return block.type === "fallback";
}
export {
  tooLargeLimitFromError,
  isBase64ImageBlock,
  isFallbackMessage,
  replaceUnsupportedMediaAt,
  replaceLastUnsupportedMedia,
};
