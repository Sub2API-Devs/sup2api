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
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
} from "path";
import {
  realpathSync,
  realpathSync as realpathSync_2,
  realpathSync as realpathSync_3,
  realpathSync as realpathSync_4,
  realpathSync as realpathSync_5,
} from "fs";
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
function c_() {
  return { repinned: new Map(), everInReach: new Set(), answered: new Map(), withdrawn: new Set() };
}
//@ chunk-s61vbvea.js:339291-339349 placement
function vN(e, n) {
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
  ],
  DEVICE_HOOK_SCOPES = DEVICE_HOOK_SETTING_SOURCES.map(([, e]) => e);
//@ chunk-s61vbvea.js:339453-339510 placement
function wl(e) {
  return isSettingSourceEnabled(e) && getSettingsForSource(e)?.disableAllHooks === !0;
}
//@ chunk-s61vbvea.js:339510-339589 placement
function hf(e) {
  return Object.values(e).some((n) => Array.isArray(n) && n.length > 0);
}
//@ chunk-s61vbvea.js:339589-341136 placement
function deviceHooksPolicyEligibility(e) {
  if (e.policyUnreadable()) return { kind: "none", reason: "policy_unreadable" };
  let settingsForSource = e.getSettingsForSource("policySettings");
  if (settingsForSource?.disableAllHooks === !0) return { kind: "none", reason: "policy_disable_all" };
  if (settingsForSource?.allowManagedHooksOnly === !0 || e.isSafeMode())
    return { kind: "none", reason: "managed_only" };
  if (e.isRestrictedToPluginOnly()) return { kind: "none", reason: "plugin_only" };
  let disableAllHooksByUser = e.disableAllHooksByUser();
  if (disableAllHooksByUser.length > 0)
    return {
      kind: "none",
      reason: "disabled_by_settings",
      switchSources: disableAllHooksByUser.filter((S) => S !== "flag" || !e.flagSettingsInline()),
    };
  if (e.isBare()) return { kind: "none", reason: "bare" };
  if (e.hooksSkippedForTrust()) return { kind: "none", reason: "untrusted_workspace" };
  let s = new Set(),
    h = [];
  return {
    kind: "captured",
    sources: DEVICE_HOOK_SETTING_SOURCES.flatMap(([S, w]) => {
      if (!e.isSettingSourceEnabled(S)) return [];
      if (S === "flagSettings" && e.flagPatchHasHooks())
        return (h.push({ source: w, reason: "runtime_patch" }), []);
      let R =
          S === "flagSettings" && e.flagSettingsInline() ? null : (e.getSettingsFilePathForSource(S) ?? null),
        x = e.getSettingsForSource(S)?.hooks;
      if (!x || !hf(x)) return [];
      if (S === "localSettings" && !e.isWorkspaceTrusted())
        return (h.push({ source: w, reason: "untrusted" }), []);
      if (S === "localSettings" && e.servesWithNoTerminal())
        return (h.push({ source: w, reason: "served_folder" }), []);
      if (S === "localSettings" && e.isLocalSettingsGitTracked())
        return (h.push({ source: w, reason: "repo_provenance" }), []);
      if (R !== null && S !== "flagSettings") {
        let P = vN(e, resolve_4(R));
        if (s.has(P)) return [];
        s.add(P);
      }
      return [{ source: w, settingsFile: R, hooks: x }];
    }),
    withheld: h,
    capturedAtMs: e.now(),
    ...(e.disableAllHooksInCheckout() && { checkoutDisablesAllHooks: !0 }),
  };
}
//@ chunk-s61vbvea.js:341136-341975 placement
function collectDeviceHookSources() {
  return {
    getSettingsForSource: (e) =>
      e === "localSettings" ? getSettingsForSourceWriteSeed("localSettings") : getSettingsForSource(e),
    getSettingsFilePathForSource: getSettingsFilePathForSource,
    disableAllHooksByUser: () => [
      ...(wl("userSettings") ? ["user"] : []),
      ...(wl("flagSettings") ? ["flag"] : []),
    ],
    disableAllHooksInCheckout: () =>
      wl("projectSettings") ||
      wl("localSettings") ||
      (isSettingSourceEnabled("localSettings") &&
        getSettingsForSourceWriteSeed("localSettings")?.disableAllHooks === !0),
    isWorkspaceTrusted: () => isWorkspacePersistedTrusted(),
    servesWithNoTerminal: isAttachServeMode,
    isLocalSettingsGitTracked: () => (
      resetLocalSettingsGitTrackedCache(),
      isLocalSettingsGitTracked({ onIndeterminate: "untracked" })
    ),
    flagSettingsInline: () => getFlagSettingsExpectedContent() !== void 0,
    realpath: realpathSync_3,
    policyUnreadable: () =>
      filterFatalPolicyErrors(getPolicySettingsLoadErrors()).length > 0 ||
      (getParentManagedSettingsInvalid() && parentManagedTierParticipates()),
    hooksSkippedForTrust: () => !isWorkspacePersistedTrusted(),
    flagPatchHasHooks: () => {
      let e = getFlagSettingsInline()?.hooks;
      return typeof e === "object" && e !== null && Object.keys(e).length > 0;
    },
    isSafeMode: isSafeMode,
    isRestrictedToPluginOnly: () => isRestrictedToPluginOnly("hooks"),
    isBare: () => isCustomizationDisabled("hooks"),
    isSettingSourceEnabled: isSettingSourceEnabled,
    now: Date.now,
  };
}

export { deviceHooksPolicyEligibility, collectDeviceHookSources, hf, DEVICE_HOOK_SCOPES, c_ };
