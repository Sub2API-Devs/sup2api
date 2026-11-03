/**
 * cli/print/resumeTurnBoundaries.ts
 *
 * 2.1.316 新增：--resume-drops-turn 等恢复时按声明的轮次截断转录、判定可见消息与轮末上下文用量估计
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (23)
 * attribution: placement 23
 */
import { Ar } from "../../../runtime/bun-runtime.js";
import { describeDroppedNotes } from "./turnStreaming.js";
import { isEmptyThreadAskMarker } from "../../services/projects/threadTranscript.js";
import { isToolResultOnlyUserMessage } from "../../services/api/claude.js";
import { classifyMessageFrame } from "../../utils/messageProvenance.js";
import {
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  AGENT_CALL_PROCESS_STOPPED,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  CANCEL_MESSAGE,
  MEMORY_CORRECTION_HINT,
  TOOL_CALL_SKIPPED_FOR_DELIVERY,
  TOOL_CALL_SKIPPED_BY_SIBLING_DENIAL,
  APPROVAL_EXPIRED_MESSAGE,
  APPROVAL_UNANSWERED_MESSAGE,
  REJECT_MESSAGE,
  REJECT_MESSAGE_AFTER_RUN,
  isInterruptionOnlyMessage,
} from "../../utils/messages.js";
import { SYNTHETIC_MODEL, NO_RESPONSE_REQUESTED } from "../../constants/messages.js";
import { CRON_CREATE_TOOL_NAME, CRON_DELETE_TOOL_NAME } from "../../tools/ScheduleCronTool/prompt.js";
import { Vt } from "../../utils/agentId.js";
import { hasPollEventsAttachmentSince } from "../../utils/pollEvents.js";
import { Us, isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { getLastApiUsage } from "../../utils/tokens.js";
import { getAutoCompactWindow } from "../../services/compact/autoCompact.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { isAutoCompactEnabled } from "../../services/compact/compactSettings.js";
import { logError } from "../../utils/log.js";
import {
  isAbortError,
  isFsInaccessible,
  isFsInaccessibleCode,
  storageCauseErrnoCode,
  errorMessage,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { withDeadline } from "../../utils/sleep.js";
import { isCompactPairWithheldFromRemote, isBridgeBindingForeign } from "../../utils/sessionStorage.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { enqueueTaskNotification as enqueueTaskNotification_2 } from "../../utils/task/taskNotifications.js";

//@ chunk-0sfjpx19.js:5974-5985 placement
var ien = {};
//@ chunk-0sfjpx19.js:5985-6039 placement
Ar(ien, { createTurnEventTail: () => describeDroppedNotes, default: () => ien });
/**
 * 常量与可截断附件类型集合：--resume-drops-turn 拒绝提示前缀。
 */
//@ chunk-0sfjpx19.js:6039-8394 placement
var RESUME_DROPS_TURN_REJECTED_PREFIX = "Resume rejected by --resume-drops-turn:",
  Pn = new Set([
    "agent_listing_delta",
    "agent_mention",
    "at_mention_reference",
    "peer_mention",
    "skill_mention",
    "already_read_file",
    "async_hook_response_batch",
    "attention_budget",
    "auto_mode",
    "auto_mode_exit",
    "budget_usd",
    "command_permissions",
    "compact_file_reference",
    "context_efficiency",
    "cowork_memory_context",
    "account_memory_recall",
    "critical_system_reminder",
    "date_change",
    "thread_state",
    "prefix_delta",
    "deferred_tools_delta",
    "diagnostics",
    "directory",
    "dynamic_skill",
    "edited_image_file",
    "edited_text_file",
    "file",
    "goal_status",
    "goals",
    "hook_additional_context",
    "hook_blocking_error",
    "hook_cancelled",
    "hook_deferred_tool",
    "hook_error_during_execution",
    "hook_non_blocking_error",
    "hook_permission_decision",
    "hook_plugin_listing",
    "hook_stopped_continuation",
    "hook_success",
    "hook_system_message",
    "invoked_skills",
    "max_turns_reached",
    "mcp_instructions_delta",
    "mcp_dropped_tools_delta",
    "inlined_image_paths",
    "tool_hosts_notice",
    "tool_hosts_correction",
    "tool_host_result_lines",
    "mcp_resource",
    "memory_update",
    "nested_memory",
    "withheld_memory",
    "opened_file_in_ide",
    "output_style",
    "output_token_usage",
    "pdf_reference",
    "plan_file_reference",
    "plan_mode",
    "plan_mode_exit",
    "plan_mode_reentry",
    "proactivity",
    "read_truncation_notice",
    "sandbox_instructions",
    "artifact_opening_prefetch",
    "environment",
    "model",
    "output_style_instructions",
    "language",
    "session_context",
    "coordinator_context",
    "context_sections",
    "project_doc_reads",
    "date",
    "instructions",
    "prompt_snapshot",
    "prompt_render_point",
    "thinking_stripped",
    "advisor_stripped",
    "thinking_drop",
    "credential_org",
    "projects_thread_ask",
    "deferred_tools_record",
    "bash_output_audience_note",
    "unknown_command_fallback",
    "relevant_memories",
    "selected_lines_in_diff",
    "selected_lines_in_ide",
    "silent_turn_reminder",
    "elapsed_time_reminder",
    "output_limit_note",
    "skill_listing",
    "structured_output",
    "task_reminder",
    "team_context",
    "teammate_shutdown_batch",
    "todo_reminder",
    "token_usage",
    "tool_search_usage_reminder",
    "total_tokens_reminder",
    "batching_reminder",
    "batching_reminder_sent",
    "secondary_reminder",
    "secondary_reminder_sent",
    "ultra_effort_enter",
    "ultra_effort_exit",
    "ultrathink_effort",
    ...[],
    "workflow_keyword_request",
    "workflow_size_guideline_change",
    "remote_session_change",
    "advisor_tool",
  ]),
  Vr = new Set(["inlined_image_paths", "mcp_resource", "project_doc_reads", "structured_output"]);
//@ chunk-0sfjpx19.js:8394-8683 placement
function isTurnOpeningMessage(e) {
  if (e.type === "user")
    return (
      isHumanOrAutoContinuation(e) &&
      e.isCompactSummary !== !0 &&
      (isInterruptMarkerMessage(e) ||
        isSyntheticToolErrorMessage(e) ||
        (e.isMeta === !0 && e.promptSource === void 0))
    );
  if (e.type === "assistant") return isNoResponseRequestedMessage(e);
  return (
    e.type === "system" ||
    e.type === "progress" ||
    (e.type === "attachment" && !Vr.has(e.attachment.type) && Pn.has(e.attachment.type))
  );
}
//@ chunk-0sfjpx19.js:8683-8769 placement
function Fn(e) {
  return e.type === "attachment" && e.attachment.type === "session_cron_carry";
}
//@ chunk-0sfjpx19.js:8769-8804 placement
function Nn(e) {
  return Fn(e) || isTurnOpeningMessage(e);
}
//@ chunk-0sfjpx19.js:8804-8985 placement
function isAllInvisibleMeta(e) {
  return e.every((n) => {
    if (!Nn(n) || isEmptyThreadAskMarker(n)) return !1;
    if (n.type !== "user" || isToolResultOnlyUserMessage(n)) return !0;
    let r = classifyMessageFrame(n);
    return r.frame === "invisible" && r.reason === "meta-without-provenance";
  });
}
//@ chunk-0sfjpx19.js:8985-9087 placement
function isHumanOrAutoContinuation(e) {
  return e.origin === void 0 || e.origin.kind === "human" || e.origin.kind === "auto-continuation";
}
/**
 * 用户消息是否就是"[Request interrupted by user]"（或 for tool use）中断标记。
 */
//@ chunk-0sfjpx19.js:9087-9332 placement = extractErrorTypeFromData (1)
function isInterruptMarkerMessage(message) {
  let content = message.message.content;
  if (typeof content === "string")
    return content === INTERRUPT_MESSAGE || content === INTERRUPT_MESSAGE_FOR_TOOL_USE;
  if (!Array.isArray(content) || content.length !== 1) return !1;
  let r = content[0];
  return (
    typeof r === "object" &&
    r !== null &&
    "type" in r &&
    r.type === "text" &&
    "text" in r &&
    (r.text === INTERRUPT_MESSAGE || r.text === INTERRUPT_MESSAGE_FOR_TOOL_USE)
  );
}
/**
 * 用户消息是否全部是框架合成的 is_error tool_result（中断、拒绝等固定文本）。
 */
//@ chunk-0sfjpx19.js:9332-9627 placement
function isSyntheticToolErrorMessage(e) {
  let content = e.message.content;
  if (!Array.isArray(content) || content.length === 0) return !1;
  return content.every((r) => {
    if (
      typeof r !== "object" ||
      r === null ||
      !("type" in r) ||
      r.type !== "tool_result" ||
      !("is_error" in r) ||
      r.is_error !== !0 ||
      !("content" in r) ||
      typeof r.content !== "string"
    )
      return !1;
    return SYNTHETIC_TOOL_ERROR_TEXTS.has(r.content);
  });
}
//@ chunk-0sfjpx19.js:9627-9727 placement
var SYNTHETIC_TOOL_ERROR_TEXTS = new Set([
  INTERRUPT_MESSAGE,
  AGENT_CALL_PROCESS_STOPPED,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  CANCEL_MESSAGE,
  CANCEL_MESSAGE + MEMORY_CORRECTION_HINT,
  TOOL_CALL_SKIPPED_FOR_DELIVERY,
  TOOL_CALL_SKIPPED_FOR_DELIVERY + MEMORY_CORRECTION_HINT,
  TOOL_CALL_SKIPPED_BY_SIBLING_DENIAL,
  TOOL_CALL_SKIPPED_BY_SIBLING_DENIAL + MEMORY_CORRECTION_HINT,
  APPROVAL_EXPIRED_MESSAGE,
  APPROVAL_UNANSWERED_MESSAGE,
  REJECT_MESSAGE,
  REJECT_MESSAGE + MEMORY_CORRECTION_HINT,
  REJECT_MESSAGE_AFTER_RUN,
  REJECT_MESSAGE_AFTER_RUN + MEMORY_CORRECTION_HINT,
]);
/**
 * 是否是合成（<synthetic> 模型）的 "No response requested." assistant 消息。
 */
//@ chunk-0sfjpx19.js:9727-9940 placement = extractErrorTypeFromData (1)
function isNoResponseRequestedMessage(message) {
  if (message.message.model !== SYNTHETIC_MODEL) return !1;
  let content = message.message.content;
  return (
    Array.isArray(content) &&
    content.length === 1 &&
    typeof content[0] === "object" &&
    content[0] !== null &&
    "type" in content[0] &&
    content[0].type === "text" &&
    "text" in content[0] &&
    content[0].text === NO_RESPONSE_REQUESTED
  );
}
//@ chunk-0sfjpx19.js:9940-10096 placement = countToolCallsSince (1)
function countToolCallsSince(e) {
  return (
    e.type === "assistant" &&
    Array.isArray(e.message.content) &&
    e.message.content.some(
      (block) =>
        block?.type === "tool_use" &&
        (block.name === CRON_CREATE_TOOL_NAME || block.name === CRON_DELETE_TOOL_NAME),
    )
  );
}
//@ chunk-0sfjpx19.js:10096-10226 placement
function describeTranscriptEntry(e, n) {
  let r = e.type === "attachment" ? ` (${e.attachment.type})` : "";
  return `entry ${n} [type=${e.type}${r}, uuid=${e.uuid}]`;
}
/**
 * 校验声明的轮次 id（UUID）并找出该轮在转录中的范围，用于丢弃最后一轮后恢复。
 */
//@ chunk-0sfjpx19.js:10226-12029 placement
function findDeclaredTurnRange(e, n) {
  if (Vt(n) === null) return { ok: !1, reason: `declared turn id is not a UUID: ${n}` };
  let r = 0,
    s;
  for (; r < e.length; r++) {
    let _ = e[r];
    if (!Nn(_)) break;
    if (Fn(_)) s = _;
  }
  let h = () => ({ ok: !0, ...(s && { keep: s }) });
  if (r === e.length) return h();
  let y = e[r];
  if (!(y.type === "user" && y.uuid === n))
    return {
      ok: !1,
      reason: `range does not start with the declared turn prompt; first discarded ${describeTranscriptEntry(y, r)}`,
    };
  if (
    y.isMeta === !0 ||
    y.isCompactSummary === !0 ||
    y.stackedExpansion === !0 ||
    isInterruptionOnlyMessage(y) ||
    isToolResultOnlyUserMessage(y)
  )
    return {
      ok: !1,
      reason: `declared turn id names a non-prompt user entry; ${describeTranscriptEntry(y, r)}`,
    };
  if (!isHumanOrAutoContinuation(y))
    return {
      ok: !1,
      reason: `declared turn id names an externally-sourced entry; ${describeTranscriptEntry(y, r)}`,
    };
  if (hasPollEventsAttachmentSince(e, r))
    return { ok: !1, reason: "range contains a delivered poll-event record" };
  for (let _ = r + 1; _ < e.length; _++) {
    let b = e[_];
    switch (b.type) {
      case "assistant":
        continue;
      case "progress":
      case "system":
        continue;
      case "attachment":
        if (b.attachment.type === "queued_command")
          return {
            ok: !1,
            reason: `range contains absorbed queued content; ${describeTranscriptEntry(b, _)}`,
          };
        if (b.attachment.type === "session_cron_carry" && !e.slice(r + 1, _).some(countToolCallsSince)) {
          s = b;
          continue;
        }
        if (!Pn.has(b.attachment.type))
          return {
            ok: !1,
            reason: `range contains a non-furniture attachment; ${describeTranscriptEntry(b, _)}`,
          };
        continue;
      case "user": {
        if (b.uuid === n) continue;
        if (b.isCompactSummary === !0)
          return { ok: !1, reason: `range contains a compaction summary; ${describeTranscriptEntry(b, _)}` };
        if (!isHumanOrAutoContinuation(b))
          return {
            ok: !1,
            reason: `range contains an externally-sourced user entry; ${describeTranscriptEntry(b, _)}`,
          };
        if (b.stackedExpansion === !0) continue;
        if (isInterruptMarkerMessage(b)) continue;
        if (isToolResultOnlyUserMessage(b)) continue;
        if (b.isMeta === !0 && b.promptSource !== void 0)
          return {
            ok: !1,
            reason: `range contains a system-injected turn prompt; ${describeTranscriptEntry(b, _)}`,
          };
        if (b.isMeta === !0) continue;
        return {
          ok: !1,
          reason: `range contains a user entry not attributable to the declared turn; ${describeTranscriptEntry(b, _)}`,
        };
      }
      default:
        return { ok: !1, reason: `range contains an unrecognized entry; ${describeTranscriptEntry(b, _)}` };
    }
  }
  return h();
}
//@ chunk-0sfjpx19.js:12029-12041 placement
var $n = 2000;
/**
 * 估算恢复后上下文用量：取最近一次 API 用量的输入 token（含缓存创建/读取），结合模型的自动压缩窗口，以首条压缩边界（或传入的重置边界）为起点。
 */
//@ chunk-0sfjpx19.js:12041-12349 placement
function estimateResumeContextUsage({
  messages: messages,
  model: model,
  autoCompactWindow: autoCompactWindow,
  resetBoundary: resetBoundary,
}) {
  let h = Us(messages),
    y = getLastApiUsage(h),
    _ = y ? y.input_tokens + y.cache_creation_input_tokens + y.cache_read_input_tokens : 0,
    { window: b } = getAutoCompactWindow(
      getModelContextInfo(model),
      isAutoCompactEnabled() ? autoCompactWindow : void 0,
    ),
    k = h[0],
    w = k !== void 0 && isCompactBoundaryMessage(k) ? k.uuid : resetBoundary;
  return { used_tokens: _, max_tokens: b, ...(w !== void 0 && { after_boundary: w }) };
}
/**
 * 轮末上下文用量估计的上报器：实测优先，估计超时则标记。
 */
//@ chunk-0sfjpx19.js:12349-14936 placement
class ContextUsageEstimateReporter {
  write;
  written;
  estimatedAt;
  generation = 0;
  inFlight;
  constructor(e) {
    this.write = e;
  }
  report(e) {
    try {
      let n = e(),
        r = estimateResumeContextUsage(n);
      if (r.used_tokens > 0) this.writeMeasured(r);
      else if (
        this.inFlight?.generation === this.generation ||
        (this.estimatedAt !== void 0 && ei(n.messages, this.estimatedAt))
      )
        this.writeWindow(r.max_tokens);
      else if (this.written === void 0 && r.after_boundary !== void 0);
      else ((this.estimatedAt = void 0), this.writeIfChanged(r));
    } catch (error) {
      logError(error);
    }
  }
  reportAtTurnEnd(e, n) {
    try {
      let r = e(),
        s = estimateResumeContextUsage(r);
      if (s.used_tokens > 0) {
        this.writeMeasured(s);
        return;
      }
      let h = Zr(r.messages),
        after_boundary = s.after_boundary,
        _ = `${h.length}:${h.lastUuid ?? ""}:${after_boundary ?? ""}`;
      if (
        this.estimatedAt?.length === h.length &&
        this.estimatedAt.lastUuid === h.lastUuid &&
        this.written?.after_boundary === after_boundary
      ) {
        (this.generation++, this.writeWindow(s.max_tokens));
        return;
      }
      if (this.inFlight?.key === _ && this.inFlight.generation === this.generation)
        return this.inFlight.settled;
      let b = ++this.generation;
      if (this.estimatedAt === void 0) this.writeIfChanged(s);
      let k = Promise.resolve()
          .then(n)
          .then(
            (S) => this.applyEstimate(S, e, h, b, s.after_boundary),
            (S) => {
              if (isAbortError(S) || isFsInaccessible(S) || isFsInaccessibleCode(storageCauseErrnoCode(S)))
                logForDebugging(
                  `context usage estimate at turn end failed; context_usage keeps the last estimate, or reads 0, until a response reports: ${errorMessage(S)}`,
                  { level: "error" },
                );
              else logError(S);
              this.applyEstimate(void 0, e, h, b, s.after_boundary);
            },
          ),
        w = {
          key: _,
          generation: b,
          settled: withDeadline(
            k.then(() => !0),
            $n,
          ).then((S) => {
            if (S === void 0)
              (logForDebugging(
                `context usage estimate at turn end is taking over ${$n} ms; the turn end stops waiting, and the estimate is still written when it finishes unless a newer figure is reported first`,
              ),
                this.applyEstimate(void 0, e, h, b, s.after_boundary));
          }),
        };
      return (
        (this.inFlight = w),
        k.then(() => {
          if (this.inFlight === w) this.inFlight = void 0;
        }),
        w.settled
      );
    } catch (error) {
      logError(error);
    }
  }
  resend() {
    if (this.written !== void 0) this.send(this.written);
  }
  applyEstimate(e, n, r, s, h) {
    try {
      if (s !== this.generation) return;
      let y = estimateResumeContextUsage(n());
      if (y.used_tokens > 0) this.writeMeasured(y);
      else if (e !== void 0 && y.after_boundary === h)
        ((this.estimatedAt = r), this.writeIfChanged({ ...y, used_tokens: e.totalTokens }));
      else if (this.estimatedAt !== void 0) this.writeWindow(y.max_tokens);
      else this.writeIfChanged(y);
    } catch (error) {
      logError(error);
    }
  }
  writeMeasured(e) {
    (this.generation++, (this.estimatedAt = void 0), this.writeIfChanged(e));
  }
  writeWindow(e) {
    if (this.written !== void 0) this.writeIfChanged({ ...this.written, max_tokens: e });
  }
  writeIfChanged(e) {
    if (
      this.written !== void 0 &&
      this.written.used_tokens === e.used_tokens &&
      this.written.max_tokens === e.max_tokens &&
      this.written.after_boundary === e.after_boundary
    )
      return;
    ((this.written = e), this.send(e));
  }
  send(e) {
    this.write(
      e.after_boundary !== void 0 && (isCompactPairWithheldFromRemote() || isBridgeBindingForeign())
        ? { used_tokens: e.used_tokens, max_tokens: e.max_tokens }
        : e,
    );
  }
}
/**
 * 创建上下文用量上报器：估算后通过 notifyMetadataChanged 上报 context_usage，可在任意时刻或轮次结束时上报。
 */
//@ chunk-0sfjpx19.js:14936-15092 placement
function createContextUsageReporter(e, n, r) {
  let s = new ContextUsageEstimateReporter((h) => e.notifyMetadataChanged({ context_usage: h }));
  return { report: () => s.report(n), reportAtTurnEnd: () => s.reportAtTurnEnd(n, r) };
}
//@ chunk-0sfjpx19.js:15092-15155 placement
function Zr(e) {
  return { length: e.length, lastUuid: e.at(-1)?.uuid };
}
//@ chunk-0sfjpx19.js:15155-15251 placement
function ei(e, n) {
  return e.length >= n.length && (n.length === 0 || e.at(n.length - 1)?.uuid === n.lastUuid);
}
//@ chunk-0sfjpx19.js:15251-15753 placement
function logBridgeAttachmentsMissing(e, n, r) {
  if (!r?.length) return;
  let s = new Map();
  for (let _ of r) if (!s.has(_.file_uuid)) s.set(_.file_uuid, _);
  let h = { sent_count: n, missing_count: s.size };
  if (!e) {
    Ct(() => logFeatureSad("bridge_attachment_missing_event", "no_uuid", h));
    return;
  }
  let y = Ct(() =>
    enqueueTaskNotification_2({
      type: "system",
      subtype: "file_attachments_missing",
      message_uuid: e,
      sent_count: n,
      missing: Array.from(s.values(), ({ file_uuid: file_uuid, reason: reason }) => ({
        file_uuid: file_uuid,
        reason: reason,
      })),
    }),
  );
  Ct(() =>
    y
      ? logFeatureOk("bridge_attachment_missing_event", h)
      : logFeatureBad("bridge_attachment_missing_event", "threw", h),
  );
}
//@ chunk-0sfjpx19.js:15753-15811 placement
function Ct(e) {
  try {
    return (e(), !0);
  } catch (error) {
    return (logError(error), !1);
  }
}

export {
  isInterruptMarkerMessage,
  ContextUsageEstimateReporter,
  ien,
  createContextUsageReporter,
  logBridgeAttachmentsMissing,
  findDeclaredTurnRange,
  RESUME_DROPS_TURN_REJECTED_PREFIX,
  isAllInvisibleMeta,
};
