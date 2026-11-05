/**
 * selfHostedRunner/runnerApiErrors.ts
 *
 * 自托管 runner API 错误分类与重试（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a3r2kq46.js (14)
 * attribution: placement 14
 */
import { isSnakeCaseReasonCode } from "../bridge/codeSessionApi.js";
import { extractPlainErrorDetail } from "../bridge/debugUtils.js";
import { UnreadableToolsHostError } from "./serverAutoMode.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { sleep } from "../utils/sleep.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-a3r2kq46.js:5466-5501 placement (2.1.88 match: extractErrorTypeFromData, 1)
function getErrorBodyType(data) {
  return getErrorBodyField(data, "type");
}
//@ chunk-a3r2kq46.js:5501-5680 placement
/**
 * 读响应体 error 对象上的某个字符串字段。
 */
function getErrorBodyField(body, field) {
  if (
    body !== null &&
    typeof body === "object" &&
    "error" in body &&
    body.error !== null &&
    typeof body.error === "object"
  ) {
    let value = Reflect.get(body.error, field);
    return typeof value === "string" ? value : undefined;
  }
  return;
}
//@ chunk-a3r2kq46.js:5680-5739 placement
function getErrorBodyReason(body) {
  let errorBodyField = getErrorBodyField(body, "reason");
  return isSnakeCaseReasonCode(errorBodyField) ? errorBodyField : undefined;
}
//@ chunk-a3r2kq46.js:5739-5778 placement
function getErrorBodyResource(body) {
  return getErrorBodyField(body, "resource");
}
//@ chunk-a3r2kq46.js:5778-5851 placement
var SELF_HOSTED_RUNNERS_DISABLED_BY_ORG = "self_hosted_runners_disabled_by_org";
var DISPATCH_TOKEN_REVOKED = "dispatch_token_revoked";
//@ chunk-a3r2kq46.js:5851-7266 placement
/**
 * 自托管 runner API 错误文本（401、组织未开通等）
 */
function formatRunnerApiError(status, body, fallbackReason, retryable = false) {
  if (status >= 200 && status < 300) return;
  let plainErrorDetail = extractPlainErrorDetail(body);
  let errorBodyType = getErrorBodyType(body);
  let fields = {
    errorType: isSnakeCaseReasonCode(errorBodyType) ? errorBodyType : undefined,
    errorReason: getErrorBodyReason(body),
    serverMessage: plainErrorDetail,
  };
  switch (status) {
    case 401:
      throw Object.assign(
        Error(
          `${fallbackReason}: Authentication failed (401)${plainErrorDetail ? `: ${plainErrorDetail}` : ""}. Check your credentials.`,
        ),
        {
          isAuthFailure: true,
          httpStatus: status,
          ...fields,
        },
      );
    case 403: {
      let errorBodyResource = getErrorBodyResource(body);
      let orgDisabled = errorBodyResource === SELF_HOSTED_RUNNERS_DISABLED_BY_ORG;
      let errorBodyField = getErrorBodyField(body, "sub_reason");
      throw Object.assign(
        Error(
          `${fallbackReason}: Access denied (403)${plainErrorDetail ? `: ${plainErrorDetail}` : ""}. ${orgDisabled ? "The organization is not enabled for self-hosted environments." : "Token may be revoked."}`,
        ),
        {
          isAuthFailure: true,
          ...(retryable && {
            refusedByProxy: true,
          }),
          ...(orgDisabled && {
            isSelfHostedDisabledByOrg: true,
          }),
          ...(errorBodyResource === DISPATCH_TOKEN_REVOKED && {
            isDispatchTokenRevoked: true,
            errorSubReason: isSnakeCaseReasonCode(errorBodyField) ? errorBodyField : undefined,
          }),
          httpStatus: status,
        },
      );
    }
    case 404:
      throw Object.assign(
        Error(plainErrorDetail ?? `${fallbackReason}: Not found (404). The resource may not exist.`),
        {
          isNotFound: true,
          httpStatus: status,
          errorType: getErrorBodyType(body),
          resourceType: getErrorBodyField(body, "resource_type"),
        },
      );
    case 409:
      if (fields.errorType === "session_not_active")
        throw Object.assign(Error("Session not active (409): the session was archived or deleted."), {
          isEpochMismatch: true,
          isSessionNotActive: true,
          httpStatus: status,
          ...fields,
        });
      throw Object.assign(
        Error(
          `${fallbackReason}: Epoch conflict (409)${plainErrorDetail ? `: ${plainErrorDetail}` : ""}. Another runner has taken over this session.`,
        ),
        {
          isEpochMismatch: true,
          httpStatus: status,
          ...fields,
        },
      );
    case 429:
      throw Object.assign(Error(`${fallbackReason}: Rate limited (429). Polling too frequently.`), {
        httpStatus: status,
      });
    default:
      throw Object.assign(
        Error(
          `${fallbackReason}: Failed with status ${status}${plainErrorDetail ? `: ${plainErrorDetail}` : ""}`,
        ),
        {
          httpStatus: status,
          ...fields,
        },
      );
  }
}
//@ chunk-a3r2kq46.js:7266-7450 placement
/**
 * 从错误对象中取 HTTP 状态码（httpStatus 或 response.status）。
 */
