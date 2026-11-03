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
import { IMAGE_LIMITS, nOi } from "./truncateGraphemes.js";
import { onceExport } from "../../vendor/lodash-es/once.js";
import { ge } from "./identity.js";
import { isPlainObject } from "./isPlainObject.js";
import { describeImageAttachment } from "../tools/BashTool/utils.js";
import { bl } from "./toolResultStorage.js";
import { isNonEmptyImageAttachment } from "./messages/messagePredicates.js";

//@ chunk-qz53w8v8.js:1837-1907 placement
function R(e) {
  return isFirstPartyApiBackend() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_gray", !1) === !0
    ? 1 / 0
    : MAX_IMAGE_DIMENSION_BY_PROVIDER[getProviderForModel(e)];
}
/**
 * 计算某模型的图片限制：按模型目录的 image_limits 与通用上限取最小宽高、图片 token 上限与 base64 大小（一方 API 且开关打开时放宽），与默认值相同时直接返回 IMAGE_LIMITS。
 */
//@ chunk-qz53w8v8.js:1907-2423 placement
function imageLimitsForModel(model) {
  let maxBase64Size = maxBase64SizeForProvider(),
    canonicalName = model ? getCanonicalName(model) : void 0,
    catalogLimits = canonicalName ? getCatalogEntry(canonicalName)?.image_limits : void 0,
    a = void 0,
    maxDimension = R(model),
    capDimension = maxDimension,
    rejectMaxWidth = Math.min(catalogLimits?.maxWidth ?? IMAGE_LIMITS.maxWidth, maxDimension),
    rejectMaxHeight = Math.min(catalogLimits?.maxHeight ?? IMAGE_LIMITS.maxHeight, maxDimension),
    maxWidth = Math.min(f((void 0)?.maxWidth, rejectMaxWidth), capDimension),
    maxHeight = Math.min(f((void 0)?.maxHeight, rejectMaxHeight), capDimension),
    maxImageTokens = catalogLimits?.maxImageTokens,
    base64Limit = catalogLimits?.maxBase64Size ?? maxBase64Size;
  if (
    maxImageTokens === void 0 &&
    maxWidth === IMAGE_LIMITS.maxWidth &&
    maxHeight === IMAGE_LIMITS.maxHeight &&
    base64Limit === IMAGE_LIMITS.maxBase64Size
  )
    return IMAGE_LIMITS;
  return {
    maxWidth: maxWidth,
    maxHeight: maxHeight,
    maxImageTokens: maxImageTokens,
    rejectMaxWidth: Math.max(rejectMaxWidth, maxWidth),
    rejectMaxHeight: Math.max(rejectMaxHeight, maxHeight),
    maxBase64Size: base64Limit,
    targetRawSize: (base64Limit * 3) / 4,
  };
}
//@ chunk-qz53w8v8.js:2423-2473 placement
function f(e, t) {
  return e === void 0 ? t : Math.max(MIN_IMAGE_DIMENSION, e);
}
//@ chunk-qz53w8v8.js:2473-2580 placement
function maxBase64SizeForProvider() {
  if (
    getAPIProvider() === "firstParty" &&
    isFirstPartyAnthropicBaseUrl() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_crimson_vector", !1)
  )
    return nOi;
  return IMAGE_LIMITS.maxBase64Size;
}
//@ chunk-qz53w8v8.js:2580-2596 placement
var Ltr = 4194304;
//@ chunk-qz53w8v8.js:2596-2608 placement
var Htr = Ltr;
//@ chunk-qz53w8v8.js:2644-2652 placement
var y = 3;
//@ chunk-qz53w8v8.js:2652-2938 placement
function mediaSlice(e, t) {
  if (e.bytes === void 0) return e;
  let o = e.bytes.length,
    min = Math.min(t + Htr, o),
    a = min < o ? min - ((min - t) % y) : min;
  return t > 0 && t >= o
    ? { deny: `offset ${t} is at or past the item's ${o} bytes` }
    : {
        type: e.type,
        mediaType: e.mediaType,
        base64: e.bytes.subarray(t, a).toString("base64"),
        size: o,
        ...(a < o && { next: a }),
      };
}
//@ chunk-qz53w8v8.js:2938-3033 placement
var freeze = Object.freeze({ deny: "no prompt.submit in flight carries an attachment under that id" });
/**
 * 创建会话内的媒体暂存：hold 为附件分配 id 并延迟读取，read 按偏移分片返回 base64，release/clear 释放。
 */
