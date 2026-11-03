/**
 * services/syncedFiles/syncedFileSyncer.ts
 *
 * 2.1.316 新增：同步文件（synced files）后台同步器：暂存、写入同步目录、记录 worker 回传的行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6zwd30tr.js (29)
 * attribution: placement 29
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
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { classifyAxiosError, isENOENT, getErrnoCode } from "../../utils/errors.js";
import { apiClient } from "../routines/routinesApi.js";
import { env } from "../../utils/env.js";
import { hasBackslash } from "../../utils/pathClassification.js";
import { assertPathSafeAsync } from "../../utils/atomicPublishWrite.js";
import { rowStagedSignal } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getPlatform } from "../../utils/platform.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-6zwd30tr.js:1036-1048 placement
/**
 * 同步文件的写入权限位。
 */
var SYNCED_FILE_MODE = 384;
//@ chunk-6zwd30tr.js:1048-1326 placement
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
//@ chunk-6zwd30tr.js:1326-5118 placement
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
  recordSeen(e, etag, localHash) {
    this.seenState.set(e, {
      etag,
      localHash,
    });
    this.evictedEtag.delete(e);
  }
  forgetSeen(e) {
    this.seenState.delete(e);
    this.evictedEtag.delete(e);
  }
  recordEvictedEtag(e, n) {
    if (n === undefined) return;
    this.evictedEtag.delete(e);
    this.evictedEtag.set(e, n);
    if (this.evictedEtag.size > posixPathHelpers) {
      let t = this.evictedEtag.keys().next().value;
      if (t !== undefined) this.evictedEtag.delete(t);
    }
  }
  evictDeleted(e) {
    this.recordEvictedEtag(e, this.seenState.get(e)?.etag);
    this.seenState.delete(e);
  }
  recordSettledMtime(e, n) {
    this.lastSeenMtime.set(e, n);
  }
  reopenMtimeGate(e) {
    this.lastSeenMtime.delete(e);
  }
  recordTerminalReject(e, n = false) {
    let t = this.terminalRejects.get(e) ?? {
      consecutive: 0,
      latchedUntilMs: 0,
      suppressed: 0,
      heldWhileFull: false,
    };
    t.consecutive++;
    t.heldWhileFull ||= n;
    this.terminalRejects.set(e, t);
    if (t.consecutive >= TERMINAL_REJECT_LATCH_MS) {
      t.latchedUntilMs = Date.now() + SESSION_FULL_OFFER_INTERVAL_MS;
      logFeatureBad("ccr_synced_file_push", "push_parked_terminal", {
        consecutive_rejects: t.consecutive,
        suppressed_pushes: t.suppressed,
        held_while_full: t.heldWhileFull,
      });
      t.suppressed = 0;
      logForDiagnosticsNoPII("warn", "working_push_parked", {
        consecutive: t.consecutive,
      });
    }
  }
  resetTerminalRejectStreak(e) {
    let n = this.terminalRejects.get(e);
    if (n === undefined) return;
    if (n.suppressed === 0) {
      this.terminalRejects.delete(e);
      return;
    }
    n.consecutive = 0;
    n.latchedUntilMs = 0;
    n.heldWhileFull = false;
  }
  forgetTerminalReject(e) {
    this.terminalRejects.delete(e);
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
    let e = this.sessionFullUntilMs !== 0;
    let now = Date.now();
    this.sessionFullUntilMs = now + SESSION_FULL_OFFER_INTERVAL_MS;
    this.sessionFullNextOfferMs = now + DEFAULT_SYNCED_DIR_ENTRIES;
    if (e && this.sessionFullSuppressed === 0) return;
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
  releaseSessionFullHold(e) {
    let n = this.terminalRejects.get(e);
    if (n === undefined || !n.heldWhileFull) return;
    if (this.sessionFullUntilMs !== 0) {
      let now = Date.now();
      if (
        now < this.sessionFullUntilMs + WAIT_FOR_FILE_EVENTS_MS ||
        now < this.sessionFullNextOfferMs ||
        n.latchedUntilMs !== 0
      )
        return;
      this.sessionFullNextOfferMs = now + DEFAULT_SYNCED_DIR_ENTRIES;
    }
    n.heldWhileFull = false;
    this.resetTerminalRejectStreak(e);
    this.reopenMtimeGate(e);
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
  syncerStopped(e) {
    if (this.syncer === e) this.syncer = null;
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
//@ chunk-6zwd30tr.js:5118-5143 placement
/**
 * 按 host 保存的同步文件状态容器。
 */
var syncedFileSyncStateSlots = new HostScoped(() => new SyncedFileSyncState());
//@ chunk-6zwd30tr.js:5143-5179 placement
/**
 * 取当前 host 的同步文件状态。
 */
function currentSyncedFileSyncState() {
  return syncedFileSyncStateSlots.of(getRootSession().host);
}
//@ chunk-6zwd30tr.js:5179-5219 placement
/**
 * 记录某文件已同步的 etag 与本地哈希。
 */
function recordSeenFile(e, n, contentHash) {
  currentSyncedFileSyncState().recordSeen(e, n, contentHash);
}
//@ chunk-6zwd30tr.js:5219-5262 placement
/**
 * 取某文件的已同步状态。
 */
function seenStateOf(e) {
  return currentSyncedFileSyncState().seenState.get(e);
}
//@ chunk-6zwd30tr.js:5262-5308 placement = runWithAgentContext (0.635)
/**
 * 在 inFlight 存储中运行函数。
 */
function runInFlight(context, fn) {
  return currentSyncedFileSyncState().inFlight.run(context, fn);
}
//@ chunk-6zwd30tr.js:5308-5593 placement
function relUnderSyncDir(e, n) {
  if (!isAbsolute(e)) throw Error("syncDir must be absolute");
  if (n.includes("\x00")) throw Error("path contains null bytes");
  if (!isAbsolute(n)) throw Error("path must be absolute");
  let t = relative(e, normalize(n));
  if (t === "" || t === "." || isUnsafeRelativePath(t))
    throw Error("path must be under the working sync dir");
  return t;
}
//@ chunk-6zwd30tr.js:5593-5649 placement
/**
 * 路径是绝对路径或含 .. 时视为不安全。
 */
function isUnsafeRelativePath(e) {
  return isAbsolute(e) || e.split(MAX_SYNCED_DIR_ENTRIES).includes("..");
}
//@ chunk-6zwd30tr.js:5649-5786 placement
function shouldIgnore(e) {
  for (let n of e.split(MAX_SYNCED_DIR_ENTRIES))
    if (n.startsWith(".") || n.endsWith("~") || n.endsWith(".swp") || n.endsWith(".tmp")) return true;
  return false;
}
//@ chunk-6zwd30tr.js:5786-5999 placement
/**
 * 同步文件的两类错误体 schema（通道被拒、限额超限）与对应错误码。
 */
var SYNCED_FILE_LIMIT_EXCEEDED = "synced_file_limit_exceeded";
var LANE_DENIED_REASON = "synced_file_lane_denied";
var laneDeniedErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      reason: string().optional(),
      resource: string().optional(),
    }),
  }),
);
var limitErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      type: string().optional(),
      resource_type: string().optional(),
    }),
  }),
);
//@ chunk-6zwd30tr.js:5999-6148 placement
function isRetryableTransport(kind, status) {
  if (kind === "timeout" || kind === "network") return true;
  if (kind === "auth" || kind === "other") return false;
  if (status === undefined) return true;
  return status === 408 || status === 429 || status >= 500;
}
//@ chunk-6zwd30tr.js:6148-6551 placement
/**
 * 把同步文件请求错误转为结果对象：分类、是否可重试、拒绝原因与资源，并更新失败计数。
 */
