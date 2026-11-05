/**
 * cli/transports/transportUtils.ts
 *
 * 按 URL 选择传输实现（ws/wss → WebSocket，http(s) → Hybrid/SSE）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/transports/transportUtils.ts
 * pieces: chunk-hfc4cfnt.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-hfc4cfnt.js:2168-2282 placement
/**
 * 把 ws:/wss: 协议改成 http:/https:。
 */
function httpUrlFromWs(url) {
  if (url.protocol === "wss:") url.protocol = "https:";
  else if (url.protocol === "ws:") url.protocol = "http:";
  return url;
}
export { httpUrlFromWs };
