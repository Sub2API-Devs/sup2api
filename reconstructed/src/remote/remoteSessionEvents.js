/**
 * remote/remoteSessionEvents.ts
 *
 * 远程会话事件处理：限流帧丢弃、拒答撤回、任务状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3xdfvx0n.js (33)
 * attribution: placement 33
 */
import { RateLimitInfoSchema } from "../entrypoints/sdk/coreSchemas.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { count } from "../utils/collections.js";
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { sanitizeLabel, sameBackgroundTaskList } from "../services/homeSeed/firstSend.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  numberSchema,
  _enum,
  stringSchema,
  discriminatedUnion,
  literal,
  booleanSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import {
  sanitizeDisplayText,
  MAX_TITLE_LENGTH,
  clipDisplayText,
  MAX_MARKDOWN_SAFE_LENGTH,
} from "../utils/resultError.js";
import { parseArtifactUrl } from "../tools/ArtifactTool/constants.js";
import { artifactViewerUrlFor } from "../tools/ArtifactTool/artifactUrls.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { OPENED } from "../tools/ArtifactTool/artifactResumeCarry.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-3xdfvx0n.js:13943-13984 placement = _temp (1)
/**
 * 导出函数 `isResultEvent`：参数 r，返回 r.type === "result"。
 */
function isResultEvent(r) {
  return r.type === "result";
}
//@ chunk-3xdfvx0n.js:13984-14001 placement
var MAX_RETRACTED_UUIDS = 64;
var MAX_MESSAGE_UUID_LENGTH = 128;
//@ chunk-3xdfvx0n.js:14001-14068 placement
function isValidMessageUuid(userMessageUuid) {
  return (
    typeof userMessageUuid === "string" &&
    userMessageUuid.length > 0 &&
    userMessageUuid.length <= MAX_MESSAGE_UUID_LENGTH
  );
}
//@ chunk-3xdfvx0n.js:14068-14289 placement
/**
 * 拒答撤回事件中的用户消息 uuid 列表。
 */
function retractedUserMessageUuids(event) {
  let userMessageUuids = "user_message_uuids" in event ? event.user_message_uuids : null;
  let uuids = Array.isArray(userMessageUuids)
    ? userMessageUuids.filter(isValidMessageUuid).slice(0, MAX_RETRACTED_UUIDS)
    : [];
  if (uuids.length > 0) return uuids;
  let userMessageUuid = "user_message_uuid" in event ? event.user_message_uuid : undefined;
  return isValidMessageUuid(userMessageUuid) ? [userMessageUuid] : undefined;
}
//@ chunk-3xdfvx0n.js:14289-14382 placement
/**
 * 导出函数 `shouldDeliverEvent`：参数 e, n, r，返回 r.taskWake || (s === void 0 ? r.sent : s.some((i) => n.has(i)))。
 */
function shouldDeliverEvent(event, sentUuids, state) {
  let retracted = retractedUserMessageUuids(event);
  return (
    state.taskWake || (retracted === undefined ? state.sent : retracted.some((uuid) => sentUuids.has(uuid)))
  );
}
//@ chunk-3xdfvx0n.js:14382-14734 placement
function dropRemoteRateLimitFrame(rateLimitInfo) {
  let schema = RateLimitInfoSchema();
  let shapeNames = new Map(Object.entries(schema.shape));
  let knownOnly =
    typeof rateLimitInfo === "object" && rateLimitInfo !== null && !Array.isArray(rateLimitInfo)
      ? pickByHelper(
          rateLimitInfo,
          (value, key) => key === "status" || (shapeNames.get(key)?.safeParse(value).success ?? false),
        )
      : rateLimitInfo;
  let parsed = schema.safeParse(knownOnly);
  if (parsed.success) return parsed.data;
  if (claimOnce().claim("remote_rate_limit_frame_drop"))
    logEvent("tengu_remote_rate_limits_dropped", {
      reason: lit("invalid_frame"),
      frames: 1,
    });
  return;
}
//@ chunk-3xdfvx0n.js:14734-14852 placement
/**
 * 拒答撤回跟踪状态的初始值。
 */
