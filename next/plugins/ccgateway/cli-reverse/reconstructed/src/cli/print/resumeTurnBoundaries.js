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
import { __export } from "../../../runtime/bun-runtime.js";
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
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { hasPollEventsAttachmentSince } from "../../utils/pollEvents.js";
import {
  messagesSinceCompactBoundary,
  isCompactBoundaryMessage,
} from "../../services/projects/threadRows.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0sfjpx19.js:5974-5985 placement
/**
 * 回合边界模块的导出容器（挂 createTurnEventTail 与 default）。
 */
var TURN_BOUNDARIES_MODULE_EXPORTS = {};
//@ chunk-0sfjpx19.js:5985-6039 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0sfjpx19.js:5985", () => {
  __export(TURN_BOUNDARIES_MODULE_EXPORTS, {
    createTurnEventTail: () => describeDroppedNotes,
    default: () => TURN_BOUNDARIES_MODULE_EXPORTS,
  });
});
//@ chunk-0sfjpx19.js:6039-8394 placement
/**
 * 常量与可截断附件类型集合：--resume-drops-turn 拒绝提示前缀。
 */
var RESUME_DROPS_TURN_REJECTED_PREFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FURNITURE_ATTACHMENT_TYPES;
var NON_FURNITURE_ATTACHMENT_TYPES;
deferInit("chunk-0sfjpx19.js:6039", () => {
  RESUME_DROPS_TURN_REJECTED_PREFIX = "Resume rejected by --resume-drops-turn:";
  FURNITURE_ATTACHMENT_TYPES = new Set([
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
  ]);
  NON_FURNITURE_ATTACHMENT_TYPES = new Set([
    "inlined_image_paths",
    "mcp_resource",
    "project_doc_reads",
    "structured_output",
  ]);
});
//@ chunk-0sfjpx19.js:8394-8683 placement
function isTurnOpeningMessage(message) {
  if (message.type === "user")
    return (
      isHumanOrAutoContinuation(message) &&
      message.isCompactSummary !== true &&
      (isInterruptMarkerMessage(message) ||
        isSyntheticToolErrorMessage(message) ||
        (message.isMeta === true && message.promptSource === undefined))
    );
  if (message.type === "assistant") return isNoResponseRequestedMessage(message);
  return (
    message.type === "system" ||
    message.type === "progress" ||
    (message.type === "attachment" &&
      !NON_FURNITURE_ATTACHMENT_TYPES.has(message.attachment.type) &&
      FURNITURE_ATTACHMENT_TYPES.has(message.attachment.type))
  );
}
//@ chunk-0sfjpx19.js:8683-8769 placement
function isSessionCronCarryAttachment(entry) {
  return entry.type === "attachment" && entry.attachment.type === "session_cron_carry";
}
//@ chunk-0sfjpx19.js:8769-8804 placement
function startsTurnSegment(entry) {
  return isSessionCronCarryAttachment(entry) || isTurnOpeningMessage(entry);
}
//@ chunk-0sfjpx19.js:8804-8985 placement
function isAllInvisibleMeta(entries) {
  return entries.every((entry) => {
    if (!startsTurnSegment(entry) || isEmptyThreadAskMarker(entry)) return false;
    if (entry.type !== "user" || isToolResultOnlyUserMessage(entry)) return true;
    let frame = classifyMessageFrame(entry);
    return frame.frame === "invisible" && frame.reason === "meta-without-provenance";
  });
}
//@ chunk-0sfjpx19.js:8985-9087 placement
function isHumanOrAutoContinuation(entry) {
  return (
    entry.origin === undefined || entry.origin.kind === "human" || entry.origin.kind === "auto-continuation"
  );
}
//@ chunk-0sfjpx19.js:9087-9332 placement (2.1.88 match: extractErrorTypeFromData, 1)
/**
 * 用户消息是否就是"[Request interrupted by user]"（或 for tool use）中断标记。
 */
