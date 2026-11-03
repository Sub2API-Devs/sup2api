/**
 * services/mcp/orgMcpPolicyLockout.ts
 *
 * 2.1.316 新增：组织 MCP 策略锁定判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (1)
 * attribution: placement 1
 */
import { doesEnterpriseMcpConfigExist, isMcpServerAllowedByPolicy } from "./config.js";
import { areSideloadFlagsDisabledByPolicy } from "../../utils/plugins/marketplacePolicy.js";

//@ chunk-3wek6r2k.js:60423-60469 placement
function isLockedOutByOrgMcpPolicy(e, o) {
  return (
    doesEnterpriseMcpConfigExist() || areSideloadFlagsDisabledByPolicy() || !isMcpServerAllowedByPolicy(e, o)
  );
}

export { isLockedOutByOrgMcpPolicy };
