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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
} from "crypto";
import { replaceControlChars } from "../resultError.js";
import { stripCombiningRepeated } from "../sanitization.js";
import { Yn, qa } from "../stripAnsi.js";
import { isModelCapabilityEnabled } from "../model/promptBundles.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { sanitizeDisplayText } from "../sanitizeDisplayText.js";
import { findToolByName } from "../../Tool.js";
import { humanizeToolName } from "../../bridge/bridgePermissionResponse.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, U, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { h9t, extractMarkupText } from "../../entrypoints/sdk/coreSchemas.js";
import { countToolCallsSince } from "../taggedId.js";
import {
  countToolCallsSince_2,
  restoreWireInputStamps,
  countToolCallsSince_3,
} from "../wireToolInputEcho.js";
import { toTextBlocks, parseQueuedCommandAttachment, btt, createAssistantMessage } from "../messages.js";
import { API_ERROR_MESSAGE_PREFIX } from "../../services/api/errors.js";
import { sanitizeVerificationMessage } from "../../services/api/verificationRequired.js";
import { MESSAGE_MARK_SYMBOLS } from "../messageKinds.js";
import { kd } from "../../services/claudeAiLimits.js";
import { Do } from "../git/gitSafeEnv.js";
import { _6s } from "./apiNormalization.js";
import { getEntrypointKind } from "../entrypointKinds.js";
import { getSessionId } from "../../bootstrap/state.js";
import { LOCAL_COMMAND_STDOUT, LOCAL_COMMAND_STDERR } from "../../constants/xml.js";
import { unescapeHtmlEntities } from "../confusables.js";
import { stripMemoryTagsFromBlocks } from "../../services/orgMemory/promptIndex.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { MCe, notePlanFileForgotten, getPlanFilePath, getPlan } from "../plans.js";

//@ chunk-0h4e7gnq.js:31691-31797 placement
function toSafeLines(e) {
  return e
    .replace(
      /\r\n?|[\v\f\u0085\u2028\u2029]/g,
      `
`,
    )
    .split(
      `
`,
    )
    .map((n) => replaceControlChars(stripCombiningRepeated(Yn(n))));
}
//@ chunk-0h4e7gnq.js:31797-31900 placement
function formatHookSaysLines(e) {
  let n = `${toSafeLines(e.hookName).join(" ")} says: `;
  return toSafeLines(e.content).map((s) => n + s).join(`
`);
}
//@ chunk-0h4e7gnq.js:31900-31991 placement
function mLr(e) {
  return { type: "system", subtype: "informational", content: formatHookSaysLines(e), level: "notice" };
}
//@ chunk-0h4e7gnq.js:32028-32102 placement
function gLr(e) {
  return typeof e === "string" && isModelCapabilityEnabled("quizzical_shore", getCanonicalName(e), e);
}
//@ chunk-0h4e7gnq.js:32102-32148 placement
function Yr(e) {
  return gLr(e) ? "hidden" : "faint";
}
//@ chunk-0h4e7gnq.js:32148-32219 placement
function Xr(e) {
  return "isApiErrorMessage" in e && e.isApiErrorMessage === !0;
}
//@ chunk-0h4e7gnq.js:32219-32289 placement
function a2n(e) {
  return Xr(e) && e.error == null && e.api_error_status == null;
}
//@ chunk-0h4e7gnq.js:32289-32347 placement
function hLr(e) {
  return e.is_api_error_message === !0 || Xr(e);
}
//@ chunk-0h4e7gnq.js:32347-32380 placement
function RFt(e) {
  return sanitizeDisplayText(qa(e));
}
/**
 * 对文本块内容做安全清洗，其他块原样保留。
 */
