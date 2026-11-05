/**
 * utils/plugins/hooksModulesLoadGate.ts
 *
 * 2.1.316 新增。等待组织 hooks 模块加载。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v7jmb7se.js (27)
 * attribution: placement 27
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  BUSY_EDGE_THRESHOLD_MS,
  isHooksModulesSwitchStale,
  isAutoModeGateOpen,
  waitForSettlement,
  currentFetchHold,
  waitForRolloutFlag,
  markWakeBoundPassed,
  followHooksModulesRollout,
  settleHooksModulesWake,
  isOrganizationModsLoadPending,
  REREAD_INTERVAL_MS,
  followRolloutAfterReread,
  reloadAndReportDroppedModules,
  REREAD_INITIAL_DELAY_MS,
} from "./hooksModulesRollout.js";
import {
  onGrowthBookRefresh,
  hasFreshGrowthBookFeatures,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  PLUGIN_HOOKS_MODULES_GATE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { logError } from "../log.js";
import {
  HOOKS_MODULES_DEFAULT,
  resolveHooksModulesValue,
  hooksModulesRefusalReason,
} from "../../services/analytics/growthbookCredentials.js";
import { logForDebugging } from "../debug.js";
import {
  onLastLoadStatusChanged,
  hasLoadCycleEnded,
  getSyncCacheResetEpoch,
  getLastLoadStatus,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { sleep, withDeadline } from "../sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-v7jmb7se.js:7832-7947 placement
class ForegroundTurnState {
  busy = false;
  running = null;
  key = null;
  edgeAt = 0;
  busySince = 0;
  idleWaiters = new Set();
  endWaiters = new Set();
  valveTimer = null;
}
//@ chunk-v7jmb7se.js:7947-7973 placement
var foregroundTurnSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-v7jmb7se.js:7947", () => {
  foregroundTurnSlot = new SessionRootSlot(() => new ForegroundTurnState());
});
//@ chunk-v7jmb7se.js:7973-8004 placement
function foregroundTurnState() {
  return foregroundTurnSlot.of(getRootSession());
}
//@ chunk-v7jmb7se.js:8004-8140 placement
function releaseIdleWaiters(state) {
  if (state.valveTimer !== null) {
    clearTimeout(state.valveTimer);
    state.valveTimer = null;
  }
  let waiters = [...state.idleWaiters];
  state.idleWaiters.clear();
  scheduleMicrotasks(waiters);
}
//@ chunk-v7jmb7se.js:8140-8188 placement
function scheduleMicrotasks(waiters) {
  for (let waiter of waiters) queueMicrotask(waiter);
}
//@ chunk-v7jmb7se.js:8188-8457 placement
/**
 * 标记前台回合开始或结束：key 不匹配或状态未变时忽略；从忙变闲时唤醒空闲与结束等待者，并记录 running/key/busySince/edgeAt。
 */
function setForegroundTurnBusy(busy, key = null) {
  let state = foregroundTurnState();
  let sameTurn = key === null || key === state.key;
  if (busy ? state.busy && sameTurn : !state.busy || !sameTurn) return;
  if (state.busy) {
    releaseIdleWaiters(state);
    scheduleMicrotasks([...state.endWaiters]);
    state.endWaiters.clear();
  }
  state.busy = busy;
  state.running = busy ? Symbol("foreground turn") : null;
  state.key = busy ? key : null;
  state.busySince = busy ? performance.now() : 0;
  state.edgeAt = Date.now();
}
//@ chunk-v7jmb7se.js:8457-8488 placement
/**
 * isForegroundBusy：前台是否忙碌。
 */
function isForegroundBusy() {
  return foregroundTurnState().busy;
}
//@ chunk-v7jmb7se.js:8488-8522 placement
/**
 * isForegroundRunning：前台是否在跑回合。
 */
function isForegroundRunning() {
  return foregroundTurnState().running;
}
//@ chunk-v7jmb7se.js:8522-8601 placement
/**
 * runWhenTurnEnds：回合结束时执行。
 */
function runWhenTurnEnds(callback) {
  let state = foregroundTurnState();
  if (state.busy) state.endWaiters.add(callback);
  else queueMicrotask(callback);
}
//@ chunk-v7jmb7se.js:8601-8634 placement
/**
 * foregroundEdgeAt：前台状态切换时间。
 */
function foregroundEdgeAt() {
  return foregroundTurnState().edgeAt;
}
//@ chunk-v7jmb7se.js:8634-8715 placement
/**
 * isBusyShorterThan：忙碌时间短于阈值。
 */
function isBusyShorterThan(now = performance.now(), autoReactRateLimit = BUSY_EDGE_THRESHOLD_MS) {
  let state = foregroundTurnState();
  return state.busy && now - state.busySince < autoReactRateLimit;
}
//@ chunk-v7jmb7se.js:8715-8797 placement
/**
 * isBusyAtLeast：忙碌时间达到阈值。
 */
