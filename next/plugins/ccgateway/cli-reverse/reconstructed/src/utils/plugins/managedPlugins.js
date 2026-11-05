/**
 * utils/plugins/managedPlugins.ts
 *
 * 并入已有模块：内置插件提供的技能名列表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/managedPlugins.ts
 * pieces: chunk-6sf70a86.js (7), chunk-gs416h43.js (2), chunk-r7hswen6.js (19)
 * attribution: placement 27, shared-adjacent 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isSkillOutsideCorePolicy } from "../../skills/bundledSkillsGate.js";
import { getBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { getHostState } from "../hostEnvironment.js";
import { builtinPluginSkillCommand } from "../../skills/bundledSkillCommand.js";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { getEnabledSettingSources } from "../settings/constants.js";
import { lookupByPluginAliases } from "./pluginConfigSources.js";
import {
  getSettingsForSource,
  getVouchedAdminPolicyTier,
  getAdminAuthoredPolicySettings,
  hasMachinePluginKeyLoadRecords,
  getHeldOffPluginIds,
  hasAdminPolicyLoadRecords,
  getVouchedPolicyTierSettings,
} from "../settings/settings.js";
import { createValueSlot } from "../valueSlot.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  marketplaceSuffix,
  isOfficialMarketplaceName_3,
  canonicalPluginId,
  parsePluginIdentifier,
  pluginNameAliases_2,
} from "./pluginIdentifier.js";
import { nfcLower } from "../stringUtils.js";
import { getPluginAffectingSettingsSnapshot } from "./loadPluginHooks.js";
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
import { managedMarketplaceAnswerFlag } from "./marketplaceNames.js";
import {
  isProMaxWithoutSettings,
  defaultSecuritySeat,
} from "../../services/remoteManagedSettings/seating.js";
import { isDependencyAutoInstallState } from "./dependencyResolver.js";
import { policySettingsUnreadable } from "../hooks/hooksConfigSnapshot.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6sf70a86.js:77429-77481 placement
/**
 * availableBuiltinSkillCommands：未被禁用的内建插件技能命令。
 */
function availableBuiltinSkillCommands() {
  return getBuiltinPluginSkillCommands().filter((command) => !isSkillOutsideCorePolicy(command.name));
}
//@ chunk-6sf70a86.js:77481-77508 placement
/**
 * builtinPluginSkillCommands：内建插件技能命令列表。
 */
function builtinPluginSkillCommands() {
  return getBuiltinPluginSkillCommands();
}
//@ chunk-6sf70a86.js:77508-77691 placement
function getBuiltinPluginSkillCommands() {
  let { enabled } = getBuiltinPlugins();
  let commands = [];
  let builtinPlugins = getHostState().builtinPlugins;
  for (let plugin of enabled) {
    let entry = builtinPlugins.get(plugin.name);
    if (!entry?.skills) continue;
    for (let skill of entry.skills)
      commands.push(builtinPluginSkillCommand(skill, `${plugin.name}@${BUILTIN}`));
  }
  return commands;
}
//@ chunk-6sf70a86.js:77691-77848 placement
/**
 * 内置插件提供的技能名列表。
 */
function builtinPluginSkillNames(skipNames = new Set()) {
  let names = [];
  for (let [name, entry] of getHostState().builtinPlugins) {
    if (skipNames.has(name)) continue;
    for (let skill of entry.skills ?? []) names.push(skill.name, ...(skill.aliases ?? []));
  }
  return names;
}
//@ chunk-6sf70a86.js:77848-78004 placement
/**
 * 从高优先级设置源起找插件的 enabledPlugins 值（含别名）。
 */
function findEnabledSettingForPlugin(pluginId) {
  let enabledSettingSources = getEnabledSettingSources();
  for (let i = enabledSettingSources.length - 1; i >= 0; i--) {
    let source = enabledSettingSources[i];
    if (source === undefined) continue;
    let value = lookupByPluginAliases(getSettingsForSource(source)?.enabledPlugins, pluginId);
    if (value !== undefined) return value;
  }
  return;
}
//@ chunk-6sf70a86.js:78004-78156 placement
/**
 * 只能由策略启用的内置插件及其托管名。
 */
function getPolicyOnlyBuiltinPluginNames() {
  return Object.fromEntries(
    [...getHostState().builtinPlugins]
      .filter(([, entry]) => entry.enabledFromPolicyOnly)
      .map(([name]) => `${name}@${BUILTIN}`)
      .map((id) => [id, getManagedPluginNames_2(id)]),
  );
}
//@ chunk-6sf70a86.js:78156-78269 shared-adjacent (2.1.88 match: getManagedPluginNames, 1)
/**
 * 插件在托管/合并设置中的启用值（托管为 false 时以托管为准）。
 */
