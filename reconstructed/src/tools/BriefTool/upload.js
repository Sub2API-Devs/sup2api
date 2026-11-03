/**
 * tools/BriefTool/upload.ts
 *
 * Brief 附件上传到 Anthropic 文件存储：策略检查、multipart 缓冲/流式上传、重发、预览副本与缩放、项目文件夹写入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BriefTool/upload.ts
 * pieces: chunk-7kpfrhzn.js (47)
 * attribution: placement 21, layout 20, fingerprint 5, callgraph-witnessed 1
 */
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { extname, basename } from "path";
import { parseWebpHeader, isAnimatedWebp } from "../../utils/imageFormats.js";
import { gJ, V9o, isTransientUploadFailure, nir } from "../../utils/imageErrors.js";
import { ao } from "../../bridge/bridgeHostState.js";
import { s4, isUnknownImageErrorType, classifyImageErrorCode } from "../../utils/imageResizer.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { dBe, dgr, Nki, UploadStalledError } from "../../utils/telemetry/memorySummary.js";
import { errorMessage, getErrnoCode, findInCauseChain } from "../../utils/errors.js";
import { Lue, Lun } from "../../utils/peerFileTransfer.js";
import { SSL_CERT_ERROR_CODES } from "../../services/api/errorUtils.js";
import { Ph } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getPlatform } from "../../utils/platform.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { policyDenyKind, policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import {
  getBridgeBaseUrlOverride,
  getBridgeAccessTokenAsync,
  getBridgeAccessToken,
  isBridgeFileLoginRefused,
} from "../../bridge/bridgeConfig.js";
import { env } from "../../utils/env.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, oe, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  uploadBuffer,
  ATTACHMENT_CHUNK_BYTES,
  uploadBridgeAttachment,
  uploadWithResends,
  countUploadPost,
  logUploadFailure,
  buildUploadHeaders,
  handleUploadResponse,
} from "../../bridge/attachmentUpload.js";
import { readHandleBounded } from "../../utils/fsSafety/boundOpen.js";
import { isJetBrainsPluginInstalled_2 } from "../../utils/jetbrains.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { Aa } from "../../utils/sleep.js";
import { StoredLoginHeldBackError } from "../../services/oauth/storedLoginRefusal.js";
import { storedLoginRefusalReason } from "../../utils/auth/storedLoginRefused.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-7kpfrhzn.js:4387-4449 placement
var BRIEF_UPLOAD_LIMITS = 20971520,
  me = /^[^\\/\p{Cc}\p{Cf}\uFE00-\uFE0F]{1,255}$/u;
