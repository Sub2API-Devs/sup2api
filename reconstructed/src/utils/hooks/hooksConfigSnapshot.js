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
import { Rs } from "./hookSerialization.js";
import { k } from "./hooksPolicy.js";
import { or } from "../settings/commandSyncNames.js";
import { resetSettingsCacheWithBackendRead } from "../settings/settingsPrime.js";
import { isStatusLineManagedOnly } from "./hookInputRewrite.js";

//@ chunk-2jdf5m4m.js:769-792 placement
function a(o) {
  return o;
}
//@ chunk-2jdf5m4m.js:792-819 placement
function Jmi() {
  return null;
}
//@ chunk-2jdf5m4m.js:819-844 placement
function Qmi(o) {
  return !1;
}
//@ chunk-2jdf5m4m.js:844-872 placement
function idr(o) {
  return null;
}
//@ chunk-2jdf5m4m.js:872-884 placement
var CLI = "cli";
/**
 * 按会话保存初始 hooks 配置快照。
 */
//@ chunk-2jdf5m4m.js:884-1421 placement
class HooksConfigSnapshots {
  snapshotKey = () => CLI;
  snapshotsBySessionId = new Map();
  setSnapshotKey(o) {
    this.snapshotKey = o;
  }
  current() {
    let snapshotKey = this.snapshotKey(),
      t = this.snapshotsBySessionId.get(snapshotKey);
    if (!t) ((t = { initialHooksConfig: null }), this.snapshotsBySessionId.set(snapshotKey, t));
    return t;
  }
  store(o) {
    let t = this.current();
    if (((t.initialHooksConfig = o), isPersonalConfigRestricted()))
      t.userHooksConfig = getSettingsForSource("userSettings")?.hooks ?? {};
    else delete t.userHooksConfig;
    try {
      t.policyHooksConfig = getSettingsForSource("policySettings")?.hooks ?? {};
    } catch {
      t.policyHooksConfig = "unreadable";
    }
  }
  evict(o) {
    if (o === CLI) return;
    this.snapshotsBySessionId.delete(o);
  }
}
//@ chunk-2jdf5m4m.js:1421-1444 placement
var H = new HostScoped(() => new HooksConfigSnapshots());
//@ chunk-2jdf5m4m.js:1444-1470 placement
function e() {
  return onProcessRootHost(H);
}
/**
 * 计算启动时快照的钩子配置：policy disableAllHooks → {}；allowManagedHooksOnly 或仅插件策略 → policy 钩子；用户层 disableAllHooks 时视情况保留受信层；否则合并 settings 钩子。
 */
//@ chunk-2jdf5m4m.js:1470-1741 fingerprint = getHooksFromAllowedSources (0.899)
function getHooksFromAllowedSources() {
  let o = getSettingsForSource("policySettings");
  if (o?.disableAllHooks === !0) return {};
  if (o?.allowManagedHooksOnly === !0 || isSafeMode()) return o?.hooks ?? {};
  if (isRestrictedToPluginOnly("hooks")) return o?.hooks ?? {};
  let t = getSettings_DEPRECATED();
  if (t.disableAllHooks === !0) {
    if (!keepsOwnHooksDespiteDisableAll()) return o?.hooks ?? {};
    return S();
  }
  return a(t.hooks ?? {});
}
//@ chunk-2jdf5m4m.js:1796-1855 placement
function S() {
  return mergeHooksConfigs(
    TRUSTED_SETTING_SOURCES.filter(isSettingSourceEnabled).map((o) => getSettingsForSource(o)?.hooks),
  );
}
//@ chunk-2jdf5m4m.js:1855-1944 placement
function withoutCheckoutSettingsHooks(o, t) {
  let n = new Set((S()[t] ?? []).map(Rs));
  return o.filter((s) => n.has(Rs(s)));
}
//@ chunk-2jdf5m4m.js:1944-2065 placement
function mergeHooksConfigs(o) {
  let t = {};
  for (let n of o)
    for (let [s, l] of Object.entries(n ?? {})) {
      let i = s;
      t[i] = [...(t[i] ?? []), ...(l ?? [])];
    }
  return t;
}
/**
 * 用户层 disableAllHooks 生效且当前不是受限场景时为真（只关闭用户自己的钩子）。
 */
//@ chunk-2jdf5m4m.js:2065-2098 placement
function keepsOwnHooksDespiteDisableAll() {
  return isDisableAllHooksUserOnly() && !policySettingsUnreadable();
}
/**
 * 用户层 disableAllHooks 生效且处于受限场景时为真。
 */
//@ chunk-2jdf5m4m.js:2098-2130 placement
function ownHooksOffForUnreadablePolicy() {
  return isDisableAllHooksUserOnly() && policySettingsUnreadable();
}
/**
 * disableAllHooks 只在用户层设置、受信层（policy 等）没有禁用时为 true。
 */
//@ chunk-2jdf5m4m.js:2130-2317 placement = getHooksFromAllowedSources (0.83)
function isDisableAllHooksUserOnly() {
  if (
    !isPersonalConfigRestricted() ||
    isSafeMode() ||
    isRestrictedToPluginOnly("hooks") ||
    getSettings_DEPRECATED().disableAllHooks !== !0
  )
    return !1;
  return (
    getSettingsForSource("policySettings")?.allowManagedHooksOnly !== !0 &&
    TRUSTED_SETTING_SOURCES.filter(isSettingSourceEnabled).every(
      (t) => getSettingsForSource(t)?.disableAllHooks !== !0,
    )
  );
}
/**
 * 是否只运行 managed（策略）钩子。
 */
