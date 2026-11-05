/**
 * services/syncedFiles/syncedFileSyncer.ts
 *
 * 2.1.316 新增：同步文件（synced files）后台同步器：暂存、写入同步目录、记录 worker 回传的行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y9g4rvgd.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { posix } from "path";
import { realpath, lstat, mkdir, writeFile, unlink, link, rename, open, readdir, stat } from "fs/promises";
import { constants, watch } from "fs";
import { SEED_DIR, isSeedPath } from "../../utils/teleport/seedPaths.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { classifyAxiosError, isENOENT, getErrnoCode } from "../../utils/errors.js";
import { apiClient } from "../routines/routinesApi.js";
import { env } from "../../utils/env.js";
import { hasBackslash } from "../../utils/pathClassification.js";
import { assertPathSafeAsync } from "../../utils/atomicPublishWrite.js";
import { rowStagedSignal } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getPlatform } from "../../utils/platform.js";
import { sleep } from "../../utils/sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-y9g4rvgd.js:1036-1048 placement
/**
 * 同步文件的写入权限位。
 */
var SYNCED_FILE_MODE = 384;
//@ chunk-y9g4rvgd.js:1048-1326 placement
/**
 * 同步文件的工作目录常量与各类超时/重试上限（并发写入、会话满退避、监视尝试等）。
 */
var { basename, dirname, isAbsolute, join, normalize, relative, sep: MAX_SYNCED_DIR_ENTRIES } = posix;
var SYNCED_FILE_ROOT = "/mnt/user-data/working";
var WORKING_FILESTORE_PREFIX = "/working";
var DIR_SYNC_LANE_RESERVED = `${WORKING_FILESTORE_PREFIX}/${SEED_DIR} is reserved`;
var MAX_WORKING_FILE_BYTES = 26214400;
var MAX_CONCURRENT_SYNC_WRITES = 4096;
var SYNC_REQUEST_TIMEOUT_MS = 4;
var SESSION_FULL_BACKOFF_MS = 30000;
var WAIT_FOR_FILE_EVENTS_MS = 5000;
var WATCH_ATTEMPT_INTERVAL_MS = 60000;
var MAX_WATCH_ATTEMPTS = 1000;
var MAX_WATCH_BACKOFF_MS = 12;
var MAX_WRITE_RETRIES = 120000;
var WRITE_RETRY_DELAY_MS = 5;
var MAX_TERMINAL_REJECTS = 2000;
var TERMINAL_REJECT_LATCH_MS = 3;
var SESSION_FULL_OFFER_INTERVAL_MS = 600000;
var DEFAULT_SYNCED_DIR_ENTRIES = 3600000;
var posixPathHelpers = MAX_CONCURRENT_SYNC_WRITES;
//@ chunk-y9g4rvgd.js:1326-5118 placement
/**
 * 同步文件推送的状态：每个文件已见的 etag/本地哈希、被逐出的 etag、mtime 闸门、连续终端拒绝（达到次数后暂停一段时间）、会话空间已满的暂停与探测、传输失败计数，以及延迟启动的同步器。
 */
