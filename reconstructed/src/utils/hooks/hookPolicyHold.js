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
import {
  organizationAnswerState,
  ORGANIZATION_ANSWER_TIMEOUT_MS,
  ORGANIZATION_ANSWER_POLL_MS,
  askOrganizationOnce,
} from "../plugins/commandSource.js";
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
import { marketplaceNameAnswerState } from "../plugins/marketplaceNames.js";
import { logForDebugging } from "../debug.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { describeHooksModulesOffReason, isAutoModeGateOpen } from "../plugins/hooksModulesRollout.js";
import { isBuiltinPluginId, getBuiltinPluginNames } from "../../plugins/builtinPlugins.js";
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
import { hasHelperPassInFlight } from "../settings/policyHelper/helperRemote.js";
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
var isHookPolicyHoldActive = () =>
  isHookPolicyUnanswered() || getManagedHooksHoldState("PreToolUse").isFaulted;
//@ chunk-e6aww6q8.js:753108-753406 placement
/**
 * 等待组织托管设置对钩子策略给出答复（有上限时间，可被中止）；超时则标记等待预算已用尽，之后不再等待。
 */
function waitForOrganizationHookPolicy(e, n) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  if (organizationAsk.isBoundSpent) return Promise.resolve();
  let s = Promise.resolve()
    .then(() => organizationAnswerState.wait?.())
    .catch(logError)
    .then(() => {
      organizationAsk.isBoundSpent = false;
      return true;
    });
  let h = e === undefined ? s : raceWithAbortSignal(s, e, () => Error("stopped")).catch(() => true);
  return withDeadline(h, ORGANIZATION_ANSWER_TIMEOUT_MS, n).then((y) => {
    if (y === undefined) organizationAsk.isBoundSpent = true;
  });
}
//@ chunk-e6aww6q8.js:753406-753540 placement
function maybeWaitForHookPolicy(e, n, signal, s) {
  try {
    if (!GUARD_AND_FEEDBACK_EVENTS.has(e) || !isHookPolicyUnanswered()) return;
  } catch (error) {
    logError(error);
    return;
  }
  let h = true;
  try {
    h = n();
  } catch (error) {
    logError(error);
  }
  return h ? waitForOrganizationHookPolicy(signal, s) : undefined;
}
//@ chunk-e6aww6q8.js:753540-753555 placement
var DENY = "deny";
//@ chunk-e6aww6q8.js:753555-753779 placement
async function holdToolCallForHookPolicy(e, n, r, s) {
  let h = false;
  try {
    h = isHookPolicyHoldActive();
    if (!(h && e())) return;
    await waitForOrganizationHookPolicy(r, s);
    h = isHookPolicyHoldActive();
  } catch (error) {
    logError(error);
  }
  if (!h) return;
  let y = true;
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
function isBypassPermissionsInEffect(toolByName, toolPermissionContext, mode) {
  let s = mode === "bypassPermissions";
  if (toolPermissionContext === undefined) return s;
  let h = isAutoAllowedInMode(toolByName, toolPermissionContext);
  return (
    (s && toolPermissionContext.mode !== "bypassPermissions") ||
    h === "bypassPermissions" ||
    isPlanBypass(h, toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-e6aww6q8.js:753972-754088 placement
function withHeldPermissionBehavior(e, n) {
  if (e === undefined) return;
  let r = true;
  try {
    r = n();
  } catch (error) {
    logError(error);
  }
  return {
    ...e,
    permissionBehavior: r ? DENY : "ask",
  };
}
//@ chunk-e6aww6q8.js:754088-754359 placement
/**
 * 生成"钩子因托管设置未就绪/不可读而未运行"的说明，附上受影响的钩子事件（插件钩子带插件 id）列表。
 */
function hooksNotRunningMessage() {
  let e = HOOKS_POLICY_UNREADABLE_MESSAGE;
  try {
    e =
      organizationAnswerState.fetches?.() === true
        ? HOOKS_PENDING_POLICY_MESSAGE
        : HOOKS_POLICY_UNREADABLE_MESSAGE;
    let flattened = HOOK_EVENTS.flatMap((y) =>
      filterHooksByManagedHold([...getHooksForEvent(y)], y, "only").map((S) =>
        "pluginId" in S ? `${y} (plugin ${S.pluginId})` : y,
      ),
    );
    let joined = uniq(flattened).toSorted().join(", ");
    return flattened.length > 0 ? `${e} Hooks not running: ${joined}.` : e;
  } catch (error) {
    logError(error);
    return e;
  }
}
//@ chunk-e6aww6q8.js:754359-754458 placement = createMemoryFileCanUseTool (0.484)
/**
 * 只允许 Edit 指定记忆文件的 canUseTool（会话记忆更新代理用）。
 */
function createMemoryFileCanUseTool() {
  try {
    return HOOK_EVENTS.some((e) => filterHooksByManagedHold([...getHooksForEvent(e)], e, "only").length > 0);
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:754458-755329 placement
function waitForCloudModsHold(reload, tell, r) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  let h = marketplaceNameAnswerState();
  let isHeld = organizationAsk.isHeld;
  let S = h === "unanswered";
  let w = isHeld || (S && (organizationAsk.hasHeld || createMemoryFileCanUseTool()));
  if (!S) organizationAsk.hasHeld = false;
  if (!w) return null;
  function L() {
    return marketplaceNameAnswerState() !== "unanswered" ? reload().catch(logError) : undefined;
  }
  if (h !== "unanswered") return withDeadline(Promise.resolve(L()), ORGANIZATION_ANSWER_POLL_MS, r);
  let G = false;
  let isWaited = organizationAsk.isWaited;
  function Z() {
    let we = marketplaceNameAnswerState() !== "unanswered";
    if (organizationAsk.isTold || (we && !isWaited)) return;
    let Ae = we ? HOOKS_SKIPPED_AT_START_MESSAGE : hooksNotRunningMessage();
    logForDebugging(Ae, {
      level: "warn",
    });
    tell(Ae);
    organizationAsk.isTold = true;
  }
  function Se() {
    G = true;
    try {
      if (isWaited) Z();
    } catch (error) {
      logError(error);
    }
    return askOrganizationOnce();
  }
  let ke = Promise.resolve()
    .then(() => organizationAnswerState.wait?.())
    .then(Se, (error) => {
      logError(error);
      return Se();
    })
    .catch(logError)
    .then(Z)
    .catch(logError);
  if (organizationAsk.isWaited) return null;
  organizationAsk.isWaited = true;
  return withDeadline(ke.then(L), ORGANIZATION_ANSWER_POLL_MS, r)
    .then(() => {
      let we = marketplaceNameAnswerState();
      isWaited = we === "unanswered";
      if (isHeld && we === "answered") logFeatureOk("cowork_cloud_mods_hold");
      if (isHeld && we !== "answered") {
        let Ee = organizationAnswerState.fetches?.() === true;
        logFeatureSad("cowork_cloud_mods_hold", Ee ? "settings_unread" : "never_asks");
      }
      if (isWaited && G) Z();
    })
    .catch(logError);
}
//@ chunk-e6aww6q8.js:755329-755700 placement
/**
 * 等待组织托管 hook 策略回答后再运行启动 hook，并记录等待时长。
 */
function waitForStartHooksPolicy(e) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  let now = Date.now();
  function s() {
    let h = isHookPolicyUnanswered();
    logForDebugging(
      `start hooks waited ${Date.now() - now} ms for the organization's managed settings` +
        (h ? `; ${SESSION_START_HOOKS_SKIPPED_REASON}` : ""),
      h
        ? {
            level: "warn",
          }
        : undefined,
    );
    return h
      ? logFeatureSad("hooks_organization_start_wait", "unanswered")
      : logFeatureOk("hooks_organization_start_wait");
  }
  organizationAsk.startHooksWait ??= waitForOrganizationHookPolicy(undefined, e).then(s).catch(logError);
  return organizationAsk.startHooksWait;
}
//@ chunk-e6aww6q8.js:755700-755779 placement
/**
 * 钩子策略未答复且有已配置钩子时，等待组织托管设置答复（有上限）。
 */
var waitForStartHooksPolicyIfNeeded = (e, n) =>
  Promise.resolve()
    .then(() =>
      isHookPolicyUnanswered() && hasConfiguredHooksForEvent(e) ? waitForStartHooksPolicy(n) : undefined,
    )
    .catch(logError);
//@ chunk-e6aww6q8.js:755779-756371 placement
/**
 * 在 hook 结果中找出最后一个给出阻止或权限决定的结果。
 */
function reconcileHeldHookResults(e, results) {
  if (e === undefined) return;
  let last = results.findLast(
    (result) =>
      result.blockingError !== undefined ||
      result.permissionBehavior === "allow" ||
      result.permissionBehavior === "ask" ||
      result.permissionBehavior === "deny",
  );
  let s = last?.blockingError !== undefined || last?.permissionBehavior === "deny";
  let h = last?.permissionBehavior === "ask" && e.permissionBehavior === "ask";
  if (s || h) return;
  logForDebugging(
    "a hook ahead of this tool call is held for the organization's managed settings: the call " +
      (e.permissionBehavior === "deny" ? "is refused" : "asks"),
    {
      level: "warn",
    },
  );
  let updatedInput = (results.findLast((result) => result.permissionBehavior === "ask") ?? last)
    ?.updatedInput;
  return updatedInput === undefined
    ? e
    : {
        ...e,
        updatedInput,
      };
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
  return n.organization === "unanswered" ? MODS_POLICY_UNKNOWN_REASON : undefined;
}
//@ chunk-e6aww6q8.js:757137-757259 placement
function pluginHooksRefusalReason(e, n, r) {
  return isBuiltinPluginId(e)
    ? undefined
    : n.isHeld
      ? RESTRICT_PERSONAL_CONFIG_REASON
      : describeHooksModulesTurnedOff(n.isManaged, {
          ...r,
          personsHeld: r.personsHeld && !n.isPolicyEnabled,
        });
}
//@ chunk-e6aww6q8.js:757259-757319 placement
/**
 * 判断是否只允许内建插件的钩子模块（受限模式且等待已结束）。
 */
var areBuiltinOnlyHooksModules = (e) =>
  !areHooksModulesAllowed() || (isAutoModeGateOpen() && e.hooksModulesWakeBound === "ahead");
//@ chunk-e6aww6q8.js:757319-757412 placement
/**
 * 汇总钩子策略状态（总开关、仅托管、全禁用、组织答复状态）。
 */
var hookPolicySummaryState = () => ({
  hooksDisabled: isCustomizationDisabled("hooks"),
  managedOnly: shouldAllowManagedHooksOnly(),
  allDisabled: shouldDisableAllHooksIncludingManaged(),
  organization: marketplaceNameAnswerState(),
});
//@ chunk-e6aww6q8.js:757412-757468 placement
function isCoworkSessionSafe() {
  try {
    return isCoworkSession();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:757468-757536 placement
var isRemoteSettingsAnswered = (lastLoadStatus) =>
  lastLoadStatus?.state === "ok" &&
  (!lastLoadStatus.hasSettings ||
    isRemoteManagedSettingsVerified() ||
    getRemoteSettingsPathOverride() !== undefined);
//@ chunk-e6aww6q8.js:757536-757728 placement
function remoteSettingsAnswerState() {
  let lastLoadStatus = getLastLoadStatus();
  let n = isRemoteSettingsAnswered(lastLoadStatus);
  let r = lastLoadStatus === undefined && (hasLoadCycleEnded() || !hasLoadCycleBegun());
  let s = lastLoadStatus?.state === "failed" || lastLoadStatus?.state === "stale_cache" || r;
  let h = getEligibilityMemo() === false || isCoworkSessionSafe() || n;
  return hasHelperPassInFlight() || !(h || s) ? "pending" : h ? "answered" : "failed";
}
//@ chunk-e6aww6q8.js:757728-757853 placement
function getHookPolicyAnswerState() {
  try {
    let e = remoteSettingsAnswerState();
    let n = !policySettingsUnreadable();
    let r = e !== "pending" && AUTO_MODE_ENABLED_DEFAULT();
    return n ? e : r ? "failed" : "pending";
  } catch (error) {
    logError(error);
    return "pending";
  }
}
//@ chunk-e6aww6q8.js:757853-757941 placement
/**
 * 判断个人安装的钩子模块是否需要暂扣等待 rollout 开关。
 */
var shouldHoldPersonalModuleHooks = (e) =>
  e.hooksModulesWakeBound !== "ahead" &&
  isAutoModeGateOpen() &&
  areHooksModulesAllowed() &&
  !(AUTO_MODE_ENABLED_DEFAULT() && getHookPolicyAnswerState() === "answered");
//@ chunk-e6aww6q8.js:757941-758119 placement
/**
 * 从托管来源集合中筛出与给定来源列表匹配的部分。
 */
function filterManagedHookSources(policyAllowedSet, n) {
  if (policyAllowedSet === null) return null;
  let r = new Set([...policyAllowedSet].filter((s) => !isBuiltinPluginId(s)).map(nfcLower));
  return new Set(
    n.filter((s) => policyAllowedSet.has(s.source) || r.has(nfcLower(s.source))).map((s) => s.source),
  );
}
//@ chunk-e6aww6q8.js:758119-758216 placement
/**
 * 判断某插件名是否为内建插件的别名。
 */
var isBuiltinPluginAlias = (e) =>
  getBuiltinPluginNames()
    .flatMap((n) =>
      pluginNameAliases({
        name: n,
        source: `${n}@${BUILTIN}`,
      }),
    )
    .some((n) => nfcLower(n) === nfcLower(e.name));
//@ chunk-e6aww6q8.js:758216-758297 placement
/**
 * 判断某插件是否为已担保的托管插件（名称与来源一致且非内建别名）。
 */
var isManagedPluginVouched = (e) =>
  resolveManagedPluginDigests(e.source) !== undefined &&
  nfcLower(e.name) === nfcLower(parsePluginIdentifier(e.source).name) &&
  !isBuiltinPluginAlias(e);
//@ chunk-e6aww6q8.js:758297-758562 placement
/**
 * 给出插件钩子模块不可运行的原因（未知/个人受限/策略限制等）。
 */
function hooksModuleRefusalReason(e, n) {
  if (isBuiltinPluginId(e) || getManagedPlugins() || hooksModulesRefusalReason() !== undefined) return;
  let s = [
    {
      source: e,
    },
  ];
  let pluginRegistry = getPluginRegistry();
  return pluginHooksRefusalReason(
    e,
    {
      isHeld: n === undefined ? isPersonalConfigRestricted() : arePluginHooksHeld(n),
      isManaged:
        filterManagedHookSources(getVouchedPolicyPluginIds(), s)?.size === 1 ||
        (n !== undefined && isManagedPluginVouched(n)),
      isPolicyEnabled: filterManagedHookSources(getPolicyAllowedSet(), s)?.size === 1,
    },
    {
      ...hookPolicySummaryState(),
      builtinsOnly: areBuiltinOnlyHooksModules(pluginRegistry),
      personsHeld: shouldHoldPersonalModuleHooks(pluginRegistry),
    },
  );
}
//@ chunk-e6aww6q8.js:758562-758786 placement
function assertPluginHooksAdmitted(e, n) {
  if (e.knownArgs.get(n.pluginName)?.sealed === true)
    throw new NotOrganizationPluginError(
      n.pluginName,
      "a proved module of this name may not come back from disk",
    );
  let s = hooksModuleRefusalReason(n.pluginId, n.plugin);
  if (s !== undefined) throw new HookAdmissionRefusal(n.pluginName, s);
}
export {
  waitForOrganizationHookPolicy,
  DENY,
  isBypassPermissionsInEffect,
  holdToolCallForHookPolicy,
  reconcileHeldHookResults,
  withHeldPermissionBehavior,
  maybeWaitForHookPolicy,
  isManagedPluginVouched,
  filterManagedHookSources,
  pluginHooksRefusalReason,
  describeHooksModulesTurnedOff,
  hookPolicySummaryState,
  areBuiltinOnlyHooksModules,
  getHookPolicyAnswerState,
  remoteSettingsAnswerState,
  shouldHoldPersonalModuleHooks,
  assertPluginHooksAdmitted,
  isBuiltinPluginAlias,
  hooksModuleRefusalReason,
  waitForStartHooksPolicyIfNeeded,
  waitForCloudModsHold,
};
