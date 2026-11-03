/**
 * services/claudeGateway/headerPolicy.ts
 *
 * 2.1.316 新增：网关请求头透传策略
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (2)
 * attribution: placement 2
 */

//@ chunk-1ny7cxrt.js:1387798-1388194 placement
var HTTPS_API_ANTHROPIC_COM = "https://api.anthropic.com",
  nbe = new Set([
    "authorization",
    "proxy-authorization",
    "x-api-key",
    "api-key",
    "host",
    "content-length",
    "content-encoding",
    "transfer-encoding",
    "connection",
    "keep-alive",
    "te",
    "trailer",
    "upgrade",
    "expect",
    "content-type",
    "accept",
    "accept-encoding",
    "user-agent",
    "x-litellm-end-user-id",
  ]),
  rbe = ["anthropic-", "x-stainless-", "x-claude-gateway-", "x-goog-", "x-amz-", "x-amzn-"];
//@ chunk-1ny7cxrt.js:1388194-1388260 placement
function ibe(e) {
  return nbe.has(e) || rbe.some((t) => e.startsWith(t));
}

export { ibe, HTTPS_API_ANTHROPIC_COM };
