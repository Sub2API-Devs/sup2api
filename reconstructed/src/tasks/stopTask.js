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
import { isTaskOwnedBy, Lq } from "./taskKinds.js";
import { WireSafeControlError, isPathAbsent } from "../utils/errors.js";
import { getRunningTeammateAgentIds } from "./InProcessTeammateTask/InProcessTeammateTask.js";
import { resolveTeammateAddress, Vgt } from "../utils/swarm/teammateAddressLookup.js";
import {
  isObserverAgentTask,
  killAsyncAgent,
  markAgentNotified,
  dropQueuedCommandsForAgent,
} from "./LocalAgentTask/LocalAgentTask.js";
import { Kvt, b_n } from "../services/remoteTools/backgroundCommands.js";
import { stopObserverPairing } from "../services/agentObserver/agentObserver.js";
import { isTerminalTaskStatus } from "./taskStatus.js";
import {
  isTaskLoopSettled,
  getTaskLoop,
  getTaskKillController,
  liveAgentControllers,
  taskAgentIds,
} from "./taskLoopRegistry.js";
import { killAgentProcessGroups, p3n, scheduleKillEscalation } from "../utils/agentProcessRegistry.js";
import { isLocalShellTask } from "./LocalShellTask/guards.js";
import {
  enqueueForeignStopNotification,
  enqueueUserStopNotification,
} from "./MonitorTask/monitorDelivery.js";
import { z_e } from "../utils/shell/processCpuTime.js";
import { escapeXml_2 as escapeXml } from "../utils/confusables.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { Um, Mr } from "../utils/agentId.js";
import {
  landAgentStop,
  updateAgentMetadata,
  readAgentMetadata,
  writeAgentMetadata,
} from "../utils/sessionStorage.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import { isLocalAgent } from "../state/teammateViewHelpers.js";

//@ chunk-kxyd0g16.js:20267-20423 placement = getSelectableBackgroundTasks (0.759)
function getSelectableBackgroundTasks(e, r, n) {
  let s = n?.().agentNameRegistry;
  if (!s) return;
  for (let [f, h] of s) {
    if (!e(f)) continue;
    let y = r.get(h);
    if (y?.type === "local_agent") return y;
  }
  return;
}
/**
 * 生成正在运行的后台子代理列表说明（排除当前、主会话、观察者与已注册命名的代理），附在停止任务结果后。
 */
//@ chunk-kxyd0g16.js:20423-20808 layout
function describeRunningBackgroundAgents(e, r, n) {
  let s = new Set(r?.().agentNameRegistry?.values() ?? []),
    mapped = Object.values(e.all())
      .filter(
        (h) =>
          h.type === "local_agent" &&
          h.id !== n &&
          h.agentType !== "main-session" &&
          h.isBackgrounded &&
          h.isObserver !== !0 &&
          !s.has(h.id) &&
          (h.status === "running" || isWaitingOnChildren(h)),
      )
      .map((h) => (h.description ? `${h.id} (${printableName(h.description)})` : h.id));
  return mapped.length > 0 ? `. Running background agents: ${mapped.join(", ")}` : "";
}
/**
 * 代理是否被某个已注册的级联停止豁免规则命中（全局 cascadeStopExemptions）。
 */
//@ chunk-kxyd0g16.js:20808-20890 layout
function isCascadeStopExempt(agentId) {
  for (let cascadeStopExemption of getTaskRunState().cascadeStopExemptions)
    if (cascadeStopExemption(agentId)) return !0;
  return !1;
}
/**
 * 子代理是否因豁免而在级联停止中被放过：自身被豁免，且其祖先链（排除自己）中有被豁免的代理。
 */
//@ chunk-kxyd0g16.js:20890-21033 layout
function isSparedFromCascadeStop(task, stoppedOwnerId, allTasks) {
  let s = "agentId" in task && typeof task.agentId === "string" ? task.agentId : void 0;
  return (
    s !== void 0 &&
    isCascadeStopExempt(s) &&
    isTaskOwnedBy(task, stoppedOwnerId, allTasks, (f) => f !== s && isCascadeStopExempt(f))
  );
}
/**
 * 有子代理被放过时发出 cascadeSpared 事件。
 */
//@ chunk-kxyd0g16.js:21033-21165 layout
function emitCascadeSpared(stoppedAgentId, sparedAgentIds, killedBy, taskRegistry) {
  if (sparedAgentIds.length === 0) return;
  getTaskRunState().cascadeSpared.emit({
    stoppedAgentId: stoppedAgentId,
    sparedAgentIds: sparedAgentIds,
    killedBy: killedBy,
    taskRegistry: taskRegistry,
  });
}
/**
 * TaskStop 拒绝错误，code 为 not_found / ambiguous / not_running / not_owner / unsupported_type，带任务当前状态。
 */
