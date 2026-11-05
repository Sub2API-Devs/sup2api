/**
 * engine/queryEngine.ts
 *
 * 2.1.316 新增：查询引擎（SDK/print/REPL 共用）：执行回合、延迟斜杠命令、汇总模型用量、思考 token 估算。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pwdsqzsj.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { stat, readFile } from "fs/promises";
import {
  thinkingTokenEstimate as thinkingTokenEstimate_2,
  signatureTokenEstimate,
  SYNTHETIC_MESSAGES,
  createSystemMessage,
  isHarnessMetaMessage,
} from "../utils/messages.js";
import {
  INTERRUPT_RECEIPT_V1,
  MSG_LIFECYCLE_V1,
  ASK_USER_QUESTION_UNANSWERED_V1,
  buildSystemInitMessage,
  toolNameForInit,
} from "../utils/messages/systemInit.js";
import { processUserInput } from "../utils/processUserInput/processUserInput.js";
import { isCompactBoundaryMessage } from "../services/projects/threadRows.js";
import {
  buildInitMessageFields,
  memoryRecallMessage,
  postFeedbackSubmission,
} from "../services/feedback/feedbackBundle.js";
import { Stream } from "../utils/stream.js";
import {
  getSessionId,
  getTotalCostUSD,
  getTotalAPIDuration,
  getModelUsage,
  getSafetyStops,
  setAutoModeUnavailableStopNotice,
} from "../bootstrap/state.js";
import {
  currentNotificationKeyAlias,
  CLIENT_SURFACE_ID,
  drainNotificationsForSession,
  hasQueuedNotificationsForSession,
} from "../utils/task/taskNotifications.js";
import { logForDebugging, getMinDebugLogLevel } from "../utils/debug.js";
import {
  createRemoteFileState,
  READ_FILE_STATE_CACHE_SIZE,
  stripBomAndCarriageReturn,
} from "../utils/remoteFileState.js";
import { logError, getInMemoryErrors } from "../utils/log.js";
import {
  withResultExtras,
  buildResultMessage,
  isAbortedTerminalReason,
} from "../entrypoints/sdk/coreSchemas.js";
import { buildFileHistorySnapshotChain, saveAiGeneratedTitle } from "../utils/sessionStorage.js";
import { getRunningTasks } from "../utils/task/framework.js";
import { isWaitableAgentOrWorkflow } from "../tasks/taskKinds.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import { rearmCreditsExhaustedNotice } from "../utils/fastMode.js";
import { errorMessage, isFsInaccessible } from "../utils/errors.js";
import { unwrapAbortReason } from "../utils/abortController.js";
import {
  isRecordableDenial,
  isPreAskDeny,
  isInvalidInputDeny,
  decisionReasonCode,
  parsePermissionMode,
} from "../types/permissions.js";
import { serializeDecisionReason } from "../utils/permissions/decisionReasons.js";
import { guardGoalCheck } from "../query/goalCheckIn.js";
import { UnsentMediaReporter, letGoOfUnsentMediaInPlace } from "../services/api/toolSchemaWire.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { MESSAGE_MARK_SYMBOLS_2 } from "../utils/messageKinds.js";
import { lastAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { stripMemoryTags } from "../services/orgMemory/promptIndex.js";
import { reduceCompactResponseLength } from "../services/compact/reactiveCompact.js";
import {
  toSDKCompactMetadata,
  toSDKModelConsentFallbackMessage,
  localCommandOutputToSDKAssistantMessage,
} from "../utils/messages/mappers.js";
import { createToolUseSummaryMessage } from "../remote/sdkMessageAdapter.js";
import { categorizeRetryableAPIError } from "../services/api/errors.js";
import { LOCAL_COMMAND_STDOUT, LOCAL_COMMAND_STDERR } from "../constants/xml.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";
import { AGENT } from "../tools/AgentTool/constants.js";
import { hasReachedBudget, maxBudgetReachedMessage } from "../cost-tracker.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import {
  getNoServerCheckStoppedNotice,
  gatewayDisplayName,
} from "../utils/permissions/serverClassifier/fallbackNotice.js";
import { buildUserUnavailableNotice } from "../utils/permissions/serverClassifier/results.js";
import {
  formatResultDiagnostic,
  isResultSuccessful,
  buildEmptyResultDiagnostics,
  isRecoverableTrailingServerError,
} from "../utils/queryHelpers.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { turnOutcomeLabel } from "../bridge/inboundMessageOrigin.js";
import { sleep } from "../utils/sleep.js";
import { stopAllRunningTasks, stopObserverAgents, stopTask } from "../tasks/stopTask.js";
import { settlePendingPrLinks } from "../tools/shared/gitOperationTracking.js";
import { killAutoReactSubscriptions } from "../services/artifacts/frameLive.js";
import {
  drainQueuedTaskNotifications,
  artifactWatchStopNotice,
} from "../tasks/MonitorWsTask/MonitorWsTask.js";
import { getProcessQueue } from "../utils/messageQueueManager.js";
import {
  isBypassPermissionsModeDisabled,
  isAutoModeGateEnabled,
} from "../utils/permissions/permissionSetup.js";
import { expandPath } from "../utils/path.js";
import { collectContextData } from "../commands/context/context-noninteractive.js";
import { isBackgroundTasksOff } from "../tools/AgentTool/backgroundGates.js";
import { backgroundTaskByToolUseId, backgroundAll } from "../tasks/LocalShellTask/LocalShellTask.js";
import { requestAndPickSessionTitle, requestSessionTitle } from "../utils/sessionTitle.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import {
  feedbackMode,
  feedbackUnavailableReason,
  submitHeadlessFeedback,
  orgFeedbackRefusalMessage,
} from "../services/feedback/submitFeedback.js";
import { readFileForRemote } from "../services/remoteTools/remoteFileRead.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";

//@ chunk-pwdsqzsj.js:62566-63249 placement
function thinkingTokenEstimate(estimate, event) {
  if (event.type === "content_block_start")
    return {
      estimate: 0,
      emission: null,
    };
  if (event.type !== "content_block_delta")
    return {
      estimate,
      emission: null,
    };
  let { delta } = event;
  if (delta.type === "thinking_delta") {
    let deltaEstimate;
    if ("estimated_tokens" in delta && typeof delta.estimated_tokens === "number")
      deltaEstimate = delta.estimated_tokens;
    else if (typeof delta.thinking === "string" && delta.thinking.length > 0)
      deltaEstimate = thinkingTokenEstimate_2(delta.thinking);
    if (deltaEstimate === undefined)
      return {
        estimate,
        emission: null,
      };
    let nextEstimate = estimate + deltaEstimate;
    return {
      estimate: nextEstimate,
      emission: {
        estimatedTokens: nextEstimate,
        estimatedTokensDelta: deltaEstimate,
      },
    };
  }
  if (delta.type === "signature_delta" && estimate > 0) {
    let signatureEstimate = Math.ceil(signatureTokenEstimate(delta.signature.length) / 4);
    if (signatureEstimate > estimate)
      return {
        estimate: signatureEstimate,
        emission: {
          estimatedTokens: signatureEstimate,
          estimatedTokensDelta: signatureEstimate - estimate,
        },
      };
  }
  return {
    estimate,
    emission: null,
  };
}
//@ chunk-pwdsqzsj.js:63249-63299 placement
var VERBOSE_LOG_OPTIONS = {
  level: "verbose",
};
var LOG_FLUSH_MS = 1000;
var LOG_SINKS = [INTERRUPT_RECEIPT_V1, MSG_LIFECYCLE_V1, ASK_USER_QUESTION_UNANSWERED_V1];
//@ chunk-pwdsqzsj.js:63299-63364 placement
function cancelScopeFor(origin) {
  return origin === "remote"
    ? undefined
    : {
        scope: "turn-cancel",
      };
}
//@ chunk-pwdsqzsj.js:63364-63403 placement (2.1.88 match: getSettingsWithSources, 0.85)
var emptySettingsWithSources = () => ({
  effective: {},
  sources: [],
});
//@ chunk-pwdsqzsj.js:63403-64076 placement
async function* runDeferredSlashCommand(engineDeferredSlash, queryContext, abortController) {
  let messages = queryContext.messages.filter((message) => message.uuid !== engineDeferredSlash.messageUuid);
  let { messages: messages_2 } = await processUserInput({
    input: engineDeferredSlash.text,
    mode: "prompt",
    context: {
      ...queryContext.toolUseContext,
      abortController,
      messages,
      canUseTool: queryContext.canUseTool,
      setMessages: () => {},
      applyMessageOp: () => {},
      onChangeAPIKey: () => {},
      deferredSlashUuid: engineDeferredSlash.messageUuid,
      options: {
        ...queryContext.toolUseContext.options,
        ideInstallationStatus: null,
        theme: "dark",
      },
    },
    messages,
    querySource: queryContext.querySource,
    origin: engineDeferredSlash.origin,
    onScreened: engineDeferredSlash.lineScreened,
    interactionPrompt: engineDeferredSlash.interactionPrompt,
    ownWordUuids: [],
  });
  let preservedMessages = messages_2.find(isCompactBoundaryMessage)?.compactMetadata.preservedMessages;
  let preservedUuids = new Set(preservedMessages?.allUuids ?? preservedMessages?.uuids ?? []);
  for (let message of messages_2) if (!preservedUuids.has(message.uuid)) yield message;
  return {
    reason: "completed",
  };
}
//@ chunk-pwdsqzsj.js:64076-89897 placement
/**
 * 2.1.316 的查询引擎（SDK/print/REPL 共用）：接收 run 回调与命令、模型、工具、MCP、插件等环境，产出 system/init、stream_event、result 等 SDK 消息并处理中断与命令生命周期。
 */
