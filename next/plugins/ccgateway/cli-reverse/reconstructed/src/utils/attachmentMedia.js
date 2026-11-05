/**
 * utils/attachmentMedia.ts
 *
 * 附件媒体（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dds7xhsh.js (5), chunk-rkc3d9jc.js (19)
 * attribution: placement 15, layout 1, sole-consumer 8
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

//@ chunk-dds7xhsh.js:455-525 placement
/**
 * 按模型返回图片尺寸上限（一方 API 且开关打开时无限）。
 */
function maxImageDimensionForModel(model) {
  return isFirstPartyApiBackend() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_gray", false) === true
    ? 1 / 0
    : MAX_IMAGE_DIMENSION_BY_PROVIDER[getProviderForModel(model)];
}
//@ chunk-dds7xhsh.js:525-1041 placement
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
//@ chunk-dds7xhsh.js:1041-1387 layout
function modelImageLimits(mainLoopModel) {
  let modelName = mainLoopModel ? getCanonicalName(mainLoopModel) : undefined;
  let imageLimits = modelName ? getCatalogEntry(modelName)?.image_limits : undefined;
  if (imageLimits?.maxWidth === undefined || imageLimits.maxHeight === undefined) return;
  let overrideLimits = undefined;
  let min = Math.min(
    imageLimits.maxWidth,
    atLeastMinImageDimension(overrideLimits?.maxWidth, imageLimits.maxWidth),
  );
  let min_2 = Math.min(
    imageLimits.maxHeight,
    atLeastMinImageDimension(overrideLimits?.maxHeight, imageLimits.maxHeight),
  );
  if (min <= IMAGE_LIMITS.maxWidth || min_2 <= IMAGE_LIMITS.maxHeight) return;
  return {
    ...IMAGE_LIMITS,
    maxWidth: min,
    maxHeight: min_2,
    maxImageTokens: imageLimits.maxImageTokens,
  };
}
//@ chunk-dds7xhsh.js:1387-1437 placement
/**
 * 未指定时用默认值，且不低于最小图片尺寸。
 */
function atLeastMinImageDimension(value, fallback) {
  return value === undefined ? fallback : Math.max(MIN_IMAGE_DIMENSION, value);
}
//@ chunk-dds7xhsh.js:1437-1544 placement
function maxBase64SizeForProvider() {
  if (
    getAPIProvider() === "firstParty" &&
    isFirstPartyAnthropicBaseUrl() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_crimson_vector", false)
  )
    return MAX_MEDIA_BASE64_BYTES;
  return IMAGE_LIMITS.maxBase64Size;
}
//@ chunk-rkc3d9jc.js:1609-1625 placement
/**
 * 图片字节上限（4 MiB）。
 */
var MAX_IMAGE_BYTES = 4194304;
//@ chunk-rkc3d9jc.js:1625-1637 placement
/**
 * 图片字节上限的别名（与 Ltr 相同）。
 */
var MAX_IMAGE_BYTES_ALIAS = MAX_IMAGE_BYTES;
//@ chunk-rkc3d9jc.js:1673-1681 placement
/**
 * 图片尺寸对齐的粒度（3）。
 */
var IMAGE_SIZE_ALIGNMENT = 3;
//@ chunk-rkc3d9jc.js:1681-1967 placement
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
//@ chunk-rkc3d9jc.js:1967-2062 placement
var NO_INFLIGHT_ATTACHMENT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkc3d9jc.js:1967", () => {
  NO_INFLIGHT_ATTACHMENT = Object.freeze({
    deny: "no prompt.submit in flight carries an attachment under that id",
  });
});
//@ chunk-rkc3d9jc.js:2062-2385 placement
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
//@ chunk-rkc3d9jc.js:2385-2418 placement
/**
 * 回调执行期间暂存提示媒体附件的存储。
 */
var mediaHoldStore; // deferred: uses createMediaStore of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rkc3d9jc.js:2385", () => {
  mediaHoldStore = identity(createMediaStore(), (store) => {
    store.clear();
  });
});
//@ chunk-rkc3d9jc.js:2418-2521 placement
/**
 * 在回调执行期间暂存提示中的媒体附件，结束后释放。
 */
function withHeldMedia(entries, mainLoopModel, run) {
  let held = mediaHoldStore.hold(entries, mainLoopModel);
  return new Promise((resolve) => {
    resolve(run(held));
  }).finally(() => mediaHoldStore.release(held));
}
//@ chunk-rkc3d9jc.js:2521-2613 sole-consumer
var IMAGE_NOT_INLINE_DENIAL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkc3d9jc.js:2521", () => {
  IMAGE_NOT_INLINE_DENIAL = Object.freeze({
    deny: "the image is not held inline: its block names a URL or a file",
  });
});
//@ chunk-rkc3d9jc.js:2613-2806 sole-consumer (2.1.88 match: buildImageToolResult, 0.79)
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
//@ chunk-rkc3d9jc.js:2806-2933 sole-consumer
var DOCUMENT_NOT_INLINE_DENIAL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkc3d9jc.js:2806", () => {
  DOCUMENT_NOT_INLINE_DENIAL = Object.freeze({
    deny: "the document is not held as inline bytes: its block names a URL or a file, or nests other blocks",
  });
});
//@ chunk-rkc3d9jc.js:2933-2966 sole-consumer
var APPLICATION_OCTET_STREAM = "application/octet-stream";
//@ chunk-rkc3d9jc.js:2966-3182 sole-consumer
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
//@ chunk-rkc3d9jc.js:3182-3252 sole-consumer
/**
 * （切分错误）文档附件读取器：read() 返回内联 document 字节。
 */
var makeDocumentAttachmentReader = (block) => ({
  attachment: {
    type: "document",
  },
  read: async () => readInlineDocumentBytes(block.source),
});
//@ chunk-rkc3d9jc.js:3397-3465 sole-consumer
/**
 * （切分错误）图片附件读取器：attachment 描述 + read() 按模型限制取图片字节。
 */
var makeImageAttachmentReader = (block) => ({
  attachment: describeImageAttachment(block),
  read: async (model) => readInlineImageBytes(await checkImageBlockSource(block, imageLimitsForModel(model))),
});
//@ chunk-rkc3d9jc.js:3465-3559 sole-consumer (2.1.88 match: isMedia, 1)
function isMedia(block) {
  if (!isObjectBlock(block)) return [];
  return block.type === "image"
    ? [makeImageAttachmentReader(block)]
    : block.type === "document"
      ? [makeDocumentAttachmentReader(block)]
      : [];
}
//@ chunk-rkc3d9jc.js:3559-3621 placement
var EMPTY_IMAGE_PASTE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkc3d9jc.js:3559", () => {
  EMPTY_IMAGE_PASTE = Object.freeze({
    unreadable: "the pasted image is empty",
  });
});
//@ chunk-rkc3d9jc.js:3621-3793 placement
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
//@ chunk-rkc3d9jc.js:3793-3910 placement (2.1.88 match: _temp, 1)
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
  modelImageLimits,
  mediaHoldStore,
  NO_INFLIGHT_ATTACHMENT,
  MAX_IMAGE_BYTES_ALIAS,
  MAX_IMAGE_BYTES,
  promptMediaSources,
  withHeldMedia,
};