function isBusyAtLeast(now = performance.now(), autoReactRateLimit = BUSY_EDGE_THRESHOLD_MS) {
  let state = foregroundTurnState();
  return state.busy && now - state.busySince >= autoReactRateLimit;
}
//@ chunk-v7jmb7se.js:8797-9250 placement
/**
 * 前台空闲或忙碌超过阀门时长时立刻（微任务）执行 o；否则登记为空闲等待者并启动阀门定时器。返回取消函数，abort 时自动取消。
 */
function runWhenForegroundIdle(callback, signal, autoReactRateLimit = BUSY_EDGE_THRESHOLD_MS) {
  if (signal.aborted) return () => {};
  let state = foregroundTurnState();
  let cancelled = false;
  let run = () => {
    signal.removeEventListener("abort", cancel);
    if (!cancelled && !signal.aborted) callback();
  };
  let cancel = () => {
    cancelled = true;
    state.idleWaiters.delete(run);
    signal.removeEventListener("abort", cancel);
  };
  if (!isBusyShorterThan(performance.now(), autoReactRateLimit)) {
    queueMicrotask(run);
    return cancel;
  }
  state.idleWaiters.add(run);
  signal.addEventListener("abort", cancel, {
    once: true,
  });
  if (state.valveTimer === null) {
    let remainingMs = state.busySince + autoReactRateLimit - performance.now();
    state.valveTimer = setTimeout(releaseIdleWaiters, Math.max(0, remainingMs), state);
    state.valveTimer.unref?.();
  }
  return cancel;
}
//@ chunk-v7jmb7se.js:9250-9443 placement
/**
 * GrowthBook 刷新后开关变化时（等前台空闲）触发重载。
 */
function watchRolloutSwitchChanges(onChange) {
  let state = {
    isStopped: false,
    isWaiting: false,
  };
  function recheck() {
    state.isWaiting = false;
    if (!state.isStopped && isHooksModulesSwitchStale()) onChange();
  }
  let unsubscribe = onGrowthBookRefresh(() => {
    if (!state.isWaiting && isHooksModulesSwitchStale()) {
      state.isWaiting = true;
      runWhenTurnEnds(recheck);
    }
  });
  return () => {
    state.isStopped = true;
    unsubscribe();
  };
}
//@ chunk-v7jmb7se.js:9443-9859 placement
/**
 * 唤醒边界为 ahead、已读开关且无进行中的跟随时：等待组织设置与 rollout 标志后跟随 rollout 或结算唤醒；结果 Promise 共享，结束清空。
 */
function followRolloutSwitchOnce(follow, standDown, standDown_2) {
  let pluginRegistry = getPluginRegistry();
  if (!(
    pluginRegistry.hooksModulesWakeBound === "ahead" &&
    pluginRegistry.hooksModulesSwitchRead !== undefined &&
    pluginRegistry.hooksModulesSwitchFollowing === undefined &&
    isAutoModeGateOpen()
  ))
    return null;
  let followPass = waitForSettlement(currentFetchHold())
    .then(() => waitForRolloutFlag())
    .then(() => {
      pluginRegistry.hooksModulesSwitchFollowing = undefined;
      markWakeBoundPassed();
      return (
        followHooksModulesRollout(follow, standDown, standDown_2) ??
        settleHooksModulesWake(follow, standDown, standDown_2) ??
        undefined
      );
    })
    .catch(logError)
    .finally(() => {
      if (pluginRegistry.hooksModulesSwitchFollowing === followPass)
        pluginRegistry.hooksModulesSwitchFollowing = undefined;
    });
  pluginRegistry.hooksModulesSwitchFollowing = followPass;
  return followPass;
}
//@ chunk-v7jmb7se.js:9859-9936 placement
/**
 * hooksModulesGateFromPayload：开关来源为 payload 或已有新特性。
 */
function hooksModulesGateFromPayload() {
  try {
    return (
      hasFreshGrowthBookFeatures() ||
      getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT)
        .source === "payload"
    );
  } catch {
    return false;
  }
}
//@ chunk-v7jmb7se.js:9936-9965 placement
/**
 * hooksModulesGateSourceChanged：开关读取来源已变化。
 */
var hooksModulesGateSourceChanged = () =>
  resolveHooksModulesValue() !==
  getFeatureValue_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT);
//@ chunk-v7jmb7se.js:9965-10451 placement
/**
 * 仅在 isManagedPending 时处理：集合未知、加载有错或有未满足插件时记日志保持欠载；否则按 isDecided 更新或清除开关读取状态。
 */
