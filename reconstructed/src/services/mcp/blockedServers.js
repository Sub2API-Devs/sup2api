/**
 * services/mcp/blockedServers.ts
 *
 * 2.1.316 新增：被阻止的 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1s0bgm1n.js (2)
 * attribution: placement 2
 */
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-1s0bgm1n.js:227-315 placement
/**
 * 运维类 MCP 工具的默认处置（删除问询、读取共享 artifact 拒绝）。
 */
var BLOCKED_TOOL_POLICY = {
  delete_asset: "ask",
  delete_artifact: "ask",
  read_shared_artifact: "blocked",
  ...{},
};
//@ chunk-1s0bgm1n.js:315-381 placement
/**
 * 把默认处置合并进工具的权限设置。
 */
function applyBlockedToolPolicy(toolPermissions) {
  return {
    ...toolPermissions,
    ...import_reject(BLOCKED_TOOL_POLICY, (value, key) => toolPermissions?.[key] === "blocked"),
  };
}
export { applyBlockedToolPolicy, BLOCKED_TOOL_POLICY };
