/**
 * utils/sessionActivity.ts
 *
 * 会话活动计数、保活心跳与空闲计时。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionActivity.ts
 * pieces: chunk-1kk50rk6.js (3), chunk-eknyxrgq.js (28)
 * attribution: affinity 2, fingerprint 4, shared-adjacent 1, sole-consumer 5, layout 15, placement 4
 */
import { createSignal } from "./signal.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getMainQueryRunning } from "../bootstrap/state.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { env } from "./env.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { getRemoteFeatureGateState, needsGrowthBookRefresh } from "./permissions/yoloClassifier.js";
import { stopNoticeWasSent } from "../tools/AgentTool/backgroundGates.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-eknyxrgq.js:407-419 sole-consumer
var IDLE_TIMEOUT_MS = 30000;
//@ chunk-eknyxrgq.js:419-629 sole-consumer
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
//@ chunk-eknyxrgq.js:629-648 sole-consumer (2.1.88 match: getClientSurface, 0.779)
var SESSION_ACTIVITY_KEY = "cli";
var SESSION_ACTIVITY_TICK_MS = 1000;
//@ chunk-eknyxrgq.js:648-1747 sole-consumer
/**
 * 按活动键保存会话活动状态（淘汰时清理计时器）。
 */
class SessionActivityRegistry {
  activityKey = () => SESSION_ACTIVITY_KEY;
  mainLoopActivityListener = null;
  nestedChainDropListener = null;
  workStarted = createSignal();
  processSlept = createSignal();
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
    let key = this.activityKey();
    if (this.evictedKeys.has(key)) return null;
    let state = this.statesByKey.get(key);
    if (!state) {
      state = createActivityState();
      this.statesByKey.set(key, state);
    }
    return state;
  }
  currentStateOrNull() {
    return this.statesByKey.get(this.activityKey()) ?? null;
  }
  reset() {
    for (let key of [...this.statesByKey.keys()]) this.evictKey(key);
    this.evictedKeys.clear();
    this.activityKey = () => SESSION_ACTIVITY_KEY;
    this.mainLoopActivityListener = null;
    this.nestedChainDropListener = null;
    this.workStarted.clear();
    this.processSlept.clear();
  }
  evictKey(key) {
    this.evictedKeys.add(key);
    if (this.evictedKeys.size > SESSION_ACTIVITY_TICK_MS) {
      let evicted = this.evictedKeys.values().next().value;
      if (evicted !== undefined) this.evictedKeys.delete(evicted);
    }
    let state = this.statesByKey.get(key);
    if (!state) return;
    if (state.heartbeatTimer !== null) clearInterval(state.heartbeatTimer);
    if (state.idleTimer !== null) clearTimeout(state.idleTimer);
    state.cleanupHandle?.();
    this.statesByKey.delete(key);
  }
}
//@ chunk-eknyxrgq.js:1747-1770 sole-consumer
var sessionActivityRegistry; // deferred: uses SessionActivityRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-eknyxrgq.js:1747", () => {
  sessionActivityRegistry = new HostScoped(() => new SessionActivityRegistry());
});
//@ chunk-eknyxrgq.js:1770-1805 affinity
function getSessionActivityState() {
  return sessionActivityRegistry.of(getRootSession().host);
}
//@ chunk-eknyxrgq.js:1805-2186 fingerprint (2.1.88 match: startHeartbeatTimer, 0.498)
/**
 * 活动期间定时发送会话保活心跳。
 */
function startHeartbeatTimer(state) {
  clearIdleTimer(state);
  state.heartbeatTimer = setInterval(
    (state) => {
      if (isParkedOnUser(state)) {
        logForDiagnosticsNoPII("debug", "session_keepalive_parked_on_user", {
          refcount: state.refcount,
          parked_on_user: state.parkedOnUser,
        });
        return;
      }
      logForDiagnosticsNoPII("debug", "session_keepalive_heartbeat", {
        refcount: state.refcount,
        main_loop_refcount: state.mainLoopRefcount,
        active: Object.fromEntries(state.activeReasons),
      });
      if (env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES) state.activityCallback?.();
    },
    IDLE_TIMEOUT_MS,
    state,
  );
}
//@ chunk-eknyxrgq.js:2186-2322 fingerprint (2.1.88 match: startIdleTimer, 0.764)
/**
 * 活动结束 30 秒后记录 session_idle_30s。
 */
