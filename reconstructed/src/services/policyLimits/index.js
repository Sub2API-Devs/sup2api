/**
 * services/policyLimits/index.ts
 *
 * 组织策略限制（policy limits）：判定是否适用（第一方 + team/enterprise OAuth 或 API key），请求 /api/claude_code/policy_limits，会话缓存与 ~/.claude/policy-limits.json 磁盘缓存（签名/组织校验），按策略禁用功能并给出提示文案。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/policyLimits/index.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-1wpnxx5r.js (1), chunk-2xp8150w.js (1), chunk-7t4fmt2f.js (2), chunk-aepeg2w5.js (8), chunk-dcmhvw5a.js (1), chunk-yxnffbzs.js (1)
 * attribution: fingerprint 8, placement 7
 */
import { createHash } from "crypto";
import { ge } from "../../utils/identity.js";
import { hQ } from "./orgConfigRequired.js";
import { parseRelayFlag, keepIfFreshOrgConfig } from "../../utils/messageProvenance.js";
import {
  isFirstPartyManagedOAuthContext,
  effectiveAuthTokenEnv,
  isHostManagedProviderAuth,
  checkAndRefreshOAuthTokenIfNeededWithOutcome,
  isAuthFailureWorthRetrying,
  getClaudeAIOAuthTokens,
} from "../../utils/auth.js";
import { isBareMode } from "../../utils/envUtils.js";
import {
  isActualFirstPartyAnthropicBaseUrl,
  isFirstPartyAnthropicHost,
} from "../../utils/model/providers.js";
import { Zg } from "../analytics/firstPartyEventLoggingExporter.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import {
  Ht,
  it,
  Ze,
  policyCacheKey,
  ye,
  Fe,
  Nt,
  revalidationChecksumForPolicy,
  tt,
  responseShapeField,
  isShimmyingStardustGateOn,
  policyEndpointHost,
} from "./PolicyLimitsClient.js";
import { nAn, hedgedRequest } from "./startupGate.js";
import { et, fetchErrorCode } from "./prefetchToggle.js";
import { getRetryDelay } from "../api/withRetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import {
  oauthRefreshLatchStamp,
  getAuthHeadersAsync,
  withOAuth401Retry,
  restoreOAuthRefreshLatch,
} from "../../utils/http.js";
import {
  getPolicyLimitsTunnelSocket,
  noteStoredLoginAccountAtWire,
  noteWifAccountAtWire,
  getPolicyPrincipal,
} from "./policyState.js";
import { isGateAOn, sortKeysDeep } from "../../utils/settings/settingsSourceTrust.js";
import { tokenDigest } from "./cacheStamp.js";
import {
  rowPrincipalStamp,
  projectPolicyLimitsBody,
  isPolicyAllowed as isPolicyAllowed_2,
} from "./policyEvidence.js";
import { fetchPolicyLimitsResponse, isTransientNetworkError } from "./signedCache.js";
import { Ge, extractServerErrorFields, eAn } from "../api/errorUtils.js";
import { countDroppedComplianceTaints } from "./complianceTaints.js";
import { classifyAxiosError, isNonRetryableClientError } from "../../utils/errors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { TENGU_DUNWICH_BELL } from "../../components/FeedbackSurvey/useMemorySurvey.js";
import { isAutoMemoryEnabled } from "../../memdir/paths.js";
import { shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { env } from "../../utils/env.js";
import { isRemoteBrowserEnabled, y, F } from "../mcp/remoteBrowserServer.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  RESTRICTION_KEYS,
  neutralRestrictionSchema,
} from "../../utils/permissions/permissionContextSerialization.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-aepeg2w5.js:626183-626442 placement
class ReaderRegistry {
  reader = null;
  reporter = null;
  lastProblem = null;
  register(e, n) {
    let reader = this.reader;
    return ((this.reader = e), (this.reporter = n), (this.lastProblem = null), reader);
  }
  report(e, n) {
    let r = `${e}:${n}`;
    if (this.lastProblem === r) return;
    this.lastProblem = r;
    try {
      this.reporter?.(e, n);
    } catch {}
  }
}
/**
 * org-config 开关计划的单项缓存与读取器单例。
 */
