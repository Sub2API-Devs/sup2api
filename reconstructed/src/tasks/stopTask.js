/**
 * tasks/stopTask.ts
 *
 * 并入已有模块：用户停止任务（找不到时标记 stoppedByUser）；停止全部运行中的后台任务（可按条件筛选）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tasks/stopTask.ts
 * pieces: chunk-kxyd0g16.js (16)
 * attribution: placement 7, layout 7, fingerprint 2
 */
import { isWaitingOnChildren } from "./LocalAgentTask/keepalive.js";
import { printableName, singleLineText } from "../utils/printableName.js";
import { getTaskRunState, emitTaskNotification } from "../utils/task/taskNotifications.js";
import { isTaskOwnedBy, isWaitableAgentOrWorkflow } from "./taskKinds.js";
import { WireSafeControlError, isPathAbsent } from "../utils/errors.js";
import { getRunningTeammateAgentIds } from "./InProcessTeammateTask/InProcessTeammateTask.js";
import { resolveTeammateAddress, lookupTaskForStop } from "../utils/swarm/teammateAddressLookup.js";
import {
  isObserverAgentTask,
  killAsyncAgent,
  markAgentNotified,
  dropQueuedCommandsForAgent,
} from "./LocalAgentTask/LocalAgentTask.js";
import { agentIdMatches, sessionLabel } from "../services/remoteTools/backgroundCommands.js";
import { stopObserverPairing } from "../services/agentObserver/agentObserver.js";
import { isTerminalTaskStatus } from "./taskStatus.js";
import {
  isTaskLoopSettled,
  getTaskLoop,
  getTaskKillController,
  liveAgentControllers,
  taskAgentIds,
} from "./taskLoopRegistry.js";
import {
  killAgentProcessGroups,
  trackExitProcessSweep,
  scheduleKillEscalation,
} from "../utils/agentProcessRegistry.js";
import { isLocalShellTask } from "./LocalShellTask/guards.js";
import {
  enqueueForeignStopNotification,
  enqueueUserStopNotification,
} from "./MonitorTask/monitorDelivery.js";
import { isCpuAccountingEnabled } from "../utils/shell/processCpuTime.js";
import { escapeXml_2 as escapeXml } from "../utils/confusables.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { normalizeAgentIdOrNull, identityAgentId2 } from "../utils/agentId.js";
import {
  landAgentStop,
  updateAgentMetadata,
  readAgentMetadata,
  writeAgentMetadata,
} from "../utils/sessionStorage.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import { isLocalAgent } from "../state/teammateViewHelpers.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-kxyd0g16.js:20267-20423 placement = getSelectableBackgroundTasks (0.759)
function getSelectableBackgroundTasks(matchesName, taskRegistry, getAppState) {
  let agentNameRegistry = getAppState?.().agentNameRegistry;
  if (!agentNameRegistry) return;
  for (let [agentName, agentId] of agentNameRegistry) {
    if (!matchesName(agentName)) continue;
    let task = taskRegistry.get(agentId);
    if (task?.type === "local_agent") return task;
  }
  return;
}
//@ chunk-kxyd0g16.js:20423-20808 layout
/**
 * 生成正在运行的后台子代理列表说明（排除当前、主会话、观察者与已注册命名的代理），附在停止任务结果后。
 */
function describeRunningBackgroundAgents(taskRegistry, getAppState, excludeTaskId) {
  let namedAgentIds = new Set(getAppState?.().agentNameRegistry?.values() ?? []);
  let mapped = Object.values(taskRegistry.all())
    .filter(
      (task) =>
        task.type === "local_agent" &&
        task.id !== excludeTaskId &&
        task.agentType !== "main-session" &&
        task.isBackgrounded &&
        task.isObserver !== true &&
        !namedAgentIds.has(task.id) &&
        (task.status === "running" || isWaitingOnChildren(task)),
    )
    .map((task) => (task.description ? `${task.id} (${printableName(task.description)})` : task.id));
  return mapped.length > 0 ? `. Running background agents: ${mapped.join(", ")}` : "";
}
//@ chunk-kxyd0g16.js:20808-20890 layout
/**
 * 代理是否被某个已注册的级联停止豁免规则命中（全局 cascadeStopExemptions）。
 */
