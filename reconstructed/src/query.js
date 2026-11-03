/**
 * query.ts
 *
 * 查询主循环：query() 入口与 queryLoop 每轮的请求→流式→工具执行→恢复/压缩→下一轮状态机，以及中止、缺失 tool_result 补齐、模型回退提示、轮首队列折叠等辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/query.ts
 * pieces: chunk-32qjrk8h.js (1), chunk-4163ksv9.js (6), chunk-ha3km179.js (27)
 * attribution: placement 7, sole-consumer 11, fingerprint 2, layout 13, callgraph-witnessed 1
 */
import { HostScoped } from "./utils/hostScoped.js";
import {
  pickFallbackModel,
  canonicalModelKey,
  findFirstResolvableStage,
  logSkippedChainStages,
  getUserDialogTimeoutMs,
  canShowRefusalDialog,
  Rci,
  RXo,
  isRefusalFallbackEnabled,
  getFallbackDialogSkipReason,
  normalizeRefusalCategory,
  requestRefusalFallbackChoice,
  getThirdPartyFallbackHint,
  getSwitchModelsOnFlagSetting,
} from "./services/api/refusalFallback.js";
import {
  createUserMessage,
  isRealUserPromptMessage,
  createUserInterruptionMessage,
  getAssistantMessageText,
  isAbandonedOrUnsignedThinkingMessage,
  isThinkingBlock,
  hasThinkingSignature,
  isForeignModelMessage,
  createApiErrorMessage,
  createSystemMessage,
  countUserPromptsAndRewrite,
  resolveReminderFold_2,
  normalizeMessagesForAPI,
  xzo,
  normalizeMessages,
  isNotEmptyMessage,
  createInformationalSystemMessage,
  isSafetyMonitorBlockedMessage,
  isToolResultMessage,
  STREAM_CUT_REWRITE,
  STREAM_CUT_RESUME,
  MALFORMED_TOOL_CALL_RETRY,
  fPn,
  isTransientApiError,
  createToolUseSummaryMessage,
} from "./utils/messages.js";
import { getOwnJobShortId } from "./services/daemon/jobState.js";
import {
  unwrapAbortReason,
  isSilentAbortReason,
  shutdownInterruptStamp,
  serverFallbackTombstoneAbortReason,
  userAbortReason,
  createRecoveryAbortController,
} from "./utils/abortController.js";
import {
  getLastCancelledAPIMessageId,
  getMainThreadAgentType,
  getIsNonInteractiveSession,
  getSystemPromptSectionEpoch,
  getStickyBetas,
  getMainLoopModelOverride,
  isSdkDialogHostActive,
  onInteraction,
  flushInteractionTime,
  setMainLoopModelOverride,
  getSdkDialogCapabilitySource,
  markRefusalFallbackHeaderArmed,
  latchRefusalFallbackModel,
  hasRefusalFallbackOccurred,
  markRefusalFallbackOccurred,
  getSessionCronTasks,
} from "./bootstrap/state.js";
import { logEvent } from "./services/analytics/index.js";
import { fromEnum, lit, fromEnumOpt } from "./services/analytics/safeMetadata.js";
import { executePostToolBatchHooks, executeStopFailureHooks, hasHookForEvent } from "./utils/hooks.js";
import {
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
  getEffortValue,
  getEffortLayerOverride,
  getThinkingConfig,
  getEffortSetAsideByHold,
  applyContextLayers,
} from "./utils/permissions/toolPermissionContext.js";
import { logForDebugging, createAttachmentMessage_2, logAntError } from "./utils/debug.js";
import { vAn } from "./utils/abortErrors.js";
import { cleanupComputerUseAfterTurn } from "./utils/computerUse/cleanup.js";
import { handleStopHooks, maybeStartPrecomputeAfterTurn, call } from "./query/stopHooks.js";
import { isAbortError, toError, withTelemetryMessage, errorMessage } from "./utils/errors.js";
import { logError } from "./utils/log.js";
import { classifyQuerySource, isAutoModeQuerySource } from "./services/api/requestHeaders.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  latchConversationAtis,
} from "./services/analytics/growthbook.js";
import { Bn } from "./utils/model/modelIds.js";
import {
  shouldResumeThinking,
  isRetryableApiErrorMessage,
  resumeTruncatedThinking,
} from "./services/api/thinkingResumption.js";
import { totalTokensOf, getTokenCountFromUsage } from "./utils/messages/usageAndStopReason.js";
import { WS, jS, queryCheckpoint, ymn } from "./utils/queryProfiler.js";
import {
  observeRunningTurn,
  buildArmedObserverAttachment,
  wrapArtifactPatchTurn,
  wrapCallModelWithAttachments,
  applyToolExclusionEdit,
  va,
  routeSubmissions,
} from "./query/presenceCheck.js";
import { awaitArtifactRosterSafe } from "./services/artifacts/rosterWait.js";
import { isObserverAgentsEnabled, ensureMainObserver } from "./services/agentObserver/agentObserver.js";
import {
  discardPrecompute,
  manuallyExtractSessionMemory,
  mJn,
  applyPrecomputedCompact,
  shouldArmPrecompute,
  latchArmGate,
  armPrecomputedCompact,
} from "./services/compact/precomputedCompact.js";
import {
  updateGoalAfterTurn,
  createQueueDelivery,
  abortedTurnRows,
  notifyCompactFailure,
  notifyStopHookCap,
  nudgeAfterToolEndTurn,
  applyDisallowedTools,
} from "./query/turnEndReasons.js";
import {
  isAbnormalTerminalReason,
  isErrorTerminalReason,
  terminalReasonTag,
} from "./entrypoints/sdk/coreSchemas.js";
import {
  dropPutBackMessages,
  mu,
  withTurnMessages,
  autoModeTurnAttachments,
  checkAutoModeRequested,
  au,
  du,
  lu,
} from "./query/autoModeContext.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "./services/analytics/featureTelemetry.js";
import {
  reportTurnEnd,
  INITIAL_LOOP_RECOVERY_STATE,
  announceOutputLimitRecovery,
  fallbackWindowNotice,
  resetStreamingToolExecutor,
  IMAGE_ERROR_TOOL_CANCEL_TEXT,
  turnErrorToolCancelText,
  completedToolUseIds,
  newFallbackRecord,
  chainFallbackRecord,
  describeFallbackWindow,
  SAFETY_BLOCK_TOOL_CANCEL_TEXT,
  reportOutputLimitRecovery,
  Kr,
  shouldNudgeOutputLimitResume,
  recoverExhaustedOutput,
  INITIAL_RECOVERY_STATE,
} from "./query/outputLimitRecovery.js";
import { V2e, getCurrentCallId } from "./services/mcp/ccrTurnId.js";
import { iCt, Kv, setPollEventDeliveryGuard } from "./utils/pollEvents.js";
import {
  endsWithMachineTurn,
  isPersonQueuedInput,
  hasAuthoritativePollEvents,
  iCo,
} from "./utils/messages/messageSource.js";
import {
  buildContextRouting,
  rebuildRoutingAfterCompaction,
  reannounceAfterCompact,
  ir,
  refreshRoutedGitStatus,
  shouldSendProjectDocText,
  checkProjectDocReadAllowed,
  anyDocReadHookBlocks,
  rl,
  createContextRoomTracker,
  applyReminders,
  placeBatchingReminder,
  nl,
} from "./utils/claudemd/contextRouting.js";
import { withTurnStepHooks, canResumeThinkingOnModel } from "./query/turnHooks.js";
import { productionDeps, backfillObservableInput } from "./query/deps.js";
import {
  Su,
  sectionAnswersSnapshot,
  yu,
  crossOrgThinkingAttachments,
  recordPromptSnapshot,
  recordDeferredTools,
  recordToolDescriptions,
  xxr,
} from "./query/promptSnapshot.js";
import {
  releaseStaleRefusalEffortCarry,
  VZo,
  refusedEffortTelemetryFields,
  resolveRefusalFallbackEffort,
} from "./utils/permissions/permissionSetup.js";
import { dWt, COMPACTED_WITH_PRECOMPUTED_TEXT } from "./services/compact/idleCompaction.js";
import { Us } from "./services/projects/threadRows.js";
import { buildQueryConfig } from "./query/config.js";
import { collectCoworkMemoryContext } from "./services/accountMemory/memoryContext.js";
import {
  startRelevantMemoryPrefetch,
  shouldBlockOnMemoryPrefetch,
  awaitMemoryPrefetch,
  filterDuplicateMemoryAttachments,
  getQueuedCommandAttachments,
  isInlineNotificationMode,
  getAttachmentMessages,
} from "./utils/attachments.js";
import {
  filterQueuedCommandsForThread,
  Oq,
  isPromptModeQueuedCommand,
  createQueueFilterForThread,
  getValueFromInput as getValueFromInput_2,
} from "./utils/messageQueueManager.js";
import { imageLimitsForModel } from "./utils/attachmentMedia.js";
import {
  buildAvailabilityFallbackChain,
  getUsageCreditsOnlyModelConsentDeclineFallback,
  isNoModelFallbackEnabled,
  noModelFallbackTripwire,
} from "./utils/model/modelFallback.js";
import {
  Vwt,
  effectiveTurnModel,
  checkModelSwitch,
  adoptedFallbackChain,
  nextFallbackModel as nextFallbackModel_2,
  pzr,
} from "./query/modelSelection.js";
import { createStickyBetaLatches, forkStickyBetaLatches, Xg } from "./bootstrap/stateSlices.js";
import { runTurnEndReactions, runStopHooks, waitForTurnEndSummary } from "./query/postTurnSummary.js";
import { headlessProfilerCheckpoint } from "./utils/headlessProfiler.js";
import { ye } from "./utils/startupMarks.js";
import { isActingAsBgJob, isUnattendedInteractiveSession, isBgSession } from "./utils/concurrentSessions.js";
import {
  createDisposableGuard,
  awaitMcpSettle,
  awaitBgConsentGate,
  compactCheckFacts,
  shouldBypassPtlPreempt,
  isCompactNotNeededAtLimit,
  drainToolResults,
  endsWithReminder,
  shouldRunMcpStopHooks,
  runStopHooksSafely,
  Xl,
  Jl,
  shouldPreemptPromptTooLong,
} from "./query/toolDrain.js";
import { isLocalCommandMarkup } from "./utils/messages/localCommandTags.js";
import {
  applyToolResultBudget,
  toolResultsDirFor,
  getBudgetExemptToolNames,
} from "./utils/toolResultStorage.js";
import { recordContentReplacement } from "./utils/sessionStorage.js";
import { getMainLoopModel, isFableFamilyOrPinnedModel } from "./utils/model/model.js";
import {
  getPrimaryModelForFallback,
  createToolUseContextView,
  currentProactivityLevel,
  findToolByName,
} from "./Tool.js";
import { telemetrySafeModelName } from "./utils/model/telemetryModelName.js";
import { agentTypeForTelemetry } from "./services/analytics/metadata.js";
import { getRuntimeMainLoopModel } from "./utils/model/planModeModel.js";
import {
  doesMostRecentAssistantMessageExceed200k,
  finalContextTokensFromLastResponse,
  tokenCountFromLastAPIResponse,
  getTokenUsage,
} from "./utils/tokens.js";
import { getModelContextInfo } from "./utils/model/modelContextInfo.js";
import {
  clearMicroCompactFlag,
  hasMemoryFileRead as hasMemoryFileRead_2,
  replaceToolResultContent,
} from "./services/compact/microCompact.js";
import { releasingAsyncIterator } from "./utils/generators.js";
import { getEffortLevelIfSupported } from "./utils/effort.js";
import { i1o } from "./utils/attachments/totalTokensReminder.js";
import {
  createCompactTracking,
  Tp,
  calculateTokenWarningState,
  checkRapidRefillBreaker,
  runCompactionAsStream,
} from "./services/compact/autoCompact.js";
import { stampSummaryTurnFields } from "./utils/messages/promptOrigin.js";
import { isMainAgent, isMainConversationContext, isNonMainSessionSubagent } from "./utils/agentContext.js";
import {
  buildPostCompactMessages,
  buildPostCompactMessagesWithoutKept,
  gzr,
  r8s,
  countNonProgressMessages,
} from "./services/compact/compact.js";
import { Iqo, Kei, $vt } from "./tasks/LocalShellTask/backgroundNotices.js";
import { copyTextOf } from "./components/messageActions.js";
import { usageLimitNotices } from "./services/rateLimitMessages.js";
import { resolveAdvisorState } from "./utils/advisor/advisorState.js";
import { d$e } from "./services/api/declaredToolSet.js";
import { latestPromptSnapshot, recordedDeferredTools } from "./utils/contextAttachments/promptSnapshot.js";
import { lse } from "./services/api/promptPrefixLedger.js";
import { expectPromptCacheDrop, MAIN } from "./services/api/promptCacheBreakDetection.js";
import { asSystemPrompt } from "./utils/systemPromptType.js";
import { appendSystemContextToPrompt, prependUserContextReminder } from "./utils/api.js";
import { jb, SessionRootSlot } from "./bootstrap/sessionSlices.js";
import {
  shouldRetryRefusal,
  shouldAskRefusalFallbackPreference,
  freeze,
  decideReminderDelivery,
  askRefusalFallbackPreference,
  allAnsweredWithoutRequest,
  shouldCompactAfterLongContextRefusal,
  isRefusalErrorMessage,
  reportRefusalRetry,
  synthesizeRefusedToolResults,
  recoverFromRefusal,
  promptTooLongFacts,
} from "./query/refusalRecovery.js";
import {
  createStreamingState,
  adoptFallbackResponse,
  clearInProgressToolUses,
  nextFallbackModel,
} from "./query/streamingFallback.js";
import { StreamingToolExecutor, discardInFlightTools } from "./services/tools/StreamingToolExecutor.js";
import { m5s, getToolEndsTurnKind } from "./services/tools/mcpResultMeta.js";
import { validateImagesInMessages } from "./utils/messages/accountMemory.js";
import { hasTypeField } from "./services/tools/toolExecution.js";
import { ImageSizeError } from "./utils/imageValidation.js";
import { ImageResizeError } from "./utils/imageResizer.js";
import {
  Il,
  Js,
  Ul,
  takeFallbackNotice,
  nextFallbackStage,
  ti,
  Zs,
  recordFallbackAttempt,
  Nl,
  recordFallbackNotice,
  ql,
  executePostSamplingHooks,
  reportQueuedSubmissions,
  withExpandedPastes,
} from "./utils/hooks/postSamplingHooks.js";
import {
  getActiveModelFallback,
  buildRefusalMessage,
  isFallbackServedRequest,
  buildFallbackGeneratedNotice,
} from "./services/api/safeguardMessages.js";
import {
  sWt,
  KYs,
  FABLE_OVERAGE_CONSENT_DIALOG,
  recordCreditsOnlyConsent,
  switchDefaultFromCreditsOnlyModel,
} from "./services/api/overageConsent.js";
import { hasExtraUsageProvisioned, isUsageCreditsModelBilled } from "./utils/planTiers.js";
import { renderUsageCreditsOnlyModelName, renderModelName } from "./utils/model/modelDisplay.js";
import { isFastModeEnabled, isFastModeActive, reportFastModeToggle } from "./utils/fastMode.js";
import { createDumpPromptsFetch } from "./services/api/dumpPrompts.js";
import {
  isAutoCompactEnabled,
  canCompactInRemote,
  isCompactQuerySource,
} from "./services/compact/compactSettings.js";
import { abe, usesLongContextWindow } from "./services/compact/autoCompactWindow.js";
import {
  compactFailureDetail,
  i8s,
  ozr,
  canReactiveCompact,
  triggerReactiveCompact,
  canLeaveOutFixPtl,
} from "./services/compact/reactiveCompact.js";
import {
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  getRefusalMessage,
  isPromptTooLongMessage_2,
  parsePromptTooLongTokenCounts,
  rebuildApiErrorMessage,
  formatSingleExchangePromptTooLong,
  getPromptTooLongTokenGap,
} from "./services/api/errors.js";
import { isSameModelFamilyId, canAdviseModelLenient } from "./utils/advisor.js";
import {
  resolveLatchedFallbackModel,
  isSonnetWithoutArcades,
  getFallbackLatchKind,
} from "./services/api/refusalFallbackHeaders.js";
import {
  resolveRefusalFallback,
  TENGU_DASH_FLAME,
  TENGU_ELEGANT_POSSUM,
  freeze_13,
  describeServerFallback,
  uJn,
  buildRefusalFallbackSystemMessage,
  modelUnavailableMessage,
} from "./services/api/modelFallback.js";
import { canUseNoTransientReminders, reminderDeliveryMode } from "./services/api/tether.js";
import { isTerminalShutdown, heldUntilExit } from "./utils/terminalShutdown.js";
import { isBetaTracingEnabled } from "./utils/telemetry/betaSessionTracing.js";
import { guardGoalCheck, notifyAutoReactHumanTurn, resetGoalIdleCheckinCount } from "./query/goalCheckIn.js";
import { expandPathOrNull } from "./utils/path.js";
import { isEntitlementOverlayUnavailable, isModelAllowed } from "./utils/model/modelAllowlist.js";
import { gn } from "./utils/shortHash.js";
import {
  isModelAllowedUnderActiveEnforcement,
  isExemptDefaultResolvingPick,
} from "./utils/model/defaultModel.js";
import { jw } from "./utils/betas.js";
import {
  assessPartialResponse,
  buildContinuationPrompt,
  stitchContinuation,
} from "./services/api/partialResponse.js";
import { Ws } from "./services/api/streamFallbackWarning.js";
import { withCitationsDropped } from "./services/orgMemory/promptIndex.js";
import { y8s, recordTextBlocks } from "./utils/harnessTagGate.js";
import { recordServerToolsUsed } from "./services/compact/keptTools.js";
import { swapShrinksContextWindow } from "./utils/model/smallFastModel.js";
import { FallbackTriggeredError, isModelNotFoundError } from "./services/api/withRetry.js";
import {
  sc,
  recoveryOutcome,
  guardedStreamCallback,
  reportFabricatedTurns,
  Mi,
  endsWithFabricatedTurn,
  lc,
  uc,
} from "./query/malformedToolCallRecovery.js";
import { STRUCTUREDOUTPUT } from "./tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { Lg } from "./services/tokenEstimation.js";
import { hasSuccessfulToolCall_2 } from "./utils/transcript/deserialize.js";
import { env } from "./utils/env.js";
import { isStorageV5Enabled } from "./utils/hoverRest.js";
import { hasActiveAgentTasks } from "./tasks/taskStatus.js";
import { generateToolUseSummary } from "./services/toolUseSummary/toolUseSummaryGenerator.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "./tools/ScheduleWakeupTool/prompt.js";
import { needsFableMitigations } from "./utils/model/fableMitigations.js";
import { getCanonicalName } from "./utils/model/canonicalModelName.js";
import { registerAgent } from "./utils/telemetry/perfettoTracing.js";
import { KBr } from "./utils/hooks/hookEventHelpers.js";
import { count } from "./utils/collections.js";
import {
  createScreensReader,
  createHookContextAttachment,
  screensChanged,
} from "./utils/processUserInput/userPromptSubmitHooks.js";
import { markMessagesRead } from "./bridge/readReceipts.js";
import { pwd } from "./utils/cwd.js";
import { recordSubmittedPrompts } from "./history.js";
import { isHumanOrigin } from "./utils/turnOrigin.js";
import { truncateToLength } from "./utils/stringUtils.js";
import { applyHookSessionTitle } from "./utils/sessionTitle.js";
import { capAdditionalContext } from "./services/tools/toolHooks.js";
import { X0 } from "./utils/abortSignalUtils.js";

/**
 * 构建时裁掉的可选拒绝跟踪模块（恒为 null）；requireTurnClassifier/requireClassifierSurfaces 惰性加载活动分类器与其输出面（chunk-wd9kxbpn、chunk-e321p3vc）。
 */
//@ chunk-ha3km179.js:153194-153282 sole-consumer
var toolDenialTracker = null,
  requireTurnClassifier = () => require("./chunk-wd9kxbpn.js"),
  requireClassifierSurfaces = () => require("./chunk-e321p3vc.js");
/**
 * 按 session.host 存放分类器任务状态的懒槽。
 */
//@ chunk-ha3km179.js:153282-153317 sole-consumer
var classifierJobStateSlot = new HostScoped(() => ({ state: void 0 }));
/**
 * 取当前会话的分类器任务状态，首次调用时用 createClassifierJobState 创建；分类器模块不存在时为 null。
 */
//@ chunk-ha3km179.js:153317-153444 sole-consumer
function getClassifierJobState(e) {
  let of = classifierJobStateSlot.of(e.session.host);
  if (of.state === void 0) of.state = requireTurnClassifier?.().createClassifierJobState(e) ?? null;
  return of.state;
}
/**
 * teleportFetchModule（composeTeleportFetchOverride，给远程/传送会话改写 fetch）与拒答回退级联解析器 refusalCascadeResolver。
 */
//@ chunk-ha3km179.js:153444-153652 sole-consumer
var teleportFetchModule = require("./chunk-r1wk8q25.js"),
  refusalCascadeResolver = {
    resolveStage: (e, n, r) =>
      pickFallbackModel({ mappedTarget: e, armedFallbackModel: void 0, refusingModel: n, triedModels: r }),
    triedModelEntry: canonicalModelKey,
    firstReachableStage: findFirstResolvableStage,
    logSkippedStages: logSkippedChainStages,
  };
/**
 * 为每个尚无结果的 tool_use 生成 is_error 的 tool_result 用户消息（中止、出错时保证 tool_use/tool_result 配对）。已回答的 id 通过第 4 参跳过。
 */
//@ chunk-ha3km179.js:153652-153944 fingerprint = yieldMissingToolResultBlocks (0.871)
function* yieldMissingToolResultBlocks(e, n, r, s) {
  for (let assistantMessage of e) {
    let toolUseBlocks = assistantMessage.message.content.filter((content) => content.type === "tool_use");
    for (let toolUse of toolUseBlocks) {
      if (s?.has(toolUse.id)) continue;
      yield createUserMessage({
        content: [{ type: "tool_result", content: n, is_error: !0, tool_use_id: toolUse.id }],
        toolUseResult: n,
        sourceToolAssistantUUID: assistantMessage.uuid,
        now: r?.now,
        uuidFn: r?.uuid,
      });
    }
  }
}
/**
 * 仅主线程 REPL（querySource 以 repl_main_thread 开头、非代理）时通知分类器本轮中止。
 */
//@ chunk-ha3km179.js:153944-154066 layout
function markClassifierTurnAborted(e, n) {
  let r = getClassifierJobState(e);
  if (!requireTurnClassifier || !r || !n.startsWith("repl_main_thread") || e.agentId) return;
  requireTurnClassifier().markTurnAborted(r, getOwnJobShortId());
}
/**
 * 中止原因为 user-cancel 或 remote-cancel 时返回被打断的消息 id（来自 bootstrap 状态），代理内恒为 undefined。
 */
//@ chunk-ha3km179.js:154066-154213 layout
function getInterruptedMessageId(e) {
  if (e.agentId) return;
  let n = unwrapAbortReason(e.abortController.signal.reason);
  if (n !== "user-cancel" && n !== "remote-cancel") return;
  return getLastCancelledAPIMessageId() ?? void 0;
}
/**
 * 取最后一条 assistant 之后最后一条真实用户消息的 uuid，作为拒答通知里的 refusedUserMessageUuid。
 */
//@ chunk-ha3km179.js:154213-154323 layout
function getRefusedUserMessageUuid(e) {
  let lastIndex = e.findLastIndex((s) => s.type === "assistant");
  return e.slice(lastIndex + 1).findLast(isRealUserPromptMessage)?.uuid ?? null;
}
/**
 * 工具结果或 MCP _meta 要求结束本轮时调用：记 tengu_mcp_tool_result_ended_turn，跑 PostToolBatch 钩子（阻断被丢弃只记日志），中止时补中断消息，最后跑 Stop 钩子；不再调用模型。
 */
//@ chunk-ha3km179.js:154323-155748 layout
async function* endTurnFromToolResult({
  endTurnSource: endTurnSource,
  messagesForQuery: messagesForQuery,
  assistantMessages: assistantMessages,
  toolResults: toolResults,
  toolUseBlocks: toolUseBlocks,
  systemPrompt: systemPrompt,
  userContext: userContext,
  systemContext: systemContext,
  toolUseContext: toolUseContext,
  updatedToolUseContext: updatedToolUseContext,
  querySource: querySource,
  stopHookActive: stopHookActive,
  stickyBetas: stickyBetas,
  queryChainIdForAnalytics: queryChainIdForAnalytics,
  queryDepth: queryDepth,
  deps: deps,
}) {
  try {
    if (
      (logEvent("tengu_mcp_tool_result_ended_turn", {
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryDepth,
        source: fromEnum(endTurnSource),
      }),
      endTurnSource === "mcp_meta")
    )
      markClassifierTurnAborted(toolUseContext, querySource);
    let G = new Map();
    for (let ee of toolResults)
      if (ee.type === "user" && Array.isArray(ee.message.content)) {
        for (let V of ee.message.content) if (V.type === "tool_result") G.set(V.tool_use_id, V.content);
      }
    try {
      for await (let ee of executePostToolBatchHooks(
        toolUseBlocks.map((V) => ({
          tool_name: V.name,
          tool_input: V.input,
          tool_use_id: V.id,
          tool_response: G.get(V.id),
        })),
        `hook-${deps.uuid()}`,
        updatedToolUseContext,
        getToolPermissionContext(updatedToolUseContext).mode,
        updatedToolUseContext.abortController.signal,
      )) {
        if (ee.message) yield ee.message;
        if (ee.blockingError || ee.preventContinuation)
          logForDebugging(
            `[end-turn] PostToolBatch block discarded (turn ended by ${endTurnSource === "tool" ? "tool result" : "MCP end-turn"}, no model re-invoke): ${ee.blockingError?.blockingError ?? ee.stopReason ?? "preventContinuation"}`,
          );
      }
    } catch (error) {
      if (!vAn(error, updatedToolUseContext.abortController.signal)) throw error;
      logForDebugging("PostToolBatch hooks cancelled");
    }
    if (updatedToolUseContext.abortController.signal.aborted) {
      if (!updatedToolUseContext.agentId)
        try {
          yield* cleanupComputerUseAfterTurn(updatedToolUseContext);
        } catch {}
      if (!isSilentAbortReason(updatedToolUseContext.abortController.signal.reason))
        yield createUserInterruptionMessage({
          toolUse: !1,
          interruptedMessageId: getInterruptedMessageId(updatedToolUseContext),
          interruptedByShutdown: shutdownInterruptStamp(updatedToolUseContext.abortController.signal),
          now: deps.now,
          uuidFn: deps.uuid,
        });
    }
    yield* handleStopHooks(
      messagesForQuery,
      assistantMessages,
      toolResults,
      systemPrompt,
      userContext,
      systemContext,
      toolUseContext,
      querySource,
      stopHookActive,
      stickyBetas,
      getClassifierJobState(toolUseContext),
      endTurnSource,
    );
  } catch (error) {
    if (isAbortError(error)) return;
    logError(error);
  }
}
/**
 * 仅主线程 REPL 时把 API 错误（error、详情、apiError）报告给分类器，失败忽略。
 */