function getManagedPluginNames_2(id) {
  let [vouchedValue, policyValue] = [getVouchedAdminPolicyTier(), getSettingsForSource("policySettings")].map(
    (tier) => lookupByPluginAliases(tier?.enabledPlugins, id),
  );
  return vouchedValue === false && policyValue !== false ? policyValue : vouchedValue;
}
//@ chunk-gs416h43.js:227-240 placement
var managedPluginsSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-gs416h43.js:227", () => {
  managedPluginsSlot = createValueSlot();
});
//@ chunk-gs416h43.js:240-262 placement
var getManagedPlugins = () => managedPluginsSlot.get();
//@ chunk-r7hswen6.js:14030-14201 placement
/**
 * 策略允许的插件 id 集合，只保留内置或已担保的托管插件。
 */
function getVouchedPolicyPluginIds() {
  let ids = policyEnabledPluginIds(assuredPolicySettings());
  if (ids === null || getManagedPlugins()) return ids;
  let vouchedManagedPluginIds = getPluginRegistry().vouchedManagedPluginIds;
  let filtered = [...ids].filter(
    (id) => marketplaceSuffix(id) === BUILTIN || vouchedManagedPluginIds.has(nfcLower(id)),
  );
  return filtered.length > 0 ? new Set(filtered) : null;
}
//@ chunk-r7hswen6.js:14201-14270 placement
/**
 * isVouchedPolicyPluginId：是否为受信策略插件 id。
 */
function isVouchedPolicyPluginId(pluginStorageId) {
  let lowered = nfcLower(pluginStorageId);
  return [...(getVouchedPolicyPluginIds() ?? [])].some((id) => nfcLower(id) === lowered);
}
//@ chunk-r7hswen6.js:14270-17015 placement
function resolveSeatedManagedPlugins(modules) {
  let pluginAffectingSettingsSnapshot = getPluginAffectingSettingsSnapshot();
  let vouchedIds = new Set(
    [...(policyEnabledPluginIds(pluginAffectingSettingsSnapshot.enables) ?? [])].map(nfcLower),
  );
  let filtered = modules.filter((pluginModule) => vouchedIds.has(nfcLower(pluginModule.source)));
  let filtered_2 = filtered.filter(
    (pluginModule) =>
      marketplaceSuffix(pluginModule.source) !== BUILTIN &&
      !isReadInPlaceSourceVouched(pluginModule, pluginAffectingSettingsSnapshot.names),
  );
  let policySettings = getAdminAuthoredPolicySettings();
  for (let pluginModule of filtered_2) {
    if (
      pluginModule.modulePath === undefined ||
      resolveManagedPluginDigests(pluginModule.source) !== undefined
    )
      continue;
    let label = quotedPrintable(pluginModule.source);
    if (pluginModule.readInPlace !== true)
      logForDebugging(
        `${label} is enabled by managed settings, but it is not read in place from a local folder its marketplace is registered from: it loads from a copy (the plugin cache, an archive or a seed directory), or that marketplace has no folder of its own. Nothing yet records which source a copy was taken from, so it is not treated as the organization's: its hooks module runs in the user tier, and does not load where only managed hooks may. It is seated when managed settings declare its marketplace under extraKnownMarketplaces as a local directory and that marketplace lists it by a relative path. A plugin delivered from a remote source takes the tier when managed settings name its digests under pluginDigests on that marketplace and list it in prependPlugins or appendPlugins.`,
        {
          level: "warn",
        },
      );
    else if (isReadInPlaceSourceVouched(pluginModule, policySettings))
      logForDebugging(
        `${label} is enabled by managed settings, but the source its marketplace is registered from is named only by ${UNVOUCHED_MANAGED_SETTINGS_DESCRIPTION}, so it is not treated as the organization's: its hooks module runs in the user tier. It is seated when managed settings the session vouches for (this machine's own, or remote managed settings once the server confirms them) declare that source for its marketplace under extraKnownMarketplaces.`,
        {
          level: "warn",
        },
      );
    else
      logForDebugging(
        `${label} is enabled by managed settings, but managed settings do not name the source its marketplace is registered from, so it is not treated as the organization's: its hooks module runs in the user tier. It is seated when the marketplace is registered from the source that managed settings declare for it under extraKnownMarketplaces.`,
        {
          level: "warn",
        },
      );
  }
  let vouchReason = hasAnyPluginDeclarations(policySettings_2(getVouchedAdminPolicyTier()))
    ? "settings it does vouch for list or enable plugins on this machine"
    : "a managed settings source on this machine was not read whole (a load error, or a plugin key it could not apply), so what it says of plugins is not known";
  let policyIds = new Set(
    [...(policyEnabledPluginIds(getSettingsForSource("policySettings")) ?? [])].map(nfcLower),
  );
  for (let pluginModule of modules) {
    let lowered = nfcLower(pluginModule.source);
    if (
      pluginModule.modulePath !== undefined &&
      marketplaceSuffix(pluginModule.source) !== BUILTIN &&
      policyIds.has(lowered) &&
      !vouchedIds.has(lowered)
    )
      logForDebugging(
        `${quotedPrintable(pluginModule.source)} is enabled only by ${UNVOUCHED_MANAGED_SETTINGS_DESCRIPTION}, while ${vouchReason}, so it is not treated as the organization's: its hooks module runs in the user tier, and does not load where only managed hooks may. It can be seated only once managed settings the session vouches for enable it: this machine's own, or remote managed settings once the server confirms them.`,
        {
          level: "warn",
        },
      );
  }
  let unvouchedIds = new Set(filtered_2.map((pluginModule) => nfcLower(pluginModule.source)));
  getPluginRegistry().vouchedManagedPluginIds = new Set(
    filtered.map((pluginModule) => nfcLower(pluginModule.source)).filter((id) => !unvouchedIds.has(id)),
  );
}
//@ chunk-r7hswen6.js:17015-17283 placement
function isReadInPlaceSourceVouched(pluginModule, policySettings) {
  let marketplaceName = marketplaceSuffix(pluginModule.source);
  let marketplaceSource = pluginModule.marketplaceSource;
  if (
    marketplaceName === undefined ||
    marketplaceSource === undefined ||
    pluginModule.readInPlace !== true ||
    isReservedMarketplaceName(nfcLower(marketplaceName))
  )
    return false;
  if (isOfficialMarketplaceName_3(marketplaceName))
    return (
      isOfficialMarketplaceSourceVouched(marketplaceSource) ||
      isMarketplaceSourceVouchedByPolicy(marketplaceSource, undefined, {
        policySettings,
        declaredUnder: marketplaceName,
      })
    );
  return isMarketplaceSourceVouchedByPolicy(marketplaceSource, undefined, {
    policySettings,
    declaredUnder: isMarketplaceNameDeclaredByPolicy(marketplaceName, policySettings)
      ? marketplaceName
      : undefined,
  });
}
//@ chunk-r7hswen6.js:17283-17460 placement
var UNVOUCHED_MANAGED_SETTINGS_DESCRIPTION =
  "managed settings this session does not vouch for (such as remote managed settings the server has not confirmed this session, or a document your user account can write)";
