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
import { lstat, readdir, stat, unlink, mkdir, realpath, chmod, rename } from "fs/promises";
import { posix } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { identity } from "./identity.js";
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
import { isFirstPartyRemoteSession } from "./userDataRoots.js";
import { env } from "./env.js";
import { homePathProblem, checkHomeTarget, publishHomeFile } from "./filePersistence/homeFilePublish.js";
import { hasBackslash } from "./pathClassification.js";
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
import { httpsOrigin, invalidHttpsUrlReason, apiClient } from "../services/routines/routinesApi.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, array, string } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-rqpqwy1q.js:1299-1340 placement
var MAX_TRACKED_STAGED_WRITES = 4096;
var stagedWriteState = identity(new Map(), (e) => e.clear());
//@ chunk-rqpqwy1q.js:1340-1482 placement
function recordStagedWrite(dest, written, r) {
  stagedWriteState.delete(dest);
  stagedWriteState.set(dest, {
    written,
    renamedByNs: BigInt(r + 1) * 1000000n,
  });
  if (stagedWriteState.size > MAX_TRACKED_STAGED_WRITES) {
    let [n] = stagedWriteState.keys();
    if (n !== undefined) stagedWriteState.delete(n);
  }
}
//@ chunk-rqpqwy1q.js:1482-1698 placement
/**
 * 已暂存文件的状态码
 */
function stagedFileState(e, t) {
  let r = stagedWriteState.get(e);
  if (r === undefined) return 5;
  let { written } = r;
  if (written.ino !== t.ino || written.birthtimeNs !== t.birthtimeNs) return 3;
  if (written.size !== t.size || written.mtimeNs !== t.mtimeNs) return 4;
  return t.ctimeNs <= r.renamedByNs ? 1 : 2;
}
//@ chunk-rqpqwy1q.js:1698-1713 placement
var MAX_COMPARE_BYTES = 1048576;
//@ chunk-rqpqwy1q.js:1713-2379 placement
/**
 * 描述已存在的文件
 */
async function describeExistingFile(dest, t, bytes) {
  let n;
  try {
    let s = await lstat(dest, {
      bigint: true,
    });
    if (!s.isFile())
      return {
        replaced: "not_a_file",
      };
    let l = Number(s.mtimeNs / 1000n) / 1000;
    n = {
      bytes: Number(s.size),
      ageSeconds: Math.max(0, Math.round((Date.now() - l) / 1000)),
      readOnly: (Number(s.mode) & 146) === 0,
      vsPlaced: stagedFileState(dest, s),
    };
    if (n.bytes !== bytes)
      return {
        replaced: "different_contents",
        standing: n,
      };
    if (bytes > MAX_COMPARE_BYTES)
      return {
        replaced: "same_size_not_compared",
        standing: n,
      };
    let [smallFile, smallFile_2] = await Promise.all([readSmallFile(dest), readSmallFile(t)]);
    if (smallFile === null || smallFile_2 === null)
      return {
        replaced: "unknown",
        standing: n,
      };
    return {
      replaced: smallFile.equals(smallFile_2) ? "same_contents" : "different_contents",
      standing: n,
    };
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          replaced: "nothing",
        }
      : {
          replaced: "unknown",
          standing: n,
        };
  }
}
//@ chunk-rqpqwy1q.js:2379-2570 placement
/**
 * 读取小文件
 */