function isCascadeStopExempt(agentId) {
  for (let cascadeStopExemption of getTaskRunState().cascadeStopExemptions)
    if (cascadeStopExemption(agentId)) return true;
  return false;
}
//@ chunk-kxyd0g16.js:20890-21033 layout
/**
 * 子代理是否因豁免而在级联停止中被放过：自身被豁免，且其祖先链（排除自己）中有被豁免的代理。
 */
function isSparedFromCascadeStop(task, stoppedOwnerId, allTasks) {
  let agentId = "agentId" in task && typeof task.agentId === "string" ? task.agentId : undefined;
  return (
    agentId !== undefined &&
    isCascadeStopExempt(agentId) &&
    isTaskOwnedBy(
      task,
      stoppedOwnerId,
      allTasks,
      (agentId_2) => agentId_2 !== agentId && isCascadeStopExempt(agentId_2),
    )
  );
}
//@ chunk-kxyd0g16.js:21033-21165 layout
/**
 * 有子代理被放过时发出 cascadeSpared 事件。
 */
function emitCascadeSpared(stoppedAgentId, sparedAgentIds, killedBy, taskRegistry) {
  if (sparedAgentIds.length === 0) return;
  getTaskRunState().cascadeSpared.emit({
    stoppedAgentId,
    sparedAgentIds,
    killedBy,
    taskRegistry,
  });
}
//@ chunk-kxyd0g16.js:21165-21323 fingerprint = StopTaskError (0.446)
/**
 * TaskStop 拒绝错误，code 为 not_found / ambiguous / not_running / not_owner / unsupported_type，带任务当前状态。
 */
let StopTaskError; // deferred: uses WireSafeControlError (../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kxyd0g16.js:21165", () => {
  StopTaskError = class StopTaskError extends WireSafeControlError {
    code;
    taskStatus;
    constructor(message, code, taskStatus) {
      super(message, `StopTask: ${code}`, "stop_task_refused");
      this.code = code;
      this.taskStatus = taskStatus;
      this.name = "StopTaskError";
    }
  };
});
//@ chunk-kxyd0g16.js:21323-21515 layout = killAllRunningAgentTasks (0.849)
/**
 * 列出代理名字注册表里仍在运行（或有存活工作）的本地代理名字。
 */
function getRunningAgentNames(taskRegistry, getAppState) {
  let entries = getAppState?.().agentNameRegistry?.entries();
  if (!entries) return [];
  let names = [];
  for (let [agentName, agentId] of entries) {
    let task = taskRegistry.get(agentId);
    if (task?.type === "local_agent" && (task.status === "running" || isWaitingOnChildren(task)))
      names.push(agentName);
  }
  return names;
}
//@ chunk-kxyd0g16.js:21515-21814 layout
/**
 * 生成"找不到任务"的错误消息：可能的拼写建议、正在运行的队友与命名代理、后台代理列表。
 */
function formatTaskNotFoundMessage(taskId, taskRegistry, getAppState, suggestion, callerAgentId) {
  let runningTeammateAgentIds = getRunningTeammateAgentIds(taskRegistry.all());
  let runningAgentNames = getRunningAgentNames(taskRegistry, getAppState);
  let message = `No task found with ID: ${singleLineText(taskId)}`;
  if (suggestion !== undefined) message += `. Did you mean: ${singleLineText(suggestion)}?`;
  if (runningTeammateAgentIds.length > 0)
    message += `. Running teammates: ${runningTeammateAgentIds.map((runningTeammateAgentId) => singleLineText(runningTeammateAgentId)).join(", ")}`;
  if (runningAgentNames.length > 0)
    message += `. Running named agents: ${runningAgentNames.map((runningAgentName) => singleLineText(runningAgentName)).join(", ")}`;
  return message + describeRunningBackgroundAgents(taskRegistry, getAppState, callerAgentId);
}
//@ chunk-kxyd0g16.js:21814-21925 layout
/**
 * 停止 MCP 任务时附加给模型的说明：不会再有结果，服务器可能已经做了部分工作。
 */
var MCP_TASK_STOPPED_NOTE =
  "No result will follow. The MCP server may already have done some of the work, or may still finish it.";
//@ chunk-kxyd0g16.js:21925-25016 fingerprint = stopTask (0.445)
/**
 * 停止任务：先按 ID 查，查不到时按名字/前缀模糊解析（ambiguous/suggestion）；观察者代理不能停自己、非属主不能停；对"已结束但循环未退出"的 workflow/代理重新发中止并杀进程组；
 * 否则调用任务实现的 kill，并对 local_agent 级联停止其子代理（豁免的除外）；shell 任务补发 stopped 通知、通知属主代理或 SDK 来源。返回 {taskId, taskType, command, note?}。
 */
