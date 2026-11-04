/**
 * components/tasks/stopTask.ts
 *
 * 2.1.316 新增。停止任务的统一入口。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { isLocalAgent, stopOrDismissAgent, exitTeammateView } from "../../state/teammateViewHelpers.js";
import {
  hasCompletedWithFindings,
  isObserverAgentTask,
  markAgentNotified,
  killAsyncAgent,
  isInterruptibleBackgroundSubagent,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import {
  isSparedFromCascadeStop,
  isCascadeStopExempt,
  markStoppedByUser,
  emitCascadeSpared,
  stopTask as stopTask_2,
} from "../../tasks/stopTask.js";
import { isTaskOwnedBy, taskAbortController } from "../../tasks/taskKinds.js";
import { stopObserverPairing } from "../../services/agentObserver/agentObserver.js";
import { killInProcessTeammate } from "../../utils/swarm/spawnInProcess.js";
import { TASK_NOTIFICATION_DELAY_MS } from "../../utils/task/framework.js";
import { isIdleCompletedAgent } from "../../tasks/LocalAgentTask/keepalive.js";
import { killWorkflowTask as killWorkflowTask_2 } from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { isTerminalTaskStatus as isTerminalTaskStatus_2 } from "../../tasks/taskStatus.js";
import { isTaskLoopSettled, liveAgentControllers, taskAgentIds } from "../../tasks/taskLoopRegistry.js";
import {
  trackExitProcessSweep,
  killAgentProcessGroups,
  scheduleKillEscalation,
} from "../../utils/agentProcessRegistry.js";
import { isZincHarborOn } from "../../plugins/functionHooks/inputHold.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { isTeammateWorking } from "../../utils/inProcessTeammateHelpers.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-18hwfzwa.js:463038-463486 placement
function stopAllTasks(agentTask, taskRegistry, options) {
  let killedBy = options.killedBy ?? "user";
  let allTasks = taskRegistry.all();
  let sparedAgentIds = [];
  for (let task of Object.values(allTasks)) {
    if (
      !isLocalAgent(task) ||
      task.id === agentTask.id ||
      (task.status !== "running" && !hasCompletedWithFindings(task))
    )
      continue;
    if (isSparedFromCascadeStop(task, agentTask.agentId, allTasks)) {
      sparedAgentIds.push(task.agentId);
      continue;
    }
    if (isTaskOwnedBy(task, agentTask.agentId, allTasks, isCascadeStopExempt)) {
      if (options.source === "user" && isObserverAgentTask(task))
        stopObserverPairing(
          options.session,
          task.id,
          {
            agentType: task.agentType,
          },
          options.storageV5,
        );
      markAgentNotified(task.id, taskRegistry);
      if (killedBy === "user" && (options.source === "user" || !isObserverAgentTask(task)))
        markStoppedByUser(task.id, taskRegistry, options.storageV5);
      killAsyncAgent(task.id, taskRegistry, killedBy);
    }
  }
  emitCascadeSpared(agentTask.agentId, sparedAgentIds, killedBy, taskRegistry);
}
//@ chunk-18hwfzwa.js:463486-464254 placement
function stopTask(task, taskRegistry, setAppState, options) {
  let { session, source, storageV5 } = options;
  if (task.type === "in_process_teammate") {
    if (task.status === "running") {
      killInProcessTeammate(task.id, taskRegistry, setAppState, storageV5);
      taskRegistry.update(task.id, (task) =>
        task.status === "killed" && task.evictAfter === undefined
          ? {
              ...task,
              evictAfter: Date.now() + TASK_NOTIFICATION_DELAY_MS,
            }
          : task,
      );
      return "killed";
    }
    taskRegistry.remove(task.id);
    return "dismissed";
  }
  if (task.isObserver) {
    stopTask_2(task.id, {
      taskRegistry,
      setAppState,
      session,
      source,
      storageV5,
    }).catch(() => {});
    if (source === "user" && task.status !== "running" && !hasCompletedWithFindings(task))
      stopOrDismissAgent(task.id, setAppState);
    return "killed";
  }
  let registeredTask = taskRegistry.get(task.id);
  if (source !== "user" && registeredTask !== undefined && isIdleCompletedAgent(registeredTask)) {
    exitTeammateView(setAppState);
    return "dismissed";
  }
  if (task.status !== "running" && !hasCompletedWithFindings(task)) {
    stopOrDismissAgent(task.id, setAppState);
    return "dismissed";
  }
  let registeredTask_ = taskRegistry.get(task.id);
  if (
    isLocalAgent(registeredTask_) &&
    (registeredTask_.status === "running" || hasCompletedWithFindings(registeredTask_))
  )
    markStoppedByUser(task.id, taskRegistry, storageV5);
  killAsyncAgent(task.id, taskRegistry, "user");
  stopAllTasks(task, taskRegistry, {
    session,
    source,
    storageV5,
  });
  return "killed";
}
//@ chunk-18hwfzwa.js:464254-464691 placement
function stopWorkflowTask({ taskId, taskStatus, taskRegistry, setAppState }) {
  let status = taskRegistry.get(taskId)?.status ?? taskStatus;
  if (status === "running") {
    killWorkflowTask_2(taskId, taskRegistry, "user");
    return "killed";
  }
  if (isTerminalTaskStatus_2(status) && !isTaskLoopSettled(taskId)) {
    for (let controller of liveAgentControllers(taskId))
      controller.abort(new DOMException("workflow-abort", "AbortError"));
    for (let agentId of taskAgentIds(taskId)) trackExitProcessSweep(killAgentProcessGroups(agentId));
    scheduleKillEscalation(taskId);
    return "killed";
  }
  setAppState((prevState) => {
    if (prevState.tasks[taskId]?.type !== "local_workflow") return prevState;
    let nextTasks = {
      ...prevState.tasks,
    };
    delete nextTasks[taskId];
    return {
      ...prevState,
      tasks: nextTasks,
    };
  });
  return "dismissed";
}
//@ chunk-18hwfzwa.js:464691-464713 placement
var liveDocWatchController = null;
var KILL_AGENTS_CONFIRM_MS = 3000;
//@ chunk-18hwfzwa.js:464713-464827 placement (2.1.88 match: hasActiveInProcessTeammates, 0.883)
/**
 * 任务是否仍活动：运行中（或有存活工作）的本地代理，或运行中的同进程 teammate。
 */