//@ chunk-r7hswen6.js:17460-17524 placement (2.1.88 match: _temp7, 1)
/**
 * assuredPolicySettings：受信管理策略层或策略设置。
 */
function assuredPolicySettings() {
  let vouchedAdminPolicyTier = getVouchedAdminPolicyTier();
  return hasPluginDeclarations(policySettings_2(vouchedAdminPolicyTier))
    ? vouchedAdminPolicyTier
    : getSettingsForSource("policySettings");
}
//@ chunk-r7hswen6.js:17524-17558 placement
/**
 * hasPluginDeclarations：该设置层是否声明了插件。
 */
function hasPluginDeclarations(tier) {
  return hasAnyPluginDeclarations(tier) || hasMachinePluginKeyLoadRecords();
}
//@ chunk-r7hswen6.js:17558-17770 placement
function policyEnabledPluginIds(policyTier) {
  let managedPlugins = getManagedPlugins();
  if (managedPlugins) return new Set(managedPlugins.managedIds);
  let enabledPlugins = policyTier?.enabledPlugins;
  if (!enabledPlugins) return null;
  let ids = new Set();
  for (let [key, value] of Object.entries(enabledPlugins))
    if (value === true && key.includes("@")) ids.add(canonicalPluginId(key));
  return ids.size > 0 ? ids : null;
}
//@ chunk-r7hswen6.js:17770-18127 placement
/**
 * 读取 policySettings.enabledPlugins，生成 {name, marketplace, enabled, heldOff?} 列表；被暂缓的禁用项标 heldOff。没有返回 null。
 */
