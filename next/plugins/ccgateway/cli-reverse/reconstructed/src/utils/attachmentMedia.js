/**
 * utils/attachmentMedia.ts
 *
 * 附件媒体（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qz53w8v8.js (23)
 * attribution: placement 15, sole-consumer 8
 */
import { randomUUID } from "crypto";
import {
  isFirstPartyApiBackend,
  getProviderForModel,
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
} from "./model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  MAX_IMAGE_DIMENSION_BY_PROVIDER,
  MIN_IMAGE_DIMENSION,
  checkImageBlockSource,
  maybeResizeAndDownsampleImageBlock,
} from "./imageResizer.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { getCatalogEntry } from "./model/modelCatalog.js";
import { IMAGE_LIMITS, MAX_MEDIA_BASE64_BYTES } from "./mediaLimits.js";
import { onceExport } from "../../vendor/lodash-es/once.js";
import { identity } from "./identity.js";
import { isPlainObject } from "./isPlainObject.js";
import { describeImageAttachment } from "../tools/BashTool/utils.js";
import { isObjectBlock } from "./toolResultStorage.js";
import { isNonEmptyImageAttachment } from "./messages/messagePredicates.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-qz53w8v8.js:1837-1907 placement
/**
 * 按模型返回图片尺寸上限（一方 API 且开关打开时无限）。
 */
function maxImageDimensionForModel(model) {
  return isFirstPartyApiBackend() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_gray", false) === true
    ? 1 / 0
    : MAX_IMAGE_DIMENSION_BY_PROVIDER[getProviderForModel(model)];
}
//@ chunk-qz53w8v8.js:1907-2423 placement
/**
 * 计算某模型的图片限制：按模型目录的 image_limits 与通用上限取最小宽高、图片 token 上限与 base64 大小（一方 API 且开关打开时放宽），与默认值相同时直接返回 IMAGE_LIMITS。
 */
function imageLimitsForModel(model) {
  let maxBase64Size = maxBase64SizeForProvider();
  let canonicalName = model ? getCanonicalName(model) : undefined;
  let catalogLimits = canonicalName ? getCatalogEntry(canonicalName)?.image_limits : undefined;
  let unusedLimit = undefined;
  let maxDimension = maxImageDimensionForModel(model);
  let capDimension = maxDimension;
  let rejectMaxWidth = Math.min(catalogLimits?.maxWidth ?? IMAGE_LIMITS.maxWidth, maxDimension);
  let rejectMaxHeight = Math.min(catalogLimits?.maxHeight ?? IMAGE_LIMITS.maxHeight, maxDimension);
  let maxWidth = Math.min(atLeastMinImageDimension(undefined?.maxWidth, rejectMaxWidth), capDimension);
  let maxHeight = Math.min(atLeastMinImageDimension(undefined?.maxHeight, rejectMaxHeight), capDimension);
  let maxImageTokens = catalogLimits?.maxImageTokens;
  let base64Limit = catalogLimits?.maxBase64Size ?? maxBase64Size;
  if (
    maxImageTokens === undefined &&
    maxWidth === IMAGE_LIMITS.maxWidth &&
    maxHeight === IMAGE_LIMITS.maxHeight &&
    base64Limit === IMAGE_LIMITS.maxBase64Size
  )
    return IMAGE_LIMITS;
  return {
    maxWidth,
    maxHeight,
    maxImageTokens,
    rejectMaxWidth: Math.max(rejectMaxWidth, maxWidth),
    rejectMaxHeight: Math.max(rejectMaxHeight, maxHeight),
    maxBase64Size: base64Limit,
    targetRawSize: (base64Limit * 3) / 4,
  };
}
//@ chunk-qz53w8v8.js:2423-2473 placement
/**
 * 未指定时用默认值，且不低于最小图片尺寸。
 */
function atLeastMinImageDimension(value, fallback) {
  return value === undefined ? fallback : Math.max(MIN_IMAGE_DIMENSION, value);
}
//@ chunk-qz53w8v8.js:2473-2580 placement
function maxBase64SizeForProvider() {
  if (
    getAPIProvider() === "firstParty" &&
    isFirstPartyAnthropicBaseUrl() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_crimson_vector", false)
  )
    return MAX_MEDIA_BASE64_BYTES;
  return IMAGE_LIMITS.maxBase64Size;
}
//@ chunk-qz53w8v8.js:2580-2596 placement
/**
 * 图片字节上限（4 MiB）。
 */
