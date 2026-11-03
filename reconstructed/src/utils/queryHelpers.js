/**
 * utils/queryHelpers.ts
 *
 * 查询辅助：内部消息 → SDK 流消息（normalizeMessage）、结果成功判定、从历史提取已读文件与 Bash 命令；以及恢复会话时处理孤立权限、延迟工具、交接轮次的执行与补结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/queryHelpers.ts
 * pieces: chunk-0eyv3mzk.js (6), chunk-0h4e7gnq.js (44), chunk-e6aww6q8.js (9)
 * attribution: fingerprint 6, placement 13, file-local 1, affinity 1, layout 38
 */
import { normalize } from "path";
import { yj } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isToolResultOnlyUserMessage } from "../services/api/claude.js";
import { getToolEndsTurnKind } from "../services/tools/mcpResultMeta.js";
import {
  SYNTHETIC_MESSAGES,
  normalizeMessages,
  isNotEmptyMessage,
  subagentFrameResult,
  extractAgentIdsFromMessages_2,
  REJECT_MESSAGE,
  isEmptyUserMessage,
  isAbandonedOrUnsignedThinkingMessage,
  createUserMessage,
  stripThinkingFromIndex,
  isToolResultMessage,
  createCancelledToolResultBlock,
  withMemoryCorrectionHint,
  CANCEL_MESSAGE,
  createUserInterruptionMessage,
} from "./messages.js";
import { getInMemoryErrors, logError } from "./log.js";
import {
  toolResultRemedy,
  buildToolDisplayNames,
  getNarrationFields,
  filterToolUsesWithResults,
  selectableUserMessagesFilter,
  isAssistantResultComplete,
  getThinkingFields,
  toSDKToolHostResultMessage,
  informationalSystemMessage,
} from "./messages/mappers.js";
import { stripMemoryTagsFromBlocks } from "../services/orgMemory/promptIndex.js";
import { getSessionId, isSessionPersistenceDisabled } from "../bootstrap/state.js";
import { MESSAGE_MARK_SYMBOLS_2 } from "./messageKinds.js";
import {
  takeCutResult,
  hasTypeField,
  waitForMcpToolServer,
  isCacheMissReason,
  shouldWaitForMcpTool,
} from "../services/tools/toolExecution.js";
import { AGENT } from "../tools/AgentTool/constants.js";
import { getToolPermissionContext } from "./permissions/toolPermissionContext.js";
import { logForDebugging } from "./debug.js";
import { extractTraceparentContext, runInContext } from "./telemetry/sessionTracing.js";
import { clearCommandAllowRules, applyPollEventToolPermissions } from "./pollEvents.js";
import { runTools } from "../services/tools/toolOrchestration.js";
import { startPhaseWithin, endPhaseWithin, measurePhase, noteStoreConfirmWrite } from "./queryProfiler.js";
import {
  recordTranscript,
  isTranscriptPersistenceDisabled,
  doesMessageExistInSession,
  isChainParticipant,
} from "./sessionStorage.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  capPermissionUpdates_2,
  isSameAnswerInput,
  PERMISSION_UPDATES_LIMIT_MESSAGE,
} from "./permissions/permissionAnswer.js";
import { isAbortError, errorMessage } from "./errors.js";
import { normalizePermissionUpdate } from "./permissions/permissionRulePayload.js";
import { REMOTE_DEVICES } from "../services/mcp/firstPartyServerIds.js";
import { isRemoteToolForwardingSwitchOn } from "../services/remoteTools/servingGates.js";
import {
  withoutGrantsForRemoteScope,
  stripWholeToolGrantsForAsk,
  withoutNewRulesOfMcpSkillLoadForm,
} from "./permissions/permissions.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import {
  getToolNameWithAliases,
  applyPermissionUpdates,
  persistPermissionUpdates,
} from "./permissions/PermissionUpdate.js";
import { mcpInfoFromString } from "../services/mcp/mcpStringUtils.js";
import { ReannounceRequester } from "../remote/tools/reannounceRequest.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { takeLateAllowDecision, recordMcpApprovalTicket_2 } from "../bridge/mcpApprovalTickets.js";
import { isPlainObject } from "./objectUtils.js";
import { findTool } from "../services/api/deferredToolsState.js";
import { currentMcpClients } from "../services/compact/idleToolResultClearing.js";
import {
  CAN_USE_TOOL_INVALID_RESULT_DENY_REASON,
  CAN_USE_TOOL_ABORTED_DENY_REASON,
} from "../types/permissions.js";
import { missingToolTelemetry } from "../services/tools/toolExecutionTelemetry.js";
import { warnLateAllowNeverServed, createLateAnswerBound } from "../hooks/toolPermission/lateAnswerBounds.js";
import { isNonConversationMessage } from "../bootstrap/sessionSlices.js";
import { isTerminalShutdown, heldUntilExit } from "./terminalShutdown.js";
import { getToolCallOutcomeCode } from "./permissions/yoloClassifier.js";
import {
  isToolResultForToolUse,
  findLastToolUseAssistantMessage,
  lastConversationMessage,
} from "./messages/messagePredicates.js";
import { recordToolUseTagged } from "../services/compact/keptTools.js";
import { unwrapAbortReason } from "./abortController.js";
import { setCommandDenyRules } from "./attachments/skillMentions.js";
import { DEVICE_CALL_NOT_SENT_TEXT, notSentNotice } from "./remoteTools/restartNotices.js";
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
import {
  createRemoteFileState,
  contentHashOf,
  stripBomAndCarriageReturn,
  stripBom,
} from "./remoteFileState.js";
import { hasHostField } from "../bridge/deviceRegistration.js";
import { FILE_READ_TOOL_NAME, isImageOrPdfExtension } from "../tools/FileReadTool/constants.js";
import { normalizeReadInputAliases } from "../tools/FileReadTool/inputAliases.js";
import { coerceNumberString } from "../tools/ArtifactTool/publishEdits.js";
import { expandPath, isNotebookPath, expandPathOrNull } from "./path.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { normalizeWriteInputAliases } from "../tools/FileWriteTool/inputAliases.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { isFileUnchangedStub, TRUNCATED_PARTIAL_VIEW_PREFIX } from "../tools/FileReadTool/prompt.js";
import { count } from "./collections.js";
import { stripReminderAndLineNumbers } from "./wireToolInputEcho.js";
import { detectEncodingForResolvedPath } from "./fileRead.js";
import { getFileModificationTime } from "./file.js";
import { toolNameVariants } from "./permissions/permissionRuleParser.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../tools/NotebookEditTool/constants.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { canShortcutAppend } from "../plugins/functionHooks/modAdmission.js";
import { TEXT_PASSTHROUGH_CORES } from "../plugins/functionHooks/coreHandlers.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { identity as identity_2 } from "./identity.js";
import { SHELL_TOOL_NAMES } from "./shell/shellToolUtils.js";
import { parseReferences } from "../history.js";

//@ chunk-0h4e7gnq.js:49711-49721 affinity
/**
 * 10：提取已读文件状态的默认缓存大小。
 */
var READ_FILE_STATE_CACHE_SIZE = 10;
//@ chunk-0h4e7gnq.js:49721-49930 fingerprint = isResultSuccessful (0.89)
/**
 * 结果是否成功：最后块是 text/thinking，或是 tool_result 用户消息，或 stop_reason=end_turn。
 */
function isResultSuccessful(message, stopReason = null) {
  if (!message) return false;
  if (message.type === "assistant") {
    let lastContent = yj(message.message.content);
    return (
      lastContent?.type === "text" ||
      lastContent?.type === "thinking" ||
      lastContent?.type === "redacted_thinking"
    );
  }
  if (isToolResultOnlyUserMessage(message)) return true;
  return stopReason === "end_turn";
}
//@ chunk-0h4e7gnq.js:49930-50143 layout
/**
 * 末尾是 server_error 的 API 错误但前一条已成功、轮次 completed 时可忽略。
 */
function isRecoverableTrailingServerError({ trailing, preceding, terminalReason, retractionExhausted }) {
  return (
    trailing?.type === "assistant" &&
    trailing.isApiErrorMessage === true &&
    trailing.error === "server_error" &&
    terminalReason === "completed" &&
    !retractionExhausted &&
    preceding !== undefined &&
    isToolResultOnlyUserMessage(preceding) &&
    getToolEndsTurnKind(preceding) !== false
  );
}
//@ chunk-0h4e7gnq.js:50143-50288 layout
/**
 * 最后一条与前一条都是文本（且不是合成文本）时取前一条文本作为结果。
 */
function getSalvageableResultText(e, n) {
  let s = yj(e.message.content);
  let y = yj(n?.message.content);
  return s?.type === "text" && !SYNTHETIC_MESSAGES.has(s.text) && y?.type === "text" ? y.text : undefined;
}
//@ chunk-0h4e7gnq.js:50288-50377 layout
/**
 * 内存错误日志中某条之后的错误。
 */
function getRecentErrorLog(e) {
  let inMemoryErrors = getInMemoryErrors();
  let s = e ? inMemoryErrors.lastIndexOf(e) + 1 : 0;
  return inMemoryErrors.slice(s).map((inMemoryError) => inMemoryError.error);
}
//@ chunk-0h4e7gnq.js:50377-50424 layout
/**
 * 空结果诊断：结果类型描述 + 最近错误。
 */
function buildEmptyResultDiagnostics(e, n, s) {
  return [formatResultDiagnostic(e, n), ...getRecentErrorLog(s)];
}
//@ chunk-0h4e7gnq.js:50424-50617 layout
/**
 * "[ede_diagnostic] result_type=… last_content_type=… stop_reason=…"。
 */
function formatResultDiagnostic(e, n) {
  let s = e?.type ?? "undefined";
  let y = e?.type === "assistant" ? (yj(e.message.content)?.type ?? "none") : "n/a";
  return `[ede_diagnostic] result_type=${s} last_content_type=${y} stop_reason=${n}`;
}
//@ chunk-0h4e7gnq.js:50617-50800 layout = countToolCallsSince (1)
/**
 * 首块是 tool_use 或 tool_result 的 user/assistant。覆盖后缀名 countToolCallsSince_3。
 */
function isToolUseOrResultMessage(e) {
  if (e.type !== "assistant" && e.type !== "user") return false;
  let content = e.message.content;
  if (!Array.isArray(content)) return false;
  let s = content[0];
  return s?.type === "tool_use" || s?.type === "tool_result";
}
//@ chunk-0h4e7gnq.js:50800-50859 layout
/**
 * 开启转发且（转发文本或该消息是工具调用/结果）。
 */
