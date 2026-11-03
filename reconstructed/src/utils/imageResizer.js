/**
 * utils/imageResizer.ts
 *
 * 图片缩放、重编码与压缩到字节/token 上限，图片格式探测与错误分类
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/imageResizer.ts
 * pieces: chunk-mvvq2nx1.js (39), chunk-p8kytbnw.js (2), chunk-qz53w8v8.js (1)
 * attribution: placement 16, affinity 1, fingerprint 13, layout 9, callgraph-witnessed 2, file-local 1
 */
import { MAX_IMAGE_DIMENSION, IMAGE_SOURCE_MARKER_PREFIX, IMAGE_MARKER_PREFIX } from "./imageErrors.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import {
  inspectWebpChunks,
  countJpegScans,
  stripPngMetadata,
  jpegSofComponentCount,
  isAnimatedWebp,
  parseWebpHeader,
  isLosslessWebp,
} from "./imageFormats.js";
import { isDiskless, isDisklessProcess } from "../bootstrap/state.js";
import {
  imageTileCount,
  MODEL_COPY_IMAGE_BYTES,
  IMAGE_LIMITS,
  MAX_IMAGE_SIDE_PX,
} from "./truncateGraphemes.js";
import { getErrnoCode, sanitizeClassName, sanitizeErrnoForTelemetry, errorMessage } from "./errors.js";
import { fromEnum, lit, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { Ph } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { tryWebpEncoding, webpMaxBytesIfOn, chooseImageEncoding } from "./imageWebp.js";
import { logEvent } from "../services/analytics/index.js";
import { logForDebugging } from "./debug.js";
import { toEncoderFormat } from "../tools/FileReadTool/FileReadTool.js";
import { logError } from "./log.js";
import { isFirstPartyApiBackend } from "./model/providers.js";
import { formatFileSize } from "./format.js";
import { isPlainObject } from "./isPlainObject.js";

//@ chunk-mvvq2nx1.js:5350-5451 placement
/**
 * 图片解码状态与常量（最大像素、编码并发、限流 toBuffer、弱映射缓存）。
 */
var imageDecodingOff = false;
var ERR_IMAGE_DECODING_OFF = "ERR_IMAGE_DECODING_OFF";
var MAX_DECODE_PIXELS = MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION;
var ENCODE_CONCURRENCY = 4;
var limitedToBuffer = limitConcurrency(ENCODE_CONCURRENCY, (e) => e.toBuffer());
var imageDecoderState = 100;
var weakMap = new WeakMap();
//@ chunk-mvvq2nx1.js:5451-5575 placement
/**
 * 返回“图片解码代价过高”的拒绝。
 */
function rejectCostlyDecode() {
  return Promise.reject(
    Object.assign(Error("Image is too costly to decode"), {
      code: "ERR_IMAGE_DECODE_FAILED",
    }),
  );
}
//@ chunk-mvvq2nx1.js:5575-5771 placement
/**
 * 包装图片处理管线，使 toBuffer 经过并发限制。
 */
function wrapImagePipeline(e) {
  return {
    metadata: () => e.metadata(),
    resize: (n, r, o) => wrapImagePipeline(e.resize(n, r, o)),
    rotate: (n) => wrapImagePipeline(e.rotate(n)),
    jpeg: (n) => wrapImagePipeline(e.jpeg(n)),
    png: (n) => wrapImagePipeline(e.png(n)),
    webp: (n) => wrapImagePipeline(e.webp(n)),
    toBuffer: () => limitedToBuffer(e),
  };
}
//@ chunk-mvvq2nx1.js:5771-5882 placement
/**
 * 所有变换都返回自身的管线（固定输出）。
 */
function staticImagePipeline(rejectCostlyDecode) {
  let n = {
    metadata: rejectCostlyDecode,
    resize: () => n,
    rotate: () => n,
    jpeg: () => n,
    png: () => n,
    webp: () => n,
    toBuffer: rejectCostlyDecode,
  };
  return n;
}
//@ chunk-mvvq2nx1.js:5882-5914 placement
/**
 * 判断图片解码是否被禁用（显式关闭或无盘）。
 */
function isImageDecodingDisabled() {
  return imageDecodingOff || !isDisklessMode();
}
//@ chunk-mvvq2nx1.js:5914-6388 placement
function loadImageDecoder_2(e) {
  let n = isDisklessMode();
  if (!isImageDecodingDisabled())
    return staticImagePipeline(() =>
      Promise.reject(
        Object.assign(Error("Images are not decoded in a claude-code-server session"), {
          code: ERR_IMAGE_DECODING_OFF,
        }),
      ),
    );
  if (typeof Bun.Image !== "function")
    return staticImagePipeline(() =>
      Promise.reject(
        Object.assign(Error("This runtime has no Bun.Image"), {
          code: "ERR_IMAGE_UNAVAILABLE",
        }),
      ),
    );
  let bytes = inspectWebpChunks(e) ?? e;
  if (!n) return new Bun.Image(bytes);
  let o = weakMap.get(bytes);
  if (o === undefined) {
    o = countJpegScans(bytes, imageDecoderState) > imageDecoderState ? null : stripPngMetadata(bytes);
    weakMap.set(bytes, o);
  }
  return o === null
    ? staticImagePipeline(rejectCostlyDecode)
    : wrapImagePipeline(
        new Bun.Image(o, {
          maxPixels: MAX_DECODE_PIXELS,
        }),
      );
}
//@ chunk-mvvq2nx1.js:6388-6429 placement
/**
 * 加载图片解码器（返回 Promise）。
 */
function loadImageDecoder() {
  return Promise.resolve(loadImageDecoder_2);
}
//@ chunk-mvvq2nx1.js:6429-6460 placement
function isDisklessMode() {
  return isDiskless() || isDisklessProcess();
}
//@ chunk-mvvq2nx1.js:6460-6508 placement
var MAX_TILE_SIDE = 1568;
var MAX_TILE_HEIGHT = 1568;
var MIN_SCALED_SIDE = 85;
var SCALE_STEP = 5;
var MIN_SEARCH_SIDE = 10;
var MAX_TILE_PIXELS = 1398100;
//@ chunk-mvvq2nx1.js:6508-6759 placement
/**
 * 按最大边与 tile 数上限缩小尺寸（保持比例，二分搜索）。
 */
function fitWithinTileBudget(e, n, r = MAX_TILE_SIDE, o = MAX_TILE_HEIGHT) {
  if (e <= r && n <= r && imageTileCount(e, n) <= o) return [e, n];
  if (n > e) {
    let [m, h] = fitWithinTileBudget(n, e, r, o);
    return [h, m];
  }
  let u = e / n;
  let s = 1;
  let i = e;
  while (s + 1 < i) {
    let m = (s + i) >> 1;
    let max = Math.max(Math.round(m / u), 1);
    if (m <= r && imageTileCount(m, max) <= o) s = m;
    else i = m;
  }
  return [s, Math.max(Math.round(s / u), 1)];
}
//@ chunk-mvvq2nx1.js:6759-6963 placement
/**
 * 按最大宽高与 token 上限计算缩放后的尺寸。
 */
function fitImageDimensions(e, n, r) {
  if (e > r.maxWidth) {
    n = Math.round((n * r.maxWidth) / e);
    e = r.maxWidth;
  }
  if (n > r.maxHeight) {
    e = Math.round((e * r.maxHeight) / n);
    n = r.maxHeight;
  }
  return r.maxImageTokens === undefined ? [e, n] : fitWithinTileBudget(e, n, 1 / 0, r.maxImageTokens);
}
//@ chunk-mvvq2nx1.js:6963-7285 placement
/**
 * 把截图缩放并逐步降低质量编码为 JPEG，直到大小在上限内。
 */
async function encodePreviewJpeg(e) {
  let imageDecoder = await loadImageDecoder();
  let buffer = Buffer.from(e.buffer, e.byteOffset, e.byteLength);
  let o = await imageDecoder(buffer).metadata();
  let [u, s] = fitWithinTileBudget(o.width, o.height);
  let i = u !== o.width || s !== o.height;
  let m = MIN_SCALED_SIDE + SCALE_STEP;
  let h;
  do {
    m -= SCALE_STEP;
    let y = imageDecoder(buffer);
    if (i)
      y = y.resize(u, s, {
        fit: "fill",
      });
    h = await y
      .jpeg({
        quality: m,
      })
      .toBuffer();
  } while (h.length * 4 > MAX_TILE_PIXELS * 3 && m > MIN_SEARCH_SIDE);
  return {
    jpeg: h,
    w: u,
    h: s,
  };
}
//@ chunk-mvvq2nx1.js:7285-7393 affinity = IMAGE_EXTENSIONS (0.776)
/**
 * 图片处理错误类型编号（2 未知格式、3 未知、4 像素超限、5 内存、8 权限、9 格式不支持、10 解码失败、11 解码关闭）与 tengu_parsed_eagle 开关名、直通格式集合。
 */
var ERROR_TYPE_UNKNOWN_FORMAT = 2;
var ERROR_TYPE_UNKNOWN = 3;
var ERROR_TYPE_PIXEL_LIMIT = 4;
var ERROR_TYPE_MEMORY = 5;
var ERROR_TYPE_PERMISSION = 8;
var ERROR_TYPE_FORMAT_UNSUPPORTED = 9;
var ERROR_TYPE_DECODE_FAILED = 10;
var ERROR_TYPE_DECODING_OFF = 11;
var TENGU_PARSED_EAGLE = "tengu_parsed_eagle";
var PASSTHROUGH_IMAGE_FORMATS = new Set(["png", "jpeg", "gif", "webp"]);
//@ chunk-mvvq2nx1.js:7497-7574 fingerprint = ImageResizeError (1)
/**
 * 图片缩放/处理失败的错误类型。
 */
class ImageResizeError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImageResizeError";
  }
}
//@ chunk-mvvq2nx1.js:7574-8055 layout
function describeUndecodableImage(e) {
  if (jpegSofComponentCount(e) === 4)
    return {
      reason: "it is a CMYK JPEG, which Claude Code cannot decode",
      advice: "Re-save it as an RGB PNG or JPEG and try again.",
    };
  if (isAnimatedWebp(e))
    return {
      reason: "it is an animated WebP whose first frame Claude Code cannot decode",
      advice: "Save its first frame as a PNG or JPEG and try again.",
    };
  return {
    reason:
      "its pixels could not be decoded (the file may be damaged, or use an encoding Claude Code cannot read)",
    advice: "Re-save it as a PNG or JPEG and try again.",
  };
}
//@ chunk-mvvq2nx1.js:8055-8344 layout
/**
 * 把图片错误码映射为 ERROR_TYPE_* 编号。
 */
