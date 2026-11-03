/**
 * utils/hooks/hookPolicyHold.ts
 *
 * 2.1.316 新增：钩子策略暂扣
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (27)
 * attribution: placement 27
 */
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";
import { getManagedHooksHoldState, filterHooksByManagedHold } from "./managedHooksOnly.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { zW, z5r, K5r, askOrganizationOnce } from "../plugins/commandSource.js";
import { logError } from "../log.js";
import { raceWithAbortSignal, withDeadline } from "../sleep.js";
import {
  GUARD_AND_FEEDBACK_EVENTS,
  HOOK_CHECK_UNAVAILABLE_MESSAGE,
  HOOKS_POLICY_UNREADABLE_MESSAGE,
  HOOKS_PENDING_POLICY_MESSAGE,
  getHooksForEvent,
  HOOKS_SKIPPED_AT_START_MESSAGE,
  SESSION_START_HOOKS_SKIPPED_REASON,
  hasConfiguredHooksForEvent,
  MODS_POLICY_UNKNOWN_REASON,
  RESTRICT_PERSONAL_CONFIG_REASON,
  NotOrganizationPluginError,
  HookAdmissionRefusal,
} from "../hooks.js";
import { isAutoAllowedInMode, isPlanBypass } from "../permissions/browserToolNames.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";
import { uniq } from "../collections.js";
import { J_ } from "../plugins/marketplaceNames.js";
import { logForDebugging } from "../debug.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { describeHooksModulesOffReason, BF } from "../plugins/hooksModulesRollout.js";
import { isBuiltinPluginId, RSi } from "../../plugins/builtinPlugins.js";
import {
  areHooksModulesAllowed,
  hooksModulesRefusalReason,
} from "../../services/analytics/growthbookCredentials.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import {
  shouldAllowManagedHooksOnly,
  shouldDisableAllHooksIncludingManaged,
  policySettingsUnreadable,
} from "./hooksConfigSnapshot.js";
import { isCoworkSession } from "../entrypointKinds.js";
import {
  isRemoteManagedSettingsVerified,
  getRemoteSettingsPathOverride,
  getLastLoadStatus,
  hasLoadCycleEnded,
  hasLoadCycleBegun,
  getEligibilityMemo,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { oOt } from "../settings/policyHelper/helperRemote.js";
import { AUTO_MODE_ENABLED_DEFAULT } from "../permissions/permissionSetup.js";
import { nfcLower } from "../stringUtils.js";
import { pluginNameAliases, parsePluginIdentifier } from "../plugins/pluginIdentifier.js";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { resolveManagedPluginDigests } from "../plugins/managedPluginSeating.js";
import { getManagedPlugins, getVouchedPolicyPluginIds } from "../plugins/managedPlugins.js";
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import { arePluginHooksHeld } from "../permissions/permissionsLoader.js";
import { getPolicyAllowedSet } from "../plugins/pluginPolicy.js";

//@ chunk-e6aww6q8.js:753062-753108 placement
var Zje = () => isHookPolicyUnanswered() || getManagedHooksHoldState("PreToolUse").isFaulted;
/**
 * 等待组织托管设置对钩子策略给出答复（有上限时间，可被中止）；超时则标记等待预算已用尽，之后不再等待。
 */
//@ chunk-e6aww6q8.js:753108-753406 placement
function waitForOrganizationHookPolicy(e, n) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  if (organizationAsk.isBoundSpent) return Promise.resolve();
  let s = Promise.resolve()
      .then(() => zW.wait?.())
      .catch(logError)
      .then(() => ((organizationAsk.isBoundSpent = !1), !0)),
    h = e === void 0 ? s : raceWithAbortSignal(s, e, () => Error("stopped")).catch(() => !0);
  return withDeadline(h, z5r, n).then((y) => {
    if (y === void 0) organizationAsk.isBoundSpent = !0;
  });
}
//@ chunk-e6aww6q8.js:753406-753540 placement
function maybeWaitForHookPolicy(e, n, r, s) {
  try {
    if (!GUARD_AND_FEEDBACK_EVENTS.has(e) || !isHookPolicyUnanswered()) return;
  } catch (error) {
    logError(error);
    return;
  }
  let h = !0;
  try {
    h = n();
  } catch (error) {
    logError(error);
  }
  return h ? waitForOrganizationHookPolicy(r, s) : void 0;
}
//@ chunk-e6aww6q8.js:753540-753555 placement
var DENY = "deny";
//@ chunk-e6aww6q8.js:753555-753779 placement
async function holdToolCallForHookPolicy(e, n, r, s) {
  let h = !1;
  try {
    if (((h = Zje()), !(h && e()))) return;
    (await waitForOrganizationHookPolicy(r, s), (h = Zje()));
  } catch (error) {
    logError(error);
  }
  if (!h) return;
  let y = !0;
  try {
    y = n();
  } catch (error) {
    logError(error);
  }
  return {
    permissionBehavior: y ? DENY : "ask",
    hookPermissionDecisionReason: HOOK_CHECK_UNAVAILABLE_MESSAGE,
  };
}
//@ chunk-e6aww6q8.js:753779-753972 placement
function isBypassPermissionsInEffect(e, n, r) {
  let s = r === "bypassPermissions";
  if (n === void 0) return s;
  let h = isAutoAllowedInMode(e, n);
  return (
    (s && n.mode !== "bypassPermissions") ||
    h === "bypassPermissions" ||
    isPlanBypass(h, n.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-e6aww6q8.js:753972-754088 placement
function withHeldPermissionBehavior(e, n) {
  if (e === void 0) return;
  let r = !0;
  try {
    r = n();
  } catch (error) {
    logError(error);
  }
  return { ...e, permissionBehavior: r ? DENY : "ask" };
}
/**
 * 生成"钩子因托管设置未就绪/不可读而未运行"的说明，附上受影响的钩子事件（插件钩子带插件 id）列表。
 */
//@ chunk-e6aww6q8.js:754088-754359 placement
function hooksNotRunningMessage() {
  let e = HOOKS_POLICY_UNREADABLE_MESSAGE;
  try {
    e = zW.fetches?.() === !0 ? HOOKS_PENDING_POLICY_MESSAGE : HOOKS_POLICY_UNREADABLE_MESSAGE;
    let flattened = HOOK_EVENTS.flatMap((y) =>
        filterHooksByManagedHold([...getHooksForEvent(y)], y, "only").map((S) =>
          "pluginId" in S ? `${y} (plugin ${S.pluginId})` : y,
        ),
      ),
      joined = uniq(flattened).toSorted().join(", ");
    return flattened.length > 0 ? `${e} Hooks not running: ${joined}.` : e;
  } catch (error) {
    return (logError(error), e);
  }
}
/**
 * 只允许 Edit 指定记忆文件的 canUseTool（会话记忆更新代理用）。
 */
//@ chunk-e6aww6q8.js:754359-754458 placement = createMemoryFileCanUseTool (0.484)
function createMemoryFileCanUseTool() {
  try {
    return HOOK_EVENTS.some((e) => filterHooksByManagedHold([...getHooksForEvent(e)], e, "only").length > 0);
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-e6aww6q8.js:754458-755329 placement
function waitForCloudModsHold(e, n, r) {
  let organizationAsk = getPluginRegistry().organizationAsk,
    h = J_(),
    isHeld = organizationAsk.isHeld,
    S = h === "unanswered",
    w = isHeld || (S && (organizationAsk.hasHeld || createMemoryFileCanUseTool()));
  if (!S) organizationAsk.hasHeld = !1;
  if (!w) return null;
  function L() {
    return J_() !== "unanswered" ? e().catch(logError) : void 0;
  }
  if (h !== "unanswered") return withDeadline(Promise.resolve(L()), K5r, r);
  let G = !1,
    isWaited = organizationAsk.isWaited;
  function Z() {
    let we = J_() !== "unanswered";
    if (organizationAsk.isTold || (we && !isWaited)) return;
    let Ae = we ? HOOKS_SKIPPED_AT_START_MESSAGE : hooksNotRunningMessage();
    (logForDebugging(Ae, { level: "warn" }), n(Ae), (organizationAsk.isTold = !0));
  }
  function Se() {
    G = !0;
    try {
      if (isWaited) Z();
    } catch (error) {
      logError(error);
    }
    return askOrganizationOnce();
  }
  let ke = Promise.resolve()
    .then(() => zW.wait?.())
    .then(Se, (we) => (logError(we), Se()))
    .catch(logError)
    .then(Z)
    .catch(logError);
  if (organizationAsk.isWaited) return null;
  return (
    (organizationAsk.isWaited = !0),
    withDeadline(ke.then(L), K5r, r)
      .then(() => {
        let we = J_();
        if (((isWaited = we === "unanswered"), isHeld && we === "answered"))
          logFeatureOk("cowork_cloud_mods_hold");
        if (isHeld && we !== "answered") {
          let Ee = zW.fetches?.() === !0;
          logFeatureSad("cowork_cloud_mods_hold", Ee ? "settings_unread" : "never_asks");
        }
        if (isWaited && G) Z();
      })
      .catch(logError)
  );
}
/**
 * 等待组织托管 hook 策略回答后再运行启动 hook，并记录等待时长。
 */
//@ chunk-e6aww6q8.js:755329-755700 placement
function waitForStartHooksPolicy(e) {
  let organizationAsk = getPluginRegistry().organizationAsk,
    now = Date.now();
  function s() {
    let h = isHookPolicyUnanswered();
    return (
      logForDebugging(
        `start hooks waited ${Date.now() - now} ms for the organization's managed settings` +
          (h ? `; ${SESSION_START_HOOKS_SKIPPED_REASON}` : ""),
        h ? { level: "warn" } : void 0,
      ),
      h
        ? logFeatureSad("hooks_organization_start_wait", "unanswered")
        : logFeatureOk("hooks_organization_start_wait")
    );
  }
  return (
    (organizationAsk.startHooksWait ??= waitForOrganizationHookPolicy(void 0, e)
      .then(s)
      .catch(logError)),
    organizationAsk.startHooksWait
  );
}
//@ chunk-e6aww6q8.js:755700-755779 placement
var tWe = (e, n) =>
  Promise.resolve()
    .then(() =>
      isHookPolicyUnanswered() && hasConfiguredHooksForEvent(e) ? waitForStartHooksPolicy(n) : void 0,
    )
    .catch(logError);
/**
 * 在 hook 结果中找出最后一个给出阻止或权限决定的结果。
 */
//@ chunk-e6aww6q8.js:755779-756371 placement
function p$t(e, results) {
  if (e === void 0) return;
  let last = results.findLast(
      (w) =>
        w.blockingError !== void 0 ||
        w.permissionBehavior === "allow" ||
        w.permissionBehavior === "ask" ||
        w.permissionBehavior === "deny",
    ),
    s = last?.blockingError !== void 0 || last?.permissionBehavior === "deny",
    h = last?.permissionBehavior === "ask" && e.permissionBehavior === "ask";
  if (s || h) return;
  logForDebugging(
    "a hook ahead of this tool call is held for the organization's managed settings: the call " +
      (e.permissionBehavior === "deny" ? "is refused" : "asks"),
    { level: "warn" },
  );
  let S = (results.findLast((w) => w.permissionBehavior === "ask") ?? last)?.updatedInput;
  return S === void 0 ? e : { ...e, updatedInput: S };
}
//@ chunk-e6aww6q8.js:756371-757137 placement
function describeHooksModulesTurnedOff(e, n) {
  if (n.builtinsOnly)
    return `hooks modules are turned off for installed plugins in this process: ${describeHooksModulesOffReason()}; built-in plugins load regardless`;
  if (n.allDisabled)
    return "disableAllHooks in managed settings, which governs installed plugins; built-in plugins load regardless";
  if (e) return;
  if (n.personsHeld)
    return `hooks modules a person installed wait for the rollout switch in this process: ${describeHooksModulesOffReason()}; an organization's and built-in plugins load regardless`;
  if (n.hooksDisabled)
    return "installed plugins that are not managed load no hooks module in this mode (--bare); built-in plugins load regardless";
  if (n.managedOnly)
    return "only managed plugins and built-in plugins run (allowManagedHooksOnly / disableAllHooks)";
  return n.organization === "unanswered" ? MODS_POLICY_UNKNOWN_REASON : void 0;
}
//@ chunk-e6aww6q8.js:757137-757259 placement
function pluginHooksRefusalReason(e, n, r) {
  return isBuiltinPluginId(e)
    ? void 0
    : n.isHeld
      ? RESTRICT_PERSONAL_CONFIG_REASON
      : describeHooksModulesTurnedOff(n.isManaged, {
          ...r,
          personsHeld: r.personsHeld && !n.isPolicyEnabled,
        });
}
//@ chunk-e6aww6q8.js:757259-757319 placement
var oWe = (e) => !areHooksModulesAllowed() || (BF() && e.hooksModulesWakeBound === "ahead");
//@ chunk-e6aww6q8.js:757319-757412 placement
var ZP = () => ({
  hooksDisabled: isCustomizationDisabled("hooks"),
  managedOnly: shouldAllowManagedHooksOnly(),
  allDisabled: shouldDisableAllHooksIncludingManaged(),
  organization: J_(),
});
//@ chunk-e6aww6q8.js:757412-757468 placement
function m$t() {
  try {
    return isCoworkSession();
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-e6aww6q8.js:757468-757536 placement
var g$t = (e) =>
  e?.state === "ok" &&
  (!e.hasSettings || isRemoteManagedSettingsVerified() || getRemoteSettingsPathOverride() !== void 0);
//@ chunk-e6aww6q8.js:757536-757728 placement
function remoteSettingsAnswerState() {
  let e = getLastLoadStatus(),
    n = g$t(e),
    r = e === void 0 && (hasLoadCycleEnded() || !hasLoadCycleBegun()),
    s = e?.state === "failed" || e?.state === "stale_cache" || r,
    h = getEligibilityMemo() === !1 || m$t() || n;
  return oOt() || !(h || s) ? "pending" : h ? "answered" : "failed";
}
//@ chunk-e6aww6q8.js:757728-757853 placement
function getHookPolicyAnswerState() {
  try {
    let e = remoteSettingsAnswerState(),
      n = !policySettingsUnreadable(),
      r = e !== "pending" && AUTO_MODE_ENABLED_DEFAULT();
    return n ? e : r ? "failed" : "pending";
  } catch (error) {
    return (logError(error), "pending");
  }
}
//@ chunk-e6aww6q8.js:757853-757941 placement
var sWe = (e) =>
  e.hooksModulesWakeBound !== "ahead" &&
  BF() &&
  areHooksModulesAllowed() &&
  !(AUTO_MODE_ENABLED_DEFAULT() && getHookPolicyAnswerState() === "answered");
//@ chunk-e6aww6q8.js:757941-758119 placement
function F0(e, n) {
  if (e === null) return null;
  let r = new Set([...e].filter((s) => !isBuiltinPluginId(s)).map(nfcLower));
  return new Set(n.filter((s) => e.has(s.source) || r.has(nfcLower(s.source))).map((s) => s.source));
}
//@ chunk-e6aww6q8.js:758119-758216 placement
var Ome = (e) =>
  RSi()
    .flatMap((n) => pluginNameAliases({ name: n, source: `${n}@${BUILTIN}` }))
    .some((n) => nfcLower(n) === nfcLower(e.name));
//@ chunk-e6aww6q8.js:758216-758297 placement
var iWe = (e) =>
  resolveManagedPluginDigests(e.source) !== void 0 &&
  nfcLower(e.name) === nfcLower(parsePluginIdentifier(e.source).name) &&
  !Ome(e);
//@ chunk-e6aww6q8.js:758297-758562 placement
function h$t(e, n) {
  if (isBuiltinPluginId(e) || getManagedPlugins() || hooksModulesRefusalReason() !== void 0) return;
  let s = [{ source: e }],
    h = getPluginRegistry();
  return pluginHooksRefusalReason(
    e,
    {
      isHeld: n === void 0 ? isPersonalConfigRestricted() : arePluginHooksHeld(n),
      isManaged: F0(getVouchedPolicyPluginIds(), s)?.size === 1 || (n !== void 0 && iWe(n)),
      isPolicyEnabled: F0(getPolicyAllowedSet(), s)?.size === 1,
    },
    { ...ZP(), builtinsOnly: oWe(h), personsHeld: sWe(h) },
  );
}
//@ chunk-e6aww6q8.js:758562-758786 placement
function assertPluginHooksAdmitted(e, n) {
  if (e.knownArgs.get(n.pluginName)?.sealed === !0)
    throw new NotOrganizationPluginError(
      n.pluginName,
      "a proved module of this name may not come back from disk",
    );
  let s = h$t(n.pluginId, n.plugin);
  if (s !== void 0) throw new HookAdmissionRefusal(n.pluginName, s);
}

export {
  waitForOrganizationHookPolicy,
  DENY,
  isBypassPermissionsInEffect,
  holdToolCallForHookPolicy,
  p$t,
  withHeldPermissionBehavior,
  maybeWaitForHookPolicy,
  iWe,
  F0,
  pluginHooksRefusalReason,
  describeHooksModulesTurnedOff,
  ZP,
  oWe,
  getHookPolicyAnswerState,
  remoteSettingsAnswerState,
  sWe,
  assertPluginHooksAdmitted,
  Ome,
  h$t,
  tWe,
  waitForCloudModsHold,
};
