/**
 * utils/messages/mappers.ts
 *
 * 内部消息与 SDK 消息（stream-json/SDK 协议）之间的互相转换：toSDKMessages、toInternalMessages、压缩元数据转换、本地命令输出转 assistant 消息、限额信息裁剪。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/messages/mappers.ts
 * pieces: chunk-0h4e7gnq.js (32), chunk-w5ndchqs.js (1)
 * attribution: placement 25, fingerprint 5, callgraph-witnessed 2, layout 1
 */
import { randomUUID } from "crypto";
import { replaceControlChars } from "../resultError.js";
import { stripCombiningRepeated } from "../sanitization.js";
import { stripAnsi, stripAnsiPerLine } from "../stripAnsi.js";
import { isModelCapabilityEnabled } from "../model/promptBundles.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { sanitizeDisplayText } from "../sanitizeDisplayText.js";
import { findToolByName } from "../../Tool.js";
import { humanizeToolName } from "../../bridge/bridgePermissionResponse.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, _enum, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { NON_EXECUTION_KINDS, isKnownMessageKind } from "../../entrypoints/sdk/coreSchemas.js";
import { countToolCallsSince } from "../taggedId.js";
import {
  countToolCallsSince_2,
  restoreWireInputStamps,
  countToolCallsSince_3,
} from "../wireToolInputEcho.js";
import {
  toTextBlocks,
  parseQueuedCommandAttachment,
  localCommandOutputOf,
  createAssistantMessage,
} from "../messages.js";
import { API_ERROR_MESSAGE_PREFIX } from "../../services/api/errors.js";
import { sanitizeVerificationMessage } from "../../services/api/verificationRequired.js";
import { MESSAGE_MARK_SYMBOLS_2 } from "../messageKinds.js";
import { nonEmptyObjectOrUndefined } from "../../services/claudeAiLimits.js";
import { pickByHelper } from "../git/gitSafeEnv.js";
import { narrationThinkingIndexes } from "./apiNormalization.js";
import { getEntrypointKind } from "../entrypointKinds.js";
import { getSessionId } from "../../bootstrap/state.js";
import { LOCAL_COMMAND_STDOUT, LOCAL_COMMAND_STDERR } from "../../constants/xml.js";
import { unescapeHtmlEntities } from "../confusables.js";
import { stripMemoryTagsFromBlocks } from "../../services/orgMemory/promptIndex.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { isDisklessSession, notePlanFileForgotten, getPlanFilePath, getPlan } from "../plans.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-w5ndchqs.js:33580-33674 fingerprint = toSDKRateLimitInfo (0.578)
/**
 * 去掉 overageStatus/overageResetsAt/overageDisabledReason 后的限额信息（SDK rate_limit_info）。
 */
function toSDKRateLimitInfo(limits) {
  let { overageStatus, overageResetsAt, overageDisabledReason, ...rest } = limits;
  return rest;
}
//@ chunk-0h4e7gnq.js:31691-31797 placement
function toSafeLines(text) {
  return text
    .replace(
      /\r\n?|[\v\f\u0085\u2028\u2029]/g,
      `
`,
    )
    .split(
      `
`,
    )
    .map((line) => replaceControlChars(stripCombiningRepeated(stripAnsi(line))));
}
//@ chunk-0h4e7gnq.js:31797-31900 placement
function formatHookSaysLines(event) {
  let prefix = `${toSafeLines(event.hookName).join(" ")} says: `;
  return toSafeLines(event.content).map((line) => prefix + line).join(`
`);
}
//@ chunk-0h4e7gnq.js:31900-31991 placement
/**
 * 构造 informational 系统消息（notice 级别）。
 */
function informationalSystemMessage(event) {
  return {
    type: "system",
    subtype: "informational",
    content: formatHookSaysLines(event),
    level: "notice",
  };
}
//@ chunk-0h4e7gnq.js:32028-32102 placement
/**
 * 判断模型是否启用 quizzical_shore 能力。
 */
function isQuizzicalShoreModel(modelName) {
  return (
    typeof modelName === "string" &&
    isModelCapabilityEnabled("quizzical_shore", getCanonicalName(modelName), modelName)
  );
}
//@ chunk-0h4e7gnq.js:32102-32148 placement
function hiddenOrFaintLevel(modelName) {
  return isQuizzicalShoreModel(modelName) ? "hidden" : "faint";
}
//@ chunk-0h4e7gnq.js:32148-32219 placement
function isApiErrorMessageFlagged(message) {
  return "isApiErrorMessage" in message && message.isApiErrorMessage === true;
}
//@ chunk-0h4e7gnq.js:32219-32289 placement
/**
 * 判断是否为无附带错误信息的 API 错误消息。
 */
