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
  A_n,
  isHooksModulesSwitchStale,
  BF,
  U,
  Eee,
  waitForRolloutFlag,
  markWakeBoundPassed,
  followHooksModulesRollout,
  settleHooksModulesWake,
  isOrganizationModsLoadPending,
  b,
  followRolloutAfterReread,
  reloadAndReportDroppedModules,
  x_n,
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
  I_n,
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
  busy = !1;
  running = null;
  key = null;
  edgeAt = 0;
  busySince = 0;
  idleWaiters = new Set();
  endWaiters = new Set();
  valveTimer = null;
}
//@ chunk-7kt7c7a3.js:7914-7940 placement
var fe = new SessionRootSlot(() => new ForegroundTurnState());
//@ chunk-7kt7c7a3.js:7940-7971 placement
function x() {
  return fe.of(getRootSession());
}
//@ chunk-7kt7c7a3.js:7971-8107 placement
function releaseIdleWaiters(o) {
  if (o.valveTimer !== null) (clearTimeout(o.valveTimer), (o.valveTimer = null));
  let e = [...o.idleWaiters];
  (o.idleWaiters.clear(), no(e));
}
//@ chunk-7kt7c7a3.js:8107-8155 placement
function no(o) {
  for (let e of o) queueMicrotask(e);
}
/**
 * 标记前台回合开始或结束：key 不匹配或状态未变时忽略；从忙变闲时唤醒空闲与结束等待者，并记录 running/key/busySince/edgeAt。
 */
//@ chunk-7kt7c7a3.js:8155-8424 placement
function setForegroundTurnBusy(o, e = null) {
  let s = x(),
    r = e === null || e === s.key;
  if (o ? s.busy && r : !s.busy || !r) return;
  if (s.busy) (releaseIdleWaiters(s), no([...s.endWaiters]), s.endWaiters.clear());
  ((s.busy = o),
    (s.running = o ? Symbol("foreground turn") : null),
    (s.key = o ? e : null),
    (s.busySince = o ? performance.now() : 0),
    (s.edgeAt = Date.now()));
}
//@ chunk-7kt7c7a3.js:8424-8455 placement
function hqe() {
  return x().busy;
}
//@ chunk-7kt7c7a3.js:8455-8489 placement
function M4o() {
  return x().running;
}
//@ chunk-7kt7c7a3.js:8489-8568 placement
function tYr(o) {
  let e = x();
  if (e.busy) e.endWaiters.add(o);
  else queueMicrotask(o);
}
//@ chunk-7kt7c7a3.js:8568-8601 placement
function _ni() {
  return x().edgeAt;
}
//@ chunk-7kt7c7a3.js:8601-8682 placement
function nYr(o = performance.now(), e = A_n) {
  let s = x();
  return s.busy && o - s.busySince < e;
}
//@ chunk-7kt7c7a3.js:8682-8764 placement
function bni(o = performance.now(), e = A_n) {
  let s = x();
  return s.busy && o - s.busySince >= e;
}
/**
 * 前台空闲或忙碌超过阀门时长时立刻（微任务）执行 o；否则登记为空闲等待者并启动阀门定时器。返回取消函数，abort 时自动取消。
 */
//@ chunk-7kt7c7a3.js:8764-9217 placement
function runWhenForegroundIdle(o, e, s = A_n) {
  if (e.aborted) return () => {};
  let r = x(),
    n = !1,
    a = () => {
      if ((e.removeEventListener("abort", u), !n && !e.aborted)) o();
    },
    u = () => {
      ((n = !0), r.idleWaiters.delete(a), e.removeEventListener("abort", u));
    };
  if (!nYr(performance.now(), s)) return (queueMicrotask(a), u);
  if ((r.idleWaiters.add(a), e.addEventListener("abort", u, { once: !0 }), r.valveTimer === null)) {
    let f = r.busySince + s - performance.now();
    ((r.valveTimer = setTimeout(releaseIdleWaiters, Math.max(0, f), r)), r.valveTimer.unref?.());
  }
  return u;
}
/**
 * GrowthBook 刷新后开关变化时（等前台空闲）触发重载。
 */
//@ chunk-7kt7c7a3.js:9217-9410 placement
function watchRolloutSwitchChanges(o) {
  let e = { isStopped: !1, isWaiting: !1 };
  function s() {
    if (((e.isWaiting = !1), !e.isStopped && isHooksModulesSwitchStale())) o();
  }
  let r = onGrowthBookRefresh(() => {
    if (!e.isWaiting && isHooksModulesSwitchStale()) ((e.isWaiting = !0), tYr(s));
  });
  return () => {
    ((e.isStopped = !0), r());
  };
}
/**
 * 唤醒边界为 ahead、已读开关且无进行中的跟随时：等待组织设置与 rollout 标志后跟随 rollout 或结算唤醒；结果 Promise 共享，结束清空。
 */
