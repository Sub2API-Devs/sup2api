/**
 * cli/handlers/pluginTest/endPluginTest.ts
 *
 * 2.1.316 新增。plugin test 结束时释放开关保持与登录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2m7289t6.js (3)
 * attribution: placement 3
 */
import { Ar } from "../../../../runtime/bun-runtime.js";
import { stopPeriodicGrowthBookRefresh } from "../../../services/analytics/growthbook.js";
import { waitForOAuthRefreshLocksReleased } from "../../../utils/auth.js";

//@ chunk-2m7289t6.js:268-279 placement
var Vwo = {};
//@ chunk-2m7289t6.js:279-327 placement
Ar(Vwo, { default: () => Vwo, endPluginTest: () => endPluginTest });
/**
 * plugin test 结束时释放开关保持与登录。
 */
//@ chunk-2m7289t6.js:327-476 placement
async function endPluginTest(e) {
  (stopPeriodicGrowthBookRefresh(),
    await Promise.all([process.stdout, process.stderr].map((r) => new Promise((o) => r.write("", o)))),
    await waitForOAuthRefreshLocksReleased(),
    process.exit(e));
}

export { endPluginTest };
