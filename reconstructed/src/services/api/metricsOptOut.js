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
import { X3 } from "../analytics/anthropicTelemetryExport.js";
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
var S = 3600000,
  _ = 86400000,
  h = "/api/claude_code/organizations/metrics_enabled";
//@ chunk-3n6ygrtf.js:741-764 placement
class a extends Error {}
/**
 * 调 metrics_enabled 接口（绕过仅必要流量限制、5 秒超时、不跟随重定向）查询组织是否允许指标日志；无可用凭证或响应缺字段时抛错。
 */
//@ chunk-3n6ygrtf.js:764-1238 placement
async function fetchMetricsEnabled() {
  let e = guardTelemetryCredentials(await getAuthHeadersAsync(), `${getOauthConfig().BASE_API_URL}${h}`);
  if (e.error) throw new a("Auth error: no credential usable for the metrics opt-out check");
  let n = await apiClient.get(h, {
    auth: "none",
    headers: e.headers,
    timeout: 5000,
    bypassEssentialTrafficOnly: !0,
    maxRedirects: 0,
  });
  if (!n.ok) throw new a(`metrics_enabled unavailable: ${n.reason}`);
  if (typeof n.data?.metrics_logging_enabled !== "boolean")
    throw Error("metrics_enabled response missing metrics_logging_enabled");
  return n.data;
}
/**
 * 调用指标开关接口，返回 {enabled, hasError}。
 */
//@ chunk-3n6ygrtf.js:1238-1718 fingerprint = _checkMetricsEnabledAPI (0.713)
async function _checkMetricsEnabledAPI(e) {
  try {
    let data = await withOAuth401Retry(fetchMetricsEnabled, {
      also403Revoked: !0,
      gateToSessionOAuthCredential: !0,
      oauthRefreshLatch: e,
    });
    return (
      (e.attempted = !1),
      logForDebugging(`${X3} Metrics opt-out API response: enabled=${data.metrics_logging_enabled}`),
      logFeatureOk("api_metrics_opt_out_check"),
      { enabled: data.metrics_logging_enabled, hasError: !1 }
    );
  } catch (error) {
    return (
      logForDebugging(
        `${X3} Failed to check metrics opt-out status: ${errorMessage(error)}`,
        error instanceof a ? { level: "error" } : void 0,
      ),
      logFeatureBad("api_metrics_opt_out_check", "request_failed"),
      { enabled: !1, hasError: !0 }
    );
  }
}
//@ chunk-3n6ygrtf.js:1718-1840 placement
var metricsMemoByHost = new HostScoped(() => {
    let e = { attempted: !1 };
    return { memo: memoizeWithTTL(() => _checkMetricsEnabledAPI(e), S), oauthRefreshLatch: e };
  }),
  metricsIdentityByHost = new HostScoped(() => ({ identity: void 0 }));
//@ chunk-3n6ygrtf.js:1840-2017 placement
function apiKeyPrincipal() {
  let { key: key, source: source } = getAnthropicApiKeyWithSourceSafe();
  if (key === null) return null;
  if (source === "apiKeyHelper") {
    let r = getConfiguredApiKeyHelper();
    return r ? `key:helper:${computeContentHash(r).slice(0, 16)}` : null;
  }
  return `key:${computeContentHash(key).slice(0, 16)}`;
}
//@ chunk-3n6ygrtf.js:2017-2297 placement
function oauthPrincipal(account) {
  let n = getAuthenticatedAccountInfo();
  if (n !== void 0)
    return n.organizationUuid !== void 0 ? `acct:${n.accountUuid}/${n.organizationUuid}` : null;
  if (!account?.accountUuid || !account.organizationUuid) return null;
  return env.CLAUDE_CODE_OAUTH_TOKEN || getOauthTokenFromFd() || usableLauncherHostLoginToken() !== null
    ? null
    : `acct:${account.accountUuid}/${account.organizationUuid}`;
}
//@ chunk-3n6ygrtf.js:2297-2368 placement
function s() {
  let e = getOauthAccountInfo();
  if (e !== void 0) return oauthPrincipal(e);
  return isAnthropicAuthEnabled() ? null : apiKeyPrincipal();
}
//@ chunk-3n6ygrtf.js:2368-2485 placement
async function currentPrincipal(e) {
  let n = getOauthAccountInfo();
  if (n === void 0) return isAnthropicAuthEnabled() ? null : apiKeyPrincipal();
  if (getAuthenticatedAccountInfo() !== void 0) return oauthPrincipal(n);
  return oauthPrincipal(await readFreshOauthAccountFromDisk(e));
}
//@ chunk-3n6ygrtf.js:2485-2731 placement
function principalCacheKey() {
  let e = getOauthAccountInfo();
  if (e !== void 0 || isAnthropicAuthEnabled()) {
    let n = getAuthenticatedAccountInfo();
    if (n !== void 0) return `acct:${n.accountUuid}/${n.organizationUuid ?? "?"}`;
    if (e !== void 0) return `acct:${e.accountUuid ?? "?"}/${e.organizationUuid ?? "?"}`;
    return "oauth:no-record";
  }
  return apiKeyPrincipal() ?? "none";
}
//@ chunk-3n6ygrtf.js:2731-2907 placement
function _clearMetricsEnabledCacheForTesting() {
  let host = getRootSession().host,
    of = metricsMemoByHost.of(host),
    of_2 = metricsIdentityByHost.of(host),
    o = principalCacheKey();
  if (of_2.identity !== void 0 && of_2.identity !== o)
    (of.memo.cache.clear(), (of.oauthRefreshLatch.attempted = !1));
  return ((of_2.identity = o), of.memo());
}
/**
 * 清除指标开关的记忆缓存、OAuth 刷新闩和身份缓存（认证变化时调用）。
 */