async function readSmallFile(e) {
  let regularFileForRead = await openRegularFileForRead(e);
  try {
    let stats = await regularFileForRead.stat();
    if (!stats.isFile()) return null;
    let handleBounded = await readHandleBounded(regularFileForRead, MAX_COMPARE_BYTES, stats.size);
    return handleBounded.overLimit ? null : handleBounded.bytes;
  } finally {
    await regularFileForRead.close().catch(() => {});
  }
}
//@ chunk-rqpqwy1q.js:2570-2849 placement
var { basename, dirname, isAbsolute, join, normalize, relative, sep: posixSep } = posix;
var stageFileRoot = getStageFileRoot();
var outputsRoot = getOutputsRoot();
var homeFilesRoot = getHomeFilesRoot();
var MAX_DOWNLOAD_BYTES = 67108864;
var HTTP_TIMEOUT_MS = 30000;
var MAX_CONCURRENT_STAGES = 16;
var READ_STALL_TIMEOUT_MS = 60000;
var UNLINK_RETRY_DELAY_MS = 500;
var STAGE_PARENT_ESCAPE = "STAGE_PARENT_ESCAPE";
var PERMANENT_ERRNOS = new Set([
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
function isPermanentHttpStatus(status) {
  return status < 500 && status !== 408 && status !== 429;
}
//@ chunk-rqpqwy1q.js:2894-3004 placement
function stageFileWireResult(e) {
  return {
    ok: true,
    ...(e.noop !== undefined && {
      noop: e.noop,
    }),
    ...(e.replaced !== undefined && {
      replaced: e.replaced,
    }),
  };
}
//@ chunk-rqpqwy1q.js:3004-3109 placement
function getContainedRelativePath(e, t) {
  let r = relative(e, t);
  if (r === "" || r === "." || r.split(posixSep).includes("..") || isAbsolute(r)) return null;
  return r;
}
//@ chunk-rqpqwy1q.js:3109-4095 placement
/**
 * 校验 mount_path
 */
function parseMountPath(e, t = false) {
  if (e.includes("\x00")) throw Error("mount_path contains null bytes");
  if (!isAbsolute(e)) throw Error("mount_path must be absolute");
  if (e.split(posixSep).includes("..")) throw Error('mount_path must not contain ".." segments');
  let r = normalize(e);
  let containedRelativePath = getContainedRelativePath(STAGE_FILE_HOME_MOUNT_PREFIX, r);
  if (
    containedRelativePath !== null &&
    isClaudeAiChatOrigin() &&
    isFirstPartyRemoteSession(
      t ? "vouched" : env.CLAUDE_CODE_REMOTE_SESSION_ID,
      env.CLAUDE_CODE_ENVIRONMENT_KIND,
    )
  ) {
    let refusal = homePathProblem(containedRelativePath);
    if (refusal !== undefined) throw new HomeWriteRefusedError(refusal);
    return {
      dest: join(homeFilesRoot, containedRelativePath),
      root: homeFilesRoot,
      readOnly: false,
      neverReplace: true,
    };
  }
  if (basename(r).startsWith(STAGE_TMP_PREFIX))
    throw Error("mount_path names a reserved temporary-file name");
  let containedRelativePath_2 = getContainedRelativePath(STAGE_FILE_MOUNT_PREFIX, r);
  if (containedRelativePath_2 !== null)
    return {
      dest: join(stageFileRoot, containedRelativePath_2),
      root: stageFileRoot,
      readOnly: true,
      neverReplace: false,
    };
  let containedRelativePath_3 = getContainedRelativePath(STAGE_FILE_OUTPUTS_MOUNT_PREFIX, r);
  if (containedRelativePath_3 !== null) {
    if (
      !isFirstPartyRemoteSession(
        t ? "vouched" : env.CLAUDE_CODE_REMOTE_SESSION_ID,
        env.CLAUDE_CODE_ENVIRONMENT_KIND,
      )
    ) {
      let d = Error("staging under /outputs/ is only supported on managed remote sessions");
      d.code = "STAGE_OUTPUTS_UNSUPPORTED_RUNNER";
      throw d;
    }
    return {
      dest: join(outputsRoot, containedRelativePath_3),
      root: outputsRoot,
      readOnly: false,
      neverReplace: false,
    };
  }
  throw Error("mount_path must be under /uploads/ or /outputs/");
}
//@ chunk-rqpqwy1q.js:4095-4235 placement
class HomeWriteRefusedError extends Error {
  refusal;
  constructor(refusal) {
    super("mount_path names a file that may not be written to the home directory");
    this.refusal = refusal;
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
function assertDestUnderRoot(e, t) {
  if (!isAtOrUnderRoot(e, t)) throw stageParentEscapeError("dest parent escaped stage root");
}
//@ chunk-rqpqwy1q.js:4613-4717 placement
function assertNoBackslashDirs(root, dest) {
  if (hasBackslash(root) || hasBackslash(dirname(dest)))
    throw stageParentEscapeError("a folder on the way to dest has a backslash in its name");
}
//@ chunk-rqpqwy1q.js:4717-4766 placement
function stageParentEscapeError(e) {
  let t = Error(e);
  t.code = STAGE_PARENT_ESCAPE;
  return t;
}
//@ chunk-rqpqwy1q.js:4766-4821 placement
function stageTmpStem(dest) {
  return `${STAGE_TMP_PREFIX}${computeContentHash(basename(dest)).slice(0, 16)}.`;
}
//@ chunk-rqpqwy1q.js:4821-5028 placement
async function sweepStaleStageTmps(e, t) {
  let r = Date.now() - 2 * READ_STALL_TIMEOUT_MS;
  let n;
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
function isFreshFile(e, t) {
  return e !== null && e.isFile() && (e.mtimeMs >= t || e.ctimeMs >= t);
}
//@ chunk-rqpqwy1q.js:5103-5173 placement
function isReadOnlyFsError(error) {
  return typeof error === "object" && error !== null && error.code === "EROFS";
}
//@ chunk-rqpqwy1q.js:5173-5331 placement
/**
 * 请求失败描述
 */
function requestFailure(e, error) {
  let { kind, status } = classifyAxiosError(error);
  return {
    kind,
    status,
    message: `${e} failed: ${kind}${status ? ` ${status}` : ""}`,
    ...(kind === "http" &&
      status !== undefined &&
      isPermanentHttpStatus(status) && {
        permanent: true,
      }),
  };
}
//@ chunk-rqpqwy1q.js:5331-7276 placement
/**
 * stage_file：把 filestore 中的文件暂存到 /uploads 或 /outputs，比较已有文件。
 */
async function stageFile(e, t, r = "off", n, s = "off") {
  if (t === undefined && !env.CLAUDE_CODE_REMOTE_SESSION_ID)
    return {
      ok: false,
      error: "CLAUDE_CODE_REMOTE_SESSION_ID unset",
      permanent: true,
    };
  if (t !== undefined && e.filestore_path)
    return {
      ok: false,
      error: "synced documents are not staged here",
    };
  if (e.filestore_path) {
    if (env.CLAUDE_CODE_ENVIRONMENT_KIND !== undefined) {
      logFeatureBad("ccr_synced_file_stage", "unsupported_runner_kind");
      logEvent("tengu_stage_file_completed", {
        ok: false,
        synced_unsupported_runner_kind: true,
        duration_ms: 0,
      });
      return {
        ok: false,
        error: "synced-file staging not supported on this runner kind",
      };
    }
    let { stageSyncedFile, SYNCED_FILE_ROOT } = await import("./chunk-2s3tfbmy.js");
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
    l = parseMountPath(e.mount_path, t !== undefined);
  } catch (error) {
    if (getErrnoCode(error) === "STAGE_OUTPUTS_UNSUPPORTED_RUNNER") {
      logFeatureBad("ccr_stage_file_outputs", "unsupported_runner_kind");
      logEvent("tengu_stage_file_completed", {
        ok: false,
        outputs_unsupported_runner_kind: true,
        duration_ms: 0,
      });
    }
    if (error instanceof HomeWriteRefusedError) {
      logHomeStage("refused_name", {
        refusal: error.refusal,
      });
      return {
        ok: true,
        noop: "refused_name",
      };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      permanent: true,
    };
  }
  if (l.neverReplace && r === "off") {
    logHomeStage("home_files_off", {});
    return {
      ok: true,
      noop: "home_files_off",
    };
  }
  if (l.neverReplace && e.resync !== undefined) {
    logHomeStage("resent_announcement", {});
    return {
      ok: true,
      noop: "resent_announcement",
    };
  }
  if (l.neverReplace && e.force !== false) {
    logHomeStage("unchecked_announcement", {});
    return {
      ok: true,
      noop: "unchecked_announcement",
    };
  }
  if (l.neverReplace && r === "not_loaded") {
    logHomeStage("flag_not_loaded", {});
    return {
      ok: false,
      error: "the flag for home files has not loaded",
    };
  }
  let d = l.readOnly
    ? {}
    : {
        outputPath: l.dest,
      };
  if (!e.force && !l.neverReplace)
    try {
      if ((await stat(l.dest)).isFile()) {
        logForDiagnosticsNoPII("debug", "stage_file_noop_already_present", {});
        logEvent("tengu_stage_file_completed", {
          ok: true,
          noop_already_present: true,
          duration_ms: 0,
        });
        return {
          ok: true,
          noop: "already_present",
          ...d,
        };
      }
    } catch {}
  let now = Date.now();
  return runStageForRoot(e.mount_path, l, now, t, inPlaceRequestId(e, n), e.force === true ? s : "off");
}
//@ chunk-rqpqwy1q.js:7276-7310 placement
var stageLimitersByRoot = identity(new Map(), (e) => e.clear());
//@ chunk-rqpqwy1q.js:7310-7421 placement
function runStageForRoot(mountPath, t, r, n, s, l) {
  let d = stageLimitersByRoot.get(t.root);
  if (d === undefined) {
    d = limitConcurrency(MAX_CONCURRENT_STAGES, stageOne);
    stageLimitersByRoot.set(t.root, d);
  }
  return d(mountPath, t, r, n, s, l);
}
//@ chunk-rqpqwy1q.js:7421-7497 placement
function stageOne(...e) {
  let [t, r, n, s] = e;
  return r.neverReplace ? stageToHome(t, r, n, s) : stageToRoot(...e);
}
//@ chunk-rqpqwy1q.js:7497-8769 placement
/**
 * 与存储副本比较
 */
async function compareWithStore(dest, t, path) {
  let startTime = performance.now();
  if (t === undefined || !t.isFile() || t.nlink !== 1n || t.size > BigInt(SAME_STANDING_MAX_BYTES)) return;
  if (storeCheckPaused())
    return {
      compared: {
        storeAnswer: "not_asked_while_paused",
        verdict: "no_size_and_md5_from_store",
        checkMs: 0,
        bytes: Number(t.size),
        hashMayHaveChangedAtime: false,
      },
    };
  let s = await fetchAndParseCredential();
  if (!s.ok)
    return {
      minted: s,
    };
  let l = await askStoreWhatItHolds(s.cred, path);
  let d;
  let hashMayHaveChangedAtime = false;
  if (l.answer !== "size_and_md5") {
    d = "no_size_and_md5_from_store";
    if (l.answer === "credential_refused" || l.answer === "not_sent") pauseStoreCheck(l.answer, 1 / 0);
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
    let h = await hashStandingFile(dest, t);
    if (typeof h === "string") {
      d =
        h === "timed_out"
          ? "local_file_hash_timed_out"
          : h === "changed"
            ? "local_file_changed"
            : "local_file_unreadable";
      if (h === "timed_out") pauseStoreCheck("local_file_hash_timed_out", 1 / 0);
    } else {
      hashMayHaveChangedAtime = !h.withNoAtime;
      let y = await lstat(dest, {
        bigint: true,
      }).catch(() => {
        return;
      });
      d =
        y === undefined || !sameFileUntouched(h.opened, y)
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
      hashMayHaveChangedAtime,
    },
  };
}
//@ chunk-rqpqwy1q.js:8769-12750 placement
/**
 * 暂存到挂载根
 */
async function stageToRoot(path, { dest, root, readOnly }, s, l, d, S) {
  let startTime = performance.now();
  let queuedMs = Math.max(0, Date.now() - s);
  let c = () => Math.round(performance.now() - startTime);
  let F = d !== undefined;
  let w = readOnly && !F && !env.CLAUDE_STAGE_FILE_ROOT;
  let E = F
    ? {
        in_place: true,
      }
    : {};
  let _ = stageTmpStem(dest);
  let b;
  let R = join(dirname(dest), `${_}${Date.now()}.${Math.random().toString(36).slice(2)}`);
  try {
    assertNoBackslashDirs(root, dest);
    await mkdir(dirname(dest), {
      recursive: true,
    });
    let P = await realpath(root);
    let D = await realpath(dirname(dest));
    assertDestUnderRoot(P, D);
    b = await lstat(dest, {
      bigint: true,
    }).catch((error) => {
      if (getErrnoCode(error) === "ENAMETOOLONG") throw error;
      return;
    });
    await sweepStaleStageTmps(dirname(dest), _);
  } catch (error) {
    let D = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
    if (w && isReadOnlyFsError(error)) {
      logEvent("tengu_stage_file_completed", {
        ok: true,
        noop: true,
        duration_ms: c(),
        queued_ms: queuedMs,
        bytes: 0,
      });
      logForDiagnosticsNoPII("debug", "stage_file_noop_readonly_mount", {
        duration_ms: c(),
      });
      return {
        ok: true,
        noop: "readonly_mount",
      };
    }
    logEvent("tengu_stage_file_completed", {
      ok: false,
      duration_ms: c(),
      queued_ms: queuedMs,
      ...E,
    });
    logForDiagnosticsNoPII("warn", "stage_file_mkdir_failed", {
      code: D,
      duration_ms: c(),
      queued_ms: queuedMs,
    });
    if (!readOnly) logFeatureBad("ccr_stage_file_outputs", "mkdir_failed");
    return {
      ok: false,
      error: `mkdir failed: ${D}`,
      ...(PERMANENT_ERRNOS.has(D) && {
        permanent: true,
      }),
    };
  }
  let O =
    S !== "off" && readOnly && !F && l === undefined ? await compareWithStore(dest, b, path) : undefined;
  let compared = O?.compared;
  let I =
    compared === undefined
      ? {}
      : {
          store_check_mode: fromEnumOpt(S),
          store_check_answer: fromEnumOpt(compared.storeAnswer),
          store_check_verdict: fromEnumOpt(compared.verdict),
          store_check_ms: compared.checkMs,
        };
  if (S === "on" && compared?.verdict === "same_contents") {
    let P = compared.hashMayHaveChangedAtime
      ? {
          store_check_may_have_changed_atime: true,
        }
      : {};
    logEvent("tengu_stage_file_completed", {
      ok: true,
      noop: true,
      noop_already_present: true,
      duration_ms: c(),
      queued_ms: queuedMs,
      bytes: 0,
      replaced: fromEnumOpt("same_contents"),
      download_skipped_bytes: compared.bytes,
      ...I,
      ...P,
    });
    logForDiagnosticsNoPII("info", "stage_file_noop_matches_store", {
      duration_ms: c(),
      queued_ms: queuedMs,
      download_skipped_bytes: compared.bytes,
      store_check_ms: compared.checkMs,
      ...P,
    });
    return {
      ok: true,
      noop: "already_present",
      replaced: "same_contents",
    };
  }
  let M = await withFilestoreCredential(path, R, l, d, O?.minted);
  if (!M.ok) {
    await unlink(R).catch(() => {});
    if (w && M.errno === "EROFS") {
      logEvent("tengu_stage_file_completed", {
        ok: true,
        noop: true,
        duration_ms: c(),
        queued_ms: queuedMs,
        bytes: 0,
      });
      logForDiagnosticsNoPII("debug", "stage_file_noop_readonly_mount", {
        duration_ms: c(),
      });
      return {
        ok: true,
        noop: "readonly_mount",
      };
    }
    logEvent("tengu_stage_file_completed", {
      ok: false,
      gated: M.gated,
      duration_ms: c(),
      queued_ms: queuedMs,
      ...E,
    });
    if (!readOnly) logFeatureBad("ccr_stage_file_outputs", "fetch_failed");
    return {
      ok: false,
      error: M.error,
      ...((M.permanent === true ||
        M.gated === true ||
        (M.errno !== undefined && PERMANENT_ERRNOS.has(M.errno))) && {
        permanent: true,
      }),
    };
  }
  let bytes = M.bytes;
  let fetchMs = c();
  let { replaced, standing } = readOnly ? await describeExistingFile(dest, R, bytes) : {};
  try {
    if (!readOnly) {
      let P = await stat(dest).catch(() => null);
      if (isFreshFile(P, s)) {
        await unlink(R).catch(() => {});
        logEvent("tengu_stage_file_completed", {
          ok: true,
          noop: true,
          duration_ms: c(),
          queued_ms: queuedMs,
          bytes: 0,
          outputs_root: true,
        });
        logForDiagnosticsNoPII("info", "stage_file_noop_newer_local", {
          duration_ms: c(),
        });
        logFeatureOk("ccr_stage_file_outputs");
        return {
          ok: true,
          noop: "newer_local",
        };
      }
    }
    await chmod(R, readOnly ? 292 : 420);
    await rename(R, dest);
  } catch (error) {
    await unlink(R).catch(() => {});
    if (w && isReadOnlyFsError(error)) {
      logEvent("tengu_stage_file_completed", {
        ok: true,
        noop: true,
        fetch_ms: fetchMs,
        duration_ms: c(),
        queued_ms: queuedMs,
        bytes: 0,
      });
      logForDiagnosticsNoPII("debug", "stage_file_noop_readonly_mount", {
        duration_ms: c(),
      });
      return {
        ok: true,
        noop: "readonly_mount",
      };
    }
    let D = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
    logEvent("tengu_stage_file_completed", {
      ok: false,
      fetch_ms: fetchMs,
      duration_ms: c(),
      queued_ms: queuedMs,
      bytes,
      ...E,
    });
    logForDiagnosticsNoPII("warn", "stage_file_write_failed", {
      code: D,
      duration_ms: c(),
      queued_ms: queuedMs,
    });
    if (!readOnly) logFeatureBad("ccr_stage_file_outputs", "write_failed");
    return {
      ok: false,
      error: `write failed: ${D}`,
      ...(PERMANENT_ERRNOS.has(D) && {
        permanent: true,
      }),
    };
  }
  if (readOnly) recordStagedWrite(dest, M.written, Date.now());
  logEvent("tengu_stage_file_completed", {
    ok: true,
    fetch_ms: fetchMs,
    duration_ms: c(),
    queued_ms: queuedMs,
    bytes,
    outputs_root: !readOnly,
    ...E,
    replaced: fromEnumOpt(replaced),
    ...(standing !== undefined && {
      standing_vs_placed_code: standing.vsPlaced,
    }),
    ...I,
  });
  if (!readOnly) logFeatureOk("ccr_stage_file_outputs");
  logForDiagnosticsNoPII(replaced === "different_contents" ? "warn" : "info", "stage_file_ok", {
    bytes,
    fetch_ms: fetchMs,
    duration_ms: c(),
    queued_ms: queuedMs,
    root: readOnly ? "uploads" : "outputs",
    ...(replaced !== undefined && {
      replaced,
    }),
    ...(standing !== undefined && {
      replaced_bytes: standing.bytes,
      replaced_mtime_age_s: standing.ageSeconds,
      replaced_read_only: standing.readOnly,
      standing_vs_placed_code: standing.vsPlaced,
    }),
    ...(compared !== undefined && {
      store_check_mode: S,
      store_check_answer: compared.storeAnswer,
      store_check_verdict: compared.verdict,
      store_check_ms: compared.checkMs,
    }),
  });
  return {
    ok: true,
    ...(replaced !== undefined && {
      replaced,
    }),
    ...(readOnly
      ? {}
      : {
          outputPath: dest,
        }),
  };
}
//@ chunk-rqpqwy1q.js:12750-13187 placement
/**
 * 记录 home 暂存结果
 */
function logHomeStage(outcome, t) {
  let r =
    outcome === "flag_not_loaded" ||
    outcome === "probe_failed" ||
    outcome === "fetch_failed" ||
    outcome === "place_failed";
  logForDiagnosticsNoPII(r ? "warn" : "info", "stage_file_home", {
    outcome,
    ...t,
  });
  logEvent("tengu_stage_file_completed", {
    ok: !r,
    noop: !r && outcome !== "placed",
    home_root: true,
    bytes: t.bytes ?? 0,
    duration_ms: t.duration_ms ?? 0,
    queued_ms: t.queued_ms ?? 0,
  });
  if (r) logFeatureBad("ccr_stage_file_home", outcome);
  else if (outcome === "placed" || outcome === "already_present") logFeatureOk("ccr_stage_file_home");
  else logFeatureSad("ccr_stage_file_home", outcome);
}
//@ chunk-rqpqwy1q.js:13187-13455 placement
/**
 * home 暂存结果
 */
function homeStageResult(e, outputPath, r) {
  switch (e.outcome) {
    case "placed":
      logHomeStage(e.outcome, r);
      return {
        ok: true,
        outputPath,
      };
    case "already_present":
    case "path_occupied":
      logHomeStage(e.outcome, r);
      return {
        ok: true,
        noop: e.outcome,
      };
    case "refused_name":
      logHomeStage(e.outcome, {
        refusal: e.refusal,
        ...r,
      });
      return {
        ok: true,
        noop: e.outcome,
      };
  }
}
//@ chunk-rqpqwy1q.js:13455-14264 placement
/**
 * 暂存到 home 根
 */
async function stageToHome(path, { dest, root }, n, s) {
  let startTime = performance.now();
  let queuedMs = Math.max(0, Date.now() - n);
  let S = () => ({
    duration_ms: Math.round(performance.now() - startTime),
    queued_ms: queuedMs,
  });
  let h = relative(root, dest);
  let y = join(root, `${stageTmpStem(dest)}${Date.now()}.${Math.random().toString(36).slice(2)}`);
  try {
    let c = await checkHomeTarget(root, h);
    await sweepStaleStageTmps(root, STAGE_TMP_PREFIX);
    if (c !== undefined) return homeStageResult(c, dest, S());
  } catch (error) {
    let F = getErrnoCode(error) ?? "unknown";
    logHomeStage("probe_failed", {
      code: F,
      ...S(),
    });
    return {
      ok: false,
      error: `mkdir failed: ${F}`,
    };
  }
  try {
    let c = await withFilestoreCredential(path, y, s);
    if (!c.ok && !c.gated && s === undefined) {
      await unlink(y).catch(() => {});
      await sleep(UNLINK_RETRY_DELAY_MS);
      c = await withFilestoreCredential(path, y, s);
    }
    if (!c.ok) {
      logHomeStage("fetch_failed", {
        code: c.errno,
        ...S(),
      });
      return {
        ok: false,
        error: c.error,
      };
    }
    return homeStageResult(await publishHomeFile(y, root, h, undefined), dest, {
      bytes: c.bytes,
      ...S(),
    });
  } catch (error) {
    let F = getErrnoCode(error) ?? "unknown";
    logHomeStage("place_failed", {
      code: F,
      ...S(),
    });
    return {
      ok: false,
      error: `write failed: ${F}`,
    };
  } finally {
    await unlink(y).catch(() => {});
  }
}
//@ chunk-rqpqwy1q.js:14264-14305 placement
var CREDENTIAL_EXPIRED_TEXT = "read failed: credential expired";
//@ chunk-rqpqwy1q.js:14305-14393 placement
function oneShotCredentialFetcher(e) {
  let t = false;
  return async () => {
    if (t)
      return {
        ok: false,
        error: CREDENTIAL_EXPIRED_TEXT,
      };
    t = true;
    return parseFilestoreCredential(e);
  };
}
//@ chunk-rqpqwy1q.js:14393-14720 placement
/**
 * 解析 filestore 凭据
 */
function parseFilestoreCredential(e) {
  let { filestore_jwt: filestoreJwt, filesystem_id: filesystemId } = e;
  if (!filestoreJwt || !filesystemId)
    return {
      ok: false,
      error: "list returned incomplete credential",
      permanent: true,
    };
  let n = httpsOrigin(e.filestore_url);
  if (e.filestore_url && !n)
    logForDiagnosticsNoPII("warn", "stage_file_filestore_url_rejected", {
      reason: invalidHttpsUrlReason(e.filestore_url),
    });
  return {
    ok: true,
    cred: {
      filestoreJwt,
      filesystemId,
      filestoreUrl: n,
    },
  };
}
//@ chunk-rqpqwy1q.js:14720-14788 placement
async function fetchAndParseCredential(signal, t) {
  let r = await listFilestoreCredential(signal, t);
  return r.ok ? parseFilestoreCredential(r.data) : r;
}
//@ chunk-rqpqwy1q.js:14788-14882 placement
var FILESTORE_FILES_PATH = "/worker/files";
var STAGE_REQUEST_ID = "stage_request_id";
var IN_PLACE_REQUEST_ID_RE = /^stage-file-inplace-req_[0-9A-Za-z_]{1,72}$/;
//@ chunk-rqpqwy1q.js:14882-14964 placement
function inPlaceRequestId(e, t) {
  return e.in_place === true && typeof t === "string" && IN_PLACE_REQUEST_ID_RE.test(t) ? t : undefined;
}
//@ chunk-rqpqwy1q.js:14964-15894 placement
/**
 * 拉取 filestore 凭据
 */
async function listFilestoreCredential(signal, t) {
  let startTime = performance.now();
  let n = () => Math.round(performance.now() - startTime);
  try {
    let s = await apiClient.get(
      t === undefined
        ? FILESTORE_FILES_PATH
        : `${FILESTORE_FILES_PATH}?${STAGE_REQUEST_ID}=${encodeURIComponent(t)}`,
      {
        auth: "session-jwt",
        host: "ccr-session",
        headers: {
          "anthropic-version": "2023-06-01",
        },
        timeout: HTTP_TIMEOUT_MS,
        signal,
      },
    );
    if (!s.ok) {
      logForDiagnosticsNoPII("warn", "stage_file_list_gated", {
        reason: s.reason,
        duration_ms: n(),
      });
      return {
        ok: false,
        error: `list gated: ${s.reason}`,
        gated: true,
        permanent: true,
      };
    }
    if (s.status < 200 || s.status >= 300) {
      logForDiagnosticsNoPII("warn", "stage_file_list_failed", {
        kind: "http",
        status: s.status,
        duration_ms: n(),
      });
      return {
        ok: false,
        error: `list failed: http ${s.status}`,
        status: s.status,
        ...(isPermanentHttpStatus(s.status) && {
          permanent: true,
        }),
      };
    }
    let { filestore_jwt: filestoreJwt, filesystem_id: filesystemId, filestore_url: filestoreUrl } = s.data;
    return {
      ok: true,
      data: {
        filestore_jwt: filestoreJwt,
        filesystem_id: filesystemId,
        filestore_url: filestoreUrl,
      },
    };
  } catch (error) {
    let { kind, status, message, permanent } = requestFailure("list", error);
    logForDiagnosticsNoPII("warn", "stage_file_list_failed", {
      kind,
      status,
      duration_ms: n(),
    });
    return {
      ok: false,
      error: message,
      status,
      permanent,
    };
  }
}
//@ chunk-rqpqwy1q.js:15894-18121 placement
/**
 * 带凭据刷新的 filestore 调用
 */
async function withFilestoreCredential(path, t, r, n, minted) {
  let startTime = performance.now();
  let d = () => Math.round(performance.now() - startTime);
  let S = r === undefined ? () => fetchAndParseCredential(undefined, n) : oneShotCredentialFetcher(r);
  let h = minted ?? (await S());
  if (!h.ok) return h;
  let cred = h.cred;
  for (let idx = 0; idx <= 1; idx++) {
    let abortController = new AbortController();
    let w;
    let E = () => {
      if (w) w.refresh();
      else
        w = setTimeout(
          (_) => _.abort(Error("readFile stall: no bytes for 60s")),
          READ_STALL_TIMEOUT_MS,
          abortController,
        );
    };
    E();
    try {
      let _ = await apiClient.post(
        "/v1/filestore/fs/readFile",
        {
          filesystem_id: cred.filesystemId,
          path,
        },
        {
          auth: "none",
          host: "api",
          baseUrl: cred.filestoreUrl,
          headers: {
            Authorization: `Bearer ${cred.filestoreJwt}`,
          },
          responseType: "stream",
          timeout: 0,
          signal: abortController.signal,
          validateStatus: () => true,
        },
      );
      if (!_.ok) {
        clearTimeout(w);
        logForDiagnosticsNoPII("warn", "stage_file_read_gated", {
          reason: _.reason,
          duration_ms: d(),
        });
        return {
          ok: false,
          error: `read gated: ${_.reason}`,
          gated: true,
        };
      }
      if (_.status === 401 && idx === 0) {
        clearTimeout(w);
        if (_.data instanceof Readable) _.data.destroy();
        logForDiagnosticsNoPII("info", "stage_file_read_remint_jwt", {
          duration_ms: d(),
        });
        h = await S();
        if (!h.ok) return h;
        cred = h.cred;
        continue;
      }
      if (_.status < 200 || _.status >= 300) {
        clearTimeout(w);
        if (_.data instanceof Readable) _.data.destroy();
        logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
          kind: "http",
          status: _.status,
          duration_ms: d(),
        });
        return {
          ok: false,
          error: `read failed: http ${_.status}`,
          ...(isPermanentHttpStatus(_.status) && {
            permanent: true,
          }),
        };
      }
      let b = Number(_.response?.headers["content-length"] ?? -1);
      _.data.on("data", E);
      await pipeline(
        _.data,
        createWriteStream(t, {
          flags: "wx",
        }),
      );
      clearTimeout(w);
      let R = await stat(t, {
        bigint: true,
      });
      let O = Number(R.size);
      if (b >= 0 && O !== b) {
        logForDiagnosticsNoPII("warn", "stage_file_read_truncated", {
          expected: b,
          got: O,
          duration_ms: d(),
        });
        return {
          ok: false,
          error: `read truncated: got ${O} of ${b} bytes`,
        };
      }
      let { ino, birthtimeNs, size, mtimeNs } = R;
      return {
        ok: true,
        bytes: O,
        written: {
          ino,
          birthtimeNs,
          size,
          mtimeNs,
        },
      };
    } catch (error) {
      clearTimeout(w);
      let b = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
      if (b && !("isAxiosError" in error)) {
        logForDiagnosticsNoPII("warn", "stage_file_write_failed", {
          code: b,
          duration_ms: d(),
        });
        return {
          ok: false,
          error: `write failed: ${b}`,
          errno: b,
        };
      }
      if (abortController.signal.aborted) {
        logForDiagnosticsNoPII("warn", "stage_file_read_stalled", {
          stall_ms: READ_STALL_TIMEOUT_MS,
          duration_ms: d(),
        });
        return {
          ok: false,
          error: `read stalled: no bytes for ${READ_STALL_TIMEOUT_MS}ms`,
        };
      }
      let { kind, status, message, permanent } = requestFailure("read", error);
      logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
        kind,
        status,
        duration_ms: d(),
      });
      return {
        ok: false,
        error: message,
        permanent,
      };
    }
  }
  throw Error("unreachable: fetchFilestoreToFile retry loop fell through");
}
//@ chunk-rqpqwy1q.js:18121-18136 placement
var MAX_CLIENT_CONTENT_LENGTH = 1048576;
//@ chunk-rqpqwy1q.js:18136-20148 placement
/**
 * 创建 filestore 客户端
 */
async function createFilestoreClient(signal) {
  let t = await fetchAndParseCredential(signal);
  if (!t.ok) return t;
  let { filestoreJwt, filesystemId, filestoreUrl } = t.cred;
  let l = {
    auth: "none",
    host: "api",
    baseUrl: filestoreUrl,
    headers: {
      Authorization: `Bearer ${filestoreJwt}`,
    },
    timeout: HTTP_TIMEOUT_MS,
  };
  async function d(path, { maxBytes: y, signal: c } = {}) {
    let startTime = performance.now();
    let w = () => Math.round(performance.now() - startTime);
    try {
      let E = await apiClient.post(
        "/v1/filestore/fs/readFile",
        {
          filesystem_id: filesystemId,
          path,
        },
        {
          ...l,
          responseType: "arraybuffer",
          maxContentLength: y ?? MAX_DOWNLOAD_BYTES,
          signal: c,
        },
      );
      if (!E.ok) {
        logForDiagnosticsNoPII("warn", "stage_file_read_gated", {
          reason: E.reason,
          duration_ms: w(),
        });
        return {
          ok: false,
          error: `read gated: ${E.reason}`,
          gated: true,
        };
      }
      if (E.status < 200 || E.status >= 300) {
        logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
          kind: "http",
          status: E.status,
          duration_ms: w(),
        });
        return {
          ok: false,
          error: `read failed: http ${E.status}`,
          status: E.status,
          ...(E.status === 404 && {
            notFound: true,
          }),
        };
      }
      return {
        ok: true,
        buf: Buffer.from(E.data),
      };
    } catch (error) {
      let { kind, status, message } = requestFailure("read", error);
      logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
        kind,
        status,
        duration_ms: w(),
      });
      return {
        ok: false,
        error: message,
        status,
        ...(status === 404 && {
          notFound: true,
        }),
        ...(isMaxContentLengthError(error) && {
          tooLarge: true,
        }),
      };
    }
  }
  async function S(path, { limit, signal }) {
    let startTime = performance.now();
    try {
      let w = await apiClient.post(
        "/v1/filestore/fs/listDirectory",
        {
          filesystem_id: filesystemId,
          path,
          limit,
        },
        {
          ...l,
          maxContentLength: MAX_CLIENT_CONTENT_LENGTH,
          signal,
        },
      );
      if (!w.ok) {
        logStageDirectoryFailure("gated", undefined, startTime);
        return {
          ok: false,
          error: `directory listing gated: ${w.reason}`,
          gated: true,
        };
      }
      if (w.status < 200 || w.status >= 300) {
        logStageDirectoryFailure("http", w.status, startTime);
        return {
          ok: false,
          error: `directory listing failed: http ${w.status}`,
          status: w.status,
          ...(w.status === 404 && {
            notFound: true,
          }),
        };
      }
      let E = DIRECTORY_LISTING_SCHEMA().safeParse(w.data);
      if (!E.success) {
        logStageDirectoryFailure("shape", w.status, startTime);
        return {
          ok: false,
          error: "directory listing failed: unexpected answer",
          status: w.status,
        };
      }
      let entries = E.data.entries ?? [];
      let sliced = entries.slice(0, limit);
      return {
        ok: true,
        files: sliced.flatMap((R) => R.file?.path ?? []),
        directories: sliced.flatMap((R) => R.directory?.path ?? []),
        more: entries.length > limit || (E.data.cursor ?? "") !== "",
      };
    } catch (error) {
      let { kind, status, message } = requestFailure("directory listing", error);
      logStageDirectoryFailure(kind, status, startTime);
      return {
        ok: false,
        error: message,
        status,
        ...(status === 404 && {
          notFound: true,
        }),
      };
    }
  }
  return {
    ok: true,
    reader: {
      readBytes: d,
      listDirectory: S,
    },
  };
}
//@ chunk-rqpqwy1q.js:20148-20283 placement
function logStageDirectoryFailure(kind, status, r) {
  logForDiagnosticsNoPII(status === 404 ? "info" : "warn", "stage_file_directory_failed", {
    kind,
    status,
    duration_ms: Math.round(performance.now() - r),
  });
}
//@ chunk-rqpqwy1q.js:20283-20416 placement
var DIRECTORY_LISTING_SCHEMA = DoctorLazy(() =>
  u({
    entries: array(
      u({
        file: u({
          path: string(),
        }).optional(),
        directory: u({
          path: string(),
        }).optional(),
      }),
    ).optional(),
    cursor: string().optional(),
  }),
);
//@ chunk-rqpqwy1q.js:20416-20506 placement
async function fetchFilestoreBytes(e, t = {}) {
  let filestoreClient = await createFilestoreClient(t.signal);
  return filestoreClient.ok ? filestoreClient.reader.readBytes(e, t) : filestoreClient;
}
export { sweepStaleStageTmps, stageTmpStem };
