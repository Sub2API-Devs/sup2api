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
function stopAllTasks(h, taskRegistry, D) {
  let killedBy = D.killedBy ?? "user";
  let allTasks = taskRegistry.all();
  let sparedAgentIds = [];
  for (let Re of Object.values(allTasks)) {
    if (!isLocalAgent(Re) || Re.id === h.id || (Re.status !== "running" && !hasCompletedWithFindings(Re)))
      continue;
    if (isSparedFromCascadeStop(Re, h.agentId, allTasks)) {
      sparedAgentIds.push(Re.agentId);
      continue;
    }
    if (isTaskOwnedBy(Re, h.agentId, allTasks, isCascadeStopExempt)) {
      if (D.source === "user" && isObserverAgentTask(Re))
        stopObserverPairing(
          D.session,
          Re.id,
          {
            agentType: Re.agentType,
          },
          D.storageV5,
        );
      markAgentNotified(Re.id, taskRegistry);
      if (killedBy === "user" && (D.source === "user" || !isObserverAgentTask(Re)))
        markStoppedByUser(Re.id, taskRegistry, D.storageV5);
      killAsyncAgent(Re.id, taskRegistry, killedBy);
    }
  }
  emitCascadeSpared(h.agentId, sparedAgentIds, killedBy, taskRegistry);
}
//@ chunk-18hwfzwa.js:463486-464254 placement
function stopTask(h, taskRegistry, setAppState, L) {
  let { session, source, storageV5 } = L;
  if (h.type === "in_process_teammate") {
    if (h.status === "running") {
      killInProcessTeammate(h.id, taskRegistry, setAppState, storageV5);
      taskRegistry.update(h.id, (We) =>
        We.status === "killed" && We.evictAfter === undefined
          ? {
              ...We,
              evictAfter: Date.now() + TASK_NOTIFICATION_DELAY_MS,
            }
          : We,
      );
      return "killed";
    }
    taskRegistry.remove(h.id);
    return "dismissed";
  }
  if (h.isObserver) {
    stopTask_2(h.id, {
      taskRegistry,
      setAppState,
      session,
      source,
      storageV5,
    }).catch(() => {});
    if (source === "user" && h.status !== "running" && !hasCompletedWithFindings(h))
      stopOrDismissAgent(h.id, setAppState);
    return "killed";
  }
  let Be = taskRegistry.get(h.id);
  if (source !== "user" && Be !== undefined && isIdleCompletedAgent(Be)) {
    exitTeammateView(setAppState);
    return "dismissed";
  }
  if (h.status !== "running" && !hasCompletedWithFindings(h)) {
    stopOrDismissAgent(h.id, setAppState);
    return "dismissed";
  }
  let He = taskRegistry.get(h.id);
  if (isLocalAgent(He) && (He.status === "running" || hasCompletedWithFindings(He)))
    markStoppedByUser(h.id, taskRegistry, storageV5);
  killAsyncAgent(h.id, taskRegistry, "user");
  stopAllTasks(h, taskRegistry, {
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
    for (let ke of liveAgentControllers(taskId)) ke.abort(new DOMException("workflow-abort", "AbortError"));
    for (let ke of taskAgentIds(taskId)) trackExitProcessSweep(killAgentProcessGroups(ke));
    scheduleKillEscalation(taskId);
    return "killed";
  }
  setAppState((ke) => {
    if (ke.tasks[taskId]?.type !== "local_workflow") return ke;
    let Re = {
      ...ke.tasks,
    };
    delete Re[taskId];
    return {
      ...ke,
      tasks: Re,
    };
  });
  return "dismissed";
}
//@ chunk-18hwfzwa.js:464691-464713 placement
var liveDocWatchController = null;
var KILL_AGENTS_CONFIRM_MS = 3000;
//@ chunk-18hwfzwa.js:464713-464827 placement = hasActiveInProcessTeammates (0.883)
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
//@ chunk-18hwfzwa.js:464909-465053 placement = isPanelAgentTask (0.809)
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
  let ee = isLocalAgent(task) ? taskRegistry.get(task.ownerAgentId) : undefined;
  if (!isLocalAgent(ee)) markAgentNotified(taskId, taskRegistry);
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