function isBareApiErrorMessage(message) {
  return isApiErrorMessageFlagged(message) && message.error == null && message.api_error_status == null;
}
//@ chunk-0h4e7gnq.js:32289-32347 placement
/**
 * 判断消息是否为 API 错误消息。
 */
function isApiErrorMessage(message) {
  return message.is_api_error_message === true || isApiErrorMessageFlagged(message);
}
//@ chunk-0h4e7gnq.js:32347-32380 placement
/**
 * 取消息的安全清洗文本。
 */
function sanitizedMessageText(text) {
  return sanitizeDisplayText(stripAnsiPerLine(text));
}
//@ chunk-0h4e7gnq.js:32380-32497 placement
/**
 * 对文本块内容做安全清洗，其他块原样保留。
 */
function sanitizeTextBlocks(content) {
  return content.map((block) =>
    block.type === "text" && "text" in block && typeof block.text === "string"
      ? {
          ...block,
          text: sanitizedMessageText(block.text),
        }
      : block,
  );
}
//@ chunk-0h4e7gnq.js:32497-33032 placement
function toolResultRemedy(message) {
  let { toolDenialKind, toolResultRemedy, permissionDecision } = message;
  if (toolDenialKind === undefined && toolResultRemedy === undefined && permissionDecision === undefined)
    return [];
  let content = message.message.content;
  if (!Array.isArray(content)) return [];
  let filtered = content.filter((block) => block.type === "tool_result");
  if (filtered.length !== 1) return [];
  let meta = {
    id: filtered[0].tool_use_id,
  };
  if (toolDenialKind !== undefined) {
    meta.non_execution_kind = toolDenialKind;
    if (message.userFeedback !== undefined) meta.user_feedback = message.userFeedback;
  }
  if (toolResultRemedy !== undefined) meta.remedy = toolResultRemedy;
  if (permissionDecision !== undefined)
    meta.permission_decision = {
      decision: permissionDecision.decision,
      source: permissionDecision.source,
      ...(permissionDecision.reasonType !== undefined && {
        reason_type: permissionDecision.reasonType,
      }),
    };
  return [meta];
}
//@ chunk-0h4e7gnq.js:33032-33277 placement
/**
 * 只保留在给定内容中有对应 tool_result 的工具调用。
 */
function filterToolUsesWithResults(toolUseBlocks, content) {
  if (toolUseBlocks.length === 0 || !Array.isArray(content)) return [];
  let resultIds = new Set();
  for (let block of content)
    if (block != null && typeof block === "object") {
      let toolResult = block;
      if (toolResult.type === "tool_result" && typeof toolResult.tool_use_id === "string")
        resultIds.add(toolResult.tool_use_id);
    }
  return toolUseBlocks.filter((toolUse) => resultIds.has(toolUse.id));
}
//@ chunk-0h4e7gnq.js:33277-33819 placement
/**
 * 为助手消息里的工具调用生成 SDK 显示信息：显示名（MCP 标题或人性化名称，和原名相同时跳过），MCP 工具附服务器显示名、图标、服务器 id 与工具名。
 */
function buildToolDisplayNames(content, tools) {
  if (!Array.isArray(content)) return [];
  let names = [];
  for (let block of content) {
    if (block == null || typeof block !== "object" || block.type !== "tool_use") continue;
    let { id, name: toolName } = block;
    if (typeof id !== "string" || typeof toolName !== "string") continue;
    let mcpInfo = tools ? findToolByName(tools, toolName)?.mcpInfo : undefined;
    let displayName = mcpInfo?.title || humanizeToolName(toolName);
    if (displayName === toolName) continue;
    let entry = {
      id,
      display_name: displayName,
    };
    if (mcpInfo) {
      entry.server_display_name = mcpInfo.displayName || mcpInfo.serverInfoName || mcpInfo.serverName;
      if (mcpInfo.iconUrl) entry.icon_url = mcpInfo.iconUrl;
      if (mcpInfo.serverId) entry.server_id = mcpInfo.serverId;
      if (mcpInfo.serverIdStamp) entry.server_id_stamp = mcpInfo.serverIdStamp;
      entry.tool_name = mcpInfo.toolName;
    }
    names.push(entry);
  }
  return names;
}
//@ chunk-0h4e7gnq.js:33819-33967 placement
/**
 * 工具结果附加信息的 schema：未执行原因，以及被分类器拒绝的权限决定。
 */
