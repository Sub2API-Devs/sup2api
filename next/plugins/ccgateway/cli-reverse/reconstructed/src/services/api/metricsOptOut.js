/**
 * services/api/metricsOptOut.ts
 *
 * 组织指标日志开关：查询 metrics_logging_enabled 并缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/metricsOptOut.ts
 * pieces: chunk-3n6ygrtf.js (17)
 * attribution: placement 14, fingerprint 2, file-local 1
 */
import { guardTelemetryCredentials } from "../analytics/telemetryCredentialGuard.js";
import { getAuthHeadersAsync, withOAuth401Retry } from "../../utils/http.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { apiClient } from "../routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { TELEMETRY_LOG_PREFIX } from "../analytics/anthropicTelemetryExport.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { errorMessage } from "../../utils/errors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { memoizeWithTTL } from "../../utils/memoize.js";
import {
  getAnthropicApiKeyWithSourceSafe,
  getConfiguredApiKeyHelper,
  getAuthenticatedAccountInfo,
  getOauthAccountInfo,
  isAnthropicAuthEnabled,
  isClaudeAISubscriber,
  hasProfileScope,
} from "../../utils/auth.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { env } from "../../utils/env.js";
import { getOauthTokenFromFd, getRootSession } from "../../bootstrap/state.js";
import { usableLauncherHostLoginToken } from "../../utils/auth/launcherHostLogin.js";
import { readFreshOauthAccountFromDisk, saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import { Feed } from "../../components/LogoV2/Feed.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3n6ygrtf.js:665-741 placement
/**
 * 指标开关查询的缓存与刷新间隔（1 小时 / 1 天）与接口路径。
 */
var METRICS_CACHE_TTL_MS = 3600000;
var METRICS_STATUS_REFRESH_MS = 86400000;
var METRICS_ENABLED_PATH = "/api/claude_code/organizations/metrics_enabled";
//@ chunk-3n6ygrtf.js:741-764 placement
class MetricsCheckError extends Error {}
//@ chunk-3n6ygrtf.js:764-1238 placement
/**
 * 调 metrics_enabled 接口（绕过仅必要流量限制、5 秒超时、不跟随重定向）查询组织是否允许指标日志；无可用凭证或响应缺字段时抛错。
 */
async function fetchMetricsEnabled() {
  let response = guardTelemetryCredentials(
    await getAuthHeadersAsync(),
    `${getOauthConfig().BASE_API_URL}${METRICS_ENABLED_PATH}`,
  );
  if (response.error)
    throw new MetricsCheckError("Auth error: no credential usable for the metrics opt-out check");
  let metricsResponse = await apiClient.get(METRICS_ENABLED_PATH, {
    auth: "none",
    headers: response.headers,
    timeout: 5000,
    bypassEssentialTrafficOnly: true,
    maxRedirects: 0,
  });
  if (!metricsResponse.ok)
    throw new MetricsCheckError(`metrics_enabled unavailable: ${metricsResponse.reason}`);
  if (typeof metricsResponse.data?.metrics_logging_enabled !== "boolean")
    throw Error("metrics_enabled response missing metrics_logging_enabled");
  return metricsResponse.data;
}
//@ chunk-3n6ygrtf.js:1238-1718 fingerprint (2.1.88 match: _checkMetricsEnabledAPI, 0.713)
/**
 * 调用指标开关接口，返回 {enabled, hasError}。
 */
async function _checkMetricsEnabledAPI(credentials) {
  try {
    let data = await withOAuth401Retry(fetchMetricsEnabled, {
      also403Revoked: true,
      gateToSessionOAuthCredential: true,
      oauthRefreshLatch: credentials,
    });
    credentials.attempted = false;
    logForDebugging(
      `${TELEMETRY_LOG_PREFIX} Metrics opt-out API response: enabled=${data.metrics_logging_enabled}`,
    );
    logFeatureOk("api_metrics_opt_out_check");
    return {
      enabled: data.metrics_logging_enabled,
      hasError: false,
    };
  } catch (error) {
    logForDebugging(
      `${TELEMETRY_LOG_PREFIX} Failed to check metrics opt-out status: ${errorMessage(error)}`,
      error instanceof MetricsCheckError
        ? {
            level: "error",
          }
        : undefined,
    );
    logFeatureBad("api_metrics_opt_out_check", "request_failed");
    return {
      enabled: false,
      hasError: true,
    };
  }
}
//@ chunk-3n6ygrtf.js:1718-1840 placement
var metricsMemoByHost; // deferred: uses memoizeWithTTL (../../utils/memoize.js) of its import cycle while loading; runs once the cycle is complete
var metricsIdentityByHost;
deferInit("chunk-3n6ygrtf.js:1718", () => {
  metricsMemoByHost = new HostScoped(() => {
    let state = {
      attempted: false,
    };
    return {
      memo: memoizeWithTTL(() => _checkMetricsEnabledAPI(state), METRICS_CACHE_TTL_MS),
      oauthRefreshLatch: state,
    };
  });
  metricsIdentityByHost = new HostScoped(() => ({
    identity: undefined,
  }));
});
//@ chunk-3n6ygrtf.js:1840-2017 placement
function apiKeyPrincipal() {
  let { key, source } = getAnthropicApiKeyWithSourceSafe();
  if (key === null) return null;
  if (source === "apiKeyHelper") {
    let configuredApiKeyHelper = getConfiguredApiKeyHelper();
    return configuredApiKeyHelper
      ? `key:helper:${computeContentHash(configuredApiKeyHelper).slice(0, 16)}`
      : null;
  }
  return `key:${computeContentHash(key).slice(0, 16)}`;
}
//@ chunk-3n6ygrtf.js:2017-2297 placement
function oauthPrincipal(account) {
  let authenticatedAccountInfo = getAuthenticatedAccountInfo();
  if (authenticatedAccountInfo !== undefined)
    return authenticatedAccountInfo.organizationUuid !== undefined
      ? `acct:${authenticatedAccountInfo.accountUuid}/${authenticatedAccountInfo.organizationUuid}`
      : null;
  if (!account?.accountUuid || !account.organizationUuid) return null;
  return env.CLAUDE_CODE_OAUTH_TOKEN || getOauthTokenFromFd() || usableLauncherHostLoginToken() !== null
    ? null
    : `acct:${account.accountUuid}/${account.organizationUuid}`;
}
//@ chunk-3n6ygrtf.js:2297-2368 placement
function currentMetricsPrincipal() {
  let account = getOauthAccountInfo();
  if (account !== undefined) return oauthPrincipal(account);
  return isAnthropicAuthEnabled() ? null : apiKeyPrincipal();
}
//@ chunk-3n6ygrtf.js:2368-2485 placement
async function currentPrincipal(storage) {
  let account = getOauthAccountInfo();
  if (account === undefined) return isAnthropicAuthEnabled() ? null : apiKeyPrincipal();
  if (getAuthenticatedAccountInfo() !== undefined) return oauthPrincipal(account);
  return oauthPrincipal(await readFreshOauthAccountFromDisk(storage));
}
//@ chunk-3n6ygrtf.js:2485-2731 placement
function principalCacheKey() {
  let oauthAccountInfo = getOauthAccountInfo();
  if (oauthAccountInfo !== undefined || isAnthropicAuthEnabled()) {
    let authenticatedAccountInfo = getAuthenticatedAccountInfo();
    if (authenticatedAccountInfo !== undefined)
      return `acct:${authenticatedAccountInfo.accountUuid}/${authenticatedAccountInfo.organizationUuid ?? "?"}`;
    if (oauthAccountInfo !== undefined)
      return `acct:${oauthAccountInfo.accountUuid ?? "?"}/${oauthAccountInfo.organizationUuid ?? "?"}`;
    return "oauth:no-record";
  }
  return apiKeyPrincipal() ?? "none";
}
//@ chunk-3n6ygrtf.js:2731-2907 placement
function _clearMetricsEnabledCacheForTesting() {
  let host = getRootSession().host;
  let memo = metricsMemoByHost.of(host);
  let identity = metricsIdentityByHost.of(host);
  let cacheKey = principalCacheKey();
  if (identity.identity !== undefined && identity.identity !== cacheKey) {
    memo.memo.cache.clear();
    memo.oauthRefreshLatch.attempted = false;
  }
  identity.identity = cacheKey;
  return memo.memo();
}
//@ chunk-3n6ygrtf.js:2907-3025 placement
/**
 * 清除指标开关的记忆缓存、OAuth 刷新闩和身份缓存（认证变化时调用）。
 */
function clearMetricsEnabledCache() {
  let host = getRootSession().host;
  let state = metricsMemoByHost.of(host);
  state.memo.cache.clear();
  state.oauthRefreshLatch.attempted = false;
  metricsIdentityByHost.of(host).identity = undefined;
}
//@ chunk-3n6ygrtf.js:3025-3392 placement
/**
 * 刷新指标开关：查询期间若登录主体变了则判为失败；结果与缓存相同且未过期则不写，否则写入全局配置。
 */
async function refreshMetricsStatusFor(storage) {
  let principal = currentMetricsPrincipal() === null ? null : await currentPrincipal(storage);
  let clearResult = await _clearMetricsEnabledCacheForTesting();
  if (clearResult.hasError) return clearResult;
  if (principal === null) return clearResult;
  if ((await currentPrincipal(storage)) !== principal) {
    logFeatureBad("api_metrics_opt_out_check", "principal_changed_mid_flight");
    return {
      enabled: false,
      hasError: true,
    };
  }
  if (currentMetricsPrincipal() !== principal) return clearResult;
  let status = cachedMetricsStatus(principal);
  if (
    status !== undefined &&
    status.enabled === clearResult.enabled &&
    Date.now() - status.timestamp < METRICS_STATUS_REFRESH_MS
  )
    return clearResult;
  await saveGlobalConfig((config) => checkMetricsEnabled(config, principal, clearResult.enabled), storage);
  return clearResult;
}
//@ chunk-3n6ygrtf.js:3392-3624 file-local
function checkMetricsEnabled(principal, enabled, enabled_2) {
  if (
    currentMetricsPrincipal() !== enabled ||
    (enabled.startsWith("acct:") && principal.oauthAccount === undefined)
  )
    return principal;
  return {
    ...principal,
    metricsStatusCache: undefined,
    metricsStatusCacheByPrincipal: Feed({
      ...principal.metricsStatusCacheByPrincipal,
      [enabled]: {
        enabled: enabled_2,
        timestamp: Date.now(),
      },
    }),
  };
}
//@ chunk-3n6ygrtf.js:3774-3880 placement (2.1.88 match: _temp, 0.672)
/**
 * 判断缓存行是否有效：enabled 是布尔值且 timestamp 是不晚于现在的有限数。
 */
function isValidStatusCacheLine(line) {
  return (
    typeof line?.enabled === "boolean" && Number.isFinite(line.timestamp) && line.timestamp <= Date.now()
  );
}
//@ chunk-3n6ygrtf.js:3880-3973 placement
function cachedMetricsStatus(principal) {
  let line = getGlobalConfig().metricsStatusCacheByPrincipal?.[principal];
  return line !== undefined && isValidStatusCacheLine(line) ? line : undefined;
}
//@ chunk-3n6ygrtf.js:3973-4181 fingerprint (2.1.88 match: refreshMetricsStatus, 0.736)
/**
 * 优先读缓存（过期则后台刷新），否则请求。
 */
async function refreshMetricsStatus(storage) {
  if (isClaudeAISubscriber() && !hasProfileScope())
    return {
      enabled: false,
      hasError: false,
    };
  let principal = currentMetricsPrincipal();
  let status = principal === null ? undefined : cachedMetricsStatus(principal);
  if (status !== undefined) {
    if (Date.now() - status.timestamp > METRICS_STATUS_REFRESH_MS)
      refreshMetricsStatusFor(storage).catch(logError);
    return {
      enabled: status.enabled,
      hasError: false,
    };
  }
  return refreshMetricsStatusFor(storage);
}
export { isValidStatusCacheLine, clearMetricsEnabledCache, refreshMetricsStatus };
