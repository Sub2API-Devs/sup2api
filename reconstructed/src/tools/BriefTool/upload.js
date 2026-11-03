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
import { randomUUID } from "crypto";
import { extname, basename } from "path";
import { parseWebpHeader, isAnimatedWebp } from "../../utils/imageFormats.js";
import {
  MAX_IMAGE_DIMENSION,
  formatMiB as formatMiB_2,
  isTransientUploadFailure,
  SUSPECTED_UPLOAD_LIMIT_BYTES,
} from "../../utils/imageErrors.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import {
  loadImageDecoder,
  isUnknownImageErrorType,
  classifyImageErrorCode,
} from "../../utils/imageResizer.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import {
  UPLOAD_CHUNK_BYTES,
  isZodVersionCompatible,
  uploadStreamWithProgress,
  UploadStalledError,
} from "../../utils/telemetry/memorySummary.js";
import { errorMessage, getErrnoCode, findInCauseChain } from "../../utils/errors.js";
import { MAX_PEER_FILE_BYTES, MAX_PEER_SPOOL_BYTES } from "../../utils/peerFileTransfer.js";
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
  isBridgeFileLoginRefused as isBridgeFileLoginRefused_2,
} from "../../bridge/bridgeConfig.js";
import { env } from "../../utils/env.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, unknown, E } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { systemClock } from "../../utils/sleep.js";
import { StoredLoginHeldBackError } from "../../services/oauth/storedLoginRefusal.js";
import { storedLoginRefusalReason } from "../../utils/auth/storedLoginRefused.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";

//@ chunk-7kpfrhzn.js:4387-4449 placement
/**
 * 上传文件名的合法形式：不含路径分隔符与控制字符，1 到 255 个字符。
 */
var BRIEF_UPLOAD_LIMITS = 20971520;
var UPLOAD_FILENAME_RE = /^[^\\/\p{Cc}\p{Cf}\uFE00-\uFE0F]{1,255}$/u;
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
/**
 * 图片像素数上限（4000 万）；超过就不生成预览副本。
 */
var MAX_IMAGE_PIXELS = 40000000;
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
  return imageMimeToFormat(e) !== undefined;
}
//@ chunk-7kpfrhzn.js:4768-4839 placement
function isOversizeImage(e) {
  let webpHeader = parseWebpHeader(e);
  return (
    webpHeader !== undefined &&
    (webpHeader.width > MAX_IMAGE_DIMENSION || webpHeader.height > MAX_IMAGE_DIMENSION)
  );
}
//@ chunk-7kpfrhzn.js:4839-5052 placement
async function maybeScaleImage(e, r, n, a) {
  let h = imageMimeToFormat(r);
  if (h === undefined || isAnimatedWebp(e)) return;
  let webpHeader = parseWebpHeader(e);
  if (
    webpHeader === undefined ||
    !isOversizeImage(e) ||
    webpHeader.width * webpHeader.height > MAX_IMAGE_PIXELS
  )
    return;
  let m = await bridgeHostState().imageScaleLock.acquire();
  try {
    return await scaleOversizeImage(e, h, n, a);
  } finally {
    m();
  }
}
//@ chunk-7kpfrhzn.js:5052-5517 placement
async function scaleOversizeImage(e, r, n, a) {
  if (a?.aborted) return;
  try {
    let imageDecoder = await loadImageDecoder();
    let s = await imageDecoder(e).metadata();
    if (s.width * s.height > MAX_IMAGE_PIXELS) return;
    let m = await imageDecoder(e)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      [r]()
      .toBuffer();
    let webpHeader = parseWebpHeader(m);
    if (webpHeader === undefined || isOversizeImage(m) || m.length > n) return;
    return {
      buffer: m,
      width: webpHeader.width,
      height: webpHeader.height,
      originalWidth: s.width,
      originalHeight: s.height,
    };
  } catch (error) {
    logForDebugging(`[brief:upload] could not scale an oversize image, sending it unscaled: ${error}`);
    if (isUnknownImageErrorType(classifyImageErrorCode(error))) logError(error);
    return;
  }
}
//@ chunk-7kpfrhzn.js:5554-5647 placement
/**
 * 生成 multipart 文件名：去掉换行、转义反斜杠与双引号。
 */
