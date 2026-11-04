/**
 * utils/hooks/hooksConfigSnapshot.ts
 *
 * 并入已有模块：按会话保存初始 hooks 配置快照。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/hooksConfigSnapshot.ts
 * pieces: chunk-2jdf5m4m.js (32), chunk-e6aww6q8.js (1)
 * attribution: placement 31, fingerprint 1, callgraph-fingerprint 1
 */
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import {
  getSettingsForSource,
  getSettings_DEPRECATED,
  getSettingsForSourceTightenOnly,
  getSettingsParseErrorsForSource,
  filterFatalPolicyErrors,
  getPolicySettingsLoadErrors,
  parentManagedTierParticipates,
} from "../settings/settings.js";
import { HostScoped } from "../hostScoped.js";
import {
  onProcessRootHost,
  getParentManagedSettingsInvalid,
  emitHookStoresChanged,
} from "../../bootstrap/state.js";
import { isSafeMode } from "../envUtils.js";
import { isRestrictedToPluginOnly } from "../settings/pluginOnlyPolicy.js";
import { TRUSTED_SETTING_SOURCES } from "../managedEnv.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { stableStringifySafe } from "./hookSerialization.js";
import { isManagedHooksOnlyMode } from "./hooksPolicy.js";
import { invalidateCommandNames } from "../settings/commandSyncNames.js";
import { resetSettingsCacheWithBackendRead } from "../settings/settingsPrime.js";
import { isStatusLineManagedOnly } from "./hookInputRewrite.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2jdf5m4m.js:769-792 placement
function identityHooksConfig(config) {
  return config;
}
//@ chunk-2jdf5m4m.js:792-819 placement
/**
 * 恒返回 null（快照钩子配置的默认覆盖）。
 */
function noSnapshotOverride() {
  return null;
}
//@ chunk-2jdf5m4m.js:819-844 placement
/**
 * 恒返回 false（会话钩子从不因该策略跳过）。
 */
function neverSkipSessionHooks(projectRoot) {
  return false;
}
//@ chunk-2jdf5m4m.js:844-872 placement
/**
 * 恒返回 null（策略状态下没有 statusLine）。
 */
function noPolicyStatusLine(input) {
  return null;
}
//@ chunk-2jdf5m4m.js:872-884 placement
var DEFAULT_SNAPSHOT_KEY = "cli";
//@ chunk-2jdf5m4m.js:884-1421 placement
/**
 * 按会话保存初始 hooks 配置快照。
 */
class HooksConfigSnapshots {
  snapshotKey = () => DEFAULT_SNAPSHOT_KEY;
  snapshotsBySessionId = new Map();
  setSnapshotKey(snapshotKey) {
    this.snapshotKey = snapshotKey;
  }
  current() {
    let key = this.snapshotKey();
    let snapshot = this.snapshotsBySessionId.get(key);
    if (!snapshot) {
      snapshot = {
        initialHooksConfig: null,
      };
      this.snapshotsBySessionId.set(key, snapshot);
    }
    return snapshot;
  }
  store(initialHooksConfig) {
    let state = this.current();
    state.initialHooksConfig = initialHooksConfig;
    if (isPersonalConfigRestricted())
      state.userHooksConfig = getSettingsForSource("userSettings")?.hooks ?? {};
    else delete state.userHooksConfig;
    try {
      state.policyHooksConfig = getSettingsForSource("policySettings")?.hooks ?? {};
    } catch {
      state.policyHooksConfig = "unreadable";
    }
  }
  evict(sessionId) {
    if (sessionId === DEFAULT_SNAPSHOT_KEY) return;
    this.snapshotsBySessionId.delete(sessionId);
  }
}
//@ chunk-2jdf5m4m.js:1421-1444 placement
var hooksSnapshotsRegistry; // deferred: uses HooksConfigSnapshots of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2jdf5m4m.js:1421", () => {
  hooksSnapshotsRegistry = new HostScoped(() => new HooksConfigSnapshots());
});
//@ chunk-2jdf5m4m.js:1444-1470 placement
function currentHooksSnapshots() {
  return onProcessRootHost(hooksSnapshotsRegistry);
}
//@ chunk-2jdf5m4m.js:1470-1741 fingerprint (2.1.88 match: getHooksFromAllowedSources, 0.899)
/**
 * 计算启动时快照的钩子配置：policy disableAllHooks → {}；allowManagedHooksOnly 或仅插件策略 → policy 钩子；用户层 disableAllHooks 时视情况保留受信层；否则合并 settings 钩子。
 */