//@ chunk-ha3km179.js:155748-155930 layout
function markClassifierApiFailure(e, n, r) {
  let s = getClassifierJobState(e);
  if (!requireTurnClassifier || !s || !n.startsWith("repl_main_thread") || e.agentId) return;
  requireTurnClassifier()
    .markApiFailure(
      s,
      getOwnJobShortId(),
      r.error,
      getAssistantMessageText(r) ?? r.errorDetails ?? "",
      r.apiError,
    )
    .catch(() => {});
}
/**
 * assistant 消息 apiError 为 max_output_tokens（被扣住、等待恢复）时为真。
 */
//@ chunk-ha3km179.js:155930-156008 fingerprint = isWithheldMaxOutputTokens (1)
function isWithheldMaxOutputTokens(msg) {
  return msg?.type === "assistant" && msg.apiError === "max_output_tokens";
}
/**
 * 回答在输出过程中被截断（truncatedAfterOutput 的 API 错误），且是子代理或非交互主线程，且 tengu_truncated_response_recovery 开（默认开）时可发提示续写。
 */
//@ chunk-ha3km179.js:156008-156227 layout
function isRecoverableTruncatedResponse(e, n, r) {
  return (
    e?.type === "assistant" &&
    e.isApiErrorMessage === !0 &&
    e.truncatedAfterOutput === !0 &&
    (classifyQuerySource(r) === "subagent" ||
      (classifyQuerySource(r) === "main" && n.options.isNonInteractiveSession)) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_truncated_response_recovery", !0)
  );
}
/**
 * 判断能否“续写未完成的思考”：去掉错误后只有一条回答、只有一个 thinking 块、stop_reason=max_tokens、未超窗口且模型/用量允许续写。
 */
//@ chunk-ha3km179.js:156227-156537 layout
function shouldResumeIncompleteThinking(e, n) {
  let filtered = e.filter((y) => !y.isApiErrorMessage && !isAbandonedOrUnsignedThinkingMessage(y)),
    s = filtered.length === 1 ? filtered[0] : void 0;
  if (s === void 0 || s.message.content.length !== 1) return !1;
  let h = s.message.content[0];
  return (
    h !== void 0 &&
    isThinkingBlock(h) &&
    hasThinkingSignature(h) &&
    s.message.stop_reason === "max_tokens" &&
    !isForeignModelMessage(s, Bn(n)) &&
    shouldResumeThinking(n, s.message.resumable, totalTokensOf(s.message.usage))
  );
}
/**
 * 把 customSystemPrompt（字符串或数组）和 appendSystemPrompt 用空行拼接，供 userSystemPrompt 选项使用。
 */
//@ chunk-ha3km179.js:156537-156678 layout
function joinCustomAndAppendSystemPrompt(e, n) {
  let filtered = [
    typeof e === "string"
      ? e
      : Array.isArray(e)
        ? e.join(`

`)
        : void 0,
    n,
  ].filter((h) => !!h);
  return filtered.length > 0
    ? filtered.join(`

`)
    : void 0;
}
/**
 * query() 入口（旧版同名）：确保工具初始化后运行 queryLoop（主线程挂观察者时走 queryWithObserverTap），结束后为本轮吸收的命令发 command_lifecycle（completed/cancelled），记录 turn 成败与轮次统计，返回终止结果 {reason,...}。
 */
//@ chunk-ha3km179.js:156678-157667 layout
async function* query(e) {
  let n = [],
    startTime = performance.now();
  if (classifyQuerySource(e.querySource) === "main" && !e.toolUseContext.agentId)
    (WS("engine_pickup"), jS("loop_entry"));
  let s = [],
    h;
  using y = observeRunningTurn(e.toolUseContext, e.messages);
  try {
    (await awaitArtifactRosterSafe(e.toolUseContext.options.tools),
      (h = yield* isObserverAgentsEnabled()
        ? queryWithObserverTap({ ...e, takePlainDelta: void 0 }, n, s, y)
        : y.through(queryLoop(e, n, s, y))));
  } finally {
    let agentId = e.toolUseContext.agentId;
    if (agentId)
      discardPrecompute(
        e.toolUseContext.session.precompute,
        agentId,
        "subagent_exit",
        e.querySource,
        e.toolUseContext.storageV5,
      );
  }
  yield* updateGoalAfterTurn(
    e.toolUseContext,
    e.toolUseContext.getAppState,
    e.querySource,
    h,
    createQueueDelivery,
  );
  let S = isAbnormalTerminalReason(h.reason) ? "cancelled" : "completed";
  for (let M of dropPutBackMessages(e.toolUseContext.messageQueue, n, !e.toolUseContext.agentId))
    yield { type: "command_lifecycle", uuid: M, state: S };
  for (let M of s) yield { type: "command_lifecycle", uuid: M, state: "completed" };
  if (isErrorTerminalReason(h.reason)) logFeatureBad("turn", terminalReasonTag(h));
  else logFeatureOk("turn");
  return (
    reportTurnEnd({
      terminal: h,
      querySource: e.querySource,
      agentContext: e.toolUseContext.agentContext,
      hasActiveGoal: e.toolUseContext.options.activeGoal !== void 0,
      startedAt: startTime,
    }),
    h
  );
}
/**
 * queryWithObserverTap：主线程先挂代理观察者（非交互会话等待其就绪），把 queryLoop 的每个事件交给观察者 capture（stream_request_start 时 flushSegment），并原样转发。
 */
//@ chunk-ha3km179.js:157667-158558 layout
async function* queryWithObserverTap(e, n, r, s) {
  if (classifyQuerySource(e.querySource) === "main") {
    let M = e.toolUseContext.options.agentDefinitions?.activeAgents ?? [],
      R = getMainThreadAgentType(),
      T = ensureMainObserver({
        mainAgentDefinition: R ? M.find((w) => w.agentType === R) : void 0,
        activeAgents: M,
        toolUseContext: e.toolUseContext,
        canUseTool: e.canUseTool,
      });
    if (getIsNonInteractiveSession())
      try {
        await T;
      } catch (error) {
        logForDebugging(`[agentObserver] non-interactive arm failed (degrading to unobserved): ${error}`);
      }
  }
  let h = buildArmedObserverAttachment({
      querySource: e.querySource,
      toolUseContext: e.toolUseContext,
      messages: e.messages,
      turnStartIndex: isHumanTurn(e.messages),
    }),
    through = s.through(queryLoop(e, n, r, s)),
    S;
  try {
    let M;
    while (!0) {
      let R = await through.next(M);
      if (R.done) {
        S = R.value;
        break;
      }
      if (h)
        if (R.value.type === "stream_request_start") h.flushSegment();
        else h.capture(R.value);
      M = yield R.value;
    }
  } finally {
    if (S === void 0)
      try {
        await through.return(void 0);
      } catch {}
    try {
      h?.finish(S?.reason ?? "ended");
    } catch {}
  }
  if (S === void 0) throw Error("queryWithObserverTap: missing terminal after completion");
  return S;
}
/**
 * 把轮首/轮中 poll 事件从消息队列消费掉（absorbed_mid_turn），记录 uuid 并产出 command_lifecycle started，返回事件转换出的消息；中止或折叠暂停时保留在队列。
 */
//@ chunk-ha3km179.js:158558-159009 layout
function* absorbQueuedPollEvents({
  events: events,
  queue: queue,
  signal: signal,
  phase: phase,
  deliveredPollEventUuids: deliveredPollEventUuids,
}) {
  if ((V2e(events), signal.aborted || queue.isMidTurnFoldSuspended()))
    return (
      logForDebugging(
        `[query] abort/suspension during ${phase} absorption \u2014 leaving ${events.length} poll event(s) queued`,
      ),
      []
    );
  (queue.consume(events, { reason: "absorbed_mid_turn" }), iCt(events), logFeatureOk("poll_event_delivery"));
  for (let y of events)
    if (y.uuid)
      (deliveredPollEventUuids.push(y.uuid),
        yield { type: "command_lifecycle", uuid: y.uuid, state: "started" });
  try {
    return vHs(events);
  } catch (error) {
    return (logError(error), []);
  }
}
/**
 * poll_events 生成为 0 时记 poll_event_delivery left_queued 并打警告。
 */
//@ chunk-ha3km179.js:159009-159178 layout
function logPollEventsLeftQueued(e, n) {
  (logFeatureSad("poll_event_delivery", "left_queued"),
    logForDebugging(
      `[query] ${e} poll_events emission degraded to 0 for ${n} event(s) \u2014 leaving them queued`,
      { level: "warn" },
    ));
}
/**
 * 循环迭代返回此哨兵表示进入下一轮（替代旧版的递归调用）。
 */
//@ chunk-ha3km179.js:159178-159198 layout
var NEXT_ROUND = "next_round";
/**
 * 查询主循环（旧版 queryLoop）。每轮：轮首记忆召回/队列命令折叠 → 消息预处理（工具结果预算、snip）→ 模型选择与实时切换 → 自动压缩 → 阻断上限检查 → 各类请求前公告（附件、advisor、延迟工具） → 渲染 system 提示词 → while 调用 deps.callModel 流式消费（服务器拒答回退、流式回退、模型 fallback、工具边流边执行）→ 错误恢复（反应式压缩、max_output_tokens 续写、截断续写、畸形 tool_use 重试、仅思考回答提示）→ Stop 钩子 → 执行剩余工具、附件 → 返回 NEXT_ROUND 进入下一轮或返回终止原因。
 */
