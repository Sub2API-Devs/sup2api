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
import { Re } from "../../../runtime/bun-runtime.js";
import { require_node_http_handler } from "../../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { getBedrockInferenceProfiles_2 } from "../../utils/model/bedrock.js";

//@ chunk-aepeg2w5.js:129758-129791 placement
function settingsSyncEndpointWithAuth(e) {
  return credentialForEndpointHost(getSettingsSyncEndpoint(), e);
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
function apiKeyForHost(e) {
  let n = currentBaseUrl();
  let r = n === undefined || !getCurrentRepoHttpsUrl(n);
  return !e || (r && !isAnthropicApiKey(e)) ? null : e;
}
//@ chunk-aepeg2w5.js:130169-130243 placement
function credentialForEndpointHost(e, n) {
  let r = isHttpsUrl(n) ? hostOfUrl(n) : undefined;
  return e !== undefined && e === r && getCurrentRepoHttpsUrl(r);
}
//@ chunk-aepeg2w5.js:130243-130316 placement
function isHttpsUrl(e) {
  try {
    return new URL(e).protocol === "https:";
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:130316-130385 placement
function hostOfUrl(e) {
  if (!e) return;
  try {
    return new URL(e).host;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:130385-130452 placement = getCurrentRepoHttpsUrl (0.803)
function getCurrentRepoHttpsUrl(e) {
  return isFirstPartyAnthropicHost(`https://${e}`) || ALLOWED_OAUTH_BASE_URLS.some((n) => hostOfUrl(n) === e);
}
//@ chunk-aepeg2w5.js:130452-130470 placement
var apiKeyForHostGuard = Re(require_node_http_handler(), 1);
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
