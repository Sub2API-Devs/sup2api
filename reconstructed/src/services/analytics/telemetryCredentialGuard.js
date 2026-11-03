/**
 * services/analytics/telemetryCredentialGuard.ts
 *
 * 2.1.316 新增：遥测请求的凭据头只发往其所属主机，否则扣下并报 misrouted_credential；获取并缓存 Bedrock 推理配置等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (9)
 * attribution: placement 9
 */
import { fD, Tc } from "../gateway/constants.js";
import { mD } from "./_new/telemetryCredentialGuard.helpers-aepe.js";
import { DIi } from "../../utils/anthropicHosts.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { ALLOWED_OAUTH_BASE_URLS } from "../../constants/oauth.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { E$ } from "../../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { getBedrockInferenceProfiles_2 } from "../../utils/model/bedrock.js";

/**
 * 遥测请求的凭据头只发往其所属主机，否则扣下并报 misrouted_credential。
 */
//@ chunk-aepeg2w5.js:129852-130094 placement
function guardTelemetryCredentials(e, n) {
  if (!(("x-api-key" in e.headers && !fD(n)) || ("Authorization" in e.headers && !mD(n)))) return e;
  return {
    headers: {},
    error: "credential withheld: this telemetry endpoint is not the host it belongs to",
    reasonCode: "misrouted_credential",
  };
}
/**
 * 对非 Anthropic 主机不发送 API key。
 */
//@ chunk-aepeg2w5.js:130094-130169 placement
function apiKeyForHost(e) {
  let n = Tc(),
    r = n === void 0 || !getCurrentRepoHttpsUrl(n);
  return !e || (r && !DIi(e)) ? null : e;
}
//@ chunk-aepeg2w5.js:130169-130243 placement
function Da(e, n) {
  let r = gD(n) ? Fa(n) : void 0;
  return e !== void 0 && e === r && getCurrentRepoHttpsUrl(r);
}
//@ chunk-aepeg2w5.js:130243-130316 placement
function gD(e) {
  try {
    return new URL(e).protocol === "https:";
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:130316-130385 placement
function Fa(e) {
  if (!e) return;
  try {
    return new URL(e).host;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:130385-130452 placement = getCurrentRepoHttpsUrl (0.803)
function getCurrentRepoHttpsUrl(e) {
  return isFirstPartyAnthropicHost(`https://${e}`) || ALLOWED_OAUTH_BASE_URLS.some((n) => Fa(n) === e);
}
//@ chunk-aepeg2w5.js:130452-130470 placement
var xc = Re(E$(), 1);
/**
 * 获取并缓存 Bedrock 推理配置。
 */
//@ chunk-aepeg2w5.js:130470-130666 placement
function getBedrockInferenceProfiles() {
  let providerCache = getProviderState().providerCache;
  if (providerCache.bedrockInferenceProfiles === void 0)
    providerCache.bedrockInferenceProfiles = getBedrockInferenceProfiles_2().then(
      (n) => ((providerCache.settledBedrockInferenceProfiles = n), n),
    );
  return providerCache.bedrockInferenceProfiles;
}
//@ chunk-aepeg2w5.js:130666-130738 placement
function Ry() {
  return getProviderState().providerCache.settledBedrockInferenceProfiles;
}

export { guardTelemetryCredentials, apiKeyForHost, Da, Fa, xc, getBedrockInferenceProfiles, Ry };