function shouldForwardSubagentMessage(bridgeSubagentFrameGate, n) {
  return (
    bridgeSubagentFrameGate.enabled && (bridgeSubagentFrameGate.forwardText || isToolUseOrResultMessage(n))
  );
}
//@ chunk-0h4e7gnq.js:50859-52368 layout
/**
 * 子代理 progress 事件转 SDK 消息（带 parent_tool_use_id、agent_id、subagent_type）。
 */
function* subagentProgressToSDKMessages(e, n) {
  let agentType = e.data.agentType;
  let description = e.data.description;
  let message = e.data.message;
  let S =
    message.type === "user"
      ? toolResultRemedy(message).flatMap(({ id, permission_decision: permissionDecision }) =>
          permissionDecision
            ? [
                {
                  id,
                  permission_decision: permissionDecision,
                },
              ]
            : [],
        )
      : [];
  for (let h of normalizeMessages([message]))
    switch (h.type) {
      case "assistant":
        if (!isNotEmptyMessage(h)) break;
        {
          let toolDisplayNames = buildToolDisplayNames(h.message.content, n);
          let w = stripMemoryTagsFromBlocks(h.message.content);
          let message = e.data.message.type === "assistant" ? e.data.message : undefined;
          yield {
            type: "assistant",
            message:
              w === h.message.content
                ? h.message
                : {
                    ...h.message,
                    content: w,
                  },
            parent_tool_use_id: e.parentToolUseID,
            agent_id: e.data.agentId,
            session_id: getSessionId(),
            uuid: h.uuid,
            timestamp: h.timestamp,
            error: h.error,
            ...(h.requestId !== undefined && {
              request_id: h.requestId,
            }),
            ...(agentType !== undefined && {
              subagent_type: agentType,
            }),
            ...(description !== undefined && {
              task_description: description,
            }),
            ...(h.isApiErrorMessage === true && {
              is_api_error_message: true,
            }),
            ...(h.apiError !== undefined && {
              api_error: h.apiError,
            }),
            ...(h.apiErrorParams !== undefined && {
              api_error_params: h.apiErrorParams,
            }),
            ...(h.apiErrorCode !== undefined && {
              api_error_code: h.apiErrorCode,
            }),
            ...(message?.[MESSAGE_MARK_SYMBOLS_2] !== undefined && {
              api_error_origin: message[MESSAGE_MARK_SYMBOLS_2],
            }),
            ...getNarrationFields(w, h.message.model),
            ...(toolDisplayNames.length > 0 && {
              tool_use_meta: toolDisplayNames,
            }),
          };
        }
        break;
      case "user": {
        let k = filterToolUsesWithResults(S, h.message.content);
        yield {
          type: "user",
          message: h.message,
          parent_tool_use_id: e.parentToolUseID,
          agent_id: e.data.agentId,
          session_id: getSessionId(),
          uuid: h.uuid,
          timestamp: h.timestamp,
          isSynthetic: selectableUserMessagesFilter(h),
          ...false,
          tool_use_result: h.mcpMeta
            ? {
                content: h.toolUseResult,
                ...h.mcpMeta,
              }
            : h.toolUseResult === undefined
              ? subagentFrameResult(h)
              : h.toolUseResult,
          ...(k.length > 0 && {
            tool_result_meta: k,
          }),
          ...(h.origin && {
            origin: h.origin,
          }),
          ...(agentType !== undefined && {
            subagent_type: agentType,
          }),
          ...(description !== undefined && {
            task_description: description,
          }),
        };
        break;
      }
    }
}
//@ chunk-0h4e7gnq.js:52368-52533 layout
/**
 * 取并消费 tool_result 对应的计时记录。
 */
function takeToolResultTiming(message) {
  let content = message.message.content;
  let s = Array.isArray(content) ? content.find((y) => y.type === "tool_result") : undefined;
  return s?.type === "tool_result" ? takeCutResult(s.tool_use_id, message.uuid) : undefined;
}
//@ chunk-0h4e7gnq.js:52533-54292 fingerprint = normalizeMessage (0.374)
/**
 * 内部消息转 SDK 流消息（-p/SDK 输出）：assistant 拆块并过滤空块、progress（子代理/心跳）、user、附件、系统消息。
 */
function* normalizeMessage(message, n) {
  switch (message.type) {
    case "assistant": {
      let supersedesUuids = message.supersedesUuids;
      for (let normalized of normalizeMessages([message])) {
        if (!isNotEmptyMessage(normalized)) continue;
        let r = supersedesUuids;
        supersedesUuids = undefined;
        let toolDisplayNames = buildToolDisplayNames(normalized.message.content, n);
        yield {
          type: "assistant",
          message: normalized.message,
          parent_tool_use_id: null,
          session_id: getSessionId(),
          uuid: normalized.uuid,
          timestamp: normalized.timestamp,
          error: normalized.error,
          ...(normalized.requestId !== undefined && {
            request_id: normalized.requestId,
          }),
          ...(r !== undefined &&
            r.length > 0 && {
              supersedes: r,
            }),
          ...isAssistantResultComplete(message, normalized.message.content),
          ...getNarrationFields(normalized.message.content, normalized.message.model),
          ...getThinkingFields(message, normalized.message.content),
          ...(toolDisplayNames.length > 0 && {
            tool_use_meta: toolDisplayNames,
          }),
        };
      }
      return;
    }
    case "progress":
      if (extractAgentIdsFromMessages_2(message)) yield* subagentProgressToSDKMessages(message, n);
      else if (message.data.type === "tool_heartbeat")
        yield {
          type: "tool_progress",
          tool_use_id: message.toolUseID,
          tool_name: message.data.toolName,
          parent_tool_use_id: message.parentToolUseID,
          elapsed_time_seconds: message.data.elapsedTimeSeconds,
          heartbeat: true,
          session_id: getSessionId(),
          uuid: message.uuid,
        };
      else if (message.data.type === "agent_api_retry")
        yield {
          type: "tool_progress",
          tool_use_id: message.toolUseID,
          tool_name: AGENT,
          parent_tool_use_id: message.parentToolUseID,
          elapsed_time_seconds: 0,
          session_id: getSessionId(),
          uuid: message.uuid,
          subagent_type: message.data.agentType,
          ...(message.data.resolved !== true && {
            subagent_retry: {
              agent_id: message.data.agentId,
              attempt: message.data.attempt,
              max_retries: message.data.maxRetries,
              retry_delay_ms: message.data.retryDelayMs,
              error_status: message.data.errorStatus ?? null,
              error_category: message.data.errorCategory,
            },
          }),
        };
      break;
    case "user": {
      let s = toolResultRemedy(message);
      let y = takeToolResultTiming(message);
      for (let normalized of normalizeMessages([message])) {
        let S = filterToolUsesWithResults(s, normalized.message.content);
        yield {
          type: "user",
          message: normalized.message,
          parent_tool_use_id: null,
          session_id: getSessionId(),
          uuid: normalized.uuid,
          timestamp: normalized.timestamp,
          isSynthetic: selectableUserMessagesFilter(normalized),
          tool_use_result:
            y ??
            (normalized.mcpMeta
              ? {
                  content: normalized.toolUseResult,
                  ...normalized.mcpMeta,
                }
              : normalized.toolUseResult),
          ...(S.length > 0 && {
            tool_result_meta: S,
          }),
          ...undefined,
          ...(normalized.origin && {
            origin: normalized.origin,
          }),
          ...(message.isVirtual === true && {
            is_virtual: true,
          }),
          ...(message.refusedMessageId !== undefined && {
            refused_message_id: message.refusedMessageId,
          }),
        };
      }
      return;
    }
    default:
  }
}
//@ chunk-0h4e7gnq.js:54292-54497 layout
/**
 * tool_host_result_lines、hook_system_message 附件转 SDK 系统消息。
 */
function* attachmentToSDKMessages(message) {
  let { attachment } = message;
  let s;
  try {
    if (attachment.type === "tool_host_result_lines")
      s = toSDKToolHostResultMessage(attachment, message.uuid, getSessionId());
    else if (attachment.type === "hook_system_message")
      s = {
        ...informationalSystemMessage(attachment),
        uuid: message.uuid,
        session_id: getSessionId(),
      };
  } catch (error) {
    logError(error);
  }
  if (s) yield s;
}
//@ chunk-0h4e7gnq.js:54497-56016 layout
/**
 * 恢复延迟的工具调用：在转录里找回 tool_use，重新走 PreToolUse 与执行，结果写回转录。
 */
async function* resumeDeferredToolUse(deferredToolUse, canUseTool, mutableMessages, toolUseContext) {
  let r = !isSessionPersistenceDisabled();
  let S;
  let mode = getToolPermissionContext(toolUseContext).mode;
  if (mode !== deferredToolUse.permissionMode)
    logForDebugging(
      `Deferred tool resume: permissionMode mismatch (deferred under '${deferredToolUse.permissionMode}', resuming under '${mode}'). --resume does not restore permissionMode \u2014 pass --permission-mode ${deferredToolUse.permissionMode} to match.`,
      {
        level: "warn",
      },
    );
  let last = mutableMessages.findLast(
    (I) =>
      I.type === "assistant" &&
      Array.isArray(I.message.content) &&
      I.message.content.some((G) => G.type === "tool_use" && G.id === deferredToolUse.toolUseID),
  );
  if (!last || last.type !== "assistant") {
    logForDebugging(`Deferred tool resume: tool_use ${deferredToolUse.toolUseID} not found in transcript`, {
      level: "warn",
    });
    return;
  }
  let found = last.message.content.find((I) => I.type === "tool_use" && I.id === deferredToolUse.toolUseID);
  if (!found) return;
  logForDebugging(
    `Deferred tool resume: re-emitting ${deferredToolUse.toolName} (${deferredToolUse.toolUseID}) through PreToolUse`,
  );
  let traceparentContext = extractTraceparentContext(deferredToolUse.traceparent);
  toolUseContext.setToolPermissionContext(clearCommandAllowRules);
  let L = runTools([found], [last], canUseTool, toolUseContext)[Symbol.asyncIterator]();
  startPhaseWithin("resume_other", "turn_start_tool_run");
  try {
    while (true) {
      let I = await runInContext(traceparentContext, () => L.next());
      if (I.done) break;
      let G = I.value;
      if (hasTypeField(G)) continue;
      if (G.message) {
        await appendMessageToConversation(mutableMessages, G.message);
        if (r)
          await recordTranscript(mutableMessages, undefined, undefined, undefined, toolUseContext.storageV5);
        if (G.message.type === "progress" || G.message.type === "user") {
          yield* normalizeMessage(
            G.message,
            toolUseContext.options.refreshTools?.() ?? toolUseContext.options.tools,
          );
          continue;
        }
        if (G.message.type === "attachment" && G.message.attachment.type === "hook_deferred_tool")
          S = G.message.attachment;
        yield {
          ...G.message,
          session_id: getSessionId(),
          parent_tool_use_id: null,
        };
      }
    }
  } catch (error) {
    try {
      await L.return?.(undefined);
    } catch {}
    throw error;
  } finally {
    endPhaseWithin("resume_other", "turn_start_tool_run");
    await L.return?.(undefined);
  }
  return S;
}
//@ chunk-0h4e7gnq.js:56016-56067 layout
/**
 * 孤立权限被拒时对消息做的变换（refused / orphaned permission）。
 */