function startIdleTimer(state) {
  clearIdleTimer(state);
  if (state.activityCallback === null) return;
  state.idleTimer = setTimeout(
    (state) => {
      logForDiagnosticsNoPII("info", "session_idle_30s");
      state.idleTimer = null;
    },
    IDLE_TIMEOUT_MS,
    state,
  );
}
//@ chunk-eknyxrgq.js:2322-2401 layout
function clearIdleTimer(state) {
  if (state.idleTimer !== null) {
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
  }
}
//@ chunk-eknyxrgq.js:2401-2530 layout
/**
 * 设置活动回调；有活动时启动心跳。
 */
function setActivityCallback(activityCallback) {
  let state = getSessionActivityState().currentStateOrCreate();
  if (!state) return;
  state.activityCallback = activityCallback;
  if (state.refcount > 0 && state.heartbeatTimer === null) startHeartbeatTimer(state);
}
//@ chunk-eknyxrgq.js:2530-2699 layout
/**
 * 清除活动回调并停止心跳与空闲计时。
 */
function clearActivityCallback() {
  let state = getSessionActivityState().currentStateOrNull();
  if (!state) return;
  state.activityCallback = null;
  if (state.heartbeatTimer !== null) {
    clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
  clearIdleTimer(state);
}
//@ chunk-eknyxrgq.js:2699-2811 layout
/**
 * 开启远程保活时立即触发一次活动回调。
 */
function sendKeepaliveNow() {
  let state = getSessionActivityState().currentStateOrNull();
  if (state && env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES) state.activityCallback?.();
}
//@ chunk-eknyxrgq.js:2811-2890 layout
function activityCallbackActive() {
  return (getSessionActivityState().currentStateOrNull()?.activityCallback ?? null) !== null;
}
//@ chunk-eknyxrgq.js:2890-2937 layout
/**
 * setMainLoopActivityListener：设置主循环活动监听。
 */
function setMainLoopActivityListener(mainLoopActivityListener) {
  getSessionActivityState().mainLoopActivityListener = mainLoopActivityListener;
}
//@ chunk-eknyxrgq.js:2937-2983 layout
/**
 * setNestedChainDropListener：设置嵌套链丢弃监听。
 */
function setNestedChainDropListener(nestedChainDropListener) {
  getSessionActivityState().nestedChainDropListener = nestedChainDropListener;
}
//@ chunk-eknyxrgq.js:2983-3032 layout
/**
 * notifyNestedChainDropped：通知嵌套链被丢弃。
 */
function notifyNestedChainDropped(taskId) {
  getSessionActivityState().nestedChainDropListener?.(taskId);
}
//@ chunk-eknyxrgq.js:3032-3108 layout
function isActivityReasonActive(reason) {
  return (getSessionActivityState().currentStateOrNull()?.activeReasons.get(reason) ?? 0) > 0;
}
//@ chunk-eknyxrgq.js:3108-3202 layout
function hasActiveWork() {
  for (let state of getSessionActivityState().statesByKey.values())
    if (state.refcount > 0 && !isParkedOnUser(state)) return true;
  return false;
}
//@ chunk-eknyxrgq.js:3202-3254 layout
function onWorkStarted(listener) {
  return getSessionActivityState().workStarted.subscribe(listener);
}
//@ chunk-eknyxrgq.js:3254-3307 layout
function onProcessSlept(handler) {
  return getSessionActivityState().processSlept.subscribe(handler);
}
//@ chunk-eknyxrgq.js:3307-3348 layout
function emitProcessSlept(event) {
  getSessionActivityState().processSlept.emit(event);
}
//@ chunk-eknyxrgq.js:3348-3416 layout
function getMainLoopRefcount() {
  return getSessionActivityState().currentStateOrNull()?.mainLoopRefcount ?? 0;
}
//@ chunk-eknyxrgq.js:3416-3453 layout
function isSessionActive() {
  return getMainQueryRunning() || getMainLoopRefcount() > 0;
}
//@ chunk-eknyxrgq.js:3453-4146 fingerprint (2.1.88 match: startSessionActivity, 0.503)
/**
 * 开始会话活动计数，驱动心跳与空闲计时（session_activity_at_shutdown）。
 */
function startSessionActivity(reason, owner) {
  let sessionActivityState = getSessionActivityState();
  let state = sessionActivityState.currentStateOrCreate();
  if (!state) return;
  state.refcount++;
  if (owner === undefined) {
    state.mainLoopRefcount++;
    sessionActivityState.mainLoopActivityListener?.(state.mainLoopRefcount);
  }
  state.activeReasons.set(reason, (state.activeReasons.get(reason) ?? 0) + 1);
  if (state.refcount === 1) {
    state.oldestActivityStartedAt = Date.now();
    if (state.activityCallback !== null && state.heartbeatTimer === null) startHeartbeatTimer(state);
  }
  if (state.refcount - state.parkedOnUser === 1) sessionActivityState.workStarted.emit();
  if (state.cleanupHandle === null) {
    let ownerKey = sessionActivityState.activityKey();
    state.cleanupHandle = registerCleanup(async () => {
      logForDiagnosticsNoPII("info", "session_activity_at_shutdown", {
        owner_key: ownerKey,
        refcount: state.refcount,
        active: Object.fromEntries(state.activeReasons),
        oldest_activity_ms:
          state.refcount > 0 && state.oldestActivityStartedAt !== null
            ? Date.now() - state.oldestActivityStartedAt
            : null,
      });
    });
  }
}
//@ chunk-eknyxrgq.js:4146-4749 placement
/**
 * 结束一次活动（减引用计数，归零时停止心跳并开始空闲计时）。
 */
function endActivity(reason, owner) {
  let sessionActivityState = getSessionActivityState();
  let state = sessionActivityState.currentStateOrNull();
  if (!state) return;
  if (state.refcount > 0) state.refcount--;
  if (owner === undefined)
    if (state.mainLoopRefcount > 0) {
      state.mainLoopRefcount--;
      sessionActivityState.mainLoopActivityListener?.(state.mainLoopRefcount);
    } else
      logForDiagnosticsNoPII("warn", "session_activity_main_loop_underflow", {
        reason,
      });
  let remaining = (state.activeReasons.get(reason) ?? 0) - 1;
  if (remaining > 0) state.activeReasons.set(reason, remaining);
  else state.activeReasons.delete(reason);
  if (state.refcount === 0) {
    if (state.parkedOnUser > 0) {
      logForDiagnosticsNoPII("warn", "session_activity_parked_leaked", {
        parked_on_user: state.parkedOnUser,
      });
      state.parkedOnUser = 0;
      state.parkGeneration++;
    }
    if (state.heartbeatTimer !== null) {
      clearInterval(state.heartbeatTimer);
      state.heartbeatTimer = null;
      startIdleTimer(state);
    }
  }
}
//@ chunk-eknyxrgq.js:4749-5213 placement
/**
 * 标记正在等待用户（不计入活跃工作），返回释放函数。
 */
function parkOnUser() {
  if (env.CLAUDE_CODE_DISABLE_AWAITING_USER_IDLE) return () => {};
  let sessionActivityState = getSessionActivityState();
  let state = sessionActivityState.currentStateOrNull();
  if (!state) return () => {};
  if (state.parkedOnUser >= state.refcount) {
    logForDiagnosticsNoPII("warn", "session_activity_parked_exceeds_refcount", {
      refcount: state.refcount,
      parked_on_user: state.parkedOnUser,
    });
    return () => {};
  }
  state.parkedOnUser++;
  let parkGeneration = state.parkGeneration;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (state.parkGeneration === parkGeneration && state.parkedOnUser > 0) {
      state.parkedOnUser--;
      if (state.refcount - state.parkedOnUser === 1) sessionActivityState.workStarted.emit();
    }
  };
}
//@ chunk-eknyxrgq.js:5213-5281 placement
/**
 * currentActivityState：当前活动状态。
 */
