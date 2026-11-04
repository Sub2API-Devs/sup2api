/**
 * utils/stageFileStoreCheck.ts
 *
 * 2.1.316 新增。stage_file 与 filestore 内容比对（大小与 md5）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0f0jmzwa.js (9)
 * attribution: placement 9
 */
import { createHash } from "crypto";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { identity } from "./identity.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, union, stringSchema, numberSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { apiClient } from "../services/routines/routinesApi.js";
import { classifyAxiosError } from "./errors.js";
import { withDeadline } from "./sleep.js";
import { openRegularFileForReadWithNoAtime } from "./fsSafety/boundOpen.js";

//@ chunk-0f0jmzwa.js:522-610 placement
function sameStandingFlag() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_ledger", "off");
  return featureValue_CACHED_MAY_BE_STALE === "count" || featureValue_CACHED_MAY_BE_STALE === "on"
    ? featureValue_CACHED_MAY_BE_STALE
    : "off";
}
//@ chunk-0f0jmzwa.js:610-700 placement
/**
 * 直接比较流水线里允许的最大文件字节数（64 MiB）。
 */
var SAME_STANDING_MAX_BYTES = 67108864;
var STORE_CHECK_TIMEOUT_MS = 3000;
var MD5_TIMEOUT_MS = 1e4;
var STORE_CHECK_PAUSE_MS = 300000;
var storeCheckPauseState = identity(
  {
    pausedUntilMs: 0,
  },
  (state) => {
    state.pausedUntilMs = 0;
  },
);
//@ chunk-0f0jmzwa.js:700-749 placement
function storeCheckPaused() {
  return Date.now() < storeCheckPauseState.pausedUntilMs;
}
//@ chunk-0f0jmzwa.js:749-1010 placement
function pauseStoreCheck(cause, durationMs) {
  let max = Math.max(storeCheckPauseState.pausedUntilMs, Date.now() + durationMs);
  if (max === storeCheckPauseState.pausedUntilMs) return;
  storeCheckPauseState.pausedUntilMs = max;
  logForDiagnosticsNoPII("warn", "stage_file_store_check_paused", {
    cause,
    until: Number.isFinite(durationMs) ? "timer" : "process_exit",
    ...(Number.isFinite(durationMs) && {
      for_s: Math.round(durationMs / 1000),
    }),
  });
}
//@ chunk-0f0jmzwa.js:1010-1116 placement
/**
 * filestore 元数据响应 schema 与 md5 正则。
 */
var FILESTORE_METADATA_SCHEMA = DoctorLazy(() =>
  objectSchema({
    file: objectSchema({
      file: objectSchema({
        size: union([stringSchema(), numberSchema()]).optional(),
        md5: stringSchema().optional(),
      }),
    }),
  }),
);
var MD5_HEX_RE = /^[0-9a-f]{32}$/;
//@ chunk-0f0jmzwa.js:1116-2076 placement
/**
 * 向 filestore 询问已存文件的大小与 md5（/v1/filestore/fs/readFileMetadata），用于 stage_file 判断本地文件是否与存储一致；连续失败会暂停检查（tengu_quiet_ledger）。
 */
async function askStoreWhatItHolds(cred, path) {
  let abortSignal = AbortSignal.timeout(STORE_CHECK_TIMEOUT_MS);
  try {
    let response = await apiClient.post(
      "/v1/filestore/fs/readFileMetadata",
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
        timeout: STORE_CHECK_TIMEOUT_MS,
        signal: abortSignal,
        maxContentLength: 65536,
        validateStatus: () => true,
      },
    );
    if (!response.ok)
      return {
        answer: "not_sent",
      };
    if (response.status === 404)
      return {
        answer: "not_found",
      };
    if (response.status === 401)
      return {
        answer: "credential_expired",
      };
    if (response.status === 403)
      return {
        answer: "credential_refused",
      };
    if (response.status < 200 || response.status >= 300)
      return {
        answer: "other_http_status",
      };
    let parsed = FILESTORE_METADATA_SCHEMA().safeParse(response.data);
    if (!parsed.success)
      return {
        answer: "unexpected_shape",
      };
    let size = Number(parsed.data.file.file.size ?? 0);
    let lower = (parsed.data.file.file.md5 ?? "").toLowerCase();
    if (!Number.isSafeInteger(size) || size < 0)
      return {
        answer: "unexpected_shape",
      };
    return MD5_HEX_RE.test(lower)
      ? {
          answer: "size_and_md5",
          size,
          md5: lower,
        }
      : {
          answer: "no_usable_md5",
        };
  } catch (error) {
    return {
      answer:
        abortSignal.aborted || classifyAxiosError(error).kind === "timeout" ? "timed_out" : "request_error",
    };
  }
}
//@ chunk-0f0jmzwa.js:2076-2212 placement
function sameFileUntouched(openedStats, currentStats) {
  return (
    openedStats.dev === currentStats.dev &&
    openedStats.ino === currentStats.ino &&
    openedStats.nlink === currentStats.nlink &&
    openedStats.size === currentStats.size &&
    openedStats.mtimeNs === currentStats.mtimeNs &&
    openedStats.ctimeNs === currentStats.ctimeNs
  );
}
//@ chunk-0f0jmzwa.js:2212-2275 placement
async function hashStandingFile(path, openedStats) {
  return (await withDeadline(md5IfUntouched(path, openedStats), MD5_TIMEOUT_MS)) ?? "timed_out";
}
//@ chunk-0f0jmzwa.js:2275-2674 placement
/**
 * 文件未改动时计算 md5
 */
async function md5IfUntouched(path, openedStats) {
  let handle;
  try {
    let { handle: handle_2, withNoAtime } = await openRegularFileForReadWithNoAtime(path);
    handle = handle_2;
    let currentStats = await handle.stat({
      bigint: true,
    });
    if (!currentStats.isFile() || !sameFileUntouched(openedStats, currentStats)) return "changed";
    let hash = createHash("md5");
    for await (let chunk of handle.createReadStream({
      autoClose: false,
      start: 0,
      end: Number(currentStats.size),
      signal: AbortSignal.timeout(MD5_TIMEOUT_MS),
    }))
      hash.update(chunk);
    return {
      md5: hash.digest("hex"),
      opened: currentStats,
      withNoAtime,
    };
  } catch {
    return "unreadable";
  } finally {
    handle?.close().catch(() => {});
  }
}
export {
  SAME_STANDING_MAX_BYTES,
  storeCheckPaused,
  askStoreWhatItHolds,
  pauseStoreCheck,
  STORE_CHECK_PAUSE_MS,
  hashStandingFile,
  sameFileUntouched,
  sameStandingFlag,
};
