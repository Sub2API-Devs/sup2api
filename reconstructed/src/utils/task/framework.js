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
import { u, string, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
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
  for (let r of Object.values(tasks))
    if (
      r.id !== taskId &&
      (r.type === "in_process_teammate" || (r.type === "local_agent" && r.agentType !== "main-session")) &&
      !isTerminalTaskStatus(r.status) &&
      !r.isIdle
    )
      return true;
  return false;
}
//@ chunk-6vnxsn99.js:63652-64633 placement
/**
 * 任务框架（register/update/updateTranscript/remove…）：把任务状态写进 AppState.tasks，并发出 task_updated 等 SDK 事件。
 */
function createTaskFramework(e, setAppState, { refillWebSearchBudgetByDefault: r = false } = {}) {
  let o;
  return {
    register(task) {
      registerTask(task, setAppState);
    },
    update(s, a) {
      updateTaskState(s, setAppState, a);
    },
    updateTranscript(s, a) {
      setAppState((u) => {
        let h = ownProperty(u.transcripts, s) ?? INITIAL_IN_PROGRESS_STATE;
        let p = a(h);
        if (p === h) return u;
        return {
          ...u,
          transcripts: {
            ...u.transcripts,
            [s]: p,
          },
        };
      });
    },
    getTranscript(s) {
      return ownProperty(e().transcripts, s);
    },
    remove(s) {
      getTaskRunState().taskEvicted.emit(s);
      setAppState((a) => {
        if (!Object.hasOwn(a.tasks, s)) return a;
        let { [s]: u, ...h } = a.tasks;
        let transcripts = a.transcripts ?? {};
        let { [s]: S, ...y } = transcripts;
        return {
          ...a,
          tasks: h,
          transcripts: s in transcripts ? y : transcripts,
        };
      });
    },
    evictTerminal(s) {
      evictTerminalTaskIfReady(s, setAppState);
    },
    applyOffsetsAndEvict(updatedTaskOffsets, evictedTaskIds) {
      applyTaskOffsetsAndEvictions(setAppState, updatedTaskOffsets, evictedTaskIds);
    },
    get(s) {
      return ownProperty(e().tasks, s);
    },
    all() {
      return e().tasks;
    },
    getWebSearchBudget() {
      return (o ??= createWebSearchBudget({
        refillsByDefault: r,
      }));
    },
    resetWebSearchBudget() {
      o = undefined;
    },
    takeConcurrencySlot() {
      setAppState((a) => ({
        ...a,
        runningSubagents: a.runningSubagents + 1,
      }));
      let s = false;
      return () => {
        if (s) return;
        s = true;
        setAppState((a) => {
          let max = Math.max(0, a.runningSubagents - 1);
          if (max === a.runningSubagents) return a;
          return {
            ...a,
            runningSubagents: max,
          };
        });
      };
    },
    getConcurrentSubagents() {
      return e().runningSubagents;
    },
  };
}
//@ chunk-6vnxsn99.js:64633-65517 placement
function updateTaskState(e, n, r) {
  let o = null;
  let s = null;
  let a = false;
  using u = holdDiagLevels();
  n((h) => {
    let p = ownProperty(h.tasks, e);
    if (!p) return h;
    let S = r(p);
    if (S === p) return h;
    o = taskStateDiff(p, S);
    a = isObserverAgentTask(S);
    if (!isTerminalTaskStatus(p.status) && isTerminalTaskStatus(S.status))
      s = {
        status: S.status === "completed" ? "completed" : S.status === "failed" ? "failed" : "stopped",
        opts: {
          toolUseId: S.toolUseId,
          summary: S.terminal?.summary ?? S.description,
          failureKind: failureKindOf(S.terminal),
          outputFile:
            "webFetchSavedFiles" in S && S.webFetchSavedFiles !== undefined
              ? undefined
              : (S.terminal?.output_file ?? S.outputFile),
          usage: S.terminal?.usage,
          resourceLinks: S.terminal?.resource_links,
          handback: S.terminal?.handback,
          handbackReport: S.terminal?.handback_report,
          skipTranscript: S.skipTranscript,
          ambient: skipsTranscript(S),
        },
      };
    return {
      ...h,
      tasks: {
        ...h.tasks,
        [e]: S,
      },
    };
  });
  if (s === null) u.release();
  if (o !== null && !a) {
    let h = {
      type: "system",
      subtype: "task_updated",
      task_id: e,
      run_id: getRunId(e),
      patch: o,
    };
    enqueueTaskNotification_2(withFailureKind(h, s?.opts?.failureKind));
  }
  if (s !== null && !a) emitTaskNotification(e, s.status, s.opts);
}
//@ chunk-6vnxsn99.js:65517-66032 placement
function taskStateDiff(e, n) {
  let r = {};
  if (n.status !== e.status) r.status = n.status;
  if (n.description !== e.description) r.description = n.description;
  if (n.endTime !== e.endTime) r.end_time = n.endTime;
  if (n.totalPausedMs !== e.totalPausedMs) r.total_paused_ms = n.totalPausedMs;
  let error = "error" in e ? e.error : undefined;
  let error_2 = "error" in n ? n.error : undefined;
  if (error_2 !== error && error_2 !== undefined) r.error = error_2;
  let isBackgrounded = "isBackgrounded" in e ? e.isBackgrounded : undefined;
  let isBackgrounded_2 = "isBackgrounded" in n ? n.isBackgrounded : undefined;
  if (isBackgrounded_2 !== isBackgrounded && isBackgrounded_2 !== undefined)
    r.is_backgrounded = isBackgrounded_2;
  return Object.keys(r).length > 0 ? r : null;
}
//@ chunk-6vnxsn99.js:66032-66129 placement
function ownedBySubagentFlag(task) {
  if (task.type === "local_bash") return "agentId" in task && task.agentId !== undefined ? true : undefined;
  return;
}
//@ chunk-6vnxsn99.js:66129-66353 placement
function isChildOfAgent(e, n) {
  if (e.type !== "local_agent") return false;
  for (let r of ["parentAgentId", "ownerAgentId"]) {
    let o = r in e ? e[r] : undefined;
    if (typeof o !== "string" || !Object.hasOwn(n, o)) continue;
    if (n[o].chatPinForfeited === true) return true;
  }
  return false;
}
//@ chunk-6vnxsn99.js:66353-66494 placement
function isChatPinForfeited(e) {
  let agentId = e.type === "local_agent" && "agentId" in e ? e.agentId : undefined;
  return typeof agentId === "string" && getTaskRunState().chatPinForfeitedAgentIds.has(agentId);
}
//@ chunk-6vnxsn99.js:66494-66534 placement
/**
 * 任务既不是子代理任务也不是被放弃的聊天任务。
 */
