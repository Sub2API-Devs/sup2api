/**
 * utils/task/framework.ts
 *
 * 后台任务框架：注册、状态更新、完成通知附件、终态任务回收。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/task/framework.ts
 * pieces: chunk-6vnxsn99.js (17), chunk-e6aww6q8.js (11), chunk-gppkhxdv.js (1)
 * attribution: placement 18, fingerprint 6, layout 3, callgraph-fingerprint 2
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
  enqueueTaskNotification as enqueueTaskNotification_2,
  withFailureKind,
  emitTaskNotification,
  claimTerminalEmit,
  setTaskRunId,
} from "./taskNotifications.js";
import { createWebSearchBudget } from "../../tools/WebSearchTool/searchBudget.js";
import { isObserverAgentTask } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import {
  skipsTranscript,
  taskParentAgentId,
  isHoldCappedMcpTask,
  getSelectableBackgroundTasks,
  isAwaitedAgentTask,
  isCompletedBackgroundAgent,
  keepaliveReasons,
  releaseIfFinished,
} from "../../tasks/taskKinds.js";
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
import { REMOTE_TASK_PREFIX, NOTE } from "../../constants/xml.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { BACKGROUND_STOP_EXPLANATIONS } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6vnxsn99.js:62273-62322 placement
/**
 * 差异面板是否允许（tengu_jazzy_ripple 关闭时允许）。
 */
function isDiffPanelEnabled() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_jazzy_ripple", false);
}
//@ chunk-6vnxsn99.js:63428-63460 placement
/**
 * 任务通知延迟、MCP 任务保活与回收宽限的毫秒数常量组。
 */
var TASK_NOTIFICATION_DELAY_MS = 3000;
var MCP_TASK_KEEPALIVE_MS = 30000;
var TASK_EVICTION_GRACE_MS = 30000;
//@ chunk-6vnxsn99.js:63460-63652 placement
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
//@ chunk-6vnxsn99.js:63652-64633 placement
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
//@ chunk-6vnxsn99.js:64633-65517 placement
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
    isObserver = isObserverAgentTask(nextTask);
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
    enqueueTaskNotification_2(withFailureKind(patchEvent, terminalNotice?.opts?.failureKind));
  }
  if (terminalNotice !== null && !isObserver)
    emitTaskNotification(taskId, terminalNotice.status, terminalNotice.opts);
}
//@ chunk-6vnxsn99.js:65517-66032 placement
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
//@ chunk-6vnxsn99.js:66032-66129 placement
function ownedBySubagentFlag(task) {
  if (task.type === "local_bash") return "agentId" in task && task.agentId !== undefined ? true : undefined;
  return;
}
//@ chunk-6vnxsn99.js:66129-66353 placement
function isChildOfAgent(task, tasks) {
  if (task.type !== "local_agent") return false;
  for (let idField of ["parentAgentId", "ownerAgentId"]) {
    let idValue = idField in task ? task[idField] : undefined;
    if (typeof idValue !== "string" || !Object.hasOwn(tasks, idValue)) continue;
    if (tasks[idValue].chatPinForfeited === true) return true;
  }
  return false;
}
//@ chunk-6vnxsn99.js:66353-66494 placement
function isChatPinForfeited(task) {
  let agentId = task.type === "local_agent" && "agentId" in task ? task.agentId : undefined;
  return typeof agentId === "string" && getTaskRunState().chatPinForfeitedAgentIds.has(agentId);
}
//@ chunk-6vnxsn99.js:66494-66534 placement
/**
 * 任务既不是子代理任务也不是被放弃的聊天任务。
 */
function isChildOrForfeited(task, tasks) {
  return isChildOfAgent(task, tasks) || isChatPinForfeited(task);
}
//@ chunk-6vnxsn99.js:66534-68435 fingerprint (2.1.88 match: registerTask, 0.473)
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
  if (isObserverAgentTask(task)) return;
  if (isHoldCappedMcpTask(task)) return;
  enqueueTaskNotification_2({
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
//@ chunk-6vnxsn99.js:68435-68990 layout
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
//@ chunk-6vnxsn99.js:68990-69082 fingerprint (2.1.88 match: getRunningTasks, 1)
function getRunningTasks(state) {
  let tasks = state.tasks ?? {};
  return Object.values(tasks).filter((task) => task.status === "running");
}
//@ chunk-6vnxsn99.js:69082-69528 fingerprint (2.1.88 match: generateTaskAttachments, 0.847)
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
//@ chunk-6vnxsn99.js:69528-70338 fingerprint (2.1.88 match: applyTaskOffsetsAndEvictions, 0.569)
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
//@ chunk-6vnxsn99.js:71537-71907 placement
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
//@ chunk-6vnxsn99.js:71907-71957 placement
function agentEvictAt(task) {
  return isCompletedBackgroundAgent(task) ? undefined : Date.now() + MCP_TASK_KEEPALIVE_MS;
}
//@ chunk-gppkhxdv.js:261-450 placement
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
//@ chunk-e6aww6q8.js:1779529-1779561 placement
var todoListSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1779529", () => {
  todoListSchema = DoctorLazy(() =>
    objectSchema({
      todos: TodoListSchema(),
    }),
  );
});
//@ chunk-e6aww6q8.js:1779561-1779826 placement (2.1.88 match: getLastToolUseName, 0.817)
/**
 * 从消息中取最后一次（非子代理）TodoWrite 调用的 todos。
 */
