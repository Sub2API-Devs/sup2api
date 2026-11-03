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
import { y2t } from "../../utils/task/framework.js";
import { isIdleCompletedAgent } from "../../tasks/LocalAgentTask/keepalive.js";
import { killWorkflowTask as killWorkflowTask_2 } from "../../tasks/LocalWorkflowTask/LocalWorkflowTask.js";
import { isTerminalTaskStatus as isTerminalTaskStatus_2 } from "../../tasks/taskStatus.js";
import { isTaskLoopSettled, liveAgentControllers, taskAgentIds } from "../../tasks/taskLoopRegistry.js";
import { p3n, killAgentProcessGroups, scheduleKillEscalation } from "../../utils/agentProcessRegistry.js";
import { tH } from "../../plugins/functionHooks/inputHold.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { isTeammateWorking } from "../../utils/inProcessTeammateHelpers.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-18hwfzwa.js:463038-463486 placement
function stopAllTasks(h, x, D) {
  let L = D.killedBy ?? "user",
    all = x.all(),
    ke = [];
  for (let Re of Object.values(all)) {
    if (!isLocalAgent(Re) || Re.id === h.id || (Re.status !== "running" && !hasCompletedWithFindings(Re)))
      continue;
    if (isSparedFromCascadeStop(Re, h.agentId, all)) {
      ke.push(Re.agentId);
      continue;
    }
    if (isTaskOwnedBy(Re, h.agentId, all, isCascadeStopExempt)) {
      if (D.source === "user" && isObserverAgentTask(Re))
        stopObserverPairing(D.session, Re.id, { agentType: Re.agentType }, D.storageV5);
      if ((markAgentNotified(Re.id, x), L === "user" && (D.source === "user" || !isObserverAgentTask(Re))))
        markStoppedByUser(Re.id, x, D.storageV5);
      killAsyncAgent(Re.id, x, L);
    }
  }
  emitCascadeSpared(h.agentId, ke, L, x);
}
//@ chunk-18hwfzwa.js:463486-464254 placement
function stopTask(h, x, D, L) {
  let { session: session, source: source, storageV5: storageV5 } = L;
  if (h.type === "in_process_teammate") {
    if (h.status === "running")
      return (
        killInProcessTeammate(h.id, x, D, storageV5),
        x.update(h.id, (We) =>
          We.status === "killed" && We.evictAfter === void 0 ? { ...We, evictAfter: Date.now() + y2t } : We,
        ),
        "killed"
      );
    return (x.remove(h.id), "dismissed");
  }
  if (h.isObserver) {
    if (
      (stopTask_2(h.id, {
        taskRegistry: x,
        setAppState: D,
        session: session,
        source: source,
        storageV5: storageV5,
      }).catch(() => {}),
      source === "user" && h.status !== "running" && !hasCompletedWithFindings(h))
    )
      stopOrDismissAgent(h.id, D);
    return "killed";
  }
  let Be = x.get(h.id);
  if (source !== "user" && Be !== void 0 && isIdleCompletedAgent(Be))
    return (exitTeammateView(D), "dismissed");
  if (h.status !== "running" && !hasCompletedWithFindings(h))
    return (stopOrDismissAgent(h.id, D), "dismissed");
  let He = x.get(h.id);
  if (isLocalAgent(He) && (He.status === "running" || hasCompletedWithFindings(He)))
    markStoppedByUser(h.id, x, storageV5);
  return (
    killAsyncAgent(h.id, x, "user"),
    stopAllTasks(h, x, { session: session, source: source, storageV5: storageV5 }),
    "killed"
  );
}
//@ chunk-18hwfzwa.js:464254-464691 placement
function stopWorkflowTask({
  taskId: taskId,
  taskStatus: taskStatus,
  taskRegistry: taskRegistry,
  setAppState: setAppState,
}) {
  let ee = taskRegistry.get(taskId)?.status ?? taskStatus;
  if (ee === "running") return (killWorkflowTask_2(taskId, taskRegistry, "user"), "killed");
  if (isTerminalTaskStatus_2(ee) && !isTaskLoopSettled(taskId)) {
    for (let ke of liveAgentControllers(taskId)) ke.abort(new DOMException("workflow-abort", "AbortError"));
    for (let ke of taskAgentIds(taskId)) p3n(killAgentProcessGroups(ke));
    return (scheduleKillEscalation(taskId), "killed");
  }
  return (
    setAppState((ke) => {
      if (ke.tasks[taskId]?.type !== "local_workflow") return ke;
      let Re = { ...ke.tasks };
      return (delete Re[taskId], { ...ke, tasks: Re });
    }),
    "dismissed"
  );
}
//@ chunk-18hwfzwa.js:464691-464713 placement
var Xle = null,
  V$e = 3000;
/**
 * 任务是否仍活动：运行中（或有存活工作）的本地代理，或运行中的同进程 teammate。
 */
//@ chunk-18hwfzwa.js:464713-464827 placement = hasActiveInProcessTeammates (0.883)
function isLiveAgentOrTeammateTask(task) {
  return (
    (isLocalAgent(task) && (task.status === "running" || hasCompletedWithFindings(task))) ||
    (task.type === "in_process_teammate" && task.status === "running")
  );
}
//@ chunk-18hwfzwa.js:464827-464909 placement
function K$e(h) {
  if (h === void 0 || h.stoppable() === 0) return !1;
  return (h.interrupt(), !0);
}
/**
 * 任务是否显示在代理面板：特性开启时为后台可中止子代理、运行中的 main-session、或运行中的 in-process teammate；否则退回 teammate 活动判断。
 */
//@ chunk-18hwfzwa.js:464909-465053 placement = isPanelAgentTask (0.809)
function isAgentPanelTask(task) {
  if (tH())
    return (
      (isInterruptibleBackgroundSubagent(task) && !taskAbortController(task)) ||
      (isLocalAgent(task) && task.agentType === "main-session" && task.status === "running") ||
      (isInProcessTeammateTask(task) && isTeammateWorking(task) && !taskAbortController(task))
    );
  return isLiveAgentOrTeammateTask(task);
}
/**
 * 从 UI 停止子代理：属主不是本地代理时先标已通知，记录停止、kill，并发 stopped 通知。
 */
//@ chunk-18hwfzwa.js:465053-465224 placement
function stopAgentFromUi(taskId, task, taskRegistry, storageV5) {
  let ee = isLocalAgent(task) ? taskRegistry.get(task.ownerAgentId) : void 0;
  if (!isLocalAgent(ee)) markAgentNotified(taskId, taskRegistry);
  (markStoppedByUser(taskId, taskRegistry, storageV5),
    killAsyncAgent(taskId, taskRegistry, "user"),
    emitTaskNotification(taskId, "stopped", { toolUseId: task.toolUseId, summary: task.description }));
}

export {
  stopTask,
  stopAgentFromUi,
  isAgentPanelTask,
  isLiveAgentOrTeammateTask,
  K$e,
  Xle,
  V$e,
  stopAllTasks,
  stopWorkflowTask,
};
