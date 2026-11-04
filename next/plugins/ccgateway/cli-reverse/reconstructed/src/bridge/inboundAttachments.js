/**
 * bridge/inboundAttachments.ts
 *
 * 并入已有模块：入站附件是否需要查询的判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/inboundAttachments.ts
 * pieces: chunk-23fm9f0d.js (1), chunk-cxyewwc3.js (4), chunk-n4bsg1hp.js (72)
 * attribution: fingerprint 5, sole-consumer 1, placement 60, layout 10, callgraph-fingerprint 1
 */
import { extname, join, basename, dirname } from "path";
import { lstat, lutimes, utimes, readdir, rmdir, link, unlink, rm, realpath } from "fs/promises";
import { randomUUID } from "crypto";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  booleanSchema,
  numberSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { cleanupOldFilesInDirectory } from "../utils/cleanup.js";
import { isImageOrPdfExtension, IMAGE_EXTENSIONS } from "../tools/FileReadTool/constants.js";
import { hasBinaryExtension } from "../constants/files.js";
import { isNotebookPath } from "../utils/path.js";
import {
  hashPrefixedFileName,
  shortContentHash,
  sessionUploadsDir,
  rememberAttachmentDigest,
} from "../utils/uploadsDir.js";
import {
  sanitizePeerFileName,
  readPeerFileBounded,
  verifyPeerFileIntegrity,
  emitPeerFileReceiveTelemetry,
  peerFileCountCapNote,
  peerFileFailureNote,
  injectPeerFilePrefix,
} from "../utils/peerFileReceive.js";
import {
  isCcsTenant,
  getSessionUploadsDirOverride,
  isDiskless,
  inboundAttachmentDownloadRegistry,
  getSessionId,
  getLocalUploadsRoot,
  inboundAttachmentFileRegistry,
} from "../bootstrap/state.js";
import { parseWebpHeader, pngMayHaveTransparency, MIME_TO_EXTENSION } from "../utils/imageFormats.js";
import { logForDebugging } from "../utils/debug.js";
import { getErrnoCode, sanitizeErrnoForTelemetry, sanitizeErrnoTokenForTelemetry } from "../utils/errors.js";
import { sha256OfFile, openSpill } from "./inboundAttachmentSpill.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { count } from "../utils/collections.js";
import { createOwnedSubdir, ensureAttachmentsDir } from "../utils/safeMkdir.js";
import { retryFsOp, writeIfMissing, retryTransient, writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { isRemoteManagedEnvironment } from "../utils/remoteEnvironment.js";
import { IMAGE_LIMITS, MODEL_COPY_IMAGE_BYTES, MAX_IMAGE_SIDE_PX } from "../utils/mediaLimits.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import {
  oauthRefreshLatchStamp,
  restoreOAuthRefreshLatch,
  countOAuth401Recovery,
  claudeCodeUserAgent,
  drainResponseBody,
} from "../utils/http.js";
import {
  isBridgeFileLoginRefused,
  getBridgeAccessTokenAsync,
  getBridgeAccessToken,
  getBridgeTokenOverride,
  getBridgeBaseUrl,
} from "./bridgeConfig.js";
import { settleStoredLoginRefusal } from "../utils/auth/storedLoginRefused.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  MAX_PEER_FILE_BYTES,
  MAX_PEER_SPOOL_BYTES,
  MAX_PEER_ATTACHMENTS,
} from "../utils/peerFileTransfer.js";
import { isImageDecodingDisabled, detectImageFormatFromBuffer } from "../utils/imageResizer.js";
import { isFirstPartyProvider } from "../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { computeContentHash } from "../utils/commitAttribution.js";
import { logError } from "../utils/log.js";
import {
  resetAuthFailureTracking,
  handleOAuth401Error,
  TOKEN_REFRESH_OUTCOMES_BEFORE_POST,
  getClaudeAIOAuthTokensAsync,
  readFreshOAuthAccessToken,
} from "../utils/auth.js";
import { sniffImageMediaType } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { convertImagesToBlocks } from "../components/permissions/AskUserQuestionPermissionRequest/AskUserQuestionPermissionRequest.js";
import { isValidKeySegment, STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { storageErrorCode, formatStorageError } from "../utils/storage/storageErrors.js";
import { warnDisklessSettingsWrite } from "../utils/settings/settingsStorage.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { limitConcurrency } from "../utils/concurrencyLimit.js";
import { dropEmptyTextBlocks } from "./inboundMessageOrigin.js";
import { isTaggedPeerText } from "../utils/crossSessionMessages.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { fullJitterBackoffMs, sleep } from "../utils/sleep.js";
import { getProxyFetchOptions } from "../utils/proxy.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-cxyewwc3.js:267-413 sole-consumer
var fileAttachmentSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_FILE_ATTACHMENTS;
deferInit("chunk-cxyewwc3.js:267", () => {
  fileAttachmentSchema = DoctorLazy(() =>
    objectSchema({
      file_uuid: stringSchema(),
      file_name: stringSchema(),
      is_image: booleanSchema().nullish(),
      sha256: stringSchema().nullish().catch(null),
      file_size: numberSchema().nullish().catch(undefined),
    }),
  );
  MAX_FILE_ATTACHMENTS = 256;
});
//@ chunk-cxyewwc3.js:413-648 fingerprint = extractInboundAttachments (1)
/**
 * 从入站帧的 file_attachments 字段取出并校验附件列表（截断到上限）。
 */
function extractInboundAttachments(msg) {
  if (typeof msg !== "object" || msg === null || !("file_attachments" in msg)) return [];
  let fileAttachments = msg.file_attachments;
  if (!Array.isArray(fileAttachments)) return [];
  let schema = fileAttachmentSchema();
  return fileAttachments.slice(0, MAX_FILE_ATTACHMENTS).flatMap((fileAttachment) => {
    let parsed = schema.safeParse(fileAttachment);
    return parsed.success ? [parsed.data] : [];
  });
}
//@ chunk-cxyewwc3.js:648-693 placement
var inboundAttachmentQuerySchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-cxyewwc3.js:648", () => {
  inboundAttachmentQuerySchema = DoctorLazy(() =>
    objectSchema({
      shouldQuery: booleanSchema().optional(),
    }),
  );
});
//@ chunk-cxyewwc3.js:693-751 placement
function shouldQueryInboundAttachment(input) {
  return inboundAttachmentQuerySchema().safeParse(input).data?.shouldQuery;
}
//@ chunk-23fm9f0d.js:23001-23035 fingerprint = uploadsDir (1)
function uploadsDir() {
  return cleanupOldFilesInDirectory("uploads");
}
//@ chunk-n4bsg1hp.js:2043-2126 placement
/**
 * 判断附件文件是否可被查询读取：有扩展名、不是二进制/notebook、不是特例扩展。
 */
function isQueryableAttachmentFile(filePath) {
  return (
    extname(filePath).toLowerCase().slice(1) !== "" &&
    !isImageOrPdfExtension(filePath) &&
    !hasBinaryExtension(filePath) &&
    !isNotebookPath(filePath)
  );
}
//@ chunk-n4bsg1hp.js:2126-2174 placement
/**
 * 用空目录 + 净化后的原始文件名生成入站附件的内部名字。
 */
function sanitizedAttachmentInnerName(attachment) {
  return hashPrefixedFileName("", sanitizePeerFileName(attachment.file_name));
}
//@ chunk-n4bsg1hp.js:2174-2632 placement
function describeAttachmentFailures(attachments) {
  let imageExtCount = 0;
  let pdfCount = 0;
  let binaryExtCount = 0;
  let textLikeCount = 0;
  let binaryNoShaCount = 0;
  let binaryOrPdfNoShaCount = 0;
  for (let attachment of attachments) {
    if (attachment.is_image === true) continue;
    let innerName = sanitizedAttachmentInnerName(attachment);
    let noSha = attachment.sha256 === undefined;
    if (IMAGE_EXTENSIONS.has(extname(innerName).toLowerCase().slice(1))) imageExtCount++;
    else if (isImageOrPdfExtension(innerName)) {
      pdfCount++;
      if (noSha) binaryOrPdfNoShaCount++;
    } else if (hasBinaryExtension(innerName)) {
      binaryExtCount++;
      if (noSha) {
        binaryNoShaCount++;
        binaryOrPdfNoShaCount++;
      }
    } else textLikeCount++;
  }
  let hasAny = attachments.length > 0;
  return {
    binary_ext_file_count: binaryExtCount,
    pdf_file_count: pdfCount,
    text_like_file_count: textLikeCount,
    image_ext_file_count: imageExtCount,
    all_files_binary_ext_no_sha256: hasAny && binaryNoShaCount === attachments.length ? 1 : 0,
    all_files_binary_ext_or_pdf_no_sha256: hasAny && binaryOrPdfNoShaCount === attachments.length ? 1 : 0,
  };
}
//@ chunk-n4bsg1hp.js:2632-2684 placement
function hasFetchUpload(options) {
  return options !== undefined && "fetchUpload" in options;
}
//@ chunk-n4bsg1hp.js:2684-2792 placement
var DOWNLOAD_QUIET_LIMIT_MS = 30000;
var MAX_ATTACHMENT_BYTES = 36700160;
var DOWNLOAD_TRIES = {
  startsTurn: 3,
  noTurn: 2,
};
var FAST_QUIET_LIMIT_MS = 1e4;
var MIN_RETRY_DELAY_MS = 250;
var RETRY_BASE_DELAY_MS = 1000;
var DOWNLOAD_DEADLINE_SLACK_MS = 25000;
var MAX_LISTED_ATTACHMENTS = 16;
var MAX_ATTACHMENTS_WITHOUT_SHA = 20;
var MAX_REMEMBERED_FILES = 64;
var MAX_HELD_PREFETCHES = 16;
//@ chunk-n4bsg1hp.js:2792-2835 placement
function maxAttachmentBytes() {
  return (isCcsTenant() ? 16 : 64) * 1024 * 1024;
}
//@ chunk-n4bsg1hp.js:2835-3456 placement
/**
 * 入站附件预取的常量：预取结果最长保留 5 分钟、持有时长范围、相关请求头名、409 冲突状态、早拒上限与冷却、启动预算与窗口、各失败原因的计数键与数字代码、内联图片最大边长 1568。
 */
var PREFETCH_MAX_AGE_MS = 300000;
var CCS_PREFETCH_HOLD_MS = 60000;
var PREFETCH_HOLD_RANGE_MS = {
  min: 15000,
  max: PREFETCH_MAX_AGE_MS,
};
var PREFETCH_AGE_HOLD_MULTIPLE = 3;
var X_SERVED_FILE_PAGE_COUNT = "x-served-file-page-count";
var X_ANTHROPIC_ATTACHMENT_PREFETCH = "x-anthropic-attachment-prefetch";
var PREFETCH_SEEN_HEADER = {
  name: "x-anthropic-attachment-prefetch-seen",
  value: "1",
};
var HTTP_CONFLICT_STATUS = 409;
var MAX_REFUSED_EARLY = 64;
var REFUSED_EARLY_COOLDOWN_MS = 300000;
var PREFETCH_START_BUDGET = 32;
var PREFETCH_START_WINDOW_MS = 60000;
var FAILURE_COUNTER_KEYS = {
  no_token: "failed_no_token_count",
  http_status: "failed_http_status_count",
  too_large: "failed_too_large_count",
  held_limit: "failed_held_limit_count",
  stalled: "failed_stalled_count",
  stopped: "failed_stopped_count",
  error: "failed_error_count",
};
var FLAG_SERVED_BY_SOURCE = {
  override: true,
  payload: true,
  disk: true,
  disabled: false,
  fallback: false,
};
var FAILURE_CODES = {
  no_token: 1,
  http_status: 2,
  too_large: 3,
  held_limit: 4,
  stalled: 5,
  stopped: 6,
  error: 7,
};
var PREFETCH_FAILURE_CODE_BEARER = 8;
var PREFETCH_FAILURE_CODE_HEADERS_TIMEOUT = 9;
var PREFLIGHT_QUIET_LIMIT_MS = 3000;
var MAX_INLINE_IMAGE_DIMENSION = 1568;
//@ chunk-n4bsg1hp.js:3456-3533 placement
function imageExceedsDimension(data, maxDim) {
  let webpHeader = parseWebpHeader(data);
  return webpHeader !== undefined && Math.max(webpHeader.width, webpHeader.height) > maxDim;
}
//@ chunk-n4bsg1hp.js:3533-3581 fingerprint = debug (1)
function debug(msg) {
  logForDebugging(`[bridge:inbound-attach] ${msg}`);
}
//@ chunk-n4bsg1hp.js:3581-4070 layout
/**
 * 比较磁盘上同名路径与待写内容：directory / other / absent / same / changed / unknown。
 */
async function compareExistingFile(path, content, verifyHash = false) {
  try {
    let stat = await lstat(path);
    if (stat.isDirectory()) return "directory";
    if (!stat.isFile()) return "other";
    if (!Buffer.isBuffer(content)) {
      if (stat.size !== content.size) return "changed";
      if (!verifyHash) return "same";
    } else if (stat.size !== content.length) return "changed";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "absent";
    debug(`could not look at ${path}: ${error}`);
    return "unknown";
  }
  if (!Buffer.isBuffer(content))
    return (await sha256OfFile(path, content.size)) === content.sha256 ? "same" : "changed";
  return (await readPeerFileBounded(path, content.length))?.equals(content) ? "same" : "changed";
}
//@ chunk-n4bsg1hp.js:4070-4085 layout
var MAX_PUBLISH_TRIES = 3;
var MAX_KEPT_FOLDERS = 64;
//@ chunk-n4bsg1hp.js:4085-6123 layout
/**
 * 发布文件到 uploads：路径被占且内容不同则把原文件移到 .kept-<时间>-<id> 目录再重试（最多 3 次、kept 目录上限 64），相同则只更新 mtime。
 */