//@ chunk-kxyd0g16.js:21165-21323 fingerprint = StopTaskError (0.446)
class StopTaskError extends WireSafeControlError {
  code;
  taskStatus;
  constructor(e, r, n) {
    super(e, `StopTask: ${r}`, "stop_task_refused");
    this.code = r;
    this.taskStatus = n;
    this.name = "StopTaskError";
  }
}
/**
 * 列出代理名字注册表里仍在运行（或有存活工作）的本地代理名字。
 */
//@ chunk-kxyd0g16.js:21323-21515 layout = killAllRunningAgentTasks (0.849)
function getRunningAgentNames(taskRegistry, getAppState) {
  let n = getAppState?.().agentNameRegistry?.entries();
  if (!n) return [];
  let s = [];
  for (let [f, h] of n) {
    let y = taskRegistry.get(h);
    if (y?.type === "local_agent" && (y.status === "running" || isWaitingOnChildren(y))) s.push(f);
  }
  return s;
}
/**
 * 生成"找不到任务"的错误消息：可能的拼写建议、正在运行的队友与命名代理、后台代理列表。
 */
//@ chunk-kxyd0g16.js:21515-21814 layout
function formatTaskNotFoundMessage(e, r, n, s, f) {
  let h = getRunningTeammateAgentIds(r.all()),
    y = getRunningAgentNames(r, n),
    k = `No task found with ID: ${singleLineText(e)}`;
  if (s !== void 0) k += `. Did you mean: ${singleLineText(s)}?`;
  if (h.length > 0) k += `. Running teammates: ${h.map((w) => singleLineText(w)).join(", ")}`;
  if (y.length > 0) k += `. Running named agents: ${y.map((w) => singleLineText(w)).join(", ")}`;
  return k + describeRunningBackgroundAgents(r, n, f);
}
/**
 * 停止 MCP 任务时附加给模型的说明：不会再有结果，服务器可能已经做了部分工作。
 */
//@ chunk-kxyd0g16.js:21814-21925 layout
var MCP_TASK_STOPPED_NOTE =
  "No result will follow. The MCP server may already have done some of the work, or may still finish it.";
/**
 * 停止任务：先按 ID 查，查不到时按名字/前缀模糊解析（ambiguous/suggestion）；观察者代理不能停自己、非属主不能停；对"已结束但循环未退出"的 workflow/代理重新发中止并杀进程组；
 * 否则调用任务实现的 kill，并对 local_agent 级联停止其子代理（豁免的除外）；shell 任务补发 stopped 通知、通知属主代理或 SDK 来源。返回 {taskId, taskType, command, note?}。
 */