function getPolicyEnabledPluginEntries() {
  let enabledPlugins = getSettingsForSource("policySettings")?.enabledPlugins;
  if (!enabledPlugins) return null;
  let heldOffIds = new Set(getHeldOffPluginIds());
  let entries = [];
  for (let [key, value] of Object.entries(enabledPlugins)) {
    if (typeof value !== "boolean" || !key.includes("@")) continue;
    let { name, marketplace } = parsePluginIdentifier(key);
    if (name) {
      let qualified = `${name}@${marketplace ?? ""}` === key;
      entries.push({
        name,
        marketplace: qualified ? (marketplace ?? "") : "",
        enabled: value,
        ...(!value &&
          heldOffIds.has(key) && {
            heldOff: true,
          }),
      });
    }
  }
  return entries.length > 0 ? entries : null;
}
//@ chunk-r7hswen6.js:18127-18550 placement
/**
 * 按 NFC 小写名在策略条目中查找插件：无匹配 unmatched；有禁用条目则 locked；市场与给定市场一致（非保留名）则 admitted；否则 locked 到首个条目。
 */
function matchPolicyPluginEntry(managedEntries, name, attributedMarketplaceName) {
  if (!managedEntries)
    return {
      outcome: "unmatched",
    };
  let loweredName = nfcLower(name);
  let filtered = managedEntries.filter((entry) =>
    pluginNameAliases_2(entry).some((alias) => nfcLower(alias) === loweredName),
  );
  let candidates = filtered.some((entry) => entry.enabled)
    ? filtered.filter((entry) => entry.heldOff !== true)
    : filtered;
  let first = candidates[0];
  if (first === undefined)
    return {
      outcome: "unmatched",
    };
  let found = candidates.find((entry) => !entry.enabled);
  if (found)
    return {
      outcome: "locked",
      entry: found,
    };
  if (
    attributedMarketplaceName !== undefined &&
    candidates.some(
      (entry) =>
        !isReservedMarketplaceName(nfcLower(entry.marketplace)) &&
        nfcLower(entry.marketplace) === nfcLower(attributedMarketplaceName),
    )
  )
    return {
      outcome: "admitted",
    };
  return {
    outcome: "locked",
    entry: first,
  };
}
//@ chunk-r7hswen6.js:18550-19391 placement
/**
 * 计算前置/后置插件列表：有托管插件直接用其 order；否则按策略或用户设置的 prependPlugins/appendPlugins， 叠加座席（seat）结果，去掉被其他层声明过的项，并给出来源（policy/user/none）与被遮蔽信息。
 */
function resolveManagedPluginOrder() {
  let managedPlugins = getManagedPlugins();
  if (managedPlugins) return managedPlugins.order;
  let hasPolicy = hasPolicySettings() || hasAdminPolicyLoadRecords();
  let userSettings = getEnabledSettingSources().includes("userSettings")
    ? getSettingsForSource("userSettings")
    : null;
  let seat = hasPolicy ? undefined : resolveSecurityPluginSeat();
  let hasSeat = seat !== undefined && seat.outermost.length > 0;
  let answerFlag = managedMarketplaceAnswerFlag();
  let proMaxNoSettings = answerFlag && !hasPolicy && isProMaxWithoutSettings();
  let hostSeat = !hasPolicy && !hasSeat && answerFlag && !proMaxNoSettings;
  let isUserTier = !hasPolicy && !hasSeat && !hostSeat;
  let holder = hasPolicy ? getVouchedAdminPolicyTier() : isUserTier ? userSettings : null;
  let slot = hasPolicy ? getSettingsForSource("policySettings") : null;
  let keys = ["prependPlugins", "appendPlugins"];
  let mapped = keys.map((key) => holder?.[key]?.map(canonicalLowerPluginId));
  let seatFromUser = seat ?? resolveSecurityPluginSeat(mapped[0]);
  let seatFromPolicy =
    hasPolicy && seatFromUser.outermost.length === 0
      ? resolveSecurityPluginSeat(slot?.prependPlugins?.map(canonicalLowerPluginId))
      : seatFromUser;
  let finalSeat = seatFromPolicy.outermost.length > 0 ? seatFromPolicy : seatFromUser;
  let effectiveSeat =
    answerFlag && !proMaxNoSettings && finalSeat.outermost.length === 0 && (!hasPolicy || SEAT_BY_DEFAULT)
      ? defaultSecuritySeat()
      : finalSeat;
  let [prepend, append] = keys.map((key, index) => {
    let ids =
      mapped[index] ??
      filterUnclaimedSlotPlugins({
        key,
        slot,
        holder,
        outermost: effectiveSeat.outermost,
      });
    return {
      ids,
      from: ids === undefined ? "none" : hasPolicy ? "policy" : "user",
      shadowed: !isUserTier && userSettings?.[key] !== undefined,
    };
  });
  return {
    prepend: prepend.ids ?? [],
    append: append.ids ?? [],
    from: {
      prepend: prepend.from,
      append: append.from,
    },
    shadowed: keys.filter((key, index) => [prepend, append][index].shadowed),
    ...(hasSeat && {
      shadowedBy: "seat",
    }),
    ...(hostSeat && {
      shadowedBy: "host",
    }),
    ...effectiveSeat,
  };
}
//@ chunk-r7hswen6.js:19391-19422 placement
function canonicalLowerPluginId(id) {
  return canonicalPluginId(nfcLower(id));
}
//@ chunk-r7hswen6.js:19422-19733 placement
/**
 * 去掉已被其他设置层声明或已座席的插件。
 */
