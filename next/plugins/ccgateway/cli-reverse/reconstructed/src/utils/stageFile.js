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
import { objectSchema, array, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-rqpqwy1q.js:1299-1340 placement
var MAX_TRACKED_STAGED_WRITES = 4096;
var stagedWriteState = identity(new Map(), (state) => state.clear());
//@ chunk-rqpqwy1q.js:1340-1482 placement
function recordStagedWrite(dest, written, renameTick) {
  stagedWriteState.delete(dest);
  stagedWriteState.set(dest, {
    written,
    renamedByNs: BigInt(renameTick + 1) * 1000000n,
  });
  if (stagedWriteState.size > MAX_TRACKED_STAGED_WRITES) {
    let [oldestDest] = stagedWriteState.keys();
    if (oldestDest !== undefined) stagedWriteState.delete(oldestDest);
  }
}
//@ chunk-rqpqwy1q.js:1482-1698 placement
/**
 * 已暂存文件的状态码
 */
function stagedFileState(dest, stats) {
  let record = stagedWriteState.get(dest);
  if (record === undefined) return 5;
  let { written } = record;
  if (written.ino !== stats.ino || written.birthtimeNs !== stats.birthtimeNs) return 3;
  if (written.size !== stats.size || written.mtimeNs !== stats.mtimeNs) return 4;
  return stats.ctimeNs <= record.renamedByNs ? 1 : 2;
}
//@ chunk-rqpqwy1q.js:1698-1713 placement
var MAX_COMPARE_BYTES = 1048576;
//@ chunk-rqpqwy1q.js:1713-2379 placement
/**
 * 描述已存在的文件
 */
async function describeExistingFile(dest, sourcePath, bytes) {
  let standing;
  try {
    let stats = await lstat(dest, {
      bigint: true,
    });
    if (!stats.isFile())
      return {
        replaced: "not_a_file",
      };
    let mtimeMs = Number(stats.mtimeNs / 1000n) / 1000;
    standing = {
      bytes: Number(stats.size),
      ageSeconds: Math.max(0, Math.round((Date.now() - mtimeMs) / 1000)),
      readOnly: (Number(stats.mode) & 146) === 0,
      vsPlaced: stagedFileState(dest, stats),
    };
    if (standing.bytes !== bytes)
      return {
        replaced: "different_contents",
        standing,
      };
    if (bytes > MAX_COMPARE_BYTES)
      return {
        replaced: "same_size_not_compared",
        standing,
      };
    let [smallFile, smallFile_2] = await Promise.all([readSmallFile(dest), readSmallFile(sourcePath)]);
    if (smallFile === null || smallFile_2 === null)
      return {
        replaced: "unknown",
        standing,
      };
    return {
      replaced: smallFile.equals(smallFile_2) ? "same_contents" : "different_contents",
      standing,
    };
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          replaced: "nothing",
        }
      : {
          replaced: "unknown",
          standing,
        };
  }
}
//@ chunk-rqpqwy1q.js:2379-2570 placement
/**
 * 读取小文件
 */
