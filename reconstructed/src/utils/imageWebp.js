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
  s4,
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
function fEn(e) {
  return getWebpMode() === "off" ? void 0 : e;
}
//@ chunk-mvvq2nx1.js:15694-15835 placement
async function tryImageEncode(e) {
  try {
    return await e();
  } catch (error) {
    if (isUnknownImageErrorType(classifyImageErrorCode(error))) logError(error);
    else logForDebugging(`WebP step: an encode failed: ${errorMessage(error)}`, { level: "error" });
    return;
  }
}
//@ chunk-mvvq2nx1.js:15835-16018 placement
function encodeWebp(e, n) {
  return tryImageEncode(async () => {
    let toBuffer = await (await e()).webp(n).toBuffer();
    if (n.lossless && !isLosslessWebp(toBuffer))
      throw Error("a lossless WebP encode wrote a file that is not lossless");
    return toBuffer;
  });
}
/**
 * 无损编码 WebP，并在可疑情况下把原图与 WebP 解码结果都转 PNG 逐字节比较，不一致返回 not_exact。
 */
//@ chunk-mvvq2nx1.js:16018-16325 placement
async function encodeExactLosslessWebp(e) {
  let n = await encodeWebp(e, { lossless: !0 });
  if (n === void 0 || !webpHasAlpha(n)) return n;
  let r = await e(),
    o = r === (await e()) ? void 0 : { compressionLevel: 0 },
    u = await s4(),
    [s, i] = await Promise.all([
      tryImageEncode(() => r.png(o).toBuffer()),
      tryImageEncode(() => u(n).png(o).toBuffer()),
    ]);
  if (s === void 0 || i === void 0) return;
  return i.equals(s) ? n : "not_exact";
}
/**
 * 在大小上限内选择 WebP 变体：无损版足够小直接用；mode 为 all 时再试 90 质量有损版，并与同质量 JPEG 比较，只有更小时才用，返回结果种类与选中的数据。
 */
//@ chunk-mvvq2nx1.js:16325-16826 placement
async function chooseWebpVariant(getImage, losslessWebp, maxBytes, mode) {
  if (losslessWebp.length <= maxBytes / 2) return { result: "lossless", webp: losslessWebp };
  if (mode !== "all") return { result: "too_large" };
  let lossyWebp = await encodeWebp(getImage, { lossless: !1, quality: 90 });
  if (lossyWebp === void 0) return { result: "failed" };
  if (lossyWebp.length > maxBytes) return { result: "too_large" };
  let jpegYardstick = await tryImageEncode(() => getImage().jpeg({ quality: 90 }).toBuffer());
  if (jpegYardstick === void 0) return { result: "failed" };
  if (jpegYardstick.length > maxBytes) return { result: "no_yardstick" };
  if (lossyWebp.length >= jpegYardstick.length) return { result: "not_smaller" };
  return losslessWebp.length <= lossyWebp.length
    ? { result: "lossless", webp: losslessWebp }
    : { result: "lossy", webp: lossyWebp };
}
/**
 * 图片缩放流程中的 WebP 直出：按开关模式尝试无损/有损 WebP，记录结果与耗时遥测，成功返回 webp，否则返回无损编码结果供后续判断。
 */
//@ chunk-mvvq2nx1.js:16826-17255 placement
async function tryWebpEncoding(e, n) {
  let r = getWebpMode();
  if (n === void 0 || r === "off") return {};
  let startTime = performance.now(),
    u = await encodeExactLosslessWebp(e),
    { result: s, webp: webp } =
      u === void 0
        ? { result: "failed", webp: void 0 }
        : u === "not_exact"
          ? { result: u, webp: void 0 }
          : await chooseWebpVariant(e, u, n, r);
  if (
    (logEvent("tengu_image_webp_direct", {
      mode: fromEnum(r),
      result: fromEnum(s),
      ...(webp !== void 0 && { sent_size_bytes: webp.length }),
      encode_ms: Math.round(performance.now() - startTime),
    }),
    webp === void 0)
  )
    return { lossless: u };
  return (logFeatureOk("input_image_webp"), { webp: webp });
}
//@ chunk-mvvq2nx1.js:17255-18060 placement
async function chooseImageEncoding(e, n, r, o, u, s) {
  let i = getWebpMode(),
    m = detectImageFormatFromBuffer(n),
    h = m === "image/webp" && detectImageFormatFromBuffer(e) !== "image/webp",
    y = n.length > o,
    p = u && m === "image/png" && (y ? i === "all" : i !== "off") && !pngHasExifOrientation(n),
    startTime = performance.now(),
    E = async () => (await s4())(n),
    _ = !p
      ? void 0
      : y
        ? await encodeWebp(E, { lossless: !1, quality: 90 })
        : (s ?? (await encodeExactLosslessWebp(E))),
    w = _ === "not_exact" ? void 0 : _,
    x = w !== void 0 && w.length < r.length ? w : r,
    R = _ === "not_exact" ? _ : w === void 0 ? "failed" : "not_smaller";
  if (x === w) logFeatureOk("input_image_webp");
  else if (p) logFeatureSad("input_image_webp", R === "failed" ? "encode_failed" : R);
  return (
    logEvent("tengu_image_output", {
      mode: fromEnum(i),
      webp_try: fromEnum(h ? "direct" : !p ? "none" : y ? "lossy" : "lossless"),
      ...(!h && {
        resized_format: fromEnum(m),
        resized_size_bytes: n.length,
        without_webp_size_bytes: r.length,
      }),
      sent_format: fromEnum(detectImageFormatFromBuffer(x)),
      sent_size_bytes: x.length,
      ...(p && {
        webp_result: fromEnum(x === w ? "sent" : R),
        webp_encode_ms: Math.round(performance.now() - startTime),
      }),
    }),
    x
  );
}

export { fEn, chooseImageEncoding, tryWebpEncoding };
