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
import { sniffImageMediaType } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
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
import { objectSchema, stringSchema, unknown, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
function normalizeUploadFileName(fileName) {
  return (
    fileName
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
function imageMimeToFormat(mediaType) {
  switch (mediaType) {
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
function hasKnownImageType(mediaType) {
  return imageMimeToFormat(mediaType) !== undefined;
}
//@ chunk-7kpfrhzn.js:4768-4839 placement
function isOversizeImage(buffer) {
  let webpHeader = parseWebpHeader(buffer);
  return (
    webpHeader !== undefined &&
    (webpHeader.width > MAX_IMAGE_DIMENSION || webpHeader.height > MAX_IMAGE_DIMENSION)
  );
}
//@ chunk-7kpfrhzn.js:4839-5052 placement
async function maybeScaleImage(buffer, mediaType, maxBytes, signal) {
  let format = imageMimeToFormat(mediaType);
  if (format === undefined || isAnimatedWebp(buffer)) return;
  let webpHeader = parseWebpHeader(buffer);
  if (
    webpHeader === undefined ||
    !isOversizeImage(buffer) ||
    webpHeader.width * webpHeader.height > MAX_IMAGE_PIXELS
  )
    return;
  let releaseLock = await bridgeHostState().imageScaleLock.acquire();
  try {
    return await scaleOversizeImage(buffer, format, maxBytes, signal);
  } finally {
    releaseLock();
  }
}
//@ chunk-7kpfrhzn.js:5052-5517 placement
async function scaleOversizeImage(buffer, format, maxBytes, signal) {
  if (signal?.aborted) return;
  try {
    let imageDecoder = await loadImageDecoder();
    let metadata = await imageDecoder(buffer).metadata();
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) return;
    let scaled = await imageDecoder(buffer)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      [format]()
      .toBuffer();
    let webpHeader = parseWebpHeader(scaled);
    if (webpHeader === undefined || isOversizeImage(scaled) || scaled.length > maxBytes) return;
    return {
      buffer: scaled,
      width: webpHeader.width,
      height: webpHeader.height,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
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
function escapeMultipartFilename(fileName) {
  return fileName
    .replace(/[\r\n]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
}
//@ chunk-7kpfrhzn.js:5647-5870 placement
function multipartParts(fileName, mediaType) {
  let boundary = `----FormBoundary${randomUUID()}`;
  return {
    boundary,
    head: Buffer.from(`--${boundary}\r
Content-Disposition: form-data; name="file"; filename="${escapeMultipartFilename(fileName)}"\r
Content-Type: ${mediaType}\r
\r
`),
    tail: Buffer.from(`\r
--${boundary}--\r
`),
  };
}
//@ chunk-7kpfrhzn.js:5870-5951 placement
class UploadSourceError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "UploadSourceError";
  }
}
//@ chunk-7kpfrhzn.js:5951-6200 placement
function bufferMultipartBody(buffer, fileName, mediaType) {
  let { boundary, head, tail } = multipartParts(fileName, mediaType);
  async function* slices() {
    yield head;
    for (let offset = 0; offset < buffer.length; offset += UPLOAD_CHUNK_BYTES)
      yield buffer.subarray(offset, offset + UPLOAD_CHUNK_BYTES);
    yield tail;
  }
  return {
    boundary,
    contentLength: head.length + buffer.length + tail.length,
    slices: slices(),
    finished: () => Promise.resolve(),
  };
}
//@ chunk-7kpfrhzn.js:6200-6748 placement
function streamMultipartBody(handle, totalBytes, fileName, mediaType) {
  let { boundary, head, tail } = multipartParts(fileName, mediaType);
  let started = false;
  let markFinished = () => {};
  let promise = new Promise((resolve) => {
    markFinished = resolve;
  });
  async function* slices() {
    started = true;
    try {
      yield head;
      let offset = 0;
      while (offset < totalBytes) {
        let chunk = Buffer.allocUnsafe(Math.min(UPLOAD_CHUNK_BYTES, totalBytes - offset));
        let bytesRead;
        try {
          bytesRead = (await handle.read(chunk, 0, chunk.length, offset)).bytesRead;
        } catch (error) {
          throw new UploadSourceError(`could not read file (${errorMessage(error)})`, {
            cause: error,
          });
        }
        if (bytesRead === 0)
          throw new UploadSourceError("the file became shorter while it was being uploaded");
        offset += bytesRead;
        yield bytesRead === chunk.length ? chunk : chunk.subarray(0, bytesRead);
      }
      yield tail;
    } finally {
      markFinished();
    }
  }
  return {
    boundary,
    contentLength: head.length + totalBytes + tail.length,
    slices: slices(),
    finished: () => (started ? promise : Promise.resolve()),
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
function formatMiB(bytes) {
  return `${(bytes / MIB).toFixed(1)} MiB`;
}
//@ chunk-7kpfrhzn.js:6846-6970 layout
function formatUploadLimitError(size, limit) {
  if (limit === undefined) return `${formatMiB(size)} exceeds the upload limit`;
  return `${formatMiB(size)} exceeds the ${formatMiB_2(limit)} upload limit`;
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
function hasAuxiliaryAlphaImage(text) {
  return (
    text.includes("urn:mpeg:hevc:2015:auxid:1") ||
    text.includes("urn:mpeg:avc:2015:auxid:1") ||
    text.includes("urn:mpeg:mpegB:cicp:systems:auxiliary:alpha")
  );
}
//@ chunk-7kpfrhzn.js:7671-8139 layout
function isTruncatedBmp(buffer) {
  if (buffer.length < 30 || buffer[0] !== 66 || buffer[1] !== 77) return false;
  let uInt32LE = buffer.readUInt32LE(14);
  let isCoreHeader = uInt32LE === 12;
  if (!isCoreHeader && (uInt32LE < 40 || uInt32LE === 64 || buffer.length < 34)) return false;
  let width = Math.abs(isCoreHeader ? buffer.readUInt16LE(18) : buffer.readInt32LE(18));
  let height = Math.abs(isCoreHeader ? buffer.readUInt16LE(20) : buffer.readInt32LE(22));
  let uInt16LE = buffer.readUInt16LE(isCoreHeader ? 24 : 28);
  let compression = isCoreHeader ? 0 : buffer.readUInt32LE(30);
  let availableBytes = buffer.length - buffer.readUInt32LE(10);
  if (compression === 1 || compression === 2) return width * height > 127.5 * availableBytes;
  if (compression !== 0 && compression !== 3 && compression !== 6) return false;
  let rowBytes = Math.floor((width * uInt16LE + 31) / 32) * 4;
  let lastRowBits = Math.ceil((width * uInt16LE) / 8);
  return height > 0 && rowBytes * (height - 1) + lastRowBits > availableBytes;
}
//@ chunk-7kpfrhzn.js:8139-8445 layout
function readIsoBmffBoxes(buffer, start, end, filterType) {
  let boxes = [];
  let offset = start;
  while (offset + 8 <= end) {
    let uInt32BE = buffer.readUInt32BE(offset);
    let headerSize = 8;
    if (uInt32BE === 1) {
      if (offset + 16 > end) break;
      uInt32BE = Number(buffer.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (uInt32BE === 0) uInt32BE = end - offset;
    if (uInt32BE < headerSize || offset + uInt32BE > end) break;
    let box = {
      type: buffer.toString("latin1", offset + 4, offset + 8),
      start: offset + headerSize,
      end: offset + uInt32BE,
    };
    if (filterType === undefined) boxes.push(box);
    else if (box.type === filterType) return [box];
    offset += uInt32BE;
  }
  return boxes;
}
//@ chunk-7kpfrhzn.js:8445-9348 layout
function readHeifPrimaryItemTransform(buffer) {
  let [metaBox] = readIsoBmffBoxes(buffer, 0, buffer.length, "meta");
  if (metaBox === undefined) return;
  let [pitmBox] = readIsoBmffBoxes(buffer, metaBox.start + 4, metaBox.end, "pitm");
  let [iprpBox] = readIsoBmffBoxes(buffer, metaBox.start + 4, metaBox.end, "iprp");
  if (pitmBox === undefined || iprpBox === undefined) return;
  let isSmallItemId = buffer[pitmBox.start] === 0;
  if (pitmBox.start + (isSmallItemId ? 6 : 8) > pitmBox.end) return;
  let primaryItemId = isSmallItemId
    ? buffer.readUInt16BE(pitmBox.start + 4)
    : buffer.readUInt32BE(pitmBox.start + 4);
  let [ipcoBox] = readIsoBmffBoxes(buffer, iprpBox.start, iprpBox.end, "ipco");
  let [ipmaBox] = readIsoBmffBoxes(buffer, iprpBox.start, iprpBox.end, "ipma");
  if (ipcoBox === undefined || ipmaBox === undefined) return;
  let isoBmffBoxes = readIsoBmffBoxes(buffer, ipcoBox.start, ipcoBox.end);
  let version = buffer[ipmaBox.start];
  let hasFlags = (buffer[ipmaBox.start + 3] & 1) === 1;
  let itemIdSize = version < 1 ? 2 : 4;
  let associationSize = hasFlags ? 2 : 1;
  let pos = ipmaBox.start + 4;
  if (pos + 4 > ipmaBox.end) return;
  let uInt32BE = buffer.readUInt32BE(pos);
  pos += 4;
  let clockwise = 0;
  let mirrored = false;
  for (let idx = 0; idx < uInt32BE; idx++) {
    if (pos + itemIdSize + 1 > ipmaBox.end) return;
    let itemId = itemIdSize === 2 ? buffer.readUInt16BE(pos) : buffer.readUInt32BE(pos);
    let associationCount = buffer[pos + itemIdSize];
    pos += itemIdSize + 1;
    for (let assocIdx = 0; assocIdx < associationCount; assocIdx++) {
      if (pos + associationSize > ipmaBox.end) return;
      let propertyIndex = associationSize === 2 ? buffer.readUInt16BE(pos) & 32767 : buffer[pos] & 127;
      pos += associationSize;
      if (itemId !== primaryItemId || propertyIndex === 0) continue;
      let propertyBox = isoBmffBoxes[propertyIndex - 1];
      if (propertyBox === undefined) return;
      if (propertyBox.type === "imir") mirrored = true;
      else if (propertyBox.type === "irot" && propertyBox.start < propertyBox.end)
        clockwise = ((4 - (buffer[propertyBox.start] & 3)) % 4) * 90;
    }
  }
  return {
    clockwise,
    mirrored,
  };
}
//@ chunk-7kpfrhzn.js:9348-9663 layout
function isMultiPageTiff(bytes) {
  if (bytes.length < 8) return false;
  let isLittleEndian = bytes[0] === 73 && bytes[1] === 73;
  if (!isLittleEndian && !(bytes[0] === 77 && bytes[1] === 77)) return false;
  let dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dataView.getUint16(2, isLittleEndian) !== 42) return false;
  let uint32 = dataView.getUint32(4, isLittleEndian);
  if (uint32 + 2 > bytes.length) return false;
  let secondIfdOffset = uint32 + 2 + dataView.getUint16(uint32, isLittleEndian) * 12;
  return secondIfdOffset + 4 <= bytes.length && dataView.getUint32(secondIfdOffset, isLittleEndian) !== 0;
}
//@ chunk-7kpfrhzn.js:9663-11219 layout
/**
 * 为 bmp/tiff/heic/heif/avif 等生成 png/jpeg 预览副本；多页 TIFF、截断 BMP、旋转/镜像 HEIF、超尺寸等情况放弃并上传原文件。
 */
async function makePreviewCopy(bytes, filePath, signal, telemetry, copyLock) {
  let copyFormat = PREVIEW_COPY_FORMAT_BY_EXT[extname(filePath).toLowerCase()];
  if (bytes.length === 0 || copyFormat === undefined || sniffImageMediaType(bytes) !== null) return;
  let outputFormat = copyFormat === "jpeg" && hasAuxiliaryAlphaImage(bytes) ? "png" : copyFormat;
  if (isMultiPageTiff(bytes)) {
    logFeatureSad("bridge_attachment_preview_copy", "multi_page", telemetry);
    return;
  }
  if (isTruncatedBmp(bytes)) {
    logFeatureSad("bridge_attachment_preview_copy", "truncated", telemetry);
    return;
  }
  let rotationDegrees = 0;
  if (bytes.toString("latin1", 4, 8) === "ftyp") {
    let [ftypBox] = readIsoBmffBoxes(bytes, 0, bytes.length, "ftyp");
    let brandString =
      ftypBox === undefined
        ? ""
        : bytes.toString("latin1", ftypBox.start, Math.min(ftypBox.start + 4, ftypBox.end)) +
          bytes.toString("latin1", ftypBox.start + 8, ftypBox.end);
    let matches = /avi[fs]/.test(brandString);
    let transform;
    try {
      transform = readHeifPrimaryItemTransform(bytes);
    } catch {
      transform = undefined;
    }
    if (
      transform === undefined ||
      transform.mirrored ||
      (transform.clockwise !== 0 && (matches || getPlatform() !== "macos"))
    ) {
      logFeatureSad(
        "bridge_attachment_preview_copy",
        transform === undefined ? "unreadable_properties" : "turned_or_mirrored",
        telemetry,
      );
      return;
    }
    rotationDegrees = transform.clockwise;
  }
  if (signal?.aborted) return;
  let releaseCopyLock = await copyLock.acquire();
  try {
    if (signal?.aborted) return;
    let imageDecoder = await loadImageDecoder();
    let { width, height } = await imageDecoder(bytes).metadata();
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      logUploadDebug(
        `${filePath} is ${width}x${height} pixels, over the ${MAX_IMAGE_DIMENSION}-pixel side the server previews; uploading the original, not a preview copy`,
      );
      logFeatureSad("bridge_attachment_preview_copy", "over_preview_size", telemetry);
      return;
    }
    let pipeline = rotationDegrees === 0 ? imageDecoder(bytes) : imageDecoder(bytes).rotate(rotationDegrees);
    let copyBytes = await (
      outputFormat === "png"
        ? pipeline.png()
        : pipeline.jpeg({
            quality: PREVIEW_JPEG_QUALITY,
          })
    ).toBuffer();
    if (copyBytes.length > MAX_UPLOAD_BYTES) {
      logUploadDebug(
        `the copy of ${filePath} is ${copyBytes.length} bytes, over the ${MAX_UPLOAD_BYTES}-byte limit for a copy; uploading the original`,
      );
      logFeatureSad("bridge_attachment_preview_copy", "copy_over_upload_limit", telemetry);
      return;
    }
    return {
      bytes: copyBytes,
      format: outputFormat,
    };
  } catch (error) {
    logUploadDebug(
      `could not make a preview copy of ${filePath} (${errorMessage(error)}); uploading the original`,
    );
    if (isUnknownImageErrorType(classifyImageErrorCode(error))) logError(error);
    let errnoCode = getErrnoCode(error);
    logFeatureSad(
      "bridge_attachment_preview_copy",
      errnoCode?.startsWith("ERR_IMAGE_") ? errnoCode.toLowerCase() : "convert_failed",
      telemetry,
    );
    return;
  } finally {
    releaseCopyLock();
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
function checkUploadAllowed(props) {
  if (getAPIProvider() !== "firstParty") {
    logFeatureSad("bridge_attachment_upload", "not_first_party", props);
    return {
      error:
        "upload disabled: uploading file contents to Anthropic servers is not permitted on this API provider",
    };
  }
  if (isEssentialTrafficOnly()) {
    logFeatureSad("bridge_attachment_upload", "essential_traffic", props);
    return {
      error:
        "upload disabled: uploading file contents to Anthropic servers is not permitted under this privacy configuration",
    };
  }
  let denyKind = policyDenyKind("allow_send_file");
  if (denyKind !== null) {
    logOrgPolicyDenied("allow_send_file", "tool");
    logFeatureSad(
      "bridge_attachment_upload",
      denyKind === "org_denied" ? "policy_denied" : `policy_${denyKind}`,
      props,
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
  let accessToken =
    isStorageV5Enabled() && credentials !== undefined
      ? await getBridgeAccessTokenAsync(credentials)
      : getBridgeAccessToken();
  return accessToken
    ? {
        token: accessToken,
      }
    : bridgeHostState().sessionUploadRoute;
}
//@ chunk-7kpfrhzn.js:12057-12118 layout
function getUploadUrl(route) {
  return route.url ?? `${getBridgeBaseUrl()}/api/oauth/file_upload`;
}
//@ chunk-7kpfrhzn.js:12118-12176 layout
/**
 * 没有上传地址且登录被搁置时返回 true，表示需要先恢复登录。
 */
function isBridgeFileLoginRefused(route) {
  return route.url === undefined && isBridgeFileLoginRefused_2(undefined, route.token);
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
  objectSchema({
    file_uuid: stringSchema(),
    file_kind: unknown().optional(),
  }),
);
var uploadTooLargeSchema = DoctorLazy(() =>
  objectSchema({
    error: objectSchema({
      details: objectSchema({
        max_bytes: numberSchema().int().positive(),
      }),
    }),
  }),
);
//@ chunk-7kpfrhzn.js:12440-12531 fingerprint = uploadResponseSchema (0.525)
async function uploadResponseSchema(buffer, filename, mimeType, signal, telemetry, credentials) {
  let uploadResult = await uploadBuffer(buffer, filename, mimeType, signal, telemetry, credentials);
  return "error" in uploadResult ? uploadResult : uploadResult.file_uuid;
}
//@ chunk-7kpfrhzn.js:19309-19483 placement
async function readBoundedFile({ handle, size }, maxBytes) {
  let readResult =
    size > maxBytes
      ? undefined
      : await readHandleBounded(handle, maxBytes, Math.max(size, ATTACHMENT_CHUNK_BYTES));
  if (readResult === undefined || readResult.overLimit) throw Error("the file is over the size limit");
  return readResult.bytes;
}
//@ chunk-7kpfrhzn.js:19483-19647 placement
async function withOpenedFile(fullPath, approvedIdentity, options, maxBytes, waitForTurn) {
  let uploadSource = await uploadBridgeAttachment(fullPath, approvedIdentity, options);
  try {
    await waitForTurn();
    options?.throwIfAborted();
    uploadSource.size = await isJetBrainsPluginInstalled_2(uploadSource.handle);
    return await readBoundedFile(uploadSource, maxBytes);
  } finally {
    await uploadSource.handle.close();
  }
}
//@ chunk-7kpfrhzn.js:19647-19800 placement
function timestampedFileName(fileName) {
  let extension = extname(fileName);
  let nameStem = extension ? fileName.slice(0, -extension.length) : fileName;
  let sliced = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  return `${nameStem}-${sliced}-${randomUUID().slice(0, 4)}${extension}`;
}
//@ chunk-7kpfrhzn.js:19800-19814 layout
/**
 * 读取图片头部判断尺寸时最多读 512 KiB（避免整文件读入）。
 */
var IMAGE_HEAD_BYTES = 524288;
//@ chunk-7kpfrhzn.js:19814-20100 layout
async function readAndScaleImage(source, mimeType, signal) {
  if (!hasKnownImageType(mimeType) || source.size > MAX_UPLOAD_BYTES) return;
  try {
    let { bytes } = await readHandleBounded(source.handle, Math.min(source.size, IMAGE_HEAD_BYTES));
    if (!isOversizeImage(bytes)) return;
    let imageBytes =
      bytes.length === source.size ? bytes : (await readHandleBounded(source.handle, source.size)).bytes;
    return await maybeScaleImage(imageBytes, mimeType, MAX_UPLOAD_BYTES, signal);
  } catch (error) {
    logUploadDebug(`could not read ${source.size} bytes to scale an image: ${error}`);
    return;
  }
}
//@ chunk-7kpfrhzn.js:20100-20545 layout
async function uploadScaledImage(scaledImage, filename, ctx, telemetryFields, postState) {
  let mimeType = guessMimeType(filename);
  let uploadResult = await uploadWithResends(
    (telemetry, reportProgress) =>
      isZodVersionCompatible()
        ? uploadStreamWithAuth(
            bufferMultipartBody(scaledImage.buffer, filename, mimeType),
            scaledImage.buffer.length,
            filename,
            ctx,
            telemetry,
            reportProgress,
          )
        : uploadBuffer(
            scaledImage.buffer,
            filename,
            mimeType,
            ctx.signal,
            telemetry,
            ctx.credentials,
            reportProgress,
          ),
    {
      filename,
      size: scaledImage.buffer.length,
    },
    postState,
    ctx.signal,
    {
      ...telemetryFields,
      image_scaled: true,
    },
  );
  if ("error" in uploadResult) return uploadResult;
  let { width, height, originalWidth, originalHeight } = scaledImage;
  logUploadDebug(`sent ${filename} scaled to ${width}x${height} from ${originalWidth}x${originalHeight}`);
  return {
    file_uuid: uploadResult.file_uuid,
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
  let telemetryFields = {
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
  let gateError = checkUploadAllowed(telemetryFields);
  if (gateError) {
    logUploadDebug(`skip ${fullPath}: policy/provider gate denied`);
    return gateError;
  }
  if (ctx.signal?.aborted) {
    logFeatureSad("bridge_attachment_upload", "aborted", telemetryFields);
    return {
      error: "upload aborted",
    };
  }
  if (!(await getUploadAuth(ctx.credentials))) {
    logUploadDebug("skip: no oauth token");
    logFeatureSad("bridge_attachment_upload", "no_token", telemetryFields);
    return {
      error: "upload failed: no OAuth token available",
    };
  }
  let filename = ctx.filename ?? basename(fullPath);
  let { resendMaxMiB = 0 } = ctx;
  let postState = {
    made: 0,
    max: Number.isInteger(ctx.maxPosts) ? Math.min(Math.max(ctx.maxPosts, 1), MAX_UPLOAD_POSTS) : 1,
    resendMaxBytes: Math.max(Number.isFinite(resendMaxMiB) ? resendMaxMiB * MIB : 0, MIN_RESEND_MAX_BYTES),
    firstAtMs: undefined,
    clock: ctx.clock ?? systemClock,
  };
  if (postState.max > 2)
    telemetryFields = {
      ...telemetryFields,
      max_posts: postState.max,
    };
  let wantsPreviewCopy =
    !ctx.originalsOnly &&
    !ctx.noPreviewCopies &&
    PREVIEW_COPY_FORMAT_BY_EXT[extname(filename).toLowerCase()] !== undefined;
  let underCopyLimit = size <= MAX_UPLOAD_BYTES;
  let token = isZodVersionCompatible();
  if (wantsPreviewCopy && !underCopyLimit && token)
    logFeatureSad("bridge_attachment_preview_copy", "original_over_copy_limit", telemetryFields);
  let canBufferWholeFile = !token || size <= SMALL_UPLOAD_BYTES || (wantsPreviewCopy && underCopyLimit);
  if (canBufferWholeFile && !underCopyLimit) {
    logUploadDebug(`skip ${fullPath}: ${size} bytes exceeds ${MAX_UPLOAD_BYTES} limit`);
    logFeatureSad("bridge_attachment_upload", "too_large", telemetryFields);
    return {
      error: formatUploadLimitError(size, MAX_UPLOAD_BYTES),
    };
  }
  let source;
  try {
    source = await uploadBridgeAttachment(fullPath, ctx.identity, ctx.signal);
  } catch (error) {
    logUploadDebug(`open failed for ${fullPath}: ${error}`);
    let wasAborted = ctx.signal?.aborted === true;
    logFeatureSad("bridge_attachment_upload", wasAborted ? "aborted" : "read_failed", telemetryFields);
    return {
      error: wasAborted ? "upload aborted" : `upload failed: could not read file (${errorMessage(error)})`,
    };
  }
  try {
    await ctx.waitForTurn();
    let baseUrl = getKnownServerUploadLimit();
    telemetryFields = {
      ...telemetryFields,
      server_max_known: baseUrl !== undefined,
    };
    let filename_2 = checkUploadAllowed(telemetryFields);
    if (filename_2) {
      logUploadDebug(`skip ${fullPath}: policy/provider gate denied after the wait for a turn`);
      return filename_2;
    }
    if (ctx.signal?.aborted) {
      logFeatureSad("bridge_attachment_upload", "aborted", telemetryFields);
      return {
        error: "upload aborted",
      };
    }
    let fileBytes;
    try {
      source.size = await isJetBrainsPluginInstalled_2(source.handle);
      if (canBufferWholeFile) fileBytes = await readBoundedFile(source, MAX_UPLOAD_BYTES);
    } catch (error) {
      logUploadDebug(`read failed for ${fullPath}: ${error}`);
      logFeatureSad("bridge_attachment_upload", "read_failed", telemetryFields);
      return {
        error: `upload failed: could not read file (${errorMessage(error)})`,
      };
    }
    if (fileBytes !== undefined)
      return await uploadWithPreviewCopy(fileBytes, filename, ctx, telemetryFields, postState);
    let min = Math.min(PEER_FILE_TRANSFER_SERVER_LIMIT, baseUrl ?? PEER_FILE_TRANSFER_SERVER_LIMIT);
    if (source.size > min) {
      logUploadDebug(
        `skip ${fullPath}: ${source.size} bytes exceeds the ${min} limit ${min === baseUrl ? "the store reported" : "of this client"}`,
      );
      logFeatureSad("bridge_attachment_upload", "too_large", telemetryFields);
      return {
        error: formatUploadLimitError(source.size, min),
      };
    }
    let scaledImage =
      ctx.originalsOnly || ctx.noScaledCopies
        ? undefined
        : await readAndScaleImage(source, guessMimeType(filename), ctx.signal);
    if (scaledImage !== undefined)
      return await uploadScaledImage(scaledImage, filename, ctx, telemetryFields, postState);
    let canResend = false;
    let uploadResult = await uploadWithResends(
      (telemetry, reportProgress) => {
        canResend = false;
        return uploadStreamWithAuth(
          streamMultipartBody(source.handle, source.size, filename, guessMimeType(filename)),
          source.size,
          filename,
          ctx,
          telemetry,
          (code, serverCode, bars, bytesHanded) => {
            canResend = isResendableFailure(code, bars, bytesHanded);
            reportProgress(code, serverCode, bars, bytesHanded);
          },
        );
      },
      {
        filename,
        size: source.size,
      },
      postState,
      ctx.signal,
      telemetryFields,
    );
    if (!("error" in uploadResult))
      return {
        file_uuid: uploadResult.file_uuid,
      };
    if (!canResend || !isTransientUploadFailure(uploadResult.error, uploadResult.errorCode))
      return uploadResult;
    let serverLimit = getKnownServerUploadLimit() ?? baseUrl;
    if (serverLimit !== undefined)
      return source.size > serverLimit
        ? {
            error: formatUploadLimitError(source.size, serverLimit),
          }
        : uploadResult;
    return source.size > SUSPECTED_UPLOAD_LIMIT_BYTES
      ? {
          ...uploadResult,
          suspectedLimitBytes: SUSPECTED_UPLOAD_LIMIT_BYTES,
        }
      : uploadResult;
  } finally {
    await source.handle.close().catch((error) => {
      logUploadDebug(`close failed for ${fullPath}: ${error}`);
    });
  }
}
//@ chunk-7kpfrhzn.js:23135-23236 layout
function isResendableFailure(code, serverCode, waitedMs) {
  return code === "http_5xx"
    ? serverCode !== "any_post" && serverCode !== "reason_not_temporary"
    : waitedMs !== undefined && waitedMs > RESEND_WINDOW_PER_POST_MS;
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
async function uploadWithPreviewCopy(bytes, filePath, ctx, telemetryFields, postState) {
  let previewCopy =
    ctx.originalsOnly || ctx.noPreviewCopies
      ? undefined
      : await makePreviewCopy(bytes, filePath, ctx.signal, telemetryFields, ctx.copyLock);
  if (previewCopy !== undefined) {
    let copyErrorCode;
    let copyServerCode;
    let copyBars;
    countUploadPost(postState);
    let copyResult = await uploadBuffer(
      previewCopy.bytes,
      `${basename(filePath, extname(filePath))}.${previewCopy.format === "png" ? "png" : "jpg"}`,
      "application/octet-stream",
      ctx.signal,
      telemetryFields,
      ctx.credentials,
      (code, serverCode, bars) => {
        copyErrorCode = code;
        copyServerCode = serverCode;
        copyBars = bars;
      },
    );
    if (!("error" in copyResult)) {
      let isImage = copyResult.file_kind === "image";
      if (isImage) logFeatureOk("bridge_attachment_preview_copy", telemetryFields);
      else logFeatureSad("bridge_attachment_preview_copy", "no_preview", telemetryFields);
      return {
        file_uuid: copyResult.file_uuid,
        copy: {
          isImage,
          mediaType: previewCopy.format === "png" ? "image/png" : "image/jpeg",
        },
      };
    }
    if (
      copyErrorCode === undefined ||
      !RESENDABLE_ERROR_CODES_SET.has(copyErrorCode) ||
      (postState.max > 1 && copyBars === "any_post")
    ) {
      if (copyErrorCode !== undefined) logUploadFailure(copyErrorCode, telemetryFields, copyServerCode);
      return copyResult;
    }
    logUploadDebug(`upload of the copy of ${filePath} failed (${copyErrorCode}); uploading the original`);
    logFeatureSad("bridge_attachment_preview_copy", `upload_failed_${copyErrorCode}`, telemetryFields);
  }
  let scaledImage =
    ctx.originalsOnly || ctx.noScaledCopies
      ? undefined
      : await maybeScaleImage(bytes, guessMimeType(filePath), MAX_UPLOAD_BYTES, ctx.signal);
  if (scaledImage !== undefined)
    return uploadScaledImage(scaledImage, filePath, ctx, telemetryFields, postState);
  let originalResult = await uploadWithResends(
    (telemetry, reportProgress) =>
      uploadBuffer(
        bytes,
        filePath,
        guessMimeType(filePath),
        ctx.signal,
        telemetry,
        ctx.credentials,
        reportProgress,
      ),
    {
      filename: filePath,
      size: bytes.length,
    },
    postState,
    ctx.signal,
    telemetryFields,
  );
  return "error" in originalResult
    ? originalResult
    : {
        file_uuid: originalResult.file_uuid,
      };
}
//@ chunk-7kpfrhzn.js:24341-24572 placement
async function uploadStreamWithAuth(body, contentLength, filename, ctx, telemetry, logSad) {
  let uploadAuth = await getUploadAuth(ctx.credentials);
  if (!uploadAuth) {
    logUploadDebug("skip: no oauth token");
    logSad("no_token");
    return {
      error: "upload failed: no OAuth token available",
    };
  }
  return uploadStream(body, contentLength, uploadAuth, {
    filename,
    signal: ctx.signal,
    telemetry,
    logSad,
  });
}
//@ chunk-7kpfrhzn.js:24572-25343 placement
async function uploadStream(streamBody, outputFileName, route, { filename, signal, telemetry, logSad }) {
  let gateError = checkUploadAllowed(telemetry);
  if (gateError) {
    logUploadDebug(`skip ${filename}: policy/provider gate denied`);
    return gateError;
  }
  if (isBridgeFileLoginRefused(route)) {
    logSad("stored_login_refused");
    return {
      error: new StoredLoginHeldBackError(storedLoginRefusalReason()).message,
    };
  }
  let progressStream = uploadStreamWithProgress(streamBody.slices, streamBody.contentLength, {
    signal,
  });
  try {
    let response = await axios_default.post(getUploadUrl(route), progressStream.body, {
      headers: buildUploadHeaders(
        route.token,
        streamBody.boundary,
        streamBody.contentLength,
        telemetry.upload_lane,
      ),
      timeout: 0,
      signal: progressStream.signal,
      validateStatus: () => true,
      maxRedirects: 0,
    });
    return handleUploadResponse(response, filename, outputFileName, telemetry, logSad);
  } catch (error) {
    logUploadDebug(`upload threw for ${filename}: ${error}`);
    let abortError = uploadAbortError(error, progressStream, signal?.aborted === true);
    logSad(
      abortError.code,
      undefined,
      abortError.code === "network_error" && NON_TEMPORARY_ERRNOS.has(getErrnoCode(error))
        ? "cause_not_temporary"
        : undefined,
      progressStream.seen().bytes_handed,
    );
    return {
      error: abortError.error,
    };
  } finally {
    progressStream.dispose();
    progressStream.body.on("error", () => {});
    progressStream.body.destroy(Error("the upload has already been answered"));
    await streamBody.finished();
  }
}
//@ chunk-7kpfrhzn.js:25343-26073 placement
/**
 * 上传中止/停滞的错误描述
 */
function uploadAbortError(error, progressStream, signalAborted) {
  if (signalAborted)
    return {
      code: "aborted",
      error: "upload aborted",
    };
  let reason = progressStream.signal.reason;
  if (reason instanceof UploadStalledError) {
    let progress = progressStream.seen();
    let rounded = Math.round(reason.waitedMs / 1000);
    return {
      code: "stalled",
      error:
        progress.bytes_handed === progress.body_bytes
          ? `upload failed: the server did not answer within ${rounded} seconds of receiving the file`
          : `upload failed: the transfer stalled (nothing moved for ${rounded} seconds)`,
    };
  }
  let inCauseChain = findInCauseChain(error, (cause) => cause instanceof UploadSourceError);
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
  uploadBriefAttachment,
  uploadResponseSchema,
};
