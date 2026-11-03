/**
 * tasks/taskLoopRegistry.ts
 *
 * 2.1.316 新增：进程内任务循环登记。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (15)
 * attribution: placement 15
 */
import { HostScoped } from "../utils/hostScoped.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { logError } from "../utils/log.js";

/**
 * 进程内任务循环登记：存活进程、待停止代理、曾注册过的任务、每个任务的循环（kill 控制器、子代理 AbortController、settle 回调）。
 */
//@ chunk-6vnxsn99.js:3428-3922 placement
class TaskLoopRegistryState {
  liveProcessesByAgentId = new Map();
  stopPendingAgentIds = new Set();
  everRegisteredTaskIds = new Set();
  loopsByTaskId = new Map();
  pendingEscalationsByTaskId = new Map();
  inFlightProcessSweeps = new Set();
  dispose() {
    for (let e of this.pendingEscalationsByTaskId.values()) for (let timer of e.timers) clearTimeout(timer);
    (this.pendingEscalationsByTaskId.clear(),
      this.inFlightProcessSweeps.clear(),
      this.loopsByTaskId.clear(),
      this.everRegisteredTaskIds.clear(),
      this.liveProcessesByAgentId.clear(),
      this.stopPendingAgentIds.clear());
  }
}
//@ chunk-6vnxsn99.js:3922-3947 placement
var vn = new HostScoped(() => new TaskLoopRegistryState());
//@ chunk-6vnxsn99.js:3947-3975 placement
function getTaskLoopRegistry() {
  return onProcessRootHost(vn);
}
//@ chunk-6vnxsn99.js:3975-4032 placement
function wasTaskEverRegistered(e) {
  return getTaskLoopRegistry().everRegisteredTaskIds.has(e);
}
//@ chunk-6vnxsn99.js:4032-4494 placement
function registerTaskLoop(e, n, r = {}) {
  let { everRegisteredTaskIds: everRegisteredTaskIds, loopsByTaskId: loopsByTaskId } = getTaskLoopRegistry();
  everRegisteredTaskIds.add(e);
  let a = loopsByTaskId.get(e);
  if (a) (loopsByTaskId.delete(e), Re(a));
  let u = {
    killController: n,
    agentControllersByAgentId: new Map(),
    settleCallbacks: [],
    settleRequiresEmptyAgentAssociations: r.settleRequiresEmptyAgentAssociations ?? !1,
    chainSettled: !1,
  };
  return (
    loopsByTaskId.set(e, u),
    () => {
      if (loopsByTaskId.get(e) !== u) return;
      if (
        ((u.chainSettled = !0),
        u.settleRequiresEmptyAgentAssociations && u.agentControllersByAgentId.size > 0)
      )
        return;
      (loopsByTaskId.delete(e), Re(u));
    }
  );
}
//@ chunk-6vnxsn99.js:4494-4563 placement
function Re(e) {
  for (let settleCallback of e.settleCallbacks)
    try {
      settleCallback();
    } catch (error) {
      logError(error);
    }
}
//@ chunk-6vnxsn99.js:4563-4611 placement
function isTaskLoopSettled(e) {
  return !getTaskLoopRegistry().loopsByTaskId.has(e);
}
//@ chunk-6vnxsn99.js:4611-4660 placement
function getTaskLoop(e) {
  return getTaskLoopRegistry().loopsByTaskId.get(e);
}
//@ chunk-6vnxsn99.js:4660-4772 placement
function onTaskLoopSettled(e, n) {
  let r = getTaskLoopRegistry().loopsByTaskId.get(e);
  if (!r) {
    try {
      n();
    } catch (error) {
      logError(error);
    }
    return;
  }
  r.settleCallbacks.push(n);
}
//@ chunk-6vnxsn99.js:4772-4837 placement
function getTaskKillController(e) {
  return getTaskLoopRegistry().loopsByTaskId.get(e)?.killController;
}
//@ chunk-6vnxsn99.js:4837-4919 placement
function setAgentController(e, n, r) {
  getTaskLoopRegistry().loopsByTaskId.get(e)?.agentControllersByAgentId.set(n, r);
}
//@ chunk-6vnxsn99.js:4919-5139 placement
function removeAgentController(e, n) {
  let { loopsByTaskId: loopsByTaskId } = getTaskLoopRegistry(),
    o = loopsByTaskId.get(e);
  if (!o) return;
  if (
    (o.agentControllersByAgentId.delete(n),
    o.chainSettled && o.settleRequiresEmptyAgentAssociations && o.agentControllersByAgentId.size === 0)
  )
    (loopsByTaskId.delete(e), Re(o));
}
//@ chunk-6vnxsn99.js:5139-5239 placement
function taskAgentIds(e) {
  let n = getTaskLoopRegistry().loopsByTaskId.get(e);
  return n ? [...n.agentControllersByAgentId.keys()] : [];
}
//@ chunk-6vnxsn99.js:5239-5404 placement
function liveAgentControllers(e) {
  let n = getTaskLoopRegistry().loopsByTaskId.get(e);
  if (!n) return [];
  let r = [];
  for (let o of n.agentControllersByAgentId.values()) if (o && !o.signal.aborted) r.push(o);
  return r;
}
//@ chunk-6vnxsn99.js:5404-5777 placement
var UNLIMITED_RATE_LIMITER = {
    tryConsume() {
      return !0;
    },
    msUntilNextCall() {
      return 0;
    },
    refillsPerHour() {
      return 0;
    },
  },
  u2 = {
    register() {},
    update() {},
    updateTranscript() {},
    getTranscript() {
      return;
    },
    remove() {},
    evictTerminal() {},
    applyOffsetsAndEvict() {},
    get() {
      return;
    },
    all() {
      return {};
    },
    getWebSearchBudget() {
      return UNLIMITED_RATE_LIMITER;
    },
    resetWebSearchBudget() {},
    takeConcurrencySlot() {
      return () => {};
    },
    getConcurrentSubagents() {
      return 0;
    },
  };

export {
  registerTaskLoop,
  setAgentController,
  isTaskLoopSettled,
  getTaskKillController,
  liveAgentControllers,
  taskAgentIds,
  u2,
  wasTaskEverRegistered,
  onTaskLoopSettled,
  removeAgentController,
  getTaskLoopRegistry,
  getTaskLoop,
};
