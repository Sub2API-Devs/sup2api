/**
 * cli/handlers/pluginTest/endPluginTest.ts
 *
 * 2.1.316 新增。plugin test 结束时释放开关保持与登录。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t9dwy2aq.js (3)
 * attribution: placement 3
 */
import { __export } from "../../../../runtime/bun-runtime.js";
import { stopPeriodicGrowthBookRefresh } from "../../../services/analytics/growthbook.js";
import { waitForOAuthRefreshLocksReleased } from "../../../utils/auth.js";

//@ chunk-t9dwy2aq.js:268-279 placement
/**
 * plugin test 结束模块的导出容器（挂 default 与 endPluginTest）。
 */
var PLUGIN_TEST_MODULE_EXPORTS = {};
//@ chunk-t9dwy2aq.js:279-327 placement
__export(PLUGIN_TEST_MODULE_EXPORTS, {
  default: () => PLUGIN_TEST_MODULE_EXPORTS,
  endPluginTest: () => endPluginTest,
});
//@ chunk-t9dwy2aq.js:327-476 placement
/**
 * plugin test 结束时释放开关保持与登录。
 */
async function endPluginTest(exitCode) {
  stopPeriodicGrowthBookRefresh();
  await Promise.all(
    [process.stdout, process.stderr].map((stream) => new Promise((resolve) => stream.write("", resolve))),
  );
  await waitForOAuthRefreshLocksReleased();
  process.exit(exitCode);
}
export { endPluginTest, PLUGIN_TEST_MODULE_EXPORTS };
