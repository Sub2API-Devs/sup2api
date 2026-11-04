/**
 * utils/plugins/marketplaceErrors.ts
 *
 * 2.1.316 新增：市场错误
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { plural } from "../stringUtils.js";
import { marketplacesRefusedByPolicyClause } from "./marketplacePolicy.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4202143-4202281 placement
/**
 * 市场更新结果图标（失败 ×、更新 ✓、策略拒绝 ⚠）。
 */
function marketplaceUpdateIcon({ failedCount, updatedCount, policyRefusedCount }) {
  if (failedCount > 0) return figures_default.cross;
  if (updatedCount > 0) return figures_default.tick;
  return policyRefusedCount > 0 ? figures_default.warning : null;
}
//@ chunk-e6aww6q8.js:4202281-4202464 placement
/**
 * N 个市场刷新失败（附名字与 --debug 提示）。
 */
function formatRefreshFailedMessage(count, names = [], { debugHint = true } = {}) {
  let namesText = names.length > 0 ? `: ${names.map((name) => printablePluginName(name)).join(", ")}` : "";
  return `${count} ${plural(count, "marketplace")} could not be refreshed${debugHint ? " (see --debug)" : ""}${namesText}`;
}
//@ chunk-e6aww6q8.js:4202464-4203313 placement
/**
 * 汇总市场更新结果文字（更新数、插件升级、失败、策略拒绝、跳过、钉住）。
 */
function formatMarketplaceUpdateSummary({
  updatedCount,
  updatedPluginCount,
  deferredPluginCount,
  policyBlockedPluginCount,
  policyRefusedMarketplaces,
  failedMarketplaces,
  pinnedPluginCount,
  failedPluginCount,
  failedPluginNames = [],
}) {
  let updatedPluginsText =
    updatedPluginCount > 0 ? ` (${updatedPluginCount} ${plural(updatedPluginCount, "plugin")} bumped)` : "";
  let deferredText =
    deferredPluginCount > 0
      ? ` \xB7 ${deferredPluginCount} ${plural(deferredPluginCount, "plugin")} skipped \u2014 update ${deferredPluginCount === 1 ? "it" : "them"} individually from the Installed tab`
      : "";
  let policyBlockedText =
    policyBlockedPluginCount > 0
      ? ` \xB7 ${policyBlockedPluginCount} ${plural(policyBlockedPluginCount, "plugin")} blocked by managed policy \u2014 ask your admin`
      : "";
  let policyRefusedText =
    policyRefusedMarketplaces.length > 0
      ? ` \xB7 ${marketplacesRefusedByPolicyClause(policyRefusedMarketplaces.length, policyRefusedMarketplaces)}`
      : "";
  let failedMarketplacesText =
    failedMarketplaces.length > 0
      ? ` \xB7 ${formatRefreshFailedMessage(failedMarketplaces.length, failedMarketplaces, {
          debugHint: false,
        })}`
      : "";
  let pinnedText =
    pinnedPluginCount > 0
      ? ` \xB7 ${pinnedPluginCount} ${plural(pinnedPluginCount, "plugin")} held at the current version by another plugin's dependency pin`
      : "";
  let failedPluginsText =
    failedPluginCount > 0
      ? ` \xB7 ${failedPluginCount} ${plural(failedPluginCount, "plugin")} failed to update${formatFailedPluginNames(failedPluginNames, failedPluginCount)}`
      : "";
  return `${updatedCount > 0 ? `Updated ${updatedCount} ${plural(updatedCount, "marketplace")}` : "No marketplaces updated"}${updatedPluginsText}${failedMarketplacesText}${failedPluginsText}${policyRefusedText}${deferredText}${pinnedText}${policyBlockedText}`;
}
//@ chunk-e6aww6q8.js:4203313-4203499 placement
function formatFailedPluginNames(failedPluginNames, failedPluginCount) {
  if (failedPluginNames.length === 0) return "";
  let joined = failedPluginNames.map((name) => printablePluginName(name)).join(", ");
  let moreCount = failedPluginCount - failedPluginNames.length;
  return moreCount > 0
    ? ` (${joined} \u2014 see Errors; ${moreCount} more in the debug log)`
    : ` (${joined} \u2014 see Errors)`;
}
//@ chunk-e6aww6q8.js:4203499-4203571 placement
/**
 * MarketplaceError：市场错误类。
 */
let MarketplaceError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4203499", () => {
  MarketplaceError = class MarketplaceError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    reason;
    constructor(message, telemetryCode, reason) {
      super(message, telemetryCode);
      this.reason = reason;
    }
  };
});
//@ chunk-e6aww6q8.js:4203571-4203718 placement
var NON_RETRYABLE_MARKETPLACE_FAILURES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4203571", () => {
  NON_RETRYABLE_MARKETPLACE_FAILURES = new Set([
    "invalid_source",
    "network_location",
    "source_blocked_by_policy",
    "manifest_missing",
    "manifest_invalid",
    "not_configured",
    "managed",
  ]);
});
//@ chunk-e6aww6q8.js:4203718-4203833 placement
/**
 * 给错误对象附 marketplaceFailureCode。
 */
function withMarketplaceFailureCode(target, code) {
  if (code !== undefined && typeof target === "object" && target !== null)
    Object.assign(target, {
      marketplaceFailureCode: code,
    });
  return target;
}
//@ chunk-e6aww6q8.js:4203833-4203888 placement
function isNonRetryableMarketplaceFailure(marketplaceFailureCode) {
  return (
    typeof marketplaceFailureCode === "string" &&
    NON_RETRYABLE_MARKETPLACE_FAILURES.has(marketplaceFailureCode)
  );
}
//@ chunk-e6aww6q8.js:4203888-4204034 placement
/**
 * 读出错误对象上合法的 marketplaceFailureCode。
 */
function getMarketplaceFailureCode(error) {
  return typeof error === "object" &&
    error !== null &&
    "marketplaceFailureCode" in error &&
    isNonRetryableMarketplaceFailure(error.marketplaceFailureCode)
    ? error.marketplaceFailureCode
    : undefined;
}
export {
  MarketplaceError,
  getMarketplaceFailureCode,
  formatRefreshFailedMessage,
  marketplaceUpdateIcon,
  withMarketplaceFailureCode,
  formatMarketplaceUpdateSummary,
};