function getHooksFromAllowedSources() {
  let policySettings = getSettingsForSource("policySettings");
  if (policySettings?.disableAllHooks === true) return {};
  if (policySettings?.allowManagedHooksOnly === true || isSafeMode()) return policySettings?.hooks ?? {};
  if (isRestrictedToPluginOnly("hooks")) return policySettings?.hooks ?? {};
  let mergedSettings = getSettings_DEPRECATED();
  if (mergedSettings.disableAllHooks === true) {
    if (!keepsOwnHooksDespiteDisableAll()) return policySettings?.hooks ?? {};
    return trustedHooksConfig();
  }
  return identityHooksConfig(mergedSettings.hooks ?? {});
}
//@ chunk-2jdf5m4m.js:1796-1855 placement
function trustedHooksConfig() {
  return mergeHooksConfigs(
    TRUSTED_SETTING_SOURCES.filter(isSettingSourceEnabled).map(
      (source) => getSettingsForSource(source)?.hooks,
    ),
  );
}
//@ chunk-2jdf5m4m.js:1855-1944 placement
function withoutCheckoutSettingsHooks(matchers, event) {
  let allowed = new Set((trustedHooksConfig()[event] ?? []).map(stableStringifySafe));
  return matchers.filter((matcher) => allowed.has(stableStringifySafe(matcher)));
}
//@ chunk-2jdf5m4m.js:1944-2065 placement
function mergeHooksConfigs(configs) {
  let merged = {};
  for (let config of configs)
    for (let [key, value] of Object.entries(config ?? {})) {
      let event = key;
      merged[event] = [...(merged[event] ?? []), ...(value ?? [])];
    }
  return merged;
}
//@ chunk-2jdf5m4m.js:2065-2098 placement
/**
 * 用户层 disableAllHooks 生效且当前不是受限场景时为真（只关闭用户自己的钩子）。
 */
function keepsOwnHooksDespiteDisableAll() {
  return isDisableAllHooksUserOnly() && !policySettingsUnreadable();
}
//@ chunk-2jdf5m4m.js:2098-2130 placement
/**
 * 用户层 disableAllHooks 生效且处于受限场景时为真。
 */
function ownHooksOffForUnreadablePolicy() {
  return isDisableAllHooksUserOnly() && policySettingsUnreadable();
}
//@ chunk-2jdf5m4m.js:2130-2317 placement (2.1.88 match: getHooksFromAllowedSources, 0.83)
/**
 * disableAllHooks 只在用户层设置、受信层（policy 等）没有禁用时为 true。
 */
function isDisableAllHooksUserOnly() {
  if (
    !isPersonalConfigRestricted() ||
    isSafeMode() ||
    isRestrictedToPluginOnly("hooks") ||
    getSettings_DEPRECATED().disableAllHooks !== true
  )
    return false;
  return (
    getSettingsForSource("policySettings")?.allowManagedHooksOnly !== true &&
    TRUSTED_SETTING_SOURCES.filter(isSettingSourceEnabled).every(
      (source) => getSettingsForSource(source)?.disableAllHooks !== true,
    )
  );
}
//@ chunk-2jdf5m4m.js:2317-2373 placement
/**
 * 是否只运行 managed（策略）钩子。
 */
function shouldAllowManagedHooksOnly(disableAllHooks = getSettings_DEPRECATED().disableAllHooks) {
  return isSafeMode() || shouldAllowManagedHooksOnlyByPolicy(disableAllHooks);
}
//@ chunk-2jdf5m4m.js:2373-2532 placement (2.1.88 match: shouldAllowManagedHooksOnly, 0.843)
/**
 * policy 设 allowManagedHooksOnly，或非 policy 层设 disableAllHooks 时只允许 managed 钩子。
 */
