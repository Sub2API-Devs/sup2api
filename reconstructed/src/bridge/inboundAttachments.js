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
import { Mge, IMAGE_EXTENSIONS } from "../tools/FileReadTool/constants.js";
import { hasBinaryExtension } from "../constants/files.js";
import { isNotebookPath } from "../utils/path.js";
import { iwn, m3r, NA, rememberAttachmentDigest } from "../utils/uploadsDir.js";
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
import { parseWebpHeader, pngMayHaveTransparency, sir } from "../utils/imageFormats.js";
import { logForDebugging } from "../utils/debug.js";
import { getErrnoCode, sanitizeErrnoForTelemetry, sanitizeErrnoTokenForTelemetry } from "../utils/errors.js";
import { sha256OfFile, openSpill } from "./inboundAttachmentSpill.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { count } from "../utils/collections.js";
import { createOwnedSubdir, ensureAttachmentsDir } from "../utils/safeMkdir.js";
import { retryFsOp, writeIfMissing, retryTransient, writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { mn } from "../utils/remoteEnvironment.js";
import { IMAGE_LIMITS, vY, aQt } from "../utils/truncateGraphemes.js";
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
import { Lue, Lun, qoe } from "../utils/peerFileTransfer.js";
import { T8r, detectImageFormatFromBuffer } from "../utils/imageResizer.js";
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
import { A9o } from "./inboundMessageOrigin.js";
import { isTaggedPeerText } from "../utils/crossSessionMessages.js";
import { Vt } from "../utils/agentId.js";
import { fullJitterBackoffMs, sleep } from "../utils/sleep.js";
import { getProxyFetchOptions } from "../utils/proxy.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, M, E } from "../../vendor/zod/v4/classic/schemas.js";
import { cleanupOldFilesInDirectory } from "../utils/cleanup.js";

//@ chunk-n4bsg1hp.js:2043-2126 placement
function JWs(e) {
  return extname(e).toLowerCase().slice(1) !== "" && !Mge(e) && !hasBinaryExtension(e) && !isNotebookPath(e);
}
//@ chunk-n4bsg1hp.js:2126-2174 placement
function _Mo(e) {
  return iwn("", sanitizePeerFileName(e.file_name));
}
//@ chunk-n4bsg1hp.js:2174-2632 placement
function describeAttachmentFailures(e) {
  let i = 0,
    o = 0,
    n = 0,
    r = 0,
    a = 0,
    d = 0;
  for (let u of e) {
    if (u.is_image === !0) continue;
    let _ = _Mo(u),
      h = u.sha256 === void 0;
    if (IMAGE_EXTENSIONS.has(extname(_).toLowerCase().slice(1))) i++;
    else if (Mge(_)) {
      if ((o++, h)) d++;
    } else if (hasBinaryExtension(_)) {
      if ((n++, h)) (a++, d++);
    } else r++;
  }
  let s = e.length > 0;
  return {
    binary_ext_file_count: n,
    pdf_file_count: o,
    text_like_file_count: r,
    image_ext_file_count: i,
    all_files_binary_ext_no_sha256: s && a === e.length ? 1 : 0,
    all_files_binary_ext_or_pdf_no_sha256: s && d === e.length ? 1 : 0,
  };
}
//@ chunk-n4bsg1hp.js:2632-2684 placement
function gt(e) {
  return e !== void 0 && "fetchUpload" in e;
}
//@ chunk-n4bsg1hp.js:2684-2792 placement
var DOWNLOAD_QUIET_LIMIT_MS = 30000,
  MAX_ATTACHMENT_BYTES = 36700160,
  DOWNLOAD_TRIES = { startsTurn: 3, noTurn: 2 },
  FAST_QUIET_LIMIT_MS = 1e4,
  MIN_RETRY_DELAY_MS = 250,
  RETRY_BASE_DELAY_MS = 1000,
  DOWNLOAD_DEADLINE_SLACK_MS = 25000,
  MAX_LISTED_ATTACHMENTS = 16,
  MAX_ATTACHMENTS_WITHOUT_SHA = 20,
  MAX_REMEMBERED_FILES = 64,
  MAX_HELD_PREFETCHES = 16;
//@ chunk-n4bsg1hp.js:2792-2835 placement
function $t() {
  return (isCcsTenant() ? 16 : 64) * 1024 * 1024;
}
/**
 * 入站附件预取的常量：预取结果最长保留 5 分钟、持有时长范围、相关请求头名、409 冲突状态、早拒上限与冷却、启动预算与窗口、各失败原因的计数键与数字代码、内联图片最大边长 1568。
 */
//@ chunk-n4bsg1hp.js:2835-3456 placement
var PREFETCH_MAX_AGE_MS = 300000,
  CCS_PREFETCH_HOLD_MS = 60000,
  PREFETCH_HOLD_RANGE_MS = { min: 15000, max: PREFETCH_MAX_AGE_MS },
  PREFETCH_AGE_HOLD_MULTIPLE = 3,
  X_SERVED_FILE_PAGE_COUNT = "x-served-file-page-count",
  X_ANTHROPIC_ATTACHMENT_PREFETCH = "x-anthropic-attachment-prefetch",
  PREFETCH_SEEN_HEADER = { name: "x-anthropic-attachment-prefetch-seen", value: "1" },
  HTTP_CONFLICT_STATUS = 409,
  MAX_REFUSED_EARLY = 64,
  REFUSED_EARLY_COOLDOWN_MS = 300000,
  PREFETCH_START_BUDGET = 32,
  PREFETCH_START_WINDOW_MS = 60000,
  FAILURE_COUNTER_KEYS = {
    no_token: "failed_no_token_count",
    http_status: "failed_http_status_count",
    too_large: "failed_too_large_count",
    held_limit: "failed_held_limit_count",
    stalled: "failed_stalled_count",
    stopped: "failed_stopped_count",
    error: "failed_error_count",
  },
  FLAG_SERVED_BY_SOURCE = { override: !0, payload: !0, disk: !0, disabled: !1, fallback: !1 },
  FAILURE_CODES = {
    no_token: 1,
    http_status: 2,
    too_large: 3,
    held_limit: 4,
    stalled: 5,
    stopped: 6,
    error: 7,
  },
  PREFETCH_FAILURE_CODE_BEARER = 8,
  PREFETCH_FAILURE_CODE_HEADERS_TIMEOUT = 9,
  PREFLIGHT_QUIET_LIMIT_MS = 3000,
  MAX_INLINE_IMAGE_DIMENSION = 1568;
//@ chunk-n4bsg1hp.js:3456-3533 placement
function imageExceedsDimension(data, maxDim) {
  let o = parseWebpHeader(data);
  return o !== void 0 && Math.max(o.width, o.height) > maxDim;
}
//@ chunk-n4bsg1hp.js:3533-3581 fingerprint = debug (1)
function debug(msg) {
  logForDebugging(`[bridge:inbound-attach] ${msg}`);
}
/**
 * 比较磁盘上同名路径与待写内容：directory / other / absent / same / changed / unknown。
 */
//@ chunk-n4bsg1hp.js:3581-4070 layout
async function compareExistingFile(path, content, verifyHash = !1) {
  try {
    let n = await lstat(path);
    if (n.isDirectory()) return "directory";
    if (!n.isFile()) return "other";
    if (!Buffer.isBuffer(content)) {
      if (n.size !== content.size) return "changed";
      if (!verifyHash) return "same";
    } else if (n.size !== content.length) return "changed";
  } catch (error) {
    let r = getErrnoCode(error);
    if (r === "ENOENT" || r === "ENOTDIR") return "absent";
    return (debug(`could not look at ${path}: ${error}`), "unknown");
  }
  if (!Buffer.isBuffer(content))
    return (await sha256OfFile(path, content.size)) === content.sha256 ? "same" : "changed";
  return (await readPeerFileBounded(path, content.length))?.equals(content) ? "same" : "changed";
}
//@ chunk-n4bsg1hp.js:4070-4085 layout
var MAX_PUBLISH_TRIES = 3,
  MAX_KEPT_FOLDERS = 64;
/**
 * 发布文件到 uploads：路径被占且内容不同则把原文件移到 .kept-<时间>-<id> 目录再重试（最多 3 次、kept 目录上限 64），相同则只更新 mtime。
 */
//@ chunk-n4bsg1hp.js:4085-6123 layout
async function publishWithMoveAside(attemptPublish, uploadsDir, fileName, content, totals, keptFolders) {
  let d = join(uploadsDir, fileName),
    s,
    u = 0,
    _ = "; an entry moved from this path earlier is in a .kept- folder beside it";
  try {
    for (let h = 1; ; h++) {
      let p;
      try {
        p = await attemptPublish();
      } catch (error) {
        throw (await restoreMovedAside(s, uploadsDir, fileName, totals, keptFolders), error);
      }
      if (p === "published") return p;
      if (p === "failed") return (await restoreMovedAside(s, uploadsDir, fileName, totals, keptFolders), p);
      let M = p === "taken" ? await compareExistingFile(d, content, !0) : p;
      if (M === "same") {
        let date = new Date();
        return (
          await lutimes(d, date, date).catch((I) =>
            debug(`could not update the modification time of ${fileName}: ${I}`),
          ),
          await utimes(uploadsDir, date, date).catch((I) =>
            debug(`could not update the modification time of the uploads folder: ${I}`),
          ),
          "same"
        );
      }
      if (M === "directory")
        return {
          code: lit("EISDIR"),
          why: `not saved: a folder is at this path, and it was left there${u === 0 ? "" : _}`,
        };
      if (M === "unknown")
        return (
          (u -= (await restoreMovedAside(s, uploadsDir, fileName, totals, keptFolders)) ? 1 : 0),
          {
            code: lit("look_failed"),
            why: `not saved: what is at this path could not be looked at, so it was left there${u === 0 ? "" : _}`,
          }
        );
      if (h === MAX_PUBLISH_TRIES)
        return (
          (u -= (await restoreMovedAside(s, uploadsDir, fileName, totals, keptFolders)) ? 1 : 0),
          {
            code: lit("EEXIST"),
            why: `not saved: the path was taken on each of ${MAX_PUBLISH_TRIES} tries; anything there now was left there${u === 0 ? "" : _}`,
          }
        );
      if (M === "absent") continue;
      let E = `.kept-${new Date().toISOString().replace(/[-:.]/g, "")}-${randomUUID().slice(0, 8)}`,
        O;
      try {
        let C = await readdir(uploadsDir);
        if (count(C, (I) => I.startsWith(".kept-")) >= MAX_KEPT_FOLDERS)
          return (
            totals.moveAsideFailedCount++,
            {
              code: lit("kept_cap"),
              why: `not saved: the uploads folder holds at least ${MAX_KEPT_FOLDERS} folders of kept copies (named .kept-...), so what was at this path was left there; removing old ones makes room${u === 0 ? "" : _}`,
              leavesADifferentFile: !0,
            }
          );
        ((O = await createOwnedSubdir(uploadsDir, E)),
          await retryFsOp(d, join(O.at, fileName)),
          await s?.held.release().catch(() => {}),
          (s = { held: O, name: E }),
          (O = void 0),
          u++,
          keptFolders.push(E),
          totals.movedAsideFileCount++);
      } catch (error) {
        (await O?.release().catch(() => {}), await rmdir(join(uploadsDir, E)).catch(() => {}));
        let I = getErrnoCode(error) === "ENOENT" ? await compareExistingFile(d, content, !0) : void 0;
        if (I !== "absent" && I !== "same")
          return (
            totals.moveAsideFailedCount++,
            {
              code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
              why: `not saved: what was at this path could not be moved into a folder of kept copies (${error}), and was left there${u === 0 ? "" : _}`,
              ...((I === void 0 || I === "changed" || I === "other") && { leavesADifferentFile: !0 }),
            }
          );
      }
    }
  } finally {
    await s?.held.release().catch(() => {});
  }
}
//@ chunk-n4bsg1hp.js:6123-6746 layout
async function restoreMovedAside(e, i, o, n, r) {
  if (e === void 0) return !1;
  let a = join(i, o),
    d = join(e.held.at, o);
  try {
    let u = !1;
    try {
      (await link(d, a), (u = !0));
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") throw error;
    }
    if (u)
      await unlink(d).catch((_) =>
        debug(`${o} is back at its path, but a second name for it stays in its .kept- folder: ${_}`),
      );
    else {
      if (
        !(await lstat(a).then(
          () => !1,
          (h) => getErrnoCode(h) === "ENOENT",
        ))
      )
        throw Error("the path is taken again, or could not be checked");
      await retryFsOp(d, a);
    }
  } catch (error) {
    return (debug(`could not move ${o} back out of its .kept- folder, where it stays: ${error}`), !1);
  }
  n.movedAsideFileCount--;
  let index = r.indexOf(e.name);
  if (index !== -1) r.splice(index, 1);
  return (await rmdir(join(i, e.name)).catch(() => {}), !0);
}
/**
 * 用 link(2) 原子放置文件（失败时改为看名字空闲后 rename）。
 */
//@ chunk-n4bsg1hp.js:6746-7132 layout
async function linkIntoPlace(e, i, o, n, r, a) {
  if (!a.renamesAfterALook)
    try {
      return (await link(e, i), r.linkedFileCount++, "published");
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") return "taken";
      (debug(`link(2) failed for ${o} (${error}); looking at the name, to rename into it only if it is free`),
        (a.renamesAfterALook = !0));
    }
  let d = await compareExistingFile(i, n, !0);
  if (d !== "absent") return d;
  return (await retryFsOp(e, i), r.renamedAfterLinkRefusedCount++, "published");
}
//@ chunk-n4bsg1hp.js:7132-7385 layout
async function countWouldMoveAside(e, i, o) {
  let startTime = performance.now(),
    r = await compareExistingFile(e, i, !0);
  if (
    ((o.slowestWouldMoveLookMs = Math.max(o.slowestWouldMoveLookMs, performance.now() - startTime)),
    r === "changed" || r === "other")
  )
    o.wouldMoveAsideFileCount++;
  else if (r === "same") o.wouldLeaveSameFileCount++;
}
//@ chunk-n4bsg1hp.js:7385-7430 layout
function canSpillToUploads() {
  return mn() && getSessionUploadsDirOverride() === null && !isDiskless();
}
//@ chunk-n4bsg1hp.js:7430-7509 layout
var UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
//@ chunk-n4bsg1hp.js:7509-7611 layout
function recordSavedName(e, i, o) {
  e.idsBySavedName.set(i, [...(e.idsBySavedName.get(i) ?? []), o.file_uuid.toLowerCase()]);
}
/**
 * 附件保存文件名：file_uuid 前缀（或稳定形式）+ 清洗后的原文件名。
 */
//@ chunk-n4bsg1hp.js:7611-7749 fingerprint = attachmentSchema (0.694)
function savedFileNameFor(e, i) {
  return iwn(
    i
      ? m3r(e.file_uuid)
      : (e.file_uuid.slice(0, 8) || randomUUID().slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, "_"),
    sanitizePeerFileName(e.file_name),
  );
}
//@ chunk-n4bsg1hp.js:7749-7905 placement
function isRetryableDownloadFailure(e) {
  let i = e.httpStatus ?? 0;
  return (
    e.failure === "stalled" ||
    (e.failure === "error" && e.final !== !0) ||
    (e.failure === "http_status" && (i >= 500 || i === 408 || i === 429))
  );
}
//@ chunk-n4bsg1hp.js:7905-7985 placement
function wantsModelCopy(e) {
  return (
    e > IMAGE_LIMITS.targetRawSize ||
    (e > vY && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lucky_widget", !1) === !0)
  );
}
//@ chunk-n4bsg1hp.js:7985-8174 placement
function fetchModelCopy(e, i, o, n, r) {
  return resolveOne({
    fileUuid: e,
    baseUrl: i,
    modelCopy: !0,
    forPrefetch: !1,
    maxBytes: IMAGE_LIMITS.targetRawSize,
    spillTo: void 0,
    token: () => o,
    abort: n,
    quietLimitMs: PREFLIGHT_QUIET_LIMIT_MS,
    totals: r,
    admitBytes: () => !0,
  });
}
/**
 * 下载一个入站附件：取 OAuth 令牌、图像/PDF 处理、大小上限、停滞检测、重试与写入 uploads 目录（约 11 KB）。
 */
//@ chunk-n4bsg1hp.js:8174-19102 placement
async function resolveInboundAttachment(e, i, o, n, r, a, d, s, u, _, h = !1, p, M = !1, E = "off") {
  let O = oauthRefreshLatchStamp(signInRefreshState().recoveries);
  if (isBridgeFileLoginRefused()) await settleStoredLoginRefusal();
  let C =
    u?.accessToken ??
    (isStorageV5Enabled() && s !== void 0 ? await getBridgeAccessTokenAsync(s) : getBridgeAccessToken());
  if (!C) return (debug("skip: no oauth token"), recordDownloadFailure(n, "no_token", 0));
  let I = C,
    R = o && e.is_image === !0 && e.sha256 === void 0,
    D,
    abortController = new AbortController();
  using Q = { [Symbol.dispose]: () => abortController.abort() };
  let S = [],
    w,
    z,
    j,
    H,
    Fe = !1,
    we = 0,
    Oe = r;
  try {
    let B = e.sha256 === void 0 ? MAX_ATTACHMENT_BYTES : Lue,
      T = e.sha256 === void 0 && canSpillToUploads() ? join(_ ?? NA(), savedFileNameFor(e, M)) : void 0,
      L = e.sha256 === void 0 && gt(d) ? d : void 0;
    if (typeof e.file_size === "number" && e.file_size > (T === void 0 && L === void 0 ? B : Lun))
      return recordDownloadFailure(n, "too_large", 0);
    if (
      R &&
      !T8r() &&
      typeof e.file_size === "number" &&
      wantsModelCopy(e.file_size) &&
      isFirstPartyProvider() &&
      !isEssentialTrafficOnly()
    )
      D = fetchModelCopy(e.file_uuid, u?.baseUrl, C, abortController, n);
    let te = ct(u),
      x = writtenInUploadsDir(e.file_uuid, u);
    if (
      te !== void 0 &&
      x !== void 0 &&
      x.bearer === computeContentHash(C) &&
      (x.size <= B || x.path === T) &&
      (e.sha256 === void 0 || e.sha256 === x.sha256)
    ) {
      let ne = x.size > B;
      if (ne && (await sha256OfFile(x.path, x.size)) === x.sha256)
        return (recordSavedName(n, basename(x.path), e), n.reusedFileCount++, { path: x.path });
      let ye = ne ? null : await readPeerFileBounded(x.path, x.size);
      if (ye !== null && computeContentHash(ye) === x.sha256)
        ((w = ye), (j = x.sha256), (H = x.path), n.reusedFileCount++);
      else if (te.get(ge(e.file_uuid)) === x) te.delete(ge(e.file_uuid));
    }
    if (h && T !== void 0) {
      let ne = await lstat(T).catch(() => {
        return;
      });
      if (ne?.isFile() && ne.size > B)
        return (recordSavedName(n, basename(T), e), n.reusedFileCount++, { path: T });
    }
    let se = inboundAttachmentDownloadRegistry(),
      de = ge(e.file_uuid);
    se.refusedEarly?.delete(de);
    let q = w === void 0 && u === void 0 && p === void 0 ? se.byFileUuid.get(de) : void 0;
    while (q !== void 0) {
      let startTime = performance.now(),
        ye = takeInFlightDownload(q, startTime, computeContentHash(C)),
        he = q.settledAt === void 0,
        We = q.startedBy === "prefetch",
        bytes = await q.bytes,
        Re = performance.now() - startTime;
      if (((we += Re), We && he)) {
        if (
          (n.joinedInFlightCount++,
          (n.slowestJoinWaitMs = Math.max(n.slowestJoinWaitMs, Re)),
          q.headersTimedOut)
        )
          Oe = Math.max(1, r - 1);
      }
      let ie = q.bearer === computeContentHash(C),
        A =
          bytes !== null &&
          ie &&
          bytes.length <= B &&
          (typeof e.sha256 !== "string" ||
            verifyPeerFileIntegrity(bytes, { sha256: e.sha256, file_size: e.file_size }));
      if (A) {
        if (u === void 0) restoreOAuthRefreshLatch(signInRefreshState(), O);
        ((w = bytes), (z = q.servedPageCount), (Fe = !0));
      } else if (
        bytes === null &&
        he &&
        ie &&
        shouldRedownload(q, startTime) &&
        !(q.failure === "too_large" && L !== void 0)
      )
        return "writeFailed" in q
          ? recordWriteFailure(n, q.writeFailed)
          : recordDownloadFailure(n, q.failure ?? "error", q.receivedBytes);
      if (We && bytes !== null) {
        if (A) n.prefetchedFileCount++;
        if (ye) logPrefetchUse(q, bytes, { inFlight: he, passes: A, sameBearer: ie, waitedMs: Re });
      }
      let Z = w === void 0 ? se.byFileUuid.get(de) : void 0;
      q = Z !== q && Z?.startedBy === "message" && Z.bearer === computeContentHash(C) ? Z : void 0;
    }
    if (w === void 0) {
      let abortController = new AbortController(),
        ye = () => abortController.abort();
      if ((p?.addEventListener("abort", ye, { once: !0 }), p?.aborted)) ye();
      let he,
        We = 0,
        _e = {
          fileUuid: e.file_uuid,
          baseUrl: u?.baseUrl,
          modelCopy: !1,
          forPrefetch: !1,
          maxBytes: L !== void 0 && typeof e.file_size === "number" && e.file_size > B ? 0 : B,
          spillTo: T === void 0 ? void 0 : async () => openSpill(await ensureAttachmentsDir(dirname(T)), T),
          token: () => I,
          admitBytes: (A) => {
            if (((We = A), he !== void 0)) he.receivedBytes = A;
            return !0;
          },
        },
        Re = downloadWithRetries(Oe, we, abortController, n, _e)
          .then(async (A) => {
            if (
              u !== void 0 ||
              !("failure" in A) ||
              A.httpStatus !== 401 ||
              getBridgeTokenOverride() !== void 0
            )
              return A;
            let Z = await refreshTokenForDownload(I, s, d, abortController.signal, a, n);
            if (Z === void 0) return A;
            if (((I = Z.bearer), (O = Z.stamp), he !== void 0)) he.bearer = computeContentHash(Z.bearer);
            n.retriedAfter401Count++;
            let pe = await downloadWithRetries(1, 0, abortController, n, _e);
            if (!("failure" in pe) && !("writeFailed" in pe)) n.recoveredFileCount++;
            return pe;
          })
          .catch((A) => (logError(A), { failure: "error" }));
      if (u === void 0 && p === void 0 && jt().value)
        ((he = newDownloadEntry("message", abortController, Re, computeContentHash(C))),
          se.byFileUuid.set(de, he));
      let ie = await Re;
      if (
        (p?.removeEventListener("abort", ye),
        "failure" in ie && ie.failure === "too_large" && L !== void 0 && !p?.aborted)
      ) {
        let A = savedFileNameFor(e, M),
          upload = await L.fetchUpload(A, e.file_uuid);
        if (upload.ok)
          return (recordSavedName(n, A, e), n.overMemoryLimitFileCount++, { path: join(_ ?? NA(), A) });
        if (!upload.tooLarge)
          return (
            debug(`the machine with the uploads folder could not download ${e.file_uuid}: ${upload.error}`),
            n.failedWriteCount++,
            (n.lastFailedWrite = { code: lit("unknown"), step: lit("fetched_by_container") }),
            { failure: "write" }
          );
      }
      if ("failure" in ie) return recordDownloadFailure(n, ie.failure, We, ie.httpStatus);
      if (u === void 0) (restoreOAuthRefreshLatch(signInRefreshState(), O), resetAuthFailureTracking());
      if ("writeFailed" in ie) return recordWriteFailure(n, ie.writeFailed);
      if ("file" in ie) {
        let { file: file } = ie,
          Z = lit("link"),
          pe = !h ? E : "off",
          Ne;
        try {
          if (p?.aborted) return recordDownloadFailure(n, "stopped", 0);
          if ((recordSavedName(n, basename(file.placeAt), e), pe === "count")) {
            if ((await countWouldMoveAside(file.placeAt, file, n), p?.aborted))
              return recordDownloadFailure(n, "stopped", 0);
          }
          let Ee = !h && !ze(pe);
          if (ze(pe)) {
            Z = lit("write");
            let Ue = !1,
              Ge = { renamesAfterALook: !1 },
              Te = basename(file.placeAt),
              tt = await publishWithMoveAside(
                async () => {
                  if (p?.aborted) return ((Ue = !0), "failed");
                  return linkIntoPlace(file.path, file.placeAt, Te, file, n, Ge);
                },
                dirname(file.placeAt),
                Te,
                file,
                n,
                S,
              );
            if (Ue) return recordDownloadFailure(n, "stopped", 0);
            if (tt === "same") n.unchangedOnDiskCount++;
            else if (typeof tt === "object") Ne = tt;
          } else if (h)
            try {
              (await link(file.path, file.placeAt), n.linkedFileCount++);
            } catch (error) {
              let Ge = getErrnoCode(error) === "EEXIST",
                Te = await compareExistingFile(file.placeAt, file);
              if (Te === "same") n.unchangedOnDiskCount++;
              else if (Te === "changed" || (Te === "unknown" && Ge)) n.keptChangedFileCount++;
              else if (Te === "absent" && !Ge) Ee = !0;
              else throw error;
            }
          if (Ee) {
            if (((Z = lit("rename")), await retryFsOp(file.path, file.placeAt), h))
              n.renamedAfterLinkRefusedCount++;
          }
        } catch (error) {
          return (
            debug(`write ${file.target} failed: ${error}`),
            n.failedWriteCount++,
            (n.lastFailedWrite = { code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"), step: Z }),
            { failure: "write", ...keptAsideResult(pe, S, file.target, !1) }
          );
        } finally {
          (await rm(file.path, { force: !0 }).catch((Ee) => {
            (debug(`the staged name of ${file.target} could not be removed (${file.path}): ${Ee}`),
              n.stagedNameLeftCount++);
          }),
            await file.release());
        }
        if (Ne !== void 0)
          return (
            debug(`write ${file.target} failed: ${Ne.why}`),
            n.failedWriteCount++,
            (n.lastFailedWrite = { code: Ne.code, step: lit("move_aside") }),
            { failure: "write", ...keptAsideResult(pe, S, file.target, !1, Ne) }
          );
        return (
          n.overMemoryLimitFileCount++,
          rememberResolvedFile(
            e,
            { path: file.target, size: file.size, sha256: file.sha256, bearer: computeContentHash(I) },
            u,
          ),
          { path: file.target, ...keptAsideResult(pe, S, file.target, !0) }
        );
      }
      ((w = ie.data), (z = ie.servedPageCount));
    }
  } catch (error) {
    return (debug(`fetch ${e.file_uuid} threw: ${error}`), recordDownloadFailure(n, "error", 0));
  }
  if (
    typeof e.sha256 === "string" &&
    !Fe &&
    !verifyPeerFileIntegrity(w, { sha256: e.sha256, file_size: e.file_size })
  )
    return (debug(`fetch ${e.file_uuid} failed integrity verification`), { failure: "digest_mismatch" });
  let Ae = { resizeMs: 0, pngPaletteMs: 0, byteBudgetMs: 0 },
    Me = w.length > IMAGE_LIMITS.targetRawSize,
    xe =
      R &&
      !T8r() &&
      Ph(w) !== null &&
      (imageExceedsDimension(w, aQt) || wantsModelCopy(w.length)) &&
      isFirstPartyProvider() &&
      !isEssentialTrafficOnly(),
    Se;
  if (xe) {
    let B = I === C ? await D : void 0;
    if (B === void 0 || ("failure" in B && isRetryableDownloadFailure(B)))
      B = await fetchModelCopy(e.file_uuid, u?.baseUrl, I, new AbortController(), n);
    if ("data" in B) {
      let T = parseWebpHeader(w),
        L = parseWebpHeader(B.data),
        te =
          T !== void 0 &&
          L !== void 0 &&
          Math.max(L.width, L.height) <= MAX_INLINE_IMAGE_DIMENSION &&
          (Math.max(L.width, L.height) < Math.max(T.width, T.height) ||
            Math.min(L.width, L.height) < Math.min(T.width, T.height));
      if (
        Me ||
        (!imageExceedsDimension(B.data, aQt) &&
          (imageExceedsDimension(w, aQt) || (B.data.length < w.length && !te)))
      )
        Se = B.data;
    }
  }
  let startTime = performance.now(),
    ve = (B) =>
      convertImagesToBlocks(B, IMAGE_LIMITS, { timings: Ae }).catch(
        (T) => (debug(`inline ${e.file_uuid} threw: ${T}`), null),
      ),
    Le = Se ? await ve(Se) : null,
    re = Le ?? (R ? await ve(w) : null);
  if (
    ((n.slowestInlineImageBuildMs = Math.max(n.slowestInlineImageBuildMs, performance.now() - startTime)),
    (n.slowestInlineImageResizeMs = Math.max(n.slowestInlineImageResizeMs, Ae.resizeMs)),
    (n.slowestInlineImagePngPaletteMs = Math.max(n.slowestInlineImagePngPaletteMs, Ae.pngPaletteMs)),
    (n.slowestInlineImageByteBudgetMs = Math.max(n.slowestInlineImageByteBudgetMs, Ae.byteBudgetMs)),
    Le)
  )
    n.modelCopyCount++;
  else if (xe) {
    if ((n.modelCopyMissedCount++, re)) n.modelCopyMissedSentAsIsCount++;
  }
  if (re && detectImageFormatFromBuffer(w) === "image/png") {
    if ((n.inlinedPngSourceCount++, pngMayHaveTransparency(w))) n.inlinedPngSourceMaybeTransparentCount++;
    if (re.source.type === "base64" && re.source.media_type === "image/jpeg")
      n.inlinedPngSourceSentAsJpegCount++;
  }
  let U = re
    ? iwn(M ? m3r(e.file_uuid) : randomUUID().slice(0, 8), `image.${sir[detectImageFormatFromBuffer(w)]}`)
    : savedFileNameFor(e, M);
  recordSavedName(n, U, e);
  let $e = _ ?? NA(),
    W = join($e, U),
    Pe = getSessionId(),
    Ie = getSessionUploadsDirOverride() === null && !isDiskless(),
    ce = h && e.sha256 === void 0 && Ie,
    ae = !h && Ie ? E : "off";
  if (ae === "count") await countWouldMoveAside(W, w, n);
  let me =
    !h || e.sha256 !== void 0 ? "absent" : H === W ? "same" : ce ? await compareExistingFile(W, w) : "absent";
  if (p?.aborted) return recordDownloadFailure(n, "stopped", 0);
  let startTime_2 = performance.now(),
    fe,
    Ce,
    y,
    G,
    ee = !1,
    be = !1;
  if (me === "same") n.unchangedOnDiskCount++;
  else if (me === "changed" || me === "unknown") n.keptChangedFileCount++;
  else if (
    isStorageV5Enabled() &&
    d !== void 0 &&
    isValidKeySegment(Pe) &&
    isValidKeySegment(U) &&
    (_ === void 0 || _ === NA()) &&
    (getSessionUploadsDirOverride() !== null || getLocalUploadsRoot() === null)
  ) {
    let userConfigDir = STORAGE_SPACES.userConfigDir("uploads", [Pe, U]),
      T,
      L = ze(ae)
        ? await publishWithMoveAside(
            async () => {
              if (p?.aborted) return ((ee = !0), "failed");
              if (
                ((T = await writeWithPageCount(d, U, z, userConfigDir, w, {
                  mode: 384,
                  precondition: { type: "ifAbsent" },
                })),
                T.ok)
              )
                return "published";
              let x = storageErrorCode(T.error);
              return T.error.code === "AlreadyExists" || x === "ELOOP" || x === "ENXIO" || x === "EISDIR"
                ? "taken"
                : "failed";
            },
            dirname(W),
            U,
            w,
            n,
            S,
          )
        : void 0;
    if (ee) return recordDownloadFailure(n, "stopped", 0);
    let te =
      T ??
      (await writeWithPageCount(
        d,
        U,
        z,
        userConfigDir,
        w,
        ce ? { mode: 384, precondition: { type: "ifAbsent" } } : { mode: 384 },
      ));
    if (L === "same") n.unchangedOnDiskCount++;
    else if (typeof L === "object") G = L;
    else if (ce && !te.ok && te.error.code === "AlreadyExists") Ce = lit("storage_backend");
    else if (!te.ok)
      ((fe = formatStorageError(te.error)),
        (n.lastFailedWrite = {
          code: sanitizeErrnoTokenForTelemetry(storageErrorCode(te.error)) ?? fromEnum(te.error.code),
          step: lit("storage_backend"),
        }));
  } else if (isDiskless())
    (warnDisklessSettingsWrite("inbound_attachment", W),
      (fe = "refused: this session is diskless and writes no files to this machine's disk"),
      (n.lastFailedWrite = { code: lit("diskless"), step: lit("refused") }));
  else {
    let B = lit("mkdir");
    try {
      let T = await ensureAttachmentsDir($e);
      try {
        if (p?.aborted) return recordDownloadFailure(n, "stopped", 0);
        B = lit("write");
        let L = join(T.at, U),
          te = !ce && !ze(ae);
        if (ze(ae)) {
          let x = await writeIfMissing(L, w, 384),
            se = { renamesAfterALook: !1 };
          try {
            let de = await publishWithMoveAside(
              async () => {
                if (p?.aborted) return ((ee = !0), "failed");
                return linkIntoPlace(x, L, U, w, n, se);
              },
              T.at,
              U,
              w,
              n,
              S,
            );
            if (ee) return recordDownloadFailure(n, "stopped", 0);
            if (((be = de === "published"), de === "same")) n.unchangedOnDiskCount++;
            else if (typeof de === "object") G = de;
          } finally {
            await retryTransient(() => unlink(x)).catch((de) => {
              if (getErrnoCode(de) !== "ENOENT")
                (debug(`the staged name of ${U} could not be removed: ${de}`), n.stagedNameLeftCount++);
            });
          }
        } else if (ce) {
          let x = await writeIfMissing(L, w, 384);
          try {
            (await link(x, L), n.linkedFileCount++);
          } catch (error) {
            if (getErrnoCode(error) === "EEXIST") Ce = lit("link");
            else {
              if (
                (debug(
                  `link(2) failed for ${U} (${error}); looking at the name again, to rename into it only if it is free`,
                ),
                (y = await compareExistingFile(L, w)),
                y === "unknown")
              )
                throw ((B = lit("look_after_link")), error);
              ((te = y === "absent"), (Ce = te ? void 0 : lit("link")));
            }
          } finally {
            await retryTransient(() => unlink(x)).catch((se) => {
              (debug(`the staged name of ${U} could not be removed: ${se}`), n.stagedNameLeftCount++);
            });
          }
        }
        if (te) {
          if ((await writeFileAtomic(L, w, 384), ce)) n.renamedAfterLinkRefusedCount++;
        }
      } finally {
        await T.release();
      }
    } catch (error) {
      ((fe = `${error}`),
        (n.lastFailedWrite = { code: sanitizeErrnoForTelemetry(error) ?? lit("unknown"), step: B }));
    }
  }
  if (G !== void 0 && fe === void 0)
    ((fe = G.why), (n.lastFailedWrite = { code: G.code, step: lit("move_aside") }));
  if (Ce !== void 0 && fe === void 0)
    if (((y ??= await compareExistingFile(W, w)), y === "same")) n.unchangedOnDiskCount++;
    else if (y === "changed" || y === "unknown") n.keptChangedFileCount++;
    else
      ((fe =
        "not saved: something that is not a regular file (a link, a pipe or a folder) has this name and was left as it is, or what had the name was gone when checked again"),
        (n.lastFailedWrite = { code: lit("EEXIST"), step: Ce }));
  if (((n.slowestWriteMs = Math.max(n.slowestWriteMs, performance.now() - startTime_2)), fe !== void 0)) {
    if ((debug(`write ${W} failed: ${fe}`), n.failedWriteCount++, re))
      return (n.inlinedImageNotSavedCount++, { imageBlock: re });
    return { failure: "write", ...(be ? void 0 : keptAsideResult(ae, S, W, !1, G)) };
  }
  let startTime_3 = performance.now();
  if (
    ((j ??= computeContentHash(w)),
    (n.slowestHashAfterWriteMs = Math.max(n.slowestHashAfterWriteMs, performance.now() - startTime_3)),
    i && e.sha256 === void 0 && getSessionUploadsDirOverride() === null)
  )
    try {
      rememberAttachmentDigest(await realpath(W), j);
    } catch {
      debug(`registration skipped for ${W}`);
    }
  if (
    (rememberResolvedFile(e, { path: W, size: w.length, sha256: j, bearer: computeContentHash(I) }, u),
    debug(`resolved ${e.file_uuid} \u2192 ${W} (${w.length} bytes)`),
    re)
  )
    return (debug(`inlined ${e.file_uuid} (${w.length} bytes)`), { imageBlock: re, path: W });
  if (R)
    return (
      debug(`inline ${e.file_uuid} fell back to @path ref`),
      { path: W, inlineFellBack: !0, ...keptAsideResult(ae, S, W, !0) }
    );
  return { path: W, ...keptAsideResult(ae, S, W, !0) };
}
//@ chunk-n4bsg1hp.js:19102-19269 placement
function rememberResolvedFile(e, i, o) {
  let n = ct(o);
  if (n !== void 0) {
    if ((n.delete(ge(e.file_uuid)), n.size >= MAX_REMEMBERED_FILES)) {
      let r = n.keys().next().value;
      if (r !== void 0) n.delete(r);
    }
    n.set(ge(e.file_uuid), i);
  }
}
//@ chunk-n4bsg1hp.js:19269-19424 placement
var FAILURE_REASON_TEXT = {
  download: "it could not be downloaded",
  digest_mismatch: "it failed integrity verification",
  write: "it could not be written to the uploads directory",
};
/**
 * 解析一条入站消息的全部附件（并发、数量上限）：成功的生成 `@"path"` 前缀或内联图片块，失败的生成 [SendFile: …] 说明；汇总遥测（bridge_attachment_resolve、下载耗时）并返回 {prefix, imageBlocks, deliveredCount, missingFiles, timing…}。
 */
//@ chunk-n4bsg1hp.js:19424-24801 placement
async function resolveInboundAttachments(attachments, i, o, n, r, a, d, s, u, _, h = !0, p = !1) {
  if (attachments.length === 0)
    return { prefix: "", imageBlocks: [], inlinedImagePaths: [], deliveredCount: 0 };
  debug(`resolving ${attachments.length} attachment(s)`);
  let refusedEarly = inboundAttachmentDownloadRegistry().refusedEarly;
  if (refusedEarly !== void 0 && refusedEarly.size > 0)
    for (let y of attachments) refusedEarly.delete(ge(y.file_uuid));
  let startTime = performance.now(),
    O = d !== !1 && getSessionUploadsDirOverride() === null && !isDiskless() && !0,
    C = O ? getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_shelf", "off") : void 0,
    I = !O ? void 0 : C === "tell" ? (a === void 0 ? "tell" : "on") : C === "on" || C === "count" ? C : "off",
    R = {
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
        getSessionUploadsDirOverride() !== null ? 2 : dirname(s ?? NA()) === getLocalUploadsRoot() ? 1 : 0,
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
    },
    filtered = attachments.filter((y) => typeof y.sha256 === "string"),
    N = zt(attachments);
  if (isBridgeFileLoginRefused()) await settleStoredLoginRefusal();
  if (!(
    a?.accessToken ??
    (isStorageV5Enabled() && r !== void 0 ? await getBridgeAccessTokenAsync(r) : getBridgeAccessToken())
  )) {
    debug("skip: no oauth token");
    let y = {
      ...summarizeAttachmentResolution(attachments.slice(0, N), 0, 0, R, startTime),
      ...aheadOfFilesTelemetry(u, s),
    };
    (logFeatureSad("bridge_attachment_resolve", "no_token", y),
      logForDiagnosticsNoPII("warn", "bridge_attachment_download_timing", {
        outcome: "no_token",
        should_query: d,
        ...y,
      }));
    let G = allMissing(
      attachments.filter((ee) => typeof ee.sha256 !== "string"),
      "no_token",
    );
    if (filtered.length > 0) {
      let ee = filtered.length - qoe,
        be = ee > 0 ? filtered.slice(0, qoe) : filtered;
      emitPeerFileReceiveTelemetry("bridge", be.length, 0);
      let et = ee > 0 ? " " + peerFileCountCapNote(ee) : "";
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
        ...(G.length > 0 && { missingFiles: G }),
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
  let S = [],
    w = attachments,
    z = w.length > N;
  if (z) {
    if ((debug(`dropping ${w.length - N} attachment(s) over the ${N} cap`), filtered.length > 0))
      S.push(peerFileCountCapNote(w.length - N));
    w = w.slice(0, N);
  }
  let j = i && o,
    H = a === void 0 && _ === void 0,
    Fe = H && w.length > MAX_LISTED_ATTACHMENTS,
    we = limitConcurrency(MAX_LISTED_ATTACHMENTS, (y) =>
      resolveInboundAttachment(
        y,
        i,
        j,
        R,
        d === !1 ? DOWNLOAD_TRIES.noTurn : DOWNLOAD_TRIES.startsTurn,
        h,
        n,
        r,
        a,
        s,
        d === !1,
        _,
        p,
        I,
      ).finally(() => {
        if (Fe) dropSettledTakenDownload(y);
      }),
    ),
    Oe;
  try {
    Oe = await Promise.all(w.map((y) => we(y)));
  } finally {
    for (let y of H ? w : []) dropSettledTakenDownload(y);
  }
  let Ae = [],
    Me = [],
    xe = [],
    Se = [],
    Ye = 0,
    ve = 0,
    Le = 0,
    re = !1,
    U = [],
    $e = 0,
    W = [],
    Pe = [];
  Oe.forEach((y, G) => {
    let ee = w[G],
      be = typeof ee.sha256 === "string";
    if (be) ve++;
    if ("path" in y) Pe.push({ file_uuid: ee.file_uuid, path: y.path, inlined: "imageBlock" in y });
    if ("imageBlock" in y) {
      if ((Me.push(y.imageBlock), Se.push(ee.file_uuid), "path" in y)) xe.push(y.path);
    } else if ("path" in y) {
      if ((Ae.push(`@"${y.path}"`), y.inlineFellBack)) Ye++;
      if (be) Le++;
      if (y.aside !== void 0) (W.push(y.aside), S.push(asideSentence(y.aside)));
    } else {
      if (y.failure === "digest_mismatch") re = !0;
      if (be) {
        if ((S.push(peerFileFailureNote(ee.file_name, FAILURE_REASON_TEXT[y.failure])), y.aside !== void 0))
          (W.push(y.aside), S.push(asideSentence(y.aside)));
      } else if (
        (U.push({
          file_uuid: ee.file_uuid,
          reason: y.failure === "write" ? "write" : (y.cause ?? "download"),
        }),
        y.aside !== void 0)
      )
        ($e++, W.push(y.aside), S.push(asideSentence(y.aside)));
    }
  });
  let Ie = filtered.length === 0 ? attachments.slice(N) : [];
  if (U.length > 0 || Ie.length > 0) {
    U.push(...allMissing(Ie, "count_cap"));
    let y = U.length - $e;
    if (y > 0) S.push(missingAttachmentsNote(y, w.length - ve + Ie.length));
  }
  if (Ie.length > 0) S.push(`[a message takes at most ${N} attachments]`);
  let ce = R.lastFailedWrite?.code === "ENOSPC" && U.some((y) => y.reason === "write");
  if (ce) S.push(`[${NO_SPACE_FOR_A_FILE}]`);
  if (ve > 0) emitPeerFileReceiveTelemetry("bridge", ve, Le);
  let ae = Ae.length + Me.length,
    me = { ...summarizeAttachmentResolution(w, ae, Me.length, R, startTime), ...aheadOfFilesTelemetry(u, s) },
    oe;
  if (ae === 0)
    ((oe = re ? "digest_mismatch" : "all_failed"), logFeatureBad("bridge_attachment_resolve", oe, me));
  else if (ae < w.length)
    ((oe = re ? "digest_mismatch" : "partial_failed"), logFeatureSad("bridge_attachment_resolve", oe, me));
  else if (z) ((oe = "over_count_cap"), logFeatureSad("bridge_attachment_resolve", oe, me));
  else if (R.inlinedImageNotSavedCount > 0)
    ((oe = "inlined_image_not_saved"), logFeatureSad("bridge_attachment_resolve", oe, me));
  else ((oe = "ok"), logFeatureOk("bridge_attachment_resolve", me));
  let fe = (oe !== "ok" && oe !== "over_count_cap") || R.failedWriteCount > 0;
  if (
    (logForDiagnosticsNoPII(fe ? "warn" : "info", "bridge_attachment_download_timing", {
      outcome: oe,
      should_query: d,
      ...me,
    }),
    Ye > 0)
  )
    logFeatureSad("bridge_attachment_inline_image", "fallback_path_ref");
  else if (Me.length > 0) logFeatureOk("bridge_attachment_inline_image");
  if (R.modelCopyMissedCount > 0)
    logFeatureSad(
      "bridge_attachment_model_copy",
      R.modelCopyMissedSentAsIsCount < R.modelCopyMissedCount ? "fallback_path_ref" : "fallback_original",
    );
  else if (R.modelCopyCount > 0) logFeatureOk("bridge_attachment_model_copy");
  let Ce = [...Ae, ...S];
  return {
    prefix: Ce.length > 0 ? Ce.join(" ") + " " : "",
    imageBlocks: Me,
    inlinedImagePaths: R.inlinedImageNotSavedCount > 0 ? [] : xe,
    ...(Se.length > 0 && { imageFileUuids: Se }),
    deliveredCount: ae,
    ...(U.length > 0 && { missingFiles: U }),
    ...(W.length > 0 && { asideOutcomes: W }),
    ...(ce && { noSpace: ce }),
    ...(Pe.length > 0 && { writtenFiles: Pe }),
    timing: {
      timeToHeadersMs: Math.round(R.slowestTimeToHeadersMs),
      downloadMs: Math.round(R.slowestDownloadMs),
      joinWaitMs: Math.round(R.slowestJoinWaitMs),
      imageBuildMs: Math.round(R.slowestInlineImageBuildMs),
      approxDownloadedBytes: Number(R.downloadedBytes.toPrecision(2)),
      prefetchedFileCount: R.prefetchedFileCount,
    },
  };
}
//@ chunk-n4bsg1hp.js:24801-25067 fingerprint = prependPathRefs (1)
function prependPathRefs(content, prefix) {
  if (!prefix) return content;
  if (typeof content === "string") return injectPeerFilePrefix(content, prefix);
  let lastIndex = content.findLastIndex((n) => n.type === "text");
  if (lastIndex !== -1) {
    let n = content[lastIndex];
    if (n.type === "text")
      return [
        ...content.slice(0, lastIndex),
        { ...n, text: injectPeerFilePrefix(n.text, prefix) },
        ...content.slice(lastIndex + 1),
      ];
  }
  return [...content, { type: "text", text: prefix.trimEnd() }];
}
//@ chunk-n4bsg1hp.js:25067-25200 placement
function resolveAndPrepend_2(msg, content) {
  if (content.length === 0) return msg;
  let o = typeof msg === "string" ? (msg.trim() === "" ? [] : [{ type: "text", text: msg }]) : A9o(msg);
  return [...content, ...o];
}
//@ chunk-n4bsg1hp.js:25200-25272 placement
function allMissing(e, i) {
  return e.map((o) => ({ file_uuid: o.file_uuid, reason: i }));
}
//@ chunk-n4bsg1hp.js:25272-25600 placement
function contentWithPlannedPathRefs(e, i, o, n = !1) {
  let r = extractInboundAttachments(e);
  if (r.length === 0 || r.length > zt(r)) return;
  let a = [];
  for (let s of r) {
    let u = n ? m3r(s.file_uuid) : s.file_uuid.slice(0, 8).replace(/[^a-zA-Z0-9_-]/g, "_");
    if (u === "") return;
    let _ = iwn(u, sanitizePeerFileName(s.file_name));
    a.push(join(o, _));
  }
  let mapped = a.map((s) => `@"${s}"`);
  return { content: prependPathRefs(i ?? "", mapped.join(" ") + " "), refs: mapped, paths: a };
}
//@ chunk-n4bsg1hp.js:25600-25969 placement
async function resolveAndPrepend(e, i, o, n, r, a, d, s = !0, u = !1) {
  let _ = i ?? "",
    h = extractInboundAttachments(e);
  if (h.length === 0) return { content: _, inlinedImagePaths: [] };
  let p = o && !(typeof _ === "string" && isTaggedPeerText(_)),
    {
      prefix: prefix,
      imageBlocks: imageBlocks,
      deliveredCount: deliveredCount,
      ...C
    } = await resolveInboundAttachments(
      h,
      o,
      p,
      n,
      r,
      void 0,
      shouldQueryInboundAttachment(e),
      a,
      d,
      void 0,
      s,
      u,
    );
  if (deliveredCount === 0 && typeof _ === "string" && _.trim() === "")
    return { content: prefix.trimEnd(), ...C };
  return { content: resolveAndPrepend_2(prependPathRefs(_, prefix), imageBlocks), ...C };
}
//@ chunk-n4bsg1hp.js:25969-26102 placement
function dropSettledTakenDownload(e) {
  let i = inboundAttachmentDownloadRegistry(),
    o = ge(e.file_uuid),
    n = i.byFileUuid.get(o);
  if (n?.taken !== void 0 && n.settledAt !== void 0) i.byFileUuid.delete(o);
}
//@ chunk-n4bsg1hp.js:26102-26163 placement
function zt(e) {
  return e.every((i) => i.sha256 === void 0) ? MAX_ATTACHMENTS_WITHOUT_SHA : qoe;
}
//@ chunk-n4bsg1hp.js:26163-26198 placement
var In = { off: 0, count: 1, on: 2, tell: 3 };
//@ chunk-n4bsg1hp.js:26198-26241 placement
function ze(e) {
  return e === "on" || e === "tell";
}
//@ chunk-n4bsg1hp.js:26241-26471 placement
function keptAsideResult(e, i, o, n, r) {
  if (e !== "tell") return;
  let [a, ...d] = i.map((s) => join(dirname(o), s, basename(o)));
  if (a !== void 0) return { aside: { path: o, saved: n, keptAt: [a, ...d] } };
  return r?.leavesADifferentFile === !0 && !n ? { aside: { path: o, saved: !1, keptAt: [] } } : void 0;
}
//@ chunk-n4bsg1hp.js:26471-27199 placement
function asideSentence({ path: path, saved: saved, keptAt: [o, n] }, r = !1) {
  if (o === void 0) {
    let u = `: "${path}" holds something else (possibly a copy changed during this session), which was left in place`;
    return r ? `A file attached to a user message was not saved${u}` : `[attachment not saved${u}]`;
  }
  let d = `(possibly a copy changed during this session) was moved to "${o}"${n === void 0 ? "" : `, and what then stood there was moved to "${n}"`}`;
  if (saved) {
    let u = ` "${path}"; what was at that path ${d}`;
    return r ? `A file attached to a user message was saved to${u}` : `[saved the attached file to${u}]`;
  }
  let s = `, so what was just sent is not available; what was at "${path}" until now ${d}`;
  return r ? `A file attached to a user message was not saved${s}` : `[attachment not saved${s}]`;
}
//@ chunk-n4bsg1hp.js:27199-27324 placement
function readAheadOfFiles(e) {
  if (!e || getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_ferry", !1) !== !0) return "off";
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_marten", !1) === !0 ? "on_with_pdfs" : "on";
}
//@ chunk-n4bsg1hp.js:27324-27489 placement
function aheadOfFilesTelemetry(e, i) {
  return e === void 0
    ? {}
    : {
        ahead_of_files_flag_on: e === "off" ? 0 : 1,
        ahead_of_files_on_with_pdfs: e === "on_with_pdfs" ? 1 : 0,
        queued_ahead_of_files: i === void 0 ? 0 : 1,
      };
}
/**
 * 汇总入站附件处理统计用于遥测：文件数、已解析、下载次数、恢复/复用/预取/并入进行中数、内联图片与 PNG 转码、下载字节、失败分类、重名文件等。
 */
//@ chunk-n4bsg1hp.js:27489-30455 placement
function summarizeAttachmentResolution(attachments, resolvedCount, inlinedImageCount, stats, startTime) {
  let a = 0,
    d = 0,
    s = 0;
  for (let u of stats.idsBySavedName.values())
    if (((s += count(u, (_) => UUID_V7_PATTERN.test(_))), u.length > 1))
      ((a += u.length), (d += count(u, (_) => count(u, (h) => h === _) > 1)));
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
    ...(stats.retriedAfter401Count > 0 && { retried_after_401_count: stats.retriedAfter401Count }),
    ...(stats.slowest401RefreshWaitMs > 0 && {
      slowest_401_refresh_wait_ms: Math.round(stats.slowest401RefreshWaitMs),
    }),
    ...(stats.failedWriteCount > 0 && { failed_write_count: stats.failedWriteCount }),
    ...(stats.inlinedImageNotSavedCount > 0 && {
      inlined_image_not_saved_count: stats.inlinedImageNotSavedCount,
    }),
    ...(stats.lastFailedWrite !== void 0 && {
      last_failed_write_code: stats.lastFailedWrite.code,
      last_failed_write_step: stats.lastFailedWrite.step,
    }),
    ...(stats.unchangedOnDiskCount > 0 && { unchanged_on_disk_count: stats.unchangedOnDiskCount }),
    ...(stats.keptChangedFileCount > 0 && { kept_changed_file_count: stats.keptChangedFileCount }),
    ...(stats.linkedFileCount > 0 && { linked_file_count: stats.linkedFileCount }),
    ...(stats.renamedAfterLinkRefusedCount > 0 && {
      renamed_after_link_refused_count: stats.renamedAfterLinkRefusedCount,
    }),
    ...(stats.stagedNameLeftCount > 0 && { staged_name_left_count: stats.stagedNameLeftCount }),
    ...(stats.overMemoryLimitFileCount > 0 && {
      over_memory_limit_file_count: stats.overMemoryLimitFileCount,
    }),
    ...(stats.movedAsideFileCount > 0 && { moved_aside_file_count: stats.movedAsideFileCount }),
    ...(stats.wouldMoveAsideFileCount > 0 && { would_move_aside_file_count: stats.wouldMoveAsideFileCount }),
    ...(stats.wouldLeaveSameFileCount > 0 && { would_leave_same_file_count: stats.wouldLeaveSameFileCount }),
    ...(stats.slowestWouldMoveLookMs > 0 && {
      slowest_would_move_look_ms: Math.round(stats.slowestWouldMoveLookMs),
    }),
    ...(stats.moveAsideFailedCount > 0 && { move_aside_failed_count: stats.moveAsideFailedCount }),
    ...(a > 0 && { shared_saved_name_file_count: a, shared_saved_name_same_id_file_count: d }),
    ...(s > 0 && { time_ordered_id_file_count: s }),
    uploads_root_code: stats.uploadsRootCode,
    ...(stats.whatStandsAside !== void 0 && { move_aside_mode_code: In[stats.whatStandsAside] }),
  };
}
//@ chunk-n4bsg1hp.js:30455-30595 placement
function recordWriteFailure(e, i) {
  return (
    e.failedWriteCount++,
    (e.lastFailedWrite = {
      code: sanitizeErrnoForTelemetry(i) ?? lit("unknown"),
      step: lit("write_during_download"),
    }),
    { failure: "write" }
  );
}
//@ chunk-n4bsg1hp.js:30595-30621 placement
var En = new Set([404, 410]);
/**
 * 按失败类型累计 failedDownloads 计数（部分下载另计，记最后的 HTTP 状态），返回 {failure:"download", cause?}；404 类记为 not_found。
 */
//@ chunk-n4bsg1hp.js:30621-30943 placement
function recordDownloadFailure(stats, failure, receivedBytes, httpStatus) {
  let failedDownloads = stats.failedDownloads,
    a = FAILURE_COUNTER_KEYS[failure];
  if (((failedDownloads[a] = (failedDownloads[a] ?? 0) + 1), receivedBytes > 0))
    failedDownloads.partway_failed_count = (failedDownloads.partway_failed_count ?? 0) + 1;
  if (httpStatus !== void 0) failedDownloads.last_failed_http_status = httpStatus;
  if (failure === "too_large" || failure === "no_token") return { failure: "download", cause: failure };
  return {
    failure: "download",
    ...(failure === "http_status" && En.has(httpStatus) && { cause: "not_found" }),
  };
}
//@ chunk-n4bsg1hp.js:30943-31002 placement
function ct(e) {
  return e === void 0 && getSessionUploadsDirOverride() === null ? inboundAttachmentFileRegistry() : void 0;
}
//@ chunk-n4bsg1hp.js:31002-31090 placement
function writtenInUploadsDir(e, i) {
  let o = ct(i)?.get(ge(e));
  return o !== void 0 && dirname(o.path) === NA() ? o : void 0;
}
//@ chunk-n4bsg1hp.js:31090-31143 placement
function ge(e) {
  return Vt(e) === null ? e : e.toLowerCase();
}
//@ chunk-n4bsg1hp.js:31143-31193 placement
function jt() {
  return getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_dapper_brooks", !1);
}
//@ chunk-n4bsg1hp.js:31193-31249 placement
function Xt() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_twinkling_hoare", !1) === !0;
}
//@ chunk-n4bsg1hp.js:31249-31452 placement
function prefetchHoldWindow() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazel_lantern", 0),
    i = isCcsTenant(),
    o = i ? CCS_PREFETCH_HOLD_MS : PREFETCH_HOLD_RANGE_MS.max;
  if (typeof e !== "number" || !(e > 0)) return { ms: o, repeatRenews: !1 };
  return { ms: Math.min(o, Math.max(PREFETCH_HOLD_RANGE_MS.min, Math.round(e * 1000))), repeatRenews: !i };
}
//@ chunk-n4bsg1hp.js:31452-33852 placement
function prefetchInboundAttachments(
  e,
  { issuedAt: issuedAt, credentials: credentials, onlyThese: onlyThese = !1 },
) {
  if (isEssentialTrafficOnly()) return 0;
  let r = jt();
  if (!r.value)
    return (
      logPrefetchOutcome("bridge_attachment_prefetch_flag_off", {
        file_count: e.length,
        flag_served: FLAG_SERVED_BY_SOURCE[r.source],
      }),
      0
    );
  let a = inboundAttachmentDownloadRegistry(),
    d = prefetchHoldWindow(),
    s = {
      file_count: e.length,
      started_count: 0,
      already_present_count: 0,
      held_limit_count: 0,
      start_budget_count: 0,
      skipped_count: 0,
    },
    u = 0,
    _ = 0,
    h = 0,
    p = 0;
  if (a.earlyReadsStopped === !0 && !Xt())
    ((a.earlyReadsStopped = void 0), (a.earlyReadsStopReported = void 0));
  let M = a.earlyReadsStopped === !0,
    E = new Set(),
    O = Date.now() - issuedAt,
    C = O > Math.max(PREFETCH_AGE_HOLD_MULTIPLE * d.ms, PREFETCH_MAX_AGE_MS),
    I = C ? [] : e.slice(0, qoe);
  if (((s.skipped_count = e.length - I.length), onlyThese && !C)) {
    let Q = new Set(e.map((S) => ge(S.file_uuid)));
    for (let [S, w] of a.byFileUuid)
      if (!Q.has(S) && w.release !== void 0 && !w.taken) (w.release("dropped_unused"), _++);
  }
  for (let Q of I) {
    let S = ge(Q.file_uuid);
    if (Vt(Q.file_uuid) === null || (Q.file_size !== void 0 && Q.file_size > MAX_ATTACHMENT_BYTES)) {
      s.skipped_count++;
      continue;
    }
    let w = a.refusedEarly?.get(S);
    if (w !== void 0) {
      if (performance.now() - w < REFUSED_EARLY_COOLDOWN_MS) {
        h++;
        continue;
      }
      a.refusedEarly?.delete(S);
    }
    let z = a.byFileUuid.get(S);
    if (z !== void 0 || writtenInUploadsDir(Q.file_uuid, void 0) !== void 0) {
      if ((s.already_present_count++, d.repeatRenews && z?.release !== void 0 && !z.taken && !E.has(S)))
        (Ke(z, d.ms), E.add(S), u++);
      continue;
    }
    if (M) {
      p++;
      continue;
    }
    let j = Pn(Q.file_size),
      H = prefetchAdmission(a, j);
    if (H === "held_limit") s.held_limit_count++;
    else if (H === "start_budget") s.start_budget_count++;
    else
      (startAttachmentPrefetch(a, S, Q.file_uuid, j, credentials, d.ms, d.repeatRenews),
        E.add(S),
        s.started_count++);
  }
  let R = heldPrefetchTotals(a),
    D = {
      ...s,
      age_ms: Math.round(O),
      held_file_count: R.count,
      approx_held_bytes: Number(R.bytes.toPrecision(2)),
      ...(d.repeatRenews && {
        hold_ms: d.ms,
        refreshed_count: u,
        renewed_since_last_report: a.renewalsNotYetReported ?? 0,
      }),
      ...(onlyThese && { only_these: !0, dropped_count: _ }),
      ...(h > 0 && { refused_before_count: h }),
      ...(p > 0 && { early_reads_stopped_count: p }),
    },
    N = a.earlyReadsStopReported === !0 ? p : 0;
  if (u + h + N > 0 && u === s.already_present_count && s.file_count === u + h + N && _ === 0)
    return ((a.renewalsNotYetReported = (a.renewalsNotYetReported ?? 0) + u), 0);
  if (((a.renewalsNotYetReported = 0), p > 0)) a.earlyReadsStopReported = !0;
  if (C) logFeatureSad("bridge_attachment_prefetch", "stale", D);
  else if (p > 0) logFeatureSad("bridge_attachment_prefetch", "mark_unseen_stop", D);
  else if (s.held_limit_count > 0) logFeatureSad("bridge_attachment_prefetch", "held_limit", D);
  else if (s.start_budget_count > 0) logFeatureSad("bridge_attachment_prefetch", "start_budget", D);
  else logFeatureOk("bridge_attachment_prefetch", D);
  return (
    logPrefetchOutcome(
      s.started_count > 0 ? "bridge_attachment_prefetch_started" : "bridge_attachment_prefetch_not_started",
      { ...D, stale: C },
    ),
    s.started_count
  );
}
//@ chunk-n4bsg1hp.js:33852-33884 placement = tryReadFileForSync (1)
function logPrefetchOutcome(e, i) {
  logForDiagnosticsNoPII("info", e, i);
}
//@ chunk-n4bsg1hp.js:33884-33926 placement
function Pn(e) {
  return e !== void 0 && e > 0 ? e : 0;
}
/**
 * 判断能否再开始一个附件预取：清理窗口外的开始记录；持有中的预取数/字节超限返回 held_limit，近期开始数超预算返回 start_budget，否则 ok。
 */
//@ chunk-n4bsg1hp.js:33926-34132 placement
function prefetchAdmission(e, i) {
  let startTime = performance.now(),
    recentPrefetchStarts = e.recentPrefetchStarts;
  while (recentPrefetchStarts.length > 0 && startTime - recentPrefetchStarts[0] >= PREFETCH_START_WINDOW_MS)
    recentPrefetchStarts.shift();
  let r = heldPrefetchTotals(e);
  if (r.count >= MAX_HELD_PREFETCHES || r.bytes + i > $t()) return "held_limit";
  return recentPrefetchStarts.length < PREFETCH_START_BUDGET ? "ok" : "start_budget";
}
//@ chunk-n4bsg1hp.js:34132-34340 placement
function heldPrefetchTotals(e) {
  let i = 0,
    o = 0;
  for (let n of e.byFileUuid.values())
    if (n.startedBy === "prefetch" && !n.taken)
      (i++, (o += n.settledAt === void 0 ? Math.max(n.receivedBytes, n.statedBytes) : n.receivedBytes));
  return { count: i, bytes: o };
}
//@ chunk-n4bsg1hp.js:34340-34385 placement
function Bn(e) {
  e.release?.("expired_unused");
}
//@ chunk-n4bsg1hp.js:34385-34483 placement
function Ke(e, i) {
  (clearTimeout(e.expiry), (e.expiry = setTimeout(Bn.bind(void 0, e), i)), e.expiry.unref());
}
/**
 * 在消息到达前为一个 file_uuid 启动后台预取：带独立 AbortController 调用 resolveOne（快速静默超时、字节准入回调、served 标记埋点），
 * 把下载登记进 byFileUuid，结束后按结果记 bridge_attachment_prefetch_* 埋点、更新提前拒绝表。
 */
//@ chunk-n4bsg1hp.js:34483-36521 placement
function startAttachmentPrefetch(registry, i, fileUuid, n, bridgeContext, a, d) {
  let abortController = new AbortController(),
    u = !1,
    _ = resolveOne({
      fileUuid: fileUuid,
      baseUrl: void 0,
      modelCopy: !1,
      forPrefetch: !0,
      maxBytes: MAX_ATTACHMENT_BYTES,
      spillTo: void 0,
      quietLimitMs: FAST_QUIET_LIMIT_MS,
      token: async () => {
        let p = await getBridgeAccessTokenAsync(bridgeContext);
        if (p) h.bearer = computeContentHash(p);
        return p;
      },
      abort: abortController,
      totals: void 0,
      onServed: (p) => {
        let M = !p && Xt();
        if (M) registry.earlyReadsStopped = !0;
        logPrefetchOutcome("bridge_attachment_prefetch_served", {
          mark_seen: p,
          ...(!p && { stops_early_reads: M }),
        });
      },
      admitBytes: (p) => {
        if (((h.receivedBytes = p), h.taken || heldPrefetchTotals(registry).bytes <= $t())) return !0;
        return ((h.receivedBytes = 0), (h.statedBytes = 0), !1);
      },
    }),
    h = newDownloadEntry("prefetch", abortController, _, void 0);
  ((h.statedBytes = n),
    (h.release = (p) => {
      if (registry.byFileUuid.get(i) !== h || h.taken) return;
      if (p === "expired_unused" && d && h.settledAt === void 0) {
        Ke(h, a);
        return;
      }
      ((u = !0), clearTimeout(h.expiry), registry.byFileUuid.delete(i), abortController.abort());
      let M = {
        download_finished: h.settledAt !== void 0,
        approx_bytes: Number(h.receivedBytes.toPrecision(2)),
        ...(p === "dropped_unused" && { held_for_ms: Math.round(performance.now() - h.startedAt) }),
      };
      (logFeatureSad("bridge_attachment_prefetch_download", p, M),
        logPrefetchOutcome(`bridge_attachment_prefetch_${p}`, M));
    }),
    Ke(h, a),
    registry.recentPrefetchStarts.push(h.startedAt),
    registry.byFileUuid.set(i, h),
    _.then((p) => {
      if (!("failure" in p)) {
        if (d && registry.byFileUuid.get(i) === h && !h.taken) Ke(h, a);
        return;
      }
      if (registry.byFileUuid.get(i) === h && !h.taken)
        (registry.byFileUuid.delete(i), clearTimeout(h.expiry));
      let M = p.failure === "http_status" && p.httpStatus === HTTP_CONFLICT_STATUS;
      if (M && !h.taken) {
        let D = (registry.refusedEarly ??= new Map());
        if ((D.delete(i), D.size >= MAX_REFUSED_EARLY)) D.delete(D.keys().next().value ?? i);
        D.set(i, performance.now());
      }
      if (u) return;
      let E = {
          duration_ms: Math.round(performance.now() - h.startedAt),
          ...(p.httpStatus !== void 0 && { http_status: p.httpStatus }),
        },
        O = Jt(p),
        C = O ? "no_answer" : p.failure;
      if (M) {
        (logFeatureSad("bridge_attachment_prefetch_download", "refused_early", E),
          logPrefetchOutcome("bridge_attachment_prefetch_failed", {
            ...E,
            failure_code: PREFETCH_FAILURE_CODE_BEARER,
          }));
        return;
      }
      let taken = h.taken,
        R = taken?.by === "joiner" && taken.bearer === h.bearer && shouldRedownload(h, taken.at);
      if (R) logFeatureBad("bridge_attachment_prefetch_download", C, E);
      else logFeatureSad("bridge_attachment_prefetch_download", C, E);
      logPrefetchOutcome(
        R ? "bridge_attachment_prefetch_failed_file_lost" : "bridge_attachment_prefetch_failed",
        { ...E, failure_code: O ? PREFETCH_FAILURE_CODE_HEADERS_TIMEOUT : FAILURE_CODES[p.failure] },
      );
    }).catch(logError));
}
/**
 * 新建一条附件下载登记：bytes promise 结算时记录完成时间、失败类型、页数；由消息发起的下载直接标记为已取用。
 */
//@ chunk-n4bsg1hp.js:36521-37058 placement
function newDownloadEntry(startedBy, abortController, download, bearer) {
  let entry = {
    startedBy: startedBy,
    bytes: download.then((a) => {
      if (((entry.settledAt = performance.now()), "failure" in a))
        return ((entry.failure = a.failure), (entry.headersTimedOut = Jt(a)), null);
      if ("writeFailed" in a) return ((entry.failure = "error"), (entry.writeFailed = a.writeFailed), null);
      if (!("data" in a)) return null;
      return ((entry.servedPageCount = a.servedPageCount), a.data);
    }),
    startedAt: performance.now(),
    settledAt: void 0,
    failure: void 0,
    headersTimedOut: !1,
    receivedBytes: 0,
    statedBytes: 0,
    servedPageCount: void 0,
    abort: abortController,
    taken: startedBy === "message" ? { by: "starter" } : void 0,
    expiry: void 0,
    bearer: bearer,
  };
  return entry;
}
//@ chunk-n4bsg1hp.js:37058-37292 placement
function shouldRedownload(e, i) {
  let o = (e.settledAt ?? performance.now()) - i;
  if (e.failure === void 0) return !1;
  if (e.startedBy === "prefetch" && e.failure === "too_large") return !canSpillToUploads();
  return (
    e.startedBy !== "prefetch" ||
    (e.receivedBytes > 0 && e.failure !== "stalled" && o > DOWNLOAD_DEADLINE_SLACK_MS)
  );
}
//@ chunk-n4bsg1hp.js:37292-37400 placement
function takeInFlightDownload(e, i, o) {
  if (e.taken) return !1;
  return ((e.taken = { by: "joiner", at: i, bearer: o }), clearTimeout(e.expiry), !0);
}
/**
 * 记录一次预取结果的使用：附带是否在途、等待/下载耗时与近似字节数；校验通过记 used_joined/used_ready，否则按同一凭据（证明不符）或凭据已变分别记失败。
 */
//@ chunk-n4bsg1hp.js:37400-37952 placement
function logPrefetchUse(
  prefetch,
  bytes,
  { inFlight: inFlight, passes: passes, sameBearer: sameBearer, waitedMs: waitedMs },
) {
  let fields = {
    in_flight: inFlight,
    waited_ms: Math.round(waitedMs),
    download_ms: Math.round((prefetch.settledAt ?? performance.now()) - prefetch.startedAt),
    approx_bytes: Number(bytes.length.toPrecision(2)),
  };
  if (passes)
    (logFeatureOk("bridge_attachment_prefetch_download", fields),
      logPrefetchOutcome(
        inFlight ? "bridge_attachment_prefetch_used_joined" : "bridge_attachment_prefetch_used_ready",
        fields,
      ));
  else
    (logFeatureSad(
      "bridge_attachment_prefetch_download",
      sameBearer ? "attestation_mismatch" : "bearer_changed",
      fields,
    ),
      logPrefetchOutcome(
        sameBearer
          ? "bridge_attachment_prefetch_attestation_mismatch"
          : "bridge_attachment_prefetch_bearer_changed",
        fields,
      ));
}
//@ chunk-n4bsg1hp.js:37952-38644 placement
async function downloadWithRetries(e, i, o, n, r) {
  let a = performance.now() - i + DOWNLOAD_DEADLINE_SLACK_MS;
  for (let d = 0; ; d++) {
    let abortController = new AbortController(),
      u = () => abortController.abort();
    if ((o.signal.addEventListener("abort", u, { once: !0 }), o.signal.aborted)) abortController.abort();
    if (n !== void 0) n.downloadTryCount++;
    r.admitBytes(0);
    let _ = d + 1 < e && performance.now() + FAST_QUIET_LIMIT_MS + MIN_RETRY_DELAY_MS <= a,
      h = await resolveOne({
        ...r,
        totals: n,
        abort: abortController,
        quietLimitMs: _ ? FAST_QUIET_LIMIT_MS : DOWNLOAD_QUIET_LIMIT_MS,
      });
    if ((o.signal.removeEventListener("abort", u), !("failure" in h))) {
      if (n !== void 0 && d > 0 && !("writeFailed" in h)) n.recoveredFileCount++;
      return h;
    }
    let p = isRetryableDownloadFailure(h),
      startTime = performance.now(),
      E = a - startTime,
      min = Math.min(
        fullJitterBackoffMs({ baseMs: RETRY_BASE_DELAY_MS, attempt: d, floorMs: MIN_RETRY_DELAY_MS }),
        Math.max(MIN_RETRY_DELAY_MS, E),
      ),
      C = _ && h.failure === "stalled";
    if (p && d + 1 < e && (C || E >= MIN_RETRY_DELAY_MS)) {
      if ((await sleep(min, o.signal), !o.signal.aborted)) continue;
    }
    return h;
  }
}
//@ chunk-n4bsg1hp.js:38644-38757 placement
function signInRefreshState() {
  let e = inboundAttachmentDownloadRegistry();
  return ((e.signInRefresh ??= { attempted: !1, recoveries: { begun: 0, running: 0 } }), e.signInRefresh);
}
/**
 * 下载附件遇到 401 时刷新 bridge 令牌：同一会话只尝试一次 handleOAuth401Error（带超时与中断），返回刷新后的新令牌或 undefined。
 */
//@ chunk-n4bsg1hp.js:38757-39585 placement
async function refreshTokenForDownload(staleToken, i, o, signal, r, a) {
  let state = signInRefreshState(),
    abortController = new AbortController(),
    u = sleep(FAST_QUIET_LIMIT_MS, AbortSignal.any([signal, abortController.signal])).then(() => {
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
        state.attempted = !0;
        let M = !1;
        state.run = countOAuth401Recovery(state, () =>
          handleOAuth401Error(staleToken, i, o, {
            onForcedRefreshOutcome: (E) => {
              if (TOKEN_REFRESH_OUTCOMES_BEFORE_POST.has(E)) state.attempted = !1;
              else M = !0;
            },
          }),
        )
          .then(async () => {
            if (!M && (await getBridgeAccessTokenAsync(i)) !== staleToken) state.attempted = !1;
          })
          .catch(logError);
      }
      if (!r) {
        if (!(await Promise.race([getClaudeAIOAuthTokensAsync(i).catch(() => null), u]))?.refreshToken)
          return;
      }
      let startTime = performance.now();
      ((winner = await Promise.race([
        (state.run ?? Promise.resolve())
          .then(() => (h ? readFreshOAuthAccessToken(i) : void 0))
          .then(() => getBridgeAccessTokenAsync(i))
          .catch(() => {
            return;
          }),
        u,
      ])),
        (a.slowest401RefreshWaitMs = Math.max(a.slowest401RefreshWaitMs, performance.now() - startTime)));
    }
    return winner && winner !== staleToken && !signal.aborted
      ? { bearer: winner, stamp: oauthRefreshLatchStamp(state.recoveries) }
      : void 0;
  } finally {
    abortController.abort();
  }
}
/**
 * 下载单个文件：GET {base}/api/oauth/files/{uuid}/content（可要 model_copy），带静默超时与字节上限，可溢写到磁盘；返回 data / file / failure。
 */
//@ chunk-n4bsg1hp.js:39585-41897 callgraph-fingerprint = resolveOne (0.249)
async function resolveOne({
  fileUuid: fileUuid,
  baseUrl: baseUrl,
  modelCopy: modelCopy,
  forPrefetch: forPrefetch,
  maxBytes: maxBytes,
  spillTo: spillTo,
  token: token,
  abort: abort,
  quietLimitMs: quietLimitMs,
  totals: totals,
  onServed: onServed,
  admitBytes: admitBytes,
}) {
  let M = forPrefetch ? "of a prefetched file" : fileUuid,
    E = !1,
    O = !1,
    C = () => {
      ((E = !0), abort.abort());
    },
    I = setTimeout(C, quietLimitMs),
    startTime = performance.now(),
    D;
  try {
    if (isBridgeFileLoginRefused())
      await Promise.race([settleStoredLoginRefusal(), createChildAbortController(abort.signal)]);
    let winner = await Promise.race([token(), createChildAbortController(abort.signal)]);
    if (abort.signal.aborted) return E ? at(O) : { failure: "stopped" };
    if (!winner) return { failure: "no_token" };
    let Q;
    try {
      Q = `${baseUrl ?? getBridgeBaseUrl()}/api/oauth/files/${encodeURIComponent(fileUuid)}/content${modelCopy ? "?model_copy=inference_highres" : ""}`;
    } catch (error) {
      return (
        debug(
          `fetch ${M} has no URL: ${forPrefetch ? (error instanceof Error ? error.name : "a non-Error") : error}`,
        ),
        { failure: "error", final: !0 }
      );
    }
    if (isBridgeFileLoginRefused(Q, winner))
      return (
        debug(`fetch ${M} refused: the stored login may not go there`),
        { failure: "error", final: !0 }
      );
    let S = await fetch(Q, {
      headers: {
        Authorization: `Bearer ${winner}`,
        "User-Agent": claudeCodeUserAgent(),
        ...(forPrefetch && { [X_ANTHROPIC_ATTACHMENT_PREFETCH]: "1" }),
      },
      ...(forPrefetch && { cache: "no-store" }),
      signal: abort.signal,
      ...getProxyFetchOptions({ url: Q }),
    });
    if (((O = !0), clearTimeout(I), (I = setTimeout(C, quietLimitMs)), totals !== void 0))
      totals.slowestTimeToHeadersMs = Math.max(totals.slowestTimeToHeadersMs, performance.now() - startTime);
    if (S.status !== 200)
      return (
        debug(`fetch ${M} failed: status=${S.status}`),
        await drainResponseBody(S),
        E ? at(O) : { failure: "http_status", httpStatus: S.status }
      );
    onServed?.(S.headers.get(PREFETCH_SEEN_HEADER.name)?.trim() === PREFETCH_SEEN_HEADER.value);
    let w = S.body?.getReader(),
      z = [],
      j = 0;
    while (w !== void 0) {
      let { done: H, value: Fe } = await w.read();
      if (H) break;
      if ((I.refresh(), (j += Fe.byteLength), j > (spillTo === void 0 ? maxBytes : Lun)))
        return (
          debug(`fetch ${M} over size cap (${j} bytes so far)`),
          abort.abort(),
          { failure: "too_large" }
        );
      if (!admitBytes(j))
        return (
          debug(`fetch ${M} stopped: unused prefetched files would exceed their limit in memory`),
          abort.abort(),
          { failure: "held_limit" }
        );
      if ((z.push(Fe), spillTo !== void 0 && j > maxBytes)) {
        clearTimeout(I);
        try {
          D ??= await spillTo();
          for (let we of z) await D.write(we);
        } catch (error) {
          return (
            debug(`download of ${M} stopped, no retry: write to disk failed: ${error}`),
            abort.abort(),
            { writeFailed: error }
          );
        }
        ((I = setTimeout(C, DOWNLOAD_QUIET_LIMIT_MS)), (z = []));
      }
    }
    if (totals !== void 0) totals.downloadedBytes += j;
    if (D !== void 0)
      return await D.finish().then(
        (H) => ({ file: H }),
        (H) => ({ writeFailed: H }),
      );
    return {
      data: Buffer.concat(z, j),
      servedPageCount: parseServedPageCount(S.headers.get(X_SERVED_FILE_PAGE_COUNT)),
    };
  } catch (error) {
    return (
      debug(
        `fetch ${M} threw: ${forPrefetch ? (error instanceof Error ? error.name : "a non-Error") : error}`,
      ),
      E ? at(O) : { failure: abort.signal.aborted ? "stopped" : "error" }
    );
  } finally {
    if ((clearTimeout(I), await D?.discard(), totals !== void 0))
      totals.slowestDownloadMs = Math.max(totals.slowestDownloadMs, performance.now() - startTime);
  }
}
//@ chunk-n4bsg1hp.js:41897-41974 layout
function parseServedPageCount(header) {
  return header !== null && /^[1-9][0-9]{0,2}$/.test(header) ? Number(header) : void 0;
}
//@ chunk-n4bsg1hp.js:41974-42146 placement
async function writeWithPageCount(e, i, o, ...n) {
  let r = (inboundAttachmentDownloadRegistry().pageCountsOfWrites ??= new Map()),
    a = { servedPageCount: o };
  r.set(i, a);
  try {
    return await e.write(...n);
  } finally {
    if (r.get(i) === a) r.delete(i);
  }
}
//@ chunk-n4bsg1hp.js:42146-42221 placement
function Jt(e) {
  return "failure" in e && e.failure === "stalled" && e.beforeHeaders;
}
//@ chunk-n4bsg1hp.js:42221-42279 placement
function at(e) {
  return { failure: "stalled", beforeHeaders: !e };
}
//@ chunk-n4bsg1hp.js:42279-42404 placement = createChildAbortController (0.879)
function createChildAbortController(e) {
  return new Promise((i) => {
    if (e.aborted) {
      i(void 0);
      return;
    }
    e.addEventListener("abort", () => i(void 0), { once: !0 });
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
      file_uuid: o(),
      file_name: o(),
      is_image: M().nullish(),
      sha256: o().nullish().catch(null),
      file_size: E()
        .nullish()
        .catch(void 0),
    }),
  ),
  MAX_FILE_ATTACHMENTS = 256;
/**
 * 从入站帧的 file_attachments 字段取出并校验附件列表（截断到上限）。
 */
//@ chunk-cxyewwc3.js:413-648 fingerprint = extractInboundAttachments (1)
function extractInboundAttachments(msg) {
  if (typeof msg !== "object" || msg === null || !("file_attachments" in msg)) return [];
  let file_attachments = msg.file_attachments;
  if (!Array.isArray(file_attachments)) return [];
  let a = fileAttachmentSchema();
  return file_attachments.slice(0, MAX_FILE_ATTACHMENTS).flatMap((r) => {
    let parsed = a.safeParse(r);
    return parsed.success ? [parsed.data] : [];
  });
}
//@ chunk-cxyewwc3.js:648-693 placement
var i = DoctorLazy(() => u({ shouldQuery: M().optional() }));
//@ chunk-cxyewwc3.js:693-751 placement
function shouldQueryInboundAttachment(t) {
  return i().safeParse(t).data?.shouldQuery;
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
  JWs,
  _Mo,
  asideSentence,
  NO_SPACE_FOR_A_FILE,
  shouldQueryInboundAttachment,
  resolveInboundAttachments,
};
