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
  QUr,
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
  mLr,
} from "./messages/mappers.js";
import { stripMemoryTagsFromBlocks } from "../services/orgMemory/promptIndex.js";
import { getSessionId, isSessionPersistenceDisabled } from "../bootstrap/state.js";
import { MESSAGE_MARK_SYMBOLS } from "./messageKinds.js";
import {
  takeCutResult,
  hasTypeField,
  waitForMcpToolServer,
  s3s,
  shouldWaitForMcpTool,
} from "../services/tools/toolExecution.js";
import { AGENT } from "../tools/AgentTool/constants.js";
import { getToolPermissionContext } from "./permissions/toolPermissionContext.js";
import { logForDebugging } from "./debug.js";
import { extractTraceparentContext, runInContext } from "./telemetry/sessionTracing.js";
import { clearCommandAllowRules, Var } from "./pollEvents.js";
import { runTools } from "../services/tools/toolOrchestration.js";
import { mGt, gGt, hmn, E3s } from "./queryProfiler.js";
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
import { qS } from "../services/api/deferredToolsState.js";
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
  jKt,
} from "./messages/messagePredicates.js";
import { XKo } from "../services/compact/keptTools.js";
import { unwrapAbortReason } from "./abortController.js";
import { setCommandDenyRules } from "./attachments/skillMentions.js";
import { DEVICE_CALL_NOT_SENT_TEXT, notSentNotice } from "./remoteTools/restartNotices.js";
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
import { nv, p9r, __, tv } from "./remoteFileState.js";
import { Cf } from "../bridge/deviceRegistration.js";
import { FILE_READ_TOOL_NAME, Mge } from "../tools/FileReadTool/constants.js";
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
import { nSt } from "../plugins/functionHooks/coreHandlers.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { ge } from "./identity.js";
import { SHELL_TOOL_NAMES } from "./shell/shellToolUtils.js";
import { parseReferences } from "../history.js";

/**
 * 10：提取已读文件状态的默认缓存大小。
 */
//@ chunk-0h4e7gnq.js:49711-49721 affinity
var READ_FILE_STATE_CACHE_SIZE = 10;
/**
 * 结果是否成功：最后块是 text/thinking，或是 tool_result 用户消息，或 stop_reason=end_turn。
 */
//@ chunk-0h4e7gnq.js:49721-49930 fingerprint = isResultSuccessful (0.89)
function isResultSuccessful(message, stopReason = null) {
  if (!message) return !1;
  if (message.type === "assistant") {
    let lastContent = yj(message.message.content);
    return (
      lastContent?.type === "text" ||
      lastContent?.type === "thinking" ||
      lastContent?.type === "redacted_thinking"
    );
  }
  if (isToolResultOnlyUserMessage(message)) return !0;
  return stopReason === "end_turn";
}
/**
 * 末尾是 server_error 的 API 错误但前一条已成功、轮次 completed 时可忽略。
 */
//@ chunk-0h4e7gnq.js:49930-50143 layout
function isRecoverableTrailingServerError({
  trailing: trailing,
  preceding: preceding,
  terminalReason: terminalReason,
  retractionExhausted: retractionExhausted,
}) {
  return (
    trailing?.type === "assistant" &&
    trailing.isApiErrorMessage === !0 &&
    trailing.error === "server_error" &&
    terminalReason === "completed" &&
    !retractionExhausted &&
    preceding !== void 0 &&
    isToolResultOnlyUserMessage(preceding) &&
    getToolEndsTurnKind(preceding) !== !1
  );
}
/**
 * 最后一条与前一条都是文本（且不是合成文本）时取前一条文本作为结果。
 */
//@ chunk-0h4e7gnq.js:50143-50288 layout
function getSalvageableResultText(e, n) {
  let s = yj(e.message.content),
    y = yj(n?.message.content);
  return s?.type === "text" && !SYNTHETIC_MESSAGES.has(s.text) && y?.type === "text" ? y.text : void 0;
}
/**
 * 内存错误日志中某条之后的错误。
 */
//@ chunk-0h4e7gnq.js:50288-50377 layout
function getRecentErrorLog(e) {
  let n = getInMemoryErrors(),
    s = e ? n.lastIndexOf(e) + 1 : 0;
  return n.slice(s).map((y) => y.error);
}
/**
 * 空结果诊断：结果类型描述 + 最近错误。
 */
//@ chunk-0h4e7gnq.js:50377-50424 layout
function buildEmptyResultDiagnostics(e, n, s) {
  return [formatResultDiagnostic(e, n), ...getRecentErrorLog(s)];
}
/**
 * "[ede_diagnostic] result_type=… last_content_type=… stop_reason=…"。
 */
//@ chunk-0h4e7gnq.js:50424-50617 layout
function formatResultDiagnostic(e, n) {
  let s = e?.type ?? "undefined",
    y = e?.type === "assistant" ? (yj(e.message.content)?.type ?? "none") : "n/a";
  return `[ede_diagnostic] result_type=${s} last_content_type=${y} stop_reason=${n}`;
}
/**
 * 首块是 tool_use 或 tool_result 的 user/assistant。覆盖后缀名 countToolCallsSince_3。
 */
//@ chunk-0h4e7gnq.js:50617-50800 layout = countToolCallsSince (1)
function isToolUseOrResultMessage(e) {
  if (e.type !== "assistant" && e.type !== "user") return !1;
  let content = e.message.content;
  if (!Array.isArray(content)) return !1;
  let s = content[0];
  return s?.type === "tool_use" || s?.type === "tool_result";
}
/**
 * 开启转发且（转发文本或该消息是工具调用/结果）。
 */
//@ chunk-0h4e7gnq.js:50800-50859 layout
function shouldForwardSubagentMessage(e, n) {
  return e.enabled && (e.forwardText || isToolUseOrResultMessage(n));
}
/**
 * 子代理 progress 事件转 SDK 消息（带 parent_tool_use_id、agent_id、subagent_type）。
 */
//@ chunk-0h4e7gnq.js:50859-52368 layout
function* subagentProgressToSDKMessages(e, n) {
  let agentType = e.data.agentType,
    description = e.data.description,
    message = e.data.message,
    S =
      message.type === "user"
        ? toolResultRemedy(message).flatMap(({ id: id, permission_decision: permission_decision }) =>
            permission_decision ? [{ id: id, permission_decision: permission_decision }] : [],
          )
        : [];
  for (let h of normalizeMessages([message]))
    switch (h.type) {
      case "assistant":
        if (!isNotEmptyMessage(h)) break;
        {
          let k = buildToolDisplayNames(h.message.content, n),
            w = stripMemoryTagsFromBlocks(h.message.content),
            x = e.data.message.type === "assistant" ? e.data.message : void 0;
          yield {
            type: "assistant",
            message: w === h.message.content ? h.message : { ...h.message, content: w },
            parent_tool_use_id: e.parentToolUseID,
            agent_id: e.data.agentId,
            session_id: getSessionId(),
            uuid: h.uuid,
            timestamp: h.timestamp,
            error: h.error,
            ...(h.requestId !== void 0 && { request_id: h.requestId }),
            ...(agentType !== void 0 && { subagent_type: agentType }),
            ...(description !== void 0 && { task_description: description }),
            ...(h.isApiErrorMessage === !0 && { is_api_error_message: !0 }),
            ...(h.apiError !== void 0 && { api_error: h.apiError }),
            ...(h.apiErrorParams !== void 0 && { api_error_params: h.apiErrorParams }),
            ...(h.apiErrorCode !== void 0 && { api_error_code: h.apiErrorCode }),
            ...(x?.[MESSAGE_MARK_SYMBOLS] !== void 0 && { api_error_origin: x[MESSAGE_MARK_SYMBOLS] }),
            ...getNarrationFields(w, h.message.model),
            ...(k.length > 0 && { tool_use_meta: k }),
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
          ...!1,
          tool_use_result: h.mcpMeta
            ? { content: h.toolUseResult, ...h.mcpMeta }
            : h.toolUseResult === void 0
              ? QUr(h)
              : h.toolUseResult,
          ...(k.length > 0 && { tool_result_meta: k }),
          ...(h.origin && { origin: h.origin }),
          ...(agentType !== void 0 && { subagent_type: agentType }),
          ...(description !== void 0 && { task_description: description }),
        };
        break;
      }
    }
}
/**
 * 取并消费 tool_result 对应的计时记录。
 */
