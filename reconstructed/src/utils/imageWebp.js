/**
 * utils/imageWebp.ts
 *
 * WebP 编码选择（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mvvq2nx1.js (8)
 * attribution: placement 8
 */
import { isDiskless } from "../bootstrap/state.js";
import { isFirstPartyApiBackend } from "./model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  TENGU_PARSED_EAGLE,
  isUnknownImageErrorType,
  classifyImageErrorCode,
  loadImageDecoder,
  detectImageFormatFromBuffer,
} from "./imageResizer.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { errorMessage } from "./errors.js";
import { isLosslessWebp, webpHasAlpha, pngHasExifOrientation } from "./imageFormats.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";

//@ chunk-mvvq2nx1.js:15548-15650 placement
function getWebpMode() {
  if (isDiskless()) return "off";
  let mode = isFirstPartyApiBackend()
    ? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PARSED_EAGLE, "off")
    : "off";
  return mode === "lossless" || mode === "all" ? mode : "off";
}
//@ chunk-mvvq2nx1.js:15650-15694 placement
/**
 * WebP 模式关闭时返回 undefined，否则返回原值。
 */
function webpMaxBytesIfOn(maxBytes) {
  return getWebpMode() === "off" ? undefined : maxBytes;
}
//@ chunk-mvvq2nx1.js:15694-15835 placement
async function tryImageEncode(run) {
  try {
    return await run();
  } catch (error) {
    if (isUnknownImageErrorType(classifyImageErrorCode(error))) logError(error);
    else
      logForDebugging(`WebP step: an encode failed: ${errorMessage(error)}`, {
        level: "error",
      });
    return;
  }
}
//@ chunk-mvvq2nx1.js:15835-16018 placement
function encodeWebp(getImage, options) {
  return tryImageEncode(async () => {
    let encoded = await (await getImage()).webp(options).toBuffer();
    if (options.lossless && !isLosslessWebp(encoded))
      throw Error("a lossless WebP encode wrote a file that is not lossless");
    return encoded;
  });
}
//@ chunk-mvvq2nx1.js:16018-16325 placement
/**
 * 无损编码 WebP，并在可疑情况下把原图与 WebP 解码结果都转 PNG 逐字节比较，不一致返回 not_exact。
 */
async function encodeExactLosslessWebp(getImage) {
  let encoded = await encodeWebp(getImage, {
    lossless: true,
  });
  if (encoded === undefined || !webpHasAlpha(encoded)) return encoded;
  let pipeline = await getImage();
  let pngOptions =
    pipeline === (await getImage())
      ? undefined
      : {
          compressionLevel: 0,
        };
  let imageDecoder = await loadImageDecoder();
  let [originalPng, roundtripPng] = await Promise.all([
    tryImageEncode(() => pipeline.png(pngOptions).toBuffer()),
    tryImageEncode(() => imageDecoder(encoded).png(pngOptions).toBuffer()),
  ]);
  if (originalPng === undefined || roundtripPng === undefined) return;
  return roundtripPng.equals(originalPng) ? encoded : "not_exact";
}
//@ chunk-mvvq2nx1.js:16325-16826 placement
/**
 * 在大小上限内选择 WebP 变体：无损版足够小直接用；mode 为 all 时再试 90 质量有损版，并与同质量 JPEG 比较，只有更小时才用，返回结果种类与选中的数据。
 */
async function chooseWebpVariant(getImage, losslessWebp, maxBytes, mode) {
  if (losslessWebp.length <= maxBytes / 2)
    return {
      result: "lossless",
      webp: losslessWebp,
    };
  if (mode !== "all")
    return {
      result: "too_large",
    };
  let lossyWebp = await encodeWebp(getImage, {
    lossless: false,
    quality: 90,
  });
  if (lossyWebp === undefined)
    return {
      result: "failed",
    };
  if (lossyWebp.length > maxBytes)
    return {
      result: "too_large",
    };
  let jpegYardstick = await tryImageEncode(() =>
    getImage()
      .jpeg({
        quality: 90,
      })
      .toBuffer(),
  );
  if (jpegYardstick === undefined)
    return {
      result: "failed",
    };
  if (jpegYardstick.length > maxBytes)
    return {
      result: "no_yardstick",
    };
  if (lossyWebp.length >= jpegYardstick.length)
    return {
      result: "not_smaller",
    };
  return losslessWebp.length <= lossyWebp.length
    ? {
        result: "lossless",
        webp: losslessWebp,
      }
    : {
        result: "lossy",
        webp: lossyWebp,
      };
}
//@ chunk-mvvq2nx1.js:16826-17255 placement
/**
 * 图片缩放流程中的 WebP 直出：按开关模式尝试无损/有损 WebP，记录结果与耗时遥测，成功返回 webp，否则返回无损编码结果供后续判断。
 */