//@ chunk-0h4e7gnq.js:32380-32497 placement
function sanitizeTextBlocks(e) {
  return e.map((n) =>
    n.type === "text" && "text" in n && typeof n.text === "string" ? { ...n, text: RFt(n.text) } : n,
  );
}
//@ chunk-0h4e7gnq.js:32497-33032 placement
function toolResultRemedy(e) {
  let {
    toolDenialKind: toolDenialKind,
    toolResultRemedy: toolResultRemedy,
    permissionDecision: permissionDecision,
  } = e;
  if (toolDenialKind === void 0 && toolResultRemedy === void 0 && permissionDecision === void 0) return [];
  let content = e.message.content;
  if (!Array.isArray(content)) return [];
  let filtered = content.filter((k) => k.type === "tool_result");
  if (filtered.length !== 1) return [];
  let h = { id: filtered[0].tool_use_id };
  if (toolDenialKind !== void 0) {
    if (((h.non_execution_kind = toolDenialKind), e.userFeedback !== void 0))
      h.user_feedback = e.userFeedback;
  }
  if (toolResultRemedy !== void 0) h.remedy = toolResultRemedy;
  if (permissionDecision !== void 0)
    h.permission_decision = {
      decision: permissionDecision.decision,
      source: permissionDecision.source,
      ...(permissionDecision.reasonType !== void 0 && { reason_type: permissionDecision.reasonType }),
    };
  return [h];
}
/**
 * 只保留在给定内容中有对应 tool_result 的工具调用。
 */
//@ chunk-0h4e7gnq.js:33032-33277 placement
function filterToolUsesWithResults(e, n) {
  if (e.length === 0 || !Array.isArray(n)) return [];
  let s = new Set();
  for (let y of n)
    if (y != null && typeof y === "object") {
      let r = y;
      if (r.type === "tool_result" && typeof r.tool_use_id === "string") s.add(r.tool_use_id);
    }
  return e.filter((y) => s.has(y.id));
}
/**
 * 为助手消息里的工具调用生成 SDK 显示信息：显示名（MCP 标题或人性化名称，和原名相同时跳过），MCP 工具附服务器显示名、图标、服务器 id 与工具名。
 */
//@ chunk-0h4e7gnq.js:33277-33819 placement
function buildToolDisplayNames(content, tools) {
  if (!Array.isArray(content)) return [];
  let s = [];
  for (let y of content) {
    if (y == null || typeof y !== "object" || y.type !== "tool_use") continue;
    let { id: id, name: S } = y;
    if (typeof id !== "string" || typeof S !== "string") continue;
    let mcpInfo = tools ? findToolByName(tools, S)?.mcpInfo : void 0,
      k = mcpInfo?.title || humanizeToolName(S);
    if (k === S) continue;
    let entry = { id: id, display_name: k };
    if (mcpInfo) {
      if (
        ((entry.server_display_name = mcpInfo.displayName || mcpInfo.serverInfoName || mcpInfo.serverName),
        mcpInfo.iconUrl)
      )
        entry.icon_url = mcpInfo.iconUrl;
      if (mcpInfo.serverId) entry.server_id = mcpInfo.serverId;
      if (mcpInfo.serverIdStamp) entry.server_id_stamp = mcpInfo.serverIdStamp;
      entry.tool_name = mcpInfo.toolName;
    }
    s.push(entry);
  }
  return s;
}
/**
 * 工具结果附加信息的 schema：未执行原因，以及被分类器拒绝的权限决定。
 */
//@ chunk-0h4e7gnq.js:33819-33967 placement
var NON_EXECUTION_ENTRY_SCHEMA = DoctorLazy(() => u({ id: o(), non_execution_kind: U(h9t) })),
  CLASSIFIER_REJECT_SCHEMA = DoctorLazy(() =>
    u({ id: o(), permission_decision: u({ decision: T("reject"), reason_type: T("classifier") }) }),
  );
//@ chunk-0h4e7gnq.js:33967-34191 placement
function findToolResultMeta(e, n, s) {
  let filtered = s.filter((k) => k.type === "tool_result"),
    [r] = filtered,
    h = Array.isArray(n) && filtered.length === 1 && r?.is_error === !0 ? n : [];
  for (let k of h) {
    let safeParse = e.safeParse(k);
    if (safeParse.success && safeParse.data.id === r?.tool_use_id) return safeParse.data;
  }
  return;
}
//@ chunk-0h4e7gnq.js:34191-34249 placement
function _Lr(e, n) {
  return findToolResultMeta(NON_EXECUTION_ENTRY_SCHEMA(), e, n)?.non_execution_kind;
}
//@ chunk-0h4e7gnq.js:34249-34329 placement
function Mxo(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 100 && e <= 599;
}
/**
 * SDK 消息数组转内部消息：assistant（含 local_command_source 转 local_command 系统消息）、user、系统事件（compact_boundary、model_fallback 等）还原。
 */
