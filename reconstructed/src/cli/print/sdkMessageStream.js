/**
 * cli/print/sdkMessageStream.ts
 *
 * 2.1.316 新增：内部消息转换为 SDK 消息流与重放
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (14)
 * attribution: placement 14
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import { getSessionId } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import {
  queuedCommandToSdkUser,
  toSDKToolHostResultMessage,
  userMessageToSdkReplay,
  localCommandOutputToSDKAssistantMessage,
  toSDKCompactMetadata,
  mLr,
} from "../../utils/messages/mappers.js";
import { parseQueuedCommandAttachment, btt } from "../../utils/messages.js";
import { zfe, isBareTaskNotificationOrigin } from "../../utils/backgroundSessionResume.js";
import { toStreamEventMessage } from "./userPromptFiles.js";
import { LOCAL_COMMAND_STDOUT, LOCAL_COMMAND_STDERR } from "../../constants/xml.js";
import { Yn } from "../../utils/stripAnsi.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { normalizeMessage } from "../../utils/queryHelpers.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAbortError } from "../../utils/errors.js";

//@ chunk-tyg7f3ek.js:244088-244160 placement
function apiMessageIdField(e) {
  return typeof e === "string" && e !== "" ? { api_message_id: e } : {};
}
//@ chunk-tyg7f3ek.js:244305-244556 placement
function streamMessageDelta(e, n, r, s, h) {
  return [
    {
      type: "stream_event",
      event: {
        type: "message_delta",
        context_management: null,
        delta: { container: null, stop_details: null, stop_reason: n, stop_sequence: r },
        usage: s,
      },
      session_id: getSessionId(),
      parent_tool_use_id: null,
      uuid: randomUUID_9(),
      ...apiMessageIdField(e),
    },
    streamMessageStop(e, h),
  ];
}
//@ chunk-tyg7f3ek.js:244556-244834 placement
function streamMessageStop(e, n) {
  let r = apiMessageIdField(e);
  return {
    type: "stream_event",
    event: { type: "message_stop" },
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: randomUUID_9(),
    ...r,
    ...(r.api_message_id !== void 0 &&
      n !== void 0 &&
      Number.isSafeInteger(n) && {
        abandoned_blocks: { api_message_id: r.api_message_id, from_block_index: n },
      }),
  };
}
//@ chunk-tyg7f3ek.js:244834-245203 placement
function usageForStream(e) {
  return {
    output_tokens_details: e.output_tokens_details ?? null,
    cache_creation_input_tokens: e.cache_creation_input_tokens ?? null,
    cache_read_input_tokens: e.cache_read_input_tokens ?? null,
    input_tokens: e.input_tokens ?? null,
    iterations: e.iterations ?? null,
    output_tokens: e.output_tokens,
    server_tool_use: e.server_tool_use ?? null,
    fallback_credit: e.fallback_credit ?? null,
  };
}
//@ chunk-tyg7f3ek.js:245203-245327 placement
function passModelFallback(e) {
  if (e.type === "system" && (e.subtype === "model_fallback" || e.subtype === "model_consent_fallback"))
    return e;
  return e;
}
/**
 * 把内部消息（assistant/user/system/attachment/progress 等）转换为 SDK stream-json 消息序列。
 */