async function publishWithMoveAside(attemptPublish, uploadsDir, fileName, content, totals, keptFolders) {
  let targetPath = join(uploadsDir, fileName);
  let movedAside;
  let movedCount = 0;
  let movedHint = "; an entry moved from this path earlier is in a .kept- folder beside it";
  try {
    for (let j = 1; ; j++) {
      let outcome;
      try {
        outcome = await attemptPublish();
      } catch (error) {
        await restoreMovedAside(movedAside, uploadsDir, fileName, totals, keptFolders);
        throw error;
      }
      if (outcome === "published") return outcome;
      if (outcome === "failed") {
        await restoreMovedAside(movedAside, uploadsDir, fileName, totals, keptFolders);
        return outcome;
      }
      let compare = outcome === "taken" ? await compareExistingFile(targetPath, content, true) : outcome;
      if (compare === "same") {
        let date = new Date();
        await lutimes(targetPath, date, date).catch((error) =>
          debug(`could not update the modification time of ${fileName}: ${error}`),
        );
        await utimes(uploadsDir, date, date).catch((error) =>
          debug(`could not update the modification time of the uploads folder: ${error}`),
        );
        return "same";
      }
      if (compare === "directory")
        return {
          code: lit("EISDIR"),
          why: `not saved: a folder is at this path, and it was left there${movedCount === 0 ? "" : movedHint}`,
        };
      if (compare === "unknown") {
        movedCount -= (await restoreMovedAside(movedAside, uploadsDir, fileName, totals, keptFolders))
          ? 1
          : 0;
        return {
          code: lit("look_failed"),
          why: `not saved: what is at this path could not be looked at, so it was left there${movedCount === 0 ? "" : movedHint}`,
        };
      }
      if (j === MAX_PUBLISH_TRIES) {
        movedCount -= (await restoreMovedAside(movedAside, uploadsDir, fileName, totals, keptFolders))
          ? 1
          : 0;
        return {
          code: lit("EEXIST"),
          why: `not saved: the path was taken on each of ${MAX_PUBLISH_TRIES} tries; anything there now was left there${movedCount === 0 ? "" : movedHint}`,
        };
      }
      if (compare === "absent") continue;
      let keptName = `.kept-${new Date().toISOString().replace(/[-:.]/g, "")}-${randomUUID().slice(0, 8)}`;
      let created;
      try {
        let entries = await readdir(uploadsDir);
        if (count(entries, (entry) => entry.startsWith(".kept-")) >= MAX_KEPT_FOLDERS) {
          totals.moveAsideFailedCount++;
          return {
            code: lit("kept_cap"),
            why: `not saved: the uploads folder holds at least ${MAX_KEPT_FOLDERS} folders of kept copies (named .kept-...), so what was at this path was left there; removing old ones makes room${movedCount === 0 ? "" : movedHint}`,
            leavesADifferentFile: true,
          };
        }
        created = await createOwnedSubdir(uploadsDir, keptName);
        await retryFsOp(targetPath, join(created.at, fileName));
        await movedAside?.held.release().catch(() => {});
        movedAside = {
          held: created,
          name: keptName,
        };
        created = undefined;
        movedCount++;
        keptFolders.push(keptName);
        totals.movedAsideFileCount++;
      } catch (error) {
        await created?.release().catch(() => {});
        await rmdir(join(uploadsDir, keptName)).catch(() => {});
        let compare =
          getErrnoCode(error) === "ENOENT" ? await compareExistingFile(targetPath, content, true) : undefined;
        if (compare !== "absent" && compare !== "same") {
          totals.moveAsideFailedCount++;
          return {
            code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
            why: `not saved: what was at this path could not be moved into a folder of kept copies (${error}), and was left there${movedCount === 0 ? "" : movedHint}`,
            ...((compare === undefined || compare === "changed" || compare === "other") && {
              leavesADifferentFile: true,
            }),
          };
        }
      }
    }
  } finally {
    await movedAside?.held.release().catch(() => {});
  }
}
//@ chunk-n4bsg1hp.js:6123-6746 layout
async function restoreMovedAside(moved, uploadsDir, fileName, totals, keptFolders) {
  if (moved === undefined) return false;
  let targetPath = join(uploadsDir, fileName);
  let movedPath = join(moved.held.at, fileName);
  try {
    let linked = false;
    try {
      await link(movedPath, targetPath);
      linked = true;
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") throw error;
    }
    if (linked)
      await unlink(movedPath).catch((error) =>
        debug(
          `${fileName} is back at its path, but a second name for it stays in its .kept- folder: ${error}`,
        ),
      );
    else {
      if (
        !(await lstat(targetPath).then(
          () => false,
          (error) => getErrnoCode(error) === "ENOENT",
        ))
      )
        throw Error("the path is taken again, or could not be checked");
      await retryFsOp(movedPath, targetPath);
    }
  } catch (error) {
    debug(`could not move ${fileName} back out of its .kept- folder, where it stays: ${error}`);
    return false;
  }
  totals.movedAsideFileCount--;
  let index = keptFolders.indexOf(moved.name);
  if (index !== -1) keptFolders.splice(index, 1);
  await rmdir(join(uploadsDir, moved.name)).catch(() => {});
  return true;
}
//@ chunk-n4bsg1hp.js:6746-7132 layout
/**
 * 用 link(2) 原子放置文件（失败时改为看名字空闲后 rename）。
 */
async function linkIntoPlace(stagedPath, targetPath, fileName, content, totals, publishState) {
  if (!publishState.renamesAfterALook)
    try {
      await link(stagedPath, targetPath);
      totals.linkedFileCount++;
      return "published";
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") return "taken";
      debug(
        `link(2) failed for ${fileName} (${error}); looking at the name, to rename into it only if it is free`,
      );
      publishState.renamesAfterALook = true;
    }
  let compare = await compareExistingFile(targetPath, content, true);
  if (compare !== "absent") return compare;
  await retryFsOp(stagedPath, targetPath);
  totals.renamedAfterLinkRefusedCount++;
  return "published";
}
//@ chunk-n4bsg1hp.js:7132-7385 layout
async function countWouldMoveAside(targetPath, content, totals) {
  let startTime = performance.now();
  let compare = await compareExistingFile(targetPath, content, true);
  totals.slowestWouldMoveLookMs = Math.max(totals.slowestWouldMoveLookMs, performance.now() - startTime);
  if (compare === "changed" || compare === "other") totals.wouldMoveAsideFileCount++;
  else if (compare === "same") totals.wouldLeaveSameFileCount++;
}
//@ chunk-n4bsg1hp.js:7385-7430 layout
function canSpillToUploads() {
  return isRemoteManagedEnvironment() && getSessionUploadsDirOverride() === null && !isDiskless();
}
//@ chunk-n4bsg1hp.js:7430-7509 layout
var UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
//@ chunk-n4bsg1hp.js:7509-7611 layout
function recordSavedName(totals, savedName, attachment) {
  totals.idsBySavedName.set(savedName, [
    ...(totals.idsBySavedName.get(savedName) ?? []),
    attachment.file_uuid.toLowerCase(),
  ]);
}
//@ chunk-n4bsg1hp.js:7611-7749 fingerprint = attachmentSchema (0.694)
/**
 * 附件保存文件名：file_uuid 前缀（或稳定形式）+ 清洗后的原文件名。
 */