function createRetractionState() {
  return {
    retracted: new Set(),
    inProgressToolUses: new Map(),
    evictedToolUses: new Set(),
    nestedUuidAliases: new Map(),
  };
}
//@ chunk-3xdfvx0n.js:14852-14942 placement
/**
 * 导出函数 `recordNestedUuidAliases`：参数 e, n, r。
 */
function recordNestedUuidAliases(aliases, uuid, aliasUuids) {
  let filtered = aliasUuids.filter((aliasUuid) => aliasUuid !== uuid);
  if (filtered.length > 0) aliases.nestedUuidAliases.set(uuid, filtered);
}
//@ chunk-3xdfvx0n.js:14942-15303 placement
function isModelRefusalFallback(value) {
  if (typeof value !== "object" || value === null) return null;
  let record = value;
  let uuid = typeof record.uuid === "string" ? record.uuid : null;
  if (record.type === "system" && record.subtype === "model_refusal_fallback") {
    let uuids = otherStrings(record.retracted_message_uuids, uuid);
    return uuids
      ? {
          uuids,
          source: "retraction_banner",
        }
      : null;
  }
  if (record.type === "assistant") {
    let uuids = otherStrings(record.supersedes, uuid);
    return uuids
      ? {
          uuids,
          source: "supersedes",
        }
      : null;
  }
  return null;
}
//@ chunk-3xdfvx0n.js:15303-15425 placement
/**
 * 数组中不等于 n 的字符串（没有则 null）。
 */
function otherStrings(uuids, uuid) {
  if (!Array.isArray(uuids)) return null;
  let filtered = uuids.filter((value) => typeof value === "string" && value !== uuid);
  return filtered.length > 0 ? filtered : null;
}
//@ chunk-3xdfvx0n.js:15425-15532 placement
/**
 * 去掉 uuid 在集合中的消息。
 */
function dropMessagesByUuid(messages, retracted) {
  if (retracted.size === 0) return messages;
  let filtered = messages.filter((message) => !retracted.has(message.uuid));
  return filtered.length === messages.length ? messages : filtered;
}
//@ chunk-3xdfvx0n.js:15532-15597 placement
/**
 * 导出函数 `recordInProgressToolUses`：参数 e, n, r。
 */
function recordInProgressToolUses(index, uuid, toolUseIds) {
  for (let toolUseId of toolUseIds) index.inProgressToolUses.set(toolUseId, uuid);
}
//@ chunk-3xdfvx0n.js:15597-15661 placement
/**
 * 导出函数 `clearInProgressToolUses`：参数 e, n。
 */
function clearInProgressToolUses(index, toolUseIds) {
  for (let toolUseId of toolUseIds) index.inProgressToolUses.delete(toolUseId);
}
//@ chunk-3xdfvx0n.js:15661-16247 placement
function evictRefusalRetraction(runtime) {
  let { index, signal, surface, setMessages, setInProgressToolUseIDs } = runtime;
  let newlyRetractedCount = count(signal.uuids, (uuid) => !index.retracted.has(uuid));
  for (let uuid of signal.uuids) {
    index.retracted.add(uuid);
    for (let aliasUuid of index.nestedUuidAliases.get(uuid) ?? []) index.retracted.add(aliasUuid);
  }
  let toolUseIds = [...index.inProgressToolUses]
    .filter(([, toolUseId]) => index.retracted.has(toolUseId))
    .map(([toolUseId]) => toolUseId);
  clearInProgressToolUses(index, toolUseIds);
  for (let toolUseId of toolUseIds) index.evictedToolUses.add(toolUseId);
  if (toolUseIds.length > 0 && setInProgressToolUseIDs)
    setInProgressToolUseIDs({
      action: "remove",
      ids: toolUseIds,
    });
  setMessages((messages) => dropMessagesByUuid(messages, index.retracted));
  logEvent("tengu_refusal_retraction_evicted", {
    surface: fromEnum(surface),
    source: fromEnum(signal.source),
    uuid_count: signal.uuids.length,
    newly_retracted_count: newlyRetractedCount,
    tool_use_cleared_count: toolUseIds.length,
  });
}
//@ chunk-3xdfvx0n.js:16247-16439 placement
/**
 * 统计撤回后孤立的工具结果并上报。
 */
