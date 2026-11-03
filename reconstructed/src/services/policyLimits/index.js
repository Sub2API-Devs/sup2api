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
import { identity as identity_2 } from "../../utils/identity.js";
import { DEFAULT_ORG_CONFIG_REQUIRED_FLAG } from "./orgConfigRequired.js";
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
import { isHttpsEndpoint_2 } from "../analytics/firstPartyEventLoggingExporter.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import {
  FETCH_MAX_RETRIES,
  policyLimitsEndpointUrl,
  currentPolicyCacheKey,
  policyCacheKey,
  isClassifiedPrincipal,
  principalCacheKeyWithBearer,
  envBearerCacheKey,
  revalidationChecksumForPolicy,
  POLICY_REQUEST_TIMEOUT_MS,
  responseShapeField,
  isShimmyingStardustGateOn,
  policyEndpointHost,
} from "./PolicyLimitsClient.js";
import { abortableAttempt, hedgedRequest } from "./startupGate.js";
import { isManagedConfigPrefetchOn, fetchErrorCode } from "./prefetchToggle.js";
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
import { contentKindOf, extractServerErrorFields, responseHeaderFactsOf } from "../api/errorUtils.js";
import { countDroppedComplianceTaints } from "./complianceTaints.js";
import { classifyAxiosError, isNonRetryableClientError } from "../../utils/errors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { TENGU_DUNWICH_BELL } from "../../components/FeedbackSurvey/useMemorySurvey.js";
import { isAutoMemoryEnabled } from "../../memdir/paths.js";
import { shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { env } from "../../utils/env.js";
import {
  isRemoteBrowserEnabled,
  remoteBrowserEnabledState,
  remoteBrowserAllowedState,
} from "../mcp/remoteBrowserServer.js";
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
  register(reader, reporter) {
    let reader_2 = this.reader;
    this.reader = reader;
    this.reporter = reporter;
    this.lastProblem = null;
    return reader_2;
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
//@ chunk-aepeg2w5.js:626442-626524 placement
/**
 * org-config 开关计划的单项缓存与读取器单例。
 */
var orgConfigPlanCache = identity_2(
  {
    record: undefined,
    plan: null,
  },
  (e) => {
    e.record = undefined;
    e.plan = null;
  },
);
var orgConfigGateReaders = new ReaderRegistry();
//@ chunk-aepeg2w5.js:626524-626587 placement = AgentsJsonSchema (0.484)
/**
 * 注册 org-config 开关读取器与问题报告器（与代理无关，切分误归）。
 */
function registerGateReader(e, n = null) {
  orgConfigPlanCache.record = undefined;
  return orgConfigGateReaders.register(e, n);
}
//@ chunk-aepeg2w5.js:626587-626804 placement
/**
 * 读取已注册的 org-config 开关值，读取失败/格式错误时报告并返回默认值。
 */
function readGateFlag() {
  let reader = orgConfigGateReaders.reader;
  if (!reader) return DEFAULT_ORG_CONFIG_REQUIRED_FLAG;
  let n;
  try {
    n = reader();
  } catch (error) {
    orgConfigGateReaders.report("unreadable", error instanceof Error ? error.name : typeof error);
    return DEFAULT_ORG_CONFIG_REQUIRED_FLAG;
  }
  let { flag, problem } = parseRelayFlag(n);
  if (problem !== undefined) orgConfigGateReaders.report("malformed", problem);
  return flag;
}
//@ chunk-aepeg2w5.js:626804-626838 placement
/**
 * 策略宽限是否启用，以及宽限计划计算。
 */
function isPolicyGraceEnabled() {
  return readGateFlag().enabled;
}
//@ chunk-aepeg2w5.js:626838-627035 placement
/**
 * 按开关计算组织配置计划（按记录键缓存）。
 */
function resolveOrgConfigPlan(e, n, r = Date.now()) {
  if (e === null || n === undefined) return e;
  let s = `${e}:${n}`;
  if (orgConfigPlanCache.record === s) return orgConfigPlanCache.plan;
  let gateFlag = readGateFlag();
  let y = gateFlag.enabled ? keepIfFreshOrgConfig(e, n, gateFlag.graceTtlHours, r) : e;
  orgConfigPlanCache.record = s;
  orgConfigPlanCache.plan = y;
  return y;
}
//@ chunk-aepeg2w5.js:627035-627052 placement
var REVALIDATE_IN_FULL_AFTER_MS = 21600000;
//@ chunk-aepeg2w5.js:893333-893603 fingerprint = getAuthHeaders (0.587)
function getAuthHeaders_2(endpoint) {
  if (isFirstPartyManagedOAuthContext() || isBareMode()) return;
  if (
    !isActualFirstPartyAnthropicBaseUrl() ||
    !isFirstPartyAnthropicHost(endpoint) ||
    !isHttpsEndpoint_2(endpoint)
  )
    return;
  let oauthTokens = effectiveAuthTokenEnv();
  if (!oauthTokens || !oauthTokens.startsWith("sk-ant-")) return;
  let sliced = oauthTokens.slice(7, 10);
  if (sliced === "api")
    return {
      headers: {
        "x-api-key": oauthTokens,
      },
    };
  if (sliced === "oat")
    return {
      headers: {
        Authorization: `Bearer ${oauthTokens}`,
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
    };
  return;
}
//@ chunk-7t4fmt2f.js:16761-17340 fingerprint = fetchWithRetry (0.431)
async function fetchWithRetry(
  e,
  r,
  credentials,
  storageV5,
  signal,
  p,
  oauthRefreshLatch,
  y = FETCH_MAX_RETRIES,
  { hedge: E = false, prefetched: R } = {},
) {
  let lastResult = null;
  let K = (signal, A = false) =>
    fetchPolicyLimits(e, r, credentials, storageV5, oauthRefreshLatch, signal, A);
  let b = false;
  for (let attempt = 1; attempt <= y + 1; attempt++) {
    let A = R ?? abortableAttempt(K);
    R = undefined;
    if (E && attempt === 1) {
      let G = await hedgedRequest({
        first: A,
        send: (P) => K(P, true),
        isAnswer: (P, M) =>
          P.success ||
          (P.skipRetry === true && !(M && P.errorCode === "auth_failed" && P.httpStatus === 401)),
        stillWanted: isManagedConfigPrefetchOn,
        retryFollows: y > 0,
      });
      lastResult = G.result;
      b ||= G.hedged;
    } else lastResult = await A.attempt;
    lastResult.attempts = attempt;
    if (b) lastResult.hedged = true;
    if (lastResult.success || lastResult.skipRetry || attempt > y) return lastResult;
    p(lastResult);
    let delayMs = getRetryDelay(attempt);
    logForDebugging(`Policy limits: Retry ${attempt}/${y} after ${delayMs}ms`);
    await sleep(delayMs, signal);
    if (signal?.aborted) return lastResult;
  }
  return lastResult;
}
//@ chunk-7t4fmt2f.js:17340-21874 fingerprint = fetchPolicyLimits (0.351)
/**
 * 请求 /api/claude_code/policy_limits（Bearer），支持 ETag/304，失败分类为 auth_failed/network_error/timeout 等，结果写入会话缓存与 policy-limits.json。
 */
async function fetchPolicyLimits(e, r, n, o, u, signal, h = false) {
  let y;
  let E;
  let R = false;
  let S = 0;
  let K = oauthRefreshLatchStamp(u.recoveries);
  let authHeaders = getPolicyLimitsTunnelSocket();
  let w = null;
  let A = null;
  let O = false;
  let G = null;
  let stampAtWire;
  try {
    let endpoint = policyLimitsEndpointUrl();
    let q = {};
    let T = async () => {
      await noteStoredLoginAccountAtWire(o, n);
      let U = currentPolicyCacheKey();
      let authHeaders = await getAuthHeadersAsync(
        isGateAOn()
          ? {}
          : {
              envBearerFallbackFor: endpoint,
            },
      );
      let te = effectiveAuthTokenEnv();
      G = te !== undefined && authHeaders.headers.Authorization === `Bearer ${te}` ? tokenDigest(te) : null;
      if (authHeaders.error) {
        O = true;
        w = null;
        A = null;
        return authHeaders;
      }
      noteWifAccountAtWire();
      let policyPrincipal = getPolicyPrincipal();
      stampAtWire = rowPrincipalStamp();
      let s = policyPrincipal === null ? null : policyCacheKey(policyPrincipal);
      O = U !== s;
      w = O ? null : s;
      A =
        w !== null && isClassifiedPrincipal(policyPrincipal)
          ? principalCacheKeyWithBearer(policyPrincipal)
          : G !== null && isHostManagedProviderAuth()
            ? envBearerCacheKey(G)
            : null;
      return authHeaders;
    };
    if (!authHeaders) {
      y = await checkAndRefreshOAuthTokenIfNeededWithOutcome({
        credentials: n,
      });
      let U = await T();
      if (U.error)
        return {
          success: false,
          error: "Authentication required for policy limits",
          errorCode: "auth_failed",
          authUnavailableReason: U.reasonCode,
          tokenRefreshOutcome: y,
          skipRetry: !isAuthFailureWorthRetrying(y, undefined),
        };
      q = U.headers;
      let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
      R = Boolean(
        claudeAIOAuthTokens?.accessToken &&
        claudeAIOAuthTokens.refreshToken &&
        q.Authorization === `Bearer ${claudeAIOAuthTokens.accessToken}`,
      );
    }
    let oe = revalidationChecksumForPolicy(e, r);
    let se = async () => {
      S++;
      if (S > 1) K = oauthRefreshLatchStamp(u.recoveries);
      let authHeaders_2 = S === 1 || authHeaders ? q : (await T()).headers;
      return fetchPolicyLimitsResponse({
        endpoint,
        authHeaders: authHeaders_2,
        ifNoneMatch: oe,
        timeoutMs: POLICY_REQUEST_TIMEOUT_MS,
        socketPath: authHeaders,
        signal,
      });
    };
    let I = authHeaders
      ? await se()
      : await withOAuth401Retry(se, {
          credentials: n,
          gateToSessionOAuthCredential: true,
          oauthRefreshLatch: u,
          signal,
          onForcedRefreshOutcome: (status) => {
            E = {
              outcome: status,
            };
            u.lastOutcome = status;
          },
        });
    if (I.kind === "not_modified") {
      if (!oe || !e) {
        logForDebugging("Policy limits: 304 to an unconditional request");
        return {
          success: false,
          error: "Unexpected 304 Not Modified",
          errorCode: "request_failed",
          httpStatus: 304,
          skipRetry: true,
          principalKeyAtWire: w,
          askedKeyAtWire: A,
          principalMovedAtWire: O,
          stampAtWire,
          retriedAfter401: S > 1,
        };
      }
      if (!I.requestIdPresent && isPolicyGraceEnabled()) {
        logForDebugging(
          "Policy limits: 304 without Anthropic's request id \u2014 an intermediary's answer, keeping cached restrictions",
        );
        return {
          success: false,
          error: "304 from an intermediary (no Anthropic request id)",
          errorCode: "request_failed",
          httpStatus: 304,
          skipRetry: true,
          requestIdPresent: false,
          principalKeyAtWire: w,
          askedKeyAtWire: A,
          principalMovedAtWire: O,
          stampAtWire,
          retriedAfter401: S > 1,
        };
      }
      if (S === 1 && !h) restoreOAuthRefreshLatch(u, K);
      logForDebugging("Policy limits: Using cached restrictions (304)");
      return {
        success: true,
        response: null,
        etag: e,
        signature: I.signature,
        requestIdPresent: true,
        principalKeyAtWire: w,
        askedKeyAtWire: A,
        principalMovedAtWire: O,
        stampAtWire,
        retriedAfter401: S > 1,
        ...(G !== null &&
          S === 1 && {
            sentEnvBearerDigest: G,
          }),
        ...(I.tunnelCredentialEpoch !== undefined && {
          tunnelCredentialEpoch: I.tunnelCredentialEpoch,
        }),
      };
    }
    let X = projectPolicyLimitsBody(I.data);
    if (!X.success) {
      let U = responseShapeField(X.error.issues[0]?.path[0]);
      let V = contentKindOf(I.contentType);
      logForDebugging(`Policy limits: Invalid response format - field=${U} ct=${V} - ${X.error.message}`);
      return {
        success: false,
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
        stampAtWire,
        retriedAfter401: S > 1,
      };
    }
    restoreOAuthRefreshLatch(u, K);
    let j = countDroppedComplianceTaints(I.data);
    if (j > 0) {
      logForDebugging(`Policy limits: Fetched with ${j} malformed compliance_taints element(s) dropped`);
      return {
        success: true,
        response: X.data,
        parseErrorField: "compliance_taints",
        lossyComplianceTaints: true,
        signature: I.signature,
        principalKeyAtWire: w,
        askedKeyAtWire: A,
        principalMovedAtWire: O,
        stampAtWire,
        retriedAfter401: S > 1,
        ...(G !== null && {
          sentEnvBearerDigest: G,
        }),
        ...(I.tunnelCredentialEpoch !== undefined && {
          tunnelCredentialEpoch: I.tunnelCredentialEpoch,
        }),
      };
    }
    logForDebugging("Policy limits: Fetched successfully");
    return {
      success: true,
      response: X.data,
      signature: I.signature,
      principalKeyAtWire: w,
      askedKeyAtWire: A,
      principalMovedAtWire: O,
      stampAtWire,
      retriedAfter401: S > 1,
      ...(G !== null && {
        sentEnvBearerDigest: G,
      }),
      ...(I.tunnelCredentialEpoch !== undefined && {
        tunnelCredentialEpoch: I.tunnelCredentialEpoch,
      }),
    };
  } catch (error) {
    let { kind, status, message } = classifyAxiosError(error);
    let se = {
      ...extractServerErrorFields(error),
      ...responseHeaderFactsOf(error),
    };
    let forcedRefreshOutcome = E !== undefined ? E.outcome : R && u.attempted ? u.lastOutcome : undefined;
    let X = isTransientNetworkError(error);
    let j = {
      ...(S > 0 && {
        principalKeyAtWire: w,
        askedKeyAtWire: A,
        principalMovedAtWire: O,
        stampAtWire,
      }),
      ...(X !== undefined && {
        tunnelCredentialEpoch: X,
      }),
    };
    switch (
      (logForDebugging(
        `Policy limits: fetch failed (${kind}${status ? ` ${status}` : ""}) from ${policyEndpointHost()} \u2014 ${message}`,
      ),
      kind)
    ) {
      case "auth":
        return {
          success: false,
          error: "Not authorized for policy limits",
          errorCode: "auth_failed",
          httpStatus: status,
          tokenRefreshOutcome: y,
          skipRetry: !(status === 401 && R && isAuthFailureWorthRetrying(y, E)),
          retriedAfter401: S > 1,
          forcedRefreshOutcome,
          sentStoredLogin: R,
          ...se,
          ...j,
        };
      case "timeout":
        return {
          success: false,
          error: "Policy limits request timeout",
          errorCode: "timeout",
          errno: fetchErrorCode(error),
          retriedAfter401: S > 1,
          ...j,
        };
      case "network":
        return {
          success: false,
          error: "Cannot connect to server",
          errorCode: "network_error",
          errno: fetchErrorCode(error),
          retriedAfter401: S > 1,
          ...j,
        };
      default:
        return {
          success: false,
          error: message,
          errorCode: "request_failed",
          httpStatus: status,
          skipRetry: isNonRetryableClientError(status),
          retriedAfter401: S > 1,
          forcedRefreshOutcome,
          ...(kind === "http" &&
            status === undefined && {
              noResponse: true,
              errno: fetchErrorCode(error),
            }),
          ...se,
          ...j,
        };
    }
  }
}
//@ chunk-18hwfzwa.js:1046691-1046806 fingerprint = ESSENTIAL_TRAFFIC_DENY_ON_MISS (0.772)
function isFeedbackSurveyAllowed() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DUNWICH_BELL, false) &&
    isAutoMemoryEnabled() &&
    !shouldSkipFeedbackSurvey() &&
    isPolicyAllowed_2("allow_product_feedback") &&
    !env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY
  );
}
//@ chunk-1wpnxx5r.js:3119-3164 fingerprint = isPolicyAllowed (0.71)
/**
 * 按策略限制判断某项功能是否允许（缓存命中或失败开放）。
 */