function savedFileNameFor(attachment, namedByIdHash) {
  return hashPrefixedFileName(
    namedByIdHash
      ? shortContentHash(attachment.file_uuid)
      : (attachment.file_uuid.slice(0, 8) || randomUUID().slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, "_"),
    sanitizePeerFileName(attachment.file_name),
  );
}
//@ chunk-n4bsg1hp.js:7749-7905 placement
function isRetryableDownloadFailure(result) {
  let httpStatus = result.httpStatus ?? 0;
  return (
    result.failure === "stalled" ||
    (result.failure === "error" && result.final !== true) ||
    (result.failure === "http_status" && (httpStatus >= 500 || httpStatus === 408 || httpStatus === 429))
  );
}
//@ chunk-n4bsg1hp.js:7905-7985 placement
function wantsModelCopy(fileSize) {
  return (
    fileSize > IMAGE_LIMITS.targetRawSize ||
    (fileSize > MODEL_COPY_IMAGE_BYTES &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_lucky_widget", false) === true)
  );
}
//@ chunk-n4bsg1hp.js:7985-8174 placement
function fetchModelCopy(fileUuid, baseUrl, token, abort, totals) {
  return resolveOne({
    fileUuid,
    baseUrl,
    modelCopy: true,
    forPrefetch: false,
    maxBytes: IMAGE_LIMITS.targetRawSize,
    spillTo: undefined,
    token: () => token,
    abort,
    quietLimitMs: PREFLIGHT_QUIET_LIMIT_MS,
    totals,
    admitBytes: () => true,
  });
}
//@ chunk-n4bsg1hp.js:8174-19102 placement
/**
 * 下载一个入站附件：取 OAuth 令牌、图像/PDF 处理、大小上限、停滞检测、重试与写入 uploads 目录（约 11 KB）。
 */
async function resolveInboundAttachment(
  attachment,
  registerDigest,
  forPrefetch,
  totals,
  tries,
  credentials,
  fetchUpload,
  authOptions,
  downloadContext,
  uploadsDirOverride,
  noTurn = false,
  signal,
  namedByIdHash = false,
  moveAsideMode = "off",
) {
  let refreshStamp = oauthRefreshLatchStamp(signInRefreshState().recoveries);
  if (isBridgeFileLoginRefused()) await settleStoredLoginRefusal();
  let token =
    downloadContext?.accessToken ??
    (isStorageV5Enabled() && authOptions !== undefined
      ? await getBridgeAccessTokenAsync(authOptions)
      : getBridgeAccessToken());
  if (!token) {
    debug("skip: no oauth token");
    return recordDownloadFailure(totals, "no_token", 0);
  }
  let bearerToken = token;
  let wantInlineImage = forPrefetch && attachment.is_image === true && attachment.sha256 === undefined;
  let modelCopyPromise;
  let abortController = new AbortController();
  using abortScope = {
    [Symbol.dispose]: () => abortController.abort(),
  };
  let keptFolders = [];
  let fileBytes;
  let servedPageCount;
  let sha256;
  let savedPath;
  let reusedServedPageCount = false;
  let elapsedMs = 0;
  let remainingTries = tries;
  try {
    let maxBytes = attachment.sha256 === undefined ? MAX_ATTACHMENT_BYTES : MAX_PEER_FILE_BYTES;
    let spillPath =
      attachment.sha256 === undefined && canSpillToUploads()
        ? join(uploadsDirOverride ?? sessionUploadsDir(), savedFileNameFor(attachment, namedByIdHash))
        : undefined;
    let uploadFallback =
      attachment.sha256 === undefined && hasFetchUpload(fetchUpload) ? fetchUpload : undefined;
    if (
      typeof attachment.file_size === "number" &&
      attachment.file_size >
        (spillPath === undefined && uploadFallback === undefined ? maxBytes : MAX_PEER_SPOOL_BYTES)
    )
      return recordDownloadFailure(totals, "too_large", 0);
    if (
      wantInlineImage &&
      !isImageDecodingDisabled() &&
      typeof attachment.file_size === "number" &&
      wantsModelCopy(attachment.file_size) &&
      isFirstPartyProvider() &&
      !isEssentialTrafficOnly()
    )
      modelCopyPromise = fetchModelCopy(
        attachment.file_uuid,
        downloadContext?.baseUrl,
        token,
        abortController,
        totals,
      );
    let fileRegistry = autoInboundFileRegistry(downloadContext);
    let known = writtenInUploadsDir(attachment.file_uuid, downloadContext);
    if (
      fileRegistry !== undefined &&
      known !== undefined &&
      known.bearer === computeContentHash(token) &&
      (known.size <= maxBytes || known.path === spillPath) &&
      (attachment.sha256 === undefined || attachment.sha256 === known.sha256)
    ) {
      let overLimit = known.size > maxBytes;
      if (overLimit && (await sha256OfFile(known.path, known.size)) === known.sha256) {
        recordSavedName(totals, basename(known.path), attachment);
        totals.reusedFileCount++;
        return {
          path: known.path,
        };
      }
      let readBack = overLimit ? null : await readPeerFileBounded(known.path, known.size);
      if (readBack !== null && computeContentHash(readBack) === known.sha256) {
        fileBytes = readBack;
        sha256 = known.sha256;
        savedPath = known.path;
        totals.reusedFileCount++;
      } else if (fileRegistry.get(foldFileUuid(attachment.file_uuid)) === known)
        fileRegistry.delete(foldFileUuid(attachment.file_uuid));
    }
    if (noTurn && spillPath !== undefined) {
      let stat = await lstat(spillPath).catch(() => {
        return;
      });
      if (stat?.isFile() && stat.size > maxBytes) {
        recordSavedName(totals, basename(spillPath), attachment);
        totals.reusedFileCount++;
        return {
          path: spillPath,
        };
      }
    }
    let registry = inboundAttachmentDownloadRegistry();
    let foldedUuid = foldFileUuid(attachment.file_uuid);
    registry.refusedEarly?.delete(foldedUuid);
    let inFlightEntry =
      fileBytes === undefined && downloadContext === undefined && signal === undefined
        ? registry.byFileUuid.get(foldedUuid)
        : undefined;
    while (inFlightEntry !== undefined) {
      let startTime = performance.now();
      let counted = takeInFlightDownload(inFlightEntry, startTime, computeContentHash(token));
      let settled = inFlightEntry.settledAt === undefined;
      let byPrefetch = inFlightEntry.startedBy === "prefetch";
      let bytes = await inFlightEntry.bytes;
      let waitedMs = performance.now() - startTime;
      elapsedMs += waitedMs;
      if (byPrefetch && settled) {
        totals.joinedInFlightCount++;
        totals.slowestJoinWaitMs = Math.max(totals.slowestJoinWaitMs, waitedMs);
        if (inFlightEntry.headersTimedOut) remainingTries = Math.max(1, tries - 1);
      }
      let sameBearer = inFlightEntry.bearer === computeContentHash(token);
      let usable =
        bytes !== null &&
        sameBearer &&
        bytes.length <= maxBytes &&
        (typeof attachment.sha256 !== "string" ||
          verifyPeerFileIntegrity(bytes, {
            sha256: attachment.sha256,
            file_size: attachment.file_size,
          }));
      if (usable) {
        if (downloadContext === undefined) restoreOAuthRefreshLatch(signInRefreshState(), refreshStamp);
        fileBytes = bytes;
        servedPageCount = inFlightEntry.servedPageCount;
        reusedServedPageCount = true;
      } else if (
        bytes === null &&
        settled &&
        sameBearer &&
        shouldRedownload(inFlightEntry, startTime) &&
        !(inFlightEntry.failure === "too_large" && uploadFallback !== undefined)
      )
        return "writeFailed" in inFlightEntry
          ? recordWriteFailure(totals, inFlightEntry.writeFailed)
          : recordDownloadFailure(totals, inFlightEntry.failure ?? "error", inFlightEntry.receivedBytes);
      if (byPrefetch && bytes !== null) {
        if (usable) totals.prefetchedFileCount++;
        if (counted)
          logPrefetchUse(inFlightEntry, bytes, {
            inFlight: settled,
            passes: usable,
            sameBearer,
            waitedMs,
          });
      }
      let nextEntry = fileBytes === undefined ? registry.byFileUuid.get(foldedUuid) : undefined;
      inFlightEntry =
        nextEntry !== inFlightEntry &&
        nextEntry?.startedBy === "message" &&
        nextEntry.bearer === computeContentHash(token)
          ? nextEntry
          : undefined;
    }
    if (fileBytes === undefined) {
      let abortController = new AbortController();
      let onAbort = () => abortController.abort();
      signal?.addEventListener("abort", onAbort, {
        once: true,
      });
      if (signal?.aborted) onAbort();
      let entry;
      let receivedBytes = 0;
      let downloadOptions = {
        fileUuid: attachment.file_uuid,
        baseUrl: downloadContext?.baseUrl,
        modelCopy: false,
        forPrefetch: false,
        maxBytes:
          uploadFallback !== undefined &&
          typeof attachment.file_size === "number" &&
          attachment.file_size > maxBytes
            ? 0
            : maxBytes,
        spillTo:
          spillPath === undefined
            ? undefined
            : async () => openSpill(await ensureAttachmentsDir(dirname(spillPath)), spillPath),
        token: () => bearerToken,
        admitBytes: (bytes) => {
          receivedBytes = bytes;
          if (entry !== undefined) entry.receivedBytes = bytes;
          return true;
        },
      };
      let download = downloadWithRetries(remainingTries, elapsedMs, abortController, totals, downloadOptions)
        .then(async (result) => {
          if (
            downloadContext !== undefined ||
            !("failure" in result) ||
            result.httpStatus !== 401 ||
            getBridgeTokenOverride() !== undefined
          )
            return result;
          let refreshed = await refreshTokenForDownload(
            bearerToken,
            authOptions,
            fetchUpload,
            abortController.signal,
            credentials,
            totals,
          );
          if (refreshed === undefined) return result;
          bearerToken = refreshed.bearer;
          refreshStamp = refreshed.stamp;
          if (entry !== undefined) entry.bearer = computeContentHash(refreshed.bearer);
          totals.retriedAfter401Count++;
          let retried = await downloadWithRetries(1, 0, abortController, totals, downloadOptions);
          if (!("failure" in retried) && !("writeFailed" in retried)) totals.recoveredFileCount++;
          return retried;
        })
        .catch((error) => {
          logError(error);
          return {
            failure: "error",
          };
        });
      if (downloadContext === undefined && signal === undefined && bridgeAttachmentEarlyReadsGate().value) {
        entry = newDownloadEntry("message", abortController, download, computeContentHash(token));
        registry.byFileUuid.set(foldedUuid, entry);
      }
      let result = await download;
      signal?.removeEventListener("abort", onAbort);
      if (
        "failure" in result &&
        result.failure === "too_large" &&
        uploadFallback !== undefined &&
        !signal?.aborted
      ) {
        let uploadName = savedFileNameFor(attachment, namedByIdHash);
        let upload = await uploadFallback.fetchUpload(uploadName, attachment.file_uuid);
        if (upload.ok) {
          recordSavedName(totals, uploadName, attachment);
          totals.overMemoryLimitFileCount++;
          return {
            path: join(uploadsDirOverride ?? sessionUploadsDir(), uploadName),
          };
        }
        if (!upload.tooLarge) {
          debug(
            `the machine with the uploads folder could not download ${attachment.file_uuid}: ${upload.error}`,
          );
          totals.failedWriteCount++;
          totals.lastFailedWrite = {
            code: lit("unknown"),
            step: lit("fetched_by_container"),
          };
          return {
            failure: "write",
          };
        }
      }
      if ("failure" in result)
        return recordDownloadFailure(totals, result.failure, receivedBytes, result.httpStatus);
      if (downloadContext === undefined) {
        restoreOAuthRefreshLatch(signInRefreshState(), refreshStamp);
        resetAuthFailureTracking();
      }
      if ("writeFailed" in result) return recordWriteFailure(totals, result.writeFailed);
      if ("file" in result) {
        let { file } = result;
        let writeStep = lit("link");
        let moveMode = !noTurn ? moveAsideMode : "off";
        let publishFailure;
        try {
          if (signal?.aborted) return recordDownloadFailure(totals, "stopped", 0);
          recordSavedName(totals, basename(file.placeAt), attachment);
          if (moveMode === "count") {
            await countWouldMoveAside(file.placeAt, file, totals);
            if (signal?.aborted) return recordDownloadFailure(totals, "stopped", 0);
          }
          let renameAfterLook = !noTurn && !isMoveAsideModeOn(moveMode);
          if (isMoveAsideModeOn(moveMode)) {
            writeStep = lit("write");
            let aborted = false;
            let publishState = {
              renamesAfterALook: false,
            };
            let fileName = basename(file.placeAt);
            let publishOutcome = await publishWithMoveAside(
              async () => {
                if (signal?.aborted) {
                  aborted = true;
                  return "failed";
                }
                return linkIntoPlace(file.path, file.placeAt, fileName, file, totals, publishState);
              },
              dirname(file.placeAt),
              fileName,
              file,
              totals,
              keptFolders,
            );
            if (aborted) return recordDownloadFailure(totals, "stopped", 0);
            if (publishOutcome === "same") totals.unchangedOnDiskCount++;
            else if (typeof publishOutcome === "object") publishFailure = publishOutcome;
          } else if (noTurn)
            try {
              await link(file.path, file.placeAt);
              totals.linkedFileCount++;
            } catch (error) {
              let existsError = getErrnoCode(error) === "EEXIST";
              let compare = await compareExistingFile(file.placeAt, file);
              if (compare === "same") totals.unchangedOnDiskCount++;
              else if (compare === "changed" || (compare === "unknown" && existsError))
                totals.keptChangedFileCount++;
              else if (compare === "absent" && !existsError) renameAfterLook = true;
              else throw error;
            }
          if (renameAfterLook) {
            writeStep = lit("rename");
            await retryFsOp(file.path, file.placeAt);
            if (noTurn) totals.renamedAfterLinkRefusedCount++;
          }
        } catch (error) {
          debug(`write ${file.target} failed: ${error}`);
          totals.failedWriteCount++;
          totals.lastFailedWrite = {
            code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
            step: writeStep,
          };
          return {
            failure: "write",
            ...keptAsideResult(moveMode, keptFolders, file.target, false),
          };
        } finally {
          await rm(file.path, {
            force: true,
          }).catch((error) => {
            debug(`the staged name of ${file.target} could not be removed (${file.path}): ${error}`);
            totals.stagedNameLeftCount++;
          });
          await file.release();
        }
        if (publishFailure !== undefined) {
          debug(`write ${file.target} failed: ${publishFailure.why}`);
          totals.failedWriteCount++;
          totals.lastFailedWrite = {
            code: publishFailure.code,
            step: lit("move_aside"),
          };
          return {
            failure: "write",
            ...keptAsideResult(moveMode, keptFolders, file.target, false, publishFailure),
          };
        }
        totals.overMemoryLimitFileCount++;
        rememberResolvedFile(
          attachment,
          {
            path: file.target,
            size: file.size,
            sha256: file.sha256,
            bearer: computeContentHash(bearerToken),
          },
          downloadContext,
        );
        return {
          path: file.target,
          ...keptAsideResult(moveMode, keptFolders, file.target, true),
        };
      }
      fileBytes = result.data;
      servedPageCount = result.servedPageCount;
    }
  } catch (error) {
    debug(`fetch ${attachment.file_uuid} threw: ${error}`);
    return recordDownloadFailure(totals, "error", 0);
  }
  if (
    typeof attachment.sha256 === "string" &&
    !reusedServedPageCount &&
    !verifyPeerFileIntegrity(fileBytes, {
      sha256: attachment.sha256,
      file_size: attachment.file_size,
    })
  ) {
    debug(`fetch ${attachment.file_uuid} failed integrity verification`);
    return {
      failure: "digest_mismatch",
    };
  }
  let imageTimings = {
    resizeMs: 0,
    pngPaletteMs: 0,
    byteBudgetMs: 0,
  };
  let contentOverTarget = fileBytes.length > IMAGE_LIMITS.targetRawSize;
  let modelCopyNeeded =
    wantInlineImage &&
    !isImageDecodingDisabled() &&
    sniffImageMediaType(fileBytes) !== null &&
    (imageExceedsDimension(fileBytes, MAX_IMAGE_SIDE_PX) || wantsModelCopy(fileBytes.length)) &&
    isFirstPartyProvider() &&
    !isEssentialTrafficOnly();
  let modelCopyBytes;
  if (modelCopyNeeded) {
    let modelCopyResult = bearerToken === token ? await modelCopyPromise : undefined;
    if (
      modelCopyResult === undefined ||
      ("failure" in modelCopyResult && isRetryableDownloadFailure(modelCopyResult))
    )
      modelCopyResult = await fetchModelCopy(
        attachment.file_uuid,
        downloadContext?.baseUrl,
        bearerToken,
        new AbortController(),
        totals,
      );
    if ("data" in modelCopyResult) {
      let webpHeader = parseWebpHeader(fileBytes);
      let webpHeader_2 = parseWebpHeader(modelCopyResult.data);
      let modelCopyIsWorseWebp =
        webpHeader !== undefined &&
        webpHeader_2 !== undefined &&
        Math.max(webpHeader_2.width, webpHeader_2.height) <= MAX_INLINE_IMAGE_DIMENSION &&
        (Math.max(webpHeader_2.width, webpHeader_2.height) < Math.max(webpHeader.width, webpHeader.height) ||
          Math.min(webpHeader_2.width, webpHeader_2.height) < Math.min(webpHeader.width, webpHeader.height));
      if (
        contentOverTarget ||
        (!imageExceedsDimension(modelCopyResult.data, MAX_IMAGE_SIDE_PX) &&
          (imageExceedsDimension(fileBytes, MAX_IMAGE_SIDE_PX) ||
            (modelCopyResult.data.length < fileBytes.length && !modelCopyIsWorseWebp)))
      )
        modelCopyBytes = modelCopyResult.data;
    }
  }
  let startTime = performance.now();
  let toImageBlock = (bytes) =>
    convertImagesToBlocks(bytes, IMAGE_LIMITS, {
      timings: imageTimings,
    }).catch((error) => {
      debug(`inline ${attachment.file_uuid} threw: ${error}`);
      return null;
    });
  let modelCopyBlock = modelCopyBytes ? await toImageBlock(modelCopyBytes) : null;
  let imageBlock = modelCopyBlock ?? (wantInlineImage ? await toImageBlock(fileBytes) : null);
  totals.slowestInlineImageBuildMs = Math.max(
    totals.slowestInlineImageBuildMs,
    performance.now() - startTime,
  );
  totals.slowestInlineImageResizeMs = Math.max(totals.slowestInlineImageResizeMs, imageTimings.resizeMs);
  totals.slowestInlineImagePngPaletteMs = Math.max(
    totals.slowestInlineImagePngPaletteMs,
    imageTimings.pngPaletteMs,
  );
  totals.slowestInlineImageByteBudgetMs = Math.max(
    totals.slowestInlineImageByteBudgetMs,
    imageTimings.byteBudgetMs,
  );
  if (modelCopyBlock) totals.modelCopyCount++;
  else if (modelCopyNeeded) {
    totals.modelCopyMissedCount++;
    if (imageBlock) totals.modelCopyMissedSentAsIsCount++;
  }
  if (imageBlock && detectImageFormatFromBuffer(fileBytes) === "image/png") {
    totals.inlinedPngSourceCount++;
    if (pngMayHaveTransparency(fileBytes)) totals.inlinedPngSourceMaybeTransparentCount++;
    if (imageBlock.source.type === "base64" && imageBlock.source.media_type === "image/jpeg")
      totals.inlinedPngSourceSentAsJpegCount++;
  }
  let savedFileName = imageBlock
    ? hashPrefixedFileName(
        namedByIdHash ? shortContentHash(attachment.file_uuid) : randomUUID().slice(0, 8),
        `image.${MIME_TO_EXTENSION[detectImageFormatFromBuffer(fileBytes)]}`,
      )
    : savedFileNameFor(attachment, namedByIdHash);
  recordSavedName(totals, savedFileName, attachment);
  let uploadsDir = uploadsDirOverride ?? sessionUploadsDir();
  let targetPath = join(uploadsDir, savedFileName);
  let sessionId = getSessionId();
  let usesLocalUploads = getSessionUploadsDirOverride() === null && !isDiskless();
  let exclusiveWrite = noTurn && attachment.sha256 === undefined && usesLocalUploads;
  let moveMode = !noTurn && usesLocalUploads ? moveAsideMode : "off";
  if (moveMode === "count") await countWouldMoveAside(targetPath, fileBytes, totals);
  let existing =
    !noTurn || attachment.sha256 !== undefined
      ? "absent"
      : savedPath === targetPath
        ? "same"
        : exclusiveWrite
          ? await compareExistingFile(targetPath, fileBytes)
          : "absent";
  if (signal?.aborted) return recordDownloadFailure(totals, "stopped", 0);
  let startTime_2 = performance.now();
  let writeError;
  let takenStep;
  let compare;
  let publishFailure;
  let aborted = false;
  let movedAside = false;
  if (existing === "same") totals.unchangedOnDiskCount++;
  else if (existing === "changed" || existing === "unknown") totals.keptChangedFileCount++;
  else if (
    isStorageV5Enabled() &&
    fetchUpload !== undefined &&
    isValidKeySegment(sessionId) &&
    isValidKeySegment(savedFileName) &&
    (uploadsDirOverride === undefined || uploadsDirOverride === sessionUploadsDir()) &&
    (getSessionUploadsDirOverride() !== null || getLocalUploadsRoot() === null)
  ) {
    let storeTarget = STORAGE_SPACES.userConfigDir("uploads", [sessionId, savedFileName]);
    let firstWrite;
    let publishOutcome = isMoveAsideModeOn(moveMode)
      ? await publishWithMoveAside(
          async () => {
            if (signal?.aborted) {
              aborted = true;
              return "failed";
            }
            firstWrite = await writeWithPageCount(
              fetchUpload,
              savedFileName,
              servedPageCount,
              storeTarget,
              fileBytes,
              {
                mode: 384,
                precondition: {
                  type: "ifAbsent",
                },
              },
            );
            if (firstWrite.ok) return "published";
            let storageCode = storageErrorCode(firstWrite.error);
            return firstWrite.error.code === "AlreadyExists" ||
              storageCode === "ELOOP" ||
              storageCode === "ENXIO" ||
              storageCode === "EISDIR"
              ? "taken"
              : "failed";
          },
          dirname(targetPath),
          savedFileName,
          fileBytes,
          totals,
          keptFolders,
        )
      : undefined;
    if (aborted) return recordDownloadFailure(totals, "stopped", 0);
    let writeResult =
      firstWrite ??
      (await writeWithPageCount(
        fetchUpload,
        savedFileName,
        servedPageCount,
        storeTarget,
        fileBytes,
        exclusiveWrite
          ? {
              mode: 384,
              precondition: {
                type: "ifAbsent",
              },
            }
          : {
              mode: 384,
            },
      ));
    if (publishOutcome === "same") totals.unchangedOnDiskCount++;
    else if (typeof publishOutcome === "object") publishFailure = publishOutcome;
    else if (exclusiveWrite && !writeResult.ok && writeResult.error.code === "AlreadyExists")
      takenStep = lit("storage_backend");
    else if (!writeResult.ok) {
      writeError = formatStorageError(writeResult.error);
      totals.lastFailedWrite = {
        code:
          sanitizeErrnoTokenForTelemetry(storageErrorCode(writeResult.error)) ??
          fromEnum(writeResult.error.code),
        step: lit("storage_backend"),
      };
    }
  } else if (isDiskless()) {
    warnDisklessSettingsWrite("inbound_attachment", targetPath);
    writeError = "refused: this session is diskless and writes no files to this machine's disk";
    totals.lastFailedWrite = {
      code: lit("diskless"),
      step: lit("refused"),
    };
  } else {
    let writeStep = lit("mkdir");
    try {
      let attachmentsDir = await ensureAttachmentsDir(uploadsDir);
      try {
        if (signal?.aborted) return recordDownloadFailure(totals, "stopped", 0);
        writeStep = lit("write");
        let targetPath = join(attachmentsDir.at, savedFileName);
        let renameAfterLook = !exclusiveWrite && !isMoveAsideModeOn(moveMode);
        if (isMoveAsideModeOn(moveMode)) {
          let stagedPath = await writeIfMissing(targetPath, fileBytes, 384);
          let publishState = {
            renamesAfterALook: false,
          };
          try {
            let publishOutcome = await publishWithMoveAside(
              async () => {
                if (signal?.aborted) {
                  aborted = true;
                  return "failed";
                }
                return linkIntoPlace(stagedPath, targetPath, savedFileName, fileBytes, totals, publishState);
              },
              attachmentsDir.at,
              savedFileName,
              fileBytes,
              totals,
              keptFolders,
            );
            if (aborted) return recordDownloadFailure(totals, "stopped", 0);
            movedAside = publishOutcome === "published";
            if (publishOutcome === "same") totals.unchangedOnDiskCount++;
            else if (typeof publishOutcome === "object") publishFailure = publishOutcome;
          } finally {
            await retryTransient(() => unlink(stagedPath)).catch((error) => {
              if (getErrnoCode(error) !== "ENOENT") {
                debug(`the staged name of ${savedFileName} could not be removed: ${error}`);
                totals.stagedNameLeftCount++;
              }
            });
          }
        } else if (exclusiveWrite) {
          let stagedPath = await writeIfMissing(targetPath, fileBytes, 384);
          try {
            await link(stagedPath, targetPath);
            totals.linkedFileCount++;
          } catch (error) {
            if (getErrnoCode(error) === "EEXIST") takenStep = lit("link");
            else {
              debug(
                `link(2) failed for ${savedFileName} (${error}); looking at the name again, to rename into it only if it is free`,
              );
              compare = await compareExistingFile(targetPath, fileBytes);
              if (compare === "unknown") {
                writeStep = lit("look_after_link");
                throw error;
              }
              renameAfterLook = compare === "absent";
              takenStep = renameAfterLook ? undefined : lit("link");
            }
          } finally {
            await retryTransient(() => unlink(stagedPath)).catch((error) => {
              debug(`the staged name of ${savedFileName} could not be removed: ${error}`);
              totals.stagedNameLeftCount++;
            });
          }
        }
        if (renameAfterLook) {
          await writeFileAtomic(targetPath, fileBytes, 384);
          if (exclusiveWrite) totals.renamedAfterLinkRefusedCount++;
        }
      } finally {
        await attachmentsDir.release();
      }
    } catch (error) {
      writeError = `${error}`;
      totals.lastFailedWrite = {
        code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        step: writeStep,
      };
    }
  }
  if (publishFailure !== undefined && writeError === undefined) {
    writeError = publishFailure.why;
    totals.lastFailedWrite = {
      code: publishFailure.code,
      step: lit("move_aside"),
    };
  }
  if (takenStep !== undefined && writeError === undefined) {
    compare ??= await compareExistingFile(targetPath, fileBytes);
    if (compare === "same") totals.unchangedOnDiskCount++;
    else if (compare === "changed" || compare === "unknown") totals.keptChangedFileCount++;
    else {
      writeError =
        "not saved: something that is not a regular file (a link, a pipe or a folder) has this name and was left as it is, or what had the name was gone when checked again";
      totals.lastFailedWrite = {
        code: lit("EEXIST"),
        step: takenStep,
      };
    }
  }
  totals.slowestWriteMs = Math.max(totals.slowestWriteMs, performance.now() - startTime_2);
  if (writeError !== undefined) {
    debug(`write ${targetPath} failed: ${writeError}`);
    totals.failedWriteCount++;
    if (imageBlock) {
      totals.inlinedImageNotSavedCount++;
      return {
        imageBlock,
      };
    }
    return {
      failure: "write",
      ...(movedAside ? undefined : keptAsideResult(moveMode, keptFolders, targetPath, false, publishFailure)),
    };
  }
  let startTime_3 = performance.now();
  sha256 ??= computeContentHash(fileBytes);
  totals.slowestHashAfterWriteMs = Math.max(totals.slowestHashAfterWriteMs, performance.now() - startTime_3);
  if (registerDigest && attachment.sha256 === undefined && getSessionUploadsDirOverride() === null)
    try {
      rememberAttachmentDigest(await realpath(targetPath), sha256);
    } catch {
      debug(`registration skipped for ${targetPath}`);
    }
  rememberResolvedFile(
    attachment,
    {
      path: targetPath,
      size: fileBytes.length,
      sha256,
      bearer: computeContentHash(bearerToken),
    },
    downloadContext,
  );
  debug(`resolved ${attachment.file_uuid} \u2192 ${targetPath} (${fileBytes.length} bytes)`);
  if (imageBlock) {
    debug(`inlined ${attachment.file_uuid} (${fileBytes.length} bytes)`);
    return {
      imageBlock,
      path: targetPath,
    };
  }
  if (wantInlineImage) {
    debug(`inline ${attachment.file_uuid} fell back to @path ref`);
    return {
      path: targetPath,
      inlineFellBack: true,
      ...keptAsideResult(moveMode, keptFolders, targetPath, true),
    };
  }
  return {
    path: targetPath,
    ...keptAsideResult(moveMode, keptFolders, targetPath, true),
  };
}
//@ chunk-n4bsg1hp.js:19102-19269 placement
function rememberResolvedFile(attachment, resolved, context) {
  let registry = autoInboundFileRegistry(context);
  if (registry !== undefined) {
    registry.delete(foldFileUuid(attachment.file_uuid));
    if (registry.size >= MAX_REMEMBERED_FILES) {
      let oldestKey = registry.keys().next().value;
      if (oldestKey !== undefined) registry.delete(oldestKey);
    }
    registry.set(foldFileUuid(attachment.file_uuid), resolved);
  }
}
//@ chunk-n4bsg1hp.js:19269-19424 placement
var FAILURE_REASON_TEXT = {
  download: "it could not be downloaded",
  digest_mismatch: "it failed integrity verification",
  write: "it could not be written to the uploads directory",
};
//@ chunk-n4bsg1hp.js:19424-24801 placement
/**
 * 解析一条入站消息的全部附件（并发、数量上限）：成功的生成 `@"path"` 前缀或内联图片块，失败的生成 [SendFile: …] 说明；汇总遥测（bridge_attachment_resolve、下载耗时）并返回 {prefix, imageBlocks, deliveredCount, missingFiles, timing…}。
 */
async function resolveInboundAttachments(
  attachments,
  registerDigest,
  shouldQuery,
  fetchUpload,
  authOptions,
  downloadContext,
  startsTurn,
  uploadsDirOverride,
  aheadOfFiles,
  signal,
  inlineImages = true,
  namedByIdHash = false,
) {
  if (attachments.length === 0)
    return {
      prefix: "",
      imageBlocks: [],
      inlinedImagePaths: [],
      deliveredCount: 0,
    };
  debug(`resolving ${attachments.length} attachment(s)`);
  let refusedEarly = inboundAttachmentDownloadRegistry().refusedEarly;
  if (refusedEarly !== undefined && refusedEarly.size > 0)
    for (let attachment of attachments) refusedEarly.delete(foldFileUuid(attachment.file_uuid));
  let startTime = performance.now();
  let moveAsidesEligible =
    startsTurn !== false && getSessionUploadsDirOverride() === null && !isDiskless() && true;
  let moveAsideFlag = moveAsidesEligible
    ? getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_shelf", "off")
    : undefined;
  let moveAsideMode = !moveAsidesEligible
    ? undefined
    : moveAsideFlag === "tell"
      ? downloadContext === undefined
        ? "tell"
        : "on"
      : moveAsideFlag === "on" || moveAsideFlag === "count"
        ? moveAsideFlag
        : "off";
  let stats = {
    slowestTimeToHeadersMs: 0,
    slowestDownloadMs: 0,
    slowestJoinWaitMs: 0,
    slowestInlineImageBuildMs: 0,
    slowestInlineImageResizeMs: 0,
    slowestInlineImagePngPaletteMs: 0,
    slowestInlineImageByteBudgetMs: 0,
    slowestWriteMs: 0,
    slowestHashAfterWriteMs: 0,
    downloadedBytes: 0,
    downloadTryCount: 0,
    recoveredFileCount: 0,
    retriedAfter401Count: 0,
    slowest401RefreshWaitMs: 0,
    failedWriteCount: 0,
    inlinedImageNotSavedCount: 0,
    unchangedOnDiskCount: 0,
    keptChangedFileCount: 0,
    linkedFileCount: 0,
    renamedAfterLinkRefusedCount: 0,
    stagedNameLeftCount: 0,
    overMemoryLimitFileCount: 0,
    idsBySavedName: new Map(),
    movedAsideFileCount: 0,
    wouldMoveAsideFileCount: 0,
    wouldLeaveSameFileCount: 0,
    slowestWouldMoveLookMs: 0,
    moveAsideFailedCount: 0,
    whatStandsAside: moveAsideMode,
    uploadsRootCode:
      getSessionUploadsDirOverride() !== null
        ? 2
        : dirname(uploadsDirOverride ?? sessionUploadsDir()) === getLocalUploadsRoot()
          ? 1
          : 0,
    reusedFileCount: 0,
    prefetchedFileCount: 0,
    joinedInFlightCount: 0,
    inlinedPngSourceCount: 0,
    inlinedPngSourceMaybeTransparentCount: 0,
    inlinedPngSourceSentAsJpegCount: 0,
    modelCopyCount: 0,
    modelCopyMissedCount: 0,
    modelCopyMissedSentAsIsCount: 0,
    failedDownloads: {},
  };
  let filtered = attachments.filter((attachment) => typeof attachment.sha256 === "string");
  let attachmentCap = maxAttachmentsPerMessage(attachments);
  if (isBridgeFileLoginRefused()) await settleStoredLoginRefusal();
  if (!(
    downloadContext?.accessToken ??
    (isStorageV5Enabled() && authOptions !== undefined
      ? await getBridgeAccessTokenAsync(authOptions)
      : getBridgeAccessToken())
  )) {
    debug("skip: no oauth token");
    let attributes = {
      ...summarizeAttachmentResolution(attachments.slice(0, attachmentCap), 0, 0, stats, startTime),
      ...aheadOfFilesTelemetry(aheadOfFiles, uploadsDirOverride),
    };
    logFeatureSad("bridge_attachment_resolve", "no_token", attributes);
    logForDiagnosticsNoPII("warn", "bridge_attachment_download_timing", {
      outcome: "no_token",
      should_query: startsTurn,
      ...attributes,
    });
    let missing = allMissing(
      attachments.filter((attachment) => typeof attachment.sha256 !== "string"),
      "no_token",
    );
    if (filtered.length > 0) {
      let count = filtered.length - MAX_PEER_ATTACHMENTS;
      let kept = count > 0 ? filtered.slice(0, MAX_PEER_ATTACHMENTS) : filtered;
      emitPeerFileReceiveTelemetry("bridge", kept.length, 0);
      let capNote = count > 0 ? " " + peerFileCountCapNote(count) : "";
      return {
        prefix:
          kept
            .map((attachment) =>
              peerFileFailureNote(attachment.file_name, "it could not be downloaded (not signed in)"),
            )
            .join(" ") +
          capNote +
          (missing.length > 0 ? " " + missingAttachmentsNote(missing.length, missing.length) : "") +
          " ",
        imageBlocks: [],
        inlinedImagePaths: [],
        deliveredCount: 0,
        ...(missing.length > 0 && {
          missingFiles: missing,
        }),
      };
    }
    return {
      prefix: missingAttachmentsNote(missing.length, missing.length) + " ",
      imageBlocks: [],
      inlinedImagePaths: [],
      deliveredCount: 0,
      missingFiles: missing,
    };
  }
  let notes = [];
  let attachments_2 = attachments;
  let overCap = attachments_2.length > attachmentCap;
  if (overCap) {
    debug(`dropping ${attachments_2.length - attachmentCap} attachment(s) over the ${attachmentCap} cap`);
    if (filtered.length > 0) notes.push(peerFileCountCapNote(attachments_2.length - attachmentCap));
    attachments_2 = attachments_2.slice(0, attachmentCap);
  }
  let queryFiles = registerDigest && shouldQuery;
  let mayPrefetch = downloadContext === undefined && signal === undefined;
  let shouldDropSettled = mayPrefetch && attachments_2.length > MAX_LISTED_ATTACHMENTS;
  let resolveLimited = limitConcurrency(MAX_LISTED_ATTACHMENTS, (attachment) =>
    resolveInboundAttachment(
      attachment,
      registerDigest,
      queryFiles,
      stats,
      startsTurn === false ? DOWNLOAD_TRIES.noTurn : DOWNLOAD_TRIES.startsTurn,
      inlineImages,
      fetchUpload,
      authOptions,
      downloadContext,
      uploadsDirOverride,
      startsTurn === false,
      signal,
      namedByIdHash,
      moveAsideMode,
    ).finally(() => {
      if (shouldDropSettled) dropSettledTakenDownload(attachment);
    }),
  );
  let results;
  try {
    results = await Promise.all(attachments_2.map((attachment) => resolveLimited(attachment)));
  } finally {
    for (let attachment of mayPrefetch ? attachments_2 : []) dropSettledTakenDownload(attachment);
  }
  let pathRefs = [];
  let imageBlocks = [];
  let inlinedPaths = [];
  let imageFileUuids = [];
  let inlineFellBackCount = 0;
  let shaCount = 0;
  let peerSavedCount = 0;
  let digestMismatch = false;
  let missingFiles = [];
  let missingWithAside = 0;
  let asides = [];
  let writtenFiles = [];
  results.forEach((result, index) => {
    let attachment = attachments_2[index];
    let hasSha = typeof attachment.sha256 === "string";
    if (hasSha) shaCount++;
    if ("path" in result)
      writtenFiles.push({
        file_uuid: attachment.file_uuid,
        path: result.path,
        inlined: "imageBlock" in result,
      });
    if ("imageBlock" in result) {
      imageBlocks.push(result.imageBlock);
      imageFileUuids.push(attachment.file_uuid);
      if ("path" in result) inlinedPaths.push(result.path);
    } else if ("path" in result) {
      pathRefs.push(`@"${result.path}"`);
      if (result.inlineFellBack) inlineFellBackCount++;
      if (hasSha) peerSavedCount++;
      if (result.aside !== undefined) {
        asides.push(result.aside);
        notes.push(asideSentence(result.aside));
      }
    } else {
      if (result.failure === "digest_mismatch") digestMismatch = true;
      if (hasSha) {
        notes.push(peerFileFailureNote(attachment.file_name, FAILURE_REASON_TEXT[result.failure]));
        if (result.aside !== undefined) {
          asides.push(result.aside);
          notes.push(asideSentence(result.aside));
        }
      } else {
        missingFiles.push({
          file_uuid: attachment.file_uuid,
          reason: result.failure === "write" ? "write" : (result.cause ?? "download"),
        });
        if (result.aside !== undefined) {
          missingWithAside++;
          asides.push(result.aside);
          notes.push(asideSentence(result.aside));
        }
      }
    }
  });
  let overCapTail = filtered.length === 0 ? attachments.slice(attachmentCap) : [];
  if (missingFiles.length > 0 || overCapTail.length > 0) {
    missingFiles.push(...allMissing(overCapTail, "count_cap"));
    let reportableMissing = missingFiles.length - missingWithAside;
    if (reportableMissing > 0)
      notes.push(
        missingAttachmentsNote(reportableMissing, attachments_2.length - shaCount + overCapTail.length),
      );
  }
  if (overCapTail.length > 0) notes.push(`[a message takes at most ${attachmentCap} attachments]`);
  let diskFull =
    stats.lastFailedWrite?.code === "ENOSPC" && missingFiles.some((missing) => missing.reason === "write");
  if (diskFull) notes.push(`[${NO_SPACE_FOR_A_FILE}]`);
  if (shaCount > 0) emitPeerFileReceiveTelemetry("bridge", shaCount, peerSavedCount);
  let resolvedCount = pathRefs.length + imageBlocks.length;
  let attributes = {
    ...summarizeAttachmentResolution(attachments_2, resolvedCount, imageBlocks.length, stats, startTime),
    ...aheadOfFilesTelemetry(aheadOfFiles, uploadsDirOverride),
  };
  let outcome;
  if (resolvedCount === 0) {
    outcome = digestMismatch ? "digest_mismatch" : "all_failed";
    logFeatureBad("bridge_attachment_resolve", outcome, attributes);
  } else if (resolvedCount < attachments_2.length) {
    outcome = digestMismatch ? "digest_mismatch" : "partial_failed";
    logFeatureSad("bridge_attachment_resolve", outcome, attributes);
  } else if (overCap) {
    outcome = "over_count_cap";
    logFeatureSad("bridge_attachment_resolve", outcome, attributes);
  } else if (stats.inlinedImageNotSavedCount > 0) {
    outcome = "inlined_image_not_saved";
    logFeatureSad("bridge_attachment_resolve", outcome, attributes);
  } else {
    outcome = "ok";
    logFeatureOk("bridge_attachment_resolve", attributes);
  }
  let degraded = (outcome !== "ok" && outcome !== "over_count_cap") || stats.failedWriteCount > 0;
  logForDiagnosticsNoPII(degraded ? "warn" : "info", "bridge_attachment_download_timing", {
    outcome,
    should_query: startsTurn,
    ...attributes,
  });
  if (inlineFellBackCount > 0) logFeatureSad("bridge_attachment_inline_image", "fallback_path_ref");
  else if (imageBlocks.length > 0) logFeatureOk("bridge_attachment_inline_image");
  if (stats.modelCopyMissedCount > 0)
    logFeatureSad(
      "bridge_attachment_model_copy",
      stats.modelCopyMissedSentAsIsCount < stats.modelCopyMissedCount
        ? "fallback_path_ref"
        : "fallback_original",
    );
  else if (stats.modelCopyCount > 0) logFeatureOk("bridge_attachment_model_copy");
  let prefixParts = [...pathRefs, ...notes];
  return {
    prefix: prefixParts.length > 0 ? prefixParts.join(" ") + " " : "",
    imageBlocks,
    inlinedImagePaths: stats.inlinedImageNotSavedCount > 0 ? [] : inlinedPaths,
    ...(imageFileUuids.length > 0 && {
      imageFileUuids,
    }),
    deliveredCount: resolvedCount,
    ...(missingFiles.length > 0 && {
      missingFiles,
    }),
    ...(asides.length > 0 && {
      asideOutcomes: asides,
    }),
    ...(diskFull && {
      noSpace: diskFull,
    }),
    ...(writtenFiles.length > 0 && {
      writtenFiles,
    }),
    timing: {
      timeToHeadersMs: Math.round(stats.slowestTimeToHeadersMs),
      downloadMs: Math.round(stats.slowestDownloadMs),
      joinWaitMs: Math.round(stats.slowestJoinWaitMs),
      imageBuildMs: Math.round(stats.slowestInlineImageBuildMs),
      approxDownloadedBytes: Number(stats.downloadedBytes.toPrecision(2)),
      prefetchedFileCount: stats.prefetchedFileCount,
    },
  };
}
//@ chunk-n4bsg1hp.js:24801-25067 fingerprint = prependPathRefs (1)
function prependPathRefs(content, prefix) {
  if (!prefix) return content;
  if (typeof content === "string") return injectPeerFilePrefix(content, prefix);
  let i = content.findLastIndex((block) => block.type === "text");
  if (i !== -1) {
    let lastText = content[i];
    if (lastText.type === "text")
      return [
        ...content.slice(0, i),
        {
          ...lastText,
          text: injectPeerFilePrefix(lastText.text, prefix),
        },
        ...content.slice(i + 1),
      ];
  }
  return [
    ...content,
    {
      type: "text",
      text: prefix.trimEnd(),
    },
  ];
}
//@ chunk-n4bsg1hp.js:25067-25200 placement
function resolveAndPrepend_2(msg, content) {
  if (content.length === 0) return msg;
  let contentBlocks =
    typeof msg === "string"
      ? msg.trim() === ""
        ? []
        : [
            {
              type: "text",
              text: msg,
            },
          ]
      : dropEmptyTextBlocks(msg);
  return [...content, ...contentBlocks];
}
//@ chunk-n4bsg1hp.js:25200-25272 placement
function allMissing(attachments, reason) {
  return attachments.map((attachment) => ({
    file_uuid: attachment.file_uuid,
    reason,
  }));
}
//@ chunk-n4bsg1hp.js:25272-25600 placement
function contentWithPlannedPathRefs(message, content, uploadsDir, namedByIdHash = false) {
  let attachments = extractInboundAttachments(message);
  if (attachments.length === 0 || attachments.length > maxAttachmentsPerMessage(attachments)) return;
  let paths = [];
  for (let attachment of attachments) {
    let prefix = namedByIdHash
      ? shortContentHash(attachment.file_uuid)
      : attachment.file_uuid.slice(0, 8).replace(/[^a-zA-Z0-9_-]/g, "_");
    if (prefix === "") return;
    let fileName = hashPrefixedFileName(prefix, sanitizePeerFileName(attachment.file_name));
    paths.push(join(uploadsDir, fileName));
  }
  let mapped = paths.map((path) => `@"${path}"`);
  return {
    content: prependPathRefs(content ?? "", mapped.join(" ") + " "),
    refs: mapped,
    paths,
  };
}
//@ chunk-n4bsg1hp.js:25600-25969 placement
async function resolveAndPrepend(
  message,
  content,
  startsTurn,
  fetchUpload,
  authOptions,
  uploadsDirOverride,
  aheadOfFiles,
  inlineImages = true,
  namedByIdHash = false,
) {
  let content_2 = content ?? "";
  let attachments = extractInboundAttachments(message);
  if (attachments.length === 0)
    return {
      content: content_2,
      inlinedImagePaths: [],
    };
  let queryFiles = startsTurn && !(typeof content_2 === "string" && isTaggedPeerText(content_2));
  let { prefix, imageBlocks, deliveredCount, ...rest } = await resolveInboundAttachments(
    attachments,
    startsTurn,
    queryFiles,
    fetchUpload,
    authOptions,
    undefined,
    shouldQueryInboundAttachment(message),
    uploadsDirOverride,
    aheadOfFiles,
    undefined,
    inlineImages,
    namedByIdHash,
  );
  if (deliveredCount === 0 && typeof content_2 === "string" && content_2.trim() === "")
    return {
      content: prefix.trimEnd(),
      ...rest,
    };
  return {
    content: resolveAndPrepend_2(prependPathRefs(content_2, prefix), imageBlocks),
    ...rest,
  };
}
//@ chunk-n4bsg1hp.js:25969-26102 placement
function dropSettledTakenDownload(attachment) {
  let registry = inboundAttachmentDownloadRegistry();
  let foldedUuid = foldFileUuid(attachment.file_uuid);
  let entry = registry.byFileUuid.get(foldedUuid);
  if (entry?.taken !== undefined && entry.settledAt !== undefined) registry.byFileUuid.delete(foldedUuid);
}
//@ chunk-n4bsg1hp.js:26102-26163 placement
function maxAttachmentsPerMessage(attachments) {
  return attachments.every((attachment) => attachment.sha256 === undefined)
    ? MAX_ATTACHMENTS_WITHOUT_SHA
    : MAX_PEER_ATTACHMENTS;
}
//@ chunk-n4bsg1hp.js:26163-26198 placement
var MOVE_ASIDE_MODE_CODES = {
  off: 0,
  count: 1,
  on: 2,
  tell: 3,
};
//@ chunk-n4bsg1hp.js:26198-26241 placement
function isMoveAsideModeOn(mode) {
  return mode === "on" || mode === "tell";
}
//@ chunk-n4bsg1hp.js:26241-26471 placement
function keptAsideResult(mode, keptFolders, originalPath, saved, failure) {
  if (mode !== "tell") return;
  let [firstKept, ...restKept] = keptFolders.map((folder) =>
    join(dirname(originalPath), folder, basename(originalPath)),
  );
  if (firstKept !== undefined)
    return {
      aside: {
        path: originalPath,
        saved,
        keptAt: [firstKept, ...restKept],
      },
    };
  return failure?.leavesADifferentFile === true && !saved
    ? {
        aside: {
          path: originalPath,
          saved: false,
          keptAt: [],
        },
      }
    : undefined;
}
//@ chunk-n4bsg1hp.js:26471-27199 placement
function asideSentence({ path, saved, keptAt: [firstKept, secondKept] }, spoken = false) {
  if (firstKept === undefined) {
    let leftInPlace = `: "${path}" holds something else (possibly a copy changed during this session), which was left in place`;
    return spoken
      ? `A file attached to a user message was not saved${leftInPlace}`
      : `[attachment not saved${leftInPlace}]`;
  }
  let movedClause = `(possibly a copy changed during this session) was moved to "${firstKept}"${secondKept === undefined ? "" : `, and what then stood there was moved to "${secondKept}"`}`;
  if (saved) {
    let savedTo = ` "${path}"; what was at that path ${movedClause}`;
    return spoken
      ? `A file attached to a user message was saved to${savedTo}`
      : `[saved the attached file to${savedTo}]`;
  }
  let notAvailable = `, so what was just sent is not available; what was at "${path}" until now ${movedClause}`;
  return spoken
    ? `A file attached to a user message was not saved${notAvailable}`
    : `[attachment not saved${notAvailable}]`;
}
//@ chunk-n4bsg1hp.js:27199-27324 placement
function readAheadOfFiles(signal) {
  if (!signal || getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_ferry", false) !== true) return "off";
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_marten", false) === true ? "on_with_pdfs" : "on";
}
//@ chunk-n4bsg1hp.js:27324-27489 placement
function aheadOfFilesTelemetry(aheadOfFiles, uploadsDirOverride) {
  return aheadOfFiles === undefined
    ? {}
    : {
        ahead_of_files_flag_on: aheadOfFiles === "off" ? 0 : 1,
        ahead_of_files_on_with_pdfs: aheadOfFiles === "on_with_pdfs" ? 1 : 0,
        queued_ahead_of_files: uploadsDirOverride === undefined ? 0 : 1,
      };
}
//@ chunk-n4bsg1hp.js:27489-30455 placement
/**
 * 汇总入站附件处理统计用于遥测：文件数、已解析、下载次数、恢复/复用/预取/并入进行中数、内联图片与 PNG 转码、下载字节、失败分类、重名文件等。
 */
function summarizeAttachmentResolution(attachments, resolvedCount, inlinedImageCount, stats, startTime) {
  let sharedNameCount = 0;
  let sharedSavedNameSameIdFileCount = 0;
  let uuidV7Count = 0;
  for (let ids of stats.idsBySavedName.values()) {
    uuidV7Count += count(ids, (id) => UUID_V7_PATTERN.test(id));
    if (ids.length > 1) {
      sharedNameCount += ids.length;
      sharedSavedNameSameIdFileCount += count(ids, (id) => count(ids, (otherId) => otherId === id) > 1);
    }
  }
  return {
    file_count: attachments.length,
    resolved_count: resolvedCount,
    download_try_count: stats.downloadTryCount,
    recovered_file_count: stats.recoveredFileCount,
    reused_file_count: stats.reusedFileCount,
    prefetched_file_count: stats.prefetchedFileCount,
    joined_in_flight_count: stats.joinedInFlightCount,
    inlined_image_count: inlinedImageCount,
    ...describeAttachmentFailures(attachments),
    inlined_png_source_count: stats.inlinedPngSourceCount,
    inlined_png_source_maybe_transparent_count: stats.inlinedPngSourceMaybeTransparentCount,
    inlined_png_source_sent_as_jpeg_count: stats.inlinedPngSourceSentAsJpegCount,
    approx_downloaded_bytes: Number(stats.downloadedBytes.toPrecision(2)),
    duration_ms: Math.round(performance.now() - startTime),
    slowest_time_to_headers_ms: Math.round(stats.slowestTimeToHeadersMs),
    slowest_download_ms: Math.round(stats.slowestDownloadMs),
    slowest_join_wait_ms: Math.round(stats.slowestJoinWaitMs),
    slowest_inline_image_build_ms: Math.round(stats.slowestInlineImageBuildMs),
    slowest_inline_image_resize_ms: Math.round(stats.slowestInlineImageResizeMs),
    slowest_inline_image_png_palette_ms: Math.round(stats.slowestInlineImagePngPaletteMs),
    slowest_inline_image_byte_budget_ms: Math.round(stats.slowestInlineImageByteBudgetMs),
    slowest_write_ms: Math.round(stats.slowestWriteMs),
    slowest_hash_after_write_ms: Math.round(stats.slowestHashAfterWriteMs),
    ...stats.failedDownloads,
    ...(stats.retriedAfter401Count > 0 && {
      retried_after_401_count: stats.retriedAfter401Count,
    }),
    ...(stats.slowest401RefreshWaitMs > 0 && {
      slowest_401_refresh_wait_ms: Math.round(stats.slowest401RefreshWaitMs),
    }),
    ...(stats.failedWriteCount > 0 && {
      failed_write_count: stats.failedWriteCount,
    }),
    ...(stats.inlinedImageNotSavedCount > 0 && {
      inlined_image_not_saved_count: stats.inlinedImageNotSavedCount,
    }),
    ...(stats.lastFailedWrite !== undefined && {
      last_failed_write_code: stats.lastFailedWrite.code,
      last_failed_write_step: stats.lastFailedWrite.step,
    }),
    ...(stats.unchangedOnDiskCount > 0 && {
      unchanged_on_disk_count: stats.unchangedOnDiskCount,
    }),
    ...(stats.keptChangedFileCount > 0 && {
      kept_changed_file_count: stats.keptChangedFileCount,
    }),
    ...(stats.linkedFileCount > 0 && {
      linked_file_count: stats.linkedFileCount,
    }),
    ...(stats.renamedAfterLinkRefusedCount > 0 && {
      renamed_after_link_refused_count: stats.renamedAfterLinkRefusedCount,
    }),
    ...(stats.stagedNameLeftCount > 0 && {
      staged_name_left_count: stats.stagedNameLeftCount,
    }),
    ...(stats.overMemoryLimitFileCount > 0 && {
      over_memory_limit_file_count: stats.overMemoryLimitFileCount,
    }),
    ...(stats.movedAsideFileCount > 0 && {
      moved_aside_file_count: stats.movedAsideFileCount,
    }),
    ...(stats.wouldMoveAsideFileCount > 0 && {
      would_move_aside_file_count: stats.wouldMoveAsideFileCount,
    }),
    ...(stats.wouldLeaveSameFileCount > 0 && {
      would_leave_same_file_count: stats.wouldLeaveSameFileCount,
    }),
    ...(stats.slowestWouldMoveLookMs > 0 && {
      slowest_would_move_look_ms: Math.round(stats.slowestWouldMoveLookMs),
    }),
    ...(stats.moveAsideFailedCount > 0 && {
      move_aside_failed_count: stats.moveAsideFailedCount,
    }),
    ...(sharedNameCount > 0 && {
      shared_saved_name_file_count: sharedNameCount,
      shared_saved_name_same_id_file_count: sharedSavedNameSameIdFileCount,
    }),
    ...(uuidV7Count > 0 && {
      time_ordered_id_file_count: uuidV7Count,
    }),
    uploads_root_code: stats.uploadsRootCode,
    ...(stats.whatStandsAside !== undefined && {
      move_aside_mode_code: MOVE_ASIDE_MODE_CODES[stats.whatStandsAside],
    }),
  };
}
//@ chunk-n4bsg1hp.js:30455-30595 placement
function recordWriteFailure(stats, writeFailed) {
  stats.failedWriteCount++;
  stats.lastFailedWrite = {
    code: sanitizeErrnoForTelemetry(writeFailed) ?? lit("unknown"),
    step: lit("write_during_download"),
  };
  return {
    failure: "write",
  };
}
//@ chunk-n4bsg1hp.js:30595-30621 placement
var NOT_FOUND_HTTP_STATUSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n4bsg1hp.js:30595", () => {
  NOT_FOUND_HTTP_STATUSES = new Set([404, 410]);
});
//@ chunk-n4bsg1hp.js:30621-30943 placement
/**
 * 按失败类型累计 failedDownloads 计数（部分下载另计，记最后的 HTTP 状态），返回 {failure:"download", cause?}；404 类记为 not_found。
 */