//@ chunk-ha3km179.js:159198-234645 callgraph-witnessed = queryLoop (0.294)
async function* queryLoop(params, startedCommandUuids, deliveredPollEventUuids, transcriptTap) {
  let {
    systemPrompt: systemPrompt,
    userContext: userContext,
    systemContext: systemContext,
    canUseTool: canUseTool,
    fallbackModel: fallbackModel,
    querySource: querySource,
    spawnedBySkill: spawnedBySkill,
    maxTurns: maxTurns,
    skipCacheWrite: skipCacheWrite,
    skipMessageCacheMarkers: skipMessageCacheMarkers,
    relayFork: relayFork,
    compactionRequestKind: compactionRequestKind,
    toolChoice: toolChoice,
    apiAttemptsLeft: apiAttemptsLeft,
    evictCacheOnComplete: evictCacheOnComplete,
    agentCacheTtlOverride: agentCacheTtlOverride,
    forkPointUuid: forkPointUuid,
    divergesAtMessageId: divergesAtMessageId,
    thinkingStripPlan: thinkingStripPlan,
    advisorStripPlan: advisorStripPlan,
  } = params;
  if (params.inPlaceOfFirstRequest !== void 0) {
    let k = abortedTurnRows(params.inPlaceOfFirstRequest, {
      signal: params.toolUseContext.abortController.signal,
      interruptedMessageId: () => getInterruptedMessageId(params.toolUseContext),
      now: params.deps?.now,
      uuid: params.deps?.uuid,
    });
    if ((yield* k.rows, k.terminal.reason === "aborted_streaming"))
      markClassifierTurnAborted(params.toolUseContext, querySource);
    return k.terminal;
  }
  let se = endsWithMachineTurn(params.messages),
    contextRouting = await buildContextRouting(userContext, systemContext, params.toolUseContext, {
      messages: params.messages,
      querySource: querySource,
    }),
    deps = wrapArtifactPatchTurn(
      withTurnStepHooks(
        wrapCallModelWithAttachments(params.deps ?? productionDeps(), params.toolUseContext),
        params.toolUseContext,
      ),
      params.toolUseContext,
    ),
    nt = params.promptRenderEpoch ?? getSystemPromptSectionEpoch(),
    bt = Su(params.toolUseContext.options),
    dt = sectionAnswersSnapshot(params.toolUseContext, params.promptRenderEpoch),
    isMainThreadQuery = querySource.startsWith("repl_main_thread") || querySource === "sdk",
    isTopLevelMainThread = isMainThreadQuery && !params.toolUseContext.agentId;
  if (isMainThreadQuery)
    try {
      (latchConversationAtis(),
        releaseStaleRefusalEffortCarry(),
        (dWt.of(params.toolUseContext.session).summarize = (k) =>
          manuallyExtractSessionMemory(querySource, k)));
    } catch (error) {
      logError(error);
    }
  let Pe = Us(params.messages),
    refusedUserMessageUuid = getRefusedUserMessageUuid(Pe),
    state = {
      guards: {
        ...INITIAL_LOOP_RECOVERY_STATE,
        refusalRetrySpent: !1,
        mcpEndTurnOverrideSpent: !1,
        stopHookActive: params.stopHookActive ?? !1,
        turnCount: 1,
      },
      messages: params.messages,
      toolUseContext: params.toolUseContext,
      compactTracking: void 0,
      transition: void 0,
    },
    taskBudgetRemaining = void 0,
    queryConfig = buildQueryConfig(),
    memoryContextPromise = collectCoworkMemoryContext(Pe, state.toolUseContext, querySource);
  using memoryRecallPrefetch = startRelevantMemoryPrefetch(
    state.messages,
    state.toolUseContext,
    querySource,
    memoryContextPromise,
  );
  if (memoryRecallPrefetch && shouldBlockOnMemoryPrefetch()) {
    let k = [];
    try {
      if (isTopLevelMainThread) (WS("loop_entry"), jS("memory_recall_wait"));
      let Ze;
      try {
        Ze = await awaitMemoryPrefetch(memoryRecallPrefetch, state.toolUseContext.abortController.signal);
      } finally {
        if (isTopLevelMainThread) (WS("memory_recall_wait"), jS("loop_entry"));
      }
      if (Ze !== void 0) {
        let Ot = filterDuplicateMemoryAttachments(
          Ze,
          state.toolUseContext.readFileState,
          state.toolUseContext.session,
          memoryRecallPrefetch.earlierReadsMayBeCleared,
        );
        ((memoryRecallPrefetch.consumedOnIteration = 0),
          (memoryRecallPrefetch.consumedBlocking = !0),
          (k = Ot.map((qt) => createAttachmentMessage_2(qt, deps))));
      }
    } catch (error) {
      (logError(error), (k = []));
    }
    if (k.length > 0) state = { ...state, messages: [...state.messages, ...k] };
    for (let Ze of k) yield Ze;
  }
  if (memoryContextPromise) {
    if (isTopLevelMainThread) (WS("loop_entry"), jS("memory_context_wait"));
    let mapped = (await memoryContextPromise).map((Ze) => createAttachmentMessage_2(Ze, deps));
    if (isTopLevelMainThread) (WS("memory_context_wait"), jS("loop_entry"));
    if (mapped.length > 0) state = { ...state, messages: [...state.messages, ...mapped] };
    for (let Ze of mapped) yield Ze;
  }
  let pendingPollEventRows = [],
    ut = !1;
  {
    let agentContext = state.toolUseContext.agentContext,
      Ot =
        !isMainThreadQuery || state.toolUseContext.messageQueue.isMidTurnFoldSuspended()
          ? []
          : filterQueuedCommandsForThread(
              state.toolUseContext.messageQueue.getTurnStartFoldCommands(
                state.toolUseContext.abortController.signal.aborted,
              ),
              { isMainThread: isMainThreadQuery, currentAgentId: state.toolUseContext.agentId },
            ).filter(Kv);
    if (Ot.length > 0) {
      let messageQueue = state.toolUseContext.messageQueue;
      (messageQueue.registerFoldInFlight(Ot), (se &&= !Ot.some(isPersonQueuedInput)));
      try {
        let countRemainingWakePollEventsAfter = messageQueue.countRemainingWakePollEventsAfter(Ot),
          Sn = [];
        try {
          Sn = await getQueuedCommandAttachments(
            Ot,
            imageLimitsForModel(state.toolUseContext.options.mainLoopModel),
            countRemainingWakePollEventsAfter,
            { messages: state.toolUseContext.messages },
          );
        } catch (error) {
          if (isAbortError(error))
            logForDebugging("[query] turn-start poll_events build aborted \u2014 leaving events queued");
          else logError(error);
        }
        if (Sn.some((Ro) => Ro.type === "poll_events")) {
          state.toolUseContext.setToolPermissionContext(setPollEventDeliveryGuard);
          let mapped = Sn.map((bn) => createAttachmentMessage_2(bn, deps));
          state = { ...state, messages: [...state.messages, ...mapped] };
          for (let bn of mapped) yield bn;
          pendingPollEventRows = yield* absorbQueuedPollEvents({
            events: Ot,
            queue: messageQueue,
            signal: state.toolUseContext.abortController.signal,
            phase: "turn-start",
            deliveredPollEventUuids: deliveredPollEventUuids,
          });
        } else logPollEventsLeftQueued("turn-start", Ot.length);
      } finally {
        messageQueue.unregisterFoldInFlight(Ot);
      }
    }
  }
  if (isMainThreadQuery && !state.toolUseContext.agentId && !state.toolUseContext.options.bareFork) {
    let messageQueue = state.toolUseContext.messageQueue;
    try {
      let Ze = messageQueue.isMidTurnFoldSuspended() ? [] : messageQueue.getCommandQueue().filter(Oq);
      if (Ze.length > 0) {
        let Ot = await getQueuedCommandAttachments(
          Ze,
          imageLimitsForModel(state.toolUseContext.options.mainLoopModel),
          0,
          { messages: state.toolUseContext.messages },
        );
        if (Ot.length === Ze.length && !state.toolUseContext.abortController.signal.aborted) {
          V2e(Ze);
          let mapped = Ot.map((on) => createAttachmentMessage_2(on, deps));
          state = { ...state, messages: [...state.messages, ...mapped] };
          for (let on of mapped) yield on;
          (messageQueue.consume(Ze, { reason: "absorbed_mid_turn" }), (se &&= !Ze.some(isPersonQueuedInput)));
        } else if (!state.toolUseContext.abortController.signal.aborted)
          logForDebugging(
            `[query] turn-start passive fold emitted ${Ot.length} of ${Ze.length} \u2014 leaving them queued`,
            { level: "warn" },
          );
      }
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  }
  let kt = !1,
    refusalFallbacksUsed = 0,
    refusalFallbackDeclined = !1,
    it = !1,
    At,
    Me = !1,
    primaryModel = getMainLoopModel_2(params.toolUseContext),
    sessionModel = primaryModel,
    modelChain = buildAvailabilityFallbackChain(primaryModel, fallbackModel),
    chainIndex = 0,
    modelFacts = params.modelFacts,
    mo,
    refusalOverride,
    loopEffort,
    consentOverride,
    liveSwitchOverride,
    config = Vwt(),
    isMainThread = isMainThreadQuery,
    emitsLocalScope = querySource === "side_question" || params.forkOrigin === "btw",
    querySourceKind = classifyQuerySource(querySource),
    isMainOrSubagent = querySourceKind === "main" || querySourceKind === "subagent",
    stickyBetas =
      params.stickyBetas ??
      (querySourceKind === "main" || querySourceKind === void 0
        ? void 0
        : querySourceKind === "subagent"
          ? createStickyBetaLatches()
          : forkStickyBetaLatches(getStickyBetas())),
    isMainLoop = querySourceKind === "main" || querySourceKind === void 0,
    sentReminderTexts = new Map();
  async function* runIteration() {
    if (ut)
      return (
        yield* pendingPollEventRows,
        markClassifierTurnAborted(state.toolUseContext, querySource),
        yield* runTurnEndReactions(state.toolUseContext, state.messages, {
          stopHookActive: state.guards.stopHookActive,
        }),
        { reason: "hook_stopped" }
      );
    if (isMainLoop && state.toolUseContext.shouldStopBeforeNextApiCall?.())
      return (yield* pendingPollEventRows, { reason: "background_requested" });
    if (isTopLevelMainThread) (WS("loop_entry"), jS("message_prep"));
    let { toolUseContext: toolUseContext } = state,
      messages = state.messages,
      Ot,
      {
        guards: guards,
        compactTracking: compactTracking,
        resumeIncompleteThinking: resumeIncompleteThinking,
        pendingToolUseSummary: pendingToolUseSummary,
        prevToolDurations: prevToolDurations,
      } = state,
      {
        maxOutputTokensRecoveryCount: maxOutputTokensRecoveryCount,
        hasAttemptedReactiveCompact: hasAttemptedReactiveCompact,
        reactiveCompactDeeperPass: reactiveCompactDeeperPass,
        thinkingOnlyNudged: thinkingOnlyNudged,
        malformedToolUseRetryCount: malformedToolUseRetryCount,
        refusalRetrySpent: refusalRetrySpent,
        mcpEndTurnOverrideSpent: mcpEndTurnOverrideSpent,
        stopHookActive: stopHookActive,
        stopHookBlockingCount: stopHookBlockingCount,
        turnCount: turnCount,
      } = guards,
      maxOutputTokensOverride = state.transition === void 0 ? params.maxOutputTokensOverride : void 0,
      resumeActive = resumeIncompleteThinking;
    if (
      (announceOutputLimitRecovery(state.transition, toolUseContext.agentId),
      isMainLoop && !toolUseContext.agentId)
    )
      yu(toolUseContext.messageQueue);
    if ((yield { type: "stream_request_start" }, queryCheckpoint("query_fn_entry"), !toolUseContext.agentId))
      headlessProfilerCheckpoint("query_started");
    let startTime = performance.now(),
      queryTracking = toolUseContext.queryTracking
        ? {
            chainId: toolUseContext.queryTracking.chainId,
            depth: toolUseContext.queryTracking.depth + 1,
            roundStartedAtMs: startTime,
          }
        : { chainId: deps.uuid(), depth: 0, roundStartedAtMs: startTime },
      queryChainIdForAnalytics = ye(queryTracking.chainId);
    toolUseContext = { ...toolUseContext, queryTracking: queryTracking };
    let messagesForQuery = [...Us(messages)];
    messagesForQuery = transcriptTap.withArrivedRows(messagesForQuery);
    let Di = (E) => canResumeThinkingOnModel(messagesForQuery, E),
      tracking = compactTracking,
      zr = toolUseContext.precomputeSourceKey !== void 0 && tracking?.compacted !== !0 && !mJn(querySource);
    using Li =
      requireTurnClassifier &&
      isActingAsBgJob() &&
      querySource.startsWith("repl_main_thread") &&
      !toolUseContext.agentId
        ? createDisposableGuard(() => markClassifierTurnAborted(toolUseContext, querySource))
        : void 0;
    if (requireTurnClassifier && Li) {
      let last = messagesForQuery.findLast(
        (records) =>
          records.type === "user" && !records.isMeta && typeof records.message.content === "string",
      );
      requireTurnClassifier().markTurnActive(getClassifierJobState(toolUseContext), getOwnJobShortId(), {
        userText:
          last?.type === "user" &&
          typeof last.message.content === "string" &&
          !isLocalCommandMarkup(last.message.content)
            ? last.message.content
            : void 0,
        isTurnStart: state.transition === void 0,
      });
    }
    let Lc = querySource.startsWith("agent:") || querySource.startsWith("repl_main_thread");
    messagesForQuery = await applyToolResultBudget(
      messagesForQuery,
      toolUseContext.contentReplacementState,
      toolResultsDirFor(toolUseContext.session),
      Lc
        ? (E) =>
            void recordContentReplacement(E, toolUseContext.agentId, toolUseContext.storageV5).catch(logError)
        : void 0,
      getBudgetExemptToolNames(toolUseContext.options.tools),
      toolUseContext.storageV5,
    );
    let Ui = () =>
      effectiveTurnModel({
        refusalOverride: refusalOverride,
        consentOverride: consentOverride,
        liveSwitchOverride: liveSwitchOverride,
        chainModel: modelChain[chainIndex],
        primaryModel: primaryModel,
      });
    if (isMainThread) {
      let E = checkModelSwitch({
        pickSeen: config,
        livePick: Vwt(),
        sessionModel: sessionModel,
        turn: {
          refusalOverride: refusalOverride,
          consentOverride: consentOverride,
          liveSwitchOverride: liveSwitchOverride,
          chain: modelChain,
          chainIndex: chainIndex,
          primaryModel: primaryModel,
        },
        resolveLiveModel: getMainLoopModel,
      });
      if (E !== void 0) {
        config = E.pick;
        let adopt = E.adopt;
        if (adopt !== void 0) {
          let pe = Ui(),
            model = adopt.model;
          switch (adopt.latch) {
            case "session_pick":
              ((mo = void 0),
                (liveSwitchOverride = model),
                (sessionModel = model),
                (refusalOverride = void 0),
                (consentOverride = void 0),
                ({ chain: modelChain, chainIndex: chainIndex } = adoptedFallbackChain({
                  chain: modelChain,
                  chainIndex: chainIndex,
                  primaryModel: primaryModel,
                  configuredFallbacks: fallbackModel,
                  adoptedModel: model,
                })));
              break;
            case "availability_chain":
              chainIndex = adopt.chainIndex;
              break;
          }
          let he = getPrimaryModelForFallback(toolUseContext.options);
          ((toolUseContext.options.mainLoopModel = model),
            (toolUseContext.options.availabilityFallback =
              adopt.latch === "availability_chain" ? { primaryModel: he, fallbackModel: model } : void 0),
            logEvent("tengu_live_model_switch", {
              from_model: telemetrySafeModelName(pe),
              to_model: telemetrySafeModelName(model),
              query_source: agentTypeForTelemetry(querySource),
              entrypoint: lit("cli"),
              queryChainId: queryChainIdForAnalytics,
              queryDepth: queryTracking.depth,
            }));
        }
      }
    }
    let resolveRuntimeModel = (E, j) =>
        getRuntimeMainLoopModel({
          permissionMode: j,
          mainLoopModel: Ui(),
          exceeds200kTokens: j === "plan" && doesMostRecentAssistantMessageExceed200k(E),
        }),
      resolveModelAndFacts = async (E, j) => {
        let pe = resolveRuntimeModel(E, j),
          me = modelFacts;
        if (((modelFacts = void 0), isTopLevelMainThread)) jS("model_config_wait");
        let he = me?.model === pe ? me : await awaitMcpSettle(pe, toolUseContext);
        if (isTopLevelMainThread) WS("model_config_wait");
        return [pe, he];
      };
    if (isTopLevelMainThread) WS("message_prep");
    let [attemptModel, attemptModelFacts] = await resolveModelAndFacts(
      messagesForQuery,
      getToolPermissionContext(toolUseContext).mode,
    );
    if (isTopLevelMainThread) jS("message_prep");
    let setAttemptModel = (E) => {
        ((attemptModel = E), (attemptModelFacts = getModelContextInfo(E)));
      },
      snipTokensFreed = 0;
    if (
      (clearMicroCompactFlag(),
      await awaitBgConsentGate(),
      queryCheckpoint("query_autocompact_start"),
      isTopLevelMainThread)
    )
      (WS("message_prep"), jS("autocompact"));
    let compactionCheckFacts = attemptModelFacts,
      autocompact = deps.autocompact(
        messagesForQuery,
        toolUseContext,
        attemptModelFacts,
        {
          systemPrompt: systemPrompt,
          userContext: userContext,
          systemContext: systemContext,
          toolUseContext: toolUseContext,
          forkContextMessages: messagesForQuery,
          advisorModel: toolUseContext.getAppState().advisorModel,
          stickyBetas: stickyBetas,
          agentCacheTtlOverride: agentCacheTtlOverride,
        },
        querySource,
        tracking,
        snipTokensFreed,
        applyPrecomputedCompact,
      ),
      autocompactOutcome = yield* releasingAsyncIterator(autocompact);
    if ((queryCheckpoint("query_autocompact_end"), isTopLevelMainThread))
      (WS("autocompact"), jS("request_announcements"));
    if (autocompactOutcome.kind === "rapid_refill_breaker_tripped") {
      let E = fallbackWindowNotice({
        fallback: isMainThreadQuery ? mo : void 0,
        mainLoopModel: toolUseContext.options.mainLoopModel,
        configuredWindow: toolUseContext.options.autoCompactWindow,
      });
      logEvent("tengu_auto_compact_rapid_refill_breaker", {
        consecutiveRapidRefills: tracking?.consecutiveRapidRefills ?? 0,
        turnsSincePreviousCompact: tracking?.turnCounter ?? -1,
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
        afterShrinkingFallback: E.afterShrinkingFallback,
      });
      let fullSystemPrompt = createApiErrorMessage({
        content: E.content,
        error: "invalid_request",
        apiError: "autocompact_thrashing",
        now: deps.now,
        uuid: deps.uuid,
      });
      return (
        yield fullSystemPrompt,
        executeStopFailureHooks(fullSystemPrompt, toolUseContext),
        markClassifierApiFailure(toolUseContext, querySource, fullSystemPrompt),
        yield* pendingPollEventRows,
        { reason: "rapid_refill_breaker" }
      );
    }
    if (autocompactOutcome.kind === "compacted") {
      let {
          result: E,
          thresholdSource: thresholdSource,
          thresholdWindow: thresholdWindow,
        } = autocompactOutcome,
        {
          preCompactTokenCount: preCompactTokenCount,
          postCompactTokenCount: postCompactTokenCount,
          truePostCompactTokenCount: truePostCompactTokenCount,
          compactionUsage: compactionUsage,
        } = E,
        qe = getEffortLevelIfSupported(
          toolUseContext.options.mainLoopModel,
          getEffortValue(toolUseContext),
          getEffortLayerOverride(toolUseContext.permissionLayers),
        );
      if (
        (logEvent("tengu_auto_compact_succeeded", {
          thresholdSource: fromEnumOpt(thresholdSource),
          autoCompactWindow: thresholdWindow.window,
          autoCompactWindowOrigin: fromEnum(thresholdWindow.origin),
          routedThroughReactive: autocompactOutcome.routedThroughReactive,
          ...(autocompactOutcome.afterIdle && { armTrigger: lit("idle") }),
          originalMessageCount: messages.length,
          compactedMessageCount: E.summaryMessages.length + E.attachments.length + E.hookResults.length,
          ...(qe && { effort_level: fromEnum(qe) }),
          preCompactTokenCount: preCompactTokenCount,
          postCompactTokenCount: postCompactTokenCount,
          truePostCompactTokenCount: truePostCompactTokenCount,
          compactionInputTokens: compactionUsage?.input_tokens,
          compactionOutputTokens: compactionUsage?.output_tokens,
          compactionCacheReadTokens: compactionUsage?.cache_read_input_tokens ?? 0,
          compactionCacheCreationTokens: compactionUsage?.cache_creation_input_tokens ?? 0,
          compactionTotalTokens: compactionUsage
            ? compactionUsage.input_tokens +
              (compactionUsage.cache_creation_input_tokens ?? 0) +
              (compactionUsage.cache_read_input_tokens ?? 0) +
              compactionUsage.output_tokens
            : 0,
          queryChainId: queryChainIdForAnalytics,
          queryDepth: queryTracking.depth,
        }),
        params.taskBudget)
      ) {
        let preCompactContext = finalContextTokensFromLastResponse(messagesForQuery);
        taskBudgetRemaining = Math.max(
          0,
          (taskBudgetRemaining ?? params.taskBudget.total) - preCompactContext,
        );
      }
      (i1o(toolUseContext.agentId ?? "main", tokenCountFromLastAPIResponse(messagesForQuery)),
        (tracking = createCompactTracking(deps.uuid(), autocompactOutcome.consecutiveRapidRefills)),
        (E.summaryMessages = stampSummaryTurnFields(E.summaryMessages, messagesForQuery)),
        (contextRouting = await rebuildRoutingAfterCompaction(
          contextRouting,
          userContext,
          systemContext,
          toolUseContext,
          { messages: params.messages, querySource: querySource },
        )));
      let Ne = await reannounceAfterCompact(E, {
        routing: contextRouting,
        toolUseContext: toolUseContext,
        querySource: querySource,
        resumeActive: resumeActive,
        foreground: isMainThreadQuery && isMainAgent(toolUseContext.agentContext),
        stamp: deps,
      });
      if (((messagesForQuery = ir(buildPostCompactMessages(E), Ne)), messages !== params.messages)) {
        if (((Ot = mu(messages)), Ot !== void 0)) messages = messagesForQuery;
      }
      ((toolUseContext = withTurnMessages(toolUseContext, messagesForQuery, isHumanTurn)),
        (state = { ...state, messages: messages, toolUseContext: toolUseContext }),
        maybeStartPrecomputeAfterTurn({
          messages: messagesForQuery,
          systemPrompt: systemPrompt,
          userContext: userContext,
          systemContext: systemContext,
          toolUseContext: toolUseContext,
          querySource: querySource,
          stickyBetas: stickyBetas,
        }));
      for (let ke of ir(buildPostCompactMessagesWithoutKept(E), Ne)) yield ke;
      if (autocompactOutcome.afterIdle) yield createSystemMessage(COMPACTED_WITH_PRECOMPUTED_TEXT, "notice");
    } else if (
      (autocompactOutcome.kind === "failed" || autocompactOutcome.kind === "not_needed") &&
      autocompactOutcome.consecutiveFailures !== void 0
    ) {
      tracking = {
        ...(tracking ?? { compacted: !1, turnId: "", turnCounter: 0 }),
        consecutiveFailures: autocompactOutcome.consecutiveFailures,
      };
      let postCompactMessages = notifyCompactFailure({
        outcome: autocompactOutcome,
        querySource: querySource,
        agentId: toolUseContext.agentId,
        isInterrupted: toolUseContext.abortController.signal.aborted,
      });
      if (postCompactMessages !== void 0) yield postCompactMessages;
    }
    let autocompactRan = autocompactOutcome.kind === "compacted" || autocompactOutcome.kind === "failed";
    if (
      shouldArmPrecompute({
        autocompactRan: autocompactRan,
        hasAttemptedReactiveCompact: hasAttemptedReactiveCompact,
        lastTransitionReason: state.transition?.reason,
        isPreFirstCompactFork: zr,
        querySource: querySource,
        contextTokens: Tp(messagesForQuery, attemptModelFacts.bytesPerToken) - snipTokensFreed,
        messagesCounted: messagesForQuery,
        facts: attemptModelFacts,
        autoCompactWindow: toolUseContext.options.autoCompactWindow,
      })
    )
      if (querySourceKind === "subagent")
        latchArmGate(
          toolUseContext.session.precompute,
          toolUseContext.agentId,
          "subagent_estimate",
          agentTypeForTelemetry(querySource),
        );
      else
        armPrecomputedCompact({
          querySource: querySource,
          messages: messagesForQuery,
          facts: attemptModelFacts,
          cacheSafeParams: {
            systemPrompt: systemPrompt,
            userContext: userContext,
            systemContext: systemContext,
            toolUseContext: toolUseContext,
            forkContextMessages: messagesForQuery,
            advisorModel: toolUseContext.getAppState().advisorModel,
            stickyBetas: stickyBetas,
            agentCacheTtlOverride: agentCacheTtlOverride,
          },
          ...(querySource === "sdk" && { promptScan: countUserPromptsAndRewrite(messagesForQuery) }),
        });
    if (
      classifyQuerySource(querySource) === "main" &&
      !toolUseContext.agentId &&
      !resumeActive &&
      hMs(toolUseContext.session) &&
      Iqo(toolUseContext.session)
    )
      await runTurnVisitors(toolUseContext.session, toolUseContext.abortController.signal);
    if (
      classifyQuerySource(querySource) === "main" &&
      !toolUseContext.agentId &&
      !resumeActive &&
      Kei(toolUseContext.session) &&
      Iqo(toolUseContext.session)
    )
      for (let E of $vt.of(toolUseContext.session).take()) {
        let j = createAttachmentMessage_2({ type: "dir_sync_notice", content: E }, deps);
        (yield j, (messagesForQuery = [...messagesForQuery, j]));
      }
    if (classifyQuerySource(querySource) === "main" && !toolUseContext.agentId && !resumeActive)
      try {
        for (let E of await copyTextOf(toolUseContext.session)) {
          for (let message of E.messages)
            (yield message, (messagesForQuery = [...messagesForQuery, message]));
          if (E.contexts.length > 0) {
            let j = createAttachmentMessage_2(
              {
                type: "hook_additional_context",
                content: E.contexts,
                hookName: "PostModelSwitch",
                toolUseID: "PostModelSwitch",
                hookEvent: "PostModelSwitch",
              },
              deps,
            );
            (yield j, (messagesForQuery = [...messagesForQuery, j]));
          }
        }
      } catch (error) {
        logError(toError(error));
      }
    messagesForQuery = yield* usageLimitNotices(messagesForQuery, {
      resumeActive: resumeActive,
      isMainLoop: isMainLoop,
      querySource: querySource,
      depth: queryTracking.depth,
      model: attemptModel,
      toolUseContext: toolUseContext,
      now: deps.now,
      uuid: deps.uuid,
    });
    let Hi = isMainThreadQuery && isMainAgent(toolUseContext.agentContext),
      Xr = resumeActive
        ? contextRouting
        : await refreshRoutedGitStatus(messagesForQuery, contextRouting, toolUseContext, Hi),
      qc =
        !resumeActive &&
        shouldSendProjectDocText(messagesForQuery, Xr, toolUseContext, Hi, state.transition === void 0)
          ? await checkProjectDocReadAllowed(
              Xr,
              toolUseContext,
              () => createToolUseContextView(toolUseContext),
              { messages: messagesForQuery, systemPrompt: systemPrompt, modelFacts: attemptModelFacts },
              (E, j) => anyDocReadHookBlocks(E, toolUseContext, j),
            )
          : Xr;
    for (let E of rl(messagesForQuery, qc, {
      querySource: querySource,
      resumeActive: resumeActive,
      stamp: deps,
      announcementWalk: toolUseContext.options.announcementWalk,
    }))
      (yield E, (messagesForQuery = [...messagesForQuery, E]));
    let mode = getToolPermissionContext(toolUseContext).mode,
      exceeds200kInPlanMode = mode === "plan" && doesMostRecentAssistantMessageExceed200k(messagesForQuery);
    if (isTopLevelMainThread) WS("request_announcements");
    if (
      (([attemptModel, attemptModelFacts] = await resolveModelAndFacts(messagesForQuery, mode)),
      isTopLevelMainThread)
    )
      jS("request_announcements");
    let configuredRuntimeModel = getRuntimeMainLoopModel({
        permissionMode: mode,
        mainLoopModel: getMainLoopModel(),
        exceeds200kTokens: exceeds200kInPlanMode,
      }),
      runtimeOptionsModel = getRuntimeMainLoopModel({
        permissionMode: mode,
        mainLoopModel: toolUseContext.options.mainLoopModel,
        exceeds200kTokens: exceeds200kInPlanMode,
      });
    for (let E of crossOrgThinkingAttachments(messagesForQuery, {
      querySource: querySource,
      mainThread: isMainThreadQuery && isMainAgent(toolUseContext.agentContext),
      model: runtimeOptionsModel,
      stamp: deps,
    }))
      (yield E, (messagesForQuery = [...messagesForQuery, E]));
    for (let E of await autoModeTurnAttachments(messagesForQuery, toolUseContext, {
      querySource: querySource,
      resumeActive: resumeActive,
      model: getRuntimeMainLoopModel({
        permissionMode: mode,
        mainLoopModel: getPrimaryModelForFallback(toolUseContext.options),
        exceeds200kTokens: exceeds200kInPlanMode,
      }),
      stamp: deps,
    }))
      (yield E, (messagesForQuery = [...messagesForQuery, E]));
    let advisorResolution = resolveAdvisorState(messagesForQuery, toolUseContext, {
      querySource: querySource,
      resumeActive: resumeActive,
      configuredRuntimeModel: configuredRuntimeModel,
      runtimeOptionsModel: runtimeOptionsModel,
      carrier: stickyBetas ?? getStickyBetas(),
      toolChangesRide: (E) => d$e(stickyBetas ?? getStickyBetas(), E),
    });
    if (advisorResolution.announcement !== void 0) {
      let E = createAttachmentMessage_2(advisorResolution.announcement, deps);
      (yield E, (messagesForQuery = [...messagesForQuery, E]));
    }
    (yield* pendingPollEventRows, (pendingPollEventRows = []));
    let {
        advisorModel: advisorModel,
        advisorDeferred: advisorDeferred,
        advisorActive: advisorActive,
      } = advisorResolution,
      ts = () => (Ot ? Ot.recorded : latestPromptSnapshot(messages)),
      promptRender = recordPromptSnapshot(messagesForQuery, systemPrompt, {
        options: toolUseContext.options,
        querySource: querySource,
        resumeActive: resumeActive,
        stamp: deps,
        inheritedReminderFold: () => ts()?.reminderFold,
        inheritedWireShape: () => ts()?.wireShape,
        inheritedEchoWireToolInputs: () => ts()?.echoWireToolInputs,
        contextRendering: contextRouting.rendering,
        toolDescribeEpoch: bt,
        turnSections: dt,
      });
    if (promptRender.record)
      (yield promptRender.record, (messagesForQuery = [...messagesForQuery, promptRender.record]));
    let reminderFold = resolveReminderFold_2(messagesForQuery);
    if (promptRender.atRenderPoint)
      try {
        if (
          (lse(
            stickyBetas ?? getStickyBetas(),
            promptRender.rewritten ? "prompt_invalidated" : "host_prompt",
          ),
          isMainThreadQuery && !toolUseContext.agentId)
        )
          expectPromptCacheDrop(MAIN);
      } catch (error) {
        logError(error);
      }
    let apiSystemPrompt = asSystemPrompt(
        appendSystemContextToPrompt(promptRender.systemPrompt, contextRouting.systemContext),
      ),
      inlineToolsDeclared,
      promptHeadSent,
      deferredToolsSent,
      toolInputCopiesSent,
      appendDeferredToolsRecord = () => {
        let E = recordDeferredTools(messagesForQuery, deferredToolsSent, {
          options: toolUseContext.options,
          querySource: querySource,
          stamp: deps,
          toolInputCopies: toolInputCopiesSent,
        });
        if (E) messagesForQuery = [...messagesForQuery, E];
        return E;
      };
    toolUseContext = {
      ...toolUseContext,
      messages: messagesForQuery,
      turnStartIndex: isHumanTurn(messagesForQuery),
      contextRoom: createContextRoomTracker(
        () => attemptModelFacts,
        toolUseContext.options.autoCompactWindow,
        () => messagesForQuery,
      ),
    };
    let markVirtualInResume = (E) => {
        if (resumeActive && jb(E)) E.virtualInResumeRun = !0;
        return E;
      },
      lastStopReason = null,
      truncatedResponse,
      withheldPromptTooLong,
      lastWithheldAssistant,
      refusalNoFallbackEvent,
      Mn = shouldRetryRefusal(querySource, refusalRetrySpent);
    if ((queryCheckpoint("query_setup_start"), isTopLevelMainThread))
      (WS("request_announcements"), jS("query_setup"));
    let attemptState = createStreamingState({
        createStreamingToolExecutor: () =>
          new StreamingToolExecutor(toolUseContext.options.tools, canUseTool, toolUseContext, deps.now),
        onReset: () => clearActiveMcpContext(toolUseContext.options, isMainOrSubagent),
      }),
      {
        assistantMessages: assistantMessages,
        toolResults: toolResults,
        toolUseBlocks: toolUseBlocks,
      } = attemptState;
    function noteToolMessageFlags(E) {
      if (
        ((attemptState.toolRequestedEndTurn = m5s(attemptState.toolRequestedEndTurn, getToolEndsTurnKind(E))),
        E.type !== "attachment")
      )
        return;
      if (E.attachment.type === "hook_stopped_continuation") attemptState.shouldPreventContinuation = !0;
      else if (E.attachment.type === "hook_deferred_tool") attemptState.toolWasDeferred = !0;
    }
    function recordToolResult(E, j) {
      if (((se &&= !hasAuthoritativePollEvents(E) && !toolUseBlocks.some(iCo)), E.type === "attachment")) {
        toolResults.push(E);
        return;
      }
      if (jb(E)) return;
      let pe;
      try {
        ((pe = normalizeMessagesForAPI(
          [E],
          j.options.refreshTools?.() ?? j.options.tools,
          toolUseContext.options.mainLoopModel,
          { reminderFold: reminderFold },
        )),
          validateImagesInMessages(
            pe,
            imageLimitsForModel(toolUseContext.options.mainLoopModel).maxBase64Size,
          ));
      } catch (error) {
        if (E.type === "user") toolResults.push(E);
        throw error;
      }
      toolResults.push(...pe.filter((me) => me.type === "user"));
    }
    function* drainCompletedToolResults(E = !0) {
      if (toolUseContext.abortController.signal.aborted) return;
      for (let j of attemptState.streamingToolExecutor.getCompletedResults()) {
        if (hasTypeField(j)) {
          yield j;
          continue;
        }
        if (j.message) {
          if (!E && xzo(j.message)) continue;
          (yield markVirtualInResume(j.message),
            noteToolMessageFlags(j.message),
            recordToolResult(j.message, toolUseContext));
        }
        if (j.toolDuration) attemptState.toolDurations.push(j.toolDuration);
      }
    }
    function* endTurnOnError(E) {
      let j = E instanceof ImageSizeError || E instanceof ImageResizeError,
        pe = E instanceof Error ? E.message : String(E);
      if (j) logForDebugging(`Query image error: ${pe}`, { level: "error" });
      else logError(withTelemetryMessage(toError(E), "queryLoop invariant broken"));
      try {
        let me;
        if (toolUseBlocks.length > 0) {
          try {
            yield* drainCompletedToolResults(!1);
          } catch (error) {
            logError(withTelemetryMessage(toError(error), "tool drain failed while ending the turn"));
          }
          me = resetStreamingToolExecutor(attemptState, j ? "image_error" : "model_error");
          for (let finishedResult of me.finishedResults) {
            if (xzo(finishedResult)) continue;
            try {
              (yield markVirtualInResume(finishedResult),
                noteToolMessageFlags(finishedResult),
                recordToolResult(finishedResult, toolUseContext));
            } catch (error) {
              logError(
                withTelemetryMessage(
                  toError(error),
                  "finished tool result not recorded while ending the turn",
                ),
              );
            }
          }
        }
        if (
          (yield* yieldMissingToolResultBlocks(
            assistantMessages,
            j ? IMAGE_ERROR_TOOL_CANCEL_TEXT : turnErrorToolCancelText(pe),
            deps,
            completedToolUseIds(attemptState),
          ),
          me?.removes)
        )
          yield me.removes;
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "tool_result pairing failed while ending the turn"));
      }
      try {
        let me = createApiErrorMessage(
          j
            ? { content: pe, error: "invalid_request", errorDetails: pe, now: deps.now, uuid: deps.uuid }
            : { content: pe, now: deps.now, uuid: deps.uuid },
        );
        (yield me, markClassifierApiFailure(toolUseContext, querySource, me));
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "error frame failed while ending the turn"));
      }
      if (j) return { reason: "image_error" };
      return (logAntError("Query error", E), { reason: "model_error", error: E });
    }
    function* yieldWithRefusalNotice(E) {
      (yield* yieldRefusalNoFallbackNotice(), yield E);
    }
    function* yieldRefusalNoFallbackNotice() {
      if (isMainThread && refusalNoFallbackEvent)
        yield {
          type: "system",
          subtype: "model_refusal_no_fallback",
          content: "",
          level: "warning",
          originalModel: refusalNoFallbackEvent.originalModel,
          requestId: refusalNoFallbackEvent.requestId,
          apiRefusalCategory: refusalNoFallbackEvent.apiRefusalCategory,
          apiRefusalExplanation: refusalNoFallbackEvent.apiRefusalExplanation,
          refusedUserMessageUuid: refusedUserMessageUuid,
          isMeta: !1,
          timestamp: deps.now(),
          uuid: deps.uuid(),
        };
    }
    let appState = toolUseContext.getAppState(),
      autoModeContextPromise = checkAutoModeRequested(toolUseContext, stickyBetas ?? getStickyBetas()),
      permissionModeAtRequest = au(toolUseContext),
      defaultModelInfo = {};
    if (isMainThread)
      try {
        let E = getUsageCreditsOnlyModelConsentDeclineFallback();
        defaultModelInfo = Il({
          userModel: sessionModel,
          permissionMode: mode,
          exceeds200kTokens: exceeds200kInPlanMode,
          automaticModels: [
            getActiveModelFallback()?.fallbackModel,
            E !== null && getMainLoopModelOverride() === E ? E : void 0,
          ],
        });
      } catch (error) {
        (logError(toError(error)), (defaultModelInfo = {}));
      }
    if (sWt(attemptModel, toolUseContext.requestDialog)) {
      let E = "cancelled",
        j = !1,
        pe = !1,
        me = !1,
        he =
          KYs({ requestDialog: toolUseContext.requestDialog, isMainThread: isMainThread }) &&
          !toolUseContext.abortController.signal.aborted;
      if (he && toolUseContext.requestDialog) {
        let signal = toolUseContext.abortController.signal,
          qe = getUserDialogTimeoutMs(),
          Ne = !isSdkDialogHostActive() && isUnattendedInteractiveSession(),
          abortController = new AbortController(),
          Ee = () => abortController.abort();
        signal.addEventListener("abort", Ee, { once: !0 });
        let Ie = !1,
          now = Date.now(),
          lt =
            Ne && !isBgSession()
              ? onInteraction(() => {
                  if (Date.now() - now > 1000) Ie = !0;
                })
              : () => {},
          Je = (Kt) => Kt.uuid ?? Kt,
          gt = new Set(
            toolUseContext.messageQueue.getCommandQueueSnapshot().filter(isPromptModeQueuedCommand).map(Je),
          ),
          Et = () => {
            if (
              (flushInteractionTime(),
              !Ie &&
                toolUseContext.messageQueue
                  .getCommandQueueSnapshot()
                  .some((Kt) => isPromptModeQueuedCommand(Kt) && !gt.has(Je(Kt))))
            )
              ((pe = !0), abortController.abort());
          },
          eo = Ne ? toolUseContext.messageQueue.subscribe(Et) : () => {},
          ko =
            Ne && qe > 0
              ? setTimeout(
                  (Kt) => {
                    if ((flushInteractionTime(), !Ie)) Kt.abort();
                  },
                  qe,
                  abortController,
                )
              : void 0,
          lo = !1;
        try {
          E = await toolUseContext.requestDialog(
            FABLE_OVERAGE_CONSENT_DIALOG,
            {
              overagesEnabled: hasExtraUsageProvisioned(),
              modelName: renderUsageCreditsOnlyModelName(attemptModel),
              model: attemptModel,
            },
            {
              signal: abortController.signal,
              onSettledUnanswered: (Kt) => {
                ((lo = !0), (pe ||= Kt === "moved_on"));
              },
              onAnsweredOverBridge: () => {
                me = !0;
              },
            },
          );
        } finally {
          (clearTimeout(ko), lt(), eo(), signal.removeEventListener("abort", Ee));
        }
        j = E === "cancelled" && (abortController.signal.aborted || lo || me) && !signal.aborted;
      }
      let be =
        E === "consent" &&
        (await recordCreditsOnlyConsent(attemptModel, toolUseContext.storageV5, toolUseContext.credentials, {
          sessionOnly: me,
        }));
      if (!be && toolUseContext.abortController.signal.aborted) {
        if (!isSilentAbortReason(toolUseContext.abortController.signal.reason))
          yield createUserInterruptionMessage({
            toolUse: !1,
            interruptedMessageId: getInterruptedMessageId(toolUseContext),
            interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
            now: deps.now,
            uuidFn: deps.uuid,
          });
        return (markClassifierTurnAborted(toolUseContext, querySource), { reason: "aborted_streaming" });
      }
      if (j) {
        if (me) logFeatureSad("model_fable_consent", "remote_cancelled");
        else logFeatureBad("model_fable_consent", pe ? "dialog_queued_at_park" : "dialog_unanswered");
        let te = me
            ? "was closed from Remote Control without a choice \u2014 nothing was sent \xB7 it asks again on your next message, or /model to change"
            : "went unanswered \u2014 nothing was sent \xB7 answer it where this session is running, or /model to change",
          qe = renderUsageCreditsOnlyModelName(attemptModel),
          Ne = createApiErrorMessage({
            content:
              isUsageCreditsModelBilled(attemptModel) || !isFableFamilyOrPinnedModel(attemptModel)
                ? `${qe} now uses usage credits \xB7 the prompt to confirm ${te}`
                : `Fable limit reached \xB7 continuing on ${qe} uses usage credits, and the prompt to confirm ${te}`,
            apiError: "consent_unanswered",
            now: deps.now,
            uuid: deps.uuid,
          });
        return (
          yield Ne,
          markClassifierApiFailure(toolUseContext, querySource, Ne),
          { reason: "model_error", error: Error("Usage-credits-only model consent dialog was not answered") }
        );
      }
      if (he && (isSdkDialogHostActive() || me))
        if (be) logFeatureOk("model_fable_consent");
        else if (E === "consent") logFeatureSad("model_fable_consent", "overage_enable_deferred");
        else if (E === "switch_default") logFeatureBad("model_fable_consent", "declined");
        else logFeatureSad("model_fable_consent", "dismissed");
      if (!be) {
        if (!he && isMainThread) logFeatureSad("model_fable_consent", "no_dialog_fallback");
        let te = getUsageCreditsOnlyModelConsentDeclineFallback();
        if (te === null) {
          let ke = isNoModelFallbackEnabled();
          if (isMainThread)
            logFeatureBad("model_fable_consent", ke ? "no_model_fallback_env" : "no_allowed_fallback");
          let Ee = createApiErrorMessage({
            content: ke
              ? "CLAUDE_CODE_NO_MODEL_FALLBACK is set: model substitution is disabled \xB7 unset it to allow the swap"
              : `Your model policy only allows ${renderUsageCreditsOnlyModelName(attemptModel)}, which requires usage credits \xB7 /model to set it up`,
            apiError: ke ? "model_substitution_disabled" : "no_allowed_fallback",
            now: deps.now,
            uuid: deps.uuid,
          });
          return (
            yield Ee,
            markClassifierApiFailure(toolUseContext, querySource, Ee),
            {
              reason: "model_error",
              error: ke
                ? Error("CLAUDE_CODE_NO_MODEL_FALLBACK forbids model substitution")
                : Error(
                    "Usage-credits-only model consent declined and the model policy allows no other fallback",
                  ),
            }
          );
        }
        let qe = attemptModel,
          Ne = !1;
        if (isMainThread) {
          if (E === "switch_default" && !me)
            Ne = switchDefaultFromCreditsOnlyModel(qe, te, toolUseContext.storageV5);
          (toolUseContext.setAppState((ke) => ({ ...ke, mainLoopModel: te, mainLoopModelForSession: null })),
            setMainLoopModelOverride(te),
            (config = Vwt()));
          try {
            let fastMode = toolUseContext.getAppState().fastMode,
              Ee = isFastModeEnabled() ? isFastModeActive(te, fastMode) : !!fastMode;
            if (Ee !== !!fastMode)
              (toolUseContext.setAppState((Ie) => ({ ...Ie, fastMode: Ee })),
                reportFastModeToggle(fastMode, Ee));
          } catch (error) {
            logError(error);
          }
        }
        if (
          ((toolUseContext.options = {
            ...toolUseContext.options,
            mainLoopModel: te,
            availabilityFallback: void 0,
          }),
          setAttemptModel(te),
          (consentOverride = te),
          yield { type: "query_model_change", toModel: te },
          isMainThread)
        )
          yield {
            type: "system",
            subtype: "model_consent_fallback",
            content: `Switched to ${renderModelName(te)} ${Ne ? "\u2014 now your default model" : "for this session"} \xB7 ${renderModelName(qe)} requires usage credits \xB7 /model to change`,
            level: "warning",
            choice: E,
            originalModel: qe,
            originalModelName: renderUsageCreditsOnlyModelName(qe),
            fallbackModel: te,
            persistedAsDefault: Ne,
            isMeta: !1,
            timestamp: deps.now(),
            uuid: deps.uuid(),
          };
      }
    }
    if ((queryCheckpoint("query_setup_end"), isTopLevelMainThread)) WS("query_setup");
    let zi =
        queryConfig.gates.isAnt && classifyQuerySource(querySource) !== "auxiliary"
          ? createDumpPromptsFetch(toolUseContext.agentId ?? queryConfig.sessionId, toolUseContext.storageV5)
          : void 0,
      Xi = zi,
      yr = classifyQuerySource(querySource) === "main" && !toolUseContext.agentId;
    if (teleportFetchModule && (yr || relayFork))
      try {
        let E = yr ? messages : messagesForQuery,
          j = yr ? Ot?.uuids : void 0;
        Xi = teleportFetchModule.composeTeleportFetchOverride(
          zi,
          () => j ?? E.map((pe) => pe.uuid),
          yr ? "main" : "fork",
          E,
        );
      } catch (error) {
        logError(error);
      }
    let Zi = isAutoCompactEnabled() && canCompactInRemote(),
      Wc =
        Zi &&
        (!abe(attemptModelFacts, toolUseContext.options.autoCompactWindow) ||
          usesLongContextWindow(querySource, attemptModelFacts, toolUseContext.options.autoCompactWindow));
    if (
      autocompactOutcome.kind !== "compacted" &&
      querySource !== "compact" &&
      !Wc &&
      !toolUseContext.abortController.signal.aborted
    ) {
      let E = Tp(messagesForQuery, attemptModelFacts.bytesPerToken) - snipTokensFreed;
      if (
        calculateTokenWarningState(E, attemptModelFacts, toolUseContext.options.autoCompactWindow).level ===
        "blocked"
      ) {
        let pe = isCompactQuerySource(querySource),
          me = autocompactOutcome.kind === "failed" ? autocompactOutcome.compactFailure : void 0,
          he = pe
            ? {}
            : compactCheckFacts({
                outcome: autocompactOutcome,
                compactionCheckFacts: compactionCheckFacts,
                blockingCheck: { tokenCount: E, facts: attemptModelFacts },
                configuredWindow: toolUseContext.options.autoCompactWindow,
              });
        if (
          !pe &&
          Zi &&
          (shouldBypassPtlPreempt(
            attemptModelFacts,
            toolUseContext.options.autoCompactWindow,
            querySource,
            me,
          ) ||
            isCompactNotNeededAtLimit(autocompactOutcome, attemptModelFacts, he))
        );
        else {
          if (!pe)
            logEvent("tengu_ptl_surfaced_to_user", {
              reason: lit("blocking_limit"),
              querySource: agentTypeForTelemetry(querySource),
              wasGatedByPriorAttempt: !1,
              reactiveUnsupported: !canCompactInRemote(),
              compactFailureReason: fromEnumOpt(me?.reason),
              ...he,
            });
          let be = createApiErrorMessage({
            content: compactFailureDetail(me) ?? PROMPT_TOO_LONG_ERROR_MESSAGE,
            error: "invalid_request",
            now: deps.now,
            uuid: deps.uuid,
          });
          return (
            yield be,
            markClassifierApiFailure(toolUseContext, querySource, be),
            { reason: "blocking_limit" }
          );
        }
      }
    }
    let ms = state.transition === void 0 ? params.keptFirstResponse : void 0,
      needsAttempt = !adoptFallbackResponse(attemptState, ms);
    if (needsAttempt && ms !== void 0) yield clearInProgressToolUses(ms);
    let Ao,
      ln = !1,
      Lo,
      dn,
      fs,
      gs,
      Rn = { mintedStateless: !1, delivery: void 0 },
      hs,
      _s,
      Ss,
      ea,
      refusalCascadeState = Js,
      provisionalRefusalNotice;
    function buildRefusalFallbackNotice(E, j, pe) {
      return {
        type: "system",
        subtype: "model_refusal_fallback",
        direction: "retry",
        scope: "session",
        content: buildRefusalMessage(E.originModel, E.servingModel, E.apiRefusalCategory),
        level: "warning",
        trigger: "refusal",
        originalModel: E.originModel,
        fallbackModel: E.servingModel,
        requestId: E.requestId,
        apiRefusalCategory: E.apiRefusalCategory,
        apiRefusalExplanation: null,
        retractedMessageUuids: [...E.retractedMessageUuids],
        refusedUserMessageUuid: E.refusedUserMessageUuid,
        ...(E.sawCyberRefusal && { sawCyberRefusal: !0 }),
        isMeta: !1,
        timestamp: deps.now(),
        uuid: j,
        ...(pe && { provisional: pe }),
      };
    }
    let Qc = isMainOrSubagent ? toolUseContext.options.activeMcpServer : void 0,
      $c = isMainOrSubagent ? toolUseContext.options.activeMcpTool : void 0;
    (clearActiveMcpContext(toolUseContext.options, isMainOrSubagent),
      queryCheckpoint("query_api_loop_start"),
      Li?.disarm());
    try {
      while (needsAttempt) {
        if (((needsAttempt = !1), resumeActive && (Lo !== void 0 || !Di(attemptModel)))) resumeActive = !1;
        let E =
          advisorModel !== void 0 &&
          (isSameModelFamilyId(attemptModel, configuredRuntimeModel) ||
            canAdviseModelLenient(attemptModel, advisorModel))
            ? advisorModel
            : void 0;
        if (advisorModel !== void 0 && E === void 0)
          logForDebugging(
            `[AdvisorTool] Skipping advisor - ${advisorModel} cannot advise non-configured attempt model ${attemptModel} (configured: ${configuredRuntimeModel}) \u2014 dropped for this attempt`,
          );
        if (At !== void 0)
          if (Me) ((At = void 0), (Me = !1));
          else Me = !0;
        let j = nextFallbackModel_2(modelChain, chainIndex, attemptModel),
          pe = assistantMessages.length,
          me,
          he,
          be = [],
          te,
          qe = !1;
        function* Ne() {
          let Je = me;
          if (Je === void 0) return 0;
          let gt = [];
          for (let Et = assistantMessages.length - 1; Et >= 0; Et--)
            if (Je.has(assistantMessages[Et].uuid))
              (gt.unshift(assistantMessages[Et]), assistantMessages.splice(Et, 1));
          be.push(...gt);
          for (let message of gt) yield { type: "tombstone", message: message };
          return gt.length;
        }
        function* ke() {
          let uuid = deps.uuid(),
            { notice: notice, state: state } = Ul(refusalCascadeState, uuid);
          if (((refusalCascadeState = state), notice === void 0)) return;
          let eo = buildRefusalFallbackNotice(notice, uuid, !0);
          ((provisionalRefusalNotice = eo), yield eo);
        }
        function* Ee() {
          let { notice: notice, state: state } = takeFallbackNotice(refusalCascadeState);
          if (((refusalCascadeState = state), (provisionalRefusalNotice = void 0), notice === void 0)) return;
          yield buildRefusalFallbackNotice(notice, deps.uuid());
        }
        function* Ie() {
          let Je = he;
          if (Je === void 0) return;
          if (be.length > 0)
            Je.retractedMessageUuids = be.flatMap((gt) =>
              normalizeMessages([gt])
                .filter(isNotEmptyMessage)
                .map((Et) => Et.uuid),
            );
          ((Je.refusedUserMessageUuid = refusedUserMessageUuid), yield Je, (he = void 0));
        }
        let ct, fallbackError;
        e: try {
          let Je = [],
            gt = [],
            takePlainDelta = params.takePlainDelta,
            eo = nextFallbackStage(refusalCascadeState, attemptModel, refusalCascadeResolver);
          refusalCascadeState = eo.state;
          let ko = !Mn && eo.armTarget === void 0 ? resolveLatchedFallbackModel(attemptModel) : void 0,
            lo = attemptModel,
            Kt = {},
            Yo =
              !Mn && !kt && !refusalFallbackDeclined
                ? (O, $e, Co) => {
                    if (kt || refusalFallbackDeclined) return;
                    let co = resolveLatchedFallbackModel(lo, {
                      visibleRouteDeclined: O,
                      apiRefusalCategory: $e,
                      responseSwapped: Co,
                    });
                    if (co === void 0 || !isSonnetWithoutArcades(co)) return co;
                    let streamingToolExecutor = attemptState.streamingToolExecutor;
                    if (streamingToolExecutor.hasStartedToolCall()) return;
                    try {
                      let {
                        aborted: aborted,
                        completedBeforeEvent: completedBeforeEvent,
                        queuedNeverStarted: queuedNeverStarted,
                      } = streamingToolExecutor.discardAndAbortInFlight(serverFallbackTombstoneAbortReason());
                      Kt.counts = {
                        aborted: aborted,
                        completedBeforeEvent: completedBeforeEvent,
                        queuedNeverStarted: queuedNeverStarted,
                      };
                    } catch (error) {
                      logError(error);
                    }
                    return co;
                  }
                : void 0,
            Uo = canShowRefusalDialog(),
            Vo = fromEnum(getSdkDialogCapabilitySource()),
            vo = Rci(toolUseContext.permissionRelays?.bridge?.dialog, () =>
              getFeatureValue_CACHED_MAY_BE_STALE("tengu_loggia_denkbild", !1),
            ),
            uo = toolUseContext.getAppState().replBridgeSessionActive && vo === void 0,
            zt = Uo || uo,
            currentModel = shouldAskRefusalFallbackPreference({
              toolUseContext: toolUseContext,
              isMainThread: isMainThread,
            }),
            _o = !Mn
              ? resolveRefusalFallback({
                  currentModel: attemptModel,
                  compiledTablesOnly: isAutoModeQuerySource(querySource),
                  alreadyUsed: eo.armTarget === void 0 && ti(refusalFallbacksUsed, RXo()),
                  declined: refusalFallbackDeclined,
                  inCascadeEpisode: refusalCascadeState.inEpisode,
                  cascadeNext: eo.armTarget,
                  suppressionAlreadyLogged: it,
                  requestDialog: toolUseContext.requestDialog,
                  isMainThread: isMainThread,
                  consumerLacksDialogCapability: zt,
                  preferenceQuestionPending: currentModel,
                  serverDefaultFallbacksEnabled: () =>
                    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DASH_FLAME, !1),
                  selfTargetDefaultFallbacksEnabled: () =>
                    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ELEGANT_POSSUM, !1),
                  sticky: stickyBetas ?? getStickyBetas(),
                  threadedRequest: canUseNoTransientReminders(
                    querySource,
                    toolUseContext.agentId,
                    attemptModel,
                  ),
                })
              : freeze_13;
          if (_o.shouldLogSuppression)
            ((it = !0),
              logEvent("tengu_refusal_fallback_suppressed", {
                reason:
                  toolUseContext.requestDialog === void 0
                    ? lit("no_dialog_host_setting_off")
                    : Uo
                      ? lit("no_consumer_capability_setting_off")
                      : lit("remote_controlled_session_setting_off"),
                capability_source: Vo,
              }));
          let serverLane = _o.serverLane,
            pn = serverLane === void 0 ? _o.visibleModel : void 0,
            Sr = kt ? void 0 : ko,
            mn = dn;
          dn = void 0;
          let ua = fs;
          fs = void 0;
          let Jc = gs;
          gs = void 0;
          let Es = mn !== void 0 && Rn.mintedStateless;
          Rn.mintedStateless = !1;
          let Zc = Es ? Rn.delivery : void 0;
          Rn.delivery = void 0;
          let pa = hs;
          hs = void 0;
          let ep = _s;
          _s = void 0;
          let tp = Ss;
          Ss = void 0;
          let op =
            !refusalFallbackDeclined &&
            ko !== void 0 &&
            pn === void 0 &&
            serverLane === void 0 &&
            mn === void 0;
          if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
          queryCheckpoint("query_api_streaming_start");
          let rr = ua ?? attemptModel,
            Rs = { messages: messagesForQuery, text: null, secondaryText: null, afterUuid: null },
            br =
              Lo !== void 0
                ? freeze
                : decideReminderDelivery({
                    querySource: querySource,
                    agentId: toolUseContext.agentId,
                    model: attemptModel,
                    reminderModel: rr,
                    messages: messagesForQuery,
                    session: toolUseContext.session,
                    stamp: deps,
                    decide: reminderDeliveryMode,
                    deliveryOverride: Zc,
                    creditRetryStateless: Es,
                    recordedKeptReminders: promptRender.recordedWireShape?.keptReminders,
                    recordsDue: applyReminders,
                    createRecord: createAttachmentMessage_2,
                  }),
            reminderDelivery;
          if (Lo !== void 0) reminderDelivery = { ...Rs, messages: [...messagesForQuery, Lo] };
          else if (br.delivery === "kept") {
            for (let record of br.records) (yield record, (messagesForQuery = [...messagesForQuery, record]));
            reminderDelivery = { ...Rs, messages: messagesForQuery };
          } else if (br.delivery === "none") reminderDelivery = Rs;
          else reminderDelivery = placeBatchingReminder(messagesForQuery, toolUseContext.session, rr);
          for (let [O, $e] of [
            ["batching_reminder_sent", reminderDelivery.text],
            ["secondary_reminder_sent", reminderDelivery.secondaryText],
          ]) {
            let Co = sentReminderTexts.get(O);
            if (
              $e === null ||
              reminderDelivery.afterUuid === null ||
              (Co?.afterUuid === reminderDelivery.afterUuid && Co.text === $e && Co.model === rr)
            )
              continue;
            sentReminderTexts.set(O, { afterUuid: reminderDelivery.afterUuid, text: $e, model: rr });
            let co = createAttachmentMessage_2({ type: O, text: $e, model: rr }, deps);
            (yield co, (messagesForQuery = [...messagesForQuery, co]));
          }
          let ma = isTopLevelMainThread && autoModeContextPromise !== void 0;
          if (ma) jS("auto_mode_context_wait");
          let vs = await du(autoModeContextPromise);
          if (ma) WS("auto_mode_context_wait");
          ((deferredToolsSent = void 0), (toolInputCopiesSent = void 0));
          let fa = !1,
            callModel = deps.callModel,
            callModelParams = {
              systemPrompt: systemPrompt,
              userContext: userContext,
              systemContext: systemContext,
              toolUseContext: toolUseContext,
              querySource: querySource,
            };
          if (callModel === deps.callModel)
            (call({ ...callModelParams, messages: messagesForQuery }),
              applyToolExclusionEdit(
                messagesForQuery,
                querySource,
                attemptModel,
                toolUseContext.agentId,
                forkPointUuid,
                toolUseContext.readFileState,
              ));
          let np = callModel;
          for await (let event of drainToolResults(
            np({
              messages: contextRouting.bare
                ? prependUserContextReminder(reminderDelivery.messages, contextRouting.userContext)
                : reminderDelivery.messages,
              systemPrompt: apiSystemPrompt,
              thinkingConfig: getThinkingConfig(toolUseContext),
              tools: toolUseContext.options.tools,
              signal: toolUseContext.abortController.signal,
              options: {
                clock: toolUseContext.session.host.clock,
                random: deps.random,
                async getToolPermissionContext() {
                  return getToolPermissionContext(toolUseContext);
                },
                recordedToolDescriptions: promptRender.toolDescriptions,
                recordedToolEntries: promptRender.toolEntries,
                recordedToolServers: promptRender.toolServers,
                redescribedTools: promptRender.redescribing?.names,
                recordedCliPrefix: promptRender.recordedCliPrefix,
                recordedWireShape: promptRender.recordedWireShape,
                systemPromptSource: promptRender.source,
                systemPromptSnapshotHash: promptRender.snapshotHash,
                onInlineToolsDeclared: ($e) => {
                  inlineToolsDeclared = $e;
                },
                onPromptHeadSent: ($e) => {
                  promptHeadSent = $e;
                },
                recordedDeferredTools: () => recordedDeferredTools(messagesForQuery),
                onDeferredToolsSent: ($e) => {
                  deferredToolsSent = $e;
                },
                onToolInputCopiesSent: ($e) => {
                  toolInputCopiesSent = $e;
                },
                model: attemptModel,
                modelFacts: attemptModelFacts,
                promptRenderEpoch: nt,
                isDefaultModel: defaultModelInfo.isDefaultModel,
                defaultModel: defaultModelInfo.defaultModel,
                ...(queryConfig.gates.fastModeEnabled && { fastMode: toolUseContext.options.fastMode }),
                modelIsRefusalFallbackTarget: isFallbackServedRequest({
                  requestModel: attemptModel,
                  turnRefusalOverride: refusalOverride,
                  chainStepModel: chainIndex > 0 ? modelChain[chainIndex] : void 0,
                  userModel: sessionModel,
                }),
                toolChoice: toolChoice,
                isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
                withoutToolDescribeHooks: toolUseContext.options.settingsHooksOff,
                fallbackModel: modelChain[chainIndex + 1],
                accessFallbackModel: j,
                refusalFallbackModel: !refusalFallbackDeclined ? (pn ?? Sr) : void 0,
                refusalFallbackModelLane: !refusalFallbackDeclined
                  ? pn !== void 0
                    ? "visible"
                    : Sr !== void 0
                      ? "silent"
                      : void 0
                  : void 0,
                refusalFallbackCascadeHop: pn !== void 0 ? eo.hop : void 0,
                refusalFallbackSilentArmActive: op,
                refusalFallbackSilentRearm: Yo,
                serverRefusalFallback: serverLane,
                fallbackCreditCode: mn,
                autoModeServerContext: vs,
                ...(vs !== void 0 &&
                  (lu(toolUseContext) || vs.judgeOnlyTools !== void 0) && { serverClassifier: !0 }),
                fallbackCreditMintModel: ua,
                fallbackCreditMintRequestId: Jc,
                fallbackCreditMintedStateless: Es,
                fallbackStampFromModel: pa,
                fallbackStampCategory: ep,
                fallbackStampTrigger: tp,
                fallbackStampOriginalRequestId: pa !== void 0 ? ea : void 0,
                fallbackCreditLaneArmed: _o.visibleModel !== void 0,
                querySource: querySource,
                keepPartialMessageOnAbort: params.keepPartialMessageOnAbort,
                spawnedBySkill: spawnedBySkill,
                activeSkill: toolUseContext.options.activeSkill,
                activeMcpServer: Qc,
                activeMcpTool: $c,
                messageClientPlatform: toolUseContext.options.messageClientPlatform,
                agents: toolUseContext.options.agentDefinitions.activeAgents,
                allowedAgentTypes: toolUseContext.options.agentDefinitions.allowedAgentTypes,
                hasAppendSystemPrompt: !!toolUseContext.options.appendSystemPrompt,
                userSystemPrompt:
                  !toolUseContext.agentId && isBetaTracingEnabled()
                    ? joinCustomAndAppendSystemPrompt(
                        toolUseContext.options.customSystemPrompt,
                        toolUseContext.options.appendSystemPrompt,
                      )
                    : void 0,
                maxOutputTokensOverride: maxOutputTokensOverride,
                resumeIncompleteThinking: resumeActive,
                fetchOverride: Xi,
                mcpTools: appState.mcp.tools,
                promptTooLongIsHandled: !0,
                hasPendingMcpServers: appState.mcp.clients.some((client) => client.type === "pending"),
                toolPoolRefreshes: toolUseContext.options.refreshTools !== void 0,
                mcpClients: toolUseContext.options.mcpClients,
                queryTracking: queryTracking,
                effortValue: getEffortValue(toolUseContext),
                effortSetAsideByHold: getEffortSetAsideByHold(toolUseContext),
                turnEffort: getEffortLayerOverride(toolUseContext.permissionLayers),
                refusalFallbackEffort: VZo(refusalOverride, loopEffort),
                advisorModel: E,
                advisorDeferred: advisorDeferred,
                advisorActive: advisorActive,
                skipCacheWrite: skipCacheWrite,
                skipMessageCacheMarkers: skipMessageCacheMarkers,
                compactionRequestKind: compactionRequestKind,
                apiAttemptsLeft: apiAttemptsLeft,
                prevToolDurations: prevToolDurations,
                evictCacheOnComplete: evictCacheOnComplete,
                agentCacheTtlOverride: agentCacheTtlOverride,
                forkPointUuid: forkPointUuid,
                divergesAtMessageId: divergesAtMessageId,
                thinkingStripPlan: thinkingStripPlan,
                advisorStripPlan: advisorStripPlan,
                stickyBetas: stickyBetas,
                proactivityLevel: currentProactivityLevel(toolUseContext),
                agentId: toolUseContext.agentId,
                agentContext: toolUseContext.agentContext,
                credentials: toolUseContext.credentials,
                storageV5: toolUseContext.storageV5,
                isBackgroundAgent: toolUseContext.isBackgroundAgent,
                modelCallNames: toolUseContext.modelCallNames,
                onRetryStatus: toolUseContext.onRetryStatus,
                subscribeRetryWake: toolUseContext.subscribeRetryWake,
                ...(params.taskBudget && {
                  taskBudget: {
                    total: params.taskBudget.total,
                    ...(taskBudgetRemaining !== void 0 && { remaining: taskBudgetRemaining }),
                  },
                }),
              },
            }),
            () => attemptState.streamingToolExecutor,
            takePlainDelta === void 0
              ? void 0
              : guardGoalCheck("query", () => gt.length === 0, takePlainDelta),
          )) {
            if (event.type === "tool_drain_tick") {
              yield* drainCompletedToolResults();
              continue;
            }
            if (event.type === "model_fallback_triggered") {
              fallbackError = event.error;
              break e;
            }
            if (!fa && event.type === "assistant" && !event.isApiErrorMessage) {
              if (((fa = !0), !resumeActive)) {
                let Se = appendDeferredToolsRecord();
                if (Se) yield Se;
              }
            }
            if (event.type === "attachment") {
              (yield event,
                (messagesForQuery = [...messagesForQuery, event]),
                call({ ...callModelParams, messages: messagesForQuery }));
              continue;
            }
            if (event.type === "hint_clears") {
              let Se = new Set(event.ids);
              for (let message of hasMemoryFileRead_2(messagesForQuery, Se)) {
                let We = expandPathOrNull(message);
                if (We === null) {
                  logForDebugging(
                    "hint_clears: a cleared Read has a file_path that cannot be expanded (null byte in it or in the working directory); leaving readFileState as is",
                  );
                  continue;
                }
                toolUseContext.readFileState.delete(We);
              }
              ((messagesForQuery = replaceToolResultContent(
                messagesForQuery,
                Se,
                new Map(Object.entries(event.contentById)),
              )),
                call({ ...callModelParams, messages: messagesForQuery }),
                yield event);
              continue;
            }
            if (event.type === "server_fallback") {
              let Se = describeServerFallback(event, {
                isMainThread: isMainThread,
                emitsLocalScope: emitsLocalScope,
              });
              if (
                (logEvent("tengu_rotunda_pennant_applied", {
                  reason: fromEnum(Se.telemetry.reason),
                  entitlement_blind: isEntitlementOverlayUnavailable(),
                  armed_mode: fromEnum(serverLane?.mode ?? "none"),
                  mid_stream: Se.telemetry.midStream,
                  discarded_block_count: Se.telemetry.discardedBlockCount,
                  tombstoned_had_tool_use: Se.telemetry.tombstonedHadToolUse,
                  request_id_sha12: Se.telemetry.requestId !== null ? gn(Se.telemetry.requestId) : void 0,
                  original_model_scope: fromEnum(Se.telemetry.originalModelScope),
                  queryChainId: queryChainIdForAnalytics,
                  queryDepth: queryTracking.depth,
                  querySource: agentTypeForTelemetry(querySource),
                  final_stop_reason: fromEnumOpt(Se.telemetry.finalStopReason ?? void 0),
                  api_refusal_category: fromEnumOpt(Se.telemetry.apiRefusalCategory),
                  ...refusedEffortTelemetryFields(event.refusedEffort),
                }),
                Se.userVisible)
              ) {
                logFeatureOk("refusal_fallback");
                let ze = attemptModel,
                  We = uJn(serverLane?.model, event.toModel),
                  no = attemptModel === We;
                if (!(
                  isModelAllowedUnderActiveEnforcement(event.toModel) ??
                  (isModelAllowed(event.toModel) || isExemptDefaultResolvingPick(event.toModel))
                )) {
                  if (
                    (logForDebugging(
                      `Server refusal-fallback target "${event.toModel}" is not in the availableModels allowlist; declining the swap`,
                      { level: "warn" },
                    ),
                    (refusalFallbackDeclined = !0),
                    serverLane?.mode === "default" && jw !== null)
                  )
                    Xg(stickyBetas ?? getStickyBetas(), jw);
                  let He = [];
                  for (let discardedMessage of event.discardedMessages) {
                    let index = assistantMessages.findIndex((sr) => sr.uuid === discardedMessage.uuid);
                    if (index !== -1) assistantMessages.splice(index, 1);
                    He.push(discardedMessage);
                  }
                  for (let Rt = assistantMessages.length - 1; Rt >= 0; Rt--) {
                    let fo = assistantMessages[Rt];
                    if (fo.message.model === event.toModel) (assistantMessages.splice(Rt, 1), He.push(fo));
                  }
                  let sliced = toolResults.slice();
                  (attemptState.reset({ clearAssistantMessages: !1 }), (Je.length = 0));
                  let discardAndAbortInFlight = attemptState.streamingToolExecutor.discardAndAbortInFlight(
                    serverFallbackTombstoneAbortReason(),
                  );
                  (logEvent("tengu_rotunda_pennant_tools", {
                    lane: lit("decline"),
                    aborted: discardAndAbortInFlight.aborted,
                    completed_before_event: discardAndAbortInFlight.completedBeforeEvent,
                    queued_never_started: discardAndAbortInFlight.queuedNeverStarted,
                    compensated_removes: discardAndAbortInFlight.toolUseIds.length,
                  }),
                    attemptState.rebuildStreamingToolExecutor());
                  for (let Rt of He) yield { type: "tombstone", message: Rt };
                  for (let Rt of sliced) yield { type: "tombstone", message: Rt };
                  if (discardAndAbortInFlight.toolUseIds.length > 0)
                    yield {
                      type: "set_in_progress_tool_use_ids",
                      op: { action: "remove", ids: discardAndAbortInFlight.toolUseIds },
                    };
                  let Zo =
                    event.reason === "refusal"
                      ? getRefusalMessage(
                          "refusal",
                          {
                            type: "refusal",
                            category: event.apiRefusalCategory ?? null,
                            explanation: null,
                            fallback_credit_token: null,
                            fallback_has_prefill_claim: null,
                            recommended_model: null,
                          },
                          event.requestId,
                          attemptModel,
                        )
                      : createApiErrorMessage({
                          content:
                            "The server routed this response to a model that is not in your organization\u2019s availableModels allowlist; the response was discarded.",
                          error: "invalid_request",
                          now: deps.now,
                          uuid: deps.uuid,
                        });
                  if (Zo) (await transcriptTap.appended(Zo), assistantMessages.push(Zo), yield Zo);
                  break;
                }
                refusalFallbacksUsed += 1;
                let Ht = resolveRefusalFallbackEffort({
                  refusedEffort: event.refusedEffort,
                  fallbackModel: We,
                  heldBySession: Se.swapSession && isMainConversationContext(toolUseContext.agentContext),
                  loopOverride: refusalOverride,
                  loopEffort: loopEffort,
                });
                if (
                  ((refusalOverride = We),
                  (loopEffort = Ht.loopEffort),
                  setAttemptModel(We),
                  resumeActive && !Di(We))
                )
                  resumeActive = !1;
                if (Se.swapSession) {
                  if (event.reason === "refusal" && event.apiRefusalCategory === "cyber")
                    markRefusalFallbackHeaderArmed(event.requestId ?? void 0);
                  let appState = toolUseContext.getAppState();
                  latchRefusalFallbackModel({
                    fallbackModel: We,
                    previousOverride: getMainLoopModelOverride(),
                    previousAppStateModel: appState.mainLoopModel,
                    previousModelForSession: appState.mainLoopModelForSession,
                    carriedEffort: Ht.latchEffort,
                  });
                  let yt = isFastModeEnabled()
                    ? isFastModeActive(We, appState.fastMode)
                    : !!appState.fastMode;
                  (toolUseContext.setAppState((so) => ({
                    ...so,
                    mainLoopModel: We,
                    mainLoopModelForSession: null,
                    fastMode: yt,
                  })),
                    setMainLoopModelOverride(We),
                    (config = Vwt()),
                    (toolUseContext.options.mainLoopModel = We),
                    (toolUseContext.options.availabilityFallback = void 0),
                    reportFastModeToggle(appState.fastMode, yt));
                }
                let wn = new Set(event.discardedMessages.map((discardedMessage) => discardedMessage.uuid));
                if (wn.size > 0) {
                  for (let He = assistantMessages.length - 1; He >= 0; He--)
                    if (wn.has(assistantMessages[He].uuid)) assistantMessages.splice(He, 1);
                }
                let Mo = [];
                if (Se.tombstonedToolUse) {
                  let discardAndAbortInFlight = attemptState.streamingToolExecutor.discardAndAbortInFlight(
                    serverFallbackTombstoneAbortReason(),
                  );
                  if (
                    (logEvent("tengu_rotunda_pennant_tools", {
                      lane: lit("accept"),
                      aborted: discardAndAbortInFlight.aborted,
                      completed_before_event: discardAndAbortInFlight.completedBeforeEvent,
                      queued_never_started: discardAndAbortInFlight.queuedNeverStarted,
                      compensated_removes: discardAndAbortInFlight.toolUseIds.length,
                    }),
                    (Mo = [...toolResults]),
                    attemptState.reset({ clearAssistantMessages: !1 }),
                    attemptState.rebuildStreamingToolExecutor(),
                    discardAndAbortInFlight.toolUseIds.length > 0)
                  )
                    yield {
                      type: "set_in_progress_tool_use_ids",
                      op: { action: "remove", ids: discardAndAbortInFlight.toolUseIds },
                      reason: "fallback_sweep",
                    };
                }
                if (event.midStream) {
                  me = new Set(assistantMessages.slice(pe).map((yt) => yt.uuid));
                  let retainedText = event.retainedText;
                  if (retainedText !== void 0 && retainedText.length > 0 && Ao === void 0)
                    te = { text: retainedText, originals: event.retainedMessages ?? [] };
                  else if (retainedText !== void 0 && retainedText.length > 0 && Ao !== void 0)
                    logForDebugging(
                      "server_fallback: silent stitch already pending \u2014 skipping seam merge",
                      { level: "warn" },
                    );
                }
                (be.push(...event.discardedMessages, ...Mo),
                  yield { type: "query_model_change", toModel: We });
                for (let discardedMessage of event.discardedMessages)
                  yield { type: "tombstone", message: discardedMessage, displayOnly: !0 };
                for (let msg of Mo) yield { type: "tombstone", message: msg, displayOnly: !0 };
                if (te !== void 0)
                  ((qe = !0),
                    yield {
                      type: "refusal_continuation",
                      phase: "begin",
                      salvageText: te.text,
                      join: "exact",
                      replacesUuids: te.originals.map((original) => original.uuid),
                    });
                if (Se.showBanner && !no)
                  he = buildRefusalFallbackSystemMessage(
                    { ...event, fromModel: ze, toModel: We },
                    { timestamp: deps.now(), uuid: deps.uuid() },
                    Se.bannerScope,
                  );
              }
              continue;
            }
            if (event.type === "refusal_no_fallback") {
              if (Mn) {
                refusalNoFallbackEvent = event;
                continue;
              }
              if (he !== void 0) {
                let Se = yield* Ne();
                if (qe) ((qe = !1), (te = void 0), yield { type: "refusal_continuation", phase: "end" });
                (logEvent("tengu_rotunda_pennant_chain_exhausted", {
                  swept_dangling_count: Se,
                  queryChainId: queryChainIdForAnalytics,
                  queryDepth: queryTracking.depth,
                  querySource: agentTypeForTelemetry(querySource),
                }),
                  yield* Ie());
              }
              if ((yield* Ee(), isMainThread))
                yield {
                  type: "system",
                  subtype: "model_refusal_no_fallback",
                  content: "",
                  level: "warning",
                  originalModel: event.originalModel,
                  requestId: event.requestId,
                  apiRefusalCategory: event.apiRefusalCategory,
                  apiRefusalExplanation: event.apiRefusalExplanation,
                  refusedUserMessageUuid: refusedUserMessageUuid,
                  isMeta: !1,
                  timestamp: deps.now(),
                  uuid: deps.uuid(),
                };
              continue;
            }
            if (event.type === "fallback_request") {
              let Se = event.routeMatched == null && (ko !== void 0 || event.silentArmAtTrigger === !0),
                ze = refusalCascadeState.inEpisode && Zs(event);
              if (
                !(Se ? kt : !ze && ti(refusalFallbacksUsed, RXo())) &&
                !refusalFallbackDeclined &&
                (isRefusalFallbackEnabled() || Se)
              ) {
                let We = ze
                    ? "episode_continuation"
                    : getFallbackDialogSkipReason({
                        requestDialog: toolUseContext.requestDialog,
                        isMainThread: isMainThread,
                        silentAttempt: Se,
                        consumerLacksDialogCapability: zt,
                      }),
                  no = {
                    original_model: telemetrySafeModelName(event.originalModel),
                    fallback_model: telemetrySafeModelName(event.fallbackModel),
                    trigger: fromEnum(event.trigger),
                    request_id: ye(event.requestId),
                    queryChainId: queryChainIdForAnalytics,
                    queryDepth: queryTracking.depth,
                    querySource: agentTypeForTelemetry(querySource),
                    api_refusal_category: event.apiRefusalCategory
                      ? fromEnum(normalizeRefusalCategory(event.apiRefusalCategory))
                      : void 0,
                    route_matched: event.routeMatched != null ? fromEnum(event.routeMatched) : void 0,
                    ...(event.cascadeHopIndex !== void 0 && { chain_index: event.cascadeHopIndex }),
                    ...(event.cascadeChainLength !== void 0 && { chain_length: event.cascadeChainLength }),
                    has_api_refusal_explanation: Boolean(event.apiRefusalExplanation),
                    entitlement_blind: isEntitlementOverlayUnavailable(),
                  },
                  flattened = [...assistantMessages, ...toolResults].flatMap((So) =>
                    normalizeMessages([So])
                      .filter(isNotEmptyMessage)
                      .map((kr) => kr.uuid),
                  ),
                  wn = We === "no_consumer_capability";
                if (wn)
                  logEvent("tengu_refusal_fallback_dialog_suppressed", {
                    ...no,
                    reason: Uo ? lit("no_consumer_capability") : lit("remote_controlled_session"),
                    capability_source: Vo,
                    retracted_wire_uuid_count: flattened.length,
                  });
                let Mo = wn ? "cancelled" : "retry_fallback",
                  He = currentModel && !ze && !Se;
                if (He)
                  Mo = await askRefusalFallbackPreference({
                    canUseTool: canUseTool,
                    toolUseContext: toolUseContext,
                    originalModel: event.originalModel,
                    fallbackModel: event.fallbackModel,
                    apiRefusalCategory: event.apiRefusalCategory,
                    telemetry: no,
                  });
                else if (We === void 0 && toolUseContext.requestDialog)
                  Mo = await requestRefusalFallbackChoice({
                    requestDialog: toolUseContext.requestDialog,
                    signal: toolUseContext.abortController.signal,
                    bridgeDialog: vo,
                    hasQueuedPrompts: () =>
                      toolUseContext.messageQueue.peek(isPromptModeQueuedCommand) !== void 0,
                    payload: {
                      originalModel: event.originalModel,
                      fallbackModel: event.fallbackModel,
                      apiRefusalCategory: event.apiRefusalCategory,
                      retractedMessageUuids: flattened,
                      guidanceText: getThirdPartyFallbackHint(),
                    },
                    telemetry: no,
                    shownExtras: { capability_source: Vo, retracted_wire_uuid_count: flattened.length },
                  });
                if (Mo !== "retry_fallback") {
                  if (((refusalFallbackDeclined = !0), event.creditCode !== null))
                    logEvent("tengu_fallback_credit_forfeited", {
                      reason:
                        Mo === "cancelled"
                          ? lit("cancelled")
                          : He
                            ? lit("preference_question_paused")
                            : lit("dialog_declined"),
                      mint_request_id: ye(event.requestId),
                      mint_model: telemetrySafeModelName(attemptModel),
                    });
                  if (
                    (yield* attemptState.abandonAttempt("refusal_decline"),
                    (Je.length = 0),
                    Mo === "edit_prompt")
                  )
                    toolUseContext.abortController.abort(userAbortReason("refusal-fallback-edit"));
                  if (Mo === "cancelled" && !toolUseContext.abortController.signal.aborted) {
                    let So = getRefusalMessage(
                      "refusal",
                      {
                        type: "refusal",
                        category: event.apiRefusalCategory ?? null,
                        explanation: event.apiRefusalExplanation ?? null,
                        fallback_credit_token: null,
                        fallback_has_prefill_claim: null,
                        recommended_model: null,
                      },
                      event.requestId,
                      event.originalModel,
                    );
                    if (So) (await transcriptTap.appended(So), assistantMessages.push(So), yield So);
                  }
                  break;
                }
                let yt = assessPartialResponse(assistantMessages),
                  so =
                    querySource.startsWith("repl_main_thread") &&
                    !toolUseContext.options.isNonInteractiveSession,
                  Zo = hasRefusalFallbackOccurred(),
                  Rt = !so ? "surface" : Zo ? "session_latch" : yt.skipReason,
                  fo = Se && Rt === void 0 ? yt.salvageText : void 0;
                if (Se) kt = !0;
                else {
                  if (!ze) refusalFallbacksUsed += 1;
                  refusalCascadeState = recordFallbackAttempt(
                    refusalCascadeState,
                    event,
                    getSwitchModelsOnFlagSetting(),
                    canonicalModelKey,
                  );
                }
                let sr = Se
                  ? void 0
                  : resolveRefusalFallbackEffort({
                      refusedEffort: event.refusedEffort,
                      fallbackModel: event.fallbackModel,
                      heldBySession: isMainThread && isMainConversationContext(toolUseContext.agentContext),
                      loopOverride: refusalOverride,
                      loopEffort: loopEffort,
                    });
                if (((refusalOverride = event.fallbackModel), sr !== void 0)) loopEffort = sr.loopEffort;
                if (
                  ((dn = Se ? void 0 : (event.creditCode ?? void 0)),
                  (fs = dn !== void 0 ? attemptModel : void 0),
                  (gs = dn !== void 0 ? (event.requestId ?? void 0) : void 0),
                  (Rn.mintedStateless = dn !== void 0 && event.mintedStateless),
                  (Rn.delivery = dn !== void 0 && Lo === void 0 ? br.delivery : void 0),
                  (hs = event.originalModel),
                  (_s = event.apiRefusalCategory ?? void 0),
                  (Ss = event.trigger),
                  (ea ??= event.requestId ?? void 0),
                  Se)
                )
                  markRefusalFallbackOccurred(event.requestId ?? void 0);
                else if (isMainThread && event.apiRefusalCategory === "cyber")
                  markRefusalFallbackHeaderArmed(event.requestId ?? void 0);
                if (
                  (setAttemptModel(event.fallbackModel),
                  (needsAttempt = !0),
                  (At = isMainThread && !Se && flattened.length > 0 ? flattened : void 0),
                  (Me = !1),
                  isMainThread && !Se)
                ) {
                  let appState = toolUseContext.getAppState();
                  latchRefusalFallbackModel({
                    fallbackModel: event.fallbackModel,
                    previousOverride: getMainLoopModelOverride(),
                    previousAppStateModel: appState.mainLoopModel,
                    previousModelForSession: appState.mainLoopModelForSession,
                    carriedEffort: sr?.latchEffort,
                  });
                  let kr = isFastModeEnabled()
                    ? isFastModeActive(event.fallbackModel, appState.fastMode)
                    : !!appState.fastMode;
                  (toolUseContext.setAppState((sp) => ({
                    ...sp,
                    mainLoopModel: event.fallbackModel,
                    mainLoopModelForSession: null,
                    fastMode: kr,
                  })),
                    setMainLoopModelOverride(event.fallbackModel),
                    (config = Vwt()),
                    (toolUseContext.options.mainLoopModel = event.fallbackModel),
                    (toolUseContext.options.availabilityFallback = void 0),
                    reportFastModeToggle(appState.fastMode, kr));
                }
                if (Se)
                  logEvent("tengu_convolute_arcades_retry", {
                    request_id: ye(event.requestId),
                    queryChainId: queryChainIdForAnalytics,
                    queryDepth: queryTracking.depth,
                    querySource: agentTypeForTelemetry(querySource),
                    continuation: fo !== void 0,
                    ...(Rt !== void 0 && { continuation_skip_reason: fromEnum(Rt) }),
                    had_partial_text: yt.partialTextChars > 0,
                    partial_text_chars: yt.partialTextChars,
                    salvaged_tool_use_count: yt.toolUseCount,
                    had_empty_input_tool_use: yt.hadEmptyInputToolUse,
                    credit_minted: event.creditCode !== null,
                    armed_at_trigger: event.silentArmAtTrigger === !0,
                    arm_source: fromEnum(getFallbackLatchKind()),
                  });
                else
                  (logFeatureOk("refusal_fallback"),
                    logEvent("tengu_refusal_fallback_triggered", {
                      ...no,
                      retracted_wire_uuid_count: flattened.length,
                      prompt_skipped_reason: He ? lit("preference_question") : fromEnumOpt(We),
                      had_partial_text: yt.partialTextChars > 0,
                      partial_text_chars: yt.partialTextChars,
                      salvaged_tool_use_count: yt.toolUseCount,
                      had_empty_input_tool_use: yt.hadEmptyInputToolUse,
                      credit_minted: event.creditCode !== null,
                      ...refusedEffortTelemetryFields(event.refusedEffort),
                    }));
                let ya = ln;
                if (ya)
                  ((ln = !1),
                    (Ao = void 0),
                    (Lo = void 0),
                    logEvent("tengu_convolute_arcades_retry_outcome", {
                      outcome: lit("error"),
                      queryChainId: queryChainIdForAnalytics,
                      queryDepth: queryTracking.depth,
                      querySource: agentTypeForTelemetry(querySource),
                    }));
                if ((yield { type: "query_model_change", toModel: event.fallbackModel }, ya))
                  yield { type: "refusal_continuation", phase: "end" };
                let counts = Kt.counts;
                if (
                  ((Kt.counts = void 0),
                  yield* attemptState.abandonAttempt("refusal_retry", {
                    silent: Se,
                    ...(counts !== void 0 && { earlierCounts: counts }),
                  }),
                  (Je.length = 0),
                  fo !== void 0)
                )
                  ((Lo = createUserMessage({
                    content: buildContinuationPrompt(fo),
                    isMeta: !0,
                    ephemeral: !0,
                    now: deps.now,
                    uuidFn: deps.uuid,
                  })),
                    yield { type: "refusal_continuation", phase: "begin", salvageText: fo },
                    (Ao = fo),
                    (ln = !0));
                if (
                  provisionalRefusalNotice !== void 0 &&
                  refusalCascadeState.pendingNotice?.provisionalFlushUuid === provisionalRefusalNotice.uuid
                )
                  (yield { type: "tombstone", message: provisionalRefusalNotice },
                    (provisionalRefusalNotice = void 0));
                if (!ze)
                  ((refusalCascadeState = Nl(refusalCascadeState)), (provisionalRefusalNotice = void 0));
                let rp = refusalCascadeState.inEpisode && (refusalCascadeState.cursor !== void 0 || ze);
                if (isMainThread && !Se && rp)
                  refusalCascadeState = recordFallbackNotice(refusalCascadeState, {
                    originModel: event.originalModel,
                    servingModel: event.fallbackModel,
                    retractedMessageUuids: flattened,
                    refusedUserMessageUuid: refusedUserMessageUuid ?? void 0,
                    apiRefusalCategory: event.apiRefusalCategory ?? null,
                    requestId: event.requestId ?? null,
                  });
                else if (!Se && (isMainThread || emitsLocalScope))
                  yield {
                    type: "system",
                    subtype: "model_refusal_fallback",
                    direction: "retry",
                    scope: isMainThread ? "session" : "local",
                    content: isMainThread
                      ? buildRefusalMessage(
                          event.originalModel,
                          event.fallbackModel,
                          event.apiRefusalCategory,
                        )
                      : buildFallbackGeneratedNotice(
                          event.originalModel,
                          event.fallbackModel,
                          event.apiRefusalCategory,
                        ),
                    level: "warning",
                    trigger: event.trigger,
                    originalModel: event.originalModel,
                    fallbackModel: event.fallbackModel,
                    requestId: event.requestId,
                    apiRefusalCategory: event.apiRefusalCategory,
                    apiRefusalExplanation: event.apiRefusalExplanation,
                    retractedMessageUuids: flattened,
                    refusedUserMessageUuid: refusedUserMessageUuid,
                    isMeta: !1,
                    timestamp: deps.now(),
                    uuid: deps.uuid(),
                  };
              } else if (ko === void 0) {
                let We = getRefusalMessage(
                  "refusal",
                  {
                    type: "refusal",
                    category: event.apiRefusalCategory ?? null,
                    explanation: event.apiRefusalExplanation ?? null,
                    fallback_credit_token: null,
                    fallback_has_prefill_claim: null,
                    recommended_model: null,
                  },
                  event.requestId,
                  event.originalModel,
                );
                if (We) (await transcriptTap.appended(We), assistantMessages.push(We), yield We);
              }
              break;
            }
            if (event.type === "streaming_fallback_began") {
              (logEvent("tengu_orphaned_messages_tombstoned", {
                orphanedMessageCount: assistantMessages.length,
                queryChainId: queryChainIdForAnalytics,
                queryDepth: queryTracking.depth,
              }),
                yield* attemptState.abandonAttempt("streaming_fallback"),
                (Je.length = 0));
              try {
                if (
                  querySource.startsWith("repl_main_thread") &&
                  isMainAgent(toolUseContext.agentContext) &&
                  (event.cause === "no_events" || event.cause === "stream_truncated") &&
                  Ws().once("stream_no_events_fallback_warning")
                )
                  yield createInformationalSystemMessage(
                    "Streaming response ended before any complete data was received. Retrying without streaming. If this keeps happening, check any proxy or gateway between Claude Code and your model provider.",
                    "warning",
                  );
              } catch (error) {
                logError(error);
              }
              continue;
            }
            if (
              resumeActive &&
              event.type === "assistant" &&
              !event.isApiErrorMessage &&
              !allAnsweredWithoutRequest([event])
            )
              event.resumedFromIncompleteThinking = !0;
            if (event.type === "assistant" && !event.isApiErrorMessage && !allAnsweredWithoutRequest([event]))
              event.permissionModeAtRequest = permissionModeAtRequest;
            if (event.type === "assistant" && event.message.content.some((Se) => Se.type === "tool_use"))
              await transcriptTap.appended(event);
            let $e = event,
              Co,
              co = !1,
              No;
            if (event.type === "assistant") {
              let Se;
              for (let ze = 0; ze < event.message.content.length; ze++) {
                let We = event.message.content[ze];
                if (We.type === "tool_use" && typeof We.input === "object" && We.input !== null) {
                  let no = findToolByName(
                      toolUseContext.options.tools,
                      We.name,
                      toolUseContext.options.toolAliases,
                    ),
                    Ht = backfillObservableInput(no, We.input, We.name);
                  if (Ht) ((Se ??= [...event.message.content]), (Se[ze] = { ...We, input: Ht }));
                }
              }
              if (Se)
                (($e = { ...event, message: { ...event.message, content: Se } }),
                  Je.push({ src: event.message, dst: $e.message, srcRow: event, dstRow: $e }));
            }
            if ((Ao !== void 0 || te !== void 0) && event.type === "assistant" && !event.isApiErrorMessage) {
              let Se = $e.type === "assistant" ? $e : event,
                content = Se.message.content,
                index = content.findIndex((Ht) => Ht.type === "text"),
                no = index === -1 ? void 0 : content[index];
              if (no !== void 0 && no.type === "text" && no.text.trim().length > 0) {
                let Ht = [...content];
                Ht[index] = withCitationsDropped(
                  no,
                  te !== void 0 ? te.text + no.text : stitchContinuation(Ao, no.text),
                );
                let { apiBlockIndex: apiBlockIndex, apiBlockIndices: apiBlockIndices, ...He } = Se,
                  yt = { ...He, message: { ...Se.message, content: Ht } };
                if (
                  (Je.push({ src: event.message, dst: yt.message, srcRow: event, dstRow: yt }), te !== void 0)
                ) {
                  let originals = te.originals,
                    Zo = new Set(originals.map((Rt) => Rt.uuid));
                  for (let Rt = assistantMessages.length - 1; Rt >= 0; Rt--)
                    if (Zo.has(assistantMessages[Rt].uuid)) assistantMessages.splice(Rt, 1);
                  if (
                    (assistantMessages.push(yt),
                    (co = !0),
                    (No = originals),
                    be.push(...originals),
                    isMainThread)
                  )
                    ((yt.supersedesUuids = originals.flatMap((Rt) =>
                      normalizeMessages([Rt])
                        .filter(isNotEmptyMessage)
                        .map((fo) => fo.uuid),
                    )),
                      logEvent("tengu_refusal_fallback_supersedes", {
                        lane: lit("server_stitch"),
                        count: yt.supersedesUuids.length,
                      }));
                  ((me = new Set([yt.uuid])), (te = void 0));
                } else Ao = void 0;
                (($e = yt), (Co = yt));
              }
            }
            if (event.type === "stream_event" && event.event.type === "message_delta") {
              if (typeof event.event.delta.stop_reason === "string")
                lastStopReason = event.event.delta.stop_reason;
              for (let { src: src, dst: dst } of Je)
                if (
                  ((dst.usage = src.usage),
                  (dst.stop_reason = src.stop_reason),
                  (dst.stop_details = src.stop_details),
                  src.context_management !== void 0)
                )
                  dst.context_management = src.context_management;
              for (let { srcRow: srcRow, dstRow: dstRow } of Je)
                if (srcRow.isUnmetered !== !0) delete dstRow.isUnmetered;
              Je.length = 0;
            }
            let to = !1;
            if (i8s(event)) to = !0;
            if (
              !attemptState.needsFollowUp &&
              shouldCompactAfterLongContextRefusal(event, attemptModelFacts, querySource)
            )
              ((to = !0), (withheldPromptTooLong = event));
            if (ozr(event)) ((to = !0), gt.push(event));
            if (isWithheldMaxOutputTokens(event)) to = !0;
            if (Mn && isRefusalErrorMessage(event)) to = !0;
            if (
              !attemptState.needsFollowUp &&
              isRecoverableTruncatedResponse(event, toolUseContext, querySource)
            )
              ((to = !0), (truncatedResponse = event));
            if (resumeActive && !attemptState.needsFollowUp && isRetryableApiErrorMessage(event)) to = !0;
            if (
              attemptState.needsFollowUp &&
              event.type === "assistant" &&
              isSafetyMonitorBlockedMessage(event)
            )
              to = !0;
            if (to && event.type === "assistant") lastWithheldAssistant = event;
            if (!to) {
              if (gt.length > 0) (yield* gt, (gt.length = 0));
              if (
                refusalCascadeState.pendingNotice !== void 0 &&
                $e.type === "assistant" &&
                !$e.isApiErrorMessage &&
                normalizeMessages([$e]).some(isNotEmptyMessage)
              )
                yield* ke();
              if (
                At !== void 0 &&
                $e.type === "assistant" &&
                !$e.isApiErrorMessage &&
                normalizeMessages([$e]).some(isNotEmptyMessage)
              ) {
                let ze = At;
                ((At = void 0),
                  (Me = !1),
                  ($e = { ...$e, supersedesUuids: ze }),
                  logEvent("tengu_refusal_fallback_supersedes", {
                    lane: lit("client_retry"),
                    count: ze.length,
                  }));
              }
              if ($e !== event && $e.type === "assistant" && event.type === "assistant" && Co === void 0)
                transcriptTap.answeredAs($e, event);
              yield $e;
            }
            if (event.type === "assistant") {
              if (
                isMainLoop &&
                y8s(toolUseContext.agentId, toolUseContext.agentContext) &&
                !event.isApiErrorMessage
              )
                recordTextBlocks(event.message.content);
              let Se = Co ?? event;
              if (!co) assistantMessages.push(Se);
              let msgToolUseBlocks = Se.message.content.filter((content) => content.type === "tool_use");
              if (msgToolUseBlocks.length > 0)
                (toolUseBlocks.push(...msgToolUseBlocks), (attemptState.needsFollowUp = !0));
              recordServerToolsUsed(Se);
              for (let toolBlock of msgToolUseBlocks)
                attemptState.streamingToolExecutor.addTool(toolBlock, Se);
            }
            if (No !== void 0) {
              let Se = No;
              No = void 0;
              for (let ze of Se) yield { type: "tombstone", message: ze, displayOnly: !0 };
            }
            if (attemptState.streamingToolExecutor.hasUnfinishedTools()) yield* drainCompletedToolResults();
          }
          if ((queryCheckpoint("query_api_streaming_end"), ln && !needsAttempt)) {
            ln = !1;
            let O = Ao === void 0;
            ((Ao = void 0),
              (Lo = void 0),
              logEvent("tengu_convolute_arcades_retry_outcome", {
                outcome: fromEnum(O ? "merged" : "no_text"),
                queryChainId: queryChainIdForAnalytics,
                queryDepth: queryTracking.depth,
                querySource: agentTypeForTelemetry(querySource),
              }),
              yield { type: "refusal_continuation", phase: "end" });
          }
          if (
            me !== void 0 &&
            (assistantMessages.at(-1)?.message.stop_reason ?? lastStopReason) === "refusal"
          )
            yield* Ne();
          if (qe) ((qe = !1), (te = void 0), yield { type: "refusal_continuation", phase: "end" });
          yield* Ie();
          {
            let lastAssistant = assistantMessages.at(-1),
              $e = lastAssistant ? getTokenUsage(lastAssistant) : void 0;
            if ($e) {
              let Co = totalTokensOf($e);
              if (
                shouldArmPrecompute({
                  autocompactRan: autocompactRan,
                  hasAttemptedReactiveCompact: hasAttemptedReactiveCompact,
                  lastTransitionReason: state.transition?.reason,
                  isPreFirstCompactFork: zr,
                  querySource: querySource,
                  contextTokens: Co,
                  messagesCounted: assistantMessages,
                  facts: attemptModelFacts,
                  autoCompactWindow: toolUseContext.options.autoCompactWindow,
                })
              )
                if (querySourceKind === "subagent" && toolUseBlocks.length === 0)
                  latchArmGate(
                    toolUseContext.session.precompute,
                    toolUseContext.agentId,
                    "subagent_final_turn",
                    agentTypeForTelemetry(querySource),
                  );
                else {
                  let co = getTokenCountFromUsage($e),
                    No = co.input_tokens + co.cache_creation_input_tokens + co.cache_read_input_tokens,
                    to = Tp(messagesForQuery, attemptModelFacts.bytesPerToken) - snipTokensFreed;
                  armPrecomputedCompact({
                    querySource: querySource,
                    messages: [...messagesForQuery, ...assistantMessages],
                    facts: attemptModelFacts,
                    cacheSafeParams: {
                      systemPrompt: systemPrompt,
                      userContext: userContext,
                      systemContext: systemContext,
                      toolUseContext: toolUseContext,
                      forkContextMessages: messagesForQuery,
                      advisorModel: toolUseContext.getAppState().advisorModel,
                      stickyBetas: stickyBetas,
                      agentCacheTtlOverride: agentCacheTtlOverride,
                    },
                    armTrigger: "api_response",
                    estimateGapTokens: No - to,
                    ...(querySource === "sdk" && {
                      promptScan: countUserPromptsAndRewrite([...messagesForQuery, ...assistantMessages]),
                    }),
                  });
                }
            }
          }
        } catch (error) {
          ct = { error: error };
        }
        if (ct !== void 0 || fallbackError !== void 0) {
          let Je = fallbackError ?? ct?.error;
          if (qe) ((qe = !1), (te = void 0), yield { type: "refusal_continuation", phase: "end" });
          if ((yield* Ie(), yield* Ee(), ln))
            ((ln = !1),
              (Ao = void 0),
              (Lo = void 0),
              logEvent("tengu_convolute_arcades_retry_outcome", {
                outcome: lit("error"),
                queryChainId: queryChainIdForAnalytics,
                queryDepth: queryTracking.depth,
                querySource: agentTypeForTelemetry(querySource),
              }),
              yield { type: "refusal_continuation", phase: "end" });
          if (pzr(j, Je)) modelChain = [...modelChain, j];
          let gt = modelChain[chainIndex + 1];
          if (fallbackError !== void 0 && gt !== void 0) {
            if (isNoModelFallbackEnabled()) noModelFallbackTripwire();
            (chainIndex++,
              (refusalOverride = void 0),
              (refusalCascadeState = ql()),
              (consentOverride = void 0),
              (liveSwitchOverride = void 0));
            let {
              chainIndex: chainIndex_2,
              target: target,
              substituted: substituted,
              inPlace: inPlace,
              anySubstituted: anySubstituted,
            } = nextFallbackModel({
              chain: modelChain,
              from: chainIndex,
              failedModel: fallbackError.originalModel,
              reason: fallbackError.reason,
              substituteFor: (Vo) => {
                if (!sWt(Vo, toolUseContext.requestDialog)) return;
                let vo = getUsageCreditsOnlyModelConsentDeclineFallback();
                return vo !== null && querySource === "compact" && swapShrinksContextWindow(modelChain[0], vo)
                  ? null
                  : vo;
              },
            });
            if (((chainIndex = chainIndex_2), anySubstituted && isMainThread))
              logFeatureSad("model_fable_consent", "chain_advance_substituted");
            if (target === null)
              throw (
                logFeatureBad("model_fallback", "no_usable_fallback", {
                  reason: fromEnum(fallbackError.reason),
                }),
                fallbackError.originalError ?? fallbackError
              );
            if (substituted || inPlace) consentOverride = target;
            if (
              (setAttemptModel(target),
              (needsAttempt = !0),
              (Me = !1),
              yield* attemptState.abandonAttempt("chain_advance"),
              (toolUseContext.options = {
                ...toolUseContext.options,
                mainLoopModel: attemptModel,
                availabilityFallback: {
                  primaryModel: getPrimaryModelForFallback(toolUseContext.options),
                  fallbackModel: attemptModel,
                },
              }),
              inPlace)
            ) {
              logForDebugging(
                `chain advance collapsed onto the failed model ${attemptModel}; re-dispatching in place with the full retry budget`,
              );
              continue;
            }
            if (isTopLevelMainThread) ymn("fallback_model");
            let Yo = newFallbackRecord(
              fallbackError.originalModel,
              attemptModel,
              !substituted,
              fallbackError.reason,
            );
            mo = chainFallbackRecord(mo, Yo);
            let Uo = describeFallbackWindow(Yo, mo);
            (logFeatureOk("model_fallback"),
              logEvent("tengu_model_fallback_triggered", {
                original_model: telemetrySafeModelName(fallbackError.originalModel),
                fallback_model: telemetrySafeModelName(attemptModel),
                original_context_window: Uo?.fromWindow,
                fallback_context_window: Uo?.toWindow,
                chain_index: chainIndex,
                query_source: agentTypeForTelemetry(querySource),
                reason: fromEnum(fallbackError.reason),
                entrypoint: lit("cli"),
                queryChainId: queryChainIdForAnalytics,
                queryDepth: queryTracking.depth,
              }),
              yield { type: "query_model_change", toModel: attemptModel },
              yield {
                type: "system",
                subtype: "model_fallback",
                content:
                  formatModelFallbackMessage(
                    fallbackError.reason,
                    renderModelName(fallbackError.originalModel),
                    renderModelName(attemptModel),
                    fallbackError.originalError,
                  ) + (Uo?.noticeSuffix ?? ""),
                level: "warning",
                trigger: fallbackError.reason,
                originalModel: fallbackError.originalModel,
                fallbackModel: attemptModel,
                isMeta: !1,
                timestamp: deps.now(),
                uuid: deps.uuid(),
              });
            continue;
          }
          throw Je;
        }
      }
    } catch (innerError) {
      {
        let j = takeFallbackNotice(refusalCascadeState);
        if (((refusalCascadeState = j.state), j.notice !== void 0))
          yield buildRefusalFallbackNotice(j.notice, deps.uuid());
      }
      if (
        (logEvent("tengu_query_error", {
          assistantMessages: assistantMessages.length,
          toolUses: assistantMessages.flatMap((j) => j.message.content.filter((pe) => pe.type === "tool_use"))
            .length,
          queryChainId: queryChainIdForAnalytics,
          queryDepth: queryTracking.depth,
        }),
        innerError instanceof FallbackTriggeredError && innerError.reason === "model_blocked")
      ) {
        let j = createApiErrorMessage({
          content: modelUnavailableMessage(innerError, renderModelName(innerError.originalModel)),
          error: "rate_limit",
          now: deps.now,
          uuid: deps.uuid,
        });
        return (
          yield j,
          markClassifierApiFailure(toolUseContext, querySource, j),
          { reason: "model_error", error: innerError }
        );
      }
      return yield* endTurnOnError(innerError);
    }
    let at = assistantMessages.at(-1);
    if (attemptState.needsFollowUp && isSafetyMonitorBlockedMessage(at)) {
      try {
        yield* drainCompletedToolResults();
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "tool drain failed after safety monitor block"));
      }
      let E = sc(attemptState);
      if (
        (yield* yieldMissingToolResultBlocks(
          assistantMessages,
          SAFETY_BLOCK_TOOL_CANCEL_TEXT,
          deps,
          E.answeredToolUseIds,
        ),
        E.removes)
      )
        yield E.removes;
      yield at;
    }
    if (
      assistantMessages.some((E) =>
        E.message.content.some((content) => content.type === "text" && va(content.text)),
      )
    )
      logEvent("tengu_model_response_keyword_detected", {
        is_suggests_break: !0,
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
      });
    if (assistantMessages.length > 0)
      executePostSamplingHooks(
        [...messagesForQuery, ...assistantMessages],
        systemPrompt,
        userContext,
        systemContext,
        toolUseContext,
        querySource,
      );
    let drainRemainingTools = async function* () {
      for await (let update of attemptState.streamingToolExecutor.getRemainingResults()) {
        if (hasTypeField(update)) {
          yield update;
          continue;
        }
        if (update.message) yield markVirtualInResume(update.message);
      }
      if (isRefusalErrorMessage(lastWithheldAssistant)) yield* yieldWithRefusalNotice(lastWithheldAssistant);
      if (!toolUseContext.agentId)
        try {
          yield* cleanupComputerUseAfterTurn(toolUseContext);
        } catch {}
      {
        let E = takeFallbackNotice(refusalCascadeState);
        if (((refusalCascadeState = E.state), E.notice !== void 0))
          yield buildRefusalFallbackNotice(E.notice, deps.uuid());
      }
      if (!isSilentAbortReason(toolUseContext.abortController.signal.reason))
        yield createUserInterruptionMessage({
          toolUse: !1,
          interruptedMessageId: getInterruptedMessageId(toolUseContext),
          interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
          now: deps.now,
          uuidFn: deps.uuid,
        });
      return (markClassifierTurnAborted(toolUseContext, querySource), { reason: "aborted_streaming" });
    };
    if (toolUseContext.abortController.signal.aborted) return yield* drainRemainingTools();
    {
      let E = takeFallbackNotice(refusalCascadeState);
      if (((refusalCascadeState = E.state), E.notice !== void 0))
        yield buildRefusalFallbackNotice(E.notice, deps.uuid());
    }
    let na = !assistantMessages.at(-1)?.isApiErrorMessage;
    if (na && !attemptState.needsFollowUp) {
      let E = recordToolDescriptions(messagesForQuery, inlineToolsDeclared, {
        options: toolUseContext.options,
        querySource: querySource,
        head: promptHeadSent,
        stamp: deps,
        handed: promptRender.redescribing,
      });
      if (E) (yield E, (messagesForQuery = [...messagesForQuery, E]));
      let j = appendDeferredToolsRecord();
      if (j) yield j;
    }
    if (pendingToolUseSummary) {
      let summary = await pendingToolUseSummary;
      if (summary) yield summary;
    }
    if (state.transition?.reason === "refusal_retry")
      reportRefusalRetry({
        sentOn: state.transition.model,
        servedBy: attemptModel,
        lastMessage: assistantMessages.at(-1),
        withheldRecoverable: lastWithheldAssistant,
      });
    if (state.transition?.reason === "malformed_tool_use_retry") {
      let lastMessage = assistantMessages.at(-1);
      logEvent("tengu_malformed_tool_use_retry_outcome", {
        model: telemetrySafeModelName(attemptModel),
        retry_count: malformedToolUseRetryCount,
        outcome: fromEnum(
          recoveryOutcome(
            toolUseBlocks.length,
            lastMessage?.message.stop_reason ?? lastStopReason,
            lastMessage?.isApiErrorMessage,
            malformedToolUseRetryCount,
          ),
        ),
      });
    }
    if (state.transition?.reason === "truncated_response_recovery") {
      let at = assistantMessages.at(-1);
      if (at !== void 0 && !at.isApiErrorMessage)
        logFeatureOk("query_truncated_response_recovery", {
          attempt: state.transition.attempt,
          cause: fromEnum(state.transition.cause),
        });
      else if (at?.isApiErrorMessage && at !== lastWithheldAssistant)
        logFeatureBad("query_truncated_response_recovery", "continuation_failed", {
          attempt: state.transition.attempt,
          cause: fromEnum(state.transition.cause),
        });
    }
    if (
      (reportOutputLimitRecovery({
        transition: state.transition,
        resumed: resumeIncompleteThinking === !0,
        request: messagesForQuery,
        responses: assistantMessages,
        withheld: lastWithheldAssistant,
      }),
      resumeActive && allAnsweredWithoutRequest(assistantMessages))
    )
      resumeActive = !1;
    let or = !1;
    if (resumeActive) {
      let at = assistantMessages.at(-1),
        j = !1;
      if (at?.isApiErrorMessage)
        j =
          j ||
          at === truncatedResponse ||
          at === withheldPromptTooLong ||
          isPromptTooLongMessage_2(at) ||
          ozr(at);
      or = resumeTruncatedThinking(assistantMessages, {
        healedElsewhere: j,
        attempt: maxOutputTokensRecoveryCount,
      });
    }
    let at_2 = assistantMessages.at(-1);
    if (Mn && isRefusalErrorMessage(at_2) && at_2 === lastWithheldAssistant) {
      try {
        yield* drainCompletedToolResults();
      } catch (error) {
        if (!(error instanceof ImageSizeError || error instanceof ImageResizeError)) {
          let he = resetStreamingToolExecutor(attemptState, "model_error");
          if (he.removes) yield he.removes;
          throw error;
        }
        try {
          yield* yieldRefusalNoFallbackNotice();
        } catch (error) {
          logError(
            withTelemetryMessage(toError(error), "withheld refusal event failed while ending the turn"),
          );
        }
        return yield* endTurnOnError(error);
      }
      let E =
          attemptState.toolWasDeferred ||
          attemptState.shouldPreventContinuation ||
          attemptState.toolRequestedEndTurn !== !1,
        j,
        pe;
      if (!E)
        try {
          let me = discardInFlightTools(attemptState.streamingToolExecutor, "same_model_retry");
          if (
            ((j = me.removes), attemptState.rebuildStreamingToolExecutor(), me.startedToolUseIds.length > 0)
          )
            clearActiveMcpContext(toolUseContext.options, isMainOrSubagent);
          let filtered = assistantMessages.filter((be) => be !== at_2);
          pe = {
            ...synthesizeRefusedToolResults({
              refused: at_2,
              kept: filtered,
              answered: toolResults,
              started: me.startedToolUseIds,
              model: attemptModel,
              querySource: querySource,
              queryChainId: queryChainIdForAnalytics,
              queryDepth: queryTracking.depth,
              deps: deps,
              makeUserMessage: createUserMessage,
            }),
            kept: filtered,
          };
        } catch (error) {
          logError(error);
        }
      if (j) yield j;
      if (pe)
        return (
          yield* pe.notRun,
          yield pe.notice,
          yield pe.nudge,
          (state = {
            guards: {
              ...guards,
              refusalRetrySpent: !0,
              ...(toolUseBlocks.length > 0 && { stopHookBlockingCount: 0 }),
            },
            messages: [...messagesForQuery, ...pe.kept, ...toolResults, ...pe.notRun, pe.nudge],
            toolUseContext: toolUseContext,
            compactTracking: tracking,
            transition: { reason: "refusal_retry", model: attemptModel },
            prevToolDurations:
              attemptState.toolDurations.length > 0 ? [...attemptState.toolDurations] : void 0,
          }),
          NEXT_ROUND
        );
    }
    if (isRefusalErrorMessage(at_2) && at_2 === lastWithheldAssistant) yield* yieldWithRefusalNotice(at_2);
    if (!attemptState.needsFollowUp) {
      let qe = function (ke) {
          for (let Ee = ke.length - 1; Ee >= 0; Ee--) {
            let Ie = ke[Ee];
            if (Ie.type === "user") {
              if (Ie.isMeta || isToolResultMessage(Ie)) continue;
              return !1;
            }
            if (Ie.type !== "assistant") continue;
            if (Ie.message.content.some((ct) => ct.type === "tool_use" && ct.name === STRUCTUREDOUTPUT))
              return !0;
          }
          return !1;
        },
        at = assistantMessages.at(-1),
        j = at !== void 0 && at === withheldPromptTooLong,
        pe = j || (at?.type === "assistant" && at.isApiErrorMessage && isPromptTooLongMessage_2(at)),
        he =
          !(
            toolDenialTracker !== null &&
            at?.type === "assistant" &&
            toolDenialTracker.isToolUseDeniedMessage(at)
          ) && ozr(at),
        be =
          pe || he
            ? {
                ...toolUseContext,
                abortController: createRecoveryAbortController(
                  toolUseContext.abortController,
                  gzr(messagesForQuery, pe ? at?.errorDetails : void 0),
                  toolUseContext.session.host.clock,
                ),
                onRetryStatus: guardedStreamCallback(
                  toolUseContext.onRetryStatus,
                  toolUseContext.abortController.signal,
                ),
              }
            : toolUseContext;
      e: if (pe || he) {
        let ke =
            pe &&
            hasAttemptedReactiveCompact &&
            reactiveCompactDeeperPass === "available" &&
            state.transition?.reason === "reactive_compact_retry",
          Ee = hasAttemptedReactiveCompact && !ke,
          Ie = ke
            ? { action: "proceed", consecutiveRapidRefills: tracking?.consecutiveRapidRefills ?? 0 }
            : checkRapidRefillBreaker(tracking),
          { consecutiveRapidRefills: consecutiveRapidRefills } = Ie;
        if (!hasAttemptedReactiveCompact && Ie.action === "trip") {
          if (j) {
            logFeatureBad("compact_after_long_context_refusal", "rapid_refill_breaker");
            break e;
          }
          let uo = fallbackWindowNotice({
            fallback: isMainThreadQuery && pe ? mo : void 0,
            mainLoopModel: toolUseContext.options.mainLoopModel,
            configuredWindow: toolUseContext.options.autoCompactWindow,
          });
          logEvent("tengu_auto_compact_rapid_refill_breaker", {
            consecutiveRapidRefills: tracking?.consecutiveRapidRefills ?? 0,
            turnsSincePreviousCompact: tracking?.turnCounter ?? -1,
            queryChainId: queryChainIdForAnalytics,
            queryDepth: queryTracking.depth,
            reactive: !0,
            afterShrinkingFallback: uo.afterShrinkingFallback,
          });
          let zt = createApiErrorMessage({
            content: uo.content,
            error: "invalid_request",
            apiError: "autocompact_thrashing",
            now: deps.now,
            uuid: deps.uuid,
          });
          return (
            yield zt,
            executeStopFailureHooks(zt, toolUseContext),
            markClassifierApiFailure(toolUseContext, querySource, zt),
            { reason: "rapid_refill_breaker" }
          );
        }
        if (
          at &&
          canReactiveCompact({
            hasAttempted: Ee,
            querySource: querySource,
            aborted: toolUseContext.abortController.signal.aborted,
          }) &&
          r8s(messagesForQuery)
        ) {
          if (j) {
            logFeatureBad("compact_after_long_context_refusal", "too_few_groups");
            break e;
          }
          let uo = countNonProgressMessages(messagesForQuery),
            zt = uo.length,
            ho = he ? "image_error" : "prompt_too_long",
            { actualTokens: actualTokens, limitTokens: limitTokens } = parsePromptTooLongTokenCounts(
              at.errorDetails ?? "",
            ),
            pn = Lg(uo.flat()),
            Sr = actualTokens !== void 0 ? Math.max(0, actualTokens - pn) : void 0;
          logEvent("tengu_ptl_surfaced_to_user", {
            reason: fromEnum(ho),
            querySource: agentTypeForTelemetry(querySource),
            wasGatedByPriorAttempt: Ee,
            deeperPass: fromEnum(reactiveCompactDeeperPass),
            reactiveUnsupported: !canCompactInRemote(),
            precomputedKind: lit("not_consulted"),
            compactionImpossible: !0,
            totalGroups: zt,
            overheadTokensEstimate: Sr,
          });
          let mn =
            ho === "prompt_too_long"
              ? rebuildApiErrorMessage(
                  at,
                  formatSingleExchangePromptTooLong({
                    actualTokens: actualTokens,
                    limitTokens: limitTokens,
                    conversationTokensEstimate: pn,
                  }),
                  deps,
                )
              : at;
          return (
            yield mn,
            executeStopFailureHooks(mn, toolUseContext),
            markClassifierApiFailure(toolUseContext, querySource, mn),
            { reason: ho }
          );
        }
        let startTime = performance.now(),
          Je = pe && at ? getPromptTooLongTokenGap(at) : void 0,
          {
            outcome: outcome,
            swap: swap,
            emittedEarlyCompactStart: emittedEarlyCompactStart,
          } = yield* runCompactionAsStream(
            (uo, zt, ho) =>
              applyPrecomputedCompact({
                toolUseContext: uo,
                messages: messagesForQuery,
                trigger: "ptl",
                isWithheld413: pe,
                hasAttemptedReactiveCompact: hasAttemptedReactiveCompact,
                borrowFrom: zr ? toolUseContext.precomputeSourceKey : void 0,
                detectedAt: startTime,
                querySource: querySource,
                sizingModel: attemptModelFacts.model,
                onResponseLength: ho,
              }),
            be,
          ),
          ko = yield* runCompactionAsStream(
            (uo, zt, ho) =>
              triggerReactiveCompact({
                hasAttempted: Ee,
                querySource: querySource,
                aborted: be.abortController.signal.aborted,
                messages: messagesForQuery,
                cacheSafeParams: {
                  systemPrompt: systemPrompt,
                  userContext: userContext,
                  systemContext: systemContext,
                  toolUseContext: uo,
                  forkContextMessages: messagesForQuery,
                  advisorModel: toolUseContext.getAppState().advisorModel,
                  stickyBetas: stickyBetas,
                  agentCacheTtlOverride: agentCacheTtlOverride,
                },
                precomputed: swap,
                precomputeOutcome: outcome,
                userWaitStartedAt: startTime,
                promptTooLong: Je,
                allowLastResort: !he,
                onNotification: zt,
                onResponseLength: ho,
              }),
            be,
          ),
          { result: lo, failure: failure } =
            pe && !he && at && !canCompactInRemote()
              ? yield* recoverFromRefusal({
                  autocompact: deps.autocompact,
                  refusal: at,
                  hasAttempted: hasAttemptedReactiveCompact,
                  loopTopOutcome: autocompactOutcome.kind,
                  offPickedModel: attemptModel !== sessionModel,
                  messages: messagesForQuery,
                  toolUseContext: be,
                  facts: attemptModelFacts,
                  cacheSafeParams: {
                    systemPrompt: systemPrompt,
                    userContext: userContext,
                    systemContext: systemContext,
                    toolUseContext: be,
                    forkContextMessages: messagesForQuery,
                    advisorModel: toolUseContext.getAppState().advisorModel,
                    stickyBetas: stickyBetas,
                    agentCacheTtlOverride: agentCacheTtlOverride,
                  },
                  querySource: querySource,
                  tracking: tracking,
                  snipTokensFreed: snipTokensFreed,
                  sentSystemPrompt: apiSystemPrompt,
                  sentInlineTools: inlineToolsDeclared,
                })
              : ko;
        if (lo) {
          if (j) logFeatureOk("compact_after_long_context_refusal");
          if (params.taskBudget) {
            let _o = finalContextTokensFromLastResponse(messagesForQuery);
            taskBudgetRemaining = Math.max(0, (taskBudgetRemaining ?? params.taskBudget.total) - _o);
          }
          (i1o(toolUseContext.agentId ?? "main", tokenCountFromLastAPIResponse(messagesForQuery)),
            (lo.summaryMessages = stampSummaryTurnFields(lo.summaryMessages, messagesForQuery)),
            (contextRouting = await rebuildRoutingAfterCompaction(
              contextRouting,
              userContext,
              systemContext,
              be,
              { messages: params.messages, querySource: querySource },
            )));
          let uo = await reannounceAfterCompact(lo, {
              routing: contextRouting,
              toolUseContext: be,
              querySource: querySource,
              resumeActive: resumeActive,
              foreground: isMainThreadQuery && isMainAgent(be.agentContext),
              stamp: deps,
            }),
            zt = ir(buildPostCompactMessages(lo), uo);
          ((toolUseContext = withTurnMessages(toolUseContext, zt, isHumanTurn)),
            maybeStartPrecomputeAfterTurn({
              messages: zt,
              systemPrompt: systemPrompt,
              userContext: userContext,
              systemContext: systemContext,
              toolUseContext: toolUseContext,
              querySource: querySource,
              stickyBetas: stickyBetas,
            }));
          for (let _o of ir(buildPostCompactMessagesWithoutKept(lo), uo)) yield _o;
          tracking = createCompactTracking(deps.uuid(), consecutiveRapidRefills);
          let ho = ke
            ? "spent"
            : swap === void 0 &&
                pe &&
                canCompactInRemote() &&
                reactiveCompactDeeperPass === "none" &&
                (countNonProgressMessages(zt).length >= 3 ||
                  canLeaveOutFixPtl(zt, Je?.gap, toolUseContext.contentReplacementState?.replacements))
              ? "available"
              : reactiveCompactDeeperPass;
          if (isTopLevelMainThread) ymn("reactive_compact");
          return (
            (state = {
              guards: {
                ...guards,
                hasAttemptedReactiveCompact: swap === void 0,
                reactiveCompactDeeperPass: ho,
              },
              messages: zt,
              toolUseContext: toolUseContext,
              compactTracking: tracking,
              resumeIncompleteThinking: resumeActive,
              transition: { reason: swap ? "precomputed_compact_swap" : "reactive_compact_retry" },
            }),
            NEXT_ROUND
          );
        }
        if (emittedEarlyCompactStart)
          (yield { type: "compact_progress", event: { type: "compact_end" } },
            yield { type: "sdk_status", status: null });
        if (!he && toolUseContext.abortController.signal.aborted) {
          if (j) logFeatureSad("compact_after_long_context_refusal", "aborted");
          return yield* drainRemainingTools();
        }
        if (j) {
          logFeatureBad("compact_after_long_context_refusal", Ee ? "still_refused" : "not_compacted");
          break e;
        }
        let Yo = he ? "image_error" : "prompt_too_long",
          Uo = querySource === "compact" || isCompactQuerySource(querySource);
        if (!toolUseContext.abortController.signal.aborted && !Uo)
          logEvent("tengu_ptl_surfaced_to_user", {
            reason: fromEnum(Yo),
            querySource: agentTypeForTelemetry(querySource),
            wasGatedByPriorAttempt: Ee,
            deeperPass: fromEnum(reactiveCompactDeeperPass),
            ...(Yo === "prompt_too_long" &&
              promptTooLongFacts({
                errorDetails: at?.errorDetails,
                messages: messagesForQuery,
                systemPrompt: apiSystemPrompt,
                inlineTools: inlineToolsDeclared,
              })),
            precomputedKind: fromEnum(outcome.kind),
            precomputedFailureCause: fromEnumOpt(outcome.kind === "failed" ? outcome.failure.cause : void 0),
            reactiveUnsupported: !canCompactInRemote(),
            compactFailureReason: fromEnumOpt(failure?.reason),
          });
        let Vo = pe ? compactFailureDetail(failure) : void 0,
          vo = Vo !== void 0 ? rebuildApiErrorMessage(at, Vo, deps) : at;
        return (
          yield vo,
          executeStopFailureHooks(vo, toolUseContext),
          markClassifierApiFailure(toolUseContext, querySource, vo),
          { reason: Yo }
        );
      }
      if (j) yield at;
      reportFabricatedTurns(assistantMessages, attemptModel);
      let te;
      if (at !== void 0 && (isWithheldMaxOutputTokens(at) || or)) {
        let ke = or ? maxOutputTokensRecoveryCount : maxOutputTokensRecoveryCount + 1;
        if (ke <= Kr) {
          let Ee =
            !or &&
            shouldResumeIncompleteThinking(
              assistantMessages,
              resolveRuntimeModel(
                [...messagesForQuery, ...assistantMessages.filter((ct) => !ct.isApiErrorMessage)],
                mode,
              ),
            );
          if (resumeActive && !or && !Ee && assistantMessages.some((ct) => !ct.isApiErrorMessage))
            logFeatureOk("query_thinking_block_resumption", { attempt: maxOutputTokensRecoveryCount });
          let Ie = Ee
            ? void 0
            : createUserMessage({
                content: shouldNudgeOutputLimitResume(assistantMessages, ke, querySource),
                isMeta: !0,
                turnCompanion: !0,
                now: deps.now,
                uuidFn: deps.uuid,
              });
          if (Ie !== void 0) yield Ie;
          return (
            (state = {
              guards: { ...guards, maxOutputTokensRecoveryCount: ke },
              messages:
                Ie === void 0
                  ? [...messagesForQuery, ...assistantMessages.filter((ct) => !ct.isApiErrorMessage)]
                  : [...messagesForQuery, ...assistantMessages, Ie],
              resumeIncompleteThinking: Ee || void 0,
              toolUseContext: toolUseContext,
              compactTracking: tracking,
              transition: { reason: "max_output_tokens_recovery", attempt: ke },
            }),
            NEXT_ROUND
          );
        }
        if (resumeActive) logFeatureBad("query_thinking_block_resumption", "exhausted");
        ((te = recoverExhaustedOutput({
          withheld: at,
          responses: assistantMessages,
          model: attemptModel,
          isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
          agentId: toolUseContext.agentId,
        })),
          yield te);
      }
      if (truncatedResponse !== void 0 && at === truncatedResponse) {
        let ke = truncatedResponse.streamCutCause ?? "unknown";
        if (maxOutputTokensRecoveryCount < Kr) {
          logFeatureSad("query_truncated_response_recovery", "nudged", {
            attempt: maxOutputTokensRecoveryCount + 1,
            cause: fromEnum(ke),
          });
          let Ee = createUserMessage({
            content: classifyQuerySource(querySource) === "subagent" ? STREAM_CUT_REWRITE : STREAM_CUT_RESUME,
            isMeta: !0,
            turnCompanion: !0,
            now: deps.now,
            uuidFn: deps.uuid,
          });
          return (
            yield Ee,
            (state = {
              guards: { ...guards, maxOutputTokensRecoveryCount: maxOutputTokensRecoveryCount + 1 },
              messages: [...messagesForQuery, ...assistantMessages, Ee],
              toolUseContext: toolUseContext,
              compactTracking: tracking,
              transition: {
                reason: "truncated_response_recovery",
                attempt: maxOutputTokensRecoveryCount + 1,
                cause: ke,
              },
            }),
            NEXT_ROUND
          );
        }
        (logFeatureBad("query_truncated_response_recovery", "exhausted", { cause: fromEnum(ke) }), yield at);
      }
      if (
        (at?.message.stop_reason ?? lastStopReason) === "tool_use" &&
        toolUseBlocks.length === 0 &&
        !at?.isApiErrorMessage
      ) {
        let preCompactContext = Mi(malformedToolUseRetryCount);
        if (
          (logEvent("tengu_malformed_tool_use_response", {
            will_retry: preCompactContext,
            retry_count: malformedToolUseRetryCount,
            model: telemetrySafeModelName(attemptModel),
            text_has_leaked_invoke: endsWithFabricatedTurn(assistantMessages),
          }),
          preCompactContext)
        ) {
          for (let lt of assistantMessages) yield { type: "tombstone", message: lt };
          let postCompactMessages = createUserMessage({
            content: MALFORMED_TOOL_CALL_RETRY,
            isMeta: !0,
            turnCompanion: !0,
            now: deps.now,
            uuidFn: deps.uuid,
          });
          return (
            (postCompactMessages.retractedMessageUuids = assistantMessages.map((lt) => lt.uuid)),
            yield postCompactMessages,
            (state = {
              guards: {
                ...guards,
                ...INITIAL_RECOVERY_STATE,
                malformedToolUseRetryCount: malformedToolUseRetryCount + 1,
              },
              messages: [...messagesForQuery, postCompactMessages],
              toolUseContext: toolUseContext,
              compactTracking: tracking,
              transition: { reason: "malformed_tool_use_retry" },
            }),
            NEXT_ROUND
          );
        }
        let Ee = [...lc(messagesForQuery, malformedToolUseRetryCount), ...assistantMessages];
        for (let msg of Ee) yield { type: "tombstone", message: msg };
        let Ie = createApiErrorMessage({
          content: "The model's tool call could not be parsed (retry also failed).",
          now: deps.now,
          uuid: deps.uuid,
        });
        return (
          (Ie.retractedMessageUuids = Ee.map((ct) => ct.uuid)),
          yield Ie,
          executeStopFailureHooks(Ie, toolUseContext),
          markClassifierApiFailure(toolUseContext, querySource, Ie),
          { reason: "malformed_tool_use_exhausted" }
        );
      }
      let Ne = at?.message.stop_reason ?? lastStopReason;
      if (
        (Ne === "end_turn" || Ne === "stop_sequence") &&
        !at?.isApiErrorMessage &&
        querySource !== "compact" &&
        !isCompactQuerySource(querySource) &&
        !hasSuccessfulToolCall_2(messagesForQuery) &&
        !assistantMessages.some((ke) =>
          ke.message.content.some((Ee) => Ee.type === "text" && Ee.text.trim().length > 0),
        ) &&
        !qe(messagesForQuery) &&
        !endsWithReminder(messagesForQuery)
      ) {
        if (!thinkingOnlyNudged) {
          logFeatureSad("query_thinking_only_response", "nudged");
          let ke = createUserMessage({
            content: fPn,
            isMeta: !0,
            turnCompanion: !0,
            now: deps.now,
            uuidFn: deps.uuid,
          });
          return (
            yield ke,
            (state = {
              guards: { ...guards, thinkingOnlyNudged: !0 },
              messages: [...messagesForQuery, ke],
              toolUseContext: toolUseContext,
              compactTracking: tracking,
              transition: { reason: "thinking_only_retry" },
            }),
            NEXT_ROUND
          );
        }
        if (
          (logFeatureBad("query_thinking_only_response", "nudge_exhausted"),
          assistantMessages.length === 0 && !toolUseContext.agentId && uc(messagesForQuery))
        ) {
          let recoveryMessage = createApiErrorMessage({
            content: "The model returned an empty response (retry also failed).",
            apiError: "empty_completion",
            now: deps.now,
            uuid: deps.uuid,
          });
          return (
            yield recoveryMessage,
            executeStopFailureHooks(recoveryMessage, toolUseContext),
            markClassifierApiFailure(toolUseContext, querySource, recoveryMessage),
            { reason: "api_error", isTransient: !1 }
          );
        }
      } else if (thinkingOnlyNudged) logFeatureOk("query_thinking_only_response");
      if (at?.isApiErrorMessage) {
        if (
          requireTurnClassifier &&
          getClassifierJobState(toolUseContext) &&
          isActingAsBgJob() &&
          querySource.startsWith("repl_main_thread") &&
          !toolUseContext.agentId
        ) {
          let ke = getAssistantMessageText(te ?? at) ?? at.errorDetails ?? "";
          await requireTurnClassifier().markApiFailure(
            getClassifierJobState(toolUseContext),
            getOwnJobShortId(),
            at.error,
            ke,
            at.apiError,
          );
        }
        return (
          executeStopFailureHooks(te ?? at, toolUseContext),
          {
            reason: "api_error",
            errorKind: at.error,
            isTransient: isTransientApiError(at),
            quotaLimits: at.quotaLimits,
            oauthRefreshDiskFull: at.oauthRefreshDiskFull,
          }
        );
      }
      return yield* runStopHooksAndFinish(toolUseContext);
    }
    async function* runStopHooksAndFinish(E, j) {
      let pe = j?.toolResults ?? [],
        me = !E.agentId && E.getAppState().activeGoal !== void 0,
        stopHookResult = yield* runStopHooks(
          messagesForQuery,
          assistantMessages,
          systemPrompt,
          userContext,
          systemContext,
          E,
          querySource,
          stopHookActive,
          stickyBetas,
          getClassifierJobState(E),
          pe,
        );
      if (stopHookBlockingCount > 0 && stopHookResult.blockingErrors.length === 0)
        logEvent("tengu_stop_hook_block_count", {
          count: stopHookBlockingCount,
          is_subagent: isNonMainSessionSubagent(E.agentContext),
          hit_max_turns: !1,
          hit_cap: !1,
          goal_active: me,
        });
      if (stopHookResult.preventContinuation)
        return j && E.abortController.signal.aborted
          ? { reason: "aborted_tools" }
          : { reason: "stop_hook_prevented" };
      let be = waitForTurnEndSummary(E.sessionState, () => stopHookResult.blockingErrors.length > 0);
      if (be !== void 0) await be;
      if (stopHookResult.blockingErrors.length > 0) {
        let te = turnCount + 1,
          qe = stopHookBlockingCount + 1;
        if (maxTurns && te > maxTurns)
          return (
            logEvent("tengu_stop_hook_block_count", {
              count: qe,
              is_subagent: isNonMainSessionSubagent(E.agentContext),
              hit_max_turns: !0,
              hit_cap: !1,
              goal_active: me,
            }),
            yield createAttachmentMessage_2(
              { type: "max_turns_reached", maxTurns: maxTurns, turnCount: te },
              deps,
            ),
            yield* runTurnEndReactions(E, [...messagesForQuery, ...assistantMessages, ...pe], {
              stopHookActive: stopHookActive,
            }),
            { reason: "max_turns", turnCount: te }
          );
        let Ne = env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP ?? 8;
        if (Ne > 0 && qe > Ne) {
          logEvent("tengu_stop_hook_block_count", {
            count: qe,
            is_subagent: isNonMainSessionSubagent(E.agentContext),
            hit_max_turns: !1,
            hit_cap: !0,
            goal_active: me,
          });
          let ke =
            `A hook blocked the turn from ending ${qe} consecutive times \u2014 overriding and ending turn. ` +
            "For Stop/SubagentStop hooks, check stop_hook_active in the input and return success while it's true. Set CLAUDE_CODE_STOP_HOOK_BLOCK_CAP to raise this limit.";
          if (
            (yield createSystemMessage(ke, "warning"),
            E.agentContext.agentType !== "teammate" && !isNonMainSessionSubagent(E.agentContext))
          )
            notifyStopHookCap(ke);
          return (
            yield* runTurnEndReactions(E, [...messagesForQuery, ...assistantMessages, ...pe], {
              stopHookActive: stopHookActive,
            }),
            { reason: "completed", goalPass: stopHookResult.goalPass }
          );
        }
        return (
          (state = {
            guards: {
              ...guards,
              ...INITIAL_RECOVERY_STATE,
              malformedToolUseRetryCount: 0,
              stopHookActive: !0,
              stopHookBlockingCount: qe,
              turnCount: te,
            },
            messages: [...messagesForQuery, ...assistantMessages, ...pe, ...stopHookResult.blockingErrors],
            toolUseContext: E,
            compactTracking: tracking,
            transition: { reason: "stop_hook_blocking" },
            pendingToolUseSummary: j?.pendingToolUseSummary,
            prevToolDurations: j?.prevToolDurations,
          }),
          NEXT_ROUND
        );
      }
      return { reason: "completed", goalPass: stopHookResult.goalPass };
    }
    let updatedToolUseContext = toolUseContext;
    queryCheckpoint("query_tool_execution_start");
    let bs = requireClassifierSurfaces
        ? requireClassifierSurfaces().detectSurfaces(
            isStorageV5Enabled() && toolUseContext.storageV5
              ? await requireClassifierSurfaces().watchedForSurfaces(toolUseContext.storageV5)
              : void 0,
          )
        : null,
      hr = bs ? requireClassifierSurfaces().sinksFor(bs) : null,
      sa = hr ? requireClassifierSurfaces().engineFor(hr) : null,
      Ko = getClassifierJobState(toolUseContext);
    if (
      requireTurnClassifier &&
      Ko &&
      sa &&
      classifyQuerySource(querySource) === "main" &&
      !toolUseContext.agentId
    ) {
      let E = hr.has("summary"),
        j = hr.has("headline");
      ((Ko.onClassified = (te, qe) => {
        if (!qe || !(E || j) || te.detail === Ko.lastEmittedDetail) return;
        if (((Ko.lastEmittedDetail = te.detail), E))
          toolUseContext.sessionState?.notifyMetadataChanged({ task_summary: te.detail });
        if (j) {
          let Ne = te.detail ? { text: te.detail, at: Date.now() } : null;
          toolUseContext.setAppState((ke) =>
            ke.taskSummary?.text === Ne?.text ? ke : { ...ke, taskSummary: Ne },
          );
        }
      }),
        (Ko.describeToolUse = (te, qe) => {
          try {
            return findToolByName(toolUseContext.options.tools, te)?.getActivityDescription?.(qe) ?? void 0;
          } catch (error) {
            logForDebugging(`[classifier] getActivityDescription(${te}) threw: ${toError(error).message}`);
            return;
          }
        }));
      let pe = getMainThreadAgentType(),
        me = pe
          ? toolUseContext.options.agentDefinitions.activeAgents.find(
              (activeAgent) => activeAgent.agentType === pe,
            )
          : void 0,
        found = messagesForQuery.find((te) => te.type === "user" && te.turnCompanion !== !0);
      if (found?.type === "user") {
        let content = found.message.content;
        requireTurnClassifier().captureIntent(
          Ko,
          typeof content === "string" ? content : (content.find((qe) => qe.type === "text")?.text ?? ""),
        );
      }
      let latestRealUserAsk = requireTurnClassifier().findLatestRealUserAsk(messagesForQuery);
      if (latestRealUserAsk) requireTurnClassifier().captureLatestAsk(Ko, latestRealUserAsk);
      requireTurnClassifier().classifyAndPushDebounced(
        Ko,
        getOwnJobShortId(),
        me,
        [...messagesForQuery, ...assistantMessages].filter((te) => te.type === "assistant"),
        hasActiveAgentTasks(toolUseContext.taskRegistry.all()),
        sa,
        bs,
      );
    }
    let remainingResults = attemptState.streamingToolExecutor.getRemainingResults();
    try {
      for await (let update of remainingResults) {
        if (hasTypeField(update)) {
          yield update;
          continue;
        }
        if (update.message)
          (yield markVirtualInResume(update.message),
            noteToolMessageFlags(update.message),
            recordToolResult(update.message, updatedToolUseContext));
        if (update.toolDuration) attemptState.toolDurations.push(update.toolDuration);
        if (update.newContext) updatedToolUseContext = { ...update.newContext, queryTracking: queryTracking };
      }
    } catch (error) {
      if (!(error instanceof ImageSizeError || error instanceof ImageResizeError)) {
        let j = resetStreamingToolExecutor(attemptState, "model_error");
        if (j.removes) yield j.removes;
        throw error;
      }
      return yield* endTurnOnError(error);
    }
    if ((queryCheckpoint("query_tool_execution_end"), na)) {
      let E = recordToolDescriptions(messagesForQuery, inlineToolsDeclared, {
        options: toolUseContext.options,
        querySource: querySource,
        head: promptHeadSent,
        stamp: deps,
        handed: promptRender.redescribing,
      });
      if (E) (yield E, (messagesForQuery = [...messagesForQuery, E]));
      let j = appendDeferredToolsRecord();
      if (j) yield j;
    }
    let pendingToolUseSummary_2;
    if (
      queryConfig.gates.emitToolUseSummaries &&
      toolUseBlocks.length > 0 &&
      !toolUseContext.abortController.signal.aborted &&
      !toolUseContext.agentId
    ) {
      let lastAssistantMessage = assistantMessages.at(-1),
        j;
      if (lastAssistantMessage) {
        let textBlocks = lastAssistantMessage.message.content.filter((block) => block.type === "text");
        if (textBlocks.length > 0) {
          let lastTextBlock = textBlocks.at(-1);
          if (lastTextBlock && "text" in lastTextBlock) j = lastTextBlock.text;
        }
      }
      let toolUseIds = toolUseBlocks.map((block) => block.id),
        toolInfoForSummary = toolUseBlocks.map((block) => {
          let toolResult = toolResults.find(
              (result) =>
                result.type === "user" &&
                Array.isArray(result.message.content) &&
                result.message.content.some(
                  (content) => content.type === "tool_result" && content.tool_use_id === block.id,
                ),
            ),
            te =
              toolResult?.type === "user" && Array.isArray(toolResult.message.content)
                ? toolResult.message.content.find(
                    (qe) => qe.type === "tool_result" && qe.tool_use_id === block.id,
                  )
                : void 0;
          return { name: block.name, input: block.input, output: te && "content" in te ? te.content : null };
        });
      pendingToolUseSummary_2 = generateToolUseSummary({
        tools: toolInfoForSummary,
        messages: [...messagesForQuery, ...assistantMessages],
        signal: toolUseContext.abortController.signal,
        isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
        lastAssistantText: j,
        agentContext: toolUseContext.agentContext,
        credentials: toolUseContext.credentials,
      })
        .then((summary) => {
          if (summary) return createToolUseSummaryMessage(summary, toolUseIds);
          return null;
        })
        .catch(() => null);
    }
    let finishAbortedTools = async function* () {
      if (!toolUseContext.agentId)
        try {
          yield* cleanupComputerUseAfterTurn(toolUseContext);
        } catch {}
      if (!isSilentAbortReason(toolUseContext.abortController.signal.reason))
        yield createUserInterruptionMessage({
          toolUse: !0,
          interruptedMessageId: getInterruptedMessageId(toolUseContext),
          interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
          now: deps.now,
          uuidFn: deps.uuid,
        });
      let E = turnCount + 1;
      if (maxTurns && E > maxTurns)
        yield createAttachmentMessage_2(
          { type: "max_turns_reached", maxTurns: maxTurns, turnCount: E },
          deps,
        );
      return (markClassifierTurnAborted(toolUseContext, querySource), { reason: "aborted_tools" });
    };
    if (toolUseContext.abortController.signal.aborted) return yield* finishAbortedTools();
    if (attemptState.toolWasDeferred)
      return (markClassifierTurnAborted(toolUseContext, querySource), { reason: "tool_deferred" });
    if (attemptState.shouldPreventContinuation)
      return (
        markClassifierTurnAborted(toolUseContext, querySource),
        yield* runTurnEndReactions(
          toolUseContext,
          [...messagesForQuery, ...assistantMessages, ...toolResults],
          { stopHookActive: stopHookActive },
        ),
        { reason: "hook_stopped" }
      );
    let endTurnOverrideMessage = nudgeAfterToolEndTurn({
        requested: attemptState.toolRequestedEndTurn,
        batchResults: toolResults,
        spent: mcpEndTurnOverrideSpent,
        lastIteration: Boolean(maxTurns && turnCount + 1 > maxTurns),
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
        deps: deps,
        makeUserMessage: createUserMessage,
      }),
      ia =
        !endTurnOverrideMessage &&
        shouldRunMcpStopHooks({
          requested: attemptState.toolRequestedEndTurn,
          lastIteration: Boolean(maxTurns && turnCount + 1 > maxTurns),
        });
    if (attemptState.toolRequestedEndTurn && !endTurnOverrideMessage && !ia)
      return (
        yield* endTurnFromToolResult({
          endTurnSource: attemptState.toolRequestedEndTurn === "tool" ? "tool" : "mcp_meta",
          messagesForQuery: messagesForQuery,
          assistantMessages: assistantMessages,
          toolResults: toolResults,
          toolUseBlocks: toolUseBlocks,
          systemPrompt: systemPrompt,
          userContext: userContext,
          systemContext: systemContext,
          toolUseContext: toolUseContext,
          updatedToolUseContext: updatedToolUseContext,
          querySource: querySource,
          stopHookActive: stopHookActive,
          stickyBetas: stickyBetas,
          queryChainIdForAnalytics: queryChainIdForAnalytics,
          queryDepth: queryTracking.depth,
          deps: deps,
        }),
        { reason: "completed" }
      );
    if (
      toolUseBlocks.length === 1 &&
      toolUseBlocks[0].name === SCHEDULE_WAKEUP_TOOL_NAME &&
      needsFableMitigations(
        getCanonicalName(toolUseContext.options.mainLoopModel),
        toolUseContext.options.mainLoopModel,
      )
    ) {
      let prompt = toolUseBlocks[0].input.prompt;
      if (getSessionCronTasks().some((j) => j.kind === "loop" && j.prompt === prompt))
        return (
          logEvent("tengu_loop_dynamic_wakeup_ends_turn", {
            queryChainId: queryChainIdForAnalytics,
            queryDepth: queryTracking.depth,
          }),
          markClassifierTurnAborted(toolUseContext, querySource),
          yield* handleStopHooks(
            messagesForQuery,
            assistantMessages,
            toolResults,
            systemPrompt,
            userContext,
            systemContext,
            toolUseContext,
            querySource,
            stopHookActive,
            stickyBetas,
            getClassifierJobState(toolUseContext),
          ),
          { reason: "completed" }
        );
    }
    if (tracking?.compacted)
      (tracking.turnCounter++,
        logEvent("tengu_post_autocompact_turn", {
          turnId: ye(tracking.turnId),
          turnCounter: tracking.turnCounter,
          queryChainId: queryChainIdForAnalytics,
          queryDepth: queryTracking.depth,
        }));
    if (
      (logEvent("tengu_query_before_attachments", {
        messagesForQueryCount: messagesForQuery.length,
        assistantMessagesCount: assistantMessages.length,
        toolResultsCount: toolResults.length,
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
      }),
      hasHookForEvent(
        "PostToolBatch",
        updatedToolUseContext.sessionHooksRegistry,
        registerAgent(updatedToolUseContext, "PostToolBatch", updatedToolUseContext.session.id),
      ))
    ) {
      let E = `hook-${deps.uuid()}`,
        j = KBr(
          toolUseBlocks.map((cmd) => cmd.name),
          updatedToolUseContext.options.tools,
        ),
        pe = new Map();
      for (let be of toolResults)
        if (be.type === "user" && Array.isArray(be.message.content)) {
          for (let te of be.message.content)
            if (te.type === "tool_result") pe.set(te.tool_use_id, te.content);
        }
      let me = !1,
        he;
      try {
        for await (let attachment of executePostToolBatchHooks(
          toolUseBlocks.map((te) => ({
            tool_name: te.name,
            tool_input: te.input,
            tool_use_id: te.id,
            tool_response: pe.get(te.id),
          })),
          E,
          updatedToolUseContext,
          getToolPermissionContext(updatedToolUseContext).mode,
          updatedToolUseContext.abortController.signal,
        )) {
          if (
            attachment.message &&
            !(
              attachment.message.type === "attachment" &&
              attachment.message.attachment.type === "hook_blocking_error"
            )
          )
            yield attachment.message;
          if (attachment.additionalContexts && attachment.additionalContexts.length > 0) {
            let memoryAttachments = createAttachmentMessage_2(
              {
                type: "hook_additional_context",
                content: attachment.additionalContexts,
                hookName: "PostToolBatch",
                toolUseID: E,
                hookEvent: "PostToolBatch",
                accountMemoryBatch: j,
              },
              deps,
            );
            (yield memoryAttachments, toolResults.push(memoryAttachments));
          }
          if (attachment.blockingError) ((me = !0), (he ??= attachment.blockingError.blockingError));
          if (attachment.preventContinuation) ((me = !0), (he ??= attachment.stopReason));
        }
      } catch (error) {
        if (!vAn(error, updatedToolUseContext.abortController.signal)) throw error;
        logForDebugging("PostToolBatch hooks cancelled");
      }
      if (updatedToolUseContext.abortController.signal.aborted) {
        if (!updatedToolUseContext.agentId)
          try {
            yield* cleanupComputerUseAfterTurn(updatedToolUseContext);
          } catch {}
        if (!isSilentAbortReason(updatedToolUseContext.abortController.signal.reason))
          yield createUserInterruptionMessage({
            toolUse: !1,
            interruptedMessageId: getInterruptedMessageId(updatedToolUseContext),
            interruptedByShutdown: shutdownInterruptStamp(updatedToolUseContext.abortController.signal),
            now: deps.now,
            uuidFn: deps.uuid,
          });
        return (markClassifierTurnAborted(updatedToolUseContext, querySource), { reason: "aborted_tools" });
      }
      if (me)
        return (
          yield createAttachmentMessage_2(
            {
              type: "hook_stopped_continuation",
              message: he || "Execution stopped by PostToolBatch hook",
              hookName: "PostToolBatch",
              toolUseID: E,
              hookEvent: "PostToolBatch",
              accountMemoryBatch: j,
            },
            deps,
          ),
          markClassifierTurnAborted(updatedToolUseContext, querySource),
          yield* runTurnEndReactions(
            updatedToolUseContext,
            [...messagesForQuery, ...assistantMessages, ...toolResults],
            { stopHookActive: stopHookActive },
          ),
          { reason: "hook_stopped" }
        );
    }
    if (ia)
      return yield* runStopHooksSafely({
        throughStopHooks: () =>
          runStopHooksAndFinish(updatedToolUseContext, {
            toolResults: toolResults,
            pendingToolUseSummary: pendingToolUseSummary_2,
            prevToolDurations:
              attemptState.toolDurations.length > 0 ? [...attemptState.toolDurations] : void 0,
          }),
        onThrow: () => markClassifierTurnAborted(updatedToolUseContext, querySource),
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
      });
    if (updatedToolUseContext.options.refreshTools) {
      let refreshTools = updatedToolUseContext.options.refreshTools();
      if (refreshTools !== updatedToolUseContext.options.tools) {
        let j = count(updatedToolUseContext.options.tools, (me) => !!me.mcpInfo),
          pe = count(refreshTools, (me) => !!me.mcpInfo);
        if (j !== pe)
          logEvent("tengu_mcp_tools_refreshed_mid_turn", {
            oldMcpCount: j,
            newMcpCount: pe,
            recovered: j === 0 && pe > 0,
          });
        updatedToolUseContext = {
          ...updatedToolUseContext,
          options: { ...updatedToolUseContext.options, tools: refreshTools },
        };
      }
    }
    if (updatedToolUseContext.options.refreshMcpClients) {
      let refreshMcpClients = updatedToolUseContext.options.refreshMcpClients();
      updatedToolUseContext = {
        ...updatedToolUseContext,
        options: { ...updatedToolUseContext.options, mcpClients: refreshMcpClients },
      };
    }
    let Vc = getCurrentCallId(),
      aa = () =>
        filterQueuedCommandsForThread(
          toolUseContext.messageQueue
            .getCommandsByMaxPriority("next")
            .concat(
              toolUseContext.queuedNotificationsRegistry.heldNudge({
                agentId: toolUseContext.agentId,
                messageQueue: toolUseContext.messageQueue,
                ccrTurnId: Vc,
                nobodysTurn: se,
              }),
            ),
          { isMainThread: isMainThreadQuery, currentAgentId: toolUseContext.agentId },
        ).filter(createFoldCommandFilter(createScreensReader(() => updatedToolUseContext, { latch: !0 })));
    if (
      Xl({
        foldSuspended: toolUseContext.messageQueue.isMidTurnFoldSuspended(),
        isMainThread: isMainThreadQuery,
        lastIteration: Boolean(maxTurns && turnCount + 1 > maxTurns),
      })
    )
      await Jl(
        toolUseContext,
        createQueueFilterForThread({ isMainThread: isMainThreadQuery, agentId: toolUseContext.agentId }),
        aa,
      );
    let da = isMainThreadQuery,
      _r = turnCount + 1,
      Ts = maxTurns && _r > maxTurns ? maxTurns : void 0,
      Cs = toolUseContext.messageQueue.isMidTurnFoldSuspended() || Ts !== void 0 ? [] : aa();
    se &&= !Cs.some(isPersonQueuedInput);
    let Ms = da
        ? await routeSubmissions(Cs, updatedToolUseContext)
        : { deliverable: Cs, notices: [], dropped: [] },
      deliverable = Ms.deliverable;
    toolUseContext.messageQueue.registerFoldInFlight(deliverable);
    try {
      for (let { uuid: uuid } of Ms.dropped)
        if (uuid !== void 0)
          (yield { type: "command_lifecycle", uuid: uuid, state: "started" },
            yield { type: "command_lifecycle", uuid: uuid, state: "completed" });
      for (let notice of Ms.notices) yield notice;
      let E = 0,
        j = 0,
        pe,
        msg = createFoldCommandFilter(createScreensReader(() => updatedToolUseContext, { latch: !1 })),
        he = new Set(),
        filtered = deliverable.filter(isInlineNotificationMode),
        te = applyDisallowedTools(filtered, params.joinedDisallowedTools, updatedToolUseContext.options);
      if (te !== updatedToolUseContext.options.tools)
        updatedToolUseContext = {
          ...updatedToolUseContext,
          options: { ...updatedToolUseContext.options, tools: te },
        };
      let qe = 0;
      for await (let Ee of getAttachmentMessages(
        null,
        updatedToolUseContext,
        null,
        deliverable,
        deps,
        [...messagesForQuery, ...assistantMessages, ...toolResults],
        querySource,
        { conversationLatches: stickyBetas, afterToolStep: !0 },
      )) {
        let Ie;
        if (Ee.attachment.type === "queued_command" && Ee.attachment.commandMode !== void 0) {
          if (((Ie = filtered[qe]), qe++, Ie !== void 0 && !msg(Ie))) {
            he.add(Ie);
            continue;
          }
        }
        let ct = nl(Ee, updatedToolUseContext.options.announcementWalk);
        if (ct === void 0) continue;
        if (
          (yield ct,
          toolResults.push(ct),
          Ee.attachment.type === "queued_command" && Ee.attachment.commandMode !== void 0)
        ) {
          E++;
          for (let lt of await applyFoldedPromptSubmit(Ie?.promptSubmitted, updatedToolUseContext))
            (yield lt, toolResults.push(lt));
        }
        if (Ee.attachment.type === "poll_events") j++;
      }
      let filtered_2 = filtered.filter((Ee) => !he.has(Ee));
      if (filtered_2.length > 0 && E === 0)
        logForDebugging(
          `[query] queued_command attachments degraded to 0 for ${filtered_2.length} consumed command(s) \u2014 leaving them queued instead of dropping them`,
          { level: "warn" },
        );
      else {
        if (filtered_2.length > 0 && E < filtered_2.length)
          logForDebugging(
            `[query] partial queued_command emission: ${E}/${filtered_2.length} \u2014 removing commands that were not all delivered`,
            { level: "error" },
          );
        if ((V2e(filtered_2), filtered_2.length > 0))
          if (
            updatedToolUseContext.abortController.signal.aborted ||
            updatedToolUseContext.messageQueue.isMidTurnFoldSuspended()
          )
            logForDebugging(
              `[query] abort/suspension during mid-turn absorption \u2014 leaving ${filtered_2.length} command(s) queued`,
            );
          else {
            if (
              (toolUseContext.messageQueue.consume(filtered_2, { reason: "absorbed_mid_turn" }),
              reportQueuedSubmissions(filtered_2, "mid_turn"),
              markMessagesRead(filtered_2),
              pwd(filtered_2),
              getValueFromInput_2(filtered_2, isMainThreadQuery),
              recordSubmittedPrompts(filtered_2, toolUseContext.storageV5, {
                armUndo: !1,
                placed: withExpandedPastes,
              }),
              da &&
                filtered_2.some(
                  (Ie) =>
                    Ie.mode === "prompt" && !Ie.isMeta && Ie.shouldQuery !== !1 && isHumanOrigin(Ie.origin),
                ))
            )
              (notifyAutoReactHumanTurn(),
                resetGoalIdleCheckinCount(toolUseContext.setAppState, toolUseContext.session.sessionScratch));
            let Ee = shouldPreemptPromptTooLong(
              filtered_2,
              updatedToolUseContext.options.mainLoopModel,
              getEffortValue(updatedToolUseContext),
              deps,
            );
            if (Ee)
              ((updatedToolUseContext = applyContextLayers(updatedToolUseContext, [Ee.layer])),
                yield Ee.reminder,
                toolResults.push(Ee.reminder));
            for (let att of filtered_2)
              if (att.uuid && !xxr(toolUseContext.messageQueue, att.uuid))
                (startedCommandUuids.push(att.uuid),
                  yield { type: "command_lifecycle", uuid: att.uuid, state: "started" });
          }
      }
      let consumedCommands = deliverable.filter(Kv);
      if (consumedCommands.length > 0)
        if (j === 0) logPollEventsLeftQueued("mid-turn", consumedCommands.length);
        else {
          let Ee = yield* absorbQueuedPollEvents({
            events: consumedCommands,
            queue: toolUseContext.messageQueue,
            signal: updatedToolUseContext.abortController.signal,
            phase: "mid-turn",
            deliveredPollEventUuids: deliveredPollEventUuids,
          });
          for (let Ie of Ee) yield markVirtualInResume(Ie);
        }
    } finally {
      toolUseContext.messageQueue.unregisterFoldInFlight(deliverable);
    }
    if (
      memoryRecallPrefetch &&
      memoryRecallPrefetch.settledAt !== null &&
      memoryRecallPrefetch.consumedOnIteration === -1
    ) {
      let E = filterDuplicateMemoryAttachments(
        memoryRecallPrefetch.screen(await memoryRecallPrefetch.promise, [
          ...messagesForQuery,
          ...assistantMessages,
          ...toolResults,
        ]),
        toolUseContext.readFileState,
        toolUseContext.session,
        memoryRecallPrefetch.earlierReadsMayBeCleared,
      );
      for (let cmd of E) {
        let fileChangeAttachmentCount = createAttachmentMessage_2(cmd, deps);
        (yield fileChangeAttachmentCount, toolResults.push(fileChangeAttachmentCount));
      }
      memoryRecallPrefetch.consumedOnIteration = turnCount - 1;
    }
    let zc = count(
      toolResults,
      (tr) => tr.type === "attachment" && tr.attachment.type === "edited_text_file",
    );
    logEvent("tengu_query_after_attachments", {
      totalToolResultsCount: toolResults.length,
      fileChangeAttachmentCount: zc,
      queryChainId: queryChainIdForAnalytics,
      queryDepth: queryTracking.depth,
    });
    let toolUseContextWithQueryTracking = { ...updatedToolUseContext, queryTracking: queryTracking };
    if (Ts !== void 0)
      return (
        yield createAttachmentMessage_2({ type: "max_turns_reached", maxTurns: Ts, turnCount: _r }, deps),
        markClassifierTurnAborted(toolUseContext, querySource),
        yield* runTurnEndReactions(
          updatedToolUseContext,
          [...messagesForQuery, ...assistantMessages, ...toolResults],
          { stopHookActive: stopHookActive },
        ),
        { reason: "max_turns", turnCount: _r }
      );
    if (endTurnOverrideMessage) (yield endTurnOverrideMessage, toolResults.push(endTurnOverrideMessage));
    return (
      queryCheckpoint("query_recursive_call"),
      (state = {
        guards: {
          ...guards,
          ...INITIAL_LOOP_RECOVERY_STATE,
          mcpEndTurnOverrideSpent: mcpEndTurnOverrideSpent || endTurnOverrideMessage !== void 0,
          turnCount: _r,
        },
        messages: [...messagesForQuery, ...assistantMessages, ...toolResults],
        toolUseContext: toolUseContextWithQueryTracking,
        compactTracking: tracking,
        pendingToolUseSummary: pendingToolUseSummary_2,
        transition: { reason: "next_turn" },
        prevToolDurations: attemptState.toolDurations.length > 0 ? [...attemptState.toolDurations] : void 0,
      }),
      NEXT_ROUND
    );
  }
  async function* runIterationRecordingErrors() {
    let k = yield* runIteration();
    if (k !== NEXT_ROUND) {
      let { recordProjectsReplyTurnError: recordProjectsReplyTurnError } = require("./chunk-cshk0jw3.js");
      recordProjectsReplyTurnError(k, querySource, {
        messages: state.messages,
        agentId: state.toolUseContext.agentId,
        engineState: () => state.toolUseContext.getAppState(),
      });
    }
    return k;
  }
  while (!0) {
    let k = yield* runIterationRecordingErrors();
    if (k !== NEXT_ROUND) return k;
  }
}
/**
 * 模型回退的系统提示文案：overloaded/server_error → "due to high demand"；model_not_found/permission_denied/model_blocked → "is not available"（附错误摘要）；last_resort → 不可重试错误。
 */
