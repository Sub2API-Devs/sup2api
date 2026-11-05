/**
 * utils/apiPreconnect.ts
 *
 * 启动时向 Anthropic API 发一个 HEAD /api/hello 预热 TCP/TLS 连接（仅第一方直连、无代理/客户端证书时）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/apiPreconnect.ts
 * pieces: chunk-fxk1e28j.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getProviderState } from "./model/providerCaches.js";
import { getAPIProvider } from "./model/providers.js";
import { getForcedLoginMethod, adminPolicyUnreadable } from "./auth.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { env } from "./env.js";
import { getOauthConfig } from "../constants/oauth.js";
import { fetchWithRequestBodyCompression } from "../services/api/gzipRequestBody.js";

//@ chunk-fxk1e28j.js:4825-5277 fingerprint (2.1.88 match: preconnectAnthropicApi, 0.678)
/**
 * 预连接：每进程一次；只在第一方、非网关、无 HTTP(S)_PROXY/ANTHROPIC_UNIX_SOCKET/客户端证书时，对 ANTHROPIC_BASE_URL 或默认 API 发 HEAD /api/hello（10s 超时，忽略失败）。
 */
function preconnectAnthropicApi() {
  let providerCache = getProviderState().providerCache;
  if (providerCache.preconnectFired) return;
  providerCache.preconnectFired = true;
  if (getAPIProvider() !== "firstParty" || getForcedLoginMethod() === "gateway" || adminPolicyUnreadable())
    return;
  if (isEssentialTrafficOnly()) return;
  if (
    env.HTTPS_PROXY ||
    env.https_proxy ||
    env.HTTP_PROXY ||
    env.http_proxy ||
    env.ANTHROPIC_UNIX_SOCKET ||
    env.CLAUDE_CODE_CLIENT_CERT ||
    env.CLAUDE_CODE_CLIENT_KEY
  )
    return;
  let baseUrl = env.ANTHROPIC_BASE_URL || getOauthConfig().BASE_API_URL;
  fetchWithRequestBodyCompression(`${baseUrl.replace(/\/+$/, "")}/api/hello`, {
    method: "HEAD",
    signal: AbortSignal.timeout(1e4),
  }).catch(() => {});
}
export { preconnectAnthropicApi };