var NON_EXECUTION_ENTRY_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CLASSIFIER_REJECT_SCHEMA;
deferInit("chunk-0h4e7gnq.js:33819", () => {
  NON_EXECUTION_ENTRY_SCHEMA = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      non_execution_kind: _enum(NON_EXECUTION_KINDS),
    }),
  );
  CLASSIFIER_REJECT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      permission_decision: objectSchema({
        decision: literal("reject"),
        reason_type: literal("classifier"),
      }),
    }),
  );
});
//@ chunk-0h4e7gnq.js:33967-34191 placement
function findToolResultMeta(schema, toolResultMetaInput, content) {
  let filtered = content.filter((block) => block.type === "tool_result");
  let [toolResult] = filtered;
  let candidates =
    Array.isArray(toolResultMetaInput) && filtered.length === 1 && toolResult?.is_error === true
      ? toolResultMetaInput
      : [];
  for (let candidate of candidates) {
    let parsed = schema.safeParse(candidate);
    if (parsed.success && parsed.data.id === toolResult?.tool_use_id) return parsed.data;
  }
  return;
}
//@ chunk-0h4e7gnq.js:34191-34249 placement
/**
 * 取工具结果的 non_execution_kind 标记。
 */
function nonExecutionKindOf(toolResultMetaInput, content) {
  return findToolResultMeta(NON_EXECUTION_ENTRY_SCHEMA(), toolResultMetaInput, content)?.non_execution_kind;
}
//@ chunk-0h4e7gnq.js:34249-34329 placement
/**
 * 判断数值是否为合法 HTTP 状态码。
 */
function isHttpStatus(apiErrorStatus) {
  return (
    typeof apiErrorStatus === "number" &&
    Number.isInteger(apiErrorStatus) &&
    apiErrorStatus >= 100 &&
    apiErrorStatus <= 599
  );
}
//@ chunk-0h4e7gnq.js:34329-36733 fingerprint = toInternalMessages (0.356)
/**
 * SDK 消息数组转内部消息：assistant（含 local_command_source 转 local_command 系统消息）、user、系统事件（compact_boundary、model_fallback 等）还原。
 */
