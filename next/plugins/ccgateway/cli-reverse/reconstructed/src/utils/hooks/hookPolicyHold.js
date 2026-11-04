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
function waitForOrganizationHookPolicy(signal, timeoutMs) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  if (organizationAsk.isBoundSpent) return Promise.resolve();
  let answer = Promise.resolve()
    .then(() => organizationAnswerState.wait?.())
    .catch(logError)
    .then(() => {
      organizationAsk.isBoundSpent = false;
      return true;
    });
  let waited =
    signal === undefined
      ? answer
      : raceWithAbortSignal(answer, signal, () => Error("stopped")).catch(() => true);
  return withDeadline(waited, ORGANIZATION_ANSWER_TIMEOUT_MS, timeoutMs).then((outcome) => {
    if (outcome === undefined) organizationAsk.isBoundSpent = true;
  });
}
//@ chunk-e6aww6q8.js:753406-753540 placement
function maybeWaitForHookPolicy(hookEvent, wanted, signal, timeoutMs) {
  try {
    if (!GUARD_AND_FEEDBACK_EVENTS.has(hookEvent) || !isHookPolicyUnanswered()) return;
  } catch (error) {
    logError(error);
    return;
  }
  let proceed = true;
  try {
    proceed = wanted();
  } catch (error) {
    logError(error);
  }
  return proceed ? waitForOrganizationHookPolicy(signal, timeoutMs) : undefined;
}
//@ chunk-e6aww6q8.js:753540-753555 placement
var DENY = "deny";
//@ chunk-e6aww6q8.js:753555-753779 placement
async function holdToolCallForHookPolicy(eventApplies, denyWanted, signal, timeoutMs) {
  let holding = false;
  try {
    holding = isHookPolicyHoldActive();
    if (!(holding && eventApplies())) return;
    await waitForOrganizationHookPolicy(signal, timeoutMs);
    holding = isHookPolicyHoldActive();
  } catch (error) {
    logError(error);
  }
  if (!holding) return;
  let deny = true;
  try {
    deny = denyWanted();
  } catch (error) {
    logError(error);
  }
  return {
    permissionBehavior: deny ? DENY : "ask",
    hookPermissionDecisionReason: HOOK_CHECK_UNAVAILABLE_MESSAGE,
  };
}
//@ chunk-e6aww6q8.js:753779-753972 placement
function isBypassPermissionsInEffect(toolByName, toolPermissionContext, mode) {
  let isBypass = mode === "bypassPermissions";
  if (toolPermissionContext === undefined) return isBypass;
  let autoMode = isAutoAllowedInMode(toolByName, toolPermissionContext);
  return (
    (isBypass && toolPermissionContext.mode !== "bypassPermissions") ||
    autoMode === "bypassPermissions" ||
    isPlanBypass(autoMode, toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-e6aww6q8.js:753972-754088 placement
function withHeldPermissionBehavior(result, denyWanted) {
  if (result === undefined) return;
  let deny = true;
  try {
    deny = denyWanted();
  } catch (error) {
    logError(error);
  }
  return {
    ...result,
    permissionBehavior: deny ? DENY : "ask",
  };
}
//@ chunk-e6aww6q8.js:754088-754359 placement
/**
 * 生成"钩子因托管设置未就绪/不可读而未运行"的说明，附上受影响的钩子事件（插件钩子带插件 id）列表。
 */
function hooksNotRunningMessage() {
  let message = HOOKS_POLICY_UNREADABLE_MESSAGE;
  try {
    message =
      organizationAnswerState.fetches?.() === true
        ? HOOKS_PENDING_POLICY_MESSAGE
        : HOOKS_POLICY_UNREADABLE_MESSAGE;
    let flattened = HOOK_EVENTS.flatMap((event) =>
      filterHooksByManagedHold([...getHooksForEvent(event)], event, "only").map((matcher) =>
        "pluginId" in matcher ? `${event} (plugin ${matcher.pluginId})` : event,
      ),
    );
    let joined = uniq(flattened).toSorted().join(", ");
    return flattened.length > 0 ? `${message} Hooks not running: ${joined}.` : message;
  } catch (error) {
    logError(error);
    return message;
  }
}
//@ chunk-e6aww6q8.js:754359-754458 placement = createMemoryFileCanUseTool (0.484)
/**
 * 只允许 Edit 指定记忆文件的 canUseTool（会话记忆更新代理用）。
 */
function createMemoryFileCanUseTool() {
  try {
    return HOOK_EVENTS.some(
      (event) => filterHooksByManagedHold([...getHooksForEvent(event)], event, "only").length > 0,
    );
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:754458-755329 placement
function waitForCloudModsHold(reload, tell, timeoutMs) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  let answerState = marketplaceNameAnswerState();
  let isHeld = organizationAsk.isHeld;
  let unanswered = answerState === "unanswered";
  let held = isHeld || (unanswered && (organizationAsk.hasHeld || createMemoryFileCanUseTool()));
  if (!unanswered) organizationAsk.hasHeld = false;
  if (!held) return null;
  function reloadAfterAnswer() {
    return marketplaceNameAnswerState() !== "unanswered" ? reload().catch(logError) : undefined;
  }
  if (answerState !== "unanswered")
    return withDeadline(Promise.resolve(reloadAfterAnswer()), ORGANIZATION_ANSWER_POLL_MS, timeoutMs);
  let waitedOnAnswer = false;
  let isWaited = organizationAsk.isWaited;
  function tellIfTold() {
    let answered = marketplaceNameAnswerState() !== "unanswered";
    if (organizationAsk.isTold || (answered && !isWaited)) return;
    let message = answered ? HOOKS_SKIPPED_AT_START_MESSAGE : hooksNotRunningMessage();
    logForDebugging(message, {
      level: "warn",
    });
    tell(message);
    organizationAsk.isTold = true;
  }
  function afterAnswer() {
    waitedOnAnswer = true;
    try {
      if (isWaited) tellIfTold();
    } catch (error) {
      logError(error);
    }
    return askOrganizationOnce();
  }
  let waitChain = Promise.resolve()
    .then(() => organizationAnswerState.wait?.())
    .then(afterAnswer, (error) => {
      logError(error);
      return afterAnswer();
    })
    .catch(logError)
    .then(tellIfTold)
    .catch(logError);
  if (organizationAsk.isWaited) return null;
  organizationAsk.isWaited = true;
  return withDeadline(waitChain.then(reloadAfterAnswer), ORGANIZATION_ANSWER_POLL_MS, timeoutMs)
    .then(() => {
      let state = marketplaceNameAnswerState();
      isWaited = state === "unanswered";
      if (isHeld && state === "answered") logFeatureOk("cowork_cloud_mods_hold");
      if (isHeld && state !== "answered") {
        let settingsUnread = organizationAnswerState.fetches?.() === true;
        logFeatureSad("cowork_cloud_mods_hold", settingsUnread ? "settings_unread" : "never_asks");
      }
      if (isWaited && waitedOnAnswer) tellIfTold();
    })
    .catch(logError);
}
//@ chunk-e6aww6q8.js:755329-755700 placement
/**
 * 等待组织托管 hook 策略回答后再运行启动 hook，并记录等待时长。
 */
function waitForStartHooksPolicy(signal) {
  let organizationAsk = getPluginRegistry().organizationAsk;
  let now = Date.now();
  function finish() {
    let unanswered = isHookPolicyUnanswered();
    logForDebugging(
      `start hooks waited ${Date.now() - now} ms for the organization's managed settings` +
        (unanswered ? `; ${SESSION_START_HOOKS_SKIPPED_REASON}` : ""),
      unanswered
        ? {
            level: "warn",
          }
        : undefined,
    );
    return unanswered
      ? logFeatureSad("hooks_organization_start_wait", "unanswered")
      : logFeatureOk("hooks_organization_start_wait");
  }
  organizationAsk.startHooksWait ??= waitForOrganizationHookPolicy(undefined, signal)
    .then(finish)
    .catch(logError);
  return organizationAsk.startHooksWait;
}
//@ chunk-e6aww6q8.js:755700-755779 placement
/**
 * 钩子策略未答复且有已配置钩子时，等待组织托管设置答复（有上限）。
 */
var waitForStartHooksPolicyIfNeeded = (hookEvent, signal) =>
  Promise.resolve()
    .then(() =>
      isHookPolicyUnanswered() && hasConfiguredHooksForEvent(hookEvent)
        ? waitForStartHooksPolicy(signal)
        : undefined,
    )
    .catch(logError);
//@ chunk-e6aww6q8.js:755779-756371 placement
/**
 * 在 hook 结果中找出最后一个给出阻止或权限决定的结果。
 */
function reconcileHeldHookResults(held, results) {
  if (held === undefined) return;
  let last = results.findLast(
    (result) =>
      result.blockingError !== undefined ||
      result.permissionBehavior === "allow" ||
      result.permissionBehavior === "ask" ||
      result.permissionBehavior === "deny",
  );
  let decisive = last?.blockingError !== undefined || last?.permissionBehavior === "deny";
  let bothAsk = last?.permissionBehavior === "ask" && held.permissionBehavior === "ask";
  if (decisive || bothAsk) return;
  logForDebugging(
    "a hook ahead of this tool call is held for the organization's managed settings: the call " +
      (held.permissionBehavior === "deny" ? "is refused" : "asks"),
    {
      level: "warn",
    },
  );
  let updatedInput = (results.findLast((result) => result.permissionBehavior === "ask") ?? last)
    ?.updatedInput;
  return updatedInput === undefined
    ? held
    : {
        ...held,
        updatedInput,
      };
}
//@ chunk-e6aww6q8.js:756371-757137 placement
function describeHooksModulesTurnedOff(isManaged, state) {
  if (state.builtinsOnly)
    return `hooks modules are turned off for installed plugins in this process: ${describeHooksModulesOffReason()}; built-in plugins load regardless`;
  if (state.allDisabled)
    return "disableAllHooks in managed settings, which governs installed plugins; built-in plugins load regardless";
  if (isManaged) return;
  if (state.personsHeld)
    return `hooks modules a person installed wait for the rollout switch in this process: ${describeHooksModulesOffReason()}; an organization's and built-in plugins load regardless`;
  if (state.hooksDisabled)
    return "installed plugins that are not managed load no hooks module in this mode (--bare); built-in plugins load regardless";
  if (state.managedOnly)
    return "only managed plugins and built-in plugins run (allowManagedHooksOnly / disableAllHooks)";
  return state.organization === "unanswered" ? MODS_POLICY_UNKNOWN_REASON : undefined;
}
//@ chunk-e6aww6q8.js:757137-757259 placement
function pluginHooksRefusalReason(pluginId, held, state) {
  return isBuiltinPluginId(pluginId)
    ? undefined
    : held.isHeld
      ? RESTRICT_PERSONAL_CONFIG_REASON
      : describeHooksModulesTurnedOff(held.isManaged, {
          ...state,
          personsHeld: state.personsHeld && !held.isPolicyEnabled,
        });
}
//@ chunk-e6aww6q8.js:757259-757319 placement
/**
 * 判断是否只允许内建插件的钩子模块（受限模式且等待已结束）。
 */
var areBuiltinOnlyHooksModules = (registry) =>
  !areHooksModulesAllowed() || (isAutoModeGateOpen() && registry.hooksModulesWakeBound === "ahead");
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
  let answered = isRemoteSettingsAnswered(lastLoadStatus);
  let noCycle = lastLoadStatus === undefined && (hasLoadCycleEnded() || !hasLoadCycleBegun());
  let failed = lastLoadStatus?.state === "failed" || lastLoadStatus?.state === "stale_cache" || noCycle;
  let ok = getEligibilityMemo() === false || isCoworkSessionSafe() || answered;
  return hasHelperPassInFlight() || !(ok || failed) ? "pending" : ok ? "answered" : "failed";
}
//@ chunk-e6aww6q8.js:757728-757853 placement
function getHookPolicyAnswerState() {
  try {
    let settingsState = remoteSettingsAnswerState();
    let readable = !policySettingsUnreadable();
    let autoModeOn = settingsState !== "pending" && AUTO_MODE_ENABLED_DEFAULT();
    return readable ? settingsState : autoModeOn ? "failed" : "pending";
  } catch (error) {
    logError(error);
    return "pending";
  }
}
//@ chunk-e6aww6q8.js:757853-757941 placement
/**
 * 判断个人安装的钩子模块是否需要暂扣等待 rollout 开关。
 */
var shouldHoldPersonalModuleHooks = (registry) =>
  registry.hooksModulesWakeBound !== "ahead" &&
  isAutoModeGateOpen() &&
  areHooksModulesAllowed() &&
  !(AUTO_MODE_ENABLED_DEFAULT() && getHookPolicyAnswerState() === "answered");
//@ chunk-e6aww6q8.js:757941-758119 placement
/**
 * 从托管来源集合中筛出与给定来源列表匹配的部分。
 */
function filterManagedHookSources(policyAllowedSet, sources) {
  if (policyAllowedSet === null) return null;
  let nonBuiltin = new Set(
    [...policyAllowedSet].filter((source) => !isBuiltinPluginId(source)).map(nfcLower),
  );
  return new Set(
    sources
      .filter((source) => policyAllowedSet.has(source.source) || nonBuiltin.has(nfcLower(source.source)))
      .map((source) => source.source),
  );
}
//@ chunk-e6aww6q8.js:758119-758216 placement
/**
 * 判断某插件名是否为内建插件的别名。
 */
var isBuiltinPluginAlias = (plugin) =>
  getBuiltinPluginNames()
    .flatMap((name) =>
      pluginNameAliases({
        name,
        source: `${name}@${BUILTIN}`,
      }),
    )
    .some((alias) => nfcLower(alias) === nfcLower(plugin.name));
//@ chunk-e6aww6q8.js:758216-758297 placement
/**
 * 判断某插件是否为已担保的托管插件（名称与来源一致且非内建别名）。
 */
var isManagedPluginVouched = (plugin) =>
  resolveManagedPluginDigests(plugin.source) !== undefined &&
  nfcLower(plugin.name) === nfcLower(parsePluginIdentifier(plugin.source).name) &&
  !isBuiltinPluginAlias(plugin);
//@ chunk-e6aww6q8.js:758297-758562 placement
/**
 * 给出插件钩子模块不可运行的原因（未知/个人受限/策略限制等）。
 */
function hooksModuleRefusalReason(pluginId, plugin) {
  if (isBuiltinPluginId(pluginId) || getManagedPlugins() || hooksModulesRefusalReason() !== undefined) return;
  let plugins = [
    {
      source: pluginId,
    },
  ];
  let registry = getPluginRegistry();
  return pluginHooksRefusalReason(
    pluginId,
    {
      isHeld: plugin === undefined ? isPersonalConfigRestricted() : arePluginHooksHeld(plugin),
      isManaged:
        filterManagedHookSources(getVouchedPolicyPluginIds(), plugins)?.size === 1 ||
        (plugin !== undefined && isManagedPluginVouched(plugin)),
      isPolicyEnabled: filterManagedHookSources(getPolicyAllowedSet(), plugins)?.size === 1,
    },
    {
      ...hookPolicySummaryState(),
      builtinsOnly: areBuiltinOnlyHooksModules(registry),
      personsHeld: shouldHoldPersonalModuleHooks(registry),
    },
  );
}
//@ chunk-e6aww6q8.js:758562-758786 placement
function assertPluginHooksAdmitted(state, plugin) {
  if (state.knownArgs.get(plugin.pluginName)?.sealed === true)
    throw new NotOrganizationPluginError(
      plugin.pluginName,
      "a proved module of this name may not come back from disk",
    );
  let reason = hooksModuleRefusalReason(plugin.pluginId, plugin.plugin);
  if (reason !== undefined) throw new HookAdmissionRefusal(plugin.pluginName, reason);
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