function settleManagedModulesLoad(outcome) {
  let hooksModulesSwitchRead = outcome.registry.hooksModulesSwitchRead;
  if (hooksModulesSwitchRead?.isManagedPending !== true) return false;
  if (!(outcome.isSetKnown && outcome.isLoadFaultless && outcome.unmet.length === 0)) {
    logForDebugging(
      `the load of an organization's hooks modules stays owed: its set ${outcome.isSetKnown ? "is known" : "is not known yet"}, the load ${outcome.isLoadFaultless ? "ran" : "did not run faultless"}, ${outcome.unmet.length} named plugin(s) not found or not loaded`,
    );
    return false;
  }
  outcome.registry.hooksModulesSwitchRead = outcome.isDecided
    ? {
        ...hooksModulesSwitchRead,
        isManagedPending: false,
      }
    : undefined;
  return true;
}
//@ chunk-v7jmb7se.js:10451-10533 placement
/**
 * ORGANIZATION_MODS_UNLOADED_MESSAGE：组织 mods 未能加载时的说明。
 */
var ORGANIZATION_MODS_UNLOADED_MESSAGE =
  "Your organization's mods could not be loaded, so this turn was not run.";
//@ chunk-v7jmb7se.js:10533-11572 placement
async function waitForOrganizationMods(evaluate, endSignal, timeoutMs, isDeadEnd) {
  let pluginRegistry = getPluginRegistry();
  let sessionState = {
    isEnded: false,
  };
  let wakeSignal = {
    wake: () => {},
  };
  let settledPasses = new Set();
  let abortController = new AbortController();
  let unsubscribeRefresh = onGrowthBookRefresh(() => wakeSignal.wake());
  let unsubscribeEnd = pluginRegistry.hookRegistrationEnded.subscribe(() => wakeSignal.wake());
  let moveState = {
    hasMoved: false,
    passesBefore: 0,
  };
  let unsubscribeStatus = onLastLoadStatusChanged(() => {
    moveState.hasMoved = true;
    moveState.passesBefore = pluginRegistry.hookRegistrationEpoch;
    wakeSignal.wake();
  });
  let hasMovedSince = () =>
    moveState.hasMoved && pluginRegistry.hookRegistrationEpoch === moveState.passesBefore;
  let limit = {
    isPassed: false,
  };
  let deadEnd = {
    isMet: false,
  };
  let shouldContinue = () =>
    !sessionState.isEnded && !limit.isPassed && !deadEnd.isMet && isOrganizationModsLoadPending();
  let timeoutTimer = sleep(timeoutMs, abortController.signal).then(() => {
    limit.isPassed = true;
  });
  endSignal.then(() => {
    sessionState.isEnded = true;
  });
  try {
    while (shouldContinue()) {
      let interval = {
        isOver: false,
      };
      let intervalTimer = sleep(REREAD_INTERVAL_MS, abortController.signal, {
        unref: true,
      }).then(() => {
        interval.isOver = true;
      });
      let moved = hasMovedSince();
      let pass = Promise.resolve()
        .then(() => evaluate(moved))
        .catch(logError);
      moveState.hasMoved = false;
      while (shouldContinue() && !interval.isOver && !(hasMovedSince() && settledPasses.has(pass))) {
        let promise = new Promise((resolve) => {
          wakeSignal.wake = resolve;
        });
        let mapped = [
          pass,
          pluginRegistry.hooksModulesSwitchFollowing,
          ...pluginRegistry.hookRegistrationsInFlight,
        ]
          .flatMap((promise) => (promise === undefined || settledPasses.has(promise) ? [] : [promise]))
          .map((promise) => Promise.allSettled([promise]).then(() => settledPasses.add(promise)));
        await Promise.race([intervalTimer, timeoutTimer, endSignal, promise, ...mapped]);
        deadEnd.isMet = !limit.isPassed && settledPasses.has(pass) && !hasMovedSince() && isDeadEnd();
      }
    }
    return limit.isPassed ? "limit" : deadEnd.isMet ? "dead-end" : "released";
  } finally {
    abortController.abort();
    unsubscribeRefresh();
    unsubscribeEnd();
    unsubscribeStatus();
  }
}
//@ chunk-v7jmb7se.js:11572-11586 placement
var ORGANIZATION_POLICY_LOAD_TIMEOUT_MS = 300000;
//@ chunk-v7jmb7se.js:11586-11641 placement
var ORGANIZATION_MODS_WAITING_MESSAGE = "Waiting for your organization's mods to load.";
//@ chunk-v7jmb7se.js:11641-11975 placement
/**
 * 按加载状态去重执行组织状态加载。
 */