function toInternalMessages(messages) {
  return messages.flatMap((message) => {
    switch (message.type) {
      case "assistant":
        if (typeof message.local_command_source === "string")
          return [
            {
              type: "system",
              subtype: "local_command",
              content: message.local_command_source,
              level: "info",
              timestamp: message.timestamp ?? new Date().toISOString(),
              uuid: message.uuid ?? randomUUID(),
              isMeta: false,
              ...(message.local_command_run !== undefined && {
                commandRun: {
                  command: message.local_command_run.command,
                  args: message.local_command_run.args,
                  ...(typeof message.local_command_run.plugin === "string" && {
                    plugin: message.local_command_run.plugin,
                  }),
                },
              }),
              ...(isKnownMessageKind(message.local_command_outcome) && {
                commandOutcome: {
                  kind: message.local_command_outcome.kind,
                  ...(typeof message.local_command_outcome.suggestion === "string" && {
                    suggestion: message.local_command_outcome.suggestion,
                  }),
                },
              }),
            },
          ];
        if (message.is_meta === true) return [];
        let content = countToolCallsSince(message.message.content);
        let normalizedMessage =
          content === message.message.content
            ? message.message
            : {
                ...message.message,
                content,
              };
        let wireToolInputs = countToolCallsSince_2(
          message.wire_tool_inputs,
          normalizedMessage.content,
          message.batch_tool_uses,
        );
        let wireIngestContext = restoreWireInputStamps(
          message.wire_ingest_context,
          wireToolInputs,
          normalizedMessage.content,
        );
        let content_2 = normalizedMessage.content;
        let withBlocks =
          typeof content_2 === "string"
            ? {
                ...normalizedMessage,
                content: toTextBlocks(content_2),
              }
            : normalizedMessage;
        let withId = withBlocks.id
          ? withBlocks
          : {
              ...withBlocks,
              id: randomUUID(),
            };
        return [
          {
            type: "assistant",
            message:
              message.error === "verification_required"
                ? sanitizeApiErrorMessage(withId)
                : isBareApiErrorMessage(message)
                  ? {
                      ...withId,
                      content: sanitizeTextBlocks(withId.content),
                    }
                  : withId,
            uuid: message.uuid ?? randomUUID(),
            requestId: undefined,
            timestamp: message.timestamp ?? new Date().toISOString(),
            ...(message.resumed_from_incomplete_thinking === true && {
              resumedFromIncompleteThinking: true,
            }),
            ...(message.is_virtual === true && {
              isVirtual: true,
            }),
            ...(message.aborted === true && {
              isAbortedMidStream: true,
            }),
            ...(isApiErrorMessage(message) && {
              isApiErrorMessage: true,
            }),
            ...(isBareApiErrorMessage(message) && {
              sessionFailureNotice: true,
            }),
            ...(isHttpStatus(message.api_error_status) && {
              apiErrorStatus: message.api_error_status,
            }),
            ...(message.api_error !== undefined && {
              apiError: message.api_error,
            }),
            ...(message.api_error_params !== undefined && {
              apiErrorParams: message.api_error_params,
            }),
            ...(message.api_error_code !== undefined && {
              apiErrorCode: message.api_error_code,
            }),
            ...(message.error !== undefined && {
              error: message.error,
            }),
            ...(message.batch_tool_uses !== undefined &&
              message.batch_tool_uses.length > 0 && {
                batchToolUses: message.batch_tool_uses,
              }),
            ...(wireToolInputs !== undefined && {
              wireToolInputs,
            }),
            ...(wireIngestContext !== undefined && {
              wireIngestContext,
            }),
          },
        ];
      case "user": {
        let content = message.message.content;
        let remoteDenialKind = Array.isArray(content)
          ? nonExecutionKindOf(message.tool_result_meta, content)
          : undefined;
        return [
          {
            type: "user",
            message: message.message,
            uuid: message.uuid ?? randomUUID(),
            timestamp: message.timestamp ?? new Date().toISOString(),
            isMeta: message.isSynthetic,
            ...(message.is_virtual === true && {
              isVirtual: true,
            }),
            ...(remoteDenialKind !== undefined && {
              remoteToolDenialKind: remoteDenialKind,
            }),
          },
        ];
      }
      case "system":
        if (message.subtype === "compact_boundary")
          return [
            {
              type: "system",
              content: "Conversation compacted",
              level: "info",
              subtype: "compact_boundary",
              compactMetadata: fromSDKCompactMetadata(message.compact_metadata),
              uuid: message.uuid,
              timestamp: new Date().toISOString(),
              remoteSourced: true,
            },
          ];
        return [];
      default:
        return [];
    }
  });
}
//@ chunk-0h4e7gnq.js:36733-36984 placement
/**
 * 对 API 错误消息里的文本块做验证信息清洗：保留"API Error: "前缀，清洗其后内容，清洗为空时只留前缀。
 */
function sanitizeApiErrorMessage(message) {
  let prefix = `${API_ERROR_MESSAGE_PREFIX}: `;
  return {
    ...message,
    content: message.content.map((block) => {
      if (block.type !== "text") return block;
      let hasPrefix = block.text.startsWith(prefix);
      let sanitized = sanitizeVerificationMessage(hasPrefix ? block.text.slice(prefix.length) : block.text);
      if (sanitized === undefined)
        return {
          ...block,
          text: hasPrefix ? prefix.trimEnd() : "",
        };
      return {
        ...block,
        text: hasPrefix ? `${prefix}${sanitized}` : sanitized,
      };
    }),
  };
}
//@ chunk-0h4e7gnq.js:36984-37073 placement = selectableUserMessagesFilter (1)
function selectableUserMessagesFilter(message) {
  return message.isMeta || message.isVisibleInTranscriptOnly || message.isCompactSummary || undefined;
}
//@ chunk-0h4e7gnq.js:37073-37997 fingerprint = toSDKCompactMetadata (0.528)
/**
 * 内部 compactMetadata（camelCase）转 SDK compact_metadata（snake_case），含 preserved_segment/preserved_messages。
 */