function isChildOrForfeited(e, tasks) {
  return isChildOfAgent(e, tasks) || isChatPinForfeited(e);
}
//@ chunk-6vnxsn99.js:66534-68435 fingerprint = registerTask (0.473)
/**
 * 把后台任务注册进 AppState.tasks，并发出 SDK 任务开始事件。
 */
function registerTask(task, setAppState) {
  let o = claimTerminalEmit(task.id) && !isTerminalTaskStatus(task.status);
  if (o || !getTaskRunState().runIds.has(task.id)) setTaskRunId(task.id);
  let s = false;
  let a = task;
  let parentTaskId;
  setAppState((prev) => {
    let existing = prev.tasks[task.id];
    s = existing !== undefined;
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
    a = merged;
    parentTaskId = taskParentAgentId(merged, prev.tasks);
    return {
      ...prev,
      tasks: {
        ...prev.tasks,
        [task.id]: merged,
      },
    };
  });
  if (s && !o) return;
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
    is_backgrounded: "isBackgrounded" in a ? a.isBackgrounded : undefined,
    ...(isAwaitedAgentTask(a) && {
      awaited: true,
    }),
    spawn_depth: "spawnDepth" in a ? a.spawnDepth : undefined,
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
function evictTerminalTaskIfReady(e, n) {
  let r = false;
  n((prev) => {
    let s = ownProperty(prev.tasks, e);
    if (!s) return prev;
    if (!isTerminalTaskStatus(s.status)) return prev;
    if (!s.notified) return prev;
    if ("retain" in s && (s.evictAfter ?? 1 / 0) > Date.now()) return prev;
    if ("retain" in s && (s.keepaliveReasons?.size ?? 0) > 0) return prev;
    if (s.type === "local_workflow" && ((s.evictAfter ?? 0) > Date.now() || !isTaskLoopSettled(e)))
      return prev;
    if (s.type === "mcp_task" && (s.endTime ?? 0) + MCP_TASK_KEEPALIVE_MS > Date.now()) return prev;
    r = true;
    let { [e]: a, ...remainingTasks } = prev.tasks;
    let transcripts = prev.transcripts ?? {};
    let { [e]: p, ...S } = transcripts;
    return {
      ...prev,
      tasks: remainingTasks,
      transcripts: e in transcripts ? S : transcripts,
    };
  });
  if (r) {
    logForDebugging(`evictTerminalTask: evicted task ${e}`);
    getTaskRunState().taskEvicted.emit(e);
  }
}
//@ chunk-6vnxsn99.js:68990-69082 fingerprint = getRunningTasks (1)
function getRunningTasks(state) {
  let tasks = state.tasks ?? {};
  return Object.values(tasks).filter((task) => task.status === "running");
}
//@ chunk-6vnxsn99.js:69082-69528 fingerprint = generateTaskAttachments (0.847)
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
//@ chunk-6vnxsn99.js:69528-70338 fingerprint = applyTaskOffsetsAndEvictions (0.569)
function applyTaskOffsetsAndEvictions(setAppState, updatedTaskOffsets, evictedTaskIds) {
  let offsetIds = Object.keys(updatedTaskOffsets);
  if (offsetIds.length === 0 && evictedTaskIds.length === 0) return;
  let s = [];
  setAppState((prev) => {
    let u = false;
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
        u = true;
      }
    }
    for (let id of evictedTaskIds) {
      let y = newTasks[id];
      if (!y || !isTerminalTaskStatus(y.status) || !y.notified) continue;
      if ("retain" in y && (y.evictAfter ?? 1 / 0) > Date.now()) continue;
      if ("retain" in y && (y.keepaliveReasons?.size ?? 0) > 0) continue;
      if (y.type === "local_workflow" && ((y.evictAfter ?? 0) > Date.now() || !isTaskLoopSettled(id)))
        continue;
      if (y.type === "mcp_task" && (y.endTime ?? 0) + MCP_TASK_KEEPALIVE_MS > Date.now()) continue;
      delete newTasks[id];
      claimTerminalEmit(id);
      s.push(id);
      u = true;
    }
    if (!u) return prev;
    let p;
    for (let S of s)
      if (prev.transcripts && S in prev.transcripts) {
        p ??= {
          ...prev.transcripts,
        };
        delete p[S];
      }
    return {
      ...prev,
      tasks: newTasks,
      ...(p && {
        transcripts: p,
      }),
    };
  });
  for (let a of s) {
    logForDebugging(`applyTaskOffsetsAndEvictions: evicted task ${a}`);
    getTaskRunState().taskEvicted.emit(a);
  }
}
//@ chunk-6vnxsn99.js:71537-71907 placement
function removeKeepaliveReason(e, n, r) {
  if (!e) return;
  let o = r.get(e);
  let s = isLocalAgent(o) && keepaliveReasons(o).has(n);
  r.update(e, (a) => {
    if (!isLocalAgent(a) || !keepaliveReasons(a).has(n)) return a;
    let u = new Set(keepaliveReasons(a));
    u.delete(n);
    let h = isCompletedBackgroundAgent(a);
    let p = u.size === 0 && isTerminalTaskStatus(a.status) && !a.retain && !h;
    return {
      ...a,
      keepaliveReasons: u,
      ...(u.size === 0 &&
        h &&
        a.quietlyParked === true && {
          quietlyParked: false,
        }),
      ...(p &&
        a.evictAfter === undefined && {
          evictAfter: Date.now() + MCP_TASK_KEEPALIVE_MS,
        }),
    };
  });
  if (s) releaseIfFinished(e, r);
}
//@ chunk-6vnxsn99.js:71907-71957 placement
function agentEvictAt(e) {
  return isCompletedBackgroundAgent(e) ? undefined : Date.now() + MCP_TASK_KEEPALIVE_MS;
}
//@ chunk-e6aww6q8.js:1779529-1779561 placement
var todoListSchema = DoctorLazy(() =>
  u({
    todos: TodoListSchema(),
  }),
);
//@ chunk-e6aww6q8.js:1779561-1779826 placement = getLastToolUseName (0.817)
/**
 * 从消息中取最后一次（非子代理）TodoWrite 调用的 todos。
 */
