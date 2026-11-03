/**
 * utils/hooks/deviceHooks/eligibility.ts
 *
 * 设备钩子策略资格（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (7)
 * attribution: placement 7
 */
import { resolve } from "path";
import { realpathSync } from "fs";
import { isSettingSourceEnabled } from "../../settings/constants.js";
import {
  getSettingsForSource,
  getSettingsForSourceWriteSeed,
  getSettingsFilePathForSource,
  filterFatalPolicyErrors,
  getPolicySettingsLoadErrors,
  parentManagedTierParticipates,
} from "../../settings/settings.js";
import {
  isWorkspacePersistedTrusted,
  resetLocalSettingsGitTrackedCache,
  isLocalSettingsGitTracked,
} from "../../config.js";
import { isAttachServeMode } from "../../../cli/headlessCloud/attachServe.js";
import {
  getFlagSettingsExpectedContent,
  getParentManagedSettingsInvalid,
  getFlagSettingsInline,
} from "../../../bootstrap/state.js";
import { isSafeMode } from "../../envUtils.js";
import { isRestrictedToPluginOnly } from "../../settings/pluginOnlyPolicy.js";
import { isCustomizationDisabled } from "../../settings/customizationDisabled.js";

//@ chunk-s61vbvea.js:339130-339224 placement
/**
 * 空的设备钩子资格状态（重钉、曾可达、已答复、已撤回）。
 */
function emptyEligibilityState() {
  return {
    repinned: new Map(),
    everInReach: new Set(),
    answered: new Map(),
    withdrawn: new Set(),
  };
}
//@ chunk-s61vbvea.js:339291-339349 placement
function realpathOrSelf(e, n) {
  try {
    return e.realpath(n);
  } catch {
    return n;
  }
}
//@ chunk-s61vbvea.js:339349-339453 placement
var DEVICE_HOOK_SETTING_SOURCES = [
  ["userSettings", "user"],
  ["localSettings", "local"],
  ["flagSettings", "flag"],
];
var DEVICE_HOOK_SCOPES = DEVICE_HOOK_SETTING_SOURCES.map(([, e]) => e);
//@ chunk-s61vbvea.js:339453-339510 placement
function isHooksDisabledForSource(e) {
  return isSettingSourceEnabled(e) && getSettingsForSource(e)?.disableAllHooks === true;
}
//@ chunk-s61vbvea.js:339510-339589 placement
/**
 * 判断钩子配置对象中是否至少有一个非空事件列表。
 */
