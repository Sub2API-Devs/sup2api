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
import { sortKeysDeep, isGateAOn } from "../../utils/settings/settingsSourceTrust.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  isRemoteBrowserEnabled,
  remoteBrowserEnabledState,
  remoteBrowserAllowedState,
} from "../mcp/remoteBrowserServer.js";
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
import { isPlainObject } from "../../utils/objectUtils.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  RESTRICTION_KEYS,
  neutralRestrictionSchema,
} from "../../utils/permissions/permissionContextSerialization.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:173545-173634 fingerprint (2.1.88 match: computeChecksum, 1)
function computeChecksum(restrictions) {
  let sorted = sortKeysDeep(restrictions);
  let normalized = jsonStringify(sorted);
  return `sha256:${createHash("sha256").update(normalized).digest("hex")}`;
}
//@ chunk-1wpnxx5r.js:3119-3164 fingerprint (2.1.88 match: isPolicyAllowed, 0.71)
/**
 * 按策略限制判断某项功能是否允许（缓存命中或失败开放）。
 */
function isPolicyAllowed() {
  return isRemoteBrowserEnabled() || remoteBrowserEnabledState.on || remoteBrowserAllowedState.allowed;
}
//@ chunk-yxnffbzs.js:2475-2672 fingerprint (2.1.88 match: getPolicyLimitsEndpoint, 0.467)
/**
 * 策略禁用与会话禁用两种原因文案（供各功能共用）。
 */
var POLICY_LIMITS_PATH = "/api/claude_code/policy_limits";
var DISABLED_BY_POLICY_REASON = "disabled by your organization's policy";
var DISABLED_FOR_SESSION_REASON =
  "disabled for the rest of this session because an organization with a restricted policy was signed in earlier";
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
  report(kind, detail) {
    let key = `${kind}:${detail}`;
    if (this.lastProblem === key) return;
    this.lastProblem = key;
    try {
      this.reporter?.(kind, detail);
    } catch {}
  }
}
//@ chunk-aepeg2w5.js:626442-626524 placement
/**
 * org-config 开关计划的单项缓存与读取器单例。
 */
var orgConfigPlanCache; // deferred: uses ReaderRegistry of its import cycle while loading; runs once the cycle is complete
var orgConfigGateReaders;
deferInit("chunk-aepeg2w5.js:626442", () => {
  orgConfigPlanCache = identity_2(
    {
      record: undefined,
      plan: null,
    },
    (store) => {
      store.record = undefined;
      store.plan = null;
    },
  );
  orgConfigGateReaders = new ReaderRegistry();
});
//@ chunk-aepeg2w5.js:626524-626587 placement (2.1.88 match: AgentsJsonSchema, 0.484)
/**
 * 注册 org-config 开关读取器与问题报告器（与代理无关，切分误归）。
 */
function registerGateReader(reader, fallback = null) {
  orgConfigPlanCache.record = undefined;
  return orgConfigGateReaders.register(reader, fallback);
}
//@ chunk-aepeg2w5.js:626587-626804 placement
/**
 * 读取已注册的 org-config 开关值，读取失败/格式错误时报告并返回默认值。
 */