class SyncedFileSyncState {
  seenState = new Map();
  evictedEtag = new Map();
  lastSeenMtime = new Map();
  terminalRejects = new Map();
  sessionFullUntilMs = 0;
  sessionFullSuppressed = 0;
  sessionFullNextOfferMs = 0;
  inFlight = createKeyedQueue();
  retryableTransportFailures = 0;
  sessionTerminalRejects = 0;
  syncer = null;
  lateStartRoot = null;
  startInFlight = null;
  recordSeen(path, etag, localHash) {
    this.seenState.set(path, {
      etag,
      localHash,
    });
    this.evictedEtag.delete(path);
  }
  forgetSeen(path) {
    this.seenState.delete(path);
    this.evictedEtag.delete(path);
  }
  recordEvictedEtag(path, etag) {
    if (etag === undefined) return;
    this.evictedEtag.delete(path);
    this.evictedEtag.set(path, etag);
    if (this.evictedEtag.size > posixPathHelpers) {
      let oldest = this.evictedEtag.keys().next().value;
      if (oldest !== undefined) this.evictedEtag.delete(oldest);
    }
  }
  evictDeleted(path) {
    this.recordEvictedEtag(path, this.seenState.get(path)?.etag);
    this.seenState.delete(path);
  }
  recordSettledMtime(path, mtimeMs) {
    this.lastSeenMtime.set(path, mtimeMs);
  }
  reopenMtimeGate(path) {
    this.lastSeenMtime.delete(path);
  }
  recordTerminalReject(path, heldWhileFull = false) {
    let entry = this.terminalRejects.get(path) ?? {
      consecutive: 0,
      latchedUntilMs: 0,
      suppressed: 0,
      heldWhileFull: false,
    };
    entry.consecutive++;
    entry.heldWhileFull ||= heldWhileFull;
    this.terminalRejects.set(path, entry);
    if (entry.consecutive >= TERMINAL_REJECT_LATCH_MS) {
      entry.latchedUntilMs = Date.now() + SESSION_FULL_OFFER_INTERVAL_MS;
      logFeatureBad("ccr_synced_file_push", "push_parked_terminal", {
        consecutive_rejects: entry.consecutive,
        suppressed_pushes: entry.suppressed,
        held_while_full: entry.heldWhileFull,
      });
      entry.suppressed = 0;
      logForDiagnosticsNoPII("warn", "working_push_parked", {
        consecutive: entry.consecutive,
      });
    }
  }
  resetTerminalRejectStreak(path) {
    let entry = this.terminalRejects.get(path);
    if (entry === undefined) return;
    if (entry.suppressed === 0) {
      this.terminalRejects.delete(path);
      return;
    }
    entry.consecutive = 0;
    entry.latchedUntilMs = 0;
    entry.heldWhileFull = false;
  }
  forgetTerminalReject(path) {
    this.terminalRejects.delete(path);
  }
  sessionFullGate() {
    if (this.sessionFullUntilMs === 0) return "open";
    let now = Date.now();
    if (now < this.sessionFullUntilMs) {
      this.sessionFullSuppressed++;
      return "skip";
    }
    this.sessionFullUntilMs = now + SESSION_FULL_OFFER_INTERVAL_MS;
    return "probe";
  }
  recordSessionFull() {
    let wasParked = this.sessionFullUntilMs !== 0;
    let now = Date.now();
    this.sessionFullUntilMs = now + SESSION_FULL_OFFER_INTERVAL_MS;
    this.sessionFullNextOfferMs = now + DEFAULT_SYNCED_DIR_ENTRIES;
    if (wasParked && this.sessionFullSuppressed === 0) return;
    logFeatureBad("ccr_synced_file_push", "push_parked_session_full", {
      suppressed_pushes: this.sessionFullSuppressed,
    });
    logForDiagnosticsNoPII("warn", "working_session_full", {
      suppressed_pushes: this.sessionFullSuppressed,
    });
    this.sessionFullSuppressed = 0;
  }
  clearSessionFull() {
    this.sessionFullUntilMs = 0;
  }
  sessionFullReprobeNow() {
    if (this.sessionFullUntilMs !== 0) this.sessionFullUntilMs = Date.now();
  }
  releaseSessionFullHold(path) {
    let entry = this.terminalRejects.get(path);
    if (entry === undefined || !entry.heldWhileFull) return;
    if (this.sessionFullUntilMs !== 0) {
      let now = Date.now();
      if (
        now < this.sessionFullUntilMs + WAIT_FOR_FILE_EVENTS_MS ||
        now < this.sessionFullNextOfferMs ||
        entry.latchedUntilMs !== 0
      )
        return;
      this.sessionFullNextOfferMs = now + DEFAULT_SYNCED_DIR_ENTRIES;
    }
    entry.heldWhileFull = false;
    this.resetTerminalRejectStreak(path);
    this.reopenMtimeGate(path);
  }
  get transportFailureSeq() {
    return this.retryableTransportFailures;
  }
  get sessionTerminalRejectSeq() {
    return this.sessionTerminalRejects;
  }
  noteRetryableTransportFailure() {
    this.retryableTransportFailures++;
    if (this.sessionFullUntilMs !== 0)
      this.sessionFullNextOfferMs = Math.max(
        this.sessionFullNextOfferMs,
        Date.now() + SESSION_FULL_OFFER_INTERVAL_MS,
      );
  }
  noteSessionTerminalReject() {
    this.sessionTerminalRejects++;
  }
  get activeSyncer() {
    return this.syncer;
  }
  syncerStarted(syncer) {
    this.syncer = syncer;
  }
  syncerStopped(syncer) {
    if (this.syncer === syncer) this.syncer = null;
  }
  armLateStart(lateStartRoot) {
    this.lateStartRoot = lateStartRoot;
  }
  async flush() {
    if (this.syncer === null) {
      if (this.lateStartRoot !== null && this.startInFlight === null) {
        let syncedFileSyncer = startSyncedFileSyncer(this.lateStartRoot);
        this.startInFlight = syncedFileSyncer;
        syncedFileSyncer
          .finally(() => {
            if (this.startInFlight === syncedFileSyncer) this.startInFlight = null;
          })
          .catch(() => {});
      }
      await this.startInFlight?.catch(() => {});
    }
    await this.syncer?.flush();
  }
  sessionFullStateForTest() {
    return {
      armed: this.sessionFullUntilMs !== 0,
      suppressed: this.sessionFullSuppressed,
    };
  }
  reset() {
    this.seenState.clear();
    this.lastSeenMtime.clear();
    this.evictedEtag.clear();
    this.terminalRejects.clear();
    this.sessionFullUntilMs = 0;
    this.sessionFullSuppressed = 0;
    this.sessionFullNextOfferMs = 0;
    this.lateStartRoot = null;
    this.startInFlight = null;
  }
}
//@ chunk-y9g4rvgd.js:5118-5143 placement
/**
 * 按 host 保存的同步文件状态容器。
 */
var syncedFileSyncStateSlots; // deferred: uses SyncedFileSyncState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-y9g4rvgd.js:5118", () => {
  syncedFileSyncStateSlots = new HostScoped(() => new SyncedFileSyncState());
});
//@ chunk-y9g4rvgd.js:5143-5179 placement
/**
 * 取当前 host 的同步文件状态。
 */
function currentSyncedFileSyncState() {
  return syncedFileSyncStateSlots.of(getRootSession().host);
}
//@ chunk-y9g4rvgd.js:5179-5219 placement
/**
 * 记录某文件已同步的 etag 与本地哈希。
 */
function recordSeenFile(path, etag, contentHash) {
  currentSyncedFileSyncState().recordSeen(path, etag, contentHash);
}
//@ chunk-y9g4rvgd.js:5219-5262 placement
/**
 * 取某文件的已同步状态。
 */
function seenStateOf(path) {
  return currentSyncedFileSyncState().seenState.get(path);
}
//@ chunk-y9g4rvgd.js:5262-5308 placement (2.1.88 match: runWithAgentContext, 0.635)
/**
 * 在 inFlight 存储中运行函数。
 */
function runInFlight(context, fn) {
  return currentSyncedFileSyncState().inFlight.run(context, fn);
}
//@ chunk-y9g4rvgd.js:5308-5593 placement
function relUnderSyncDir(syncDir, path) {
  if (!isAbsolute(syncDir)) throw Error("syncDir must be absolute");
  if (path.includes("\x00")) throw Error("path contains null bytes");
  if (!isAbsolute(path)) throw Error("path must be absolute");
  let relPath = relative(syncDir, normalize(path));
  if (relPath === "" || relPath === "." || isUnsafeRelativePath(relPath))
    throw Error("path must be under the working sync dir");
  return relPath;
}
//@ chunk-y9g4rvgd.js:5593-5649 placement
/**
 * 路径是绝对路径或含 .. 时视为不安全。
 */
function isUnsafeRelativePath(relPath) {
  return isAbsolute(relPath) || relPath.split(MAX_SYNCED_DIR_ENTRIES).includes("..");
}
//@ chunk-y9g4rvgd.js:5649-5786 placement
function shouldIgnore(relPath) {
  for (let segment of relPath.split(MAX_SYNCED_DIR_ENTRIES))
    if (
      segment.startsWith(".") ||
      segment.endsWith("~") ||
      segment.endsWith(".swp") ||
      segment.endsWith(".tmp")
    )
      return true;
  return false;
}
//@ chunk-y9g4rvgd.js:5786-5999 placement
/**
 * 同步文件的两类错误体 schema（通道被拒、限额超限）与对应错误码。
 */
