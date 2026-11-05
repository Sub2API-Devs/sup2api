/**
 * utils/claudeInChrome/serverPolicy.ts
 *
 * 2.1.316 新增。--chrome 被组织 MCP 策略阻止时的拒绝原因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7gywhk95.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isClaudeInChromeBlockedByEnterpriseMcpConfig,
  isMcpServerDenied,
  isClaudeInChromeRefusedForManagedMcpOptIn,
  CLAUDE_IN_CHROME_MANAGED_MCP_REFUSAL,
} from "../../services/mcp/config.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME, getClaudeInChromeStdioServerConfig } from "./common.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";

//@ chunk-7gywhk95.js:315-357 placement
function isChromeServerPolicyDenied() {
  return (
    isClaudeInChromeBlockedByEnterpriseMcpConfig() ||
    isMcpServerDenied(CLAUDE_IN_CHROME_MCP_SERVER_NAME, getClaudeInChromeStdioServerConfig())
  );
}
//@ chunk-7gywhk95.js:357-547 placement
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
//@ chunk-7gywhk95.js:547-662 placement
function sessionAutoAllowsToolCalls(toolUseContext) {
  let { mode, isBypassPermissionsModeAvailable } = getToolPermissionContext(toolUseContext);
  return mode === "bypassPermissions" || (mode === "plan" && isBypassPermissionsModeAvailable);
}
export { getChromeServerPolicyRefusal, isChromeServerPolicyDenied, sessionAutoAllowsToolCalls };