function readGateFlag() {
  let reader = orgConfigGateReaders.reader;
  if (!reader) return DEFAULT_ORG_CONFIG_REQUIRED_FLAG;
  let rawFlag;
  try {
    rawFlag = reader();
  } catch (error) {
    orgConfigGateReaders.report("unreadable", error instanceof Error ? error.name : typeof error);
    return DEFAULT_ORG_CONFIG_REQUIRED_FLAG;
  }
  let { flag, problem } = parseRelayFlag(rawFlag);
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
function resolveOrgConfigPlan(plan, verifiedAtMs, nowMs = Date.now()) {
  if (plan === null || verifiedAtMs === undefined) return plan;
  let cacheKey = `${plan}:${verifiedAtMs}`;
  if (orgConfigPlanCache.record === cacheKey) return orgConfigPlanCache.plan;
  let gateFlag = readGateFlag();
  let resolved = gateFlag.enabled
    ? keepIfFreshOrgConfig(plan, verifiedAtMs, gateFlag.graceTtlHours, nowMs)
    : plan;
  orgConfigPlanCache.record = cacheKey;
  orgConfigPlanCache.plan = resolved;
  return resolved;
}
//@ chunk-aepeg2w5.js:627035-627052 placement
var REVALIDATE_IN_FULL_AFTER_MS = 21600000;
//@ chunk-aepeg2w5.js:893333-893603 fingerprint (2.1.88 match: getAuthHeaders, 0.587)
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
//@ chunk-7t4fmt2f.js:16761-17340 fingerprint (2.1.88 match: fetchWithRetry, 0.431)
async function fetchWithRetry(
  etag,
  cachePath,
  credentials,
  storageV5,
  signal,
  onAttemptResult,
  oauthRefreshLatch,
  maxRetries = FETCH_MAX_RETRIES,
  { hedge = false, prefetched } = {},
) {
  let lastResult = null;
  let sendRequest = (signal, forceRefresh = false) =>
    fetchPolicyLimits(etag, cachePath, credentials, storageV5, oauthRefreshLatch, signal, forceRefresh);
  let hedged = false;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    let pendingAttempt = prefetched ?? abortableAttempt(sendRequest);
    prefetched = undefined;
    if (hedge && attempt === 1) {
      let hedgedResult = await hedgedRequest({
        first: pendingAttempt,
        send: (signal) => sendRequest(signal, true),
        isAnswer: (attemptResult, isHedged) =>
          attemptResult.success ||
          (attemptResult.skipRetry === true &&
            !(isHedged && attemptResult.errorCode === "auth_failed" && attemptResult.httpStatus === 401)),
        stillWanted: isManagedConfigPrefetchOn,
        retryFollows: maxRetries > 0,
      });
      lastResult = hedgedResult.result;
      hedged ||= hedgedResult.hedged;
    } else lastResult = await pendingAttempt.attempt;
    lastResult.attempts = attempt;
    if (hedged) lastResult.hedged = true;
    if (lastResult.success || lastResult.skipRetry || attempt > maxRetries) return lastResult;
    onAttemptResult(lastResult);
    let delayMs = getRetryDelay(attempt);
    logForDebugging(`Policy limits: Retry ${attempt}/${maxRetries} after ${delayMs}ms`);
    await sleep(delayMs, signal);
    if (signal?.aborted) return lastResult;
  }
  return lastResult;
}
//@ chunk-7t4fmt2f.js:17340-21874 fingerprint (2.1.88 match: fetchPolicyLimits, 0.351)
/**
 * 请求 /api/claude_code/policy_limits（Bearer），支持 ETag/304，失败分类为 auth_failed/network_error/timeout 等，结果写入会话缓存与 policy-limits.json。
 */