//@ chunk-7kpfrhzn.js:4449-4586 placement
function normalizeUploadFileName(e) {
  return (
    e
      .trim()
      .replace(/:.*$/su, "")
      .replace(/[. ]+$/, "")
      .trim()
      .toLowerCase()
      .replace(/\u0131/g, "i") === "architecture.md"
  );
}
//@ chunk-7kpfrhzn.js:4586-4602 placement
var _e = 40000000;
//@ chunk-7kpfrhzn.js:4602-4731 placement
function imageMimeToFormat(e) {
  switch (e) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpeg";
    case "image/webp":
      return "webp";
    default:
      return;
  }
}
//@ chunk-7kpfrhzn.js:4731-4768 placement
function hasKnownImageType(e) {
  return imageMimeToFormat(e) !== void 0;
}
//@ chunk-7kpfrhzn.js:4768-4839 placement
function isOversizeImage(e) {
  let r = parseWebpHeader(e);
  return r !== void 0 && (r.width > gJ || r.height > gJ);
}
//@ chunk-7kpfrhzn.js:4839-5052 placement
async function maybeScaleImage(e, r, n, a) {
  let h = imageMimeToFormat(r);
  if (h === void 0 || isAnimatedWebp(e)) return;
  let s = parseWebpHeader(e);
  if (s === void 0 || !isOversizeImage(e) || s.width * s.height > _e) return;
  let acquire = await ao().imageScaleLock.acquire();
  try {
    return await scaleOversizeImage(e, h, n, a);
  } finally {
    acquire();
  }
}
//@ chunk-7kpfrhzn.js:5052-5517 placement
async function scaleOversizeImage(e, r, n, a) {
  if (a?.aborted) return;
  try {
    let h = await s4(),
      metadata = await h(e).metadata();
    if (metadata.width * metadata.height > _e) return;
    let toBuffer = await h(e).resize(gJ, gJ, { fit: "inside", withoutEnlargement: !0 })[r]().toBuffer(),
      y = parseWebpHeader(toBuffer);
    if (y === void 0 || isOversizeImage(toBuffer) || toBuffer.length > n) return;
    return {
      buffer: toBuffer,
      width: y.width,
      height: y.height,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
    };
  } catch (error) {
    if (
      (logForDebugging(`[brief:upload] could not scale an oversize image, sending it unscaled: ${error}`),
      isUnknownImageErrorType(classifyImageErrorCode(error)))
    )
      logError(error);
    return;
  }
}
//@ chunk-7kpfrhzn.js:5554-5647 placement
function je(e) {
  return e
    .replace(/[\r\n]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
}
//@ chunk-7kpfrhzn.js:5647-5870 placement
function multipartParts(e, r) {
  let n = `----FormBoundary${randomUUID_2()}`;
  return {
    boundary: n,
    head: Buffer.from(`--${n}\r
Content-Disposition: form-data; name="file"; filename="${je(e)}"\r
Content-Type: ${r}\r
\r
`),
    tail: Buffer.from(`\r
--${n}--\r
`),
  };
}
//@ chunk-7kpfrhzn.js:5870-5951 placement
class UploadSourceError extends Error {
  constructor(e, r) {
    super(e, r);
    this.name = "UploadSourceError";
  }
}
//@ chunk-7kpfrhzn.js:5951-6200 placement
function bufferMultipartBody(e, r, n) {
  let { boundary: boundary, head: head, tail: tail } = multipartParts(r, n);
  async function* m() {
    yield head;
    for (let y = 0; y < e.length; y += dBe) yield e.subarray(y, y + dBe);
    yield tail;
  }
  return {
    boundary: boundary,
    contentLength: head.length + e.length + tail.length,
    slices: m(),
    finished: () => Promise.resolve(),
  };
}
//@ chunk-7kpfrhzn.js:6200-6748 placement
function streamMultipartBody(e, r, n, a) {
  let { boundary: boundary, head: head, tail: tail } = multipartParts(n, a),
    y = !1,
    w = () => {},
    promise = new Promise((A) => {
      w = A;
    });
  async function* U() {
    y = !0;
    try {
      yield head;
      let A = 0;
      while (A < r) {
        let allocUnsafe = Buffer.allocUnsafe(Math.min(dBe, r - A)),
          B;
        try {
          B = (await e.read(allocUnsafe, 0, allocUnsafe.length, A)).bytesRead;
        } catch (error) {
          throw new UploadSourceError(`could not read file (${errorMessage(error)})`, { cause: error });
        }
        if (B === 0) throw new UploadSourceError("the file became shorter while it was being uploaded");
        ((A += B), yield B === allocUnsafe.length ? allocUnsafe : allocUnsafe.subarray(0, B));
      }
      yield tail;
    } finally {
      w();
    }
  }
  return {
    boundary: boundary,
    contentLength: head.length + r + tail.length,
    slices: U(),
    finished: () => (y ? promise : Promise.resolve()),
  };
}
//@ chunk-7kpfrhzn.js:6748-6799 layout
var MIB = 1048576,
  MAX_UPLOAD_BYTES = Lue,
  Ee = Lun,
  Ye = MIB,
  UPLOAD_LIMIT_MEMORY_MS = 600000,
  Ge = 4 * dBe;
//@ chunk-7kpfrhzn.js:6799-6846 layout
function formatMiB(e) {
  return `${(e / MIB).toFixed(1)} MiB`;
}
//@ chunk-7kpfrhzn.js:6846-6970 layout
function formatUploadLimitError(e, r) {
  if (r === void 0) return `${formatMiB(e)} exceeds the upload limit`;
  return `${formatMiB(e)} exceeds the ${V9o(r)} upload limit`;
}
//@ chunk-7kpfrhzn.js:6970-7276 fingerprint = MIME_BY_EXT (0.83)
var UPLOAD_TIMEOUT_MS = 35000,
  RESENDABLE_FAILURE_CODES = ["network_error", "connection_lost", "http_5xx"],
  TEMPORARY_HTTP_STATUSES = new Set([502, 503, 504]),
  Be = new Set(["ENOTFOUND", "ERR_INVALID_URL", ...SSL_CERT_ERROR_CODES]),
  MAX_UPLOAD_POSTS = 3,
  Ue = 30 * MIB,
  qe = 250,
  Ve = 1000,
  Qe = 40000,
  Ze = 150000,
  er = 3,
  rr = 60000,
  IMAGE_MIME_BY_EXT = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
//@ chunk-7kpfrhzn.js:7276-7356 fingerprint = guessMimeType (1)
function guessMimeType(filename) {
  let ext = extname(filename).toLowerCase();
  return IMAGE_MIME_BY_EXT[ext] ?? "application/octet-stream";
}
//@ chunk-7kpfrhzn.js:7356-7508 layout
var PREVIEW_COPY_FORMAT_BY_EXT = {
    ".bmp": "png",
    ".tif": "png",
    ".tiff": "png",
    ".heic": "jpeg",
    ".heif": "jpeg",
    ".avif": "jpeg",
  },
  PREVIEW_JPEG_QUALITY = 90,
  or = new Set(["http_413", "http_5xx", "network_error"]);
//@ chunk-7kpfrhzn.js:7508-7671 layout
function hasAuxiliaryAlphaImage(e) {
  return (
    e.includes("urn:mpeg:hevc:2015:auxid:1") ||
    e.includes("urn:mpeg:avc:2015:auxid:1") ||
    e.includes("urn:mpeg:mpegB:cicp:systems:auxiliary:alpha")
  );
}
//@ chunk-7kpfrhzn.js:7671-8139 layout
function isTruncatedBmp(e) {
  if (e.length < 30 || e[0] !== 66 || e[1] !== 77) return !1;
  let uInt32LE = e.readUInt32LE(14),
    n = uInt32LE === 12;
  if (!n && (uInt32LE < 40 || uInt32LE === 64 || e.length < 34)) return !1;
  let abs = Math.abs(n ? e.readUInt16LE(18) : e.readInt32LE(18)),
    abs_2 = Math.abs(n ? e.readUInt16LE(20) : e.readInt32LE(22)),
    uInt16LE = e.readUInt16LE(n ? 24 : 28),
    m = n ? 0 : e.readUInt32LE(30),
    y = e.length - e.readUInt32LE(10);
  if (m === 1 || m === 2) return abs * abs_2 > 127.5 * y;
  if (m !== 0 && m !== 3 && m !== 6) return !1;
  let w = Math.floor((abs * uInt16LE + 31) / 32) * 4,
    ceil = Math.ceil((abs * uInt16LE) / 8);
  return abs_2 > 0 && w * (abs_2 - 1) + ceil > y;
}
//@ chunk-7kpfrhzn.js:8139-8445 layout
function readIsoBmffBoxes(e, r, n, a) {
  let h = [],
    s = r;
  while (s + 8 <= n) {
    let uInt32BE = e.readUInt32BE(s),
      y = 8;
    if (uInt32BE === 1) {
      if (s + 16 > n) break;
      ((uInt32BE = Number(e.readBigUInt64BE(s + 8))), (y = 16));
    } else if (uInt32BE === 0) uInt32BE = n - s;
    if (uInt32BE < y || s + uInt32BE > n) break;
    let w = { type: e.toString("latin1", s + 4, s + 8), start: s + y, end: s + uInt32BE };
    if (a === void 0) h.push(w);
    else if (w.type === a) return [w];
    s += uInt32BE;
  }
  return h;
}
//@ chunk-7kpfrhzn.js:8445-9348 layout
function readHeifPrimaryItemTransform(e) {
  let [r] = readIsoBmffBoxes(e, 0, e.length, "meta");
  if (r === void 0) return;
  let [n] = readIsoBmffBoxes(e, r.start + 4, r.end, "pitm"),
    [a] = readIsoBmffBoxes(e, r.start + 4, r.end, "iprp");
  if (n === void 0 || a === void 0) return;
  let h = e[n.start] === 0;
  if (n.start + (h ? 6 : 8) > n.end) return;
  let s = h ? e.readUInt16BE(n.start + 4) : e.readUInt32BE(n.start + 4),
    [m] = readIsoBmffBoxes(e, a.start, a.end, "ipco"),
    [y] = readIsoBmffBoxes(e, a.start, a.end, "ipma");
  if (m === void 0 || y === void 0) return;
  let w = readIsoBmffBoxes(e, m.start, m.end),
    b = e[y.start],
    U = (e[y.start + 3] & 1) === 1,
    A = b < 1 ? 2 : 4,
    S = U ? 2 : 1,
    B = y.start + 4;
  if (B + 4 > y.end) return;
  let uInt32BE = e.readUInt32BE(B);
  B += 4;
  let L = 0,
    R = !1;
  for (let F = 0; F < uInt32BE; F++) {
    if (B + A + 1 > y.end) return;
    let x = A === 2 ? e.readUInt16BE(B) : e.readUInt32BE(B),
      P = e[B + A];
    B += A + 1;
    for (let j = 0; j < P; j++) {
      if (B + S > y.end) return;
      let D = S === 2 ? e.readUInt16BE(B) & 32767 : e[B] & 127;
      if (((B += S), x !== s || D === 0)) continue;
      let M = w[D - 1];
      if (M === void 0) return;
      if (M.type === "imir") R = !0;
      else if (M.type === "irot" && M.start < M.end) L = ((4 - (e[M.start] & 3)) % 4) * 90;
    }
  }
  return { clockwise: L, mirrored: R };
}
//@ chunk-7kpfrhzn.js:9348-9663 layout
function isMultiPageTiff(e) {
  if (e.length < 8) return !1;
  let r = e[0] === 73 && e[1] === 73;
  if (!r && !(e[0] === 77 && e[1] === 77)) return !1;
  let dataView = new DataView(e.buffer, e.byteOffset, e.byteLength);
  if (dataView.getUint16(2, r) !== 42) return !1;
  let uint32 = dataView.getUint32(4, r);
  if (uint32 + 2 > e.length) return !1;
  let h = uint32 + 2 + dataView.getUint16(uint32, r) * 12;
  return h + 4 <= e.length && dataView.getUint32(h, r) !== 0;
}
/**
 * 为 bmp/tiff/heic/heif/avif 等生成 png/jpeg 预览副本；多页 TIFF、截断 BMP、旋转/镜像 HEIF、超尺寸等情况放弃并上传原文件。
 */
//@ chunk-7kpfrhzn.js:9663-11219 layout
async function makePreviewCopy(e, r, n, a, h) {
  let s = PREVIEW_COPY_FORMAT_BY_EXT[extname(r).toLowerCase()];
  if (e.length === 0 || s === void 0 || Ph(e) !== null) return;
  let m = s === "jpeg" && hasAuxiliaryAlphaImage(e) ? "png" : s;
  if (isMultiPageTiff(e)) {
    logFeatureSad("bridge_attachment_preview_copy", "multi_page", a);
    return;
  }
  if (isTruncatedBmp(e)) {
    logFeatureSad("bridge_attachment_preview_copy", "truncated", a);
    return;
  }
  let y = 0;
  if (e.toString("latin1", 4, 8) === "ftyp") {
    let [b] = readIsoBmffBoxes(e, 0, e.length, "ftyp"),
      U =
        b === void 0
          ? ""
          : e.toString("latin1", b.start, Math.min(b.start + 4, b.end)) +
            e.toString("latin1", b.start + 8, b.end),
      matches = /avi[fs]/.test(U),
      S;
    try {
      S = readHeifPrimaryItemTransform(e);
    } catch {
      S = void 0;
    }
    if (S === void 0 || S.mirrored || (S.clockwise !== 0 && (matches || getPlatform() !== "macos"))) {
      logFeatureSad(
        "bridge_attachment_preview_copy",
        S === void 0 ? "unreadable_properties" : "turned_or_mirrored",
        a,
      );
      return;
    }
    y = S.clockwise;
  }
  if (n?.aborted) return;
  let acquire = await h.acquire();
  try {
    if (n?.aborted) return;
    let b = await s4(),
      { width: width, height: height } = await b(e).metadata();
    if (width > gJ || height > gJ) {
      (logUploadDebug(
        `${r} is ${width}x${height} pixels, over the ${gJ}-pixel side the server previews; uploading the original, not a preview copy`,
      ),
        logFeatureSad("bridge_attachment_preview_copy", "over_preview_size", a));
      return;
    }
    let S = y === 0 ? b(e) : b(e).rotate(y),
      toBuffer = await (m === "png" ? S.png() : S.jpeg({ quality: PREVIEW_JPEG_QUALITY })).toBuffer();
    if (toBuffer.length > MAX_UPLOAD_BYTES) {
      (logUploadDebug(
        `the copy of ${r} is ${toBuffer.length} bytes, over the ${MAX_UPLOAD_BYTES}-byte limit for a copy; uploading the original`,
      ),
        logFeatureSad("bridge_attachment_preview_copy", "copy_over_upload_limit", a));
      return;
    }
    return { bytes: toBuffer, format: m };
  } catch (error) {
    if (
      (logUploadDebug(
        `could not make a preview copy of ${r} (${errorMessage(error)}); uploading the original`,
      ),
      isUnknownImageErrorType(classifyImageErrorCode(error)))
    )
      logError(error);
    let U = getErrnoCode(error);
    logFeatureSad(
      "bridge_attachment_preview_copy",
      U?.startsWith("ERR_IMAGE_") ? U.toLowerCase() : "convert_failed",
      a,
    );
    return;
  } finally {
    acquire();
  }
}
//@ chunk-7kpfrhzn.js:11219-11258 fingerprint = debug (1)
function logUploadDebug(msg) {
  logForDebugging(`[brief:upload] ${msg}`);
}
/**
 * 上传前置检查：非 firstParty 提供方、仅必要流量隐私配置、allow_send_file 策略不允许时返回错误。
 */
//@ chunk-7kpfrhzn.js:11258-11887 layout
function checkUploadAllowed(e) {
  if (getAPIProvider() !== "firstParty")
    return (
      logFeatureSad("bridge_attachment_upload", "not_first_party", e),
      {
        error:
          "upload disabled: uploading file contents to Anthropic servers is not permitted on this API provider",
      }
    );
  if (isEssentialTrafficOnly())
    return (
      logFeatureSad("bridge_attachment_upload", "essential_traffic", e),
      {
        error:
          "upload disabled: uploading file contents to Anthropic servers is not permitted under this privacy configuration",
      }
    );
  let r = policyDenyKind("allow_send_file");
  if (r !== null)
    return (
      logOrgPolicyDenied("allow_send_file", "tool"),
      logFeatureSad("bridge_attachment_upload", r === "org_denied" ? "policy_denied" : `policy_${r}`, e),
      { error: "upload disabled: " + policyDeniedReason("allow_send_file", "File upload", "is") }
    );
  return null;
}
//@ chunk-7kpfrhzn.js:11887-11954 fingerprint = getBridgeBaseUrl (1)
function getBridgeBaseUrl() {
  return getBridgeBaseUrlOverride() ?? env.ANTHROPIC_BASE_URL ?? getOauthConfig().BASE_API_URL;
}
//@ chunk-7kpfrhzn.js:11954-12057 layout
async function getUploadAuth(e) {
  let r = isStorageV5Enabled() && e !== void 0 ? await getBridgeAccessTokenAsync(e) : getBridgeAccessToken();
  return r ? { token: r } : ao().sessionUploadRoute;
}
//@ chunk-7kpfrhzn.js:12057-12118 layout
function getUploadUrl(e) {
  return e.url ?? `${getBridgeBaseUrl()}/api/oauth/file_upload`;
}
//@ chunk-7kpfrhzn.js:12118-12176 layout
function Ie(e) {
  return e.url === void 0 && isBridgeFileLoginRefused(void 0, e.token);
}
//@ chunk-7kpfrhzn.js:12176-12311 layout
function httpStatusFailureCode(e) {
  if (e === 401 || e === 403 || e === 413) return `http_${e}`;
  if (e >= 500) return "http_5xx";
  if (e >= 400) return "http_4xx";
  return "http_other";
}
//@ chunk-7kpfrhzn.js:12311-12440 layout
var uploadSuccessSchema = DoctorLazy(() => u({ file_uuid: o(), file_kind: oe().optional() })),
  uploadTooLargeSchema = DoctorLazy(() =>
    u({ error: u({ details: u({ max_bytes: E().int().positive() }) }) }),
  );
//@ chunk-7kpfrhzn.js:12440-12531 fingerprint = uploadResponseSchema (0.525)
async function uploadResponseSchema(e, r, n, a, h, s) {
  let m = await uploadBuffer(e, r, n, a, h, s);
  return "error" in m ? m : m.file_uuid;
}
//@ chunk-7kpfrhzn.js:19309-19483 placement
async function readBoundedFile({ handle: handle, size: size }, n) {
  let a = size > n ? void 0 : await readHandleBounded(handle, n, Math.max(size, ATTACHMENT_CHUNK_BYTES));
  if (a === void 0 || a.overLimit) throw Error("the file is over the size limit");
  return a.bytes;
}
//@ chunk-7kpfrhzn.js:19483-19647 placement
async function withOpenedFile(e, r, n, a, h) {
  let s = await uploadBridgeAttachment(e, r, n);
  try {
    return (
      await h(),
      n?.throwIfAborted(),
      (s.size = await isJetBrainsPluginInstalled_2(s.handle)),
      await readBoundedFile(s, a)
    );
  } finally {
    await s.handle.close();
  }
}
//@ chunk-7kpfrhzn.js:19647-19800 placement
function timestampedFileName(e) {
  let r = extname(e),
    n = r ? e.slice(0, -r.length) : e,
    sliced = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  return `${n}-${sliced}-${randomUUID().slice(0, 4)}${r}`;
}
//@ chunk-7kpfrhzn.js:19800-19814 layout
var yr = 524288;
//@ chunk-7kpfrhzn.js:19814-20100 layout
async function readAndScaleImage(e, r, n) {
  if (!hasKnownImageType(r) || e.size > MAX_UPLOAD_BYTES) return;
  try {
    let { bytes: bytes } = await readHandleBounded(e.handle, Math.min(e.size, yr));
    if (!isOversizeImage(bytes)) return;
    let h = bytes.length === e.size ? bytes : (await readHandleBounded(e.handle, e.size)).bytes;
    return await maybeScaleImage(h, r, MAX_UPLOAD_BYTES, n);
  } catch (error) {
    logUploadDebug(`could not read ${e.size} bytes to scale an image: ${error}`);
    return;
  }
}
//@ chunk-7kpfrhzn.js:20100-20545 layout
async function uploadScaledImage(e, r, n, a, h) {
  let s = guessMimeType(r),
    m = await uploadWithResends(
      (A, S) =>
        dgr()
          ? uploadStreamWithAuth(bufferMultipartBody(e.buffer, r, s), e.buffer.length, r, n, A, S)
          : uploadBuffer(e.buffer, r, s, n.signal, A, n.credentials, S),
      { filename: r, size: e.buffer.length },
      h,
      n.signal,
      { ...a, image_scaled: !0 },
    );
  if ("error" in m) return m;
  let { width: width, height: height, originalWidth: originalWidth, originalHeight: originalHeight } = e;
  return (
    logUploadDebug(`sent ${r} scaled to ${width}x${height} from ${originalWidth}x${originalHeight}`),
    {
      file_uuid: m.file_uuid,
      scaled: {
        width: width,
        height: height,
        original_width: originalWidth,
        original_height: originalHeight,
      },
    }
  );
}
/**
 * 上传 Brief 附件到 Anthropic 文件存储：策略/提供方检查（仅 firstParty、非仅必要流量、allow_send_file 策略），取 OAuth 凭证，等待轮次，按大小选择缓冲上传（可生成预览副本或缩放图）或流式上传，支持有限次重发与服务器上限记忆，返回 file_uuid 或错误。
 */
//@ chunk-7kpfrhzn.js:20545-23135 callgraph-witnessed = uploadBriefAttachment (0.164)
async function uploadBriefAttachment(fullPath, size, ctx) {
  let a = {
      upload_lane: fromEnum(ctx.lane),
      size_bucket: fromEnum(
        size <= MIB
          ? "le_1m"
          : size <= 30 * MIB
            ? "le_30m"
            : size <= 100 * MIB
              ? "le_100m"
              : size <= 400 * MIB
                ? "le_400m"
                : "gt_400m",
      ),
      server_max_known: getKnownServerUploadLimit() !== void 0,
    },
    h = checkUploadAllowed(a);
  if (h) return (logUploadDebug(`skip ${fullPath}: policy/provider gate denied`), h);
  if (ctx.signal?.aborted)
    return (logFeatureSad("bridge_attachment_upload", "aborted", a), { error: "upload aborted" });
  if (!(await getUploadAuth(ctx.credentials)))
    return (
      logUploadDebug("skip: no oauth token"),
      logFeatureSad("bridge_attachment_upload", "no_token", a),
      { error: "upload failed: no OAuth token available" }
    );
  let s = ctx.filename ?? basename(fullPath),
    { resendMaxMiB: resendMaxMiB = 0 } = ctx,
    y = {
      made: 0,
      max: Number.isInteger(ctx.maxPosts) ? Math.min(Math.max(ctx.maxPosts, 1), MAX_UPLOAD_POSTS) : 1,
      resendMaxBytes: Math.max(Number.isFinite(resendMaxMiB) ? resendMaxMiB * MIB : 0, Ue),
      firstAtMs: void 0,
      clock: ctx.clock ?? Aa,
    };
  if (y.max > 2) a = { ...a, max_posts: y.max };
  let w =
      !ctx.originalsOnly &&
      !ctx.noPreviewCopies &&
      PREVIEW_COPY_FORMAT_BY_EXT[extname(s).toLowerCase()] !== void 0,
    b = size <= MAX_UPLOAD_BYTES,
    token = dgr();
  if (w && !b && token) logFeatureSad("bridge_attachment_preview_copy", "original_over_copy_limit", a);
  let A = !token || size <= Ye || (w && b);
  if (A && !b)
    return (
      logUploadDebug(`skip ${fullPath}: ${size} bytes exceeds ${MAX_UPLOAD_BYTES} limit`),
      logFeatureSad("bridge_attachment_upload", "too_large", a),
      { error: formatUploadLimitError(size, MAX_UPLOAD_BYTES) }
    );
  let S;
  try {
    S = await uploadBridgeAttachment(fullPath, ctx.identity, ctx.signal);
  } catch (error) {
    logUploadDebug(`open failed for ${fullPath}: ${error}`);
    let v = ctx.signal?.aborted === !0;
    return (
      logFeatureSad("bridge_attachment_upload", v ? "aborted" : "read_failed", a),
      { error: v ? "upload aborted" : `upload failed: could not read file (${errorMessage(error)})` }
    );
  }
  try {
    await ctx.waitForTurn();
    let baseUrl = getKnownServerUploadLimit();
    a = { ...a, server_max_known: baseUrl !== void 0 };
    let filename = checkUploadAllowed(a);
    if (filename)
      return (
        logUploadDebug(`skip ${fullPath}: policy/provider gate denied after the wait for a turn`),
        filename
      );
    if (ctx.signal?.aborted)
      return (logFeatureSad("bridge_attachment_upload", "aborted", a), { error: "upload aborted" });
    let L;
    try {
      if (((S.size = await isJetBrainsPluginInstalled_2(S.handle)), A))
        L = await readBoundedFile(S, MAX_UPLOAD_BYTES);
    } catch (error) {
      return (
        logUploadDebug(`read failed for ${fullPath}: ${error}`),
        logFeatureSad("bridge_attachment_upload", "read_failed", a),
        { error: `upload failed: could not read file (${errorMessage(error)})` }
      );
    }
    if (L !== void 0) return await uploadWithPreviewCopy(L, s, ctx, a, y);
    let min = Math.min(Ee, baseUrl ?? Ee);
    if (S.size > min)
      return (
        logUploadDebug(
          `skip ${fullPath}: ${S.size} bytes exceeds the ${min} limit ${min === baseUrl ? "the store reported" : "of this client"}`,
        ),
        logFeatureSad("bridge_attachment_upload", "too_large", a),
        { error: formatUploadLimitError(S.size, min) }
      );
    let F =
      ctx.originalsOnly || ctx.noScaledCopies
        ? void 0
        : await readAndScaleImage(S, guessMimeType(s), ctx.signal);
    if (F !== void 0) return await uploadScaledImage(F, s, ctx, a, y);
    let x = !1,
      P = await uploadWithResends(
        (D, M) => (
          (x = !1),
          uploadStreamWithAuth(
            streamMultipartBody(S.handle, S.size, s, guessMimeType(s)),
            S.size,
            s,
            ctx,
            D,
            (fe, xe, ce, pe) => {
              ((x = isResendableFailure(fe, ce, pe)), M(fe, xe, ce, pe));
            },
          )
        ),
        { filename: s, size: S.size },
        y,
        ctx.signal,
        a,
      );
    if (!("error" in P)) return { file_uuid: P.file_uuid };
    if (!x || !isTransientUploadFailure(P.error, P.errorCode)) return P;
    let j = getKnownServerUploadLimit() ?? baseUrl;
    if (j !== void 0) return S.size > j ? { error: formatUploadLimitError(S.size, j) } : P;
    return S.size > nir ? { ...P, suspectedLimitBytes: nir } : P;
  } finally {
    await S.handle.close().catch((B) => {
      logUploadDebug(`close failed for ${fullPath}: ${B}`);
    });
  }
}
//@ chunk-7kpfrhzn.js:23135-23236 layout
function isResendableFailure(e, r, n) {
  return e === "http_5xx" ? r !== "any_post" && r !== "reason_not_temporary" : n !== void 0 && n > Ge;
}
//@ chunk-7kpfrhzn.js:23236-23334 placement
function getKnownServerUploadLimit() {
  let uploadLimitTold = ao().uploadLimitTold;
  return uploadLimitTold !== void 0 && Date.now() - uploadLimitTold.atMs < UPLOAD_LIMIT_MEMORY_MS
    ? uploadLimitTold.maxBytes
    : void 0;
}
/**
 * 先传预览副本，失败再传原件
 */
//@ chunk-7kpfrhzn.js:23334-24341 placement
async function uploadWithPreviewCopy(e, r, n, a, h) {
  let s =
    n.originalsOnly || n.noPreviewCopies ? void 0 : await makePreviewCopy(e, r, n.signal, a, n.copyLock);
  if (s !== void 0) {
    let w, b, U;
    countUploadPost(h);
    let A = await uploadBuffer(
      s.bytes,
      `${basename(r, extname(r))}.${s.format === "png" ? "png" : "jpg"}`,
      "application/octet-stream",
      n.signal,
      a,
      n.credentials,
      (S, B, v) => {
        ((w = S), (b = B), (U = v));
      },
    );
    if (!("error" in A)) {
      let S = A.file_kind === "image";
      if (S) logFeatureOk("bridge_attachment_preview_copy", a);
      else logFeatureSad("bridge_attachment_preview_copy", "no_preview", a);
      return {
        file_uuid: A.file_uuid,
        copy: { isImage: S, mediaType: s.format === "png" ? "image/png" : "image/jpeg" },
      };
    }
    if (w === void 0 || !or.has(w) || (h.max > 1 && U === "any_post")) {
      if (w !== void 0) logUploadFailure(w, a, b);
      return A;
    }
    (logUploadDebug(`upload of the copy of ${r} failed (${w}); uploading the original`),
      logFeatureSad("bridge_attachment_preview_copy", `upload_failed_${w}`, a));
  }
  let m =
    n.originalsOnly || n.noScaledCopies
      ? void 0
      : await maybeScaleImage(e, guessMimeType(r), MAX_UPLOAD_BYTES, n.signal);
  if (m !== void 0) return uploadScaledImage(m, r, n, a, h);
  let y = await uploadWithResends(
    (w, b) => uploadBuffer(e, r, guessMimeType(r), n.signal, w, n.credentials, b),
    { filename: r, size: e.length },
    h,
    n.signal,
    a,
  );
  return "error" in y ? y : { file_uuid: y.file_uuid };
}
//@ chunk-7kpfrhzn.js:24341-24572 placement
async function uploadStreamWithAuth(e, r, n, a, h, s) {
  let m = await getUploadAuth(a.credentials);
  if (!m)
    return (
      logUploadDebug("skip: no oauth token"),
      s("no_token"),
      { error: "upload failed: no OAuth token available" }
    );
  return uploadStream(e, r, m, { filename: n, signal: a.signal, telemetry: h, logSad: s });
}
//@ chunk-7kpfrhzn.js:24572-25343 placement
async function uploadStream(
  e,
  r,
  n,
  { filename: filename, signal: signal, telemetry: telemetry, logSad: logSad },
) {
  let y = checkUploadAllowed(telemetry);
  if (y) return (logUploadDebug(`skip ${filename}: policy/provider gate denied`), y);
  if (Ie(n))
    return (
      logSad("stored_login_refused"),
      { error: new StoredLoginHeldBackError(storedLoginRefusalReason()).message }
    );
  let w = Nki(e.slices, e.contentLength, { signal: signal });
  try {
    let post = await Dt.post(getUploadUrl(n), w.body, {
      headers: buildUploadHeaders(n.token, e.boundary, e.contentLength, telemetry.upload_lane),
      timeout: 0,
      signal: w.signal,
      validateStatus: () => !0,
      maxRedirects: 0,
    });
    return handleUploadResponse(post, filename, r, telemetry, logSad);
  } catch (error) {
    logUploadDebug(`upload threw for ${filename}: ${error}`);
    let U = uploadAbortError(error, w, signal?.aborted === !0);
    return (
      logSad(
        U.code,
        void 0,
        U.code === "network_error" && Be.has(getErrnoCode(error)) ? "cause_not_temporary" : void 0,
        w.seen().bytes_handed,
      ),
      { error: U.error }
    );
  } finally {
    (w.dispose(),
      w.body.on("error", () => {}),
      w.body.destroy(Error("the upload has already been answered")),
      await e.finished());
  }
}
/**
 * 上传中止/停滞的错误描述
 */
//@ chunk-7kpfrhzn.js:25343-26073 placement
function uploadAbortError(e, r, n) {
  if (n) return { code: "aborted", error: "upload aborted" };
  let reason = r.signal.reason;
  if (reason instanceof UploadStalledError) {
    let seen = r.seen(),
      rounded = Math.round(reason.waitedMs / 1000);
    return {
      code: "stalled",
      error:
        seen.bytes_handed === seen.body_bytes
          ? `upload failed: the server did not answer within ${rounded} seconds of receiving the file`
          : `upload failed: the transfer stalled (nothing moved for ${rounded} seconds)`,
    };
  }
  let h = findInCauseChain(e, (m) => m instanceof UploadSourceError);
  if (h) return { code: "read_failed", error: `upload failed: ${h.message}` };
  let s = getErrnoCode(e);
  if (s === "ECONNRESET" || s === "EPIPE" || s === "ERR_STREAM_PREMATURE_CLOSE")
    return {
      code: "connection_lost",
      error: "upload failed: the connection closed before the server answered",
    };
  return { code: "network_error", error: `upload failed: network error (${errorMessage(e)})` };
}

export {
  uploadSuccessSchema,
  logUploadDebug,
  httpStatusFailureCode,
  TEMPORARY_HTTP_STATUSES,
  uploadTooLargeSchema,
  formatUploadLimitError,
  checkUploadAllowed,
  MAX_UPLOAD_BYTES,
  getUploadAuth,
  Ie,
  multipartParts,
  UPLOAD_TIMEOUT_MS,
  getUploadUrl,
  Be,
  Ue,
  Ze,
  Qe,
  rr,
  er,
  Ve,
  qe,
  RESENDABLE_FAILURE_CODES,
  getKnownServerUploadLimit,
  isResendableFailure,
  BRIEF_UPLOAD_LIMITS,
  formatMiB,
  me,
  normalizeUploadFileName,
  withOpenedFile,
  timestampedFileName,
};
