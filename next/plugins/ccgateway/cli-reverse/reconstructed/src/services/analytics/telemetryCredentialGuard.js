/**
 * services/analytics/telemetryCredentialGuard.ts
 *
 * 2.1.316 新增：遥测请求的凭据头只发往其所属主机，否则扣下并报 misrouted_credential；获取并缓存 Bedrock 推理配置等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (11)
 * attribution: placement 10, layout 1
 */
import { getOauthConfig, ALLOWED_OAUTH_BASE_URLS } from "../../constants/oauth.js";
import { isGatewayUrlForBaseAndSync, currentBaseUrl } from "../gateway/constants.js";
import { isAnthropicApiKey } from "../../utils/anthropicHosts.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_node_http_handler } from "../../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { getBedrockInferenceProfiles_2 } from "../../utils/model/bedrock.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:139267-139300 placement
function settingsSyncEndpointWithAuth(endpoint) {
  return credentialForEndpointHost(baseApiHost(), endpoint);
}
//@ chunk-exfmq47h.js:139300-139361 layout
function baseApiHost() {
  try {
    return hostOfUrl(getOauthConfig().BASE_API_URL);
  } catch {
    return;
  }
}
//@ chunk-exfmq47h.js:139361-139603 placement
/**
 * 遥测请求的凭据头只发往其所属主机，否则扣下并报 misrouted_credential。
 */
function guardTelemetryCredentials(authHeaders, endpoint) {
  if (!(
    ("x-api-key" in authHeaders.headers && !isGatewayUrlForBaseAndSync(endpoint)) ||
    ("Authorization" in authHeaders.headers && !settingsSyncEndpointWithAuth(endpoint))
  ))
    return authHeaders;
  return {
    headers: {},
    error: "credential withheld: this telemetry endpoint is not the host it belongs to",
    reasonCode: "misrouted_credential",
  };
}
//@ chunk-exfmq47h.js:139603-139678 placement
/**
 * 对非 Anthropic 主机不发送 API key。
 */
function apiKeyForHost(apiKey) {
  let baseUrl = currentBaseUrl();
  let notOurs = baseUrl === undefined || !getCurrentRepoHttpsUrl(baseUrl);
  return !apiKey || (notOurs && !isAnthropicApiKey(apiKey)) ? null : apiKey;
}
//@ chunk-exfmq47h.js:139678-139752 placement
function credentialForEndpointHost(host, endpoint) {
  let endpointHost = isHttpsUrl(endpoint) ? hostOfUrl(endpoint) : undefined;
  return host !== undefined && host === endpointHost && getCurrentRepoHttpsUrl(endpointHost);
}
//@ chunk-exfmq47h.js:139752-139825 placement
function isHttpsUrl(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:139825-139894 placement
function hostOfUrl(url) {
  if (!url) return;
  try {
    return new URL(url).host;
  } catch {
    return;
  }
}
//@ chunk-exfmq47h.js:139894-139961 placement (2.1.88 match: getCurrentRepoHttpsUrl, 0.805)
function getCurrentRepoHttpsUrl(host) {
  return (
    isFirstPartyAnthropicHost(`https://${host}`) ||
    ALLOWED_OAUTH_BASE_URLS.some((url) => hostOfUrl(url) === host)
  );
}
//@ chunk-exfmq47h.js:139961-139979 placement
var apiKeyForHostGuard; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:139961", () => {
  apiKeyForHostGuard = __toESM(require_node_http_handler(), 1);
});
//@ chunk-exfmq47h.js:139979-140175 placement
/**
 * 获取并缓存 Bedrock 推理配置。
 */
function getBedrockInferenceProfiles() {
  let providerCache = getProviderState().providerCache;
  if (providerCache.bedrockInferenceProfiles === undefined)
    providerCache.bedrockInferenceProfiles = getBedrockInferenceProfiles_2().then(
      (bedrockInferenceProfiles) => {
        providerCache.settledBedrockInferenceProfiles = bedrockInferenceProfiles;
        return bedrockInferenceProfiles;
      },
    );
  return providerCache.bedrockInferenceProfiles;
}
//@ chunk-exfmq47h.js:140175-140247 placement
function getBedrockInferenceProfilesGuard() {
  return getProviderState().providerCache.settledBedrockInferenceProfiles;
}
export {
  guardTelemetryCredentials,
  apiKeyForHost,
  credentialForEndpointHost,
  baseApiHost,
  hostOfUrl,
  apiKeyForHostGuard,
  getBedrockInferenceProfiles,
  getBedrockInferenceProfilesGuard,
};
