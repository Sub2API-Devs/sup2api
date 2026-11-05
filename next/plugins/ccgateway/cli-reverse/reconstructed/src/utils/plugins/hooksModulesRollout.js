/**
 * utils/plugins/hooksModulesRollout.ts
 *
 * 2.1.316 新增。组织 hooks 模块 rollout。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v7jmb7se.js (49)
 * attribution: placement 48, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  hasGrowthBookInitializeStarted,
  defaultFeatureFlagClientSlots,
  hasFreshGrowthBookFeatures,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  PLUGIN_HOOKS_MODULES_GATE,
  isGrowthBookEnabled,
  isGrowthBookInitializeInFlight,
  isServedFeatureSource,
  initializeGrowthBook,
  hasWorkspaceTrust,
  refreshGrowthBookFeatures,
  onGrowthBookRefresh,
} from "../../services/analytics/growthbook.js";
import { isPendingNotOver } from "../toolErrors.js";
import { getRootSession, getIsNonInteractiveSession } from "../../bootstrap/state.js";
import {
  HOOKS_MODULES_DEFAULT,
  hasFeatureFlagCredential,
  areHooksModulesAllowed,
  hooksModulesFollowState,
  checkHooksModulesFlag,
} from "../../services/analytics/growthbookCredentials.js";
import { logError } from "../log.js";
import {
  isRemoteNonInteractiveSession,
  GROWTHBOOK_FLAG_WAIT_MS,
  EVENT_LOGGING_FLAG_WAIT_MS,
  waitForInitialize,
} from "../startupFlagWait.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { logForDebugging } from "../debug.js";
import { withTimeout, withDeadline } from "../sleep.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { errorMessage } from "../errors.js";
import { env } from "../env.js";
import { getFlagFetchWaitedMs } from "../startupTiming.js";
import { PROVIDER_ENV_FLAGS } from "../model/modelIds.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-v7jmb7se.js:860-885 placement
var growthBookNotStartedOrPending = (hold) => hasGrowthBookInitializeStarted() || isPendingNotOver(hold);
//@ chunk-v7jmb7se.js:885-913 placement
/**
 * pendingWithoutStart：仍待定且 GrowthBook 尚未开始。
 */
var pendingWithoutStart = (hold) => isPendingNotOver(hold) && !hasGrowthBookInitializeStarted();
//@ chunk-v7jmb7se.js:913-942 placement
var isHeldOrPending = (hold) => hold.hasHeld || pendingWithoutStart(hold);
//@ chunk-v7jmb7se.js:942-975 placement
/**
 * fetchHoldForHost：某宿主的取回保持承诺。
 */
var fetchHoldForHost = (host) => defaultFeatureFlagClientSlots.of(host).fetchHold;
//@ chunk-v7jmb7se.js:975-1011 placement
/**
 * currentFetchHold：当前宿主的取回保持。
 */
function currentFetchHold() {
  return fetchHoldForHost(getRootSession().host);
}
//@ chunk-v7jmb7se.js:1011-1086 placement
var shouldWaitOnFallbackSource = () =>
  (getIsNonInteractiveSession() || isHeldOrPending(currentFetchHold())) &&
  growthBookNotStartedOrPending(currentFetchHold()) &&
  !hasFreshGrowthBookFeatures() &&
  getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source ===
    "fallback";
//@ chunk-v7jmb7se.js:1086-1137 placement
/**
 * isDiskSourceWithCredential：开关来源为 disk 且有凭据。
 */
var isDiskSourceWithCredential = () =>
  isGrowthBookEnabled() &&
  getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source ===
    "disk" &&
  hasFeatureFlagCredential();
//@ chunk-v7jmb7se.js:1137-1169 placement
var needsReloadWhenAllowed = () =>
  isHeldOrPending(currentFetchHold()) && isDiskSourceWithCredential() && areHooksModulesAllowed();
//@ chunk-v7jmb7se.js:1169-1202 placement
var needsReloadWhileDisallowed = () =>
  growthBookNotStartedOrPending(currentFetchHold()) &&
  isDiskSourceWithCredential() &&
  !areHooksModulesAllowed();
//@ chunk-v7jmb7se.js:1202-1223 placement
var needsGrowthBookRefresh = () => needsReloadWhileDisallowed() && isGrowthBookInitializeInFlight();
//@ chunk-v7jmb7se.js:1223-1256 placement
/**
 * isServedGateSource：开关来源为服务端下发。
 */