var SYNCED_FILE_LIMIT_EXCEEDED; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var LANE_DENIED_REASON;
var laneDeniedErrorSchema;
var limitErrorSchema;
deferInit("chunk-y9g4rvgd.js:5786", () => {
  SYNCED_FILE_LIMIT_EXCEEDED = "synced_file_limit_exceeded";
  LANE_DENIED_REASON = "synced_file_lane_denied";
  laneDeniedErrorSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        reason: stringSchema().optional(),
        resource: stringSchema().optional(),
      }),
    }),
  );
  limitErrorSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        type: stringSchema().optional(),
        resource_type: stringSchema().optional(),
      }),
    }),
  );
});
//@ chunk-y9g4rvgd.js:5999-6148 placement
function isRetryableTransport(kind, status) {
  if (kind === "timeout" || kind === "network") return true;
  if (kind === "auth" || kind === "other") return false;
  if (status === undefined) return true;
  return status === 408 || status === 429 || status >= 500;
}
//@ chunk-y9g4rvgd.js:6148-6551 placement
/**
 * 把同步文件请求错误转为结果对象：分类、是否可重试、拒绝原因与资源，并更新失败计数。
 */
function syncedFileError(operation, error) {
  let state = currentSyncedFileSyncState();
  let { kind, status } = classifyAxiosError(error);
  let retryable = isRetryableTransport(kind, status);
  if (retryable) state.noteRetryableTransportFailure();
  else if (kind === "auth") state.noteSessionTerminalReject();
  let laneError = status === 400 || status === 403 ? laneDeniedErrorOf(error) : undefined;
  let reason = status === 400 ? laneError?.reason : undefined;
  let resource = status === 403 ? laneError?.resource : undefined;
  return {
    kind: "error",
    message: `${operation} failed: ${kind}${status ? ` ${status}` : ""}`,
    retryable,
    errorKind: kind,
    status,
    ...(reason !== undefined && {
      laneReason: reason,
    }),
    ...(resource !== undefined && {
      refusedResource: resource,
    }),
  };
}
//@ chunk-y9g4rvgd.js:6551-6627 placement
/**
 * 从响应里解析出「通道被拒」的错误体。
 */
function laneDeniedErrorOf(error) {
  let body = error?.response?.data;
  return laneDeniedErrorSchema().safeParse(body).data?.error;
}
//@ chunk-y9g4rvgd.js:6627-6816 placement
function putRejectionReason(error) {
  if (error.errorKind === "gated") return `put_gated_${(error.gateReason ?? "unknown").replaceAll("-", "_")}`;
  return error.status !== undefined ? `put_rejected_${error.status}` : `put_rejected_${error.errorKind}`;
}
//@ chunk-y9g4rvgd.js:6816-7476 placement
async function putSyncedFile(relPath, content, ifMatch) {
  let state = currentSyncedFileSyncState();
  try {
    let result = await apiClient.put(
      "/worker/synced_file",
      {
        path: `${WORKING_FILESTORE_PREFIX}/${relPath}`,
        content: content.toString("base64"),
        ...(ifMatch && {
          if_match_sha256: ifMatch,
        }),
        worker_epoch: env.CLAUDE_CODE_WORKER_EPOCH ?? 0,
      },
      {
        auth: "session-jwt",
        host: "ccr-session",
        headers: {
          "anthropic-version": "2023-06-01",
        },
        timeout: SESSION_FULL_BACKOFF_MS,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 409,
        maxBodyLength: Math.ceil((MAX_WORKING_FILE_BYTES * 4) / 3) + 1024,
      },
    );
    if (!result.ok) {
      state.noteSessionTerminalReject();
      return {
        kind: "error",
        message: `put gated: ${result.reason}`,
        retryable: false,
        errorKind: "gated",
        status: undefined,
        gateReason: result.reason,
      };
    }
    if (result.status === 409)
      return {
        kind: "conflict",
      };
    return {
      kind: "ok",
      content_sha256: result.data.content_sha256,
    };
  } catch (error) {
    return syncedFileError("put", error);
  }
}
//@ chunk-y9g4rvgd.js:7476-8164 placement
async function getSyncedFile(relPath) {
  let state = currentSyncedFileSyncState();
  try {
    let result = await apiClient.get(
      `/worker/synced_file?path=${encodeURIComponent(`${WORKING_FILESTORE_PREFIX}/${relPath}`)}`,
      {
        auth: "session-jwt",
        host: "ccr-session",
        headers: {
          "anthropic-version": "2023-06-01",
        },
        timeout: SESSION_FULL_BACKOFF_MS,
        maxContentLength: Math.ceil((MAX_WORKING_FILE_BYTES * 4) / 3) + 1024,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
      },
    );
    if (!result.ok) {
      state.noteSessionTerminalReject();
      return {
        kind: "error",
        message: `get gated: ${result.reason}`,
        retryable: false,
        errorKind: "gated",
        status: undefined,
        gateReason: result.reason,
      };
    }
    if (result.status === 404) {
      let limitBody = limitErrorSchema().safeParse(result.data);
      return {
        kind: "not_found",
        ...(limitBody.success && {
          body: limitBody.data.error,
        }),
      };
    }
    return {
      kind: "ok",
      buf: Buffer.from(result.data.content, "base64"),
      content_sha256: result.data.content_sha256,
    };
  } catch (error) {
    return syncedFileError("get", error);
  }
}
//@ chunk-y9g4rvgd.js:8164-8719 placement
/**
 * 写入同步目录前校验目标：上级目录不能含反斜杠、真实父目录必须在同步目录内、不能落在忽略路径或被调用方拒绝的路径、目标不能是符号链接。
 */