//@ chunk-3n6ygrtf.js:2907-3025 placement
function clearMetricsEnabledCache() {
  let host = getRootSession().host,
    of = metricsMemoByHost.of(host);
  (of.memo.cache.clear(),
    (of.oauthRefreshLatch.attempted = !1),
    (metricsIdentityByHost.of(host).identity = void 0));
}
/**
 * 刷新指标开关：查询期间若登录主体变了则判为失败；结果与缓存相同且未过期则不写，否则写入全局配置。
 */
//@ chunk-3n6ygrtf.js:3025-3392 placement
async function refreshMetricsStatusFor(storage) {
  let n = s() === null ? null : await currentPrincipal(storage),
    r = await _clearMetricsEnabledCacheForTesting();
  if (r.hasError) return r;
  if (n === null) return r;
  if ((await currentPrincipal(storage)) !== n)
    return (
      logFeatureBad("api_metrics_opt_out_check", "principal_changed_mid_flight"),
      { enabled: !1, hasError: !0 }
    );
  if (s() !== n) return r;
  let o = k(n);
  if (o !== void 0 && o.enabled === r.enabled && Date.now() - o.timestamp < _) return r;
  return (await saveGlobalConfig((C) => checkMetricsEnabled(C, n, r.enabled), storage), r);
}
//@ chunk-3n6ygrtf.js:3392-3624 file-local
function checkMetricsEnabled(e, n, r) {
  if (s() !== n || (n.startsWith("acct:") && e.oauthAccount === void 0)) return e;
  return {
    ...e,
    metricsStatusCache: void 0,
    metricsStatusCacheByPrincipal: Feed({
      ...e.metricsStatusCacheByPrincipal,
      [n]: { enabled: r, timestamp: Date.now() },
    }),
  };
}
/**
 * 判断缓存行是否有效：enabled 是布尔值且 timestamp 是不晚于现在的有限数。
 */
//@ chunk-3n6ygrtf.js:3774-3880 placement = _temp (0.672)
function isValidStatusCacheLine(line) {
  return (
    typeof line?.enabled === "boolean" && Number.isFinite(line.timestamp) && line.timestamp <= Date.now()
  );
}
//@ chunk-3n6ygrtf.js:3880-3973 placement
function k(e) {
  let n = getGlobalConfig().metricsStatusCacheByPrincipal?.[e];
  return n !== void 0 && isValidStatusCacheLine(n) ? n : void 0;
}
/**
 * 优先读缓存（过期则后台刷新），否则请求。
 */
//@ chunk-3n6ygrtf.js:3973-4181 fingerprint = refreshMetricsStatus (0.736)
async function refreshMetricsStatus(e) {
  if (isClaudeAISubscriber() && !hasProfileScope()) return { enabled: !1, hasError: !1 };
  let n = s(),
    r = n === null ? void 0 : k(n);
  if (r !== void 0) {
    if (Date.now() - r.timestamp > _) refreshMetricsStatusFor(e).catch(logError);
    return { enabled: r.enabled, hasError: !1 };
  }
  return refreshMetricsStatusFor(e);
}

export { isValidStatusCacheLine, clearMetricsEnabledCache, refreshMetricsStatus };