function countOrphanToolResults(index, toolUseIds, surface, uuid) {
  if (uuid !== null && index.retracted.has(uuid)) return 0;
  let orphanCount = count(toolUseIds, (toolUseId) => index.evictedToolUses.has(toolUseId));
  if (orphanCount > 0)
    logEvent("tengu_refusal_retraction_orphan_tool_result", {
      surface: fromEnum(surface),
      count: orphanCount,
    });
  return orphanCount;
}
//@ chunk-3xdfvx0n.js:16439-16976 placement
function checkRefusalRetractionSource(runtime) {
  let { index, events, surface, setMessages, setInProgressToolUseIDs } = runtime;
  let evictedCount = 0;
  let mismatchCount = 0;
  let missingSourceCount = 0;
  for (let event of events) {
    if (event.source !== "worker") {
      if (isModelRefusalFallback(event.payload))
        if (event.source === undefined) missingSourceCount++;
        else mismatchCount++;
      continue;
    }
    let signal = isModelRefusalFallback(event.payload);
    if (signal) {
      evictedCount++;
      evictRefusalRetraction({
        index,
        signal,
        surface,
        setMessages,
        setInProgressToolUseIDs,
      });
    }
  }
  if (mismatchCount > 0)
    logEvent("tengu_refusal_retraction_unauthenticated_signal", {
      surface: fromEnum(surface),
      reason: lit("source_mismatch"),
      count: mismatchCount,
    });
  if (missingSourceCount > 0)
    logEvent("tengu_refusal_retraction_unauthenticated_signal", {
      surface: fromEnum(surface),
      reason: lit("source_missing"),
      count: missingSourceCount,
    });
  return evictedCount;
}
//@ chunk-3xdfvx0n.js:16976-17093 placement
/**
 * 已撤回消息的迟到帧：丢弃并上报。
 */
function dropLateRetracted(refusalState, uuid, surface) {
  if (!refusalState.retracted.has(uuid)) return false;
  logEvent("tengu_refusal_retraction_late_drop", {
    surface: fromEnum(surface),
  });
  return true;
}
//@ chunk-3xdfvx0n.js:17093-17141 placement
/**
 * 远程会话事件限额：最多保留 20 条运行中任务进度、任务时长上限 30 天、展示文本 40 行。
 */