//@ chunk-0h4e7gnq.js:52368-52533 layout
function takeToolResultTiming(e) {
  let content = e.message.content,
    s = Array.isArray(content) ? content.find((y) => y.type === "tool_result") : void 0;
  return s?.type === "tool_result" ? takeCutResult(s.tool_use_id, e.uuid) : void 0;
}
/**
 * 内部消息转 SDK 流消息（-p/SDK 输出）：assistant 拆块并过滤空块、progress（子代理/心跳）、user、附件、系统消息。
 */
//@ chunk-0h4e7gnq.js:52533-54292 fingerprint = normalizeMessage (0.374)
function* normalizeMessage(message, n) {
  switch (message.type) {
    case "assistant": {
      let supersedesUuids = message.supersedesUuids;
      for (let normalized of normalizeMessages([message])) {
        if (!isNotEmptyMessage(normalized)) continue;
        let r = supersedesUuids;
        supersedesUuids = void 0;
        let S = buildToolDisplayNames(normalized.message.content, n);
        yield {
          type: "assistant",
          message: normalized.message,
          parent_tool_use_id: null,
          session_id: getSessionId(),
          uuid: normalized.uuid,
          timestamp: normalized.timestamp,
          error: normalized.error,
          ...(normalized.requestId !== void 0 && { request_id: normalized.requestId }),
          ...(r !== void 0 && r.length > 0 && { supersedes: r }),
          ...isAssistantResultComplete(message, normalized.message.content),
          ...getNarrationFields(normalized.message.content, normalized.message.model),
          ...getThinkingFields(message, normalized.message.content),
          ...(S.length > 0 && { tool_use_meta: S }),
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
          heartbeat: !0,
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
          ...(message.data.resolved !== !0 && {
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
      let s = toolResultRemedy(message),
        y = takeToolResultTiming(message);
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
              ? { content: normalized.toolUseResult, ...normalized.mcpMeta }
              : normalized.toolUseResult),
          ...(S.length > 0 && { tool_result_meta: S }),
          ...void 0,
          ...(normalized.origin && { origin: normalized.origin }),
          ...(message.isVirtual === !0 && { is_virtual: !0 }),
          ...(message.refusedMessageId !== void 0 && { refused_message_id: message.refusedMessageId }),
        };
      }
      return;
    }
    default:
  }
}
/**
 * tool_host_result_lines、hook_system_message 附件转 SDK 系统消息。
 */
//@ chunk-0h4e7gnq.js:54292-54497 layout
function* attachmentToSDKMessages(e) {
  let { attachment: attachment } = e,
    s;
  try {
    if (attachment.type === "tool_host_result_lines")
      s = toSDKToolHostResultMessage(attachment, e.uuid, getSessionId());
    else if (attachment.type === "hook_system_message")
      s = { ...mLr(attachment), uuid: e.uuid, session_id: getSessionId() };
  } catch (error) {
    logError(error);
  }
  if (s) yield s;
}
/**
 * 恢复延迟的工具调用：在转录里找回 tool_use，重新走 PreToolUse 与执行，结果写回转录。
 */
//@ chunk-0h4e7gnq.js:54497-56016 layout
async function* resumeDeferredToolUse(e, n, s, y) {
  let r = !isSessionPersistenceDisabled(),
    S,
    mode = getToolPermissionContext(y).mode;
  if (mode !== e.permissionMode)
    logForDebugging(
      `Deferred tool resume: permissionMode mismatch (deferred under '${e.permissionMode}', resuming under '${mode}'). --resume does not restore permissionMode \u2014 pass --permission-mode ${e.permissionMode} to match.`,
      { level: "warn" },
    );
  let last = s.findLast(
    (I) =>
      I.type === "assistant" &&
      Array.isArray(I.message.content) &&
      I.message.content.some((G) => G.type === "tool_use" && G.id === e.toolUseID),
  );
  if (!last || last.type !== "assistant") {
    logForDebugging(`Deferred tool resume: tool_use ${e.toolUseID} not found in transcript`, {
      level: "warn",
    });
    return;
  }
  let found = last.message.content.find((I) => I.type === "tool_use" && I.id === e.toolUseID);
  if (!found) return;
  logForDebugging(`Deferred tool resume: re-emitting ${e.toolName} (${e.toolUseID}) through PreToolUse`);
  let x = extractTraceparentContext(e.traceparent);
  y.setToolPermissionContext(clearCommandAllowRules);
  let L = runTools([found], [last], n, y)[Symbol.asyncIterator]();
  mGt("resume_other", "turn_start_tool_run");
  try {
    while (!0) {
      let I = await runInContext(x, () => L.next());
      if (I.done) break;
      let G = I.value;
      if (hasTypeField(G)) continue;
      if (G.message) {
        if ((await appendMessageToConversation(s, G.message), r))
          await recordTranscript(s, void 0, void 0, void 0, y.storageV5);
        if (G.message.type === "progress" || G.message.type === "user") {
          yield* normalizeMessage(G.message, y.options.refreshTools?.() ?? y.options.tools);
          continue;
        }
        if (G.message.type === "attachment" && G.message.attachment.type === "hook_deferred_tool")
          S = G.message.attachment;
        yield { ...G.message, session_id: getSessionId(), parent_tool_use_id: null };
      }
    }
  } catch (error) {
    try {
      await L.return?.(void 0);
    } catch {}
    throw error;
  } finally {
    (gGt("resume_other", "turn_start_tool_run"), await L.return?.(void 0));
  }
  return S;
}
/**
 * 孤立权限被拒时对消息做的变换（refused / orphaned permission）。
 */
//@ chunk-0h4e7gnq.js:56016-56067 layout
var orphanedPermissionRefusedTransform = DoctorLazy(() =>
  capPermissionUpdates_2("refused", "orphaned permission"),
);
/**
 * 重放工具的 askInputPreparer，判断记录的答案是否仍适用（served/answer_differs/step_failed 等）。
 */
//@ chunk-0h4e7gnq.js:56067-56590 layout
async function replayAskInputPreparer(e, n, s, y, r, S) {
  let { signal: signal } = r.abortController,
    k,
    w = !1;
  try {
    let x = await e.askInputPreparer?.(n, r, S);
    if (x?.prepareAgain === void 0) return;
    if (y === null) return { ended: "no_record" };
    if (Object.keys(s).length === 0) return { ended: "answer_empty" };
    if (!isSameAnswerInput(s, y)) return { ended: "answer_differs" };
    let prepareAgain = await x.prepareAgain(y);
    if (!("error" in prepareAgain)) {
      if (((k = prepareAgain.release), !signal.aborted && isSameAnswerInput(y, prepareAgain.input)))
        return { ended: "served", input: prepareAgain.input };
      w = !0;
    }
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
  return (await k?.(), { ended: signal.aborted ? "aborted" : w ? "step_differs" : "step_failed" });
}
/**
 * 重放工具调用时计算应用的权限更新（规范化输入；某些工具或 MCP 服务器只保留非 allow 规则）。
 */
//@ chunk-0h4e7gnq.js:56590-56771 layout
function computePermissionUpdatesForReplay(e, n, s, y) {
  let r = normalizePermissionUpdate(e, void 0, y),
    S =
      !n ||
      n.suppressesAllPermissionUpdates?.(s) === !0 ||
      (n.mcpInfo?.serverName === REMOTE_DEVICES && isRemoteToolForwardingSwitchOn())
        ? withoutGrantsForRemoteScope(r)
        : stripWholeToolGrantsForAsk(r, n, y);
  return n?.name === SKILL ? withoutNewRulesOfMcpSkillLoadForm(getToolNameWithAliases(n, y), S, y) : S;
}
/**
 * MCP 交接调用恢复被中断轮次、当前不能询问时延后（开关 tengu_velvet_gannet）。
 */
//@ chunk-0h4e7gnq.js:56771-56941 layout
function shouldDeferMcpOrphanedAsk(e, n, s) {
  return (
    typeof e === "string" &&
    mcpInfoFromString(e)?.serverName === REMOTE_DEVICES &&
    n.resumesInterruptedTurn === !0 &&
    !(s.toolState.get(ReannounceRequester).canAsk() && isRemoteToolForwardingSwitchOn()) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_gannet", !1)
  );
}
/**
 * 恢复时处理孤立的权限请求：按答案策略重新执行或拒绝对应 tool_use，并补写结果。
 */
//@ chunk-0h4e7gnq.js:56941-64632 layout
async function* handleOrphanedPermission(e, n, s, y, r, S, h) {
  using k = {
    [Symbol.dispose]() {
      let me = e.permissionResult?.toolUseID;
      if (me !== void 0) takeLateAllowDecision(r.session, me);
    },
  };
  switch ((r.setToolPermissionContext(clearCommandAllowRules), h.kind)) {
    case "strict":
    case "launcher":
      break;
    default:
      return (
        logForDebugging(
          `handleOrphanedPermission: dropping orphaned permission \u2014 the answer policy's kind (a ${typeof h.kind}) is not one this sink knows`,
          { level: "warn" },
        ),
        { reExecuted: !1, reason: "unknown_answer_policy", toolWait: void 0, callStarted: !1 }
      );
  }
  let w = !isSessionPersistenceDisabled(),
    { permissionResult: permissionResult, assistantMessage: assistantMessage } = e,
    { toolUseID: toolUseID } = permissionResult;
  if (!toolUseID)
    return (
      logForDebugging(
        "handleOrphanedPermission: dropping orphaned permission \u2014 permissionResult is missing toolUseID",
        { level: "warn" },
      ),
      { reExecuted: !1, reason: "no_tool_use_id", toolWait: void 0, callStarted: !1 }
    );
  let content = assistantMessage.message.content,
    ee;
  if (Array.isArray(content)) {
    for (let me of content)
      if (me.type === "tool_use" && me.id === toolUseID) {
        ee = me;
        break;
      }
  }
  if (!ee)
    return (
      logForDebugging(
        `handleOrphanedPermission: dropping orphaned permission for toolUseID=${toolUseID} \u2014 assistant message ${assistantMessage.message.id} has no matching tool_use block`,
        { level: "warn" },
      ),
      { reExecuted: !1, reason: "no_tool_use_block", toolWait: void 0, callStarted: !1 }
    );
  let te = ee.name;
  if (permissionResult.behavior === "deny" && e.denyIsRefusal === !0) {
    let toolAliases = r.options.toolAliases;
    if (isPlainObject(ee.input))
      r.onPermissionDenial?.(qS(n, te, toolAliases) ?? { name: te }, toolUseID, ee.input);
    yield* recordToolDenialResult({
      block: ee,
      assistantMessage: assistantMessage,
      messageRows: e.messageRows,
      message: permissionResult.message,
      tools: n,
      context: r,
      mutableMessages: y,
      persistSession: w,
      toolDenialKind:
        "decisionClassification" in permissionResult &&
        permissionResult.decisionClassification === "user_reject"
          ? "user-rejected"
          : void 0,
      ...(!e.siblings?.length && { notSent: e.notSent }),
    });
    let Re = n,
      Ie = partitionSiblingRuns(e, Re, toolAliases);
    for (let Ke of new Set(Ie.missingToolNames)) {
      let Ne = await waitForMcpToolServer(Ke, Re, r);
      if (((Re = Ne.tools), Ne.aborted)) break;
    }
    if ((e.siblings?.length ?? 0) > 0 && r.abortController.signal.aborted) {
      if (e.notSent?.length)
        yield* await answerCallsNeverSent({
          notSent: e.notSent,
          tools: n,
          mutableMessages: y,
          persistSession: w,
          context: r,
        });
      return { reExecuted: !1, reason: "aborted", toolWait: void 0, callStarted: !1 };
    }
    if (Ie.missingToolNames.length > 0) Ie = partitionSiblingRuns(e, Re, toolAliases);
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
              decisionReason: { type: "mode", mode: "default" },
            };
          return (Ke.has(Ue) ? handleOrphanedPermission_2(Et) : void 0) ?? s(Ne, je, Ee, Le, Ue, Et);
        },
        executionContext: {
          ...r,
          requireCanUseTool: !0,
          ...(Re !== n && { options: { ...r.options, tools: Re, mcpClients: [...currentMcpClients(r)] } }),
        },
        mutableMessages: y,
        persistSession: w,
        notSent: e.notSent,
        echoed: new Set([assistantMessage.uuid]),
      });
    } else if (e.siblings?.length)
      yield* await answerCallsNeverSent({
        notSent: e.notSent ?? [],
        tools: n,
        mutableMessages: y,
        persistSession: w,
        context: r,
      });
    return { reExecuted: !0, toolWait: void 0, ...(await storeHandoffNote(e, y, w, r)), callStarted: !1 };
  }
  let R =
      permissionResult.behavior === "allow" && h.kind === "launcher"
        ? orphanedPermissionRefusedTransform().safeParse(permissionResult.updatedPermissions)
        : void 0,
    z =
      R?.success === !1
        ? {
            behavior: "deny",
            message: `The canUseTool callback returned an invalid permission result. ${PERMISSION_UPDATES_LIMIT_MESSAGE}`,
            toolUseID: toolUseID,
            decisionReason: CAN_USE_TOOL_INVALID_RESULT_DENY_REASON,
            decideLocation: "ask-path",
          }
        : void 0;
  if (z)
    logForDebugging(
      `handleOrphanedPermission: treating the orphaned allow for toolUseID=${toolUseID} as a denial: its updatedPermissions is too long. ${PERMISSION_UPDATES_LIMIT_MESSAGE}`,
      { level: "warn" },
    );
  let Z = z ?? permissionResult,
    V = n,
    le = qS(V, te, r.options.toolAliases),
    j,
    ie,
    he = typeof te === "string" ? mcpInfoFromString(te)?.serverName : void 0,
    B = !le && shouldDeferMcpOrphanedAsk(te, e, r);
  if (!le) {
    if (
      ((j = await hmn("resume_other", "resume_connector_wait", () =>
        B && Z.behavior === "allow" ? S(te, n, r, r.storageV5) : waitForMcpToolServer(te, n, r),
      )),
      (le = j.tool),
      (V = j.tools),
      le)
    )
      logForDebugging(
        `handleOrphanedPermission: tool "${te}" for toolUseID=${toolUseID} joined the pool after ${j.waitedMs}ms (${j.bridgeEnd ? `the device bridge listed it: ${j.bridgeEnd}` : "its MCP server finished connecting"}); re-executing`,
      );
  }
  if (!le) {
    let me =
      j !== void 0 &&
      !j.aborted &&
      (j.serverState === "connected" ||
        j.serverState === "failed" ||
        j.serverState === "needs-auth" ||
        j.serverState === "disabled") &&
      (Z.behavior === "allow" || Z.behavior === "deny") &&
      e.resumesInterruptedTurn === !0 &&
      !e.siblings?.length &&
      he !== void 0 &&
      lastUserAfterAssistant(y) &&
      (he === REMOTE_DEVICES
        ? B && !s3s(j.bridgeEnd)
        : getFeatureValue_CACHED_MAY_BE_STALE("tengu_expressive_church", !1));
    if (
      (logForDebugging(
        j?.aborted
          ? `handleOrphanedPermission: turn aborted while waiting for tool "${te}" (toolUseID=${toolUseID}); not re-executing`
          : `handleOrphanedPermission: ${me ? "closing the call of the" : "dropping"} orphaned permission for toolUseID=${toolUseID} \u2014 tool "${te}" not found in active tools (${V.length} available; MCP server ${j?.serverState ?? "unknown"} after ${j?.waitedMs ?? 0}ms)`,
        { level: "warn" },
      ),
      (ie = j?.aborted || j?.serverState === "unknown" ? void 0 : missingToolTelemetry(te, n, r)),
      !me)
    ) {
      if (h.kind === "strict" && Z.behavior === "allow")
        warnLateAllowNeverServed(toolUseID, Z.updatedPermissions);
      let Re = e.notSent?.filter((Ie) => !Ie.onUsersDevice);
      if (Re?.length)
        yield* await answerCallsNeverSent({
          notSent: Re,
          tools: n,
          mutableMessages: y,
          persistSession: w,
          context: r,
        });
      return {
        reExecuted: !1,
        reason: j?.aborted ? "aborted" : "tool_unavailable",
        toolWait: j,
        missingTool: ie,
        callStarted: !1,
      };
    }
    if (Z.behavior === "deny") {
      if (
        (yield* recordToolDenialResult({
          block: ee,
          assistantMessage: assistantMessage,
          messageRows: e.messageRows,
          message: Z.message,
          tools: V,
          context: r,
          mutableMessages: y,
          persistSession: w,
        }),
        e.notSent?.length)
      )
        yield* await answerCallsNeverSent({
          notSent: e.notSent,
          tools: n,
          mutableMessages: y,
          persistSession: w,
          context: r,
        });
      return { reExecuted: !1, reason: "closed_unrun", toolWait: j, missingTool: ie, callStarted: !1 };
    }
  }
  let ce = V === n ? r : { ...r, options: { ...r.options, tools: V, mcpClients: [...currentMcpClients(r)] } },
    Ae;
  if (Z.behavior === "allow") {
    let updatedInput = Z.updatedInput;
    if (updatedInput && Object.keys(updatedInput).length > 0) Ae = updatedInput;
    else
      ((Ae = {}),
        logForDebugging(
          `Orphaned permission for ${te}: updatedInput is missing or empty, falling back to original tool input`,
          { level: "warn" },
        ));
    let Re = R?.data;
    if (Re)
      try {
        let Ie = computePermissionUpdatesForReplay(Re, le, ee.input, getToolPermissionContext(r));
        (r.setSessionToolPermissionContext((Je) => applyPermissionUpdates(Je, Ie)),
          await persistPermissionUpdates(Ie, r.storageV5));
      } catch (error) {
        logForDebugging(
          `Orphaned permission for ${te}: applying or persisting updatedPermissions failed: ${error}`,
          { level: "warn" },
        );
      }
  }
  let Te = new Set((e.siblings ?? []).map((me) => me.toolUseID)),
    O =
      h.kind === "strict" && Z.behavior === "allow" && Ae !== void 0
        ? createLateAnswerBound(
            h,
            { updatedInput: Ae, updatedPermissions: Z.updatedPermissions },
            toolUseID,
            computePermissionUpdatesForReplay,
          )
        : void 0,
    q,
    W = le !== void 0,
    ue = async (me, Re, Ie, Je, Ke, Ne) => {
      if (((W ||= Ke === toolUseID), Te.has(Ke)))
        return handleOrphanedPermission_2(Ne) ?? s(me, Re, Ie, Je, Ke, Ne);
      if (
        Ke !== toolUseID ||
        (Ne?.behavior === "ask" &&
          Ne.forcedByCaller === !0 &&
          (Ne.pendingBeforeRestart === !0 || (Ke === toolUseID && O?.hasServedAllow() === !0)))
      )
        return s(me, Re, Ie, Je, Ke, Ne);
      if (Ne?.behavior === "ask" && Ne.forcedByCaller === !0) return Ne;
      let je = z ?? O?.refusalOf(me, Re, Ie, Ie.setSessionToolPermissionContext);
      if (je === void 0 && Ae !== void 0 && e.cardInput !== void 0 && Ie.forRemoteExecution !== !0)
        q ??= replayAskInputPreparer(me, Re, Ae, e.cardInput, Ie, toolUseID);
      let Ee = je === void 0 ? await q : void 0;
      if (Ee !== void 0 && Ee.ended !== "served")
        return {
          behavior: "deny",
          toolUseID: toolUseID,
          decideLocation: "ask-path",
          ...(Ee.ended === "aborted"
            ? { message: "Tool permission request aborted", decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON }
            : {
                message: `The approval of ${me.name} was asked for before Claude Code restarted, and cannot be reused. Call ${me.name} again with the same arguments; it may need approval again. ${me.name} was not called.`,
                decisionReason: { type: "other", reason: "approval cannot be reused" },
              }),
        };
      if (je === void 0 && Z.behavior === "allow")
        recordMcpApprovalTicket_2(takeLateAllowDecision(Ie.session, toolUseID), me, toolUseID, Ie);
      return (
        je ?? {
          ...Z,
          updatedInput: Ee?.input ?? Ae,
          decisionReason:
            h.kind === "strict"
              ? { type: "permissionPromptTool", permissionPromptToolName: me.name, toolResult: Z }
              : { type: "mode", mode: "default" },
        }
      );
    },
    runs = partitionSiblingRuns(e, V, r.options.toolAliases).runs,
    Q = new Set();
  (yield* runToolUsesOnResume({
    runs: [{ block: ee, assistantMessage: assistantMessage, messageRows: e.messageRows }, ...runs],
    tools: V,
    canUseTool: ue,
    executionContext: { ...ce, requireCanUseTool: !0, markToolCallStarted: Q.add.bind(Q) },
    mutableMessages: y,
    persistSession: w,
    notSent: e.notSent,
  }),
    O?.warnIfNeverAsked());
  let Pe = await storeHandoffNote(e, y, w, r),
    Ce = Q.has(toolUseID);
  if (W) {
    let me = (await q)?.ended;
    return { reExecuted: !0, toolWait: j, ...Pe, callStarted: Ce, ...(me !== void 0 && { cardStep: me }) };
  }
  return r.abortController.signal.aborted
    ? { reExecuted: !1, reason: "aborted", toolWait: j, callStarted: Ce }
    : { reExecuted: !1, reason: "closed_unrun", toolWait: j, missingTool: ie, ...Pe, callStarted: Ce };
}
/**
 * 把交接笔记写进转录并持久化，成功返回 {noteStored:true}。
 */