function currentActivityState() {
  let state = getSessionActivityState().currentStateOrNull();
  return state !== null && isParkedOnUser(state);
}
//@ chunk-eknyxrgq.js:5281-5391 placement
/**
 * 全部活动都在等待用户。
 */
function isParkedOnUser(state) {
  return (
    !env.CLAUDE_CODE_DISABLE_AWAITING_USER_IDLE &&
    state.parkedOnUser > 0 &&
    state.refcount - state.parkedOnUser <= 0
  );
}
//@ chunk-1kk50rk6.js:45367-45401 affinity
var TENGU_ENCAPSULATED_HONEY = "tengu_encapsulated_honey";
//@ chunk-1kk50rk6.js:45401-45479 fingerprint (2.1.88 match: sendSessionActivitySignal, 1)
function sendSessionActivitySignal() {
  return (
    env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES &&
    true &&
    getRemoteFeatureGateState(TENGU_ENCAPSULATED_HONEY) === "on"
  );
}
//@ chunk-1kk50rk6.js:45479-45575 shared-adjacent (2.1.88 match: sendSessionActivitySignal, 1)
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
  startSessionActivity,
  endActivity,
  sendSessionActivitySignal_2,
  sendSessionActivitySignal,
  parkOnUser,
  sendKeepaliveNow,
  isSessionActive,
  hasActiveWork,
  setMainLoopActivityListener,
  getMainLoopRefcount,
  setNestedChainDropListener,
  onProcessSlept,
  isActivityReasonActive,
  onWorkStarted,
  emitProcessSlept,
  notifyNestedChainDropped,
  currentActivityState,
  setActivityCallback,
  clearActivityCallback,
};
