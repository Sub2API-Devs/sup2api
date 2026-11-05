/**
 * tools/REPLTool/toolWrappers.ts
 *
 * REPL 内层工具包装与权限授权主流程（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (7)
 * attribution: placement 7
 */
import { randomUUID } from "crypto";
import { createReplReadProbeSlot } from "./sessionHelpers.js";
import { SCRIPT_OUTCOME } from "./scriptChecks.js";
import { runAfterResultCommitted } from "../../Tool.js";
import { logError } from "../../utils/log.js";
import { wireName, internalName, noteSentWireNames } from "../../services/mcp/serverIdentity.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { sliceAssistantToToolUse } from "./consoleRing.js";
import { NON_BLOCKING_DIALOG_KINDS } from "../../screens/replDialogState.js";
import { scriptAskHolds, SCRIPT_ASK_DECLINED } from "../../utils/codeMode/scriptAskDeclined.js";
import {
  PromptScopedAbortController,
  turnAbortControllerOf,
  attachDetachableAbortRelay,
} from "../../utils/abortController.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import { REPL_ASYNC_WALL_CAP_MS } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import {
  buildDenyRuleDecisionRecord,
  buildPermissionDecisionRecord,
  buildDeniedDecisionRecord,
  getToolDecisionForOTel,
  settleUnaskedQuestion,
  isHookCallerVirtualTool,
  getNotLoadedToolVerdict,
  logNotLoadedCheckFailure,
  isCallDirectoryUnchanged,
  CALL_DIRECTORY_CHANGED_MESSAGE,
  getInterruptKind,
} from "../../services/tools/toolExecution.js";
import { refuseRelativeRemoval, checkDirectories } from "./preflightChecks.js";
import {
  isScrubActive,
  REPL_INNER_TOOLS,
  REPL_INNER_CALL,
  extractSandboxViolations,
} from "./sandboxViolations.js";
import { getCwd } from "../../utils/cwd.js";
import {
  runPreToolUseHooks,
  resolvePermissionDecisionForCall,
  runPostToolUseHooks,
  runPostToolUseFailureHooks,
} from "../../services/tools/toolHooks.js";
import { isNullRenderingAttachment } from "../../components/messages/nullRenderingAttachments.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import {
  stopContinuation,
  createHookMessages,
  takeUncommitted,
  isStoppedContinuation,
  TOOL_DID_NOT_RUN_LINE,
} from "../../utils/hooks/replHookFeedback.js";
import { REJECT_MESSAGE, REJECT_MESSAGE_WITH_REASON_PREFIX } from "../../utils/messages.js";
import { contextKeyAccepted, codeModeAccepted, isAccepted } from "../../utils/codeMode/accepted.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import {
  stripHostPrefix,
  unusedWithError,
  isUndeclaredArgsRefuseOn,
  undeclaredArgumentKeys,
  undeclaredArgumentText,
} from "./mcpArgs.js";
import { startPermissionRound, takePermissionRecord } from "../../utils/permissions/permissionRecord.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logForDebugging } from "../../utils/debug.js";
import { isInvalidInputDeny } from "../../types/permissions.js";
import { toolRejectionKind } from "../../entrypoints/sdk/coreSchemas.js";
import { getToolCallOutcomeCode } from "../../utils/permissions/yoloClassifier.js";
import {
  scriptOverMessage,
  FINISHED_CODE_NO_CALLS_MESSAGE,
  STOPPED_BEFORE_CALL_MESSAGE,
} from "./stopReasons.js";
import { isEmptyObject } from "../../utils/toolInputPlaceholder.js";
import { baseToolNameSet, toolKindLabel, isCodeModeOn, callTimeoutMs } from "./toolMeta.js";
import { createTokenSlots, takeShellDirectories, takeFacts, createHookProgressTracker } from "./callState.js";
import { env } from "../../utils/env.js";
import { TurnRegistry } from "../../query/replTurnLedger.js";
import { SCRIPT_CALL_TOOL_USE_ID_PREFIX } from "../../utils/codeMode/pendingActionReport.js";
import { toolCategoryForTelemetry } from "../../services/api/toolDefinitionShape.js";
import { mcpToolsThrow, McpToolError } from "./mcpTools.js";
import { logToolSafetyEvent } from "../../services/tools/toolDecisionTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { isInferredMcpToolName, sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { lit, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import {
  isUnwritableArgsRefuseOn,
  findUnwritableArgument,
  unwritableArgumentText,
  UnwritableArgumentsError,
} from "./unwritableArguments.js";
import { isSillyShoreGateOn, getToolsUsedList } from "../../utils/messages/untrustedArtifactContent.js";
import { getConversationToolsUsed, getIsInteractive } from "../../bootstrap/state.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { isTooDeepOrLarge, cloneSafelyForHooks, freezePayload } from "./serialization.js";
import { AGENT } from "../AgentTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { shrinkInlineBase64 } from "./resultContent.js";
import { formatZodValidationError, formatToolErrorMessage } from "../../utils/toolErrors.js";
import {
  supportsRemoteExecution,
  routeToolCallWithAdoption,
} from "../../utils/remoteTools/toolHostRouting.js";
import { getToolNameForPermissionCheck } from "../../services/remoteTools/remoteToolRouting.js";
import { HOST_TOOL_INPUT_FIELD, DEVICE_2, splitHostField } from "../../bridge/deviceRegistration.js";
import { checkWebIsolation } from "../../services/tools/webToolIsolation.js";
import { pluginsHookingTool, hookingPluginNotice } from "../../utils/codeMode/modHooksGate.js";
import { INJECTED_MACHINE_REFUSAL } from "../../utils/toolUseDisplay.js";
import {
  describeCoordinatorRefusal,
  isCoordinatorBashToolUse,
  checkCoordinatorShellCommand,
  clampCoordinatorShellTimeout,
  READNOTIFICATIONS,
} from "../ReadNotificationsTool/ReadNotificationsTool.js";
import { startSessionActivity, endActivity } from "../../utils/sessionActivity.js";
import { recordToolUsed } from "../../services/compact/keptTools.js";
import { servedTextOf } from "../../services/remoteTools/storedRemoteToolResult.js";
import { hasToolCallHook, runManagedToolCall } from "./hookRun.js";
import {
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isAbortError,
  ShellError,
} from "../../utils/errors.js";
import { checkCloneableForHooks } from "./hookArgs.js";
import { markStdoutRewrittenByHook } from "./shellResult.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { getDefaultBashTimeoutMs } from "../../utils/timeouts.js";
import { getReplPartCap } from "../../utils/codeMode.js";
import { EDIT } from "../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { expandPath } from "../../utils/path.js";
import {
  hasPersistedOutput,
  isPersistedOutputOverCap,
  persistedOutputSizeOf,
  inlinePersistedOutput,
} from "./spillRead.js";
import { getOriginalCwd as getOriginalCwd_2 } from "../../utils/toolResultStorage.js";
import { getProjectsDir } from "../../utils/sessionStoragePortable.js";
import {
  watchWithheldResults,
  releaseWithheldWatch,
  withheldResultText,
} from "../../plugins/functionHooks/toolCallHooks.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { noteHookModifiedFile } from "../../services/tools/detachedToolCalls.js";
import { getFileAndShellTools } from "../../tools.js";
import { getCommandNetworkLists } from "../BashTool/sandboxNetwork.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { clearToolUsePermissionState } from "../../components/permissions/hooks.js";
import { runInRemoteCallFrame } from "../../remote/remoteMode.js";