//@ chunk-0h4e7gnq.js:64632-64828 layout
async function storeHandoffNote(e, n, s, y) {
  if (e.note === void 0 || y.abortController.signal.aborted) return {};
  let r = !1;
  try {
    (await appendMessageToConversation(n, e.note()), (r = !0), await persistIfNeeded(n, s, y));
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
  return r ? { noteStored: !0 } : {};
}
/**
 * 从末尾看，真实 user 消息是否出现在 assistant 之前。
 */
//@ chunk-0h4e7gnq.js:64828-64990 layout
function lastUserAfterAssistant(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let s = e[n];
    if (s.type === "user" && !isEmptyUserMessage(s) && !isNonConversationMessage(s)) return !0;
    if (s.type === "assistant" && !isNonConversationMessage(s) && !isAbandonedOrUnsignedThinkingMessage(s))
      return !1;
  }
  return !1;
}
/**
 * 把拒绝写成 tool_result（is_error）并补回 assistant 行。
 */
//@ chunk-0h4e7gnq.js:64990-65843 layout
async function* recordToolDenialResult({
  block: block,
  assistantMessage: assistantMessage,
  messageRows: messageRows,
  message: message,
  tools: tools,
  context: context,
  mutableMessages: mutableMessages,
  persistSession: persistSession,
  toolDenialKind: toolDenialKind,
  notSent: notSent,
}) {
  if (isTerminalShutdown() && !context.abortController.signal.aborted) await heldUntilExit();
  if (
    !mutableMessages.some(
      (ee) =>
        ee.type === "assistant" &&
        Array.isArray(ee.message.content) &&
        ee.message.content.some((te) => te.type === "tool_use" && "id" in te && te.id === block.id),
    )
  )
    (conversationAppender(mutableMessages).keep(
      messagesToKeepForAssistant(assistantMessage, messageRows, mutableMessages),
    ),
      await persistIfNeeded(mutableMessages, persistSession, context));
  if ((yield toSDKAssistantMessage(assistantMessage, tools), notSent?.length))
    yield* await answerCallsNeverSent({
      notSent: notSent,
      tools: tools,
      mutableMessages: mutableMessages,
      persistSession: persistSession,
      context: context,
    });
  let I = {
      behavior: "deny",
      message: typeof message === "string" && message !== "" ? message : REJECT_MESSAGE,
      toolUseID: block.id,
      decisionReason: { type: "mode", mode: "default" },
    },
    G = createUserMessage({
      content: [{ type: "tool_result", content: I.message, is_error: !0, tool_use_id: block.id }],
      toolUseResult: `Error: ${I.message}`,
      toolDenialKind: toolDenialKind ?? getToolCallOutcomeCode(I),
      sourceToolAssistantUUID: assistantMessage.uuid,
    });
  (await appendMessageToConversation(mutableMessages, G),
    await persistIfNeeded(mutableMessages, persistSession, context),
    yield* normalizeMessage(G, tools));
}
/**
 * 交接轮次结果是否已落定（已运行或无需重试）。
 */