var LOCAL_WORKFLOW = "local_workflow";
var MAX_RUNTIME_PROGRESS_TASKS = 20;
var MAX_TASK_DURATION_MS = 2592000000;
var MAX_DISPLAY_TEXT_LINES = 40;
//@ chunk-3xdfvx0n.js:17141-18738 placement
function applyRemoteTaskEvent(tasks, event, startTime) {
  if (event.type !== "system") return;
  switch (event.subtype) {
    case "task_started": {
      if (typeof event.task_id !== "string" || event.task_type !== LOCAL_WORKFLOW) return;
      let existing = tasks.get(event.task_id);
      let task =
        existing !== undefined && !isTerminalTaskStatus(existing.status)
          ? existing
          : newRemoteWorkflowTask(event.task_id, startTime);
      tasks.set(task.id, {
        ...task,
        runId: typeof event.run_id === "string" ? event.run_id : task.runId,
        description: sanitizeLabel(event.description) || task.description,
        workflowName: sanitizeLabel(event.workflow_name) || task.workflowName,
      });
      return;
    }
    case "task_progress": {
      if (typeof event.task_id !== "string" || !Array.isArray(event.workflow_progress)) return;
      let existing = tasks.get(event.task_id);
      if (existing !== undefined && isTerminalTaskStatus(existing.status)) return;
      let task = existing ?? {
        ...newRemoteWorkflowTask(event.task_id, startTime),
        presence: "reported",
      };
      tasks.set(task.id, {
        ...applyTaskUsage(task, event.usage, startTime),
        runId: task.runId ?? (typeof event.run_id === "string" ? event.run_id : undefined),
        wireProgress: event.workflow_progress,
        presence: task.presence === "unlisted" ? "reported" : task.presence,
      });
      return;
    }
    case "background_tasks_changed": {
      if (!Array.isArray(event.tasks)) return;
      let listedIds = new Set(event.tasks.map((task) => task?.task_id));
      for (let task of tasks.values())
        if (task.presence === "reported" && !listedIds.has(task.id))
          tasks.set(task.id, {
            ...task,
            presence: "unlisted",
          });
      return;
    }
    case "task_updated": {
      let existing = typeof event.task_id === "string" ? tasks.get(event.task_id) : undefined;
      let nextStatus = TASK_STATUS_SCHEMA().safeParse(event.patch?.status).data;
      if (existing === undefined || nextStatus === undefined || isTerminalTaskStatus(existing.status)) return;
      tasks.set(existing.id, {
        ...existing,
        status: nextStatus,
        endTime: isTerminalTaskStatus(nextStatus) ? startTime : existing.endTime,
      });
      return;
    }
    case "task_notification": {
      let existing = typeof event.task_id === "string" ? tasks.get(event.task_id) : undefined;
      if (existing === undefined) return;
      let nextStatus =
        event.status === "completed"
          ? "completed"
          : event.status === "failed"
            ? "failed"
            : event.status === "stopped"
              ? "killed"
              : undefined;
      let wasTerminal = isTerminalTaskStatus(existing.status);
      if (nextStatus === undefined) {
        if (!wasTerminal) tasks.delete(existing.id);
        return;
      }
      if (wasTerminal && existing.status !== nextStatus) return;
      tasks.set(existing.id, {
        ...applyTaskUsage(existing, event.usage, startTime),
        status: nextStatus,
        endTime: existing.endTime ?? startTime,
      });
      return;
    }
    default:
      return;
  }
}
//@ chunk-3xdfvx0n.js:18738-19556 placement
/**
 * 合并远程任务列表：补齐工作流任务、标记未列出的、按上限淘汰已结束的。
 */
function reconcileRemoteTasks(remoteTasks, runningTasks, startTime) {
  for (let running of runningTasks.values()) {
    if (running.taskType !== LOCAL_WORKFLOW) continue;
    let existing = remoteTasks.get(running.id);
    if (existing === undefined)
      remoteTasks.set(running.id, {
        ...newRemoteWorkflowTask(running.id, startTime),
        description: running.description,
      });
    else if (existing.description === "" && running.description !== "")
      remoteTasks.set(running.id, {
        ...existing,
        description: running.description,
      });
  }
  let keptTasks = [];
  let terminalTasks = [];
  let unlistedTasks = [];
  for (let task of remoteTasks.values()) {
    let running = runningTasks.get(task.id);
    let isTerminal = isTerminalTaskStatus(task.status);
    if (!isTerminal && running?.taskType !== undefined && running.taskType !== LOCAL_WORKFLOW) {
      remoteTasks.delete(task.id);
      continue;
    }
    let nextPresence =
      running !== undefined ? "listed" : task.presence === "listed" ? "unlisted" : task.presence;
    let updatedTask =
      isTerminal || nextPresence === task.presence
        ? task
        : {
            ...task,
            presence: nextPresence,
          };
    if (updatedTask !== task) remoteTasks.set(updatedTask.id, updatedTask);
    if (isTerminal) terminalTasks.push(updatedTask);
    else if (updatedTask.presence === "unlisted") {
      unlistedTasks.push(updatedTask);
      continue;
    }
    keptTasks.push(updatedTask);
  }
  let overflowTasks = new Set([
    ...terminalTasks
      .toSorted((left, right) => (left.endTime ?? 0) - (right.endTime ?? 0))
      .slice(0, Math.max(0, terminalTasks.length - MAX_RUNTIME_PROGRESS_TASKS)),
    ...unlistedTasks.slice(0, Math.max(0, unlistedTasks.length - MAX_RUNTIME_PROGRESS_TASKS)),
  ]);
  for (let task of overflowTasks) remoteTasks.delete(task.id);
  return overflowTasks.size === 0 ? keptTasks : keptTasks.filter((task) => !overflowTasks.has(task));
}
//@ chunk-3xdfvx0n.js:19556-19867 placement
/**
 * 把前台任务、后台任务与工作流运行写回应用状态（未变则原样返回）。
 */
