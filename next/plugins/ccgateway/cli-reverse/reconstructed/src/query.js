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
import { SessionRootSlot, isVirtualConversationMessage } from "./bootstrap/sessionSlices.js";
import { isAborted } from "./utils/abortSignalUtils.js";
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
import { getEffortLevelIfSupported, carriedEffortForModel } from "./utils/effort.js";
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
import {
  shouldRetryRefusal,
  shouldAskRefusalFallbackPreference,
  EMPTY_ANNOUNCEMENT,
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
  NO_SUPPRESSION,
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
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-32qjrk8h.js:191-216 placement
/**
 * 恒返回空数组
 */
function emptyToolResults(events) {
  return [];
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
var visitorRegistrySlot; // deferred: uses SessionRootSlot (./bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4163ksv9.js:306", () => {
  visitorRegistrySlot = new SessionRootSlot(() => new VisitorRegistry());
});
//@ chunk-4163ksv9.js:330-388 placement
/**
 * 是否仍在等待
 */
function isPending(visitor) {
  try {
    return visitor.pending() === true;
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
  let visitorRunPromise = (async () => {
    for (let kind of TAKE_IN_KINDS) {
      let visitor = visitors.get(kind);
      if (visitor !== undefined && !isAborted(signal) && isPending(visitor))
        try {
          await visitor.visit(signal);
        } catch {}
    }
  })();
  if (isAborted(signal)) return;
  let onAbort = () => {};
  let promise = new Promise((resolve) => {
    onAbort = () => resolve();
  });
  signal.addEventListener("abort", onAbort, {
    once: true,
  });
  try {
    await Promise.race([visitorRunPromise, promise]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
//@ chunk-ha3km179.js:153194-153282 sole-consumer
/**
 * 构建时裁掉的可选拒绝跟踪模块（恒为 null）；requireTurnClassifier/requireClassifierSurfaces 惰性加载活动分类器与其输出面（chunk-wd9kxbpn、chunk-e321p3vc）。
 */
var toolDenialTracker = null;
var requireTurnClassifier = () => require("./services/agentStatus/LINK_SCAN_MAX_BYTES.lazy.js");
var requireClassifierSurfaces = () => require("./services/classifierSummary.js");
//@ chunk-ha3km179.js:153282-153317 sole-consumer
/**
 * 按 session.host 存放分类器任务状态的懒槽。
 */
var classifierJobStateSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ha3km179.js:153282", () => {
  classifierJobStateSlot = new HostScoped(() => ({
    state: undefined,
  }));
});
//@ chunk-ha3km179.js:153317-153444 sole-consumer
/**
 * 取当前会话的分类器任务状态，首次调用时用 createClassifierJobState 创建；分类器模块不存在时为 null。
 */
function getClassifierJobState(toolUseContext) {
  let hostState = classifierJobStateSlot.of(toolUseContext.session.host);
  if (hostState.state === undefined)
    hostState.state = requireTurnClassifier?.().createClassifierJobState(toolUseContext) ?? null;
  return hostState.state;
}
//@ chunk-ha3km179.js:153444-153652 sole-consumer
/**
 * teleportFetchModule（composeTeleportFetchOverride，给远程/传送会话改写 fetch）与拒答回退级联解析器 refusalCascadeResolver。
 */
var teleportFetchModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var refusalCascadeResolver;
deferInit("chunk-ha3km179.js:153444", () => {
  teleportFetchModule = require("./services/api/composeTeleportFetchOverride.lazy.js");
  refusalCascadeResolver = {
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
});
//@ chunk-ha3km179.js:153652-153944 fingerprint (2.1.88 match: yieldMissingToolResultBlocks, 0.871)
/**
 * 为每个尚无结果的 tool_use 生成 is_error 的 tool_result 用户消息（中止、出错时保证 tool_use/tool_result 配对）。已回答的 id 通过第 4 参跳过。
 */
function* yieldMissingToolResultBlocks(assistantMessages, errorMessage, deps, answeredToolUseIds) {
  for (let assistantMessage of assistantMessages) {
    let toolUseBlocks = assistantMessage.message.content.filter((content) => content.type === "tool_use");
    for (let toolUse of toolUseBlocks) {
      if (answeredToolUseIds?.has(toolUse.id)) continue;
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
function getInterruptedMessageId(toolUseContext) {
  if (toolUseContext.agentId) return;
  let abortReason = unwrapAbortReason(toolUseContext.abortController.signal.reason);
  if (abortReason !== "user-cancel" && abortReason !== "remote-cancel") return;
  return getLastCancelledAPIMessageId() ?? undefined;
}
//@ chunk-ha3km179.js:154213-154323 layout
/**
 * 取最后一条 assistant 之后最后一条真实用户消息的 uuid，作为拒答通知里的 refusedUserMessageUuid。
 */
function getRefusedUserMessageUuid(messages) {
  let lastIndex = messages.findLastIndex((message) => message.type === "assistant");
  return messages.slice(lastIndex + 1).findLast(isRealUserPromptMessage)?.uuid ?? null;
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
    let toolResultContentById = new Map();
    for (let toolResult of toolResults)
      if (toolResult.type === "user" && Array.isArray(toolResult.message.content)) {
        for (let content of toolResult.message.content)
          if (content.type === "tool_result") toolResultContentById.set(content.tool_use_id, content.content);
      }
    try {
      for await (let hookResult of executePostToolBatchHooks(
        toolUseBlocks.map((toolUseBlock) => ({
          tool_name: toolUseBlock.name,
          tool_input: toolUseBlock.input,
          tool_use_id: toolUseBlock.id,
          tool_response: toolResultContentById.get(toolUseBlock.id),
        })),
        `hook-${deps.uuid()}`,
        updatedToolUseContext,
        getToolPermissionContext(updatedToolUseContext).mode,
        updatedToolUseContext.abortController.signal,
      )) {
        if (hookResult.message) yield hookResult.message;
        if (hookResult.blockingError || hookResult.preventContinuation)
          logForDebugging(
            `[end-turn] PostToolBatch block discarded (turn ended by ${endTurnSource === "tool" ? "tool result" : "MCP end-turn"}, no model re-invoke): ${hookResult.blockingError?.blockingError ?? hookResult.stopReason ?? "preventContinuation"}`,
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
function markClassifierApiFailure(toolUseContext, querySource, failureReason) {
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
      failureReason.error,
      getAssistantMessageText(failureReason) ?? failureReason.errorDetails ?? "",
      failureReason.apiError,
    )
    .catch(() => {});
}
//@ chunk-ha3km179.js:155930-156008 fingerprint (2.1.88 match: isWithheldMaxOutputTokens, 1)
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
    (message) => !message.isApiErrorMessage && !isAbandonedOrUnsignedThinkingMessage(message),
  );
  let candidate = filtered.length === 1 ? filtered[0] : undefined;
  if (candidate === undefined || candidate.message.content.length !== 1) return false;
  let block = candidate.message.content[0];
  return (
    block !== undefined &&
    isThinkingBlock(block) &&
    hasThinkingSignature(block) &&
    candidate.message.stop_reason === "max_tokens" &&
    !isForeignModelMessage(candidate, stripAnyVersatileSuffix(model)) &&
    shouldResumeThinking(model, candidate.message.resumable, totalTokensOf(candidate.message.usage))
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
  ].filter((promptPart) => !!promptPart);
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
  let terminal;
  using transcriptTap = observeRunningTurn(params.toolUseContext, params.messages);
  try {
    await awaitArtifactRosterSafe(params.toolUseContext.options.tools);
    terminal = yield* isObserverAgentsEnabled()
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
    terminal,
    createQueueDelivery,
  );
  let state = isAbnormalTerminalReason(terminal.reason) ? "cancelled" : "completed";
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
  if (isErrorTerminalReason(terminal.reason)) logFeatureBad("turn", terminalReasonTag(terminal));
  else logFeatureOk("turn");
  reportTurnEnd({
    terminal,
    querySource: params.querySource,
    agentContext: params.toolUseContext.agentContext,
    hasActiveGoal: params.toolUseContext.options.activeGoal !== undefined,
    startedAt,
  });
  return terminal;
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
  let loopIterator = transcriptTap.through(
    queryLoop(params, startedCommandUuids, deliveredPollEventUuids, transcriptTap),
  );
  let terminal;
  try {
    let nextInput;
    while (true) {
      let step = await loopIterator.next(nextInput);
      if (step.done) {
        terminal = step.value;
        break;
      }
      if (armedObserverAttachment)
        if (step.value.type === "stream_request_start") armedObserverAttachment.flushSegment();
        else armedObserverAttachment.capture(step.value);
      nextInput = yield step.value;
    }
  } finally {
    if (terminal === undefined)
      try {
        await loopIterator.return(undefined);
      } catch {}
    try {
      armedObserverAttachment?.finish(terminal?.reason ?? "ended");
    } catch {}
  }
  if (terminal === undefined) throw Error("queryWithObserverTap: missing terminal after completion");
  return terminal;
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
function logPollEventsLeftQueued(turnPhase, eventCount) {
  logFeatureSad("poll_event_delivery", "left_queued");
  logForDebugging(
    `[query] ${turnPhase} poll_events emission degraded to 0 for ${eventCount} event(s) \u2014 leaving them queued`,
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
//@ chunk-ha3km179.js:159198-234645 callgraph-witnessed (2.1.88 match: queryLoop, 0.294)
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
    let abortedRows = abortedTurnRows(params.inPlaceOfFirstRequest, {
      signal: params.toolUseContext.abortController.signal,
      interruptedMessageId: () => getInterruptedMessageId(params.toolUseContext),
      now: params.deps?.now,
      uuid: params.deps?.uuid,
    });
    yield* abortedRows.rows;
    if (abortedRows.terminal.reason === "aborted_streaming")
      markClassifierTurnAborted(params.toolUseContext, querySource);
    return abortedRows.terminal;
  }
  let nobodysTurn = endsWithMachineTurn(params.messages);
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
  let messagesSinceBoundary = messagesSinceCompactBoundary(params.messages);
  let refusedUserMessageUuid = getRefusedUserMessageUuid(messagesSinceBoundary);
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
  let memoryContextPromise = collectCoworkMemoryContext(
    messagesSinceBoundary,
    state.toolUseContext,
    querySource,
  );
  using memoryRecallPrefetch = startRelevantMemoryPrefetch(
    state.messages,
    state.toolUseContext,
    querySource,
    memoryContextPromise,
  );
  if (memoryRecallPrefetch && shouldBlockOnMemoryPrefetch()) {
    let memoryAttachments = [];
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
        let dedupedAttachments = filterDuplicateMemoryAttachments(
          attachments,
          state.toolUseContext.readFileState,
          state.toolUseContext.session,
          memoryRecallPrefetch.earlierReadsMayBeCleared,
        );
        memoryRecallPrefetch.consumedOnIteration = 0;
        memoryRecallPrefetch.consumedBlocking = true;
        memoryAttachments = dedupedAttachments.map((attachment) =>
          createAttachmentMessage_2(attachment, deps),
        );
      }
    } catch (error) {
      logError(error);
      memoryAttachments = [];
    }
    if (memoryAttachments.length > 0)
      state = {
        ...state,
        messages: [...state.messages, ...memoryAttachments],
      };
    for (let attachmentMessage of memoryAttachments) yield attachmentMessage;
  }
  if (memoryContextPromise) {
    if (isTopLevelMainThread) {
      endProfilePhase("loop_entry");
      startProfilePhase("memory_context_wait");
    }
    let mapped = (await memoryContextPromise).map((attachment) =>
      createAttachmentMessage_2(attachment, deps),
    );
    if (isTopLevelMainThread) {
      endProfilePhase("memory_context_wait");
      startProfilePhase("loop_entry");
    }
    if (mapped.length > 0)
      state = {
        ...state,
        messages: [...state.messages, ...mapped],
      };
    for (let attachmentMessage of mapped) yield attachmentMessage;
  }
  let pendingPollEventRows = [];
  let hookErrored = false;
  {
    let agentContext = state.toolUseContext.agentContext;
    let turnStartPollCommands =
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
    if (turnStartPollCommands.length > 0) {
      let messageQueue = state.toolUseContext.messageQueue;
      messageQueue.registerFoldInFlight(turnStartPollCommands);
      nobodysTurn &&= !turnStartPollCommands.some(isPersonQueuedInput);
      try {
        let remainingWakeEvents = messageQueue.countRemainingWakePollEventsAfter(turnStartPollCommands);
        let queuedAttachments = [];
        try {
          queuedAttachments = await getQueuedCommandAttachments(
            turnStartPollCommands,
            imageLimitsForModel(state.toolUseContext.options.mainLoopModel),
            remainingWakeEvents,
            {
              messages: state.toolUseContext.messages,
            },
          );
        } catch (error) {
          if (isAbortError(error))
            logForDebugging("[query] turn-start poll_events build aborted \u2014 leaving events queued");
          else logError(error);
        }
        if (queuedAttachments.some((attachment) => attachment.type === "poll_events")) {
          state.toolUseContext.setToolPermissionContext(setPollEventDeliveryGuard);
          let mapped = queuedAttachments.map((attachment) => createAttachmentMessage_2(attachment, deps));
          state = {
            ...state,
            messages: [...state.messages, ...mapped],
          };
          for (let attachmentMessage of mapped) yield attachmentMessage;
          pendingPollEventRows = yield* absorbQueuedPollEvents({
            events: turnStartPollCommands,
            queue: messageQueue,
            signal: state.toolUseContext.abortController.signal,
            phase: "turn-start",
            deliveredPollEventUuids,
          });
        } else logPollEventsLeftQueued("turn-start", turnStartPollCommands.length);
      } finally {
        messageQueue.unregisterFoldInFlight(turnStartPollCommands);
      }
    }
  }
  if (isMainThreadQuery && !state.toolUseContext.agentId && !state.toolUseContext.options.bareFork) {
    let messageQueue = state.toolUseContext.messageQueue;
    try {
      let passiveCommands = messageQueue.isMidTurnFoldSuspended()
        ? []
        : messageQueue.getCommandQueue().filter(isPassiveMainAgentCommand);
      if (passiveCommands.length > 0) {
        let queuedCommandAttachments = await getQueuedCommandAttachments(
          passiveCommands,
          imageLimitsForModel(state.toolUseContext.options.mainLoopModel),
          0,
          {
            messages: state.toolUseContext.messages,
          },
        );
        if (
          queuedCommandAttachments.length === passiveCommands.length &&
          !state.toolUseContext.abortController.signal.aborted
        ) {
          checkTurnIdsConsistent(passiveCommands);
          let mapped = queuedCommandAttachments.map((queuedCommandAttachment) =>
            createAttachmentMessage_2(queuedCommandAttachment, deps),
          );
          state = {
            ...state,
            messages: [...state.messages, ...mapped],
          };
          for (let attachmentMessage of mapped) yield attachmentMessage;
          messageQueue.consume(passiveCommands, {
            reason: "absorbed_mid_turn",
          });
          nobodysTurn &&= !passiveCommands.some(isPersonQueuedInput);
        } else if (!state.toolUseContext.abortController.signal.aborted)
          logForDebugging(
            `[query] turn-start passive fold emitted ${queuedCommandAttachments.length} of ${passiveCommands.length} \u2014 leaving them queued`,
            {
              level: "warn",
            },
          );
      }
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  }
  let silentArmSpent = false;
  let refusalFallbacksUsed = 0;
  let refusalFallbackDeclined = false;
  let suppressionAlreadyLogged = false;
  let pendingSupersedeUuids;
  let supersedeHoldRound = false;
  let primaryModel = getMainLoopModel_2(params.toolUseContext);
  let sessionModel = primaryModel;
  let modelChain = buildAvailabilityFallbackChain(primaryModel, fallbackModel);
  let chainIndex = 0;
  let modelFacts = params.modelFacts;
  let fallbackRecordChain;
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
    if (hookErrored) {
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
    let turnSnapshot;
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
    let canResumeThinking = (model) => canResumeThinkingOnModel(messagesForQuery, model);
    let tracking = compactTracking;
    let preFirstCompactFork =
      toolUseContext.precomputeSourceKey !== undefined &&
      tracking?.compacted !== true &&
      !isCompactCommandSource(querySource);
    using classifierAbortGuard =
      requireTurnClassifier &&
      isActingAsBgJob() &&
      querySource.startsWith("repl_main_thread") &&
      !toolUseContext.agentId
        ? createDisposableGuard(() => markClassifierTurnAborted(toolUseContext, querySource))
        : undefined;
    if (requireTurnClassifier && classifierAbortGuard) {
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
    let recordsContentReplacement =
      querySource.startsWith("agent:") || querySource.startsWith("repl_main_thread");
    messagesForQuery = await applyToolResultBudget(
      messagesForQuery,
      toolUseContext.contentReplacementState,
      toolResultsDirFor_2(toolUseContext.session),
      recordsContentReplacement
        ? (message) =>
            void recordContentReplacement(message, toolUseContext.agentId, toolUseContext.storageV5).catch(
              logError,
            )
        : undefined,
      getBudgetExemptToolNames(toolUseContext.options.tools),
      toolUseContext.storageV5,
    );
    let effectiveModel = () =>
      effectiveTurnModel({
        refusalOverride,
        consentOverride,
        liveSwitchOverride,
        chainModel: modelChain[chainIndex],
        primaryModel,
      });
    if (isMainThread) {
      let modelSwitch = checkModelSwitch({
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
      if (modelSwitch !== undefined) {
        config = modelSwitch.pick;
        let adopt = modelSwitch.adopt;
        if (adopt !== undefined) {
          let previousModel = effectiveModel();
          let model = adopt.model;
          switch (adopt.latch) {
            case "session_pick":
              fallbackRecordChain = undefined;
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
            from_model: telemetrySafeModelName(previousModel),
            to_model: telemetrySafeModelName(model),
            query_source: agentTypeForTelemetry(querySource),
            entrypoint: lit("cli"),
            queryChainId: queryChainIdForAnalytics,
            queryDepth: queryTracking.depth,
          });
        }
      }
    }
    let resolveRuntimeModel = (messages, permissionMode) =>
      getRuntimeMainLoopModel({
        permissionMode,
        mainLoopModel: effectiveModel(),
        exceeds200kTokens: permissionMode === "plan" && doesMostRecentAssistantMessageExceed200k(messages),
      });
    let resolveModelAndFacts = async (messages, permissionMode) => {
      let model = resolveRuntimeModel(messages, permissionMode);
      let pendingModelFacts = modelFacts;
      modelFacts = undefined;
      if (isTopLevelMainThread) startProfilePhase("model_config_wait");
      let resolvedFacts =
        pendingModelFacts?.model === model ? pendingModelFacts : await awaitMcpSettle(model, toolUseContext);
      if (isTopLevelMainThread) endProfilePhase("model_config_wait");
      return [model, resolvedFacts];
    };
    if (isTopLevelMainThread) endProfilePhase("message_prep");
    let [attemptModel, attemptModelFacts] = await resolveModelAndFacts(
      messagesForQuery,
      getToolPermissionContext(toolUseContext).mode,
    );
    if (isTopLevelMainThread) startProfilePhase("message_prep");
    let setAttemptModel = (nextModel) => {
      attemptModel = nextModel;
      attemptModelFacts = getModelContextInfo(nextModel);
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
    let compactionIterator = deps.autocompact(
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
    let autocompactOutcome = yield* releasingAsyncIterator(compactionIterator);
    queryCheckpoint("query_autocompact_end");
    if (isTopLevelMainThread) {
      endProfilePhase("autocompact");
      startProfilePhase("request_announcements");
    }
    if (autocompactOutcome.kind === "rapid_refill_breaker_tripped") {
      let rapidRefillNotice = fallbackWindowNotice({
        fallback: isMainThreadQuery ? fallbackRecordChain : undefined,
        mainLoopModel: toolUseContext.options.mainLoopModel,
        configuredWindow: toolUseContext.options.autoCompactWindow,
      });
      logEvent("tengu_auto_compact_rapid_refill_breaker", {
        consecutiveRapidRefills: tracking?.consecutiveRapidRefills ?? 0,
        turnsSincePreviousCompact: tracking?.turnCounter ?? -1,
        queryChainId: queryChainIdForAnalytics,
        queryDepth: queryTracking.depth,
        afterShrinkingFallback: rapidRefillNotice.afterShrinkingFallback,
      });
      let fullSystemPrompt = createApiErrorMessage({
        content: rapidRefillNotice.content,
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
      let { result: compactionResult, thresholdSource, thresholdWindow } = autocompactOutcome;
      let { preCompactTokenCount, postCompactTokenCount, truePostCompactTokenCount, compactionUsage } =
        compactionResult;
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
          compactionResult.summaryMessages.length +
          compactionResult.attachments.length +
          compactionResult.hookResults.length,
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
      compactionResult.summaryMessages = stampSummaryTurnFields(
        compactionResult.summaryMessages,
        messagesForQuery,
      );
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
      let reannouncedAfterCompact = await reannounceAfterCompact(compactionResult, {
        routing: contextRouting,
        toolUseContext,
        querySource,
        resumeActive,
        foreground: isMainThreadQuery && isMainAgent(toolUseContext.agentContext),
        stamp: deps,
      });
      messagesForQuery = insertAfterCompactBoundary(
        buildPostCompactMessages(compactionResult),
        reannouncedAfterCompact,
      );
      if (messages !== params.messages) {
        turnSnapshot = snapshotMessagesAndStart(messages);
        if (turnSnapshot !== undefined) messages = messagesForQuery;
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
      for (let message of insertAfterCompactBoundary(
        buildPostCompactMessagesWithoutKept(compactionResult),
        reannouncedAfterCompact,
      ))
        yield message;
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
        isPreFirstCompactFork: preFirstCompactFork,
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
        for (let copiedText of await copyTextOf(toolUseContext.session)) {
          for (let message of copiedText.messages) {
            yield message;
            messagesForQuery = [...messagesForQuery, message];
          }
          if (copiedText.contexts.length > 0) {
            let attachmentMessage = createAttachmentMessage_2(
              {
                type: "hook_additional_context",
                content: copiedText.contexts,
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
    let isForegroundMain = isMainThreadQuery && isMainAgent(toolUseContext.agentContext);
    let routedContext = resumeActive
      ? contextRouting
      : await refreshRoutedGitStatus(messagesForQuery, contextRouting, toolUseContext, isForegroundMain);
    let contextWithDocText =
      !resumeActive &&
      shouldSendProjectDocText(
        messagesForQuery,
        routedContext,
        toolUseContext,
        isForegroundMain,
        state.transition === undefined,
      )
        ? await checkProjectDocReadAllowed(
            routedContext,
            toolUseContext,
            () => createToolUseContextView(toolUseContext),
            {
              messages: messagesForQuery,
              systemPrompt,
              modelFacts: attemptModelFacts,
            },
            (docPath, docContents) => anyDocReadHookBlocks(docPath, toolUseContext, docContents),
          )
        : routedContext;
    for (let announcement of reportContextAnnouncements(messagesForQuery, contextWithDocText, {
      querySource,
      resumeActive,
      stamp: deps,
      announcementWalk: toolUseContext.options.announcementWalk,
    })) {
      yield announcement;
      messagesForQuery = [...messagesForQuery, announcement];
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
    for (let thinkingAttachment of crossOrgThinkingAttachments(messagesForQuery, {
      querySource,
      mainThread: isMainThreadQuery && isMainAgent(toolUseContext.agentContext),
      model: runtimeOptionsModel,
      stamp: deps,
    })) {
      yield thinkingAttachment;
      messagesForQuery = [...messagesForQuery, thinkingAttachment];
    }
    for (let autoModeAttachment of await autoModeTurnAttachments(messagesForQuery, toolUseContext, {
      querySource,
      resumeActive,
      model: getRuntimeMainLoopModel({
        permissionMode: mode,
        mainLoopModel: getPrimaryModelForFallback(toolUseContext.options),
        exceeds200kTokens: exceeds200kInPlanMode,
      }),
      stamp: deps,
    })) {
      yield autoModeAttachment;
      messagesForQuery = [...messagesForQuery, autoModeAttachment];
    }
    let advisorResolution = resolveAdvisorState(messagesForQuery, toolUseContext, {
      querySource,
      resumeActive,
      configuredRuntimeModel,
      runtimeOptionsModel,
      carrier: stickyBetas ?? getStickyBetas(),
      toolChangesRide: (toolChange) => canDeclareToolChangeAhead(stickyBetas ?? getStickyBetas(), toolChange),
    });
    if (advisorResolution.announcement !== undefined) {
      let attachmentMessage = createAttachmentMessage_2(advisorResolution.announcement, deps);
      yield attachmentMessage;
      messagesForQuery = [...messagesForQuery, attachmentMessage];
    }
    yield* pendingPollEventRows;
    pendingPollEventRows = [];
    let { advisorModel, advisorDeferred, advisorActive } = advisorResolution;
    let previousPromptSnapshot = () =>
      turnSnapshot ? turnSnapshot.recorded : latestPromptSnapshot(messages);
    let promptRender = recordPromptSnapshot(messagesForQuery, systemPrompt, {
      options: toolUseContext.options,
      querySource,
      resumeActive,
      stamp: deps,
      inheritedReminderFold: () => previousPromptSnapshot()?.reminderFold,
      inheritedWireShape: () => previousPromptSnapshot()?.wireShape,
      inheritedEchoWireToolInputs: () => previousPromptSnapshot()?.echoWireToolInputs,
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
      let deferredToolsRecord = recordDeferredTools(messagesForQuery, deferredToolsSent, {
        options: toolUseContext.options,
        querySource,
        stamp: deps,
        toolInputCopies: toolInputCopiesSent,
      });
      if (deferredToolsRecord) messagesForQuery = [...messagesForQuery, deferredToolsRecord];
      return deferredToolsRecord;
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
    let retryRefusal = shouldRetryRefusal(querySource, refusalRetrySpent);
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
    function noteToolMessageFlags(message) {
      attemptState.toolRequestedEndTurn = higherSourceRank(
        attemptState.toolRequestedEndTurn,
        getToolEndsTurnKind(message),
      );
      if (message.type !== "attachment") return;
      if (message.attachment.type === "hook_stopped_continuation")
        attemptState.shouldPreventContinuation = true;
      else if (message.attachment.type === "hook_deferred_tool") attemptState.toolWasDeferred = true;
    }
    function recordToolResult(message, context) {
      nobodysTurn &&= !hasAuthoritativePollEvents(message) && !toolUseBlocks.some(isQuestionTool);
      if (message.type === "attachment") {
        toolResults.push(message);
        return;
      }
      if (isVirtualConversationMessage(message)) return;
      let normalized;
      try {
        normalized = normalizeMessagesForAPI(
          [message],
          context.options.refreshTools?.() ?? context.options.tools,
          toolUseContext.options.mainLoopModel,
          {
            reminderFold,
          },
        );
        validateImagesInMessages(
          normalized,
          imageLimitsForModel(toolUseContext.options.mainLoopModel).maxBase64Size,
        );
      } catch (error) {
        if (message.type === "user") toolResults.push(message);
        throw error;
      }
      toolResults.push(...normalized.filter((message) => message.type === "user"));
    }
    function* drainCompletedToolResults(includeImages = true) {
      if (toolUseContext.abortController.signal.aborted) return;
      for (let update of attemptState.streamingToolExecutor.getCompletedResults()) {
        if (hasTypeField(update)) {
          yield update;
          continue;
        }
        if (update.message) {
          if (!includeImages && hasImageBlock(update.message)) continue;
          yield markVirtualInResume(update.message);
          noteToolMessageFlags(update.message);
          recordToolResult(update.message, toolUseContext);
        }
        if (update.toolDuration) attemptState.toolDurations.push(update.toolDuration);
      }
    }
    function* endTurnOnError(error) {
      let isImageError = error instanceof ImageSizeError || error instanceof ImageResizeError;
      let errorText = error instanceof Error ? error.message : String(error);
      if (isImageError)
        logForDebugging(`Query image error: ${errorText}`, {
          level: "error",
        });
      else logError(withTelemetryMessage(toError(error), "queryLoop invariant broken"));
      try {
        let resetOutcome;
        if (toolUseBlocks.length > 0) {
          try {
            yield* drainCompletedToolResults(false);
          } catch (error) {
            logError(withTelemetryMessage(toError(error), "tool drain failed while ending the turn"));
          }
          resetOutcome = resetStreamingToolExecutor(
            attemptState,
            isImageError ? "image_error" : "model_error",
          );
          for (let finishedResult of resetOutcome.finishedResults) {
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
          isImageError ? IMAGE_ERROR_TOOL_CANCEL_TEXT : turnErrorToolCancelText(errorText),
          deps,
          completedToolUseIds(attemptState),
        );
        if (resetOutcome?.removes) yield resetOutcome.removes;
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "tool_result pairing failed while ending the turn"));
      }
      try {
        let apiErrorMessage = createApiErrorMessage(
          isImageError
            ? {
                content: errorText,
                error: "invalid_request",
                errorDetails: errorText,
                now: deps.now,
                uuid: deps.uuid,
              }
            : {
                content: errorText,
                now: deps.now,
                uuid: deps.uuid,
              },
        );
        yield apiErrorMessage;
        markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
      } catch (error) {
        logError(withTelemetryMessage(toError(error), "error frame failed while ending the turn"));
      }
      if (isImageError)
        return {
          reason: "image_error",
        };
      logAntError("Query error", error);
      return {
        reason: "model_error",
        error,
      };
    }
    function* yieldWithRefusalNotice(message) {
      yield* yieldRefusalNoFallbackNotice();
      yield message;
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
        let creditsOnlyFallbackModel = getUsageCreditsOnlyModelConsentDeclineFallback();
        defaultModelInfo = automaticModelFallbackInfo({
          userModel: sessionModel,
          permissionMode: mode,
          exceeds200kTokens: exceeds200kInPlanMode,
          automaticModels: [
            getActiveModelFallback()?.fallbackModel,
            creditsOnlyFallbackModel !== null && getMainLoopModelOverride() === creditsOnlyFallbackModel
              ? creditsOnlyFallbackModel
              : undefined,
          ],
        });
      } catch (error) {
        logError(toError(error));
        defaultModelInfo = {};
      }
    if (needsOverageConsentForModel(attemptModel, toolUseContext.requestDialog)) {
      let consentChoice = "cancelled";
      let cancelledWhileParked = false;
      let dialogQueuedAtPark = false;
      let answeredOverBridge = false;
      let canPromptUser =
        needsOverageConsentOnMainThread({
          requestDialog: toolUseContext.requestDialog,
          isMainThread,
        }) && !toolUseContext.abortController.signal.aborted;
      if (canPromptUser && toolUseContext.requestDialog) {
        let signal = toolUseContext.abortController.signal;
        let userDialogTimeoutMs = getUserDialogTimeoutMs();
        let unattended = !isSdkDialogHostActive() && isUnattendedInteractiveSession();
        let abortController = new AbortController();
        let abortOnSignal = () => abortController.abort();
        signal.addEventListener("abort", abortOnSignal, {
          once: true,
        });
        let userInteracted = false;
        let now = Date.now();
        let unregisterInteraction =
          unattended && !isBgSession()
            ? onInteraction(() => {
                if (Date.now() - now > 1000) userInteracted = true;
              })
            : () => {};
        let commandId = (command) => command.uuid ?? command;
        let knownCommandIds = new Set(
          toolUseContext.messageQueue
            .getCommandQueueSnapshot()
            .filter(isPromptModeQueuedCommand)
            .map(commandId),
        );
        let onQueueChangeCheck = () => {
          flushInteractionTime();
          if (
            !userInteracted &&
            toolUseContext.messageQueue
              .getCommandQueueSnapshot()
              .some(
                (command) => isPromptModeQueuedCommand(command) && !knownCommandIds.has(commandId(command)),
              )
          ) {
            dialogQueuedAtPark = true;
            abortController.abort();
          }
        };
        let unsubscribeQueue = unattended
          ? toolUseContext.messageQueue.subscribe(onQueueChangeCheck)
          : () => {};
        let dialogTimeout =
          unattended && userDialogTimeoutMs > 0
            ? setTimeout(
                (controller) => {
                  flushInteractionTime();
                  if (!userInteracted) controller.abort();
                },
                userDialogTimeoutMs,
                abortController,
              )
            : undefined;
        let settledUnanswered = false;
        try {
          consentChoice = await toolUseContext.requestDialog(
            FABLE_OVERAGE_CONSENT_DIALOG,
            {
              overagesEnabled: hasExtraUsageProvisioned(),
              modelName: renderUsageCreditsOnlyModelName(attemptModel),
              model: attemptModel,
            },
            {
              signal: abortController.signal,
              onSettledUnanswered: (settleReason) => {
                settledUnanswered = true;
                dialogQueuedAtPark ||= settleReason === "moved_on";
              },
              onAnsweredOverBridge: () => {
                answeredOverBridge = true;
              },
            },
          );
        } finally {
          clearTimeout(dialogTimeout);
          unregisterInteraction();
          unsubscribeQueue();
          signal.removeEventListener("abort", abortOnSignal);
        }
        cancelledWhileParked =
          consentChoice === "cancelled" &&
          (abortController.signal.aborted || settledUnanswered || answeredOverBridge) &&
          !signal.aborted;
      }
      let consentRecorded =
        consentChoice === "consent" &&
        (await recordCreditsOnlyConsent(attemptModel, toolUseContext.storageV5, toolUseContext.credentials, {
          sessionOnly: answeredOverBridge,
        }));
      if (!consentRecorded && toolUseContext.abortController.signal.aborted) {
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
      if (cancelledWhileParked) {
        if (answeredOverBridge) logFeatureSad("model_fable_consent", "remote_cancelled");
        else
          logFeatureBad(
            "model_fable_consent",
            dialogQueuedAtPark ? "dialog_queued_at_park" : "dialog_unanswered",
          );
        let followUpHint = answeredOverBridge
          ? "was closed from Remote Control without a choice \u2014 nothing was sent \xB7 it asks again on your next message, or /model to change"
          : "went unanswered \u2014 nothing was sent \xB7 answer it where this session is running, or /model to change";
        let modelName = renderUsageCreditsOnlyModelName(attemptModel);
        let apiErrorMessage = createApiErrorMessage({
          content:
            isUsageCreditsModelBilled(attemptModel) || !isFableFamilyOrPinnedModel(attemptModel)
              ? `${modelName} now uses usage credits \xB7 the prompt to confirm ${followUpHint}`
              : `Fable limit reached \xB7 continuing on ${modelName} uses usage credits, and the prompt to confirm ${followUpHint}`,
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
      if (canPromptUser && (isSdkDialogHostActive() || answeredOverBridge))
        if (consentRecorded) logFeatureOk("model_fable_consent");
        else if (consentChoice === "consent") logFeatureSad("model_fable_consent", "overage_enable_deferred");
        else if (consentChoice === "switch_default") logFeatureBad("model_fable_consent", "declined");
        else logFeatureSad("model_fable_consent", "dismissed");
      if (!consentRecorded) {
        if (!canPromptUser && isMainThread) logFeatureSad("model_fable_consent", "no_dialog_fallback");
        let newModel = getUsageCreditsOnlyModelConsentDeclineFallback();
        if (newModel === null) {
          let fallbackDisabled = isNoModelFallbackEnabled();
          if (isMainThread)
            logFeatureBad(
              "model_fable_consent",
              fallbackDisabled ? "no_model_fallback_env" : "no_allowed_fallback",
            );
          let apiErrorMessage = createApiErrorMessage({
            content: fallbackDisabled
              ? "CLAUDE_CODE_NO_MODEL_FALLBACK is set: model substitution is disabled \xB7 unset it to allow the swap"
              : `Your model policy only allows ${renderUsageCreditsOnlyModelName(attemptModel)}, which requires usage credits \xB7 /model to set it up`,
            apiError: fallbackDisabled ? "model_substitution_disabled" : "no_allowed_fallback",
            now: deps.now,
            uuid: deps.uuid,
          });
          yield apiErrorMessage;
          markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
          return {
            reason: "model_error",
            error: fallbackDisabled
              ? Error("CLAUDE_CODE_NO_MODEL_FALLBACK forbids model substitution")
              : Error(
                  "Usage-credits-only model consent declined and the model policy allows no other fallback",
                ),
          };
        }
        let model = attemptModel;
        let persistedAsDefault = false;
        if (isMainThread) {
          if (consentChoice === "switch_default" && !answeredOverBridge)
            persistedAsDefault = switchDefaultFromCreditsOnlyModel(model, newModel, toolUseContext.storageV5);
          toolUseContext.setAppState((appStateAfterSwitch) => ({
            ...appStateAfterSwitch,
            mainLoopModel: newModel,
            mainLoopModelForSession: null,
          }));
          setMainLoopModelOverride(newModel);
          config = mainLoopModelOverride();
          try {
            let fastMode = toolUseContext.getAppState().fastMode;
            let fastModeForNewModel = isFastModeEnabled() ? isFastModeActive(newModel, fastMode) : !!fastMode;
            if (fastModeForNewModel !== !!fastMode) {
              toolUseContext.setAppState((appState) => ({
                ...appState,
                fastMode: fastModeForNewModel,
              }));
              reportFastModeToggle(fastMode, fastModeForNewModel);
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
            content: `Switched to ${renderModelName(newModel)} ${persistedAsDefault ? "\u2014 now your default model" : "for this session"} \xB7 ${renderModelName(model)} requires usage credits \xB7 /model to change`,
            level: "warning",
            choice: consentChoice,
            originalModel: model,
            originalModelName: renderUsageCreditsOnlyModelName(model),
            fallbackModel: newModel,
            persistedAsDefault,
            isMeta: false,
            timestamp: deps.now(),
            uuid: deps.uuid(),
          };
      }
    }
    queryCheckpoint("query_setup_end");
    if (isTopLevelMainThread) endProfilePhase("query_setup");
    let dumpPromptsFetch =
      queryConfig.gates.isAnt && classifyQuerySource(querySource) !== "auxiliary"
        ? createDumpPromptsFetch(toolUseContext.agentId ?? queryConfig.sessionId, toolUseContext.storageV5)
        : undefined;
    let fetchOverride = dumpPromptsFetch;
    let isMainAgentThread = classifyQuerySource(querySource) === "main" && !toolUseContext.agentId;
    if (teleportFetchModule && (isMainAgentThread || relayFork))
      try {
        let messagesForUuids = isMainAgentThread ? messages : messagesForQuery;
        let uuids = isMainAgentThread ? turnSnapshot?.uuids : undefined;
        fetchOverride = teleportFetchModule.composeTeleportFetchOverride(
          dumpPromptsFetch,
          () => uuids ?? messagesForUuids.map((message) => message.uuid),
          isMainAgentThread ? "main" : "fork",
          messagesForUuids,
        );
      } catch (error) {
        logError(error);
      }
    let autoCompactCandidate = isAutoCompactEnabled() && canCompactInRemote();
    let autoCompactUsable =
      autoCompactCandidate &&
      (!hasExplicitWindow(attemptModelFacts, toolUseContext.options.autoCompactWindow) ||
        usesLongContextWindow(querySource, attemptModelFacts, toolUseContext.options.autoCompactWindow));
    if (
      autocompactOutcome.kind !== "compacted" &&
      querySource !== "compact" &&
      !autoCompactUsable &&
      !toolUseContext.abortController.signal.aborted
    ) {
      let contextTokens =
        estimateTokensWithAnchor(messagesForQuery, attemptModelFacts.bytesPerToken) - snipTokensFreed;
      if (
        calculateTokenWarningState(contextTokens, attemptModelFacts, toolUseContext.options.autoCompactWindow)
          .level === "blocked"
      ) {
        let isCompactSource = isCompactQuerySource(querySource);
        let compactFailure =
          autocompactOutcome.kind === "failed" ? autocompactOutcome.compactFailure : undefined;
        let compactCheck = isCompactSource
          ? {}
          : compactCheckFacts({
              outcome: autocompactOutcome,
              compactionCheckFacts,
              blockingCheck: {
                tokenCount: contextTokens,
                facts: attemptModelFacts,
              },
              configuredWindow: toolUseContext.options.autoCompactWindow,
            });
        if (
          !isCompactSource &&
          autoCompactCandidate &&
          (shouldBypassPtlPreempt(
            attemptModelFacts,
            toolUseContext.options.autoCompactWindow,
            querySource,
            compactFailure,
          ) ||
            isCompactNotNeededAtLimit(autocompactOutcome, attemptModelFacts, compactCheck))
        );
        else {
          if (!isCompactSource)
            logEvent("tengu_ptl_surfaced_to_user", {
              reason: lit("blocking_limit"),
              querySource: agentTypeForTelemetry(querySource),
              wasGatedByPriorAttempt: false,
              reactiveUnsupported: !canCompactInRemote(),
              compactFailureReason: fromEnumOpt(compactFailure?.reason),
              ...compactCheck,
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
    let stitchSalvageText;
    let stitchBegan = false;
    let salvageUserMessage;
    let fallbackCreditCode;
    let creditMintModel;
    let creditMintRequestId;
    let creditDeliveryState = {
      mintedStateless: false,
      delivery: undefined,
    };
    let stampFromModel;
    let stampCategory;
    let stampTrigger;
    let stampOriginalRequestId;
    let refusalCascadeState = INITIAL_REJECTION_EPISODE;
    let provisionalRefusalNotice;
    function buildRefusalFallbackNotice(notice, uuid, isProvisional) {
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
        ...(isProvisional && {
          provisional: isProvisional,
        }),
      };
    }
    let activeMcpServer = isMainOrSubagent ? toolUseContext.options.activeMcpServer : undefined;
    let activeMcpTool = isMainOrSubagent ? toolUseContext.options.activeMcpTool : undefined;
    clearActiveMcpContext(toolUseContext.options, isMainOrSubagent);
    queryCheckpoint("query_api_loop_start");
    classifierAbortGuard?.disarm();
    try {
      while (needsAttempt) {
        needsAttempt = false;
        if (resumeActive && (salvageUserMessage !== undefined || !canResumeThinking(attemptModel)))
          resumeActive = false;
        let advisorForAttempt =
          advisorModel !== undefined &&
          (isSameModelFamilyId(attemptModel, configuredRuntimeModel) ||
            canAdviseModelLenient(attemptModel, advisorModel))
            ? advisorModel
            : undefined;
        if (advisorModel !== undefined && advisorForAttempt === undefined)
          logForDebugging(
            `[AdvisorTool] Skipping advisor - ${advisorModel} cannot advise non-configured attempt model ${attemptModel} (configured: ${configuredRuntimeModel}) \u2014 dropped for this attempt`,
          );
        if (pendingSupersedeUuids !== undefined)
          if (supersedeHoldRound) {
            pendingSupersedeUuids = undefined;
            supersedeHoldRound = false;
          } else supersedeHoldRound = true;
        let accessFallbackModel = nextFallbackModel_2(modelChain, chainIndex, attemptModel);
        let assistantCountBefore = assistantMessages.length;
        let midStreamUuids;
        let fallbackSystemMessage;
        let retractedMessages = [];
        let stitchPlan;
        let stitchOpen = false;
        function* sweepMidStreamMessages() {
          let uuidSet = midStreamUuids;
          if (uuidSet === undefined) return 0;
          let swept = [];
          for (let idx = assistantMessages.length - 1; idx >= 0; idx--)
            if (uuidSet.has(assistantMessages[idx].uuid)) {
              swept.unshift(assistantMessages[idx]);
              assistantMessages.splice(idx, 1);
            }
          retractedMessages.push(...swept);
          for (let message of swept)
            yield {
              type: "tombstone",
              message,
            };
          return swept.length;
        }
        function* flushProvisionalNotice() {
          let provisionalFlushUuid = deps.uuid();
          let { notice, state } = takePendingNotice(refusalCascadeState, provisionalFlushUuid);
          refusalCascadeState = state;
          if (notice === undefined) return;
          let refusalFallbackNotice = buildRefusalFallbackNotice(notice, provisionalFlushUuid, true);
          provisionalRefusalNotice = refusalFallbackNotice;
          yield refusalFallbackNotice;
        }
        function* emitFallbackNotice() {
          let { notice, state } = takeFallbackNotice(refusalCascadeState);
          refusalCascadeState = state;
          provisionalRefusalNotice = undefined;
          if (notice === undefined) return;
          yield buildRefusalFallbackNotice(notice, deps.uuid());
        }
        function* flushRefusalNotice() {
          let notice = fallbackSystemMessage;
          if (notice === undefined) return;
          if (retractedMessages.length > 0)
            notice.retractedMessageUuids = retractedMessages.flatMap((message) =>
              normalizeMessages([message])
                .filter(isNotEmptyMessage)
                .map((content) => content.uuid),
            );
          notice.refusedUserMessageUuid = refusedUserMessageUuid;
          yield notice;
          fallbackSystemMessage = undefined;
        }
        let attemptError;
        let fallbackError;
        e: try {
          let messageRewrites = [];
          let earlyAttachments = [];
          let takePlainDelta = params.takePlainDelta;
          let cascadeStage = nextFallbackStage(refusalCascadeState, attemptModel, refusalCascadeResolver);
          refusalCascadeState = cascadeStage.state;
          let latchedFallbackModel =
            !retryRefusal && cascadeStage.armTarget === undefined
              ? resolveLatchedFallbackModel(attemptModel)
              : undefined;
          let modelBeforeFallback = attemptModel;
          let silentRearmState = {};
          let refusalFallbackSilentRearm =
            !retryRefusal && !silentArmSpent && !refusalFallbackDeclined
              ? (visibleRouteDeclined, apiRefusalCategory, responseSwapped) => {
                  if (silentArmSpent || refusalFallbackDeclined) return;
                  let latchedFallbackModel = resolveLatchedFallbackModel(modelBeforeFallback, {
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
                    silentRearmState.counts = {
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
          let hasRefusalDialog = canShowRefusalDialog();
          let capabilitySource = fromEnum(getSdkDialogCapabilitySource());
          let bridgeDialog = refusalFallbackDialog(toolUseContext.permissionRelays?.bridge?.dialog, () =>
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_loggia_denkbild", false),
          );
          let bridgeWithoutDialog =
            toolUseContext.getAppState().replBridgeSessionActive && bridgeDialog === undefined;
          let consumerLacksDialogCapability = hasRefusalDialog || bridgeWithoutDialog;
          let currentModel = shouldAskRefusalFallbackPreference({
            toolUseContext,
            isMainThread,
          });
          let refusalFallback = !retryRefusal
            ? resolveRefusalFallback({
                currentModel: attemptModel,
                compiledTablesOnly: isAutoModeQuerySource(querySource),
                alreadyUsed:
                  cascadeStage.armTarget === undefined && atLeast(refusalFallbacksUsed, refusalRouteLimit()),
                declined: refusalFallbackDeclined,
                inCascadeEpisode: refusalCascadeState.inEpisode,
                cascadeNext: cascadeStage.armTarget,
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
            : NO_SUPPRESSION;
          if (refusalFallback.shouldLogSuppression) {
            suppressionAlreadyLogged = true;
            logEvent("tengu_refusal_fallback_suppressed", {
              reason:
                toolUseContext.requestDialog === undefined
                  ? lit("no_dialog_host_setting_off")
                  : hasRefusalDialog
                    ? lit("no_consumer_capability_setting_off")
                    : lit("remote_controlled_session_setting_off"),
              capability_source: capabilitySource,
            });
          }
          let serverLane = refusalFallback.serverLane;
          let visibleModel = serverLane === undefined ? refusalFallback.visibleModel : undefined;
          let silentArmModel = silentArmSpent ? undefined : latchedFallbackModel;
          let creditCode = fallbackCreditCode;
          fallbackCreditCode = undefined;
          let creditModel = creditMintModel;
          creditMintModel = undefined;
          let fallbackCreditMintRequestId = creditMintRequestId;
          creditMintRequestId = undefined;
          let mintedStateless = creditCode !== undefined && creditDeliveryState.mintedStateless;
          creditDeliveryState.mintedStateless = false;
          let deliveryOverride = mintedStateless ? creditDeliveryState.delivery : undefined;
          creditDeliveryState.delivery = undefined;
          let stampModel = stampFromModel;
          stampFromModel = undefined;
          let fallbackStampCategory = stampCategory;
          stampCategory = undefined;
          let fallbackStampTrigger = stampTrigger;
          stampTrigger = undefined;
          let refusalFallbackSilentArmActive =
            !refusalFallbackDeclined &&
            latchedFallbackModel !== undefined &&
            visibleModel === undefined &&
            serverLane === undefined &&
            creditCode === undefined;
          if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
          queryCheckpoint("query_api_streaming_start");
          let reminderModel = creditModel ?? attemptModel;
          let baselineDelivery = {
            messages: messagesForQuery,
            text: null,
            secondaryText: null,
            afterUuid: null,
          };
          let deliveryDecision =
            salvageUserMessage !== undefined
              ? EMPTY_ANNOUNCEMENT
              : decideReminderDelivery({
                  querySource,
                  agentId: toolUseContext.agentId,
                  model: attemptModel,
                  reminderModel,
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
          if (salvageUserMessage !== undefined)
            reminderDelivery = {
              ...baselineDelivery,
              messages: [...messagesForQuery, salvageUserMessage],
            };
          else if (deliveryDecision.delivery === "kept") {
            for (let record of deliveryDecision.records) {
              yield record;
              messagesForQuery = [...messagesForQuery, record];
            }
            reminderDelivery = {
              ...baselineDelivery,
              messages: messagesForQuery,
            };
          } else if (deliveryDecision.delivery === "none") reminderDelivery = baselineDelivery;
          else
            reminderDelivery = placeBatchingReminder(messagesForQuery, toolUseContext.session, reminderModel);
          for (let [reminderKind, reminderText] of [
            ["batching_reminder_sent", reminderDelivery.text],
            ["secondary_reminder_sent", reminderDelivery.secondaryText],
          ]) {
            let previousReminder = sentReminderTexts.get(reminderKind);
            if (
              reminderText === null ||
              reminderDelivery.afterUuid === null ||
              (previousReminder?.afterUuid === reminderDelivery.afterUuid &&
                previousReminder.text === reminderText &&
                previousReminder.model === reminderModel)
            )
              continue;
            sentReminderTexts.set(reminderKind, {
              afterUuid: reminderDelivery.afterUuid,
              text: reminderText,
              model: reminderModel,
            });
            let attachmentMessage = createAttachmentMessage_2(
              {
                type: reminderKind,
                text: reminderText,
                model: reminderModel,
              },
              deps,
            );
            yield attachmentMessage;
            messagesForQuery = [...messagesForQuery, attachmentMessage];
          }
          let showAutoModeWait = isTopLevelMainThread && autoModeContextPromise !== undefined;
          if (showAutoModeWait) startProfilePhase("auto_mode_context_wait");
          let autoModeServerContext = await refreshGitStateSafe(autoModeContextPromise);
          if (showAutoModeWait) endProfilePhase("auto_mode_context_wait");
          deferredToolsSent = undefined;
          toolInputCopiesSent = undefined;
          let deferredRecordAppended = false;
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
          let callModelFn = callModel;
          for await (let event of drainToolResults(
            callModelFn({
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
                onInlineToolsDeclared: (inlineToolNames) => {
                  inlineToolsDeclared = inlineToolNames;
                },
                onPromptHeadSent: (promptHeadValue) => {
                  promptHeadSent = promptHeadValue;
                },
                recordedDeferredTools: () => recordedDeferredTools(messagesForQuery),
                onDeferredToolsSent: (sentDeferredTools) => {
                  deferredToolsSent = sentDeferredTools;
                },
                onToolInputCopiesSent: (sentToolInputCopies) => {
                  toolInputCopiesSent = sentToolInputCopies;
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
                accessFallbackModel,
                refusalFallbackModel: !refusalFallbackDeclined ? (visibleModel ?? silentArmModel) : undefined,
                refusalFallbackModelLane: !refusalFallbackDeclined
                  ? visibleModel !== undefined
                    ? "visible"
                    : silentArmModel !== undefined
                      ? "silent"
                      : undefined
                  : undefined,
                refusalFallbackCascadeHop: visibleModel !== undefined ? cascadeStage.hop : undefined,
                refusalFallbackSilentArmActive,
                refusalFallbackSilentRearm,
                serverRefusalFallback: serverLane,
                fallbackCreditCode: creditCode,
                autoModeServerContext,
                ...(autoModeServerContext !== undefined &&
                  (isClassifierRoleOn(toolUseContext) ||
                    autoModeServerContext.judgeOnlyTools !== undefined) && {
                    serverClassifier: true,
                  }),
                fallbackCreditMintModel: creditModel,
                fallbackCreditMintRequestId,
                fallbackCreditMintedStateless: mintedStateless,
                fallbackStampFromModel: stampModel,
                fallbackStampCategory,
                fallbackStampTrigger,
                fallbackStampOriginalRequestId: stampModel !== undefined ? stampOriginalRequestId : undefined,
                fallbackCreditLaneArmed: refusalFallback.visibleModel !== undefined,
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
                advisorModel: advisorForAttempt,
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
              : guardGoalCheck("query", () => earlyAttachments.length === 0, takePlainDelta),
          )) {
            if (event.type === "tool_drain_tick") {
              yield* drainCompletedToolResults();
              continue;
            }
            if (event.type === "model_fallback_triggered") {
              fallbackError = event.error;
              break e;
            }
            if (!deferredRecordAppended && event.type === "assistant" && !event.isApiErrorMessage) {
              deferredRecordAppended = true;
              if (!resumeActive) {
                let deferredToolsRecordMessage = appendDeferredToolsRecord();
                if (deferredToolsRecordMessage) yield deferredToolsRecordMessage;
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
              let clearedIds = new Set(event.ids);
              for (let message of hasMemoryFileRead_2(messagesForQuery, clearedIds)) {
                let expandedPath = expandPathOrNull(message);
                if (expandedPath === null) {
                  logForDebugging(
                    "hint_clears: a cleared Read has a file_path that cannot be expanded (null byte in it or in the working directory); leaving readFileState as is",
                  );
                  continue;
                }
                toolUseContext.readFileState.delete(expandedPath);
              }
              messagesForQuery = replaceToolResultContent(
                messagesForQuery,
                clearedIds,
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
              let serverFallback = describeServerFallback(event, {
                isMainThread,
                emitsLocalScope,
              });
              logEvent("tengu_rotunda_pennant_applied", {
                reason: fromEnum(serverFallback.telemetry.reason),
                entitlement_blind: isEntitlementOverlayUnavailable(),
                armed_mode: fromEnum(serverLane?.mode ?? "none"),
                mid_stream: serverFallback.telemetry.midStream,
                discarded_block_count: serverFallback.telemetry.discardedBlockCount,
                tombstoned_had_tool_use: serverFallback.telemetry.tombstonedHadToolUse,
                request_id_sha12:
                  serverFallback.telemetry.requestId !== null
                    ? shortHash(serverFallback.telemetry.requestId)
                    : undefined,
                original_model_scope: fromEnum(serverFallback.telemetry.originalModelScope),
                queryChainId: queryChainIdForAnalytics,
                queryDepth: queryTracking.depth,
                querySource: agentTypeForTelemetry(querySource),
                final_stop_reason: fromEnumOpt(serverFallback.telemetry.finalStopReason ?? undefined),
                api_refusal_category: fromEnumOpt(serverFallback.telemetry.apiRefusalCategory),
                ...refusedEffortTelemetryFields(event.refusedEffort),
              });
              if (serverFallback.userVisible) {
                logFeatureOk("refusal_fallback");
                let fromModel = attemptModel;
                let fallbackTarget = preferSameModel(serverLane?.model, event.toModel);
                let sameAsAttempt = attemptModel === fallbackTarget;
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
                  let discarded = [];
                  for (let discardedMessage of event.discardedMessages) {
                    let index = assistantMessages.findIndex(
                      (assistantMessage) => assistantMessage.uuid === discardedMessage.uuid,
                    );
                    if (index !== -1) assistantMessages.splice(index, 1);
                    discarded.push(discardedMessage);
                  }
                  for (let idx = assistantMessages.length - 1; idx >= 0; idx--) {
                    let candidateMessage = assistantMessages[idx];
                    if (candidateMessage.message.model === event.toModel) {
                      assistantMessages.splice(idx, 1);
                      discarded.push(candidateMessage);
                    }
                  }
                  let sliced = toolResults.slice();
                  attemptState.reset({
                    clearAssistantMessages: false,
                  });
                  messageRewrites.length = 0;
                  let abortedTools = attemptState.streamingToolExecutor.discardAndAbortInFlight(
                    serverFallbackTombstoneAbortReason(),
                  );
                  logEvent("tengu_rotunda_pennant_tools", {
                    lane: lit("decline"),
                    aborted: abortedTools.aborted,
                    completed_before_event: abortedTools.completedBeforeEvent,
                    queued_never_started: abortedTools.queuedNeverStarted,
                    compensated_removes: abortedTools.toolUseIds.length,
                  });
                  attemptState.rebuildStreamingToolExecutor();
                  for (let message of discarded)
                    yield {
                      type: "tombstone",
                      message,
                    };
                  for (let message of sliced)
                    yield {
                      type: "tombstone",
                      message,
                    };
                  if (abortedTools.toolUseIds.length > 0)
                    yield {
                      type: "set_in_progress_tool_use_ids",
                      op: {
                        action: "remove",
                        ids: abortedTools.toolUseIds,
                      },
                    };
                  let discardNotice =
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
                  if (discardNotice) {
                    await transcriptTap.appended(discardNotice);
                    assistantMessages.push(discardNotice);
                    yield discardNotice;
                  }
                  break;
                }
                refusalFallbacksUsed += 1;
                let refusalFallbackEffort = resolveRefusalFallbackEffort({
                  refusedEffort: event.refusedEffort,
                  fallbackModel: fallbackTarget,
                  heldBySession:
                    serverFallback.swapSession && isMainConversationContext(toolUseContext.agentContext),
                  loopOverride: refusalOverride,
                  loopEffort,
                });
                refusalOverride = fallbackTarget;
                loopEffort = refusalFallbackEffort.loopEffort;
                setAttemptModel(fallbackTarget);
                if (resumeActive && !canResumeThinking(fallbackTarget)) resumeActive = false;
                if (serverFallback.swapSession) {
                  if (event.reason === "refusal" && event.apiRefusalCategory === "cyber")
                    markRefusalFallbackHeaderArmed(event.requestId ?? undefined);
                  let appState = toolUseContext.getAppState();
                  latchRefusalFallbackModel({
                    fallbackModel: fallbackTarget,
                    previousOverride: getMainLoopModelOverride(),
                    previousAppStateModel: appState.mainLoopModel,
                    previousModelForSession: appState.mainLoopModelForSession,
                    carriedEffort: refusalFallbackEffort.latchEffort,
                  });
                  let fastModeActive = isFastModeEnabled()
                    ? isFastModeActive(fallbackTarget, appState.fastMode)
                    : !!appState.fastMode;
                  toolUseContext.setAppState((bridgeAppState) => ({
                    ...bridgeAppState,
                    mainLoopModel: fallbackTarget,
                    mainLoopModelForSession: null,
                    fastMode: fastModeActive,
                  }));
                  setMainLoopModelOverride(fallbackTarget);
                  config = mainLoopModelOverride();
                  toolUseContext.options.mainLoopModel = fallbackTarget;
                  toolUseContext.options.availabilityFallback = undefined;
                  reportFastModeToggle(appState.fastMode, fastModeActive);
                }
                let discardedUuids = new Set(
                  event.discardedMessages.map((discardedMessage) => discardedMessage.uuid),
                );
                if (discardedUuids.size > 0) {
                  for (let idx = assistantMessages.length - 1; idx >= 0; idx--)
                    if (discardedUuids.has(assistantMessages[idx].uuid)) assistantMessages.splice(idx, 1);
                }
                let tombstonedToolResults = [];
                if (serverFallback.tombstonedToolUse) {
                  let abortedForSweep = attemptState.streamingToolExecutor.discardAndAbortInFlight(
                    serverFallbackTombstoneAbortReason(),
                  );
                  logEvent("tengu_rotunda_pennant_tools", {
                    lane: lit("accept"),
                    aborted: abortedForSweep.aborted,
                    completed_before_event: abortedForSweep.completedBeforeEvent,
                    queued_never_started: abortedForSweep.queuedNeverStarted,
                    compensated_removes: abortedForSweep.toolUseIds.length,
                  });
                  tombstonedToolResults = [...toolResults];
                  attemptState.reset({
                    clearAssistantMessages: false,
                  });
                  attemptState.rebuildStreamingToolExecutor();
                  if (abortedForSweep.toolUseIds.length > 0)
                    yield {
                      type: "set_in_progress_tool_use_ids",
                      op: {
                        action: "remove",
                        ids: abortedForSweep.toolUseIds,
                      },
                      reason: "fallback_sweep",
                    };
                }
                if (event.midStream) {
                  midStreamUuids = new Set(
                    assistantMessages
                      .slice(assistantCountBefore)
                      .map((assistantMessage) => assistantMessage.uuid),
                  );
                  let retainedText = event.retainedText;
                  if (
                    retainedText !== undefined &&
                    retainedText.length > 0 &&
                    stitchSalvageText === undefined
                  )
                    stitchPlan = {
                      text: retainedText,
                      originals: event.retainedMessages ?? [],
                    };
                  else if (
                    retainedText !== undefined &&
                    retainedText.length > 0 &&
                    stitchSalvageText !== undefined
                  )
                    logForDebugging(
                      "server_fallback: silent stitch already pending \u2014 skipping seam merge",
                      {
                        level: "warn",
                      },
                    );
                }
                retractedMessages.push(...event.discardedMessages, ...tombstonedToolResults);
                yield {
                  type: "query_model_change",
                  toModel: fallbackTarget,
                };
                for (let message of event.discardedMessages)
                  yield {
                    type: "tombstone",
                    message,
                    displayOnly: true,
                  };
                for (let msg of tombstonedToolResults)
                  yield {
                    type: "tombstone",
                    message: msg,
                    displayOnly: true,
                  };
                if (stitchPlan !== undefined) {
                  stitchOpen = true;
                  yield {
                    type: "refusal_continuation",
                    phase: "begin",
                    salvageText: stitchPlan.text,
                    join: "exact",
                    replacesUuids: stitchPlan.originals.map((original) => original.uuid),
                  };
                }
                if (serverFallback.showBanner && !sameAsAttempt)
                  fallbackSystemMessage = buildRefusalFallbackSystemMessage(
                    {
                      ...event,
                      fromModel,
                      toModel: fallbackTarget,
                    },
                    {
                      timestamp: deps.now(),
                      uuid: deps.uuid(),
                    },
                    serverFallback.bannerScope,
                  );
              }
              continue;
            }
            if (event.type === "refusal_no_fallback") {
              if (retryRefusal) {
                refusalNoFallbackEvent = event;
                continue;
              }
              if (fallbackSystemMessage !== undefined) {
                let sweptDanglingCount = yield* sweepMidStreamMessages();
                if (stitchOpen) {
                  stitchOpen = false;
                  stitchPlan = undefined;
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
                yield* flushRefusalNotice();
              }
              yield* emitFallbackNotice();
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
              let silentRetry =
                event.routeMatched == null &&
                (latchedFallbackModel !== undefined || event.silentArmAtTrigger === true);
              let episodeContinuation = refusalCascadeState.inEpisode && isChainRouteMatch(event);
              if (
                !(silentRetry
                  ? silentArmSpent
                  : !episodeContinuation && atLeast(refusalFallbacksUsed, refusalRouteLimit())) &&
                !refusalFallbackDeclined &&
                (isRefusalFallbackEnabled() || silentRetry)
              ) {
                let dialogSkipReason = episodeContinuation
                  ? "episode_continuation"
                  : getFallbackDialogSkipReason({
                      requestDialog: toolUseContext.requestDialog,
                      isMainThread,
                      silentAttempt: silentRetry,
                      consumerLacksDialogCapability,
                    });
                let telemetryBase = {
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
                let flattened = [...assistantMessages, ...toolResults].flatMap((message) =>
                  normalizeMessages([message])
                    .filter(isNotEmptyMessage)
                    .map((content) => content.uuid),
                );
                let lacksConsumerCapability = dialogSkipReason === "no_consumer_capability";
                if (lacksConsumerCapability)
                  logEvent("tengu_refusal_fallback_dialog_suppressed", {
                    ...telemetryBase,
                    reason: hasRefusalDialog
                      ? lit("no_consumer_capability")
                      : lit("remote_controlled_session"),
                    capability_source: capabilitySource,
                    retracted_wire_uuid_count: flattened.length,
                  });
                let choice = lacksConsumerCapability ? "cancelled" : "retry_fallback";
                let askPreference = currentModel && !episodeContinuation && !silentRetry;
                if (askPreference)
                  choice = await askRefusalFallbackPreference({
                    canUseTool,
                    toolUseContext,
                    originalModel: event.originalModel,
                    fallbackModel: event.fallbackModel,
                    apiRefusalCategory: event.apiRefusalCategory,
                    telemetry: telemetryBase,
                  });
                else if (dialogSkipReason === undefined && toolUseContext.requestDialog)
                  choice = await requestRefusalFallbackChoice({
                    requestDialog: toolUseContext.requestDialog,
                    signal: toolUseContext.abortController.signal,
                    bridgeDialog,
                    hasQueuedPrompts: () =>
                      toolUseContext.messageQueue.peek(isPromptModeQueuedCommand) !== undefined,
                    payload: {
                      originalModel: event.originalModel,
                      fallbackModel: event.fallbackModel,
                      apiRefusalCategory: event.apiRefusalCategory,
                      retractedMessageUuids: flattened,
                      guidanceText: getThirdPartyFallbackHint(),
                    },
                    telemetry: telemetryBase,
                    shownExtras: {
                      capability_source: capabilitySource,
                      retracted_wire_uuid_count: flattened.length,
                    },
                  });
                if (choice !== "retry_fallback") {
                  refusalFallbackDeclined = true;
                  if (event.creditCode !== null)
                    logEvent("tengu_fallback_credit_forfeited", {
                      reason:
                        choice === "cancelled"
                          ? lit("cancelled")
                          : askPreference
                            ? lit("preference_question_paused")
                            : lit("dialog_declined"),
                      mint_request_id: sanitizeMarkName(event.requestId),
                      mint_model: telemetrySafeModelName(attemptModel),
                    });
                  yield* attemptState.abandonAttempt("refusal_decline");
                  messageRewrites.length = 0;
                  if (choice === "edit_prompt")
                    toolUseContext.abortController.abort(userAbortReason("refusal-fallback-edit"));
                  if (choice === "cancelled" && !toolUseContext.abortController.signal.aborted) {
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
                let partial = assessPartialResponse(assistantMessages);
                let canSurface =
                  querySource.startsWith("repl_main_thread") &&
                  !toolUseContext.options.isNonInteractiveSession;
                let alreadyLatched = hasRefusalFallbackOccurred();
                let skipContinuationReason = !canSurface
                  ? "surface"
                  : alreadyLatched
                    ? "session_latch"
                    : partial.skipReason;
                let salvageText =
                  silentRetry && skipContinuationReason === undefined ? partial.salvageText : undefined;
                if (silentRetry) silentArmSpent = true;
                else {
                  if (!episodeContinuation) refusalFallbacksUsed += 1;
                  refusalCascadeState = recordFallbackAttempt(
                    refusalCascadeState,
                    event,
                    getSwitchModelsOnFlagSetting(),
                    canonicalModelKey,
                  );
                }
                let carriedEffort = silentRetry
                  ? undefined
                  : resolveRefusalFallbackEffort({
                      refusedEffort: event.refusedEffort,
                      fallbackModel: event.fallbackModel,
                      heldBySession: isMainThread && isMainConversationContext(toolUseContext.agentContext),
                      loopOverride: refusalOverride,
                      loopEffort,
                    });
                refusalOverride = event.fallbackModel;
                if (carriedEffort !== undefined) loopEffort = carriedEffort.loopEffort;
                fallbackCreditCode = silentRetry ? undefined : (event.creditCode ?? undefined);
                creditMintModel = fallbackCreditCode !== undefined ? attemptModel : undefined;
                creditMintRequestId =
                  fallbackCreditCode !== undefined ? (event.requestId ?? undefined) : undefined;
                creditDeliveryState.mintedStateless =
                  fallbackCreditCode !== undefined && event.mintedStateless;
                creditDeliveryState.delivery =
                  fallbackCreditCode !== undefined && salvageUserMessage === undefined
                    ? deliveryDecision.delivery
                    : undefined;
                stampFromModel = event.originalModel;
                stampCategory = event.apiRefusalCategory ?? undefined;
                stampTrigger = event.trigger;
                stampOriginalRequestId ??= event.requestId ?? undefined;
                if (silentRetry) markRefusalFallbackOccurred(event.requestId ?? undefined);
                else if (isMainThread && event.apiRefusalCategory === "cyber")
                  markRefusalFallbackHeaderArmed(event.requestId ?? undefined);
                setAttemptModel(event.fallbackModel);
                needsAttempt = true;
                pendingSupersedeUuids =
                  isMainThread && !silentRetry && flattened.length > 0 ? flattened : undefined;
                supersedeHoldRound = false;
                if (isMainThread && !silentRetry) {
                  let appState = toolUseContext.getAppState();
                  latchRefusalFallbackModel({
                    fallbackModel: event.fallbackModel,
                    previousOverride: getMainLoopModelOverride(),
                    previousAppStateModel: appState.mainLoopModel,
                    previousModelForSession: appState.mainLoopModelForSession,
                    carriedEffort: carriedEffort?.latchEffort,
                  });
                  let nextFastModeActive = isFastModeEnabled()
                    ? isFastModeActive(event.fallbackModel, appState.fastMode)
                    : !!appState.fastMode;
                  toolUseContext.setAppState((retryAppState) => ({
                    ...retryAppState,
                    mainLoopModel: event.fallbackModel,
                    mainLoopModelForSession: null,
                    fastMode: nextFastModeActive,
                  }));
                  setMainLoopModelOverride(event.fallbackModel);
                  config = mainLoopModelOverride();
                  toolUseContext.options.mainLoopModel = event.fallbackModel;
                  toolUseContext.options.availabilityFallback = undefined;
                  reportFastModeToggle(appState.fastMode, nextFastModeActive);
                }
                if (silentRetry)
                  logEvent("tengu_convolute_arcades_retry", {
                    request_id: sanitizeMarkName(event.requestId),
                    queryChainId: queryChainIdForAnalytics,
                    queryDepth: queryTracking.depth,
                    querySource: agentTypeForTelemetry(querySource),
                    continuation: salvageText !== undefined,
                    ...(skipContinuationReason !== undefined && {
                      continuation_skip_reason: fromEnum(skipContinuationReason),
                    }),
                    had_partial_text: partial.partialTextChars > 0,
                    partial_text_chars: partial.partialTextChars,
                    salvaged_tool_use_count: partial.toolUseCount,
                    had_empty_input_tool_use: partial.hadEmptyInputToolUse,
                    credit_minted: event.creditCode !== null,
                    armed_at_trigger: event.silentArmAtTrigger === true,
                    arm_source: fromEnum(getFallbackLatchKind()),
                  });
                else {
                  logFeatureOk("refusal_fallback");
                  logEvent("tengu_refusal_fallback_triggered", {
                    ...telemetryBase,
                    retracted_wire_uuid_count: flattened.length,
                    prompt_skipped_reason: askPreference
                      ? lit("preference_question")
                      : fromEnumOpt(dialogSkipReason),
                    had_partial_text: partial.partialTextChars > 0,
                    partial_text_chars: partial.partialTextChars,
                    salvaged_tool_use_count: partial.toolUseCount,
                    had_empty_input_tool_use: partial.hadEmptyInputToolUse,
                    credit_minted: event.creditCode !== null,
                    ...refusedEffortTelemetryFields(event.refusedEffort),
                  });
                }
                let stitchWasOpen = stitchBegan;
                if (stitchWasOpen) {
                  stitchBegan = false;
                  stitchSalvageText = undefined;
                  salvageUserMessage = undefined;
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
                if (stitchWasOpen)
                  yield {
                    type: "refusal_continuation",
                    phase: "end",
                  };
                let counts = silentRearmState.counts;
                silentRearmState.counts = undefined;
                yield* attemptState.abandonAttempt("refusal_retry", {
                  silent: silentRetry,
                  ...(counts !== undefined && {
                    earlierCounts: counts,
                  }),
                });
                messageRewrites.length = 0;
                if (salvageText !== undefined) {
                  salvageUserMessage = createUserMessage({
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
                  stitchSalvageText = salvageText;
                  stitchBegan = true;
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
                if (!episodeContinuation) {
                  refusalCascadeState = clearPendingNotice(refusalCascadeState);
                  provisionalRefusalNotice = undefined;
                }
                let noticeEpisodeActive =
                  refusalCascadeState.inEpisode &&
                  (refusalCascadeState.cursor !== undefined || episodeContinuation);
                if (isMainThread && !silentRetry && noticeEpisodeActive)
                  refusalCascadeState = recordFallbackNotice(refusalCascadeState, {
                    originModel: event.originalModel,
                    servingModel: event.fallbackModel,
                    retractedMessageUuids: flattened,
                    refusedUserMessageUuid: refusedUserMessageUuid ?? undefined,
                    apiRefusalCategory: event.apiRefusalCategory ?? null,
                    requestId: event.requestId ?? null,
                  });
                else if (!silentRetry && (isMainThread || emitsLocalScope))
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
              } else if (latchedFallbackModel === undefined) {
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
              messageRewrites.length = 0;
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
            if (
              event.type === "assistant" &&
              event.message.content.some((contentBlock) => contentBlock.type === "tool_use")
            )
              await transcriptTap.appended(event);
            let outgoingEvent = event;
            let rebuiltResponse;
            let stitchedRowPushed = false;
            let pendingTombstones;
            if (event.type === "assistant") {
              let patchedContent;
              for (let idx = 0; idx < event.message.content.length; idx++) {
                let contentBlock = event.message.content[idx];
                if (
                  contentBlock.type === "tool_use" &&
                  typeof contentBlock.input === "object" &&
                  contentBlock.input !== null
                ) {
                  let toolByName = findToolByName(
                    toolUseContext.options.tools,
                    contentBlock.name,
                    toolUseContext.options.toolAliases,
                  );
                  let backfilledInput = backfillObservableInput(
                    toolByName,
                    contentBlock.input,
                    contentBlock.name,
                  );
                  if (backfilledInput) {
                    patchedContent ??= [...event.message.content];
                    patchedContent[idx] = {
                      ...contentBlock,
                      input: backfilledInput,
                    };
                  }
                }
              }
              if (patchedContent) {
                outgoingEvent = {
                  ...event,
                  message: {
                    ...event.message,
                    content: patchedContent,
                  },
                };
                messageRewrites.push({
                  src: event.message,
                  dst: outgoingEvent.message,
                  srcRow: event,
                  dstRow: outgoingEvent,
                });
              }
            }
            if (
              (stitchSalvageText !== undefined || stitchPlan !== undefined) &&
              event.type === "assistant" &&
              !event.isApiErrorMessage
            ) {
              let response = outgoingEvent.type === "assistant" ? outgoingEvent : event;
              let content = response.message.content;
              let index = content.findIndex((block) => block.type === "text");
              let firstTextBlock = index === -1 ? undefined : content[index];
              if (
                firstTextBlock !== undefined &&
                firstTextBlock.type === "text" &&
                firstTextBlock.text.trim().length > 0
              ) {
                let nextContent = [...content];
                nextContent[index] = withCitationsDropped(
                  firstTextBlock,
                  stitchPlan !== undefined
                    ? stitchPlan.text + firstTextBlock.text
                    : stitchContinuation(stitchSalvageText, firstTextBlock.text),
                );
                let { apiBlockIndex, apiBlockIndices, ...responseRest } = response;
                let stitchedResponse = {
                  ...responseRest,
                  message: {
                    ...response.message,
                    content: nextContent,
                  },
                };
                messageRewrites.push({
                  src: event.message,
                  dst: stitchedResponse.message,
                  srcRow: event,
                  dstRow: stitchedResponse,
                });
                if (stitchPlan !== undefined) {
                  let originals = stitchPlan.originals;
                  let originalUuids = new Set(originals.map((original) => original.uuid));
                  for (let idx = assistantMessages.length - 1; idx >= 0; idx--)
                    if (originalUuids.has(assistantMessages[idx].uuid)) assistantMessages.splice(idx, 1);
                  assistantMessages.push(stitchedResponse);
                  stitchedRowPushed = true;
                  pendingTombstones = originals;
                  retractedMessages.push(...originals);
                  if (isMainThread) {
                    stitchedResponse.supersedesUuids = originals.flatMap((original) =>
                      normalizeMessages([original])
                        .filter(isNotEmptyMessage)
                        .map((content) => content.uuid),
                    );
                    logEvent("tengu_refusal_fallback_supersedes", {
                      lane: lit("server_stitch"),
                      count: stitchedResponse.supersedesUuids.length,
                    });
                  }
                  midStreamUuids = new Set([stitchedResponse.uuid]);
                  stitchPlan = undefined;
                } else stitchSalvageText = undefined;
                outgoingEvent = stitchedResponse;
                rebuiltResponse = stitchedResponse;
              }
            }
            if (event.type === "stream_event" && event.event.type === "message_delta") {
              if (typeof event.event.delta.stop_reason === "string")
                lastStopReason = event.event.delta.stop_reason;
              for (let { src, dst } of messageRewrites) {
                dst.usage = src.usage;
                dst.stop_reason = src.stop_reason;
                dst.stop_details = src.stop_details;
                if (src.context_management !== undefined) dst.context_management = src.context_management;
              }
              for (let { srcRow, dstRow } of messageRewrites)
                if (srcRow.isUnmetered !== true) delete dstRow.isUnmetered;
              messageRewrites.length = 0;
            }
            let isWithheld = false;
            if (isPromptTooLongReply(event)) isWithheld = true;
            if (
              !attemptState.needsFollowUp &&
              shouldCompactAfterLongContextRefusal(event, attemptModelFacts, querySource)
            ) {
              isWithheld = true;
              withheldPromptTooLong = event;
            }
            if (isMediaSizeErrorReply(event)) {
              isWithheld = true;
              earlyAttachments.push(event);
            }
            if (isWithheldMaxOutputTokens(event)) isWithheld = true;
            if (retryRefusal && isRefusalErrorMessage(event)) isWithheld = true;
            if (
              !attemptState.needsFollowUp &&
              isRecoverableTruncatedResponse(event, toolUseContext, querySource)
            ) {
              isWithheld = true;
              truncatedResponse = event;
            }
            if (resumeActive && !attemptState.needsFollowUp && isRetryableApiErrorMessage(event))
              isWithheld = true;
            if (
              attemptState.needsFollowUp &&
              event.type === "assistant" &&
              isSafetyMonitorBlockedMessage(event)
            )
              isWithheld = true;
            if (isWithheld && event.type === "assistant") lastWithheldAssistant = event;
            if (!isWithheld) {
              if (earlyAttachments.length > 0) {
                yield* earlyAttachments;
                earlyAttachments.length = 0;
              }
              if (
                refusalCascadeState.pendingNotice !== undefined &&
                outgoingEvent.type === "assistant" &&
                !outgoingEvent.isApiErrorMessage &&
                normalizeMessages([outgoingEvent]).some(isNotEmptyMessage)
              )
                yield* flushProvisionalNotice();
              if (
                pendingSupersedeUuids !== undefined &&
                outgoingEvent.type === "assistant" &&
                !outgoingEvent.isApiErrorMessage &&
                normalizeMessages([outgoingEvent]).some(isNotEmptyMessage)
              ) {
                let supersededUuids = pendingSupersedeUuids;
                pendingSupersedeUuids = undefined;
                supersedeHoldRound = false;
                outgoingEvent = {
                  ...outgoingEvent,
                  supersedesUuids: supersededUuids,
                };
                logEvent("tengu_refusal_fallback_supersedes", {
                  lane: lit("client_retry"),
                  count: supersededUuids.length,
                });
              }
              if (
                outgoingEvent !== event &&
                outgoingEvent.type === "assistant" &&
                event.type === "assistant" &&
                rebuiltResponse === undefined
              )
                transcriptTap.answeredAs(outgoingEvent, event);
              yield outgoingEvent;
            }
            if (event.type === "assistant") {
              if (
                isMainLoop &&
                shouldRecordHarnessText(toolUseContext.agentId, toolUseContext.agentContext) &&
                !event.isApiErrorMessage
              )
                recordTextBlocks(event.message.content);
              let pushedMessage = rebuiltResponse ?? event;
              if (!stitchedRowPushed) assistantMessages.push(pushedMessage);
              let msgToolUseBlocks = pushedMessage.message.content.filter(
                (content) => content.type === "tool_use",
              );
              if (msgToolUseBlocks.length > 0) {
                toolUseBlocks.push(...msgToolUseBlocks);
                attemptState.needsFollowUp = true;
              }
              recordServerToolsUsed(pushedMessage);
              for (let toolBlock of msgToolUseBlocks)
                attemptState.streamingToolExecutor.addTool(toolBlock, pushedMessage);
            }
            if (pendingTombstones !== undefined) {
              let tombstones = pendingTombstones;
              pendingTombstones = undefined;
              for (let message of tombstones)
                yield {
                  type: "tombstone",
                  message,
                  displayOnly: true,
                };
            }
            if (attemptState.streamingToolExecutor.hasUnfinishedTools()) yield* drainCompletedToolResults();
          }
          queryCheckpoint("query_api_streaming_end");
          if (stitchBegan && !needsAttempt) {
            stitchBegan = false;
            let mergedWithoutText = stitchSalvageText === undefined;
            stitchSalvageText = undefined;
            salvageUserMessage = undefined;
            logEvent("tengu_convolute_arcades_retry_outcome", {
              outcome: fromEnum(mergedWithoutText ? "merged" : "no_text"),
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
            midStreamUuids !== undefined &&
            (assistantMessages.at(-1)?.message.stop_reason ?? lastStopReason) === "refusal"
          )
            yield* sweepMidStreamMessages();
          if (stitchOpen) {
            stitchOpen = false;
            stitchPlan = undefined;
            yield {
              type: "refusal_continuation",
              phase: "end",
            };
          }
          yield* flushRefusalNotice();
          {
            let lastAssistant = assistantMessages.at(-1);
            let usage = lastAssistant ? getTokenUsage(lastAssistant) : undefined;
            if (usage) {
              let contextTokens = totalTokensOf(usage);
              if (
                shouldArmPrecompute({
                  autocompactRan,
                  hasAttemptedReactiveCompact,
                  lastTransitionReason: state.transition?.reason,
                  isPreFirstCompactFork: preFirstCompactFork,
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
                  let tokenCountFromUsage = getTokenCountFromUsage(usage);
                  let usageContextTokens =
                    tokenCountFromUsage.input_tokens +
                    tokenCountFromUsage.cache_creation_input_tokens +
                    tokenCountFromUsage.cache_read_input_tokens;
                  let estimatedContextTokens =
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
                    estimateGapTokens: usageContextTokens - estimatedContextTokens,
                    ...(querySource === "sdk" && {
                      promptScan: countUserPromptsAndRewrite([...messagesForQuery, ...assistantMessages]),
                    }),
                  });
                }
            }
          }
        } catch (error) {
          attemptError = {
            error,
          };
        }
        if (attemptError !== undefined || fallbackError !== undefined) {
          let attemptFailure = fallbackError ?? attemptError?.error;
          if (stitchOpen) {
            stitchOpen = false;
            stitchPlan = undefined;
            yield {
              type: "refusal_continuation",
              phase: "end",
            };
          }
          yield* flushRefusalNotice();
          yield* emitFallbackNotice();
          if (stitchBegan) {
            stitchBegan = false;
            stitchSalvageText = undefined;
            salvageUserMessage = undefined;
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
          if (isFallbackTo(accessFallbackModel, attemptFailure))
            modelChain = [...modelChain, accessFallbackModel];
          let nextChainModel = modelChain[chainIndex + 1];
          if (fallbackError !== undefined && nextChainModel !== undefined) {
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
              substituteFor: (model) => {
                if (!needsOverageConsentForModel(model, toolUseContext.requestDialog)) return;
                let substituteModel = getUsageCreditsOnlyModelConsentDeclineFallback();
                return substituteModel !== null &&
                  querySource === "compact" &&
                  swapShrinksContextWindow(modelChain[0], substituteModel)
                  ? null
                  : substituteModel;
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
            supersedeHoldRound = false;
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
            fallbackRecordChain = chainFallbackRecord(fallbackRecordChain, fallbackRecord);
            let windowShift = describeFallbackWindow(fallbackRecord, fallbackRecordChain);
            logFeatureOk("model_fallback");
            logEvent("tengu_model_fallback_triggered", {
              original_model: telemetrySafeModelName(fallbackError.originalModel),
              fallback_model: telemetrySafeModelName(attemptModel),
              original_context_window: windowShift?.fromWindow,
              fallback_context_window: windowShift?.toWindow,
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
                ) + (windowShift?.noticeSuffix ?? ""),
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
          throw attemptFailure;
        }
      }
    } catch (innerError) {
      {
        let noticeResult = takeFallbackNotice(refusalCascadeState);
        refusalCascadeState = noticeResult.state;
        if (noticeResult.notice !== undefined)
          yield buildRefusalFallbackNotice(noticeResult.notice, deps.uuid());
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
      let blockedStream = blockAndResetStream(attemptState);
      yield* yieldMissingToolResultBlocks(
        assistantMessages,
        SAFETY_BLOCK_TOOL_CANCEL_TEXT,
        deps,
        blockedStream.answeredToolUseIds,
      );
      if (blockedStream.removes) yield blockedStream.removes;
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
        let lateNoticeResult = takeFallbackNotice(refusalCascadeState);
        refusalCascadeState = lateNoticeResult.state;
        if (lateNoticeResult.notice !== undefined)
          yield buildRefusalFallbackNotice(lateNoticeResult.notice, deps.uuid());
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
      let pendingNoticeResult = takeFallbackNotice(refusalCascadeState);
      refusalCascadeState = pendingNoticeResult.state;
      if (pendingNoticeResult.notice !== undefined)
        yield buildRefusalFallbackNotice(pendingNoticeResult.notice, deps.uuid());
    }
    let lastResponseOk = !assistantMessages.at(-1)?.isApiErrorMessage;
    if (lastResponseOk && !attemptState.needsFollowUp) {
      let toolDescriptionRecord = recordToolDescriptions(messagesForQuery, inlineToolsDeclared, {
        options: toolUseContext.options,
        querySource,
        head: promptHeadSent,
        stamp: deps,
        handed: promptRender.redescribing,
      });
      if (toolDescriptionRecord) {
        yield toolDescriptionRecord;
        messagesForQuery = [...messagesForQuery, toolDescriptionRecord];
      }
      let deferredToolsRecordLate = appendDeferredToolsRecord();
      if (deferredToolsRecordLate) yield deferredToolsRecordLate;
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
    let resumeRecovered = false;
    if (resumeActive) {
      let last = assistantMessages.at(-1);
      let healedElsewhere = false;
      if (last?.isApiErrorMessage)
        healedElsewhere =
          healedElsewhere ||
          last === truncatedResponse ||
          last === withheldPromptTooLong ||
          isPromptTooLongMessage_2(last) ||
          isMediaSizeErrorReply(last);
      resumeRecovered = resumeTruncatedThinking(assistantMessages, {
        healedElsewhere,
        attempt: maxOutputTokensRecoveryCount,
      });
    }
    let message_2 = assistantMessages.at(-1);
    if (retryRefusal && isRefusalErrorMessage(message_2) && message_2 === lastWithheldAssistant) {
      try {
        yield* drainCompletedToolResults();
      } catch (error) {
        if (!(error instanceof ImageSizeError || error instanceof ImageResizeError)) {
          let resetOutcome = resetStreamingToolExecutor(attemptState, "model_error");
          if (resetOutcome.removes) yield resetOutcome.removes;
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
      let toolEndedTurn =
        attemptState.toolWasDeferred ||
        attemptState.shouldPreventContinuation ||
        attemptState.toolRequestedEndTurn !== false;
      let inFlightRemoves;
      let refusalRetryPlan;
      if (!toolEndedTurn)
        try {
          let discardedTools = discardInFlightTools(attemptState.streamingToolExecutor, "same_model_retry");
          inFlightRemoves = discardedTools.removes;
          attemptState.rebuildStreamingToolExecutor();
          if (discardedTools.startedToolUseIds.length > 0)
            clearActiveMcpContext(toolUseContext.options, isMainOrSubagent);
          let kept = assistantMessages.filter((assistantMessage) => assistantMessage !== message_2);
          refusalRetryPlan = {
            ...synthesizeRefusedToolResults({
              refused: message_2,
              kept,
              answered: toolResults,
              started: discardedTools.startedToolUseIds,
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
      if (inFlightRemoves) yield inFlightRemoves;
      if (refusalRetryPlan) {
        yield* refusalRetryPlan.notRun;
        yield refusalRetryPlan.notice;
        yield refusalRetryPlan.nudge;
        state = {
          guards: {
            ...guards,
            refusalRetrySpent: true,
            ...(toolUseBlocks.length > 0 && {
              stopHookBlockingCount: 0,
            }),
          },
          messages: [
            ...messagesForQuery,
            ...refusalRetryPlan.kept,
            ...toolResults,
            ...refusalRetryPlan.notRun,
            refusalRetryPlan.nudge,
          ],
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
    if (isRefusalErrorMessage(message_2) && message_2 === lastWithheldAssistant)
      yield* yieldWithRefusalNotice(message_2);
    if (!attemptState.needsFollowUp) {
      let hasStructuredOutputCall = function (messagesForQuery) {
        for (let idx = messagesForQuery.length - 1; idx >= 0; idx--) {
          let message = messagesForQuery[idx];
          if (message.type === "user") {
            if (message.isMeta || isToolResultMessage(message)) continue;
            return false;
          }
          if (message.type !== "assistant") continue;
          if (
            message.message.content.some(
              (block) => block.type === "tool_use" && block.name === STRUCTUREDOUTPUT,
            )
          )
            return true;
        }
        return false;
      };
      let last = assistantMessages.at(-1);
      let isWithheldPromptTooLong = last !== undefined && last === withheldPromptTooLong;
      let isPromptTooLong =
        isWithheldPromptTooLong ||
        (last?.type === "assistant" && last.isApiErrorMessage && isPromptTooLongMessage_2(last));
      let isImageError =
        !(
          toolDenialTracker !== null &&
          last?.type === "assistant" &&
          toolDenialTracker.isToolUseDeniedMessage(last)
        ) && isMediaSizeErrorReply(last);
      let recoveryToolUseContext =
        isPromptTooLong || isImageError
          ? {
              ...toolUseContext,
              abortController: createRecoveryAbortController(
                toolUseContext.abortController,
                recoveryTimeoutForMessages(
                  messagesForQuery,
                  isPromptTooLong ? last?.errorDetails : undefined,
                ),
                toolUseContext.session.host.clock,
              ),
              onRetryStatus: guardedStreamCallback(
                toolUseContext.onRetryStatus,
                toolUseContext.abortController.signal,
              ),
            }
          : toolUseContext;
      e: if (isPromptTooLong || isImageError) {
        let deeperPassSpent =
          isPromptTooLong &&
          hasAttemptedReactiveCompact &&
          reactiveCompactDeeperPass === "available" &&
          state.transition?.reason === "reactive_compact_retry";
        let reactiveCompactAttempted = hasAttemptedReactiveCompact && !deeperPassSpent;
        let breakerOutcome = deeperPassSpent
          ? {
              action: "proceed",
              consecutiveRapidRefills: tracking?.consecutiveRapidRefills ?? 0,
            }
          : checkRapidRefillBreaker(tracking);
        let { consecutiveRapidRefills } = breakerOutcome;
        if (!hasAttemptedReactiveCompact && breakerOutcome.action === "trip") {
          if (isWithheldPromptTooLong) {
            logFeatureBad("compact_after_long_context_refusal", "rapid_refill_breaker");
            break e;
          }
          let windowNotice = fallbackWindowNotice({
            fallback: isMainThreadQuery && isPromptTooLong ? fallbackRecordChain : undefined,
            mainLoopModel: toolUseContext.options.mainLoopModel,
            configuredWindow: toolUseContext.options.autoCompactWindow,
          });
          logEvent("tengu_auto_compact_rapid_refill_breaker", {
            consecutiveRapidRefills: tracking?.consecutiveRapidRefills ?? 0,
            turnsSincePreviousCompact: tracking?.turnCounter ?? -1,
            queryChainId: queryChainIdForAnalytics,
            queryDepth: queryTracking.depth,
            reactive: true,
            afterShrinkingFallback: windowNotice.afterShrinkingFallback,
          });
          let apiErrorMessage = createApiErrorMessage({
            content: windowNotice.content,
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
          last &&
          canReactiveCompact({
            hasAttempted: reactiveCompactAttempted,
            querySource,
            aborted: toolUseContext.abortController.signal.aborted,
          }) &&
          hasTooFewMessagesToCompact(messagesForQuery)
        ) {
          if (isWithheldPromptTooLong) {
            logFeatureBad("compact_after_long_context_refusal", "too_few_groups");
            break e;
          }
          let nonProgressGroups = countNonProgressMessages(messagesForQuery);
          let totalGroups = nonProgressGroups.length;
          let ptlReason = isImageError ? "image_error" : "prompt_too_long";
          let { actualTokens, limitTokens } = parsePromptTooLongTokenCounts(last.errorDetails ?? "");
          let conversationTokens = roughTokenCountEstimationForMessages(nonProgressGroups.flat());
          let overheadTokensEstimate =
            actualTokens !== undefined ? Math.max(0, actualTokens - conversationTokens) : undefined;
          logEvent("tengu_ptl_surfaced_to_user", {
            reason: fromEnum(ptlReason),
            querySource: agentTypeForTelemetry(querySource),
            wasGatedByPriorAttempt: reactiveCompactAttempted,
            deeperPass: fromEnum(reactiveCompactDeeperPass),
            reactiveUnsupported: !canCompactInRemote(),
            precomputedKind: lit("not_consulted"),
            compactionImpossible: true,
            totalGroups,
            overheadTokensEstimate,
          });
          let rebuiltPtlReply =
            ptlReason === "prompt_too_long"
              ? rebuildApiErrorMessage(
                  last,
                  formatSingleExchangePromptTooLong({
                    actualTokens,
                    limitTokens,
                    conversationTokensEstimate: conversationTokens,
                  }),
                  deps,
                )
              : last;
          yield rebuiltPtlReply;
          executeStopFailureHooks(rebuiltPtlReply, toolUseContext);
          markClassifierApiFailure(toolUseContext, querySource, rebuiltPtlReply);
          return {
            reason: ptlReason,
          };
        }
        let startTime = performance.now();
        let ptlGap = isPromptTooLong && last ? getPromptTooLongTokenGap(last) : undefined;
        let { outcome, swap, emittedEarlyCompactStart } = yield* runCompactionAsStream(
          (toolUseContext_2, onNotification, onResponseLength) =>
            applyPrecomputedCompact({
              toolUseContext: toolUseContext_2,
              messages: messagesForQuery,
              trigger: "ptl",
              isWithheld413: isPromptTooLong,
              hasAttemptedReactiveCompact,
              borrowFrom: preFirstCompactFork ? toolUseContext.precomputeSourceKey : undefined,
              detectedAt: startTime,
              querySource,
              sizingModel: attemptModelFacts.model,
              onResponseLength,
            }),
          recoveryToolUseContext,
        );
        let reactiveOutcome = yield* runCompactionAsStream(
          (toolUseContext_2, onNotification, onResponseLength) =>
            triggerReactiveCompact({
              hasAttempted: reactiveCompactAttempted,
              querySource,
              aborted: recoveryToolUseContext.abortController.signal.aborted,
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
              promptTooLong: ptlGap,
              allowLastResort: !isImageError,
              onNotification,
              onResponseLength,
            }),
          recoveryToolUseContext,
        );
        let { result: recoveredResult, failure } =
          isPromptTooLong && !isImageError && last && !canCompactInRemote()
            ? yield* recoverFromRefusal({
                autocompact: deps.autocompact,
                refusal: last,
                hasAttempted: hasAttemptedReactiveCompact,
                loopTopOutcome: autocompactOutcome.kind,
                offPickedModel: attemptModel !== sessionModel,
                messages: messagesForQuery,
                toolUseContext: recoveryToolUseContext,
                facts: attemptModelFacts,
                cacheSafeParams: {
                  systemPrompt,
                  userContext,
                  systemContext,
                  toolUseContext: recoveryToolUseContext,
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
            : reactiveOutcome;
        if (recoveredResult) {
          if (isWithheldPromptTooLong) logFeatureOk("compact_after_long_context_refusal");
          if (params.taskBudget) {
            let compactOutputTokens = finalContextTokensFromLastResponse(messagesForQuery);
            taskBudgetRemaining = Math.max(
              0,
              (taskBudgetRemaining ?? params.taskBudget.total) - compactOutputTokens,
            );
          }
          rollOverTotalTokensContext(
            toolUseContext.agentId ?? "main",
            tokenCountFromLastAPIResponse(messagesForQuery),
          );
          recoveredResult.summaryMessages = stampSummaryTurnFields(
            recoveredResult.summaryMessages,
            messagesForQuery,
          );
          contextRouting = await rebuildRoutingAfterCompaction(
            contextRouting,
            userContext,
            systemContext,
            recoveryToolUseContext,
            {
              messages: params.messages,
              querySource,
            },
          );
          let reannouncedMessages = await reannounceAfterCompact(recoveredResult, {
            routing: contextRouting,
            toolUseContext: recoveryToolUseContext,
            querySource,
            resumeActive,
            foreground: isMainThreadQuery && isMainAgent(recoveryToolUseContext.agentContext),
            stamp: deps,
          });
          let postCompactMessages = insertAfterCompactBoundary(
            buildPostCompactMessages(recoveredResult),
            reannouncedMessages,
          );
          toolUseContext = withTurnMessages(toolUseContext, postCompactMessages, isHumanTurn);
          maybeStartPrecomputeAfterTurn({
            messages: postCompactMessages,
            systemPrompt,
            userContext,
            systemContext,
            toolUseContext,
            querySource,
            stickyBetas,
          });
          for (let message of insertAfterCompactBoundary(
            buildPostCompactMessagesWithoutKept(recoveredResult),
            reannouncedMessages,
          ))
            yield message;
          tracking = createCompactTracking(deps.uuid(), consecutiveRapidRefills);
          let reactiveCompactDeeperPass_2 = deeperPassSpent
            ? "spent"
            : swap === undefined &&
                isPromptTooLong &&
                canCompactInRemote() &&
                reactiveCompactDeeperPass === "none" &&
                (countNonProgressMessages(postCompactMessages).length >= 3 ||
                  canLeaveOutFixPtl(
                    postCompactMessages,
                    ptlGap?.gap,
                    toolUseContext.contentReplacementState?.replacements,
                  ))
              ? "available"
              : reactiveCompactDeeperPass;
          if (isTopLevelMainThread) noteRedrive("reactive_compact");
          state = {
            guards: {
              ...guards,
              hasAttemptedReactiveCompact: swap === undefined,
              reactiveCompactDeeperPass: reactiveCompactDeeperPass_2,
            },
            messages: postCompactMessages,
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
        if (!isImageError && toolUseContext.abortController.signal.aborted) {
          if (isWithheldPromptTooLong) logFeatureSad("compact_after_long_context_refusal", "aborted");
          return yield* drainRemainingTools();
        }
        if (isWithheldPromptTooLong) {
          logFeatureBad(
            "compact_after_long_context_refusal",
            reactiveCompactAttempted ? "still_refused" : "not_compacted",
          );
          break e;
        }
        let ptlFailureReason = isImageError ? "image_error" : "prompt_too_long";
        let isCompactSourceForPtl = querySource === "compact" || isCompactQuerySource(querySource);
        if (!toolUseContext.abortController.signal.aborted && !isCompactSourceForPtl)
          logEvent("tengu_ptl_surfaced_to_user", {
            reason: fromEnum(ptlFailureReason),
            querySource: agentTypeForTelemetry(querySource),
            wasGatedByPriorAttempt: reactiveCompactAttempted,
            deeperPass: fromEnum(reactiveCompactDeeperPass),
            ...(ptlFailureReason === "prompt_too_long" &&
              promptTooLongFacts({
                errorDetails: last?.errorDetails,
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
        let content = isPromptTooLong ? compactFailureDetail(failure) : undefined;
        let finalReply = content !== undefined ? rebuildApiErrorMessage(last, content, deps) : last;
        yield finalReply;
        executeStopFailureHooks(finalReply, toolUseContext);
        markClassifierApiFailure(toolUseContext, querySource, finalReply);
        return {
          reason: ptlFailureReason,
        };
      }
      if (isWithheldPromptTooLong) yield last;
      reportFabricatedTurns(assistantMessages, attemptModel);
      let exhaustedNotice;
      if (last !== undefined && (isWithheldMaxOutputTokens(last) || resumeRecovered)) {
        let attempt = resumeRecovered ? maxOutputTokensRecoveryCount : maxOutputTokensRecoveryCount + 1;
        if (attempt <= MAX_CONTINUE_ATTEMPTS) {
          let resumeThinkingFound =
            !resumeRecovered &&
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
            !resumeRecovered &&
            !resumeThinkingFound &&
            assistantMessages.some((assistantMessage) => !assistantMessage.isApiErrorMessage)
          )
            logFeatureOk("query_thinking_block_resumption", {
              attempt: maxOutputTokensRecoveryCount,
            });
          let outputLimitNudge = resumeThinkingFound
            ? undefined
            : createUserMessage({
                content: shouldNudgeOutputLimitResume(assistantMessages, attempt, querySource),
                isMeta: true,
                turnCompanion: true,
                now: deps.now,
                uuidFn: deps.uuid,
              });
          if (outputLimitNudge !== undefined) yield outputLimitNudge;
          state = {
            guards: {
              ...guards,
              maxOutputTokensRecoveryCount: attempt,
            },
            messages:
              outputLimitNudge === undefined
                ? [
                    ...messagesForQuery,
                    ...assistantMessages.filter((assistantMessage) => !assistantMessage.isApiErrorMessage),
                  ]
                : [...messagesForQuery, ...assistantMessages, outputLimitNudge],
            resumeIncompleteThinking: resumeThinkingFound || undefined,
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
        exhaustedNotice = recoverExhaustedOutput({
          withheld: last,
          responses: assistantMessages,
          model: attemptModel,
          isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
          agentId: toolUseContext.agentId,
        });
        yield exhaustedNotice;
      }
      if (truncatedResponse !== undefined && last === truncatedResponse) {
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
        yield last;
      }
      if (
        (last?.message.stop_reason ?? lastStopReason) === "tool_use" &&
        toolUseBlocks.length === 0 &&
        !last?.isApiErrorMessage
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
        let retractedMessages = [
          ...recentMalformedRetries(messagesForQuery, malformedToolUseRetryCount),
          ...assistantMessages,
        ];
        for (let msg of retractedMessages)
          yield {
            type: "tombstone",
            message: msg,
          };
        let apiErrorMessage = createApiErrorMessage({
          content: "The model's tool call could not be parsed (retry also failed).",
          now: deps.now,
          uuid: deps.uuid,
        });
        apiErrorMessage.retractedMessageUuids = retractedMessages.map((message) => message.uuid);
        yield apiErrorMessage;
        executeStopFailureHooks(apiErrorMessage, toolUseContext);
        markClassifierApiFailure(toolUseContext, querySource, apiErrorMessage);
        return {
          reason: "malformed_tool_use_exhausted",
        };
      }
      let stopReason = last?.message.stop_reason ?? lastStopReason;
      if (
        (stopReason === "end_turn" || stopReason === "stop_sequence") &&
        !last?.isApiErrorMessage &&
        querySource !== "compact" &&
        !isCompactQuerySource(querySource) &&
        !hasSuccessfulToolCall_2(messagesForQuery) &&
        !assistantMessages.some((assistantMessage) =>
          assistantMessage.message.content.some(
            (content) => content.type === "text" && content.text.trim().length > 0,
          ),
        ) &&
        !hasStructuredOutputCall(messagesForQuery) &&
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
      if (last?.isApiErrorMessage) {
        if (
          requireTurnClassifier &&
          getClassifierJobState(toolUseContext) &&
          isActingAsBgJob() &&
          querySource.startsWith("repl_main_thread") &&
          !toolUseContext.agentId
        ) {
          let failureText = getAssistantMessageText(exhaustedNotice ?? last) ?? last.errorDetails ?? "";
          await requireTurnClassifier().markApiFailure(
            getClassifierJobState(toolUseContext),
            getOwnJobShortId(),
            last.error,
            failureText,
            last.apiError,
          );
        }
        executeStopFailureHooks(exhaustedNotice ?? last, toolUseContext);
        return {
          reason: "api_error",
          errorKind: last.error,
          isTransient: isTransientApiError(last),
          quotaLimits: last.quotaLimits,
          oauthRefreshDiskFull: last.oauthRefreshDiskFull,
        };
      }
      return yield* runStopHooksAndFinish(toolUseContext);
    }
    async function* runStopHooksAndFinish(context, finishExtras) {
      let toolResults = finishExtras?.toolResults ?? [];
      let goalActive = !context.agentId && context.getAppState().activeGoal !== undefined;
      let stopHookResult = yield* runStopHooks(
        messagesForQuery,
        assistantMessages,
        systemPrompt,
        userContext,
        systemContext,
        context,
        querySource,
        stopHookActive,
        stickyBetas,
        getClassifierJobState(context),
        toolResults,
      );
      if (stopHookBlockingCount > 0 && stopHookResult.blockingErrors.length === 0)
        logEvent("tengu_stop_hook_block_count", {
          count: stopHookBlockingCount,
          is_subagent: isNonMainSessionSubagent(context.agentContext),
          hit_max_turns: false,
          hit_cap: false,
          goal_active: goalActive,
        });
      if (stopHookResult.preventContinuation)
        return finishExtras && context.abortController.signal.aborted
          ? {
              reason: "aborted_tools",
            }
          : {
              reason: "stop_hook_prevented",
            };
      let summaryPromise = waitForTurnEndSummary(
        context.sessionState,
        () => stopHookResult.blockingErrors.length > 0,
      );
      if (summaryPromise !== undefined) await summaryPromise;
      if (stopHookResult.blockingErrors.length > 0) {
        let nextTurnCount = turnCount + 1;
        let blockCount = stopHookBlockingCount + 1;
        if (maxTurns && nextTurnCount > maxTurns) {
          logEvent("tengu_stop_hook_block_count", {
            count: blockCount,
            is_subagent: isNonMainSessionSubagent(context.agentContext),
            hit_max_turns: true,
            hit_cap: false,
            goal_active: goalActive,
          });
          yield createAttachmentMessage_2(
            {
              type: "max_turns_reached",
              maxTurns,
              turnCount: nextTurnCount,
            },
            deps,
          );
          yield* runTurnEndReactions(context, [...messagesForQuery, ...assistantMessages, ...toolResults], {
            stopHookActive,
          });
          return {
            reason: "max_turns",
            turnCount: nextTurnCount,
          };
        }
        let CLAUDE_CODE_STOP_HOOK_BLOCK_CAP = env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP ?? 8;
        if (CLAUDE_CODE_STOP_HOOK_BLOCK_CAP > 0 && blockCount > CLAUDE_CODE_STOP_HOOK_BLOCK_CAP) {
          logEvent("tengu_stop_hook_block_count", {
            count: blockCount,
            is_subagent: isNonMainSessionSubagent(context.agentContext),
            hit_max_turns: false,
            hit_cap: true,
            goal_active: goalActive,
          });
          let text =
            `A hook blocked the turn from ending ${blockCount} consecutive times \u2014 overriding and ending turn. ` +
            "For Stop/SubagentStop hooks, check stop_hook_active in the input and return success while it's true. Set CLAUDE_CODE_STOP_HOOK_BLOCK_CAP to raise this limit.";
          yield createSystemMessage(text, "warning");
          if (
            context.agentContext.agentType !== "teammate" &&
            !isNonMainSessionSubagent(context.agentContext)
          )
            notifyStopHookCap(text);
          yield* runTurnEndReactions(context, [...messagesForQuery, ...assistantMessages, ...toolResults], {
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
            stopHookBlockingCount: blockCount,
            turnCount: nextTurnCount,
          },
          messages: [
            ...messagesForQuery,
            ...assistantMessages,
            ...toolResults,
            ...stopHookResult.blockingErrors,
          ],
          toolUseContext: context,
          compactTracking: tracking,
          transition: {
            reason: "stop_hook_blocking",
          },
          pendingToolUseSummary: finishExtras?.pendingToolUseSummary,
          prevToolDurations: finishExtras?.prevToolDurations,
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
    let surfaces = requireClassifierSurfaces
      ? requireClassifierSurfaces().detectSurfaces(
          isStorageV5Enabled() && toolUseContext.storageV5
            ? await requireClassifierSurfaces().watchedForSurfaces(toolUseContext.storageV5)
            : undefined,
        )
      : null;
    let sinks = surfaces ? requireClassifierSurfaces().sinksFor(surfaces) : null;
    let classifierEngine = sinks ? requireClassifierSurfaces().engineFor(sinks) : null;
    let classifierJobState = getClassifierJobState(toolUseContext);
    if (
      requireTurnClassifier &&
      classifierJobState &&
      classifierEngine &&
      classifyQuerySource(querySource) === "main" &&
      !toolUseContext.agentId
    ) {
      let wantsSummary = sinks.has("summary");
      let wantsHeadline = sinks.has("headline");
      classifierJobState.onClassified = (classified, isFresh) => {
        if (
          !isFresh ||
          !(wantsSummary || wantsHeadline) ||
          classified.detail === classifierJobState.lastEmittedDetail
        )
          return;
        classifierJobState.lastEmittedDetail = classified.detail;
        if (wantsSummary)
          toolUseContext.sessionState?.notifyMetadataChanged({
            task_summary: classified.detail,
          });
        if (wantsHeadline) {
          let taskSummary = classified.detail
            ? {
                text: classified.detail,
                at: Date.now(),
              }
            : null;
          toolUseContext.setAppState((appStateForSummary) =>
            appStateForSummary.taskSummary?.text === taskSummary?.text
              ? appStateForSummary
              : {
                  ...appStateForSummary,
                  taskSummary,
                },
          );
        }
      };
      classifierJobState.describeToolUse = (toolName, input) => {
        try {
          return (
            findToolByName(toolUseContext.options.tools, toolName)?.getActivityDescription?.(input) ??
            undefined
          );
        } catch (error) {
          logForDebugging(
            `[classifier] getActivityDescription(${toolName}) threw: ${toError(error).message}`,
          );
          return;
        }
      };
      let mainThreadAgentType = getMainThreadAgentType();
      let mainThreadAgent = mainThreadAgentType
        ? toolUseContext.options.agentDefinitions.activeAgents.find(
            (activeAgent) => activeAgent.agentType === mainThreadAgentType,
          )
        : undefined;
      let found = messagesForQuery.find(
        (message) => message.type === "user" && message.turnCompanion !== true,
      );
      if (found?.type === "user") {
        let content = found.message.content;
        requireTurnClassifier().captureIntent(
          classifierJobState,
          typeof content === "string"
            ? content
            : (content.find((block) => block.type === "text")?.text ?? ""),
        );
      }
      let latestRealUserAsk = requireTurnClassifier().findLatestRealUserAsk(messagesForQuery);
      if (latestRealUserAsk) requireTurnClassifier().captureLatestAsk(classifierJobState, latestRealUserAsk);
      requireTurnClassifier().classifyAndPushDebounced(
        classifierJobState,
        getOwnJobShortId(),
        mainThreadAgent,
        [...messagesForQuery, ...assistantMessages].filter((message) => message.type === "assistant"),
        hasActiveAgentTasks(toolUseContext.taskRegistry.all()),
        classifierEngine,
        surfaces,
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
        let resetOutcomeAfterTools = resetStreamingToolExecutor(attemptState, "model_error");
        if (resetOutcomeAfterTools.removes) yield resetOutcomeAfterTools.removes;
        throw error;
      }
      return yield* endTurnOnError(error);
    }
    queryCheckpoint("query_tool_execution_end");
    if (lastResponseOk) {
      let toolDescriptionRecordLate = recordToolDescriptions(messagesForQuery, inlineToolsDeclared, {
        options: toolUseContext.options,
        querySource,
        head: promptHeadSent,
        stamp: deps,
        handed: promptRender.redescribing,
      });
      if (toolDescriptionRecordLate) {
        yield toolDescriptionRecordLate;
        messagesForQuery = [...messagesForQuery, toolDescriptionRecordLate];
      }
      let deferredToolsRecordAfterTools = appendDeferredToolsRecord();
      if (deferredToolsRecordAfterTools) yield deferredToolsRecordAfterTools;
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
                (resultBlock) => resultBlock.type === "tool_result" && resultBlock.tool_use_id === block.id,
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
      let nextTurnCount = turnCount + 1;
      if (maxTurns && nextTurnCount > maxTurns)
        yield createAttachmentMessage_2(
          {
            type: "max_turns_reached",
            maxTurns,
            turnCount: nextTurnCount,
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
    let shouldRunStopHooks =
      !endTurnOverrideMessage &&
      shouldRunMcpStopHooks({
        requested: attemptState.toolRequestedEndTurn,
        lastIteration: Boolean(maxTurns && turnCount + 1 > maxTurns),
      });
    if (attemptState.toolRequestedEndTurn && !endTurnOverrideMessage && !shouldRunStopHooks) {
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
      if (getSessionCronTasks().some((cronTask) => cronTask.kind === "loop" && cronTask.prompt === prompt)) {
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
      let toolResultContentById = new Map();
      for (let toolResult of toolResults)
        if (toolResult.type === "user" && Array.isArray(toolResult.message.content)) {
          for (let block of toolResult.message.content)
            if (block.type === "tool_result") toolResultContentById.set(block.tool_use_id, block.content);
        }
      let hookBlocked = false;
      let hookStopReason;
      try {
        for await (let attachment of executePostToolBatchHooks(
          toolUseBlocks.map((toolUseBlock) => ({
            tool_name: toolUseBlock.name,
            tool_input: toolUseBlock.input,
            tool_use_id: toolUseBlock.id,
            tool_response: toolResultContentById.get(toolUseBlock.id),
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
            hookBlocked = true;
            hookStopReason ??= attachment.blockingError.blockingError;
          }
          if (attachment.preventContinuation) {
            hookBlocked = true;
            hookStopReason ??= attachment.stopReason;
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
      if (hookBlocked) {
        yield createAttachmentMessage_2(
          {
            type: "hook_stopped_continuation",
            message: hookStopReason || "Execution stopped by PostToolBatch hook",
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
    if (shouldRunStopHooks)
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
      let refreshedTools = updatedToolUseContext.options.refreshTools();
      if (refreshedTools !== updatedToolUseContext.options.tools) {
        let oldMcpCount = count(updatedToolUseContext.options.tools, (tool) => !!tool.mcpInfo);
        let newMcpCount = count(refreshedTools, (tool) => !!tool.mcpInfo);
        if (oldMcpCount !== newMcpCount)
          logEvent("tengu_mcp_tools_refreshed_mid_turn", {
            oldMcpCount,
            newMcpCount,
            recovered: oldMcpCount === 0 && newMcpCount > 0,
          });
        updatedToolUseContext = {
          ...updatedToolUseContext,
          options: {
            ...updatedToolUseContext.options,
            tools: refreshedTools,
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
    let pendingFoldCommands = () =>
      filterQueuedCommandsForThread(
        toolUseContext.messageQueue.getCommandsByMaxPriority("next").concat(
          toolUseContext.queuedNotificationsRegistry.heldNudge({
            agentId: toolUseContext.agentId,
            messageQueue: toolUseContext.messageQueue,
            ccrTurnId,
            nobodysTurn,
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
        pendingFoldCommands,
      );
    let isMainThreadFold = isMainThreadQuery;
    let nextTurn = turnCount + 1;
    let maxTurnsCap = maxTurns && nextTurn > maxTurns ? maxTurns : undefined;
    let foldableCommands =
      toolUseContext.messageQueue.isMidTurnFoldSuspended() || maxTurnsCap !== undefined
        ? []
        : pendingFoldCommands();
    nobodysTurn &&= !foldableCommands.some(isPersonQueuedInput);
    let routedSubmissions = isMainThreadFold
      ? await routeSubmissions(foldableCommands, updatedToolUseContext)
      : {
          deliverable: foldableCommands,
          notices: [],
          dropped: [],
        };
    let deliverable = routedSubmissions.deliverable;
    toolUseContext.messageQueue.registerFoldInFlight(deliverable);
    try {
      for (let { uuid } of routedSubmissions.dropped)
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
      for (let notice of routedSubmissions.notices) yield notice;
      let deliveredPromptCount = 0;
      let deliveredPollEventCount = 0;
      let content;
      let msg = createFoldCommandFilter(
        createScreensReader(() => updatedToolUseContext, {
          latch: false,
        }),
      );
      let absorbedCommands = new Set();
      let commands = deliverable.filter(isInlineNotificationMode);
      let toolsAfterDisallow = applyDisallowedTools(
        commands,
        params.joinedDisallowedTools,
        updatedToolUseContext.options,
      );
      if (toolsAfterDisallow !== updatedToolUseContext.options.tools)
        updatedToolUseContext = {
          ...updatedToolUseContext,
          options: {
            ...updatedToolUseContext.options,
            tools: toolsAfterDisallow,
          },
        };
      let filteredIndex = 0;
      for await (let attachment of getAttachmentMessages(
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
        let command;
        if (
          attachment.attachment.type === "queued_command" &&
          attachment.attachment.commandMode !== undefined
        ) {
          command = commands[filteredIndex];
          filteredIndex++;
          if (command !== undefined && !msg(command)) {
            absorbedCommands.add(command);
            continue;
          }
        }
        let announcement = safeMapOrUndefined(attachment, updatedToolUseContext.options.announcementWalk);
        if (announcement === undefined) continue;
        yield announcement;
        toolResults.push(announcement);
        if (
          attachment.attachment.type === "queued_command" &&
          attachment.attachment.commandMode !== undefined
        ) {
          deliveredPromptCount++;
          for (let message of await applyFoldedPromptSubmit(
            command?.promptSubmitted,
            updatedToolUseContext,
          )) {
            yield message;
            toolResults.push(message);
          }
        }
        if (attachment.attachment.type === "poll_events") deliveredPollEventCount++;
      }
      let filtered = commands.filter((command) => !absorbedCommands.has(command));
      if (filtered.length > 0 && deliveredPromptCount === 0)
        logForDebugging(
          `[query] queued_command attachments degraded to 0 for ${filtered.length} consumed command(s) \u2014 leaving them queued instead of dropping them`,
          {
            level: "warn",
          },
        );
      else {
        if (filtered.length > 0 && deliveredPromptCount < filtered.length)
          logForDebugging(
            `[query] partial queued_command emission: ${deliveredPromptCount}/${filtered.length} \u2014 removing commands that were not all delivered`,
            {
              level: "error",
            },
          );
        checkTurnIdsConsistent(filtered);
        if (filtered.length > 0)
          if (
            updatedToolUseContext.abortController.signal.aborted ||
            updatedToolUseContext.messageQueue.isMidTurnFoldSuspended()
          )
            logForDebugging(
              `[query] abort/suspension during mid-turn absorption \u2014 leaving ${filtered.length} command(s) queued`,
            );
          else {
            toolUseContext.messageQueue.consume(filtered, {
              reason: "absorbed_mid_turn",
            });
            reportQueuedSubmissions(filtered, "mid_turn");
            markMessagesRead(filtered);
            recordContextKeyFromMessages(filtered);
            getValueFromInput_2(filtered, isMainThreadQuery);
            recordSubmittedPrompts(filtered, toolUseContext.storageV5, {
              armUndo: false,
              placed: withExpandedPastes,
            });
            if (
              isMainThreadFold &&
              filtered.some(
                (command) =>
                  command.mode === "prompt" &&
                  !command.isMeta &&
                  command.shouldQuery !== false &&
                  isHumanOrigin(command.origin),
              )
            ) {
              notifyAutoReactHumanTurn();
              resetGoalIdleCheckinCount(toolUseContext.setAppState, toolUseContext.session.sessionScratch);
            }
            let preempt = shouldPreemptPromptTooLong(
              filtered,
              updatedToolUseContext.options.mainLoopModel,
              getEffortValue(updatedToolUseContext),
              deps,
            );
            if (preempt) {
              updatedToolUseContext = applyContextLayers(updatedToolUseContext, [preempt.layer]);
              yield preempt.reminder;
              toolResults.push(preempt.reminder);
            }
            for (let att of filtered)
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
        if (deliveredPollEventCount === 0) logPollEventsLeftQueued("mid-turn", consumedCommands.length);
        else {
          let pollEventRows = yield* absorbQueuedPollEvents({
            events: consumedCommands,
            queue: toolUseContext.messageQueue,
            signal: updatedToolUseContext.abortController.signal,
            phase: "mid-turn",
            deliveredPollEventUuids,
          });
          for (let row of pollEventRows) yield markVirtualInResume(row);
        }
    } finally {
      toolUseContext.messageQueue.unregisterFoldInFlight(deliverable);
    }
    if (
      memoryRecallPrefetch &&
      memoryRecallPrefetch.settledAt !== null &&
      memoryRecallPrefetch.consumedOnIteration === -1
    ) {
      let lateMemoryAttachments = filterDuplicateMemoryAttachments(
        memoryRecallPrefetch.screen(await memoryRecallPrefetch.promise, [
          ...messagesForQuery,
          ...assistantMessages,
          ...toolResults,
        ]),
        toolUseContext.readFileState,
        toolUseContext.session,
        memoryRecallPrefetch.earlierReadsMayBeCleared,
      );
      for (let cmd of lateMemoryAttachments) {
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
    if (maxTurnsCap !== undefined) {
      yield createAttachmentMessage_2(
        {
          type: "max_turns_reached",
          maxTurns: maxTurnsCap,
          turnCount: nextTurn,
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
        turnCount: nextTurn,
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
        turnCount: nextTurn,
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
    let iterationOutcome = yield* runIteration();
    if (iterationOutcome !== NEXT_ROUND) {
      let { recordProjectsReplyTurnError } = require("./bridge/projectsReplyGate.js");
      recordProjectsReplyTurnError(iterationOutcome, querySource, {
        messages: state.messages,
        agentId: state.toolUseContext.agentId,
        engineState: () => state.toolUseContext.getAppState(),
      });
    }
    return iterationOutcome;
  }
  while (true) {
    let iterationOutcome = yield* runIterationRecordingErrors();
    if (iterationOutcome !== NEXT_ROUND) return iterationOutcome;
  }
}
//@ chunk-ha3km179.js:234645-235046 sole-consumer
/**
 * 模型回退的系统提示文案：overloaded/server_error → "due to high demand"；model_not_found/permission_denied/model_blocked → "is not available"（附错误摘要）；last_resort → 不可重试错误。
 */
function formatModelFallbackMessage(reason, originalModel, fallbackModel, error) {
  switch (reason) {
    case "overloaded":
    case "server_error":
      return `Switched to ${fallbackModel} due to high demand for ${originalModel}`;
    case "model_not_found":
    case "permission_denied":
    case "model_blocked": {
      let detail =
        reason === "model_not_found" && !isModelNotFoundError(error) ? formatFallbackErrorDetail(error) : "";
      return `Switched to ${fallbackModel} because ${originalModel} is not available${detail}`;
    }
    case "last_resort":
      return `Switched to ${fallbackModel} because ${originalModel} returned an error that could not be retried${formatFallbackErrorDetail(error)}`;
  }
}
//@ chunk-ha3km179.js:235046-235155 sole-consumer
/**
 * 把原始错误转成最多 300 字符的 " (…)" 后缀。
 */
function formatFallbackErrorDetail(error) {
  let fullMessage = error === undefined ? "" : errorMessage(error);
  let truncated = truncateToLength(fullMessage, 300);
  let detail = truncated.length < fullMessage.length ? `${truncated}\u2026` : fullMessage;
  return detail ? ` (${detail})` : "";
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
  let contextItems = await capAdditionalContext(
    promptSubmitted.context ?? [],
    "prompt.submit",
    updatedToolUseContext.storageV5,
  );
  return contextItems.length > 0
    ? [...filtered, createHookContextAttachment(contextItems, "prompt.submit")]
    : filtered;
}
//@ chunk-ha3km179.js:235573-235717 sole-consumer (2.1.88 match: isHumanTurn, 0.779)
/**
 * 返回最后一条真实人类消息（非 meta、非工具结果、非压缩摘要）的下标，没有时返回 0；queryLoop 用它设置 turnStartIndex。旧版名 isHumanTurn 名不符实（返回下标）。
 */
function isHumanTurn(m) {
  for (let j = m.length - 1; j >= 0; j--) {
    let message = m[j];
    if (message.type === "user" && !message.isMeta && !message.toolUseResult && !message.isCompactSummary)
      return j;
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
//@ chunk-ha3km179.js:235814-235920 sole-consumer (2.1.88 match: getValueFromInput, 1)
/**
 * 生成队列命令过滤器：可折叠命令放行；遇到第一条不可折叠的 prompt 命令后，其后的 prompt 命令都不再折叠进本轮。
 */
function createFoldCommandFilter(input) {
  let sawFoldable = false;
  return (command) => {
    if (sawFoldable && command.mode === "prompt") return false;
    if (!isCommandFoldable(command, input)) return true;
    sawFoldable = true;
    return false;
  };
}
//@ chunk-ha3km179.js:235920-236090 sole-consumer
/**
 * 命令能否折叠进当前轮：drainOnly/screeningPending 恒可；没有 promptSubmitted 不可；否则要求提交时的钩子/插件快照与当前一致（AKn 比较）。
 */
function isCommandFoldable(command, readScreens) {
  if (command.drainOnly === true || command.screeningPending === true) return true;
  if (command.promptSubmitted === undefined) return false;
  let screens = readScreens();
  return screens === undefined || screensChanged(command.promptSubmitted.under, screens);
}
export { query };
