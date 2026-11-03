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
import { ge } from "../identity.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { Tte, serverFilePresenceSlot } from "../../services/remoteManagedSettings/seating.js";
import { getSubscriptionType } from "../auth.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { nfcLower } from "../stringUtils.js";
import { getManagedPlugins } from "./managedPlugins.js";
import { isRemoteManagedSettingsVerifiedAndApprovedForSession } from "../../services/remoteManagedSettings/remoteSettingsState.js";

//@ chunk-czx62zen.js:1537-1620 placement = _temp7 (1)
function hasPolicySettings() {
  let e = getSettingsForSource("policySettings");
  return e !== null && Object.keys(e).length > 0;
}
//@ chunk-czx62zen.js:1620-1654 placement
var yJr = ge(pu(), (e) => e.set(null));
/**
 * 决定默认安全插件（Tte）是否排在最外层：给定 prependPlugins 时看是否列出；否则有托管设置/托管 MCP 文件、 Team/Enterprise 组织或本会话已座席时座席。座席后在本会话内保持。返回 {outermost, seat}。
 */
//@ chunk-czx62zen.js:1654-2377 placement
function resolveSecurityPluginSeat(prependPlugins) {
  let hasPrependList = prependPlugins !== void 0,
    position = prependPlugins?.indexOf(Tte) ?? -1,
    s = position !== -1,
    hasPolicy = hasPolicySettings() || hasAdminPolicyLoadRecords(),
    hasManagedFile = hasPolicy || serverFilePresenceSlot.get()?.() === !0,
    subscriptionType = hasPrependList || hasManagedFile ? void 0 : getSubscriptionType(),
    l = subscriptionType === "team" || subscriptionType === "enterprise",
    f = yJr.get() === !0,
    isSeated = hasPrependList ? s : hasManagedFile || l || f,
    reason = hasPrependList
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
  if (isSeated) yJr.set(!0);
  return { outermost: isSeated ? [Tte] : [], seat: `${Tte} ${reason}` };
}
//@ chunk-czx62zen.js:2377-2388 placement
var Fmi = !0;
//@ chunk-czx62zen.js:2388-2685 placement
function getDeclaredPluginDigests(e, n) {
  let { name: o, marketplace: marketplace } = parsePluginIdentifier(n);
  if (marketplace === void 0) return;
  let r = e?.extraKnownMarketplaces ?? {},
    flattened = Object.keys(r)
      .filter((c) => nfcLower(c) === nfcLower(marketplace))
      .flatMap((c) => {
        let u = r[c]?.pluginDigests ?? {};
        return Object.keys(u)
          .filter((l) => nfcLower(l) === nfcLower(o))
          .map((l) => u[l] ?? []);
      });
  return flattened.length > 0 ? flattened.flat() : void 0;
}
//@ chunk-czx62zen.js:2685-2886 placement
function getSeatedPluginDigests(e, n) {
  let o = nfcLower(n),
    s = e?.enabledPlugins ?? {},
    any = Object.keys(s).some((u) => s[u] === !0 && nfcLower(u) === o),
    any_2 = [...(e?.prependPlugins ?? []), ...(e?.appendPlugins ?? [])].some((u) => nfcLower(u) === o);
  return any && any_2 ? getDeclaredPluginDigests(e, n) : void 0;
}
/**
 * 托管插件的可信摘要（远程设置未验证时用本机策略层）。
 */
//@ chunk-czx62zen.js:2886-3092 placement
function resolveManagedPluginDigests(e) {
  if (getManagedPlugins()) return;
  let n = getRemotePolicyTierWithKind(),
    o = n.servedSnapshot || (n.settings !== null && !isRemoteManagedSettingsVerifiedAndApprovedForSession()),
    s = o ? getMachineAdminPolicyTier() : getVouchedAdminPolicyTier(),
    r = getSeatedPluginDigests(s, e),
    a = getDeclaredPluginDigests(n.settings, e);
  return r === void 0 || o || (a !== void 0 && r.every((u) => a.includes(u)))
    ? r
    : getSeatedPluginDigests(getMachineAdminPolicyTier(), e);
}

export { hasPolicySettings, resolveManagedPluginDigests, resolveSecurityPluginSeat, Fmi, yJr };
