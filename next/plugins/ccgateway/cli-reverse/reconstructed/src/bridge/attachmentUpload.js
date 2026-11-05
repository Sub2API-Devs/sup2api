/**
 * bridge/attachmentUpload.ts
 *
 * 2.1.316 新增：桥接会话附件上传（校验路径、分块上传、重发与项目目录上传）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-033d1naw.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  uploadFile,
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

//@ chunk-033d1naw.js:10739-10833 placement
function logUploadFailure(code, meta, serverCode) {
  logFeatureSad(
    "bridge_attachment_upload",
    code,
    serverCode === undefined
      ? meta
      : {
          ...meta,
          server_error_code: fromEnum(serverCode),
        },
  );
}
//@ chunk-033d1naw.js:10833-11902 placement
/**
 * 解析上传响应：201 取 file_uuid；413 解析服务器上限（图片单独提示）；其他状态转错误，并判断是否可重发。
 */
function handleUploadResponse(response, filename, size, telemetry, reportFailure) {
  if (response.status === 201) {
    let parsed = uploadSuccessSchema().safeParse(response.data);
    if (!parsed.success) {
      logUploadDebug(`unexpected response shape for ${filename}: ${parsed.error.message}`);
      reportFailure("bad_response");
      return {
        error: "upload failed: unexpected server response",
      };
    }
    logUploadDebug(`uploaded ${filename} \u2192 ${parsed.data.file_uuid} (${size} bytes)`);
    logFeatureOk("bridge_attachment_upload", telemetry);
    return parsed.data;
  }
  logUploadDebug(
    `upload failed for ${filename}: status=${response.status} body=${jsonStringify(response.data ?? null).slice(0, 200)}`,
  );
  let errorCode = extractErrorCode(response.data);
  let imageErrorCode = imageErrorCodeOrUndefined(errorCode);
  let isBusyOrTimeout =
    errorCode === "upload_busy" ||
    errorCode === "upload_timeout" ||
    response.status === 529 ||
    (typeof response.headers === "object" && response.headers !== null && "retry-after" in response.headers);
  reportFailure(
    httpStatusFailureCode(response.status),
    imageErrorCode,
    response.status < 500
      ? undefined
      : isBusyOrTimeout
        ? "any_post"
        : errorCode !== undefined
          ? "reason_not_temporary"
          : TEMPORARY_HTTP_STATUSES.has(response.status)
            ? undefined
            : "status_not_temporary",
  );
  let toError = (error) => ({
    error,
    ...(imageErrorCode !== undefined && {
      errorCode: imageErrorCode,
    }),
  });
  if (response.status === 413) {
    let tooLarge = uploadTooLargeSchema().safeParse(response.data);
    let details = tooLarge.success ? tooLarge.data.error.details : undefined;
    if (errorCode === "image_too_large")
      return toError(`${formatUploadLimitError(size, details?.max_bytes)} for images`);
    if (details !== undefined)
      bridgeHostState().uploadLimitTold = {
        maxBytes: details.max_bytes,
        atMs: Date.now(),
      };
    return toError(formatUploadLimitError(size, details?.max_bytes));
  }
  return toError(`upload failed: server returned ${response.status}`);
}
//@ chunk-033d1naw.js:11902-12106 placement
function buildUploadHeaders(token, boundary, contentLength, uploadLane) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${token}`,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": contentLength.toString(),
    ...(uploadLane !== undefined && {
      "x-claude-code-upload-lane": uploadLane,
    }),
  };
}
//@ chunk-033d1naw.js:12106-13165 placement
/**
 * 以 multipart 方式 POST 一个 buffer 到上传地址（35 秒超时），返回 file_uuid 或错误并记录失败分类。
 */
async function uploadBuffer(
  content,
  filename,
  size,
  signal,
  telemetry,
  credentials,
  onFailure = (code, serverCode) => logUploadFailure(code, telemetry, serverCode),
) {
  let gated = checkUploadAllowed(telemetry);
  if (gated) {
    logUploadDebug(`skip ${filename}: policy/provider gate denied`);
    return gated;
  }
  if (content.length > MAX_UPLOAD_BYTES) {
    logUploadDebug(`skip ${filename}: ${content.length} bytes exceeds ${MAX_UPLOAD_BYTES} limit`);
    onFailure("too_large");
    return {
      error: formatUploadLimitError(content.length, MAX_UPLOAD_BYTES),
    };
  }
  let uploadAuth = await getUploadAuth(credentials);
  if (!uploadAuth) {
    logUploadDebug("skip: no oauth token");
    onFailure("no_token");
    return {
      error: "upload failed: no OAuth token available",
    };
  }
  if (isBridgeFileLoginRefused(uploadAuth)) {
    onFailure("stored_login_refused");
    return {
      error: new StoredLoginHeldBackError(storedLoginRefusalReason()).message,
    };
  }
  let { boundary, head, tail } = multipartParts(filename, size);
  let buffer = Buffer.concat([head, content, tail]);
  let abortController = new AbortController();
  let stallTimer = createStallTimer(abortController, UPLOAD_TIMEOUT_MS);
  try {
    let url = uploadFile(uploadAuth, telemetry?.session_received);
    let response = await axios_default.post(url, buffer, {
      headers: buildUploadHeaders(uploadAuth.token, boundary, buffer.length, telemetry?.upload_lane),
      timeout: UPLOAD_TIMEOUT_MS,
      signal:
        signal === undefined ? abortController.signal : AbortSignal.any([signal, abortController.signal]),
      validateStatus: () => true,
      maxRedirects: 0,
    });
    return handleUploadResponse(response, filename, content.length, telemetry, onFailure);
  } catch (error) {
    logUploadDebug(`upload threw for ${filename}: ${error}`);
    let stallTimedOut = stallTimer.fired() && signal?.aborted !== true;
    let aborted = !stallTimedOut && axios_default.isCancel(error);
    onFailure(
      aborted ? "aborted" : "network_error",
      undefined,
      NON_TEMPORARY_ERRNOS.has(getErrnoCode(error)) ? "cause_not_temporary" : undefined,
    );
    return {
      error: aborted
        ? "upload aborted"
        : `upload failed: network error (${stallTimedOut ? `timeout of ${UPLOAD_TIMEOUT_MS}ms exceeded` : errorMessage(error)})`,
    };
  } finally {
    stallTimer.clear();
  }
}
//@ chunk-033d1naw.js:13165-13226 placement
function countUploadPost(counter) {
  counter.made++;
  counter.firstAtMs ??= counter.clock.monotonicNow();
}
//@ chunk-033d1naw.js:13226-13463 placement
function getResendBlocker(counter, size) {
  let { underWay, lastFailedAtMs } = bridgeHostState().uploadResends;
  let now = counter.clock.monotonicNow();
  if (
    now >
    counter.firstAtMs +
      (size > MIN_RESEND_MAX_BYTES || counter.max > 2 ? RESEND_DEADLINE_LONG_MS : RESEND_DEADLINE_MS)
  )
    return "past_deadline";
  if (lastFailedAtMs !== undefined && now - lastFailedAtMs < RESEND_COOLDOWN_MS) return "cooling_down";
  return underWay >= MAX_CONCURRENT_RESENDS ? "too_many_at_once" : undefined;
}
//@ chunk-033d1naw.js:13463-13727 placement
async function waitForResendSlot(counter, size, signal) {
  let resendBlocker = getResendBlocker(counter, size);
  if (resendBlocker !== undefined) return resendBlocker;
  await sleep(
    fullJitterBackoffMs({
      baseMs: BACKOFF_BASE_MS,
      attempt: counter.made - 1,
      floorMs: BACKOFF_FLOOR_MS,
    }),
    signal,
    {
      clock: counter.clock,
    },
  );
  if (signal?.aborted) return "aborted";
  let resendBlocker_2 = getResendBlocker(counter, size);
  if (resendBlocker_2 !== undefined) return resendBlocker_2;
  let uploadResends = bridgeHostState().uploadResends;
  uploadResends.underWay++;
  return () => {
    uploadResends.underWay--;
  };
}
//@ chunk-033d1naw.js:13727-14649 placement
/**
 * 带重发的上传循环：网络错误/断连/5xx 且未超出次数、大小、截止时间与并发限制时退避后重发。
 */
async function uploadWithResends(post, file, counter, signal, meta) {
  let currentMeta = meta;
  let releaseSlot;
  for (;;) {
    let failure;
    let result;
    try {
      countUploadPost(counter);
      result = await post(currentMeta, (code, serverCode, bars, bytesHanded) => {
        failure = {
          code,
          serverCode,
          bars,
          bytesHanded,
        };
      });
    } finally {
      releaseSlot?.();
      releaseSlot = undefined;
    }
    if (failure === undefined) return result;
    let { code, serverCode, bars, bytesHanded } = failure;
    let found = RESENDABLE_FAILURE_CODES.find((resendableCode) => resendableCode === code);
    let resendBlocker =
      found === undefined || bars === "any_post" || counter.made >= counter.max
        ? undefined
        : (bars ??
          (file.size > Math.min(counter.resendMaxBytes, getKnownServerUploadLimit() ?? 1 / 0)
            ? "over_size_limit"
            : await waitForResendSlot(counter, file.size, signal)));
    if (typeof resendBlocker === "function") {
      releaseSlot = resendBlocker;
      logUploadDebug(
        `posting ${file.filename} again after ${code} (post ${counter.made + 1} of at most ${counter.max})`,
      );
      currentMeta = {
        ...meta,
        post_number: counter.made + 1,
        failed_before: fromEnumOpt(found),
      };
      continue;
    }
    if (resendBlocker === "aborted") {
      logUploadFailure(
        "aborted",
        {
          ...currentMeta,
          failed_before: fromEnumOpt(found),
        },
        undefined,
      );
      return {
        error: "upload aborted",
      };
    }
    if (counter.max > 1 && counter.made > 1 && found !== undefined)
      bridgeHostState().uploadResends.lastFailedAtMs = counter.clock.monotonicNow();
    logUploadFailure(
      code,
      {
        ...currentMeta,
        ...(resendBlocker !== undefined && {
          resend_withheld: fromEnum(resendBlocker),
        }),
        ...("error" in result &&
          isResendableFailure(code, bars, bytesHanded) &&
          isTransientUploadFailure(result.error, result.errorCode) && {
            answer_may_be_lost: true,
          }),
        ...(bytesHanded !== undefined && {
          bytes_handed: bytesHanded,
        }),
      },
      serverCode,
    );
    return result;
  }
}
//@ chunk-033d1naw.js:14649-16682 placement
/**
 * 通过 door 通道把文件写入项目文件夹；重名时用带时间戳的新名再试一次。
 */
async function writeAttachmentToProjectFolder(filePath, size, door, options) {
  let { telemetry } = options;
  let gated = checkUploadAllowed(telemetry);
  if (gated) {
    logUploadDebug(`skip ${filePath}: policy/provider gate denied`);
    return gated;
  }
  if (size > BRIEF_UPLOAD_LIMITS) {
    logFeatureSad("bridge_attachment_upload", "too_large", telemetry);
    return {
      error: `${formatMiB(size)} exceeds the ${BRIEF_UPLOAD_LIMITS / 1048576} MiB limit for the project folder`,
    };
  }
  let fileName = options.filename ?? basename(filePath);
  if (!UPLOAD_FILENAME_RE.test(fileName) || fileName === ".." || normalizeUploadFileName(fileName)) {
    logFeatureSad("bridge_attachment_upload", "project_name_rejected", telemetry);
    return {
      error: `not sent: the file name '${fileName}' cannot be placed in the project folder`,
    };
  }
  let content;
  try {
    content = await withOpenedFile(
      filePath,
      options.identity,
      options.signal,
      BRIEF_UPLOAD_LIMITS,
      options.waitForTurn,
    );
  } catch (error) {
    logFeatureSad("bridge_attachment_upload", "read_failed", telemetry);
    return {
      error: `upload failed: could not read file (${error instanceof Error ? error.message : error})`,
    };
  }
  let gatedAfterWait = checkUploadAllowed(telemetry);
  if (gatedAfterWait) {
    logUploadDebug(`skip ${filePath}: policy/provider gate denied after the wait for a turn`);
    return gatedAfterWait;
  }
  for (let candidateName of [fileName, timestampedFileName(fileName)]) {
    if (options.signal?.aborted) {
      logFeatureSad("bridge_attachment_upload", "aborted", telemetry);
      return {
        error: "upload aborted",
      };
    }
    let writeResult = await writeProjectFiles({
      door,
      items: [
        {
          path: `/${candidateName}`,
          content,
        },
      ],
      signal: options.signal,
    });
    if (!writeResult.ok)
      switch (
        (logFeatureSad("bridge_attachment_upload", writeResult.reason, telemetry), writeResult.reason)
      ) {
        case "aborted":
          return {
            error: "upload aborted",
          };
        case "http_error":
          return {
            error: `upload failed: the project folder refused the file (${(writeResult.code ?? `status ${writeResult.status}`).replaceAll("_", " ")})`,
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
    let writeItem = writeResult.results.length === 1 ? writeResult.results[0] : undefined;
    if (writeItem === undefined) {
      logFeatureSad("bridge_attachment_upload", "bad_response", telemetry);
      return {
        error: "upload failed: the project folder gave no answer for the file",
      };
    }
    let errorReason = writeItem.error_reason;
    if (errorReason === undefined) {
      logFeatureOk("bridge_attachment_upload", telemetry);
      return `${PROJECT_FILES_MOUNT_PATH}/${candidateName}`;
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
    error: `upload failed: a file named ${fileName} is already in the project folder`,
  };
}
//@ chunk-033d1naw.js:16682-17461 placement
/**
 * 上传桥接会话的附件：路径必须经过校验，按大小分块上传。
 */
async function uploadBridgeAttachment(filePath, approvedIdentity, options) {
  if (approvedIdentity === null) throw Error("the file at this path could not be vouched for");
  let platform = getPlatform();
  let openFlags =
    platform === "windows"
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (constants.O_NOCTTY ?? 0);
  let checkIdentity = approvedIdentity !== undefined;
  let handle = await openWithAbort(filePath, openFlags, platform, checkIdentity, options);
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    if (!stats.isFile()) throw Error("not a regular file");
    if (approvedIdentity && (stats.dev !== approvedIdentity.dev || stats.ino !== approvedIdentity.ino))
      throw Error("the file at this path is not the one approved");
    let resolvedPath =
      checkIdentity && (platform === "linux" || platform === "wsl")
        ? await readlink(`/proc/self/fd/${handle.fd}`).catch(() => {
            return;
          })
        : undefined;
    if (resolvedPath !== undefined && resolvedPath !== filePath)
      throw Error("it opened at a different path than approved");
    if (checkIdentity && resolvedPath === undefined) {
      let safePath = safeResolvePath(getFsImplementation(), filePath);
      if (!safePath.isCanonical || safePath.resolvedPath !== filePath)
        throw Error("it re-resolved elsewhere once opened");
    }
    return {
      handle,
      size: Number(stats.size),
    };
  } catch (error) {
    await handle.close();
    throw error;
  }
}
//@ chunk-033d1naw.js:17461-17474 placement
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
  writeAttachmentToProjectFolder,
};
