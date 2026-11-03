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
import { koo } from "../entrypoints/sdk/coreSchemas.js";
import { Do } from "../utils/git/gitSafeEnv.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { count } from "../utils/collections.js";
import { isTerminalTaskStatus } from "../tasks/taskStatus.js";
import { hen, sameBackgroundTaskList } from "../services/homeSeed/firstSend.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, E, U, o, Ir, T, M } from "../../vendor/zod/v4/classic/schemas.js";
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
function Skr(r) {
  return r.type === "result";
}
//@ chunk-3xdfvx0n.js:13984-14001 placement
var te = 64,
  re = 128;
//@ chunk-3xdfvx0n.js:14001-14068 placement
function P(e) {
  return typeof e === "string" && e.length > 0 && e.length <= re;
}
/**
 * 拒答撤回事件中的用户消息 uuid 列表。
 */
//@ chunk-3xdfvx0n.js:14068-14289 placement
function retractedUserMessageUuids(e) {
  let n = "user_message_uuids" in e ? e.user_message_uuids : null,
    r = Array.isArray(n) ? n.filter(P).slice(0, te) : [];
  if (r.length > 0) return r;
  let s = "user_message_uuid" in e ? e.user_message_uuid : void 0;
  return P(s) ? [s] : void 0;
}
//@ chunk-3xdfvx0n.js:14289-14382 placement
function gAs(e, n, r) {
  let s = retractedUserMessageUuids(e);
  return r.taskWake || (s === void 0 ? r.sent : s.some((i) => n.has(i)));
}
//@ chunk-3xdfvx0n.js:14382-14734 placement
function dropRemoteRateLimitFrame(e) {
  let n = koo(),
    r = new Map(Object.entries(n.shape)),
    s =
      typeof e === "object" && e !== null && !Array.isArray(e)
        ? Do(e, (m, g) => g === "status" || (r.get(g)?.safeParse(m).success ?? !1))
        : e,
    safeParse = n.safeParse(s);
  if (safeParse.success) return safeParse.data;
  if (claimOnce().claim("remote_rate_limit_frame_drop"))
    logEvent("tengu_remote_rate_limits_dropped", { reason: lit("invalid_frame"), frames: 1 });
  return;
}
/**
 * 拒答撤回跟踪状态的初始值。
 */
//@ chunk-3xdfvx0n.js:14734-14852 placement
function createRetractionState() {
  return {
    retracted: new Set(),
    inProgressToolUses: new Map(),
    evictedToolUses: new Set(),
    nestedUuidAliases: new Map(),
  };
}
//@ chunk-3xdfvx0n.js:14852-14942 placement
function Ekr(e, n, r) {
  let filtered = r.filter((i) => i !== n);
  if (filtered.length > 0) e.nestedUuidAliases.set(n, filtered);
}
//@ chunk-3xdfvx0n.js:14942-15303 placement
function isModelRefusalFallback(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = e,
    r = typeof n.uuid === "string" ? n.uuid : null;
  if (n.type === "system" && n.subtype === "model_refusal_fallback") {
    let s = otherStrings(n.retracted_message_uuids, r);
    return s ? { uuids: s, source: "retraction_banner" } : null;
  }
  if (n.type === "assistant") {
    let s = otherStrings(n.supersedes, r);
    return s ? { uuids: s, source: "supersedes" } : null;
  }
  return null;
}
/**
 * 数组中不等于 n 的字符串（没有则 null）。
 */
//@ chunk-3xdfvx0n.js:15303-15425 placement
function otherStrings(e, n) {
  if (!Array.isArray(e)) return null;
  let filtered = e.filter((s) => typeof s === "string" && s !== n);
  return filtered.length > 0 ? filtered : null;
}
/**
 * 去掉 uuid 在集合中的消息。
 */
