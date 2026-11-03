/**
 * services/api/customHeaders.ts
 *
 * 2.1.316 新增：自定义请求头与 bearer 处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (9)
 * attribution: placement 9
 */
import { env } from "../../utils/env.js";
import { getCustomHeaders } from "./client.js";
import { isHipaaOrg, isAfkModeBeta } from "../../utils/betas.js";

//@ chunk-bwbq4xvm.js:156608-156645 placement
function hasCustomApiKeyHeader() {
  return hasCustomHeader("x-api-key");
}
/**
 * ANTHROPIC_API_KEY 存在且自定义头/调用方都没给 x-api-key 时返回 {"X-Api-Key": key}。
 */
//@ chunk-bwbq4xvm.js:156645-156815 placement
function apiKeyHeaderFromEnv(e = {}) {
  let ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (
    ANTHROPIC_API_KEY === void 0 ||
    hasCustomApiKeyHeader() ||
    Object.entries(e).some(([n, r]) => n.toLowerCase() === "x-api-key" && r !== void 0)
  )
    return;
  return { "X-Api-Key": ANTHROPIC_API_KEY };
}
//@ chunk-bwbq4xvm.js:156815-156857 placement
function hasCustomAuthorizationHeader() {
  return hasCustomHeader("authorization");
}
//@ chunk-bwbq4xvm.js:156857-156899 placement
function customHeaderNames() {
  return getCustomHeaders().map(([e]) => e);
}
//@ chunk-bwbq4xvm.js:156899-156958 placement
function hasCustomHeader(e) {
  return customHeaderNames().some((s) => s.toLowerCase() === e);
}
//@ chunk-bwbq4xvm.js:156958-157078 placement
function clearAuthorizationHeaders() {
  let e = { Authorization: void 0 };
  for (let [s] of getCustomHeaders()) if (s.toLowerCase() === "authorization") e[s] = void 0;
  return e;
}
/**
 * 从 ANTHROPIC_CUSTOM_HEADERS 中挑出 anthropic-beta 头，去掉 afk-mode 项；在特定模式下整头置 undefined。
 */
//@ chunk-bwbq4xvm.js:157078-157362 placement
function filteredCustomBetaHeaders() {
  let e = {},
    s = isHipaaOrg();
  for (let [n, r] of getCustomHeaders()) {
    if (n.toLowerCase() !== "anthropic-beta") continue;
    let filtered = r
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      filtered_2 = filtered.filter((c) => !isAfkModeBeta(c));
    if (s) e[n] = void 0;
    else if (filtered_2.length !== filtered.length)
      e[n] = filtered_2.length > 0 ? filtered_2.join(",") : void 0;
    else delete e[n];
  }
  return e;
}
//@ chunk-bwbq4xvm.js:157416-157507 placement
var CLOUD_AUTH_SLOT = {
  __auth: { provider: null, tokenCache: null, resolution: null, error: null, extraHeaders: {} },
};
/**
 * 优先 ANTHROPIC_AUTH_TOKEN（加 Bearer 前缀），否则取自定义头里的 Authorization。
 */
//@ chunk-bwbq4xvm.js:157507-157701 placement
function bearerFromEnvOrHeaders() {
  let ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN;
  if (ANTHROPIC_AUTH_TOKEN) return `Bearer ${ANTHROPIC_AUTH_TOKEN}`;
  let s,
    fromEntries = Object.fromEntries(getCustomHeaders());
  for (let [r, a] of Object.entries(fromEntries)) if (r.toLowerCase() === "authorization") s = a;
  return s || void 0;
}

export {
  hasCustomApiKeyHeader,
  clearAuthorizationHeaders,
  CLOUD_AUTH_SLOT,
  hasCustomAuthorizationHeader,
  bearerFromEnvOrHeaders,
  customHeaderNames,
  filteredCustomBetaHeaders,
  apiKeyHeaderFromEnv,
};