var MAX_IMAGE_BYTES = 4194304;
//@ chunk-qz53w8v8.js:2596-2608 placement
/**
 * 图片字节上限的别名（与 Ltr 相同）。
 */
var MAX_IMAGE_BYTES_ALIAS = MAX_IMAGE_BYTES;
//@ chunk-qz53w8v8.js:2644-2652 placement
/**
 * 图片尺寸对齐的粒度（3）。
 */
var IMAGE_SIZE_ALIGNMENT = 3;
//@ chunk-qz53w8v8.js:2652-2938 placement
function mediaSlice(item, offset) {
  if (item.bytes === undefined) return item;
  let totalBytes = item.bytes.length;
  let min = Math.min(offset + MAX_IMAGE_BYTES_ALIAS, totalBytes);
  let end = min < totalBytes ? min - ((min - offset) % IMAGE_SIZE_ALIGNMENT) : min;
  return offset > 0 && offset >= totalBytes
    ? {
        deny: `offset ${offset} is at or past the item's ${totalBytes} bytes`,
      }
    : {
        type: item.type,
        mediaType: item.mediaType,
        base64: item.bytes.subarray(offset, end).toString("base64"),
        size: totalBytes,
        ...(end < totalBytes && {
          next: end,
        }),
      };
}
//@ chunk-qz53w8v8.js:2938-3033 placement
var NO_INFLIGHT_ATTACHMENT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qz53w8v8.js:2938", () => {
  NO_INFLIGHT_ATTACHMENT = Object.freeze({
    deny: "no prompt.submit in flight carries an attachment under that id",
  });
});
//@ chunk-qz53w8v8.js:3033-3356 placement
/**
 * 创建会话内的媒体暂存：hold 为附件分配 id 并延迟读取，read 按偏移分片返回 base64，release/clear 释放。
 */
function createMediaStore() {
  let items = new Map();
  return {
    hold: (entries, options) =>
      entries.map((entry) => {
        let id = `media_${randomUUID().replace(/-/g, "")}`;
        items.set(
          id,
          onceExport(() => entry.read(options)),
        );
        return {
          ...entry.attachment,
          id,
        };
      }),
    release: (entries) => entries.forEach((entry) => items.delete(entry.id ?? "")),
    read: async ({ id, offset }) => {
      let item = await items.get(id)?.();
      return item === undefined || !items.has(id) ? NO_INFLIGHT_ATTACHMENT : mediaSlice(item, offset ?? 0);
    },
    clear: () => items.clear(),
  };
}
//@ chunk-qz53w8v8.js:3356-3389 placement
/**
 * 回调执行期间暂存提示媒体附件的存储。
 */
var mediaHoldStore; // deferred: uses createMediaStore of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qz53w8v8.js:3356", () => {
  mediaHoldStore = identity(createMediaStore(), (store) => {
    store.clear();
  });
});
//@ chunk-qz53w8v8.js:3389-3492 placement
/**
 * 在回调执行期间暂存提示中的媒体附件，结束后释放。
 */
function withHeldMedia(entries, mainLoopModel, run) {
  let held = mediaHoldStore.hold(entries, mainLoopModel);
  return new Promise((resolve) => {
    resolve(run(held));
  }).finally(() => mediaHoldStore.release(held));
}
//@ chunk-qz53w8v8.js:3492-3584 sole-consumer
var IMAGE_NOT_INLINE_DENIAL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qz53w8v8.js:3492", () => {
  IMAGE_NOT_INLINE_DENIAL = Object.freeze({
    deny: "the image is not held inline: its block names a URL or a file",
  });
});
//@ chunk-qz53w8v8.js:3584-3777 sole-consumer (2.1.88 match: buildImageToolResult, 0.792)
/**
 * （切分错误）从 image 块读出 base64 图片字节；URL/文件来源的图片返回拒绝说明。
 */
