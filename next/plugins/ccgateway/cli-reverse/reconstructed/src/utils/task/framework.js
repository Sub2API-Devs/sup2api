/**
 * utils/task/framework.ts
 *
 * 后台任务框架：注册、状态更新、完成通知附件、终态任务回收。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/task/framework.ts
 * pieces: chunk-01kgd7xg.js (17), chunk-5xgkngpb.js (10), chunk-ab36sake.js (1), chunk-nh1pvp1m.js (1)
 * attribution: placement 21, fingerprint 6, layout 1, callgraph-fingerprint 1
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { ownProperty } from "../git/gitLanes.js";
import { INITIAL_IN_PROGRESS_STATE } from "../../state/inProgressToolUses.js";
import {
  getTaskRunState,
  holdDiagLevels,
  failureKindOf,
  getRunId,
  enqueueTaskNotification,
  withFailureKind,
  emitTaskNotification,
  claimTerminalEmit,
  setTaskRunId,
} from "./taskNotifications.js";
import { createWebSearchBudget } from "../../tools/WebSearchTool/searchBudget.js";
import { codeModeAccepted } from "../codeMode/accepted.js";
import {
  isLocalScriptTask,
  skipsTranscript,
  taskParentAgentId,
  isHoldCappedMcpTask,
  getSelectableBackgroundTasks,
  isAwaitedAgentTask,
  isCompletedBackgroundAgent,
  keepaliveReasons,
  releaseIfFinished,
} from "../../tasks/taskKinds.js";
import { isObserverAgentTask } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { isTaskLoopSettled } from "../../tasks/taskLoopRegistry.js";
import { logForDebugging } from "../debug.js";
import { getTaskOutputDelta, getTaskOutputPath } from "./diskOutput.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { TodoListSchema } from "../todo/types.js";
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { coerceTaskCreateInput } from "../../tools/TaskCreateTool/inputAliases.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { normalizeTaskInputAliases } from "../../tools/TaskUpdateTool/inputAliases.js";
import { extractTextContent_2 } from "../messages.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { enqueuePendingNotification } from "../messageQueueManager.js";
import { formatTaskNotification } from "../xmlTags.js";
import { escapeXml_2 as escapeXml } from "../confusables.js";
import {
  REMOTE_TASK_PREFIX,
  NOTE,
  TASK_ID,
  TASK_NOTIFICATION,
  STATUS,
  SUMMARY,
} from "../../constants/xml.js";
import { mainAgentId, isDiskless } from "../../bootstrap/state.js";
import { BACKGROUND_STOP_EXPLANATIONS } from "../../tasks/LocalShellTask/backgroundNotices.js";
import {
  MAX_LISTED_ORPHANS,
  ORPHAN_SUMMARY_AGGREGATE_PREFIX,
  ORPHAN_SUMMARY_LIVE_PREFIX,
  STOPPED_OR_PAUSED_NOTE,
  unfinishedNote,
  ORPHAN_SUMMARY_KEY,
} from "../../tasks/resumeOrphanedTasks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-01kgd7xg.js:63421-63470 placement
/**
 * 差异面板是否允许（tengu_jazzy_ripple 关闭时允许）。
 */
function isDiffPanelEnabled() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_jazzy_ripple", false);
}
//@ chunk-01kgd7xg.js:64621-64653 placement
/**
 * 任务通知延迟、MCP 任务保活与回收宽限的毫秒数常量组。
 */
var TASK_NOTIFICATION_DELAY_MS = 3000;
var MCP_TASK_KEEPALIVE_MS = 30000;
var TASK_EVICTION_GRACE_MS = 30000;
//@ chunk-01kgd7xg.js:64653-64845 placement
function hasOtherActiveAgents(tasks, taskId) {
  for (let task of Object.values(tasks))
    if (
      task.id !== taskId &&
      (task.type === "in_process_teammate" ||
        (task.type === "local_agent" && task.agentType !== "main-session")) &&
      !isTerminalTaskStatus(task.status) &&
      !task.isIdle
    )
      return true;
  return false;
}
//@ chunk-01kgd7xg.js:64845-65826 placement
/**
 * 任务框架（register/update/updateTranscript/remove…）：把任务状态写进 AppState.tasks，并发出 task_updated 等 SDK 事件。
 */