async function assertSafeSyncDest(syncDir, dest, refuses) {
  assertNoBackslashDirs(syncDir, dest);
  let syncDirReal = await realpath(syncDir);
  let parentReal = await realpath(dirname(dest));
  let parentRel = relative(syncDirReal, parentReal);
  if (isUnsafeRelativePath(parentRel)) {
    let error = Error("dest parent escaped working sync dir");
    error.code = "WORKING_PARENT_ESCAPE";
    throw error;
  }
  let destRel = parentRel === "" ? basename(dest) : join(parentRel, basename(dest));
  if (shouldIgnore(destRel)) {
    let error = Error("dest resolves into an ignored path");
    error.code = "WORKING_DEST_IGNORED";
    throw error;
  }
  if (refuses?.(destRel)) {
    let error = Error("dest resolves onto a path the caller refuses");
    error.code = "WORKING_DEST_REFUSED";
    throw error;
  }
  try {
    if ((await lstat(dest)).isSymbolicLink()) {
      let error = Error("dest is a symlink");
      error.code = "WORKING_DEST_SYMLINK";
      throw error;
    }
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
//@ chunk-y9g4rvgd.js:8719-8866 placement
function assertNoBackslashDirs(syncDir, dest) {
  if (hasBackslash(syncDir) || hasBackslash(dirname(dest))) {
    let error = Error("a folder on the way to dest has a backslash in its name");
    error.code = "WORKING_PATH_MISREAD";
    throw error;
  }
}
//@ chunk-y9g4rvgd.js:8866-9773 placement
async function writeUnderSyncDir(syncDir, dest, content, mode = "replace", refuses) {
  assertNoBackslashDirs(syncDir, dest);
  await mkdir(syncDir).catch((error) => {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  });
  let syncDirReal = await realpath(syncDir);
  let ancestor = dirname(dest);
  for (;;)
    try {
      let ancestorReal = await realpath(ancestor);
      let ancestorRel = relative(syncDirReal, ancestorReal);
      if (isUnsafeRelativePath(ancestorRel)) {
        let error = Error("dest ancestor escaped working sync dir");
        error.code = "WORKING_PARENT_ESCAPE";
        throw error;
      }
      if (shouldIgnore(ancestorRel)) {
        let error = Error("dest ancestor resolves into an ignored path");
        error.code = "WORKING_DEST_IGNORED";
        throw error;
      }
      if (refuses?.(join(ancestorRel, relative(ancestor, dest))) === true) {
        let error = Error("dest resolves onto a path the caller refuses");
        error.code = "WORKING_DEST_REFUSED";
        throw error;
      }
      break;
    } catch (error) {
      if (!isENOENT(error)) throw error;
      let parent = dirname(ancestor);
      if (parent === ancestor) break;
      ancestor = parent;
    }
  await mkdir(dirname(dest), {
    recursive: true,
  });
  await assertSafeSyncDest(syncDir, dest, refuses);
  let tmpPath = `${dest}.${process.hrtime.bigint().toString(36)}.tmp`;
  try {
    await assertPathSafeAsync(tmpPath);
  } catch (error) {
    tempNameTaken(error);
    throw error;
  }
  try {
    await writeFile(tmpPath, content, {
      mode: SYNCED_FILE_MODE,
      flag: "wx",
    });
  } catch (error) {
    tempNameTaken(error);
    await unlink(tmpPath).catch(() => {});
    throw error;
  }
  try {
    if (mode === "create_only") {
      await link(tmpPath, dest);
      await unlink(tmpPath);
    } else await rename(tmpPath, dest);
  } catch (error) {
    await unlink(tmpPath).catch(() => {});
    throw error;
  }
}
//@ chunk-y9g4rvgd.js:9773-9910 placement
function tempNameTaken(error) {
  if (getErrnoCode(error) !== "EEXIST") return;
  let takenError = Error("sibling tempfile name already taken", {
    cause: error,
  });
  takenError.code = "WORKING_TMP_TAKEN";
  throw takenError;
}
//@ chunk-y9g4rvgd.js:9910-12804 placement
async function stageSyncedFile(row, fetchContent, syncDir) {
  let context;
  try {
    context = relUnderSyncDir(syncDir, row.mount_path);
  } catch (error) {
    logFeatureBad("ccr_synced_file_stage", "bad_mount_path");
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  if (isSeedPath(context)) {
    rowStagedSignal.emit(context, "stored");
    return {
      ok: true,
      noop: "dir_sync_lane_row",
    };
  }
  if (shouldIgnore(context)) {
    logFeatureBad("ccr_synced_file_stage", "ignored_path");
    return {
      ok: false,
      error: "mount_path is an ignored path",
    };
  }
  let destPath = join(syncDir, context);
  return runInFlight(context, async () => {
    let remoteBuf;
    let remoteEtag;
    try {
      try {
        await assertSafeSyncDest(syncDir, destPath);
      } catch (error) {
        if (!isENOENT(error)) {
          logFeatureBad(
            "ccr_synced_file_stage",
            getErrnoCode(error) === "WORKING_PATH_MISREAD" ? "backslash_in_path" : "containment_failed",
          );
          return {
            ok: false,
            error: `mount_path failed containment: ${getErrnoCode(error) ?? "unknown"}`,
          };
        }
      }
      let localBuf = null;
      try {
        let handle = await open(destPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await handle.stat();
          if (stats.isFile()) {
            if (stats.size > MAX_WORKING_FILE_BYTES) {
              logFeatureBad("ccr_synced_file_stage", "too_large");
              return {
                ok: false,
                error: "local file too large to reconcile",
              };
            }
            localBuf = await handle.readFile();
          }
        } finally {
          await handle.close();
        }
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ELOOP" && errnoCode !== "EMLINK") throw error;
      }
      let localHash = localBuf ? computeContentHash(localBuf) : undefined;
      let seen = seenStateOf(destPath);
      if (
        localHash &&
        seen &&
        seen.localHash === localHash &&
        row.content_sha256 !== undefined &&
        seen.etag === row.content_sha256
      ) {
        logFeatureOk("ccr_synced_file_stage");
        return {
          ok: true,
          noop: "already_present",
        };
      }
      let expectedLocalSha256 = row.expected_local_sha256 || undefined;
      let localUnchanged =
        seen &&
        seen.localHash === localHash &&
        (expectedLocalSha256 === undefined || seen.etag === expectedLocalSha256);
      if (localBuf && !localUnchanged) {
        let putResult = await putSyncedFile(context, localBuf, expectedLocalSha256);
        if (putResult.kind === "error") {
          logFeatureBad("ccr_synced_file_stage", "push_failed");
          return {
            ok: false,
            error: putResult.message,
          };
        }
        let syncedFile = await getSyncedFile(context);
        if (syncedFile.kind !== "ok") {
          logFeatureBad("ccr_synced_file_stage", "reget_failed");
          return {
            ok: false,
            error: syncedFile.kind === "error" ? syncedFile.message : "get not_found after put",
          };
        }
        remoteBuf = syncedFile.buf;
        remoteEtag = syncedFile.content_sha256;
        logForDiagnosticsNoPII("info", "working_stage_reconciled", {
          conflict: putResult.kind === "conflict",
        });
      } else {
        let fetched = await fetchContent(row.filestore_path);
        if (!fetched.ok) {
          logFeatureBad("ccr_synced_file_stage", "fetch_failed");
          return {
            ok: false,
            error: fetched.error,
          };
        }
        if (fetched.buf.length > MAX_WORKING_FILE_BYTES) {
          logFeatureBad("ccr_synced_file_stage", "too_large");
          return {
            ok: false,
            error: "staged content too large",
          };
        }
        remoteBuf = fetched.buf;
        remoteEtag = row.content_sha256;
      }
      let midLocalBuf = null;
      try {
        let handle = await open(destPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await handle.stat();
          if (stats.isFile()) {
            if (stats.size > MAX_WORKING_FILE_BYTES) {
              logFeatureBad("ccr_synced_file_stage", "too_large");
              return {
                ok: false,
                error: "local file too large to reconcile",
              };
            }
            midLocalBuf = await handle.readFile();
          }
        } finally {
          await handle.close();
        }
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ELOOP" && errnoCode !== "EMLINK") throw error;
      }
      if (midLocalBuf && computeContentHash(midLocalBuf) !== localHash) {
        let putResult = await putSyncedFile(context, midLocalBuf, remoteEtag);
        if (putResult.kind === "error") {
          logFeatureBad("ccr_synced_file_stage", "push_failed");
          return {
            ok: false,
            error: putResult.message,
          };
        }
        let syncedFile = await getSyncedFile(context);
        if (syncedFile.kind !== "ok") {
          logFeatureBad("ccr_synced_file_stage", "reget_failed");
          return {
            ok: false,
            error: syncedFile.kind === "error" ? syncedFile.message : "get not_found after put",
          };
        }
        remoteBuf = syncedFile.buf;
        remoteEtag = syncedFile.content_sha256;
        logForDiagnosticsNoPII("info", "working_stage_reconciled", {
          conflict: putResult.kind === "conflict",
          mid_window: true,
        });
      }
    } catch (error) {
      logFeatureBad("ccr_synced_file_stage", "reconcile_threw");
      return {
        ok: false,
        error: `reconcile failed: ${getErrnoCode(error) ?? "unknown"}`,
      };
    }
    try {
      await writeUnderSyncDir(syncDir, destPath, remoteBuf);
    } catch (error) {
      logFeatureBad("ccr_synced_file_stage", "write_failed");
      return {
        ok: false,
        error: `write failed: ${getErrnoCode(error) ?? "unknown"}`,
      };
    }
    recordSeenFile(destPath, remoteEtag, computeContentHash(remoteBuf));
    logFeatureOk("ccr_synced_file_stage");
    logForDiagnosticsNoPII("info", "working_stage_ok", {
      bytes: remoteBuf.length,
    });
    return {
      ok: true,
    };
  });
}
//@ chunk-y9g4rvgd.js:12804-15354 placement
/**
 * 把同步目录中的一个文件推到云端：跳过保留路径、暂停中的、反斜杠或越界符号链接、过大文件；内容未变跳过；首次时先取远端版本（远端胜出则写回本地）；PUT 带 etag，冲突时重新取远端覆盖本地；记录各种结果遥测，返回是否已处理完毕。
 */
async function pushSyncedFile(syncDir, relPath) {
  let state = currentSyncedFileSyncState();
  if (isSeedPath(relPath)) {
    logFeatureSad("ccr_synced_file_push", "lane_path_reserved");
    return true;
  }
  let reject = state.terminalRejects.get(relPath);
  if (reject !== undefined && reject.latchedUntilMs !== 0) {
    if (Date.now() < reject.latchedUntilMs) {
      reject.suppressed++;
      return true;
    }
    reject.latchedUntilMs = 0;
  }
  let absPath = join(syncDir, relPath);
  if (hasBackslash(absPath)) {
    logFeatureSad("ccr_synced_file_push", "backslash_in_path");
    return true;
  }
  let realPath;
  try {
    realPath = await realpath(absPath);
  } catch (error) {
    if (isENOENT(error)) return true;
    throw error;
  }
  let syncDirReal;
  try {
    syncDirReal = await realpath(syncDir);
  } catch {
    return false;
  }
  let relReal = relative(syncDirReal, realPath);
  if (relReal !== relPath && (relReal === "" || isUnsafeRelativePath(relReal))) {
    logFeatureSad("ccr_synced_file_push", "symlink_escape");
    return true;
  }
  let content;
  try {
    let handle = await open(absPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      let stats = await handle.stat();
      if (!stats.isFile()) return true;
      if (stats.size > MAX_WORKING_FILE_BYTES) {
        logFeatureSad("ccr_synced_file_push", "too_large");
        return true;
      }
      content = await handle.readFile();
    } finally {
      await handle.close();
    }
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "EMLINK") {
      logFeatureSad("ccr_synced_file_push", "symlink_escape");
      return true;
    }
    logFeatureBad("ccr_synced_file_push", "read_failed");
    return false;
  }
  let contentHash = computeContentHash(content);
  let seen = seenStateOf(absPath);
  if (contentHash === seen?.localHash) return true;
  let evictedEtag = seen === undefined ? state.evictedEtag.get(absPath) : undefined;
  let gate = "open";
  if (seen === undefined && evictedEtag === undefined) {
    let syncedFile = await getSyncedFile(relPath);
    if (syncedFile.kind === "error") {
      logFeatureBad("ccr_synced_file_push", "seed_get_failed");
      if (!syncedFile.retryable) state.recordTerminalReject(relPath);
      return !syncedFile.retryable;
    }
    if (syncedFile.kind === "ok") {
      state.resetTerminalRejectStreak(relPath);
      let contentHash_2 = computeContentHash(syncedFile.buf);
      if (contentHash_2 === contentHash) {
        recordSeenFile(absPath, syncedFile.content_sha256, contentHash);
        return true;
      }
      try {
        await writeUnderSyncDir(syncDir, absPath, syncedFile.buf);
      } catch {
        logFeatureBad("ccr_synced_file_push", "write_failed");
        return false;
      }
      recordSeenFile(absPath, syncedFile.content_sha256, contentHash_2);
      logFeatureSad("ccr_synced_file_push", "cold_renderer_wins");
      return true;
    }
    gate = state.sessionFullGate();
    if (gate === "skip") {
      state.recordTerminalReject(relPath, true);
      return true;
    }
  }
  let putResult = await putSyncedFile(relPath, content, seen?.etag ?? evictedEtag);
  if (gate === "probe") {
    if (putResult.kind === "ok") state.clearSessionFull();
    else if (putResult.kind === "conflict" || putResult.laneReason !== SYNCED_FILE_LIMIT_EXCEEDED)
      state.sessionFullReprobeNow();
  }
  if (putResult.kind === "ok") {
    state.resetTerminalRejectStreak(relPath);
    recordSeenFile(absPath, putResult.content_sha256, contentHash);
    logFeatureOk("ccr_synced_file_push");
    return true;
  }
  if (putResult.kind === "error") {
    if (putResult.retryable) {
      state.resetTerminalRejectStreak(relPath);
      logFeatureBad("ccr_synced_file_push", "put_failed");
    } else {
      logFeatureBad("ccr_synced_file_push", putRejectionReason(putResult));
      let sessionFull = putResult.laneReason === SYNCED_FILE_LIMIT_EXCEEDED;
      state.recordTerminalReject(relPath, sessionFull);
      if (sessionFull) state.recordSessionFull();
    }
    logForDiagnosticsNoPII("warn", "working_push_failed", {
      reason: putResult.message,
      retryable: putResult.retryable,
    });
    return !putResult.retryable;
  }
  state.resetTerminalRejectStreak(relPath);
  let syncedFile = await getSyncedFile(relPath);
  if (syncedFile.kind === "error") {
    logFeatureBad("ccr_synced_file_push", "reget_failed");
    if (!syncedFile.retryable) state.recordTerminalReject(relPath);
    return !syncedFile.retryable;
  }
  if (syncedFile.kind === "not_found") {
    state.forgetSeen(absPath);
    state.sessionFullReprobeNow();
    logFeatureBad("ccr_synced_file_push", "reget_failed");
    return false;
  }
  try {
    await writeUnderSyncDir(syncDir, absPath, syncedFile.buf);
  } catch {
    logFeatureBad("ccr_synced_file_push", "write_failed");
    return false;
  }
  recordSeenFile(absPath, syncedFile.content_sha256, computeContentHash(syncedFile.buf));
  logFeatureSad("ccr_synced_file_push", "conflict_overwritten");
  return true;
}
//@ chunk-y9g4rvgd.js:15354-15388 placement
function flushSyncedFiles() {
  return currentSyncedFileSyncState().flush();
}
//@ chunk-y9g4rvgd.js:15388-15577 placement
async function drainSyncedFiles() {
  let state = currentSyncedFileSyncState();
  await flushSyncedFiles();
  for (;;) {
    if (state.inFlight.size === 0 && (state.activeSyncer?.pendingCount() ?? 0) === 0) return;
    await state.inFlight.settle();
    await new Promise((resolve) => setImmediate(resolve));
  }
}
//@ chunk-y9g4rvgd.js:15577-20123 placement
async function startSyncedFileSyncer(
  lateStartRoot,
  watchFn = getPlatform() === "linux" && !env.CLAUDE_CODE_DISABLE_WORKING_SYNC_WATCH ? watch : null,
) {
  let state = currentSyncedFileSyncState();
  state.armLateStart(null);
  for (let j = 1; ; j++)
    try {
      await mkdir(lateStartRoot);
      break;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "EEXIST") break;
      if (errnoCode === "ENOENT") {
        if (j < WRITE_RETRY_DELAY_MS) {
          await sleep(MAX_TERMINAL_REJECTS);
          continue;
        }
        logForDiagnosticsNoPII("info", "working_sync_parent_absent", {});
        state.armLateStart(lateStartRoot);
        return null;
      }
      logFeatureSad("ccr_synced_file_push", "sync_start_failed");
      logForDiagnosticsNoPII("warn", "working_sync_start_failed", {
        code: errnoCode ?? "unknown",
      });
      return null;
    }
  let inFlightCount = 0;
  let waiters = [];
  let acquireSlot = () =>
    inFlightCount < SYNC_REQUEST_TIMEOUT_MS
      ? (inFlightCount++, Promise.resolve())
      : new Promise((resolve) => waiters.push(resolve));
  let releaseSlot = () => {
    let waiter = waiters.shift();
    if (waiter) waiter();
    else inFlightCount--;
  };
  let activePushes = new Set();
  let stopped = false;
  let warnedScanCap = false;
  let backoffMs = 0;
  let backoffUntil = 0;
  let watcher = watchFn;
  let watcherHandle;
  let progressSeq = 0;
  let highestSeqAtWatch = 0;
  let testingWatcher = false;
  let testedAt;
  let untestedWatches = new Set();
  let watchFailures = 0;
  let relyingOnWatch = false;
  let loggedDiagnostics = new Set();
  let logDiagnosticOnce = (level, event, fields = {}) => {
    let joined = [event, ...Object.values(fields)].join(" ");
    if (!stopped && !loggedDiagnostics.has(joined)) {
      loggedDiagnostics.add(joined);
      logForDiagnosticsNoPII(level, event, fields);
    }
  };
  let pollTimer;
  let now = Date.now();
  let startPolling = (intervalMs) => {
    clearInterval(pollTimer);
    pollTimer = setInterval(tick, intervalMs);
    pollTimer.unref?.();
  };
  let resumePolling = () => {
    startPolling(WAIT_FOR_FILE_EVENTS_MS);
    tick();
  };
  let stopWatchAndPoll = () => {
    watcherHandle?.close();
    watcherHandle = undefined;
    if (relyingOnWatch) {
      relyingOnWatch = false;
      clearInterval(pollTimer);
      pollTimer = setTimeout(
        resumePolling,
        WAIT_FOR_FILE_EVENTS_MS - (Math.abs(Date.now() - now) % WAIT_FOR_FILE_EVENTS_MS),
      );
      pollTimer.unref?.();
    }
  };
  let onWatchError = () => {
    logForDiagnosticsNoPII("warn", "working_sync_watch_errored", {});
    watcher = null;
    stopWatchAndPoll();
  };
  let openWatch = async (watchFn) => {
    watchFailures++;
    let handles = [];
    let view = {
      close: () => {
        for (let handle of handles) handle.close();
      },
    };
    let isCurrent = () => watcherHandle === view;
    let addWatch = (label, dir, filter) => {
      handles.push(
        watchFn(
          dir,
          {
            persistent: false,
          },
          (eventType, filename) => {
            if (!isCurrent() || !filter(filename)) return;
            if (!(
              eventType === "change" &&
              filename === basename(lateStartRoot) &&
              untestedWatches.delete(label)
            ))
              stopWatchAndPoll();
          },
        ),
      );
    };
    try {
      addWatch("root", lateStartRoot, () => true);
      addWatch(
        "parent",
        dirname(lateStartRoot),
        (filename) =>
          typeof filename !== "string" ||
          filename === "" ||
          filename === basename(lateStartRoot) ||
          filename === basename(dirname(lateStartRoot)),
      );
    } catch (error) {
      view.close();
      logDiagnosticOnce("warn", "working_sync_watch_open_failed", {
        code: getErrnoCode(error) ?? "unknown",
        watch: handles.length === 0 ? "root" : "parent",
      });
      return;
    }
    watcherHandle = view;
    highestSeqAtWatch = progressSeq;
    testedAt = undefined;
    untestedWatches = new Set(["root", "parent"]);
    testingWatcher = true;
    let watch = "parent";
    try {
      for (let handle of handles)
        handle.on("error", () => {
          if (isCurrent()) onWatchError();
        });
      if ((await lstat(dirname(lateStartRoot))).isSymbolicLink()) {
        logDiagnosticOnce("info", "working_sync_watch_test_skipped", {
          code: "parent_is_link",
        });
        watcher = null;
        stopWatchAndPoll();
      }
      if (!isCurrent()) return;
      watch = "root";
      let dirHandle = await open(
        lateStartRoot,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
      );
      try {
        let { mode, gid } = await dirHandle.stat();
        if ((mode & 1024) !== 0 && gid !== process.getegid?.() && !process.getgroups?.().includes(gid)) {
          logDiagnosticOnce("info", "working_sync_watch_test_skipped", {
            code: "setgid_folder",
          });
          stopWatchAndPoll();
        } else if (isCurrent()) await dirHandle.chmod(mode & 4095);
      } finally {
        await dirHandle.close();
      }
      testedAt = Date.now();
    } catch (error) {
      logDiagnosticOnce("warn", "working_sync_watch_test_failed", {
        code: getErrnoCode(error) ?? "unknown",
        watch,
      });
      stopWatchAndPoll();
    } finally {
      testingWatcher = false;
    }
  };
  let scanOnce = async () => {
    let pushes = [];
    let dirQueue = [""];
    let seenPaths = new Set();
    let knownPaths = [...state.seenState.keys()];
    let { transportFailureSeq, sessionTerminalRejectSeq } = state;
    let scanSeq = ++progressSeq;
    let sawFile = false;
    let sawDir = false;
    let entryCount = 0;
    let hitCap = false;
    let readdirFailed = false;
    e: while (dirQueue.length && !stopped) {
      let relDir = dirQueue.shift();
      let entries;
      try {
        entries = await readdir(join(lateStartRoot, relDir), {
          withFileTypes: true,
        });
      } catch (error) {
        logForDiagnosticsNoPII("warn", "working_scan_readdir_failed", {
          code: getErrnoCode(error) ?? "unknown",
        });
        readdirFailed = true;
        continue;
      }
      for (let entry of entries) {
        if (++entryCount > MAX_CONCURRENT_SYNC_WRITES) {
          hitCap = true;
          if (!warnedScanCap) {
            logFeatureSad("ccr_synced_file_push", "scan_cap_reached");
            warnedScanCap = true;
          }
          break e;
        }
        let relPath = relDir ? join(relDir, entry.name) : entry.name;
        seenPaths.add(relPath);
        if (shouldIgnore(relPath) || isSeedPath(relPath)) continue;
        if (entry.isDirectory()) {
          sawDir = true;
          dirQueue.push(relPath);
          continue;
        }
        if (!entry.isFile()) continue;
        sawFile = true;
        let mtimeMs;
        try {
          mtimeMs = (await lstat(join(lateStartRoot, relPath))).mtimeMs;
        } catch {
          continue;
        }
        let reject = state.terminalRejects.get(relPath);
        if (reject !== undefined && reject.latchedUntilMs !== 0 && Date.now() >= reject.latchedUntilMs)
          state.reopenMtimeGate(relPath);
        state.releaseSessionFullHold(relPath);
        if (mtimeMs === state.lastSeenMtime.get(relPath)) continue;
        if (activePushes.has(relPath) || state.inFlight.has(relPath)) continue;
        activePushes.add(relPath);
        pushes.push(
          (async () => {
            await acquireSlot();
            try {
              if (await runInFlight(relPath, () => pushSyncedFile(lateStartRoot, relPath)))
                state.recordSettledMtime(relPath, mtimeMs);
            } finally {
              activePushes.delete(relPath);
              releaseSlot();
            }
          })().catch((error) =>
            logForDiagnosticsNoPII("warn", "working_push_threw", {
              code: getErrnoCode(error) ?? "unknown",
            }),
          ),
        );
      }
    }
    if (!hitCap && !readdirFailed && !stopped) {
      for (let key of state.lastSeenMtime.keys()) if (!seenPaths.has(key)) state.reopenMtimeGate(key);
      for (let key of state.terminalRejects.keys()) if (!seenPaths.has(key)) state.forgetTerminalReject(key);
      let prefix = lateStartRoot.endsWith(MAX_SYNCED_DIR_ENTRIES)
        ? lateStartRoot
        : lateStartRoot + MAX_SYNCED_DIR_ENTRIES;
      for (let knownPath of knownPaths)
        if (knownPath.startsWith(prefix) && !seenPaths.has(relative(lateStartRoot, knownPath)))
          state.evictDeleted(knownPath);
    }
    if (
      hitCap ||
      readdirFailed ||
      stopped ||
      sawFile ||
      sawDir ||
      state.inFlight.size > 0 ||
      watcher === null
    ) {
      if (sawFile || sawDir) watchFailures = 0;
      if (relyingOnWatch && (sawFile || sawDir)) {
        let dirMtime = await stat(lateStartRoot).then(
          (mtimeMs) => mtimeMs.mtimeMs,
          () => Date.now(),
        );
        if (relyingOnWatch && scanSeq > highestSeqAtWatch && Date.now() - dirMtime > MAX_WATCH_ATTEMPTS) {
          logForDiagnosticsNoPII("warn", "working_sync_watch_missed_change", {});
          watcher = null;
        }
      }
      stopWatchAndPoll();
    } else if (watcherHandle === undefined) {
      if (watchFailures >= MAX_WATCH_BACKOFF_MS)
        logDiagnosticOnce("warn", "working_sync_watch_attempts_used_up");
      else if (!testingWatcher) openWatch(watcher);
    } else if (untestedWatches.size > 0) {
      if (testedAt !== undefined && Date.now() - testedAt > MAX_WATCH_ATTEMPTS) {
        logDiagnosticOnce("warn", "working_sync_watch_test_unheard", {
          watch: [...untestedWatches].join("+"),
        });
        watcher = null;
        stopWatchAndPoll();
      }
    } else if (scanSeq > highestSeqAtWatch && !relyingOnWatch) {
      relyingOnWatch = true;
      watchFailures = 0;
      startPolling(WATCH_ATTEMPT_INTERVAL_MS);
      logDiagnosticOnce("info", "working_sync_waiting_for_file_events");
    }
    await Promise.allSettled(pushes);
    if (
      state.transportFailureSeq > transportFailureSeq ||
      state.sessionTerminalRejectSeq > sessionTerminalRejectSeq
    ) {
      backoffMs = backoffMs === 0 ? 2 * WAIT_FOR_FILE_EVENTS_MS : Math.min(backoffMs * 2, MAX_WRITE_RETRIES);
      backoffUntil = Date.now() + backoffMs;
    } else if (activePushes.size === 0) {
      backoffMs = 0;
      backoffUntil = 0;
    }
  };
  let runningScans = 0;
  let runScan = async () => {
    runningScans++;
    try {
      await scanOnce();
    } finally {
      runningScans--;
    }
  };
  let tick = () => {
    if (runningScans > 0 || Date.now() < backoffUntil) return;
    runScan().catch((error) =>
      logForDiagnosticsNoPII("warn", "working_push_threw", {
        code: getErrnoCode(error) ?? "unknown",
      }),
    );
  };
  let initialReconcile = runScan();
  startPolling(WAIT_FOR_FILE_EVENTS_MS);
  logForDiagnosticsNoPII("info", "working_sync_started", {});
  let syncer = {
    initialReconcile,
    flush: runScan,
    pendingCount: () => activePushes.size,
    pollBackoffUntilForTest: () => backoffUntil,
    reliesOnRootWatchForTest: () => relyingOnWatch,
    hasTestedRootWatchForTest: () => testedAt !== undefined,
    stop() {
      stopped = true;
      stopWatchAndPoll();
      clearInterval(pollTimer);
      state.syncerStopped(syncer);
    },
  };
  state.syncerStarted(syncer);
  return syncer;
}
//@ chunk-y9g4rvgd.js:20123-20247 placement
async function readLaneRowFromWorker(relPath) {
  if (isSeedPath(relPath))
    return {
      kind: "error",
      message: DIR_SYNC_LANE_RESERVED,
      retryable: false,
      errorKind: "other",
      status: undefined,
    };
  return getSyncedFile(relPath);
}
//@ chunk-y9g4rvgd.js:20247-21626 placement
async function writeLaneRowFromWorker(syncDir, context, content, ifMatch) {
  let state = currentSyncedFileSyncState();
  if (isSeedPath(context))
    return {
      ok: false,
      reason: "put_failed",
      error: DIR_SYNC_LANE_RESERVED,
      retryable: false,
    };
  if (content.length > MAX_WORKING_FILE_BYTES)
    return {
      ok: false,
      reason: "too_large",
      error: "content too large",
    };
  if (ifMatch !== undefined && ifMatch.length === 0)
    return {
      ok: false,
      reason: "put_failed",
      error: "empty if_match",
      retryable: false,
    };
  return runInFlight(context, async () => {
    let putResult = await putSyncedFile(context, content, ifMatch);
    if (putResult.kind === "conflict") {
      if (ifMatch !== undefined)
        return {
          ok: false,
          reason: "conflict",
          error: "lane row changed since if_match",
          retryable: false,
        };
      return {
        ok: false,
        reason: "put_failed",
        error: "put rejected (409 without if_match)",
        retryable: true,
      };
    }
    if (putResult.kind === "error")
      return {
        ok: false,
        reason: "put_failed",
        error: putResult.message,
        retryable: putResult.retryable,
      };
    if (!shouldIgnore(context)) {
      let destPath = join(syncDir, context);
      let seen = seenStateOf(destPath);
      let mirrorOk = false;
      try {
        await assertSafeSyncDest(syncDir, destPath);
        let handle = await open(destPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await handle.stat();
          if (stats.isFile() && stats.size <= MAX_WORKING_FILE_BYTES && seen !== undefined) {
            let size = Number(stats.size);
            let buf = Buffer.allocUnsafe(size + 1);
            let readTotal = 0;
            for (;;) {
              let { bytesRead } = await handle.read(buf, readTotal, size + 1 - readTotal, readTotal);
              if (bytesRead === 0) break;
              readTotal += bytesRead;
              if (readTotal > size) break;
            }
            mirrorOk = readTotal <= size && seen.localHash === computeContentHash(buf.subarray(0, readTotal));
          }
        } finally {
          await handle.close();
        }
      } catch (error) {
        mirrorOk = isENOENT(error);
      }
      if (!mirrorOk) {
        state.recordEvictedEtag(destPath, putResult.content_sha256);
        logForDiagnosticsNoPII("info", "worker_lane_mirror_skipped");
        return {
          ok: true,
          etag: putResult.content_sha256,
        };
      }
      try {
        await writeUnderSyncDir(syncDir, destPath, content);
      } catch (error) {
        state.recordEvictedEtag(destPath, putResult.content_sha256);
        logForDiagnosticsNoPII("warn", "worker_lane_mirror_skipped", {
          code: getErrnoCode(error) ?? "unknown",
        });
        return {
          ok: true,
          etag: putResult.content_sha256,
        };
      }
      recordSeenFile(destPath, putResult.content_sha256, computeContentHash(content));
    }
    return {
      ok: true,
      etag: putResult.content_sha256,
    };
  });
}
export {
  getSyncedFile,
  putSyncedFile,
  SYNCED_FILE_MODE,
  writeUnderSyncDir,
  shouldIgnore,
  SYNCED_FILE_ROOT,
  MAX_WORKING_FILE_BYTES,
  WORKING_FILESTORE_PREFIX,
  LANE_DENIED_REASON,
  relUnderSyncDir,
  DIR_SYNC_LANE_RESERVED,
  readLaneRowFromWorker,
  writeLaneRowFromWorker,
  drainSyncedFiles,
  flushSyncedFiles,
  stageSyncedFile,
  startSyncedFileSyncer,
};
