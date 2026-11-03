/**
 * utils/stageFile.ts
 *
 * 2.1.316 新增。stage_file：把 filestore 文件暂存到 /uploads 或 /outputs。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rqpqwy1q.js (43)
 * attribution: placement 43
 */
import { lstat, lstat as lstat_2, readdir, stat, unlink, mkdir, realpath, chmod, rename } from "fs/promises";
import { posix } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { ge } from "./identity.js";
import { getErrnoCode, classifyAxiosError, isMaxContentLengthError } from "./errors.js";
import { openRegularFileForRead, readHandleBounded } from "./fsSafety/boundOpen.js";
import {
  getStageFileRoot,
  getOutputsRoot,
  getHomeFilesRoot,
  STAGE_FILE_HOME_MOUNT_PREFIX,
  STAGE_TMP_PREFIX,
  STAGE_FILE_MOUNT_PREFIX,
  STAGE_FILE_OUTPUTS_MOUNT_PREFIX,
  isAtOrUnderRoot,
} from "./stageFileRoots.js";
import { isClaudeAiChatOrigin } from "./entrypointKinds.js";
import { S1 } from "./userDataRoots.js";
import { env } from "./env.js";
import { homePathProblem, checkHomeTarget, publishHomeFile } from "./filePersistence/homeFilePublish.js";
import { rc } from "./pathClassification.js";
import { computeContentHash } from "./commitAttribution.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import {
  SAME_STANDING_MAX_BYTES,
  storeCheckPaused,
  askStoreWhatItHolds,
  pauseStoreCheck,
  STORE_CHECK_PAUSE_MS,
  hashStandingFile,
  sameFileUntouched,
} from "./stageFileStoreCheck.js";
import { fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { sleep } from "./sleep.js";
import { kgr, zki, apiClient } from "../services/routines/routinesApi.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, A, o } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-rqpqwy1q.js:1299-1340 placement
var Ae = 4096,
  U = ge(new Map(), (e) => e.clear());
//@ chunk-rqpqwy1q.js:1340-1482 placement
function recordStagedWrite(e, t, r) {
  if ((U.delete(e), U.set(e, { written: t, renamedByNs: BigInt(r + 1) * 1000000n }), U.size > Ae)) {
    let [n] = U.keys();
    if (n !== void 0) U.delete(n);
  }
}
/**
 * 已暂存文件的状态码
 */
//@ chunk-rqpqwy1q.js:1482-1698 placement
function stagedFileState(e, t) {
  let r = U.get(e);
  if (r === void 0) return 5;
  let { written: written } = r;
  if (written.ino !== t.ino || written.birthtimeNs !== t.birthtimeNs) return 3;
  if (written.size !== t.size || written.mtimeNs !== t.mtimeNs) return 4;
  return t.ctimeNs <= r.renamedByNs ? 1 : 2;
}
//@ chunk-rqpqwy1q.js:1698-1713 placement
var oe = 1048576;
/**
 * 描述已存在的文件
 */
//@ chunk-rqpqwy1q.js:1713-2379 placement
async function describeExistingFile(e, t, r) {
  let n;
  try {
    let s = await lstat_2(e, { bigint: !0 });
    if (!s.isFile()) return { replaced: "not_a_file" };
    let l = Number(s.mtimeNs / 1000n) / 1000;
    if (
      ((n = {
        bytes: Number(s.size),
        ageSeconds: Math.max(0, Math.round((Date.now() - l) / 1000)),
        readOnly: (Number(s.mode) & 146) === 0,
        vsPlaced: stagedFileState(e, s),
      }),
      n.bytes !== r)
    )
      return { replaced: "different_contents", standing: n };
    if (r > oe) return { replaced: "same_size_not_compared", standing: n };
    let [d, S] = await Promise.all([readSmallFile(e), readSmallFile(t)]);
    if (d === null || S === null) return { replaced: "unknown", standing: n };
    return { replaced: d.equals(S) ? "same_contents" : "different_contents", standing: n };
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? { replaced: "nothing" } : { replaced: "unknown", standing: n };
  }
}
/**
 * 读取小文件
 */
//@ chunk-rqpqwy1q.js:2379-2570 placement
async function readSmallFile(e) {
  let t = await openRegularFileForRead(e);
  try {
    let stats = await t.stat();
    if (!stats.isFile()) return null;
    let n = await readHandleBounded(t, oe, stats.size);
    return n.overLimit ? null : n.bytes;
  } finally {
    await t.close().catch(() => {});
  }
}
//@ chunk-rqpqwy1q.js:2570-2849 placement
var {
    basename: basename,
    dirname: dirname,
    isAbsolute: isAbsolute,
    join: join,
    normalize: normalize,
    relative: relative,
    sep: sep,
  } = posix,
  le = getStageFileRoot(),
  ue = getOutputsRoot(),
  ce = getHomeFilesRoot(),
  Be = 67108864,
  Ee = 30000,
  Le = 16,
  G = 60000,
  He = 500,
  STAGE_PARENT_ESCAPE = "STAGE_PARENT_ESCAPE",
  X = new Set([
    "ENAMETOOLONG",
    "ENOSPC",
    "EDQUOT",
    "EFBIG",
    "EISDIR",
    "ENOTDIR",
    "EINVAL",
    "ELOOP",
    "ENOTEMPTY",
    STAGE_PARENT_ESCAPE,
  ]);
//@ chunk-rqpqwy1q.js:2849-2894 placement
function Z(e) {
  return e < 500 && e !== 408 && e !== 429;
}
//@ chunk-rqpqwy1q.js:2894-3004 placement
function stageFileWireResult(e) {
  return {
    ok: !0,
    ...(e.noop !== void 0 && { noop: e.noop }),
    ...(e.replaced !== void 0 && { replaced: e.replaced }),
  };
}
//@ chunk-rqpqwy1q.js:3004-3109 placement
function getContainedRelativePath(e, t) {
  let r = relative(e, t);
  if (r === "" || r === "." || r.split(sep).includes("..") || isAbsolute(r)) return null;
  return r;
}
/**
 * 校验 mount_path
 */
//@ chunk-rqpqwy1q.js:3109-4095 placement
function parseMountPath(e, t = !1) {
  if (e.includes("\x00")) throw Error("mount_path contains null bytes");
  if (!isAbsolute(e)) throw Error("mount_path must be absolute");
  if (e.split(sep).includes("..")) throw Error('mount_path must not contain ".." segments');
  let r = normalize(e),
    n = getContainedRelativePath(STAGE_FILE_HOME_MOUNT_PREFIX, r);
  if (
    n !== null &&
    isClaudeAiChatOrigin() &&
    S1(t ? "vouched" : env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)
  ) {
    let d = homePathProblem(n);
    if (d !== void 0) throw new HomeWriteRefusedError(d);
    return { dest: join(ce, n), root: ce, readOnly: !1, neverReplace: !0 };
  }
  if (basename(r).startsWith(STAGE_TMP_PREFIX))
    throw Error("mount_path names a reserved temporary-file name");
  let s = getContainedRelativePath(STAGE_FILE_MOUNT_PREFIX, r);
  if (s !== null) return { dest: join(le, s), root: le, readOnly: !0, neverReplace: !1 };
  let l = getContainedRelativePath(STAGE_FILE_OUTPUTS_MOUNT_PREFIX, r);
  if (l !== null) {
    if (!S1(t ? "vouched" : env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)) {
      let d = Error("staging under /outputs/ is only supported on managed remote sessions");
      throw ((d.code = "STAGE_OUTPUTS_UNSUPPORTED_RUNNER"), d);
    }
    return { dest: join(ue, l), root: ue, readOnly: !1, neverReplace: !1 };
  }
  throw Error("mount_path must be under /uploads/ or /outputs/");
}
//@ chunk-rqpqwy1q.js:4095-4235 placement
class HomeWriteRefusedError extends Error {
  refusal;
  constructor(e) {
    super("mount_path names a file that may not be written to the home directory");
    this.refusal = e;
  }
}
//@ chunk-rqpqwy1q.js:4235-4540 placement
function addDirectoryDestFromMountPath(e) {
  let t;
  try {
    t = parseMountPath(e);
  } catch (error) {
    if (getErrnoCode(error) === "STAGE_OUTPUTS_UNSUPPORTED_RUNNER")
      throw Error("add_directory mount_path must be under /uploads/");
    if (!(error instanceof HomeWriteRefusedError)) throw error;
  }
  if (!t?.readOnly)
    throw Error("add_directory mount_path must be under /uploads/ and not under /uploads/.home/");
  return t.dest;
}
//@ chunk-rqpqwy1q.js:4540-4613 placement
function ze(e, t) {
  if (!isAtOrUnderRoot(e, t)) throw Re("dest parent escaped stage root");
}
//@ chunk-rqpqwy1q.js:4613-4717 placement
function assertNoBackslashDirs(e, t) {
  if (rc(e) || rc(dirname(t))) throw Re("a folder on the way to dest has a backslash in its name");
}
//@ chunk-rqpqwy1q.js:4717-4766 placement
function Re(e) {
  let t = Error(e);
  return ((t.code = STAGE_PARENT_ESCAPE), t);
}
//@ chunk-rqpqwy1q.js:4766-4821 placement
function stageTmpStem(e) {
  return `${STAGE_TMP_PREFIX}${computeContentHash(basename(e)).slice(0, 16)}.`;
}
//@ chunk-rqpqwy1q.js:4821-5028 placement
async function sweepStaleStageTmps(e, t) {
  let r = Date.now() - 2 * G,
    n;
  try {
    n = await readdir(e);
  } catch {
    return;
  }
  await Promise.all(
    n
      .filter((s) => s.startsWith(t))
      .map(async (s) => {
        let l = join(e, s);
        try {
          if ((await stat(l)).mtimeMs < r) await unlink(l);
        } catch {}
      }),
  );
}
//@ chunk-rqpqwy1q.js:5028-5103 placement
function je(e, t) {
  return e !== null && e.isFile() && (e.mtimeMs >= t || e.ctimeMs >= t);
}
//@ chunk-rqpqwy1q.js:5103-5173 placement
function fe(e) {
  return typeof e === "object" && e !== null && e.code === "EROFS";
}
/**
 * 请求失败描述
 */
//@ chunk-rqpqwy1q.js:5173-5331 placement
function requestFailure(e, t) {
  let { kind: kind, status: status } = classifyAxiosError(t);
  return {
    kind: kind,
    status: status,
    message: `${e} failed: ${kind}${status ? ` ${status}` : ""}`,
    ...(kind === "http" && status !== void 0 && Z(status) && { permanent: !0 }),
  };
}
/**
 * stage_file：把 filestore 中的文件暂存到 /uploads 或 /outputs，比较已有文件。
 */
//@ chunk-rqpqwy1q.js:5331-7276 placement
async function stageFile(e, t, r = "off", n, s = "off") {
  if (t === void 0 && !env.CLAUDE_CODE_REMOTE_SESSION_ID)
    return { ok: !1, error: "CLAUDE_CODE_REMOTE_SESSION_ID unset", permanent: !0 };
  if (t !== void 0 && e.filestore_path) return { ok: !1, error: "synced documents are not staged here" };
  if (e.filestore_path) {
    if (env.CLAUDE_CODE_ENVIRONMENT_KIND !== void 0)
      return (
        logFeatureBad("ccr_synced_file_stage", "unsupported_runner_kind"),
        logEvent("tengu_stage_file_completed", {
          ok: !1,
          synced_unsupported_runner_kind: !0,
          duration_ms: 0,
        }),
        { ok: !1, error: "synced-file staging not supported on this runner kind" }
      );
    let { stageSyncedFile: stageSyncedFile, SYNCED_FILE_ROOT: SYNCED_FILE_ROOT } =
      await import("./chunk-2s3tfbmy.js");
    return stageSyncedFile(
      {
        mount_path: e.mount_path,
        filestore_path: e.filestore_path,
        content_sha256: e.content_sha256,
        expected_local_sha256: e.expected_local_sha256,
      },
      fetchFilestoreBytes,
      SYNCED_FILE_ROOT,
    );
  }
  let l;
  try {
    l = parseMountPath(e.mount_path, t !== void 0);
  } catch (error) {
    if (getErrnoCode(error) === "STAGE_OUTPUTS_UNSUPPORTED_RUNNER")
      (logFeatureBad("ccr_stage_file_outputs", "unsupported_runner_kind"),
        logEvent("tengu_stage_file_completed", {
          ok: !1,
          outputs_unsupported_runner_kind: !0,
          duration_ms: 0,
        }));
    if (error instanceof HomeWriteRefusedError)
      return (logHomeStage("refused_name", { refusal: error.refusal }), { ok: !0, noop: "refused_name" });
    return { ok: !1, error: error instanceof Error ? error.message : String(error), permanent: !0 };
  }
  if (l.neverReplace && r === "off")
    return (logHomeStage("home_files_off", {}), { ok: !0, noop: "home_files_off" });
  if (l.neverReplace && e.resync !== void 0)
    return (logHomeStage("resent_announcement", {}), { ok: !0, noop: "resent_announcement" });
  if (l.neverReplace && e.force !== !1)
    return (logHomeStage("unchecked_announcement", {}), { ok: !0, noop: "unchecked_announcement" });
  if (l.neverReplace && r === "not_loaded")
    return (logHomeStage("flag_not_loaded", {}), { ok: !1, error: "the flag for home files has not loaded" });
  let d = l.readOnly ? {} : { outputPath: l.dest };
  if (!e.force && !l.neverReplace)
    try {
      if ((await stat(l.dest)).isFile())
        return (
          logForDiagnosticsNoPII("debug", "stage_file_noop_already_present", {}),
          logEvent("tengu_stage_file_completed", { ok: !0, noop_already_present: !0, duration_ms: 0 }),
          { ok: !0, noop: "already_present", ...d }
        );
    } catch {}
  let now = Date.now();
  return runStageForRoot(e.mount_path, l, now, t, Ze(e, n), e.force === !0 ? s : "off");
}
//@ chunk-rqpqwy1q.js:7276-7310 placement
var _e = ge(new Map(), (e) => e.clear());
//@ chunk-rqpqwy1q.js:7310-7421 placement
function runStageForRoot(e, t, r, n, s, l) {
  let d = _e.get(t.root);
  if (d === void 0) ((d = limitConcurrency(Le, Ve)), _e.set(t.root, d));
  return d(e, t, r, n, s, l);
}
//@ chunk-rqpqwy1q.js:7421-7497 placement
function Ve(...e) {
  let [t, r, n, s] = e;
  return r.neverReplace ? stageToHome(t, r, n, s) : stageToRoot(...e);
}
/**
 * 与存储副本比较
 */
//@ chunk-rqpqwy1q.js:7497-8769 placement
async function compareWithStore(e, t, r) {
  let startTime = performance.now();
  if (t === void 0 || !t.isFile() || t.nlink !== 1n || t.size > BigInt(SAME_STANDING_MAX_BYTES)) return;
  if (storeCheckPaused())
    return {
      compared: {
        storeAnswer: "not_asked_while_paused",
        verdict: "no_size_and_md5_from_store",
        checkMs: 0,
        bytes: Number(t.size),
        hashMayHaveChangedAtime: !1,
      },
    };
  let s = await ee();
  if (!s.ok) return { minted: s };
  let l = await askStoreWhatItHolds(s.cred, r),
    d,
    S = !1;
  if (l.answer !== "size_and_md5") {
    if (((d = "no_size_and_md5_from_store"), l.answer === "credential_refused" || l.answer === "not_sent"))
      pauseStoreCheck(l.answer, 1 / 0);
    else if (
      l.answer === "timed_out" ||
      l.answer === "credential_expired" ||
      l.answer === "request_error" ||
      l.answer === "other_http_status"
    )
      pauseStoreCheck(l.answer, STORE_CHECK_PAUSE_MS);
  } else if (BigInt(l.size) !== t.size) d = "size_differs";
  else if ((Number(t.mode) & 4095) !== 292) d = "local_file_mode_not_0444";
  else {
    let h = await hashStandingFile(e, t);
    if (typeof h === "string") {
      if (
        ((d =
          h === "timed_out"
            ? "local_file_hash_timed_out"
            : h === "changed"
              ? "local_file_changed"
              : "local_file_unreadable"),
        h === "timed_out")
      )
        pauseStoreCheck("local_file_hash_timed_out", 1 / 0);
    } else {
      S = !h.withNoAtime;
      let y = await lstat(e, { bigint: !0 }).catch(() => {
        return;
      });
      d =
        y === void 0 || !sameFileUntouched(h.opened, y)
          ? "local_file_changed"
          : h.md5 === l.md5
            ? "same_contents"
            : "md5_differs";
    }
  }
  return {
    minted: s,
    compared: {
      storeAnswer: l.answer,
      verdict: d,
      checkMs: Math.round(performance.now() - startTime),
      bytes: Number(t.size),
      hashMayHaveChangedAtime: S,
    },
  };
}
/**
 * 暂存到挂载根
 */
//@ chunk-rqpqwy1q.js:8769-12750 placement
async function stageToRoot(e, { dest: dest, root: root, readOnly: readOnly }, s, l, d, S) {
  let startTime = performance.now(),
    max = Math.max(0, Date.now() - s),
    c = () => Math.round(performance.now() - startTime),
    F = d !== void 0,
    w = readOnly && !F && !env.CLAUDE_STAGE_FILE_ROOT,
    E = F ? { in_place: !0 } : {},
    _ = stageTmpStem(dest),
    b,
    R = join(dirname(dest), `${_}${Date.now()}.${Math.random().toString(36).slice(2)}`);
  try {
    (assertNoBackslashDirs(root, dest), await mkdir(dirname(dest), { recursive: !0 }));
    let P = await realpath(root),
      D = await realpath(dirname(dest));
    (ze(P, D),
      (b = await lstat(dest, { bigint: !0 }).catch((te) => {
        if (getErrnoCode(te) === "ENAMETOOLONG") throw te;
        return;
      })),
      await sweepStaleStageTmps(dirname(dest), _));
  } catch (error) {
    let D = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
    if (w && fe(error))
      return (
        logEvent("tengu_stage_file_completed", {
          ok: !0,
          noop: !0,
          duration_ms: c(),
          queued_ms: max,
          bytes: 0,
        }),
        logForDiagnosticsNoPII("debug", "stage_file_noop_readonly_mount", { duration_ms: c() }),
        { ok: !0, noop: "readonly_mount" }
      );
    if (
      (logEvent("tengu_stage_file_completed", { ok: !1, duration_ms: c(), queued_ms: max, ...E }),
      logForDiagnosticsNoPII("warn", "stage_file_mkdir_failed", {
        code: D,
        duration_ms: c(),
        queued_ms: max,
      }),
      !readOnly)
    )
      logFeatureBad("ccr_stage_file_outputs", "mkdir_failed");
    return { ok: !1, error: `mkdir failed: ${D}`, ...(X.has(D) && { permanent: !0 }) };
  }
  let O = S !== "off" && readOnly && !F && l === void 0 ? await compareWithStore(dest, b, e) : void 0,
    T = O?.compared,
    I =
      T === void 0
        ? {}
        : {
            store_check_mode: fromEnumOpt(S),
            store_check_answer: fromEnumOpt(T.storeAnswer),
            store_check_verdict: fromEnumOpt(T.verdict),
            store_check_ms: T.checkMs,
          };
  if (S === "on" && T?.verdict === "same_contents") {
    let P = T.hashMayHaveChangedAtime ? { store_check_may_have_changed_atime: !0 } : {};
    return (
      logEvent("tengu_stage_file_completed", {
        ok: !0,
        noop: !0,
        noop_already_present: !0,
        duration_ms: c(),
        queued_ms: max,
        bytes: 0,
        replaced: fromEnumOpt("same_contents"),
        download_skipped_bytes: T.bytes,
        ...I,
        ...P,
      }),
      logForDiagnosticsNoPII("info", "stage_file_noop_matches_store", {
        duration_ms: c(),
        queued_ms: max,
        download_skipped_bytes: T.bytes,
        store_check_ms: T.checkMs,
        ...P,
      }),
      { ok: !0, noop: "already_present", replaced: "same_contents" }
    );
  }
  let M = await withFilestoreCredential(e, R, l, d, O?.minted);
  if (!M.ok) {
    if ((await unlink(R).catch(() => {}), w && M.errno === "EROFS"))
      return (
        logEvent("tengu_stage_file_completed", {
          ok: !0,
          noop: !0,
          duration_ms: c(),
          queued_ms: max,
          bytes: 0,
        }),
        logForDiagnosticsNoPII("debug", "stage_file_noop_readonly_mount", { duration_ms: c() }),
        { ok: !0, noop: "readonly_mount" }
      );
    if (
      (logEvent("tengu_stage_file_completed", {
        ok: !1,
        gated: M.gated,
        duration_ms: c(),
        queued_ms: max,
        ...E,
      }),
      !readOnly)
    )
      logFeatureBad("ccr_stage_file_outputs", "fetch_failed");
    return {
      ok: !1,
      error: M.error,
      ...((M.permanent === !0 || M.gated === !0 || (M.errno !== void 0 && X.has(M.errno))) && {
        permanent: !0,
      }),
    };
  }
  let bytes = M.bytes,
    z = c(),
    { replaced: replaced, standing: standing } = readOnly ? await describeExistingFile(dest, R, bytes) : {};
  try {
    if (!readOnly) {
      let P = await stat(dest).catch(() => null);
      if (je(P, s))
        return (
          await unlink(R).catch(() => {}),
          logEvent("tengu_stage_file_completed", {
            ok: !0,
            noop: !0,
            duration_ms: c(),
            queued_ms: max,
            bytes: 0,
            outputs_root: !0,
          }),
          logForDiagnosticsNoPII("info", "stage_file_noop_newer_local", { duration_ms: c() }),
          logFeatureOk("ccr_stage_file_outputs"),
          { ok: !0, noop: "newer_local" }
        );
    }
    (await chmod(R, readOnly ? 292 : 420), await rename(R, dest));
  } catch (error) {
    if ((await unlink(R).catch(() => {}), w && fe(error)))
      return (
        logEvent("tengu_stage_file_completed", {
          ok: !0,
          noop: !0,
          fetch_ms: z,
          duration_ms: c(),
          queued_ms: max,
          bytes: 0,
        }),
        logForDiagnosticsNoPII("debug", "stage_file_noop_readonly_mount", { duration_ms: c() }),
        { ok: !0, noop: "readonly_mount" }
      );
    let D = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
    if (
      (logEvent("tengu_stage_file_completed", {
        ok: !1,
        fetch_ms: z,
        duration_ms: c(),
        queued_ms: max,
        bytes: bytes,
        ...E,
      }),
      logForDiagnosticsNoPII("warn", "stage_file_write_failed", {
        code: D,
        duration_ms: c(),
        queued_ms: max,
      }),
      !readOnly)
    )
      logFeatureBad("ccr_stage_file_outputs", "write_failed");
    return { ok: !1, error: `write failed: ${D}`, ...(X.has(D) && { permanent: !0 }) };
  }
  if (readOnly) recordStagedWrite(dest, M.written, Date.now());
  if (
    (logEvent("tengu_stage_file_completed", {
      ok: !0,
      fetch_ms: z,
      duration_ms: c(),
      queued_ms: max,
      bytes: bytes,
      outputs_root: !readOnly,
      ...E,
      replaced: fromEnumOpt(replaced),
      ...(standing !== void 0 && { standing_vs_placed_code: standing.vsPlaced }),
      ...I,
    }),
    !readOnly)
  )
    logFeatureOk("ccr_stage_file_outputs");
  return (
    logForDiagnosticsNoPII(replaced === "different_contents" ? "warn" : "info", "stage_file_ok", {
      bytes: bytes,
      fetch_ms: z,
      duration_ms: c(),
      queued_ms: max,
      root: readOnly ? "uploads" : "outputs",
      ...(replaced !== void 0 && { replaced: replaced }),
      ...(standing !== void 0 && {
        replaced_bytes: standing.bytes,
        replaced_mtime_age_s: standing.ageSeconds,
        replaced_read_only: standing.readOnly,
        standing_vs_placed_code: standing.vsPlaced,
      }),
      ...(T !== void 0 && {
        store_check_mode: S,
        store_check_answer: T.storeAnswer,
        store_check_verdict: T.verdict,
        store_check_ms: T.checkMs,
      }),
    }),
    { ok: !0, ...(replaced !== void 0 && { replaced: replaced }), ...(readOnly ? {} : { outputPath: dest }) }
  );
}
/**
 * 记录 home 暂存结果
 */
//@ chunk-rqpqwy1q.js:12750-13187 placement
function logHomeStage(e, t) {
  let r = e === "flag_not_loaded" || e === "probe_failed" || e === "fetch_failed" || e === "place_failed";
  if (
    (logForDiagnosticsNoPII(r ? "warn" : "info", "stage_file_home", { outcome: e, ...t }),
    logEvent("tengu_stage_file_completed", {
      ok: !r,
      noop: !r && e !== "placed",
      home_root: !0,
      bytes: t.bytes ?? 0,
      duration_ms: t.duration_ms ?? 0,
      queued_ms: t.queued_ms ?? 0,
    }),
    r)
  )
    logFeatureBad("ccr_stage_file_home", e);
  else if (e === "placed" || e === "already_present") logFeatureOk("ccr_stage_file_home");
  else logFeatureSad("ccr_stage_file_home", e);
}
/**
 * home 暂存结果
 */
//@ chunk-rqpqwy1q.js:13187-13455 placement
function homeStageResult(e, t, r) {
  switch (e.outcome) {
    case "placed":
      return (logHomeStage(e.outcome, r), { ok: !0, outputPath: t });
    case "already_present":
    case "path_occupied":
      return (logHomeStage(e.outcome, r), { ok: !0, noop: e.outcome });
    case "refused_name":
      return (logHomeStage(e.outcome, { refusal: e.refusal, ...r }), { ok: !0, noop: e.outcome });
  }
}
/**
 * 暂存到 home 根
 */
//@ chunk-rqpqwy1q.js:13455-14264 placement
async function stageToHome(e, { dest: dest, root: root }, n, s) {
  let startTime = performance.now(),
    max = Math.max(0, Date.now() - n),
    S = () => ({ duration_ms: Math.round(performance.now() - startTime), queued_ms: max }),
    h = relative(root, dest),
    y = join(root, `${stageTmpStem(dest)}${Date.now()}.${Math.random().toString(36).slice(2)}`);
  try {
    let c = await checkHomeTarget(root, h);
    if ((await sweepStaleStageTmps(root, STAGE_TMP_PREFIX), c !== void 0))
      return homeStageResult(c, dest, S());
  } catch (error) {
    let F = getErrnoCode(error) ?? "unknown";
    return (logHomeStage("probe_failed", { code: F, ...S() }), { ok: !1, error: `mkdir failed: ${F}` });
  }
  try {
    let c = await withFilestoreCredential(e, y, s);
    if (!c.ok && !c.gated && s === void 0)
      (await unlink(y).catch(() => {}), await sleep(He), (c = await withFilestoreCredential(e, y, s)));
    if (!c.ok) return (logHomeStage("fetch_failed", { code: c.errno, ...S() }), { ok: !1, error: c.error });
    return homeStageResult(await publishHomeFile(y, root, h, void 0), dest, { bytes: c.bytes, ...S() });
  } catch (error) {
    let F = getErrnoCode(error) ?? "unknown";
    return (logHomeStage("place_failed", { code: F, ...S() }), { ok: !1, error: `write failed: ${F}` });
  } finally {
    await unlink(y).catch(() => {});
  }
}
//@ chunk-rqpqwy1q.js:14264-14305 placement
var Xe = "read failed: credential expired";
//@ chunk-rqpqwy1q.js:14305-14393 placement
function Je(e) {
  let t = !1;
  return async () => {
    if (t) return { ok: !1, error: Xe };
    return ((t = !0), parseFilestoreCredential(e));
  };
}
/**
 * 解析 filestore 凭据
 */
//@ chunk-rqpqwy1q.js:14393-14720 placement
function parseFilestoreCredential(e) {
  let { filestore_jwt: filestore_jwt, filesystem_id: filesystem_id } = e;
  if (!filestore_jwt || !filesystem_id)
    return { ok: !1, error: "list returned incomplete credential", permanent: !0 };
  let n = kgr(e.filestore_url);
  if (e.filestore_url && !n)
    logForDiagnosticsNoPII("warn", "stage_file_filestore_url_rejected", { reason: zki(e.filestore_url) });
  return { ok: !0, cred: { filestoreJwt: filestore_jwt, filesystemId: filesystem_id, filestoreUrl: n } };
}
//@ chunk-rqpqwy1q.js:14720-14788 placement
async function ee(e, t) {
  let r = await listFilestoreCredential(e, t);
  return r.ok ? parseFilestoreCredential(r.data) : r;
}
//@ chunk-rqpqwy1q.js:14788-14882 placement
var pe = "/worker/files",
  STAGE_REQUEST_ID = "stage_request_id",
  Qe = /^stage-file-inplace-req_[0-9A-Za-z_]{1,72}$/;
//@ chunk-rqpqwy1q.js:14882-14964 placement
function Ze(e, t) {
  return e.in_place === !0 && typeof t === "string" && Qe.test(t) ? t : void 0;
}
/**
 * 拉取 filestore 凭据
 */
//@ chunk-rqpqwy1q.js:14964-15894 placement
async function listFilestoreCredential(e, t) {
  let startTime = performance.now(),
    n = () => Math.round(performance.now() - startTime);
  try {
    let s = await apiClient.get(t === void 0 ? pe : `${pe}?${STAGE_REQUEST_ID}=${encodeURIComponent(t)}`, {
      auth: "session-jwt",
      host: "ccr-session",
      headers: { "anthropic-version": "2023-06-01" },
      timeout: Ee,
      signal: e,
    });
    if (!s.ok)
      return (
        logForDiagnosticsNoPII("warn", "stage_file_list_gated", { reason: s.reason, duration_ms: n() }),
        { ok: !1, error: `list gated: ${s.reason}`, gated: !0, permanent: !0 }
      );
    if (s.status < 200 || s.status >= 300)
      return (
        logForDiagnosticsNoPII("warn", "stage_file_list_failed", {
          kind: "http",
          status: s.status,
          duration_ms: n(),
        }),
        {
          ok: !1,
          error: `list failed: http ${s.status}`,
          status: s.status,
          ...(Z(s.status) && { permanent: !0 }),
        }
      );
    let { filestore_jwt: filestore_jwt, filesystem_id: filesystem_id, filestore_url: filestore_url } = s.data;
    return {
      ok: !0,
      data: { filestore_jwt: filestore_jwt, filesystem_id: filesystem_id, filestore_url: filestore_url },
    };
  } catch (error) {
    let {
      kind: kind,
      status: status,
      message: message,
      permanent: permanent,
    } = requestFailure("list", error);
    return (
      logForDiagnosticsNoPII("warn", "stage_file_list_failed", {
        kind: kind,
        status: status,
        duration_ms: n(),
      }),
      { ok: !1, error: message, status: status, permanent: permanent }
    );
  }
}
/**
 * 带凭据刷新的 filestore 调用
 */
//@ chunk-rqpqwy1q.js:15894-18121 placement
async function withFilestoreCredential(e, t, r, n, s) {
  let startTime = performance.now(),
    d = () => Math.round(performance.now() - startTime),
    S = r === void 0 ? () => ee(void 0, n) : Je(r),
    h = s ?? (await S());
  if (!h.ok) return h;
  let cred = h.cred;
  for (let c = 0; c <= 1; c++) {
    let abortController = new AbortController(),
      w,
      E = () => {
        if (w) w.refresh();
        else w = setTimeout((_) => _.abort(Error("readFile stall: no bytes for 60s")), G, abortController);
      };
    E();
    try {
      let post = await apiClient.post(
        "/v1/filestore/fs/readFile",
        { filesystem_id: cred.filesystemId, path: e },
        {
          auth: "none",
          host: "api",
          baseUrl: cred.filestoreUrl,
          headers: { Authorization: `Bearer ${cred.filestoreJwt}` },
          responseType: "stream",
          timeout: 0,
          signal: abortController.signal,
          validateStatus: () => !0,
        },
      );
      if (!post.ok)
        return (
          clearTimeout(w),
          logForDiagnosticsNoPII("warn", "stage_file_read_gated", { reason: post.reason, duration_ms: d() }),
          { ok: !1, error: `read gated: ${post.reason}`, gated: !0 }
        );
      if (post.status === 401 && c === 0) {
        if ((clearTimeout(w), post.data instanceof Readable)) post.data.destroy();
        if (
          (logForDiagnosticsNoPII("info", "stage_file_read_remint_jwt", { duration_ms: d() }),
          (h = await S()),
          !h.ok)
        )
          return h;
        cred = h.cred;
        continue;
      }
      if (post.status < 200 || post.status >= 300) {
        if ((clearTimeout(w), post.data instanceof Readable)) post.data.destroy();
        return (
          logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
            kind: "http",
            status: post.status,
            duration_ms: d(),
          }),
          { ok: !1, error: `read failed: http ${post.status}`, ...(Z(post.status) && { permanent: !0 }) }
        );
      }
      let b = Number(post.response?.headers["content-length"] ?? -1);
      (post.data.on("data", E),
        await pipeline(post.data, createWriteStream(t, { flags: "wx" })),
        clearTimeout(w));
      let R = await stat(t, { bigint: !0 }),
        O = Number(R.size);
      if (b >= 0 && O !== b)
        return (
          logForDiagnosticsNoPII("warn", "stage_file_read_truncated", {
            expected: b,
            got: O,
            duration_ms: d(),
          }),
          { ok: !1, error: `read truncated: got ${O} of ${b} bytes` }
        );
      let { ino: ino, birthtimeNs: birthtimeNs, size: size, mtimeNs: mtimeNs } = R;
      return {
        ok: !0,
        bytes: O,
        written: { ino: ino, birthtimeNs: birthtimeNs, size: size, mtimeNs: mtimeNs },
      };
    } catch (error) {
      clearTimeout(w);
      let b = typeof error === "object" && error !== null && "code" in error ? String(error.code) : void 0;
      if (b && !("isAxiosError" in error))
        return (
          logForDiagnosticsNoPII("warn", "stage_file_write_failed", { code: b, duration_ms: d() }),
          { ok: !1, error: `write failed: ${b}`, errno: b }
        );
      if (abortController.signal.aborted)
        return (
          logForDiagnosticsNoPII("warn", "stage_file_read_stalled", { stall_ms: G, duration_ms: d() }),
          { ok: !1, error: `read stalled: no bytes for ${G}ms` }
        );
      let {
        kind: kind,
        status: status,
        message: message,
        permanent: permanent,
      } = requestFailure("read", error);
      return (
        logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
          kind: kind,
          status: status,
          duration_ms: d(),
        }),
        { ok: !1, error: message, permanent: permanent }
      );
    }
  }
  throw Error("unreachable: fetchFilestoreToFile retry loop fell through");
}
//@ chunk-rqpqwy1q.js:18121-18136 placement
var tt = 1048576;
/**
 * 创建 filestore 客户端
 */
