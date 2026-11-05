/**
 * utils/hooks/hooksConfigSnapshot.ts
 *
 * 并入已有模块：按会话保存初始 hooks 配置快照。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/hooksConfigSnapshot.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-ybq8sbnv.js (33)
 * attribution: callgraph-fingerprint 1, placement 31, fingerprint 1, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { isSettingSourceEnabled } from "../settings/constants.js";
import { stableStringifySafe } from "./hookSerialization.js";
import { isManagedHooksOnlyMode } from "./hooksPolicy.js";
import { invalidateCommandNames } from "../settings/commandSyncNames.js";
import { resetSettingsCacheWithBackendRead } from "../settings/settingsPrime.js";
import { isStatusLineManagedOnly } from "./hookInputRewrite.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ybq8sbnv.js:768-791 placement
function identityHooksConfig(config) {
  return config;
}
//@ chunk-ybq8sbnv.js:791-818 placement
/**
 * 恒返回 null（快照钩子配置的默认覆盖）。
 */
function noSnapshotOverride() {
  return null;
}
//@ chunk-ybq8sbnv.js:818-843 placement
/**
 * 恒返回 false（会话钩子从不因该策略跳过）。
 */
function neverSkipSessionHooks(projectRoot) {
  return false;
}
//@ chunk-ybq8sbnv.js:843-871 placement
/**
 * 恒返回 null（策略状态下没有 statusLine）。
 */
function noPolicyStatusLine(input) {
  return null;
}
//@ chunk-ybq8sbnv.js:871-883 placement
var DEFAULT_SNAPSHOT_KEY = "cli";
//@ chunk-ybq8sbnv.js:883-1420 placement
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
//@ chunk-ybq8sbnv.js:1420-1443 placement
var hooksSnapshotsRegistry; // deferred: uses HooksConfigSnapshots of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ybq8sbnv.js:1420", () => {
  hooksSnapshotsRegistry = new HostScoped(() => new HooksConfigSnapshots());
});
//@ chunk-ybq8sbnv.js:1443-1469 placement
function currentHooksSnapshots() {
  return onProcessRootHost(hooksSnapshotsRegistry);
}
//@ chunk-ybq8sbnv.js:1469-1740 fingerprint (2.1.88 match: getHooksFromAllowedSources, 0.899)
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
//@ chunk-ybq8sbnv.js:1740-1795 layout (2.1.88 match: TRUSTED_SETTING_SOURCES, 1)
var TRUSTED_SETTING_SOURCES = ["userSettings", "flagSettings", "policySettings"];
//@ chunk-ybq8sbnv.js:1795-1854 placement
function trustedHooksConfig() {
  return mergeHooksConfigs(
    TRUSTED_SETTING_SOURCES.filter(isSettingSourceEnabled).map(
      (source) => getSettingsForSource(source)?.hooks,
    ),
  );
}
//@ chunk-ybq8sbnv.js:1854-1943 placement
function withoutCheckoutSettingsHooks(matchers, event) {
  let allowed = new Set((trustedHooksConfig()[event] ?? []).map(stableStringifySafe));
  return matchers.filter((matcher) => allowed.has(stableStringifySafe(matcher)));
}
//@ chunk-ybq8sbnv.js:1943-2064 placement
function mergeHooksConfigs(configs) {
  let merged = {};
  for (let config of configs)
    for (let [key, value] of Object.entries(config ?? {})) {
      let event = key;
      merged[event] = [...(merged[event] ?? []), ...(value ?? [])];
    }
  return merged;
}
//@ chunk-ybq8sbnv.js:2064-2097 placement
/**
 * 用户层 disableAllHooks 生效且当前不是受限场景时为真（只关闭用户自己的钩子）。
 */
function keepsOwnHooksDespiteDisableAll() {
  return isDisableAllHooksUserOnly() && !policySettingsUnreadable();
}
//@ chunk-ybq8sbnv.js:2097-2129 placement
/**
 * 用户层 disableAllHooks 生效且处于受限场景时为真。
 */
function ownHooksOffForUnreadablePolicy() {
  return isDisableAllHooksUserOnly() && policySettingsUnreadable();
}
//@ chunk-ybq8sbnv.js:2129-2316 placement (2.1.88 match: getHooksFromAllowedSources, 0.83)
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
//@ chunk-ybq8sbnv.js:2316-2372 placement
/**
 * 是否只运行 managed（策略）钩子。
 */
function shouldAllowManagedHooksOnly(disableAllHooks = getSettings_DEPRECATED().disableAllHooks) {
  return isSafeMode() || shouldAllowManagedHooksOnlyByPolicy(disableAllHooks);
}
//@ chunk-ybq8sbnv.js:2372-2531 placement (2.1.88 match: shouldAllowManagedHooksOnly, 0.843)
/**
 * policy 设 allowManagedHooksOnly，或非 policy 层设 disableAllHooks 时只允许 managed 钩子。
 */
function shouldAllowManagedHooksOnlyByPolicy(disableAllHooks = getSettings_DEPRECATED().disableAllHooks) {
  let policySettings = getSettingsForSource("policySettings");
  if (policySettings?.allowManagedHooksOnly === true) return true;
  if (disableAllHooks === true && policySettings?.disableAllHooks !== true) return true;
  return false;
}
//@ chunk-ybq8sbnv.js:2531-2563 placement
/**
 * 是否只允许托管 hook（策略层面）。
 */