function recordDownloadFailure(stats, failure, receivedBytes, httpStatus) {
  let failedDownloads = stats.failedDownloads;
  let counterKey = FAILURE_COUNTER_KEYS[failure];
  failedDownloads[counterKey] = (failedDownloads[counterKey] ?? 0) + 1;
  if (receivedBytes > 0)
    failedDownloads.partway_failed_count = (failedDownloads.partway_failed_count ?? 0) + 1;
  if (httpStatus !== undefined) failedDownloads.last_failed_http_status = httpStatus;
  if (failure === "too_large" || failure === "no_token")
    return {
      failure: "download",
      cause: failure,
    };
  return {
    failure: "download",
    ...(failure === "http_status" &&
      NOT_FOUND_HTTP_STATUSES.has(httpStatus) && {
        cause: "not_found",
      }),
  };
}
//@ chunk-n4bsg1hp.js:30943-31002 placement
function autoInboundFileRegistry(sessionUploadsOverride) {
  return sessionUploadsOverride === undefined && getSessionUploadsDirOverride() === null
    ? inboundAttachmentFileRegistry()
    : undefined;
}
//@ chunk-n4bsg1hp.js:31002-31090 placement
function writtenInUploadsDir(fileUuid, sessionUploadsOverride) {
  let entry = autoInboundFileRegistry(sessionUploadsOverride)?.get(foldFileUuid(fileUuid));
  return entry !== undefined && dirname(entry.path) === sessionUploadsDir() ? entry : undefined;
}
//@ chunk-n4bsg1hp.js:31090-31143 placement
function foldFileUuid(fileUuid) {
  return normalizeUuidOrNull(fileUuid) === null ? fileUuid : fileUuid.toLowerCase();
}
//@ chunk-n4bsg1hp.js:31143-31193 placement
function bridgeAttachmentEarlyReadsGate() {
  return getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_dapper_brooks", false);
}
//@ chunk-n4bsg1hp.js:31193-31249 placement
function bridgeAttachmentEarlyReadsStopped() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_twinkling_hoare", false) === true;
}
//@ chunk-n4bsg1hp.js:31249-31452 placement
function prefetchHoldWindow() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazel_lantern", 0);
  let isCcs = isCcsTenant();
  let maxHoldMs = isCcs ? CCS_PREFETCH_HOLD_MS : PREFETCH_HOLD_RANGE_MS.max;
  if (typeof featureValue_CACHED_MAY_BE_STALE !== "number" || !(featureValue_CACHED_MAY_BE_STALE > 0))
    return {
      ms: maxHoldMs,
      repeatRenews: false,
    };
  return {
    ms: Math.min(
      maxHoldMs,
      Math.max(PREFETCH_HOLD_RANGE_MS.min, Math.round(featureValue_CACHED_MAY_BE_STALE * 1000)),
    ),
    repeatRenews: !isCcs,
  };
}
//@ chunk-n4bsg1hp.js:31452-33852 placement
function prefetchInboundAttachments(attachments, { issuedAt, credentials, onlyThese = false }) {
  if (isEssentialTrafficOnly()) return 0;
  let gate = bridgeAttachmentEarlyReadsGate();
  if (!gate.value) {
    logPrefetchOutcome("bridge_attachment_prefetch_flag_off", {
      file_count: attachments.length,
      flag_served: FLAG_SERVED_BY_SOURCE[gate.source],
    });
    return 0;
  }
  let registry = inboundAttachmentDownloadRegistry();
  let holdWindow = prefetchHoldWindow();
  let fields = {
    file_count: attachments.length,
    started_count: 0,
    already_present_count: 0,
    held_limit_count: 0,
    start_budget_count: 0,
    skipped_count: 0,
  };
  let renewedCount = 0;
  let droppedCount = 0;
  let refusedCount = 0;
  let stoppedCount = 0;
  if (registry.earlyReadsStopped === true && !bridgeAttachmentEarlyReadsStopped()) {
    registry.earlyReadsStopped = undefined;
    registry.earlyReadsStopReported = undefined;
  }
  let areEarlyReadsStopped = registry.earlyReadsStopped === true;
  let renewedUuids = new Set();
  let ageMs = Date.now() - issuedAt;
  let isStale = ageMs > Math.max(PREFETCH_AGE_HOLD_MULTIPLE * holdWindow.ms, PREFETCH_MAX_AGE_MS);
  let candidates = isStale ? [] : attachments.slice(0, MAX_PEER_ATTACHMENTS);
  fields.skipped_count = attachments.length - candidates.length;
  if (onlyThese && !isStale) {
    let wantedUuids = new Set(attachments.map((attachment) => foldFileUuid(attachment.file_uuid)));
    for (let [fileUuid, entry] of registry.byFileUuid)
      if (!wantedUuids.has(fileUuid) && entry.release !== undefined && !entry.taken) {
        entry.release("dropped_unused");
        droppedCount++;
      }
  }
  for (let attachment of candidates) {
    let fileUuid = foldFileUuid(attachment.file_uuid);
    if (
      normalizeUuidOrNull(attachment.file_uuid) === null ||
      (attachment.file_size !== undefined && attachment.file_size > MAX_ATTACHMENT_BYTES)
    ) {
      fields.skipped_count++;
      continue;
    }
    let refusedAt = registry.refusedEarly?.get(fileUuid);
    if (refusedAt !== undefined) {
      if (performance.now() - refusedAt < REFUSED_EARLY_COOLDOWN_MS) {
        refusedCount++;
        continue;
      }
      registry.refusedEarly?.delete(fileUuid);
    }
    let entry = registry.byFileUuid.get(fileUuid);
    if (entry !== undefined || writtenInUploadsDir(attachment.file_uuid, undefined) !== undefined) {
      fields.already_present_count++;
      if (
        holdWindow.repeatRenews &&
        entry?.release !== undefined &&
        !entry.taken &&
        !renewedUuids.has(fileUuid)
      ) {
        schedulePrefetchExpiry(entry, holdWindow.ms);
        renewedUuids.add(fileUuid);
        renewedCount++;
      }
      continue;
    }
    if (areEarlyReadsStopped) {
      stoppedCount++;
      continue;
    }
    let statedBytes = nonNegativeSize(attachment.file_size);
    let admission = prefetchAdmission(registry, statedBytes);
    if (admission === "held_limit") fields.held_limit_count++;
    else if (admission === "start_budget") fields.start_budget_count++;
    else {
      startAttachmentPrefetch(
        registry,
        fileUuid,
        attachment.file_uuid,
        statedBytes,
        credentials,
        holdWindow.ms,
        holdWindow.repeatRenews,
      );
      renewedUuids.add(fileUuid);
      fields.started_count++;
    }
  }
  let heldTotals = heldPrefetchTotals(registry);
  let report = {
    ...fields,
    age_ms: Math.round(ageMs),
    held_file_count: heldTotals.count,
    approx_held_bytes: Number(heldTotals.bytes.toPrecision(2)),
    ...(holdWindow.repeatRenews && {
      hold_ms: holdWindow.ms,
      refreshed_count: renewedCount,
      renewed_since_last_report: registry.renewalsNotYetReported ?? 0,
    }),
    ...(onlyThese && {
      only_these: true,
      dropped_count: droppedCount,
    }),
    ...(refusedCount > 0 && {
      refused_before_count: refusedCount,
    }),
    ...(stoppedCount > 0 && {
      early_reads_stopped_count: stoppedCount,
    }),
  };
  let stopCount = registry.earlyReadsStopReported === true ? stoppedCount : 0;
  if (
    renewedCount + refusedCount + stopCount > 0 &&
    renewedCount === fields.already_present_count &&
    fields.file_count === renewedCount + refusedCount + stopCount &&
    droppedCount === 0
  ) {
    registry.renewalsNotYetReported = (registry.renewalsNotYetReported ?? 0) + renewedCount;
    return 0;
  }
  registry.renewalsNotYetReported = 0;
  if (stoppedCount > 0) registry.earlyReadsStopReported = true;
  if (isStale) logFeatureSad("bridge_attachment_prefetch", "stale", report);
  else if (stoppedCount > 0) logFeatureSad("bridge_attachment_prefetch", "mark_unseen_stop", report);
  else if (fields.held_limit_count > 0) logFeatureSad("bridge_attachment_prefetch", "held_limit", report);
  else if (fields.start_budget_count > 0) logFeatureSad("bridge_attachment_prefetch", "start_budget", report);
  else logFeatureOk("bridge_attachment_prefetch", report);
  logPrefetchOutcome(
    fields.started_count > 0
      ? "bridge_attachment_prefetch_started"
      : "bridge_attachment_prefetch_not_started",
    {
      ...report,
      stale: isStale,
    },
  );
  return fields.started_count;
}
//@ chunk-n4bsg1hp.js:33852-33884 placement = tryReadFileForSync (1)
function logPrefetchOutcome(eventName, fields) {
  logForDiagnosticsNoPII("info", eventName, fields);
}
//@ chunk-n4bsg1hp.js:33884-33926 placement
function nonNegativeSize(fileSize) {
  return fileSize !== undefined && fileSize > 0 ? fileSize : 0;
}
//@ chunk-n4bsg1hp.js:33926-34132 placement
/**
 * 判断能否再开始一个附件预取：清理窗口外的开始记录；持有中的预取数/字节超限返回 held_limit，近期开始数超预算返回 start_budget，否则 ok。
 */