function classifyImageErrorCode(error) {
  switch (getErrnoCode(error)) {
    case "ERR_IMAGE_DECODE_FAILED":
      return ERROR_TYPE_DECODE_FAILED;
    case ERR_IMAGE_DECODING_OFF:
      return ERROR_TYPE_DECODING_OFF;
    case "ERR_IMAGE_UNKNOWN_FORMAT":
      return ERROR_TYPE_UNKNOWN_FORMAT;
    case "ERR_IMAGE_TOO_MANY_PIXELS":
      return ERROR_TYPE_PIXEL_LIMIT;
    case "ERR_IMAGE_FORMAT_UNSUPPORTED":
      return ERROR_TYPE_FORMAT_UNSUPPORTED;
    case "EACCES":
    case "EPERM":
      return ERROR_TYPE_PERMISSION;
    case "ENOMEM":
      return ERROR_TYPE_MEMORY;
    default:
      return ERROR_TYPE_UNKNOWN;
  }
}
//@ chunk-mvvq2nx1.js:8344-8374 layout
/**
 * 是否为未知类型的图片错误。
 */
function isUnknownImageErrorType(e) {
  return e === ERROR_TYPE_UNKNOWN;
}
//@ chunk-mvvq2nx1.js:8374-8565 layout
function getErrorTelemetryFields(error) {
  if (!(error instanceof Error))
    return {
      error_name: fromEnum(typeof error),
      error_code: lit(""),
    };
  return {
    error_name:
      sanitizeClassName(error.name !== "Error" ? error.name : error.constructor?.name) ?? lit("Error"),
    error_code: sanitizeErrnoForTelemetry(error) ?? lit(""),
  };
}
//@ chunk-mvvq2nx1.js:8565-8690 layout
function getImageFormatTelemetryFields(e) {
  let n = Ph(e);
  return {
    ...(n === "image/jpeg" && {
      jpeg_components: jpegSofComponentCount(e),
    }),
    ...(n === "image/webp" && {
      webp_animated: isAnimatedWebp(e),
    }),
  };
}
//@ chunk-mvvq2nx1.js:8690-8785 callgraph-witnessed = hashString (1)
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  return hash >>> 0;
}
//@ chunk-mvvq2nx1.js:8785-8898 layout
function getRejectDimensions(e) {
  return {
    rejectMaxWidth: e.rejectMaxWidth ?? e.maxWidth,
    rejectMaxHeight: e.rejectMaxHeight ?? e.maxHeight,
  };
}
//@ chunk-mvvq2nx1.js:8898-8909 layout
var MAX_PROVIDER_IMAGE_DIMENSION = 8000;
//@ chunk-mvvq2nx1.js:8909-14013 fingerprint = maybeResizeAndDownsampleImageBuffer (0.548)
/**
 * 按模型图片限制缩放/重编码：非直通格式转 PNG 或 WebP；尺寸不明时校验上限；仅超字节时先试 PNG 调色板再试 JPEG 80/60/40/20；需缩放时按 token 上限算目标尺寸后 resize。
 */