function createTaskFramework(
  getState,
  setAppState,
  { refillWebSearchBudgetByDefault: refillsByDefault = false } = {},
) {
  let webSearchBudget;
  return {
    register(task) {
      registerTask(task, setAppState);
    },
    update(taskId, patch) {
      updateTaskState(taskId, setAppState, patch);
    },
    updateTranscript(taskId_2, updater) {
      setAppState((prev) => {
        let prevTranscript = ownProperty(prev.transcripts, taskId_2) ?? INITIAL_IN_PROGRESS_STATE;
        let nextTranscript = updater(prevTranscript);
        if (nextTranscript === prevTranscript) return prev;
        return {
          ...prev,
          transcripts: {
            ...prev.transcripts,
            [taskId_2]: nextTranscript,
          },
        };
      });
    },
    getTranscript(taskId_3) {
      return ownProperty(getState().transcripts, taskId_3);
    },
    remove(taskId_4) {
      getTaskRunState().taskEvicted.emit(taskId_4);
      setAppState((prev_2) => {
        if (!Object.hasOwn(prev_2.tasks, taskId_4)) return prev_2;
        let { [taskId_4]: removedTask, ...remainingTasks } = prev_2.tasks;
        let transcripts = prev_2.transcripts ?? {};
        let { [taskId_4]: removedTranscript, ...remainingTranscripts } = transcripts;
        return {
          ...prev_2,
          tasks: remainingTasks,
          transcripts: taskId_4 in transcripts ? remainingTranscripts : transcripts,
        };
      });
    },
    evictTerminal(taskId_5) {
      evictTerminalTaskIfReady(taskId_5, setAppState);
    },
    applyOffsetsAndEvict(updatedTaskOffsets, evictedTaskIds) {
      applyTaskOffsetsAndEvictions(setAppState, updatedTaskOffsets, evictedTaskIds);
    },
    get(taskId_6) {
      return ownProperty(getState().tasks, taskId_6);
    },
    all() {
      return getState().tasks;
    },
    getWebSearchBudget() {
      return (webSearchBudget ??= createWebSearchBudget({
        refillsByDefault,
      }));
    },
    resetWebSearchBudget() {
      webSearchBudget = undefined;
    },
    takeConcurrencySlot() {
      setAppState((prev_3) => ({
        ...prev_3,
        runningSubagents: prev_3.runningSubagents + 1,
      }));
      let released = false;
      return () => {
        if (released) return;
        released = true;
        setAppState((prev_4) => {
          let max = Math.max(0, prev_4.runningSubagents - 1);
          if (max === prev_4.runningSubagents) return prev_4;
          return {
            ...prev_4,
            runningSubagents: max,
          };
        });
      };
    },
    getConcurrentSubagents() {
      return getState().runningSubagents;
    },
  };
}
//@ chunk-01kgd7xg.js:65826-66723 placement
function updateTaskState(taskId, setAppState, updateFn) {
  let patch = null;
  let terminalNotice = null;
  let isObserver = false;
  using diagHold = holdDiagLevels();
  setAppState((prev) => {
    let existingTask = ownProperty(prev.tasks, taskId);
    if (!existingTask) return prev;
    let nextTask = updateFn(existingTask);
    if (nextTask === existingTask) return prev;
    patch = taskStateDiff(existingTask, nextTask);
    isObserver = (codeModeAccepted() && isLocalScriptTask(nextTask)) || isObserverAgentTask(nextTask);
    if (!isTerminalTaskStatus(existingTask.status) && isTerminalTaskStatus(nextTask.status))
      terminalNotice = {
        status:
          nextTask.status === "completed" ? "completed" : nextTask.status === "failed" ? "failed" : "stopped",
        opts: {
          toolUseId: nextTask.toolUseId,
          summary: nextTask.terminal?.summary ?? nextTask.description,
          failureKind: failureKindOf(nextTask.terminal),
          outputFile:
            "webFetchSavedFiles" in nextTask && nextTask.webFetchSavedFiles !== undefined
              ? undefined
              : (nextTask.terminal?.output_file ?? nextTask.outputFile),
          usage: nextTask.terminal?.usage,
          resourceLinks: nextTask.terminal?.resource_links,
          handback: nextTask.terminal?.handback,
          handbackReport: nextTask.terminal?.handback_report,
          skipTranscript: nextTask.skipTranscript,
          ambient: skipsTranscript(nextTask),
        },
      };
    return {
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: nextTask,
      },
    };
  });
  if (terminalNotice === null) diagHold.release();
  if (patch !== null && !isObserver) {
    let patchEvent = {
      type: "system",
      subtype: "task_updated",
      task_id: taskId,
      run_id: getRunId(taskId),
      patch,
    };
    enqueueTaskNotification(withFailureKind(patchEvent, terminalNotice?.opts?.failureKind));
  }
  if (terminalNotice !== null && !isObserver)
    emitTaskNotification(taskId, terminalNotice.status, terminalNotice.opts);
}
//@ chunk-01kgd7xg.js:66723-67238 placement
function taskStateDiff(prevTask, nextTask) {
  let patch = {};
  if (nextTask.status !== prevTask.status) patch.status = nextTask.status;
  if (nextTask.description !== prevTask.description) patch.description = nextTask.description;
  if (nextTask.endTime !== prevTask.endTime) patch.end_time = nextTask.endTime;
  if (nextTask.totalPausedMs !== prevTask.totalPausedMs) patch.total_paused_ms = nextTask.totalPausedMs;
  let error = "error" in prevTask ? prevTask.error : undefined;
  let error_2 = "error" in nextTask ? nextTask.error : undefined;
  if (error_2 !== error && error_2 !== undefined) patch.error = error_2;
  let isBackgrounded = "isBackgrounded" in prevTask ? prevTask.isBackgrounded : undefined;
  let isBackgrounded_2 = "isBackgrounded" in nextTask ? nextTask.isBackgrounded : undefined;
  if (isBackgrounded_2 !== isBackgrounded && isBackgrounded_2 !== undefined)
    patch.is_backgrounded = isBackgrounded_2;
  return Object.keys(patch).length > 0 ? patch : null;
}
//@ chunk-01kgd7xg.js:67238-67335 placement
function ownedBySubagentFlag(task) {
  if (task.type === "local_bash") return "agentId" in task && task.agentId !== undefined ? true : undefined;
  return;
}
//@ chunk-01kgd7xg.js:67335-67559 placement
function isChildOfAgent(task, tasks) {
  if (task.type !== "local_agent") return false;
  for (let idField of ["parentAgentId", "ownerAgentId"]) {
    let idValue = idField in task ? task[idField] : undefined;
    if (typeof idValue !== "string" || !Object.hasOwn(tasks, idValue)) continue;
    if (tasks[idValue].chatPinForfeited === true) return true;
  }
  return false;
}
//@ chunk-01kgd7xg.js:67559-67700 placement
function isChatPinForfeited(task) {
  let agentId = task.type === "local_agent" && "agentId" in task ? task.agentId : undefined;
  return typeof agentId === "string" && getTaskRunState().chatPinForfeitedAgentIds.has(agentId);
}
//@ chunk-01kgd7xg.js:67700-67740 placement
/**
 * 任务既不是子代理任务也不是被放弃的聊天任务。
 */