function hasAnyHookEntries(hooks) {
  return Object.values(hooks).some((n) => Array.isArray(n) && n.length > 0);
}
//@ chunk-s61vbvea.js:339589-341136 placement
function deviceHooksPolicyEligibility(deviceHookSources) {
  if (deviceHookSources.policyUnreadable())
    return {
      kind: "none",
      reason: "policy_unreadable",
    };
  let settingsForSource = deviceHookSources.getSettingsForSource("policySettings");
  if (settingsForSource?.disableAllHooks === true)
    return {
      kind: "none",
      reason: "policy_disable_all",
    };
  if (settingsForSource?.allowManagedHooksOnly === true || deviceHookSources.isSafeMode())
    return {
      kind: "none",
      reason: "managed_only",
    };
  if (deviceHookSources.isRestrictedToPluginOnly())
    return {
      kind: "none",
      reason: "plugin_only",
    };
  let r = deviceHookSources.disableAllHooksByUser();
  if (r.length > 0)
    return {
      kind: "none",
      reason: "disabled_by_settings",
      switchSources: r.filter((S) => S !== "flag" || !deviceHookSources.flagSettingsInline()),
    };
  if (deviceHookSources.isBare())
    return {
      kind: "none",
      reason: "bare",
    };
  if (deviceHookSources.hooksSkippedForTrust())
    return {
      kind: "none",
      reason: "untrusted_workspace",
    };
  let s = new Set();
  let h = [];
  return {
    kind: "captured",
    sources: DEVICE_HOOK_SETTING_SOURCES.flatMap(([S, w]) => {
      if (!deviceHookSources.isSettingSourceEnabled(S)) return [];
      if (S === "flagSettings" && deviceHookSources.flagPatchHasHooks()) {
        h.push({
          source: w,
          reason: "runtime_patch",
        });
        return [];
      }
      let R =
        S === "flagSettings" && deviceHookSources.flagSettingsInline()
          ? null
          : (deviceHookSources.getSettingsFilePathForSource(S) ?? null);
      let hooks = deviceHookSources.getSettingsForSource(S)?.hooks;
      if (!hooks || !hasAnyHookEntries(hooks)) return [];
      if (S === "localSettings" && !deviceHookSources.isWorkspaceTrusted()) {
        h.push({
          source: w,
          reason: "untrusted",
        });
        return [];
      }
      if (S === "localSettings" && deviceHookSources.servesWithNoTerminal()) {
        h.push({
          source: w,
          reason: "served_folder",
        });
        return [];
      }
      if (S === "localSettings" && deviceHookSources.isLocalSettingsGitTracked()) {
        h.push({
          source: w,
          reason: "repo_provenance",
        });
        return [];
      }
      if (R !== null && S !== "flagSettings") {
        let P = realpathOrSelf(deviceHookSources, resolve(R));
        if (s.has(P)) return [];
        s.add(P);
      }
      return [
        {
          source: w,
          settingsFile: R,
          hooks,
        },
      ];
    }),
    withheld: h,
    capturedAtMs: deviceHookSources.now(),
    ...(deviceHookSources.disableAllHooksInCheckout() && {
      checkoutDisablesAllHooks: true,
    }),
  };
}
//@ chunk-s61vbvea.js:341136-341975 placement
function collectDeviceHookSources() {
  return {
    getSettingsForSource: (e) =>
      e === "localSettings" ? getSettingsForSourceWriteSeed("localSettings") : getSettingsForSource(e),
    getSettingsFilePathForSource,
    disableAllHooksByUser: () => [
      ...(isHooksDisabledForSource("userSettings") ? ["user"] : []),
      ...(isHooksDisabledForSource("flagSettings") ? ["flag"] : []),
    ],
    disableAllHooksInCheckout: () =>
      isHooksDisabledForSource("projectSettings") ||
      isHooksDisabledForSource("localSettings") ||
      (isSettingSourceEnabled("localSettings") &&
        getSettingsForSourceWriteSeed("localSettings")?.disableAllHooks === true),
    isWorkspaceTrusted: () => isWorkspacePersistedTrusted(),
    servesWithNoTerminal: isAttachServeMode,
    isLocalSettingsGitTracked: () => {
      resetLocalSettingsGitTrackedCache();
      return isLocalSettingsGitTracked({
        onIndeterminate: "untracked",
      });
    },
    flagSettingsInline: () => getFlagSettingsExpectedContent() !== undefined,
    realpath: realpathSync,
    policyUnreadable: () =>
      filterFatalPolicyErrors(getPolicySettingsLoadErrors()).length > 0 ||
      (getParentManagedSettingsInvalid() && parentManagedTierParticipates()),
    hooksSkippedForTrust: () => !isWorkspacePersistedTrusted(),
    flagPatchHasHooks: () => {
      let hooks = getFlagSettingsInline()?.hooks;
      return typeof hooks === "object" && hooks !== null && Object.keys(hooks).length > 0;
    },
    isSafeMode,
    isRestrictedToPluginOnly: () => isRestrictedToPluginOnly("hooks"),
    isBare: () => isCustomizationDisabled("hooks"),
    isSettingSourceEnabled,
    now: Date.now,
  };
}
export {
  deviceHooksPolicyEligibility,
  collectDeviceHookSources,
  hasAnyHookEntries,
  DEVICE_HOOK_SCOPES,
  emptyEligibilityState,
};
