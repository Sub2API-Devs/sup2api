/**
 * utils/hooks/deviceHooks/eligibility.ts
 *
 * 设备钩子策略资格（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (7)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:263770-263864 placement
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
//@ chunk-7jxyna5q.js:263931-263989 placement
function realpathOrSelf(deps, path) {
  try {
    return deps.realpath(path);
  } catch {
    return path;
  }
}
//@ chunk-7jxyna5q.js:263989-264093 placement
var DEVICE_HOOK_SETTING_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEVICE_HOOK_SCOPES;
deferInit("chunk-7jxyna5q.js:263989", () => {
  DEVICE_HOOK_SETTING_SOURCES = [
    ["userSettings", "user"],
    ["localSettings", "local"],
    ["flagSettings", "flag"],
  ];
  DEVICE_HOOK_SCOPES = DEVICE_HOOK_SETTING_SOURCES.map(([, pair]) => pair);
});
//@ chunk-7jxyna5q.js:264093-264150 placement
function isHooksDisabledForSource(source) {
  return isSettingSourceEnabled(source) && getSettingsForSource(source)?.disableAllHooks === true;
}
//@ chunk-7jxyna5q.js:264150-264229 placement
/**
 * 判断钩子配置对象中是否至少有一个非空事件列表。
 */
function hasAnyHookEntries(hooks) {
  return Object.values(hooks).some((list) => Array.isArray(list) && list.length > 0);
}
//@ chunk-7jxyna5q.js:264229-265776 placement
function deviceHooksPolicyEligibility(deps) {
  if (deps.policyUnreadable())
    return {
      kind: "none",
      reason: "policy_unreadable",
    };
  let settingsForSource = deps.getSettingsForSource("policySettings");
  if (settingsForSource?.disableAllHooks === true)
    return {
      kind: "none",
      reason: "policy_disable_all",
    };
  if (settingsForSource?.allowManagedHooksOnly === true || deps.isSafeMode())
    return {
      kind: "none",
      reason: "managed_only",
    };
  if (deps.isRestrictedToPluginOnly())
    return {
      kind: "none",
      reason: "plugin_only",
    };
  let switches = deps.disableAllHooksByUser();
  if (switches.length > 0)
    return {
      kind: "none",
      reason: "disabled_by_settings",
      switchSources: switches.filter((source) => source !== "flag" || !deps.flagSettingsInline()),
    };
  if (deps.isBare())
    return {
      kind: "none",
      reason: "bare",
    };
  if (deps.hooksSkippedForTrust())
    return {
      kind: "none",
      reason: "untrusted_workspace",
    };
  let seenFiles = new Set();
  let withheld = [];
  return {
    kind: "captured",
    sources: DEVICE_HOOK_SETTING_SOURCES.flatMap(([source, scope]) => {
      if (!deps.isSettingSourceEnabled(source)) return [];
      if (source === "flagSettings" && deps.flagPatchHasHooks()) {
        withheld.push({
          source: scope,
          reason: "runtime_patch",
        });
        return [];
      }
      let settingsFile =
        source === "flagSettings" && deps.flagSettingsInline()
          ? null
          : (deps.getSettingsFilePathForSource(source) ?? null);
      let hooks = deps.getSettingsForSource(source)?.hooks;
      if (!hooks || !hasAnyHookEntries(hooks)) return [];
      if (source === "localSettings" && !deps.isWorkspaceTrusted()) {
        withheld.push({
          source: scope,
          reason: "untrusted",
        });
        return [];
      }
      if (source === "localSettings" && deps.servesWithNoTerminal()) {
        withheld.push({
          source: scope,
          reason: "served_folder",
        });
        return [];
      }
      if (source === "localSettings" && deps.isLocalSettingsGitTracked()) {
        withheld.push({
          source: scope,
          reason: "repo_provenance",
        });
        return [];
      }
      if (settingsFile !== null && source !== "flagSettings") {
        let realPath = realpathOrSelf(deps, resolve(settingsFile));
        if (seenFiles.has(realPath)) return [];
        seenFiles.add(realPath);
      }
      return [
        {
          source: scope,
          settingsFile,
          hooks,
        },
      ];
    }),
    withheld,
    capturedAtMs: deps.now(),
    ...(deps.disableAllHooksInCheckout() && {
      checkoutDisablesAllHooks: true,
    }),
  };
}
//@ chunk-7jxyna5q.js:265776-266615 placement
function collectDeviceHookSources() {
  return {
    getSettingsForSource: (source) =>
      source === "localSettings"
        ? getSettingsForSourceWriteSeed("localSettings")
        : getSettingsForSource(source),
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
