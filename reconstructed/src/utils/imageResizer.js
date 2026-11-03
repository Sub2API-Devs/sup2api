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
import { gJ, c4t, v8r } from "./imageErrors.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import {
  inspectWebpChunks,
  countJpegScans,
  stripPngMetadata,
  Z9o,
  isAnimatedWebp,
  parseWebpHeader,
  isLosslessWebp,
} from "./imageFormats.js";
import { isDiskless, isDisklessProcess } from "../bootstrap/state.js";
import { imageTileCount, vY, IMAGE_LIMITS, aQt } from "./truncateGraphemes.js";
import { getErrnoCode, sanitizeClassName, sanitizeErrnoForTelemetry, errorMessage } from "./errors.js";
import { fromEnum, lit, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { Ph } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { tryWebpEncoding, fEn, chooseImageEncoding } from "./imageWebp.js";
import { logEvent } from "../services/analytics/index.js";
import { logForDebugging } from "./debug.js";
import { toEncoderFormat } from "../tools/FileReadTool/FileReadTool.js";
import { logError } from "./log.js";
import { isFirstPartyApiBackend } from "./model/providers.js";
import { formatFileSize } from "./format.js";
import { isPlainObject } from "./isPlainObject.js";

/**
 * 图片解码状态与常量（最大像素、编码并发、限流 toBuffer、弱映射缓存）。
 */
//@ chunk-mvvq2nx1.js:5350-5451 placement
var imageDecodingOff = !1,
  ERR_IMAGE_DECODING_OFF = "ERR_IMAGE_DECODING_OFF",
  MAX_DECODE_PIXELS = gJ * gJ,
  ENCODE_CONCURRENCY = 4,
  limitedToBuffer = limitConcurrency(ENCODE_CONCURRENCY, (e) => e.toBuffer()),
  se = 100,
  weakMap = new WeakMap();
/**
 * 返回“图片解码代价过高”的拒绝。
 */
//@ chunk-mvvq2nx1.js:5451-5575 placement
function rejectCostlyDecode() {
  return Promise.reject(
    Object.assign(Error("Image is too costly to decode"), { code: "ERR_IMAGE_DECODE_FAILED" }),
  );
}
/**
 * 包装图片处理管线，使 toBuffer 经过并发限制。
 */
//@ chunk-mvvq2nx1.js:5575-5771 placement
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
/**
 * 所有变换都返回自身的管线（固定输出）。
 */
//@ chunk-mvvq2nx1.js:5771-5882 placement
function staticImagePipeline(e) {
  let n = {
    metadata: e,
    resize: () => n,
    rotate: () => n,
    jpeg: () => n,
    png: () => n,
    webp: () => n,
    toBuffer: e,
  };
  return n;
}
//@ chunk-mvvq2nx1.js:5882-5914 placement
function T8r() {
  return imageDecodingOff || !ue();
}
//@ chunk-mvvq2nx1.js:5914-6388 placement
function loadImageDecoder(e) {
  let n = ue();
  if (!T8r())
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
        Object.assign(Error("This runtime has no Bun.Image"), { code: "ERR_IMAGE_UNAVAILABLE" }),
      ),
    );
  let r = inspectWebpChunks(e) ?? e;
  if (!n) return new Bun.Image(r);
  let o = weakMap.get(r);
  if (o === void 0) ((o = countJpegScans(r, se) > se ? null : stripPngMetadata(r)), weakMap.set(r, o));
  return o === null
    ? staticImagePipeline(rejectCostlyDecode)
    : wrapImagePipeline(new Bun.Image(o, { maxPixels: MAX_DECODE_PIXELS }));
}
//@ chunk-mvvq2nx1.js:6388-6429 placement
function s4() {
  return Promise.resolve(loadImageDecoder);
}
//@ chunk-mvvq2nx1.js:6429-6460 placement
function ue() {
  return isDiskless() || isDisklessProcess();
}
//@ chunk-mvvq2nx1.js:6460-6508 placement
var De = 1568,
  ke = 1568,
  ve = 85,
  le = 5,
  $e = 10,
  Ne = 1398100;
