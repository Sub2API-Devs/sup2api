/**
 * utils/plugins/hooksModulesLoadGate.ts
 *
 * 2.1.316 新增。等待组织 hooks 模块加载。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7kt7c7a3.js (27)
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

//@ chunk-7kt7c7a3.js:7799-7914 placement
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
//@ chunk-7kt7c7a3.js:7914-7940 placement
var foregroundTurnSlot = new SessionRootSlot(() => new ForegroundTurnState());
//@ chunk-7kt7c7a3.js:7940-7971 placement
function foregroundTurnState() {
  return foregroundTurnSlot.of(getRootSession());
}
//@ chunk-7kt7c7a3.js:7971-8107 placement
function releaseIdleWaiters(o) {
  if (o.valveTimer !== null) {
    clearTimeout(o.valveTimer);
    o.valveTimer = null;
  }
  let e = [...o.idleWaiters];
  o.idleWaiters.clear();
  scheduleMicrotasks(e);
}
//@ chunk-7kt7c7a3.js:8107-8155 placement
function scheduleMicrotasks(o) {
  for (let e of o) queueMicrotask(e);
}
//@ chunk-7kt7c7a3.js:8155-8424 placement
/**
 * 标记前台回合开始或结束：key 不匹配或状态未变时忽略；从忙变闲时唤醒空闲与结束等待者，并记录 running/key/busySince/edgeAt。
 */
function setForegroundTurnBusy(o, e = null) {
  let s = foregroundTurnState();
  let r = e === null || e === s.key;
  if (o ? s.busy && r : !s.busy || !r) return;
  if (s.busy) {
    releaseIdleWaiters(s);
    scheduleMicrotasks([...s.endWaiters]);
    s.endWaiters.clear();
  }
  s.busy = o;
  s.running = o ? Symbol("foreground turn") : null;
  s.key = o ? e : null;
  s.busySince = o ? performance.now() : 0;
  s.edgeAt = Date.now();
}
//@ chunk-7kt7c7a3.js:8424-8455 placement
/**
 * isForegroundBusy：前台是否忙碌。
 */
function isForegroundBusy() {
  return foregroundTurnState().busy;
}
//@ chunk-7kt7c7a3.js:8455-8489 placement
/**
 * isForegroundRunning：前台是否在跑回合。
 */
function isForegroundRunning() {
  return foregroundTurnState().running;
}
//@ chunk-7kt7c7a3.js:8489-8568 placement
/**
 * runWhenTurnEnds：回合结束时执行。
 */
function runWhenTurnEnds(o) {
  let e = foregroundTurnState();
  if (e.busy) e.endWaiters.add(o);
  else queueMicrotask(o);
}
//@ chunk-7kt7c7a3.js:8568-8601 placement
/**
 * foregroundEdgeAt：前台状态切换时间。
 */
function foregroundEdgeAt() {
  return foregroundTurnState().edgeAt;
}
//@ chunk-7kt7c7a3.js:8601-8682 placement
/**
 * isBusyShorterThan：忙碌时间短于阈值。
 */
function isBusyShorterThan(o = performance.now(), autoReactRateLimit = BUSY_EDGE_THRESHOLD_MS) {
  let s = foregroundTurnState();
  return s.busy && o - s.busySince < autoReactRateLimit;
}
//@ chunk-7kt7c7a3.js:8682-8764 placement
/**
 * isBusyAtLeast：忙碌时间达到阈值。
 */
function isBusyAtLeast(o = performance.now(), autoReactRateLimit = BUSY_EDGE_THRESHOLD_MS) {
  let s = foregroundTurnState();
  return s.busy && o - s.busySince >= autoReactRateLimit;
}
//@ chunk-7kt7c7a3.js:8764-9217 placement
/**
 * 前台空闲或忙碌超过阀门时长时立刻（微任务）执行 o；否则登记为空闲等待者并启动阀门定时器。返回取消函数，abort 时自动取消。
 */
