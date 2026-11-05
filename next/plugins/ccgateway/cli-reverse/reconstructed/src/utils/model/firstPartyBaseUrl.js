/**
 * utils/model/firstPartyBaseUrl.ts
 *
 * 2.1.316 新增：第一方提供商下 base URL 是否指向 Anthropic 官方。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5m9bvhje.js (5)
 * attribution: placement 5
 */
import {
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl as isFirstPartyAnthropicBaseUrl_2,
  assumesFirstPartyBaseUrl,
  isActualFirstPartyAnthropicBaseUrl,
  isFirstPartyAnthropicHost,
} from "./providers.js";
import { env } from "../env.js";
import { shouldUseWIFAuth, isWIFDispatchAuth } from "../auth.js";
import { getResolvedWIFBaseUrlSnapshot } from "../../services/oauth/wifCredentials.js";
import { getWIFProfileBaseUrl } from "../wifProfile.js";

//@ chunk-5m9bvhje.js:387-472 placement (2.1.88 match: logEventTo1P, 1)
/**
 * 第一方且特定条件下是否在用自定义第一方 base url。
 */
function isOfficialFirstPartyEndpoint(provider = getAPIProvider()) {
  if (provider !== "firstParty" || !isFirstPartyAnthropicBaseUrl_2()) return false;
  if (assumesFirstPartyBaseUrl()) return true;
  return isFirstPartyAnthropicBaseUrl();
}
//@ chunk-5m9bvhje.js:472-540 placement (2.1.88 match: logEventTo1P, 1)
/**
 * 第一方且另一条件下是否在用自定义第一方 base url。
 */
function logEventTo1P_2(provider = getAPIProvider()) {
  if (provider !== "firstParty" || !isActualFirstPartyAnthropicBaseUrl()) return false;
  return isFirstPartyAnthropicBaseUrl();
}
//@ chunk-5m9bvhje.js:540-714 placement
/**
 * 第一方提供商下 base URL 是否指向 Anthropic 官方。
 */
function isFirstPartyBaseUrl(provider = getAPIProvider()) {
  if (provider !== "firstParty" || !isActualFirstPartyAnthropicBaseUrl()) return false;
  if (env.ANTHROPIC_BASE_URL !== undefined || !shouldUseWIFAuth() || !isWIFDispatchAuth()) return true;
  let resolvedWIFBaseUrlSnapshot = getResolvedWIFBaseUrlSnapshot();
  let baseUrl =
    resolvedWIFBaseUrlSnapshot === undefined ? (getWIFProfileBaseUrl() ?? null) : resolvedWIFBaseUrlSnapshot;
  return baseUrl === null || isFirstPartyAnthropicHost(baseUrl);
}
//@ chunk-5m9bvhje.js:714-823 placement
function isFirstPartyAnthropicBaseUrl() {
  if (env.ANTHROPIC_BASE_URL !== undefined || !isWIFDispatchAuth()) return true;
  let resolvedWIFBaseUrlSnapshot = getResolvedWIFBaseUrlSnapshot();
  return (
    resolvedWIFBaseUrlSnapshot === null ||
    (resolvedWIFBaseUrlSnapshot !== undefined && isFirstPartyAnthropicHost(resolvedWIFBaseUrlSnapshot))
  );
}
//@ chunk-5m9bvhje.js:823-998 placement (2.1.88 match: getDefaultApiBaseUrl, 0.82)
/**
 * ANTHROPIC_BASE_URL，或第一方自定义端点，否则 api.anthropic.com。
 */
function getApiBaseUrl() {
  if (env.ANTHROPIC_BASE_URL !== undefined) return env.ANTHROPIC_BASE_URL;
  try {
    if (isWIFDispatchAuth()) {
      let resolvedWIFBaseUrlSnapshot = getResolvedWIFBaseUrlSnapshot();
      if (typeof resolvedWIFBaseUrlSnapshot === "string") return resolvedWIFBaseUrlSnapshot;
    }
  } catch {}
  return "https://api.anthropic.com";
}
export { isFirstPartyBaseUrl, getApiBaseUrl, isOfficialFirstPartyEndpoint, logEventTo1P_2 };