function toSDKCompactMetadata(meta) {
  let { preservedSegment, preservedMessages } = meta;
  return {
    trigger: meta.trigger,
    pre_tokens: meta.preTokens,
    ...(meta.postTokens !== undefined && {
      post_tokens: meta.postTokens,
    }),
    ...(meta.cumulativeDroppedTokens !== undefined && {
      cumulative_dropped_tokens: meta.cumulativeDroppedTokens,
    }),
    ...(meta.durationMs !== undefined && {
      duration_ms: meta.durationMs,
    }),
    ...(meta.userContext !== undefined && {
      user_context: meta.userContext,
    }),
    ...(meta.messagesSummarized !== undefined && {
      messages_summarized: meta.messagesSummarized,
    }),
    ...(meta.precomputed !== undefined && {
      precomputed: meta.precomputed,
    }),
    ...(meta.preCompactDiscoveredTools !== undefined && {
      pre_compact_discovered_tools: meta.preCompactDiscoveredTools,
    }),
    ...(meta.preCompactArtifactReadVersions !== undefined && {
      pre_compact_artifact_read_versions: meta.preCompactArtifactReadVersions,
    }),
    ...(preservedSegment && {
      preserved_segment: {
        head_uuid: preservedSegment.headUuid,
        anchor_uuid: preservedSegment.anchorUuid,
        tail_uuid: preservedSegment.tailUuid,
      },
    }),
    ...(preservedMessages && {
      preserved_messages: {
        anchor_uuid: preservedMessages.anchorUuid,
        uuids: preservedMessages.uuids,
        ...(preservedMessages.allUuids !== undefined && {
          all_uuids: preservedMessages.allUuids,
        }),
      },
    }),
  };
}
//@ chunk-0h4e7gnq.js:37997-38969 callgraph-witnessed = fromSDKCompactMetadata (0.528)
/**
 * SDK compact_metadata 转内部 compactMetadata。
 */
function fromSDKCompactMetadata(meta) {
  let { preserved_segment: preservedSegment, preserved_messages: preservedMessages } = meta;
  return {
    trigger: meta.trigger,
    preTokens: meta.pre_tokens,
    ...(meta.post_tokens !== undefined && {
      postTokens: meta.post_tokens,
    }),
    ...(meta.cumulative_dropped_tokens !== undefined && {
      cumulativeDroppedTokens: meta.cumulative_dropped_tokens,
    }),
    ...(meta.duration_ms !== undefined && {
      durationMs: meta.duration_ms,
    }),
    ...(meta.user_context !== undefined && {
      userContext: meta.user_context,
    }),
    ...(meta.messages_summarized !== undefined && {
      messagesSummarized: meta.messages_summarized,
    }),
    ...(meta.precomputed !== undefined && {
      precomputed: meta.precomputed,
    }),
    ...(meta.pre_compact_discovered_tools !== undefined && {
      preCompactDiscoveredTools: [...meta.pre_compact_discovered_tools],
    }),
    ...(meta.pre_compact_artifact_read_versions !== undefined && {
      preCompactArtifactReadVersions: meta.pre_compact_artifact_read_versions.map(
        (preCompactArtifactReadVersion) => ({
          ...preCompactArtifactReadVersion,
        }),
      ),
    }),
    ...(preservedSegment && {
      preservedSegment: {
        headUuid: preservedSegment.head_uuid,
        anchorUuid: preservedSegment.anchor_uuid,
        tailUuid: preservedSegment.tail_uuid,
      },
    }),
    ...(preservedMessages && {
      preservedMessages: {
        anchorUuid: preservedMessages.anchor_uuid,
        uuids: [...preservedMessages.uuids],
        ...(preservedMessages.all_uuids !== undefined && {
          allUuids: [...preservedMessages.all_uuids],
        }),
      },
    }),
  };
}
//@ chunk-0h4e7gnq.js:41678-42470 placement
function isAssistantResultComplete(message, content) {
  let wireInputs =
    content === undefined
      ? message.wireToolInputs
      : countToolCallsSince_3(message.wireToolInputs, content, message.batchToolUses);
  let fields = {
    aborted: message.isAbortedMidStream ? true : undefined,
    is_api_error_message: message.isApiErrorMessage === true ? true : undefined,
    api_error_status: message.apiErrorStatus,
    api_error: message.apiError,
    api_error_params: message.apiErrorParams,
    api_error_code: message.apiErrorCode,
    api_error_origin: message[MESSAGE_MARK_SYMBOLS_2],
    refused_message_id: message.refusedMessageId,
    resumed_from_incomplete_thinking: message.resumedFromIncompleteThinking === true ? true : undefined,
    is_virtual: message.isVirtual === true ? true : undefined,
    batch_tool_uses:
      message.batchToolUses !== undefined && message.batchToolUses.length > 0
        ? message.batchToolUses
        : undefined,
    wire_tool_inputs: wireInputs !== undefined && Object.keys(wireInputs).length > 0 ? wireInputs : undefined,
    wire_ingest_context:
      wireInputs !== undefined && message.wireIngestContext !== undefined
        ? nonEmptyObjectOrUndefined(
            pickByHelper(message.wireIngestContext, (value, key) => Object.hasOwn(wireInputs, key)),
          )
        : undefined,
  };
  return pickByHelper(fields, (value) => value !== undefined);
}
//@ chunk-0h4e7gnq.js:42470-42665 placement
/**
 * 生成 SDK 消息的旁白字段：旁白块下标，以及 VS Code 入口下的旁白提示。
 */