function prefetchAdmission(registry, statedBytes) {
  let startTime = performance.now();
  let recentPrefetchStarts = registry.recentPrefetchStarts;
  while (recentPrefetchStarts.length > 0 && startTime - recentPrefetchStarts[0] >= PREFETCH_START_WINDOW_MS)
    recentPrefetchStarts.shift();
  let totals = heldPrefetchTotals(registry);
  if (totals.count >= MAX_HELD_PREFETCHES || totals.bytes + statedBytes > maxAttachmentBytes())
    return "held_limit";
  return recentPrefetchStarts.length < PREFETCH_START_BUDGET ? "ok" : "start_budget";
}
//@ chunk-n4bsg1hp.js:34132-34340 placement
function heldPrefetchTotals(registry) {
  let count = 0;
  let bytes = 0;
  for (let entry of registry.byFileUuid.values())
    if (entry.startedBy === "prefetch" && !entry.taken) {
      count++;
      bytes +=
        entry.settledAt === undefined
          ? Math.max(entry.receivedBytes, entry.statedBytes)
          : entry.receivedBytes;
    }
  return {
    count,
    bytes,
  };
}
//@ chunk-n4bsg1hp.js:34340-34385 placement
function releasePrefetchExpired(entry) {
  entry.release?.("expired_unused");
}
//@ chunk-n4bsg1hp.js:34385-34483 placement
function schedulePrefetchExpiry(prefetchEntry, ms) {
  clearTimeout(prefetchEntry.expiry);
  prefetchEntry.expiry = setTimeout(releasePrefetchExpired.bind(undefined, prefetchEntry), ms);
  prefetchEntry.expiry.unref();
}
//@ chunk-n4bsg1hp.js:34483-36521 placement
/**
 * 在消息到达前为一个 file_uuid 启动后台预取：带独立 AbortController 调用 resolveOne（快速静默超时、字节准入回调、served 标记埋点），
 * 把下载登记进 byFileUuid，结束后按结果记 bridge_attachment_prefetch_* 埋点、更新提前拒绝表。
 */
