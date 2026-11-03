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
import { h2t } from "../../state/inProgressToolUses.js";
import {
  getTaskRunState,
  holdDiagLevels,
  Jpr,
  getRunId,
  enqueueTaskNotification as enqueueTaskNotification_2,
  Uxt,
  emitTaskNotification,
  rss,
  Qpr,
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
import { u, o, U } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { TVt } from "../../tasks/LocalShellTask/backgroundNotices.js";

//@ chunk-6vnxsn99.js:62273-62322 placement
function OVe() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_jazzy_ripple", !1);
}
//@ chunk-6vnxsn99.js:63428-63460 placement
var y2t = 3000,
  AP = 30000,
  ZEt = 30000;
//@ chunk-6vnxsn99.js:63460-63652 placement
function hasOtherActiveAgents(e, n) {
  for (let r of Object.values(e))
    if (
      r.id !== n &&
      (r.type === "in_process_teammate" || (r.type === "local_agent" && r.agentType !== "main-session")) &&
      !isTerminalTaskStatus(r.status) &&
      !r.isIdle
    )
      return !0;
  return !1;
}
/**
 * 任务框架（register/update/updateTranscript/remove…）：把任务状态写进 AppState.tasks，并发出 task_updated 等 SDK 事件。
 */
//@ chunk-6vnxsn99.js:63652-64633 placement
function createTaskFramework(e, n, { refillWebSearchBudgetByDefault: r = !1 } = {}) {
  let o;
  return {
    register(s) {
      registerTask(s, n);
    },
    update(s, a) {
      updateTaskState(s, n, a);
    },
    updateTranscript(s, a) {
      n((u) => {
        let h = ownProperty(u.transcripts, s) ?? h2t,
          p = a(h);
        if (p === h) return u;
        return { ...u, transcripts: { ...u.transcripts, [s]: p } };
      });
    },
    getTranscript(s) {
      return ownProperty(e().transcripts, s);
    },
    remove(s) {
      (getTaskRunState().taskEvicted.emit(s),
        n((a) => {
          if (!Object.hasOwn(a.tasks, s)) return a;
          let { [s]: u, ...h } = a.tasks,
            p = a.transcripts ?? {},
            { [s]: S, ...y } = p;
          return { ...a, tasks: h, transcripts: s in p ? y : p };
        }));
    },
    evictTerminal(s) {
      evictTerminalTaskIfReady(s, n);
    },
    applyOffsetsAndEvict(s, a) {
      applyTaskOffsetsAndEvictions(n, s, a);
    },
    get(s) {
      return ownProperty(e().tasks, s);
    },
    all() {
      return e().tasks;
    },
    getWebSearchBudget() {
      return (o ??= createWebSearchBudget({ refillsByDefault: r }));
    },
    resetWebSearchBudget() {
      o = void 0;
    },
    takeConcurrencySlot() {
      n((a) => ({ ...a, runningSubagents: a.runningSubagents + 1 }));
      let s = !1;
      return () => {
        if (s) return;
        ((s = !0),
          n((a) => {
            let max = Math.max(0, a.runningSubagents - 1);
            if (max === a.runningSubagents) return a;
            return { ...a, runningSubagents: max };
          }));
      };
    },
    getConcurrentSubagents() {
      return e().runningSubagents;
    },
  };
}
//@ chunk-6vnxsn99.js:64633-65517 placement
function updateTaskState(e, n, r) {
  let o = null,
    s = null,
    a = !1;
  using u = holdDiagLevels();
  if (
    (n((h) => {
      let p = ownProperty(h.tasks, e);
      if (!p) return h;
      let S = r(p);
      if (S === p) return h;
      if (
        ((o = taskStateDiff(p, S)),
        (a = isObserverAgentTask(S)),
        !isTerminalTaskStatus(p.status) && isTerminalTaskStatus(S.status))
      )
        s = {
          status: S.status === "completed" ? "completed" : S.status === "failed" ? "failed" : "stopped",
          opts: {
            toolUseId: S.toolUseId,
            summary: S.terminal?.summary ?? S.description,
            failureKind: Jpr(S.terminal),
            outputFile:
              "webFetchSavedFiles" in S && S.webFetchSavedFiles !== void 0
                ? void 0
                : (S.terminal?.output_file ?? S.outputFile),
            usage: S.terminal?.usage,
            resourceLinks: S.terminal?.resource_links,
            handback: S.terminal?.handback,
            handbackReport: S.terminal?.handback_report,
            skipTranscript: S.skipTranscript,
            ambient: skipsTranscript(S),
          },
        };
      return { ...h, tasks: { ...h.tasks, [e]: S } };
    }),
    s === null)
  )
    u.release();
  if (o !== null && !a) {
    let h = { type: "system", subtype: "task_updated", task_id: e, run_id: getRunId(e), patch: o };
    enqueueTaskNotification_2(Uxt(h, s?.opts?.failureKind));
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
  let o = "error" in e ? e.error : void 0,
    s = "error" in n ? n.error : void 0;
  if (s !== o && s !== void 0) r.error = s;
  let a = "isBackgrounded" in e ? e.isBackgrounded : void 0,
    u = "isBackgrounded" in n ? n.isBackgrounded : void 0;
  if (u !== a && u !== void 0) r.is_backgrounded = u;
  return Object.keys(r).length > 0 ? r : null;
}
//@ chunk-6vnxsn99.js:66032-66129 placement
function Ao(e) {
  if (e.type === "local_bash") return "agentId" in e && e.agentId !== void 0 ? !0 : void 0;
  return;
}
//@ chunk-6vnxsn99.js:66129-66353 placement
function isChildOfAgent(e, n) {
  if (e.type !== "local_agent") return !1;
  for (let r of ["parentAgentId", "ownerAgentId"]) {
    let o = r in e ? e[r] : void 0;
    if (typeof o !== "string" || !Object.hasOwn(n, o)) continue;
    if (n[o].chatPinForfeited === !0) return !0;
  }
  return !1;
}
//@ chunk-6vnxsn99.js:66353-66494 placement
function isChatPinForfeited(e) {
  let n = e.type === "local_agent" && "agentId" in e ? e.agentId : void 0;
  return typeof n === "string" && getTaskRunState().chatPinForfeitedAgentIds.has(n);
}
//@ chunk-6vnxsn99.js:66494-66534 placement
function X2o(e, n) {
  return isChildOfAgent(e, n) || isChatPinForfeited(e);
}
/**
 * 把后台任务注册进 AppState.tasks，并发出 SDK 任务开始事件。
 */
//@ chunk-6vnxsn99.js:66534-68435 fingerprint = registerTask (0.473)
function registerTask(task, setAppState) {
  let o = rss(task.id) && !isTerminalTaskStatus(task.status);
  if (o || !getTaskRunState().runIds.has(task.id)) Qpr(task.id);
  let s = !1,
    a = task,
    u;
  if (
    (setAppState((prev) => {
      let existing = prev.tasks[task.id];
      s = existing !== void 0;
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
              ...(existing.spawnDepth !== void 0 && { spawnDepth: existing.spawnDepth }),
              ...(existing.isObserver !== void 0 && { isObserver: existing.isObserver }),
              ...(existing.forkedSkillName !== void 0 && { forkedSkillName: existing.forkedSkillName }),
              ...(existing.chatEngaged !== void 0 && { chatEngaged: existing.chatEngaged }),
              ...(existing.chatPinForfeited !== void 0 && { chatPinForfeited: existing.chatPinForfeited }),
              ...(existing.userStopCount !== void 0 && { userStopCount: existing.userStopCount }),
              ...(existing.handbackRecipient !== void 0 && { handbackRecipient: existing.handbackRecipient }),
              ...(existing.status === "completed" &&
                existing.waitingNoticeRecipient !== void 0 && {
                  waitingNoticeRecipient: existing.waitingNoticeRecipient,
                }),
              ...(existing.ownerCanContinueAgents !== void 0 && {
                ownerCanContinueAgents: existing.ownerCanContinueAgents,
              }),
              ...(existing.handbackReport !== void 0 && { handbackReport: existing.handbackReport }),
              ...(existing.webFetchSavedFiles !== void 0 && {
                webFetchSavedFiles: existing.webFetchSavedFiles,
              }),
              ...(existing.spawnedSubagent !== void 0 && { spawnedSubagent: existing.spawnedSubagent }),
              ...("progress" in existing && existing.progress !== void 0 && { progress: existing.progress }),
            }
          : X2o(task, prev.tasks)
            ? { ...task, chatPinForfeited: !0 }
            : task;
      return (
        (a = merged),
        (u = taskParentAgentId(merged, prev.tasks)),
        { ...prev, tasks: { ...prev.tasks, [task.id]: merged } }
      );
    }),
    s && !o)
  )
    return;
  if (isObserverAgentTask(task)) return;
  if (isHoldCappedMcpTask(task)) return;
  enqueueTaskNotification_2({
    type: "system",
    subtype: "task_started",
    task_id: task.id,
    run_id: getRunId(task.id),
    owned_by_subagent: Ao(task),
    tool_use_id: task.toolUseId,
    description: task.description,
    subagent_type: getSelectableBackgroundTasks(task),
    is_backgrounded: "isBackgrounded" in a ? a.isBackgrounded : void 0,
    ...(isAwaitedAgentTask(a) && { awaited: !0 }),
    spawn_depth: "spawnDepth" in a ? a.spawnDepth : void 0,
    parent_task_id: u,
    task_type: task.type,
    workflow_name: "workflowName" in task ? task.workflowName : void 0,
    prompt: "prompt" in task ? task.prompt : void 0,
    skip_transcript: task.skipTranscript,
    ...(skipsTranscript(task) && { ambient: !0 }),
  });
}
//@ chunk-6vnxsn99.js:68435-68990 layout
function evictTerminalTaskIfReady(e, n) {
  let r = !1;
  if (
    (n((o) => {
      let s = ownProperty(o.tasks, e);
      if (!s) return o;
      if (!isTerminalTaskStatus(s.status)) return o;
      if (!s.notified) return o;
      if ("retain" in s && (s.evictAfter ?? 1 / 0) > Date.now()) return o;
      if ("retain" in s && (s.keepaliveReasons?.size ?? 0) > 0) return o;
      if (s.type === "local_workflow" && ((s.evictAfter ?? 0) > Date.now() || !isTaskLoopSettled(e)))
        return o;
      if (s.type === "mcp_task" && (s.endTime ?? 0) + AP > Date.now()) return o;
      r = !0;
      let { [e]: a, ...u } = o.tasks,
        h = o.transcripts ?? {},
        { [e]: p, ...S } = h;
      return { ...o, tasks: u, transcripts: e in h ? S : h };
    }),
    r)
  )
    (logForDebugging(`evictTerminalTask: evicted task ${e}`), getTaskRunState().taskEvicted.emit(e));
}
//@ chunk-6vnxsn99.js:68990-69082 fingerprint = getRunningTasks (1)
function getRunningTasks(state) {
  let tasks = state.tasks ?? {};
  return Object.values(tasks).filter((task) => task.status === "running");
}
/**
 * 为已完成/失败/被杀的后台任务生成 task 通知附件，注入下一轮对话。
 */
