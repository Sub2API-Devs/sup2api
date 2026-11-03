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
function formatRefreshFailedMessage(e, n = [], { debugHint: r = true } = {}) {
  let s = n.length > 0 ? `: ${n.map((h) => printablePluginName(h)).join(", ")}` : "";
  return `${e} ${plural(e, "marketplace")} could not be refreshed${r ? " (see --debug)" : ""}${s}`;
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
  let G =
    updatedPluginCount > 0 ? ` (${updatedPluginCount} ${plural(updatedPluginCount, "plugin")} bumped)` : "";
  let q =
    deferredPluginCount > 0
      ? ` \xB7 ${deferredPluginCount} ${plural(deferredPluginCount, "plugin")} skipped \u2014 update ${deferredPluginCount === 1 ? "it" : "them"} individually from the Installed tab`
      : "";
  let Z =
    policyBlockedPluginCount > 0
      ? ` \xB7 ${policyBlockedPluginCount} ${plural(policyBlockedPluginCount, "plugin")} blocked by managed policy \u2014 ask your admin`
      : "";
  let Se =
    policyRefusedMarketplaces.length > 0
      ? ` \xB7 ${marketplacesRefusedByPolicyClause(policyRefusedMarketplaces.length, policyRefusedMarketplaces)}`
      : "";
  let ke =
    failedMarketplaces.length > 0
      ? ` \xB7 ${formatRefreshFailedMessage(failedMarketplaces.length, failedMarketplaces, {
          debugHint: false,
        })}`
      : "";
  let we =
    pinnedPluginCount > 0
      ? ` \xB7 ${pinnedPluginCount} ${plural(pinnedPluginCount, "plugin")} held at the current version by another plugin's dependency pin`
      : "";
  let Ee =
    failedPluginCount > 0
      ? ` \xB7 ${failedPluginCount} ${plural(failedPluginCount, "plugin")} failed to update${formatFailedPluginNames(failedPluginNames, failedPluginCount)}`
      : "";
  return `${updatedCount > 0 ? `Updated ${updatedCount} ${plural(updatedCount, "marketplace")}` : "No marketplaces updated"}${G}${ke}${Ee}${Se}${q}${we}${Z}`;
}
//@ chunk-e6aww6q8.js:4203313-4203499 placement
function formatFailedPluginNames(failedPluginNames, failedPluginCount) {
  if (failedPluginNames.length === 0) return "";
  let joined = failedPluginNames.map((h) => printablePluginName(h)).join(", ");
  let s = failedPluginCount - failedPluginNames.length;
  return s > 0
    ? ` (${joined} \u2014 see Errors; ${s} more in the debug log)`
    : ` (${joined} \u2014 see Errors)`;
}
//@ chunk-e6aww6q8.js:4203499-4203571 placement
/**
 * MarketplaceError：市场错误类。
 */
class MarketplaceError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  reason;
  constructor(e, n, reason) {
    super(e, n);
    this.reason = reason;
  }
}
//@ chunk-e6aww6q8.js:4203571-4203718 placement
var NON_RETRYABLE_MARKETPLACE_FAILURES = new Set([
  "invalid_source",
  "network_location",
  "source_blocked_by_policy",
  "manifest_missing",
  "manifest_invalid",
  "not_configured",
  "managed",
]);
//@ chunk-e6aww6q8.js:4203718-4203833 placement
/**
 * 给错误对象附 marketplaceFailureCode。
 */
function withMarketplaceFailureCode(e, n) {
  if (n !== undefined && typeof e === "object" && e !== null)
    Object.assign(e, {
      marketplaceFailureCode: n,
    });
  return e;
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
function getMarketplaceFailureCode(e) {
  return typeof e === "object" &&
    e !== null &&
    "marketplaceFailureCode" in e &&
    isNonRetryableMarketplaceFailure(e.marketplaceFailureCode)
    ? e.marketplaceFailureCode
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
