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
  refusalFallbackDialog,
  refusalRouteLimit,
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
  hasImageBlock,
  normalizeMessages,
  isNotEmptyMessage,
  createInformationalSystemMessage,
  isSafetyMonitorBlockedMessage,
  isToolResultMessage,
  STREAM_CUT_REWRITE,
  STREAM_CUT_RESUME,
  MALFORMED_TOOL_CALL_RETRY,
  NO_VISIBLE_OUTPUT_TEXT,
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
import { isStreamClosedOrAbortError } from "./utils/abortErrors.js";
import { cleanupComputerUseAfterTurn } from "./utils/computerUse/cleanup.js";
import { handleStopHooks, maybeStartPrecomputeAfterTurn, call } from "./query/stopHooks.js";
import { isAbortError, toError, withTelemetryMessage, errorMessage } from "./utils/errors.js";
import { logError } from "./utils/log.js";
import { classifyQuerySource, isAutoModeQuerySource } from "./services/api/requestHeaders.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  latchConversationAtis,
} from "./services/analytics/growthbook.js";
import { stripAnyVersatileSuffix } from "./utils/model/modelIds.js";
import {
  shouldResumeThinking,
  isRetryableApiErrorMessage,
  resumeTruncatedThinking,
} from "./services/api/thinkingResumption.js";
import { totalTokensOf, getTokenCountFromUsage } from "./utils/messages/usageAndStopReason.js";
import { endProfilePhase, startProfilePhase, queryCheckpoint, noteRedrive } from "./utils/queryProfiler.js";
import {
  observeRunningTurn,
  buildArmedObserverAttachment,
  wrapArtifactPatchTurn,
  wrapCallModelWithAttachments,
  applyToolExclusionEdit,
  isSleepCheckPhrase,
  routeSubmissions,
} from "./query/presenceCheck.js";
import { awaitArtifactRosterSafe } from "./services/artifacts/rosterWait.js";
import { isObserverAgentsEnabled, ensureMainObserver } from "./services/agentObserver/agentObserver.js";
import {
  discardPrecompute,
  manuallyExtractSessionMemory,
  isCompactCommandSource,
  applyPrecomputedCompact,
  shouldArmPrecompute,
  latchArmGate,
  armPrecomputedCompact,
} from "./services/compact/precomputedCompact.js";
import {
  updateGoalAfterTurn,
  createQueueDelivery,
  abortedTurnRows,
  notifyCompactFailure_2,
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
  snapshotMessagesAndStart,
  withTurnMessages,
  autoModeTurnAttachments,
  checkAutoModeRequested,
  classifierRoleFor,
  refreshGitStateSafe,
  isClassifierRoleOn,
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
  MAX_CONTINUE_ATTEMPTS,
  shouldNudgeOutputLimitResume,
  recoverExhaustedOutput,
  INITIAL_RECOVERY_STATE,
} from "./query/outputLimitRecovery.js";
import { checkTurnIdsConsistent, getCurrentCallId } from "./services/mcp/ccrTurnId.js";
import { settleDeliveredEvents, isPollEventMode, setPollEventDeliveryGuard } from "./utils/pollEvents.js";
import {
  endsWithMachineTurn,
  isPersonQueuedInput,
  hasAuthoritativePollEvents,
  isQuestionTool,
} from "./utils/messages/messageSource.js";
import {
  buildContextRouting,
  rebuildRoutingAfterCompaction,
  reannounceAfterCompact,
  insertAfterCompactBoundary,
  refreshRoutedGitStatus,
  shouldSendProjectDocText,
  checkProjectDocReadAllowed,
  anyDocReadHookBlocks,
  reportContextAnnouncements,
  createContextRoomTracker,
  applyReminders,
  placeBatchingReminder,
  safeMapOrUndefined,
} from "./utils/claudemd/contextRouting.js";
import { withTurnStepHooks, canResumeThinkingOnModel } from "./query/turnHooks.js";
import { productionDeps, backfillObservableInput } from "./query/deps.js";
import {
  redescribeEpochFor,
  sectionAnswersSnapshot,
  startRequeueWindowSafe,
  crossOrgThinkingAttachments,
  recordPromptSnapshot,
  recordDeferredTools,
  recordToolDescriptions,
  wasPutBackSafe,
} from "./query/promptSnapshot.js";
import {
  releaseStaleRefusalEffortCarry,
  carriedEffortForModel,
  refusedEffortTelemetryFields,
  resolveRefusalFallbackEffort,
} from "./utils/permissions/permissionSetup.js";
import { idleCompactionSlot, COMPACTED_WITH_PRECOMPUTED_TEXT } from "./services/compact/idleCompaction.js";
import { messagesSinceCompactBoundary } from "./services/projects/threadRows.js";
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
  isPassiveMainAgentCommand,
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
  mainLoopModelOverride,
  effectiveTurnModel,
  checkModelSwitch,
  adoptedFallbackChain,
  nextFallbackModel as nextFallbackModel_2,
  isFallbackTo,
} from "./query/modelSelection.js";
import { createStickyBetaLatches, forkStickyBetaLatches, markBetaRejected } from "./bootstrap/stateSlices.js";
import { runTurnEndReactions, runStopHooks, waitForTurnEndSummary } from "./query/postTurnSummary.js";
import { headlessProfilerCheckpoint } from "./utils/headlessProfiler.js";
import { sanitizeMarkName } from "./utils/startupMarks.js";
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
  canDrainTools,
  noopAsyncDrain,
  shouldPreemptPromptTooLong,
} from "./query/toolDrain.js";
import { isLocalCommandMarkup } from "./utils/messages/localCommandTags.js";
import {
  applyToolResultBudget,
  toolResultsDirFor_2,
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
import { rollOverTotalTokensContext } from "./utils/attachments/totalTokensReminder.js";
import {
  createCompactTracking,
  estimateTokensWithAnchor,
  calculateTokenWarningState,
  checkRapidRefillBreaker,
  runCompactionAsStream,
} from "./services/compact/autoCompact.js";
import { stampSummaryTurnFields } from "./utils/messages/promptOrigin.js";
import { isMainAgent, isMainConversationContext, isNonMainSessionSubagent } from "./utils/agentContext.js";
import {
  buildPostCompactMessages,
  buildPostCompactMessagesWithoutKept,
  recoveryTimeoutForMessages,
  hasTooFewMessagesToCompact,
  countNonProgressMessages,
} from "./services/compact/compact.js";
import {
  backgroundOutputGateOpen,
  hasPendingBackgroundOutput,
  backgroundOutputGateSlots,
} from "./tasks/LocalShellTask/backgroundNotices.js";
import { copyTextOf } from "./components/messageActions.js";
import { usageLimitNotices } from "./services/rateLimitMessages.js";
import { resolveAdvisorState } from "./utils/advisor/advisorState.js";
import { canDeclareToolChangeAhead } from "./services/api/declaredToolSet.js";
import { latestPromptSnapshot, recordedDeferredTools } from "./utils/contextAttachments/promptSnapshot.js";
import { noopLedger } from "./services/api/promptPrefixLedger.js";
import { expectPromptCacheDrop, MAIN } from "./services/api/promptCacheBreakDetection.js";
import { asSystemPrompt } from "./utils/systemPromptType.js";
import { appendSystemContextToPrompt, prependUserContextReminder } from "./utils/api.js";
import { isVirtualConversationMessage, SessionRootSlot } from "./bootstrap/sessionSlices.js";
import {
  shouldRetryRefusal,
  shouldAskRefusalFallbackPreference,
  mi,
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
import { higherSourceRank, getToolEndsTurnKind } from "./services/tools/mcpResultMeta.js";
import { validateImagesInMessages } from "./utils/messages/accountMemory.js";
import { hasTypeField } from "./services/tools/toolExecution.js";
import { ImageSizeError } from "./utils/imageValidation.js";
import { ImageResizeError } from "./utils/imageResizer.js";
import {
  automaticModelFallbackInfo,
  INITIAL_REJECTION_EPISODE,
  takePendingNotice,
  takeFallbackNotice,
  nextFallbackStage,
  atLeast,
  isChainRouteMatch,
  recordFallbackAttempt,
  clearPendingNotice,
  recordFallbackNotice,
  initialRejectionEpisode,
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
  needsOverageConsentForModel,
  needsOverageConsentOnMainThread,
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
import { hasExplicitWindow, usesLongContextWindow } from "./services/compact/autoCompactWindow.js";
import {
  compactFailureDetail,
  isPromptTooLongReply,
  isMediaSizeErrorReply,
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
  l8s,
  describeServerFallback,
  preferSameModel,
  buildRefusalFallbackSystemMessage,
  modelUnavailableMessage,
} from "./services/api/modelFallback.js";
import { canUseNoTransientReminders, reminderDeliveryMode } from "./services/api/tether.js";
import { isTerminalShutdown, heldUntilExit } from "./utils/terminalShutdown.js";
import { isBetaTracingEnabled } from "./utils/telemetry/betaSessionTracing.js";
import { guardGoalCheck, notifyAutoReactHumanTurn, resetGoalIdleCheckinCount } from "./query/goalCheckIn.js";
import { expandPathOrNull } from "./utils/path.js";
import { isEntitlementOverlayUnavailable, isModelAllowed } from "./utils/model/modelAllowlist.js";
import { shortHash } from "./utils/shortHash.js";
import {
  isModelAllowedUnderActiveEnforcement,
  isExemptDefaultResolvingPick,
} from "./utils/model/defaultModel.js";
import { BETA_SERVER_SIDE_FALLBACK_CATEGORY } from "./utils/betas.js";
import {
  assessPartialResponse,
  buildContinuationPrompt,
  stitchContinuation,
} from "./services/api/partialResponse.js";
import { streamFallbackWarning } from "./services/api/streamFallbackWarning.js";
import { withCitationsDropped } from "./services/orgMemory/promptIndex.js";
import { shouldRecordHarnessText, recordTextBlocks } from "./utils/harnessTagGate.js";
import { recordServerToolsUsed } from "./services/compact/keptTools.js";
import { swapShrinksContextWindow } from "./utils/model/smallFastModel.js";
import { FallbackTriggeredError, isModelNotFoundError } from "./services/api/withRetry.js";
import {
  blockAndResetStream,
  recoveryOutcome,
  guardedStreamCallback,
  reportFabricatedTurns,
  canRecoverAgain,
  endsWithFabricatedTurn,
  recentMalformedRetries,
  shouldTryRecovery,
} from "./query/malformedToolCallRecovery.js";
import { STRUCTUREDOUTPUT } from "./tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { roughTokenCountEstimationForMessages } from "./services/tokenEstimation.js";
import { hasSuccessfulToolCall_2 } from "./utils/transcript/deserialize.js";
import { env } from "./utils/env.js";
import { isStorageV5Enabled } from "./utils/hoverRest.js";
import { hasActiveAgentTasks } from "./tasks/taskStatus.js";
import { generateToolUseSummary } from "./services/toolUseSummary/toolUseSummaryGenerator.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "./tools/ScheduleWakeupTool/prompt.js";
import { needsFableMitigations } from "./utils/model/fableMitigations.js";
import { getCanonicalName } from "./utils/model/canonicalModelName.js";
import { registerAgent } from "./utils/telemetry/perfettoTracing.js";
import { anyTrustedMemoryToolSafe } from "./utils/hooks/hookEventHelpers.js";
import { count } from "./utils/collections.js";
import {
  createScreensReader,
  createHookContextAttachment,
  screensChanged,
} from "./utils/processUserInput/userPromptSubmitHooks.js";
import { markMessagesRead } from "./bridge/readReceipts.js";
import { recordContextKeyFromMessages } from "./utils/cwd.js";
import { recordSubmittedPrompts } from "./history.js";
import { isHumanOrigin } from "./utils/turnOrigin.js";
import { truncateToLength } from "./utils/stringUtils.js";
import { applyHookSessionTitle } from "./utils/sessionTitle.js";
import { capAdditionalContext } from "./services/tools/toolHooks.js";
import { isAborted } from "./utils/abortSignalUtils.js";

//@ chunk-ha3km179.js:153194-153282 sole-consumer
/**
 * 构建时裁掉的可选拒绝跟踪模块（恒为 null）；requireTurnClassifier/requireClassifierSurfaces 惰性加载活动分类器与其输出面（chunk-wd9kxbpn、chunk-e321p3vc）。
 */
var toolDenialTracker = null;
var requireTurnClassifier = () => require("./chunk-wd9kxbpn.js");
var requireClassifierSurfaces = () => require("./chunk-e321p3vc.js");
//@ chunk-ha3km179.js:153282-153317 sole-consumer
/**
 * 按 session.host 存放分类器任务状态的懒槽。
 */
var classifierJobStateSlot = new HostScoped(() => ({
  state: undefined,
}));
//@ chunk-ha3km179.js:153317-153444 sole-consumer
/**
 * 取当前会话的分类器任务状态，首次调用时用 createClassifierJobState 创建；分类器模块不存在时为 null。
 */
function getClassifierJobState(toolUseContext) {
  let n = classifierJobStateSlot.of(toolUseContext.session.host);
  if (n.state === undefined)
    n.state = requireTurnClassifier?.().createClassifierJobState(toolUseContext) ?? null;
  return n.state;
}
//@ chunk-ha3km179.js:153444-153652 sole-consumer
/**
 * teleportFetchModule（composeTeleportFetchOverride，给远程/传送会话改写 fetch）与拒答回退级联解析器 refusalCascadeResolver。
 */
var teleportFetchModule = require("./chunk-r1wk8q25.js");
var refusalCascadeResolver = {
  resolveStage: (mappedTarget, refusingModel, triedModels) =>
    pickFallbackModel({
      mappedTarget,
      armedFallbackModel: undefined,
      refusingModel,
      triedModels,
    }),
  triedModelEntry: canonicalModelKey,
  firstReachableStage: findFirstResolvableStage,
  logSkippedStages: logSkippedChainStages,
};
//@ chunk-ha3km179.js:153652-153944 fingerprint = yieldMissingToolResultBlocks (0.871)
/**
 * 为每个尚无结果的 tool_use 生成 is_error 的 tool_result 用户消息（中止、出错时保证 tool_use/tool_result 配对）。已回答的 id 通过第 4 参跳过。
 */
function* yieldMissingToolResultBlocks(assistantMessages, errorMessage, deps, s) {
  for (let assistantMessage of assistantMessages) {
    let toolUseBlocks = assistantMessage.message.content.filter((content) => content.type === "tool_use");
    for (let toolUse of toolUseBlocks) {
      if (s?.has(toolUse.id)) continue;
      yield createUserMessage({
        content: [
          {
            type: "tool_result",
            content: errorMessage,
            is_error: true,
            tool_use_id: toolUse.id,
          },
        ],
        toolUseResult: errorMessage,
        sourceToolAssistantUUID: assistantMessage.uuid,
        now: deps?.now,
        uuidFn: deps?.uuid,
      });
    }
  }
}
//@ chunk-ha3km179.js:153944-154066 layout
/**
 * 仅主线程 REPL（querySource 以 repl_main_thread 开头、非代理）时通知分类器本轮中止。
 */
function markClassifierTurnAborted(toolUseContext, querySource) {
  let classifierJobState = getClassifierJobState(toolUseContext);
  if (
    !requireTurnClassifier ||
    !classifierJobState ||
    !querySource.startsWith("repl_main_thread") ||
    toolUseContext.agentId
  )
    return;
  requireTurnClassifier().markTurnAborted(classifierJobState, getOwnJobShortId());
}
//@ chunk-ha3km179.js:154066-154213 layout
/**
 * 中止原因为 user-cancel 或 remote-cancel 时返回被打断的消息 id（来自 bootstrap 状态），代理内恒为 undefined。
 */
function getInterruptedMessageId(e) {
  if (e.agentId) return;
  let n = unwrapAbortReason(e.abortController.signal.reason);
  if (n !== "user-cancel" && n !== "remote-cancel") return;
  return getLastCancelledAPIMessageId() ?? undefined;
}
//@ chunk-ha3km179.js:154213-154323 layout
/**
 * 取最后一条 assistant 之后最后一条真实用户消息的 uuid，作为拒答通知里的 refusedUserMessageUuid。
 */
function getRefusedUserMessageUuid(e) {
  let lastIndex = e.findLastIndex((s) => s.type === "assistant");
  return e.slice(lastIndex + 1).findLast(isRealUserPromptMessage)?.uuid ?? null;
}
//@ chunk-ha3km179.js:154323-155748 layout
/**
 * 工具结果或 MCP _meta 要求结束本轮时调用：记 tengu_mcp_tool_result_ended_turn，跑 PostToolBatch 钩子（阻断被丢弃只记日志），中止时补中断消息，最后跑 Stop 钩子；不再调用模型。
 */
async function* endTurnFromToolResult({
  endTurnSource,
  messagesForQuery,
  assistantMessages,
  toolResults,
  toolUseBlocks,
  systemPrompt,
  userContext,
  systemContext,
  toolUseContext,
  updatedToolUseContext,
  querySource,
  stopHookActive,
  stickyBetas,
  queryChainIdForAnalytics,
  queryDepth,
  deps,
}) {
  try {
    logEvent("tengu_mcp_tool_result_ended_turn", {
      queryChainId: queryChainIdForAnalytics,
      queryDepth,
      source: fromEnum(endTurnSource),
    });
    if (endTurnSource === "mcp_meta") markClassifierTurnAborted(toolUseContext, querySource);
    let G = new Map();
    for (let toolResult of toolResults)
      if (toolResult.type === "user" && Array.isArray(toolResult.message.content)) {
        for (let V of toolResult.message.content)
          if (V.type === "tool_result") G.set(V.tool_use_id, V.content);
      }
    try {
      for await (let ee of executePostToolBatchHooks(
        toolUseBlocks.map((toolUseBlock) => ({
          tool_name: toolUseBlock.name,
          tool_input: toolUseBlock.input,
          tool_use_id: toolUseBlock.id,
          tool_response: G.get(toolUseBlock.id),
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
      if (!isStreamClosedOrAbortError(error, updatedToolUseContext.abortController.signal)) throw error;
      logForDebugging("PostToolBatch hooks cancelled");
    }
    if (updatedToolUseContext.abortController.signal.aborted) {
      if (!updatedToolUseContext.agentId)
        try {
          yield* cleanupComputerUseAfterTurn(updatedToolUseContext);
        } catch {}
      if (!isSilentAbortReason(updatedToolUseContext.abortController.signal.reason))
        yield createUserInterruptionMessage({
          toolUse: false,
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
//@ chunk-ha3km179.js:155748-155930 layout
/**
 * 仅主线程 REPL 时把 API 错误（error、详情、apiError）报告给分类器，失败忽略。
 */
function markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage) {
  let classifierJobState = getClassifierJobState(toolUseContext);
  if (
    !requireTurnClassifier ||
    !classifierJobState ||
    !querySource.startsWith("repl_main_thread") ||
    toolUseContext.agentId
  )
    return;
  requireTurnClassifier()
    .markApiFailure(
      classifierJobState,
      getOwnJobShortId(),
      apiErrorMessage.error,
      getAssistantMessageText(apiErrorMessage) ?? apiErrorMessage.errorDetails ?? "",
      apiErrorMessage.apiError,
    )
    .catch(() => {});
}
//@ chunk-ha3km179.js:155930-156008 fingerprint = isWithheldMaxOutputTokens (1)
/**
 * assistant 消息 apiError 为 max_output_tokens（被扣住、等待恢复）时为真。
 */
function isWithheldMaxOutputTokens(msg) {
  return msg?.type === "assistant" && msg.apiError === "max_output_tokens";
}
//@ chunk-ha3km179.js:156008-156227 layout
/**
 * 回答在输出过程中被截断（truncatedAfterOutput 的 API 错误），且是子代理或非交互主线程，且 tengu_truncated_response_recovery 开（默认开）时可发提示续写。
 */
function isRecoverableTruncatedResponse(event, toolUseContext, querySource) {
  return (
    event?.type === "assistant" &&
    event.isApiErrorMessage === true &&
    event.truncatedAfterOutput === true &&
    (classifyQuerySource(querySource) === "subagent" ||
      (classifyQuerySource(querySource) === "main" && toolUseContext.options.isNonInteractiveSession)) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_truncated_response_recovery", true)
  );
}
//@ chunk-ha3km179.js:156227-156537 layout
/**
 * 判断能否“续写未完成的思考”：去掉错误后只有一条回答、只有一个 thinking 块、stop_reason=max_tokens、未超窗口且模型/用量允许续写。
 */
function shouldResumeIncompleteThinking(assistantMessages, model) {
  let filtered = assistantMessages.filter(
    (y) => !y.isApiErrorMessage && !isAbandonedOrUnsignedThinkingMessage(y),
  );
  let s = filtered.length === 1 ? filtered[0] : undefined;
  if (s === undefined || s.message.content.length !== 1) return false;
  let block = s.message.content[0];
  return (
    block !== undefined &&
    isThinkingBlock(block) &&
    hasThinkingSignature(block) &&
    s.message.stop_reason === "max_tokens" &&
    !isForeignModelMessage(s, stripAnyVersatileSuffix(model)) &&
    shouldResumeThinking(model, s.message.resumable, totalTokensOf(s.message.usage))
  );
}
//@ chunk-ha3km179.js:156537-156678 layout
/**
 * 把 customSystemPrompt（字符串或数组）和 appendSystemPrompt 用空行拼接，供 userSystemPrompt 选项使用。
 */
function joinCustomAndAppendSystemPrompt(customSystemPrompt, appendSystemPrompt) {
  let filtered = [
    typeof customSystemPrompt === "string"
      ? customSystemPrompt
      : Array.isArray(customSystemPrompt)
        ? customSystemPrompt.join(`

`)
        : undefined,
    appendSystemPrompt,
  ].filter((h) => !!h);
  return filtered.length > 0
    ? filtered.join(`

`)
    : undefined;
}
//@ chunk-ha3km179.js:156678-157667 layout
/**
 * query() 入口（旧版同名）：确保工具初始化后运行 queryLoop（主线程挂观察者时走 queryWithObserverTap），结束后为本轮吸收的命令发 command_lifecycle（completed/cancelled），记录 turn 成败与轮次统计，返回终止结果 {reason,...}。
 */
async function* query(params) {
  let startedCommandUuids = [];
  let startedAt = performance.now();
  if (classifyQuerySource(params.querySource) === "main" && !params.toolUseContext.agentId) {
    endProfilePhase("engine_pickup");
    startProfilePhase("loop_entry");
  }
  let deliveredPollEventUuids = [];
  let h;
  using transcriptTap = observeRunningTurn(params.toolUseContext, params.messages);
  try {
    await awaitArtifactRosterSafe(params.toolUseContext.options.tools);
    h = yield* isObserverAgentsEnabled()
      ? queryWithObserverTap(
          {
            ...params,
            takePlainDelta: undefined,
          },
          startedCommandUuids,
          deliveredPollEventUuids,
          transcriptTap,
        )
      : transcriptTap.through(queryLoop(params, startedCommandUuids, deliveredPollEventUuids, transcriptTap));
  } finally {
    let agentId = params.toolUseContext.agentId;
    if (agentId)
      discardPrecompute(
        params.toolUseContext.session.precompute,
        agentId,
        "subagent_exit",
        params.querySource,
        params.toolUseContext.storageV5,
      );
  }
  yield* updateGoalAfterTurn(
    params.toolUseContext,
    params.toolUseContext.getAppState,
    params.querySource,
    h,
    createQueueDelivery,
  );
  let state = isAbnormalTerminalReason(h.reason) ? "cancelled" : "completed";
  for (let uuid of dropPutBackMessages(
    params.toolUseContext.messageQueue,
    startedCommandUuids,
    !params.toolUseContext.agentId,
  ))
    yield {
      type: "command_lifecycle",
      uuid,
      state,
    };
  for (let uuid of deliveredPollEventUuids)
    yield {
      type: "command_lifecycle",
      uuid,
      state: "completed",
    };
  if (isErrorTerminalReason(h.reason)) logFeatureBad("turn", terminalReasonTag(h));
  else logFeatureOk("turn");
  reportTurnEnd({
    terminal: h,
    querySource: params.querySource,
    agentContext: params.toolUseContext.agentContext,
    hasActiveGoal: params.toolUseContext.options.activeGoal !== undefined,
    startedAt,
  });
  return h;
}
//@ chunk-ha3km179.js:157667-158558 layout
/**
 * queryWithObserverTap：主线程先挂代理观察者（非交互会话等待其就绪），把 queryLoop 的每个事件交给观察者 capture（stream_request_start 时 flushSegment），并原样转发。
 */
async function* queryWithObserverTap(params, startedCommandUuids, deliveredPollEventUuids, transcriptTap) {
  if (classifyQuerySource(params.querySource) === "main") {
    let activeAgents = params.toolUseContext.options.agentDefinitions?.activeAgents ?? [];
    let mainThreadAgentType = getMainThreadAgentType();
    let mainObserver = ensureMainObserver({
      mainAgentDefinition: mainThreadAgentType
        ? activeAgents.find((activeAgent) => activeAgent.agentType === mainThreadAgentType)
        : undefined,
      activeAgents,
      toolUseContext: params.toolUseContext,
      canUseTool: params.canUseTool,
    });
    if (getIsNonInteractiveSession())
      try {
        await mainObserver;
      } catch (error) {
        logForDebugging(`[agentObserver] non-interactive arm failed (degrading to unobserved): ${error}`);
      }
  }
  let armedObserverAttachment = buildArmedObserverAttachment({
    querySource: params.querySource,
    toolUseContext: params.toolUseContext,
    messages: params.messages,
    turnStartIndex: isHumanTurn(params.messages),
  });
  let y = transcriptTap.through(
    queryLoop(params, startedCommandUuids, deliveredPollEventUuids, transcriptTap),
  );
  let S;
  try {
    let M;
    while (true) {
      let R = await y.next(M);
      if (R.done) {
        S = R.value;
        break;
      }
      if (armedObserverAttachment)
        if (R.value.type === "stream_request_start") armedObserverAttachment.flushSegment();
        else armedObserverAttachment.capture(R.value);
      M = yield R.value;
    }
  } finally {
    if (S === undefined)
      try {
        await y.return(undefined);
      } catch {}
    try {
      armedObserverAttachment?.finish(S?.reason ?? "ended");
    } catch {}
  }
  if (S === undefined) throw Error("queryWithObserverTap: missing terminal after completion");
  return S;
}
//@ chunk-ha3km179.js:158558-159009 layout
/**
 * 把轮首/轮中 poll 事件从消息队列消费掉（absorbed_mid_turn），记录 uuid 并产出 command_lifecycle started，返回事件转换出的消息；中止或折叠暂停时保留在队列。
 */
function* absorbQueuedPollEvents({ events, queue, signal, phase, deliveredPollEventUuids }) {
  checkTurnIdsConsistent(events);
  if (signal.aborted || queue.isMidTurnFoldSuspended()) {
    logForDebugging(
      `[query] abort/suspension during ${phase} absorption \u2014 leaving ${events.length} poll event(s) queued`,
    );
    return [];
  }
  queue.consume(events, {
    reason: "absorbed_mid_turn",
  });
  settleDeliveredEvents(events);
  logFeatureOk("poll_event_delivery");
  for (let event of events)
    if (event.uuid) {
      deliveredPollEventUuids.push(event.uuid);
      yield {
        type: "command_lifecycle",
        uuid: event.uuid,
        state: "started",
      };
    }
  try {
    return emptyToolResults(events);
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-ha3km179.js:159009-159178 layout
/**
 * poll_events 生成为 0 时记 poll_event_delivery left_queued 并打警告。
 */
function logPollEventsLeftQueued(e, n) {
  logFeatureSad("poll_event_delivery", "left_queued");
  logForDebugging(
    `[query] ${e} poll_events emission degraded to 0 for ${n} event(s) \u2014 leaving them queued`,
    {
      level: "warn",
    },
  );
}
//@ chunk-ha3km179.js:159178-159198 layout
/**
 * 循环迭代返回此哨兵表示进入下一轮（替代旧版的递归调用）。
 */
var NEXT_ROUND = "next_round";
//@ chunk-ha3km179.js:159198-234645 callgraph-witnessed = queryLoop (0.294)
/**
 * 查询主循环（旧版 queryLoop）。每轮：轮首记忆召回/队列命令折叠 → 消息预处理（工具结果预算、snip）→ 模型选择与实时切换 → 自动压缩 → 阻断上限检查 → 各类请求前公告（附件、advisor、延迟工具） → 渲染 system 提示词 → while 调用 deps.callModel 流式消费（服务器拒答回退、流式回退、模型 fallback、工具边流边执行）→ 错误恢复（反应式压缩、max_output_tokens 续写、截断续写、畸形 tool_use 重试、仅思考回答提示）→ Stop 钩子 → 执行剩余工具、附件 → 返回 NEXT_ROUND 进入下一轮或返回终止原因。
 */
async function* queryLoop(params, startedCommandUuids, deliveredPollEventUuids, transcriptTap) {
  let {
    systemPrompt,
    userContext,
    systemContext,
    canUseTool,
    fallbackModel,
    querySource,
    spawnedBySkill,
    maxTurns,
    skipCacheWrite,
    skipMessageCacheMarkers,
    relayFork,
    compactionRequestKind,
    toolChoice,
    apiAttemptsLeft,
    evictCacheOnComplete,
    agentCacheTtlOverride,
    forkPointUuid,
    divergesAtMessageId,
    thinkingStripPlan,
    advisorStripPlan,
  } = params;
  if (params.inPlaceOfFirstRequest !== undefined) {
    let k = abortedTurnRows(params.inPlaceOfFirstRequest, {
      signal: params.toolUseContext.abortController.signal,
      interruptedMessageId: () => getInterruptedMessageId(params.toolUseContext),
      now: params.deps?.now,
      uuid: params.deps?.uuid,
    });
    yield* k.rows;
    if (k.terminal.reason === "aborted_streaming")
      markClassifierTurnAborted(params.toolUseContext, querySource);
    return k.terminal;
  }
  let se = endsWithMachineTurn(params.messages);
  let contextRouting = await buildContextRouting(userContext, systemContext, params.toolUseContext, {
    messages: params.messages,
    querySource,
  });
  let deps = wrapArtifactPatchTurn(
    withTurnStepHooks(
      wrapCallModelWithAttachments(params.deps ?? productionDeps(), params.toolUseContext),
      params.toolUseContext,
    ),
    params.toolUseContext,
  );
  let promptRenderEpoch = params.promptRenderEpoch ?? getSystemPromptSectionEpoch();
  let toolDescribeEpoch = redescribeEpochFor(params.toolUseContext.options);
  let turnSections = sectionAnswersSnapshot(params.toolUseContext, params.promptRenderEpoch);
  let isMainThreadQuery = querySource.startsWith("repl_main_thread") || querySource === "sdk";
  let isTopLevelMainThread = isMainThreadQuery && !params.toolUseContext.agentId;
  if (isMainThreadQuery)
    try {
      latchConversationAtis();
      releaseStaleRefusalEffortCarry();
      idleCompactionSlot.of(params.toolUseContext.session).summarize = (toolUseContext) =>
        manuallyExtractSessionMemory(querySource, toolUseContext);
    } catch (error) {
      logError(error);
    }
  let Pe = messagesSinceCompactBoundary(params.messages);
  let refusedUserMessageUuid = getRefusedUserMessageUuid(Pe);
  let state = {
    guards: {
      ...INITIAL_LOOP_RECOVERY_STATE,
      refusalRetrySpent: false,
      mcpEndTurnOverrideSpent: false,
      stopHookActive: params.stopHookActive ?? false,
      turnCount: 1,
    },
    messages: params.messages,
    toolUseContext: params.toolUseContext,
    compactTracking: undefined,
    transition: undefined,
  };
  let taskBudgetRemaining = undefined;
  let queryConfig = buildQueryConfig();
  let memoryContextPromise = collectCoworkMemoryContext(Pe, state.toolUseContext, querySource);
  using memoryRecallPrefetch = startRelevantMemoryPrefetch(
    state.messages,
    state.toolUseContext,
    querySource,
    memoryContextPromise,
  );
  if (memoryRecallPrefetch && shouldBlockOnMemoryPrefetch()) {
    let k = [];
    try {
      if (isTopLevelMainThread) {
        endProfilePhase("loop_entry");
        startProfilePhase("memory_recall_wait");
      }
      let attachments;
      try {
        attachments = await awaitMemoryPrefetch(
          memoryRecallPrefetch,
          state.toolUseContext.abortController.signal,
        );
      } finally {
        if (isTopLevelMainThread) {
          endProfilePhase("memory_recall_wait");
          startProfilePhase("loop_entry");
        }
      }
      if (attachments !== undefined) {
        let Ot = filterDuplicateMemoryAttachments(
          attachments,
          state.toolUseContext.readFileState,
          state.toolUseContext.session,
          memoryRecallPrefetch.earlierReadsMayBeCleared,
        );
        memoryRecallPrefetch.consumedOnIteration = 0;
        memoryRecallPrefetch.consumedBlocking = true;
        k = Ot.map((qt) => createAttachmentMessage_2(qt, deps));
      }
    } catch (error) {
      logError(error);
      k = [];
    }
    if (k.length > 0)
      state = {
        ...state,
        messages: [...state.messages, ...k],
      };
    for (let Ze of k) yield Ze;
  }
  if (memoryContextPromise) {
    if (isTopLevelMainThread) {
      endProfilePhase("loop_entry");
      startProfilePhase("memory_context_wait");
    }
    let mapped = (await memoryContextPromise).map((Ze) => createAttachmentMessage_2(Ze, deps));
    if (isTopLevelMainThread) {
      endProfilePhase("memory_context_wait");
      startProfilePhase("loop_entry");
    }
    if (mapped.length > 0)
      state = {
        ...state,
        messages: [...state.messages, ...mapped],
      };
    for (let Ze of mapped) yield Ze;
  }
  let pendingPollEventRows = [];
  let ut = false;
  {
    let agentContext = state.toolUseContext.agentContext;
    let Ot =
      !isMainThreadQuery || state.toolUseContext.messageQueue.isMidTurnFoldSuspended()
        ? []
        : filterQueuedCommandsForThread(
            state.toolUseContext.messageQueue.getTurnStartFoldCommands(
              state.toolUseContext.abortController.signal.aborted,
            ),
            {
              isMainThread: isMainThreadQuery,
              currentAgentId: state.toolUseContext.agentId,
            },
          ).filter(isPollEventMode);
    if (Ot.length > 0) {
      let messageQueue = state.toolUseContext.messageQueue;
      messageQueue.registerFoldInFlight(Ot);
      se &&= !Ot.some(isPersonQueuedInput);
      try {
        let on = messageQueue.countRemainingWakePollEventsAfter(Ot);
        let Sn = [];
        try {
          Sn = await getQueuedCommandAttachments(
            Ot,
            imageLimitsForModel(state.toolUseContext.options.mainLoopModel),
            on,
            {
              messages: state.toolUseContext.messages,
            },
          );
        } catch (error) {
          if (isAbortError(error))
            logForDebugging("[query] turn-start poll_events build aborted \u2014 leaving events queued");
          else logError(error);
        }
        if (Sn.some((Ro) => Ro.type === "poll_events")) {
          state.toolUseContext.setToolPermissionContext(setPollEventDeliveryGuard);
          let mapped = Sn.map((bn) => createAttachmentMessage_2(bn, deps));
          state = {
            ...state,
            messages: [...state.messages, ...mapped],
          };
          for (let bn of mapped) yield bn;
          pendingPollEventRows = yield* absorbQueuedPollEvents({
            events: Ot,
            queue: messageQueue,
            signal: state.toolUseContext.abortController.signal,
            phase: "turn-start",
            deliveredPollEventUuids,
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
      let Ze = messageQueue.isMidTurnFoldSuspended()
        ? []
        : messageQueue.getCommandQueue().filter(isPassiveMainAgentCommand);
      if (Ze.length > 0) {
        let queuedCommandAttachments = await getQueuedCommandAttachments(
          Ze,
          imageLimitsForModel(state.toolUseContext.options.mainLoopModel),
          0,
          {
            messages: state.toolUseContext.messages,
          },
        );
        if (
          queuedCommandAttachments.length === Ze.length &&
          !state.toolUseContext.abortController.signal.aborted
        ) {
          checkTurnIdsConsistent(Ze);
          let mapped = queuedCommandAttachments.map((queuedCommandAttachment) =>
            createAttachmentMessage_2(queuedCommandAttachment, deps),
          );
          state = {
            ...state,
            messages: [...state.messages, ...mapped],
          };
          for (let on of mapped) yield on;
          messageQueue.consume(Ze, {
            reason: "absorbed_mid_turn",
          });
          se &&= !Ze.some(isPersonQueuedInput);
        } else if (!state.toolUseContext.abortController.signal.aborted)
          logForDebugging(
            `[query] turn-start passive fold emitted ${queuedCommandAttachments.length} of ${Ze.length} \u2014 leaving them queued`,
            {
              level: "warn",
            },
          );
      }
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  }
  let kt = false;
  let refusalFallbacksUsed = 0;
  let refusalFallbackDeclined = false;
  let suppressionAlreadyLogged = false;
  let At;
  let Me = false;
  let primaryModel = getMainLoopModel_2(params.toolUseContext);
  let sessionModel = primaryModel;
  let modelChain = buildAvailabilityFallbackChain(primaryModel, fallbackModel);
  let chainIndex = 0;
  let modelFacts = params.modelFacts;
  let mo;
  let refusalOverride;
  let loopEffort;
  let consentOverride;
  let liveSwitchOverride;
  let config = mainLoopModelOverride();
  let isMainThread = isMainThreadQuery;
  let emitsLocalScope = querySource === "side_question" || params.forkOrigin === "btw";
  let querySourceKind = classifyQuerySource(querySource);
  let isMainOrSubagent = querySourceKind === "main" || querySourceKind === "subagent";
  let stickyBetas =
    params.stickyBetas ??
    (querySourceKind === "main" || querySourceKind === undefined
      ? undefined
      : querySourceKind === "subagent"
        ? createStickyBetaLatches()
        : forkStickyBetaLatches(getStickyBetas()));
  let isMainLoop = querySourceKind === "main" || querySourceKind === undefined;
  let sentReminderTexts = new Map();
  async function* runIteration() {
    if (ut) {
      yield* pendingPollEventRows;
      markClassifierTurnAborted(state.toolUseContext, querySource);
      yield* runTurnEndReactions(state.toolUseContext, state.messages, {
        stopHookActive: state.guards.stopHookActive,
      });
      return {
        reason: "hook_stopped",
      };
    }
    if (isMainLoop && state.toolUseContext.shouldStopBeforeNextApiCall?.()) {
      yield* pendingPollEventRows;
      return {
        reason: "background_requested",
      };
    }
    if (isTopLevelMainThread) {
      endProfilePhase("loop_entry");
      startProfilePhase("message_prep");
    }
    let { toolUseContext } = state;
    let messages = state.messages;
    let Ot;
    let { guards, compactTracking, resumeIncompleteThinking, pendingToolUseSummary, prevToolDurations } =
      state;
    let {
      maxOutputTokensRecoveryCount,
      hasAttemptedReactiveCompact,
      reactiveCompactDeeperPass,
      thinkingOnlyNudged,
      malformedToolUseRetryCount,
      refusalRetrySpent,
      mcpEndTurnOverrideSpent,
      stopHookActive,
      stopHookBlockingCount,
      turnCount,
    } = guards;
    let maxOutputTokensOverride = state.transition === undefined ? params.maxOutputTokensOverride : undefined;
    let resumeActive = resumeIncompleteThinking;
    announceOutputLimitRecovery(state.transition, toolUseContext.agentId);
    if (isMainLoop && !toolUseContext.agentId) startRequeueWindowSafe(toolUseContext.messageQueue);
    yield {
      type: "stream_request_start",
    };
    queryCheckpoint("query_fn_entry");
    if (!toolUseContext.agentId) headlessProfilerCheckpoint("query_started");
    let roundStartedAtMs = performance.now();
    let queryTracking = toolUseContext.queryTracking
      ? {
          chainId: toolUseContext.queryTracking.chainId,
          depth: toolUseContext.queryTracking.depth + 1,
          roundStartedAtMs,
        }
      : {
          chainId: deps.uuid(),
          depth: 0,
          roundStartedAtMs,
        };
    let queryChainIdForAnalytics = sanitizeMarkName(queryTracking.chainId);
    toolUseContext = {
      ...toolUseContext,
      queryTracking,
    };
    let messagesForQuery = [...messagesSinceCompactBoundary(messages)];
    messagesForQuery = transcriptTap.withArrivedRows(messagesForQuery);
    let Di = (E) => canResumeThinkingOnModel(messagesForQuery, E);
    let tracking = compactTracking;
    let zr =
      toolUseContext.precomputeSourceKey !== undefined &&
      tracking?.compacted !== true &&
      !isCompactCommandSource(querySource);
    using Li =
      requireTurnClassifier &&
      isActingAsBgJob() &&
      querySource.startsWith("repl_main_thread") &&
      !toolUseContext.agentId
        ? createDisposableGuard(() => markClassifierTurnAborted(toolUseContext, querySource))
        : undefined;
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
            : undefined,
        isTurnStart: state.transition === undefined,
      });
    }
    let Lc = querySource.startsWith("agent:") || querySource.startsWith("repl_main_thread");
    messagesForQuery = await applyToolResultBudget(
      messagesForQuery,
      toolUseContext.contentReplacementState,
      toolResultsDirFor_2(toolUseContext.session),
      Lc
        ? (E) =>
            void recordContentReplacement(E, toolUseContext.agentId, toolUseContext.storageV5).catch(logError)
        : undefined,
      getBudgetExemptToolNames(toolUseContext.options.tools),
      toolUseContext.storageV5,
    );
    let Ui = () =>
      effectiveTurnModel({
        refusalOverride,
        consentOverride,
        liveSwitchOverride,
        chainModel: modelChain[chainIndex],
        primaryModel,
      });
    if (isMainThread) {
      let E = checkModelSwitch({
        pickSeen: config,
        livePick: mainLoopModelOverride(),
        sessionModel,
        turn: {
          refusalOverride,
          consentOverride,
          liveSwitchOverride,
          chain: modelChain,
          chainIndex,
          primaryModel,
        },
        resolveLiveModel: getMainLoopModel,
      });
      if (E !== undefined) {
        config = E.pick;
        let adopt = E.adopt;
        if (adopt !== undefined) {
          let pe = Ui();
          let model = adopt.model;
          switch (adopt.latch) {
            case "session_pick":
              mo = undefined;
              liveSwitchOverride = model;
              sessionModel = model;
              refusalOverride = undefined;
              consentOverride = undefined;
              ({ chain: modelChain, chainIndex } = adoptedFallbackChain({
                chain: modelChain,
                chainIndex,
                primaryModel,
                configuredFallbacks: fallbackModel,
                adoptedModel: model,
              }));
              break;
            case "availability_chain":
              chainIndex = adopt.chainIndex;
              break;
          }
          let primaryModel_2 = getPrimaryModelForFallback(toolUseContext.options);
          toolUseContext.options.mainLoopModel = model;
          toolUseContext.options.availabilityFallback =
            adopt.latch === "availability_chain"
              ? {
                  primaryModel: primaryModel_2,
                  fallbackModel: model,
                }
              : undefined;
          logEvent("tengu_live_model_switch", {
            from_model: telemetrySafeModelName(pe),
            to_model: telemetrySafeModelName(model),
            query_source: agentTypeForTelemetry(querySource),
            entrypoint: lit("cli"),
            queryChainId: queryChainIdForAnalytics,
            queryDepth: queryTracking.depth,
          });
        }
      }
    }
    let resolveRuntimeModel = (E, j) =>
      getRuntimeMainLoopModel({
        permissionMode: j,
        mainLoopModel: Ui(),
        exceeds200kTokens: j === "plan" && doesMostRecentAssistantMessageExceed200k(E),
      });
    let resolveModelAndFacts = async (messagesForQuery, mode) => {
      let runtimeModel = resolveRuntimeModel(messagesForQuery, mode);
      let me = modelFacts;
      modelFacts = undefined;
      if (isTopLevelMainThread) startProfilePhase("model_config_wait");
      let he = me?.model === runtimeModel ? me : await awaitMcpSettle(runtimeModel, toolUseContext);
      if (isTopLevelMainThread) endProfilePhase("model_config_wait");
      return [runtimeModel, he];
    };
    if (isTopLevelMainThread) endProfilePhase("message_prep");
    let [attemptModel, attemptModelFacts] = await resolveModelAndFacts(
      messagesForQuery,
      getToolPermissionContext(toolUseContext).mode,
    );
    if (isTopLevelMainThread) startProfilePhase("message_prep");
    let setAttemptModel = (E) => {
      attemptModel = E;
      attemptModelFacts = getModelContextInfo(E);
    };
    let snipTokensFreed = 0;
    clearMicroCompactFlag();
    await awaitBgConsentGate();
    queryCheckpoint("query_autocompact_start");
    if (isTopLevelMainThread) {
      endProfilePhase("message_prep");
      startProfilePhase("autocompact");
    }
    let compactionCheckFacts = attemptModelFacts;
    let Nc = deps.autocompact(
      messagesForQuery,
      toolUseContext,
      attemptModelFacts,
      {
        systemPrompt,
        userContext,
        systemContext,
        toolUseContext,
        forkContextMessages: messagesForQuery,
        advisorModel: toolUseContext.getAppState().advisorModel,
        stickyBetas,
        agentCacheTtlOverride,
      },
      querySource,
      tracking,
      snipTokensFreed,
      applyPrecomputedCompact,
    );
    let autocompactOutcome = yield* releasingAsyncIterator(Nc);
    queryCheckpoint("query_autocompact_end");
    if (isTopLevelMainThread) {
      endProfilePhase("autocompact");
      startProfilePhase("request_announcements");
    }
    if (autocompactOutcome.kind === "rapid_refill_breaker_tripped") {
      let E = fallbackWindowNotice({
        fallback: isMainThreadQuery ? mo : undefined,
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
      yield fullSystemPrompt;
      executeStopFailureHooks(fullSystemPrompt, toolUseContext);
      markClassifierApiFailure(toolUseContext, querySource, fullSystemPrompt);
      yield* pendingPollEventRows;
      return {
        reason: "rapid_refill_breaker",
      };
    }
    if (autocompactOutcome.kind === "compacted") {
      let { result, thresholdSource, thresholdWindow } = autocompactOutcome;
      let { preCompactTokenCount, postCompactTokenCount, truePostCompactTokenCount, compactionUsage } =
        result;
      let effortLevelIfSupported = getEffortLevelIfSupported(
        toolUseContext.options.mainLoopModel,
        getEffortValue(toolUseContext),
        getEffortLayerOverride(toolUseContext.permissionLayers),
      );
      logEvent("tengu_auto_compact_succeeded", {
        thresholdSource: fromEnumOpt(thresholdSource),
        autoCompactWindow: thresholdWindow.window,
        autoCompactWindowOrigin: fromEnum(thresholdWindow.origin),
        routedThroughReactive: autocompactOutcome.routedThroughReactive,
        ...(autocompactOutcome.afterIdle && {
          armTrigger: lit("idle"),
        }),
        originalMessageCount: messages.length,
        compactedMessageCount:
          result.summaryMessages.length + result.attachments.length + result.hookResults.length,
        ...(effortLevelIfSupported && {
          effort_level: fromEnum(effortLevelIfSupported),
        }),
        preCompactTokenCount,
        postCompactTokenCount,
        truePostCompactTokenCount,
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
      });
      if (params.taskBudget) {
        let preCompactContext = finalContextTokensFromLastResponse(messagesForQuery);
        taskBudgetRemaining = Math.max(
          0,
          (taskBudgetRemaining ?? params.taskBudget.total) - preCompactContext,
        );
      }
      rollOverTotalTokensContext(
        toolUseContext.agentId ?? "main",
        tokenCountFromLastAPIResponse(messagesForQuery),
      );
      tracking = createCompactTracking(deps.uuid(), autocompactOutcome.consecutiveRapidRefills);
      result.summaryMessages = stampSummaryTurnFields(result.summaryMessages, messagesForQuery);
      contextRouting = await rebuildRoutingAfterCompaction(
        contextRouting,
        userContext,
        systemContext,
        toolUseContext,
        {
          messages: params.messages,
          querySource,
        },
      );
      let Ne = await reannounceAfterCompact(result, {
        routing: contextRouting,
        toolUseContext,
        querySource,
        resumeActive,
        foreground: isMainThreadQuery && isMainAgent(toolUseContext.agentContext),
        stamp: deps,
      });
      messagesForQuery = insertAfterCompactBoundary(buildPostCompactMessages(result), Ne);
      if (messages !== params.messages) {
        Ot = snapshotMessagesAndStart(messages);
        if (Ot !== undefined) messages = messagesForQuery;
      }
      toolUseContext = withTurnMessages(toolUseContext, messagesForQuery, isHumanTurn);
      state = {
        ...state,
        messages,
        toolUseContext,
      };
      maybeStartPrecomputeAfterTurn({
        messages: messagesForQuery,
        systemPrompt,
        userContext,
        systemContext,
        toolUseContext,
        querySource,
        stickyBetas,
      });
      for (let ke of insertAfterCompactBoundary(buildPostCompactMessagesWithoutKept(result), Ne)) yield ke;
      if (autocompactOutcome.afterIdle) yield createSystemMessage(COMPACTED_WITH_PRECOMPUTED_TEXT, "notice");
    } else if (
      (autocompactOutcome.kind === "failed" || autocompactOutcome.kind === "not_needed") &&
      autocompactOutcome.consecutiveFailures !== undefined
    ) {
      tracking = {
        ...(tracking ?? {
          compacted: false,
          turnId: "",
          turnCounter: 0,
        }),
        consecutiveFailures: autocompactOutcome.consecutiveFailures,
      };
      let postCompactMessages = notifyCompactFailure_2({
        outcome: autocompactOutcome,
        querySource,
        agentId: toolUseContext.agentId,
        isInterrupted: toolUseContext.abortController.signal.aborted,
      });
      if (postCompactMessages !== undefined) yield postCompactMessages;
    }
    let autocompactRan = autocompactOutcome.kind === "compacted" || autocompactOutcome.kind === "failed";
    if (
      shouldArmPrecompute({
        autocompactRan,
        hasAttemptedReactiveCompact,
        lastTransitionReason: state.transition?.reason,
        isPreFirstCompactFork: zr,
        querySource,
        contextTokens:
          estimateTokensWithAnchor(messagesForQuery, attemptModelFacts.bytesPerToken) - snipTokensFreed,
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
          querySource,
          messages: messagesForQuery,
          facts: attemptModelFacts,
          cacheSafeParams: {
            systemPrompt,
            userContext,
            systemContext,
            toolUseContext,
            forkContextMessages: messagesForQuery,
            advisorModel: toolUseContext.getAppState().advisorModel,
            stickyBetas,
            agentCacheTtlOverride,
          },
          ...(querySource === "sdk" && {
            promptScan: countUserPromptsAndRewrite(messagesForQuery),
          }),
        });
    if (
      classifyQuerySource(querySource) === "main" &&
      !toolUseContext.agentId &&
      !resumeActive &&
      hasPendingVisitors(toolUseContext.session) &&
      backgroundOutputGateOpen(toolUseContext.session)
    )
      await runTurnVisitors(toolUseContext.session, toolUseContext.abortController.signal);
    if (
      classifyQuerySource(querySource) === "main" &&
      !toolUseContext.agentId &&
      !resumeActive &&
      hasPendingBackgroundOutput(toolUseContext.session) &&
      backgroundOutputGateOpen(toolUseContext.session)
    )
      for (let content of backgroundOutputGateSlots.of(toolUseContext.session).take()) {
        let attachmentMessage = createAttachmentMessage_2(
          {
            type: "dir_sync_notice",
            content,
          },
          deps,
        );
        yield attachmentMessage;
        messagesForQuery = [...messagesForQuery, attachmentMessage];
      }
    if (classifyQuerySource(querySource) === "main" && !toolUseContext.agentId && !resumeActive)
      try {
        for (let E of await copyTextOf(toolUseContext.session)) {
          for (let message of E.messages) {
            yield message;
            messagesForQuery = [...messagesForQuery, message];
          }
          if (E.contexts.length > 0) {
            let attachmentMessage = createAttachmentMessage_2(
              {
                type: "hook_additional_context",
                content: E.contexts,
                hookName: "PostModelSwitch",
                toolUseID: "PostModelSwitch",
                hookEvent: "PostModelSwitch",
              },
              deps,
            );
            yield attachmentMessage;
            messagesForQuery = [...messagesForQuery, attachmentMessage];
          }
        }
      } catch (error) {
        logError(toError(error));
      }
    messagesForQuery = yield* usageLimitNotices(messagesForQuery, {
      resumeActive,
      isMainLoop,
      querySource,
      depth: queryTracking.depth,
      model: attemptModel,
      toolUseContext,
      now: deps.now,
      uuid: deps.uuid,
    });
    let Hi = isMainThreadQuery && isMainAgent(toolUseContext.agentContext);
    let Xr = resumeActive
      ? contextRouting
      : await refreshRoutedGitStatus(messagesForQuery, contextRouting, toolUseContext, Hi);
    let qc =
      !resumeActive &&
      shouldSendProjectDocText(messagesForQuery, Xr, toolUseContext, Hi, state.transition === undefined)
        ? await checkProjectDocReadAllowed(
            Xr,
            toolUseContext,
            () => createToolUseContextView(toolUseContext),
            {
              messages: messagesForQuery,
              systemPrompt,
              modelFacts: attemptModelFacts,
            },
            (E, j) => anyDocReadHookBlocks(E, toolUseContext, j),
          )
        : Xr;
    for (let E of reportContextAnnouncements(messagesForQuery, qc, {
      querySource,
      resumeActive,
      stamp: deps,
      announcementWalk: toolUseContext.options.announcementWalk,
    })) {
      yield E;
      messagesForQuery = [...messagesForQuery, E];
    }
    let mode = getToolPermissionContext(toolUseContext).mode;
    let exceeds200kInPlanMode = mode === "plan" && doesMostRecentAssistantMessageExceed200k(messagesForQuery);
    if (isTopLevelMainThread) endProfilePhase("request_announcements");
    [attemptModel, attemptModelFacts] = await resolveModelAndFacts(messagesForQuery, mode);
    if (isTopLevelMainThread) startProfilePhase("request_announcements");
    let configuredRuntimeModel = getRuntimeMainLoopModel({
      permissionMode: mode,
      mainLoopModel: getMainLoopModel(),
      exceeds200kTokens: exceeds200kInPlanMode,
    });
    let runtimeOptionsModel = getRuntimeMainLoopModel({
      permissionMode: mode,
      mainLoopModel: toolUseContext.options.mainLoopModel,
      exceeds200kTokens: exceeds200kInPlanMode,
    });
    for (let E of crossOrgThinkingAttachments(messagesForQuery, {
      querySource,
      mainThread: isMainThreadQuery && isMainAgent(toolUseContext.agentContext),
      model: runtimeOptionsModel,
      stamp: deps,
    })) {
      yield E;
      messagesForQuery = [...messagesForQuery, E];
    }
    for (let E of await autoModeTurnAttachments(messagesForQuery, toolUseContext, {
      querySource,
      resumeActive,
      model: getRuntimeMainLoopModel({
        permissionMode: mode,
        mainLoopModel: getPrimaryModelForFallback(toolUseContext.options),
        exceeds200kTokens: exceeds200kInPlanMode,
      }),
      stamp: deps,
    })) {
      yield E;
      messagesForQuery = [...messagesForQuery, E];
    }
    let advisorResolution = resolveAdvisorState(messagesForQuery, toolUseContext, {
      querySource,
      resumeActive,
      configuredRuntimeModel,
      runtimeOptionsModel,
      carrier: stickyBetas ?? getStickyBetas(),
      toolChangesRide: (E) => canDeclareToolChangeAhead(stickyBetas ?? getStickyBetas(), E),
    });
    if (advisorResolution.announcement !== undefined) {
      let attachmentMessage = createAttachmentMessage_2(advisorResolution.announcement, deps);
      yield attachmentMessage;
      messagesForQuery = [...messagesForQuery, attachmentMessage];
    }
    yield* pendingPollEventRows;
    pendingPollEventRows = [];
    let { advisorModel, advisorDeferred, advisorActive } = advisorResolution;
    let ts = () => (Ot ? Ot.recorded : latestPromptSnapshot(messages));
    let promptRender = recordPromptSnapshot(messagesForQuery, systemPrompt, {
      options: toolUseContext.options,
      querySource,
      resumeActive,
      stamp: deps,
      inheritedReminderFold: () => ts()?.reminderFold,
      inheritedWireShape: () => ts()?.wireShape,
      inheritedEchoWireToolInputs: () => ts()?.echoWireToolInputs,
      contextRendering: contextRouting.rendering,
      toolDescribeEpoch,
      turnSections,
    });
    if (promptRender.record) {
      yield promptRender.record;
      messagesForQuery = [...messagesForQuery, promptRender.record];
    }
    let reminderFold = resolveReminderFold_2(messagesForQuery);
    if (promptRender.atRenderPoint)
      try {
        noopLedger(
          stickyBetas ?? getStickyBetas(),
          promptRender.rewritten ? "prompt_invalidated" : "host_prompt",
        );
        if (isMainThreadQuery && !toolUseContext.agentId) expectPromptCacheDrop(MAIN);
      } catch (error) {
        logError(error);
      }
    let apiSystemPrompt = asSystemPrompt(
      appendSystemContextToPrompt(promptRender.systemPrompt, contextRouting.systemContext),
    );
    let inlineToolsDeclared;
    let promptHeadSent;
    let deferredToolsSent;
    let toolInputCopiesSent;
    let appendDeferredToolsRecord = () => {
      let E = recordDeferredTools(messagesForQuery, deferredToolsSent, {
        options: toolUseContext.options,
        querySource,
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
    let markVirtualInResume = (message) => {
      if (resumeActive && isVirtualConversationMessage(message)) message.virtualInResumeRun = true;
      return message;
    };
    let lastStopReason = null;
    let truncatedResponse;
    let withheldPromptTooLong;
    let lastWithheldAssistant;
    let refusalNoFallbackEvent;
    let Mn = shouldRetryRefusal(querySource, refusalRetrySpent);
    queryCheckpoint("query_setup_start");
    if (isTopLevelMainThread) {
      endProfilePhase("request_announcements");
      startProfilePhase("query_setup");
    }
    let attemptState = createStreamingState({
      createStreamingToolExecutor: () =>
        new StreamingToolExecutor(toolUseContext.options.tools, canUseTool, toolUseContext, deps.now),
      onReset: () => clearActiveMcpContext(toolUseContext.options, isMainOrSubagent),
    });
    let { assistantMessages, toolResults, toolUseBlocks } = attemptState;
    function noteToolMessageFlags(E) {
      attemptState.toolRequestedEndTurn = higherSourceRank(
        attemptState.toolRequestedEndTurn,
        getToolEndsTurnKind(E),
      );
      if (E.type !== "attachment") return;
      if (E.attachment.type === "hook_stopped_continuation") attemptState.shouldPreventContinuation = true;
      else if (E.attachment.type === "hook_deferred_tool") attemptState.toolWasDeferred = true;
    }
    function recordToolResult(E, j) {
      se &&= !hasAuthoritativePollEvents(E) && !toolUseBlocks.some(isQuestionTool);
      if (E.type === "attachment") {
        toolResults.push(E);
        return;
      }
      if (isVirtualConversationMessage(E)) return;
      let pe;
      try {
        pe = normalizeMessagesForAPI(
          [E],
          j.options.refreshTools?.() ?? j.options.tools,
          toolUseContext.options.mainLoopModel,
          {
            reminderFold,
          },
        );
        validateImagesInMessages(pe, imageLimitsForModel(toolUseContext.options.mainLoopModel).maxBase64Size);
      } catch (error) {
        if (E.type === "user") toolResults.push(E);
        throw error;
      }
      toolResults.push(...pe.filter((me) => me.type === "user"));
    }
    function* drainCompletedToolResults(E = true) {
      if (toolUseContext.abortController.signal.aborted) return;
      for (let j of attemptState.streamingToolExecutor.getCompletedResults()) {
        if (hasTypeField(j)) {
          yield j;
          continue;
        }
        if (j.message) {
          if (!E && hasImageBlock(j.message)) continue;
          yield markVirtualInResume(j.message);
          noteToolMessageFlags(j.message);
          recordToolResult(j.message, toolUseContext);
        }
        if (j.toolDuration) attemptState.toolDurations.push(j.toolDuration);
      }
    }
    function* endTurnOnError(E) {
      let j = E instanceof ImageSizeError || E instanceof ImageResizeError;
      let pe = E instanceof Error ? E.message : String(E);
      if (j)
        logForDebugging(`Query image error: ${pe}`, {
          level: "error",
        });
      else logError(withTelemetryMessage(toError(E), "queryLoop invariant broken"));
      try {
        let me;
        if (toolUseBlocks.length > 0) {
          try {
            yield* drainCompletedToolResults(false);
          } catch (error) {
            logError(withTelemetryMessage(toError(error), "tool drain failed while ending the turn"));
          }
          me = resetStreamingToolExecutor(attemptState, j ? "image_error" : "model_error");
          for (let finishedResult of me.finishedResults) {
            if (hasImageBlock(finishedResult)) continue;
            try {
              yield markVirtualInResume(finishedResult);
              noteToolMessageFlags(finishedResult);
              recordToolResult(finishedResult, toolUseContext);
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
        yield* yieldMissingToolResultBlocks(
          assistantMessages,
          j ? IMAGE_ERROR_TOOL_CANCEL_TEXT : turnErrorToolCancelText(pe),
          deps,
          completedToolUseIds(attemptState),
        );
        if (me?.removes) yield me.removes;
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "tool_result pairing failed while ending the turn"));
      }
      try {
        let apiErrorMessage = createApiErrorMessage(
          j
            ? {
                content: pe,
                error: "invalid_request",
                errorDetails: pe,
                now: deps.now,
                uuid: deps.uuid,
              }
            : {
                content: pe,
                now: deps.now,
                uuid: deps.uuid,
              },
        );
        yield apiErrorMessage;
        markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "error frame failed while ending the turn"));
      }
      if (j)
        return {
          reason: "image_error",
        };
      logAntError("Query error", E);
      return {
        reason: "model_error",
        error: E,
      };
    }
    function* yieldWithRefusalNotice(E) {
      yield* yieldRefusalNoFallbackNotice();
      yield E;
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
          refusedUserMessageUuid,
          isMeta: false,
          timestamp: deps.now(),
          uuid: deps.uuid(),
        };
    }
    let appState = toolUseContext.getAppState();
    let autoModeContextPromise = checkAutoModeRequested(toolUseContext, stickyBetas ?? getStickyBetas());
    let permissionModeAtRequest = classifierRoleFor(toolUseContext);
    let defaultModelInfo = {};
    if (isMainThread)
      try {
        let E = getUsageCreditsOnlyModelConsentDeclineFallback();
        defaultModelInfo = automaticModelFallbackInfo({
          userModel: sessionModel,
          permissionMode: mode,
          exceeds200kTokens: exceeds200kInPlanMode,
          automaticModels: [
            getActiveModelFallback()?.fallbackModel,
            E !== null && getMainLoopModelOverride() === E ? E : undefined,
          ],
        });
      } catch (error) {
        logError(toError(error));
        defaultModelInfo = {};
      }
    if (needsOverageConsentForModel(attemptModel, toolUseContext.requestDialog)) {
      let E = "cancelled";
      let j = false;
      let pe = false;
      let me = false;
      let he =
        needsOverageConsentOnMainThread({
          requestDialog: toolUseContext.requestDialog,
          isMainThread,
        }) && !toolUseContext.abortController.signal.aborted;
      if (he && toolUseContext.requestDialog) {
        let signal = toolUseContext.abortController.signal;
        let userDialogTimeoutMs = getUserDialogTimeoutMs();
        let Ne = !isSdkDialogHostActive() && isUnattendedInteractiveSession();
        let abortController = new AbortController();
        let Ee = () => abortController.abort();
        signal.addEventListener("abort", Ee, {
          once: true,
        });
        let Ie = false;
        let now = Date.now();
        let lt =
          Ne && !isBgSession()
            ? onInteraction(() => {
                if (Date.now() - now > 1000) Ie = true;
              })
            : () => {};
        let Je = (Kt) => Kt.uuid ?? Kt;
        let gt = new Set(
          toolUseContext.messageQueue.getCommandQueueSnapshot().filter(isPromptModeQueuedCommand).map(Je),
        );
        let Et = () => {
          flushInteractionTime();
          if (
            !Ie &&
            toolUseContext.messageQueue
              .getCommandQueueSnapshot()
              .some((Kt) => isPromptModeQueuedCommand(Kt) && !gt.has(Je(Kt)))
          ) {
            pe = true;
            abortController.abort();
          }
        };
        let eo = Ne ? toolUseContext.messageQueue.subscribe(Et) : () => {};
        let ko =
          Ne && userDialogTimeoutMs > 0
            ? setTimeout(
                (Kt) => {
                  flushInteractionTime();
                  if (!Ie) Kt.abort();
                },
                userDialogTimeoutMs,
                abortController,
              )
            : undefined;
        let lo = false;
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
                lo = true;
                pe ||= Kt === "moved_on";
              },
              onAnsweredOverBridge: () => {
                me = true;
              },
            },
          );
        } finally {
          clearTimeout(ko);
          lt();
          eo();
          signal.removeEventListener("abort", Ee);
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
            toolUse: false,
            interruptedMessageId: getInterruptedMessageId(toolUseContext),
            interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
            now: deps.now,
            uuidFn: deps.uuid,
          });
        markClassifierTurnAborted(toolUseContext, querySource);
        return {
          reason: "aborted_streaming",
        };
      }
      if (j) {
        if (me) logFeatureSad("model_fable_consent", "remote_cancelled");
        else logFeatureBad("model_fable_consent", pe ? "dialog_queued_at_park" : "dialog_unanswered");
        let te = me
          ? "was closed from Remote Control without a choice \u2014 nothing was sent \xB7 it asks again on your next message, or /model to change"
          : "went unanswered \u2014 nothing was sent \xB7 answer it where this session is running, or /model to change";
        let qe = renderUsageCreditsOnlyModelName(attemptModel);
        let apiErrorMessage = createApiErrorMessage({
          content:
            isUsageCreditsModelBilled(attemptModel) || !isFableFamilyOrPinnedModel(attemptModel)
              ? `${qe} now uses usage credits \xB7 the prompt to confirm ${te}`
              : `Fable limit reached \xB7 continuing on ${qe} uses usage credits, and the prompt to confirm ${te}`,
          apiError: "consent_unanswered",
          now: deps.now,
          uuid: deps.uuid,
        });
        yield apiErrorMessage;
        markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
        return {
          reason: "model_error",
          error: Error("Usage-credits-only model consent dialog was not answered"),
        };
      }
      if (he && (isSdkDialogHostActive() || me))
        if (be) logFeatureOk("model_fable_consent");
        else if (E === "consent") logFeatureSad("model_fable_consent", "overage_enable_deferred");
        else if (E === "switch_default") logFeatureBad("model_fable_consent", "declined");
        else logFeatureSad("model_fable_consent", "dismissed");
      if (!be) {
        if (!he && isMainThread) logFeatureSad("model_fable_consent", "no_dialog_fallback");
        let newModel = getUsageCreditsOnlyModelConsentDeclineFallback();
        if (newModel === null) {
          let ke = isNoModelFallbackEnabled();
          if (isMainThread)
            logFeatureBad("model_fable_consent", ke ? "no_model_fallback_env" : "no_allowed_fallback");
          let apiErrorMessage = createApiErrorMessage({
            content: ke
              ? "CLAUDE_CODE_NO_MODEL_FALLBACK is set: model substitution is disabled \xB7 unset it to allow the swap"
              : `Your model policy only allows ${renderUsageCreditsOnlyModelName(attemptModel)}, which requires usage credits \xB7 /model to set it up`,
            apiError: ke ? "model_substitution_disabled" : "no_allowed_fallback",
            now: deps.now,
            uuid: deps.uuid,
          });
          yield apiErrorMessage;
          markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
          return {
            reason: "model_error",
            error: ke
              ? Error("CLAUDE_CODE_NO_MODEL_FALLBACK forbids model substitution")
              : Error(
                  "Usage-credits-only model consent declined and the model policy allows no other fallback",
                ),
          };
        }
        let model = attemptModel;
        let Ne = false;
        if (isMainThread) {
          if (E === "switch_default" && !me)
            Ne = switchDefaultFromCreditsOnlyModel(model, newModel, toolUseContext.storageV5);
          toolUseContext.setAppState((ke) => ({
            ...ke,
            mainLoopModel: newModel,
            mainLoopModelForSession: null,
          }));
          setMainLoopModelOverride(newModel);
          config = mainLoopModelOverride();
          try {
            let fastMode = toolUseContext.getAppState().fastMode;
            let Ee = isFastModeEnabled() ? isFastModeActive(newModel, fastMode) : !!fastMode;
            if (Ee !== !!fastMode) {
              toolUseContext.setAppState((Ie) => ({
                ...Ie,
                fastMode: Ee,
              }));
              reportFastModeToggle(fastMode, Ee);
            }
          } catch (error) {
            logError(error);
          }
        }
        toolUseContext.options = {
          ...toolUseContext.options,
          mainLoopModel: newModel,
          availabilityFallback: undefined,
        };
        setAttemptModel(newModel);
        consentOverride = newModel;
        yield {
          type: "query_model_change",
          toModel: newModel,
        };
        if (isMainThread)
          yield {
            type: "system",
            subtype: "model_consent_fallback",
            content: `Switched to ${renderModelName(newModel)} ${Ne ? "\u2014 now your default model" : "for this session"} \xB7 ${renderModelName(model)} requires usage credits \xB7 /model to change`,
            level: "warning",
            choice: E,
            originalModel: model,
            originalModelName: renderUsageCreditsOnlyModelName(model),
            fallbackModel: newModel,
            persistedAsDefault: Ne,
            isMeta: false,
            timestamp: deps.now(),
            uuid: deps.uuid(),
          };
      }
    }
    queryCheckpoint("query_setup_end");
    if (isTopLevelMainThread) endProfilePhase("query_setup");
    let zi =
      queryConfig.gates.isAnt && classifyQuerySource(querySource) !== "auxiliary"
        ? createDumpPromptsFetch(toolUseContext.agentId ?? queryConfig.sessionId, toolUseContext.storageV5)
        : undefined;
    let fetchOverride = zi;
    let yr = classifyQuerySource(querySource) === "main" && !toolUseContext.agentId;
    if (teleportFetchModule && (yr || relayFork))
      try {
        let E = yr ? messages : messagesForQuery;
        let uuids = yr ? Ot?.uuids : undefined;
        fetchOverride = teleportFetchModule.composeTeleportFetchOverride(
          zi,
          () => uuids ?? E.map((pe) => pe.uuid),
          yr ? "main" : "fork",
          E,
        );
      } catch (error) {
        logError(error);
      }
    let Zi = isAutoCompactEnabled() && canCompactInRemote();
    let Wc =
      Zi &&
      (!hasExplicitWindow(attemptModelFacts, toolUseContext.options.autoCompactWindow) ||
        usesLongContextWindow(querySource, attemptModelFacts, toolUseContext.options.autoCompactWindow));
    if (
      autocompactOutcome.kind !== "compacted" &&
      querySource !== "compact" &&
      !Wc &&
      !toolUseContext.abortController.signal.aborted
    ) {
      let E = estimateTokensWithAnchor(messagesForQuery, attemptModelFacts.bytesPerToken) - snipTokensFreed;
      if (
        calculateTokenWarningState(E, attemptModelFacts, toolUseContext.options.autoCompactWindow).level ===
        "blocked"
      ) {
        let pe = isCompactQuerySource(querySource);
        let compactFailure =
          autocompactOutcome.kind === "failed" ? autocompactOutcome.compactFailure : undefined;
        let he = pe
          ? {}
          : compactCheckFacts({
              outcome: autocompactOutcome,
              compactionCheckFacts,
              blockingCheck: {
                tokenCount: E,
                facts: attemptModelFacts,
              },
              configuredWindow: toolUseContext.options.autoCompactWindow,
            });
        if (
          !pe &&
          Zi &&
          (shouldBypassPtlPreempt(
            attemptModelFacts,
            toolUseContext.options.autoCompactWindow,
            querySource,
            compactFailure,
          ) ||
            isCompactNotNeededAtLimit(autocompactOutcome, attemptModelFacts, he))
        );
        else {
          if (!pe)
            logEvent("tengu_ptl_surfaced_to_user", {
              reason: lit("blocking_limit"),
              querySource: agentTypeForTelemetry(querySource),
              wasGatedByPriorAttempt: false,
              reactiveUnsupported: !canCompactInRemote(),
              compactFailureReason: fromEnumOpt(compactFailure?.reason),
              ...he,
            });
          let apiErrorMessage = createApiErrorMessage({
            content: compactFailureDetail(compactFailure) ?? PROMPT_TOO_LONG_ERROR_MESSAGE,
            error: "invalid_request",
            now: deps.now,
            uuid: deps.uuid,
          });
          yield apiErrorMessage;
          markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
          return {
            reason: "blocking_limit",
          };
        }
      }
    }
    let keptFirstResponse = state.transition === undefined ? params.keptFirstResponse : undefined;
    let needsAttempt = !adoptFallbackResponse(attemptState, keptFirstResponse);
    if (needsAttempt && keptFirstResponse !== undefined) yield clearInProgressToolUses(keptFirstResponse);
    let Ao;
    let ln = false;
    let Lo;
    let dn;
    let fs;
    let gs;
    let Rn = {
      mintedStateless: false,
      delivery: undefined,
    };
    let hs;
    let _s;
    let Ss;
    let ea;
    let refusalCascadeState = INITIAL_REJECTION_EPISODE;
    let provisionalRefusalNotice;
    function buildRefusalFallbackNotice(notice, uuid, pe) {
      return {
        type: "system",
        subtype: "model_refusal_fallback",
        direction: "retry",
        scope: "session",
        content: buildRefusalMessage(notice.originModel, notice.servingModel, notice.apiRefusalCategory),
        level: "warning",
        trigger: "refusal",
        originalModel: notice.originModel,
        fallbackModel: notice.servingModel,
        requestId: notice.requestId,
        apiRefusalCategory: notice.apiRefusalCategory,
        apiRefusalExplanation: null,
        retractedMessageUuids: [...notice.retractedMessageUuids],
        refusedUserMessageUuid: notice.refusedUserMessageUuid,
        ...(notice.sawCyberRefusal && {
          sawCyberRefusal: true,
        }),
        isMeta: false,
        timestamp: deps.now(),
        uuid,
        ...(pe && {
          provisional: pe,
        }),
      };
    }
    let activeMcpServer = isMainOrSubagent ? toolUseContext.options.activeMcpServer : undefined;
    let activeMcpTool = isMainOrSubagent ? toolUseContext.options.activeMcpTool : undefined;
    clearActiveMcpContext(toolUseContext.options, isMainOrSubagent);
    queryCheckpoint("query_api_loop_start");
    Li?.disarm();
    try {
      while (needsAttempt) {
        needsAttempt = false;
        if (resumeActive && (Lo !== undefined || !Di(attemptModel))) resumeActive = false;
        let E =
          advisorModel !== undefined &&
          (isSameModelFamilyId(attemptModel, configuredRuntimeModel) ||
            canAdviseModelLenient(attemptModel, advisorModel))
            ? advisorModel
            : undefined;
        if (advisorModel !== undefined && E === undefined)
          logForDebugging(
            `[AdvisorTool] Skipping advisor - ${advisorModel} cannot advise non-configured attempt model ${attemptModel} (configured: ${configuredRuntimeModel}) \u2014 dropped for this attempt`,
          );
        if (At !== undefined)
          if (Me) {
            At = undefined;
            Me = false;
          } else Me = true;
        let j = nextFallbackModel_2(modelChain, chainIndex, attemptModel);
        let pe = assistantMessages.length;
        let me;
        let he;
        let be = [];
        let te;
        let qe = false;
        function* Ne() {
          let Je = me;
          if (Je === undefined) return 0;
          let gt = [];
          for (let idx = assistantMessages.length - 1; idx >= 0; idx--)
            if (Je.has(assistantMessages[idx].uuid)) {
              gt.unshift(assistantMessages[idx]);
              assistantMessages.splice(idx, 1);
            }
          be.push(...gt);
          for (let message of gt)
            yield {
              type: "tombstone",
              message,
            };
          return gt.length;
        }
        function* ke() {
          let provisionalFlushUuid = deps.uuid();
          let { notice, state } = takePendingNotice(refusalCascadeState, provisionalFlushUuid);
          refusalCascadeState = state;
          if (notice === undefined) return;
          let refusalFallbackNotice = buildRefusalFallbackNotice(notice, provisionalFlushUuid, true);
          provisionalRefusalNotice = refusalFallbackNotice;
          yield refusalFallbackNotice;
        }
        function* Ee() {
          let { notice, state } = takeFallbackNotice(refusalCascadeState);
          refusalCascadeState = state;
          provisionalRefusalNotice = undefined;
          if (notice === undefined) return;
          yield buildRefusalFallbackNotice(notice, deps.uuid());
        }
        function* Ie() {
          let Je = he;
          if (Je === undefined) return;
          if (be.length > 0)
            Je.retractedMessageUuids = be.flatMap((gt) =>
              normalizeMessages([gt])
                .filter(isNotEmptyMessage)
                .map((content) => content.uuid),
            );
          Je.refusedUserMessageUuid = refusedUserMessageUuid;
          yield Je;
          he = undefined;
        }
        let ct;
        let fallbackError;
        e: try {
          let Je = [];
          let gt = [];
          let takePlainDelta = params.takePlainDelta;
          let eo = nextFallbackStage(refusalCascadeState, attemptModel, refusalCascadeResolver);
          refusalCascadeState = eo.state;
          let ko = !Mn && eo.armTarget === undefined ? resolveLatchedFallbackModel(attemptModel) : undefined;
          let lo = attemptModel;
          let Kt = {};
          let refusalFallbackSilentRearm =
            !Mn && !kt && !refusalFallbackDeclined
              ? (visibleRouteDeclined, apiRefusalCategory, responseSwapped) => {
                  if (kt || refusalFallbackDeclined) return;
                  let latchedFallbackModel = resolveLatchedFallbackModel(lo, {
                    visibleRouteDeclined,
                    apiRefusalCategory,
                    responseSwapped,
                  });
                  if (latchedFallbackModel === undefined || !isSonnetWithoutArcades(latchedFallbackModel))
                    return latchedFallbackModel;
                  let streamingToolExecutor = attemptState.streamingToolExecutor;
                  if (streamingToolExecutor.hasStartedToolCall()) return;
                  try {
                    let { aborted, completedBeforeEvent, queuedNeverStarted } =
                      streamingToolExecutor.discardAndAbortInFlight(serverFallbackTombstoneAbortReason());
                    Kt.counts = {
                      aborted,
                      completedBeforeEvent,
                      queuedNeverStarted,
                    };
                  } catch (error) {
                    logError(error);
                  }
                  return latchedFallbackModel;
                }
              : undefined;
          let Uo = canShowRefusalDialog();
          let capabilitySource = fromEnum(getSdkDialogCapabilitySource());
          let vo = refusalFallbackDialog(toolUseContext.permissionRelays?.bridge?.dialog, () =>
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_loggia_denkbild", false),
          );
          let uo = toolUseContext.getAppState().replBridgeSessionActive && vo === undefined;
          let consumerLacksDialogCapability = Uo || uo;
          let currentModel = shouldAskRefusalFallbackPreference({
            toolUseContext,
            isMainThread,
          });
          let _o = !Mn
            ? resolveRefusalFallback({
                currentModel: attemptModel,
                compiledTablesOnly: isAutoModeQuerySource(querySource),
                alreadyUsed: eo.armTarget === undefined && atLeast(refusalFallbacksUsed, refusalRouteLimit()),
                declined: refusalFallbackDeclined,
                inCascadeEpisode: refusalCascadeState.inEpisode,
                cascadeNext: eo.armTarget,
                suppressionAlreadyLogged,
                requestDialog: toolUseContext.requestDialog,
                isMainThread,
                consumerLacksDialogCapability,
                preferenceQuestionPending: currentModel,
                serverDefaultFallbacksEnabled: () =>
                  getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DASH_FLAME, false),
                selfTargetDefaultFallbacksEnabled: () =>
                  getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ELEGANT_POSSUM, false),
                sticky: stickyBetas ?? getStickyBetas(),
                threadedRequest: canUseNoTransientReminders(
                  querySource,
                  toolUseContext.agentId,
                  attemptModel,
                ),
              })
            : l8s;
          if (_o.shouldLogSuppression) {
            suppressionAlreadyLogged = true;
            logEvent("tengu_refusal_fallback_suppressed", {
              reason:
                toolUseContext.requestDialog === undefined
                  ? lit("no_dialog_host_setting_off")
                  : Uo
                    ? lit("no_consumer_capability_setting_off")
                    : lit("remote_controlled_session_setting_off"),
              capability_source: capabilitySource,
            });
          }
          let serverLane = _o.serverLane;
          let visibleModel = serverLane === undefined ? _o.visibleModel : undefined;
          let Sr = kt ? undefined : ko;
          let mn = dn;
          dn = undefined;
          let ua = fs;
          fs = undefined;
          let fallbackCreditMintRequestId = gs;
          gs = undefined;
          let mintedStateless = mn !== undefined && Rn.mintedStateless;
          Rn.mintedStateless = false;
          let deliveryOverride = mintedStateless ? Rn.delivery : undefined;
          Rn.delivery = undefined;
          let pa = hs;
          hs = undefined;
          let fallbackStampCategory = _s;
          _s = undefined;
          let fallbackStampTrigger = Ss;
          Ss = undefined;
          let refusalFallbackSilentArmActive =
            !refusalFallbackDeclined &&
            ko !== undefined &&
            visibleModel === undefined &&
            serverLane === undefined &&
            mn === undefined;
          if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
          queryCheckpoint("query_api_streaming_start");
          let rr = ua ?? attemptModel;
          let Rs = {
            messages: messagesForQuery,
            text: null,
            secondaryText: null,
            afterUuid: null,
          };
          let br =
            Lo !== undefined
              ? mi
              : decideReminderDelivery({
                  querySource,
                  agentId: toolUseContext.agentId,
                  model: attemptModel,
                  reminderModel: rr,
                  messages: messagesForQuery,
                  session: toolUseContext.session,
                  stamp: deps,
                  decide: reminderDeliveryMode,
                  deliveryOverride,
                  creditRetryStateless: mintedStateless,
                  recordedKeptReminders: promptRender.recordedWireShape?.keptReminders,
                  recordsDue: applyReminders,
                  createRecord: createAttachmentMessage_2,
                });
          let reminderDelivery;
          if (Lo !== undefined)
            reminderDelivery = {
              ...Rs,
              messages: [...messagesForQuery, Lo],
            };
          else if (br.delivery === "kept") {
            for (let record of br.records) {
              yield record;
              messagesForQuery = [...messagesForQuery, record];
            }
            reminderDelivery = {
              ...Rs,
              messages: messagesForQuery,
            };
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
            sentReminderTexts.set(O, {
              afterUuid: reminderDelivery.afterUuid,
              text: $e,
              model: rr,
            });
            let attachmentMessage = createAttachmentMessage_2(
              {
                type: O,
                text: $e,
                model: rr,
              },
              deps,
            );
            yield attachmentMessage;
            messagesForQuery = [...messagesForQuery, attachmentMessage];
          }
          let ma = isTopLevelMainThread && autoModeContextPromise !== undefined;
          if (ma) startProfilePhase("auto_mode_context_wait");
          let vs = await refreshGitStateSafe(autoModeContextPromise);
          if (ma) endProfilePhase("auto_mode_context_wait");
          deferredToolsSent = undefined;
          toolInputCopiesSent = undefined;
          let fa = false;
          let callModel = deps.callModel;
          let callModelParams = {
            systemPrompt,
            userContext,
            systemContext,
            toolUseContext,
            querySource,
          };
          if (callModel === deps.callModel) {
            call({
              ...callModelParams,
              messages: messagesForQuery,
            });
            applyToolExclusionEdit(
              messagesForQuery,
              querySource,
              attemptModel,
              toolUseContext.agentId,
              forkPointUuid,
              toolUseContext.readFileState,
            );
          }
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
                promptRenderEpoch,
                isDefaultModel: defaultModelInfo.isDefaultModel,
                defaultModel: defaultModelInfo.defaultModel,
                ...(queryConfig.gates.fastModeEnabled && {
                  fastMode: toolUseContext.options.fastMode,
                }),
                modelIsRefusalFallbackTarget: isFallbackServedRequest({
                  requestModel: attemptModel,
                  turnRefusalOverride: refusalOverride,
                  chainStepModel: chainIndex > 0 ? modelChain[chainIndex] : undefined,
                  userModel: sessionModel,
                }),
                toolChoice,
                isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
                withoutToolDescribeHooks: toolUseContext.options.settingsHooksOff,
                fallbackModel: modelChain[chainIndex + 1],
                accessFallbackModel: j,
                refusalFallbackModel: !refusalFallbackDeclined ? (visibleModel ?? Sr) : undefined,
                refusalFallbackModelLane: !refusalFallbackDeclined
                  ? visibleModel !== undefined
                    ? "visible"
                    : Sr !== undefined
                      ? "silent"
                      : undefined
                  : undefined,
                refusalFallbackCascadeHop: visibleModel !== undefined ? eo.hop : undefined,
                refusalFallbackSilentArmActive,
                refusalFallbackSilentRearm,
                serverRefusalFallback: serverLane,
                fallbackCreditCode: mn,
                autoModeServerContext: vs,
                ...(vs !== undefined &&
                  (isClassifierRoleOn(toolUseContext) || vs.judgeOnlyTools !== undefined) && {
                    serverClassifier: true,
                  }),
                fallbackCreditMintModel: ua,
                fallbackCreditMintRequestId,
                fallbackCreditMintedStateless: mintedStateless,
                fallbackStampFromModel: pa,
                fallbackStampCategory,
                fallbackStampTrigger,
                fallbackStampOriginalRequestId: pa !== undefined ? ea : undefined,
                fallbackCreditLaneArmed: _o.visibleModel !== undefined,
                querySource,
                keepPartialMessageOnAbort: params.keepPartialMessageOnAbort,
                spawnedBySkill,
                activeSkill: toolUseContext.options.activeSkill,
                activeMcpServer,
                activeMcpTool,
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
                    : undefined,
                maxOutputTokensOverride,
                resumeIncompleteThinking: resumeActive,
                fetchOverride,
                mcpTools: appState.mcp.tools,
                promptTooLongIsHandled: true,
                hasPendingMcpServers: appState.mcp.clients.some((client) => client.type === "pending"),
                toolPoolRefreshes: toolUseContext.options.refreshTools !== undefined,
                mcpClients: toolUseContext.options.mcpClients,
                queryTracking,
                effortValue: getEffortValue(toolUseContext),
                effortSetAsideByHold: getEffortSetAsideByHold(toolUseContext),
                turnEffort: getEffortLayerOverride(toolUseContext.permissionLayers),
                refusalFallbackEffort: carriedEffortForModel(refusalOverride, loopEffort),
                advisorModel: E,
                advisorDeferred,
                advisorActive,
                skipCacheWrite,
                skipMessageCacheMarkers,
                compactionRequestKind,
                apiAttemptsLeft,
                prevToolDurations,
                evictCacheOnComplete,
                agentCacheTtlOverride,
                forkPointUuid,
                divergesAtMessageId,
                thinkingStripPlan,
                advisorStripPlan,
                stickyBetas,
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
                    ...(taskBudgetRemaining !== undefined && {
                      remaining: taskBudgetRemaining,
                    }),
                  },
                }),
              },
            }),
            () => attemptState.streamingToolExecutor,
            takePlainDelta === undefined
              ? undefined
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
              fa = true;
              if (!resumeActive) {
                let Se = appendDeferredToolsRecord();
                if (Se) yield Se;
              }
            }
            if (event.type === "attachment") {
              yield event;
              messagesForQuery = [...messagesForQuery, event];
              call({
                ...callModelParams,
                messages: messagesForQuery,
              });
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
              messagesForQuery = replaceToolResultContent(
                messagesForQuery,
                Se,
                new Map(Object.entries(event.contentById)),
              );
              call({
                ...callModelParams,
                messages: messagesForQuery,
              });
              yield event;
              continue;
            }
            if (event.type === "server_fallback") {
              let Se = describeServerFallback(event, {
                isMainThread,
                emitsLocalScope,
              });
              logEvent("tengu_rotunda_pennant_applied", {
                reason: fromEnum(Se.telemetry.reason),
                entitlement_blind: isEntitlementOverlayUnavailable(),
                armed_mode: fromEnum(serverLane?.mode ?? "none"),
                mid_stream: Se.telemetry.midStream,
                discarded_block_count: Se.telemetry.discardedBlockCount,
                tombstoned_had_tool_use: Se.telemetry.tombstonedHadToolUse,
                request_id_sha12:
                  Se.telemetry.requestId !== null ? shortHash(Se.telemetry.requestId) : undefined,
                original_model_scope: fromEnum(Se.telemetry.originalModelScope),
                queryChainId: queryChainIdForAnalytics,
                queryDepth: queryTracking.depth,
                querySource: agentTypeForTelemetry(querySource),
                final_stop_reason: fromEnumOpt(Se.telemetry.finalStopReason ?? undefined),
                api_refusal_category: fromEnumOpt(Se.telemetry.apiRefusalCategory),
                ...refusedEffortTelemetryFields(event.refusedEffort),
              });
              if (Se.userVisible) {
                logFeatureOk("refusal_fallback");
                let fromModel = attemptModel;
                let We = preferSameModel(serverLane?.model, event.toModel);
                let no = attemptModel === We;
                if (!(
                  isModelAllowedUnderActiveEnforcement(event.toModel) ??
                  (isModelAllowed(event.toModel) || isExemptDefaultResolvingPick(event.toModel))
                )) {
                  logForDebugging(
                    `Server refusal-fallback target "${event.toModel}" is not in the availableModels allowlist; declining the swap`,
                    {
                      level: "warn",
                    },
                  );
                  refusalFallbackDeclined = true;
                  if (serverLane?.mode === "default" && BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null)
                    markBetaRejected(stickyBetas ?? getStickyBetas(), BETA_SERVER_SIDE_FALLBACK_CATEGORY);
                  let He = [];
                  for (let discardedMessage of event.discardedMessages) {
                    let index = assistantMessages.findIndex(
                      (assistantMessage) => assistantMessage.uuid === discardedMessage.uuid,
                    );
                    if (index !== -1) assistantMessages.splice(index, 1);
                    He.push(discardedMessage);
                  }
                  for (let idx = assistantMessages.length - 1; idx >= 0; idx--) {
                    let fo = assistantMessages[idx];
                    if (fo.message.model === event.toModel) {
                      assistantMessages.splice(idx, 1);
                      He.push(fo);
                    }
                  }
                  let sliced = toolResults.slice();
                  attemptState.reset({
                    clearAssistantMessages: false,
                  });
                  Je.length = 0;
                  let so = attemptState.streamingToolExecutor.discardAndAbortInFlight(
                    serverFallbackTombstoneAbortReason(),
                  );
                  logEvent("tengu_rotunda_pennant_tools", {
                    lane: lit("decline"),
                    aborted: so.aborted,
                    completed_before_event: so.completedBeforeEvent,
                    queued_never_started: so.queuedNeverStarted,
                    compensated_removes: so.toolUseIds.length,
                  });
                  attemptState.rebuildStreamingToolExecutor();
                  for (let message of He)
                    yield {
                      type: "tombstone",
                      message,
                    };
                  for (let message of sliced)
                    yield {
                      type: "tombstone",
                      message,
                    };
                  if (so.toolUseIds.length > 0)
                    yield {
                      type: "set_in_progress_tool_use_ids",
                      op: {
                        action: "remove",
                        ids: so.toolUseIds,
                      },
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
                  if (Zo) {
                    await transcriptTap.appended(Zo);
                    assistantMessages.push(Zo);
                    yield Zo;
                  }
                  break;
                }
                refusalFallbacksUsed += 1;
                let refusalFallbackEffort = resolveRefusalFallbackEffort({
                  refusedEffort: event.refusedEffort,
                  fallbackModel: We,
                  heldBySession: Se.swapSession && isMainConversationContext(toolUseContext.agentContext),
                  loopOverride: refusalOverride,
                  loopEffort,
                });
                refusalOverride = We;
                loopEffort = refusalFallbackEffort.loopEffort;
                setAttemptModel(We);
                if (resumeActive && !Di(We)) resumeActive = false;
                if (Se.swapSession) {
                  if (event.reason === "refusal" && event.apiRefusalCategory === "cyber")
                    markRefusalFallbackHeaderArmed(event.requestId ?? undefined);
                  let appState = toolUseContext.getAppState();
                  latchRefusalFallbackModel({
                    fallbackModel: We,
                    previousOverride: getMainLoopModelOverride(),
                    previousAppStateModel: appState.mainLoopModel,
                    previousModelForSession: appState.mainLoopModelForSession,
                    carriedEffort: refusalFallbackEffort.latchEffort,
                  });
                  let yt = isFastModeEnabled()
                    ? isFastModeActive(We, appState.fastMode)
                    : !!appState.fastMode;
                  toolUseContext.setAppState((so) => ({
                    ...so,
                    mainLoopModel: We,
                    mainLoopModelForSession: null,
                    fastMode: yt,
                  }));
                  setMainLoopModelOverride(We);
                  config = mainLoopModelOverride();
                  toolUseContext.options.mainLoopModel = We;
                  toolUseContext.options.availabilityFallback = undefined;
                  reportFastModeToggle(appState.fastMode, yt);
                }
                let wn = new Set(event.discardedMessages.map((discardedMessage) => discardedMessage.uuid));
                if (wn.size > 0) {
                  for (let idx = assistantMessages.length - 1; idx >= 0; idx--)
                    if (wn.has(assistantMessages[idx].uuid)) assistantMessages.splice(idx, 1);
                }
                let Mo = [];
                if (Se.tombstonedToolUse) {
                  let He = attemptState.streamingToolExecutor.discardAndAbortInFlight(
                    serverFallbackTombstoneAbortReason(),
                  );
                  logEvent("tengu_rotunda_pennant_tools", {
                    lane: lit("accept"),
                    aborted: He.aborted,
                    completed_before_event: He.completedBeforeEvent,
                    queued_never_started: He.queuedNeverStarted,
                    compensated_removes: He.toolUseIds.length,
                  });
                  Mo = [...toolResults];
                  attemptState.reset({
                    clearAssistantMessages: false,
                  });
                  attemptState.rebuildStreamingToolExecutor();
                  if (He.toolUseIds.length > 0)
                    yield {
                      type: "set_in_progress_tool_use_ids",
                      op: {
                        action: "remove",
                        ids: He.toolUseIds,
                      },
                      reason: "fallback_sweep",
                    };
                }
                if (event.midStream) {
                  me = new Set(assistantMessages.slice(pe).map((assistantMessage) => assistantMessage.uuid));
                  let retainedText = event.retainedText;
                  if (retainedText !== undefined && retainedText.length > 0 && Ao === undefined)
                    te = {
                      text: retainedText,
                      originals: event.retainedMessages ?? [],
                    };
                  else if (retainedText !== undefined && retainedText.length > 0 && Ao !== undefined)
                    logForDebugging(
                      "server_fallback: silent stitch already pending \u2014 skipping seam merge",
                      {
                        level: "warn",
                      },
                    );
                }
                be.push(...event.discardedMessages, ...Mo);
                yield {
                  type: "query_model_change",
                  toModel: We,
                };
                for (let message of event.discardedMessages)
                  yield {
                    type: "tombstone",
                    message,
                    displayOnly: true,
                  };
                for (let msg of Mo)
                  yield {
                    type: "tombstone",
                    message: msg,
                    displayOnly: true,
                  };
                if (te !== undefined) {
                  qe = true;
                  yield {
                    type: "refusal_continuation",
                    phase: "begin",
                    salvageText: te.text,
                    join: "exact",
                    replacesUuids: te.originals.map((original) => original.uuid),
                  };
                }
                if (Se.showBanner && !no)
                  he = buildRefusalFallbackSystemMessage(
                    {
                      ...event,
                      fromModel,
                      toModel: We,
                    },
                    {
                      timestamp: deps.now(),
                      uuid: deps.uuid(),
                    },
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
              if (he !== undefined) {
                let sweptDanglingCount = yield* Ne();
                if (qe) {
                  qe = false;
                  te = undefined;
                  yield {
                    type: "refusal_continuation",
                    phase: "end",
                  };
                }
                logEvent("tengu_rotunda_pennant_chain_exhausted", {
                  swept_dangling_count: sweptDanglingCount,
                  queryChainId: queryChainIdForAnalytics,
                  queryDepth: queryTracking.depth,
                  querySource: agentTypeForTelemetry(querySource),
                });
                yield* Ie();
              }
              yield* Ee();
              if (isMainThread)
                yield {
                  type: "system",
                  subtype: "model_refusal_no_fallback",
                  content: "",
                  level: "warning",
                  originalModel: event.originalModel,
                  requestId: event.requestId,
                  apiRefusalCategory: event.apiRefusalCategory,
                  apiRefusalExplanation: event.apiRefusalExplanation,
                  refusedUserMessageUuid,
                  isMeta: false,
                  timestamp: deps.now(),
                  uuid: deps.uuid(),
                };
              continue;
            }
            if (event.type === "fallback_request") {
              let Se = event.routeMatched == null && (ko !== undefined || event.silentArmAtTrigger === true);
              let ze = refusalCascadeState.inEpisode && isChainRouteMatch(event);
              if (
                !(Se ? kt : !ze && atLeast(refusalFallbacksUsed, refusalRouteLimit())) &&
                !refusalFallbackDeclined &&
                (isRefusalFallbackEnabled() || Se)
              ) {
                let We = ze
                  ? "episode_continuation"
                  : getFallbackDialogSkipReason({
                      requestDialog: toolUseContext.requestDialog,
                      isMainThread,
                      silentAttempt: Se,
                      consumerLacksDialogCapability,
                    });
                let no = {
                  original_model: telemetrySafeModelName(event.originalModel),
                  fallback_model: telemetrySafeModelName(event.fallbackModel),
                  trigger: fromEnum(event.trigger),
                  request_id: sanitizeMarkName(event.requestId),
                  queryChainId: queryChainIdForAnalytics,
                  queryDepth: queryTracking.depth,
                  querySource: agentTypeForTelemetry(querySource),
                  api_refusal_category: event.apiRefusalCategory
                    ? fromEnum(normalizeRefusalCategory(event.apiRefusalCategory))
                    : undefined,
                  route_matched: event.routeMatched != null ? fromEnum(event.routeMatched) : undefined,
                  ...(event.cascadeHopIndex !== undefined && {
                    chain_index: event.cascadeHopIndex,
                  }),
                  ...(event.cascadeChainLength !== undefined && {
                    chain_length: event.cascadeChainLength,
                  }),
                  has_api_refusal_explanation: Boolean(event.apiRefusalExplanation),
                  entitlement_blind: isEntitlementOverlayUnavailable(),
                };
                let flattened = [...assistantMessages, ...toolResults].flatMap((So) =>
                  normalizeMessages([So])
                    .filter(isNotEmptyMessage)
                    .map((content) => content.uuid),
                );
                let wn = We === "no_consumer_capability";
                if (wn)
                  logEvent("tengu_refusal_fallback_dialog_suppressed", {
                    ...no,
                    reason: Uo ? lit("no_consumer_capability") : lit("remote_controlled_session"),
                    capability_source: capabilitySource,
                    retracted_wire_uuid_count: flattened.length,
                  });
                let Mo = wn ? "cancelled" : "retry_fallback";
                let He = currentModel && !ze && !Se;
                if (He)
                  Mo = await askRefusalFallbackPreference({
                    canUseTool,
                    toolUseContext,
                    originalModel: event.originalModel,
                    fallbackModel: event.fallbackModel,
                    apiRefusalCategory: event.apiRefusalCategory,
                    telemetry: no,
                  });
                else if (We === undefined && toolUseContext.requestDialog)
                  Mo = await requestRefusalFallbackChoice({
                    requestDialog: toolUseContext.requestDialog,
                    signal: toolUseContext.abortController.signal,
                    bridgeDialog: vo,
                    hasQueuedPrompts: () =>
                      toolUseContext.messageQueue.peek(isPromptModeQueuedCommand) !== undefined,
                    payload: {
                      originalModel: event.originalModel,
                      fallbackModel: event.fallbackModel,
                      apiRefusalCategory: event.apiRefusalCategory,
                      retractedMessageUuids: flattened,
                      guidanceText: getThirdPartyFallbackHint(),
                    },
                    telemetry: no,
                    shownExtras: {
                      capability_source: capabilitySource,
                      retracted_wire_uuid_count: flattened.length,
                    },
                  });
                if (Mo !== "retry_fallback") {
                  refusalFallbackDeclined = true;
                  if (event.creditCode !== null)
                    logEvent("tengu_fallback_credit_forfeited", {
                      reason:
                        Mo === "cancelled"
                          ? lit("cancelled")
                          : He
                            ? lit("preference_question_paused")
                            : lit("dialog_declined"),
                      mint_request_id: sanitizeMarkName(event.requestId),
                      mint_model: telemetrySafeModelName(attemptModel),
                    });
                  yield* attemptState.abandonAttempt("refusal_decline");
                  Je.length = 0;
                  if (Mo === "edit_prompt")
                    toolUseContext.abortController.abort(userAbortReason("refusal-fallback-edit"));
                  if (Mo === "cancelled" && !toolUseContext.abortController.signal.aborted) {
                    let refusalMessage = getRefusalMessage(
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
                    if (refusalMessage) {
                      await transcriptTap.appended(refusalMessage);
                      assistantMessages.push(refusalMessage);
                      yield refusalMessage;
                    }
                  }
                  break;
                }
                let yt = assessPartialResponse(assistantMessages);
                let so =
                  querySource.startsWith("repl_main_thread") &&
                  !toolUseContext.options.isNonInteractiveSession;
                let Zo = hasRefusalFallbackOccurred();
                let Rt = !so ? "surface" : Zo ? "session_latch" : yt.skipReason;
                let salvageText = Se && Rt === undefined ? yt.salvageText : undefined;
                if (Se) kt = true;
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
                  ? undefined
                  : resolveRefusalFallbackEffort({
                      refusedEffort: event.refusedEffort,
                      fallbackModel: event.fallbackModel,
                      heldBySession: isMainThread && isMainConversationContext(toolUseContext.agentContext),
                      loopOverride: refusalOverride,
                      loopEffort,
                    });
                refusalOverride = event.fallbackModel;
                if (sr !== undefined) loopEffort = sr.loopEffort;
                dn = Se ? undefined : (event.creditCode ?? undefined);
                fs = dn !== undefined ? attemptModel : undefined;
                gs = dn !== undefined ? (event.requestId ?? undefined) : undefined;
                Rn.mintedStateless = dn !== undefined && event.mintedStateless;
                Rn.delivery = dn !== undefined && Lo === undefined ? br.delivery : undefined;
                hs = event.originalModel;
                _s = event.apiRefusalCategory ?? undefined;
                Ss = event.trigger;
                ea ??= event.requestId ?? undefined;
                if (Se) markRefusalFallbackOccurred(event.requestId ?? undefined);
                else if (isMainThread && event.apiRefusalCategory === "cyber")
                  markRefusalFallbackHeaderArmed(event.requestId ?? undefined);
                setAttemptModel(event.fallbackModel);
                needsAttempt = true;
                At = isMainThread && !Se && flattened.length > 0 ? flattened : undefined;
                Me = false;
                if (isMainThread && !Se) {
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
                  toolUseContext.setAppState((sp) => ({
                    ...sp,
                    mainLoopModel: event.fallbackModel,
                    mainLoopModelForSession: null,
                    fastMode: kr,
                  }));
                  setMainLoopModelOverride(event.fallbackModel);
                  config = mainLoopModelOverride();
                  toolUseContext.options.mainLoopModel = event.fallbackModel;
                  toolUseContext.options.availabilityFallback = undefined;
                  reportFastModeToggle(appState.fastMode, kr);
                }
                if (Se)
                  logEvent("tengu_convolute_arcades_retry", {
                    request_id: sanitizeMarkName(event.requestId),
                    queryChainId: queryChainIdForAnalytics,
                    queryDepth: queryTracking.depth,
                    querySource: agentTypeForTelemetry(querySource),
                    continuation: salvageText !== undefined,
                    ...(Rt !== undefined && {
                      continuation_skip_reason: fromEnum(Rt),
                    }),
                    had_partial_text: yt.partialTextChars > 0,
                    partial_text_chars: yt.partialTextChars,
                    salvaged_tool_use_count: yt.toolUseCount,
                    had_empty_input_tool_use: yt.hadEmptyInputToolUse,
                    credit_minted: event.creditCode !== null,
                    armed_at_trigger: event.silentArmAtTrigger === true,
                    arm_source: fromEnum(getFallbackLatchKind()),
                  });
                else {
                  logFeatureOk("refusal_fallback");
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
                  });
                }
                let ya = ln;
                if (ya) {
                  ln = false;
                  Ao = undefined;
                  Lo = undefined;
                  logEvent("tengu_convolute_arcades_retry_outcome", {
                    outcome: lit("error"),
                    queryChainId: queryChainIdForAnalytics,
                    queryDepth: queryTracking.depth,
                    querySource: agentTypeForTelemetry(querySource),
                  });
                }
                yield {
                  type: "query_model_change",
                  toModel: event.fallbackModel,
                };
                if (ya)
                  yield {
                    type: "refusal_continuation",
                    phase: "end",
                  };
                let counts = Kt.counts;
                Kt.counts = undefined;
                yield* attemptState.abandonAttempt("refusal_retry", {
                  silent: Se,
                  ...(counts !== undefined && {
                    earlierCounts: counts,
                  }),
                });
                Je.length = 0;
                if (salvageText !== undefined) {
                  Lo = createUserMessage({
                    content: buildContinuationPrompt(salvageText),
                    isMeta: true,
                    ephemeral: true,
                    now: deps.now,
                    uuidFn: deps.uuid,
                  });
                  yield {
                    type: "refusal_continuation",
                    phase: "begin",
                    salvageText,
                  };
                  Ao = salvageText;
                  ln = true;
                }
                if (
                  provisionalRefusalNotice !== undefined &&
                  refusalCascadeState.pendingNotice?.provisionalFlushUuid === provisionalRefusalNotice.uuid
                ) {
                  yield {
                    type: "tombstone",
                    message: provisionalRefusalNotice,
                  };
                  provisionalRefusalNotice = undefined;
                }
                if (!ze) {
                  refusalCascadeState = clearPendingNotice(refusalCascadeState);
                  provisionalRefusalNotice = undefined;
                }
                let rp = refusalCascadeState.inEpisode && (refusalCascadeState.cursor !== undefined || ze);
                if (isMainThread && !Se && rp)
                  refusalCascadeState = recordFallbackNotice(refusalCascadeState, {
                    originModel: event.originalModel,
                    servingModel: event.fallbackModel,
                    retractedMessageUuids: flattened,
                    refusedUserMessageUuid: refusedUserMessageUuid ?? undefined,
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
                    refusedUserMessageUuid,
                    isMeta: false,
                    timestamp: deps.now(),
                    uuid: deps.uuid(),
                  };
              } else if (ko === undefined) {
                let refusalMessage = getRefusalMessage(
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
                if (refusalMessage) {
                  await transcriptTap.appended(refusalMessage);
                  assistantMessages.push(refusalMessage);
                  yield refusalMessage;
                }
              }
              break;
            }
            if (event.type === "streaming_fallback_began") {
              logEvent("tengu_orphaned_messages_tombstoned", {
                orphanedMessageCount: assistantMessages.length,
                queryChainId: queryChainIdForAnalytics,
                queryDepth: queryTracking.depth,
              });
              yield* attemptState.abandonAttempt("streaming_fallback");
              Je.length = 0;
              try {
                if (
                  querySource.startsWith("repl_main_thread") &&
                  isMainAgent(toolUseContext.agentContext) &&
                  (event.cause === "no_events" || event.cause === "stream_truncated") &&
                  streamFallbackWarning().once("stream_no_events_fallback_warning")
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
              event.resumedFromIncompleteThinking = true;
            if (event.type === "assistant" && !event.isApiErrorMessage && !allAnsweredWithoutRequest([event]))
              event.permissionModeAtRequest = permissionModeAtRequest;
            if (event.type === "assistant" && event.message.content.some((Se) => Se.type === "tool_use"))
              await transcriptTap.appended(event);
            let $e = event;
            let Co;
            let co = false;
            let No;
            if (event.type === "assistant") {
              let Se;
              for (let idx = 0; idx < event.message.content.length; idx++) {
                let We = event.message.content[idx];
                if (We.type === "tool_use" && typeof We.input === "object" && We.input !== null) {
                  let toolByName = findToolByName(
                    toolUseContext.options.tools,
                    We.name,
                    toolUseContext.options.toolAliases,
                  );
                  let Ht = backfillObservableInput(toolByName, We.input, We.name);
                  if (Ht) {
                    Se ??= [...event.message.content];
                    Se[idx] = {
                      ...We,
                      input: Ht,
                    };
                  }
                }
              }
              if (Se) {
                $e = {
                  ...event,
                  message: {
                    ...event.message,
                    content: Se,
                  },
                };
                Je.push({
                  src: event.message,
                  dst: $e.message,
                  srcRow: event,
                  dstRow: $e,
                });
              }
            }
            if (
              (Ao !== undefined || te !== undefined) &&
              event.type === "assistant" &&
              !event.isApiErrorMessage
            ) {
              let Se = $e.type === "assistant" ? $e : event;
              let content = Se.message.content;
              let index = content.findIndex((Ht) => Ht.type === "text");
              let no = index === -1 ? undefined : content[index];
              if (no !== undefined && no.type === "text" && no.text.trim().length > 0) {
                let Ht = [...content];
                Ht[index] = withCitationsDropped(
                  no,
                  te !== undefined ? te.text + no.text : stitchContinuation(Ao, no.text),
                );
                let { apiBlockIndex, apiBlockIndices, ...He } = Se;
                let yt = {
                  ...He,
                  message: {
                    ...Se.message,
                    content: Ht,
                  },
                };
                Je.push({
                  src: event.message,
                  dst: yt.message,
                  srcRow: event,
                  dstRow: yt,
                });
                if (te !== undefined) {
                  let originals = te.originals;
                  let Zo = new Set(originals.map((original) => original.uuid));
                  for (let idx = assistantMessages.length - 1; idx >= 0; idx--)
                    if (Zo.has(assistantMessages[idx].uuid)) assistantMessages.splice(idx, 1);
                  assistantMessages.push(yt);
                  co = true;
                  No = originals;
                  be.push(...originals);
                  if (isMainThread) {
                    yt.supersedesUuids = originals.flatMap((original) =>
                      normalizeMessages([original])
                        .filter(isNotEmptyMessage)
                        .map((content) => content.uuid),
                    );
                    logEvent("tengu_refusal_fallback_supersedes", {
                      lane: lit("server_stitch"),
                      count: yt.supersedesUuids.length,
                    });
                  }
                  me = new Set([yt.uuid]);
                  te = undefined;
                } else Ao = undefined;
                $e = yt;
                Co = yt;
              }
            }
            if (event.type === "stream_event" && event.event.type === "message_delta") {
              if (typeof event.event.delta.stop_reason === "string")
                lastStopReason = event.event.delta.stop_reason;
              for (let { src, dst } of Je) {
                dst.usage = src.usage;
                dst.stop_reason = src.stop_reason;
                dst.stop_details = src.stop_details;
                if (src.context_management !== undefined) dst.context_management = src.context_management;
              }
              for (let { srcRow, dstRow } of Je) if (srcRow.isUnmetered !== true) delete dstRow.isUnmetered;
              Je.length = 0;
            }
            let to = false;
            if (isPromptTooLongReply(event)) to = true;
            if (
              !attemptState.needsFollowUp &&
              shouldCompactAfterLongContextRefusal(event, attemptModelFacts, querySource)
            ) {
              to = true;
              withheldPromptTooLong = event;
            }
            if (isMediaSizeErrorReply(event)) {
              to = true;
              gt.push(event);
            }
            if (isWithheldMaxOutputTokens(event)) to = true;
            if (Mn && isRefusalErrorMessage(event)) to = true;
            if (
              !attemptState.needsFollowUp &&
              isRecoverableTruncatedResponse(event, toolUseContext, querySource)
            ) {
              to = true;
              truncatedResponse = event;
            }
            if (resumeActive && !attemptState.needsFollowUp && isRetryableApiErrorMessage(event)) to = true;
            if (
              attemptState.needsFollowUp &&
              event.type === "assistant" &&
              isSafetyMonitorBlockedMessage(event)
            )
              to = true;
            if (to && event.type === "assistant") lastWithheldAssistant = event;
            if (!to) {
              if (gt.length > 0) {
                yield* gt;
                gt.length = 0;
              }
              if (
                refusalCascadeState.pendingNotice !== undefined &&
                $e.type === "assistant" &&
                !$e.isApiErrorMessage &&
                normalizeMessages([$e]).some(isNotEmptyMessage)
              )
                yield* ke();
              if (
                At !== undefined &&
                $e.type === "assistant" &&
                !$e.isApiErrorMessage &&
                normalizeMessages([$e]).some(isNotEmptyMessage)
              ) {
                let ze = At;
                At = undefined;
                Me = false;
                $e = {
                  ...$e,
                  supersedesUuids: ze,
                };
                logEvent("tengu_refusal_fallback_supersedes", {
                  lane: lit("client_retry"),
                  count: ze.length,
                });
              }
              if ($e !== event && $e.type === "assistant" && event.type === "assistant" && Co === undefined)
                transcriptTap.answeredAs($e, event);
              yield $e;
            }
            if (event.type === "assistant") {
              if (
                isMainLoop &&
                shouldRecordHarnessText(toolUseContext.agentId, toolUseContext.agentContext) &&
                !event.isApiErrorMessage
              )
                recordTextBlocks(event.message.content);
              let Se = Co ?? event;
              if (!co) assistantMessages.push(Se);
              let msgToolUseBlocks = Se.message.content.filter((content) => content.type === "tool_use");
              if (msgToolUseBlocks.length > 0) {
                toolUseBlocks.push(...msgToolUseBlocks);
                attemptState.needsFollowUp = true;
              }
              recordServerToolsUsed(Se);
              for (let toolBlock of msgToolUseBlocks)
                attemptState.streamingToolExecutor.addTool(toolBlock, Se);
            }
            if (No !== undefined) {
              let Se = No;
              No = undefined;
              for (let message of Se)
                yield {
                  type: "tombstone",
                  message,
                  displayOnly: true,
                };
            }
            if (attemptState.streamingToolExecutor.hasUnfinishedTools()) yield* drainCompletedToolResults();
          }
          queryCheckpoint("query_api_streaming_end");
          if (ln && !needsAttempt) {
            ln = false;
            let O = Ao === undefined;
            Ao = undefined;
            Lo = undefined;
            logEvent("tengu_convolute_arcades_retry_outcome", {
              outcome: fromEnum(O ? "merged" : "no_text"),
              queryChainId: queryChainIdForAnalytics,
              queryDepth: queryTracking.depth,
              querySource: agentTypeForTelemetry(querySource),
            });
            yield {
              type: "refusal_continuation",
              phase: "end",
            };
          }
          if (
            me !== undefined &&
            (assistantMessages.at(-1)?.message.stop_reason ?? lastStopReason) === "refusal"
          )
            yield* Ne();
          if (qe) {
            qe = false;
            te = undefined;
            yield {
              type: "refusal_continuation",
              phase: "end",
            };
          }
          yield* Ie();
          {
            let lastAssistant = assistantMessages.at(-1);
            let $e = lastAssistant ? getTokenUsage(lastAssistant) : undefined;
            if ($e) {
              let contextTokens = totalTokensOf($e);
              if (
                shouldArmPrecompute({
                  autocompactRan,
                  hasAttemptedReactiveCompact,
                  lastTransitionReason: state.transition?.reason,
                  isPreFirstCompactFork: zr,
                  querySource,
                  contextTokens,
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
                  let tokenCountFromUsage = getTokenCountFromUsage($e);
                  let No =
                    tokenCountFromUsage.input_tokens +
                    tokenCountFromUsage.cache_creation_input_tokens +
                    tokenCountFromUsage.cache_read_input_tokens;
                  let to =
                    estimateTokensWithAnchor(messagesForQuery, attemptModelFacts.bytesPerToken) -
                    snipTokensFreed;
                  armPrecomputedCompact({
                    querySource,
                    messages: [...messagesForQuery, ...assistantMessages],
                    facts: attemptModelFacts,
                    cacheSafeParams: {
                      systemPrompt,
                      userContext,
                      systemContext,
                      toolUseContext,
                      forkContextMessages: messagesForQuery,
                      advisorModel: toolUseContext.getAppState().advisorModel,
                      stickyBetas,
                      agentCacheTtlOverride,
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
          ct = {
            error,
          };
        }
        if (ct !== undefined || fallbackError !== undefined) {
          let Je = fallbackError ?? ct?.error;
          if (qe) {
            qe = false;
            te = undefined;
            yield {
              type: "refusal_continuation",
              phase: "end",
            };
          }
          yield* Ie();
          yield* Ee();
          if (ln) {
            ln = false;
            Ao = undefined;
            Lo = undefined;
            logEvent("tengu_convolute_arcades_retry_outcome", {
              outcome: lit("error"),
              queryChainId: queryChainIdForAnalytics,
              queryDepth: queryTracking.depth,
              querySource: agentTypeForTelemetry(querySource),
            });
            yield {
              type: "refusal_continuation",
              phase: "end",
            };
          }
          if (isFallbackTo(j, Je)) modelChain = [...modelChain, j];
          let gt = modelChain[chainIndex + 1];
          if (fallbackError !== undefined && gt !== undefined) {
            if (isNoModelFallbackEnabled()) noModelFallbackTripwire();
            chainIndex++;
            refusalOverride = undefined;
            refusalCascadeState = initialRejectionEpisode();
            consentOverride = undefined;
            liveSwitchOverride = undefined;
            let {
              chainIndex: chainIndex_2,
              target,
              substituted,
              inPlace,
              anySubstituted,
            } = nextFallbackModel({
              chain: modelChain,
              from: chainIndex,
              failedModel: fallbackError.originalModel,
              reason: fallbackError.reason,
              substituteFor: (Vo) => {
                if (!needsOverageConsentForModel(Vo, toolUseContext.requestDialog)) return;
                let vo = getUsageCreditsOnlyModelConsentDeclineFallback();
                return vo !== null && querySource === "compact" && swapShrinksContextWindow(modelChain[0], vo)
                  ? null
                  : vo;
              },
            });
            chainIndex = chainIndex_2;
            if (anySubstituted && isMainThread)
              logFeatureSad("model_fable_consent", "chain_advance_substituted");
            if (target === null) {
              logFeatureBad("model_fallback", "no_usable_fallback", {
                reason: fromEnum(fallbackError.reason),
              });
              throw fallbackError.originalError ?? fallbackError;
            }
            if (substituted || inPlace) consentOverride = target;
            setAttemptModel(target);
            needsAttempt = true;
            Me = false;
            yield* attemptState.abandonAttempt("chain_advance");
            toolUseContext.options = {
              ...toolUseContext.options,
              mainLoopModel: attemptModel,
              availabilityFallback: {
                primaryModel: getPrimaryModelForFallback(toolUseContext.options),
                fallbackModel: attemptModel,
              },
            };
            if (inPlace) {
              logForDebugging(
                `chain advance collapsed onto the failed model ${attemptModel}; re-dispatching in place with the full retry budget`,
              );
              continue;
            }
            if (isTopLevelMainThread) noteRedrive("fallback_model");
            let fallbackRecord = newFallbackRecord(
              fallbackError.originalModel,
              attemptModel,
              !substituted,
              fallbackError.reason,
            );
            mo = chainFallbackRecord(mo, fallbackRecord);
            let Uo = describeFallbackWindow(fallbackRecord, mo);
            logFeatureOk("model_fallback");
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
            });
            yield {
              type: "query_model_change",
              toModel: attemptModel,
            };
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
              isMeta: false,
              timestamp: deps.now(),
              uuid: deps.uuid(),
            };
            continue;
          }
          throw Je;
        }
      }
    } catch (innerError) {
      {
        let j = takeFallbackNotice(refusalCascadeState);
        refusalCascadeState = j.state;
        if (j.notice !== undefined) yield buildRefusalFallbackNotice(j.notice, deps.uuid());
      }
      logEvent("tengu_query_error", {
        assistantMessages: assistantMessages.length,
        toolUses: assistantMessages.flatMap((assistantMessage) =>
          assistantMessage.message.content.filter((content) => content.type === "tool_use"),
        ).length,
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
      });
      if (innerError instanceof FallbackTriggeredError && innerError.reason === "model_blocked") {
        let apiErrorMessage = createApiErrorMessage({
          content: modelUnavailableMessage(innerError, renderModelName(innerError.originalModel)),
          error: "rate_limit",
          now: deps.now,
          uuid: deps.uuid,
        });
        yield apiErrorMessage;
        markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
        return {
          reason: "model_error",
          error: innerError,
        };
      }
      return yield* endTurnOnError(innerError);
    }
    let message = assistantMessages.at(-1);
    if (attemptState.needsFollowUp && isSafetyMonitorBlockedMessage(message)) {
      try {
        yield* drainCompletedToolResults();
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "tool drain failed after safety monitor block"));
      }
      let E = blockAndResetStream(attemptState);
      yield* yieldMissingToolResultBlocks(
        assistantMessages,
        SAFETY_BLOCK_TOOL_CANCEL_TEXT,
        deps,
        E.answeredToolUseIds,
      );
      if (E.removes) yield E.removes;
      yield message;
    }
    if (
      assistantMessages.some((assistantMessage) =>
        assistantMessage.message.content.some(
          (content) => content.type === "text" && isSleepCheckPhrase(content.text),
        ),
      )
    )
      logEvent("tengu_model_response_keyword_detected", {
        is_suggests_break: true,
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
        refusalCascadeState = E.state;
        if (E.notice !== undefined) yield buildRefusalFallbackNotice(E.notice, deps.uuid());
      }
      if (!isSilentAbortReason(toolUseContext.abortController.signal.reason))
        yield createUserInterruptionMessage({
          toolUse: false,
          interruptedMessageId: getInterruptedMessageId(toolUseContext),
          interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
          now: deps.now,
          uuidFn: deps.uuid,
        });
      markClassifierTurnAborted(toolUseContext, querySource);
      return {
        reason: "aborted_streaming",
      };
    };
    if (toolUseContext.abortController.signal.aborted) return yield* drainRemainingTools();
    {
      let E = takeFallbackNotice(refusalCascadeState);
      refusalCascadeState = E.state;
      if (E.notice !== undefined) yield buildRefusalFallbackNotice(E.notice, deps.uuid());
    }
    let na = !assistantMessages.at(-1)?.isApiErrorMessage;
    if (na && !attemptState.needsFollowUp) {
      let E = recordToolDescriptions(messagesForQuery, inlineToolsDeclared, {
        options: toolUseContext.options,
        querySource,
        head: promptHeadSent,
        stamp: deps,
        handed: promptRender.redescribing,
      });
      if (E) {
        yield E;
        messagesForQuery = [...messagesForQuery, E];
      }
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
      let last = assistantMessages.at(-1);
      if (last !== undefined && !last.isApiErrorMessage)
        logFeatureOk("query_truncated_response_recovery", {
          attempt: state.transition.attempt,
          cause: fromEnum(state.transition.cause),
        });
      else if (last?.isApiErrorMessage && last !== lastWithheldAssistant)
        logFeatureBad("query_truncated_response_recovery", "continuation_failed", {
          attempt: state.transition.attempt,
          cause: fromEnum(state.transition.cause),
        });
    }
    reportOutputLimitRecovery({
      transition: state.transition,
      resumed: resumeIncompleteThinking === true,
      request: messagesForQuery,
      responses: assistantMessages,
      withheld: lastWithheldAssistant,
    });
    if (resumeActive && allAnsweredWithoutRequest(assistantMessages)) resumeActive = false;
    let or = false;
    if (resumeActive) {
      let last = assistantMessages.at(-1);
      let j = false;
      if (last?.isApiErrorMessage)
        j =
          j ||
          last === truncatedResponse ||
          last === withheldPromptTooLong ||
          isPromptTooLongMessage_2(last) ||
          isMediaSizeErrorReply(last);
      or = resumeTruncatedThinking(assistantMessages, {
        healedElsewhere: j,
        attempt: maxOutputTokensRecoveryCount,
      });
    }
    let last = assistantMessages.at(-1);
    if (Mn && isRefusalErrorMessage(last) && last === lastWithheldAssistant) {
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
        attemptState.toolRequestedEndTurn !== false;
      let j;
      let pe;
      if (!E)
        try {
          let me = discardInFlightTools(attemptState.streamingToolExecutor, "same_model_retry");
          j = me.removes;
          attemptState.rebuildStreamingToolExecutor();
          if (me.startedToolUseIds.length > 0)
            clearActiveMcpContext(toolUseContext.options, isMainOrSubagent);
          let kept = assistantMessages.filter((assistantMessage) => assistantMessage !== last);
          pe = {
            ...synthesizeRefusedToolResults({
              refused: last,
              kept,
              answered: toolResults,
              started: me.startedToolUseIds,
              model: attemptModel,
              querySource,
              queryChainId: queryChainIdForAnalytics,
              queryDepth: queryTracking.depth,
              deps,
              makeUserMessage: createUserMessage,
            }),
            kept,
          };
        } catch (error) {
          logError(error);
        }
      if (j) yield j;
      if (pe) {
        yield* pe.notRun;
        yield pe.notice;
        yield pe.nudge;
        state = {
          guards: {
            ...guards,
            refusalRetrySpent: true,
            ...(toolUseBlocks.length > 0 && {
              stopHookBlockingCount: 0,
            }),
          },
          messages: [...messagesForQuery, ...pe.kept, ...toolResults, ...pe.notRun, pe.nudge],
          toolUseContext,
          compactTracking: tracking,
          transition: {
            reason: "refusal_retry",
            model: attemptModel,
          },
          prevToolDurations:
            attemptState.toolDurations.length > 0 ? [...attemptState.toolDurations] : undefined,
        };
        return NEXT_ROUND;
      }
    }
    if (isRefusalErrorMessage(last) && last === lastWithheldAssistant) yield* yieldWithRefusalNotice(last);
    if (!attemptState.needsFollowUp) {
      let qe = function (messagesForQuery) {
        for (let idx = messagesForQuery.length - 1; idx >= 0; idx--) {
          let Ie = messagesForQuery[idx];
          if (Ie.type === "user") {
            if (Ie.isMeta || isToolResultMessage(Ie)) continue;
            return false;
          }
          if (Ie.type !== "assistant") continue;
          if (Ie.message.content.some((ct) => ct.type === "tool_use" && ct.name === STRUCTUREDOUTPUT))
            return true;
        }
        return false;
      };
      let msg = assistantMessages.at(-1);
      let j = msg !== undefined && msg === withheldPromptTooLong;
      let pe = j || (msg?.type === "assistant" && msg.isApiErrorMessage && isPromptTooLongMessage_2(msg));
      let he =
        !(
          toolDenialTracker !== null &&
          msg?.type === "assistant" &&
          toolDenialTracker.isToolUseDeniedMessage(msg)
        ) && isMediaSizeErrorReply(msg);
      let be =
        pe || he
          ? {
              ...toolUseContext,
              abortController: createRecoveryAbortController(
                toolUseContext.abortController,
                recoveryTimeoutForMessages(messagesForQuery, pe ? msg?.errorDetails : undefined),
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
          state.transition?.reason === "reactive_compact_retry";
        let Ee = hasAttemptedReactiveCompact && !ke;
        let Ie = ke
          ? {
              action: "proceed",
              consecutiveRapidRefills: tracking?.consecutiveRapidRefills ?? 0,
            }
          : checkRapidRefillBreaker(tracking);
        let { consecutiveRapidRefills } = Ie;
        if (!hasAttemptedReactiveCompact && Ie.action === "trip") {
          if (j) {
            logFeatureBad("compact_after_long_context_refusal", "rapid_refill_breaker");
            break e;
          }
          let uo = fallbackWindowNotice({
            fallback: isMainThreadQuery && pe ? mo : undefined,
            mainLoopModel: toolUseContext.options.mainLoopModel,
            configuredWindow: toolUseContext.options.autoCompactWindow,
          });
          logEvent("tengu_auto_compact_rapid_refill_breaker", {
            consecutiveRapidRefills: tracking?.consecutiveRapidRefills ?? 0,
            turnsSincePreviousCompact: tracking?.turnCounter ?? -1,
            queryChainId: queryChainIdForAnalytics,
            queryDepth: queryTracking.depth,
            reactive: true,
            afterShrinkingFallback: uo.afterShrinkingFallback,
          });
          let apiErrorMessage = createApiErrorMessage({
            content: uo.content,
            error: "invalid_request",
            apiError: "autocompact_thrashing",
            now: deps.now,
            uuid: deps.uuid,
          });
          yield apiErrorMessage;
          executeStopFailureHooks(apiErrorMessage, toolUseContext);
          markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
          return {
            reason: "rapid_refill_breaker",
          };
        }
        if (
          msg &&
          canReactiveCompact({
            hasAttempted: Ee,
            querySource,
            aborted: toolUseContext.abortController.signal.aborted,
          }) &&
          hasTooFewMessagesToCompact(messagesForQuery)
        ) {
          if (j) {
            logFeatureBad("compact_after_long_context_refusal", "too_few_groups");
            break e;
          }
          let uo = countNonProgressMessages(messagesForQuery);
          let totalGroups = uo.length;
          let ho = he ? "image_error" : "prompt_too_long";
          let { actualTokens, limitTokens } = parsePromptTooLongTokenCounts(msg.errorDetails ?? "");
          let pn = roughTokenCountEstimationForMessages(uo.flat());
          let overheadTokensEstimate =
            actualTokens !== undefined ? Math.max(0, actualTokens - pn) : undefined;
          logEvent("tengu_ptl_surfaced_to_user", {
            reason: fromEnum(ho),
            querySource: agentTypeForTelemetry(querySource),
            wasGatedByPriorAttempt: Ee,
            deeperPass: fromEnum(reactiveCompactDeeperPass),
            reactiveUnsupported: !canCompactInRemote(),
            precomputedKind: lit("not_consulted"),
            compactionImpossible: true,
            totalGroups,
            overheadTokensEstimate,
          });
          let mn =
            ho === "prompt_too_long"
              ? rebuildApiErrorMessage(
                  msg,
                  formatSingleExchangePromptTooLong({
                    actualTokens,
                    limitTokens,
                    conversationTokensEstimate: pn,
                  }),
                  deps,
                )
              : msg;
          yield mn;
          executeStopFailureHooks(mn, toolUseContext);
          markClassifierApiFailure(toolUseContext, querySource, mn);
          return {
            reason: ho,
          };
        }
        let startTime = performance.now();
        let Je = pe && msg ? getPromptTooLongTokenGap(msg) : undefined;
        let { outcome, swap, emittedEarlyCompactStart } = yield* runCompactionAsStream(
          (toolUseContext_2, zt, onResponseLength) =>
            applyPrecomputedCompact({
              toolUseContext: toolUseContext_2,
              messages: messagesForQuery,
              trigger: "ptl",
              isWithheld413: pe,
              hasAttemptedReactiveCompact,
              borrowFrom: zr ? toolUseContext.precomputeSourceKey : undefined,
              detectedAt: startTime,
              querySource,
              sizingModel: attemptModelFacts.model,
              onResponseLength,
            }),
          be,
        );
        let ko = yield* runCompactionAsStream(
          (toolUseContext_2, onNotification, onResponseLength) =>
            triggerReactiveCompact({
              hasAttempted: Ee,
              querySource,
              aborted: be.abortController.signal.aborted,
              messages: messagesForQuery,
              cacheSafeParams: {
                systemPrompt,
                userContext,
                systemContext,
                toolUseContext: toolUseContext_2,
                forkContextMessages: messagesForQuery,
                advisorModel: toolUseContext.getAppState().advisorModel,
                stickyBetas,
                agentCacheTtlOverride,
              },
              precomputed: swap,
              precomputeOutcome: outcome,
              userWaitStartedAt: startTime,
              promptTooLong: Je,
              allowLastResort: !he,
              onNotification,
              onResponseLength,
            }),
          be,
        );
        let { result, failure } =
          pe && !he && msg && !canCompactInRemote()
            ? yield* recoverFromRefusal({
                autocompact: deps.autocompact,
                refusal: msg,
                hasAttempted: hasAttemptedReactiveCompact,
                loopTopOutcome: autocompactOutcome.kind,
                offPickedModel: attemptModel !== sessionModel,
                messages: messagesForQuery,
                toolUseContext: be,
                facts: attemptModelFacts,
                cacheSafeParams: {
                  systemPrompt,
                  userContext,
                  systemContext,
                  toolUseContext: be,
                  forkContextMessages: messagesForQuery,
                  advisorModel: toolUseContext.getAppState().advisorModel,
                  stickyBetas,
                  agentCacheTtlOverride,
                },
                querySource,
                tracking,
                snipTokensFreed,
                sentSystemPrompt: apiSystemPrompt,
                sentInlineTools: inlineToolsDeclared,
              })
            : ko;
        if (result) {
          if (j) logFeatureOk("compact_after_long_context_refusal");
          if (params.taskBudget) {
            let _o = finalContextTokensFromLastResponse(messagesForQuery);
            taskBudgetRemaining = Math.max(0, (taskBudgetRemaining ?? params.taskBudget.total) - _o);
          }
          rollOverTotalTokensContext(
            toolUseContext.agentId ?? "main",
            tokenCountFromLastAPIResponse(messagesForQuery),
          );
          result.summaryMessages = stampSummaryTurnFields(result.summaryMessages, messagesForQuery);
          contextRouting = await rebuildRoutingAfterCompaction(
            contextRouting,
            userContext,
            systemContext,
            be,
            {
              messages: params.messages,
              querySource,
            },
          );
          let uo = await reannounceAfterCompact(result, {
            routing: contextRouting,
            toolUseContext: be,
            querySource,
            resumeActive,
            foreground: isMainThreadQuery && isMainAgent(be.agentContext),
            stamp: deps,
          });
          let zt = insertAfterCompactBoundary(buildPostCompactMessages(result), uo);
          toolUseContext = withTurnMessages(toolUseContext, zt, isHumanTurn);
          maybeStartPrecomputeAfterTurn({
            messages: zt,
            systemPrompt,
            userContext,
            systemContext,
            toolUseContext,
            querySource,
            stickyBetas,
          });
          for (let _o of insertAfterCompactBoundary(buildPostCompactMessagesWithoutKept(result), uo))
            yield _o;
          tracking = createCompactTracking(deps.uuid(), consecutiveRapidRefills);
          let reactiveCompactDeeperPass_2 = ke
            ? "spent"
            : swap === undefined &&
                pe &&
                canCompactInRemote() &&
                reactiveCompactDeeperPass === "none" &&
                (countNonProgressMessages(zt).length >= 3 ||
                  canLeaveOutFixPtl(zt, Je?.gap, toolUseContext.contentReplacementState?.replacements))
              ? "available"
              : reactiveCompactDeeperPass;
          if (isTopLevelMainThread) noteRedrive("reactive_compact");
          state = {
            guards: {
              ...guards,
              hasAttemptedReactiveCompact: swap === undefined,
              reactiveCompactDeeperPass: reactiveCompactDeeperPass_2,
            },
            messages: zt,
            toolUseContext,
            compactTracking: tracking,
            resumeIncompleteThinking: resumeActive,
            transition: {
              reason: swap ? "precomputed_compact_swap" : "reactive_compact_retry",
            },
          };
          return NEXT_ROUND;
        }
        if (emittedEarlyCompactStart) {
          yield {
            type: "compact_progress",
            event: {
              type: "compact_end",
            },
          };
          yield {
            type: "sdk_status",
            status: null,
          };
        }
        if (!he && toolUseContext.abortController.signal.aborted) {
          if (j) logFeatureSad("compact_after_long_context_refusal", "aborted");
          return yield* drainRemainingTools();
        }
        if (j) {
          logFeatureBad("compact_after_long_context_refusal", Ee ? "still_refused" : "not_compacted");
          break e;
        }
        let Yo = he ? "image_error" : "prompt_too_long";
        let Uo = querySource === "compact" || isCompactQuerySource(querySource);
        if (!toolUseContext.abortController.signal.aborted && !Uo)
          logEvent("tengu_ptl_surfaced_to_user", {
            reason: fromEnum(Yo),
            querySource: agentTypeForTelemetry(querySource),
            wasGatedByPriorAttempt: Ee,
            deeperPass: fromEnum(reactiveCompactDeeperPass),
            ...(Yo === "prompt_too_long" &&
              promptTooLongFacts({
                errorDetails: msg?.errorDetails,
                messages: messagesForQuery,
                systemPrompt: apiSystemPrompt,
                inlineTools: inlineToolsDeclared,
              })),
            precomputedKind: fromEnum(outcome.kind),
            precomputedFailureCause: fromEnumOpt(
              outcome.kind === "failed" ? outcome.failure.cause : undefined,
            ),
            reactiveUnsupported: !canCompactInRemote(),
            compactFailureReason: fromEnumOpt(failure?.reason),
          });
        let content = pe ? compactFailureDetail(failure) : undefined;
        let vo = content !== undefined ? rebuildApiErrorMessage(msg, content, deps) : msg;
        yield vo;
        executeStopFailureHooks(vo, toolUseContext);
        markClassifierApiFailure(toolUseContext, querySource, vo);
        return {
          reason: Yo,
        };
      }
      if (j) yield msg;
      reportFabricatedTurns(assistantMessages, attemptModel);
      let te;
      if (msg !== undefined && (isWithheldMaxOutputTokens(msg) || or)) {
        let attempt = or ? maxOutputTokensRecoveryCount : maxOutputTokensRecoveryCount + 1;
        if (attempt <= MAX_CONTINUE_ATTEMPTS) {
          let Ee =
            !or &&
            shouldResumeIncompleteThinking(
              assistantMessages,
              resolveRuntimeModel(
                [
                  ...messagesForQuery,
                  ...assistantMessages.filter((assistantMessage) => !assistantMessage.isApiErrorMessage),
                ],
                mode,
              ),
            );
          if (
            resumeActive &&
            !or &&
            !Ee &&
            assistantMessages.some((assistantMessage) => !assistantMessage.isApiErrorMessage)
          )
            logFeatureOk("query_thinking_block_resumption", {
              attempt: maxOutputTokensRecoveryCount,
            });
          let Ie = Ee
            ? undefined
            : createUserMessage({
                content: shouldNudgeOutputLimitResume(assistantMessages, attempt, querySource),
                isMeta: true,
                turnCompanion: true,
                now: deps.now,
                uuidFn: deps.uuid,
              });
          if (Ie !== undefined) yield Ie;
          state = {
            guards: {
              ...guards,
              maxOutputTokensRecoveryCount: attempt,
            },
            messages:
              Ie === undefined
                ? [
                    ...messagesForQuery,
                    ...assistantMessages.filter((assistantMessage) => !assistantMessage.isApiErrorMessage),
                  ]
                : [...messagesForQuery, ...assistantMessages, Ie],
            resumeIncompleteThinking: Ee || undefined,
            toolUseContext,
            compactTracking: tracking,
            transition: {
              reason: "max_output_tokens_recovery",
              attempt,
            },
          };
          return NEXT_ROUND;
        }
        if (resumeActive) logFeatureBad("query_thinking_block_resumption", "exhausted");
        te = recoverExhaustedOutput({
          withheld: msg,
          responses: assistantMessages,
          model: attemptModel,
          isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
          agentId: toolUseContext.agentId,
        });
        yield te;
      }
      if (truncatedResponse !== undefined && msg === truncatedResponse) {
        let streamCutCause = truncatedResponse.streamCutCause ?? "unknown";
        if (maxOutputTokensRecoveryCount < MAX_CONTINUE_ATTEMPTS) {
          logFeatureSad("query_truncated_response_recovery", "nudged", {
            attempt: maxOutputTokensRecoveryCount + 1,
            cause: fromEnum(streamCutCause),
          });
          let userMessage = createUserMessage({
            content: classifyQuerySource(querySource) === "subagent" ? STREAM_CUT_REWRITE : STREAM_CUT_RESUME,
            isMeta: true,
            turnCompanion: true,
            now: deps.now,
            uuidFn: deps.uuid,
          });
          yield userMessage;
          state = {
            guards: {
              ...guards,
              maxOutputTokensRecoveryCount: maxOutputTokensRecoveryCount + 1,
            },
            messages: [...messagesForQuery, ...assistantMessages, userMessage],
            toolUseContext,
            compactTracking: tracking,
            transition: {
              reason: "truncated_response_recovery",
              attempt: maxOutputTokensRecoveryCount + 1,
              cause: streamCutCause,
            },
          };
          return NEXT_ROUND;
        }
        logFeatureBad("query_truncated_response_recovery", "exhausted", {
          cause: fromEnum(streamCutCause),
        });
        yield msg;
      }
      if (
        (msg?.message.stop_reason ?? lastStopReason) === "tool_use" &&
        toolUseBlocks.length === 0 &&
        !msg?.isApiErrorMessage
      ) {
        let preCompactContext = canRecoverAgain(malformedToolUseRetryCount);
        logEvent("tengu_malformed_tool_use_response", {
          will_retry: preCompactContext,
          retry_count: malformedToolUseRetryCount,
          model: telemetrySafeModelName(attemptModel),
          text_has_leaked_invoke: endsWithFabricatedTurn(assistantMessages),
        });
        if (preCompactContext) {
          for (let message of assistantMessages)
            yield {
              type: "tombstone",
              message,
            };
          let postCompactMessages = createUserMessage({
            content: MALFORMED_TOOL_CALL_RETRY,
            isMeta: true,
            turnCompanion: true,
            now: deps.now,
            uuidFn: deps.uuid,
          });
          postCompactMessages.retractedMessageUuids = assistantMessages.map(
            (assistantMessage) => assistantMessage.uuid,
          );
          yield postCompactMessages;
          state = {
            guards: {
              ...guards,
              ...INITIAL_RECOVERY_STATE,
              malformedToolUseRetryCount: malformedToolUseRetryCount + 1,
            },
            messages: [...messagesForQuery, postCompactMessages],
            toolUseContext,
            compactTracking: tracking,
            transition: {
              reason: "malformed_tool_use_retry",
            },
          };
          return NEXT_ROUND;
        }
        let Ee = [
          ...recentMalformedRetries(messagesForQuery, malformedToolUseRetryCount),
          ...assistantMessages,
        ];
        for (let msg of Ee)
          yield {
            type: "tombstone",
            message: msg,
          };
        let apiErrorMessage = createApiErrorMessage({
          content: "The model's tool call could not be parsed (retry also failed).",
          now: deps.now,
          uuid: deps.uuid,
        });
        apiErrorMessage.retractedMessageUuids = Ee.map((ct) => ct.uuid);
        yield apiErrorMessage;
        executeStopFailureHooks(apiErrorMessage, toolUseContext);
        markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
        return {
          reason: "malformed_tool_use_exhausted",
        };
      }
      let stopReason = msg?.message.stop_reason ?? lastStopReason;
      if (
        (stopReason === "end_turn" || stopReason === "stop_sequence") &&
        !msg?.isApiErrorMessage &&
        querySource !== "compact" &&
        !isCompactQuerySource(querySource) &&
        !hasSuccessfulToolCall_2(messagesForQuery) &&
        !assistantMessages.some((assistantMessage) =>
          assistantMessage.message.content.some(
            (content) => content.type === "text" && content.text.trim().length > 0,
          ),
        ) &&
        !qe(messagesForQuery) &&
        !endsWithReminder(messagesForQuery)
      ) {
        if (!thinkingOnlyNudged) {
          logFeatureSad("query_thinking_only_response", "nudged");
          let userMessage = createUserMessage({
            content: NO_VISIBLE_OUTPUT_TEXT,
            isMeta: true,
            turnCompanion: true,
            now: deps.now,
            uuidFn: deps.uuid,
          });
          yield userMessage;
          state = {
            guards: {
              ...guards,
              thinkingOnlyNudged: true,
            },
            messages: [...messagesForQuery, userMessage],
            toolUseContext,
            compactTracking: tracking,
            transition: {
              reason: "thinking_only_retry",
            },
          };
          return NEXT_ROUND;
        }
        logFeatureBad("query_thinking_only_response", "nudge_exhausted");
        if (
          assistantMessages.length === 0 &&
          !toolUseContext.agentId &&
          shouldTryRecovery(messagesForQuery)
        ) {
          let recoveryMessage = createApiErrorMessage({
            content: "The model returned an empty response (retry also failed).",
            apiError: "empty_completion",
            now: deps.now,
            uuid: deps.uuid,
          });
          yield recoveryMessage;
          executeStopFailureHooks(recoveryMessage, toolUseContext);
          markClassifierApiFailure(toolUseContext, querySource, recoveryMessage);
          return {
            reason: "api_error",
            isTransient: false,
          };
        }
      } else if (thinkingOnlyNudged) logFeatureOk("query_thinking_only_response");
      if (msg?.isApiErrorMessage) {
        if (
          requireTurnClassifier &&
          getClassifierJobState(toolUseContext) &&
          isActingAsBgJob() &&
          querySource.startsWith("repl_main_thread") &&
          !toolUseContext.agentId
        ) {
          let ke = getAssistantMessageText(te ?? msg) ?? msg.errorDetails ?? "";
          await requireTurnClassifier().markApiFailure(
            getClassifierJobState(toolUseContext),
            getOwnJobShortId(),
            msg.error,
            ke,
            msg.apiError,
          );
        }
        executeStopFailureHooks(te ?? msg, toolUseContext);
        return {
          reason: "api_error",
          errorKind: msg.error,
          isTransient: isTransientApiError(msg),
          quotaLimits: msg.quotaLimits,
          oauthRefreshDiskFull: msg.oauthRefreshDiskFull,
        };
      }
      return yield* runStopHooksAndFinish(toolUseContext);
    }
    async function* runStopHooksAndFinish(E, j) {
      let toolResults = j?.toolResults ?? [];
      let goalActive = !E.agentId && E.getAppState().activeGoal !== undefined;
      let stopHookResult = yield* runStopHooks(
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
        toolResults,
      );
      if (stopHookBlockingCount > 0 && stopHookResult.blockingErrors.length === 0)
        logEvent("tengu_stop_hook_block_count", {
          count: stopHookBlockingCount,
          is_subagent: isNonMainSessionSubagent(E.agentContext),
          hit_max_turns: false,
          hit_cap: false,
          goal_active: goalActive,
        });
      if (stopHookResult.preventContinuation)
        return j && E.abortController.signal.aborted
          ? {
              reason: "aborted_tools",
            }
          : {
              reason: "stop_hook_prevented",
            };
      let be = waitForTurnEndSummary(E.sessionState, () => stopHookResult.blockingErrors.length > 0);
      if (be !== undefined) await be;
      if (stopHookResult.blockingErrors.length > 0) {
        let te = turnCount + 1;
        let qe = stopHookBlockingCount + 1;
        if (maxTurns && te > maxTurns) {
          logEvent("tengu_stop_hook_block_count", {
            count: qe,
            is_subagent: isNonMainSessionSubagent(E.agentContext),
            hit_max_turns: true,
            hit_cap: false,
            goal_active: goalActive,
          });
          yield createAttachmentMessage_2(
            {
              type: "max_turns_reached",
              maxTurns,
              turnCount: te,
            },
            deps,
          );
          yield* runTurnEndReactions(E, [...messagesForQuery, ...assistantMessages, ...toolResults], {
            stopHookActive,
          });
          return {
            reason: "max_turns",
            turnCount: te,
          };
        }
        let CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP ?? 8;
        if (CLAUDE_CODE_STOP_HOOK_BLOCK_CAP > 0 && qe > CLAUDE_CODE_STOP_HOOK_BLOCK_CAP) {
          logEvent("tengu_stop_hook_block_count", {
            count: qe,
            is_subagent: isNonMainSessionSubagent(E.agentContext),
            hit_max_turns: false,
            hit_cap: true,
            goal_active: goalActive,
          });
          let text =
            `A hook blocked the turn from ending ${qe} consecutive times \u2014 overriding and ending turn. ` +
            "For Stop/SubagentStop hooks, check stop_hook_active in the input and return success while it's true. Set CLAUDE_CODE_STOP_HOOK_BLOCK_CAP to raise this limit.";
          yield createSystemMessage(text, "warning");
          if (E.agentContext.agentType !== "teammate" && !isNonMainSessionSubagent(E.agentContext))
            notifyStopHookCap(text);
          yield* runTurnEndReactions(E, [...messagesForQuery, ...assistantMessages, ...toolResults], {
            stopHookActive,
          });
          return {
            reason: "completed",
            goalPass: stopHookResult.goalPass,
          };
        }
        state = {
          guards: {
            ...guards,
            ...INITIAL_RECOVERY_STATE,
            malformedToolUseRetryCount: 0,
            stopHookActive: true,
            stopHookBlockingCount: qe,
            turnCount: te,
          },
          messages: [
            ...messagesForQuery,
            ...assistantMessages,
            ...toolResults,
            ...stopHookResult.blockingErrors,
          ],
          toolUseContext: E,
          compactTracking: tracking,
          transition: {
            reason: "stop_hook_blocking",
          },
          pendingToolUseSummary: j?.pendingToolUseSummary,
          prevToolDurations: j?.prevToolDurations,
        };
        return NEXT_ROUND;
      }
      return {
        reason: "completed",
        goalPass: stopHookResult.goalPass,
      };
    }
    let updatedToolUseContext = toolUseContext;
    queryCheckpoint("query_tool_execution_start");
    let bs = requireClassifierSurfaces
      ? requireClassifierSurfaces().detectSurfaces(
          isStorageV5Enabled() && toolUseContext.storageV5
            ? await requireClassifierSurfaces().watchedForSurfaces(toolUseContext.storageV5)
            : undefined,
        )
      : null;
    let hr = bs ? requireClassifierSurfaces().sinksFor(bs) : null;
    let sa = hr ? requireClassifierSurfaces().engineFor(hr) : null;
    let classifierJobState = getClassifierJobState(toolUseContext);
    if (
      requireTurnClassifier &&
      classifierJobState &&
      sa &&
      classifyQuerySource(querySource) === "main" &&
      !toolUseContext.agentId
    ) {
      let E = hr.has("summary");
      let j = hr.has("headline");
      classifierJobState.onClassified = (te, qe) => {
        if (!qe || !(E || j) || te.detail === classifierJobState.lastEmittedDetail) return;
        classifierJobState.lastEmittedDetail = te.detail;
        if (E)
          toolUseContext.sessionState?.notifyMetadataChanged({
            task_summary: te.detail,
          });
        if (j) {
          let Ne = te.detail
            ? {
                text: te.detail,
                at: Date.now(),
              }
            : null;
          toolUseContext.setAppState((ke) =>
            ke.taskSummary?.text === Ne?.text
              ? ke
              : {
                  ...ke,
                  taskSummary: Ne,
                },
          );
        }
      };
      classifierJobState.describeToolUse = (te, qe) => {
        try {
          return findToolByName(toolUseContext.options.tools, te)?.getActivityDescription?.(qe) ?? undefined;
        } catch (error) {
          logForDebugging(`[classifier] getActivityDescription(${te}) threw: ${toError(error).message}`);
          return;
        }
      };
      let mainThreadAgentType = getMainThreadAgentType();
      let me = mainThreadAgentType
        ? toolUseContext.options.agentDefinitions.activeAgents.find(
            (activeAgent) => activeAgent.agentType === mainThreadAgentType,
          )
        : undefined;
      let found = messagesForQuery.find((te) => te.type === "user" && te.turnCompanion !== true);
      if (found?.type === "user") {
        let content = found.message.content;
        requireTurnClassifier().captureIntent(
          classifierJobState,
          typeof content === "string" ? content : (content.find((qe) => qe.type === "text")?.text ?? ""),
        );
      }
      let latestRealUserAsk = requireTurnClassifier().findLatestRealUserAsk(messagesForQuery);
      if (latestRealUserAsk) requireTurnClassifier().captureLatestAsk(classifierJobState, latestRealUserAsk);
      requireTurnClassifier().classifyAndPushDebounced(
        classifierJobState,
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
        if (update.message) {
          yield markVirtualInResume(update.message);
          noteToolMessageFlags(update.message);
          recordToolResult(update.message, updatedToolUseContext);
        }
        if (update.toolDuration) attemptState.toolDurations.push(update.toolDuration);
        if (update.newContext)
          updatedToolUseContext = {
            ...update.newContext,
            queryTracking,
          };
      }
    } catch (error) {
      if (!(error instanceof ImageSizeError || error instanceof ImageResizeError)) {
        let j = resetStreamingToolExecutor(attemptState, "model_error");
        if (j.removes) yield j.removes;
        throw error;
      }
      return yield* endTurnOnError(error);
    }
    queryCheckpoint("query_tool_execution_end");
    if (na) {
      let E = recordToolDescriptions(messagesForQuery, inlineToolsDeclared, {
        options: toolUseContext.options,
        querySource,
        head: promptHeadSent,
        stamp: deps,
        handed: promptRender.redescribing,
      });
      if (E) {
        yield E;
        messagesForQuery = [...messagesForQuery, E];
      }
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
      let lastAssistantMessage = assistantMessages.at(-1);
      let lastAssistantText;
      if (lastAssistantMessage) {
        let textBlocks = lastAssistantMessage.message.content.filter((block) => block.type === "text");
        if (textBlocks.length > 0) {
          let lastTextBlock = textBlocks.at(-1);
          if (lastTextBlock && "text" in lastTextBlock) lastAssistantText = lastTextBlock.text;
        }
      }
      let toolUseIds = toolUseBlocks.map((block) => block.id);
      let toolInfoForSummary = toolUseBlocks.map((block) => {
        let toolResult = toolResults.find(
          (result) =>
            result.type === "user" &&
            Array.isArray(result.message.content) &&
            result.message.content.some(
              (content) => content.type === "tool_result" && content.tool_use_id === block.id,
            ),
        );
        let resultContent =
          toolResult?.type === "user" && Array.isArray(toolResult.message.content)
            ? toolResult.message.content.find(
                (qe) => qe.type === "tool_result" && qe.tool_use_id === block.id,
              )
            : undefined;
        return {
          name: block.name,
          input: block.input,
          output: resultContent && "content" in resultContent ? resultContent.content : null,
        };
      });
      pendingToolUseSummary_2 = generateToolUseSummary({
        tools: toolInfoForSummary,
        messages: [...messagesForQuery, ...assistantMessages],
        signal: toolUseContext.abortController.signal,
        isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
        lastAssistantText,
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
          toolUse: true,
          interruptedMessageId: getInterruptedMessageId(toolUseContext),
          interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
          now: deps.now,
          uuidFn: deps.uuid,
        });
      let E = turnCount + 1;
      if (maxTurns && E > maxTurns)
        yield createAttachmentMessage_2(
          {
            type: "max_turns_reached",
            maxTurns,
            turnCount: E,
          },
          deps,
        );
      markClassifierTurnAborted(toolUseContext, querySource);
      return {
        reason: "aborted_tools",
      };
    };
    if (toolUseContext.abortController.signal.aborted) return yield* finishAbortedTools();
    if (attemptState.toolWasDeferred) {
      markClassifierTurnAborted(toolUseContext, querySource);
      return {
        reason: "tool_deferred",
      };
    }
    if (attemptState.shouldPreventContinuation) {
      markClassifierTurnAborted(toolUseContext, querySource);
      yield* runTurnEndReactions(
        toolUseContext,
        [...messagesForQuery, ...assistantMessages, ...toolResults],
        {
          stopHookActive,
        },
      );
      return {
        reason: "hook_stopped",
      };
    }
    let endTurnOverrideMessage = nudgeAfterToolEndTurn({
      requested: attemptState.toolRequestedEndTurn,
      batchResults: toolResults,
      spent: mcpEndTurnOverrideSpent,
      lastIteration: Boolean(maxTurns && turnCount + 1 > maxTurns),
      queryChainId: queryChainIdForAnalytics,
      queryDepth: queryTracking.depth,
      deps,
      makeUserMessage: createUserMessage,
    });
    let ia =
      !endTurnOverrideMessage &&
      shouldRunMcpStopHooks({
        requested: attemptState.toolRequestedEndTurn,
        lastIteration: Boolean(maxTurns && turnCount + 1 > maxTurns),
      });
    if (attemptState.toolRequestedEndTurn && !endTurnOverrideMessage && !ia) {
      yield* endTurnFromToolResult({
        endTurnSource: attemptState.toolRequestedEndTurn === "tool" ? "tool" : "mcp_meta",
        messagesForQuery,
        assistantMessages,
        toolResults,
        toolUseBlocks,
        systemPrompt,
        userContext,
        systemContext,
        toolUseContext,
        updatedToolUseContext,
        querySource,
        stopHookActive,
        stickyBetas,
        queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
        deps,
      });
      return {
        reason: "completed",
      };
    }
    if (
      toolUseBlocks.length === 1 &&
      toolUseBlocks[0].name === SCHEDULE_WAKEUP_TOOL_NAME &&
      needsFableMitigations(
        getCanonicalName(toolUseContext.options.mainLoopModel),
        toolUseContext.options.mainLoopModel,
      )
    ) {
      let prompt = toolUseBlocks[0].input.prompt;
      if (getSessionCronTasks().some((j) => j.kind === "loop" && j.prompt === prompt)) {
        logEvent("tengu_loop_dynamic_wakeup_ends_turn", {
          queryChainId: queryChainIdForAnalytics,
          queryDepth: queryTracking.depth,
        });
        markClassifierTurnAborted(toolUseContext, querySource);
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
        );
        return {
          reason: "completed",
        };
      }
    }
    if (tracking?.compacted) {
      tracking.turnCounter++;
      logEvent("tengu_post_autocompact_turn", {
        turnId: sanitizeMarkName(tracking.turnId),
        turnCounter: tracking.turnCounter,
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
      });
    }
    logEvent("tengu_query_before_attachments", {
      messagesForQueryCount: messagesForQuery.length,
      assistantMessagesCount: assistantMessages.length,
      toolResultsCount: toolResults.length,
      queryChainId: queryChainIdForAnalytics,
      queryDepth: queryTracking.depth,
    });
    if (
      hasHookForEvent(
        "PostToolBatch",
        updatedToolUseContext.sessionHooksRegistry,
        registerAgent(updatedToolUseContext, "PostToolBatch", updatedToolUseContext.session.id),
      )
    ) {
      let toolUseID = `hook-${deps.uuid()}`;
      let accountMemoryBatch = anyTrustedMemoryToolSafe(
        toolUseBlocks.map((cmd) => cmd.name),
        updatedToolUseContext.options.tools,
      );
      let pe = new Map();
      for (let toolResult of toolResults)
        if (toolResult.type === "user" && Array.isArray(toolResult.message.content)) {
          for (let te of toolResult.message.content)
            if (te.type === "tool_result") pe.set(te.tool_use_id, te.content);
        }
      let me = false;
      let he;
      try {
        for await (let attachment of executePostToolBatchHooks(
          toolUseBlocks.map((toolUseBlock) => ({
            tool_name: toolUseBlock.name,
            tool_input: toolUseBlock.input,
            tool_use_id: toolUseBlock.id,
            tool_response: pe.get(toolUseBlock.id),
          })),
          toolUseID,
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
                toolUseID,
                hookEvent: "PostToolBatch",
                accountMemoryBatch,
              },
              deps,
            );
            yield memoryAttachments;
            toolResults.push(memoryAttachments);
          }
          if (attachment.blockingError) {
            me = true;
            he ??= attachment.blockingError.blockingError;
          }
          if (attachment.preventContinuation) {
            me = true;
            he ??= attachment.stopReason;
          }
        }
      } catch (error) {
        if (!isStreamClosedOrAbortError(error, updatedToolUseContext.abortController.signal)) throw error;
        logForDebugging("PostToolBatch hooks cancelled");
      }
      if (updatedToolUseContext.abortController.signal.aborted) {
        if (!updatedToolUseContext.agentId)
          try {
            yield* cleanupComputerUseAfterTurn(updatedToolUseContext);
          } catch {}
        if (!isSilentAbortReason(updatedToolUseContext.abortController.signal.reason))
          yield createUserInterruptionMessage({
            toolUse: false,
            interruptedMessageId: getInterruptedMessageId(updatedToolUseContext),
            interruptedByShutdown: shutdownInterruptStamp(updatedToolUseContext.abortController.signal),
            now: deps.now,
            uuidFn: deps.uuid,
          });
        markClassifierTurnAborted(updatedToolUseContext, querySource);
        return {
          reason: "aborted_tools",
        };
      }
      if (me) {
        yield createAttachmentMessage_2(
          {
            type: "hook_stopped_continuation",
            message: he || "Execution stopped by PostToolBatch hook",
            hookName: "PostToolBatch",
            toolUseID,
            hookEvent: "PostToolBatch",
            accountMemoryBatch,
          },
          deps,
        );
        markClassifierTurnAborted(updatedToolUseContext, querySource);
        yield* runTurnEndReactions(
          updatedToolUseContext,
          [...messagesForQuery, ...assistantMessages, ...toolResults],
          {
            stopHookActive,
          },
        );
        return {
          reason: "hook_stopped",
        };
      }
    }
    if (ia)
      return yield* runStopHooksSafely({
        throughStopHooks: () =>
          runStopHooksAndFinish(updatedToolUseContext, {
            toolResults,
            pendingToolUseSummary: pendingToolUseSummary_2,
            prevToolDurations:
              attemptState.toolDurations.length > 0 ? [...attemptState.toolDurations] : undefined,
          }),
        onThrow: () => markClassifierTurnAborted(updatedToolUseContext, querySource),
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
      });
    if (updatedToolUseContext.options.refreshTools) {
      let E = updatedToolUseContext.options.refreshTools();
      if (E !== updatedToolUseContext.options.tools) {
        let j = count(updatedToolUseContext.options.tools, (me) => !!me.mcpInfo);
        let pe = count(E, (me) => !!me.mcpInfo);
        if (j !== pe)
          logEvent("tengu_mcp_tools_refreshed_mid_turn", {
            oldMcpCount: j,
            newMcpCount: pe,
            recovered: j === 0 && pe > 0,
          });
        updatedToolUseContext = {
          ...updatedToolUseContext,
          options: {
            ...updatedToolUseContext.options,
            tools: E,
          },
        };
      }
    }
    if (updatedToolUseContext.options.refreshMcpClients) {
      let mcpClients = updatedToolUseContext.options.refreshMcpClients();
      updatedToolUseContext = {
        ...updatedToolUseContext,
        options: {
          ...updatedToolUseContext.options,
          mcpClients,
        },
      };
    }
    let ccrTurnId = getCurrentCallId();
    let aa = () =>
      filterQueuedCommandsForThread(
        toolUseContext.messageQueue.getCommandsByMaxPriority("next").concat(
          toolUseContext.queuedNotificationsRegistry.heldNudge({
            agentId: toolUseContext.agentId,
            messageQueue: toolUseContext.messageQueue,
            ccrTurnId,
            nobodysTurn: se,
          }),
        ),
        {
          isMainThread: isMainThreadQuery,
          currentAgentId: toolUseContext.agentId,
        },
      ).filter(
        createFoldCommandFilter(
          createScreensReader(() => updatedToolUseContext, {
            latch: true,
          }),
        ),
      );
    if (
      canDrainTools({
        foldSuspended: toolUseContext.messageQueue.isMidTurnFoldSuspended(),
        isMainThread: isMainThreadQuery,
        lastIteration: Boolean(maxTurns && turnCount + 1 > maxTurns),
      })
    )
      await noopAsyncDrain(
        toolUseContext,
        createQueueFilterForThread({
          isMainThread: isMainThreadQuery,
          agentId: toolUseContext.agentId,
        }),
        aa,
      );
    let da = isMainThreadQuery;
    let _r = turnCount + 1;
    let Ts = maxTurns && _r > maxTurns ? maxTurns : undefined;
    let Cs = toolUseContext.messageQueue.isMidTurnFoldSuspended() || Ts !== undefined ? [] : aa();
    se &&= !Cs.some(isPersonQueuedInput);
    let Ms = da
      ? await routeSubmissions(Cs, updatedToolUseContext)
      : {
          deliverable: Cs,
          notices: [],
          dropped: [],
        };
    let deliverable = Ms.deliverable;
    toolUseContext.messageQueue.registerFoldInFlight(deliverable);
    try {
      for (let { uuid } of Ms.dropped)
        if (uuid !== undefined) {
          yield {
            type: "command_lifecycle",
            uuid,
            state: "started",
          };
          yield {
            type: "command_lifecycle",
            uuid,
            state: "completed",
          };
        }
      for (let notice of Ms.notices) yield notice;
      let E = 0;
      let j = 0;
      let pe;
      let msg = createFoldCommandFilter(
        createScreensReader(() => updatedToolUseContext, {
          latch: false,
        }),
      );
      let he = new Set();
      let filtered = deliverable.filter(isInlineNotificationMode);
      let te = applyDisallowedTools(filtered, params.joinedDisallowedTools, updatedToolUseContext.options);
      if (te !== updatedToolUseContext.options.tools)
        updatedToolUseContext = {
          ...updatedToolUseContext,
          options: {
            ...updatedToolUseContext.options,
            tools: te,
          },
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
        {
          conversationLatches: stickyBetas,
          afterToolStep: true,
        },
      )) {
        let Ie;
        if (Ee.attachment.type === "queued_command" && Ee.attachment.commandMode !== undefined) {
          Ie = filtered[qe];
          qe++;
          if (Ie !== undefined && !msg(Ie)) {
            he.add(Ie);
            continue;
          }
        }
        let ct = safeMapOrUndefined(Ee, updatedToolUseContext.options.announcementWalk);
        if (ct === undefined) continue;
        yield ct;
        toolResults.push(ct);
        if (Ee.attachment.type === "queued_command" && Ee.attachment.commandMode !== undefined) {
          E++;
          for (let lt of await applyFoldedPromptSubmit(Ie?.promptSubmitted, updatedToolUseContext)) {
            yield lt;
            toolResults.push(lt);
          }
        }
        if (Ee.attachment.type === "poll_events") j++;
      }
      let filtered_2 = filtered.filter((Ee) => !he.has(Ee));
      if (filtered_2.length > 0 && E === 0)
        logForDebugging(
          `[query] queued_command attachments degraded to 0 for ${filtered_2.length} consumed command(s) \u2014 leaving them queued instead of dropping them`,
          {
            level: "warn",
          },
        );
      else {
        if (filtered_2.length > 0 && E < filtered_2.length)
          logForDebugging(
            `[query] partial queued_command emission: ${E}/${filtered_2.length} \u2014 removing commands that were not all delivered`,
            {
              level: "error",
            },
          );
        checkTurnIdsConsistent(filtered_2);
        if (filtered_2.length > 0)
          if (
            updatedToolUseContext.abortController.signal.aborted ||
            updatedToolUseContext.messageQueue.isMidTurnFoldSuspended()
          )
            logForDebugging(
              `[query] abort/suspension during mid-turn absorption \u2014 leaving ${filtered_2.length} command(s) queued`,
            );
          else {
            toolUseContext.messageQueue.consume(filtered_2, {
              reason: "absorbed_mid_turn",
            });
            reportQueuedSubmissions(filtered_2, "mid_turn");
            markMessagesRead(filtered_2);
            recordContextKeyFromMessages(filtered_2);
            getValueFromInput_2(filtered_2, isMainThreadQuery);
            recordSubmittedPrompts(filtered_2, toolUseContext.storageV5, {
              armUndo: false,
              placed: withExpandedPastes,
            });
            if (
              da &&
              filtered_2.some(
                (Ie) =>
                  Ie.mode === "prompt" && !Ie.isMeta && Ie.shouldQuery !== false && isHumanOrigin(Ie.origin),
              )
            ) {
              notifyAutoReactHumanTurn();
              resetGoalIdleCheckinCount(toolUseContext.setAppState, toolUseContext.session.sessionScratch);
            }
            let Ee = shouldPreemptPromptTooLong(
              filtered_2,
              updatedToolUseContext.options.mainLoopModel,
              getEffortValue(updatedToolUseContext),
              deps,
            );
            if (Ee) {
              updatedToolUseContext = applyContextLayers(updatedToolUseContext, [Ee.layer]);
              yield Ee.reminder;
              toolResults.push(Ee.reminder);
            }
            for (let att of filtered_2)
              if (att.uuid && !wasPutBackSafe(toolUseContext.messageQueue, att.uuid)) {
                startedCommandUuids.push(att.uuid);
                yield {
                  type: "command_lifecycle",
                  uuid: att.uuid,
                  state: "started",
                };
              }
          }
      }
      let consumedCommands = deliverable.filter(isPollEventMode);
      if (consumedCommands.length > 0)
        if (j === 0) logPollEventsLeftQueued("mid-turn", consumedCommands.length);
        else {
          let Ee = yield* absorbQueuedPollEvents({
            events: consumedCommands,
            queue: toolUseContext.messageQueue,
            signal: updatedToolUseContext.abortController.signal,
            phase: "mid-turn",
            deliveredPollEventUuids,
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
        yield fileChangeAttachmentCount;
        toolResults.push(fileChangeAttachmentCount);
      }
      memoryRecallPrefetch.consumedOnIteration = turnCount - 1;
    }
    let fileChangeAttachmentCount = count(
      toolResults,
      (tr) => tr.type === "attachment" && tr.attachment.type === "edited_text_file",
    );
    logEvent("tengu_query_after_attachments", {
      totalToolResultsCount: toolResults.length,
      fileChangeAttachmentCount,
      queryChainId: queryChainIdForAnalytics,
      queryDepth: queryTracking.depth,
    });
    let toolUseContextWithQueryTracking = {
      ...updatedToolUseContext,
      queryTracking,
    };
    if (Ts !== undefined) {
      yield createAttachmentMessage_2(
        {
          type: "max_turns_reached",
          maxTurns: Ts,
          turnCount: _r,
        },
        deps,
      );
      markClassifierTurnAborted(toolUseContext, querySource);
      yield* runTurnEndReactions(
        updatedToolUseContext,
        [...messagesForQuery, ...assistantMessages, ...toolResults],
        {
          stopHookActive,
        },
      );
      return {
        reason: "max_turns",
        turnCount: _r,
      };
    }
    if (endTurnOverrideMessage) {
      yield endTurnOverrideMessage;
      toolResults.push(endTurnOverrideMessage);
    }
    queryCheckpoint("query_recursive_call");
    state = {
      guards: {
        ...guards,
        ...INITIAL_LOOP_RECOVERY_STATE,
        mcpEndTurnOverrideSpent: mcpEndTurnOverrideSpent || endTurnOverrideMessage !== undefined,
        turnCount: _r,
      },
      messages: [...messagesForQuery, ...assistantMessages, ...toolResults],
      toolUseContext: toolUseContextWithQueryTracking,
      compactTracking: tracking,
      pendingToolUseSummary: pendingToolUseSummary_2,
      transition: {
        reason: "next_turn",
      },
      prevToolDurations: attemptState.toolDurations.length > 0 ? [...attemptState.toolDurations] : undefined,
    };
    return NEXT_ROUND;
  }
  async function* runIterationRecordingErrors() {
    let k = yield* runIteration();
    if (k !== NEXT_ROUND) {
      let { recordProjectsReplyTurnError } = require("./chunk-cshk0jw3.js");
      recordProjectsReplyTurnError(k, querySource, {
        messages: state.messages,
        agentId: state.toolUseContext.agentId,
        engineState: () => state.toolUseContext.getAppState(),
      });
    }
    return k;
  }
  while (true) {
    let k = yield* runIterationRecordingErrors();
    if (k !== NEXT_ROUND) return k;
  }
}
//@ chunk-ha3km179.js:234645-235046 sole-consumer
/**
 * 模型回退的系统提示文案：overloaded/server_error → "due to high demand"；model_not_found/permission_denied/model_blocked → "is not available"（附错误摘要）；last_resort → 不可重试错误。
 */
function formatModelFallbackMessage(reason, n, r, originalError) {
  switch (reason) {
    case "overloaded":
    case "server_error":
      return `Switched to ${r} due to high demand for ${n}`;
    case "model_not_found":
    case "permission_denied":
    case "model_blocked": {
      let h =
        reason === "model_not_found" && !isModelNotFoundError(originalError)
          ? formatFallbackErrorDetail(originalError)
          : "";
      return `Switched to ${r} because ${n} is not available${h}`;
    }
    case "last_resort":
      return `Switched to ${r} because ${n} returned an error that could not be retried${formatFallbackErrorDetail(originalError)}`;
  }
}
//@ chunk-ha3km179.js:235046-235155 sole-consumer
/**
 * 把原始错误转成最多 300 字符的 " (…)" 后缀。
 */
function formatFallbackErrorDetail(e) {
  let n = e === undefined ? "" : errorMessage(e);
  let r = truncateToLength(n, 300);
  let s = r.length < n.length ? `${r}\u2026` : n;
  return s ? ` (${s})` : "";
}
//@ chunk-ha3km179.js:235155-235573 sole-consumer
/**
 * 处理折叠进本轮的 prompt.submit：应用会话标题，保留 attachment/user 消息，并把 UserPromptSubmit 钩子附加上下文（截断后）作为 hook_additional_context 附件追加。
 */
async function applyFoldedPromptSubmit(promptSubmitted, updatedToolUseContext) {
  if (promptSubmitted === undefined) return [];
  if (promptSubmitted.sessionTitle !== undefined)
    try {
      await applyHookSessionTitle(
        updatedToolUseContext.session.id,
        promptSubmitted.sessionTitle,
        updatedToolUseContext.storageV5,
        updatedToolUseContext.credentials,
      );
    } catch (error) {
      if (!isAbortError(error))
        logForDebugging(`Failed to apply a folded prompt.submit session title: ${errorMessage(error)}`, {
          level: "error",
        });
    }
  let filtered = promptSubmitted.messages.filter(
    (message) => message.type === "attachment" || message.type === "user",
  );
  let s = await capAdditionalContext(
    promptSubmitted.context ?? [],
    "prompt.submit",
    updatedToolUseContext.storageV5,
  );
  return s.length > 0 ? [...filtered, createHookContextAttachment(s, "prompt.submit")] : filtered;
}
//@ chunk-ha3km179.js:235573-235717 sole-consumer = isHumanTurn (0.779)
/**
 * 返回最后一条真实人类消息（非 meta、非工具结果、非压缩摘要）的下标，没有时返回 0；queryLoop 用它设置 turnStartIndex。旧版名 isHumanTurn 名不符实（返回下标）。
 */
function isHumanTurn(m) {
  for (let j = m.length - 1; j >= 0; j--) {
    let r = m[j];
    if (r.type === "user" && !r.isMeta && !r.toolUseResult && !r.isCompactSummary) return j;
  }
  return 0;
}
//@ chunk-ha3km179.js:235717-235814 sole-consumer
/**
 * 主线程/子代理时清空 options.activeMcpServer/activeMcpTool（每轮 API 循环开始与 attempt 重置时调用）。
 */
function clearActiveMcpContext(options, isMainOrSubagent) {
  try {
    if (!isMainOrSubagent) return;
    options.activeMcpServer = undefined;
    options.activeMcpTool = undefined;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:235814-235920 sole-consumer = getValueFromInput (1)
/**
 * 生成队列命令过滤器：可折叠命令放行；遇到第一条不可折叠的 prompt 命令后，其后的 prompt 命令都不再折叠进本轮。
 */
function createFoldCommandFilter(input) {
  let n = false;
  return (r) => {
    if (n && r.mode === "prompt") return false;
    if (!isCommandFoldable(r, input)) return true;
    n = true;
    return false;
  };
}
//@ chunk-ha3km179.js:235920-236090 sole-consumer
/**
 * 命令能否折叠进当前轮：drainOnly/screeningPending 恒可；没有 promptSubmitted 不可；否则要求提交时的钩子/插件快照与当前一致（AKn 比较）。
 */
function isCommandFoldable(e, n) {
  if (e.drainOnly === true || e.screeningPending === true) return true;
  if (e.promptSubmitted === undefined) return false;
  let r = n();
  return r === undefined || screensChanged(e.promptSubmitted.under, r);
}
//@ chunk-4163ksv9.js:263-281 placement
/**
 * ["take_in"]
 */
var TAKE_IN_KINDS = ["take_in"];
//@ chunk-4163ksv9.js:281-306 placement
/**
 * 访问者登记表
 */
class VisitorRegistry {
  visitors = new Map();
}
//@ chunk-4163ksv9.js:306-330 placement
/**
 * 访问者登记槽
 */
var visitorRegistrySlot = new SessionRootSlot(() => new VisitorRegistry());
//@ chunk-4163ksv9.js:330-388 placement
/**
 * 是否仍在等待
 */
function isPending(o) {
  try {
    return o.pending() === true;
  } catch {
    return false;
  }
}
//@ chunk-4163ksv9.js:388-473 placement
/**
 * 是否有未完成的回合访问者
 */
function hasPendingVisitors(session) {
  let visitors = visitorRegistrySlot.peek(session)?.visitors;
  return visitors !== undefined && [...visitors.values()].some(isPending);
}
//@ chunk-4163ksv9.js:473-827 placement
/**
 * 运行注册的回合访问者，可被中止
 */
async function runTurnVisitors(session, signal) {
  let visitors = visitorRegistrySlot.peek(session)?.visitors;
  if (visitors === undefined) return;
  let p = (async () => {
    for (let s of TAKE_IN_KINDS) {
      let i = visitors.get(s);
      if (i !== undefined && !isAborted(signal) && isPending(i))
        try {
          await i.visit(signal);
        } catch {}
    }
  })();
  if (isAborted(signal)) return;
  let t = () => {};
  let promise = new Promise((resolve) => {
    t = () => resolve();
  });
  signal.addEventListener("abort", t, {
    once: true,
  });
  try {
    await Promise.race([p, promise]);
  } finally {
    signal.removeEventListener("abort", t);
  }
}
//@ chunk-32qjrk8h.js:191-216 placement
/**
 * 恒返回空数组
 */
function emptyToolResults(events) {
  return [];
}
export { query };