var isServedGateSource = () =>
  isServedFeatureSource(
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source,
  );
//@ chunk-v7jmb7se.js:1256-1337 layout
/**
 * auto 模式 enabled 状态的来源是否为 disabled（读取失败记错误并返回 false）。
 */
function isHooksModulesGateDisabled() {
  try {
    return (
      getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT)
        .source === "disabled"
    );
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-v7jmb7se.js:1337-1377 placement
/**
 * isAutoModeGateOpen：auto 模式闸门可等。
 */
var isAutoModeGateOpen = () =>
  isRemoteNonInteractiveSession() &&
  isRemoteManagedEnvironment() &&
  (!isServedGateSource() || isHooksModulesGateDisabled());
//@ chunk-v7jmb7se.js:1377-1410 placement
/**
 * markFollowConsumed：标记已跟随。
 */
function markFollowConsumed() {
  hooksModulesFollowState.isFollowed = true;
}
//@ chunk-v7jmb7se.js:1410-1678 placement
/**
 * rollout 开关在本次唤醒等待内未答复时把 wakeBound 从 ahead 改为 passed。
 */
function markWakeBoundPassed() {
  let pluginRegistry = getPluginRegistry();
  if (isAutoModeGateOpen() && pluginRegistry.hooksModulesWakeBound === "ahead") {
    pluginRegistry.hooksModulesWakeBound = "passed";
    logForDebugging(
      `the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) is not answered within this wake's wait: the organization's hooks modules load at what the switch reads, a person's wait for the answer`,
    );
  }
}
//@ chunk-v7jmb7se.js:1678-1690 placement
var ROLLOUT_FOLLOW_TIMEOUT_MS = 60000;
//@ chunk-v7jmb7se.js:1690-1838 placement
var MODS_ORG_SETTINGS_UNREADABLE_MESSAGE =
  "Mods you installed aren't running in this session. Your organization's settings couldn't be read, so it isn't known whether it allows them.";
//@ chunk-v7jmb7se.js:1838-1907 placement
var ROLLOUT_FOLLOW_TIMEOUT_MESSAGE = "the follow of the rollout switch did not end and is given up";
//@ chunk-v7jmb7se.js:1907-1986 placement
function classifyFollowFailure(error) {
  return error instanceof Error && error.message === ROLLOUT_FOLLOW_TIMEOUT_MESSAGE
    ? "timeout"
    : "load_failed";
}
//@ chunk-v7jmb7se.js:1986-2130 placement
var MODS_ROLLOUT_OFF_MESSAGE =
  "installed mods are off for now: the rollout switch for them reads off; they load again when it reads on, and built-in mods keep running";
//@ chunk-v7jmb7se.js:2130-2241 placement
function isHooksModulesSwitchStale() {
  let hooksModulesSwitchRead = getPluginRegistry().hooksModulesSwitchRead;
  return (
    hooksModulesSwitchRead !== undefined &&
    !isDiskSourceWithCredential() &&
    !isAutoModeGateOpen() &&
    (hooksModulesSwitchRead.isLoadOwed || hooksModulesSwitchRead.isOn !== areHooksModulesAllowed())
  );
}
//@ chunk-v7jmb7se.js:2241-2326 placement
function isStaleHooksModulesSwitch() {
  let hooksModulesSwitchRead = getPluginRegistry().hooksModulesSwitchRead;
  return (
    hooksModulesSwitchRead !== undefined &&
    hooksModulesSwitchRead.isOn &&
    isHooksModulesSwitchStale() &&
    !areHooksModulesAllowed()
  );
}
//@ chunk-v7jmb7se.js:2326-3346 placement
function followHooksModulesRollout(reload, tell, standDown) {
  let pluginRegistry = getPluginRegistry();
  let { hooksModulesSwitchRead, hooksModulesSwitchFollowing } = pluginRegistry;
  if (hooksModulesSwitchFollowing !== undefined)
    return hooksModulesSwitchFollowing
      .then(() =>
        isStaleHooksModulesSwitch()
          ? (followHooksModulesRollout(reload, tell, standDown) ?? undefined)
          : undefined,
      )
      .catch(logError);
  if (hooksModulesSwitchRead === undefined || !isHooksModulesSwitchStale()) return null;
  let isOn = areHooksModulesAllowed();
  let moduleCountBefore = pluginRegistry.loadedModules.length;
  logForDebugging(
    `installed plugins' hooks modules ${isOn ? "load" : "unload"}: the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) reads ${isOn ? "on" : "off"} in a running session`,
  );
  let markOff = () => {
    pluginRegistry.hooksModulesSwitchRead = {
      ...(pluginRegistry.hooksModulesSwitchRead ?? hooksModulesSwitchRead),
      isOn: false,
    };
  };
  let loadPass = (isOn ? Promise.resolve() : Promise.resolve().then(standDown).then(markOff, logError)).then(
    reload,
  );
  let markLoadOwed = () => {
    pluginRegistry.hooksModulesSwitchRead = {
      ...(pluginRegistry.hooksModulesSwitchRead ?? hooksModulesSwitchRead),
      isLoadOwed: true,
    };
  };
  loadPass.catch(markLoadOwed);
  let following = withTimeout(loadPass, ROLLOUT_FOLLOW_TIMEOUT_MS, ROLLOUT_FOLLOW_TIMEOUT_MESSAGE)
    .then(
      () => {
        logFeatureOk("plugin_function_hooks_switch_followed", {
          is_turned_on: isOn,
        });
      },
      (error) => {
        markLoadOwed();
        logFeatureBad("plugin_function_hooks_switch_followed", classifyFollowFailure(error), {
          is_turned_on: isOn,
        });
        logForDebugging(
          `installed plugins' hooks modules: the load that follows the rollout flag failed: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      },
    )
    .then(() => {
      if (!isOn && pluginRegistry.loadedModules.length < moduleCountBefore) tell(MODS_ROLLOUT_OFF_MESSAGE);
    })
    .catch(logError)
    .finally(() => {
      pluginRegistry.hooksModulesSwitchFollowing = undefined;
    });
  pluginRegistry.hooksModulesSwitchFollowing = following;
  return following;
}
//@ chunk-v7jmb7se.js:3346-3514 placement
/**
 * 组织 hooks 模块仍待加载（且开关并非由 payload 明确关闭）。
 */
function isOrganizationModsLoadPending() {
  let isPending = getPluginRegistry().hooksModulesSwitchRead?.isManagedPending === true;
  try {
    let payloadOff =
      !areHooksModulesAllowed() &&
      getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT)
        .source === "payload";
    return isPending && isRemoteNonInteractiveSession() && isRemoteManagedEnvironment() && !payloadOff;
  } catch (error) {
    logError(error);
    return isPending;
  }
}
//@ chunk-v7jmb7se.js:3514-4388 placement
function settleHooksModulesWake(reload, tell, standDown) {
  let pluginRegistry = getPluginRegistry();
  if (isHooksModulesGateDisabled()) markWakeBoundPassed();
  let boundTaken = pluginRegistry.hooksModulesWakeBound === "taken";
  let boundPassed = pluginRegistry.hooksModulesWakeBound === "passed" && isAutoModeGateOpen();
  let stillPending =
    !(pluginRegistry.hooksModulesWakeBound === "ahead" && isAutoModeGateOpen()) &&
    isOrganizationModsLoadPending();
  if (!(
    pluginRegistry.hooksModulesSwitchRead !== undefined &&
    pluginRegistry.hooksModulesSwitchFollowing === undefined &&
    (boundPassed || stillPending || boundTaken)
  ))
    return null;
  if (boundTaken && !stillPending) {
    pluginRegistry.hooksModulesWakeBound = "loaded";
    if (pluginRegistry.hooksModulesSwitchRead?.isPersonsOut === true)
      tell(MODS_ORG_SETTINGS_UNREADABLE_MESSAGE);
    return null;
  }
  let loadPass = withTimeout(
    reload(),
    ROLLOUT_FOLLOW_TIMEOUT_MS,
    "the load at the end of the wake's wait did not end and is given up",
  )
    .then(
      () => {
        let hooksModulesSwitchRead = pluginRegistry.hooksModulesSwitchRead;
        let settled = hooksModulesSwitchRead?.isManagedPending !== true;
        if (settled) pluginRegistry.hooksModulesWakeBound = "loaded";
        if (settled && hooksModulesSwitchRead?.isPersonsOut === true)
          tell(MODS_ORG_SETTINGS_UNREADABLE_MESSAGE);
      },
      (error) => {
        logForDebugging(
          `the load of an organization's hooks modules at the end of the wake's wait failed: ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      },
    )
    .finally(() => {
      pluginRegistry.hooksModulesSwitchFollowing = undefined;
    });
  pluginRegistry.hooksModulesSwitchFollowing = loadPass;
  return loadPass
    .then(() =>
      isStaleHooksModulesSwitch()
        ? (followHooksModulesRollout(reload, tell, standDown) ?? undefined)
        : undefined,
    )
    .catch(logError);
}
//@ chunk-v7jmb7se.js:4388-4644 placement
/**
 * 按本次加载结果在 taken/passed 之间切换 wakeBound。
 */
function updateWakeBound(outcome) {
  let { registry } = outcome;
  let isClean = outcome.isSetKnown && outcome.isLoadFaultless && outcome.unmet.length === 0;
  let shouldPass = !isClean && registry.hooksModulesWakeBound === "taken";
  let shouldTake =
    isClean &&
    registry.hooksModulesWakeBound === "passed" &&
    isAutoModeGateOpen() &&
    isHooksModulesGateDisabled();
  if (shouldPass) registry.hooksModulesWakeBound = "passed";
  if (shouldTake) registry.hooksModulesWakeBound = "taken";
}
//@ chunk-v7jmb7se.js:4644-4737 placement
async function reinitializeGrowthBookIfNeeded() {
  await initializeGrowthBook().catch(() => {
    return;
  });
  return needsGrowthBookRefresh()
    ? initializeGrowthBook().catch(() => {
        return;
      })
    : undefined;
}
//@ chunk-v7jmb7se.js:4737-4803 placement
function flagFetchWaitMs() {
  return isAutoModeGateOpen()
    ? (env.CLAUDE_CODE_FLAG_FETCH_WAIT_MS ?? GROWTHBOOK_FLAG_WAIT_MS)
    : EVENT_LOGGING_FLAG_WAIT_MS;
}
//@ chunk-v7jmb7se.js:4803-4835 placement
var remainingFetchWaitMs = () => Math.max(0, flagFetchWaitMs() - getFlagFetchWaitedMs());
//@ chunk-v7jmb7se.js:4835-4978 placement
function describeFlagWaitOutcome(hold) {
  let timedOut = hold.timedOut;
  let hasPayload = !timedOut && hasFreshGrowthBookFeatures();
  return timedOut
    ? `no answer within ${flagFetchWaitMs()}ms`
    : hasPayload
      ? "the flag payload landed"
      : "the fetch settled with no payload";
}
//@ chunk-v7jmb7se.js:4978-5151 placement
async function waitForRolloutFlag(initialize = initializeGrowthBook) {
  let holdResult = await waitForInitialize({
    initialize,
    budgetMs: remainingFetchWaitMs(),
  });
  logForDebugging(
    `installed plugins' hooks modules held ${Math.round(holdResult.waitMs)}ms for the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}): ` +
      describeFlagWaitOutcome(holdResult),
  );
}
//@ chunk-v7jmb7se.js:5151-5196 placement
/**
 * waitForRolloutUnlessServed：非服务端来源时等待 rollout 开关。
 */
async function waitForRolloutUnlessServed() {
  return isServedGateSource() ? undefined : waitForRolloutFlag();
}
//@ chunk-v7jmb7se.js:5196-5208 placement
var STARTUP_ROLLOUT_WAIT_MS = 30000;
//@ chunk-v7jmb7se.js:5208-5277 placement
function settlementPromise(hold) {
  return pendingWithoutStart(hold) && hasWorkspaceTrust() ? hold.over.promise : Promise.resolve();
}
//@ chunk-v7jmb7se.js:5277-5300 placement
/**
 * waitForSettlement：带截止时间的结算等待。
 */
var waitForSettlement = (hold) => withDeadline(settlementPromise(hold), STARTUP_ROLLOUT_WAIT_MS);
//@ chunk-v7jmb7se.js:5300-5420 placement
/**
 * 启动时按需等待 rollout 标志。
 */
async function holdForRolloutFlagAtStartup() {
  await checkHooksModulesFlag();
  let needReloadDisallowed = needsReloadWhileDisallowed();
  let needReloadAllowed = shouldWaitOnFallbackSource() || needsReloadWhenAllowed();
  let shouldWait = (needReloadDisallowed || needReloadAllowed) && !isAutoModeGateOpen();
  let initialize = needReloadDisallowed ? reinitializeGrowthBookIfNeeded : initializeGrowthBook;
  if (shouldWait) await waitForSettlement(currentFetchHold());
  return shouldWait ? waitForRolloutFlag(initialize) : undefined;
}
//@ chunk-v7jmb7se.js:5420-5758 placement
/**
 * GrowthBook 取值来源（override/payload/disk/disabled/fallback）的说明文字。
 */
var FLAG_VALUE_SOURCE_LABELS = {
  override: "from a local override",
  payload: "from GrowthBook (this session's payload)",
  disk: "from GrowthBook (the disk cache of an earlier session)",
  disabled:
    "from the default (GrowthBook is off for this session: a third-party provider, or telemetry opted out)",
  fallback: "from the default (a cold GrowthBook cache, no payload yet)",
};
//@ chunk-v7jmb7se.js:5758-5770 placement
/**
 * REREAD_INTERVAL_MS：重读间隔。
 */
var REREAD_INTERVAL_MS = 60000;
//@ chunk-v7jmb7se.js:5770-6172 placement
/**
 * 若已有重读进行中则复用；否则在已读开关且距 askedAt 超过间隔时更新 askedAt，首次走 waitForRolloutFlag，之后刷新 GrowthBook 并等待，结束清空。
 */
function rereadHooksModulesSwitch(now = Date.now()) {
  let pluginRegistry = getPluginRegistry();
  let hooksModulesSwitchRereading = pluginRegistry.hooksModulesSwitchRereading;
  if (hooksModulesSwitchRereading !== undefined) return hooksModulesSwitchRereading;
  let hooksModulesSwitchRead = pluginRegistry.hooksModulesSwitchRead;
  if (!(
    hooksModulesSwitchRead !== undefined &&
    isRemoteManagedEnvironment() &&
    now - hooksModulesSwitchRead.askedAt >= REREAD_INTERVAL_MS
  ))
    return null;
  pluginRegistry.hooksModulesSwitchRead = {
    ...hooksModulesSwitchRead,
    askedAt: now,
  };
  let reread = (
    hooksModulesSwitchRead.askedAt === 0
      ? waitForRolloutFlag()
      : waitForInitialize({
          initialize: () => refreshGrowthBookFeatures().then(initializeGrowthBook),
          budgetMs: EVENT_LOGGING_FLAG_WAIT_MS,
        }).then(() => {
          return;
        })
  ).finally(() => {
    pluginRegistry.hooksModulesSwitchRereading = undefined;
  });
  pluginRegistry.hooksModulesSwitchRereading = reread;
  return reread;
}
//@ chunk-v7jmb7se.js:6172-6289 placement
function followRolloutAfterReread(reload, tell, standDown) {
  let followOrSettle = () =>
    followHooksModulesRollout(reload, tell, standDown) ?? settleHooksModulesWake(reload, tell, standDown);
  let reread = rereadHooksModulesSwitch();
  return reread !== null
    ? reread.catch(logError).then(() => {
        markWakeBoundPassed();
        return followOrSettle() ?? undefined;
      })
    : followOrSettle();
}
//@ chunk-v7jmb7se.js:6289-6301 placement
/**
 * REREAD_INITIAL_DELAY_MS：首次重读延迟。
 */
var REREAD_INITIAL_DELAY_MS = 1e4;
//@ chunk-v7jmb7se.js:6301-6517 placement
/**
 * 开关曾保存为关时，GrowthBook 刷新为开后补加载。
 */
function loadLateWhenFlagTurnsOn(onLoad) {
  if (!(isDiskSourceWithCredential() && !areHooksModulesAllowed())) return;
  let unsubscribe = onGrowthBookRefresh(() => {
    if (!hasFreshGrowthBookFeatures()) return;
    unsubscribe();
    if (areHooksModulesAllowed()) {
      logForDebugging(
        `installed plugins' hooks modules load late: the rollout flag (${PLUGIN_HOOKS_MODULES_GATE}) answered on after the load went on over a saved off`,
      );
      onLoad();
    }
  });
}
//@ chunk-v7jmb7se.js:6517-7078 placement
/**
 * hooks 模块未加载原因的说明文字。
 */
var HOOKS_MODULES_OFF_REASONS = {
  served: "the rollout switch served off",
  saved: "the rollout switch was saved off by an earlier session and is not refreshed yet",
  unanswered:
    "this wake's flag fetch has not answered the rollout switch; they load at a turn start once it reads on",
  unfetched:
    "this wake fetches no rollout switch; an organization's load at once, a person's once the organization's settings have been read",
  unfetchedOut:
    "this wake fetches no rollout switch and the organization's settings could not be read; an organization's load at once, a person's stay out for this wake",
};
//@ chunk-v7jmb7se.js:7078-7269 placement
/**
 * 选出 hooks 模块关闭的原因文字。
 */
function describeHooksModulesOffReason() {
  let flagOn = isAutoModeGateOpen() && areHooksModulesAllowed();
  let isDiskCredential = isDiskSourceWithCredential();
  let unfetched = flagOn && isHooksModulesGateDisabled();
  if (unfetched && getPluginRegistry().hooksModulesSwitchRead?.isPersonsOut === true)
    return HOOKS_MODULES_OFF_REASONS.unfetchedOut;
  return unfetched
    ? HOOKS_MODULES_OFF_REASONS.unfetched
    : flagOn
      ? HOOKS_MODULES_OFF_REASONS.unanswered
      : isDiskCredential
        ? HOOKS_MODULES_OFF_REASONS.saved
        : HOOKS_MODULES_OFF_REASONS.served;
}
//@ chunk-v7jmb7se.js:7269-7406 placement
function reloadAndReportDroppedModules(reload, tell, standDown) {
  let pluginRegistry = getPluginRegistry();
  let moduleCountBefore = pluginRegistry.loadedModules.length;
  return Promise.resolve()
    .then(reload)
    .then(() => {
      if (pluginRegistry.loadedModules.length < moduleCountBefore) tell(MODS_ROLLOUT_OFF_MESSAGE);
      standDown();
    });
}
//@ chunk-v7jmb7se.js:7406-7449 placement
/**
 * flagValueSourceLabel：开关值来源标签。
 */
function flagValueSourceLabel() {
  return FLAG_VALUE_SOURCE_LABELS[
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source
  ];
}
//@ chunk-v7jmb7se.js:7449-7723 placement
/**
 * 插件测试透传的 GrowthBook/遥测/提供方相关环境变量。
 */
var ROLLOUT_ENV_PASSTHROUGH_VARS; // deferred: uses PROVIDER_ENV_FLAGS (../model/modelIds.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-v7jmb7se.js:7449", () => {
  ROLLOUT_ENV_PASSTHROUGH_VARS = [
    "NODE_ENV",
    "DISABLE_GROWTHBOOK",
    "DISABLE_TELEMETRY",
    "DO_NOT_TRACK",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
    "CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF",
    "CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST",
    "CLAUDE_CODE_CUSTOM_OAUTH_URL",
    "CLAUDE_INTERNAL_FC_OVERRIDES",
    ...PROVIDER_ENV_FLAGS,
  ];
});
//@ chunk-v7jmb7se.js:7723-7817 placement
/**
 * followRolloutWithDeadline：带截止时间的重读后跟随。
 */
