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
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { canShortcutAppend } from "../plugins/functionHooks/modAdmission.js";
import { TEXT_PASSTHROUGH_CORES } from "../plugins/functionHooks/coreHandlers.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { identity as identity_2 } from "./identity.js";
import { lastAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { uniqByExport } from "../../vendor/lodash-es/uniqBy.js";
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
import { SHELL_TOOL_NAMES } from "./shell/shellToolUtils.js";
import { parseReferences } from "../history.js";
import { deferInit } from "../../runtime/deferred-init.js";

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
function appendRowsWithHooks(source, rows, options = {}) {
  let cores = TEXT_PASSTHROUGH_CORES.get();
  if (cores === null || !source.isHookable || !appendHookableFastPath()) {
    if (options.fills !== true) (options.keep ?? source.keep)(rows);
    return rows;
  }
  let cutCount = source.cuts();
  let keep = options.keep ?? source.keep;
  return source.inOrder(async () =>
    (await cores()).rowsAppendedTo(source, rows, {
      ...options,
      keep: (row) => {
        if (source.cuts() === cutCount) keep(row);
      },
    }),
  );
}
//@ chunk-e6aww6q8.js:4735716-4735831 placement
function createRowSourceRegistry() {
  let weakMap = new WeakMap();
  return {
    noted: (source) => {
      if (source.list !== undefined) weakMap.set(source.list, source);
      return source;
    },
    of: (list) => weakMap.get(list),
  };
}
//@ chunk-e6aww6q8.js:4735831-4735845 placement
var rowSourceRegistry; // deferred: uses createRowSourceRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4735831", () => {
  rowSourceRegistry = createRowSourceRegistry();
});
//@ chunk-e6aww6q8.js:4735845-4736347 placement
/**
 * 为行来源加上顺序追加能力：inOrder 串行执行、裁剪计数、等待追加完成、附加循环收集新到的行。
 */
function createOrderedRowSource(base) {
  let resolved = Promise.resolve();
  let inFlightCount = 0;
  let cutCount = 0;
  let loops = new Set();
  function runInOrder(task) {
    inFlightCount += 1;
    let promise = resolved.then(task);
    let { appendsInFlight } = getPluginRegistry();
    let finish = () => {
      inFlightCount -= 1;
      appendsInFlight.delete(promise);
    };
    appendsInFlight.add(promise);
    resolved = promise.then(finish, finish);
    return promise;
  }
  return {
    ...base,
    inOrder: runInOrder,
    cut: () => {
      cutCount += 1;
    },
    cuts: () => cutCount,
    behindAppends: (task) => {
      if (inFlightCount === 0) {
        task();
        return;
      }
      return runInOrder(() => {
        task();
        return Promise.resolve();
      });
    },
    settled: () => resolved,
    attachLoop: () => {
      let loop = {
        rows: [],
      };
      loops.add(loop);
      return {
        taken: () => {
          let rows = loop.rows;
          loop.rows = [];
          return rows;
        },
        [Symbol.dispose]: () => {
          loops.delete(loop);
        },
      };
    },
    arrived: (rows) => {
      for (let loop of loops) loop.rows = [...loop.rows, ...rows];
    },
  };
}
//@ chunk-e6aww6q8.js:4736347-4736378 placement
/**
 * orderedRowSource：登记有序行来源。
 */
var orderedRowSource = (base) => rowSourceRegistry.noted(createOrderedRowSource(base));
//@ chunk-e6aww6q8.js:4736378-4736443 placement
var rowSourceFor = (list, keep) =>
  rowSourceRegistry.of(list) ??
  orderedRowSource({
    keep,
    rows: () => list,
    isHookable: false,
  });
//@ chunk-e6aww6q8.js:4736443-4736600 placement
function createRunningTurnRegistry() {
  let turns = new Map();
  return {
    running: (key, value) => {
      turns.set(key, value);
      return {
        [Symbol.dispose]: () => {
          if (turns.get(key) === value) turns.delete(key);
        },
      };
    },
    of: (key) => turns.get(key),
    clear: () => {
      turns.clear();
    },
  };
}
//@ chunk-e6aww6q8.js:4736600-4736633 placement
/**
 * runningTurnRegistry：运行中回合登记表。
 */
var runningTurnRegistry; // deferred: uses createRunningTurnRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4736600", () => {
  runningTurnRegistry = identity_2(createRunningTurnRegistry(), (registry) => registry.clear());
});
//@ chunk-0h4e7gnq.js:49711-49721 affinity
/**
 * 10：提取已读文件状态的默认缓存大小。
 */
var READ_FILE_STATE_CACHE_SIZE = 10;
//@ chunk-0h4e7gnq.js:49721-49930 fingerprint (2.1.88 match: isResultSuccessful, 0.89)
/**
 * 结果是否成功：最后块是 text/thinking，或是 tool_result 用户消息，或 stop_reason=end_turn。
 */