//@ chunk-0h4e7gnq.js:65843-66148 layout
function isHandoffTurnSettled(e) {
  if (e.ran) return !0;
  switch (e.reason) {
    case "not_stored":
    case "history_appended":
    case "stopped_closed":
    case "stopped_unconfirmed":
      return !0;
    case "no_tool_use_block":
    case "tool_unavailable":
    case "already_recorded":
    case "carried_writes_unplaceable":
    case "conversation_moved":
    case "store_refused":
      return !1;
  }
}
/**
 * 由交接信息计划 relay 标记行（stopped 时不处理）。
 */
//@ chunk-0h4e7gnq.js:66148-66424 layout
function planRelayMarkerLine(e, { kind: kind, relayMarker: relayMarker, messages: messages }, r, S) {
  if (!e || relayMarker === void 0 || kind === "stopped") return;
  let h;
  try {
    h = e.planRelayFromHandoff({
      relayMarker: relayMarker,
      carried: messages,
      conversation: r,
      persistSession: !isTranscriptPersistenceDisabled(),
      storeConfirms: S,
      turnKind: kind,
    });
  } catch (error) {
    (logError(error), (h = { arm: !1 }));
  }
  return h.arm ? h.markerLine : void 0;
}
/**
 * 交接的记忆行若已在转录里则丢弃，否则返回。
 */