function filterUnclaimedSlotPlugins({ key, slot, holder, outermost }) {
  let mapped = slot?.[key]?.map(canonicalLowerPluginId);
  if (mapped === undefined) return;
  let tiers = policySettings_2(holder);
  if (key === "prependPlugins" && hasAnyPluginDeclarations(tiers)) return;
  let claimed = new Set(
    tiers
      .flatMap((tier) => [
        ...(tier.prependPlugins ?? []),
        ...(tier.appendPlugins ?? []),
        ...Object.keys(tier.enabledPlugins ?? {}),
      ])
      .map(canonicalLowerPluginId),
  );
  return mapped.filter((id) => !claimed.has(id) && !outermost.includes(id));
}
//@ chunk-r7hswen6.js:19733-19770 placement
function policySettings_2(tier) {
  return [tier ?? {}, ...getVouchedPolicyTierSettings()];
}
//@ chunk-r7hswen6.js:19770-19923 placement
function hasAnyPluginDeclarations(tier) {
  return tier.some(
    (tier) =>
      (tier.prependPlugins?.length ?? 0) > 0 ||
      (tier.appendPlugins?.length ?? 0) > 0 ||
      Object.values(tier.enabledPlugins ?? {}).some((value) => value !== false),
  );
}
//@ chunk-r7hswen6.js:19923-20120 placement (2.1.88 match: getManagedPluginNames, 0.775)
/**
 * 托管插件 ID 列表：来自 policySettings 与远程托管设置的 enabledPlugins。
 */
function getManagedPluginNames() {
  let managedPlugins = getManagedPlugins();
  if (managedPlugins) return [...managedPlugins.managedIds];
  return [getSettingsForSource("policySettings"), assuredPolicySettings()]
    .flatMap((tier) => Object.entries(tier?.enabledPlugins ?? {}))
    .filter(([key, value]) => isDependencyAutoInstallState(value) && key.includes("@"))
    .map(([key]) => canonicalPluginId(key));
}
//@ chunk-r7hswen6.js:20120-20161 placement
/**
 * 是否存在托管插件（远程托管或 policySettings 启用的插件）。
 */
function hasManagedPlugins() {
  return policySettingsUnreadable() || getManagedPluginNames().length > 0;
}
//@ chunk-r7hswen6.js:20161-20220 placement
/**
 * managedPluginNameSet：托管插件名集合。
 */
function managedPluginNameSet() {
  let managedPluginNames = getManagedPluginNames();
  return managedPluginNames.length > 0 ? new Set(managedPluginNames) : null;
}
//@ chunk-r7hswen6.js:20220-20286 placement
/**
 * isManagedOrPolicyBlocked：策略不可读或该插件被托管策略点名。
 */
function isManagedOrPolicyBlocked(pluginId) {
  let lowered = nfcLower(pluginId);
  return policySettingsUnreadable() || getManagedPluginNames().some((id) => nfcLower(id) === lowered);
}
export {
  matchPolicyPluginEntry,
  getPolicyEnabledPluginEntries,
  isManagedOrPolicyBlocked,
  getVouchedPolicyPluginIds,
  resolveManagedPluginOrder,
  builtinPluginSkillNames,
  availableBuiltinSkillCommands,
  hasManagedPlugins,
  policySettings_2,
  hasPluginDeclarations,
  resolveSeatedManagedPlugins,
  managedPluginNameSet,
  isVouchedPolicyPluginId,
  getManagedPlugins,
  getManagedPluginNames_2,
  findEnabledSettingForPlugin,
  getPolicyOnlyBuiltinPluginNames,
  builtinPluginSkillCommands,
  managedPluginsSlot,
  assuredPolicySettings,
  policyEnabledPluginIds,
};
