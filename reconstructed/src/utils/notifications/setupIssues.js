/**
 * utils/notifications/setupIssues.ts
 *
 * 2.1.316 新增：设置问题通知
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "../debug.js";
import { plural } from "../stringUtils.js";

//@ chunk-e6aww6q8.js:3574322-3574513 placement
var SETUP_ISSUE_HINTS = {
  MCP: "run /mcp for details",
  plugins: "run /plugin for details",
  sandbox: "run /sandbox for details",
  settings: "run `claude doctor` for details",
  install: "run `claude doctor` for details",
};
//@ chunk-e6aww6q8.js:3574513-3574628 placement
/**
 * 记录某类设置问题的数量及查看详情的提示。
 */
function logSetupIssues(e, n) {
  if (n <= 0) return;
  let r = SETUP_ISSUE_HINTS[e];
  logForDebugging(`${n} setup ${plural(n, "issue")}: ${e}${r ? ` (${r})` : ""}`, {
    level: "info",
  });
}
export { logSetupIssues };
