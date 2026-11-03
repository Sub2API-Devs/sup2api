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
import { ge } from "./identity.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, Ue, o, E } from "../../vendor/zod/v4/classic/schemas.js";
import { apiClient } from "../services/routines/routinesApi.js";
import { classifyAxiosError } from "./errors.js";
import { withDeadline } from "./sleep.js";
import { openRegularFileForReadWithNoAtime } from "./fsSafety/boundOpen.js";

//@ chunk-0f0jmzwa.js:522-610 placement
function sameStandingFlag() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_ledger", "off");
  return e === "count" || e === "on" ? e : "off";
}
//@ chunk-0f0jmzwa.js:610-700 placement
var SAME_STANDING_MAX_BYTES = 67108864,
  l = 3000,
  m = 1e4,
  STORE_CHECK_PAUSE_MS = 300000,
  d = ge({ pausedUntilMs: 0 }, (e) => {
    e.pausedUntilMs = 0;
  });
//@ chunk-0f0jmzwa.js:700-749 placement
function storeCheckPaused() {
  return Date.now() < d.pausedUntilMs;
}
//@ chunk-0f0jmzwa.js:749-1010 placement
function pauseStoreCheck(e, t) {
  let max = Math.max(d.pausedUntilMs, Date.now() + t);
  if (max === d.pausedUntilMs) return;
  ((d.pausedUntilMs = max),
    logForDiagnosticsNoPII("warn", "stage_file_store_check_paused", {
      cause: e,
      until: Number.isFinite(t) ? "timer" : "process_exit",
      ...(Number.isFinite(t) && { for_s: Math.round(t / 1000) }),
    }));
}
/**
 * filestore 元数据响应 schema 与 md5 正则。
 */
//@ chunk-0f0jmzwa.js:1010-1116 placement
var FILESTORE_METADATA_SCHEMA = DoctorLazy(() =>
    u({ file: u({ file: u({ size: Ue([o(), E()]).optional(), md5: o().optional() }) }) }),
  ),
  MD5_HEX_RE = /^[0-9a-f]{32}$/;
/**
 * 向 filestore 询问已存文件的大小与 md5（/v1/filestore/fs/readFileMetadata），用于 stage_file 判断本地文件是否与存储一致；连续失败会暂停检查（tengu_quiet_ledger）。
 */
//@ chunk-0f0jmzwa.js:1116-2076 placement
async function askStoreWhatItHolds(e, t) {
  let timeout = AbortSignal.timeout(l);
  try {
    let post = await apiClient.post(
      "/v1/filestore/fs/readFileMetadata",
      { filesystem_id: e.filesystemId, path: t },
      {
        auth: "none",
        host: "api",
        baseUrl: e.filestoreUrl,
        headers: { Authorization: `Bearer ${e.filestoreJwt}` },
        timeout: l,
        signal: timeout,
        maxContentLength: 65536,
        validateStatus: () => !0,
      },
    );
    if (!post.ok) return { answer: "not_sent" };
    if (post.status === 404) return { answer: "not_found" };
    if (post.status === 401) return { answer: "credential_expired" };
    if (post.status === 403) return { answer: "credential_refused" };
    if (post.status < 200 || post.status >= 300) return { answer: "other_http_status" };
    let safeParse = FILESTORE_METADATA_SCHEMA().safeParse(post.data);
    if (!safeParse.success) return { answer: "unexpected_shape" };
    let s = Number(safeParse.data.file.file.size ?? 0),
      lower = (safeParse.data.file.file.md5 ?? "").toLowerCase();
    if (!Number.isSafeInteger(s) || s < 0) return { answer: "unexpected_shape" };
    return MD5_HEX_RE.test(lower)
      ? { answer: "size_and_md5", size: s, md5: lower }
      : { answer: "no_usable_md5" };
  } catch (error) {
    return {
      answer: timeout.aborted || classifyAxiosError(error).kind === "timeout" ? "timed_out" : "request_error",
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
  return (await withDeadline(md5IfUntouched(e, t), m)) ?? "timed_out";
}
/**
 * 文件未改动时计算 md5
 */
//@ chunk-0f0jmzwa.js:2275-2674 placement
async function md5IfUntouched(e, t) {
  let i;
  try {
    let { handle: handle, withNoAtime: withNoAtime } = await openRegularFileForReadWithNoAtime(e);
    i = handle;
    let stats = await i.stat({ bigint: !0 });
    if (!stats.isFile() || !sameFileUntouched(t, stats)) return "changed";
    let a = createHash("md5");
    for await (let _ of i.createReadStream({
      autoClose: !1,
      start: 0,
      end: Number(stats.size),
      signal: AbortSignal.timeout(m),
    }))
      a.update(_);
    return { md5: a.digest("hex"), opened: stats, withNoAtime: withNoAtime };
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
