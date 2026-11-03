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
import { u, union, string, E } from "../../vendor/zod/v4/classic/schemas.js";
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
  (e) => {
    e.pausedUntilMs = 0;
  },
);
//@ chunk-0f0jmzwa.js:700-749 placement
function storeCheckPaused() {
  return Date.now() < storeCheckPauseState.pausedUntilMs;
}
//@ chunk-0f0jmzwa.js:749-1010 placement
function pauseStoreCheck(cause, t) {
  let max = Math.max(storeCheckPauseState.pausedUntilMs, Date.now() + t);
  if (max === storeCheckPauseState.pausedUntilMs) return;
  storeCheckPauseState.pausedUntilMs = max;
  logForDiagnosticsNoPII("warn", "stage_file_store_check_paused", {
    cause,
    until: Number.isFinite(t) ? "timer" : "process_exit",
    ...(Number.isFinite(t) && {
      for_s: Math.round(t / 1000),
    }),
  });
}
//@ chunk-0f0jmzwa.js:1010-1116 placement
/**
 * filestore 元数据响应 schema 与 md5 正则。
 */
var FILESTORE_METADATA_SCHEMA = DoctorLazy(() =>
  u({
    file: u({
      file: u({
        size: union([string(), E()]).optional(),
        md5: string().optional(),
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
  let i = AbortSignal.timeout(STORE_CHECK_TIMEOUT_MS);
  try {
    let n = await apiClient.post(
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
        signal: i,
        maxContentLength: 65536,
        validateStatus: () => true,
      },
    );
    if (!n.ok)
      return {
        answer: "not_sent",
      };
    if (n.status === 404)
      return {
        answer: "not_found",
      };
    if (n.status === 401)
      return {
        answer: "credential_expired",
      };
    if (n.status === 403)
      return {
        answer: "credential_refused",
      };
    if (n.status < 200 || n.status >= 300)
      return {
        answer: "other_http_status",
      };
    let r = FILESTORE_METADATA_SCHEMA().safeParse(n.data);
    if (!r.success)
      return {
        answer: "unexpected_shape",
      };
    let s = Number(r.data.file.file.size ?? 0);
    let lower = (r.data.file.file.md5 ?? "").toLowerCase();
    if (!Number.isSafeInteger(s) || s < 0)
      return {
        answer: "unexpected_shape",
      };
    return MD5_HEX_RE.test(lower)
      ? {
          answer: "size_and_md5",
          size: s,
          md5: lower,
        }
      : {
          answer: "no_usable_md5",
        };
  } catch (error) {
    return {
      answer: i.aborted || classifyAxiosError(error).kind === "timeout" ? "timed_out" : "request_error",
    };
  }
}
//@ chunk-0f0jmzwa.js:2076-2212 placement
function sameFileUntouched(e, t) {
  return (
    e.dev === t.dev &&
    e.ino === t.ino &&
    e.nlink === t.nlink &&
    e.size === t.size &&
    e.mtimeNs === t.mtimeNs &&
    e.ctimeNs === t.ctimeNs
  );
}
//@ chunk-0f0jmzwa.js:2212-2275 placement
async function hashStandingFile(e, t) {
  return (await withDeadline(md5IfUntouched(e, t), MD5_TIMEOUT_MS)) ?? "timed_out";
}
//@ chunk-0f0jmzwa.js:2275-2674 placement
/**
 * 文件未改动时计算 md5
 */
async function md5IfUntouched(e, t) {
  let i;
  try {
    let { handle, withNoAtime } = await openRegularFileForReadWithNoAtime(e);
    i = handle;
    let stats = await i.stat({
      bigint: true,
    });
    if (!stats.isFile() || !sameFileUntouched(t, stats)) return "changed";
    let hash = createHash("md5");
    for await (let _ of i.createReadStream({
      autoClose: false,
      start: 0,
      end: Number(stats.size),
      signal: AbortSignal.timeout(MD5_TIMEOUT_MS),
    }))
      hash.update(_);
    return {
      md5: hash.digest("hex"),
      opened: stats,
      withNoAtime,
    };
  } catch {
    return "unreadable";
  } finally {
    i?.close().catch(() => {});
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
};