//@ chunk-tyg7f3ek.js:245327-247564 placement
function* toSdkMessages(e, n, r) {
  let { replayUserMessages: replayUserMessages, includePartialMessages: includePartialMessages } = r;
  switch (e.type) {
    case "assistant":
      if (!("parent_tool_use_id" in e)) yield* CP(e, n());
      return;
    case "user":
    case "progress":
      yield* CP(e, n());
      return;
    case "system":
      switch (e.subtype) {
        case "status":
          if (e.status !== "requesting" || includePartialMessages) yield e;
          return;
        case "model_refusal_fallback": {
          let { provisional: provisional, ...S } = e;
          yield S;
          return;
        }
        case "init":
        case "notification":
        case "api_retry":
        case "model_refusal_no_fallback":
        case "memory_recall":
        case "thinking_tokens":
        case "compact_boundary":
          yield e;
          return;
        case "model_fallback":
        case "model_consent_fallback":
          yield e;
          return;
        case "informational": {
          if (!("timestamp" in e)) {
            yield e;
            return;
          }
          let y;
          try {
            y = { ...informationalSystemMessage(e), session_id: e.session_id };
          } catch (error) {
            logError(error);
          }
          if (y) yield y;
          return;
        }
        default:
          return;
      }
    case "tool_use_summary":
      yield e;
      return;
    case "attachment":
      if (replayUserMessages && e.attachment.type === "queued_command") {
        let y = queuedCommandToSdkUser(e.attachment, e);
        if (y) yield { ...y, session_id: e.session_id };
        return;
      }
      if (r.replayOwnTaskNotifications && e.attachment.type === "queued_command") {
        let y;
        try {
          let S =
            e.attachment.commandMode === "task-notification"
              ? parseQueuedCommandAttachment(e.attachment, e.uuid)?.origin
              : void 0;
          if (zfe(S) && isBareTaskNotificationOrigin(S)) y = queuedCommandToSdkUser(e.attachment, e);
        } catch (error) {
          logError(error);
        }
        if (y) {
          yield { ...y, session_id: e.session_id };
          return;
        }
      }
      if (e.attachment.type === "tool_host_result_lines") {
        yield toSDKToolHostResultMessage(e.attachment, e.uuid, e.session_id);
        return;
      }
      yield* preservedAttachmentRows([e], e.session_id);
      return;
    case "result": {
      let {
        parent_tool_use_id: parent_tool_use_id,
        priority: priority,
        shouldQuery: shouldQuery,
        timestamp: timestamp,
        ...P
      } = e;
      if (P.subtype === "success" && P.deferred_tool_use !== void 0) {
        let {
          api_error_status: api_error_status,
          api_error_code: api_error_code,
          api_error_origin: api_error_origin,
          api_error: api_error,
          structured_output: structured_output,
          ...re
        } = P;
        yield { ...re, is_error: !1, stop_reason: "tool_deferred", result: "" };
        return;
      }
      yield P;
      return;
    }
    case "stream_event":
      if (includePartialMessages) yield toStreamEventMessage(e, e);
      return;
    case "tombstone":
    case "stream_request_start":
    case "tool_progress":
    case "command_lifecycle":
    case "auth_status":
    case "prompt_suggestion":
    case "rate_limit_event":
    case "sdk_status":
    case "compact_progress":
    case "stream_mode":
    case "response_length":
    case "set_expanded_view":
    case "post_turn_summary":
    case "active_goal":
    case "set_in_progress_tool_use_ids":
    case "conversation_reset":
    case "hint_clears":
    case "api_metrics":
    case "os_notification":
    case "open_message_selector":
    case "apply_flag_settings":
    case "refusal_continuation":
    case "query_model_change":
      return;
    default:
  }
}
//@ chunk-tyg7f3ek.js:247564-247942 placement
function systemMessageToSdk(e) {
  if (e.type === "user" && typeof e.message.content === "string" && btt(e) !== void 0)
    return userMessageToSdkReplay(e, e.message.content);
  if (
    e.type === "system" &&
    e.subtype === "local_command" &&
    typeof e.content === "string" &&
    (e.content.includes(`<${LOCAL_COMMAND_STDOUT}>`) || e.content.includes(`<${LOCAL_COMMAND_STDERR}>`))
  )
    return (
      localCommandOutputToSDKAssistantMessage(
        e.content,
        e.uuid,
        e.timestamp,
        e.contextUsage,
        e.commandRun,
        e.usageReport,
        e.commandOutcome,
      ) ?? void 0
    );
  return;
}
//@ chunk-tyg7f3ek.js:247942-248029 placement
function* systemMessagesToSdk(e) {
  for (let n of e) {
    if (n.type !== "system") continue;
    let r = systemMessageToSdk(n);
    if (r) yield r;
  }
}
//@ chunk-tyg7f3ek.js:248029-248508 placement
function* replayMessagesToSdk(e) {
  for (let n of e) {
    let r = systemMessageToSdk(n);
    if (r) {
      yield r;
      continue;
    }
    if (n.type === "user" && typeof n.message.content === "string" && n.isCompactSummary)
      yield userMessageToSdkReplay(n, n.message.content);
    if (n.type === "system" && n.subtype === "compact_boundary")
      yield {
        type: "system",
        subtype: "compact_boundary",
        session_id: getSessionId(),
        uuid: n.uuid,
        compact_metadata: toSDKCompactMetadata(n.compactMetadata),
        ...(n.logicalParentUuid !== void 0 && { logical_parent_uuid: n.logicalParentUuid }),
      };
    if (n.type === "system" && n.subtype === "informational") yield informationalSystemMessage(n);
  }
}
//@ chunk-tyg7f3ek.js:248508-249078 placement
function informationalSystemMessage(e) {
  return {
    type: "system",
    subtype: "informational",
    content: Yn(e.content),
    level: e.level,
    ...(e.toolUseID && { tool_use_id: e.toolUseID }),
    ...(e.preventContinuation && { prevent_continuation: e.preventContinuation }),
    ...(e.promptSubmitEnding && {
      prompt_submit_outcome: {
        kind: e.promptSubmitEnding.ending.kind,
        prompt_kept: e.promptSubmitEnding.promptKept,
        ...(e.promptSubmitEnding.ending.kind === "no_verdict"
          ? { no_verdict_kind: e.promptSubmitEnding.ending.noVerdictKind }
          : e.promptSubmitEnding.ending.reason !== void 0 && { reason: e.promptSubmitEnding.ending.reason }),
      },
    }),
    uuid: e.uuid,
    session_id: getSessionId(),
  };
}
//@ chunk-tyg7f3ek.js:249078-249371 placement
function preservedAttachmentRows(e, n) {
  try {
    let r = e.find(isCompactBoundaryMessage)?.compactMetadata?.preservedMessages,
      s = new Set(r?.allUuids ?? r?.uuids ?? []);
    return e.flatMap((h) =>
      h.type === "attachment" && h.attachment.type === "hook_system_message" && !s.has(h.uuid)
        ? [{ ...mLr(h.attachment), uuid: h.uuid, session_id: n }]
        : [],
    );
  } catch (error) {
    return (logError(error), []);
  }
}
//@ chunk-tyg7f3ek.js:249371-249445 placement
function* CP(e, n) {
  for (let r of normalizeMessage(e, n)) yield { ...r, session_id: e.session_id };
}
//@ chunk-tyg7f3ek.js:249445-249804 placement
function isOrphanedPermissionTurn(e, n) {
  let orphanedPermission = e.orphanedPermission,
    s = orphanedPermission?.permissionResult?.toolUseID;
  if (orphanedPermission === void 0 || s === void 0) return !1;
  let h = new Set([
    s,
    ...(orphanedPermission.siblings ?? []).map((y) => y.toolUseID),
    ...(orphanedPermission.notSent ?? []).map((y) => y.toolUseID),
  ]);
  return !n.some(
    (y) =>
      y.type === "user" &&
      Array.isArray(y.message.content) &&
      y.message.content.some((S) => S.type === "tool_result" && h.has(S.tool_use_id)),
  );
}
//@ chunk-tyg7f3ek.js:249804-250538 placement
function countUnsentBatchMessages({
  batch: batch,
  turnSignal: turnSignal,
  isStopped: isStopped,
  isSentNow: isSentNow,
  conversation: conversation,
  messageQueue: messageQueue,
}) {
  let S = new Set(),
    R = 0;
  if (!(!isStopped && (isSentNow || unwrapAbortReason(turnSignal.reason) === "interrupt")))
    return { count: R, uuids: S };
  let P = batch.members.length;
  try {
    for (let L = 0; L < P; L += 1) {
      let q = batch.members[isSentNow ? L : P - 1 - L];
      if (
        q === void 0 ||
        q.origin?.kind === "plugin" ||
        (q.mode === "orphaned-permission" && !isOrphanedPermissionTurn(q, conversation))
      )
        continue;
      if (
        !messageQueue.enqueueReportingAdmission(
          {
            ...q,
            ...(q.priority === "now" && { priority: "next" }),
            admissionExempt: "resurrected",
            screeningOwed: !0,
          },
          { ahead: !isSentNow },
        ).admitted
      )
        continue;
      if (((R += 1), q.uuid !== void 0)) S.add(q.uuid);
    }
    logForDebugging(
      `[headless] a prompt check cut for a message to run: ${R} of ${P} member(s) back on the queue`,
    );
  } catch (error) {
    isAbortError(error)
      ? logForDebugging(`[headless] putting a cut batch back aborted: ${error}`)
      : logError(error);
  }
  return { count: R, uuids: S };
}

export {
  apiMessageIdField,
  informationalSystemMessage,
  preservedAttachmentRows,
  replayMessagesToSdk,
  systemMessagesToSdk,
  toSdkMessages,
  passModelFallback,
  countUnsentBatchMessages,
  streamMessageDelta,
  usageForStream,
  streamMessageStop,
};
