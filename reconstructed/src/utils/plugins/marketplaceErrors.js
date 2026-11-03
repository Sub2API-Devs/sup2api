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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { plural } from "../stringUtils.js";
import { marketplacesRefusedByPolicyClause } from "./marketplacePolicy.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";

/**
 * 市场更新结果图标（失败 ×、更新 ✓、策略拒绝 ⚠）。
 */
//@ chunk-e6aww6q8.js:4202143-4202281 placement
function marketplaceUpdateIcon({
  failedCount: failedCount,
  updatedCount: updatedCount,
  policyRefusedCount: policyRefusedCount,
}) {
  if (failedCount > 0) return re.cross;
  if (updatedCount > 0) return re.tick;
  return policyRefusedCount > 0 ? re.warning : null;
}
/**
 * N 个市场刷新失败（附名字与 --debug 提示）。
 */
//@ chunk-e6aww6q8.js:4202281-4202464 placement
function formatRefreshFailedMessage(e, n = [], { debugHint: r = !0 } = {}) {
  let s = n.length > 0 ? `: ${n.map((h) => printablePluginName(h)).join(", ")}` : "";
  return `${e} ${plural(e, "marketplace")} could not be refreshed${r ? " (see --debug)" : ""}${s}`;
}
/**
 * 汇总市场更新结果文字（更新数、插件升级、失败、策略拒绝、跳过、钉住）。
 */
//@ chunk-e6aww6q8.js:4202464-4203313 placement
function formatMarketplaceUpdateSummary({
  updatedCount: updatedCount,
  updatedPluginCount: updatedPluginCount,
  deferredPluginCount: deferredPluginCount,
  policyBlockedPluginCount: policyBlockedPluginCount,
  policyRefusedMarketplaces: policyRefusedMarketplaces,
  failedMarketplaces: failedMarketplaces,
  pinnedPluginCount: pinnedPluginCount,
  failedPluginCount: failedPluginCount,
  failedPluginNames: failedPluginNames = [],
}) {
  let G =
      updatedPluginCount > 0 ? ` (${updatedPluginCount} ${plural(updatedPluginCount, "plugin")} bumped)` : "",
    q =
      deferredPluginCount > 0
        ? ` \xB7 ${deferredPluginCount} ${plural(deferredPluginCount, "plugin")} skipped \u2014 update ${deferredPluginCount === 1 ? "it" : "them"} individually from the Installed tab`
        : "",
    Z =
      policyBlockedPluginCount > 0
        ? ` \xB7 ${policyBlockedPluginCount} ${plural(policyBlockedPluginCount, "plugin")} blocked by managed policy \u2014 ask your admin`
        : "",
    Se =
      policyRefusedMarketplaces.length > 0
        ? ` \xB7 ${marketplacesRefusedByPolicyClause(policyRefusedMarketplaces.length, policyRefusedMarketplaces)}`
        : "",
    ke =
      failedMarketplaces.length > 0
        ? ` \xB7 ${formatRefreshFailedMessage(failedMarketplaces.length, failedMarketplaces, { debugHint: !1 })}`
        : "",
    we =
      pinnedPluginCount > 0
        ? ` \xB7 ${pinnedPluginCount} ${plural(pinnedPluginCount, "plugin")} held at the current version by another plugin's dependency pin`
        : "",
    Ee =
      failedPluginCount > 0
        ? ` \xB7 ${failedPluginCount} ${plural(failedPluginCount, "plugin")} failed to update${formatFailedPluginNames(failedPluginNames, failedPluginCount)}`
        : "";
  return `${updatedCount > 0 ? `Updated ${updatedCount} ${plural(updatedCount, "marketplace")}` : "No marketplaces updated"}${G}${ke}${Ee}${Se}${q}${we}${Z}`;
}
//@ chunk-e6aww6q8.js:4203313-4203499 placement
function formatFailedPluginNames(e, n) {
  if (e.length === 0) return "";
  let joined = e.map((h) => printablePluginName(h)).join(", "),
    s = n - e.length;
  return s > 0
    ? ` (${joined} \u2014 see Errors; ${s} more in the debug log)`
    : ` (${joined} \u2014 see Errors)`;
}
//@ chunk-e6aww6q8.js:4203499-4203571 placement
class bfe extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  reason;
  constructor(e, n, r) {
    super(e, n);
    this.reason = r;
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
/**
 * 给错误对象附 marketplaceFailureCode。
 */
//@ chunk-e6aww6q8.js:4203718-4203833 placement
function withMarketplaceFailureCode(e, n) {
  if (n !== void 0 && typeof e === "object" && e !== null) Object.assign(e, { marketplaceFailureCode: n });
  return e;
}
//@ chunk-e6aww6q8.js:4203833-4203888 placement
function pgs(e) {
  return typeof e === "string" && NON_RETRYABLE_MARKETPLACE_FAILURES.has(e);
}
/**
 * 读出错误对象上合法的 marketplaceFailureCode。
 */
//@ chunk-e6aww6q8.js:4203888-4204034 placement
function getMarketplaceFailureCode(e) {
  return typeof e === "object" && e !== null && "marketplaceFailureCode" in e && pgs(e.marketplaceFailureCode)
    ? e.marketplaceFailureCode
    : void 0;
}

export {
  bfe,
  getMarketplaceFailureCode,
  formatRefreshFailedMessage,
  marketplaceUpdateIcon,
  withMarketplaceFailureCode,
  formatMarketplaceUpdateSummary,
};
