/**
 * services/api/customHeaders.ts
 *
 * 2.1.316 新增：自定义请求头与 bearer 处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kayq7nc.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import { getCustomHeaders } from "./client.js";
import { isHipaaOrg, isAfkModeBeta } from "../../utils/betas.js";

//@ chunk-7kayq7nc.js:155857-155894 placement
function hasCustomApiKeyHeader() {
  return hasCustomHeader("x-api-key");
}
//@ chunk-7kayq7nc.js:155894-156064 placement
/**
 * ANTHROPIC_API_KEY 存在且自定义头/调用方都没给 x-api-key 时返回 {"X-Api-Key": key}。
 */
function apiKeyHeaderFromEnv(headers = {}) {
  let ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (
    ANTHROPIC_API_KEY === undefined ||
    hasCustomApiKeyHeader() ||
    Object.entries(headers).some(([key, value]) => key.toLowerCase() === "x-api-key" && value !== undefined)
  )
    return;
  return {
    "X-Api-Key": ANTHROPIC_API_KEY,
  };
}
//@ chunk-7kayq7nc.js:156064-156106 placement
function hasCustomAuthorizationHeader() {
  return hasCustomHeader("authorization");
}
//@ chunk-7kayq7nc.js:156106-156148 placement
function customHeaderNames() {
  return getCustomHeaders().map(([name]) => name);
}
//@ chunk-7kayq7nc.js:156148-156207 placement
function hasCustomHeader(name) {
  return customHeaderNames().some((headerName) => headerName.toLowerCase() === name);
}
//@ chunk-7kayq7nc.js:156207-156327 placement
function clearAuthorizationHeaders() {
  let cleared = {
    Authorization: undefined,
  };
  for (let [name] of getCustomHeaders())
    if (name.toLowerCase() === "authorization") cleared[name] = undefined;
  return cleared;
}
//@ chunk-7kayq7nc.js:156327-156611 placement
/**
 * 从 ANTHROPIC_CUSTOM_HEADERS 中挑出 anthropic-beta 头，去掉 afk-mode 项；在特定模式下整头置 undefined。
 */
function filteredCustomBetaHeaders() {
  let out = {};
  let hipaa = isHipaaOrg();
  for (let [name, value] of getCustomHeaders()) {
    if (name.toLowerCase() !== "anthropic-beta") continue;
    let filtered = value
      .split(",")
      .map((beta) => beta.trim())
      .filter(Boolean);
    let filtered_2 = filtered.filter((beta) => !isAfkModeBeta(beta));
    if (hipaa) out[name] = undefined;
    else if (filtered_2.length !== filtered.length)
      out[name] = filtered_2.length > 0 ? filtered_2.join(",") : undefined;
    else delete out[name];
  }
  return out;
}
//@ chunk-7kayq7nc.js:156665-156756 placement
var CLOUD_AUTH_SLOT = {
  __auth: {
    provider: null,
    tokenCache: null,
    resolution: null,
    error: null,
    extraHeaders: {},
  },
};
//@ chunk-7kayq7nc.js:156756-156950 placement
/**
 * 优先 ANTHROPIC_AUTH_TOKEN（加 Bearer 前缀），否则取自定义头里的 Authorization。
 */
function bearerFromEnvOrHeaders() {
  let ANTHROPIC_AUTH_TOKEN = env.ANTHROPIC_AUTH_TOKEN;
  if (ANTHROPIC_AUTH_TOKEN) return `Bearer ${ANTHROPIC_AUTH_TOKEN}`;
  let authValue;
  let headerMap = Object.fromEntries(getCustomHeaders());
  for (let [key, value] of Object.entries(headerMap))
    if (key.toLowerCase() === "authorization") authValue = value;
  return authValue || undefined;
}
export {
  hasCustomApiKeyHeader,
  hasCustomAuthorizationHeader,
  clearAuthorizationHeaders,
  CLOUD_AUTH_SLOT,
  filteredCustomBetaHeaders,
  apiKeyHeaderFromEnv,
  customHeaderNames,
  bearerFromEnvOrHeaders,
};