function isLiveAgentOrTeammateTask(task) {
  return (
    (isLocalAgent(task) && (task.status === "running" || hasCompletedWithFindings(task))) ||
    (task.type === "in_process_teammate" && task.status === "running")
  );
}
//@ chunk-18hwfzwa.js:464827-464909 placement
function interruptIfStoppable(stoppableWork) {
  if (stoppableWork === undefined || stoppableWork.stoppable() === 0) return false;
  stoppableWork.interrupt();
  return true;
}
//@ chunk-18hwfzwa.js:464909-465053 placement (2.1.88 match: isPanelAgentTask, 0.809)
/**
 * 任务是否显示在代理面板：特性开启时为后台可中止子代理、运行中的 main-session、或运行中的 in-process teammate；否则退回 teammate 活动判断。
 */
function isAgentPanelTask(task) {
  if (isZincHarborOn())
    return (
      (isInterruptibleBackgroundSubagent(task) && !taskAbortController(task)) ||
      (isLocalAgent(task) && task.agentType === "main-session" && task.status === "running") ||
      (isInProcessTeammateTask(task) && isTeammateWorking(task) && !taskAbortController(task))
    );
  return isLiveAgentOrTeammateTask(task);
}
//@ chunk-18hwfzwa.js:465053-465224 placement
/**
 * 从 UI 停止子代理：属主不是本地代理时先标已通知，记录停止、kill，并发 stopped 通知。
 */
function stopAgentFromUi(taskId, task, taskRegistry, storageV5) {
  let ownerAgent = isLocalAgent(task) ? taskRegistry.get(task.ownerAgentId) : undefined;
  if (!isLocalAgent(ownerAgent)) markAgentNotified(taskId, taskRegistry);
  markStoppedByUser(taskId, taskRegistry, storageV5);
  killAsyncAgent(taskId, taskRegistry, "user");
  emitTaskNotification(taskId, "stopped", {
    toolUseId: task.toolUseId,
    summary: task.description,
  });
}
export {
  stopTask,
  stopWorkflowTask,
  stopAgentFromUi,
  isAgentPanelTask,
  isLiveAgentOrTeammateTask,
  interruptIfStoppable,
  liveDocWatchController,
  KILL_AGENTS_CONFIRM_MS,
  stopAllTasks,
};