function getTodosFromLastTodoWrite(message) {
  let block = message.findLast(
    (s) =>
      s.type === "assistant" &&
      !s.parent_tool_use_id &&
      s.message.content.some((h) => h.type === "tool_use" && h.name === TODO_WRITE_TOOL_NAME),
  );
  if (!block) return [];
  let input = block.message.content.find(
    (s) => s.type === "tool_use" && s.name === TODO_WRITE_TOOL_NAME,
  )?.input;
  if (!input) return [];
  return parseTodoWriteTodos(input);
}
//@ chunk-e6aww6q8.js:1779826-1779900 placement
/**
 * 按 TodoWrite 输入 schema 解析 todos，失败返回 []。
 */
function parseTodoWriteTodos(e) {
  let n = todoListSchema().safeParse(e);
  return n.success ? n.data.todos : [];
}
//@ chunk-e6aww6q8.js:1779900-1780143 placement
/**
 * 任务创建成功消息的正则，以及 TaskCreate / TaskUpdate 输入 schema。
 */
var TASK_CREATED_RE = /^Task #(\S+) created successfully/;
var taskCreateInputSchema = DoctorLazy(() =>
  u({
    subject: string(),
    activeForm: string().optional(),
  }),
);
var taskUpdateInputSchema = DoctorLazy(() =>
  u({
    taskId: string(),
    status: _enum(["pending", "in_progress", "completed", "deleted"]).optional(),
    subject: string().optional(),
    activeForm: string().optional(),
  }),
);
//@ chunk-e6aww6q8.js:1780143-1780717 placement
/**
 * 跟踪 TaskCreate/TaskUpdate 工具调用以推断任务列表：创建时记入 pendingCreates（内容、进行时文案、pending），更新时按 taskId 记录状态/标题变更。
 */