function runOrganizationStatusLoadOnce(reload, force) {
  let pluginRegistry = getPluginRegistry();
  let generation = `${hasLoadCycleEnded() ? "ended" : "under way"} since reset ${getSyncCacheResetEpoch()}`;
  let standing = getLastLoadStatus() ?? generation;
  let organizationsStatusLoad = pluginRegistry.organizationsStatusLoad;
  if (!force && organizationsStatusLoad?.standing === standing) return organizationsStatusLoad.pass;
  let pass = Promise.resolve().then(reload);
  let entry = {
    standing,
    pass,
  };
  let clearIfCurrent = () => {
    if (pluginRegistry.organizationsStatusLoad === entry) pluginRegistry.organizationsStatusLoad = undefined;
  };
  pluginRegistry.organizationsStatusLoad = entry;
  pass.then(clearIfCurrent, clearIfCurrent);
  return pass;
}
//@ chunk-v7jmb7se.js:11975-12066 placement
/**
 * ORGANIZATION_POLICY_UNREADABLE_MESSAGE：组织策略无法读取时的说明。
 */
var ORGANIZATION_POLICY_UNREADABLE_MESSAGE =
  "Your organization's policy could not be read, so this session cannot run a turn.";
//@ chunk-v7jmb7se.js:12066-12582 placement
/**
 * 组织模块仍待加载时：先提示，再等待组织 mods（必要时重读开关），超时则按截止时间重载； 返回 {kind:"start"}（已不再等待）、{kind:"ended"}（回合已结束）或 {kind:"failed", message}。
 */
function waitForOrganizationModsOnClaim(reload, tell, standDown, endSignal, isDeadEnd) {
  if (!isOrganizationModsLoadPending()) return null;
  let sessionState = {
    isEnded: false,
  };
  let outcome = {
    end: "released",
  };
  let ispending = () => getPluginRegistry().hooksModulesSwitchRead?.isManagedPending === true;
  let followOrSettle = () =>
    followHooksModulesRollout(reload, tell, standDown) ?? settleHooksModulesWake(reload, tell, standDown);
  endSignal.then(() => {
    sessionState.isEnded = true;
  });
  return Promise.resolve()
    .then(() => tell(ORGANIZATION_MODS_WAITING_MESSAGE))
    .catch(logError)
    .then(() =>
      waitForOrganizationMods(
        (isFirstReadOverdue) =>
          followRolloutAfterReread(
            isFirstReadOverdue ? () => runOrganizationStatusLoadOnce(reload, false) : reload,
            tell,
            standDown,
          ),
        endSignal,
        ORGANIZATION_POLICY_LOAD_TIMEOUT_MS,
        isDeadEnd,
      ),
    )
    .then((end) => {
      outcome.end = end;
    })
    .catch(logError)
    .then(() =>
      !isOrganizationModsLoadPending() && ispending()
        ? withDeadline(
            reloadAndReportDroppedModules(standDown, tell, followOrSettle),
            REREAD_INITIAL_DELAY_MS,
          )
        : undefined,
    )
    .catch(logError)
    .then(() => {
      let soundDeadEnd = outcome.end === "dead-end";
      if (!isOrganizationModsLoadPending())
        return {
          kind: "start",
        };
      return sessionState.isEnded
        ? {
            kind: "ended",
          }
        : {
            kind: "failed",
            message: soundDeadEnd
              ? ORGANIZATION_POLICY_UNREADABLE_MESSAGE
              : ORGANIZATION_MODS_UNLOADED_MESSAGE,
          };
    });
}
//@ chunk-v7jmb7se.js:12582-12746 placement
/**
 * 启动时初始化开关读取状态为待加载。
 */
function initManagedModulesPending() {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.hooksModulesSwitchRead === undefined && canRunTurnWithHooksModules())
    pluginRegistry.hooksModulesSwitchRead = {
      isOn: false,
      askedAt: 0,
      isLoadOwed: true,
      isManagedPending: true,
      isPersonsOut: false,
    };
}
//@ chunk-v7jmb7se.js:12746-12807 placement
function canRunTurnWithHooksModules() {
  try {
    return hooksModulesRefusalReason() === undefined && isAutoModeGateOpen();
  } catch {
    return true;
  }
}
export {
  hooksModulesGateFromPayload,
  runOrganizationStatusLoadOnce,
  ORGANIZATION_POLICY_UNREADABLE_MESSAGE,
  ORGANIZATION_MODS_UNLOADED_MESSAGE,
  waitForOrganizationModsOnClaim,
  setForegroundTurnBusy,
  settleManagedModulesLoad,
  watchRolloutSwitchChanges,
  followRolloutSwitchOnce,
  isForegroundBusy,
  initManagedModulesPending,
  runWhenForegroundIdle,
  isBusyShorterThan,
  isBusyAtLeast,
  hooksModulesGateSourceChanged,
  isForegroundRunning,
  runWhenTurnEnds,
  foregroundEdgeAt,
};