//@ chunk-0h4e7gnq.js:66424-66639 layout
async function resolveHandoffMemoryLine({ memoryLine: memoryLine }, n, { storageV5: storageV5 }) {
  if (memoryLine && n && (await doesMessageExistInSession(getSessionId(), memoryLine.uuid, storageV5))) {
    logForDebugging(
      "handleHandedOffTurn: the memory line is already in the transcript; the turn goes on without it",
      { level: "warn" },
    );
    return;
  }
  return memoryLine;
}
/**
 * 在数组末尾倒数第 n 个位置前插入一行。
 */
//@ chunk-0h4e7gnq.js:66639-66699 layout
function insertBeforeTail(e, n, s) {
  return s ? e.toSpliced(e.length - n + 1, 0, s) : e;
}
/**
 * 从存储的交接信息重新武装 relay，异常只记日志。
 */
//@ chunk-0h4e7gnq.js:66699-66791 layout
function armRelayFromStoredHandoff(e, n, s, y) {
  if (!e || !n) return;
  try {
    e.armRelayFromStoredHandoff(n, s, y);
  } catch (error) {
    logError(error);
  }
}
/**
 * 日志自证：处理从其他进程交接来的轮次，校验未回答的 tool_use 与工具池，执行这些工具调用或补写历史。
 */
//@ chunk-0h4e7gnq.js:66791-70122 layout
async function* handleHandedOffTurn(e, n, s, y, r, S, h, k, w) {
  let x = !isSessionPersistenceDisabled();
  if (e.kind !== "run") return yield* appendHandedOffHistory(e, n, s, y, x, S, h);
  let L = yj(e.messages);
  if (L?.type !== "assistant" || e.toolUseIDs.length === 0)
    return (
      logForDebugging(
        "handleHandedOffTurn: the turn does not end with an assistant message naming tool_uses to run; running nothing",
        { level: "warn" },
      ),
      e.release?.(),
      { ran: !1, reason: "no_tool_use_block" }
    );
  let I = Array.isArray(L.message.content) ? L.message.content : [],
    G = [];
  for (let toolUseID of e.toolUseIDs) {
    let found = I.find((Te) => Te.type === "tool_use" && Te.id === toolUseID),
      any = s.some(
        (Te) =>
          Te.type === "user" &&
          Array.isArray(Te.message.content) &&
          Te.message.content.some((O) => O.type === "tool_result" && O.tool_use_id === toolUseID),
      );
    if (found === void 0 || any)
      return (
        logForDebugging(
          `handleHandedOffTurn: tool_use ${toolUseID} is not an unanswered call of the turn's last assistant message; running nothing`,
          { level: "warn" },
        ),
        e.release?.(),
        { ran: !1, reason: "no_tool_use_block" }
      );
    if (!qS(n, found.name, y.options.toolAliases) && !shouldWaitForMcpTool(found.name, y))
      return (
        logForDebugging(
          `handleHandedOffTurn: tool "${found.name}" for tool_use ${toolUseID} is not in the pool (${n.length} available); running nothing`,
          { level: "warn" },
        ),
        e.release?.(),
        { ran: !1, reason: "tool_unavailable" }
      );
    G.push({ block: found, assistantMessage: L });
  }
  if (isToolResultForToolUse(s))
    return (
      logForDebugging(
        "handleHandedOffTurn: the conversation ends in a call that has no result yet; running nothing",
        { level: "warn" },
      ),
      e.release?.(),
      { ran: !1, reason: "conversation_moved" }
    );
  let ee = planRelayMarkerLine(h, e, s, S !== void 0),
    messages = e.messages,
    R = L;
  if (h && !ee) {
    ((R = stripThinkingFromIndex(L)),
      (messages = [
        ...messages.slice(0, -1).map((B) => (B.type === "assistant" ? stripThinkingFromIndex(B) : B)),
        R,
      ]));
    for (let B of G) B.assistantMessage = R;
  }
  let z = await resolveHandoffMemoryLine(e, x, y);
  if (x) {
    for (let B of ee ? [...messages, ee] : messages)
      if (await doesMessageExistInSession(getSessionId(), B.uuid, y.storageV5))
        return (
          logForDebugging(
            `handleHandedOffTurn: line ${B.uuid} of the handed-off turn is already in the transcript; running nothing`,
            { level: "warn" },
          ),
          { ran: !1, reason: "already_recorded" }
        );
  }
  if ((y.setToolPermissionContext(clearCommandAllowRules), w && !(await w(e, n, y))))
    return (
      logForDebugging(
        "handleHandedOffTurn: could not write the files of the Write calls the turn brought already answered (the reason is in the turn_handoff_carried_writes diagnostic line); running nothing",
        { level: "warn" },
      ),
      e.release?.(),
      { ran: !1, reason: "carried_writes_unplaceable" }
    );
  let Z = S?.(),
    flattened = [z, ee, ...messages].flatMap((B) => (B ? [B.uuid] : []));
  if ((conversationAppender(s).keep(z ? [z, ...messages] : messages), XKo(messages), ee))
    h?.beginMarkerLineWrite();
  let le = await hmn("resume_other", "resume_store_confirm", async () => {
    if (x) {
      let startTime = performance.now();
      (await recordTranscript(insertBeforeTail(s, messages.length, ee), void 0, void 0, void 0, y.storageV5),
        E3s(performance.now() - startTime));
    }
    return Z === void 0 || (await Z(y.abortController.signal, flattened)) === !0;
  });
  if (Z !== void 0 && !le) {
    let B = unwrapAbortReason(y.abortController.signal.reason);
    if (B === "remote-cancel" || B === "user-cancel") {
      let ce = (await Z(AbortSignal.timeout(HANDOFF_CONFIRM_TIMEOUT_MS), flattened)) === !0;
      return (
        yield* cancelUnansweredToolUses(R, ce, n, s, () => persistIfNeeded(s, x, y)),
        { ran: !1, reason: ce ? "stopped_closed" : "stopped_unconfirmed" }
      );
    }
    return (
      logForDebugging(
        "handleHandedOffTurn: the carried lines were not confirmed stored (dropped by the store, or the turn was interrupted while waiting); running nothing",
        { level: "warn" },
      ),
      { ran: !1, reason: "not_stored" }
    );
  }
  armRelayFromStoredHandoff(h, ee, s, "run");
  let any = e.messages.some(isHumanTurnMessage);
  if (any) {
    let { alwaysAllowRules: alwaysAllowRules, pollEventDeliveryGuard: pollEventDeliveryGuard } =
      getToolPermissionContext(y);
    if (alwaysAllowRules.command !== void 0 || pollEventDeliveryGuard !== void 0) Var(y, void 0, void 0);
    setCommandDenyRules(y.setToolPermissionContext, []);
  }
  let lastIndex = s.findLastIndex(isHumanTurnMessage);
  return {
    ran: !0,
    contextLayers: yield* runToolUsesOnResume({
      runs: G,
      tools: n,
      canUseTool: r,
      executionContext: { ...y, turnStartIndex: any && lastIndex >= 0 ? lastIndex : s.length },
      mutableMessages: s,
      persistSession: x,
      beforeRun: k && (() => k(y.abortController.signal)),
    }),
  };
}
/**
 * 覆盖后缀名 isHumanTurn_2。
 */
//@ chunk-0h4e7gnq.js:70122-70218 layout = isHumanTurn (0.779)
function isHumanTurnMessage(m) {
  return m.type === "user" && !m.isMeta && !m.toolUseResult && !m.isCompactSummary && !isToolResultMessage(m);
}
/**
 * 15000。
 */
//@ chunk-0h4e7gnq.js:70218-70231 layout
var HANDOFF_CONFIRM_TIMEOUT_MS = 15000;
/**
 * 交接轮次为 history/stopped 时把携带的消息补进对话（检查重复、顺序与会话是否已前进），被打断时补取消结果。
 */
