/**
 * utils/model/firstPartyBaseUrl.ts
 *
 * 2.1.316 新增：第一方提供商下 base URL 是否指向 Anthropic 官方。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w7m8zp6e.js (4)
 * attribution: placement 4
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

//@ chunk-w7m8zp6e.js:387-472 placement (2.1.88 match: logEventTo1P, 1)
function isOfficialFirstPartyEndpoint(apiProvider = getAPIProvider()) {
  if (apiProvider !== "firstParty" || !isFirstPartyAnthropicBaseUrl_2()) return false;
  if (assumesFirstPartyBaseUrl()) return true;
  return isFirstPartyAnthropicBaseUrl();
}
//@ chunk-w7m8zp6e.js:472-647 placement
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
//@ chunk-w7m8zp6e.js:647-756 placement
function isFirstPartyAnthropicBaseUrl() {
  if (env.ANTHROPIC_BASE_URL !== undefined || !isWIFDispatchAuth()) return true;
  let resolvedWIFBaseUrlSnapshot = getResolvedWIFBaseUrlSnapshot();
  return (
    resolvedWIFBaseUrlSnapshot === null ||
    (resolvedWIFBaseUrlSnapshot !== undefined && isFirstPartyAnthropicHost(resolvedWIFBaseUrlSnapshot))
  );
}
//@ chunk-w7m8zp6e.js:756-931 placement (2.1.88 match: getDefaultApiBaseUrl, 0.82)
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
export { isFirstPartyBaseUrl, getApiBaseUrl, isOfficialFirstPartyEndpoint };