function isChildOrForfeited(task, tasks) {
  return isChildOfAgent(task, tasks) || isChatPinForfeited(task);
}
//@ chunk-01kgd7xg.js:67740-69733 fingerprint (2.1.88 match: registerTask, 0.456)
/**
 * 把后台任务注册进 AppState.tasks，并发出 SDK 任务开始事件。
 */
function registerTask(task, setAppState) {
  let isNewRun = claimTerminalEmit(task.id) && !isTerminalTaskStatus(task.status);
  if (isNewRun || !getTaskRunState().runIds.has(task.id)) setTaskRunId(task.id);
  let isExisting = false;
  let mergedTask = task;
  let parentTaskId;
  setAppState((prev) => {
    let existing = prev.tasks[task.id];
    isExisting = existing !== undefined;
    let merged =
      existing && "retain" in existing
        ? {
            ...task,
            retain: existing.retain,
            startTime: existing.startTime,
            diskLoaded: existing.diskLoaded,
            pendingMessages: existing.pendingMessages,
            keepaliveReasons: existing.keepaliveReasons,
            ownerAgentId: existing.ownerAgentId,
            parentAgentId: existing.parentAgentId,
            ...(existing.startedUnderUseCase !== task.startedUnderUseCase && {
              startedUnderUseCase: undefined,
            }),
            ...(existing.spawnDepth !== undefined && {
              spawnDepth: existing.spawnDepth,
            }),
            ...(existing.isObserver !== undefined && {
              isObserver: existing.isObserver,
            }),
            ...(existing.forkedSkillName !== undefined && {
              forkedSkillName: existing.forkedSkillName,
            }),
            ...(existing.chatEngaged !== undefined && {
              chatEngaged: existing.chatEngaged,
            }),
            ...(existing.chatPinForfeited !== undefined && {
              chatPinForfeited: existing.chatPinForfeited,
            }),
            ...(existing.userStopCount !== undefined && {
              userStopCount: existing.userStopCount,
            }),
            ...(existing.handbackRecipient !== undefined && {
              handbackRecipient: existing.handbackRecipient,
            }),
            ...(existing.status === "completed" &&
              existing.waitingNoticeRecipient !== undefined && {
                waitingNoticeRecipient: existing.waitingNoticeRecipient,
              }),
            ...(existing.ownerCanContinueAgents !== undefined && {
              ownerCanContinueAgents: existing.ownerCanContinueAgents,
            }),
            ...(existing.handbackReport !== undefined && {
              handbackReport: existing.handbackReport,
            }),
            ...(existing.webFetchSavedFiles !== undefined && {
              webFetchSavedFiles: existing.webFetchSavedFiles,
            }),
            ...(existing.spawnedSubagent !== undefined && {
              spawnedSubagent: existing.spawnedSubagent,
            }),
            ...("progress" in existing &&
              existing.progress !== undefined && {
                progress: existing.progress,
              }),
          }
        : isChildOrForfeited(task, prev.tasks)
          ? {
              ...task,
              chatPinForfeited: true,
            }
          : task;
    mergedTask = merged;
    parentTaskId = taskParentAgentId(merged, prev.tasks);
    return {
      ...prev,
      tasks: {
        ...prev.tasks,
        [task.id]: merged,
      },
    };
  });
  if (isExisting && !isNewRun) return;
  if ((codeModeAccepted() && isLocalScriptTask(task)) || isObserverAgentTask(task)) return;
  if (isHoldCappedMcpTask(task)) return;
  enqueueTaskNotification({
    type: "system",
    subtype: "task_started",
    task_id: task.id,
    run_id: getRunId(task.id),
    owned_by_subagent: ownedBySubagentFlag(task),
    tool_use_id: task.toolUseId,
    description: task.description,
    subagent_type: getSelectableBackgroundTasks(task),
    is_backgrounded: "isBackgrounded" in mergedTask ? mergedTask.isBackgrounded : undefined,
    ...(isAwaitedAgentTask(mergedTask) && {
      awaited: true,
    }),
    spawn_depth: "spawnDepth" in mergedTask ? mergedTask.spawnDepth : undefined,
    parent_task_id: parentTaskId,
    task_type: task.type,
    workflow_name: "workflowName" in task ? task.workflowName : undefined,
    prompt: "prompt" in task ? task.prompt : undefined,
    skip_transcript: task.skipTranscript,
    ...(skipsTranscript(task) && {
      ambient: true,
    }),
  });
}
//@ chunk-01kgd7xg.js:69733-70288 layout
function evictTerminalTaskIfReady(taskId, setAppState) {
  let evicted = false;
  setAppState((prev) => {
    let existingTask = ownProperty(prev.tasks, taskId);
    if (!existingTask) return prev;
    if (!isTerminalTaskStatus(existingTask.status)) return prev;
    if (!existingTask.notified) return prev;
    if ("retain" in existingTask && (existingTask.evictAfter ?? 1 / 0) > Date.now()) return prev;
    if ("retain" in existingTask && (existingTask.keepaliveReasons?.size ?? 0) > 0) return prev;
    if (
      existingTask.type === "local_workflow" &&
      ((existingTask.evictAfter ?? 0) > Date.now() || !isTaskLoopSettled(taskId))
    )
      return prev;
    if (existingTask.type === "mcp_task" && (existingTask.endTime ?? 0) + MCP_TASK_KEEPALIVE_MS > Date.now())
      return prev;
    evicted = true;
    let { [taskId]: removedTask, ...remainingTasks } = prev.tasks;
    let transcripts = prev.transcripts ?? {};
    let { [taskId]: removedTranscript, ...remainingTranscripts } = transcripts;
    return {
      ...prev,
      tasks: remainingTasks,
      transcripts: taskId in transcripts ? remainingTranscripts : transcripts,
    };
  });
  if (evicted) {
    logForDebugging(`evictTerminalTask: evicted task ${taskId}`);
    getTaskRunState().taskEvicted.emit(taskId);
  }
}
//@ chunk-01kgd7xg.js:70288-70380 fingerprint (2.1.88 match: getRunningTasks, 1)
function getRunningTasks(state) {
  let tasks = state.tasks ?? {};
  return Object.values(tasks).filter((task) => task.status === "running");
}
//@ chunk-01kgd7xg.js:70380-70826 fingerprint (2.1.88 match: generateTaskAttachments, 0.847)
/**
 * 为已完成/失败/被杀的后台任务生成 task 通知附件，注入下一轮对话。
 */
