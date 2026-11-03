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
import { IMAGE_LIMITS, MODEL_COPY_IMAGE_BYTES, MAX_IMAGE_SIDE_PX } from "../utils/truncateGraphemes.js";
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
import { Ph } from "../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
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
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, M, E } from "../../vendor/zod/v4/classic/schemas.js";
import { cleanupOldFilesInDirectory } from "../utils/cleanup.js";

//@ chunk-n4bsg1hp.js:2043-2126 placement
/**
 * 判断附件文件是否可被查询读取：有扩展名、不是二进制/notebook、不是特例扩展。
 */
function isQueryableAttachmentFile(e) {
  return (
    extname(e).toLowerCase().slice(1) !== "" &&
    !isImageOrPdfExtension(e) &&
    !hasBinaryExtension(e) &&
    !isNotebookPath(e)
  );
}
//@ chunk-n4bsg1hp.js:2126-2174 placement
/**
 * 用空目录 + 净化后的原始文件名生成入站附件的内部名字。
 */
function sanitizedAttachmentInnerName(e) {
  return hashPrefixedFileName("", sanitizePeerFileName(e.file_name));
}
//@ chunk-n4bsg1hp.js:2174-2632 placement
function describeAttachmentFailures(attachments) {
  let i = 0;
  let o = 0;
  let n = 0;
  let r = 0;
  let a = 0;
  let d = 0;
  for (let u of attachments) {
    if (u.is_image === true) continue;
    let _ = sanitizedAttachmentInnerName(u);
    let h = u.sha256 === undefined;
    if (IMAGE_EXTENSIONS.has(extname(_).toLowerCase().slice(1))) i++;
    else if (isImageOrPdfExtension(_)) {
      o++;
      if (h) d++;
    } else if (hasBinaryExtension(_)) {
      n++;
      if (h) {
        a++;
        d++;
      }
    } else r++;
  }
  let s = attachments.length > 0;
  return {
    binary_ext_file_count: n,
    pdf_file_count: o,
    text_like_file_count: r,
    image_ext_file_count: i,
    all_files_binary_ext_no_sha256: s && a === attachments.length ? 1 : 0,
    all_files_binary_ext_or_pdf_no_sha256: s && d === attachments.length ? 1 : 0,
  };
}
//@ chunk-n4bsg1hp.js:2632-2684 placement
function hasFetchUpload(e) {
  return e !== undefined && "fetchUpload" in e;
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
    let n = await lstat(path);
    if (n.isDirectory()) return "directory";
    if (!n.isFile()) return "other";
    if (!Buffer.isBuffer(content)) {
      if (n.size !== content.size) return "changed";
      if (!verifyHash) return "same";
    } else if (n.size !== content.length) return "changed";
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
  let d = join(uploadsDir, fileName);
  let s;
  let u = 0;
  let _ = "; an entry moved from this path earlier is in a .kept- folder beside it";
  try {
    for (let j = 1; ; j++) {
      let p;
      try {
        p = await attemptPublish();
      } catch (error) {
        await restoreMovedAside(s, uploadsDir, fileName, totals, keptFolders);
        throw error;
      }
      if (p === "published") return p;
      if (p === "failed") {
        await restoreMovedAside(s, uploadsDir, fileName, totals, keptFolders);
        return p;
      }
      let M = p === "taken" ? await compareExistingFile(d, content, true) : p;
      if (M === "same") {
        let date = new Date();
        await lutimes(d, date, date).catch((error) =>
          debug(`could not update the modification time of ${fileName}: ${error}`),
        );
        await utimes(uploadsDir, date, date).catch((error) =>
          debug(`could not update the modification time of the uploads folder: ${error}`),
        );
        return "same";
      }
      if (M === "directory")
        return {
          code: lit("EISDIR"),
          why: `not saved: a folder is at this path, and it was left there${u === 0 ? "" : _}`,
        };
      if (M === "unknown") {
        u -= (await restoreMovedAside(s, uploadsDir, fileName, totals, keptFolders)) ? 1 : 0;
        return {
          code: lit("look_failed"),
          why: `not saved: what is at this path could not be looked at, so it was left there${u === 0 ? "" : _}`,
        };
      }
      if (j === MAX_PUBLISH_TRIES) {
        u -= (await restoreMovedAside(s, uploadsDir, fileName, totals, keptFolders)) ? 1 : 0;
        return {
          code: lit("EEXIST"),
          why: `not saved: the path was taken on each of ${MAX_PUBLISH_TRIES} tries; anything there now was left there${u === 0 ? "" : _}`,
        };
      }
      if (M === "absent") continue;
      let E = `.kept-${new Date().toISOString().replace(/[-:.]/g, "")}-${randomUUID().slice(0, 8)}`;
      let O;
      try {
        let C = await readdir(uploadsDir);
        if (count(C, (I) => I.startsWith(".kept-")) >= MAX_KEPT_FOLDERS) {
          totals.moveAsideFailedCount++;
          return {
            code: lit("kept_cap"),
            why: `not saved: the uploads folder holds at least ${MAX_KEPT_FOLDERS} folders of kept copies (named .kept-...), so what was at this path was left there; removing old ones makes room${u === 0 ? "" : _}`,
            leavesADifferentFile: true,
          };
        }
        O = await createOwnedSubdir(uploadsDir, E);
        await retryFsOp(d, join(O.at, fileName));
        await s?.held.release().catch(() => {});
        s = {
          held: O,
          name: E,
        };
        O = undefined;
        u++;
        keptFolders.push(E);
        totals.movedAsideFileCount++;
      } catch (error) {
        await O?.release().catch(() => {});
        await rmdir(join(uploadsDir, E)).catch(() => {});
        let I = getErrnoCode(error) === "ENOENT" ? await compareExistingFile(d, content, true) : undefined;
        if (I !== "absent" && I !== "same") {
          totals.moveAsideFailedCount++;
          return {
            code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
            why: `not saved: what was at this path could not be moved into a folder of kept copies (${error}), and was left there${u === 0 ? "" : _}`,
            ...((I === undefined || I === "changed" || I === "other") && {
              leavesADifferentFile: true,
            }),
          };
        }
      }
    }
  } finally {
    await s?.held.release().catch(() => {});
  }
}
//@ chunk-n4bsg1hp.js:6123-6746 layout
async function restoreMovedAside(e, uploadsDir, fileName, totals, keptFolders) {
  if (e === undefined) return false;
  let a = join(uploadsDir, fileName);
  let d = join(e.held.at, fileName);
  try {
    let u = false;
    try {
      await link(d, a);
      u = true;
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") throw error;
    }
    if (u)
      await unlink(d).catch((error) =>
        debug(
          `${fileName} is back at its path, but a second name for it stays in its .kept- folder: ${error}`,
        ),
      );
    else {
      if (
        !(await lstat(a).then(
          () => false,
          (error) => getErrnoCode(error) === "ENOENT",
        ))
      )
        throw Error("the path is taken again, or could not be checked");
      await retryFsOp(d, a);
    }
  } catch (error) {
    debug(`could not move ${fileName} back out of its .kept- folder, where it stays: ${error}`);
    return false;
  }
  totals.movedAsideFileCount--;
  let index = keptFolders.indexOf(e.name);
  if (index !== -1) keptFolders.splice(index, 1);
  await rmdir(join(uploadsDir, e.name)).catch(() => {});
  return true;
}
//@ chunk-n4bsg1hp.js:6746-7132 layout
/**
 * 用 link(2) 原子放置文件（失败时改为看名字空闲后 rename）。
 */
async function linkIntoPlace(e, i, o, n, r, a) {
  if (!a.renamesAfterALook)
    try {
      await link(e, i);
      r.linkedFileCount++;
      return "published";
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") return "taken";
      debug(`link(2) failed for ${o} (${error}); looking at the name, to rename into it only if it is free`);
      a.renamesAfterALook = true;
    }
  let d = await compareExistingFile(i, n, true);
  if (d !== "absent") return d;
  await retryFsOp(e, i);
  r.renamedAfterLinkRefusedCount++;
  return "published";
}
//@ chunk-n4bsg1hp.js:7132-7385 layout
async function countWouldMoveAside(e, i, o) {
  let startTime = performance.now();
  let r = await compareExistingFile(e, i, true);
  o.slowestWouldMoveLookMs = Math.max(o.slowestWouldMoveLookMs, performance.now() - startTime);
  if (r === "changed" || r === "other") o.wouldMoveAsideFileCount++;
  else if (r === "same") o.wouldLeaveSameFileCount++;
}
//@ chunk-n4bsg1hp.js:7385-7430 layout
function canSpillToUploads() {
  return isRemoteManagedEnvironment() && getSessionUploadsDirOverride() === null && !isDiskless();
}
//@ chunk-n4bsg1hp.js:7430-7509 layout
var UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
//@ chunk-n4bsg1hp.js:7509-7611 layout
function recordSavedName(e, i, o) {
  e.idsBySavedName.set(i, [...(e.idsBySavedName.get(i) ?? []), o.file_uuid.toLowerCase()]);
}
//@ chunk-n4bsg1hp.js:7611-7749 fingerprint = attachmentSchema (0.694)
/**
 * 附件保存文件名：file_uuid 前缀（或稳定形式）+ 清洗后的原文件名。
 */
