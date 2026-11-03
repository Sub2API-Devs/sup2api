/**
 * bridge/attachmentUpload.ts
 *
 * 2.1.316 新增：桥接会话附件上传（校验路径、分块上传、重发与项目目录上传）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7kpfrhzn.js (11)
 * attribution: placement 11
 */
import { basename } from "path";
import { constants } from "fs";
import { readlink } from "fs/promises";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import {
  uploadSuccessSchema,
  logUploadDebug,
  httpStatusFailureCode,
  TEMPORARY_HTTP_STATUSES,
  uploadTooLargeSchema,
  formatUploadLimitError,
  checkUploadAllowed,
  MAX_UPLOAD_BYTES,
  getUploadAuth,
  Ie,
  multipartParts,
  UPLOAD_TIMEOUT_MS,
  getUploadUrl,
  Be,
  Ue,
  Ze,
  Qe,
  rr,
  er,
  Ve,
  qe,
  RESENDABLE_FAILURE_CODES,
  getKnownServerUploadLimit,
  isResendableFailure,
  BRIEF_UPLOAD_LIMITS,
  formatMiB,
  me,
  normalizeUploadFileName,
  withOpenedFile,
  timestampedFileName,
} from "../tools/BriefTool/upload.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { extractErrorCode } from "./debugUtils.js";
import { cst, isTransientUploadFailure } from "../utils/imageErrors.js";
import { ao } from "./bridgeHostState.js";
import { claudeCodeUserAgent } from "../utils/http.js";
import { StoredLoginHeldBackError } from "../services/oauth/storedLoginRefusal.js";
import { storedLoginRefusalReason } from "../utils/auth/storedLoginRefused.js";
import { createStallTimer } from "../utils/telemetry/memorySummary.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { getErrnoCode, errorMessage } from "../utils/errors.js";
import { sleep, fullJitterBackoffMs } from "../utils/sleep.js";
import { writeProjectFiles } from "./githubPrSubscription.js";
import { PROJECT_FILES_MOUNT_PATH } from "../utils/stageFileRoots.js";
import { getPlatform } from "../utils/platform.js";
import { openWithAbort } from "../utils/fsSafety/pathRevalidation.js";
import { safeResolvePath, getFsImplementation } from "../utils/fsOperations.js";

//@ chunk-7kpfrhzn.js:12531-12625 placement
function logUploadFailure(e, r, n) {
  logFeatureSad("bridge_attachment_upload", e, n === void 0 ? r : { ...r, server_error_code: fromEnum(n) });
}
/**
 * 解析上传响应：201 取 file_uuid；413 解析服务器上限（图片单独提示）；其他状态转错误，并判断是否可重发。
 */