function runWhenForegroundIdle(o, signal, autoReactRateLimit = BUSY_EDGE_THRESHOLD_MS) {
  if (signal.aborted) return () => {};
  let r = foregroundTurnState();
  let n = false;
  let a = () => {
    signal.removeEventListener("abort", u);
    if (!n && !signal.aborted) o();
  };
  let u = () => {
    n = true;
    r.idleWaiters.delete(a);
    signal.removeEventListener("abort", u);
  };
  if (!isBusyShorterThan(performance.now(), autoReactRateLimit)) {
    queueMicrotask(a);
    return u;
  }
  r.idleWaiters.add(a);
  signal.addEventListener("abort", u, {
    once: true,
  });
  if (r.valveTimer === null) {
    let f = r.busySince + autoReactRateLimit - performance.now();
    r.valveTimer = setTimeout(releaseIdleWaiters, Math.max(0, f), r);
    r.valveTimer.unref?.();
  }
  return u;
}
//@ chunk-7kt7c7a3.js:9217-9410 placement
/**
 * GrowthBook 刷新后开关变化时（等前台空闲）触发重载。
 */
function watchRolloutSwitchChanges(o) {
  let e = {
    isStopped: false,
    isWaiting: false,
  };
  function s() {
    e.isWaiting = false;
    if (!e.isStopped && isHooksModulesSwitchStale()) o();
  }
  let r = onGrowthBookRefresh(() => {
    if (!e.isWaiting && isHooksModulesSwitchStale()) {
      e.isWaiting = true;
      runWhenTurnEnds(s);
    }
  });
  return () => {
    e.isStopped = true;
    r();
  };
}
//@ chunk-7kt7c7a3.js:9410-9826 placement
/**
 * 唤醒边界为 ahead、已读开关且无进行中的跟随时：等待组织设置与 rollout 标志后跟随 rollout 或结算唤醒；结果 Promise 共享，结束清空。
 */
function followRolloutSwitchOnce(o, e, standDownInstalledHooksModules) {
  let pluginRegistry = getPluginRegistry();
  if (!(
    pluginRegistry.hooksModulesWakeBound === "ahead" &&
    pluginRegistry.hooksModulesSwitchRead !== undefined &&
    pluginRegistry.hooksModulesSwitchFollowing === undefined &&
    isAutoModeGateOpen()
  ))
    return null;
  let a = waitForSettlement(currentFetchHold())
    .then(() => waitForRolloutFlag())
    .then(() => {
      pluginRegistry.hooksModulesSwitchFollowing = undefined;
      markWakeBoundPassed();
      return (
        followHooksModulesRollout(o, e, standDownInstalledHooksModules) ??
        settleHooksModulesWake(o, e, standDownInstalledHooksModules) ??
        undefined
      );
    })
    .catch(logError)
    .finally(() => {
      if (pluginRegistry.hooksModulesSwitchFollowing === a)
        pluginRegistry.hooksModulesSwitchFollowing = undefined;
    });
  pluginRegistry.hooksModulesSwitchFollowing = a;
  return a;
}
//@ chunk-7kt7c7a3.js:9826-9903 placement
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
//@ chunk-7kt7c7a3.js:9903-9932 placement
/**
 * hooksModulesGateSourceChanged：开关读取来源已变化。
 */
var hooksModulesGateSourceChanged = () =>
  resolveHooksModulesValue() !==
  getFeatureValue_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT);
//@ chunk-7kt7c7a3.js:9932-10418 placement
/**
 * 仅在 isManagedPending 时处理：集合未知、加载有错或有未满足插件时记日志保持欠载；否则按 isDecided 更新或清除开关读取状态。
 */