async function generateTaskAttachments(state) {
  let attachments = [];
  let updatedTaskOffsets = {};
  let evictedTaskIds = [];
  for (let taskState of Object.values(state)) {
    if (taskState.notified)
      switch (taskState.status) {
        case "completed":
        case "failed":
        case "killed":
          if (isCompletedBackgroundAgent(taskState)) continue;
          evictedTaskIds.push(taskState.id);
          continue;
        case "pending":
          continue;
        case "running":
          break;
      }
    if (
      taskState.status === "running" &&
      taskState.outputFile !== undefined &&
      !(taskState.type === "local_bash" && taskState.elsewhere)
    ) {
      let delta = await getTaskOutputDelta(taskState.id, taskState.outputOffset);
      if (delta.content) updatedTaskOffsets[taskState.id] = delta.newOffset;
    }
  }
  return {
    attachments,
    updatedTaskOffsets,
    evictedTaskIds,
  };
}
//@ chunk-01kgd7xg.js:70826-71636 fingerprint (2.1.88 match: applyTaskOffsetsAndEvictions, 0.569)
function applyTaskOffsetsAndEvictions(setAppState, updatedTaskOffsets, evictedTaskIds) {
  let offsetIds = Object.keys(updatedTaskOffsets);
  if (offsetIds.length === 0 && evictedTaskIds.length === 0) return;
  let evictedIds = [];
  setAppState((prev) => {
    let changed = false;
    let newTasks = {
      ...prev.tasks,
    };
    for (let id of offsetIds) {
      let fresh = newTasks[id];
      if (fresh?.status === "running") {
        newTasks[id] = {
          ...fresh,
          outputOffset: updatedTaskOffsets[id],
        };
        changed = true;
      }
    }
    for (let id of evictedTaskIds) {
      let task = newTasks[id];
      if (!task || !isTerminalTaskStatus(task.status) || !task.notified) continue;
      if ("retain" in task && (task.evictAfter ?? 1 / 0) > Date.now()) continue;
      if ("retain" in task && (task.keepaliveReasons?.size ?? 0) > 0) continue;
      if (task.type === "local_workflow" && ((task.evictAfter ?? 0) > Date.now() || !isTaskLoopSettled(id)))
        continue;
      if (task.type === "mcp_task" && (task.endTime ?? 0) + MCP_TASK_KEEPALIVE_MS > Date.now()) continue;
      delete newTasks[id];
      claimTerminalEmit(id);
      evictedIds.push(id);
      changed = true;
    }
    if (!changed) return prev;
    let nextTranscripts;
    for (let taskId of evictedIds)
      if (prev.transcripts && taskId in prev.transcripts) {
        nextTranscripts ??= {
          ...prev.transcripts,
        };
        delete nextTranscripts[taskId];
      }
    return {
      ...prev,
      tasks: newTasks,
      ...(nextTranscripts && {
        transcripts: nextTranscripts,
      }),
    };
  });
  for (let taskId_2 of evictedIds) {
    logForDebugging(`applyTaskOffsetsAndEvictions: evicted task ${taskId_2}`);
    getTaskRunState().taskEvicted.emit(taskId_2);
  }
}
//@ chunk-01kgd7xg.js:72904-73274 placement
function removeKeepaliveReason(taskId, reason, state) {
  if (!taskId) return;
  let currentTask = state.get(taskId);
  let hadReason = isLocalAgent(currentTask) && keepaliveReasons(currentTask).has(reason);
  state.update(taskId, (task) => {
    if (!isLocalAgent(task) || !keepaliveReasons(task).has(reason)) return task;
    let remainingReasons = new Set(keepaliveReasons(task));
    remainingReasons.delete(reason);
    let isParkedCompleted = isCompletedBackgroundAgent(task);
    let shouldEvict =
      remainingReasons.size === 0 && isTerminalTaskStatus(task.status) && !task.retain && !isParkedCompleted;
    return {
      ...task,
      keepaliveReasons: remainingReasons,
      ...(remainingReasons.size === 0 &&
        isParkedCompleted &&
        task.quietlyParked === true && {
          quietlyParked: false,
        }),
      ...(shouldEvict &&
        task.evictAfter === undefined && {
          evictAfter: Date.now() + MCP_TASK_KEEPALIVE_MS,
        }),
    };
  });
  if (hadReason) releaseIfFinished(taskId, state);
}
//@ chunk-01kgd7xg.js:73274-73324 placement
function agentEvictAt(task) {
  return isCompletedBackgroundAgent(task) ? undefined : Date.now() + MCP_TASK_KEEPALIVE_MS;
}
//@ chunk-ab36sake.js:261-450 placement
/**
 * 认领任务通知：任务尚未通知时标记为已通知（运行中且要求跳过时不标记），返回是否认领成功与任务快照。
 */