async function maybeResizeAndDownsampleImageBuffer(
  imageBuffer,
  n,
  ext,
  o,
  { timings: u, directWebpMaxBytes: s } = {},
) {
  if (imageBuffer.length === 0) throw new ImageResizeError("Image file is empty (0 bytes)");
  try {
    let sharp = await loadImageDecoder();
    let metadata = await sharp(imageBuffer).metadata();
    let mediaType = metadata.format ?? ext;
    let y = mediaType === "jpg" ? "jpeg" : mediaType;
    let p = imageBuffer;
    let I = n;
    if (!PASSTHROUGH_IMAGE_FORMATS.has(y)) {
      let { width, height } = metadata;
      let T = width === undefined || height === undefined ? undefined : fitImageDimensions(width, height, o);
      let webp =
        T !== undefined && T[0] === width && T[1] === height
          ? (await tryWebpEncoding(() => sharp(imageBuffer), s)).webp
          : undefined;
      p = webp ?? (await sharp(imageBuffer).png().toBuffer());
      I = p.length;
      metadata = await sharp(p).metadata();
      y = webp ? "webp" : "png";
    }
    if (!metadata.width || !metadata.height) {
      let webpHeader = parseWebpHeader(p);
      let { rejectMaxWidth, rejectMaxHeight } = getRejectDimensions(o);
      if (
        webpHeader === undefined ||
        webpHeader.width > rejectMaxWidth ||
        webpHeader.height > rejectMaxHeight
      )
        throw new ImageResizeError(
          `Unable to resize image \u2014 could not verify image dimensions are within the ${rejectMaxWidth}x${rejectMaxHeight}px API limit.`,
        );
      if (I > o.targetRawSize) {
        logEvent("tengu_image_resize", {
          over_byte_limit: true,
          over_dimension_limit: false,
          resized_for_tokens: false,
          original_size_bytes: I,
        });
        return {
          buffer: await sharp(p)
            .jpeg({
              quality: 80,
            })
            .toBuffer(),
          mediaType: "jpeg",
        };
      }
      return {
        buffer: p,
        mediaType: y,
      };
    }
    let originalWidth = metadata.width;
    let originalHeight = metadata.height;
    let [w, x] = fitImageDimensions(originalWidth, originalHeight, o);
    let R = w !== originalWidth || x !== originalHeight;
    if (I <= o.targetRawSize && !R)
      return {
        buffer: p,
        mediaType: y,
        dimensions: {
          originalWidth,
          originalHeight,
          displayWidth: w,
          displayHeight: x,
        },
      };
    let isPng = y === "png";
    logEvent("tengu_image_resize", {
      over_byte_limit: I > o.targetRawSize,
      over_dimension_limit: originalWidth > o.maxWidth || originalHeight > o.maxHeight,
      resized_for_tokens: R && w < o.maxWidth && x < o.maxHeight,
      original_size_bytes: I,
      original_width: originalWidth,
      original_height: originalHeight,
      target_width: w,
      target_height: x,
      max_width: o.maxWidth,
      max_height: o.maxHeight,
      max_image_tokens: o.maxImageTokens,
    });
    if (!R && I > o.targetRawSize) {
      if (isPng) {
        let pngCompressed = await timePngPalette(
          () =>
            sharp(p)
              .png({
                compressionLevel: 9,
                palette: true,
              })
              .toBuffer(),
          u,
        );
        if (pngCompressed.length <= o.targetRawSize)
          return {
            buffer: pngCompressed,
            mediaType: "png",
            dimensions: {
              originalWidth,
              originalHeight,
              displayWidth: w,
              displayHeight: x,
            },
          };
      }
      for (let quality of [80, 60, 40, 20]) {
        let compressedBuffer = await sharp(p)
          .jpeg({
            quality,
          })
          .toBuffer();
        if (compressedBuffer.length <= o.targetRawSize)
          return {
            buffer: compressedBuffer,
            mediaType: "jpeg",
            dimensions: {
              originalWidth,
              originalHeight,
              displayWidth: w,
              displayHeight: x,
            },
          };
      }
    }
    logForDebugging(`Resizing to ${w}x${x}`);
    let A =
      R &&
      s !== undefined &&
      originalWidth <= getRejectDimensions(o).rejectMaxWidth &&
      originalHeight <= getRejectDimensions(o).rejectMaxHeight &&
      isLosslessWebp(p)
        ? "png"
        : toEncoderFormat(y);
    let L = sharp(p).resize(w, x, {
      fit: "inside",
      withoutEnlargement: true,
    });
    if (A !== y) L = L.png();
    let G =
      A === "png"
        ? await tryWebpEncoding(
            () =>
              sharp(p).resize(w, x, {
                fit: "inside",
                withoutEnlargement: true,
              }),
            s,
          )
        : {};
    let ee = G.webp ?? (await L.toBuffer());
    if (ee.length > o.targetRawSize) {
      if (isPng) {
        let pngCompressed = await timePngPalette(
          () =>
            sharp(p)
              .resize(w, x, {
                fit: "inside",
                withoutEnlargement: true,
              })
              .png({
                compressionLevel: 9,
                palette: true,
              })
              .toBuffer(),
          u,
        );
        if (pngCompressed.length <= o.targetRawSize)
          return {
            buffer: pngCompressed,
            mediaType: "png",
            dimensions: {
              originalWidth,
              originalHeight,
              displayWidth: w,
              displayHeight: x,
            },
          };
      }
      for (let quality of [80, 60, 40, 20]) {
        let compressedBuffer = await sharp(p)
          .resize(w, x, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality,
          })
          .toBuffer();
        if (compressedBuffer.length <= o.targetRawSize)
          return {
            buffer: compressedBuffer,
            mediaType: "jpeg",
            dimensions: {
              originalWidth,
              originalHeight,
              displayWidth: w,
              displayHeight: x,
            },
          };
      }
      let smallerWidth = Math.min(w, 1000);
      let smallerHeight = Math.round((x * smallerWidth) / Math.max(w, 1));
      logForDebugging("Still too large, compressing with JPEG");
      let compressedBuffer = await sharp(p)
        .resize(smallerWidth, smallerHeight, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 20,
        })
        .toBuffer();
      logForDebugging(`JPEG compressed buffer size: ${compressedBuffer.length}`);
      return {
        buffer: compressedBuffer,
        mediaType: "jpeg",
        dimensions: {
          originalWidth,
          originalHeight,
          displayWidth: smallerWidth,
          displayHeight: smallerHeight,
        },
      };
    }
    return {
      buffer: ee,
      mediaType: G.webp ? "webp" : A,
      dimensions: {
        originalWidth,
        originalHeight,
        displayWidth: w,
        displayHeight: x,
      },
      losslessWebp: G.lossless,
    };
  } catch (error) {
    if (error instanceof ImageResizeError) throw error;
    let errorType = classifyImageErrorCode(error);
    let errorMsg = errorMessage(error);
    if (isUnknownImageErrorType(errorType)) logError(error);
    else
      logForDebugging(`Image resize failed: ${errorMsg}`, {
        level: "error",
      });
    logEvent("tengu_image_resize_failed", {
      original_size_bytes: n,
      error_type: errorType,
      error_message_hash: hashString(errorMsg),
      ...getErrorTelemetryFields(error),
      ...getImageFormatTelemetryFields(imageBuffer),
    });
    let normalizedExt = detectImageFormatFromBuffer(imageBuffer).slice(6);
    let base64Size = Math.ceil((n * 4) / 3);
    let webpHeader = parseWebpHeader(imageBuffer);
    if (webpHeader === undefined)
      throw new ImageResizeError(
        "Unable to resize image \u2014 image processing is unavailable and dimensions could not be read from the file header. " +
          "Please convert the image to PNG, JPEG, GIF, or WebP.",
      );
    let { rejectMaxWidth, rejectMaxHeight } =
      errorType === ERROR_TYPE_DECODING_OFF && isFirstPartyApiBackend()
        ? {
            rejectMaxWidth: MAX_PROVIDER_IMAGE_DIMENSION,
            rejectMaxHeight: MAX_PROVIDER_IMAGE_DIMENSION,
          }
        : getRejectDimensions(o);
    let x = webpHeader.width > rejectMaxWidth || webpHeader.height > rejectMaxHeight;
    if (base64Size <= o.maxBase64Size && !x) {
      logEvent("tengu_image_resize_fallback", {
        original_size_bytes: n,
        base64_size_bytes: base64Size,
        error_type: errorType,
      });
      return {
        buffer: imageBuffer,
        mediaType: normalizedExt,
      };
    }
    if (errorType === ERROR_TYPE_DECODING_OFF)
      throw new ImageResizeError(
        x
          ? `Unable to send image \u2014 at ${webpHeader.width}x${webpHeader.height}px it is over the ${rejectMaxWidth}x${rejectMaxHeight}px limit, and this session cannot shrink images. Resize it to fit within ${rejectMaxWidth}x${rejectMaxHeight}px and try again.`
          : `Unable to send image \u2014 it is ${formatFileSize(base64Size)} in base64, over the API's ${formatFileSize(o.maxBase64Size)} limit, and this session cannot shrink images. Make it smaller than ${Math.floor((o.targetRawSize / 1024 / 1024) * 10) / 10}MB and try again.`,
      );
    if (errorType === ERROR_TYPE_DECODE_FAILED) {
      let { reason, advice } = describeUndecodableImage(imageBuffer);
      let A = x
        ? `at ${webpHeader.width}x${webpHeader.height}px it is over the ${rejectMaxWidth}x${rejectMaxHeight}px limit`
        : `it is over the ${formatFileSize(o.maxBase64Size)} API limit (${formatFileSize(n)} raw, ${formatFileSize(base64Size)} base64)`;
      throw new ImageResizeError(
        `Unable to resize image \u2014 ${reason}, and ${A}, so it cannot be sent. ${advice}`,
      );
    }
    throw new ImageResizeError(
      x
        ? `Unable to resize image \u2014 dimensions exceed the ${rejectMaxWidth}x${rejectMaxHeight}px limit and image processing failed. Please resize the image to reduce its pixel dimensions.`
        : `Unable to resize image (${formatFileSize(n)} raw, ${formatFileSize(base64Size)} base64). The image exceeds the ${formatFileSize(o.maxBase64Size)} API limit and compression failed. Please resize the image manually or use a smaller image.`,
    );
  }
}
//@ chunk-mvvq2nx1.js:14013-14140 layout
async function timePngPalette(e, n) {
  let startTime = performance.now();
  try {
    return await e();
  } finally {
    if (n !== undefined) n.pngPaletteMs += performance.now() - startTime;
  }
}
//@ chunk-mvvq2nx1.js:14140-14483 layout
/**
 * 把图片压到字节上限以内：JPEG 质量递减并逐步缩小尺寸。
 */