async function stopTask(taskId, context) {
  let { taskRegistry, setAppState, getAppState, callerAgentId, killedBy = "user", storageV5 } = context;
  let resolvedTaskId = taskId;
  let task = taskRegistry.get(resolvedTaskId);
  let suggestion;
  if (!task) {
    let teammateAddress = resolveTeammateAddress(taskId, taskRegistry, getAppState);
    if (teammateAddress.status === "ambiguous") {
      if (!teammateAddress.anyLiveCandidate)
        throw new StopTaskError(teammateAddress.message, "not_running", "completed");
      throw new StopTaskError(teammateAddress.message, "ambiguous");
    }
    if (teammateAddress.status === "found") {
      task = teammateAddress.task;
      resolvedTaskId = teammateAddress.task.id;
    } else suggestion = teammateAddress.suggestion;
  }
  if (!task)
    throw new StopTaskError(
      formatTaskNotFoundMessage(taskId, taskRegistry, getAppState, suggestion, callerAgentId),
      "not_found",
    );
  let displayId =
    resolvedTaskId === taskId ? resolvedTaskId : `${singleLineText(taskId)} (${resolvedTaskId})`;
  if (isObserverAgentTask(task)) {
    if (callerAgentId !== undefined && callerAgentId === task.agentId)
      throw new StopTaskError(
        `Observer ${displayId} cannot stop itself; use the task UI or a main-session TaskStop.`,
        "not_owner",
      );
    if (!agentIdMatches(callerAgentId, task.agentId))
      throw new StopTaskError(
        `Task ${displayId} is owned by ${singleLineText(sessionLabel(task.agentId))}; agent ${singleLineText(String(callerAgentId))} cannot stop it.`,
        "not_owner",
      );
    if (context.source !== undefined)
      stopObserverPairing(
        context.session,
        resolvedTaskId,
        {
          agentType: task.agentType,
        },
        storageV5,
      );
    if (
      task.status !== "running" &&
      !(isTerminalTaskStatus(task.status) && !isTaskLoopSettled(resolvedTaskId))
    ) {
      killAsyncAgent(resolvedTaskId, taskRegistry);
      return {
        taskId: resolvedTaskId,
        taskType: task.type,
        command: task.description,
      };
    }
  }
  let isEndedRemoteMonitor =
    task.status !== "running" && task.type === "monitor_ws" && context.source !== undefined;
  let hasLingeringLoop = isSettledAgentAwaitingLoop(task, resolvedTaskId);
  let loopToken = hasLingeringLoop ? getTaskLoop(resolvedTaskId) : undefined;
  if (task.status !== "running" && !isWaitingOnChildren(task) && !isEndedRemoteMonitor && !hasLingeringLoop)
    throw new StopTaskError(
      `Task ${displayId} is not running (status: ${task.status})`,
      "not_running",
      task.status,
    );
  if (!isObserverAgentTask(task) && !agentIdMatches(callerAgentId, task.agentId))
    throw new StopTaskError(
      `Task ${displayId} is owned by ${singleLineText(sessionLabel(task.agentId))}; agent ${singleLineText(String(callerAgentId))} cannot stop it.`,
      "not_owner",
    );
  let taskImpl = lookupTaskForStop(task.type);
  if (!taskImpl) throw new StopTaskError(`Unsupported task type: ${task.type}`, "unsupported_type");
  if (context.source !== undefined) markStoppedByUser(resolvedTaskId, taskRegistry, storageV5);
  if (hasLingeringLoop) {
    let taskKillController = getTaskKillController(resolvedTaskId);
    if (taskKillController && !taskKillController.signal.aborted) taskKillController.abort();
    for (let loopController of liveAgentControllers(resolvedTaskId))
      loopController.abort(new DOMException("workflow-abort", "AbortError"));
    let agentIds = new Set(taskAgentIds(resolvedTaskId));
    if (task.type === "local_agent") agentIds.add(resolvedTaskId);
    let killedGroupCount = 0;
    for (let agentId of agentIds) {
      if (getTaskLoop(resolvedTaskId) !== loopToken) break;
      let killPromise = killAgentProcessGroups(agentId);
      trackExitProcessSweep(killPromise);
      killedGroupCount += (await killPromise).length;
    }
    scheduleKillEscalation(resolvedTaskId, task.type === "local_agent" ? [resolvedTaskId] : [], {
      expectedLoopToken: loopToken,
    });
    return {
      taskId: resolvedTaskId,
      taskType: task.type,
      command: isLocalShellTask(task) ? task.command : task.description,
      note: `had already ended (${task.status}) but its loop had not exited; re-signalled it and killed ${killedGroupCount} process group(s). The record remains listed while the loop is still live.`,
    };
  }
  let hadLiveWork = isWaitingOnChildren(task);
  await taskImpl.kill(resolvedTaskId, taskRegistry, setAppState, killedBy, storageV5, context.source);
  if (hadLiveWork) {
    let agentId = task.agentId ?? resolvedTaskId;
    let allTasks = taskRegistry.all();
    let sparedAgentIds = [];
    for (let subTask of Object.values(allTasks)) {
      if (
        subTask.type !== "local_agent" ||
        subTask.id === resolvedTaskId ||
        (subTask.status !== "running" && !isWaitingOnChildren(subTask))
      )
        continue;
      if (isSparedFromCascadeStop(subTask, agentId, allTasks)) {
        sparedAgentIds.push(subTask.id);
        continue;
      }
      if (isTaskOwnedBy(subTask, agentId, allTasks, isCascadeStopExempt)) {
        markAgentNotified(subTask.id, taskRegistry);
        if (!isObserverAgentTask(subTask))
          emitTaskNotification(subTask.id, "stopped", {
            toolUseId: subTask.toolUseId,
            summary: subTask.description,
          });
        if (context.source !== undefined) markStoppedByUser(subTask.id, taskRegistry, storageV5);
        await taskImpl.kill(subTask.id, taskRegistry, setAppState, killedBy, storageV5);
      }
    }
    emitCascadeSpared(agentId, sparedAgentIds, killedBy, taskRegistry);
  }
  if (isLocalShellTask(task)) {
    let markedNotified = false;
    taskRegistry.update(resolvedTaskId, (prev) => {
      if (prev.notified) return prev;
      markedNotified = true;
      return {
        ...prev,
        notified: true,
      };
    });
    if (markedNotified)
      emitTaskNotification(resolvedTaskId, "stopped", {
        toolUseId: task.toolUseId,
        summary: task.description,
      });
  }
  if (isLocalShellTask(task) && task.agentId !== undefined && callerAgentId !== task.agentId)
    enqueueForeignStopNotification({
      taskId: resolvedTaskId,
      toolUseId: task.toolUseId,
      description: task.description,
      ownerAgentId: task.agentId,
    });
  if (
    isLocalShellTask(task) &&
    task.agentId === undefined &&
    context.source !== undefined &&
    isCpuAccountingEnabled()
  )
    enqueueUserStopNotification({
      taskId: resolvedTaskId,
      toolUseId: task.toolUseId,
      description: task.description,
      source: context.source,
      outputFile: task.elsewhere ? escapeXml(task.outputFile) : task.outputFile,
    });
  if (
    task.type === "mcp_task" &&
    context.source !== undefined &&
    isCpuAccountingEnabled() &&
    taskRegistry.get(resolvedTaskId)?.status === "killed"
  )
    enqueueUserStopNotification({
      taskId: resolvedTaskId,
      toolUseId: task.toolUseId,
      description: task.description,
      source: context.source,
      note: MCP_TASK_STOPPED_NOTE,
    });
  let command = isLocalShellTask(task) ? task.command : task.description;
  return {
    taskId: resolvedTaskId,
    taskType: task.type,
    command,
  };
}
//@ chunk-kxyd0g16.js:25016-25454 placement
/**
 * 用户停止任务（找不到时标记 stoppedByUser）。
 */
