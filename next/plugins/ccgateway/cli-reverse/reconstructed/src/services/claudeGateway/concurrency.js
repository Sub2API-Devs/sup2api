/**
 * services/claudeGateway/concurrency.ts
 *
 * 2.1.316 新增：网关并发限制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (3)
 * attribution: placement 3
 */
import { gatewayLog } from "../gateway/gatewayBanner.js";

//@ chunk-1ny7cxrt.js:1454873-1454894 placement
/**
 * 过载告警的最小间隔（60 秒）。
 */
var DEFAULT_MAX_HTTP_REQUESTS = 256;
var OVERLOAD_WARN_INTERVAL_MS = 60000;
//@ chunk-1ny7cxrt.js:1454894-1455022 placement
/**
 * 解析 BUN_CONFIG_MAX_HTTP_REQUESTS（1–65535，否则默认值）。
 */
function parseMaxHttpRequests(raw) {
  if (raw === undefined || !/^\+?\d(_*\d)*$/.test(raw)) return DEFAULT_MAX_HTTP_REQUESTS;
  let parsed = Number(raw.replaceAll("_", ""));
  return parsed >= 1 && parsed <= 65535 ? parsed : DEFAULT_MAX_HTTP_REQUESTS;
}
//@ chunk-1ny7cxrt.js:1455022-1455483 placement
/**
 * 打开的客户端请求数超过上游并发上限时（限频）警告。
 */
function createOverloadWarner(maxHttpRequests, now = () => performance.now()) {
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  return (pendingRequests) => {
    if (pendingRequests <= maxHttpRequests || now() - NEGATIVE_INFINITY < OVERLOAD_WARN_INTERVAL_MS) return;
    NEGATIVE_INFINITY = now();
    gatewayLog(
      "warn",
      `${pendingRequests} client requests are open on this gateway process, more than the ${maxHttpRequests} it sends upstream at once. Requests past that limit wait inside the gateway for a free slot, so developers see slow or stalled responses, or a 502 after a long wait. Add replicas, or raise BUN_CONFIG_MAX_HTTP_REQUESTS and the replica's memory limit together.`,
    );
  };
}
export { parseMaxHttpRequests, createOverloadWarner };