function shouldAllowManagedHooksOnlyByPolicy(disableAllHooks = getSettings_DEPRECATED().disableAllHooks) {
  let policySettings = getSettingsForSource("policySettings");
  if (policySettings?.allowManagedHooksOnly === true) return true;
  if (disableAllHooks === true && policySettings?.disableAllHooks !== true) return true;
  return false;
}
//@ chunk-2jdf5m4m.js:2532-2564 placement
function shouldHoldDeviceHooksByPolicy() {
  return isManagedHooksOnlyMode() || policySettingsUnreadable();
}
//@ chunk-2jdf5m4m.js:2639-2684 placement (2.1.88 match: formatDangerousSettingsList, 0.483)
function areRepoHooksElsewhereStoodDown() {
  return (
    shouldDisableAllHooksIncludingManaged() || isManagedHooksOnlyMode() || isRestrictedToPluginOnly("hooks")
  );
}
//@ chunk-2jdf5m4m.js:2684-2723 placement (2.1.88 match: _temp5, 1)
function userSettingsTightenOnly() {
  return getSettingsForSourceTightenOnly("userSettings");
}
//@ chunk-2jdf5m4m.js:2723-2818 placement
function personTurnedHooksOff() {
  let userSettings = userSettingsTightenOnly();
  return (
    userSettings?.disableAllHooks === true ||
    (userSettings === null && getSettingsParseErrorsForSource("userSettings").length > 0)
  );
}
//@ chunk-2jdf5m4m.js:2818-2872 placement
function policySettingsUnreadable() {
  return (
    filterFatalPolicyErrors(getPolicySettingsLoadErrors()).length > 0 ||
    (getParentManagedSettingsInvalid() && parentManagedTierParticipates())
  );
}
//@ chunk-2jdf5m4m.js:2872-2913 placement
function areDeviceHooksStoodDown() {
  return shouldHoldDeviceHooksByPolicy() || isRestrictedToPluginOnly("hooks");
}
//@ chunk-2jdf5m4m.js:2913-2977 placement (2.1.88 match: _temp, 1)
function shouldDisableAllHooksIncludingManaged() {
  return getSettingsForSource("policySettings")?.disableAllHooks === true;
}
//@ chunk-2jdf5m4m.js:2977-3010 placement
function shouldSkipSessionHooksByPolicy() {
  return shouldDisableAllHooksIncludingManaged() || shouldAllowManagedHooksOnlyByPolicy();
}
//@ chunk-2jdf5m4m.js:3010-3046 placement
function captureHooksConfigSnapshotFromLoadedSettings() {
  currentHooksSnapshots().store(getHooksFromAllowedSources());
  emitHookStoresChanged();
}
//@ chunk-2jdf5m4m.js:3046-3088 placement
function updateHooksConfigSnapshot(settings) {
  invalidateCommandNames(settings);
  currentHooksSnapshots().store(getHooksFromAllowedSources());
  emitHookStoresChanged();
}
//@ chunk-2jdf5m4m.js:3088-3169 placement
async function updateHooksConfigSnapshotThroughBackend(settings) {
  let restore = await resetSettingsCacheWithBackendRead(settings);
  try {
    currentHooksSnapshots().store(getHooksFromAllowedSources());
    emitHookStoresChanged();
  } finally {
    restore?.();
  }
}
//@ chunk-2jdf5m4m.js:3169-3289 placement
function* listProcessHooksConfigSnapshots() {
  for (let snapshot of currentHooksSnapshots().snapshotsBySessionId.values())
    if (snapshot.initialHooksConfig !== null) yield snapshot.initialHooksConfig;
}
//@ chunk-2jdf5m4m.js:3289-3408 placement
function getHooksConfigFromSnapshot() {
  let snapshot = currentHooksSnapshots().current();
  if (snapshot.initialHooksConfig === null) {
    invalidateCommandNames();
    currentHooksSnapshots().store(getHooksFromAllowedSources());
    emitHookStoresChanged();
  }
  return snapshot.initialHooksConfig;
}
//@ chunk-2jdf5m4m.js:3408-3481 placement
function getPolicyHooksFromSnapshot() {
  getHooksConfigFromSnapshot();
  return currentHooksSnapshots().current().policyHooksConfig ?? "unreadable";
}
//@ chunk-2jdf5m4m.js:3481-3579 placement
function getUserHooksFromSnapshot() {
  getHooksConfigFromSnapshot();
  return (
    currentHooksSnapshots().current().userHooksConfig ??
    (isPersonalConfigRestricted() ? (getSettingsForSource("userSettings")?.hooks ?? {}) : {})
  );
}
//@ chunk-e6aww6q8.js:874759-874823 callgraph-fingerprint (2.1.88 match: shouldDisableAllHooksIncludingManaged, 0.434)
/**
 * 返回生效的 statusLine：只允许 managed 钩子时用 policySettings.statusLine。
 */
function getEffectiveStatusLine(statusLine) {
  return isStatusLineManagedOnly() ? getSettingsForSource("policySettings")?.statusLine : statusLine;
}
export {
  policySettingsUnreadable,
  noPolicyStatusLine,
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnlyByPolicy,
  getEffectiveStatusLine,
  shouldAllowManagedHooksOnly,
  updateHooksConfigSnapshot,
  areDeviceHooksStoodDown,
  areRepoHooksElsewhereStoodDown,
  getHooksConfigFromSnapshot,
  withoutCheckoutSettingsHooks,
  shouldHoldDeviceHooksByPolicy,
  getPolicyHooksFromSnapshot,
  getUserHooksFromSnapshot,
  shouldSkipSessionHooksByPolicy,
  neverSkipSessionHooks,
  noSnapshotOverride,
  personTurnedHooksOff,
  keepsOwnHooksDespiteDisableAll,
  ownHooksOffForUnreadablePolicy,
  updateHooksConfigSnapshotThroughBackend,
  captureHooksConfigSnapshotFromLoadedSettings,
  listProcessHooksConfigSnapshots,
};