async function stopTaskByUser(taskId, context) {
  try {
    await stopTask(taskId, context);
    logFeatureOk("task_stop_user");
  } catch (error) {
    if (error instanceof StopTaskError) {
      if (error.code === "not_found") {
        if (context.source !== undefined && normalizeAgentIdOrNull(taskId) !== null)
          landAgentStop(
            identityAgentId2(taskId),
            "stoppedByUser",
            () =>
              updateAgentMetadata(
                identityAgentId2(taskId),
                {
                  stoppedByUser: true,
                },
                context.storageV5,
                isPathAbsent,
              ),
            context.storageV5,
          );
        logFeatureOk("task_stop_user");
        return;
      }
      if (
        error.code === "not_running" &&
        error.taskStatus !== undefined &&
        isTerminalTaskStatus(error.taskStatus)
      ) {
        logFeatureOk("task_stop_user");
        return;
      }
      logFeatureBad("task_stop_user", error.code);
      throw error;
    }
    logFeatureBad("task_stop_user", "unexpected");
    throw error;
  }
}
//@ chunk-kxyd0g16.js:25454-25867 placement
/**
 * 停止全部运行中的后台任务（可按条件筛选）。
 */
function stopAllRunningTasks(context) {
  let { taskRegistry, setAppState, shouldStop, storageV5 } = context;
  stopObserverAgents(context);
  for (let task of Object.values(taskRegistry.all())) {
    let isWaitableLive = isWaitingOnChildren(task) && isWaitableAgentOrWorkflow(task);
    if (
      isObserverAgentTask(task) ||
      (!isWaitableLive &&
        (task.status !== "running" || !waitForTaskCompletion(task) || !isWaitableAgentOrWorkflow(task))) ||
      (shouldStop !== undefined && !shouldStop(task))
    )
      continue;
    markStoppedByUser(task.id, taskRegistry, storageV5);
    if (task.type === "local_agent") {
      markAgentNotified(task.id, taskRegistry);
      dropQueuedCommandsForAgent(task.id);
    }
    lookupTaskForStop(task.type)?.kill(task.id, taskRegistry, setAppState, "system", storageV5);
    if (task.type === "local_agent")
      emitTaskNotification(task.id, "stopped", {
        toolUseId: task.toolUseId,
        summary: task.description,
      });
  }
}
//@ chunk-kxyd0g16.js:25867-26025 placement
/**
 * 停止所有正在运行的观察者代理任务。
 */
