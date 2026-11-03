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
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { classifyAxiosError, isENOENT, getErrnoCode } from "../../utils/errors.js";
import { apiClient } from "../routines/routinesApi.js";
import { env } from "../../utils/env.js";
import { rc } from "../../utils/pathClassification.js";
import { assertPathSafeAsync } from "../../utils/atomicPublishWrite.js";
import { qyt } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getPlatform } from "../../utils/platform.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-6zwd30tr.js:1036-1048 placement
var x0r = 384;
//@ chunk-6zwd30tr.js:1048-1326 placement
var {
    basename: basename,
    dirname: dirname,
    isAbsolute: isAbsolute,
    join: join,
    normalize: normalize,
    relative: relative,
    sep: sep,
  } = posix,
  SYNCED_FILE_ROOT = "/mnt/user-data/working",
  WORKING_FILESTORE_PREFIX = "/working",
  DIR_SYNC_LANE_RESERVED = `${WORKING_FILESTORE_PREFIX}/${SEED_DIR} is reserved`,
  MAX_WORKING_FILE_BYTES = 26214400,
  We = 4096,
  Ze = 4,
  Le = 30000,
  Q = 5000,
  et = 60000,
  Ne = 1000,
  tt = 12,
  nt = 120000,
  st = 5,
  ot = 2000,
  it = 3,
  de = 600000,
  xe = 3600000,
  at = We;
/**
 * 同步文件推送的状态：每个文件已见的 etag/本地哈希、被逐出的 etag、mtime 闸门、连续终端拒绝（达到次数后暂停一段时间）、会话空间已满的暂停与探测、传输失败计数，以及延迟启动的同步器。
 */
//@ chunk-6zwd30tr.js:1326-5118 placement
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
  recordSeen(e, n, t) {
    (this.seenState.set(e, { etag: n, localHash: t }), this.evictedEtag.delete(e));
  }
  forgetSeen(e) {
    (this.seenState.delete(e), this.evictedEtag.delete(e));
  }
  recordEvictedEtag(e, n) {
    if (n === void 0) return;
    if ((this.evictedEtag.delete(e), this.evictedEtag.set(e, n), this.evictedEtag.size > at)) {
      let t = this.evictedEtag.keys().next().value;
      if (t !== void 0) this.evictedEtag.delete(t);
    }
  }
  evictDeleted(e) {
    (this.recordEvictedEtag(e, this.seenState.get(e)?.etag), this.seenState.delete(e));
  }
  recordSettledMtime(e, n) {
    this.lastSeenMtime.set(e, n);
  }
  reopenMtimeGate(e) {
    this.lastSeenMtime.delete(e);
  }
  recordTerminalReject(e, n = !1) {
    let t = this.terminalRejects.get(e) ?? {
      consecutive: 0,
      latchedUntilMs: 0,
      suppressed: 0,
      heldWhileFull: !1,
    };
    if ((t.consecutive++, (t.heldWhileFull ||= n), this.terminalRejects.set(e, t), t.consecutive >= it))
      ((t.latchedUntilMs = Date.now() + de),
        logFeatureBad("ccr_synced_file_push", "push_parked_terminal", {
          consecutive_rejects: t.consecutive,
          suppressed_pushes: t.suppressed,
          held_while_full: t.heldWhileFull,
        }),
        (t.suppressed = 0),
        logForDiagnosticsNoPII("warn", "working_push_parked", { consecutive: t.consecutive }));
  }
  resetTerminalRejectStreak(e) {
    let n = this.terminalRejects.get(e);
    if (n === void 0) return;
    if (n.suppressed === 0) {
      this.terminalRejects.delete(e);
      return;
    }
    ((n.consecutive = 0), (n.latchedUntilMs = 0), (n.heldWhileFull = !1));
  }
  forgetTerminalReject(e) {
    this.terminalRejects.delete(e);
  }
  sessionFullGate() {
    if (this.sessionFullUntilMs === 0) return "open";
    let now = Date.now();
    if (now < this.sessionFullUntilMs) return (this.sessionFullSuppressed++, "skip");
    return ((this.sessionFullUntilMs = now + de), "probe");
  }
  recordSessionFull() {
    let e = this.sessionFullUntilMs !== 0,
      now = Date.now();
    if (
      ((this.sessionFullUntilMs = now + de),
      (this.sessionFullNextOfferMs = now + xe),
      e && this.sessionFullSuppressed === 0)
    )
      return;
    (logFeatureBad("ccr_synced_file_push", "push_parked_session_full", {
      suppressed_pushes: this.sessionFullSuppressed,
    }),
      logForDiagnosticsNoPII("warn", "working_session_full", {
        suppressed_pushes: this.sessionFullSuppressed,
      }),
      (this.sessionFullSuppressed = 0));
  }
  clearSessionFull() {
    this.sessionFullUntilMs = 0;
  }
  sessionFullReprobeNow() {
    if (this.sessionFullUntilMs !== 0) this.sessionFullUntilMs = Date.now();
  }
  releaseSessionFullHold(e) {
    let n = this.terminalRejects.get(e);
    if (n === void 0 || !n.heldWhileFull) return;
    if (this.sessionFullUntilMs !== 0) {
      let now = Date.now();
      if (now < this.sessionFullUntilMs + Q || now < this.sessionFullNextOfferMs || n.latchedUntilMs !== 0)
        return;
      this.sessionFullNextOfferMs = now + xe;
    }
    ((n.heldWhileFull = !1), this.resetTerminalRejectStreak(e), this.reopenMtimeGate(e));
  }
  get transportFailureSeq() {
    return this.retryableTransportFailures;
  }
  get sessionTerminalRejectSeq() {
    return this.sessionTerminalRejects;
  }
  noteRetryableTransportFailure() {
    if ((this.retryableTransportFailures++, this.sessionFullUntilMs !== 0))
      this.sessionFullNextOfferMs = Math.max(this.sessionFullNextOfferMs, Date.now() + de);
  }
  noteSessionTerminalReject() {
    this.sessionTerminalRejects++;
  }
  get activeSyncer() {
    return this.syncer;
  }
  syncerStarted(e) {
    this.syncer = e;
  }
  syncerStopped(e) {
    if (this.syncer === e) this.syncer = null;
  }
  armLateStart(e) {
    this.lateStartRoot = e;
  }
  async flush() {
    if (this.syncer === null) {
      if (this.lateStartRoot !== null && this.startInFlight === null) {
        let e = startSyncedFileSyncer(this.lateStartRoot);
        ((this.startInFlight = e),
          e
            .finally(() => {
              if (this.startInFlight === e) this.startInFlight = null;
            })
            .catch(() => {}));
      }
      await this.startInFlight?.catch(() => {});
    }
    await this.syncer?.flush();
  }
  sessionFullStateForTest() {
    return { armed: this.sessionFullUntilMs !== 0, suppressed: this.sessionFullSuppressed };
  }
  reset() {
    (this.seenState.clear(),
      this.lastSeenMtime.clear(),
      this.evictedEtag.clear(),
      this.terminalRejects.clear(),
      (this.sessionFullUntilMs = 0),
      (this.sessionFullSuppressed = 0),
      (this.sessionFullNextOfferMs = 0),
      (this.lateStartRoot = null),
      (this.startInFlight = null));
  }
}
//@ chunk-6zwd30tr.js:5118-5143 placement
var lt = new HostScoped(() => new SyncedFileSyncState());
//@ chunk-6zwd30tr.js:5143-5179 placement
function L() {
  return lt.of(getRootSession().host);
}
//@ chunk-6zwd30tr.js:5179-5219 placement
function Z(e, n, t) {
  L().recordSeen(e, n, t);
}
//@ chunk-6zwd30tr.js:5219-5262 placement
function Ee(e) {
  return L().seenState.get(e);
}
/**
 * 在 inFlight 存储中运行函数。
 */
