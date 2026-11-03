/**
 * cli/handlers/pluginTest/reportMark.ts
 *
 * 2.1.316 新增。plugin test 报告行前缀。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bkss02w7.js (3)
 * attribution: placement 3
 */
import { Ar } from "../../../../runtime/bun-runtime.js";

//@ chunk-bkss02w7.js:227-238 placement
/**
 * plugin test 报告标记模块的导出容器（REPORT_MARK）。
 */
var PLUGIN_TEST_REPORT_MARK_EXPORTS = {};
//@ chunk-bkss02w7.js:238-284 placement
Ar(PLUGIN_TEST_REPORT_MARK_EXPORTS, {
  REPORT_MARK: () => REPORT_MARK,
  default: () => PLUGIN_TEST_REPORT_MARK_EXPORTS,
});
//@ chunk-bkss02w7.js:284-321 placement
/**
 * plugin test 报告行前缀。
 */
var REPORT_MARK = "claude-plugin-test-report ";
export { REPORT_MARK };