async function compressToJpegUnderBytes(buffer, n, mediaType) {
  let imageDecoder = await loadImageDecoder();
  let u = (quality) =>
    imageDecoder(buffer)
      .jpeg({
        quality,
      })
      .toBuffer();
  let s = buffer;
  let i = 90;
  if (!/jpe?g/i.test(mediaType)) {
    let p = await u(90);
    if (p.length < s.length) s = p;
    if (p.length <= n) return p;
    i = 89;
  }
  let h = 1;
  let y;
  for (let j = 0; j < 5; j++) {
    let floored = Math.floor((h + i) / 2);
    let E = await u(floored);
    if (E.length < s.length) s = E;
    if (E.length <= n) {
      y = E;
      h = floored + 1;
    } else i = floored - 1;
    if (h > i) break;
  }
  return y ?? s;
}
//@ chunk-mvvq2nx1.js:14483-15548 fingerprint = maybeResizeAndDownsampleImageBlock (0.402)
/**
 * 处理 image block（base64 或 Buffer）：diskless 时只校验尺寸，否则调用缩放并返回新 block 或"无法处理"文本块。
 */
async function maybeResizeAndDownsampleImageBlock({
  data: e,
  mediaType,
  limits,
  timings,
  allowWebp = true,
  from,
}) {
  let i = Buffer.isBuffer(e) ? e : Buffer.from(e, "base64");
  if (isDiskless()) {
    let webpHeader = parseWebpHeader(i);
    let w = webpHeader ? Math.max(webpHeader.width, webpHeader.height) : 0;
    logEvent("tengu_image_input", {
      over_byte_budget: i.length > MODEL_COPY_IMAGE_BYTES,
      over_byte_limit: i.length > IMAGE_LIMITS.targetRawSize,
      over_many_images_side_limit: w > MAX_IMAGE_SIDE_PX,
      over_side_limit: w > MAX_PROVIDER_IMAGE_DIMENSION,
      from: fromEnumOpt(from),
    });
  }
  let ext = allowWebp && limits.allowWebp !== false;
  let h = mediaType?.includes("/") ? mediaType.split("/")[1] || "png" : mediaType || "png";
  let y;
  let startTime = performance.now();
  try {
    y = await maybeResizeAndDownsampleImageBuffer(i, i.length, h, limits, {
      timings,
      directWebpMaxBytes: ext ? webpMaxBytesIfOn(MODEL_COPY_IMAGE_BYTES) : undefined,
    });
  } catch (error) {
    if (error instanceof ImageResizeError) return degradedImageBlock(error.message, "resize_error");
    throw error;
  } finally {
    if (timings !== undefined) timings.resizeMs = performance.now() - startTime;
  }
  let buffer = y.buffer;
  if (buffer.length > MODEL_COPY_IMAGE_BYTES) {
    let startTime = performance.now();
    try {
      buffer = await compressToJpegUnderBytes(y.buffer, MODEL_COPY_IMAGE_BYTES, y.mediaType);
    } catch (error) {
      logForDebugging(
        `Image byte-budget compression failed, passing through unbudgeted: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
    if (timings !== undefined) timings.byteBudgetMs = performance.now() - startTime;
  }
  buffer = await chooseImageEncoding(i, y.buffer, buffer, MODEL_COPY_IMAGE_BYTES, ext, y.losslessWebp);
  return {
    block: {
      type: "image",
      source: {
        type: "base64",
        media_type: detectImageFormatFromBuffer(buffer),
        data: buffer.toString("base64"),
      },
    },
    dimensions: y.dimensions,
  };
}
//@ chunk-mvvq2nx1.js:18060-18079 placement
var weakSet = new WeakSet();
//@ chunk-mvvq2nx1.js:18303-18875 placement
async function checkImageBlockSource(e, limits) {
  if (!isPlainObject(e.source))
    return e.source == null
      ? degradedImageBlock("image block has no source object", "no_source")
      : degradedImageBlock("image block source must be an object", "malformed_source");
  if (e.source.type !== "base64")
    return {
      block: e,
    };
  let mediaType = e.source.media_type;
  if (mediaType != null && typeof mediaType !== "string")
    return degradedImageBlock("base64 image media_type must be a string", "malformed_source");
  let mediaType_2 = typeof mediaType === "string" ? mediaType : undefined;
  let u = e.source.data;
  let data;
  try {
    data = Buffer.isBuffer(u) ? u : Buffer.from(u, "base64");
  } catch (error) {
    return degradedImageBlock(errorMessage(error), "malformed_source");
  }
  return maybeResizeAndDownsampleImageBlock({
    data,
    mediaType: mediaType_2,
    limits,
    from: weakSet.has(e) ? "built_block" : "block",
  });
}
//@ chunk-mvvq2nx1.js:18875-19011 placement
function degradedImageBlock(e, n) {
  logEvent("tengu_image_resize_degraded", {
    reason: fromEnum(n),
  });
  return {
    block: {
      type: "text",
      text: `[Image could not be processed: ${e}]`,
    },
  };
}
//@ chunk-mvvq2nx1.js:19011-20078 fingerprint = compressImageBuffer (0.862)
/**
 * 把图片压缩到指定字节内（调色板 PNG、渐进缩小、JPEG、超压缩 JPEG 依次尝试）。
 */
async function compressImageBuffer(imageBuffer, maxBytes, originalMediaType) {
  let fallbackFormat = originalMediaType?.split("/")[1] || "jpeg";
  let normalizedFallback = fallbackFormat === "jpg" ? "jpeg" : fallbackFormat;
  try {
    let sharp = await loadImageDecoder();
    let metadata = await sharp(imageBuffer).metadata();
    let format = metadata.format || normalizedFallback;
    let originalSize = imageBuffer.length;
    let y = imageBuffer;
    if (!PASSTHROUGH_IMAGE_FORMATS.has(format === "jpg" ? "jpeg" : format)) {
      y = await sharp(imageBuffer).png().toBuffer();
      metadata = await sharp(y).metadata();
      format = "png";
    }
    let context = {
      imageBuffer: y,
      metadata,
      format,
      maxBytes,
      originalSize,
    };
    if (y.length <= maxBytes) return createCompressedImageResult(y, format, originalSize);
    let resizedResult = await tryProgressiveResizing(context, sharp);
    if (resizedResult) return resizedResult;
    if (format === "png") {
      let palettizedResult = await tryPalettePNG(context, sharp);
      if (palettizedResult) return palettizedResult;
    }
    let jpegResult = await tryJPEGConversion(context, 50, sharp);
    if (jpegResult) return jpegResult;
    return await createUltraCompressedJPEG(context, sharp);
  } catch (error) {
    let errorType = classifyImageErrorCode(error);
    let errorMsg = errorMessage(error);
    if (isUnknownImageErrorType(errorType)) logError(error);
    else
      logForDebugging(`Image compression failed: ${errorMsg}`, {
        level: "error",
      });
    logEvent("tengu_image_compress_failed", {
      original_size_bytes: imageBuffer.length,
      max_bytes: maxBytes,
      error_type: errorType,
      error_message_hash: hashString(errorMsg),
      ...getErrorTelemetryFields(error),
      ...getImageFormatTelemetryFields(imageBuffer),
    });
    if (imageBuffer.length <= maxBytes) {
      let detected = detectImageFormatFromBuffer(imageBuffer);
      return {
        base64: imageBuffer.toString("base64"),
        mediaType: detected,
        originalSize: imageBuffer.length,
      };
    }
    if (errorType === ERROR_TYPE_DECODE_FAILED) {
      let { reason, advice } = describeUndecodableImage(imageBuffer);
      throw new ImageResizeError(
        `Unable to compress image (${formatFileSize(imageBuffer.length)}) to fit within ${formatFileSize(maxBytes)} \u2014 ${reason}. ${advice}`,
      );
    }
    throw new ImageResizeError(
      `Unable to compress image (${formatFileSize(imageBuffer.length)}) to fit within ${formatFileSize(maxBytes)}. Please use a smaller image.`,
    );
  }
}
//@ chunk-mvvq2nx1.js:20078-20169 file-local
/**
 * 按 token 上限换算字节上限（token/0.125 为 base64 字符，再 ×0.75）后压缩。
 */
async function compressImageBufferWithTokenLimit(imageBuffer, maxTokens, originalMediaType) {
  let maxBase64Chars = Math.floor(maxTokens / 0.125);
  let maxBytes = Math.floor(maxBase64Chars * 0.75);
  return compressImageBuffer(imageBuffer, maxBytes, originalMediaType);
}
//@ chunk-mvvq2nx1.js:20169-20398 fingerprint = compressImageBlock (1)
/**
 * image block 超过字节上限时压缩。
 */
async function compressImageBlock(imageBlock, maxBytes) {
  if (imageBlock.source.type !== "base64") return imageBlock;
  let imageBuffer = Buffer.from(imageBlock.source.data, "base64");
  if (imageBuffer.length <= maxBytes) return imageBlock;
  let compressed = await compressImageBuffer(imageBuffer, maxBytes);
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: compressed.mediaType,
      data: compressed.base64,
    },
  };
}
//@ chunk-mvvq2nx1.js:20398-20515 fingerprint = createCompressedImageResult (1)
function createCompressedImageResult(buffer, mediaType, originalSize) {
  let normalizedMediaType = mediaType === "jpg" ? "jpeg" : mediaType;
  return {
    base64: buffer.toString("base64"),
    mediaType: `image/${normalizedMediaType}`,
    originalSize,
  };
}
//@ chunk-mvvq2nx1.js:20515-20848 fingerprint = tryProgressiveResizing (1)
async function tryProgressiveResizing(context, sharp) {
  let scalingFactors = [1, 0.75, 0.5, 0.25];
  for (let scalingFactor of scalingFactors) {
    let newWidth = Math.round((context.metadata.width || 2000) * scalingFactor);
    let newHeight = Math.round((context.metadata.height || 2000) * scalingFactor);
    let resizedImage = sharp(context.imageBuffer).resize(newWidth, newHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
    let format = toEncoderFormat(context.format);
    resizedImage = applyFormatOptimizations(resizedImage, format);
    let resizedBuffer = await resizedImage.toBuffer();
    if (resizedBuffer.length <= context.maxBytes)
      return createCompressedImageResult(resizedBuffer, format, context.originalSize);
  }
  return null;
}
//@ chunk-mvvq2nx1.js:20848-21010 fingerprint = applyFormatOptimizations (0.926)
function applyFormatOptimizations(image, format) {
  switch (format) {
    case "png":
      return image.png({
        compressionLevel: 9,
        palette: true,
      });
    case "jpeg":
      return image.jpeg({
        quality: 80,
      });
    case "webp":
      return image.webp({
        quality: 80,
      });
  }
}
//@ chunk-mvvq2nx1.js:21010-21242 fingerprint = tryPalettePNG (1)
async function tryPalettePNG(context, sharp) {
  let palettePng = await sharp(context.imageBuffer)
    .resize(800, 800, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({
      compressionLevel: 9,
      palette: true,
      colors: 64,
    })
    .toBuffer();
  if (palettePng.length <= context.maxBytes)
    return createCompressedImageResult(palettePng, "png", context.originalSize);
  return null;
}
//@ chunk-mvvq2nx1.js:21242-21448 fingerprint = tryJPEGConversion (1)
async function tryJPEGConversion(context, quality, sharp) {
  let jpegBuffer = await sharp(context.imageBuffer)
    .resize(600, 600, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality,
    })
    .toBuffer();
  if (jpegBuffer.length <= context.maxBytes)
    return createCompressedImageResult(jpegBuffer, "jpeg", context.originalSize);
  return null;
}
//@ chunk-mvvq2nx1.js:21448-21617 fingerprint = createUltraCompressedJPEG (1)
async function createUltraCompressedJPEG(context, sharp) {
  let ultraCompressedBuffer = await sharp(context.imageBuffer)
    .resize(400, 400, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 20,
    })
    .toBuffer();
  return createCompressedImageResult(ultraCompressedBuffer, "jpeg", context.originalSize);
}
//@ chunk-mvvq2nx1.js:21617-22018 fingerprint = createImageMetadataText (1)
/**
 * 缩放后生成说明原尺寸/显示尺寸与坐标换算的元信息文本（作为 meta 用户消息附加）。
 */
function createImageMetadataText(dims, sourcePath) {
  let { originalWidth, originalHeight, displayWidth, displayHeight } = dims;
  if (
    !originalWidth ||
    !originalHeight ||
    !displayWidth ||
    !displayHeight ||
    displayWidth <= 0 ||
    displayHeight <= 0
  ) {
    if (sourcePath) return `${IMAGE_SOURCE_MARKER_PREFIX}${sourcePath}]`;
    return null;
  }
  let wasResized = originalWidth !== displayWidth || originalHeight !== displayHeight;
  if (!wasResized && !sourcePath) return null;
  let parts = [];
  if (sourcePath) parts.push(`source: ${sourcePath}`);
  if (wasResized) {
    let scaleFactor = originalWidth / displayWidth;
    parts.push(
      `original ${originalWidth}x${originalHeight}, displayed at ${displayWidth}x${displayHeight}. Multiply coordinates by ${scaleFactor.toFixed(2)} to map to original image.`,
    );
  }
  return `${IMAGE_MARKER_PREFIX}${parts.join(", ")}]`;
}
//@ chunk-p8kytbnw.js:1486-1528 callgraph-witnessed = detectImageFormatFromBuffer (0.384)
/**
 * 按魔数识别图片 MIME，默认 image/png。
 */
function detectImageFormatFromBuffer(buffer) {
  return Ph(buffer) ?? "image/png";
}
//@ chunk-p8kytbnw.js:1528-1617 fingerprint = detectImageFormatFromBase64 (1)
/**
 * 从 base64 数据识别图片格式。
 */
function detectImageFormatFromBase64(base64Data) {
  try {
    let buffer = Buffer.from(base64Data, "base64");
    return detectImageFormatFromBuffer(buffer);
  } catch {
    return "image/png";
  }
}
//@ chunk-qz53w8v8.js:1699-1837 placement = CLAUDE_OPUS_4_6_CONFIG (0.48)
/**
 * 各提供商图片最大边 2000。
 */
var MIN_IMAGE_DIMENSION = 1568;
var MAX_IMAGE_DIMENSION_BY_PROVIDER = {
  firstParty: 2000,
  bedrock: 2000,
  vertex: 2000,
  foundry: 2000,
  anthropicAws: 2000,
  anthropicGoogleCloud: 2000,
  mantle: 2000,
  gateway: 2000,
};
export {
  compressImageBuffer,
  detectImageFormatFromBase64,
  maybeResizeAndDownsampleImageBlock,
  createImageMetadataText,
  weakSet,
  isImageDecodingDisabled,
  detectImageFormatFromBuffer,
  ImageResizeError,
  checkImageBlockSource,
  loadImageDecoder,
  isUnknownImageErrorType,
  classifyImageErrorCode,
  maybeResizeAndDownsampleImageBuffer,
  compressToJpegUnderBytes,
  compressImageBufferWithTokenLimit,
  encodePreviewJpeg,
  compressImageBlock,
  TENGU_PARSED_EAGLE,
  MAX_IMAGE_DIMENSION_BY_PROVIDER,
  MIN_IMAGE_DIMENSION,
};