function applyRemoteTaskState(state, backgroundTasks, workflowRuns, foregroundTask) {
  let sameBackground = sameBackgroundTaskList(state.remoteBackgroundTasks, backgroundTasks);
  let sameRuns =
    state.remoteWorkflowRuns.length === workflowRuns.length &&
    workflowRuns.every((run, index) => run === state.remoteWorkflowRuns[index]);
  return sameBackground && sameRuns && state.remoteForegroundTask === foregroundTask
    ? state
    : {
        ...state,
        remoteForegroundTask: foregroundTask,
        remoteBackgroundTasks: sameBackground ? state.remoteBackgroundTasks : backgroundTasks,
        remoteWorkflowRuns: sameRuns ? state.remoteWorkflowRuns : workflowRuns,
      };
}
//@ chunk-3xdfvx0n.js:19867-19988 placement
/**
 * 把所有未结束任务标记为未列出。
 */
function markTasksUnlisted(tasks) {
  for (let task of tasks.values())
    if (!isTerminalTaskStatus(task.status) && task.presence !== "unlisted")
      tasks.set(task.id, {
        ...task,
        presence: "unlisted",
      });
}
//@ chunk-3xdfvx0n.js:19988-20082 placement
/**
 * 导出函数 `parseWorkflowProgressList`：参数 e，返回 e.flatMap((n) => { let safeParse = WORKFLOW_PROGRESS_SCHEMA().safeParse(n); return safeParse.success ? [safePa…。
 */