//@ chunk-6zwd30tr.js:5262-5308 placement = runWithAgentContext (0.635)
function runInFlight(context, fn) {
  return L().inFlight.run(context, fn);
}
//@ chunk-6zwd30tr.js:5308-5593 placement
function relUnderSyncDir(e, n) {
  if (!isAbsolute(e)) throw Error("syncDir must be absolute");
  if (n.includes("\x00")) throw Error("path contains null bytes");
  if (!isAbsolute(n)) throw Error("path must be absolute");
  let t = relative(e, normalize(n));
  if (t === "" || t === "." || fe(t)) throw Error("path must be under the working sync dir");
  return t;
}
//@ chunk-6zwd30tr.js:5593-5649 placement
function fe(e) {
  return isAbsolute(e) || e.split(sep).includes("..");
}
//@ chunk-6zwd30tr.js:5649-5786 placement
function shouldIgnore(e) {
  for (let n of e.split(sep))
    if (n.startsWith(".") || n.endsWith("~") || n.endsWith(".swp") || n.endsWith(".tmp")) return !0;
  return !1;
}
//@ chunk-6zwd30tr.js:5786-5999 placement
var SYNCED_FILE_LIMIT_EXCEEDED = "synced_file_limit_exceeded",
  LANE_DENIED_REASON = "synced_file_lane_denied",
  ct = DoctorLazy(() => u({ error: u({ reason: o().optional(), resource: o().optional() }) })),
  dt = DoctorLazy(() => u({ error: u({ type: o().optional(), resource_type: o().optional() }) }));
//@ chunk-6zwd30tr.js:5999-6148 placement
function isRetryableTransport(e, n) {
  if (e === "timeout" || e === "network") return !0;
  if (e === "auth" || e === "other") return !1;
  if (n === void 0) return !0;
  return n === 408 || n === 429 || n >= 500;
}
/**
 * 把同步文件请求错误转为结果对象：分类、是否可重试、拒绝原因与资源，并更新失败计数。
 */