function claimTaskNotification(taskId, taskRegistry, options) {
  let claimed = false;
  let task;
  taskRegistry.update(taskId, (task_2) => {
    task = task_2;
    if (task_2.notified) return task_2;
    claimed = true;
    if (options?.skipStampIfRunning && task_2.status === "running") return task_2;
    return {
      ...task_2,
      notified: true,
    };
  });
  return {
    claimed,
    task,
  };
}
//@ chunk-5xgkngpb.js:1856499-1856531 placement (2.1.88 match: TodoListSchema, 0)
var todoListSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1856499", () => {
  todoListSchema = DoctorLazy(() =>
    objectSchema({
      todos: TodoListSchema(),
    }),
  );
});
//@ chunk-5xgkngpb.js:1856531-1856796 placement
/**
 * 从消息中取最后一次（非子代理）TodoWrite 调用的 todos。
 */
function getTodosFromLastTodoWrite(messages) {
  let last = messages.findLast(
    (messageBlock) =>
      messageBlock.type === "assistant" &&
      !messageBlock.parent_tool_use_id &&
      messageBlock.message.content.some(
        (toolBlock) => toolBlock.type === "tool_use" && toolBlock.name === TODO_WRITE_TOOL_NAME,
      ),
  );
  if (!last) return [];
  let input = last.message.content.find(
    (todoBlock) => todoBlock.type === "tool_use" && todoBlock.name === TODO_WRITE_TOOL_NAME,
  )?.input;
  if (!input) return [];
  return parseTodoWriteTodos(input);
}
//@ chunk-5xgkngpb.js:1856796-1856870 placement (2.1.88 match: extractTodosFromTranscript, 1)
/**
 * 按 TodoWrite 输入 schema 解析 todos，失败返回 []。
 */
