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
import { xme } from "../bridge/codeSessionApi.js";
import { extractPlainErrorDetail } from "../bridge/debugUtils.js";
import { UnreadableToolsHostError } from "./serverAutoMode.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { sleep } from "../utils/sleep.js";

//@ chunk-3nztfxrw.js:5466-5501 placement = extractErrorTypeFromData (1)
function getErrorBodyType(data) {
  return getErrorBodyField(data, "type");
}
/**
 * 读响应体 error 对象上的某个字符串字段。
 */
//@ chunk-3nztfxrw.js:5501-5680 placement
function getErrorBodyField(body, field) {
  if (
    body !== null &&
    typeof body === "object" &&
    "error" in body &&
    body.error !== null &&
    typeof body.error === "object"
  ) {
    let r = Reflect.get(body.error, field);
    return typeof r === "string" ? r : void 0;
  }
  return;
}
//@ chunk-3nztfxrw.js:5680-5739 placement
function getErrorBodyReason(e) {
  let n = getErrorBodyField(e, "reason");
  return xme(n) ? n : void 0;
}
//@ chunk-3nztfxrw.js:5739-5778 placement
function getErrorBodyResource(e) {
  return getErrorBodyField(e, "resource");
}
//@ chunk-3nztfxrw.js:5778-5851 placement
var SELF_HOSTED_RUNNERS_DISABLED_BY_ORG = "self_hosted_runners_disabled_by_org",
  DISPATCH_TOKEN_REVOKED = "dispatch_token_revoked";
/**
 * 自托管 runner API 错误文本（401、组织未开通等）
 */
//@ chunk-3nztfxrw.js:5851-7266 placement
function formatRunnerApiError(e, n, r, m = !1) {
  if (e >= 200 && e < 300) return;
  let a = extractPlainErrorDetail(n),
    t = getErrorBodyType(n),
    i = { errorType: xme(t) ? t : void 0, errorReason: getErrorBodyReason(n), serverMessage: a };
  switch (e) {
    case 401:
      throw Object.assign(
        Error(`${r}: Authentication failed (401)${a ? `: ${a}` : ""}. Check your credentials.`),
        { isAuthFailure: !0, httpStatus: e, ...i },
      );
    case 403: {
      let s = getErrorBodyResource(n),
        c = s === SELF_HOSTED_RUNNERS_DISABLED_BY_ORG,
        l = getErrorBodyField(n, "sub_reason");
      throw Object.assign(
        Error(
          `${r}: Access denied (403)${a ? `: ${a}` : ""}. ${c ? "The organization is not enabled for self-hosted environments." : "Token may be revoked."}`,
        ),
        {
          isAuthFailure: !0,
          ...(m && { refusedByProxy: !0 }),
          ...(c && { isSelfHostedDisabledByOrg: !0 }),
          ...(s === DISPATCH_TOKEN_REVOKED && {
            isDispatchTokenRevoked: !0,
            errorSubReason: xme(l) ? l : void 0,
          }),
          httpStatus: e,
        },
      );
    }
    case 404:
      throw Object.assign(Error(a ?? `${r}: Not found (404). The resource may not exist.`), {
        isNotFound: !0,
        httpStatus: e,
        errorType: getErrorBodyType(n),
        resourceType: getErrorBodyField(n, "resource_type"),
      });
    case 409:
      if (i.errorType === "session_not_active")
        throw Object.assign(Error("Session not active (409): the session was archived or deleted."), {
          isEpochMismatch: !0,
          isSessionNotActive: !0,
          httpStatus: e,
          ...i,
        });
      throw Object.assign(
        Error(`${r}: Epoch conflict (409)${a ? `: ${a}` : ""}. Another runner has taken over this session.`),
        { isEpochMismatch: !0, httpStatus: e, ...i },
      );
    case 429:
      throw Object.assign(Error(`${r}: Rate limited (429). Polling too frequently.`), { httpStatus: e });
    default:
      throw Object.assign(Error(`${r}: Failed with status ${e}${a ? `: ${a}` : ""}`), {
        httpStatus: e,
        ...i,
      });
  }
}
/**
 * 从错误对象中取 HTTP 状态码（httpStatus 或 response.status）。
 */
