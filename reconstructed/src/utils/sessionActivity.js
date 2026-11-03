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
import { getRemoteFeatureGateState, needsGrowthBookRefresh } from "./permissions/yoloClassifier.js";
import { stopNoticeWasSent } from "../tools/AgentTool/backgroundGates.js";

//@ chunk-frha7zp8.js:407-419 sole-consumer
var IDLE_TIMEOUT_MS = 30000;
//@ chunk-frha7zp8.js:419-629 sole-consumer
/**
 * 会话活动状态初始值（引用计数、等待用户数、心跳与空闲计时器）。
 */
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
var SESSION_ACTIVITY_TICK_MS = "cli";
var sessionActivityRegistrySlot = 1000;
//@ chunk-frha7zp8.js:648-1703 sole-consumer
/**
 * 按活动键保存会话活动状态（淘汰时清理计时器）。
 */
class SessionActivityRegistry {
  activityKey = () => SESSION_ACTIVITY_TICK_MS;
  mainLoopActivityListener = null;
  nestedChainDropListener = null;
  workStarted = createSignal();
  statesByKey = new Map();
  evictedKeys = new Set();
  setActivityKey(activityKey) {
    this.activityKey = activityKey;
  }
  currentKey() {
    return this.activityKey();
  }
  stateCount() {
    return this.statesByKey.size;
  }
  currentStateOrCreate() {
    let e = this.activityKey();
    if (this.evictedKeys.has(e)) return null;
    let t = this.statesByKey.get(e);
    if (!t) {
      t = createActivityState();
      this.statesByKey.set(e, t);
    }
    return t;
  }
  currentStateOrNull() {
    return this.statesByKey.get(this.activityKey()) ?? null;
  }
  reset() {
    for (let key of [...this.statesByKey.keys()]) this.evictKey(key);
    this.evictedKeys.clear();
    this.activityKey = () => SESSION_ACTIVITY_TICK_MS;
    this.mainLoopActivityListener = null;
    this.nestedChainDropListener = null;
    this.workStarted.clear();
  }
  evictKey(e) {
    this.evictedKeys.add(e);
    if (this.evictedKeys.size > sessionActivityRegistrySlot) {
      let o = this.evictedKeys.values().next().value;
      if (o !== undefined) this.evictedKeys.delete(o);
    }
    let t = this.statesByKey.get(e);
    if (!t) return;
    if (t.heartbeatTimer !== null) clearInterval(t.heartbeatTimer);
    if (t.idleTimer !== null) clearTimeout(t.idleTimer);
    t.cleanupHandle?.();
    this.statesByKey.delete(e);
  }
}
//@ chunk-frha7zp8.js:1703-1726 sole-consumer
var sessionActivityRegistry = new HostScoped(() => new SessionActivityRegistry());
//@ chunk-frha7zp8.js:1726-1761 affinity
function getSessionActivityState() {
  return sessionActivityRegistry.of(getRootSession().host);
}
//@ chunk-frha7zp8.js:1761-2142 fingerprint = startHeartbeatTimer (0.498)
/**
 * 活动期间定时发送会话保活心跳。
 */
function startHeartbeatTimer(e) {
  clearIdleTimer(e);
  e.heartbeatTimer = setInterval(
    (t) => {
      if (isParkedOnUser(t)) {
        logForDiagnosticsNoPII("debug", "session_keepalive_parked_on_user", {
          refcount: t.refcount,
          parked_on_user: t.parkedOnUser,
        });
        return;
      }
      logForDiagnosticsNoPII("debug", "session_keepalive_heartbeat", {
        refcount: t.refcount,
        main_loop_refcount: t.mainLoopRefcount,
        active: Object.fromEntries(t.activeReasons),
      });
      if (env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES) t.activityCallback?.();
    },
    IDLE_TIMEOUT_MS,
    e,
  );
}
//@ chunk-frha7zp8.js:2142-2278 fingerprint = startIdleTimer (0.764)
/**
 * 活动结束 30 秒后记录 session_idle_30s。
 */