function getTodosFromLastTodoWrite(message) {
  let block = message.findLast(
    (messageBlock) =>
      messageBlock.type === "assistant" &&
      !messageBlock.parent_tool_use_id &&
      messageBlock.message.content.some(
        (toolBlock) => toolBlock.type === "tool_use" && toolBlock.name === TODO_WRITE_TOOL_NAME,
      ),
  );
  if (!block) return [];
  let input = block.message.content.find(
    (todoBlock) => todoBlock.type === "tool_use" && todoBlock.name === TODO_WRITE_TOOL_NAME,
  )?.input;
  if (!input) return [];
  return parseTodoWriteTodos(input);
}
//@ chunk-e6aww6q8.js:1779826-1779900 placement
/**
 * 按 TodoWrite 输入 schema 解析 todos，失败返回 []。
 */
function parseTodoWriteTodos(input) {
  let parsed = todoListSchema().safeParse(input);
  return parsed.success ? parsed.data.todos : [];
}
//@ chunk-e6aww6q8.js:1779900-1780143 placement
/**
 * 任务创建成功消息的正则，以及 TaskCreate / TaskUpdate 输入 schema。
 */
var TASK_CREATED_RE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var taskCreateInputSchema;
var taskUpdateInputSchema;
deferInit("chunk-e6aww6q8.js:1779900", () => {
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
//@ chunk-e6aww6q8.js:1780143-1780717 placement
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
//@ chunk-e6aww6q8.js:1780717-1781079 layout
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
//@ chunk-e6aww6q8.js:1781079-1781152 layout
function getAllTrackedTasks(state) {
  return [...state.tasks.values(), ...state.pendingCreates.values()];
}
//@ chunk-e6aww6q8.js:1781152-1781696 callgraph-fingerprint (2.1.88 match: updateTaskState, 0.217)
function updateTaskState_2() {
  let state = {
    pendingCreates: new Map(),
    tasks: new Map(),
  };
  let task;
  let pendingCreate;
  return {
    observe(message) {
      if (message.type === "assistant" && !message.parent_tool_use_id) {
        for (let block of message.message.content)
          if (block.type === "tool_use" && trackTaskToolUse(state, block)) pendingCreate = undefined;
        let found = message.message.content.find(
          (prev) => prev.type === "tool_use" && prev.name === TODO_WRITE_TOOL_NAME,
        );
        if (found) {
          task = {
            ...message,
            message: {
              ...message.message,
              content: [found],
            },
          };
          pendingCreate = undefined;
        }
      } else if (message.type === "user") {
        let content = message.message.content;
        if (!Array.isArray(content)) return;
        for (let task_2 of content)
          if (task_2.type === "tool_result" && resolvePendingTaskCreate(state, task_2))
            pendingCreate = undefined;
      }
    },
    todos() {
      if (pendingCreate === undefined) {
        let updated = getAllTrackedTasks(state);
        pendingCreate = updated.length > 0 ? updated : task ? getTodosFromLastTodoWrite([task]) : [];
      }
      return pendingCreate;
    },
  };
}
//@ chunk-e6aww6q8.js:1784439-1785040 fingerprint (2.1.88 match: getStatusText, 0.36)
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
//@ chunk-e6aww6q8.js:4719155-4719236 fingerprint (2.1.88 match: evictTerminalTask, 0.521)
function evictTerminalTask(taskId, setAppState) {
  setAppState.update(taskId, (prev) => ({
    ...prev,
    notified: true,
    evictAfter: Date.now() + MCP_TASK_KEEPALIVE_MS,
  }));
}
//@ chunk-e6aww6q8.js:4745856-4746226 callgraph-fingerprint (2.1.88 match: enqueueTaskNotification, 0.275)
/**
 * 把任务完成通知加入命令队列（task-notification）。
 */
function enqueueTaskNotification({
  taskId,
  toolUseId,
  agentId,
  status,
  summary,
  outputFile,
  snapshot,
  stopCause,
  stopExplanation,
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
  };
}
export {
  agentEvictAt,
  claimTaskNotification,
  updateTaskState_2,
  getStatusText,
  createTaskFramework,
  hasOtherActiveAgents,
  MCP_TASK_KEEPALIVE_MS,
  TASK_NOTIFICATION_DELAY_MS,
  removeKeepaliveReason,
  TASK_EVICTION_GRACE_MS,
  isChildOrForfeited,
  getRunningTasks,
  isDiffPanelEnabled,
  evictTerminalTask,
  resolvePendingTaskCreate,
  trackTaskToolUse,
  getAllTrackedTasks,
  parseTodoWriteTodos,
  generateTaskAttachments,
  enqueueTaskNotification,
  TASK_CREATED_RE,
};