function shouldHoldDeviceHooksByPolicy() {
  return isManagedHooksOnlyMode() || policySettingsUnreadable();
}
//@ chunk-ybq8sbnv.js:2638-2683 placement
function areRepoHooksElsewhereStoodDown() {
  return (
    shouldDisableAllHooksIncludingManaged() || isManagedHooksOnlyMode() || isRestrictedToPluginOnly("hooks")
  );
}
//@ chunk-ybq8sbnv.js:2683-2722 placement (2.1.88 match: _temp5, 1)
function userSettingsTightenOnly() {
  return getSettingsForSourceTightenOnly("userSettings");
}
//@ chunk-ybq8sbnv.js:2722-2817 placement
function personTurnedHooksOff() {
  let userSettings = userSettingsTightenOnly();
  return (
    userSettings?.disableAllHooks === true ||
    (userSettings === null && getSettingsParseErrorsForSource("userSettings").length > 0)
  );
}
//@ chunk-ybq8sbnv.js:2817-2870 placement
function policySettingsUnreadable() {
  return (
    filterFatalPolicyErrors(getPolicySettingsLoadErrors()).length > 0 ||
    (getParentManagedSettingsInvalid() && parentManagedTierParticipates())
  );
}
//@ chunk-ybq8sbnv.js:2870-2911 placement
function areDeviceHooksStoodDown() {
  return shouldHoldDeviceHooksByPolicy() || isRestrictedToPluginOnly("hooks");
}
//@ chunk-ybq8sbnv.js:2911-2975 placement (2.1.88 match: _temp, 1)
/**
 * policySettings 是否 disableAllHooks。
 */
function shouldDisableAllHooksIncludingManaged() {
  return getSettingsForSource("policySettings")?.disableAllHooks === true;
}
//@ chunk-ybq8sbnv.js:2975-3008 placement
function shouldSkipSessionHooksByPolicy() {
  return shouldDisableAllHooksIncludingManaged() || shouldAllowManagedHooksOnlyByPolicy();
}
//@ chunk-ybq8sbnv.js:3008-3044 placement
function captureHooksConfigSnapshotFromLoadedSettings() {
  currentHooksSnapshots().store(getHooksFromAllowedSources());
  emitHookStoresChanged();
}
//@ chunk-ybq8sbnv.js:3044-3086 placement
function updateHooksConfigSnapshot(settings) {
  invalidateCommandNames(settings);
  currentHooksSnapshots().store(getHooksFromAllowedSources());
  emitHookStoresChanged();
}
//@ chunk-ybq8sbnv.js:3086-3167 placement
async function updateHooksConfigSnapshotThroughBackend(settings) {
  let restore = await resetSettingsCacheWithBackendRead(settings);
  try {
    currentHooksSnapshots().store(getHooksFromAllowedSources());
    emitHookStoresChanged();
  } finally {
    restore?.();
  }
}
//@ chunk-ybq8sbnv.js:3167-3287 placement
function* listProcessHooksConfigSnapshots() {
  for (let snapshot of currentHooksSnapshots().snapshotsBySessionId.values())
    if (snapshot.initialHooksConfig !== null) yield snapshot.initialHooksConfig;
}
//@ chunk-ybq8sbnv.js:3287-3406 placement
function getHooksConfigFromSnapshot() {
  let snapshot = currentHooksSnapshots().current();
  if (snapshot.initialHooksConfig === null) {
    invalidateCommandNames();
    currentHooksSnapshots().store(getHooksFromAllowedSources());
    emitHookStoresChanged();
  }
  return snapshot.initialHooksConfig;
}
//@ chunk-ybq8sbnv.js:3406-3479 placement
function getPolicyHooksFromSnapshot() {
  getHooksConfigFromSnapshot();
  return currentHooksSnapshots().current().policyHooksConfig ?? "unreadable";
}
//@ chunk-ybq8sbnv.js:3479-3577 placement
function getUserHooksFromSnapshot() {
  getHooksConfigFromSnapshot();
  return (
    currentHooksSnapshots().current().userHooksConfig ??
    (isPersonalConfigRestricted() ? (getSettingsForSource("userSettings")?.hooks ?? {}) : {})
  );
}
//@ chunk-5xgkngpb.js:885233-885297 callgraph-fingerprint (2.1.88 match: shouldDisableAllHooksIncludingManaged, 0.434)
/**
 * 返回生效的 statusLine：只允许 managed 钩子时用 policySettings.statusLine。
 */
function getEffectiveStatusLine(statusLine) {
  return isStatusLineManagedOnly() ? getSettingsForSource("policySettings")?.statusLine : statusLine;
}
export {
  updateHooksConfigSnapshot,
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
  policySettingsUnreadable,
  shouldAllowManagedHooksOnlyByPolicy,
  getHooksConfigFromSnapshot,
  noPolicyStatusLine,
  listProcessHooksConfigSnapshots,
  areDeviceHooksStoodDown,
  areRepoHooksElsewhereStoodDown,
  withoutCheckoutSettingsHooks,
  shouldHoldDeviceHooksByPolicy,
  getPolicyHooksFromSnapshot,
  getUserHooksFromSnapshot,
  shouldSkipSessionHooksByPolicy,
  neverSkipSessionHooks,
  noSnapshotOverride,
  getEffectiveStatusLine,
  keepsOwnHooksDespiteDisableAll,
  ownHooksOffForUnreadablePolicy,
  updateHooksConfigSnapshotThroughBackend,
  captureHooksConfigSnapshotFromLoadedSettings,
  personTurnedHooksOff,
};
