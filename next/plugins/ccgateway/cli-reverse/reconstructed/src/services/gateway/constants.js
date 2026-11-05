/**
 * services/gateway/constants.ts
 *
 * 2.1.316 新增：云网关常量（会话过期提示、默认 API 主机等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_fetch_http_handler } from "../../../vendor/@smithy/fetch-http-handler/dist-cjs/index.js";
import { credentialForEndpointHost, baseApiHost, hostOfUrl } from "../analytics/telemetryCredentialGuard.js";
import { env } from "../../utils/env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:138705-138724 placement
/**
 * 懒加载的 @smithy/fetch-http-handler 模块。
 */
var smithyFetchHttpHandlerModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:138705", () => {
  smithyFetchHttpHandlerModule = __toESM(require_fetch_http_handler(), 1);
});
//@ chunk-exfmq47h.js:138937-139009 placement
/**
 * 网关会话过期时提示重新 /login 的文案。
 */
var GATEWAY_SESSION_EXPIRED_MESSAGE = "Cloud gateway session expired \u2014 run /login to reconnect.";
//@ chunk-exfmq47h.js:139009-139022 placement
/**
 * 网关健康检查超时（60 秒）。
 */
var GATEWAY_HEALTH_TIMEOUT_MS = 60000;
//@ chunk-exfmq47h.js:139022-139049 placement
var API_ANTHROPIC_COM = "api.anthropic.com";
//@ chunk-exfmq47h.js:139049-139103 placement
/**
 * 地址是否同时属于网关 base URL 与设置同步端点的允许范围。
 */
function isGatewayUrlForBaseAndSync(baseUrl) {
  let current = currentBaseUrl();
  return (
    credentialForEndpointHost(current, baseUrl) &&
    credentialForEndpointHost(settingsSyncEndpoint(current), baseUrl)
  );
}
//@ chunk-exfmq47h.js:139103-139130 placement
/**
 * 取设置同步端点。
 */
function settingsSyncEndpoint(baseUrl) {
  return baseApiHost();
}
//@ chunk-exfmq47h.js:139130-139210 placement
/**
 * 当前 API base URL（ANTHROPIC_BASE_URL 优先）。
 */
function currentBaseUrl() {
  if (env.ANTHROPIC_BASE_URL) return hostOfUrl(env.ANTHROPIC_BASE_URL);
  return API_ANTHROPIC_COM;
}
//@ chunk-exfmq47h.js:139210-139243 placement
/**
 * 判断地址是否属于当前 base URL 范围。
 */
function isGatewayUrlAllowed(url) {
  return credentialForEndpointHost(currentBaseUrl(), url);
}
export {
  isGatewayUrlAllowed,
  smithyFetchHttpHandlerModule,
  GATEWAY_SESSION_EXPIRED_MESSAGE,
  GATEWAY_HEALTH_TIMEOUT_MS,
  isGatewayUrlForBaseAndSync,
  currentBaseUrl,
};