//@ chunk-0h4e7gnq.js:34329-36733 fingerprint = toInternalMessages (0.356)
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
              uuid: message.uuid ?? randomUUID_4(),
              isMeta: !1,
              ...(message.local_command_run !== void 0 && {
                commandRun: {
                  command: message.local_command_run.command,
                  args: message.local_command_run.args,
                  ...(typeof message.local_command_run.plugin === "string" && {
                    plugin: message.local_command_run.plugin,
                  }),
                },
              }),
              ...(extractMarkupText(message.local_command_outcome) && {
                commandOutcome: {
                  kind: message.local_command_outcome.kind,
                  ...(typeof message.local_command_outcome.suggestion === "string" && {
                    suggestion: message.local_command_outcome.suggestion,
                  }),
                },
              }),
            },
          ];
        if (message.is_meta === !0) return [];
        let s = countToolCallsSince(message.message.content),
          y = s === message.message.content ? message.message : { ...message.message, content: s },
          r = countToolCallsSince_2(message.wire_tool_inputs, y.content, message.batch_tool_uses),
          S = restoreWireInputStamps(message.wire_ingest_context, r, y.content),
          content = y.content,
          k = typeof content === "string" ? { ...y, content: toTextBlocks(content) } : y,
          w = k.id ? k : { ...k, id: randomUUID_4() };
        return [
          {
            type: "assistant",
            message:
              message.error === "verification_required"
                ? sanitizeApiErrorMessage(w)
                : a2n(message)
                  ? { ...w, content: sanitizeTextBlocks(w.content) }
                  : w,
            uuid: message.uuid ?? randomUUID_4(),
            requestId: void 0,
            timestamp: message.timestamp ?? new Date().toISOString(),
            ...(message.resumed_from_incomplete_thinking === !0 && { resumedFromIncompleteThinking: !0 }),
            ...(message.is_virtual === !0 && { isVirtual: !0 }),
            ...(message.aborted === !0 && { isAbortedMidStream: !0 }),
            ...(hLr(message) && { isApiErrorMessage: !0 }),
            ...(a2n(message) && { sessionFailureNotice: !0 }),
            ...(Mxo(message.api_error_status) && { apiErrorStatus: message.api_error_status }),
            ...(message.api_error !== void 0 && { apiError: message.api_error }),
            ...(message.api_error_params !== void 0 && { apiErrorParams: message.api_error_params }),
            ...(message.api_error_code !== void 0 && { apiErrorCode: message.api_error_code }),
            ...(message.error !== void 0 && { error: message.error }),
            ...(message.batch_tool_uses !== void 0 &&
              message.batch_tool_uses.length > 0 && { batchToolUses: message.batch_tool_uses }),
            ...(r !== void 0 && { wireToolInputs: r }),
            ...(S !== void 0 && { wireIngestContext: S }),
          },
        ];
      case "user": {
        let content = message.message.content,
          L = Array.isArray(content) ? _Lr(message.tool_result_meta, content) : void 0;
        return [
          {
            type: "user",
            message: message.message,
            uuid: message.uuid ?? randomUUID_4(),
            timestamp: message.timestamp ?? new Date().toISOString(),
            isMeta: message.isSynthetic,
            ...(message.is_virtual === !0 && { isVirtual: !0 }),
            ...(L !== void 0 && { remoteToolDenialKind: L }),
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
              remoteSourced: !0,
            },
          ];
        return [];
      default:
        return [];
    }
  });
}
/**
 * 对 API 错误消息里的文本块做验证信息清洗：保留"API Error: "前缀，清洗其后内容，清洗为空时只留前缀。
 */