function readInlineImageBytes(entry) {
  if (entry.block.type === "text")
    return {
      unreadable: entry.block.text,
    };
  let { source } = entry.block;
  return source.type === "base64"
    ? {
        type: "image",
        mediaType: source.media_type,
        bytes: Buffer.from(source.data, "base64"),
      }
    : IMAGE_NOT_INLINE_DENIAL;
}
//@ chunk-qz53w8v8.js:3777-3904 sole-consumer
var DOCUMENT_NOT_INLINE_DENIAL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qz53w8v8.js:3777", () => {
  DOCUMENT_NOT_INLINE_DENIAL = Object.freeze({
    deny: "the document is not held as inline bytes: its block names a URL or a file, or nests other blocks",
  });
});
//@ chunk-qz53w8v8.js:3904-3937 sole-consumer
var APPLICATION_OCTET_STREAM = "application/octet-stream";
//@ chunk-qz53w8v8.js:3937-4153 sole-consumer
function readInlineDocumentBytes(source) {
  let sourceObject = isPlainObject(source) ? source : {};
  let { data, media_type: mediaType } = sourceObject;
  let isBase64 = sourceObject.type === "base64";
  return typeof data === "string" && (isBase64 || sourceObject.type === "text")
    ? {
        type: "document",
        mediaType: typeof mediaType === "string" ? mediaType : APPLICATION_OCTET_STREAM,
        bytes: Buffer.from(data, isBase64 ? "base64" : "utf8"),
      }
    : DOCUMENT_NOT_INLINE_DENIAL;
}
//@ chunk-qz53w8v8.js:4153-4223 sole-consumer
/**
 * （切分错误）文档附件读取器：read() 返回内联 document 字节。
 */
var makeDocumentAttachmentReader = (block) => ({
  attachment: {
    type: "document",
  },
  read: async () => readInlineDocumentBytes(block.source),
});
//@ chunk-qz53w8v8.js:4368-4436 sole-consumer
/**
 * （切分错误）图片附件读取器：attachment 描述 + read() 按模型限制取图片字节。
 */
var makeImageAttachmentReader = (block) => ({
  attachment: describeImageAttachment(block),
  read: async (model) => readInlineImageBytes(await checkImageBlockSource(block, imageLimitsForModel(model))),
});
//@ chunk-qz53w8v8.js:4436-4530 sole-consumer (2.1.88 match: isMedia, 1)
function isMedia(block) {
  if (!isObjectBlock(block)) return [];
  return block.type === "image"
    ? [makeImageAttachmentReader(block)]
    : block.type === "document"
      ? [makeDocumentAttachmentReader(block)]
      : [];
}
//@ chunk-qz53w8v8.js:4530-4592 placement
var EMPTY_IMAGE_PASTE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qz53w8v8.js:4530", () => {
  EMPTY_IMAGE_PASTE = Object.freeze({
    unreadable: "the pasted image is empty",
  });
});
//@ chunk-qz53w8v8.js:4592-4764 placement
var imageAttachmentSource = (attachment) => ({
  attachment: {
    type: "image",
    mediaType: attachment.mediaType,
    filename: attachment.filename,
  },
  read: async (model) =>
    isNonEmptyImageAttachment(attachment)
      ? readInlineImageBytes(
          await maybeResizeAndDownsampleImageBlock({
            data: attachment.content,
            mediaType: attachment.mediaType,
            limits: imageLimitsForModel(model),
          }),
        )
      : EMPTY_IMAGE_PASTE,
});
//@ chunk-qz53w8v8.js:4764-4881 placement (2.1.88 match: _temp, 1)
/**
 * 收集提示中的媒体来源：提示内容里的媒体块与粘贴内容中的图片。
 */
var promptMediaSources = (content, pastedContents) => [
  ...(typeof content === "string" ? [] : content.flatMap(isMedia)),
  ...Object.values(pastedContents ?? {})
    .filter((pastedContent) => pastedContent.type === "image")
    .map(imageAttachmentSource),
];
export {
  imageLimitsForModel,
  promptMediaSources,
  withHeldMedia,
  mediaHoldStore,
  NO_INFLIGHT_ATTACHMENT,
  MAX_IMAGE_BYTES_ALIAS,
  MAX_IMAGE_BYTES,
};
