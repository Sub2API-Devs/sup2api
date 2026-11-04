/**
 * utils/billing.ts
 *
 * 账单权限判断：Claude.ai 组织角色（admin/billing/owner）与 Console 组织/工作区角色。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/billing.ts
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: fingerprint 1
 */
import { env } from "./env.js";
import { isClaudeAISubscriber, getAuthTokenSource, hasAnthropicApiKey } from "./auth.js";
import { isUsageBasedBilling } from "./planTiers.js";
import { getGlobalConfig } from "./config.js";

//@ chunk-hwmsct5x.js:177706-178037 fingerprint (2.1.88 match: hasConsoleBillingAccess, 1)
/**
 * Console 账单权限（决定是否显示费用提示）：DISABLE_COST_WARNINGS 关闭；API 用户需组织角色 admin/billing 或工作区角色 workspace_admin/workspace_billing。
 */
function hasConsoleBillingAccess() {
  if (env.DISABLE_COST_WARNINGS) return false;
  let isSubscriber = isClaudeAISubscriber();
  if (isSubscriber && isUsageBasedBilling()) return true;
  if (isSubscriber) return false;
  let authSource = getAuthTokenSource();
  let hasApiKey = hasAnthropicApiKey();
  if (!authSource.hasToken && !hasApiKey) return false;
  let config = getGlobalConfig();
  let orgRole = config.oauthAccount?.organizationRole;
  let workspaceRole = config.oauthAccount?.workspaceRole;
  if (!orgRole || !workspaceRole) return false;
  return (
    ["admin", "billing"].includes(orgRole) || ["workspace_admin", "workspace_billing"].includes(workspaceRole)
  );
}
export { hasConsoleBillingAccess };