function startIdleTimer(e) {
  clearIdleTimer(e);
  if (e.activityCallback === null) return;
  e.idleTimer = setTimeout(
    (t) => {
      logForDiagnosticsNoPII("info", "session_idle_30s");
      t.idleTimer = null;
    },
    IDLE_TIMEOUT_MS,
    e,
  );
}
//@ chunk-frha7zp8.js:2278-2357 layout
function clearIdleTimer(e) {
  if (e.idleTimer !== null) {
    clearTimeout(e.idleTimer);
    e.idleTimer = null;
  }
}
//@ chunk-frha7zp8.js:2357-2486 layout
/**
 * 设置活动回调；有活动时启动心跳。
 */
function setActivityCallback(activityCallback) {
  let t = getSessionActivityState().currentStateOrCreate();
  if (!t) return;
  t.activityCallback = activityCallback;
  if (t.refcount > 0 && t.heartbeatTimer === null) startHeartbeatTimer(t);
}
//@ chunk-frha7zp8.js:2486-2655 layout
/**
 * 清除活动回调并停止心跳与空闲计时。
 */
function clearActivityCallback() {
  let e = getSessionActivityState().currentStateOrNull();
  if (!e) return;
  e.activityCallback = null;
  if (e.heartbeatTimer !== null) {
    clearInterval(e.heartbeatTimer);
    e.heartbeatTimer = null;
  }
  clearIdleTimer(e);
}
//@ chunk-frha7zp8.js:2655-2767 layout
/**
 * 开启远程保活时立即触发一次活动回调。
 */
function sendKeepaliveNow() {
  let e = getSessionActivityState().currentStateOrNull();
  if (e && env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES) e.activityCallback?.();
}
//@ chunk-frha7zp8.js:2767-2846 layout
function activityCallbackActive() {
  return (getSessionActivityState().currentStateOrNull()?.activityCallback ?? null) !== null;
}
//@ chunk-frha7zp8.js:2846-2893 layout
/**
 * setMainLoopActivityListener：设置主循环活动监听。
 */
function setMainLoopActivityListener(mainLoopActivityListener) {
  getSessionActivityState().mainLoopActivityListener = mainLoopActivityListener;
}
//@ chunk-frha7zp8.js:2893-2939 layout
/**
 * setNestedChainDropListener：设置嵌套链丢弃监听。
 */
function setNestedChainDropListener(nestedChainDropListener) {
  getSessionActivityState().nestedChainDropListener = nestedChainDropListener;
}
//@ chunk-frha7zp8.js:2939-2988 layout
/**
 * notifyNestedChainDropped：通知嵌套链被丢弃。
 */