async function tryWebpEncoding(getImage, maxBytes) {
  let mode = getWebpMode();
  if (maxBytes === undefined || mode === "off") return {};
  let startTime = performance.now();
  let losslessWebp = await encodeExactLosslessWebp(getImage);
  let { result, webp } =
    losslessWebp === undefined
      ? {
          result: "failed",
          webp: undefined,
        }
      : losslessWebp === "not_exact"
        ? {
            result: losslessWebp,
            webp: undefined,
          }
        : await chooseWebpVariant(getImage, losslessWebp, maxBytes, mode);
  logEvent("tengu_image_webp_direct", {
    mode: fromEnum(mode),
    result: fromEnum(result),
    ...(webp !== undefined && {
      sent_size_bytes: webp.length,
    }),
    encode_ms: Math.round(performance.now() - startTime),
  });
  if (webp === undefined)
    return {
      lossless: losslessWebp,
    };
  logFeatureOk("input_image_webp");
  return {
    webp,
  };
}
//@ chunk-mvvq2nx1.js:17255-18060 placement
async function chooseImageEncoding(originalBuffer, bytes, buffer, maxBytes, allowWebp, losslessWebp) {
  let webpMode = getWebpMode();
  let imageFormatFromBuffer = detectImageFormatFromBuffer(bytes);
  let inputWasWebp =
    imageFormatFromBuffer === "image/webp" && detectImageFormatFromBuffer(originalBuffer) !== "image/webp";
  let overBudget = bytes.length > maxBytes;
  let shouldTryWebp =
    allowWebp &&
    imageFormatFromBuffer === "image/png" &&
    (overBudget ? webpMode === "all" : webpMode !== "off") &&
    !pngHasExifOrientation(bytes);
  let startTime = performance.now();
  let getImage = async () => (await loadImageDecoder())(bytes);
  let webpEncoded = !shouldTryWebp
    ? undefined
    : overBudget
      ? await encodeWebp(getImage, {
          lossless: false,
          quality: 90,
        })
      : (losslessWebp ?? (await encodeExactLosslessWebp(getImage)));
  let webpBuffer = webpEncoded === "not_exact" ? undefined : webpEncoded;
  let chosen = webpBuffer !== undefined && webpBuffer.length < buffer.length ? webpBuffer : buffer;
  let webpResult =
    webpEncoded === "not_exact" ? webpEncoded : webpBuffer === undefined ? "failed" : "not_smaller";
  if (chosen === webpBuffer) logFeatureOk("input_image_webp");
  else if (shouldTryWebp)
    logFeatureSad("input_image_webp", webpResult === "failed" ? "encode_failed" : webpResult);
  logEvent("tengu_image_output", {
    mode: fromEnum(webpMode),
    webp_try: fromEnum(inputWasWebp ? "direct" : !shouldTryWebp ? "none" : overBudget ? "lossy" : "lossless"),
    ...(!inputWasWebp && {
      resized_format: fromEnum(imageFormatFromBuffer),
      resized_size_bytes: bytes.length,
      without_webp_size_bytes: buffer.length,
    }),
    sent_format: fromEnum(detectImageFormatFromBuffer(chosen)),
    sent_size_bytes: chosen.length,
    ...(shouldTryWebp && {
      webp_result: fromEnum(chosen === webpBuffer ? "sent" : webpResult),
      webp_encode_ms: Math.round(performance.now() - startTime),
    }),
  });
  return chosen;
}
export { webpMaxBytesIfOn, chooseImageEncoding, tryWebpEncoding };