//@ chunk-n51jggtb.js:93477-93798 placement
/**
 * 为 REPL 内的每个工具建立可调用的包装函数（含别名）。
 */
function buildToolWrappers(
  tools,
  toolUseContext,
  canUseTool,
  assistantMessage,
  lane,
  startsTurn,
  onQueued,
  unclassifiedCode = {
    ran: true,
  },
  readProbeSlot = {
    pending: undefined,
  },
  verdictOrder = createReplReadProbeSlot(),
  scriptChecks,
  scriptOutcome = SCRIPT_OUTCOME,
) {
  let core = createCoreEnv(
    tools,
    toolUseContext,
    canUseTool,
    assistantMessage,
    lane,
    unclassifiedCode,
    scriptChecks,
    scriptOutcome,
  );
  let resultCommitter = (batch, afterCommit) => {
    if (onQueued !== undefined) {
      onQueued(batch, afterCommit);
      return;
    }
    runAfterResultCommitted(batch, toolUseContext.abortController.signal.aborted, logError);
  };
  let wrappers = {};
  for (let tool of tools) {
    let wrapper = createScriptToolWrapper(
      tool,
      toolUseContext,
      canUseTool,
      assistantMessage,
      core,
      resultCommitter,
      lane,
      startsTurn,
      readProbeSlot,
      verdictOrder,
    );
    for (let candidateName of [tool.name, wireName(tool.name)])
      if (internalName(candidateName) === tool.name) wrappers[candidateName] = wrapper;
  }
  noteSentWireNames(tools.map((name) => name.name));
  return wrappers;
}
//@ chunk-n51jggtb.js:93798-93857 placement
/**
 * 只保留名字与调用名一致或有别名的工具。
 */
function filterRenameableTools(tools) {
  return tools.filter((tool) => wireName(tool) === tool || internalName(tool) !== tool);
}
//@ chunk-n51jggtb.js:93857-98878 placement
/**
 * 内层调用的权限授权主流程：校验输入、跑 hook、走 canUseTool、返回允许/拒绝。
 */