/**
 * 按最大边与 tile 数上限缩小尺寸（保持比例，二分搜索）。
 */
//@ chunk-mvvq2nx1.js:6508-6759 placement
function fitWithinTileBudget(e, n, r = De, o = ke) {
  if (e <= r && n <= r && imageTileCount(e, n) <= o) return [e, n];
  if (n > e) {
    let [m, h] = fitWithinTileBudget(n, e, r, o);
    return [h, m];
  }
  let u = e / n,
    s = 1,
    i = e;
  while (s + 1 < i) {
    let m = (s + i) >> 1,
      max = Math.max(Math.round(m / u), 1);
    if (m <= r && imageTileCount(m, max) <= o) s = m;
    else i = m;
  }
  return [s, Math.max(Math.round(s / u), 1)];
}
/**
 * 按最大宽高与 token 上限计算缩放后的尺寸。
 */
//@ chunk-mvvq2nx1.js:6759-6963 placement
function fitImageDimensions(e, n, r) {
  if (e > r.maxWidth) ((n = Math.round((n * r.maxWidth) / e)), (e = r.maxWidth));
  if (n > r.maxHeight) ((e = Math.round((e * r.maxHeight) / n)), (n = r.maxHeight));
  return r.maxImageTokens === void 0 ? [e, n] : fitWithinTileBudget(e, n, 1 / 0, r.maxImageTokens);
}
/**
 * 把截图缩放并逐步降低质量编码为 JPEG，直到大小在上限内。
 */
//@ chunk-mvvq2nx1.js:6963-7285 placement
async function encodePreviewJpeg(e) {
  let n = await s4(),
    buffer = Buffer.from(e.buffer, e.byteOffset, e.byteLength),
    metadata = await n(buffer).metadata(),
    [u, s] = fitWithinTileBudget(metadata.width, metadata.height),
    i = u !== metadata.width || s !== metadata.height,
    m = ve + le,
    h;
  do {
    m -= le;
    let y = n(buffer);
    if (i) y = y.resize(u, s, { fit: "fill" });
    h = await y.jpeg({ quality: m }).toBuffer();
  } while (h.length * 4 > Ne * 3 && m > $e);
  return { jpeg: h, w: u, h: s };
}
/**
 * 图片处理错误类型编号（2 未知格式、3 未知、4 像素超限、5 内存、8 权限、9 格式不支持、10 解码失败、11 解码关闭）与 tengu_parsed_eagle 开关名、直通格式集合。
 */
//@ chunk-mvvq2nx1.js:7285-7393 affinity = IMAGE_EXTENSIONS (0.776)
var ERROR_TYPE_UNKNOWN_FORMAT = 2,
  ERROR_TYPE_UNKNOWN = 3,
  ERROR_TYPE_PIXEL_LIMIT = 4,
  ERROR_TYPE_MEMORY = 5,
  ERROR_TYPE_PERMISSION = 8,
  ERROR_TYPE_FORMAT_UNSUPPORTED = 9,
  ERROR_TYPE_DECODE_FAILED = 10,
  ERROR_TYPE_DECODING_OFF = 11,
  TENGU_PARSED_EAGLE = "tengu_parsed_eagle",
  PASSTHROUGH_IMAGE_FORMATS = new Set(["png", "jpeg", "gif", "webp"]);
/**
 * 图片缩放/处理失败的错误类型。
 */
