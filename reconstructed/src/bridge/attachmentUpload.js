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
  isBridgeFileLoginRefused,
  multipartParts,
  UPLOAD_TIMEOUT_MS,
  getUploadUrl,
  NON_TEMPORARY_ERRNOS,
  MIN_RESEND_MAX_BYTES,
  RESEND_DEADLINE_LONG_MS,
  RESEND_DEADLINE_MS,
  RESEND_COOLDOWN_MS,
  MAX_CONCURRENT_RESENDS,
  BACKOFF_BASE_MS,
  BACKOFF_FLOOR_MS,
  RESENDABLE_FAILURE_CODES,
  getKnownServerUploadLimit,
  isResendableFailure,
  BRIEF_UPLOAD_LIMITS,
  formatMiB,
  UPLOAD_FILENAME_RE,
  normalizeUploadFileName,
  withOpenedFile,
  timestampedFileName,
} from "../tools/BriefTool/upload.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { extractErrorCode } from "./debugUtils.js";
import { imageErrorCodeOrUndefined, isTransientUploadFailure } from "../utils/imageErrors.js";
import { bridgeHostState } from "./bridgeHostState.js";
import { claudeCodeUserAgent } from "../utils/http.js";
import { StoredLoginHeldBackError } from "../services/oauth/storedLoginRefusal.js";
import { storedLoginRefusalReason } from "../utils/auth/storedLoginRefused.js";
import { createStallTimer } from "../utils/telemetry/memorySummary.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { getErrnoCode, errorMessage } from "../utils/errors.js";
import { sleep, fullJitterBackoffMs } from "../utils/sleep.js";
import { writeProjectFiles } from "./githubPrSubscription.js";
import { PROJECT_FILES_MOUNT_PATH } from "../utils/stageFileRoots.js";
import { getPlatform } from "../utils/platform.js";
import { openWithAbort } from "../utils/fsSafety/pathRevalidation.js";
import { safeResolvePath, getFsImplementation } from "../utils/fsOperations.js";

//@ chunk-7kpfrhzn.js:12531-12625 placement
function logUploadFailure(e, r, n) {
  logFeatureSad(
    "bridge_attachment_upload",
    e,
    n === undefined
      ? r
      : {
          ...r,
          server_error_code: fromEnum(n),
        },
  );
}
//@ chunk-7kpfrhzn.js:12625-13694 placement
/**
 * 解析上传响应：201 取 file_uuid；413 解析服务器上限（图片单独提示）；其他状态转错误，并判断是否可重发。
 */
