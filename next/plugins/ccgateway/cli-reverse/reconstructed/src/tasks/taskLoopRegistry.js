/**
 * tasks/taskLoopRegistry.ts
 *
 * 2.1.316 新增：进程内任务循环登记。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-01kgd7xg.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../utils/hostScoped.js";
import { onProcessRootHost } from "../bootstrap/state.js";
import { logError } from "../utils/log.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-01kgd7xg.js:3685-4179 placement
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
//@ chunk-01kgd7xg.js:4179-4204 placement
/**
 * 按 host 保存的任务循环注册表。
 */
var taskLoopRegistrySlots; // deferred: uses TaskLoopRegistryState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-01kgd7xg.js:4179", () => {
  taskLoopRegistrySlots = new HostScoped(() => new TaskLoopRegistryState());
});
//@ chunk-01kgd7xg.js:4204-4232 placement
function getTaskLoopRegistry() {
  return onProcessRootHost(taskLoopRegistrySlots);
}
//@ chunk-01kgd7xg.js:4232-4289 placement
function wasTaskEverRegistered(taskId) {
  return getTaskLoopRegistry().everRegisteredTaskIds.has(taskId);
}
//@ chunk-01kgd7xg.js:4289-4751 placement
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
//@ chunk-01kgd7xg.js:4751-4820 placement
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
//@ chunk-01kgd7xg.js:4820-4868 placement
function isTaskLoopSettled(taskId) {
  return !getTaskLoopRegistry().loopsByTaskId.has(taskId);
}
//@ chunk-01kgd7xg.js:4868-4917 placement
function getTaskLoop(taskId) {
  return getTaskLoopRegistry().loopsByTaskId.get(taskId);
}
//@ chunk-01kgd7xg.js:4917-5029 placement
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
//@ chunk-01kgd7xg.js:5029-5094 placement
function getTaskKillController(taskId) {
  return getTaskLoopRegistry().loopsByTaskId.get(taskId)?.killController;
}
//@ chunk-01kgd7xg.js:5094-5176 placement
function setAgentController(taskId, agentId, controller) {
  getTaskLoopRegistry().loopsByTaskId.get(taskId)?.agentControllersByAgentId.set(agentId, controller);
}
//@ chunk-01kgd7xg.js:5176-5396 placement
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
//@ chunk-01kgd7xg.js:5396-5496 placement
function taskAgentIds(taskId) {
  let loop = getTaskLoopRegistry().loopsByTaskId.get(taskId);
  return loop ? [...loop.agentControllersByAgentId.keys()] : [];
}
//@ chunk-01kgd7xg.js:5496-5661 placement
function liveAgentControllers(taskId) {
  let loop = getTaskLoopRegistry().loopsByTaskId.get(taskId);
  if (!loop) return [];
  let controllers = [];
  for (let controller of loop.agentControllersByAgentId.values())
    if (controller && !controller.signal.aborted) controllers.push(controller);
  return controllers;
}
//@ chunk-01kgd7xg.js:5661-6080 placement
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
  async acquireDirectSearchSlot() {
    return () => {};
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
  isTaskLoopSettled,
  wasTaskEverRegistered,
  onTaskLoopSettled,
  UNLIMITED_RATE_LIMITER,
  registerTaskLoop,
  setAgentController,
  getTaskLoopRegistry,
  getTaskLoop,
  taskAgentIds,
  liveAgentControllers,
  getTaskKillController,
  removeAgentController,
};