//@ chunk-0h4e7gnq.js:36733-36984 placement
function sanitizeApiErrorMessage(e) {
  let n = `${API_ERROR_MESSAGE_PREFIX}: `;
  return {
    ...e,
    content: e.content.map((s) => {
      if (s.type !== "text") return s;
      let startsWith = s.text.startsWith(n),
        r = sanitizeVerificationMessage(startsWith ? s.text.slice(n.length) : s.text);
      if (r === void 0) return { ...s, text: startsWith ? n.trimEnd() : "" };
      return { ...s, text: startsWith ? `${n}${r}` : r };
    }),
  };
}
//@ chunk-0h4e7gnq.js:36984-37073 placement = selectableUserMessagesFilter (1)
function selectableUserMessagesFilter(message) {
  return message.isMeta || message.isVisibleInTranscriptOnly || message.isCompactSummary || void 0;
}
/**
 * 内部 compactMetadata（camelCase）转 SDK compact_metadata（snake_case），含 preserved_segment/preserved_messages。
 */
//@ chunk-0h4e7gnq.js:37073-37997 fingerprint = toSDKCompactMetadata (0.528)
function toSDKCompactMetadata(meta) {
  let { preservedSegment: preservedSegment, preservedMessages: preservedMessages } = meta;
  return {
    trigger: meta.trigger,
    pre_tokens: meta.preTokens,
    ...(meta.postTokens !== void 0 && { post_tokens: meta.postTokens }),
    ...(meta.cumulativeDroppedTokens !== void 0 && {
      cumulative_dropped_tokens: meta.cumulativeDroppedTokens,
    }),
    ...(meta.durationMs !== void 0 && { duration_ms: meta.durationMs }),
    ...(meta.userContext !== void 0 && { user_context: meta.userContext }),
    ...(meta.messagesSummarized !== void 0 && { messages_summarized: meta.messagesSummarized }),
    ...(meta.precomputed !== void 0 && { precomputed: meta.precomputed }),
    ...(meta.preCompactDiscoveredTools !== void 0 && {
      pre_compact_discovered_tools: meta.preCompactDiscoveredTools,
    }),
    ...(meta.preCompactArtifactReadVersions !== void 0 && {
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
        ...(preservedMessages.allUuids !== void 0 && { all_uuids: preservedMessages.allUuids }),
      },
    }),
  };
}
/**
 * SDK compact_metadata 转内部 compactMetadata。
 */
//@ chunk-0h4e7gnq.js:37997-38969 callgraph-witnessed = fromSDKCompactMetadata (0.528)
function fromSDKCompactMetadata(meta) {
  let { preserved_segment: preserved_segment, preserved_messages: preserved_messages } = meta;
  return {
    trigger: meta.trigger,
    preTokens: meta.pre_tokens,
    ...(meta.post_tokens !== void 0 && { postTokens: meta.post_tokens }),
    ...(meta.cumulative_dropped_tokens !== void 0 && {
      cumulativeDroppedTokens: meta.cumulative_dropped_tokens,
    }),
    ...(meta.duration_ms !== void 0 && { durationMs: meta.duration_ms }),
    ...(meta.user_context !== void 0 && { userContext: meta.user_context }),
    ...(meta.messages_summarized !== void 0 && { messagesSummarized: meta.messages_summarized }),
    ...(meta.precomputed !== void 0 && { precomputed: meta.precomputed }),
    ...(meta.pre_compact_discovered_tools !== void 0 && {
      preCompactDiscoveredTools: [...meta.pre_compact_discovered_tools],
    }),
    ...(meta.pre_compact_artifact_read_versions !== void 0 && {
      preCompactArtifactReadVersions: meta.pre_compact_artifact_read_versions.map(
        (pre_compact_artifact_read_version) => ({ ...pre_compact_artifact_read_version }),
      ),
    }),
    ...(preserved_segment && {
      preservedSegment: {
        headUuid: preserved_segment.head_uuid,
        anchorUuid: preserved_segment.anchor_uuid,
        tailUuid: preserved_segment.tail_uuid,
      },
    }),
    ...(preserved_messages && {
      preservedMessages: {
        anchorUuid: preserved_messages.anchor_uuid,
        uuids: [...preserved_messages.uuids],
        ...(preserved_messages.all_uuids !== void 0 && { allUuids: [...preserved_messages.all_uuids] }),
      },
    }),
  };
}
//@ chunk-0h4e7gnq.js:41678-42470 placement
function isAssistantResultComplete(e, n) {
  let s = n === void 0 ? e.wireToolInputs : countToolCallsSince_3(e.wireToolInputs, n, e.batchToolUses),
    y = {
      aborted: e.isAbortedMidStream ? !0 : void 0,
      is_api_error_message: e.isApiErrorMessage === !0 ? !0 : void 0,
      api_error_status: e.apiErrorStatus,
      api_error: e.apiError,
      api_error_params: e.apiErrorParams,
      api_error_code: e.apiErrorCode,
      api_error_origin: e[MESSAGE_MARK_SYMBOLS],
      refused_message_id: e.refusedMessageId,
      resumed_from_incomplete_thinking: e.resumedFromIncompleteThinking === !0 ? !0 : void 0,
      is_virtual: e.isVirtual === !0 ? !0 : void 0,
      batch_tool_uses: e.batchToolUses !== void 0 && e.batchToolUses.length > 0 ? e.batchToolUses : void 0,
      wire_tool_inputs: s !== void 0 && Object.keys(s).length > 0 ? s : void 0,
      wire_ingest_context:
        s !== void 0 && e.wireIngestContext !== void 0
          ? kd(Do(e.wireIngestContext, (r, S) => Object.hasOwn(s, S)))
          : void 0,
    };
  return Do(y, (r) => r !== void 0);
}
/**
 * 生成 SDK 消息的旁白字段：旁白块下标，以及 VS Code 入口下的旁白提示。
 */
