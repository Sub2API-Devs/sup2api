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
import { sniffImageMediaType } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
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
import { imageTileCount, MODEL_COPY_IMAGE_BYTES, IMAGE_LIMITS, MAX_IMAGE_SIDE_PX } from "./mediaLimits.js";
import { getErrnoCode, sanitizeClassName, sanitizeErrnoForTelemetry, errorMessage } from "./errors.js";
import { fromEnum, lit, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { tryWebpEncoding, webpMaxBytesIfOn, chooseImageEncoding } from "./imageWebp.js";
import { logEvent } from "../services/analytics/index.js";
import { logForDebugging } from "./debug.js";
import { toEncoderFormat } from "../tools/FileReadTool/FileReadTool.js";
import { logError } from "./log.js";
import { isFirstPartyApiBackend } from "./model/providers.js";
import { formatFileSize } from "./format.js";
import { isPlainObject } from "./isPlainObject.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-p8kytbnw.js:1486-1528 callgraph-witnessed (2.1.88 match: detectImageFormatFromBuffer, 0.384)
/**
 * 按魔数识别图片 MIME，默认 image/png。
 */
function detectImageFormatFromBuffer(buffer) {
  return sniffImageMediaType(buffer) ?? "image/png";
}
//@ chunk-p8kytbnw.js:1528-1617 fingerprint (2.1.88 match: detectImageFormatFromBase64, 1)
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
//@ chunk-mvvq2nx1.js:5350-5451 placement
/**
 * 官方行为，保留：imageDecodingOff 只初始化为 false、本 chunk 内从不赋 true（死开关），isImageDecodingDisabled 实际由 !isDisklessMode() 决定；不要把名字当成可配置项。
 */
var imageDecodingForcedOff; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ERR_IMAGE_DECODING_OFF;
var MAX_DECODE_PIXELS;
var ENCODE_CONCURRENCY;
var limitedToBuffer;
var imageDecoderState;
var weakMap;
deferInit("chunk-mvvq2nx1.js:5350", () => {
  imageDecodingForcedOff = false;
  ERR_IMAGE_DECODING_OFF = "ERR_IMAGE_DECODING_OFF";
  MAX_DECODE_PIXELS = MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION;
  ENCODE_CONCURRENCY = 4;
  limitedToBuffer = limitConcurrency(ENCODE_CONCURRENCY, (pipeline) => pipeline.toBuffer());
  imageDecoderState = 100;
  weakMap = new WeakMap();
});
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
function wrapImagePipeline(pipeline) {
  return {
    metadata: () => pipeline.metadata(),
    resize: (width, height, options) => wrapImagePipeline(pipeline.resize(width, height, options)),
    rotate: (angle) => wrapImagePipeline(pipeline.rotate(angle)),
    jpeg: (options) => wrapImagePipeline(pipeline.jpeg(options)),
    png: (options) => wrapImagePipeline(pipeline.png(options)),
    webp: (options) => wrapImagePipeline(pipeline.webp(options)),
    toBuffer: () => limitedToBuffer(pipeline),
  };
}
//@ chunk-mvvq2nx1.js:5771-5882 placement
/**
 * 所有变换都返回自身的管线（固定输出）。
 */
function staticImagePipeline(rejectCostlyDecode) {
  let pipeline = {
    metadata: rejectCostlyDecode,
    resize: () => pipeline,
    rotate: () => pipeline,
    jpeg: () => pipeline,
    png: () => pipeline,
    webp: () => pipeline,
    toBuffer: rejectCostlyDecode,
  };
  return pipeline;
}
//@ chunk-mvvq2nx1.js:5882-5914 placement
/**
 * 判断图片解码是否被禁用（显式关闭或无盘）。
 */
function isImageDecodingDisabled() {
  return imageDecodingForcedOff || !isDisklessMode();
}
//@ chunk-mvvq2nx1.js:5914-6388 placement
function loadImageDecoder_2(bytes) {
  let diskless = isDisklessMode();
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
  let bytes_2 = inspectWebpChunks(bytes) ?? bytes;
  if (!diskless) return new Bun.Image(bytes_2);
  let preparedBytes = weakMap.get(bytes_2);
  if (preparedBytes === undefined) {
    preparedBytes =
      countJpegScans(bytes_2, imageDecoderState) > imageDecoderState ? null : stripPngMetadata(bytes_2);
    weakMap.set(bytes_2, preparedBytes);
  }
  return preparedBytes === null
    ? staticImagePipeline(rejectCostlyDecode)
    : wrapImagePipeline(
        new Bun.Image(preparedBytes, {
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
function fitWithinTileBudget(width, height, maxSide = MAX_TILE_SIDE, maxTiles = MAX_TILE_HEIGHT) {
  if (width <= maxSide && height <= maxSide && imageTileCount(width, height) <= maxTiles)
    return [width, height];
  if (height > width) {
    let [swappedWidth, swappedHeight] = fitWithinTileBudget(height, width, maxSide, maxTiles);
    return [swappedHeight, swappedWidth];
  }
  let aspectRatio = width / height;
  let low = 1;
  let high = width;
  while (low + 1 < high) {
    let mid = (low + high) >> 1;
    let max = Math.max(Math.round(mid / aspectRatio), 1);
    if (mid <= maxSide && imageTileCount(mid, max) <= maxTiles) low = mid;
    else high = mid;
  }
  return [low, Math.max(Math.round(low / aspectRatio), 1)];
}
//@ chunk-mvvq2nx1.js:6759-6963 placement
/**
 * 按最大宽高与 token 上限计算缩放后的尺寸。
 */
function fitImageDimensions(width, height, limits) {
  if (width > limits.maxWidth) {
    height = Math.round((height * limits.maxWidth) / width);
    width = limits.maxWidth;
  }
  if (height > limits.maxHeight) {
    width = Math.round((width * limits.maxHeight) / height);
    height = limits.maxHeight;
  }
  return limits.maxImageTokens === undefined
    ? [width, height]
    : fitWithinTileBudget(width, height, 1 / 0, limits.maxImageTokens);
}
//@ chunk-mvvq2nx1.js:6963-7285 placement
/**
 * 把截图缩放并逐步降低质量编码为 JPEG，直到大小在上限内。
 */
async function encodePreviewJpeg(buffer) {
  let imageDecoder = await loadImageDecoder();
  let buffer_2 = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let metadata = await imageDecoder(buffer_2).metadata();
  let [targetWidth, targetHeight] = fitWithinTileBudget(metadata.width, metadata.height);
  let needsResize = targetWidth !== metadata.width || targetHeight !== metadata.height;
  let quality = MIN_SCALED_SIDE + SCALE_STEP;
  let jpegBuffer;
  do {
    quality -= SCALE_STEP;
    let pipeline = imageDecoder(buffer_2);
    if (needsResize)
      pipeline = pipeline.resize(targetWidth, targetHeight, {
        fit: "fill",
      });
    jpegBuffer = await pipeline
      .jpeg({
        quality,
      })
      .toBuffer();
  } while (jpegBuffer.length * 4 > MAX_TILE_PIXELS * 3 && quality > MIN_SEARCH_SIDE);
  return {
    jpeg: jpegBuffer,
    w: targetWidth,
    h: targetHeight,
  };
}
//@ chunk-mvvq2nx1.js:7285-7393 affinity (2.1.88 match: IMAGE_EXTENSIONS, 0.776)
/**
 * 图片处理错误类型编号（2 未知格式、3 未知、4 像素超限、5 内存、8 权限、9 格式不支持、10 解码失败、11 解码关闭）与 tengu_parsed_eagle 开关名、直通格式集合。
 */
var ERROR_TYPE_UNKNOWN_FORMAT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ERROR_TYPE_UNKNOWN;
var ERROR_TYPE_PIXEL_LIMIT;
var ERROR_TYPE_MEMORY;
var ERROR_TYPE_PERMISSION;
var ERROR_TYPE_FORMAT_UNSUPPORTED;
var ERROR_TYPE_DECODE_FAILED;
var ERROR_TYPE_DECODING_OFF;
var TENGU_PARSED_EAGLE;
var PASSTHROUGH_IMAGE_FORMATS;
deferInit("chunk-mvvq2nx1.js:7285", () => {
  ERROR_TYPE_UNKNOWN_FORMAT = 2;
  ERROR_TYPE_UNKNOWN = 3;
  ERROR_TYPE_PIXEL_LIMIT = 4;
  ERROR_TYPE_MEMORY = 5;
  ERROR_TYPE_PERMISSION = 8;
  ERROR_TYPE_FORMAT_UNSUPPORTED = 9;
  ERROR_TYPE_DECODE_FAILED = 10;
  ERROR_TYPE_DECODING_OFF = 11;
  TENGU_PARSED_EAGLE = "tengu_parsed_eagle";
  PASSTHROUGH_IMAGE_FORMATS = new Set(["png", "jpeg", "gif", "webp"]);
});
//@ chunk-mvvq2nx1.js:7497-7574 fingerprint (2.1.88 match: ImageResizeError, 1)
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
function describeUndecodableImage(buffer) {
  if (jpegSofComponentCount(buffer) === 4)
    return {
      reason: "it is a CMYK JPEG, which Claude Code cannot decode",
      advice: "Re-save it as an RGB PNG or JPEG and try again.",
    };
  if (isAnimatedWebp(buffer))
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
function isUnknownImageErrorType(errorType) {
  return errorType === ERROR_TYPE_UNKNOWN;
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
function getImageFormatTelemetryFields(buffer) {
  let mediaType = sniffImageMediaType(buffer);
  return {
    ...(mediaType === "image/jpeg" && {
      jpeg_components: jpegSofComponentCount(buffer),
    }),
    ...(mediaType === "image/webp" && {
      webp_animated: isAnimatedWebp(buffer),
    }),
  };
}
//@ chunk-mvvq2nx1.js:8690-8785 callgraph-witnessed (2.1.88 match: hashString, 1)
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  return hash >>> 0;
}
//@ chunk-mvvq2nx1.js:8785-8898 layout
function getRejectDimensions(limits) {
  return {
    rejectMaxWidth: limits.rejectMaxWidth ?? limits.maxWidth,
    rejectMaxHeight: limits.rejectMaxHeight ?? limits.maxHeight,
  };
}
//@ chunk-mvvq2nx1.js:8898-8909 layout
var MAX_PROVIDER_IMAGE_DIMENSION = 8000;
//@ chunk-mvvq2nx1.js:8909-14013 fingerprint (2.1.88 match: maybeResizeAndDownsampleImageBuffer, 0.548)
/**
 * 按模型图片限制缩放/重编码：非直通格式转 PNG 或 WebP；尺寸不明时校验上限；仅超字节时先试 PNG 调色板再试 JPEG 80/60/40/20；需缩放时按 token 上限算目标尺寸后 resize。
 */
async function maybeResizeAndDownsampleImageBuffer(
  buffer,
  originalSize,
  ext,
  limits,
  { timings, directWebpMaxBytes } = {},
) {
  if (buffer.length === 0) throw new ImageResizeError("Image file is empty (0 bytes)");
  try {
    let sharp = await loadImageDecoder();
    let metadata = await sharp(buffer).metadata();
    let mediaType = metadata.format ?? ext;
    let format = mediaType === "jpg" ? "jpeg" : mediaType;
    let currentBuffer = buffer;
    let currentSize = originalSize;
    if (!PASSTHROUGH_IMAGE_FORMATS.has(format)) {
      let { width, height } = metadata;
      let fitted =
        width === undefined || height === undefined ? undefined : fitImageDimensions(width, height, limits);
      let webp =
        fitted !== undefined && fitted[0] === width && fitted[1] === height
          ? (await tryWebpEncoding(() => sharp(buffer), directWebpMaxBytes)).webp
          : undefined;
      currentBuffer = webp ?? (await sharp(buffer).png().toBuffer());
      currentSize = currentBuffer.length;
      metadata = await sharp(currentBuffer).metadata();
      format = webp ? "webp" : "png";
    }
    if (!metadata.width || !metadata.height) {
      let webpHeader = parseWebpHeader(currentBuffer);
      let { rejectMaxWidth, rejectMaxHeight } = getRejectDimensions(limits);
      if (
        webpHeader === undefined ||
        webpHeader.width > rejectMaxWidth ||
        webpHeader.height > rejectMaxHeight
      )
        throw new ImageResizeError(
          `Unable to resize image \u2014 could not verify image dimensions are within the ${rejectMaxWidth}x${rejectMaxHeight}px API limit.`,
        );
      if (currentSize > limits.targetRawSize) {
        logEvent("tengu_image_resize", {
          over_byte_limit: true,
          over_dimension_limit: false,
          resized_for_tokens: false,
          original_size_bytes: currentSize,
        });
        return {
          buffer: await sharp(currentBuffer)
            .jpeg({
              quality: 80,
            })
            .toBuffer(),
          mediaType: "jpeg",
        };
      }
      return {
        buffer: currentBuffer,
        mediaType: format,
      };
    }
    let originalWidth = metadata.width;
    let originalHeight = metadata.height;
    let [targetWidth, targetHeight] = fitImageDimensions(originalWidth, originalHeight, limits);
    let needsResize = targetWidth !== originalWidth || targetHeight !== originalHeight;
    if (currentSize <= limits.targetRawSize && !needsResize)
      return {
        buffer: currentBuffer,
        mediaType: format,
        dimensions: {
          originalWidth,
          originalHeight,
          displayWidth: targetWidth,
          displayHeight: targetHeight,
        },
      };
    let isPng = format === "png";
    logEvent("tengu_image_resize", {
      over_byte_limit: currentSize > limits.targetRawSize,
      over_dimension_limit: originalWidth > limits.maxWidth || originalHeight > limits.maxHeight,
      resized_for_tokens: needsResize && targetWidth < limits.maxWidth && targetHeight < limits.maxHeight,
      original_size_bytes: currentSize,
      original_width: originalWidth,
      original_height: originalHeight,
      target_width: targetWidth,
      target_height: targetHeight,
      max_width: limits.maxWidth,
      max_height: limits.maxHeight,
      max_image_tokens: limits.maxImageTokens,
    });
    if (!needsResize && currentSize > limits.targetRawSize) {
      if (isPng) {
        let pngCompressed = await timePngPalette(
          () =>
            sharp(currentBuffer)
              .png({
                compressionLevel: 9,
                palette: true,
              })
              .toBuffer(),
          timings,
        );
        if (pngCompressed.length <= limits.targetRawSize)
          return {
            buffer: pngCompressed,
            mediaType: "png",
            dimensions: {
              originalWidth,
              originalHeight,
              displayWidth: targetWidth,
              displayHeight: targetHeight,
            },
          };
      }
      for (let quality of [80, 60, 40, 20]) {
        let compressedBuffer = await sharp(currentBuffer)
          .jpeg({
            quality,
          })
          .toBuffer();
        if (compressedBuffer.length <= limits.targetRawSize)
          return {
            buffer: compressedBuffer,
            mediaType: "jpeg",
            dimensions: {
              originalWidth,
              originalHeight,
              displayWidth: targetWidth,
              displayHeight: targetHeight,
            },
          };
      }
    }
    logForDebugging(`Resizing to ${targetWidth}x${targetHeight}`);
    let encoderFormat =
      needsResize &&
      directWebpMaxBytes !== undefined &&
      originalWidth <= getRejectDimensions(limits).rejectMaxWidth &&
      originalHeight <= getRejectDimensions(limits).rejectMaxHeight &&
      isLosslessWebp(currentBuffer)
        ? "png"
        : toEncoderFormat(format);
    let pipeline = sharp(currentBuffer).resize(targetWidth, targetHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
    if (encoderFormat !== format) pipeline = pipeline.png();
    let webpAttempt =
      encoderFormat === "png"
        ? await tryWebpEncoding(
            () =>
              sharp(currentBuffer).resize(targetWidth, targetHeight, {
                fit: "inside",
                withoutEnlargement: true,
              }),
            directWebpMaxBytes,
          )
        : {};
    let encodedBuffer = webpAttempt.webp ?? (await pipeline.toBuffer());
    if (encodedBuffer.length > limits.targetRawSize) {
      if (isPng) {
        let pngCompressed = await timePngPalette(
          () =>
            sharp(currentBuffer)
              .resize(targetWidth, targetHeight, {
                fit: "inside",
                withoutEnlargement: true,
              })
              .png({
                compressionLevel: 9,
                palette: true,
              })
              .toBuffer(),
          timings,
        );
        if (pngCompressed.length <= limits.targetRawSize)
          return {
            buffer: pngCompressed,
            mediaType: "png",
            dimensions: {
              originalWidth,
              originalHeight,
              displayWidth: targetWidth,
              displayHeight: targetHeight,
            },
          };
      }
      for (let quality of [80, 60, 40, 20]) {
        let compressedBuffer = await sharp(currentBuffer)
          .resize(targetWidth, targetHeight, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality,
          })
          .toBuffer();
        if (compressedBuffer.length <= limits.targetRawSize)
          return {
            buffer: compressedBuffer,
            mediaType: "jpeg",
            dimensions: {
              originalWidth,
              originalHeight,
              displayWidth: targetWidth,
              displayHeight: targetHeight,
            },
          };
      }
      let smallerWidth = Math.min(targetWidth, 1000);
      let smallerHeight = Math.round((targetHeight * smallerWidth) / Math.max(targetWidth, 1));
      logForDebugging("Still too large, compressing with JPEG");
      let compressedBuffer = await sharp(currentBuffer)
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
      buffer: encodedBuffer,
      mediaType: webpAttempt.webp ? "webp" : encoderFormat,
      dimensions: {
        originalWidth,
        originalHeight,
        displayWidth: targetWidth,
        displayHeight: targetHeight,
      },
      losslessWebp: webpAttempt.lossless,
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
      original_size_bytes: originalSize,
      error_type: errorType,
      error_message_hash: hashString(errorMsg),
      ...getErrorTelemetryFields(error),
      ...getImageFormatTelemetryFields(buffer),
    });
    let normalizedExt = detectImageFormatFromBuffer(buffer).slice(6);
    let base64Size = Math.ceil((originalSize * 4) / 3);
    let webpHeader = parseWebpHeader(buffer);
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
        : getRejectDimensions(limits);
    let overDimensions = webpHeader.width > rejectMaxWidth || webpHeader.height > rejectMaxHeight;
    if (base64Size <= limits.maxBase64Size && !overDimensions) {
      logEvent("tengu_image_resize_fallback", {
        original_size_bytes: originalSize,
        base64_size_bytes: base64Size,
        error_type: errorType,
      });
      return {
        buffer,
        mediaType: normalizedExt,
      };
    }
    if (errorType === ERROR_TYPE_DECODING_OFF)
      throw new ImageResizeError(
        overDimensions
          ? `Unable to send image \u2014 at ${webpHeader.width}x${webpHeader.height}px it is over the ${rejectMaxWidth}x${rejectMaxHeight}px limit, and this session cannot shrink images. Resize it to fit within ${rejectMaxWidth}x${rejectMaxHeight}px and try again.`
          : `Unable to send image \u2014 it is ${formatFileSize(base64Size)} in base64, over the API's ${formatFileSize(limits.maxBase64Size)} limit, and this session cannot shrink images. Make it smaller than ${Math.floor((limits.targetRawSize / 1024 / 1024) * 10) / 10}MB and try again.`,
      );
    if (errorType === ERROR_TYPE_DECODE_FAILED) {
      let { reason, advice } = describeUndecodableImage(buffer);
      let overReason = overDimensions
        ? `at ${webpHeader.width}x${webpHeader.height}px it is over the ${rejectMaxWidth}x${rejectMaxHeight}px limit`
        : `it is over the ${formatFileSize(limits.maxBase64Size)} API limit (${formatFileSize(originalSize)} raw, ${formatFileSize(base64Size)} base64)`;
      throw new ImageResizeError(
        `Unable to resize image \u2014 ${reason}, and ${overReason}, so it cannot be sent. ${advice}`,
      );
    }
    throw new ImageResizeError(
      overDimensions
        ? `Unable to resize image \u2014 dimensions exceed the ${rejectMaxWidth}x${rejectMaxHeight}px limit and image processing failed. Please resize the image to reduce its pixel dimensions.`
        : `Unable to resize image (${formatFileSize(originalSize)} raw, ${formatFileSize(base64Size)} base64). The image exceeds the ${formatFileSize(limits.maxBase64Size)} API limit and compression failed. Please resize the image manually or use a smaller image.`,
    );
  }
}
//@ chunk-mvvq2nx1.js:14013-14140 layout
async function timePngPalette(run, timings) {
  let startTime = performance.now();
  try {
    return await run();
  } finally {
    if (timings !== undefined) timings.pngPaletteMs += performance.now() - startTime;
  }
}
//@ chunk-mvvq2nx1.js:14140-14483 layout
/**
 * 把图片压到字节上限以内：JPEG 质量递减并逐步缩小尺寸。
 */
async function compressToJpegUnderBytes(buffer, maxBytes, mediaType) {
  let imageDecoder = await loadImageDecoder();
  let encodeAtQuality = (quality) =>
    imageDecoder(buffer)
      .jpeg({
        quality,
      })
      .toBuffer();
  let best = buffer;
  let high = 90;
  if (!/jpe?g/i.test(mediaType)) {
    let firstTry = await encodeAtQuality(90);
    if (firstTry.length < best.length) best = firstTry;
    if (firstTry.length <= maxBytes) return firstTry;
    high = 89;
  }
  let low = 1;
  let accepted;
  for (let j = 0; j < 5; j++) {
    let floored = Math.floor((low + high) / 2);
    let candidate = await encodeAtQuality(floored);
    if (candidate.length < best.length) best = candidate;
    if (candidate.length <= maxBytes) {
      accepted = candidate;
      low = floored + 1;
    } else high = floored - 1;
    if (low > high) break;
  }
  return accepted ?? best;
}
//@ chunk-mvvq2nx1.js:14483-15548 fingerprint (2.1.88 match: maybeResizeAndDownsampleImageBlock, 0.402)
/**
 * 处理 image block（base64 或 Buffer）：diskless 时只校验尺寸，否则调用缩放并返回新 block 或"无法处理"文本块。
 */
async function maybeResizeAndDownsampleImageBlock({
  data,
  mediaType,
  limits,
  timings,
  allowWebp = true,
  from,
}) {
  let buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "base64");
  if (isDiskless()) {
    let webpHeader = parseWebpHeader(buffer);
    let maxSide = webpHeader ? Math.max(webpHeader.width, webpHeader.height) : 0;
    logEvent("tengu_image_input", {
      over_byte_budget: buffer.length > MODEL_COPY_IMAGE_BYTES,
      over_byte_limit: buffer.length > IMAGE_LIMITS.targetRawSize,
      over_many_images_side_limit: maxSide > MAX_IMAGE_SIDE_PX,
      over_side_limit: maxSide > MAX_PROVIDER_IMAGE_DIMENSION,
      from: fromEnumOpt(from),
    });
  }
  let ext = allowWebp && limits.allowWebp !== false;
  let extension = mediaType?.includes("/") ? mediaType.split("/")[1] || "png" : mediaType || "png";
  let resized;
  let startTime = performance.now();
  try {
    resized = await maybeResizeAndDownsampleImageBuffer(buffer, buffer.length, extension, limits, {
      timings,
      directWebpMaxBytes: ext ? webpMaxBytesIfOn(MODEL_COPY_IMAGE_BYTES) : undefined,
    });
  } catch (error) {
    if (error instanceof ImageResizeError) return degradedImageBlock(error.message, "resize_error");
    throw error;
  } finally {
    if (timings !== undefined) timings.resizeMs = performance.now() - startTime;
  }
  let buffer_2 = resized.buffer;
  if (buffer_2.length > MODEL_COPY_IMAGE_BYTES) {
    let startTime = performance.now();
    try {
      buffer_2 = await compressToJpegUnderBytes(resized.buffer, MODEL_COPY_IMAGE_BYTES, resized.mediaType);
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
  buffer_2 = await chooseImageEncoding(
    buffer,
    resized.buffer,
    buffer_2,
    MODEL_COPY_IMAGE_BYTES,
    ext,
    resized.losslessWebp,
  );
  return {
    block: {
      type: "image",
      source: {
        type: "base64",
        media_type: detectImageFormatFromBuffer(buffer_2),
        data: buffer_2.toString("base64"),
      },
    },
    dimensions: resized.dimensions,
  };
}
//@ chunk-mvvq2nx1.js:18060-18079 placement
var weakSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mvvq2nx1.js:18060", () => {
  weakSet = new WeakSet();
});
//@ chunk-mvvq2nx1.js:18303-18875 placement
async function checkImageBlockSource(block, limits) {
  if (!isPlainObject(block.source))
    return block.source == null
      ? degradedImageBlock("image block has no source object", "no_source")
      : degradedImageBlock("image block source must be an object", "malformed_source");
  if (block.source.type !== "base64")
    return {
      block,
    };
  let mediaType = block.source.media_type;
  if (mediaType != null && typeof mediaType !== "string")
    return degradedImageBlock("base64 image media_type must be a string", "malformed_source");
  let mediaType_2 = typeof mediaType === "string" ? mediaType : undefined;
  let rawData = block.source.data;
  let data;
  try {
    data = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData, "base64");
  } catch (error) {
    return degradedImageBlock(errorMessage(error), "malformed_source");
  }
  return maybeResizeAndDownsampleImageBlock({
    data,
    mediaType: mediaType_2,
    limits,
    from: weakSet.has(block) ? "built_block" : "block",
  });
}
//@ chunk-mvvq2nx1.js:18875-19011 placement
function degradedImageBlock(reason, cause) {
  logEvent("tengu_image_resize_degraded", {
    reason: fromEnum(cause),
  });
  return {
    block: {
      type: "text",
      text: `[Image could not be processed: ${reason}]`,
    },
  };
}
//@ chunk-mvvq2nx1.js:19011-20078 fingerprint (2.1.88 match: compressImageBuffer, 0.862)
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
    let currentBuffer = imageBuffer;
    if (!PASSTHROUGH_IMAGE_FORMATS.has(format === "jpg" ? "jpeg" : format)) {
      currentBuffer = await sharp(imageBuffer).png().toBuffer();
      metadata = await sharp(currentBuffer).metadata();
      format = "png";
    }
    let context = {
      imageBuffer: currentBuffer,
      metadata,
      format,
      maxBytes,
      originalSize,
    };
    if (currentBuffer.length <= maxBytes)
      return createCompressedImageResult(currentBuffer, format, originalSize);
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
//@ chunk-mvvq2nx1.js:20169-20398 fingerprint (2.1.88 match: compressImageBlock, 1)
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
//@ chunk-mvvq2nx1.js:20398-20515 fingerprint (2.1.88 match: createCompressedImageResult, 1)
function createCompressedImageResult(buffer, mediaType, originalSize) {
  let normalizedMediaType = mediaType === "jpg" ? "jpeg" : mediaType;
  return {
    base64: buffer.toString("base64"),
    mediaType: `image/${normalizedMediaType}`,
    originalSize,
  };
}
//@ chunk-mvvq2nx1.js:20515-20848 fingerprint (2.1.88 match: tryProgressiveResizing, 1)
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
//@ chunk-mvvq2nx1.js:20848-21010 fingerprint (2.1.88 match: applyFormatOptimizations, 0.926)
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
//@ chunk-mvvq2nx1.js:21010-21242 fingerprint (2.1.88 match: tryPalettePNG, 1)
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
//@ chunk-mvvq2nx1.js:21242-21448 fingerprint (2.1.88 match: tryJPEGConversion, 1)
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
//@ chunk-mvvq2nx1.js:21448-21617 fingerprint (2.1.88 match: createUltraCompressedJPEG, 1)
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
//@ chunk-mvvq2nx1.js:21617-22018 fingerprint (2.1.88 match: createImageMetadataText, 1)
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
//@ chunk-qz53w8v8.js:1699-1837 placement (2.1.88 match: CLAUDE_OPUS_4_6_CONFIG, 0.48)
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