//@ chunk-6vnxsn99.js:69082-69528 fingerprint = generateTaskAttachments (0.847)
async function generateTaskAttachments(state) {
  let n = [],
    updatedTaskOffsets = {},
    o = [];
  for (let taskState of Object.values(state)) {
    if (taskState.notified)
      switch (taskState.status) {
        case "completed":
        case "failed":
        case "killed":
          if (isCompletedBackgroundAgent(taskState)) continue;
          o.push(taskState.id);
          continue;
        case "pending":
          continue;
        case "running":
          break;
      }
    if (
      taskState.status === "running" &&
      taskState.outputFile !== void 0 &&
      !(taskState.type === "local_bash" && taskState.elsewhere)
    ) {
      let delta = await getTaskOutputDelta(taskState.id, taskState.outputOffset);
      if (delta.content) updatedTaskOffsets[taskState.id] = delta.newOffset;
    }
  }
  return { attachments: n, updatedTaskOffsets: updatedTaskOffsets, evictedTaskIds: o };
}
//@ chunk-6vnxsn99.js:69528-70338 fingerprint = applyTaskOffsetsAndEvictions (0.569)
function applyTaskOffsetsAndEvictions(setAppState, updatedTaskOffsets, evictedTaskIds) {
  let offsetIds = Object.keys(updatedTaskOffsets);
  if (offsetIds.length === 0 && evictedTaskIds.length === 0) return;
  let s = [];
  setAppState((prev) => {
    let u = !1,
      newTasks = { ...prev.tasks };
    for (let id of offsetIds) {
      let y = newTasks[id];
      if (y?.status === "running")
        ((newTasks[id] = { ...y, outputOffset: updatedTaskOffsets[id] }), (u = !0));
    }
    for (let id of evictedTaskIds) {
      let y = newTasks[id];
      if (!y || !isTerminalTaskStatus(y.status) || !y.notified) continue;
      if ("retain" in y && (y.evictAfter ?? 1 / 0) > Date.now()) continue;
      if ("retain" in y && (y.keepaliveReasons?.size ?? 0) > 0) continue;
      if (y.type === "local_workflow" && ((y.evictAfter ?? 0) > Date.now() || !isTaskLoopSettled(id)))
        continue;
      if (y.type === "mcp_task" && (y.endTime ?? 0) + AP > Date.now()) continue;
      (delete newTasks[id], rss(id), s.push(id), (u = !0));
    }
    if (!u) return prev;
    let p;
    for (let S of s)
      if (prev.transcripts && S in prev.transcripts) ((p ??= { ...prev.transcripts }), delete p[S]);
    return { ...prev, tasks: newTasks, ...(p && { transcripts: p }) };
  });
  for (let a of s)
    (logForDebugging(`applyTaskOffsetsAndEvictions: evicted task ${a}`),
      getTaskRunState().taskEvicted.emit(a));
}
//@ chunk-6vnxsn99.js:71537-71907 placement
function removeKeepaliveReason(e, n, r) {
  if (!e) return;
  let o = r.get(e),
    s = isLocalAgent(o) && keepaliveReasons(o).has(n);
  if (
    (r.update(e, (a) => {
      if (!isLocalAgent(a) || !keepaliveReasons(a).has(n)) return a;
      let u = new Set(keepaliveReasons(a));
      u.delete(n);
      let h = isCompletedBackgroundAgent(a),
        p = u.size === 0 && isTerminalTaskStatus(a.status) && !a.retain && !h;
      return {
        ...a,
        keepaliveReasons: u,
        ...(u.size === 0 && h && a.quietlyParked === !0 && { quietlyParked: !1 }),
        ...(p && a.evictAfter === void 0 && { evictAfter: Date.now() + AP }),
      };
    }),
    s)
  )
    releaseIfFinished(e, r);
}
//@ chunk-6vnxsn99.js:71907-71957 placement
function agentEvictAt(e) {
  return isCompletedBackgroundAgent(e) ? void 0 : Date.now() + AP;
}
//@ chunk-e6aww6q8.js:1779529-1779561 placement
var o7o = DoctorLazy(() => u({ todos: TodoListSchema() }));
/**
 * 从消息中取最后一次（非子代理）TodoWrite 调用的 todos。
 */
