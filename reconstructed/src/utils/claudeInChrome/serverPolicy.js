/**
 * utils/claudeInChrome/serverPolicy.ts
 *
 * 2.1.316 新增。--chrome 被组织 MCP 策略阻止时的拒绝原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b8kdmzpq.js (3)
 * attribution: placement 3
 */
import {
  isClaudeInChromeBlockedByEnterpriseMcpConfig,
  isMcpServerDenied,
  isClaudeInChromeRefusedForManagedMcpOptIn,
  CLAUDE_IN_CHROME_MANAGED_MCP_REFUSAL,
} from "../../services/mcp/config.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME, getClaudeInChromeStdioServerConfig } from "./common.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";

//@ chunk-b8kdmzpq.js:315-357 placement
function isChromeServerPolicyDenied() {
  return (
    isClaudeInChromeBlockedByEnterpriseMcpConfig() ||
    isMcpServerDenied(CLAUDE_IN_CHROME_MCP_SERVER_NAME, getClaudeInChromeStdioServerConfig())
  );
}
//@ chunk-b8kdmzpq.js:357-547 placement
/**
 * --chrome 被组织 MCP 策略阻止时的拒绝原因。
 */
function getChromeServerPolicyRefusal() {
  if (!isChromeServerPolicyDenied()) return null;
  if (
    isClaudeInChromeRefusedForManagedMcpOptIn() &&
    !isMcpServerDenied(CLAUDE_IN_CHROME_MCP_SERVER_NAME, getClaudeInChromeStdioServerConfig())
  )
    return CLAUDE_IN_CHROME_MANAGED_MCP_REFUSAL;
  return "--chrome is blocked by your organization's MCP policy (an enterprise MCP config or a deniedMcpServers entry).";
}
//@ chunk-b8kdmzpq.js:547-662 placement
function sessionAutoAllowsToolCalls(r) {
  let { mode, isBypassPermissionsModeAvailable } = getToolPermissionContext(r);
  return mode === "bypassPermissions" || (mode === "plan" && isBypassPermissionsModeAvailable);
}
export { getChromeServerPolicyRefusal, isChromeServerPolicyDenied, sessionAutoAllowsToolCalls };