function isResultSuccessful(message, stopReason = null) {
  if (!message) return false;
  if (message.type === "assistant") {
    let lastContent = lastAlias(message.message.content);
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
function getSalvageableResultText(result, userMessage) {
  let resultBlock = lastAlias(result.message.content);
  let userBlock = lastAlias(userMessage?.message.content);
  return resultBlock?.type === "text" &&
    !SYNTHETIC_MESSAGES.has(resultBlock.text) &&
    userBlock?.type === "text"
    ? userBlock.text
    : undefined;
}
//@ chunk-0h4e7gnq.js:50288-50377 layout
/**
 * 内存错误日志中某条之后的错误。
 */
function getRecentErrorLog(sinceError) {
  let inMemoryErrors = getInMemoryErrors();
  let startIndex = sinceError ? inMemoryErrors.lastIndexOf(sinceError) + 1 : 0;
  return inMemoryErrors.slice(startIndex).map((inMemoryError) => inMemoryError.error);
}
//@ chunk-0h4e7gnq.js:50377-50424 layout
/**
 * 空结果诊断：结果类型描述 + 最近错误。
 */
function buildEmptyResultDiagnostics(message, stopReason, sinceError) {
  return [formatResultDiagnostic(message, stopReason), ...getRecentErrorLog(sinceError)];
}
//@ chunk-0h4e7gnq.js:50424-50617 layout
/**
 * "[ede_diagnostic] result_type=… last_content_type=… stop_reason=…"。
 */
function formatResultDiagnostic(message, stopReason) {
  let resultType = message?.type ?? "undefined";
  let contentType =
    message?.type === "assistant" ? (lastAlias(message.message.content)?.type ?? "none") : "n/a";
  return `[ede_diagnostic] result_type=${resultType} last_content_type=${contentType} stop_reason=${stopReason}`;
}
//@ chunk-0h4e7gnq.js:50617-50800 layout (2.1.88 match: countToolCallsSince, 1)
/**
 * 首块是 tool_use 或 tool_result 的 user/assistant。覆盖后缀名 countToolCallsSince_3。
 */
function isToolUseOrResultMessage(message) {
  if (message.type !== "assistant" && message.type !== "user") return false;
  let content = message.message.content;
  if (!Array.isArray(content)) return false;
  let firstBlock = content[0];
  return firstBlock?.type === "tool_use" || firstBlock?.type === "tool_result";
}
//@ chunk-0h4e7gnq.js:50800-50859 layout
/**
 * 开启转发且（转发文本或该消息是工具调用/结果）。
 */
function shouldForwardSubagentMessage(bridgeSubagentFrameGate, message) {
  return (
    bridgeSubagentFrameGate.enabled &&
    (bridgeSubagentFrameGate.forwardText || isToolUseOrResultMessage(message))
  );
}
//@ chunk-0h4e7gnq.js:50859-52368 layout
/**
 * 子代理 progress 事件转 SDK 消息（带 parent_tool_use_id、agent_id、subagent_type）。
 */
function* subagentProgressToSDKMessages(progress, tools) {
  let agentType = progress.data.agentType;
  let description = progress.data.description;
  let message = progress.data.message;
  let remedies =
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
  for (let normalizedMsg of normalizeMessages([message]))
    switch (normalizedMsg.type) {
      case "assistant":
        if (!isNotEmptyMessage(normalizedMsg)) break;
        {
          let toolDisplayNames = buildToolDisplayNames(normalizedMsg.message.content, tools);
          let blocks = stripMemoryTagsFromBlocks(normalizedMsg.message.content);
          let message = progress.data.message.type === "assistant" ? progress.data.message : undefined;
          yield {
            type: "assistant",
            message:
              blocks === normalizedMsg.message.content
                ? normalizedMsg.message
                : {
                    ...normalizedMsg.message,
                    content: blocks,
                  },
            parent_tool_use_id: progress.parentToolUseID,
            agent_id: progress.data.agentId,
            session_id: getSessionId(),
            uuid: normalizedMsg.uuid,
            timestamp: normalizedMsg.timestamp,
            error: normalizedMsg.error,
            ...(normalizedMsg.requestId !== undefined && {
              request_id: normalizedMsg.requestId,
            }),
            ...(agentType !== undefined && {
              subagent_type: agentType,
            }),
            ...(description !== undefined && {
              task_description: description,
            }),
            ...(normalizedMsg.isApiErrorMessage === true && {
              is_api_error_message: true,
            }),
            ...(normalizedMsg.apiError !== undefined && {
              api_error: normalizedMsg.apiError,
            }),
            ...(normalizedMsg.apiErrorParams !== undefined && {
              api_error_params: normalizedMsg.apiErrorParams,
            }),
            ...(normalizedMsg.apiErrorCode !== undefined && {
              api_error_code: normalizedMsg.apiErrorCode,
            }),
            ...(message?.[MESSAGE_MARK_SYMBOLS_2] !== undefined && {
              api_error_origin: message[MESSAGE_MARK_SYMBOLS_2],
            }),
            ...getNarrationFields(blocks, normalizedMsg.message.model),
            ...(toolDisplayNames.length > 0 && {
              tool_use_meta: toolDisplayNames,
            }),
          };
        }
        break;
      case "user": {
        let toolResults = filterToolUsesWithResults(remedies, normalizedMsg.message.content);
        yield {
          type: "user",
          message: normalizedMsg.message,
          parent_tool_use_id: progress.parentToolUseID,
          agent_id: progress.data.agentId,
          session_id: getSessionId(),
          uuid: normalizedMsg.uuid,
          timestamp: normalizedMsg.timestamp,
          isSynthetic: selectableUserMessagesFilter(normalizedMsg),
          ...false,
          tool_use_result: normalizedMsg.mcpMeta
            ? {
                content: normalizedMsg.toolUseResult,
                ...normalizedMsg.mcpMeta,
              }
            : normalizedMsg.toolUseResult === undefined
              ? subagentFrameResult(normalizedMsg)
              : normalizedMsg.toolUseResult,
          ...(toolResults.length > 0 && {
            tool_result_meta: toolResults,
          }),
          ...(normalizedMsg.origin && {
            origin: normalizedMsg.origin,
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
  let toolResultBlock = Array.isArray(content)
    ? content.find((block) => block.type === "tool_result")
    : undefined;
  return toolResultBlock?.type === "tool_result"
    ? takeCutResult(toolResultBlock.tool_use_id, message.uuid)
    : undefined;
}
//@ chunk-0h4e7gnq.js:52533-54292 fingerprint (2.1.88 match: normalizeMessage, 0.374)
/**
 * 内部消息转 SDK 流消息（-p/SDK 输出）：assistant 拆块并过滤空块、progress（子代理/心跳）、user、附件、系统消息。
 */
function* normalizeMessage(message, tools) {
  switch (message.type) {
    case "assistant": {
      let supersedesUuids = message.supersedesUuids;
      for (let normalized of normalizeMessages([message])) {
        if (!isNotEmptyMessage(normalized)) continue;
        let supersedes = supersedesUuids;
        supersedesUuids = undefined;
        let toolDisplayNames = buildToolDisplayNames(normalized.message.content, tools);
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
          ...(supersedes !== undefined &&
            supersedes.length > 0 && {
              supersedes,
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
      if (extractAgentIdsFromMessages_2(message)) yield* subagentProgressToSDKMessages(message, tools);
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
      let remedies = toolResultRemedy(message);
      let timing = takeToolResultTiming(message);
      for (let normalized of normalizeMessages([message])) {
        let toolResults = filterToolUsesWithResults(remedies, normalized.message.content);
        yield {
          type: "user",
          message: normalized.message,
          parent_tool_use_id: null,
          session_id: getSessionId(),
          uuid: normalized.uuid,
          timestamp: normalized.timestamp,
          isSynthetic: selectableUserMessagesFilter(normalized),
          tool_use_result:
            timing ??
            (normalized.mcpMeta
              ? {
                  content: normalized.toolUseResult,
                  ...normalized.mcpMeta,
                }
              : normalized.toolUseResult),
          ...(toolResults.length > 0 && {
            tool_result_meta: toolResults,
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
  let sdkMessage;
  try {
    if (attachment.type === "tool_host_result_lines")
      sdkMessage = toSDKToolHostResultMessage(attachment, message.uuid, getSessionId());
    else if (attachment.type === "hook_system_message")
      sdkMessage = {
        ...informationalSystemMessage(attachment),
        uuid: message.uuid,
        session_id: getSessionId(),
      };
  } catch (error) {
    logError(error);
  }
  if (sdkMessage) yield sdkMessage;
}
//@ chunk-0h4e7gnq.js:54497-56016 layout
/**
 * 恢复延迟的工具调用：在转录里找回 tool_use，重新走 PreToolUse 与执行，结果写回转录。
 */
async function* resumeDeferredToolUse(deferredToolUse, canUseTool, mutableMessages, toolUseContext) {
  let persistEnabled = !isSessionPersistenceDisabled();
  let deferredAttachment;
  let mode = getToolPermissionContext(toolUseContext).mode;
  if (mode !== deferredToolUse.permissionMode)
    logForDebugging(
      `Deferred tool resume: permissionMode mismatch (deferred under '${deferredToolUse.permissionMode}', resuming under '${mode}'). --resume does not restore permissionMode \u2014 pass --permission-mode ${deferredToolUse.permissionMode} to match.`,
      {
        level: "warn",
      },
    );
  let last = mutableMessages.findLast(
    (message) =>
      message.type === "assistant" &&
      Array.isArray(message.message.content) &&
      message.message.content.some(
        (block) => block.type === "tool_use" && block.id === deferredToolUse.toolUseID,
      ),
  );
  if (!last || last.type !== "assistant") {
    logForDebugging(`Deferred tool resume: tool_use ${deferredToolUse.toolUseID} not found in transcript`, {
      level: "warn",
    });
    return;
  }
  let found = last.message.content.find(
    (toolUseBlock) => toolUseBlock.type === "tool_use" && toolUseBlock.id === deferredToolUse.toolUseID,
  );
  if (!found) return;
  logForDebugging(
    `Deferred tool resume: re-emitting ${deferredToolUse.toolName} (${deferredToolUse.toolUseID}) through PreToolUse`,
  );
  let traceparentContext = extractTraceparentContext(deferredToolUse.traceparent);
  toolUseContext.setToolPermissionContext(clearCommandAllowRules);
  let toolIterator = runTools([found], [last], canUseTool, toolUseContext)[Symbol.asyncIterator]();
  startPhaseWithin("resume_other", "turn_start_tool_run");
  try {
    while (true) {
      let nextResult = await runInContext(traceparentContext, () => toolIterator.next());
      if (nextResult.done) break;
      let toolResult = nextResult.value;
      if (hasTypeField(toolResult)) continue;
      if (toolResult.message) {
        await appendMessageToConversation(mutableMessages, toolResult.message);
        if (persistEnabled)
          await recordTranscript(mutableMessages, undefined, undefined, undefined, toolUseContext.storageV5);
        if (toolResult.message.type === "progress" || toolResult.message.type === "user") {
          yield* normalizeMessage(
            toolResult.message,
            toolUseContext.options.refreshTools?.() ?? toolUseContext.options.tools,
          );
          continue;
        }
        if (
          toolResult.message.type === "attachment" &&
          toolResult.message.attachment.type === "hook_deferred_tool"
        )
          deferredAttachment = toolResult.message.attachment;
        yield {
          ...toolResult.message,
          session_id: getSessionId(),
          parent_tool_use_id: null,
        };
      }
    }
  } catch (error) {
    try {
      await toolIterator.return?.(undefined);
    } catch {}
    throw error;
  } finally {
    endPhaseWithin("resume_other", "turn_start_tool_run");
    await toolIterator.return?.(undefined);
  }
  return deferredAttachment;
}
//@ chunk-0h4e7gnq.js:56016-56067 layout
/**
 * 孤立权限被拒时对消息做的变换（refused / orphaned permission）。
 */
var orphanedPermissionRefusedTransform; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0h4e7gnq.js:56016", () => {
  orphanedPermissionRefusedTransform = DoctorLazy(() =>
    capPermissionUpdates_2("refused", "orphaned permission"),
  );
});
//@ chunk-0h4e7gnq.js:56067-56590 layout
/**
 * 重放工具的 askInputPreparer，判断记录的答案是否仍适用（served/answer_differs/step_failed 等）。
 */
async function replayAskInputPreparer(tool, toolInput, input, cardInput, context, toolUseID) {
  let { signal } = context.abortController;
  let release;
  let stepDiffers = false;
  try {
    let preparer = await tool.askInputPreparer?.(toolInput, context, toolUseID);
    if (preparer?.prepareAgain === undefined) return;
    if (cardInput === null)
      return {
        ended: "no_record",
      };
    if (Object.keys(input).length === 0)
      return {
        ended: "answer_empty",
      };
    if (!isSameAnswerInput(input, cardInput))
      return {
        ended: "answer_differs",
      };
    let prepared = await preparer.prepareAgain(cardInput);
    if (!("error" in prepared)) {
      release = prepared.release;
      if (!signal.aborted && isSameAnswerInput(cardInput, prepared.input))
        return {
          ended: "served",
          input: prepared.input,
        };
      stepDiffers = true;
    }
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
  await release?.();
  return {
    ended: signal.aborted ? "aborted" : stepDiffers ? "step_differs" : "step_failed",
  };
}
//@ chunk-0h4e7gnq.js:56590-56771 layout
/**
 * 重放工具调用时计算应用的权限更新（规范化输入；某些工具或 MCP 服务器只保留非 allow 规则）。
 */
function computePermissionUpdatesForReplay(permissionUpdates, tool, toolInput, toolPermissionContext) {
  let update = normalizePermissionUpdate(permissionUpdates, undefined, toolPermissionContext);
  let stripped =
    !tool ||
    tool.suppressesAllPermissionUpdates?.(toolInput) === true ||
    (tool.mcpInfo?.serverName === REMOTE_DEVICES && isRemoteToolForwardingSwitchOn())
      ? withoutGrantsForRemoteScope(update)
      : stripWholeToolGrantsForAsk(update, tool, toolPermissionContext);
  return tool?.name === SKILL
    ? withoutNewRulesOfMcpSkillLoadForm(
        getToolNameWithAliases(tool, toolPermissionContext),
        stripped,
        toolPermissionContext,
      )
    : stripped;
}
//@ chunk-0h4e7gnq.js:56771-56941 layout
/**
 * MCP 交接调用恢复被中断轮次、当前不能询问时延后（开关 tengu_velvet_gannet）。
 */
function shouldDeferMcpOrphanedAsk(toolUseId, orphanedPermission, context) {
  return (
    typeof toolUseId === "string" &&
    mcpInfoFromString(toolUseId)?.serverName === REMOTE_DEVICES &&
    orphanedPermission.resumesInterruptedTurn === true &&
    !(context.toolState.get(ReannounceRequester).canAsk() && isRemoteToolForwardingSwitchOn()) &&
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
  messages,
  context,
  waitForDeviceBridgeTool,
  permissionUpdates,
) {
  using guard = {
    [Symbol.dispose]() {
      let toolUseID = orphanedPermission.permissionResult?.toolUseID;
      if (toolUseID !== undefined) takeLateAllowDecision(context.session, toolUseID);
    },
  };
  switch ((context.setToolPermissionContext(clearCommandAllowRules), permissionUpdates.kind)) {
    case "strict":
    case "launcher":
      break;
    default:
      logForDebugging(
        `handleOrphanedPermission: dropping orphaned permission \u2014 the answer policy's kind (a ${typeof permissionUpdates.kind}) is not one this sink knows`,
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
  let persistEnabled = !isSessionPersistenceDisabled();
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
  let toolUseBlock;
  if (Array.isArray(content)) {
    for (let block of content)
      if (block.type === "tool_use" && block.id === toolUseID) {
        toolUseBlock = block;
        break;
      }
  }
  if (!toolUseBlock) {
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
  let toolName = toolUseBlock.name;
  if (permissionResult.behavior === "deny" && orphanedPermission.denyIsRefusal === true) {
    let toolAliases = context.options.toolAliases;
    if (isPlainObject(toolUseBlock.input))
      context.onPermissionDenial?.(
        findTool(tools, toolName, toolAliases) ?? {
          name: toolName,
        },
        toolUseID,
        toolUseBlock.input,
      );
    yield* recordToolDenialResult({
      block: toolUseBlock,
      assistantMessage,
      messageRows: orphanedPermission.messageRows,
      message: permissionResult.message,
      tools,
      context,
      mutableMessages: messages,
      persistSession: persistEnabled,
      toolDenialKind:
        "decisionClassification" in permissionResult &&
        permissionResult.decisionClassification === "user_reject"
          ? "user-rejected"
          : undefined,
      ...(!orphanedPermission.siblings?.length && {
        notSent: orphanedPermission.notSent,
      }),
    });
    let toolPool = tools;
    let partition = partitionSiblingRuns(orphanedPermission, toolPool, toolAliases);
    for (let missingToolName of new Set(partition.missingToolNames)) {
      let waitResult = await waitForMcpToolServer(missingToolName, toolPool, context);
      toolPool = waitResult.tools;
      if (waitResult.aborted) break;
    }
    if ((orphanedPermission.siblings?.length ?? 0) > 0 && context.abortController.signal.aborted) {
      if (orphanedPermission.notSent?.length)
        yield* await answerCallsNeverSent({
          notSent: orphanedPermission.notSent,
          tools,
          mutableMessages: messages,
          persistSession: persistEnabled,
          context,
        });
      return {
        reExecuted: false,
        reason: "aborted",
        toolWait: undefined,
        callStarted: false,
      };
    }
    if (partition.missingToolNames.length > 0)
      partition = partitionSiblingRuns(orphanedPermission, toolPool, toolAliases);
    if (partition.runs.length > 0) {
      let siblingIds = new Set(partition.runs.map((run) => run.block.id));
      yield* runToolUsesOnResume({
        runs: partition.runs,
        tools: toolPool,
        canUseTool: async (tool, input, permissionContext, toolUse, callId, result) => {
          if (callId === toolUseID)
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
            (siblingIds.has(callId) ? handleOrphanedPermission_2(result) : undefined) ??
            canUseTool(tool, input, permissionContext, toolUse, callId, result)
          );
        },
        executionContext: {
          ...context,
          requireCanUseTool: true,
          ...(toolPool !== tools && {
            options: {
              ...context.options,
              tools: toolPool,
              mcpClients: [...currentMcpClients(context)],
            },
          }),
        },
        mutableMessages: messages,
        persistSession: persistEnabled,
        notSent: orphanedPermission.notSent,
        echoed: new Set([assistantMessage.uuid]),
      });
    } else if (orphanedPermission.siblings?.length)
      yield* await answerCallsNeverSent({
        notSent: orphanedPermission.notSent ?? [],
        tools,
        mutableMessages: messages,
        persistSession: persistEnabled,
        context,
      });
    return {
      reExecuted: true,
      toolWait: undefined,
      ...(await storeHandoffNote(orphanedPermission, messages, persistEnabled, context)),
      callStarted: false,
    };
  }
  let parsedUpdates =
    permissionResult.behavior === "allow" && permissionUpdates.kind === "launcher"
      ? orphanedPermissionRefusedTransform().safeParse(permissionResult.updatedPermissions)
      : undefined;
  let refusal =
    parsedUpdates?.success === false
      ? {
          behavior: "deny",
          message: `The canUseTool callback returned an invalid permission result. ${PERMISSION_UPDATES_LIMIT_MESSAGE}`,
          toolUseID,
          decisionReason: CAN_USE_TOOL_INVALID_RESULT_DENY_REASON,
          decideLocation: "ask-path",
        }
      : undefined;
  if (refusal)
    logForDebugging(
      `handleOrphanedPermission: treating the orphaned allow for toolUseID=${toolUseID} as a denial: its updatedPermissions is too long. ${PERMISSION_UPDATES_LIMIT_MESSAGE}`,
      {
        level: "warn",
      },
    );
  let effectiveResult = refusal ?? permissionResult;
  let pool = tools;
  let tool = findTool(pool, toolName, context.options.toolAliases);
  let waitInfo;
  let missingTool;
  let serverName = typeof toolName === "string" ? mcpInfoFromString(toolName)?.serverName : undefined;
  let deferToBridge = !tool && shouldDeferMcpOrphanedAsk(toolName, orphanedPermission, context);
  if (!tool) {
    waitInfo = await measurePhase("resume_other", "resume_connector_wait", () =>
      deferToBridge && effectiveResult.behavior === "allow"
        ? waitForDeviceBridgeTool(toolName, tools, context, context.storageV5)
        : waitForMcpToolServer(toolName, tools, context),
    );
    tool = waitInfo.tool;
    pool = waitInfo.tools;
    if (tool)
      logForDebugging(
        `handleOrphanedPermission: tool "${toolName}" for toolUseID=${toolUseID} joined the pool after ${waitInfo.waitedMs}ms (${waitInfo.bridgeEnd ? `the device bridge listed it: ${waitInfo.bridgeEnd}` : "its MCP server finished connecting"}); re-executing`,
      );
  }
  if (!tool) {
    let callEnded =
      waitInfo !== undefined &&
      !waitInfo.aborted &&
      (waitInfo.serverState === "connected" ||
        waitInfo.serverState === "failed" ||
        waitInfo.serverState === "needs-auth" ||
        waitInfo.serverState === "disabled") &&
      (effectiveResult.behavior === "allow" || effectiveResult.behavior === "deny") &&
      orphanedPermission.resumesInterruptedTurn === true &&
      !orphanedPermission.siblings?.length &&
      serverName !== undefined &&
      lastUserAfterAssistant(messages) &&
      (serverName === REMOTE_DEVICES
        ? deferToBridge && !isCacheMissReason(waitInfo.bridgeEnd)
        : getFeatureValue_CACHED_MAY_BE_STALE("tengu_expressive_church", false));
    logForDebugging(
      waitInfo?.aborted
        ? `handleOrphanedPermission: turn aborted while waiting for tool "${toolName}" (toolUseID=${toolUseID}); not re-executing`
        : `handleOrphanedPermission: ${callEnded ? "closing the call of the" : "dropping"} orphaned permission for toolUseID=${toolUseID} \u2014 tool "${toolName}" not found in active tools (${pool.length} available; MCP server ${waitInfo?.serverState ?? "unknown"} after ${waitInfo?.waitedMs ?? 0}ms)`,
      {
        level: "warn",
      },
    );
    missingTool =
      waitInfo?.aborted || waitInfo?.serverState === "unknown"
        ? undefined
        : missingToolTelemetry(toolName, tools, context);
    if (!callEnded) {
      if (permissionUpdates.kind === "strict" && effectiveResult.behavior === "allow")
        warnLateAllowNeverServed(toolUseID, effectiveResult.updatedPermissions);
      let filtered = orphanedPermission.notSent?.filter((call) => !call.onUsersDevice);
      if (filtered?.length)
        yield* await answerCallsNeverSent({
          notSent: filtered,
          tools,
          mutableMessages: messages,
          persistSession: persistEnabled,
          context,
        });
      return {
        reExecuted: false,
        reason: waitInfo?.aborted ? "aborted" : "tool_unavailable",
        toolWait: waitInfo,
        missingTool,
        callStarted: false,
      };
    }
    if (effectiveResult.behavior === "deny") {
      yield* recordToolDenialResult({
        block: toolUseBlock,
        assistantMessage,
        messageRows: orphanedPermission.messageRows,
        message: effectiveResult.message,
        tools: pool,
        context,
        mutableMessages: messages,
        persistSession: persistEnabled,
      });
      if (orphanedPermission.notSent?.length)
        yield* await answerCallsNeverSent({
          notSent: orphanedPermission.notSent,
          tools,
          mutableMessages: messages,
          persistSession: persistEnabled,
          context,
        });
      return {
        reExecuted: false,
        reason: "closed_unrun",
        toolWait: waitInfo,
        missingTool,
        callStarted: false,
      };
    }
  }
  let executionContext =
    pool === tools
      ? context
      : {
          ...context,
          options: {
            ...context.options,
            tools: pool,
            mcpClients: [...currentMcpClients(context)],
          },
        };
  let updatedInput;
  if (effectiveResult.behavior === "allow") {
    let updatedInput_2 = effectiveResult.updatedInput;
    if (updatedInput_2 && Object.keys(updatedInput_2).length > 0) updatedInput = updatedInput_2;
    else {
      updatedInput = {};
      logForDebugging(
        `Orphaned permission for ${toolName}: updatedInput is missing or empty, falling back to original tool input`,
        {
          level: "warn",
        },
      );
    }
    let updates = parsedUpdates?.data;
    if (updates)
      try {
        let permissionUpdatesForReplay = computePermissionUpdatesForReplay(
          updates,
          tool,
          toolUseBlock.input,
          getToolPermissionContext(context),
        );
        context.setSessionToolPermissionContext((current) =>
          applyPermissionUpdates(current, permissionUpdatesForReplay),
        );
        await persistPermissionUpdates(permissionUpdatesForReplay, context.storageV5);
      } catch (error) {
        logForDebugging(
          `Orphaned permission for ${toolName}: applying or persisting updatedPermissions failed: ${error}`,
          {
            level: "warn",
          },
        );
      }
  }
  let siblingIds = new Set((orphanedPermission.siblings ?? []).map((sibling) => sibling.toolUseID));
  let lateAnswerBound =
    permissionUpdates.kind === "strict" && effectiveResult.behavior === "allow" && updatedInput !== undefined
      ? createLateAnswerBound(
          permissionUpdates,
          {
            updatedInput,
            updatedPermissions: effectiveResult.updatedPermissions,
          },
          toolUseID,
          computePermissionUpdatesForReplay,
        )
      : undefined;
  let replayPromise;
  let callStarted = tool !== undefined;
  let canUseTool_2 = async (tool, input, context, toolUse, callId, result) => {
    callStarted ||= callId === toolUseID;
    if (siblingIds.has(callId))
      return handleOrphanedPermission_2(result) ?? canUseTool(tool, input, context, toolUse, callId, result);
    if (
      callId !== toolUseID ||
      (result?.behavior === "ask" &&
        result.forcedByCaller === true &&
        (result.pendingBeforeRestart === true ||
          (callId === toolUseID && lateAnswerBound?.hasServedAllow() === true)))
    )
      return canUseTool(tool, input, context, toolUse, callId, result);
    if (result?.behavior === "ask" && result.forcedByCaller === true) return result;
    let screenedRefusal =
      refusal ?? lateAnswerBound?.refusalOf(tool, input, context, context.setSessionToolPermissionContext);
    if (
      screenedRefusal === undefined &&
      updatedInput !== undefined &&
      orphanedPermission.cardInput !== undefined &&
      context.forRemoteExecution !== true
    )
      replayPromise ??= replayAskInputPreparer(
        tool,
        input,
        updatedInput,
        orphanedPermission.cardInput,
        context,
        toolUseID,
      );
    let replayResult = screenedRefusal === undefined ? await replayPromise : undefined;
    if (replayResult !== undefined && replayResult.ended !== "served")
      return {
        behavior: "deny",
        toolUseID,
        decideLocation: "ask-path",
        ...(replayResult.ended === "aborted"
          ? {
              message: "Tool permission request aborted",
              decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
            }
          : {
              message: `The approval of ${tool.name} was asked for before Claude Code restarted, and cannot be reused. Call ${tool.name} again with the same arguments; it may need approval again. ${tool.name} was not called.`,
              decisionReason: {
                type: "other",
                reason: "approval cannot be reused",
              },
            }),
      };
    if (screenedRefusal === undefined && effectiveResult.behavior === "allow")
      recordMcpApprovalTicket_2(takeLateAllowDecision(context.session, toolUseID), tool, toolUseID, context);
    return (
      screenedRefusal ?? {
        ...effectiveResult,
        updatedInput: replayResult?.input ?? updatedInput,
        decisionReason:
          permissionUpdates.kind === "strict"
            ? {
                type: "permissionPromptTool",
                permissionPromptToolName: tool.name,
                toolResult: effectiveResult,
              }
            : {
                type: "mode",
                mode: "default",
              },
      }
    );
  };
  let runs = partitionSiblingRuns(orphanedPermission, pool, context.options.toolAliases).runs;
  let startedCalls = new Set();
  yield* runToolUsesOnResume({
    runs: [
      {
        block: toolUseBlock,
        assistantMessage,
        messageRows: orphanedPermission.messageRows,
      },
      ...runs,
    ],
    tools: pool,
    canUseTool: canUseTool_2,
    executionContext: {
      ...executionContext,
      requireCanUseTool: true,
      markToolCallStarted: startedCalls.add.bind(startedCalls),
    },
    mutableMessages: messages,
    persistSession: persistEnabled,
    notSent: orphanedPermission.notSent,
  });
  lateAnswerBound?.warnIfNeverAsked();
  let handoffNote = await storeHandoffNote(orphanedPermission, messages, persistEnabled, context);
  let callStarted_2 = startedCalls.has(toolUseID);
  if (callStarted) {
    let ended = (await replayPromise)?.ended;
    return {
      reExecuted: true,
      toolWait: waitInfo,
      ...handoffNote,
      callStarted: callStarted_2,
      ...(ended !== undefined && {
        cardStep: ended,
      }),
    };
  }
  return context.abortController.signal.aborted
    ? {
        reExecuted: false,
        reason: "aborted",
        toolWait: waitInfo,
        callStarted: callStarted_2,
      }
    : {
        reExecuted: false,
        reason: "closed_unrun",
        toolWait: waitInfo,
        missingTool,
        ...handoffNote,
        callStarted: callStarted_2,
      };
}
//@ chunk-0h4e7gnq.js:64632-64828 layout
/**
 * 把交接笔记写进转录并持久化，成功返回 {noteStored:true}。
 */
async function storeHandoffNote(orphanedPermission, messages, persist, context) {
  if (orphanedPermission.note === undefined || context.abortController.signal.aborted) return {};
  let stored = false;
  try {
    await appendMessageToConversation(messages, orphanedPermission.note());
    stored = true;
    await persistIfNeeded(messages, persist, context);
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
  return stored
    ? {
        noteStored: true,
      }
    : {};
}
//@ chunk-0h4e7gnq.js:64828-64990 layout
/**
 * 从末尾看，真实 user 消息是否出现在 assistant 之前。
 */
function lastUserAfterAssistant(messages) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message.type === "user" && !isEmptyUserMessage(message) && !isNonConversationMessage(message))
      return true;
    if (
      message.type === "assistant" &&
      !isNonConversationMessage(message) &&
      !isAbandonedOrUnsignedThinkingMessage(message)
    )
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
          (searchedBlock) =>
            searchedBlock.type === "tool_use" && "id" in searchedBlock && searchedBlock.id === block.id,
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
  let denial = {
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
        content: denial.message,
        is_error: true,
        tool_use_id: block.id,
      },
    ],
    toolUseResult: `Error: ${denial.message}`,
    toolDenialKind: toolDenialKind ?? getToolCallOutcomeCode(denial),
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
function isHandoffTurnSettled(result) {
  if (result.ran) return true;
  switch (result.reason) {
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
function planRelayMarkerLine(relay, { kind, relayMarker, messages }, conversation, storeConfirms) {
  if (!relay || relayMarker === undefined || kind === "stopped") return;
  let plan;
  try {
    plan = relay.planRelayFromHandoff({
      relayMarker,
      carried: messages,
      conversation,
      persistSession: !isTranscriptPersistenceDisabled(),
      storeConfirms,
      turnKind: kind,
    });
  } catch (error) {
    logError(error);
    plan = {
      arm: false,
    };
  }
  return plan.arm ? plan.markerLine : undefined;
}
//@ chunk-0h4e7gnq.js:66424-66639 layout
/**
 * 交接的记忆行若已在转录里则丢弃，否则返回。
 */
async function resolveHandoffMemoryLine({ memoryLine }, persist, { storageV5 }) {
  if (
    memoryLine &&
    persist &&
    (await doesMessageExistInSession(getSessionId(), memoryLine.uuid, storageV5))
  ) {
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
function insertBeforeTail(list, tailLength, item) {
  return item ? list.toSpliced(list.length - tailLength + 1, 0, item) : list;
}
//@ chunk-0h4e7gnq.js:66699-66791 layout
/**
 * 从存储的交接信息重新武装 relay，异常只记日志。
 */
function armRelayFromStoredHandoff(relay, markerLine, conversation, turnKind) {
  if (!relay || !markerLine) return;
  try {
    relay.armRelayFromStoredHandoff(markerLine, conversation, turnKind);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0h4e7gnq.js:66791-70122 layout
/**
 * 日志自证：处理从其他进程交接来的轮次，校验未回答的 tool_use 与工具池，执行这些工具调用或补写历史。
 */
async function* handleHandedOffTurn(
  turn,
  tools,
  mutableMessages,
  processUserInputContext,
  canUseTool,
  storeConfirms,
  relay,
  beforeRun,
  placeCarriedWrites,
) {
  let persistEnabled = !isSessionPersistenceDisabled();
  if (turn.kind !== "run")
    return yield* appendHandedOffHistory(
      turn,
      tools,
      mutableMessages,
      processUserInputContext,
      persistEnabled,
      storeConfirms,
      relay,
    );
  let lastMessage = lastAlias(turn.messages);
  if (lastMessage?.type !== "assistant" || turn.toolUseIDs.length === 0) {
    logForDebugging(
      "handleHandedOffTurn: the turn does not end with an assistant message naming tool_uses to run; running nothing",
      {
        level: "warn",
      },
    );
    turn.release?.();
    return {
      ran: false,
      reason: "no_tool_use_block",
    };
  }
  let content = Array.isArray(lastMessage.message.content) ? lastMessage.message.content : [];
  let runs = [];
  for (let toolUseID of turn.toolUseIDs) {
    let found = content.find((block) => block.type === "tool_use" && block.id === toolUseID);
    let any = mutableMessages.some(
      (message) =>
        message.type === "user" &&
        Array.isArray(message.message.content) &&
        message.message.content.some(
          (block) => block.type === "tool_result" && block.tool_use_id === toolUseID,
        ),
    );
    if (found === undefined || any) {
      logForDebugging(
        `handleHandedOffTurn: tool_use ${toolUseID} is not an unanswered call of the turn's last assistant message; running nothing`,
        {
          level: "warn",
        },
      );
      turn.release?.();
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
      turn.release?.();
      return {
        ran: false,
        reason: "tool_unavailable",
      };
    }
    runs.push({
      block: found,
      assistantMessage: lastMessage,
    });
  }
  if (isToolResultForToolUse(mutableMessages)) {
    logForDebugging(
      "handleHandedOffTurn: the conversation ends in a call that has no result yet; running nothing",
      {
        level: "warn",
      },
    );
    turn.release?.();
    return {
      ran: false,
      reason: "conversation_moved",
    };
  }
  let markerLine = planRelayMarkerLine(relay, turn, mutableMessages, storeConfirms !== undefined);
  let messages = turn.messages;
  let finalAssistant = lastMessage;
  if (relay && !markerLine) {
    finalAssistant = stripThinkingFromIndex(lastMessage);
    messages = [
      ...messages
        .slice(0, -1)
        .map((message) => (message.type === "assistant" ? stripThinkingFromIndex(message) : message)),
      finalAssistant,
    ];
    for (let run of runs) run.assistantMessage = finalAssistant;
  }
  let handoffMemoryLine = await resolveHandoffMemoryLine(turn, persistEnabled, processUserInputContext);
  if (persistEnabled) {
    for (let line of markerLine ? [...messages, markerLine] : messages)
      if (await doesMessageExistInSession(getSessionId(), line.uuid, processUserInputContext.storageV5)) {
        logForDebugging(
          `handleHandedOffTurn: line ${line.uuid} of the handed-off turn is already in the transcript; running nothing`,
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
  if (placeCarriedWrites && !(await placeCarriedWrites(turn, tools, processUserInputContext))) {
    logForDebugging(
      "handleHandedOffTurn: could not write the files of the Write calls the turn brought already answered (the reason is in the turn_handoff_carried_writes diagnostic line); running nothing",
      {
        level: "warn",
      },
    );
    turn.release?.();
    return {
      ran: false,
      reason: "carried_writes_unplaceable",
    };
  }
  let flushConfirmer = storeConfirms?.();
  let flattened = [handoffMemoryLine, markerLine, ...messages].flatMap((line) => (line ? [line.uuid] : []));
  conversationAppender(mutableMessages).keep(handoffMemoryLine ? [handoffMemoryLine, ...messages] : messages);
  recordToolUseTagged(messages);
  if (markerLine) relay?.beginMarkerLineWrite();
  let confirmed = await measurePhase("resume_other", "resume_store_confirm", async () => {
    if (persistEnabled) {
      let startTime = performance.now();
      await recordTranscript(
        insertBeforeTail(mutableMessages, messages.length, markerLine),
        undefined,
        undefined,
        undefined,
        processUserInputContext.storageV5,
      );
      noteStoreConfirmWrite(performance.now() - startTime);
    }
    return (
      flushConfirmer === undefined ||
      (await flushConfirmer(processUserInputContext.abortController.signal, flattened)) === true
    );
  });
  if (flushConfirmer !== undefined && !confirmed) {
    let reason = unwrapAbortReason(processUserInputContext.abortController.signal.reason);
    if (reason === "remote-cancel" || reason === "user-cancel") {
      let confirmedAfterTimeout =
        (await flushConfirmer(AbortSignal.timeout(HANDOFF_CONFIRM_TIMEOUT_MS), flattened)) === true;
      yield* cancelUnansweredToolUses(finalAssistant, confirmedAfterTimeout, tools, mutableMessages, () =>
        persistIfNeeded(mutableMessages, persistEnabled, processUserInputContext),
      );
      return {
        ran: false,
        reason: confirmedAfterTimeout ? "stopped_closed" : "stopped_unconfirmed",
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
  armRelayFromStoredHandoff(relay, markerLine, mutableMessages, "run");
  let any = turn.messages.some(isHumanTurnMessage);
  if (any) {
    let { alwaysAllowRules, pollEventDeliveryGuard } = getToolPermissionContext(processUserInputContext);
    if (alwaysAllowRules.command !== undefined || pollEventDeliveryGuard !== undefined)
      applyPollEventToolPermissions(processUserInputContext, undefined, undefined);
    setCommandDenyRules(processUserInputContext.setToolPermissionContext, []);
  }
  let lastIndex = mutableMessages.findLastIndex(isHumanTurnMessage);
  return {
    ran: true,
    contextLayers: yield* runToolUsesOnResume({
      runs,
      tools,
      canUseTool,
      executionContext: {
        ...processUserInputContext,
        turnStartIndex: any && lastIndex >= 0 ? lastIndex : mutableMessages.length,
      },
      mutableMessages,
      persistSession: persistEnabled,
      beforeRun: beforeRun && (() => beforeRun(processUserInputContext.abortController.signal)),
    }),
  };
}
//@ chunk-0h4e7gnq.js:70122-70218 layout (2.1.88 match: isHumanTurn, 0.779)
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
async function* appendHandedOffHistory(turn, tools, mutableMessages, context, persist, storeConfirms, relay) {
  let { kind, messages } = turn;
  let lastToolUseAssistantMessage = findLastToolUseAssistantMessage(messages);
  let anchorMessage =
    mutableMessages.find((message) => message.uuid === lastToolUseAssistantMessage?.uuid) ??
    lastToolUseAssistantMessage;
  let bail = (reason, detail) => {
    logForDebugging(`handleHandedOffTurn: ${detail}; appending nothing`, {
      level: "warn",
    });
    if (reason !== "already_recorded") turn.release?.();
    return {
      ran: false,
      reason,
    };
  };
  if (anchorMessage?.type !== "assistant")
    return bail("no_tool_use_block", "the turn holds no assistant message to echo");
  let persistNow = () => persistIfNeeded(mutableMessages, persist, context);
  let knownUuids = new Set(mutableMessages.map((message) => message.uuid));
  let firstNewIndex = 0;
  while (firstNewIndex < messages.length && knownUuids.has(messages[firstNewIndex].uuid)) firstNewIndex++;
  let name = messages.slice(firstNewIndex);
  if (name.some((message) => knownUuids.has(message.uuid)))
    return bail("already_recorded", "the conversation holds some of the carried lines out of order");
  if (
    firstNewIndex > 0 &&
    !(kind === "history" && name.length === 0) &&
    lastConversationMessage(mutableMessages)?.uuid !== messages[firstNewIndex - 1].uuid
  )
    return bail("conversation_moved", "the conversation has moved on past the part of the turn it holds");
  if (firstNewIndex === 0 && isToolResultForToolUse(mutableMessages))
    return bail("conversation_moved", "the conversation ends in a call that has no result yet");
  if (persist) {
    for (let message of name)
      if (await doesMessageExistInSession(getSessionId(), message.uuid, context.storageV5))
        return bail("already_recorded", `carried message ${message.uuid} is already in the transcript`);
  }
  let freshHistory = kind === "history" && firstNewIndex === 0;
  let memoryLine = freshHistory ? await resolveHandoffMemoryLine(turn, persist, context) : undefined;
  let markerLine = freshHistory
    ? planRelayMarkerLine(relay, turn, mutableMessages, storeConfirms !== undefined)
    : undefined;
  if (markerLine && (await doesMessageExistInSession(getSessionId(), markerLine.uuid, context.storageV5))) {
    logForDebugging(
      "handleHandedOffTurn: the marker line is already in the transcript; appending the turn without it",
      {
        level: "warn",
      },
    );
    markerLine = undefined;
  }
  let confirmFn = storeConfirms?.();
  if (name.length > 0) {
    conversationAppender(mutableMessages).keep(memoryLine ? [memoryLine, ...name] : name);
    recordToolUseTagged(name);
    if (markerLine) relay?.beginMarkerLineWrite();
    await persistIfNeeded(insertBeforeTail(mutableMessages, name.length, markerLine), persist, context);
  }
  let confirmResult =
    confirmFn === undefined ||
    (await confirmFn(
      AbortSignal.timeout(HANDOFF_CONFIRM_TIMEOUT_MS),
      [memoryLine, markerLine, ...messages].flatMap((line) => (line ? [line.uuid] : [])),
    ));
  let confirmed = confirmResult === true;
  let index = mutableMessages.findIndex((index) => index.uuid === messages[0]?.uuid);
  if (
    confirmResult === "refused" &&
    kind === "history" &&
    index >= 0 &&
    mutableMessages.findLast(isChainParticipant)?.uuid === messages.at(-1)?.uuid
  ) {
    let previous = mutableMessages[index - 1];
    if (previous?.type === "attachment" && previous.attachment.type === "cowork_memory_context") index--;
    mutableMessages.splice(index);
    logForDebugging("handleHandedOffTurn: the store refused lines of the turn; removed it, echoing nothing", {
      level: "warn",
    });
    return {
      ran: false,
      reason: "store_refused",
    };
  }
  if (kind === "stopped")
    yield* cancelUnansweredToolUses(anchorMessage, confirmed, tools, mutableMessages, persistNow);
  else if (confirmed) {
    armRelayFromStoredHandoff(relay, markerLine, mutableMessages, "history");
    yield toSDKAssistantMessage(anchorMessage, tools);
  }
  if (!confirmed) {
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
async function* cancelUnansweredToolUses(assistantMessage, echo, tools, messages, persist) {
  if (echo) yield toSDKAssistantMessage(assistantMessage, tools);
  let answeredIds = new Set();
  for (let message of messages)
    if (message.type === "user" && Array.isArray(message.message.content)) {
      for (let block of message.message.content)
        if (block.type === "tool_result") answeredIds.add(block.tool_use_id);
    }
  let mapped = (
    Array.isArray(assistantMessage.message.content)
      ? assistantMessage.message.content.filter(
          (block) => block.type === "tool_use" && !answeredIds.has(block.id),
        )
      : []
  ).map((block) =>
    createUserMessage({
      content: [
        {
          ...createCancelledToolResultBlock(block.id),
          content: withMemoryCorrectionHint(CANCEL_MESSAGE),
        },
      ],
      toolUseResult: CANCEL_MESSAGE,
      toolDenialKind: "cancelled",
      sourceToolAssistantUUID: assistantMessage.uuid,
    }),
  );
  let userInterruptionMessage = createUserInterruptionMessage({
    toolUse: true,
  });
  for (let message of [...mapped, userInterruptionMessage]) {
    await appendMessageToConversation(messages, message);
    await persist();
    if (echo) yield* normalizeMessage(message, tools);
  }
}
//@ chunk-0h4e7gnq.js:72947-73022 layout
/**
 * 需要持久化时把对话写入会话存储。
 */
async function persistIfNeeded(messages, persistEnabled, context) {
  if (persistEnabled) await recordTranscript(messages, undefined, undefined, undefined, context.storageV5);
}
//@ chunk-0h4e7gnq.js:73022-73332 layout
/**
 * 内部 assistant 消息转 SDK assistant 消息（session_id、request_id、tool_use_meta）。
 */
function toSDKAssistantMessage(message, tools) {
  let toolDisplayNames = buildToolDisplayNames(message.message.content, tools);
  return {
    type: "assistant",
    message: message.message,
    parent_tool_use_id: null,
    session_id: getSessionId(),
    uuid: message.uuid,
    timestamp: message.timestamp,
    error: message.error,
    ...(message.requestId !== undefined && {
      request_id: message.requestId,
    }),
    ...isAssistantResultComplete(message),
    ...getNarrationFields(message.message.content, message.message.model),
    ...(toolDisplayNames.length > 0 && {
      tool_use_meta: toolDisplayNames,
    }),
  };
}
//@ chunk-0h4e7gnq.js:73332-73629 layout
/**
 * 补写 assistant 行时决定保留哪些同轮消息。
 */
function messagesToKeepForAssistant(assistantMessage, messageRows, mutableMessages) {
  if (
    messageRows === undefined ||
    !messageRows.some((row) => row.uuid === assistantMessage.uuid) ||
    messageRows.some(
      (row) =>
        row.resumedFromIncompleteThinking === true ||
        (row.uuid !== assistantMessage.uuid &&
          Array.isArray(row.message.content) &&
          row.message.content.some((block) => block.type === "tool_use")),
    )
  )
    return [assistantMessage];
  let knownUuids = new Set(mutableMessages.map((message) => message.uuid));
  return messageRows.filter((row) => !knownUuids.has(row.uuid));
}
//@ chunk-0h4e7gnq.js:73629-74539 layout
/**
 * 日志自证：对从未发出的工具调用补 is_error 结果。
 */
async function answerCallsNeverSent({ notSent, tools, mutableMessages, persistSession, context }) {
  let sdkMessages = [];
  let notSentIds = new Set(notSent.map((call) => call.toolUseID));
  for (let { toolUseID, assistantMessage, host, onUsersDevice } of notSent)
    try {
      if (
        !mutableMessages.some(
          (mutableMessage) =>
            mutableMessage.type === "assistant" &&
            Array.isArray(mutableMessage.message.content) &&
            mutableMessage.message.content.some(
              (block) => block.type === "tool_use" && block.id === toolUseID,
            ),
        )
      ) {
        if (
          Array.isArray(assistantMessage.message.content) &&
          assistantMessage.message.content.some(
            (block) => block.type === "tool_use" && !notSentIds.has(block.id),
          )
        ) {
          logForDebugging(
            `answerCallsNeverSent: toolUseID=${toolUseID} shares its row with a call this batch does not answer; left unanswered`,
          );
          continue;
        }
        conversationAppender(mutableMessages).keep([assistantMessage]);
        sdkMessages.push(toSDKAssistantMessage(assistantMessage, tools));
      }
      let noticeText = onUsersDevice ? DEVICE_CALL_NOT_SENT_TEXT : notSentNotice(host);
      let userMessage = createUserMessage({
        content: [
          {
            type: "tool_result",
            content: noticeText,
            is_error: true,
            tool_use_id: toolUseID,
          },
        ],
        toolUseResult: `Error: ${noticeText}`,
        sourceToolAssistantUUID: assistantMessage.uuid,
      });
      await appendMessageToConversation(mutableMessages, userMessage);
      await persistIfNeeded(mutableMessages, persistSession, context);
      sdkMessages.push(...normalizeMessage(userMessage, tools));
    } catch (error) {
      if (isAbortError(error))
        logForDebugging(`answerCallsNeverSent: turn stopped before toolUseID=${toolUseID} got its result`);
      else logError(error);
    }
  return sdkMessages;
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
  let assistantMessages = uniqByExport(
    runs.map((run) => run.assistantMessage),
    (message) => message.uuid,
  );
  for (let assistantMessage of assistantMessages) {
    let filtered = runs.filter((run) => run.assistantMessage.uuid === assistantMessage.uuid);
    let mapped = filtered.map((run) => run.block.id);
    if (
      !mutableMessages.some(
        (mutableMessage) =>
          mutableMessage.type === "assistant" &&
          Array.isArray(mutableMessage.message.content) &&
          mutableMessage.message.content.some(
            (block) => block.type === "tool_use" && "id" in block && mapped.includes(block.id),
          ),
      )
    ) {
      conversationAppender(mutableMessages).keep(
        messagesToKeepForAssistant(
          assistantMessage,
          filtered.find((run) => run.messageRows !== undefined)?.messageRows,
          mutableMessages,
        ),
      );
      if (persistSession)
        await recordTranscript(mutableMessages, undefined, undefined, undefined, executionContext.storageV5);
    }
    if (!echoed?.has(assistantMessage.uuid)) yield toSDKAssistantMessage(assistantMessage, tools);
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
    for await (let result of runTools(
      runs.map((run) => run.block),
      assistantMessages,
      canUseTool,
      executionContext,
    )) {
      if (hasTypeField(result)) continue;
      permissionLayers = result.newContext.permissionLayers;
      if (result.message) {
        await appendMessageToConversation(mutableMessages, result.message);
        if (persistSession)
          await recordTranscript(
            mutableMessages,
            undefined,
            undefined,
            undefined,
            executionContext.storageV5,
          );
        if (result.message.type === "progress" || result.message.type === "user") {
          yield* normalizeMessage(result.message, executionContext.options.refreshTools?.() ?? tools);
          continue;
        }
        if (result.message.type === "attachment") {
          yield* attachmentToSDKMessages(result.message);
          continue;
        }
        yield {
          ...result.message,
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
//@ chunk-0h4e7gnq.js:75821-78840 fingerprint (2.1.88 match: extractReadFilesFromMessages, 0.37)
/**
 * 官方行为，保留：extractReadFilesFromMessages 的 replaceEntry 先写新值又写回旧值，等于没有替换，只有 ee.delete 生效；疑为打包把“替换后清哈希”写坏。
 */
function extractReadFilesFromMessages(messages, cwd, maxSize = READ_FILE_STATE_CACHE_SIZE) {
  let cache = createRemoteFileState(maxSize);
  let fileReadToolUseIds = new Map();
  let fileWriteToolUseIds = new Map();
  let fileEditToolUseIds = new Map();
  let truncatedIds = new Set();
  for (let message of messages) {
    if (message.type === "attachment" && message.attachment.type === "read_truncation_notice") {
      truncatedIds.add(message.attachment.toolUseID);
      continue;
    }
    if (message.type === "assistant" && Array.isArray(message.message.content))
      for (let content of message.message.content) {
        if (content.type !== "tool_use") continue;
        if (hasHostField(content.input)) continue;
        try {
          if (content.name === FILE_READ_TOOL_NAME) {
            let input = normalizeReadInputAliases(content.input)?.input ?? content.input;
            let offset = coerceNumberString(input?.offset);
            let limit = coerceNumberString(input?.limit);
            if (
              typeof input?.file_path === "string" &&
              (offset === undefined ||
                (typeof offset === "number" && Number.isInteger(offset) && offset >= 0)) &&
              (limit === undefined || (typeof limit === "number" && Number.isInteger(limit) && limit >= 1))
            )
              fileReadToolUseIds.set(content.id, {
                filePath: expandPath(input.file_path, cwd),
                offset,
                limit,
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
  let seenPaths = new Set();
  let remoteFileState = createRemoteFileState(maxSize);
  let insertedPaths = [];
  let insertEntry = (path, entry) => {
    seenPaths.add(normalize(path));
    remoteFileState.set(path, entry);
    insertedPaths.push(path);
  };
  let writtenPaths = isRemoteToolForwardingSwitchOn()
    ? new Set(
        [...fileWriteToolUseIds.values()]
          .map((entry) => entry.filePath)
          .concat([...fileEditToolUseIds.values()])
          .map((path) => normalize(path)),
      )
    : undefined;
  let hashByPath = new Map();
  let replaceEntry = (path, entry) => {
    let normalized = normalize(path);
    let previous = remoteFileState.get(path);
    remoteFileState.set(path, entry);
    remoteFileState.set(path, previous);
    hashByPath.delete(normalized);
  };
  e: for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    let content = message.message.content;
    for (let idx = content.length - 1; idx >= 0; idx--) {
      let block = content[idx];
      if (block.type !== "tool_result" || !block.tool_use_id) continue;
      let readFilePath = fileReadToolUseIds.get(block.tool_use_id);
      let normalizedPath = readFilePath && normalize(readFilePath.filePath);
      let canInsert =
        normalizedPath !== undefined && !seenPaths.has(normalizedPath) && seenPaths.size < maxSize;
      if (
        readFilePath &&
        (canInsert || hashByPath.has(normalizedPath)) &&
        block.is_error !== true &&
        typeof block.content === "string" &&
        !isFileUnchangedStub(block.content) &&
        message.timestamp
      ) {
        let toolUseResult = message.toolUseResult;
        let isPartial =
          toolUseResult?.file?.truncatedByTokenCap === true ||
          truncatedIds.has(block.tool_use_id) ||
          block.content.startsWith("<system-reminder>" + TRUNCATED_PARTIAL_VIEW_PREFIX);
        let contentText;
        let content_2 = toolUseResult?.file?.content;
        if (
          (content.length === 1 || count(content, (block) => block.type === "tool_result") === 1) &&
          typeof content_2 === "string" &&
          content_2 !== ""
        )
          contentText = content_2.trim();
        else contentText = stripReminderAndLineNumbers(block.content);
        if (!canInsert) {
          if (contentHashOf(contentText) !== hashByPath.get(normalizedPath))
            hashByPath.delete(normalizedPath);
        } else {
          let timestamp = new Date(message.timestamp).getTime();
          let isNotebook = isNotebookPath(readFilePath.filePath);
          insertEntry(readFilePath.filePath, {
            content: contentText,
            timestamp,
            offset: isNotebook ? 1 : (readFilePath.offset ?? 1),
            limit: isNotebook ? undefined : readFilePath.limit,
            ...(isPartial && {
              isPartialView: true,
            }),
            contentFromTranscript: true,
          });
          if (writtenPaths?.has(normalizedPath))
            hashByPath.set(normalizedPath, remoteFileState.get(readFilePath.filePath).contentHash);
        }
      }
      let writeToolData = fileWriteToolUseIds.get(block.tool_use_id);
      let writePath = writeToolData && normalize(writeToolData.filePath);
      let canInsertWrite = writePath !== undefined && !seenPaths.has(writePath) && seenPaths.size < maxSize;
      if (
        writeToolData &&
        (canInsertWrite || hashByPath.has(writePath)) &&
        block.is_error !== true &&
        message.timestamp
      ) {
        let timestamp = new Date(message.timestamp).getTime();
        let entry = {
          content: stripBomAndCarriageReturn(writeToolData.content),
          timestamp,
          offset: undefined,
          limit: undefined,
        };
        if (canInsertWrite) insertEntry(writeToolData.filePath, entry);
        else replaceEntry(writeToolData.filePath, entry);
      }
      let editFilePath = fileEditToolUseIds.get(block.tool_use_id);
      let editPath = editFilePath && normalize(editFilePath);
      let canInsertEdit = editPath !== undefined && !seenPaths.has(editPath) && seenPaths.size < maxSize;
      if (editFilePath && (canInsertEdit || hashByPath.has(editPath)) && block.is_error !== true)
        try {
          let { content: diskContent } = detectEncodingForResolvedPath(editFilePath);
          let entry = {
            content: stripBom(diskContent),
            timestamp: getFileModificationTime(editFilePath),
            offset: undefined,
            limit: undefined,
            contentNotInModelContext: true,
          };
          if (canInsertEdit) insertEntry(editFilePath, entry);
          else replaceEntry(editFilePath, entry);
        } catch (error) {
          logForDebugging(
            `extractReadFilesFromMessages: skipping Edit disk read for ${editFilePath}: ${errorMessage(error)}`,
          );
        }
      if (seenPaths.size >= maxSize && hashByPath.size === 0) break e;
    }
  }
  for (let j = insertedPaths.length - 1; j >= 0; j--) {
    let path = insertedPaths[j];
    cache.set(path, remoteFileState.get(path));
  }
  return cache;
}
//@ chunk-0h4e7gnq.js:78840-80094 layout
/**
 * 日志自证：收集回退时需重新追踪的文件路径（编辑类工具、文件附件、记忆附件）。
 */
function collectRewoundFileTrackingPaths(messages, cwd, toolAliases) {
  let readFilePaths = [];
  let nestedMemoryPaths = [];
  let spelledFilePaths = [];
  for (let message of messages) {
    if (message.type === "assistant") {
      if (!Array.isArray(message.message.content)) continue;
      for (let block of message.message.content) {
        if (
          !isPlainObject(block) ||
          block.type !== "tool_use" ||
          !isPlainObject(block.input) ||
          hasHostField(block.input)
        )
          continue;
        let input = block.input;
        let last = toolNameVariants(block.name, toolAliases).at(-1);
        let pathValue =
          last === NOTEBOOK_EDIT_TOOL_NAME
            ? input.notebook_path
            : last === FILE_READ_TOOL_NAME || last === FILE_EDIT_TOOL_NAME || last === FILE_WRITE_TOOL_NAME
              ? input.file_path
              : undefined;
        if (typeof pathValue !== "string") continue;
        if (last === FILE_READ_TOOL_NAME && isImageOrPdfExtension(pathValue)) continue;
        let absolutePath = expandPathOrNull(pathValue, cwd);
        if (absolutePath !== normalize(pathValue)) spelledFilePaths.push(pathValue);
        if (absolutePath === null) {
          logForDebugging(
            `collectRewoundFileTrackingPaths: skipping ${block.name} tool_use: its path cannot be resolved`,
          );
          continue;
        }
        readFilePaths.push(absolutePath);
      }
    }
    if (message.type !== "attachment") continue;
    let attachment = message.attachment;
    if (attachment.type === "file") {
      let contentType = attachment.content?.type;
      if (contentType !== "image" && contentType !== "pdf" && contentType !== "parts")
        try {
          readFilePaths.push(expandPath(attachment.filename, cwd));
        } catch (error) {
          logForDebugging(
            `collectRewoundFileTrackingPaths: skipping malformed file attachment: ${errorMessage(error)}`,
          );
        }
    } else if (attachment.type === "nested_memory") {
      if (typeof attachment.path === "string") nestedMemoryPaths.push(attachment.path);
    } else if (attachment.type === "relevant_memories") {
      if (Array.isArray(attachment.memories)) {
        for (let memory of attachment.memories)
          if (typeof memory?.path === "string") readFilePaths.push(memory.path);
      }
    } else if (attachment.type === "edited_text_file")
      try {
        readFilePaths.push(expandPath(attachment.filename, cwd));
      } catch (error) {
        logForDebugging(
          `collectRewoundFileTrackingPaths: skipping malformed edited_text_file attachment: ${errorMessage(error)}`,
        );
      }
  }
  return {
    readFilePaths,
    nestedMemoryPaths,
    spelledFilePaths,
  };
}
//@ chunk-0h4e7gnq.js:80094-80199 layout
/**
 * 追加一条消息到对话（失败时直接 push 去重）。
 */
async function appendMessageToConversation(messages, message) {
  try {
    await appendRowsWithHooks(conversationAppender(messages), [message]);
  } catch (error) {
    logError(error);
    if (!messages.some((appendedMessage) => appendedMessage.uuid === message.uuid)) messages.push(message);
  }
}
//@ chunk-0h4e7gnq.js:80199-80248 layout
/**
 * 对话追加器（把行 push 到数组）。
 */
function conversationAppender(list) {
  return rowSourceFor(list, (rows) => {
    list.push(...rows);
  });
}
//@ chunk-0h4e7gnq.js:80248-80630 layout
/**
 * 把兄弟调用分成可运行（工具在池中）与缺失工具两类。
 */
function partitionSiblingRuns(permission, tools, toolAliases) {
  let runs = [];
  let missingToolNames = [];
  let missingBlocks = false;
  for (let sibling of permission.siblings ?? []) {
    let block = Array.isArray(sibling.assistantMessage.message.content)
      ? sibling.assistantMessage.message.content.find(
          (block) => block.type === "tool_use" && block.id === sibling.toolUseID,
        )
      : undefined;
    if (block === undefined) missingBlocks = true;
    else if (findTool(tools, block.name, toolAliases))
      runs.push({
        block,
        assistantMessage: sibling.assistantMessage,
      });
    else missingToolNames.push(block.name);
  }
  return {
    runs,
    missingToolNames,
    missingBlocks,
  };
}
//@ chunk-0h4e7gnq.js:80630-80820 fingerprint (2.1.88 match: handleOrphanedPermission, 0.365)
/**
 * 孤立权限的决定：被调用方强制询问时保留 ask（重启前挂起的除外），否则视为允许。
 */
function handleOrphanedPermission_2(result) {
  if (result?.behavior === "ask" && result.forcedByCaller === true)
    return result.pendingBeforeRestart === true ? undefined : result;
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
function hasToolResultAfter(mutableMessages, fromIndex, toolUseID) {
  return mutableMessages
    .slice(fromIndex)
    .some(
      (message) =>
        message.type === "user" &&
        Array.isArray(message.message.content) &&
        message.message.content.some(
          (block) => block.type === "tool_result" && block.tool_use_id === toolUseID,
        ),
    );
}
//@ chunk-0eyv3mzk.js:227-501 fingerprint (2.1.88 match: extractBashToolsFromMessages, 1)
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
  let names = new Set();
  for (let toolRef of extractBashToolsFromMessages(messages)) {
    let cliName = extractCliName(toolRef);
    if (cliName) names.add(cliName);
  }
  return names;
}
//@ chunk-0eyv3mzk.js:839-923 placement
/**
 * referencedBashToolNames：从消息里的 Bash 工具调用提取引用的工具名。
 */
function referencedBashToolNames(messages) {
  let names = new Set();
  for (let toolRef of extractBashToolsFromMessages(messages))
    for (let ref of parseReferences(toolRef)) names.add(ref);
  return names;
}
//@ chunk-0eyv3mzk.js:923-1104 placement (2.1.88 match: countToolCallsSince, 1)
function collectUsedToolNames(messages) {
  let names = new Set();
  for (let message of messages)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let block of message.message.content) if (block.type === "tool_use") names.add(block.name);
    }
  return names;
}
//@ chunk-0eyv3mzk.js:1104-1128 fingerprint (2.1.88 match: STRIPPED_COMMANDS, 1)
/**
 * 取 CLI 名时跳过的前缀命令（sudo）。
 */
var STRIPPED_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0eyv3mzk.js:1104", () => {
  STRIPPED_COMMANDS = new Set(["sudo"]);
});
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
