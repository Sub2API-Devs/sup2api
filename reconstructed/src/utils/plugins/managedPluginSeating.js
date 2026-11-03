/**
 * utils/plugins/managedPluginSeating.ts
 *
 * 2.1.316 新增：托管插件座席
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-czx62zen.js (7)
 * attribution: placement 7
 */
import {
  getSettingsForSource,
  hasAdminPolicyLoadRecords,
  getRemotePolicyTierWithKind,
  getMachineAdminPolicyTier,
  getVouchedAdminPolicyTier,
} from "../settings/settings.js";
import { identity } from "../identity.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import {
  DEFAULT_SECURITY_SEAT_PLUGIN,
  serverFilePresenceSlot,
} from "../../services/remoteManagedSettings/seating.js";
import { getSubscriptionType } from "../auth.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { nfcLower } from "../stringUtils.js";
import { getManagedPlugins } from "./managedPlugins.js";
import { isRemoteManagedSettingsVerifiedAndApprovedForSession } from "../../services/remoteManagedSettings/remoteSettingsState.js";

//@ chunk-czx62zen.js:1537-1620 placement = _temp7 (1)
function hasPolicySettings() {
  let settingsForSource = getSettingsForSource("policySettings");
  return settingsForSource !== null && Object.keys(settingsForSource).length > 0;
}
//@ chunk-czx62zen.js:1620-1654 placement
/**
 * outermostSeatCache：安全插件是否排最外层的缓存。
 */
var outermostSeatCache = identity(pu(), (e) => e.set(null));
//@ chunk-czx62zen.js:1654-2377 placement
/**
 * 决定默认安全插件（Tte）是否排在最外层：给定 prependPlugins 时看是否列出；否则有托管设置/托管 MCP 文件、 Team/Enterprise 组织或本会话已座席时座席。座席后在本会话内保持。返回 {outermost, seat}。
 */
function resolveSecurityPluginSeat(prependPlugins) {
  let hasPrependList = prependPlugins !== undefined;
  let position = prependPlugins?.indexOf(DEFAULT_SECURITY_SEAT_PLUGIN) ?? -1;
  let s = position !== -1;
  let hasPolicy = hasPolicySettings() || hasAdminPolicyLoadRecords();
  let hasManagedFile = hasPolicy || serverFilePresenceSlot.get()?.() === true;
  let subscriptionType = hasPrependList || hasManagedFile ? undefined : getSubscriptionType();
  let l = subscriptionType === "team" || subscriptionType === "enterprise";
  let f = outermostSeatCache.get() === true;
  let isSeated = hasPrependList ? s : hasManagedFile || l || f;
  let reason = hasPrependList
    ? s
      ? `seated by managed prependPlugins at position ${position + 1}`
      : "not seated: managed prependPlugins does not list it"
    : hasManagedFile
      ? hasPolicy
        ? "seated outermost: this machine has managed settings"
        : "seated outermost: this machine has a managed MCP server file"
      : l
        ? `seated outermost: the organization is ${subscriptionType}`
        : f
          ? "seated outermost: it was seated earlier in this session, and a seat holds until the session ends"
          : `not seated: no managed settings and not a Team or Enterprise organization (${subscriptionType ?? "none"})`;
  if (isSeated) outermostSeatCache.set(true);
  return {
    outermost: isSeated ? [DEFAULT_SECURITY_SEAT_PLUGIN] : [],
    seat: `${DEFAULT_SECURITY_SEAT_PLUGIN} ${reason}`,
  };
}
//@ chunk-czx62zen.js:2377-2388 placement
/**
 * SEAT_BY_DEFAULT：默认座席标志。
 */
var SEAT_BY_DEFAULT = true;
//@ chunk-czx62zen.js:2388-2685 placement
function getDeclaredPluginDigests(e, n) {
  let { name: o, marketplace } = parsePluginIdentifier(n);
  if (marketplace === undefined) return;
  let extraKnownMarketplaces = e?.extraKnownMarketplaces ?? {};
  let flattened = Object.keys(extraKnownMarketplaces)
    .filter((key) => nfcLower(key) === nfcLower(marketplace))
    .flatMap((key) => {
      let pluginDigests = extraKnownMarketplaces[key]?.pluginDigests ?? {};
      return Object.keys(pluginDigests)
        .filter((key) => nfcLower(key) === nfcLower(o))
        .map((key) => pluginDigests[key] ?? []);
    });
  return flattened.length > 0 ? flattened.flat() : undefined;
}
//@ chunk-czx62zen.js:2685-2886 placement
function getSeatedPluginDigests(e, n) {
  let o = nfcLower(n);
  let enabledPlugins = e?.enabledPlugins ?? {};
  let any = Object.keys(enabledPlugins).some((key) => enabledPlugins[key] === true && nfcLower(key) === o);
  let any_2 = [...(e?.prependPlugins ?? []), ...(e?.appendPlugins ?? [])].some((u) => nfcLower(u) === o);
  return any && any_2 ? getDeclaredPluginDigests(e, n) : undefined;
}
//@ chunk-czx62zen.js:2886-3092 placement
/**
 * 托管插件的可信摘要（远程设置未验证时用本机策略层）。
 */
function resolveManagedPluginDigests(e) {
  if (getManagedPlugins()) return;
  let remotePolicyTierWithKind = getRemotePolicyTierWithKind();
  let o =
    remotePolicyTierWithKind.servedSnapshot ||
    (remotePolicyTierWithKind.settings !== null && !isRemoteManagedSettingsVerifiedAndApprovedForSession());
  let s = o ? getMachineAdminPolicyTier() : getVouchedAdminPolicyTier();
  let seatedPluginDigests = getSeatedPluginDigests(s, e);
  let declaredPluginDigests = getDeclaredPluginDigests(remotePolicyTierWithKind.settings, e);
  return seatedPluginDigests === undefined ||
    o ||
    (declaredPluginDigests !== undefined &&
      seatedPluginDigests.every((seatedPluginDigest) => declaredPluginDigests.includes(seatedPluginDigest)))
    ? seatedPluginDigests
    : getSeatedPluginDigests(getMachineAdminPolicyTier(), e);
}
export {
  hasPolicySettings,
  resolveManagedPluginDigests,
  resolveSecurityPluginSeat,
  SEAT_BY_DEFAULT,
  outermostSeatCache,
};