//@ chunk-e6aww6q8.js:1779561-1779826 placement = getLastToolUseName (0.817)
function getTodosFromLastTodoWrite(message) {
  let block = message.findLast(
    (s) =>
      s.type === "assistant" &&
      !s.parent_tool_use_id &&
      s.message.content.some((h) => h.type === "tool_use" && h.name === TODO_WRITE_TOOL_NAME),
  );
  if (!block) return [];
  let r = block.message.content.find((s) => s.type === "tool_use" && s.name === TODO_WRITE_TOOL_NAME)?.input;
  if (!r) return [];
  return parseTodoWriteTodos(r);
}
/**
 * 按 TodoWrite 输入 schema 解析 todos，失败返回 []。
 */
//@ chunk-e6aww6q8.js:1779826-1779900 placement
function parseTodoWriteTodos(e) {
  let safeParse = o7o().safeParse(e);
  return safeParse.success ? safeParse.data.todos : [];
}
/**
 * 任务创建成功消息的正则，以及 TaskCreate / TaskUpdate 输入 schema。
 */
//@ chunk-e6aww6q8.js:1779900-1780143 placement
var TASK_CREATED_RE = /^Task #(\S+) created successfully/,
  taskCreateInputSchema = DoctorLazy(() => u({ subject: o(), activeForm: o().optional() })),
  taskUpdateInputSchema = DoctorLazy(() =>
    u({
      taskId: o(),
      status: U(["pending", "in_progress", "completed", "deleted"]).optional(),
      subject: o().optional(),
      activeForm: o().optional(),
    }),
  );
