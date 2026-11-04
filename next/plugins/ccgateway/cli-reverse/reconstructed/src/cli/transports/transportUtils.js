/**
 * cli/transports/transportUtils.ts
 *
 * 按 URL 选择传输实现（ws/wss → WebSocket，http(s) → Hybrid/SSE）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/transports/transportUtils.ts
 * pieces: chunk-1wpnxx5r.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-1wpnxx5r.js:2162-2276 fingerprint (2.1.88 match: getTransportForUrl, 0.738)
/**
 * 把 ws:/wss: 协议改成 http:/https:。
 */
function getTransportForUrl(url) {
  if (url.protocol === "wss:") url.protocol = "https:";
  else if (url.protocol === "ws:") url.protocol = "http:";
  return url;
}
export { getTransportForUrl };