function getNarrationFields(messages, model) {
  if (!Array.isArray(messages)) return {};
  let indexes = narrationThinkingIndexes(messages);
  if (indexes.length === 0) return {};
  let narrationHint = getEntrypointKind() === "claude-vscode" ? hiddenOrFaintLevel(model) : undefined;
  return {
    narration_block_indexes: indexes,
    ...(narrationHint !== undefined && {
      narration_hint: narrationHint,
    }),
  };
}
//@ chunk-0h4e7gnq.js:42665-42951 placement
/**
 * 消息只含一个思考块时，生成思考耗时与显示方式字段。
 */
function getThinkingFields(message, content) {
  if (
    !Array.isArray(content) ||
    message.message.content.length !== 1 ||
    content.length !== 1 ||
    content[0]?.type !== "thinking"
  )
    return {};
  let { thinkingDurationMs, thinkingDisplay } = message;
  return {
    ...(thinkingDurationMs !== undefined &&
      Number.isSafeInteger(thinkingDurationMs) &&
      thinkingDurationMs >= 1 && {
        thinking_duration_ms: thinkingDurationMs,
      }),
    ...(typeof thinkingDisplay === "string" && {
      thinking_display: thinkingDisplay,
    }),
  };
}
//@ chunk-0h4e7gnq.js:42951-43283 placement
/**
 * 把队列命令附件转成回放用的 SDK user 消息（内容、uuid、时间戳、isReplay，元消息标 isSynthetic，附文件附件与来源）。
 */
function queuedCommandToSdkUser(attachment, message) {
  let queuedCommandAttachment = parseQueuedCommandAttachment(attachment, message.uuid);
  if (queuedCommandAttachment === undefined) return;
  return {
    type: "user",
    message: {
      role: "user",
      content: queuedCommandAttachment.content,
    },
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: queuedCommandAttachment.uuid,
    timestamp: message.timestamp,
    isReplay: true,
    ...(queuedCommandAttachment.isMeta && {
      isSynthetic: true,
    }),
    ...(attachment.fileAttachments?.length && {
      file_attachments: attachment.fileAttachments,
    }),
    ...(queuedCommandAttachment.origin && {
      origin: queuedCommandAttachment.origin,
    }),
  };
}
//@ chunk-0h4e7gnq.js:43283-43479 placement
/**
 * 把用户消息转成 SDK 回放 user 消息（压缩摘要不算回放，标记是否为合成消息）。
 */
function userMessageToSdkReplay(message, content) {
  return {
    type: "user",
    message: {
      ...message.message,
      content: stripAnsi(content),
    },
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: message.uuid,
    timestamp: message.timestamp,
    isReplay: !message.isCompactSummary,
    isSynthetic: selectableUserMessagesFilter(message),
  };
}
//@ chunk-0h4e7gnq.js:43479-45297 fingerprint = toSDKMessages (0.431)
/**
 * 内部消息转 SDK 消息：assistant（带 session_id、request_id、tool_use_meta）、user（按来源分类）、system 子类型、附件等。
 */
