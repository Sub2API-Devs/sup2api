/**
 * utils/plugins/managedPlugins.ts
 *
 * 并入已有模块：内置插件提供的技能名列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/managedPlugins.ts
 * pieces: chunk-bfnfj4kx.js (7), chunk-czx62zen.js (19), chunk-h6tjx705.js (2)
 * attribution: placement 27, fingerprint 1
 */
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  marketplaceSuffix,
  isOfficialMarketplaceName_3,
  canonicalPluginId,
  parsePluginIdentifier,
  pluginNameAliases_2,
} from "./pluginIdentifier.js";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { nfcLower } from "../stringUtils.js";
import { getPluginAffectingSettingsSnapshot } from "./loadPluginHooks.js";
import {
  getAdminAuthoredPolicySettings,
  getVouchedAdminPolicyTier,
  getSettingsForSource,
  hasMachinePluginKeyLoadRecords,
  getHeldOffPluginIds,
  hasAdminPolicyLoadRecords,
  getVouchedPolicyTierSettings,
} from "../settings/settings.js";
import {
  resolveManagedPluginDigests,
  hasPolicySettings,
  resolveSecurityPluginSeat,
  SEAT_BY_DEFAULT,
} from "./managedPluginSeating.js";
import { quotedPrintable } from "../printableName.js";
import { logForDebugging } from "../debug.js";
import { isReservedMarketplaceName } from "./schemas.js";
import {
  isOfficialMarketplaceSourceVouched,
  isMarketplaceSourceVouchedByPolicy,
  isMarketplaceNameDeclaredByPolicy,
} from "./marketplacePolicy.js";
import { getEnabledSettingSources } from "../settings/constants.js";
import { managedMarketplaceAnswerFlag } from "./marketplaceNames.js";
import {
  isProMaxWithoutSettings,
  defaultSecuritySeat,
} from "../../services/remoteManagedSettings/seating.js";
import { isDependencyAutoInstallState } from "./dependencyResolver.js";
import { policySettingsUnreadable } from "../hooks/hooksConfigSnapshot.js";
import { isSkillOutsideCorePolicy } from "../../skills/bundledSkillsGate.js";
import { getBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { getHostState } from "../hostEnvironment.js";
import { builtinPluginSkillCommand } from "../../skills/bundledSkillCommand.js";
import { lookupByPluginAliases } from "./pluginConfigSources.js";
import { createValueSlot } from "../valueSlot.js";

//@ chunk-czx62zen.js:14027-14198 placement
/**
 * 策略允许的插件 id 集合，只保留内置或已担保的托管插件。
 */
function getVouchedPolicyPluginIds() {
  let e = policyEnabledPluginIds(assuredPolicySettings());
  if (e === null || getManagedPlugins()) return e;
  let vouchedManagedPluginIds = getPluginRegistry().vouchedManagedPluginIds;
  let filtered = [...e].filter(
    (s) => marketplaceSuffix(s) === BUILTIN || vouchedManagedPluginIds.has(nfcLower(s)),
  );
  return filtered.length > 0 ? new Set(filtered) : null;
}
//@ chunk-czx62zen.js:14198-14267 placement
/**
 * isVouchedPolicyPluginId：是否为受信策略插件 id。
 */
function isVouchedPolicyPluginId(pluginStorageId) {
  let n = nfcLower(pluginStorageId);
  return [...(getVouchedPolicyPluginIds() ?? [])].some((o) => nfcLower(o) === n);
}
//@ chunk-czx62zen.js:14267-17012 placement
function resolveSeatedManagedPlugins(e) {
  let pluginAffectingSettingsSnapshot = getPluginAffectingSettingsSnapshot();
  let o = new Set([...(policyEnabledPluginIds(pluginAffectingSettingsSnapshot.enables) ?? [])].map(nfcLower));
  let filtered = e.filter((f) => o.has(nfcLower(f.source)));
  let filtered_2 = filtered.filter(
    (f) =>
      marketplaceSuffix(f.source) !== BUILTIN &&
      !isReadInPlaceSourceVouched(f, pluginAffectingSettingsSnapshot.names),
  );
  let adminAuthoredPolicySettings = getAdminAuthoredPolicySettings();
  for (let f of filtered_2) {
    if (f.modulePath === undefined || resolveManagedPluginDigests(f.source) !== undefined) continue;
    let d = quotedPrintable(f.source);
    if (f.readInPlace !== true)
      logForDebugging(
        `${d} is enabled by managed settings, but it is not read in place from a local folder its marketplace is registered from: it loads from a copy (the plugin cache, an archive or a seed directory), or that marketplace has no folder of its own. Nothing yet records which source a copy was taken from, so it is not treated as the organization's: its hooks module runs in the user tier, and does not load where only managed hooks may. It is seated when managed settings declare its marketplace under extraKnownMarketplaces as a local directory and that marketplace lists it by a relative path. A plugin delivered from a remote source takes the tier when managed settings name its digests under pluginDigests on that marketplace and list it in prependPlugins or appendPlugins.`,
        {
          level: "warn",
        },
      );
    else if (isReadInPlaceSourceVouched(f, adminAuthoredPolicySettings))
      logForDebugging(
        `${d} is enabled by managed settings, but the source its marketplace is registered from is named only by ${UNVOUCHED_MANAGED_SETTINGS_DESCRIPTION}, so it is not treated as the organization's: its hooks module runs in the user tier. It is seated when managed settings the session vouches for (this machine's own, or remote managed settings once the server confirms them) declare that source for its marketplace under extraKnownMarketplaces.`,
        {
          level: "warn",
        },
      );
    else
      logForDebugging(
        `${d} is enabled by managed settings, but managed settings do not name the source its marketplace is registered from, so it is not treated as the organization's: its hooks module runs in the user tier. It is seated when the marketplace is registered from the source that managed settings declare for it under extraKnownMarketplaces.`,
        {
          level: "warn",
        },
      );
  }
  let c = hasAnyPluginDeclarations(_(getVouchedAdminPolicyTier()))
    ? "settings it does vouch for list or enable plugins on this machine"
    : "a managed settings source on this machine was not read whole (a load error, or a plugin key it could not apply), so what it says of plugins is not known";
  let u = new Set([...(policyEnabledPluginIds(getSettingsForSource("policySettings")) ?? [])].map(nfcLower));
  for (let f of e) {
    let i = nfcLower(f.source);
    if (f.modulePath !== undefined && marketplaceSuffix(f.source) !== BUILTIN && u.has(i) && !o.has(i))
      logForDebugging(
        `${quotedPrintable(f.source)} is enabled only by ${UNVOUCHED_MANAGED_SETTINGS_DESCRIPTION}, while ${c}, so it is not treated as the organization's: its hooks module runs in the user tier, and does not load where only managed hooks may. It can be seated only once managed settings the session vouches for enable it: this machine's own, or remote managed settings once the server confirms them.`,
        {
          level: "warn",
        },
      );
  }
  let l = new Set(filtered_2.map((f) => nfcLower(f.source)));
  getPluginRegistry().vouchedManagedPluginIds = new Set(
    filtered.map((f) => nfcLower(f.source)).filter((f) => !l.has(f)),
  );
}
//@ chunk-czx62zen.js:17012-17280 placement
function isReadInPlaceSourceVouched(e, n) {
  let o = marketplaceSuffix(e.source);
  let marketplaceSource = e.marketplaceSource;
  if (
    o === undefined ||
    marketplaceSource === undefined ||
    e.readInPlace !== true ||
    isReservedMarketplaceName(nfcLower(o))
  )
    return false;
  if (isOfficialMarketplaceName_3(o))
    return (
      isOfficialMarketplaceSourceVouched(marketplaceSource) ||
      isMarketplaceSourceVouchedByPolicy(marketplaceSource, undefined, {
        policySettings: n,
        declaredUnder: o,
      })
    );
  return isMarketplaceSourceVouchedByPolicy(marketplaceSource, undefined, {
    policySettings: n,
    declaredUnder: isMarketplaceNameDeclaredByPolicy(o, n) ? o : undefined,
  });
}
//@ chunk-czx62zen.js:17280-17457 placement
var UNVOUCHED_MANAGED_SETTINGS_DESCRIPTION =
  "managed settings this session does not vouch for (such as remote managed settings the server has not confirmed this session, or a document your user account can write)";
//@ chunk-czx62zen.js:17457-17521 placement = _temp7 (1)
/**
 * assuredPolicySettings：受信管理策略层或策略设置。
 */
function assuredPolicySettings() {
  let vouchedAdminPolicyTier = getVouchedAdminPolicyTier();
  return hasPluginDeclarations(_(vouchedAdminPolicyTier))
    ? vouchedAdminPolicyTier
    : getSettingsForSource("policySettings");
}
//@ chunk-czx62zen.js:17521-17555 placement
/**
 * hasPluginDeclarations：该设置层是否声明了插件。
 */
function hasPluginDeclarations(e) {
  return hasAnyPluginDeclarations(e) || hasMachinePluginKeyLoadRecords();
}
//@ chunk-czx62zen.js:17555-17767 placement
function policyEnabledPluginIds(e) {
  let managedPlugins = getManagedPlugins();
  if (managedPlugins) return new Set(managedPlugins.managedIds);
  let enabledPlugins = e?.enabledPlugins;
  if (!enabledPlugins) return null;
  let s = new Set();
  for (let [key, value] of Object.entries(enabledPlugins))
    if (value === true && key.includes("@")) s.add(canonicalPluginId(key));
  return s.size > 0 ? s : null;
}
//@ chunk-czx62zen.js:17767-18124 placement
/**
 * 读取 policySettings.enabledPlugins，生成 {name, marketplace, enabled, heldOff?} 列表；被暂缓的禁用项标 heldOff。没有返回 null。
 */
function getPolicyEnabledPluginEntries() {
  let enabledPlugins = getSettingsForSource("policySettings")?.enabledPlugins;
  if (!enabledPlugins) return null;
  let n = new Set(getHeldOffPluginIds());
  let o = [];
  for (let [key, value] of Object.entries(enabledPlugins)) {
    if (typeof value !== "boolean" || !key.includes("@")) continue;
    let { name: a, marketplace } = parsePluginIdentifier(key);
    if (a) {
      let u = `${a}@${marketplace ?? ""}` === key;
      o.push({
        name: a,
        marketplace: u ? (marketplace ?? "") : "",
        enabled: value,
        ...(!value &&
          n.has(key) && {
            heldOff: true,
          }),
      });
    }
  }
  return o.length > 0 ? o : null;
}
//@ chunk-czx62zen.js:18124-18547 placement
/**
 * 按 NFC 小写名在策略条目中查找插件：无匹配 unmatched；有禁用条目则 locked；市场与给定市场一致（非保留名）则 admitted；否则 locked 到首个条目。
 */
function matchPolicyPluginEntry(managedEntries, name, attributedMarketplaceName) {
  if (!managedEntries)
    return {
      outcome: "unmatched",
    };
  let s = nfcLower(name);
  let filtered = managedEntries.filter((l) => pluginNameAliases_2(l).some((f) => nfcLower(f) === s));
  let a = filtered.some((l) => l.enabled) ? filtered.filter((l) => l.heldOff !== true) : filtered;
  let c = a[0];
  if (c === undefined)
    return {
      outcome: "unmatched",
    };
  let found = a.find((l) => !l.enabled);
  if (found)
    return {
      outcome: "locked",
      entry: found,
    };
  if (
    attributedMarketplaceName !== undefined &&
    a.some(
      (l) =>
        !isReservedMarketplaceName(nfcLower(l.marketplace)) &&
        nfcLower(l.marketplace) === nfcLower(attributedMarketplaceName),
    )
  )
    return {
      outcome: "admitted",
    };
  return {
    outcome: "locked",
    entry: c,
  };
}
//@ chunk-czx62zen.js:18547-19388 placement
/**
 * 计算前置/后置插件列表：有托管插件直接用其 order；否则按策略或用户设置的 prependPlugins/appendPlugins， 叠加座席（seat）结果，去掉被其他层声明过的项，并给出来源（policy/user/none）与被遮蔽信息。
 */
function resolveManagedPluginOrder() {
  let managedPlugins = getManagedPlugins();
  if (managedPlugins) return managedPlugins.order;
  let n = hasPolicySettings() || hasAdminPolicyLoadRecords();
  let o = getEnabledSettingSources().includes("userSettings") ? getSettingsForSource("userSettings") : null;
  let s = n ? undefined : resolveSecurityPluginSeat();
  let r = s !== undefined && s.outermost.length > 0;
  let a = managedMarketplaceAnswerFlag();
  let c = a && !n && isProMaxWithoutSettings();
  let u = !n && !r && a && !c;
  let l = !n && !r && !u;
  let f = n ? getVouchedAdminPolicyTier() : l ? o : null;
  let i = n ? getSettingsForSource("policySettings") : null;
  let d = ["prependPlugins", "appendPlugins"];
  let mapped = d.map((m) => f?.[m]?.map(canonicalLowerPluginId));
  let p = s ?? resolveSecurityPluginSeat(mapped[0]);
  let h =
    n && p.outermost.length === 0
      ? resolveSecurityPluginSeat(i?.prependPlugins?.map(canonicalLowerPluginId))
      : p;
  let S = h.outermost.length > 0 ? h : p;
  let w = a && !c && S.outermost.length === 0 && (!n || SEAT_BY_DEFAULT) ? defaultSecuritySeat() : S;
  let [M, k] = d.map((m, x) => {
    let v =
      mapped[x] ??
      filterUnclaimedSlotPlugins({
        key: m,
        slot: i,
        holder: f,
        outermost: w.outermost,
      });
    return {
      ids: v,
      from: v === undefined ? "none" : n ? "policy" : "user",
      shadowed: !l && o?.[m] !== undefined,
    };
  });
  return {
    prepend: M.ids ?? [],
    append: k.ids ?? [],
    from: {
      prepend: M.from,
      append: k.from,
    },
    shadowed: d.filter((m, x) => [M, k][x].shadowed),
    ...(r && {
      shadowedBy: "seat",
    }),
    ...(u && {
      shadowedBy: "host",
    }),
    ...w,
  };
}
//@ chunk-czx62zen.js:19388-19419 placement
function canonicalLowerPluginId(e) {
  return canonicalPluginId(nfcLower(e));
}
//@ chunk-czx62zen.js:19419-19730 placement
/**
 * 去掉已被其他设置层声明或已座席的插件。
 */
function filterUnclaimedSlotPlugins({ key, slot, holder, outermost }) {
  let mapped = slot?.[key]?.map(canonicalLowerPluginId);
  if (mapped === undefined) return;
  let a = _(holder);
  if (key === "prependPlugins" && hasAnyPluginDeclarations(a)) return;
  let c = new Set(
    a
      .flatMap((u) => [
        ...(u.prependPlugins ?? []),
        ...(u.appendPlugins ?? []),
        ...Object.keys(u.enabledPlugins ?? {}),
      ])
      .map(canonicalLowerPluginId),
  );
  return mapped.filter((u) => !c.has(u) && !outermost.includes(u));
}
//@ chunk-czx62zen.js:19730-19767 placement
function _(e) {
  return [e ?? {}, ...getVouchedPolicyTierSettings()];
}
//@ chunk-czx62zen.js:19767-19920 placement
function hasAnyPluginDeclarations(e) {
  return e.some(
    (n) =>
      (n.prependPlugins?.length ?? 0) > 0 ||
      (n.appendPlugins?.length ?? 0) > 0 ||
      Object.values(n.enabledPlugins ?? {}).some((o) => o !== false),
  );
}
//@ chunk-czx62zen.js:19920-20117 placement = getManagedPluginNames (0.774)
/**
 * 托管插件 ID 列表：来自 policySettings 与远程托管设置的 enabledPlugins。
 */
function getManagedPluginNames() {
  let managedPlugins = getManagedPlugins();
  if (managedPlugins) return [...managedPlugins.managedIds];
  return [getSettingsForSource("policySettings"), assuredPolicySettings()]
    .flatMap((n) => Object.entries(n?.enabledPlugins ?? {}))
    .filter(([n, o]) => isDependencyAutoInstallState(o) && n.includes("@"))
    .map(([n]) => canonicalPluginId(n));
}
//@ chunk-czx62zen.js:20117-20158 placement
/**
 * 是否存在托管插件（远程托管或 policySettings 启用的插件）。
 */
function hasManagedPlugins() {
  return policySettingsUnreadable() || getManagedPluginNames().length > 0;
}
//@ chunk-czx62zen.js:20158-20217 placement
/**
 * managedPluginNameSet：托管插件名集合。
 */
function managedPluginNameSet() {
  let managedPluginNames = getManagedPluginNames();
  return managedPluginNames.length > 0 ? new Set(managedPluginNames) : null;
}
//@ chunk-czx62zen.js:20217-20283 placement
/**
 * isManagedOrPolicyBlocked：策略不可读或该插件被托管策略点名。
 */
function isManagedOrPolicyBlocked(e) {
  let n = nfcLower(e);
  return policySettingsUnreadable() || getManagedPluginNames().some((o) => nfcLower(o) === n);
}
//@ chunk-bfnfj4kx.js:77383-77435 placement
/**
 * availableBuiltinSkillCommands：未被禁用的内建插件技能命令。
 */
function availableBuiltinSkillCommands() {
  return getBuiltinPluginSkillCommands().filter((e) => !isSkillOutsideCorePolicy(e.name));
}
//@ chunk-bfnfj4kx.js:77435-77462 placement
/**
 * builtinPluginSkillCommands：内建插件技能命令列表。
 */
function builtinPluginSkillCommands() {
  return getBuiltinPluginSkillCommands();
}
//@ chunk-bfnfj4kx.js:77462-77645 placement
function getBuiltinPluginSkillCommands() {
  let { enabled } = getBuiltinPlugins();
  let o = [];
  let builtinPlugins = getHostState().builtinPlugins;
  for (let r of enabled) {
    let n = builtinPlugins.get(r.name);
    if (!n?.skills) continue;
    for (let skill of n.skills) o.push(builtinPluginSkillCommand(skill, `${r.name}@${BUILTIN}`));
  }
  return o;
}
//@ chunk-bfnfj4kx.js:77645-77802 placement
/**
 * 内置插件提供的技能名列表。
 */
function builtinPluginSkillNames(e = new Set()) {
  let o = [];
  for (let [t, r] of getHostState().builtinPlugins) {
    if (e.has(t)) continue;
    for (let n of r.skills ?? []) o.push(n.name, ...(n.aliases ?? []));
  }
  return o;
}
//@ chunk-bfnfj4kx.js:77802-77958 placement
/**
 * 从高优先级设置源起找插件的 enabledPlugins 值（含别名）。
 */
function findEnabledSettingForPlugin(e) {
  let enabledSettingSources = getEnabledSettingSources();
  for (let i = enabledSettingSources.length - 1; i >= 0; i--) {
    let r = enabledSettingSources[i];
    if (r === undefined) continue;
    let n = lookupByPluginAliases(getSettingsForSource(r)?.enabledPlugins, e);
    if (n !== undefined) return n;
  }
  return;
}
//@ chunk-bfnfj4kx.js:77958-78110 placement
/**
 * 只能由策略启用的内置插件及其托管名。
 */
function getPolicyOnlyBuiltinPluginNames() {
  return Object.fromEntries(
    [...getHostState().builtinPlugins]
      .filter(([, e]) => e.enabledFromPolicyOnly)
      .map(([e]) => `${e}@${BUILTIN}`)
      .map((e) => [e, getManagedPluginNames_2(e)]),
  );
}
//@ chunk-bfnfj4kx.js:78110-78223 fingerprint = getManagedPluginNames (1)
/**
 * 插件在托管/合并设置中的启用值（托管为 false 时以托管为准）。
 */
function getManagedPluginNames_2(e) {
  let [o, t] = [getVouchedAdminPolicyTier(), getSettingsForSource("policySettings")].map((r) =>
    lookupByPluginAliases(r?.enabledPlugins, e),
  );
  return o === false && t !== false ? t : o;
}
//@ chunk-h6tjx705.js:227-240 placement
var managedPluginsSlot = createValueSlot();
//@ chunk-h6tjx705.js:240-262 placement
var getManagedPlugins = () => managedPluginsSlot.get();
export {
  getVouchedPolicyPluginIds,
  matchPolicyPluginEntry,
  getPolicyEnabledPluginEntries,
  findEnabledSettingForPlugin,
  managedPluginsSlot,
  builtinPluginSkillCommands,
  availableBuiltinSkillCommands,
  isVouchedPolicyPluginId,
  isManagedOrPolicyBlocked,
  getManagedPluginNames_2,
  hasManagedPlugins,
  getManagedPlugins,
  assuredPolicySettings,
  policyEnabledPluginIds,
  resolveSeatedManagedPlugins,
  resolveManagedPluginOrder,
  managedPluginNameSet,
  _,
  hasPluginDeclarations,
  builtinPluginSkillNames,
  getPolicyOnlyBuiltinPluginNames,
};
