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
import { lD } from "./planTiers.js";
import { getGlobalConfig } from "./config.js";

/**
 * Console 账单权限（决定是否显示费用提示）：DISABLE_COST_WARNINGS 关闭；API 用户需组织角色 admin/billing 或工作区角色 workspace_admin/workspace_billing。
 */
//@ chunk-hwmsct5x.js:177706-178037 fingerprint = hasConsoleBillingAccess (1)
function hasConsoleBillingAccess() {
  if (env.DISABLE_COST_WARNINGS) return !1;
  let isSubscriber = isClaudeAISubscriber();
  if (isSubscriber && lD()) return !0;
  if (isSubscriber) return !1;
  let authSource = getAuthTokenSource(),
    r = hasAnthropicApiKey();
  if (!authSource.hasToken && !r) return !1;
  let config = getGlobalConfig(),
    orgRole = config.oauthAccount?.organizationRole,
    workspaceRole = config.oauthAccount?.workspaceRole;
  if (!orgRole || !workspaceRole) return !1;
  return (
    ["admin", "billing"].includes(orgRole) || ["workspace_admin", "workspace_billing"].includes(workspaceRole)
  );
}

export { hasConsoleBillingAccess };