function toSDKMessages(messages, tools) {
  return messages.flatMap((message) => {
    switch (message.type) {
      case "assistant": {
        let normalized = normalizeAssistantMessageForSDK(message);
        let toolDisplayNames = buildToolDisplayNames(normalized.content, tools);
        return [
          {
            type: "assistant",
            message: normalized,
            session_id: getSessionId(),
            parent_tool_use_id: null,
            uuid: message.uuid,
            timestamp: message.timestamp,
            error: message.error,
            ...(message.requestId !== undefined && {
              request_id: message.requestId,
            }),
            ...isAssistantResultComplete(message),
            ...getNarrationFields(normalized.content, normalized.model),
            ...getThinkingFields(message, normalized.content),
            ...(toolDisplayNames.length > 0 && {
              tool_use_meta: toolDisplayNames,
            }),
          },
        ];
      }
      case "user": {
        let localOutput = localCommandOutputOf(message);
        switch (localOutput) {
          case "terminal-hint":
            if (typeof message.message.content === "string")
              return [userMessageToSdkReplay(message, message.message.content)];
            break;
          case "stdout":
          case "stderr":
          case undefined:
            break;
          default:
        }
        let remedyMeta = toolResultRemedy(message);
        return [
          {
            type: "user",
            message: message.message,
            session_id: getSessionId(),
            parent_tool_use_id: null,
            uuid: message.uuid,
            timestamp: message.timestamp,
            isSynthetic: selectableUserMessagesFilter(message),
            ...false,
            ...(message.toolUseResult !== undefined && {
              tool_use_result: message.toolUseResult,
            }),
            ...(remedyMeta.length > 0 && {
              tool_result_meta: remedyMeta,
            }),
            ...(message.origin !== undefined && {
              origin: message.origin,
            }),
            ...(message.refusedMessageId !== undefined && {
              refused_message_id: message.refusedMessageId,
            }),
          },
        ];
      }
      case "system":
        if (message.subtype === "compact_boundary" && message.compactMetadata)
          return [
            {
              type: "system",
              subtype: "compact_boundary",
              session_id: getSessionId(),
              uuid: message.uuid,
              compact_metadata: toSDKCompactMetadata(message.compactMetadata),
            },
          ];
        if (
          message.subtype === "local_command" &&
          (message.content.includes(`<${LOCAL_COMMAND_STDOUT}>`) ||
            message.content.includes(`<${LOCAL_COMMAND_STDERR}>`))
        ) {
          let assistantMessage = localCommandOutputToSDKAssistantMessage(
            message.content,
            message.uuid,
            message.timestamp,
            message.contextUsage,
            message.commandRun,
            message.usageReport,
            message.commandOutcome,
          );
          return assistantMessage ? [assistantMessage] : [];
        }
        if (message.subtype === "model_consent_fallback")
          return [
            {
              ...toSDKModelConsentFallbackMessage(message),
              uuid: message.uuid,
              session_id: getSessionId(),
            },
          ];
        return [];
      case "attachment":
        if (message.attachment.type === "hook_system_message")
          return [
            {
              type: "assistant",
              message: createAssistantMessage({
                content: formatHookSaysLines(message.attachment),
              }).message,
              parent_tool_use_id: null,
              is_meta: true,
              session_id: getSessionId(),
              uuid: message.uuid,
              timestamp: message.timestamp,
            },
          ];
        if (message.attachment.type === "queued_command") {
          let sdkUserMessage = queuedCommandToSdkUser(message.attachment, message);
          return sdkUserMessage ? [sdkUserMessage] : [];
        }
        if (message.attachment.type === "tool_host_result_lines")
          return [toSDKToolHostResultMessage(message.attachment, message.uuid, getSessionId())];
        return [];
      default:
        return [];
    }
  });
}
//@ chunk-0h4e7gnq.js:45297-45626 layout
/**
 * tool_host_result_lines 附件 → SDK system/tool_host_result（host、disposition、label、lines）。
 */
function toSDKToolHostResultMessage(attachment, uuid, sessionId) {
  return {
    type: "system",
    subtype: "tool_host_result",
    tool_use_id: attachment.toolUseID,
    host: {
      name: attachment.host,
      ...(attachment.workingDir !== undefined && {
        working_dir: attachment.workingDir,
      }),
    },
    ...(attachment.disposition !== undefined && {
      disposition: attachment.disposition,
    }),
    ...(attachment.label !== undefined && {
      label: attachment.label,
    }),
    ...(attachment.unverified === true && {
      unverified: true,
    }),
    lines: attachment.lines,
    uuid,
    session_id: sessionId,
  };
}
//@ chunk-0h4e7gnq.js:45626-46448 callgraph-witnessed = localCommandOutputToSDKAssistantMessage (0.219)
/**
 * 本地命令输出（local-command-stdout/stderr 标签）转 SDK assistant 文本消息。
 */