//@ chunk-7kt7c7a3.js:9410-9826 placement
function followRolloutSwitchOnce(o, e, s) {
  let r = getPluginRegistry();
  if (!(
    r.hooksModulesWakeBound === "ahead" &&
    r.hooksModulesSwitchRead !== void 0 &&
    r.hooksModulesSwitchFollowing === void 0 &&
    BF()
  ))
    return null;
  let a = U(Eee())
    .then(() => waitForRolloutFlag())
    .then(
      () => (
        (r.hooksModulesSwitchFollowing = void 0),
        markWakeBoundPassed(),
        followHooksModulesRollout(o, e, s) ?? settleHooksModulesWake(o, e, s) ?? void 0
      ),
    )
    .catch(logError)
    .finally(() => {
      if (r.hooksModulesSwitchFollowing === a) r.hooksModulesSwitchFollowing = void 0;
    });
  return ((r.hooksModulesSwitchFollowing = a), a);
}
//@ chunk-7kt7c7a3.js:9826-9903 placement
function D4o() {
  try {
    return (
      hasFreshGrowthBookFeatures() ||
      getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT)
        .source === "payload"
    );
  } catch {
    return !1;
  }
}
//@ chunk-7kt7c7a3.js:9903-9932 placement
var rYr = () =>
  I_n() !== getFeatureValue_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT);
/**
 * 仅在 isManagedPending 时处理：集合未知、加载有错或有未满足插件时记日志保持欠载；否则按 isDecided 更新或清除开关读取状态。
 */
//@ chunk-7kt7c7a3.js:9932-10418 placement
function settleManagedModulesLoad(o) {
  let hooksModulesSwitchRead = o.registry.hooksModulesSwitchRead;
  if (hooksModulesSwitchRead?.isManagedPending !== !0) return !1;
  if (!(o.isSetKnown && o.isLoadFaultless && o.unmet.length === 0))
    return (
      logForDebugging(
        `the load of an organization's hooks modules stays owed: its set ${o.isSetKnown ? "is known" : "is not known yet"}, the load ${o.isLoadFaultless ? "ran" : "did not run faultless"}, ${o.unmet.length} named plugin(s) not found or not loaded`,
      ),
      !1
    );
  return (
    (o.registry.hooksModulesSwitchRead = o.isDecided
      ? { ...hooksModulesSwitchRead, isManagedPending: !1 }
      : void 0),
    !0
  );
}
//@ chunk-7kt7c7a3.js:10418-10500 placement
var L4o = "Your organization's mods could not be loaded, so this turn was not run.";
//@ chunk-7kt7c7a3.js:10500-11539 placement
async function waitForOrganizationMods(o, e, s, r) {
  let n = getPluginRegistry(),
    a = { isEnded: !1 },
    u = { wake: () => {} },
    f = new Set(),
    abortController = new AbortController(),
    p = onGrowthBookRefresh(() => u.wake()),
    subscribe = n.hookRegistrationEnded.subscribe(() => u.wake()),
    h = { hasMoved: !1, passesBefore: 0 },
    E = onLastLoadStatusChanged(() => {
      ((h.hasMoved = !0), (h.passesBefore = n.hookRegistrationEpoch), u.wake());
    }),
    M = () => h.hasMoved && n.hookRegistrationEpoch === h.passesBefore,
    k = { isPassed: !1 },
    C = { isMet: !1 },
    N = () => !a.isEnded && !k.isPassed && !C.isMet && isOrganizationModsLoadPending(),
    mo = sleep(s, abortController.signal).then(() => {
      k.isPassed = !0;
    });
  e.then(() => {
    a.isEnded = !0;
  });
  try {
    while (N()) {
      let K = { isOver: !1 },
        uo = sleep(b, abortController.signal, { unref: !0 }).then(() => {
          K.isOver = !0;
        }),
        po = M(),
        I = Promise.resolve()
          .then(() => o(po))
          .catch(logError);
      h.hasMoved = !1;
      while (N() && !K.isOver && !(M() && f.has(I))) {
        let promise = new Promise((O) => {
            u.wake = O;
          }),
          mapped = [I, n.hooksModulesSwitchFollowing, ...n.hookRegistrationsInFlight]
            .flatMap((O) => (O === void 0 || f.has(O) ? [] : [O]))
            .map((O) => Promise.allSettled([O]).then(() => f.add(O)));
        (await Promise.race([uo, mo, e, promise, ...mapped]),
          (C.isMet = !k.isPassed && f.has(I) && !M() && r()));
      }
    }
    return k.isPassed ? "limit" : C.isMet ? "dead-end" : "released";
  } finally {
    (abortController.abort(), p(), subscribe(), E());
  }
}
//@ chunk-7kt7c7a3.js:11539-11553 placement
var lo = 300000;
//@ chunk-7kt7c7a3.js:11553-11608 placement
var fo = "Waiting for your organization's mods to load.";
/**
 * 按加载状态去重执行组织状态加载。
 */
