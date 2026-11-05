/**
 * utils/notifications/setupIssues.ts
 *
 * 2.1.316 新增：设置问题通知
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "../debug.js";
import { plural } from "../stringUtils.js";

//@ chunk-5xgkngpb.js:3669581-3669772 placement
var SETUP_ISSUE_HINTS = {
  MCP: "run /mcp for details",
  plugins: "run /plugin for details",
  sandbox: "run /sandbox for details",
  settings: "run `claude doctor` for details",
  install: "run `claude doctor` for details",
};
//@ chunk-5xgkngpb.js:3669772-3669887 placement
/**
 * 记录某类设置问题的数量及查看详情的提示。
 */
function logSetupIssues(issueKey, issueCount) {
  if (issueCount <= 0) return;
  let issueHint = SETUP_ISSUE_HINTS[issueKey];
  logForDebugging(
    `${issueCount} setup ${plural(issueCount, "issue")}: ${issueKey}${issueHint ? ` (${issueHint})` : ""}`,
    {
      level: "info",
    },
  );
}
export { logSetupIssues };