//@ chunk-ha3km179.js:234645-235046 sole-consumer
function formatModelFallbackMessage(e, n, r, s) {
  switch (e) {
    case "overloaded":
    case "server_error":
      return `Switched to ${r} due to high demand for ${n}`;
    case "model_not_found":
    case "permission_denied":
    case "model_blocked": {
      let h = e === "model_not_found" && !isModelNotFoundError(s) ? formatFallbackErrorDetail(s) : "";
      return `Switched to ${r} because ${n} is not available${h}`;
    }
    case "last_resort":
      return `Switched to ${r} because ${n} returned an error that could not be retried${formatFallbackErrorDetail(s)}`;
  }
}
/**
 * 把原始错误转成最多 300 字符的 " (…)" 后缀。
 */
//@ chunk-ha3km179.js:235046-235155 sole-consumer
function formatFallbackErrorDetail(e) {
  let n = e === void 0 ? "" : errorMessage(e),
    r = truncateToLength(n, 300),
    s = r.length < n.length ? `${r}\u2026` : n;
  return s ? ` (${s})` : "";
}
/**
 * 处理折叠进本轮的 prompt.submit：应用会话标题，保留 attachment/user 消息，并把 UserPromptSubmit 钩子附加上下文（截断后）作为 hook_additional_context 附件追加。
 */
