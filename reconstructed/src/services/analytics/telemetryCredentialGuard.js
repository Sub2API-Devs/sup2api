/**
 * services/analytics/telemetryCredentialGuard.ts
 *
 * 2.1.316 新增：遥测请求的凭据头只发往其所属主机，否则扣下并报 misrouted_credential；获取并缓存 Bedrock 推理配置等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (10)
 * attribution: placement 10
 */
import { getSettingsSyncEndpoint } from "../settingsSync/index.js";
import { isGatewayUrlForBaseAndSync, currentBaseUrl } from "../gateway/constants.js";
import { isAnthropicApiKey } from "../../utils/anthropicHosts.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { ALLOWED_OAUTH_BASE_URLS } from "../../constants/oauth.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_node_http_handler } from "../../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { getBedrockInferenceProfiles_2 } from "../../utils/model/bedrock.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:129758-129791 placement
function settingsSyncEndpointWithAuth(endpoint) {
  return credentialForEndpointHost(getSettingsSyncEndpoint(), endpoint);
}
//@ chunk-aepeg2w5.js:129852-130094 placement
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
//@ chunk-aepeg2w5.js:130094-130169 placement
/**
 * 对非 Anthropic 主机不发送 API key。
 */
function apiKeyForHost(apiKey) {
  let baseUrl = currentBaseUrl();
  let notOurs = baseUrl === undefined || !getCurrentRepoHttpsUrl(baseUrl);
  return !apiKey || (notOurs && !isAnthropicApiKey(apiKey)) ? null : apiKey;
}
//@ chunk-aepeg2w5.js:130169-130243 placement
function credentialForEndpointHost(host, endpoint) {
  let endpointHost = isHttpsUrl(endpoint) ? hostOfUrl(endpoint) : undefined;
  return host !== undefined && host === endpointHost && getCurrentRepoHttpsUrl(endpointHost);
}
//@ chunk-aepeg2w5.js:130243-130316 placement
function isHttpsUrl(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:130316-130385 placement
function hostOfUrl(url) {
  if (!url) return;
  try {
    return new URL(url).host;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:130385-130452 placement = getCurrentRepoHttpsUrl (0.803)
function getCurrentRepoHttpsUrl(host) {
  return (
    isFirstPartyAnthropicHost(`https://${host}`) ||
    ALLOWED_OAUTH_BASE_URLS.some((url) => hostOfUrl(url) === host)
  );
}
//@ chunk-aepeg2w5.js:130452-130470 placement
var apiKeyForHostGuard; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:130452", () => {
  apiKeyForHostGuard = __toESM(require_node_http_handler(), 1);
});
//@ chunk-aepeg2w5.js:130470-130666 placement
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
//@ chunk-aepeg2w5.js:130666-130738 placement
function getBedrockInferenceProfilesGuard() {
  return getProviderState().providerCache.settledBedrockInferenceProfiles;
}
export {
  guardTelemetryCredentials,
  apiKeyForHost,
  credentialForEndpointHost,
  hostOfUrl,
  apiKeyForHostGuard,
  getBedrockInferenceProfiles,
  getBedrockInferenceProfilesGuard,
};