//@ chunk-aepeg2w5.js:626442-626524 placement
var Vi = ge({ record: void 0, plan: null }, (e) => {
    ((e.record = void 0), (e.plan = null));
  }),
  kl = new ReaderRegistry();
/**
 * 注册 org-config 开关读取器与问题报告器（与代理无关，切分误归）。
 */
//@ chunk-aepeg2w5.js:626524-626587 placement = AgentsJsonSchema (0.484)
function registerGateReader(e, n = null) {
  return ((Vi.record = void 0), kl.register(e, n));
}
/**
 * 读取已注册的 org-config 开关值，读取失败/格式错误时报告并返回默认值。
 */
//@ chunk-aepeg2w5.js:626587-626804 placement
function readGateFlag() {
  let reader = kl.reader;
  if (!reader) return hQ;
  let n;
  try {
    n = reader();
  } catch (error) {
    return (kl.report("unreadable", error instanceof Error ? error.name : typeof error), hQ);
  }
  let { flag: flag, problem: problem } = parseRelayFlag(n);
  if (problem !== void 0) kl.report("malformed", problem);
  return flag;
}
/**
 * 策略宽限是否启用，以及宽限计划计算。
 */
//@ chunk-aepeg2w5.js:626804-626838 placement
function isPolicyGraceEnabled() {
  return readGateFlag().enabled;
}
/**
 * 按开关计算组织配置计划（按记录键缓存）。
 */
//@ chunk-aepeg2w5.js:626838-627035 placement
function resolveOrgConfigPlan(e, n, r = Date.now()) {
  if (e === null || n === void 0) return e;
  let s = `${e}:${n}`;
  if (Vi.record === s) return Vi.plan;
  let h = readGateFlag(),
    y = h.enabled ? keepIfFreshOrgConfig(e, n, h.graceTtlHours, r) : e;
  return ((Vi.record = s), (Vi.plan = y), y);
}
//@ chunk-aepeg2w5.js:627035-627052 placement
var REVALIDATE_IN_FULL_AFTER_MS = 21600000;
//@ chunk-aepeg2w5.js:893333-893603 fingerprint = getAuthHeaders (0.587)
function getAuthHeaders_2(e) {
  if (isFirstPartyManagedOAuthContext() || isBareMode()) return;
  if (!isActualFirstPartyAnthropicBaseUrl() || !isFirstPartyAnthropicHost(e) || !Zg(e)) return;
  let oauthTokens = effectiveAuthTokenEnv();
  if (!oauthTokens || !oauthTokens.startsWith("sk-ant-")) return;
  let sliced = oauthTokens.slice(7, 10);
  if (sliced === "api") return { headers: { "x-api-key": oauthTokens } };
  if (sliced === "oat")
    return { headers: { Authorization: `Bearer ${oauthTokens}`, "anthropic-beta": OAUTH_BETA_HEADER } };
  return;
}
//@ chunk-7t4fmt2f.js:16761-17340 fingerprint = fetchWithRetry (0.431)
async function fetchWithRetry(e, r, n, o, u, p, h, y = Ht, { hedge: E = !1, prefetched: R } = {}) {
  let lastResult = null,
    K = (w, A = !1) => fetchPolicyLimits(e, r, n, o, h, w, A),
    b = !1;
  for (let attempt = 1; attempt <= y + 1; attempt++) {
    let A = R ?? nAn(K);
    if (((R = void 0), E && attempt === 1)) {
      let G = await hedgedRequest({
        first: A,
        send: (P) => K(P, !0),
        isAnswer: (P, M) =>
          P.success || (P.skipRetry === !0 && !(M && P.errorCode === "auth_failed" && P.httpStatus === 401)),
        stillWanted: et,
        retryFollows: y > 0,
      });
      ((lastResult = G.result), (b ||= G.hedged));
    } else lastResult = await A.attempt;
    if (((lastResult.attempts = attempt), b)) lastResult.hedged = !0;
    if (lastResult.success || lastResult.skipRetry || attempt > y) return lastResult;
    p(lastResult);
    let delayMs = getRetryDelay(attempt);
    if (
      (logForDebugging(`Policy limits: Retry ${attempt}/${y} after ${delayMs}ms`),
      await sleep(delayMs, u),
      u?.aborted)
    )
      return lastResult;
  }
  return lastResult;
}
/**
 * 请求 /api/claude_code/policy_limits（Bearer），支持 ETag/304，失败分类为 auth_failed/network_error/timeout 等，结果写入会话缓存与 policy-limits.json。
 */