//@ chunk-ha3km179.js:235155-235573 sole-consumer
async function applyFoldedPromptSubmit(e, n) {
  if (e === void 0) return [];
  if (e.sessionTitle !== void 0)
    try {
      await applyHookSessionTitle(n.session.id, e.sessionTitle, n.storageV5, n.credentials);
    } catch (error) {
      if (!isAbortError(error))
        logForDebugging(`Failed to apply a folded prompt.submit session title: ${errorMessage(error)}`, {
          level: "error",
        });
    }
  let filtered = e.messages.filter((message) => message.type === "attachment" || message.type === "user"),
    s = await capAdditionalContext(e.context ?? [], "prompt.submit", n.storageV5);
  return s.length > 0 ? [...filtered, createHookContextAttachment(s, "prompt.submit")] : filtered;
}
/**
 * 返回最后一条真实人类消息（非 meta、非工具结果、非压缩摘要）的下标，没有时返回 0；queryLoop 用它设置 turnStartIndex。旧版名 isHumanTurn 名不符实（返回下标）。
 */
//@ chunk-ha3km179.js:235573-235717 sole-consumer = isHumanTurn (0.779)
function isHumanTurn(m) {
  for (let n = m.length - 1; n >= 0; n--) {
    let r = m[n];
    if (r.type === "user" && !r.isMeta && !r.toolUseResult && !r.isCompactSummary) return n;
  }
  return 0;
}
/**
 * 主线程/子代理时清空 options.activeMcpServer/activeMcpTool（每轮 API 循环开始与 attempt 重置时调用）。
 */