function parseTodoWriteTodos(input) {
  let parsed = todoListSchema().safeParse(input);
  return parsed.success ? parsed.data.todos : [];
}
//@ chunk-5xgkngpb.js:1856870-1857113 placement
/**
 * 任务创建成功消息的正则，以及 TaskCreate / TaskUpdate 输入 schema。
 */
var TASK_CREATED_RE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var taskCreateInputSchema;
var taskUpdateInputSchema;
deferInit("chunk-5xgkngpb.js:1856870", () => {
  TASK_CREATED_RE = /^Task #(\S+) created successfully/;
  taskCreateInputSchema = DoctorLazy(() =>
    objectSchema({
      subject: stringSchema(),
      activeForm: stringSchema().optional(),
    }),
  );
  taskUpdateInputSchema = DoctorLazy(() =>
    objectSchema({
      taskId: stringSchema(),
      status: _enum(["pending", "in_progress", "completed", "deleted"]).optional(),
      subject: stringSchema().optional(),
      activeForm: stringSchema().optional(),
    }),
  );
});
//@ chunk-5xgkngpb.js:1857113-1857687 placement
/**
 * 跟踪 TaskCreate/TaskUpdate 工具调用以推断任务列表：创建时记入 pendingCreates（内容、进行时文案、pending），更新时按 taskId 记录状态/标题变更。
 */