//@ chunk-rqpqwy1q.js:18136-20148 placement
async function createFilestoreClient(e) {
  let t = await ee(e);
  if (!t.ok) return t;
  let { filestoreJwt: filestoreJwt, filesystemId: filesystemId, filestoreUrl: filestoreUrl } = t.cred,
    l = {
      auth: "none",
      host: "api",
      baseUrl: filestoreUrl,
      headers: { Authorization: `Bearer ${filestoreJwt}` },
      timeout: Ee,
    };
  async function d(h, { maxBytes: y, signal: c } = {}) {
    let startTime = performance.now(),
      w = () => Math.round(performance.now() - startTime);
    try {
      let post = await apiClient.post(
        "/v1/filestore/fs/readFile",
        { filesystem_id: filesystemId, path: h },
        { ...l, responseType: "arraybuffer", maxContentLength: y ?? Be, signal: c },
      );
      if (!post.ok)
        return (
          logForDiagnosticsNoPII("warn", "stage_file_read_gated", { reason: post.reason, duration_ms: w() }),
          { ok: !1, error: `read gated: ${post.reason}`, gated: !0 }
        );
      if (post.status < 200 || post.status >= 300)
        return (
          logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
            kind: "http",
            status: post.status,
            duration_ms: w(),
          }),
          {
            ok: !1,
            error: `read failed: http ${post.status}`,
            status: post.status,
            ...(post.status === 404 && { notFound: !0 }),
          }
        );
      return { ok: !0, buf: Buffer.from(post.data) };
    } catch (error) {
      let { kind: kind, status: status, message: message } = requestFailure("read", error);
      return (
        logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
          kind: kind,
          status: status,
          duration_ms: w(),
        }),
        {
          ok: !1,
          error: message,
          status: status,
          ...(status === 404 && { notFound: !0 }),
          ...(isMaxContentLengthError(error) && { tooLarge: !0 }),
        }
      );
    }
  }
  async function S(h, { limit: limit, signal: signal }) {
    let startTime = performance.now();
    try {
      let post = await apiClient.post(
        "/v1/filestore/fs/listDirectory",
        { filesystem_id: filesystemId, path: h, limit: limit },
        { ...l, maxContentLength: tt, signal: signal },
      );
      if (!post.ok)
        return (
          logStageDirectoryFailure("gated", void 0, startTime),
          { ok: !1, error: `directory listing gated: ${post.reason}`, gated: !0 }
        );
      if (post.status < 200 || post.status >= 300)
        return (
          logStageDirectoryFailure("http", post.status, startTime),
          {
            ok: !1,
            error: `directory listing failed: http ${post.status}`,
            status: post.status,
            ...(post.status === 404 && { notFound: !0 }),
          }
        );
      let safeParse = DIRECTORY_LISTING_SCHEMA().safeParse(post.data);
      if (!safeParse.success)
        return (
          logStageDirectoryFailure("shape", post.status, startTime),
          { ok: !1, error: "directory listing failed: unexpected answer", status: post.status }
        );
      let _ = safeParse.data.entries ?? [],
        sliced = _.slice(0, limit);
      return {
        ok: !0,
        files: sliced.flatMap((R) => R.file?.path ?? []),
        directories: sliced.flatMap((R) => R.directory?.path ?? []),
        more: _.length > limit || (safeParse.data.cursor ?? "") !== "",
      };
    } catch (error) {
      let { kind: kind, status: status, message: message } = requestFailure("directory listing", error);
      return (
        logStageDirectoryFailure(kind, status, startTime),
        { ok: !1, error: message, status: status, ...(status === 404 && { notFound: !0 }) }
      );
    }
  }
  return { ok: !0, reader: { readBytes: d, listDirectory: S } };
}
//@ chunk-rqpqwy1q.js:20148-20283 placement
function logStageDirectoryFailure(e, t, r) {
  logForDiagnosticsNoPII(t === 404 ? "info" : "warn", "stage_file_directory_failed", {
    kind: e,
    status: t,
    duration_ms: Math.round(performance.now() - r),
  });
}
//@ chunk-rqpqwy1q.js:20283-20416 placement
var DIRECTORY_LISTING_SCHEMA = DoctorLazy(() =>
  u({
    entries: A(u({ file: u({ path: o() }).optional(), directory: u({ path: o() }).optional() })).optional(),
    cursor: o().optional(),
  }),
);
//@ chunk-rqpqwy1q.js:20416-20506 placement
async function fetchFilestoreBytes(e, t = {}) {
  let r = await createFilestoreClient(t.signal);
  return r.ok ? r.reader.readBytes(e, t) : r;
}

export { sweepStaleStageTmps, stageTmpStem };