//@ chunk-ha3km179.js:235717-235814 sole-consumer
function clearActiveMcpContext(e, n) {
  try {
    if (!n) return;
    ((e.activeMcpServer = void 0), (e.activeMcpTool = void 0));
  } catch (error) {
    logError(error);
  }
}
/**
 * 生成队列命令过滤器：可折叠命令放行；遇到第一条不可折叠的 prompt 命令后，其后的 prompt 命令都不再折叠进本轮。
 */
//@ chunk-ha3km179.js:235814-235920 sole-consumer = getValueFromInput (1)
function createFoldCommandFilter(input) {
  let n = !1;
  return (r) => {
    if (n && r.mode === "prompt") return !1;
    if (!isCommandFoldable(r, input)) return !0;
    return ((n = !0), !1);
  };
}
/**
 * 命令能否折叠进当前轮：drainOnly/screeningPending 恒可；没有 promptSubmitted 不可；否则要求提交时的钩子/插件快照与当前一致（AKn 比较）。
 */
//@ chunk-ha3km179.js:235920-236090 sole-consumer
function isCommandFoldable(e, n) {
  if (e.drainOnly === !0 || e.screeningPending === !0) return !0;
  if (e.promptSubmitted === void 0) return !1;
  let r = n();
  return r === void 0 || screensChanged(e.promptSubmitted.under, r);
}
//@ chunk-4163ksv9.js:263-281 placement
var d = ["take_in"];
//@ chunk-4163ksv9.js:281-306 placement
class r {
  visitors = new Map();
}
//@ chunk-4163ksv9.js:306-330 placement
var l = new SessionRootSlot(() => new r());
//@ chunk-4163ksv9.js:330-388 placement
function a(o) {
  try {
    return o.pending() === !0;
  } catch {
    return !1;
  }
}
//@ chunk-4163ksv9.js:388-473 placement
function hMs(o) {
  let e = l.peek(o)?.visitors;
  return e !== void 0 && [...e.values()].some(a);
}
/**
 * 运行注册的回合访问者，可被中止
 */
//@ chunk-4163ksv9.js:473-827 placement
async function runTurnVisitors(o, e) {
  let n = l.peek(o)?.visitors;
  if (n === void 0) return;
  let p = (async () => {
    for (let s of d) {
      let i = n.get(s);
      if (i !== void 0 && !X0(e) && a(i))
        try {
          await i.visit(e);
        } catch {}
    }
  })();
  if (X0(e)) return;
  let t = () => {},
    promise = new Promise((s) => {
      t = () => s();
    });
  e.addEventListener("abort", t, { once: !0 });
  try {
    await Promise.race([p, promise]);
  } finally {
    e.removeEventListener("abort", t);
  }
}
//@ chunk-32qjrk8h.js:191-216 placement
function vHs(e) {
  return [];
}

export { query };