function trackTaskToolUse(e, n) {
  if (n.name === TASK_CREATE_TOOL_NAME) {
    let r = coerceTaskCreateInput(n.input);
    let s = taskCreateInputSchema().safeParse(r?.input ?? n.input);
    if (!s.success) return false;
    e.pendingCreates.set(n.id, {
      content: s.data.subject,
      activeForm: s.data.activeForm ?? s.data.subject,
      status: "pending",
    });
    return true;
  }
  if (n.name === TASK_UPDATE_TOOL_NAME) {
    let r = normalizeTaskInputAliases(n.input);
    let s = taskUpdateInputSchema().safeParse(r?.input ?? n.input);
    if (!s.success) return false;
    let { taskId, status, subject, activeForm } = s.data;
    if (status === "deleted") return e.tasks.delete(taskId);
    let L = e.tasks.get(taskId);
    e.tasks.set(taskId, {
      content: subject ?? L?.content ?? taskId,
      activeForm: activeForm ?? L?.activeForm ?? subject ?? taskId,
      status: status ?? L?.status ?? "pending",
    });
    return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1780717-1781079 layout
function resolvePendingTaskCreate(e, n) {
  let r = e.pendingCreates.get(n.tool_use_id);
  if (!r) return false;
  if (n.is_error) {
    e.pendingCreates.delete(n.tool_use_id);
    return true;
  }
  let s = "";
  if (typeof n.content === "string") s = n.content;
  else if (Array.isArray(n.content)) s = extractTextContent_2(n.content);
  let h = s.match(TASK_CREATED_RE)?.[1];
  if (!h) return false;
  e.pendingCreates.delete(n.tool_use_id);
  if (!e.tasks.has(h)) e.tasks.set(h, r);
  return true;
}
//@ chunk-e6aww6q8.js:1781079-1781152 layout
function getAllTrackedTasks(e) {
  return [...e.tasks.values(), ...e.pendingCreates.values()];
}
//@ chunk-e6aww6q8.js:1781152-1781696 callgraph-fingerprint = updateTaskState (0.217)
function updateTaskState_2() {
  let e = {
    pendingCreates: new Map(),
    tasks: new Map(),
  };
  let n;
  let r;
  return {
    observe(s) {
      if (s.type === "assistant" && !s.parent_tool_use_id) {
        for (let y of s.message.content) if (y.type === "tool_use" && trackTaskToolUse(e, y)) r = undefined;
        let found = s.message.content.find(
          (prev) => prev.type === "tool_use" && prev.name === TODO_WRITE_TOOL_NAME,
        );
        if (found) {
          n = {
            ...s,
            message: {
              ...s.message,
              content: [found],
            },
          };
          r = undefined;
        }
      } else if (s.type === "user") {
        let content = s.message.content;
        if (!Array.isArray(content)) return;
        for (let y of content) if (y.type === "tool_result" && resolvePendingTaskCreate(e, y)) r = undefined;
      }
    },
    todos() {
      if (r === undefined) {
        let updated = getAllTrackedTasks(e);
        r = updated.length > 0 ? updated : n ? getTodosFromLastTodoWrite([n]) : [];
      }
      return r;
    },
  };
}
//@ chunk-e6aww6q8.js:1784439-1785040 fingerprint = getStatusText (0.36)
function getStatusText(taskId, title, r, taskRegistry, toolUseId, y) {
  if (!claimTaskNotification(taskId, taskRegistry).claimed) return;
  switch (r) {
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
  let S =
    r === "completed"
      ? "completed successfully"
      : r === "failed"
        ? "failed"
        : r === "blocked"
          ? "is blocked"
          : "was stopped";
  enqueuePendingNotification(
    {
      value: formatTaskNotification({
        taskId,
        toolUseId,
        taskType: "remote_agent",
        outputFile: getTaskOutputPath(taskId),
        status: r,
        summary: y ?? escapeXml(`${REMOTE_TASK_PREFIX}${title}" ${S}`),
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
//@ chunk-e6aww6q8.js:4719155-4719236 fingerprint = evictTerminalTask (0.521)
function evictTerminalTask(taskId, setAppState) {
  setAppState.update(taskId, (prev) => ({
    ...prev,
    notified: true,
    evictAfter: Date.now() + MCP_TASK_KEEPALIVE_MS,
  }));
}
//@ chunk-e6aww6q8.js:4745856-4746226 callgraph-fingerprint = enqueueTaskNotification (0.275)
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
//@ chunk-gppkhxdv.js:261-450 placement
/**
 * 认领任务通知：任务尚未通知时标记为已通知（运行中且要求跳过时不标记），返回是否认领成功与任务快照。
 */
function claimTaskNotification(taskId, taskRegistry, r) {
  let claimed = false;
  let task;
  taskRegistry.update(taskId, (t) => {
    task = t;
    if (t.notified) return t;
    claimed = true;
    if (r?.skipStampIfRunning && t.status === "running") return t;
    return {
      ...t,
      notified: true,
    };
  });
  return {
    claimed,
    task,
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