function stopObserverAgents(context) {
  for (let task of Object.values(context.taskRegistry.all()))
    if (isObserverAgentTask(task) && task.status === "running")
      lookupTaskForStop(task.type)?.kill(task.id, context.taskRegistry, context.setAppState, "system");
}
//@ chunk-kxyd0g16.js:26025-26308 placement
/**
 * 标记任务被用户停止并累计次数。
 */
function markStoppedByUser(taskId, taskRegistry, storageV5) {
  taskRegistry.update(taskId, (prev) =>
    isLocalAgent(prev)
      ? {
          ...prev,
          stoppedByUser: true,
          userStopCount: (prev.userStopCount ?? 0) + 1,
        }
      : prev.stoppedByUser
        ? prev
        : {
            ...prev,
            stoppedByUser: true,
          },
  );
  let task = taskRegistry.get(taskId);
  if (task?.type === "local_agent") {
    let agentType =
      "agentType" in task && typeof task.agentType === "string" ? task.agentType : "general-purpose";
    markAgentStoppedByUser(taskId, agentType, storageV5);
  }
}
//@ chunk-kxyd0g16.js:26308-26406 placement
function isSettledAgentAwaitingLoop(task, taskId) {
  return (
    isTerminalTaskStatus(task.status) &&
    (task.type === "local_agent" || task.type === "local_workflow") &&
    !isTaskLoopSettled(taskId)
  );
}
//@ chunk-kxyd0g16.js:26406-26589 placement
async function markAgentStoppedByUser(agentId, agentType, storageV5) {
  await landAgentStop(
    identityAgentId2(agentId),
    "stoppedByUser",
    async () => {
      let agentMetadata = await readAgentMetadata(identityAgentId2(agentId), storageV5, isPathAbsent);
      if (agentMetadata?.stoppedByUser) return;
      await writeAgentMetadata(
        identityAgentId2(agentId),
        {
          ...(agentMetadata ?? {
            agentType,
          }),
          stoppedByUser: true,
        },
        storageV5,
      );
    },
    storageV5,
  );
}
export {
  isSparedFromCascadeStop,
  isCascadeStopExempt,
  markStoppedByUser,
  emitCascadeSpared,
  stopTask,
  stopTaskByUser,
  stopObserverAgents,
  stopAllRunningTasks,
  getSelectableBackgroundTasks,
  formatTaskNotFoundMessage,
  isSettledAgentAwaitingLoop,
};