//@ chunk-3nztfxrw.js:7266-7450 placement
function getHttpStatus(e) {
  if (e !== null && typeof e === "object") {
    let n = e;
    if (typeof n.httpStatus === "number") return n.httpStatus;
    if (typeof n.response?.status === "number") return n.response.status;
  }
  return;
}
/**
 * 从自托管 runner API 错误对象中安全提取 errorType、errorReason 与 serverMessage 字符串字段。
 */
//@ chunk-3nztfxrw.js:7450-7767 placement
function getRunnerErrorFields(e) {
  let n = e !== null && typeof e === "object" ? e : {};
  return {
    errorType: "errorType" in n && typeof n.errorType === "string" ? n.errorType : void 0,
    errorReason: "errorReason" in n && typeof n.errorReason === "string" ? n.errorReason : void 0,
    serverMessage: "serverMessage" in n && typeof n.serverMessage === "string" ? n.serverMessage : void 0,
  };
}
/**
 * 判断自托管 runner API 错误是否可重试：非取消、非不可读工具宿主错误，且无状态码、429 或 5xx。
 */
//@ chunk-3nztfxrw.js:7767-7960 placement
function isRetryableRunnerError(e) {
  if (e !== null && typeof e === "object") {
    let r = e;
    if (r.name === "AbortError" || r.code === "ERR_CANCELED") return !1;
  }
  if (e instanceof UnreadableToolsHostError) return !1;
  let n = getHttpStatus(e);
  return n === void 0 || n === 429 || n >= 500;
}
//@ chunk-3nztfxrw.js:7960-8094 placement
var RUNNER_RETRY_DELAYS_MS = [500, 1000, 2000],
  RETRYABLE_NETWORK_CODES = new Set([
    "ECONNRESET",
    "ECONNREFUSED",
    "EPIPE",
    "ERR_SOCKET_CLOSED",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "EAI_AGAIN",
  ]);
//@ chunk-3nztfxrw.js:8094-8492 placement
async function retryReleaseSession({
  release: release,
  sessionId: sessionId,
  onStatus: onStatus,
  stop: stop,
  waitsMs: waitsMs = RUNNER_RETRY_DELAYS_MS,
}) {
  for (let [t, i] of waitsMs.entries())
    try {
      return await release();
    } catch (error) {
      if (
        !Dt.isAxiosError(error) ||
        error.response !== void 0 ||
        error.code === void 0 ||
        !RETRYABLE_NETWORK_CODES.has(error.code) ||
        stop.aborted
      )
        throw error;
      if (
        (onStatus(
          `[runner:session] ${sessionId} ReleaseSession got no answer (${error.code}) on try ${t + 1} of ${waitsMs.length + 1}; trying again in ${i} ms`,
        ),
        await sleep(i, stop),
        stop.aborted)
      )
        throw error;
    }
  return release();
}
//@ chunk-3nztfxrw.js:8492-8542 placement
var gvr = ["transport", "timeout", "5xx", "429", "4xx"];
/**
 * 把 runner API 错误分类为 timeout、transport、5xx、429 或其他状态类别。
 */
//@ chunk-3nztfxrw.js:8542-8762 placement
function classifyRunnerError(e) {
  if (e !== null && typeof e === "object") {
    let code = e.code;
    if (code === "ECONNABORTED" || code === "ETIMEDOUT") return "timeout";
  }
  let n = getHttpStatus(e);
  if (n === void 0) return "transport";
  if (n >= 500) return "5xx";
  if (n === 429) return "429";
  return "4xx";
}
//@ chunk-3nztfxrw.js:8762-8831 placement
function NHn() {
  return { transport: 0, timeout: 0, "5xx": 0, 429: 0, "4xx": 0 };
}

export {
  formatRunnerApiError,
  gvr,
  classifyRunnerError,
  getHttpStatus,
  NHn,
  isRetryableRunnerError,
  getRunnerErrorFields,
  retryReleaseSession,
};