function notifyNestedChainDropped(taskId) {
  getSessionActivityState().nestedChainDropListener?.(taskId);
}
//@ chunk-frha7zp8.js:2988-3064 layout
function isActivityReasonActive(e) {
  return (getSessionActivityState().currentStateOrNull()?.activeReasons.get(e) ?? 0) > 0;
}
//@ chunk-frha7zp8.js:3064-3158 layout
function hasActiveWork() {
  for (let e of getSessionActivityState().statesByKey.values())
    if (e.refcount > 0 && !isParkedOnUser(e)) return true;
  return false;
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
//@ chunk-frha7zp8.js:3315-4008 fingerprint = startSessionActivity (0.504)
/**
 * 开始会话活动计数，驱动心跳与空闲计时（session_activity_at_shutdown）。
 */
function startSessionActivity(reason, t) {
  let sessionActivityState = getSessionActivityState();
  let n = sessionActivityState.currentStateOrCreate();
  if (!n) return;
  n.refcount++;
  if (t === undefined) {
    n.mainLoopRefcount++;
    sessionActivityState.mainLoopActivityListener?.(n.mainLoopRefcount);
  }
  n.activeReasons.set(reason, (n.activeReasons.get(reason) ?? 0) + 1);
  if (n.refcount === 1) {
    n.oldestActivityStartedAt = Date.now();
    if (n.activityCallback !== null && n.heartbeatTimer === null) startHeartbeatTimer(n);
  }
  if (n.refcount - n.parkedOnUser === 1) sessionActivityState.workStarted.emit();
  if (n.cleanupHandle === null) {
    let ownerKey = sessionActivityState.activityKey();
    n.cleanupHandle = registerCleanup(async () => {
      logForDiagnosticsNoPII("info", "session_activity_at_shutdown", {
        owner_key: ownerKey,
        refcount: n.refcount,
        active: Object.fromEntries(n.activeReasons),
        oldest_activity_ms:
          n.refcount > 0 && n.oldestActivityStartedAt !== null
            ? Date.now() - n.oldestActivityStartedAt
            : null,
      });
    });
  }
}
//@ chunk-frha7zp8.js:4008-4611 placement
/**
 * 结束一次活动（减引用计数，归零时停止心跳并开始空闲计时）。
 */
function endActivity(e, t) {
  let sessionActivityState = getSessionActivityState();
  let n = sessionActivityState.currentStateOrNull();
  if (!n) return;
  if (n.refcount > 0) n.refcount--;
  if (t === undefined)
    if (n.mainLoopRefcount > 0) {
      n.mainLoopRefcount--;
      sessionActivityState.mainLoopActivityListener?.(n.mainLoopRefcount);
    } else
      logForDiagnosticsNoPII("warn", "session_activity_main_loop_underflow", {
        reason: e,
      });
  let s = (n.activeReasons.get(e) ?? 0) - 1;
  if (s > 0) n.activeReasons.set(e, s);
  else n.activeReasons.delete(e);
  if (n.refcount === 0) {
    if (n.parkedOnUser > 0) {
      logForDiagnosticsNoPII("warn", "session_activity_parked_leaked", {
        parked_on_user: n.parkedOnUser,
      });
      n.parkedOnUser = 0;
      n.parkGeneration++;
    }
    if (n.heartbeatTimer !== null) {
      clearInterval(n.heartbeatTimer);
      n.heartbeatTimer = null;
      startIdleTimer(n);
    }
  }
}
//@ chunk-frha7zp8.js:4611-5075 placement
/**
 * 标记正在等待用户（不计入活跃工作），返回释放函数。
 */
function parkOnUser() {
  if (env.CLAUDE_CODE_DISABLE_AWAITING_USER_IDLE) return () => {};
  let sessionActivityState = getSessionActivityState();
  let t = sessionActivityState.currentStateOrNull();
  if (!t) return () => {};
  if (t.parkedOnUser >= t.refcount) {
    logForDiagnosticsNoPII("warn", "session_activity_parked_exceeds_refcount", {
      refcount: t.refcount,
      parked_on_user: t.parkedOnUser,
    });
    return () => {};
  }
  t.parkedOnUser++;
  let parkGeneration = t.parkGeneration;
  let n = false;
  return () => {
    if (n) return;
    n = true;
    if (t.parkGeneration === parkGeneration && t.parkedOnUser > 0) {
      t.parkedOnUser--;
      if (t.refcount - t.parkedOnUser === 1) sessionActivityState.workStarted.emit();
    }
  };
}
//@ chunk-frha7zp8.js:5075-5143 placement
/**
 * currentActivityState：当前活动状态。
 */
function currentActivityState() {
  let e = getSessionActivityState().currentStateOrNull();
  return e !== null && isParkedOnUser(e);
}
//@ chunk-frha7zp8.js:5143-5253 placement
/**
 * 全部活动都在等待用户。
 */
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
    true &&
    getRemoteFeatureGateState(TENGU_ENCAPSULATED_HONEY) === "on"
  );
}
//@ chunk-z4g2ta8k.js:42575-42671 shared-adjacent = sendSessionActivitySignal (1)
function sendSessionActivitySignal_2() {
  return (
    env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES &&
    activityCallbackActive() &&
    getRemoteFeatureGateState(TENGU_ENCAPSULATED_HONEY) === "on" &&
    !needsGrowthBookRefresh() &&
    stopNoticeWasSent()
  );
}
export {
  sendKeepaliveNow,
  notifyNestedChainDropped,
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
  currentActivityState,
  setMainLoopActivityListener,
  setNestedChainDropListener,
};