//@ chunk-2jdf5m4m.js:2317-2373 placement
function shouldAllowManagedHooksOnly(o = getSettings_DEPRECATED().disableAllHooks) {
  return isSafeMode() || shouldAllowManagedHooksOnlyByPolicy(o);
}
/**
 * policy 设 allowManagedHooksOnly，或非 policy 层设 disableAllHooks 时只允许 managed 钩子。
 */
//@ chunk-2jdf5m4m.js:2373-2532 placement = shouldAllowManagedHooksOnly (0.843)
function shouldAllowManagedHooksOnlyByPolicy(o = getSettings_DEPRECATED().disableAllHooks) {
  let t = getSettingsForSource("policySettings");
  if (t?.allowManagedHooksOnly === !0) return !0;
  if (o === !0 && t?.disableAllHooks !== !0) return !0;
  return !1;
}
//@ chunk-2jdf5m4m.js:2532-2564 placement
function shouldHoldDeviceHooksByPolicy() {
  return k() || policySettingsUnreadable();
}
//@ chunk-2jdf5m4m.js:2639-2684 placement = formatDangerousSettingsList (0.483)
function areRepoHooksElsewhereStoodDown() {
  return shouldDisableAllHooksIncludingManaged() || k() || isRestrictedToPluginOnly("hooks");
}
//@ chunk-2jdf5m4m.js:2684-2723 placement = _temp5 (1)
function y() {
  return getSettingsForSourceTightenOnly("userSettings");
}
//@ chunk-2jdf5m4m.js:2723-2818 placement
function personTurnedHooksOff() {
  let o = y();
  return (
    o?.disableAllHooks === !0 || (o === null && getSettingsParseErrorsForSource("userSettings").length > 0)
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
//@ chunk-2jdf5m4m.js:2913-2977 placement = _temp (1)
function shouldDisableAllHooksIncludingManaged() {
  return getSettingsForSource("policySettings")?.disableAllHooks === !0;
}
//@ chunk-2jdf5m4m.js:2977-3010 placement
function shouldSkipSessionHooksByPolicy() {
  return shouldDisableAllHooksIncludingManaged() || shouldAllowManagedHooksOnlyByPolicy();
}
//@ chunk-2jdf5m4m.js:3010-3046 placement
function captureHooksConfigSnapshotFromLoadedSettings() {
  (e().store(getHooksFromAllowedSources()), emitHookStoresChanged());
}
//@ chunk-2jdf5m4m.js:3046-3088 placement
function updateHooksConfigSnapshot(o) {
  (or(o), e().store(getHooksFromAllowedSources()), emitHookStoresChanged());
}
//@ chunk-2jdf5m4m.js:3088-3169 placement
async function updateHooksConfigSnapshotThroughBackend(o) {
  let t = await resetSettingsCacheWithBackendRead(o);
  try {
    (e().store(getHooksFromAllowedSources()), emitHookStoresChanged());
  } finally {
    t?.();
  }
}
//@ chunk-2jdf5m4m.js:3169-3289 placement
function* listProcessHooksConfigSnapshots() {
  for (let o of e().snapshotsBySessionId.values())
    if (o.initialHooksConfig !== null) yield o.initialHooksConfig;
}
//@ chunk-2jdf5m4m.js:3289-3408 placement
function getHooksConfigFromSnapshot() {
  let o = e().current();
  if (o.initialHooksConfig === null) (or(), e().store(getHooksFromAllowedSources()), emitHookStoresChanged());
  return o.initialHooksConfig;
}
//@ chunk-2jdf5m4m.js:3408-3481 placement
function getPolicyHooksFromSnapshot() {
  return (getHooksConfigFromSnapshot(), e().current().policyHooksConfig ?? "unreadable");
}
//@ chunk-2jdf5m4m.js:3481-3579 placement
function getUserHooksFromSnapshot() {
  return (
    getHooksConfigFromSnapshot(),
    e().current().userHooksConfig ??
      (isPersonalConfigRestricted() ? (getSettingsForSource("userSettings")?.hooks ?? {}) : {})
  );
}
/**
 * 返回生效的 statusLine：只允许 managed 钩子时用 policySettings.statusLine。
 */
//@ chunk-e6aww6q8.js:874759-874823 callgraph-fingerprint = shouldDisableAllHooksIncludingManaged (0.434)
function getEffectiveStatusLine(e) {
  return isStatusLineManagedOnly() ? getSettingsForSource("policySettings")?.statusLine : e;
}

export {
  policySettingsUnreadable,
  idr,
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnlyByPolicy,
  getEffectiveStatusLine,
  shouldAllowManagedHooksOnly,
  updateHooksConfigSnapshot,
  getHooksConfigFromSnapshot,
  getPolicyHooksFromSnapshot,
  withoutCheckoutSettingsHooks,
  getUserHooksFromSnapshot,
  shouldSkipSessionHooksByPolicy,
  Qmi,
  Jmi,
  areDeviceHooksStoodDown,
  areRepoHooksElsewhereStoodDown,
  shouldHoldDeviceHooksByPolicy,
  personTurnedHooksOff,
  keepsOwnHooksDespiteDisableAll,
  ownHooksOffForUnreadablePolicy,
  updateHooksConfigSnapshotThroughBackend,
  captureHooksConfigSnapshotFromLoadedSettings,
  listProcessHooksConfigSnapshots,
};