function settleManagedModulesLoad(o) {
  let hooksModulesSwitchRead = o.registry.hooksModulesSwitchRead;
  if (hooksModulesSwitchRead?.isManagedPending !== true) return false;
  if (!(o.isSetKnown && o.isLoadFaultless && o.unmet.length === 0)) {
    logForDebugging(
      `the load of an organization's hooks modules stays owed: its set ${o.isSetKnown ? "is known" : "is not known yet"}, the load ${o.isLoadFaultless ? "ran" : "did not run faultless"}, ${o.unmet.length} named plugin(s) not found or not loaded`,
    );
    return false;
  }
  o.registry.hooksModulesSwitchRead = o.isDecided
    ? {
        ...hooksModulesSwitchRead,
        isManagedPending: false,
      }
    : undefined;
  return true;
}
//@ chunk-7kt7c7a3.js:10418-10500 placement
/**
 * ORGANIZATION_MODS_UNLOADED_MESSAGE：组织 mods 未能加载时的说明。
 */
var ORGANIZATION_MODS_UNLOADED_MESSAGE =
  "Your organization's mods could not be loaded, so this turn was not run.";
//@ chunk-7kt7c7a3.js:10500-11539 placement
async function waitForOrganizationMods(o, e, s, r) {
  let pluginRegistry = getPluginRegistry();
  let a = {
    isEnded: false,
  };
  let u = {
    wake: () => {},
  };
  let f = new Set();
  let abortController = new AbortController();
  let p = onGrowthBookRefresh(() => u.wake());
  let w = pluginRegistry.hookRegistrationEnded.subscribe(() => u.wake());
  let h = {
    hasMoved: false,
    passesBefore: 0,
  };
  let E = onLastLoadStatusChanged(() => {
    h.hasMoved = true;
    h.passesBefore = pluginRegistry.hookRegistrationEpoch;
    u.wake();
  });
  let M = () => h.hasMoved && pluginRegistry.hookRegistrationEpoch === h.passesBefore;
  let k = {
    isPassed: false,
  };
  let C = {
    isMet: false,
  };
  let N = () => !a.isEnded && !k.isPassed && !C.isMet && isOrganizationModsLoadPending();
  let mo = sleep(s, abortController.signal).then(() => {
    k.isPassed = true;
  });
  e.then(() => {
    a.isEnded = true;
  });
  try {
    while (N()) {
      let K = {
        isOver: false,
      };
      let uo = sleep(REREAD_INTERVAL_MS, abortController.signal, {
        unref: true,
      }).then(() => {
        K.isOver = true;
      });
      let po = M();
      let I = Promise.resolve()
        .then(() => o(po))
        .catch(logError);
      h.hasMoved = false;
      while (N() && !K.isOver && !(M() && f.has(I))) {
        let promise = new Promise((resolve) => {
          u.wake = resolve;
        });
        let mapped = [
          I,
          pluginRegistry.hooksModulesSwitchFollowing,
          ...pluginRegistry.hookRegistrationsInFlight,
        ]
          .flatMap((O) => (O === undefined || f.has(O) ? [] : [O]))
          .map((O) => Promise.allSettled([O]).then(() => f.add(O)));
        await Promise.race([uo, mo, e, promise, ...mapped]);
        C.isMet = !k.isPassed && f.has(I) && !M() && r();
      }
    }
    return k.isPassed ? "limit" : C.isMet ? "dead-end" : "released";
  } finally {
    abortController.abort();
    p();
    w();
    E();
  }
}
//@ chunk-7kt7c7a3.js:11539-11553 placement
var ORGANIZATION_POLICY_LOAD_TIMEOUT_MS = 300000;
//@ chunk-7kt7c7a3.js:11553-11608 placement
var ORGANIZATION_MODS_WAITING_MESSAGE = "Waiting for your organization's mods to load.";
//@ chunk-7kt7c7a3.js:11608-11942 placement
/**
 * 按加载状态去重执行组织状态加载。
 */