function startAttachmentPrefetch(
  registry,
  fileUuid,
  fileUuid_2,
  statedBytes,
  bridgeContext,
  ms,
  repeatRenews,
) {
  let abortController = new AbortController();
  let isReleased = false;
  let download = resolveOne({
    fileUuid: fileUuid_2,
    baseUrl: undefined,
    modelCopy: false,
    forPrefetch: true,
    maxBytes: MAX_ATTACHMENT_BYTES,
    spillTo: undefined,
    quietLimitMs: FAST_QUIET_LIMIT_MS,
    token: async () => {
      let bridgeAccessToken = await getBridgeAccessTokenAsync(bridgeContext);
      if (bridgeAccessToken) entry.bearer = computeContentHash(bridgeAccessToken);
      return bridgeAccessToken;
    },
    abort: abortController,
    totals: undefined,
    onServed: (markSeen) => {
      let stopsEarlyReads = !markSeen && bridgeAttachmentEarlyReadsStopped();
      if (stopsEarlyReads) registry.earlyReadsStopped = true;
      logPrefetchOutcome("bridge_attachment_prefetch_served", {
        mark_seen: markSeen,
        ...(!markSeen && {
          stops_early_reads: stopsEarlyReads,
        }),
      });
    },
    admitBytes: (receivedBytes) => {
      entry.receivedBytes = receivedBytes;
      if (entry.taken || heldPrefetchTotals(registry).bytes <= maxAttachmentBytes()) return true;
      entry.receivedBytes = 0;
      entry.statedBytes = 0;
      return false;
    },
  });
  let entry = newDownloadEntry("prefetch", abortController, download, undefined);
  entry.statedBytes = statedBytes;
  entry.release = (reason) => {
    if (registry.byFileUuid.get(fileUuid) !== entry || entry.taken) return;
    if (reason === "expired_unused" && repeatRenews && entry.settledAt === undefined) {
      schedulePrefetchExpiry(entry, ms);
      return;
    }
    isReleased = true;
    clearTimeout(entry.expiry);
    registry.byFileUuid.delete(fileUuid);
    abortController.abort();
    let fields = {
      download_finished: entry.settledAt !== undefined,
      approx_bytes: Number(entry.receivedBytes.toPrecision(2)),
      ...(reason === "dropped_unused" && {
        held_for_ms: Math.round(performance.now() - entry.startedAt),
      }),
    };
    logFeatureSad("bridge_attachment_prefetch_download", reason, fields);
    logPrefetchOutcome(`bridge_attachment_prefetch_${reason}`, fields);
  };
  schedulePrefetchExpiry(entry, ms);
  registry.recentPrefetchStarts.push(entry.startedAt);
  registry.byFileUuid.set(fileUuid, entry);
  download
    .then((result) => {
      if (!("failure" in result)) {
        if (repeatRenews && registry.byFileUuid.get(fileUuid) === entry && !entry.taken)
          schedulePrefetchExpiry(entry, ms);
        return;
      }
      if (registry.byFileUuid.get(fileUuid) === entry && !entry.taken) {
        registry.byFileUuid.delete(fileUuid);
        clearTimeout(entry.expiry);
      }
      let isRefusedEarly = result.failure === "http_status" && result.httpStatus === HTTP_CONFLICT_STATUS;
      if (isRefusedEarly && !entry.taken) {
        let refusedEarly = (registry.refusedEarly ??= new Map());
        refusedEarly.delete(fileUuid);
        if (refusedEarly.size >= MAX_REFUSED_EARLY)
          refusedEarly.delete(refusedEarly.keys().next().value ?? fileUuid);
        refusedEarly.set(fileUuid, performance.now());
      }
      if (isReleased) return;
      let fields = {
        duration_ms: Math.round(performance.now() - entry.startedAt),
        ...(result.httpStatus !== undefined && {
          http_status: result.httpStatus,
        }),
      };
      let didStallBeforeHeaders = isStalledBeforeHeaders(result);
      let failure = didStallBeforeHeaders ? "no_answer" : result.failure;
      if (isRefusedEarly) {
        logFeatureSad("bridge_attachment_prefetch_download", "refused_early", fields);
        logPrefetchOutcome("bridge_attachment_prefetch_failed", {
          ...fields,
          failure_code: PREFETCH_FAILURE_CODE_BEARER,
        });
        return;
      }
      let taken = entry.taken;
      let wasFileLost =
        taken?.by === "joiner" && taken.bearer === entry.bearer && shouldRedownload(entry, taken.at);
      if (wasFileLost) logFeatureBad("bridge_attachment_prefetch_download", failure, fields);
      else logFeatureSad("bridge_attachment_prefetch_download", failure, fields);
      logPrefetchOutcome(
        wasFileLost ? "bridge_attachment_prefetch_failed_file_lost" : "bridge_attachment_prefetch_failed",
        {
          ...fields,
          failure_code: didStallBeforeHeaders
            ? PREFETCH_FAILURE_CODE_HEADERS_TIMEOUT
            : FAILURE_CODES[result.failure],
        },
      );
    })
    .catch(logError);
}
//@ chunk-n4bsg1hp.js:36521-37058 placement
/**
 * 新建一条附件下载登记：bytes promise 结算时记录完成时间、失败类型、页数；由消息发起的下载直接标记为已取用。
 */
