/**
 * services/claudeGateway/headerPolicy.ts
 *
 * 2.1.316 新增：网关请求头透传策略
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-1hnjmk23.js:1389635-1390031 placement
/**
 * 保留的请求头前缀（anthropic-、x-stainless-、x-claude-gateway-、x-goog-、x-amz-、x-amzn-）。
 */
var HTTPS_API_ANTHROPIC_COM = "https://api.anthropic.com";
var RESERVED_FORWARD_HEADERS = new Set([
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
]);
var RESERVED_HEADER_PREFIXES = [
  "anthropic-",
  "x-stainless-",
  "x-claude-gateway-",
  "x-goog-",
  "x-amz-",
  "x-amzn-",
];
//@ chunk-1hnjmk23.js:1390031-1390097 placement
/**
 * 判断请求头名是否保留（命中保留集合或前缀）。
 */
function isReservedHeaderName(name) {
  return (
    RESERVED_FORWARD_HEADERS.has(name) || RESERVED_HEADER_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}
export { isReservedHeaderName, HTTPS_API_ANTHROPIC_COM };
