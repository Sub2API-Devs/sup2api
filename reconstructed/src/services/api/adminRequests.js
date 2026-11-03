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
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { lD } from "../../utils/planTiers.js";
import { ZKr, m7n } from "./usage.js";
import { formatCurrency } from "./referral.js";
import { xk } from "../../utils/format.js";
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

/**
 * 向组织 admin_requests 接口提交管理员请求，返回请求数据、是否新建与状态码。
 */
//@ chunk-vbks4x4e.js:772-1097 placement
async function postAdminRequest(body, credentials) {
  return withFeatureTelemetry("api_admin_request_create", async () => {
    let post = await apiClient.post("/api/oauth/organizations/:orgUUID/admin_requests", body, {
      auth: "teleport-org",
      credentials: credentials,
    });
    if (!post.ok) throw Error(post.reason === "no-auth" ? post.detail : `admin_requests: ${post.reason}`);
    return { request: post.data, created: post.status === 201, status: post.status };
  });
}
/**
 * 按请求类型和状态列出当前用户提交给组织管理员的请求。
 */
//@ chunk-vbks4x4e.js:1097-1464 placement
async function listMyAdminRequests(requestType, statuses, credentials) {
  return withFeatureTelemetry("api_admin_request_list", async () => {
    let uRLSearchParams = new URLSearchParams({ request_type: requestType });
    for (let u of statuses) uRLSearchParams.append("statuses", u);
    let s = await apiClient.get(`/api/oauth/organizations/:orgUUID/admin_requests/me?${uRLSearchParams}`, {
      auth: "teleport-org",
      credentials: credentials,
    });
    if (!s.ok) throw Error(s.reason === "no-auth" ? s.detail : `admin_requests/me: ${s.reason}`);
    return s.data;
  });
}
/**
 * 查询当前用户能否就某类请求向管理员申请。
 */