function newDownloadEntry(startedBy, abortController, download, bearer) {
  let entry = {
    startedBy,
    bytes: download.then((result) => {
      entry.settledAt = performance.now();
      if ("failure" in result) {
        entry.failure = result.failure;
        entry.headersTimedOut = isStalledBeforeHeaders(result);
        return null;
      }
      if ("writeFailed" in result) {
        entry.failure = "error";
        entry.writeFailed = result.writeFailed;
        return null;
      }
      if (!("data" in result)) return null;
      entry.servedPageCount = result.servedPageCount;
      return result.data;
    }),
    startedAt: performance.now(),
    settledAt: undefined,
    failure: undefined,
    headersTimedOut: false,
    receivedBytes: 0,
    statedBytes: 0,
    servedPageCount: undefined,
    abort: abortController,
    taken:
      startedBy === "message"
        ? {
            by: "starter",
          }
        : undefined,
    expiry: undefined,
    bearer,
  };
  return entry;
}
//@ chunk-n4bsg1hp.js:37058-37292 placement
function shouldRedownload(entry, takenAt) {
  let settledAgeMs = (entry.settledAt ?? performance.now()) - takenAt;
  if (entry.failure === undefined) return false;
  if (entry.startedBy === "prefetch" && entry.failure === "too_large") return !canSpillToUploads();
  return (
    entry.startedBy !== "prefetch" ||
    (entry.receivedBytes > 0 && entry.failure !== "stalled" && settledAgeMs > DOWNLOAD_DEADLINE_SLACK_MS)
  );
}
//@ chunk-n4bsg1hp.js:37292-37400 placement
function takeInFlightDownload(entry, at, bearer) {
  if (entry.taken) return false;
  entry.taken = {
    by: "joiner",
    at,
    bearer,
  };
  clearTimeout(entry.expiry);
  return true;
}
//@ chunk-n4bsg1hp.js:37400-37952 placement
/**
 * 记录一次预取结果的使用：附带是否在途、等待/下载耗时与近似字节数；校验通过记 used_joined/used_ready，否则按同一凭据（证明不符）或凭据已变分别记失败。
 */