//@ chunk-7kt7c7a3.js:11608-11942 placement
function runOrganizationStatusLoadOnce(o, e) {
  let s = getPluginRegistry(),
    n = `${hasLoadCycleEnded() ? "ended" : "under way"} since reset ${getSyncCacheResetEpoch()}`,
    a = getLastLoadStatus() ?? n,
    organizationsStatusLoad = s.organizationsStatusLoad;
  if (!e && organizationsStatusLoad?.standing === a) return organizationsStatusLoad.pass;
  let f = Promise.resolve().then(o),
    c = { standing: a, pass: f },
    p = () => {
      if (s.organizationsStatusLoad === c) s.organizationsStatusLoad = void 0;
    };
  return ((s.organizationsStatusLoad = c), f.then(p, p), f);
}
//@ chunk-7kt7c7a3.js:11942-12033 placement
var sYr = "Your organization's policy could not be read, so this session cannot run a turn.";
/**
 * 组织模块仍待加载时：先提示，再等待组织 mods（必要时重读开关），超时则按截止时间重载； 返回 {kind:"start"}（已不再等待）、{kind:"ended"}（回合已结束）或 {kind:"failed", message}。
 */
//@ chunk-7kt7c7a3.js:12033-12549 placement
function waitForOrganizationModsOnClaim(o, e, s, r, n) {
  if (!isOrganizationModsLoadPending()) return null;
  let a = { isEnded: !1 },
    u = { end: "released" },
    f = () => getPluginRegistry().hooksModulesSwitchRead?.isManagedPending === !0,
    c = () => followHooksModulesRollout(o, e, s) ?? settleHooksModulesWake(o, e, s);
  return (
    r.then(() => {
      a.isEnded = !0;
    }),
    Promise.resolve()
      .then(() => e(fo))
      .catch(logError)
      .then(() =>
        waitForOrganizationMods(
          (p) => followRolloutAfterReread(p ? () => runOrganizationStatusLoadOnce(o, !1) : o, e, s),
          r,
          lo,
          n,
        ),
      )
      .then((p) => {
        u.end = p;
      })
      .catch(logError)
      .then(() =>
        !isOrganizationModsLoadPending() && f()
          ? withDeadline(reloadAndReportDroppedModules(s, e, c), x_n)
          : void 0,
      )
      .catch(logError)
      .then(() => {
        let p = u.end === "dead-end";
        if (!isOrganizationModsLoadPending()) return { kind: "start" };
        return a.isEnded ? { kind: "ended" } : { kind: "failed", message: p ? sYr : L4o };
      })
  );
}
/**
 * 启动时初始化开关读取状态为待加载。
 */
//@ chunk-7kt7c7a3.js:12549-12713 placement
function initManagedModulesPending() {
  let o = getPluginRegistry();
  if (o.hooksModulesSwitchRead === void 0 && Le())
    o.hooksModulesSwitchRead = {
      isOn: !1,
      askedAt: 0,
      isLoadOwed: !0,
      isManagedPending: !0,
      isPersonsOut: !1,
    };
}
//@ chunk-7kt7c7a3.js:12713-12774 placement
function Le() {
  try {
    return hooksModulesRefusalReason() === void 0 && BF();
  } catch {
    return !0;
  }
}

export {
  rYr,
  setForegroundTurnBusy,
  hqe,
  runWhenForegroundIdle,
  nYr,
  bni,
  _ni,
  D4o,
  settleManagedModulesLoad,
  watchRolloutSwitchChanges,
  followRolloutSwitchOnce,
  M4o,
  tYr,
  initManagedModulesPending,
  runOrganizationStatusLoadOnce,
  sYr,
  L4o,
  waitForOrganizationModsOnClaim,
};