//@ chunk-7kpfrhzn.js:12625-13694 placement
function handleUploadResponse(e, r, n, a, h) {
  if (e.status === 201) {
    let safeParse = uploadSuccessSchema().safeParse(e.data);
    if (!safeParse.success)
      return (
        logUploadDebug(`unexpected response shape for ${r}: ${safeParse.error.message}`),
        h("bad_response"),
        { error: "upload failed: unexpected server response" }
      );
    return (
      logUploadDebug(`uploaded ${r} \u2192 ${safeParse.data.file_uuid} (${n} bytes)`),
      logFeatureOk("bridge_attachment_upload", a),
      safeParse.data
    );
  }
  logUploadDebug(
    `upload failed for ${r}: status=${e.status} body=${jsonStringify(e.data ?? null).slice(0, 200)}`,
  );
  let s = extractErrorCode(e.data),
    m = cst(s),
    y =
      s === "upload_busy" ||
      s === "upload_timeout" ||
      e.status === 529 ||
      (typeof e.headers === "object" && e.headers !== null && "retry-after" in e.headers);
  h(
    httpStatusFailureCode(e.status),
    m,
    e.status < 500
      ? void 0
      : y
        ? "any_post"
        : s !== void 0
          ? "reason_not_temporary"
          : TEMPORARY_HTTP_STATUSES.has(e.status)
            ? void 0
            : "status_not_temporary",
  );
  let w = (b) => ({ error: b, ...(m !== void 0 && { errorCode: m }) });
  if (e.status === 413) {
    let safeParse = uploadTooLargeSchema().safeParse(e.data),
      U = safeParse.success ? safeParse.data.error.details : void 0;
    if (s === "image_too_large") return w(`${formatUploadLimitError(n, U?.max_bytes)} for images`);
    if (U !== void 0) ao().uploadLimitTold = { maxBytes: U.max_bytes, atMs: Date.now() };
    return w(formatUploadLimitError(n, U?.max_bytes));
  }
  return w(`upload failed: server returned ${e.status}`);
}
//@ chunk-7kpfrhzn.js:13694-13898 placement
function buildUploadHeaders(e, r, n, a) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${e}`,
    "Content-Type": `multipart/form-data; boundary=${r}`,
    "Content-Length": n.toString(),
    ...(a !== void 0 && { "x-claude-code-upload-lane": a }),
  };
}
/**
 * 以 multipart 方式 POST 一个 buffer 到上传地址（35 秒超时），返回 file_uuid 或错误并记录失败分类。
 */
//@ chunk-7kpfrhzn.js:13898-14933 placement
async function uploadBuffer(e, r, n, a, h, s, m = (y, w) => logUploadFailure(y, h, w)) {
  let y = checkUploadAllowed(h);
  if (y) return (logUploadDebug(`skip ${r}: policy/provider gate denied`), y);
  if (e.length > MAX_UPLOAD_BYTES)
    return (
      logUploadDebug(`skip ${r}: ${e.length} bytes exceeds ${MAX_UPLOAD_BYTES} limit`),
      m("too_large"),
      { error: formatUploadLimitError(e.length, MAX_UPLOAD_BYTES) }
    );
  let w = await getUploadAuth(s);
  if (!w)
    return (
      logUploadDebug("skip: no oauth token"),
      m("no_token"),
      { error: "upload failed: no OAuth token available" }
    );
  if (Ie(w))
    return (
      m("stored_login_refused"),
      { error: new StoredLoginHeldBackError(storedLoginRefusalReason()).message }
    );
  let { boundary: boundary, head: head, tail: tail } = multipartParts(r, n),
    buffer = Buffer.concat([head, e, tail]),
    abortController = new AbortController(),
    v = createStallTimer(abortController, UPLOAD_TIMEOUT_MS);
  try {
    let post = await Dt.post(getUploadUrl(w), buffer, {
      headers: buildUploadHeaders(w.token, boundary, buffer.length, h?.upload_lane),
      timeout: UPLOAD_TIMEOUT_MS,
      signal: a === void 0 ? abortController.signal : AbortSignal.any([a, abortController.signal]),
      validateStatus: () => !0,
      maxRedirects: 0,
    });
    return handleUploadResponse(post, r, e.length, h, m);
  } catch (error) {
    logUploadDebug(`upload threw for ${r}: ${error}`);
    let R = v.fired() && a?.aborted !== !0,
      F = !R && Dt.isCancel(error);
    return (
      m(
        F ? "aborted" : "network_error",
        void 0,
        Be.has(getErrnoCode(error)) ? "cause_not_temporary" : void 0,
      ),
      {
        error: F
          ? "upload aborted"
          : `upload failed: network error (${R ? `timeout of ${UPLOAD_TIMEOUT_MS}ms exceeded` : errorMessage(error)})`,
      }
    );
  } finally {
    v.clear();
  }
}
//@ chunk-7kpfrhzn.js:14933-14994 placement
function countUploadPost(e) {
  (e.made++, (e.firstAtMs ??= e.clock.monotonicNow()));
}
//@ chunk-7kpfrhzn.js:14994-15231 placement
function getResendBlocker(e, r) {
  let { underWay: underWay, lastFailedAtMs: lastFailedAtMs } = ao().uploadResends,
    monotonicNow = e.clock.monotonicNow();
  if (monotonicNow > e.firstAtMs + (r > Ue || e.max > 2 ? Ze : Qe)) return "past_deadline";
  if (lastFailedAtMs !== void 0 && monotonicNow - lastFailedAtMs < rr) return "cooling_down";
  return underWay >= er ? "too_many_at_once" : void 0;
}
//@ chunk-7kpfrhzn.js:15231-15495 placement
async function waitForResendSlot(e, r, n) {
  let a = getResendBlocker(e, r);
  if (a !== void 0) return a;
  if (
    (await sleep(fullJitterBackoffMs({ baseMs: Ve, attempt: e.made - 1, floorMs: qe }), n, {
      clock: e.clock,
    }),
    n?.aborted)
  )
    return "aborted";
  let h = getResendBlocker(e, r);
  if (h !== void 0) return h;
  let uploadResends = ao().uploadResends;
  return (
    uploadResends.underWay++,
    () => {
      uploadResends.underWay--;
    }
  );
}
/**
 * 带重发的上传循环：网络错误/断连/5xx 且未超出次数、大小、截止时间与并发限制时退避后重发。
 */
//@ chunk-7kpfrhzn.js:15495-16416 placement
async function uploadWithResends(e, r, n, a, h) {
  let s = h,
    m;
  for (;;) {
    let y, w;
    try {
      (countUploadPost(n),
        (w = await e(s, (L, R, F, x) => {
          y = { code: L, serverCode: R, bars: F, bytesHanded: x };
        })));
    } finally {
      (m?.(), (m = void 0));
    }
    if (y === void 0) return w;
    let { code: code, serverCode: serverCode, bars: bars, bytesHanded: bytesHanded } = y,
      found = RESENDABLE_FAILURE_CODES.find((L) => L === code),
      v =
        found === void 0 || bars === "any_post" || n.made >= n.max
          ? void 0
          : (bars ??
            (r.size > Math.min(n.resendMaxBytes, getKnownServerUploadLimit() ?? 1 / 0)
              ? "over_size_limit"
              : await waitForResendSlot(n, r.size, a)));
    if (typeof v === "function") {
      ((m = v),
        logUploadDebug(`posting ${r.filename} again after ${code} (post ${n.made + 1} of at most ${n.max})`),
        (s = { ...h, post_number: n.made + 1, failed_before: fromEnumOpt(found) }));
      continue;
    }
    if (v === "aborted")
      return (
        logUploadFailure("aborted", { ...s, failed_before: fromEnumOpt(found) }, void 0),
        { error: "upload aborted" }
      );
    if (n.max > 1 && n.made > 1 && found !== void 0)
      ao().uploadResends.lastFailedAtMs = n.clock.monotonicNow();
    return (
      logUploadFailure(
        code,
        {
          ...s,
          ...(v !== void 0 && { resend_withheld: fromEnum(v) }),
          ...("error" in w &&
            isResendableFailure(code, bars, bytesHanded) &&
            isTransientUploadFailure(w.error, w.errorCode) && { answer_may_be_lost: !0 }),
          ...(bytesHanded !== void 0 && { bytes_handed: bytesHanded }),
        },
        serverCode,
      ),
      w
    );
  }
}
/**
 * 通过 door 通道把文件写入项目文件夹；重名时用带时间戳的新名再试一次。
 */
//@ chunk-7kpfrhzn.js:16416-18448 placement
async function uploadToProjectFolder(e, r, n, a) {
  let { telemetry: telemetry } = a,
    s = checkUploadAllowed(telemetry);
  if (s) return (logUploadDebug(`skip ${e}: policy/provider gate denied`), s);
  if (r > BRIEF_UPLOAD_LIMITS)
    return (
      logFeatureSad("bridge_attachment_upload", "too_large", telemetry),
      {
        error: `${formatMiB(r)} exceeds the ${BRIEF_UPLOAD_LIMITS / 1048576} MiB limit for the project folder`,
      }
    );
  let m = a.filename ?? basename(e);
  if (!me.test(m) || m === ".." || normalizeUploadFileName(m))
    return (
      logFeatureSad("bridge_attachment_upload", "project_name_rejected", telemetry),
      { error: `not sent: the file name '${m}' cannot be placed in the project folder` }
    );
  let y;
  try {
    y = await withOpenedFile(e, a.identity, a.signal, BRIEF_UPLOAD_LIMITS, a.waitForTurn);
  } catch (error) {
    return (
      logFeatureSad("bridge_attachment_upload", "read_failed", telemetry),
      { error: `upload failed: could not read file (${error instanceof Error ? error.message : error})` }
    );
  }
  let w = checkUploadAllowed(telemetry);
  if (w) return (logUploadDebug(`skip ${e}: policy/provider gate denied after the wait for a turn`), w);
  for (let b of [m, timestampedFileName(m)]) {
    if (a.signal?.aborted)
      return (logFeatureSad("bridge_attachment_upload", "aborted", telemetry), { error: "upload aborted" });
    let U = await writeProjectFiles({ door: n, items: [{ path: `/${b}`, content: y }], signal: a.signal });
    if (!U.ok)
      switch ((logFeatureSad("bridge_attachment_upload", U.reason, telemetry), U.reason)) {
        case "aborted":
          return { error: "upload aborted" };
        case "http_error":
          return {
            error: `upload failed: the project folder refused the file (${(U.code ?? `status ${U.status}`).replaceAll("_", " ")})`,
          };
        case "no_token":
          return { error: "upload failed: this session has no credential to send with" };
        case "invalid_channel":
        case "bad_response":
        case "request_failed":
          return { error: "upload failed: the request to the project folder did not complete; try again" };
      }
    let A = U.results.length === 1 ? U.results[0] : void 0;
    if (A === void 0)
      return (
        logFeatureSad("bridge_attachment_upload", "bad_response", telemetry),
        { error: "upload failed: the project folder gave no answer for the file" }
      );
    let error_reason = A.error_reason;
    if (error_reason === void 0)
      return (logFeatureOk("bridge_attachment_upload", telemetry), `${PROJECT_FILES_MOUNT_PATH}/${b}`);
    if (error_reason !== "project_file_write_rejected")
      return (
        logFeatureSad("bridge_attachment_upload", "project_write_refused", telemetry),
        { error: `upload failed: the project folder refused the file (${error_reason.replaceAll("_", " ")})` }
      );
  }
  return (
    logFeatureSad("bridge_attachment_upload", "project_name_taken", telemetry),
    { error: `upload failed: a file named ${m} is already in the project folder` }
  );
}
/**
 * 上传桥接会话的附件：路径必须经过校验，按大小分块上传。
 */
//@ chunk-7kpfrhzn.js:18448-19227 placement
async function uploadBridgeAttachment(e, r, n) {
  if (r === null) throw Error("the file at this path could not be vouched for");
  let a = getPlatform(),
    h =
      a === "windows"
        ? constants.O_RDONLY
        : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (constants.O_NOCTTY ?? 0),
    s = r !== void 0,
    m = await openWithAbort(e, h, a, s, n);
  try {
    let stats = await m.stat({ bigint: !0 });
    if (!stats.isFile()) throw Error("not a regular file");
    if (r && (stats.dev !== r.dev || stats.ino !== r.ino))
      throw Error("the file at this path is not the one approved");
    let w =
      s && (a === "linux" || a === "wsl")
        ? await readlink(`/proc/self/fd/${m.fd}`).catch(() => {
            return;
          })
        : void 0;
    if (w !== void 0 && w !== e) throw Error("it opened at a different path than approved");
    if (s && w === void 0) {
      let b = safeResolvePath(getFsImplementation(), e);
      if (!b.isCanonical || b.resolvedPath !== e) throw Error("it re-resolved elsewhere once opened");
    }
    return { handle: m, size: Number(stats.size) };
  } catch (error) {
    throw (await m.close(), error);
  }
}
//@ chunk-7kpfrhzn.js:19227-19240 placement
var ATTACHMENT_CHUNK_BYTES = 65536;

export {
  uploadBuffer,
  ATTACHMENT_CHUNK_BYTES,
  uploadBridgeAttachment,
  uploadWithResends,
  countUploadPost,
  logUploadFailure,
  buildUploadHeaders,
  handleUploadResponse,
};