//@ chunk-0h4e7gnq.js:70231-72415 layout
async function* appendHandedOffHistory(e, n, s, y, r, S, h) {
  let { kind: kind, messages: messages } = e,
    x = findLastToolUseAssistantMessage(messages),
    L = s.find((B) => B.uuid === x?.uuid) ?? x,
    I = (B, ce) => {
      if (
        (logForDebugging(`handleHandedOffTurn: ${ce}; appending nothing`, { level: "warn" }),
        B !== "already_recorded")
      )
        e.release?.();
      return { ran: !1, reason: B };
    };
  if (L?.type !== "assistant") return I("no_tool_use_block", "the turn holds no assistant message to echo");
  let G = () => persistIfNeeded(s, r, y),
    ee = new Set(s.map((B) => B.uuid)),
    te = 0;
  while (te < messages.length && ee.has(messages[te].uuid)) te++;
  let sliced = messages.slice(te);
  if (sliced.some((B) => ee.has(B.uuid)))
    return I("already_recorded", "the conversation holds some of the carried lines out of order");
  if (te > 0 && !(kind === "history" && sliced.length === 0) && jKt(s)?.uuid !== messages[te - 1].uuid)
    return I("conversation_moved", "the conversation has moved on past the part of the turn it holds");
  if (te === 0 && isToolResultForToolUse(s))
    return I("conversation_moved", "the conversation ends in a call that has no result yet");
  if (r) {
    for (let B of sliced)
      if (await doesMessageExistInSession(getSessionId(), B.uuid, y.storageV5))
        return I("already_recorded", `carried message ${B.uuid} is already in the transcript`);
  }
  let z = kind === "history" && te === 0,
    Z = z ? await resolveHandoffMemoryLine(e, r, y) : void 0,
    V = z ? planRelayMarkerLine(h, e, s, S !== void 0) : void 0;
  if (V && (await doesMessageExistInSession(getSessionId(), V.uuid, y.storageV5)))
    (logForDebugging(
      "handleHandedOffTurn: the marker line is already in the transcript; appending the turn without it",
      { level: "warn" },
    ),
      (V = void 0));
  let le = S?.();
  if (sliced.length > 0) {
    if ((conversationAppender(s).keep(Z ? [Z, ...sliced] : sliced), XKo(sliced), V))
      h?.beginMarkerLineWrite();
    await persistIfNeeded(insertBeforeTail(s, sliced.length, V), r, y);
  }
  let j =
      le === void 0 ||
      (await le(
        AbortSignal.timeout(HANDOFF_CONFIRM_TIMEOUT_MS),
        [Z, V, ...messages].flatMap((B) => (B ? [B.uuid] : [])),
      )),
    ie = j === !0,
    index = s.findIndex((B) => B.uuid === messages[0]?.uuid);
  if (
    j === "refused" &&
    kind === "history" &&
    index >= 0 &&
    s.findLast(isChainParticipant)?.uuid === messages.at(-1)?.uuid
  ) {
    let B = s[index - 1];
    if (B?.type === "attachment" && B.attachment.type === "cowork_memory_context") index--;
    return (
      s.splice(index),
      logForDebugging(
        "handleHandedOffTurn: the store refused lines of the turn; removed it, echoing nothing",
        { level: "warn" },
      ),
      { ran: !1, reason: "store_refused" }
    );
  }
  if (kind === "stopped") yield* cancelUnansweredToolUses(L, ie, n, s, G);
  else if (ie) (armRelayFromStoredHandoff(h, V, s, "history"), yield toSDKAssistantMessage(L, n));
  if (!ie)
    return (
      logForDebugging("handleHandedOffTurn: the carried lines were not confirmed stored; echoing nothing", {
        level: "warn",
      }),
      { ran: !1, reason: kind === "stopped" ? "stopped_unconfirmed" : "not_stored" }
    );
  return { ran: !1, reason: kind === "stopped" ? "stopped_closed" : "history_appended" };
}
/**
 * 给未回答的 tool_use 补已取消结果并追加中断消息。
 */
//@ chunk-0h4e7gnq.js:72415-72947 layout
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
          { ...createCancelledToolResultBlock(x.id), content: withMemoryCorrectionHint(CANCEL_MESSAGE) },
        ],
        toolUseResult: CANCEL_MESSAGE,
        toolDenialKind: "cancelled",
        sourceToolAssistantUUID: e.uuid,
      }),
    ),
    w = createUserInterruptionMessage({ toolUse: !0 });
  for (let x of [...mapped, w])
    if ((await appendMessageToConversation(y, x), await r(), n)) yield* normalizeMessage(x, s);
}
/**
 * 需要持久化时把对话写入会话存储。
 */
//@ chunk-0h4e7gnq.js:72947-73022 layout
async function persistIfNeeded(e, n, s) {
  if (n) await recordTranscript(e, void 0, void 0, void 0, s.storageV5);
}
/**
 * 内部 assistant 消息转 SDK assistant 消息（session_id、request_id、tool_use_meta）。
 */
//@ chunk-0h4e7gnq.js:73022-73332 layout
function toSDKAssistantMessage(e, n) {
  let s = buildToolDisplayNames(e.message.content, n);
  return {
    type: "assistant",
    message: e.message,
    parent_tool_use_id: null,
    session_id: getSessionId(),
    uuid: e.uuid,
    timestamp: e.timestamp,
    error: e.error,
    ...(e.requestId !== void 0 && { request_id: e.requestId }),
    ...isAssistantResultComplete(e),
    ...getNarrationFields(e.message.content, e.message.model),
    ...(s.length > 0 && { tool_use_meta: s }),
  };
}
/**
 * 补写 assistant 行时决定保留哪些同轮消息。
 */
//@ chunk-0h4e7gnq.js:73332-73629 layout
function messagesToKeepForAssistant(e, n, s) {
  if (
    n === void 0 ||
    !n.some((r) => r.uuid === e.uuid) ||
    n.some(
      (r) =>
        r.resumedFromIncompleteThinking === !0 ||
        (r.uuid !== e.uuid &&
          Array.isArray(r.message.content) &&
          r.message.content.some((S) => S.type === "tool_use")),
    )
  )
    return [e];
  let y = new Set(s.map((r) => r.uuid));
  return n.filter((r) => !y.has(r.uuid));
}
/**
 * 日志自证：对从未发出的工具调用补 is_error 结果。
 */
