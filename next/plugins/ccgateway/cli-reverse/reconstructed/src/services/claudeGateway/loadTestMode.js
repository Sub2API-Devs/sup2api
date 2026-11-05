/**
 * services/claudeGateway/loadTestMode.ts
 *
 * 2.1.316 新增：网关压测模式
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { gatewayLog } from "../gateway/gatewayBanner.js";

//@ chunk-1hnjmk23.js:1365008-1365386 placement
/**
 * 压测模式下确认所有上游都使用模拟 fetch，否则报错。
 */
function assertCannedUpstreams(upstreams, cannedFetch) {
  for (let upstream of upstreams)
    if ((upstream.kind === "raw" ? upstream.fetch : upstream.client.fetch) !== cannedFetch) {
      gatewayLog(
        "error",
        `load_test_mode: upstream '${upstream.name}' was built without the canned-reply fetch`,
      );
      throw Error(
        "load_test_mode is on, but an upstream (named in the log line above) would still send real requests. This is a bug in the gateway. Do not send load to this gateway, and report it to Anthropic.",
      );
    }
}
export { assertCannedUpstreams };