//@ chunk-6zwd30tr.js:6148-6551 placement
function syncedFileError(operation, error) {
  let t = L(),
    { kind: kind, status: status } = classifyAxiosError(error),
    d = isRetryableTransport(kind, status);
  if (d) t.noteRetryableTransportFailure();
  else if (kind === "auth") t.noteSessionTerminalReject();
  let h = status === 400 || status === 403 ? ft(error) : void 0,
    a = status === 400 ? h?.reason : void 0,
    c = status === 403 ? h?.resource : void 0;
  return {
    kind: "error",
    message: `${operation} failed: ${kind}${status ? ` ${status}` : ""}`,
    retryable: d,
    errorKind: kind,
    status: status,
    ...(a !== void 0 && { laneReason: a }),
    ...(c !== void 0 && { refusedResource: c }),
  };
}
//@ chunk-6zwd30tr.js:6551-6627 placement
function ft(e) {
  let n = e?.response?.data;
  return ct().safeParse(n).data?.error;
}
//@ chunk-6zwd30tr.js:6627-6816 placement
function putRejectionReason(e) {
  if (e.errorKind === "gated") return `put_gated_${(e.gateReason ?? "unknown").replaceAll("-", "_")}`;
  return e.status !== void 0 ? `put_rejected_${e.status}` : `put_rejected_${e.errorKind}`;
}
//@ chunk-6zwd30tr.js:6816-7476 placement
async function putSyncedFile(e, n, t) {
  let l = L();
  try {
    let put = await apiClient.put(
      "/worker/synced_file",
      {
        path: `${WORKING_FILESTORE_PREFIX}/${e}`,
        content: n.toString("base64"),
        ...(t && { if_match_sha256: t }),
        worker_epoch: env.CLAUDE_CODE_WORKER_EPOCH ?? 0,
      },
      {
        auth: "session-jwt",
        host: "ccr-session",
        headers: { "anthropic-version": "2023-06-01" },
        timeout: Le,
        validateStatus: (d) => (d >= 200 && d < 300) || d === 409,
        maxBodyLength: Math.ceil((MAX_WORKING_FILE_BYTES * 4) / 3) + 1024,
      },
    );
    if (!put.ok)
      return (
        l.noteSessionTerminalReject(),
        {
          kind: "error",
          message: `put gated: ${put.reason}`,
          retryable: !1,
          errorKind: "gated",
          status: void 0,
          gateReason: put.reason,
        }
      );
    if (put.status === 409) return { kind: "conflict" };
    return { kind: "ok", content_sha256: put.data.content_sha256 };
  } catch (error) {
    return syncedFileError("put", error);
  }
}
//@ chunk-6zwd30tr.js:7476-8164 placement
async function getSyncedFile(e) {
  let n = L();
  try {
    let t = await apiClient.get(
      `/worker/synced_file?path=${encodeURIComponent(`${WORKING_FILESTORE_PREFIX}/${e}`)}`,
      {
        auth: "session-jwt",
        host: "ccr-session",
        headers: { "anthropic-version": "2023-06-01" },
        timeout: Le,
        maxContentLength: Math.ceil((MAX_WORKING_FILE_BYTES * 4) / 3) + 1024,
        validateStatus: (l) => (l >= 200 && l < 300) || l === 404,
      },
    );
    if (!t.ok)
      return (
        n.noteSessionTerminalReject(),
        {
          kind: "error",
          message: `get gated: ${t.reason}`,
          retryable: !1,
          errorKind: "gated",
          status: void 0,
          gateReason: t.reason,
        }
      );
    if (t.status === 404) {
      let safeParse = dt().safeParse(t.data);
      return { kind: "not_found", ...(safeParse.success && { body: safeParse.data.error }) };
    }
    return { kind: "ok", buf: Buffer.from(t.data.content, "base64"), content_sha256: t.data.content_sha256 };
  } catch (error) {
    return syncedFileError("get", error);
  }
}
/**
 * 写入同步目录前校验目标：上级目录不能含反斜杠、真实父目录必须在同步目录内、不能落在忽略路径或被调用方拒绝的路径、目标不能是符号链接。
 */