function escapeMultipartFilename(e) {
  return e
    .replace(/[\r\n]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
}
//@ chunk-7kpfrhzn.js:5647-5870 placement
function multipartParts(e, r) {
  let n = `----FormBoundary${randomUUID()}`;
  return {
    boundary: n,
    head: Buffer.from(`--${n}\r
Content-Disposition: form-data; name="file"; filename="${escapeMultipartFilename(e)}"\r
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
  constructor(message, r) {
    super(message, r);
    this.name = "UploadSourceError";
  }
}
//@ chunk-7kpfrhzn.js:5951-6200 placement
function bufferMultipartBody(buffer, r, n) {
  let { boundary, head, tail } = multipartParts(r, n);
  async function* m() {
    yield head;
    for (let y = 0; y < buffer.length; y += UPLOAD_CHUNK_BYTES)
      yield buffer.subarray(y, y + UPLOAD_CHUNK_BYTES);
    yield tail;
  }
  return {
    boundary,
    contentLength: head.length + buffer.length + tail.length,
    slices: m(),
    finished: () => Promise.resolve(),
  };
}
//@ chunk-7kpfrhzn.js:6200-6748 placement
function streamMultipartBody(handle, r, n, a) {
  let { boundary, head, tail } = multipartParts(n, a);
  let y = false;
  let w = () => {};
  let promise = new Promise((resolve) => {
    w = resolve;
  });
  async function* U() {
    y = true;
    try {
      yield head;
      let A = 0;
      while (A < r) {
        let S = Buffer.allocUnsafe(Math.min(UPLOAD_CHUNK_BYTES, r - A));
        let B;
        try {
          B = (await handle.read(S, 0, S.length, A)).bytesRead;
        } catch (error) {
          throw new UploadSourceError(`could not read file (${errorMessage(error)})`, {
            cause: error,
          });
        }
        if (B === 0) throw new UploadSourceError("the file became shorter while it was being uploaded");
        A += B;
        yield B === S.length ? S : S.subarray(0, B);
      }
      yield tail;
    } finally {
      w();
    }
  }
  return {
    boundary,
    contentLength: head.length + r + tail.length,
    slices: U(),
    finished: () => (y ? promise : Promise.resolve()),
  };
}
//@ chunk-7kpfrhzn.js:6748-6799 layout
/**
 * 上传相关的尺寸常量与开关：直接从 peer 文件传输模块取的默认/服务端上限，小文件阈值 1 MiB，以及重发窗口按帖计算的时长。
 */
var MIB = 1048576;
var MAX_UPLOAD_BYTES = MAX_PEER_FILE_BYTES;
var PEER_FILE_TRANSFER_SERVER_LIMIT = MAX_PEER_SPOOL_BYTES;
var SMALL_UPLOAD_BYTES = MIB;
var UPLOAD_LIMIT_MEMORY_MS = 600000;
var RESEND_WINDOW_PER_POST_MS = 4 * UPLOAD_CHUNK_BYTES;
//@ chunk-7kpfrhzn.js:6799-6846 layout
function formatMiB(e) {
  return `${(e / MIB).toFixed(1)} MiB`;
}
//@ chunk-7kpfrhzn.js:6846-6970 layout
function formatUploadLimitError(e, r) {
  if (r === undefined) return `${formatMiB(e)} exceeds the upload limit`;
  return `${formatMiB(e)} exceeds the ${formatMiB_2(r)} upload limit`;
}
//@ chunk-7kpfrhzn.js:6970-7276 fingerprint = MIME_BY_EXT (0.83)
/**
 * 判定不可重发的 errno 集合（ENOTFOUND、ERR_INVALID_URL 与证书类错误）。
 */
var UPLOAD_TIMEOUT_MS = 35000;
var RESENDABLE_FAILURE_CODES = ["network_error", "connection_lost", "http_5xx"];
var TEMPORARY_HTTP_STATUSES = new Set([502, 503, 504]);
var NON_TEMPORARY_ERRNOS = new Set(["ENOTFOUND", "ERR_INVALID_URL", ...SSL_CERT_ERROR_CODES]);
var MAX_UPLOAD_POSTS = 3;
var MIN_RESEND_MAX_BYTES = 30 * MIB;
var BACKOFF_FLOOR_MS = 250;
var BACKOFF_BASE_MS = 1000;
var RESEND_DEADLINE_MS = 40000;
var RESEND_DEADLINE_LONG_MS = 150000;
var MAX_CONCURRENT_RESENDS = 3;
var RESEND_COOLDOWN_MS = 60000;
var IMAGE_MIME_BY_EXT = {
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
/**
 * 允许重发的错误码集合（http_413、http_5xx、network_error）。
 */
var PREVIEW_COPY_FORMAT_BY_EXT = {
  ".bmp": "png",
  ".tif": "png",
  ".tiff": "png",
  ".heic": "jpeg",
  ".heif": "jpeg",
  ".avif": "jpeg",
};
var PREVIEW_JPEG_QUALITY = 90;
var RESENDABLE_ERROR_CODES_SET = new Set(["http_413", "http_5xx", "network_error"]);
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
  if (e.length < 30 || e[0] !== 66 || e[1] !== 77) return false;
  let uInt32LE = e.readUInt32LE(14);
  let n = uInt32LE === 12;
  if (!n && (uInt32LE < 40 || uInt32LE === 64 || e.length < 34)) return false;
  let a = Math.abs(n ? e.readUInt16LE(18) : e.readInt32LE(18));
  let h = Math.abs(n ? e.readUInt16LE(20) : e.readInt32LE(22));
  let uInt16LE = e.readUInt16LE(n ? 24 : 28);
  let m = n ? 0 : e.readUInt32LE(30);
  let y = e.length - e.readUInt32LE(10);
  if (m === 1 || m === 2) return a * h > 127.5 * y;
  if (m !== 0 && m !== 3 && m !== 6) return false;
  let w = Math.floor((a * uInt16LE + 31) / 32) * 4;
  let b = Math.ceil((a * uInt16LE) / 8);
  return h > 0 && w * (h - 1) + b > y;
}
//@ chunk-7kpfrhzn.js:8139-8445 layout
function readIsoBmffBoxes(e, r, end, a) {
  let h = [];
  let s = r;
  while (s + 8 <= end) {
    let uInt32BE = e.readUInt32BE(s);
    let y = 8;
    if (uInt32BE === 1) {
      if (s + 16 > end) break;
      uInt32BE = Number(e.readBigUInt64BE(s + 8));
      y = 16;
    } else if (uInt32BE === 0) uInt32BE = end - s;
    if (uInt32BE < y || s + uInt32BE > end) break;
    let w = {
      type: e.toString("latin1", s + 4, s + 8),
      start: s + y,
      end: s + uInt32BE,
    };
    if (a === undefined) h.push(w);
    else if (w.type === a) return [w];
    s += uInt32BE;
  }
  return h;
}
//@ chunk-7kpfrhzn.js:8445-9348 layout
function readHeifPrimaryItemTransform(e) {
  let [r] = readIsoBmffBoxes(e, 0, e.length, "meta");
  if (r === undefined) return;
  let [n] = readIsoBmffBoxes(e, r.start + 4, r.end, "pitm");
  let [a] = readIsoBmffBoxes(e, r.start + 4, r.end, "iprp");
  if (n === undefined || a === undefined) return;
  let h = e[n.start] === 0;
  if (n.start + (h ? 6 : 8) > n.end) return;
  let s = h ? e.readUInt16BE(n.start + 4) : e.readUInt32BE(n.start + 4);
  let [m] = readIsoBmffBoxes(e, a.start, a.end, "ipco");
  let [y] = readIsoBmffBoxes(e, a.start, a.end, "ipma");
  if (m === undefined || y === undefined) return;
  let isoBmffBoxes = readIsoBmffBoxes(e, m.start, m.end);
  let b = e[y.start];
  let U = (e[y.start + 3] & 1) === 1;
  let A = b < 1 ? 2 : 4;
  let S = U ? 2 : 1;
  let B = y.start + 4;
  if (B + 4 > y.end) return;
  let uInt32BE = e.readUInt32BE(B);
  B += 4;
  let clockwise = 0;
  let mirrored = false;
  for (let idx = 0; idx < uInt32BE; idx++) {
    if (B + A + 1 > y.end) return;
    let x = A === 2 ? e.readUInt16BE(B) : e.readUInt32BE(B);
    let P = e[B + A];
    B += A + 1;
    for (let j = 0; j < P; j++) {
      if (B + S > y.end) return;
      let D = S === 2 ? e.readUInt16BE(B) & 32767 : e[B] & 127;
      B += S;
      if (x !== s || D === 0) continue;
      let M = isoBmffBoxes[D - 1];
      if (M === undefined) return;
      if (M.type === "imir") mirrored = true;
      else if (M.type === "irot" && M.start < M.end) clockwise = ((4 - (e[M.start] & 3)) % 4) * 90;
    }
  }
  return {
    clockwise,
    mirrored,
  };
}
//@ chunk-7kpfrhzn.js:9348-9663 layout
function isMultiPageTiff(e) {
  if (e.length < 8) return false;
  let r = e[0] === 73 && e[1] === 73;
  if (!r && !(e[0] === 77 && e[1] === 77)) return false;
  let dataView = new DataView(e.buffer, e.byteOffset, e.byteLength);
  if (dataView.getUint16(2, r) !== 42) return false;
  let uint32 = dataView.getUint32(4, r);
  if (uint32 + 2 > e.length) return false;
  let h = uint32 + 2 + dataView.getUint16(uint32, r) * 12;
  return h + 4 <= e.length && dataView.getUint32(h, r) !== 0;
}
//@ chunk-7kpfrhzn.js:9663-11219 layout
/**
 * 为 bmp/tiff/heic/heif/avif 等生成 png/jpeg 预览副本；多页 TIFF、截断 BMP、旋转/镜像 HEIF、超尺寸等情况放弃并上传原文件。
 */
async function makePreviewCopy(e, r, signal, a, copyLock) {
  let s = PREVIEW_COPY_FORMAT_BY_EXT[extname(r).toLowerCase()];
  if (e.length === 0 || s === undefined || Ph(e) !== null) return;
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
    let [b] = readIsoBmffBoxes(e, 0, e.length, "ftyp");
    let U =
      b === undefined
        ? ""
        : e.toString("latin1", b.start, Math.min(b.start + 4, b.end)) +
          e.toString("latin1", b.start + 8, b.end);
    let matches = /avi[fs]/.test(U);
    let S;
    try {
      S = readHeifPrimaryItemTransform(e);
    } catch {
      S = undefined;
    }
    if (S === undefined || S.mirrored || (S.clockwise !== 0 && (matches || getPlatform() !== "macos"))) {
      logFeatureSad(
        "bridge_attachment_preview_copy",
        S === undefined ? "unreadable_properties" : "turned_or_mirrored",
        a,
      );
      return;
    }
    y = S.clockwise;
  }
  if (signal?.aborted) return;
  let w = await copyLock.acquire();
  try {
    if (signal?.aborted) return;
    let imageDecoder = await loadImageDecoder();
    let { width, height } = await imageDecoder(e).metadata();
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      logUploadDebug(
        `${r} is ${width}x${height} pixels, over the ${MAX_IMAGE_DIMENSION}-pixel side the server previews; uploading the original, not a preview copy`,
      );
      logFeatureSad("bridge_attachment_preview_copy", "over_preview_size", a);
      return;
    }
    let S = y === 0 ? imageDecoder(e) : imageDecoder(e).rotate(y);
    let B = await (
      m === "png"
        ? S.png()
        : S.jpeg({
            quality: PREVIEW_JPEG_QUALITY,
          })
    ).toBuffer();
    if (B.length > MAX_UPLOAD_BYTES) {
      logUploadDebug(
        `the copy of ${r} is ${B.length} bytes, over the ${MAX_UPLOAD_BYTES}-byte limit for a copy; uploading the original`,
      );
      logFeatureSad("bridge_attachment_preview_copy", "copy_over_upload_limit", a);
      return;
    }
    return {
      bytes: B,
      format: m,
    };
  } catch (error) {
    logUploadDebug(`could not make a preview copy of ${r} (${errorMessage(error)}); uploading the original`);
    if (isUnknownImageErrorType(classifyImageErrorCode(error))) logError(error);
    let errnoCode = getErrnoCode(error);
    logFeatureSad(
      "bridge_attachment_preview_copy",
      errnoCode?.startsWith("ERR_IMAGE_") ? errnoCode.toLowerCase() : "convert_failed",
      a,
    );
    return;
  } finally {
    w();
  }
}
//@ chunk-7kpfrhzn.js:11219-11258 fingerprint = debug (1)
function logUploadDebug(msg) {
  logForDebugging(`[brief:upload] ${msg}`);
}
//@ chunk-7kpfrhzn.js:11258-11887 layout
/**
 * 上传前置检查：非 firstParty 提供方、仅必要流量隐私配置、allow_send_file 策略不允许时返回错误。
 */
function checkUploadAllowed(telemetry) {
  if (getAPIProvider() !== "firstParty") {
    logFeatureSad("bridge_attachment_upload", "not_first_party", telemetry);
    return {
      error:
        "upload disabled: uploading file contents to Anthropic servers is not permitted on this API provider",
    };
  }
  if (isEssentialTrafficOnly()) {
    logFeatureSad("bridge_attachment_upload", "essential_traffic", telemetry);
    return {
      error:
        "upload disabled: uploading file contents to Anthropic servers is not permitted under this privacy configuration",
    };
  }
  let r = policyDenyKind("allow_send_file");
  if (r !== null) {
    logOrgPolicyDenied("allow_send_file", "tool");
    logFeatureSad(
      "bridge_attachment_upload",
      r === "org_denied" ? "policy_denied" : `policy_${r}`,
      telemetry,
    );
    return {
      error: "upload disabled: " + policyDeniedReason("allow_send_file", "File upload", "is"),
    };
  }
  return null;
}
//@ chunk-7kpfrhzn.js:11887-11954 fingerprint = getBridgeBaseUrl (1)
function getBridgeBaseUrl() {
  return getBridgeBaseUrlOverride() ?? env.ANTHROPIC_BASE_URL ?? getOauthConfig().BASE_API_URL;
}
//@ chunk-7kpfrhzn.js:11954-12057 layout
async function getUploadAuth(credentials) {
  let r =
    isStorageV5Enabled() && credentials !== undefined
      ? await getBridgeAccessTokenAsync(credentials)
      : getBridgeAccessToken();
  return r
    ? {
        token: r,
      }
    : bridgeHostState().sessionUploadRoute;
}
//@ chunk-7kpfrhzn.js:12057-12118 layout
function getUploadUrl(e) {
  return e.url ?? `${getBridgeBaseUrl()}/api/oauth/file_upload`;
}
//@ chunk-7kpfrhzn.js:12118-12176 layout
/**
 * 没有上传地址且登录被搁置时返回 true，表示需要先恢复登录。
 */
function isBridgeFileLoginRefused(e) {
  return e.url === undefined && isBridgeFileLoginRefused_2(undefined, e.token);
}
//@ chunk-7kpfrhzn.js:12176-12311 layout
function httpStatusFailureCode(status) {
  if (status === 401 || status === 403 || status === 413) return `http_${status}`;
  if (status >= 500) return "http_5xx";
  if (status >= 400) return "http_4xx";
  return "http_other";
}
//@ chunk-7kpfrhzn.js:12311-12440 layout
var uploadSuccessSchema = DoctorLazy(() =>
  u({
    file_uuid: string(),
    file_kind: unknown().optional(),
  }),
);
var uploadTooLargeSchema = DoctorLazy(() =>
  u({
    error: u({
      details: u({
        max_bytes: E().int().positive(),
      }),
    }),
  }),
);
//@ chunk-7kpfrhzn.js:12440-12531 fingerprint = uploadResponseSchema (0.525)
async function uploadResponseSchema(e, r, n, a, h, s) {
  let m = await uploadBuffer(e, r, n, a, h, s);
  return "error" in m ? m : m.file_uuid;
}
//@ chunk-7kpfrhzn.js:19309-19483 placement
async function readBoundedFile({ handle, size }, n) {
  let a = size > n ? undefined : await readHandleBounded(handle, n, Math.max(size, ATTACHMENT_CHUNK_BYTES));
  if (a === undefined || a.overLimit) throw Error("the file is over the size limit");
  return a.bytes;
}
//@ chunk-7kpfrhzn.js:19483-19647 placement
async function withOpenedFile(e, identity, signal, a, waitForTurn) {
  let s = await uploadBridgeAttachment(e, identity, signal);
  try {
    await waitForTurn();
    signal?.throwIfAborted();
    s.size = await isJetBrainsPluginInstalled_2(s.handle);
    return await readBoundedFile(s, a);
  } finally {
    await s.handle.close();
  }
}
//@ chunk-7kpfrhzn.js:19647-19800 placement
function timestampedFileName(e) {
  let r = extname(e);
  let n = r ? e.slice(0, -r.length) : e;
  let sliced = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  return `${n}-${sliced}-${randomUUID().slice(0, 4)}${r}`;
}
//@ chunk-7kpfrhzn.js:19800-19814 layout
/**
 * 读取图片头部判断尺寸时最多读 512 KiB（避免整文件读入）。
 */
var IMAGE_HEAD_BYTES = 524288;
//@ chunk-7kpfrhzn.js:19814-20100 layout
async function readAndScaleImage(e, r, signal) {
  if (!hasKnownImageType(r) || e.size > MAX_UPLOAD_BYTES) return;
  try {
    let { bytes } = await readHandleBounded(e.handle, Math.min(e.size, IMAGE_HEAD_BYTES));
    if (!isOversizeImage(bytes)) return;
    let h = bytes.length === e.size ? bytes : (await readHandleBounded(e.handle, e.size)).bytes;
    return await maybeScaleImage(h, r, MAX_UPLOAD_BYTES, signal);
  } catch (error) {
    logUploadDebug(`could not read ${e.size} bytes to scale an image: ${error}`);
    return;
  }
}
//@ chunk-7kpfrhzn.js:20100-20545 layout
async function uploadScaledImage(e, filename, n, a, h) {
  let s = guessMimeType(filename);
  let m = await uploadWithResends(
    (telemetry, S) =>
      isZodVersionCompatible()
        ? uploadStreamWithAuth(
            bufferMultipartBody(e.buffer, filename, s),
            e.buffer.length,
            filename,
            n,
            telemetry,
            S,
          )
        : uploadBuffer(e.buffer, filename, s, n.signal, telemetry, n.credentials, S),
    {
      filename,
      size: e.buffer.length,
    },
    h,
    n.signal,
    {
      ...a,
      image_scaled: true,
    },
  );
  if ("error" in m) return m;
  let { width, height, originalWidth, originalHeight } = e;
  logUploadDebug(`sent ${filename} scaled to ${width}x${height} from ${originalWidth}x${originalHeight}`);
  return {
    file_uuid: m.file_uuid,
    scaled: {
      width,
      height,
      original_width: originalWidth,
      original_height: originalHeight,
    },
  };
}
//@ chunk-7kpfrhzn.js:20545-23135 callgraph-witnessed = uploadBriefAttachment (0.164)
/**
 * 上传 Brief 附件到 Anthropic 文件存储：策略/提供方检查（仅 firstParty、非仅必要流量、allow_send_file 策略），取 OAuth 凭证，等待轮次，按大小选择缓冲上传（可生成预览副本或缩放图）或流式上传，支持有限次重发与服务器上限记忆，返回 file_uuid 或错误。
 */
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
    server_max_known: getKnownServerUploadLimit() !== undefined,
  };
  let h = checkUploadAllowed(a);
  if (h) {
    logUploadDebug(`skip ${fullPath}: policy/provider gate denied`);
    return h;
  }
  if (ctx.signal?.aborted) {
    logFeatureSad("bridge_attachment_upload", "aborted", a);
    return {
      error: "upload aborted",
    };
  }
  if (!(await getUploadAuth(ctx.credentials))) {
    logUploadDebug("skip: no oauth token");
    logFeatureSad("bridge_attachment_upload", "no_token", a);
    return {
      error: "upload failed: no OAuth token available",
    };
  }
  let filename = ctx.filename ?? basename(fullPath);
  let { resendMaxMiB = 0 } = ctx;
  let y = {
    made: 0,
    max: Number.isInteger(ctx.maxPosts) ? Math.min(Math.max(ctx.maxPosts, 1), MAX_UPLOAD_POSTS) : 1,
    resendMaxBytes: Math.max(Number.isFinite(resendMaxMiB) ? resendMaxMiB * MIB : 0, MIN_RESEND_MAX_BYTES),
    firstAtMs: undefined,
    clock: ctx.clock ?? systemClock,
  };
  if (y.max > 2)
    a = {
      ...a,
      max_posts: y.max,
    };
  let w =
    !ctx.originalsOnly &&
    !ctx.noPreviewCopies &&
    PREVIEW_COPY_FORMAT_BY_EXT[extname(filename).toLowerCase()] !== undefined;
  let b = size <= MAX_UPLOAD_BYTES;
  let token = isZodVersionCompatible();
  if (w && !b && token) logFeatureSad("bridge_attachment_preview_copy", "original_over_copy_limit", a);
  let A = !token || size <= SMALL_UPLOAD_BYTES || (w && b);
  if (A && !b) {
    logUploadDebug(`skip ${fullPath}: ${size} bytes exceeds ${MAX_UPLOAD_BYTES} limit`);
    logFeatureSad("bridge_attachment_upload", "too_large", a);
    return {
      error: formatUploadLimitError(size, MAX_UPLOAD_BYTES),
    };
  }
  let S;
  try {
    S = await uploadBridgeAttachment(fullPath, ctx.identity, ctx.signal);
  } catch (error) {
    logUploadDebug(`open failed for ${fullPath}: ${error}`);
    let v = ctx.signal?.aborted === true;
    logFeatureSad("bridge_attachment_upload", v ? "aborted" : "read_failed", a);
    return {
      error: v ? "upload aborted" : `upload failed: could not read file (${errorMessage(error)})`,
    };
  }
  try {
    await ctx.waitForTurn();
    let baseUrl = getKnownServerUploadLimit();
    a = {
      ...a,
      server_max_known: baseUrl !== undefined,
    };
    let filename_2 = checkUploadAllowed(a);
    if (filename_2) {
      logUploadDebug(`skip ${fullPath}: policy/provider gate denied after the wait for a turn`);
      return filename_2;
    }
    if (ctx.signal?.aborted) {
      logFeatureSad("bridge_attachment_upload", "aborted", a);
      return {
        error: "upload aborted",
      };
    }
    let L;
    try {
      S.size = await isJetBrainsPluginInstalled_2(S.handle);
      if (A) L = await readBoundedFile(S, MAX_UPLOAD_BYTES);
    } catch (error) {
      logUploadDebug(`read failed for ${fullPath}: ${error}`);
      logFeatureSad("bridge_attachment_upload", "read_failed", a);
      return {
        error: `upload failed: could not read file (${errorMessage(error)})`,
      };
    }
    if (L !== undefined) return await uploadWithPreviewCopy(L, filename, ctx, a, y);
    let min = Math.min(PEER_FILE_TRANSFER_SERVER_LIMIT, baseUrl ?? PEER_FILE_TRANSFER_SERVER_LIMIT);
    if (S.size > min) {
      logUploadDebug(
        `skip ${fullPath}: ${S.size} bytes exceeds the ${min} limit ${min === baseUrl ? "the store reported" : "of this client"}`,
      );
      logFeatureSad("bridge_attachment_upload", "too_large", a);
      return {
        error: formatUploadLimitError(S.size, min),
      };
    }
    let F =
      ctx.originalsOnly || ctx.noScaledCopies
        ? undefined
        : await readAndScaleImage(S, guessMimeType(filename), ctx.signal);
    if (F !== undefined) return await uploadScaledImage(F, filename, ctx, a, y);
    let x = false;
    let P = await uploadWithResends(
      (telemetry, M) => {
        x = false;
        return uploadStreamWithAuth(
          streamMultipartBody(S.handle, S.size, filename, guessMimeType(filename)),
          S.size,
          filename,
          ctx,
          telemetry,
          (fe, xe, ce, pe) => {
            x = isResendableFailure(fe, ce, pe);
            M(fe, xe, ce, pe);
          },
        );
      },
      {
        filename,
        size: S.size,
      },
      y,
      ctx.signal,
      a,
    );
    if (!("error" in P))
      return {
        file_uuid: P.file_uuid,
      };
    if (!x || !isTransientUploadFailure(P.error, P.errorCode)) return P;
    let j = getKnownServerUploadLimit() ?? baseUrl;
    if (j !== undefined)
      return S.size > j
        ? {
            error: formatUploadLimitError(S.size, j),
          }
        : P;
    return S.size > SUSPECTED_UPLOAD_LIMIT_BYTES
      ? {
          ...P,
          suspectedLimitBytes: SUSPECTED_UPLOAD_LIMIT_BYTES,
        }
      : P;
  } finally {
    await S.handle.close().catch((error) => {
      logUploadDebug(`close failed for ${fullPath}: ${error}`);
    });
  }
}
//@ chunk-7kpfrhzn.js:23135-23236 layout
function isResendableFailure(e, r, n) {
  return e === "http_5xx"
    ? r !== "any_post" && r !== "reason_not_temporary"
    : n !== undefined && n > RESEND_WINDOW_PER_POST_MS;
}
//@ chunk-7kpfrhzn.js:23236-23334 placement
function getKnownServerUploadLimit() {
  let uploadLimitTold = bridgeHostState().uploadLimitTold;
  return uploadLimitTold !== undefined && Date.now() - uploadLimitTold.atMs < UPLOAD_LIMIT_MEMORY_MS
    ? uploadLimitTold.maxBytes
    : undefined;
}
//@ chunk-7kpfrhzn.js:23334-24341 placement
/**
 * 先传预览副本，失败再传原件
 */
async function uploadWithPreviewCopy(e, r, ctx, a, h) {
  let s =
    ctx.originalsOnly || ctx.noPreviewCopies
      ? undefined
      : await makePreviewCopy(e, r, ctx.signal, a, ctx.copyLock);
  if (s !== undefined) {
    let w;
    let b;
    let U;
    countUploadPost(h);
    let A = await uploadBuffer(
      s.bytes,
      `${basename(r, extname(r))}.${s.format === "png" ? "png" : "jpg"}`,
      "application/octet-stream",
      ctx.signal,
      a,
      ctx.credentials,
      (S, B, v) => {
        w = S;
        b = B;
        U = v;
      },
    );
    if (!("error" in A)) {
      let S = A.file_kind === "image";
      if (S) logFeatureOk("bridge_attachment_preview_copy", a);
      else logFeatureSad("bridge_attachment_preview_copy", "no_preview", a);
      return {
        file_uuid: A.file_uuid,
        copy: {
          isImage: S,
          mediaType: s.format === "png" ? "image/png" : "image/jpeg",
        },
      };
    }
    if (w === undefined || !RESENDABLE_ERROR_CODES_SET.has(w) || (h.max > 1 && U === "any_post")) {
      if (w !== undefined) logUploadFailure(w, a, b);
      return A;
    }
    logUploadDebug(`upload of the copy of ${r} failed (${w}); uploading the original`);
    logFeatureSad("bridge_attachment_preview_copy", `upload_failed_${w}`, a);
  }
  let m =
    ctx.originalsOnly || ctx.noScaledCopies
      ? undefined
      : await maybeScaleImage(e, guessMimeType(r), MAX_UPLOAD_BYTES, ctx.signal);
  if (m !== undefined) return uploadScaledImage(m, r, ctx, a, h);
  let y = await uploadWithResends(
    (w, b) => uploadBuffer(e, r, guessMimeType(r), ctx.signal, w, ctx.credentials, b),
    {
      filename: r,
      size: e.length,
    },
    h,
    ctx.signal,
    a,
  );
  return "error" in y
    ? y
    : {
        file_uuid: y.file_uuid,
      };
}
//@ chunk-7kpfrhzn.js:24341-24572 placement
async function uploadStreamWithAuth(e, r, filename, a, telemetry, s) {
  let uploadAuth = await getUploadAuth(a.credentials);
  if (!uploadAuth) {
    logUploadDebug("skip: no oauth token");
    s("no_token");
    return {
      error: "upload failed: no OAuth token available",
    };
  }
  return uploadStream(e, r, uploadAuth, {
    filename,
    signal: a.signal,
    telemetry,
    logSad: s,
  });
}
//@ chunk-7kpfrhzn.js:24572-25343 placement
async function uploadStream(e, r, uploadAuth, { filename, signal, telemetry, logSad }) {
  let y = checkUploadAllowed(telemetry);
  if (y) {
    logUploadDebug(`skip ${filename}: policy/provider gate denied`);
    return y;
  }
  if (isBridgeFileLoginRefused(uploadAuth)) {
    logSad("stored_login_refused");
    return {
      error: new StoredLoginHeldBackError(storedLoginRefusalReason()).message,
    };
  }
  let w = uploadStreamWithProgress(e.slices, e.contentLength, {
    signal,
  });
  try {
    let b = await axios_default.post(getUploadUrl(uploadAuth), w.body, {
      headers: buildUploadHeaders(uploadAuth.token, e.boundary, e.contentLength, telemetry.upload_lane),
      timeout: 0,
      signal: w.signal,
      validateStatus: () => true,
      maxRedirects: 0,
    });
    return handleUploadResponse(b, filename, r, telemetry, logSad);
  } catch (error) {
    logUploadDebug(`upload threw for ${filename}: ${error}`);
    let U = uploadAbortError(error, w, signal?.aborted === true);
    logSad(
      U.code,
      undefined,
      U.code === "network_error" && NON_TEMPORARY_ERRNOS.has(getErrnoCode(error))
        ? "cause_not_temporary"
        : undefined,
      w.seen().bytes_handed,
    );
    return {
      error: U.error,
    };
  } finally {
    w.dispose();
    w.body.on("error", () => {});
    w.body.destroy(Error("the upload has already been answered"));
    await e.finished();
  }
}
//@ chunk-7kpfrhzn.js:25343-26073 placement
/**
 * 上传中止/停滞的错误描述
 */
function uploadAbortError(error, r, n) {
  if (n)
    return {
      code: "aborted",
      error: "upload aborted",
    };
  let reason = r.signal.reason;
  if (reason instanceof UploadStalledError) {
    let m = r.seen();
    let rounded = Math.round(reason.waitedMs / 1000);
    return {
      code: "stalled",
      error:
        m.bytes_handed === m.body_bytes
          ? `upload failed: the server did not answer within ${rounded} seconds of receiving the file`
          : `upload failed: the transfer stalled (nothing moved for ${rounded} seconds)`,
    };
  }
  let inCauseChain = findInCauseChain(error, (m) => m instanceof UploadSourceError);
  if (inCauseChain)
    return {
      code: "read_failed",
      error: `upload failed: ${inCauseChain.message}`,
    };
  let errnoCode = getErrnoCode(error);
  if (errnoCode === "ECONNRESET" || errnoCode === "EPIPE" || errnoCode === "ERR_STREAM_PREMATURE_CLOSE")
    return {
      code: "connection_lost",
      error: "upload failed: the connection closed before the server answered",
    };
  return {
    code: "network_error",
    error: `upload failed: network error (${errorMessage(error)})`,
  };
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
  isBridgeFileLoginRefused,
  multipartParts,
  UPLOAD_TIMEOUT_MS,
  getUploadUrl,
  NON_TEMPORARY_ERRNOS,
  MIN_RESEND_MAX_BYTES,
  RESEND_DEADLINE_LONG_MS,
  RESEND_DEADLINE_MS,
  RESEND_COOLDOWN_MS,
  MAX_CONCURRENT_RESENDS,
  BACKOFF_BASE_MS,
  BACKOFF_FLOOR_MS,
  RESENDABLE_FAILURE_CODES,
  getKnownServerUploadLimit,
  isResendableFailure,
  BRIEF_UPLOAD_LIMITS,
  formatMiB,
  UPLOAD_FILENAME_RE,
  normalizeUploadFileName,
  withOpenedFile,
  timestampedFileName,
};