function isInterruptMarkerMessage(message) {
  let content = message.message.content;
  if (typeof content === "string")
    return content === INTERRUPT_MESSAGE || content === INTERRUPT_MESSAGE_FOR_TOOL_USE;
  if (!Array.isArray(content) || content.length !== 1) return false;
  let block = content[0];
  return (
    typeof block === "object" &&
    block !== null &&
    "type" in block &&
    block.type === "text" &&
    "text" in block &&
    (block.text === INTERRUPT_MESSAGE || block.text === INTERRUPT_MESSAGE_FOR_TOOL_USE)
  );
}
//@ chunk-0sfjpx19.js:9332-9627 placement
/**
 * 用户消息是否全部是框架合成的 is_error tool_result（中断、拒绝等固定文本）。
 */
function isSyntheticToolErrorMessage(message) {
  let content = message.message.content;
  if (!Array.isArray(content) || content.length === 0) return false;
  return content.every((block) => {
    if (
      typeof block !== "object" ||
      block === null ||
      !("type" in block) ||
      block.type !== "tool_result" ||
      !("is_error" in block) ||
      block.is_error !== true ||
      !("content" in block) ||
      typeof block.content !== "string"
    )
      return false;
    return SYNTHETIC_TOOL_ERROR_TEXTS.has(block.content);
  });
}
//@ chunk-0sfjpx19.js:9627-9727 placement
var SYNTHETIC_TOOL_ERROR_TEXTS; // deferred: uses INTERRUPT_MESSAGE (../../utils/messages.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0sfjpx19.js:9627", () => {
  SYNTHETIC_TOOL_ERROR_TEXTS = new Set([
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
});
//@ chunk-0sfjpx19.js:9727-9940 placement (2.1.88 match: extractErrorTypeFromData, 1)
/**
 * 是否是合成（<synthetic> 模型）的 "No response requested." assistant 消息。
 */