//@ chunk-6zwd30tr.js:8164-8719 placement
async function assertSafeSyncDest(syncDir, dest, refuses) {
  assertNoBackslashDirs(syncDir, dest);
  let l = await realpath(syncDir),
    s = await realpath(dirname(dest)),
    d = relative(l, s);
  if (fe(d)) {
    let a = Error("dest parent escaped working sync dir");
    throw ((a.code = "WORKING_PARENT_ESCAPE"), a);
  }
  let h = d === "" ? basename(dest) : join(d, basename(dest));
  if (shouldIgnore(h)) {
    let a = Error("dest resolves into an ignored path");
    throw ((a.code = "WORKING_DEST_IGNORED"), a);
  }
  if (refuses?.(h)) {
    let a = Error("dest resolves onto a path the caller refuses");
    throw ((a.code = "WORKING_DEST_REFUSED"), a);
  }
  try {
    if ((await lstat(dest)).isSymbolicLink()) {
      let c = Error("dest is a symlink");
      throw ((c.code = "WORKING_DEST_SYMLINK"), c);
    }
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
//@ chunk-6zwd30tr.js:8719-8866 placement
function assertNoBackslashDirs(e, n) {
  if (rc(e) || rc(dirname(n))) {
    let t = Error("a folder on the way to dest has a backslash in its name");
    throw ((t.code = "WORKING_PATH_MISREAD"), t);
  }
}
//@ chunk-6zwd30tr.js:8866-9773 placement
async function writeUnderSyncDir(e, n, t, l = "replace", s) {
  (assertNoBackslashDirs(e, n),
    await mkdir(e).catch((c) => {
      if (getErrnoCode(c) !== "EEXIST") throw c;
    }));
  let d = await realpath(e),
    h = dirname(n);
  for (;;)
    try {
      let c = await realpath(h),
        y = relative(d, c);
      if (fe(y)) {
        let w = Error("dest ancestor escaped working sync dir");
        throw ((w.code = "WORKING_PARENT_ESCAPE"), w);
      }
      if (shouldIgnore(y)) {
        let w = Error("dest ancestor resolves into an ignored path");
        throw ((w.code = "WORKING_DEST_IGNORED"), w);
      }
      if (s?.(join(y, relative(h, n))) === !0) {
        let w = Error("dest resolves onto a path the caller refuses");
        throw ((w.code = "WORKING_DEST_REFUSED"), w);
      }
      break;
    } catch (error) {
      if (!isENOENT(error)) throw error;
      let y = dirname(h);
      if (y === h) break;
      h = y;
    }
  (await mkdir(dirname(n), { recursive: !0 }), await assertSafeSyncDest(e, n, s));
  let a = `${n}.${process.hrtime.bigint().toString(36)}.tmp`;
  try {
    await assertPathSafeAsync(a);
  } catch (error) {
    throw (tempNameTaken(error), error);
  }
  try {
    await writeFile(a, t, { mode: x0r, flag: "wx" });
  } catch (error) {
    throw (tempNameTaken(error), await unlink(a).catch(() => {}), error);
  }
  try {
    if (l === "create_only") (await link(a, n), await unlink(a));
    else await rename(a, n);
  } catch (error) {
    throw (await unlink(a).catch(() => {}), error);
  }
}
//@ chunk-6zwd30tr.js:9773-9910 placement
function tempNameTaken(e) {
  if (getErrnoCode(e) !== "EEXIST") return;
  let n = Error("sibling tempfile name already taken", { cause: e });
  throw ((n.code = "WORKING_TMP_TAKEN"), n);
}
//@ chunk-6zwd30tr.js:9910-12804 placement
async function stageSyncedFile(e, n, t) {
  let l;
  try {
    l = relUnderSyncDir(t, e.mount_path);
  } catch (error) {
    return (
      logFeatureBad("ccr_synced_file_stage", "bad_mount_path"),
      { ok: !1, error: error instanceof Error ? error.message : String(error) }
    );
  }
  if (isSeedPath(l)) return (qyt.emit(l, "stored"), { ok: !0, noop: "dir_sync_lane_row" });
  if (shouldIgnore(l))
    return (
      logFeatureBad("ccr_synced_file_stage", "ignored_path"),
      { ok: !1, error: "mount_path is an ignored path" }
    );
  let s = join(t, l);
  return runInFlight(l, async () => {
    let d, h;
    try {
      try {
        await assertSafeSyncDest(t, s);
      } catch (error) {
        if (!isENOENT(error))
          return (
            logFeatureBad(
              "ccr_synced_file_stage",
              getErrnoCode(error) === "WORKING_PATH_MISREAD" ? "backslash_in_path" : "containment_failed",
            ),
            { ok: !1, error: `mount_path failed containment: ${getErrnoCode(error) ?? "unknown"}` }
          );
      }
      let a = null;
      try {
        let r = await open(s, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await r.stat();
          if (stats.isFile()) {
            if (stats.size > MAX_WORKING_FILE_BYTES)
              return (
                logFeatureBad("ccr_synced_file_stage", "too_large"),
                { ok: !1, error: "local file too large to reconcile" }
              );
            a = await r.readFile();
          }
        } finally {
          await r.close();
        }
      } catch (error) {
        let _ = getErrnoCode(error);
        if (_ !== "ENOENT" && _ !== "ELOOP" && _ !== "EMLINK") throw error;
      }
      let c = a ? computeContentHash(a) : void 0,
        y = Ee(s);
      if (c && y && y.localHash === c && e.content_sha256 !== void 0 && y.etag === e.content_sha256)
        return (logFeatureOk("ccr_synced_file_stage"), { ok: !0, noop: "already_present" });
      let w = e.expected_local_sha256 || void 0,
        O = y && y.localHash === c && (w === void 0 || y.etag === w);
      if (a && !O) {
        let r = await putSyncedFile(l, a, w);
        if (r.kind === "error")
          return (logFeatureBad("ccr_synced_file_stage", "push_failed"), { ok: !1, error: r.message });
        let _ = await getSyncedFile(l);
        if (_.kind !== "ok")
          return (
            logFeatureBad("ccr_synced_file_stage", "reget_failed"),
            { ok: !1, error: _.kind === "error" ? _.message : "get not_found after put" }
          );
        ((d = _.buf),
          (h = _.content_sha256),
          logForDiagnosticsNoPII("info", "working_stage_reconciled", { conflict: r.kind === "conflict" }));
      } else {
        let r = await n(e.filestore_path);
        if (!r.ok)
          return (logFeatureBad("ccr_synced_file_stage", "fetch_failed"), { ok: !1, error: r.error });
        if (r.buf.length > MAX_WORKING_FILE_BYTES)
          return (
            logFeatureBad("ccr_synced_file_stage", "too_large"),
            { ok: !1, error: "staged content too large" }
          );
        ((d = r.buf), (h = e.content_sha256));
      }
      let R = null;
      try {
        let r = await open(s, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await r.stat();
          if (stats.isFile()) {
            if (stats.size > MAX_WORKING_FILE_BYTES)
              return (
                logFeatureBad("ccr_synced_file_stage", "too_large"),
                { ok: !1, error: "local file too large to reconcile" }
              );
            R = await r.readFile();
          }
        } finally {
          await r.close();
        }
      } catch (error) {
        let _ = getErrnoCode(error);
        if (_ !== "ENOENT" && _ !== "ELOOP" && _ !== "EMLINK") throw error;
      }
      if (R && computeContentHash(R) !== c) {
        let r = await putSyncedFile(l, R, h);
        if (r.kind === "error")
          return (logFeatureBad("ccr_synced_file_stage", "push_failed"), { ok: !1, error: r.message });
        let _ = await getSyncedFile(l);
        if (_.kind !== "ok")
          return (
            logFeatureBad("ccr_synced_file_stage", "reget_failed"),
            { ok: !1, error: _.kind === "error" ? _.message : "get not_found after put" }
          );
        ((d = _.buf),
          (h = _.content_sha256),
          logForDiagnosticsNoPII("info", "working_stage_reconciled", {
            conflict: r.kind === "conflict",
            mid_window: !0,
          }));
      }
    } catch (error) {
      return (
        logFeatureBad("ccr_synced_file_stage", "reconcile_threw"),
        { ok: !1, error: `reconcile failed: ${getErrnoCode(error) ?? "unknown"}` }
      );
    }
    try {
      await writeUnderSyncDir(t, s, d);
    } catch (error) {
      return (
        logFeatureBad("ccr_synced_file_stage", "write_failed"),
        { ok: !1, error: `write failed: ${getErrnoCode(error) ?? "unknown"}` }
      );
    }
    return (
      Z(s, h, computeContentHash(d)),
      logFeatureOk("ccr_synced_file_stage"),
      logForDiagnosticsNoPII("info", "working_stage_ok", { bytes: d.length }),
      { ok: !0 }
    );
  });
}
/**
 * 把同步目录中的一个文件推到云端：跳过保留路径、暂停中的、反斜杠或越界符号链接、过大文件；内容未变跳过；首次时先取远端版本（远端胜出则写回本地）；PUT 带 etag，冲突时重新取远端覆盖本地；记录各种结果遥测，返回是否已处理完毕。
 */
//@ chunk-6zwd30tr.js:12804-15354 placement
async function pushSyncedFile(syncDir, relPath) {
  let t = L();
  if (isSeedPath(relPath)) return (logFeatureSad("ccr_synced_file_push", "lane_path_reserved"), !0);
  let l = t.terminalRejects.get(relPath);
  if (l !== void 0 && l.latchedUntilMs !== 0) {
    if (Date.now() < l.latchedUntilMs) return (l.suppressed++, !0);
    l.latchedUntilMs = 0;
  }
  let s = join(syncDir, relPath);
  if (rc(s)) return (logFeatureSad("ccr_synced_file_push", "backslash_in_path"), !0);
  let d;
  try {
    d = await realpath(s);
  } catch (error) {
    if (isENOENT(error)) return !0;
    throw error;
  }
  let h;
  try {
    h = await realpath(syncDir);
  } catch {
    return !1;
  }
  let a = relative(h, d);
  if (a !== relPath && (a === "" || fe(a)))
    return (logFeatureSad("ccr_synced_file_push", "symlink_escape"), !0);
  let c;
  try {
    let S = await open(s, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      let stats = await S.stat();
      if (!stats.isFile()) return !0;
      if (stats.size > MAX_WORKING_FILE_BYTES)
        return (logFeatureSad("ccr_synced_file_push", "too_large"), !0);
      c = await S.readFile();
    } finally {
      await S.close();
    }
  } catch (error) {
    let M = getErrnoCode(error);
    if (M === "ELOOP" || M === "EMLINK") return (logFeatureSad("ccr_synced_file_push", "symlink_escape"), !0);
    return (logFeatureBad("ccr_synced_file_push", "read_failed"), !1);
  }
  let y = computeContentHash(c),
    w = Ee(s);
  if (y === w?.localHash) return !0;
  let O = w === void 0 ? t.evictedEtag.get(s) : void 0,
    R = "open";
  if (w === void 0 && O === void 0) {
    let S = await getSyncedFile(relPath);
    if (S.kind === "error") {
      if ((logFeatureBad("ccr_synced_file_push", "seed_get_failed"), !S.retryable))
        t.recordTerminalReject(relPath);
      return !S.retryable;
    }
    if (S.kind === "ok") {
      t.resetTerminalRejectStreak(relPath);
      let M = computeContentHash(S.buf);
      if (M === y) return (Z(s, S.content_sha256, y), !0);
      try {
        await writeUnderSyncDir(syncDir, s, S.buf);
      } catch {
        return (logFeatureBad("ccr_synced_file_push", "write_failed"), !1);
      }
      return (Z(s, S.content_sha256, M), logFeatureSad("ccr_synced_file_push", "cold_renderer_wins"), !0);
    }
    if (((R = t.sessionFullGate()), R === "skip")) return (t.recordTerminalReject(relPath, !0), !0);
  }
  let r = await putSyncedFile(relPath, c, w?.etag ?? O);
  if (R === "probe") {
    if (r.kind === "ok") t.clearSessionFull();
    else if (r.kind === "conflict" || r.laneReason !== SYNCED_FILE_LIMIT_EXCEEDED) t.sessionFullReprobeNow();
  }
  if (r.kind === "ok")
    return (
      t.resetTerminalRejectStreak(relPath),
      Z(s, r.content_sha256, y),
      logFeatureOk("ccr_synced_file_push"),
      !0
    );
  if (r.kind === "error") {
    if (r.retryable)
      (t.resetTerminalRejectStreak(relPath), logFeatureBad("ccr_synced_file_push", "put_failed"));
    else {
      logFeatureBad("ccr_synced_file_push", putRejectionReason(r));
      let S = r.laneReason === SYNCED_FILE_LIMIT_EXCEEDED;
      if ((t.recordTerminalReject(relPath, S), S)) t.recordSessionFull();
    }
    return (
      logForDiagnosticsNoPII("warn", "working_push_failed", { reason: r.message, retryable: r.retryable }),
      !r.retryable
    );
  }
  t.resetTerminalRejectStreak(relPath);
  let _ = await getSyncedFile(relPath);
  if (_.kind === "error") {
    if ((logFeatureBad("ccr_synced_file_push", "reget_failed"), !_.retryable))
      t.recordTerminalReject(relPath);
    return !_.retryable;
  }
  if (_.kind === "not_found")
    return (
      t.forgetSeen(s),
      t.sessionFullReprobeNow(),
      logFeatureBad("ccr_synced_file_push", "reget_failed"),
      !1
    );
  try {
    await writeUnderSyncDir(syncDir, s, _.buf);
  } catch {
    return (logFeatureBad("ccr_synced_file_push", "write_failed"), !1);
  }
  return (
    Z(s, _.content_sha256, computeContentHash(_.buf)),
    logFeatureSad("ccr_synced_file_push", "conflict_overwritten"),
    !0
  );
}
//@ chunk-6zwd30tr.js:15354-15388 placement
function flushSyncedFiles() {
  return L().flush();
}
//@ chunk-6zwd30tr.js:15388-15577 placement
async function drainSyncedFiles() {
  let e = L();
  await flushSyncedFiles();
  for (;;) {
    if (e.inFlight.size === 0 && (e.activeSyncer?.pendingCount() ?? 0) === 0) return;
    (await e.inFlight.settle(), await new Promise((n) => setImmediate(n)));
  }
}
//@ chunk-6zwd30tr.js:15577-20123 placement
async function startSyncedFileSyncer(
  e,
  n = getPlatform() === "linux" && !env.CLAUDE_CODE_DISABLE_WORKING_SYNC_WATCH ? watch : null,
) {
  let t = L();
  t.armLateStart(null);
  for (let E = 1; ; E++)
    try {
      await mkdir(e);
      break;
    } catch (error) {
      let v = getErrnoCode(error);
      if (v === "EEXIST") break;
      if (v === "ENOENT") {
        if (E < st) {
          await sleep(ot);
          continue;
        }
        return (logForDiagnosticsNoPII("info", "working_sync_parent_absent", {}), t.armLateStart(e), null);
      }
      return (
        logFeatureSad("ccr_synced_file_push", "sync_start_failed"),
        logForDiagnosticsNoPII("warn", "working_sync_start_failed", { code: v ?? "unknown" }),
        null
      );
    }
  let l = 0,
    s = [],
    d = () => (l < Ze ? (l++, Promise.resolve()) : new Promise((E) => s.push(E))),
    h = () => {
      let E = s.shift();
      if (E) E();
      else l--;
    },
    a = new Set(),
    c = !1,
    y = !1,
    w = 0,
    O = 0,
    R = n,
    r,
    _ = 0,
    S = 0,
    M = !1,
    ne,
    oe = new Set(),
    ie = 0,
    K = !1,
    Te = new Set(),
    G = (E, x, v = {}) => {
      let joined = [x, ...Object.values(v)].join(" ");
      if (!c && !Te.has(joined)) (Te.add(joined), logForDiagnosticsNoPII(E, x, v));
    },
    H,
    now = Date.now(),
    pe = (E) => {
      (clearInterval(H), (H = setInterval(Oe, E)), H.unref?.());
    },
    Be = () => {
      (pe(Q), Oe());
    },
    D = () => {
      if ((r?.close(), (r = void 0), K))
        ((K = !1), clearInterval(H), (H = setTimeout(Be, Q - (Math.abs(Date.now() - now) % Q))), H.unref?.());
    },
    Ce = () => {
      (logForDiagnosticsNoPII("warn", "working_sync_watch_errored", {}), (R = null), D());
    },
    Ue = async (E) => {
      ie++;
      let x = [],
        v = {
          close: () => {
            for (let F of x) F.close();
          },
        },
        A = () => r === v,
        ae = (F, P, j) => {
          x.push(
            E(P, { persistent: !1 }, (ye, q) => {
              if (!A() || !j(q)) return;
              if (!(ye === "change" && q === basename(e) && oe.delete(F))) D();
            }),
          );
        };
      try {
        (ae("root", e, () => !0),
          ae(
            "parent",
            dirname(e),
            (F) => typeof F !== "string" || F === "" || F === basename(e) || F === basename(dirname(e)),
          ));
      } catch (error) {
        (v.close(),
          G("warn", "working_sync_watch_open_failed", {
            code: getErrnoCode(error) ?? "unknown",
            watch: x.length === 0 ? "root" : "parent",
          }));
        return;
      }
      ((r = v), (S = _), (ne = void 0), (oe = new Set(["root", "parent"])), (M = !0));
      let le = "parent";
      try {
        for (let P of x)
          P.on("error", () => {
            if (A()) Ce();
          });
        if ((await lstat(dirname(e))).isSymbolicLink())
          (G("info", "working_sync_watch_test_skipped", { code: "parent_is_link" }), (R = null), D());
        if (!A()) return;
        le = "root";
        let F = await open(e, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
        try {
          let { mode: mode, gid: gid } = await F.stat();
          if ((mode & 1024) !== 0 && gid !== process.getegid?.() && !process.getgroups?.().includes(gid))
            (G("info", "working_sync_watch_test_skipped", { code: "setgid_folder" }), D());
          else if (A()) await F.chmod(mode & 4095);
        } finally {
          await F.close();
        }
        ne = Date.now();
      } catch (error) {
        (G("warn", "working_sync_watch_test_failed", { code: getErrnoCode(error) ?? "unknown", watch: le }),
          D());
      } finally {
        M = !1;
      }
    },
    Ke = async () => {
      let E = [],
        x = [""],
        v = new Set(),
        A = [...t.seenState.keys()],
        { transportFailureSeq: transportFailureSeq, sessionTerminalRejectSeq: sessionTerminalRejectSeq } = t,
        F = ++_,
        P = !1,
        j = !1,
        ye = 0,
        q = !1,
        ce = !1;
      e: while (x.length && !c) {
        let Y = x.shift(),
          N;
        try {
          N = await readdir(join(e, Y), { withFileTypes: !0 });
        } catch (error) {
          (logForDiagnosticsNoPII("warn", "working_scan_readdir_failed", {
            code: getErrnoCode(error) ?? "unknown",
          }),
            (ce = !0));
          continue;
        }
        for (let X of N) {
          if (++ye > We) {
            if (((q = !0), !y)) (logFeatureSad("ccr_synced_file_push", "scan_cap_reached"), (y = !0));
            break e;
          }
          let b = Y ? join(Y, X.name) : X.name;
          if ((v.add(b), shouldIgnore(b) || isSeedPath(b))) continue;
          if (X.isDirectory()) {
            ((j = !0), x.push(b));
            continue;
          }
          if (!X.isFile()) continue;
          P = !0;
          let we;
          try {
            we = (await lstat(join(e, b))).mtimeMs;
          } catch {
            continue;
          }
          let me = t.terminalRejects.get(b);
          if (me !== void 0 && me.latchedUntilMs !== 0 && Date.now() >= me.latchedUntilMs)
            t.reopenMtimeGate(b);
          if ((t.releaseSessionFullHold(b), we === t.lastSeenMtime.get(b))) continue;
          if (a.has(b) || t.inFlight.has(b)) continue;
          (a.add(b),
            E.push(
              (async () => {
                await d();
                try {
                  if (await runInFlight(b, () => pushSyncedFile(e, b))) t.recordSettledMtime(b, we);
                } finally {
                  (a.delete(b), h());
                }
              })().catch((ze) =>
                logForDiagnosticsNoPII("warn", "working_push_threw", { code: getErrnoCode(ze) ?? "unknown" }),
              ),
            ));
        }
      }
      if (!q && !ce && !c) {
        for (let N of t.lastSeenMtime.keys()) if (!v.has(N)) t.reopenMtimeGate(N);
        for (let N of t.terminalRejects.keys()) if (!v.has(N)) t.forgetTerminalReject(N);
        let Y = e.endsWith(sep) ? e : e + sep;
        for (let N of A) if (N.startsWith(Y) && !v.has(relative(e, N))) t.evictDeleted(N);
      }
      if (q || ce || c || P || j || t.inFlight.size > 0 || R === null) {
        if (P || j) ie = 0;
        if (K && (P || j)) {
          let Y = await stat(e).then(
            (N) => N.mtimeMs,
            () => Date.now(),
          );
          if (K && F > S && Date.now() - Y > Ne)
            (logForDiagnosticsNoPII("warn", "working_sync_watch_missed_change", {}), (R = null));
        }
        D();
      } else if (r === void 0) {
        if (ie >= tt) G("warn", "working_sync_watch_attempts_used_up");
        else if (!M) Ue(R);
      } else if (oe.size > 0) {
        if (ne !== void 0 && Date.now() - ne > Ne)
          (G("warn", "working_sync_watch_test_unheard", { watch: [...oe].join("+") }), (R = null), D());
      } else if (F > S && !K) ((K = !0), (ie = 0), pe(et), G("info", "working_sync_waiting_for_file_events"));
      if (
        (await Promise.allSettled(E),
        t.transportFailureSeq > transportFailureSeq || t.sessionTerminalRejectSeq > sessionTerminalRejectSeq)
      )
        ((w = w === 0 ? 2 * Q : Math.min(w * 2, nt)), (O = Date.now() + w));
      else if (a.size === 0) ((w = 0), (O = 0));
    },
    _e = 0,
    he = async () => {
      _e++;
      try {
        await Ke();
      } finally {
        _e--;
      }
    },
    Oe = () => {
      if (_e > 0 || Date.now() < O) return;
      he().catch((E) =>
        logForDiagnosticsNoPII("warn", "working_push_threw", { code: getErrnoCode(E) ?? "unknown" }),
      );
    },
    Ge = he();
  (pe(Q), logForDiagnosticsNoPII("info", "working_sync_started", {}));
  let ge = {
    initialReconcile: Ge,
    flush: he,
    pendingCount: () => a.size,
    pollBackoffUntilForTest: () => O,
    reliesOnRootWatchForTest: () => K,
    hasTestedRootWatchForTest: () => ne !== void 0,
    stop() {
      ((c = !0), D(), clearInterval(H), t.syncerStopped(ge));
    },
  };
  return (t.syncerStarted(ge), ge);
}
//@ chunk-6zwd30tr.js:20123-20247 placement
async function readLaneRowFromWorker(e) {
  if (isSeedPath(e))
    return {
      kind: "error",
      message: DIR_SYNC_LANE_RESERVED,
      retryable: !1,
      errorKind: "other",
      status: void 0,
    };
  return getSyncedFile(e);
}
//@ chunk-6zwd30tr.js:20247-21626 placement
async function writeLaneRowFromWorker(e, n, t, l) {
  let s = L();
  if (isSeedPath(n)) return { ok: !1, reason: "put_failed", error: DIR_SYNC_LANE_RESERVED, retryable: !1 };
  if (t.length > MAX_WORKING_FILE_BYTES) return { ok: !1, reason: "too_large", error: "content too large" };
  if (l !== void 0 && l.length === 0)
    return { ok: !1, reason: "put_failed", error: "empty if_match", retryable: !1 };
  return runInFlight(n, async () => {
    let d = await putSyncedFile(n, t, l);
    if (d.kind === "conflict") {
      if (l !== void 0)
        return { ok: !1, reason: "conflict", error: "lane row changed since if_match", retryable: !1 };
      return { ok: !1, reason: "put_failed", error: "put rejected (409 without if_match)", retryable: !0 };
    }
    if (d.kind === "error") return { ok: !1, reason: "put_failed", error: d.message, retryable: d.retryable };
    if (!shouldIgnore(n)) {
      let h = join(e, n),
        a = Ee(h),
        c = !1;
      try {
        await assertSafeSyncDest(e, h);
        let y = await open(h, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          let stats = await y.stat();
          if (stats.isFile() && stats.size <= MAX_WORKING_FILE_BYTES && a !== void 0) {
            let O = Number(stats.size),
              allocUnsafe = Buffer.allocUnsafe(O + 1),
              r = 0;
            for (;;) {
              let { bytesRead: bytesRead } = await y.read(allocUnsafe, r, O + 1 - r, r);
              if (bytesRead === 0) break;
              if (((r += bytesRead), r > O)) break;
            }
            c = r <= O && a.localHash === computeContentHash(allocUnsafe.subarray(0, r));
          }
        } finally {
          await y.close();
        }
      } catch (error) {
        c = isENOENT(error);
      }
      if (!c)
        return (
          s.recordEvictedEtag(h, d.content_sha256),
          logForDiagnosticsNoPII("info", "worker_lane_mirror_skipped"),
          { ok: !0, etag: d.content_sha256 }
        );
      try {
        await writeUnderSyncDir(e, h, t);
      } catch (error) {
        return (
          s.recordEvictedEtag(h, d.content_sha256),
          logForDiagnosticsNoPII("warn", "worker_lane_mirror_skipped", {
            code: getErrnoCode(error) ?? "unknown",
          }),
          { ok: !0, etag: d.content_sha256 }
        );
      }
      Z(h, d.content_sha256, computeContentHash(t));
    }
    return { ok: !0, etag: d.content_sha256 };
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
  x0r,
  writeUnderSyncDir,
};
