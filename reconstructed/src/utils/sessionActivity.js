/**
 * utils/sessionActivity.ts
 *
 * 会话活动计数、保活心跳与空闲计时。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionActivity.ts
 * pieces: chunk-frha7zp8.js (26), chunk-z4g2ta8k.js (3)
 * attribution: sole-consumer 5, affinity 2, fingerprint 4, layout 13, placement 4, shared-adjacent 1
 */
import { createSignal } from "./signal.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getMainQueryRunning } from "../bootstrap/state.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { env } from "./env.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { getRemoteFeatureGateState, jSt } from "./permissions/yoloClassifier.js";
import { P_i } from "../tools/AgentTool/backgroundGates.js";

//@ chunk-frha7zp8.js:407-419 sole-consumer
var u = 30000;
/**
 * 会话活动状态初始值（引用计数、等待用户数、心跳与空闲计时器）。
 */
//@ chunk-frha7zp8.js:419-629 sole-consumer
function createActivityState() {
  return {
    activityCallback: null,
    refcount: 0,
    mainLoopRefcount: 0,
    parkedOnUser: 0,
    parkGeneration: 0,
    activeReasons: new Map(),
    oldestActivityStartedAt: null,
    heartbeatTimer: null,
    idleTimer: null,
    cleanupHandle: null,
  };
}
//@ chunk-frha7zp8.js:629-648 sole-consumer = getClientSurface (0.78)
var CLI = "cli",
  f = 1000;
/**
 * 按活动键保存会话活动状态（淘汰时清理计时器）。
 */
//@ chunk-frha7zp8.js:648-1703 sole-consumer
class SessionActivityRegistry {
  activityKey = () => CLI;
  mainLoopActivityListener = null;
  nestedChainDropListener = null;
  workStarted = createSignal();
  statesByKey = new Map();
  evictedKeys = new Set();
  setActivityKey(e) {
    this.activityKey = e;
  }
  currentKey() {
    return this.activityKey();
  }
  stateCount() {
    return this.statesByKey.size;
  }
  currentStateOrCreate() {
    let activityKey = this.activityKey();
    if (this.evictedKeys.has(activityKey)) return null;
    let t = this.statesByKey.get(activityKey);
    if (!t) ((t = createActivityState()), this.statesByKey.set(activityKey, t));
    return t;
  }
  currentStateOrNull() {
    return this.statesByKey.get(this.activityKey()) ?? null;
  }
  reset() {
    for (let e of [...this.statesByKey.keys()]) this.evictKey(e);
    (this.evictedKeys.clear(),
      (this.activityKey = () => CLI),
      (this.mainLoopActivityListener = null),
      (this.nestedChainDropListener = null),
      this.workStarted.clear());
  }
  evictKey(e) {
    if ((this.evictedKeys.add(e), this.evictedKeys.size > f)) {
      let o = this.evictedKeys.values().next().value;
      if (o !== void 0) this.evictedKeys.delete(o);
    }
    let t = this.statesByKey.get(e);
    if (!t) return;
    if (t.heartbeatTimer !== null) clearInterval(t.heartbeatTimer);
    if (t.idleTimer !== null) clearTimeout(t.idleTimer);
    (t.cleanupHandle?.(), this.statesByKey.delete(e));
  }
}
//@ chunk-frha7zp8.js:1703-1726 sole-consumer
var p = new HostScoped(() => new SessionActivityRegistry());
//@ chunk-frha7zp8.js:1726-1761 affinity
function getSessionActivityState() {
  return p.of(getRootSession().host);
}
/**
 * 活动期间定时发送会话保活心跳。
 */
//@ chunk-frha7zp8.js:1761-2142 fingerprint = startHeartbeatTimer (0.498)
function startHeartbeatTimer(e) {
  (clearIdleTimer(e),
    (e.heartbeatTimer = setInterval(
      (t) => {
        if (isParkedOnUser(t)) {
          logForDiagnosticsNoPII("debug", "session_keepalive_parked_on_user", {
            refcount: t.refcount,
            parked_on_user: t.parkedOnUser,
          });
          return;
        }
        if (
          (logForDiagnosticsNoPII("debug", "session_keepalive_heartbeat", {
            refcount: t.refcount,
            main_loop_refcount: t.mainLoopRefcount,
            active: Object.fromEntries(t.activeReasons),
          }),
          env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES)
        )
          t.activityCallback?.();
      },
      u,
      e,
    )));
}
/**
 * 活动结束 30 秒后记录 session_idle_30s。
 */
//@ chunk-frha7zp8.js:2142-2278 fingerprint = startIdleTimer (0.764)
function startIdleTimer(e) {
  if ((clearIdleTimer(e), e.activityCallback === null)) return;
  e.idleTimer = setTimeout(
    (t) => {
      (logForDiagnosticsNoPII("info", "session_idle_30s"), (t.idleTimer = null));
    },
    u,
    e,
  );
}
//@ chunk-frha7zp8.js:2278-2357 layout
function clearIdleTimer(e) {
  if (e.idleTimer !== null) (clearTimeout(e.idleTimer), (e.idleTimer = null));
}
/**
 * 设置活动回调；有活动时启动心跳。
 */