function handleUploadResponse(e, r, n, a, h) {
  if (e.status === 201) {
    let b = uploadSuccessSchema().safeParse(e.data);
    if (!b.success) {
      logUploadDebug(`unexpected response shape for ${r}: ${b.error.message}`);
      h("bad_response");
      return {
        error: "upload failed: unexpected server response",
      };
    }
    logUploadDebug(`uploaded ${r} \u2192 ${b.data.file_uuid} (${n} bytes)`);
    logFeatureOk("bridge_attachment_upload", a);
    return b.data;
  }
  logUploadDebug(
    `upload failed for ${r}: status=${e.status} body=${jsonStringify(e.data ?? null).slice(0, 200)}`,
  );
  let errorCode = extractErrorCode(e.data);
  let m = imageErrorCodeOrUndefined(errorCode);
  let y =
    errorCode === "upload_busy" ||
    errorCode === "upload_timeout" ||
    e.status === 529 ||
    (typeof e.headers === "object" && e.headers !== null && "retry-after" in e.headers);
  h(
    httpStatusFailureCode(e.status),
    m,
    e.status < 500
      ? undefined
      : y
        ? "any_post"
        : errorCode !== undefined
          ? "reason_not_temporary"
          : TEMPORARY_HTTP_STATUSES.has(e.status)
            ? undefined
            : "status_not_temporary",
  );
  let w = (error) => ({
    error,
    ...(m !== undefined && {
      errorCode: m,
    }),
  });
  if (e.status === 413) {
    let b = uploadTooLargeSchema().safeParse(e.data);
    let details = b.success ? b.data.error.details : undefined;
    if (errorCode === "image_too_large")
      return w(`${formatUploadLimitError(n, details?.max_bytes)} for images`);
    if (details !== undefined)
      bridgeHostState().uploadLimitTold = {
        maxBytes: details.max_bytes,
        atMs: Date.now(),
      };
    return w(formatUploadLimitError(n, details?.max_bytes));
  }
  return w(`upload failed: server returned ${e.status}`);
}
//@ chunk-7kpfrhzn.js:13694-13898 placement
function buildUploadHeaders(token, boundary, n, uploadLane) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${token}`,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": n.toString(),
    ...(uploadLane !== undefined && {
      "x-claude-code-upload-lane": uploadLane,
    }),
  };
}
//@ chunk-7kpfrhzn.js:13898-14933 placement
/**
 * 以 multipart 方式 POST 一个 buffer 到上传地址（35 秒超时），返回 file_uuid 或错误并记录失败分类。
 */
async function uploadBuffer(e, r, n, signal, h, credentials, m = (y, w) => logUploadFailure(y, h, w)) {
  let y = checkUploadAllowed(h);
  if (y) {
    logUploadDebug(`skip ${r}: policy/provider gate denied`);
    return y;
  }
  if (e.length > MAX_UPLOAD_BYTES) {
    logUploadDebug(`skip ${r}: ${e.length} bytes exceeds ${MAX_UPLOAD_BYTES} limit`);
    m("too_large");
    return {
      error: formatUploadLimitError(e.length, MAX_UPLOAD_BYTES),
    };
  }
  let uploadAuth = await getUploadAuth(credentials);
  if (!uploadAuth) {
    logUploadDebug("skip: no oauth token");
    m("no_token");
    return {
      error: "upload failed: no OAuth token available",
    };
  }
  if (isBridgeFileLoginRefused(uploadAuth)) {
    m("stored_login_refused");
    return {
      error: new StoredLoginHeldBackError(storedLoginRefusalReason()).message,
    };
  }
  let { boundary, head, tail } = multipartParts(r, n);
  let buffer = Buffer.concat([head, e, tail]);
  let abortController = new AbortController();
  let stallTimer = createStallTimer(abortController, UPLOAD_TIMEOUT_MS);
  try {
    let L = await axios_default.post(getUploadUrl(uploadAuth), buffer, {
      headers: buildUploadHeaders(uploadAuth.token, boundary, buffer.length, h?.upload_lane),
      timeout: UPLOAD_TIMEOUT_MS,
      signal:
        signal === undefined ? abortController.signal : AbortSignal.any([signal, abortController.signal]),
      validateStatus: () => true,
      maxRedirects: 0,
    });
    return handleUploadResponse(L, r, e.length, h, m);
  } catch (error) {
    logUploadDebug(`upload threw for ${r}: ${error}`);
    let R = stallTimer.fired() && signal?.aborted !== true;
    let F = !R && axios_default.isCancel(error);
    m(
      F ? "aborted" : "network_error",
      undefined,
      NON_TEMPORARY_ERRNOS.has(getErrnoCode(error)) ? "cause_not_temporary" : undefined,
    );
    return {
      error: F
        ? "upload aborted"
        : `upload failed: network error (${R ? `timeout of ${UPLOAD_TIMEOUT_MS}ms exceeded` : errorMessage(error)})`,
    };
  } finally {
    stallTimer.clear();
  }
}
//@ chunk-7kpfrhzn.js:14933-14994 placement
function countUploadPost(e) {
  e.made++;
  e.firstAtMs ??= e.clock.monotonicNow();
}
//@ chunk-7kpfrhzn.js:14994-15231 placement
function getResendBlocker(e, r) {
  let { underWay, lastFailedAtMs } = bridgeHostState().uploadResends;
  let h = e.clock.monotonicNow();
  if (
    h >
    e.firstAtMs + (r > MIN_RESEND_MAX_BYTES || e.max > 2 ? RESEND_DEADLINE_LONG_MS : RESEND_DEADLINE_MS)
  )
    return "past_deadline";
  if (lastFailedAtMs !== undefined && h - lastFailedAtMs < RESEND_COOLDOWN_MS) return "cooling_down";
  return underWay >= MAX_CONCURRENT_RESENDS ? "too_many_at_once" : undefined;
}
//@ chunk-7kpfrhzn.js:15231-15495 placement
async function waitForResendSlot(e, r, n) {
  let resendBlocker = getResendBlocker(e, r);
  if (resendBlocker !== undefined) return resendBlocker;
  await sleep(
    fullJitterBackoffMs({
      baseMs: BACKOFF_BASE_MS,
      attempt: e.made - 1,
      floorMs: BACKOFF_FLOOR_MS,
    }),
    n,
    {
      clock: e.clock,
    },
  );
  if (n?.aborted) return "aborted";
  let resendBlocker_2 = getResendBlocker(e, r);
  if (resendBlocker_2 !== undefined) return resendBlocker_2;
  let uploadResends = bridgeHostState().uploadResends;
  uploadResends.underWay++;
  return () => {
    uploadResends.underWay--;
  };
}
//@ chunk-7kpfrhzn.js:15495-16416 placement
/**
 * 带重发的上传循环：网络错误/断连/5xx 且未超出次数、大小、截止时间与并发限制时退避后重发。
 */
async function uploadWithResends(e, r, n, signal, h) {
  let s = h;
  let m;
  for (;;) {
    let y;
    let w;
    try {
      countUploadPost(n);
      w = await e(s, (code, serverCode, bars, bytesHanded) => {
        y = {
          code,
          serverCode,
          bars,
          bytesHanded,
        };
      });
    } finally {
      m?.();
      m = undefined;
    }
    if (y === undefined) return w;
    let { code, serverCode, bars, bytesHanded } = y;
    let found = RESENDABLE_FAILURE_CODES.find((L) => L === code);
    let v =
      found === undefined || bars === "any_post" || n.made >= n.max
        ? undefined
        : (bars ??
          (r.size > Math.min(n.resendMaxBytes, getKnownServerUploadLimit() ?? 1 / 0)
            ? "over_size_limit"
            : await waitForResendSlot(n, r.size, signal)));
    if (typeof v === "function") {
      m = v;
      logUploadDebug(`posting ${r.filename} again after ${code} (post ${n.made + 1} of at most ${n.max})`);
      s = {
        ...h,
        post_number: n.made + 1,
        failed_before: fromEnumOpt(found),
      };
      continue;
    }
    if (v === "aborted") {
      logUploadFailure(
        "aborted",
        {
          ...s,
          failed_before: fromEnumOpt(found),
        },
        undefined,
      );
      return {
        error: "upload aborted",
      };
    }
    if (n.max > 1 && n.made > 1 && found !== undefined)
      bridgeHostState().uploadResends.lastFailedAtMs = n.clock.monotonicNow();
    logUploadFailure(
      code,
      {
        ...s,
        ...(v !== undefined && {
          resend_withheld: fromEnum(v),
        }),
        ...("error" in w &&
          isResendableFailure(code, bars, bytesHanded) &&
          isTransientUploadFailure(w.error, w.errorCode) && {
            answer_may_be_lost: true,
          }),
        ...(bytesHanded !== undefined && {
          bytes_handed: bytesHanded,
        }),
      },
      serverCode,
    );
    return w;
  }
}
//@ chunk-7kpfrhzn.js:16416-18448 placement
/**
 * 通过 door 通道把文件写入项目文件夹；重名时用带时间戳的新名再试一次。
 */
async function uploadToProjectFolder(e, r, door, a) {
  let { telemetry } = a;
  let s = checkUploadAllowed(telemetry);
  if (s) {
    logUploadDebug(`skip ${e}: policy/provider gate denied`);
    return s;
  }
  if (r > BRIEF_UPLOAD_LIMITS) {
    logFeatureSad("bridge_attachment_upload", "too_large", telemetry);
    return {
      error: `${formatMiB(r)} exceeds the ${BRIEF_UPLOAD_LIMITS / 1048576} MiB limit for the project folder`,
    };
  }
  let m = a.filename ?? basename(e);
  if (!UPLOAD_FILENAME_RE.test(m) || m === ".." || normalizeUploadFileName(m)) {
    logFeatureSad("bridge_attachment_upload", "project_name_rejected", telemetry);
    return {
      error: `not sent: the file name '${m}' cannot be placed in the project folder`,
    };
  }
  let content;
  try {
    content = await withOpenedFile(e, a.identity, a.signal, BRIEF_UPLOAD_LIMITS, a.waitForTurn);
  } catch (error) {
    logFeatureSad("bridge_attachment_upload", "read_failed", telemetry);
    return {
      error: `upload failed: could not read file (${error instanceof Error ? error.message : error})`,
    };
  }
  let w = checkUploadAllowed(telemetry);
  if (w) {
    logUploadDebug(`skip ${e}: policy/provider gate denied after the wait for a turn`);
    return w;
  }
  for (let b of [m, timestampedFileName(m)]) {
    if (a.signal?.aborted) {
      logFeatureSad("bridge_attachment_upload", "aborted", telemetry);
      return {
        error: "upload aborted",
      };
    }
    let U = await writeProjectFiles({
      door,
      items: [
        {
          path: `/${b}`,
          content,
        },
      ],
      signal: a.signal,
    });
    if (!U.ok)
      switch ((logFeatureSad("bridge_attachment_upload", U.reason, telemetry), U.reason)) {
        case "aborted":
          return {
            error: "upload aborted",
          };
        case "http_error":
          return {
            error: `upload failed: the project folder refused the file (${(U.code ?? `status ${U.status}`).replaceAll("_", " ")})`,
          };
        case "no_token":
          return {
            error: "upload failed: this session has no credential to send with",
          };
        case "invalid_channel":
        case "bad_response":
        case "request_failed":
          return {
            error: "upload failed: the request to the project folder did not complete; try again",
          };
      }
    let A = U.results.length === 1 ? U.results[0] : undefined;
    if (A === undefined) {
      logFeatureSad("bridge_attachment_upload", "bad_response", telemetry);
      return {
        error: "upload failed: the project folder gave no answer for the file",
      };
    }
    let errorReason = A.error_reason;
    if (errorReason === undefined) {
      logFeatureOk("bridge_attachment_upload", telemetry);
      return `${PROJECT_FILES_MOUNT_PATH}/${b}`;
    }
    if (errorReason !== "project_file_write_rejected") {
      logFeatureSad("bridge_attachment_upload", "project_write_refused", telemetry);
      return {
        error: `upload failed: the project folder refused the file (${errorReason.replaceAll("_", " ")})`,
      };
    }
  }
  logFeatureSad("bridge_attachment_upload", "project_name_taken", telemetry);
  return {
    error: `upload failed: a file named ${m} is already in the project folder`,
  };
}
//@ chunk-7kpfrhzn.js:18448-19227 placement
/**
 * 上传桥接会话的附件：路径必须经过校验，按大小分块上传。
 */
async function uploadBridgeAttachment(e, r, n) {
  if (r === null) throw Error("the file at this path could not be vouched for");
  let platform = getPlatform();
  let h =
    platform === "windows"
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (constants.O_NOCTTY ?? 0);
  let s = r !== undefined;
  let m = await openWithAbort(e, h, platform, s, n);
  try {
    let stats = await m.stat({
      bigint: true,
    });
    if (!stats.isFile()) throw Error("not a regular file");
    if (r && (stats.dev !== r.dev || stats.ino !== r.ino))
      throw Error("the file at this path is not the one approved");
    let w =
      s && (platform === "linux" || platform === "wsl")
        ? await readlink(`/proc/self/fd/${m.fd}`).catch(() => {
            return;
          })
        : undefined;
    if (w !== undefined && w !== e) throw Error("it opened at a different path than approved");
    if (s && w === undefined) {
      let b = safeResolvePath(getFsImplementation(), e);
      if (!b.isCanonical || b.resolvedPath !== e) throw Error("it re-resolved elsewhere once opened");
    }
    return {
      handle: m,
      size: Number(stats.size),
    };
  } catch (error) {
    await m.close();
    throw error;
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