//@ chunk-3xdfvx0n.js:15425-15532 placement
function dropMessagesByUuid(e, n) {
  if (n.size === 0) return e;
  let filtered = e.filter((s) => !n.has(s.uuid));
  return filtered.length === e.length ? e : filtered;
}
//@ chunk-3xdfvx0n.js:15532-15597 placement
function vkr(e, n, r) {
  for (let s of r) e.inProgressToolUses.set(s, n);
}
//@ chunk-3xdfvx0n.js:15597-15661 placement
function M0n(e, n) {
  for (let r of n) e.inProgressToolUses.delete(r);
}
//@ chunk-3xdfvx0n.js:15661-16247 placement
function evictRefusalRetraction(e) {
  let {
      index: index,
      signal: signal,
      surface: surface,
      setMessages: setMessages,
      setInProgressToolUseIDs: setInProgressToolUseIDs,
    } = e,
    g = count(signal.uuids, (d) => !index.retracted.has(d));
  for (let uuid of signal.uuids) {
    index.retracted.add(uuid);
    for (let S of index.nestedUuidAliases.get(uuid) ?? []) index.retracted.add(S);
  }
  let mapped = [...index.inProgressToolUses].filter(([, d]) => index.retracted.has(d)).map(([d]) => d);
  M0n(index, mapped);
  for (let d of mapped) index.evictedToolUses.add(d);
  if (mapped.length > 0 && setInProgressToolUseIDs)
    setInProgressToolUseIDs({ action: "remove", ids: mapped });
  (setMessages((d) => dropMessagesByUuid(d, index.retracted)),
    logEvent("tengu_refusal_retraction_evicted", {
      surface: fromEnum(surface),
      source: fromEnum(signal.source),
      uuid_count: signal.uuids.length,
      newly_retracted_count: g,
      tool_use_cleared_count: mapped.length,
    }));
}
/**
 * 统计撤回后孤立的工具结果并上报。
 */