function getHttpStatus(error) {
  if (error !== null && typeof error === "object") {
    let value = error;
    if (typeof value.httpStatus === "number") return value.httpStatus;
    if (typeof value.response?.status === "number") return value.response.status;
  }
  return;
}
//@ chunk-a3r2kq46.js:7450-7767 placement
/**
 * 从自托管 runner API 错误对象中安全提取 errorType、errorReason 与 serverMessage 字符串字段。
 */
function getRunnerErrorFields(error) {
  let value = error !== null && typeof error === "object" ? error : {};
  return {
    errorType: "errorType" in value && typeof value.errorType === "string" ? value.errorType : undefined,
    errorReason:
      "errorReason" in value && typeof value.errorReason === "string" ? value.errorReason : undefined,
    serverMessage:
      "serverMessage" in value && typeof value.serverMessage === "string" ? value.serverMessage : undefined,
  };
}
//@ chunk-a3r2kq46.js:7767-7960 placement
/**
 * 判断自托管 runner API 错误是否可重试：非取消、非不可读工具宿主错误，且无状态码、429 或 5xx。
 */
function isRetryableRunnerError(error) {
  if (error !== null && typeof error === "object") {
    let value = error;
    if (value.name === "AbortError" || value.code === "ERR_CANCELED") return false;
  }
  if (error instanceof UnreadableToolsHostError) return false;
  let httpStatus = getHttpStatus(error);
  return httpStatus === undefined || httpStatus === 429 || httpStatus >= 500;
}
//@ chunk-a3r2kq46.js:7960-8094 placement
var RUNNER_RETRY_DELAYS_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RETRYABLE_NETWORK_CODES;
deferInit("chunk-a3r2kq46.js:7960", () => {
  RUNNER_RETRY_DELAYS_MS = [500, 1000, 2000];
  RETRYABLE_NETWORK_CODES = new Set([
    "ECONNRESET",
    "ECONNREFUSED",
    "EPIPE",
    "ERR_SOCKET_CLOSED",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "EAI_AGAIN",
  ]);
});
//@ chunk-a3r2kq46.js:8094-8492 placement
async function retryReleaseSession({ release, sessionId, onStatus, stop, waitsMs = RUNNER_RETRY_DELAYS_MS }) {
  for (let [attempt, delayMs] of waitsMs.entries())
    try {
      return await release();
    } catch (error) {
      if (
        !axios_default.isAxiosError(error) ||
        error.response !== undefined ||
        error.code === undefined ||
        !RETRYABLE_NETWORK_CODES.has(error.code) ||
        stop.aborted
      )
        throw error;
      onStatus(
        `[runner:session] ${sessionId} ReleaseSession got no answer (${error.code}) on try ${attempt + 1} of ${waitsMs.length + 1}; trying again in ${delayMs} ms`,
      );
      await sleep(delayMs, stop);
      if (stop.aborted) throw error;
    }
  return release();
}
//@ chunk-a3r2kq46.js:8492-8542 placement
/**
 * runner API 错误的分类集合（transport/timeout/5xx/429/4xx）与计数初始化。
 */
var RUNNER_ERROR_CATEGORIES = ["transport", "timeout", "5xx", "429", "4xx"];
//@ chunk-a3r2kq46.js:8542-8762 placement
/**
 * 把 runner API 错误分类为 timeout、transport、5xx、429 或其他状态类别。
 */
function classifyRunnerError(error) {
  if (error !== null && typeof error === "object") {
    let code = error.code;
    if (code === "ECONNABORTED" || code === "ETIMEDOUT") return "timeout";
  }
  let httpStatus = getHttpStatus(error);
  if (httpStatus === undefined) return "transport";
  if (httpStatus >= 500) return "5xx";
  if (httpStatus === 429) return "429";
  return "4xx";
}
//@ chunk-a3r2kq46.js:8762-8831 placement
/**
 * 导出函数 `emptyErrorCategoryCounts`：返回 { transport: 0, timeout: 0, "5xx": 0, 429: 0, "4xx": 0 }; } export { formatRunnerApiError, gvr, classifyRunner…。
 */
function emptyErrorCategoryCounts() {
  return {
    transport: 0,
    timeout: 0,
    "5xx": 0,
    429: 0,
    "4xx": 0,
  };
}
export {
  formatRunnerApiError,
  RUNNER_ERROR_CATEGORIES,
  isRetryableRunnerError,
  getHttpStatus,
  getRunnerErrorFields,
  emptyErrorCategoryCounts,
  classifyRunnerError,
  retryReleaseSession,
};