function runOrganizationStatusLoadOnce(reload, e) {
  let pluginRegistry = getPluginRegistry();
  let n = `${hasLoadCycleEnded() ? "ended" : "under way"} since reset ${getSyncCacheResetEpoch()}`;
  let a = getLastLoadStatus() ?? n;
  let organizationsStatusLoad = pluginRegistry.organizationsStatusLoad;
  if (!e && organizationsStatusLoad?.standing === a) return organizationsStatusLoad.pass;
  let f = Promise.resolve().then(reload);
  let c = {
    standing: a,
    pass: f,
  };
  let p = () => {
    if (pluginRegistry.organizationsStatusLoad === c) pluginRegistry.organizationsStatusLoad = undefined;
  };
  pluginRegistry.organizationsStatusLoad = c;
  f.then(p, p);
  return f;
}
//@ chunk-7kt7c7a3.js:11942-12033 placement
/**
 * ORGANIZATION_POLICY_UNREADABLE_MESSAGE：组织策略无法读取时的说明。
 */
var ORGANIZATION_POLICY_UNREADABLE_MESSAGE =
  "Your organization's policy could not be read, so this session cannot run a turn.";
//@ chunk-7kt7c7a3.js:12033-12549 placement
/**
 * 组织模块仍待加载时：先提示，再等待组织 mods（必要时重读开关），超时则按截止时间重载； 返回 {kind:"start"}（已不再等待）、{kind:"ended"}（回合已结束）或 {kind:"failed", message}。
 */
function waitForOrganizationModsOnClaim(reload, tell, standDown, r, isFirstReadOverdue) {
  if (!isOrganizationModsLoadPending()) return null;
  let a = {
    isEnded: false,
  };
  let u = {
    end: "released",
  };
  let f = () => getPluginRegistry().hooksModulesSwitchRead?.isManagedPending === true;
  let c = () =>
    followHooksModulesRollout(reload, tell, standDown) ?? settleHooksModulesWake(reload, tell, standDown);
  r.then(() => {
    a.isEnded = true;
  });
  return Promise.resolve()
    .then(() => tell(ORGANIZATION_MODS_WAITING_MESSAGE))
    .catch(logError)
    .then(() =>
      waitForOrganizationMods(
        (p) =>
          followRolloutAfterReread(
            p ? () => runOrganizationStatusLoadOnce(reload, false) : reload,
            tell,
            standDown,
          ),
        r,
        ORGANIZATION_POLICY_LOAD_TIMEOUT_MS,
        isFirstReadOverdue,
      ),
    )
    .then((end) => {
      u.end = end;
    })
    .catch(logError)
    .then(() =>
      !isOrganizationModsLoadPending() && f()
        ? withDeadline(reloadAndReportDroppedModules(standDown, tell, c), REREAD_INITIAL_DELAY_MS)
        : undefined,
    )
    .catch(logError)
    .then(() => {
      let p = u.end === "dead-end";
      if (!isOrganizationModsLoadPending())
        return {
          kind: "start",
        };
      return a.isEnded
        ? {
            kind: "ended",
          }
        : {
            kind: "failed",
            message: p ? ORGANIZATION_POLICY_UNREADABLE_MESSAGE : ORGANIZATION_MODS_UNLOADED_MESSAGE,
          };
    });
}
//@ chunk-7kt7c7a3.js:12549-12713 placement
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
//@ chunk-7kt7c7a3.js:12713-12774 placement
function canRunTurnWithHooksModules() {
  try {
    return hooksModulesRefusalReason() === undefined && isAutoModeGateOpen();
  } catch {
    return true;
  }
}
export {
  hooksModulesGateSourceChanged,
  setForegroundTurnBusy,
  isForegroundBusy,
  runWhenForegroundIdle,
  isBusyShorterThan,
  isBusyAtLeast,
  foregroundEdgeAt,
  hooksModulesGateFromPayload,
  settleManagedModulesLoad,
  watchRolloutSwitchChanges,
  followRolloutSwitchOnce,
  isForegroundRunning,
  runWhenTurnEnds,
  initManagedModulesPending,
  runOrganizationStatusLoadOnce,
  ORGANIZATION_POLICY_UNREADABLE_MESSAGE,
  ORGANIZATION_MODS_UNLOADED_MESSAGE,
  waitForOrganizationModsOnClaim,
};