//@ chunk-3xdfvx0n.js:16247-16439 placement
function countOrphanToolResults(e, n, r, s) {
  if (s !== null && e.retracted.has(s)) return 0;
  let i = count(n, (m) => e.evictedToolUses.has(m));
  if (i > 0) logEvent("tengu_refusal_retraction_orphan_tool_result", { surface: fromEnum(r), count: i });
  return i;
}
//@ chunk-3xdfvx0n.js:16439-16976 placement
function checkRefusalRetractionSource(e) {
  let {
      index: index,
      events: events,
      surface: surface,
      setMessages: setMessages,
      setInProgressToolUseIDs: setInProgressToolUseIDs,
    } = e,
    g = 0,
    y = 0,
    d = 0;
  for (let S of events) {
    if (S.source !== "worker") {
      if (isModelRefusalFallback(S.payload))
        if (S.source === void 0) d++;
        else y++;
      continue;
    }
    let h = isModelRefusalFallback(S.payload);
    if (h)
      (g++,
        evictRefusalRetraction({
          index: index,
          signal: h,
          surface: surface,
          setMessages: setMessages,
          setInProgressToolUseIDs: setInProgressToolUseIDs,
        }));
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
/**
 * 已撤回消息的迟到帧：丢弃并上报。
 */
//@ chunk-3xdfvx0n.js:16976-17093 placement
function dropLateRetracted(e, n, r) {
  if (!e.retracted.has(n)) return !1;
  return (logEvent("tengu_refusal_retraction_late_drop", { surface: fromEnum(r) }), !0);
}
//@ chunk-3xdfvx0n.js:17093-17141 placement
var LOCAL_WORKFLOW = "local_workflow",
  O = 20,
  ae = 2592000000,
  ue = 40;
//@ chunk-3xdfvx0n.js:17141-18738 placement
function applyRemoteTaskEvent(e, n, r) {
  if (n.type !== "system") return;
  switch (n.subtype) {
    case "task_started": {
      if (typeof n.task_id !== "string" || n.task_type !== LOCAL_WORKFLOW) return;
      let s = e.get(n.task_id),
        i = s !== void 0 && !isTerminalTaskStatus(s.status) ? s : newRemoteWorkflowTask(n.task_id, r);
      e.set(i.id, {
        ...i,
        runId: typeof n.run_id === "string" ? n.run_id : i.runId,
        description: hen(n.description) || i.description,
        workflowName: hen(n.workflow_name) || i.workflowName,
      });
      return;
    }
    case "task_progress": {
      if (typeof n.task_id !== "string" || !Array.isArray(n.workflow_progress)) return;
      let s = e.get(n.task_id);
      if (s !== void 0 && isTerminalTaskStatus(s.status)) return;
      let i = s ?? { ...newRemoteWorkflowTask(n.task_id, r), presence: "reported" };
      e.set(i.id, {
        ...applyTaskUsage(i, n.usage, r),
        runId: i.runId ?? (typeof n.run_id === "string" ? n.run_id : void 0),
        wireProgress: n.workflow_progress,
        presence: i.presence === "unlisted" ? "reported" : i.presence,
      });
      return;
    }
    case "background_tasks_changed": {
      if (!Array.isArray(n.tasks)) return;
      let s = new Set(n.tasks.map((task) => task?.task_id));
      for (let i of e.values())
        if (i.presence === "reported" && !s.has(i.id)) e.set(i.id, { ...i, presence: "unlisted" });
      return;
    }
    case "task_updated": {
      let s = typeof n.task_id === "string" ? e.get(n.task_id) : void 0,
        i = TASK_STATUS_SCHEMA().safeParse(n.patch?.status).data;
      if (s === void 0 || i === void 0 || isTerminalTaskStatus(s.status)) return;
      e.set(s.id, { ...s, status: i, endTime: isTerminalTaskStatus(i) ? r : s.endTime });
      return;
    }
    case "task_notification": {
      let s = typeof n.task_id === "string" ? e.get(n.task_id) : void 0;
      if (s === void 0) return;
      let i =
          n.status === "completed"
            ? "completed"
            : n.status === "failed"
              ? "failed"
              : n.status === "stopped"
                ? "killed"
                : void 0,
        m = isTerminalTaskStatus(s.status);
      if (i === void 0) {
        if (!m) e.delete(s.id);
        return;
      }
      if (m && s.status !== i) return;
      e.set(s.id, { ...applyTaskUsage(s, n.usage, r), status: i, endTime: s.endTime ?? r });
      return;
    }
    default:
      return;
  }
}
/**
 * 合并远程任务列表：补齐工作流任务、标记未列出的、按上限淘汰已结束的。
 */
//@ chunk-3xdfvx0n.js:18738-19556 placement
function reconcileRemoteTasks(e, n, r) {
  for (let y of n.values()) {
    if (y.taskType !== LOCAL_WORKFLOW) continue;
    let d = e.get(y.id);
    if (d === void 0) e.set(y.id, { ...newRemoteWorkflowTask(y.id, r), description: y.description });
    else if (d.description === "" && y.description !== "") e.set(y.id, { ...d, description: y.description });
  }
  let s = [],
    i = [],
    m = [];
  for (let y of e.values()) {
    let d = n.get(y.id),
      S = isTerminalTaskStatus(y.status);
    if (!S && d?.taskType !== void 0 && d.taskType !== LOCAL_WORKFLOW) {
      e.delete(y.id);
      continue;
    }
    let h = d !== void 0 ? "listed" : y.presence === "listed" ? "unlisted" : y.presence,
      _ = S || h === y.presence ? y : { ...y, presence: h };
    if (_ !== y) e.set(_.id, _);
    if (S) i.push(_);
    else if (_.presence === "unlisted") {
      m.push(_);
      continue;
    }
    s.push(_);
  }
  let g = new Set([
    ...i.toSorted((y, d) => (y.endTime ?? 0) - (d.endTime ?? 0)).slice(0, Math.max(0, i.length - O)),
    ...m.slice(0, Math.max(0, m.length - O)),
  ]);
  for (let y of g) e.delete(y.id);
  return g.size === 0 ? s : s.filter((y) => !g.has(y));
}
/**
 * 把前台任务、后台任务与工作流运行写回应用状态（未变则原样返回）。
 */
//@ chunk-3xdfvx0n.js:19556-19867 placement
function applyRemoteTaskState(e, n, r, s) {
  let i = sameBackgroundTaskList(e.remoteBackgroundTasks, n),
    m = e.remoteWorkflowRuns.length === r.length && r.every((g, y) => g === e.remoteWorkflowRuns[y]);
  return i && m && e.remoteForegroundTask === s
    ? e
    : {
        ...e,
        remoteForegroundTask: s,
        remoteBackgroundTasks: i ? e.remoteBackgroundTasks : n,
        remoteWorkflowRuns: m ? e.remoteWorkflowRuns : r,
      };
}
/**
 * 把所有未结束任务标记为未列出。
 */
//@ chunk-3xdfvx0n.js:19867-19988 placement
function markTasksUnlisted(e) {
  for (let n of e.values())
    if (!isTerminalTaskStatus(n.status) && n.presence !== "unlisted")
      e.set(n.id, { ...n, presence: "unlisted" });
}
//@ chunk-3xdfvx0n.js:19988-20082 placement
function Upo(e) {
  return e.flatMap((n) => {
    let safeParse = WORKFLOW_PROGRESS_SCHEMA().safeParse(n);
    return safeParse.success ? [safeParse.data] : [];
  });
}
/**
 * 远程工作流任务的初始记录。
 */
//@ chunk-3xdfvx0n.js:20082-20268 placement
function newRemoteWorkflowTask(e, n) {
  return {
    id: e,
    runId: void 0,
    status: "running",
    presence: "listed",
    description: "",
    workflowName: void 0,
    wireProgress: [],
    totalTokens: 0,
    totalToolCalls: 0,
    startTime: n,
    endTime: void 0,
  };
}
/**
 * 用任务用量更新 token、工具调用与开始时间。
 */
//@ chunk-3xdfvx0n.js:20268-20453 placement
function applyTaskUsage(e, n, r) {
  let s = TASK_USAGE_SCHEMA().safeParse(n).data;
  if (s === void 0) return e;
  return {
    ...e,
    totalTokens: s.total_tokens,
    totalToolCalls: s.tool_uses,
    startTime: Math.min(e.startTime, r - s.duration_ms),
  };
}
//@ chunk-3xdfvx0n.js:20453-20501 placement
function k(e) {
  return e.optional().catch(void 0);
}
/**
 * 远程任务事件 schema：用量、状态、工作流进度。
 */
//@ chunk-3xdfvx0n.js:20501-21480 placement
var TASK_USAGE_SCHEMA = DoctorLazy(() =>
    u({ total_tokens: E(), tool_uses: E(), duration_ms: E().nonnegative().max(ae).catch(0) }),
  ),
  TASK_STATUS_SCHEMA = DoctorLazy(() => U(["pending", "running", "completed", "failed", "killed", "paused"])),
  WORKFLOW_PROGRESS_SCHEMA = DoctorLazy(() => {
    let transform = o().transform((r) => sanitizeDisplayText(r, { maxCodeUnits: MAX_TITLE_LENGTH })),
      transform_2 = o().transform(
        (r) => clipDisplayText(r, { maxCodeUnits: MAX_MARKDOWN_SAFE_LENGTH, maxLines: ue }).text,
      );
    return Ir("type", [
      u({
        type: T("workflow_agent"),
        index: E().int(),
        label: transform,
        state: U(["start", "progress", "done", "error"]),
        phaseIndex: k(E().int()),
        phaseTitle: k(transform),
        agentId: k(transform),
        agentType: k(transform),
        isolation: k(U(["worktree", "remote"])),
        remoteSessionId: k(transform),
        model: k(transform),
        fallbackModel: k(transform),
        tokens: k(E()),
        toolCalls: k(E()),
        durationMs: k(E()),
        error: k(transform_2),
        startedAt: k(E()),
        lastProgressAt: k(E()),
        queuedAt: k(E()),
        attempt: k(E()),
        lastAttemptReason: k(U(["stalled", "throttled", "user-retry"])),
        skipped: k(M()),
        blocked: k(M()),
        cached: k(M()),
        lastToolName: k(transform),
        lastToolSummary: k(transform),
        resultPreview: k(transform_2),
        promptPreview: k(transform_2),
        promptFramed: k(M()),
      }),
      u({ type: T("workflow_phase"), index: E().int(), title: transform, kind: k(T("child")) }),
    ]);
  });
//@ chunk-3xdfvx0n.js:21480-21498 placement
var pe = 100,
  fe = 256;
/**
 * session_metadata 事件里的 artifacts 列表。
 */
//@ chunk-3xdfvx0n.js:21498-21716 placement
function sessionMetadataArtifacts(e) {
  if (e.type !== "system" || e.subtype !== "session_metadata") return;
  let { metadata: metadata } = e;
  if (typeof metadata !== "object" || metadata === null) return;
  let r = "artifacts" in metadata ? metadata.artifacts : void 0;
  return r === null || Array.isArray(r) ? r : void 0;
}
/**
 * 把云会话 artifacts 合并进 frameUrls（未变化则原样返回）。
 */
//@ chunk-3xdfvx0n.js:21716-22237 placement
function mergeCloudArtifactFrames(e, n) {
  let r = cloudArtifactFrames(n ?? []),
    filtered = Object.entries(e.frameUrls).filter(([, S]) => S.fromCloudSession !== !0);
  if (r.length === 0 && filtered.length === Object.keys(e.frameUrls).length) return e;
  let i = new Set(filtered.map(([S]) => S)),
    fromEntries = Object.fromEntries([...filtered, ...r.filter(([S]) => !i.has(S))]),
    entries = Object.entries(e.frameUrls),
    entries_2 = Object.entries(fromEntries);
  return entries.length === entries_2.length &&
    entries.every(([S, h], _) => {
      let [w, R] = entries_2[_],
        entries = Object.entries(h),
        entries_3 = Object.entries(R);
      return (
        S === w &&
        entries.length === entries_3.length &&
        entries.every(([L, z]) => entries_3.some(([N, j]) => N === L && j === z))
      );
    })
    ? e
    : { ...e, frameUrls: fromEntries };
}
//@ chunk-3xdfvx0n.js:22237-22339 placement
var ARTIFACT_ENTRY_SCHEMA = DoctorLazy(() =>
  u({
    url: o(),
    title: o()
      .optional()
      .catch(void 0),
    updated_at: o()
      .optional()
      .catch(void 0),
  }),
);
/**
 * 解析云会话 artifacts，按 slug 取最新并转为 frameUrls 条目。
 */
//@ chunk-3xdfvx0n.js:22339-22810 placement
function cloudArtifactFrames(e) {
  let n = new Map();
  for (let r of e) {
    let safeParse = ARTIFACT_ENTRY_SCHEMA().safeParse(r);
    if (!safeParse.success) continue;
    let { url: url, title: title, updated_at: updated_at } = safeParse.data,
      y = parseArtifactUrl(url);
    if (y === null) continue;
    let d = updated_at !== void 0 ? Date.parse(updated_at) : NaN,
      S = {
        url: artifactViewerUrlFor(y),
        updatedAt: Number.isFinite(d) ? d : 0,
        ...(title !== void 0 && title !== "" && { title: truncateToLength(title, fe) }),
        fromCloudSession: !0,
      },
      h = n.get(y.slug);
    if (h === void 0 || S.updatedAt >= h.updatedAt) n.set(y.slug, S);
  }
  return [...n]
    .sort(([, r], [, s]) => r.updatedAt - s.updatedAt)
    .slice(-pe)
    .map(([r, s]) => [`${OPENED}${r}`, s]);
}
/**
 * 合并会话的技能、插件、工具与命令列表。
 */
//@ chunk-3xdfvx0n.js:22810-23036 placement
function mergeSessionCapabilities(e, n) {
  if (n.skills === void 0 && n.plugins === void 0) return e;
  let r = n.tools ?? e?.tools,
    s = n.slashCommands ?? e?.commands;
  return {
    skills: n.skills ?? [],
    plugins: n.plugins ?? [],
    ...(r !== void 0 && { tools: r }),
    ...(s !== void 0 && { commands: s }),
  };
}

export {
  createRetractionState,
  reconcileRemoteTasks,
  applyRemoteTaskState,
  markTasksUnlisted,
  isModelRefusalFallback,
  evictRefusalRetraction,
  Skr,
  applyRemoteTaskEvent,
  dropRemoteRateLimitFrame,
  M0n,
  countOrphanToolResults,
  dropLateRetracted,
  Ekr,
  vkr,
  mergeCloudArtifactFrames,
  sessionMetadataArtifacts,
  gAs,
  checkRefusalRetractionSource,
  mergeSessionCapabilities,
  Upo,
};