//@ chunk-0h4e7gnq.js:73629-74539 layout
async function answerCallsNeverSent({
  notSent: notSent,
  tools: tools,
  mutableMessages: mutableMessages,
  persistSession: persistSession,
  context: context,
}) {
  let S = [],
    h = new Set(notSent.map((k) => k.toolUseID));
  for (let {
    toolUseID: toolUseID,
    assistantMessage: assistantMessage,
    host: host,
    onUsersDevice: onUsersDevice,
  } of notSent)
    try {
      if (
        !mutableMessages.some(
          (te) =>
            te.type === "assistant" &&
            Array.isArray(te.message.content) &&
            te.message.content.some((R) => R.type === "tool_use" && R.id === toolUseID),
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
        (conversationAppender(mutableMessages).keep([assistantMessage]),
          S.push(toSDKAssistantMessage(assistantMessage, tools)));
      }
      let G = onUsersDevice ? DEVICE_CALL_NOT_SENT_TEXT : notSentNotice(host),
        ee = createUserMessage({
          content: [{ type: "tool_result", content: G, is_error: !0, tool_use_id: toolUseID }],
          toolUseResult: `Error: ${G}`,
          sourceToolAssistantUUID: assistantMessage.uuid,
        });
      (await appendMessageToConversation(mutableMessages, ee),
        await persistIfNeeded(mutableMessages, persistSession, context),
        S.push(...normalizeMessage(ee, tools)));
    } catch (error) {
      if (isAbortError(error))
        logForDebugging(`answerCallsNeverSent: turn stopped before toolUseID=${toolUseID} got its result`);
      else logError(error);
    }
  return S;
}
/**
 * 恢复时执行一批 tool_use：补写 assistant 行、执行工具并把结果写入转录与 SDK 输出。
 */
//@ chunk-0h4e7gnq.js:74539-75821 layout
async function* runToolUsesOnResume({
  runs: runs,
  tools: tools,
  canUseTool: canUseTool,
  executionContext: executionContext,
  mutableMessages: mutableMessages,
  persistSession: persistSession,
  beforeRun: beforeRun,
  notSent: notSent,
  echoed: echoed,
}) {
  let x = Ji(
    runs.map((I) => I.assistantMessage),
    (I) => I.uuid,
  );
  for (let I of x) {
    let filtered = runs.filter((R) => R.assistantMessage.uuid === I.uuid),
      mapped = filtered.map((R) => R.block.id);
    if (
      !mutableMessages.some(
        (R) =>
          R.type === "assistant" &&
          Array.isArray(R.message.content) &&
          R.message.content.some((z) => z.type === "tool_use" && "id" in z && mapped.includes(z.id)),
      )
    ) {
      if (
        (conversationAppender(mutableMessages).keep(
          messagesToKeepForAssistant(
            I,
            filtered.find((R) => R.messageRows !== void 0)?.messageRows,
            mutableMessages,
          ),
        ),
        persistSession)
      )
        await recordTranscript(mutableMessages, void 0, void 0, void 0, executionContext.storageV5);
    }
    if (!echoed?.has(I.uuid)) yield toSDKAssistantMessage(I, tools);
  }
  if (notSent?.length)
    yield* await answerCallsNeverSent({
      notSent: notSent,
      tools: tools,
      mutableMessages: mutableMessages,
      persistSession: persistSession,
      context: executionContext,
    });
  if (beforeRun)
    try {
      await beforeRun();
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  let permissionLayers = executionContext.permissionLayers;
  mGt("resume_other", "turn_start_tool_run");
  try {
    for await (let I of runTools(
      runs.map((G) => G.block),
      x,
      canUseTool,
      executionContext,
    )) {
      if (hasTypeField(I)) continue;
      if (((permissionLayers = I.newContext.permissionLayers), I.message)) {
        if ((await appendMessageToConversation(mutableMessages, I.message), persistSession))
          await recordTranscript(mutableMessages, void 0, void 0, void 0, executionContext.storageV5);
        if (I.message.type === "progress" || I.message.type === "user") {
          yield* normalizeMessage(I.message, executionContext.options.refreshTools?.() ?? tools);
          continue;
        }
        if (I.message.type === "attachment") {
          yield* attachmentToSDKMessages(I.message);
          continue;
        }
        yield { ...I.message, session_id: getSessionId(), parent_tool_use_id: null };
      }
    }
  } finally {
    gGt("resume_other", "turn_start_tool_run");
  }
  return permissionLayers;
}
/**
 * 从历史 Read/Write/Edit 调用与结果重建 readFileState（内容与时间戳，LRU 上限），跳过有截断提示的读取。
 */
//@ chunk-0h4e7gnq.js:75821-78840 fingerprint = extractReadFilesFromMessages (0.37)
function extractReadFilesFromMessages(messages, cwd, maxSize = READ_FILE_STATE_CACHE_SIZE) {
  let cache = nv(maxSize),
    fileReadToolUseIds = new Map(),
    fileWriteToolUseIds = new Map(),
    fileEditToolUseIds = new Map(),
    k = new Set();
  for (let message of messages) {
    if (message.type === "attachment" && message.attachment.type === "read_truncation_notice") {
      k.add(message.attachment.toolUseID);
      continue;
    }
    if (message.type === "assistant" && Array.isArray(message.message.content))
      for (let content of message.message.content) {
        if (content.type !== "tool_use") continue;
        if (Cf(content.input)) continue;
        try {
          if (content.name === FILE_READ_TOOL_NAME) {
            let V = normalizeReadInputAliases(content.input)?.input ?? content.input,
              le = coerceNumberString(V?.offset),
              j = coerceNumberString(V?.limit);
            if (
              typeof V?.file_path === "string" &&
              (le === void 0 || (typeof le === "number" && Number.isInteger(le) && le >= 0)) &&
              (j === void 0 || (typeof j === "number" && Number.isInteger(j) && j >= 1))
            )
              fileReadToolUseIds.set(content.id, {
                filePath: expandPath(V.file_path, cwd),
                offset: le,
                limit: j,
              });
          } else if (content.name === FILE_WRITE_TOOL_NAME) {
            let V = normalizeWriteInputAliases(content.input)?.input ?? content.input;
            if (typeof V?.file_path === "string" && typeof V.content === "string")
              fileWriteToolUseIds.set(content.id, {
                filePath: expandPath(V.file_path, cwd),
                content: V.content,
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
  let w = new Set(),
    x = nv(maxSize),
    L = [],
    I = (R, z) => {
      (w.add(normalize(R)), x.set(R, z), L.push(R));
    },
    G = isRemoteToolForwardingSwitchOn()
      ? new Set(
          [...fileWriteToolUseIds.values()]
            .map((R) => R.filePath)
            .concat([...fileEditToolUseIds.values()])
            .map((R) => normalize(R)),
        )
      : void 0,
    ee = new Map(),
    te = (R, z) => {
      let Z = normalize(R),
        V = x.get(R);
      (x.set(R, z), x.set(R, V), ee.delete(Z));
    };
  e: for (let R = messages.length - 1; R >= 0; R--) {
    let z = messages[R];
    if (z.type !== "user" || !Array.isArray(z.message.content)) continue;
    let content = z.message.content;
    for (let V = content.length - 1; V >= 0; V--) {
      let le = content[V];
      if (le.type !== "tool_result" || !le.tool_use_id) continue;
      let readFilePath = fileReadToolUseIds.get(le.tool_use_id),
        ie = readFilePath && normalize(readFilePath.filePath),
        he = ie !== void 0 && !w.has(ie) && w.size < maxSize;
      if (
        readFilePath &&
        (he || ee.has(ie)) &&
        le.is_error !== !0 &&
        typeof le.content === "string" &&
        !isFileUnchangedStub(le.content) &&
        z.timestamp
      ) {
        let toolUseResult = z.toolUseResult,
          ue =
            toolUseResult?.file?.truncatedByTokenCap === !0 ||
            k.has(le.tool_use_id) ||
            le.content.startsWith("<system-reminder>" + TRUNCATED_PARTIAL_VIEW_PREFIX),
          pe,
          Q = toolUseResult?.file?.content;
        if (
          (content.length === 1 || count(content, (Ce) => Ce.type === "tool_result") === 1) &&
          typeof Q === "string" &&
          Q !== ""
        )
          pe = Q.trim();
        else pe = stripReminderAndLineNumbers(le.content);
        if (!he) {
          if (p9r(pe) !== ee.get(ie)) ee.delete(ie);
        } else {
          let timestamp = new Date(z.timestamp).getTime(),
            me = isNotebookPath(readFilePath.filePath);
          if (
            (I(readFilePath.filePath, {
              content: pe,
              timestamp: timestamp,
              offset: me ? 1 : (readFilePath.offset ?? 1),
              limit: me ? void 0 : readFilePath.limit,
              ...(ue && { isPartialView: !0 }),
              contentFromTranscript: !0,
            }),
            G?.has(ie))
          )
            ee.set(ie, x.get(readFilePath.filePath).contentHash);
        }
      }
      let writeToolData = fileWriteToolUseIds.get(le.tool_use_id),
        ce = writeToolData && normalize(writeToolData.filePath),
        Ae = ce !== void 0 && !w.has(ce) && w.size < maxSize;
      if (writeToolData && (Ae || ee.has(ce)) && le.is_error !== !0 && z.timestamp) {
        let timestamp = new Date(z.timestamp).getTime(),
          ue = { content: __(writeToolData.content), timestamp: timestamp, offset: void 0, limit: void 0 };
        if (Ae) I(writeToolData.filePath, ue);
        else te(writeToolData.filePath, ue);
      }
      let editFilePath = fileEditToolUseIds.get(le.tool_use_id),
        O = editFilePath && normalize(editFilePath),
        q = O !== void 0 && !w.has(O) && w.size < maxSize;
      if (editFilePath && (q || ee.has(O)) && le.is_error !== !0)
        try {
          let { content: diskContent } = detectEncodingForResolvedPath(editFilePath),
            ue = {
              content: tv(diskContent),
              timestamp: getFileModificationTime(editFilePath),
              offset: void 0,
              limit: void 0,
              contentNotInModelContext: !0,
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
  for (let R = L.length - 1; R >= 0; R--) {
    let z = L[R];
    cache.set(z, x.get(z));
  }
  return cache;
}
/**
 * 日志自证：收集回退时需重新追踪的文件路径（编辑类工具、文件附件、记忆附件）。
 */
//@ chunk-0h4e7gnq.js:78840-80094 layout
function collectRewoundFileTrackingPaths(e, n, s) {
  let y = [],
    r = [],
    S = [];
  for (let h of e) {
    if (h.type === "assistant") {
      if (!Array.isArray(h.message.content)) continue;
      for (let w of h.message.content) {
        if (!isPlainObject(w) || w.type !== "tool_use" || !isPlainObject(w.input) || Cf(w.input)) continue;
        let input = w.input,
          at = toolNameVariants(w.name, s).at(-1),
          I =
            at === NOTEBOOK_EDIT_TOOL_NAME
              ? input.notebook_path
              : at === FILE_READ_TOOL_NAME || at === FILE_EDIT_TOOL_NAME || at === FILE_WRITE_TOOL_NAME
                ? input.file_path
                : void 0;
        if (typeof I !== "string") continue;
        if (at === FILE_READ_TOOL_NAME && Mge(I)) continue;
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
  return { readFilePaths: y, nestedMemoryPaths: r, spelledFilePaths: S };
}
/**
 * 追加一条消息到对话（失败时直接 push 去重）。
 */
//@ chunk-0h4e7gnq.js:80094-80199 layout
async function appendMessageToConversation(e, n) {
  try {
    await appendRowsWithHooks(conversationAppender(e), [n]);
  } catch (error) {
    if ((logError(error), !e.some((y) => y.uuid === n.uuid))) e.push(n);
  }
}
/**
 * 对话追加器（把行 push 到数组）。
 */
//@ chunk-0h4e7gnq.js:80199-80248 layout
function conversationAppender(e) {
  return QNi(e, (n) => {
    e.push(...n);
  });
}
/**
 * 把兄弟调用分成可运行（工具在池中）与缺失工具两类。
 */
//@ chunk-0h4e7gnq.js:80248-80630 layout
function partitionSiblingRuns(e, n, s) {
  let y = [],
    r = [],
    S = !1;
  for (let h of e.siblings ?? []) {
    let k = Array.isArray(h.assistantMessage.message.content)
      ? h.assistantMessage.message.content.find((w) => w.type === "tool_use" && w.id === h.toolUseID)
      : void 0;
    if (k === void 0) S = !0;
    else if (qS(n, k.name, s)) y.push({ block: k, assistantMessage: h.assistantMessage });
    else r.push(k.name);
  }
  return { runs: y, missingToolNames: r, missingBlocks: S };
}
/**
 * 孤立权限的决定：被调用方强制询问时保留 ask（重启前挂起的除外），否则视为允许。
 */
//@ chunk-0h4e7gnq.js:80630-80820 fingerprint = handleOrphanedPermission (0.365)
function handleOrphanedPermission_2(e) {
  if (e?.behavior === "ask" && e.forcedByCaller === !0) return e.pendingBeforeRestart === !0 ? void 0 : e;
  return { behavior: "allow", updatedInput: {}, decisionReason: { type: "mode", mode: "default" } };
}
/**
 * 判断从下标 n 起的消息中是否已有指定 tool_use_id 的 tool_result。
 */
//@ chunk-0h4e7gnq.js:80820-80991 placement
function hasToolResultAfter(e, n, s) {
  return e
    .slice(n)
    .some(
      (y) =>
        y.type === "user" &&
        Array.isArray(y.message.content) &&
        y.message.content.some((r) => r.type === "tool_result" && r.tool_use_id === s),
    );
}
//@ chunk-e6aww6q8.js:4735394-4735466 placement
function Owt() {
  return hasModuleHookingSite("session.append", void 0, canShortcutAppend("session.append"));
}
/**
 * 把行追加到会话：无钩子时直接保留，有 session.append 钩子时按顺序经钩子处理（期间发生裁剪则不保留）。
 */
//@ chunk-e6aww6q8.js:4735466-4735716 placement
function appendRowsWithHooks(e, n, r = {}) {
  let s = nSt.get();
  if (s === null || !e.isHookable || !Owt()) {
    if (r.fills !== !0) (r.keep ?? e.keep)(n);
    return n;
  }
  let cuts = e.cuts(),
    S = r.keep ?? e.keep;
  return e.inOrder(async () =>
    (await s()).rowsAppendedTo(e, n, {
      ...r,
      keep: (w) => {
        if (e.cuts() === cuts) S(w);
      },
    }),
  );
}
//@ chunk-e6aww6q8.js:4735716-4735831 placement
function createRowSourceRegistry() {
  let weakMap = new WeakMap();
  return {
    noted: (n) => {
      if (n.list !== void 0) weakMap.set(n.list, n);
      return n;
    },
    of: (n) => weakMap.get(n),
  };
}
//@ chunk-e6aww6q8.js:4735831-4735845 placement
var zpt = createRowSourceRegistry();
/**
 * 为行来源加上顺序追加能力：inOrder 串行执行、裁剪计数、等待追加完成、附加循环收集新到的行。
 */
//@ chunk-e6aww6q8.js:4735845-4736347 placement
function createOrderedRowSource(e) {
  let resolved = Promise.resolve(),
    r = 0,
    s = 0,
    h = new Set();
  function y(S) {
    r += 1;
    let w = resolved.then(S),
      { appendsInFlight: appendsInFlight } = getPluginRegistry(),
      G = () => {
        ((r -= 1), appendsInFlight.delete(w));
      };
    return (appendsInFlight.add(w), (resolved = w.then(G, G)), w);
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
      return y(() => (S(), Promise.resolve()));
    },
    settled: () => resolved,
    attachLoop: () => {
      let S = { rows: [] };
      return (
        h.add(S),
        {
          taken: () => {
            let rows = S.rows;
            return ((S.rows = []), rows);
          },
          [Symbol.dispose]: () => {
            h.delete(S);
          },
        }
      );
    },
    arrived: (S) => {
      for (let w of h) w.rows = [...w.rows, ...S];
    },
  };
}
//@ chunk-e6aww6q8.js:4736347-4736378 placement
var Ebe = (e) => zpt.noted(createOrderedRowSource(e));
//@ chunk-e6aww6q8.js:4736378-4736443 placement
var QNi = (e, n) => zpt.of(e) ?? Ebe({ keep: n, rows: () => e, isHookable: !1 });
//@ chunk-e6aww6q8.js:4736443-4736600 placement
function createRunningTurnRegistry() {
  let e = new Map();
  return {
    running: (n, r) => (
      e.set(n, r),
      {
        [Symbol.dispose]: () => {
          if (e.get(n) === r) e.delete(n);
        },
      }
    ),
    of: (n) => e.get(n),
    clear: () => {
      e.clear();
    },
  };
}
//@ chunk-e6aww6q8.js:4736600-4736633 placement
var Mwt = ge(createRunningTurnRegistry(), (e) => e.clear());
/**
 * 遍历 assistant 里 Bash 类 tool_use 的 command 字符串。
 */
//@ chunk-0eyv3mzk.js:227-501 fingerprint = extractBashToolsFromMessages (1)
function* extractBashToolsFromMessages(messages) {
  for (let message of messages)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let content of message.message.content)
        if (content.type === "tool_use" && SHELL_TOOL_NAMES.includes(content.name)) {
          let { input: input } = content;
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
/**
 * 历史中 Bash 命令用到的 CLI 名集合。
 */
//@ chunk-0eyv3mzk.js:501-584 placement
function extractBashCliNames(n) {
  let s = new Set();
  for (let e of extractBashToolsFromMessages(n)) {
    let t = extractCliName(e);
    if (t) s.add(t);
  }
  return s;
}
//@ chunk-0eyv3mzk.js:839-923 placement
function XWn(n) {
  let s = new Set();
  for (let e of extractBashToolsFromMessages(n)) for (let t of parseReferences(e)) s.add(t);
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
/**
 * 取 CLI 名时跳过的前缀命令（sudo）。
 */
//@ chunk-0eyv3mzk.js:1104-1128 fingerprint = STRIPPED_COMMANDS (1)
var STRIPPED_COMMANDS = new Set(["sudo"]);
/**
 * 取命令第一个非 VAR=值 赋值、非 sudo 的词。
 */
//@ chunk-0eyv3mzk.js:1128-1273 file-local
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
  Ebe,
  appendRowsWithHooks,
  Mwt,
  extractReadFilesFromMessages,
  collectRewoundFileTrackingPaths,
  shouldForwardSubagentMessage,
  hasToolResultAfter,
  lastUserAfterAssistant,
  handleOrphanedPermission,
  handleHandedOffTurn,
  isHandoffTurnSettled,
  resumeDeferredToolUse,
  Owt,
  getSalvageableResultText,
  getRecentErrorLog,
  extractBashCliNames,
  XWn,
  collectUsedToolNames,
  subagentProgressToSDKMessages,
  formatResultDiagnostic,
  isResultSuccessful,
  buildEmptyResultDiagnostics,
  isRecoverableTrailingServerError,
};
