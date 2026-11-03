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
var R1 = 256,
  rve = 60000;
/**
 * 解析 BUN_CONFIG_MAX_HTTP_REQUESTS（1–65535，否则默认值）。
 */
//@ chunk-1ny7cxrt.js:1454894-1455022 placement
function parseMaxHttpRequests(e) {
  if (e === void 0 || !/^\+?\d(_*\d)*$/.test(e)) return R1;
  let t = Number(e.replaceAll("_", ""));
  return t >= 1 && t <= 65535 ? t : R1;
}
/**
 * 打开的客户端请求数超过上游并发上限时（限频）警告。
 */
//@ chunk-1ny7cxrt.js:1455022-1455483 placement
function createOverloadWarner(e, t = () => performance.now()) {
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  return (o) => {
    if (o <= e || t() - NEGATIVE_INFINITY < rve) return;
    ((NEGATIVE_INFINITY = t()),
      gatewayLog(
        "warn",
        `${o} client requests are open on this gateway process, more than the ${e} it sends upstream at once. Requests past that limit wait inside the gateway for a free slot, so developers see slow or stalled responses, or a 502 after a long wait. Add replicas, or raise BUN_CONFIG_MAX_HTTP_REQUESTS and the replica's memory limit together.`,
      ));
  };
}

export { parseMaxHttpRequests, createOverloadWarner };