//@ chunk-0h4e7gnq.js:42470-42665 placement
function getNarrationFields(e, n) {
  if (!Array.isArray(e)) return {};
  let s = _6s(e);
  if (s.length === 0) return {};
  let y = getEntrypointKind() === "claude-vscode" ? Yr(n) : void 0;
  return { narration_block_indexes: s, ...(y !== void 0 && { narration_hint: y }) };
}
/**
 * 消息只含一个思考块时，生成思考耗时与显示方式字段。
 */
//@ chunk-0h4e7gnq.js:42665-42951 placement
function getThinkingFields(e, n) {
  if (!Array.isArray(n) || e.message.content.length !== 1 || n.length !== 1 || n[0]?.type !== "thinking")
    return {};
  let { thinkingDurationMs: thinkingDurationMs, thinkingDisplay: thinkingDisplay } = e;
  return {
    ...(thinkingDurationMs !== void 0 &&
      Number.isSafeInteger(thinkingDurationMs) &&
      thinkingDurationMs >= 1 && { thinking_duration_ms: thinkingDurationMs }),
    ...(typeof thinkingDisplay === "string" && { thinking_display: thinkingDisplay }),
  };
}
/**
 * 把队列命令附件转成回放用的 SDK user 消息（内容、uuid、时间戳、isReplay，元消息标 isSynthetic，附文件附件与来源）。
 */
//@ chunk-0h4e7gnq.js:42951-43283 placement
function queuedCommandToSdkUser(e, n) {
  let s = parseQueuedCommandAttachment(e, n.uuid);
  if (s === void 0) return;
  return {
    type: "user",
    message: { role: "user", content: s.content },
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: s.uuid,
    timestamp: n.timestamp,
    isReplay: !0,
    ...(s.isMeta && { isSynthetic: !0 }),
    ...(e.fileAttachments?.length && { file_attachments: e.fileAttachments }),
    ...(s.origin && { origin: s.origin }),
  };
}
/**
 * 把用户消息转成 SDK 回放 user 消息（压缩摘要不算回放，标记是否为合成消息）。
 */
//@ chunk-0h4e7gnq.js:43283-43479 placement
function userMessageToSdkReplay(e, n) {
  return {
    type: "user",
    message: { ...e.message, content: Yn(n) },
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: e.uuid,
    timestamp: e.timestamp,
    isReplay: !e.isCompactSummary,
    isSynthetic: selectableUserMessagesFilter(e),
  };
}
/**
 * 内部消息转 SDK 消息：assistant（带 session_id、request_id、tool_use_meta）、user（按来源分类）、system 子类型、附件等。
 */
