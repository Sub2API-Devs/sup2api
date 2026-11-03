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
  let e = guardTelemetryCredentials(
    await getAuthHeadersAsync(),
    `${getOauthConfig().BASE_API_URL}${METRICS_ENABLED_PATH}`,
  );
  if (e.error) throw new MetricsCheckError("Auth error: no credential usable for the metrics opt-out check");
  let n = await apiClient.get(METRICS_ENABLED_PATH, {
    auth: "none",
    headers: e.headers,
    timeout: 5000,
    bypassEssentialTrafficOnly: true,
    maxRedirects: 0,
  });
  if (!n.ok) throw new MetricsCheckError(`metrics_enabled unavailable: ${n.reason}`);
  if (typeof n.data?.metrics_logging_enabled !== "boolean")
    throw Error("metrics_enabled response missing metrics_logging_enabled");
  return n.data;
}
//@ chunk-3n6ygrtf.js:1238-1718 fingerprint = _checkMetricsEnabledAPI (0.713)
/**
 * 调用指标开关接口，返回 {enabled, hasError}。
 */
async function _checkMetricsEnabledAPI(e) {
  try {
    let data = await withOAuth401Retry(fetchMetricsEnabled, {
      also403Revoked: true,
      gateToSessionOAuthCredential: true,
      oauthRefreshLatch: e,
    });
    e.attempted = false;
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
var metricsMemoByHost = new HostScoped(() => {
  let e = {
    attempted: false,
  };
  return {
    memo: memoizeWithTTL(() => _checkMetricsEnabledAPI(e), METRICS_CACHE_TTL_MS),
    oauthRefreshLatch: e,
  };
});
var metricsIdentityByHost = new HostScoped(() => ({
  identity: undefined,
}));
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
  let n = metricsMemoByHost.of(host);
  let r = metricsIdentityByHost.of(host);
  let o = principalCacheKey();
  if (r.identity !== undefined && r.identity !== o) {
    n.memo.cache.clear();
    n.oauthRefreshLatch.attempted = false;
  }
  r.identity = o;
  return n.memo();
}
//@ chunk-3n6ygrtf.js:2907-3025 placement
/**
 * 清除指标开关的记忆缓存、OAuth 刷新闩和身份缓存（认证变化时调用）。
 */
function clearMetricsEnabledCache() {
  let host = getRootSession().host;
  let n = metricsMemoByHost.of(host);
  n.memo.cache.clear();
  n.oauthRefreshLatch.attempted = false;
  metricsIdentityByHost.of(host).identity = undefined;
}
//@ chunk-3n6ygrtf.js:3025-3392 placement
/**
 * 刷新指标开关：查询期间若登录主体变了则判为失败；结果与缓存相同且未过期则不写，否则写入全局配置。
 */
async function refreshMetricsStatusFor(storage) {
  let n = currentMetricsPrincipal() === null ? null : await currentPrincipal(storage);
  let r = await _clearMetricsEnabledCacheForTesting();
  if (r.hasError) return r;
  if (n === null) return r;
  if ((await currentPrincipal(storage)) !== n) {
    logFeatureBad("api_metrics_opt_out_check", "principal_changed_mid_flight");
    return {
      enabled: false,
      hasError: true,
    };
  }
  if (currentMetricsPrincipal() !== n) return r;
  let o = cachedMetricsStatus(n);
  if (o !== undefined && o.enabled === r.enabled && Date.now() - o.timestamp < METRICS_STATUS_REFRESH_MS)
    return r;
  await saveGlobalConfig((C) => checkMetricsEnabled(C, n, r.enabled), storage);
  return r;
}
//@ chunk-3n6ygrtf.js:3392-3624 file-local
function checkMetricsEnabled(e, n, enabled) {
  if (currentMetricsPrincipal() !== n || (n.startsWith("acct:") && e.oauthAccount === undefined)) return e;
  return {
    ...e,
    metricsStatusCache: undefined,
    metricsStatusCacheByPrincipal: Feed({
      ...e.metricsStatusCacheByPrincipal,
      [n]: {
        enabled,
        timestamp: Date.now(),
      },
    }),
  };
}
//@ chunk-3n6ygrtf.js:3774-3880 placement = _temp (0.672)
/**
 * 判断缓存行是否有效：enabled 是布尔值且 timestamp 是不晚于现在的有限数。
 */
function isValidStatusCacheLine(line) {
  return (
    typeof line?.enabled === "boolean" && Number.isFinite(line.timestamp) && line.timestamp <= Date.now()
  );
}
//@ chunk-3n6ygrtf.js:3880-3973 placement
function cachedMetricsStatus(e) {
  let line = getGlobalConfig().metricsStatusCacheByPrincipal?.[e];
  return line !== undefined && isValidStatusCacheLine(line) ? line : undefined;
}
//@ chunk-3n6ygrtf.js:3973-4181 fingerprint = refreshMetricsStatus (0.736)
/**
 * 优先读缓存（过期则后台刷新），否则请求。
 */
async function refreshMetricsStatus(storage) {
  if (isClaudeAISubscriber() && !hasProfileScope())
    return {
      enabled: false,
      hasError: false,
    };
  let n = currentMetricsPrincipal();
  let r = n === null ? undefined : cachedMetricsStatus(n);
  if (r !== undefined) {
    if (Date.now() - r.timestamp > METRICS_STATUS_REFRESH_MS)
      refreshMetricsStatusFor(storage).catch(logError);
    return {
      enabled: r.enabled,
      hasError: false,
    };
  }
  return refreshMetricsStatusFor(storage);
}
export { isValidStatusCacheLine, clearMetricsEnabledCache, refreshMetricsStatus };
