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
import { deferInit } from "../../runtime/deferred-init.js";

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
    for (let escalation of this.pendingEscalationsByTaskId.values())
      for (let timer of escalation.timers) clearTimeout(timer);
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
var taskLoopRegistrySlots; // deferred: uses TaskLoopRegistryState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6vnxsn99.js:3922", () => {
  taskLoopRegistrySlots = new HostScoped(() => new TaskLoopRegistryState());
});
//@ chunk-6vnxsn99.js:3947-3975 placement
function getTaskLoopRegistry() {
  return onProcessRootHost(taskLoopRegistrySlots);
}
//@ chunk-6vnxsn99.js:3975-4032 placement
function wasTaskEverRegistered(taskId) {
  return getTaskLoopRegistry().everRegisteredTaskIds.has(taskId);
}
//@ chunk-6vnxsn99.js:4032-4494 placement
function registerTaskLoop(taskId, killController, options = {}) {
  let { everRegisteredTaskIds, loopsByTaskId } = getTaskLoopRegistry();
  everRegisteredTaskIds.add(taskId);
  let previousLoop = loopsByTaskId.get(taskId);
  if (previousLoop) {
    loopsByTaskId.delete(taskId);
    runSettleCallbacks(previousLoop);
  }
  let loop = {
    killController,
    agentControllersByAgentId: new Map(),
    settleCallbacks: [],
    settleRequiresEmptyAgentAssociations: options.settleRequiresEmptyAgentAssociations ?? false,
    chainSettled: false,
  };
  loopsByTaskId.set(taskId, loop);
  return () => {
    if (loopsByTaskId.get(taskId) !== loop) return;
    loop.chainSettled = true;
    if (loop.settleRequiresEmptyAgentAssociations && loop.agentControllersByAgentId.size > 0) return;
    loopsByTaskId.delete(taskId);
    runSettleCallbacks(loop);
  };
}
//@ chunk-6vnxsn99.js:4494-4563 placement
/**
 * 依次执行注册的结算回调，异常只记录。
 */
function runSettleCallbacks(loop) {
  for (let settleCallback of loop.settleCallbacks)
    try {
      settleCallback();
    } catch (error) {
      logError(error);
    }
}
//@ chunk-6vnxsn99.js:4563-4611 placement
function isTaskLoopSettled(taskId) {
  return !getTaskLoopRegistry().loopsByTaskId.has(taskId);
}
//@ chunk-6vnxsn99.js:4611-4660 placement
function getTaskLoop(taskId) {
  return getTaskLoopRegistry().loopsByTaskId.get(taskId);
}
//@ chunk-6vnxsn99.js:4660-4772 placement
function onTaskLoopSettled(taskId, callback) {
  let loop = getTaskLoopRegistry().loopsByTaskId.get(taskId);
  if (!loop) {
    try {
      callback();
    } catch (error) {
      logError(error);
    }
    return;
  }
  loop.settleCallbacks.push(callback);
}
//@ chunk-6vnxsn99.js:4772-4837 placement
function getTaskKillController(taskId) {
  return getTaskLoopRegistry().loopsByTaskId.get(taskId)?.killController;
}
//@ chunk-6vnxsn99.js:4837-4919 placement
function setAgentController(taskId, agentId, controller) {
  getTaskLoopRegistry().loopsByTaskId.get(taskId)?.agentControllersByAgentId.set(agentId, controller);
}
//@ chunk-6vnxsn99.js:4919-5139 placement
function removeAgentController(taskId, agentId) {
  let { loopsByTaskId } = getTaskLoopRegistry();
  let loop = loopsByTaskId.get(taskId);
  if (!loop) return;
  loop.agentControllersByAgentId.delete(agentId);
  if (
    loop.chainSettled &&
    loop.settleRequiresEmptyAgentAssociations &&
    loop.agentControllersByAgentId.size === 0
  ) {
    loopsByTaskId.delete(taskId);
    runSettleCallbacks(loop);
  }
}
//@ chunk-6vnxsn99.js:5139-5239 placement
function taskAgentIds(taskId) {
  let loop = getTaskLoopRegistry().loopsByTaskId.get(taskId);
  return loop ? [...loop.agentControllersByAgentId.keys()] : [];
}
//@ chunk-6vnxsn99.js:5239-5404 placement
function liveAgentControllers(taskId) {
  let loop = getTaskLoopRegistry().loopsByTaskId.get(taskId);
  if (!loop) return [];
  let controllers = [];
  for (let controller of loop.agentControllersByAgentId.values())
    if (controller && !controller.signal.aborted) controllers.push(controller);
  return controllers;
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