function parseWorkflowProgressList(wireProgress) {
  return wireProgress.flatMap((entry) => {
    let parsed = WORKFLOW_PROGRESS_SCHEMA().safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}
//@ chunk-3xdfvx0n.js:20082-20268 placement
/**
 * 远程工作流任务的初始记录。
 */
function newRemoteWorkflowTask(id, startTime) {
  return {
    id,
    runId: undefined,
    status: "running",
    presence: "listed",
    description: "",
    workflowName: undefined,
    wireProgress: [],
    totalTokens: 0,
    totalToolCalls: 0,
    startTime,
    endTime: undefined,
  };
}
//@ chunk-3xdfvx0n.js:20268-20453 placement
/**
 * 用任务用量更新 token、工具调用与开始时间。
 */
function applyTaskUsage(task, usage, nowMs) {
  let parsedUsage = TASK_USAGE_SCHEMA().safeParse(usage).data;
  if (parsedUsage === undefined) return task;
  return {
    ...task,
    totalTokens: parsedUsage.total_tokens,
    totalToolCalls: parsedUsage.tool_uses,
    startTime: Math.min(task.startTime, nowMs - parsedUsage.duration_ms),
  };
}
//@ chunk-3xdfvx0n.js:20453-20501 placement
function optionalSchema(schema) {
  return schema.optional().catch(undefined);
}
//@ chunk-3xdfvx0n.js:20501-21480 placement
/**
 * 远程任务事件 schema：用量、状态、工作流进度。
 */
var TASK_USAGE_SCHEMA; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TASK_STATUS_SCHEMA;
var WORKFLOW_PROGRESS_SCHEMA;
deferInit("chunk-3xdfvx0n.js:20501", () => {
  TASK_USAGE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      total_tokens: numberSchema(),
      tool_uses: numberSchema(),
      duration_ms: numberSchema().nonnegative().max(MAX_TASK_DURATION_MS).catch(0),
    }),
  );
  TASK_STATUS_SCHEMA = DoctorLazy(() =>
    _enum(["pending", "running", "completed", "failed", "killed", "paused"]),
  );
  WORKFLOW_PROGRESS_SCHEMA = DoctorLazy(() => {
    let label = stringSchema().transform((value) =>
      sanitizeDisplayText(value, {
        maxCodeUnits: MAX_TITLE_LENGTH,
      }),
    );
    let longText = stringSchema().transform(
      (value) =>
        clipDisplayText(value, {
          maxCodeUnits: MAX_MARKDOWN_SAFE_LENGTH,
          maxLines: MAX_DISPLAY_TEXT_LINES,
        }).text,
    );
    return discriminatedUnion("type", [
      objectSchema({
        type: literal("workflow_agent"),
        index: numberSchema().int(),
        label,
        state: _enum(["start", "progress", "done", "error"]),
        phaseIndex: optionalSchema(numberSchema().int()),
        phaseTitle: optionalSchema(label),
        agentId: optionalSchema(label),
        agentType: optionalSchema(label),
        isolation: optionalSchema(_enum(["worktree", "remote"])),
        remoteSessionId: optionalSchema(label),
        model: optionalSchema(label),
        fallbackModel: optionalSchema(label),
        tokens: optionalSchema(numberSchema()),
        toolCalls: optionalSchema(numberSchema()),
        durationMs: optionalSchema(numberSchema()),
        error: optionalSchema(longText),
        startedAt: optionalSchema(numberSchema()),
        lastProgressAt: optionalSchema(numberSchema()),
        queuedAt: optionalSchema(numberSchema()),
        attempt: optionalSchema(numberSchema()),
        lastAttemptReason: optionalSchema(_enum(["stalled", "throttled", "user-retry"])),
        skipped: optionalSchema(booleanSchema()),
        blocked: optionalSchema(booleanSchema()),
        cached: optionalSchema(booleanSchema()),
        lastToolName: optionalSchema(label),
        lastToolSummary: optionalSchema(label),
        resultPreview: optionalSchema(longText),
        promptPreview: optionalSchema(longText),
        promptFramed: optionalSchema(booleanSchema()),
      }),
      objectSchema({
        type: literal("workflow_phase"),
        index: numberSchema().int(),
        title: label,
        kind: optionalSchema(literal("child")),
      }),
    ]);
  });
});
//@ chunk-3xdfvx0n.js:21480-21498 placement
/**
 * 远程会话事件里的展示限额：artifacts 列表最多 100 项、标题截断到 256 字符。
 */
var MAX_ARTIFACT_LIST_ITEMS = 100;
var MAX_TITLE_CHARS_EVENTS = 256;
//@ chunk-3xdfvx0n.js:21498-21716 placement
/**
 * session_metadata 事件里的 artifacts 列表。
 */
function sessionMetadataArtifacts(message) {
  if (message.type !== "system" || message.subtype !== "session_metadata") return;
  let { metadata } = message;
  if (typeof metadata !== "object" || metadata === null) return;
  let artifacts = "artifacts" in metadata ? metadata.artifacts : undefined;
  return artifacts === null || Array.isArray(artifacts) ? artifacts : undefined;
}
//@ chunk-3xdfvx0n.js:21716-22237 placement
/**
 * 把云会话 artifacts 合并进 frameUrls（未变化则原样返回）。
 */