async function readSmallFile(path) {
  let regularFileForRead = await openRegularFileForRead(path);
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
function stageFileWireResult(result) {
  return {
    ok: true,
    ...(result.noop !== undefined && {
      noop: result.noop,
    }),
    ...(result.replaced !== undefined && {
      replaced: result.replaced,
    }),
  };
}
//@ chunk-rqpqwy1q.js:3004-3109 placement
function getContainedRelativePath(root, target) {
  let relativePath = relative(root, target);
  if (
    relativePath === "" ||
    relativePath === "." ||
    relativePath.split(posixSep).includes("..") ||
    isAbsolute(relativePath)
  )
    return null;
  return relativePath;
}
//@ chunk-rqpqwy1q.js:3109-4095 placement
/**
 * 校验 mount_path
 */
function parseMountPath(mountPath, vouched = false) {
  if (mountPath.includes("\x00")) throw Error("mount_path contains null bytes");
  if (!isAbsolute(mountPath)) throw Error("mount_path must be absolute");
  if (mountPath.split(posixSep).includes("..")) throw Error('mount_path must not contain ".." segments');
  let normalizedPath = normalize(mountPath);
  let containedRelativePath = getContainedRelativePath(STAGE_FILE_HOME_MOUNT_PREFIX, normalizedPath);
  if (
    containedRelativePath !== null &&
    isClaudeAiChatOrigin() &&
    isFirstPartyRemoteSession(
      vouched ? "vouched" : env.CLAUDE_CODE_REMOTE_SESSION_ID,
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
  if (basename(normalizedPath).startsWith(STAGE_TMP_PREFIX))
    throw Error("mount_path names a reserved temporary-file name");
  let containedRelativePath_2 = getContainedRelativePath(STAGE_FILE_MOUNT_PREFIX, normalizedPath);
  if (containedRelativePath_2 !== null)
    return {
      dest: join(stageFileRoot, containedRelativePath_2),
      root: stageFileRoot,
      readOnly: true,
      neverReplace: false,
    };
  let containedRelativePath_3 = getContainedRelativePath(STAGE_FILE_OUTPUTS_MOUNT_PREFIX, normalizedPath);
  if (containedRelativePath_3 !== null) {
    if (
      !isFirstPartyRemoteSession(
        vouched ? "vouched" : env.CLAUDE_CODE_REMOTE_SESSION_ID,
        env.CLAUDE_CODE_ENVIRONMENT_KIND,
      )
    ) {
      let error = Error("staging under /outputs/ is only supported on managed remote sessions");
      error.code = "STAGE_OUTPUTS_UNSUPPORTED_RUNNER";
      throw error;
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
function addDirectoryDestFromMountPath(mountPath) {
  let parsed;
  try {
    parsed = parseMountPath(mountPath);
  } catch (error) {
    if (getErrnoCode(error) === "STAGE_OUTPUTS_UNSUPPORTED_RUNNER")
      throw Error("add_directory mount_path must be under /uploads/");
    if (!(error instanceof HomeWriteRefusedError)) throw error;
  }
  if (!parsed?.readOnly)
    throw Error("add_directory mount_path must be under /uploads/ and not under /uploads/.home/");
  return parsed.dest;
}
//@ chunk-rqpqwy1q.js:4540-4613 placement
function assertDestUnderRoot(dest, root) {
  if (!isAtOrUnderRoot(dest, root)) throw stageParentEscapeError("dest parent escaped stage root");
}
//@ chunk-rqpqwy1q.js:4613-4717 placement
function assertNoBackslashDirs(root, dest) {
  if (hasBackslash(root) || hasBackslash(dirname(dest)))
    throw stageParentEscapeError("a folder on the way to dest has a backslash in its name");
}
//@ chunk-rqpqwy1q.js:4717-4766 placement
function stageParentEscapeError(message) {
  let error = Error(message);
  error.code = STAGE_PARENT_ESCAPE;
  return error;
}
//@ chunk-rqpqwy1q.js:4766-4821 placement
function stageTmpStem(filePath) {
  return `${STAGE_TMP_PREFIX}${computeContentHash(basename(filePath)).slice(0, 16)}.`;
}
//@ chunk-rqpqwy1q.js:4821-5028 placement
async function sweepStaleStageTmps(dir, stem) {
  let staleBefore = Date.now() - 2 * READ_STALL_TIMEOUT_MS;
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    names
      .filter((name) => name.startsWith(stem))
      .map(async (name) => {
        let tempPath = join(dir, name);
        try {
          if ((await stat(tempPath)).mtimeMs < staleBefore) await unlink(tempPath);
        } catch {}
      }),
  );
}
//@ chunk-rqpqwy1q.js:5028-5103 placement
function isFreshFile(stats, cutoffMs) {
  return stats !== null && stats.isFile() && (stats.mtimeMs >= cutoffMs || stats.ctimeMs >= cutoffMs);
}
//@ chunk-rqpqwy1q.js:5103-5173 placement
function isReadOnlyFsError(error) {
  return typeof error === "object" && error !== null && error.code === "EROFS";
}
//@ chunk-rqpqwy1q.js:5173-5331 placement
/**
 * 请求失败描述
 */
function requestFailure(label, error) {
  let { kind, status } = classifyAxiosError(error);
  return {
    kind,
    status,
    message: `${label} failed: ${kind}${status ? ` ${status}` : ""}`,
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
async function stageFile(
  request,
  remoteSessionId,
  homeFilesMode = "off",
  inPlaceRequest,
  storeCheckMode = "off",
) {
  if (remoteSessionId === undefined && !env.CLAUDE_CODE_REMOTE_SESSION_ID)
    return {
      ok: false,
      error: "CLAUDE_CODE_REMOTE_SESSION_ID unset",
      permanent: true,
    };
  if (remoteSessionId !== undefined && request.filestore_path)
    return {
      ok: false,
      error: "synced documents are not staged here",
    };
  if (request.filestore_path) {
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
    let { stageSyncedFile, SYNCED_FILE_ROOT } = await import("../services/syncedFiles/syncedFileSyncer.js");
    return stageSyncedFile(
      {
        mount_path: request.mount_path,
        filestore_path: request.filestore_path,
        content_sha256: request.content_sha256,
        expected_local_sha256: request.expected_local_sha256,
      },
      fetchFilestoreBytes,
      SYNCED_FILE_ROOT,
    );
  }
  let parsed;
  try {
    parsed = parseMountPath(request.mount_path, remoteSessionId !== undefined);
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
  if (parsed.neverReplace && homeFilesMode === "off") {
    logHomeStage("home_files_off", {});
    return {
      ok: true,
      noop: "home_files_off",
    };
  }
  if (parsed.neverReplace && request.resync !== undefined) {
    logHomeStage("resent_announcement", {});
    return {
      ok: true,
      noop: "resent_announcement",
    };
  }
  if (parsed.neverReplace && request.force !== false) {
    logHomeStage("unchecked_announcement", {});
    return {
      ok: true,
      noop: "unchecked_announcement",
    };
  }
  if (parsed.neverReplace && homeFilesMode === "not_loaded") {
    logHomeStage("flag_not_loaded", {});
    return {
      ok: false,
      error: "the flag for home files has not loaded",
    };
  }
  let outputFields = parsed.readOnly
    ? {}
    : {
        outputPath: parsed.dest,
      };
  if (!request.force && !parsed.neverReplace)
    try {
      if ((await stat(parsed.dest)).isFile()) {
        logForDiagnosticsNoPII("debug", "stage_file_noop_already_present", {});
        logEvent("tengu_stage_file_completed", {
          ok: true,
          noop_already_present: true,
          duration_ms: 0,
        });
        return {
          ok: true,
          noop: "already_present",
          ...outputFields,
        };
      }
    } catch {}
  let now = Date.now();
  return runStageForRoot(
    request.mount_path,
    parsed,
    now,
    remoteSessionId,
    inPlaceRequestId(request, inPlaceRequest),
    request.force === true ? storeCheckMode : "off",
  );
}
//@ chunk-rqpqwy1q.js:7276-7310 placement
var stageLimitersByRoot = identity(new Map(), (limiters) => limiters.clear());
//@ chunk-rqpqwy1q.js:7310-7421 placement
function runStageForRoot(mountPath, parsed, queuedAt, remoteSessionId, inPlaceRequestId, storeCheckMode) {
  let limiter = stageLimitersByRoot.get(parsed.root);
  if (limiter === undefined) {
    limiter = limitConcurrency(MAX_CONCURRENT_STAGES, stageOne);
    stageLimitersByRoot.set(parsed.root, limiter);
  }
  return limiter(mountPath, parsed, queuedAt, remoteSessionId, inPlaceRequestId, storeCheckMode);
}
//@ chunk-rqpqwy1q.js:7421-7497 placement
function stageOne(...args) {
  let [path, parsed, queuedAt, remoteSessionId] = args;
  return parsed.neverReplace ? stageToHome(path, parsed, queuedAt, remoteSessionId) : stageToRoot(...args);
}
//@ chunk-rqpqwy1q.js:7497-8769 placement
/**
 * 与存储副本比较
 */
async function compareWithStore(path, stats, path_2) {
  let startTime = performance.now();
  if (
    stats === undefined ||
    !stats.isFile() ||
    stats.nlink !== 1n ||
    stats.size > BigInt(SAME_STANDING_MAX_BYTES)
  )
    return;
  if (storeCheckPaused())
    return {
      compared: {
        storeAnswer: "not_asked_while_paused",
        verdict: "no_size_and_md5_from_store",
        checkMs: 0,
        bytes: Number(stats.size),
        hashMayHaveChangedAtime: false,
      },
    };
  let credential = await fetchAndParseCredential();
  if (!credential.ok)
    return {
      minted: credential,
    };
  let storeAnswer = await askStoreWhatItHolds(credential.cred, path_2);
  let verdict;
  let hashMayHaveChangedAtime = false;
  if (storeAnswer.answer !== "size_and_md5") {
    verdict = "no_size_and_md5_from_store";
    if (storeAnswer.answer === "credential_refused" || storeAnswer.answer === "not_sent")
      pauseStoreCheck(storeAnswer.answer, 1 / 0);
    else if (
      storeAnswer.answer === "timed_out" ||
      storeAnswer.answer === "credential_expired" ||
      storeAnswer.answer === "request_error" ||
      storeAnswer.answer === "other_http_status"
    )
      pauseStoreCheck(storeAnswer.answer, STORE_CHECK_PAUSE_MS);
  } else if (BigInt(storeAnswer.size) !== stats.size) verdict = "size_differs";
  else if ((Number(stats.mode) & 4095) !== 292) verdict = "local_file_mode_not_0444";
  else {
    let localHash = await hashStandingFile(path, stats);
    if (typeof localHash === "string") {
      verdict =
        localHash === "timed_out"
          ? "local_file_hash_timed_out"
          : localHash === "changed"
            ? "local_file_changed"
            : "local_file_unreadable";
      if (localHash === "timed_out") pauseStoreCheck("local_file_hash_timed_out", 1 / 0);
    } else {
      hashMayHaveChangedAtime = !localHash.withNoAtime;
      let afterStats = await lstat(path, {
        bigint: true,
      }).catch(() => {
        return;
      });
      verdict =
        afterStats === undefined || !sameFileUntouched(localHash.opened, afterStats)
          ? "local_file_changed"
          : localHash.md5 === storeAnswer.md5
            ? "same_contents"
            : "md5_differs";
    }
  }
  return {
    minted: credential,
    compared: {
      storeAnswer: storeAnswer.answer,
      verdict,
      checkMs: Math.round(performance.now() - startTime),
      bytes: Number(stats.size),
      hashMayHaveChangedAtime,
    },
  };
}
//@ chunk-rqpqwy1q.js:8769-12750 placement
/**
 * 暂存到挂载根
 */
async function stageToRoot(
  path,
  { dest, root, readOnly },
  queuedAt,
  remoteSessionId,
  inPlaceRequestId,
  storeCheckMode,
) {
  let startTime = performance.now();
  let queuedMs = Math.max(0, Date.now() - queuedAt);
  let elapsedMs = () => Math.round(performance.now() - startTime);
  let isInPlace = inPlaceRequestId !== undefined;
  let tryReadOnlyMount = readOnly && !isInPlace && !env.CLAUDE_STAGE_FILE_ROOT;
  let inPlaceFields = isInPlace
    ? {
        in_place: true,
      }
    : {};
  let tempStem = stageTmpStem(dest);
  let destStats;
  let tempPath = join(dirname(dest), `${tempStem}${Date.now()}.${Math.random().toString(36).slice(2)}`);
  try {
    assertNoBackslashDirs(root, dest);
    await mkdir(dirname(dest), {
      recursive: true,
    });
    let realRoot = await realpath(root);
    let realDestDir = await realpath(dirname(dest));
    assertDestUnderRoot(realRoot, realDestDir);
    destStats = await lstat(dest, {
      bigint: true,
    }).catch((error) => {
      if (getErrnoCode(error) === "ENAMETOOLONG") throw error;
      return;
    });
    await sweepStaleStageTmps(dirname(dest), tempStem);
  } catch (error) {
    let errorCode =
      typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
    if (tryReadOnlyMount && isReadOnlyFsError(error)) {
      logEvent("tengu_stage_file_completed", {
        ok: true,
        noop: true,
        duration_ms: elapsedMs(),
        queued_ms: queuedMs,
        bytes: 0,
      });
      logForDiagnosticsNoPII("debug", "stage_file_noop_readonly_mount", {
        duration_ms: elapsedMs(),
      });
      return {
        ok: true,
        noop: "readonly_mount",
      };
    }
    logEvent("tengu_stage_file_completed", {
      ok: false,
      duration_ms: elapsedMs(),
      queued_ms: queuedMs,
      ...inPlaceFields,
    });
    logForDiagnosticsNoPII("warn", "stage_file_mkdir_failed", {
      code: errorCode,
      duration_ms: elapsedMs(),
      queued_ms: queuedMs,
    });
    if (!readOnly) logFeatureBad("ccr_stage_file_outputs", "mkdir_failed");
    return {
      ok: false,
      error: `mkdir failed: ${errorCode}`,
      ...(PERMANENT_ERRNOS.has(errorCode) && {
        permanent: true,
      }),
    };
  }
  let compared =
    storeCheckMode !== "off" && readOnly && !isInPlace && remoteSessionId === undefined
      ? await compareWithStore(dest, destStats, path)
      : undefined;
  let compared_2 = compared?.compared;
  let comparedFields =
    compared_2 === undefined
      ? {}
      : {
          store_check_mode: fromEnumOpt(storeCheckMode),
          store_check_answer: fromEnumOpt(compared_2.storeAnswer),
          store_check_verdict: fromEnumOpt(compared_2.verdict),
          store_check_ms: compared_2.checkMs,
        };
  if (storeCheckMode === "on" && compared_2?.verdict === "same_contents") {
    let atimeFields = compared_2.hashMayHaveChangedAtime
      ? {
          store_check_may_have_changed_atime: true,
        }
      : {};
    logEvent("tengu_stage_file_completed", {
      ok: true,
      noop: true,
      noop_already_present: true,
      duration_ms: elapsedMs(),
      queued_ms: queuedMs,
      bytes: 0,
      replaced: fromEnumOpt("same_contents"),
      download_skipped_bytes: compared_2.bytes,
      ...comparedFields,
      ...atimeFields,
    });
    logForDiagnosticsNoPII("info", "stage_file_noop_matches_store", {
      duration_ms: elapsedMs(),
      queued_ms: queuedMs,
      download_skipped_bytes: compared_2.bytes,
      store_check_ms: compared_2.checkMs,
      ...atimeFields,
    });
    return {
      ok: true,
      noop: "already_present",
      replaced: "same_contents",
    };
  }
  let uploaded = await withFilestoreCredential(
    path,
    tempPath,
    remoteSessionId,
    inPlaceRequestId,
    compared?.minted,
  );
  if (!uploaded.ok) {
    await unlink(tempPath).catch(() => {});
    if (tryReadOnlyMount && uploaded.errno === "EROFS") {
      logEvent("tengu_stage_file_completed", {
        ok: true,
        noop: true,
        duration_ms: elapsedMs(),
        queued_ms: queuedMs,
        bytes: 0,
      });
      logForDiagnosticsNoPII("debug", "stage_file_noop_readonly_mount", {
        duration_ms: elapsedMs(),
      });
      return {
        ok: true,
        noop: "readonly_mount",
      };
    }
    logEvent("tengu_stage_file_completed", {
      ok: false,
      gated: uploaded.gated,
      duration_ms: elapsedMs(),
      queued_ms: queuedMs,
      ...inPlaceFields,
    });
    if (!readOnly) logFeatureBad("ccr_stage_file_outputs", "fetch_failed");
    return {
      ok: false,
      error: uploaded.error,
      ...((uploaded.permanent === true ||
        uploaded.gated === true ||
        (uploaded.errno !== undefined && PERMANENT_ERRNOS.has(uploaded.errno))) && {
        permanent: true,
      }),
    };
  }
  let bytes = uploaded.bytes;
  let fetchMs = elapsedMs();
  let { replaced, standing } = readOnly ? await describeExistingFile(dest, tempPath, bytes) : {};
  try {
    if (!readOnly) {
      let destStats = await stat(dest).catch(() => null);
      if (isFreshFile(destStats, queuedAt)) {
        await unlink(tempPath).catch(() => {});
        logEvent("tengu_stage_file_completed", {
          ok: true,
          noop: true,
          duration_ms: elapsedMs(),
          queued_ms: queuedMs,
          bytes: 0,
          outputs_root: true,
        });
        logForDiagnosticsNoPII("info", "stage_file_noop_newer_local", {
          duration_ms: elapsedMs(),
        });
        logFeatureOk("ccr_stage_file_outputs");
        return {
          ok: true,
          noop: "newer_local",
        };
      }
    }
    await chmod(tempPath, readOnly ? 292 : 420);
    await rename(tempPath, dest);
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    if (tryReadOnlyMount && isReadOnlyFsError(error)) {
      logEvent("tengu_stage_file_completed", {
        ok: true,
        noop: true,
        fetch_ms: fetchMs,
        duration_ms: elapsedMs(),
        queued_ms: queuedMs,
        bytes: 0,
      });
      logForDiagnosticsNoPII("debug", "stage_file_noop_readonly_mount", {
        duration_ms: elapsedMs(),
      });
      return {
        ok: true,
        noop: "readonly_mount",
      };
    }
    let errorCode =
      typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
    logEvent("tengu_stage_file_completed", {
      ok: false,
      fetch_ms: fetchMs,
      duration_ms: elapsedMs(),
      queued_ms: queuedMs,
      bytes,
      ...inPlaceFields,
    });
    logForDiagnosticsNoPII("warn", "stage_file_write_failed", {
      code: errorCode,
      duration_ms: elapsedMs(),
      queued_ms: queuedMs,
    });
    if (!readOnly) logFeatureBad("ccr_stage_file_outputs", "write_failed");
    return {
      ok: false,
      error: `write failed: ${errorCode}`,
      ...(PERMANENT_ERRNOS.has(errorCode) && {
        permanent: true,
      }),
    };
  }
  if (readOnly) recordStagedWrite(dest, uploaded.written, Date.now());
  logEvent("tengu_stage_file_completed", {
    ok: true,
    fetch_ms: fetchMs,
    duration_ms: elapsedMs(),
    queued_ms: queuedMs,
    bytes,
    outputs_root: !readOnly,
    ...inPlaceFields,
    replaced: fromEnumOpt(replaced),
    ...(standing !== undefined && {
      standing_vs_placed_code: standing.vsPlaced,
    }),
    ...comparedFields,
  });
  if (!readOnly) logFeatureOk("ccr_stage_file_outputs");
  logForDiagnosticsNoPII(replaced === "different_contents" ? "warn" : "info", "stage_file_ok", {
    bytes,
    fetch_ms: fetchMs,
    duration_ms: elapsedMs(),
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
    ...(compared_2 !== undefined && {
      store_check_mode: storeCheckMode,
      store_check_answer: compared_2.storeAnswer,
      store_check_verdict: compared_2.verdict,
      store_check_ms: compared_2.checkMs,
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
function logHomeStage(outcome, extraFields) {
  let isFailure =
    outcome === "flag_not_loaded" ||
    outcome === "probe_failed" ||
    outcome === "fetch_failed" ||
    outcome === "place_failed";
  logForDiagnosticsNoPII(isFailure ? "warn" : "info", "stage_file_home", {
    outcome,
    ...extraFields,
  });
  logEvent("tengu_stage_file_completed", {
    ok: !isFailure,
    noop: !isFailure && outcome !== "placed",
    home_root: true,
    bytes: extraFields.bytes ?? 0,
    duration_ms: extraFields.duration_ms ?? 0,
    queued_ms: extraFields.queued_ms ?? 0,
  });
  if (isFailure) logFeatureBad("ccr_stage_file_home", outcome);
  else if (outcome === "placed" || outcome === "already_present") logFeatureOk("ccr_stage_file_home");
  else logFeatureSad("ccr_stage_file_home", outcome);
}
//@ chunk-rqpqwy1q.js:13187-13455 placement
/**
 * home 暂存结果
 */
function homeStageResult(outcomeResult, outputPath, extraFields) {
  switch (outcomeResult.outcome) {
    case "placed":
      logHomeStage(outcomeResult.outcome, extraFields);
      return {
        ok: true,
        outputPath,
      };
    case "already_present":
    case "path_occupied":
      logHomeStage(outcomeResult.outcome, extraFields);
      return {
        ok: true,
        noop: outcomeResult.outcome,
      };
    case "refused_name":
      logHomeStage(outcomeResult.outcome, {
        refusal: outcomeResult.refusal,
        ...extraFields,
      });
      return {
        ok: true,
        noop: outcomeResult.outcome,
      };
  }
}
//@ chunk-rqpqwy1q.js:13455-14264 placement
/**
 * 暂存到 home 根
 */
async function stageToHome(path, { dest, root }, queuedAt, remoteSessionId) {
  let startTime = performance.now();
  let queuedMs = Math.max(0, Date.now() - queuedAt);
  let timingFields = () => ({
    duration_ms: Math.round(performance.now() - startTime),
    queued_ms: queuedMs,
  });
  let relativePath = relative(root, dest);
  let tempPath = join(root, `${stageTmpStem(dest)}${Date.now()}.${Math.random().toString(36).slice(2)}`);
  try {
    let earlyOutcome = await checkHomeTarget(root, relativePath);
    await sweepStaleStageTmps(root, STAGE_TMP_PREFIX);
    if (earlyOutcome !== undefined) return homeStageResult(earlyOutcome, dest, timingFields());
  } catch (error) {
    let errnoCode = getErrnoCode(error) ?? "unknown";
    logHomeStage("probe_failed", {
      code: errnoCode,
      ...timingFields(),
    });
    return {
      ok: false,
      error: `mkdir failed: ${errnoCode}`,
    };
  }
  try {
    let fetched = await withFilestoreCredential(path, tempPath, remoteSessionId);
    if (!fetched.ok && !fetched.gated && remoteSessionId === undefined) {
      await unlink(tempPath).catch(() => {});
      await sleep(UNLINK_RETRY_DELAY_MS);
      fetched = await withFilestoreCredential(path, tempPath, remoteSessionId);
    }
    if (!fetched.ok) {
      logHomeStage("fetch_failed", {
        code: fetched.errno,
        ...timingFields(),
      });
      return {
        ok: false,
        error: fetched.error,
      };
    }
    return homeStageResult(await publishHomeFile(tempPath, root, relativePath, undefined), dest, {
      bytes: fetched.bytes,
      ...timingFields(),
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error) ?? "unknown";
    logHomeStage("place_failed", {
      code: errnoCode,
      ...timingFields(),
    });
    return {
      ok: false,
      error: `write failed: ${errnoCode}`,
    };
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
//@ chunk-rqpqwy1q.js:14264-14305 placement
var CREDENTIAL_EXPIRED_TEXT = "read failed: credential expired";
//@ chunk-rqpqwy1q.js:14305-14393 placement
function oneShotCredentialFetcher(credentialJson) {
  let used = false;
  return async () => {
    if (used)
      return {
        ok: false,
        error: CREDENTIAL_EXPIRED_TEXT,
      };
    used = true;
    return parseFilestoreCredential(credentialJson);
  };
}
//@ chunk-rqpqwy1q.js:14393-14720 placement
/**
 * 解析 filestore 凭据
 */
function parseFilestoreCredential(response) {
  let { filestore_jwt: filestoreJwt, filesystem_id: filesystemId } = response;
  if (!filestoreJwt || !filesystemId)
    return {
      ok: false,
      error: "list returned incomplete credential",
      permanent: true,
    };
  let filestoreUrl = httpsOrigin(response.filestore_url);
  if (response.filestore_url && !filestoreUrl)
    logForDiagnosticsNoPII("warn", "stage_file_filestore_url_rejected", {
      reason: invalidHttpsUrlReason(response.filestore_url),
    });
  return {
    ok: true,
    cred: {
      filestoreJwt,
      filesystemId,
      filestoreUrl,
    },
  };
}
//@ chunk-rqpqwy1q.js:14720-14788 placement
async function fetchAndParseCredential(signal, timeoutMs) {
  let listed = await listFilestoreCredential(signal, timeoutMs);
  return listed.ok ? parseFilestoreCredential(listed.data) : listed;
}
//@ chunk-rqpqwy1q.js:14788-14882 placement
var FILESTORE_FILES_PATH = "/worker/files";
var STAGE_REQUEST_ID = "stage_request_id";
var IN_PLACE_REQUEST_ID_RE = /^stage-file-inplace-req_[0-9A-Za-z_]{1,72}$/;
//@ chunk-rqpqwy1q.js:14882-14964 placement
function inPlaceRequestId(request, requestId) {
  return request.in_place === true && typeof requestId === "string" && IN_PLACE_REQUEST_ID_RE.test(requestId)
    ? requestId
    : undefined;
}
//@ chunk-rqpqwy1q.js:14964-15894 placement
/**
 * 拉取 filestore 凭据
 */
async function listFilestoreCredential(signal, timeoutMs) {
  let startTime = performance.now();
  let elapsedMs = () => Math.round(performance.now() - startTime);
  try {
    let response = await apiClient.get(
      timeoutMs === undefined
        ? FILESTORE_FILES_PATH
        : `${FILESTORE_FILES_PATH}?${STAGE_REQUEST_ID}=${encodeURIComponent(timeoutMs)}`,
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
    if (!response.ok) {
      logForDiagnosticsNoPII("warn", "stage_file_list_gated", {
        reason: response.reason,
        duration_ms: elapsedMs(),
      });
      return {
        ok: false,
        error: `list gated: ${response.reason}`,
        gated: true,
        permanent: true,
      };
    }
    if (response.status < 200 || response.status >= 300) {
      logForDiagnosticsNoPII("warn", "stage_file_list_failed", {
        kind: "http",
        status: response.status,
        duration_ms: elapsedMs(),
      });
      return {
        ok: false,
        error: `list failed: http ${response.status}`,
        status: response.status,
        ...(isPermanentHttpStatus(response.status) && {
          permanent: true,
        }),
      };
    }
    let {
      filestore_jwt: filestoreJwt,
      filesystem_id: filesystemId,
      filestore_url: filestoreUrl,
    } = response.data;
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
      duration_ms: elapsedMs(),
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
async function withFilestoreCredential(path, tempPath, credentialJson, timeoutMs, minted) {
  let startTime = performance.now();
  let elapsedMs = () => Math.round(performance.now() - startTime);
  let fetchCredential =
    credentialJson === undefined
      ? () => fetchAndParseCredential(undefined, timeoutMs)
      : oneShotCredentialFetcher(credentialJson);
  let mintedResult = minted ?? (await fetchCredential());
  if (!mintedResult.ok) return mintedResult;
  let cred = mintedResult.cred;
  for (let idx = 0; idx <= 1; idx++) {
    let abortController = new AbortController();
    let stallTimer;
    let resetStallTimer = () => {
      if (stallTimer) stallTimer.refresh();
      else
        stallTimer = setTimeout(
          (controller) => controller.abort(Error("readFile stall: no bytes for 60s")),
          READ_STALL_TIMEOUT_MS,
          abortController,
        );
    };
    resetStallTimer();
    try {
      let response = await apiClient.post(
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
      if (!response.ok) {
        clearTimeout(stallTimer);
        logForDiagnosticsNoPII("warn", "stage_file_read_gated", {
          reason: response.reason,
          duration_ms: elapsedMs(),
        });
        return {
          ok: false,
          error: `read gated: ${response.reason}`,
          gated: true,
        };
      }
      if (response.status === 401 && idx === 0) {
        clearTimeout(stallTimer);
        if (response.data instanceof Readable) response.data.destroy();
        logForDiagnosticsNoPII("info", "stage_file_read_remint_jwt", {
          duration_ms: elapsedMs(),
        });
        mintedResult = await fetchCredential();
        if (!mintedResult.ok) return mintedResult;
        cred = mintedResult.cred;
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        clearTimeout(stallTimer);
        if (response.data instanceof Readable) response.data.destroy();
        logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
          kind: "http",
          status: response.status,
          duration_ms: elapsedMs(),
        });
        return {
          ok: false,
          error: `read failed: http ${response.status}`,
          ...(isPermanentHttpStatus(response.status) && {
            permanent: true,
          }),
        };
      }
      let expectedBytes = Number(response.response?.headers["content-length"] ?? -1);
      response.data.on("data", resetStallTimer);
      await pipeline(
        response.data,
        createWriteStream(tempPath, {
          flags: "wx",
        }),
      );
      clearTimeout(stallTimer);
      let writtenStats = await stat(tempPath, {
        bigint: true,
      });
      let writtenBytes = Number(writtenStats.size);
      if (expectedBytes >= 0 && writtenBytes !== expectedBytes) {
        logForDiagnosticsNoPII("warn", "stage_file_read_truncated", {
          expected: expectedBytes,
          got: writtenBytes,
          duration_ms: elapsedMs(),
        });
        return {
          ok: false,
          error: `read truncated: got ${writtenBytes} of ${expectedBytes} bytes`,
        };
      }
      let { ino, birthtimeNs, size, mtimeNs } = writtenStats;
      return {
        ok: true,
        bytes: writtenBytes,
        written: {
          ino,
          birthtimeNs,
          size,
          mtimeNs,
        },
      };
    } catch (error) {
      clearTimeout(stallTimer);
      let errnoCode =
        typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
      if (errnoCode && !("isAxiosError" in error)) {
        logForDiagnosticsNoPII("warn", "stage_file_write_failed", {
          code: errnoCode,
          duration_ms: elapsedMs(),
        });
        return {
          ok: false,
          error: `write failed: ${errnoCode}`,
          errno: errnoCode,
        };
      }
      if (abortController.signal.aborted) {
        logForDiagnosticsNoPII("warn", "stage_file_read_stalled", {
          stall_ms: READ_STALL_TIMEOUT_MS,
          duration_ms: elapsedMs(),
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
        duration_ms: elapsedMs(),
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
  let credential = await fetchAndParseCredential(signal);
  if (!credential.ok) return credential;
  let { filestoreJwt, filesystemId, filestoreUrl } = credential.cred;
  let requestDefaults = {
    auth: "none",
    host: "api",
    baseUrl: filestoreUrl,
    headers: {
      Authorization: `Bearer ${filestoreJwt}`,
    },
    timeout: HTTP_TIMEOUT_MS,
  };
  async function readBytes(path, { maxBytes, signal } = {}) {
    let startTime = performance.now();
    let elapsedMs = () => Math.round(performance.now() - startTime);
    try {
      let response = await apiClient.post(
        "/v1/filestore/fs/readFile",
        {
          filesystem_id: filesystemId,
          path,
        },
        {
          ...requestDefaults,
          responseType: "arraybuffer",
          maxContentLength: maxBytes ?? MAX_DOWNLOAD_BYTES,
          signal,
        },
      );
      if (!response.ok) {
        logForDiagnosticsNoPII("warn", "stage_file_read_gated", {
          reason: response.reason,
          duration_ms: elapsedMs(),
        });
        return {
          ok: false,
          error: `read gated: ${response.reason}`,
          gated: true,
        };
      }
      if (response.status < 200 || response.status >= 300) {
        logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
          kind: "http",
          status: response.status,
          duration_ms: elapsedMs(),
        });
        return {
          ok: false,
          error: `read failed: http ${response.status}`,
          status: response.status,
          ...(response.status === 404 && {
            notFound: true,
          }),
        };
      }
      return {
        ok: true,
        buf: Buffer.from(response.data),
      };
    } catch (error) {
      let { kind, status, message } = requestFailure("read", error);
      logForDiagnosticsNoPII("warn", "stage_file_read_failed", {
        kind,
        status,
        duration_ms: elapsedMs(),
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
  async function listDirectory(path, { limit, signal }) {
    let startTime = performance.now();
    try {
      let response = await apiClient.post(
        "/v1/filestore/fs/listDirectory",
        {
          filesystem_id: filesystemId,
          path,
          limit,
        },
        {
          ...requestDefaults,
          maxContentLength: MAX_CLIENT_CONTENT_LENGTH,
          signal,
        },
      );
      if (!response.ok) {
        logStageDirectoryFailure("gated", undefined, startTime);
        return {
          ok: false,
          error: `directory listing gated: ${response.reason}`,
          gated: true,
        };
      }
      if (response.status < 200 || response.status >= 300) {
        logStageDirectoryFailure("http", response.status, startTime);
        return {
          ok: false,
          error: `directory listing failed: http ${response.status}`,
          status: response.status,
          ...(response.status === 404 && {
            notFound: true,
          }),
        };
      }
      let parsed = DIRECTORY_LISTING_SCHEMA().safeParse(response.data);
      if (!parsed.success) {
        logStageDirectoryFailure("shape", response.status, startTime);
        return {
          ok: false,
          error: "directory listing failed: unexpected answer",
          status: response.status,
        };
      }
      let entries = parsed.data.entries ?? [];
      let sliced = entries.slice(0, limit);
      return {
        ok: true,
        files: sliced.flatMap((entry) => entry.file?.path ?? []),
        directories: sliced.flatMap((entry) => entry.directory?.path ?? []),
        more: entries.length > limit || (parsed.data.cursor ?? "") !== "",
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
      readBytes,
      listDirectory,
    },
  };
}
//@ chunk-rqpqwy1q.js:20148-20283 placement
function logStageDirectoryFailure(kind, status, startTime) {
  logForDiagnosticsNoPII(status === 404 ? "info" : "warn", "stage_file_directory_failed", {
    kind,
    status,
    duration_ms: Math.round(performance.now() - startTime),
  });
}
//@ chunk-rqpqwy1q.js:20283-20416 placement
var DIRECTORY_LISTING_SCHEMA = DoctorLazy(() =>
  objectSchema({
    entries: array(
      objectSchema({
        file: objectSchema({
          path: stringSchema(),
        }).optional(),
        directory: objectSchema({
          path: stringSchema(),
        }).optional(),
      }),
    ).optional(),
    cursor: stringSchema().optional(),
  }),
);
//@ chunk-rqpqwy1q.js:20416-20506 placement
async function fetchFilestoreBytes(path, options = {}) {
  let filestoreClient = await createFilestoreClient(options.signal);
  return filestoreClient.ok ? filestoreClient.reader.readBytes(path, options) : filestoreClient;
}
export {
  sweepStaleStageTmps,
  stageTmpStem,
  addDirectoryDestFromMountPath,
  fetchFilestoreBytes,
  stageFile,
  stageFileWireResult,
};