/**
 * 跟踪 TaskCreate/TaskUpdate 工具调用以推断任务列表：创建时记入 pendingCreates（内容、进行时文案、pending），更新时按 taskId 记录状态/标题变更。
 */
//@ chunk-e6aww6q8.js:1780143-1780717 placement
function trackTaskToolUse(e, n) {
  if (n.name === TASK_CREATE_TOOL_NAME) {
    let r = coerceTaskCreateInput(n.input),
      safeParse = taskCreateInputSchema().safeParse(r?.input ?? n.input);
    if (!safeParse.success) return !1;
    return (
      e.pendingCreates.set(n.id, {
        content: safeParse.data.subject,
        activeForm: safeParse.data.activeForm ?? safeParse.data.subject,
        status: "pending",
      }),
      !0
    );
  }
  if (n.name === TASK_UPDATE_TOOL_NAME) {
    let r = normalizeTaskInputAliases(n.input),
      safeParse = taskUpdateInputSchema().safeParse(r?.input ?? n.input);
    if (!safeParse.success) return !1;
    let { taskId: taskId, status: status, subject: subject, activeForm: activeForm } = safeParse.data;
    if (status === "deleted") return e.tasks.delete(taskId);
    let L = e.tasks.get(taskId);
    return (
      e.tasks.set(taskId, {
        content: subject ?? L?.content ?? taskId,
        activeForm: activeForm ?? L?.activeForm ?? subject ?? taskId,
        status: status ?? L?.status ?? "pending",
      }),
      !0
    );
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1780717-1781079 layout
function resolvePendingTaskCreate(e, n) {
  let r = e.pendingCreates.get(n.tool_use_id);
  if (!r) return !1;
  if (n.is_error) return (e.pendingCreates.delete(n.tool_use_id), !0);
  let s = "";
  if (typeof n.content === "string") s = n.content;
  else if (Array.isArray(n.content)) s = extractTextContent_2(n.content);
  let h = s.match(TASK_CREATED_RE)?.[1];
  if (!h) return !1;
  if ((e.pendingCreates.delete(n.tool_use_id), !e.tasks.has(h))) e.tasks.set(h, r);
  return !0;
}
//@ chunk-e6aww6q8.js:1781079-1781152 layout
function getAllTrackedTasks(e) {
  return [...e.tasks.values(), ...e.pendingCreates.values()];
}
//@ chunk-e6aww6q8.js:1781152-1781696 callgraph-fingerprint = updateTaskState (0.217)
function updateTaskState_2() {
  let e = { pendingCreates: new Map(), tasks: new Map() },
    n,
    r;
  return {
    observe(s) {
      if (s.type === "assistant" && !s.parent_tool_use_id) {
        for (let y of s.message.content) if (y.type === "tool_use" && trackTaskToolUse(e, y)) r = void 0;
        let found = s.message.content.find(
          (prev) => prev.type === "tool_use" && prev.name === TODO_WRITE_TOOL_NAME,
        );
        if (found) ((n = { ...s, message: { ...s.message, content: [found] } }), (r = void 0));
      } else if (s.type === "user") {
        let content = s.message.content;
        if (!Array.isArray(content)) return;
        for (let y of content) if (y.type === "tool_result" && resolvePendingTaskCreate(e, y)) r = void 0;
      }
    },
    todos() {
      if (r === void 0) {
        let updated = getAllTrackedTasks(e);
        r = updated.length > 0 ? updated : n ? getTodosFromLastTodoWrite([n]) : [];
      }
      return r;
    },
  };
}
//@ chunk-e6aww6q8.js:1784439-1785040 fingerprint = getStatusText (0.36)
function getStatusText(e, n, r, s, h, y) {
  if (!claimTaskNotification(e, s).claimed) return;
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
        taskId: e,
        toolUseId: h,
        taskType: "remote_agent",
        outputFile: getTaskOutputPath(e),
        status: r,
        summary: y ?? escapeXml(`${REMOTE_TASK_PREFIX}${n}" ${S}`),
      }),
      mode: "task-notification",
      skipAttachments: !0,
      agentId: mainAgentId(),
      priority: "next",
      taskId: e,
    },
    { turnAttribution: "inherit" },
  );
}
//@ chunk-e6aww6q8.js:4719155-4719236 fingerprint = evictTerminalTask (0.521)
function evictTerminalTask(taskId, setAppState) {
  setAppState.update(taskId, (prev) => ({ ...prev, notified: !0, evictAfter: Date.now() + AP }));
}
/**
 * 把任务完成通知加入命令队列（task-notification）。
 */
