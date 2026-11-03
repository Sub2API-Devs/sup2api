/**
 * services/api/adminRequests.ts
 *
 * 云会话/管理相关请求：取 OAuth 令牌与组织 id、远程会话 teleport 事件、GitHub App 状态重新同步与错误提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/adminRequests.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-s61vbvea.js (2), chunk-vbks4x4e.js (9)
 * attribution: fingerprint 2, affinity 1, placement 9
 */
import { withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import { apiClient } from "../routines/routinesApi.js";
import { getCurrentLimits, emitLimitsStatusChange } from "../claudeAiLimits.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { isUsageBasedBilling } from "../../utils/planTiers.js";
import { INDIVIDUAL_USAGE_LIMIT_TEXT, INDIVIDUAL_SPEND_LIMIT_TEXT } from "./usage.js";
import { formatCurrency } from "./referral.js";
import { formatResetTimeWithLocale } from "../../utils/format.js";
import { isExpectedApiError, errorMessage, toError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { sleep } from "../../utils/sleep.js";
import { isQuotaAutoResumeArmed } from "../quotaAutoResume/quotaAutoResume.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { getOAuthRequestHeaders } from "../../utils/teleport/api.js";
import { githubUserFacingError } from "../../utils/background/remote/preconditions.js";
import { getTeleportEvents } from "./sessionIngress.js";

//@ chunk-vbks4x4e.js:772-1097 placement
/**
 * 向组织 admin_requests 接口提交管理员请求，返回请求数据、是否新建与状态码。
 */
async function postAdminRequest(body, credentials) {
  return withFeatureTelemetry("api_admin_request_create", async () => {
    let n = await apiClient.post("/api/oauth/organizations/:orgUUID/admin_requests", body, {
      auth: "teleport-org",
      credentials,
    });
    if (!n.ok) throw Error(n.reason === "no-auth" ? n.detail : `admin_requests: ${n.reason}`);
    return {
      request: n.data,
      created: n.status === 201,
      status: n.status,
    };
  });
}
//@ chunk-vbks4x4e.js:1097-1464 placement
/**
 * 按请求类型和状态列出当前用户提交给组织管理员的请求。
 */
async function listMyAdminRequests(requestType, statuses, credentials) {
  return withFeatureTelemetry("api_admin_request_list", async () => {
    let uRLSearchParams = new URLSearchParams({
      request_type: requestType,
    });
    for (let status of statuses) uRLSearchParams.append("statuses", status);
    let s = await apiClient.get(`/api/oauth/organizations/:orgUUID/admin_requests/me?${uRLSearchParams}`, {
      auth: "teleport-org",
      credentials,
    });
    if (!s.ok) throw Error(s.reason === "no-auth" ? s.detail : `admin_requests/me: ${s.reason}`);
    return s.data;
  });
}
//@ chunk-vbks4x4e.js:1464-1785 placement
/**
 * 查询当前用户能否就某类请求向管理员申请。
 */
async function getAdminRequestEligibility(requestType, credentials) {
  return withFeatureTelemetry("api_admin_request_eligibility", async () => {
    let n = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/admin_requests/eligibility?request_type=${requestType}`,
      {
        auth: "teleport-org",
        credentials,
      },
    );
    if (!n.ok) throw Error(n.reason === "no-auth" ? n.detail : `admin_requests/eligibility: ${n.reason}`);
    return n.data;
  });
}
//@ chunk-vbks4x4e.js:1785-1974 placement
/**
 * 本地把限额状态改为"正在使用超额且已允许"并广播，用于管理员批准后立刻放行。
 */
function markOverageAllowed() {
  let r = {
    ...getCurrentLimits(),
    isUsingOverage: true,
  };
  delete r.overageDisabledReason;
  if (r.status === "rejected") r.status = "allowed";
  if (r.overageStatus === "rejected") r.overageStatus = "allowed";
  emitLimitsStatusChange(r);
}
//@ chunk-vbks4x4e.js:1974-2359 placement
/**
 * 从 4xx axios 错误响应体中提取可读的错误消息（error.message、message 或 detail）。
 */
function adminRequestErrorMessage(r) {
  if (!axios_default.isAxiosError(r)) return null;
  let status = r.response?.status;
  if (typeof status !== "number" || status >= 500) return null;
  let n = r.response?.data;
  if (!n || typeof n !== "object") return null;
  let o = n;
  let error = o.error;
  if (error && typeof error === "object") {
    let message = error.message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  for (let u of ["message", "detail"]) {
    let e = o[u];
    if (typeof e === "string" && e.length > 0) return e;
  }
  return null;
}
//@ chunk-vbks4x4e.js:2359-2648 placement
/**
 * 用量额度申请相关常量：非交互会话的提示文字、超时，以及表示组织额度为零或已达上限的错误码。
 */
var USAGE_CREDITS_NONINTERACTIVE_HINT =
  "Requesting usage credits notifies your organization admins. To review and send the request, run /usage-credits in an interactive Claude Code session.";
var ADMIN_REQUEST_TIMEOUT_MS = 2000;
var ZERO_CREDIT_REASONS = new Set([
  "org_spend_cap_reached",
  "member_zero_credit_limit",
  "group_zero_credit_limit",
  "seat_tier_zero_credit_limit",
]);
//@ chunk-vbks4x4e.js:2648-3430 placement
function parseAdminRequest(request) {
  if (request == null || typeof request !== "object" || request.request_type !== "limit_increase")
    return null;
  let details = request.details;
  if (
    request.status !== "approved" ||
    details?.approval_type !== "pre_approved" ||
    typeof details.granted_limit !== "number" ||
    !Number.isSafeInteger(details.granted_limit) ||
    details.granted_limit <= 0 ||
    typeof details.currency !== "string" ||
    !/^[A-Za-z]{3}$/.test(details.currency)
  )
    return null;
  let period =
    details.period == null || details.period === "monthly"
      ? "monthly"
      : details.period === "weekly"
        ? "weekly"
        : "other";
  let o = isUsageBasedBilling() ? INDIVIDUAL_USAGE_LIMIT_TEXT : INDIVIDUAL_SPEND_LIMIT_TEXT;
  let s = formatCurrency(details.granted_limit, details.currency, "fit");
  let u = typeof details.expires_at === "string" ? Date.parse(details.expires_at) : NaN;
  let e =
    Number.isFinite(u) && u > Date.now() ? formatResetTimeWithLocale(u / 1000, true, true, true) : undefined;
  return {
    line: e === undefined ? `Your ${o} is now ${s}` : `Your ${o} is now ${s} until ${e}`,
    shortLine: `Your ${o} is now ${s}`,
    fresh: request.approved_now === true,
    period,
    hasExpiry: e !== undefined,
  };
}
//@ chunk-vbks4x4e.js:3430-4758 placement
async function fileAdminLimitRequest(extraUsage, credentials, n) {
  let o;
  try {
    o = await postAdminRequest(
      {
        request_type: "limit_increase",
        details: null,
      },
      credentials,
    );
  } catch (error) {
    let p = adminRequestErrorMessage(error);
    if (isExpectedApiError(error, (m) => adminRequestErrorMessage(m) !== null))
      logForDebugging(`Admin request rejected: ${p ?? errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    if (p)
      return {
        type: "message",
        value: p,
        filed: false,
        outcome:
          axios_default.isAxiosError(error) && error.response !== undefined
            ? classifyAdminRequestStatus(error.response.status)
            : "failed",
      };
    return {
      type: "message",
      filed: false,
      outcome: "failed",
      value: "Couldn't send your request. Try again later.",
    };
  }
  let s = null;
  try {
    if (o.status >= 200 && o.status < 300) s = parseAdminRequest(o.request);
  } catch (error) {
    logError(toError(error));
  }
  if (s === null)
    return {
      type: "message",
      filed: true,
      outcome: o.created ? "filed" : classifyAdminRequestStatus(o.status),
      value:
        extraUsage == null
          ? "Request sent to your admin for usage credits."
          : extraUsage.is_enabled
            ? "Request sent to your admin to increase your usage credit limit."
            : "Request sent to your admin to turn on usage credits.",
    };
  try {
    n?.(`${s.shortLine}.`);
  } catch (error) {
    logError(toError(error));
  }
  try {
    if (s.fresh) {
      logEvent("tengu_usage_credits_admin_request_granted", {
        period: fromEnum(s.period),
        has_expiry: s.hasExpiry,
      });
      if (getCurrentLimits().status === "rejected") await sleep(ADMIN_REQUEST_TIMEOUT_MS);
      let currentLimits = getCurrentLimits();
      if (
        currentLimits.status === "rejected" &&
        currentLimits.isUsingOverage !== true &&
        currentLimits.overageScope === undefined &&
        currentLimits.overageDisabledReason !== undefined &&
        ZERO_CREDIT_REASONS.has(currentLimits.overageDisabledReason)
      )
        markOverageAllowed();
    }
  } catch (error) {
    logError(toError(error));
  }
  let u = false;
  try {
    u = isQuotaAutoResumeArmed();
  } catch (error) {
    logError(toError(error));
  }
  return {
    type: "message",
    filed: true,
    outcome: "granted",
    grantLine: `${s.line}.`,
    value: u ? `${s.line}.` : `${s.line} \xB7 send a message to continue`,
  };
}
//@ chunk-vbks4x4e.js:6713-6901 placement
function classifyAdminRequestStatus(status) {
  if (status === 201) return "filed";
  if (status === 200) return "already_filed";
  if (status === 401 || status === 408 || status === 429 || status >= 500) return "failed";
  if (status >= 400) return "refused";
  return status >= 200 && status < 300 ? "filed" : "failed";
}
//@ chunk-s61vbvea.js:467594-468180 affinity
/**
 * GitHub App 访问失败原因 → 用户提示（IP 白名单、SSO、条件访问等）。
 */
var GITHUB_APP_ERROR_MESSAGES = {
  ip_allowlist:
    "Your GitHub organization has an IP allowlist that is blocking Claude. Add Claude's IP ranges to your GitHub allowlist.",
  sso_required:
    "Your GitHub organization requires single sign-on. Disconnect and reconnect GitHub on the Connectors page in Claude on the web, click Authorize next to your organization when GitHub asks, then try again.",
  idp_conditional_access:
    "Your GitHub organization's identity provider (Microsoft Entra ID) has a Conditional Access policy that is blocking Claude. Ask your GitHub Enterprise or Entra ID admin to allow Claude in that policy.",
};
//@ chunk-s61vbvea.js:468180-469320 fingerprint = createAdminRequest (0.308)
/**
 * GitHub App 状态未定时请求服务端重新同步。旧版名 createAdminRequest 为错配。
 */
async function createAdminRequest({ orgUUID, accessToken, owner, repo, timeoutMs, signal }) {
  logForDebugging(`GitHub app status for ${owner}/${repo} is undetermined; asking the server to resync it`);
  try {
    let url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUUID}/code/repos/resync`;
    let response = await axios_default.post(
      url,
      {
        owner,
        repo,
      },
      {
        headers: {
          ...getOAuthRequestHeaders(accessToken),
          "x-organization-uuid": orgUUID,
        },
        timeout: timeoutMs,
        signal,
      },
    );
    if (response.data?.app_installed === true) {
      logForDebugging(`Resync: GitHub app is installed on ${owner}/${repo}`);
      return {
        appInstalled: true,
        transient: false,
      };
    }
    let reason = typeof response.data?.reason === "string" ? response.data.reason : null;
    logForDebugging(`Resync answered app_installed=false for ${owner}/${repo} (reason: ${reason ?? "none"})`);
    if (reason === "installation_not_found" || reason === "user_no_access")
      return {
        appInstalled: false,
        transient: false,
      };
    let x =
      reason !== null && Object.hasOwn(GITHUB_APP_ERROR_MESSAGES, reason)
        ? GITHUB_APP_ERROR_MESSAGES[reason]
        : undefined;
    if (x !== undefined)
      return {
        appInstalled: false,
        transient: false,
        serverMessage: x,
      };
    return {
      appInstalled: false,
      transient: true,
    };
  } catch (error) {
    let w = axios_default.isAxiosError(error)
      ? githubUserFacingError(error.response?.status, error.response?.data)
      : undefined;
    logForDebugging(
      `Resync of ${owner}/${repo} failed; ${w ? "reporting the server's reason" : "treating the install state as unknown"}: ${errorMessage(error)}`,
    );
    if (w)
      return {
        appInstalled: false,
        transient: false,
        serverMessage: w,
      };
    return {
      appInstalled: false,
      transient: true,
    };
  }
}
//@ chunk-e6aww6q8.js:208643-208838 fingerprint = checkAdminRequestEligibility (0.407)
/**
 * 拉取远程会话 /v1/code/sessions/<id>/teleport-events（带组织头与可信设备令牌）。旧版名错配。
 */
async function checkAdminRequestEligibility(sessionId, accessToken, orgUUID, s, h = {}) {
  let y = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${sessionId}/teleport-events`;
  let headers = {
    ...getOAuthRequestHeaders(accessToken),
    "x-organization-uuid": orgUUID,
  };
  if (s) headers["X-Trusted-Device-Token"] = s;
  return getTeleportEvents(sessionId, y, headers, h, true);
}
export {
  fileAdminLimitRequest,
  USAGE_CREDITS_NONINTERACTIVE_HINT,
  ADMIN_REQUEST_TIMEOUT_MS,
  checkAdminRequestEligibility,
  markOverageAllowed,
  createAdminRequest,
  getAdminRequestEligibility,
  listMyAdminRequests,
};