//@ chunk-qz53w8v8.js:3033-3356 placement
function createMediaStore() {
  let e = new Map();
  return {
    hold: (t, o) =>
      t.map((r) => {
        let a = `media_${randomUUID().replace(/-/g, "")}`;
        return (
          e.set(
            a,
            onceExport(() => r.read(o)),
          ),
          { ...r.attachment, id: a }
        );
      }),
    release: (t) => t.forEach((o) => e.delete(o.id ?? "")),
    read: async ({ id: id, offset: offset }) => {
      let r = await e.get(id)?.();
      return r === void 0 || !e.has(id) ? freeze : mediaSlice(r, offset ?? 0);
    },
    clear: () => e.clear(),
  };
}
//@ chunk-qz53w8v8.js:3356-3389 placement
var lYr = ge(createMediaStore(), (e) => {
  e.clear();
});
/**
 * 在回调执行期间暂存提示中的媒体附件，结束后释放。
 */
//@ chunk-qz53w8v8.js:3389-3492 placement
function withHeldMedia(e, t, o) {
  let hold = lYr.hold(e, t);
  return new Promise((a) => {
    a(o(hold));
  }).finally(() => lYr.release(hold));
}
//@ chunk-qz53w8v8.js:3492-3584 sole-consumer
var IMAGE_NOT_INLINE_DENIAL = Object.freeze({
  deny: "the image is not held inline: its block names a URL or a file",
});
/**
 * （切分错误）从 image 块读出 base64 图片字节；URL/文件来源的图片返回拒绝说明。
 */
//@ chunk-qz53w8v8.js:3584-3777 sole-consumer = buildImageToolResult (0.792)
function readInlineImageBytes(e) {
  if (e.block.type === "text") return { unreadable: e.block.text };
  let { source: source } = e.block;
  return source.type === "base64"
    ? { type: "image", mediaType: source.media_type, bytes: Buffer.from(source.data, "base64") }
    : IMAGE_NOT_INLINE_DENIAL;
}
//@ chunk-qz53w8v8.js:3777-3904 sole-consumer
var DOCUMENT_NOT_INLINE_DENIAL = Object.freeze({
  deny: "the document is not held as inline bytes: its block names a URL or a file, or nests other blocks",
});
//@ chunk-qz53w8v8.js:3904-3937 sole-consumer
var APPLICATION_OCTET_STREAM = "application/octet-stream";
//@ chunk-qz53w8v8.js:3937-4153 sole-consumer
function readInlineDocumentBytes(e) {
  let t = isPlainObject(e) ? e : {},
    { data: o, media_type: media_type } = t,
    a = t.type === "base64";
  return typeof o === "string" && (a || t.type === "text")
    ? {
        type: "document",
        mediaType: typeof media_type === "string" ? media_type : APPLICATION_OCTET_STREAM,
        bytes: Buffer.from(o, a ? "base64" : "utf8"),
      }
    : DOCUMENT_NOT_INLINE_DENIAL;
}
/**
 * （切分错误）文档附件读取器：read() 返回内联 document 字节。
 */
//@ chunk-qz53w8v8.js:4153-4223 sole-consumer
var makeDocumentAttachmentReader = (e) => ({
  attachment: { type: "document" },
  read: async () => readInlineDocumentBytes(e.source),
});
/**
 * （切分错误）图片附件读取器：attachment 描述 + read() 按模型限制取图片字节。
 */
//@ chunk-qz53w8v8.js:4368-4436 sole-consumer
var makeImageAttachmentReader = (e) => ({
  attachment: describeImageAttachment(e),
  read: async (t) => readInlineImageBytes(await checkImageBlockSource(e, imageLimitsForModel(t))),
});
//@ chunk-qz53w8v8.js:4436-4530 sole-consumer = isMedia (1)
function isMedia(block) {
  if (!bl(block)) return [];
  return block.type === "image"
    ? [makeImageAttachmentReader(block)]
    : block.type === "document"
      ? [makeDocumentAttachmentReader(block)]
      : [];
}
//@ chunk-qz53w8v8.js:4530-4592 placement
var freeze_2 = Object.freeze({ unreadable: "the pasted image is empty" });
//@ chunk-qz53w8v8.js:4592-4764 placement
var imageAttachmentSource = (e) => ({
  attachment: { type: "image", mediaType: e.mediaType, filename: e.filename },
  read: async (t) =>
    isNonEmptyImageAttachment(e)
      ? readInlineImageBytes(
          await maybeResizeAndDownsampleImageBlock({
            data: e.content,
            mediaType: e.mediaType,
            limits: imageLimitsForModel(t),
          }),
        )
      : freeze_2,
});
/**
 * 收集提示中的媒体来源：提示内容里的媒体块与粘贴内容中的图片。
 */
//@ chunk-qz53w8v8.js:4764-4881 placement = _temp (1)
var promptMediaSources = (e, t) => [
  ...(typeof e === "string" ? [] : e.flatMap(isMedia)),
  ...Object.values(t ?? {})
    .filter((o) => o.type === "image")
    .map(imageAttachmentSource),
];

export { imageLimitsForModel, promptMediaSources, withHeldMedia, lYr, freeze, Htr, Ltr };