function createCoreEnv(
  extraTools,
  toolUseContext,
  canUseTool,
  assistantMessage,
  lane,
  unclassifiedCode,
  scriptCheck,
  scriptOutcome,
) {
  let permissionTools = uniqByExport([...toolUseContext.options.tools, ...extraTools], (tool) => tool.name);
  let stop = {
    pending: false,
  };
  let callSlots;
  let closedToolNameCache = undefined;
  let atDenialLimit = () =>
    toolUseContext.autoModeDenialLimitRun === true || scriptCheck?.record.state === "atLimit";
  let hooksContext = () => ({
    ...toolUseContext,
    options: {
      ...toolUseContext.options,
      tools: permissionTools,
    },
    gateIgnoresSwitch: true,
  });
  let permissionContextForRun = () => ({
    ...toolUseContext,
    autoModeClassified: undefined,
    autoModeDenialLimitRun: undefined,
    autoModeScriptCheckDeferred: undefined,
    permissionPhase: undefined,
    options: {
      ...toolUseContext.options,
      tools: permissionTools,
    },
    sameTurnToolUses: [
      ...(toolUseContext.sameTurnToolUses ?? []),
      sliceAssistantToToolUse(assistantMessage, toolUseContext.toolUseId),
    ],
  });
  let requestDialog = toolUseContext.requestDialog;
  let requestDialogUnderHold =
    lane === "async" && requestDialog !== undefined
      ? async (request, onStopTurn, options) => {
          let { holdsIdleDrain, ...rest } = options ?? {};
          if (holdsIdleDrain === false || NON_BLOCKING_DIALOG_KINDS.has(request.kind))
            return requestDialog(request, onStopTurn, rest);
          let releaseHold = scriptAskHolds.of(toolUseContext.session).hold();
          try {
            return await requestDialog(request, onStopTurn, rest);
          } finally {
            releaseHold();
          }
        }
      : undefined;
  let underAsk = async (work, onStopTurn, abortController = toolUseContext.abortController) => {
    let promptScopedContext = permissionContextForRun();
    let scopedAbort = new PromptScopedAbortController(turnAbortControllerOf(toolUseContext.abortController));
    let detachRelay = attachDetachableAbortRelay(abortController, scopedAbort);
    let finished = false;
    scopedAbort.signal.addEventListener(
      "abort",
      () => {
        if (!finished && !abortController.signal.aborted) {
          stop.pending = true;
          onStopTurn(() =>
            scopedAbort.turnController.abort(
              lane === "async" ? SCRIPT_ASK_DECLINED : scopedAbort.signal.reason,
            ),
          );
        }
      },
      {
        once: true,
      },
    );
    try {
      return await work({
        ...promptScopedContext,
        abortController: scopedAbort,
        ...(lane === "async" && {
          replAsyncAsk: true,
        }),
        ...(requestDialogUnderHold !== undefined && {
          requestDialog: requestDialogUnderHold,
        }),
      });
    } finally {
      finished = true;
      detachRelay();
    }
  };
  let authorize = async (tool, input, toolUseId, info) => {
    let deny = (message, permissionDecision, denialKind) => ({
      behavior: "deny",
      message,
      ...(permissionDecision !== undefined && {
        permissionDecision,
      }),
      ...(denialKind !== undefined && {
        toolDenialKind: denialKind,
      }),
    });
    if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
    let validateInput = (checkedInput) =>
      tool.validateInput?.(checkedInput, {
        ...toolUseContext,
        ...info?.run,
        toolUseId,
        ...(lane === "async" && {
          shellWallCapMs: REPL_ASYNC_WALL_CAP_MS,
        }),
      });
    let validation = await validateInput(input);
    if (validation?.result === false)
      return deny(
        validation.message,
        validation.denyRule && buildDenyRuleDecisionRecord(validation.message, validation.denyRule),
      );
    let prefixed = info?.facts?.prefixed;
    if (prefixed !== undefined && input.command === prefixed.sent) {
      let refusal = await refuseRelativeRemoval(
        isScrubActive()
          ? {
              ...prefixed,
              directory: getCwd(),
            }
          : prefixed,
        (command) =>
          tool.checkPermissions(
            {
              ...input,
              command,
            },
            {
              ...permissionContextForRun(),
              toolUseId: undefined,
            },
          ),
      );
      if (refusal !== undefined) return deny(refusal);
    }
    let backfilled = null;
    if (tool.backfillObservableInput) {
      backfilled = {
        ...input,
      };
      tool.backfillObservableInput(backfilled);
    }
    let toolInput = backfilled ?? input;
    let observedInput = toolInput;
    let hookPermissionResult;
    let stopReason;
    let stopped = false;
    let hookFeedback = info?.hookFeedback;
    for await (let event of runPreToolUseHooks(
      {
        ...hooksContext(),
        ...info?.run,
      },
      tool,
      toolInput,
      toolUseId,
      assistantMessage.message.id,
      assistantMessage.requestId,
      undefined,
      undefined,
      validateInput,
    )) {
      if (event.type === "hookPermissionResult") hookPermissionResult = event.hookPermissionResult;
      if (event.type === "hookUpdatedInput") observedInput = event.updatedInput;
      if (event.type === "stopReason") {
        stopReason = event.stopReason;
        if (hookFeedback?.halt !== undefined) hookFeedback.halt.reason = event.stopReason;
      }
      if (event.type === "message" && isNullRenderingAttachment(event.message.message))
        hookFeedback?.messages.push(event.message.message);
      if (event.type === "additionalContext" && !isDelegatedObservationContext(toolUseContext.agentContext))
        hookFeedback?.messages.push(event.message.message);
      if (event.type === "preventContinuation") {
        stopped = event.shouldPreventContinuation;
        if (hookFeedback !== undefined)
          hookFeedback.halt = {
            reason: stopReason,
          };
      }
      if (event.type === "stop") {
        if (
          hookFeedback?.halt !== undefined &&
          event.stopReason &&
          !toolUseContext.abortController.signal.aborted
        )
          stopContinuation(hookFeedback, tool.name, toolUseId, event.stopReason);
        return deny(event.stopReason ?? stopReason ?? "Blocked by PreToolUse hook");
      }
    }
    if (stop.pending) return deny(REJECT_MESSAGE, undefined, "user-rejected");
    let withScriptFlags = (context) => {
      let isInner =
        (toolUseContext.autoModeClassified === true ||
          (toolUseContext.autoModeScriptCheckDeferred === true && scriptCheck !== undefined)) &&
        info?.ownStep !== true &&
        !toolUseContext.abortController.signal.aborted &&
        unclassifiedCode.ran === false &&
        !(contextKeyAccepted() && scriptOutcome.scriptReturned());
      if (isInner && scriptOutcome.laterScriptStarted());
      else if (isInner)
        return {
          ...context,
          replScriptInner: true,
          ...(tool.name === BASH_TOOL_NAME &&
            scriptOutcome.spellsOut !== undefined &&
            (typeof observedInput.command === "string" &&
            scriptOutcome.spellsOut(stripHostPrefix(observedInput.command, info?.hostPrefix))
              ? {
                  replScriptSpelledOutCommand: observedInput.command,
                }
              : !scriptOutcome.spellsOut(stripHostPrefix(toolInput.command, info?.hostPrefix)) && {
                  replScriptBuiltCommand: true,
                })),
          ...(scriptCheck !== undefined && {
            replScriptCheck: scriptCheck.handle,
          }),
          permissionLayers: [
            ...(context.permissionLayers ?? []),
            {
              kind: "sandbox_auto_allow_suspended",
            },
          ],
        };
      if (atDenialLimit())
        return {
          ...context,
          replScriptAtLimit: true,
        };
      return context;
    };
    let permissionRound = startPermissionRound(toolUseContext, toolUseId, tool.name);
    let resolved = await underAsk(
      (context) =>
        resolvePermissionDecisionForCall(
          hookPermissionResult,
          tool,
          observedInput,
          {
            ...withScriptFlags(context),
            replScriptCall: true,
            ...(contextKeyAccepted() && {
              replScriptCallLabels: {
                replToolUseID: sanitizeMarkName(toolUseContext.toolUseId),
                toolName: closedToolName(tool),
                isMcp: tool.isMcp === true || tool.mcpInfo !== undefined,
              },
            }),
            permissionRound,
            ...(lane === "async" && {
              shellWallCapMs: REPL_ASYNC_WALL_CAP_MS,
            }),
          },
          canUseTool,
          assistantMessage,
          toolUseId,
        ),
      info?.onStopTurn ?? (() => {}),
      info?.run?.abortController,
    ).catch((error) => {
      takePermissionRecord(toolUseContext, toolUseId, permissionRound);
      throw error;
    });
    let decision = resolved.decision;
    logForDebugging(`[trace] inner-decided id=${toolUseId} behavior=${decision.behavior}`);
    observedInput = resolved.input;
    let record = takePermissionRecord(toolUseContext, toolUseId, permissionRound) ?? {};
    let decisionRecord = isInvalidInputDeny(decision)
      ? buildPermissionDecisionRecord("reject", "invalid_input")
      : buildDeniedDecisionRecord(
          decision,
          toolUseContext.toolDecisions?.get(toolUseId),
          getToolDecisionForOTel(decision, toolUseContext.abortController.signal.aborted),
          record.pipeline,
        );
    if (decision.behavior !== "allow") {
      if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
      toolUseContext.onPermissionDenial?.(tool, toolUseId, observedInput);
      let settled = await settleUnaskedQuestion(
        tool,
        decision,
        toolUseId,
        {
          ...toolUseContext,
          ...info?.run,
          replScriptCall: true,
        },
        {
          stopped,
          asked: hookPermissionResult?.behavior === "ask",
        },
      );
      let message = settled ?? (decision.message || "Permission denied");
      let isRejection =
        settled !== undefined ||
        message.startsWith(REJECT_MESSAGE) ||
        message.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX) ||
        toolRejectionKind(getToolCallOutcomeCode(decision));
      if (
        hookFeedback?.halt !== undefined &&
        decision.behavior === "deny" &&
        decision.decisionReason?.type === "hook" &&
        !toolUseContext.abortController.signal.aborted
      )
        stopContinuation(hookFeedback, tool.name, toolUseId, hookFeedback.halt.reason ?? message);
      return deny(
        scriptOverMessage(
          toolUseContext.abortController.signal,
          isRejection ? message : `Permission denied for ${tool.name}: ${message}`,
        ),
        decisionRecord,
        getToolCallOutcomeCode(decision),
      );
    }
    if (stop.pending) return deny(REJECT_MESSAGE, undefined, "user-rejected");
    let chosenInput =
      decision.updatedInput !== undefined && !isEmptyObject(decision.updatedInput)
        ? decision.updatedInput
        : observedInput;
    return {
      behavior: "allow",
      input: collectReadToolFilePaths(input, backfilled, chosenInput),
      observableInput: chosenInput,
      userModified: decision.userModified ?? false,
      permissionPhase: record,
      permissionDecision: decisionRecord,
    };
  };
  let baseToolsCache;
  let closedToolName = (tool) => {
    baseToolsCache ??= baseToolNameSet(toolUseContext.options.toolCatalog?.getAllBaseTools());
    return toolKindLabel(tool, baseToolsCache);
  };
  return {
    atDenialLimit,
    permissionTools,
    stop,
    hooksContext,
    requestDialog: requestDialogUnderHold,
    namesShownToApi: undefined,
    closedToolName,
    startsNoMoreCalls: () => scriptOutcome.startsNoMoreCalls?.() === true,
    callSlots: () =>
      (callSlots ??= createTokenSlots(
        Math.min(env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY ?? 10, 10),
        toolUseContext.abortController.signal,
      )),
    underAsk,
    authorize,
  };
}
//@ chunk-n51jggtb.js:98878-99043 placement (2.1.88 match: collectReadToolFilePaths, 1)
/**
 * 把权限判定更新过的输入合并回原输入（保留原 file_path）。
 */
function collectReadToolFilePaths(original, backfilled, chosen) {
  if (backfilled === null) return chosen;
  if (chosen === backfilled) return original;
  if ("file_path" in chosen && "file_path" in original && chosen.file_path === backfilled.file_path)
    return {
      ...chosen,
      file_path: original.file_path,
    };
  return chosen;
}
//@ chunk-n51jggtb.js:99043-99110 placement
/**
 * “Claude 已结束会话所以没跑”的说明。
 */
