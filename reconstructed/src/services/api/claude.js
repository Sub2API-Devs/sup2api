/**
 * services/api/claude.ts
 *
 * Messages API 调用核心：queryModel 构建请求体（模型、system、tools、thinking、output_config、context_management、beta）、加缓存断点、经 withRetry 发流式请求、解析 SSE 事件为 assistant 消息，以及 400 时逐级去特性的自愈重试；另含 queryHaiku/queryWithModel 等辅助查询。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/claude.ts
 * pieces: chunk-1ny7cxrt.js (1), chunk-1qpz7qcd.js (1), chunk-3xb70ww4.js (1), chunk-aepeg2w5.js (1), chunk-e6aww6q8.js (187), chunk-r1wk8q25.js (3), chunk-w5ndchqs.js (4)
 * attribution: fingerprint 21, placement 115, layout 54, callgraph-fingerprint 2, callgraph-witnessed 3, file-local 2, affinity 1
 */
import { randomUUID } from "crypto";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import {
  getLastMainThreadContextTokens,
  getStickyBetas,
  isPromptEndMarkRefused,
  isStructuredOutputsMarkedUnsupported,
  markStructuredOutputsUnsupported,
  getLearnedEffortCaps,
  onSessionSwitch,
  getPrintOutputFormat,
  getPromptCache1hAllowlist,
  setPromptCache1hAllowlist,
  isLastMainThreadAskLive,
  getRootSession,
  adjustLastMainThreadCacheTtlMs,
  getRefusedBetasForModel,
  markBetaRefusedForModel,
  getResponseBeforeCompaction,
  setLastMainThreadCacheTtlMs,
  isThirdPartyServerClassifierRefused,
  getMainChainReleaseCount,
  markThirdPartyServerClassifierRefused,
  releaseThirdPartyServerClassifierRefusal,
  isThinkingHighlightsRefused,
  getThinkingTypeOverride,
  getThinkingDisplayExplicit,
  isMidConvCachePromotionRejected,
  markPromptEndMarkRefused,
  markMidConvCachePromotionRejected,
  isPerTurnEffortOkEmitted,
  markPerTurnEffortOkEmitted,
  isLateToolAdditionsOkEmitted,
  markLateToolAdditionsOkEmitted,
  isInlineToolsOkEmitted,
  markInlineToolsOkEmitted,
  markEffortUnsupported,
  markThinkingHighlightsRefused,
  markThinkingResumptionRefused,
  markBetaHeaderRefused,
  hasRefusalFallbackOccurred,
  getRefusalFallbackModelLatch,
  consumePendingContextCompacted,
  setThinkingTypeOverride,
  recordServedModel,
  isDisklessProcess,
  forgetResponseBeforeCompaction,
  setLastMainRequestId,
  setLastMainThreadContextTokens,
  takeRefusalFallbackCarriedEffortEnd,
  getSessionId,
} from "../../bootstrap/state.js";
import { isMainThreadSource } from "../../utils/querySource.js";
import {
  estimateCacheWriteCost,
  resolvePromptCacheTtl,
  ONE_HOUR_TTL_SOURCES,
  matchesModelPattern,
  applyFiveMinuteOverride,
} from "./promptCacheTtl.js";
import {
  usesPerTurnEffortBeta,
  hasContextBeta,
  areExperimentalBetasDisabled,
  modelSupportsISP,
  shouldIncludeFirstPartyOnlyBetas,
  modelHidesThinkingByDefault,
  canSendFirstPartyBetas,
  BETA_MID_CONVERSATION_SYSTEM,
  shouldUseMidConvSystem,
  BETA_MID_CONV_TOOL_CHANGE,
  BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT,
  isHipaaOrg,
  isAfkModeBeta,
  betaHeaderValues,
  BETA_EFFORT,
  BETA_TASK_BUDGETS,
  getModelBetas,
  betasRequestParam,
  hitsAnthropicBackend,
  BETA_LONG_CONTEXT,
  modelTakesToolAdditions,
  BETA_INLINE_TOOLS,
  BETA_PER_MESSAGE_EFFORT,
  supportsPerTurnEffort,
  BETA_PER_TURN_TIMING,
  supportsPerTurnTiming,
  getMergedBetas,
  BETA_ADVISOR_TOOL,
  BETA_THINKING_TOKEN_COUNT,
  getToolSearchBeta,
  shouldUseGlobalCacheScope,
  BETA_PROMPT_CACHING_SCOPE,
  willSendStructuredOutputsBeta,
  BETA_STRUCTURED_OUTPUTS,
  BETA_SERVER_SIDE_FALLBACK_CATEGORY,
  shouldAllowAfkModeBeta,
  BETA_AFK_MODE,
  BETA_SPEED,
  BETA_CACHE_DIAGNOSIS,
  BETA_THINKING_BINDING_CONTROLS,
  thirdPartyAcceptsThinkingBindingBeta,
  BETA_PROMPT_CACHING_EVICT,
  BETA_CACHE_KEEPALIVE,
  BETA_DANGEROUS_TOOL_USE,
  BETA_THINKING_DISPLAY_UPDATES,
  THINKING_DISPLAY_NAMED_BETA,
  BETA_MESSAGE_THREADS,
  KNOWN_BETAS,
  isAutoMode3POptIn,
  getBedrockExtraBodyParamsBetas,
  BETA_FALLBACK_CREDIT,
  thirdPartyAcceptsDangerousToolUseBeta,
  BETA_REDACT_THINKING,
  BETA_THINKING_RESUMPTION,
  BETA_EXTENDED_CACHE_TTL,
  filterBetasForProvider,
  BETA_OAUTH_AUTH,
  BETA_SERVER_SIDE_FALLBACK,
  BETA_MID_CONV_CACHE_PROMOTION_LATCH,
  BETA_CONTEXT_MANAGEMENT,
  BETA_MID_CONV_CACHE_PROMOTION_OK_LATCH,
  rejectContextBetaForModel,
} from "../../utils/betas.js";
import {
  getCanonicalName,
  isRecognizedModel,
  strippedCanonicalName,
} from "../../utils/model/canonicalModelName.js";
import { logError, captureAPIRequest } from "../../utils/log.js";
import {
  toError,
  withTelemetryMessage,
  errorMessage,
  isAbortError,
  sanitizedErrorNameForTelemetry,
  sanitizedConnectionCodeForTelemetry,
  sanitizedClassNameForTelemetry,
} from "../../utils/errors.js";
import {
  isUltrathinkEffective,
  isEffortHigherThan,
  EFFORT_LEVELS,
  getModelSettingsKey,
  modelSupportsXhighEffort,
  modelSupportsEffort,
  resolveEffortValue,
  normalizeEffortLevel,
  getDefaultEffortLevel,
  resolveAppliedEffort,
  isAboveHighEffort,
  THINKING_DISABLED_EFFORT_CAP,
  isEffortLevel,
} from "../../utils/effort.js";
import { enqueueTaskNotification as enqueueTaskNotification_2 } from "../../utils/task/taskNotifications.js";
import { env, antEnv } from "../../utils/env.js";
import {
  showThinkingSummaries,
  upgradeDisabledThinkingForModel,
  isThinkingAlwaysOn,
  modelRejectsDisabledThinking,
  modelSupportsAdaptiveThinking,
} from "../../utils/thinking.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import {
  turnDeniedTools,
  DeclaredToolSet,
  toolChangeHeaderAllowed,
  inlineToolsAllowed,
  stickyBetasOr,
  adjustToolBetas,
  shouldAnnounceDeferredTools,
  canDeclareInlineTools,
  deferredToolsEnabled,
  resolveDeclaredToolSet,
  updateDeclaredToolSet,
  asScratchDeclaredToolSet,
  isHipaaRestricted,
  isLateToolAdditionsEnabled,
  recordDeclaredToolsIfMissing,
  markReconnectingServers,
  cacheNoChannelTools,
  buildDeclaredToolSet,
  computeLateToolAdditions,
  logDeclaredToolSetHeld,
  toolAdditionBetas,
  describeToolAdditionMoves,
  findLatestApiSystemDelta,
  clientNames,
  surfaceDeferredTools,
  handleInlineToolsRejection,
  classifyToolAdditionRejection,
  dropToolChangeState,
  buildToolRemovalBlocks,
} from "./declaredToolSet.js";
import { toolMatchesAnyName } from "../tools/permissionCheckGuard.js";
import { isFoamySpringEnabled as isFoamySpringEnabled_2 } from "../mcp/mcpToolAvailability.js";
import { toolMatchesName, findToolByName, getEmptyToolPermissionContext } from "../../Tool.js";
import {
  TOOL_SEARCH_TOOL_NAME,
  isDeferredToolByEngine,
  isDeferredTool as isDeferredTool_2,
  isDeferredToolInConversation,
  DEFERREDTOOLPLACEHOLDER,
} from "../../tools/ToolSearchTool/prompt.js";
import { SYNTHETIC_MODEL, NO_CONTENT_MESSAGE } from "../../constants/messages.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
  getDynamicConfig_BLOCKS_ON_INIT,
} from "../analytics/growthbook.js";
import {
  isFallbackMessage,
  isBase64ImageBlock,
  replaceUnsupportedMediaAt,
  replaceLastUnsupportedMedia,
} from "../../utils/messages/apiMediaNormalization.js";
import { roughTokenCountEstimationForContent, roughTokenCountEstimation } from "../tokenEstimation.js";
import {
  classifyQuerySource,
  isAutoModeQuerySource,
  InvalidRequestHeaderValueError,
  getCcrSenderAddressKey,
  prefetchCcrSenderAddress,
  canSendWigglyDoveHeader,
  isMainOrAgentQuerySource,
} from "./requestHeaders.js";
import {
  keepaliveRequestIds,
  releaseKeepaliveChain,
  getModelSwitchCount,
  evaluateCacheKeepalive,
  onKeepaliveHeaderRejected,
  onMainResponseEnd,
} from "./cacheKeepalive.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import {
  foundrySupportsCapability,
  parseFoundryUnsupportedCapabilities,
  recordFoundryUnsupportedCapabilities,
  stripUnsupportedFoundryCapabilities,
  getFoundryRetryDirective,
  FAIL_FOUNDRY_PURPOSE_REQUEST,
} from "./foundryCapabilities.js";
import { uniq, count } from "../../utils/collections.js";
import {
  countCodePoints,
  CONTROL_CHARS_EXCEPT_WS_RE,
  containsMalformedStringDeep,
  repairMalformedStringsDeep,
  plural,
} from "../../utils/stringUtils.js";
import { logForDebugging, getMinDebugLogLevel, createAttachmentMessage_2 } from "../../utils/debug.js";
import { createApiSystemMessage, joinParts } from "../../utils/messages/systemMessages.js";
import { getDateTimeFormat } from "../../utils/intl.js";
import {
  APIError,
  APIConnectionError,
  APIUserAbortError,
  APIConnectionTimeoutError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import {
  extractNestedErrorMessage,
  amazonRequestId,
  apiErrorCode,
  getApiErrorCode,
  extractConnectionErrorDetails,
  TRANSIENT_SOCKET_CODES,
  UNREACHABLE_ERROR_CODES,
  isStreamSuspendedError,
  reducibleErrorCode,
  isConnectionError,
  summarizeApiError,
} from "./errorUtils.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  isFirstPartyApiBackend,
  assumesFirstPartyBaseUrl,
  getAPIProvider,
  isFirstPartyAnthropicHost,
  isActualFirstPartyAnthropicBaseUrl,
  isGenuineBedrockEndpoint,
  isFirstPartyAnthropicBaseUrl,
  getProviderForModel,
  getAPIProviderForAnalytics,
  isFirstPartyProvider,
} from "../../utils/model/providers.js";
import { getCachedClientData, getGlobalConfig, getOrCreateUserID } from "../../utils/config.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, string, int as int_2, union } from "../../../vendor/zod/v4/classic/schemas.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import {
  streamFallbackWarning,
  CONVERSATION_RESET_KINDS,
  decideStreamFallbackWarning,
  formatZodErrors,
} from "./streamFallbackWarning.js";
import { isFirstPartyBaseUrl, getApiBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import {
  isBetaRejected as isBetaRejected_2,
  markBetaRejected,
  markDeclaredToolsDecided,
  setDeclaredTools,
  mediaItemCapForModel,
  markBetaSent,
  isBetaSent,
  forgetBeta,
  resetDeclaredTools,
  markWebSearchHistoryRejected,
  setMediaItemCap,
  clearMediaItemCap,
  addNameOnlyAnnouncements,
  forkStickyBetaLatches,
} from "../../bootstrap/stateSlices.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { modelCapabilitiesEnvEntry } from "../../utils/model/modelCatalog.js";
import { isUnresolvedInferenceProfile, getInferenceProfileBackingModel } from "../../utils/model/bedrock.js";
import { claimOnce, isVerificationRequiredError } from "./verificationRequired.js";
import { anyModelDescribed } from "../../utils/model/modelCatalog/catalogCapabilities.js";
import { logEvent } from "../analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { agentTypeForTelemetry, buildAttribution } from "../analytics/metadata.js";
import { jsonStringify, jsonParse, clone } from "../../utils/slowOperations.js";
import { writeToStderr } from "../../utils/process.js";
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";
import { WAITFORMCPSERVERS, markDeclared } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { lit as lit_2, fromEnumOpt, fromEnum, fromNumber } from "../analytics/safeMetadata.js";
import { safeParseJSON } from "../../utils/json.js";
import { getDefaultHaikuModel } from "../../utils/model/planModeModel.js";
import {
  hasDedicatedSmallFastModel,
  getSmallFastModel,
  getBareCheckModel,
  unlessManagedDeniedModel,
  ladderStepLosesContext,
  isNonCustomOpusModel,
  isNonCustomFableModel,
  isNonCustomMythosModel,
} from "../../utils/model/smallFastModel.js";
import {
  getMainLoopModel,
  getDefaultSonnetModel,
  getDefaultOpusModel,
  isFableModelValue,
  isPinnedFableModel,
  isMythosModelValue,
  toProviderWireModelId,
  SECONDARY_CONTEXT_WINDOW,
} from "../../utils/model/model.js";
import {
  isClaudeAISubscriber,
  isWIFDispatchAuth,
  getAuthenticatedAccountInfo,
  getOauthAccountInfo,
} from "../../utils/auth.js";
import {
  getCurrentLimits,
  getLimitsAccountEpoch,
  extractQuotaStatusFromHeaders,
  extractQuotaStatusFromError,
  beginUsageLimitWait,
  extractGraceStatusFromHeaders,
} from "../claudeAiLimits.js";
import {
  CACHE_TTL_5M_MS,
  CACHE_TTL_1H_MS,
  recordPromptCacheUsage,
  MAIN as MAIN_2,
  getCacheCreationTtl,
  touchPromptCache,
  fingerprintMessagesForCache,
  recordPromptState,
  recordMessageHistory,
  getPendingChangeSummary,
  flushMessageOutlines,
  checkResponseForCacheBreak,
  logCacheDiagnosisReceived,
} from "./promptCacheBreakDetection.js";
import { returnValue_2 } from "../../utils/generators.js";
import {
  withRetry,
  CannotRetryError,
  FallbackTriggeredError,
  is529Error,
  isSpeedParameterUnsupportedError,
  isNonFallbackError,
  getMaxRetriesFromEnv,
  getMaxSleptThrough,
  getMaxReconnects,
  MAX_529_RETRIES,
  retryWatchdogEnv,
  isRetryWatchdogOn,
  isFastModeNotEnabledError,
  parseMaxTokensContextOverflowError,
  isNon529ServerError,
  RETRY_POLICY_CONST_1,
  RETRY_POLICY_CONST_HYN,
  MAX_OUTPUT_FILTERED_RETRIES,
  getRetryDelay,
  RETRY_POLICY_CONST_JEE,
} from "./withRetry.js";
import {
  getAnthropicClient,
  getApiTimeoutMs,
  CLIENT_REQUEST_ID_HEADER,
  isStreamWatchdogApplicable,
  checkSuspendedStreamIdle,
  armFirstByteWatchdog,
  shouldUseBodyIdleWatchdog,
  getStreamIdleTimeoutMs,
  getByteIdleTimeoutForProvider,
  StreamIdleTimeoutError,
  StreamSuspendedError,
} from "./client.js";
import {
  mainAgentContext,
  isMainAgent,
  isSubagentContext,
  isMainConversationContext,
  getBackgroundAgentId,
  turnAttributionKeyFor,
} from "../../utils/agentContext.js";
import {
  reorderByApiBlockIndex,
  isResendableClientApiError,
  getPromptId,
  memoryRedactionIndex,
  unionSets,
  getAdvisorStrippedMessageIds,
  stripForeignModelThinking,
  makeForeignModelChecker,
  shouldKeepForeignThinking,
  hasThinkingSignature,
  resolveReminderFold_2,
  renderedAttachmentTexts,
  stripToolReferenceBlocksFromUserMessage,
  stripCallerFieldFromAssistantMessage,
  ensureToolResultPairing,
  stripAdvisorBlocks,
  normalizeMessagesForAPI,
  createApiErrorMessage,
  thinkingStripAllPlan,
  mergeMinMaps,
  normalizeFallbackBlocks,
  hasFallbackBlocks,
  lastFallbackModel,
  attachmentToMessages,
  createInformationalSystemMessage,
  stripThinkingFromPoint,
  stripAllThinking,
  normalizeContentFromAPI,
  isPingStreamEvent,
  createSystemAPIErrorMessage,
  createUserMessage,
} from "../../utils/messages.js";
import { withStreamVCR, withVCR } from "../vcr.js";
import { recoverRegimeRefusal, isRegimeRefusal } from "./regimeRefusal.js";
import { hasLspEverConnected, getInitializationStatus } from "../lsp/manager.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import {
  getSpanId,
  getUpstreamTraceparent,
  recordLlmRequestAttempt,
  startLLMRequestSpan,
} from "../../utils/telemetry/sessionTracing.js";
import {
  shouldSendGatewayHintHeaders,
  isLowPriorityActiveSafe,
  recordLowPriorityServed,
  planLowPriorityRetry,
} from "../lowPriority/lowPriorityMode.js";
import {
  X_CC_CONTEXT_COMPACTED,
  X_CLAUDE_CODE_CONTEXT_COMPACTED,
  X_CC_COMPACTION_REQUEST,
  X_CLAUDE_CODE_COMPACTION,
  X_CLAUDE_CODE_PREV_TOOL_DURATIONS,
} from "./compactionHeaders.js";
import {
  describeResponseHeaders,
  connectionSetupFacts,
  UnexpectedApiResponseError,
  classifyApiErrorKind,
  alwaysFalseResponseDiag,
  alwaysFalseD,
  alwaysFalseB,
  normalizeStreamEventType,
  responseDiagnosticFields,
  requestIdFromHeaders,
} from "./responseDiagnostics.js";
import { systemClock, sleep } from "../../utils/sleep.js";
import {
  MAX_OUTPUT_TOKENS_CAP as MAX_OUTPUT_TOKENS_CAP_2,
  MEDIA_BYTE_CAP_MIN,
  MEDIA_TOTAL_BYTES_ANTHROPIC,
  MEDIA_TOTAL_BYTES_DEFAULT,
  DOCUMENT_TOTAL_BYTES_DEFAULT,
  MAX_MEDIA_ITEMS_LARGE_CONTEXT,
  MAX_MEDIA_ITEMS,
  MEDIA_BYTES_PER_ITEM_SLACK,
  MEDIA_ITEM_COUNT_FALLBACKS,
} from "../../utils/truncateGraphemes.js";
import {
  deferredToolNameOf,
  countToolCallsSince_2 as countToolCallsSince_2_3,
  registerMcpStandardKeys,
  seedDeferredToolReferences,
  shouldTrackDeferredToolForQuery,
  deferredToolCache,
  logKeptDeferredTools,
  buildDeferredToolsForRequest,
  recordDeferredToolsSent,
  restoreDeferredDefinitions,
  areDeferredToolsKept,
  strippedToolReferences,
  keepDepartedDeferredTools,
} from "./deferredToolsState.js";
import {
  isValidAPIMessage,
  classifyAPIError,
  getAssistantMessageFromApiError,
  FABLE_HIGH_LOAD_MESSAGE,
  OPUS_HIGH_LOAD_MESSAGE,
  ADVISOR_20260301,
  isInvalidBetaFlagError,
  isSafeguardsRejected,
  normalize422To400,
  isBetaRejected,
  isBetaHeaderRejected,
  isThinkingDisplayRejected,
  isClientVersionRejected,
  classifyFallbackCreditError,
  classifyServerFallbackError,
  isKeptReminderClearAtRejected,
  isTetherBetaRejected,
  headerlessDeclineKind,
  headerlessDeclineRetryDelay,
  isAdvisorModelMismatchError,
  isMidConversationSystemRejected,
  isWebSearchContentRejected,
  isCodeExecutionOutputRejected,
  isAfkModeBetaRejected,
  isAdvisorResultUnprocessable,
  isAdvisorUnavailableError,
  getMediaErrorFromApiError,
  getRejectedBetas,
  BETA_REJECTION_MATCHER_KEYS,
  isCacheKeepaliveBetaRejected,
  isThinkingResumptionBetaRejected,
  isThinkingBindingRejected,
  getRejectedThinkingType,
  isInvalidThinkingSignatureError,
  isToolChangeRejected,
  isInlineToolDefinitionRejected,
  isCacheControlFieldRejected,
  isOutputConfigRejected,
  isOutputTimingRejected,
  isEffortUnsupportedError,
  isStructuredOutputsUnsupported,
  isAdvisorBetaRejected,
  getAdvisorRefusalScope,
  isUnprocessableRequest,
  classifyToolChangeError,
  classifyInlineToolDefinitionError,
  getMidConvSystemRejection,
  isPerTurnEffortRejected,
  mentionsThinkingBindingBeta,
  isBetaListedAsUnexpected,
  isContext1mBetaRejected,
  isConversationBindingError,
  parseThinkingPrefixMismatchHeader,
  markPrefixLockHealDeclined,
  getRefusalMessage,
  isDlpRequestDenied,
  alwaysFalseErrors,
  isRequestTooLargeError_2,
  API_ERROR_MESSAGE_PREFIX,
  DLP_REQUEST_DENIED,
  SAFETY_MONITOR_BLOCKED,
} from "./errors.js";
import { has1mSuffix_2, modelHasNative1MContext, uses1mContext } from "../../utils/model/contextWindow1m.js";
import {
  readFallbackCreditToken,
  pickFallbackBeta,
  TENGU_DASH_FLAME,
  TENGU_ELEGANT_POSSUM,
  serverFallbackPlan,
  applyRefusalFallbackBeta,
  isFallbackNotification,
  parseFallbackMessage,
  fallbackNotification,
  parseFallbackBlockStart,
  isUnreadableFallbackBlock,
  isFallbackReason,
  hasNonTextContent,
  fallbackMessagesCost,
  preferSameModel,
} from "./modelFallback.js";
import {
  isFastModeEnabled,
  isFastModeAvailable,
  supportsFastMode,
  isFallbackModelFastRejected,
  isFastModeCooldown,
  wasEverFastRejected,
  markFallbackModelFastRejected,
} from "../../utils/fastMode.js";
import {
  getTurnOrigin,
  getTurnPosition,
  isSessionTaskTurn,
  getTurnStartOriginKind,
} from "../../utils/messages/promptOrigin.js";
import { isLiveMemoryTool, createMemoryServerVerifier } from "../mcp/memoryServerVerification.js";
import { isBase64ImageBlock as isBase64ImageBlock_3 } from "../../utils/imageValidation.js";
import { getResolvedWIFBaseUrlSnapshot } from "../oauth/wifCredentials.js";
import {
  getVertexRegionForModel,
  parseIntLoose,
  nonEmptyOrUndefined,
  isEnvTruthy,
} from "../../utils/envUtils.js";
import {
  ADVISOR_TOOL_NAME,
  isAdvisorEnabled,
  isAdvisorToolEnabled,
  getAdvisorModelForQuery,
  markAdvisorRefusedForProcess,
  markAdvisorRefusedForHost,
  parseAdvisorToolError,
  parseAdvisorResult,
  setAdvisorBaseUrlGetter,
} from "../../utils/advisor.js";
import { getSonnet46ContextWindowOverride } from "../../utils/model/configs.js";
import { antGrants1MContext } from "../../utils/model/classifierModel.js";
import {
  shouldEchoWireToolInputs,
  shouldEchoWireToolInputsForRequest,
  adoptWireToolInputCopies,
  wireInputSources,
  captureWireToolInputs,
  logWireToolInputParseFailure,
  countToolCallsSince_4,
} from "../../utils/wireToolInputEcho.js";
import {
  isAccountMemoryRedactionOn,
  validateImagesInMessages,
  redactAccountMemory,
} from "../../utils/messages/accountMemory.js";
import { logSessionNoticeRender } from "../../utils/messages/ccrSessionNotice.js";
import { logDeclaredRound } from "../../utils/pollEvents/declarations.js";
import {
  isStellarDriftEnabled,
  prefetchToolDescribeHooks,
  toolToApiDefinition,
  shouldEnableWebSearchCitations,
  isNotLegacyClaude3,
  normalizeToolInput_2,
  markRootRequestSent,
  splitSysPromptPrefix,
  logAPIPrefix,
} from "../../utils/api.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import {
  queryCheckpoint,
  startProfilePhase,
  endProfilePhase,
  closeProfile,
  openProfileStream,
  endQueryProfile,
  noteRedrive,
} from "../../utils/queryProfiler.js";
import { estimateTokensWithAnchor } from "../compact/autoCompact.js";
import { bytesPerTokenForModel, renderModelName } from "../../utils/model/modelDisplay.js";
import { stripInProgressAssistantMessage } from "../../commands/btw/btw.js";
import {
  hasFallbackLadders,
  recordConversationSize as recordConversationSize_2,
  resolveFallbackModel,
} from "../../utils/model/modelUnavailability.js";
import { isRefusedOrSentModel, classifyProviderErrorForModel } from "../../utils/model/modelAccessCheck.js";
import { withCatalogSuppressed } from "../../utils/model/modelCatalog/servedCatalog.js";
import { blockedOverrideText } from "../../utils/model/modelErrorOverrides.js";
import { collectRecentAssistantTexts } from "../../commands/copy/copy.js";
import { isDynamicModelConfigEnabled, awaitModelConfigFetch } from "../../utils/model/dynamicModelConfig.js";
import {
  seedWireShapeFromRecord,
  threadSourceKind,
  noteLastDispatchHealed,
  isStatelessTetherModel,
  isTeleportCacheActiveRoot,
  isThreadsHeldForClassifier,
  isThreadHeldStateless,
  canUseNoTransientReminders,
  classifyThreadError,
  logTetherDecisionSafely,
  isSubagentOrUnknown,
  auditTetherEchoSafely,
  buildTetherDelta,
  hasStructuralEchoDiff,
  logTetherEchoAudit,
  checkTetherPrefixMismatch,
  createSentPrefixChecker,
  reportThinkingDrop,
  refetchStaleClientData,
  liftEphemeralReminders,
  buildWireWithClearAt,
} from "./tether.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { awaitArtifactRosterSafe } from "../artifacts/rosterWait.js";
import {
  isToolSearchEnabled,
  toolSearchToolFilteredOut,
  isToolDefinedByValueEnabled,
  getNonDeferrableBuiltins,
  extractDiscoveredToolNames,
  collectToolReferences,
} from "../../utils/toolSearch.js";
import { deltaToolNames, deferredToolNames, isDeferredCustomToolDefinition } from "./toolDefinitionShape.js";
import {
  alwaysFalseFeed,
  identityValue as identityValue_2,
} from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { hideAliasedV1Tools, isBatchToolsUse } from "../tools/batchTools.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  noteToolRedescribed,
  applyRefusedToolSchemas,
  ToolSchemaWireCache,
  isFoamySpringWireOn,
  emptyObject,
} from "./toolSchemaWire.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { noteBackgroundStopNoticeSent } from "../../tools/AgentTool/backgroundGates.js";
import { getDeferredToolPlaceholderSchema } from "../../tools/ToolSearchTool/deferredToolPlaceholder.js";
import {
  noopRecordSentPrefix,
  takeTail,
  noopLedger,
  prefixLedgerNotice,
  noopNotice,
  noopRecordRequest,
} from "./promptPrefixLedger.js";
import {
  isTetherLive,
  isKeptReminderModeNotOff,
  noteClearAtProbeFailure,
  hasClearAtProbeBudget,
  hasThreadsProbeBudget,
  noteThreadsProbeFailure,
  retireKeptReminder,
  disableTetherLiveGate,
  logKeptReminderOk,
} from "./keptReminder.js";
import {
  resolveLoopEffort,
  classifyEffortCarryEffect,
  getRefusedEffortCarry,
} from "../../utils/permissions/permissionSetup.js";
import { sessionTimeZone } from "../../utils/sessionTimeZone.js";
import { computeFingerprintFromMessages } from "../../utils/fingerprint.js";
import { getCLISyspromptPrefix, getAttributionHeader } from "../../constants/system.js";
import { isBetasSwitchSetAside } from "../../utils/permissions/serverClassifier/flags.js";
import {
  getClassifierProviderKind,
  isServerClassifierUnsupported,
  settleServerClassifierResult,
  settleServerStreamEnded,
  createServerClassifierResult,
  getExactMcpAllowRules,
  DANGEROUS_TOOL_USE_2,
  classifierResultPayload,
  settleServerNoResult,
} from "../../utils/permissions/serverClassifier/results.js";
import {
  isAutoModeActive,
  isAutoModeCircuitBroken,
  isAutoClassifierActive,
  setAutoModeActive,
  setAutoModeCircuitBroken,
} from "../../utils/permissions/autoModeState.js";
import { hashToolNames } from "../../utils/model/modelCatalog/maskedIds.js";
import {
  planToolResultClearingAfterIdle,
  addClientEstimatedClearedTokens,
  recordIdleClearingServerReport,
} from "../compact/microCompact.js";
import {
  canUseServerClassifier,
  isArbiterWithFallbackActive,
} from "../../utils/permissions/serverClassifier/arbiter.js";
import { isBetaTracingEnabled } from "../../utils/telemetry/betaSessionTracing.js";
import { logApiRequestBody } from "../../utils/telemetry/otelRawBodies.js";
import { replayTranscriptRequest } from "../../utils/transcriptRequestBlobs.js";
import { emptySuspendState, ANTHROPIC_USAGE_LIMIT, SLOW } from "../lowPriority/headers.js";
import { applyMockHeaders } from "../mockRateLimits.js";
import { preflightRateLimit } from "./rateLimitPreflight.js";
import { hasStringFormat } from "../../utils/mcp/elicitationValidation.js";
import {
  markInsertedTextProvenance,
  markHumanReplyProvenance,
  describeForwardedTurns,
  buildContextSectionsMessage,
} from "../../utils/messages/apiNormalization.js";
import {
  buildServerClassifierRequestContext,
  collectPriorServerContexts,
  recordClassifierRequest,
  pickPriorTurnContext,
} from "../../utils/permissions/serverClassifier/context.js";
import { checkInsertedTextShed } from "../../utils/cronFireTexts.js";
import { maxOutputTokensMinusOne } from "../../screens/Doctor.js";
import { canResumeThinking, markAbandonedThinking } from "./thinkingResumption.js";
import { getAPIContextManagement } from "../compact/apiMicrocompact.js";
import {
  logAPIQuery,
  logApiRefusal,
  logAPIError,
  safeRequestContentStats,
  sentImageStats,
  requestPrefixStats,
  logAPISuccessAndDuration,
} from "./logging.js";
import { EMPTY_USAGE } from "./emptyUsage.js";
import { addToTotalSessionCost } from "../../cost-tracker.js";
import { calculateUSDCost, parseUsageIterations } from "../../utils/modelCost.js";
import {
  decideAttemptOutcome,
  eagerRainShadowBudget,
  collectDroppedThinkingHashes,
  buildThinkingDropAttachment,
  classifyStreamFailure,
  classifyAttemptOutcome,
} from "./attemptDecision.js";
import { mRe, $jo } from "../../../vendor/@anthropic-ai/sdk/lib/internal/tracing/response.mjs";
import {
  resolveRefusalFallbackRoute,
  isSameModel,
  pickFallbackModel,
  canonicalModelKey,
  noopDialogHost,
  logFallbackRouteOutcome,
  describeFallbackRoute,
  hasRefusalFallbackTarget,
  isRefusalFallbackEnabled,
  isSwitchModelsOnFlagDisabled,
  classifyFallbackOrigin,
} from "./refusalFallback.js";
import {
  hasFallbackLatch,
  hasConvoluteArcadesFlag,
  getFallbackLatchKind,
  X_CC_FALLBACK_FROM_MODEL,
  X_CC_FALLBACK_CATEGORY,
  X_CC_FALLBACK_TRIGGER,
  X_CC_ORIGINAL_REQUEST_ID,
  sanitizeHeaderValue as sanitizeHeaderValue_2,
  hasTenderQuiltHeader,
} from "./refusalFallbackHeaders.js";
import { isMainQueryCompaction } from "../compact/postCompactCleanup.js";
import { formatToolDurationsHeader } from "../../components/messages/SystemTextMessage.js";
import { startSessionActivity, endActivity } from "../../utils/sessionActivity.js";
import { headlessProfilerCheckpoint } from "../../utils/headlessProfiler.js";
import { recordApiRequestSentFromSpawn } from "../../utils/startupTiming.js";
import { takeDispatchAtGzip } from "./gzipRequestBody.js";
import { warmHarnessPatterns } from "../../utils/harnessTagGate.js";
import {
  takesRequestBodyBytes,
  checkIncrementalRequestBody,
  reportIncrementalBodyMismatch,
} from "./incrementalRequestBody.js";
import { buildMediaRemovedError } from "./mediaErrors.js";
import {
  StreamMalformedEventError,
  StreamTruncatedError,
  StreamNoEventsError,
  classifyStreamError,
} from "./streamErrors.js";
import { internalName } from "../mcp/serverIdentity.js";
import { THINKING_BARE_WIDTH } from "../../components/Spinner/SpinnerAnimationRow.js";
import { tokenCountFromLastAPIResponse } from "../../utils/tokens.js";
import { totalTokensOf } from "../../utils/messages/usageAndStopReason.js";
import { isFirstPartyTelemetryBlocked } from "../../utils/hostEnvironment.js";
import { getToolNameKinds } from "../../tools/SkillTool/SkillTool.js";
import { sessionHasOwnFallback, buildAvailabilityFallbackChain } from "../../utils/model/modelFallback.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { parseAttributionProject } from "../../utils/attributionProject.js";
import { getParentSessionId } from "../../utils/teammate.js";
import { getControlRequestSubtype_2 } from "../../bridge/attestationGate.js";
import { MUTATING_CONTROL_SUBTYPES, getControlRequestSubtype } from "../../bridge/controlRequests.js";
import { getModelMaxOutputTokens } from "../../utils/context.js";
import { validateBoundedIntEnvVar } from "../../utils/envValidation.js";

//@ chunk-e6aww6q8.js:445621-445714 fingerprint = isToolResultBlock (0.745)
/**
 * user 消息里所有 tool_result 的 tool_use_id。旧版名 isToolResultBlock 不准确。
 */
function getToolResultIds(block) {
  return block.type === "user"
    ? collectBlockFieldsByType(block.message?.content, "tool_result", "tool_use_id")
    : [];
}
//@ chunk-e6aww6q8.js:445714-445862 placement
/**
 * 从内容数组里取指定 type 块的某个字符串字段（如 tool_use 的 id、tool_result 的 tool_use_id）。
 */
function collectBlockFieldsByType(content, n, r) {
  if (!Array.isArray(content)) return [];
  let s = [];
  for (let h of content)
    if (isPlainObject_5(h) && h.type === n) {
      let y = h[r];
      if (typeof y === "string") s.push(y);
    }
  return s;
}
//@ chunk-e6aww6q8.js:2077127-2077220 placement
function buildContextTokensFields(toModel) {
  let n = getLastMainThreadContextTokens() ?? 0;
  return {
    context_tokens: n,
    prompt_cache_warm: isMainThreadSource([]),
    ...estimateCacheWriteCost(toModel, n),
  };
}
//@ chunk-e6aww6q8.js:2476386-2476451 placement
/**
 * 导出函数 `canonicalNameOrUndefined`：参数 e，返回 Vpr(e, getCanonicalName(e)); } catch (error) { logError(toError(error)); return; }。
 */
function canonicalNameOrUndefined(model) {
  try {
    return usesPerTurnEffortBeta(model, getCanonicalName(model));
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2476451-2476516 placement
/**
 * 导出函数 `ultrathinkEffectiveSafely`：参数 e, n，返回 isUltrathinkEffective(e, n()); } catch (error) { logError(toError(error)); return; }。
 */
function ultrathinkEffectiveSafely(model, readSessionEffort) {
  try {
    return isUltrathinkEffective(model, readSessionEffort());
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2476516-2476650 placement
function notifyPerTurnEffortInactive(e, n) {
  try {
    if (!n && hasContextBeta(e))
      enqueueTaskNotification_2({
        type: "system",
        subtype: "per_turn_effort_changed",
        per_turn_effort_active: false,
      });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2476650-2476715 placement
function thinkingDisplayUpdatesEnabled() {
  return env.CLAUDE_CODE_THINKING_DISPLAY_UPDATES ?? true;
}
//@ chunk-e6aww6q8.js:2476715-2476938 placement
function thinkingDisplayMode(display, n) {
  if (display === "summarized" || display === "highlights") return "thinking_and_connector_text";
  if (display === "omitted" && !n) return "none";
  if (display !== "omitted" && showThinkingSummaries()) return "thinking_and_connector_text";
  return thinkingDisplayUpdatesEnabled() ? "connector_text" : "none";
}
//@ chunk-e6aww6q8.js:2476938-2476991 placement
/**
 * 导出函数 `shouldSendInterleavedThinkingBeta`：参数 e，返回 ( !areExperimentalBetasDisabled() && modelSupportsISP(e) && (shouldIncludeFirstPartyOnlyBetas() || modelHidesT…。
 */
function shouldSendInterleavedThinkingBeta(model) {
  return (
    !areExperimentalBetasDisabled() &&
    modelSupportsISP(model) &&
    (shouldIncludeFirstPartyOnlyBetas() || modelHidesThinkingByDefault(model))
  );
}
//@ chunk-e6aww6q8.js:2476991-2477053 placement
function hasThinkingDisplayProbesLeft() {
  return (getSessionFeatureValues().thinkingDisplayProbeFailures ?? 0) < 2;
}
//@ chunk-e6aww6q8.js:2477053-2477148 placement
function noteThinkingDisplayProbeFailure() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.thinkingDisplayProbeFailures =
    (sessionFeatureValues.thinkingDisplayProbeFailures ?? 0) + 1;
}
//@ chunk-e6aww6q8.js:2495003-2495042 placement
var computerToolRelayModule = require("./chunk-s5mxraj2.js");
//@ chunk-e6aww6q8.js:2495042-2495128 placement
function isClaudeAiAlwaysLoadMcpTool(e) {
  return e.isMcp === true && e.alwaysLoad === true && e.mcpInfo?.scope === "claudeai";
}
//@ chunk-e6aww6q8.js:2495128-2495583 placement
/**
 * 计算本次请求声明的工具集（DeclaredToolSet）：启用 ToolSearch 时排除延迟加载的工具（CLAUDE_CODE_UPFRONT_TOOLS 中的可提前声明）；条件不满足返回 undefined。
 */
function computeDeclaredToolSet(betas, tools, isDeferred, context, upfront = false) {
  let y = betas === getStickyBetas();
  let S = (Z) =>
    !betas.declaredToolsDecided &&
    (isClaudeAiAlwaysLoadMcpTool(Z) ||
      (y && computerToolRelayModule?.isLinkedComputerToolShownOnRelay(Z, betas, context) === true));
  let w = turnDeniedTools(tools, betas);
  let L = w !== tools;
  let G = (Z) =>
    Z.mcpInfo?.scope !== "claudeai" && toolMatchesAnyName(Z, env.CLAUDE_CODE_UPFRONT_TOOLS ?? []);
  let q = upfront && !betas.declaredToolsDecided && w.some((Z) => G(Z) && isDeferred(Z));
  if (
    (L ? betas.declaredTools !== undefined : betas.declaredToolsDecided) ||
    !isFoamySpringEnabled_2() ||
    (!L && !q && !tools.some(S)) ||
    !tools.some((tool) => toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME))
  )
    return;
  return new DeclaredToolSet(w.filter((Z) => (!isDeferred(Z) || (q && G(Z))) && !S(Z)));
}
//@ chunk-e6aww6q8.js:2512232-2512247 placement
var MSG = "msg_";
//@ chunk-e6aww6q8.js:2512247-2512432 placement
function isRealApiResponse(e) {
  if (e.isApiErrorMessage) return false;
  if (e.requestId) return true;
  if (e.isVirtual) return false;
  let id = e.message?.id;
  return typeof id === "string" && id.startsWith(MSG) && e.message?.model !== SYNTHETIC_MODEL;
}
//@ chunk-e6aww6q8.js:2512432-2512602 placement
function lastAssistantMessageId(messages) {
  try {
    for (let idx = messages.length - 1; idx >= 0; idx--) {
      let r = messages[idx];
      if (r.type === "assistant" && isRealApiResponse(r)) {
        let id = r.message?.id;
        if (typeof id === "string") return id;
      }
    }
  } catch (error) {
    logError(error);
  }
  return;
}
//@ chunk-e6aww6q8.js:2533632-2533686 placement
/**
 * 导出函数 `isBasaltSpurEnabled`：返回 canSendFirstPartyBetas() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_spur", !1)。
 */
function isBasaltSpurEnabled() {
  return canSendFirstPartyBetas() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_spur", false);
}
//@ chunk-e6aww6q8.js:2533686-2533737 placement
function isExtractMemoriesSkipCacheWrite(querySource, n) {
  return querySource === "extract_memories" && n;
}
//@ chunk-e6aww6q8.js:2533737-2533792 placement
function isBasaltScarpEnabled() {
  return canSendFirstPartyBetas() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_scarp", false);
}
//@ chunk-e6aww6q8.js:2533792-2533974 placement = hasThinkingContent (1)
function isRenderableContentBlock(e, n) {
  if (e.type === "text") {
    if (typeof e.text !== "string" || e.text === "") return false;
    return !n || e.text.trim() !== "";
  }
  return e.type !== "thinking" && e.type !== "redacted_thinking" && !isFallbackMessage(e);
}
//@ chunk-e6aww6q8.js:2533974-2534124 placement
function lastBlockIsRenderable(e, whitespaceTextUnstampable) {
  if (e.type !== "assistant") return true;
  let content = e.message.content;
  if (typeof content === "string") return true;
  let last = content.at(-1);
  return last !== undefined && isRenderableContentBlock(last, whitespaceTextUnstampable);
}
//@ chunk-e6aww6q8.js:2534124-2534476 placement
/**
 * 缓存标记尾部审计的默认条件、跳过 cache_control 的原因编码表和相关上限。
 */
var DEFAULT_TAIL_AUDIT_TERMS = {
  proxyDemoted: false,
  experimentalBetasDisabled: false,
  simulateProxyUsage: false,
  skipMessageCacheMarkers: false,
};
var CACHE_SKIP_REASON_CODES = {
  none: 0,
  sent_once_text: 1,
  request_scoped_user: 2,
  unstampable_tail: 3,
  experimental_betas_disabled: 4,
  proxy_demoted: 5,
  fork_tail_skip_cache_write: 6,
  no_message_markers: 7,
  caching_off: 8,
  sent_once_oversized: 9,
  sent_once_mislabeled: 10,
  unexcused: 11,
};
var MAX_TAIL_AUDIT_ITEMS = 256;
//@ chunk-e6aww6q8.js:2534476-2535974 placement
/**
 * 计算消息上的缓存断点位置：末尾可渲染消息（可移到末尾 api_system）、分叉点/父回复前的第二个断点、fork 缓存钉；返回断点集合与审计尾部的函数。
 */
function pickCacheMarkerIndices({
  messages,
  enablePromptCaching,
  skipCacheWrite,
  forkPointUuid,
  canMarkApiSystem,
  forkCachePin,
  whitespaceTextUnstampable,
  topLevelCacheControl,
  isForkPinStepBackEnabled,
  divergesAtMessageId,
  parentReplyId,
  tailAuditTerms = DEFAULT_TAIL_AUDIT_TERMS,
}) {
  let isRenderable = (It) => lastBlockIsRenderable(It, whitespaceTextUnstampable);
  let isSkippable = (It) =>
    It.type === "api_system" || (It.type === "user" && It.ephemeral === true) || !isRenderable(It);
  let lastCacheableBefore = (It) => {
    let Yt = It;
    while (Yt >= 0 && isSkippable(messages[Yt])) Yt--;
    return Yt;
  };
  let tailIndex = lastCacheableBefore(messages.length - 1);
  if (skipCacheWrite) tailIndex = lastCacheableBefore(tailIndex - 1);
  let isMarkableApiSystem = (It, Yt) => {
    let candidate = messages[It];
    return (
      candidate !== undefined &&
      candidate.type === "api_system" &&
      !candidate.ephemeral &&
      !messages.slice(Yt + 1, It).some((message) => message.type === "user" && message.ephemeral === true) &&
      typeof candidate.message.content === "string" &&
      candidate.message.content.trim() !== ""
    );
  };
  let lastIndex = messages.length - 1;
  let lastIsApiSystem = isMarkableApiSystem(lastIndex, tailIndex);
  let tailMarkerIndex =
    canMarkApiSystem && enablePromptCaching && !skipCacheWrite && tailIndex >= 0 && lastIsApiSystem
      ? lastIndex
      : tailIndex;
  let markerIndices = new Set();
  if (tailMarkerIndex >= 0) markerIndices.add(tailMarkerIndex);
  let forkPointPinned = false;
  let divergeIndex =
    divergesAtMessageId === undefined || !enablePromptCaching
      ? -1
      : messages.findIndex(
          (message) => message.type === "assistant" && message.message.id === divergesAtMessageId,
        );
  let parentReplyIndex =
    parentReplyId === undefined || !enablePromptCaching
      ? -1
      : messages.findIndex((message) => message.type === "assistant" && message.message.id === parentReplyId);
  let parentIndex = divergeIndex >= 0 ? divergeIndex : parentReplyIndex;
  let parentPromptEnd = parentIndex <= 0 || topLevelCacheControl ? -1 : lastCacheableBefore(parentIndex - 1);
  let parentMarkerIndex =
    canMarkApiSystem && parentPromptEnd >= 0 && isMarkableApiSystem(parentIndex - 1, parentPromptEnd)
      ? parentIndex - 1
      : parentPromptEnd;
  let marksParent = parentMarkerIndex >= 0 && parentMarkerIndex < tailMarkerIndex;
  if (marksParent) markerIndices.add(parentMarkerIndex);
  if (forkCachePin && !topLevelCacheControl && !marksParent) {
    if (forkPointUuid) {
      let lastIndex = messages.findLastIndex((message) => message.uuid === forkPointUuid);
      if (lastIndex >= 0 && lastIndex <= tailIndex) {
        let Yt =
          skipCacheWrite && lastIndex === tailIndex && isForkPinStepBackEnabled()
            ? lastCacheableBefore(lastIndex - 1)
            : isRenderable(messages[lastIndex])
              ? lastIndex
              : lastCacheableBefore(lastIndex - 1);
        if (Yt >= 0) {
          markerIndices.add(Yt);
          forkPointPinned = true;
        }
      }
    } else if (!skipCacheWrite) {
      let It = lastCacheableBefore(tailIndex - 1);
      if (It >= 0) {
        markerIndices.add(It);
        forkPointPinned = true;
      }
    }
  }
  let auditTail = () =>
    explainCacheControlSkip({
      messages,
      firstTailIndex: enablePromptCaching && tailMarkerIndex >= 0 ? tailMarkerIndex + 1 : 0,
      cachingOn: enablePromptCaching,
      skipCacheWrite,
      canMarkApiSystem,
      terms: tailAuditTerms,
      whitespaceTextUnstampable,
    });
  return {
    markerIndices,
    forkPointPinned,
    parentPromptEndMarked: parentReplyIndex === parentIndex && markerIndices.has(parentMarkerIndex),
    auditTail,
  };
}
//@ chunk-e6aww6q8.js:2535974-2537557 placement
/**
 * 说明本次请求为何没有写入缓存标记（缓存关闭、分叉尾部、代理降级、实验 beta 关闭等）。
 */
function explainCacheControlSkip({
  messages,
  firstTailIndex,
  cachingOn,
  skipCacheWrite,
  canMarkApiSystem,
  terms,
  whitespaceTextUnstampable,
}) {
  let w = messages.length - 1;
  if (!cachingOn)
    return {
      reason: terms.skipMessageCacheMarkers ? "no_message_markers" : "caching_off",
      messagesAfterMarker: messages.length,
      resentTailTokensEst: 0,
      sentOnceTailTokensEst: 0,
      unexcusedTailTokensEst: 0,
    };
  let L = skipCacheWrite ? "fork_tail_skip_cache_write" : undefined;
  let G = terms.proxyDemoted
    ? "proxy_demoted"
    : terms.experimentalBetasDisabled || terms.simulateProxyUsage
      ? "experimental_betas_disabled"
      : "unexcused";
  let lastIndex = messages.findLastIndex(
    (message, lt) => lt >= firstTailIndex && message.type === "assistant",
  );
  let Z = 0;
  let Se = 0;
  let unexcusedTailTokensEst = 0;
  let we = false;
  let Ee = "none";
  let Ae = (ze) => {
    if (CACHE_SKIP_REASON_CODES[ze] > CACHE_SKIP_REASON_CODES[Ee]) Ee = ze;
  };
  let Ie = (ze, lt) => {
    if (ze === 0) return;
    if (lt === "unexcused" || lt === "sent_once_oversized" || lt === "sent_once_mislabeled")
      unexcusedTailTokensEst += ze;
    Ae(lt);
  };
  let Me = (ze, lt) => {
    Se += ze;
    Ie(
      ze,
      L ??
        (lt ? "sent_once_mislabeled" : ze > MAX_TAIL_AUDIT_ITEMS ? "sent_once_oversized" : "sent_once_text"),
    );
  };
  let We = messages[firstTailIndex - 1];
  if (We?.type === "api_system" && We.ephemeralSuffix !== undefined)
    Me(roughTokensOfTrimmed(We.ephemeralSuffix), false);
  for (let ze = firstTailIndex; ze <= w; ze++) {
    let lt = messages[ze];
    if (lt.type === "api_system") {
      let content = lt.message.content;
      Me(
        roughTokensOfTrimmed(lt.ephemeral ? content : (lt.ephemeralSuffix ?? "")),
        lt.ephemeral === true && hasFoldedAttachmentEdits(lt),
      );
      if (lt.ephemeral) continue;
      let nt = roughTokensOfTrimmed(content);
      Z += nt;
      Ie(
        nt,
        L ??
          (ze < lastIndex
            ? "unstampable_tail"
            : we
              ? "request_scoped_user"
              : ze === w && !canMarkApiSystem
                ? G
                : "unexcused"),
      );
    } else if (lt.type === "user" && lt.ephemeral === true) {
      Se += roughTokenCountEstimationForContent(lt.message.content);
      we = true;
      Ae("request_scoped_user");
    } else {
      let Je = roughTokenCountEstimationForContent(lt.message.content);
      Z += Je;
      Ie(
        Je,
        L ??
          (lt.type === "assistant" && !lastBlockIsRenderable(lt, whitespaceTextUnstampable)
            ? "unstampable_tail"
            : "unexcused"),
      );
    }
  }
  return {
    reason: L ?? Ee,
    messagesAfterMarker: w - firstTailIndex + 1,
    resentTailTokensEst: Z,
    sentOnceTailTokensEst: Se,
    unexcusedTailTokensEst,
  };
}
//@ chunk-e6aww6q8.js:2537557-2537777 placement
function hasFoldedAttachmentEdits(e) {
  return (
    (e.foldedAttachmentSpans?.length ?? 0) > 0 ||
    (e.foldedAttachmentTypes?.length ?? 0) > 0 ||
    e.nameOnlyContent !== undefined ||
    (e.toolAdditions?.length ?? 0) > 0 ||
    (e.toolRemovals?.length ?? 0) > 0 ||
    e.toolDefinitions !== undefined
  );
}
//@ chunk-e6aww6q8.js:2537777-2537822 placement
function roughTokensOfTrimmed(e) {
  return e.trim() === "" ? 0 : roughTokenCountEstimation(e);
}
//@ chunk-e6aww6q8.js:2537822-2538195 placement
/**
 * 辅助查询（如保活）在头部开启且有第二个标记位时，找到父回复的消息 id，决定是否在父提示末尾加缓存标记。
 */
function parentReplyMarkPlan({ querySource, model, isKeepaliveHeaderOnWire, hasSecondMarkerSlot, messages }) {
  try {
    if (
      classifyQuerySource(querySource) !== "auxiliary" ||
      !isKeepaliveHeaderOnWire ||
      !hasSecondMarkerSlot ||
      isPromptEndMarkRefused()
    )
      return;
    for (let y of keepaliveRequestIds(model)) {
      let found = messages.find((message) => message.type === "assistant" && message.requestId === y);
      if (found?.type === "assistant")
        return {
          querySource,
          parentReplyId: found.message.id,
          isMarkWanted: getFeatureValue_CACHED_MAY_BE_STALE("tengu_mellow_beacon", false) === true,
        };
    }
    return;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2538195-2538259 placement
function isStructuredOutputsUnsupportedClaude(e) {
  return (
    isStructuredOutputsMarkedUnsupported(stripAnyVersatileSuffix(e)) ||
    !foundrySupportsCapability(e, "structured_outputs")
  );
}
//@ chunk-e6aww6q8.js:2538259-2538286 placement
function markStructuredOutputsUnsupportedClaude(e) {
  markStructuredOutputsUnsupported(stripAnyVersatileSuffix(e));
}
//@ chunk-e6aww6q8.js:2562306-2563334 placement
/**
 * CLAUDE_CODE_WEBSEARCH_CITATIONS 开启时，把流里相邻的带引用文本块合并成一个 assistant 消息（重算 span），并同步后续 server_fallback 里引用的消息。
 */
async function* joinWebSearchCitationTexts(stream, enabled) {
  if (!env.CLAUDE_CODE_WEBSEARCH_CITATIONS || !enabled) return yield* stream;
  let r = [];
  let s = new Map();
  function* h() {
    let w = r;
    r = [];
    let last = w.at(-1);
    if (last === undefined) return;
    let G;
    try {
      G = mergeCitedTextBlocks(w.flatMap((ke) => ke.message.content));
    } catch (error) {
      logError(error);
      yield* w;
      return;
    }
    if (G === undefined) {
      yield last;
      return;
    }
    let { apiBlockIndex, ...Z } = last;
    let Se = {
      ...Z,
      message: {
        ...last.message,
        content: G,
      },
    };
    for (let ke of w) s.set(ke, Se);
    yield Se;
  }
  function y() {
    for (let [w, L] of s) {
      if (w.uuid !== L.uuid) continue;
      let { message, apiBlockIndex, ...Z } = w;
      Object.assign(L, Z);
      Object.assign(L.message, message, {
        content: L.message.content,
      });
    }
  }
  let S = (w) => uniq(w.map((L) => s.get(L) ?? L));
  try {
    for await (let w of stream) {
      if (w.type === "assistant") {
        let last = r.at(-1);
        if (last !== undefined && !isNextTextBlock(last, w)) yield* h();
        r.push(w);
        if (!isSingleTextBlockMessage(w)) yield* h();
        continue;
      }
      if (!isTextStreamEvent(w)) {
        yield* h();
        y();
      }
      if (w.type === "server_fallback")
        yield {
          ...w,
          discardedMessages: S(w.discardedMessages),
          retainedMessages: S(w.retainedMessages),
        };
      else if (w.type === "stream_event" && w.event.type === "message_start")
        yield {
          ...w,
          textRunsJoined: true,
        };
      else yield w;
    }
  } catch (error) {
    yield* h();
    throw error;
  }
  yield* h();
}
//@ chunk-e6aww6q8.js:2563334-2563448 placement
function isSingleTextBlockMessage(e) {
  return (
    e.apiBlockIndex !== undefined && e.message.content.length === 1 && e.message.content[0].type === "text"
  );
}
//@ chunk-e6aww6q8.js:2563448-2563517 placement
function isNextTextBlock(e, n) {
  return isSingleTextBlockMessage(n) && n.apiBlockIndex === e.apiBlockIndex + 1;
}
//@ chunk-e6aww6q8.js:2563517-2563726 placement
function isTextStreamEvent(e) {
  if (e.type !== "stream_event") return false;
  let event = e.event;
  let r = event.type;
  return (
    r === "ping" ||
    r === "content_block_delta" ||
    r === "content_block_stop" ||
    (event.type === "content_block_start" && event.content_block.type === "text")
  );
}
//@ chunk-e6aww6q8.js:2563726-2564164 placement
/**
 * 合并相邻文本块并把引用的 span 改写为合并后文本中的码点区间（网页搜索位置引用除外），没有变化时返回 undefined。
 */
function mergeCitedTextBlocks(e) {
  let n = [];
  let r = false;
  let s = 0;
  for (let h of e) {
    if (h.type !== "text") {
      n.push(h);
      continue;
    }
    let last = n.at(-1);
    let S = last?.type === "text" ? last : undefined;
    let w = S === undefined ? 0 : s;
    s = w + countCodePoints(h.text);
    let mapped = (h.citations ?? []).map((q) =>
      q.type === "web_search_result_location"
        ? q
        : {
            ...q,
            span_start: w,
            span_end: s,
          },
    );
    r ||= S !== undefined || mapped.length > 0;
    if (S !== undefined) n.pop();
    let G = [...(S?.citations ?? []), ...mapped];
    n.push({
      ...h,
      text: (S?.text ?? "") + h.text,
      citations: G.length > 0 ? G : null,
    });
  }
  return r ? n : undefined;
}
//@ chunk-e6aww6q8.js:2564164-2564343 placement
/**
 * web 搜索相关的内容常量：web_search/server_tool_use、web_search_tool_result、引用位置类型、占位文案与计数初始值。
 */
var WEB_SEARCH = "web_search";
var WEB_SEARCH_TOOL_RESULT = "web_search_tool_result";
var WEB_SEARCH_RESULT_LOCATION = "web_search_result_location";
var WEB_SEARCH_REMOVED_TEXT = "[Web search removed]";
var Fun = Object.freeze({
  toolUses: 0,
  results: 0,
  citations: 0,
  placeholders: 0,
});
//@ chunk-e6aww6q8.js:2564343-2564824 placement
/**
 * 去掉历史 assistant 消息中的 web search 工具调用/结果与引用，必要时补占位块，返回新消息与删除计数。
 */
function stripWebSearchBlocks(messages) {
  if (!messages.some(hasWebSearchContent))
    return {
      messages,
      removed: Fun,
    };
  let mapped = messages.map((message) =>
    message.type === "assistant" && hasWebSearchContent(message)
      ? stripWebSearchFromContent(message.message.content)
      : undefined,
  );
  return {
    messages: messages.map((message, s) => {
      let h = mapped[s];
      return h === undefined || message.type !== "assistant"
        ? message
        : {
            ...message,
            message: {
              ...message.message,
              content: h.content,
            },
          };
    }),
    removed: mapped.reduce(
      (acc, s) =>
        s === undefined
          ? acc
          : {
              toolUses: acc.toolUses + s.counts.toolUses,
              results: acc.results + s.counts.results,
              citations: acc.citations + s.counts.citations,
              placeholders: acc.placeholders + s.counts.placeholders,
            },
      Fun,
    ),
  };
}
//@ chunk-e6aww6q8.js:2564824-2565334 placement
/**
 * 从助手内容中移除网页搜索相关块，必要时插入占位 thinking 块以保持思考块位置合法，并统计工具调用、结果、引用和占位数量。
 */
function stripWebSearchFromContent(blocks) {
  let keptIndices = blocks.flatMap((block, G) => (isRemovableWebSearchBlock(block) ? [] : [G]));
  let rebuiltBlocks = keptIndices.flatMap((keptIndex, G) => {
    let q = dropSearchCitations(blocks[keptIndex]);
    let lastIndex = keptIndices
      .slice(0, G)
      .findLastIndex((keptIndex) => !isSearchCitationBlock(blocks[keptIndex]));
    return (lastIndex === -1 ? 0 : keptIndex - keptIndices[lastIndex] - (G - lastIndex)) > 0 &&
      isThinkingBlockOptional(blocks[keptIndices[lastIndex]]) &&
      isThinkingBlockOptional(q)
      ? [placeholderTextBlock(), q]
      : [q];
  });
  let lastIndex = keptIndices.findLastIndex((keptIndex) => !isSearchCitationBlock(blocks[keptIndex]));
  let y =
    (lastIndex === -1
      ? 0
      : blocks.length - 1 - keptIndices[lastIndex] - (keptIndices.length - 1 - lastIndex)) > 0 &&
    isThinkingBlockOptional(blocks[keptIndices[lastIndex]]);
  let all = rebuiltBlocks.every(
    (rebuiltBlock) =>
      isThinkingBlockOptional(rebuiltBlock) ||
      isBlankTextBlock(rebuiltBlock) ||
      isSearchCitationBlock(rebuiltBlock),
  );
  let finalContent = y || all ? [...rebuiltBlocks, placeholderTextBlock()] : rebuiltBlocks;
  return {
    content: finalContent,
    counts: {
      toolUses: count(blocks, isWebSearchServerToolUse),
      results: count(blocks, (L) => L?.type === WEB_SEARCH_TOOL_RESULT),
      citations: blocks.reduce((acc, block) => acc + countSearchCitations(block), 0),
      placeholders: finalContent.length - keptIndices.length,
    },
  };
}
//@ chunk-e6aww6q8.js:2565334-2565459 placement
function hasWebSearchContent(message) {
  return (
    message.type === "assistant" &&
    Array.isArray(message.message.content) &&
    message.message.content.some((n) => isRemovableWebSearchBlock(n) || countSearchCitations(n) > 0)
  );
}
//@ chunk-e6aww6q8.js:2565459-2565504 placement
function isRemovableWebSearchBlock(e) {
  return isWebSearchServerToolUse(e) || e?.type === WEB_SEARCH_TOOL_RESULT;
}
//@ chunk-e6aww6q8.js:2565504-2565569 placement
function isWebSearchServerToolUse(e) {
  return e?.type === "server_tool_use" && e.name === WEB_SEARCH;
}
//@ chunk-e6aww6q8.js:2565569-2565644 placement = hasThinkingContent (1)
function isThinkingBlockOptional(m) {
  return m?.type === "thinking" || m?.type === "redacted_thinking";
}
//@ chunk-e6aww6q8.js:2565644-2565682 placement
function isSearchCitationBlock(rebuiltBlock) {
  return rebuiltBlock != null && isFallbackMessage(rebuiltBlock);
}
//@ chunk-e6aww6q8.js:2565682-2565766 placement
function isBlankTextBlock(rebuiltBlock) {
  return (
    rebuiltBlock?.type === "text" && (typeof rebuiltBlock.text !== "string" || !rebuiltBlock.text.trim())
  );
}
//@ chunk-e6aww6q8.js:2565766-2565870 placement
function countSearchCitations(e) {
  return e?.type === "text" && Array.isArray(e.citations)
    ? count(e.citations, (n) => n?.type === WEB_SEARCH_RESULT_LOCATION)
    : 0;
}
//@ chunk-e6aww6q8.js:2565870-2565995 placement
function dropSearchCitations(e) {
  if (e?.type !== "text" || countSearchCitations(e) === 0) return e;
  return {
    ...e,
    citations: (e.citations ?? []).filter((n) => n?.type !== WEB_SEARCH_RESULT_LOCATION),
  };
}
//@ chunk-e6aww6q8.js:2565995-2566052 placement
function placeholderTextBlock() {
  return {
    type: "text",
    text: WEB_SEARCH_REMOVED_TEXT,
    citations: [],
  };
}
//@ chunk-e6aww6q8.js:2566052-2566525 placement
/**
 * 包装异步迭代器：超过 heartbeatMs 没有新值时产出 ping 事件（静默时长不超过 maxSilentMs 时）。
 */
async function* withHeartbeat(iterator, { maxSilentMs, heartbeatMs = 30000 }) {
  let s = iterator;
  let h = Symbol("heartbeat");
  let y = null;
  let S = 0;
  let w;
  try {
    while (true) {
      if (y === null) {
        y = s.next();
        S = performance.now();
      }
      let promise = new Promise((resolve) => {
        w = setTimeout((Z, Se) => Z(Se), heartbeatMs, resolve, h);
        w.unref?.();
      });
      let winner = await Promise.race([y, promise]);
      clearTimeout(w);
      w = undefined;
      if (winner === h) {
        if (performance.now() - S < maxSilentMs)
          yield {
            type: "stream_event",
            event: {
              type: "ping",
            },
          };
        continue;
      }
      y = null;
      if (winner.done) return winner.value;
      yield winner.value;
    }
  } finally {
    clearTimeout(w);
    s.return?.().catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:2566525-2566535 placement
var MAX_HELD_EVENTS = 8;
//@ chunk-e6aww6q8.js:2566535-2566885 placement
/**
 * 包装流式事件：监视并修正护栏产生的游离文本事件，处理出错时停止监视并放出暂存事件，流结束且未中止时补发暂存事件。
 */
async function* fixGuardrailStrayText(e, signal) {
  let state = {
    openTextIndex: undefined,
    hold: undefined,
    watching: true,
  };
  let s;
  try {
    for await (let h of e) {
      if (!state.watching) {
        yield h;
        continue;
      }
      let y;
      try {
        y = stepGuardrailHold(state, h);
      } catch (error) {
        logError(toError(error));
        y = state.hold?.events ?? [h];
        state.hold = undefined;
        state.watching = false;
      }
      if (y === undefined) yield h;
      else yield* y;
    }
  } catch (error) {
    s = {
      error,
    };
  }
  if (!signal.aborted) yield* state.hold?.events ?? [];
  if (s !== undefined) throw s.error;
}
//@ chunk-e6aww6q8.js:2566885-2568242 placement
/**
 * 处理 Bedrock guardrail 把文本 delta 发到错误块下标的情况：暂存这些事件，若随后出现 INTERVENED 的 message_stop，就把文本移到原文本块；否则原样放出。
 */
function stepGuardrailHold(state, event) {
  let hold = state.hold;
  if (hold === undefined)
    switch (event.type) {
      case "content_block_start":
        if (event.content_block?.type === "text" && typeof event.index === "number")
          state.openTextIndex = event.index;
        return;
      case "content_block_stop":
        if (event.index === state.openTextIndex) state.openTextIndex = undefined;
        return;
      case "content_block_delta":
        if (
          event.delta?.type !== "text_delta" ||
          typeof event.index !== "number" ||
          state.openTextIndex === undefined ||
          event.index === state.openTextIndex
        )
          return;
        state.hold = {
          strayIndex: event.index,
          targetIndex: state.openTextIndex,
          events: [event],
          acceptsText: true,
        };
        return [];
      default:
        return;
    }
  hold.events.push(event);
  let s = hold.events.length <= MAX_HELD_EVENTS;
  let h = false;
  switch (event.type) {
    case "content_block_delta":
      h = hold.acceptsText && event.index === hold.strayIndex && event.delta?.type === "text_delta";
      break;
    case "content_block_stop":
      h = hold.acceptsText && event.index === hold.strayIndex;
      hold.acceptsText = false;
      break;
    case "message_delta":
      h = true;
      hold.acceptsText = false;
      break;
    default:
      break;
  }
  if (s && h) return [];
  state.watching = false;
  if (
    !s ||
    event.type !== "message_stop" ||
    !("amazon-bedrock-guardrailAction" in event) ||
    event["amazon-bedrock-guardrailAction"] !== "INTERVENED"
  ) {
    state.hold = undefined;
    return hold.events;
  }
  let y = [];
  let S = false;
  for (let event of hold.events)
    if (event.type === "content_block_delta")
      y.push({
        ...event,
        index: hold.targetIndex,
      });
    else if (event.type !== "content_block_stop") {
      if (!S) {
        y.push({
          type: "content_block_stop",
          index: hold.targetIndex,
        });
        S = true;
      }
      y.push(event);
    }
  logForDebugging(
    `Guardrail block text addressed to block ${hold.strayIndex} moved to text block ${hold.targetIndex}`,
  );
  state.hold = undefined;
  return y;
}
//@ chunk-e6aww6q8.js:2568242-2568443 placement = extractErrorTypeFromData (1)
/**
 * user 消息是否只包含 tool_result 块。
 */
function isToolResultOnlyUserMessage(message) {
  if (message.type !== "user") return false;
  let content = message.message.content;
  if (!Array.isArray(content) || content.length === 0) return false;
  return content.every((r) => typeof r === "object" && r !== null && "type" in r && r.type === "tool_result");
}
//@ chunk-e6aww6q8.js:2568443-2568943 placement
/**
 * 按每个回合的 effort 与时间，在用户消息后插入 api_system 的 output_config（effort、timing），相同的不重复。
 */
function attachPerTurnOutputConfig(messages, options) {
  let { levels, times, answered } = perTurnEffortLevels(messages, options);
  let y = [];
  let S;
  let outputConfig;
  for (let [L, G] of messages.entries()) {
    if (outputConfig !== undefined && G.type !== "user") {
      S = outputConfig.effort ?? S;
      if (G.type === "api_system") {
        y.push({
          ...G,
          outputConfig,
        });
        outputConfig = undefined;
        continue;
      }
      y.push(apiSystemMessageWithOutputConfig(outputConfig));
      outputConfig = undefined;
    }
    y.push(G);
    if (G.type === "user") {
      let q = S !== undefined && !answered[L] && isToolResultOnlyUserMessage(G);
      let Z = levels !== undefined && levels[L] !== S && !q ? levels[L] : outputConfig?.effort;
      let Se = times?.[L];
      outputConfig =
        Z === undefined && Se === undefined
          ? undefined
          : {
              ...(Z !== undefined && {
                effort: Z,
              }),
              ...(Se !== undefined && {
                timing: {
                  type: "now",
                  now: Se,
                },
              }),
            };
    }
  }
  if (outputConfig !== undefined) y.push(apiSystemMessageWithOutputConfig(outputConfig));
  return y;
}
//@ chunk-e6aww6q8.js:2568943-2569488 placement
/**
 * 从后往前为每条消息计算生效的 effort 等级（可按上限截断）、计时信息，以及该轮是否明确指定过 effort。
 */
function perTurnEffortLevels(messages, options) {
  let levels = options.effort === undefined ? undefined : Array(messages.length);
  let times = options.now === undefined ? undefined : Array(messages.length);
  let answered = Array(messages.length);
  let effortCap = options.effortCap;
  let capFrom = effortCap === undefined ? 0 : messages.findLastIndex(isRealUserMessage);
  while (capFrom > 0 && messages[capFrom - 1].type === "user") capFrom--;
  let { effort, now } = options;
  let hasTurnEffort = false;
  for (let index = messages.length - 1; index >= 0; index--) {
    let message = messages[index];
    if (message.type === "assistant" && !message.isApiErrorMessage) {
      let turnEffort = message.perTurnEffort === undefined ? message.effort : message.perTurnEffort;
      hasTurnEffort = turnEffort != null;
      effort = turnEffort ?? effort;
      now = message.perTurnTiming;
    }
    answered[index] = hasTurnEffort;
    if (levels !== undefined)
      levels[index] =
        effortCap !== undefined &&
        effort !== undefined &&
        index >= capFrom &&
        isEffortHigherThan(effort, effortCap)
          ? effortCap
          : effort;
    if (times !== undefined) times[index] = now;
  }
  return {
    levels,
    times,
    answered,
  };
}
//@ chunk-e6aww6q8.js:2569488-2569689 placement
function lastOutputConfig(e) {
  let n = {};
  for (let r of e)
    if (r.type === "user") n.now = undefined;
    else if (r.type === "api_system" && r.outputConfig) {
      n.effort = r.outputConfig.effort ?? n.effort;
      n.now = r.outputConfig.timing?.now;
    }
  return n;
}
//@ chunk-e6aww6q8.js:2569689-2569786 placement
function resolveEffortFromLastOutputConfig(messagesForAPI, n, r) {
  try {
    let { effort } = lastOutputConfig(messagesForAPI);
    return effort === undefined ? n : r(effort);
  } catch (error) {
    logError(toError(error));
    return n;
  }
}
//@ chunk-e6aww6q8.js:2569786-2569834 placement
function isRealUserMessage(e) {
  return e.type === "user" && !isToolResultOnlyUserMessage(e);
}
//@ chunk-e6aww6q8.js:2569834-2569877 placement
function stripOutputConfigs(messagesForAPI) {
  return mapOutputConfigs(messagesForAPI, () => {
    return;
  });
}
//@ chunk-e6aww6q8.js:2569877-2569959 placement
function dropTimingFromOutputConfigs(e) {
  return mapOutputConfigs(e, ({ timing, ...r }) => (Object.keys(r).length > 0 ? r : undefined));
}
//@ chunk-e6aww6q8.js:2569959-2570236 placement
function mapOutputConfigs(e, n) {
  let r = [];
  for (let s of e) {
    if (s.type !== "api_system" || s.outputConfig === undefined) {
      r.push(s);
      continue;
    }
    let { outputConfig, ...y } = s;
    let S = n(outputConfig);
    if (S !== undefined)
      r.push({
        ...y,
        outputConfig: S,
      });
    else if (y.message.content.length > 0 || (y.toolAdditions?.length ?? 0) > 0) r.push(y);
  }
  return r;
}
//@ chunk-e6aww6q8.js:2570236-2570286 placement
function apiSystemMessageWithOutputConfig(outputConfig) {
  return {
    ...createApiSystemMessage(""),
    outputConfig,
  };
}
//@ chunk-e6aww6q8.js:2570286-2570373 placement
var GMT_TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d)GMT([+-]\d{2}:\d{2})?$/;
//@ chunk-e6aww6q8.js:2570373-2571173 placement
function formatLocalTimestamp(e, n) {
  if (n) {
    try {
      let S = new Map(
        getDateTimeFormat("en-US", {
          timeZone: n,
          hourCycle: "h23",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "longOffset",
        })
          .formatToParts(e)
          .map((L) => [L.type, L.value]),
      );
      let match = GMT_TIMESTAMP_RE.exec(
        `${S.get("year")}-${S.get("month")}-${S.get("day")}T${S.get("hour")}:${S.get("minute")}:${S.get("second")}${S.get("timeZoneName")}`,
      );
      if (match) return `${match[1]}${match[2] ?? "+00:00"}`;
    } catch {}
    logError(
      Error(
        "formatPerTurnNow: could not format the time in the session's time zone; using the process's zone",
      ),
    );
  }
  let r = (S) => String(S).padStart(2, "0");
  let s = -e.getTimezoneOffset();
  let h = s < 0 ? "-" : "+";
  let y = Math.abs(s);
  return `${e.getFullYear()}-${r(e.getMonth() + 1)}-${r(e.getDate())}T${r(e.getHours())}:${r(e.getMinutes())}:${r(e.getSeconds())}${h}${r(Math.floor(y / 60))}:${r(y % 60)}`;
}
//@ chunk-e6aww6q8.js:2571173-2571289 placement
function isInvalidEffortError(e) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    extractNestedErrorMessage(e) === "Invalid effort level" &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_quilt", false)
  );
}
//@ chunk-e6aww6q8.js:2571289-2571544 placement
function effortInPlay(e, messagesForAPI) {
  let r;
  let s = [];
  let h = false;
  for (let y of messagesForAPI) {
    let effort = y.type === "api_system" ? y.outputConfig?.effort : undefined;
    if (effort !== undefined) {
      r = effort;
      s = h ? [effort] : [...s, effort];
    } else if (y.type !== "api_system") {
      h = isRealUserMessage(y);
      if (h) s = r === undefined ? [] : [r];
    }
  }
  return EFFORT_LEVELS.findLast((y) => y === e || s.includes(y));
}
//@ chunk-e6aww6q8.js:2571544-2571665 placement
function learnedEffortCap(e, querySource) {
  let learnedEffortCaps = getLearnedEffortCaps();
  if (learnedEffortCaps.size === 0 || isAutoModeQuerySource(querySource)) return;
  let level = learnedEffortCaps.get(getModelSettingsKey(e))?.level;
  return level === "xhigh" && !modelSupportsXhighEffort(e) ? "high" : level;
}
//@ chunk-e6aww6q8.js:2571665-2571735 placement
function lowerEffort(e, n) {
  return n !== undefined && typeof e === "string" && isEffortHigherThan(e, n) ? n : e;
}
//@ chunk-e6aww6q8.js:2571735-2571918 placement
function lowerLearnedEffortCap(resolvedModel, n) {
  let learnedEffortCaps = getLearnedEffortCaps();
  let modelSettingsKey = getModelSettingsKey(resolvedModel);
  let level = learnedEffortCaps.get(modelSettingsKey)?.level;
  let y = EFFORT_LEVELS[EFFORT_LEVELS.indexOf(n) - 1];
  if (y === undefined) learnedEffortCaps.delete(modelSettingsKey);
  else if (level === undefined || isEffortHigherThan(level, y))
    learnedEffortCaps.set(modelSettingsKey, {
      level: y,
      told: false,
    });
  else return level;
  return y;
}
//@ chunk-e6aww6q8.js:2571918-2572030 placement
function takeEffortCapNotice(resolvedModel) {
  let modelSettingsKey = getModelSettingsKey(resolvedModel);
  let r = getLearnedEffortCaps().get(modelSettingsKey);
  if (r === undefined || r.told) return false;
  getLearnedEffortCaps().set(modelSettingsKey, {
    ...r,
    told: true,
  });
  return true;
}
//@ chunk-e6aww6q8.js:2572030-2572120 placement
/**
 * 流式护栏暂存增量的上限、哨兵与最后标量缓存：暂存文本最多 8192 字，读取结束用 Symbol 标记。
 */
var MAX_HELD_DELTA_CHARS = 8192;
var EMPTY_LIST = [];
var READ_ENDED_SENTINEL = Symbol("read ended");
var lastScalarSlot = identity_2(
  {
    value: undefined,
  },
  (e) => {
    e.value = undefined;
  },
);
//@ chunk-e6aww6q8.js:2572120-2572403 placement
function isDeltaFoldEnabled() {
  try {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_toasty_giraffe", false);
    if (featureValue_CACHED_MAY_BE_STALE === true || featureValue_CACHED_MAY_BE_STALE === false) {
      lastScalarSlot.value = undefined;
      return featureValue_CACHED_MAY_BE_STALE;
    }
    if (!Object.is(featureValue_CACHED_MAY_BE_STALE, lastScalarSlot.value)) {
      lastScalarSlot.value = featureValue_CACHED_MAY_BE_STALE;
      logForDiagnosticsNoPII("warn", "stream_delta_fold_flag_ignored", {
        flag: "tengu_toasty_giraffe",
        value_type:
          featureValue_CACHED_MAY_BE_STALE === null ? "null" : typeof featureValue_CACHED_MAY_BE_STALE,
      });
    }
    return false;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-e6aww6q8.js:2572403-2574077 placement
/**
 * 合并连续的同类流式 delta（text/input_json/thinking）以减少下游事件数：同一块同一类型连续到达时暂存拼接，到下一个 tick 或类型变化时放出；出错时停止合并。
 */
async function* foldStreamDeltas(events, clock, counter, signal) {
  let h = events[Symbol.asyncIterator]();
  let y = {
    held: undefined,
    folded: counter,
  };
  let S;
  let w;
  let L;
  let G = null;
  let q;
  let Z;
  let Se = false;
  try {
    while (true) {
      G ??= h.next();
      if (y.held !== undefined && q === undefined)
        q = new Promise((resolve) => {
          Z = setImmediate(resolve, READ_ENDED_SENTINEL);
        });
      let ke;
      try {
        ke = q === undefined ? await G : await Promise.race([G, q]);
      } catch (error) {
        if (!signal.aborted) yield* flushHeldDelta(y);
        throw error;
      }
      if (signal.aborted) {
        y.held = undefined;
        if (ke !== READ_ENDED_SENTINEL) return;
      }
      let we;
      if (ke === READ_ENDED_SENTINEL) we = flushHeldDelta(y);
      else {
        G = null;
        if (ke.done) {
          yield* flushHeldDelta(y);
          return;
        }
        let Ee = ke.value;
        if (Se) we = [Ee];
        else
          try {
            let Ae;
            if (Ee.type === "content_block_delta" && typeof Ee.index === "number") {
              let delta = Ee.delta;
              switch (delta?.type) {
                case "text_delta":
                  Ae = typeof delta.text === "string" ? delta.text : undefined;
                  break;
                case "input_json_delta":
                  Ae = typeof delta.partial_json === "string" ? delta.partial_json : undefined;
                  break;
                case "thinking_delta":
                  Ae =
                    typeof delta.thinking === "string" && typeof delta.estimated_tokens !== "number"
                      ? delta.thinking
                      : undefined;
                  break;
                case "citations_delta":
                case "signature_delta":
                case "compaction_delta":
                  break;
                default:
              }
              if ("research" in Ee) Ae = undefined;
            }
            if (Ee.type !== "content_block_delta" || Ae === undefined) {
              S = undefined;
              we = [...flushHeldDelta(y), Ee];
            } else if (Ee.index !== S || Ee.delta.type !== w || clock.lastAt !== L) {
              S = Ee.index;
              w = Ee.delta.type;
              L = clock.lastAt;
              we = [...flushHeldDelta(y), Ee];
            } else if (y.held === undefined) {
              y.held = {
                last: Ee,
                text: Ae,
                deltas: 1,
              };
              we = EMPTY_LIST;
            } else if (y.held.text.length + Ae.length > MAX_HELD_DELTA_CHARS) {
              we = flushHeldDelta(y);
              y.held = {
                last: Ee,
                text: Ae,
                deltas: 1,
              };
            } else {
              y.held.last = Ee;
              y.held.text += Ae;
              y.held.deltas += 1;
              we = EMPTY_LIST;
            }
          } catch (error) {
            logError(toError(error));
            logFeatureSad("api_stream_delta_merge", "bookkeeping_threw");
            Se = true;
            we = y.held?.last === Ee ? flushHeldDelta(y) : [...flushHeldDelta(y), Ee];
          }
      }
      if (y.held === undefined && q !== undefined) {
        clearImmediate(Z);
        Z = undefined;
        q = undefined;
      }
      for (let Ee of we) {
        if (signal.aborted) return;
        yield Ee;
      }
    }
  } finally {
    clearImmediate(Z);
    try {
      Promise.resolve(h.return?.(undefined)).catch(() => {});
    } catch {}
  }
}
//@ chunk-e6aww6q8.js:2574077-2574443 placement
/**
 * 放出暂存的合并增量：把多个同类 delta（文本、JSON 片段、思考）的文本合并到最后一个事件里，并累计折叠数量。
 */
function flushHeldDelta(e) {
  let held = e.held;
  if (held === undefined) return [];
  e.held = undefined;
  e.folded.count += held.deltas - 1;
  if (held.deltas === 1) return [held.last];
  let { last, text } = held;
  let delta = last.delta;
  switch (delta.type) {
    case "text_delta":
      return [
        {
          ...last,
          delta: {
            ...delta,
            text,
          },
        },
      ];
    case "input_json_delta":
      return [
        {
          ...last,
          delta: {
            ...delta,
            partial_json: text,
          },
        },
      ];
    case "thinking_delta":
      return [
        {
          ...last,
          delta: {
            ...delta,
            thinking: text,
          },
        },
      ];
    default:
      return [last];
  }
}
//@ chunk-e6aww6q8.js:2574443-2574476 placement
var TENGU_POLISHED_DEWDROP = "tengu_polished_dewdrop";
//@ chunk-e6aww6q8.js:2574476-2574574 placement
function polishedDewdropMode(e) {
  switch (e) {
    case "drop":
      return "drop_block";
    case "block":
      return "error";
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:2574574-2574753 placement
function getPolishedDewdropMode() {
  if (!isFirstPartyApiBackend()) return;
  let e = getCachedClientData()?.[TENGU_POLISHED_DEWDROP];
  let n = env.CLAUDE_CODE_POLISHED_DEWDROP ?? (e === "drop" || e === "block" || e === "off" ? e : undefined);
  if (n !== undefined) return polishedDewdropMode(n);
  return polishedDewdropMode(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_POLISHED_DEWDROP, ""));
}
//@ chunk-e6aww6q8.js:2574753-2574793 placement
function isPolishedDewdropActive(e) {
  return e !== undefined || isFirstPartyApiBackend();
}
//@ chunk-e6aww6q8.js:2579785-2580012 placement
var MAX_SEARCH_RESULTS = 6;
var SEARCH_RESULT_LOCATION_SCHEMA = DoctorLazy(() =>
  u({
    type: literal("search_result_location"),
    cited_text: string(),
    source: string(),
    title: string().nullable(),
    search_result_index: int_2(),
    start_block_index: int_2(),
    end_block_index: int_2(),
    span_start: int_2().optional(),
    span_end: int_2().optional(),
  }),
);
//@ chunk-e6aww6q8.js:2580012-2581746 placement
/**
 * 发请求前整理消息列表（合并、清理系统消息），受 tengu_jolly_sparrow 开关影响。
 */
function prepareRequestMessages(e, messages) {
  if (
    !env.CLAUDE_CODE_WEBSEARCH_CITATIONS ||
    !getFeatureValue_SESSION_PINNED("tengu_jolly_sparrow_enabled", false)
  )
    return e;
  try {
    let r = new Map();
    for (let y of messages) {
      if (y.type !== "assistant") continue;
      for (let S of y.message.content)
        if (S.type === "text" && S.citations?.length) {
          let w = r.get(y.message.id) ?? [];
          r.set(y.message.id, w);
          w.push(S);
        }
    }
    if (r.size === 0) return e;
    let s = [];
    let h = new Map();
    return e.map((y) => {
      if (y.type === "api_system" || typeof y.message.content === "string") return y;
      if (y.type === "user") {
        for (let Z of y.message.content) {
          let Se = Z.type === "tool_result" && Array.isArray(Z.content) ? Z.content : [Z];
          for (let ke of Se)
            if (isObjectBlock(ke) && ke.type === "search_result" && ke.citations?.enabled) s.push(ke.source);
        }
        return y;
      }
      let id = y.message.id;
      let w = r.get(id);
      if (w === undefined) return y;
      let L = (h.get(id) ?? 0) + count(y.message.content, (Z) => Z.type === "tool_use");
      let G = L;
      let q = [];
      for (let Z of y.message.content) {
        let Se =
          Z.type === "text" && !Z.citations?.length && L < MAX_SEARCH_RESULTS
            ? w.findIndex((Ie) => Ie.text === Z.text)
            : -1;
        let [ke] = Se === -1 ? [] : w.splice(Se, 1);
        if (Z.type !== "text" || ke === undefined) {
          q.push(Z);
          continue;
        }
        let list = Array.from(Z.text);
        let Ee = new Map();
        for (let Ie of ke.citations ?? []) {
          let Me = SEARCH_RESULT_LOCATION_SCHEMA().safeParse(Ie);
          if (!Me.success) continue;
          let { span_start: spanStart = 0, span_end: spanEnd = list.length, ...lt } = Me.data;
          if (s[lt.search_result_index] !== lt.source) continue;
          let Je = Ee.get(spanStart) ?? {
            end: spanEnd,
            citations: [],
          };
          Ee.set(spanStart, Je);
          Je.citations.push(lt);
        }
        let Ae = 0;
        for (let [Ie, Me] of [...Ee].sort((We, ze) => We[0] - ze[0])) {
          if (L >= MAX_SEARCH_RESULTS || Ie < Ae || Me.end <= Ie || Me.end > list.length) continue;
          L++;
          if (Ie > Ae)
            q.push({
              ...Z,
              text: list.slice(Ae, Ie).join(""),
            });
          q.push({
            ...Z,
            text: list.slice(Ie, Me.end).join(""),
            citations: Me.citations,
          });
          Ae = Me.end;
        }
        if (Ae === 0) q.push(Z);
        else if (Ae < list.length)
          q.push({
            ...Z,
            text: list.slice(Ae).join(""),
          });
      }
      h.set(id, L);
      return L === G
        ? y
        : {
            ...y,
            message: {
              ...y.message,
              content: q,
            },
          };
    });
  } catch (error) {
    logError(error);
    return e;
  }
}
//@ chunk-e6aww6q8.js:2581746-2582303 placement
/**
 * 关闭用户消息与工具结果中 search_result 块的引用（citations.enabled=false），出错时记日志并原样返回。
 */
function disableSearchResultCitations(messages) {
  try {
    return messages.map((message) => {
      if (message.type !== "user" || typeof message.message.content === "string") return message;
      let content = message.message.content;
      let mapped = content.map((block) => {
        if (block.type === "search_result" && block.citations?.enabled)
          return {
            ...block,
            citations: {
              enabled: false,
            },
          };
        if (block.type !== "tool_result" || !Array.isArray(block.content)) return block;
        let content = block.content;
        let mapped = content.map((item) =>
          isObjectBlock(item) && item.type === "search_result" && item.citations?.enabled
            ? {
                ...item,
                citations: {
                  enabled: false,
                },
              }
            : item,
        );
        return mapped.some((w, L) => w !== content[L])
          ? {
              ...block,
              content: mapped,
            }
          : block;
      });
      return mapped.some((h, y) => h !== content[y])
        ? {
            ...message,
            message: {
              ...message.message,
              content: mapped,
            },
          }
        : message;
    });
  } catch (error) {
    logError(error);
    return messages;
  }
}
//@ chunk-e6aww6q8.js:2582303-2582458 placement = applyDisplayStyles (0.545)
function readDisplayField(thinking) {
  try {
    if (typeof thinking !== "object" || thinking === null || !("display" in thinking)) return;
    let display = thinking.display;
    return typeof display === "string" ? display : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2582541-2582784 placement
function thinkingStartTime(e, n) {
  try {
    if (n === undefined) return;
    return e.type === "message_start" ||
      (e.type === "content_block_start" && e.content_block?.type === "thinking") ||
      (e.type === "content_block_delta" && e.delta?.type === "thinking_delta")
      ? n
      : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2582784-2582815 placement
var TENGU_RUSTLING_PIXEL = "tengu_rustling_pixel";
//@ chunk-e6aww6q8.js:2582815-2583081 placement
function foreignThinkingKeepMode() {
  let e = streamFallbackWarning();
  if (e.foreignThinkingKeep === undefined) {
    e.foreignThinkingKeep = resolveForeignThinkingKeep();
    if (e.foreignThinkingKeep === "all") logFeatureOk("api_keep_thinking_on_model_change");
    else if (e.foreignThinkingKeep === "upgrade") logFeatureOk("api_keep_thinking_on_upgrade");
  }
  return e.foreignThinkingKeep;
}
//@ chunk-e6aww6q8.js:2583081-2583301 placement
function dropForeignThinkingKeep(e) {
  let n = streamFallbackWarning();
  if (n.foreignThinkingKeep === "all") logFeatureSad("api_keep_thinking_on_model_change", e);
  else if (n.foreignThinkingKeep === "upgrade") logFeatureSad("api_keep_thinking_on_upgrade", e);
  else return;
  n.foreignThinkingKeep = "none";
}
//@ chunk-e6aww6q8.js:2583301-2583382 placement
/**
 * 导出函数 `watchSessionSwitchForThinkingKeep`：返回 onSessionSwitch((e, n) => { if (aes.has(n)) Ws().foreignThinkingKeep = void 0; })。
 */
function watchSessionSwitchForThinkingKeep() {
  return onSessionSwitch((e, n) => {
    if (CONVERSATION_RESET_KINDS.has(n)) streamFallbackWarning().foreignThinkingKeep = undefined;
  });
}
//@ chunk-e6aww6q8.js:2583382-2583770 placement
/**
 * 决定切换模型时保留历史 thinking 的策略（all/upgrade/none）：仅第一方后端；env CLAUDE_CODE_RUSTLING_PIXEL 优先，其次 client_data 与 GrowthBook。
 */
function resolveForeignThinkingKeep() {
  if (!isFirstPartyApiBackend()) return "none";
  if (!assumesFirstPartyBaseUrl())
    try {
      if (!isFirstPartyBaseUrl()) return "none";
    } catch (error) {
      logError(error);
      return "none";
    }
  let CLAUDE_CODE_RUSTLING_PIXEL = env.CLAUDE_CODE_RUSTLING_PIXEL;
  if (CLAUDE_CODE_RUSTLING_PIXEL !== undefined) {
    if (
      CLAUDE_CODE_RUSTLING_PIXEL !== "all" &&
      CLAUDE_CODE_RUSTLING_PIXEL !== "upgrade" &&
      CLAUDE_CODE_RUSTLING_PIXEL !== "none"
    )
      logForDebugging(
        `CLAUDE_CODE_RUSTLING_PIXEL=${CLAUDE_CODE_RUSTLING_PIXEL} is not 'all', 'upgrade' or 'none'; using 'upgrade'`,
        {
          level: "warn",
        },
      );
    return normalizeThinkingKeep(CLAUDE_CODE_RUSTLING_PIXEL);
  }
  let n = getCachedClientData()?.[TENGU_RUSTLING_PIXEL];
  if (typeof n === "string") return normalizeThinkingKeep(n);
  return normalizeThinkingKeep(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RUSTLING_PIXEL, "all"));
}
//@ chunk-e6aww6q8.js:2583770-2583827 placement
function normalizeThinkingKeep(e) {
  return e === "all" || e === "none" ? e : "upgrade";
}
//@ chunk-e6aww6q8.js:2583827-2584257 placement
/**
 * 按模型、查询来源和 beta 列表计算请求特性开关：中途 system 消息、工具变更头与内联工具、保留提醒等。
 */
function requestFeatureFlags(conversation, effectiveModel, r) {
  let s =
    isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM) || hasComplianceTaint("hipaa")
      ? false
      : shouldUseMidConvSystem(effectiveModel) || undefined;
  let h = toolChangeHeaderAllowed(conversation)
    ? true
    : isBetaRejected_2(conversation, BETA_MID_CONV_TOOL_CHANGE) ||
        isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM)
      ? false
      : undefined;
  let y =
    r.keptOn && r.betas.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT)
      ? true
      : isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT) ||
          isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM) ||
          r.betas.includes(BETA_MID_CONVERSATION_SYSTEM)
        ? false
        : undefined;
  let S;
  return {
    ...(s !== undefined && {
      systemTurns: s,
    }),
    ...(h !== undefined && {
      toolChangeHeader: h,
      inlineTools: h && inlineToolsAllowed(conversation),
    }),
    ...(y !== undefined && {
      keptReminders: y,
    }),
    ...(S !== undefined && {
      toolResultSafeguards: S,
    }),
    ...(conversation.systemMessagesAcceptedBy.has(effectiveModel) && {
      systemTurnsAnsweredBy: effectiveModel,
    }),
  };
}
//@ chunk-e6aww6q8.js:2584257-2584360 placement
function isMidConvSystemForced(model) {
  return (
    !!env.CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM ||
    modelCapabilitiesEnvEntry("mid_conv_system", getCanonicalName(model)) === true
  );
}
//@ chunk-e6aww6q8.js:2647001-2647044 placement
var UNRECOGNIZED_MODEL_MARKER = "[claude-code:unrecognized_model]";
//@ chunk-e6aww6q8.js:2647044-2647496 placement
/**
 * 遇到无法识别的模型名时（每个模型只记一次）记遥测，并在 print 模式下写 stderr，否则写调试日志。
 */
function logUnrecognizedModel(e, querySource) {
  try {
    if (querySource === "model_validation") return;
    if (isUnresolvedInferenceProfile(e)) return;
    let r = stripAnyVersatileSuffix(e);
    if (!claimOnce().claim(`unrecognized-model-signal:${r}`)) return;
    if (isRecognizedModel(e) || isRecognizedModel(r) || anyModelDescribed(e, r, strippedCanonicalName(e)))
      return;
    logEvent("tengu_api_unrecognized_model", {
      model: telemetrySafeModelName(e),
      querySource: agentTypeForTelemetry(querySource),
    });
    let replaced = `${UNRECOGNIZED_MODEL_MARKER} ${jsonStringify({
      model: e,
      query_source: querySource,
    })}`.replace(CONTROL_CHARS_EXCEPT_WS_RE, "");
    if (getPrintOutputFormat() !== null && env.CLAUDE_CODE_SESSION_KIND !== "bg")
      writeToStderr(`${replaced}
`);
    else
      logForDebugging(replaced, {
        level: "warn",
      });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "unrecognized-model signal failed"));
  }
}
//@ chunk-e6aww6q8.js:2647496-2647535 placement
var thinkingRelayModuleClaude = require("./chunk-1cnesc1e.js");
//@ chunk-e6aww6q8.js:2647535-2647595 placement
function guardReturning(e, n) {
  try {
    return e();
  } catch (error) {
    logError(toError(error));
    return n;
  }
}
//@ chunk-e6aww6q8.js:2647595-2647688 placement
function noteWaitForMcpServers(e, querySource) {
  try {
    if (
      classifyQuerySource(querySource) === "main" &&
      isFoamySpringEnabled() &&
      e.some((r) => toolMatchesName(r, WAITFORMCPSERVERS))
    )
      markDeclared();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2647688-2647748 placement
var ANTHROPIC_DISPATCH_ID = "anthropic-dispatch-id";
var V2S = "v2s";
var V2D = "v2d";
var V2P = "v2p";
//@ chunk-e6aww6q8.js:2647748-2647790 placement
function traceValueOrUnknown(e) {
  return sanitizeMarkName(e) ?? lit_2("unknown");
}
//@ chunk-e6aww6q8.js:2647790-2647800 layout
/**
 * 2：思考签名错误时按错误定位剥离单个 thinking 块的最多尝试次数，超过后整体剥离。
 */
var MAX_SIGNATURE_STRIP_ATTEMPTS = 2;
//@ chunk-e6aww6q8.js:2647800-2648004 layout = hasThinkingContent (0.876)
/**
 * thinking/redacted_thinking 块的稳定键（type:signature 或 type:data）。
 */
function getThinkingBlockKey(m) {
  if (typeof m !== "object" || m === null) return;
  let n = m;
  let r = n.type === "thinking" ? n.signature : n.type === "redacted_thinking" ? n.data : undefined;
  return typeof r === "string" && r.length > 0 ? `${n.type}:${r}` : undefined;
}
//@ chunk-e6aww6q8.js:2648004-2648185 layout = hasThinkingContent (1)
/**
 * assistant 消息里 thinking/redacted_thinking 块数。
 */
function countThinkingBlocks(m) {
  let n = 0;
  if (m?.type === "assistant" && Array.isArray(m.message.content)) {
    for (let r of m.message.content) if (r.type === "thinking" || r.type === "redacted_thinking") n++;
  }
  return n;
}
//@ chunk-e6aww6q8.js:2648185-2648418 layout
/**
 * 比较剥离前后消息：发送/剥离的思考块数与轮数。
 */
function summarizeThinkingStrip(e, n) {
  let r = {
    blocksSent: 0,
    turnsSent: 0,
    blocksStripped: 0,
    turnsStripped: 0,
  };
  for (let idx = 0; idx < e.length; idx++) {
    let h = countThinkingBlocks(e[idx]);
    let y = h - countThinkingBlocks(n[idx]);
    r.blocksSent += h;
    r.turnsSent += h > 0 ? 1 : 0;
    r.blocksStripped += y;
    r.turnsStripped += y > 0 ? 1 : 0;
  }
  return r;
}
//@ chunk-e6aww6q8.js:2648418-2649540 fingerprint = getExtraBodyParams (0.442)
/**
 * 解析 CLAUDE_CODE_EXTRA_BODY（JSON 对象）作为请求体附加字段：组织禁用实验 beta 时忽略；去掉 afk-mode beta；metadata.user_id 里的 tk 去掉；合并 Bedrock 要放进 body 的 anthropic_beta。
 */
function getExtraBodyParams(betaHeaders) {
  let extraBodyStr = process.env.CLAUDE_CODE_EXTRA_BODY;
  let result = {};
  if (extraBodyStr && isHipaaOrg())
    logForDebugging(
      "CLAUDE_CODE_EXTRA_BODY ignored: experimental betas are disabled by your organization's policy",
      {
        level: "debug",
      },
    );
  else if (extraBodyStr)
    try {
      let parsed = safeParseJSON(extraBodyStr);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        result = {
          ...parsed,
        };
      else
        logForDebugging(
          `CLAUDE_CODE_EXTRA_BODY env var must be a JSON object, but was given ${extraBodyStr}`,
          {
            level: "error",
          },
        );
    } catch (error) {
      logForDebugging(`Error parsing CLAUDE_CODE_EXTRA_BODY: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  for (let h of ["betas", "anthropic_beta"]) {
    if (!(h in result)) continue;
    let filtered = String(result[h])
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);
    let filtered_2 = filtered.filter((w) => !isAfkModeBeta(w));
    if (filtered_2.length === filtered.length) continue;
    logForDebugging(
      `CLAUDE_CODE_EXTRA_BODY ${h}: dropped afk-mode \u2014 only auto mode itself sends that beta`,
      {
        level: "warn",
      },
    );
    if (filtered_2.length > 0) result[h] = filtered_2;
    else delete result[h];
  }
  let metadata = result.metadata;
  if (isPlainObject_5(metadata) && typeof metadata.user_id === "string") {
    let h = safeParseJSON(metadata.user_id, false);
    if (isPlainObject_5(h) && "tk" in h) {
      let { tk, ...S } = h;
      result.metadata = {
        ...metadata,
        user_id: jsonStringify(S),
      };
    }
  }
  if (betaHeaders && betaHeaders.length > 0) {
    let h = betaHeaderValues(betaHeaders);
    if (result.anthropic_beta && Array.isArray(result.anthropic_beta)) {
      let existingHeaders = result.anthropic_beta;
      let newHeaders = h.filter((header) => !existingHeaders.includes(header));
      result.anthropic_beta = [...existingHeaders, ...newHeaders];
    } else result.anthropic_beta = h;
  }
  return result;
}
//@ chunk-e6aww6q8.js:2649540-2649672 layout
/**
 * Bedrock 等把 beta 放进请求体 anthropic_beta 数组时，追加该 beta 头（已有则不加）。
 */
function addBetaToBodyAnthropicBeta(extraBodyParams, n, r) {
  if (!r) return;
  let anthropicBeta = extraBodyParams.anthropic_beta;
  if (Array.isArray(anthropicBeta) && !anthropicBeta.includes(n.header))
    extraBodyParams.anthropic_beta = [...anthropicBeta, n.header];
}
//@ chunk-e6aww6q8.js:2649672-2650149 fingerprint = getPromptCachingEnabled (0.756)
/**
 * 是否启用提示词缓存：DISABLE_PROMPT_CACHING 全关；DISABLE_PROMPT_CACHING_HAIKU/SONNET/OPUS/FABLE/MYTHOS 按模型族关闭。
 */
function getPromptCachingEnabled(model) {
  if (env.DISABLE_PROMPT_CACHING) return false;
  if (
    env.DISABLE_PROMPT_CACHING_HAIKU &&
    getCanonicalName(model, {
      identity: true,
    }) ===
      getCanonicalName(getDefaultHaikuModel(), {
        identity: true,
      })
  )
    return false;
  if (env.DISABLE_PROMPT_CACHING_HAIKU && hasDedicatedSmallFastModel()) {
    let smallFastModel = getSmallFastModel();
    if (smallFastModel !== getMainLoopModel() && model === smallFastModel) return false;
  }
  if (env.DISABLE_PROMPT_CACHING_SONNET) {
    let defaultSonnet = getDefaultSonnetModel();
    if (model === defaultSonnet) return false;
  }
  if (env.DISABLE_PROMPT_CACHING_OPUS) {
    let defaultOpus = getDefaultOpusModel();
    if (model === defaultOpus) return false;
  }
  if (env.DISABLE_PROMPT_CACHING_FABLE) {
    if (isFableModelValue(model) || isPinnedFableModel(model)) return false;
  }
  if (env.DISABLE_PROMPT_CACHING_MYTHOS) {
    if (isMythosModelValue(model)) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:2650149-2650247 fingerprint = getCacheControl (0.925)
/**
 * 生成 cache_control：{type:"ephemeral"}，可带 ttl（1h）与 scope:"global"。
 */
function getCacheControl({ scope, ttl: n } = {}) {
  return {
    type: "ephemeral",
    ...(n && {
      ttl: n,
    }),
    ...(scope === "global" && {
      scope,
    }),
  };
}
//@ chunk-e6aww6q8.js:2650247-2650730 fingerprint = should1hCacheTTL (0.34)
/**
 * 决定提示词缓存 TTL：代理覆盖优先；订阅用户且不在超额、模型在 tengu_prompt_cache_1h_config 白名单内用 1h，否则 5m；tengu_tidy_frost 时活跃 5m 缓存保持 5m。
 */
function should1hCacheTTL(
  e,
  { agentCacheTtlOverride: n, ignoreOverage: r = false, mainThreadModel: s } = {},
) {
  let userEligible = isClaudeAISubscriber();
  let y = userEligible && !r && getCurrentLimits().isUsingOverage === true;
  let promptCacheTtl = resolvePromptCacheTtl(e, n, y);
  if (promptCacheTtl !== undefined) return promptCacheTtl;
  if (!userEligible || y)
    return {
      ttl: "5m",
      reason: "default",
    };
  let allowlist = getPromptCache1hAllowlist();
  if (allowlist === null) {
    allowlist =
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_prompt_cache_1h_config", {
        allowlist: [...ONE_HOUR_TTL_SOURCES],
      }).allowlist ?? [];
    setPromptCache1hAllowlist(allowlist);
  }
  if (!matchesModelPattern(e, allowlist))
    return {
      ttl: "5m",
      reason: "default",
    };
  if (
    s !== undefined &&
    isLastMainThreadAskLive(CACHE_TTL_5M_MS, s) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_frost", false)
  )
    return {
      ttl: "5m",
      reason: "live_5m_cache",
    };
  return {
    ttl: "1h",
    reason: "subscriber",
  };
}
//@ chunk-e6aww6q8.js:2650730-2650774 layout
/**
 * should1hCacheTTL(...).ttl 是否为 1h。
 */
function isOneHourCacheTtl(querySource, n) {
  return should1hCacheTTL(querySource, n).ttl === "1h";
}
//@ chunk-e6aww6q8.js:2650774-2651250 layout
/**
 * thinking.type=disabled 时去掉 display 等多余键（服务器拒收），首次记 tengu_thinking_disabled_sanitized。
 */
function sanitizeDisabledThinking(thinking, querySource, r) {
  if (thinking?.type !== "disabled") return thinking;
  let filtered = Object.keys(thinking).filter((key) => key !== "type");
  if (filtered.length === 0) return thinking;
  if (r) {
    logEvent("tengu_thinking_disabled_sanitized", {
      hadDisplay: filtered.includes("display") ? lit_2("true") : lit_2("false"),
      extraKeyCount: filtered.length,
      querySourceCategory: fromEnumOpt(classifyQuerySource(querySource)),
      hasExtraBodyEnv: env.CLAUDE_CODE_EXTRA_BODY ? lit_2("true") : lit_2("false"),
    });
    logForDebugging(
      `[thinking] stripped ${filtered.length} extra key(s) from {type:'disabled'} thinking param (gh-68567)`,
      {
        level: "warn",
      },
    );
  }
  return {
    type: "disabled",
  };
}
//@ chunk-e6aww6q8.js:2651250-2651408 layout
/**
 * 模型不支持 effort 时删 output_config.effort；否则字符串 effort 写入 output_config.effort 并加 effort beta。
 */
function applyEffortToOutputConfig(effortValue, outputConfig, extraBodyParams, betas, model) {
  if (!modelSupportsEffort(model)) {
    delete outputConfig.effort;
    return;
  }
  if ("effort" in outputConfig) return;
  if (effortValue === undefined) betas.push(BETA_EFFORT);
  else if (typeof effortValue === "string") {
    outputConfig.effort = effortValue;
    betas.push(BETA_EFFORT);
  }
}
//@ chunk-e6aww6q8.js:2651408-2651592 fingerprint = configureTaskBudgetParams (1)
/**
 * 有 taskBudget 且开关允许时写 output_config.task_budget={type:"tokens",total,remaining} 并加 task-budget beta。
 */
function configureTaskBudgetParams(taskBudget, outputConfig, betas) {
  if (!taskBudget || "task_budget" in outputConfig || !canSendFirstPartyBetas()) return;
  outputConfig.task_budget = {
    type: "tokens",
    total: taskBudget.total,
    ...(taskBudget.remaining !== undefined && {
      remaining: taskBudget.remaining,
    }),
  };
  if (!betas.includes(BETA_TASK_BUDGETS)) betas.push(BETA_TASK_BUDGETS);
}
//@ chunk-e6aww6q8.js:2651710-2652755 fingerprint = verifyApiKey (0.617)
/**
 * 用一次 max_tokens=1 的 "test" 请求验证 API key（带 withRetry 重试 2 次）；跳过标志为真时直接返回 true；认证错误返回 false。
 */
async function verifyApiKey(apiKey, isNonInteractiveSession, credentials, storageV5) {
  if (isNonInteractiveSession) return true;
  try {
    let model = getBareCheckModel();
    let betas = getModelBetas(model);
    let S = await returnValue_2(
      withRetry(
        () =>
          getAnthropicClient({
            apiKey,
            maxRetries: 3,
            model,
            source: "verify_api_key",
            agentContext: mainAgentContext(),
            credentials,
            storageV5,
          }),
        async (anthropic) => {
          let messages = [
            {
              role: "user",
              content: "test",
            },
          ];
          await anthropic.beta.messages.create({
            model: toProviderWireModelId(model),
            max_tokens: 1,
            messages,
            temperature: 1,
            ...betasRequestParam(betas),
            metadata: getAPIMetadata(),
            ...getExtraBodyParams(),
          });
          return true;
        },
        {
          maxRetries: 2,
          model,
          credentials,
          storageV5,
        },
      ),
    );
    logFeatureOk("api_key_verify");
    return S;
  } catch (errorFromRetry) {
    let error = errorFromRetry;
    if (errorFromRetry instanceof CannotRetryError) error = errorFromRetry.originalError;
    if (
      (error instanceof InvalidRequestHeaderValueError &&
        error.isUserSupplied &&
        error.header === "X-Api-Key" &&
        error.source !== "ANTHROPIC_CUSTOM_HEADERS") ||
      (error instanceof Error &&
        error.message.includes(
          '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}',
        ))
    ) {
      logForDebugging(`API key verification failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logFeatureBad("api_key_verify", "invalid_key");
      return false;
    }
    if (
      error instanceof APIConnectionError ||
      (error instanceof APIError && error.status != null && error.status < 500) ||
      (error instanceof InvalidRequestHeaderValueError && error.isUserSupplied)
    )
      logForDebugging(`API key verification failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logFeatureBad("api_key_verify", "network_error");
    throw error;
  }
}
//@ chunk-e6aww6q8.js:2652755-2653166 fingerprint = userMessageToMessageParam (0.665)
/**
 * 内部 user 消息转 API MessageParam；需要缓存断点时给最后一个块加 cache_control。
 */
function userMessageToMessageParam(message, addCache = false, enablePromptCaching, querySource) {
  if (addCache)
    if (typeof message.message.content === "string")
      return {
        role: "user",
        content: [
          {
            type: "text",
            text: message.message.content,
            ...(enablePromptCaching && {
              cache_control: getCacheControl({
                ttl: querySource,
              }),
            }),
          },
        ],
      };
    else {
      let h = dropEmptyTextBlocks(message.message.content);
      return {
        role: "user",
        content: h.map((y, i) => ({
          ...y,
          ...(i === h.length - 1
            ? enablePromptCaching
              ? {
                  cache_control: getCacheControl({
                    ttl: querySource,
                  }),
                }
              : {}
            : {}),
        })),
      };
    }
  return {
    role: "user",
    content: Array.isArray(message.message.content)
      ? dropEmptyTextBlocks(message.message.content)
      : message.message.content,
  };
}
//@ chunk-e6aww6q8.js:2653166-2653398 layout
/**
 * 去掉空白 text 块；全空时返回一个 "(no content)" 文本块。
 */
function dropEmptyTextBlocks(content) {
  let n;
  for (let idx = 0; idx < content.length; idx++) {
    let s = content[idx];
    if (s.type === "text" && (typeof s.text !== "string" || s.text.trim() === ""))
      n ??= content.slice(0, idx);
    else n?.push(s);
  }
  if (n === undefined) return [...content];
  return n.length > 0
    ? n
    : [
        {
          type: "text",
          text: NO_CONTENT_MESSAGE,
        },
      ];
}
//@ chunk-e6aww6q8.js:2653398-2653480 layout
/**
 * echoApiBlockOrder 开启时按 API 原始块顺序重排 assistant 内容（gJe），出错记日志返回原值。
 */
function applyApiBlockOrderEcho(e, echoApiBlockOrder, preserveTrailingThinking) {
  if (!echoApiBlockOrder) return e;
  try {
    return reorderByApiBlockIndex(e, preserveTrailingThinking);
  } catch (error) {
    logError(toError(error));
    return e;
  }
}
//@ chunk-e6aww6q8.js:2653480-2653865 callgraph-fingerprint = assistantMessageToMessageParam (0.411)
/**
 * 内部 assistant 消息转 API MessageParam；需要缓存断点时给最后一个非 thinking 块加 cache_control。
 */
function assistantMessageToMessageParam(message, addCache = false, enablePromptCaching, ttl, h) {
  if (addCache)
    if (typeof message.message.content === "string")
      return {
        role: "assistant",
        content: [
          {
            type: "text",
            text: message.message.content,
            ...(enablePromptCaching && {
              cache_control: getCacheControl({
                ttl,
              }),
            }),
          },
        ],
      };
    else
      return {
        role: "assistant",
        content: message.message.content.map((y, i) => ({
          ...y,
          ...(i === message.message.content.length - 1 && isRenderableContentBlock(y, h)
            ? enablePromptCaching
              ? {
                  cache_control: getCacheControl({
                    ttl,
                  }),
                }
              : {}
            : {}),
        })),
      };
  return {
    role: "assistant",
    content: message.message.content,
  };
}
//@ chunk-e6aww6q8.js:2653865-2654045 layout
/**
 * 调用 options.onMediaStripped 观察者（媒体剥离重试时），异常只告警。
 */
function notifyMediaStripped(options, kind, r) {
  if (!options.onMediaStripped) return;
  try {
    options.onMediaStripped(kind, r);
  } catch (error) {
    logForDebugging(
      `onMediaStripped observer threw; continuing the media-strip retry: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-e6aww6q8.js:2654045-2654137 layout
/**
 * 主线程主查询返回 main_thread，否则 other。
 */
function getRequestRouteKind(options) {
  return isMainAgent(options.agentContext) && classifyQuerySource(options.querySource) === "main"
    ? "main_thread"
    : "other";
}
//@ chunk-e6aww6q8.js:2654137-2654648 fingerprint = queryModelWithoutStreaming (0.789)
/**
 * 非流式查询（queryHaiku/queryWithModel 等辅助查询用）：消费 queryModel 流取最后一条 assistant；网关上小模型失败时改用主模型重试。
 */
async function queryModelWithoutStreaming({
  messages,
  systemPrompt,
  thinkingConfig,
  tools,
  signal,
  options,
}) {
  let S = {
    ...options,
    model: unlessManagedDeniedModel(options.model),
  };
  let assistantMessage;
  for await (let message of joinWebSearchCitationTexts(
    withStreamVCR(messages, async function* () {
      yield* recoverRegimeRefusal(tools, signal, (G) =>
        queryModelWithToolSearchRecovery(messages, systemPrompt, thinkingConfig, G, signal, S),
      );
    }),
    options.isNonInteractiveSession,
  ))
    if (message.type === "assistant") assistantMessage = message;
  if (!assistantMessage) {
    if (signal.aborted) throw new APIUserAbortError();
    throw Error("No assistant message found");
  }
  if (
    isResendableClientApiError(assistantMessage) &&
    getAPIProvider() === "gateway" &&
    S.model === getSmallFastModel() &&
    S.model !== getMainLoopModel()
  )
    return queryModelWithoutStreaming({
      messages,
      systemPrompt,
      thinkingConfig,
      tools,
      signal,
      options: {
        ...options,
        model: getMainLoopModel(),
      },
    });
  return assistantMessage;
}
//@ chunk-e6aww6q8.js:2654648-2654938 fingerprint = queryModelWithStreaming (0.532)
/**
 * 主循环的 deps.callModel：流式产出 queryModel 的事件；FallbackTriggeredError 转成 {type:"model_fallback_triggered"} 事件交给 queryLoop 换模型。
 */
async function* queryModelWithStreaming({ messages, systemPrompt, thinkingConfig, tools, signal, options }) {
  try {
    return yield* joinWebSearchCitationTexts(
      withStreamVCR(messages, async function* () {
        yield* recoverRegimeRefusal(tools, signal, (S) =>
          queryModelWithToolSearchRecovery(messages, systemPrompt, thinkingConfig, S, signal, options),
        );
      }),
      options.isNonInteractiveSession,
    );
  } catch (error) {
    if (!(error instanceof FallbackTriggeredError)) throw error;
    yield {
      type: "model_fallback_triggered",
      error,
    };
  }
}
//@ chunk-e6aww6q8.js:2654938-2655075 fingerprint = shouldDeferLspTool (1)
/**
 * LSP 工具在 LSP 尚未连接（pending/not-started）时延迟加载。
 */
function shouldDeferLspTool(tool) {
  if (!("isLsp" in tool) || !tool.isLsp) return false;
  if (hasLspEverConnected()) return false;
  let status = getInitializationStatus();
  return status.status === "pending" || status.status === "not-started";
}
//@ chunk-e6aww6q8.js:2655075-2655089 layout
/**
 * 90000：带静默重试的重试生成器 maxSilentMs = 等待上限 + 此值。
 */
var SILENT_RETRY_EXTRA_MS = 90000;
//@ chunk-e6aww6q8.js:2655089-2655199 layout
/**
 * 非流式请求超时：API_TIMEOUT_MS（上限 int32）或远程 120s/本地 300s。
 */
function getNonStreamingRequestTimeoutMs() {
  let apiTimeoutMs = getApiTimeoutMs();
  if (apiTimeoutMs !== undefined && apiTimeoutMs > 0) return Math.min(apiTimeoutMs, MAX_TIMER_DELAY_MS);
  return env.CLAUDE_CODE_REMOTE ? 120000 : 300000;
}
//@ chunk-e6aww6q8.js:2655199-2655435 layout
/**
 * verbose 日志级别时打印请求的 model/thinking/output_config/temperature/betas。
 */
function logApiRequestDetail(e) {
  if (getMinDebugLogLevel() !== "verbose") return;
  logForDebugging(
    `[API REQUEST DETAIL] ${jsonStringify({
      model: e.model,
      thinking: e.thinking,
      output_config: e.output_config,
      temperature: e.temperature,
      betas: e.betas ?? [],
      anthropic_beta: e.anthropic_beta,
    })}`,
    {
      level: "verbose",
    },
  );
}
//@ chunk-e6aww6q8.js:2655435-2655663 layout
/**
 * 生成 x-client-request-id（第一方时）和 traceparent 头，并记录本次尝试。
 */
function buildRequestTraceHeaders(span, attempt) {
  let r = hitsAnthropicBackend();
  let s = r ? randomUUID() : undefined;
  let h =
    (span && (r || env.CLAUDE_CODE_PROPAGATE_TRACEPARENT) ? getSpanId(span) : undefined) ??
    getUpstreamTraceparent();
  recordLlmRequestAttempt(span, {
    attempt,
    clientRequestId: s,
  });
  return {
    headers: {
      ...(s && {
        [CLIENT_REQUEST_ID_HEADER]: s,
      }),
      ...(h && {
        traceparent: h,
      }),
    },
    clientRequestId: s,
  };
}
//@ chunk-e6aww6q8.js:2655663-2655822 layout
/**
 * 按端点设置 x-cc-/x-claude-code- 的 context-compacted 与 compaction-request 头。
 */
function setCompactionHeaders(headers, n, r) {
  if (n === undefined && r === undefined) return;
  let s = isFirstPartyApiBackend();
  let h = shouldSendGatewayHintHeaders();
  if (n !== undefined) {
    if (s) headers[X_CC_CONTEXT_COMPACTED] = n;
    if (h) headers[X_CLAUDE_CODE_CONTEXT_COMPACTED] = n;
  }
  if (r !== undefined) {
    if (s) headers[X_CC_COMPACTION_REQUEST] = r;
    if (h) headers[X_CLAUDE_CODE_COMPACTION] = r;
  }
}
//@ chunk-e6aww6q8.js:2655822-2655870 layout
/**
 * 设置 x-claude-code-prev-tool-durations 头。
 */
function setPrevToolDurationsHeader(headers, n) {
  if (n !== undefined && shouldSendGatewayHintHeaders()) headers[X_CLAUDE_CODE_PREV_TOOL_DURATIONS] = n;
}
//@ chunk-e6aww6q8.js:2655870-2656070 layout
/**
 * 请求分派版本：CLAUDE_CODE_DISPATCH_V2D 或 tengu_dreamy_frost → v2d；非 auxiliary 且 V2S/tengu_cedar_lattice → v2s；否则 null。
 */
function getDispatchVersion(e) {
  if (antEnv.CLAUDE_CODE_DISPATCH_V2D ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_dreamy_frost", false))
    return V2D;
  if (e === "auxiliary") return null;
  if (antEnv.CLAUDE_CODE_DISPATCH_V2S ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_cedar_lattice", false))
    return V2S;
  return null;
}
//@ chunk-e6aww6q8.js:2656070-2656268 layout
/**
 * 每进程一次记录 API 路由（状态、头）诊断事件。
 */
function logApiRouteObserved(e, incrementalRequestBody) {
  if (e === undefined || !streamFallbackWarning().once("api_route_observed")) return;
  let { status, headers } = e;
  logForDiagnosticsNoPII("info", "cli_api_route_observed", () => ({
    response: describeResponseHeaders(status, headers),
    route: connectionSetupFacts(),
    incremental_request_body: incrementalRequestBody,
  }));
}
//@ chunk-e6aww6q8.js:2656268-2656398 layout
/**
 * 看起来像 JSON 的字符串尝试解析，失败原样返回。
 */
function tryParseJsonString(e) {
  let n = typeof e === "string" ? e.trim() : undefined;
  if (!n || (n[0] !== "{" && n[0] !== "[")) return e;
  try {
    return jsonParse(n);
  } catch {
    return e;
  }
}
//@ chunk-e6aww6q8.js:2656398-2659669 callgraph-witnessed = executeNonStreamingRequest (0.295)
/**
 * 非流式请求执行（流式失败回退或显式非流式）：调整 max_tokens/thinking 后 create(stream:false)，带超时；返回消息与响应头。
 */
async function* executeNonStreamingRequest(
  clientOptions,
  retryOptions,
  paramsFromContext,
  onAttempt,
  captureRequest,
  originatingRequestId,
) {
  let fallbackTimeoutMs = getNonStreamingRequestTimeoutMs();
  let clock = clientOptions.clock ?? systemClock;
  let attempt = 0;
  let generator = withRetry(
    () =>
      getAnthropicClient({
        maxRetries: 0,
        model: clientOptions.model,
        fetchOverride: clientOptions.fetchOverride,
        source: clientOptions.source,
        requestClass: clientOptions.requestClass,
        agentContext: clientOptions.agentContext,
        promptId: clientOptions.promptId,
        ccsSender: clientOptions.ccsSender,
        permissionContext: clientOptions.permissionContext,
        toolNames: clientOptions.toolNames,
        credentials: clientOptions.credentials,
        storageV5: clientOptions.storageV5,
        signal: retryOptions.signal,
        clock: clientOptions.clock,
      }),
    async (anthropic, attempt_2, context) => {
      let start = clock.now();
      let limitsAccountEpoch = getLimitsAccountEpoch();
      let retryParams = paramsFromContext(context);
      onAttempt(attempt_2, start, retryParams.max_tokens);
      let adjustedParams = adjustParamsForNonStreaming(retryParams, MAX_OUTPUT_TOKENS_CAP_2);
      logApiRequestDetail(adjustedParams);
      captureRequest(adjustedParams);
      attempt++;
      let { headers, clientRequestId } = buildRequestTraceHeaders(clientOptions.llmSpan, attempt);
      setCompactionHeaders(
        headers,
        clientOptions.contextCompactedKindForWire,
        clientOptions.compactionRequestKindForWire,
      );
      setPrevToolDurationsHeader(headers, clientOptions.prevToolDurationsForWire);
      retryOptions.stampDispatchHeader?.(headers, isFirstPartyApiBackend() && isLowPriorityActiveSafe());
      let abortController = new AbortController();
      let lt = clock.setTimeout(() => abortController.abort(), fallbackTimeoutMs, {
        unref: true,
      });
      try {
        let Je = await anthropic.beta.messages
          .create(
            {
              ...deferredToolNameOf(adjustedParams),
              stream: false,
            },
            {
              signal: AbortSignal.any([retryOptions.signal, abortController.signal]),
              timeout: fallbackTimeoutMs,
              ...(Object.keys(headers).length > 0 && {
                headers,
              }),
            },
          )
          .withResponse();
        logApiRouteObserved(Je.response, false);
        let nt = tryParseJsonString(Je.data);
        if (nt !== Je.data) {
          logForDebugging("Non-streaming fallback: parsed a JSON body served under a non-JSON content-type");
          logForDiagnosticsNoPII("info", "cli_nonstreaming_fallback_text_body_parsed");
        }
        if (!isValidAPIMessage(nt))
          throw new UnexpectedApiResponseError({
            data: nt,
            status: Je.response?.status,
            headers: Je.response?.headers,
            originating: originatingRequestId,
          });
        countToolCallsSince_2_3(nt);
        let headers_2 = Je.response?.headers;
        if (retryOptions.lowPriorityWait) recordLowPriorityServed(retryOptions.lowPriorityWait);
        if (headers_2) {
          let yt =
            (has1mSuffix_2(retryOptions.model) || modelHasNative1MContext(retryOptions.model)) &&
            (nt.usage?.input_tokens ?? 0) +
              (nt.usage?.cache_read_input_tokens ?? 0) +
              (nt.usage?.cache_creation_input_tokens ?? 0) >
              SECONDARY_CONTEXT_WINDOW;
          let quotaStatusFromHeaders = extractQuotaStatusFromHeaders(
            headers_2,
            retryOptions.model,
            yt,
            clock.now(),
            limitsAccountEpoch,
            clientOptions.storageV5,
          );
          if (quotaStatusFromHeaders && clientOptions.queryTracking) {
            clientOptions.queryTracking.billedToUsageCredits = quotaStatusFromHeaders.overageInUse === true;
            clientOptions.queryTracking.longContextBilled = yt;
          }
        }
        let creditCode = readFallbackCreditToken(nt.stop_details);
        {
          let stopDetails = nt.stop_details;
          if (stopDetails && "fallback_credit_token" in stopDetails) delete stopDetails.fallback_credit_token;
        }
        return {
          message: nt,
          requestId: amazonRequestId(Je.request_id, headers_2),
          headers: headers_2,
          creditCode,
        };
      } catch (err) {
        let nt =
          isAbortError(err) && abortController.signal.aborted && !retryOptions.signal.aborted
            ? new APIConnectionTimeoutError()
            : err;
        if (nt instanceof APIUserAbortError) throw nt;
        logForDiagnosticsNoPII("error", "cli_nonstreaming_fallback_error", () => ({
          ...classifyApiErrorKind(nt, classifyAPIError(nt)),
          attempt: attempt_2,
          attempt_duration_ms: clock.now() - start,
          timeout_ms: fallbackTimeoutMs,
          client_request_id: sanitizeMarkName(clientRequestId) ?? null,
          model: telemetrySafeModelName(clientOptions.model) ?? null,
          originating_request_id: originatingRequestId?.requestId ?? null,
          originating_cause: originatingRequestId?.cause ?? null,
        }));
        logEvent("tengu_nonstreaming_fallback_error", {
          model: telemetrySafeModelName(clientOptions.model),
          error:
            nt instanceof Error ? (sanitizedErrorNameForTelemetry(nt) ?? lit_2("Error")) : lit_2("unknown"),
          attempt: attempt_2,
          timeout_ms: fallbackTimeoutMs,
          request_id: originatingRequestId?.analyticsRequestId ?? lit_2("unknown"),
        });
        throw nt;
      } finally {
        lt();
      }
    },
    {
      model: retryOptions.model,
      credentials: clientOptions.credentials,
      storageV5: clientOptions.storageV5,
      fallbackModel: retryOptions.fallbackModel,
      accessFallbackModel: retryOptions.accessFallbackModel,
      toolFreeHelper: retryOptions.toolFreeHelper,
      ...(isFastModeEnabled() && {
        fastMode: retryOptions.fastMode,
      }),
      modelIsRefusalFallbackTarget: retryOptions.modelIsRefusalFallbackTarget,
      signal: retryOptions.signal,
      initialConsecutive529Errors: retryOptions.initialConsecutive529Errors,
      maxRetries: retryOptions.maxRetries,
      modelCallRetries: retryOptions.modelCallRetries,
      clock: retryOptions.clock,
      random: retryOptions.random,
      querySource: retryOptions.querySource,
      isNonStreamingRequest: true,
      nonStreamingTimeoutMs: fallbackTimeoutMs,
      failedStreamOutlastedTimeout: retryOptions.failedStreamOutlastedTimeout,
      isResumePrefillRequest: retryOptions.isResumePrefillRequest,
      onError: retryOptions.onApiError,
      onRetryStatus: retryOptions.onRetryStatus,
      subscribeRetryWake: retryOptions.subscribeRetryWake,
      onQuotaWindowWait: retryOptions.onQuotaWindowWait,
      isUsageLimitLifted: retryOptions.isUsageLimitLifted,
      lowPriorityWait: retryOptions.lowPriorityWait,
    },
  );
  return isStreamWatchdogApplicable()
    ? yield* withHeartbeat(generator, {
        maxSilentMs: fallbackTimeoutMs + SILENT_RETRY_EXTRA_MS,
      })
    : yield* generator;
}
//@ chunk-e6aww6q8.js:2659812-2659842 placement
function promptIdForMessages(e) {
  return getPromptId(e);
}
//@ chunk-e6aww6q8.js:2659842-2659965 placement
/**
 * 取请求所属的提示 id：优先解析自身，失败或为空时在子代理上下文中使用父提示 id。
 */
function promptIdForRequest(e, agentContext) {
  let r;
  try {
    r = promptIdForMessages(e);
  } catch (error) {
    logError(toError(error));
    r = undefined;
  }
  return (
    r ??
    (isSubagentContext(agentContext) && !agentContext.isMainSession ? agentContext.parentPromptId : undefined)
  );
}
//@ chunk-e6aww6q8.js:2659965-2660024 placement
function turnOriginSafe(messages) {
  try {
    return getTurnOrigin(messages);
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2660024-2660083 placement
function turnPositionSafe(messages) {
  try {
    return getTurnPosition(messages);
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2660083-2660203 placement
function memoryToolNames(messages, tools) {
  return memoryRedactionIndex(
    getRootSession().host,
    messages,
    new Set(tools.filter((r) => isLiveMemoryTool(r) || r.mcpInfo?.accountMemory === true).map((r) => r.name)),
  );
}
//@ chunk-e6aww6q8.js:2660203-2660356 placement
function applyThreadBody(e, n) {
  if (!("thread" in e)) return e;
  let { thread, ...s } = e;
  return {
    ...s,
    messages: n.messages,
    system: n.system,
    ...(n.tools !== undefined && {
      tools: n.tools,
    }),
  };
}
//@ chunk-e6aww6q8.js:2660356-2660578 placement
function canSendProviderBetas() {
  if (!canSendFirstPartyBetas()) return false;
  let apiProvider = getAPIProvider();
  switch (apiProvider) {
    case "firstParty":
      return hitsAnthropicBackend(apiProvider);
    case "anthropicGoogleCloud":
      return usesDefaultProviderEndpoint(apiProvider);
    case "anthropicAws":
    case "bedrock":
    case "vertex":
    case "foundry":
    case "mantle":
    case "gateway":
      return false;
  }
}
//@ chunk-e6aww6q8.js:2660578-2660708 placement
function isSubagentCacheEvictEnabled() {
  if (!canSendFirstPartyBetas() || !hitsAnthropicBackend()) return false;
  if (env.CLAUDE_CODE_SUBAGENT_CACHE_EVICT) return true;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_subagent_cache_evict", false);
}
//@ chunk-e6aww6q8.js:2660708-2660777 layout = isMedia (1)
/**
 * 对象块且类型为 image/document。
 */
function isMediaBlock(block) {
  return isObjectBlock(block) && (block.type === "image" || block.type === "document");
}
//@ chunk-e6aww6q8.js:2660777-2660830 layout
/**
 * base64 媒体块的 data 长度，否则 0。
 */
function base64MediaLength(e) {
  return isBase64ImageBlock_3(e) ? e.source.data.length : 0;
}
//@ chunk-e6aww6q8.js:2660830-2660883 file-local
/**
 * 对象块且 type=tool_result。
 */
function isToolResultBlock_2(block) {
  return isObjectBlock(block) && block.type === "tool_result";
}
//@ chunk-e6aww6q8.js:2660883-2660956 layout
/**
 * "[media removed: request limit]" 占位文本块。
 */
function mediaRemovedPlaceholder() {
  return {
    type: "text",
    text: "[media removed: request limit]",
  };
}
//@ chunk-e6aww6q8.js:2660956-2661155 file-local
/**
 * 统计消息中的 image/document 块数（含 tool_result 内嵌套），用于媒体数量超限的重试。auto 名 stripExcessMediaItems 不准确。
 */
function countMediaItems(messagesForAPI) {
  let toRemove = 0;
  for (let msg of messagesForAPI) {
    if (!Array.isArray(msg.message.content)) continue;
    for (let block of msg.message.content)
      if (isMediaBlock(block)) toRemove++;
      else if (isToolResultBlock_2(block) && Array.isArray(block.content))
        toRemove += count(block.content, isMediaBlock);
  }
  return toRemove;
}
//@ chunk-e6aww6q8.js:2661155-2662770 layout
/**
 * 按数量上限与总字节上限从最旧开始移除媒体块（tool_result 内的换成占位文本），用于请求媒体数量/大小限制。
 */
function stripExcessMediaItems(e, n, r = 0, mediaTotalByteCap = 1 / 0, h = 0, documentByteCap = 1 / 0) {
  let S = [];
  let w = [];
  for (let Me of e) {
    if (!Array.isArray(Me.message.content)) continue;
    for (let We of Me.message.content)
      if (isMediaBlock(We)) {
        S.push(base64MediaLength(We));
        w.push(We.type === "document" ? S.at(-1) : 0);
      } else if (isToolResultBlock_2(We) && Array.isArray(We.content)) {
        for (let ze of We.content)
          if (isMediaBlock(ze)) {
            S.push(base64MediaLength(ze));
            w.push(ze.type === "document" ? S.at(-1) : 0);
          }
      }
  }
  let L = new Set();
  let G = [];
  let max = Math.max(0, n - r);
  let Z = 0;
  let Se = 0;
  let ke = false;
  let documentCapTriggered = false;
  let Ee = documentByteCap > 0 && documentByteCap < mediaTotalByteCap;
  for (let [Me, We] of S.entries()) {
    G.push(Me);
    Z += We;
    Se += w[Me];
    if (G.length > n)
      for (let ze of G.splice(0, G.length - max)) {
        L.add(ze);
        Z -= S[ze];
        Se -= w[ze];
      }
    if (Ee && Se > documentByteCap) {
      ke = true;
      documentCapTriggered = true;
      for (let ze = 0; ze < G.length && Se > documentByteCap - h;) {
        let lt = G[ze];
        if (w[lt] === 0) {
          ze++;
          continue;
        }
        G.splice(ze, 1);
        L.add(lt);
        Z -= S[lt];
        Se -= w[lt];
      }
    }
    if (mediaTotalByteCap > 0 && Z > mediaTotalByteCap) {
      ke = true;
      for (let ze = 0; ze < G.length && Z > mediaTotalByteCap - h;) {
        let lt = G[ze];
        if (S[lt] === 0) {
          ze++;
          continue;
        }
        G.splice(ze, 1);
        L.add(lt);
        Z -= S[lt];
        Se -= w[lt];
      }
    }
  }
  if (L.size === 0) return e;
  let Ae = 0;
  let mapped = e.map((Me) => {
    let content = Me.message.content;
    if (!Array.isArray(content)) return Me;
    let ze = false;
    let lt = [];
    for (let Je of content)
      if (isMediaBlock(Je)) {
        if (L.has(Ae++)) ze = true;
        else lt.push(Je);
      } else if (isToolResultBlock_2(Je) && Array.isArray(Je.content)) {
        let nt = false;
        let content = Je.content.map((Et) => {
          if (isMediaBlock(Et) && L.has(Ae++)) {
            nt = true;
            return mediaRemovedPlaceholder();
          }
          return Et;
        });
        ze ||= nt;
        lt.push(
          nt
            ? {
                ...Je,
                content,
              }
            : Je,
        );
      } else lt.push(Je);
    if (!ze) return Me;
    return {
      ...Me,
      message: {
        ...Me.message,
        content: lt.length > 0 ? lt : [mediaRemovedPlaceholder()],
      },
    };
  });
  if (ke) {
    let removedBytes = 0;
    let removedDocumentBytes = 0;
    for (let ze of L) {
      removedBytes += S[ze];
      removedDocumentBytes += w[ze];
    }
    logEvent("tengu_media_byte_cap_stripped", {
      totalBytes: S.reduce((acc, lt) => acc + lt, 0),
      totalDocumentBytes: w.reduce((acc, lt) => acc + lt, 0),
      byteLimit: mediaTotalByteCap,
      documentByteLimit: documentByteCap,
      documentCapTriggered,
      removedCount: L.size,
      removedBytes,
      removedDocumentBytes,
    });
  }
  return mapped;
}
//@ chunk-e6aww6q8.js:2662770-2662812 layout
/**
 * 媒体字节上限 GrowthBook 值的 schema。
 */
var mediaByteCapSchema = DoctorLazy(() => union([literal(0), int_2().min(2 * MEDIA_BYTE_CAP_MIN)]));
//@ chunk-e6aww6q8.js:2662812-2662892 layout
/**
 * 读 GrowthBook 数值开关并校验。
 */
function readMediaByteCapFlag(e) {
  let n = mediaByteCapSchema().safeParse(getFeatureValue_CACHED_MAY_BE_STALE(e, null));
  return n.success ? n.data : undefined;
}
//@ chunk-e6aww6q8.js:2662892-2663034 layout
/**
 * 请求媒体总字节上限（tengu_keen_pudding / tengu_media_byte_cap）。
 */
function getMediaTotalByteCap() {
  let e = readMediaByteCapFlag("tengu_keen_pudding") || readMediaByteCapFlag("tengu_media_byte_cap");
  if (e === undefined)
    return hitsAnthropicBackend() ? MEDIA_TOTAL_BYTES_ANTHROPIC : MEDIA_TOTAL_BYTES_DEFAULT;
  return hitsAnthropicBackend() ? e : Math.min(e, MEDIA_TOTAL_BYTES_ANTHROPIC);
}
//@ chunk-e6aww6q8.js:2663034-2663105 layout
/**
 * 文档字节上限（tengu_golden_dove），仅 qae() 时生效。
 */
function getDocumentByteCap() {
  if (!hitsAnthropicBackend()) return 0;
  return readMediaByteCapFlag("tengu_golden_dove") || DOCUMENT_TOTAL_BYTES_DEFAULT;
}
//@ chunk-e6aww6q8.js:2663105-2663137 layout
/**
 * 1e4：withStreamHeartbeat 默认心跳间隔；另两个 2e4/45e3 是流停顿余量（qae() 时 20s，否则 45s）。
 */
var STREAM_HEARTBEAT_MS = 1e4;
var STREAM_STALL_MARGIN_FIRST_PARTY_MS = 20000;
var STREAM_STALL_MARGIN_MS = 45000;
//@ chunk-e6aww6q8.js:2663137-2663206 layout
/**
 * 流停顿判定余量：qae() 为 20s，否则 45s。
 */
function getStreamStallMarginMs() {
  try {
    return hitsAnthropicBackend() ? STREAM_STALL_MARGIN_FIRST_PARTY_MS : STREAM_STALL_MARGIN_MS;
  } catch (error) {
    logError(toError(error));
    return STREAM_STALL_MARGIN_FIRST_PARTY_MS;
  }
}
//@ chunk-e6aww6q8.js:2663206-2663286 layout
/**
 * tool_use/server_tool_use/mcp_tool_use。
 */
var MAX_STREAM_STALL_MS = 90000;
var MAX_PING_EVENTS_RESETTING_IDLE = 30;
var TOOL_USE_BLOCK_TYPES = new Set(["tool_use", "server_tool_use", "mcp_tool_use"]);
//@ chunk-e6aww6q8.js:2663286-2663765 layout
/**
 * 包装 SSE 迭代器：超过间隔无事件但 lastAt 前进时插入 {type:"ping"}。
 */
async function* withStreamHeartbeat(e, n, r = STREAM_HEARTBEAT_MS, clock = systemClock) {
  if (!n) {
    yield* e;
    return;
  }
  let h = e[Symbol.asyncIterator]();
  let y = clock.monotonicNow();
  let S = null;
  let w;
  let L = Symbol("heartbeat");
  try {
    while (true) {
      S ??= h.next();
      let promise = new Promise((resolve) => {
        w = clock.setTimeout(() => resolve(L), r, {
          unref: true,
        });
      });
      let winner = await Promise.race([S, promise]);
      w?.();
      w = undefined;
      if (winner === L) {
        if (n.lastAt > y) {
          y = clock.monotonicNow();
          yield {
            type: "ping",
          };
        }
        continue;
      }
      S = null;
      if (winner.done) return;
      y = clock.monotonicNow();
      yield winner.value;
    }
  } finally {
    w?.();
    try {
      Promise.resolve(h.return?.(undefined)).catch(() => {});
    } catch {}
  }
}
//@ chunk-e6aww6q8.js:2663765-2663906 layout
/**
 * 非第一方/假定第一方/自定义 ANTHROPIC_BASE_URL/非 OAuth 时为真；否则看组织额度状态。用于 fallback credit 端点判断。
 */
function isFirstPartyCreditEndpoint(e = getAPIProvider()) {
  if (
    e !== "firstParty" ||
    assumesFirstPartyBaseUrl() ||
    env.ANTHROPIC_BASE_URL !== undefined ||
    !isWIFDispatchAuth()
  )
    return true;
  let resolvedWIFBaseUrlSnapshot = getResolvedWIFBaseUrlSnapshot();
  return (
    resolvedWIFBaseUrlSnapshot === null ||
    (resolvedWIFBaseUrlSnapshot !== undefined && isFirstPartyAnthropicHost(resolvedWIFBaseUrlSnapshot))
  );
}
//@ chunk-e6aww6q8.js:2663906-2664027 layout
/**
 * 第一方、无 ANTHROPIC_UNIX_SOCKET、api.anthropic.com 直连。
 */
function isDirectFirstPartyApi() {
  try {
    return (
      getAPIProvider() === "firstParty" &&
      env.ANTHROPIC_UNIX_SOCKET === undefined &&
      isActualFirstPartyAnthropicBaseUrl() &&
      !isWIFDispatchAuth()
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-e6aww6q8.js:2664027-2664279 layout
/**
 * bedrock/vertex/mantle/anthropicGoogleCloud 是否未设自定义 base URL。
 */
function usesDefaultProviderEndpoint(e) {
  switch (e) {
    case "bedrock":
      return isGenuineBedrockEndpoint();
    case "vertex":
      return env.ANTHROPIC_VERTEX_BASE_URL === undefined;
    case "mantle":
      return env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL === undefined;
    case "anthropicGoogleCloud":
      return env.ANTHROPIC_GOOGLE_CLOUD_BASE_URL === undefined;
  }
}
//@ chunk-e6aww6q8.js:2664279-2664552 layout
/**
 * 各提供商是否走自定义/网关端点。
 */
function isCustomEndpoint(providerForModel) {
  switch (providerForModel) {
    case "gateway":
      return true;
    case "firstParty":
      return !isFirstPartyAnthropicBaseUrl() || !isFirstPartyCreditEndpoint(providerForModel);
    case "bedrock":
    case "mantle":
    case "vertex":
      return !usesDefaultProviderEndpoint(providerForModel);
    case "anthropicAws":
      return !hitsAnthropicBackend(providerForModel);
    case "foundry":
      return env.ANTHROPIC_FOUNDRY_BASE_URL !== undefined;
    case "anthropicGoogleCloud":
      return !usesDefaultProviderEndpoint(providerForModel);
  }
}
//@ chunk-e6aww6q8.js:2664552-2664898 layout
/**
 * mint 模型与请求模型同提供商且端点允许 fallback credit 时为真。
 */
function canUseFallbackCreditMintModel(fallbackCreditMintModel, model) {
  let providerForModel = getProviderForModel(model);
  if (getProviderForModel(fallbackCreditMintModel) !== providerForModel) return false;
  switch (providerForModel) {
    case "gateway":
      return false;
    case "firstParty": {
      if (!isFirstPartyAnthropicBaseUrl()) return false;
      return isFirstPartyCreditEndpoint(providerForModel);
    }
    case "bedrock":
      return usesDefaultProviderEndpoint("bedrock");
    case "mantle":
      return usesDefaultProviderEndpoint("mantle");
    case "foundry":
      return true;
    case "anthropicAws":
      return hitsAnthropicBackend(providerForModel);
    case "anthropicGoogleCloud":
      return false;
    case "vertex":
      return (
        usesDefaultProviderEndpoint("vertex") &&
        getVertexRegionForModel(fallbackCreditMintModel) === getVertexRegionForModel(model)
      );
  }
}
//@ chunk-e6aww6q8.js:2664898-2665281 layout
/**
 * 从 api_system 消息的 toolAdditions/toolRemovals 里去掉 advisor 工具。
 */
function dropAdvisorFromApiSystem(e) {
  return e.map((n) => {
    if (n.type !== "api_system") return n;
    let filtered = n.toolAdditions?.filter((toolAddition) => toolAddition !== ADVISOR_TOOL_NAME);
    let filtered_2 = n.toolRemovals?.filter((toolRemoval) => toolRemoval !== ADVISOR_TOOL_NAME);
    if (filtered?.length === n.toolAdditions?.length && filtered_2?.length === n.toolRemovals?.length)
      return n;
    let { toolAdditions, toolRemovals, ...S } = n;
    return {
      ...S,
      ...(filtered !== undefined &&
        filtered.length > 0 && {
          toolAdditions: filtered,
        }),
      ...(filtered_2 !== undefined &&
        filtered_2.length > 0 && {
          toolRemovals: filtered_2,
        }),
    };
  });
}
//@ chunk-e6aww6q8.js:2665281-2665313 layout
/**
 * 消息含 advisor 相关块（sJe 计数 >0）。
 */
function hasAdvisorBlocks(e) {
  return countThinkingBlocks(e) > 0;
}
//@ chunk-e6aww6q8.js:2665313-2665503 layout
/**
 * advisorStripPlan 覆盖到本次消息里的 assistant 时记 tengu_advisor_strip_replayed。
 */
function logAdvisorStripReplayed(messages, options) {
  try {
    let size = unionSets(options.advisorStripPlan, getAdvisorStrippedMessageIds(messages)).size;
    if (size === 0) return;
    logEvent("tengu_advisor_strip_replayed", {
      query_source: agentTypeForTelemetry(options.querySource),
      covered_assistant_count: size,
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2665503-2668815 layout
/**
 * 请求前消息规整：剥离 tool_reference/caller（无工具搜索时）、修复 tool_use/tool_result 配对、去 advisor 块、可选去 web search、媒体数量上限，然后 normalizeMessagesForAPI 并处理思考签名。返回 messagesForAPI 与多个降级回调。
 */
function normalizeMessagesForRequest(e, normalizeOptions) {
  let r = normalizeOptions.bodyModel ?? normalizeOptions.model;
  let s = stripAnyVersatileSuffix(r);
  let keepForeignThinking = normalizeOptions.keepForeignThinking ?? "none";
  let y = stripForeignModelThinking(e, s, keepForeignThinking);
  let foreignModelChecker = makeForeignModelChecker(s);
  let keptForeignSignatures =
    keepForeignThinking !== "none" &&
    e.some(
      (pt) =>
        pt.type === "assistant" &&
        foreignModelChecker(pt) &&
        shouldKeepForeignThinking(pt, s, keepForeignThinking) &&
        Array.isArray(pt.message.content) &&
        pt.message.content.some(hasThinkingSignature),
    );
  let L =
    uses1mContext(r, undefined) ||
    modelHasNative1MContext(r) ||
    normalizeOptions.betas.includes(BETA_LONG_CONTEXT) ||
    getSonnet46ContextWindowOverride(r) !== null ||
    antGrants1MContext(r);
  let reminderFold = resolveReminderFold_2(e, normalizeOptions.reminderFold);
  let echoWireToolInputs = shouldEchoWireToolInputs(e, normalizeOptions.echoWireToolInputs);
  let textsToFold = renderedAttachmentTexts(y);
  let Se = (messages, Et) => {
    if (!normalizeOptions.useToolSearch)
      messages = messages.map((msg) => {
        switch (msg.type) {
          case "user":
            return stripToolReferenceBlocksFromUserMessage(msg);
          case "assistant":
            return stripCallerFieldFromAssistantMessage(msg);
          default:
            return msg;
        }
      });
    messages = ensureToolResultPairing(messages, {
      reminderFold,
      textsToFold,
      keyedRemindersStaySiblings: Et !== undefined && shouldUseMidConvSystem(Et),
    });
    if (!normalizeOptions.advisorModel) messages = stripAdvisorBlocks(messages);
    if (normalizeOptions.stripWebSearch) messages = stripWebSearchBlocks(messages).messages;
    return stripExcessMediaItems(
      messages,
      Math.min(L ? MAX_MEDIA_ITEMS_LARGE_CONTEXT : MAX_MEDIA_ITEMS, normalizeOptions.mediaItemLimit ?? 1 / 0),
      MEDIA_BYTES_PER_ITEM_SLACK,
      getMediaTotalByteCap(),
      MEDIA_BYTE_CAP_MIN,
      getDocumentByteCap(),
    );
  };
  let ke = normalizeOptions.accountMemoryWithheld ?? isAccountMemoryRedactionOn();
  let we = {
    accountMemoryWithheld: ke,
    preserveTrailingThinking: normalizeOptions.resumeIncompleteThinking,
    onSessionNoticeRender: logSessionNoticeRender,
    onDeclaredRoundRender: logDeclaredRound,
    echoWireToolInputs,
    ingestPool: normalizeOptions.ingestPool,
    echoApiBlockOrder: isStellarDriftEnabled(),
    ...(normalizeOptions.deferredToolReferencePlan && {
      keptToolNames: new Set(normalizeOptions.deferredToolReferencePlan.kept.keys()),
      strippedToolReferenceKeys: normalizeOptions.deferredToolReferencePlan.strippedReferenceKeys,
    }),
    ...(normalizeOptions.declaredToolNames && {
      declaredToolNames: normalizeOptions.declaredToolNames,
    }),
    surfaceLateToolAdditions:
      normalizeOptions.betas.includes(BETA_MID_CONV_TOOL_CHANGE) && modelTakesToolAdditions(r),
    advisorToolChanges:
      normalizeOptions.advisorDeferred === true &&
      normalizeOptions.advisorModel !== undefined &&
      normalizeOptions.betas.includes(BETA_MID_CONV_TOOL_CHANGE) &&
      modelTakesToolAdditions(r),
    deferredWireToolNames: normalizeOptions.deferredWireToolNames,
    nameOnlyAnnouncements: normalizeOptions.nameOnlyAnnouncements,
    inlineToolDefinitions:
      normalizeOptions.byValueNames !== undefined &&
      normalizeOptions.byValueNames.size > 0 &&
      normalizeOptions.betas.includes(BETA_INLINE_TOOLS) &&
      modelTakesToolAdditions(r)
        ? normalizeOptions.byValueNames
        : undefined,
    withoutAttachmentHooks: normalizeOptions.withoutAttachmentHooks,
    ...(normalizeOptions.pollEventsAsText === true && {
      pollEventsAsText: true,
    }),
    thinkingStripPlan: normalizeOptions.thinkingStripPlan,
    advisorStripPlan: normalizeOptions.advisorStripPlan,
    keptReminders:
      normalizeOptions.keptReminders === true &&
      normalizeOptions.betas.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT),
    reminderFold,
  };
  let Ee = normalizeOptions.midConvLatchedOff ? undefined : r;
  let Ae = normalizeMessagesForAPI(y, normalizeOptions.tools, Ee, we);
  validateImagesInMessages(Ae, imageLimitsForModel(normalizeOptions.model).maxBase64Size);
  queryCheckpoint("query_message_normalization_end");
  Ae = applyApiBlockOrderEcho(Se(Ae, Ee), we.echoApiBlockOrder, we.preserveTrailingThinking);
  let included = normalizeOptions.betas.includes(BETA_PER_MESSAGE_EFFORT);
  let canonicalName = getCanonicalName(r);
  let We = {
    effort: included && supportsPerTurnEffort(r, canonicalName) ? normalizeOptions.perTurnEffort : undefined,
    now:
      included &&
      normalizeOptions.betas.includes(BETA_PER_TURN_TIMING) &&
      supportsPerTurnTiming(r, canonicalName)
        ? normalizeOptions.perTurnNow
        : undefined,
  };
  let ze = (messages) =>
    We.effort === undefined && We.now === undefined
      ? messages
      : attachPerTurnOutputConfig(messages, {
          ...We,
          effortCap: normalizeOptions.perTurnEffortCap?.(),
        });
  Ae = ze(Ae);
  let midConvFallback = null;
  if (
    !normalizeOptions.midConvLatchedOff &&
    (normalizeOptions.betas.includes(BETA_MID_CONVERSATION_SYSTEM) || included)
  ) {
    let pt = Ae;
    midConvFallback = pt.some((Et) => Et.type === "api_system")
      ? () =>
          applyApiBlockOrderEcho(
            Se(normalizeMessagesForAPI(y, normalizeOptions.tools, undefined, we), undefined),
            we.echoApiBlockOrder,
            we.preserveTrailingThinking,
          )
      : () => pt;
  }
  let toolChangeFallback = null;
  if (
    (we.surfaceLateToolAdditions || we.advisorToolChanges) &&
    Ae.some(
      (pt) =>
        pt.type === "api_system" &&
        ((pt.toolAdditions?.length ?? 0) > 0 || (pt.toolRemovals?.length ?? 0) > 0),
    )
  )
    toolChangeFallback = () =>
      ze(
        Se(
          normalizeMessagesForAPI(y, normalizeOptions.tools, Ee, {
            ...we,
            surfaceLateToolAdditions: false,
            advisorToolChanges: false,
            inlineToolDefinitions: undefined,
          }),
          Ee,
        ),
      );
  let inlineToolsFallback = null;
  if (
    we.inlineToolDefinitions !== undefined &&
    Ae.some((pt) => pt.type === "api_system" && pt.toolDefinitions !== undefined)
  )
    inlineToolsFallback = () =>
      ze(
        Se(
          normalizeMessagesForAPI(y, normalizeOptions.tools, Ee, {
            ...we,
            inlineToolDefinitions: undefined,
            nameOnlyAnnouncements: new Set([
              ...(we.nameOnlyAnnouncements ?? []),
              ...(normalizeOptions.byValueAnnouncements ?? []),
            ]),
          }),
          Ee,
        ),
      );
  return {
    messagesPreNormalize: y,
    messagesForAPI: Ae,
    accountMemoryEpoch: redactAccountMemory(
      y,
      ke,
      createMemoryServerVerifier(() => normalizeOptions.tools),
    ).epoch,
    midConvFallback,
    toolChangeFallback,
    inlineToolsFallback,
    keptForeignSignatures,
    blocksEligible: we.surfaceLateToolAdditions === true,
  };
}
//@ chunk-e6aww6q8.js:2668815-2669526 layout
/**
 * 何时在请求头 anthropic-usage-limit 发 extended（多个 tengu_lantern_* 开关、第一方订阅）。
 */
function shouldSendExtendedUsageLimitHeader(options, n, r) {
  if (n) return false;
  let s = options.querySource === "web_fetch_apply";
  if (s) {
    let w = classifyQuerySource(options.callerAnsweredQuerySource);
    if (w !== "main" && w !== "subagent") return false;
  }
  if (!s && (options.queryTracking?.depth ?? 0) === 0 && !r) return false;
  if (classifyQuerySource(options.querySource) === "auxiliary" && options.querySource !== "compact" && !s)
    return false;
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return false;
  let cachedExtraUsageDisabledReason = getGlobalConfig().cachedExtraUsageDisabledReason;
  let y =
    typeof cachedExtraUsageDisabledReason === "string" &&
    cachedExtraUsageDisabledReason !== "fetch_error" &&
    cachedExtraUsageDisabledReason !== "unknown";
  if (s && cachedExtraUsageDisabledReason !== null && !y) return false;
  if (s && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_hinge", false) !== true) return false;
  if (
    cachedExtraUsageDisabledReason === null &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_smooth_harbor", false)
  )
    return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_spool", false)) return false;
  let agentContext = options.agentContext;
  return !(
    isSubagentContext(agentContext) &&
    y &&
    agentContext.workflowWaitsOutUsageLimit?.(getCurrentLimits().resetsAt) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_snuffer", false) === true
  );
}
//@ chunk-e6aww6q8.js:2669526-2669555 layout
/**
 * GrowthBook 开关名 tengu_fizzy_bonbon。
 */
var TENGU_FIZZY_BONBON = "tengu_fizzy_bonbon";
//@ chunk-e6aww6q8.js:2669555-2669683 layout
/**
 * 惰性估算消息 token 数（失败时 +∞）。
 */
function lazyContextTokenEstimate(messages, model) {
  let r;
  return () => {
    if (r === undefined)
      try {
        r =
          estimateTokensWithAnchor(messages, bytesPerTokenForModel(model)) +
          stripInProgressAssistantMessage(messages);
      } catch (error) {
        logError(toError(error));
        r = Number.POSITIVE_INFINITY;
      }
    return r;
  };
}
//@ chunk-e6aww6q8.js:2669683-2669780 layout
/**
 * 若当前上下文已超过 fallback 模型窗口（GCn）则不用 accessFallbackModel，返回 undefined。
 */
function resolveAccessFallbackModel(model, accessFallbackModel, lazyTokenEstimate) {
  if (accessFallbackModel === undefined) return;
  try {
    return ladderStepLosesContext(model, accessFallbackModel, lazyTokenEstimate)
      ? undefined
      : accessFallbackModel;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2669780-2669840 layout
/**
 * 有 ladders 时记录会话大小（token 估算）。
 */
function recordConversationSize(agentId, n) {
  try {
    if (hasFallbackLadders()) recordConversationSize_2(agentId, n());
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2669840-2669901 layout
/**
 * CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL=5m 时把消息缓存 TTL 降为 5m。
 */
function applyMessagesCacheTtlOverride(e) {
  try {
    return applyFiveMinuteOverride(e);
  } catch (error) {
    logError(toError(error));
    return e;
  }
}
//@ chunk-e6aww6q8.js:2669901-2669946 layout
/**
 * 消息 TTL 被降级时把主线程请求日志里的缓存 TTL 调成 5 分钟。
 */
function noteMainThreadCacheTtl5m() {
  try {
    adjustLastMainThreadCacheTtlMs(CACHE_TTL_5M_MS);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2669946-2670095 layout
/**
 * 服务器拒绝工具搜索时抛出，携带 refusal 与是否已声明工具搜索。
 */
class ToolSearchRefusedError extends Error {
  refusal;
  declaredToolSearch;
  constructor(e, declaredToolSearch) {
    super("tool search refused", {
      cause: e,
    });
    this.refusal = e;
    this.declaredToolSearch = declaredToolSearch;
  }
}
//@ chunk-e6aww6q8.js:2670095-2670743 layout
/**
 * 包 queryModel：捕获 ToolSearchRefusedError 后加一条 critical_system_reminder（延迟工具改为直接声明）重跑一次。
 */
async function* queryModelWithToolSearchRecovery(...e) {
  let n;
  try {
    return yield* queryModel(...e);
  } catch (error) {
    if (!(error instanceof ToolSearchRefusedError)) throw error;
    n = error;
  }
  let [r, systemPrompt, thinkingConfig, tools, signal, w] = e;
  let L = n.declaredToolSearch
    ? [
        createAttachmentMessage_2({
          type: "critical_system_reminder",
          content: `${TOOL_SEARCH_TOOL_NAME} is no longer available. Tools listed earlier as deferred that are still available are declared in full: call them directly.`,
        }),
      ]
    : [];
  let G = false;
  let model = queryModel([...r, ...L], systemPrompt, thinkingConfig, tools, signal, {
    ...w,
    toolSearchRefusal: n.refusal,
  });
  try {
    for (let Z = await model.next(); ; Z = await model.next()) {
      if (Z.done) return Z.value;
      let Se = Z.value;
      if (
        !G &&
        (Se.type === "assistant"
          ? !Se.isApiErrorMessage
          : Se.type === "stream_event" && Se.event.type === "message_start")
      ) {
        G = true;
        yield* L;
      }
      yield Se;
    }
  } finally {
    await model.return(undefined);
  }
}
//@ chunk-e6aww6q8.js:2670743-2799701 callgraph-witnessed = queryModel (0.184)
/**
 * queryModel：一次 Messages API 调用的全部逻辑（约 129KB）。依次：off-switch 与模型封锁检查 → beta 列表与模型事实 → 工具 schema 构建、工具搜索/延迟工具决策 → normalizeMessagesForRequest 规整消息 → buildSystemPromptBlocks → buildRequestParams（paramsFromContext 过滤被拒 beta、thinking/effort/output_config/context_management/speed/diagnostics、addCacheBreakpoints）→ withRetry 内 anthropic.beta.messages.create(stream:true) → 解析 SSE（message_start/content_block_*\/message_delta/message_stop）产出 stream_event 与 assistant 消息、累计 usage 与成本 → 流停顿/空闲超时/无事件时回退非流式 → onError 里按错误类型返回 "retry:<原因>"（去 beta、去 thinking.display、去媒体、降 effort 等）自愈重发。
 */
async function* queryModel(messages, systemPrompt, thinkingConfig, tools, signal, { modelFacts, ...S }) {
  let { fallbackModel, accessFallbackModel = S.accessFallbackModel } = resolveFallbackModel(
    S.model,
    S.fallbackModel,
    isRefusedOrSentModel,
  );
  let lazyTokenEstimate = lazyContextTokenEstimate(messages, S.model);
  let accessFallbackModel_2 = resolveAccessFallbackModel(S.model, accessFallbackModel, lazyTokenEstimate);
  let options =
    fallbackModel === S.fallbackModel
      ? S
      : {
          ...S,
          fallbackModel,
        };
  let clock = options.clock ?? systemClock;
  let runGuarded = (Wn) => (isAutoModeQuerySource(options.querySource) ? withCatalogSuppressed(Wn) : Wn());
  let previousRequestId = runGuarded(() => getCanonicalName(options.model));
  let isTopLevelMain = classifyQuerySource(options.querySource) === "main" && !options.agentId;
  if (isTopLevelMain) startProfilePhase("model_gates");
  if (
    !isClaudeAISubscriber() &&
    (isNonCustomOpusModel(previousRequestId) ||
      isNonCustomFableModel(previousRequestId) ||
      isNonCustomMythosModel(previousRequestId)) &&
    (
      await getDynamicConfig_BLOCKS_ON_INIT("tengu-off-switch", {
        activated: false,
      })
    ).activated
  ) {
    logEvent("tengu_off_switch_query", {});
    yield getAssistantMessageFromApiError(
      Error(isNonCustomFableModel(previousRequestId) ? FABLE_HIGH_LOAD_MESSAGE : OPUS_HIGH_LOAD_MESSAGE),
      options.model,
    );
    return;
  }
  let Ae = null;
  try {
    Ae = await blockedOverrideText(previousRequestId);
  } catch (error) {
    logForDebugging(`tengu-model-error-overrides block check failed: ${error}`, {
      level: "error",
    });
  }
  if (Ae !== null) {
    if (options.fallbackModel !== undefined) {
      logEvent("tengu_off_switch_query", {
        tier: lit_2("per_model_block"),
        outcome: lit_2("fallback"),
      });
      throw new FallbackTriggeredError(options.model, options.fallbackModel, "model_blocked", undefined, Ae);
    }
    logEvent("tengu_off_switch_query", {
      tier: lit_2("per_model_block"),
    });
    yield createApiErrorMessage({
      content: Ae,
      error: "rate_limit",
    });
    return;
  }
  let previousRequestId_2 = collectRecentAssistantTexts(messages);
  let Me = promptIdForRequest(messages, options.agentContext);
  let ccrSenderAddressKey = getCcrSenderAddressKey(options.agentContext, Me);
  if (ccrSenderAddressKey && isFirstPartyApiBackend()) await prefetchCcrSenderAddress(ccrSenderAddressKey);
  let turnOrigin = turnOriginSafe(messages);
  let turnPosition = turnPositionSafe(messages);
  let Je = isSessionTaskTurn(messages);
  let nt = lastAssistantMessageId(messages);
  let resolvedModel =
    getAPIProvider() === "bedrock" && options.model.includes("application-inference-profile")
      ? ((await getInferenceProfileBackingModel(stripAnyVersatileSuffix(options.model))) ?? options.model)
      : options.model;
  logUnrecognizedModel(options.model, options.querySource);
  if (isDynamicModelConfigEnabled())
    await awaitModelConfigFetch(options.model, options.credentials, options.storageV5);
  queryCheckpoint("query_tool_schema_build_start");
  if (isTopLevelMain) {
    endProfilePhase("model_gates");
    startProfilePhase("tool_schema_build");
  }
  let isAgenticQuery =
    options.querySource.startsWith("repl_main_thread") ||
    options.querySource.startsWith("agent:") ||
    options.querySource === "sdk" ||
    options.querySource === "hook_agent";
  let conversation = stickyBetasOr(options.stickyBetas);
  if (!conversation.declaredToolsDecided)
    runGuarded(() => seedWireShapeFromRecord(conversation, options.recordedWireShape, options.model));
  let betaList = runGuarded(() =>
    getMergedBetas(options.model, {
      isAgenticQuery,
    }),
  );
  let canonicalModel = runGuarded(() => getCanonicalName(resolvedModel));
  let modelFacts_2 =
    modelFacts?.model === resolvedModel && !isAutoModeQuerySource(options.querySource)
      ? modelFacts
      : runGuarded(() => getModelContextInfo(resolvedModel));
  if (isAdvisorEnabled() && (isAdvisorToolEnabled() || options.advisorModel !== undefined))
    betaList.push(BETA_ADVISOR_TOOL);
  if (
    runGuarded(() => shouldSendInterleavedThinkingBeta(resolvedModel)) &&
    modelFacts_2.thinking.supported &&
    !betaList.includes(BETA_THINKING_TOKEN_COUNT)
  )
    betaList.push(BETA_THINKING_TOKEN_COUNT);
  let Yt =
    options.fallbackCreditCode !== undefined &&
    options.fallbackCreditMintModel !== undefined &&
    canUseFallbackCreditMintModel(options.fallbackCreditMintModel, options.model);
  let creditMintModel = Yt ? options.fallbackCreditMintModel : undefined;
  let effectiveModel = creditMintModel ?? options.model;
  let betas = upgradeDisabledThinkingForModel(
    thinkingConfig,
    modelFacts_2.thinking.alwaysOn ||
      (creditMintModel !== undefined && runGuarded(() => isThinkingAlwaysOn(creditMintModel))),
  );
  let pn = creditMintModel === undefined ? toProviderWireModelId(options.model) : undefined;
  if (pn !== undefined && !conversation.declaredToolsDecided) {
    let Wn = hasContextBeta(conversation);
    for (let pr of getRefusedBetasForModel(pn)) markBetaRejected(conversation, pr);
    if (options.stickyBetas === undefined) notifyPerTurnEffortInactive(conversation, Wn);
  }
  let latchBetaRefused = (Wn, pr) => {
    markBetaRejected(conversation, Wn);
    let Jr = "in this conversation";
    if (pr && pn !== undefined) {
      markBetaRefusedForModel(pn, Wn);
      Jr += `, or by new ones on ${pn} in this process`;
    }
    logForDebugging(`[betas] the API refused ${Wn.header}; not sent again ${Jr}`, {
      level: "warn",
    });
  };
  registerMcpStandardKeys(tools);
  await awaitArtifactRosterSafe(tools);
  let hn = options.withoutToolDescribeHooks ? "engine" : "hooks";
  let ho = (tool, nonDeferrableBuiltins) =>
    hn === "engine"
      ? isDeferredToolByEngine(tool, nonDeferrableBuiltins)
      : isDeferredTool_2(tool, nonDeferrableBuiltins);
  if (!options.withoutToolDescribeHooks)
    await prefetchToolDescribeHooks(tools, (tool) =>
      toolToApiDefinition(tool, {
        getToolPermissionContext: options.getToolPermissionContext,
        tools,
        agents: options.agents,
        allowedAgentTypes: options.allowedAgentTypes,
        model: effectiveModel,
        enginePlacement: isDeferredToolByEngine(tool) ? "deferred" : "listed",
        querySource: options.querySource,
      }),
    );
  let yn =
    isAgenticQuery || options.forkPointUuid !== undefined
      ? runGuarded(() => getAdvisorModelForQuery(options.advisorModel, effectiveModel))
      : undefined;
  let declaredToolSearch =
    !isAutoModeQuerySource(options.querySource) &&
    (await isToolSearchEnabled(
      effectiveModel,
      tools,
      options.getToolPermissionContext,
      options.agents,
      "query",
      options.credentials,
      options.recordedToolDescriptions,
      conversation,
    )) &&
    options.toolSearchRefusal === undefined;
  let Xn = shouldEchoWireToolInputs(messages, options.echoWireToolInputs);
  let fo = options.resumeIncompleteThinking === true;
  betaList = runGuarded(() => adjustToolBetas(conversation, betaList, options.model));
  let To = false;
  if (
    !declaredToolSearch &&
    options.toolSearchRefusal === undefined &&
    !isAutoModeQuerySource(options.querySource)
  )
    try {
      To = runGuarded(() =>
        shouldAnnounceDeferredTools(conversation, effectiveModel, {
          toolSearchToolFilteredOut: toolSearchToolFilteredOut(effectiveModel, tools, conversation),
          toolPoolRefreshes: options.toolPoolRefreshes === true,
          aheadOfRequest: false,
        }),
      );
    } catch (error) {
      logError(toError(error));
    }
  if (!conversation.declaredToolsDecided) {
    let Wn;
    try {
      Wn = options.recordedDeferredTools?.();
      for (let pr of Wn?.nameOnlyAnnouncements ?? []) conversation.nameOnlyAnnouncements.add(pr);
      if (Wn !== undefined)
        seedDeferredToolReferences(messages, [...Wn.entries.values()], {
          strippedReferences: Wn.strippedReferences,
          ...((declaredToolSearch || To) &&
            toolChangeHeaderAllowed(conversation) && {
              surfacedCarrier: conversation,
            }),
        });
    } catch (error) {
      logError(toError(error));
    }
    try {
      let toolInputCopies = Wn?.toolInputCopies;
      if (
        toolInputCopies !== undefined &&
        toolInputCopies.size > 0 &&
        shouldTrackDeferredToolForQuery(options.querySource) &&
        shouldEchoWireToolInputsForRequest(messages, Xn)
      )
        adoptWireToolInputCopies(messages, toolInputCopies);
    } catch (error) {
      logError(toError(error));
    }
  }
  let bo = new Set();
  let vn = new Set();
  let co = true;
  try {
    co = isToolDefinedByValueEnabled();
  } catch (error) {
    logError(toError(error));
  }
  try {
    if (
      betaList.includes(BETA_INLINE_TOOLS) &&
      runGuarded(() => canDeclareInlineTools(conversation, effectiveModel))
    ) {
      bo = deltaToolNames(messages, conversation.nameOnlyAnnouncements);
      vn = deferredToolNames(messages, conversation.nameOnlyAnnouncements);
    }
  } catch (error) {
    logError(toError(error));
  }
  let So;
  let ko = 0;
  if (declaredToolSearch)
    try {
      let nonDeferrableBuiltins = getNonDeferrableBuiltins();
      let declaredToolSet = computeDeclaredToolSet(
        conversation,
        tools,
        (Jr) => ho(Jr, nonDeferrableBuiltins),
        effectiveModel,
        !messages.some((message) => message.type === "assistant"),
      );
      So = declaredToolSet;
      if (declaredToolSet !== undefined)
        ko = count(
          turnDeniedTools(tools, conversation),
          (Jr) => declaredToolSet.has(Jr.name) && ho(Jr, nonDeferrableBuiltins),
        );
    } catch (error) {
      logError(toError(error));
    }
  let un;
  let ao = !conversation.declaredToolsDecided;
  let advisorExperiment = deferredToolsEnabled();
  let yo = 0;
  if (declaredToolSearch || To) {
    let permissionContext;
    if (!conversation.declaredToolsDecided)
      try {
        permissionContext = await options.getToolPermissionContext();
      } catch (error) {
        logError(toError(error));
      }
    try {
      un = resolveDeclaredToolSet(
        conversation,
        () =>
          options.recordedToolDescriptions && {
            names: options.recordedToolDescriptions.keys(),
            servers: options.recordedToolServers,
            entries: options.recordedToolEntries,
          },
        tools,
        {
          latch: true,
          permissionContext,
        },
      );
    } catch (error) {
      logError(toError(error));
      So = undefined;
    }
  } else if (ao) conversation.declaredTools = undefined;
  markDeclaredToolsDecided(conversation);
  let Ho = un ?? So;
  let deferredToolNames_2 = new Set();
  let br = 0;
  if (declaredToolSearch || To)
    try {
      let nonDeferrableBuiltins = getNonDeferrableBuiltins();
      for (let tool of tools) {
        let Jr = declaredToolSearch && ho(tool, nonDeferrableBuiltins);
        if (
          Ho === undefined
            ? To
              ? false
              : Jr
            : isDeferredToolInConversation(tool, Ho, tools, {
                toolSearchAbsent: To,
                placements: hn,
                nonDeferrableBuiltins,
              })
        ) {
          deferredToolNames_2.add(tool.name);
          if (!Jr) br++;
        }
      }
    } catch (error) {
      logError(toError(error));
      un = undefined;
      Ho = undefined;
      deferredToolNames_2.clear();
      br = 0;
      let nonDeferrableBuiltins = getNonDeferrableBuiltins();
      for (let tool of tools)
        if (declaredToolSearch && ho(tool, nonDeferrableBuiltins)) deferredToolNames_2.add(tool.name);
    }
  let generation = deferredToolCache().generation;
  let Fr =
    declaredToolSearch || To
      ? logKeptDeferredTools(messages, tools, options.querySource, {
          keepMcp: !alwaysFalseFeed(tools),
          surfacedOnWire: conversation.surfacedOnWire,
          ...(advisorExperiment && {
            declaredInline: un,
          }),
        })
      : undefined;
  if (
    declaredToolSearch &&
    deferredToolNames_2.size === 0 &&
    !(Ho !== undefined && Ho === So && ko > 0) &&
    (!options.hasPendingMcpServers || alwaysFalseFeed(tools)) &&
    !Fr?.kept.size &&
    !un?.has(TOOL_SEARCH_TOOL_NAME)
  ) {
    logForDebugging("Tool search disabled: no deferred tools available to search");
    declaredToolSearch = false;
    if (advisorExperiment && un !== undefined && Fr !== undefined)
      try {
        Fr = logKeptDeferredTools(messages, tools, options.querySource, {
          keepMcp: !alwaysFalseFeed(tools),
          surfacedOnWire: conversation.surfacedOnWire,
        });
      } catch (error) {
        logError(toError(error));
      }
  }
  let cs = declaredToolSearch ? "tool_search" : To ? "tool_addition" : undefined;
  let _r;
  let Cr;
  let unclassifiedDepartures = 0;
  if (cs !== undefined) {
    let discoveredToolNames = extractDiscoveredToolNames(messages, {
      surfaced: toolChangeHeaderAllowed(conversation)
        ? {
            exceptAnnouncements: conversation.nameOnlyAnnouncements,
          }
        : conversation.surfacedOnWire,
    });
    let pr = new Set();
    if (bo.size > 0)
      try {
        pr = co
          ? new Set(collectToolReferences(messages).map((Jr) => Jr.toolName))
          : extractDiscoveredToolNames(messages);
      } catch (error) {
        logError(toError(error));
      }
    _r = tools.filter((tool) => {
      if (!deferredToolNames_2.has(tool.name)) return true;
      if (toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME)) return true;
      return discoveredToolNames.has(tool.name) && (!bo.has(tool.name) || pr.has(tool.name));
    });
    try {
      let Jr = updateDeclaredToolSet(_r, un ?? So);
      _r = Jr.tools;
      yo = Jr.redeclared.length;
    } catch (error) {
      logError(toError(error));
    }
  } else {
    _r = tools.filter((tool) => {
      if (toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME)) return false;
      if (bo.has(tool.name)) return false;
      return true;
    });
    let Wn = asScratchDeclaredToolSet(conversation);
    if (Wn !== undefined)
      try {
        let pr = await isHipaaRestricted(Wn, tools, {
          mcpClients: options.mcpClients ?? [],
          getPermissionContext: options.getToolPermissionContext,
          byValue: bo,
        });
        Cr = bo.size === 0 ? pr.kept : pr.kept.without(bo);
        unclassifiedDepartures = pr.unread;
        let Jr = updateDeclaredToolSet(_r, Cr);
        _r = Jr.tools;
        yo = Jr.redeclared.length;
      } catch (error) {
        logError(toError(error));
      }
    else if (ao && options.recordedToolDescriptions === undefined)
      try {
        _r = turnDeniedTools(_r, conversation);
      } catch (error) {
        logError(toError(error));
      }
  }
  let Oo = identityValue_2(hideAliasedV1Tools(_r));
  noteWaitForMcpServers(Oo, options.querySource);
  let providerForModel = getProviderForModel(options.model);
  let Or = declaredToolSearch ? getToolSearchBeta() : null;
  if (Or && providerForModel !== "bedrock") {
    if (!betaList.includes(Or)) betaList.push(Or);
  }
  let Io;
  let featureEnabled = shouldUseGlobalCacheScope();
  let rs = (tool) => deferredToolNames_2.has(tool.name) || (declaredToolSearch && shouldDeferLspTool(tool));
  let Es = (Wn) => Fr?.kept.has(Wn.name) === true;
  let Nr = true;
  try {
    Nr =
      Oo.some((tool) => (un?.has(tool.name) ?? true) && !rs(tool) && !Es(tool)) ||
      (un !== undefined &&
        isLateToolAdditionsEnabled(un, {
          pool: tools,
          keptDeferred: Fr?.kept.keys() ?? [],
          keepMcp: !alwaysFalseFeed(tools),
        }).length > 0);
  } catch (error) {
    logError(toError(error));
  }
  let willDefer = (tool) => cs !== undefined && (rs(tool) || (Nr && Es(tool)));
  if (cs !== undefined && un === undefined)
    try {
      let filtered = identityValue_2(_r).filter((pr) => !willDefer(pr));
      if (Ho !== undefined) {
        setDeclaredTools(conversation, new DeclaredToolSet(filtered));
        if (ko > 0)
          logFeatureOk("host_upfront_tools", {
            named: env.CLAUDE_CODE_UPFRONT_TOOLS?.length ?? 0,
            sent: ko,
          });
      } else recordDeclaredToolsIfMissing(conversation, filtered);
    } catch (error) {
      logError(toError(error));
    }
  let fs;
  if (
    cs === undefined &&
    ao &&
    asScratchDeclaredToolSet(conversation) === undefined &&
    (options.mcpClients ?? []).some((Wn) => Wn.type === "pending")
  )
    try {
      fs = await markReconnectingServers(options, tools, bo);
    } catch (error) {
      logError(toError(error));
    }
  try {
    Cr = cacheNoChannelTools(conversation, cs !== undefined, () =>
      buildDeclaredToolSet(identityValue_2(_r), tools, fs ?? Cr?.recordedOnly),
    );
  } catch (error) {
    logError(toError(error));
  }
  let as = featureEnabled && Oo.some((Wn) => Wn.isMcp === true && !willDefer(Wn));
  if (featureEnabled && !betaList.includes(BETA_PROMPT_CACHING_SCOPE))
    betaList.push(BETA_PROMPT_CACHING_SCOPE);
  let globalCacheStrategy = featureEnabled ? (as ? "none" : "system_prompt") : "none";
  let nonDeferrableBuiltins = getNonDeferrableBuiltins();
  let redescribedTools = options.withoutToolDescribeHooks ? undefined : options.redescribedTools;
  let toolSchemas = await Promise.all(
    Oo.map((tool) =>
      toolToApiDefinition(tool, {
        getToolPermissionContext: options.getToolPermissionContext,
        tools,
        agents: options.agents,
        allowedAgentTypes: options.allowedAgentTypes,
        model: effectiveModel,
        enginePlacement: isDeferredToolByEngine(tool, nonDeferrableBuiltins) ? "deferred" : "listed",
        querySource: options.querySource,
        withoutToolDescribeHooks: options.withoutToolDescribeHooks,
        recordedDescription: willDefer(tool) ? undefined : options.recordedToolDescriptions?.get(tool.name),
        recordedEntry:
          willDefer(tool) || toolMatchesName(tool, STRUCTUREDOUTPUT)
            ? undefined
            : options.recordedToolEntries?.get(tool.name),
        isRedescribed: redescribedTools?.has(tool.name) || undefined,
        deferLoading: willDefer(tool),
        loadedThroughToolSearch: declaredToolSearch && willDefer(tool) && ho(tool, nonDeferrableBuiltins),
      }),
    ),
  );
  let wa = isMainAgent(options.agentContext) && classifyQuerySource(options.querySource) === "main";
  noteToolRedescribed(conversation, toolSchemas, {
    redescribed: redescribedTools,
    recorded: options.recordedToolDescriptions,
    isMainChain: wa,
  });
  if (wa)
    try {
      let Wn;
      for (let pr of toolSchemas)
        if ("name" in pr && "description" in pr && toolMatchesName(pr, BASH_TOOL_NAME)) {
          Wn = pr.description;
          break;
        }
      noteBackgroundStopNoticeSent(Wn);
    } catch (error) {
      logError(toError(error));
      noteBackgroundStopNoticeSent("");
    }
  let hr = [];
  if (cs !== "tool_search" && bo.size > 0)
    try {
      let Wn = new Set(Oo.map((Os) => Os.name));
      let filtered = tools.filter((tool) => bo.has(tool.name) && !Wn.has(tool.name));
      let Jr = new Set(identityValue_2(hideAliasedV1Tools([..._r, ...filtered])).map((Os) => Os.name));
      hr = await Promise.all(
        filtered
          .filter((Os) => Jr.has(Os.name))
          .map((Os) =>
            toolToApiDefinition(Os, {
              getToolPermissionContext: options.getToolPermissionContext,
              tools,
              agents: options.agents,
              allowedAgentTypes: options.allowedAgentTypes,
              model: effectiveModel,
              enginePlacement: isDeferredToolByEngine(Os) ? "deferred" : "listed",
              querySource: options.querySource,
              withoutToolDescribeHooks: options.withoutToolDescribeHooks,
              recordedDescription: options.recordedToolDescriptions?.get(Os.name),
              recordedEntry: options.recordedToolEntries?.get(Os.name),
              isRedescribed: redescribedTools?.has(Os.name) || undefined,
              deferLoading: false,
            }),
          ),
      );
    } catch (error) {
      logError(toError(error));
      hr = [];
    }
  let mi = new Map(
    Oo.map((Wn, pr) => [
      Wn.name,
      {
        schema: toolSchemas[pr],
        isMcp: Wn.isMcp === true,
      },
    ]),
  );
  let Ha = cs !== undefined ? un : Cr;
  let requestDeclaresSearchCitations = runGuarded(() => shouldEnableWebSearchCitations(effectiveModel));
  let nr = [];
  if (Ha !== undefined && Ha.recordedOnly.size > 0)
    try {
      nr = computeLateToolAdditions(toolSchemas, Ha, {
        pool: tools,
        recordedEntries: options.recordedToolEntries,
        keptDeferred: Nr ? (Fr?.kept.keys() ?? []) : [],
        keepMcp: !alwaysFalseFeed(tools),
        requestCarriesStructuredOutputs: runGuarded(() => willSendStructuredOutputsBeta(effectiveModel)),
        requestDeclaresSearchCitations,
      });
    } catch (error) {
      logError(toError(error));
    }
  logDeclaredToolSetHeld({
    deferredLate: br,
    redeclared: yo,
    fromRecord: nr.length,
    queryDepth: options.queryTracking?.depth,
    toolSearchAbsent: cs === "tool_addition",
    noDeferredChannel: cs === undefined,
    unclassifiedDepartures,
  });
  if (options.onInlineToolsDeclared) {
    let Wn = new Map(Oo.map((Jr) => [Jr.name, Jr]));
    let pr = [];
    for (let Jr of toolSchemas) {
      if (!("input_schema" in Jr)) continue;
      let Os = Wn.get(Jr.name);
      let La = Os === undefined ? Ha?.recordedOnly.get(Jr.name) : undefined;
      if (Os !== undefined && !willDefer(Os))
        pr.push({
          name: Jr.name,
          description: Jr.description ?? "",
          schema: Jr,
          ...(Os.mcpInfo && {
            server: Os.mcpInfo.serverName,
          }),
        });
      else if (La !== undefined) {
        let Vl = options.recordedToolEntries?.get(Jr.name) ?? La.entry;
        pr.push({
          name: Jr.name,
          description: Vl.description ?? "",
          schema: Vl,
          ...(La.server !== undefined && {
            server: La.server,
          }),
        });
      }
    }
    options.onInlineToolsDeclared(pr);
  }
  if (cs !== undefined) {
    if (Fr)
      buildDeferredToolsForRequest(Fr, toolSchemas, mi, {
        requestCarriesStructuredOutputs: runGuarded(() => willSendStructuredOutputsBeta(effectiveModel)),
        requestDeclaresSearchCitations,
      });
    let deferredToolPlaceholderSchema = getDeferredToolPlaceholderSchema();
    if (
      deferredToolPlaceholderSchema &&
      !_r.some((Jr) => toolMatchesName(Jr, DEFERREDTOOLPLACEHOLDER)) &&
      !Fr?.kept.has(DEFERREDTOOLPLACEHOLDER)
    )
      toolSchemas.splice(Math.max(toolSchemas.length - 1, 0), 0, deferredToolPlaceholderSchema);
    let includedDeferredTools = count(_r, (Jr) => deferredToolNames_2.has(Jr.name));
    logForDebugging(
      `Dynamic tool loading: ${includedDeferredTools}/${deferredToolNames_2.size} deferred tools included`,
    );
  }
  queryCheckpoint("query_tool_schema_build_end");
  if (isTopLevelMain) endProfilePhase("tool_schema_build");
  logEvent("tengu_api_before_normalize", {
    preNormalizedMessageCount: messages.length,
  });
  queryCheckpoint("query_message_normalization_start");
  if (creditMintModel !== undefined) logEvent("tengu_fallback_credit_strip_as_mint_model", {});
  let Ti;
  let Vs = (Wn) => {
    _1 = Wn.thread?.type === "continue";
    let pr = noopRecordSentPrefix(
      conversation,
      {
        ...applyThreadBody(Wn, kLe()),
        messages: HS,
      },
      {
        querySource: options.querySource,
        isMainThread: isMainAgent(options.agentContext),
        history: messages,
        retryCause: Ac,
        retryKeepsHeal: uh === true,
        promptEpoch: options.promptRenderEpoch,
        accountMemoryEpoch: accountMemoryEpoch_2,
      },
    );
    if (threadSourceKind(options.querySource) !== null && isTetherLive())
      try {
        noteLastDispatchHealed(options.agentId, pr !== undefined);
      } catch (error) {
        logError(toError(error));
      }
    if (pr?.tools !== undefined) S$ = [...pr.tools];
    if (pr?.tools !== undefined && Wn.tools !== undefined) {
      Wn.tools = [...pr.tools];
      if (Fr) recordDeferredToolsSent(Fr, Wn.tools);
    }
    let tools = Wn.tools ?? S$;
    if (Ti !== undefined && tools !== undefined) restoreDeferredDefinitions(Ti, tools);
    if (pr === undefined) return;
    if (pr.system !== undefined) {
      let Os = typeof pr.system === "string" ? pr.system : [...pr.system];
      vw = Os;
      if (!d1) Wn.system = Os;
    }
    if (pr.messages !== undefined) {
      HS = [...pr.messages];
      let messagesForAPI = takeTail(HS, Wn.messages.length);
      if (containsMalformedStringDeep(messagesForAPI))
        try {
          let La = clone(messagesForAPI);
          repairMalformedStringsDeep(La);
          messagesForAPI = La;
        } catch {}
      Wn.messages = messagesForAPI;
    }
  };
  let _i = isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM);
  let jo = _i || isBetaRejected_2(conversation, BETA_PER_MESSAGE_EFFORT);
  let Qr = jo || isBetaRejected_2(conversation, BETA_PER_TURN_TIMING);
  let fi = isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
  betaList = betaList.filter(
    (msg) =>
      !isBetaRejected_2(conversation, msg) &&
      !(jo && msg === BETA_PER_MESSAGE_EFFORT) &&
      !(Qr && msg === BETA_PER_TURN_TIMING),
  );
  if (creditMintModel !== undefined) {
    let fingerprint = runGuarded(() =>
      getMergedBetas(creditMintModel, {
        isAgenticQuery,
      }),
    );
    let pr = (Jr) => {
      if (fingerprint.includes(Jr)) {
        if (!betaList.includes(Jr)) betaList.push(Jr);
      } else betaList = betaList.filter((beta) => beta !== Jr);
    };
    if (!_i) pr(BETA_MID_CONVERSATION_SYSTEM);
    if (!jo) pr(BETA_PER_MESSAGE_EFFORT);
    if (!Qr) pr(BETA_PER_TURN_TIMING);
    betaList = runGuarded(() => toolAdditionBetas(conversation, betaList, creditMintModel, options.model));
    pr(BETA_STRUCTURED_OUTPUTS);
  }
  let Ri =
    !isAutoModeQuerySource(options.querySource) &&
    !fi &&
    betaList.includes(BETA_MID_CONVERSATION_SYSTEM) &&
    runGuarded(() => isKeptReminderModeNotOff(creditMintModel ?? options.model));
  if (Ri && !betaList.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT))
    betaList.push(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
  let Ja = runGuarded(() =>
    resolveLoopEffort(
      {
        loopEffort: options.refusalFallbackEffort,
        continuesMainConversation: isMainConversationContext(options.agentContext),
      },
      resolvedModel,
    ),
  );
  let Di = runGuarded(() =>
    resolveEffortValue(resolvedModel, options.effortValue, {
      turnEffort: options.turnEffort,
      hookEffortValue: options.hookEffortValue,
      carriedEffort: Ja,
    }),
  );
  let yr = () => learnedEffortCap(resolvedModel, options.querySource);
  let Kr = lowerEffort(Di, yr());
  let Li =
    Ja === null
      ? undefined
      : {
          level: Ja,
          outcome: classifyEffortCarryEffect({
            carried: Ja,
            withIt: Kr,
            withoutIt: runGuarded(() =>
              resolveEffortValue(resolvedModel, options.effortValue ?? options.effortSetAsideByHold, {
                turnEffort: options.turnEffort,
                hookEffortValue: options.hookEffortValue,
                carriedEffort: null,
              }),
            ),
            isSavedSetAside: options.effortSetAsideByHold !== undefined,
          }),
        };
  let Qs = runGuarded(() =>
    modelSupportsEffort(resolvedModel) && Kr !== undefined ? normalizeEffortLevel(Kr) : undefined,
  );
  let Hi =
    isMainAgent(options.agentContext) &&
    (options.querySource.startsWith("repl_main_thread") || options.querySource === "sdk");
  let Xa = options.querySource.startsWith("repl_main_thread") || options.querySource === "sdk";
  let agentId = Hi ? "foreground" : options.agentContext.agentId;
  if (Xa) recordConversationSize(agentId, lazyTokenEstimate);
  let turnOrigin_2;
  if (Hi)
    try {
      turnOrigin_2 = getTurnStartOriginKind(messages);
    } catch (error) {
      logError(toError(error));
    }
  let Ca = (Wn) => {
    if (!Hi || Wn === undefined) return {};
    try {
      let defaultEffortLevel = getDefaultEffortLevel(resolvedModel);
      return {
        isDefaultEffort: Wn === defaultEffortLevel,
        defaultEffortLevel,
      };
    } catch (error) {
      logError(toError(error));
      return {};
    }
  };
  let tu =
    typeof Kr === "string" && !(betas.type === "disabled" && betas.mechanical === true) ? Qs : undefined;
  let perTurnNow = betaList.includes(BETA_PER_TURN_TIMING)
    ? formatLocalTimestamp(new Date(), sessionTimeZone())
    : undefined;
  let ga =
    toolSchemas.some((Wn) => !("defer_loading" in Wn && Wn.defer_loading === true)) ||
    (options.extraToolSchemas ?? []).some((Wn) => !("defer_loading" in Wn && Wn.defer_loading === true));
  let Hl =
    options.advisorDeferred === true &&
    yn !== undefined &&
    betaList.includes(BETA_MID_CONV_TOOL_CHANGE) &&
    ga;
  let hd = options.advisorDeferred === true && options.advisorActive === false && !Hl ? undefined : yn;
  let deferredEntriesMoved = false;
  let Ld = 0;
  if (cs === "tool_addition" && !betaList.includes(BETA_MID_CONV_TOOL_CHANGE))
    try {
      let flattened = toolSchemas.flatMap((Jr) => {
        if (!("defer_loading" in Jr) || Jr.defer_loading !== true) return [Jr];
        if (!("input_schema" in Jr) || !tools.some((tool) => toolMatchesName(tool, Jr.name))) return [];
        let { defer_loading: deferLoading, ...La } = Jr;
        return [La];
      });
      let pr = new Set(toolSchemas);
      Ld = count(flattened, (Jr) => !pr.has(Jr));
      deferredEntriesMoved = Ld > 0 || flattened.length !== toolSchemas.length;
      toolSchemas.splice(0, toolSchemas.length, ...flattened);
    } catch (error) {
      logError(toError(error));
    }
  let vs =
    creditMintModel === undefined
      ? undefined
      : runGuarded(() =>
          describeToolAdditionMoves(conversation, messages, {
            mintModel: creditMintModel,
            retryModel: options.model,
            advisorEntryMoved: options.advisorDeferred === true && yn !== undefined && ga && !Hl,
            deferredEntriesMoved,
            hasDeferredChannel: cs !== undefined,
          }),
        );
  let ol = new Set([..._r.filter(willDefer).map((Wn) => Wn.name), ...(Fr?.kept.keys() ?? [])]);
  findLatestApiSystemDelta(conversation, messages, ol, declaredToolSearch, bo);
  if (cs !== undefined && options.onDeferredToolsSent && areDeferredToolsKept())
    try {
      Ti = toolSchemas.filter(
        (Wn) => isDeferredCustomToolDefinition(Wn) && !toolMatchesName(Wn, DEFERREDTOOLPLACEHOLDER),
      );
      options.onDeferredToolsSent({
        entries: Ti,
        nameOnlyAnnouncements: conversation.nameOnlyAnnouncements,
        strippedReferences: strippedToolReferences(Fr),
      });
    } catch (error) {
      logError(toError(error));
    }
  let gd = guardReturning(
    () => {
      let Wn = options.resumeIncompleteThinking
        ? "keep"
        : (thinkingRelayModuleClaude?.relayThinkingDisposition({
            mainLoop: classifyQuerySource(options.querySource) === "main" && !options.agentId,
            fetch: options.fetchOverride,
          }) ?? "keep");
      return {
        relayThinking: Wn,
        relayThinkingPlan: Wn === "keep" ? undefined : thinkingStripAllPlan(messages),
        builtForRelay:
          !options.resumeIncompleteThinking &&
          (thinkingRelayModuleClaude?.isRelayedRequest(options.fetchOverride) ?? false),
      };
    },
    {
      relayThinking: "keep",
      relayThinkingPlan: undefined,
      builtForRelay: false,
    },
  );
  let { relayThinking, relayThinkingPlan, builtForRelay } = gd;
  let normalizeOptions = {
    model: options.model,
    bodyModel: effectiveModel,
    pollEventsAsText: false,
    accountMemoryWithheld: isAccountMemoryRedactionOn(),
    tools: identityValue_2(_r),
    ingestPool: {
      tools,
      ...(shouldTrackDeferredToolForQuery(options.querySource) && {
        ownRequest: {
          mcpServersPending: options.hasPendingMcpServers === true,
        },
      }),
    },
    ...(advisorExperiment && {
      declaredToolNames: clientNames(toolSchemas),
    }),
    betas: betaList,
    midConvLatchedOff: _i,
    keptReminders: Ri,
    useToolSearch: declaredToolSearch,
    advisorModel: hd,
    advisorDeferred: Hl,
    stripWebSearch: conversation.webSearchHistoryRejected,
    mediaItemLimit: mediaItemCapForModel(conversation, effectiveModel)?.limit,
    resumeIncompleteThinking: fo,
    perTurnEffort: tu,
    perTurnEffortCap: yr,
    perTurnNow,
    deferredToolReferencePlan: Fr,
    keepForeignThinking: foreignThinkingKeepMode(),
    deferredWireToolNames: ol,
    nameOnlyAnnouncements: conversation.nameOnlyAnnouncements,
    byValueNames: bo,
    byValueAnnouncements: vn,
    withoutAttachmentHooks: options.withoutToolDescribeHooks,
    reminderFold: options.reminderFold,
    echoWireToolInputs: Xn,
    thinkingStripPlan:
      relayThinkingPlan === undefined
        ? options.thinkingStripPlan
        : mergeMinMaps(options.thinkingStripPlan, relayThinkingPlan),
    advisorStripPlan: options.advisorStripPlan,
  };
  if (isTopLevelMain) startProfilePhase("message_normalization");
  let {
    messagesPreNormalize,
    messagesForAPI,
    accountMemoryEpoch,
    midConvFallback,
    toolChangeFallback,
    inlineToolsFallback,
    keptForeignSignatures,
    blocksEligible,
  } = runGuarded(() => normalizeMessagesForRequest(messages, normalizeOptions));
  if (isTopLevelMain) {
    endProfilePhase("message_normalization");
    startProfilePhase("request_build");
  }
  let messagesForAPI_2 = messagesForAPI;
  let accountMemoryEpoch_2 = accountMemoryEpoch;
  logAdvisorStripReplayed(messages, options);
  if (options.onToolInputCopiesSent && normalizeOptions.ingestPool?.ownRequest !== undefined && Xn)
    try {
      let Wn = wireInputSources(messages);
      if (Wn.size > 0) options.onToolInputCopiesSent(Wn);
    } catch (error) {
      logError(toError(error));
    }
  surfaceDeferredTools(conversation, messages, messagesForAPI_2, {
    useToolSearch: declaredToolSearch,
    toolSearchAbsent: cs === "tool_addition",
    blocksEligible,
    byValueNames: bo,
    byValueStaysOut: co,
  });
  if (cs !== undefined)
    keepDepartedDeferredTools(messages, conversation.surfacedOnWire, mi, Fr, options.querySource, generation);
  let Ac;
  let tp = false;
  let Yh = false;
  let Ef = false;
  let np = () => {
    if (!Yh || Ef) return;
    Ef = true;
    return createAttachmentMessage_2({
      type: "advisor_stripped",
    });
  };
  let Rf = false;
  let ap = false;
  if (relayThinking === "strip_and_mark")
    if (relayThinkingPlan !== undefined && relayThinkingPlan.size > 0) {
      tp = true;
      Rf = true;
    } else ap = true;
  let al = isStellarDriftEnabled();
  let mf;
  let rg = (messagesForAPI, pr, Jr) => {
    if (mf !== undefined && mf.input === messagesForAPI && mf.fallbackBeta === pr && mf.marksBeta === Jr)
      return mf.output;
    let La = normalizeFallbackBlocks(messagesForAPI, pr);
    let markable = false;
    let system = applyApiBlockOrderEcho(La, al, fo);
    let requestMessages = prepareRequestMessages(
      runGuarded(() => isNotLegacyClaude3(effectiveModel)) ? system : disableSearchResultCitations(system),
      messages,
    );
    mf = {
      input: messagesForAPI,
      fallbackBeta: pr,
      marksBeta: Jr,
      output: requestMessages,
      markable,
    };
    return requestMessages;
  };
  let uh;
  let Kf = false;
  let ch = (Wn, pr, Jr = false) => {
    Kf = true;
    if (pr === "microcompact") noopLedger(conversation, pr);
    else {
      Ac = pr;
      uh = (uh ?? true) && Jr;
    }
    return applyApiBlockOrderEcho(Wn, al, fo);
  };
  let uS = midConvFallback;
  let Ks = toolChangeFallback;
  let kl = inlineToolsFallback;
  let Yd = false;
  let xc = false;
  let Ip = "idle";
  let Gc = false;
  let oc;
  let modelHeldStateless =
    threadSourceKind(options.querySource) !== null && isTetherLive()
      ? isStatelessTetherModel(options.model)
      : false;
  let relayHeldStateless =
    threadSourceKind(options.querySource) !== null && isTetherLive()
      ? isTeleportCacheActiveRoot(options.agentId)
      : false;
  let classifierHeldStateless =
    threadSourceKind(options.querySource) !== null && isTetherLive() ? isThreadsHeldForClassifier() : false;
  let Hu = options.fallbackCreditCode !== undefined ? options.fallbackCreditMintedStateless === true : false;
  let dropHeldStateless =
    threadSourceKind(options.querySource) !== null && isTetherLive()
      ? isThreadHeldStateless(options.agentId)
      : false;
  let Hx = canUseNoTransientReminders(options.querySource, options.agentId, options.model, Hu);
  let aI = Xn;
  if (hasFallbackBlocks(messagesForAPI_2)) {
    let Wn = isFirstPartyApiBackend()
      ? pickFallbackBeta({
          fromModel: lastFallbackModel(messagesForAPI_2),
          sticky: conversation,
          serverDefaultFallbacksEnabled: () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DASH_FLAME, false),
          selfTargetDefaultFallbacksEnabled: () =>
            getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ELEGANT_POSSUM, false),
        })
      : null;
    let pr = Wn !== null && !isBetaRejected_2(conversation, Wn);
    if (pr) markBetaSent(conversation, Wn);
    logEvent("tengu_rotunda_pennant_replay", {
      echo_eligible: pr,
      category: Wn !== null && Wn === BETA_SERVER_SIDE_FALLBACK_CATEGORY,
    });
  }
  logEvent("tengu_api_after_normalize", {
    postNormalizedMessageCount: messagesForAPI_2.length,
    apiSystemMessageCount: count(messagesForAPI_2, (Wn) => Wn.type === "api_system"),
  });
  let fingerprint = computeFingerprintFromMessages(messagesPreNormalize);
  let prefix = getCLISyspromptPrefix({
    isNonInteractive: options.isNonInteractiveSession,
    hasAppendSystemPrompt: options.hasAppendSystemPrompt,
    recorded: options.recordedCliPrefix,
  });
  let safeguards;
  let Bx = () => {
    if (options.onPromptHeadSent)
      try {
        options.onPromptHeadSent({
          cliPrefix: prefix,
          wireShape: runGuarded(() =>
            requestFeatureFlags(conversation, effectiveModel, {
              betas: betaList,
              keptOn: Ri,
              safeguards,
            }),
          ),
        });
      } catch (error) {
        logError(toError(error));
      }
  };
  Bx();
  systemPrompt = buildSystemWithAttribution(systemPrompt, prefix, {
    fingerprint,
    agentContext: options.agentContext,
    previousRequestId: previousRequestId_2,
    promptId: Me,
    turnOrigin,
    turnPosition,
    responseBeforeCompaction: Hi ? getResponseBeforeCompaction() : undefined,
  });
  let enablePromptCaching = options.enablePromptCaching ?? getPromptCachingEnabled(effectiveModel);
  let gae = options.forkPointUuid !== undefined && isMainAgent(options.agentContext);
  let gW = should1hCacheTTL(options.querySource, {
    agentCacheTtlOverride: options.agentCacheTtlOverride,
    mainThreadModel: Hi || gae ? effectiveModel : undefined,
  });
  let IW = gW.ttl === "1h" ? "1h" : undefined;
  let Tw = applyMessagesCacheTtlOverride(gW.ttl) === "1h" ? "1h" : undefined;
  let XF = Tw !== IW;
  if (Hi) {
    setLastMainThreadCacheTtlMs(
      IW === "1h" ? CACHE_TTL_1H_MS : CACHE_TTL_5M_MS,
      options.model,
      gW.reason === "live_5m_cache",
    );
    if (XF) noteMainThreadCacheTtl5m();
  }
  let Ux = false;
  let xT = () => {
    if (Ux) return;
    Ux = true;
    let Wn = S3 || clock.now();
    if (Hi)
      recordPromptCacheUsage(MAIN_2, {
        at: Wn,
        ttl: getCacheCreationTtl(Iu) ?? Tw ?? "5m",
        inputTokens: Iu.input_tokens,
        cacheReadTokens: Iu.cache_read_input_tokens,
        cacheCreationTokens: Iu.cache_creation_input_tokens,
      });
    else if (gae && Iu.cache_read_input_tokens > 0) touchPromptCache(MAIN_2, Wn);
  };
  let cLe = () =>
    buildSystemPromptBlocks(systemPrompt, enablePromptCaching, {
      skipGlobalCacheForSystemPrompt: as,
      cacheTtl: IW,
      scopeRefused: isBetaRejected_2(conversation, BETA_PROMPT_CACHING_SCOPE),
    });
  let systemBlocks = cLe();
  let JF = betaList.length > 0;
  let extraToolSchemas = [...(options.extraToolSchemas ?? [])];
  if (hd)
    extraToolSchemas.push({
      type: ADVISOR_20260301,
      name: ADVISOR_TOOL_NAME,
      model: hd,
      ...(Hl && {
        defer_loading: true,
      }),
    });
  let allTools = [...toolSchemas, ...extraToolSchemas];
  let fLe = prefixLedgerNotice(
    conversation,
    {
      model: toProviderWireModelId(options.model),
      tools: allTools,
      system: systemBlocks,
      messages: messagesForAPI_2.map((Wn) => ({
        role: Wn.message.role,
        content: Wn.message.content,
      })),
    },
    {
      querySource: options.querySource,
      retryCause: undefined,
      promptEpoch: options.promptRenderEpoch,
    },
  );
  if (fLe !== undefined) {
    let attachmentMessage = createAttachmentMessage_2({
      type: "prefix_delta",
      text: fLe,
    });
    yield attachmentMessage;
    let pr = runGuarded(() =>
      normalizeMessagesForRequest([...messages, attachmentMessage], normalizeOptions),
    );
    messagesForAPI_2 = pr.messagesForAPI;
    accountMemoryEpoch_2 = pr.accountMemoryEpoch;
    surfaceDeferredTools(conversation, messages, messagesForAPI_2, {
      useToolSearch: declaredToolSearch,
      toolSearchAbsent: cs === "tool_addition",
      blocksEligible: pr.blocksEligible,
      byValueNames: bo,
      byValueStaysOut: co,
    });
    uS = pr.midConvFallback;
    Ks = pr.toolChangeFallback;
    kl = pr.inlineToolsFallback;
  }
  let fI = runGuarded(() =>
    resolveEffortFromLastOutputConfig(messagesForAPI_2, Kr, (Wn) => resolveAppliedEffort(Wn, resolvedModel)),
  );
  let effortValue = fI;
  let CC = runGuarded(() =>
    modelSupportsEffort(resolvedModel) && fI !== undefined ? normalizeEffortLevel(fI) : undefined,
  );
  let pLe =
    isFastModeEnabled() &&
    runGuarded(() => isFastModeAvailable()) &&
    runGuarded(() => supportsFastMode(effectiveModel)) &&
    !!options.fastMode &&
    !isFallbackModelFastRejected(options.model);
  let fE = pLe && !isFastModeCooldown();
  let e$ = () =>
    shouldAllowAfkModeBeta() ||
    (isBetasSwitchSetAside() &&
      getClassifierProviderKind() === "firstParty" &&
      !isThirdPartyServerClassifierRefused());
  let _E = false;
  if (isAgenticQuery) {
    if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FIZZY_BONBON, false)) {
      if (isAutoModeActive() && e$()) markBetaSent(conversation, BETA_AFK_MODE);
      _E = isBetaSent(conversation, BETA_AFK_MODE) && e$();
    } else if (!isAutoModeCircuitBroken() && !isBetaRejected_2(conversation, BETA_AFK_MODE))
      try {
        let toolPermissionContext = await options.getToolPermissionContext();
        _E =
          toolPermissionContext !== undefined && isAutoClassifierActive(toolPermissionContext.mode) && e$();
      } catch (error) {
        logError(toError(error));
      }
  }
  let permissionContext;
  if (canSendWigglyDoveHeader())
    try {
      permissionContext = await options.getToolPermissionContext();
    } catch (error) {
      logError(toError(error));
    }
  let toolNames;
  if (fE) markBetaSent(conversation, BETA_SPEED);
  let R5 = isBetaSent(conversation, BETA_SPEED) && (!isAutoModeQuerySource(options.querySource) || pLe);
  if (canSendProviderBetas()) markBetaSent(conversation, BETA_CACHE_DIAGNOSIS);
  let t$ = () => canSendProviderBetas() && isBetaSent(conversation, BETA_CACHE_DIAGNOSIS);
  let hI = releaseKeepaliveChain(conversation, {
    isMainLoopRequest: Hi,
    continuesPrefix: options.forkPointUuid !== undefined,
    cacheTtl: enablePromptCaching && !XF ? gW : undefined,
  });
  let chainReleaseCount = getMainChainReleaseCount();
  let modelSwitchCount = getModelSwitchCount();
  let requestId = undefined;
  let C5 = (Wn, headers, isWhole) => {
    if (Hi) {
      requestId = Wn;
      evaluateCacheKeepalive({
        conversation,
        headerSent: hI,
        requestId: Wn,
        headers,
        isWhole,
        chainReleaseCount,
        accountEpoch: limitsAccountEpoch,
        modelSwitchCount,
        now: Date.now(),
        clientOptions: {
          model: options.model,
          credentials: options.credentials,
          storageV5: options.storageV5,
        },
      });
    }
  };
  let AC;
  let wE = false;
  try {
    let Wn =
      !(betas.type === "disabled" && betas.mechanical === true) &&
      !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE &&
      (!isWIFDispatchAuth() || isFirstPartyBaseUrl());
    if (Wn && canSendFirstPartyBetas()) {
      if (betas.type !== "disabled") {
        AC = getPolishedDewdropMode();
        if (isPolishedDewdropActive(AC)) markBetaSent(conversation, BETA_THINKING_BINDING_CONTROLS);
      }
      wE = isBetaSent(conversation, BETA_THINKING_BINDING_CONTROLS);
    } else if (Wn && !areExperimentalBetasDisabled()) {
      let providerForModel = getProviderForModel(options.model);
      if (
        (providerForModel === "bedrock" || providerForModel === "mantle" || providerForModel === "vertex") &&
        usesDefaultProviderEndpoint(providerForModel) &&
        runGuarded(() => thirdPartyAcceptsThinkingBindingBeta(providerForModel, options.model))
      ) {
        if (betas.type !== "disabled") markBetaSent(conversation, BETA_THINKING_BINDING_CONTROLS);
        wE = isBetaSent(conversation, BETA_THINKING_BINDING_CONTROLS);
      }
    }
  } catch (error) {
    logError(error);
    AC = undefined;
    wE = false;
  }
  if (!wE && !shouldIncludeFirstPartyOnlyBetas())
    betaList = betaList.filter((beta) => beta !== BETA_THINKING_BINDING_CONTROLS);
  if (options.evictCacheOnComplete && options.stickyBetas !== undefined && isSubagentCacheEvictEnabled())
    markBetaSent(conversation, BETA_PROMPT_CACHING_EVICT);
  let contextHintController = require("./chunk-gzv3xh26.js").createContextHintController({
    querySource: options.querySource,
    agentId: options.agentId,
    includeFirstPartyBetas: canSendFirstPartyBetas(),
    is529Error,
    storageV5: options.storageV5,
  });
  let yS = undefined;
  let EE = null;
  let n$ = undefined;
  let qx = () =>
    getRefusedEffortCarry({
      sent: yS !== undefined && fI !== Kr ? Qs : yS,
      turnEffort: options.turnEffort,
      hookEffortValue: options.hookEffortValue,
    });
  let BW;
  let yI;
  let gLe;
  let getMessageHashes = () => (gLe ??= fingerprintMessagesForCache(messagesForAPI_2));
  let kae = () => {
    let extraBodyParams = getExtraBodyParams();
    alwaysFalseResponseDiag(extraBodyParams, options.model, getProviderForModel(options.model));
    return extraBodyParams;
  };
  let toolSchemas_2 = (BW ??= allTools.filter((tool) => !("defer_loading" in tool && tool.defer_loading)));
  yI ??= betaHeaderValues(betaList);
  recordPromptState({
    system: systemBlocks,
    toolSchemas: BW,
    anyDeferLoading: BW.length !== allTools.length,
    querySource: options.querySource,
    model: options.model,
    agentId: options.agentId,
    fastMode: R5,
    globalCacheStrategy,
    betas: hI ? [...yI, BETA_CACHE_KEEPALIVE.header] : yI,
    autoModeActive: _E,
    isUsingOverage: getCurrentLimits().isUsingOverage ?? false,
    is1hCacheTTL: Tw === "1h",
    queryDepth: options.queryTracking?.depth,
    cacheDiagnosis: t$(),
    effortValue: fI,
    thinkingConfig: betas,
    extraBodyParams: kae(),
    getMessageHashes,
    messages: messagesForAPI_2,
    baselineAgentId:
      options.querySource === "agent_summary" && isSubagentContext(options.agentContext)
        ? options.agentContext.agentId
        : undefined,
  });
  let hLe = messagesForAPI_2;
  let Nh = null;
  let x5 = () => getClassifierProviderKind() === "thirdParty" && hb.includes(BETA_DANGEROUS_TOOL_USE.header);
  let WW = () =>
    wE && !shouldIncludeFirstPartyOnlyBetas() && hb.includes(BETA_THINKING_BINDING_CONTROLS.header);
  let nP = [];
  let P5 = false;
  let M5 = (Wn) => {
    if (!isBetaSent(conversation, BETA_DANGEROUS_TOOL_USE)) return;
    let pr = x5();
    let CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS =
      !pr && hb.includes(BETA_DANGEROUS_TOOL_USE.header) && env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS;
    let Os = pr || CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS;
    let La =
      Os &&
      Wn instanceof APIError &&
      Wn.status === 400 &&
      Wn.message.includes(BETA_DANGEROUS_TOOL_USE.header);
    let Vl = Os && !WW() && isInvalidBetaFlagError(Wn);
    let Yl = pr ? (parseFoundryUnsupportedCapabilities(Wn) ?? []) : [];
    let any = Yl.some((ku) => ku.includes("dangerous_tool_use") || ku.includes("safeguard"));
    if (!La && !Vl && !any && !isSafeguardsRejected(Wn)) return;
    markBetaRejected(conversation, BETA_DANGEROUS_TOOL_USE);
    let Wd = pr || (CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS && isBetasSwitchSetAside());
    if (Vl && !La && !any && !isSafeguardsRejected(Wn)) {
      nP.push(BETA_DANGEROUS_TOOL_USE);
      P5 = Wd && !isThirdPartyServerClassifierRefused();
    }
    if (Wd) {
      markThirdPartyServerClassifierRefused();
      if (any) recordFoundryUnsupportedCapabilities(options.model, Yl);
    }
    logForDebugging(
      pr
        ? "[server-classifier] the platform rejected a beta on this request (HTTP 400), most likely dangerous-tool-use, which this deployment does not know yet; it is not sent again this session and auto mode decides with the local classifier"
        : Wd
          ? "[server-classifier] a request was refused (HTTP 400), most likely because of the dangerous-tool-use beta header or the safeguards field. Claude Code sends these on a direct connection to api.anthropic.com even with CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS set. The API, or something between this machine and it, refused them. Until Claude Code restarts, it sends none of them again, nor the afk-mode beta header, and auto mode no longer asks the server to check actions. To stop sending them on this machine at all, set CLAUDE_CODE_AUTO_MODE_SERVER=0."
          : CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS
            ? "[server-classifier] a request was refused (HTTP 400), most likely because of the dangerous-tool-use beta header, which this conversation had kept sending since an earlier request. It is not sent again in this conversation. This session had already stopped asking the server to check actions, so auto mode goes on deciding as it did."
            : "[server-classifier] the server rejected the dangerous-tool-use beta header or the safeguards field (HTTP 400); neither is sent again this conversation, so every auto-mode tool use is denied as classifier-unavailable until the conversation's betas reset (/clear or /compact)",
      {
        level: "warn",
      },
    );
    logEvent("tengu_server_classifier_beta_rejected_retry", {
      provider: getAPIProviderForAnalytics(),
      unnamed: Vl,
      foundryFeature: any,
      unclaimed: false,
      betasSwitchSetAside: CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS,
      stopsAsking: Wd,
    });
    return "retry:safeguards";
  };
  let yLe = (Wn) =>
    isSpeedParameterUnsupportedError(Wn, options.model) &&
    (!!options.modelIsRefusalFallbackTarget || wasEverFastRejected(options.model));
  let PE = (Wn) => isNonFallbackError(Wn) || yLe(Wn);
  let O5 = (Wn) =>
    cs !== undefined && dg === undefined && Wn instanceof APIError && !options.resumeIncompleteThinking;
  let wae = (Wn) => {
    let pr = normalize422To400(Wn);
    return (
      O5(Wn) &&
      (!isDirectFirstPartyApi() || /\bdefer_loading\b/.test(Wn.message)) &&
      (Wn.status === 400 || Wn.status === 422) &&
      Wn.type !== "billing_error" &&
      !PE(pr) &&
      !FI(pr)
    );
  };
  let I5 = (Wn, pr, Jr) => {
    logForDebugging(
      `[ToolSearch] HTTP ${Wn.status} ${Jr}${pr ? ` (${pr.header})` : ""}; sending the request again without deferred tools. ENABLE_TOOL_SEARCH=false avoids the refused request${nP.length > 0 ? `. Dropped first and now allowed again: ${betaHeaderValues(nP).join(", ")}` : ""}`,
      {
        level: "warn",
      },
    );
    for (let Os of nP) forgetBeta(conversation, Os);
    if (P5) releaseThirdPartyServerClassifierRefusal();
    throw new ToolSearchRefusedError(Wn, declaredToolSearch);
  };
  let D5 = (Wn) => {
    if (Or !== null && O5(Wn) && isBetaRejected(Wn, Or)) I5(Wn, Or, "refusing the tool search beta");
    return;
  };
  let Tae = (Wn) => {
    if (wae(Wn)) I5(Wn, Or, "that no other recovery took, on a request that declared deferred tools");
    return;
  };
  let i$ = false;
  let e1 = () => {
    let toolSearchRefusal = options.toolSearchRefusal;
    if (toolSearchRefusal === undefined || i$) return;
    i$ = true;
    try {
      let toolSearchBeta = getToolSearchBeta();
      let Jr = isBetaRejected(toolSearchRefusal, toolSearchBeta);
      if (Jr) latchBetaRefused(toolSearchBeta, isBetaHeaderRejected(toolSearchRefusal, toolSearchBeta));
      else {
        markBetaRejected(conversation, toolSearchBeta);
        logForDebugging(
          "[ToolSearch] the endpoint answered the request sent without tool search, so this conversation goes on without it",
        );
      }
      logEvent("tengu_beta_400_healed", {
        beta: hashToolNames([toolSearchBeta.header]),
        model: telemetrySafeModelName(options.model),
        provider: getAPIProviderForAnalytics(),
        status: toolSearchRefusal.status,
        unnamed: !Jr,
      });
    } catch (error) {
      logError(error);
    }
  };
  let L5 = (Wn) => {
    let pr = NLe(Wn, true);
    if (pr !== null) return pr;
    if (!(Wn instanceof APIError) || (Wn.status !== 400 && Wn.status !== 422)) return;
    let Jr = normalize422To400(Wn);
    if (PE(Jr) || FI(Jr)) return;
    if (Wn.status === 422 || !isBetaSent(conversation, BETA_DANGEROUS_TOOL_USE) || !x5()) {
      if (shouldIncludeFirstPartyOnlyBetas() || conversation.systemMessagesAcceptedBy.has(effectiveModel))
        return;
      let Os = LLe(Wn, true);
      if (Os !== undefined) qd = "retrying";
      return Os;
    }
    markBetaRejected(conversation, BETA_DANGEROUS_TOOL_USE);
    nP.push(BETA_DANGEROUS_TOOL_USE);
    logForDebugging(
      "[server-classifier] an unrecognised HTTP 400 arrived while the dangerous-tool-use beta was on the request; retrying once without it, and auto mode decides with the local classifier for the rest of this conversation",
      {
        level: "warn",
      },
    );
    logEvent("tengu_server_classifier_beta_rejected_retry", {
      provider: getAPIProviderForAnalytics(),
      unnamed: false,
      foundryFeature: false,
      unclaimed: true,
    });
    return "retry:safeguards-unclaimed";
  };
  let _Le = (Wn) => {
    try {
      if (!(Wn instanceof APIError) || (Wn.status !== 400 && Wn.status !== 422)) return;
      if (JS === "withoutField") {
        JS = "spent";
        let pr = L5(Wn);
        if (pr === undefined && !PE(Wn) && !wae(Wn)) noteThinkingDisplayProbeFailure();
        return pr;
      }
      if (
        JS === "spent" ||
        m1 === undefined ||
        Wn.type === "billing_error" ||
        PE(Wn) ||
        (FI(Wn) && !isThinkingDisplayRejected(Wn)) ||
        !hasThinkingDisplayProbesLeft() ||
        isDirectFirstPartyApi()
      )
        return;
      betaList = betaList.filter((beta) => beta !== BETA_THINKING_DISPLAY_UPDATES);
      JS = m1 === "updates" && betas.display !== undefined ? "withoutUpdates" : "withoutField";
      return `retry:thinking-display-unclaimed:${JS}`;
    } catch (error) {
      logError(error);
      return;
    }
  };
  let Rae = () => {
    if (qd === "retrying") qd = "spent";
    else if (!shouldIncludeFirstPartyOnlyBetas() && HS.some((Wn) => Wn.role === "system")) {
      conversation.systemMessagesAcceptedBy.add(effectiveModel);
      Bx();
    }
  };
  let SLe = () => {
    if (qd === "retrying") {
      forgetBeta(conversation, BETA_MID_CONVERSATION_SYSTEM);
      Bx();
      logForDebugging(
        "[mid-conv-system] the resend without system messages was not answered either, so the guess that the platform refuses them is dropped; the next request of this conversation sends them again",
        {
          level: "warn",
        },
      );
    }
  };
  let t1 = () => {
    if (JS === "idle" || JS === "spent") return;
    let Wn = JS === "withoutField";
    JS = Wn ? "spent" : "idle";
    try {
      if (Wn) markBetaRejected(conversation, THINKING_DISPLAY_NAMED_BETA);
      markBetaRejected(conversation, BETA_THINKING_DISPLAY_UPDATES);
      logForDebugging(
        `[thinking] a request was refused (HTTP 400 or 422) and went through when sent again ${Wn ? "without thinking.display" : "with the session's own display in place of 'updates'"}; this conversation no longer sends ${Wn ? "thinking.display" : "'updates'"}.`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_beta_400_healed", {
        beta: hashToolNames([BETA_THINKING_DISPLAY_UPDATES.header]),
        model: telemetrySafeModelName(options.model),
        provider: getAPIProviderForAnalytics(),
        unclaimed: true,
      });
    } catch (error) {
      logError(error);
    }
  };
  let i1 = (Wn, pr) => {
    try {
      if (!(Wn instanceof APIError) || (Wn.status !== 400 && Wn.status !== 422)) return;
      if (ma === "resent") ma = "spent";
      let Jr = normalize422To400(Wn);
      if (
        ma !== "idle" ||
        !hb.includes(BETA_THINKING_TOKEN_COUNT.header) ||
        Wn.type === "billing_error" ||
        apiErrorCode(Wn) !== undefined ||
        isClientVersionRejected(Jr) ||
        PE(Jr) ||
        (Wn.status === 400 && pr) ||
        classifyFallbackCreditError(Wn) !== undefined ||
        classifyServerFallbackError(Wn) !== undefined ||
        (FI(Jr) && !Wn.message.includes(BETA_THINKING_TOKEN_COUNT.header)) ||
        isDirectFirstPartyApi()
      )
        return;
      logForDebugging(
        `[thinking] HTTP ${Wn.status} that no earlier recovery took; sending the request again without the ${BETA_THINKING_TOKEN_COUNT.header} beta`,
        {
          level: "warn",
        },
      );
      betaList = betaList.filter((beta) => beta !== BETA_THINKING_TOKEN_COUNT);
      ma = pr ? "spent" : "resent";
      return "retry:thinking-token-count-unclaimed";
    } catch (error) {
      logError(error);
      return;
    }
  };
  let N5 = () => {
    if (ma !== "resent") return;
    ma = "spent";
    try {
      latchBetaRefused(BETA_THINKING_TOKEN_COUNT, false);
      logEvent("tengu_beta_400_healed", {
        beta: hashToolNames([BETA_THINKING_TOKEN_COUNT.header]),
        model: telemetrySafeModelName(options.model),
        provider: getAPIProviderForAnalytics(),
        unclaimed: true,
      });
    } catch (error) {
      logError(error);
    }
  };
  let l$ = (Wn) => {
    return;
  };
  let SI = (Wn) => {
    {
      let pr = Wn instanceof APIError && Wn.status === 400;
      if (rP === "retrying") {
        if (pr) {
          rP = "spent";
          if (!PE(Wn) && !(ME === "idle" && u$(Wn))) noteClearAtProbeFailure();
        }
        return;
      }
      if (
        rP === "idle" &&
        OI &&
        betaList.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT) &&
        pr &&
        Wn.type !== "billing_error" &&
        !PE(Wn) &&
        !FI(Wn) &&
        hasClearAtProbeBudget()
      ) {
        rP = "retrying";
        k$ = Wn.requestID ?? undefined;
        betaList = betaList.filter((beta) => beta !== BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
        Nh?.forceCreate("clear_at_header_retired");
        return "retry:kept-reminder-unrecognised-400";
      }
    }
    return;
  };
  let u$ = (Wn) => {
    try {
      return (
        BETA_MESSAGE_THREADS !== null &&
        getAPIProvider() === "firstParty" &&
        hb.includes(BETA_MESSAGE_THREADS.header) &&
        Wn instanceof APIError &&
        Wn.status === 400 &&
        Wn.type !== "billing_error" &&
        classifyAPIError(Wn) === "client_error" &&
        !options.resumeIncompleteThinking &&
        !(y3 && !iP) &&
        getApiErrorCode(Wn) === undefined &&
        !PE(Wn) &&
        !FI(Wn) &&
        classifyThreadError(Wn) === null &&
        classifyFallbackCreditError(Wn) === undefined &&
        classifyServerFallbackError(Wn) === undefined &&
        hasThreadsProbeBudget()
      );
    } catch (error) {
      logError(error);
      return false;
    }
  };
  let oP = (Wn) => {
    try {
      if (ME === "retrying" && Wn instanceof APIError && Wn.status === 400) {
        ME = "spent";
        if (!PE(Wn)) noteThreadsProbeFailure();
        logEvent("tengu_tether_unrecognised_400", {
          phase: lit_2("refused"),
          planner_backed: II,
          query_source: agentTypeForTelemetry(options.querySource),
        });
      }
    } catch (error) {
      logError(error);
    }
  };
  let a1 = (Wn) => {
    try {
      oP(Wn);
      if (ME === "idle" && u$(Wn)) {
        let pr = Nh !== null;
        let Jr = Nh?.dropForUnrecognised400();
        logEvent("tengu_tether_unrecognised_400", {
          phase: lit_2("start"),
          planner_backed: pr,
          dropped_thread: Jr !== undefined,
          query_source: agentTypeForTelemetry(options.querySource),
        });
        ME = "retrying";
        G5 = Wn.requestID ?? undefined;
        II = pr;
        return Jr ?? "retry:tether-unrecognised-400";
      }
    } catch (error) {
      logError(error);
    }
    return;
  };
  let Cae = false;
  let l1 = (Wn) => {
    if (Wn instanceof APIError && Wn.status !== undefined) Cae = true;
    oP(Wn);
    if (betaList.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT) && isKeptReminderClearAtRejected(Wn)) {
      betaList = betaList.filter((beta) => beta !== BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
      markBetaRejected(conversation, BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
      retireKeptReminder();
      Bx();
      Nh?.forceCreate("clear_at_header_retired");
      logFeatureSad("api_kept_reminder_clear_at", "server_rejected");
      logForDebugging(
        "[reminders] the server rejected the clear_at beta header or field (HTTP 400); retrying without them. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.",
        {
          level: "warn",
        },
      );
      return "retry:kept-reminder-clear-at";
    }
    if (
      BETA_MESSAGE_THREADS !== null &&
      isTetherBetaRejected(Wn) &&
      !isBetaRejected_2(conversation, BETA_MESSAGE_THREADS)
    ) {
      markBetaRejected(conversation, BETA_MESSAGE_THREADS);
      disableTetherLiveGate();
      logForDebugging(
        "[tether] server rejected the message-threads beta header \u2014 dropping it and threading for this session",
        {
          level: "warn",
        },
      );
      return Nh?.resolveRetry(Wn) ?? "retry:tether-header";
    }
    return Nh?.resolveRetry(Wn);
  };
  let EI = planToolResultClearingAfterIdle(
    messages,
    options.querySource,
    options.model,
    options.agentId,
    (Wn) => findToolByName(normalizeOptions.tools, Wn)?.name,
    options.forkPointUuid,
  );
  let m$ = false;
  let HS = [];
  let g$ = [];
  let Eh = (Wn) => {
    if (g$.length === 0) return Wn;
    for (let i = g$.length - 2; i >= 0; i--) if (g$[i] === Wn) return i;
    return;
  };
  let vw = undefined;
  let S$ = undefined;
  let d1 = false;
  let c1 = false;
  let F5 = 0;
  let threadType = "none";
  let kLe = () => ({
    messages: HS,
    system: vw,
    tools: S$,
  });
  {
    let agentType = threadSourceKind(options.querySource);
    if (agentType !== null && isTetherLive()) {
      BW ??= allTools.filter((tool) => !("defer_loading" in tool && tool.defer_loading));
      yI ??= betaHeaderValues(betaList);
      let pr = lastAssistantMessageId(messages);
      let dangerousToolUse =
        isBetaSent(conversation, BETA_DANGEROUS_TOOL_USE) ||
        (options.serverClassifier === true &&
          options.autoModeServerContext !== undefined &&
          canUseServerClassifier() &&
          !isBetaRejected_2(conversation, BETA_DANGEROUS_TOOL_USE) &&
          !isThirdPartyServerClassifierRefused());
      let engine = logTetherDecisionSafely({
        querySource: options.querySource,
        agentId: options.agentId,
        model: options.model,
        modelHeldStateless,
        relayHeldStateless,
        classifierHeldStateless,
        creditRetryStateless: Hu,
        dropHeldStateless,
        system: systemBlocks,
        toolSchemas: BW,
        betas: yI,
        latchedHeaders: {
          fastMode: R5,
          autoMode: _E,
          cacheTtl1h: IW === "1h",
          evictOnComplete: isBetaSent(conversation, BETA_PROMPT_CACHING_EVICT),
          cacheDiagnosis: t$(),
          cacheKeepalive: hI,
          dangerousToolUse,
        },
        thinkingConfig: betas,
        toolChoice: options.toolChoice,
        effortValue: fI,
        extraBodyParams: kae(),
        getMessageHashes,
        previousMessageId: pr,
      });
      if (isSubagentOrUnknown(agentType, options.agentId)) {
        let effort = auditTetherEchoSafely(messages, messagesForAPI_2);
        Nh = buildTetherDelta({
          engine,
          previousMessageId: pr,
          anchorRewritten: effort !== null && hasStructuralEchoDiff(effort, pr),
          messages: messagesForAPI_2,
          agentId: options.agentId,
          model: options.model,
          modelHeldStateless,
          relayHeldStateless,
          classifierHeldStateless,
          creditRetryStateless: Hu,
          dropHeldStateless,
          toolResultClearingHeldStateless: EI !== undefined,
          clock,
        });
        if (effort !== null)
          logTetherEchoAudit(effort, {
            sourceCategory: agentType,
            messageCount: messagesForAPI_2.length,
            anchorMessageId: pr,
          });
      }
    }
  }
  let $5 = isBetaTracingEnabled()
    ? {
        systemPrompt: systemPrompt.join(`

`),
        userSystemPrompt: options.userSystemPrompt,
        querySource: options.querySource,
        tools: jsonStringify(allTools),
      }
    : undefined;
  let Zk;
  let f1 = () => (Zk ??= memoryToolNames(messages, tools));
  let llmRequestSpan = startLLMRequestSpan(
    options.model,
    options.agentContext,
    $5,
    messagesForAPI_2,
    fE,
    options.querySource,
    f1,
  );
  let xae = clock.monotonicNow();
  let Uy = clock.monotonicNow();
  let p_ = 0;
  let B5 = [];
  let stream = undefined;
  let Al = undefined;
  let j5 = false;
  let Qh;
  let bLe = (Wn) => {
    if (
      Wn !== undefined &&
      getClassifierProviderKind() === "thirdParty" &&
      isServerClassifierUnsupported(Wn) &&
      !isThirdPartyServerClassifierRefused() &&
      !isArbiterWithFallbackActive()
    ) {
      markThirdPartyServerClassifierRefused();
      logForDebugging(
        `[server-classifier] the platform gave no classification for this request (${Wn.why}); treating that as this deployment's answer: auto mode classifies locally for the rest of this session and stops sending the classifier context`,
      );
    }
  };
  let MI = (Wn, pr, Jr) => {
    let flattened = Jr.flatMap((La) => (La.type === "tool_use" && typeof La.id === "string" ? [La.id] : []));
    bLe(settleServerClassifierResult(Wn, pr, flattened));
  };
  let p1 = false;
  let W5 = false;
  let OI = false;
  let rP = "idle";
  let k$;
  let ME = "idle";
  let G5;
  let II = false;
  let JS = "idle";
  let ma = "idle";
  let qd = "idle";
  let Gd = "idle";
  let vu = () => Gd !== "idle" && Gd !== "spent";
  let sc = false;
  let fc = undefined;
  let rawRequestBodyId = undefined;
  let requestRef;
  let Af = (Wn, stream) => {
    Vs(Wn);
    let Jr = applyThreadBody(Wn, kLe());
    captureAPIRequest(Jr, options.querySource, isMainAgent(options.agentContext));
    rawRequestBodyId = logApiRequestBody(
      {
        ...Wn,
        stream,
      },
      options.querySource,
      f1,
      Jr.messages,
      options.agentContext,
    );
    requestRef = replayTranscriptRequest({
      params: Jr,
      querySource: options.querySource,
      agentId: options.agentId,
      storageV5: options.storageV5,
      conversation: messages,
      stickyBetas: conversation,
      readInjectedBody: () => getExtraBodyParams(),
    });
  };
  let Ah = undefined;
  let k_ = undefined;
  let FT;
  let Jh = false;
  let _S = emptySuspendState();
  let bS = undefined;
  let nk;
  let limitsAccountEpoch = getLimitsAccountEpoch();
  let onQuotaWindowWait = (headers, pr) => {
    let requestRouteKind = getRequestRouteKind(options);
    extractQuotaStatusFromError(
      headers,
      requestRouteKind,
      clock.now(),
      limitsAccountEpoch,
      options.storageV5,
    );
    return beginUsageLimitWait({
      route: requestRouteKind,
      querySource: options.querySource,
      model: options.model,
      rateLimitType: applyMockHeaders(headers).rateLimitType,
      retryAtMs: pr.retryAtMs,
      attempt: pr.attempt,
      maxRetries: pr.maxRetries,
    });
  };
  let isUsageLimitLifted = (rejection) =>
    preflightRateLimit({
      rejection,
      nowMs: clock.now(),
      credentials: options.credentials,
      stop: signal,
    });
  let $T = null;
  function OE() {
    if ($T !== null) {
      $T();
      $T = null;
    }
  }
  function releaseStreamResources() {
    OE();
    cleanupStream(stream);
    stream = undefined;
    if (k_) {
      k_.body?.cancel().catch(() => {});
      k_ = undefined;
    }
  }
  let hb = [];
  let Pae = [];
  let m1 = undefined;
  let z5 = undefined;
  let solicited = false;
  let g1;
  let Mae = "disabled";
  let h1 = false;
  let s3 = false;
  let d3;
  let _1 = false;
  let S1 = false;
  let w$ = "none";
  let h3 = false;
  let Oae = false;
  if (options.fallbackCreditCode !== undefined && (!Yt || vs !== undefined))
    logEvent("tengu_fallback_credit_skipped", {
      reason: Yt ? lit_2("tool_changes_dropped") : lit_2("backend_unknown_or_mismatch"),
      ...(vs && {
        ...vs,
        late_tools_inlined: Ld,
      }),
      mint_request_id: sanitizeMarkName(options.fallbackCreditMintRequestId),
      mint_model: telemetrySafeModelName(options.fallbackCreditMintModel),
      model: telemetrySafeModelName(options.model),
      query_source: agentTypeForTelemetry(options.querySource),
    });
  let fallbackCreditCode = Yt && vs === undefined ? options.fallbackCreditCode : undefined;
  let m5n = (Wn) =>
    (options.fallbackCreditCode ? Wn.split(options.fallbackCreditCode).join("[FCT_REDACTED]") : Wn).slice(
      0,
      600,
    );
  let y3 = false;
  let sP = false;
  let iP = false;
  let hgt = false;
  let ygt = false;
  let _gt = false;
  let b1 = false;
  let C_ = (Wn, pr, Jr) => {
    if (!y3 || _gt) return;
    _gt = true;
    let Os = yS;
    logEvent("tengu_fallback_credit_outcome", {
      outcome: fromEnum(Wn),
      mint_request_id: sanitizeMarkName(options.fallbackCreditMintRequestId),
      mint_model: telemetrySafeModelName(options.fallbackCreditMintModel),
      request_id: sanitizeMarkName(pr),
      client_request_id: sanitizeMarkName(Ah),
      model: telemetrySafeModelName(options.model),
      query_source: agentTypeForTelemetry(options.querySource),
      carried_effort_level: fromEnumOpt(Li?.level),
      carried_effort_outcome: fromEnumOpt(Li?.outcome),
      effort_level: fromEnumOpt(Os),
      ...(Jr !== null && {
        input_tokens: Jr.input_tokens,
        output_tokens: Jr.output_tokens,
        cache_read_input_tokens: Jr.cache_read_input_tokens,
        cache_creation_input_tokens: Jr.cache_creation_input_tokens,
        cache_creation_5m_input_tokens: Jr.cache_creation?.ephemeral_5m_input_tokens ?? 0,
        cache_creation_1h_input_tokens: Jr.cache_creation?.ephemeral_1h_input_tokens ?? 0,
        service_tier: fromEnumOpt(Jr.service_tier),
        speed: fromEnumOpt(Jr.speed),
      }),
    });
  };
  let Sgt = false;
  let kgt = false;
  let bgt = false;
  let buildRequestParamsGuarded = (context, pr = true) => runGuarded(() => buildRequestParams(context, pr));
  let buildRequestParams = (Wn, pr) => {
    if (messagesForAPI_2 !== hLe) {
      hLe = messagesForAPI_2;
      gLe = undefined;
      recordMessageHistory({
        querySource: options.querySource,
        agentId: options.agentId,
        getMessageHashes,
        messages: messagesForAPI_2,
      });
    }
    let paramsFromContext = (retryContext) =>
      !KNOWN_BETAS.has(retryContext) && isBetaRejected_2(conversation, retryContext);
    let betas_2 = betaList.filter((beta) => beta !== BETA_LONG_CONTEXT || !vu());
    if (!betas_2.includes(BETA_LONG_CONTEXT) && !vu() && getSonnet46ContextWindowOverride(Wn.model) !== null)
      betas_2.push(BETA_LONG_CONTEXT);
    let provider = getProviderForModel(Wn.model);
    let Vl = provider === "bedrock" && BETA_AFK_MODE && _E && isAgenticQuery && isAutoMode3POptIn();
    if (Vl)
      logForDebugging(
        `auto-mode 3P: sending afk-mode beta '${BETA_AFK_MODE?.header}' to bedrock via body.anthropic_beta`,
      );
    let betaHeaders =
      provider === "bedrock"
        ? [
            ...getBedrockExtraBodyParamsBetas(Wn.model).filter((ql) => ql !== BETA_LONG_CONTEXT || !vu()),
            ...(Or ? [Or] : []),
            ...(Vl && BETA_AFK_MODE ? [BETA_AFK_MODE] : []),
          ].filter((ql) => !paramsFromContext(ql))
        : [];
    let extraBodyParams = getExtraBodyParams(betaHeaders);
    addBetaToBodyAnthropicBeta(
      extraBodyParams,
      BETA_THINKING_TOKEN_COUNT,
      provider === "bedrock" && betas_2.includes(BETA_THINKING_TOKEN_COUNT),
    );
    let outputConfig = {
      ...(extraBodyParams.output_config ?? {}),
    };
    delete extraBodyParams.output_config;
    applyEffortToOutputConfig(effortValue, outputConfig, extraBodyParams, betas_2, resolvedModel);
    h1 = alwaysFalseResponseDiag(extraBodyParams, Wn.model, provider);
    configureTaskBudgetParams(options.taskBudget, outputConfig, betas_2);
    if (paramsFromContext(BETA_EFFORT)) delete outputConfig.effort;
    if (paramsFromContext(BETA_TASK_BUDGETS) && "task_budget" in outputConfig)
      delete outputConfig.task_budget;
    s3 = hasStringFormat(options.outputFormat, outputConfig, betas_2, options.model);
    let ku = options.refusalFallbackSilentArmActive === true;
    let Np = serverFallbackPlan(options.serverRefusalFallback, Wn.model, betas_2, conversation, ku, Hx);
    applyRefusalFallbackBeta(
      options.fallbackCreditLaneArmed === true || options.fallbackCreditCode !== undefined,
      betas_2,
      conversation,
      ku,
      provider === "bedrock" ? extraBodyParams : undefined,
    );
    ygt = betas_2.includes(BETA_FALLBACK_CREDIT);
    let serverClassifierEligible = thirdPartyAcceptsDangerousToolUseBeta(provider, resolvedModel);
    let Kg =
      options.serverClassifier === true && options.autoModeServerContext !== undefined
        ? markInsertedTextProvenance(
            markHumanReplyProvenance(
              describeForwardedTurns(messages, messagesForAPI_2),
              messages,
              messagesForAPI_2,
              options.agentId,
            ),
            messages,
            messagesForAPI_2,
          )
        : [];
    let cy =
      options.serverClassifier === true && options.autoModeServerContext !== undefined
        ? buildServerClassifierRequestContext({
            autoModeServerContext: options.autoModeServerContext,
            priorTurnContext: collectPriorServerContexts(messages),
            systemReminders: Kg,
            textProvenance: buildContextSectionsMessage(messages, messagesForAPI_2, attachmentToMessages),
          })
        : undefined;
    let jT =
      options.serverClassifier === true &&
      cy !== undefined &&
      serverClassifierEligible &&
      canUseServerClassifier() &&
      !isBetaRejected_2(conversation, BETA_DANGEROUS_TOOL_USE) &&
      !isThirdPartyServerClassifierRefused();
    if (jT) {
      markBetaSent(conversation, BETA_DANGEROUS_TOOL_USE);
      checkInsertedTextShed(Kg, cy?.system_reminders ?? []);
    }
    if (
      serverClassifierEligible &&
      isBetaSent(conversation, BETA_DANGEROUS_TOOL_USE) &&
      !betas_2.includes(BETA_DANGEROUS_TOOL_USE)
    )
      betas_2.push(BETA_DANGEROUS_TOOL_USE);
    addBetaToBodyAnthropicBeta(
      extraBodyParams,
      BETA_DANGEROUS_TOOL_USE,
      provider === "bedrock" && betas_2.includes(BETA_DANGEROUS_TOOL_USE),
    );
    let min = Math.min(
      Wn?.maxTokensOverride || options.maxOutputTokensOverride || modelFacts_2.maxOutputTokens,
      modelFacts_2.maxOutputTokens,
    );
    let CLAUDE_CODE_DISABLE_THINKING = env.CLAUDE_CODE_DISABLE_THINKING;
    let thinkingEnabled = betas.type !== "disabled" && !CLAUDE_CODE_DISABLE_THINKING;
    let Ew = () =>
      modelFacts_2.thinking.rejectsDisabled ||
      (creditMintModel !== undefined && modelRejectsDisabledThinking(creditMintModel));
    let Aw =
      thinkingEnabled &&
      shouldSendInterleavedThinkingBeta(resolvedModel) &&
      !isBetaRejected_2(conversation, THINKING_DISPLAY_NAMED_BETA) &&
      (JS === "idle" || JS === "withoutUpdates");
    let thinkingDisplay = !Aw
      ? undefined
      : betas.display === "highlights" && isThinkingHighlightsRefused()
        ? "omitted"
        : betas.display;
    let thinking = undefined;
    if (thinkingEnabled && modelFacts_2.thinking.supported) {
      if (
        modelSupportsAdaptiveThinking({
          runtimeOverride: getThinkingTypeOverride(options.model),
          resolvedModel,
          canonicalModel,
        }) === "adaptive"
      )
        thinking = {
          type: "adaptive",
          display: thinkingDisplay,
        };
      else {
        let thinkingBudget = maxOutputTokensMinusOne(resolvedModel);
        if (betas.type === "enabled" && betas.budgetTokens !== undefined) thinkingBudget = betas.budgetTokens;
        thinkingBudget = Math.max(1024, Math.min(min - 1, thinkingBudget));
        thinking = {
          budget_tokens: thinkingBudget,
          type: "enabled",
          display: thinkingDisplay,
        };
      }
    } else if (
      betas.type === "disabled" &&
      getAPIProvider() === "firstParty" &&
      !CLAUDE_CODE_DISABLE_THINKING &&
      modelFacts_2.thinking.supported &&
      !Ew()
    )
      thinking = {
        type: "disabled",
      };
    let cP;
    if (wE) {
      if (!betas_2.includes(BETA_THINKING_BINDING_CONTROLS)) betas_2.push(BETA_THINKING_BINDING_CONTROLS);
      addBetaToBodyAnthropicBeta(extraBodyParams, BETA_THINKING_BINDING_CONTROLS, provider === "bedrock");
      if (
        AC !== undefined &&
        (thinking?.type === "adaptive" || thinking?.type === "enabled") &&
        !("thinking" in extraBodyParams)
      ) {
        thinking = {
          ...thinking,
          block_binding: {
            prefix_mismatch_behavior: AC,
          },
        };
        cP = AC;
      }
    }
    let fP = betas.type === "disabled" ? undefined : betas;
    let display = fP?.display;
    let HI = "none";
    try {
      HI = thinkingDisplayMode(display, fP?.displayExplicit ?? getThinkingDisplayExplicit());
    } catch (error) {
      logError(error);
    }
    let pP = () => {
      let index = betas_2.indexOf(BETA_REDACT_THINKING);
      if (index !== -1) betas_2.splice(index, 1);
    };
    if (thinking && thinkingDisplay) pP();
    switch (HI) {
      case "thinking_and_connector_text":
      case "none":
        break;
      case "connector_text": {
        if (
          (thinking?.type === "adaptive" || thinking?.type === "enabled") &&
          Aw &&
          !("thinking" in extraBodyParams) &&
          !isBetaRejected_2(conversation, BETA_THINKING_DISPLAY_UPDATES) &&
          JS === "idle" &&
          !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE
        ) {
          thinking = {
            ...thinking,
            display: "updates",
          };
          if (!betas_2.includes(BETA_THINKING_DISPLAY_UPDATES)) betas_2.push(BETA_THINKING_DISPLAY_UPDATES);
          addBetaToBodyAnthropicBeta(extraBodyParams, BETA_THINKING_DISPLAY_UPDATES, provider === "bedrock");
          pP();
        }
        break;
      }
    }
    if (canResumeThinking(resolvedModel) && !betas_2.includes(BETA_THINKING_RESUMPTION))
      betas_2.push(BETA_THINKING_RESUMPTION);
    let BE =
      thinking?.type === "enabled" || thinking?.type === "adaptive" || (thinking === undefined && Ew());
    let toolChoice = options.toolChoice;
    if (toolChoice?.type === "tool" && BE) {
      logForDebugging(
        `tool_choice {type:'tool', name:'${toolChoice.name}'} demoted to auto: extended thinking is active`,
      );
      toolChoice = {
        type: "auto",
      };
    }
    let UE = betas.type === "disabled" && betas.mechanical === true;
    if (
      thinking?.type === "disabled" &&
      (UE || modelFacts_2.thinking.capsEffortWhenDisabled) &&
      typeof outputConfig.effort === "string" &&
      isAboveHighEffort(outputConfig.effort)
    ) {
      if (!bgt) {
        bgt = true;
        logForDebugging(
          `output_config.effort '${outputConfig.effort}' clamped to '${THINKING_DISABLED_EFFORT_CAP}': thinking is ${UE ? "mechanically " : ""}disabled for this request, and this model rejects higher effort when thinking is disabled`,
        );
      }
      if (
        !UE &&
        classifyQuerySource(options.querySource) === "main" &&
        streamFallbackWarning().once("effort_thinking_disabled_clamp")
      )
        logEvent("tengu_effort_clamped_thinking_disabled", {
          from: fromEnum(outputConfig.effort),
          to: fromEnum(THINKING_DISABLED_EFFORT_CAP),
          query_source: agentTypeForTelemetry(options.querySource),
        });
      outputConfig.effort = THINKING_DISABLED_EFFORT_CAP;
    }
    let contextManagement = getAPIContextManagement({
      hasThinking: thinkingEnabled,
      toolClearing: EI?.edit,
    });
    let P$ = options.enablePromptCaching ?? getPromptCachingEnabled(creditMintModel ?? Wn.model);
    let fh;
    let Ow =
      isFastModeEnabled() &&
      runGuarded(() => isFastModeAvailable()) &&
      !isFastModeCooldown() &&
      runGuarded(() => supportsFastMode(effectiveModel)) &&
      !!Wn.fastMode &&
      !paramsFromContext(BETA_SPEED) &&
      !isFallbackModelFastRejected(Wn.model);
    if (Ow) fh = "fast";
    d3 = Ow ? Wn.model : undefined;
    if (R5 && !betas_2.includes(BETA_SPEED)) betas_2.push(BETA_SPEED);
    if (BETA_AFK_MODE && _E && e$() && isAgenticQuery && !betas_2.includes(BETA_AFK_MODE)) {
      betas_2.push(BETA_AFK_MODE);
      if (isAutoMode3POptIn())
        logForDebugging(
          `auto-mode 3P: sending afk-mode beta '${BETA_AFK_MODE.header}' to ${provider} via betas header`,
        );
    }
    if (IW === "1h" && canSendFirstPartyBetas() && !betas_2.includes(BETA_EXTENDED_CACHE_TTL))
      betas_2.push(BETA_EXTENDED_CACHE_TTL);
    let _b = null;
    let jE = contextHintController?.buildRequestParams(messagesForAPI_2);
    if (jE) {
      betas_2.push(jE.beta);
      _b = jE.body;
    }
    let gP = null;
    if (isBetaSent(conversation, BETA_PROMPT_CACHING_EVICT) && P$) {
      if (!betas_2.includes(BETA_PROMPT_CACHING_EVICT)) betas_2.push(BETA_PROMPT_CACHING_EVICT);
      gP = {
        cache_control: {
          type: "ephemeral",
          ...(Tw && {
            ttl: Tw,
          }),
          evict_on_complete: true,
        },
      };
    }
    if (t$() && !betas_2.includes(BETA_CACHE_DIAGNOSIS)) betas_2.push(BETA_CACHE_DIAGNOSIS);
    if (hI && !betas_2.includes(BETA_CACHE_KEEPALIVE)) betas_2.push(BETA_CACHE_KEEPALIVE);
    let CLAUDE_CODE_SIMULATE_PROXY_USAGE = env.CLAUDE_CODE_SIMULATE_PROXY_USAGE;
    let BI =
      Ri &&
      JF &&
      !CLAUDE_CODE_SIMULATE_PROXY_USAGE &&
      filterBetasForProvider(betas_2).includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
    let D1 = Nh !== null && !CLAUDE_CODE_SIMULATE_PROXY_USAGE ? Nh.plan(messagesForAPI_2, BI) : null;
    let L1 =
      BETA_MESSAGE_THREADS !== null &&
      (isBetaRejected_2(conversation, BETA_MESSAGE_THREADS) || ME !== "idle");
    let L_ = L1 ? null : D1;
    if (BETA_MESSAGE_THREADS !== null) {
      if (L_ !== null) markBetaSent(conversation, BETA_MESSAGE_THREADS);
      if (L1) {
        for (let idx = betas_2.length - 1; idx >= 0; idx--)
          if (betas_2[idx] === BETA_MESSAGE_THREADS) betas_2.splice(idx, 1);
      } else if (
        (L_ !== null || isBetaSent(conversation, BETA_MESSAGE_THREADS)) &&
        !betas_2.includes(BETA_MESSAGE_THREADS)
      )
        betas_2.push(BETA_MESSAGE_THREADS);
    }
    let filtered = betas_2.filter(
      (ql) => !paramsFromContext(ql) && (!CLAUDE_CODE_SIMULATE_PROXY_USAGE || ql === BETA_OAUTH_AUTH),
    );
    if (CLAUDE_CODE_SIMULATE_PROXY_USAGE)
      logForDebugging(
        `[API:client] SIMULATE_PROXY_USAGE: stripping ${betas_2.length - filtered.length} beta headers from request (keeping ${betaHeaderValues(filtered).join(", ") || "none"}): ${betaHeaderValues(betas_2).join(", ")}`,
      );
    let N3 =
      !thinkingEnabled && modelFacts_2.acceptsTemperature ? (options.temperatureOverride ?? 1) : undefined;
    hb = betaHeaderValues(filtered);
    Pae = betaHeaderValues(betaHeaders);
    sc = filtered.includes(BETA_LONG_CONTEXT) || betaHeaders.includes(BETA_LONG_CONTEXT);
    m1 =
      thinking !== undefined && "display" in thinking && !("thinking" in extraBodyParams)
        ? (thinking.display ?? undefined)
        : undefined;
    solicited = thinking !== undefined && "block_binding" in thinking;
    g1 = cP;
    let betaHeaderValues_2 = filterBetasForProvider(filtered);
    let yP =
      JF &&
      (!CLAUDE_CODE_SIMULATE_PROXY_USAGE || filtered.length > 0) &&
      betaHeaderValues(betaHeaderValues_2).length > 0;
    W5 = BI;
    OI = false;
    let Fd =
      yP &&
      (betaHeaderValues_2.includes(BETA_SERVER_SIDE_FALLBACK) ||
        (BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
          betaHeaderValues_2.includes(BETA_SERVER_SIDE_FALLBACK_CATEGORY)));
    h3 = Fd && hasFallbackBlocks(messagesForAPI_2);
    let Zg =
      yP &&
      (Np.fallbacks === "default"
        ? BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
          betaHeaderValues_2.includes(BETA_SERVER_SIDE_FALLBACK_CATEGORY)
        : betaHeaderValues_2.includes(BETA_SERVER_SIDE_FALLBACK))
        ? Np
        : {};
    S1 = Zg.fallbacks !== undefined;
    w$ = Zg.fallbacks === "default" ? "default" : S1 ? "explicit" : "none";
    if (!Fd && hasFallbackBlocks(messagesForAPI_2)) {
      Ac = "error_recovery";
      uh = false;
    }
    let Iy = false;
    p1 = Iy;
    let Of = [];
    oc = undefined;
    let B_ = P$ && !options.skipMessageCacheMarkers;
    let topLevelCacheControl =
      (!CLAUDE_CODE_SIMULATE_PROXY_USAGE && gP !== null) || extraBodyParams.cache_control != null;
    let j_ = rg(messagesForAPI_2, Fd, Iy);
    let vc =
      pr && Ip === "idle"
        ? parentReplyMarkPlan({
            querySource: options.querySource,
            model: creditMintModel ?? Wn.model,
            isKeepaliveHeaderOnWire: yP && betaHeaderValues_2.includes(BETA_CACHE_KEEPALIVE),
            hasSecondMarkerSlot: B_ && !topLevelCacheControl && options.divergesAtMessageId === undefined,
            messages: j_,
          })
        : undefined;
    let apiMessages = (HS = addCacheBreakpoints(
      j_,
      B_,
      Tw,
      options.skipCacheWrite,
      options.forkPointUuid,
      isBetaRejected_2(conversation, BETA_MID_CONV_CACHE_PROMOTION_LATCH) ||
        isMidConvCachePromotionRejected(),
      provider,
      L_ !== null,
      topLevelCacheControl,
      BI,
      Of,
      options.divergesAtMessageId,
      {
        skipMessageCacheMarkers: options.skipMessageCacheMarkers === true,
        report: (ql) => {
          oc = ql;
        },
      },
      isExtractMemoriesSkipCacheWrite(options.querySource, options.skipCacheWrite === true),
      pr,
      vc,
    ));
    g$ = Of.some((ql, Ep) => ql !== Ep) ? Of : [];
    let eh = (apiMessage) =>
      Array.isArray(apiMessage.content) &&
      apiMessage.content.some(
        (Ep) => typeof Ep === "object" && Ep !== null && "cache_control" in Ep && Ep.cache_control != null,
      );
    Yd = apiMessages.some((apiMessage) => apiMessage.role === "system" && eh(apiMessage));
    Gc = apiMessages.some(eh);
    let om = vc?.isMarkWanted === true ? apiMessages.findLastIndex(eh) : -1;
    xc =
      om > 0 &&
      apiMessages.some((apiMessage, Ep) => {
        let role = apiMessage.role;
        return Ep < om && role === "system" && eh(apiMessage);
      });
    j5 =
      jT &&
      JF &&
      !CLAUDE_CODE_SIMULATE_PROXY_USAGE &&
      filterBetasForProvider(filtered).includes(BETA_DANGEROUS_TOOL_USE);
    if (pr) {
      if (Qh !== undefined) settleServerStreamEnded(Qh);
      Qh = j5
        ? createServerClassifierResult(randomUUID(), {
            artifacts: cy?.artifacts,
            thread: L_ !== null,
            exactMcpAllowRules: cy && getExactMcpAllowRules(cy),
            judgeOnlyTools: options.autoModeServerContext?.judgeOnlyTools,
            agentId: options.agentId,
          })
        : undefined;
      if (Qh !== undefined && cy !== undefined) recordClassifierRequest(Qh.key, pickPriorTurnContext(cy));
    }
    let toolsForRequest = stripUnsupportedFoundryCapabilities(allTools, options.model);
    toolsForRequest = applyRefusedToolSchemas(toolsForRequest, conversation);
    let Nu =
      Nh !== null
        ? Nh.shapeInheritedFields(L_, {
            system: systemBlocks,
            tools: toolsForRequest,
          })
        : {
            system: systemBlocks,
            tools: toolsForRequest,
          };
    vw = systemBlocks;
    S$ = toolsForRequest;
    d1 = Nu.system !== systemBlocks;
    c1 = L_ !== null;
    F5 = L_?.sliceFrom ?? 0;
    threadType = L_?.thread.type ?? "none";
    let requestParams = {
      model: toProviderWireModelId(options.model),
      messages: L_ !== null && L_.sliceFrom > 0 ? apiMessages.slice(Of[L_.sliceFrom]) : apiMessages,
      system: Nu.system,
      ...(Nu.tools !== undefined && {
        tools: Nu.tools,
      }),
      tool_choice: toolChoice,
      ...(yP && betasRequestParam(betaHeaderValues_2)),
      metadata: getAPIMetadata({
        agentContext: options.agentContext,
      }),
      max_tokens: min,
      thinking,
      ...(N3 !== undefined && {
        temperature: N3,
      }),
      ...(contextManagement &&
        JF &&
        betas_2.includes(BETA_CONTEXT_MANAGEMENT) && {
          context_management: contextManagement,
        }),
      ...(j5 &&
        cy !== undefined && {
          safeguards: [
            {
              type: DANGEROUS_TOOL_USE_2,
              classifier_context: cy,
            },
          ],
        }),
      ...(!CLAUDE_CODE_SIMULATE_PROXY_USAGE && _b ? _b : {}),
      ...(!CLAUDE_CODE_SIMULATE_PROXY_USAGE && gP ? gP : {}),
      ...Zg,
      ...extraBodyParams,
      ...{},
      ...(Object.keys(outputConfig).length > 0 && {
        output_config: outputConfig,
      }),
      ...(fh !== undefined && {
        speed: fh,
      }),
      ...(L_ !== null && {
        thread: L_.thread,
      }),
      ...(t$() &&
        (isAgenticQuery || options.forkPointUuid !== undefined) &&
        JF &&
        !CLAUDE_CODE_SIMULATE_PROXY_USAGE && {
          diagnostics: {
            previous_message_id: nt ?? null,
          },
        }),
    };
    m$ = EI !== undefined && requestParams.context_management === contextManagement;
    OI = BI && requestParams.messages.some((message) => message.clear_at !== undefined);
    let W_ = sanitizeDisabledThinking(requestParams.thinking, options.querySource, !Sgt);
    if (W_ !== requestParams.thinking) {
      Sgt = true;
      requestParams.thinking = W_;
    }
    {
      let thinking = requestParams.thinking;
      Mae = thinking?.type === "adaptive" || thinking?.type === "enabled" ? thinking.type : "disabled";
      z5 = readDisplayField(thinking);
    }
    if (pr && containsMalformedStringDeep(requestParams)) {
      try {
        requestParams = clone(requestParams);
      } catch {}
      repairMalformedStringsDeep(requestParams);
      if (!kgt) {
        kgt = true;
        logEvent("tengu_lone_surrogate_sanitized", {
          source: lit_2("queryModel"),
        });
      }
    }
    let logEffortValue = requestParams.output_config?.effort;
    yS = typeof logEffortValue === "string" && isEffortLevel(logEffortValue) ? logEffortValue : undefined;
    let Xl = lastOutputConfig(messagesForAPI_2);
    EE = Xl.effort ?? null;
    n$ = Xl.now;
    return requestParams;
  };
  let TLe = false;
  let wgt = (permissionContext) => {
    if (TLe) return;
    TLe = true;
    let betas = JF ? (permissionContext.betas ?? []) : [];
    let thinkingType = permissionContext.thinking?.type ?? "disabled";
    let messagesLength = messagesForAPI_2.length;
    let thinkingPrefixMismatchBehavior = g1;
    let effortValue = Qs;
    options.getToolPermissionContext().then((permissionContext) => {
      logAPIQuery({
        model: options.model,
        messagesLength,
        temperature: options.temperatureOverride ?? 1,
        betas,
        permissionMode: permissionContext.mode,
        proactivityLevel: options.proactivityLevel,
        querySource: options.querySource,
        messageClientPlatform: options.messageClientPlatform,
        queryTracking: options.queryTracking,
        thinkingType,
        thinkingPrefixMismatchBehavior,
        effortValue,
        fastMode: fE,
        previousRequestId: previousRequestId_2,
      });
    });
  };
  let Tgt = false;
  let vgt = () => {
    if (TLe || Tgt) return;
    Tgt = true;
    try {
      wgt(
        buildRequestParamsGuarded(
          {
            model: options.model,
          },
          false,
        ),
      );
    } catch (error) {
      logError(toError(error));
    }
  };
  let Cm = [];
  let Iae = 0;
  let vLe;
  let v$ = 0;
  let _3 = 0;
  let ELe = 0;
  let RLe = false;
  let CLe;
  let S3 = 0;
  let dg = undefined;
  let A_ = [];
  let Iu = EMPTY_USAGE;
  let T1 = null;
  let Dae = 0;
  let reason = null;
  let complete = false;
  let aP = "none";
  function lP() {
    if (aP === "credited") return;
    aP = "credited";
    Dae += addToTotalSessionCost(
      calculateUSDCost(resolvedModel, Iu),
      Iu,
      options.model,
      options.querySource,
      CC,
      options.spawnedBySkill,
      options.activeSkill,
      options.activeMcpServer,
      options.activeMcpTool,
    );
  }
  let dP = false;
  let nonStreamingFallbackSkipped = false;
  let LI;
  let k3 = false;
  let BT = 0;
  let ALe = undefined;
  let NMs = undefined;
  let b3;
  let fallbackActive = fE;
  let E1 = false;
  let FMs = isMainAgent(options.agentContext) && options.querySource.startsWith("repl_main_thread");
  let $Ms = undefined;
  let w3 = new Map();
  let Rgt = 3;
  let Cgt = {
    value: 0,
  };
  let h5n = Rgt;
  let Agt = new Map();
  let T3 = false;
  let xgt = false;
  let Lae;
  let uP;
  let xLe = {
    count: 0,
  };
  let maxRetriesFromEnv = getMaxRetriesFromEnv();
  let retryBudget = decideAttemptOutcome(
    {
      maxRetries: maxRetriesFromEnv,
      maxSleptThrough: getMaxSleptThrough(maxRetriesFromEnv),
      maxReconnects: getMaxReconnects(options.querySource),
      maxOverloaded: MAX_529_RETRIES,
      maxOutputFiltered: eagerRainShadowBudget(),
      hasFallbackModel: Boolean(options.fallbackModel),
      persistent: retryWatchdogEnv(),
      persistentCapacityOnly: retryWatchdogEnv() && !isRetryWatchdogOn(),
      background: !isMainOrAgentQuerySource(options.querySource),
    },
    options.apiAttemptsLeft,
  );
  let E3 = false;
  let yb = null;
  let $ae = false;
  let Pgt = (headers, pr) => {
    yb = null;
    $ae = isFirstPartyApiBackend();
    if (E3) {
      if ($ae) {
        headers[ANTHROPIC_DISPATCH_ID] = V2P;
        yb = fromEnum(V2P);
        logForDebugging(`[dispatch] sent ${ANTHROPIC_DISPATCH_ID}=${V2P}`);
      }
      return;
    }
    if (!pr && $ae) {
      let dispatchVersion = getDispatchVersion(classifyQuerySource(options.querySource));
      if (dispatchVersion !== null) {
        headers[ANTHROPIC_DISPATCH_ID] = dispatchVersion;
        yb = fromEnum(dispatchVersion);
        logForDebugging(`[dispatch] sent ${ANTHROPIC_DISPATCH_ID}=${dispatchVersion}`);
      }
    }
  };
  let Mgt = async (Wn) => {
    if (E3) return;
    let status = Wn instanceof APIError ? Wn.status : undefined;
    let Jr = status !== undefined && status >= 500;
    let Os = Wn instanceof APIConnectionError;
    if (!(yb !== null ? Jr || Os : $ae && status === 503)) return;
    E3 = true;
    logForDebugging(
      `[dispatch] ${Jr ? `HTTP ${status}` : "connection error"} with ${yb === null ? `no ${ANTHROPIC_DISPATCH_ID}` : `${ANTHROPIC_DISPATCH_ID}=${yb}`}; retrying once with ${ANTHROPIC_DISPATCH_ID}=${V2P}`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_dispatch_header_fallback", {
      model: telemetrySafeModelName(options.model),
      dispatch: yb ?? lit_2("none"),
      resend_dispatch: fromEnum(V2P),
      reason: yb === null ? headerlessDeclineKind(Wn) : Jr ? lit_2("5xx") : lit_2("conn_err"),
      status: status !== undefined ? fromNumber(status) : lit_2("none"),
      query_source: agentTypeForTelemetry(options.querySource),
      request_id: sanitizeMarkName(Wn instanceof APIError ? Wn.requestID : undefined),
    });
    if (yb === null) {
      let Vl = headerlessDeclineRetryDelay(Wn);
      if (Vl > 0)
        await sleep(Vl, signal, {
          clock,
        });
    }
    return "retry:dispatch-header-strip";
  };
  let M1 = false;
  let $E = false;
  let UT = false;
  let Hae;
  let Ogt = (error, pr) => {
    if (!(error instanceof APIError) || error.status !== 400) return;
    let included = error.message.includes("`fallback-credit-");
    let Os =
      BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
      error.message.includes(`\`${BETA_SERVER_SIDE_FALLBACK_CATEGORY.header}`);
    let matches = (
      BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null
        ? new RegExp(`\`server-side-fallback-(?!${BETA_SERVER_SIDE_FALLBACK_CATEGORY.header.slice(21)})`)
        : /`server-side-fallback-/
    ).test(error.message);
    let Vl = (Wd) => {
      logForDebugging(`[server-fallback] 400 attributed (${Wd}) \u2014 stripping and retrying`, {
        level: "warn",
      });
      let ku = w$;
      logEvent("tengu_rotunda_pennant_strip", {
        shape: fromEnum(Wd),
        mode: fromEnum(ku),
        non_streaming: pr === "sync",
        query_source: agentTypeForTelemetry(options.querySource),
        sticky_scope:
          options.stickyBetas === undefined
            ? lit_2("session")
            : classifyQuerySource(options.querySource) === "main"
              ? lit_2("detached_main")
              : classifyQuerySource(options.querySource) === "subagent"
                ? lit_2("agent")
                : lit_2("aux"),
      });
    };
    let Yl = classifyFallbackCreditError(error);
    if (Yl !== undefined && !iP) {
      iP = true;
      fallbackCreditCode = undefined;
      if (Yl === "credit_beta_header") {
        markBetaRejected(conversation, BETA_FALLBACK_CREDIT);
        if (Os && BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null) {
          markBetaRejected(conversation, BETA_SERVER_SIDE_FALLBACK_CATEGORY);
          Oae = true;
        }
        if (matches) {
          markBetaRejected(conversation, BETA_SERVER_SIDE_FALLBACK);
          M1 = true;
        }
        if (Os && h3 && !isBetaRejected_2(conversation, BETA_SERVER_SIDE_FALLBACK))
          markBetaSent(conversation, BETA_SERVER_SIDE_FALLBACK);
      }
      if (pr === "stream") C_(Yl, error.requestID ?? null, null);
      Vl(Yl);
      return "retry:fallback-credit-strip";
    }
    let nd = classifyServerFallbackError(error);
    if (
      BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
      (nd === "category_beta_header" || (nd === "default_unconfigured" && S1)) &&
      !Oae
    ) {
      Oae = true;
      markBetaRejected(conversation, BETA_SERVER_SIDE_FALLBACK_CATEGORY);
      if (included) {
        markBetaRejected(conversation, BETA_FALLBACK_CREDIT);
        iP = true;
        fallbackCreditCode = undefined;
      }
      if (matches) {
        markBetaRejected(conversation, BETA_SERVER_SIDE_FALLBACK);
        M1 = true;
      }
      if (h3 && !isBetaRejected_2(conversation, BETA_SERVER_SIDE_FALLBACK))
        markBetaSent(conversation, BETA_SERVER_SIDE_FALLBACK);
      Vl(nd);
      return "retry:server-fallback-category-strip";
    }
    if (nd !== undefined && (S1 || nd === "beta_header") && !M1) {
      M1 = true;
      markBetaRejected(conversation, BETA_SERVER_SIDE_FALLBACK);
      if (nd === "beta_header" && included) {
        markBetaRejected(conversation, BETA_FALLBACK_CREDIT);
        iP = true;
        fallbackCreditCode = undefined;
      }
      Vl(nd);
      return "retry:server-fallback-strip";
    }
    if (isAdvisorModelMismatchError(error)) return;
    if (isMidConversationSystemRejected(error)) return;
    if (isWebSearchContentRejected(error) || isCodeExecutionOutputRejected(error)) return;
    if (alwaysFalseD(error)) return;
    if (alwaysFalseB(error)) return;
    if (isInvalidEffortError(error) && w$ !== "explicit") return;
    if (isFastModeNotEnabledError(error) || parseMaxTokensContextOverflowError(error) !== undefined) return;
    if (yLe(error)) {
      if (pr === "stream" && sP && !iP) fallbackCreditCode = options.fallbackCreditCode;
      return;
    }
    if (options.resumeIncompleteThinking) return;
    if (pr === "sync" && FI(error)) return;
    if (Yl === undefined && nd === undefined) {
      let Wd = SI(error);
      if (Wd !== undefined) return Wd;
      let ku = a1(error);
      if (ku !== undefined) return ku;
      let Np = OLe(error);
      if (Np !== undefined) return Np;
    }
    if (pr === "stream" && y3 && !iP) {
      iP = true;
      C_("unattributed_400_dropped", error.requestID ?? null, null);
      Vl("unattributed");
      return "retry:fallback-credit-unattributed";
    }
    if ((S1 || h3) && !M1) {
      M1 = true;
      markBetaRejected(conversation, BETA_SERVER_SIDE_FALLBACK);
      if (BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null)
        markBetaRejected(conversation, BETA_SERVER_SIDE_FALLBACK_CATEGORY);
      Vl("unattributed");
      return "retry:server-fallback-strip";
    }
    if (ygt && !hgt) {
      hgt = true;
      markBetaRejected(conversation, BETA_FALLBACK_CREDIT);
      nP.push(BETA_FALLBACK_CREDIT);
      Vl("unattributed");
      return "retry:fallback-credit-header-strip";
    }
    return;
  };
  let FI = (Wn) =>
    classifyProviderErrorForModel(options.model, Wn) === "refused" ||
    isAfkModeBetaRejected(Wn) ||
    isAdvisorResultUnprocessable(Wn) ||
    isAdvisorUnavailableError(Wn) ||
    isWebSearchContentRejected(Wn) ||
    isCodeExecutionOutputRejected(Wn) ||
    getMediaErrorFromApiError(Wn) !== undefined ||
    getRejectedBetas(Wn, betaHeaderValues(BETA_REJECTION_MATCHER_KEYS)).length > 0 ||
    isCacheKeepaliveBetaRejected(Wn) ||
    isThinkingResumptionBetaRejected(Wn) ||
    isThinkingBindingRejected(Wn) ||
    getRejectedThinkingType(Wn) !== null ||
    isInvalidThinkingSignatureError(Wn) ||
    isMidConversationSystemRejected(Wn) ||
    isToolChangeRejected(Wn) ||
    isInlineToolDefinitionRejected(Wn) ||
    isCacheControlFieldRejected(Wn) ||
    isOutputConfigRejected(Wn) ||
    isOutputTimingRejected(Wn) ||
    isEffortUnsupportedError(Wn) ||
    isStructuredOutputsUnsupported(Wn);
  let MLe = () => {
    if (cs === "tool_search") return;
    try {
      let Wn = 0;
      if (cs === undefined) allTools = allTools.slice();
      else
        allTools = allTools.flatMap((tool) => {
          if (!("input_schema" in tool)) return [tool];
          if (!tools.some((tool_2) => toolMatchesName(tool_2, tool.name))) return [];
          if (tool.defer_loading !== true) return [tool];
          Wn++;
          let { defer_loading: deferLoading, ...Vl } = tool;
          return [Vl];
        });
      let pr = new Set(allTools.flatMap((tool) => ("name" in tool ? [tool.name] : [])));
      let Jr = new Map(tools.map((tool, La) => [tool.name, La]));
      for (let Os of hr) {
        if (!("name" in Os) || pr.has(Os.name)) continue;
        let La = Jr.get(Os.name) ?? 1 / 0;
        let index = allTools.findIndex((tool) => !("input_schema" in tool) || (Jr.get(tool.name) ?? -1) > La);
        if (index === -1) index = allTools.length;
        allTools.splice(index, 0, Os);
        pr.add(Os.name);
        Wn++;
      }
      if (cs === "tool_addition") {
        Ti?.splice(0, Ti.length);
        resetDeclaredTools(conversation);
        markDeclaredToolsDecided(conversation);
      } else if (Wn === 0) return;
      else {
        let sliced = _r.slice();
        for (let tool of tools) {
          if (!pr.has(tool.name) || !bo.has(tool.name)) continue;
          let Vl = Jr.get(tool.name) ?? 1 / 0;
          let index = sliced.findIndex((nd) => (Jr.get(nd.name) ?? -1) > Vl);
          if (index === -1) index = sliced.length;
          sliced.splice(index, 0, tool);
        }
        Cr = cacheNoChannelTools(conversation, false, () =>
          buildDeclaredToolSet(identityValue_2(sliced), tools, fs ?? Cr?.recordedOnly),
        );
      }
      Ac = "error_recovery";
      uh = false;
      logForDebugging(
        `[late-tool-additions] no ToolSearch on this request: ${Wn} late tool(s) go inline from this request on`,
        {
          level: "warn",
        },
      );
    } catch (error) {
      logError(toError(error));
    }
  };
  let Igt = () => {
    let Wn = Ks;
    if (Wn) Ks = () => dropAdvisorFromApiSystem(stripAdvisorBlocks(Wn()));
    let pr = uS;
    if (pr) uS = () => dropAdvisorFromApiSystem(stripAdvisorBlocks(pr()));
    let Jr = kl;
    if (Jr) kl = () => dropAdvisorFromApiSystem(stripAdvisorBlocks(Jr()));
  };
  let y5n = () => {
    let Wn = Ks;
    if (Wn) Ks = () => stripAdvisorBlocks(Wn());
    let pr = uS;
    if (pr) uS = () => stripAdvisorBlocks(pr());
    let Jr = kl;
    if (Jr) kl = () => stripAdvisorBlocks(Jr());
  };
  let Dgt = () => {
    if (!isAdvisorToolEnabled()) betaList = betaList.filter((beta) => beta !== BETA_ADVISOR_TOOL);
  };
  let Lgt = false;
  let Ngt = (Wn) => {
    if (Lgt || !isAdvisorUnavailableError(Wn)) return;
    let pr = (tool) => !("input_schema" in tool) && "name" in tool && tool.name === ADVISOR_TOOL_NAME;
    let any = allTools.some(pr);
    let Os = hb.includes(BETA_ADVISOR_TOOL.header) && isAdvisorBetaRejected(Wn);
    if (!any && !Os) return;
    Lgt = true;
    try {
      if (any) {
        allTools = allTools.filter((tool) => !pr(tool));
        messagesForAPI_2 = ch(
          dropAdvisorFromApiSystem(stripAdvisorBlocks(messagesForAPI_2)),
          "error_recovery",
        );
        Igt();
        Ac = "error_recovery";
        uh = false;
      }
      conversation.advisorHeld = {
        model: undefined,
        viaToolChange: conversation.advisorHeld?.viaToolChange ?? false,
        refused: true,
      };
      let advisorRefusalScope = getAdvisorRefusalScope(Wn);
      if (advisorRefusalScope === "process") markAdvisorRefusedForProcess();
      else if (advisorRefusalScope === "host") markAdvisorRefusedForHost();
      Dgt();
      logForDebugging(
        `[advisor] the server refused the advisor ${Os ? "beta header" : "entry"} (scope: ${advisorRefusalScope}); retrying once without the advisor`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_advisor_entry_refused_retry", {
        query_source: agentTypeForTelemetry(options.querySource),
        organization_wide: advisorRefusalScope === "process",
        host_wide: advisorRefusalScope === "host",
        beta_header_refused: Os,
      });
    } catch (error) {
      logError(toError(error));
    }
    return "retry:advisor-entry-refused";
  };
  let Fgt = new ToolSchemaWireCache(conversation);
  let $gt = (Wn) => {
    try {
      let resolved = Fgt.resolve(Wn, S$, tools, options.querySource);
      if (resolved !== undefined) {
        Ac = "error_recovery";
        uh = false;
      }
      return resolved;
    } catch (error) {
      logError(toError(error));
      return;
    }
  };
  let Hgt = (Wn) => {
    return;
  };
  let HMs = "idle";
  let OLe = (Wn) => {
    return;
  };
  let Bgt = () => {
    try {
      let Wn = false;
      let pr = options.advisorActive !== false;
      allTools = allTools.flatMap((tool) => {
        if (
          "input_schema" in tool ||
          !("defer_loading" in tool) ||
          tool.defer_loading !== true ||
          tool.name !== ADVISOR_TOOL_NAME
        )
          return [tool];
        Wn = true;
        if (!pr) return [];
        let { defer_loading: deferLoading, ...La } = tool;
        return [La];
      });
      if (Wn) {
        if (!pr) {
          messagesForAPI_2 = ch(
            dropAdvisorFromApiSystem(stripAdvisorBlocks(messagesForAPI_2)),
            "error_recovery",
          );
          Igt();
          Dgt();
        }
        if (pr && conversation.advisorHeld?.viaToolChange === true)
          conversation.advisorHeld = {
            ...conversation.advisorHeld,
            inFallback: true,
          };
        Ac = "error_recovery";
        uh = false;
      }
    } catch (error) {
      logError(toError(error));
    }
  };
  let _5n = () => {
    let Wn = Ks;
    if (Wn) Ks = () => stripWebSearchBlocks(Wn()).messages;
    let pr = uS;
    if (pr) uS = () => stripWebSearchBlocks(pr()).messages;
    let Jr = kl;
    if (Jr) kl = () => stripWebSearchBlocks(Jr()).messages;
  };
  let Ugt = (Wn, pr) => {
    if (!isWebSearchContentRejected(Wn)) return;
    let { messages, removed } = stripWebSearchBlocks(messagesForAPI_2);
    if (messages === messagesForAPI_2) return;
    messagesForAPI_2 = ch(messages, "error_recovery");
    markWebSearchHistoryRejected(conversation);
    _5n();
    logForDebugging(
      `[web-search-strip] The API could not decrypt web search content in this conversation's history: removed ${removed.toolUses} ${plural(removed.toolUses, "search call")}, ${removed.results} ${plural(removed.results, "result block")} and ${removed.citations} ${plural(removed.citations, "citation")} from the request; retrying once. Later requests in this conversation leave them out too.`,
      {
        level: "warn",
      },
    );
    logFeatureSad("api_request", "api_request_web_search_stripped", {
      query_source: agentTypeForTelemetry(options.querySource),
      transport: fromEnum(pr),
      tool_uses: removed.toolUses,
      results: removed.results,
      citations: removed.citations,
      placeholders: removed.placeholders,
    });
    return "retry:web-search-strip";
  };
  let xC;
  let ILe = (Wn) => {
    let pr = mediaItemCapForModel(conversation, effectiveModel);
    if (!isUnprocessableRequest(Wn) || pr?.gaveUp) return;
    try {
      let Jr = countMediaItems(messagesForAPI_2);
      let min = Math.min(Jr, xC?.limit ?? 1 / 0);
      let found = MEDIA_ITEM_COUNT_FALLBACKS.find((ku) => ku < min);
      if (found === undefined) {
        if (xC !== undefined) {
          let { steps, refusedAt } = xC;
          xC = undefined;
          setMediaItemCap(conversation, {
            model: effectiveModel,
            limit: pr?.limit,
            gaveUp: true,
          });
          logForDebugging(
            `[media-item-limit] The model still refuses this request as unprocessable with ${Jr} images and documents left. Not removing any more.`,
            {
              level: "warn",
            },
          );
          logFeatureSad("api_request", "api_request_media_limit_gave_up", {
            query_source: agentTypeForTelemetry(options.querySource),
            media_items_refused: refusedAt,
            steps,
          });
        }
        return;
      }
      let Vl = (ku) => stripExcessMediaItems(ku, found, MEDIA_BYTES_PER_ITEM_SLACK);
      messagesForAPI_2 = ch(Vl(messagesForAPI_2), "error_recovery");
      let Yl = Ks;
      if (Yl) Ks = () => Vl(Yl());
      let nd = uS;
      if (nd) uS = () => Vl(nd());
      let Wd = kl;
      if (Wd) kl = () => Vl(Wd());
      xC = {
        limit: found,
        steps: (xC?.steps ?? 0) + 1,
        refusedAt: xC?.refusedAt ?? Jr,
      };
      logForDebugging(
        `[media-item-limit] The model refused this request as unprocessable. It held ${Jr} images and documents; the oldest were removed to fit a limit of ${found}, and it is being sent again. If it is answered, this conversation keeps that limit.`,
        {
          level: "warn",
        },
      );
      return `retry:media-item-limit:${found}`;
    } catch (error) {
      logError(toError(error));
      return;
    }
  };
  let DLe = () => {
    try {
      let Wn = mediaItemCapForModel(conversation, effectiveModel);
      if (xC === undefined) {
        if (Wn?.gaveUp && Wn.limit === undefined) clearMediaItemCap(conversation);
        else if (Wn?.gaveUp)
          setMediaItemCap(conversation, {
            ...Wn,
            gaveUp: false,
          });
        return;
      }
      let { limit, steps, refusedAt } = xC;
      xC = undefined;
      setMediaItemCap(conversation, {
        model: effectiveModel,
        limit: Math.min(limit, Wn?.limit ?? 1 / 0),
        gaveUp: false,
      });
      logFeatureSad("api_request", "api_request_media_limit_lowered", {
        query_source: agentTypeForTelemetry(options.querySource),
        media_items_refused: refusedAt,
        media_item_limit: limit,
        steps,
      });
    } catch (error) {
      logError(toError(error));
    }
  };
  let jgt = (Wn) => {
    {
      let pr = Wn instanceof APIError && Wn.status === 400;
      if (Ip === "retrying") {
        if (pr) Ip = "spent";
        return;
      }
      if (Ip === "idle" && xc && pr && Wn.message.includes("cache_control")) {
        Ip = "retrying";
        return "retry:prompt-end-mark";
      }
    }
    return;
  };
  let Wgt = () => {
    if (Ip !== "retrying") return;
    Ip = "spent";
    if (creditMintModel !== undefined) return;
    try {
      markPromptEndMarkRefused();
      logForDebugging(
        "[cache-breakpoints] a side request that marked a system message before its last marker drew a 400 that names cache_control, and went through without that marker; no later side request carries it",
        {
          level: "warn",
        },
      );
      logFeatureSad("api_prompt_end_mark", "server_rejected");
    } catch (error) {
      logError(error);
    }
  };
  let LLe = (Wn, pr = false) => {
    let Jr =
      betaList.includes(BETA_INLINE_TOOLS) &&
      !isMidConversationSystemRejected(Wn) &&
      classifyToolChangeError(Wn) !== "header_rejected"
        ? classifyInlineToolDefinitionError(Wn)
        : undefined;
    if (Jr !== undefined) {
      if (kl) {
        let Wd = kl();
        messagesForAPI_2 = ch(
          !betaList.includes(BETA_PER_MESSAGE_EFFORT)
            ? stripOutputConfigs(Wd)
            : !betaList.includes(BETA_PER_TURN_TIMING)
              ? dropTimingFromOutputConfigs(Wd)
              : Wd,
          "error_recovery",
        );
        tp = Rf;
        addNameOnlyAnnouncements(conversation, vn);
        if (cs === undefined) MLe();
      }
      kl = null;
      betaList = betaList.filter((beta) => beta !== BETA_INLINE_TOOLS);
      handleInlineToolsRejection(conversation, Jr);
      Bx();
      logEvent("tengu_inline_tools_refused_retry", {
        cause: fromEnum(Jr),
      });
      return "retry:inline-tools-strip";
    }
    let Os =
      betaList.includes(BETA_MID_CONV_TOOL_CHANGE) && !isMidConversationSystemRejected(Wn)
        ? classifyToolChangeError(Wn)
        : undefined;
    if (Os !== undefined) {
      if (Ks) {
        let ku = Ks();
        messagesForAPI_2 = ch(
          !betaList.includes(BETA_PER_MESSAGE_EFFORT)
            ? stripOutputConfigs(ku)
            : !betaList.includes(BETA_PER_TURN_TIMING)
              ? dropTimingFromOutputConfigs(ku)
              : ku,
          "error_recovery",
        );
        tp = Rf;
      }
      Ks = null;
      let Wd =
        betaList.includes(BETA_INLINE_TOOLS) && classifyInlineToolDefinitionError(Wn) === "header_rejected";
      betaList = betaList.filter((beta) => beta !== BETA_MID_CONV_TOOL_CHANGE && beta !== BETA_INLINE_TOOLS);
      classifyToolAdditionRejection(conversation, Os, options.model, Wd);
      Bx();
      MLe();
      Bgt();
      return "retry:tool-change-strip";
    }
    let La = pr || isMidConversationSystemRejected(Wn);
    let midConvSystemRejection = getMidConvSystemRejection(Wn);
    let Yl =
      betaList.includes(BETA_PER_MESSAGE_EFFORT) &&
      isOutputConfigRejected(Wn) &&
      !isEffortUnsupportedError(Wn);
    let included = betaList.includes(BETA_PER_TURN_TIMING);
    if (included && isOutputTimingRejected(Wn) && !La && !Yl) {
      messagesForAPI_2 = ch(dropTimingFromOutputConfigs(messagesForAPI_2), "error_recovery");
      betaList = betaList.filter((beta) => beta !== BETA_PER_TURN_TIMING);
      markBetaRejected(conversation, BETA_PER_TURN_TIMING);
      logForDebugging(
        `[per-turn-timing] the server refused the current-time statement (${errorMessage(Wn)}); leaving it out for the rest of this conversation (until /clear or /compact)`,
        {
          level: "warn",
        },
      );
      return "retry:per-turn-timing-strip";
    }
    if (uS && (La || Yl)) {
      if (midConvSystemRejection !== null && !HS.some((Kg) => Kg.role === "system" && Kg.content.length > 0))
        return;
      let Wd = hasContextBeta(conversation);
      let ku = HS.length;
      let Np = messagesForAPI_2.length;
      let hf =
        midConvSystemRejection === null
          ? undefined
          : midConvSystemRejection.messageIndex === undefined
            ? `${ku} messages on the wire`
            : midConvSystemRejection.messageIndex >= ku
              ? `messages[${midConvSystemRejection.messageIndex}], beyond the ${ku} this request sent`
              : `messages[${midConvSystemRejection.messageIndex}] of ${ku} on the wire; conversation entry ${Eh(midConvSystemRejection.messageIndex) ?? "none of ours (a clear_at reminder slot)"} of ${Np}`;
      messagesForAPI_2 = ch(La ? uS() : stripOutputConfigs(messagesForAPI_2), "error_recovery");
      uS = null;
      if (included) betaList = betaList.filter((beta) => beta !== BETA_PER_TURN_TIMING);
      if (La) {
        tp = Rf;
        betaList = betaList.filter(
          (beta) =>
            beta !== BETA_MID_CONVERSATION_SYSTEM &&
            beta !== BETA_PER_MESSAGE_EFFORT &&
            beta !== BETA_MID_CONV_TOOL_CHANGE &&
            beta !== BETA_INLINE_TOOLS &&
            beta !== BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT,
        );
        markBetaRejected(conversation, BETA_MID_CONVERSATION_SYSTEM);
        dropToolChangeState(conversation);
        Bx();
        MLe();
        Bgt();
        if (Ks !== null) {
          logFeatureSad("mcp_late_tool_additions", "rejected_with_mid_conv_system");
          Ks = null;
        }
      }
      if (Yl) {
        betaList = betaList.filter((beta) => beta !== BETA_PER_MESSAGE_EFFORT);
        latchBetaRefused(BETA_PER_MESSAGE_EFFORT, isPerTurnEffortRejected(Wn));
        if (EE !== null) logFeatureSad("api_per_turn_effort", "server_rejected");
      }
      if (options.stickyBetas === undefined) notifyPerTurnEffortInactive(conversation, Wd);
      logForDebugging(
        hf !== undefined
          ? `[mid-conv-system] API refused where a system message sits (${hf}) \u2014 retrying once without system messages; off for this conversation until /clear or /compact`
          : Yl
            ? "[per-turn-control] server rejected the per-turn statements \u2014 resending without them"
            : pr
              ? "[mid-conv-system] an HTTP 400 or 422 that nothing else recognises answered a request on which system turns were enabled; guessing the platform refuses them and resending without system messages; if that goes through they stay off until /clear or /compact"
              : '[mid-conv-system] server rejected role:"system" \u2014 falling back to a body with no {role:"system"} turn, sticky-rejecting the beta until /clear or /compact',
        {
          level: "warn",
        },
      );
      logEvent("tengu_mid_conv_system_fallback_retry", {
        per_turn_effort: Yl,
        ...(pr && {
          unclaimed: pr,
        }),
        misplaced: midConvSystemRejection !== null,
        ...(midConvSystemRejection !== null && {
          misplaced_index: midConvSystemRejection.messageIndex ?? -1,
          wire_message_count: ku,
          message_count: Np,
        }),
      });
      return "retry:mid-conv-system";
    }
    if (
      Yd &&
      !isBetaRejected_2(conversation, BETA_MID_CONV_CACHE_PROMOTION_LATCH) &&
      isCacheControlFieldRejected(Wn)
    ) {
      markBetaRejected(conversation, BETA_MID_CONV_CACHE_PROMOTION_LATCH);
      markMidConvCachePromotionRejected();
      logForDebugging(
        "[mid-conv-system] proxy rejected cache_control on the api_system tail \u2014 demoting the breakpoint to the trailing message for this conversation",
        {
          level: "warn",
        },
      );
      logFeatureSad("api_midconv_cache_proxy", "proxy_rejected");
      return "retry:api-system-cache-demote";
    }
    return;
  };
  let Ggt = (Wn) => {
    if (
      Yd &&
      !xc &&
      !isBetaRejected_2(conversation, BETA_MID_CONV_CACHE_PROMOTION_LATCH) &&
      !isBetaRejected_2(conversation, BETA_MID_CONV_CACHE_PROMOTION_OK_LATCH)
    ) {
      let inputTokens = Wn?.input_tokens ?? 0;
      let cacheReadInputTokens = Wn?.cache_read_input_tokens ?? 0;
      let Os =
        (Wn?.cache_creation_input_tokens ?? 0) +
        (Wn?.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
        (Wn?.cache_creation?.ephemeral_1h_input_tokens ?? 0);
      let La = inputTokens + cacheReadInputTokens + Os > 0;
      let Vl = Os > 0 && inputTokens < MIDCONV_CACHE_PROXY_READ_THRESHOLD;
      if (La && !Vl) return;
      markBetaRejected(conversation, BETA_MID_CONV_CACHE_PROMOTION_OK_LATCH);
      logFeatureOk("api_midconv_cache_proxy");
    }
  };
  let zgt = (Wn) => {
    if (!Gc || options.skipCacheWrite || !isCustomEndpoint(getProviderForModel(options.model))) return;
    let pr = decideStreamFallbackWarning(streamFallbackWarning().cacheCoverage, conversation, Wn);
    if (pr.kind === "confirm") {
      logFeatureOk("api_prompt_cache_coverage", {
        provider: fromEnum(getProviderForModel(options.model)),
      });
      return;
    }
    if (pr.kind !== "fire") return;
    logForDebugging(
      "[cache-coverage] sustained uncovered input with a cache breakpoint on the wire through a custom endpoint \u2014 no cache-billing evidence visible at the client (the endpoint may be silently stripping cache_control)",
      {
        level: "warn",
      },
    );
    logFeatureSad("api_prompt_cache_coverage", "cache_coverage_loss", {
      api_system_marker: Yd,
      consecutive_turns: pr.consecutive,
      input_tokens: pr.inputTokens,
      cache_read_input_tokens: pr.cacheReadTokens,
      cache_creation_input_tokens: pr.cacheCreationTokens,
      provider: fromEnum(getProviderForModel(options.model)),
    });
  };
  let qgt = () => {
    if (!isPerTurnEffortOkEmitted() && EE !== null) {
      markPerTurnEffortOkEmitted();
      logFeatureOk("api_per_turn_effort");
    }
  };
  let Kgt = () => {
    if (!isLateToolAdditionsOkEmitted() && Ks !== null) {
      markLateToolAdditionsOkEmitted();
      logFeatureOk("mcp_late_tool_additions");
    }
    if (
      !isInlineToolsOkEmitted() &&
      Ks !== null &&
      betaList.includes(BETA_INLINE_TOOLS) &&
      messagesForAPI_2.some((Wn) => Wn.type === "api_system" && Wn.toolDefinitions !== undefined)
    ) {
      markInlineToolsOkEmitted();
      logFeatureOk("mcp_inline_tools");
    }
  };
  let Vgt = () => {};
  let Ygt = () => {};
  let Xgt = () => {
    if (ME === "retrying") {
      ME = "spent";
      try {
        if (BETA_MESSAGE_THREADS !== null) markBetaRejected(conversation, BETA_MESSAGE_THREADS);
        if (II) disableTetherLiveGate();
        logEvent("tengu_tether_unrecognised_400", {
          phase: lit_2("healed"),
          planner_backed: II,
          query_source: agentTypeForTelemetry(options.querySource),
        });
        logForDebugging(
          `[tether] a request carrying the message-threads header got an HTTP 400 that Claude Code does not recognise (request id ${G5 ?? "unknown"}), and a later attempt without the header succeeded. ${II ? "Message Threads stays off for the rest of this session." : "The header stays off for this conversation."}`,
          {
            level: "warn",
          },
        );
      } catch (error) {
        logError(error);
      }
    }
    if (W5) logKeptReminderOk();
    if (rP === "retrying") {
      rP = "spent";
      markBetaRejected(conversation, BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
      retireKeptReminder();
      Bx();
      logFeatureSad("api_kept_reminder_clear_at", "unrecognised_400");
      logForDebugging(
        `[reminders] a request carrying a clear_at message got an HTTP 400 that Claude Code does not recognise (request id ${k$ ?? "unknown"}), and the same request without clear_at succeeded. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.`,
        {
          level: "warn",
        },
      );
    }
  };
  let S5n = (Wn) => {
    if (!isInvalidEffortError(Wn) || w$ === "explicit" || isAutoModeQuerySource(options.querySource))
      return null;
    try {
      let pr = effortInPlay(yS, messagesForAPI_2);
      let Jr = pr === undefined ? undefined : lowerLearnedEffortCap(resolvedModel, pr);
      if (Jr === undefined) {
        logFeatureBad("api_org_effort_cap_retry", "no_lower_level");
        return null;
      }
      effortValue = lowerEffort(fI, yr());
      if (EE !== null)
        messagesForAPI_2 = ch(
          attachPerTurnOutputConfig(stripOutputConfigs(messagesForAPI_2), {
            effort: tu,
            effortCap: yr(),
            now: n$,
          }),
          "error_recovery",
        );
      logForDebugging(
        `[effort] the API refused effort '${pr}' as above the organization's cap for model ${options.model}. Sending the request again at no more than '${Jr}', as later requests to this model will be.`,
        {
          level: "warn",
        },
      );
      return `retry:org-effort-cap:${Jr}`;
    } catch (error) {
      logError(toError(error));
      return null;
    }
  };
  function* Qgt() {
    if (!Hi) return;
    let Wn;
    try {
      let pr = lowerEffort(Di, yr());
      if (pr !== Di && takeEffortCapNotice(resolvedModel)) {
        logFeatureOk("api_org_effort_cap_retry");
        Wn = createInformationalSystemMessage(
          `Your organization limits effort for ${renderModelName(resolvedModel)}, so Claude Code is using '${pr}' instead of '${Di}'. Your effort setting is unchanged.`,
          "warning",
        );
      }
    } catch (error) {
      logError(toError(error));
    }
    if (Wn) yield Wn;
  }
  let Jgt = (Wn) => {
    if (!isEffortUnsupportedError(Wn)) return S5n(Wn);
    markEffortUnsupported(options.model);
    if (resolvedModel !== options.model) markEffortUnsupported(resolvedModel);
    logForDebugging(
      `[effort] the server refused effort for model ${options.model} (the output_config.effort field or the anthropic-beta value ${BETA_EFFORT.header}). Sending the request again without either; this Claude Code process will not send either to this model again.`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_effort_unsupported_retry", {
      model: telemetrySafeModelName(options.model),
    });
    return "retry:effort-unsupported";
  };
  let Zgt = (Wn) => {
    if (!s3 || !isStructuredOutputsUnsupported(Wn)) return null;
    try {
      markStructuredOutputsUnsupportedClaude(options.model);
      logForDebugging(
        `[structured-outputs] model ${options.model} rejected output_config.format; latching unsupported and retrying without it.`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_structured_outputs_unsupported_retry", {
        model: telemetrySafeModelName(options.model),
      });
      return "retry:structured-outputs-unsupported";
    } catch (error) {
      logError(toError(error));
      return null;
    }
  };
  let eht = (Wn) => null;
  let tht = (Wn) => {
    if (m1 === "highlights" && isThinkingDisplayRejected(Wn)) {
      markThinkingHighlightsRefused();
      logForDebugging(
        "[thinking] server rejected thinking.display highlights; asking for omitted for the rest of this process and retrying.",
        {
          level: "warn",
        },
      );
      logEvent("tengu_thinking_display_highlights_rejected_retry", {
        model: telemetrySafeModelName(options.model),
      });
      return "retry:thinking-display-highlights";
    }
    return null;
  };
  let NLe = (Wn, pr = false) => {
    if (!wE || !hb.includes(BETA_THINKING_BINDING_CONTROLS.header)) return null;
    let Jr =
      isThinkingBindingRejected(Wn) ||
      (!shouldIncludeFirstPartyOnlyBetas() && mentionsThinkingBindingBeta(Wn));
    let Os =
      !shouldIncludeFirstPartyOnlyBetas() &&
      (isInvalidBetaFlagError(Wn) ||
        (pr && Wn instanceof APIError && Wn.status === 400 && !PE(Wn) && !FI(Wn)));
    if (!Jr && !Os) return null;
    wE = false;
    AC = undefined;
    betaList = betaList.filter((beta) => beta !== BETA_THINKING_BINDING_CONTROLS);
    markBetaRejected(conversation, BETA_THINKING_BINDING_CONTROLS);
    logForDebugging(
      Jr
        ? "[thinking] server rejected the thinking-binding-controls beta; dropping the header and the block_binding value for this conversation and retrying."
        : "[thinking] an HTTP 400 that does not name the thinking-binding-controls beta arrived on a request that carried it; guessing the platform refuses that beta, so retrying once without it and leaving it off for this conversation. The only loss is the API's list of the thinking blocks it dropped.",
      {
        level: "warn",
      },
    );
    logEvent("tengu_thinking_binding_rejected_retry", {
      model: telemetrySafeModelName(options.model),
    });
    return "retry:thinking-binding-controls";
  };
  let nht = (Wn) => {
    if (!hb.includes(BETA_THINKING_TOKEN_COUNT.header)) return null;
    if (WW() || !isInvalidBetaFlagError(Wn)) return null;
    betaList = betaList.filter((beta) => beta !== BETA_THINKING_TOKEN_COUNT);
    markBetaRejected(conversation, BETA_THINKING_TOKEN_COUNT);
    nP.push(BETA_THINKING_TOKEN_COUNT);
    logForDebugging(
      "[thinking-token-count] server rejected the beta; dropping it for this conversation and retrying.",
      {
        level: "warn",
      },
    );
    logEvent("tengu_thinking_token_count_rejected_retry", {
      model: telemetrySafeModelName(options.model),
      provider: getAPIProviderForAnalytics(),
      unnamed: true,
    });
    return "retry:thinking-token-count-beta";
  };
  let oht = (Wn) => {
    try {
      let rejectedBetas = getRejectedBetas(Wn, [...hb, ...Pae]);
      if (rejectedBetas.length === 0) return;
      let Jr = new Set(rejectedBetas);
      betaList = betaList.filter((beta) => !Jr.has(beta));
      for (let Os of rejectedBetas) {
        let La = isBetaHeaderRejected(Wn, Os);
        latchBetaRefused(Os, La);
        logEvent("tengu_beta_400_healed", {
          beta: hashToolNames([Os.header]),
          model: telemetrySafeModelName(options.model),
          provider: getAPIProviderForAnalytics(),
          status: Wn instanceof APIError ? Wn.status : undefined,
          only_mentioned: !La && !isBetaListedAsUnexpected(Wn, Os),
        });
      }
      if (Jr.has(BETA_PROMPT_CACHING_SCOPE)) systemBlocks = cLe();
      if (Jr.has(BETA_SPEED) && d3 !== undefined) markFallbackModelFastRejected(d3);
      return `retry:beta-rejected:${rejectedBetas.map((Os) => Os.name).join(",")}`;
    } catch (error) {
      logError(error);
      return;
    }
  };
  let rht = (Wn) => {
    if (!(Wn instanceof APIError) || Wn.status !== 400) return null;
    try {
      let pr = isContext1mBetaRejected(Wn);
      let Jr = !pr && isInvalidBetaFlagError(Wn);
      if (Gd === "spent") return null;
      if (Gd !== "idle") {
        Gd = Gd === "guessing" && Jr ? "spent" : "unproven";
        logForDebugging(
          `[betas] the resend without ${BETA_LONG_CONTEXT.header} also got an HTTP 400, so the backend is not recorded as rejecting it; ${Gd === "spent" ? 'both said "invalid beta flag", so it is sent again from the next attempt' : "it stays off for the remaining attempts of this request and is sent again on the next request"}`,
          {
            level: "warn",
          },
        );
        return null;
      }
      if (!sc || hitsAnthropicBackend(getProviderForModel(options.model)) || !(pr || (Jr && !WW())))
        return null;
      Gd = pr ? "retrying" : "guessing";
      logForDebugging(
        `[betas] an HTTP 400 ${pr ? "reads as the backend rejecting" : 'says "invalid beta flag", which may be about'} ${BETA_LONG_CONTEXT.header}; resending once without it`,
        {
          level: "warn",
        },
      );
      return "retry:context-1m-beta";
    } catch (error) {
      logError(error);
      return null;
    }
  };
  let sht = () => {
    if (Gd !== "retrying" && Gd !== "guessing") return;
    let unnamed = Gd === "guessing";
    Gd = "spent";
    try {
      betaList = betaList.filter((beta) => beta !== BETA_LONG_CONTEXT);
      rejectContextBetaForModel(options.model);
      logEvent("tengu_beta_400_healed", {
        beta: hashToolNames([BETA_LONG_CONTEXT.header]),
        model: telemetrySafeModelName(options.model),
        provider: getAPIProviderForAnalytics(),
        status: 400,
        unnamed,
      });
    } catch (error) {
      logError(error);
    }
  };
  let iht = (Wn) => {
    if (!hb.includes(BETA_THINKING_RESUMPTION.header) || !isThinkingResumptionBetaRejected(Wn)) return null;
    markThinkingResumptionRefused();
    markBetaHeaderRefused(BETA_THINKING_RESUMPTION);
    betaList = betaList.filter((beta) => beta !== BETA_THINKING_RESUMPTION);
    logForDebugging(
      "[thinking-resumption] server rejected the thinking-resumption beta header; disabled for this process",
      {
        level: "warn",
      },
    );
    logFeatureSad("query_thinking_block_resumption", "header_rejected");
    return fo ? "surface:resume-prefill" : "retry:thinking-resumption-beta";
  };
  let aht;
  let k5n = (Wn) => Wn instanceof APIError && isConversationBindingError(Wn);
  let I1 = 0;
  let stopReason = null;
  let PC = "all";
  let FLe = (Wn) => {
    if (!tp) PC = Wn;
    else if (
      PC !== "all" &&
      (Wn === "all" ||
        Wn.messageIndex < PC.messageIndex ||
        (Wn.messageIndex === PC.messageIndex && Wn.thinkingIndex < PC.thinkingIndex))
    )
      PC = Wn;
    tp = true;
  };
  let b5n = (block) => {
    if (_1) return;
    let pr = HS[block.messageIndex];
    if (pr?.role !== "assistant" || !Array.isArray(pr.content)) return;
    let thinkingBlockKey = getThinkingBlockKey(pr.content[block.blockIndex]);
    if (thinkingBlockKey === undefined) return;
    let Os;
    let La = new Map();
    for (let idx = 0; idx < messagesForAPI_2.length; idx++) {
      let Yl = messagesForAPI_2[idx];
      if (Yl.type !== "assistant" || !Array.isArray(Yl.message.content)) continue;
      let id = Yl.message.id;
      let Wd = La.get(id) ?? 0;
      for (let ku of Yl.message.content) {
        if (ku.type !== "thinking" && ku.type !== "redacted_thinking") continue;
        if (getThinkingBlockKey(ku) === thinkingBlockKey) {
          if (Os !== undefined) return;
          Os = {
            messageIndex: idx,
            indexInMessage: Wd - (La.get(id) ?? 0),
            thinkingIndex: Wd,
            messageId: id,
          };
        }
        Wd++;
      }
      La.set(id, Wd);
    }
    return typeof Os?.messageId === "string" ? Os : undefined;
  };
  let dht = (Wn) => {
    try {
      if (!k5n(Wn)) return;
      I1++;
      let pr = Wn.requestID || Wn.error?.request_id || null;
      if (I1 === 1) stopReason = pr;
      let thinkingPrefixMismatchHeader = parseThinkingPrefixMismatchHeader(Wn);
      let Os = messagesForAPI_2;
      let La = (() => {
        if (options.resumeIncompleteThinking) return;
        let Wd =
          thinkingPrefixMismatchHeader?.block !== undefined && I1 <= MAX_SIGNATURE_STRIP_ATTEMPTS
            ? b5n(thinkingPrefixMismatchHeader.block)
            : undefined;
        if (Wd !== undefined) {
          let Np = stripThinkingFromPoint(Os, {
            messageIndex: Wd.messageIndex,
            thinkingIndex: Wd.indexInMessage,
          });
          if (Np !== Os)
            return {
              scope: "partial",
              stripped: Np,
              from: Wd,
            };
        }
        let ku = stripAllThinking(Os);
        return ku !== Os
          ? {
              scope: "all",
              stripped: ku,
              from: "all",
            }
          : undefined;
      })();
      if (La === undefined && !tp) markPrefixLockHealDeclined(Wn);
      let scope = La?.scope ?? "none";
      let Yl = summarizeThinkingStrip(Os, La?.stripped ?? Os);
      if (La !== undefined) {
        messagesForAPI_2 = ch(La.stripped, "error_recovery", true);
        FLe(La.from);
      }
      logForDebugging(
        La === undefined
          ? "[thinking] prefix-lock rejection: nothing to strip; the error is returned."
          : `[thinking] prefix-lock rejection: stripped ${Yl.blocksStripped} of ${Yl.blocksSent} thinking block(s) (${scope}) and retrying.`,
        {
          level: "warn",
        },
      );
      let pendingChangeSummary = getPendingChangeSummary(options.querySource, options.agentId);
      logEvent("tengu_strict_prefix_lock_400_surfaced", {
        query_source: agentTypeForTelemetry(options.querySource),
        model: telemetrySafeModelName(options.model),
        request_id: traceValueOrUnknown(pr),
        chain_request_id: traceValueOrUnknown(stopReason),
        client_request_id: sanitizeMarkName(Ah),
        solicited,
        mismatch_kind: sanitizeMarkName(thinkingPrefixMismatchHeader?.kind),
        failing_message_index: thinkingPrefixMismatchHeader?.block?.messageIndex,
        failing_block_index: thinkingPrefixMismatchHeader?.block?.blockIndex,
        thinking_blocks_sent: Yl.blocksSent,
        thinking_turns_sent: Yl.turnsSent,
        strip_scope: fromEnum(scope),
        stripped_block_count: Yl.blocksStripped,
        stripped_turn_count: Yl.turnsStripped,
        attempt: I1,
        client_change_kinds: pendingChangeSummary.kinds,
        first_changed_message_index: pendingChangeSummary.firstChangedMessageIndex,
        client_baseline: pendingChangeSummary.baseline,
        call_number: pendingChangeSummary.callNumber,
      });
      return La === undefined
        ? undefined
        : La.scope === "partial"
          ? `retry:prefix-lock-strip-${I1}`
          : `retry:prefix-lock-strip-all-${I1}`;
    } catch (error) {
      logError(error);
    }
    return;
  };
  let w5n = (Wn) => {
    let pr = dht(Wn);
    if (keptForeignSignatures && isInvalidThinkingSignatureError(Wn))
      dropForeignThinkingKeep(pr !== undefined ? "rejected_healed" : "rejected_surfaced");
    return pr;
  };
  function* uht() {}
  function* cht() {
    if (aht !== undefined) {
      let Wn;
      try {
      } catch (error) {
        logError(error);
      }
      aht = undefined;
      if (Wn) yield Wn;
    }
  }
  let M3 = false;
  function fht() {
    let Wn = guardReturning(
      () => builtForRelay && !M3 && (thinkingRelayModuleClaude?.relayStoppedInLastDispatch() ?? false),
      false,
    );
    if (Wn) {
      let pr = guardReturning(() => thinkingStripAllPlan(messages).size > 0, undefined);
      if (pr === true) {
        tp = true;
        PC = "all";
        Rf = true;
      } else if (pr === false) ap = true;
    }
    if (ap && !tp && !M3) {
      M3 = true;
      guardReturning(
        () => thinkingRelayModuleClaude?.markRelayThinkingStripRecorded("no_thinking"),
        undefined,
      );
      return createAttachmentMessage_2({
        type: "thinking_stripped",
        scope: "all",
      });
    }
    if (!tp || M3) return;
    M3 = true;
    if (Rf)
      guardReturning(
        () =>
          thinkingRelayModuleClaude?.markRelayThinkingStripRecorded(Wn ? "marker_same_request" : "marker"),
        undefined,
      );
    return createAttachmentMessage_2(
      PC === "all"
        ? {
            type: "thinking_stripped",
            scope: "all",
          }
        : {
            type: "thinking_stripped",
            scope: "partial",
            from: {
              messageId: PC.messageId,
              thinkingIndex: PC.thinkingIndex,
            },
          },
    );
  }
  async function* BMs() {}
  function pht({ messageIndex, blockIndex }) {
    let Jr = HS[messageIndex];
    return Jr?.role === "assistant" && Array.isArray(Jr.content)
      ? getThinkingBlockKey(Jr.content[blockIndex])
      : undefined;
  }
  function mht(body) {
    try {
      if (!isTetherLive() || _1 || Cae || Kf || Ac !== undefined) return;
      checkTetherPrefixMismatch({
        body,
        blockKeyAt: pht,
        replyHolding: (pr, Jr) => {
          let Os = Eh(pr);
          let La = Os === undefined ? undefined : messagesForAPI_2[Os];
          return Os !== undefined &&
            La?.type === "assistant" &&
            Array.isArray(La.message.content) &&
            La.message.content.some((Vl) => getThinkingBlockKey(Vl) === Jr)
            ? {
                messageId: La.message.id,
                messageIndex: Os,
              }
            : undefined;
        },
        carrier: {
          key: threadSourceKind(options.querySource) !== null ? formatZodErrors(options.agentId) : undefined,
          querySource: options.querySource,
        },
        sentThreadPrefix: createSentPrefixChecker({
          model: options.model,
          system: systemBlocks,
          toolSchemas: toolSchemas_2,
          thinkingConfig: betas,
          getMessageHashes,
        }),
      });
    } catch (error) {
      logError(toError(error));
    }
  }
  let ght = (body) => {
    if (_1) return;
    let pr = reportThinkingDrop({
      body,
      blockKeyAt: pht,
      carriedBlockHashes: () => collectDroppedThinkingHashes(messages),
      countThinkingSent: () => summarizeThinkingStrip(messagesForAPI_2, messagesForAPI_2),
      querySource: options.querySource,
      agentId: options.agentId,
      model: options.model,
      requestId: Al,
      solicited,
      contextCompactedKind: BLe,
    });
    try {
      return (
        pr &&
        createAttachmentMessage_2(
          buildThinkingDropAttachment(pr, {
            requestId: Al,
            model: options.model,
            querySource: options.querySource,
            requestedBehavior: g1,
          }),
        )
      );
    } catch (error) {
      logError(error);
      return;
    }
  };
  let T5n = (message) => {
    let pr =
      options.serverRefusalFallback !== undefined
        ? (message.content ?? []).reduce((acc, ku, Np) => (isFallbackNotification(ku) ? Np : acc), -1)
        : -1;
    let Jr = message.stop_reason === "refusal";
    let Os;
    let La = 0;
    let hadToolUse = false;
    let Yl = [];
    for (let [Wd, ku] of (message.content ?? []).entries()) {
      if (!isFallbackNotification(ku)) {
        if ((Wd < pr && ku.type !== "text") || (Jr && pr >= 0)) {
          La++;
          hadToolUse ||= ku.type === "tool_use";
          continue;
        }
        Yl.push(ku);
        continue;
      }
      let fallbackMessage = parseFallbackMessage(ku);
      if (fallbackMessage === undefined) {
        logForDiagnosticsNoPII("warn", "cli_malformed_fallback_block");
        logEvent("tengu_rotunda_pennant_malformed", {
          block_index: Wd,
          non_streaming: true,
        });
        logFeatureSad("refusal_fallback", "malformed_fallback_block", {
          non_streaming: true,
        });
        continue;
      }
      Yl.push(fallbackNotification(fallbackMessage));
      Os = fallbackMessage;
      let hf = w$;
      logEvent("tengu_rotunda_pennant_materialized", {
        armed: options.serverRefusalFallback !== undefined,
        mode: fromEnum(hf),
        block_index: Wd,
        non_streaming: true,
      });
      if (fallbackMessage.reason === "refusal")
        logApiRefusal({
          model: resolvedModel,
          requestId: Al || undefined,
          querySource: options.querySource,
          effort: CC,
          fastMode: fallbackActive,
          attempt: p_,
          attribution: buildAttribution(
            options.querySource,
            options.spawnedBySkill,
            options.activeSkill,
            options.activeMcpServer,
            options.activeMcpTool,
          ),
          serverFallbackHop: true,
          agentContext: options.agentContext,
        });
    }
    if (Yl.length === 0 && (message.content ?? []).length > 0)
      Yl.push({
        type: "text",
        text: NO_CONTENT_MESSAGE,
        citations: [],
      });
    let nd = options.serverRefusalFallback !== undefined ? parseUsageIterations(message.usage) : undefined;
    $E =
      nd?.servedFallbackModel !== undefined ||
      (options.serverRefusalFallback !== undefined && Os !== undefined);
    UT = false;
    b1 = false;
    Hae = nd;
    if (La > 0)
      logEvent("tengu_rotunda_pennant_sync_dropped", {
        dropped_count: La,
        had_tool_use: hadToolUse,
        chain_exhausted: Jr,
      });
    return {
      content: Yl,
      lastHop: Os,
      iterations: nd,
    };
  };
  function* v5n(Wn, message, creditCode) {
    if (creditCode !== undefined && !b1) {
      b1 = true;
      let hf = mRe(EMPTY_USAGE, message.usage);
      logEvent("tengu_fallback_credit_minted", {
        request_id: sanitizeMarkName(Al),
        model: telemetrySafeModelName(options.model),
        fallback_target_model: telemetrySafeModelName(
          options.refusalFallbackModel ??
            (options.serverRefusalFallback !== undefined && !$E
              ? options.serverRefusalFallback.model
              : undefined),
        ),
        token_length: creditCode.length,
        input_tokens: hf.input_tokens,
        output_tokens: hf.output_tokens,
        cache_read_input_tokens: hf.cache_read_input_tokens,
        cache_creation_input_tokens: hf.cache_creation_input_tokens,
        cache_creation_5m_input_tokens: hf.cache_creation?.ephemeral_5m_input_tokens ?? 0,
        cache_creation_1h_input_tokens: hf.cache_creation?.ephemeral_1h_input_tokens ?? 0,
        service_tier: fromEnumOpt(hf.service_tier),
        speed: fromEnumOpt(hf.speed),
        query_source: agentTypeForTelemetry(options.querySource),
        ...(options.queryTracking && {
          query_chain_id: sanitizeMarkName(options.queryTracking.chainId),
          query_depth: options.queryTracking.depth,
        }),
      });
    }
    let Os =
      options.serverRefusalFallback !== undefined
        ? (Wn.lastHop?.model ?? Wn.iterations?.servedFallbackModel)
        : undefined;
    if (!UT && Os !== undefined) {
      UT = true;
      yield {
        type: "server_fallback",
        fromModel: Wn.lastHop?.fromModel ?? options.model,
        toModel: Os,
        reason: Wn.lastHop !== undefined ? "refusal" : "sticky",
        apiRefusalCategory: Wn.lastHop?.category ?? null,
        midStream: false,
        requestId: Al ?? null,
        refusedEffort: qx(),
        discardedMessages: [],
        retainedMessages: [],
        retainedText: "",
        finalStopReason: message.stop_reason,
      };
    }
    let La = options.refusalFallbackModelLane === "silent";
    let Vl = !La
      ? (options.refusalFallbackModel ??
        (options.serverRefusalFallback !== undefined && !$E
          ? options.serverRefusalFallback.model
          : undefined))
      : undefined;
    let refusalFallbackCascadeHop = options.refusalFallbackCascadeHop;
    let nd =
      message.stop_reason === "refusal" && Vl !== undefined && refusalFallbackCascadeHop === undefined
        ? resolveRefusalFallbackRoute({
            originalModelCanonical: getCanonicalName(options.model),
            armedFallbackModel: Vl,
            apiRefusalCategory: message.stop_details?.category ?? null,
            armedTargetIsRefusingModel: isSameModel(options.model, Vl),
            resolveTarget: (mappedTarget) =>
              pickFallbackModel({
                mappedTarget,
                armedFallbackModel: Vl,
                refusingModel: options.model,
                triedModels: [canonicalModelKey(options.model)],
              }),
            routesOverride: noopDialogHost(),
          })
        : undefined;
    let Wd = nd !== undefined ? nd.model : Vl;
    if (nd !== undefined)
      logFallbackRouteOutcome({
        route: nd,
        model: options.model,
        armedFallbackModel: Vl,
        apiRefusalCategory: message.stop_details?.category,
        requestId: Al,
      });
    if (message.stop_reason === "refusal" && Wd !== undefined) {
      DLe();
      k3 = true;
      yield {
        type: "fallback_request",
        trigger: "refusal",
        originalModel: options.model,
        fallbackModel: Wd,
        requestId: Al ?? null,
        refusedEffort: qx(),
        apiRefusalCategory: message.stop_details?.category ?? null,
        apiRefusalExplanation: message.stop_details?.explanation ?? null,
        creditCode: creditCode ?? null,
        mintedStateless: !c1,
        ...describeFallbackRoute(nd, refusalFallbackCascadeHop),
      };
      return true;
    }
    let refusalMessage = getRefusalMessage(
      message.stop_reason,
      message.stop_details,
      Al,
      Os ?? options.model,
      message.id,
    );
    if (refusalMessage) {
      let hf = hasRefusalFallbackOccurred() || getRefusalFallbackModelLatch() !== undefined;
      if (
        Vl !== undefined ||
        options.refusalFallbackModel !== undefined ||
        (hasRefusalFallbackTarget(options.model) && isRefusalFallbackEnabled()) ||
        hasFallbackLatch() ||
        hf
      )
        logFeatureBad(
          "refusal_fallback",
          nd?.matched === "none"
            ? "route_declined"
            : La
              ? "sync_silent_stood"
              : Os !== undefined
                ? "server_chain_exhausted"
                : hf
                  ? "client_chain_exhausted"
                  : hasRefusalFallbackTarget(options.model) && isSwitchModelsOnFlagDisabled()
                    ? "disabled_by_config"
                    : "not_armed",
          {
            convolute_arcades: hasConvoluteArcadesFlag(),
            arm_source: fromEnum(getFallbackLatchKind()),
            armed: Vl !== undefined,
            model_scope: fromEnum(classifyFallbackOrigin(options.model)),
          },
        );
      yield {
        type: "refusal_no_fallback",
        originalModel: options.model,
        requestId: Al ?? null,
        apiRefusalCategory: message.stop_details?.category ?? null,
        apiRefusalExplanation: message.stop_details?.explanation ?? null,
      };
      yield refusalMessage;
    }
    let Np = E5n(message);
    if (Np !== undefined) yield Np;
    return false;
  }
  function E5n(Wn) {
    try {
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_vast_sunset", true)) return;
      return getMaxTokensStopMessage(
        Wn.stop_reason,
        Math.min(BT, MAX_OUTPUT_TOKENS_CAP_2),
        Wn.usage?.output_tokens ?? 0,
        BT >= MAX_OUTPUT_TOKENS_CAP_2,
      );
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "building the cut-short error for a non-streaming response failed",
        ),
      );
      return;
    }
  }
  let hht = [];
  function yht(clearedIds, clearedContent) {
    if (clearedIds.size > 0)
      hht.push({
        type: "hint_clears",
        ids: [...clearedIds],
        contentById: Object.fromEntries(clearedContent),
      });
  }
  function* $Le() {
    yield* hht.splice(0);
  }
  async function* _ht(originatingRequestId, failedStreamOutlastedTimeout) {
    let { message, requestId, headers, creditCode } = yield* executeNonStreamingRequest(
      {
        model: options.model,
        fetchOverride: options.fetchOverride,
        source: options.querySource,
        requestClass: options.requestClass,
        agentContext: options.agentContext,
        promptId: Me,
        ccsSender: ccrSenderAddressKey,
        permissionContext,
        toolNames,
        credentials: options.credentials,
        storageV5: options.storageV5,
        clock,
        queryTracking: options.queryTracking,
        llmSpan: llmRequestSpan,
        contextCompactedKindForWire: BLe,
        compactionRequestKindForWire: compactionRequestKind,
        prevToolDurationsForWire: bht,
      },
      {
        model: options.model,
        fallbackModel: options.fallbackModel,
        accessFallbackModel: accessFallbackModel_2,
        toolFreeHelper: options.toolFreeHelper,
        ...(isFastModeEnabled() && {
          fastMode: fE,
        }),
        modelIsRefusalFallbackTarget: options.modelIsRefusalFallbackTarget,
        signal,
        initialConsecutive529Errors: retryBudget.counts().overloaded,
        querySource: options.querySource,
        maxRetries: retryBudget.retriesLeft(),
        modelCallRetries: retryBudget,
        clock,
        random: options.random,
        isResumePrefillRequest: fo,
        failedStreamOutlastedTimeout,
        onRetryStatus: options.onRetryStatus,
        subscribeRetryWake: options.subscribeRetryWake,
        onQuotaWindowWait,
        isUsageLimitLifted,
        lowPriorityWait: _S,
        stampDispatchHeader: Pgt,
        onApiError: async (Pc) => {
          let ey = l1(Pc);
          if (ey !== undefined) return ey;
          let Ew = await Mgt(Pc);
          if (Ew !== undefined) return Ew;
          let Aw = l$(Pc);
          if (Aw !== undefined) return Aw;
          let VT = M5(Pc);
          if (VT !== undefined) return VT;
          let Am = eht(Pc);
          if (Am !== null) return Am;
          let cP = Ugt(Pc, "sync");
          if (cP !== undefined) return cP;
          let fP = ILe(Pc);
          if (fP !== undefined) return fP;
          let foundryRetryDirective = getFoundryRetryDirective(Pc, options.model, options.querySource);
          if (foundryRetryDirective === FAIL_FOUNDRY_PURPOSE_REQUEST) return;
          if (foundryRetryDirective !== null) return foundryRetryDirective;
          let HI = Zgt(Pc);
          if (HI !== null) return HI;
          let pP = jgt(Pc);
          if (pP) return pP;
          let BE = LLe(Pc);
          if (BE) return BE;
          let OC = Jgt(Pc);
          if (OC !== null) return OC;
          let UE = iht(Pc);
          if (UE === "surface:resume-prefill") return;
          if (UE !== null) return UE;
          let mP = tht(Pc);
          if (mP !== null) return mP;
          let P$ = nht(Pc);
          if (P$ !== null) return P$;
          let fh = oht(Pc);
          if (fh !== undefined) return fh;
          D5(Pc);
          let Ow = rht(Pc);
          if (Ow !== null) return Ow;
          let _b = NLe(Pc);
          if (_b !== null) return _b;
          let jE = w5n(Pc);
          if (jE !== undefined) return jE;
          return (
            $gt(Pc) ??
            Ngt(Pc) ??
            Hgt(Pc) ??
            i1(Pc, false) ??
            Ogt(Pc, "sync") ??
            SI(Pc) ??
            a1(Pc) ??
            OLe(Pc) ??
            _Le(Pc) ??
            L5(Pc) ??
            Tae(Pc)
          );
        },
      },
      buildRequestParamsGuarded,
      (Pc, ey, Ew) => {
        p_ = Pc;
        BT = Ew;
        S3 = ey;
      },
      (Pc) => Af(Pc, false),
      originatingRequestId,
    );
    Al = requestId;
    C5(requestId, headers, true);
    mht(message);
    Nh?.settle(
      {
        kind: "ok",
      },
      Al,
      message.id,
    );
    try {
      Ggt(message.usage);
      zgt(message.usage);
    } catch {}
    qgt();
    Kgt();
    Vgt();
    Ygt();
    Xgt();
    N5();
    t1();
    Rae();
    sht();
    e1();
    Wgt();
    logEvent("tengu_nonstreaming_fallback_success", {
      model: telemetrySafeModelName(options.model),
      request_id: traceValueOrUnknown(requestId),
      originating_request_id: traceValueOrUnknown(fc),
      fallback_cause: fromEnum(originatingRequestId.cause),
      attempt: p_,
    });
    yield* cht();
    yield* uht();
    yield* Qgt();
    b3 = message.diagnostics?.cache_miss_reason ?? undefined;
    let Yl = T5n(message);
    let nd = aI ? captureWireToolInputs(Yl.content) : undefined;
    if (nd?.degraded) logWireToolInputParseFailure();
    let inputs = nd?.inputs;
    let ku = countToolCallsSince_4(Yl.content, inputs);
    let { content, batchToolUses } = isBatchToolsUse(
      normalizeContentFromAPI(
        Yl.content,
        tools,
        options.agentId,
        {
          requestId: Al ?? undefined,
          messageId: message.id,
        },
        options.storageV5,
      ),
      tools,
      (Pc, ey) => normalizeToolInput_2(Pc, ey, options.agentId, options.storageV5),
    );
    if (Qh !== undefined) MI(Qh, message, message.content);
    ALe = headers;
    let Kg = ght(message);
    let cy = fht();
    if (cy) yield cy;
    let jT = np();
    if (jT) yield jT;
    if (Kg) yield Kg;
    let pk = {
      message: {
        ...message,
        content,
        usage: mRe(EMPTY_USAGE, message.usage),
        ...(m$ &&
          message.context_management && {
            context_management: addClientEstimatedClearedTokens(message.context_management, EI?.edit, HS),
          }),
      },
      ...(batchToolUses.length > 0 && {
        batchToolUses,
      }),
      ...(inputs !== undefined && {
        wireToolInputs: inputs,
      }),
      ...(ku !== undefined && {
        wireIngestContext: ku,
      }),
      ...(Qh !== undefined && classifierResultPayload(Qh)),
      apiBlockIndex: 0,
      requestId: Al ?? undefined,
      requestRef,
      requestedModel: options.model,
      ...buildAttribution(
        options.querySource,
        options.spawnedBySkill,
        options.activeSkill,
        options.activeMcpServer,
        options.activeMcpTool,
      ),
      type: "assistant",
      uuid: randomUUID(),
      timestamp: new Date().toISOString(),
      ...false,
      ...(yn && {
        advisorModel: yn,
      }),
      ...(yS !== undefined && {
        effort: yS,
      }),
      perTurnEffort: EE,
      perTurnTiming: n$,
      ...{},
    };
    noopNotice(conversation, pk);
    Cm.push(pk);
    LI = pk;
    Ux = false;
    yield pk;
    return yield* v5n(Yl, message, creditCode);
  }
  let D3 = false;
  let MC = new Map();
  let Bae = new Set();
  let HLe = new Set();
  let E$;
  let Sht =
    getBackgroundAgentId(options.agentContext) ?? (options.isBackgroundAgent ? options.agentId : undefined);
  let BLe =
    classifyQuerySource(options.querySource) === "main" &&
    isMainQueryCompaction(options.querySource, options.agentId)
      ? consumePendingContextCompacted()
      : undefined;
  let compactionRequestKind = options.compactionRequestKind;
  let bht =
    options.prevToolDurations !== undefined
      ? formatToolDurationsHeader(options.prevToolDurations)
      : undefined;
  try {
    startSessionActivity("api_call", Sht);
    e: for (;;) {
      let D1 = function () {
        if (streamIdleTimer !== null) {
          streamIdleTimer();
          streamIdleTimer = null;
        }
        if (BI) {
          BI = false;
          options.onRetryStatus?.(null);
        }
        if (streamWatchdogFiredAt !== null) {
          streamWatchdogFiredAt();
          streamWatchdogFiredAt = null;
        }
        if (streamIdleWarningTimer !== null) {
          streamIdleWarningTimer();
          streamIdleWarningTimer = null;
        }
      };
      let L1 = function () {
        if (!options.onRetryStatus || !clock_2) return;
        let lastAt = clock_2.lastAt;
        let od = clock.monotonicNow();
        streamIdleTimer = clock.setTimeout(
          () => {
            if (clock.monotonicNow() - od < streamStallMarginMs / 2) return;
            if (clock_2.lastAt > lastAt) {
              L1();
              return;
            }
            let Zg = clock.monotonicNow() - clock_2.lastAt;
            if (E1 && Zg < min_2) {
              L1();
              return;
            }
            let Iy = clock_2.lastAt === 0 ? clock.monotonicNow() - Os : Zg;
            BI = true;
            options.onRetryStatus?.({
              kind: "stalled",
              deadline: clock.now() + Math.max(0, min - Iy),
            });
          },
          streamStallMarginMs,
          {
            unref: true,
          },
        );
      };
      let L_ = function () {
        D1();
        L1();
        if (!CLAUDE_ENABLE_STREAM_WATCHDOG) return;
        let Fd = clock.monotonicNow();
        let wallArmedAt = clock.now();
        let Zg = OC;
        streamWatchdogFiredAt = clock.setTimeout(() => {
          if (clock.monotonicNow() - Fd < Zg) return;
          logForDebugging(`Streaming idle warning: no chunks received for ${Zg / 1000}s`, {
            level: "warn",
          });
          logForDiagnosticsNoPII("warn", "cli_streaming_idle_warning");
        }, OC);
        streamIdleWarningTimer = clock.setTimeout(() => {
          Ow = checkSuspendedStreamIdle(clock, {
            armedAt: Fd,
            wallArmedAt,
            idleMs: streamIdleTimeoutMs,
          });
          if (Ow !== undefined) {
            releaseStreamResources();
            return;
          }
          fh = true;
          _b = clock.monotonicNow();
          logForDebugging(
            `Streaming idle timeout: no chunks received for ${streamIdleTimeoutMs / 1000}s, aborting stream`,
            {
              level: "error",
            },
          );
          logForDiagnosticsNoPII("error", "cli_streaming_idle_timeout");
          logEvent("tengu_streaming_idle_timeout", {
            model: telemetrySafeModelName(options.model),
            request_id: traceValueOrUnknown(Al),
            timeout_ms: streamIdleTimeoutMs,
            tier: lit_2("event"),
          });
          releaseStreamResources();
        }, streamIdleTimeoutMs);
      };
      nk = undefined;
      queryCheckpoint("query_client_creation_start");
      if (isTopLevelMain) {
        endProfilePhase("request_build");
        startProfilePhase("client_creation");
      }
      let generator = withRetry(
        () =>
          getAnthropicClient({
            maxRetries: 0,
            model: options.model,
            fetchOverride: options.fetchOverride,
            source: options.querySource,
            requestClass: options.requestClass,
            agentContext: options.agentContext,
            promptId: Me,
            ccsSender: ccrSenderAddressKey,
            permissionContext,
            toolNames,
            credentials: options.credentials,
            storageV5: options.storageV5,
            signal,
            clock,
            noResponseRetryLedger: xLe,
          }),
        async (anthropic, attempt, context) => {
          if (fallbackCreditCode === undefined) C_("attempt_errored", Al ?? null, null);
          p_ = attempt;
          fallbackActive = context.fastMode ?? false;
          Uy = clock.monotonicNow();
          nk = undefined;
          B5.push(Uy);
          queryCheckpoint("query_client_creation_end");
          if (isTopLevelMain) {
            endProfilePhase("client_creation");
            startProfilePhase("request_build");
          }
          let params = buildRequestParamsGuarded(context);
          try {
            wgt(params);
          } catch (error) {
            logError(toError(error));
          }
          logApiRequestDetail(params);
          Af(params, true);
          BT = params.max_tokens;
          queryCheckpoint("query_api_request_sent");
          logForDebugging(
            `[API:timing] dispatching to ${getProviderForModel(options.model)} model=${options.model}`,
          );
          S3 = clock.now();
          if (CLe === undefined && options.queryTracking?.roundStartedAtMs !== undefined) {
            options.queryTracking.firstDispatchedAtMs ??= performance.now();
            CLe = Math.round(
              options.queryTracking.firstDispatchedAtMs - options.queryTracking.roundStartedAtMs,
            );
          }
          if (!options.agentId) {
            if (Hi) headlessProfilerCheckpoint("api_request_sent");
            if (isTopLevelMain) endProfilePhase("request_build");
            if (attempt === 1 && !_3) {
              _3 = clock.monotonicNow();
              ELe = clock.now();
              if (Hi) recordApiRequestSentFromSpawn();
              if (isTopLevelMain) RLe = closeProfile(_3);
            }
            if (Hi)
              try {
                markRootRequestSent();
              } catch (error) {
                logError(toError(error));
              }
          }
          OE();
          let Of = parseIntLoose(process.env.CLAUDE_SLOW_FIRST_BYTE_MS) || 30000;
          $T = clock.setTimeout(() => {
            $T = null;
            let Ql = clock.monotonicNow() - Uy;
            logForDebugging(
              `Slow first byte: no stream chunk ${(Ql / 1000).toFixed(1)}s after request sent (attempt ${attempt})`,
              {
                level: "warn",
              },
            );
            logEvent("tengu_api_slow_first_byte", {
              model: telemetrySafeModelName(options.model),
              provider: getAPIProviderForAnalytics(),
              attempt,
              elapsed_ms: Math.round(Ql),
            });
          }, Of);
          let requestTraceHeaders = buildRequestTraceHeaders(llmRequestSpan, B5.length);
          Ah = requestTraceHeaders.clientRequestId;
          let headers = requestTraceHeaders.headers;
          Jh = isFirstPartyApiBackend() && isLowPriorityActiveSafe();
          if (Jh) headers[ANTHROPIC_USAGE_LIMIT] = SLOW;
          if (shouldSendExtendedUsageLimitHeader(options, Jh, Je))
            headers[ANTHROPIC_USAGE_LIMIT] = "extended";
          Pgt(headers, Jh);
          if (
            options.fallbackStampFromModel !== undefined &&
            getAPIProvider() === "firstParty" &&
            isFirstPartyAnthropicBaseUrl()
          )
            for (let [Ql, Nu] of [
              [X_CC_FALLBACK_FROM_MODEL, options.fallbackStampFromModel],
              [X_CC_FALLBACK_CATEGORY, options.fallbackStampCategory],
              [X_CC_FALLBACK_TRIGGER, options.fallbackStampTrigger],
              [X_CC_ORIGINAL_REQUEST_ID, options.fallbackStampOriginalRequestId],
            ]) {
              let Qc = sanitizeHeaderValue_2(Nu);
              if (Qc !== undefined) headers[Ql] = Qc;
            }
          setCompactionHeaders(headers, BLe, compactionRequestKind);
          setPrevToolDurationsHeader(headers, bht);
          let vc = fallbackCreditCode;
          sP = vc !== undefined;
          if (vc !== undefined) {
            fallbackCreditCode = undefined;
            y3 = true;
          }
          limitsAccountEpoch = getLimitsAccountEpoch();
          if (Ah !== undefined) {
            armFirstByteWatchdog(Ah, {
              escalated: xLe.count > 0,
            });
            takeDispatchAtGzip(Ah, performance.now());
          }
          if (classifyQuerySource(options.querySource) === "main") setTimeout(warmHarnessPatterns, 0);
          setTimeout(flushMessageOutlines, 0, options.querySource, options.agentId);
          let streamRequestBody = {
            ...deferredToolNameOf(params),
            ...(vc !== undefined && {
              fallback_credit_token: vc,
            }),
            stream: true,
          };
          let eh = takesRequestBodyBytes(options.fetchOverride)
            ? checkIncrementalRequestBody(
                streamRequestBody,
                classifyQuerySource(options.querySource) === "main" && options.agentId === undefined,
              )
            : undefined;
          let responseWithMeta = await reportIncrementalBodyMismatch(eh, streamRequestBody, () =>
            anthropic.beta.messages
              .create(streamRequestBody, {
                signal,
                ...(eh === undefined
                  ? Object.keys(headers).length > 0 && {
                      headers,
                    }
                  : {
                      body: eh,
                      headers: {
                        ...headers,
                        "content-type": "application/json",
                      },
                    }),
              })
              .withResponse(),
          ).catch((error) => {
            OE();
            throw error;
          });
          queryCheckpoint("query_response_headers_received");
          Al = amazonRequestId(responseWithMeta.request_id, responseWithMeta.response?.headers);
          k_ = responseWithMeta.response;
          bS = clock.now();
          C5(Al, responseWithMeta.response?.headers, false);
          nk = responseWithMeta.response && {
            status: responseWithMeta.response.status,
            headers: responseWithMeta.response.headers,
            latencyMs: Math.round(clock.monotonicNow() - Uy),
          };
          logApiRouteObserved(nk, eh !== undefined);
          if (vc !== undefined)
            logEvent("tengu_rotunda_pennant_credit_echoed", {
              mint_request_id: sanitizeMarkName(options.fallbackCreditMintRequestId),
              mint_model: telemetrySafeModelName(options.fallbackCreditMintModel),
              request_id: sanitizeMarkName(Al),
              client_request_id: sanitizeMarkName(Ah),
              model: telemetrySafeModelName(options.model),
              token_length: vc.length,
              query_source: agentTypeForTelemetry(options.querySource),
            });
          return responseWithMeta.data;
        },
        {
          model: options.model,
          credentials: options.credentials,
          storageV5: options.storageV5,
          fallbackModel: options.fallbackModel,
          accessFallbackModel: accessFallbackModel_2,
          toolFreeHelper: options.toolFreeHelper,
          ...(isFastModeEnabled()
            ? {
                fastMode: fE,
              }
            : false),
          modelIsRefusalFallbackTarget: options.modelIsRefusalFallbackTarget,
          signal,
          initialConsecutive529Errors: retryBudget.counts().overloaded,
          maxRetries: retryBudget.retriesLeft(),
          noResponseRetryLedger: xLe,
          modelCallRetries: retryBudget,
          clock,
          random: options.random,
          isResumePrefillRequest: fo,
          querySource: options.querySource,
          onRetryStatus: options.onRetryStatus,
          subscribeRetryWake: options.subscribeRetryWake,
          onQuotaWindowWait,
          isUsageLimitLifted,
          lowPriorityWait: _S,
          onError: async (Fd) => {
            vgt();
            let od = l1(Fd);
            if (od !== undefined) return od;
            let Zg = l$(Fd);
            if (Zg !== undefined) return Zg;
            let Iy = M5(Fd);
            if (Iy !== undefined) return Iy;
            let Of = eht(Fd);
            if (Of !== null) return Of;
            if (_E && isAfkModeBetaRejected(Fd)) {
              _E = false;
              if (BETA_AFK_MODE) markBetaRejected(conversation, BETA_AFK_MODE);
              setAutoModeActive(false);
              setAutoModeCircuitBroken(true);
              logForDebugging(
                "[auto-mode] server rejected afk-mode beta \u2014 dropping header and circuit-breaking auto for this session",
                {
                  level: "warn",
                },
              );
              return "retry:afk-beta";
            }
            let B_ = await Mgt(Fd);
            if (B_ !== undefined) return B_;
            if (isAdvisorResultUnprocessable(Fd)) {
              let Xl = messagesForAPI_2;
              let ql = stripAdvisorBlocks(Xl);
              let index = Xl.findIndex((ty, fp) => ql[fp] !== ty);
              let reduced = Xl.reduce((acc, fp, th) => (ql[th] !== fp ? acc + 1 : acc), 0);
              let Nf = isFoamySpringWireOn() && index !== -1;
              let G_;
              if (Nf && !options.resumeIncompleteThinking && Mae !== "enabled")
                try {
                  let index_2 = Xl.findIndex((th, Fg) => Fg >= index && hasAdvisorBlocks(th));
                  let fp = index_2 === -1 ? undefined : Xl[index_2];
                  if (fp?.type === "assistant") {
                    let th = stripThinkingFromPoint(ql, {
                      messageIndex: index_2,
                      thinkingIndex: 0,
                    });
                    if (th !== ql) {
                      ql = th;
                      let id = fp.message.id;
                      if (typeof id === "string") {
                        let thinkingIndex = 0;
                        for (let idx = 0; idx < index_2; idx++) {
                          let pp = Xl[idx];
                          if (
                            pp.type === "assistant" &&
                            pp.message.id === id &&
                            Array.isArray(pp.message.content)
                          )
                            thinkingIndex += count(
                              pp.message.content,
                              (Om) => Om.type === "thinking" || Om.type === "redacted_thinking",
                            );
                        }
                        G_ = {
                          messageIndex: index_2,
                          indexInMessage: 0,
                          thinkingIndex,
                          messageId: id,
                        };
                      } else {
                        ql = stripAllThinking(ql);
                        G_ = "all";
                      }
                    }
                  }
                } catch (error) {
                  logError(toError(error));
                  ql = stripAdvisorBlocks(Xl);
                  G_ = undefined;
                }
              messagesForAPI_2 = ch(ql, "error_recovery");
              y5n();
              if (Nf) {
                Yh = true;
                if (G_ !== undefined) FLe(G_);
              }
              logForDebugging(
                reduced === 0
                  ? "[advisor] the server could not process an advisor result sent earlier in this conversation; nothing to remove, retrying as sent."
                  : `[advisor] the server could not process an advisor result sent earlier in this conversation; retrying with the advisor blocks removed from ${reduced} message(s)${G_ === "all" ? " and all thinking removed" : G_ !== undefined ? " and the thinking after them removed" : ""}${Nf ? "; recorded, so later requests leave them out too." : "; not recorded, so the next request sends them again."}`,
                {
                  level: "warn",
                },
              );
              logEvent("tengu_advisor_strip_retry", {
                query_source: agentTypeForTelemetry(options.querySource),
                strip_recorded: Nf,
                stripped_message_count: reduced,
                thinking_also_stripped: G_ !== undefined,
              });
              return "retry:advisor-strip";
            }
            let ea = Ugt(Fd, "stream");
            if (ea !== undefined) return ea;
            let streamWatchdogEnabled = ILe(Fd);
            if (streamWatchdogEnabled !== undefined) return streamWatchdogEnabled;
            let foundryRetryDirective = getFoundryRetryDirective(Fd, options.model, options.querySource);
            if (foundryRetryDirective === FAIL_FOUNDRY_PURPOSE_REQUEST) return;
            if (foundryRetryDirective !== null) return foundryRetryDirective;
            let Mg = Zgt(Fd);
            if (Mg !== null) return Mg;
            {
              let mediaErrorFromApiError = getMediaErrorFromApiError(Fd);
              if (mediaErrorFromApiError) {
                let ql = Fd instanceof Error ? Fd.message : String(Fd);
                let Ep = isBase64ImageBlock(messagesForAPI_2, ql);
                if (Ep !== messagesForAPI_2) {
                  messagesForAPI_2 = ch(Ep, "error_recovery");
                  w3.set(mediaErrorFromApiError.kind, ql);
                  notifyMediaStripped(options, mediaErrorFromApiError.kind, ql);
                  logEvent("tengu_media_block_strip_retry", {
                    kind: fromEnum(mediaErrorFromApiError.kind),
                    targeted: 1,
                  });
                  return "retry:media-strip-over-dimension-limit";
                }
                let cg =
                  mediaErrorFromApiError.messageIdx !== undefined
                    ? Eh(mediaErrorFromApiError.messageIdx)
                    : undefined;
                if (
                  mediaErrorFromApiError.messageIdx !== undefined &&
                  cg !== undefined &&
                  mediaErrorFromApiError.contentIdx !== undefined
                ) {
                  let G_ = `${mediaErrorFromApiError.messageIdx}.${mediaErrorFromApiError.contentIdx}`;
                  let ty = Agt.get(G_) ?? 0;
                  let nestedContentIdx =
                    mediaErrorFromApiError.nestedContentIdx !== undefined && ty < h5n
                      ? mediaErrorFromApiError.nestedContentIdx
                      : undefined;
                  let th = replaceUnsupportedMediaAt(
                    messagesForAPI_2,
                    {
                      messageIdx: cg,
                      contentIdx: mediaErrorFromApiError.contentIdx,
                      nestedContentIdx,
                      kind: mediaErrorFromApiError.kind,
                    },
                    ql,
                  );
                  if (th !== messagesForAPI_2) {
                    messagesForAPI_2 = ch(th, "error_recovery");
                    w3.set(mediaErrorFromApiError.kind, ql);
                    notifyMediaStripped(options, mediaErrorFromApiError.kind, ql);
                    if (nestedContentIdx !== undefined) Agt.set(G_, ty + 1);
                    let Fg = `messages.${mediaErrorFromApiError.messageIdx}.content.${mediaErrorFromApiError.contentIdx}`;
                    let DC =
                      nestedContentIdx !== undefined
                        ? `${Fg}.tool_result.content.${nestedContentIdx}`
                        : mediaErrorFromApiError.nestedContentIdx !== undefined
                          ? `${Fg}.tool_result.content.*`
                          : Fg;
                    logForDebugging(
                      `Removed unprocessable ${mediaErrorFromApiError.kind} at ${DC}; retrying.`,
                      {
                        level: "warn",
                      },
                    );
                    logEvent("tengu_media_block_strip_retry", {
                      kind: fromEnum(mediaErrorFromApiError.kind),
                      message_idx: mediaErrorFromApiError.messageIdx,
                      content_idx: mediaErrorFromApiError.contentIdx,
                      targeted: 1,
                    });
                    return `retry:media-strip:${mediaErrorFromApiError.kind}:${DC}`;
                  }
                }
                let Nf =
                  Cgt.value < Rgt
                    ? replaceLastUnsupportedMedia(messagesForAPI_2, mediaErrorFromApiError.kind, ql)
                    : undefined;
                if (Nf) {
                  Cgt.value++;
                  messagesForAPI_2 = ch(Nf.messages, "error_recovery");
                  w3.set(mediaErrorFromApiError.kind, ql);
                  notifyMediaStripped(options, mediaErrorFromApiError.kind, ql);
                  logForDebugging(
                    `Removed base64 ${mediaErrorFromApiError.kind} blocks from carrier ${Nf.carrierIdx} (API 400 had no usable path); retrying.`,
                    {
                      level: "warn",
                    },
                  );
                  logEvent("tengu_media_block_strip_retry", {
                    kind: fromEnum(mediaErrorFromApiError.kind),
                    targeted: 0,
                    carrier_idx: Nf.carrierIdx,
                  });
                  return `retry:media-strip-latest:${mediaErrorFromApiError.kind}:${Nf.carrierIdx}`;
                }
              }
            }
            if (hI && isCacheKeepaliveBetaRejected(Fd)) {
              hI = false;
              onKeepaliveHeaderRejected(conversation, limitsAccountEpoch, Hi);
              return "retry:cache-keepalive-beta";
            }
            let eh = iht(Fd);
            if (eh === "surface:resume-prefill") return;
            if (eh !== null) return eh;
            {
              let rejectedThinkingType = getRejectedThinkingType(Fd);
              if (rejectedThinkingType) {
                let ql = rejectedThinkingType === "enabled" ? "adaptive" : "enabled";
                setThinkingTypeOverride(options.model, ql);
                logForDebugging(
                  `[thinking] model rejected thinking.type=${rejectedThinkingType}; retrying with ${ql}. For Bedrock application-inference-profile ARNs with bearer-token auth, granting bedrock:GetInferenceProfile to the token avoids this round-trip.`,
                  {
                    level: "warn",
                  },
                );
                return "retry:thinking-type";
              }
            }
            let om = Jgt(Fd);
            if (om !== null) return om;
            let Ql = tht(Fd);
            if (Ql !== null) return Ql;
            let Nu = nht(Fd);
            if (Nu !== null) return Nu;
            let Qc = oht(Fd);
            if (Qc !== undefined) return Qc;
            D5(Fd);
            let W_ = rht(Fd);
            if (W_ !== null) return W_;
            let pm = NLe(Fd);
            if (pm !== null) return pm;
            {
              let Xl = dht(Fd);
              if (Xl !== undefined) {
                if (keptForeignSignatures && isInvalidThinkingSignatureError(Fd))
                  dropForeignThinkingKeep("rejected_healed");
                return Xl;
              }
            }
            if (!options.resumeIncompleteThinking && isInvalidThinkingSignatureError(Fd)) {
              let Xl = 0;
              let ql = 0;
              for (let cg of messagesForAPI_2) {
                if (cg.type !== "assistant" || !Array.isArray(cg.message.content)) continue;
                for (let Nf of cg.message.content)
                  if (Nf.type === "redacted_thinking") Xl++;
                  else if (Nf.type === "thinking")
                    if ("signature" in Nf && Nf.signature) Xl++;
                    else ql++;
              }
              let Ep = stripAllThinking(messagesForAPI_2);
              if (Ep !== messagesForAPI_2) {
                messagesForAPI_2 = ch(Ep, "error_recovery");
                FLe("all");
                if (keptForeignSignatures) dropForeignThinkingKeep("rejected_fell_back");
                logForDebugging(
                  "[thinking] server rejected a thinking block; stripping all thinking blocks and retrying.",
                  {
                    level: "warn",
                  },
                );
                logEvent("tengu_thinking_signature_strip_retry", {
                  query_source: agentTypeForTelemetry(options.querySource),
                  model: telemetrySafeModelName(options.model),
                  stripped_signed_count: Xl,
                  stripped_unsigned_count: ql,
                });
                return "retry:thinking-signature-strip";
              }
            }
            if (keptForeignSignatures && isInvalidThinkingSignatureError(Fd))
              dropForeignThinkingKeep("rejected_surfaced");
            {
              let Xl = jgt(Fd);
              if (Xl) return Xl;
            }
            {
              let Xl = LLe(Fd);
              if (Xl) return Xl;
            }
            {
              let Xl = Ngt(Fd);
              if (Xl !== undefined) return Xl;
            }
            {
              let Xl = await contextHintController?.onRequestError(Fd, messagesForAPI_2);
              if (Xl) {
                messagesForAPI_2 = ch(Xl.messages, "microcompact");
                yht(Xl.clearedIds, Xl.clearedContent);
                return "retry:context-hint";
              }
            }
            return (
              $gt(Fd) ??
              Hgt(Fd) ??
              i1(Fd, sP) ??
              Ogt(Fd, "stream") ??
              SI(Fd) ??
              a1(Fd) ??
              OLe(Fd) ??
              _Le(Fd) ??
              L5(Fd) ??
              Tae(Fd)
            );
          },
        },
      );
      let pr;
      do {
        pr = await generator.next();
        yield* $Le();
        if (!("controller" in pr.value)) yield pr.value;
      } while (!pr.done);
      stream = pr.value;
      qgt();
      Kgt();
      Vgt();
      Ygt();
      Xgt();
      N5();
      t1();
      Wgt();
      if (T3) {
        T3 = false;
        options.onRetryStatus?.(null);
      }
      for (let [Fd, od] of w3)
        yield createApiErrorMessage({
          ...buildMediaRemovedError(Fd, od),
          error: "invalid_request",
          errorDetails: od,
        });
      w3.clear();
      yield* cht();
      yield* uht();
      yield* Qgt();
      let clock_2 = k_ ? (k_._chunkTimes ?? undefined) : undefined;
      if (
        clock_2 === undefined &&
        k_ !== undefined &&
        getAPIProvider() === "bedrock" &&
        shouldUseBodyIdleWatchdog("bedrock")
      )
        logForDebugging(
          "wire-heartbeat: _chunkTimes absent on a Bedrock stream with the byte watchdog enabled \u2014 heartbeat side-channel unavailable for this stream (bedrock-sdk \u22650.32.0 eventstream\u2192SSE transcode drops it; also expected if the response was not vnd.amazon.eventstream, e.g. behind a header-rewriting proxy)",
        );
      let Os = clock.monotonicNow();
      Cm.length = 0;
      Iae = 0;
      vLe = undefined;
      v$ = 0;
      dg = undefined;
      A_.length = 0;
      $E = false;
      UT = false;
      D3 = false;
      MC.clear();
      Bae.clear();
      HLe.clear();
      E$ = undefined;
      b1 = false;
      Iu = EMPTY_USAGE;
      T1 = null;
      reason = null;
      complete = false;
      aP = "none";
      let La = false;
      Ux = false;
      E1 = false;
      let Vl = false;
      let anyBlockFinished = false;
      let nd = false;
      let Wd = null;
      let weakSet = new WeakSet();
      let weakMap = new WeakMap();
      let hf = false;
      let Kg = false;
      let cy = null;
      let jT = false;
      let pk = null;
      let Pc = 0;
      function* ey({ responseUnfinished }) {
        if (!Kg) return;
        let od = jT ? null : cy;
        Kg = false;
        cy = null;
        jT = false;
        let Zg =
          pk !== null
            ? {
                apiMessageId: pk,
              }
            : undefined;
        if (od !== null)
          yield {
            type: "stream_event",
            event: {
              type: "content_block_stop",
              index: od,
            },
            ...Zg,
          };
        yield {
          type: "stream_event",
          event: {
            type: "message_stop",
          },
          ...Zg,
          ...(responseUnfinished && pk !== null && Number.isSafeInteger(Pc)
            ? {
                abandonedBlocks: {
                  apiMessageId: pk,
                  fromBlockIndex: Pc,
                },
              }
            : undefined),
        };
      }
      let Ew = null;
      let Aw = 0;
      let VT = 0;
      let msToFirstEvent = null;
      let cP = null;
      let fP = null;
      let $I = 0;
      let HI = false;
      let CLAUDE_ENABLE_STREAM_WATCHDOG = env.CLAUDE_ENABLE_STREAM_WATCHDOG ?? true;
      let streamIdleTimeoutMs = getStreamIdleTimeoutMs();
      let OC = streamIdleTimeoutMs / 2;
      let streamStallMarginMs = getStreamStallMarginMs();
      let min = Math.min(
        getByteIdleTimeoutForProvider(getAPIProvider()),
        CLAUDE_ENABLE_STREAM_WATCHDOG ? streamIdleTimeoutMs : 1 / 0,
      );
      let min_2 = Math.min(MAX_STREAM_STALL_MS, min - streamStallMarginMs);
      let fh = false;
      let Ow;
      let _b = null;
      let streamWatchdogFiredAt = null;
      let streamIdleWarningTimer = null;
      let streamIdleTimer = null;
      let BI = false;
      L_();
      let hP = () => {
        if (options.querySource !== "sdk" && options.keepPartialMessageOnAbort !== true) return;
        if (D3) return;
        let Fd = A_[Cm.length];
        if (Fd?.type !== "text" || weakSet.has(Fd) || !Fd.text.trim() || !dg) return;
        return {
          message: {
            ...dg,
            content: normalizeContentFromAPI(
              [Fd],
              tools,
              options.agentId,
              {
                requestId: Al ?? undefined,
                messageId: dg.id,
              },
              options.storageV5,
            ),
          },
          apiBlockIndex: Cm.length,
          requestId: Al ?? undefined,
          requestRef,
          requestedModel: options.model,
          ...buildAttribution(
            options.querySource,
            options.spawnedBySkill,
            options.activeSkill,
            options.activeMcpServer,
            options.activeMcpTool,
          ),
          type: "assistant",
          uuid: randomUUID(),
          timestamp: new Date().toISOString(),
          isAbortedMidStream: true,
          ...undefined,
          ...(yS !== undefined && {
            effort: yS,
          }),
          perTurnEffort: EE,
          perTurnTiming: n$,
        };
      };
      let N3 = () => {
        if (E$ === undefined || UT) return;
        let Fd = E$;
        E$ = undefined;
        UT = true;
        return {
          type: "server_fallback",
          fromModel: Fd.fromModel,
          toModel: Fd.model,
          reason: Fd.reason,
          apiRefusalCategory: Fd.category,
          midStream: false,
          requestId: Al ?? null,
          refusedEffort: qx(),
          discardedMessages: [],
          retainedMessages: [],
          retainedText: "",
          finalStopReason: null,
        };
      };
      function* clearStreamIdleTimers() {
        C_("aborted", Al ?? null, null);
        let Fd = N3();
        if (Fd) yield Fd;
        let od = hP();
        if (od) yield od;
        if (E1)
          logEvent("tengu_advisor_tool_interrupted", {
            model: telemetrySafeModelName(options.model),
            advisor_model: telemetrySafeModelName(yn ?? "unknown"),
            query_source: agentTypeForTelemetry(options.querySource),
          });
      }
      let yP;
      try {
        let Fd = true;
        let STALL_THRESHOLD_MS = 30000;
        let Zg = 0;
        let events = fixGuardrailStrayText(stream, signal);
        let counter = {
          count: 0,
        };
        for await (let ea of withStreamHeartbeat(
          clock_2 !== undefined && isDeltaFoldEnabled()
            ? foldStreamDeltas(events, clock_2, counter, signal)
            : events,
          clock_2,
          STREAM_HEARTBEAT_MS,
          clock,
        )) {
          if (isPingStreamEvent(ea)) {
            Zg++;
            if (Zg <= MAX_PING_EVENTS_RESETTING_IDLE) L_();
            else if (!CLAUDE_ENABLE_STREAM_WATCHDOG || fh || Ow !== undefined) continue;
            yield {
              type: "stream_event",
              event: ea,
            };
            continue;
          }
          Zg = 0;
          L_();
          v$ += 1 + counter.count;
          counter.count = 0;
          msToFirstEvent ??= Math.round(clock.monotonicNow() - Uy);
          cP ??= ea.type;
          fP = ea.type;
          let now = clock.now();
          if (Ew !== null) {
            let Ql = now - Ew;
            if (Ql > STALL_THRESHOLD_MS) {
              Aw++;
              VT += Ql;
              logForDebugging(
                `Streaming stall detected: ${(Ql / 1000).toFixed(1)}s gap between events (stall #${Aw})`,
                {
                  level: "warn",
                },
              );
              logEvent("tengu_streaming_stall", {
                stall_duration_ms: Ql,
                stall_count: Aw,
                total_stall_time_ms: VT,
                event_type: fromEnum(normalizeStreamEventType(ea.type)),
                model: telemetrySafeModelName(options.model),
                request_id: traceValueOrUnknown(Al),
              });
            }
          }
          Ew = now;
          if (Fd) {
            OE();
            logForDebugging("Stream started - received first chunk");
            logForDebugging(`[API:timing] first byte after ${Math.round(clock.monotonicNow() - Uy)}ms`);
            queryCheckpoint("query_first_chunk_received");
            if (!options.agentId && Hi) headlessProfilerCheckpoint("first_chunk");
            if (isTopLevelMain) yP = openProfileStream();
            endQueryProfile();
            Fd = false;
          }
          let fallbackBlockStart = parseFallbackBlockStart(ea);
          let Mg = !fallbackBlockStart && isUnreadableFallbackBlock(ea);
          if (fallbackBlockStart || Mg) E1 = false;
          if (fallbackBlockStart) {
            HLe.add(fallbackBlockStart.index);
            A_[fallbackBlockStart.index] = fallbackNotification(fallbackBlockStart);
            let Ql = w$;
            logEvent("tengu_rotunda_pennant_materialized", {
              armed: options.serverRefusalFallback !== undefined,
              mode: fromEnum(Ql),
              block_index: fallbackBlockStart.index,
              non_streaming: false,
            });
            if (fallbackBlockStart.reason === "refusal")
              logApiRefusal({
                model: resolvedModel,
                requestId: Al || undefined,
                querySource: options.querySource,
                effort: CC,
                fastMode: fallbackActive,
                attempt: p_,
                attribution: buildAttribution(
                  options.querySource,
                  options.spawnedBySkill,
                  options.activeSkill,
                  options.activeMcpServer,
                  options.activeMcpTool,
                ),
                serverFallbackHop: true,
                agentContext: options.agentContext,
              });
            if (options.serverRefusalFallback === undefined) continue;
            if (isFallbackReason(fallbackBlockStart.reason)) $E = true;
            if (dg !== undefined)
              dg = {
                ...dg,
                model: fallbackBlockStart.model,
              };
            for (let Nu of MC.values()) Nu.message.model = fallbackBlockStart.model;
            if (MC.size === 0) E$ = fallbackBlockStart;
            else if (!isFallbackReason(fallbackBlockStart.reason)) {
              UT = true;
              yield {
                type: "server_fallback",
                fromModel: fallbackBlockStart.fromModel,
                toModel: fallbackBlockStart.model,
                reason: fallbackBlockStart.reason,
                apiRefusalCategory: fallbackBlockStart.category,
                midStream: true,
                requestId: Al ?? null,
                refusedEffort: qx(),
                discardedMessages: [],
                retainedMessages: [],
                retainedText: "",
                finalStopReason: null,
              };
            } else {
              UT = true;
              let Nu = [];
              for (let [pm, Xl] of MC)
                if (hasNonTextContent(Xl)) {
                  Nu.push(Xl);
                  MC.delete(pm);
                  delete A_[pm];
                }
              if (Nu.length > 0) {
                let pm = new Set(Nu);
                for (let idx = Cm.length - 1; idx >= 0; idx--) if (pm.has(Cm[idx])) Cm.splice(idx, 1);
                D3 = true;
              }
              let mapped = [...MC.entries()].sort((pm, Xl) => pm[0] - Xl[0]).map(([, pm]) => pm);
              let retainedText = mapped
                .map((pm) => pm.message.content.map((Xl) => (Xl.type === "text" ? Xl.text : "")).join(""))
                .join("");
              yield {
                type: "server_fallback",
                fromModel: fallbackBlockStart.fromModel,
                toModel: fallbackBlockStart.model,
                reason: fallbackBlockStart.reason,
                apiRefusalCategory: fallbackBlockStart.category,
                midStream: true,
                requestId: Al ?? null,
                refusedEffort: qx(),
                discardedMessages: Nu,
                retainedMessages: mapped,
                retainedText,
                finalStopReason: null,
              };
            }
            continue;
          }
          if (Mg) {
            let index = ea.index;
            Bae.add(index);
            D3 = true;
            logForDiagnosticsNoPII("warn", "cli_malformed_fallback_block");
            logEvent("tengu_rotunda_pennant_malformed", {
              block_index: index,
              non_streaming: false,
            });
            logFeatureSad("refusal_fallback", "malformed_fallback_block", {
              non_streaming: false,
            });
            continue;
          }
          if (ea.type === "content_block_stop" && Bae.has(ea.index)) continue;
          switch (ea.type) {
            case "message_start": {
              assertStreamPart(
                typeof ea.message === "object" && ea.message !== null,
                ea,
                lit_2("message_start_without_message"),
              );
              hf = true;
              Rae();
              sht();
              e1();
              dg = ea.message;
              if (dg !== undefined && "resumable" in dg) {
                let { resumable, ...pm } = dg;
                dg = pm;
              }
              Iae = Math.max(0, Math.round(clock.monotonicNow() - Uy));
              Iu = mRe(Iu, ea.message?.usage);
              if (ea.message?.model)
                recordServedModel(stripAnyVersatileSuffix(options.model), ea.message.model);
              b3 = ea.message.diagnostics?.cache_miss_reason ?? undefined;
              mht(ea.message);
              let Ql = ght(ea.message);
              let Nu = fht();
              if (Nu) yield Nu;
              let Qc = np();
              if (Qc) yield Qc;
              if (Ql) yield Ql;
              break;
            }
            case "content_block_start": {
              let Ql = typeof ea.content_block === "object" && ea.content_block !== null;
              if (!Ql) complete = false;
              assertStreamPart(Ql, ea, lit_2("content_block_start_without_content_block"));
              if (
                isRestartedBlock({
                  previous: A_[ea.index],
                  closedContentBlocks: weakSet,
                  started: ea.content_block,
                })
              ) {
                logEvent("tengu_streaming_error", {
                  error_type: lit_2("content_block_closed_start"),
                  part_type: fromEnum(ea.type),
                  part_index: blockIndexOf(ea),
                });
                throw new StreamMalformedEventError("closed");
              }
              switch (
                ((complete = false),
                (vLe ??= Math.max(0, Math.round(clock.monotonicNow() - Uy))),
                ea.content_block.type)
              ) {
                case "tool_use":
                  ea.content_block.name = internalName(ea.content_block.name);
                  A_[ea.index] = {
                    ...ea.content_block,
                    input: "",
                  };
                  break;
                case "server_tool_use":
                  A_[ea.index] = {
                    ...ea.content_block,
                    input: "",
                  };
                  if (ea.content_block.name === ADVISOR_TOOL_NAME) {
                    E1 = true;
                    logForDebugging("[AdvisorTool] Advisor tool called");
                    logEvent("tengu_advisor_tool_call", {
                      model: telemetrySafeModelName(options.model),
                      advisor_model: telemetrySafeModelName(yn ?? "unknown"),
                      query_source: agentTypeForTelemetry(options.querySource),
                    });
                  }
                  break;
                case "text":
                  A_[ea.index] = {
                    ...ea.content_block,
                    text: "",
                  };
                  break;
                case "thinking": {
                  let Nu = {
                    ...ea.content_block,
                    thinking: "",
                    signature: "",
                  };
                  A_[ea.index] = Nu;
                  recordMonotonicTime(weakMap, Nu, clock);
                  break;
                }
                default:
                  A_[ea.index] = {
                    ...ea.content_block,
                  };
                  if (ea.content_block.type === "advisor_tool_result") {
                    E1 = false;
                    logForDebugging("[AdvisorTool] Advisor tool result received");
                    let advisorToolError = parseAdvisorToolError(ea.content_block);
                    if (advisorToolError !== undefined) {
                      logForDebugging(`[AdvisorTool] Advisor tool result error: ${advisorToolError}`);
                      logEvent("tengu_advisor_tool_error", {
                        model: telemetrySafeModelName(options.model),
                        advisor_model: telemetrySafeModelName(yn ?? "unknown"),
                        error_code: fromEnum(advisorToolError),
                        query_source: agentTypeForTelemetry(options.querySource),
                      });
                    } else
                      logEvent("tengu_advisor_tool_result", {
                        model: telemetrySafeModelName(options.model),
                        advisor_model: telemetrySafeModelName(yn ?? "unknown"),
                        query_source: agentTypeForTelemetry(options.querySource),
                        stop_reason: fromEnumOpt(parseAdvisorResult(ea.content_block)) ?? lit_2("none"),
                      });
                  }
                  break;
              }
              Wd = ea.index;
              if (
                ea.content_block.type !== "thinking" &&
                ea.content_block.type !== "redacted_thinking" &&
                !isFallbackMessage(ea.content_block)
              )
                nd = true;
              break;
            }
            case "content_block_delta": {
              let Ql = A_[ea.index];
              let delta = ea.delta;
              if (!Ql || !weakSet.has(Ql)) complete = false;
              if (!Ql || weakSet.has(Ql)) {
                logEvent("tengu_streaming_error", {
                  error_type: Ql
                    ? lit_2("content_block_closed_delta")
                    : lit_2("content_block_not_found_delta"),
                  part_type: fromEnum(ea.type),
                  part_index: blockIndexOf(ea),
                });
                throw new StreamMalformedEventError(Ql ? "closed" : "unstarted");
              }
              switch (
                (assertStreamPart(
                  typeof delta === "object" && delta !== null,
                  ea,
                  lit_2("content_block_delta_without_delta"),
                ),
                assertStreamPart(
                  typeof delta.type === "string",
                  ea,
                  lit_2("content_block_delta_without_delta_type"),
                ),
                delta.type)
              ) {
                case "citations_delta":
                  if (Ql.type !== "text") break;
                  assertStreamPart(
                    typeof delta.citation === "object" && delta.citation !== null,
                    ea,
                    lit_2("citations_delta_without_citation"),
                  );
                  Ql.citations = [...(Ql.citations ?? []), delta.citation];
                  break;
                case "input_json_delta":
                  if (Ql.type !== "tool_use" && Ql.type !== "server_tool_use") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_type_mismatch_input_json"),
                      expected_type: lit_2("tool_use"),
                      actual_type: fromEnum(Ql.type),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  if (typeof Ql.input !== "string") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_input_not_string"),
                      input_type: fromEnum(typeof Ql.input),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  assertStreamPart(
                    typeof delta.partial_json === "string",
                    ea,
                    lit_2("input_json_delta_without_partial_json"),
                  );
                  Ql.input += delta.partial_json;
                  break;
                case "text_delta":
                  if (Ql.type !== "text") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_type_mismatch_text"),
                      expected_type: lit_2("text"),
                      actual_type: fromEnum(Ql.type),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  assertStreamPart(typeof delta.text === "string", ea, lit_2("text_delta_without_text"));
                  Ql.text += delta.text;
                  break;
                case "signature_delta":
                  if (Ql.type !== "thinking") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_type_mismatch_thinking_signature"),
                      expected_type: lit_2("thinking"),
                      actual_type: fromEnum(Ql.type),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  assertStreamPart(
                    typeof delta.signature === "string",
                    ea,
                    lit_2("signature_delta_without_signature"),
                  );
                  Ql.signature = delta.signature;
                  break;
                case "thinking_delta":
                  if (Ql.type === "redacted_thinking") break;
                  if (Ql.type !== "thinking") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_type_mismatch_thinking_delta"),
                      expected_type: lit_2("thinking"),
                      actual_type: fromEnum(Ql.type),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  assertStreamPart(
                    typeof delta.thinking === "string",
                    ea,
                    lit_2("thinking_delta_without_thinking"),
                  );
                  Ql.thinking += delta.thinking;
                  break;
              }
              break;
            }
            case "content_block_stop": {
              let Ql = A_[ea.index];
              if (!Ql || !weakSet.has(Ql)) complete = false;
              if (!Ql || weakSet.has(Ql)) {
                logEvent("tengu_streaming_error", {
                  error_type: Ql ? lit_2("content_block_closed_stop") : lit_2("content_block_not_found_stop"),
                  part_type: fromEnum(ea.type),
                  part_index: blockIndexOf(ea),
                });
                throw new StreamMalformedEventError(Ql ? "closed" : "unstarted");
              }
              Wd = null;
              if (!dg) {
                logEvent("tengu_streaming_error", {
                  error_type: lit_2("partial_message_not_found"),
                  part_type: fromEnum(ea.type),
                });
                throw Error("Message not found");
              }
              let { content, batchToolUses } = isBatchToolsUse(
                normalizeContentFromAPI(
                  [Ql],
                  tools,
                  options.agentId,
                  {
                    requestId: Al ?? undefined,
                    messageId: dg.id,
                  },
                  options.storageV5,
                ),
                tools,
                (Nf, G_) => normalizeToolInput_2(Nf, G_, options.agentId, options.storageV5),
              );
              let W_ = aI ? captureWireToolInputs([Ql]) : undefined;
              HI ||= W_?.degraded === true;
              let inputs = W_?.inputs;
              let Xl = countToolCallsSince_4([Ql], inputs);
              let ql = elapsedSinceMs(weakMap, Ql, clock);
              let Ep = THINKING_BARE_WIDTH(Ql, z5);
              let cg = {
                message: {
                  ...dg,
                  content,
                },
                ...(ql !== undefined && {
                  thinkingDurationMs: ql,
                }),
                ...(Ep !== undefined && {
                  thinkingDisplay: Ep,
                }),
                ...(batchToolUses.length > 0 && {
                  batchToolUses,
                }),
                ...(inputs !== undefined && {
                  wireToolInputs: inputs,
                }),
                ...(Xl !== undefined && {
                  wireIngestContext: Xl,
                }),
                ...(Xl !== undefined && {
                  wireIngestContext: Xl,
                }),
                ...(Qh !== undefined && classifierResultPayload(Qh)),
                apiBlockIndex: ea.index,
                requestId: Al ?? undefined,
                requestRef,
                requestedModel: options.model,
                ...buildAttribution(
                  options.querySource,
                  options.spawnedBySkill,
                  options.activeSkill,
                  options.activeMcpServer,
                  options.activeMcpTool,
                ),
                type: "assistant",
                uuid: randomUUID(),
                timestamp: new Date().toISOString(),
                ...false,
                ...(yn && {
                  advisorModel: yn,
                }),
                ...(yS !== undefined && {
                  effort: yS,
                }),
                perTurnEffort: EE,
                perTurnTiming: n$,
                ...{},
              };
              noopNotice(conversation, cg);
              Cm.push(cg);
              $I++;
              MC.set(ea.index, cg);
              Pc = Math.max(Pc, Number.isSafeInteger(ea.index) && ea.index >= 0 ? ea.index + 1 : Number.NaN);
              weakSet.add(Ql);
              if (cg.message.content.some((Nf) => !isFallbackMessage(Nf))) {
                anyBlockFinished = true;
                if (
                  cg.message.content.some(
                    (Nf) =>
                      Nf.type !== "thinking" && Nf.type !== "redacted_thinking" && !isFallbackMessage(Nf),
                  )
                )
                  nd = true;
              }
              yield cg;
              break;
            }
            case "message_delta": {
              Iu = mRe(Iu, ea.usage);
              T1 = ea.context_management ?? T1;
              assertStreamPart(
                typeof ea.delta === "object" && ea.delta !== null,
                ea,
                lit_2("message_delta_without_delta"),
              );
              if (
                Qh !== undefined &&
                typeof ea.delta === "object" &&
                ea.delta !== null &&
                "safeguard_results" in ea.delta
              )
                MI(Qh, ea.delta, A_);
              let Ql = options.serverRefusalFallback !== undefined ? parseUsageIterations(Iu) : undefined;
              if (Ql?.servedFallbackModel !== undefined) {
                $E = true;
                Iu = $jo(Iu, ea.usage);
              }
              let fallbackCreditToken = readFallbackCreditToken(ea.delta.stop_details);
              {
                let stopDetails = ea.delta.stop_details;
                if (stopDetails && "fallback_credit_token" in stopDetails)
                  delete stopDetails.fallback_credit_token;
              }
              if (fallbackCreditToken !== undefined && !b1) {
                b1 = true;
                logEvent("tengu_fallback_credit_minted", {
                  request_id: sanitizeMarkName(Al),
                  model: telemetrySafeModelName(options.model),
                  fallback_target_model: telemetrySafeModelName(
                    options.refusalFallbackModel ??
                      (options.serverRefusalFallback !== undefined && !$E
                        ? options.serverRefusalFallback.model
                        : undefined),
                  ),
                  token_length: fallbackCreditToken.length,
                  input_tokens: Iu.input_tokens,
                  output_tokens: Iu.output_tokens,
                  cache_read_input_tokens: Iu.cache_read_input_tokens,
                  cache_creation_input_tokens: Iu.cache_creation_input_tokens,
                  cache_creation_5m_input_tokens: Iu.cache_creation?.ephemeral_5m_input_tokens ?? 0,
                  cache_creation_1h_input_tokens: Iu.cache_creation?.ephemeral_1h_input_tokens ?? 0,
                  service_tier: fromEnumOpt(Iu.service_tier),
                  speed: fromEnumOpt(Iu.speed),
                  query_source: agentTypeForTelemetry(options.querySource),
                  ...(options.queryTracking && {
                    query_chain_id: sanitizeMarkName(options.queryTracking.chainId),
                    query_depth: options.queryTracking.depth,
                  }),
                });
              }
              let stopReason = typeof ea.delta.stop_reason === "string" ? ea.delta.stop_reason : null;
              if (stopReason !== null) {
                reason = stopReason;
                complete = true;
              }
              let delta = ea.delta;
              if (delta.diagnostics?.cache_miss_reason) b3 = delta.diagnostics.cache_miss_reason;
              let pm = getResumableFlag(ea.delta) ?? getResumableFlag(ea);
              let Xl = m$ && T1 ? addClientEstimatedClearedTokens(T1, EI?.edit, HS) : null;
              for (let msg of Cm) {
                msg.message.usage = Iu;
                msg.message.stop_reason = reason;
                if (stopReason !== null || reason === null)
                  msg.message.stop_details = ea.delta.stop_details ?? null;
                if (Xl) msg.message.context_management = Xl;
                if (pm !== undefined) msg.message.resumable = pm;
              }
              if (reason !== null && aP !== "credited") {
                aP = "credited";
                let servedFallbackModel = Ql?.servedFallbackModel;
                let pp = Ql !== undefined && servedFallbackModel !== undefined;
                let Om = pp
                  ? fallbackMessagesCost(
                      Ql.entries,
                      {
                        speed: Iu.speed,
                        inferenceGeo: Iu.inference_geo,
                        serverToolUse: Iu.server_tool_use,
                      },
                      reason,
                    )
                  : calculateUSDCost(resolvedModel, Iu);
                let Dy = pp
                  ? preferSameModel(options.serverRefusalFallback?.model, servedFallbackModel)
                  : options.model;
                Dae += addToTotalSessionCost(
                  Om,
                  Iu,
                  Dy,
                  options.querySource,
                  CC,
                  options.spawnedBySkill,
                  options.activeSkill,
                  options.activeMcpServer,
                  options.activeMcpTool,
                );
              } else if (aP === "none") aP = "pending";
              if (stopReason === "refusal" && !La) {
                La = true;
                logApiRefusal({
                  model: resolvedModel,
                  requestId: Al || undefined,
                  querySource: options.querySource,
                  effort: CC,
                  fastMode: fallbackActive,
                  attempt: p_,
                  attribution: buildAttribution(
                    options.querySource,
                    options.spawnedBySkill,
                    options.activeSkill,
                    options.activeMcpServer,
                    options.activeMcpTool,
                  ),
                  serverFallbackHop: false,
                  stopDetails: ea.delta.stop_details ?? null,
                  agentContext: options.agentContext,
                });
              }
              if (options.serverRefusalFallback !== undefined) {
                let Hf = E$;
                E$ = undefined;
                if (Hf !== undefined) {
                  if (!UT) {
                    UT = true;
                    yield {
                      type: "server_fallback",
                      fromModel: Hf.fromModel,
                      toModel: Hf.model,
                      reason: Hf.reason,
                      apiRefusalCategory: Hf.category,
                      midStream: false,
                      requestId: Al ?? null,
                      refusedEffort: qx(),
                      discardedMessages: [],
                      retainedMessages: [],
                      retainedText: "",
                      finalStopReason: reason,
                    };
                  }
                } else if (!UT && Ql?.servedFallbackModel !== undefined) {
                  UT = true;
                  yield {
                    type: "server_fallback",
                    fromModel: options.model,
                    toModel: Ql.servedFallbackModel,
                    reason: "sticky",
                    apiRefusalCategory: null,
                    midStream: false,
                    requestId: Al ?? null,
                    refusedEffort: qx(),
                    discardedMessages: [],
                    retainedMessages: [],
                    retainedText: "",
                    finalStopReason: reason,
                  };
                }
              }
              let ql =
                options.refusalFallbackModel ??
                (options.serverRefusalFallback !== undefined && !$E
                  ? options.serverRefusalFallback.model
                  : undefined);
              let Ep = options.refusalFallbackModelLane === "silent";
              let refusalFallbackCascadeHop = options.refusalFallbackCascadeHop;
              let Nf =
                stopReason === "refusal" && ql !== undefined && !Ep && refusalFallbackCascadeHop === undefined
                  ? resolveRefusalFallbackRoute({
                      originalModelCanonical: getCanonicalName(options.model),
                      armedFallbackModel: ql,
                      apiRefusalCategory: ea.delta.stop_details?.category ?? null,
                      armedTargetIsRefusingModel: isSameModel(options.model, ql),
                      resolveTarget: (mappedTarget) =>
                        pickFallbackModel({
                          mappedTarget,
                          armedFallbackModel: ql,
                          refusingModel: options.model,
                          triedModels: [canonicalModelKey(options.model)],
                        }),
                      routesOverride: noopDialogHost(),
                    })
                  : undefined;
              let G_ = Nf !== undefined ? Nf.model : ql;
              if (Nf !== undefined)
                logFallbackRouteOutcome({
                  route: Nf,
                  model: options.model,
                  armedFallbackModel: ql,
                  apiRefusalCategory: ea.delta.stop_details?.category,
                  requestId: Al,
                });
              let ty =
                Nf?.matched === "none" &&
                ea.delta.stop_details?.category === "bio" &&
                !hasRefusalFallbackOccurred();
              let fp =
                stopReason === "refusal" && (ql === undefined || ty)
                  ? options.refusalFallbackSilentRearm?.(
                      ty,
                      ea.delta.stop_details?.category ?? null,
                      hasTenderQuiltHeader(k_?.headers),
                    )
                  : undefined;
              let th = G_ ?? fp;
              if (stopReason === "refusal" && th !== undefined) {
                DLe();
                k3 = true;
                yield {
                  type: "fallback_request",
                  trigger: "refusal",
                  originalModel: options.model,
                  fallbackModel: th,
                  requestId: Al ?? null,
                  refusedEffort: qx(),
                  apiRefusalCategory: ea.delta.stop_details?.category ?? null,
                  apiRefusalExplanation: ea.delta.stop_details?.explanation ?? null,
                  creditCode: fallbackCreditToken ?? null,
                  mintedStateless: !c1,
                  ...(fp !== undefined && {
                    silentArmAtTrigger: true,
                  }),
                  ...describeFallbackRoute(Nf, refusalFallbackCascadeHop),
                };
                return;
              }
              let refusalMessage = getRefusalMessage(
                stopReason,
                ea.delta.stop_details,
                Al,
                $E ? (Ql?.servedFallbackModel ?? dg?.model ?? options.model) : options.model,
                dg?.id,
              );
              if (refusalMessage) {
                let Hf = hasRefusalFallbackOccurred() || getRefusalFallbackModelLatch() !== undefined;
                if (
                  ql !== undefined ||
                  options.refusalFallbackModel !== undefined ||
                  (hasRefusalFallbackTarget(options.model) && isRefusalFallbackEnabled()) ||
                  hasFallbackLatch() ||
                  Hf
                )
                  logFeatureBad(
                    "refusal_fallback",
                    Nf?.matched === "none"
                      ? "route_declined"
                      : $E
                        ? "server_chain_exhausted"
                        : Hf
                          ? "client_chain_exhausted"
                          : hasRefusalFallbackTarget(options.model) && isSwitchModelsOnFlagDisabled()
                            ? "disabled_by_config"
                            : "not_armed",
                    {
                      convolute_arcades: hasConvoluteArcadesFlag(),
                      arm_source: fromEnum(getFallbackLatchKind()),
                      armed: ql !== undefined,
                      model_scope: fromEnum(classifyFallbackOrigin(options.model)),
                    },
                  );
                yield {
                  type: "refusal_no_fallback",
                  originalModel: options.model,
                  requestId: Al ?? null,
                  apiRefusalCategory: ea.delta.stop_details?.category ?? null,
                  apiRefusalExplanation: ea.delta.stop_details?.explanation ?? null,
                };
                yield refusalMessage;
              }
              let maxTokensStopMessage = getMaxTokensStopMessage(stopReason, BT, Iu.output_tokens);
              if (maxTokensStopMessage !== undefined) yield maxTokensStopMessage;
              break;
            }
            case "message_stop":
              hf = false;
              if (Qh !== undefined) bLe(settleServerNoResult(Qh));
              if (HI) logWireToolInputParseFailure();
              if (aP === "pending") lP();
              C_("stream_completed", Al ?? null, Iu);
              break;
          }
          if (ea.type === "content_block_stop" && HLe.has(ea.index)) continue;
          Vl = true;
          let costUSDForPart = thinkingStartTime(ea, z5);
          let om = Kg || ea.type === "message_start";
          if (ea.type === "message_start") {
            Kg = true;
            cy = null;
            jT = false;
            pk = typeof ea.message.id === "string" && ea.message.id !== "" ? ea.message.id : null;
          } else if (ea.type === "content_block_start") {
            cy = ea.index;
            jT = TOOL_USE_BLOCK_TYPES.has(ea.content_block.type);
          } else if (ea.type === "content_block_stop") {
            cy = null;
            jT = false;
          } else if (ea.type === "message_stop") {
            Kg = false;
            cy = null;
            jT = false;
          }
          yield {
            type: "stream_event",
            event: ea,
            ...(ea.type === "message_start"
              ? {
                  ttftMs: Iae,
                  ...(yS !== undefined && {
                    sentEffort: yS,
                  }),
                  ...(options.turnEffort !== undefined && {
                    turnEffort: options.turnEffort,
                  }),
                  ...(_3
                    ? {
                        requestSentAtMs: _3,
                      }
                    : undefined),
                  ...(ELe
                    ? {
                        requestSentWallMs: ELe,
                      }
                    : undefined),
                }
              : undefined),
            ...(costUSDForPart !== undefined
              ? {
                  thinkingDisplay: costUSDForPart,
                }
              : undefined),
            ...(om && pk !== null
              ? {
                  apiMessageId: pk,
                }
              : undefined),
          };
        }
        D1();
        yP?.(v$, clock_2?.chunks);
        if (signal.aborted) {
          yield* clearStreamIdleTimers();
          return;
        }
        if (fh) {
          let exitDelayMs = _b !== null ? Math.round(clock.monotonicNow() - _b) : -1;
          logForDiagnosticsNoPII("info", "cli_stream_loop_exited_after_watchdog_clean");
          logEvent("tengu_stream_loop_exited_after_watchdog", {
            request_id: traceValueOrUnknown(Al),
            exit_delay_ms: exitDelayMs,
            exit_path: lit_2("clean"),
            model: telemetrySafeModelName(options.model),
          });
          _b = null;
          throw Error("Stream idle timeout - no chunks received");
        }
        if (Ow !== undefined) throw Ow;
        if (hf && Wd !== null) {
          logForDebugging(
            `Stream ended cleanly inside open block ${Wd} (stop_reason=${reason}) \u2014 treating as a dropped connection`,
            {
              level: "error",
            },
          );
          throw new StreamTruncatedError();
        }
        if (!dg || (Cm.length === 0 && !reason)) {
          logForDebugging(
            !dg
              ? "Stream completed without receiving message_start event - triggering non-streaming fallback"
              : "Stream completed with message_start but no content blocks completed - triggering non-streaming fallback",
            {
              level: "error",
            },
          );
          logEvent("tengu_stream_no_events", {
            model: telemetrySafeModelName(options.model),
            request_id: traceValueOrUnknown(Al),
            ...responseDiagnosticFields(undefined, nk),
            ms_since_request: Math.round(clock.monotonicNow() - Uy),
          });
          throw new StreamNoEventsError();
        }
        if (hf && !(reason !== null && complete)) {
          logForDebugging(
            `Stream ended cleanly mid-response (stop_reason=${reason}, terminal=${complete}) \u2014 treating as a dropped connection`,
            {
              level: "error",
            },
          );
          throw new StreamTruncatedError();
        }
        try {
          let ea = streamFallbackWarning();
          let j_ = ea.hasFired("stream_text_delivery_bad");
          let vc = ea.hasFired("stream_text_delivery_ok");
          if (reason !== null && !D3 && (!j_ || !vc)) {
            if (!j_)
              for (let [Mg, eh] of A_.entries()) {
                if (!eh || eh.type !== "text") continue;
                if (eh.text.trim().length > 0 && !MC.has(Mg) && !Bae.has(Mg)) {
                  ea.markFired("stream_text_delivery_bad");
                  logFeatureBad("api_stream_text_delivery", "text_block_unyielded", {
                    had_tool_use: A_.some((om) => om?.type === "tool_use"),
                    dropped_block_index: Mg,
                  });
                  break;
                }
              }
            if (!vc) {
              let any = A_.some((om, Ql) => om?.type === "text" && om.text.trim().length > 0 && MC.has(Ql));
              let any_2 = A_.some((om, Ql) => om?.type === "tool_use" && MC.has(Ql));
              if (any && any_2) {
                ea.markFired("stream_text_delivery_ok");
                logFeatureOk("api_stream_text_delivery");
              }
            }
          }
          if (reason !== null) Ggt(Iu);
          zgt(Iu);
        } catch {}
        if (Aw > 0) {
          logForDebugging(
            `Streaming completed with ${Aw} stall(s), total stall time: ${(VT / 1000).toFixed(1)}s`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_streaming_stall_summary", {
            stall_count: Aw,
            total_stall_time_ms: VT,
            model: telemetrySafeModelName(options.model),
            request_id: traceValueOrUnknown(Al),
          });
        }
        recordIdleClearingServerReport({
          returnAfterIdle: m$ ? EI?.returnAfterIdle : undefined,
          contextManagement: T1,
          usage: Iu,
          querySource: options.querySource,
          agentId: options.agentId,
        });
        checkResponseForCacheBreak(
          options.querySource,
          Iu.cache_read_input_tokens,
          Iu.cache_creation_input_tokens,
          messages,
          options.agentId,
          Al,
          nt,
          Hi,
        );
        let B_ = k_;
        if (B_) {
          recordLowPriorityServed(_S, bS);
          extractGraceStatusFromHeaders(
            B_.headers,
            classifyQuerySource(options.querySource) !== "auxiliary",
            bS,
            limitsAccountEpoch,
          );
          let ea =
            (has1mSuffix_2(options.model) || modelHasNative1MContext(options.model)) &&
            Iu.input_tokens + Iu.cache_read_input_tokens + Iu.cache_creation_input_tokens >
              SECONDARY_CONTEXT_WINDOW;
          let quotaStatusFromHeaders = extractQuotaStatusFromHeaders(
            B_.headers,
            options.model,
            ea,
            bS,
            limitsAccountEpoch,
            options.storageV5,
          );
          if (quotaStatusFromHeaders && options.queryTracking) {
            options.queryTracking.answeredQuerySource = options.querySource;
            options.queryTracking.billedToUsageCredits = quotaStatusFromHeaders.overageInUse === true;
            options.queryTracking.longContextBilled = ea;
          }
          refetchStaleClientData(B_.headers, options, fallbackActive);
          ALe = B_.headers;
        }
      } catch (streamingError) {
        let od =
          Ow !== undefined && !fh && !signal.aborted && streamingError instanceof APIUserAbortError
            ? Ow
            : streamingError;
        D1();
        yP?.(v$, clock_2?.chunks);
        OE();
        {
          let pp = N3();
          if (pp) yield pp;
        }
        if (!fh && od instanceof StreamIdleTimeoutError) {
          fh = true;
          _b = clock.monotonicNow();
          logForDebugging(`Streaming idle timeout (byte-level): ${od.message}, aborting stream`, {
            level: "error",
          });
          logForDiagnosticsNoPII("error", "cli_streaming_idle_timeout");
          logEvent("tengu_streaming_idle_timeout", {
            model: telemetrySafeModelName(options.model),
            request_id: traceValueOrUnknown(Al),
            timeout_ms: od.idleMs,
            tier: lit_2("byte"),
            bytes_received_before_stall: od.bytesReceived,
            time_to_first_byte_ms: od.ttfbMs,
            body_read_pending: od.bodyReadPending,
            slept_ms: od.sleptMs,
            cf_ray: sanitizeMarkName(od.cfRay),
          });
        }
        if (fh && _b !== null) {
          let exitDelayMs = Math.round(clock.monotonicNow() - _b);
          logForDiagnosticsNoPII("info", "cli_stream_loop_exited_after_watchdog_error");
          logEvent("tengu_stream_loop_exited_after_watchdog", {
            request_id: traceValueOrUnknown(Al),
            exit_delay_ms: exitDelayMs,
            exit_path: lit_2("error"),
            error_name:
              od instanceof Error ? (sanitizedErrorNameForTelemetry(od) ?? lit_2("Error")) : lit_2("unknown"),
            model: telemetrySafeModelName(options.model),
          });
        }
        let Zg = {
          events_received: v$,
          ms_to_first_event: msToFirstEvent,
          ms_since_last_event: Ew === null ? null : clock.now() - Ew,
        };
        let Iy = (fallbackCause, Om) =>
          logForDiagnosticsNoPII("warn", "cli_stream_failed", () => ({
            ...classifyApiErrorKind(Om, classifyAPIError(Om), nk),
            fallback_cause: fallbackCause,
            watchdog_fired: fh,
            slept_ms:
              od instanceof StreamIdleTimeoutError || od instanceof StreamSuspendedError ? od.sleptMs : null,
            client_request_id: sanitizeMarkName(Ah) ?? null,
            model: telemetrySafeModelName(options.model) ?? null,
            stream: {
              ...Zg,
              first_event_type: cP === null ? null : normalizeStreamEventType(cP),
              last_event_type: fP === null ? null : normalizeStreamEventType(fP),
              message_envelope_open: hf,
              stop_reason_received: reason !== null,
              content_blocks_completed: $I,
              any_event_yielded: Vl,
              ms_since_request: Math.round(clock.monotonicNow() - Uy),
              ms_to_headers: nk?.latencyMs ?? null,
              stalls_over_30s: Aw,
              stall_ms_total: VT,
            },
            route: connectionSetupFacts(),
          }));
        if (od instanceof APIUserAbortError) {
          if (signal.aborted) {
            yield* clearStreamIdleTimers();
            logForDebugging(`Streaming aborted by user: ${errorMessage(od)}`);
            throw od;
          } else if (!fh) {
            logForDebugging(`Streaming timeout (SDK abort): ${od.message}`, {
              level: "error",
            });
            let pp = new APIConnectionTimeoutError({
              message: "Request timed out",
            });
            Iy("sdk_timeout", pp);
            throw pp;
          }
        }
        let connectionErrorDetails = extractConnectionErrorDetails(od);
        let B_ = connectionErrorDetails !== null && TRANSIENT_SOCKET_CODES.has(connectionErrorDetails.code);
        let ea =
          connectionErrorDetails !== null && (B_ || UNREACHABLE_ERROR_CODES.has(connectionErrorDetails.code));
        let isContextHintSse = contextHintController?.classifyStreamError(od) ?? false;
        let vc = od instanceof StreamMalformedEventError || od instanceof SyntaxError;
        let Mg = od instanceof StreamMalformedEventError && od.blockState === "unstarted";
        let eh = Mg
          ? "event referenced an unstarted content block"
          : od instanceof StreamMalformedEventError && od.blockState === "closed"
            ? "event referenced an already-closed content block"
            : "event could not be read";
        let fallbackCause = classifyStreamError({
          connDetails: connectionErrorDetails,
          isStaleConnection: B_,
          isContextHintSse,
          streamIdleAborted: fh,
          noEvents: od instanceof StreamNoEventsError,
          malformedStream: od instanceof StreamMalformedEventError,
        });
        let Ql = sanitizedErrorNameForTelemetry(od) ?? null;
        let Nu = sanitizedConnectionCodeForTelemetry(connectionErrorDetails?.code) ?? null;
        let errorName = od instanceof Error ? (Ql ?? lit_2("none")) : fromEnum(typeof od);
        let errorConstructor =
          od instanceof Error
            ? (sanitizedClassNameForTelemetry(od.constructor?.name) ?? lit_2("none"))
            : lit_2("none");
        let errorCode = Nu ?? lit_2("none");
        let Xl =
          ((getFeatureValue_CACHED_MAY_BE_STALE("tengu_watchdog_skip_nonstreaming_fallback", false) ||
            env.CLAUDE_CODE_REMOTE) &&
            fh) ||
          env.CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK ||
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_disable_streaming_to_non_streaming_fallback", false);
        if (fh)
          Lae = Error(
            Cm.length > 0
              ? "Stream idle timeout - partial response received"
              : "Stream idle timeout - no chunks received",
          );
        let ql = fh ? Lae : od;
        let error =
          ql instanceof Error ? (sanitizedErrorNameForTelemetry(ql) ?? lit_2("Error")) : fromEnum(typeof ql);
        Iy(fallbackCause, od instanceof APIUserAbortError ? ql : od);
        let cg =
          is529Error(od) ||
          isNon529ServerError(od) ||
          (od instanceof APIError && (od.type === "api_error" || od.type === "timeout_error"));
        let Nf;
        if (isDlpRequestDenied(od)) Nf = "dlpDenied";
        else if (alwaysFalseErrors(od)) Nf = "escapeMonitor";
        let outputFiltered = isRequestTooLargeError_2(od);
        let ty = yb !== null && !E3 && connectionErrorDetails !== null && !Vl;
        let fp = classifyStreamFailure({
          error: od,
          isServerError: cg,
          stalled: fh,
          isConnectionError: ea || ty,
          suspended: isStreamSuspendedError(od),
          truncated: connectionErrorDetails?.code === "StreamTruncated",
          malformed: vc,
          denied: Nf !== undefined,
          outputFiltered,
          anyEvent: Vl,
          anyBlockFinished,
          anyOutputShown: nd,
          stopReasonReceived: reason !== null,
          outlastedNonStreamingTimeout: clock.monotonicNow() - Uy >= getNonStreamingRequestTimeoutMs(),
          complete: reason !== null && complete && Wd === null,
        });
        let th = fp === undefined ? "keepPartial" : retryBudget.onStreamFailed(fp, !Xl);
        let Fg = retryBudget.counts();
        let DC = fp?.progress === "thinkingOnly" && fp.cause === "overloaded" && !fp.stopReasonReceived;
        if (
          th === "useFallbackModel" &&
          (fp?.cause === "serverError" || fp?.cause === "timedOut") &&
          options.fallbackModel
        ) {
          if (!nd) markAbandonedThinking(Cm, resolvedModel);
          if (hf) {
            lP();
            xT();
          }
          logEvent("tengu_api_model_not_found_fallback_triggered", {
            original_model: telemetrySafeModelName(options.model),
            fallback_model: telemetrySafeModelName(options.fallbackModel),
            provider: getAPIProviderForAnalytics(),
            reason: fp.cause === "timedOut" ? lit_2("timed_out") : lit_2("server_error"),
            source: lit_2("mid_stream"),
          });
          throw new FallbackTriggeredError(options.model, options.fallbackModel, "server_error", od);
        }
        if (fp === undefined || fp.progress === "output" || (fp.progress === "thinkingOnly" && !DC)) {
          let pp = cg && nd;
          let Om = cg && th === "retry";
          if (th !== "fail") {
            releaseStreamResources();
            let Dy = fh;
            let any = Cm.some((Uae) => Uae.message.content.some((params) => params.type === "tool_use"));
            if (th === "retry") {
              if (!nd) markAbandonedThinking(Cm, resolvedModel);
              if (Dy) {
                logForDebugging(
                  `Stream idle timeout after thinking-only yield \u2014 retrying streaming (${Fg.stalls}/${RETRY_POLICY_CONST_1})`,
                  {
                    level: "warn",
                  },
                );
                logEvent("tengu_streaming_watchdog_retry", {
                  model: telemetrySafeModelName(options.model),
                  retry_attempt: Fg.stalls,
                  request_id: sanitizeMarkName(Al),
                  after_thinking_only: true,
                });
              } else {
                logForDebugging(
                  `Stream ${vc ? eh : Om ? "server error" : `connection closed (${connectionErrorDetails?.code})`} after thinking-only yield \u2014 retrying streaming (${Fg.afterThinkingOnly}/${fp?.cause === "timedOut" ? RETRY_POLICY_CONST_HYN : MAX_OUTPUT_FILTERED_RETRIES})`,
                  {
                    level: "warn",
                  },
                );
                logEvent("tengu_streaming_stale_connection_retry", {
                  model: telemetrySafeModelName(options.model),
                  error_code: vc
                    ? lit_2("malformed_stream")
                    : Om
                      ? fp?.cause === "timedOut"
                        ? lit_2("timed_out")
                        : lit_2("server_error")
                      : reducibleErrorCode(connectionErrorDetails?.code ?? ""),
                  retry_attempt: Fg.afterThinkingOnly,
                  request_id: sanitizeMarkName(Al),
                  after_thinking_only: true,
                });
              }
              C_("attempt_errored", Al ?? null, null);
              lP();
              xT();
              yield* ey({
                responseUnfinished: true,
              });
              Al = null;
              if (Om)
                await sleep(
                  getRetryDelay(Fg.afterThinkingOnly, undefined, undefined, options.random),
                  signal,
                  {
                    clock,
                  },
                );
              else if (!Dy)
                await sleep(100 * Fg.afterThinkingOnly, signal, {
                  clock,
                });
              continue e;
            }
            let P5n = reason !== null;
            let vht = connectionErrorDetails?.code === "StreamSuspended";
            let ULe = vht && !isDisklessProcess();
            let Eht = Dy
              ? "watchdog"
              : pp
                ? od instanceof APIError && od.type === "timeout_error"
                  ? "timed_out"
                  : "server_error"
                : vc
                  ? "malformed_stream"
                  : vht
                    ? "stream_suspended"
                    : connectionErrorDetails?.code === "StreamTruncated"
                      ? "stream_truncated"
                      : connectionErrorDetails !== null &&
                          UNREACHABLE_ERROR_CODES.has(connectionErrorDetails.code)
                        ? "network_down"
                        : "stale_connection";
            let cause = fromEnum(Eht);
            if (P5n && complete && Wd === null) {
              logForDebugging(
                `Stream ${Dy ? "stalled" : `connection closed (${connectionErrorDetails?.code ?? "unknown"})`} after message_delta (stop_reason=${reason}) \u2014 response already complete, no truncation`,
                {
                  level: "info",
                },
              );
              logEvent("tengu_streaming_close_after_complete", {
                model: telemetrySafeModelName(options.model),
                blocks_yielded: Cm.length,
                cause,
                error_code: connectionErrorDetails
                  ? reducibleErrorCode(connectionErrorDetails.code)
                  : lit_2("none"),
                request_id: sanitizeMarkName(Al),
              });
              C_("stream_completed", Al ?? null, Iu);
              yield* ey({
                responseUnfinished: false,
              });
              break e;
            }
            let jLe = any ? "tool_use" : "end_turn";
            reason = jLe;
            for (let Uae of Cm) {
              Uae.message.usage = Iu;
              Uae.message.stop_reason = jLe;
            }
            Nh?.noteClientTruncated(Cm[0]?.message.id);
            logForDebugging(
              Dy
                ? `Stream idle timeout after ${Cm.length} block(s) yielded \u2014 finalizing partial response`
                : pp
                  ? `Mid-stream server error after ${Cm.length} block(s) yielded \u2014 finalizing partial response`
                  : vc
                    ? `Stream ${eh} after ${Cm.length} block(s) yielded \u2014 finalizing partial response`
                    : `Stream connection closed (${connectionErrorDetails?.code}) after ${Cm.length} block(s) yielded \u2014 finalizing partial response`,
              {
                level: "warn",
              },
            );
            logEvent("tengu_streaming_partial_finalized", {
              model: telemetrySafeModelName(options.model),
              blocks_yielded: Cm.length,
              has_output: nd,
              synthesized_stop_reason: fromEnum(jLe),
              cause,
              request_id: sanitizeMarkName(Al),
            });
            lP();
            yield* ey({
              responseUnfinished: true,
            });
            let apiErrorMessage = createApiErrorMessage({
              content: nd
                ? Dy
                  ? `${API_ERROR_MESSAGE_PREFIX}: The response stopped arriving. The response above may be incomplete.`
                  : pp
                    ? `${API_ERROR_MESSAGE_PREFIX}: Server error mid-response. The response above may be incomplete.`
                    : vc
                      ? Mg
                        ? `${API_ERROR_MESSAGE_PREFIX}: Part of the response never arrived. The response above may be incomplete.`
                        : `${API_ERROR_MESSAGE_PREFIX}: The response stream was malformed. The response above may be incomplete.`
                      : ULe
                        ? `${API_ERROR_MESSAGE_PREFIX}: Your computer went to sleep mid-response. The response above may be incomplete.`
                        : `${API_ERROR_MESSAGE_PREFIX}: Connection lost mid-response. The response above may be incomplete.`
                : Dy
                  ? `${API_ERROR_MESSAGE_PREFIX}: The response stalled before a response was produced. Try again.`
                  : vc
                    ? Mg
                      ? `${API_ERROR_MESSAGE_PREFIX}: Part of the response never arrived and no response was produced. Try again.`
                      : `${API_ERROR_MESSAGE_PREFIX}: The response stream was malformed and no response was produced. Try again.`
                    : ULe
                      ? `${API_ERROR_MESSAGE_PREFIX}: Your computer went to sleep before a response was produced. Try again.`
                      : `${API_ERROR_MESSAGE_PREFIX}: Connection lost before a response was produced. Try again.`,
              error: "server_error",
              apiError: signal.aborted
                ? undefined
                : Dy
                  ? "stream_idle_timeout"
                  : ULe
                    ? "computer_slept"
                    : isConnectionError(od)
                      ? "connection_failed"
                      : undefined,
              truncatedAfterOutput: nd && !any ? true : undefined,
            });
            apiErrorMessage.streamCutCause = Eht;
            if (Dy && !nd) apiErrorMessage.streamWatchdogGaveUp = true;
            yield apiErrorMessage;
            break e;
          }
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error,
            attemptNumber: p_,
            maxOutputTokens: BT,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: Xl,
            request_id: traceValueOrUnknown(Al),
            fallback_cause: lit_2("partial_yield"),
            any_stream_event_yielded: Vl,
            has_output: nd,
            died_of: fromEnum(fp?.cause ?? "complete"),
          });
          throw ql;
        }
        if (fp?.cause === "outputFiltered") {
          if (hf) lP();
          if (th === "retry") {
            logForDebugging(
              `Output content filter stopped the response before any of the answer was shown: retrying streaming (${Fg.outputFiltered}/${RETRY_POLICY_CONST_JEE})`,
              {
                level: "warn",
              },
            );
            logEvent("tengu_streaming_output_filter_retry", {
              model: telemetrySafeModelName(options.model),
              retry_attempt: Fg.outputFiltered,
              request_id: traceValueOrUnknown(Al),
              first_stop_progress: fromEnum(fp.progress),
            });
            uP = {
              firstStopProgress: fp.progress,
              msToFirstStop: Math.round(clock.monotonicNow() - Uy),
              startedAt: clock.monotonicNow(),
              ended: undefined,
            };
            releaseStreamResources();
            C_("attempt_errored", Al ?? null, null);
            if (hf) xT();
            yield* ey({
              responseUnfinished: true,
            });
            Al = null;
            continue e;
          }
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error: lit_2("output_content_filtered"),
            attemptNumber: p_,
            maxOutputTokens: BT,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: true,
            request_id: traceValueOrUnknown(Al),
            fallback_cause: lit_2("output_content_filtered"),
            any_stream_event_yielded: Vl,
          });
          throw od;
        }
        if (ty) {
          E3 = true;
          logForDebugging(
            `[dispatch] Stream connection error (${connectionErrorDetails.code}) with ${ANTHROPIC_DISPATCH_ID}=${yb} before first event; ${th === "retry" ? "retrying once" : "going on"} with ${ANTHROPIC_DISPATCH_ID}=${V2P}`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_dispatch_header_fallback", {
            model: telemetrySafeModelName(options.model),
            dispatch: yb ?? undefined,
            resend_dispatch: fromEnum(V2P),
            reason: lit_2("body_phase"),
            status: lit_2("none"),
            error_code: reducibleErrorCode(connectionErrorDetails.code),
            query_source: agentTypeForTelemetry(options.querySource),
            request_id: sanitizeMarkName(Al),
          });
          if (th === "retry") {
            releaseStreamResources();
            C_("attempt_errored", Al ?? null, null);
            Al = null;
            continue e;
          }
        }
        let Hf =
          ea && connectionErrorDetails !== null
            ? {
                label: `connection error (${connectionErrorDetails.code})`,
                errorCode: reducibleErrorCode(connectionErrorDetails.code),
                error: new APIConnectionError({
                  cause: od instanceof Error ? od : undefined,
                }),
                attempt: Math.max(1, Fg.retries),
                limit: maxRetriesFromEnv,
              }
            : fp?.cause === "serverError" && od instanceof APIError
              ? {
                  label: "server error",
                  errorCode: lit_2("server_error"),
                  error: od,
                  attempt: Fg.afterThinkingOnly,
                  limit: MAX_OUTPUT_FILTERED_RETRIES,
                }
              : undefined;
        if (th === "retry" && Hf !== undefined) {
          let attempt = Hf.attempt;
          logForDebugging(`Stream ${Hf.label} \u2014 retrying streaming (${attempt}/${Hf.limit})`, {
            level: "warn",
          });
          logEvent("tengu_streaming_stale_connection_retry", {
            model: telemetrySafeModelName(options.model),
            error_code: Hf.errorCode,
            retry_attempt: attempt,
            request_id: traceValueOrUnknown(Al),
          });
          releaseStreamResources();
          C_("attempt_errored", Al ?? null, null);
          if (hf) xT();
          if (hf && aP !== "credited") {
            lP();
            yield* ey({
              responseUnfinished: true,
            });
          }
          Al = null;
          let retryDelay = getRetryDelay(attempt, undefined, undefined, options.random);
          let Dy = {
            ...summarizeApiError(Hf.error),
            rateLimits: null,
          };
          T3 = true;
          options.onRetryStatus?.({
            kind: "retrying",
            error: Dy,
            attempt,
            maxRetries: Hf.limit,
            retryInMs: retryDelay,
            deadline: clock.now() + retryDelay,
          });
          yield createSystemAPIErrorMessage(Dy, retryDelay, attempt, Hf.limit, "connection_retry");
          await sleep(retryDelay, signal, {
            clock,
          });
          continue e;
        }
        if (ea && reason === null && hf) lP();
        if (fh && th === "retry") {
          logForDebugging(
            `Stream idle timeout before first event \u2014 retrying streaming (${Fg.stalls}/${RETRY_POLICY_CONST_1})`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_streaming_watchdog_retry", {
            model: telemetrySafeModelName(options.model),
            retry_attempt: Fg.stalls,
            request_id: traceValueOrUnknown(Al),
          });
          releaseStreamResources();
          C_("attempt_errored", Al ?? null, null);
          Al = null;
          continue e;
        }
        if (!nd && reason === null && !retryBudget.outOfApiAttempts() && ILe(od) !== undefined) {
          retryBudget.undoLastCount();
          if (hf) {
            lP();
            xT();
          }
          releaseStreamResources();
          C_("attempt_errored", Al ?? null, null);
          yield* ey({
            responseUnfinished: true,
          });
          Al = null;
          continue e;
        }
        if (Nf === "dlpDenied") {
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error: lit_2(DLP_REQUEST_DENIED),
            attemptNumber: p_,
            maxOutputTokens: BT,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: true,
            request_id: traceValueOrUnknown(Al),
            fallback_cause: lit_2(DLP_REQUEST_DENIED),
            any_stream_event_yielded: Vl,
          });
          throw od;
        }
        if (Nf === "escapeMonitor") {
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error: lit_2(SAFETY_MONITOR_BLOCKED),
            attemptNumber: p_,
            maxOutputTokens: BT,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: true,
            request_id: traceValueOrUnknown(Al),
            fallback_cause: lit_2(SAFETY_MONITOR_BLOCKED),
            any_stream_event_yielded: Vl,
          });
          throw od;
        }
        if (od instanceof APIError && is529Error(od)) {
          let pp = nd
            ? null
            : planLowPriorityRetry(od, {
                markedAtDispatch: Jh,
                querySource: options.querySource,
                wait: _S,
              });
          let Om = retryBudget.outOfApiAttempts() ? null : pp;
          if (!nd) {
            if (hf) {
              lP();
              xT();
            }
            let overloaded = Fg.overloaded;
            if (Om !== null || th === "retry") {
              markAbandonedThinking(Cm, resolvedModel);
              logForDebugging(
                Om !== null
                  ? `Mid-stream 529 before content at lower priority \u2014 waiting ${Om.delayMs}ms for capacity (attempt ${Om.attempt})`
                  : `Mid-stream 529 before content \u2014 retrying streaming (${overloaded}/${MAX_529_RETRIES})`,
                {
                  level: "warn",
                },
              );
              if (Om !== null) retryBudget.undoLastCount();
              logEvent("tengu_streaming_529_retry", {
                model: telemetrySafeModelName(options.model),
                retry_attempt: Om !== null ? Om.attempt : overloaded,
                request_id: sanitizeMarkName(Al),
                ...(Om !== null && {
                  is_low_priority: true,
                }),
              });
              releaseStreamResources();
              C_("attempt_errored", Al ?? null, null);
              yield* ey({
                responseUnfinished: true,
              });
              Al = null;
              T3 = true;
              let UI = Om?.delayMs ?? getRetryDelay(overloaded, undefined, undefined, options.random);
              options.onRetryStatus?.(
                Om !== null
                  ? {
                      kind: "low_priority_waiting",
                      attempt: Om.attempt,
                      retryInMs: UI,
                      deadline: clock.now() + UI,
                    }
                  : {
                      kind: "retrying",
                      error: {
                        ...summarizeApiError(od),
                        rateLimits: null,
                      },
                      attempt: overloaded,
                      maxRetries: MAX_529_RETRIES - 1,
                      retryInMs: UI,
                      deadline: clock.now() + UI,
                    },
              );
              await sleep(UI, signal, {
                clock,
              });
              continue e;
            }
            if (options.fallbackModel && th === "useFallbackModel") {
              markAbandonedThinking(Cm, resolvedModel);
              logEvent("tengu_api_opus_fallback_triggered", {
                original_model: telemetrySafeModelName(options.model),
                fallback_model: telemetrySafeModelName(options.fallbackModel),
                provider: getAPIProviderForAnalytics(),
                source: lit_2("mid_stream"),
              });
              logFeatureSad("api_request", "api_request_fallback_triggered");
              throw new FallbackTriggeredError(options.model, options.fallbackModel, "overloaded", od);
            }
          }
        }
        if (th === "fail") {
          logForDebugging(`Error streaming (non-streaming fallback disabled): ${errorMessage(ql)}`, {
            level: "error",
          });
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error,
            attemptNumber: p_,
            maxOutputTokens: BT,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: true,
            request_id: traceValueOrUnknown(Al),
            fallback_cause: fromEnum(fallbackCause),
            error_name: errorName,
            error_constructor: errorConstructor,
            error_code: errorCode,
            any_stream_event_yielded: Vl,
          });
          nonStreamingFallbackSkipped = true;
          xgt = fh;
          throw ql;
        }
        if (!nd) markAbandonedThinking(Cm, resolvedModel);
        logForDebugging(`Error streaming, falling back to non-streaming mode: ${errorMessage(ql)}`, {
          level: "error",
        });
        dP = true;
        if (RLe) noteRedrive("non_streaming");
        if (dg !== undefined) xT();
        S3 = clock.now();
        {
          let pp = await contextHintController?.onStreamFallback(messagesForAPI_2, Al ?? undefined);
          if (pp) {
            messagesForAPI_2 = ch(pp.messages, "microcompact");
            yht(pp.clearedIds, pp.clearedContent);
          }
        }
        logEvent("tengu_streaming_fallback_to_non_streaming", {
          model: telemetrySafeModelName(options.model),
          error,
          attemptNumber: p_,
          maxOutputTokens: BT,
          thinkingType: fromEnum(betas.type),
          fallback_disabled: false,
          request_id: traceValueOrUnknown(Al),
          fallback_cause: fromEnum(fallbackCause),
          error_name: errorName,
          error_constructor: errorConstructor,
          error_code: errorCode,
          any_stream_event_yielded: Vl,
        });
        logForDiagnosticsNoPII("info", "cli_nonstreaming_fallback_started");
        logEvent("tengu_nonstreaming_fallback_started", {
          request_id: traceValueOrUnknown(Al),
          model: telemetrySafeModelName(options.model),
          fallback_cause: fromEnum(fallbackCause),
        });
        C_("attempt_errored", Al ?? null, null);
        fc = Al;
        Al = null;
        yield* ey({
          responseUnfinished: true,
        });
        yield* $Le();
        yield {
          type: "streaming_fallback_began",
          cause: fallbackCause,
        };
        if (
          yield* _ht(
            {
              requestId: requestIdFromHeaders(fc),
              analyticsRequestId: traceValueOrUnknown(fc),
              cause: fallbackCause,
              errorName: Ql,
              connectionCode: Nu,
              stall: Zg,
            },
            cg && (fp?.outlastedNonStreamingTimeout ?? false),
          )
        )
          return;
      } finally {
        D1();
        yP?.(v$, clock_2?.chunks);
        if (Qh !== undefined) settleServerStreamEnded(Qh);
      }
      C_("stream_completed", Al ?? null, reason !== null ? Iu : null);
      yield* ey({
        responseUnfinished: false,
      });
      break e;
    }
    Nh?.settle(
      {
        kind: "ok",
      },
      Al,
      dg?.id,
    );
    if (uP !== undefined) uP.ended = "completed";
  } catch (fallbackError) {
    vgt();
    yield* $Le();
    C_(signal.aborted ? "aborted" : "attempt_errored", Al ?? null, null);
    if (fallbackError instanceof FallbackTriggeredError) {
      retryBudget.reportHttpFailure(fallbackError.originalError, "useFallbackModel", {
        fallbackModelCouldHelp: fallbackError.reason !== "overloaded",
      });
      Nh?.settle(
        {
          kind: "error",
          error: fallbackError,
        },
        Al,
      );
      k3 = true;
      throw fallbackError;
    }
    let originalError = fallbackError instanceof CannotRetryError ? fallbackError.originalError : undefined;
    let Os =
      (originalError === undefined ? "fail" : retryBudget.onWithRetryGaveUp(originalError)) ===
      "retryWithoutStreaming";
    let La = fallbackError;
    let Vl = false;
    if (Os) {
      let Yl = (originalError instanceof APIError ? originalError.requestID : undefined) ?? "unknown";
      logForDebugging("Streaming endpoint returned 404, falling back to non-streaming mode", {
        level: "warn",
      });
      dP = true;
      S3 = clock.now();
      contextHintController?.strip();
      logEvent("tengu_streaming_fallback_to_non_streaming", {
        model: telemetrySafeModelName(options.model),
        error: lit_2("404_stream_creation"),
        attemptNumber: p_,
        maxOutputTokens: BT,
        thinkingType: fromEnum(betas.type),
        request_id: traceValueOrUnknown(Yl),
        fallback_cause: lit_2("404_stream_creation"),
        any_stream_event_yielded: false,
      });
      logForDiagnosticsNoPII("info", "cli_nonstreaming_fallback_started");
      logEvent("tengu_nonstreaming_fallback_started", {
        request_id: sanitizeMarkName(Yl),
        model: telemetrySafeModelName(options.model),
        fallback_cause: lit_2("404_stream_creation"),
      });
      if (RLe) noteRedrive("non_streaming");
      yield {
        type: "streaming_fallback_began",
        cause: "404_stream_creation",
      };
      try {
        fc = Al ?? (Yl !== "unknown" ? Yl : null);
        if (
          yield* _ht(
            {
              requestId: requestIdFromHeaders(Yl),
              analyticsRequestId: traceValueOrUnknown(Yl),
              cause: "404_stream_creation",
              errorName: null,
              connectionCode: null,
              stall: null,
            },
            false,
          )
        )
          return;
        Vl = true;
        if (uP !== undefined) uP.ended = "completed";
      } catch (error) {
        if (error instanceof FallbackTriggeredError) {
          Nh?.settle(
            {
              kind: "error",
              error,
            },
            Al,
          );
          k3 = true;
          throw error;
        }
        La = error;
      }
    }
    if (!Vl) {
      if (ao && (La instanceof ToolSearchRefusedError || options.toolSearchRefusal !== undefined))
        resetDeclaredTools(conversation);
      if (La instanceof ToolSearchRefusedError) {
        Ti?.splice(0, Ti.length);
        throw La;
      }
      logForDebugging(
        `${Os ? "Non-streaming fallback also failed" : "Error in API request"}: ${errorMessage(La)}`,
        {
          level: "error",
        },
      );
      let Yl = La;
      let errorModel = options.model;
      if (La instanceof CannotRetryError) {
        Yl = La.originalError;
        errorModel = La.retryContext.model;
      }
      if (Yl instanceof APIUserAbortError) {
        Nh?.settle(
          {
            kind: "aborted",
          },
          Os ? null : Al,
          Os ? undefined : dg?.id,
        );
        releaseStreamResources();
        return;
      }
      if (uP !== undefined && isRequestTooLargeError_2(Yl)) uP.ended = "filtered_again";
      if (Yl instanceof APIError)
        extractQuotaStatusFromError(
          Yl,
          getRequestRouteKind(options),
          clock.now(),
          limitsAccountEpoch,
          options.storageV5,
        );
      let Wd =
        Al ||
        (Yl instanceof APIError
          ? amazonRequestId(Yl.requestID || Yl.error?.request_id, Yl.headers)
          : undefined);
      Nh?.settle(
        {
          kind: "error",
          error: Yl,
        },
        Wd,
      );
      logAPIError({
        isLowPriority: Jh,
        dispatch: yb,
        error: Yl,
        model: errorModel,
        messageCount: messagesForAPI_2.length,
        messageTokens: tokenCountFromLastAPIResponse(messagesForAPI_2),
        durationMs: Math.max(0, Math.round(clock.monotonicNow() - Uy)),
        durationMsIncludingRetries: Math.max(0, Math.round(clock.monotonicNow() - xae)),
        attempt: p_,
        requestId: Wd,
        clientRequestId: Ah,
        didFallBackToNonStreaming: dP,
        nonStreamingFallbackSkipped,
        observedResponse: dP ? undefined : nk,
        queryTracking: options.queryTracking,
        querySource: options.querySource,
        accountMemoryKeys: f1,
        messageClientPlatform: options.messageClientPlatform,
        llmSpan: llmRequestSpan,
        fastMode: fallbackActive,
        previousRequestId: previousRequestId_2,
        effort: CC,
        agentContext: options.agentContext,
        attribution: buildAttribution(
          options.querySource,
          options.spawnedBySkill,
          options.activeSkill,
          options.activeMcpServer,
          options.activeMcpTool,
        ),
        modelCallNames: options.modelCallNames,
        promptTooLongIsHandled: options.promptTooLongIsHandled,
      });
      let assistantMessageFromApiError = getAssistantMessageFromApiError(Yl, errorModel, {
        messages,
        messagesForAPI: messagesForAPI_2,
        requestId: Wd,
      });
      let Np = {
        ...assistantMessageFromApiError,
        ...(signal.aborted &&
          (assistantMessageFromApiError.apiError === "connection_failed" ||
            assistantMessageFromApiError.apiError === "computer_slept") && {
            apiError: undefined,
          }),
        ...(Lae !== undefined &&
          Yl === Lae &&
          !signal.aborted && {
            apiError: "stream_idle_timeout",
          }),
        perTurnEffort: EE,
        perTurnTiming: n$,
        ...(xgt && {
          streamWatchdogGaveUp: true,
        }),
        ...((isNonFallbackError(Yl) ||
          alwaysFalseErrors(Yl) ||
          isVerificationRequiredError(Yl) ||
          (Yl instanceof APIError && Yl.type === "billing_error")) && {
          resendCannotCure: true,
        }),
      };
      if (isRegimeRefusal(Yl) && !retryBudget.outOfApiAttempts()) return Np;
      yield Np;
      releaseStreamResources();
      return;
    }
  } finally {
    if (Hi) onMainResponseEnd(requestId, complete, Date.now());
    try {
      if (Qh !== undefined) settleServerStreamEnded(Qh);
    } catch (error) {
      logError(toError(error));
    }
    endActivity("api_call", Sht);
    SLe();
    flushMessageOutlines(options.querySource, options.agentId);
    if (T3) options.onRetryStatus?.(null);
    if (uP !== undefined)
      classifyAttemptOutcome(uP, {
        now: clock.monotonicNow(),
        stopReason: LI?.message.stop_reason ?? reason,
        aborted: signal.aborted,
        model: options.model,
        querySource: options.querySource,
        clientRequestId: dP ? undefined : Ah,
      });
    C_(signal.aborted ? "aborted" : "attempt_errored", Al ?? null, null);
    Nh?.settle(
      reason !== null && Al
        ? {
            kind: "ok",
          }
        : signal.aborted
          ? {
              kind: "aborted",
            }
          : {
              kind: "other_exit",
            },
      Al,
      dg?.id,
    );
    releaseStreamResources();
    if (LI) {
      let fallbackUsage = LI.message.usage;
      Iu = mRe(EMPTY_USAGE, fallbackUsage);
      reason = LI.message.stop_reason;
      if (reason === "refusal")
        logApiRefusal({
          model: resolvedModel,
          requestId: Al || undefined,
          querySource: options.querySource,
          effort: CC,
          fastMode: fallbackActive,
          attempt: p_,
          attribution: buildAttribution(
            options.querySource,
            options.spawnedBySkill,
            options.activeSkill,
            options.activeMcpServer,
            options.activeMcpTool,
          ),
          serverFallbackHop: false,
          stopDetails: LI.message.stop_details ?? null,
          agentContext: options.agentContext,
        });
      let servedFallbackModel = Hae?.servedFallbackModel;
      let Jr = servedFallbackModel !== undefined;
      if (!$E) recordServedModel(stripAnyVersatileSuffix(options.model), LI.message.model);
      let Os =
        Jr && Hae !== undefined
          ? fallbackMessagesCost(
              Hae.entries,
              {
                speed: Iu.speed,
                inferenceGeo: Iu.inference_geo,
                serverToolUse: Iu.server_tool_use,
              },
              reason,
            )
          : calculateUSDCost(resolvedModel, Iu);
      Dae += addToTotalSessionCost(
        Os,
        Iu,
        Jr ? preferSameModel(options.serverRefusalFallback?.model, servedFallbackModel) : options.model,
        options.querySource,
        CC,
        options.spawnedBySkill,
        options.activeSkill,
        options.activeMcpServer,
        options.activeMcpTool,
      );
    }
    if (dg !== undefined || LI !== undefined) {
      xT();
      if (Hi && !k3) forgetResponseBeforeCompaction();
    }
  }
  if (Al && Hi)
    setLastMainRequestId(Al, {
      messageId: Cm.at(-1)?.message.id ?? dg?.id,
      turnPosition,
    });
  if (Hi) setLastMainThreadContextTokens(totalTokensOf(Iu));
  if (Xa)
    recordConversationSize(agentId, () => {
      let Wn = lazyTokenEstimate();
      let pr = totalTokensOf(Iu);
      return Number.isFinite(Wn) ? Math.max(Wn + Iu.output_tokens, pr) : pr || Wn;
    });
  noopRecordRequest(conversation, {
    isMainConversation: Hi,
  });
  DLe();
  Fgt.served();
  if (t$() && b3)
    logCacheDiagnosisReceived(b3, {
      requestId: Al,
      previousMessageId: nt,
      model: options.model,
      is1hCacheTTL: Tw === "1h",
      querySource: options.querySource,
      queryDepth: options.queryTracking?.depth,
    });
  let logMessageCount = messagesForAPI_2.length;
  let logMessageTokens = tokenCountFromLastAPIResponse(messagesForAPI_2);
  let requestContentTelemetry = isFirstPartyTelemetryBlocked()
    ? undefined
    : safeRequestContentStats(messagesForAPI_2, options.model);
  let wht = isFirstPartyTelemetryBlocked() ? undefined : sentImageStats(messagesForAPI_2, F5);
  let Tht = isFirstPartyTelemetryBlocked()
    ? undefined
    : requestPrefixStats(systemBlocks, allTools, getToolNameKinds(tools, extraToolSchemas));
  let carriedEffortEnded = Hi ? takeRefusalFallbackCarriedEffortEnd() : undefined;
  options
    .getToolPermissionContext()
    .then((permissionContext) => {
      logAPISuccessAndDuration({
        isLowPriority: Jh,
        dispatch: yb,
        uncoveredTail: oc,
        model: Cm[0]?.message.model ?? dg?.model ?? options.model,
        preNormalizedModel: options.model,
        usage: Iu,
        start: Uy,
        startIncludingRetries: xae,
        attempt: p_,
        messageCount: logMessageCount,
        messageTokens: logMessageTokens,
        requestId: Al ?? null,
        rawRequestBodyId,
        accountMemoryKeys: f1,
        clientRequestId: dP ? undefined : Ah,
        firstAttemptRequestId: fc ?? null,
        stopReason: reason,
        ttftMs: Iae,
        firstContentMs: dP ? null : (vLe ?? null),
        streamEventCount: dP ? undefined : v$,
        queryOverheadMs: CLe,
        didFallBackToNonStreaming: dP,
        querySource: options.querySource,
        promptCacheTtl: enablePromptCaching ? gW : undefined,
        promptCacheMessagesTtl:
          enablePromptCaching && !options.skipMessageCacheMarkers && XF ? "5m" : undefined,
        messageClientPlatform: options.messageClientPlatform,
        headers: ALe,
        extraEventFields: {
          ...{},
          ...emptyObject(conversation),
        },
        costUSD: Dae,
        isDefaultModel: Hi ? options.isDefaultModel : undefined,
        defaultModel: Hi ? options.defaultModel : undefined,
        ...Ca(yS),
        carriedEffort: Li,
        carriedEffortEnded,
        queryTracking: options.queryTracking,
        permissionMode: permissionContext.mode,
        proactivityLevel: options.proactivityLevel,
        newMessages: Cm,
        requestContentTelemetry,
        sentBody: wht && {
          ...wht,
          threadType,
        },
        requestPrefixTelemetry: Tht && {
          ...Tht,
          systemPromptSource: fromEnumOpt(options.systemPromptSource),
          snapshotHash: options.systemPromptSnapshotHash,
        },
        llmSpan: llmRequestSpan,
        globalCacheStrategy,
        requestSetupMs: Uy - xae,
        attemptStartTimes: B5,
        fastMode: fallbackActive,
        previousRequestId: previousRequestId_2,
        betas: hb,
        thinkingPrefixMismatchBehavior: g1,
        echoWireToolInputs: Xn,
        effort: yS,
        turnOrigin: turnOrigin_2,
        agentContext: options.agentContext,
        attribution: buildAttribution(
          options.querySource,
          options.spawnedBySkill,
          options.activeSkill,
          options.activeMcpServer,
          options.activeMcpTool,
        ),
        modelCallNames: options.modelCallNames,
      });
    })
    .catch((error) => logError(withTelemetryMessage(toError(error), "api success logging failed")));
  releaseStreamResources();
}
//@ chunk-e6aww6q8.js:2799701-2799795 fingerprint = cleanupStream (1)
/**
 * 中止尚未结束的 SDK 流（释放连接）。
 */
function cleanupStream(stream) {
  if (!stream) return;
  try {
    if (!stream.controller.signal.aborted) stream.controller.abort();
  } catch {}
}
//@ chunk-e6aww6q8.js:2802858-2802871 affinity
/**
 * 1024：中途 system 消息缓存代理判定阈值（cache read 小于此值）。
 */
var MIDCONV_CACHE_PROXY_READ_THRESHOLD = 1024;
//@ chunk-e6aww6q8.js:2802871-2804890 callgraph-fingerprint = addCacheBreakpoints (0.234)
/**
 * 给 API 消息加 cache_control 断点：kun() 选出标记位置（最后一条消息、fork 点、api_system 等），记 tengu_api_cache_breakpoints，再把内部消息转成 MessageParam（user/assistant/api_system）。
 */
function addCacheBreakpoints(
  messages,
  enablePromptCaching,
  querySource,
  skipCacheWrite = false,
  forkPointUuid,
  y = false,
  provider = getAPIProvider(),
  w = false,
  topLevelCacheControl = false,
  clearAtNextUser = false,
  q,
  divergesAtMessageId,
  Se,
  ke = false,
  we = true,
  Ee,
) {
  let Ae = areExperimentalBetasDisabled();
  let CLAUDE_CODE_SIMULATE_PROXY_USAGE = env.CLAUDE_CODE_SIMULATE_PROXY_USAGE;
  let Me = !y && !Ae && !CLAUDE_CODE_SIMULATE_PROXY_USAGE;
  let We = isStellarDriftEnabled();
  let ze = !w && isBasaltSpurEnabled();
  let lt = pickCacheMarkerIndices({
    messages,
    enablePromptCaching,
    skipCacheWrite,
    forkPointUuid,
    canMarkApiSystem: Me,
    forkCachePin: ze || (ke && !w),
    whitespaceTextUnstampable: We,
    topLevelCacheControl,
    isForkPinStepBackEnabled: () => ze && isBasaltScarpEnabled(),
    divergesAtMessageId: w ? undefined : divergesAtMessageId,
    parentReplyId: Ee?.isMarkWanted === true && !w ? Ee.parentReplyId : undefined,
    tailAuditTerms: {
      proxyDemoted: y,
      experimentalBetasDisabled: Ae,
      simulateProxyUsage: CLAUDE_CODE_SIMULATE_PROXY_USAGE,
      skipMessageCacheMarkers: Se?.skipMessageCacheMarkers ?? false,
    },
  });
  let { markerIndices, forkPointPinned, parentPromptEndMarked, auditTail } = lt;
  if (Se !== undefined)
    try {
      Se.report(auditTail());
    } catch (error) {
      logError(error);
    }
  if (we)
    logEvent("tengu_api_cache_breakpoints", {
      totalMessageCount: messages.length,
      cachingEnabled: enablePromptCaching,
      skipCacheWrite,
      forkPointPinned,
      markerCount: markerIndices.size,
      ...(Ee !== undefined &&
        !w && {
          querySource: agentTypeForTelemetry(Ee.querySource),
          ...(Ee.isMarkWanted && {
            parentPromptEndMarked,
          }),
        }),
    });
  let yt;
  try {
    yt = liftEphemeralReminders(messages, clearAtNextUser);
  } catch (error) {
    logError(error);
  }
  let mapped = (yt?.messages ?? messages).map((At, It) => {
    let addCache = markerIndices.has(It);
    if (At.type === "user") return userMessageToMessageParam(At, addCache, enablePromptCaching, querySource);
    if (At.type === "api_system") {
      let qt = addCache && enablePromptCaching && Me;
      let markerIndex = At.ephemeralSuffix
        ? [
            {
              type: "text",
              text: At.ephemeralSuffix,
            },
          ]
        : [];
      if (
        (At.toolAdditions && At.toolAdditions.length > 0) ||
        (At.toolRemovals && At.toolRemovals.length > 0)
      )
        return {
          role: "system",
          content: [
            ...buildToolRemovalBlocks(
              At.message.content,
              At.toolAdditions ?? [],
              qt
                ? getCacheControl({
                    ttl: querySource,
                  })
                : undefined,
              At.toolRemovals ?? [],
              At.toolDefinitions,
            ),
            ...markerIndex,
          ],
          ...(At.outputConfig && {
            output_config: At.outputConfig,
          }),
        };
      let rn = joinParts(At.message.content, At.ephemeralSuffix ?? "");
      return {
        role: "system",
        content: qt
          ? [
              {
                type: "text",
                text: At.message.content,
                cache_control: getCacheControl({
                  ttl: querySource,
                }),
              },
              ...markerIndex,
            ]
          : rn || [],
        ...(At.outputConfig && {
          output_config: At.outputConfig,
        }),
      };
    }
    return assistantMessageToMessageParam(At, addCache, enablePromptCaching, querySource, We);
  });
  if (yt !== undefined)
    try {
      let wireWithClearAt = buildWireWithClearAt(mapped, yt);
      q?.push(...wireWithClearAt.wireIndexOf);
      return wireWithClearAt.wire;
    } catch (error) {
      logError(error);
      let dropBase = yt.dropBase;
      let Yt = [];
      mapped.forEach((msg, index) => {
        q?.push(Yt.length);
        if (!dropBase.has(index)) Yt.push(msg);
      });
      q?.push(Yt.length);
      return Yt;
    }
  q?.push(...mapped.keys(), mapped.length);
  return mapped;
}
//@ chunk-e6aww6q8.js:2805133-2805379 fingerprint = buildSystemPromptBlocks (0.617)
/**
 * 把 system 提示词数组切成带缓存范围的块（s2o），每块转成 {type:"text",text,cache_control?}；cacheScope=global 时带 scope:"global"。
 */
function buildSystemPromptBlocks(systemPrompt, enablePromptCaching, options) {
  return splitSysPromptPrefix(systemPrompt, {
    skipGlobalCacheForSystemPrompt: options?.skipGlobalCacheForSystemPrompt,
  }).map((block) => ({
    type: "text",
    text: block.text,
    ...(enablePromptCaching &&
      block.cacheScope !== null && {
        cache_control: getCacheControl({
          scope: options?.scopeRefused ? undefined : block.cacheScope,
          ttl: options?.cacheTtl,
        }),
      }),
  }));
}
//@ chunk-e6aww6q8.js:2805379-2805821 layout
/**
 * 小模型查询：按小模型 fallback 链依次尝试，只在 permission_denied 时换下一个。
 */
async function queryHaikuWithFallback(e) {
  let n = unlessManagedDeniedModel(getSmallFastModel());
  let r =
    e.options.fallbackModel === undefined &&
    !sessionHasOwnFallback() &&
    env.ANTHROPIC_SMALL_FAST_MODEL === undefined &&
    !(nonEmptyOrUndefined(env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION) && hasDedicatedSmallFastModel())
      ? buildAvailabilityFallbackChain(n, undefined)
      : [];
  let s = 1;
  while (
    s < r.length &&
    resolveFallbackModel(r[s - 1], r[s], isRefusedOrSentModel).accessFallbackModel !== undefined
  )
    s++;
  let h = r.length > 0 ? r.slice(0, s) : [n];
  for (let idx = 0; ; idx++)
    try {
      return await queryWithModel(e, h[idx], h[idx + 1]);
    } catch (error) {
      if (
        !(error instanceof FallbackTriggeredError) ||
        error.reason !== "permission_denied" ||
        idx + 1 >= h.length
      )
        throw error;
    }
}
//@ chunk-e6aww6q8.js:2805821-2806412 callgraph-witnessed = queryWithModel (0.749)
/**
 * 单轮无工具辅助查询（指定模型、可带 fallback）：用 VCR 包装，thinking 机械关闭，默认不开缓存。
 */
async function queryWithModel(
  { systemPrompt = asSystemPrompt([]), userPrompt, outputFormat, signal, options: { helperEffortFor, ...y } },
  S,
  w,
) {
  return (
    await withVCR(
      [
        createUserMessage({
          content: systemPrompt.map((text) => ({
            type: "text",
            text,
          })),
        }),
        createUserMessage({
          content: userPrompt,
        }),
      ],
      async () => {
        let messages = [
          createUserMessage({
            content: userPrompt,
          }),
        ];
        return [
          await queryModelWithoutStreaming({
            messages,
            systemPrompt,
            thinkingConfig: {
              type: "disabled",
              mechanical: true,
            },
            tools: [],
            signal,
            options: {
              ...y,
              ...helperEffortFor?.(S),
              stickyBetas: y.stickyBetas ?? forkStickyBetaLatches(getStickyBetas()),
              agentContext: y.agentContext,
              model: S,
              fallbackModel: w ?? y.fallbackModel,
              enablePromptCaching: y.enablePromptCaching ?? false,
              outputFormat,
              async getToolPermissionContext() {
                return getEmptyToolPermissionContext();
              },
            },
          }),
        ];
      },
    )
  )[0];
}
//@ chunk-e6aww6q8.js:2806412-2806944 fingerprint = queryHaiku (0.838)
/**
 * 小模型（Haiku）辅助查询：单条用户消息、无工具、thinking 默认机械关闭，走 queryModelWithoutStreaming，VCR 可录放。
 */
async function queryHaiku({
  systemPrompt = asSystemPrompt([]),
  userPrompt,
  outputFormat,
  signal,
  options,
  thinkingConfig = {
    type: "disabled",
    mechanical: true,
  },
}) {
  return (
    await withVCR(
      [
        createUserMessage({
          content: systemPrompt.map((text) => ({
            type: "text",
            text,
          })),
        }),
        createUserMessage({
          content: userPrompt,
        }),
      ],
      async () => {
        let messages = [
          createUserMessage({
            content: userPrompt,
          }),
        ];
        return [
          await queryModelWithoutStreaming({
            messages,
            systemPrompt,
            thinkingConfig,
            tools: [],
            signal,
            options: {
              ...options,
              stickyBetas: options.stickyBetas ?? forkStickyBetaLatches(getStickyBetas()),
              agentContext: options.agentContext,
              enablePromptCaching: options.enablePromptCaching ?? false,
              outputFormat,
              async getToolPermissionContext() {
                return getEmptyToolPermissionContext();
              },
            },
          }),
        ];
      },
    )
  )[0];
}
//@ chunk-e6aww6q8.js:2806944-2807696 layout
/**
 * stop_reason 为 max_tokens / model_context_window_exceeded 时生成 API 错误消息（提示 CLAUDE_CODE_MAX_OUTPUT_TOKENS）。
 */
function getMaxTokensStopMessage(stopReason, n, outputTokens, s = false) {
  if (stopReason === "max_tokens") {
    logEvent("tengu_max_tokens_reached", {
      max_tokens: n,
    });
    return createApiErrorMessage({
      content: s
        ? `${API_ERROR_MESSAGE_PREFIX}: Claude's response exceeded the ${n} output token maximum for a request sent without streaming. The CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable cannot raise this limit.`
        : `${API_ERROR_MESSAGE_PREFIX}: Claude's response exceeded the ${n} output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable.`,
      apiError: "max_output_tokens",
      error: "max_output_tokens",
    });
  }
  if (stopReason === "model_context_window_exceeded") {
    logEvent("tengu_context_window_exceeded", {
      max_tokens: n,
      output_tokens: outputTokens,
    });
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: The model has reached its context window limit.`,
      apiError: "max_output_tokens",
      error: "max_output_tokens",
    });
  }
  return;
}
//@ chunk-e6aww6q8.js:2807696-2807918 fingerprint = adjustParamsForNonStreaming (1)
/**
 * 非流式回退时把 max_tokens 限到上限，并把 thinking.budget_tokens 限到 max_tokens-1。
 */
function adjustParamsForNonStreaming(params, maxTokensCap) {
  let cappedMaxTokens = Math.min(params.max_tokens, maxTokensCap);
  let adjustedParams = {
    ...params,
  };
  if (adjustedParams.thinking?.type === "enabled" && adjustedParams.thinking.budget_tokens)
    adjustedParams.thinking = {
      ...adjustedParams.thinking,
      budget_tokens: Math.min(adjustedParams.thinking.budget_tokens, cappedMaxTokens - 1),
    };
  return {
    ...adjustedParams,
    max_tokens: cappedMaxTokens,
  };
}
//@ chunk-e6aww6q8.js:2807918-2808007 layout
/**
 * 消息上布尔 resumable 字段（未完成思考可续写）。
 */
function getResumableFlag(e) {
  return "resumable" in e && typeof e.resumable === "boolean" ? e.resumable : undefined;
}
//@ chunk-e6aww6q8.js:2808007-2808146 placement
function assertStreamPart(e, n, errorType) {
  if (e) return;
  logEvent("tengu_streaming_error", {
    error_type: errorType,
    part_type: fromEnum(n.type),
    part_index: blockIndexOf(n),
  });
  throw new StreamMalformedEventError("unreadable");
}
//@ chunk-e6aww6q8.js:2808146-2808222 placement
function blockIndexOf(e) {
  return "index" in e && typeof e.index === "number" ? e.index : undefined;
}
//@ chunk-e6aww6q8.js:2808222-2808342 placement
function isRestartedBlock({ previous, closedContentBlocks, started }) {
  return (
    previous !== undefined &&
    closedContentBlocks.has(previous) &&
    "id" in previous &&
    "id" in started &&
    previous.id === started.id
  );
}
//@ chunk-e6aww6q8.js:2808342-2808410 placement
function recordMonotonicTime(weakMap, n, clock) {
  try {
    weakMap.set(n, clock.monotonicNow());
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2808410-2808545 placement
function elapsedSinceMs(weakMap, n, clock) {
  try {
    let s = weakMap.get(n);
    if (s === undefined) return;
    return Math.max(1, Math.round(clock.monotonicNow() - s));
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2808545-2808554 placement
setAdvisorBaseUrlGetter(getApiBaseUrl);
//@ chunk-w5ndchqs.js:2496-2556 placement
/**
 * ti/os/sb/he/uf/ap/tk：CLAUDE_CODE_EXTRA_METADATA 不能覆盖的保留键；512 为 user_id JSON 的长度上限。
 */
var RESERVED_METADATA_KEYS = new Set(["ti", "os", "sb", "he", "uf", "ap", "tk"]);
var MAX_METADATA_USER_ID_LENGTH = 512;
//@ chunk-w5ndchqs.js:2556-2709 placement
/**
 * 去掉保留键，只保留字符串/数字/布尔值的附加 metadata 字段。
 */
function sanitizeExtraMetadata(parsed) {
  let n = {};
  for (let [key, value] of Object.entries(parsed))
    if (
      !RESERVED_METADATA_KEYS.has(key) &&
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    )
      n[key] = value;
  return n;
}
//@ chunk-w5ndchqs.js:3172-3418 placement
/**
 * 构造请求 system：计费/归因头、额外前缀与原 system 依次拼接（去掉空项），并记录 API 前缀。
 */
function buildSystemWithAttribution(systemPrompt, prefix, options) {
  let attributionHeader = getAttributionHeader(
    options.fingerprint,
    options.agentContext,
    options.previousRequestId,
    options.promptId,
    options.turnOrigin,
    options.turnPosition,
    {
      attributionProject: parseAttributionProject(),
      responseBeforeCompaction: options.responseBeforeCompaction,
    },
  );
  let systemPrompt_2 = asSystemPrompt([attributionHeader, prefix, ...systemPrompt].filter(Boolean));
  logAPIPrefix(systemPrompt_2);
  return systemPrompt_2;
}
//@ chunk-w5ndchqs.js:5496-6185 fingerprint = getAPIMetadata (0.694)
/**
 * 请求体 metadata：user_id 为 JSON 字符串 {device_id, account_uuid, session_id, parent_session_id?, tk?}，可合并 CLAUDE_CODE_EXTRA_METADATA（超长时丢弃附加字段）。
 */
function getAPIMetadata({ agentContext: e, servedSessionMode: n } = {}) {
  let r = {};
  let extraStr = process.env.CLAUDE_CODE_EXTRA_METADATA;
  if (extraStr) {
    let parsed = safeParseJSON(extraStr, false);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) r = sanitizeExtraMetadata(parsed);
    else
      logForDebugging(`CLAUDE_CODE_EXTRA_METADATA env var must be a JSON object, but was given ${extraStr}`, {
        level: "error",
      });
  }
  let d = {};
  let m;
  let parentSessionId = getParentSessionId();
  let y =
    isEnvTruthy(env.CLAUDE_CODE_REMOTE) && isFirstPartyProvider() ? turnAttributionKeyFor(e) : undefined;
  let w = {
    ...(m && {
      ti: m,
    }),
    device_id: getOrCreateUserID(),
    account_uuid:
      (isEnvTruthy(env.CLAUDE_CODE_REMOTE) && env.CLAUDE_CODE_ACCOUNT_UUID) ||
      getAuthenticatedAccountInfo()?.accountUuid ||
      getOauthAccountInfo()?.accountUuid ||
      "",
    session_id: getSessionId(),
    ...(parentSessionId && {
      parent_session_id: parentSessionId,
    }),
    ...(y && {
      tk: y,
    }),
  };
  let L = {
    ...d,
    ...r,
    ...w,
  };
  if (
    (Object.keys(r).length > 0 || Object.keys(d).length > 0) &&
    jsonStringify(L).length > MAX_METADATA_USER_ID_LENGTH
  ) {
    L = {
      ...d,
      ...w,
    };
    if (jsonStringify(L).length > MAX_METADATA_USER_ID_LENGTH) L = w;
  }
  return {
    user_id: jsonStringify(L),
  };
}
//@ chunk-r1wk8q25.js:12135-12238 placement
var UPGRADE_RELAY_USAGE_LIMIT = "upgrade_relay_usage_limit";
var UPGRADE_RELAY_REQUEST_CLASS = "upgrade_relay_request_class";
var UPGRADE_RELAY_INHERITED_TOOLS = "upgrade_relay_inherited_tools";
//@ chunk-r1wk8q25.js:12368-12389 placement
/**
 * 60000 / 15000：非流式回退超时常量；getNonstreamingFallbackTimeoutMs 用 15s 或 API_TIMEOUT_MS/2 的较小者。
 */
var NON_STREAMING_FALLBACK_LONG_TIMEOUT_MS = 60000;
var NON_STREAMING_FALLBACK_TIMEOUT_MS = 15000;
//@ chunk-r1wk8q25.js:12389-12479 fingerprint = getNonstreamingFallbackTimeoutMs (0.768)
/**
 * 非流式回退请求超时：15s，设置 API_TIMEOUT_MS 时取其一半与 15s 的较小值。
 */
function getNonstreamingFallbackTimeoutMs() {
  let API_TIMEOUT_MS = env.API_TIMEOUT_MS;
  return API_TIMEOUT_MS !== undefined && API_TIMEOUT_MS > 0
    ? Math.min(NON_STREAMING_FALLBACK_TIMEOUT_MS, Math.floor(API_TIMEOUT_MS / 2))
    : NON_STREAMING_FALLBACK_TIMEOUT_MS;
}
//@ chunk-1ny7cxrt.js:1377013-1377628 fingerprint = updateUsage (0.876)
/**
 * 把内部 usage 规整成 SDK/外部格式：缓存细分、server_tool_use 只保留 web_search、speed 只认 fast，其余置 null。旧版名 updateUsage 为错配。
 */
function toSdkUsage(e) {
  return {
    output_tokens_details: null,
    input_tokens: e.input_tokens,
    output_tokens: e.output_tokens,
    cache_creation_input_tokens: e.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: e.cache_read_input_tokens ?? 0,
    cache_creation: e.cache_creation
      ? {
          ephemeral_5m_input_tokens: e.cache_creation.ephemeral_5m_input_tokens ?? 0,
          ephemeral_1h_input_tokens: e.cache_creation.ephemeral_1h_input_tokens ?? 0,
        }
      : null,
    server_tool_use: {
      web_search_requests: e.server_tool_use?.web_search_requests ?? 0,
      web_fetch_requests: 0,
    },
    service_tier: null,
    inference_geo: null,
    iterations: null,
    speed: e.speed === "fast" ? "fast" : null,
    fallback_credit: null,
  };
}
//@ chunk-1qpz7qcd.js:30432-30552 fingerprint = getPreviousRequestIdFromMessages (0.653)
/**
 * 控制请求子类型在白名单内时返回 {subtype, requestId}。旧版名 getPreviousRequestIdFromMessages 为错配。
 */
function getControlRequestInfo(messages) {
  let controlRequestSubtype = getControlRequestSubtype_2(messages);
  if (controlRequestSubtype === undefined || !MUTATING_CONTROL_SUBTYPES.has(controlRequestSubtype)) return;
  return {
    subtype: controlRequestSubtype,
    requestId: messages.payload ? getControlRequestSubtype(messages.payload) : undefined,
  };
}
//@ chunk-3xb70ww4.js:2887-2932 fingerprint = isMedia (1)
/**
 * text/image/document：contentBlockStableKeys 不为这几类生成键。旧版名 isMedia 为错配。
 */
var KEYLESS_BLOCK_TYPES = new Set(["text", "image", "document"]);
//@ chunk-aepeg2w5.js:474942-475090 fingerprint = getMaxOutputTokensForModel (1)
/**
 * 主循环模型的 max_tokens：模型默认值，可用 CLAUDE_CODE_MAX_OUTPUT_TOKENS 在模型上限内调整。
 */
function getMaxOutputTokensForModel(model) {
  let maxOutputTokens = getModelMaxOutputTokens(model);
  return validateBoundedIntEnvVar(
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS",
    process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS,
    maxOutputTokens.default,
    maxOutputTokens.upperLimit,
  ).effective;
}
export {
  queryHaiku,
  isToolResultOnlyUserMessage,
  getAPIMetadata,
  collectBlockFieldsByType,
  getToolResultIds,
  shouldSendInterleavedThinkingBeta,
  promptIdForRequest,
  getPromptCachingEnabled,
  isOneHourCacheTtl,
  verifyApiKey,
  queryHaikuWithFallback,
  isStructuredOutputsUnsupportedClaude,
  canonicalNameOrUndefined,
  ultrathinkEffectiveSafely,
  computeDeclaredToolSet,
  KEYLESS_BLOCK_TYPES,
  toSdkUsage,
  getControlRequestInfo,
  getCacheControl,
  getExtraBodyParams,
  isBasaltSpurEnabled,
  queryModelWithoutStreaming,
  getMaxOutputTokensForModel,
  watchSessionSwitchForThinkingKeep,
  isInvalidEffortError,
  queryModelWithStreaming,
  isRealApiResponse,
  should1hCacheTTL,
  isMidConvSystemForced,
  notifyPerTurnEffortInactive,
  logUnrecognizedModel,
  lowerEffort,
  learnedEffortCap,
  applyEffortToOutputConfig,
  getDispatchVersion,
  V2P,
  ANTHROPIC_DISPATCH_ID,
  markStructuredOutputsUnsupportedClaude,
  buildContextTokensFields,
  NON_STREAMING_FALLBACK_LONG_TIMEOUT_MS,
  getNonstreamingFallbackTimeoutMs,
  UPGRADE_RELAY_USAGE_LIMIT,
  UPGRADE_RELAY_REQUEST_CLASS,
  UPGRADE_RELAY_INHERITED_TOOLS,
};