function mergeCloudArtifactFrames(state, urls) {
  let cloudFrames = cloudArtifactFrames(urls ?? []);
  let filtered = Object.entries(state.frameUrls).filter(([, value]) => value.fromCloudSession !== true);
  if (cloudFrames.length === 0 && filtered.length === Object.keys(state.frameUrls).length) return state;
  let remoteKeys = new Set(filtered.map(([key]) => key));
  let merged = Object.fromEntries([...filtered, ...cloudFrames.filter(([key]) => !remoteKeys.has(key))]);
  let entries = Object.entries(state.frameUrls);
  let entries_2 = Object.entries(merged);
  return entries.length === entries_2.length &&
    entries.every(([key, before], index) => {
      let [afterKey, after] = entries_2[index];
      let entries = Object.entries(before);
      let entries_3 = Object.entries(after);
      return (
        key === afterKey &&
        entries.length === entries_3.length &&
        entries.every(([field, value]) =>
          entries_3.some(([field_2, value_2]) => field_2 === field && value_2 === value),
        )
      );
    })
    ? state
    : {
        ...state,
        frameUrls: merged,
      };
}
//@ chunk-3xdfvx0n.js:22237-22339 placement
var ARTIFACT_ENTRY_SCHEMA; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3xdfvx0n.js:22237", () => {
  ARTIFACT_ENTRY_SCHEMA = DoctorLazy(() =>
    objectSchema({
      url: stringSchema(),
      title: stringSchema().optional().catch(undefined),
      updated_at: stringSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-3xdfvx0n.js:22339-22810 placement
/**
 * 解析云会话 artifacts，按 slug 取最新并转为 frameUrls 条目。
 */
function cloudArtifactFrames(entries) {
  let bySlug = new Map();
  for (let entry of entries) {
    let parsed = ARTIFACT_ENTRY_SCHEMA().safeParse(entry);
    if (!parsed.success) continue;
    let { url, title, updated_at: updatedAt } = parsed.data;
    let artifactUrl = parseArtifactUrl(url);
    if (artifactUrl === null) continue;
    let updatedAtMs = updatedAt !== undefined ? Date.parse(updatedAt) : NaN;
    let frame = {
      url: artifactViewerUrlFor(artifactUrl),
      updatedAt: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
      ...(title !== undefined &&
        title !== "" && {
          title: truncateToLength(title, MAX_TITLE_CHARS_EVENTS),
        }),
      fromCloudSession: true,
    };
    let existing = bySlug.get(artifactUrl.slug);
    if (existing === undefined || frame.updatedAt >= existing.updatedAt) bySlug.set(artifactUrl.slug, frame);
  }
  return [...bySlug]
    .sort(([, left], [, right]) => left.updatedAt - right.updatedAt)
    .slice(-MAX_ARTIFACT_LIST_ITEMS)
    .map(([slug, frame]) => [`${OPENED}${slug}`, frame]);
}
//@ chunk-3xdfvx0n.js:22810-23036 placement
/**
 * 合并会话的技能、插件、工具与命令列表。
 */
function mergeSessionCapabilities(capabilities, next) {
  if (next.skills === undefined && next.plugins === undefined) return capabilities;
  let tools = next.tools ?? capabilities?.tools;
  let commands = next.slashCommands ?? capabilities?.commands;
  return {
    skills: next.skills ?? [],
    plugins: next.plugins ?? [],
    ...(tools !== undefined && {
      tools,
    }),
    ...(commands !== undefined && {
      commands,
    }),
  };
}
export {
  createRetractionState,
  reconcileRemoteTasks,
  applyRemoteTaskState,
  markTasksUnlisted,
  isModelRefusalFallback,
  evictRefusalRetraction,
  isResultEvent,
  applyRemoteTaskEvent,
  dropRemoteRateLimitFrame,
  clearInProgressToolUses,
  countOrphanToolResults,
  dropLateRetracted,
  recordNestedUuidAliases,
  recordInProgressToolUses,
  mergeCloudArtifactFrames,
  sessionMetadataArtifacts,
  shouldDeliverEvent,
  checkRefusalRetractionSource,
  mergeSessionCapabilities,
  parseWorkflowProgressList,
};
