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
function Pdn(n) {
  let r = Array.isArray(n) ? n[0] : n;
  return r ? r : void 0;
}
//@ chunk-3tvkk9nn.js:361-372 layout
var f = 3118;
//@ chunk-3tvkk9nn.js:372-470 layout
function p() {
  return {
    range: getPlatform() === "windows" ? { min: 39152, max: 49151 } : { min: 49152, max: 65535 },
    fallback: f,
  };
}
/**
 * buildRedirectUri：http://localhost:<port>/callback（默认端口 3118）。
 */
//@ chunk-3tvkk9nn.js:470-527 fingerprint = buildRedirectUri (1)
function buildRedirectUri(port = f) {
  return `http://localhost:${port}/callback`;
}
/**
 * getMcpOAuthCallbackPort：读 MCP_OAUTH_CALLBACK_PORT（≤65535）。
 */
//@ chunk-3tvkk9nn.js:527-609 fingerprint = getMcpOAuthCallbackPort (1)
function getMcpOAuthCallbackPort() {
  let MCP_OAUTH_CALLBACK_PORT = env.MCP_OAUTH_CALLBACK_PORT;
  return MCP_OAUTH_CALLBACK_PORT !== void 0 && MCP_OAUTH_CALLBACK_PORT <= 65535
    ? MCP_OAUTH_CALLBACK_PORT
    : void 0;
}
/**
 * findAvailablePort：OAuth 回调端口选择：环境变量 > 指定端口 > 在随机区间（Windows 39152–49151，其他 49152–65535）最多试 100 次 > 3118 > 由中继分配，都不行抛错。
 */
//@ chunk-3tvkk9nn.js:609-952 fingerprint = findAvailablePort (0.667)
async function findAvailablePort(n, r = p()) {
  let configuredPort = getMcpOAuthCallbackPort();
  if (configuredPort) return configuredPort;
  if (n && (await u(n))) return n;
  let { min: min, max: max } = r.range,
    a = max - min + 1,
    maxAttempts = Math.min(a, 100);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let c = min + Math.floor(Math.random() * a);
    if (await u(c)) return c;
  }
  if (await u(r.fallback)) return r.fallback;
  let d = await startNodeRelay(0);
  if (d !== void 0) return d;
  throw Error("No available ports for OAuth redirect");
}
//@ chunk-3tvkk9nn.js:952-999 sole-consumer
async function u(n) {
  return (await startNodeRelay(n)) !== void 0;
}

export { buildRedirectUri, findAvailablePort, Pdn };