var orphanedPermissionRefusedTransform = DoctorLazy(() =>
  capPermissionUpdates_2("refused", "orphaned permission"),
);
//@ chunk-0h4e7gnq.js:56067-56590 layout
/**
 * 重放工具的 askInputPreparer，判断记录的答案是否仍适用（served/answer_differs/step_failed 等）。
 */
async function replayAskInputPreparer(e, n, s, cardInput, r, toolUseID) {
  let { signal } = r.abortController;
  let k;
  let w = false;
  try {
    let x = await e.askInputPreparer?.(n, r, toolUseID);
    if (x?.prepareAgain === undefined) return;
    if (cardInput === null)
      return {
        ended: "no_record",
      };
    if (Object.keys(s).length === 0)
      return {
        ended: "answer_empty",
      };
    if (!isSameAnswerInput(s, cardInput))
      return {
        ended: "answer_differs",
      };
    let L = await x.prepareAgain(cardInput);
    if (!("error" in L)) {
      k = L.release;
      if (!signal.aborted && isSameAnswerInput(cardInput, L.input))
        return {
          ended: "served",
          input: L.input,
        };
      w = true;
    }
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
  await k?.();
  return {
    ended: signal.aborted ? "aborted" : w ? "step_differs" : "step_failed",
  };
}
//@ chunk-0h4e7gnq.js:56590-56771 layout
/**
 * 重放工具调用时计算应用的权限更新（规范化输入；某些工具或 MCP 服务器只保留非 allow 规则）。
 */
function computePermissionUpdatesForReplay(e, tool, s, toolPermissionContext) {
  let r = normalizePermissionUpdate(e, undefined, toolPermissionContext);
  let S =
    !tool ||
    tool.suppressesAllPermissionUpdates?.(s) === true ||
    (tool.mcpInfo?.serverName === REMOTE_DEVICES && isRemoteToolForwardingSwitchOn())
      ? withoutGrantsForRemoteScope(r)
      : stripWholeToolGrantsForAsk(r, tool, toolPermissionContext);
  return tool?.name === SKILL
    ? withoutNewRulesOfMcpSkillLoadForm(
        getToolNameWithAliases(tool, toolPermissionContext),
        S,
        toolPermissionContext,
      )
    : S;
}
//@ chunk-0h4e7gnq.js:56771-56941 layout
/**
 * MCP 交接调用恢复被中断轮次、当前不能询问时延后（开关 tengu_velvet_gannet）。
 */
function shouldDeferMcpOrphanedAsk(e, n, s) {
  return (
    typeof e === "string" &&
    mcpInfoFromString(e)?.serverName === REMOTE_DEVICES &&
    n.resumesInterruptedTurn === true &&
    !(s.toolState.get(ReannounceRequester).canAsk() && isRemoteToolForwardingSwitchOn()) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_gannet", false)
  );
}
//@ chunk-0h4e7gnq.js:56941-64632 layout
/**
 * 恢复时处理孤立的权限请求：按答案策略重新执行或拒绝对应 tool_use，并补写结果。
 */
async function* handleOrphanedPermission(
  orphanedPermission,
  tools,
  canUseTool,
  mutableMessages,
  processUserInputContext,
  waitForDeviceBridgeTool,
  answers,
) {
  using k = {
    [Symbol.dispose]() {
      let toolUseID = orphanedPermission.permissionResult?.toolUseID;
      if (toolUseID !== undefined) takeLateAllowDecision(processUserInputContext.session, toolUseID);
    },
  };
  switch ((processUserInputContext.setToolPermissionContext(clearCommandAllowRules), answers.kind)) {
    case "strict":
    case "launcher":
      break;
    default:
      logForDebugging(
        `handleOrphanedPermission: dropping orphaned permission \u2014 the answer policy's kind (a ${typeof answers.kind}) is not one this sink knows`,
        {
          level: "warn",
        },
      );
      return {
        reExecuted: false,
        reason: "unknown_answer_policy",
        toolWait: undefined,
        callStarted: false,
      };
  }
  let w = !isSessionPersistenceDisabled();
  let { permissionResult, assistantMessage } = orphanedPermission;
  let { toolUseID } = permissionResult;
  if (!toolUseID) {
    logForDebugging(
      "handleOrphanedPermission: dropping orphaned permission \u2014 permissionResult is missing toolUseID",
      {
        level: "warn",
      },
    );
    return {
      reExecuted: false,
      reason: "no_tool_use_id",
      toolWait: undefined,
      callStarted: false,
    };
  }
  let content = assistantMessage.message.content;
  let ee;
  if (Array.isArray(content)) {
    for (let me of content)
      if (me.type === "tool_use" && me.id === toolUseID) {
        ee = me;
        break;
      }
  }
  if (!ee) {
    logForDebugging(
      `handleOrphanedPermission: dropping orphaned permission for toolUseID=${toolUseID} \u2014 assistant message ${assistantMessage.message.id} has no matching tool_use block`,
      {
        level: "warn",
      },
    );
    return {
      reExecuted: false,
      reason: "no_tool_use_block",
      toolWait: undefined,
      callStarted: false,
    };
  }
  let te = ee.name;
  if (permissionResult.behavior === "deny" && orphanedPermission.denyIsRefusal === true) {
    let toolAliases = processUserInputContext.options.toolAliases;
    if (isPlainObject(ee.input))
      processUserInputContext.onPermissionDenial?.(
        findTool(tools, te, toolAliases) ?? {
          name: te,
        },
        toolUseID,
        ee.input,
      );
    yield* recordToolDenialResult({
      block: ee,
      assistantMessage,
      messageRows: orphanedPermission.messageRows,
      message: permissionResult.message,
      tools,
      context: processUserInputContext,
      mutableMessages,
      persistSession: w,
      toolDenialKind:
        "decisionClassification" in permissionResult &&
        permissionResult.decisionClassification === "user_reject"
          ? "user-rejected"
          : undefined,
      ...(!orphanedPermission.siblings?.length && {
        notSent: orphanedPermission.notSent,
      }),
    });
    let Re = tools;
    let Ie = partitionSiblingRuns(orphanedPermission, Re, toolAliases);
    for (let Ke of new Set(Ie.missingToolNames)) {
      let Ne = await waitForMcpToolServer(Ke, Re, processUserInputContext);
      Re = Ne.tools;
      if (Ne.aborted) break;
    }
    if (
      (orphanedPermission.siblings?.length ?? 0) > 0 &&
      processUserInputContext.abortController.signal.aborted
    ) {
      if (orphanedPermission.notSent?.length)
        yield* await answerCallsNeverSent({
          notSent: orphanedPermission.notSent,
          tools,
          mutableMessages,
          persistSession: w,
          context: processUserInputContext,
        });
      return {
        reExecuted: false,
        reason: "aborted",
        toolWait: undefined,
        callStarted: false,
      };
    }
    if (Ie.missingToolNames.length > 0) Ie = partitionSiblingRuns(orphanedPermission, Re, toolAliases);
    if (Ie.runs.length > 0) {
      let Ke = new Set(Ie.runs.map((run) => run.block.id));
      yield* runToolUsesOnResume({
        runs: Ie.runs,
        tools: Re,
        canUseTool: async (Ne, je, Ee, Le, Ue, Et) => {
          if (Ue === toolUseID)
            return {
              behavior: "deny",
              message:
                typeof permissionResult.message === "string" && permissionResult.message !== ""
                  ? permissionResult.message
                  : REJECT_MESSAGE,
              decisionReason: {
                type: "mode",
                mode: "default",
              },
            };
          return (
            (Ke.has(Ue) ? handleOrphanedPermission_2(Et) : undefined) ?? canUseTool(Ne, je, Ee, Le, Ue, Et)
          );
        },
        executionContext: {
          ...processUserInputContext,
          requireCanUseTool: true,
          ...(Re !== tools && {
            options: {
              ...processUserInputContext.options,
              tools: Re,
              mcpClients: [...currentMcpClients(processUserInputContext)],
            },
          }),
        },
        mutableMessages,
        persistSession: w,
        notSent: orphanedPermission.notSent,
        echoed: new Set([assistantMessage.uuid]),
      });
    } else if (orphanedPermission.siblings?.length)
      yield* await answerCallsNeverSent({
        notSent: orphanedPermission.notSent ?? [],
        tools,
        mutableMessages,
        persistSession: w,
        context: processUserInputContext,
      });
    return {
      reExecuted: true,
      toolWait: undefined,
      ...(await storeHandoffNote(orphanedPermission, mutableMessages, w, processUserInputContext)),
      callStarted: false,
    };
  }
  let R =
    permissionResult.behavior === "allow" && answers.kind === "launcher"
      ? orphanedPermissionRefusedTransform().safeParse(permissionResult.updatedPermissions)
      : undefined;
  let z =
    R?.success === false
      ? {
          behavior: "deny",
          message: `The canUseTool callback returned an invalid permission result. ${PERMISSION_UPDATES_LIMIT_MESSAGE}`,
          toolUseID,
          decisionReason: CAN_USE_TOOL_INVALID_RESULT_DENY_REASON,
          decideLocation: "ask-path",
        }
      : undefined;
  if (z)
    logForDebugging(
      `handleOrphanedPermission: treating the orphaned allow for toolUseID=${toolUseID} as a denial: its updatedPermissions is too long. ${PERMISSION_UPDATES_LIMIT_MESSAGE}`,
      {
        level: "warn",
      },
    );
  let Z = z ?? permissionResult;
  let V = tools;
  let tool = findTool(V, te, processUserInputContext.options.toolAliases);
  let j;
  let missingTool;
  let serverName = typeof te === "string" ? mcpInfoFromString(te)?.serverName : undefined;
  let B = !tool && shouldDeferMcpOrphanedAsk(te, orphanedPermission, processUserInputContext);
  if (!tool) {
    j = await measurePhase("resume_other", "resume_connector_wait", () =>
      B && Z.behavior === "allow"
        ? waitForDeviceBridgeTool(te, tools, processUserInputContext, processUserInputContext.storageV5)
        : waitForMcpToolServer(te, tools, processUserInputContext),
    );
    tool = j.tool;
    V = j.tools;
    if (tool)
      logForDebugging(
        `handleOrphanedPermission: tool "${te}" for toolUseID=${toolUseID} joined the pool after ${j.waitedMs}ms (${j.bridgeEnd ? `the device bridge listed it: ${j.bridgeEnd}` : "its MCP server finished connecting"}); re-executing`,
      );
  }
  if (!tool) {
    let me =
      j !== undefined &&
      !j.aborted &&
      (j.serverState === "connected" ||
        j.serverState === "failed" ||
        j.serverState === "needs-auth" ||
        j.serverState === "disabled") &&
      (Z.behavior === "allow" || Z.behavior === "deny") &&
      orphanedPermission.resumesInterruptedTurn === true &&
      !orphanedPermission.siblings?.length &&
      serverName !== undefined &&
      lastUserAfterAssistant(mutableMessages) &&
      (serverName === REMOTE_DEVICES
        ? B && !isCacheMissReason(j.bridgeEnd)
        : getFeatureValue_CACHED_MAY_BE_STALE("tengu_expressive_church", false));
    logForDebugging(
      j?.aborted
        ? `handleOrphanedPermission: turn aborted while waiting for tool "${te}" (toolUseID=${toolUseID}); not re-executing`
        : `handleOrphanedPermission: ${me ? "closing the call of the" : "dropping"} orphaned permission for toolUseID=${toolUseID} \u2014 tool "${te}" not found in active tools (${V.length} available; MCP server ${j?.serverState ?? "unknown"} after ${j?.waitedMs ?? 0}ms)`,
      {
        level: "warn",
      },
    );
    missingTool =
      j?.aborted || j?.serverState === "unknown"
        ? undefined
        : missingToolTelemetry(te, tools, processUserInputContext);
    if (!me) {
      if (answers.kind === "strict" && Z.behavior === "allow")
        warnLateAllowNeverServed(toolUseID, Z.updatedPermissions);
      let filtered = orphanedPermission.notSent?.filter((Ie) => !Ie.onUsersDevice);
      if (filtered?.length)
        yield* await answerCallsNeverSent({
          notSent: filtered,
          tools,
          mutableMessages,
          persistSession: w,
          context: processUserInputContext,
        });
      return {
        reExecuted: false,
        reason: j?.aborted ? "aborted" : "tool_unavailable",
        toolWait: j,
        missingTool,
        callStarted: false,
      };
    }
    if (Z.behavior === "deny") {
      yield* recordToolDenialResult({
        block: ee,
        assistantMessage,
        messageRows: orphanedPermission.messageRows,
        message: Z.message,
        tools: V,
        context: processUserInputContext,
        mutableMessages,
        persistSession: w,
      });
      if (orphanedPermission.notSent?.length)
        yield* await answerCallsNeverSent({
          notSent: orphanedPermission.notSent,
          tools,
          mutableMessages,
          persistSession: w,
          context: processUserInputContext,
        });
      return {
        reExecuted: false,
        reason: "closed_unrun",
        toolWait: j,
        missingTool,
        callStarted: false,
      };
    }
  }
  let ce =
    V === tools
      ? processUserInputContext
      : {
          ...processUserInputContext,
          options: {
            ...processUserInputContext.options,
            tools: V,
            mcpClients: [...currentMcpClients(processUserInputContext)],
          },
        };
  let Ae;
  if (Z.behavior === "allow") {
    let updatedInput = Z.updatedInput;
    if (updatedInput && Object.keys(updatedInput).length > 0) Ae = updatedInput;
    else {
      Ae = {};
      logForDebugging(
        `Orphaned permission for ${te}: updatedInput is missing or empty, falling back to original tool input`,
        {
          level: "warn",
        },
      );
    }
    let Re = R?.data;
    if (Re)
      try {
        let permissionUpdatesForReplay = computePermissionUpdatesForReplay(
          Re,
          tool,
          ee.input,
          getToolPermissionContext(processUserInputContext),
        );
        processUserInputContext.setSessionToolPermissionContext((Je) =>
          applyPermissionUpdates(Je, permissionUpdatesForReplay),
        );
        await persistPermissionUpdates(permissionUpdatesForReplay, processUserInputContext.storageV5);
      } catch (error) {
        logForDebugging(
          `Orphaned permission for ${te}: applying or persisting updatedPermissions failed: ${error}`,
          {
            level: "warn",
          },
        );
      }
  }
  let Te = new Set((orphanedPermission.siblings ?? []).map((me) => me.toolUseID));
  let O =
    answers.kind === "strict" && Z.behavior === "allow" && Ae !== undefined
      ? createLateAnswerBound(
          answers,
          {
            updatedInput: Ae,
            updatedPermissions: Z.updatedPermissions,
          },
          toolUseID,
          computePermissionUpdatesForReplay,
        )
      : undefined;
  let q;
  let W = tool !== undefined;
  let canUseTool_2 = async (me, Re, Ie, Je, Ke, Ne) => {
    W ||= Ke === toolUseID;
    if (Te.has(Ke)) return handleOrphanedPermission_2(Ne) ?? canUseTool(me, Re, Ie, Je, Ke, Ne);
    if (
      Ke !== toolUseID ||
      (Ne?.behavior === "ask" &&
        Ne.forcedByCaller === true &&
        (Ne.pendingBeforeRestart === true || (Ke === toolUseID && O?.hasServedAllow() === true)))
    )
      return canUseTool(me, Re, Ie, Je, Ke, Ne);
    if (Ne?.behavior === "ask" && Ne.forcedByCaller === true) return Ne;
    let je = z ?? O?.refusalOf(me, Re, Ie, Ie.setSessionToolPermissionContext);
    if (
      je === undefined &&
      Ae !== undefined &&
      orphanedPermission.cardInput !== undefined &&
      Ie.forRemoteExecution !== true
    )
      q ??= replayAskInputPreparer(me, Re, Ae, orphanedPermission.cardInput, Ie, toolUseID);
    let Ee = je === undefined ? await q : undefined;
    if (Ee !== undefined && Ee.ended !== "served")
      return {
        behavior: "deny",
        toolUseID,
        decideLocation: "ask-path",
        ...(Ee.ended === "aborted"
          ? {
              message: "Tool permission request aborted",
              decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
            }
          : {
              message: `The approval of ${me.name} was asked for before Claude Code restarted, and cannot be reused. Call ${me.name} again with the same arguments; it may need approval again. ${me.name} was not called.`,
              decisionReason: {
                type: "other",
                reason: "approval cannot be reused",
              },
            }),
      };
    if (je === undefined && Z.behavior === "allow")
      recordMcpApprovalTicket_2(takeLateAllowDecision(Ie.session, toolUseID), me, toolUseID, Ie);
    return (
      je ?? {
        ...Z,
        updatedInput: Ee?.input ?? Ae,
        decisionReason:
          answers.kind === "strict"
            ? {
                type: "permissionPromptTool",
                permissionPromptToolName: me.name,
                toolResult: Z,
              }
            : {
                type: "mode",
                mode: "default",
              },
      }
    );
  };
  let runs = partitionSiblingRuns(orphanedPermission, V, processUserInputContext.options.toolAliases).runs;
  let Q = new Set();
  yield* runToolUsesOnResume({
    runs: [
      {
        block: ee,
        assistantMessage,
        messageRows: orphanedPermission.messageRows,
      },
      ...runs,
    ],
    tools: V,
    canUseTool: canUseTool_2,
    executionContext: {
      ...ce,
      requireCanUseTool: true,
      markToolCallStarted: Q.add.bind(Q),
    },
    mutableMessages,
    persistSession: w,
    notSent: orphanedPermission.notSent,
  });
  O?.warnIfNeverAsked();
  let Pe = await storeHandoffNote(orphanedPermission, mutableMessages, w, processUserInputContext);
  let callStarted = Q.has(toolUseID);
  if (W) {
    let ended = (await q)?.ended;
    return {
      reExecuted: true,
      toolWait: j,
      ...Pe,
      callStarted,
      ...(ended !== undefined && {
        cardStep: ended,
      }),
    };
  }
  return processUserInputContext.abortController.signal.aborted
    ? {
        reExecuted: false,
        reason: "aborted",
        toolWait: j,
        callStarted,
      }
    : {
        reExecuted: false,
        reason: "closed_unrun",
        toolWait: j,
        missingTool,
        ...Pe,
        callStarted,
      };
}
//@ chunk-0h4e7gnq.js:64632-64828 layout
/**
 * 把交接笔记写进转录并持久化，成功返回 {noteStored:true}。
 */
async function storeHandoffNote(e, n, s, y) {
  if (e.note === undefined || y.abortController.signal.aborted) return {};
  let r = false;
  try {
    await appendMessageToConversation(n, e.note());
    r = true;
    await persistIfNeeded(n, s, y);
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
  return r
    ? {
        noteStored: true,
      }
    : {};
}
//@ chunk-0h4e7gnq.js:64828-64990 layout
/**
 * 从末尾看，真实 user 消息是否出现在 assistant 之前。
 */
function lastUserAfterAssistant(e) {
  for (let j = e.length - 1; j >= 0; j--) {
    let s = e[j];
    if (s.type === "user" && !isEmptyUserMessage(s) && !isNonConversationMessage(s)) return true;
    if (s.type === "assistant" && !isNonConversationMessage(s) && !isAbandonedOrUnsignedThinkingMessage(s))
      return false;
  }
  return false;
}
//@ chunk-0h4e7gnq.js:64990-65843 layout
/**
 * 把拒绝写成 tool_result（is_error）并补回 assistant 行。
 */
async function* recordToolDenialResult({
  block,
  assistantMessage,
  messageRows,
  message,
  tools,
  context,
  mutableMessages,
  persistSession,
  toolDenialKind,
  notSent,
}) {
  if (isTerminalShutdown() && !context.abortController.signal.aborted) await heldUntilExit();
  if (
    !mutableMessages.some(
      (mutableMessage) =>
        mutableMessage.type === "assistant" &&
        Array.isArray(mutableMessage.message.content) &&
        mutableMessage.message.content.some(
          (te) => te.type === "tool_use" && "id" in te && te.id === block.id,
        ),
    )
  ) {
    conversationAppender(mutableMessages).keep(
      messagesToKeepForAssistant(assistantMessage, messageRows, mutableMessages),
    );
    await persistIfNeeded(mutableMessages, persistSession, context);
  }
  yield toSDKAssistantMessage(assistantMessage, tools);
  if (notSent?.length)
    yield* await answerCallsNeverSent({
      notSent,
      tools,
      mutableMessages,
      persistSession,
      context,
    });
  let I = {
    behavior: "deny",
    message: typeof message === "string" && message !== "" ? message : REJECT_MESSAGE,
    toolUseID: block.id,
    decisionReason: {
      type: "mode",
      mode: "default",
    },
  };
  let userMessage = createUserMessage({
    content: [
      {
        type: "tool_result",
        content: I.message,
        is_error: true,
        tool_use_id: block.id,
      },
    ],
    toolUseResult: `Error: ${I.message}`,
    toolDenialKind: toolDenialKind ?? getToolCallOutcomeCode(I),
    sourceToolAssistantUUID: assistantMessage.uuid,
  });
  await appendMessageToConversation(mutableMessages, userMessage);
  await persistIfNeeded(mutableMessages, persistSession, context);
  yield* normalizeMessage(userMessage, tools);
}
//@ chunk-0h4e7gnq.js:65843-66148 layout
/**
 * 交接轮次结果是否已落定（已运行或无需重试）。
 */
function isHandoffTurnSettled(e) {
  if (e.ran) return true;
  switch (e.reason) {
    case "not_stored":
    case "history_appended":
    case "stopped_closed":
    case "stopped_unconfirmed":
      return true;
    case "no_tool_use_block":
    case "tool_unavailable":
    case "already_recorded":
    case "carried_writes_unplaceable":
    case "conversation_moved":
    case "store_refused":
      return false;
  }
}
//@ chunk-0h4e7gnq.js:66148-66424 layout
/**
 * 由交接信息计划 relay 标记行（stopped 时不处理）。
 */
function planRelayMarkerLine(e, { kind, relayMarker, messages }, conversation, storeConfirms) {
  if (!e || relayMarker === undefined || kind === "stopped") return;
  let h;
  try {
    h = e.planRelayFromHandoff({
      relayMarker,
      carried: messages,
      conversation,
      persistSession: !isTranscriptPersistenceDisabled(),
      storeConfirms,
      turnKind: kind,
    });
  } catch (error) {
    logError(error);
    h = {
      arm: false,
    };
  }
  return h.arm ? h.markerLine : undefined;
}
//@ chunk-0h4e7gnq.js:66424-66639 layout
/**
 * 交接的记忆行若已在转录里则丢弃，否则返回。
 */
async function resolveHandoffMemoryLine({ memoryLine }, n, { storageV5 }) {
  if (memoryLine && n && (await doesMessageExistInSession(getSessionId(), memoryLine.uuid, storageV5))) {
    logForDebugging(
      "handleHandedOffTurn: the memory line is already in the transcript; the turn goes on without it",
      {
        level: "warn",
      },
    );
    return;
  }
  return memoryLine;
}
//@ chunk-0h4e7gnq.js:66639-66699 layout
/**
 * 在数组末尾倒数第 n 个位置前插入一行。
 */
function insertBeforeTail(e, n, s) {
  return s ? e.toSpliced(e.length - n + 1, 0, s) : e;
}
//@ chunk-0h4e7gnq.js:66699-66791 layout
/**
 * 从存储的交接信息重新武装 relay，异常只记日志。
 */
function armRelayFromStoredHandoff(e, n, s, y) {
  if (!e || !n) return;
  try {
    e.armRelayFromStoredHandoff(n, s, y);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0h4e7gnq.js:66791-70122 layout
/**
 * 日志自证：处理从其他进程交接来的轮次，校验未回答的 tool_use 与工具池，执行这些工具调用或补写历史。
 */
async function* handleHandedOffTurn(
  handedOffTurn,
  tools,
  conversation,
  processUserInputContext,
  canUseTool,
  beginTranscriptFlush,
  handoffRelay,
  k,
  placeCarriedWrites,
) {
  let x = !isSessionPersistenceDisabled();
  if (handedOffTurn.kind !== "run")
    return yield* appendHandedOffHistory(
      handedOffTurn,
      tools,
      conversation,
      processUserInputContext,
      x,
      beginTranscriptFlush,
      handoffRelay,
    );
  let L = yj(handedOffTurn.messages);
  if (L?.type !== "assistant" || handedOffTurn.toolUseIDs.length === 0) {
    logForDebugging(
      "handleHandedOffTurn: the turn does not end with an assistant message naming tool_uses to run; running nothing",
      {
        level: "warn",
      },
    );
    handedOffTurn.release?.();
    return {
      ran: false,
      reason: "no_tool_use_block",
    };
  }
  let content = Array.isArray(L.message.content) ? L.message.content : [];
  let G = [];
  for (let toolUseID of handedOffTurn.toolUseIDs) {
    let found = content.find((Te) => Te.type === "tool_use" && Te.id === toolUseID);
    let any = conversation.some(
      (Te) =>
        Te.type === "user" &&
        Array.isArray(Te.message.content) &&
        Te.message.content.some((O) => O.type === "tool_result" && O.tool_use_id === toolUseID),
    );
    if (found === undefined || any) {
      logForDebugging(
        `handleHandedOffTurn: tool_use ${toolUseID} is not an unanswered call of the turn's last assistant message; running nothing`,
        {
          level: "warn",
        },
      );
      handedOffTurn.release?.();
      return {
        ran: false,
        reason: "no_tool_use_block",
      };
    }
    if (
      !findTool(tools, found.name, processUserInputContext.options.toolAliases) &&
      !shouldWaitForMcpTool(found.name, processUserInputContext)
    ) {
      logForDebugging(
        `handleHandedOffTurn: tool "${found.name}" for tool_use ${toolUseID} is not in the pool (${tools.length} available); running nothing`,
        {
          level: "warn",
        },
      );
      handedOffTurn.release?.();
      return {
        ran: false,
        reason: "tool_unavailable",
      };
    }
    G.push({
      block: found,
      assistantMessage: L,
    });
  }
  if (isToolResultForToolUse(conversation)) {
    logForDebugging(
      "handleHandedOffTurn: the conversation ends in a call that has no result yet; running nothing",
      {
        level: "warn",
      },
    );
    handedOffTurn.release?.();
    return {
      ran: false,
      reason: "conversation_moved",
    };
  }
  let ee = planRelayMarkerLine(handoffRelay, handedOffTurn, conversation, beginTranscriptFlush !== undefined);
  let messages = handedOffTurn.messages;
  let R = L;
  if (handoffRelay && !ee) {
    R = stripThinkingFromIndex(L);
    messages = [
      ...messages
        .slice(0, -1)
        .map((message) => (message.type === "assistant" ? stripThinkingFromIndex(message) : message)),
      R,
    ];
    for (let B of G) B.assistantMessage = R;
  }
  let handoffMemoryLine = await resolveHandoffMemoryLine(handedOffTurn, x, processUserInputContext);
  if (x) {
    for (let B of ee ? [...messages, ee] : messages)
      if (await doesMessageExistInSession(getSessionId(), B.uuid, processUserInputContext.storageV5)) {
        logForDebugging(
          `handleHandedOffTurn: line ${B.uuid} of the handed-off turn is already in the transcript; running nothing`,
          {
            level: "warn",
          },
        );
        return {
          ran: false,
          reason: "already_recorded",
        };
      }
  }
  processUserInputContext.setToolPermissionContext(clearCommandAllowRules);
  if (placeCarriedWrites && !(await placeCarriedWrites(handedOffTurn, tools, processUserInputContext))) {
    logForDebugging(
      "handleHandedOffTurn: could not write the files of the Write calls the turn brought already answered (the reason is in the turn_handoff_carried_writes diagnostic line); running nothing",
      {
        level: "warn",
      },
    );
    handedOffTurn.release?.();
    return {
      ran: false,
      reason: "carried_writes_unplaceable",
    };
  }
  let Z = beginTranscriptFlush?.();
  let flattened = [handoffMemoryLine, ee, ...messages].flatMap((B) => (B ? [B.uuid] : []));
  conversationAppender(conversation).keep(handoffMemoryLine ? [handoffMemoryLine, ...messages] : messages);
  recordToolUseTagged(messages);
  if (ee) handoffRelay?.beginMarkerLineWrite();
  let le = await measurePhase("resume_other", "resume_store_confirm", async () => {
    if (x) {
      let startTime = performance.now();
      await recordTranscript(
        insertBeforeTail(conversation, messages.length, ee),
        undefined,
        undefined,
        undefined,
        processUserInputContext.storageV5,
      );
      noteStoreConfirmWrite(performance.now() - startTime);
    }
    return Z === undefined || (await Z(processUserInputContext.abortController.signal, flattened)) === true;
  });
  if (Z !== undefined && !le) {
    let B = unwrapAbortReason(processUserInputContext.abortController.signal.reason);
    if (B === "remote-cancel" || B === "user-cancel") {
      let ce = (await Z(AbortSignal.timeout(HANDOFF_CONFIRM_TIMEOUT_MS), flattened)) === true;
      yield* cancelUnansweredToolUses(R, ce, tools, conversation, () =>
        persistIfNeeded(conversation, x, processUserInputContext),
      );
      return {
        ran: false,
        reason: ce ? "stopped_closed" : "stopped_unconfirmed",
      };
    }
    logForDebugging(
      "handleHandedOffTurn: the carried lines were not confirmed stored (dropped by the store, or the turn was interrupted while waiting); running nothing",
      {
        level: "warn",
      },
    );
    return {
      ran: false,
      reason: "not_stored",
    };
  }
  armRelayFromStoredHandoff(handoffRelay, ee, conversation, "run");
  let any = handedOffTurn.messages.some(isHumanTurnMessage);
  if (any) {
    let { alwaysAllowRules, pollEventDeliveryGuard } = getToolPermissionContext(processUserInputContext);
    if (alwaysAllowRules.command !== undefined || pollEventDeliveryGuard !== undefined)
      applyPollEventToolPermissions(processUserInputContext, undefined, undefined);
    setCommandDenyRules(processUserInputContext.setToolPermissionContext, []);
  }
  let lastIndex = conversation.findLastIndex(isHumanTurnMessage);
  return {
    ran: true,
    contextLayers: yield* runToolUsesOnResume({
      runs: G,
      tools,
      canUseTool,
      executionContext: {
        ...processUserInputContext,
        turnStartIndex: any && lastIndex >= 0 ? lastIndex : conversation.length,
      },
      mutableMessages: conversation,
      persistSession: x,
      beforeRun: k && (() => k(processUserInputContext.abortController.signal)),
    }),
  };
}
//@ chunk-0h4e7gnq.js:70122-70218 layout = isHumanTurn (0.779)
/**
 * 覆盖后缀名 isHumanTurn_2。
 */
function isHumanTurnMessage(m) {
  return m.type === "user" && !m.isMeta && !m.toolUseResult && !m.isCompactSummary && !isToolResultMessage(m);
}
//@ chunk-0h4e7gnq.js:70218-70231 layout
/**
 * 15000。
 */
var HANDOFF_CONFIRM_TIMEOUT_MS = 15000;
//@ chunk-0h4e7gnq.js:70231-72415 layout
/**
 * 交接轮次为 history/stopped 时把携带的消息补进对话（检查重复、顺序与会话是否已前进），被打断时补取消结果。
 */
async function* appendHandedOffHistory(e, n, conversation, y, r, S, h) {
  let { kind, messages } = e;
  let lastToolUseAssistantMessage = findLastToolUseAssistantMessage(messages);
  let L =
    conversation.find((B) => B.uuid === lastToolUseAssistantMessage?.uuid) ?? lastToolUseAssistantMessage;
  let I = (B, ce) => {
    logForDebugging(`handleHandedOffTurn: ${ce}; appending nothing`, {
      level: "warn",
    });
    if (B !== "already_recorded") e.release?.();
    return {
      ran: false,
      reason: B,
    };
  };
  if (L?.type !== "assistant") return I("no_tool_use_block", "the turn holds no assistant message to echo");
  let G = () => persistIfNeeded(conversation, r, y);
  let ee = new Set(conversation.map((B) => B.uuid));
  let te = 0;
  while (te < messages.length && ee.has(messages[te].uuid)) te++;
  let sliced = messages.slice(te);
  if (sliced.some((B) => ee.has(B.uuid)))
    return I("already_recorded", "the conversation holds some of the carried lines out of order");
  if (
    te > 0 &&
    !(kind === "history" && sliced.length === 0) &&
    lastConversationMessage(conversation)?.uuid !== messages[te - 1].uuid
  )
    return I("conversation_moved", "the conversation has moved on past the part of the turn it holds");
  if (te === 0 && isToolResultForToolUse(conversation))
    return I("conversation_moved", "the conversation ends in a call that has no result yet");
  if (r) {
    for (let B of sliced)
      if (await doesMessageExistInSession(getSessionId(), B.uuid, y.storageV5))
        return I("already_recorded", `carried message ${B.uuid} is already in the transcript`);
  }
  let z = kind === "history" && te === 0;
  let Z = z ? await resolveHandoffMemoryLine(e, r, y) : undefined;
  let V = z ? planRelayMarkerLine(h, e, conversation, S !== undefined) : undefined;
  if (V && (await doesMessageExistInSession(getSessionId(), V.uuid, y.storageV5))) {
    logForDebugging(
      "handleHandedOffTurn: the marker line is already in the transcript; appending the turn without it",
      {
        level: "warn",
      },
    );
    V = undefined;
  }
  let le = S?.();
  if (sliced.length > 0) {
    conversationAppender(conversation).keep(Z ? [Z, ...sliced] : sliced);
    recordToolUseTagged(sliced);
    if (V) h?.beginMarkerLineWrite();
    await persistIfNeeded(insertBeforeTail(conversation, sliced.length, V), r, y);
  }
  let j =
    le === undefined ||
    (await le(
      AbortSignal.timeout(HANDOFF_CONFIRM_TIMEOUT_MS),
      [Z, V, ...messages].flatMap((B) => (B ? [B.uuid] : [])),
    ));
  let ie = j === true;
  let index = conversation.findIndex((B) => B.uuid === messages[0]?.uuid);
  if (
    j === "refused" &&
    kind === "history" &&
    index >= 0 &&
    conversation.findLast(isChainParticipant)?.uuid === messages.at(-1)?.uuid
  ) {
    let B = conversation[index - 1];
    if (B?.type === "attachment" && B.attachment.type === "cowork_memory_context") index--;
    conversation.splice(index);
    logForDebugging("handleHandedOffTurn: the store refused lines of the turn; removed it, echoing nothing", {
      level: "warn",
    });
    return {
      ran: false,
      reason: "store_refused",
    };
  }
  if (kind === "stopped") yield* cancelUnansweredToolUses(L, ie, n, conversation, G);
  else if (ie) {
    armRelayFromStoredHandoff(h, V, conversation, "history");
    yield toSDKAssistantMessage(L, n);
  }
  if (!ie) {
    logForDebugging("handleHandedOffTurn: the carried lines were not confirmed stored; echoing nothing", {
      level: "warn",
    });
    return {
      ran: false,
      reason: kind === "stopped" ? "stopped_unconfirmed" : "not_stored",
    };
  }
  return {
    ran: false,
    reason: kind === "stopped" ? "stopped_closed" : "history_appended",
  };
}
//@ chunk-0h4e7gnq.js:72415-72947 layout
/**
 * 给未回答的 tool_use 补已取消结果并追加中断消息。
 */
async function* cancelUnansweredToolUses(e, n, s, y, r) {
  if (n) yield toSDKAssistantMessage(e, s);
  let S = new Set();
  for (let x of y)
    if (x.type === "user" && Array.isArray(x.message.content)) {
      for (let L of x.message.content) if (L.type === "tool_result") S.add(L.tool_use_id);
    }
  let mapped = (
    Array.isArray(e.message.content)
      ? e.message.content.filter((x) => x.type === "tool_use" && !S.has(x.id))
      : []
  ).map((x) =>
    createUserMessage({
      content: [
        {
          ...createCancelledToolResultBlock(x.id),
          content: withMemoryCorrectionHint(CANCEL_MESSAGE),
        },
      ],
      toolUseResult: CANCEL_MESSAGE,
      toolDenialKind: "cancelled",
      sourceToolAssistantUUID: e.uuid,
    }),
  );
  let userInterruptionMessage = createUserInterruptionMessage({
    toolUse: true,
  });
  for (let x of [...mapped, userInterruptionMessage]) {
    await appendMessageToConversation(y, x);
    await r();
    if (n) yield* normalizeMessage(x, s);
  }
}
//@ chunk-0h4e7gnq.js:72947-73022 layout
/**
 * 需要持久化时把对话写入会话存储。
 */
async function persistIfNeeded(e, n, s) {
  if (n) await recordTranscript(e, undefined, undefined, undefined, s.storageV5);
}
//@ chunk-0h4e7gnq.js:73022-73332 layout
/**
 * 内部 assistant 消息转 SDK assistant 消息（session_id、request_id、tool_use_meta）。
 */
function toSDKAssistantMessage(e, tools) {
  let toolDisplayNames = buildToolDisplayNames(e.message.content, tools);
  return {
    type: "assistant",
    message: e.message,
    parent_tool_use_id: null,
    session_id: getSessionId(),
    uuid: e.uuid,
    timestamp: e.timestamp,
    error: e.error,
    ...(e.requestId !== undefined && {
      request_id: e.requestId,
    }),
    ...isAssistantResultComplete(e),
    ...getNarrationFields(e.message.content, e.message.model),
    ...(toolDisplayNames.length > 0 && {
      tool_use_meta: toolDisplayNames,
    }),
  };
}
//@ chunk-0h4e7gnq.js:73332-73629 layout
/**
 * 补写 assistant 行时决定保留哪些同轮消息。
 */
function messagesToKeepForAssistant(e, messageRows, mutableMessages) {
  if (
    messageRows === undefined ||
    !messageRows.some((r) => r.uuid === e.uuid) ||
    messageRows.some(
      (r) =>
        r.resumedFromIncompleteThinking === true ||
        (r.uuid !== e.uuid &&
          Array.isArray(r.message.content) &&
          r.message.content.some((S) => S.type === "tool_use")),
    )
  )
    return [e];
  let y = new Set(mutableMessages.map((r) => r.uuid));
  return messageRows.filter((r) => !y.has(r.uuid));
}
//@ chunk-0h4e7gnq.js:73629-74539 layout
/**
 * 日志自证：对从未发出的工具调用补 is_error 结果。
 */
async function answerCallsNeverSent({ notSent, tools, mutableMessages, persistSession, context }) {
  let S = [];
  let h = new Set(notSent.map((k) => k.toolUseID));
  for (let { toolUseID, assistantMessage, host, onUsersDevice } of notSent)
    try {
      if (
        !mutableMessages.some(
          (mutableMessage) =>
            mutableMessage.type === "assistant" &&
            Array.isArray(mutableMessage.message.content) &&
            mutableMessage.message.content.some((R) => R.type === "tool_use" && R.id === toolUseID),
        )
      ) {
        if (
          Array.isArray(assistantMessage.message.content) &&
          assistantMessage.message.content.some((R) => R.type === "tool_use" && !h.has(R.id))
        ) {
          logForDebugging(
            `answerCallsNeverSent: toolUseID=${toolUseID} shares its row with a call this batch does not answer; left unanswered`,
          );
          continue;
        }
        conversationAppender(mutableMessages).keep([assistantMessage]);
        S.push(toSDKAssistantMessage(assistantMessage, tools));
      }
      let G = onUsersDevice ? DEVICE_CALL_NOT_SENT_TEXT : notSentNotice(host);
      let userMessage = createUserMessage({
        content: [
          {
            type: "tool_result",
            content: G,
            is_error: true,
            tool_use_id: toolUseID,
          },
        ],
        toolUseResult: `Error: ${G}`,
        sourceToolAssistantUUID: assistantMessage.uuid,
      });
      await appendMessageToConversation(mutableMessages, userMessage);
      await persistIfNeeded(mutableMessages, persistSession, context);
      S.push(...normalizeMessage(userMessage, tools));
    } catch (error) {
      if (isAbortError(error))
        logForDebugging(`answerCallsNeverSent: turn stopped before toolUseID=${toolUseID} got its result`);
      else logError(error);
    }
  return S;
}
//@ chunk-0h4e7gnq.js:74539-75821 layout
/**
 * 恢复时执行一批 tool_use：补写 assistant 行、执行工具并把结果写入转录与 SDK 输出。
 */
async function* runToolUsesOnResume({
  runs,
  tools,
  canUseTool,
  executionContext,
  mutableMessages,
  persistSession,
  beforeRun,
  notSent,
  echoed,
}) {
  let assistantMessages = Ji(
    runs.map((run) => run.assistantMessage),
    (I) => I.uuid,
  );
  for (let I of assistantMessages) {
    let filtered = runs.filter((run) => run.assistantMessage.uuid === I.uuid);
    let mapped = filtered.map((R) => R.block.id);
    if (
      !mutableMessages.some(
        (mutableMessage) =>
          mutableMessage.type === "assistant" &&
          Array.isArray(mutableMessage.message.content) &&
          mutableMessage.message.content.some(
            (z) => z.type === "tool_use" && "id" in z && mapped.includes(z.id),
          ),
      )
    ) {
      conversationAppender(mutableMessages).keep(
        messagesToKeepForAssistant(
          I,
          filtered.find((R) => R.messageRows !== undefined)?.messageRows,
          mutableMessages,
        ),
      );
      if (persistSession)
        await recordTranscript(mutableMessages, undefined, undefined, undefined, executionContext.storageV5);
    }
    if (!echoed?.has(I.uuid)) yield toSDKAssistantMessage(I, tools);
  }
  if (notSent?.length)
    yield* await answerCallsNeverSent({
      notSent,
      tools,
      mutableMessages,
      persistSession,
      context: executionContext,
    });
  if (beforeRun)
    try {
      await beforeRun();
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  let permissionLayers = executionContext.permissionLayers;
  startPhaseWithin("resume_other", "turn_start_tool_run");
  try {
    for await (let I of runTools(
      runs.map((run) => run.block),
      assistantMessages,
      canUseTool,
      executionContext,
    )) {
      if (hasTypeField(I)) continue;
      permissionLayers = I.newContext.permissionLayers;
      if (I.message) {
        await appendMessageToConversation(mutableMessages, I.message);
        if (persistSession)
          await recordTranscript(
            mutableMessages,
            undefined,
            undefined,
            undefined,
            executionContext.storageV5,
          );
        if (I.message.type === "progress" || I.message.type === "user") {
          yield* normalizeMessage(I.message, executionContext.options.refreshTools?.() ?? tools);
          continue;
        }
        if (I.message.type === "attachment") {
          yield* attachmentToSDKMessages(I.message);
          continue;
        }
        yield {
          ...I.message,
          session_id: getSessionId(),
          parent_tool_use_id: null,
        };
      }
    }
  } finally {
    endPhaseWithin("resume_other", "turn_start_tool_run");
  }
  return permissionLayers;
}
//@ chunk-0h4e7gnq.js:75821-78840 fingerprint = extractReadFilesFromMessages (0.37)
/**
 * 从历史 Read/Write/Edit 调用与结果重建 readFileState（内容与时间戳，LRU 上限），跳过有截断提示的读取。
 */
function extractReadFilesFromMessages(messages, cwd, maxSize = READ_FILE_STATE_CACHE_SIZE) {
  let cache = createRemoteFileState(maxSize);
  let fileReadToolUseIds = new Map();
  let fileWriteToolUseIds = new Map();
  let fileEditToolUseIds = new Map();
  let k = new Set();
  for (let message of messages) {
    if (message.type === "attachment" && message.attachment.type === "read_truncation_notice") {
      k.add(message.attachment.toolUseID);
      continue;
    }
    if (message.type === "assistant" && Array.isArray(message.message.content))
      for (let content of message.message.content) {
        if (content.type !== "tool_use") continue;
        if (hasHostField(content.input)) continue;
        try {
          if (content.name === FILE_READ_TOOL_NAME) {
            let input = normalizeReadInputAliases(content.input)?.input ?? content.input;
            let le = coerceNumberString(input?.offset);
            let j = coerceNumberString(input?.limit);
            if (
              typeof input?.file_path === "string" &&
              (le === undefined || (typeof le === "number" && Number.isInteger(le) && le >= 0)) &&
              (j === undefined || (typeof j === "number" && Number.isInteger(j) && j >= 1))
            )
              fileReadToolUseIds.set(content.id, {
                filePath: expandPath(input.file_path, cwd),
                offset: le,
                limit: j,
              });
          } else if (content.name === FILE_WRITE_TOOL_NAME) {
            let input = normalizeWriteInputAliases(content.input)?.input ?? content.input;
            if (typeof input?.file_path === "string" && typeof input.content === "string")
              fileWriteToolUseIds.set(content.id, {
                filePath: expandPath(input.file_path, cwd),
                content: input.content,
              });
          } else if (content.name === FILE_EDIT_TOOL_NAME) {
            let input = content.input;
            if (typeof input?.file_path === "string")
              fileEditToolUseIds.set(content.id, expandPath(input.file_path, cwd));
          }
        } catch (error) {
          logForDebugging(
            `extractReadFilesFromMessages: skipping malformed ${content.name} tool_use: ${error}`,
          );
        }
      }
  }
  let w = new Set();
  let remoteFileState = createRemoteFileState(maxSize);
  let L = [];
  let I = (R, z) => {
    w.add(normalize(R));
    remoteFileState.set(R, z);
    L.push(R);
  };
  let G = isRemoteToolForwardingSwitchOn()
    ? new Set(
        [...fileWriteToolUseIds.values()]
          .map((R) => R.filePath)
          .concat([...fileEditToolUseIds.values()])
          .map((R) => normalize(R)),
      )
    : undefined;
  let ee = new Map();
  let te = (R, z) => {
    let Z = normalize(R);
    let V = remoteFileState.get(R);
    remoteFileState.set(R, z);
    remoteFileState.set(R, V);
    ee.delete(Z);
  };
  e: for (let idx = messages.length - 1; idx >= 0; idx--) {
    let z = messages[idx];
    if (z.type !== "user" || !Array.isArray(z.message.content)) continue;
    let content = z.message.content;
    for (let idx = content.length - 1; idx >= 0; idx--) {
      let le = content[idx];
      if (le.type !== "tool_result" || !le.tool_use_id) continue;
      let readFilePath = fileReadToolUseIds.get(le.tool_use_id);
      let ie = readFilePath && normalize(readFilePath.filePath);
      let he = ie !== undefined && !w.has(ie) && w.size < maxSize;
      if (
        readFilePath &&
        (he || ee.has(ie)) &&
        le.is_error !== true &&
        typeof le.content === "string" &&
        !isFileUnchangedStub(le.content) &&
        z.timestamp
      ) {
        let toolUseResult = z.toolUseResult;
        let ue =
          toolUseResult?.file?.truncatedByTokenCap === true ||
          k.has(le.tool_use_id) ||
          le.content.startsWith("<system-reminder>" + TRUNCATED_PARTIAL_VIEW_PREFIX);
        let pe;
        let content_2 = toolUseResult?.file?.content;
        if (
          (content.length === 1 || count(content, (Ce) => Ce.type === "tool_result") === 1) &&
          typeof content_2 === "string" &&
          content_2 !== ""
        )
          pe = content_2.trim();
        else pe = stripReminderAndLineNumbers(le.content);
        if (!he) {
          if (contentHashOf(pe) !== ee.get(ie)) ee.delete(ie);
        } else {
          let timestamp = new Date(z.timestamp).getTime();
          let me = isNotebookPath(readFilePath.filePath);
          I(readFilePath.filePath, {
            content: pe,
            timestamp,
            offset: me ? 1 : (readFilePath.offset ?? 1),
            limit: me ? undefined : readFilePath.limit,
            ...(ue && {
              isPartialView: true,
            }),
            contentFromTranscript: true,
          });
          if (G?.has(ie)) ee.set(ie, remoteFileState.get(readFilePath.filePath).contentHash);
        }
      }
      let writeToolData = fileWriteToolUseIds.get(le.tool_use_id);
      let ce = writeToolData && normalize(writeToolData.filePath);
      let Ae = ce !== undefined && !w.has(ce) && w.size < maxSize;
      if (writeToolData && (Ae || ee.has(ce)) && le.is_error !== true && z.timestamp) {
        let timestamp = new Date(z.timestamp).getTime();
        let ue = {
          content: stripBomAndCarriageReturn(writeToolData.content),
          timestamp,
          offset: undefined,
          limit: undefined,
        };
        if (Ae) I(writeToolData.filePath, ue);
        else te(writeToolData.filePath, ue);
      }
      let editFilePath = fileEditToolUseIds.get(le.tool_use_id);
      let O = editFilePath && normalize(editFilePath);
      let q = O !== undefined && !w.has(O) && w.size < maxSize;
      if (editFilePath && (q || ee.has(O)) && le.is_error !== true)
        try {
          let { content: diskContent } = detectEncodingForResolvedPath(editFilePath);
          let ue = {
            content: stripBom(diskContent),
            timestamp: getFileModificationTime(editFilePath),
            offset: undefined,
            limit: undefined,
            contentNotInModelContext: true,
          };
          if (q) I(editFilePath, ue);
          else te(editFilePath, ue);
        } catch (error) {
          logForDebugging(
            `extractReadFilesFromMessages: skipping Edit disk read for ${editFilePath}: ${errorMessage(error)}`,
          );
        }
      if (w.size >= maxSize && ee.size === 0) break e;
    }
  }
  for (let j = L.length - 1; j >= 0; j--) {
    let z = L[j];
    cache.set(z, remoteFileState.get(z));
  }
  return cache;
}
//@ chunk-0h4e7gnq.js:78840-80094 layout
/**
 * 日志自证：收集回退时需重新追踪的文件路径（编辑类工具、文件附件、记忆附件）。
 */
function collectRewoundFileTrackingPaths(e, n, toolAliases) {
  let y = [];
  let r = [];
  let S = [];
  for (let h of e) {
    if (h.type === "assistant") {
      if (!Array.isArray(h.message.content)) continue;
      for (let w of h.message.content) {
        if (!isPlainObject(w) || w.type !== "tool_use" || !isPlainObject(w.input) || hasHostField(w.input))
          continue;
        let input = w.input;
        let last = toolNameVariants(w.name, toolAliases).at(-1);
        let I =
          last === NOTEBOOK_EDIT_TOOL_NAME
            ? input.notebook_path
            : last === FILE_READ_TOOL_NAME || last === FILE_EDIT_TOOL_NAME || last === FILE_WRITE_TOOL_NAME
              ? input.file_path
              : undefined;
        if (typeof I !== "string") continue;
        if (last === FILE_READ_TOOL_NAME && isImageOrPdfExtension(I)) continue;
        let G = expandPathOrNull(I, n);
        if (G !== normalize(I)) S.push(I);
        if (G === null) {
          logForDebugging(
            `collectRewoundFileTrackingPaths: skipping ${w.name} tool_use: its path cannot be resolved`,
          );
          continue;
        }
        y.push(G);
      }
    }
    if (h.type !== "attachment") continue;
    let attachment = h.attachment;
    if (attachment.type === "file") {
      let w = attachment.content?.type;
      if (w !== "image" && w !== "pdf" && w !== "parts")
        try {
          y.push(expandPath(attachment.filename, n));
        } catch (error) {
          logForDebugging(
            `collectRewoundFileTrackingPaths: skipping malformed file attachment: ${errorMessage(error)}`,
          );
        }
    } else if (attachment.type === "nested_memory") {
      if (typeof attachment.path === "string") r.push(attachment.path);
    } else if (attachment.type === "relevant_memories") {
      if (Array.isArray(attachment.memories)) {
        for (let memory of attachment.memories) if (typeof memory?.path === "string") y.push(memory.path);
      }
    } else if (attachment.type === "edited_text_file")
      try {
        y.push(expandPath(attachment.filename, n));
      } catch (error) {
        logForDebugging(
          `collectRewoundFileTrackingPaths: skipping malformed edited_text_file attachment: ${errorMessage(error)}`,
        );
      }
  }
  return {
    readFilePaths: y,
    nestedMemoryPaths: r,
    spelledFilePaths: S,
  };
}
//@ chunk-0h4e7gnq.js:80094-80199 layout
/**
 * 追加一条消息到对话（失败时直接 push 去重）。
 */
async function appendMessageToConversation(mutableMessages, n) {
  try {
    await appendRowsWithHooks(conversationAppender(mutableMessages), [n]);
  } catch (error) {
    logError(error);
    if (!mutableMessages.some((y) => y.uuid === n.uuid)) mutableMessages.push(n);
  }
}
//@ chunk-0h4e7gnq.js:80199-80248 layout
/**
 * 对话追加器（把行 push 到数组）。
 */
function conversationAppender(mutableMessages) {
  return rowSourceFor(mutableMessages, (n) => {
    mutableMessages.push(...n);
  });
}
//@ chunk-0h4e7gnq.js:80248-80630 layout
/**
 * 把兄弟调用分成可运行（工具在池中）与缺失工具两类。
 */
function partitionSiblingRuns(e, n, toolAliases) {
  let y = [];
  let r = [];
  let missingBlocks = false;
  for (let h of e.siblings ?? []) {
    let k = Array.isArray(h.assistantMessage.message.content)
      ? h.assistantMessage.message.content.find((w) => w.type === "tool_use" && w.id === h.toolUseID)
      : undefined;
    if (k === undefined) missingBlocks = true;
    else if (findTool(n, k.name, toolAliases))
      y.push({
        block: k,
        assistantMessage: h.assistantMessage,
      });
    else r.push(k.name);
  }
  return {
    runs: y,
    missingToolNames: r,
    missingBlocks,
  };
}
//@ chunk-0h4e7gnq.js:80630-80820 fingerprint = handleOrphanedPermission (0.365)
/**
 * 孤立权限的决定：被调用方强制询问时保留 ask（重启前挂起的除外），否则视为允许。
 */
function handleOrphanedPermission_2(e) {
  if (e?.behavior === "ask" && e.forcedByCaller === true)
    return e.pendingBeforeRestart === true ? undefined : e;
  return {
    behavior: "allow",
    updatedInput: {},
    decisionReason: {
      type: "mode",
      mode: "default",
    },
  };
}
//@ chunk-0h4e7gnq.js:80820-80991 placement
/**
 * 判断从下标 n 起的消息中是否已有指定 tool_use_id 的 tool_result。
 */
function hasToolResultAfter(mutableMessages, n, toolUseID) {
  return mutableMessages
    .slice(n)
    .some(
      (y) =>
        y.type === "user" &&
        Array.isArray(y.message.content) &&
        y.message.content.some((r) => r.type === "tool_result" && r.tool_use_id === toolUseID),
    );
}
//@ chunk-e6aww6q8.js:4735394-4735466 placement
/**
 * appendHookableFastPath：可走快路径的 session.append。
 */
function appendHookableFastPath() {
  return hasModuleHookingSite("session.append", undefined, canShortcutAppend("session.append"));
}
//@ chunk-e6aww6q8.js:4735466-4735716 placement
/**
 * 把行追加到会话：无钩子时直接保留，有 session.append 钩子时按顺序经钩子处理（期间发生裁剪则不保留）。
 */
function appendRowsWithHooks(e, n, r = {}) {
  let s = TEXT_PASSTHROUGH_CORES.get();
  if (s === null || !e.isHookable || !appendHookableFastPath()) {
    if (r.fills !== true) (r.keep ?? e.keep)(n);
    return n;
  }
  let y = e.cuts();
  let keep = r.keep ?? e.keep;
  return e.inOrder(async () =>
    (await s()).rowsAppendedTo(e, n, {
      ...r,
      keep: (w) => {
        if (e.cuts() === y) keep(w);
      },
    }),
  );
}
//@ chunk-e6aww6q8.js:4735716-4735831 placement
function createRowSourceRegistry() {
  let weakMap = new WeakMap();
  return {
    noted: (n) => {
      if (n.list !== undefined) weakMap.set(n.list, n);
      return n;
    },
    of: (n) => weakMap.get(n),
  };
}
//@ chunk-e6aww6q8.js:4735831-4735845 placement
var rowSourceRegistry = createRowSourceRegistry();
//@ chunk-e6aww6q8.js:4735845-4736347 placement
/**
 * 为行来源加上顺序追加能力：inOrder 串行执行、裁剪计数、等待追加完成、附加循环收集新到的行。
 */
function createOrderedRowSource(e) {
  let resolved = Promise.resolve();
  let r = 0;
  let s = 0;
  let h = new Set();
  function y(S) {
    r += 1;
    let w = resolved.then(S);
    let { appendsInFlight } = getPluginRegistry();
    let G = () => {
      r -= 1;
      appendsInFlight.delete(w);
    };
    appendsInFlight.add(w);
    resolved = w.then(G, G);
    return w;
  }
  return {
    ...e,
    inOrder: y,
    cut: () => {
      s += 1;
    },
    cuts: () => s,
    behindAppends: (S) => {
      if (r === 0) {
        S();
        return;
      }
      return y(() => {
        S();
        return Promise.resolve();
      });
    },
    settled: () => resolved,
    attachLoop: () => {
      let S = {
        rows: [],
      };
      h.add(S);
      return {
        taken: () => {
          let rows = S.rows;
          S.rows = [];
          return rows;
        },
        [Symbol.dispose]: () => {
          h.delete(S);
        },
      };
    },
    arrived: (S) => {
      for (let w of h) w.rows = [...w.rows, ...S];
    },
  };
}
//@ chunk-e6aww6q8.js:4736347-4736378 placement
/**
 * orderedRowSource：登记有序行来源。
 */
var orderedRowSource = (e) => rowSourceRegistry.noted(createOrderedRowSource(e));
//@ chunk-e6aww6q8.js:4736378-4736443 placement
var rowSourceFor = (e, keep) =>
  rowSourceRegistry.of(e) ??
  orderedRowSource({
    keep,
    rows: () => e,
    isHookable: false,
  });
//@ chunk-e6aww6q8.js:4736443-4736600 placement
function createRunningTurnRegistry() {
  let e = new Map();
  return {
    running: (n, r) => {
      e.set(n, r);
      return {
        [Symbol.dispose]: () => {
          if (e.get(n) === r) e.delete(n);
        },
      };
    },
    of: (n) => e.get(n),
    clear: () => {
      e.clear();
    },
  };
}
//@ chunk-e6aww6q8.js:4736600-4736633 placement
/**
 * runningTurnRegistry：运行中回合登记表。
 */
var runningTurnRegistry = identity_2(createRunningTurnRegistry(), (e) => e.clear());
//@ chunk-0eyv3mzk.js:227-501 fingerprint = extractBashToolsFromMessages (1)
/**
 * 遍历 assistant 里 Bash 类 tool_use 的 command 字符串。
 */
function* extractBashToolsFromMessages(messages) {
  for (let message of messages)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let content of message.message.content)
        if (content.type === "tool_use" && SHELL_TOOL_NAMES.includes(content.name)) {
          let { input } = content;
          if (
            typeof input === "object" &&
            input !== null &&
            "command" in input &&
            typeof input.command === "string"
          )
            yield input.command;
        }
    }
}
//@ chunk-0eyv3mzk.js:501-584 placement
/**
 * 历史中 Bash 命令用到的 CLI 名集合。
 */
function extractBashCliNames(messages) {
  let s = new Set();
  for (let e of extractBashToolsFromMessages(messages)) {
    let cliName = extractCliName(e);
    if (cliName) s.add(cliName);
  }
  return s;
}
//@ chunk-0eyv3mzk.js:839-923 placement
/**
 * referencedBashToolNames：从消息里的 Bash 工具调用提取引用的工具名。
 */
function referencedBashToolNames(messages) {
  let s = new Set();
  for (let e of extractBashToolsFromMessages(messages)) for (let t of parseReferences(e)) s.add(t);
  return s;
}
//@ chunk-0eyv3mzk.js:923-1104 placement = countToolCallsSince (1)
function collectUsedToolNames(n) {
  let s = new Set();
  for (let message of n)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let t of message.message.content) if (t.type === "tool_use") s.add(t.name);
    }
  return s;
}
//@ chunk-0eyv3mzk.js:1104-1128 fingerprint = STRIPPED_COMMANDS (1)
/**
 * 取 CLI 名时跳过的前缀命令（sudo）。
 */
var STRIPPED_COMMANDS = new Set(["sudo"]);
//@ chunk-0eyv3mzk.js:1128-1273 file-local
/**
 * 取命令第一个非 VAR=值 赋值、非 sudo 的词。
 */
function extractCliName(command) {
  if (!command) return;
  let tokens = command.trim().split(/\s+/);
  for (let token of tokens) {
    if (/^[A-Za-z_]\w*=/.test(token)) continue;
    if (STRIPPED_COMMANDS.has(token)) continue;
    return token;
  }
  return;
}
export {
  normalizeMessage,
  isToolUseOrResultMessage,
  orderedRowSource,
  appendRowsWithHooks,
  runningTurnRegistry,
  extractReadFilesFromMessages,
  collectRewoundFileTrackingPaths,
  shouldForwardSubagentMessage,
  hasToolResultAfter,
  lastUserAfterAssistant,
  handleOrphanedPermission,
  handleHandedOffTurn,
  isHandoffTurnSettled,
  resumeDeferredToolUse,
  appendHookableFastPath,
  getSalvageableResultText,
  getRecentErrorLog,
  extractBashCliNames,
  referencedBashToolNames,
  collectUsedToolNames,
  subagentProgressToSDKMessages,
  formatResultDiagnostic,
  isResultSuccessful,
  buildEmptyResultDiagnostics,
  isRecoverableTrailingServerError,
};