//@ chunk-kxyd0g16.js:21925-25016 fingerprint = stopTask (0.445)
async function stopTask(taskId, context) {
  let {
      taskRegistry: taskRegistry,
      setAppState: setAppState,
      getAppState: getAppState,
      callerAgentId: callerAgentId,
      killedBy: killedBy = "user",
      storageV5: storageV5,
    } = context,
    resolvedTaskId = taskId,
    task = taskRegistry.get(resolvedTaskId),
    suggestion;
  if (!task) {
    let L = resolveTeammateAddress(taskId, taskRegistry, getAppState);
    if (L.status === "ambiguous") {
      if (!L.anyLiveCandidate) throw new StopTaskError(L.message, "not_running", "completed");
      throw new StopTaskError(L.message, "ambiguous");
    }
    if (L.status === "found") ((task = L.task), (resolvedTaskId = L.task.id));
    else suggestion = L.suggestion;
  }
  if (!task)
    throw new StopTaskError(
      formatTaskNotFoundMessage(taskId, taskRegistry, getAppState, suggestion, callerAgentId),
      "not_found",
    );
  let displayId =
    resolvedTaskId === taskId ? resolvedTaskId : `${singleLineText(taskId)} (${resolvedTaskId})`;
  if (isObserverAgentTask(task)) {
    if (callerAgentId !== void 0 && callerAgentId === task.agentId)
      throw new StopTaskError(
        `Observer ${displayId} cannot stop itself; use the task UI or a main-session TaskStop.`,
        "not_owner",
      );
    if (!Kvt(callerAgentId, task.agentId))
      throw new StopTaskError(
        `Task ${displayId} is owned by ${singleLineText(b_n(task.agentId))}; agent ${singleLineText(String(callerAgentId))} cannot stop it.`,
        "not_owner",
      );
    if (context.source !== void 0)
      stopObserverPairing(context.session, resolvedTaskId, { agentType: task.agentType }, storageV5);
    if (
      task.status !== "running" &&
      !(isTerminalTaskStatus(task.status) && !isTaskLoopSettled(resolvedTaskId))
    )
      return (
        killAsyncAgent(resolvedTaskId, taskRegistry),
        { taskId: resolvedTaskId, taskType: task.type, command: task.description }
      );
  }
  let isEndedRemoteMonitor =
      task.status !== "running" && task.type === "monitor_ws" && context.source !== void 0,
    hasLingeringLoop = gt(task, resolvedTaskId),
    loopToken = hasLingeringLoop ? getTaskLoop(resolvedTaskId) : void 0;
  if (task.status !== "running" && !isWaitingOnChildren(task) && !isEndedRemoteMonitor && !hasLingeringLoop)
    throw new StopTaskError(
      `Task ${displayId} is not running (status: ${task.status})`,
      "not_running",
      task.status,
    );
  if (!isObserverAgentTask(task) && !Kvt(callerAgentId, task.agentId))
    throw new StopTaskError(
      `Task ${displayId} is owned by ${singleLineText(b_n(task.agentId))}; agent ${singleLineText(String(callerAgentId))} cannot stop it.`,
      "not_owner",
    );
  let taskImpl = Vgt(task.type);
  if (!taskImpl) throw new StopTaskError(`Unsupported task type: ${task.type}`, "unsupported_type");
  if (context.source !== void 0) markStoppedByUser(resolvedTaskId, taskRegistry, storageV5);
  if (hasLingeringLoop) {
    let L = getTaskKillController(resolvedTaskId);
    if (L && !L.signal.aborted) L.abort();
    for (let G of liveAgentControllers(resolvedTaskId))
      G.abort(new DOMException("workflow-abort", "AbortError"));
    let W = new Set(taskAgentIds(resolvedTaskId));
    if (task.type === "local_agent") W.add(resolvedTaskId);
    let Q = 0;
    for (let G of W) {
      if (getTaskLoop(resolvedTaskId) !== loopToken) break;
      let ae = killAgentProcessGroups(G);
      (p3n(ae), (Q += (await ae).length));
    }
    return (
      scheduleKillEscalation(resolvedTaskId, task.type === "local_agent" ? [resolvedTaskId] : [], {
        expectedLoopToken: loopToken,
      }),
      {
        taskId: resolvedTaskId,
        taskType: task.type,
        command: isLocalShellTask(task) ? task.command : task.description,
        note: `had already ended (${task.status}) but its loop had not exited; re-signalled it and killed ${Q} process group(s). The record remains listed while the loop is still live.`,
      }
    );
  }
  let hadLiveWork = isWaitingOnChildren(task);
  if (
    (await taskImpl.kill(resolvedTaskId, taskRegistry, setAppState, killedBy, storageV5, context.source),
    hadLiveWork)
  ) {
    let L = task.agentId ?? resolvedTaskId,
      all = taskRegistry.all(),
      Q = [];
    for (let G of Object.values(all)) {
      if (
        G.type !== "local_agent" ||
        G.id === resolvedTaskId ||
        (G.status !== "running" && !isWaitingOnChildren(G))
      )
        continue;
      if (isSparedFromCascadeStop(G, L, all)) {
        Q.push(G.id);
        continue;
      }
      if (isTaskOwnedBy(G, L, all, isCascadeStopExempt)) {
        if ((markAgentNotified(G.id, taskRegistry), !isObserverAgentTask(G)))
          emitTaskNotification(G.id, "stopped", { toolUseId: G.toolUseId, summary: G.description });
        if (context.source !== void 0) markStoppedByUser(G.id, taskRegistry, storageV5);
        await taskImpl.kill(G.id, taskRegistry, setAppState, killedBy, storageV5);
      }
    }
    emitCascadeSpared(L, Q, killedBy, taskRegistry);
  }
  if (isLocalShellTask(task)) {
    let L = !1;
    if (
      (taskRegistry.update(resolvedTaskId, (prev) => {
        if (prev.notified) return prev;
        return ((L = !0), { ...prev, notified: !0 });
      }),
      L)
    )
      emitTaskNotification(resolvedTaskId, "stopped", {
        toolUseId: task.toolUseId,
        summary: task.description,
      });
  }
  if (isLocalShellTask(task) && task.agentId !== void 0 && callerAgentId !== task.agentId)
    enqueueForeignStopNotification({
      taskId: resolvedTaskId,
      toolUseId: task.toolUseId,
      description: task.description,
      ownerAgentId: task.agentId,
    });
  if (isLocalShellTask(task) && task.agentId === void 0 && context.source !== void 0 && z_e())
    enqueueUserStopNotification({
      taskId: resolvedTaskId,
      toolUseId: task.toolUseId,
      description: task.description,
      source: context.source,
      outputFile: task.elsewhere ? escapeXml(task.outputFile) : task.outputFile,
    });
  if (
    task.type === "mcp_task" &&
    context.source !== void 0 &&
    z_e() &&
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
  return { taskId: resolvedTaskId, taskType: task.type, command: command };
}
/**
 * 用户停止任务（找不到时标记 stoppedByUser）。
 */
//@ chunk-kxyd0g16.js:25016-25454 placement
async function stopTaskByUser(e, r) {
  try {
    (await stopTask(e, r), logFeatureOk("task_stop_user"));
  } catch (error) {
    if (error instanceof StopTaskError) {
      if (error.code === "not_found") {
        if (r.source !== void 0 && Um(e) !== null)
          landAgentStop(
            Mr(e),
            "stoppedByUser",
            () => updateAgentMetadata(Mr(e), { stoppedByUser: !0 }, r.storageV5, isPathAbsent),
            r.storageV5,
          );
        logFeatureOk("task_stop_user");
        return;
      }
      if (
        error.code === "not_running" &&
        error.taskStatus !== void 0 &&
        isTerminalTaskStatus(error.taskStatus)
      ) {
        logFeatureOk("task_stop_user");
        return;
      }
      throw (logFeatureBad("task_stop_user", error.code), error);
    }
    throw (logFeatureBad("task_stop_user", "unexpected"), error);
  }
}
/**
 * 停止全部运行中的后台任务（可按条件筛选）。
 */
//@ chunk-kxyd0g16.js:25454-25867 placement
function stopAllRunningTasks(e) {
  let {
    taskRegistry: taskRegistry,
    setAppState: setAppState,
    shouldStop: shouldStop,
    storageV5: storageV5,
  } = e;
  stopObserverAgents(e);
  for (let h of Object.values(taskRegistry.all())) {
    let y = isWaitingOnChildren(h) && Lq(h);
    if (
      isObserverAgentTask(h) ||
      (!y && (h.status !== "running" || !waitForTaskCompletion(h) || !Lq(h))) ||
      (shouldStop !== void 0 && !shouldStop(h))
    )
      continue;
    if ((markStoppedByUser(h.id, taskRegistry, storageV5), h.type === "local_agent"))
      (markAgentNotified(h.id, taskRegistry), dropQueuedCommandsForAgent(h.id));
    if ((Vgt(h.type)?.kill(h.id, taskRegistry, setAppState, "system", storageV5), h.type === "local_agent"))
      emitTaskNotification(h.id, "stopped", { toolUseId: h.toolUseId, summary: h.description });
  }
}
/**
 * 停止所有正在运行的观察者代理任务。
 */
//@ chunk-kxyd0g16.js:25867-26025 placement
function stopObserverAgents(e) {
  for (let r of Object.values(e.taskRegistry.all()))
    if (isObserverAgentTask(r) && r.status === "running")
      Vgt(r.type)?.kill(r.id, e.taskRegistry, e.setAppState, "system");
}
/**
 * 标记任务被用户停止并累计次数。
 */
//@ chunk-kxyd0g16.js:26025-26308 placement
function markStoppedByUser(e, r, n) {
  r.update(e, (f) =>
    isLocalAgent(f)
      ? { ...f, stoppedByUser: !0, userStopCount: (f.userStopCount ?? 0) + 1 }
      : f.stoppedByUser
        ? f
        : { ...f, stoppedByUser: !0 },
  );
  let s = r.get(e);
  if (s?.type === "local_agent") {
    let f = "agentType" in s && typeof s.agentType === "string" ? s.agentType : "general-purpose";
    markAgentStoppedByUser(e, f, n);
  }
}
//@ chunk-kxyd0g16.js:26308-26406 placement
function gt(e, r) {
  return (
    isTerminalTaskStatus(e.status) &&
    (e.type === "local_agent" || e.type === "local_workflow") &&
    !isTaskLoopSettled(r)
  );
}
//@ chunk-kxyd0g16.js:26406-26589 placement
async function markAgentStoppedByUser(e, r, n) {
  await landAgentStop(
    Mr(e),
    "stoppedByUser",
    async () => {
      let s = await readAgentMetadata(Mr(e), n, isPathAbsent);
      if (s?.stoppedByUser) return;
      await writeAgentMetadata(Mr(e), { ...(s ?? { agentType: r }), stoppedByUser: !0 }, n);
    },
    n,
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
  gt,
};
