/**
 * selfHostedRunner/runnerApiErrors.ts
 *
 * 自托管 runner API 错误分类与重试（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3nztfxrw.js (14)
 * attribution: placement 14
 */
import { isSnakeCaseReasonCode } from "../bridge/codeSessionApi.js";
import { extractPlainErrorDetail } from "../bridge/debugUtils.js";
import { UnreadableToolsHostError } from "./serverAutoMode.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { sleep } from "../utils/sleep.js";

//@ chunk-3nztfxrw.js:5466-5501 placement = extractErrorTypeFromData (1)
function getErrorBodyType(data) {
  return getErrorBodyField(data, "type");
}
//@ chunk-3nztfxrw.js:5501-5680 placement
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
    let r = Reflect.get(body.error, field);
    return typeof r === "string" ? r : undefined;
  }
  return;
}
//@ chunk-3nztfxrw.js:5680-5739 placement
function getErrorBodyReason(e) {
  let errorBodyField = getErrorBodyField(e, "reason");
  return isSnakeCaseReasonCode(errorBodyField) ? errorBodyField : undefined;
}
//@ chunk-3nztfxrw.js:5739-5778 placement
function getErrorBodyResource(e) {
  return getErrorBodyField(e, "resource");
}
//@ chunk-3nztfxrw.js:5778-5851 placement
var SELF_HOSTED_RUNNERS_DISABLED_BY_ORG = "self_hosted_runners_disabled_by_org";
var DISPATCH_TOKEN_REVOKED = "dispatch_token_revoked";
//@ chunk-3nztfxrw.js:5851-7266 placement
/**
 * 自托管 runner API 错误文本（401、组织未开通等）
 */
function formatRunnerApiError(status, n, r, m = false) {
  if (status >= 200 && status < 300) return;
  let plainErrorDetail = extractPlainErrorDetail(n);
  let errorBodyType = getErrorBodyType(n);
  let i = {
    errorType: isSnakeCaseReasonCode(errorBodyType) ? errorBodyType : undefined,
    errorReason: getErrorBodyReason(n),
    serverMessage: plainErrorDetail,
  };
  switch (status) {
    case 401:
      throw Object.assign(
        Error(
          `${r}: Authentication failed (401)${plainErrorDetail ? `: ${plainErrorDetail}` : ""}. Check your credentials.`,
        ),
        {
          isAuthFailure: true,
          httpStatus: status,
          ...i,
        },
      );
    case 403: {
      let errorBodyResource = getErrorBodyResource(n);
      let c = errorBodyResource === SELF_HOSTED_RUNNERS_DISABLED_BY_ORG;
      let errorBodyField = getErrorBodyField(n, "sub_reason");
      throw Object.assign(
        Error(
          `${r}: Access denied (403)${plainErrorDetail ? `: ${plainErrorDetail}` : ""}. ${c ? "The organization is not enabled for self-hosted environments." : "Token may be revoked."}`,
        ),
        {
          isAuthFailure: true,
          ...(m && {
            refusedByProxy: true,
          }),
          ...(c && {
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
      throw Object.assign(Error(plainErrorDetail ?? `${r}: Not found (404). The resource may not exist.`), {
        isNotFound: true,
        httpStatus: status,
        errorType: getErrorBodyType(n),
        resourceType: getErrorBodyField(n, "resource_type"),
      });
    case 409:
      if (i.errorType === "session_not_active")
        throw Object.assign(Error("Session not active (409): the session was archived or deleted."), {
          isEpochMismatch: true,
          isSessionNotActive: true,
          httpStatus: status,
          ...i,
        });
      throw Object.assign(
        Error(
          `${r}: Epoch conflict (409)${plainErrorDetail ? `: ${plainErrorDetail}` : ""}. Another runner has taken over this session.`,
        ),
        {
          isEpochMismatch: true,
          httpStatus: status,
          ...i,
        },
      );
    case 429:
      throw Object.assign(Error(`${r}: Rate limited (429). Polling too frequently.`), {
        httpStatus: status,
      });
    default:
      throw Object.assign(
        Error(`${r}: Failed with status ${status}${plainErrorDetail ? `: ${plainErrorDetail}` : ""}`),
        {
          httpStatus: status,
          ...i,
        },
      );
  }
}
//@ chunk-3nztfxrw.js:7266-7450 placement
/**
 * 从错误对象中取 HTTP 状态码（httpStatus 或 response.status）。
 */
function getHttpStatus(e) {
  if (e !== null && typeof e === "object") {
    let n = e;
    if (typeof n.httpStatus === "number") return n.httpStatus;
    if (typeof n.response?.status === "number") return n.response.status;
  }
  return;
}
//@ chunk-3nztfxrw.js:7450-7767 placement
/**
 * 从自托管 runner API 错误对象中安全提取 errorType、errorReason 与 serverMessage 字符串字段。
 */
function getRunnerErrorFields(e) {
  let n = e !== null && typeof e === "object" ? e : {};
  return {
    errorType: "errorType" in n && typeof n.errorType === "string" ? n.errorType : undefined,
    errorReason: "errorReason" in n && typeof n.errorReason === "string" ? n.errorReason : undefined,
    serverMessage: "serverMessage" in n && typeof n.serverMessage === "string" ? n.serverMessage : undefined,
  };
}
//@ chunk-3nztfxrw.js:7767-7960 placement
/**
 * 判断自托管 runner API 错误是否可重试：非取消、非不可读工具宿主错误，且无状态码、429 或 5xx。
 */
function isRetryableRunnerError(e) {
  if (e !== null && typeof e === "object") {
    let r = e;
    if (r.name === "AbortError" || r.code === "ERR_CANCELED") return false;
  }
  if (e instanceof UnreadableToolsHostError) return false;
  let httpStatus = getHttpStatus(e);
  return httpStatus === undefined || httpStatus === 429 || httpStatus >= 500;
}
//@ chunk-3nztfxrw.js:7960-8094 placement
var RUNNER_RETRY_DELAYS_MS = [500, 1000, 2000];
var RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ERR_SOCKET_CLOSED",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EAI_AGAIN",
]);
//@ chunk-3nztfxrw.js:8094-8492 placement
async function retryReleaseSession({ release, sessionId, onStatus, stop, waitsMs = RUNNER_RETRY_DELAYS_MS }) {
  for (let [t, i] of waitsMs.entries())
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
        `[runner:session] ${sessionId} ReleaseSession got no answer (${error.code}) on try ${t + 1} of ${waitsMs.length + 1}; trying again in ${i} ms`,
      );
      await sleep(i, stop);
      if (stop.aborted) throw error;
    }
  return release();
}
//@ chunk-3nztfxrw.js:8492-8542 placement
/**
 * runner API 错误的分类集合（transport/timeout/5xx/429/4xx）与计数初始化。
 */
var RUNNER_ERROR_CATEGORIES = ["transport", "timeout", "5xx", "429", "4xx"];
//@ chunk-3nztfxrw.js:8542-8762 placement
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
//@ chunk-3nztfxrw.js:8762-8831 placement
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
  classifyRunnerError,
  getHttpStatus,
  emptyErrorCategoryCounts,
  isRetryableRunnerError,
  getRunnerErrorFields,
  retryReleaseSession,
};