function isPolicyAllowed() {
  return isRemoteBrowserEnabled() || remoteBrowserEnabledState.on || remoteBrowserAllowedState.allowed;
}
//@ chunk-2xp8150w.js:2601-2725 fingerprint = loadCachedRestrictions (0.611)
function loadCachedRestrictions(permissionContext) {
  let restrictions = isPlainObject(permissionContext) ? permissionContext.restrictions : undefined;
  return (
    isPlainObject(restrictions) &&
    Object.values(Uo(restrictions, RESTRICTION_KEYS)).some(
      (t) => !neutralRestrictionSchema().safeParse(t).success,
    )
  );
}
//@ chunk-dcmhvw5a.js:173545-173634 fingerprint = computeChecksum (1)
function computeChecksum(restrictions) {
  let sorted = sortKeysDeep(restrictions);
  let normalized = jsonStringify(sorted);
  return `sha256:${createHash("sha256").update(normalized).digest("hex")}`;
}
//@ chunk-yxnffbzs.js:2475-2672 fingerprint = getPolicyLimitsEndpoint (0.467)
/**
 * 策略禁用与会话禁用两种原因文案（供各功能共用）。
 */
var POLICY_LIMITS_PATH = "/api/claude_code/policy_limits";
var DISABLED_BY_POLICY_REASON = "disabled by your organization's policy";
var DISABLED_FOR_SESSION_REASON =
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
  DISABLED_BY_POLICY_REASON,
  DISABLED_FOR_SESSION_REASON,
};
