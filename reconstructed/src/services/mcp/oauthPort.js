/**
 * services/mcp/oauthPort.ts
 *
 * 并入已有模块：MCP OAuth 端口。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/oauthPort.ts
 * pieces: chunk-3tvkk9nn.js (7)
 * attribution: placement 1, layout 2, fingerprint 3, sole-consumer 1
 */
import { getPlatform } from "../../utils/platform.js";
import { env } from "../../utils/env.js";
import { startNodeRelay } from "../../upstreamproxy/relay.js";

//@ chunk-3tvkk9nn.js:297-361 placement
/**
 * 取数组第一项或原值，空值返回 undefined。
 */
function firstOf(n) {
  let r = Array.isArray(n) ? n[0] : n;
  return r ? r : undefined;
}
//@ chunk-3tvkk9nn.js:361-372 layout
/**
 * 回调端口回退值（3118）。
 */
var FALLBACK_OAUTH_PORT = 3118;
//@ chunk-3tvkk9nn.js:372-470 layout
/**
 * 回调端口的取值范围（Windows 与其他平台不同）与回退端口。
 */
function defaultPortPolicy() {
  return {
    range:
      getPlatform() === "windows"
        ? {
            min: 39152,
            max: 49151,
          }
        : {
            min: 49152,
            max: 65535,
          },
    fallback: FALLBACK_OAUTH_PORT,
  };
}
//@ chunk-3tvkk9nn.js:470-527 fingerprint = buildRedirectUri (1)
/**
 * buildRedirectUri：http://localhost:<port>/callback（默认端口 3118）。
 */
function buildRedirectUri(port = FALLBACK_OAUTH_PORT) {
  return `http://localhost:${port}/callback`;
}
//@ chunk-3tvkk9nn.js:527-609 fingerprint = getMcpOAuthCallbackPort (1)
/**
 * getMcpOAuthCallbackPort：读 MCP_OAUTH_CALLBACK_PORT（≤65535）。
 */
function getMcpOAuthCallbackPort() {
  let port = env.MCP_OAUTH_CALLBACK_PORT;
  return port !== undefined && port <= 65535 ? port : undefined;
}
//@ chunk-3tvkk9nn.js:609-952 fingerprint = findAvailablePort (0.667)
/**
 * findAvailablePort：OAuth 回调端口选择：环境变量 > 指定端口 > 在随机区间（Windows 39152–49151，其他 49152–65535）最多试 100 次 > 3118 > 由中继分配，都不行抛错。
 */
async function findAvailablePort(registeredLoopbackPort, r = defaultPortPolicy()) {
  let configuredPort = getMcpOAuthCallbackPort();
  if (configuredPort) return configuredPort;
  if (registeredLoopbackPort && (await canRelayOnPort(registeredLoopbackPort))) return registeredLoopbackPort;
  let { min, max } = r.range;
  let range = max - min + 1;
  let maxAttempts = Math.min(range, 100);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let c = min + Math.floor(Math.random() * range);
    if (await canRelayOnPort(c)) return c;
  }
  if (await canRelayOnPort(r.fallback)) return r.fallback;
  let nodeRelay = await startNodeRelay(0);
  if (nodeRelay !== undefined) return nodeRelay;
  throw Error("No available ports for OAuth redirect");
}
//@ chunk-3tvkk9nn.js:952-999 sole-consumer
/**
 * 判断能否在该端口启动中继。
 */
async function canRelayOnPort(n) {
  return (await startNodeRelay(n)) !== undefined;
}
export { buildRedirectUri, findAvailablePort, firstOf };
