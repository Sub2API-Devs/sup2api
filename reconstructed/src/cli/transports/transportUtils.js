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

/**
 * 把 ws:/wss: 协议改成 http:/https:。
 */
//@ chunk-1wpnxx5r.js:2162-2276 fingerprint = getTransportForUrl (0.738)
function getTransportForUrl(e) {
  if (e.protocol === "wss:") e.protocol = "https:";
  else if (e.protocol === "ws:") e.protocol = "http:";
  return e;
}

export { getTransportForUrl };