//@ chunk-e6aww6q8.js:4745856-4746226 callgraph-fingerprint = enqueueTaskNotification (0.275)
function enqueueTaskNotification({
  taskId: taskId,
  toolUseId: toolUseId,
  agentId: agentId,
  status: status,
  summary: summary,
  outputFile: outputFile,
  snapshot: snapshot,
  stopCause: stopCause,
  stopExplanation: stopExplanation,
  body: body,
}) {
  return {
    value: formatTaskNotification({
      taskId: taskId,
      toolUseId: toolUseId,
      outputFile: outputFile,
      status: status,
      summary: escapeXml(summary),
      body: `${
        stopCause
          ? `
<${NOTE}>${escapeXml(stopExplanation ?? TVt[stopCause])}</${NOTE}>`
          : ""
      }${body ?? ""}`,
    }),
    mode: "task-notification",
    skipAttachments: !0,
    priority: "next",
    agentId: agentId ?? mainAgentId(),
    taskId: taskId,
    ...(snapshot && { taskDelivery: snapshot }),
  };
}
/**
 * 认领任务通知：任务尚未通知时标记为已通知（运行中且要求跳过时不标记），返回是否认领成功与任务快照。
 */
//@ chunk-gppkhxdv.js:261-450 placement
function claimTaskNotification(e, s, r) {
  let n = !1,
    i;
  return (
    s.update(e, (t) => {
      if (((i = t), t.notified)) return t;
      if (((n = !0), r?.skipStampIfRunning && t.status === "running")) return t;
      return { ...t, notified: !0 };
    }),
    { claimed: n, task: i }
  );
}

export {
  agentEvictAt,
  claimTaskNotification,
  updateTaskState_2,
  getStatusText,
  createTaskFramework,
  hasOtherActiveAgents,
  AP,
  y2t,
  removeKeepaliveReason,
  ZEt,
  X2o,
  getRunningTasks,
  OVe,
  evictTerminalTask,
  resolvePendingTaskCreate,
  trackTaskToolUse,
  getAllTrackedTasks,
  parseTodoWriteTodos,
  generateTaskAttachments,
  enqueueTaskNotification,
  TASK_CREATED_RE,
};