var CONVERSATION_ENDED_MESSAGE = "Claude ended this conversation, so this call did not run.";
//@ chunk-n51jggtb.js:99110-99190 placement
/**
 * 判断会话的 agent 是否已经停止接收调用。
 */
function hasEndedLoop(toolUseContext) {
  return (
    codeModeAccepted() &&
    toolUseContext.toolState?.get(TurnRegistry).endedLoops.has(toolUseContext.agentId) === true
  );
}
//@ chunk-n51jggtb.js:99190-114237 placement
/**
 * 内层工具调用的完整执行体：进度上报、参数校验、沙箱重试、hook、执行、结果读回与错误处理。
 */
function createScriptToolWrapper(
  tool,
  toolUseContext,
  canUseTool,
  assistantMessage,
  permissionEnv,
  enqueueMessages,
  lane,
  onProgress,
  shellDirectorySlot,
  readProbeSlot,
  scriptOutcome,
) {
  let { permissionTools, stop } = permissionEnv;
  let invoke = async (input, ctx) => {
    let shellDirectories = ctx?.shellDirectories ?? takeShellDirectories(shellDirectorySlot);
    let facts = ctx?.facts ?? takeFacts(shellDirectorySlot);
    let readProbe = ctx?.readProbe ?? readProbeSlot.pending;
    readProbeSlot.pending = false;
    let toolUseID = ctx?.toolUseID ?? `${SCRIPT_CALL_TOOL_USE_ID_PREFIX}${randomUUID()}`;
    let unsandboxedRetry = ctx?.unsandboxedRetry;
    let asResult = (error) =>
      unsandboxedRetry === undefined
        ? unusedWithError(tool.name, error)
        : {
            error,
            unsandboxedRetry,
          };
    logForDebugging(`[trace] inner-start id=${toolUseID} tool=${toolCategoryForTelemetry(tool)}`);
    let hookFeedback = isAccepted() ? createHookMessages() : undefined;
    let stopByHook = () => {
      if (hookFeedback?.halt !== undefined && !toolUseContext.abortController.signal.aborted)
        stopContinuation(
          hookFeedback,
          tool.name,
          toolUseID,
          hookFeedback.halt.reason || "Execution stopped by hook",
        );
    };
    let errored = false;
    let failed = false;
    let takeHookMessages = () => {
      let messages = hookFeedback === undefined ? [] : takeUncommitted(hookFeedback);
      if (messages.some(isStoppedContinuation)) permissionEnv.stop.byHook = true;
      return messages;
    };
    let isMcp = tool.isMcp === true;
    let mcpThrows = isMcp && mcpToolsThrow();
    let permissionRecord;
    let denialKind;
    let permissionMode;
    let safetyLogged = false;
    let logSafetyOnce = (sandboxViolations) => {
      if (permissionRecord === undefined || permissionMode === undefined || safetyLogged) return;
      safetyLogged = true;
      if (
        logToolSafetyEvent({
          tool,
          toolUseId: toolUseID,
          record: permissionRecord,
          sandboxViolations: [...(ctx?.sandboxViolationsBefore ?? []), ...(sandboxViolations ?? [])],
          permissionMode,
          agentContext: toolUseContext.agentContext,
          toolCatalog: toolUseContext.options.toolCatalog,
        })
      )
        ctx?.onSafetyEvent?.();
    };
    let fail = (message, declined = false) => {
      logSafetyOnce();
      onProgress?.({
        type: "progress",
        toolUseID,
        data: {
          type: "repl_tool_call",
          toolName: tool.name,
          toolInput: input,
          toolUseId: toolUseID,
          phase: "error",
          error: message,
          ...(declined && {
            declined: true,
          }),
          ...(permissionRecord !== undefined && {
            permissionDecision: permissionRecord,
          }),
          ...(denialKind !== undefined && {
            toolDenialKind: denialKind,
          }),
        },
      });
      if (failed) stopByHook();
      let hookMessages = takeHookMessages();
      if (hookMessages.length > 0)
        enqueueMessages(undefined, {
          tool,
          newMessages: undefined,
          contextLayers: undefined,
          hookFeedback: hookMessages,
        });
      return asError(message);
    };
    let reject = (declined = false) => {
      denialKind = "user-rejected";
      return fail(REJECT_MESSAGE, declined);
    };
    let asError = (error) => {
      if (mcpThrows) {
        if (isCodeModeOn())
          logEvent("tengu_repl_mcp_error_thrown", {
            replToolUseID: sanitizeMarkName(toolUseContext.toolUseId),
            toolName: isInferredMcpToolName(tool.name)
              ? sanitizeToolNameForAnalytics(tool.name)
              : lit("mcp_tool"),
            preExecution: true,
          });
        throw new McpToolError(tool.name, error);
      }
      return asResult(error);
    };
    let emitExecuting = (toolInput, nativeTimeoutMs, executed = false) =>
      onProgress?.({
        type: "progress",
        toolUseID,
        data: {
          type: "repl_tool_call",
          toolName: tool.name,
          toolInput,
          toolUseId: toolUseID,
          phase: "executing",
          nativeTimeoutMs,
          ...(executed && {
            executed: true,
          }),
        },
      });
    let shellProgress;
    let emitShellProgress = (toolInput) => {
      if (shellProgress !== undefined)
        onProgress?.({
          type: "progress",
          toolUseID,
          data: {
            type: "repl_tool_call",
            toolName: tool.name,
            toolInput,
            toolUseId: toolUseID,
            phase: "executing",
            shellProgress,
          },
        });
    };
    if (codeModeAccepted() && isUnwritableArgsRefuseOn()) {
      let unwritable = findUnwritableArgument(input);
      if (unwritable?.because === "too deep") {
        await Promise.resolve();
        unwritable = findUnwritableArgument(input);
      }
      if (unwritable !== undefined) {
        let message = unwritableArgumentText(tool.name, unwritable);
        if (isCodeModeOn())
          logEvent("tengu_repl_unwritable_args_refused", {
            replToolUseID: sanitizeMarkName(toolUseContext.toolUseId),
            toolName: isAccepted()
              ? permissionEnv.closedToolName(tool)
              : !isMcp || isInferredMcpToolName(tool.name)
                ? sanitizeToolNameForAnalytics(tool.name)
                : lit("mcp_tool"),
            because: fromEnum(unwritable.because),
          });
        logForDebugging(
          `REPL: refused a call of ${toolCategoryForTelemetry(tool)} from Claude's code, which got an error: the call's arguments can't be written as JSON (${unwritable.because})`,
          {
            level: "warn",
          },
        );
        throw new UnwritableArgumentsError(message);
      }
    }
    onProgress?.({
      type: "progress",
      toolUseID,
      data: {
        type: "repl_tool_call",
        toolName: tool.name,
        toolInput: input,
        toolUseId: toolUseID,
        phase: "start",
      },
    });
    let toolInput = input;
    let toolInput_2 = input;
    let chosenInput;
    let rawInputCopy;
    let hooksContext = permissionEnv.hooksContext();
    let hasSlot = false;
    let complete = (
      rawResult,
      result,
      shownInput,
      retry = unsandboxedRetry,
      meta,
      roundRecord = permissionRecord,
    ) => {
      let value = result;
      let beforeReadBack = value !== rawResult ? rawResult : undefined;
      let delegatedToolNames =
        isSillyShoreGateOn() && REPL_INNER_TOOLS.has(tool.name)
          ? getToolsUsedList(rawResult).filter((name) => getConversationToolsUsed().has(name))
          : [];
      if (retry !== undefined && value !== null && typeof value === "object")
        value = {
          ...value,
          unsandboxedRetry: retry,
        };
      let parsed;
      let notes;
      if (tool.isMcp && Array.isArray(rawResult)) {
        let texts = rawResult
          .filter(
            (block) =>
              block != null &&
              typeof block === "object" &&
              "type" in block &&
              block.type === "text" &&
              "text" in block &&
              typeof block.text === "string",
          )
          .map((block) => block.text);
        if (texts.length === rawResult.length && texts.length > 0) {
          let joined = texts.join(`
`);
          try {
            value = jsonParse(joined);
            parsed = {
              text: joined,
              value,
            };
          } catch {
            value = joined;
            let parsedBlocks =
              texts.length > 1
                ? texts.map((text) => {
                    try {
                      return jsonParse(text);
                    } catch {
                      return;
                    }
                  })
                : [];
            let objects = parsedBlocks.filter(isPlainObject);
            let only = objects.length === 1 ? objects[0] : undefined;
            if (only !== undefined && !("_notes" in only)) {
              let withNotes = {
                ...only,
                _notes: texts.filter((text, index) => parsedBlocks[index] !== only),
              };
              if (!isTooDeepOrLarge(withNotes)) value = withNotes;
              else {
                let json = cloneSafelyForHooks(withNotes);
                if (json !== undefined) {
                  value = withNotes;
                  parsed = {
                    text: json,
                    value: withNotes,
                  };
                }
              }
              if (value === withNotes)
                notes = {
                  joined,
                  notes: withNotes._notes,
                };
            }
          }
        }
      }
      if (
        tool.name === AGENT &&
        typeof value === "object" &&
        value !== null &&
        ("handbackReport" in value || "taskCalls" in value)
      ) {
        let { handbackReport, taskCalls, ...rest } = {
          ...value,
        };
        value = rest;
      }
      let mcpContent = isMcp && Array.isArray(rawResult) && value === rawResult;
      logSafetyOnce(meta?.sandboxViolations);
      onProgress?.({
        type: "progress",
        toolUseID,
        data: {
          type: "repl_tool_call",
          toolName: tool.name,
          toolInput: shownInput,
          toolUseId: toolUseID,
          phase: "complete",
          mcpContent,
          result: notes === undefined ? value : notes.joined,
          ...(delegatedToolNames.length > 0 && {
            delegatedToolNames,
          }),
          ...(notes !== undefined && {
            notes: notes.notes,
          }),
          ...(roundRecord !== undefined && {
            permissionDecision: roundRecord,
          }),
          ...(meta?.sandboxViolations !== undefined && {
            sandboxViolations: meta.sandboxViolations,
          }),
          ...(meta?.sandboxed !== undefined && {
            sandboxed: meta.sandboxed,
          }),
          ...(beforeReadBack !== undefined &&
            (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) && {
              resultBeforeReadBack: beforeReadBack,
            }),
        },
      });
      let normalized = shrinkInlineBase64(
        {
          toolName: tool.name,
          mcpContent,
        },
        value,
      );
      if (parsed === undefined || normalized !== parsed.value) {
        let json = cloneSafelyForHooks(normalized);
        return json !== undefined ? freezePayload(json) : normalized;
      }
      return isTooDeepOrLarge(normalized) ? freezePayload(parsed.text) : normalized;
    };
    try {
      if (codeModeAccepted() && true && hasEndedLoop(toolUseContext)) return fail(CONVERSATION_ENDED_MESSAGE);
      let parsedInput = tool.inputSchema.safeParse(input);
      if (!parsedInput.success) {
        let validationMessage = formatZodValidationError(tool.name, parsedInput.error);
        let steer = tool.validationErrorSteer?.(input, parsedInput.error);
        if (steer)
          validationMessage = `${steer}

${validationMessage}`;
        return fail(validationMessage);
      }
      if (isMcp && isUndeclaredArgsRefuseOn()) {
        let undeclaredKeys = undeclaredArgumentKeys(
          tool.inputJSONSchema,
          input,
          supportsRemoteExecution(tool) || getToolNameForPermissionCheck(tool)
            ? [HOST_TOOL_INPUT_FIELD, DEVICE_2]
            : [],
        );
        if (undeclaredKeys.length > 0 && tool.inputJSONSchema) {
          if (isCodeModeOn())
            logEvent("tengu_repl_mcp_undeclared_args_refused", {
              replToolUseID: sanitizeMarkName(toolUseContext.toolUseId),
              toolName: isInferredMcpToolName(tool.name)
                ? sanitizeToolNameForAnalytics(tool.name)
                : lit("mcp_tool"),
              undeclaredCount: undeclaredKeys.length,
            });
          return fail(undeclaredArgumentText(tool.name, undeclaredKeys, tool.inputJSONSchema));
        }
      }
      if (
        lane === "async" &&
        (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) &&
        parsedInput.data.run_in_background === true
      )
        return fail(
          `${tool.name}: run_in_background is not available in the async REPL. The eval already runs in the background, so await the command instead.`,
        );
      let inputValue = parsedInput.data;
      let notLoaded = isHookCallerVirtualTool(assistantMessage, toolUseContext)
        ? null
        : getNotLoadedToolVerdict(tool, toolUseContext);
      if (notLoaded !== null) {
        try {
          logEvent("tengu_tool_use_not_loaded", {
            enforced: notLoaded.enforced,
            toolName: lit("mcp_tool"),
            isMcp: true,
            toolUseID: sanitizeMarkName(toolUseID),
            family: fromEnum(notLoaded.family),
            late: notLoaded.late,
            loadInSameReply: notLoaded.loadInSameReply,
            firstForTool: notLoaded.firstForTool,
            relayActive: notLoaded.relayActive,
            flagSource: fromEnum(notLoaded.flagSource),
            coworkSurface: notLoaded.coworkSurface,
            replInnerCall: true,
          });
        } catch (error) {
          logNotLoadedCheckFailure("telemetry", error);
        }
        if (notLoaded.enforced) return fail(notLoaded.message);
      }
      let isolation = checkWebIsolation(tool, toolUseContext, inputValue);
      if (isolation.denyMessage) {
        logEvent("tengu_tool_use_isolation_latch_denied", {
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseID: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          isolationLatch: fromEnumOpt(isolation.activeLatch),
          isolationClassifiedAs: fromEnumOpt(isolation.classifiedAs),
          replInnerCall: true,
        });
        return fail(isolation.denyMessage);
      }
      if (permissionEnv.startsNoMoreCalls()) return fail(FINISHED_CODE_NO_CALLS_MESSAGE);
      if (isAccepted() && ctx?.isHookedRun !== true) {
        hasSlot = await permissionEnv.callSlots().take();
        if (!hasSlot || permissionEnv.startsNoMoreCalls() || toolUseContext.abortController.signal.aborted)
          return fail(STOPPED_BEFORE_CALL_MESSAGE);
      }
      if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
      if (permissionEnv.stop.byHook === true) return fail(TOOL_DID_NOT_RUN_LINE);
      if (isAccepted()) {
        let hookVerdict = await pluginsHookingTool(tool, toolUseContext);
        if (hookVerdict === "unknown" || hookVerdict.length > 0)
          return fail(hookingPluginNotice(hookVerdict));
      }
      if (
        ctx?.isHookedRun === true &&
        supportsRemoteExecution(tool) &&
        splitHostField(inputValue).requested !== undefined
      )
        return fail(INJECTED_MACHINE_REFUSAL);
      let route = describeCoordinatorRefusal(
        tool,
        toolUseContext,
        await routeToolCallWithAdoption(tool, inputValue, toolUseContext),
      );
      if (route.where === "refused") return fail(route.message);
      if (codeModeAccepted() && true && hasEndedLoop(toolUseContext)) return fail(CONVERSATION_ENDED_MESSAGE);
      if (route.where === "elsewhere") {
        if (permissionEnv.atDenialLimit() && route.route.kind !== "error") {
          if (stop.pending) return reject();
          return fail(
            toolUseContext.autoModeDenialLimitRun === true
              ? "Not sent: after several blocked actions in a row, auto mode doesn't send calls to another machine, so this call didn't run."
              : "Not sent: after auto mode reached its limit of blocked actions, it doesn't send calls to another machine, so this call didn't run.",
          );
        }
        if (permissionEnv.startsNoMoreCalls()) return fail(STOPPED_BEFORE_CALL_MESSAGE);
        if (stop.pending) return reject();
        if (route.route.kind === "remote") emitExecuting(inputValue, undefined);
        startSessionActivity("tool_exec", REPL_INNER_CALL);
        let remoteResult;
        try {
          remoteResult = await permissionEnv.underAsk(
            (toolUseContext) =>
              route.hosts.runInnerCall({
                tool,
                route: route.route,
                rawInput: inputValue,
                toolUseContext,
                canUseTool,
                parentMessage: assistantMessage,
                toolUseId: toolUseID,
              }),
            (stopTurn) => {
              chosenInput = stopTurn;
            },
          );
        } finally {
          endActivity("tool_exec", REPL_INNER_CALL);
        }
        if (remoteResult.kind === "error") {
          denialKind = remoteResult.denialKind;
          if (remoteResult.ran) {
            recordToolUsed(tool.name);
            emitExecuting(inputValue, undefined, true);
          }
          return fail(remoteResult.message, chosenInput !== undefined);
        }
        recordToolUsed(tool.name);
        let servedText = servedTextOf(tool.name, remoteResult.value);
        onProgress?.({
          type: "progress",
          toolUseID,
          data: {
            type: "repl_tool_call",
            toolName: tool.name,
            toolInput: inputValue,
            toolUseId: toolUseID,
            phase: "complete",
            executed: true,
            result: remoteResult.value,
            ...(servedText !== undefined && {
              servedText,
            }),
          },
        });
        return remoteResult.value;
      }
      inputValue = route.input;
      if (ctx?.isHookedRun !== true && hasToolCallHook(tool, toolUseContext)) {
        if (stop.pending) return reject();
        if (toolUseContext.abortController.signal.aborted) throw new AbortError();
        let hookIssue = checkCloneableForHooks(tool, inputValue);
        if (hookIssue !== undefined) return fail(hookIssue);
        let hookTracker = createHookProgressTracker(onProgress);
        let retryInfo = unsandboxedRetry;
        let keptRun;
        let resolution = await runManagedToolCall({
          tool,
          toolUseID,
          input: inputValue,
          toolUseContext: {
            ...toolUseContext,
            options: hooksContext.options,
            gateIgnoresSwitch: true,
          },
          startRun: async (resolvedInput, resolvedContext, meta) => {
            let { run, onProgress, endRun } = hookTracker.beginRun();
            let retryInfoFromRun;
            let settled = await createScriptToolWrapper(
              tool,
              {
                ...resolvedContext,
                options: toolUseContext.options,
                gateIgnoresSwitch: undefined,
              },
              canUseTool,
              assistantMessage,
              permissionEnv,
              (message, contextLayers) => {
                run.commits.push([message, contextLayers]);
              },
              lane,
              onProgress,
              {
                pending: undefined,
              },
              readProbeSlot,
              (stopTurn) => {
                chosenInput = stopTurn;
              },
            )(resolvedInput, {
              ...ctx,
              toolUseID,
              ...(meta.byPlugin && {
                ownStep: true,
              }),
              shellDirectories: meta.atAll ? [] : shellDirectories,
              ...(facts !== undefined && {
                facts,
              }),
              isHookedRun: true,
              readProbe,
              onUnsandboxedRetry: (retry) => {
                retryInfoFromRun = retry;
              },
            }).then(
              (value) => ({
                value,
              }),
              (thrown) => ({
                thrown,
              }),
            );
            endRun();
            retryInfo = retryInfoFromRun ?? unsandboxedRetry;
            keptRun = run;
            return {
              ...run,
              settled,
            };
          },
        }).finally(() => {
          hookTracker.close();
        });
        switch (resolution.kind) {
          case "refused": {
            let refusal = fail(resolution.message, chosenInput !== undefined);
            return retryInfo !== undefined && isPlainObject(refusal)
              ? {
                  ...refusal,
                  unsandboxedRetry: retryInfo,
                }
              : refusal;
          }
          case "answered": {
            if (!hookTracker.mayHaveReachedTool()) {
              if (stop.pending) return reject(chosenInput !== undefined);
              if (toolUseContext.abortController.signal.aborted) throw new AbortError();
            }
            if (facts !== undefined) {
              facts.hookRewrote = true;
              facts.whole = undefined;
            }
            enqueueMessages(
              {
                data: resolution.data,
              },
              {
                tool,
                newMessages: undefined,
                contextLayers: undefined,
                ...(resolution.ranSpill && {
                  shellSpill: resolution.ranSpill,
                }),
              },
            );
            let closing = keptRun?.closing?.type === "progress" ? keptRun.closing.data : undefined;
            return complete(
              resolution.data,
              tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME
                ? markStdoutRewrittenByHook(
                    resolution.data,
                    resolution.ranSpill !== undefined,
                    resolution.ranSpill?.cut === true,
                  )
                : resolution.data,
              resolution.input,
              retryInfo,
              closing,
              closing?.permissionDecision?.decision === "accept" && keptRun?.ranInput !== undefined
                ? closing.permissionDecision
                : undefined,
            );
          }
          case "run": {
            let { closing, commits, settled } = resolution.run;
            for (let [messages, layers] of commits) enqueueMessages(messages, layers);
            if (closing !== undefined) onProgress?.(closing);
            if ("thrown" in settled) throw settled.thrown;
            return settled.value;
          }
        }
      }
      let mode;
      try {
        mode = getToolPermissionContext(toolUseContext).mode;
      } catch {}
      let decision = await permissionEnv.authorize(tool, inputValue, toolUseID, {
        ...ctx,
        ...(ctx?.isHookedRun === true && {
          run: {
            abortController: toolUseContext.abortController,
            managedPass: toolUseContext.managedPass,
          },
        }),
        hostPrefix: facts?.hostPrefix,
        onStopTurn: (stopTurn) => {
          chosenInput = stopTurn;
        },
        ...(hookFeedback !== undefined && {
          hookFeedback,
        }),
        ...(facts !== undefined && {
          facts,
        }),
      });
      permissionRecord = decision.permissionDecision;
      permissionMode = mode;
      errored = true;
      if (decision.behavior === "deny") {
        denialKind = decision.toolDenialKind;
        return fail(decision.message, chosenInput !== undefined);
      }
      failed = true;
      let hookHalted = hookFeedback?.halt !== undefined && permissionEnv.stop.byHook !== true;
      if (hookHalted) {
        stopByHook();
        enqueueMessages(undefined, {
          tool,
          newMessages: undefined,
          contextLayers: undefined,
          hookFeedback: takeHookMessages(),
        });
      }
      if (
        ctx?.isHookedRun === true &&
        toolUseContext.abortController.signal.aborted &&
        !hooksContext.abortController.signal.aborted
      )
        throw new AbortError();
      toolInput = decision.input;
      toolInput_2 = decision.observableInput;
      let clamped = false;
      if (isCoordinatorBashToolUse(tool, toolUseContext)) {
        let coordinatorIssue = checkCoordinatorShellCommand(tool, toolInput, toolUseContext);
        if (coordinatorIssue !== null) return fail(coordinatorIssue);
        toolInput = clampCoordinatorShellTimeout(toolInput);
      }
      if (toolInput !== decision.input) toolInput_2 = toolInput;
      if (
        (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) &&
        shellDirectories.length > 0 &&
        toolInput.command === inputValue.command &&
        !isScrubActive()
      ) {
        let directoryIssue = await checkDirectories(
          shellDirectories,
          callTimeoutMs(tool, toolInput, lane === "async" ? REPL_ASYNC_WALL_CAP_MS : undefined) ??
            getDefaultBashTimeoutMs(),
        );
        if (directoryIssue !== undefined) return fail(directoryIssue);
      }
      if (permissionEnv.stop.byHook === true && !hookHalted) return fail(TOOL_DID_NOT_RUN_LINE);
      if (
        isAccepted() &&
        (toolUseContext.abortController.signal.aborted || permissionEnv.startsNoMoreCalls())
      )
        return fail(STOPPED_BEFORE_CALL_MESSAGE);
      let nativeTimeoutMs = callTimeoutMs(
        tool,
        toolInput,
        lane === "async" ? REPL_ASYNC_WALL_CAP_MS : undefined,
      );
      if (isCodeModeOn())
        logEvent("tengu_repl_inner_executing", {
          replToolUseID: sanitizeMarkName(toolUseContext.toolUseId),
          ...(isAccepted()
            ? {
                toolName: permissionEnv.closedToolName(tool),
                isMcp: tool.isMcp === true || tool.mcpInfo !== undefined,
              }
            : {
                toolName: sanitizeToolNameForAnalytics(tool.name),
                nativeTimeoutMs,
                isMcp: tool.isMcp ?? false,
              }),
        });
      if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
      if (codeModeAccepted() && true && hasEndedLoop(toolUseContext)) return fail(CONVERSATION_ENDED_MESSAGE);
      if (supportsRemoteExecution(tool) && splitHostField(toolInput).requested !== undefined)
        return fail(INJECTED_MACHINE_REFUSAL);
      if (!isCallDirectoryUnchanged()) return fail(CALL_DIRECTORY_CHANGED_MESSAGE);
      rawInputCopy = Date.now();
      startSessionActivity("tool_exec", REPL_INNER_CALL);
      let triggeredPaths = [];
      let result;
      recordToolUsed(tool.name);
      emitExecuting(toolInput, nativeTimeoutMs, true);
      try {
        result = await tool.call(
          toolInput,
          {
            ...toolUseContext,
            autoModeClassified: undefined,
            autoModeDenialLimitRun: undefined,
            autoModeScriptCheckDeferred: undefined,
            toolUseId: toolUseID,
            ...(permissionEnv.requestDialog !== undefined && {
              requestDialog: permissionEnv.requestDialog,
            }),
            innerCall: true,
            namesShownToApi: permissionEnv.namesShownToApi,
            permissionPhase: decision.permissionPhase,
            ...(lane === "async" && {
              shellWallCapMs: REPL_ASYNC_WALL_CAP_MS,
            }),
            ...(!isMcp &&
              tool.name === READNOTIFICATIONS && {
                queuedNotificationsRegistry: {
                  ...toolUseContext.queuedNotificationsRegistry,
                  drain: () => toolUseContext.queuedNotificationsRegistry.drain(getReplPartCap()),
                },
              }),
            nestedMemoryAttachmentTriggers: triggeredPaths,
            fileReadingLimits: {
              maxTokens: 1 / 0,
              maxSizeBytes: 268435456,
            },
          },
          canUseTool,
          assistantMessage,
          codeModeAccepted() &&
            getIsInteractive() &&
            (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME)
            ? (progress) => {
                if (
                  progress.type !== "progress" ||
                  (progress.data.type !== "bash_progress" && progress.data.type !== "powershell_progress")
                )
                  return;
                shellProgress = {
                  elapsedTimeSeconds: progress.data.elapsedTimeSeconds,
                  totalLines: progress.data.totalLines,
                };
                emitShellProgress(toolInput);
              }
            : undefined,
          {
            userModified: decision.userModified,
            globLimits: {
              maxResults: 25000,
            },
            gitDiffRead: true,
            ...(codeModeAccepted() && {
              enclosingToolUseId: toolUseContext.toolUseId,
            }),
          },
        );
        let writtenPath =
          tool.name === EDIT || tool.name === FILE_WRITE_TOOL_NAME ? tool.getPath?.(toolInput) : undefined;
        let expandedPath = writtenPath === undefined ? undefined : expandPath(writtenPath);
        if (expandedPath !== undefined && readProbeSlot.probed.delete(expandedPath))
          triggeredPaths.push(expandedPath);
      } finally {
        endActivity("tool_exec", REPL_INNER_CALL);
        let triggerList =
          lane === "async"
            ? (toolUseContext.pendingNestedMemoryTriggers ?? toolUseContext.nestedMemoryAttachmentTriggers)
            : toolUseContext.nestedMemoryAttachmentTriggers;
        for (let path of triggeredPaths)
          if (readProbe) readProbeSlot.probed.add(path);
          else if (triggerList !== undefined && !triggerList.includes(path)) triggerList.push(path);
      }
      logForDebugging(`[trace] inner-end id=${toolUseID}`);
      if (mcpThrows && result.data === undefined && toolUseContext.abortController.signal.aborted)
        throw new AbortError();
      if (mcpThrows && result.urlElicitationDeclined) {
        let declineText =
          typeof result.data === "string" && result.data.length > 0
            ? result.data
            : `URL elicitation was declined; the tool "${tool.name}" could not complete.`;
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${declineText} Required URL: ${result.urlElicitationDeclined.url}`,
          "REPL MCP URL elicitation declined",
        );
      }
      let callMs = Date.now() - rawInputCopy;
      emitExecuting(toolInput, undefined);
      emitShellProgress(toolInput);
      let hookRan = false;
      let rewritten = false;
      let spilled = hasPersistedOutput(result.data);
      let spillCut = isPersistedOutputOverCap(result.data);
      let ownBytes = persistedOutputSizeOf(result.data);
      let readBack = (value) => {
        let paths = {
          folder: getOriginalCwd_2(toolUseContext.session),
          projectsDir: getProjectsDir(),
        };
        if (facts === undefined) return inlinePersistedOutput(value, paths);
        facts.readBack = true;
        let readWhole = facts.wantsWhole && !toolUseContext.abortController.signal.aborted;
        return inlinePersistedOutput(value, paths, {
          facts,
          ownBytes,
          readWhole,
        });
      };
      let seenNotes = watchWithheldResults(toolUseID);
      let withheld = false;
      try {
        for (let pass of isCustomizationDisabled("hooks")
          ? [undefined]
          : [
              {
                managedHooksExcluded: true,
              },
              {
                managedHooksOnly: true,
              },
            ])
          for await (let hookEvent of runPostToolUseHooks(
            hooksContext,
            tool,
            toolUseID,
            assistantMessage.message.id,
            toolInput_2,
            result.data,
            assistantMessage.requestId,
            undefined,
            undefined,
            callMs,
            pass,
          )) {
            hookRan = true;
            if ("message" in hookEvent && isNullRenderingAttachment(hookEvent.message))
              hookFeedback?.messages.push(hookEvent.message);
            if (
              "updatedToolOutput" in hookEvent &&
              tool.outputSchema?.safeParse(hookEvent.updatedToolOutput)?.success !== false
            ) {
              let updatedOutput = hookEvent.updatedToolOutput;
              if (tool.restoreTransientForRemap)
                try {
                  updatedOutput = tool.restoreTransientForRemap(result.data, updatedOutput);
                } catch (error) {
                  logError(error);
                  updatedOutput = hookEvent.updatedToolOutput;
                }
              result.data = updatedOutput;
              rewritten = true;
            }
          }
      } finally {
        withheld = releaseWithheldWatch(toolUseID, seenNotes);
      }
      if (hookRan) {
        let modifiedNote = await noteHookModifiedFile(
          tool.name,
          toolUseID,
          toolInput_2,
          toolUseContext.readFileState,
        );
        if (modifiedNote !== null) hookFeedback?.messages.push(modifiedNote);
      }
      stopByHook();
      if (withheld) return fail(withheldResultText(tool.name));
      enqueueMessages(result, {
        tool,
        newMessages: result.newMessages,
        contextLayers: result.contextLayers,
        ...(hookFeedback !== undefined && {
          hookFeedback: takeHookMessages(),
        }),
        ...(spilled && {
          shellSpill: {
            cut: spillCut,
          },
        }),
      });
      let finalOutput = result.data;
      if (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) {
        finalOutput = rewritten
          ? markStdoutRewrittenByHook(finalOutput, spilled, spillCut)
          : spilled && getFileAndShellTools().includes(tool)
            ? await readBack(finalOutput)
            : finalOutput;
        if (facts !== undefined) {
          if (rewritten) facts.hookRewrote = true;
          if (toolUseContext.abortController.signal.aborted) facts.whole = undefined;
        }
      }
      return complete(result.data, finalOutput, toolInput, unsandboxedRetry, result);
    } catch (error) {
      if (error instanceof McpToolError) throw error;
      let isInterrupt = isAbortError(error);
      let interruptKind = getInterruptKind(error, toolUseContext.abortController.signal);
      let message =
        isInterrupt && rawInputCopy === undefined
          ? scriptOverMessage(toolUseContext.abortController.signal, formatToolErrorMessage(error))
          : formatToolErrorMessage(error);
      if (rawInputCopy !== undefined) {
        emitExecuting(toolInput, undefined);
        emitShellProgress(toolInput);
      }
      for await (let failureEvent of runPostToolUseFailureHooks(
        hooksContext,
        tool,
        toolUseID,
        assistantMessage.message.id,
        toolInput_2,
        message,
        isInterrupt,
        assistantMessage.requestId,
        undefined,
        undefined,
        rawInputCopy !== undefined ? Date.now() - rawInputCopy : undefined,
      ))
        if (isNullRenderingAttachment(failureEvent.message))
          hookFeedback?.messages.push(failureEvent.message);
      onProgress?.({
        type: "progress",
        toolUseID,
        data: {
          type: "repl_tool_call",
          toolName: tool.name,
          toolInput,
          toolUseId: toolUseID,
          phase: "error",
          error: message,
          ...(permissionRecord !== undefined && {
            permissionDecision: permissionRecord,
          }),
          ...(interruptKind !== undefined && {
            toolDenialKind: interruptKind,
          }),
          ...(error instanceof ShellError &&
            error.sandboxViolations !== undefined && {
              sandboxViolations: error.sandboxViolations,
            }),
          ...(error instanceof ShellError &&
            error.sandboxed !== undefined && {
              sandboxed: error.sandboxed,
            }),
        },
      });
      if (
        !isAccepted() &&
        tool.name === BASH_TOOL_NAME &&
        error instanceof ShellError &&
        error.hadSandboxViolation &&
        input?.dangerouslyDisableSandbox !== true &&
        unsandboxedRetry === undefined &&
        getCommandNetworkLists(input) === undefined &&
        SandboxManager.isSandboxingEnabled() &&
        SandboxManager.areUnsandboxedCommandsAllowed()
      ) {
        logForDebugging("REPL Bash sandbox violation \u2014 auto-retrying unsandboxed");
        let retryInfo = {
          violation: extractSandboxViolations(error.stderr),
        };
        ctx?.onUnsandboxedRetry?.(retryInfo);
        let safetyLogged = false;
        let sandboxViolations = error.sandboxViolations;
        return invoke(
          {
            ...input,
            dangerouslyDisableSandbox: true,
            ...false,
          },
          {
            toolUseID,
            ownStep: true,
            unsandboxedRetry: retryInfo,
            shellDirectories,
            ...(facts !== undefined && {
              facts,
            }),
            ...(sandboxViolations !== undefined && {
              sandboxViolationsBefore: sandboxViolations,
            }),
            onSafetyEvent: () => {
              safetyLogged = true;
            },
          },
        ).finally(() => {
          if (!safetyLogged) logSafetyOnce(sandboxViolations);
        });
      }
      logSafetyOnce(error instanceof ShellError ? error.sandboxViolations : undefined);
      if (!isInterrupt && errored) stopByHook();
      enqueueMessages(
        error,
        hookFeedback === undefined
          ? undefined
          : {
              tool,
              newMessages: undefined,
              contextLayers: undefined,
              hookFeedback: takeHookMessages(),
            },
      );
      if (mcpThrows) {
        if (isCodeModeOn())
          logEvent("tengu_repl_mcp_error_thrown", {
            replToolUseID: sanitizeMarkName(toolUseContext.toolUseId),
            toolName: isInferredMcpToolName(tool.name)
              ? sanitizeToolNameForAnalytics(tool.name)
              : lit("mcp_tool"),
            preExecution: rawInputCopy === undefined,
            isInterrupt,
          });
        throw new McpToolError(tool.name, message);
      }
      return asResult(message);
    } finally {
      if (hasSlot) permissionEnv.callSlots().give();
      if (toolUseContext.toolDecisions) toolUseContext.toolDecisions.delete(toolUseID);
      if (chosenInput !== undefined && scriptOutcome !== undefined) scriptOutcome(chosenInput);
      else chosenInput?.();
      clearToolUsePermissionState(toolUseContext.session, toolUseID);
    }
  };
  return (input, ctx) => runInRemoteCallFrame(() => invoke(input, ctx));
}
export { filterRenameableTools, buildToolWrappers };