//@ chunk-vbks4x4e.js:1464-1785 placement
async function getAdminRequestEligibility(requestType, credentials) {
  return withFeatureTelemetry("api_admin_request_eligibility", async () => {
    let n = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/admin_requests/eligibility?request_type=${requestType}`,
      { auth: "teleport-org", credentials: credentials },
    );
    if (!n.ok) throw Error(n.reason === "no-auth" ? n.detail : `admin_requests/eligibility: ${n.reason}`);
    return n.data;
  });
}
/**
 * 本地把限额状态改为"正在使用超额且已允许"并广播，用于管理员批准后立刻放行。
 */
//@ chunk-vbks4x4e.js:1785-1974 placement
function markOverageAllowed() {
  let r = { ...getCurrentLimits(), isUsingOverage: !0 };
  if ((delete r.overageDisabledReason, r.status === "rejected")) r.status = "allowed";
  if (r.overageStatus === "rejected") r.overageStatus = "allowed";
  emitLimitsStatusChange(r);
}
/**
 * 从 4xx axios 错误响应体中提取可读的错误消息（error.message、message 或 detail）。
 */
//@ chunk-vbks4x4e.js:1974-2359 placement
function adminRequestErrorMessage(r) {
  if (!Dt.isAxiosError(r)) return null;
  let i = r.response?.status;
  if (typeof i !== "number" || i >= 500) return null;
  let n = r.response?.data;
  if (!n || typeof n !== "object") return null;
  let o = n,
    error = o.error;
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
/**
 * 用量额度申请相关常量：非交互会话的提示文字、超时，以及表示组织额度为零或已达上限的错误码。
 */
//@ chunk-vbks4x4e.js:2359-2648 placement
var USAGE_CREDITS_NONINTERACTIVE_HINT =
    "Requesting usage credits notifies your organization admins. To review and send the request, run /usage-credits in an interactive Claude Code session.",
  ADMIN_REQUEST_TIMEOUT_MS = 2000,
  ZERO_CREDIT_REASONS = new Set([
    "org_spend_cap_reached",
    "member_zero_credit_limit",
    "group_zero_credit_limit",
    "seat_tier_zero_credit_limit",
  ]);
//@ chunk-vbks4x4e.js:2648-3430 placement
function parseAdminRequest(r) {
  if (r == null || typeof r !== "object" || r.request_type !== "limit_increase") return null;
  let details = r.details;
  if (
    r.status !== "approved" ||
    details?.approval_type !== "pre_approved" ||
    typeof details.granted_limit !== "number" ||
    !Number.isSafeInteger(details.granted_limit) ||
    details.granted_limit <= 0 ||
    typeof details.currency !== "string" ||
    !/^[A-Za-z]{3}$/.test(details.currency)
  )
    return null;
  let n =
      details.period == null || details.period === "monthly"
        ? "monthly"
        : details.period === "weekly"
          ? "weekly"
          : "other",
    o = lD() ? ZKr : m7n,
    s = formatCurrency(details.granted_limit, details.currency, "fit"),
    u = typeof details.expires_at === "string" ? Date.parse(details.expires_at) : NaN,
    e = Number.isFinite(u) && u > Date.now() ? xk(u / 1000, !0, !0, !0) : void 0;
  return {
    line: e === void 0 ? `Your ${o} is now ${s}` : `Your ${o} is now ${s} until ${e}`,
    shortLine: `Your ${o} is now ${s}`,
    fresh: r.approved_now === !0,
    period: n,
    hasExpiry: e !== void 0,
  };
}
//@ chunk-vbks4x4e.js:3430-4758 placement
async function fileAdminLimitRequest(r, i, n) {
  let o;
  try {
    o = await postAdminRequest({ request_type: "limit_increase", details: null }, i);
  } catch (error) {
    let p = adminRequestErrorMessage(error);
    if (isExpectedApiError(error, (m) => adminRequestErrorMessage(m) !== null))
      logForDebugging(`Admin request rejected: ${p ?? errorMessage(error)}`, { level: "error" });
    else logError(error);
    if (p)
      return {
        type: "message",
        value: p,
        filed: !1,
        outcome:
          Dt.isAxiosError(error) && error.response !== void 0
            ? classifyAdminRequestStatus(error.response.status)
            : "failed",
      };
    return {
      type: "message",
      filed: !1,
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
      filed: !0,
      outcome: o.created ? "filed" : classifyAdminRequestStatus(o.status),
      value:
        r == null
          ? "Request sent to your admin for usage credits."
          : r.is_enabled
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
      if (
        (logEvent("tengu_usage_credits_admin_request_granted", {
          period: fromEnum(s.period),
          has_expiry: s.hasExpiry,
        }),
        getCurrentLimits().status === "rejected")
      )
        await sleep(ADMIN_REQUEST_TIMEOUT_MS);
      let e = getCurrentLimits();
      if (
        e.status === "rejected" &&
        e.isUsingOverage !== !0 &&
        e.overageScope === void 0 &&
        e.overageDisabledReason !== void 0 &&
        ZERO_CREDIT_REASONS.has(e.overageDisabledReason)
      )
        markOverageAllowed();
    }
  } catch (error) {
    logError(toError(error));
  }
  let u = !1;
  try {
    u = isQuotaAutoResumeArmed();
  } catch (error) {
    logError(toError(error));
  }
  return {
    type: "message",
    filed: !0,
    outcome: "granted",
    grantLine: `${s.line}.`,
    value: u ? `${s.line}.` : `${s.line} \xB7 send a message to continue`,
  };
}
//@ chunk-vbks4x4e.js:6713-6901 placement
function classifyAdminRequestStatus(r) {
  if (r === 201) return "filed";
  if (r === 200) return "already_filed";
  if (r === 401 || r === 408 || r === 429 || r >= 500) return "failed";
  if (r >= 400) return "refused";
  return r >= 200 && r < 300 ? "filed" : "failed";
}
/**
 * GitHub App 访问失败原因 → 用户提示（IP 白名单、SSO、条件访问等）。
 */
//@ chunk-s61vbvea.js:467594-468180 affinity
var GITHUB_APP_ERROR_MESSAGES = {
  ip_allowlist:
    "Your GitHub organization has an IP allowlist that is blocking Claude. Add Claude's IP ranges to your GitHub allowlist.",
  sso_required:
    "Your GitHub organization requires single sign-on. Disconnect and reconnect GitHub on the Connectors page in Claude on the web, click Authorize next to your organization when GitHub asks, then try again.",
  idp_conditional_access:
    "Your GitHub organization's identity provider (Microsoft Entra ID) has a Conditional Access policy that is blocking Claude. Ask your GitHub Enterprise or Entra ID admin to allow Claude in that policy.",
};
/**
 * GitHub App 状态未定时请求服务端重新同步。旧版名 createAdminRequest 为错配。
 */
//@ chunk-s61vbvea.js:468180-469320 fingerprint = createAdminRequest (0.308)
async function createAdminRequest({
  orgUUID: orgUUID,
  accessToken: accessToken,
  owner: owner,
  repo: repo,
  timeoutMs: timeoutMs,
  signal: signal,
}) {
  logForDebugging(`GitHub app status for ${owner}/${repo} is undetermined; asking the server to resync it`);
  try {
    let url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUUID}/code/repos/resync`,
      response = await Dt.post(
        url,
        { owner: owner, repo: repo },
        {
          headers: { ...getOAuthRequestHeaders(accessToken), "x-organization-uuid": orgUUID },
          timeout: timeoutMs,
          signal: signal,
        },
      );
    if (response.data?.app_installed === !0)
      return (
        logForDebugging(`Resync: GitHub app is installed on ${owner}/${repo}`),
        { appInstalled: !0, transient: !1 }
      );
    let R = typeof response.data?.reason === "string" ? response.data.reason : null;
    if (
      (logForDebugging(`Resync answered app_installed=false for ${owner}/${repo} (reason: ${R ?? "none"})`),
      R === "installation_not_found" || R === "user_no_access")
    )
      return { appInstalled: !1, transient: !1 };
    let x = R !== null && Object.hasOwn(GITHUB_APP_ERROR_MESSAGES, R) ? GITHUB_APP_ERROR_MESSAGES[R] : void 0;
    if (x !== void 0) return { appInstalled: !1, transient: !1, serverMessage: x };
    return { appInstalled: !1, transient: !0 };
  } catch (error) {
    let w = Dt.isAxiosError(error)
      ? githubUserFacingError(error.response?.status, error.response?.data)
      : void 0;
    if (
      (logForDebugging(
        `Resync of ${owner}/${repo} failed; ${w ? "reporting the server's reason" : "treating the install state as unknown"}: ${errorMessage(error)}`,
      ),
      w)
    )
      return { appInstalled: !1, transient: !1, serverMessage: w };
    return { appInstalled: !1, transient: !0 };
  }
}
/**
 * 拉取远程会话 /v1/code/sessions/<id>/teleport-events（带组织头与可信设备令牌）。旧版名错配。
 */
//@ chunk-e6aww6q8.js:208643-208838 fingerprint = checkAdminRequestEligibility (0.407)
async function checkAdminRequestEligibility(e, n, r, s, h = {}) {
  let y = `${getOauthConfig().BASE_API_URL}/v1/code/sessions/${e}/teleport-events`,
    headers = { ...getOAuthRequestHeaders(n), "x-organization-uuid": r };
  if (s) headers["X-Trusted-Device-Token"] = s;
  return getTeleportEvents(e, y, headers, h, !0);
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
