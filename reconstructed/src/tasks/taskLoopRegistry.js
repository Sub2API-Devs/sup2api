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

//@ chunk-6vnxsn99.js:3428-3922 placement
/**
 * 进程内任务循环登记：存活进程、待停止代理、曾注册过的任务、每个任务的循环（kill 控制器、子代理 AbortController、settle 回调）。
 */
class TaskLoopRegistryState {
  liveProcessesByAgentId = new Map();
  stopPendingAgentIds = new Set();
  everRegisteredTaskIds = new Set();
  loopsByTaskId = new Map();
  pendingEscalationsByTaskId = new Map();
  inFlightProcessSweeps = new Set();
  dispose() {
    for (let e of this.pendingEscalationsByTaskId.values()) for (let timer of e.timers) clearTimeout(timer);
    this.pendingEscalationsByTaskId.clear();
    this.inFlightProcessSweeps.clear();
    this.loopsByTaskId.clear();
    this.everRegisteredTaskIds.clear();
    this.liveProcessesByAgentId.clear();
    this.stopPendingAgentIds.clear();
  }
}
//@ chunk-6vnxsn99.js:3922-3947 placement
/**
 * 按 host 保存的任务循环注册表。
 */
var taskLoopRegistrySlots = new HostScoped(() => new TaskLoopRegistryState());
//@ chunk-6vnxsn99.js:3947-3975 placement
function getTaskLoopRegistry() {
  return onProcessRootHost(taskLoopRegistrySlots);
}
//@ chunk-6vnxsn99.js:3975-4032 placement
function wasTaskEverRegistered(e) {
  return getTaskLoopRegistry().everRegisteredTaskIds.has(e);
}
//@ chunk-6vnxsn99.js:4032-4494 placement
function registerTaskLoop(e, killController, r = {}) {
  let { everRegisteredTaskIds, loopsByTaskId } = getTaskLoopRegistry();
  everRegisteredTaskIds.add(e);
  let a = loopsByTaskId.get(e);
  if (a) {
    loopsByTaskId.delete(e);
    runSettleCallbacks(a);
  }
  let u = {
    killController,
    agentControllersByAgentId: new Map(),
    settleCallbacks: [],
    settleRequiresEmptyAgentAssociations: r.settleRequiresEmptyAgentAssociations ?? false,
    chainSettled: false,
  };
  loopsByTaskId.set(e, u);
  return () => {
    if (loopsByTaskId.get(e) !== u) return;
    u.chainSettled = true;
    if (u.settleRequiresEmptyAgentAssociations && u.agentControllersByAgentId.size > 0) return;
    loopsByTaskId.delete(e);
    runSettleCallbacks(u);
  };
}
//@ chunk-6vnxsn99.js:4494-4563 placement
/**
 * 依次执行注册的结算回调，异常只记录。
 */
function runSettleCallbacks(e) {
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
function onTaskLoopSettled(taskId, n) {
  let r = getTaskLoopRegistry().loopsByTaskId.get(taskId);
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
function setAgentController(taskId, n, r) {
  getTaskLoopRegistry().loopsByTaskId.get(taskId)?.agentControllersByAgentId.set(n, r);
}
//@ chunk-6vnxsn99.js:4919-5139 placement
function removeAgentController(taskId, n) {
  let { loopsByTaskId } = getTaskLoopRegistry();
  let o = loopsByTaskId.get(taskId);
  if (!o) return;
  o.agentControllersByAgentId.delete(n);
  if (o.chainSettled && o.settleRequiresEmptyAgentAssociations && o.agentControllersByAgentId.size === 0) {
    loopsByTaskId.delete(taskId);
    runSettleCallbacks(o);
  }
}
//@ chunk-6vnxsn99.js:5139-5239 placement
function taskAgentIds(taskId) {
  let n = getTaskLoopRegistry().loopsByTaskId.get(taskId);
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
/**
 * 永不限流的限流器实现（始终允许、无需等待）。
 */
var UNLIMITED_RATE_LIMITER_2 = {
  tryConsume() {
    return true;
  },
  msUntilNextCall() {
    return 0;
  },
  refillsPerHour() {
    return 0;
  },
};
var UNLIMITED_RATE_LIMITER = {
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
    return UNLIMITED_RATE_LIMITER_2;
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
  UNLIMITED_RATE_LIMITER,
  wasTaskEverRegistered,
  onTaskLoopSettled,
  removeAgentController,
  getTaskLoopRegistry,
  getTaskLoop,
};
