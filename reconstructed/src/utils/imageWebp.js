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
  let e = isFirstPartyApiBackend() ? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PARSED_EAGLE, "off") : "off";
  return e === "lossless" || e === "all" ? e : "off";
}
//@ chunk-mvvq2nx1.js:15650-15694 placement
/**
 * WebP 模式关闭时返回 undefined，否则返回原值。
 */
function webpMaxBytesIfOn(e) {
  return getWebpMode() === "off" ? undefined : e;
}
//@ chunk-mvvq2nx1.js:15694-15835 placement
async function tryImageEncode(e) {
  try {
    return await e();
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
function encodeWebp(e, n) {
  return tryImageEncode(async () => {
    let r = await (await e()).webp(n).toBuffer();
    if (n.lossless && !isLosslessWebp(r))
      throw Error("a lossless WebP encode wrote a file that is not lossless");
    return r;
  });
}
//@ chunk-mvvq2nx1.js:16018-16325 placement
/**
 * 无损编码 WebP，并在可疑情况下把原图与 WebP 解码结果都转 PNG 逐字节比较，不一致返回 not_exact。
 */
async function encodeExactLosslessWebp(e) {
  let n = await encodeWebp(e, {
    lossless: true,
  });
  if (n === undefined || !webpHasAlpha(n)) return n;
  let r = await e();
  let o =
    r === (await e())
      ? undefined
      : {
          compressionLevel: 0,
        };
  let imageDecoder = await loadImageDecoder();
  let [s, i] = await Promise.all([
    tryImageEncode(() => r.png(o).toBuffer()),
    tryImageEncode(() => imageDecoder(n).png(o).toBuffer()),
  ]);
  if (s === undefined || i === undefined) return;
  return i.equals(s) ? n : "not_exact";
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
  let { result: s, webp } =
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
    result: fromEnum(s),
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
async function chooseImageEncoding(e, buffer, buffer_2, o, u, losslessWebp) {
  let webpMode = getWebpMode();
  let imageFormatFromBuffer = detectImageFormatFromBuffer(buffer);
  let h = imageFormatFromBuffer === "image/webp" && detectImageFormatFromBuffer(e) !== "image/webp";
  let y = buffer.length > o;
  let p =
    u &&
    imageFormatFromBuffer === "image/png" &&
    (y ? webpMode === "all" : webpMode !== "off") &&
    !pngHasExifOrientation(buffer);
  let startTime = performance.now();
  let E = async () => (await loadImageDecoder())(buffer);
  let _ = !p
    ? undefined
    : y
      ? await encodeWebp(E, {
          lossless: false,
          quality: 90,
        })
      : (losslessWebp ?? (await encodeExactLosslessWebp(E)));
  let w = _ === "not_exact" ? undefined : _;
  let x = w !== undefined && w.length < buffer_2.length ? w : buffer_2;
  let R = _ === "not_exact" ? _ : w === undefined ? "failed" : "not_smaller";
  if (x === w) logFeatureOk("input_image_webp");
  else if (p) logFeatureSad("input_image_webp", R === "failed" ? "encode_failed" : R);
  logEvent("tengu_image_output", {
    mode: fromEnum(webpMode),
    webp_try: fromEnum(h ? "direct" : !p ? "none" : y ? "lossy" : "lossless"),
    ...(!h && {
      resized_format: fromEnum(imageFormatFromBuffer),
      resized_size_bytes: buffer.length,
      without_webp_size_bytes: buffer_2.length,
    }),
    sent_format: fromEnum(detectImageFormatFromBuffer(x)),
    sent_size_bytes: x.length,
    ...(p && {
      webp_result: fromEnum(x === w ? "sent" : R),
      webp_encode_ms: Math.round(performance.now() - startTime),
    }),
  });
  return x;
}
export { webpMaxBytesIfOn, chooseImageEncoding, tryWebpEncoding };