async function fetchPolicyLimits(
  etag,
  cachePath,
  credentials,
  storageV5,
  oauthRefreshLatch,
  signal,
  prefetched = false,
) {
  let refreshOutcome;
  let forcedRefresh;
  let sentStoredLogin = false;
  let attemptCount = 0;
  let latchStamp = oauthRefreshLatchStamp(oauthRefreshLatch.recoveries);
  let authHeaders = getPolicyLimitsTunnelSocket();
  let principalKeyAtWire = null;
  let askedKeyAtWire = null;
  let principalMovedAtWire = false;
  let sentEnvBearerDigest = null;
  let stampAtWire;
  try {
    let endpoint = policyLimitsEndpointUrl();
    let headers = {};
    let resolveAuthHeaders = async () => {
      await noteStoredLoginAccountAtWire(storageV5, credentials);
      let currentCacheKey = currentPolicyCacheKey();
      let authHeaders = await getAuthHeadersAsync(
        isGateAOn()
          ? {}
          : {
              envBearerFallbackFor: endpoint,
            },
      );
      let envToken = effectiveAuthTokenEnv();
      sentEnvBearerDigest =
        envToken !== undefined && authHeaders.headers.Authorization === `Bearer ${envToken}`
          ? tokenDigest(envToken)
          : null;
      if (authHeaders.error) {
        principalMovedAtWire = true;
        principalKeyAtWire = null;
        askedKeyAtWire = null;
        return authHeaders;
      }
      noteWifAccountAtWire();
      let policyPrincipal = getPolicyPrincipal();
      stampAtWire = rowPrincipalStamp();
      let principalCacheKeyNow = policyPrincipal === null ? null : policyCacheKey(policyPrincipal);
      principalMovedAtWire = currentCacheKey !== principalCacheKeyNow;
      principalKeyAtWire = principalMovedAtWire ? null : principalCacheKeyNow;
      askedKeyAtWire =
        principalKeyAtWire !== null && isClassifiedPrincipal(policyPrincipal)
          ? principalCacheKeyWithBearer(policyPrincipal)
          : sentEnvBearerDigest !== null && isHostManagedProviderAuth()
            ? envBearerCacheKey(sentEnvBearerDigest)
            : null;
      return authHeaders;
    };
    if (!authHeaders) {
      refreshOutcome = await checkAndRefreshOAuthTokenIfNeededWithOutcome({
        credentials,
      });
      let authResult = await resolveAuthHeaders();
      if (authResult.error)
        return {
          success: false,
          error: "Authentication required for policy limits",
          errorCode: "auth_failed",
          authUnavailableReason: authResult.reasonCode,
          tokenRefreshOutcome: refreshOutcome,
          skipRetry: !isAuthFailureWorthRetrying(refreshOutcome, undefined),
        };
      headers = authResult.headers;
      let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
      sentStoredLogin = Boolean(
        claudeAIOAuthTokens?.accessToken &&
        claudeAIOAuthTokens.refreshToken &&
        headers.Authorization === `Bearer ${claudeAIOAuthTokens.accessToken}`,
      );
    }
    let ifNoneMatch = revalidationChecksumForPolicy(etag, cachePath);
    let sendAttempt = async () => {
      attemptCount++;
      if (attemptCount > 1) latchStamp = oauthRefreshLatchStamp(oauthRefreshLatch.recoveries);
      let authHeaders_2 = attemptCount === 1 || authHeaders ? headers : (await resolveAuthHeaders()).headers;
      return fetchPolicyLimitsResponse({
        endpoint,
        authHeaders: authHeaders_2,
        ifNoneMatch,
        timeoutMs: POLICY_REQUEST_TIMEOUT_MS,
        socketPath: authHeaders,
        signal,
      });
    };
    let response = authHeaders
      ? await sendAttempt()
      : await withOAuth401Retry(sendAttempt, {
          credentials,
          gateToSessionOAuthCredential: true,
          oauthRefreshLatch,
          signal,
          onForcedRefreshOutcome: (status) => {
            forcedRefresh = {
              outcome: status,
            };
            oauthRefreshLatch.lastOutcome = status;
          },
        });
    if (response.kind === "not_modified") {
      if (!ifNoneMatch || !etag) {
        logForDebugging("Policy limits: 304 to an unconditional request");
        return {
          success: false,
          error: "Unexpected 304 Not Modified",
          errorCode: "request_failed",
          httpStatus: 304,
          skipRetry: true,
          principalKeyAtWire,
          askedKeyAtWire,
          principalMovedAtWire,
          stampAtWire,
          retriedAfter401: attemptCount > 1,
        };
      }
      if (!response.requestIdPresent && isPolicyGraceEnabled()) {
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
          principalKeyAtWire,
          askedKeyAtWire,
          principalMovedAtWire,
          stampAtWire,
          retriedAfter401: attemptCount > 1,
        };
      }
      if (attemptCount === 1 && !prefetched) restoreOAuthRefreshLatch(oauthRefreshLatch, latchStamp);
      logForDebugging("Policy limits: Using cached restrictions (304)");
      return {
        success: true,
        response: null,
        etag,
        signature: response.signature,
        requestIdPresent: true,
        principalKeyAtWire,
        askedKeyAtWire,
        principalMovedAtWire,
        stampAtWire,
        retriedAfter401: attemptCount > 1,
        ...(sentEnvBearerDigest !== null &&
          attemptCount === 1 && {
            sentEnvBearerDigest,
          }),
        ...(response.tunnelCredentialEpoch !== undefined && {
          tunnelCredentialEpoch: response.tunnelCredentialEpoch,
        }),
      };
    }
    let projected = projectPolicyLimitsBody(response.data);
    if (!projected.success) {
      let errorField = responseShapeField(projected.error.issues[0]?.path[0]);
      let contentType = contentKindOf(response.contentType);
      logForDebugging(
        `Policy limits: Invalid response format - field=${errorField} ct=${contentType} - ${projected.error.message}`,
      );
      return {
        success: false,
        error: "Invalid policy limits format",
        errorCode: "parse_failed",
        parseErrorField: errorField,
        parseErrorContentType: contentType,
        responseContentType: contentType,
        requestIdPresent: response.requestIdPresent,
        skipRetry: isShimmyingStardustGateOn(),
        principalKeyAtWire,
        askedKeyAtWire,
        principalMovedAtWire,
        stampAtWire,
        retriedAfter401: attemptCount > 1,
      };
    }
    restoreOAuthRefreshLatch(oauthRefreshLatch, latchStamp);
    let droppedTaints = countDroppedComplianceTaints(response.data);
    if (droppedTaints > 0) {
      logForDebugging(
        `Policy limits: Fetched with ${droppedTaints} malformed compliance_taints element(s) dropped`,
      );
      return {
        success: true,
        response: projected.data,
        parseErrorField: "compliance_taints",
        lossyComplianceTaints: true,
        signature: response.signature,
        principalKeyAtWire,
        askedKeyAtWire,
        principalMovedAtWire,
        stampAtWire,
        retriedAfter401: attemptCount > 1,
        ...(sentEnvBearerDigest !== null && {
          sentEnvBearerDigest,
        }),
        ...(response.tunnelCredentialEpoch !== undefined && {
          tunnelCredentialEpoch: response.tunnelCredentialEpoch,
        }),
      };
    }
    logForDebugging("Policy limits: Fetched successfully");
    return {
      success: true,
      response: projected.data,
      signature: response.signature,
      principalKeyAtWire,
      askedKeyAtWire,
      principalMovedAtWire,
      stampAtWire,
      retriedAfter401: attemptCount > 1,
      ...(sentEnvBearerDigest !== null && {
        sentEnvBearerDigest,
      }),
      ...(response.tunnelCredentialEpoch !== undefined && {
        tunnelCredentialEpoch: response.tunnelCredentialEpoch,
      }),
    };
  } catch (error) {
    let { kind, status, message } = classifyAxiosError(error);
    let serverFields = {
      ...extractServerErrorFields(error),
      ...responseHeaderFactsOf(error),
    };
    let forcedRefreshOutcome =
      forcedRefresh !== undefined
        ? forcedRefresh.outcome
        : sentStoredLogin && oauthRefreshLatch.attempted
          ? oauthRefreshLatch.lastOutcome
          : undefined;
    let tunnelEpoch = isTransientNetworkError(error);
    let wireFields = {
      ...(attemptCount > 0 && {
        principalKeyAtWire,
        askedKeyAtWire,
        principalMovedAtWire,
        stampAtWire,
      }),
      ...(tunnelEpoch !== undefined && {
        tunnelCredentialEpoch: tunnelEpoch,
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
          tokenRefreshOutcome: refreshOutcome,
          skipRetry: !(
            status === 401 &&
            sentStoredLogin &&
            isAuthFailureWorthRetrying(refreshOutcome, forcedRefresh)
          ),
          retriedAfter401: attemptCount > 1,
          forcedRefreshOutcome,
          sentStoredLogin,
          ...serverFields,
          ...wireFields,
        };
      case "timeout":
        return {
          success: false,
          error: "Policy limits request timeout",
          errorCode: "timeout",
          errno: fetchErrorCode(error),
          retriedAfter401: attemptCount > 1,
          ...wireFields,
        };
      case "network":
        return {
          success: false,
          error: "Cannot connect to server",
          errorCode: "network_error",
          errno: fetchErrorCode(error),
          retriedAfter401: attemptCount > 1,
          ...wireFields,
        };
      default:
        return {
          success: false,
          error: message,
          errorCode: "request_failed",
          httpStatus: status,
          skipRetry: isNonRetryableClientError(status),
          retriedAfter401: attemptCount > 1,
          forcedRefreshOutcome,
          ...(kind === "http" &&
            status === undefined && {
              noResponse: true,
              errno: fetchErrorCode(error),
            }),
          ...serverFields,
          ...wireFields,
        };
    }
  }
}
//@ chunk-18hwfzwa.js:1046691-1046806 fingerprint (2.1.88 match: ESSENTIAL_TRAFFIC_DENY_ON_MISS, 0.772)
function isFeedbackSurveyAllowed() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DUNWICH_BELL, false) &&
    isAutoMemoryEnabled() &&
    !shouldSkipFeedbackSurvey() &&
    isPolicyAllowed_2("allow_product_feedback") &&
    !env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY
  );
}
//@ chunk-2xp8150w.js:2601-2725 fingerprint (2.1.88 match: loadCachedRestrictions, 0.611)
function loadCachedRestrictions(permissionContext) {
  let restrictions = isPlainObject(permissionContext) ? permissionContext.restrictions : undefined;
  return (
    isPlainObject(restrictions) &&
    Object.values(omitAlias(restrictions, RESTRICTION_KEYS)).some(
      (restriction) => !neutralRestrictionSchema().safeParse(restriction).success,
    )
  );
}
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
