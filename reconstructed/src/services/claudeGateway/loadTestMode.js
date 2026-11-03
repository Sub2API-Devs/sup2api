/**
 * services/claudeGateway/loadTestMode.ts
 *
 * 2.1.316 新增：网关压测模式
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: placement 1
 */
import { gatewayLog } from "../gateway/gatewayBanner.js";

//@ chunk-1ny7cxrt.js:1363283-1363661 placement
/**
 * 压测模式下确认所有上游都使用模拟 fetch，否则报错。
 */
function assertCannedUpstreams(e, t) {
  for (let n of e)
    if ((n.kind === "raw" ? n.fetch : n.client.fetch) !== t) {
      gatewayLog("error", `load_test_mode: upstream '${n.name}' was built without the canned-reply fetch`);
      throw Error(
        "load_test_mode is on, but an upstream (named in the log line above) would still send real requests. This is a bug in the gateway. Do not send load to this gateway, and report it to Anthropic.",
      );
    }
}
export { assertCannedUpstreams };
