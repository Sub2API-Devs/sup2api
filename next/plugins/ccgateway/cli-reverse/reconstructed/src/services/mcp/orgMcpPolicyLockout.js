/**
 * services/mcp/orgMcpPolicyLockout.ts
 *
 * 2.1.316 新增：组织 MCP 策略锁定判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { doesEnterpriseMcpConfigExist, isMcpServerAllowedByPolicy } from "./config.js";
import { areSideloadFlagsDisabledByPolicy } from "../../utils/plugins/marketplacePolicy.js";

//@ chunk-hjswk319.js:59852-59898 placement
function isLockedOutByOrgMcpPolicy(serverName, config) {
  return (
    doesEnterpriseMcpConfigExist() ||
    areSideloadFlagsDisabledByPolicy() ||
    !isMcpServerAllowedByPolicy(serverName, config)
  );
}
export { isLockedOutByOrgMcpPolicy };
