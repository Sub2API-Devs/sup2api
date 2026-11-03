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
import { u, E, _enum, string, discriminatedUnion, literal, M } from "../../vendor/zod/v4/classic/schemas.js";
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
function retractedUserMessageUuids(e) {
  let userMessageUuids = "user_message_uuids" in e ? e.user_message_uuids : null;
  let r = Array.isArray(userMessageUuids)
    ? userMessageUuids.filter(isValidMessageUuid).slice(0, MAX_RETRACTED_UUIDS)
    : [];
  if (r.length > 0) return r;
  let userMessageUuid = "user_message_uuid" in e ? e.user_message_uuid : undefined;
  return isValidMessageUuid(userMessageUuid) ? [userMessageUuid] : undefined;
}
//@ chunk-3xdfvx0n.js:14289-14382 placement
/**
 * 导出函数 `shouldDeliverEvent`：参数 e, n, r，返回 r.taskWake || (s === void 0 ? r.sent : s.some((i) => n.has(i)))。
 */
function shouldDeliverEvent(request, n, r) {
  let s = retractedUserMessageUuids(request);
  return r.taskWake || (s === undefined ? r.sent : s.some((i) => n.has(i)));
}
//@ chunk-3xdfvx0n.js:14382-14734 placement
function dropRemoteRateLimitFrame(rateLimitInfo) {
  let n = RateLimitInfoSchema();
  let r = new Map(Object.entries(n.shape));
  let s =
    typeof rateLimitInfo === "object" && rateLimitInfo !== null && !Array.isArray(rateLimitInfo)
      ? pickByHelper(rateLimitInfo, (m, g) => g === "status" || (r.get(g)?.safeParse(m).success ?? false))
      : rateLimitInfo;
  let i = n.safeParse(s);
  if (i.success) return i.data;
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
function recordNestedUuidAliases(e, uuid, r) {
  let filtered = r.filter((i) => i !== uuid);
  if (filtered.length > 0) e.nestedUuidAliases.set(uuid, filtered);
}
//@ chunk-3xdfvx0n.js:14942-15303 placement
function isModelRefusalFallback(payload) {
  if (typeof payload !== "object" || payload === null) return null;
  let n = payload;
  let uuid = typeof n.uuid === "string" ? n.uuid : null;
  if (n.type === "system" && n.subtype === "model_refusal_fallback") {
    let s = otherStrings(n.retracted_message_uuids, uuid);
    return s
      ? {
          uuids: s,
          source: "retraction_banner",
        }
      : null;
  }
  if (n.type === "assistant") {
    let s = otherStrings(n.supersedes, uuid);
    return s
      ? {
          uuids: s,
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
function otherStrings(e, uuid) {
  if (!Array.isArray(e)) return null;
  let filtered = e.filter((s) => typeof s === "string" && s !== uuid);
  return filtered.length > 0 ? filtered : null;
}
//@ chunk-3xdfvx0n.js:15425-15532 placement
/**
 * 去掉 uuid 在集合中的消息。
 */
function dropMessagesByUuid(e, retracted) {
  if (retracted.size === 0) return e;
  let filtered = e.filter((s) => !retracted.has(s.uuid));
  return filtered.length === e.length ? e : filtered;
}
//@ chunk-3xdfvx0n.js:15532-15597 placement
/**
 * 导出函数 `recordInProgressToolUses`：参数 e, n, r。
 */
function recordInProgressToolUses(e, uuid, r) {
  for (let s of r) e.inProgressToolUses.set(s, uuid);
}
//@ chunk-3xdfvx0n.js:15597-15661 placement
/**
 * 导出函数 `clearInProgressToolUses`：参数 e, n。
 */
function clearInProgressToolUses(e, n) {
  for (let r of n) e.inProgressToolUses.delete(r);
}
//@ chunk-3xdfvx0n.js:15661-16247 placement
function evictRefusalRetraction(e) {
  let { index, signal, surface, setMessages, setInProgressToolUseIDs } = e;
  let newlyRetractedCount = count(signal.uuids, (d) => !index.retracted.has(d));
  for (let uuid of signal.uuids) {
    index.retracted.add(uuid);
    for (let S of index.nestedUuidAliases.get(uuid) ?? []) index.retracted.add(S);
  }
  let mapped = [...index.inProgressToolUses].filter(([, d]) => index.retracted.has(d)).map(([d]) => d);
  clearInProgressToolUses(index, mapped);
  for (let d of mapped) index.evictedToolUses.add(d);
  if (mapped.length > 0 && setInProgressToolUseIDs)
    setInProgressToolUseIDs({
      action: "remove",
      ids: mapped,
    });
  setMessages((d) => dropMessagesByUuid(d, index.retracted));
  logEvent("tengu_refusal_retraction_evicted", {
    surface: fromEnum(surface),
    source: fromEnum(signal.source),
    uuid_count: signal.uuids.length,
    newly_retracted_count: newlyRetractedCount,
    tool_use_cleared_count: mapped.length,
  });
}
//@ chunk-3xdfvx0n.js:16247-16439 placement
/**
 * 统计撤回后孤立的工具结果并上报。
 */
function countOrphanToolResults(e, n, r, s) {
  if (s !== null && e.retracted.has(s)) return 0;
  let i = count(n, (m) => e.evictedToolUses.has(m));
  if (i > 0)
    logEvent("tengu_refusal_retraction_orphan_tool_result", {
      surface: fromEnum(r),
      count: i,
    });
  return i;
}
//@ chunk-3xdfvx0n.js:16439-16976 placement
function checkRefusalRetractionSource(e) {
  let { index, events, surface, setMessages, setInProgressToolUseIDs } = e;
  let g = 0;
  let y = 0;
  let d = 0;
  for (let event of events) {
    if (event.source !== "worker") {
      if (isModelRefusalFallback(event.payload))
        if (event.source === undefined) d++;
        else y++;
      continue;
    }
    let h = isModelRefusalFallback(event.payload);
    if (h) {
      g++;
      evictRefusalRetraction({
        index,
        signal: h,
        surface,
        setMessages,
        setInProgressToolUseIDs,
      });
    }
  }
  if (y > 0)
    logEvent("tengu_refusal_retraction_unauthenticated_signal", {
      surface: fromEnum(surface),
      reason: lit("source_mismatch"),
      count: y,
    });
  if (d > 0)
    logEvent("tengu_refusal_retraction_unauthenticated_signal", {
      surface: fromEnum(surface),
      reason: lit("source_missing"),
      count: d,
    });
  return g;
}
//@ chunk-3xdfvx0n.js:16976-17093 placement
/**
 * 已撤回消息的迟到帧：丢弃并上报。
 */
function dropLateRetracted(retraction, uuid, r) {
  if (!retraction.retracted.has(uuid)) return false;
  logEvent("tengu_refusal_retraction_late_drop", {
    surface: fromEnum(r),
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
function applyRemoteTaskEvent(e, n, startTime) {
  if (n.type !== "system") return;
  switch (n.subtype) {
    case "task_started": {
      if (typeof n.task_id !== "string" || n.task_type !== LOCAL_WORKFLOW) return;
      let s = e.get(n.task_id);
      let i =
        s !== undefined && !isTerminalTaskStatus(s.status) ? s : newRemoteWorkflowTask(n.task_id, startTime);
      e.set(i.id, {
        ...i,
        runId: typeof n.run_id === "string" ? n.run_id : i.runId,
        description: sanitizeLabel(n.description) || i.description,
        workflowName: sanitizeLabel(n.workflow_name) || i.workflowName,
      });
      return;
    }
    case "task_progress": {
      if (typeof n.task_id !== "string" || !Array.isArray(n.workflow_progress)) return;
      let s = e.get(n.task_id);
      if (s !== undefined && isTerminalTaskStatus(s.status)) return;
      let i = s ?? {
        ...newRemoteWorkflowTask(n.task_id, startTime),
        presence: "reported",
      };
      e.set(i.id, {
        ...applyTaskUsage(i, n.usage, startTime),
        runId: i.runId ?? (typeof n.run_id === "string" ? n.run_id : undefined),
        wireProgress: n.workflow_progress,
        presence: i.presence === "unlisted" ? "reported" : i.presence,
      });
      return;
    }
    case "background_tasks_changed": {
      if (!Array.isArray(n.tasks)) return;
      let s = new Set(n.tasks.map((task) => task?.task_id));
      for (let i of e.values())
        if (i.presence === "reported" && !s.has(i.id))
          e.set(i.id, {
            ...i,
            presence: "unlisted",
          });
      return;
    }
    case "task_updated": {
      let s = typeof n.task_id === "string" ? e.get(n.task_id) : undefined;
      let i = TASK_STATUS_SCHEMA().safeParse(n.patch?.status).data;
      if (s === undefined || i === undefined || isTerminalTaskStatus(s.status)) return;
      e.set(s.id, {
        ...s,
        status: i,
        endTime: isTerminalTaskStatus(i) ? startTime : s.endTime,
      });
      return;
    }
    case "task_notification": {
      let s = typeof n.task_id === "string" ? e.get(n.task_id) : undefined;
      if (s === undefined) return;
      let i =
        n.status === "completed"
          ? "completed"
          : n.status === "failed"
            ? "failed"
            : n.status === "stopped"
              ? "killed"
              : undefined;
      let m = isTerminalTaskStatus(s.status);
      if (i === undefined) {
        if (!m) e.delete(s.id);
        return;
      }
      if (m && s.status !== i) return;
      e.set(s.id, {
        ...applyTaskUsage(s, n.usage, startTime),
        status: i,
        endTime: s.endTime ?? startTime,
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
function reconcileRemoteTasks(e, n, startTime) {
  for (let y of n.values()) {
    if (y.taskType !== LOCAL_WORKFLOW) continue;
    let d = e.get(y.id);
    if (d === undefined)
      e.set(y.id, {
        ...newRemoteWorkflowTask(y.id, startTime),
        description: y.description,
      });
    else if (d.description === "" && y.description !== "")
      e.set(y.id, {
        ...d,
        description: y.description,
      });
  }
  let s = [];
  let i = [];
  let m = [];
  for (let y of e.values()) {
    let d = n.get(y.id);
    let S = isTerminalTaskStatus(y.status);
    if (!S && d?.taskType !== undefined && d.taskType !== LOCAL_WORKFLOW) {
      e.delete(y.id);
      continue;
    }
    let h = d !== undefined ? "listed" : y.presence === "listed" ? "unlisted" : y.presence;
    let _ =
      S || h === y.presence
        ? y
        : {
            ...y,
            presence: h,
          };
    if (_ !== y) e.set(_.id, _);
    if (S) i.push(_);
    else if (_.presence === "unlisted") {
      m.push(_);
      continue;
    }
    s.push(_);
  }
  let g = new Set([
    ...i
      .toSorted((y, d) => (y.endTime ?? 0) - (d.endTime ?? 0))
      .slice(0, Math.max(0, i.length - MAX_RUNTIME_PROGRESS_TASKS)),
    ...m.slice(0, Math.max(0, m.length - MAX_RUNTIME_PROGRESS_TASKS)),
  ]);
  for (let y of g) e.delete(y.id);
  return g.size === 0 ? s : s.filter((y) => !g.has(y));
}
//@ chunk-3xdfvx0n.js:19556-19867 placement
/**
 * 把前台任务、后台任务与工作流运行写回应用状态（未变则原样返回）。
 */
function applyRemoteTaskState(e, n, r, s) {
  let i = sameBackgroundTaskList(e.remoteBackgroundTasks, n);
  let m = e.remoteWorkflowRuns.length === r.length && r.every((g, y) => g === e.remoteWorkflowRuns[y]);
  return i && m && e.remoteForegroundTask === s
    ? e
    : {
        ...e,
        remoteForegroundTask: s,
        remoteBackgroundTasks: i ? e.remoteBackgroundTasks : n,
        remoteWorkflowRuns: m ? e.remoteWorkflowRuns : r,
      };
}
//@ chunk-3xdfvx0n.js:19867-19988 placement
/**
 * 把所有未结束任务标记为未列出。
 */
function markTasksUnlisted(e) {
  for (let n of e.values())
    if (!isTerminalTaskStatus(n.status) && n.presence !== "unlisted")
      e.set(n.id, {
        ...n,
        presence: "unlisted",
      });
}
//@ chunk-3xdfvx0n.js:19988-20082 placement
/**
 * 导出函数 `parseWorkflowProgressList`：参数 e，返回 e.flatMap((n) => { let safeParse = WORKFLOW_PROGRESS_SCHEMA().safeParse(n); return safeParse.success ? [safePa…。
 */
function parseWorkflowProgressList(wireProgress) {
  return wireProgress.flatMap((n) => {
    let r = WORKFLOW_PROGRESS_SCHEMA().safeParse(n);
    return r.success ? [r.data] : [];
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
function applyTaskUsage(e, usage, r) {
  let s = TASK_USAGE_SCHEMA().safeParse(usage).data;
  if (s === undefined) return e;
  return {
    ...e,
    totalTokens: s.total_tokens,
    totalToolCalls: s.tool_uses,
    startTime: Math.min(e.startTime, r - s.duration_ms),
  };
}
//@ chunk-3xdfvx0n.js:20453-20501 placement
function optionalSchema(e) {
  return e.optional().catch(undefined);
}
//@ chunk-3xdfvx0n.js:20501-21480 placement
/**
 * 远程任务事件 schema：用量、状态、工作流进度。
 */
var TASK_USAGE_SCHEMA = DoctorLazy(() =>
  u({
    total_tokens: E(),
    tool_uses: E(),
    duration_ms: E().nonnegative().max(MAX_TASK_DURATION_MS).catch(0),
  }),
);
var TASK_STATUS_SCHEMA = DoctorLazy(() =>
  _enum(["pending", "running", "completed", "failed", "killed", "paused"]),
);
var WORKFLOW_PROGRESS_SCHEMA = DoctorLazy(() => {
  let e = string().transform((r) =>
    sanitizeDisplayText(r, {
      maxCodeUnits: MAX_TITLE_LENGTH,
    }),
  );
  let n = string().transform(
    (r) =>
      clipDisplayText(r, {
        maxCodeUnits: MAX_MARKDOWN_SAFE_LENGTH,
        maxLines: MAX_DISPLAY_TEXT_LINES,
      }).text,
  );
  return discriminatedUnion("type", [
    u({
      type: literal("workflow_agent"),
      index: E().int(),
      label: e,
      state: _enum(["start", "progress", "done", "error"]),
      phaseIndex: optionalSchema(E().int()),
      phaseTitle: optionalSchema(e),
      agentId: optionalSchema(e),
      agentType: optionalSchema(e),
      isolation: optionalSchema(_enum(["worktree", "remote"])),
      remoteSessionId: optionalSchema(e),
      model: optionalSchema(e),
      fallbackModel: optionalSchema(e),
      tokens: optionalSchema(E()),
      toolCalls: optionalSchema(E()),
      durationMs: optionalSchema(E()),
      error: optionalSchema(n),
      startedAt: optionalSchema(E()),
      lastProgressAt: optionalSchema(E()),
      queuedAt: optionalSchema(E()),
      attempt: optionalSchema(E()),
      lastAttemptReason: optionalSchema(_enum(["stalled", "throttled", "user-retry"])),
      skipped: optionalSchema(M()),
      blocked: optionalSchema(M()),
      cached: optionalSchema(M()),
      lastToolName: optionalSchema(e),
      lastToolSummary: optionalSchema(e),
      resultPreview: optionalSchema(n),
      promptPreview: optionalSchema(n),
      promptFramed: optionalSchema(M()),
    }),
    u({
      type: literal("workflow_phase"),
      index: E().int(),
      title: e,
      kind: optionalSchema(literal("child")),
    }),
  ]);
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
function sessionMetadataArtifacts(e) {
  if (e.type !== "system" || e.subtype !== "session_metadata") return;
  let { metadata } = e;
  if (typeof metadata !== "object" || metadata === null) return;
  let artifacts = "artifacts" in metadata ? metadata.artifacts : undefined;
  return artifacts === null || Array.isArray(artifacts) ? artifacts : undefined;
}
//@ chunk-3xdfvx0n.js:21716-22237 placement
/**
 * 把云会话 artifacts 合并进 frameUrls（未变化则原样返回）。
 */
function mergeCloudArtifactFrames(e, n) {
  let r = cloudArtifactFrames(n ?? []);
  let filtered = Object.entries(e.frameUrls).filter(([, value]) => value.fromCloudSession !== true);
  if (r.length === 0 && filtered.length === Object.keys(e.frameUrls).length) return e;
  let i = new Set(filtered.map(([S]) => S));
  let m = Object.fromEntries([...filtered, ...r.filter(([S]) => !i.has(S))]);
  let entries = Object.entries(e.frameUrls);
  let entries_2 = Object.entries(m);
  return entries.length === entries_2.length &&
    entries.every(([S, h], _) => {
      let [w, R] = entries_2[_];
      let entries = Object.entries(h);
      let entries_3 = Object.entries(R);
      return (
        S === w &&
        entries.length === entries_3.length &&
        entries.every(([L, z]) => entries_3.some(([N, j]) => N === L && j === z))
      );
    })
    ? e
    : {
        ...e,
        frameUrls: m,
      };
}
//@ chunk-3xdfvx0n.js:22237-22339 placement
var ARTIFACT_ENTRY_SCHEMA = DoctorLazy(() =>
  u({
    url: string(),
    title: string().optional().catch(undefined),
    updated_at: string().optional().catch(undefined),
  }),
);
//@ chunk-3xdfvx0n.js:22339-22810 placement
/**
 * 解析云会话 artifacts，按 slug 取最新并转为 frameUrls 条目。
 */
function cloudArtifactFrames(e) {
  let n = new Map();
  for (let r of e) {
    let s = ARTIFACT_ENTRY_SCHEMA().safeParse(r);
    if (!s.success) continue;
    let { url, title, updated_at: updatedAt } = s.data;
    let artifactUrl = parseArtifactUrl(url);
    if (artifactUrl === null) continue;
    let d = updatedAt !== undefined ? Date.parse(updatedAt) : NaN;
    let S = {
      url: artifactViewerUrlFor(artifactUrl),
      updatedAt: Number.isFinite(d) ? d : 0,
      ...(title !== undefined &&
        title !== "" && {
          title: truncateToLength(title, MAX_TITLE_CHARS_EVENTS),
        }),
      fromCloudSession: true,
    };
    let h = n.get(artifactUrl.slug);
    if (h === undefined || S.updatedAt >= h.updatedAt) n.set(artifactUrl.slug, S);
  }
  return [...n]
    .sort(([, r], [, s]) => r.updatedAt - s.updatedAt)
    .slice(-MAX_ARTIFACT_LIST_ITEMS)
    .map(([r, s]) => [`${OPENED}${r}`, s]);
}
//@ chunk-3xdfvx0n.js:22810-23036 placement
/**
 * 合并会话的技能、插件、工具与命令列表。
 */
function mergeSessionCapabilities(e, n) {
  if (n.skills === undefined && n.plugins === undefined) return e;
  let tools = n.tools ?? e?.tools;
  let s = n.slashCommands ?? e?.commands;
  return {
    skills: n.skills ?? [],
    plugins: n.plugins ?? [],
    ...(tools !== undefined && {
      tools,
    }),
    ...(s !== undefined && {
      commands: s,
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