//@ chunk-0h4e7gnq.js:43479-45297 fingerprint = toSDKMessages (0.431)
function toSDKMessages(e, n) {
  return e.flatMap((message) => {
    switch (message.type) {
      case "assistant": {
        let y = normalizeAssistantMessageForSDK(message),
          r = buildToolDisplayNames(y.content, n);
        return [
          {
            type: "assistant",
            message: y,
            session_id: getSessionId(),
            parent_tool_use_id: null,
            uuid: message.uuid,
            timestamp: message.timestamp,
            error: message.error,
            ...(message.requestId !== void 0 && { request_id: message.requestId }),
            ...isAssistantResultComplete(message),
            ...getNarrationFields(y.content, y.model),
            ...getThinkingFields(message, y.content),
            ...(r.length > 0 && { tool_use_meta: r }),
          },
        ];
      }
      case "user": {
        let y = btt(message);
        switch (y) {
          case "terminal-hint":
            if (typeof message.message.content === "string")
              return [userMessageToSdkReplay(message, message.message.content)];
            break;
          case "stdout":
          case "stderr":
          case void 0:
            break;
          default:
        }
        let r = toolResultRemedy(message);
        return [
          {
            type: "user",
            message: message.message,
            session_id: getSessionId(),
            parent_tool_use_id: null,
            uuid: message.uuid,
            timestamp: message.timestamp,
            isSynthetic: selectableUserMessagesFilter(message),
            ...!1,
            ...(message.toolUseResult !== void 0 && { tool_use_result: message.toolUseResult }),
            ...(r.length > 0 && { tool_result_meta: r }),
            ...(message.origin !== void 0 && { origin: message.origin }),
            ...(message.refusedMessageId !== void 0 && { refused_message_id: message.refusedMessageId }),
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
          let y = localCommandOutputToSDKAssistantMessage(
            message.content,
            message.uuid,
            message.timestamp,
            message.contextUsage,
            message.commandRun,
            message.usageReport,
            message.commandOutcome,
          );
          return y ? [y] : [];
        }
        if (message.subtype === "model_consent_fallback")
          return [
            { ...toSDKModelConsentFallbackMessage(message), uuid: message.uuid, session_id: getSessionId() },
          ];
        return [];
      case "attachment":
        if (message.attachment.type === "hook_system_message")
          return [
            {
              type: "assistant",
              message: createAssistantMessage({ content: formatHookSaysLines(message.attachment) }).message,
              parent_tool_use_id: null,
              is_meta: !0,
              session_id: getSessionId(),
              uuid: message.uuid,
              timestamp: message.timestamp,
            },
          ];
        if (message.attachment.type === "queued_command") {
          let y = queuedCommandToSdkUser(message.attachment, message);
          return y ? [y] : [];
        }
        if (message.attachment.type === "tool_host_result_lines")
          return [toSDKToolHostResultMessage(message.attachment, message.uuid, getSessionId())];
        return [];
      default:
        return [];
    }
  });
}
/**
 * tool_host_result_lines 附件 → SDK system/tool_host_result（host、disposition、label、lines）。
 */
//@ chunk-0h4e7gnq.js:45297-45626 layout
function toSDKToolHostResultMessage(e, n, s) {
  return {
    type: "system",
    subtype: "tool_host_result",
    tool_use_id: e.toolUseID,
    host: { name: e.host, ...(e.workingDir !== void 0 && { working_dir: e.workingDir }) },
    ...(e.disposition !== void 0 && { disposition: e.disposition }),
    ...(e.label !== void 0 && { label: e.label }),
    ...(e.unverified === !0 && { unverified: !0 }),
    lines: e.lines,
    uuid: n,
    session_id: s,
  };
}
/**
 * 本地命令输出（local-command-stdout/stderr 标签）转 SDK assistant 文本消息。
 */
//@ chunk-0h4e7gnq.js:45626-46448 callgraph-witnessed = localCommandOutputToSDKAssistantMessage (0.219)
function localCommandOutputToSDKAssistantMessage(e, n, s, y, r, S, h) {
  let k = Yn(e),
    regExp = new RegExp(`<(${LOCAL_COMMAND_STDOUT}|${LOCAL_COMMAND_STDERR})>`, "g"),
    x = new Set(),
    L = new Set(),
    I = "",
    G = 0;
  for (let match = regExp.exec(k); match !== null && x.size < 2; match = regExp.exec(k)) {
    let z = match[1];
    if (L.has(z)) continue;
    let index = k.indexOf(`</${z}>`, regExp.lastIndex);
    if (index === -1) {
      L.add(z);
      continue;
    }
    let V = index + `</${z}>`.length;
    if (!x.has(z))
      (x.add(z),
        (I += k.slice(G, match.index) + unescapeHtmlEntities(k.slice(regExp.lastIndex, index))),
        (G = V));
    regExp.lastIndex = V;
  }
  let cleanContent = (I + k.slice(G)).trim();
  if (cleanContent === "") return null;
  return {
    type: "assistant",
    message: {
      ...createAssistantMessage({ content: cleanContent }).message,
      stop_reason: "end_turn",
      stop_sequence: null,
    },
    parent_tool_use_id: null,
    local_command_source: e,
    session_id: getSessionId(),
    uuid: n,
    timestamp: s,
    ...(y !== void 0 && { context_usage: y }),
    ...(S !== void 0 && { usage_report: S }),
    ...(r !== void 0 && {
      local_command_run: {
        command: r.command,
        args: r.args,
        ...(r.plugin !== void 0 && { plugin: r.plugin }),
      },
    }),
    ...(h !== void 0 && { local_command_outcome: h }),
  };
}
/**
 * 内部 model_consent_fallback 系统消息转 SDK 字段（original_model、fallback_model、persisted_as_default）。
 */
//@ chunk-0h4e7gnq.js:46448-46697 placement
function toSDKModelConsentFallbackMessage(e) {
  return {
    type: "system",
    subtype: "model_consent_fallback",
    choice: e.choice,
    original_model: e.originalModel,
    original_model_name: e.originalModelName,
    fallback_model: e.fallbackModel,
    persisted_as_default: e.persistedAsDefault,
    content: e.content,
  };
}
/**
 * 给 SDK 的 assistant message：去内部块，ExitPlanMode 的 tool_use 输入补上计划文本。
 */
//@ chunk-0h4e7gnq.js:49182-49444 fingerprint = normalizeAssistantMessageForSDK (1)
function normalizeAssistantMessageForSDK(message) {
  let content = message.message.content;
  if (!Array.isArray(content)) return message.message;
  let normalizedContent = stripMemoryTagsFromBlocks(content).map((block) => {
    if (block.type !== "tool_use") return block;
    if (block.name === EXITPLANMODE_2 && !MCe()) {
      notePlanFileForgotten(getPlanFilePath());
      let plan = getPlan();
      if (plan) return { ...block, input: { ...block.input, plan: plan } };
    }
    return block;
  });
  return { ...message.message, content: normalizedContent };
}
/**
 * 去掉 overageStatus/overageResetsAt/overageDisabledReason 后的限额信息（SDK rate_limit_info）。
 */
//@ chunk-w5ndchqs.js:33580-33674 fingerprint = toSDKRateLimitInfo (0.578)
function toSDKRateLimitInfo(limits) {
  let {
    overageStatus: overageStatus,
    overageResetsAt: overageResetsAt,
    overageDisabledReason: overageDisabledReason,
    ...d
  } = limits;
  return d;
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
  mLr,
  a2n,
  sanitizeApiErrorMessage,
  sanitizeTextBlocks,
  hLr,
  Mxo,
  RFt,
  fromSDKCompactMetadata,
  _Lr,
  toSDKRateLimitInfo,
  toInternalMessages,
  gLr,
  toSDKMessages,
  queuedCommandToSdkUser,
  userMessageToSdkReplay,
  localCommandOutputToSDKAssistantMessage,
  toSDKCompactMetadata,
  toSDKModelConsentFallbackMessage,
};