//@ chunk-7t4fmt2f.js:17340-21874 fingerprint = fetchPolicyLimits (0.351)
async function fetchPolicyLimits(e, r, n, o, u, p, h = !1) {
  let y,
    E,
    R = !1,
    S = 0,
    K = oauthRefreshLatchStamp(u.recoveries),
    authHeaders = getPolicyLimitsTunnelSocket(),
    w = null,
    A = null,
    O = !1,
    G = null,
    P;
  try {
    let endpoint = it(),
      q = {},
      T = async () => {
        await noteStoredLoginAccountAtWire(o, n);
        let U = Ze(),
          V = await getAuthHeadersAsync(isGateAOn() ? {} : { envBearerFallbackFor: endpoint }),
          te = effectiveAuthTokenEnv();
        if (
          ((G = te !== void 0 && V.headers.Authorization === `Bearer ${te}` ? tokenDigest(te) : null),
          V.error)
        )
          return ((O = !0), (w = null), (A = null), V);
        noteWifAccountAtWire();
        let ae = getPolicyPrincipal();
        P = rowPrincipalStamp();
        let s = ae === null ? null : policyCacheKey(ae);
        return (
          (O = U !== s),
          (w = O ? null : s),
          (A = w !== null && ye(ae) ? Fe(ae) : G !== null && isHostManagedProviderAuth() ? Nt(G) : null),
          V
        );
      };
    if (!authHeaders) {
      y = await checkAndRefreshOAuthTokenIfNeededWithOutcome({ credentials: n });
      let U = await T();
      if (U.error)
        return {
          success: !1,
          error: "Authentication required for policy limits",
          errorCode: "auth_failed",
          authUnavailableReason: U.reasonCode,
          tokenRefreshOutcome: y,
          skipRetry: !isAuthFailureWorthRetrying(y, void 0),
        };
      q = U.headers;
      let V = getClaudeAIOAuthTokens();
      R = Boolean(V?.accessToken && V.refreshToken && q.Authorization === `Bearer ${V.accessToken}`);
    }
    let oe = revalidationChecksumForPolicy(e, r),
      se = async () => {
        if ((S++, S > 1)) K = oauthRefreshLatchStamp(u.recoveries);
        let U = S === 1 || authHeaders ? q : (await T()).headers;
        return fetchPolicyLimitsResponse({
          endpoint: endpoint,
          authHeaders: U,
          ifNoneMatch: oe,
          timeoutMs: tt,
          socketPath: authHeaders,
          signal: p,
        });
      },
      I = authHeaders
        ? await se()
        : await withOAuth401Retry(se, {
            credentials: n,
            gateToSessionOAuthCredential: !0,
            oauthRefreshLatch: u,
            signal: p,
            onForcedRefreshOutcome: (status) => {
              ((E = { outcome: status }), (u.lastOutcome = status));
            },
          });
    if (I.kind === "not_modified") {
      if (!oe || !e)
        return (
          logForDebugging("Policy limits: 304 to an unconditional request"),
          {
            success: !1,
            error: "Unexpected 304 Not Modified",
            errorCode: "request_failed",
            httpStatus: 304,
            skipRetry: !0,
            principalKeyAtWire: w,
            askedKeyAtWire: A,
            principalMovedAtWire: O,
            stampAtWire: P,
            retriedAfter401: S > 1,
          }
        );
      if (!I.requestIdPresent && isPolicyGraceEnabled())
        return (
          logForDebugging(
            "Policy limits: 304 without Anthropic's request id \u2014 an intermediary's answer, keeping cached restrictions",
          ),
          {
            success: !1,
            error: "304 from an intermediary (no Anthropic request id)",
            errorCode: "request_failed",
            httpStatus: 304,
            skipRetry: !0,
            requestIdPresent: !1,
            principalKeyAtWire: w,
            askedKeyAtWire: A,
            principalMovedAtWire: O,
            stampAtWire: P,
            retriedAfter401: S > 1,
          }
        );
      if (S === 1 && !h) restoreOAuthRefreshLatch(u, K);
      return (
        logForDebugging("Policy limits: Using cached restrictions (304)"),
        {
          success: !0,
          response: null,
          etag: e,
          signature: I.signature,
          requestIdPresent: !0,
          principalKeyAtWire: w,
          askedKeyAtWire: A,
          principalMovedAtWire: O,
          stampAtWire: P,
          retriedAfter401: S > 1,
          ...(G !== null && S === 1 && { sentEnvBearerDigest: G }),
          ...(I.tunnelCredentialEpoch !== void 0 && { tunnelCredentialEpoch: I.tunnelCredentialEpoch }),
        }
      );
    }
    let X = projectPolicyLimitsBody(I.data);
    if (!X.success) {
      let U = responseShapeField(X.error.issues[0]?.path[0]),
        V = Ge(I.contentType);
      return (
        logForDebugging(`Policy limits: Invalid response format - field=${U} ct=${V} - ${X.error.message}`),
        {
          success: !1,
          error: "Invalid policy limits format",
          errorCode: "parse_failed",
          parseErrorField: U,
          parseErrorContentType: V,
          responseContentType: V,
          requestIdPresent: I.requestIdPresent,
          skipRetry: isShimmyingStardustGateOn(),
          principalKeyAtWire: w,
          askedKeyAtWire: A,
          principalMovedAtWire: O,
          stampAtWire: P,
          retriedAfter401: S > 1,
        }
      );
    }
    restoreOAuthRefreshLatch(u, K);
    let j = countDroppedComplianceTaints(I.data);
    if (j > 0)
      return (
        logForDebugging(`Policy limits: Fetched with ${j} malformed compliance_taints element(s) dropped`),
        {
          success: !0,
          response: X.data,
          parseErrorField: "compliance_taints",
          lossyComplianceTaints: !0,
          signature: I.signature,
          principalKeyAtWire: w,
          askedKeyAtWire: A,
          principalMovedAtWire: O,
          stampAtWire: P,
          retriedAfter401: S > 1,
          ...(G !== null && { sentEnvBearerDigest: G }),
          ...(I.tunnelCredentialEpoch !== void 0 && { tunnelCredentialEpoch: I.tunnelCredentialEpoch }),
        }
      );
    return (
      logForDebugging("Policy limits: Fetched successfully"),
      {
        success: !0,
        response: X.data,
        signature: I.signature,
        principalKeyAtWire: w,
        askedKeyAtWire: A,
        principalMovedAtWire: O,
        stampAtWire: P,
        retriedAfter401: S > 1,
        ...(G !== null && { sentEnvBearerDigest: G }),
        ...(I.tunnelCredentialEpoch !== void 0 && { tunnelCredentialEpoch: I.tunnelCredentialEpoch }),
      }
    );
  } catch (error) {
    let { kind: kind, status: status, message: message } = classifyAxiosError(error),
      se = { ...extractServerErrorFields(error), ...eAn(error) },
      I = E !== void 0 ? E.outcome : R && u.attempted ? u.lastOutcome : void 0,
      X = isTransientNetworkError(error),
      j = {
        ...(S > 0 && { principalKeyAtWire: w, askedKeyAtWire: A, principalMovedAtWire: O, stampAtWire: P }),
        ...(X !== void 0 && { tunnelCredentialEpoch: X }),
      };
    switch (
      (logForDebugging(
        `Policy limits: fetch failed (${kind}${status ? ` ${status}` : ""}) from ${policyEndpointHost()} \u2014 ${message}`,
      ),
      kind)
    ) {
      case "auth":
        return {
          success: !1,
          error: "Not authorized for policy limits",
          errorCode: "auth_failed",
          httpStatus: status,
          tokenRefreshOutcome: y,
          skipRetry: !(status === 401 && R && isAuthFailureWorthRetrying(y, E)),
          retriedAfter401: S > 1,
          forcedRefreshOutcome: I,
          sentStoredLogin: R,
          ...se,
          ...j,
        };
      case "timeout":
        return {
          success: !1,
          error: "Policy limits request timeout",
          errorCode: "timeout",
          errno: fetchErrorCode(error),
          retriedAfter401: S > 1,
          ...j,
        };
      case "network":
        return {
          success: !1,
          error: "Cannot connect to server",
          errorCode: "network_error",
          errno: fetchErrorCode(error),
          retriedAfter401: S > 1,
          ...j,
        };
      default:
        return {
          success: !1,
          error: message,
          errorCode: "request_failed",
          httpStatus: status,
          skipRetry: isNonRetryableClientError(status),
          retriedAfter401: S > 1,
          forcedRefreshOutcome: I,
          ...(kind === "http" && status === void 0 && { noResponse: !0, errno: fetchErrorCode(error) }),
          ...se,
          ...j,
        };
    }
  }
}
//@ chunk-18hwfzwa.js:1046691-1046806 fingerprint = ESSENTIAL_TRAFFIC_DENY_ON_MISS (0.772)
function isFeedbackSurveyAllowed() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DUNWICH_BELL, !1) &&
    isAutoMemoryEnabled() &&
    !shouldSkipFeedbackSurvey() &&
    isPolicyAllowed_2("allow_product_feedback") &&
    !env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY
  );
}
/**
 * 按策略限制判断某项功能是否允许（缓存命中或失败开放）。
 */