//@ chunk-mvvq2nx1.js:7497-7574 fingerprint = ImageResizeError (1)
class ImageResizeError extends Error {
  constructor(e) {
    super(e);
    this.name = "ImageResizeError";
  }
}
//@ chunk-mvvq2nx1.js:7574-8055 layout
function describeUndecodableImage(e) {
  if (Z9o(e) === 4)
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
/**
 * 把图片错误码映射为 ERROR_TYPE_* 编号。
 */
//@ chunk-mvvq2nx1.js:8055-8344 layout
function classifyImageErrorCode(e) {
  switch (getErrnoCode(e)) {
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
/**
 * 是否为未知类型的图片错误。
 */
//@ chunk-mvvq2nx1.js:8344-8374 layout
function isUnknownImageErrorType(e) {
  return e === ERROR_TYPE_UNKNOWN;
}
//@ chunk-mvvq2nx1.js:8374-8565 layout
function getErrorTelemetryFields(e) {
  if (!(e instanceof Error)) return { error_name: fromEnum(typeof e), error_code: lit("") };
  return {
    error_name: sanitizeClassName(e.name !== "Error" ? e.name : e.constructor?.name) ?? lit("Error"),
    error_code: sanitizeErrnoForTelemetry(e) ?? lit(""),
  };
}
//@ chunk-mvvq2nx1.js:8565-8690 layout
function getImageFormatTelemetryFields(e) {
  let n = Ph(e);
  return {
    ...(n === "image/jpeg" && { jpeg_components: Z9o(e) }),
    ...(n === "image/webp" && { webp_animated: isAnimatedWebp(e) }),
  };
}
//@ chunk-mvvq2nx1.js:8690-8785 callgraph-witnessed = hashString (1)
function hashString(str) {
  let hash = 5381;
  for (let r = 0; r < str.length; r++) hash = ((hash << 5) + hash + str.charCodeAt(r)) | 0;
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
var K = 8000;
/**
 * 按模型图片限制缩放/重编码：非直通格式转 PNG 或 WebP；尺寸不明时校验上限；仅超字节时先试 PNG 调色板再试 JPEG 80/60/40/20；需缩放时按 token 上限算目标尺寸后 resize。
 */
//@ chunk-mvvq2nx1.js:8909-14013 fingerprint = maybeResizeAndDownsampleImageBuffer (0.548)
async function maybeResizeAndDownsampleImageBuffer(e, n, r, o, { timings: u, directWebpMaxBytes: s } = {}) {
  if (e.length === 0) throw new ImageResizeError("Image file is empty (0 bytes)");
  try {
    let sharp = await s4(),
      metadata = await sharp(e).metadata(),
      h = metadata.format ?? r,
      y = h === "jpg" ? "jpeg" : h,
      p = e,
      I = n;
    if (!PASSTHROUGH_IMAGE_FORMATS.has(y)) {
      let { width: width, height: height } = metadata,
        T = width === void 0 || height === void 0 ? void 0 : fitImageDimensions(width, height, o),
        B =
          T !== void 0 && T[0] === width && T[1] === height
            ? (await tryWebpEncoding(() => sharp(e), s)).webp
            : void 0;
      ((p = B ?? (await sharp(e).png().toBuffer())),
        (I = p.length),
        (metadata = await sharp(p).metadata()),
        (y = B ? "webp" : "png"));
    }
    if (!metadata.width || !metadata.height) {
      let S = parseWebpHeader(p),
        { rejectMaxWidth: rejectMaxWidth, rejectMaxHeight: rejectMaxHeight } = getRejectDimensions(o);
      if (S === void 0 || S.width > rejectMaxWidth || S.height > rejectMaxHeight)
        throw new ImageResizeError(
          `Unable to resize image \u2014 could not verify image dimensions are within the ${rejectMaxWidth}x${rejectMaxHeight}px API limit.`,
        );
      if (I > o.targetRawSize)
        return (
          logEvent("tengu_image_resize", {
            over_byte_limit: !0,
            over_dimension_limit: !1,
            resized_for_tokens: !1,
            original_size_bytes: I,
          }),
          { buffer: await sharp(p).jpeg({ quality: 80 }).toBuffer(), mediaType: "jpeg" }
        );
      return { buffer: p, mediaType: y };
    }
    let originalWidth = metadata.width,
      originalHeight = metadata.height,
      [w, x] = fitImageDimensions(originalWidth, originalHeight, o),
      R = w !== originalWidth || x !== originalHeight;
    if (I <= o.targetRawSize && !R)
      return {
        buffer: p,
        mediaType: y,
        dimensions: {
          originalWidth: originalWidth,
          originalHeight: originalHeight,
          displayWidth: w,
          displayHeight: x,
        },
      };
    let isPng = y === "png";
    if (
      (logEvent("tengu_image_resize", {
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
      }),
      !R && I > o.targetRawSize)
    ) {
      if (isPng) {
        let S = await timePngPalette(() => sharp(p).png({ compressionLevel: 9, palette: !0 }).toBuffer(), u);
        if (S.length <= o.targetRawSize)
          return {
            buffer: S,
            mediaType: "png",
            dimensions: {
              originalWidth: originalWidth,
              originalHeight: originalHeight,
              displayWidth: w,
              displayHeight: x,
            },
          };
      }
      for (let quality of [80, 60, 40, 20]) {
        let compressedBuffer = await sharp(p).jpeg({ quality: quality }).toBuffer();
        if (compressedBuffer.length <= o.targetRawSize)
          return {
            buffer: compressedBuffer,
            mediaType: "jpeg",
            dimensions: {
              originalWidth: originalWidth,
              originalHeight: originalHeight,
              displayWidth: w,
              displayHeight: x,
            },
          };
      }
    }
    logForDebugging(`Resizing to ${w}x${x}`);
    let A =
        R &&
        s !== void 0 &&
        originalWidth <= getRejectDimensions(o).rejectMaxWidth &&
        originalHeight <= getRejectDimensions(o).rejectMaxHeight &&
        isLosslessWebp(p)
          ? "png"
          : toEncoderFormat(y),
      resize = sharp(p).resize(w, x, { fit: "inside", withoutEnlargement: !0 });
    if (A !== y) resize = resize.png();
    let G =
        A === "png"
          ? await tryWebpEncoding(() => sharp(p).resize(w, x, { fit: "inside", withoutEnlargement: !0 }), s)
          : {},
      ee = G.webp ?? (await resize.toBuffer());
    if (ee.length > o.targetRawSize) {
      if (isPng) {
        let B = await timePngPalette(
          () =>
            sharp(p)
              .resize(w, x, { fit: "inside", withoutEnlargement: !0 })
              .png({ compressionLevel: 9, palette: !0 })
              .toBuffer(),
          u,
        );
        if (B.length <= o.targetRawSize)
          return {
            buffer: B,
            mediaType: "png",
            dimensions: {
              originalWidth: originalWidth,
              originalHeight: originalHeight,
              displayWidth: w,
              displayHeight: x,
            },
          };
      }
      for (let quality of [80, 60, 40, 20]) {
        let compressedBuffer = await sharp(p)
          .resize(w, x, { fit: "inside", withoutEnlargement: !0 })
          .jpeg({ quality: quality })
          .toBuffer();
        if (compressedBuffer.length <= o.targetRawSize)
          return {
            buffer: compressedBuffer,
            mediaType: "jpeg",
            dimensions: {
              originalWidth: originalWidth,
              originalHeight: originalHeight,
              displayWidth: w,
              displayHeight: x,
            },
          };
      }
      let smallerWidth = Math.min(w, 1000),
        smallerHeight = Math.round((x * smallerWidth) / Math.max(w, 1));
      logForDebugging("Still too large, compressing with JPEG");
      let compressedBuffer = await sharp(p)
        .resize(smallerWidth, smallerHeight, { fit: "inside", withoutEnlargement: !0 })
        .jpeg({ quality: 20 })
        .toBuffer();
      return (
        logForDebugging(`JPEG compressed buffer size: ${compressedBuffer.length}`),
        {
          buffer: compressedBuffer,
          mediaType: "jpeg",
          dimensions: {
            originalWidth: originalWidth,
            originalHeight: originalHeight,
            displayWidth: smallerWidth,
            displayHeight: smallerHeight,
          },
        }
      );
    }
    return {
      buffer: ee,
      mediaType: G.webp ? "webp" : A,
      dimensions: {
        originalWidth: originalWidth,
        originalHeight: originalHeight,
        displayWidth: w,
        displayHeight: x,
      },
      losslessWebp: G.lossless,
    };
  } catch (error) {
    if (error instanceof ImageResizeError) throw error;
    let errorType = classifyImageErrorCode(error),
      errorMsg = errorMessage(error);
    if (isUnknownImageErrorType(errorType)) logError(error);
    else logForDebugging(`Image resize failed: ${errorMsg}`, { level: "error" });
    logEvent("tengu_image_resize_failed", {
      original_size_bytes: n,
      error_type: errorType,
      error_message_hash: hashString(errorMsg),
      ...getErrorTelemetryFields(error),
      ...getImageFormatTelemetryFields(e),
    });
    let normalizedExt = detectImageFormatFromBuffer(e).slice(6),
      base64Size = Math.ceil((n * 4) / 3),
      E = parseWebpHeader(e);
    if (E === void 0)
      throw new ImageResizeError(
        "Unable to resize image \u2014 image processing is unavailable and dimensions could not be read from the file header. " +
          "Please convert the image to PNG, JPEG, GIF, or WebP.",
      );
    let { rejectMaxWidth: rejectMaxWidth, rejectMaxHeight: rejectMaxHeight } =
        errorType === ERROR_TYPE_DECODING_OFF && isFirstPartyApiBackend()
          ? { rejectMaxWidth: K, rejectMaxHeight: K }
          : getRejectDimensions(o),
      x = E.width > rejectMaxWidth || E.height > rejectMaxHeight;
    if (base64Size <= o.maxBase64Size && !x)
      return (
        logEvent("tengu_image_resize_fallback", {
          original_size_bytes: n,
          base64_size_bytes: base64Size,
          error_type: errorType,
        }),
        { buffer: e, mediaType: normalizedExt }
      );
    if (errorType === ERROR_TYPE_DECODING_OFF)
      throw new ImageResizeError(
        x
          ? `Unable to send image \u2014 at ${E.width}x${E.height}px it is over the ${rejectMaxWidth}x${rejectMaxHeight}px limit, and this session cannot shrink images. Resize it to fit within ${rejectMaxWidth}x${rejectMaxHeight}px and try again.`
          : `Unable to send image \u2014 it is ${formatFileSize(base64Size)} in base64, over the API's ${formatFileSize(o.maxBase64Size)} limit, and this session cannot shrink images. Make it smaller than ${Math.floor((o.targetRawSize / 1024 / 1024) * 10) / 10}MB and try again.`,
      );
    if (errorType === ERROR_TYPE_DECODE_FAILED) {
      let { reason: reason, advice: advice } = describeUndecodableImage(e),
        A = x
          ? `at ${E.width}x${E.height}px it is over the ${rejectMaxWidth}x${rejectMaxHeight}px limit`
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
    if (n !== void 0) n.pngPaletteMs += performance.now() - startTime;
  }
}
/**
 * 把图片压到字节上限以内：JPEG 质量递减并逐步缩小尺寸。
 */
//@ chunk-mvvq2nx1.js:14140-14483 layout
async function compressToJpegUnderBytes(e, n, r) {
  let o = await s4(),
    u = (p) => o(e).jpeg({ quality: p }).toBuffer(),
    s = e,
    i = 90;
  if (!/jpe?g/i.test(r)) {
    let p = await u(90);
    if (p.length < s.length) s = p;
    if (p.length <= n) return p;
    i = 89;
  }
  let h = 1,
    y;
  for (let p = 0; p < 5; p++) {
    let floored = Math.floor((h + i) / 2),
      E = await u(floored);
    if (E.length < s.length) s = E;
    if (E.length <= n) ((y = E), (h = floored + 1));
    else i = floored - 1;
    if (h > i) break;
  }
  return y ?? s;
}
/**
 * 处理 image block（base64 或 Buffer）：diskless 时只校验尺寸，否则调用缩放并返回新 block 或"无法处理"文本块。
 */
//@ chunk-mvvq2nx1.js:14483-15548 fingerprint = maybeResizeAndDownsampleImageBlock (0.402)
async function maybeResizeAndDownsampleImageBlock({
  data: e,
  mediaType: mediaType,
  limits: limits,
  timings: timings,
  allowWebp: allowWebp = !0,
  from: from,
}) {
  let i = Buffer.isBuffer(e) ? e : Buffer.from(e, "base64");
  if (isDiskless()) {
    let _ = parseWebpHeader(i),
      w = _ ? Math.max(_.width, _.height) : 0;
    logEvent("tengu_image_input", {
      over_byte_budget: i.length > vY,
      over_byte_limit: i.length > IMAGE_LIMITS.targetRawSize,
      over_many_images_side_limit: w > aQt,
      over_side_limit: w > K,
      from: fromEnumOpt(from),
    });
  }
  let ext = allowWebp && limits.allowWebp !== !1,
    h = mediaType?.includes("/") ? mediaType.split("/")[1] || "png" : mediaType || "png",
    y,
    startTime = performance.now();
  try {
    y = await maybeResizeAndDownsampleImageBuffer(i, i.length, h, limits, {
      timings: timings,
      directWebpMaxBytes: ext ? fEn(vY) : void 0,
    });
  } catch (error) {
    if (error instanceof ImageResizeError) return degradedImageBlock(error.message, "resize_error");
    throw error;
  } finally {
    if (timings !== void 0) timings.resizeMs = performance.now() - startTime;
  }
  let buffer = y.buffer;
  if (buffer.length > vY) {
    let startTime = performance.now();
    try {
      buffer = await compressToJpegUnderBytes(y.buffer, vY, y.mediaType);
    } catch (error) {
      logForDebugging(
        `Image byte-budget compression failed, passing through unbudgeted: ${errorMessage(error)}`,
        { level: "error" },
      );
    }
    if (timings !== void 0) timings.byteBudgetMs = performance.now() - startTime;
  }
  return (
    (buffer = await chooseImageEncoding(i, y.buffer, buffer, vY, ext, y.losslessWebp)),
    {
      block: {
        type: "image",
        source: {
          type: "base64",
          media_type: detectImageFormatFromBuffer(buffer),
          data: buffer.toString("base64"),
        },
      },
      dimensions: y.dimensions,
    }
  );
}
//@ chunk-mvvq2nx1.js:18060-18079 placement
var weakSet = new WeakSet();
//@ chunk-mvvq2nx1.js:18303-18875 placement
async function checkImageBlockSource(e, n) {
  if (!isPlainObject(e.source))
    return e.source == null
      ? degradedImageBlock("image block has no source object", "no_source")
      : degradedImageBlock("image block source must be an object", "malformed_source");
  if (e.source.type !== "base64") return { block: e };
  let media_type = e.source.media_type;
  if (media_type != null && typeof media_type !== "string")
    return degradedImageBlock("base64 image media_type must be a string", "malformed_source");
  let o = typeof media_type === "string" ? media_type : void 0,
    u = e.source.data,
    s;
  try {
    s = Buffer.isBuffer(u) ? u : Buffer.from(u, "base64");
  } catch (error) {
    return degradedImageBlock(errorMessage(error), "malformed_source");
  }
  return maybeResizeAndDownsampleImageBlock({
    data: s,
    mediaType: o,
    limits: n,
    from: weakSet.has(e) ? "built_block" : "block",
  });
}
//@ chunk-mvvq2nx1.js:18875-19011 placement
function degradedImageBlock(e, n) {
  return (
    logEvent("tengu_image_resize_degraded", { reason: fromEnum(n) }),
    { block: { type: "text", text: `[Image could not be processed: ${e}]` } }
  );
}
/**
 * 把图片压缩到指定字节内（调色板 PNG、渐进缩小、JPEG、超压缩 JPEG 依次尝试）。
 */
//@ chunk-mvvq2nx1.js:19011-20078 fingerprint = compressImageBuffer (0.862)
async function compressImageBuffer(imageBuffer, maxBytes, originalMediaType) {
  let o = originalMediaType?.split("/")[1] || "jpeg",
    normalizedFallback = o === "jpg" ? "jpeg" : o;
  try {
    let sharp = await s4(),
      metadata = await sharp(imageBuffer).metadata(),
      m = metadata.format || normalizedFallback,
      originalSize = imageBuffer.length,
      y = imageBuffer;
    if (!PASSTHROUGH_IMAGE_FORMATS.has(m === "jpg" ? "jpeg" : m))
      ((y = await sharp(imageBuffer).png().toBuffer()), (metadata = await sharp(y).metadata()), (m = "png"));
    let context = {
      imageBuffer: y,
      metadata: metadata,
      format: m,
      maxBytes: maxBytes,
      originalSize: originalSize,
    };
    if (y.length <= maxBytes) return createCompressedImageResult(y, m, originalSize);
    let resizedResult = await tryProgressiveResizing(context, sharp);
    if (resizedResult) return resizedResult;
    if (m === "png") {
      let palettizedResult = await tryPalettePNG(context, sharp);
      if (palettizedResult) return palettizedResult;
    }
    let jpegResult = await tryJPEGConversion(context, 50, sharp);
    if (jpegResult) return jpegResult;
    return await createUltraCompressedJPEG(context, sharp);
  } catch (error) {
    let errorType = classifyImageErrorCode(error),
      errorMsg = errorMessage(error);
    if (isUnknownImageErrorType(errorType)) logError(error);
    else logForDebugging(`Image compression failed: ${errorMsg}`, { level: "error" });
    if (
      (logEvent("tengu_image_compress_failed", {
        original_size_bytes: imageBuffer.length,
        max_bytes: maxBytes,
        error_type: errorType,
        error_message_hash: hashString(errorMsg),
        ...getErrorTelemetryFields(error),
        ...getImageFormatTelemetryFields(imageBuffer),
      }),
      imageBuffer.length <= maxBytes)
    ) {
      let detected = detectImageFormatFromBuffer(imageBuffer);
      return {
        base64: imageBuffer.toString("base64"),
        mediaType: detected,
        originalSize: imageBuffer.length,
      };
    }
    if (errorType === ERROR_TYPE_DECODE_FAILED) {
      let { reason: reason, advice: advice } = describeUndecodableImage(imageBuffer);
      throw new ImageResizeError(
        `Unable to compress image (${formatFileSize(imageBuffer.length)}) to fit within ${formatFileSize(maxBytes)} \u2014 ${reason}. ${advice}`,
      );
    }
    throw new ImageResizeError(
      `Unable to compress image (${formatFileSize(imageBuffer.length)}) to fit within ${formatFileSize(maxBytes)}. Please use a smaller image.`,
    );
  }
}
/**
 * 按 token 上限换算字节上限（token/0.125 为 base64 字符，再 ×0.75）后压缩。
 */
//@ chunk-mvvq2nx1.js:20078-20169 file-local
async function compressImageBufferWithTokenLimit(imageBuffer, maxTokens, originalMediaType) {
  let maxBase64Chars = Math.floor(maxTokens / 0.125),
    maxBytes = Math.floor(maxBase64Chars * 0.75);
  return compressImageBuffer(imageBuffer, maxBytes, originalMediaType);
}
/**
 * image block 超过字节上限时压缩。
 */
//@ chunk-mvvq2nx1.js:20169-20398 fingerprint = compressImageBlock (1)
async function compressImageBlock(imageBlock, maxBytes) {
  if (imageBlock.source.type !== "base64") return imageBlock;
  let imageBuffer = Buffer.from(imageBlock.source.data, "base64");
  if (imageBuffer.length <= maxBytes) return imageBlock;
  let compressed = await compressImageBuffer(imageBuffer, maxBytes);
  return {
    type: "image",
    source: { type: "base64", media_type: compressed.mediaType, data: compressed.base64 },
  };
}
//@ chunk-mvvq2nx1.js:20398-20515 fingerprint = createCompressedImageResult (1)
function createCompressedImageResult(buffer, mediaType, originalSize) {
  let normalizedMediaType = mediaType === "jpg" ? "jpeg" : mediaType;
  return {
    base64: buffer.toString("base64"),
    mediaType: `image/${normalizedMediaType}`,
    originalSize: originalSize,
  };
}
//@ chunk-mvvq2nx1.js:20515-20848 fingerprint = tryProgressiveResizing (1)
async function tryProgressiveResizing(context, sharp) {
  let scalingFactors = [1, 0.75, 0.5, 0.25];
  for (let scalingFactor of scalingFactors) {
    let newWidth = Math.round((context.metadata.width || 2000) * scalingFactor),
      newHeight = Math.round((context.metadata.height || 2000) * scalingFactor),
      resizedImage = sharp(context.imageBuffer).resize(newWidth, newHeight, {
        fit: "inside",
        withoutEnlargement: !0,
      }),
      m = toEncoderFormat(context.format);
    resizedImage = applyFormatOptimizations(resizedImage, m);
    let resizedBuffer = await resizedImage.toBuffer();
    if (resizedBuffer.length <= context.maxBytes)
      return createCompressedImageResult(resizedBuffer, m, context.originalSize);
  }
  return null;
}
//@ chunk-mvvq2nx1.js:20848-21010 fingerprint = applyFormatOptimizations (0.926)
function applyFormatOptimizations(image, format) {
  switch (format) {
    case "png":
      return image.png({ compressionLevel: 9, palette: !0 });
    case "jpeg":
      return image.jpeg({ quality: 80 });
    case "webp":
      return image.webp({ quality: 80 });
  }
}
//@ chunk-mvvq2nx1.js:21010-21242 fingerprint = tryPalettePNG (1)
async function tryPalettePNG(context, sharp) {
  let palettePng = await sharp(context.imageBuffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: !0 })
    .png({ compressionLevel: 9, palette: !0, colors: 64 })
    .toBuffer();
  if (palettePng.length <= context.maxBytes)
    return createCompressedImageResult(palettePng, "png", context.originalSize);
  return null;
}
//@ chunk-mvvq2nx1.js:21242-21448 fingerprint = tryJPEGConversion (1)
async function tryJPEGConversion(context, quality, sharp) {
  let jpegBuffer = await sharp(context.imageBuffer)
    .resize(600, 600, { fit: "inside", withoutEnlargement: !0 })
    .jpeg({ quality: quality })
    .toBuffer();
  if (jpegBuffer.length <= context.maxBytes)
    return createCompressedImageResult(jpegBuffer, "jpeg", context.originalSize);
  return null;
}
//@ chunk-mvvq2nx1.js:21448-21617 fingerprint = createUltraCompressedJPEG (1)
async function createUltraCompressedJPEG(context, sharp) {
  let ultraCompressedBuffer = await sharp(context.imageBuffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: !0 })
    .jpeg({ quality: 20 })
    .toBuffer();
  return createCompressedImageResult(ultraCompressedBuffer, "jpeg", context.originalSize);
}
/**
 * 缩放后生成说明原尺寸/显示尺寸与坐标换算的元信息文本（作为 meta 用户消息附加）。
 */
//@ chunk-mvvq2nx1.js:21617-22018 fingerprint = createImageMetadataText (1)
function createImageMetadataText(dims, sourcePath) {
  let {
    originalWidth: originalWidth,
    originalHeight: originalHeight,
    displayWidth: displayWidth,
    displayHeight: displayHeight,
  } = dims;
  if (
    !originalWidth ||
    !originalHeight ||
    !displayWidth ||
    !displayHeight ||
    displayWidth <= 0 ||
    displayHeight <= 0
  ) {
    if (sourcePath) return `${c4t}${sourcePath}]`;
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
  return `${v8r}${parts.join(", ")}]`;
}
/**
 * 按魔数识别图片 MIME，默认 image/png。
 */
//@ chunk-p8kytbnw.js:1486-1528 callgraph-witnessed = detectImageFormatFromBuffer (0.384)
function detectImageFormatFromBuffer(buffer) {
  return Ph(buffer) ?? "image/png";
}
/**
 * 从 base64 数据识别图片格式。
 */
//@ chunk-p8kytbnw.js:1528-1617 fingerprint = detectImageFormatFromBase64 (1)
function detectImageFormatFromBase64(base64Data) {
  try {
    let buffer = Buffer.from(base64Data, "base64");
    return detectImageFormatFromBuffer(buffer);
  } catch {
    return "image/png";
  }
}
/**
 * 各提供商图片最大边 2000。
 */
//@ chunk-qz53w8v8.js:1699-1837 placement = CLAUDE_OPUS_4_6_CONFIG (0.48)
var MIN_IMAGE_DIMENSION = 1568,
  MAX_IMAGE_DIMENSION_BY_PROVIDER = {
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
  T8r,
  detectImageFormatFromBuffer,
  ImageResizeError,
  checkImageBlockSource,
  s4,
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