function createQueryEngine({
  run,
  queryParams,
  commands = [],
  models = [],
  unavailableModels = [],
  agents = [],
  account = {},
  outputStyle,
  availableOutputStyles,
  mcpServers = () => [],
  mcpDelegate,
  excludeDynamicSections,
  settings = emptySettingsWithSources(),
  authDelegate,
  mcpAuthDelegate,
  ambient,
  tools = [],
  skills = [],
  plugins = [],
  pluginErrors = [],
  pluginWarnings = [],
  mcpServerErrors = [],
  initialModel,
  initialPermissionMode,
  fastModeState,
  fastModeDisabledReason,
  hostOwnsPermissionMode = false,
  hostOwnsModel = false,
  sdkResultVerdict = false,
  onCommandLifecycle,
  onTurnThrow,
}) {
  let initMessageFields = buildInitMessageFields({
    commands: typeof commands === "function" ? commands() : commands,
    models: typeof models === "function" ? models() : models,
    unavailableModels: typeof unavailableModels === "function" ? unavailableModels() : unavailableModels,
    agents: typeof agents === "function" ? agents() : agents,
    account,
    outputStyle,
    availableOutputStyles,
  });
  let intentQueue = new Stream();
  let turnIntents = [];
  let turnCount = 0;
  let currentTurnController = null;
  let getAbortSignal = () =>
    (currentTurnController && !currentTurnController.signal.aborted
      ? currentTurnController
      : new AbortController()
    ).signal;
  let modelOverride = null;
  let permissionModeOverride = null;
  let maxThinkingTokens = null;
  let flagSettings = null;
  let sessionId = getSessionId();
  let notificationKey = currentNotificationKeyAlias();
  if (notificationKey !== sessionId && notificationKey !== CLIENT_SURFACE_ID)
    logForDebugging(
      `[engine] sdkEventQueue push key '${notificationKey}' \u2260 engine sessionId '${sessionId}' \u2014 host ALS wiring likely incorrect; enqueued SdkEvents will not drain here`,
    );
  let toSdkMessage = (message) => ({
    ...message,
    session_id: sessionId,
    uuid: "uuid" in message && typeof message.uuid === "string" ? message.uuid : randomUUID(),
  });
  let resolveMaybeFn = (valueOrFn) => (typeof valueOrFn === "function" ? valueOrFn() : valueOrFn);
  let buildInitMessage = () => {
    let ambientInfo = resolveMaybeFn(ambient);
    if (!ambientInfo) return null;
    let commands_2 = typeof commands === "function" ? commands() : commands;
    let agentList = typeof agents === "function" ? agents() : agents;
    return buildSystemInitMessage({
      ...ambientInfo,
      sessionId,
      tools,
      mcpClients: mcpServers().map((server) => ({
        name: server.name,
        type: server.status,
        source: server.source,
      })),
      model: modelOverride ?? resolveMaybeFn(initialModel) ?? "",
      permissionMode: permissionModeOverride ?? resolveMaybeFn(initialPermissionMode) ?? "default",
      commands: commands_2,
      agents: agentList.map((agent) => ({
        agentType: agent.name,
      })),
      skills,
      plugins,
      pluginErrors,
      pluginWarnings,
      mcpServerErrors,
      additionalDirectories: undefined,
      syncedSkillsPath: undefined,
      fastModeState: resolveMaybeFn(fastModeState) ?? "off",
      fastModeDisabledReason: resolveMaybeFn(fastModeDisabledReason),
      capabilities: LOG_SINKS,
    });
  };
  let shouldReemitInit = false;
  let estimatedThinkingTokens = 0;
  let lastTurn = null;
  let shouldPersistTitle = false;
  let remoteFileState = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE);
  let pendingDenialFrames = [];
  let isDenialBufferOverflowLogged = false;
  let pendingResultFrames = [];
  let isClosed = false;
  let pushDenialFrame = (frame) => {
    if (pendingDenialFrames.length >= LOG_FLUSH_MS) {
      pendingDenialFrames.shift();
      if (!isDenialBufferOverflowLogged) {
        isDenialBufferOverflowLogged = true;
        logError(
          Error(
            "[engine] pendingDenialFrames buffer is full; dropping oldest permission_denied advisory frames",
          ),
        );
      }
    }
    pendingDenialFrames.push(frame);
  };
  function* drainDenialFrames() {
    while (pendingDenialFrames.length > 0) {
      let frame = pendingDenialFrames.shift();
      logForDebugging(`[engine] yield ${frame.type}/${frame.subtype}`, VERBOSE_LOG_OPTIONS);
      yield toSdkMessage(frame);
    }
  }
  let pendingLifecycleFrames = [];
  function reportCommandLifecycle(uuid, state) {
    try {
      onCommandLifecycle?.(uuid, state);
    } catch (error) {
      logError(error);
    }
  }
  function reportTurnThrow(error) {
    try {
      onTurnThrow?.({
        error,
      });
    } catch (error) {
      logError(error);
    }
  }
  function makeLifecycleFrame(uuid, state) {
    reportCommandLifecycle(uuid, state);
    return {
      type: "command_lifecycle",
      command_uuid: uuid,
      state,
    };
  }
  function* drainLifecycleFrames() {
    while (pendingLifecycleFrames.length > 0) {
      let frame = pendingLifecycleFrames.shift();
      logForDebugging(`[engine] yield command_lifecycle/${frame.state}`, VERBOSE_LOG_OPTIONS);
      yield toSdkMessage(frame);
    }
  }
  function* drainSideChannels() {
    yield* drainDenialFrames();
    yield* drainLifecycleFrames();
    for (let notificationMessage of drainNotificationsForSession(sessionId)) {
      logForDebugging(`[engine] yield sdk-queue system/${notificationMessage.subtype}`, VERBOSE_LOG_OPTIONS);
      yield toSdkMessage(notificationMessage);
    }
  }
  function* drainResultFrames() {
    while (pendingResultFrames.length > 0)
      yield withResultExtras(pendingResultFrames.shift(), {
        totalCostUsd: getTotalCostUSD(),
        durationApiMs: getTotalAPIDuration(),
        modelUsage: getModelUsage(),
        usage: aggregateModelUsage(),
        subagentStats: buildFileHistorySnapshotChain(lastTurn?.toolUseContext?.session),
        safetyStops: getSafetyStops(),
      });
  }
  let hasWaitableTasks = () => {
    if (!isClosed) return false;
    let getAppState = lastTurn?.toolUseContext?.getAppState;
    return (
      getAppState !== undefined &&
      getRunningTasks(getAppState()).some(
        (task) => isWaitableAgentOrWorkflow(task) && waitForTaskCompletion(task),
      )
    );
  };
  function* emitResult(resultMessage, lifecycleFrame) {
    if (hasWaitableTasks()) pendingResultFrames.push(resultMessage);
    else {
      yield* drainResultFrames();
      yield resultMessage;
    }
    if (lifecycleFrame) yield toSdkMessage(lifecycleFrame);
  }
  async function* driveTurns() {
    shouldReemitInit = false;
    let initMessage = buildInitMessage();
    if (initMessage) {
      logForDebugging("[engine] yield system/init (first)");
      yield toSdkMessage(initMessage);
    }
    for await (let intent of intentQueue) {
      if (shouldReemitInit) {
        shouldReemitInit = false;
        let reemitInitMessage = buildInitMessage();
        if (reemitInitMessage) {
          logForDebugging("[engine] yield system/init (re-emit)");
          yield toSdkMessage(reemitInitMessage);
        }
      }
      yield* drainSideChannels();
      rearmCreditsExhaustedNotice();
      let startTime = performance.now();
      let resultExtras = {
        parent_tool_use_id: intent.parent_tool_use_id,
        priority: intent.priority,
        shouldQuery: intent.shouldQuery,
        timestamp: intent.timestamp,
      };
      let turn;
      try {
        turn = await queryParams(intent);
      } catch (error) {
        logError(error);
        reportTurnThrow(error);
        turnIntents.shift();
        let cancelledFrame =
          intent.uuid !== undefined ? makeLifecycleFrame(intent.uuid, "cancelled") : undefined;
        if (sdkResultVerdict) setAutoModeUnavailableStopNotice(undefined);
        yield* drainSideChannels();
        let setupErrorResult = {
          ...buildResultMessage({
            startedAt: startTime,
            common: {
              is_error: true,
              duration_api_ms: 0,
              num_turns: 0,
              stop_reason: null,
              session_id: sessionId,
              total_cost_usd: getTotalCostUSD(),
              usage: aggregateModelUsage(),
              modelUsage: getModelUsage(),
              permission_denials: [],
              terminal_reason: "turn_setup_failed",
              fast_mode_state: resolveMaybeFn(fastModeState),
              fast_mode_disabled_reason: resolveMaybeFn(fastModeDisabledReason),
              origin: intent.origin,
              subagent_stats: buildFileHistorySnapshotChain(lastTurn?.toolUseContext?.session),
              safety_stops: getSafetyStops(),
            },
            variant: {
              subtype: "error_during_execution",
              errors: [`queryParams builder failed: ${errorMessage(error)}`],
              user_message_uuid: undefined,
            },
          }),
          ...resultExtras,
        };
        yield* emitResult(setupErrorResult, cancelledFrame);
        continue;
      }
      turnCount++;
      lastTurn = turn;
      let abortController = new AbortController();
      currentTurnController = abortController;
      let queuedIntent = turnIntents[0];
      if (queuedIntent !== undefined) queuedIntent.status = "armed";
      if (intent.uuid !== undefined) pendingLifecycleFrames.push(makeLifecycleFrame(intent.uuid, "started"));
      let signal = turn.toolUseContext?.abortController?.signal;
      let onParentAbort = () => abortController.abort(signal?.reason);
      if (signal?.aborted) abortController.abort(signal.reason);
      else
        signal?.addEventListener("abort", onParentAbort, {
          once: true,
        });
      let abortController_2 = turn.toolUseContext?.abortController;
      let onRefusalFallbackAbort = () => {
        if (
          unwrapAbortReason(abortController.signal.reason) === "refusal-fallback-edit" &&
          abortController_2 &&
          !abortController_2.signal.aborted
        )
          abortController_2.abort(abortController.signal.reason);
      };
      abortController.signal.addEventListener("abort", onRefusalFallbackAbort, {
        once: true,
      });
      logForDebugging(`[engine] turn ${turnCount} start`);
      let isVerbose = getMinDebugLogLevel() === "verbose";
      let permissionDenials = [];
      let recordDenial = (tool, toolUseId, toolInput) => {
        if (permissionDenials.some((existingDenial) => existingDenial.tool_use_id === toolUseId)) return;
        permissionDenials.push({
          tool_name: toolNameForInit(tool.name),
          tool_use_id: toolUseId,
          tool_input: toolInput,
        });
      };
      let canUseTool = turn.canUseTool;
      let canUseTool_2 = async (tool, toolInput, agentContext, permissionRequest, toolUseId, extra) => {
        let decision = await canUseTool(tool, toolInput, agentContext, permissionRequest, toolUseId, extra);
        if (isRecordableDenial(decision, extra)) recordDenial(tool, toolUseId, toolInput);
        if (decision.behavior === "deny" && isPreAskDeny(decision) && !isInvalidInputDeny(decision))
          pushDenialFrame({
            type: "system",
            subtype: "permission_denied",
            tool_name: tool.name,
            tool_use_id: toolUseId,
            agent_id: agentContext.agentId,
            decision_reason_type: decision.decisionReason?.type,
            decision_reason_code: decisionReasonCode(decision.decisionReason),
            decision_reason: serializeDecisionReason(decision.decisionReason),
            message: decision.message,
          });
        return decision;
      };
      if (remoteFileState.size > 0 && turn.toolUseContext?.readFileState) {
        for (let [path, seed] of remoteFileState.entries()) {
          let existingSeed = turn.toolUseContext.readFileState.get(path);
          if (!existingSeed || seed.timestamp > existingSeed.timestamp)
            turn.toolUseContext.readFileState.set(path, seed);
        }
        remoteFileState.clear();
      }
      let turnStream = turn.engineDeferredSlash
        ? runDeferredSlashCommand(turn.engineDeferredSlash, turn, abortController)
        : run({
            ...turn,
            canUseTool: canUseTool_2,
            keepPartialMessageOnAbort: true,
            takePlainDelta:
              turn.takePlainDelta === undefined || turn.toolUseContext?.options?.maxBudgetUsd !== undefined
                ? undefined
                : guardGoalCheck(
                    "engine",
                    () =>
                      pendingDenialFrames.length === 0 &&
                      pendingLifecycleFrames.length === 0 &&
                      !hasQueuedNotificationsForSession(sessionId),
                    turn.takePlainDelta,
                  ),
            toolUseContext: {
              ...turn.toolUseContext,
              abortController,
              onPermissionDenial: recordDenial,
              permissionLayers:
                (!hostOwnsModel && modelOverride !== null) ||
                (!hostOwnsPermissionMode && permissionModeOverride !== null) ||
                maxThinkingTokens !== null ||
                flagSettings !== null
                  ? [
                      ...(turn.toolUseContext?.permissionLayers ?? []),
                      ...(!hostOwnsModel && modelOverride !== null
                        ? [
                            {
                              kind: "model",
                              mainLoopModel: modelOverride,
                            },
                          ]
                        : []),
                      ...(!hostOwnsPermissionMode && permissionModeOverride !== null
                        ? [
                            {
                              kind: "permission_mode",
                              mode: permissionModeOverride,
                            },
                          ]
                        : []),
                      ...(maxThinkingTokens !== null
                        ? [
                            {
                              kind: "max_thinking_tokens",
                              maxThinkingTokens,
                            },
                          ]
                        : []),
                      ...(flagSettings !== null
                        ? [
                            {
                              kind: "flag_settings",
                              settings: flagSettings,
                            },
                          ]
                        : []),
                    ]
                  : turn.toolUseContext?.permissionLayers,
            },
          });
      let turnError = null;
      let wasAborted = false;
      let numTurns = turn.engineDeferredSlash ? 0 : 1;
      let stopReason = null;
      let turnMessages = [];
      let newsTracker = new UnsentMediaReporter(turn.toolUseContext?.agentId);
      let maxTurnsInfo;
      let assistantText = "";
      let isApiError = false;
      let apiErrorStatus = null;
      let apiErrorCode;
      let apiErrorOrigin;
      let apiError;
      let errorText = "";
      let structuredOutputs = [];
      let retractedToolUseIds = new Set();
      let firstTokenAt = null;
      let deferredTool;
      let compactOutputChars;
      let maxBudgetUsd = turn.toolUseContext?.options?.maxBudgetUsd;
      let sinceError = getInMemoryErrors().at(-1);
      let terminalReason;
      try {
        let nextChunk = await turnStream.next();
        while (!nextChunk.done) {
          let chunk = nextChunk.value;
          if (chunk.type === "user") {
            if (!turn.engineDeferredSlash) numTurns++;
            turnMessages.push(chunk);
            if (newsTracker.hasNews()) letGoOfUnsentMediaInPlace(turnMessages, turn.toolUseContext?.agentId);
            assistantText = "";
            isApiError = false;
            apiErrorStatus = null;
            apiErrorCode = undefined;
            apiErrorOrigin = undefined;
            apiError = undefined;
            errorText = "";
          } else if (chunk.type === "tombstone") {
            {
              let uuid = chunk.message?.uuid;
              let tombstoneIndex =
                uuid !== undefined
                  ? turnMessages.findLastIndex((candidate) => candidate.uuid === uuid)
                  : turnMessages.length - 1;
              if (tombstoneIndex >= 0) turnMessages.splice(tombstoneIndex, 1);
            }
            {
              let message = chunk.message;
              if (message?.type === "assistant") {
                let content = message.message.content;
                let structuredOutputIds = Array.isArray(content)
                  ? content.flatMap((contentBlock) =>
                      contentBlock.type === "tool_use" && contentBlock.name === STRUCTUREDOUTPUT
                        ? [contentBlock.id]
                        : [],
                    )
                  : [];
                if (structuredOutputIds.length > 0) {
                  for (let toolUseId of structuredOutputIds) retractedToolUseIds.add(toolUseId);
                  let shouldDropOutput = (output) =>
                    output.toolUseID === undefined || structuredOutputIds.includes(output.toolUseID);
                  structuredOutputs = structuredOutputs.filter((output) => !shouldDropOutput(output));
                }
              }
            }
            assistantText = "";
            isApiError = false;
            apiErrorStatus = null;
            apiErrorCode = undefined;
            apiErrorOrigin = undefined;
            apiError = undefined;
            errorText = "";
          } else if (chunk.type === "assistant") {
            firstTokenAt ??= performance.now();
            turnMessages.push(chunk);
            if (chunk.message.stop_reason != null) stopReason = chunk.message.stop_reason;
            isApiError = chunk.isApiErrorMessage === true;
            apiErrorStatus = chunk.apiErrorStatus ?? null;
            apiErrorCode = chunk.apiErrorCode;
            apiErrorOrigin = chunk[MESSAGE_MARK_SYMBOLS_2];
            apiError = isApiError ? chunk.apiError : undefined;
            let textBlock = lastAlias(chunk.message.content);
            let text = textBlock?.type === "text" ? textBlock.text : "";
            if (isApiError) {
              errorText = SYNTHETIC_MESSAGES.has(text) ? "" : stripMemoryTags(text);
              assistantText = "";
            } else assistantText = SYNTHETIC_MESSAGES.has(text) ? "" : stripMemoryTags(text);
          } else if (
            chunk.type === "stream_event" &&
            chunk.event.type === "message_delta" &&
            chunk.event.delta.stop_reason != null
          )
            stopReason = chunk.event.delta.stop_reason;
          else if (chunk.type === "attachment" && chunk.attachment.type === "structured_output") {
            if (
              !(chunk.attachment.toolUseID !== undefined
                ? retractedToolUseIds.has(chunk.attachment.toolUseID)
                : retractedToolUseIds.size > 0)
            )
              structuredOutputs = [
                ...structuredOutputs,
                {
                  toolUseID: chunk.attachment.toolUseID,
                  data: chunk.attachment.data,
                },
              ];
          } else if (chunk.type === "attachment" && chunk.attachment.type === "max_turns_reached")
            maxTurnsInfo = {
              turnCount: chunk.attachment.turnCount,
              maxTurns: chunk.attachment.maxTurns,
            };
          else if (chunk.type === "attachment" && chunk.attachment.type === "hook_deferred_tool")
            deferredTool = {
              id: chunk.attachment.toolUseID,
              name: chunk.attachment.toolName,
              input: chunk.attachment.toolInput,
            };
          if (pendingDenialFrames.length > 0) yield* drainDenialFrames();
          if (pendingLifecycleFrames.length > 0) yield* drainLifecycleFrames();
          compactOutputChars = reduceCompactResponseLength(compactOutputChars, chunk);
          if (chunk.type === "stream_event") {
            let thinkingUpdate = thinkingTokenEstimate(estimatedThinkingTokens, chunk.event);
            estimatedThinkingTokens = thinkingUpdate.estimate;
            if (thinkingUpdate.emission) {
              yield toSdkMessage({
                type: "system",
                subtype: "thinking_tokens",
                estimated_tokens: thinkingUpdate.emission.estimatedTokens,
                estimated_tokens_delta: thinkingUpdate.emission.estimatedTokensDelta,
              });
              if (isVerbose)
                logForDebugging("[engine] yield-twin system/thinking_tokens", VERBOSE_LOG_OPTIONS);
            }
          }
          if (isVerbose)
            logForDebugging(
              `[engine] yield ${chunk.type}/${"subtype" in chunk ? chunk.subtype : "-"}`,
              VERBOSE_LOG_OPTIONS,
            );
          if (chunk.type === "command_lifecycle")
            yield toSdkMessage(makeLifecycleFrame(chunk.uuid, chunk.state));
          else if (chunk.type === "notification") {
            let notification = chunk.notification;
            yield toSdkMessage({
              type: "system",
              subtype: "notification",
              key: notification.key,
              text: notification.text,
              priority: notification.priority,
              ...(notification.color !== undefined && {
                color: notification.color,
              }),
              ...(notification.timeoutMs !== undefined && {
                timeout_ms: notification.timeoutMs,
              }),
            });
          } else if (chunk.type === "sdk_status")
            yield toSdkMessage({
              type: "system",
              subtype: "status",
              status: chunk.status,
              ...(compactOutputChars !== undefined && {
                compact_output_chars: compactOutputChars,
              }),
              ...(chunk.metadata?.compactResult !== undefined && {
                compact_result: chunk.metadata.compactResult,
              }),
              ...(chunk.metadata?.compactError !== undefined && {
                compact_error: chunk.metadata.compactError,
              }),
            });
          else if (chunk.type === "stream_request_start")
            yield toSdkMessage({
              type: "system",
              subtype: "status",
              status: "requesting",
            });
          else if (chunk.type === "system" && chunk.subtype === "compact_boundary")
            yield toSdkMessage({
              type: "system",
              subtype: "compact_boundary",
              uuid: chunk.uuid,
              compact_metadata: toSDKCompactMetadata(chunk.compactMetadata),
              ...(chunk.logicalParentUuid !== undefined && {
                logical_parent_uuid: chunk.logicalParentUuid,
              }),
            });
          else if (chunk.type === "system" && chunk.subtype === "model_refusal_fallback")
            yield toSdkMessage({
              type: "system",
              subtype: "model_refusal_fallback",
              uuid: chunk.uuid,
              trigger: chunk.trigger,
              direction: chunk.direction,
              ...(chunk.scope !== undefined && {
                scope: chunk.scope,
              }),
              original_model: chunk.originalModel,
              fallback_model: chunk.fallbackModel,
              request_id: chunk.requestId,
              api_refusal_category: chunk.apiRefusalCategory ?? null,
              api_refusal_explanation: chunk.apiRefusalExplanation ?? null,
              ...(chunk.apiRefusalCyberVerification !== undefined && {
                api_refusal_cyber_verification: chunk.apiRefusalCyberVerification,
              }),
              ...(chunk.retractedMessageUuids !== undefined && {
                retracted_message_uuids: chunk.retractedMessageUuids,
              }),
              refused_user_message_uuid: chunk.refusedUserMessageUuid ?? null,
              content: chunk.content,
              ...(chunk.sawCyberRefusal && {
                saw_cyber_refusal: true,
              }),
              ...(chunk.provisional && {
                provisional: chunk.provisional,
              }),
            });
          else if (chunk.type === "system" && chunk.subtype === "model_refusal_no_fallback")
            yield toSdkMessage({
              type: "system",
              subtype: "model_refusal_no_fallback",
              uuid: chunk.uuid,
              original_model: chunk.originalModel,
              request_id: chunk.requestId,
              api_refusal_category: chunk.apiRefusalCategory ?? null,
              api_refusal_explanation: chunk.apiRefusalExplanation ?? null,
              refused_user_message_uuid: chunk.refusedUserMessageUuid ?? null,
              content: chunk.content,
            });
          else if (chunk.type === "system" && chunk.subtype === "model_fallback")
            yield toSdkMessage({
              type: "system",
              subtype: "model_fallback",
              uuid: chunk.uuid,
              trigger: chunk.trigger,
              original_model: chunk.originalModel,
              fallback_model: chunk.fallbackModel,
              content: chunk.content,
            });
          else if (chunk.type === "system" && chunk.subtype === "model_consent_fallback")
            yield toSdkMessage({
              ...toSDKModelConsentFallbackMessage(chunk),
              uuid: chunk.uuid,
            });
          else if (chunk.type === "tool_use_summary")
            yield toSdkMessage({
              ...createToolUseSummaryMessage(chunk),
              uuid: chunk.uuid,
            });
          else if (chunk.type === "system" && chunk.subtype === "read_divider");
          else yield toSdkMessage(chunk);
          if (chunk.type === "system" && chunk.subtype === "api_error")
            yield toSdkMessage({
              type: "system",
              subtype: "api_retry",
              attempt: chunk.retryAttempt,
              max_retries: chunk.maxRetries,
              retry_delay_ms: chunk.retryInMs,
              error_status: chunk.error.status ?? null,
              error: categorizeRetryableAPIError(chunk.error),
              ...(chunk.error.noResponse && {
                no_response: {
                  waited_ms: chunk.error.noResponse.waitedMs,
                  retry_wait_ms: chunk.error.noResponse.retryWaitMs,
                },
              }),
            });
          if (chunk.type === "attachment" && chunk.attachment.type === "relevant_memories") {
            let recalledMessage = memoryRecallMessage(chunk.attachment.memories);
            if (recalledMessage) {
              let { uuid, session_id: sessionId, ...messageWithoutIds } = recalledMessage;
              yield toSdkMessage(messageWithoutIds);
            }
          }
          if (
            chunk.type === "system" &&
            chunk.subtype === "local_command" &&
            typeof chunk.content === "string" &&
            (chunk.content.includes(`<${LOCAL_COMMAND_STDOUT}>`) ||
              chunk.content.includes(`<${LOCAL_COMMAND_STDERR}>`))
          ) {
            let localCommandMessage = localCommandOutputToSDKAssistantMessage(
              chunk.content,
              chunk.uuid,
              chunk.timestamp,
              chunk.contextUsage,
              chunk.commandRun,
              chunk.usageReport,
              chunk.commandOutcome,
            );
            if (localCommandMessage) {
              yield toSdkMessage(localCommandMessage);
              logForDebugging("[engine] yield-twin assistant (local_command)", VERBOSE_LOG_OPTIONS);
            }
          }
          if (
            chunk.type === "progress" &&
            (chunk.data.type === "bash_progress" || chunk.data.type === "powershell_progress")
          ) {
            yield toSdkMessage({
              type: "tool_progress",
              tool_use_id: chunk.toolUseID,
              tool_name: chunk.data.type === "bash_progress" ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME,
              parent_tool_use_id: chunk.parentToolUseID || null,
              elapsed_time_seconds: chunk.data.elapsedTimeSeconds,
              task_id: chunk.data.taskId,
            });
            logForDebugging("[engine] yield-twin tool_progress", VERBOSE_LOG_OPTIONS);
          }
          if (chunk.type === "progress" && chunk.data.type === "tool_heartbeat") {
            yield toSdkMessage({
              type: "tool_progress",
              tool_use_id: chunk.toolUseID,
              tool_name: chunk.data.toolName,
              parent_tool_use_id: chunk.parentToolUseID || null,
              elapsed_time_seconds: chunk.data.elapsedTimeSeconds,
              heartbeat: true,
            });
            logForDebugging("[engine] yield-twin tool_progress heartbeat", VERBOSE_LOG_OPTIONS);
          }
          if (chunk.type === "progress" && chunk.data.type === "agent_api_retry") {
            yield toSdkMessage({
              type: "tool_progress",
              tool_use_id: chunk.toolUseID,
              tool_name: AGENT,
              parent_tool_use_id: chunk.parentToolUseID || null,
              elapsed_time_seconds: 0,
              subagent_type: chunk.data.agentType,
              ...(chunk.data.resolved !== true && {
                subagent_retry: {
                  agent_id: chunk.data.agentId,
                  attempt: chunk.data.attempt,
                  max_retries: chunk.data.maxRetries,
                  retry_delay_ms: chunk.data.retryDelayMs,
                  error_status: chunk.data.errorStatus ?? null,
                  error_category: chunk.data.errorCategory,
                },
              }),
            });
            logForDebugging("[engine] yield-twin tool_progress subagent_retry", VERBOSE_LOG_OPTIONS);
          }
          for (let notificationMessage of drainNotificationsForSession(sessionId)) {
            logForDebugging(
              `[engine] yield sdk-queue system/${notificationMessage.subtype}`,
              VERBOSE_LOG_OPTIONS,
            );
            yield toSdkMessage(notificationMessage);
          }
          if (
            maxTurnsInfo === undefined &&
            chunk.type !== "sdk_status" &&
            chunk.type !== "compact_progress" &&
            chunk.type !== "stream_mode" &&
            chunk.type !== "response_length" &&
            hasReachedBudget(maxBudgetUsd)
          ) {
            terminalReason = "budget_exhausted";
            break;
          }
          nextChunk = await turnStream.next();
        }
        logFeatureOk("shoji_engine");
        if (nextChunk.done) terminalReason = nextChunk.value ? nextChunk.value.reason : undefined;
      } catch (error) {
        turnError = errorMessage(error);
        reportTurnThrow(error);
      } finally {
        wasAborted = abortController.signal.aborted;
        await turnStream.return(undefined).catch(() => {});
        signal?.removeEventListener("abort", onParentAbort);
        abortController.signal.removeEventListener("abort", onRefusalFallbackAbort);
        let aggregateUsage = aggregateModelUsage();
        logForDebugging(
          `[engine] turn ${turnCount} end (turns=${numTurns} usage in=${aggregateUsage.input_tokens} out=${aggregateUsage.output_tokens} cost=$${getTotalCostUSD().toFixed(4)} api=${getTotalAPIDuration()}ms stop=${stopReason} resultLen=${assistantText.length})`,
        );
      }
      let message = turnMessages.findLast((turnMessage) => !isHarnessCompanionMessage(turnMessage)) ??
        turnMessages.at(-1) ?? {
          type: "user",
          message: intent.message,
        };
      let isAborted = sdkResultVerdict
        ? turn.engineDeferredSlash === undefined
        : isAbortedTerminalReason(terminalReason);
      let stopNotice =
        unwrapAbortReason(abortController.signal.reason) === "permission-stop"
          ? (getNoServerCheckStoppedNotice() ?? buildUserUnavailableNotice(gatewayDisplayName()))
          : undefined;
      let diagnostics =
        turnError !== null
          ? [turnError]
          : sdkResultVerdict && stopNotice !== undefined
            ? [formatResultDiagnostic(message, stopReason), stopNotice]
            : isAborted && deferredTool === undefined && !isResultSuccessful(message, stopReason)
              ? buildEmptyResultDiagnostics(message, stopReason, sinceError)
              : null;
      let isRefusalWithOutput = stopReason === "refusal" && structuredOutputs.length > 0;
      let structuredOutput = isRefusalWithOutput ? undefined : structuredOutputs.at(-1)?.data;
      try {
        if (
          isApiError &&
          isRecoverableTrailingServerError({
            trailing: message,
            preceding: turnMessages.at(-2),
            terminalReason,
            retractionExhausted: structuredOutputs.length === 0 && retractedToolUseIds.size > 0,
          })
        ) {
          isApiError = false;
          apiErrorStatus = null;
          apiErrorCode = undefined;
          apiErrorOrigin = undefined;
          apiError = undefined;
          errorText = "";
          stopReason = "tool_use";
          logEvent("tengu_trailing_api_error_notice_skipped", {
            engine: lit("session_engine"),
            has_structured_output: structuredOutputs.length > 0,
          });
        }
      } catch (error) {
        logError(error);
      }
      let resultText = isApiError ? errorText : assistantText;
      if (resultText === "" && structuredOutput !== undefined) resultText = JSON.stringify(structuredOutput);
      let resultCommon = {
        duration_api_ms: getTotalAPIDuration(),
        stop_reason: stopReason,
        session_id: sessionId,
        total_cost_usd: getTotalCostUSD(),
        usage: aggregateModelUsage(),
        modelUsage: getModelUsage(),
        permission_denials: permissionDenials,
        terminal_reason: terminalReason,
        fast_mode_state: resolveMaybeFn(fastModeState),
        fast_mode_disabled_reason: resolveMaybeFn(fastModeDisabledReason),
        origin: intent.origin,
        subagent_stats: buildFileHistorySnapshotChain(turn.toolUseContext?.session),
        safety_stops: getSafetyStops(),
      };
      let resultMessage =
        terminalReason === "budget_exhausted"
          ? {
              ...buildResultMessage({
                startedAt: startTime,
                common: {
                  ...resultCommon,
                  is_error: true,
                  num_turns: numTurns,
                },
                variant: {
                  subtype: "error_max_budget_usd",
                  errors: [maxBudgetReachedMessage(maxBudgetUsd)],
                  user_message_uuid: undefined,
                },
              }),
              ...resultExtras,
            }
          : turnError === null && deferredTool === undefined && maxTurnsInfo
            ? {
                ...buildResultMessage({
                  startedAt: startTime,
                  common: {
                    ...resultCommon,
                    is_error: true,
                    num_turns: maxTurnsInfo.turnCount,
                  },
                  variant: {
                    subtype: "error_max_turns",
                    errors: [`Reached maximum number of turns (${maxTurnsInfo.maxTurns})`],
                    user_message_uuid: undefined,
                  },
                }),
                ...resultExtras,
              }
            : diagnostics !== null
              ? {
                  ...buildResultMessage({
                    startedAt: startTime,
                    common: {
                      ...resultCommon,
                      is_error: true,
                      num_turns: numTurns,
                    },
                    variant: {
                      subtype: "error_during_execution",
                      errors: diagnostics,
                      user_message_uuid: undefined,
                    },
                  }),
                  ...resultExtras,
                }
              : {
                  ...buildResultMessage({
                    startedAt: startTime,
                    common: {
                      ...resultCommon,
                      ...(deferredTool !== undefined && {
                        stop_reason: "tool_deferred",
                      }),
                      is_error: isApiError || isRefusalWithOutput,
                      num_turns: numTurns,
                    },
                    variant: {
                      subtype: "success",
                      api_error_status: apiErrorStatus,
                      ...(apiErrorCode !== undefined && {
                        api_error_code: apiErrorCode,
                      }),
                      ...(apiErrorOrigin !== undefined && {
                        api_error_origin: apiErrorOrigin,
                      }),
                      ...(apiError !== undefined && {
                        api_error: apiError,
                      }),
                      result: resultText,
                      structured_output: structuredOutput,
                      ttft_ms:
                        !isApiError && firstTokenAt !== null
                          ? Math.max(0, Math.round(firstTokenAt - startTime))
                          : undefined,
                      deferred_tool_use: deferredTool,
                    },
                  }),
                  ...resultExtras,
                };
      if (isRefusalWithOutput && resultMessage.subtype === "success")
        try {
          logEvent("tengu_structured_output_refusal_dropped", {
            api_error_latched: isApiError,
          });
        } catch (error) {
          logError(error);
        }
      let lifecycleFrame;
      if (intent.uuid !== undefined)
        lifecycleFrame = makeLifecycleFrame(
          intent.uuid,
          turnError !== null ? "cancelled" : turnOutcomeLabel(terminalReason, wasAborted),
        );
      turnIntents.shift();
      if (sdkResultVerdict) setAutoModeUnavailableStopNotice(stopNotice);
      else if (stopNotice !== undefined) yield toSdkMessage(createSystemMessage(stopNotice, "warning"));
      yield* drainSideChannels();
      yield* emitResult(resultMessage, lifecycleFrame);
    }
    while (pendingResultFrames.length > 0 && !currentTurnController?.signal.aborted && hasWaitableTasks()) {
      yield* drainSideChannels();
      await sleep(100);
    }
    if (
      pendingResultFrames.length > 0 &&
      currentTurnController?.signal.aborted &&
      lastTurn?.toolUseContext?.taskRegistry
    ) {
      let { taskRegistry, setAppState, storageV5 } = lastTurn.toolUseContext;
      stopAllRunningTasks({
        taskRegistry,
        setAppState,
        storageV5,
      });
    }
    await settlePendingPrLinks();
    yield* drainSideChannels();
    yield* drainResultFrames();
  }
  function abandonPendingWork() {
    try {
      closeQueue();
      for (let { intent, status } of turnIntents.splice(0))
        if (intent.uuid !== undefined)
          reportCommandLifecycle(intent.uuid, status === "armed" ? "cancelled" : "discarded");
    } catch (error) {
      logError(
        Error("[engine] abandonment sweep failed", {
          cause: error,
        }),
      );
    }
  }
  let hasStarted = false;
  async function* messagesGenerator() {
    hasStarted = true;
    try {
      yield* driveTurns();
    } finally {
      abandonPendingWork();
    }
  }
  function handleControlIntent(intent) {
    switch (intent.type) {
      case "turn":
        if (isClosed) {
          logForDebugging("[engine] dropped turn intent received after close()", {
            level: "warn",
          });
          break;
        }
        turnIntents.push({
          intent,
          status: "queued",
        });
        if (intent.uuid !== undefined) pendingLifecycleFrames.push(makeLifecycleFrame(intent.uuid, "queued"));
        intentQueue.enqueue(intent);
        break;
      case "interrupt": {
        currentTurnController?.abort(
          intent.reason !== undefined ? new DOMException(intent.reason, "AbortError") : undefined,
        );
        if (intent.scope !== "turn-cancel") {
          let taskRegistry = lastTurn?.toolUseContext?.taskRegistry;
          let killedSubscriptions = 0;
          if (lastTurn?.toolUseContext !== undefined && taskRegistry !== undefined) {
            killedSubscriptions = killAutoReactSubscriptions(taskRegistry, {
              durable: false,
            });
            let { setAppState } = lastTurn.toolUseContext;
            stopObserverAgents({
              taskRegistry,
              setAppState,
            });
          }
          let drainedNotifications = drainQueuedTaskNotifications(getProcessQueue(), {
            leaveArtifactRooms: true,
          });
          artifactWatchStopNotice(killedSubscriptions, drainedNotifications);
        }
        break;
      }
      case "set_model":
        modelOverride = intent.model ?? null;
        shouldReemitInit = true;
        logForDebugging(`[engine] send set_model model=${intent.model}`);
        break;
      case "set_permission_mode": {
        let permissionMode = parsePermissionMode(intent.mode);
        if (permissionMode === undefined) {
          logForDebugging("[engine] set_permission_mode rejected \u2014 unrecognized mode");
          break;
        }
        if (permissionMode === "bypassPermissions" && isBypassPermissionsModeDisabled()) {
          logForDebugging(
            "[engine] set_permission_mode:bypassPermissions rejected \u2014 disabled by settings",
          );
          break;
        }
        if (permissionMode === "auto" && !isAutoModeGateEnabled()) {
          logForDebugging("[engine] set_permission_mode:auto rejected \u2014 gate not enabled");
          break;
        }
        permissionModeOverride = permissionMode;
        shouldReemitInit = true;
        break;
      }
      case "set_max_thinking_tokens":
        maxThinkingTokens = intent.max_thinking_tokens;
        logForDebugging(`[engine] send set_max_thinking_tokens max=${intent.max_thinking_tokens}`);
        break;
      case "apply_flag_settings":
        flagSettings = {
          ...(flagSettings ?? {}),
          ...intent.settings,
        };
        logForDebugging(`[engine] send apply_flag_settings keys=${Object.keys(intent.settings).join(",")}`);
        break;
      case "seed_read_state":
        remoteFileState.set(intent.path, intent.seed);
        logForDebugging(`[engine] send seed_read_state path=${intent.path}`);
        break;
    }
  }
  function closeQueue() {
    isClosed = true;
    intentQueue.done();
  }
  let engineIterator = messagesGenerator();
  let originalReturn = engineIterator.return.bind(engineIterator);
  let originalThrow = engineIterator.throw.bind(engineIterator);
  function onIteratorClosed() {
    closeQueue();
    if (!hasStarted) abandonPendingWork();
  }
  engineIterator.return = (returnValue) => {
    onIteratorClosed();
    return originalReturn(returnValue);
  };
  engineIterator.throw = (thrownError) => {
    onIteratorClosed();
    return originalThrow(thrownError);
  };
  return Object.assign(engineIterator, {
    interrupt: async (reason, interruptOptions) => {
      handleControlIntent({
        type: "interrupt",
        reason,
        scope: interruptOptions?.scope,
      });
      return {
        still_queued: turnIntents.flatMap(({ intent, status }) =>
          status === "queued" && intent.uuid !== undefined ? [intent.uuid] : [],
        ),
      };
    },
    setModel: async (model) =>
      handleControlIntent({
        type: "set_model",
        model,
      }),
    setPermissionMode: async (mode) =>
      handleControlIntent({
        type: "set_permission_mode",
        mode,
      }),
    setMaxThinkingTokens: async (maxThinkingTokens) =>
      handleControlIntent({
        type: "set_max_thinking_tokens",
        max_thinking_tokens: maxThinkingTokens,
      }),
    applyFlagSettings: (settings) => {
      handleControlIntent({
        type: "apply_flag_settings",
        settings,
      });
      return Promise.resolve();
    },
    seedReadState: async (path, timestamp, content) => {
      try {
        let expandedPath = expandPath(path);
        if (content !== undefined) {
          if (content.length <= 10485760)
            handleControlIntent({
              type: "seed_read_state",
              path: expandedPath,
              seed: {
                content: stripBomAndCarriageReturn(content),
                timestamp,
                offset: undefined,
                limit: undefined,
                contentNotInModelContext: true,
              },
            });
          return;
        }
        let fileStats = await stat(expandedPath);
        if (fileStats.size > 10485760) return;
        let floored = Math.floor(fileStats.mtimeMs);
        if (floored <= timestamp) {
          let file = await readFile(expandedPath, "utf-8");
          let content = stripBomAndCarriageReturn(file);
          handleControlIntent({
            type: "seed_read_state",
            path: expandedPath,
            seed: {
              content,
              timestamp: floored,
              offset: undefined,
              limit: undefined,
              contentNotInModelContext: true,
            },
          });
        }
      } catch {}
    },
    turnCount: () => turnCount,
    initializationResult: () => Promise.resolve(initMessageFields),
    accountInfo: () => Promise.resolve(initMessageFields.account),
    claudeAuthenticate: async (options) => {
      if (!authDelegate) throw Error("claudeAuthenticate: no authDelegate wired");
      return authDelegate.authenticate(options);
    },
    claudeOAuthCallback: async (code, state) => {
      if (!authDelegate) throw Error("claudeOAuthCallback: no authDelegate wired");
      return authDelegate.oauthCallback(code, state);
    },
    claudeOAuthWaitForCompletion: async () => {
      if (!authDelegate) throw Error("claudeOAuthWaitForCompletion: no authDelegate wired");
      return authDelegate.oauthWaitForCompletion();
    },
    supportedModels: () =>
      Promise.resolve(typeof models === "function" ? models() : initMessageFields.models),
    supportedCommands: () =>
      Promise.resolve(typeof commands === "function" ? commands() : initMessageFields.commands),
    supportedAgents: () =>
      Promise.resolve(typeof agents === "function" ? agents() : initMessageFields.agents),
    mcpServerStatus: () => Promise.resolve(mcpServers()),
    reconnectMcpServer: async (serverName) => {
      if (!mcpDelegate) throw Error(`reconnectMcpServer: no mcpDelegate wired (server: ${serverName})`);
      await mcpDelegate.reconnect(serverName);
    },
    toggleMcpServer: async (serverName, enabled) => {
      if (!mcpDelegate) throw Error(`toggleMcpServer: no mcpDelegate wired (server: ${serverName})`);
      await mcpDelegate.toggle(serverName, enabled);
    },
    setMcpServers: async (servers) => {
      if (!mcpDelegate)
        throw Error(`setMcpServers: no mcpDelegate wired (${Object.keys(servers).length} server(s))`);
      return mcpDelegate.setServers(servers);
    },
    reloadPlugins: async () => {
      if (!mcpDelegate) throw Error("reloadPlugins: no mcpDelegate wired");
      return mcpDelegate.reloadPlugins();
    },
    mcpAuthenticate: async (serverName, options, extra) => {
      if (!mcpAuthDelegate) throw Error(`mcpAuthenticate: no mcpAuthDelegate wired (server: ${serverName})`);
      return mcpAuthDelegate.authenticate(serverName, options, extra);
    },
    mcpClearAuth: async (serverName) => {
      if (!mcpAuthDelegate) throw Error(`mcpClearAuth: no mcpAuthDelegate wired (server: ${serverName})`);
      return mcpAuthDelegate.clearAuth(serverName);
    },
    mcpSubmitOAuthCallbackUrl: async (serverName, callbackUrl) => {
      if (!mcpAuthDelegate)
        throw Error(`mcpSubmitOAuthCallbackUrl: no mcpAuthDelegate wired (server: ${serverName})`);
      return mcpAuthDelegate.submitOAuthCallbackUrl(serverName, callbackUrl);
    },
    getContextUsage: async (options) => {
      if (lastTurn === null) throw Error("getContextUsage: no turn received yet");
      let { messages, toolUseContext } = lastTurn;
      return await collectContextData({
        session: toolUseContext.session,
        messages,
        getAppState: toolUseContext.getAppState,
        getMcp: toolUseContext.getMcp,
        storageV5: toolUseContext.storageV5,
        credentials: toolUseContext.credentials,
        options: {
          mainLoopModel: toolUseContext.options.mainLoopModel,
          tools: toolUseContext.options.tools,
          agentDefinitions: toolUseContext.options.agentDefinitions,
          customSystemPrompt: toolUseContext.options.customSystemPrompt,
          appendSystemPrompt: toolUseContext.options.appendSystemPrompt,
          systemPromptSnapshot: toolUseContext.options.systemPromptSnapshot,
          excludeDynamicSections,
          mcpClients: toolUseContext.options.mcpClients,
        },
        detail: options?.detail,
      });
    },
    stopTask: async (taskId) => {
      if (lastTurn === null) throw Error("stopTask: no turn received yet");
      let { taskRegistry, setAppState, getAppState, session, storageV5 } = lastTurn.toolUseContext;
      await stopTask(taskId, {
        taskRegistry,
        setAppState,
        session,
        getAppState,
        source: "client",
        storageV5,
      });
    },
    backgroundTasks: async (toolUseId) => {
      if (isBackgroundTasksOff()) {
        logFeatureBad("task_local_shell_background_all", "disabled");
        throw Error("Background tasks are disabled in this session.");
      }
      if (lastTurn === null) return !toolUseId;
      let { taskRegistry } = lastTurn.toolUseContext;
      if (toolUseId) return backgroundTaskByToolUseId(toolUseId, taskRegistry);
      backgroundAll(taskRegistry);
      return true;
    },
    getSettings: () => Promise.resolve(settings),
    generateSessionTitle: async (prompt, options) => {
      if (options?.persist) shouldPersistTitle = true;
      let title = await requestAndPickSessionTitle(prompt, getAbortSignal(), options?.credentials);
      if (title && options?.persist)
        try {
          saveAiGeneratedTitle(getSessionId(), title, lastTurn?.toolUseContext.storageV5);
        } catch (error) {
          if (isFsInaccessible(error)) logForDebugging(`saveAiGeneratedTitle failed: ${error}`);
          else logError(error);
        }
      return title;
    },
    requestSessionTitle: (text, options) => requestSessionTitle(text, getAbortSignal(), options?.credentials),
    messageRated: async ({ messageUuid, sentiment, surface = "tool_use", cleared = false }) => {
      if (isPolicyAllowed("allow_product_feedback"))
        logEvent("tengu_message_rated", {
          message_uuid: sanitizeMarkName(messageUuid),
          sentiment: fromEnum(sentiment),
          surface: fromEnum(surface),
          cleared,
        });
    },
    askSideQuestion: async (question, options) => {
      let { getLastCacheSafeParams } = await import("../utils/forkedAgent.js");
      let lastCacheSafeParams = getLastCacheSafeParams();
      if (lastCacheSafeParams === null) return null;
      let { runSideQuestion } = await import("../utils/sideQuestion.js");
      let { createAbortController } = await import("../utils/abortController.js");
      let answer = await runSideQuestion({
        question,
        cacheSafeParams: {
          ...lastCacheSafeParams,
          toolUseContext: {
            ...lastCacheSafeParams.toolUseContext,
            abortController: createAbortController(),
          },
        },
        threadHistory: false,
        ...(options?.history?.length && {
          history: options.history.map((turn) => ({
            question: turn.question,
            response: turn.response,
            ...(turn.fallback_notice && {
              fallbackNotice: turn.fallback_notice,
            }),
          })),
        }),
      });
      return answer.response === null
        ? null
        : {
            response: answer.response,
            synthetic: answer.synthetic,
            ...(answer.refusalFallback && {
              refusalFallback: answer.refusalFallback,
            }),
          };
    },
    rewindFiles: async (messageUuid, options) => {
      if (lastTurn === null)
        return {
          canRewind: false,
          error: "rewindFiles: no turn received yet",
        };
      let { fileHistoryEnabled, fileHistoryCanRestore, fileHistoryGetDiffStats, fileHistoryRewind } =
        await import("../utils/fileHistory.js");
      let appState = lastTurn.toolUseContext.getAppState();
      if (!fileHistoryEnabled())
        return {
          canRewind: false,
          error: "File rewinding is not enabled.",
        };
      if (!fileHistoryCanRestore(appState.fileHistory, messageUuid))
        return {
          canRewind: false,
          error: "No file checkpoint found for this message.",
        };
      if (options?.dryRun ?? false) {
        let diffStats = await fileHistoryGetDiffStats(appState.fileHistory, messageUuid);
        return {
          canRewind: true,
          filesChanged: diffStats?.filesChanged,
          insertions: diffStats?.insertions,
          deletions: diffStats?.deletions,
        };
      }
      let rewindResult;
      try {
        rewindResult = await fileHistoryRewind(() => appState.fileHistory, messageUuid);
      } catch (error) {
        return {
          canRewind: false,
          error: `Failed to rewind: ${errorMessage(error)}`,
        };
      }
      return {
        canRewind: true,
        skippedLinks: rewindResult?.skippedLinks,
      };
    },
    submitFeedback: async (description, options) => {
      if (options?.draft_id == null) {
        if (lastTurn === null)
          return {
            feedback_id: null,
            unavailable_reason:
              (feedbackMode().kind === "disabled" ? feedbackUnavailableReason() : null) ??
              "no turn received yet",
          };
        if (options?.save_locally === true)
          return submitHeadlessFeedback({
            messages: lastTurn.messages,
            description,
            surface: options?.surface ?? "sdk",
            storageV5: lastTurn.toolUseContext.storageV5,
            host: lastTurn.toolUseContext.session?.host,
          });
      }
      let unavailableReason = feedbackUnavailableReason();
      if (unavailableReason)
        return {
          feedback_id: null,
          unavailable_reason: unavailableReason,
        };
      if (options?.draft_id != null) {
        let { submitDraftFromRequest } = await import("../utils/drafts.js");
        return submitDraftFromRequest({
          draftId: options.draft_id,
          description,
          type: options.type,
          title: options.title,
          area: options.area,
          attachTranscript: options.attach_transcript,
          surface: options.surface,
          messages: lastTurn?.messages ?? [],
          storageV5: lastTurn?.toolUseContext.storageV5,
          host: lastTurn?.toolUseContext.session?.host,
          credentials: lastTurn?.toolUseContext.credentials,
        });
      }
      if (lastTurn === null)
        return {
          feedback_id: null,
          unavailable_reason: "no turn received yet",
        };
      let submission = await postFeedbackSubmission({
        messages: lastTurn.messages,
        description,
        surface: options?.surface ?? "sdk",
        storageV5: lastTurn.toolUseContext.storageV5,
        host: lastTurn.toolUseContext.session?.host,
        credentials: lastTurn.toolUseContext.credentials,
      });
      return submission.success
        ? {
            feedback_id: submission.feedbackId,
          }
        : {
            feedback_id: null,
            is_zdr_org: submission.isZdrOrg,
            failure_reason: submission.failureReason,
            status_code: submission.statusCode,
            unavailable_reason: orgFeedbackRefusalMessage(submission),
          };
    },
    submitSurveyFeedback: async (request) => {
      if (lastTurn === null)
        return {
          feedback_id: null,
          unavailable_reason: "no turn received yet",
        };
      let { submitSurveyFeedbackForSdk } = await import("../services/feedback/submitSurveyFeedback.js");
      return submitSurveyFeedbackForSdk({
        request,
        messages: lastTurn.messages,
        storageV5: lastTurn.toolUseContext.storageV5,
        host: lastTurn.toolUseContext.session?.host,
        credentials: lastTurn.toolUseContext.credentials,
      });
    },
    streamInput: async (input) => {
      try {
        for await (let turnInput of input) {
          let { type, ...rest } = turnInput;
          handleControlIntent({
            type: "turn",
            ...rest,
          });
        }
      } finally {
        closeQueue();
      }
    },
    readFile: async (path, options) => {
      if (lastTurn === null) return null;
      try {
        return await readFileForRemote(
          path,
          options?.maxBytes,
          lastTurn.toolUseContext.getAppState().toolPermissionContext,
          {
            encoding: options?.encoding,
          },
        );
      } catch {
        return null;
      }
    },
    launchUltrareview: async (target, options) => {
      if (lastTurn === null)
        return {
          status: "error",
          message: "launchUltrareview: no turn received yet",
        };
      let { runUltrareviewHeadless } = await import("../commands/review/reviewRemote.lazy.js");
      let { createAbortController } = await import("../utils/abortController.js");
      let {
        taskRegistry,
        isUltrareviewOverageConfirmed,
        markUltrareviewOverageConfirmed,
        storageV5,
        credentials,
      } = lastTurn.toolUseContext;
      return await runUltrareviewHeadless(target, {
        confirm: options?.confirm ?? false,
        confirmsBeforeLaunch: true,
        overageConfirmed: isUltrareviewOverageConfirmed(),
        markOverageConfirmed: markUltrareviewOverageConfirmed,
        context: {
          abortController: createAbortController(),
          taskRegistry,
          storageV5,
          credentials,
        },
      });
    },
    close: closeQueue,
  });
}
//@ chunk-pwdsqzsj.js:89897-90497 placement
function aggregateModelUsage() {
  let values = Object.values(getModelUsage());
  let sumField = (pick) => values.reduce((acc, usage) => acc + pick(usage), 0);
  return {
    ...EMPTY_USAGE,
    input_tokens: sumField((usage) => usage.inputTokens),
    output_tokens: sumField((usage) => usage.outputTokens),
    output_tokens_details: {
      thinking_tokens: sumField((usage) => usage.thinkingTokens ?? 0),
    },
    cache_read_input_tokens: sumField((usage) => usage.cacheReadInputTokens),
    cache_creation_input_tokens: sumField((usage) => usage.cacheCreationInputTokens),
    cache_creation: {
      ephemeral_5m_input_tokens: sumField((usage) => usage.cacheCreationEphemeral5mInputTokens ?? 0),
      ephemeral_1h_input_tokens: sumField((usage) => usage.cacheCreationEphemeral1hInputTokens ?? 0),
    },
    server_tool_use: {
      ...EMPTY_USAGE.server_tool_use,
      web_search_requests: sumField((usage) => usage.webSearchRequests),
    },
  };
}
//@ chunk-pwdsqzsj.js:90497-90680 placement
function isHarnessCompanionMessage(message) {
  if (isHarnessMetaMessage(message)) return true;
  if (message.type !== "user" || message.turnCompanion !== true) return false;
  let content = message.message.content;
  return !(
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((block) => block.type === "tool_result")
  );
}
export { createQueryEngine, cancelScopeFor };