function logPrefetchUse(prefetch, bytes, { inFlight, passes, sameBearer, waitedMs }) {
  let fields = {
    in_flight: inFlight,
    waited_ms: Math.round(waitedMs),
    download_ms: Math.round((prefetch.settledAt ?? performance.now()) - prefetch.startedAt),
    approx_bytes: Number(bytes.length.toPrecision(2)),
  };
  if (passes) {
    logFeatureOk("bridge_attachment_prefetch_download", fields);
    logPrefetchOutcome(
      inFlight ? "bridge_attachment_prefetch_used_joined" : "bridge_attachment_prefetch_used_ready",
      fields,
    );
  } else {
    logFeatureSad(
      "bridge_attachment_prefetch_download",
      sameBearer ? "attestation_mismatch" : "bearer_changed",
      fields,
    );
    logPrefetchOutcome(
      sameBearer
        ? "bridge_attachment_prefetch_attestation_mismatch"
        : "bridge_attachment_prefetch_bearer_changed",
      fields,
    );
  }
}
//@ chunk-n4bsg1hp.js:37952-38644 placement
async function downloadWithRetries(maxAttempts, startedAt, abortController, totals, options) {
  let entry = performance.now() - startedAt + DOWNLOAD_DEADLINE_SLACK_MS;
  for (let j = 0; ; j++) {
    let abortController_2 = new AbortController();
    let abortListener = () => abortController_2.abort();
    abortController.signal.addEventListener("abort", abortListener, {
      once: true,
    });
    if (abortController.signal.aborted) abortController_2.abort();
    if (totals !== undefined) totals.downloadTryCount++;
    options.admitBytes(0);
    let hasTimeForRetry =
      j + 1 < maxAttempts && performance.now() + FAST_QUIET_LIMIT_MS + MIN_RETRY_DELAY_MS <= entry;
    let result = await resolveOne({
      ...options,
      totals,
      abort: abortController_2,
      quietLimitMs: hasTimeForRetry ? FAST_QUIET_LIMIT_MS : DOWNLOAD_QUIET_LIMIT_MS,
    });
    abortController.signal.removeEventListener("abort", abortListener);
    if (!("failure" in result)) {
      if (totals !== undefined && j > 0 && !("writeFailed" in result)) totals.recoveredFileCount++;
      return result;
    }
    let isRetryable = isRetryableDownloadFailure(result);
    let startTime = performance.now();
    let remainingMs = entry - startTime;
    let min = Math.min(
      fullJitterBackoffMs({
        baseMs: RETRY_BASE_DELAY_MS,
        attempt: j,
        floorMs: MIN_RETRY_DELAY_MS,
      }),
      Math.max(MIN_RETRY_DELAY_MS, remainingMs),
    );
    let isFastStall = hasTimeForRetry && result.failure === "stalled";
    if (isRetryable && j + 1 < maxAttempts && (isFastStall || remainingMs >= MIN_RETRY_DELAY_MS)) {
      await sleep(min, abortController.signal);
      if (!abortController.signal.aborted) continue;
    }
    return result;
  }
}
//@ chunk-n4bsg1hp.js:38644-38757 placement
function signInRefreshState() {
  let registry = inboundAttachmentDownloadRegistry();
  registry.signInRefresh ??= {
    attempted: false,
    recoveries: {
      begun: 0,
      running: 0,
    },
  };
  return registry.signInRefresh;
}
//@ chunk-n4bsg1hp.js:38757-39585 placement
/**
 * 下载附件遇到 401 时刷新 bridge 令牌：同一会话只尝试一次 handleOAuth401Error（带超时与中断），返回刷新后的新令牌或 undefined。
 */
async function refreshTokenForDownload(staleToken, sessionId, credentials, signal, isForcedRefresh, stats) {
  let state = signInRefreshState();
  let abortController = new AbortController();
  let timeout = sleep(FAST_QUIET_LIMIT_MS, AbortSignal.any([signal, abortController.signal])).then(() => {
    return;
  });
  try {
    let winner = await Promise.race([
      getBridgeAccessTokenAsync(sessionId).catch(() => {
        return;
      }),
      timeout,
    ]);
    if (winner === staleToken) {
      let shouldReadFresh = state.attempted && state.recoveries.running === 0;
      if (!state.attempted) {
        state.attempted = true;
        let didForceRefresh = false;
        state.run = countOAuth401Recovery(state, () =>
          handleOAuth401Error(staleToken, sessionId, credentials, {
            onForcedRefreshOutcome: (outcome) => {
              if (TOKEN_REFRESH_OUTCOMES_BEFORE_POST.has(outcome)) state.attempted = false;
              else didForceRefresh = true;
            },
          }),
        )
          .then(async () => {
            if (!didForceRefresh && (await getBridgeAccessTokenAsync(sessionId)) !== staleToken)
              state.attempted = false;
          })
          .catch(logError);
      }
      if (!isForcedRefresh) {
        if (
          !(await Promise.race([getClaudeAIOAuthTokensAsync(sessionId).catch(() => null), timeout]))
            ?.refreshToken
        )
          return;
      }
      let startTime = performance.now();
      winner = await Promise.race([
        (state.run ?? Promise.resolve())
          .then(() => (shouldReadFresh ? readFreshOAuthAccessToken(sessionId) : undefined))
          .then(() => getBridgeAccessTokenAsync(sessionId))
          .catch(() => {
            return;
          }),
        timeout,
      ]);
      stats.slowest401RefreshWaitMs = Math.max(stats.slowest401RefreshWaitMs, performance.now() - startTime);
    }
    return winner && winner !== staleToken && !signal.aborted
      ? {
          bearer: winner,
          stamp: oauthRefreshLatchStamp(state.recoveries),
        }
      : undefined;
  } finally {
    abortController.abort();
  }
}
//@ chunk-n4bsg1hp.js:39585-41897 callgraph-fingerprint = resolveOne (0.249)
/**
 * 下载单个文件：GET {base}/api/oauth/files/{uuid}/content（可要 model_copy），带静默超时与字节上限，可溢写到磁盘；返回 data / file / failure。
 */
async function resolveOne({
  fileUuid,
  baseUrl,
  modelCopy,
  forPrefetch,
  maxBytes,
  spillTo,
  token,
  abort,
  quietLimitMs,
  totals,
  onServed,
  admitBytes,
}) {
  let label = forPrefetch ? "of a prefetched file" : fileUuid;
  let isQuietTimedOut = false;
  let hasHeaders = false;
  let onQuietTimeout = () => {
    isQuietTimedOut = true;
    abort.abort();
  };
  let timer = setTimeout(onQuietTimeout, quietLimitMs);
  let startTime = performance.now();
  let spill;
  try {
    if (isBridgeFileLoginRefused())
      await Promise.race([settleStoredLoginRefusal(), createChildAbortController(abort.signal)]);
    let winner = await Promise.race([token(), createChildAbortController(abort.signal)]);
    if (abort.signal.aborted)
      return isQuietTimedOut
        ? stalledFailure(hasHeaders)
        : {
            failure: "stopped",
          };
    if (!winner)
      return {
        failure: "no_token",
      };
    let url;
    try {
      url = `${baseUrl ?? getBridgeBaseUrl()}/api/oauth/files/${encodeURIComponent(fileUuid)}/content${modelCopy ? "?model_copy=inference_highres" : ""}`;
    } catch (error) {
      debug(
        `fetch ${label} has no URL: ${forPrefetch ? (error instanceof Error ? error.name : "a non-Error") : error}`,
      );
      return {
        failure: "error",
        final: true,
      };
    }
    if (isBridgeFileLoginRefused(url, winner)) {
      debug(`fetch ${label} refused: the stored login may not go there`);
      return {
        failure: "error",
        final: true,
      };
    }
    let response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${winner}`,
        "User-Agent": claudeCodeUserAgent(),
        ...(forPrefetch && {
          [X_ANTHROPIC_ATTACHMENT_PREFETCH]: "1",
        }),
      },
      ...(forPrefetch && {
        cache: "no-store",
      }),
      signal: abort.signal,
      ...getProxyFetchOptions({
        url,
      }),
    });
    hasHeaders = true;
    clearTimeout(timer);
    timer = setTimeout(onQuietTimeout, quietLimitMs);
    if (totals !== undefined)
      totals.slowestTimeToHeadersMs = Math.max(totals.slowestTimeToHeadersMs, performance.now() - startTime);
    if (response.status !== 200) {
      debug(`fetch ${label} failed: status=${response.status}`);
      await drainResponseBody(response);
      return isQuietTimedOut
        ? stalledFailure(hasHeaders)
        : {
            failure: "http_status",
            httpStatus: response.status,
          };
    }
    onServed?.(response.headers.get(PREFETCH_SEEN_HEADER.name)?.trim() === PREFETCH_SEEN_HEADER.value);
    let reader = response.body?.getReader();
    let chunks = [];
    let receivedBytes = 0;
    while (reader !== undefined) {
      let { done, value: chunk } = await reader.read();
      if (done) break;
      timer.refresh();
      receivedBytes += chunk.byteLength;
      if (receivedBytes > (spillTo === undefined ? maxBytes : MAX_PEER_SPOOL_BYTES)) {
        debug(`fetch ${label} over size cap (${receivedBytes} bytes so far)`);
        abort.abort();
        return {
          failure: "too_large",
        };
      }
      if (!admitBytes(receivedBytes)) {
        debug(`fetch ${label} stopped: unused prefetched files would exceed their limit in memory`);
        abort.abort();
        return {
          failure: "held_limit",
        };
      }
      chunks.push(chunk);
      if (spillTo !== undefined && receivedBytes > maxBytes) {
        clearTimeout(timer);
        try {
          spill ??= await spillTo();
          for (let chunk of chunks) await spill.write(chunk);
        } catch (error) {
          debug(`download of ${label} stopped, no retry: write to disk failed: ${error}`);
          abort.abort();
          return {
            writeFailed: error,
          };
        }
        timer = setTimeout(onQuietTimeout, DOWNLOAD_QUIET_LIMIT_MS);
        chunks = [];
      }
    }
    if (totals !== undefined) totals.downloadedBytes += receivedBytes;
    if (spill !== undefined)
      return await spill.finish().then(
        (file) => ({
          file,
        }),
        (writeFailed) => ({
          writeFailed,
        }),
      );
    return {
      data: Buffer.concat(chunks, receivedBytes),
      servedPageCount: parseServedPageCount(response.headers.get(X_SERVED_FILE_PAGE_COUNT)),
    };
  } catch (error) {
    debug(
      `fetch ${label} threw: ${forPrefetch ? (error instanceof Error ? error.name : "a non-Error") : error}`,
    );
    return isQuietTimedOut
      ? stalledFailure(hasHeaders)
      : {
          failure: abort.signal.aborted ? "stopped" : "error",
        };
  } finally {
    clearTimeout(timer);
    await spill?.discard();
    if (totals !== undefined)
      totals.slowestDownloadMs = Math.max(totals.slowestDownloadMs, performance.now() - startTime);
  }
}
//@ chunk-n4bsg1hp.js:41897-41974 layout
function parseServedPageCount(header) {
  return header !== null && /^[1-9][0-9]{0,2}$/.test(header) ? Number(header) : undefined;
}
//@ chunk-n4bsg1hp.js:41974-42146 placement
async function writeWithPageCount(spill, fileUuid, servedPageCount, ...chunks) {
  let pageCounts = (inboundAttachmentDownloadRegistry().pageCountsOfWrites ??= new Map());
  let record = {
    servedPageCount,
  };
  pageCounts.set(fileUuid, record);
  try {
    return await spill.write(...chunks);
  } finally {
    if (pageCounts.get(fileUuid) === record) pageCounts.delete(fileUuid);
  }
}
//@ chunk-n4bsg1hp.js:42146-42221 placement
function isStalledBeforeHeaders(result) {
  return "failure" in result && result.failure === "stalled" && result.beforeHeaders;
}
//@ chunk-n4bsg1hp.js:42221-42279 placement
function stalledFailure(hasHeaders) {
  return {
    failure: "stalled",
    beforeHeaders: !hasHeaders,
  };
}
//@ chunk-n4bsg1hp.js:42279-42404 placement = createChildAbortController (0.879)
function createChildAbortController(signal) {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(undefined);
      return;
    }
    signal.addEventListener("abort", () => resolve(undefined), {
      once: true,
    });
  });
}
//@ chunk-n4bsg1hp.js:42404-42465 placement
var NO_SPACE_FOR_A_FILE = "A file could not be saved: no space left on device";
//@ chunk-n4bsg1hp.js:42465-42611 placement
function missingAttachmentsNote(arrivedCount, missingCount) {
  return missingCount === 1
    ? "[attachment did not arrive]"
    : arrivedCount === missingCount
      ? `[${missingCount} attachments did not arrive]`
      : `[${arrivedCount} of ${missingCount} attachments did not arrive]`;
}
export {
  extractInboundAttachments,
  resolveAndPrepend,
  readAheadOfFiles,
  uploadsDir,
  writtenInUploadsDir,
  logPrefetchOutcome,
  prefetchInboundAttachments,
  describeAttachmentFailures,
  contentWithPlannedPathRefs,
  allMissing,
  isQueryableAttachmentFile,
  sanitizedAttachmentInnerName,
  asideSentence,
  NO_SPACE_FOR_A_FILE,
  shouldQueryInboundAttachment,
  resolveInboundAttachments,
  DOWNLOAD_TRIES,
  downloadWithRetries,
};