//@ chunk-frha7zp8.js:2357-2486 layout
function setActivityCallback(e) {
  let currentStateOrCreate = getSessionActivityState().currentStateOrCreate();
  if (!currentStateOrCreate) return;
  if (
    ((currentStateOrCreate.activityCallback = e),
    currentStateOrCreate.refcount > 0 && currentStateOrCreate.heartbeatTimer === null)
  )
    startHeartbeatTimer(currentStateOrCreate);
}
/**
 * 清除活动回调并停止心跳与空闲计时。
 */
//@ chunk-frha7zp8.js:2486-2655 layout
function clearActivityCallback() {
  let currentStateOrNull = getSessionActivityState().currentStateOrNull();
  if (!currentStateOrNull) return;
  if (((currentStateOrNull.activityCallback = null), currentStateOrNull.heartbeatTimer !== null))
    (clearInterval(currentStateOrNull.heartbeatTimer), (currentStateOrNull.heartbeatTimer = null));
  clearIdleTimer(currentStateOrNull);
}
/**
 * 开启远程保活时立即触发一次活动回调。
 */
//@ chunk-frha7zp8.js:2655-2767 layout
function sendKeepaliveNow() {
  let currentStateOrNull = getSessionActivityState().currentStateOrNull();
  if (currentStateOrNull && env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES) currentStateOrNull.activityCallback?.();
}
//@ chunk-frha7zp8.js:2767-2846 layout
function z_i() {
  return (getSessionActivityState().currentStateOrNull()?.activityCallback ?? null) !== null;
}
//@ chunk-frha7zp8.js:2846-2893 layout
function rns(e) {
  getSessionActivityState().mainLoopActivityListener = e;
}
//@ chunk-frha7zp8.js:2893-2939 layout
function ons(e) {
  getSessionActivityState().nestedChainDropListener = e;
}
//@ chunk-frha7zp8.js:2939-2988 layout
function K_i(e) {
  getSessionActivityState().nestedChainDropListener?.(e);
}
//@ chunk-frha7zp8.js:2988-3064 layout
function isActivityReasonActive(e) {
  return (getSessionActivityState().currentStateOrNull()?.activeReasons.get(e) ?? 0) > 0;
}
//@ chunk-frha7zp8.js:3064-3158 layout
function hasActiveWork() {
  for (let e of getSessionActivityState().statesByKey.values())
    if (e.refcount > 0 && !isParkedOnUser(e)) return !0;
  return !1;
}
//@ chunk-frha7zp8.js:3158-3210 layout
function onWorkStarted(e) {
  return getSessionActivityState().workStarted.subscribe(e);
}
//@ chunk-frha7zp8.js:3210-3278 layout
function getMainLoopRefcount() {
  return getSessionActivityState().currentStateOrNull()?.mainLoopRefcount ?? 0;
}
//@ chunk-frha7zp8.js:3278-3315 layout
function isSessionActive() {
  return getMainQueryRunning() || getMainLoopRefcount() > 0;
}
/**
 * 开始会话活动计数，驱动心跳与空闲计时（session_activity_at_shutdown）。
 */
//@ chunk-frha7zp8.js:3315-4008 fingerprint = startSessionActivity (0.504)
function startSessionActivity(e, t) {
  let o = getSessionActivityState(),
    currentStateOrCreate = o.currentStateOrCreate();
  if (!currentStateOrCreate) return;
  if ((currentStateOrCreate.refcount++, t === void 0))
    (currentStateOrCreate.mainLoopRefcount++,
      o.mainLoopActivityListener?.(currentStateOrCreate.mainLoopRefcount));
  if (
    (currentStateOrCreate.activeReasons.set(e, (currentStateOrCreate.activeReasons.get(e) ?? 0) + 1),
    currentStateOrCreate.refcount === 1)
  ) {
    if (
      ((currentStateOrCreate.oldestActivityStartedAt = Date.now()),
      currentStateOrCreate.activityCallback !== null && currentStateOrCreate.heartbeatTimer === null)
    )
      startHeartbeatTimer(currentStateOrCreate);
  }
  if (currentStateOrCreate.refcount - currentStateOrCreate.parkedOnUser === 1) o.workStarted.emit();
  if (currentStateOrCreate.cleanupHandle === null) {
    let activityKey = o.activityKey();
    currentStateOrCreate.cleanupHandle = registerCleanup(async () => {
      logForDiagnosticsNoPII("info", "session_activity_at_shutdown", {
        owner_key: activityKey,
        refcount: currentStateOrCreate.refcount,
        active: Object.fromEntries(currentStateOrCreate.activeReasons),
        oldest_activity_ms:
          currentStateOrCreate.refcount > 0 && currentStateOrCreate.oldestActivityStartedAt !== null
            ? Date.now() - currentStateOrCreate.oldestActivityStartedAt
            : null,
      });
    });
  }
}
/**
 * 结束一次活动（减引用计数，归零时停止心跳并开始空闲计时）。
 */