function syncedFileError(operation, error) {
  let t = currentSyncedFileSyncState();
  let { kind, status } = classifyAxiosError(error);
  let d = isRetryableTransport(kind, status);
  if (d) t.noteRetryableTransportFailure();
  else if (kind === "auth") t.noteSessionTerminalReject();
  let h = status === 400 || status === 403 ? laneDeniedErrorOf(error) : undefined;
  let reason = status === 400 ? h?.reason : undefined;
  let resource = status === 403 ? h?.resource : undefined;
  return {
    kind: "error",
    message: `${operation} failed: ${kind}${status ? ` ${status}` : ""}`,
    retryable: d,
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
//@ chunk-6zwd30tr.js:6551-6627 placement
/**
 * 从响应里解析出「通道被拒」的错误体。
 */
function laneDeniedErrorOf(error) {
  let n = error?.response?.data;
  return laneDeniedErrorSchema().safeParse(n).data?.error;
}
//@ chunk-6zwd30tr.js:6627-6816 placement
function putRejectionReason(e) {
  if (e.errorKind === "gated") return `put_gated_${(e.gateReason ?? "unknown").replaceAll("-", "_")}`;
  return e.status !== undefined ? `put_rejected_${e.status}` : `put_rejected_${e.errorKind}`;
}
//@ chunk-6zwd30tr.js:6816-7476 placement
async function putSyncedFile(e, n, t) {
  let l = currentSyncedFileSyncState();
  try {
    let s = await apiClient.put(
      "/worker/synced_file",
      {
        path: `${WORKING_FILESTORE_PREFIX}/${e}`,
        content: n.toString("base64"),
        ...(t && {
          if_match_sha256: t,
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
        validateStatus: (d) => (d >= 200 && d < 300) || d === 409,
        maxBodyLength: Math.ceil((MAX_WORKING_FILE_BYTES * 4) / 3) + 1024,
      },
    );
    if (!s.ok) {
      l.noteSessionTerminalReject();
      return {
        kind: "error",
        message: `put gated: ${s.reason}`,
        retryable: false,
        errorKind: "gated",
        status: undefined,
        gateReason: s.reason,
      };
    }
    if (s.status === 409)
      return {
        kind: "conflict",
      };
    return {
      kind: "ok",
      content_sha256: s.data.content_sha256,
    };
  } catch (error) {
    return syncedFileError("put", error);
  }
}
//@ chunk-6zwd30tr.js:7476-8164 placement
async function getSyncedFile(e) {
  let n = currentSyncedFileSyncState();
  try {
    let t = await apiClient.get(
      `/worker/synced_file?path=${encodeURIComponent(`${WORKING_FILESTORE_PREFIX}/${e}`)}`,
      {
        auth: "session-jwt",
        host: "ccr-session",
        headers: {
          "anthropic-version": "2023-06-01",
        },
        timeout: SESSION_FULL_BACKOFF_MS,
        maxContentLength: Math.ceil((MAX_WORKING_FILE_BYTES * 4) / 3) + 1024,
        validateStatus: (l) => (l >= 200 && l < 300) || l === 404,
      },
    );
    if (!t.ok) {
      n.noteSessionTerminalReject();
      return {
        kind: "error",
        message: `get gated: ${t.reason}`,
        retryable: false,
        errorKind: "gated",
        status: undefined,
        gateReason: t.reason,
      };
    }
    if (t.status === 404) {
      let l = limitErrorSchema().safeParse(t.data);
      return {
        kind: "not_found",
        ...(l.success && {
          body: l.data.error,
        }),
      };
    }
    return {
      kind: "ok",
      buf: Buffer.from(t.data.content, "base64"),
      content_sha256: t.data.content_sha256,
    };
  } catch (error) {
    return syncedFileError("get", error);
  }
}
//@ chunk-6zwd30tr.js:8164-8719 placement
/**
 * 写入同步目录前校验目标：上级目录不能含反斜杠、真实父目录必须在同步目录内、不能落在忽略路径或被调用方拒绝的路径、目标不能是符号链接。
 */
async function assertSafeSyncDest(syncDir, dest, refuses) {
  assertNoBackslashDirs(syncDir, dest);
  let l = await realpath(syncDir);
  let s = await realpath(dirname(dest));
  let d = relative(l, s);
  if (isUnsafeRelativePath(d)) {
    let a = Error("dest parent escaped working sync dir");
    a.code = "WORKING_PARENT_ESCAPE";
    throw a;
  }
  let h = d === "" ? basename(dest) : join(d, basename(dest));
  if (shouldIgnore(h)) {
    let a = Error("dest resolves into an ignored path");
    a.code = "WORKING_DEST_IGNORED";
    throw a;
  }
  if (refuses?.(h)) {
    let a = Error("dest resolves onto a path the caller refuses");
    a.code = "WORKING_DEST_REFUSED";
    throw a;
  }
  try {
    if ((await lstat(dest)).isSymbolicLink()) {
      let c = Error("dest is a symlink");
      c.code = "WORKING_DEST_SYMLINK";
      throw c;
    }
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
//@ chunk-6zwd30tr.js:8719-8866 placement
function assertNoBackslashDirs(e, n) {
  if (hasBackslash(e) || hasBackslash(dirname(n))) {
    let t = Error("a folder on the way to dest has a backslash in its name");
    t.code = "WORKING_PATH_MISREAD";
    throw t;
  }
}
//@ chunk-6zwd30tr.js:8866-9773 placement
async function writeUnderSyncDir(syncDir, dest, t, l = "replace", refuses) {
  assertNoBackslashDirs(syncDir, dest);
  await mkdir(syncDir).catch((error) => {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  });
  let d = await realpath(syncDir);
  let h = dirname(dest);
  for (;;)
    try {
      let c = await realpath(h);
      let y = relative(d, c);
      if (isUnsafeRelativePath(y)) {
        let w = Error("dest ancestor escaped working sync dir");
        w.code = "WORKING_PARENT_ESCAPE";
        throw w;
      }
      if (shouldIgnore(y)) {
        let w = Error("dest ancestor resolves into an ignored path");
        w.code = "WORKING_DEST_IGNORED";
        throw w;
      }
      if (refuses?.(join(y, relative(h, dest))) === true) {
        let w = Error("dest resolves onto a path the caller refuses");
        w.code = "WORKING_DEST_REFUSED";
        throw w;
      }
      break;
    } catch (error) {
      if (!isENOENT(error)) throw error;
      let y = dirname(h);
      if (y === h) break;
      h = y;
    }
  await mkdir(dirname(dest), {
    recursive: true,
  });
  await assertSafeSyncDest(syncDir, dest, refuses);
  let a = `${dest}.${process.hrtime.bigint().toString(36)}.tmp`;
  try {
    await assertPathSafeAsync(a);
  } catch (error) {
    tempNameTaken(error);
    throw error;
  }
  try {
    await writeFile(a, t, {
      mode: SYNCED_FILE_MODE,
      flag: "wx",
    });
  } catch (error) {
    tempNameTaken(error);
    await unlink(a).catch(() => {});
    throw error;
  }
  try {
    if (l === "create_only") {
      await link(a, dest);
      await unlink(a);
    } else await rename(a, dest);
  } catch (error) {
    await unlink(a).catch(() => {});
    throw error;
  }
}
//@ chunk-6zwd30tr.js:9773-9910 placement
function tempNameTaken(error) {
  if (getErrnoCode(error) !== "EEXIST") return;
  let n = Error("sibling tempfile name already taken", {
    cause: error,
  });
  n.code = "WORKING_TMP_TAKEN";
  throw n;
}
//@ chunk-6zwd30tr.js:9910-12804 placement
async function stageSyncedFile(e, n, syncDir) {
  let context;
  try {
    context = relUnderSyncDir(syncDir, e.mount_path);
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
  let dest = join(syncDir, context);
  return runInFlight(context, async () => {
    let d;
    let h;
    try {
      try {
        await assertSafeSyncDest(syncDir, dest);
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
      let a = null;
      try {
        let r = await open(dest, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await r.stat();
          if (stats.isFile()) {
            if (stats.size > MAX_WORKING_FILE_BYTES) {
              logFeatureBad("ccr_synced_file_stage", "too_large");
              return {
                ok: false,
                error: "local file too large to reconcile",
              };
            }
            a = await r.readFile();
          }
        } finally {
          await r.close();
        }
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ELOOP" && errnoCode !== "EMLINK") throw error;
      }
      let c = a ? computeContentHash(a) : undefined;
      let y = seenStateOf(dest);
      if (c && y && y.localHash === c && e.content_sha256 !== undefined && y.etag === e.content_sha256) {
        logFeatureOk("ccr_synced_file_stage");
        return {
          ok: true,
          noop: "already_present",
        };
      }
      let expectedLocalSha256 = e.expected_local_sha256 || undefined;
      let O = y && y.localHash === c && (expectedLocalSha256 === undefined || y.etag === expectedLocalSha256);
      if (a && !O) {
        let r = await putSyncedFile(context, a, expectedLocalSha256);
        if (r.kind === "error") {
          logFeatureBad("ccr_synced_file_stage", "push_failed");
          return {
            ok: false,
            error: r.message,
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
        d = syncedFile.buf;
        h = syncedFile.content_sha256;
        logForDiagnosticsNoPII("info", "working_stage_reconciled", {
          conflict: r.kind === "conflict",
        });
      } else {
        let r = await n(e.filestore_path);
        if (!r.ok) {
          logFeatureBad("ccr_synced_file_stage", "fetch_failed");
          return {
            ok: false,
            error: r.error,
          };
        }
        if (r.buf.length > MAX_WORKING_FILE_BYTES) {
          logFeatureBad("ccr_synced_file_stage", "too_large");
          return {
            ok: false,
            error: "staged content too large",
          };
        }
        d = r.buf;
        h = e.content_sha256;
      }
      let R = null;
      try {
        let r = await open(dest, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await r.stat();
          if (stats.isFile()) {
            if (stats.size > MAX_WORKING_FILE_BYTES) {
              logFeatureBad("ccr_synced_file_stage", "too_large");
              return {
                ok: false,
                error: "local file too large to reconcile",
              };
            }
            R = await r.readFile();
          }
        } finally {
          await r.close();
        }
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ELOOP" && errnoCode !== "EMLINK") throw error;
      }
      if (R && computeContentHash(R) !== c) {
        let r = await putSyncedFile(context, R, h);
        if (r.kind === "error") {
          logFeatureBad("ccr_synced_file_stage", "push_failed");
          return {
            ok: false,
            error: r.message,
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
        d = syncedFile.buf;
        h = syncedFile.content_sha256;
        logForDiagnosticsNoPII("info", "working_stage_reconciled", {
          conflict: r.kind === "conflict",
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
      await writeUnderSyncDir(syncDir, dest, d);
    } catch (error) {
      logFeatureBad("ccr_synced_file_stage", "write_failed");
      return {
        ok: false,
        error: `write failed: ${getErrnoCode(error) ?? "unknown"}`,
      };
    }
    recordSeenFile(dest, h, computeContentHash(d));
    logFeatureOk("ccr_synced_file_stage");
    logForDiagnosticsNoPII("info", "working_stage_ok", {
      bytes: d.length,
    });
    return {
      ok: true,
    };
  });
}
//@ chunk-6zwd30tr.js:12804-15354 placement
/**
 * 把同步目录中的一个文件推到云端：跳过保留路径、暂停中的、反斜杠或越界符号链接、过大文件；内容未变跳过；首次时先取远端版本（远端胜出则写回本地）；PUT 带 etag，冲突时重新取远端覆盖本地；记录各种结果遥测，返回是否已处理完毕。
 */
async function pushSyncedFile(syncDir, relPath) {
  let t = currentSyncedFileSyncState();
  if (isSeedPath(relPath)) {
    logFeatureSad("ccr_synced_file_push", "lane_path_reserved");
    return true;
  }
  let l = t.terminalRejects.get(relPath);
  if (l !== undefined && l.latchedUntilMs !== 0) {
    if (Date.now() < l.latchedUntilMs) {
      l.suppressed++;
      return true;
    }
    l.latchedUntilMs = 0;
  }
  let s = join(syncDir, relPath);
  if (hasBackslash(s)) {
    logFeatureSad("ccr_synced_file_push", "backslash_in_path");
    return true;
  }
  let d;
  try {
    d = await realpath(s);
  } catch (error) {
    if (isENOENT(error)) return true;
    throw error;
  }
  let h;
  try {
    h = await realpath(syncDir);
  } catch {
    return false;
  }
  let a = relative(h, d);
  if (a !== relPath && (a === "" || isUnsafeRelativePath(a))) {
    logFeatureSad("ccr_synced_file_push", "symlink_escape");
    return true;
  }
  let c;
  try {
    let S = await open(s, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      let stats = await S.stat();
      if (!stats.isFile()) return true;
      if (stats.size > MAX_WORKING_FILE_BYTES) {
        logFeatureSad("ccr_synced_file_push", "too_large");
        return true;
      }
      c = await S.readFile();
    } finally {
      await S.close();
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
  let contentHash = computeContentHash(c);
  let w = seenStateOf(s);
  if (contentHash === w?.localHash) return true;
  let O = w === undefined ? t.evictedEtag.get(s) : undefined;
  let R = "open";
  if (w === undefined && O === undefined) {
    let syncedFile = await getSyncedFile(relPath);
    if (syncedFile.kind === "error") {
      logFeatureBad("ccr_synced_file_push", "seed_get_failed");
      if (!syncedFile.retryable) t.recordTerminalReject(relPath);
      return !syncedFile.retryable;
    }
    if (syncedFile.kind === "ok") {
      t.resetTerminalRejectStreak(relPath);
      let contentHash_2 = computeContentHash(syncedFile.buf);
      if (contentHash_2 === contentHash) {
        recordSeenFile(s, syncedFile.content_sha256, contentHash);
        return true;
      }
      try {
        await writeUnderSyncDir(syncDir, s, syncedFile.buf);
      } catch {
        logFeatureBad("ccr_synced_file_push", "write_failed");
        return false;
      }
      recordSeenFile(s, syncedFile.content_sha256, contentHash_2);
      logFeatureSad("ccr_synced_file_push", "cold_renderer_wins");
      return true;
    }
    R = t.sessionFullGate();
    if (R === "skip") {
      t.recordTerminalReject(relPath, true);
      return true;
    }
  }
  let r = await putSyncedFile(relPath, c, w?.etag ?? O);
  if (R === "probe") {
    if (r.kind === "ok") t.clearSessionFull();
    else if (r.kind === "conflict" || r.laneReason !== SYNCED_FILE_LIMIT_EXCEEDED) t.sessionFullReprobeNow();
  }
  if (r.kind === "ok") {
    t.resetTerminalRejectStreak(relPath);
    recordSeenFile(s, r.content_sha256, contentHash);
    logFeatureOk("ccr_synced_file_push");
    return true;
  }
  if (r.kind === "error") {
    if (r.retryable) {
      t.resetTerminalRejectStreak(relPath);
      logFeatureBad("ccr_synced_file_push", "put_failed");
    } else {
      logFeatureBad("ccr_synced_file_push", putRejectionReason(r));
      let S = r.laneReason === SYNCED_FILE_LIMIT_EXCEEDED;
      t.recordTerminalReject(relPath, S);
      if (S) t.recordSessionFull();
    }
    logForDiagnosticsNoPII("warn", "working_push_failed", {
      reason: r.message,
      retryable: r.retryable,
    });
    return !r.retryable;
  }
  t.resetTerminalRejectStreak(relPath);
  let syncedFile = await getSyncedFile(relPath);
  if (syncedFile.kind === "error") {
    logFeatureBad("ccr_synced_file_push", "reget_failed");
    if (!syncedFile.retryable) t.recordTerminalReject(relPath);
    return !syncedFile.retryable;
  }
  if (syncedFile.kind === "not_found") {
    t.forgetSeen(s);
    t.sessionFullReprobeNow();
    logFeatureBad("ccr_synced_file_push", "reget_failed");
    return false;
  }
  try {
    await writeUnderSyncDir(syncDir, s, syncedFile.buf);
  } catch {
    logFeatureBad("ccr_synced_file_push", "write_failed");
    return false;
  }
  recordSeenFile(s, syncedFile.content_sha256, computeContentHash(syncedFile.buf));
  logFeatureSad("ccr_synced_file_push", "conflict_overwritten");
  return true;
}
//@ chunk-6zwd30tr.js:15354-15388 placement
function flushSyncedFiles() {
  return currentSyncedFileSyncState().flush();
}
//@ chunk-6zwd30tr.js:15388-15577 placement
async function drainSyncedFiles() {
  let e = currentSyncedFileSyncState();
  await flushSyncedFiles();
  for (;;) {
    if (e.inFlight.size === 0 && (e.activeSyncer?.pendingCount() ?? 0) === 0) return;
    await e.inFlight.settle();
    await new Promise((resolve) => setImmediate(resolve));
  }
}
//@ chunk-6zwd30tr.js:15577-20123 placement
async function startSyncedFileSyncer(
  syncDir,
  n = getPlatform() === "linux" && !env.CLAUDE_CODE_DISABLE_WORKING_SYNC_WATCH ? watch : null,
) {
  let t = currentSyncedFileSyncState();
  t.armLateStart(null);
  for (let j = 1; ; j++)
    try {
      await mkdir(syncDir);
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
        t.armLateStart(syncDir);
        return null;
      }
      logFeatureSad("ccr_synced_file_push", "sync_start_failed");
      logForDiagnosticsNoPII("warn", "working_sync_start_failed", {
        code: errnoCode ?? "unknown",
      });
      return null;
    }
  let l = 0;
  let s = [];
  let d = () =>
    l < SYNC_REQUEST_TIMEOUT_MS ? (l++, Promise.resolve()) : new Promise((resolve) => s.push(resolve));
  let h = () => {
    let E = s.shift();
    if (E) E();
    else l--;
  };
  let a = new Set();
  let c = false;
  let y = false;
  let w = 0;
  let O = 0;
  let R = n;
  let r;
  let _ = 0;
  let S = 0;
  let M = false;
  let ne;
  let oe = new Set();
  let ie = 0;
  let K = false;
  let Te = new Set();
  let G = (E, x, v = {}) => {
    let joined = [x, ...Object.values(v)].join(" ");
    if (!c && !Te.has(joined)) {
      Te.add(joined);
      logForDiagnosticsNoPII(E, x, v);
    }
  };
  let H;
  let now = Date.now();
  let pe = (E) => {
    clearInterval(H);
    H = setInterval(Oe, E);
    H.unref?.();
  };
  let Be = () => {
    pe(WAIT_FOR_FILE_EVENTS_MS);
    Oe();
  };
  let D = () => {
    r?.close();
    r = undefined;
    if (K) {
      K = false;
      clearInterval(H);
      H = setTimeout(Be, WAIT_FOR_FILE_EVENTS_MS - (Math.abs(Date.now() - now) % WAIT_FOR_FILE_EVENTS_MS));
      H.unref?.();
    }
  };
  let Ce = () => {
    logForDiagnosticsNoPII("warn", "working_sync_watch_errored", {});
    R = null;
    D();
  };
  let Ue = async (E) => {
    ie++;
    let x = [];
    let v = {
      close: () => {
        for (let F of x) F.close();
      },
    };
    let A = () => r === v;
    let ae = (F, P, j) => {
      x.push(
        E(
          P,
          {
            persistent: false,
          },
          (ye, q) => {
            if (!A() || !j(q)) return;
            if (!(ye === "change" && q === basename(syncDir) && oe.delete(F))) D();
          },
        ),
      );
    };
    try {
      ae("root", syncDir, () => true);
      ae(
        "parent",
        dirname(syncDir),
        (F) =>
          typeof F !== "string" || F === "" || F === basename(syncDir) || F === basename(dirname(syncDir)),
      );
    } catch (error) {
      v.close();
      G("warn", "working_sync_watch_open_failed", {
        code: getErrnoCode(error) ?? "unknown",
        watch: x.length === 0 ? "root" : "parent",
      });
      return;
    }
    r = v;
    S = _;
    ne = undefined;
    oe = new Set(["root", "parent"]);
    M = true;
    let watch = "parent";
    try {
      for (let P of x)
        P.on("error", () => {
          if (A()) Ce();
        });
      if ((await lstat(dirname(syncDir))).isSymbolicLink()) {
        G("info", "working_sync_watch_test_skipped", {
          code: "parent_is_link",
        });
        R = null;
        D();
      }
      if (!A()) return;
      watch = "root";
      let F = await open(syncDir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try {
        let { mode, gid } = await F.stat();
        if ((mode & 1024) !== 0 && gid !== process.getegid?.() && !process.getgroups?.().includes(gid)) {
          G("info", "working_sync_watch_test_skipped", {
            code: "setgid_folder",
          });
          D();
        } else if (A()) await F.chmod(mode & 4095);
      } finally {
        await F.close();
      }
      ne = Date.now();
    } catch (error) {
      G("warn", "working_sync_watch_test_failed", {
        code: getErrnoCode(error) ?? "unknown",
        watch,
      });
      D();
    } finally {
      M = false;
    }
  };
  let Ke = async () => {
    let E = [];
    let x = [""];
    let v = new Set();
    let A = [...t.seenState.keys()];
    let { transportFailureSeq, sessionTerminalRejectSeq } = t;
    let F = ++_;
    let P = false;
    let j = false;
    let ye = 0;
    let q = false;
    let ce = false;
    e: while (x.length && !c) {
      let Y = x.shift();
      let N;
      try {
        N = await readdir(join(syncDir, Y), {
          withFileTypes: true,
        });
      } catch (error) {
        logForDiagnosticsNoPII("warn", "working_scan_readdir_failed", {
          code: getErrnoCode(error) ?? "unknown",
        });
        ce = true;
        continue;
      }
      for (let X of N) {
        if (++ye > MAX_CONCURRENT_SYNC_WRITES) {
          q = true;
          if (!y) {
            logFeatureSad("ccr_synced_file_push", "scan_cap_reached");
            y = true;
          }
          break e;
        }
        let b = Y ? join(Y, X.name) : X.name;
        v.add(b);
        if (shouldIgnore(b) || isSeedPath(b)) continue;
        if (X.isDirectory()) {
          j = true;
          x.push(b);
          continue;
        }
        if (!X.isFile()) continue;
        P = true;
        let we;
        try {
          we = (await lstat(join(syncDir, b))).mtimeMs;
        } catch {
          continue;
        }
        let me = t.terminalRejects.get(b);
        if (me !== undefined && me.latchedUntilMs !== 0 && Date.now() >= me.latchedUntilMs)
          t.reopenMtimeGate(b);
        t.releaseSessionFullHold(b);
        if (we === t.lastSeenMtime.get(b)) continue;
        if (a.has(b) || t.inFlight.has(b)) continue;
        a.add(b);
        E.push(
          (async () => {
            await d();
            try {
              if (await runInFlight(b, () => pushSyncedFile(syncDir, b))) t.recordSettledMtime(b, we);
            } finally {
              a.delete(b);
              h();
            }
          })().catch((error) =>
            logForDiagnosticsNoPII("warn", "working_push_threw", {
              code: getErrnoCode(error) ?? "unknown",
            }),
          ),
        );
      }
    }
    if (!q && !ce && !c) {
      for (let key of t.lastSeenMtime.keys()) if (!v.has(key)) t.reopenMtimeGate(key);
      for (let key of t.terminalRejects.keys()) if (!v.has(key)) t.forgetTerminalReject(key);
      let Y = syncDir.endsWith(MAX_SYNCED_DIR_ENTRIES) ? syncDir : syncDir + MAX_SYNCED_DIR_ENTRIES;
      for (let N of A) if (N.startsWith(Y) && !v.has(relative(syncDir, N))) t.evictDeleted(N);
    }
    if (q || ce || c || P || j || t.inFlight.size > 0 || R === null) {
      if (P || j) ie = 0;
      if (K && (P || j)) {
        let Y = await stat(syncDir).then(
          (N) => N.mtimeMs,
          () => Date.now(),
        );
        if (K && F > S && Date.now() - Y > MAX_WATCH_ATTEMPTS) {
          logForDiagnosticsNoPII("warn", "working_sync_watch_missed_change", {});
          R = null;
        }
      }
      D();
    } else if (r === undefined) {
      if (ie >= MAX_WATCH_BACKOFF_MS) G("warn", "working_sync_watch_attempts_used_up");
      else if (!M) Ue(R);
    } else if (oe.size > 0) {
      if (ne !== undefined && Date.now() - ne > MAX_WATCH_ATTEMPTS) {
        G("warn", "working_sync_watch_test_unheard", {
          watch: [...oe].join("+"),
        });
        R = null;
        D();
      }
    } else if (F > S && !K) {
      K = true;
      ie = 0;
      pe(WATCH_ATTEMPT_INTERVAL_MS);
      G("info", "working_sync_waiting_for_file_events");
    }
    await Promise.allSettled(E);
    if (
      t.transportFailureSeq > transportFailureSeq ||
      t.sessionTerminalRejectSeq > sessionTerminalRejectSeq
    ) {
      w = w === 0 ? 2 * WAIT_FOR_FILE_EVENTS_MS : Math.min(w * 2, MAX_WRITE_RETRIES);
      O = Date.now() + w;
    } else if (a.size === 0) {
      w = 0;
      O = 0;
    }
  };
  let _e = 0;
  let he = async () => {
    _e++;
    try {
      await Ke();
    } finally {
      _e--;
    }
  };
  let Oe = () => {
    if (_e > 0 || Date.now() < O) return;
    he().catch((error) =>
      logForDiagnosticsNoPII("warn", "working_push_threw", {
        code: getErrnoCode(error) ?? "unknown",
      }),
    );
  };
  let initialReconcile = he();
  pe(WAIT_FOR_FILE_EVENTS_MS);
  logForDiagnosticsNoPII("info", "working_sync_started", {});
  let ge = {
    initialReconcile,
    flush: he,
    pendingCount: () => a.size,
    pollBackoffUntilForTest: () => O,
    reliesOnRootWatchForTest: () => K,
    hasTestedRootWatchForTest: () => ne !== undefined,
    stop() {
      c = true;
      D();
      clearInterval(H);
      t.syncerStopped(ge);
    },
  };
  t.syncerStarted(ge);
  return ge;
}
//@ chunk-6zwd30tr.js:20123-20247 placement
async function readLaneRowFromWorker(e) {
  if (isSeedPath(e))
    return {
      kind: "error",
      message: DIR_SYNC_LANE_RESERVED,
      retryable: false,
      errorKind: "other",
      status: undefined,
    };
  return getSyncedFile(e);
}
//@ chunk-6zwd30tr.js:20247-21626 placement
async function writeLaneRowFromWorker(syncDir, context, t, ifMatch) {
  let s = currentSyncedFileSyncState();
  if (isSeedPath(context))
    return {
      ok: false,
      reason: "put_failed",
      error: DIR_SYNC_LANE_RESERVED,
      retryable: false,
    };
  if (t.length > MAX_WORKING_FILE_BYTES)
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
    let d = await putSyncedFile(context, t, ifMatch);
    if (d.kind === "conflict") {
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
    if (d.kind === "error")
      return {
        ok: false,
        reason: "put_failed",
        error: d.message,
        retryable: d.retryable,
      };
    if (!shouldIgnore(context)) {
      let dest = join(syncDir, context);
      let a = seenStateOf(dest);
      let c = false;
      try {
        await assertSafeSyncDest(syncDir, dest);
        let y = await open(dest, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await y.stat();
          if (stats.isFile() && stats.size <= MAX_WORKING_FILE_BYTES && a !== undefined) {
            let O = Number(stats.size);
            let R = Buffer.allocUnsafe(O + 1);
            let r = 0;
            for (;;) {
              let { bytesRead } = await y.read(R, r, O + 1 - r, r);
              if (bytesRead === 0) break;
              r += bytesRead;
              if (r > O) break;
            }
            c = r <= O && a.localHash === computeContentHash(R.subarray(0, r));
          }
        } finally {
          await y.close();
        }
      } catch (error) {
        c = isENOENT(error);
      }
      if (!c) {
        s.recordEvictedEtag(dest, d.content_sha256);
        logForDiagnosticsNoPII("info", "worker_lane_mirror_skipped");
        return {
          ok: true,
          etag: d.content_sha256,
        };
      }
      try {
        await writeUnderSyncDir(syncDir, dest, t);
      } catch (error) {
        s.recordEvictedEtag(dest, d.content_sha256);
        logForDiagnosticsNoPII("warn", "worker_lane_mirror_skipped", {
          code: getErrnoCode(error) ?? "unknown",
        });
        return {
          ok: true,
          etag: d.content_sha256,
        };
      }
      recordSeenFile(dest, d.content_sha256, computeContentHash(t));
    }
    return {
      ok: true,
      etag: d.content_sha256,
    };
  });
}
export {
  getSyncedFile,
  putSyncedFile,
  MAX_WORKING_FILE_BYTES,
  shouldIgnore,
  relUnderSyncDir,
  WORKING_FILESTORE_PREFIX,
  DIR_SYNC_LANE_RESERVED,
  readLaneRowFromWorker,
  writeLaneRowFromWorker,
  SYNCED_FILE_ROOT,
  LANE_DENIED_REASON,
  SYNCED_FILE_MODE,
  writeUnderSyncDir,
};