function trackTaskToolUse(state, input) {
  if (input.name === TASK_CREATE_TOOL_NAME) {
    let coerced = coerceTaskCreateInput(input.input);
    let parsed = taskCreateInputSchema().safeParse(coerced?.input ?? input.input);
    if (!parsed.success) return false;
    state.pendingCreates.set(input.id, {
      content: parsed.data.subject,
      activeForm: parsed.data.activeForm ?? parsed.data.subject,
      status: "pending",
    });
    return true;
  }
  if (input.name === TASK_UPDATE_TOOL_NAME) {
    let coerced_2 = normalizeTaskInputAliases(input.input);
    let parsed_2 = taskUpdateInputSchema().safeParse(coerced_2?.input ?? input.input);
    if (!parsed_2.success) return false;
    let { taskId, status, subject, activeForm } = parsed_2.data;
    if (status === "deleted") return state.tasks.delete(taskId);
    let previousTask = state.tasks.get(taskId);
    state.tasks.set(taskId, {
      content: subject ?? previousTask?.content ?? taskId,
      activeForm: activeForm ?? previousTask?.activeForm ?? subject ?? taskId,
      status: status ?? previousTask?.status ?? "pending",
    });
    return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:1857687-1858049 placement
function resolvePendingTaskCreate(state, result) {
  let pendingCreate = state.pendingCreates.get(result.tool_use_id);
  if (!pendingCreate) return false;
  if (result.is_error) {
    state.pendingCreates.delete(result.tool_use_id);
    return true;
  }
  let text = "";
  if (typeof result.content === "string") text = result.content;
  else if (Array.isArray(result.content)) text = extractTextContent_2(result.content);
  let createdTaskId = text.match(TASK_CREATED_RE)?.[1];
  if (!createdTaskId) return false;
  state.pendingCreates.delete(result.tool_use_id);
  if (!state.tasks.has(createdTaskId)) state.tasks.set(createdTaskId, pendingCreate);
  return true;
}
//@ chunk-5xgkngpb.js:1858049-1858122 placement
function getAllTrackedTasks(state) {
  return [...state.tasks.values(), ...state.pendingCreates.values()];
}
//@ chunk-5xgkngpb.js:1861416-1862017 fingerprint (2.1.88 match: getStatusText, 0.366)
function getStatusText(taskId, title, status, taskRegistry, toolUseId, extra) {
  if (!claimTaskNotification(taskId, taskRegistry).claimed) return;
  switch (status) {
    case "completed":
      logFeatureOk("task_remote_agent");
      break;
    case "failed":
      logFeatureBad("task_remote_agent", "task_remote_agent_failed");
      break;
    case "blocked":
      logFeatureBad("task_remote_agent", "requires_action");
      break;
    case "killed":
      break;
  }
  let statusPhrase =
    status === "completed"
      ? "completed successfully"
      : status === "failed"
        ? "failed"
        : status === "blocked"
          ? "is blocked"
          : "was stopped";
  enqueuePendingNotification(
    {
      value: formatTaskNotification({
        taskId,
        toolUseId,
        taskType: "remote_agent",
        outputFile: getTaskOutputPath(taskId),
        status,
        summary: extra ?? escapeXml(`${REMOTE_TASK_PREFIX}${title}" ${statusPhrase}`),
      }),
      mode: "task-notification",
      skipAttachments: true,
      agentId: mainAgentId(),
      priority: "next",
      taskId,
    },
    {
      turnAttribution: "inherit",
    },
  );
}
//@ chunk-5xgkngpb.js:4830359-4830440 fingerprint (2.1.88 match: evictTerminalTask, 0.52)
function evictTerminalTask(taskId, setAppState) {
  setAppState.update(taskId, (prev) => ({
    ...prev,
    notified: true,
    evictAfter: Date.now() + MCP_TASK_KEEPALIVE_MS,
  }));
}
//@ chunk-5xgkngpb.js:4864327-4864794 placement
/**
 * 把任务完成通知加入命令队列（task-notification）。
 */
function taskNotificationDelivery({
  taskId,
  toolUseId,
  agentId,
  status,
  summary,
  outputFile,
  snapshot,
  stopCause,
  stopExplanation,
  endNote,
  ownTaskUseCase,
  body,
}) {
  return {
    value: formatTaskNotification({
      taskId,
      toolUseId,
      outputFile,
      status,
      summary: escapeXml(summary),
      body: `${
        stopCause
          ? `
<${NOTE}>${escapeXml(stopExplanation ?? BACKGROUND_STOP_EXPLANATIONS[stopCause])}</${NOTE}>`
          : ""
      }${
        endNote
          ? `
<${NOTE}>${escapeXml(endNote)}</${NOTE}>`
          : ""
      }${body ?? ""}`,
    }),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    agentId: agentId ?? mainAgentId(),
    taskId,
    ...(snapshot && {
      taskDelivery: snapshot,
    }),
    ...(ownTaskUseCase !== undefined && {
      ownTaskUseCase,
    }),
  };
}
//@ chunk-nh1pvp1m.js:34789-35912 callgraph-fingerprint (2.1.88 match: enqueueTaskNotification, 0.22)
/**
 * 恢复会话时，对上次进程中没有结束记录的后台任务发一条汇总 task-notification（标 failed 或 stopped，列出任务 id）。
 */
function enqueueOrphanedTasksNotification(status, taskKind, taskKindLabel, taskIds, formatId, extraIds) {
  let mapped = taskIds.slice(0, MAX_LISTED_ORPHANS).map(formatId);
  let joined = [
    ...mapped,
    `${ORPHAN_SUMMARY_AGGREGATE_PREFIX}${taskKind}`,
    ...extraIds.map((extraId) => `${ORPHAN_SUMMARY_LIVE_PREFIX}${escapeXml(extraId)}`),
  ].map((row) => `<${TASK_ID}>${row}</${TASK_ID}>`).join(`
`);
  let explanation =
    status === "failed"
      ? `They were running when the previous Claude Code process exited and did not complete; their in-process state was lost.${isDiskless() ? "" : " Check each worktree/output for partial work before assuming a task landed."} They have been marked failed.`
      : `They may have been ${taskKind === "workflow" ? STOPPED_OR_PAUSED_NOTE : "stopped (via the UI, Monitor timeout, or agent teardown \u2014 these leave no transcript marker)"}, or they may have been running when the previous Claude Code process exited. They have been marked stopped.`;
  let idsSentence =
    mapped.length === taskIds.length
      ? `Task ids: ${mapped.join(", ")}.`
      : `First ${MAX_LISTED_ORPHANS} task ids: ${mapped.join(", ")}.`;
  enqueuePendingNotification({
    value: `<${TASK_NOTIFICATION}>
${joined}
<${STATUS}>${status}</${STATUS}>
<${SUMMARY}>${unfinishedNote(`${taskIds.length} background ${taskKindLabel} tasks`)}. ${idsSentence}</${SUMMARY}>
<${NOTE}>No completion record was found for them in the previous session. ${explanation} Task ids in this notification beginning with "${ORPHAN_SUMMARY_KEY}" are internal scan markers, not tasks.</${NOTE}>
</${TASK_NOTIFICATION}>`,
    agentId: mainAgentId(),
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
    shouldQuery: false,
  });
}
export {
  removeKeepaliveReason,
  MCP_TASK_KEEPALIVE_MS,
  claimTaskNotification,
  TASK_EVICTION_GRACE_MS,
  isChildOrForfeited,
  createTaskFramework,
  getRunningTasks,
  TASK_CREATED_RE,
  trackTaskToolUse,
  resolvePendingTaskCreate,
  generateTaskAttachments,
  TASK_NOTIFICATION_DELAY_MS,
  hasOtherActiveAgents,
  getStatusText,
  getAllTrackedTasks,
  getTodosFromLastTodoWrite,
  taskNotificationDelivery,
  evictTerminalTask,
  isDiffPanelEnabled,
  parseTodoWriteTodos,
  enqueueOrphanedTasksNotification,
  agentEvictAt,
};
