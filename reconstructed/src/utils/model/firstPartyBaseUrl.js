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

//@ chunk-w7m8zp6e.js:387-472 placement = logEventTo1P (1)
function isOfficialFirstPartyEndpoint(r = getAPIProvider()) {
  if (r !== "firstParty" || !isFirstPartyAnthropicBaseUrl_2()) return !1;
  if (assumesFirstPartyBaseUrl()) return !0;
  return isFirstPartyAnthropicBaseUrl();
}
/**
 * 第一方提供商下 base URL 是否指向 Anthropic 官方。
 */
//@ chunk-w7m8zp6e.js:472-647 placement
function isFirstPartyBaseUrl(r = getAPIProvider()) {
  if (r !== "firstParty" || !isActualFirstPartyAnthropicBaseUrl()) return !1;
  if (env.ANTHROPIC_BASE_URL !== void 0 || !shouldUseWIFAuth() || !isWIFDispatchAuth()) return !0;
  let t = getResolvedWIFBaseUrlSnapshot(),
    e = t === void 0 ? (getWIFProfileBaseUrl() ?? null) : t;
  return e === null || isFirstPartyAnthropicHost(e);
}
//@ chunk-w7m8zp6e.js:647-756 placement
function isFirstPartyAnthropicBaseUrl() {
  if (env.ANTHROPIC_BASE_URL !== void 0 || !isWIFDispatchAuth()) return !0;
  let r = getResolvedWIFBaseUrlSnapshot();
  return r === null || (r !== void 0 && isFirstPartyAnthropicHost(r));
}
/**
 * ANTHROPIC_BASE_URL，或第一方自定义端点，否则 api.anthropic.com。
 */
//@ chunk-w7m8zp6e.js:756-931 placement = getDefaultApiBaseUrl (0.82)
function getApiBaseUrl() {
  if (env.ANTHROPIC_BASE_URL !== void 0) return env.ANTHROPIC_BASE_URL;
  try {
    if (isWIFDispatchAuth()) {
      let r = getResolvedWIFBaseUrlSnapshot();
      if (typeof r === "string") return r;
    }
  } catch {}
  return "https://api.anthropic.com";
}

export { isFirstPartyBaseUrl, getApiBaseUrl, isOfficialFirstPartyEndpoint };