function followRolloutWithDeadline(reload, tell, standDown) {
  let followPass = followRolloutAfterReread(reload, tell, standDown);
  return followPass === null
    ? null
    : withDeadline(followPass, REREAD_INITIAL_DELAY_MS)
        .then(() => {
          return;
        })
        .catch(logError);
}
//@ chunk-v7jmb7se.js:7817-7832 placement
/**
 * BUSY_EDGE_THRESHOLD_MS：前台忙碌判定阈值。
 */
var BUSY_EDGE_THRESHOLD_MS = 180000;
export {
  isOrganizationModsLoadPending,
  followRolloutWithDeadline,
  REREAD_INITIAL_DELAY_MS,
  holdForRolloutFlagAtStartup,
  loadLateWhenFlagTurnsOn,
  flagValueSourceLabel,
  isHooksModulesGateDisabled,
  markWakeBoundPassed,
  isAutoModeGateOpen,
  updateWakeBound,
  followHooksModulesRollout,
  describeHooksModulesOffReason,
  pendingWithoutStart,
  currentFetchHold,
  BUSY_EDGE_THRESHOLD_MS,
  ROLLOUT_ENV_PASSTHROUGH_VARS,
  fetchHoldForHost,
  isHooksModulesSwitchStale,
  waitForSettlement,
  waitForRolloutFlag,
  settleHooksModulesWake,
  REREAD_INTERVAL_MS,
  followRolloutAfterReread,
  reloadAndReportDroppedModules,
  isServedGateSource,
  waitForRolloutUnlessServed,
  markFollowConsumed,
  isDiskSourceWithCredential,
  HOOKS_MODULES_OFF_REASONS,
};
