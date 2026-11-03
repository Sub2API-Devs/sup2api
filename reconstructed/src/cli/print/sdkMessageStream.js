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
import { randomUUID } from "crypto";
import { getSessionId } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import {
  queuedCommandToSdkUser,
  toSDKToolHostResultMessage,
  userMessageToSdkReplay,
  localCommandOutputToSDKAssistantMessage,
  toSDKCompactMetadata,
  informationalSystemMessage as informationalSystemMessage_2,
} from "../../utils/messages/mappers.js";
import { parseQueuedCommandAttachment, localCommandOutputOf } from "../../utils/messages.js";
import {
  isSessionTaskNotificationOrigin,
  isBareTaskNotificationOrigin,
} from "../../utils/backgroundSessionResume.js";
import { toStreamEventMessage } from "./userPromptFiles.js";
import { LOCAL_COMMAND_STDOUT, LOCAL_COMMAND_STDERR } from "../../constants/xml.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { normalizeMessage } from "../../utils/queryHelpers.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAbortError } from "../../utils/errors.js";

//@ chunk-tyg7f3ek.js:244088-244160 placement
function apiMessageIdField(e) {
  return typeof e === "string" && e !== ""
    ? {
        api_message_id: e,
      }
    : {};
}
//@ chunk-tyg7f3ek.js:244305-244556 placement
function streamMessageDelta(e, stopReason, stopSequence, usage, h) {
  return [
    {
      type: "stream_event",
      event: {
        type: "message_delta",
        context_management: null,
        delta: {
          container: null,
          stop_details: null,
          stop_reason: stopReason,
          stop_sequence: stopSequence,
        },
        usage,
      },
      session_id: getSessionId(),
      parent_tool_use_id: null,
      uuid: randomUUID(),
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
    event: {
      type: "message_stop",
    },
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: randomUUID(),
    ...r,
    ...(r.api_message_id !== undefined &&
      n !== undefined &&
      Number.isSafeInteger(n) && {
        abandoned_blocks: {
          api_message_id: r.api_message_id,
          from_block_index: n,
        },
      }),
  };
}
//@ chunk-tyg7f3ek.js:244834-245203 placement
function usageForStream(usage) {
  return {
    output_tokens_details: usage.output_tokens_details ?? null,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? null,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? null,
    input_tokens: usage.input_tokens ?? null,
    iterations: usage.iterations ?? null,
    output_tokens: usage.output_tokens,
    server_tool_use: usage.server_tool_use ?? null,
    fallback_credit: usage.fallback_credit ?? null,
  };
}
//@ chunk-tyg7f3ek.js:245203-245327 placement
function passModelFallback(e) {
  if (e.type === "system" && (e.subtype === "model_fallback" || e.subtype === "model_consent_fallback"))
    return e;
  return e;
}
//@ chunk-tyg7f3ek.js:245327-247564 placement
/**
 * 把内部消息（assistant/user/system/attachment/progress 等）转换为 SDK stream-json 消息序列。
 */
function* toSdkMessages(e, n, r) {
  let { replayUserMessages, includePartialMessages } = r;
  switch (e.type) {
    case "assistant":
      if (!("parent_tool_use_id" in e)) yield* normalizeMessageWithSessionId(e, n());
      return;
    case "user":
    case "progress":
      yield* normalizeMessageWithSessionId(e, n());
      return;
    case "system":
      switch (e.subtype) {
        case "status":
          if (e.status !== "requesting" || includePartialMessages) yield e;
          return;
        case "model_refusal_fallback": {
          let { provisional, ...S } = e;
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
            y = {
              ...informationalSystemMessage(e),
              session_id: e.session_id,
            };
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
        if (y)
          yield {
            ...y,
            session_id: e.session_id,
          };
        return;
      }
      if (r.replayOwnTaskNotifications && e.attachment.type === "queued_command") {
        let y;
        try {
          let origin =
            e.attachment.commandMode === "task-notification"
              ? parseQueuedCommandAttachment(e.attachment, e.uuid)?.origin
              : undefined;
          if (isSessionTaskNotificationOrigin(origin) && isBareTaskNotificationOrigin(origin))
            y = queuedCommandToSdkUser(e.attachment, e);
        } catch (error) {
          logError(error);
        }
        if (y) {
          yield {
            ...y,
            session_id: e.session_id,
          };
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
      let { parent_tool_use_id: parentToolUseId, priority, shouldQuery, timestamp, ...P } = e;
      if (P.subtype === "success" && P.deferred_tool_use !== undefined) {
        let {
          api_error_status: apiErrorStatus,
          api_error_code: apiErrorCode,
          api_error_origin: apiErrorOrigin,
          api_error: apiError,
          structured_output: structuredOutput,
          ...re
        } = P;
        yield {
          ...re,
          is_error: false,
          stop_reason: "tool_deferred",
          result: "",
        };
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
  if (e.type === "user" && typeof e.message.content === "string" && localCommandOutputOf(e) !== undefined)
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
      ) ?? undefined
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
        ...(n.logicalParentUuid !== undefined && {
          logical_parent_uuid: n.logicalParentUuid,
        }),
      };
    if (n.type === "system" && n.subtype === "informational") yield informationalSystemMessage(n);
  }
}
//@ chunk-tyg7f3ek.js:248508-249078 placement
function informationalSystemMessage(e) {
  return {
    type: "system",
    subtype: "informational",
    content: stripAnsi(e.content),
    level: e.level,
    ...(e.toolUseID && {
      tool_use_id: e.toolUseID,
    }),
    ...(e.preventContinuation && {
      prevent_continuation: e.preventContinuation,
    }),
    ...(e.promptSubmitEnding && {
      prompt_submit_outcome: {
        kind: e.promptSubmitEnding.ending.kind,
        prompt_kept: e.promptSubmitEnding.promptKept,
        ...(e.promptSubmitEnding.ending.kind === "no_verdict"
          ? {
              no_verdict_kind: e.promptSubmitEnding.ending.noVerdictKind,
            }
          : e.promptSubmitEnding.ending.reason !== undefined && {
              reason: e.promptSubmitEnding.ending.reason,
            }),
      },
    }),
    uuid: e.uuid,
    session_id: getSessionId(),
  };
}
//@ chunk-tyg7f3ek.js:249078-249371 placement
function preservedAttachmentRows(e, sessionId) {
  try {
    let preservedMessages = e.find(isCompactBoundaryMessage)?.compactMetadata?.preservedMessages;
    let s = new Set(preservedMessages?.allUuids ?? preservedMessages?.uuids ?? []);
    return e.flatMap((h) =>
      h.type === "attachment" && h.attachment.type === "hook_system_message" && !s.has(h.uuid)
        ? [
            {
              ...informationalSystemMessage_2(h.attachment),
              uuid: h.uuid,
              session_id: sessionId,
            },
          ]
        : [],
    );
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-tyg7f3ek.js:249371-249445 placement
function* normalizeMessageWithSessionId(e, n) {
  for (let r of normalizeMessage(e, n))
    yield {
      ...r,
      session_id: e.session_id,
    };
}
//@ chunk-tyg7f3ek.js:249445-249804 placement
function isOrphanedPermissionTurn(e, conversation) {
  let orphanedPermission = e.orphanedPermission;
  let toolUseID = orphanedPermission?.permissionResult?.toolUseID;
  if (orphanedPermission === undefined || toolUseID === undefined) return false;
  let h = new Set([
    toolUseID,
    ...(orphanedPermission.siblings ?? []).map((y) => y.toolUseID),
    ...(orphanedPermission.notSent ?? []).map((y) => y.toolUseID),
  ]);
  return !conversation.some(
    (y) =>
      y.type === "user" &&
      Array.isArray(y.message.content) &&
      y.message.content.some((S) => S.type === "tool_result" && h.has(S.tool_use_id)),
  );
}
//@ chunk-tyg7f3ek.js:249804-250538 placement
function countUnsentBatchMessages({ batch, turnSignal, isStopped, isSentNow, conversation, messageQueue }) {
  let S = new Set();
  let R = 0;
  if (!(!isStopped && (isSentNow || unwrapAbortReason(turnSignal.reason) === "interrupt")))
    return {
      count: R,
      uuids: S,
    };
  let P = batch.members.length;
  try {
    for (let L = 0; L < P; L += 1) {
      let q = batch.members[isSentNow ? L : P - 1 - L];
      if (
        q === undefined ||
        q.origin?.kind === "plugin" ||
        (q.mode === "orphaned-permission" && !isOrphanedPermissionTurn(q, conversation))
      )
        continue;
      if (
        !messageQueue.enqueueReportingAdmission(
          {
            ...q,
            ...(q.priority === "now" && {
              priority: "next",
            }),
            admissionExempt: "resurrected",
            screeningOwed: true,
          },
          {
            ahead: !isSentNow,
          },
        ).admitted
      )
        continue;
      R += 1;
      if (q.uuid !== undefined) S.add(q.uuid);
    }
    logForDebugging(
      `[headless] a prompt check cut for a message to run: ${R} of ${P} member(s) back on the queue`,
    );
  } catch (error) {
    if (isAbortError(error)) logForDebugging(`[headless] putting a cut batch back aborted: ${error}`);
    else logError(error);
  }
  return {
    count: R,
    uuids: S,
  };
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