//@ chunk-frha7zp8.js:4008-4611 placement
function endActivity(e, t) {
  let o = getSessionActivityState(),
    currentStateOrNull = o.currentStateOrNull();
  if (!currentStateOrNull) return;
  if (currentStateOrNull.refcount > 0) currentStateOrNull.refcount--;
  if (t === void 0)
    if (currentStateOrNull.mainLoopRefcount > 0)
      (currentStateOrNull.mainLoopRefcount--,
        o.mainLoopActivityListener?.(currentStateOrNull.mainLoopRefcount));
    else logForDiagnosticsNoPII("warn", "session_activity_main_loop_underflow", { reason: e });
  let s = (currentStateOrNull.activeReasons.get(e) ?? 0) - 1;
  if (s > 0) currentStateOrNull.activeReasons.set(e, s);
  else currentStateOrNull.activeReasons.delete(e);
  if (currentStateOrNull.refcount === 0) {
    if (currentStateOrNull.parkedOnUser > 0)
      (logForDiagnosticsNoPII("warn", "session_activity_parked_leaked", {
        parked_on_user: currentStateOrNull.parkedOnUser,
      }),
        (currentStateOrNull.parkedOnUser = 0),
        currentStateOrNull.parkGeneration++);
    if (currentStateOrNull.heartbeatTimer !== null)
      (clearInterval(currentStateOrNull.heartbeatTimer),
        (currentStateOrNull.heartbeatTimer = null),
        startIdleTimer(currentStateOrNull));
  }
}
/**
 * 标记正在等待用户（不计入活跃工作），返回释放函数。
 */
//@ chunk-frha7zp8.js:4611-5075 placement
function parkOnUser() {
  if (env.CLAUDE_CODE_DISABLE_AWAITING_USER_IDLE) return () => {};
  let e = getSessionActivityState(),
    currentStateOrNull = e.currentStateOrNull();
  if (!currentStateOrNull) return () => {};
  if (currentStateOrNull.parkedOnUser >= currentStateOrNull.refcount)
    return (
      logForDiagnosticsNoPII("warn", "session_activity_parked_exceeds_refcount", {
        refcount: currentStateOrNull.refcount,
        parked_on_user: currentStateOrNull.parkedOnUser,
      }),
      () => {}
    );
  currentStateOrNull.parkedOnUser++;
  let parkGeneration = currentStateOrNull.parkGeneration,
    n = !1;
  return () => {
    if (n) return;
    if (
      ((n = !0), currentStateOrNull.parkGeneration === parkGeneration && currentStateOrNull.parkedOnUser > 0)
    ) {
      if (
        (currentStateOrNull.parkedOnUser--,
        currentStateOrNull.refcount - currentStateOrNull.parkedOnUser === 1)
      )
        e.workStarted.emit();
    }
  };
}
//@ chunk-frha7zp8.js:5075-5143 placement
function V_i() {
  let currentStateOrNull = getSessionActivityState().currentStateOrNull();
  return currentStateOrNull !== null && isParkedOnUser(currentStateOrNull);
}
/**
 * 全部活动都在等待用户。
 */
//@ chunk-frha7zp8.js:5143-5253 placement
function isParkedOnUser(e) {
  return (
    !env.CLAUDE_CODE_DISABLE_AWAITING_USER_IDLE && e.parkedOnUser > 0 && e.refcount - e.parkedOnUser <= 0
  );
}
//@ chunk-z4g2ta8k.js:42463-42497 affinity
var TENGU_ENCAPSULATED_HONEY = "tengu_encapsulated_honey";
//@ chunk-z4g2ta8k.js:42497-42575 fingerprint = sendSessionActivitySignal (1)
function sendSessionActivitySignal() {
  return (
    env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES &&
    !0 &&
    getRemoteFeatureGateState(TENGU_ENCAPSULATED_HONEY) === "on"
  );
}
//@ chunk-z4g2ta8k.js:42575-42671 shared-adjacent = sendSessionActivitySignal (1)
function sendSessionActivitySignal_2() {
  return (
    env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES &&
    z_i() &&
    getRemoteFeatureGateState(TENGU_ENCAPSULATED_HONEY) === "on" &&
    !jSt() &&
    P_i()
  );
}

export {
  sendKeepaliveNow,
  K_i,
  isActivityReasonActive,
  getMainLoopRefcount,
  parkOnUser,
  sendSessionActivitySignal_2,
  sendSessionActivitySignal,
  startSessionActivity,
  endActivity,
  onWorkStarted,
  hasActiveWork,
  setActivityCallback,
  clearActivityCallback,
  isSessionActive,
  V_i,
  rns,
  ons,
};