//@ chunk-1wpnxx5r.js:3119-3164 fingerprint = isPolicyAllowed (0.71)
function isPolicyAllowed() {
  return isRemoteBrowserEnabled() || y.on || F.allowed;
}
//@ chunk-2xp8150w.js:2601-2725 fingerprint = loadCachedRestrictions (0.611)
function loadCachedRestrictions(e) {
  let s = isPlainObject(e) ? e.restrictions : void 0;
  return (
    isPlainObject(s) &&
    Object.values(Uo(s, RESTRICTION_KEYS)).some((t) => !neutralRestrictionSchema().safeParse(t).success)
  );
}
//@ chunk-dcmhvw5a.js:173545-173634 fingerprint = computeChecksum (1)
function computeChecksum(restrictions) {
  let sorted = sortKeysDeep(restrictions),
    normalized = jsonStringify(sorted);
  return `sha256:${createHash("sha256").update(normalized).digest("hex")}`;
}
//@ chunk-yxnffbzs.js:2475-2672 fingerprint = getPolicyLimitsEndpoint (0.467)
var POLICY_LIMITS_PATH = "/api/claude_code/policy_limits",
  p = "disabled by your organization's policy",
  v =
    "disabled for the rest of this session because an organization with a restricted policy was signed in earlier";

export {
  isFeedbackSurveyAllowed,
  isPolicyAllowed,
  computeChecksum,
  getAuthHeaders_2,
  isPolicyGraceEnabled,
  POLICY_LIMITS_PATH,
  resolveOrgConfigPlan,
  fetchPolicyLimits,
  fetchWithRetry,
  REVALIDATE_IN_FULL_AFTER_MS,
  registerGateReader,
  loadCachedRestrictions,
  p,
  v,
};
