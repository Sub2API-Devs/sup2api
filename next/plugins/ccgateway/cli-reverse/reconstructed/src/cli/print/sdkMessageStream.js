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
function apiMessageIdField(messageId) {
  return typeof messageId === "string" && messageId !== ""
    ? {
        api_message_id: messageId,
      }
    : {};
}
//@ chunk-tyg7f3ek.js:244305-244556 placement
function streamMessageDelta(messageId, stopReason, stopSequence, usage, fromBlockIndex) {
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
      ...apiMessageIdField(messageId),
    },
    streamMessageStop(messageId, fromBlockIndex),
  ];
}
//@ chunk-tyg7f3ek.js:244556-244834 placement
function streamMessageStop(messageId, fromBlockIndex) {
  let idField = apiMessageIdField(messageId);
  return {
    type: "stream_event",
    event: {
      type: "message_stop",
    },
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: randomUUID(),
    ...idField,
    ...(idField.api_message_id !== undefined &&
      fromBlockIndex !== undefined &&
      Number.isSafeInteger(fromBlockIndex) && {
        abandoned_blocks: {
          api_message_id: idField.api_message_id,
          from_block_index: fromBlockIndex,
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
function passModelFallback(message) {
  if (
    message.type === "system" &&
    (message.subtype === "model_fallback" || message.subtype === "model_consent_fallback")
  )
    return message;
  return message;
}
//@ chunk-tyg7f3ek.js:245327-247564 placement
/**
 * 把内部消息（assistant/user/system/attachment/progress 等）转换为 SDK stream-json 消息序列。
 */
function* toSdkMessages(message, session, options) {
  let { replayUserMessages, includePartialMessages } = options;
  switch (message.type) {
    case "assistant":
      if (!("parent_tool_use_id" in message)) yield* normalizeMessageWithSessionId(message, session());
      return;
    case "user":
    case "progress":
      yield* normalizeMessageWithSessionId(message, session());
      return;
    case "system":
      switch (message.subtype) {
        case "status":
          if (message.status !== "requesting" || includePartialMessages) yield message;
          return;
        case "model_refusal_fallback": {
          let { provisional, ...rest } = message;
          yield rest;
          return;
        }
        case "init":
        case "notification":
        case "api_retry":
        case "model_refusal_no_fallback":
        case "memory_recall":
        case "thinking_tokens":
        case "compact_boundary":
          yield message;
          return;
        case "model_fallback":
        case "model_consent_fallback":
          yield message;
          return;
        case "informational": {
          if (!("timestamp" in message)) {
            yield message;
            return;
          }
          let sdkUser;
          try {
            sdkUser = {
              ...informationalSystemMessage(message),
              session_id: message.session_id,
            };
          } catch (error) {
            logError(error);
          }
          if (sdkUser) yield sdkUser;
          return;
        }
        default:
          return;
      }
    case "tool_use_summary":
      yield message;
      return;
    case "attachment":
      if (replayUserMessages && message.attachment.type === "queued_command") {
        let sdkUser = queuedCommandToSdkUser(message.attachment, message);
        if (sdkUser)
          yield {
            ...sdkUser,
            session_id: message.session_id,
          };
        return;
      }
      if (options.replayOwnTaskNotifications && message.attachment.type === "queued_command") {
        let sdkAssistant;
        try {
          let origin =
            message.attachment.commandMode === "task-notification"
              ? parseQueuedCommandAttachment(message.attachment, message.uuid)?.origin
              : undefined;
          if (isSessionTaskNotificationOrigin(origin) && isBareTaskNotificationOrigin(origin))
            sdkAssistant = queuedCommandToSdkUser(message.attachment, message);
        } catch (error) {
          logError(error);
        }
        if (sdkAssistant) {
          yield {
            ...sdkAssistant,
            session_id: message.session_id,
          };
          return;
        }
      }
      if (message.attachment.type === "tool_host_result_lines") {
        yield toSDKToolHostResultMessage(message.attachment, message.uuid, message.session_id);
        return;
      }
      yield* preservedAttachmentRows([message], message.session_id);
      return;
    case "result": {
      let {
        parent_tool_use_id: parentToolUseId,
        priority,
        shouldQuery,
        timestamp,
        ...extraMessages
      } = message;
      if (extraMessages.subtype === "success" && extraMessages.deferred_tool_use !== undefined) {
        let {
          api_error_status: apiErrorStatus,
          api_error_code: apiErrorCode,
          api_error_origin: apiErrorOrigin,
          api_error: apiError,
          structured_output: structuredOutput,
          ...trailingMessages
        } = extraMessages;
        yield {
          ...trailingMessages,
          is_error: false,
          stop_reason: "tool_deferred",
          result: "",
        };
        return;
      }
      yield extraMessages;
      return;
    }
    case "stream_event":
      if (includePartialMessages) yield toStreamEventMessage(message, message);
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
function systemMessageToSdk(message) {
  if (
    message.type === "user" &&
    typeof message.message.content === "string" &&
    localCommandOutputOf(message) !== undefined
  )
    return userMessageToSdkReplay(message, message.message.content);
  if (
    message.type === "system" &&
    message.subtype === "local_command" &&
    typeof message.content === "string" &&
    (message.content.includes(`<${LOCAL_COMMAND_STDOUT}>`) ||
      message.content.includes(`<${LOCAL_COMMAND_STDERR}>`))
  )
    return (
      localCommandOutputToSDKAssistantMessage(
        message.content,
        message.uuid,
        message.timestamp,
        message.contextUsage,
        message.commandRun,
        message.usageReport,
        message.commandOutcome,
      ) ?? undefined
    );
  return;
}
//@ chunk-tyg7f3ek.js:247942-248029 placement
function* systemMessagesToSdk(messages) {
  for (let message of messages) {
    if (message.type !== "system") continue;
    let sdkMessage = systemMessageToSdk(message);
    if (sdkMessage) yield sdkMessage;
  }
}
//@ chunk-tyg7f3ek.js:248029-248508 placement
function* replayMessagesToSdk(messages) {
  for (let message of messages) {
    let sdkMessage = systemMessageToSdk(message);
    if (sdkMessage) {
      yield sdkMessage;
      continue;
    }
    if (message.type === "user" && typeof message.message.content === "string" && message.isCompactSummary)
      yield userMessageToSdkReplay(message, message.message.content);
    if (message.type === "system" && message.subtype === "compact_boundary")
      yield {
        type: "system",
        subtype: "compact_boundary",
        session_id: getSessionId(),
        uuid: message.uuid,
        compact_metadata: toSDKCompactMetadata(message.compactMetadata),
        ...(message.logicalParentUuid !== undefined && {
          logical_parent_uuid: message.logicalParentUuid,
        }),
      };
    if (message.type === "system" && message.subtype === "informational")
      yield informationalSystemMessage(message);
  }
}
//@ chunk-tyg7f3ek.js:248508-249078 placement
function informationalSystemMessage(message) {
  return {
    type: "system",
    subtype: "informational",
    content: stripAnsi(message.content),
    level: message.level,
    ...(message.toolUseID && {
      tool_use_id: message.toolUseID,
    }),
    ...(message.preventContinuation && {
      prevent_continuation: message.preventContinuation,
    }),
    ...(message.promptSubmitEnding && {
      prompt_submit_outcome: {
        kind: message.promptSubmitEnding.ending.kind,
        prompt_kept: message.promptSubmitEnding.promptKept,
        ...(message.promptSubmitEnding.ending.kind === "no_verdict"
          ? {
              no_verdict_kind: message.promptSubmitEnding.ending.noVerdictKind,
            }
          : message.promptSubmitEnding.ending.reason !== undefined && {
              reason: message.promptSubmitEnding.ending.reason,
            }),
      },
    }),
    uuid: message.uuid,
    session_id: getSessionId(),
  };
}
//@ chunk-tyg7f3ek.js:249078-249371 placement
function preservedAttachmentRows(messages, sessionId) {
  try {
    let preservedMessages = messages.find(isCompactBoundaryMessage)?.compactMetadata?.preservedMessages;
    let preservedUuids = new Set(preservedMessages?.allUuids ?? preservedMessages?.uuids ?? []);
    return messages.flatMap((message) =>
      message.type === "attachment" &&
      message.attachment.type === "hook_system_message" &&
      !preservedUuids.has(message.uuid)
        ? [
            {
              ...informationalSystemMessage_2(message.attachment),
              uuid: message.uuid,
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
function* normalizeMessageWithSessionId(message, sessionId) {
  for (let normalized of normalizeMessage(message, sessionId))
    yield {
      ...normalized,
      session_id: message.session_id,
    };
}
//@ chunk-tyg7f3ek.js:249445-249804 placement
function isOrphanedPermissionTurn(command, conversation) {
  let orphanedPermission = command.orphanedPermission;
  let toolUseID = orphanedPermission?.permissionResult?.toolUseID;
  if (orphanedPermission === undefined || toolUseID === undefined) return false;
  let toolUseIds = new Set([
    toolUseID,
    ...(orphanedPermission.siblings ?? []).map((sibling) => sibling.toolUseID),
    ...(orphanedPermission.notSent ?? []).map((unsent) => unsent.toolUseID),
  ]);
  return !conversation.some(
    (message) =>
      message.type === "user" &&
      Array.isArray(message.message.content) &&
      message.message.content.some(
        (block) => block.type === "tool_result" && toolUseIds.has(block.tool_use_id),
      ),
  );
}
//@ chunk-tyg7f3ek.js:249804-250538 placement
function countUnsentBatchMessages({ batch, turnSignal, isStopped, isSentNow, conversation, messageQueue }) {
  let requeuedUuids = new Set();
  let requeuedCount = 0;
  if (!(!isStopped && (isSentNow || unwrapAbortReason(turnSignal.reason) === "interrupt")))
    return {
      count: requeuedCount,
      uuids: requeuedUuids,
    };
  let memberCount = batch.members.length;
  try {
    for (let i = 0; i < memberCount; i += 1) {
      let command = batch.members[isSentNow ? i : memberCount - 1 - i];
      if (
        command === undefined ||
        command.origin?.kind === "plugin" ||
        (command.mode === "orphaned-permission" && !isOrphanedPermissionTurn(command, conversation))
      )
        continue;
      if (
        !messageQueue.enqueueReportingAdmission(
          {
            ...command,
            ...(command.priority === "now" && {
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
      requeuedCount += 1;
      if (command.uuid !== undefined) requeuedUuids.add(command.uuid);
    }
    logForDebugging(
      `[headless] a prompt check cut for a message to run: ${requeuedCount} of ${memberCount} member(s) back on the queue`,
    );
  } catch (error) {
    if (isAbortError(error)) logForDebugging(`[headless] putting a cut batch back aborted: ${error}`);
    else logError(error);
  }
  return {
    count: requeuedCount,
    uuids: requeuedUuids,
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