function localCommandOutputToSDKAssistantMessage(
  content,
  uuid,
  timestamp,
  contextUsage,
  commandRun,
  usageReport,
  commandOutcome,
) {
  let strippedContent = stripAnsi(content);
  let regExp = new RegExp(`<(${LOCAL_COMMAND_STDOUT}|${LOCAL_COMMAND_STDERR})>`, "g");
  let seenTags = new Set();
  let unclosedTags = new Set();
  let parts = "";
  let copyFrom = 0;
  for (
    let match = regExp.exec(strippedContent);
    match !== null && seenTags.size < 2;
    match = regExp.exec(strippedContent)
  ) {
    let tagName = match[1];
    if (unclosedTags.has(tagName)) continue;
    let index = strippedContent.indexOf(`</${tagName}>`, regExp.lastIndex);
    if (index === -1) {
      unclosedTags.add(tagName);
      continue;
    }
    let closeEnd = index + `</${tagName}>`.length;
    if (!seenTags.has(tagName)) {
      seenTags.add(tagName);
      parts +=
        strippedContent.slice(copyFrom, match.index) +
        unescapeHtmlEntities(strippedContent.slice(regExp.lastIndex, index));
      copyFrom = closeEnd;
    }
    regExp.lastIndex = closeEnd;
  }
  let cleanContent = (parts + strippedContent.slice(copyFrom)).trim();
  if (cleanContent === "") return null;
  return {
    type: "assistant",
    message: {
      ...createAssistantMessage({
        content: cleanContent,
      }).message,
      stop_reason: "end_turn",
      stop_sequence: null,
    },
    parent_tool_use_id: null,
    local_command_source: content,
    session_id: getSessionId(),
    uuid,
    timestamp,
    ...(contextUsage !== undefined && {
      context_usage: contextUsage,
    }),
    ...(usageReport !== undefined && {
      usage_report: usageReport,
    }),
    ...(commandRun !== undefined && {
      local_command_run: {
        command: commandRun.command,
        args: commandRun.args,
        ...(commandRun.plugin !== undefined && {
          plugin: commandRun.plugin,
        }),
      },
    }),
    ...(commandOutcome !== undefined && {
      local_command_outcome: commandOutcome,
    }),
  };
}
//@ chunk-0h4e7gnq.js:46448-46697 placement
/**
 * 内部 model_consent_fallback 系统消息转 SDK 字段（original_model、fallback_model、persisted_as_default）。
 */
function toSDKModelConsentFallbackMessage(message) {
  return {
    type: "system",
    subtype: "model_consent_fallback",
    choice: message.choice,
    original_model: message.originalModel,
    original_model_name: message.originalModelName,
    fallback_model: message.fallbackModel,
    persisted_as_default: message.persistedAsDefault,
    content: message.content,
  };
}
//@ chunk-0h4e7gnq.js:49182-49444 fingerprint = normalizeAssistantMessageForSDK (1)
/**
 * 给 SDK 的 assistant message：去内部块，ExitPlanMode 的 tool_use 输入补上计划文本。
 */
function normalizeAssistantMessageForSDK(message) {
  let content = message.message.content;
  if (!Array.isArray(content)) return message.message;
  let normalizedContent = stripMemoryTagsFromBlocks(content).map((block) => {
    if (block.type !== "tool_use") return block;
    if (block.name === EXITPLANMODE_2 && !isDisklessSession()) {
      notePlanFileForgotten(getPlanFilePath());
      let plan = getPlan();
      if (plan)
        return {
          ...block,
          input: {
            ...block.input,
            plan,
          },
        };
    }
    return block;
  });
  return {
    ...message.message,
    content: normalizedContent,
  };
}
export {
  toolResultRemedy,
  buildToolDisplayNames,
  getNarrationFields,
  filterToolUsesWithResults,
  selectableUserMessagesFilter,
  isAssistantResultComplete,
  getThinkingFields,
  toSDKToolHostResultMessage,
  informationalSystemMessage,
  fromSDKCompactMetadata,
  isBareApiErrorMessage,
  sanitizeApiErrorMessage,
  sanitizeTextBlocks,
  isApiErrorMessage,
  isHttpStatus,
  sanitizedMessageText,
  nonExecutionKindOf,
  toSDKRateLimitInfo,
  toInternalMessages,
  isQuizzicalShoreModel,
  toSDKMessages,
  queuedCommandToSdkUser,
  userMessageToSdkReplay,
  localCommandOutputToSDKAssistantMessage,
  toSDKCompactMetadata,
  toSDKModelConsentFallbackMessage,
};