function isNoResponseRequestedMessage(message) {
  if (message.message.model !== SYNTHETIC_MODEL) return false;
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
//@ chunk-0sfjpx19.js:9940-10096 placement (2.1.88 match: countToolCallsSince, 1)
function countToolCallsSince(entry) {
  return (
    entry.type === "assistant" &&
    Array.isArray(entry.message.content) &&
    entry.message.content.some(
      (block) =>
        block?.type === "tool_use" &&
        (block.name === CRON_CREATE_TOOL_NAME || block.name === CRON_DELETE_TOOL_NAME),
    )
  );
}
//@ chunk-0sfjpx19.js:10096-10226 placement
function describeTranscriptEntry(entry, index) {
  let attachmentSuffix = entry.type === "attachment" ? ` (${entry.attachment.type})` : "";
  return `entry ${index} [type=${entry.type}${attachmentSuffix}, uuid=${entry.uuid}]`;
}
//@ chunk-0sfjpx19.js:10226-12029 placement
/**
 * 校验声明的轮次 id（UUID）并找出该轮在转录中的范围，用于丢弃最后一轮后恢复。
 */
function findDeclaredTurnRange(messages, resumeDropsTurn) {
  if (normalizeUuidOrNull(resumeDropsTurn) === null)
    return {
      ok: false,
      reason: `declared turn id is not a UUID: ${resumeDropsTurn}`,
    };
  let index = 0;
  let carry;
  for (; index < messages.length; index++) {
    let entry = messages[index];
    if (!startsTurnSegment(entry)) break;
    if (isSessionCronCarryAttachment(entry)) carry = entry;
  }
  let ok = () => ({
    ok: true,
    ...(carry && {
      keep: carry,
    }),
  });
  if (index === messages.length) return ok();
  let entry = messages[index];
  if (!(entry.type === "user" && entry.uuid === resumeDropsTurn))
    return {
      ok: false,
      reason: `range does not start with the declared turn prompt; first discarded ${describeTranscriptEntry(entry, index)}`,
    };
  if (
    entry.isMeta === true ||
    entry.isCompactSummary === true ||
    entry.stackedExpansion === true ||
    isInterruptionOnlyMessage(entry) ||
    isToolResultOnlyUserMessage(entry)
  )
    return {
      ok: false,
      reason: `declared turn id names a non-prompt user entry; ${describeTranscriptEntry(entry, index)}`,
    };
  if (!isHumanOrAutoContinuation(entry))
    return {
      ok: false,
      reason: `declared turn id names an externally-sourced entry; ${describeTranscriptEntry(entry, index)}`,
    };
  if (hasPollEventsAttachmentSince(messages, index))
    return {
      ok: false,
      reason: "range contains a delivered poll-event record",
    };
  for (let j = index + 1; j < messages.length; j++) {
    let message = messages[j];
    switch (message.type) {
      case "assistant":
        continue;
      case "progress":
      case "system":
        continue;
      case "attachment":
        if (message.attachment.type === "queued_command")
          return {
            ok: false,
            reason: `range contains absorbed queued content; ${describeTranscriptEntry(message, j)}`,
          };
        if (
          message.attachment.type === "session_cron_carry" &&
          !messages.slice(index + 1, j).some(countToolCallsSince)
        ) {
          carry = message;
          continue;
        }
        if (!FURNITURE_ATTACHMENT_TYPES.has(message.attachment.type))
          return {
            ok: false,
            reason: `range contains a non-furniture attachment; ${describeTranscriptEntry(message, j)}`,
          };
        continue;
      case "user": {
        if (message.uuid === resumeDropsTurn) continue;
        if (message.isCompactSummary === true)
          return {
            ok: false,
            reason: `range contains a compaction summary; ${describeTranscriptEntry(message, j)}`,
          };
        if (!isHumanOrAutoContinuation(message))
          return {
            ok: false,
            reason: `range contains an externally-sourced user entry; ${describeTranscriptEntry(message, j)}`,
          };
        if (message.stackedExpansion === true) continue;
        if (isInterruptMarkerMessage(message)) continue;
        if (isToolResultOnlyUserMessage(message)) continue;
        if (message.isMeta === true && message.promptSource !== undefined)
          return {
            ok: false,
            reason: `range contains a system-injected turn prompt; ${describeTranscriptEntry(message, j)}`,
          };
        if (message.isMeta === true) continue;
        return {
          ok: false,
          reason: `range contains a user entry not attributable to the declared turn; ${describeTranscriptEntry(message, j)}`,
        };
      }
      default:
        return {
          ok: false,
          reason: `range contains an unrecognized entry; ${describeTranscriptEntry(message, j)}`,
        };
    }
  }
  return ok();
}
//@ chunk-0sfjpx19.js:12029-12041 placement
var CONTEXT_ESTIMATE_WAIT_MS = 2000;
//@ chunk-0sfjpx19.js:12041-12349 placement
/**
 * 估算恢复后上下文用量：取最近一次 API 用量的输入 token（含缓存创建/读取），结合模型的自动压缩窗口，以首条压缩边界（或传入的重置边界）为起点。
 */
function estimateResumeContextUsage({ messages, model, autoCompactWindow, resetBoundary }) {
  let windowMessages = messagesSinceCompactBoundary(messages);
  let lastApiUsage = getLastApiUsage(windowMessages);
  let usedTokens = lastApiUsage
    ? lastApiUsage.input_tokens +
      lastApiUsage.cache_creation_input_tokens +
      lastApiUsage.cache_read_input_tokens
    : 0;
  let { window: contextWindow } = getAutoCompactWindow(
    getModelContextInfo(model),
    isAutoCompactEnabled() ? autoCompactWindow : undefined,
  );
  let first = windowMessages[0];
  let boundaryUuid = first !== undefined && isCompactBoundaryMessage(first) ? first.uuid : resetBoundary;
  return {
    used_tokens: usedTokens,
    max_tokens: contextWindow,
    ...(boundaryUuid !== undefined && {
      after_boundary: boundaryUuid,
    }),
  };
}
//@ chunk-0sfjpx19.js:12349-14936 placement
/**
 * 轮末上下文用量估计的上报器：实测优先，估计超时则标记。
 */
class ContextUsageEstimateReporter {
  write;
  written;
  estimatedAt;
  generation = 0;
  inFlight;
  constructor(write) {
    this.write = write;
  }
  report(readInputs) {
    try {
      let inputs = readInputs();
      let estimate = estimateResumeContextUsage(inputs);
      if (estimate.used_tokens > 0) this.writeMeasured(estimate);
      else if (
        this.inFlight?.generation === this.generation ||
        (this.estimatedAt !== undefined && coversTail(inputs.messages, this.estimatedAt))
      )
        this.writeWindow(estimate.max_tokens);
      else if (this.written === undefined && estimate.after_boundary !== undefined);
      else {
        this.estimatedAt = undefined;
        this.writeIfChanged(estimate);
      }
    } catch (error) {
      logError(error);
    }
  }
  reportAtTurnEnd(readInputs, readTail) {
    try {
      let inputs = readInputs();
      let estimate = estimateResumeContextUsage(inputs);
      if (estimate.used_tokens > 0) {
        this.writeMeasured(estimate);
        return;
      }
      let tail = tailDescriptor(inputs.messages);
      let afterBoundary = estimate.after_boundary;
      let key = `${tail.length}:${tail.lastUuid ?? ""}:${afterBoundary ?? ""}`;
      if (
        this.estimatedAt?.length === tail.length &&
        this.estimatedAt.lastUuid === tail.lastUuid &&
        this.written?.after_boundary === afterBoundary
      ) {
        this.generation++;
        this.writeWindow(estimate.max_tokens);
        return;
      }
      if (this.inFlight?.key === key && this.inFlight.generation === this.generation)
        return this.inFlight.settled;
      let generation = ++this.generation;
      if (this.estimatedAt === undefined) this.writeIfChanged(estimate);
      let estimatePromise = Promise.resolve()
        .then(readTail)
        .then(
          (tailEstimate) =>
            this.applyEstimate(tailEstimate, readInputs, tail, generation, estimate.after_boundary),
          (error) => {
            if (
              isAbortError(error) ||
              isFsInaccessible(error) ||
              isFsInaccessibleCode(storageCauseErrnoCode(error))
            )
              logForDebugging(
                `context usage estimate at turn end failed; context_usage keeps the last estimate, or reads 0, until a response reports: ${errorMessage(error)}`,
                {
                  level: "error",
                },
              );
            else logError(error);
            this.applyEstimate(undefined, readInputs, tail, generation, estimate.after_boundary);
          },
        );
      let inFlight = {
        key,
        generation,
        settled: withDeadline(
          estimatePromise.then(() => true),
          CONTEXT_ESTIMATE_WAIT_MS,
        ).then((finished) => {
          if (finished === undefined) {
            logForDebugging(
              `context usage estimate at turn end is taking over ${CONTEXT_ESTIMATE_WAIT_MS} ms; the turn end stops waiting, and the estimate is still written when it finishes unless a newer figure is reported first`,
            );
            this.applyEstimate(undefined, readInputs, tail, generation, estimate.after_boundary);
          }
        }),
      };
      this.inFlight = inFlight;
      estimatePromise.then(() => {
        if (this.inFlight === inFlight) this.inFlight = undefined;
      });
      return inFlight.settled;
    } catch (error) {
      logError(error);
    }
  }
  resend() {
    if (this.written !== undefined) this.send(this.written);
  }
  applyEstimate(estimate, readInputs, estimatedAt, generation, boundary) {
    try {
      if (generation !== this.generation) return;
      let resumeEstimate = estimateResumeContextUsage(readInputs());
      if (resumeEstimate.used_tokens > 0) this.writeMeasured(resumeEstimate);
      else if (estimate !== undefined && resumeEstimate.after_boundary === boundary) {
        this.estimatedAt = estimatedAt;
        this.writeIfChanged({
          ...resumeEstimate,
          used_tokens: estimate.totalTokens,
        });
      } else if (this.estimatedAt !== undefined) this.writeWindow(resumeEstimate.max_tokens);
      else this.writeIfChanged(resumeEstimate);
    } catch (error) {
      logError(error);
    }
  }
  writeMeasured(usage) {
    this.generation++;
    this.estimatedAt = undefined;
    this.writeIfChanged(usage);
  }
  writeWindow(maxTokens) {
    if (this.written !== undefined)
      this.writeIfChanged({
        ...this.written,
        max_tokens: maxTokens,
      });
  }
  writeIfChanged(usage) {
    if (
      this.written !== undefined &&
      this.written.used_tokens === usage.used_tokens &&
      this.written.max_tokens === usage.max_tokens &&
      this.written.after_boundary === usage.after_boundary
    )
      return;
    this.written = usage;
    this.send(usage);
  }
  send(usage) {
    this.write(
      usage.after_boundary !== undefined && (isCompactPairWithheldFromRemote() || isBridgeBindingForeign())
        ? {
            used_tokens: usage.used_tokens,
            max_tokens: usage.max_tokens,
          }
        : usage,
    );
  }
}
//@ chunk-0sfjpx19.js:14936-15092 placement
/**
 * 创建上下文用量上报器：估算后通过 notifyMetadataChanged 上报 context_usage，可在任意时刻或轮次结束时上报。
 */
function createContextUsageReporter(sessionState, readInputs, readTail) {
  let reporter = new ContextUsageEstimateReporter((contextUsage) =>
    sessionState.notifyMetadataChanged({
      context_usage: contextUsage,
    }),
  );
  return {
    report: () => reporter.report(readInputs),
    reportAtTurnEnd: () => reporter.reportAtTurnEnd(readInputs, readTail),
  };
}
//@ chunk-0sfjpx19.js:15092-15155 placement
function tailDescriptor(messages) {
  return {
    length: messages.length,
    lastUuid: messages.at(-1)?.uuid,
  };
}
//@ chunk-0sfjpx19.js:15155-15251 placement
function coversTail(messages, estimatedAt) {
  return (
    messages.length >= estimatedAt.length &&
    (estimatedAt.length === 0 || messages.at(estimatedAt.length - 1)?.uuid === estimatedAt.lastUuid)
  );
}
//@ chunk-0sfjpx19.js:15251-15753 placement
function logBridgeAttachmentsMissing(messageUuid, sentCount, missingFiles) {
  if (!missingFiles?.length) return;
  let byUuid = new Map();
  for (let file of missingFiles) if (!byUuid.has(file.file_uuid)) byUuid.set(file.file_uuid, file);
  let fields = {
    sent_count: sentCount,
    missing_count: byUuid.size,
  };
  if (!messageUuid) {
    runAndLogFailure(() => logFeatureSad("bridge_attachment_missing_event", "no_uuid", fields));
    return;
  }
  let queued = runAndLogFailure(() =>
    enqueueTaskNotification_2({
      type: "system",
      subtype: "file_attachments_missing",
      message_uuid: messageUuid,
      sent_count: sentCount,
      missing: Array.from(byUuid.values(), ({ file_uuid: fileUuid, reason }) => ({
        file_uuid: fileUuid,
        reason,
      })),
    }),
  );
  runAndLogFailure(() =>
    queued
      ? logFeatureOk("bridge_attachment_missing_event", fields)
      : logFeatureBad("bridge_attachment_missing_event", "threw", fields),
  );
}
//@ chunk-0sfjpx19.js:15753-15811 placement
function runAndLogFailure(fn) {
  try {
    fn();
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}
export {
  isInterruptMarkerMessage,
  ContextUsageEstimateReporter,
  TURN_BOUNDARIES_MODULE_EXPORTS,
  createContextUsageReporter,
  logBridgeAttachmentsMissing,
  findDeclaredTurnRange,
  RESUME_DROPS_TURN_REJECTED_PREFIX,
  isAllInvisibleMeta,
};