function savedFileNameFor(e, i) {
  return hashPrefixedFileName(
    i
      ? shortContentHash(e.file_uuid)
      : (e.file_uuid.slice(0, 8) || randomUUID().slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, "_"),
    sanitizePeerFileName(e.file_name),
  );
}
//@ chunk-n4bsg1hp.js:7749-7905 placement
function isRetryableDownloadFailure(e) {
  let httpStatus = e.httpStatus ?? 0;
  return (
    e.failure === "stalled" ||
    (e.failure === "error" && e.final !== true) ||
    (e.failure === "http_status" && (httpStatus >= 500 || httpStatus === 408 || httpStatus === 429))
  );
}
//@ chunk-n4bsg1hp.js:7905-7985 placement
function wantsModelCopy(e) {
  return (
    e > IMAGE_LIMITS.targetRawSize ||
    (e > MODEL_COPY_IMAGE_BYTES && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lucky_widget", false) === true)
  );
}
//@ chunk-n4bsg1hp.js:7985-8174 placement
function fetchModelCopy(fileUuid, baseUrl, o, abort, totals) {
  return resolveOne({
    fileUuid,
    baseUrl,
    modelCopy: true,
    forPrefetch: false,
    maxBytes: IMAGE_LIMITS.targetRawSize,
    spillTo: undefined,
    token: () => o,
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
  e,
  i,
  o,
  totals,
  r,
  a,
  d,
  s,
  u,
  _,
  h = false,
  p,
  M = false,
  E = "off",
) {
  let O = oauthRefreshLatchStamp(signInRefreshState().recoveries);
  if (isBridgeFileLoginRefused()) await settleStoredLoginRefusal();
  let C =
    u?.accessToken ??
    (isStorageV5Enabled() && s !== undefined ? await getBridgeAccessTokenAsync(s) : getBridgeAccessToken());
  if (!C) {
    debug("skip: no oauth token");
    return recordDownloadFailure(totals, "no_token", 0);
  }
  let staleToken = C;
  let R = o && e.is_image === true && e.sha256 === undefined;
  let D;
  let abortController = new AbortController();
  using Q = {
    [Symbol.dispose]: () => abortController.abort(),
  };
  let keptFolders = [];
  let content;
  let servedPageCount;
  let j;
  let H;
  let Fe = false;
  let we = 0;
  let Oe = r;
  try {
    let B = e.sha256 === undefined ? MAX_ATTACHMENT_BYTES : MAX_PEER_FILE_BYTES;
    let T =
      e.sha256 === undefined && canSpillToUploads()
        ? join(_ ?? sessionUploadsDir(), savedFileNameFor(e, M))
        : undefined;
    let L = e.sha256 === undefined && hasFetchUpload(d) ? d : undefined;
    if (
      typeof e.file_size === "number" &&
      e.file_size > (T === undefined && L === undefined ? B : MAX_PEER_SPOOL_BYTES)
    )
      return recordDownloadFailure(totals, "too_large", 0);
    if (
      R &&
      !isImageDecodingDisabled() &&
      typeof e.file_size === "number" &&
      wantsModelCopy(e.file_size) &&
      isFirstPartyProvider() &&
      !isEssentialTrafficOnly()
    )
      D = fetchModelCopy(e.file_uuid, u?.baseUrl, C, abortController, totals);
    let te = autoInboundFileRegistry(u);
    let x = writtenInUploadsDir(e.file_uuid, u);
    if (
      te !== undefined &&
      x !== undefined &&
      x.bearer === computeContentHash(C) &&
      (x.size <= B || x.path === T) &&
      (e.sha256 === undefined || e.sha256 === x.sha256)
    ) {
      let ne = x.size > B;
      if (ne && (await sha256OfFile(x.path, x.size)) === x.sha256) {
        recordSavedName(totals, basename(x.path), e);
        totals.reusedFileCount++;
        return {
          path: x.path,
        };
      }
      let ye = ne ? null : await readPeerFileBounded(x.path, x.size);
      if (ye !== null && computeContentHash(ye) === x.sha256) {
        content = ye;
        j = x.sha256;
        H = x.path;
        totals.reusedFileCount++;
      } else if (te.get(foldFileUuid(e.file_uuid)) === x) te.delete(foldFileUuid(e.file_uuid));
    }
    if (h && T !== undefined) {
      let ne = await lstat(T).catch(() => {
        return;
      });
      if (ne?.isFile() && ne.size > B) {
        recordSavedName(totals, basename(T), e);
        totals.reusedFileCount++;
        return {
          path: T,
        };
      }
    }
    let se = inboundAttachmentDownloadRegistry();
    let de = foldFileUuid(e.file_uuid);
    se.refusedEarly?.delete(de);
    let prefetch =
      content === undefined && u === undefined && p === undefined ? se.byFileUuid.get(de) : undefined;
    while (prefetch !== undefined) {
      let startTime = performance.now();
      let ye = takeInFlightDownload(prefetch, startTime, computeContentHash(C));
      let he = prefetch.settledAt === undefined;
      let We = prefetch.startedBy === "prefetch";
      let bytes = await prefetch.bytes;
      let Re = performance.now() - startTime;
      we += Re;
      if (We && he) {
        totals.joinedInFlightCount++;
        totals.slowestJoinWaitMs = Math.max(totals.slowestJoinWaitMs, Re);
        if (prefetch.headersTimedOut) Oe = Math.max(1, r - 1);
      }
      let ie = prefetch.bearer === computeContentHash(C);
      let A =
        bytes !== null &&
        ie &&
        bytes.length <= B &&
        (typeof e.sha256 !== "string" ||
          verifyPeerFileIntegrity(bytes, {
            sha256: e.sha256,
            file_size: e.file_size,
          }));
      if (A) {
        if (u === undefined) restoreOAuthRefreshLatch(signInRefreshState(), O);
        content = bytes;
        servedPageCount = prefetch.servedPageCount;
        Fe = true;
      } else if (
        bytes === null &&
        he &&
        ie &&
        shouldRedownload(prefetch, startTime) &&
        !(prefetch.failure === "too_large" && L !== undefined)
      )
        return "writeFailed" in prefetch
          ? recordWriteFailure(totals, prefetch.writeFailed)
          : recordDownloadFailure(totals, prefetch.failure ?? "error", prefetch.receivedBytes);
      if (We && bytes !== null) {
        if (A) totals.prefetchedFileCount++;
        if (ye)
          logPrefetchUse(prefetch, bytes, {
            inFlight: he,
            passes: A,
            sameBearer: ie,
            waitedMs: Re,
          });
      }
      let Z = content === undefined ? se.byFileUuid.get(de) : undefined;
      prefetch =
        Z !== prefetch && Z?.startedBy === "message" && Z.bearer === computeContentHash(C) ? Z : undefined;
    }
    if (content === undefined) {
      let abortController = new AbortController();
      let ye = () => abortController.abort();
      p?.addEventListener("abort", ye, {
        once: true,
      });
      if (p?.aborted) ye();
      let he;
      let We = 0;
      let _e = {
        fileUuid: e.file_uuid,
        baseUrl: u?.baseUrl,
        modelCopy: false,
        forPrefetch: false,
        maxBytes: L !== undefined && typeof e.file_size === "number" && e.file_size > B ? 0 : B,
        spillTo:
          T === undefined ? undefined : async () => openSpill(await ensureAttachmentsDir(dirname(T)), T),
        token: () => staleToken,
        admitBytes: (A) => {
          We = A;
          if (he !== undefined) he.receivedBytes = A;
          return true;
        },
      };
      let download = downloadWithRetries(Oe, we, abortController, totals, _e)
        .then(async (A) => {
          if (
            u !== undefined ||
            !("failure" in A) ||
            A.httpStatus !== 401 ||
            getBridgeTokenOverride() !== undefined
          )
            return A;
          let Z = await refreshTokenForDownload(staleToken, s, d, abortController.signal, a, totals);
          if (Z === undefined) return A;
          staleToken = Z.bearer;
          O = Z.stamp;
          if (he !== undefined) he.bearer = computeContentHash(Z.bearer);
          totals.retriedAfter401Count++;
          let pe = await downloadWithRetries(1, 0, abortController, totals, _e);
          if (!("failure" in pe) && !("writeFailed" in pe)) totals.recoveredFileCount++;
          return pe;
        })
        .catch((error) => {
          logError(error);
          return {
            failure: "error",
          };
        });
      if (u === undefined && p === undefined && bridgeAttachmentEarlyReadsGate().value) {
        he = newDownloadEntry("message", abortController, download, computeContentHash(C));
        se.byFileUuid.set(de, he);
      }
      let ie = await download;
      p?.removeEventListener("abort", ye);
      if ("failure" in ie && ie.failure === "too_large" && L !== undefined && !p?.aborted) {
        let A = savedFileNameFor(e, M);
        let Z = await L.fetchUpload(A, e.file_uuid);
        if (Z.ok) {
          recordSavedName(totals, A, e);
          totals.overMemoryLimitFileCount++;
          return {
            path: join(_ ?? sessionUploadsDir(), A),
          };
        }
        if (!Z.tooLarge) {
          debug(`the machine with the uploads folder could not download ${e.file_uuid}: ${Z.error}`);
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
      if ("failure" in ie) return recordDownloadFailure(totals, ie.failure, We, ie.httpStatus);
      if (u === undefined) {
        restoreOAuthRefreshLatch(signInRefreshState(), O);
        resetAuthFailureTracking();
      }
      if ("writeFailed" in ie) return recordWriteFailure(totals, ie.writeFailed);
      if ("file" in ie) {
        let { file } = ie;
        let Z = lit("link");
        let pe = !h ? E : "off";
        let Ne;
        try {
          if (p?.aborted) return recordDownloadFailure(totals, "stopped", 0);
          recordSavedName(totals, basename(file.placeAt), e);
          if (pe === "count") {
            await countWouldMoveAside(file.placeAt, file, totals);
            if (p?.aborted) return recordDownloadFailure(totals, "stopped", 0);
          }
          let Ee = !h && !isMoveAsideModeOn(pe);
          if (isMoveAsideModeOn(pe)) {
            Z = lit("write");
            let Ue = false;
            let Ge = {
              renamesAfterALook: false,
            };
            let fileName = basename(file.placeAt);
            let tt = await publishWithMoveAside(
              async () => {
                if (p?.aborted) {
                  Ue = true;
                  return "failed";
                }
                return linkIntoPlace(file.path, file.placeAt, fileName, file, totals, Ge);
              },
              dirname(file.placeAt),
              fileName,
              file,
              totals,
              keptFolders,
            );
            if (Ue) return recordDownloadFailure(totals, "stopped", 0);
            if (tt === "same") totals.unchangedOnDiskCount++;
            else if (typeof tt === "object") Ne = tt;
          } else if (h)
            try {
              await link(file.path, file.placeAt);
              totals.linkedFileCount++;
            } catch (error) {
              let Ge = getErrnoCode(error) === "EEXIST";
              let Te = await compareExistingFile(file.placeAt, file);
              if (Te === "same") totals.unchangedOnDiskCount++;
              else if (Te === "changed" || (Te === "unknown" && Ge)) totals.keptChangedFileCount++;
              else if (Te === "absent" && !Ge) Ee = true;
              else throw error;
            }
          if (Ee) {
            Z = lit("rename");
            await retryFsOp(file.path, file.placeAt);
            if (h) totals.renamedAfterLinkRefusedCount++;
          }
        } catch (error) {
          debug(`write ${file.target} failed: ${error}`);
          totals.failedWriteCount++;
          totals.lastFailedWrite = {
            code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
            step: Z,
          };
          return {
            failure: "write",
            ...keptAsideResult(pe, keptFolders, file.target, false),
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
        if (Ne !== undefined) {
          debug(`write ${file.target} failed: ${Ne.why}`);
          totals.failedWriteCount++;
          totals.lastFailedWrite = {
            code: Ne.code,
            step: lit("move_aside"),
          };
          return {
            failure: "write",
            ...keptAsideResult(pe, keptFolders, file.target, false, Ne),
          };
        }
        totals.overMemoryLimitFileCount++;
        rememberResolvedFile(
          e,
          {
            path: file.target,
            size: file.size,
            sha256: file.sha256,
            bearer: computeContentHash(staleToken),
          },
          u,
        );
        return {
          path: file.target,
          ...keptAsideResult(pe, keptFolders, file.target, true),
        };
      }
      content = ie.data;
      servedPageCount = ie.servedPageCount;
    }
  } catch (error) {
    debug(`fetch ${e.file_uuid} threw: ${error}`);
    return recordDownloadFailure(totals, "error", 0);
  }
  if (
    typeof e.sha256 === "string" &&
    !Fe &&
    !verifyPeerFileIntegrity(content, {
      sha256: e.sha256,
      file_size: e.file_size,
    })
  ) {
    debug(`fetch ${e.file_uuid} failed integrity verification`);
    return {
      failure: "digest_mismatch",
    };
  }
  let Ae = {
    resizeMs: 0,
    pngPaletteMs: 0,
    byteBudgetMs: 0,
  };
  let Me = content.length > IMAGE_LIMITS.targetRawSize;
  let xe =
    R &&
    !isImageDecodingDisabled() &&
    Ph(content) !== null &&
    (imageExceedsDimension(content, MAX_IMAGE_SIDE_PX) || wantsModelCopy(content.length)) &&
    isFirstPartyProvider() &&
    !isEssentialTrafficOnly();
  let Se;
  if (xe) {
    let B = staleToken === C ? await D : undefined;
    if (B === undefined || ("failure" in B && isRetryableDownloadFailure(B)))
      B = await fetchModelCopy(e.file_uuid, u?.baseUrl, staleToken, new AbortController(), totals);
    if ("data" in B) {
      let webpHeader = parseWebpHeader(content);
      let webpHeader_2 = parseWebpHeader(B.data);
      let te =
        webpHeader !== undefined &&
        webpHeader_2 !== undefined &&
        Math.max(webpHeader_2.width, webpHeader_2.height) <= MAX_INLINE_IMAGE_DIMENSION &&
        (Math.max(webpHeader_2.width, webpHeader_2.height) < Math.max(webpHeader.width, webpHeader.height) ||
          Math.min(webpHeader_2.width, webpHeader_2.height) < Math.min(webpHeader.width, webpHeader.height));
      if (
        Me ||
        (!imageExceedsDimension(B.data, MAX_IMAGE_SIDE_PX) &&
          (imageExceedsDimension(content, MAX_IMAGE_SIDE_PX) || (B.data.length < content.length && !te)))
      )
        Se = B.data;
    }
  }
  let startTime = performance.now();
  let ve = (B) =>
    convertImagesToBlocks(B, IMAGE_LIMITS, {
      timings: Ae,
    }).catch((error) => {
      debug(`inline ${e.file_uuid} threw: ${error}`);
      return null;
    });
  let Le = Se ? await ve(Se) : null;
  let re = Le ?? (R ? await ve(content) : null);
  totals.slowestInlineImageBuildMs = Math.max(
    totals.slowestInlineImageBuildMs,
    performance.now() - startTime,
  );
  totals.slowestInlineImageResizeMs = Math.max(totals.slowestInlineImageResizeMs, Ae.resizeMs);
  totals.slowestInlineImagePngPaletteMs = Math.max(totals.slowestInlineImagePngPaletteMs, Ae.pngPaletteMs);
  totals.slowestInlineImageByteBudgetMs = Math.max(totals.slowestInlineImageByteBudgetMs, Ae.byteBudgetMs);
  if (Le) totals.modelCopyCount++;
  else if (xe) {
    totals.modelCopyMissedCount++;
    if (re) totals.modelCopyMissedSentAsIsCount++;
  }
  if (re && detectImageFormatFromBuffer(content) === "image/png") {
    totals.inlinedPngSourceCount++;
    if (pngMayHaveTransparency(content)) totals.inlinedPngSourceMaybeTransparentCount++;
    if (re.source.type === "base64" && re.source.media_type === "image/jpeg")
      totals.inlinedPngSourceSentAsJpegCount++;
  }
  let fileName = re
    ? hashPrefixedFileName(
        M ? shortContentHash(e.file_uuid) : randomUUID().slice(0, 8),
        `image.${MIME_TO_EXTENSION[detectImageFormatFromBuffer(content)]}`,
      )
    : savedFileNameFor(e, M);
  recordSavedName(totals, fileName, e);
  let $e = _ ?? sessionUploadsDir();
  let W = join($e, fileName);
  let sessionId = getSessionId();
  let Ie = getSessionUploadsDirOverride() === null && !isDiskless();
  let ce = h && e.sha256 === undefined && Ie;
  let ae = !h && Ie ? E : "off";
  if (ae === "count") await countWouldMoveAside(W, content, totals);
  let me =
    !h || e.sha256 !== undefined
      ? "absent"
      : H === W
        ? "same"
        : ce
          ? await compareExistingFile(W, content)
          : "absent";
  if (p?.aborted) return recordDownloadFailure(totals, "stopped", 0);
  let startTime_2 = performance.now();
  let fe;
  let Ce;
  let y;
  let G;
  let ee = false;
  let be = false;
  if (me === "same") totals.unchangedOnDiskCount++;
  else if (me === "changed" || me === "unknown") totals.keptChangedFileCount++;
  else if (
    isStorageV5Enabled() &&
    d !== undefined &&
    isValidKeySegment(sessionId) &&
    isValidKeySegment(fileName) &&
    (_ === undefined || _ === sessionUploadsDir()) &&
    (getSessionUploadsDirOverride() !== null || getLocalUploadsRoot() === null)
  ) {
    let B = STORAGE_SPACES.userConfigDir("uploads", [sessionId, fileName]);
    let T;
    let L = isMoveAsideModeOn(ae)
      ? await publishWithMoveAside(
          async () => {
            if (p?.aborted) {
              ee = true;
              return "failed";
            }
            T = await writeWithPageCount(d, fileName, servedPageCount, B, content, {
              mode: 384,
              precondition: {
                type: "ifAbsent",
              },
            });
            if (T.ok) return "published";
            let x = storageErrorCode(T.error);
            return T.error.code === "AlreadyExists" || x === "ELOOP" || x === "ENXIO" || x === "EISDIR"
              ? "taken"
              : "failed";
          },
          dirname(W),
          fileName,
          content,
          totals,
          keptFolders,
        )
      : undefined;
    if (ee) return recordDownloadFailure(totals, "stopped", 0);
    let te =
      T ??
      (await writeWithPageCount(
        d,
        fileName,
        servedPageCount,
        B,
        content,
        ce
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
    if (L === "same") totals.unchangedOnDiskCount++;
    else if (typeof L === "object") G = L;
    else if (ce && !te.ok && te.error.code === "AlreadyExists") Ce = lit("storage_backend");
    else if (!te.ok) {
      fe = formatStorageError(te.error);
      totals.lastFailedWrite = {
        code: sanitizeErrnoTokenForTelemetry(storageErrorCode(te.error)) ?? fromEnum(te.error.code),
        step: lit("storage_backend"),
      };
    }
  } else if (isDiskless()) {
    warnDisklessSettingsWrite("inbound_attachment", W);
    fe = "refused: this session is diskless and writes no files to this machine's disk";
    totals.lastFailedWrite = {
      code: lit("diskless"),
      step: lit("refused"),
    };
  } else {
    let B = lit("mkdir");
    try {
      let attachmentsDir = await ensureAttachmentsDir($e);
      try {
        if (p?.aborted) return recordDownloadFailure(totals, "stopped", 0);
        B = lit("write");
        let L = join(attachmentsDir.at, fileName);
        let te = !ce && !isMoveAsideModeOn(ae);
        if (isMoveAsideModeOn(ae)) {
          let x = await writeIfMissing(L, content, 384);
          let se = {
            renamesAfterALook: false,
          };
          try {
            let de = await publishWithMoveAside(
              async () => {
                if (p?.aborted) {
                  ee = true;
                  return "failed";
                }
                return linkIntoPlace(x, L, fileName, content, totals, se);
              },
              attachmentsDir.at,
              fileName,
              content,
              totals,
              keptFolders,
            );
            if (ee) return recordDownloadFailure(totals, "stopped", 0);
            be = de === "published";
            if (de === "same") totals.unchangedOnDiskCount++;
            else if (typeof de === "object") G = de;
          } finally {
            await retryTransient(() => unlink(x)).catch((error) => {
              if (getErrnoCode(error) !== "ENOENT") {
                debug(`the staged name of ${fileName} could not be removed: ${error}`);
                totals.stagedNameLeftCount++;
              }
            });
          }
        } else if (ce) {
          let x = await writeIfMissing(L, content, 384);
          try {
            await link(x, L);
            totals.linkedFileCount++;
          } catch (error) {
            if (getErrnoCode(error) === "EEXIST") Ce = lit("link");
            else {
              debug(
                `link(2) failed for ${fileName} (${error}); looking at the name again, to rename into it only if it is free`,
              );
              y = await compareExistingFile(L, content);
              if (y === "unknown") {
                B = lit("look_after_link");
                throw error;
              }
              te = y === "absent";
              Ce = te ? undefined : lit("link");
            }
          } finally {
            await retryTransient(() => unlink(x)).catch((error) => {
              debug(`the staged name of ${fileName} could not be removed: ${error}`);
              totals.stagedNameLeftCount++;
            });
          }
        }
        if (te) {
          await writeFileAtomic(L, content, 384);
          if (ce) totals.renamedAfterLinkRefusedCount++;
        }
      } finally {
        await attachmentsDir.release();
      }
    } catch (error) {
      fe = `${error}`;
      totals.lastFailedWrite = {
        code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        step: B,
      };
    }
  }
  if (G !== undefined && fe === undefined) {
    fe = G.why;
    totals.lastFailedWrite = {
      code: G.code,
      step: lit("move_aside"),
    };
  }
  if (Ce !== undefined && fe === undefined) {
    y ??= await compareExistingFile(W, content);
    if (y === "same") totals.unchangedOnDiskCount++;
    else if (y === "changed" || y === "unknown") totals.keptChangedFileCount++;
    else {
      fe =
        "not saved: something that is not a regular file (a link, a pipe or a folder) has this name and was left as it is, or what had the name was gone when checked again";
      totals.lastFailedWrite = {
        code: lit("EEXIST"),
        step: Ce,
      };
    }
  }
  totals.slowestWriteMs = Math.max(totals.slowestWriteMs, performance.now() - startTime_2);
  if (fe !== undefined) {
    debug(`write ${W} failed: ${fe}`);
    totals.failedWriteCount++;
    if (re) {
      totals.inlinedImageNotSavedCount++;
      return {
        imageBlock: re,
      };
    }
    return {
      failure: "write",
      ...(be ? undefined : keptAsideResult(ae, keptFolders, W, false, G)),
    };
  }
  let startTime_3 = performance.now();
  j ??= computeContentHash(content);
  totals.slowestHashAfterWriteMs = Math.max(totals.slowestHashAfterWriteMs, performance.now() - startTime_3);
  if (i && e.sha256 === undefined && getSessionUploadsDirOverride() === null)
    try {
      rememberAttachmentDigest(await realpath(W), j);
    } catch {
      debug(`registration skipped for ${W}`);
    }
  rememberResolvedFile(
    e,
    {
      path: W,
      size: content.length,
      sha256: j,
      bearer: computeContentHash(staleToken),
    },
    u,
  );
  debug(`resolved ${e.file_uuid} \u2192 ${W} (${content.length} bytes)`);
  if (re) {
    debug(`inlined ${e.file_uuid} (${content.length} bytes)`);
    return {
      imageBlock: re,
      path: W,
    };
  }
  if (R) {
    debug(`inline ${e.file_uuid} fell back to @path ref`);
    return {
      path: W,
      inlineFellBack: true,
      ...keptAsideResult(ae, keptFolders, W, true),
    };
  }
  return {
    path: W,
    ...keptAsideResult(ae, keptFolders, W, true),
  };
}
//@ chunk-n4bsg1hp.js:19102-19269 placement
function rememberResolvedFile(e, i, o) {
  let n = autoInboundFileRegistry(o);
  if (n !== undefined) {
    n.delete(foldFileUuid(e.file_uuid));
    if (n.size >= MAX_REMEMBERED_FILES) {
      let r = n.keys().next().value;
      if (r !== undefined) n.delete(r);
    }
    n.set(foldFileUuid(e.file_uuid), i);
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
async function resolveInboundAttachments(attachments, i, o, n, r, a, d, s, u, _, h = true, p = false) {
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
  let O = d !== false && getSessionUploadsDirOverride() === null && !isDiskless() && true;
  let C = O ? getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_shelf", "off") : undefined;
  let I = !O
    ? undefined
    : C === "tell"
      ? a === undefined
        ? "tell"
        : "on"
      : C === "on" || C === "count"
        ? C
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
    whatStandsAside: I,
    uploadsRootCode:
      getSessionUploadsDirOverride() !== null
        ? 2
        : dirname(s ?? sessionUploadsDir()) === getLocalUploadsRoot()
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
  let N = maxAttachmentsPerMessage(attachments);
  if (isBridgeFileLoginRefused()) await settleStoredLoginRefusal();
  if (!(
    a?.accessToken ??
    (isStorageV5Enabled() && r !== undefined ? await getBridgeAccessTokenAsync(r) : getBridgeAccessToken())
  )) {
    debug("skip: no oauth token");
    let y = {
      ...summarizeAttachmentResolution(attachments.slice(0, N), 0, 0, stats, startTime),
      ...aheadOfFilesTelemetry(u, s),
    };
    logFeatureSad("bridge_attachment_resolve", "no_token", y);
    logForDiagnosticsNoPII("warn", "bridge_attachment_download_timing", {
      outcome: "no_token",
      should_query: d,
      ...y,
    });
    let G = allMissing(
      attachments.filter((attachment) => typeof attachment.sha256 !== "string"),
      "no_token",
    );
    if (filtered.length > 0) {
      let count = filtered.length - MAX_PEER_ATTACHMENTS;
      let be = count > 0 ? filtered.slice(0, MAX_PEER_ATTACHMENTS) : filtered;
      emitPeerFileReceiveTelemetry("bridge", be.length, 0);
      let et = count > 0 ? " " + peerFileCountCapNote(count) : "";
      return {
        prefix:
          be
            .map((T) => peerFileFailureNote(T.file_name, "it could not be downloaded (not signed in)"))
            .join(" ") +
          et +
          (G.length > 0 ? " " + missingAttachmentsNote(G.length, G.length) : "") +
          " ",
        imageBlocks: [],
        inlinedImagePaths: [],
        deliveredCount: 0,
        ...(G.length > 0 && {
          missingFiles: G,
        }),
      };
    }
    return {
      prefix: missingAttachmentsNote(G.length, G.length) + " ",
      imageBlocks: [],
      inlinedImagePaths: [],
      deliveredCount: 0,
      missingFiles: G,
    };
  }
  let S = [];
  let attachments_2 = attachments;
  let z = attachments_2.length > N;
  if (z) {
    debug(`dropping ${attachments_2.length - N} attachment(s) over the ${N} cap`);
    if (filtered.length > 0) S.push(peerFileCountCapNote(attachments_2.length - N));
    attachments_2 = attachments_2.slice(0, N);
  }
  let j = i && o;
  let H = a === undefined && _ === undefined;
  let Fe = H && attachments_2.length > MAX_LISTED_ATTACHMENTS;
  let we = limitConcurrency(MAX_LISTED_ATTACHMENTS, (y) =>
    resolveInboundAttachment(
      y,
      i,
      j,
      stats,
      d === false ? DOWNLOAD_TRIES.noTurn : DOWNLOAD_TRIES.startsTurn,
      h,
      n,
      r,
      a,
      s,
      d === false,
      _,
      p,
      I,
    ).finally(() => {
      if (Fe) dropSettledTakenDownload(y);
    }),
  );
  let Oe;
  try {
    Oe = await Promise.all(attachments_2.map((y) => we(y)));
  } finally {
    for (let y of H ? attachments_2 : []) dropSettledTakenDownload(y);
  }
  let Ae = [];
  let Me = [];
  let xe = [];
  let Se = [];
  let Ye = 0;
  let ve = 0;
  let Le = 0;
  let re = false;
  let U = [];
  let $e = 0;
  let W = [];
  let Pe = [];
  Oe.forEach((y, G) => {
    let ee = attachments_2[G];
    let be = typeof ee.sha256 === "string";
    if (be) ve++;
    if ("path" in y)
      Pe.push({
        file_uuid: ee.file_uuid,
        path: y.path,
        inlined: "imageBlock" in y,
      });
    if ("imageBlock" in y) {
      Me.push(y.imageBlock);
      Se.push(ee.file_uuid);
      if ("path" in y) xe.push(y.path);
    } else if ("path" in y) {
      Ae.push(`@"${y.path}"`);
      if (y.inlineFellBack) Ye++;
      if (be) Le++;
      if (y.aside !== undefined) {
        W.push(y.aside);
        S.push(asideSentence(y.aside));
      }
    } else {
      if (y.failure === "digest_mismatch") re = true;
      if (be) {
        S.push(peerFileFailureNote(ee.file_name, FAILURE_REASON_TEXT[y.failure]));
        if (y.aside !== undefined) {
          W.push(y.aside);
          S.push(asideSentence(y.aside));
        }
      } else {
        U.push({
          file_uuid: ee.file_uuid,
          reason: y.failure === "write" ? "write" : (y.cause ?? "download"),
        });
        if (y.aside !== undefined) {
          $e++;
          W.push(y.aside);
          S.push(asideSentence(y.aside));
        }
      }
    }
  });
  let Ie = filtered.length === 0 ? attachments.slice(N) : [];
  if (U.length > 0 || Ie.length > 0) {
    U.push(...allMissing(Ie, "count_cap"));
    let y = U.length - $e;
    if (y > 0) S.push(missingAttachmentsNote(y, attachments_2.length - ve + Ie.length));
  }
  if (Ie.length > 0) S.push(`[a message takes at most ${N} attachments]`);
  let ce = stats.lastFailedWrite?.code === "ENOSPC" && U.some((y) => y.reason === "write");
  if (ce) S.push(`[${NO_SPACE_FOR_A_FILE}]`);
  if (ve > 0) emitPeerFileReceiveTelemetry("bridge", ve, Le);
  let resolvedCount = Ae.length + Me.length;
  let me = {
    ...summarizeAttachmentResolution(attachments_2, resolvedCount, Me.length, stats, startTime),
    ...aheadOfFilesTelemetry(u, s),
  };
  let oe;
  if (resolvedCount === 0) {
    oe = re ? "digest_mismatch" : "all_failed";
    logFeatureBad("bridge_attachment_resolve", oe, me);
  } else if (resolvedCount < attachments_2.length) {
    oe = re ? "digest_mismatch" : "partial_failed";
    logFeatureSad("bridge_attachment_resolve", oe, me);
  } else if (z) {
    oe = "over_count_cap";
    logFeatureSad("bridge_attachment_resolve", oe, me);
  } else if (stats.inlinedImageNotSavedCount > 0) {
    oe = "inlined_image_not_saved";
    logFeatureSad("bridge_attachment_resolve", oe, me);
  } else {
    oe = "ok";
    logFeatureOk("bridge_attachment_resolve", me);
  }
  let fe = (oe !== "ok" && oe !== "over_count_cap") || stats.failedWriteCount > 0;
  logForDiagnosticsNoPII(fe ? "warn" : "info", "bridge_attachment_download_timing", {
    outcome: oe,
    should_query: d,
    ...me,
  });
  if (Ye > 0) logFeatureSad("bridge_attachment_inline_image", "fallback_path_ref");
  else if (Me.length > 0) logFeatureOk("bridge_attachment_inline_image");
  if (stats.modelCopyMissedCount > 0)
    logFeatureSad(
      "bridge_attachment_model_copy",
      stats.modelCopyMissedSentAsIsCount < stats.modelCopyMissedCount
        ? "fallback_path_ref"
        : "fallback_original",
    );
  else if (stats.modelCopyCount > 0) logFeatureOk("bridge_attachment_model_copy");
  let Ce = [...Ae, ...S];
  return {
    prefix: Ce.length > 0 ? Ce.join(" ") + " " : "",
    imageBlocks: Me,
    inlinedImagePaths: stats.inlinedImageNotSavedCount > 0 ? [] : xe,
    ...(Se.length > 0 && {
      imageFileUuids: Se,
    }),
    deliveredCount: resolvedCount,
    ...(U.length > 0 && {
      missingFiles: U,
    }),
    ...(W.length > 0 && {
      asideOutcomes: W,
    }),
    ...(ce && {
      noSpace: ce,
    }),
    ...(Pe.length > 0 && {
      writtenFiles: Pe,
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
  let i = content.findLastIndex((n) => n.type === "text");
  if (i !== -1) {
    let n = content[i];
    if (n.type === "text")
      return [
        ...content.slice(0, i),
        {
          ...n,
          text: injectPeerFilePrefix(n.text, prefix),
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
  let o =
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
  return [...content, ...o];
}
//@ chunk-n4bsg1hp.js:25200-25272 placement
function allMissing(e, reason) {
  return e.map((o) => ({
    file_uuid: o.file_uuid,
    reason,
  }));
}
//@ chunk-n4bsg1hp.js:25272-25600 placement
function contentWithPlannedPathRefs(e, i, o, namedByIdHash = false) {
  let inboundAttachments = extractInboundAttachments(e);
  if (
    inboundAttachments.length === 0 ||
    inboundAttachments.length > maxAttachmentsPerMessage(inboundAttachments)
  )
    return;
  let a = [];
  for (let inboundAttachment of inboundAttachments) {
    let u = namedByIdHash
      ? shortContentHash(inboundAttachment.file_uuid)
      : inboundAttachment.file_uuid.slice(0, 8).replace(/[^a-zA-Z0-9_-]/g, "_");
    if (u === "") return;
    let _ = hashPrefixedFileName(u, sanitizePeerFileName(inboundAttachment.file_name));
    a.push(join(o, _));
  }
  let mapped = a.map((s) => `@"${s}"`);
  return {
    content: prependPathRefs(i ?? "", mapped.join(" ") + " "),
    refs: mapped,
    paths: a,
  };
}
//@ chunk-n4bsg1hp.js:25600-25969 placement
async function resolveAndPrepend(e, i, o, n, r, a, d, s = true, u = false) {
  let content = i ?? "";
  let attachments = extractInboundAttachments(e);
  if (attachments.length === 0)
    return {
      content,
      inlinedImagePaths: [],
    };
  let p = o && !(typeof content === "string" && isTaggedPeerText(content));
  let { prefix, imageBlocks, deliveredCount, ...C } = await resolveInboundAttachments(
    attachments,
    o,
    p,
    n,
    r,
    undefined,
    shouldQueryInboundAttachment(e),
    a,
    d,
    undefined,
    s,
    u,
  );
  if (deliveredCount === 0 && typeof content === "string" && content.trim() === "")
    return {
      content: prefix.trimEnd(),
      ...C,
    };
  return {
    content: resolveAndPrepend_2(prependPathRefs(content, prefix), imageBlocks),
    ...C,
  };
}
//@ chunk-n4bsg1hp.js:25969-26102 placement
function dropSettledTakenDownload(e) {
  let i = inboundAttachmentDownloadRegistry();
  let o = foldFileUuid(e.file_uuid);
  let n = i.byFileUuid.get(o);
  if (n?.taken !== undefined && n.settledAt !== undefined) i.byFileUuid.delete(o);
}
//@ chunk-n4bsg1hp.js:26102-26163 placement
function maxAttachmentsPerMessage(e) {
  return e.every((i) => i.sha256 === undefined) ? MAX_ATTACHMENTS_WITHOUT_SHA : MAX_PEER_ATTACHMENTS;
}
//@ chunk-n4bsg1hp.js:26163-26198 placement
var MOVE_ASIDE_MODE_CODES = {
  off: 0,
  count: 1,
  on: 2,
  tell: 3,
};
//@ chunk-n4bsg1hp.js:26198-26241 placement
function isMoveAsideModeOn(e) {
  return e === "on" || e === "tell";
}
//@ chunk-n4bsg1hp.js:26241-26471 placement
function keptAsideResult(e, i, target, n, r) {
  if (e !== "tell") return;
  let [a, ...d] = i.map((s) => join(dirname(target), s, basename(target)));
  if (a !== undefined)
    return {
      aside: {
        path: target,
        saved: n,
        keptAt: [a, ...d],
      },
    };
  return r?.leavesADifferentFile === true && !n
    ? {
        aside: {
          path: target,
          saved: false,
          keptAt: [],
        },
      }
    : undefined;
}
//@ chunk-n4bsg1hp.js:26471-27199 placement
function asideSentence({ path, saved, keptAt: [o, n] }, r = false) {
  if (o === undefined) {
    let u = `: "${path}" holds something else (possibly a copy changed during this session), which was left in place`;
    return r ? `A file attached to a user message was not saved${u}` : `[attachment not saved${u}]`;
  }
  let d = `(possibly a copy changed during this session) was moved to "${o}"${n === undefined ? "" : `, and what then stood there was moved to "${n}"`}`;
  if (saved) {
    let u = ` "${path}"; what was at that path ${d}`;
    return r ? `A file attached to a user message was saved to${u}` : `[saved the attached file to${u}]`;
  }
  let s = `, so what was just sent is not available; what was at "${path}" until now ${d}`;
  return r ? `A file attached to a user message was not saved${s}` : `[attachment not saved${s}]`;
}
//@ chunk-n4bsg1hp.js:27199-27324 placement
function readAheadOfFiles(e) {
  if (!e || getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_ferry", false) !== true) return "off";
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_marten", false) === true ? "on_with_pdfs" : "on";
}
//@ chunk-n4bsg1hp.js:27324-27489 placement
function aheadOfFilesTelemetry(e, i) {
  return e === undefined
    ? {}
    : {
        ahead_of_files_flag_on: e === "off" ? 0 : 1,
        ahead_of_files_on_with_pdfs: e === "on_with_pdfs" ? 1 : 0,
        queued_ahead_of_files: i === undefined ? 0 : 1,
      };
}
//@ chunk-n4bsg1hp.js:27489-30455 placement
/**
 * 汇总入站附件处理统计用于遥测：文件数、已解析、下载次数、恢复/复用/预取/并入进行中数、内联图片与 PNG 转码、下载字节、失败分类、重名文件等。
 */
function summarizeAttachmentResolution(attachments, resolvedCount, inlinedImageCount, stats, startTime) {
  let a = 0;
  let sharedSavedNameSameIdFileCount = 0;
  let s = 0;
  for (let u of stats.idsBySavedName.values()) {
    s += count(u, (_) => UUID_V7_PATTERN.test(_));
    if (u.length > 1) {
      a += u.length;
      sharedSavedNameSameIdFileCount += count(u, (_) => count(u, (h) => h === _) > 1);
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
    ...(a > 0 && {
      shared_saved_name_file_count: a,
      shared_saved_name_same_id_file_count: sharedSavedNameSameIdFileCount,
    }),
    ...(s > 0 && {
      time_ordered_id_file_count: s,
    }),
    uploads_root_code: stats.uploadsRootCode,
    ...(stats.whatStandsAside !== undefined && {
      move_aside_mode_code: MOVE_ASIDE_MODE_CODES[stats.whatStandsAside],
    }),
  };
}
//@ chunk-n4bsg1hp.js:30455-30595 placement
function recordWriteFailure(e, writeFailed) {
  e.failedWriteCount++;
  e.lastFailedWrite = {
    code: sanitizeErrnoForTelemetry(writeFailed) ?? lit("unknown"),
    step: lit("write_during_download"),
  };
  return {
    failure: "write",
  };
}
//@ chunk-n4bsg1hp.js:30595-30621 placement
var NOT_FOUND_HTTP_STATUSES = new Set([404, 410]);
//@ chunk-n4bsg1hp.js:30621-30943 placement
/**
 * 按失败类型累计 failedDownloads 计数（部分下载另计，记最后的 HTTP 状态），返回 {failure:"download", cause?}；404 类记为 not_found。
 */
function recordDownloadFailure(stats, failure, receivedBytes, httpStatus) {
  let failedDownloads = stats.failedDownloads;
  let a = FAILURE_COUNTER_KEYS[failure];
  failedDownloads[a] = (failedDownloads[a] ?? 0) + 1;
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
function autoInboundFileRegistry(e) {
  return e === undefined && getSessionUploadsDirOverride() === null
    ? inboundAttachmentFileRegistry()
    : undefined;
}
//@ chunk-n4bsg1hp.js:31002-31090 placement
function writtenInUploadsDir(fileUuid, i) {
  let o = autoInboundFileRegistry(i)?.get(foldFileUuid(fileUuid));
  return o !== undefined && dirname(o.path) === sessionUploadsDir() ? o : undefined;
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
  let i = isCcsTenant();
  let o = i ? CCS_PREFETCH_HOLD_MS : PREFETCH_HOLD_RANGE_MS.max;
  if (typeof featureValue_CACHED_MAY_BE_STALE !== "number" || !(featureValue_CACHED_MAY_BE_STALE > 0))
    return {
      ms: o,
      repeatRenews: false,
    };
  return {
    ms: Math.min(
      o,
      Math.max(PREFETCH_HOLD_RANGE_MS.min, Math.round(featureValue_CACHED_MAY_BE_STALE * 1000)),
    ),
    repeatRenews: !i,
  };
}
//@ chunk-n4bsg1hp.js:31452-33852 placement
function prefetchInboundAttachments(e, { issuedAt, credentials, onlyThese = false }) {
  if (isEssentialTrafficOnly()) return 0;
  let r = bridgeAttachmentEarlyReadsGate();
  if (!r.value) {
    logPrefetchOutcome("bridge_attachment_prefetch_flag_off", {
      file_count: e.length,
      flag_served: FLAG_SERVED_BY_SOURCE[r.source],
    });
    return 0;
  }
  let registry = inboundAttachmentDownloadRegistry();
  let d = prefetchHoldWindow();
  let s = {
    file_count: e.length,
    started_count: 0,
    already_present_count: 0,
    held_limit_count: 0,
    start_budget_count: 0,
    skipped_count: 0,
  };
  let u = 0;
  let _ = 0;
  let h = 0;
  let p = 0;
  if (registry.earlyReadsStopped === true && !bridgeAttachmentEarlyReadsStopped()) {
    registry.earlyReadsStopped = undefined;
    registry.earlyReadsStopReported = undefined;
  }
  let M = registry.earlyReadsStopped === true;
  let E = new Set();
  let O = Date.now() - issuedAt;
  let C = O > Math.max(PREFETCH_AGE_HOLD_MULTIPLE * d.ms, PREFETCH_MAX_AGE_MS);
  let I = C ? [] : e.slice(0, MAX_PEER_ATTACHMENTS);
  s.skipped_count = e.length - I.length;
  if (onlyThese && !C) {
    let Q = new Set(e.map((S) => foldFileUuid(S.file_uuid)));
    for (let [S, w] of registry.byFileUuid)
      if (!Q.has(S) && w.release !== undefined && !w.taken) {
        w.release("dropped_unused");
        _++;
      }
  }
  for (let Q of I) {
    let S = foldFileUuid(Q.file_uuid);
    if (
      normalizeUuidOrNull(Q.file_uuid) === null ||
      (Q.file_size !== undefined && Q.file_size > MAX_ATTACHMENT_BYTES)
    ) {
      s.skipped_count++;
      continue;
    }
    let w = registry.refusedEarly?.get(S);
    if (w !== undefined) {
      if (performance.now() - w < REFUSED_EARLY_COOLDOWN_MS) {
        h++;
        continue;
      }
      registry.refusedEarly?.delete(S);
    }
    let z = registry.byFileUuid.get(S);
    if (z !== undefined || writtenInUploadsDir(Q.file_uuid, undefined) !== undefined) {
      s.already_present_count++;
      if (d.repeatRenews && z?.release !== undefined && !z.taken && !E.has(S)) {
        schedulePrefetchExpiry(z, d.ms);
        E.add(S);
        u++;
      }
      continue;
    }
    if (M) {
      p++;
      continue;
    }
    let statedBytes = nonNegativeSize(Q.file_size);
    let H = prefetchAdmission(registry, statedBytes);
    if (H === "held_limit") s.held_limit_count++;
    else if (H === "start_budget") s.start_budget_count++;
    else {
      startAttachmentPrefetch(registry, S, Q.file_uuid, statedBytes, credentials, d.ms, d.repeatRenews);
      E.add(S);
      s.started_count++;
    }
  }
  let R = heldPrefetchTotals(registry);
  let D = {
    ...s,
    age_ms: Math.round(O),
    held_file_count: R.count,
    approx_held_bytes: Number(R.bytes.toPrecision(2)),
    ...(d.repeatRenews && {
      hold_ms: d.ms,
      refreshed_count: u,
      renewed_since_last_report: registry.renewalsNotYetReported ?? 0,
    }),
    ...(onlyThese && {
      only_these: true,
      dropped_count: _,
    }),
    ...(h > 0 && {
      refused_before_count: h,
    }),
    ...(p > 0 && {
      early_reads_stopped_count: p,
    }),
  };
  let N = registry.earlyReadsStopReported === true ? p : 0;
  if (u + h + N > 0 && u === s.already_present_count && s.file_count === u + h + N && _ === 0) {
    registry.renewalsNotYetReported = (registry.renewalsNotYetReported ?? 0) + u;
    return 0;
  }
  registry.renewalsNotYetReported = 0;
  if (p > 0) registry.earlyReadsStopReported = true;
  if (C) logFeatureSad("bridge_attachment_prefetch", "stale", D);
  else if (p > 0) logFeatureSad("bridge_attachment_prefetch", "mark_unseen_stop", D);
  else if (s.held_limit_count > 0) logFeatureSad("bridge_attachment_prefetch", "held_limit", D);
  else if (s.start_budget_count > 0) logFeatureSad("bridge_attachment_prefetch", "start_budget", D);
  else logFeatureOk("bridge_attachment_prefetch", D);
  logPrefetchOutcome(
    s.started_count > 0 ? "bridge_attachment_prefetch_started" : "bridge_attachment_prefetch_not_started",
    {
      ...D,
      stale: C,
    },
  );
  return s.started_count;
}
//@ chunk-n4bsg1hp.js:33852-33884 placement = tryReadFileForSync (1)
function logPrefetchOutcome(e, fields) {
  logForDiagnosticsNoPII("info", e, fields);
}
//@ chunk-n4bsg1hp.js:33884-33926 placement
function nonNegativeSize(fileSize) {
  return fileSize !== undefined && fileSize > 0 ? fileSize : 0;
}
//@ chunk-n4bsg1hp.js:33926-34132 placement
/**
 * 判断能否再开始一个附件预取：清理窗口外的开始记录；持有中的预取数/字节超限返回 held_limit，近期开始数超预算返回 start_budget，否则 ok。
 */
function prefetchAdmission(e, i) {
  let startTime = performance.now();
  let recentPrefetchStarts = e.recentPrefetchStarts;
  while (recentPrefetchStarts.length > 0 && startTime - recentPrefetchStarts[0] >= PREFETCH_START_WINDOW_MS)
    recentPrefetchStarts.shift();
  let r = heldPrefetchTotals(e);
  if (r.count >= MAX_HELD_PREFETCHES || r.bytes + i > maxAttachmentBytes()) return "held_limit";
  return recentPrefetchStarts.length < PREFETCH_START_BUDGET ? "ok" : "start_budget";
}
//@ chunk-n4bsg1hp.js:34132-34340 placement
function heldPrefetchTotals(e) {
  let i = 0;
  let bytes = 0;
  for (let n of e.byFileUuid.values())
    if (n.startedBy === "prefetch" && !n.taken) {
      i++;
      bytes += n.settledAt === undefined ? Math.max(n.receivedBytes, n.statedBytes) : n.receivedBytes;
    }
  return {
    count: i,
    bytes,
  };
}
//@ chunk-n4bsg1hp.js:34340-34385 placement
function releasePrefetchExpired(e) {
  e.release?.("expired_unused");
}
//@ chunk-n4bsg1hp.js:34385-34483 placement
function schedulePrefetchExpiry(downloadEntry, i) {
  clearTimeout(downloadEntry.expiry);
  downloadEntry.expiry = setTimeout(releasePrefetchExpired.bind(undefined, downloadEntry), i);
  downloadEntry.expiry.unref();
}
//@ chunk-n4bsg1hp.js:34483-36521 placement
/**
 * 在消息到达前为一个 file_uuid 启动后台预取：带独立 AbortController 调用 resolveOne（快速静默超时、字节准入回调、served 标记埋点），
 * 把下载登记进 byFileUuid，结束后按结果记 bridge_attachment_prefetch_* 埋点、更新提前拒绝表。
 */
function startAttachmentPrefetch(registry, i, fileUuid, statedBytes, bridgeContext, ms, repeatRenews) {
  let abortController = new AbortController();
  let u = false;
  let download = resolveOne({
    fileUuid,
    baseUrl: undefined,
    modelCopy: false,
    forPrefetch: true,
    maxBytes: MAX_ATTACHMENT_BYTES,
    spillTo: undefined,
    quietLimitMs: FAST_QUIET_LIMIT_MS,
    token: async () => {
      let bridgeAccessToken = await getBridgeAccessTokenAsync(bridgeContext);
      if (bridgeAccessToken) downloadEntry.bearer = computeContentHash(bridgeAccessToken);
      return bridgeAccessToken;
    },
    abort: abortController,
    totals: undefined,
    onServed: (p) => {
      let M = !p && bridgeAttachmentEarlyReadsStopped();
      if (M) registry.earlyReadsStopped = true;
      logPrefetchOutcome("bridge_attachment_prefetch_served", {
        mark_seen: p,
        ...(!p && {
          stops_early_reads: M,
        }),
      });
    },
    admitBytes: (receivedBytes) => {
      downloadEntry.receivedBytes = receivedBytes;
      if (downloadEntry.taken || heldPrefetchTotals(registry).bytes <= maxAttachmentBytes()) return true;
      downloadEntry.receivedBytes = 0;
      downloadEntry.statedBytes = 0;
      return false;
    },
  });
  let downloadEntry = newDownloadEntry("prefetch", abortController, download, undefined);
  downloadEntry.statedBytes = statedBytes;
  downloadEntry.release = (p) => {
    if (registry.byFileUuid.get(i) !== downloadEntry || downloadEntry.taken) return;
    if (p === "expired_unused" && repeatRenews && downloadEntry.settledAt === undefined) {
      schedulePrefetchExpiry(downloadEntry, ms);
      return;
    }
    u = true;
    clearTimeout(downloadEntry.expiry);
    registry.byFileUuid.delete(i);
    abortController.abort();
    let M = {
      download_finished: downloadEntry.settledAt !== undefined,
      approx_bytes: Number(downloadEntry.receivedBytes.toPrecision(2)),
      ...(p === "dropped_unused" && {
        held_for_ms: Math.round(performance.now() - downloadEntry.startedAt),
      }),
    };
    logFeatureSad("bridge_attachment_prefetch_download", p, M);
    logPrefetchOutcome(`bridge_attachment_prefetch_${p}`, M);
  };
  schedulePrefetchExpiry(downloadEntry, ms);
  registry.recentPrefetchStarts.push(downloadEntry.startedAt);
  registry.byFileUuid.set(i, downloadEntry);
  download
    .then((p) => {
      if (!("failure" in p)) {
        if (repeatRenews && registry.byFileUuid.get(i) === downloadEntry && !downloadEntry.taken)
          schedulePrefetchExpiry(downloadEntry, ms);
        return;
      }
      if (registry.byFileUuid.get(i) === downloadEntry && !downloadEntry.taken) {
        registry.byFileUuid.delete(i);
        clearTimeout(downloadEntry.expiry);
      }
      let M = p.failure === "http_status" && p.httpStatus === HTTP_CONFLICT_STATUS;
      if (M && !downloadEntry.taken) {
        let D = (registry.refusedEarly ??= new Map());
        D.delete(i);
        if (D.size >= MAX_REFUSED_EARLY) D.delete(D.keys().next().value ?? i);
        D.set(i, performance.now());
      }
      if (u) return;
      let E = {
        duration_ms: Math.round(performance.now() - downloadEntry.startedAt),
        ...(p.httpStatus !== undefined && {
          http_status: p.httpStatus,
        }),
      };
      let O = isStalledBeforeHeaders(p);
      let failure = O ? "no_answer" : p.failure;
      if (M) {
        logFeatureSad("bridge_attachment_prefetch_download", "refused_early", E);
        logPrefetchOutcome("bridge_attachment_prefetch_failed", {
          ...E,
          failure_code: PREFETCH_FAILURE_CODE_BEARER,
        });
        return;
      }
      let taken = downloadEntry.taken;
      let R =
        taken?.by === "joiner" &&
        taken.bearer === downloadEntry.bearer &&
        shouldRedownload(downloadEntry, taken.at);
      if (R) logFeatureBad("bridge_attachment_prefetch_download", failure, E);
      else logFeatureSad("bridge_attachment_prefetch_download", failure, E);
      logPrefetchOutcome(
        R ? "bridge_attachment_prefetch_failed_file_lost" : "bridge_attachment_prefetch_failed",
        {
          ...E,
          failure_code: O ? PREFETCH_FAILURE_CODE_HEADERS_TIMEOUT : FAILURE_CODES[p.failure],
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
    bytes: download.then((a) => {
      entry.settledAt = performance.now();
      if ("failure" in a) {
        entry.failure = a.failure;
        entry.headersTimedOut = isStalledBeforeHeaders(a);
        return null;
      }
      if ("writeFailed" in a) {
        entry.failure = "error";
        entry.writeFailed = a.writeFailed;
        return null;
      }
      if (!("data" in a)) return null;
      entry.servedPageCount = a.servedPageCount;
      return a.data;
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
function shouldRedownload(e, i) {
  let o = (e.settledAt ?? performance.now()) - i;
  if (e.failure === undefined) return false;
  if (e.startedBy === "prefetch" && e.failure === "too_large") return !canSpillToUploads();
  return (
    e.startedBy !== "prefetch" ||
    (e.receivedBytes > 0 && e.failure !== "stalled" && o > DOWNLOAD_DEADLINE_SLACK_MS)
  );
}
//@ chunk-n4bsg1hp.js:37292-37400 placement
function takeInFlightDownload(e, at, bearer) {
  if (e.taken) return false;
  e.taken = {
    by: "joiner",
    at,
    bearer,
  };
  clearTimeout(e.expiry);
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
async function downloadWithRetries(e, i, abortController, n, r) {
  let a = performance.now() - i + DOWNLOAD_DEADLINE_SLACK_MS;
  for (let j = 0; ; j++) {
    let abortController_2 = new AbortController();
    let u = () => abortController_2.abort();
    abortController.signal.addEventListener("abort", u, {
      once: true,
    });
    if (abortController.signal.aborted) abortController_2.abort();
    if (n !== undefined) n.downloadTryCount++;
    r.admitBytes(0);
    let _ = j + 1 < e && performance.now() + FAST_QUIET_LIMIT_MS + MIN_RETRY_DELAY_MS <= a;
    let h = await resolveOne({
      ...r,
      totals: n,
      abort: abortController_2,
      quietLimitMs: _ ? FAST_QUIET_LIMIT_MS : DOWNLOAD_QUIET_LIMIT_MS,
    });
    abortController.signal.removeEventListener("abort", u);
    if (!("failure" in h)) {
      if (n !== undefined && j > 0 && !("writeFailed" in h)) n.recoveredFileCount++;
      return h;
    }
    let p = isRetryableDownloadFailure(h);
    let startTime = performance.now();
    let E = a - startTime;
    let min = Math.min(
      fullJitterBackoffMs({
        baseMs: RETRY_BASE_DELAY_MS,
        attempt: j,
        floorMs: MIN_RETRY_DELAY_MS,
      }),
      Math.max(MIN_RETRY_DELAY_MS, E),
    );
    let C = _ && h.failure === "stalled";
    if (p && j + 1 < e && (C || E >= MIN_RETRY_DELAY_MS)) {
      await sleep(min, abortController.signal);
      if (!abortController.signal.aborted) continue;
    }
    return h;
  }
}
//@ chunk-n4bsg1hp.js:38644-38757 placement
function signInRefreshState() {
  let e = inboundAttachmentDownloadRegistry();
  e.signInRefresh ??= {
    attempted: false,
    recoveries: {
      begun: 0,
      running: 0,
    },
  };
  return e.signInRefresh;
}
//@ chunk-n4bsg1hp.js:38757-39585 placement
/**
 * 下载附件遇到 401 时刷新 bridge 令牌：同一会话只尝试一次 handleOAuth401Error（带超时与中断），返回刷新后的新令牌或 undefined。
 */
async function refreshTokenForDownload(staleToken, i, o, signal, r, a) {
  let state = signInRefreshState();
  let abortController = new AbortController();
  let u = sleep(FAST_QUIET_LIMIT_MS, AbortSignal.any([signal, abortController.signal])).then(() => {
    return;
  });
  try {
    let winner = await Promise.race([
      getBridgeAccessTokenAsync(i).catch(() => {
        return;
      }),
      u,
    ]);
    if (winner === staleToken) {
      let h = state.attempted && state.recoveries.running === 0;
      if (!state.attempted) {
        state.attempted = true;
        let M = false;
        state.run = countOAuth401Recovery(state, () =>
          handleOAuth401Error(staleToken, i, o, {
            onForcedRefreshOutcome: (E) => {
              if (TOKEN_REFRESH_OUTCOMES_BEFORE_POST.has(E)) state.attempted = false;
              else M = true;
            },
          }),
        )
          .then(async () => {
            if (!M && (await getBridgeAccessTokenAsync(i)) !== staleToken) state.attempted = false;
          })
          .catch(logError);
      }
      if (!r) {
        if (!(await Promise.race([getClaudeAIOAuthTokensAsync(i).catch(() => null), u]))?.refreshToken)
          return;
      }
      let startTime = performance.now();
      winner = await Promise.race([
        (state.run ?? Promise.resolve())
          .then(() => (h ? readFreshOAuthAccessToken(i) : undefined))
          .then(() => getBridgeAccessTokenAsync(i))
          .catch(() => {
            return;
          }),
        u,
      ]);
      a.slowest401RefreshWaitMs = Math.max(a.slowest401RefreshWaitMs, performance.now() - startTime);
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
  let M = forPrefetch ? "of a prefetched file" : fileUuid;
  let E = false;
  let O = false;
  let C = () => {
    E = true;
    abort.abort();
  };
  let timer = setTimeout(C, quietLimitMs);
  let startTime = performance.now();
  let D;
  try {
    if (isBridgeFileLoginRefused())
      await Promise.race([settleStoredLoginRefusal(), createChildAbortController(abort.signal)]);
    let winner = await Promise.race([token(), createChildAbortController(abort.signal)]);
    if (abort.signal.aborted)
      return E
        ? stalledFailure(O)
        : {
            failure: "stopped",
          };
    if (!winner)
      return {
        failure: "no_token",
      };
    let Q;
    try {
      Q = `${baseUrl ?? getBridgeBaseUrl()}/api/oauth/files/${encodeURIComponent(fileUuid)}/content${modelCopy ? "?model_copy=inference_highres" : ""}`;
    } catch (error) {
      debug(
        `fetch ${M} has no URL: ${forPrefetch ? (error instanceof Error ? error.name : "a non-Error") : error}`,
      );
      return {
        failure: "error",
        final: true,
      };
    }
    if (isBridgeFileLoginRefused(Q, winner)) {
      debug(`fetch ${M} refused: the stored login may not go there`);
      return {
        failure: "error",
        final: true,
      };
    }
    let response = await fetch(Q, {
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
        url: Q,
      }),
    });
    O = true;
    clearTimeout(timer);
    timer = setTimeout(C, quietLimitMs);
    if (totals !== undefined)
      totals.slowestTimeToHeadersMs = Math.max(totals.slowestTimeToHeadersMs, performance.now() - startTime);
    if (response.status !== 200) {
      debug(`fetch ${M} failed: status=${response.status}`);
      await drainResponseBody(response);
      return E
        ? stalledFailure(O)
        : {
            failure: "http_status",
            httpStatus: response.status,
          };
    }
    onServed?.(response.headers.get(PREFETCH_SEEN_HEADER.name)?.trim() === PREFETCH_SEEN_HEADER.value);
    let reader = response.body?.getReader();
    let z = [];
    let j = 0;
    while (reader !== undefined) {
      let { done: H, value: Fe } = await reader.read();
      if (H) break;
      timer.refresh();
      j += Fe.byteLength;
      if (j > (spillTo === undefined ? maxBytes : MAX_PEER_SPOOL_BYTES)) {
        debug(`fetch ${M} over size cap (${j} bytes so far)`);
        abort.abort();
        return {
          failure: "too_large",
        };
      }
      if (!admitBytes(j)) {
        debug(`fetch ${M} stopped: unused prefetched files would exceed their limit in memory`);
        abort.abort();
        return {
          failure: "held_limit",
        };
      }
      z.push(Fe);
      if (spillTo !== undefined && j > maxBytes) {
        clearTimeout(timer);
        try {
          D ??= await spillTo();
          for (let we of z) await D.write(we);
        } catch (error) {
          debug(`download of ${M} stopped, no retry: write to disk failed: ${error}`);
          abort.abort();
          return {
            writeFailed: error,
          };
        }
        timer = setTimeout(C, DOWNLOAD_QUIET_LIMIT_MS);
        z = [];
      }
    }
    if (totals !== undefined) totals.downloadedBytes += j;
    if (D !== undefined)
      return await D.finish().then(
        (file) => ({
          file,
        }),
        (writeFailed) => ({
          writeFailed,
        }),
      );
    return {
      data: Buffer.concat(z, j),
      servedPageCount: parseServedPageCount(response.headers.get(X_SERVED_FILE_PAGE_COUNT)),
    };
  } catch (error) {
    debug(`fetch ${M} threw: ${forPrefetch ? (error instanceof Error ? error.name : "a non-Error") : error}`);
    return E
      ? stalledFailure(O)
      : {
          failure: abort.signal.aborted ? "stopped" : "error",
        };
  } finally {
    clearTimeout(timer);
    await D?.discard();
    if (totals !== undefined)
      totals.slowestDownloadMs = Math.max(totals.slowestDownloadMs, performance.now() - startTime);
  }
}
//@ chunk-n4bsg1hp.js:41897-41974 layout
function parseServedPageCount(header) {
  return header !== null && /^[1-9][0-9]{0,2}$/.test(header) ? Number(header) : undefined;
}
//@ chunk-n4bsg1hp.js:41974-42146 placement
async function writeWithPageCount(e, i, servedPageCount, ...n) {
  let r = (inboundAttachmentDownloadRegistry().pageCountsOfWrites ??= new Map());
  let a = {
    servedPageCount,
  };
  r.set(i, a);
  try {
    return await e.write(...n);
  } finally {
    if (r.get(i) === a) r.delete(i);
  }
}
//@ chunk-n4bsg1hp.js:42146-42221 placement
function isStalledBeforeHeaders(e) {
  return "failure" in e && e.failure === "stalled" && e.beforeHeaders;
}
//@ chunk-n4bsg1hp.js:42221-42279 placement
function stalledFailure(e) {
  return {
    failure: "stalled",
    beforeHeaders: !e,
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
function missingAttachmentsNote(e, i) {
  return i === 1
    ? "[attachment did not arrive]"
    : e === i
      ? `[${i} attachments did not arrive]`
      : `[${e} of ${i} attachments did not arrive]`;
}
//@ chunk-cxyewwc3.js:267-413 sole-consumer
var fileAttachmentSchema = DoctorLazy(() =>
  u({
    file_uuid: string(),
    file_name: string(),
    is_image: M().nullish(),
    sha256: string().nullish().catch(null),
    file_size: E().nullish().catch(undefined),
  }),
);
var MAX_FILE_ATTACHMENTS = 256;
//@ chunk-cxyewwc3.js:413-648 fingerprint = extractInboundAttachments (1)
/**
 * 从入站帧的 file_attachments 字段取出并校验附件列表（截断到上限）。
 */
function extractInboundAttachments(msg) {
  if (typeof msg !== "object" || msg === null || !("file_attachments" in msg)) return [];
  let fileAttachments = msg.file_attachments;
  if (!Array.isArray(fileAttachments)) return [];
  let a = fileAttachmentSchema();
  return fileAttachments.slice(0, MAX_FILE_ATTACHMENTS).flatMap((fileAttachment) => {
    let parsed = a.safeParse(fileAttachment);
    return parsed.success ? [parsed.data] : [];
  });
}
//@ chunk-cxyewwc3.js:648-693 placement
var inboundAttachmentQuerySchema = DoctorLazy(() =>
  u({
    shouldQuery: M().optional(),
  }),
);
//@ chunk-cxyewwc3.js:693-751 placement
function shouldQueryInboundAttachment(t) {
  return inboundAttachmentQuerySchema().safeParse(t).data?.shouldQuery;
}
//@ chunk-23fm9f0d.js:23001-23035 fingerprint = uploadsDir (1)
function uploadsDir() {
  return cleanupOldFilesInDirectory("uploads");
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
};
