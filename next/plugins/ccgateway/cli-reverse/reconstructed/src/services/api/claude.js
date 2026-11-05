/**
 * services/api/claude.ts
 *
 * Messages API 调用核心：queryModel 构建请求体（模型、system、tools、thinking、output_config、context_management、beta）、加缓存断点、经 withRetry 发流式请求、解析 SSE 事件为 assistant 消息，以及 400 时逐级去特性的自愈重试；另含 queryHaiku/queryWithModel 等辅助查询。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/claude.ts
 * pieces: chunk-03m9p8vx.js (1), chunk-1hnjmk23.js (1), chunk-5xgkngpb.js (204), chunk-7pwjpdkw.js (4), chunk-ck4jrdtf.js (1), chunk-exfmq47h.js (1), chunk-n7kzs9r0.js (3)
 * attribution: fingerprint 22, affinity 3, placement 115, layout 55, sole-consumer 13, callgraph-fingerprint 2, callgraph-witnessed 3, file-local 2
 */
import { randomUUID } from "crypto";
import { getModelMaxOutputTokens } from "../../utils/context.js";
import { validateBoundedIntEnvVar } from "../../utils/envValidation.js";
import { getControlRequestSubtype_2 } from "../../bridge/attestationGate.js";
import { MUTATING_CONTROL_SUBTYPES, getControlRequestSubtype } from "../../bridge/controlRequests.js";
import { getAttributionHeader, getCLISyspromptPrefix } from "../../constants/system.js";
import { parseAttributionProject } from "../../utils/attributionProject.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import {
  logAPIPrefix,
  inlineToolReferences,
  isStellarDriftEnabled,
  prefetchToolDescribeHooks,
  toolToApiDefinition,
  shouldEnableWebSearchCitations,
  isNotLegacyClaude3,
  normalizeToolInput_2,
  markRootRequestSent,
  splitSysPromptPrefix,
} from "../../utils/api.js";
import { safeParseJSON } from "../../utils/json.js";
import { logForDebugging, getMinDebugLogLevel, createAttachmentMessage_2 } from "../../utils/debug.js";
import { getParentSessionId } from "../../utils/teammate.js";
import {
  isEnvTruthy,
  getVertexRegionForModel,
  parseIntLoose,
  nonEmptyOrUndefined,
} from "../../utils/envUtils.js";
import { env, antEnv } from "../../utils/env.js";
import {
  isFirstPartyProvider,
  isFirstPartyApiBackend,
  assumesFirstPartyBaseUrl,
  getAPIProvider,
  isFirstPartyAnthropicHost,
  isActualFirstPartyAnthropicBaseUrl,
  isGenuineBedrockEndpoint,
  isFirstPartyAnthropicBaseUrl,
  getProviderForModel,
  getAPIProviderForAnalytics,
} from "../../utils/model/providers.js";
import {
  turnAttributionKeyFor,
  mainAgentContext,
  isMainAgent,
  isSubagentContext,
  isMainConversationContext,
  getBackgroundAgentId,
} from "../../utils/agentContext.js";
import { getOrCreateUserID, getCachedClientData, getGlobalConfig } from "../../utils/config.js";
import {
  getAuthenticatedAccountInfo,
  getOauthAccountInfo,
  isClaudeAISubscriber,
  isWIFDispatchAuth,
} from "../../utils/auth.js";
import {
  getSessionId,
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
  isCcsTenant,
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
  markBetaHeaderRefused,
  markThinkingResumptionRefused,
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
} from "../../bootstrap/state.js";
import { jsonStringify, jsonParse, clone } from "../../utils/slowOperations.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import { isPdfReadToolUseId } from "../../utils/pdfUtils.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { isMainThreadSource } from "../../utils/querySource.js";
import {
  estimateCacheWriteCost,
  resolvePromptCacheTtl,
  ONE_HOUR_TTL_SOURCES,
  matchesModelPattern,
  stripModelDateSuffix,
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
  BETA_PROGRAM_USE_CASE_IDS,
  programUseCaseHeaderGoesOut,
  BETA_ADVISOR_TOOL,
  BETA_THINKING_TOKEN_COUNT,
  BETA_CCR_TOOL_PROVENANCE,
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
  BETA_CLAUDE_CODE_SIDE_QUERY,
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
  ultrathinkRaisesEffort,
  ultrathinkRaisesEffortInSession,
  isEffortHigherThan,
  EFFORT_LEVELS,
  getModelSettingsKey,
  modelSupportsXhighEffort,
  resolveEffortValue,
  modelSupportsEffort,
  normalizeEffortLevel,
  getDefaultEffortLevel,
  resolveAppliedEffort,
  isAboveHighEffort,
  isEffortLevel,
} from "../../utils/effort.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
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
import { matchesToolName, findToolByName, getEmptyToolPermissionContext } from "../../Tool.js";
import {
  TOOL_SEARCH_TOOL_NAME,
  isDeferredToolByEngine,
  isDeferredTool as isDeferredTool_2,
  isDeferredToolInConversation,
  DEFERREDTOOLPLACEHOLDER,
} from "../../tools/ToolSearchTool/prompt.js";
import {
  SYNTHETIC_MODEL,
  reorderByApiBlockIndex,
  isResendableClientApiError,
  getPromptId,
  memoryRedactionIndex,
  MEDIA_REMOVED_PLACEHOLDER,
  unionSets,
  getAdvisorStrippedMessageIds,
  stripForeignModelThinking,
  makeForeignModelChecker,
  shouldKeepForeignThinking,
  hasThinkingSignature,
  resolveReminderFold_2,
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
  clipSlackMs,
  slackStillFresh,
  senderAddressKeyFor,
  prefetchCcrSenderAddress,
  canSendWigglyDoveHeader,
  ARTIFACT_OUTPUT_SOURCE_QUERIES,
  isMainOrAgentQuerySource,
  streamTimerSlackMs,
  byteWatchdogSlackMs,
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import {
  countCodePoints,
  CONTROL_CHARS_EXCEPT_WS_RE,
  containsMalformedStringDeep,
  repairMalformedStringsDeep,
  plural,
} from "../../utils/stringUtils.js";
import { countWhere } from "../../utils/collections.js";
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
import { messagesSince, logIdleClearingFailure } from "../compact/idleToolResultClearing.js";
import {
  isArrayLikeAlias,
  baseGetAlias,
  identityAlias,
  baseUnaryAlias,
  baseIterateeAlias,
  baseFlattenAlias,
} from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { baseEachInline2Alias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isSymbolAlias, import_arrayMap, isArrayAlias } from "../../../vendor/lodash-es/toString.js";
import { mergeKeys, isIterateeCall_2 } from "../../../vendor/lodash-es/_mergeWithFamily.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  int as int_2,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { lastAdvisorToolChange } from "../../utils/advisor/advisorState.js";
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
import {
  streamFallbackWarning,
  CONVERSATION_RESET_KINDS,
  decideStreamFallbackWarning,
  formatZodErrors,
  awaitCacheWarmIfAny,
} from "./streamFallbackWarning.js";
import { isFirstPartyBaseUrl, getApiBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import {
  isBetaRejected as isBetaRejected_2,
  markBetaSent,
  isBetaSent,
  markBetaRejected,
  conversation,
  markDeclaredToolsDecided,
  setDeclaredTools,
  mediaItemCapForModel,
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
import { writeToStderr } from "../../utils/process.js";
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";
import { WAITFORMCPSERVERS, markDeclared } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { lit as lit_2, fromEnumOpt, fromEnum, fromNumber } from "../analytics/safeMetadata.js";
import {
  isProgramUseCaseTurnScoped,
  programUseCaseBody,
  forgetRefusedProgramUseCase,
} from "../../utils/programUseCase.js";
import {
  isSameModelForRules,
  resolveLoopEffort,
  classifyEffortCarryEffect,
  getRefusedEffortCarry,
} from "../../utils/permissions/permissionSetup.js";
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
  getDefaultFableModel,
  isMythosModelValue,
  toProviderWireModelId,
  SECONDARY_CONTEXT_WINDOW,
} from "../../utils/model/model.js";
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
import { returnValue } from "../../utils/generators.js";
import {
  withRetry,
  CannotRetryError,
  FallbackTriggeredError,
  GraceResend,
  is529Error,
  isSpeedParameterUnsupportedError,
  isNonFallbackError,
  isAuthRetryableError,
  isRemoteAuthError,
  getMaxRetriesFromEnv,
  getMaxSleptThrough,
  getMaxReconnects,
  MAX_529_RETRIES,
  retryWatchdogEnv,
  isRetryWatchdogOn,
  isFastModeNotEnabledError,
  parseMaxTokensContextOverflowError,
  isNotFoundApiError,
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
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";
import { withStreamVCR, isVcrEnabled, withVCR } from "../vcr.js";
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
  formatToolDurationsHeader,
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
import { getGzipRequestBodyBlocksMode, findRouteTurnError, takeDispatchAtGzip } from "./gzipRequestBody.js";
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
} from "../../utils/mediaLimits.js";
import {
  deferredToolNameOf,
  translateMessageToolNames,
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
  isProgramUseCaseBetaRejected,
  isProgramUseCaseNotHeldError,
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
  isToolProvenanceServerUrlError,
  isBetaListedAsUnexpected,
  isContext1mBetaRejected,
  isConversationBindingError,
  parseThinkingPrefixMismatchHeader,
  markPrefixLockHealDeclined,
  getRefusalMessage,
  isToolUseBlockCutOffError,
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
import { countUserPromptsInMessages as countUserPromptsInMessages_2 } from "../projects/projectReadRecords.js";
import { isBase64ImageBlock as isBase64ImageBlock_3 } from "../../utils/imageValidation.js";
import {
  unsentMediaByteLength,
  noteToolRedescribed,
  applyRefusedToolSchemas,
  ToolSchemaWireCache,
  isFoamySpringWireOn,
  recordUnsentMedia,
  emptyObject,
} from "./toolSchemaWire.js";
import { getResolvedWIFBaseUrlSnapshot } from "../oauth/wifCredentials.js";
import { getSonnet46ContextWindowOverride } from "../../utils/model/configs.js";
import { antGrants1MContext } from "../../utils/model/classifierModel.js";
import {
  shouldEchoWireToolInputs,
  shouldEchoWireToolInputsForRequest,
  adoptWireToolInputCopies,
  wireInputSources,
  captureWireToolInputs,
  logWireToolInputParseFailure,
  wireIngestContextStamps,
} from "../../utils/wireToolInputEcho.js";
import {
  isAccountMemoryRedactionOn,
  validateImagesInMessages,
  redactAccountMemory,
} from "../../utils/messages/accountMemory.js";
import { logSessionNoticeRender } from "../../utils/messages/ccrSessionNotice.js";
import { logDeclaredRound } from "../../utils/pollEvents/declarations.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import {
  queryCheckpoint,
  startProfilePhase,
  endProfilePhase,
  noteToolSchemaBuildStart,
  markToolSchemaBuildPart,
  noteToolSchemaBuildEnd,
  markMessageNormalizationPart,
  noteMessageNormalizationCounts,
  markRequestBuildPart,
  noteSentBuildSpan,
  openFirstEventWait,
  closeProfile,
  openProfileStream,
  openProfileWindow,
  endQueryProfile,
  noteRedrive,
} from "../../utils/queryProfiler.js";
import { estimateTokensWithAnchor, serverClearedTokens, turnTokenSizing } from "../compact/autoCompact.js";
import { bytesPerTokenForModel, renderModelName } from "../../utils/model/modelDisplay.js";
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
import { toolDescriptionCache as toolDescriptionCache_2 } from "./toolDescriptionCache.js";
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
  needsTetherChannel,
  checkTetherPrefixMismatch,
  createSentPrefixChecker,
  reportThinkingDrop,
  refetchStaleClientData,
  hasToolUse,
  failedResponseStamp,
  liftEphemeralReminders,
  buildWireWithClearAt,
} from "./tether.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { indexConnectorByTool } from "./connectorFields.js";
import { awaitArtifactRosterSafe } from "../artifacts/rosterWait.js";
import {
  isToolSearchEnabled,
  toolSearchToolFilteredOut,
  isToolDefinedByValueEnabled,
  getNonDeferrableBuiltins,
  extractDiscoveredToolNames,
  collectToolReferences,
} from "../../utils/toolSearch.js";
import {
  withProvenanceBeta,
  makeServerAnnotationResolver,
  stripToolAnnotations,
  annotateToolsWithFallback,
  withServerUrlHeader,
  stripUrlsFromAnnotations,
  countWithheldUrls,
  annotateMessageContentsWithFallback,
  handleServerUrlRefused,
} from "./toolProvenance.js";
import { deltaToolNames, deferredToolNames, isDeferredCustomToolDefinition } from "./toolDefinitionShape.js";
import {
  willHideCodeModeOnlyTools,
  hideCodeModeOnlyTools,
} from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { hideAliasedV1Tools, isBatchToolsUse } from "../tools/batchTools.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
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
import { sessionTimeZone } from "../../utils/sessionTimeZone.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import { computeFingerprintFromMessages } from "../../utils/fingerprint.js";
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
  isBetaRejectionStatus,
  markBetaHeaderRejectedForever,
  buildServerClassifierRequestContext,
  collectPriorServerContexts,
  recordClassifierRequest,
  pickPriorTurnContext,
} from "../../utils/permissions/serverClassifier/context.js";
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
import { logApiRequestBody, cyberVerificationOf } from "../../utils/telemetry/otelRawBodies.js";
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
import { checkInsertedTextShed } from "../../utils/cronFireTexts.js";
import { maxOutputTokensMinusOne } from "../../screens/Doctor.js";
import { canResumeThinking, markAbandonedThinking } from "./thinkingResumption.js";
import { THINKING_DISABLED_EFFORT_CAP } from "../../components/ModelPicker.js";
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
import { dropProgramUseCaseId } from "../mcp/ccrTurnId.js";
import {
  mergeUsageFromDelta,
  addResponseUsageAttributes,
} from "../../../vendor/@anthropic-ai/sdk/lib/internal/tracing/response.mjs";
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
import { startSessionActivity, endActivity } from "../../utils/sessionActivity.js";
import { headlessProfilerCheckpoint } from "../../utils/headlessProfiler.js";
import { recordApiRequestSentFromSpawn } from "../../utils/startupTiming.js";
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
import { isTextOrJsonDeltaEvent } from "../../query/goalCheckIn.js";
import { tokenCountFromLastAPIResponse } from "../../utils/tokens.js";
import { totalTokensOf } from "../../utils/messages/usageAndStopReason.js";
import { isFirstPartyTelemetryBlocked } from "../../utils/hostEnvironment.js";
import { getToolNameKinds } from "../../tools/SkillTool/SkillTool.js";
import { sessionHasOwnFallback, buildAvailabilityFallbackChain } from "../../utils/model/modelFallback.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:486340-486488 fingerprint (2.1.88 match: getMaxOutputTokensForModel, 1)
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
//@ chunk-ck4jrdtf.js:30935-31055 fingerprint (2.1.88 match: getPreviousRequestIdFromMessages, 0.653)
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
//@ chunk-7pwjpdkw.js:2692-2752 placement
/**
 * ti/os/sb/he/uf/ap/tk：CLAUDE_CODE_EXTRA_METADATA 不能覆盖的保留键；512 为 user_id JSON 的长度上限。
 */
var RESERVED_METADATA_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_METADATA_USER_ID_LENGTH;
deferInit("chunk-7pwjpdkw.js:2692", () => {
  RESERVED_METADATA_KEYS = new Set(["ti", "os", "sb", "he", "uf", "ap", "tk"]);
  MAX_METADATA_USER_ID_LENGTH = 512;
});
//@ chunk-7pwjpdkw.js:2752-2905 placement
/**
 * 去掉保留键，只保留字符串/数字/布尔值的附加 metadata 字段。
 */
function sanitizeExtraMetadata(parsed) {
  let extraMetadata = {};
  for (let [key, value] of Object.entries(parsed))
    if (
      !RESERVED_METADATA_KEYS.has(key) &&
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    )
      extraMetadata[key] = value;
  return extraMetadata;
}
//@ chunk-7pwjpdkw.js:3370-3616 placement
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
//@ chunk-7pwjpdkw.js:5697-6386 fingerprint (2.1.88 match: getAPIMetadata, 0.694)
/**
 * 请求体 metadata：user_id 为 JSON 字符串 {device_id, account_uuid, session_id, parent_session_id?, tk?}，可合并 CLAUDE_CODE_EXTRA_METADATA（超长时丢弃附加字段）。
 */
function getAPIMetadata({ agentContext, servedSessionMode } = {}) {
  let extraMetadata = {};
  let extraStr = process.env.CLAUDE_CODE_EXTRA_METADATA;
  if (extraStr) {
    let parsed = safeParseJSON(extraStr, false);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      extraMetadata = sanitizeExtraMetadata(parsed);
    else
      logForDebugging(`CLAUDE_CODE_EXTRA_METADATA env var must be a JSON object, but was given ${extraStr}`, {
        level: "error",
      });
  }
  let reservedMetadata = {};
  let turnInfo;
  let parentSessionId = getParentSessionId();
  let turnAttributionKey =
    isEnvTruthy(env.CLAUDE_CODE_REMOTE) && isFirstPartyProvider()
      ? turnAttributionKeyFor(agentContext)
      : undefined;
  let baseMetadata = {
    ...(turnInfo && {
      ti: turnInfo,
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
    ...(turnAttributionKey && {
      tk: turnAttributionKey,
    }),
  };
  let metadata = {
    ...reservedMetadata,
    ...extraMetadata,
    ...baseMetadata,
  };
  if (
    (Object.keys(extraMetadata).length > 0 || Object.keys(reservedMetadata).length > 0) &&
    jsonStringify(metadata).length > MAX_METADATA_USER_ID_LENGTH
  ) {
    metadata = {
      ...reservedMetadata,
      ...baseMetadata,
    };
    if (jsonStringify(metadata).length > MAX_METADATA_USER_ID_LENGTH) metadata = baseMetadata;
  }
  return {
    user_id: jsonStringify(metadata),
  };
}
//@ chunk-03m9p8vx.js:8837-8936 fingerprint (2.1.88 match: isMedia, 1)
/**
 * 内容数组含 image/document 块。
 */
function hasMediaContent(block) {
  return (
    Array.isArray(block) &&
    block.some((block) => isObjectBlock(block) && (block.type === "image" || block.type === "document"))
  );
}
//@ chunk-5xgkngpb.js:143091-143273 fingerprint (2.1.88 match: isToolResultBlock, 1)
function isToolResultBlock_4(block) {
  if (typeof block !== "object" || block === null || !("type" in block)) return false;
  return (
    (block.type === "tool_use" && "id" in block && isPdfReadToolUseId(block.id)) ||
    (block.type === "tool_result" && "tool_use_id" in block && isPdfReadToolUseId(block.tool_use_id))
  );
}
//@ chunk-5xgkngpb.js:143273-143326 affinity
function isDocumentContent(content) {
  return Array.isArray(content) && content.some(isToolResultBlock_4);
}
//@ chunk-5xgkngpb.js:143326-143720 affinity
function findToolResultFirstBlock(apiMessages) {
  let filtered = apiMessages.filter((message) => message.role === "user");
  let content = filtered.at(-1)?.content;
  let block = Array.isArray(content) ? content.at(-1) : undefined;
  if (isToolResultBlock_4(block)) {
    let content =
      typeof block === "object" && block !== null && "content" in block ? block.content : undefined;
    if (!Array.isArray(content) || content.length > 2) return "added_to";
    let secondBlock = content[1];
    return typeof secondBlock === "object" &&
      secondBlock !== null &&
      "type" in secondBlock &&
      secondBlock.type === "document"
      ? "last"
      : "no_document";
  }
  return filtered.some((message) => isDocumentContent(message.content)) ? "not_last" : "absent";
}
//@ chunk-5xgkngpb.js:448594-448742 placement
/**
 * 从内容数组里取指定 type 块的某个字符串字段（如 tool_use 的 id、tool_result 的 tool_use_id）。
 */
function collectBlockFieldsByType(content, blockType, fieldName) {
  if (!Array.isArray(content)) return [];
  let values = [];
  for (let block of content)
    if (isPlainObject_6(block) && block.type === blockType) {
      let value = block[fieldName];
      if (typeof value === "string") values.push(value);
    }
  return values;
}
//@ chunk-5xgkngpb.js:2133520-2133613 placement
function buildContextTokensFields(model) {
  let contextTokens = getLastMainThreadContextTokens() ?? 0;
  return {
    context_tokens: contextTokens,
    prompt_cache_warm: isMainThreadSource([]),
    ...estimateCacheWriteCost(model, contextTokens),
  };
}
//@ chunk-5xgkngpb.js:2533644-2533709 placement
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
//@ chunk-5xgkngpb.js:2533709-2533774 placement
/**
 * 导出函数 `ultrathinkEffectiveSafely`：参数 e, n，返回 isUltrathinkEffective(e, n()); } catch (error) { logError(toError(error)); return; }。
 */
function ultrathinkEffectiveSafely(model, readSessionEffort) {
  try {
    return ultrathinkRaisesEffort(model, readSessionEffort());
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2533774-2533839 layout
function resolveModelAlias(model, getMainLoopModel) {
  try {
    return ultrathinkRaisesEffortInSession(model, getMainLoopModel());
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2533839-2533973 placement
function notifyPerTurnEffortInactive(messages, isPerTurnEffortActive) {
  try {
    if (!isPerTurnEffortActive && hasContextBeta(messages))
      enqueueTaskNotification({
        type: "system",
        subtype: "per_turn_effort_changed",
        per_turn_effort_active: false,
      });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-5xgkngpb.js:2533973-2534038 placement
function thinkingDisplayUpdatesEnabled() {
  return env.CLAUDE_CODE_THINKING_DISPLAY_UPDATES ?? true;
}
//@ chunk-5xgkngpb.js:2534038-2534261 placement
function thinkingDisplayMode(display, isThinkingDisabled) {
  if (display === "summarized" || display === "highlights") return "thinking_and_connector_text";
  if (display === "omitted" && !isThinkingDisabled) return "none";
  if (display !== "omitted" && showThinkingSummaries()) return "thinking_and_connector_text";
  return thinkingDisplayUpdatesEnabled() ? "connector_text" : "none";
}
//@ chunk-5xgkngpb.js:2534261-2534314 placement
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
//@ chunk-5xgkngpb.js:2534314-2534376 placement
function hasThinkingDisplayProbesLeft() {
  return (getSessionFeatureValues().thinkingDisplayProbeFailures ?? 0) < 2;
}
//@ chunk-5xgkngpb.js:2534376-2534471 placement
function noteThinkingDisplayProbeFailure() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.thinkingDisplayProbeFailures =
    (sessionFeatureValues.thinkingDisplayProbeFailures ?? 0) + 1;
}
//@ chunk-5xgkngpb.js:2537561-2537600 placement
var computerToolRelayModule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-5xgkngpb.js:2537561", () => {
  computerToolRelayModule = require("../remoteTools/isLinkedComputerToolShownOnRelay.lazy.js");
});
//@ chunk-5xgkngpb.js:2537600-2537686 placement
function isClaudeAiAlwaysLoadMcpTool(tool) {
  return tool.isMcp === true && tool.alwaysLoad === true && tool.mcpInfo?.scope === "claudeai";
}
//@ chunk-5xgkngpb.js:2537686-2538156 placement
/**
 * 计算本次请求声明的工具集（DeclaredToolSet）：启用 ToolSearch 时排除延迟加载的工具（CLAUDE_CODE_UPFRONT_TOOLS 中的可提前声明）；条件不满足返回 undefined。
 */
function computeDeclaredToolSet(betas, tools, isDeferred, context, upfront = false) {
  let isStickyBetas = betas === getStickyBetas();
  let wantsDeclared = (tool) =>
    !betas.declaredToolsDecided &&
    (isClaudeAiAlwaysLoadMcpTool(tool) ||
      (isStickyBetas &&
        computerToolRelayModule?.isLinkedComputerToolShownOnRelay(tool, betas, context) === true));
  let remainingTools = turnDeniedTools(tools, betas);
  let isTurnDenied = remainingTools !== tools;
  let isUpfrontTool = (tool) =>
    tool.mcpInfo?.scope !== "claudeai" && toolMatchesAnyName(tool, env.CLAUDE_CODE_UPFRONT_TOOLS ?? []);
  let hasUpfrontDeferred =
    upfront &&
    !betas.declaredToolsDecided &&
    remainingTools.some((tool) => isUpfrontTool(tool) && isDeferred(tool));
  if (
    (isTurnDenied ? betas.declaredTools !== undefined : betas.declaredToolsDecided) ||
    !isFoamySpringEnabled_2() ||
    (!isTurnDenied && !hasUpfrontDeferred && !tools.some(wantsDeclared)) ||
    !tools.some((tool) => matchesToolName(tool, TOOL_SEARCH_TOOL_NAME))
  )
    return;
  return new DeclaredToolSet(
    remainingTools.filter(
      (tool) => (!isDeferred(tool) || (hasUpfrontDeferred && isUpfrontTool(tool))) && !wantsDeclared(tool),
    ),
  );
}
//@ chunk-5xgkngpb.js:2554468-2554483 placement
var MSG = "msg_";
//@ chunk-5xgkngpb.js:2554483-2554668 placement
function isRealApiResponse(message) {
  if (message.isApiErrorMessage) return false;
  if (message.requestId) return true;
  if (message.isVirtual) return false;
  let id = message.message?.id;
  return typeof id === "string" && id.startsWith(MSG) && message.message?.model !== SYNTHETIC_MODEL;
}
//@ chunk-5xgkngpb.js:2554668-2554838 placement
function lastAssistantMessageId(messages) {
  try {
    for (let idx = messages.length - 1; idx >= 0; idx--) {
      let message = messages[idx];
      if (message.type === "assistant" && isRealApiResponse(message)) {
        let id = message.message?.id;
        if (typeof id === "string") return id;
      }
    }
  } catch (error) {
    logError(error);
  }
  return;
}
//@ chunk-5xgkngpb.js:2584669-2584723 placement
/**
 * 导出函数 `isBasaltSpurEnabled`：返回 canSendFirstPartyBetas() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_spur", !1)。
 */
function isBasaltSpurEnabled() {
  return canSendFirstPartyBetas() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_spur", false);
}
//@ chunk-5xgkngpb.js:2584723-2584774 placement
function isExtractMemoriesSkipCacheWrite(querySource, skipCacheWrite) {
  return querySource === "extract_memories" && skipCacheWrite;
}
//@ chunk-5xgkngpb.js:2584774-2584829 placement
function isBasaltScarpEnabled() {
  return canSendFirstPartyBetas() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_scarp", false);
}
//@ chunk-5xgkngpb.js:2584829-2585011 placement (2.1.88 match: hasThinkingContent, 1)
function isRenderableContentBlock(block, whitespaceTextUnstampable) {
  if (block.type === "text") {
    if (typeof block.text !== "string" || block.text === "") return false;
    return !whitespaceTextUnstampable || block.text.trim() !== "";
  }
  return block.type !== "thinking" && block.type !== "redacted_thinking" && !isFallbackMessage(block);
}
//@ chunk-5xgkngpb.js:2585011-2585161 placement
function lastBlockIsRenderable(message, whitespaceTextUnstampable) {
  if (message.type !== "assistant") return true;
  let content = message.message.content;
  if (typeof content === "string") return true;
  let block = content.at(-1);
  return block !== undefined && isRenderableContentBlock(block, whitespaceTextUnstampable);
}
//@ chunk-5xgkngpb.js:2585161-2585513 placement
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
//@ chunk-5xgkngpb.js:2585513-2587013 placement
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
  let isRenderable = (message) => lastBlockIsRenderable(message, whitespaceTextUnstampable);
  let isSkippable = (message) =>
    message.type === "api_system" ||
    (message.type === "user" && message.ephemeral === true) ||
    !isRenderable(message);
  let lastCacheableBefore = (index) => {
    let cursor = index;
    while (cursor >= 0 && isSkippable(messages[cursor])) cursor--;
    return cursor;
  };
  let tailIndex = lastCacheableBefore(messages.length - 1);
  if (skipCacheWrite) tailIndex = lastCacheableBefore(tailIndex - 1);
  let isMarkableApiSystem = (index, floorIndex) => {
    let candidate = messages[index];
    return (
      candidate !== undefined &&
      candidate.type === "api_system" &&
      !candidate.ephemeral &&
      !messages
        .slice(floorIndex + 1, index)
        .some((message) => message.type === "user" && message.ephemeral === true) &&
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
        let forkPinIndex =
          skipCacheWrite && lastIndex === tailIndex && isForkPinStepBackEnabled()
            ? lastCacheableBefore(lastIndex - 1)
            : isRenderable(messages[lastIndex])
              ? lastIndex
              : lastCacheableBefore(lastIndex - 1);
        if (forkPinIndex >= 0) {
          markerIndices.add(forkPinIndex);
          forkPointPinned = true;
        }
      }
    } else if (!skipCacheWrite) {
      let prevIndex = lastCacheableBefore(tailIndex - 1);
      if (prevIndex >= 0) {
        markerIndices.add(prevIndex);
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
//@ chunk-5xgkngpb.js:2587013-2588600 placement
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
  let lastIndex = messages.length - 1;
  if (!cachingOn)
    return {
      reason: terms.skipMessageCacheMarkers ? "no_message_markers" : "caching_off",
      messagesAfterMarker: messages.length,
      resentTailTokensEst: 0,
      sentOnceTailTokensEst: 0,
      unexcusedTailTokensEst: 0,
    };
  let forcedReason = skipCacheWrite ? "fork_tail_skip_cache_write" : undefined;
  let lastReason = terms.proxyDemoted
    ? "proxy_demoted"
    : terms.experimentalBetasDisabled || terms.simulateProxyUsage
      ? "experimental_betas_disabled"
      : "unexcused";
  let lastIndex_2 = messages.findLastIndex(
    (message, idx) => idx >= firstTailIndex && message.type === "assistant",
  );
  let resentTokens = 0;
  let sentOnceTokens = 0;
  let unexcusedTailTokensEst = 0;
  let sawRequestScopedUser = false;
  let worstReason = "none";
  let noteReason = (reason) => {
    if (CACHE_SKIP_REASON_CODES[reason] > CACHE_SKIP_REASON_CODES[worstReason]) worstReason = reason;
  };
  let addReasoned = (tokens, reason) => {
    if (tokens === 0) return;
    if (reason === "unexcused" || reason === "sent_once_oversized" || reason === "sent_once_mislabeled")
      unexcusedTailTokensEst += tokens;
    noteReason(reason);
  };
  let addSentOnce = (tokens, isMislabeled) => {
    sentOnceTokens += tokens;
    addReasoned(
      tokens,
      forcedReason ??
        (isMislabeled
          ? "sent_once_mislabeled"
          : tokens > MAX_TAIL_AUDIT_ITEMS
            ? "sent_once_oversized"
            : "sent_once_text"),
    );
  };
  let prevMessage = messages[firstTailIndex - 1];
  if (prevMessage?.type === "api_system" && prevMessage.ephemeralSuffix !== undefined)
    addSentOnce(roughTokensOfTrimmed(prevMessage.ephemeralSuffix), false);
  for (let idx = firstTailIndex; idx <= lastIndex; idx++) {
    let message = messages[idx];
    if (message.type === "api_system") {
      let content = message.message.content;
      addSentOnce(
        roughTokensOfTrimmed(message.ephemeral ? content : (message.ephemeralSuffix ?? "")),
        message.ephemeral === true && hasFoldedAttachmentEdits(message),
      );
      if (message.ephemeral) continue;
      let tokens = roughTokensOfTrimmed(content);
      resentTokens += tokens;
      addReasoned(
        tokens,
        forcedReason ??
          (idx < lastIndex_2
            ? "unstampable_tail"
            : sawRequestScopedUser
              ? "request_scoped_user"
              : idx === lastIndex && !canMarkApiSystem
                ? lastReason
                : "unexcused"),
      );
    } else if (message.type === "user" && message.ephemeral === true) {
      sentOnceTokens += roughTokenCountEstimationForContent(message.message.content);
      sawRequestScopedUser = true;
      noteReason("request_scoped_user");
    } else {
      let tokens = roughTokenCountEstimationForContent(message.message.content);
      resentTokens += tokens;
      addReasoned(
        tokens,
        forcedReason ??
          (message.type === "assistant" && !lastBlockIsRenderable(message, whitespaceTextUnstampable)
            ? "unstampable_tail"
            : "unexcused"),
      );
    }
  }
  return {
    reason: forcedReason ?? worstReason,
    messagesAfterMarker: lastIndex - firstTailIndex + 1,
    resentTailTokensEst: resentTokens,
    sentOnceTailTokensEst: sentOnceTokens,
    unexcusedTailTokensEst,
  };
}
//@ chunk-5xgkngpb.js:2588600-2588820 placement
function hasFoldedAttachmentEdits(block) {
  return (
    (block.foldedAttachmentSpans?.length ?? 0) > 0 ||
    (block.foldedAttachmentTypes?.length ?? 0) > 0 ||
    block.nameOnlyContent !== undefined ||
    (block.toolAdditions?.length ?? 0) > 0 ||
    (block.toolRemovals?.length ?? 0) > 0 ||
    block.toolDefinitions !== undefined
  );
}
//@ chunk-5xgkngpb.js:2588820-2588865 placement
function roughTokensOfTrimmed(text) {
  return text.trim() === "" ? 0 : roughTokenCountEstimation(text);
}
//@ chunk-5xgkngpb.js:2588865-2589238 placement
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
    for (let requestId of keepaliveRequestIds(model)) {
      let found = messages.find((message) => message.type === "assistant" && message.requestId === requestId);
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
//@ chunk-5xgkngpb.js:2589238-2589302 placement
function isStructuredOutputsUnsupportedClaude(model) {
  return (
    isStructuredOutputsMarkedUnsupported(stripAnyVersatileSuffix(model)) ||
    !foundrySupportsCapability(model, "structured_outputs")
  );
}
//@ chunk-5xgkngpb.js:2589302-2589329 placement
function markStructuredOutputsUnsupportedClaude(model) {
  markStructuredOutputsUnsupported(stripAnyVersatileSuffix(model));
}
//@ chunk-5xgkngpb.js:2613934-2614966 placement
/**
 * CLAUDE_CODE_WEBSEARCH_CITATIONS 开启时，把流里相邻的带引用文本块合并成一个 assistant 消息（重算 span），并同步后续 server_fallback 里引用的消息。
 */
async function* joinWebSearchCitationTexts(stream, enabled) {
  if (!env.CLAUDE_CODE_WEBSEARCH_CITATIONS || !enabled) return yield* stream;
  let buffer = [];
  let replacements = new Map();
  function* flushBuffer() {
    let buffered = buffer;
    buffer = [];
    let last = buffered.at(-1);
    if (last === undefined) return;
    let mergedContent;
    try {
      mergedContent = mergeCitedTextBlocks(buffered.flatMap((message) => message.message.content));
    } catch (error) {
      logError(error);
      yield* buffered;
      return;
    }
    if (mergedContent === undefined) {
      yield last;
      return;
    }
    let { apiBlockIndex, ...rest } = last;
    let mergedMessage = {
      ...rest,
      message: {
        ...last.message,
        content: mergedContent,
      },
    };
    for (let message of buffered) replacements.set(message, mergedMessage);
    yield mergedMessage;
  }
  function applyReplacements() {
    for (let [original, replacement] of replacements) {
      if (original.uuid !== replacement.uuid) continue;
      let { message, apiBlockIndex, ...rest } = original;
      Object.assign(replacement, rest);
      Object.assign(replacement.message, message, {
        content: replacement.message.content,
      });
    }
  }
  let remapMessages = (list) =>
    normalizeCaseForComparison_2(list.map((message) => replacements.get(message) ?? message));
  try {
    for await (let message of stream) {
      if (message.type === "assistant") {
        let prevMessage = buffer.at(-1);
        if (prevMessage !== undefined && !isNextTextBlock(prevMessage, message)) yield* flushBuffer();
        buffer.push(message);
        if (!isSingleTextBlockMessage(message)) yield* flushBuffer();
        continue;
      }
      if (!isTextStreamEvent(message)) {
        yield* flushBuffer();
        applyReplacements();
      }
      if (message.type === "server_fallback")
        yield {
          ...message,
          discardedMessages: remapMessages(message.discardedMessages),
          retainedMessages: remapMessages(message.retainedMessages),
        };
      else if (message.type === "stream_event" && message.event.type === "message_start")
        yield {
          ...message,
          textRunsJoined: true,
        };
      else yield message;
    }
  } catch (error) {
    yield* flushBuffer();
    throw error;
  }
  yield* flushBuffer();
}
//@ chunk-5xgkngpb.js:2614966-2615080 placement
function isSingleTextBlockMessage(message) {
  return (
    message.apiBlockIndex !== undefined &&
    message.message.content.length === 1 &&
    message.message.content[0].type === "text"
  );
}
//@ chunk-5xgkngpb.js:2615080-2615149 placement
function isNextTextBlock(prevMessage, message) {
  return isSingleTextBlockMessage(message) && message.apiBlockIndex === prevMessage.apiBlockIndex + 1;
}
//@ chunk-5xgkngpb.js:2615149-2615358 placement
function isTextStreamEvent(message) {
  if (message.type !== "stream_event") return false;
  let event = message.event;
  let eventType = event.type;
  return (
    eventType === "ping" ||
    eventType === "content_block_delta" ||
    eventType === "content_block_stop" ||
    (event.type === "content_block_start" && event.content_block.type === "text")
  );
}
//@ chunk-5xgkngpb.js:2615358-2615796 placement
/**
 * 合并相邻文本块并把引用的 span 改写为合并后文本中的码点区间（网页搜索位置引用除外），没有变化时返回 undefined。
 */
function mergeCitedTextBlocks(blocks) {
  let merged = [];
  let sawCitationOrSplit = false;
  let offset = 0;
  for (let block of blocks) {
    if (block.type !== "text") {
      merged.push(block);
      continue;
    }
    let last = merged.at(-1);
    let prevText = last?.type === "text" ? last : undefined;
    let prevSpanEnd = prevText === undefined ? 0 : offset;
    offset = prevSpanEnd + countCodePoints(block.text);
    let mapped = (block.citations ?? []).map((citation) =>
      citation.type === "web_search_result_location"
        ? citation
        : {
            ...citation,
            span_start: prevSpanEnd,
            span_end: offset,
          },
    );
    sawCitationOrSplit ||= prevText !== undefined || mapped.length > 0;
    if (prevText !== undefined) merged.pop();
    let citations = [...(prevText?.citations ?? []), ...mapped];
    merged.push({
      ...block,
      text: (prevText?.text ?? "") + block.text,
      citations: citations.length > 0 ? citations : null,
    });
  }
  return sawCitationOrSplit ? merged : undefined;
}
//@ chunk-5xgkngpb.js:2615796-2615975 placement
/**
 * web 搜索相关的内容常量：web_search/server_tool_use、web_search_tool_result、引用位置类型、占位文案与计数初始值。
 */
var WEB_SEARCH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WEB_SEARCH_TOOL_RESULT;
var WEB_SEARCH_RESULT_LOCATION;
var WEB_SEARCH_REMOVED_TEXT;
var ZERO_WEB_SEARCH_REMOVALS;
deferInit("chunk-5xgkngpb.js:2615796", () => {
  WEB_SEARCH = "web_search";
  WEB_SEARCH_TOOL_RESULT = "web_search_tool_result";
  WEB_SEARCH_RESULT_LOCATION = "web_search_result_location";
  WEB_SEARCH_REMOVED_TEXT = "[Web search removed]";
  ZERO_WEB_SEARCH_REMOVALS = Object.freeze({
    toolUses: 0,
    results: 0,
    citations: 0,
    placeholders: 0,
  });
});
//@ chunk-5xgkngpb.js:2615975-2616456 placement
/**
 * 去掉历史 assistant 消息中的 web search 工具调用/结果与引用，必要时补占位块，返回新消息与删除计数。
 */
function stripWebSearchBlocks(messages) {
  if (!messages.some(hasWebSearchContent))
    return {
      messages,
      removed: ZERO_WEB_SEARCH_REMOVALS,
    };
  let mapped = messages.map((message) =>
    message.type === "assistant" && hasWebSearchContent(message)
      ? stripWebSearchFromContent(message.message.content)
      : undefined,
  );
  return {
    messages: messages.map((message, index) => {
      let stripped = mapped[index];
      return stripped === undefined || message.type !== "assistant"
        ? message
        : {
            ...message,
            message: {
              ...message.message,
              content: stripped.content,
            },
          };
    }),
    removed: mapped.reduce(
      (acc, stripped) =>
        stripped === undefined
          ? acc
          : {
              toolUses: acc.toolUses + stripped.counts.toolUses,
              results: acc.results + stripped.counts.results,
              citations: acc.citations + stripped.counts.citations,
              placeholders: acc.placeholders + stripped.counts.placeholders,
            },
      ZERO_WEB_SEARCH_REMOVALS,
    ),
  };
}
//@ chunk-5xgkngpb.js:2616456-2616971 placement
/**
 * 从助手内容中移除网页搜索相关块，必要时插入占位 thinking 块以保持思考块位置合法，并统计工具调用、结果、引用和占位数量。
 */
function stripWebSearchFromContent(blocks) {
  let keptIndices = blocks.flatMap((block, index) => (isRemovableWebSearchBlock(block) ? [] : [index]));
  let rebuiltBlocks = keptIndices.flatMap((keptIndex, order) => {
    let block = dropSearchCitations(blocks[keptIndex]);
    let lastIndex = keptIndices
      .slice(0, order)
      .findLastIndex((keptIndex) => !isSearchCitationBlock(blocks[keptIndex]));
    return (lastIndex === -1 ? 0 : keptIndex - keptIndices[lastIndex] - (order - lastIndex)) > 0 &&
      isThinkingBlockOptional(blocks[keptIndices[lastIndex]]) &&
      isThinkingBlockOptional(block)
      ? [placeholderTextBlock(), block]
      : [block];
  });
  let lastIndex = keptIndices.findLastIndex((keptIndex) => !isSearchCitationBlock(blocks[keptIndex]));
  let needsTrailingPlaceholder =
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
  let finalContent =
    needsTrailingPlaceholder || all ? [...rebuiltBlocks, placeholderTextBlock()] : rebuiltBlocks;
  return {
    content: finalContent,
    counts: {
      toolUses: countWhere(blocks, isWebSearchServerToolUse),
      results: countWhere(blocks, (block) => block?.type === WEB_SEARCH_TOOL_RESULT),
      citations: blocks.reduce((acc, block) => acc + countSearchCitations(block), 0),
      placeholders: finalContent.length - keptIndices.length,
    },
  };
}
//@ chunk-5xgkngpb.js:2616971-2617096 placement
function hasWebSearchContent(message) {
  return (
    message.type === "assistant" &&
    Array.isArray(message.message.content) &&
    message.message.content.some(
      (block) => isRemovableWebSearchBlock(block) || countSearchCitations(block) > 0,
    )
  );
}
//@ chunk-5xgkngpb.js:2617096-2617141 placement
function isRemovableWebSearchBlock(block) {
  return isWebSearchServerToolUse(block) || block?.type === WEB_SEARCH_TOOL_RESULT;
}
//@ chunk-5xgkngpb.js:2617141-2617206 placement
function isWebSearchServerToolUse(block) {
  return block?.type === "server_tool_use" && block.name === WEB_SEARCH;
}
//@ chunk-5xgkngpb.js:2617206-2617281 placement (2.1.88 match: hasThinkingContent, 1)
function isThinkingBlockOptional(m) {
  return m?.type === "thinking" || m?.type === "redacted_thinking";
}
//@ chunk-5xgkngpb.js:2617281-2617319 placement
function isSearchCitationBlock(rebuiltBlock) {
  return rebuiltBlock != null && isFallbackMessage(rebuiltBlock);
}
//@ chunk-5xgkngpb.js:2617319-2617403 placement
function isBlankTextBlock(rebuiltBlock) {
  return (
    rebuiltBlock?.type === "text" && (typeof rebuiltBlock.text !== "string" || !rebuiltBlock.text.trim())
  );
}
//@ chunk-5xgkngpb.js:2617403-2617507 placement
function countSearchCitations(block) {
  return block?.type === "text" && Array.isArray(block.citations)
    ? countWhere(block.citations, (citation) => citation?.type === WEB_SEARCH_RESULT_LOCATION)
    : 0;
}
//@ chunk-5xgkngpb.js:2617507-2617632 placement
function dropSearchCitations(block) {
  if (block?.type !== "text" || countSearchCitations(block) === 0) return block;
  return {
    ...block,
    citations: (block.citations ?? []).filter((citation) => citation?.type !== WEB_SEARCH_RESULT_LOCATION),
  };
}
//@ chunk-5xgkngpb.js:2617632-2617689 placement
function placeholderTextBlock() {
  return {
    type: "text",
    text: WEB_SEARCH_REMOVED_TEXT,
    citations: [],
  };
}
//@ chunk-5xgkngpb.js:2617689-2618164 placement
/**
 * 包装异步迭代器：超过 heartbeatMs 没有新值时产出 ping 事件（静默时长不超过 maxSilentMs 时）。
 */
async function* withHeartbeat(iterator, { maxSilentMs, heartbeatMs = 30000 }) {
  let source = iterator;
  let heartbeatToken = Symbol("heartbeat");
  let pendingNext = null;
  let pendingSince = 0;
  let heartbeatTimer;
  try {
    while (true) {
      if (pendingNext === null) {
        pendingNext = source.next();
        pendingSince = performance.now();
      }
      let promise = new Promise((resolve) => {
        heartbeatTimer = setTimeout((resolve, value) => resolve(value), heartbeatMs, resolve, heartbeatToken);
        heartbeatTimer.unref?.();
      });
      let winner = await Promise.race([pendingNext, promise]);
      clearTimeout(heartbeatTimer);
      heartbeatTimer = undefined;
      if (winner === heartbeatToken) {
        if (performance.now() - pendingSince < maxSilentMs)
          yield {
            type: "stream_event",
            event: {
              type: "ping",
            },
          };
        continue;
      }
      pendingNext = null;
      if (winner.done) return winner.value;
      yield winner.value;
    }
  } finally {
    clearTimeout(heartbeatTimer);
    source.return?.().catch(() => {});
  }
}
//@ chunk-5xgkngpb.js:2618164-2618174 placement
var MAX_HELD_EVENTS = 8;
//@ chunk-5xgkngpb.js:2618174-2618524 placement
/**
 * 包装流式事件：监视并修正护栏产生的游离文本事件，处理出错时停止监视并放出暂存事件，流结束且未中止时补发暂存事件。
 */
async function* fixGuardrailStrayText(source, signal) {
  let state = {
    openTextIndex: undefined,
    hold: undefined,
    watching: true,
  };
  let failure;
  try {
    for await (let event of source) {
      if (!state.watching) {
        yield event;
        continue;
      }
      let heldEvents;
      try {
        heldEvents = stepGuardrailHold(state, event);
      } catch (error) {
        logError(toError(error));
        heldEvents = state.hold?.events ?? [event];
        state.hold = undefined;
        state.watching = false;
      }
      if (heldEvents === undefined) yield event;
      else yield* heldEvents;
    }
  } catch (error) {
    failure = {
      error,
    };
  }
  if (!signal.aborted) yield* state.hold?.events ?? [];
  if (failure !== undefined) throw failure.error;
}
//@ chunk-5xgkngpb.js:2618524-2619881 placement
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
  let withinLimit = hold.events.length <= MAX_HELD_EVENTS;
  let accepts = false;
  switch (event.type) {
    case "content_block_delta":
      accepts = hold.acceptsText && event.index === hold.strayIndex && event.delta?.type === "text_delta";
      break;
    case "content_block_stop":
      accepts = hold.acceptsText && event.index === hold.strayIndex;
      hold.acceptsText = false;
      break;
    case "message_delta":
      accepts = true;
      hold.acceptsText = false;
      break;
    default:
      break;
  }
  if (withinLimit && accepts) return [];
  state.watching = false;
  if (
    !withinLimit ||
    event.type !== "message_stop" ||
    !("amazon-bedrock-guardrailAction" in event) ||
    event["amazon-bedrock-guardrailAction"] !== "INTERVENED"
  ) {
    state.hold = undefined;
    return hold.events;
  }
  let moved = [];
  let stopEmitted = false;
  for (let event of hold.events)
    if (event.type === "content_block_delta")
      moved.push({
        ...event,
        index: hold.targetIndex,
      });
    else if (event.type !== "content_block_stop") {
      if (!stopEmitted) {
        moved.push({
          type: "content_block_stop",
          index: hold.targetIndex,
        });
        stopEmitted = true;
      }
      moved.push(event);
    }
  logForDebugging(
    `Guardrail block text addressed to block ${hold.strayIndex} moved to text block ${hold.targetIndex}`,
  );
  state.hold = undefined;
  return moved;
}
//@ chunk-5xgkngpb.js:2619881-2620082 placement (2.1.88 match: extractErrorTypeFromData, 1)
/**
 * user 消息是否只包含 tool_result 块。
 */
function isToolResultOnlyUserMessage(message) {
  if (message.type !== "user") return false;
  let content = message.message.content;
  if (!Array.isArray(content) || content.length === 0) return false;
  return content.every(
    (block) => typeof block === "object" && block !== null && "type" in block && block.type === "tool_result",
  );
}
//@ chunk-5xgkngpb.js:2620082-2620586 placement
/**
 * 按每个回合的 effort 与时间，在用户消息后插入 api_system 的 output_config（effort、timing），相同的不重复。
 */
function attachPerTurnOutputConfig(messages, options) {
  let { levels, times, answered } = perTurnEffortLevels(messages, options);
  let out = [];
  let lastEffort;
  let outputConfig;
  for (let [index, message] of messages.entries()) {
    if (outputConfig !== undefined && message.type !== "user") {
      lastEffort = outputConfig.effort ?? lastEffort;
      if (message.type === "api_system") {
        out.push({
          ...message,
          outputConfig,
        });
        outputConfig = undefined;
        continue;
      }
      out.push(apiSystemMessageWithOutputConfig(outputConfig));
      outputConfig = undefined;
    }
    out.push(message);
    if (message.type === "user") {
      let isToolResultOnly =
        lastEffort !== undefined && !answered[index] && isToolResultOnlyUserMessage(message);
      let effort =
        levels !== undefined && levels[index] !== lastEffort && !isToolResultOnly
          ? levels[index]
          : outputConfig?.effort;
      let timing = times?.[index];
      outputConfig =
        effort === undefined && timing === undefined
          ? undefined
          : {
              ...(effort !== undefined && {
                effort,
              }),
              ...(timing !== undefined && {
                timing: {
                  type: "now",
                  now: timing,
                },
              }),
            };
    }
  }
  if (outputConfig !== undefined) out.push(apiSystemMessageWithOutputConfig(outputConfig));
  return out;
}
//@ chunk-5xgkngpb.js:2620586-2621300 placement
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
  let { parent } = options;
  let capIndex =
    parent === undefined ? -1 : messages.findLastIndex(({ uuid }) => uuid === parent.forkPointUuid);
  let hasParent = parent !== undefined;
  for (let index = messages.length - 1; index >= 0; index--) {
    let message = messages[index];
    if (message.type === "assistant" && !message.isApiErrorMessage) {
      let turnEffort = message.perTurnEffort === undefined ? message.effort : message.perTurnEffort;
      let isAfterCap = capIndex === -1 ? turnEffort === options.effort : index > capIndex;
      hasTurnEffort = turnEffort != null;
      effort = turnEffort ?? (hasParent && !isAfterCap ? parent?.effort : effort);
      hasParent &&= isAfterCap;
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
//@ chunk-5xgkngpb.js:2621300-2621501 placement
function lastOutputConfig(messages) {
  let config = {};
  for (let message of messages)
    if (message.type === "user") config.now = undefined;
    else if (message.type === "api_system" && message.outputConfig) {
      config.effort = message.outputConfig.effort ?? config.effort;
      config.now = message.outputConfig.timing?.now;
    }
  return config;
}
//@ chunk-5xgkngpb.js:2621501-2621598 placement
function resolveEffortFromLastOutputConfig(messages, fallbackEffort, normalizeEffort) {
  try {
    let { effort } = lastOutputConfig(messages);
    return effort === undefined ? fallbackEffort : normalizeEffort(effort);
  } catch (error) {
    logError(toError(error));
    return fallbackEffort;
  }
}
//@ chunk-5xgkngpb.js:2621598-2621646 placement
function isRealUserMessage(message) {
  return message.type === "user" && !isToolResultOnlyUserMessage(message);
}
//@ chunk-5xgkngpb.js:2621646-2621689 placement
function stripOutputConfigs(messages) {
  return mapOutputConfigs(messages, () => {
    return;
  });
}
//@ chunk-5xgkngpb.js:2621689-2621771 placement
function dropTimingFromOutputConfigs(messages) {
  return mapOutputConfigs(messages, ({ timing, ...rest }) =>
    Object.keys(rest).length > 0 ? rest : undefined,
  );
}
//@ chunk-5xgkngpb.js:2621771-2622048 placement
function mapOutputConfigs(messages, mapConfig) {
  let out = [];
  for (let message of messages) {
    if (message.type !== "api_system" || message.outputConfig === undefined) {
      out.push(message);
      continue;
    }
    let { outputConfig, ...rest } = message;
    let nextConfig = mapConfig(outputConfig);
    if (nextConfig !== undefined)
      out.push({
        ...rest,
        outputConfig: nextConfig,
      });
    else if (rest.message.content.length > 0 || (rest.toolAdditions?.length ?? 0) > 0) out.push(rest);
  }
  return out;
}
//@ chunk-5xgkngpb.js:2622048-2622098 placement
function apiSystemMessageWithOutputConfig(outputConfig) {
  return {
    ...createApiSystemMessage(""),
    outputConfig,
  };
}
//@ chunk-5xgkngpb.js:2622098-2622185 placement
var GMT_TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d)GMT([+-]\d{2}:\d{2})?$/;
//@ chunk-5xgkngpb.js:2622185-2622985 placement
function formatLocalTimestamp(date, timeZone) {
  if (timeZone) {
    try {
      let parts = new Map(
        getDateTimeFormat("en-US", {
          timeZone,
          hourCycle: "h23",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "longOffset",
        })
          .formatToParts(date)
          .map((part) => [part.type, part.value]),
      );
      let match = GMT_TIMESTAMP_RE.exec(
        `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}T${parts.get("hour")}:${parts.get("minute")}:${parts.get("second")}${parts.get("timeZoneName")}`,
      );
      if (match) return `${match[1]}${match[2] ?? "+00:00"}`;
    } catch {}
    logError(
      Error(
        "formatPerTurnNow: could not format the time in the session's time zone; using the process's zone",
      ),
    );
  }
  let pad2 = (value) => String(value).padStart(2, "0");
  let offsetMinutes = -date.getTimezoneOffset();
  let sign = offsetMinutes < 0 ? "-" : "+";
  let absOffsetMinutes = Math.abs(offsetMinutes);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}${sign}${pad2(Math.floor(absOffsetMinutes / 60))}:${pad2(absOffsetMinutes % 60)}`;
}
//@ chunk-5xgkngpb.js:2622985-2623101 placement
function isInvalidEffortError(error) {
  return (
    error instanceof APIError &&
    error.status === 400 &&
    extractNestedErrorMessage(error) === "Invalid effort level" &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_quilt", false)
  );
}
//@ chunk-5xgkngpb.js:2623101-2623356 placement
function effortInPlay(candidateEffort, messagesForAPI) {
  let lastEffort;
  let recentEfforts = [];
  let isRealUser = false;
  for (let message of messagesForAPI) {
    let effort = message.type === "api_system" ? message.outputConfig?.effort : undefined;
    if (effort !== undefined) {
      lastEffort = effort;
      recentEfforts = isRealUser ? [effort] : [...recentEfforts, effort];
    } else if (message.type !== "api_system") {
      isRealUser = isRealUserMessage(message);
      if (isRealUser) recentEfforts = lastEffort === undefined ? [] : [lastEffort];
    }
  }
  return EFFORT_LEVELS.findLast((level) => level === candidateEffort || recentEfforts.includes(level));
}
//@ chunk-5xgkngpb.js:2623356-2623477 placement
function learnedEffortCap(model, querySource) {
  let learnedEffortCaps = getLearnedEffortCaps();
  if (learnedEffortCaps.size === 0 || isAutoModeQuerySource(querySource)) return;
  let level = learnedEffortCaps.get(getModelSettingsKey(model))?.level;
  return level === "xhigh" && !modelSupportsXhighEffort(model) ? "high" : level;
}
//@ chunk-5xgkngpb.js:2623477-2623547 placement
function lowerEffort(level, cap) {
  return cap !== undefined && typeof level === "string" && isEffortHigherThan(level, cap) ? cap : level;
}
//@ chunk-5xgkngpb.js:2623547-2623730 placement
function lowerLearnedEffortCap(resolvedModel, level) {
  let learnedEffortCaps = getLearnedEffortCaps();
  let modelSettingsKey = getModelSettingsKey(resolvedModel);
  let level_2 = learnedEffortCaps.get(modelSettingsKey)?.level;
  let lowerLevel = EFFORT_LEVELS[EFFORT_LEVELS.indexOf(level) - 1];
  if (lowerLevel === undefined) learnedEffortCaps.delete(modelSettingsKey);
  else if (level_2 === undefined || isEffortHigherThan(level_2, lowerLevel))
    learnedEffortCaps.set(modelSettingsKey, {
      level: lowerLevel,
      told: false,
    });
  else return level_2;
  return lowerLevel;
}
//@ chunk-5xgkngpb.js:2623730-2623842 placement
function takeEffortCapNotice(resolvedModel) {
  let modelSettingsKey = getModelSettingsKey(resolvedModel);
  let capEntry = getLearnedEffortCaps().get(modelSettingsKey);
  if (capEntry === undefined || capEntry.told) return false;
  getLearnedEffortCaps().set(modelSettingsKey, {
    ...capEntry,
    told: true,
  });
  return true;
}
//@ chunk-5xgkngpb.js:2623842-2623932 placement
/**
 * 流式护栏暂存增量的上限、哨兵与最后标量缓存：暂存文本最多 8192 字，读取结束用 Symbol 标记。
 */
var MAX_HELD_DELTA_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_LIST;
var READ_ENDED_SENTINEL;
var lastScalarSlot;
deferInit("chunk-5xgkngpb.js:2623842", () => {
  MAX_HELD_DELTA_CHARS = 8192;
  EMPTY_LIST = [];
  READ_ENDED_SENTINEL = Symbol("read ended");
  lastScalarSlot = identity_2(
    {
      value: undefined,
    },
    (slot) => {
      slot.value = undefined;
    },
  );
});
//@ chunk-5xgkngpb.js:2623932-2624215 placement
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
//@ chunk-5xgkngpb.js:2624215-2625894 placement
/**
 * 合并连续的同类流式 delta（text/input_json/thinking）以减少下游事件数：同一块同一类型连续到达时暂存拼接，到下一个 tick 或类型变化时放出；出错时停止合并。
 */
async function* foldStreamDeltas(events, clock, counter, signal) {
  let source = events[Symbol.asyncIterator]();
  let state = {
    held: undefined,
    folded: counter,
  };
  let lastIndex;
  let lastDeltaType;
  let lastAt;
  let pendingNext = null;
  let readEndedRace;
  let readEndedTimer;
  let bookkeepingFailed = false;
  try {
    while (true) {
      pendingNext ??= source.next();
      if (state.held !== undefined && readEndedRace === undefined)
        readEndedRace = new Promise((resolve) => {
          readEndedTimer = setImmediate(resolve, READ_ENDED_SENTINEL);
        });
      let next;
      try {
        next =
          readEndedRace === undefined ? await pendingNext : await Promise.race([pendingNext, readEndedRace]);
      } catch (error) {
        if (!signal.aborted) yield* flushHeldDelta(state);
        throw error;
      }
      if (signal.aborted) {
        state.held = undefined;
        if (next !== READ_ENDED_SENTINEL) return;
      }
      let output;
      if (next === READ_ENDED_SENTINEL) output = flushHeldDelta(state);
      else {
        pendingNext = null;
        if (next.done) {
          yield* flushHeldDelta(state);
          return;
        }
        let event = next.value;
        if (bookkeepingFailed) output = [event];
        else
          try {
            let deltaText;
            if (event.type === "content_block_delta" && typeof event.index === "number") {
              let delta = event.delta;
              switch (delta?.type) {
                case "text_delta":
                  deltaText = typeof delta.text === "string" ? delta.text : undefined;
                  break;
                case "input_json_delta":
                  deltaText = typeof delta.partial_json === "string" ? delta.partial_json : undefined;
                  break;
                case "thinking_delta":
                  deltaText =
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
              if ("research" in event) deltaText = undefined;
            }
            if (event.type !== "content_block_delta" || deltaText === undefined) {
              lastIndex = undefined;
              output = [...flushHeldDelta(state), event];
            } else if (
              event.index !== lastIndex ||
              event.delta.type !== lastDeltaType ||
              clock.lastAt !== lastAt
            ) {
              lastIndex = event.index;
              lastDeltaType = event.delta.type;
              lastAt = clock.lastAt;
              output = [...flushHeldDelta(state), event];
            } else if (state.held === undefined) {
              state.held = {
                last: event,
                text: deltaText,
                deltas: 1,
              };
              output = EMPTY_LIST;
            } else if (state.held.text.length + deltaText.length > MAX_HELD_DELTA_CHARS) {
              output = flushHeldDelta(state);
              state.held = {
                last: event,
                text: deltaText,
                deltas: 1,
              };
            } else {
              state.held.last = event;
              state.held.text += deltaText;
              state.held.deltas += 1;
              output = EMPTY_LIST;
            }
          } catch (error) {
            logError(toError(error));
            logFeatureSad("api_stream_delta_merge", "bookkeeping_threw");
            bookkeepingFailed = true;
            output = state.held?.last === event ? flushHeldDelta(state) : [...flushHeldDelta(state), event];
          }
      }
      if (state.held === undefined && readEndedRace !== undefined) {
        clearImmediate(readEndedTimer);
        readEndedTimer = undefined;
        readEndedRace = undefined;
      }
      for (let event of output) {
        if (signal.aborted) return;
        yield event;
      }
    }
  } finally {
    clearImmediate(readEndedTimer);
    try {
      Promise.resolve(source.return?.(undefined)).catch(() => {});
    } catch {}
  }
}
//@ chunk-5xgkngpb.js:2625894-2626260 placement
/**
 * 放出暂存的合并增量：把多个同类 delta（文本、JSON 片段、思考）的文本合并到最后一个事件里，并累计折叠数量。
 */
function flushHeldDelta(state) {
  let held = state.held;
  if (held === undefined) return [];
  state.held = undefined;
  state.folded.count += held.deltas - 1;
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
//@ chunk-5xgkngpb.js:2626260-2626293 placement
var TENGU_POLISHED_DEWDROP = "tengu_polished_dewdrop";
//@ chunk-5xgkngpb.js:2626293-2626391 placement
function polishedDewdropMode(mode) {
  switch (mode) {
    case "drop":
      return "drop_block";
    case "block":
      return "error";
    default:
      return;
  }
}
//@ chunk-5xgkngpb.js:2626391-2626570 placement
function getPolishedDewdropMode() {
  if (!isFirstPartyApiBackend()) return;
  let clientValue = getCachedClientData()?.[TENGU_POLISHED_DEWDROP];
  let envOrClient =
    env.CLAUDE_CODE_POLISHED_DEWDROP ??
    (clientValue === "drop" || clientValue === "block" || clientValue === "off" ? clientValue : undefined);
  if (envOrClient !== undefined) return polishedDewdropMode(envOrClient);
  return polishedDewdropMode(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_POLISHED_DEWDROP, ""));
}
//@ chunk-5xgkngpb.js:2626570-2626610 placement
function isPolishedDewdropActive(mode) {
  return mode !== undefined || isFirstPartyApiBackend();
}
//@ chunk-5xgkngpb.js:2626610-2626858 sole-consumer
function lowerTurnEffort(
  resolvedModel,
  { effortValue, turnEffort, isEffortPinned, forkPointUuid },
  carriedEffort,
  model,
) {
  if (!isEffortPinned || forkPointUuid === undefined) return;
  try {
    let lowered = lowerEffort(
      resolveEffortValue(resolvedModel, effortValue, {
        turnEffort,
        carriedEffort,
      }),
      model,
    );
    return typeof lowered === "string"
      ? {
          effort: lowered,
          forkPointUuid,
        }
      : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2626858-2627101 sole-consumer
function lastSentEffortSince(messages, anchorUuid, perTurnEffortValue, sentEffort) {
  try {
    let last = messagesSince(messages, anchorUuid).findLast(
      (message) =>
        message.type === "assistant" && !message.isApiErrorMessage && message.perTurnEffort !== undefined,
    );
    return (
      last === undefined ||
      (perTurnEffortValue === null
        ? last.perTurnEffort === null && sentEffort === last.effort
        : last.perTurnEffort !== null)
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-5xgkngpb.js:2633249-2633353 sole-consumer
function mapArray(collection, iteratee) {
  var index = -1;
  var result = isArrayLikeAlias(collection) ? Array(collection.length) : [];
  baseEachInline2Alias(collection, function (value, key, collection) {
    result[++index] = iteratee(value, key, collection);
  });
  return result;
}
//@ chunk-5xgkngpb.js:2633353-2633365 sole-consumer
var mapCollect = mapArray;
//@ chunk-5xgkngpb.js:2633365-2633443 sole-consumer
function sortAndUnwrap(array, comparator) {
  var index = array.length;
  array.sort(comparator);
  while (index--) array[index] = array[index].value;
  return array;
}
//@ chunk-5xgkngpb.js:2633443-2633455 sole-consumer
var sortUnwrap = sortAndUnwrap;
//@ chunk-5xgkngpb.js:2633455-2633706 sole-consumer
function compareAscending(value, other) {
  if (value !== other) {
    var valueIsDefined = value !== undefined;
    var valueIsNull = value === null;
    var valueIsReflexive = value === value;
    var valueIsSymbol = isSymbolAlias(value);
    var otherIsDefined = other !== undefined;
    var otherIsNull = other === null;
    var otherIsReflexive = other === other;
    var otherIsSymbol = isSymbolAlias(other);
    if (
      (!otherIsNull && !otherIsSymbol && !valueIsSymbol && value > other) ||
      (valueIsSymbol && otherIsDefined && otherIsReflexive && !otherIsNull && !otherIsSymbol) ||
      (valueIsNull && otherIsDefined && otherIsReflexive) ||
      (!valueIsDefined && otherIsReflexive) ||
      !valueIsReflexive
    )
      return 1;
    if (
      (!valueIsNull && !valueIsSymbol && !otherIsSymbol && value < other) ||
      (otherIsSymbol && valueIsDefined && valueIsReflexive && !valueIsNull && !valueIsSymbol) ||
      (otherIsNull && valueIsDefined && valueIsReflexive) ||
      (!otherIsDefined && valueIsReflexive) ||
      !otherIsReflexive
    )
      return -1;
  }
  return 0;
}
//@ chunk-5xgkngpb.js:2633706-2633718 sole-consumer
var compareAscending_2 = compareAscending;
//@ chunk-5xgkngpb.js:2633718-2633913 sole-consumer
function compareMultiple(object, other, orders) {
  var index = -1;
  var criteria = object.criteria;
  var criteria_2 = other.criteria;
  var criteriaLength = criteria.length;
  var ordersLength = orders.length;
  while (++index < criteriaLength) {
    var result = compareAscending_2(criteria[index], criteria_2[index]);
    if (result) {
      if (index >= ordersLength) return result;
      var order = orders[index];
      return result * (order == "desc" ? -1 : 1);
    }
  }
  return object.index - other.index;
}
//@ chunk-5xgkngpb.js:2633913-2633925 sole-consumer
var compareMultipleAlias = compareMultiple;
//@ chunk-5xgkngpb.js:2633925-2634242 sole-consumer
function baseOrderBy(collection, iteratees, orders) {
  if (iteratees.length)
    iteratees = import_arrayMap(iteratees, function (iteratee) {
      if (isArrayAlias(iteratee))
        return function (value) {
          return baseGetAlias(value, iteratee.length === 1 ? iteratee[0] : iteratee);
        };
      return iteratee;
    });
  else iteratees = [identityAlias];
  var index = -1;
  iteratees = import_arrayMap(iteratees, baseUnaryAlias(baseIterateeAlias));
  var decorated = mapCollect(collection, function (value, key, collection) {
    var criteria = import_arrayMap(iteratees, function (iteratee) {
      return iteratee(value);
    });
    return {
      criteria,
      index: ++index,
      value,
    };
  });
  return sortUnwrap(decorated, function (left, right) {
    return compareMultipleAlias(left, right, orders);
  });
}
//@ chunk-5xgkngpb.js:2634242-2634254 sole-consumer
var baseOrderByAlias = baseOrderBy;
//@ chunk-5xgkngpb.js:2634254-2634423 sole-consumer
var orderBy; // deferred: uses baseOrderByAlias of its import cycle while loading; runs once the cycle is complete
var orderByAlias;
deferInit("chunk-5xgkngpb.js:2634254", () => {
  orderBy = mergeKeys(function (collection, iteratees) {
    if (collection == null) return [];
    var argCount = iteratees.length;
    if (argCount > 1 && isIterateeCall_2(collection, iteratees[0], iteratees[1])) iteratees = [];
    else if (argCount > 2 && isIterateeCall_2(iteratees[0], iteratees[1], iteratees[2]))
      iteratees = [iteratees[0]];
    return baseOrderByAlias(collection, baseFlattenAlias(iteratees, 1), []);
  });
  orderByAlias = orderBy;
});
//@ chunk-5xgkngpb.js:2634423-2634650 placement
var MAX_SEARCH_RESULTS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SEARCH_RESULT_LOCATION_SCHEMA;
deferInit("chunk-5xgkngpb.js:2634423", () => {
  MAX_SEARCH_RESULTS = 6;
  SEARCH_RESULT_LOCATION_SCHEMA = DoctorLazy(() =>
    objectSchema({
      type: literal("search_result_location"),
      cited_text: stringSchema(),
      source: stringSchema(),
      title: stringSchema().nullable(),
      search_result_index: int_2(),
      start_block_index: int_2(),
      end_block_index: int_2(),
      span_start: int_2().optional(),
      span_end: int_2().optional(),
    }),
  );
});
//@ chunk-5xgkngpb.js:2634650-2636569 placement
/**
 * 发请求前整理消息列表（合并、清理系统消息），受 tengu_jolly_sparrow 开关影响。
 */
function prepareRequestMessages(messages, sourceMessages) {
  if (
    !env.CLAUDE_CODE_WEBSEARCH_CITATIONS ||
    !getFeatureValue_SESSION_PINNED("tengu_jolly_sparrow_enabled", false)
  )
    return messages;
  try {
    let citationsByMessageId = new Map();
    for (let message of sourceMessages) {
      if (message.type !== "assistant") continue;
      for (let block of message.message.content)
        if (block.type === "text" && block.citations?.length) {
          let citations = citationsByMessageId.get(message.message.id) ?? [];
          citationsByMessageId.set(message.message.id, citations);
          citations.push(block);
        }
    }
    if (citationsByMessageId.size === 0) return messages;
    let searchSources = [];
    let toolUseIndexById = new Map();
    let nextToolUseIndex = 0;
    let usedCountById = new Map();
    return messages.map((message) => {
      if (message.type === "api_system" || typeof message.message.content === "string") return message;
      if (message.type === "user") {
        for (let block of orderByAlias(
          message.message.content,
          (block) =>
            (block.type === "tool_result" ? toolUseIndexById.get(block.tool_use_id) : undefined) ?? 1 / 0,
        )) {
          let blocks = block.type === "tool_result" && Array.isArray(block.content) ? block.content : [block];
          for (let item of blocks)
            if (isObjectBlock(item) && item.type === "search_result" && item.citations?.enabled)
              searchSources.push(item.source);
        }
        return message;
      }
      for (let block of message.message.content)
        if (block.type === "tool_use") toolUseIndexById.set(block.id, nextToolUseIndex++);
      let id = message.message.id;
      let remainingCitations = citationsByMessageId.get(id);
      if (remainingCitations === undefined) return message;
      let usedCount =
        (usedCountById.get(id) ?? 0) +
        countWhere(message.message.content, (block) => block.type === "tool_use");
      let startCount = usedCount;
      let out = [];
      for (let block of message.message.content) {
        let matchIndex =
          block.type === "text" && !block.citations?.length && usedCount < MAX_SEARCH_RESULTS
            ? remainingCitations.findIndex((citation) => citation.text === block.text)
            : -1;
        let [matchedCitation] = matchIndex === -1 ? [] : remainingCitations.splice(matchIndex, 1);
        if (block.type !== "text" || matchedCitation === undefined) {
          out.push(block);
          continue;
        }
        let list = Array.from(block.text);
        let spansByStart = new Map();
        for (let citation of matchedCitation.citations ?? []) {
          let parsed = SEARCH_RESULT_LOCATION_SCHEMA().safeParse(citation);
          if (!parsed.success) continue;
          let { span_start: spanStart = 0, span_end: spanEnd = list.length, ...rest } = parsed.data;
          if (searchSources[rest.search_result_index] !== rest.source) continue;
          let span = spansByStart.get(spanStart) ?? {
            end: spanEnd,
            citations: [],
          };
          spansByStart.set(spanStart, span);
          span.citations.push(rest);
        }
        let cursor = 0;
        for (let [spanStart, span] of [...spansByStart].sort((a, b) => a[0] - b[0])) {
          if (
            usedCount >= MAX_SEARCH_RESULTS ||
            spanStart < cursor ||
            span.end <= spanStart ||
            span.end > list.length
          )
            continue;
          usedCount++;
          if (spanStart > cursor)
            out.push({
              ...block,
              text: list.slice(cursor, spanStart).join(""),
            });
          out.push({
            ...block,
            text: list.slice(spanStart, span.end).join(""),
            citations: span.citations,
          });
          cursor = span.end;
        }
        if (cursor === 0) out.push(block);
        else if (cursor < list.length)
          out.push({
            ...block,
            text: list.slice(cursor).join(""),
          });
      }
      usedCountById.set(id, usedCount);
      return usedCount === startCount
        ? message
        : {
            ...message,
            message: {
              ...message.message,
              content: out,
            },
          };
    });
  } catch (error) {
    logError(error);
    return messages;
  }
}
//@ chunk-5xgkngpb.js:2636569-2637126 placement
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
        return mapped.some((item, index) => item !== content[index])
          ? {
              ...block,
              content: mapped,
            }
          : block;
      });
      return mapped.some((block, index) => block !== content[index])
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
//@ chunk-5xgkngpb.js:2637126-2637443 layout
function serverToolChoice(tools, advisorActive, conversation, hasMcpServers) {
  try {
    let advisorDeferredBefore = advisorActive === false && lastAdvisorToolChange(conversation) !== "add";
    return tools.some(
      (tool) =>
        !("input_schema" in tool) &&
        !(
          advisorDeferredBefore &&
          "defer_loading" in tool &&
          tool.defer_loading === true &&
          matchesToolName(tool, ADVISOR_TOOL_NAME)
        ),
    ) || hasMcpServers
      ? {
          type: "none",
        }
      : undefined;
  } catch (error) {
    logError(
      Error("serverToolChoice: could not read the tools, so this request allows no tool calls", {
        cause: error,
      }),
    );
    return {
      type: "none",
    };
  }
}
//@ chunk-5xgkngpb.js:2637443-2637598 placement (2.1.88 match: applyDisplayStyles, 0.545)
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
//@ chunk-5xgkngpb.js:2637681-2637924 placement
function thinkingStartTime(event, now) {
  try {
    if (now === undefined) return;
    return event.type === "message_start" ||
      (event.type === "content_block_start" && event.content_block?.type === "thinking") ||
      (event.type === "content_block_delta" && event.delta?.type === "thinking_delta")
      ? now
      : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2637924-2637955 placement
var TENGU_RUSTLING_PIXEL = "tengu_rustling_pixel";
//@ chunk-5xgkngpb.js:2637955-2638221 placement
function foreignThinkingKeepMode() {
  let warningState = streamFallbackWarning();
  if (warningState.foreignThinkingKeep === undefined) {
    warningState.foreignThinkingKeep = resolveForeignThinkingKeep();
    if (warningState.foreignThinkingKeep === "all") logFeatureOk("api_keep_thinking_on_model_change");
    else if (warningState.foreignThinkingKeep === "upgrade") logFeatureOk("api_keep_thinking_on_upgrade");
  }
  return warningState.foreignThinkingKeep;
}
//@ chunk-5xgkngpb.js:2638221-2638441 placement
function dropForeignThinkingKeep(reason) {
  let warningState = streamFallbackWarning();
  if (warningState.foreignThinkingKeep === "all") logFeatureSad("api_keep_thinking_on_model_change", reason);
  else if (warningState.foreignThinkingKeep === "upgrade")
    logFeatureSad("api_keep_thinking_on_upgrade", reason);
  else return;
  warningState.foreignThinkingKeep = "none";
}
//@ chunk-5xgkngpb.js:2638441-2638522 placement
/**
 * 导出函数 `watchSessionSwitchForThinkingKeep`：返回 onSessionSwitch((e, n) => { if (aes.has(n)) Ws().foreignThinkingKeep = void 0; })。
 */
function watchSessionSwitchForThinkingKeep() {
  return onSessionSwitch((sessionId, resetKind) => {
    if (CONVERSATION_RESET_KINDS.has(resetKind)) streamFallbackWarning().foreignThinkingKeep = undefined;
  });
}
//@ chunk-5xgkngpb.js:2638522-2638909 placement
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
  let clientValue = getCachedClientData()?.[TENGU_RUSTLING_PIXEL];
  if (typeof clientValue === "string") return normalizeThinkingKeep(clientValue);
  return normalizeThinkingKeep(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RUSTLING_PIXEL, "all"));
}
//@ chunk-5xgkngpb.js:2638909-2638966 placement
function normalizeThinkingKeep(value) {
  return value === "all" || value === "none" ? value : "upgrade";
}
//@ chunk-5xgkngpb.js:2638966-2639395 placement
/**
 * 按模型、查询来源和 beta 列表计算请求特性开关：中途 system 消息、工具变更头与内联工具、保留提醒等。
 */
function requestFeatureFlags(conversation, effectiveModel, ctx) {
  let systemTurns =
    isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM) || hasComplianceTaint("hipaa")
      ? false
      : shouldUseMidConvSystem(effectiveModel) || undefined;
  let toolChangeHeader = toolChangeHeaderAllowed(conversation)
    ? true
    : isBetaRejected_2(conversation, BETA_MID_CONV_TOOL_CHANGE) ||
        isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM)
      ? false
      : undefined;
  let keptReminders =
    ctx.keptOn && ctx.betas.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT)
      ? true
      : isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT) ||
          isBetaRejected_2(conversation, BETA_MID_CONVERSATION_SYSTEM) ||
          ctx.betas.includes(BETA_MID_CONVERSATION_SYSTEM)
        ? false
        : undefined;
  let safeguardsFlag;
  return {
    ...(systemTurns !== undefined && {
      systemTurns,
    }),
    ...(toolChangeHeader !== undefined && {
      toolChangeHeader,
      inlineTools: toolChangeHeader && inlineToolsAllowed(conversation),
    }),
    ...(keptReminders !== undefined && {
      keptReminders,
    }),
    ...(safeguardsFlag !== undefined && {
      toolResultSafeguards: safeguardsFlag,
    }),
    ...(conversation.systemMessagesAcceptedBy.has(effectiveModel) && {
      systemTurnsAnsweredBy: effectiveModel,
    }),
  };
}
//@ chunk-5xgkngpb.js:2639395-2639498 placement
function isMidConvSystemForced(model) {
  return (
    !!env.CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM ||
    modelCapabilitiesEnvEntry("mid_conv_system", getCanonicalName(model)) === true
  );
}
//@ chunk-5xgkngpb.js:2708038-2708081 placement
var UNRECOGNIZED_MODEL_MARKER = "[claude-code:unrecognized_model]";
//@ chunk-5xgkngpb.js:2708081-2708532 placement
/**
 * 遇到无法识别的模型名时（每个模型只记一次）记遥测，并在 print 模式下写 stderr，否则写调试日志。
 */
function logUnrecognizedModel(model, querySource) {
  try {
    if (querySource === "model_validation") return;
    if (isUnresolvedInferenceProfile(model)) return;
    let stripped = stripAnyVersatileSuffix(model);
    if (!claimOnce().claim(`unrecognized-model-signal:${stripped}`)) return;
    if (
      isRecognizedModel(model) ||
      isRecognizedModel(stripped) ||
      anyModelDescribed(model, stripped, strippedCanonicalName(model))
    )
      return;
    logEvent("tengu_api_unrecognized_model", {
      model: telemetrySafeModelName(model),
      querySource: agentTypeForTelemetry(querySource),
    });
    let replaced = `${UNRECOGNIZED_MODEL_MARKER} ${jsonStringify({
      model,
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
//@ chunk-5xgkngpb.js:2708532-2708571 placement
var thinkingRelayModuleClaude; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-5xgkngpb.js:2708532", () => {
  thinkingRelayModuleClaude = require("../teleport/relayState.js");
});
//@ chunk-5xgkngpb.js:2708571-2708631 placement
function guardReturning(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    logError(toError(error));
    return fallback;
  }
}
//@ chunk-5xgkngpb.js:2708631-2708724 placement
function noteWaitForMcpServers(tools, querySource) {
  try {
    if (
      classifyQuerySource(querySource) === "main" &&
      isFoamySpringEnabled() &&
      tools.some((tool) => matchesToolName(tool, WAITFORMCPSERVERS))
    )
      markDeclared();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-5xgkngpb.js:2708724-2708784 placement
var ANTHROPIC_DISPATCH_ID = "anthropic-dispatch-id";
var V2S = "v2s";
var V2D = "v2d";
var V2P = "v2p";
//@ chunk-5xgkngpb.js:2708784-2708826 placement
function traceValueOrUnknown(value) {
  return sanitizeMarkName(value) ?? lit_2("unknown");
}
//@ chunk-5xgkngpb.js:2708826-2708836 layout
/**
 * 2：思考签名错误时按错误定位剥离单个 thinking 块的最多尝试次数，超过后整体剥离。
 */
var MAX_SIGNATURE_STRIP_ATTEMPTS = 2;
//@ chunk-5xgkngpb.js:2708836-2709040 layout (2.1.88 match: hasThinkingContent, 0.875)
/**
 * thinking/redacted_thinking 块的稳定键（type:signature 或 type:data）。
 */
function getThinkingBlockKey(m) {
  if (typeof m !== "object" || m === null) return;
  let block = m;
  let key =
    block.type === "thinking" ? block.signature : block.type === "redacted_thinking" ? block.data : undefined;
  return typeof key === "string" && key.length > 0 ? `${block.type}:${key}` : undefined;
}
//@ chunk-5xgkngpb.js:2709040-2709221 layout (2.1.88 match: hasThinkingContent, 1)
/**
 * assistant 消息里 thinking/redacted_thinking 块数。
 */
function countThinkingBlocks(m) {
  let thinkingCount = 0;
  if (m?.type === "assistant" && Array.isArray(m.message.content)) {
    for (let block of m.message.content)
      if (block.type === "thinking" || block.type === "redacted_thinking") thinkingCount++;
  }
  return thinkingCount;
}
//@ chunk-5xgkngpb.js:2709221-2709454 layout
/**
 * 比较剥离前后消息：发送/剥离的思考块数与轮数。
 */
function summarizeThinkingStrip(before, after) {
  let summary = {
    blocksSent: 0,
    turnsSent: 0,
    blocksStripped: 0,
    turnsStripped: 0,
  };
  for (let idx = 0; idx < before.length; idx++) {
    let beforeCount = countThinkingBlocks(before[idx]);
    let strippedCount = beforeCount - countThinkingBlocks(after[idx]);
    summary.blocksSent += beforeCount;
    summary.turnsSent += beforeCount > 0 ? 1 : 0;
    summary.blocksStripped += strippedCount;
    summary.turnsStripped += strippedCount > 0 ? 1 : 0;
  }
  return summary;
}
//@ chunk-5xgkngpb.js:2709454-2710615 fingerprint (2.1.88 match: getExtraBodyParams, 0.429)
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
  for (let betaKey of ["betas", "anthropic_beta"]) {
    if (!(betaKey in result)) continue;
    let filtered = String(result[betaKey])
      .split(",")
      .map((header) => header.trim())
      .filter(Boolean);
    let filtered_2 = filtered.filter((header) => !isAfkModeBeta(header));
    if (filtered_2.length === filtered.length) continue;
    logForDebugging(
      `CLAUDE_CODE_EXTRA_BODY ${betaKey}: dropped afk-mode \u2014 only auto mode itself sends that beta`,
      {
        level: "warn",
      },
    );
    if (filtered_2.length > 0) result[betaKey] = filtered_2;
    else delete result[betaKey];
  }
  let metadata = result.metadata;
  if (isPlainObject_6(metadata) && typeof metadata.user_id === "string") {
    let userId = safeParseJSON(metadata.user_id, false);
    if (isPlainObject_6(userId) && "tk" in userId) {
      let { tk, ...rest } = userId;
      result.metadata = {
        ...metadata,
        user_id: jsonStringify(rest),
      };
    }
  }
  if (betaHeaders && betaHeaders.length > 0) {
    let betaValues = betaHeaderValues(betaHeaders);
    if (result.anthropic_beta && Array.isArray(result.anthropic_beta)) {
      let existingHeaders = result.anthropic_beta;
      let newHeaders = betaValues.filter((header) => !existingHeaders.includes(header));
      result.anthropic_beta = [...existingHeaders, ...newHeaders];
    } else result.anthropic_beta = betaValues;
  }
  if (isProgramUseCaseTurnScoped()) delete result.program_use_case_id;
  return result;
}
//@ chunk-5xgkngpb.js:2710615-2710747 layout
/**
 * Bedrock 等把 beta 放进请求体 anthropic_beta 数组时，追加该 beta 头（已有则不加）。
 */
function addBetaToBodyAnthropicBeta(body, beta, enabled) {
  if (!enabled) return;
  let anthropicBeta = body.anthropic_beta;
  if (Array.isArray(anthropicBeta) && !anthropicBeta.includes(beta.header))
    body.anthropic_beta = [...anthropicBeta, beta.header];
}
//@ chunk-5xgkngpb.js:2710747-2711186 fingerprint (2.1.88 match: getPromptCachingEnabled, 0.798)
/**
 * 是否启用提示词缓存：DISABLE_PROMPT_CACHING 全关；DISABLE_PROMPT_CACHING_HAIKU/SONNET/OPUS/FABLE/MYTHOS 按模型族关闭。
 */
function getPromptCachingEnabled(model) {
  if (env.DISABLE_PROMPT_CACHING) return false;
  if (env.DISABLE_PROMPT_CACHING_HAIKU && isSameModelForRules(model, getDefaultHaikuModel())) return false;
  if (env.DISABLE_PROMPT_CACHING_HAIKU && hasDedicatedSmallFastModel()) {
    let smallFastModel = getSmallFastModel();
    if (
      isSameModelForRules(model, smallFastModel) &&
      !isSameModelForRules(smallFastModel, getMainLoopModel())
    )
      return false;
  }
  if (env.DISABLE_PROMPT_CACHING_SONNET && isSameModelForRules(model, getDefaultSonnetModel())) return false;
  if (env.DISABLE_PROMPT_CACHING_OPUS && isSameModelForRules(model, getDefaultOpusModel())) return false;
  if (
    env.DISABLE_PROMPT_CACHING_FABLE &&
    (isFableModelValue(model) || isSameModelForRules(model, getDefaultFableModel()))
  )
    return false;
  if (env.DISABLE_PROMPT_CACHING_MYTHOS) {
    if (isMythosModelValue(model)) return false;
  }
  return true;
}
//@ chunk-5xgkngpb.js:2711186-2711284 fingerprint (2.1.88 match: getCacheControl, 0.925)
/**
 * 生成 cache_control：{type:"ephemeral"}，可带 ttl（1h）与 scope:"global"。
 */
function getCacheControl({ scope, ttl } = {}) {
  return {
    type: "ephemeral",
    ...(ttl && {
      ttl,
    }),
    ...(scope === "global" && {
      scope,
    }),
  };
}
//@ chunk-5xgkngpb.js:2711284-2711806 fingerprint (2.1.88 match: should1hCacheTTL, 0.302)
/**
 * 决定提示词缓存 TTL：代理覆盖优先；订阅用户且不在超额、模型在 tengu_prompt_cache_1h_config 白名单内用 1h，否则 5m；tengu_tidy_frost 时活跃 5m 缓存保持 5m。
 */
function should1hCacheTTL(
  querySource,
  { agentCacheTtlOverride, ignoreOverage = false, mainThreadModel } = {},
) {
  let ttlSource = querySource === "resume_cache_warm" ? "sdk" : querySource;
  let userEligible = isClaudeAISubscriber();
  let billedAsOverage = userEligible && !ignoreOverage && getCurrentLimits().isUsingOverage === true;
  let promptCacheTtl = resolvePromptCacheTtl(ttlSource, agentCacheTtlOverride, billedAsOverage);
  if (promptCacheTtl !== undefined) return promptCacheTtl;
  if (!userEligible || billedAsOverage)
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
  if (!matchesModelPattern(ttlSource, allowlist))
    return {
      ttl: "5m",
      reason: "default",
    };
  if (
    mainThreadModel !== undefined &&
    isLastMainThreadAskLive(CACHE_TTL_5M_MS, stripModelDateSuffix(mainThreadModel)) &&
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
//@ chunk-5xgkngpb.js:2711806-2711850 layout
/**
 * should1hCacheTTL(...).ttl 是否为 1h。
 */
function isOneHourCacheTtl(querySource, options) {
  return should1hCacheTTL(querySource, options).ttl === "1h";
}
//@ chunk-5xgkngpb.js:2711850-2712326 layout
/**
 * thinking.type=disabled 时去掉 display 等多余键（服务器拒收），首次记 tengu_thinking_disabled_sanitized。
 */
function sanitizeDisabledThinking(thinking, querySource, shouldLog) {
  if (thinking?.type !== "disabled") return thinking;
  let filtered = Object.keys(thinking).filter((key) => key !== "type");
  if (filtered.length === 0) return thinking;
  if (shouldLog) {
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
//@ chunk-5xgkngpb.js:2712326-2712484 fingerprint (2.1.88 match: configureEffortParams, 0.608)
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
//@ chunk-5xgkngpb.js:2712484-2712668 fingerprint (2.1.88 match: configureTaskBudgetParams, 1)
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
//@ chunk-5xgkngpb.js:2712786-2713842 fingerprint (2.1.88 match: verifyApiKey, 0.617)
/**
 * 用一次 max_tokens=1 的 "test" 请求验证 API key（带 withRetry 重试 2 次）；跳过标志为真时直接返回 true；认证错误返回 false。
 */
async function verifyApiKey(apiKey, isNonInteractiveSession, credentials, storageV5) {
  if (isNonInteractiveSession) return true;
  try {
    let model = getBareCheckModel();
    let betas = getModelBetas(model);
    let ok = await returnValue(
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
            ...programUseCaseBody(betas),
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
    return ok;
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
//@ chunk-5xgkngpb.js:2713842-2714253 fingerprint (2.1.88 match: userMessageToMessageParam, 0.665)
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
      let content = dropEmptyTextBlocks(message.message.content);
      return {
        role: "user",
        content: content.map((block, i) => ({
          ...block,
          ...(i === content.length - 1
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
//@ chunk-5xgkngpb.js:2714253-2714485 layout
/**
 * 去掉空白 text 块；全空时返回一个 "(no content)" 文本块。
 */
function dropEmptyTextBlocks(content) {
  let filtered;
  for (let idx = 0; idx < content.length; idx++) {
    let block = content[idx];
    if (block.type === "text" && (typeof block.text !== "string" || block.text.trim() === ""))
      filtered ??= content.slice(0, idx);
    else filtered?.push(block);
  }
  if (filtered === undefined) return [...content];
  return filtered.length > 0
    ? filtered
    : [
        {
          type: "text",
          text: NO_CONTENT_MESSAGE,
        },
      ];
}
//@ chunk-5xgkngpb.js:2714485-2714567 layout
/**
 * echoApiBlockOrder 开启时按 API 原始块顺序重排 assistant 内容（gJe），出错记日志返回原值。
 */
function applyApiBlockOrderEcho(messages, echoApiBlockOrder, preserveTrailingThinking) {
  if (!echoApiBlockOrder) return messages;
  try {
    return reorderByApiBlockIndex(messages, preserveTrailingThinking);
  } catch (error) {
    logError(toError(error));
    return messages;
  }
}
//@ chunk-5xgkngpb.js:2714567-2714952 callgraph-fingerprint (2.1.88 match: assistantMessageToMessageParam, 0.411)
/**
 * 内部 assistant 消息转 API MessageParam；需要缓存断点时给最后一个非 thinking 块加 cache_control。
 */
function assistantMessageToMessageParam(
  message,
  addCache = false,
  enablePromptCaching,
  ttl,
  whitespaceTextUnstampable,
) {
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
        content: message.message.content.map((block, i) => ({
          ...block,
          ...(i === message.message.content.length - 1 &&
          isRenderableContentBlock(block, whitespaceTextUnstampable)
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
//@ chunk-5xgkngpb.js:2714952-2715132 layout
/**
 * 调用 options.onMediaStripped 观察者（媒体剥离重试时），异常只告警。
 */
function notifyMediaStripped(options, kind, detail) {
  if (!options.onMediaStripped) return;
  try {
    options.onMediaStripped(kind, detail);
  } catch (error) {
    logForDebugging(
      `onMediaStripped observer threw; continuing the media-strip retry: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-5xgkngpb.js:2715132-2715224 layout
/**
 * 主线程主查询返回 main_thread，否则 other。
 */
function getRequestRouteKind(options) {
  return isMainAgent(options.agentContext) && classifyQuerySource(options.querySource) === "main"
    ? "main_thread"
    : "other";
}
//@ chunk-5xgkngpb.js:2715224-2715735 fingerprint (2.1.88 match: queryModelWithoutStreaming, 0.788)
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
  let requestOptions = {
    ...options,
    model: unlessManagedDeniedModel(options.model),
  };
  let assistantMessage;
  for await (let message of joinWebSearchCitationTexts(
    withStreamVCR(messages, async function* () {
      yield* recoverRegimeRefusal(tools, signal, (tools) =>
        queryModelWithToolSearchRecovery(
          messages,
          systemPrompt,
          thinkingConfig,
          tools,
          signal,
          requestOptions,
        ),
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
    requestOptions.model === getSmallFastModel() &&
    requestOptions.model !== getMainLoopModel()
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
//@ chunk-5xgkngpb.js:2715735-2716041 fingerprint (2.1.88 match: queryModelWithStreaming, 0.532)
/**
 * 主循环的 deps.callModel：流式产出 queryModel 的事件；FallbackTriggeredError 转成 {type:"model_fallback_triggered"} 事件交给 queryLoop 换模型。
 */
async function* queryModelWithStreaming(
  { messages, systemPrompt, thinkingConfig, tools, signal, options },
  emitPlainDelta,
) {
  try {
    return yield* joinWebSearchCitationTexts(
      withStreamVCR(messages, async function* () {
        yield* recoverRegimeRefusal(tools, signal, (tools) =>
          queryModelWithToolSearchRecovery(
            messages,
            systemPrompt,
            thinkingConfig,
            tools,
            signal,
            options,
            isVcrEnabled() ? undefined : emitPlainDelta,
          ),
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
//@ chunk-5xgkngpb.js:2716041-2716178 fingerprint (2.1.88 match: shouldDeferLspTool, 1)
/**
 * LSP 工具在 LSP 尚未连接（pending/not-started）时延迟加载。
 */
function shouldDeferLspTool(tool) {
  if (!("isLsp" in tool) || !tool.isLsp) return false;
  if (hasLspEverConnected()) return false;
  let status = getInitializationStatus();
  return status.status === "pending" || status.status === "not-started";
}
//@ chunk-5xgkngpb.js:2716178-2716192 layout
/**
 * 90000：带静默重试的重试生成器 maxSilentMs = 等待上限 + 此值。
 */
var SILENT_RETRY_EXTRA_MS = 90000;
//@ chunk-5xgkngpb.js:2716192-2716302 layout
/**
 * 非流式请求超时：API_TIMEOUT_MS（上限 int32）或远程 120s/本地 300s。
 */
function getNonStreamingRequestTimeoutMs() {
  let apiTimeoutMs = getApiTimeoutMs();
  if (apiTimeoutMs !== undefined && apiTimeoutMs > 0) return Math.min(apiTimeoutMs, MAX_TIMER_DELAY_MS);
  return env.CLAUDE_CODE_REMOTE ? 120000 : 300000;
}
//@ chunk-5xgkngpb.js:2716302-2716632 layout
/**
 * verbose 日志级别时打印请求的 model/thinking/output_config/temperature/betas。
 */
function logApiRequestDetail(params) {
  if (getMinDebugLogLevel() !== "verbose") return;
  logForDebugging(
    `[API REQUEST DETAIL] ${jsonStringify({
      model: params.model,
      thinking: params.thinking,
      output_config: params.output_config,
      stated_effort: params.messages
        ?.map((message) => message.output_config)
        .findLast((outputConfig) => outputConfig?.effort !== undefined)?.effort,
      temperature: params.temperature,
      betas: params.betas ?? [],
      anthropic_beta: params.anthropic_beta,
    })}`,
    {
      level: "verbose",
    },
  );
}
//@ chunk-5xgkngpb.js:2716632-2716860 layout
/**
 * 生成 x-client-request-id（第一方时）和 traceparent 头，并记录本次尝试。
 */
function buildRequestTraceHeaders(span, attempt) {
  let hitsBackend = hitsAnthropicBackend();
  let clientRequestId = hitsBackend ? randomUUID() : undefined;
  let traceparent =
    (span && (hitsBackend || env.CLAUDE_CODE_PROPAGATE_TRACEPARENT) ? getSpanId(span) : undefined) ??
    getUpstreamTraceparent();
  recordLlmRequestAttempt(span, {
    attempt,
    clientRequestId,
  });
  return {
    headers: {
      ...(clientRequestId && {
        [CLIENT_REQUEST_ID_HEADER]: clientRequestId,
      }),
      ...(traceparent && {
        traceparent,
      }),
    },
    clientRequestId,
  };
}
//@ chunk-5xgkngpb.js:2716860-2717019 layout
/**
 * 按端点设置 x-cc-/x-claude-code- 的 context-compacted 与 compaction-request 头。
 */
function setCompactionHeaders(headers, contextCompacted, compactionRequest) {
  if (contextCompacted === undefined && compactionRequest === undefined) return;
  let isFirstParty = isFirstPartyApiBackend();
  let sendGatewayHints = shouldSendGatewayHintHeaders();
  if (contextCompacted !== undefined) {
    if (isFirstParty) headers[X_CC_CONTEXT_COMPACTED] = contextCompacted;
    if (sendGatewayHints) headers[X_CLAUDE_CODE_CONTEXT_COMPACTED] = contextCompacted;
  }
  if (compactionRequest !== undefined) {
    if (isFirstParty) headers[X_CC_COMPACTION_REQUEST] = compactionRequest;
    if (sendGatewayHints) headers[X_CLAUDE_CODE_COMPACTION] = compactionRequest;
  }
}
//@ chunk-5xgkngpb.js:2717019-2717067 layout
/**
 * 设置 x-claude-code-prev-tool-durations 头。
 */
function setPrevToolDurationsHeader(headers, durations) {
  if (durations !== undefined && shouldSendGatewayHintHeaders())
    headers[X_CLAUDE_CODE_PREV_TOOL_DURATIONS] = durations;
}
//@ chunk-5xgkngpb.js:2717067-2717267 layout
/**
 * 请求分派版本：CLAUDE_CODE_DISPATCH_V2D 或 tengu_dreamy_frost → v2d；非 auxiliary 且 V2S/tengu_cedar_lattice → v2s；否则 null。
 */
function getDispatchVersion(querySourceCategory) {
  if (antEnv.CLAUDE_CODE_DISPATCH_V2D ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_dreamy_frost", false))
    return V2D;
  if (querySourceCategory === "auxiliary") return null;
  if (antEnv.CLAUDE_CODE_DISPATCH_V2S ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_cedar_lattice", false))
    return V2S;
  return null;
}
//@ chunk-5xgkngpb.js:2717267-2717488 layout
/**
 * 每进程一次记录 API 路由（状态、头）诊断事件。
 */
function logApiRouteObserved(response, incrementalRequestBody) {
  if (response === undefined || !streamFallbackWarning().once("api_route_observed")) return;
  let { status, headers } = response;
  logForDiagnosticsNoPII("info", "cli_api_route_observed", () => ({
    response: describeResponseHeaders(status, headers),
    route: connectionSetupFacts(),
    incremental_request_body: incrementalRequestBody,
    gzip_blocks_mode: getGzipRequestBodyBlocksMode(),
  }));
}
//@ chunk-5xgkngpb.js:2717488-2717618 layout
/**
 * 看起来像 JSON 的字符串尝试解析，失败原样返回。
 */
function tryParseJsonString(value) {
  let trimmed = typeof value === "string" ? value.trim() : undefined;
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return value;
  try {
    return jsonParse(trimmed);
  } catch {
    return value;
  }
}
//@ chunk-5xgkngpb.js:2717618-2720923 callgraph-witnessed (2.1.88 match: executeNonStreamingRequest, 0.292)
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
      let accountEpoch = getLimitsAccountEpoch();
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
      let cancelTimeout = clock.setTimeout(() => abortController.abort(), fallbackTimeoutMs, {
        unref: true,
      });
      try {
        let result = await anthropic.beta.messages
          .create(
            {
              ...inlineToolReferences(deferredToolNameOf(adjustedParams)),
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
        logApiRouteObserved(result.response, false);
        let message = tryParseJsonString(result.data);
        if (message !== result.data) {
          logForDebugging("Non-streaming fallback: parsed a JSON body served under a non-JSON content-type");
          logForDiagnosticsNoPII("info", "cli_nonstreaming_fallback_text_body_parsed");
        }
        if (!isValidAPIMessage(message))
          throw new UnexpectedApiResponseError({
            data: message,
            status: result.response?.status,
            headers: result.response?.headers,
            originating: originatingRequestId,
          });
        translateMessageToolNames(message);
        let headers_2 = result.response?.headers;
        if (retryOptions.lowPriorityWait) recordLowPriorityServed(retryOptions.lowPriorityWait);
        if (headers_2 && !clientOptions.leavesLimitStateAlone) {
          let longContext =
            (has1mSuffix_2(retryOptions.model) || modelHasNative1MContext(retryOptions.model)) &&
            (message.usage?.input_tokens ?? 0) +
              (message.usage?.cache_read_input_tokens ?? 0) +
              (message.usage?.cache_creation_input_tokens ?? 0) >
              SECONDARY_CONTEXT_WINDOW;
          let quotaStatusFromHeaders = extractQuotaStatusFromHeaders(
            headers_2,
            retryOptions.model,
            longContext,
            clock.now(),
            accountEpoch,
            clientOptions.storageV5,
          );
          if (quotaStatusFromHeaders && clientOptions.queryTracking) {
            clientOptions.queryTracking.billedToUsageCredits = quotaStatusFromHeaders.overageInUse === true;
            clientOptions.queryTracking.longContextBilled = longContext;
          }
        }
        let creditCode = readFallbackCreditToken(message.stop_details);
        {
          let stopDetails = message.stop_details;
          if (stopDetails && "fallback_credit_token" in stopDetails) delete stopDetails.fallback_credit_token;
        }
        return {
          message,
          requestId: amazonRequestId(result.request_id, headers_2),
          headers: headers_2,
          creditCode,
        };
      } catch (err) {
        let error =
          isAbortError(err) && abortController.signal.aborted && !retryOptions.signal.aborted
            ? new APIConnectionTimeoutError()
            : err;
        if (error instanceof APIUserAbortError) throw error;
        logForDiagnosticsNoPII("error", "cli_nonstreaming_fallback_error", () => ({
          ...classifyApiErrorKind(error, classifyAPIError(error)),
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
            error instanceof Error
              ? (sanitizedErrorNameForTelemetry(error) ?? lit_2("Error"))
              : lit_2("unknown"),
          attempt: attempt_2,
          timeout_ms: fallbackTimeoutMs,
          request_id: originatingRequestId?.analyticsRequestId ?? lit_2("unknown"),
        });
        throw error;
      } finally {
        cancelTimeout();
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
//@ chunk-5xgkngpb.js:2721066-2721096 placement
function promptIdForMessages(messages) {
  return getPromptId(messages);
}
//@ chunk-5xgkngpb.js:2721096-2721219 placement
/**
 * 取请求所属的提示 id：优先解析自身，失败或为空时在子代理上下文中使用父提示 id。
 */
function promptIdForRequest(messages, agentContext) {
  let promptId;
  try {
    promptId = promptIdForMessages(messages);
  } catch (error) {
    logError(toError(error));
    promptId = undefined;
  }
  return (
    promptId ??
    (isSubagentContext(agentContext) && !agentContext.isMainSession ? agentContext.parentPromptId : undefined)
  );
}
//@ chunk-5xgkngpb.js:2721219-2721278 placement
function turnOriginSafe(messages) {
  try {
    return getTurnOrigin(messages);
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2721278-2721337 placement
function turnPositionSafe(messages) {
  try {
    return getTurnPosition(messages);
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2721337-2721457 placement
function memoryToolNames(messages, tools) {
  return memoryRedactionIndex(
    getRootSession().host,
    messages,
    new Set(
      tools
        .filter((tool) => isLiveMemoryTool(tool) || tool.mcpInfo?.accountMemory === true)
        .map((tool) => tool.name),
    ),
  );
}
//@ chunk-5xgkngpb.js:2721457-2721610 placement
function applyThreadBody(body, threadBody) {
  if (!("thread" in body)) return body;
  let { thread, ...rest } = body;
  return {
    ...rest,
    messages: threadBody.messages,
    system: threadBody.system,
    ...(threadBody.tools !== undefined && {
      tools: threadBody.tools,
    }),
  };
}
//@ chunk-5xgkngpb.js:2721610-2721832 placement
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
//@ chunk-5xgkngpb.js:2721832-2721962 placement
function isSubagentCacheEvictEnabled() {
  if (!canSendFirstPartyBetas() || !hitsAnthropicBackend()) return false;
  if (env.CLAUDE_CODE_SUBAGENT_CACHE_EVICT) return true;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_subagent_cache_evict", false);
}
//@ chunk-5xgkngpb.js:2721962-2722040 layout (2.1.88 match: isMedia, 1)
/**
 * 对象块且类型为 image/document。
 */
function isMediaBlock(block) {
  return (
    isObjectBlock(block) &&
    (block.type === "image" || (block.type === "document" && !countUserPromptsInMessages_2(block)))
  );
}
//@ chunk-5xgkngpb.js:2722040-2722093 layout
/**
 * base64 媒体块的 data 长度，否则 0。
 */
function base64MediaLength(block) {
  return isBase64ImageBlock_3(block) ? block.source.data.length : 0;
}
//@ chunk-5xgkngpb.js:2722093-2722146 file-local
/**
 * 对象块且 type=tool_result。
 */
function isToolResultBlock_2(block) {
  return isObjectBlock(block) && block.type === "tool_result";
}
//@ chunk-5xgkngpb.js:2722146-2722190 layout
/**
 * "[media removed: request limit]" 占位文本块。
 */
function mediaRemovedPlaceholder() {
  return {
    type: "text",
    text: MEDIA_REMOVED_PLACEHOLDER,
  };
}
//@ chunk-5xgkngpb.js:2722190-2722389 file-local
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
        toRemove += countWhere(block.content, isMediaBlock);
  }
  return toRemove;
}
//@ chunk-5xgkngpb.js:2722389-2724253 layout
/**
 * 按数量上限与总字节上限从最旧开始移除媒体块（tool_result 内的换成占位文本），用于请求媒体数量/大小限制。
 */
function stripExcessMediaItems(
  messages,
  maxMediaItems,
  reservedItems = 0,
  mediaTotalByteCap = 1 / 0,
  reservedBytes = 0,
  documentByteCap = 1 / 0,
  mediaTakenOut,
) {
  let byteLengths = [];
  let documentBytes = [];
  let unsentIndices = new Set();
  for (let message of messages) {
    if (!Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (isMediaBlock(block)) {
        let unsentByteLength = unsentMediaByteLength(block);
        if (unsentByteLength !== undefined) unsentIndices.add(byteLengths.length);
        byteLengths.push(unsentByteLength ?? base64MediaLength(block));
        documentBytes.push(block.type === "document" ? byteLengths.at(-1) : 0);
      } else if (isToolResultBlock_2(block) && Array.isArray(block.content)) {
        for (let nestedBlock of block.content)
          if (isMediaBlock(nestedBlock)) {
            let unsentByteLength = unsentMediaByteLength(nestedBlock);
            if (unsentByteLength !== undefined) unsentIndices.add(byteLengths.length);
            byteLengths.push(unsentByteLength ?? base64MediaLength(nestedBlock));
            documentBytes.push(nestedBlock.type === "document" ? byteLengths.at(-1) : 0);
          }
      }
  }
  let removedIndices = new Set();
  let keptIndices = [];
  let max = Math.max(0, maxMediaItems - reservedItems);
  let totalBytes = 0;
  let documentBytesTotal = 0;
  let capTriggered = false;
  let documentCapTriggered = false;
  let documentCapped = documentByteCap > 0 && documentByteCap < mediaTotalByteCap;
  for (let [index, bytes] of byteLengths.entries()) {
    keptIndices.push(index);
    totalBytes += bytes;
    documentBytesTotal += documentBytes[index];
    if (keptIndices.length > maxMediaItems)
      for (let index of keptIndices.splice(0, keptIndices.length - max)) {
        removedIndices.add(index);
        totalBytes -= byteLengths[index];
        documentBytesTotal -= documentBytes[index];
      }
    if (documentCapped && documentBytesTotal > documentByteCap) {
      capTriggered = true;
      documentCapTriggered = true;
      for (
        let index = 0;
        index < keptIndices.length && documentBytesTotal > documentByteCap - reservedBytes;
      ) {
        let docItemIndex = keptIndices[index];
        if (documentBytes[docItemIndex] === 0) {
          index++;
          continue;
        }
        keptIndices.splice(index, 1);
        removedIndices.add(docItemIndex);
        totalBytes -= byteLengths[docItemIndex];
        documentBytesTotal -= documentBytes[docItemIndex];
      }
    }
    if (mediaTotalByteCap > 0 && totalBytes > mediaTotalByteCap) {
      capTriggered = true;
      for (let index = 0; index < keptIndices.length && totalBytes > mediaTotalByteCap - reservedBytes;) {
        let mediaItemIndex = keptIndices[index];
        if (byteLengths[mediaItemIndex] === 0) {
          index++;
          continue;
        }
        keptIndices.splice(index, 1);
        removedIndices.add(mediaItemIndex);
        totalBytes -= byteLengths[mediaItemIndex];
        documentBytesTotal -= documentBytes[mediaItemIndex];
      }
    }
  }
  for (let index of unsentIndices) removedIndices.add(index);
  if (removedIndices.size === 0) return messages;
  let mediaIndex = 0;
  let mapped = messages.map((message) => {
    let content = message.message.content;
    if (!Array.isArray(content)) return message;
    let stripped = false;
    let keptBlocks = [];
    for (let block of content)
      if (isMediaBlock(block)) {
        let mediaIndexInBlock = mediaIndex++;
        if (removedIndices.has(mediaIndexInBlock)) {
          stripped = true;
          if (!unsentIndices.has(mediaIndexInBlock)) mediaTakenOut?.push(block);
        } else keptBlocks.push(block);
      } else if (isToolResultBlock_2(block) && Array.isArray(block.content)) {
        let removedInToolResult = false;
        let content = block.content.map((item) => {
          if (!isMediaBlock(item)) return item;
          let mediaIndexInItem = mediaIndex++;
          if (!removedIndices.has(mediaIndexInItem)) return item;
          removedInToolResult = true;
          if (!unsentIndices.has(mediaIndexInItem)) mediaTakenOut?.push(item);
          return mediaRemovedPlaceholder();
        });
        stripped ||= removedInToolResult;
        keptBlocks.push(
          removedInToolResult
            ? {
                ...block,
                content,
              }
            : block,
        );
      } else keptBlocks.push(block);
    if (!stripped) return message;
    return {
      ...message,
      message: {
        ...message.message,
        content: keptBlocks.length > 0 ? keptBlocks : [mediaRemovedPlaceholder()],
      },
    };
  });
  if (capTriggered) {
    let removedBytes = 0;
    let removedDocumentBytes = 0;
    for (let index of removedIndices) {
      removedBytes += byteLengths[index];
      removedDocumentBytes += documentBytes[index];
    }
    logEvent("tengu_media_byte_cap_stripped", {
      totalBytes: byteLengths.reduce((acc, bytes) => acc + bytes, 0),
      totalDocumentBytes: documentBytes.reduce((acc, bytes) => acc + bytes, 0),
      byteLimit: mediaTotalByteCap,
      documentByteLimit: documentByteCap,
      documentCapTriggered,
      removedCount: removedIndices.size,
      removedBytes,
      removedDocumentBytes,
    });
  }
  return mapped;
}
//@ chunk-5xgkngpb.js:2724253-2724295 layout
/**
 * 媒体字节上限 GrowthBook 值的 schema。
 */
var mediaByteCapSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2724253", () => {
  mediaByteCapSchema = DoctorLazy(() => union([literal(0), int_2().min(2 * MEDIA_BYTE_CAP_MIN)]));
});
//@ chunk-5xgkngpb.js:2724295-2724375 layout
/**
 * 读 GrowthBook 数值开关并校验。
 */
function readMediaByteCapFlag(flagName) {
  let parsed = mediaByteCapSchema().safeParse(getFeatureValue_CACHED_MAY_BE_STALE(flagName, null));
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-5xgkngpb.js:2724375-2724517 layout
/**
 * 请求媒体总字节上限（tengu_keen_pudding / tengu_media_byte_cap）。
 */
function getMediaTotalByteCap() {
  let flag = readMediaByteCapFlag("tengu_keen_pudding") || readMediaByteCapFlag("tengu_media_byte_cap");
  if (flag === undefined)
    return hitsAnthropicBackend() ? MEDIA_TOTAL_BYTES_ANTHROPIC : MEDIA_TOTAL_BYTES_DEFAULT;
  return hitsAnthropicBackend() ? flag : Math.min(flag, MEDIA_TOTAL_BYTES_ANTHROPIC);
}
//@ chunk-5xgkngpb.js:2724517-2724588 layout
/**
 * 文档字节上限（tengu_golden_dove），仅 qae() 时生效。
 */
function getDocumentByteCap() {
  if (!hitsAnthropicBackend()) return 0;
  return readMediaByteCapFlag("tengu_golden_dove") || DOCUMENT_TOTAL_BYTES_DEFAULT;
}
//@ chunk-5xgkngpb.js:2724588-2724620 layout
/**
 * 1e4：withStreamHeartbeat 默认心跳间隔；另两个 2e4/45e3 是流停顿余量（qae() 时 20s，否则 45s）。
 */
var STREAM_HEARTBEAT_MS = 1e4;
var STREAM_STALL_MARGIN_FIRST_PARTY_MS = 20000;
var STREAM_STALL_MARGIN_MS = 45000;
//@ chunk-5xgkngpb.js:2724620-2724689 layout
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
//@ chunk-5xgkngpb.js:2724689-2724769 layout
/**
 * tool_use/server_tool_use/mcp_tool_use。
 */
var MAX_STREAM_STALL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_PING_EVENTS_RESETTING_IDLE;
var TOOL_USE_BLOCK_TYPES;
deferInit("chunk-5xgkngpb.js:2724689", () => {
  MAX_STREAM_STALL_MS = 90000;
  MAX_PING_EVENTS_RESETTING_IDLE = 30;
  TOOL_USE_BLOCK_TYPES = new Set(["tool_use", "server_tool_use", "mcp_tool_use"]);
});
//@ chunk-5xgkngpb.js:2724769-2725407 layout
/**
 * 包装 SSE 迭代器：超过间隔无事件但 lastAt 前进时插入 {type:"ping"}。
 */
async function* withStreamHeartbeat(
  source,
  activityClock,
  heartbeatMs = STREAM_HEARTBEAT_MS,
  clock = systemClock,
  heartbeatFloorMs = 0,
) {
  if (!activityClock) {
    yield* source;
    return;
  }
  let slackMs = clipSlackMs(heartbeatFloorMs, heartbeatMs / 10);
  let sourceIterator = source[Symbol.asyncIterator]();
  let lastAt = clock.monotonicNow();
  let pendingNext = null;
  let heartbeatToken = Symbol("heartbeat");
  let heartbeatPromise;
  let heartbeatStartMonotonicMs = 0;
  let heartbeatStartWallMs = 0;
  let timer;
  try {
    while (true) {
      pendingNext ??= sourceIterator.next();
      if (
        heartbeatPromise === undefined ||
        timer === undefined ||
        !slackStillFresh(clock, heartbeatStartMonotonicMs, heartbeatStartWallMs, slackMs)
      ) {
        timer?.();
        if (slackMs > 0) {
          heartbeatStartMonotonicMs = clock.monotonicNow();
          heartbeatStartWallMs = clock.now();
        }
        heartbeatPromise = new Promise((resolve) => {
          timer = clock.setTimeout(
            () => {
              if (slackMs > 0) timer = undefined;
              resolve(heartbeatToken);
            },
            heartbeatMs,
            {
              unref: true,
            },
          );
        });
      }
      let winner = await Promise.race([pendingNext, heartbeatPromise]);
      if (slackMs === 0) {
        timer?.();
        timer = undefined;
      }
      if (winner === heartbeatToken) {
        if (activityClock.lastAt > lastAt) {
          lastAt = clock.monotonicNow();
          yield {
            type: "ping",
          };
        }
        continue;
      }
      pendingNext = null;
      if (winner.done) return;
      lastAt = clock.monotonicNow();
      yield winner.value;
    }
  } finally {
    timer?.();
    try {
      Promise.resolve(sourceIterator.return?.(undefined)).catch(() => {});
    } catch {}
  }
}
//@ chunk-5xgkngpb.js:2725407-2725548 layout
/**
 * 非第一方/假定第一方/自定义 ANTHROPIC_BASE_URL/非 OAuth 时为真；否则看组织额度状态。用于 fallback credit 端点判断。
 */
function isFirstPartyCreditEndpoint(provider = getAPIProvider()) {
  if (
    provider !== "firstParty" ||
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
//@ chunk-5xgkngpb.js:2725548-2725669 layout
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
//@ chunk-5xgkngpb.js:2725669-2725921 layout
/**
 * bedrock/vertex/mantle/anthropicGoogleCloud 是否未设自定义 base URL。
 */
function usesDefaultProviderEndpoint(provider) {
  switch (provider) {
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
//@ chunk-5xgkngpb.js:2725921-2726194 layout
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
//@ chunk-5xgkngpb.js:2726194-2726540 layout
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
//@ chunk-5xgkngpb.js:2726540-2726923 layout
/**
 * 从 api_system 消息的 toolAdditions/toolRemovals 里去掉 advisor 工具。
 */
function dropAdvisorFromApiSystem(messages) {
  return messages.map((message) => {
    if (message.type !== "api_system") return message;
    let filtered = message.toolAdditions?.filter((toolAddition) => toolAddition !== ADVISOR_TOOL_NAME);
    let filtered_2 = message.toolRemovals?.filter((toolRemoval) => toolRemoval !== ADVISOR_TOOL_NAME);
    if (
      filtered?.length === message.toolAdditions?.length &&
      filtered_2?.length === message.toolRemovals?.length
    )
      return message;
    let { toolAdditions, toolRemovals, ...rest } = message;
    return {
      ...rest,
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
//@ chunk-5xgkngpb.js:2726923-2726955 layout
/**
 * 消息含 advisor 相关块（sJe 计数 >0）。
 */
function hasAdvisorBlocks(message) {
  return countThinkingBlocks(message) > 0;
}
//@ chunk-5xgkngpb.js:2726955-2727145 layout
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
//@ chunk-5xgkngpb.js:2727145-2730632 layout
/**
 * 请求前消息规整：剥离 tool_reference/caller（无工具搜索时）、修复 tool_use/tool_result 配对、去 advisor 块、可选去 web search、媒体数量上限，然后 normalizeMessagesForAPI 并处理思考签名。返回 messagesForAPI 与多个降级回调。
 */
function normalizeMessagesForRequest(inputMessages, normalizeOptions, onNormalizeStage) {
  let modelName = normalizeOptions.bodyModel ?? normalizeOptions.model;
  let baseModelName = stripAnyVersatileSuffix(modelName);
  let keepForeignThinking = normalizeOptions.keepForeignThinking ?? "none";
  let strippedMessages = stripForeignModelThinking(inputMessages, baseModelName, keepForeignThinking);
  let foreignModelChecker = makeForeignModelChecker(baseModelName);
  let keptForeignSignatures =
    keepForeignThinking !== "none" &&
    inputMessages.some(
      (message) =>
        message.type === "assistant" &&
        foreignModelChecker(message) &&
        shouldKeepForeignThinking(message, baseModelName, keepForeignThinking) &&
        Array.isArray(message.message.content) &&
        message.message.content.some(hasThinkingSignature),
    );
  let hasLargeContext =
    uses1mContext(modelName, undefined) ||
    modelHasNative1MContext(modelName) ||
    normalizeOptions.betas.includes(BETA_LONG_CONTEXT) ||
    getSonnet46ContextWindowOverride(modelName) !== null ||
    antGrants1MContext(modelName);
  let reminderFold = resolveReminderFold_2(inputMessages, normalizeOptions.reminderFold);
  let echoWireToolInputs = shouldEchoWireToolInputs(inputMessages, normalizeOptions.echoWireToolInputs);
  let finalizeMessageList = (messages, midConvModel, mediaTakenOut) => {
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
      keyedRemindersStaySiblings: midConvModel !== undefined && shouldUseMidConvSystem(midConvModel),
    });
    if (!normalizeOptions.advisorModel) messages = stripAdvisorBlocks(messages);
    if (normalizeOptions.stripWebSearch) messages = stripWebSearchBlocks(messages).messages;
    return stripExcessMediaItems(
      messages,
      Math.min(
        hasLargeContext ? MAX_MEDIA_ITEMS_LARGE_CONTEXT : MAX_MEDIA_ITEMS,
        normalizeOptions.mediaItemLimit ?? 1 / 0,
      ),
      MEDIA_BYTES_PER_ITEM_SLACK,
      getMediaTotalByteCap(),
      MEDIA_BYTE_CAP_MIN,
      getDocumentByteCap(),
      mediaTakenOut,
    );
  };
  let accountMemoryWithheld = normalizeOptions.accountMemoryWithheld ?? isAccountMemoryRedactionOn();
  let apiMessageOptions = {
    accountMemoryWithheld,
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
      normalizeOptions.betas.includes(BETA_MID_CONV_TOOL_CHANGE) && modelTakesToolAdditions(modelName),
    advisorToolChanges:
      normalizeOptions.advisorDeferred === true &&
      normalizeOptions.advisorModel !== undefined &&
      normalizeOptions.betas.includes(BETA_MID_CONV_TOOL_CHANGE) &&
      modelTakesToolAdditions(modelName),
    deferredWireToolNames: normalizeOptions.deferredWireToolNames,
    nameOnlyAnnouncements: normalizeOptions.nameOnlyAnnouncements,
    inlineToolDefinitions:
      normalizeOptions.byValueNames !== undefined &&
      normalizeOptions.byValueNames.size > 0 &&
      normalizeOptions.betas.includes(BETA_INLINE_TOOLS) &&
      modelTakesToolAdditions(modelName)
        ? normalizeOptions.byValueNames
        : undefined,
    withoutAttachmentHooks: normalizeOptions.withoutAttachmentHooks,
    ...(normalizeOptions.pollEventsAsText === true && {
      pollEventsAsText: true,
    }),
    ...(normalizeOptions.projectDocsAsRound === true && {
      projectDocsAsRound: true,
    }),
    thinkingStripPlan: normalizeOptions.thinkingStripPlan,
    advisorStripPlan: normalizeOptions.advisorStripPlan,
    keptReminders:
      normalizeOptions.keptReminders === true &&
      normalizeOptions.betas.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT),
    reminderFold,
  };
  let midConvModel = normalizeOptions.midConvLatchedOff ? undefined : modelName;
  onNormalizeStage?.("before");
  let apiMessages = normalizeMessagesForAPI(
    strippedMessages,
    normalizeOptions.tools,
    midConvModel,
    apiMessageOptions,
  );
  onNormalizeStage?.("normalize");
  validateImagesInMessages(apiMessages, imageLimitsForModel(normalizeOptions.model).maxBase64Size);
  onNormalizeStage?.("images");
  queryCheckpoint("query_message_normalization_end");
  normalizeOptions.mediaTakenOut?.splice(0);
  apiMessages = applyApiBlockOrderEcho(
    finalizeMessageList(apiMessages, midConvModel, normalizeOptions.mediaTakenOut),
    apiMessageOptions.echoApiBlockOrder,
    apiMessageOptions.preserveTrailingThinking,
  );
  onNormalizeStage?.("post_process");
  let included = normalizeOptions.betas.includes(BETA_PER_MESSAGE_EFFORT);
  let canonicalName = getCanonicalName(modelName);
  let perTurnConfig = {
    effort:
      included && supportsPerTurnEffort(modelName, canonicalName)
        ? normalizeOptions.perTurnEffort
        : undefined,
    now:
      included &&
      normalizeOptions.betas.includes(BETA_PER_TURN_TIMING) &&
      supportsPerTurnTiming(modelName, canonicalName)
        ? normalizeOptions.perTurnNow
        : undefined,
  };
  let attachPerTurnConfig = (messages) =>
    perTurnConfig.effort === undefined && perTurnConfig.now === undefined
      ? messages
      : attachPerTurnOutputConfig(messages, {
          ...perTurnConfig,
          parent: normalizeOptions.perTurnParent,
          effortCap: normalizeOptions.perTurnEffortCap?.(),
        });
  apiMessages = attachPerTurnConfig(apiMessages);
  let midConvFallback = null;
  if (
    !normalizeOptions.midConvLatchedOff &&
    (normalizeOptions.betas.includes(BETA_MID_CONVERSATION_SYSTEM) || included)
  ) {
    let initialMessages = apiMessages;
    midConvFallback = initialMessages.some((message) => message.type === "api_system")
      ? () =>
          applyApiBlockOrderEcho(
            finalizeMessageList(
              normalizeMessagesForAPI(strippedMessages, normalizeOptions.tools, undefined, apiMessageOptions),
              undefined,
            ),
            apiMessageOptions.echoApiBlockOrder,
            apiMessageOptions.preserveTrailingThinking,
          )
      : () => initialMessages;
  }
  let toolChangeFallback = null;
  if (
    (apiMessageOptions.surfaceLateToolAdditions || apiMessageOptions.advisorToolChanges) &&
    apiMessages.some(
      (message) =>
        message.type === "api_system" &&
        ((message.toolAdditions?.length ?? 0) > 0 || (message.toolRemovals?.length ?? 0) > 0),
    )
  )
    toolChangeFallback = () =>
      attachPerTurnConfig(
        finalizeMessageList(
          normalizeMessagesForAPI(strippedMessages, normalizeOptions.tools, midConvModel, {
            ...apiMessageOptions,
            surfaceLateToolAdditions: false,
            advisorToolChanges: false,
            inlineToolDefinitions: undefined,
          }),
          midConvModel,
        ),
      );
  let inlineToolsFallback = null;
  if (
    apiMessageOptions.inlineToolDefinitions !== undefined &&
    apiMessages.some((message) => message.type === "api_system" && message.toolDefinitions !== undefined)
  )
    inlineToolsFallback = () =>
      attachPerTurnConfig(
        finalizeMessageList(
          normalizeMessagesForAPI(strippedMessages, normalizeOptions.tools, midConvModel, {
            ...apiMessageOptions,
            inlineToolDefinitions: undefined,
            nameOnlyAnnouncements: new Set([
              ...(apiMessageOptions.nameOnlyAnnouncements ?? []),
              ...(normalizeOptions.byValueAnnouncements ?? []),
            ]),
          }),
          midConvModel,
        ),
      );
  return {
    messagesPreNormalize: strippedMessages,
    messagesForAPI: apiMessages,
    accountMemoryEpoch: redactAccountMemory(
      strippedMessages,
      accountMemoryWithheld,
      createMemoryServerVerifier(() => normalizeOptions.tools),
    ).epoch,
    midConvFallback,
    toolChangeFallback,
    inlineToolsFallback,
    keptForeignSignatures,
    blocksEligible: apiMessageOptions.surfaceLateToolAdditions === true,
  };
}
//@ chunk-5xgkngpb.js:2730632-2731343 layout
/**
 * 何时在请求头 anthropic-usage-limit 发 extended（多个 tengu_lantern_* 开关、第一方订阅）。
 */
function shouldSendExtendedUsageLimitHeader(options, webFetchApply, isSubagentDepth) {
  if (webFetchApply) return false;
  let isWebFetchApply = options.querySource === "web_fetch_apply";
  if (isWebFetchApply) {
    let callerCategory = classifyQuerySource(options.callerAnsweredQuerySource);
    if (callerCategory !== "main" && callerCategory !== "subagent") return false;
  }
  if (!isWebFetchApply && (options.queryTracking?.depth ?? 0) === 0 && !isSubagentDepth) return false;
  if (
    classifyQuerySource(options.querySource) === "auxiliary" &&
    options.querySource !== "compact" &&
    !isWebFetchApply
  )
    return false;
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return false;
  let cachedExtraUsageDisabledReason = getGlobalConfig().cachedExtraUsageDisabledReason;
  let hasKnownReason =
    typeof cachedExtraUsageDisabledReason === "string" &&
    cachedExtraUsageDisabledReason !== "fetch_error" &&
    cachedExtraUsageDisabledReason !== "unknown";
  if (isWebFetchApply && cachedExtraUsageDisabledReason !== null && !hasKnownReason) return false;
  if (isWebFetchApply && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_hinge", false) !== true)
    return false;
  if (
    cachedExtraUsageDisabledReason === null &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_smooth_harbor", false)
  )
    return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_spool", false)) return false;
  let agentContext = options.agentContext;
  return !(
    isSubagentContext(agentContext) &&
    hasKnownReason &&
    agentContext.workflowWaitsOutUsageLimit?.(getCurrentLimits().resetsAt) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_snuffer", false) === true
  );
}
//@ chunk-5xgkngpb.js:2731343-2731372 layout
/**
 * GrowthBook 开关名 tengu_fizzy_bonbon。
 */
var TENGU_FIZZY_BONBON = "tengu_fizzy_bonbon";
//@ chunk-5xgkngpb.js:2731372-2731500 layout
/**
 * 惰性估算消息 token 数（失败时 +∞）。
 */
function lazyContextTokenEstimate(messages, model) {
  let cached;
  return () => {
    if (cached === undefined)
      try {
        cached =
          estimateTokensWithAnchor(messages, bytesPerTokenForModel(model)) + serverClearedTokens(messages);
      } catch (error) {
        logError(toError(error));
        cached = Number.POSITIVE_INFINITY;
      }
    return cached;
  };
}
//@ chunk-5xgkngpb.js:2731500-2731597 layout
/**
 * 若当前上下文已超过 fallback 模型窗口（GCn）则不用 accessFallbackModel，返回 undefined。
 */
function resolveAccessFallbackModel(fromModel, toModel, currentContextSize) {
  if (toModel === undefined) return;
  try {
    return ladderStepLosesContext(fromModel, toModel, currentContextSize) ? undefined : toModel;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2731597-2731657 layout
/**
 * 有 ladders 时记录会话大小（token 估算）。
 */
function recordConversationSize(sessionId, estimate) {
  try {
    if (hasFallbackLadders()) recordConversationSize_2(sessionId, estimate());
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-5xgkngpb.js:2731657-2731717 layout
/**
 * CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL=5m 时把消息缓存 TTL 降为 5m。
 */
function applyMessagesCacheTtlOverride(ttl) {
  try {
    return applyFiveMinuteOverride(ttl);
  } catch (error) {
    logError(toError(error));
    return ttl;
  }
}
//@ chunk-5xgkngpb.js:2731717-2731762 layout
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
//@ chunk-5xgkngpb.js:2731762-2731911 layout
/**
 * 服务器拒绝工具搜索时抛出，携带 refusal 与是否已声明工具搜索。
 */
class ToolSearchRefusedError extends Error {
  refusal;
  declaredToolSearch;
  constructor(cause, declaredToolSearch) {
    super("tool search refused", {
      cause,
    });
    this.refusal = cause;
    this.declaredToolSearch = declaredToolSearch;
  }
}
//@ chunk-5xgkngpb.js:2731911-2732568 layout
/**
 * 包 queryModel：捕获 ToolSearchRefusedError 后加一条 critical_system_reminder（延迟工具改为直接声明）重跑一次。
 */
async function* queryModelWithToolSearchRecovery(...args) {
  let refusal;
  try {
    return yield* queryModel(...args);
  } catch (error) {
    if (!(error instanceof ToolSearchRefusedError)) throw error;
    refusal = error;
  }
  let [messages, systemPrompt, thinkingConfig, tools, signal, options] = args;
  let reminder = refusal.declaredToolSearch
    ? [
        createAttachmentMessage_2({
          type: "critical_system_reminder",
          content: `${TOOL_SEARCH_TOOL_NAME} is no longer available. Tools listed earlier as deferred that are still available are declared in full: call them directly.`,
        }),
      ]
    : [];
  let emitted = false;
  let model = queryModel([...messages, ...reminder], systemPrompt, thinkingConfig, tools, signal, {
    ...options,
    toolSearchRefusal: refusal.refusal,
  });
  try {
    for (let step = await model.next(); ; step = await model.next()) {
      if (step.done) return step.value;
      let value = step.value;
      if (
        !emitted &&
        (value.type === "assistant"
          ? !value.isApiErrorMessage
          : value.type === "stream_event" && value.event.type === "message_start")
      ) {
        emitted = true;
        yield* reminder;
      }
      yield value;
    }
  } finally {
    await model.return(undefined);
  }
}
//@ chunk-5xgkngpb.js:2732568-2867697 callgraph-witnessed (2.1.88 match: queryModel, 0.167)
/**
 * queryModel：一次 Messages API 调用的全部逻辑（约 129KB）。依次：off-switch 与模型封锁检查 → beta 列表与模型事实 → 工具 schema 构建、工具搜索/延迟工具决策 → normalizeMessagesForRequest 规整消息 → buildSystemPromptBlocks → buildRequestParams（paramsFromContext 过滤被拒 beta、thinking/effort/output_config/context_management/speed/diagnostics、addCacheBreakpoints）→ withRetry 内 anthropic.beta.messages.create(stream:true) → 解析 SSE（message_start/content_block_*\/message_delta/message_stop）产出 stream_event 与 assistant 消息、累计 usage 与成本 → 流停顿/空闲超时/无事件时回退非流式 → onError 里按错误类型返回 "retry:<原因>"（去 beta、去 thinking.display、去媒体、降 effort 等）自愈重发。
 */
async function* queryModel(
  messages,
  systemPrompt,
  thinkingConfig,
  tools,
  signal,
  { modelFacts, ...baseOptions },
  emitPlainDelta,
) {
  let { fallbackModel, accessFallbackModel = baseOptions.accessFallbackModel } = resolveFallbackModel(
    baseOptions.model,
    baseOptions.fallbackModel,
    isRefusedOrSentModel,
  );
  let lazyTokenEstimate = lazyContextTokenEstimate(messages, baseOptions.model);
  let accessFallbackModel_2 = resolveAccessFallbackModel(
    baseOptions.model,
    accessFallbackModel,
    lazyTokenEstimate,
  );
  let options =
    fallbackModel === baseOptions.fallbackModel
      ? baseOptions
      : {
          ...baseOptions,
          fallbackModel,
        };
  let clock = options.clock ?? systemClock;
  let runGuarded = (runFn) =>
    isAutoModeQuerySource(options.querySource) ? withCatalogSuppressed(runFn) : runFn();
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
  let modelBlockedText = null;
  try {
    modelBlockedText = await blockedOverrideText(previousRequestId);
  } catch (error) {
    logForDebugging(`tengu-model-error-overrides block check failed: ${error}`, {
      level: "error",
    });
  }
  if (modelBlockedText !== null) {
    if (options.fallbackModel !== undefined) {
      logEvent("tengu_off_switch_query", {
        tier: lit_2("per_model_block"),
        outcome: lit_2("fallback"),
      });
      throw new FallbackTriggeredError(
        options.model,
        options.fallbackModel,
        "model_blocked",
        undefined,
        modelBlockedText,
      );
    }
    logEvent("tengu_off_switch_query", {
      tier: lit_2("per_model_block"),
    });
    yield createApiErrorMessage({
      content: modelBlockedText,
      error: "rate_limit",
    });
    return;
  }
  let previousRequestId_2 = collectRecentAssistantTexts(messages);
  let requestPromptId = promptIdForRequest(messages, options.agentContext);
  let key = senderAddressKeyFor(options.agentContext, requestPromptId, options.querySource);
  if (key && isFirstPartyApiBackend()) await prefetchCcrSenderAddress(key);
  let turnOrigin = turnOriginSafe(messages);
  let turnPosition = turnPositionSafe(messages);
  let isSessionTask = isSessionTaskTurn(messages);
  let earlyToolCap = new GraceResend(
    options.continuesInterruptedWork === true && (options.queryTracking?.depth ?? 0) === 0 && !isSessionTask,
  );
  let lastAssistantId = lastAssistantMessageId(messages);
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
    noteToolSchemaBuildStart(toolDescriptionCache_2);
  }
  let isAgenticQuery =
    options.querySource.startsWith("repl_main_thread") ||
    options.querySource.startsWith("agent:") ||
    options.querySource === "sdk" ||
    options.querySource === "hook_agent" ||
    options.querySource === "resume_cache_warm";
  let conversation_2 = stickyBetasOr(options.stickyBetas);
  if (!conversation_2.declaredToolsDecided)
    runGuarded(() => seedWireShapeFromRecord(conversation_2, options.recordedWireShape, options.model));
  let betaList = runGuarded(() =>
    getMergedBetas(options.model, {
      isAgenticQuery,
    }),
  );
  if (betaList.includes(BETA_PROGRAM_USE_CASE_IDS)) markBetaSent(conversation_2, BETA_PROGRAM_USE_CASE_IDS);
  else if (isBetaSent(conversation_2, BETA_PROGRAM_USE_CASE_IDS) && programUseCaseHeaderGoesOut())
    betaList = [...betaList, BETA_PROGRAM_USE_CASE_IDS];
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
  let canMintCredit =
    options.fallbackCreditCode !== undefined &&
    options.fallbackCreditMintModel !== undefined &&
    canUseFallbackCreditMintModel(options.fallbackCreditMintModel, options.model);
  let creditMintModel = canMintCredit ? options.fallbackCreditMintModel : undefined;
  let effectiveModel = creditMintModel ?? options.model;
  let betas = upgradeDisabledThinkingForModel(
    thinkingConfig,
    modelFacts_2.thinking.alwaysOn ||
      (creditMintModel !== undefined && runGuarded(() => isThinkingAlwaysOn(creditMintModel))),
  );
  let wireModelId = creditMintModel === undefined ? toProviderWireModelId(options.model) : undefined;
  if (wireModelId !== undefined && !conversation_2.declaredToolsDecided) {
    let contextBetaActive = hasContextBeta(conversation_2);
    for (let refusedBeta of getRefusedBetasForModel(wireModelId))
      markBetaRejected(conversation_2, refusedBeta);
    if (options.stickyBetas === undefined) notifyPerTurnEffortInactive(conversation_2, contextBetaActive);
  }
  let latchBetaRefused = (beta, perModel) => {
    markBetaRejected(conversation_2, beta);
    if (beta === BETA_CCR_TOOL_PROVENANCE && perModel) conversation(conversation_2, beta);
    let scopeText = "in this conversation";
    if (perModel && wireModelId !== undefined) {
      markBetaRefusedForModel(wireModelId, beta);
      scopeText += `, or by new ones on ${wireModelId} in this process`;
    }
    logForDebugging(`[betas] the API refused ${beta.header}; not sent again ${scopeText}`, {
      level: "warn",
    });
  };
  if (isTopLevelMain) markToolSchemaBuildPart("betas");
  registerMcpStandardKeys(tools);
  indexConnectorByTool(tools);
  await awaitArtifactRosterSafe(tools);
  let deferralMode = options.withoutToolDescribeHooks ? "engine" : "hooks";
  let isDeferredByEngine = (tool, nonDeferrableBuiltins) =>
    deferralMode === "engine"
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
  let advisorModelForQuery =
    isAgenticQuery || options.forkPointUuid !== undefined
      ? runGuarded(() => getAdvisorModelForQuery(options.advisorModel, effectiveModel))
      : undefined;
  let useToolSearch =
    !isAutoModeQuerySource(options.querySource) &&
    (await isToolSearchEnabled(
      effectiveModel,
      tools,
      options.getToolPermissionContext,
      options.agents,
      "query",
      options.credentials,
      options.recordedToolDescriptions,
      conversation_2,
    )) &&
    options.toolSearchRefusal === undefined;
  if (isTopLevelMain) markToolSchemaBuildPart("waits");
  let echoWireToolInputs = shouldEchoWireToolInputs(messages, options.echoWireToolInputs);
  let resumeIncompleteThinking = options.resumeIncompleteThinking === true;
  betaList = runGuarded(() => adjustToolBetas(conversation_2, betaList, options.model));
  let betaAdjustment = withProvenanceBeta(conversation_2, betaList);
  betaList = betaAdjustment.betas;
  let coverage = betaAdjustment.coverage;
  let toolCoverage = makeServerAnnotationResolver(tools, options.mcpClients ?? [], coverage);
  let announceDeferred = false;
  if (
    !useToolSearch &&
    options.toolSearchRefusal === undefined &&
    !isAutoModeQuerySource(options.querySource)
  )
    try {
      announceDeferred = runGuarded(() =>
        shouldAnnounceDeferredTools(conversation_2, effectiveModel, {
          toolSearchToolFilteredOut: toolSearchToolFilteredOut(effectiveModel, tools, conversation_2),
          toolPoolRefreshes: options.toolPoolRefreshes === true,
          aheadOfRequest: false,
        }),
      );
    } catch (error) {
      logError(toError(error));
    }
  if (!conversation_2.declaredToolsDecided) {
    let recordedDeferred;
    try {
      recordedDeferred = options.recordedDeferredTools?.();
      for (let announcement of recordedDeferred?.nameOnlyAnnouncements ?? [])
        conversation_2.nameOnlyAnnouncements.add(announcement);
      if (recordedDeferred !== undefined)
        seedDeferredToolReferences(messages, [...recordedDeferred.entries.values()], {
          strippedReferences: recordedDeferred.strippedReferences,
          ...((useToolSearch || announceDeferred) &&
            toolChangeHeaderAllowed(conversation_2) && {
              surfacedCarrier: conversation_2,
            }),
        });
    } catch (error) {
      logError(toError(error));
    }
    try {
      let toolInputCopies = recordedDeferred?.toolInputCopies;
      if (
        toolInputCopies !== undefined &&
        toolInputCopies.size > 0 &&
        shouldTrackDeferredToolForQuery(options.querySource) &&
        shouldEchoWireToolInputsForRequest(messages, echoWireToolInputs)
      )
        adoptWireToolInputCopies(messages, toolInputCopies);
    } catch (error) {
      logError(toError(error));
    }
  }
  let byValueNames = new Set();
  let byValueAnnouncements = new Set();
  let byValueStaysOut = true;
  try {
    byValueStaysOut = isToolDefinedByValueEnabled();
  } catch (error) {
    logError(toError(error));
  }
  try {
    if (
      betaList.includes(BETA_INLINE_TOOLS) &&
      runGuarded(() => canDeclareInlineTools(conversation_2, effectiveModel))
    ) {
      byValueNames = deltaToolNames(messages, conversation_2.nameOnlyAnnouncements);
      byValueAnnouncements = deferredToolNames(messages, conversation_2.nameOnlyAnnouncements);
    }
  } catch (error) {
    logError(toError(error));
  }
  let scratchDeclared;
  let upfrontDeferredCount = 0;
  if (useToolSearch)
    try {
      let nonDeferrableBuiltins = getNonDeferrableBuiltins();
      let declaredToolSet = computeDeclaredToolSet(
        conversation_2,
        tools,
        (tool) => isDeferredByEngine(tool, nonDeferrableBuiltins),
        effectiveModel,
        !messages.some((message) => message.type === "assistant"),
      );
      scratchDeclared = declaredToolSet;
      if (declaredToolSet !== undefined)
        upfrontDeferredCount = countWhere(
          turnDeniedTools(tools, conversation_2),
          (tool) => declaredToolSet.has(tool.name) && isDeferredByEngine(tool, nonDeferrableBuiltins),
        );
    } catch (error) {
      logError(toError(error));
    }
  let resolvedDeclared;
  let wasUndecided = !conversation_2.declaredToolsDecided;
  let advisorExperiment = deferredToolsEnabled();
  let redeclaredCount = 0;
  if (useToolSearch || announceDeferred) {
    let permissionContext;
    if (!conversation_2.declaredToolsDecided)
      try {
        permissionContext = await options.getToolPermissionContext();
      } catch (error) {
        logError(toError(error));
      }
    try {
      resolvedDeclared = resolveDeclaredToolSet(
        conversation_2,
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
      scratchDeclared = undefined;
    }
  } else if (wasUndecided) conversation_2.declaredTools = undefined;
  markDeclaredToolsDecided(conversation_2);
  let declaredToolSet = resolvedDeclared ?? scratchDeclared;
  let deferredToolNames_2 = new Set();
  let deferredLateCount = 0;
  if (useToolSearch || announceDeferred)
    try {
      let nonDeferrableBuiltins = getNonDeferrableBuiltins();
      for (let tool of tools) {
        let isLoadedThroughSearch = useToolSearch && isDeferredByEngine(tool, nonDeferrableBuiltins);
        if (
          declaredToolSet === undefined
            ? announceDeferred
              ? false
              : isLoadedThroughSearch
            : isDeferredToolInConversation(tool, declaredToolSet, tools, {
                toolSearchAbsent: announceDeferred,
                placements: deferralMode,
                nonDeferrableBuiltins,
              })
        ) {
          deferredToolNames_2.add(tool.name);
          if (!isLoadedThroughSearch) deferredLateCount++;
        }
      }
    } catch (error) {
      logError(toError(error));
      resolvedDeclared = undefined;
      declaredToolSet = undefined;
      deferredToolNames_2.clear();
      deferredLateCount = 0;
      let nonDeferrableBuiltins = getNonDeferrableBuiltins();
      for (let tool of tools)
        if (useToolSearch && isDeferredByEngine(tool, nonDeferrableBuiltins))
          deferredToolNames_2.add(tool.name);
    }
  let generation = deferredToolCache().generation;
  let keptDeferred =
    useToolSearch || announceDeferred
      ? logKeptDeferredTools(messages, tools, options.querySource, {
          keepMcp: !willHideCodeModeOnlyTools(tools),
          surfacedOnWire: conversation_2.surfacedOnWire,
          ...(advisorExperiment && {
            declaredInline: resolvedDeclared,
          }),
        })
      : undefined;
  if (
    useToolSearch &&
    deferredToolNames_2.size === 0 &&
    !(declaredToolSet !== undefined && declaredToolSet === scratchDeclared && upfrontDeferredCount > 0) &&
    (!options.hasPendingMcpServers || willHideCodeModeOnlyTools(tools)) &&
    !keptDeferred?.kept.size &&
    !resolvedDeclared?.has(TOOL_SEARCH_TOOL_NAME)
  ) {
    logForDebugging("Tool search disabled: no deferred tools available to search");
    useToolSearch = false;
    if (advisorExperiment && resolvedDeclared !== undefined && keptDeferred !== undefined)
      try {
        keptDeferred = logKeptDeferredTools(messages, tools, options.querySource, {
          keepMcp: !willHideCodeModeOnlyTools(tools),
          surfacedOnWire: conversation_2.surfacedOnWire,
        });
      } catch (error) {
        logError(toError(error));
      }
  }
  let toolChangeMode = useToolSearch ? "tool_search" : announceDeferred ? "tool_addition" : undefined;
  let requestTools;
  let noChannelTools;
  let unclassifiedDepartures = 0;
  if (toolChangeMode !== undefined) {
    let discoveredToolNames = extractDiscoveredToolNames(messages, {
      surfaced: toolChangeHeaderAllowed(conversation_2)
        ? {
            exceptAnnouncements: conversation_2.nameOnlyAnnouncements,
          }
        : conversation_2.surfacedOnWire,
    });
    let referencedToolNames = new Set();
    if (byValueNames.size > 0)
      try {
        referencedToolNames = byValueStaysOut
          ? new Set(collectToolReferences(messages).map((toolRef) => toolRef.toolName))
          : extractDiscoveredToolNames(messages);
      } catch (error) {
        logError(toError(error));
      }
    requestTools = tools.filter((tool) => {
      if (!deferredToolNames_2.has(tool.name)) return true;
      if (matchesToolName(tool, TOOL_SEARCH_TOOL_NAME)) return true;
      return (
        discoveredToolNames.has(tool.name) &&
        (!byValueNames.has(tool.name) || referencedToolNames.has(tool.name))
      );
    });
    try {
      let updatedTools = updateDeclaredToolSet(requestTools, resolvedDeclared ?? scratchDeclared);
      requestTools = updatedTools.tools;
      redeclaredCount = updatedTools.redeclared.length;
    } catch (error) {
      logError(toError(error));
    }
  } else {
    requestTools = tools.filter((tool) => {
      if (matchesToolName(tool, TOOL_SEARCH_TOOL_NAME)) return false;
      if (byValueNames.has(tool.name)) return false;
      return true;
    });
    let scratch = asScratchDeclaredToolSet(conversation_2);
    if (scratch !== undefined)
      try {
        let hipaaResult = await isHipaaRestricted(scratch, tools, {
          mcpClients: options.mcpClients ?? [],
          getPermissionContext: options.getToolPermissionContext,
          byValue: byValueNames,
        });
        noChannelTools = byValueNames.size === 0 ? hipaaResult.kept : hipaaResult.kept.without(byValueNames);
        unclassifiedDepartures = hipaaResult.unread;
        let updatedTools = updateDeclaredToolSet(requestTools, noChannelTools);
        requestTools = updatedTools.tools;
        redeclaredCount = updatedTools.redeclared.length;
      } catch (error) {
        logError(toError(error));
      }
    else if (wasUndecided && options.recordedToolDescriptions === undefined)
      try {
        requestTools = turnDeniedTools(requestTools, conversation_2);
      } catch (error) {
        logError(toError(error));
      }
  }
  let availableTools = hideCodeModeOnlyTools(hideAliasedV1Tools(requestTools));
  noteWaitForMcpServers(availableTools, options.querySource);
  let providerForModel = getProviderForModel(options.model);
  let toolSearchBeta = useToolSearch ? getToolSearchBeta() : null;
  if (toolSearchBeta && providerForModel !== "bedrock") {
    if (!betaList.includes(toolSearchBeta)) betaList.push(toolSearchBeta);
  }
  let lateToolSchemas;
  let globalCacheScope = shouldUseGlobalCacheScope();
  let isDeferredForRequest = (tool) =>
    deferredToolNames_2.has(tool.name) || (useToolSearch && shouldDeferLspTool(tool));
  let isKeptDeferredTool = (tool) => keptDeferred?.kept.has(tool.name) === true;
  let hasUnkeptTools = true;
  try {
    hasUnkeptTools =
      availableTools.some(
        (tool) =>
          (resolvedDeclared?.has(tool.name) ?? true) &&
          !isDeferredForRequest(tool) &&
          !isKeptDeferredTool(tool),
      ) ||
      (resolvedDeclared !== undefined &&
        isLateToolAdditionsEnabled(resolvedDeclared, {
          pool: tools,
          keptDeferred: keptDeferred?.kept.keys() ?? [],
          keepMcp: !willHideCodeModeOnlyTools(tools),
        }).length > 0);
  } catch (error) {
    logError(toError(error));
  }
  let isDeferredOrKept = (tool) =>
    toolChangeMode !== undefined &&
    (isDeferredForRequest(tool) || (hasUnkeptTools && isKeptDeferredTool(tool)));
  if (toolChangeMode !== undefined && resolvedDeclared === undefined)
    try {
      let tools = hideCodeModeOnlyTools(requestTools).filter((tool) => !isDeferredOrKept(tool));
      if (declaredToolSet !== undefined) {
        setDeclaredTools(conversation_2, new DeclaredToolSet(tools));
        if (upfrontDeferredCount > 0)
          logFeatureOk("host_upfront_tools", {
            named: env.CLAUDE_CODE_UPFRONT_TOOLS?.length ?? 0,
            sent: upfrontDeferredCount,
          });
      } else recordDeclaredToolsIfMissing(conversation_2, tools);
    } catch (error) {
      logError(toError(error));
    }
  let pendingMcpResult;
  if (
    toolChangeMode === undefined &&
    wasUndecided &&
    asScratchDeclaredToolSet(conversation_2) === undefined &&
    (options.mcpClients ?? []).some((mcpClient) => mcpClient.type === "pending")
  )
    try {
      pendingMcpResult = await markReconnectingServers(options, tools, byValueNames);
    } catch (error) {
      logError(toError(error));
    }
  try {
    noChannelTools = cacheNoChannelTools(conversation_2, toolChangeMode !== undefined, () =>
      buildDeclaredToolSet(
        hideCodeModeOnlyTools(requestTools),
        tools,
        pendingMcpResult ?? noChannelTools?.recordedOnly,
      ),
    );
  } catch (error) {
    logError(toError(error));
  }
  let hasLiveMcpTools =
    globalCacheScope && availableTools.some((tool) => tool.isMcp === true && !isDeferredOrKept(tool));
  if (globalCacheScope && !betaList.includes(BETA_PROMPT_CACHING_SCOPE))
    betaList.push(BETA_PROMPT_CACHING_SCOPE);
  let globalCacheStrategy = globalCacheScope ? (hasLiveMcpTools ? "none" : "system_prompt") : "none";
  if (isTopLevelMain) markToolSchemaBuildPart("placement");
  let featureEnabled = getNonDeferrableBuiltins();
  let redescribedTools = options.withoutToolDescribeHooks ? undefined : options.redescribedTools;
  let results = await Promise.all(
    availableTools.map((availableTool) =>
      toolToApiDefinition(availableTool, {
        getToolPermissionContext: options.getToolPermissionContext,
        tools,
        agents: options.agents,
        allowedAgentTypes: options.allowedAgentTypes,
        model: effectiveModel,
        enginePlacement: isDeferredToolByEngine(availableTool, featureEnabled) ? "deferred" : "listed",
        querySource: options.querySource,
        withoutToolDescribeHooks: options.withoutToolDescribeHooks,
        recordedDescription: isDeferredOrKept(availableTool)
          ? undefined
          : options.recordedToolDescriptions?.get(availableTool.name),
        recordedEntry:
          isDeferredOrKept(availableTool) || matchesToolName(availableTool, STRUCTUREDOUTPUT)
            ? undefined
            : options.recordedToolEntries?.get(availableTool.name),
        isRedescribed: redescribedTools?.has(availableTool.name) || undefined,
        deferLoading: isDeferredOrKept(availableTool),
        loadedThroughToolSearch:
          useToolSearch &&
          isDeferredOrKept(availableTool) &&
          isDeferredByEngine(availableTool, featureEnabled),
      }),
    ),
  );
  if (isTopLevelMain) markToolSchemaBuildPart("render");
  let isMainChain = isMainAgent(options.agentContext) && classifyQuerySource(options.querySource) === "main";
  noteToolRedescribed(conversation_2, results, {
    redescribed: redescribedTools,
    recorded: options.recordedToolDescriptions,
    isMainChain,
  });
  if (isMainChain)
    try {
      let bashDescription;
      for (let schema of results)
        if ("name" in schema && "description" in schema && matchesToolName(schema, BASH_TOOL_NAME)) {
          bashDescription = schema.description;
          break;
        }
      noteBackgroundStopNoticeSent(bashDescription);
    } catch (error) {
      logError(toError(error));
      noteBackgroundStopNoticeSent("");
    }
  let lateToolSchemas_2 = [];
  if (toolChangeMode !== "tool_search" && byValueNames.size > 0)
    try {
      let presentNames = new Set(availableTools.map((tool) => tool.name));
      let filtered = tools.filter((tool) => byValueNames.has(tool.name) && !presentNames.has(tool.name));
      let hiddenNames = new Set(
        hideCodeModeOnlyTools(hideAliasedV1Tools([...requestTools, ...filtered])).map((tool) => tool.name),
      );
      lateToolSchemas_2 = await Promise.all(
        filtered
          .filter((tool) => hiddenNames.has(tool.name))
          .map((tool) =>
            toolToApiDefinition(tool, {
              getToolPermissionContext: options.getToolPermissionContext,
              tools,
              agents: options.agents,
              allowedAgentTypes: options.allowedAgentTypes,
              model: effectiveModel,
              enginePlacement: isDeferredToolByEngine(tool) ? "deferred" : "listed",
              querySource: options.querySource,
              withoutToolDescribeHooks: options.withoutToolDescribeHooks,
              recordedDescription: options.recordedToolDescriptions?.get(tool.name),
              recordedEntry: options.recordedToolEntries?.get(tool.name),
              isRedescribed: redescribedTools?.has(tool.name) || undefined,
              deferLoading: false,
            }),
          ),
      );
    } catch (error) {
      logError(toError(error));
      lateToolSchemas_2 = [];
    }
  let schemaByName = new Map(
    availableTools.map((tool, index) => [
      tool.name,
      {
        schema: results[index],
        isMcp: tool.isMcp === true,
      },
    ]),
  );
  let declaredSource = toolChangeMode !== undefined ? resolvedDeclared : noChannelTools;
  let modelSupported = runGuarded(() => shouldEnableWebSearchCitations(effectiveModel));
  let lateToolAdditions = [];
  if (declaredSource !== undefined && declaredSource.recordedOnly.size > 0)
    try {
      lateToolAdditions = computeLateToolAdditions(results, declaredSource, {
        pool: tools,
        recordedEntries: options.recordedToolEntries,
        keptDeferred: hasUnkeptTools ? (keptDeferred?.kept.keys() ?? []) : [],
        keepMcp: !willHideCodeModeOnlyTools(tools),
        requestCarriesStructuredOutputs: runGuarded(() => willSendStructuredOutputsBeta(effectiveModel)),
        requestDeclaresSearchCitations: modelSupported,
      });
    } catch (error) {
      logError(toError(error));
    }
  logDeclaredToolSetHeld({
    deferredLate: deferredLateCount,
    redeclared: redeclaredCount,
    fromRecord: lateToolAdditions.length,
    queryDepth: options.queryTracking?.depth,
    toolSearchAbsent: toolChangeMode === "tool_addition",
    noDeferredChannel: toolChangeMode === undefined,
    unclassifiedDepartures,
  });
  if (options.onInlineToolsDeclared) {
    let toolsByName = new Map(availableTools.map((tool) => [tool.name, tool]));
    let inlineTools = [];
    for (let schema of results) {
      if (!("input_schema" in schema)) continue;
      let tool = toolsByName.get(schema.name);
      let recordedOnly = tool === undefined ? declaredSource?.recordedOnly.get(schema.name) : undefined;
      if (tool !== undefined && !isDeferredOrKept(tool))
        inlineTools.push({
          name: schema.name,
          description: schema.description ?? "",
          schema,
          ...(tool.mcpInfo && {
            server: tool.mcpInfo.serverName,
          }),
        });
      else if (recordedOnly !== undefined) {
        let entry = options.recordedToolEntries?.get(schema.name) ?? recordedOnly.entry;
        inlineTools.push({
          name: schema.name,
          description: entry.description ?? "",
          schema: entry,
          ...(recordedOnly.server !== undefined && {
            server: recordedOnly.server,
          }),
        });
      }
    }
    options.onInlineToolsDeclared(inlineTools);
  }
  if (toolChangeMode !== undefined) {
    if (keptDeferred)
      buildDeferredToolsForRequest(keptDeferred, results, schemaByName, {
        requestCarriesStructuredOutputs: runGuarded(() => willSendStructuredOutputsBeta(effectiveModel)),
        requestDeclaresSearchCitations: modelSupported,
      });
    let config = getDeferredToolPlaceholderSchema();
    if (
      config &&
      !requestTools.some((tool) => matchesToolName(tool, DEFERREDTOOLPLACEHOLDER)) &&
      !keptDeferred?.kept.has(DEFERREDTOOLPLACEHOLDER)
    )
      results.splice(Math.max(results.length - 1, 0), 0, config);
    let tool = countWhere(requestTools, (tool) => deferredToolNames_2.has(tool.name));
    logForDebugging(`Dynamic tool loading: ${tool}/${deferredToolNames_2.size} deferred tools included`);
  }
  queryCheckpoint("query_tool_schema_build_end");
  if (isTopLevelMain) {
    noteToolSchemaBuildEnd(availableTools.length, toolDescriptionCache_2);
    markToolSchemaBuildPart("after");
    endProfilePhase("tool_schema_build");
  }
  logEvent("tengu_api_before_normalize", {
    preNormalizedMessageCount: messages.length,
  });
  queryCheckpoint("query_message_normalization_start");
  if (creditMintModel !== undefined) logEvent("tengu_fallback_credit_strip_as_mint_model", {});
  let deferredSchemasSent;
  let prepareSendParams = (params) => {
    thinkingAlreadyStripped = params.thread?.type === "continue";
    let sentPrefix = noopRecordSentPrefix(
      conversation_2,
      {
        ...applyThreadBody(params, currentThreadBody()),
        messages: sentMessages,
      },
      {
        querySource: options.querySource,
        isMainThread: isMainAgent(options.agentContext),
        history: messages,
        retryCause,
        retryKeepsHeal: retryKeepsHeal === true,
        promptEpoch: options.promptRenderEpoch,
        accountMemoryEpoch: accountMemoryEpoch_2,
      },
    );
    if (threadSourceKind(options.querySource) !== null && isTetherLive())
      try {
        noteLastDispatchHealed(options.agentId, sentPrefix !== undefined);
      } catch (error) {
        logError(toError(error));
      }
    if (sentPrefix?.tools !== undefined) pinnedTools = [...sentPrefix.tools];
    if (sentPrefix?.tools !== undefined && params.tools !== undefined) {
      params.tools = [...sentPrefix.tools];
      if (keptDeferred) recordDeferredToolsSent(keptDeferred, stripToolAnnotations(params.tools));
    }
    let tools = params.tools ?? pinnedTools;
    if (deferredSchemasSent !== undefined && tools !== undefined)
      restoreDeferredDefinitions(deferredSchemasSent, stripToolAnnotations(tools));
    if (sentPrefix === undefined) return;
    if (sentPrefix.system !== undefined) {
      let systemValue = typeof sentPrefix.system === "string" ? sentPrefix.system : [...sentPrefix.system];
      pinnedSystem = systemValue;
      if (!systemOverridden) params.system = systemValue;
    }
    if (sentPrefix.messages !== undefined) {
      sentMessages = [...sentPrefix.messages];
      let root = takeTail(sentMessages, params.messages.length);
      if (containsMalformedStringDeep(root))
        try {
          let repairedMessages = clone(root);
          repairMalformedStringsDeep(repairedMessages);
          root = repairedMessages;
        } catch {}
      params.messages = root;
    }
  };
  let midConvRejected = isBetaRejected_2(conversation_2, BETA_MID_CONVERSATION_SYSTEM);
  let perMessageEffortRejected = midConvRejected || isBetaRejected_2(conversation_2, BETA_PER_MESSAGE_EFFORT);
  let perTurnTimingRejected =
    perMessageEffortRejected || isBetaRejected_2(conversation_2, BETA_PER_TURN_TIMING);
  let clearAtRejected = isBetaRejected_2(conversation_2, BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
  betaList = betaList.filter(
    (beta) =>
      !isBetaRejected_2(conversation_2, beta) &&
      !(perMessageEffortRejected && beta === BETA_PER_MESSAGE_EFFORT) &&
      !(perTurnTimingRejected && beta === BETA_PER_TURN_TIMING),
  );
  if (creditMintModel !== undefined) {
    let beta = runGuarded(() =>
      getMergedBetas(creditMintModel, {
        isAgenticQuery,
      }),
    );
    let ensureBeta = (betaHeader) => {
      if (beta.includes(betaHeader)) {
        if (!betaList.includes(betaHeader)) betaList.push(betaHeader);
      } else betaList = betaList.filter((beta) => beta !== betaHeader);
    };
    if (!midConvRejected) ensureBeta(BETA_MID_CONVERSATION_SYSTEM);
    if (!perMessageEffortRejected) ensureBeta(BETA_PER_MESSAGE_EFFORT);
    if (!perTurnTimingRejected) ensureBeta(BETA_PER_TURN_TIMING);
    betaList = runGuarded(() => toolAdditionBetas(conversation_2, betaList, creditMintModel, options.model));
    ensureBeta(BETA_STRUCTURED_OUTPUTS);
  }
  let keptRemindersOn =
    !isAutoModeQuerySource(options.querySource) &&
    !clearAtRejected &&
    betaList.includes(BETA_MID_CONVERSATION_SYSTEM) &&
    runGuarded(() => isKeptReminderModeNotOff(creditMintModel ?? options.model));
  if (keptRemindersOn && !betaList.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT))
    betaList.push(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
  let carriedEffort = runGuarded(() =>
    resolveLoopEffort(
      {
        loopEffort: options.refusalFallbackEffort,
        continuesMainConversation: isMainConversationContext(options.agentContext),
      },
      resolvedModel,
    ),
  );
  let resolvedEffort = runGuarded(() =>
    resolveEffortValue(resolvedModel, options.effortValue, {
      turnEffort: options.turnEffort,
      hookEffortValue: options.hookEffortValue,
      carriedEffort,
    }),
  );
  let learnedEffortCapFn = () => learnedEffortCap(resolvedModel, options.querySource);
  let cappedEffort = lowerEffort(resolvedEffort, learnedEffortCapFn());
  let carriedEffortReport =
    carriedEffort === null
      ? undefined
      : {
          level: carriedEffort,
          outcome: classifyEffortCarryEffect({
            carried: carriedEffort,
            withIt: cappedEffort,
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
  let normalizedEffort = runGuarded(() =>
    modelSupportsEffort(resolvedModel) && cappedEffort !== undefined
      ? normalizeEffortLevel(cappedEffort)
      : undefined,
  );
  let isMainThread =
    isMainAgent(options.agentContext) &&
    (options.querySource.startsWith("repl_main_thread") || options.querySource === "sdk");
  let recordsConversationSize =
    options.querySource.startsWith("repl_main_thread") || options.querySource === "sdk";
  let agentId = isMainThread ? "foreground" : options.agentContext.agentId;
  if (recordsConversationSize) recordConversationSize(agentId, lazyTokenEstimate);
  let turnOrigin_2;
  if (isMainThread)
    try {
      turnOrigin_2 = getTurnStartOriginKind(messages);
    } catch (error) {
      logError(toError(error));
    }
  let defaultEffortFields = (effortLevel) => {
    if (!isMainThread || effortLevel === undefined) return {};
    try {
      let defaultEffortLevel = getDefaultEffortLevel(resolvedModel);
      return {
        isDefaultEffort: effortLevel === defaultEffortLevel,
        defaultEffortLevel,
      };
    } catch (error) {
      logError(toError(error));
      return {};
    }
  };
  let explicitEffortFields =
    typeof cappedEffort === "string" && !(betas.type === "disabled" && betas.mechanical === true)
      ? normalizedEffort
      : undefined;
  let tool = runGuarded(() => lowerTurnEffort(resolvedModel, options, carriedEffort, learnedEffortCapFn()));
  let perTurnNow = betaList.includes(BETA_PER_TURN_TIMING)
    ? formatLocalTimestamp(new Date(), sessionTimeZone())
    : undefined;
  let hasNonDeferredTool =
    results.some((schema) => !("defer_loading" in schema && schema.defer_loading === true)) ||
    (options.extraToolSchemas ?? []).some(
      (schema) => !("defer_loading" in schema && schema.defer_loading === true),
    );
  let advisorDeferredNow =
    options.advisorDeferred === true &&
    advisorModelForQuery !== undefined &&
    betaList.includes(BETA_MID_CONV_TOOL_CHANGE) &&
    hasNonDeferredTool;
  let advisorModelForSend =
    options.advisorDeferred === true && options.advisorActive === false && !advisorDeferredNow
      ? undefined
      : advisorModelForQuery;
  let deferredEntriesMoved = false;
  let inlinedCount = 0;
  if (toolChangeMode === "tool_addition" && !betaList.includes(BETA_MID_CONV_TOOL_CHANGE))
    try {
      let flattened = results.flatMap((schema) => {
        if (!("defer_loading" in schema) || schema.defer_loading !== true) return [schema];
        if (
          !("input_schema" in schema) ||
          !tools.some((knownTool) => matchesToolName(knownTool, schema.name))
        )
          return [];
        let { defer_loading: deferLoading, ...rest } = schema;
        return [rest];
      });
      let originalSchemas = new Set(results);
      inlinedCount = countWhere(flattened, (schema) => !originalSchemas.has(schema));
      deferredEntriesMoved = inlinedCount > 0 || flattened.length !== results.length;
      results.splice(0, results.length, ...flattened);
    } catch (error) {
      logError(toError(error));
    }
  let toolMoveReport =
    creditMintModel === undefined
      ? undefined
      : runGuarded(() =>
          describeToolAdditionMoves(conversation_2, messages, {
            mintModel: creditMintModel,
            retryModel: options.model,
            advisorEntryMoved:
              options.advisorDeferred === true &&
              advisorModelForQuery !== undefined &&
              hasNonDeferredTool &&
              !advisorDeferredNow,
            deferredEntriesMoved,
            hasDeferredChannel: toolChangeMode !== undefined,
          }),
        );
  let deferredWireNames = new Set([
    ...requestTools.filter(isDeferredOrKept).map((tool) => tool.name),
    ...(keptDeferred?.kept.keys() ?? []),
  ]);
  findLatestApiSystemDelta(conversation_2, messages, deferredWireNames, useToolSearch, byValueNames);
  if (toolChangeMode !== undefined && options.onDeferredToolsSent && areDeferredToolsKept())
    try {
      deferredSchemasSent = results.filter(
        (schema) =>
          isDeferredCustomToolDefinition(schema) && !matchesToolName(schema, DEFERREDTOOLPLACEHOLDER),
      );
      options.onDeferredToolsSent({
        entries: deferredSchemasSent,
        nameOnlyAnnouncements: conversation_2.nameOnlyAnnouncements,
        strippedReferences: strippedToolReferences(keptDeferred),
      });
    } catch (error) {
      logError(toError(error));
    }
  let relayPlan = guardReturning(
    () => {
      let disposition = options.resumeIncompleteThinking
        ? "keep"
        : (thinkingRelayModuleClaude?.relayThinkingDisposition({
            mainLoop: classifyQuerySource(options.querySource) === "main" && !options.agentId,
            fetch: options.fetchOverride,
          }) ?? "keep");
      return {
        relayThinking: disposition,
        relayThinkingPlan: disposition === "keep" ? undefined : thinkingStripAllPlan(messages),
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
  let { relayThinking, relayThinkingPlan, builtForRelay } = relayPlan;
  let mediaTakenOut =
    isCcsTenant() &&
    !options.modelIsFallbackForThisTurn &&
    (classifyQuerySource(options.querySource) === "main" ||
      (options.querySource.startsWith("agent:") && options.agentId !== undefined))
      ? []
      : undefined;
  let normalizeOptions = {
    model: options.model,
    bodyModel: effectiveModel,
    pollEventsAsText:
      codeModeAccepted() &&
      classifyQuerySource(options.querySource) === "subagent" &&
      !tools.some((tool) => matchesToolName(tool, POLL)),
    projectDocsAsRound: options.querySource === "compact",
    accountMemoryWithheld: isAccountMemoryRedactionOn(),
    tools: hideCodeModeOnlyTools(requestTools),
    ingestPool: {
      tools,
      ...(shouldTrackDeferredToolForQuery(options.querySource) && {
        ownRequest: {
          mcpServersPending: options.hasPendingMcpServers === true,
        },
      }),
    },
    ...(advisorExperiment && {
      declaredToolNames: clientNames(results),
    }),
    betas: betaList,
    midConvLatchedOff: midConvRejected,
    keptReminders: keptRemindersOn,
    useToolSearch,
    advisorModel: advisorModelForSend,
    advisorDeferred: advisorDeferredNow,
    stripWebSearch: conversation_2.webSearchHistoryRejected,
    mediaItemLimit: mediaItemCapForModel(conversation_2, effectiveModel)?.limit,
    mediaTakenOut,
    resumeIncompleteThinking,
    perTurnEffort: explicitEffortFields,
    perTurnParent: tool,
    perTurnEffortCap: learnedEffortCapFn,
    perTurnNow,
    deferredToolReferencePlan: keptDeferred,
    keepForeignThinking: foreignThinkingKeepMode(),
    deferredWireToolNames: deferredWireNames,
    nameOnlyAnnouncements: conversation_2.nameOnlyAnnouncements,
    byValueNames,
    byValueAnnouncements,
    withoutAttachmentHooks: options.withoutToolDescribeHooks,
    reminderFold: options.reminderFold,
    echoWireToolInputs,
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
  } = runGuarded(() =>
    normalizeMessagesForRequest(
      messages,
      normalizeOptions,
      isTopLevelMain ? markMessageNormalizationPart : undefined,
    ),
  );
  if (isTopLevelMain) {
    noteMessageNormalizationCounts(messages.length, messagesForAPI.length);
    markMessageNormalizationPart("after");
    endProfilePhase("message_normalization");
    startProfilePhase("request_build");
  }
  let messagesForAPI_2 = messagesForAPI;
  let accountMemoryEpoch_2 = accountMemoryEpoch;
  logAdvisorStripReplayed(messages, options);
  if (
    options.onToolInputCopiesSent &&
    normalizeOptions.ingestPool?.ownRequest !== undefined &&
    echoWireToolInputs
  )
    try {
      let wireInputs = wireInputSources(messages);
      if (wireInputs.size > 0) options.onToolInputCopiesSent(wireInputs);
    } catch (error) {
      logError(toError(error));
    }
  surfaceDeferredTools(conversation_2, messages, messagesForAPI_2, {
    useToolSearch,
    toolSearchAbsent: toolChangeMode === "tool_addition",
    blocksEligible,
    byValueNames,
    byValueStaysOut,
  });
  if (toolChangeMode !== undefined)
    keepDepartedDeferredTools(
      messages,
      conversation_2.surfacedOnWire,
      schemaByName,
      keptDeferred,
      options.querySource,
      generation,
    );
  let retryCause;
  let thinkingWasStripped = false;
  let shouldNotifyAdvisorStripped = false;
  let advisorStrippedNotified = false;
  let advisorStrippedMessage = () => {
    if (!shouldNotifyAdvisorStripped || advisorStrippedNotified) return;
    advisorStrippedNotified = true;
    return createAttachmentMessage_2({
      type: "advisor_stripped",
    });
  };
  let thinkingStripMarked = false;
  let nothingToStrip = false;
  if (relayThinking === "strip_and_mark")
    if (relayThinkingPlan !== undefined && relayThinkingPlan.size > 0) {
      thinkingWasStripped = true;
      thinkingStripMarked = true;
    } else nothingToStrip = true;
  let echoApiBlockOrder = isStellarDriftEnabled();
  let echoCache;
  let buildEchoedMessages = (messages_2, fallbackBeta, marksBeta) => {
    if (
      echoCache !== undefined &&
      echoCache.input === messages_2 &&
      echoCache.fallbackBeta === fallbackBeta &&
      echoCache.marksBeta === marksBeta
    )
      return echoCache.output;
    let normalizedMessages = normalizeFallbackBlocks(messages_2, fallbackBeta);
    let markable = false;
    let messages_3 = applyApiBlockOrderEcho(normalizedMessages, echoApiBlockOrder, resumeIncompleteThinking);
    let requestMessages = prepareRequestMessages(
      runGuarded(() => isNotLegacyClaude3(effectiveModel))
        ? messages_3
        : disableSearchResultCitations(messages_3),
      messages,
    );
    echoCache = {
      input: messages_2,
      fallbackBeta,
      marksBeta,
      output: requestMessages,
      markable,
    };
    return requestMessages;
  };
  let retryKeepsHeal;
  let retryRequested = false;
  let recoverMessages = (messages, recoveryCause, keepsHeal = false) => {
    retryRequested = true;
    if (recoveryCause === "microcompact") noopLedger(conversation_2, recoveryCause);
    else {
      retryCause = recoveryCause;
      retryKeepsHeal = (retryKeepsHeal ?? true) && keepsHeal;
    }
    return applyApiBlockOrderEcho(messages, echoApiBlockOrder, resumeIncompleteThinking);
  };
  let getMidConvFallback = midConvFallback;
  let getToolChangeFallback = toolChangeFallback;
  let getInlineToolsFallback = inlineToolsFallback;
  let apiSystemHasCacheControl = false;
  let sideRequestMarked = false;
  let promptEndMarkState = "idle";
  let anyCacheControl = false;
  let uncoveredTailReport;
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
  let creditMintedStateless =
    options.fallbackCreditCode !== undefined ? options.fallbackCreditMintedStateless === true : false;
  let dropHeldStateless =
    threadSourceKind(options.querySource) !== null && isTetherLive()
      ? isThreadHeldStateless(options.agentId)
      : false;
  let allowsNoTransientReminders = canUseNoTransientReminders(
    options.querySource,
    options.agentId,
    options.model,
    creditMintedStateless,
  );
  let wireInputsEchoed = echoWireToolInputs;
  if (isTopLevelMain) markRequestBuildPart("records");
  if (hasFallbackBlocks(messagesForAPI_2)) {
    let fallbackBetaPicked = isFirstPartyApiBackend()
      ? pickFallbackBeta({
          fromModel: lastFallbackModel(messagesForAPI_2),
          sticky: conversation_2,
          serverDefaultFallbacksEnabled: () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DASH_FLAME, false),
          selfTargetDefaultFallbacksEnabled: () =>
            getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ELEGANT_POSSUM, false),
        })
      : null;
    let fallbackBetaOk = fallbackBetaPicked !== null && !isBetaRejected_2(conversation_2, fallbackBetaPicked);
    if (fallbackBetaOk) markBetaSent(conversation_2, fallbackBetaPicked);
    logEvent("tengu_rotunda_pennant_replay", {
      echo_eligible: fallbackBetaOk,
      category: fallbackBetaPicked !== null && fallbackBetaPicked === BETA_SERVER_SIDE_FALLBACK_CATEGORY,
    });
  }
  logEvent("tengu_api_after_normalize", {
    postNormalizedMessageCount: messagesForAPI_2.length,
    apiSystemMessageCount: countWhere(messagesForAPI_2, (message) => message.type === "api_system"),
  });
  let fingerprint = computeFingerprintFromMessages(messagesPreNormalize);
  let prefix = getCLISyspromptPrefix({
    isNonInteractive: options.isNonInteractiveSession,
    hasAppendSystemPrompt: options.hasAppendSystemPrompt,
    recorded: options.recordedCliPrefix,
  });
  let safeguards;
  let emitPromptHead = () => {
    if (options.onPromptHeadSent)
      try {
        options.onPromptHeadSent({
          cliPrefix: prefix,
          wireShape: runGuarded(() =>
            requestFeatureFlags(conversation_2, effectiveModel, {
              betas: betaList,
              keptOn: keptRemindersOn,
              safeguards,
            }),
          ),
        });
      } catch (error) {
        logError(toError(error));
      }
  };
  emitPromptHead();
  systemPrompt = buildSystemWithAttribution(systemPrompt, prefix, {
    fingerprint,
    agentContext: options.agentContext,
    previousRequestId: previousRequestId_2,
    promptId: requestPromptId,
    turnOrigin,
    turnPosition,
    responseBeforeCompaction: isMainThread ? getResponseBeforeCompaction() : undefined,
  });
  let enablePromptCaching = options.enablePromptCaching ?? getPromptCachingEnabled(effectiveModel);
  let forkPointMainThread = options.forkPointUuid !== undefined && isMainAgent(options.agentContext);
  let cacheTtlChoice = should1hCacheTTL(options.querySource, {
    agentCacheTtlOverride: options.agentCacheTtlOverride,
    mainThreadModel: isMainThread || forkPointMainThread ? effectiveModel : undefined,
  });
  let ttlChoice = cacheTtlChoice.ttl === "1h" ? "1h" : undefined;
  let messagesTtl = applyMessagesCacheTtlOverride(cacheTtlChoice.ttl) === "1h" ? "1h" : undefined;
  let promptCacheRequested = enablePromptCaching ? (messagesTtl ?? "5m") : "off";
  let ttlOverridden = messagesTtl !== ttlChoice;
  if (isMainThread) {
    setLastMainThreadCacheTtlMs(
      ttlChoice === "1h" ? CACHE_TTL_1H_MS : CACHE_TTL_5M_MS,
      stripModelDateSuffix(options.model),
      cacheTtlChoice.reason === "live_5m_cache",
    );
    if (ttlOverridden) noteMainThreadCacheTtl5m();
  }
  let usageRecorded = false;
  let recordUsageOnce = () => {
    if (usageRecorded) return;
    usageRecorded = true;
    let usageAt = dispatchedAt || clock.now();
    if (isMainThread)
      recordPromptCacheUsage(MAIN_2, {
        at: usageAt,
        ttl: getCacheCreationTtl(usage) ?? messagesTtl ?? "5m",
        inputTokens: usage.input_tokens,
        cacheReadTokens: usage.cache_read_input_tokens,
        cacheCreationTokens: usage.cache_creation_input_tokens,
      });
    else if (
      forkPointMainThread &&
      usage.cache_read_input_tokens > 0 &&
      (!options.isEffortPinned ||
        lastSentEffortSince(messages, options.forkPointUuid, perTurnEffortValue, sentEffort))
    )
      touchPromptCache(MAIN_2, usageAt);
  };
  let buildSystemBlocks = () =>
    buildSystemPromptBlocks(systemPrompt, enablePromptCaching, {
      skipGlobalCacheForSystemPrompt: hasLiveMcpTools,
      cacheTtl: ttlChoice,
      scopeRefused: isBetaRejected_2(conversation_2, BETA_PROMPT_CACHING_SCOPE),
    });
  let systemBlocks = buildSystemBlocks();
  let hasBetas = betaList.length > 0;
  let deferralPlaceholderSchema = [...(options.extraToolSchemas ?? [])];
  if (advisorModelForSend)
    deferralPlaceholderSchema.push({
      type: ADVISOR_20260301,
      name: ADVISOR_TOOL_NAME,
      model: advisorModelForSend,
      ...(advisorDeferredNow && {
        defer_loading: true,
      }),
    });
  let tools_2 = annotateToolsWithFallback(
    [...results, ...deferralPlaceholderSchema],
    withServerUrlHeader(conversation_2, coverage !== undefined),
    toolCoverage,
  );
  if (isTopLevelMain) markRequestBuildPart("system");
  let prefixDeltaText = prefixLedgerNotice(
    conversation_2,
    {
      model: toProviderWireModelId(options.model),
      tools: tools_2,
      system: systemBlocks,
      messages: messagesForAPI_2.map((message) => ({
        role: message.message.role,
        content: message.message.content,
      })),
    },
    {
      querySource: options.querySource,
      retryCause: undefined,
      promptEpoch: options.promptRenderEpoch,
    },
  );
  if (prefixDeltaText !== undefined) {
    let fingerprint = createAttachmentMessage_2({
      type: "prefix_delta",
      text: prefixDeltaText,
    });
    yield fingerprint;
    let renormalized = runGuarded(() =>
      normalizeMessagesForRequest([...messages, fingerprint], normalizeOptions),
    );
    messagesForAPI_2 = renormalized.messagesForAPI;
    accountMemoryEpoch_2 = renormalized.accountMemoryEpoch;
    surfaceDeferredTools(conversation_2, messages, messagesForAPI_2, {
      useToolSearch,
      toolSearchAbsent: toolChangeMode === "tool_addition",
      blocksEligible: renormalized.blocksEligible,
      byValueNames,
      byValueStaysOut,
    });
    getMidConvFallback = renormalized.midConvFallback;
    getToolChangeFallback = renormalized.toolChangeFallback;
    getInlineToolsFallback = renormalized.inlineToolsFallback;
  }
  let effortFromConfig = runGuarded(() =>
    resolveEffortFromLastOutputConfig(messagesForAPI_2, cappedEffort, (effortCandidate) =>
      resolveAppliedEffort(effortCandidate, resolvedModel),
    ),
  );
  let effortValue = effortFromConfig;
  let effortLevelNormalized = runGuarded(() =>
    modelSupportsEffort(resolvedModel) && effortFromConfig !== undefined
      ? normalizeEffortLevel(effortFromConfig)
      : undefined,
  );
  let fastModeEligible =
    isFastModeEnabled() &&
    runGuarded(() => isFastModeAvailable()) &&
    runGuarded(() => supportsFastMode(effectiveModel)) &&
    !!options.fastMode &&
    !isFallbackModelFastRejected(options.model);
  let fastModeActive = fastModeEligible && !isFastModeCooldown();
  let afkBetaAllowed = () =>
    shouldAllowAfkModeBeta() ||
    (isBetasSwitchSetAside() &&
      getClassifierProviderKind() === "firstParty" &&
      !isThirdPartyServerClassifierRefused());
  let afkModeOn = false;
  if (isAgenticQuery) {
    if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FIZZY_BONBON, false)) {
      if (isAutoModeActive() && afkBetaAllowed()) markBetaSent(conversation_2, BETA_AFK_MODE);
      afkModeOn = isBetaSent(conversation_2, BETA_AFK_MODE) && afkBetaAllowed();
    } else if (!isAutoModeCircuitBroken() && !isBetaRejected_2(conversation_2, BETA_AFK_MODE))
      try {
        let toolPermissionContext = await options.getToolPermissionContext();
        afkModeOn =
          toolPermissionContext !== undefined &&
          isAutoClassifierActive(toolPermissionContext.mode) &&
          afkBetaAllowed();
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
  if (fastModeActive) markBetaSent(conversation_2, BETA_SPEED);
  let speedBetaOn =
    isBetaSent(conversation_2, BETA_SPEED) &&
    (!isAutoModeQuerySource(options.querySource) || fastModeEligible);
  if (canSendProviderBetas()) markBetaSent(conversation_2, BETA_CACHE_DIAGNOSIS);
  let cacheDiagnosisOn = () => canSendProviderBetas() && isBetaSent(conversation_2, BETA_CACHE_DIAGNOSIS);
  let keepaliveHeaderOn = releaseKeepaliveChain(conversation_2, {
    isMainLoopRequest: isMainThread,
    continuesPrefix: options.forkPointUuid !== undefined,
    cacheTtl: enablePromptCaching && !ttlOverridden ? cacheTtlChoice : undefined,
  });
  let chainReleaseCount = getMainChainReleaseCount();
  let modelSwitchCount = getModelSwitchCount();
  let requestId = undefined;
  let noteResponse = (streamRequestId, headers, isWhole) => {
    if (isMainThread) {
      requestId = streamRequestId;
      evaluateCacheKeepalive({
        conversation: conversation_2,
        headerSent: keepaliveHeaderOn,
        requestId: streamRequestId,
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
  let dewdropMode;
  let thinkingBindingOn = false;
  try {
    let shouldSendBetas =
      !(betas.type === "disabled" && betas.mechanical === true) &&
      !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE &&
      (!isWIFDispatchAuth() || isFirstPartyBaseUrl());
    if (shouldSendBetas && canSendFirstPartyBetas()) {
      if (betas.type !== "disabled") {
        dewdropMode = getPolishedDewdropMode();
        if (isPolishedDewdropActive(dewdropMode))
          markBetaSent(conversation_2, BETA_THINKING_BINDING_CONTROLS);
      }
      thinkingBindingOn = isBetaSent(conversation_2, BETA_THINKING_BINDING_CONTROLS);
    } else if (shouldSendBetas && !areExperimentalBetasDisabled()) {
      let providerForModel = getProviderForModel(options.model);
      if (
        (providerForModel === "bedrock" || providerForModel === "mantle" || providerForModel === "vertex") &&
        usesDefaultProviderEndpoint(providerForModel) &&
        runGuarded(() => thirdPartyAcceptsThinkingBindingBeta(providerForModel, options.model))
      ) {
        if (betas.type !== "disabled") markBetaSent(conversation_2, BETA_THINKING_BINDING_CONTROLS);
        thinkingBindingOn = isBetaSent(conversation_2, BETA_THINKING_BINDING_CONTROLS);
      }
    }
  } catch (error) {
    logError(error);
    dewdropMode = undefined;
    thinkingBindingOn = false;
  }
  if (!thinkingBindingOn && !shouldIncludeFirstPartyOnlyBetas())
    betaList = betaList.filter((beta) => beta !== BETA_THINKING_BINDING_CONTROLS);
  if (options.evictCacheOnComplete && options.stickyBetas !== undefined && isSubagentCacheEvictEnabled())
    markBetaSent(conversation_2, BETA_PROMPT_CACHING_EVICT);
  let contextHintController =
    require("../compact/createContextHintController.lazy.js").createContextHintController({
      querySource: options.querySource,
      agentId: options.agentId,
      includeFirstPartyBetas: canSendFirstPartyBetas(),
      is529Error,
      storageV5: options.storageV5,
    });
  let sentEffort = undefined;
  let perTurnEffortValue = null;
  let perTurnNowValue = undefined;
  let refusedEffortInfo = () =>
    getRefusedEffortCarry({
      sent: sentEffort !== undefined && effortFromConfig !== cappedEffort ? normalizedEffort : sentEffort,
      turnEffort: options.turnEffort,
      hookEffortValue: options.hookEffortValue,
    });
  let deferredFilteredTools;
  let betaHeaderList;
  let messageHashes;
  let getMessageHashes = () => (messageHashes ??= fingerprintMessagesForCache(messagesForAPI_2));
  let extraBodyParamsForLog = () => {
    let messages = getExtraBodyParams();
    alwaysFalseResponseDiag(messages, options.model, getProviderForModel(options.model));
    return messages;
  };
  if (isTopLevelMain) markRequestBuildPart("headers");
  let toolSchemas = (deferredFilteredTools ??= tools_2.filter(
    (toolSchema) => !("defer_loading" in toolSchema && toolSchema.defer_loading),
  ));
  betaHeaderList ??= betaHeaderValues(betaList);
  recordPromptState({
    system: systemBlocks,
    toolSchemas: deferredFilteredTools,
    anyDeferLoading: deferredFilteredTools.length !== tools_2.length,
    querySource: options.querySource,
    model: options.model,
    agentId: options.agentId,
    fastMode: speedBetaOn,
    globalCacheStrategy,
    betas: keepaliveHeaderOn ? [...betaHeaderList, BETA_CACHE_KEEPALIVE.header] : betaHeaderList,
    autoModeActive: afkModeOn,
    isUsingOverage: getCurrentLimits().isUsingOverage ?? false,
    is1hCacheTTL: messagesTtl === "1h",
    queryDepth: options.queryTracking?.depth,
    cacheDiagnosis: cacheDiagnosisOn(),
    effortValue: effortFromConfig,
    thinkingConfig: betas,
    extraBodyParams: extraBodyParamsForLog(),
    getMessageHashes,
    messages: messagesForAPI_2,
    baselineAgentId:
      options.querySource === "agent_summary" && isSubagentContext(options.agentContext)
        ? options.agentContext.agentId
        : undefined,
  });
  if (isTopLevelMain) markRequestBuildPart("cache_break_record");
  let lastLoggedMessages = messagesForAPI_2;
  let tetherDelta = null;
  let recoveryState = () =>
    getClassifierProviderKind() === "thirdParty" && sentBetaHeaders.includes(BETA_DANGEROUS_TOOL_USE.header);
  let tokenCountBetaBlocked = () =>
    thinkingBindingOn &&
    !shouldIncludeFirstPartyOnlyBetas() &&
    sentBetaHeaders.includes(BETA_THINKING_BINDING_CONTROLS.header);
  let droppedBetas = [];
  let releaseClassifierRefusal = false;
  let handleDangerousToolUseRejection = (error) => {
    if (!isBetaSent(conversation_2, BETA_DANGEROUS_TOOL_USE)) return;
    let thirdParty = recoveryState();
    let CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS =
      !thirdParty &&
      sentBetaHeaders.includes(BETA_DANGEROUS_TOOL_USE.header) &&
      env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS;
    let serverSide = thirdParty || CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS;
    let mentionsBeta =
      serverSide &&
      error instanceof APIError &&
      error.status === 400 &&
      error.message.includes(BETA_DANGEROUS_TOOL_USE.header);
    let invalidBetaFlag = serverSide && !tokenCountBetaBlocked() && isInvalidBetaFlagError(error);
    let foundryCaps = thirdParty ? (parseFoundryUnsupportedCapabilities(error) ?? []) : [];
    let hasChromeTools = foundryCaps.some(
      (capability) => capability.includes("dangerous_tool_use") || capability.includes("safeguard"),
    );
    if (!mentionsBeta && !invalidBetaFlag && !hasChromeTools && !isSafeguardsRejected(error)) return;
    markBetaRejected(conversation_2, BETA_DANGEROUS_TOOL_USE);
    let stopAsking = thirdParty || (CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS && isBetasSwitchSetAside());
    if (invalidBetaFlag && !mentionsBeta && !hasChromeTools && !isSafeguardsRejected(error)) {
      droppedBetas.push(BETA_DANGEROUS_TOOL_USE);
      releaseClassifierRefusal = stopAsking && !isThirdPartyServerClassifierRefused();
    }
    if (stopAsking) {
      markThirdPartyServerClassifierRefused();
      if (hasChromeTools) recordFoundryUnsupportedCapabilities(options.model, foundryCaps);
    }
    logForDebugging(
      thirdParty
        ? "[server-classifier] the platform rejected a beta on this request (HTTP 400), most likely dangerous-tool-use, which this deployment does not know yet; it is not sent again this session and auto mode decides with the local classifier"
        : stopAsking
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
      unnamed: invalidBetaFlag,
      foundryFeature: hasChromeTools,
      unclaimed: false,
      betasSwitchSetAside: CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS,
      stopsAsking: stopAsking,
    });
    return "retry:safeguards";
  };
  let isSpeedUnsupported = (error) =>
    isSpeedParameterUnsupportedError(error, options.model) &&
    (!!options.modelIsRefusalFallbackTarget || wasEverFastRejected(options.model));
  let isUnrecoverable = (error) => isNonFallbackError(error) || isSpeedUnsupported(error);
  let isToolSearchRejectable = (error) =>
    toolChangeMode !== undefined &&
    partialMessage === undefined &&
    error instanceof APIError &&
    !options.resumeIncompleteThinking;
  let isDeferredToolsRejection = (error) => {
    let normalizedError = normalize422To400(error);
    return (
      isToolSearchRejectable(error) &&
      (!isDirectFirstPartyApi() || /\bdefer_loading\b/.test(error.message)) &&
      (error.status === 400 || error.status === 422) &&
      error.type !== "billing_error" &&
      !isUnrecoverable(normalizedError) &&
      !isUnrecoverableError(normalizedError)
    );
  };
  let refuseToolSearch = (error, beta, reason) => {
    logForDebugging(
      `[ToolSearch] HTTP ${error.status} ${reason}${beta ? ` (${beta.header})` : ""}; sending the request again without deferred tools. ENABLE_TOOL_SEARCH=false avoids the refused request${droppedBetas.length > 0 ? `. Dropped first and now allowed again: ${betaHeaderValues(droppedBetas).join(", ")}` : ""}`,
      {
        level: "warn",
      },
    );
    for (let droppedBeta of droppedBetas) forgetBeta(conversation_2, droppedBeta);
    if (releaseClassifierRefusal) releaseThirdPartyServerClassifierRefusal();
    throw new ToolSearchRefusedError(error, useToolSearch);
  };
  let maybeRefuseToolSearch = (error) => {
    if (toolSearchBeta !== null && isToolSearchRejectable(error) && isBetaRejected(error, toolSearchBeta))
      refuseToolSearch(error, toolSearchBeta, "refusing the tool search beta");
    return;
  };
  let maybeRefuseToolSearchFinal = (error) => {
    if (isDeferredToolsRejection(error))
      refuseToolSearch(
        error,
        toolSearchBeta,
        "that no other recovery took, on a request that declared deferred tools",
      );
    return;
  };
  let toolSearchRefusalHandled = false;
  let probeState = () => {
    let toolSearchRefusal = options.toolSearchRefusal;
    if (toolSearchRefusal === undefined || toolSearchRefusalHandled) return;
    toolSearchRefusalHandled = true;
    try {
      let toolSearchBeta = getToolSearchBeta();
      let headerRejected = isBetaRejected(toolSearchRefusal, toolSearchBeta);
      if (headerRejected)
        latchBetaRefused(toolSearchBeta, isBetaHeaderRejected(toolSearchRefusal, toolSearchBeta));
      else {
        markBetaRejected(conversation_2, toolSearchBeta);
        logForDebugging(
          "[ToolSearch] the endpoint answered the request sent without tool search, so this conversation goes on without it",
        );
      }
      logEvent("tengu_beta_400_healed", {
        beta: hashToolNames([toolSearchBeta.header]),
        model: telemetrySafeModelName(options.model),
        provider: getAPIProviderForAnalytics(),
        status: toolSearchRefusal.status,
        unnamed: !headerRejected,
      });
    } catch (error) {
      logError(error);
    }
  };
  let recoverUnclaimedBeta = (error) => {
    let healed = recoverThinkingBinding(error, true);
    if (healed !== null) return healed;
    if (!(error instanceof APIError) || error.status === undefined) return;
    let normalizedError = normalize422To400(error);
    if (isUnrecoverable(normalizedError) || isUnrecoverableError(normalizedError)) return;
    try {
      let httpError = isAuthRetryableError(error, options.model) || isRemoteAuthError(error);
      if (typeof systemMessagesState === "object") {
        if (httpError) systemMessagesState = "spent";
        else if (isBetaRejectionStatus(error)) {
          systemMessagesState = "spent";
          logForDebugging(
            "[server-classifier] the request was refused again when sent without the dangerous-tool-use beta header and the safeguards field, so it is not known whether they caused the refusal; the next request (not a retry of this one) sends them again",
            {
              level: "warn",
            },
          );
        }
      } else if (
        systemMessagesState === "idle" &&
        isBetaSent(conversation_2, BETA_DANGEROUS_TOOL_USE) &&
        recoveryState() &&
        !httpError &&
        isBetaRejectionStatus(error)
      ) {
        logForDebugging(
          `[server-classifier] HTTP ${error.status} with no cause Claude Code recognises, on a request that carried the dangerous-tool-use beta header; sending it once more without that header and the safeguards field, to learn whether they caused the refusal`,
          {
            level: "warn",
          },
        );
        logEvent("tengu_server_classifier_beta_rejected_retry", {
          provider: getAPIProviderForAnalytics(),
          unnamed: false,
          foundryFeature: false,
          unclaimed: true,
          status: error.status,
        });
        systemMessagesState = {
          resentAfter: error.status,
        };
        return "retry:safeguards-unclaimed";
      }
    } catch (error) {
      logError(error);
    }
    if (
      (error.status !== 400 && error.status !== 422) ||
      shouldIncludeFirstPartyOnlyBetas() ||
      conversation_2.systemMessagesAcceptedBy.has(effectiveModel)
    )
      return;
    let healState = recoverToolChange(error, true);
    if (healState !== undefined) midConvProbeState = "retrying";
    return healState;
  };
  let healState = () => {
    if (typeof systemMessagesState === "object") {
      let { resentAfter } = systemMessagesState;
      systemMessagesState = "spent";
      markBetaHeaderRejectedForever(conversation_2, resentAfter, options.model);
    }
  };
  let probeThinkingDisplay = (error) => {
    try {
      if (!(error instanceof APIError) || (error.status !== 400 && error.status !== 422)) return;
      if (thinkingDisplayProbeState === "withoutField") {
        thinkingDisplayProbeState = "spent";
        let healed = recoverUnclaimedBeta(error);
        if (healed === undefined && !isUnrecoverable(error) && !isDeferredToolsRejection(error))
          noteThinkingDisplayProbeFailure();
        return healed;
      }
      if (
        thinkingDisplayProbeState === "spent" ||
        sentThinkingDisplay === undefined ||
        error.type === "billing_error" ||
        isUnrecoverable(error) ||
        (isUnrecoverableError(error) && !isThinkingDisplayRejected(error)) ||
        !hasThinkingDisplayProbesLeft() ||
        isDirectFirstPartyApi()
      )
        return;
      betaList = betaList.filter((beta) => beta !== BETA_THINKING_DISPLAY_UPDATES);
      thinkingDisplayProbeState =
        sentThinkingDisplay === "updates" && betas.display !== undefined ? "withoutUpdates" : "withoutField";
      return `retry:thinking-display-unclaimed:${thinkingDisplayProbeState}`;
    } catch (error) {
      logError(error);
      return;
    }
  };
  let settleProbeState = () => {
    if (midConvProbeState === "retrying") midConvProbeState = "spent";
    else if (
      !shouldIncludeFirstPartyOnlyBetas() &&
      sentMessages.some((message) => message.role === "system")
    ) {
      conversation_2.systemMessagesAcceptedBy.add(effectiveModel);
      emitPromptHead();
    }
  };
  let noteMidConvGuessWrong = () => {
    if (midConvProbeState === "retrying") {
      forgetBeta(conversation_2, BETA_MID_CONVERSATION_SYSTEM);
      emitPromptHead();
      logForDebugging(
        "[mid-conv-system] the resend without system messages was not answered either, so the guess that the platform refuses them is dropped; the next request of this conversation sends them again",
        {
          level: "warn",
        },
      );
    }
  };
  let settleMidConvState = () => {
    if (thinkingDisplayProbeState === "idle" || thinkingDisplayProbeState === "spent") return;
    let withoutField = thinkingDisplayProbeState === "withoutField";
    thinkingDisplayProbeState = withoutField ? "spent" : "idle";
    try {
      if (withoutField) markBetaRejected(conversation_2, THINKING_DISPLAY_NAMED_BETA);
      markBetaRejected(conversation_2, BETA_THINKING_DISPLAY_UPDATES);
      logForDebugging(
        `[thinking] a request was refused (HTTP 400 or 422) and went through when sent again ${withoutField ? "without thinking.display" : "with the session's own display in place of 'updates'"}; this conversation no longer sends ${withoutField ? "thinking.display" : "'updates'"}.`,
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
  let probeThinkingTokenCount = (error, latencyOnly) => {
    try {
      if (!(error instanceof APIError) || (error.status !== 400 && error.status !== 422)) return;
      if (thinkingTokenProbeState === "resent") thinkingTokenProbeState = "spent";
      let normalizedError = normalize422To400(error);
      if (
        thinkingTokenProbeState !== "idle" ||
        !sentBetaHeaders.includes(BETA_THINKING_TOKEN_COUNT.header) ||
        error.type === "billing_error" ||
        apiErrorCode(error) !== undefined ||
        isClientVersionRejected(normalizedError) ||
        isUnrecoverable(normalizedError) ||
        (error.status === 400 && latencyOnly) ||
        classifyFallbackCreditError(error) !== undefined ||
        classifyServerFallbackError(error) !== undefined ||
        (isUnrecoverableError(normalizedError) &&
          !error.message.includes(BETA_THINKING_TOKEN_COUNT.header)) ||
        isDirectFirstPartyApi()
      )
        return;
      logForDebugging(
        `[thinking] HTTP ${error.status} that no earlier recovery took; sending the request again without the ${BETA_THINKING_TOKEN_COUNT.header} beta`,
        {
          level: "warn",
        },
      );
      betaList = betaList.filter((beta) => beta !== BETA_THINKING_TOKEN_COUNT);
      thinkingTokenProbeState = latencyOnly ? "spent" : "resent";
      return "retry:thinking-token-count-unclaimed";
    } catch (error) {
      logError(error);
      return;
    }
  };
  let settleTokenCountState = () => {
    if (thinkingTokenProbeState !== "resent") return;
    thinkingTokenProbeState = "spent";
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
  let recoverHookRetry = (error) => {
    return;
  };
  let probeClearAt = (error) => {
    {
      let is400 = error instanceof APIError && error.status === 400;
      if (clearAtProbeState === "retrying") {
        if (is400) {
          clearAtProbeState = "spent";
          if (!isUnrecoverable(error) && !(threadsProbeState === "idle" && isThreadsProbeCandidate(error)))
            noteClearAtProbeFailure();
        }
        return;
      }
      if (
        clearAtProbeState === "idle" &&
        clearAtOnWire &&
        betaList.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT) &&
        is400 &&
        error.type !== "billing_error" &&
        !isUnrecoverable(error) &&
        !isUnrecoverableError(error) &&
        hasClearAtProbeBudget()
      ) {
        clearAtProbeState = "retrying";
        clearAtProbeRequestId = error.requestID ?? undefined;
        betaList = betaList.filter((beta) => beta !== BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
        tetherDelta?.forceCreate("clear_at_header_retired");
        return "retry:kept-reminder-unrecognised-400";
      }
    }
    return;
  };
  let isThreadsProbeCandidate = (error) => {
    try {
      return (
        BETA_MESSAGE_THREADS !== null &&
        getAPIProvider() === "firstParty" &&
        sentBetaHeaders.includes(BETA_MESSAGE_THREADS.header) &&
        error instanceof APIError &&
        error.status === 400 &&
        error.type !== "billing_error" &&
        classifyAPIError(error) === "client_error" &&
        !options.resumeIncompleteThinking &&
        !(creditMintedStream && !creditStripped) &&
        getApiErrorCode(error) === undefined &&
        !isUnrecoverable(error) &&
        !isUnrecoverableError(error) &&
        classifyThreadError(error) === null &&
        classifyFallbackCreditError(error) === undefined &&
        classifyServerFallbackError(error) === undefined &&
        hasThreadsProbeBudget()
      );
    } catch (error) {
      logError(error);
      return false;
    }
  };
  let noteThreadsRefused = (error) => {
    try {
      if (threadsProbeState === "retrying" && error instanceof APIError && error.status === 400) {
        threadsProbeState = "spent";
        if (!isUnrecoverable(error)) noteThreadsProbeFailure();
        logEvent("tengu_tether_unrecognised_400", {
          phase: lit_2("refused"),
          planner_backed: threadsProbePlannerBacked,
          query_source: agentTypeForTelemetry(options.querySource),
        });
      }
    } catch (error) {
      logError(error);
    }
  };
  let maybeRetryThreads = (error) => {
    try {
      noteThreadsRefused(error);
      if (threadsProbeState === "idle" && isThreadsProbeCandidate(error)) {
        let plannerBacked = tetherDelta !== null;
        let droppedThread = tetherDelta?.dropForUnrecognised400();
        logEvent("tengu_tether_unrecognised_400", {
          phase: lit_2("start"),
          planner_backed: plannerBacked,
          dropped_thread: droppedThread !== undefined,
          query_source: agentTypeForTelemetry(options.querySource),
        });
        threadsProbeState = "retrying";
        threadsProbeRequestId = error.requestID ?? undefined;
        threadsProbePlannerBacked = plannerBacked;
        return droppedThread ?? "retry:tether-unrecognised-400";
      }
    } catch (error) {
      logError(error);
    }
    return;
  };
  let sawApiError = false;
  let handleKeptReminderRejection = (error) => {
    if (error instanceof APIError && error.status !== undefined) sawApiError = true;
    noteThreadsRefused(error);
    if (betaList.includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT) && isKeptReminderClearAtRejected(error)) {
      betaList = betaList.filter((beta) => beta !== BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
      markBetaRejected(conversation_2, BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
      retireKeptReminder();
      emitPromptHead();
      tetherDelta?.forceCreate("clear_at_header_retired");
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
      isTetherBetaRejected(error) &&
      !isBetaRejected_2(conversation_2, BETA_MESSAGE_THREADS)
    ) {
      markBetaRejected(conversation_2, BETA_MESSAGE_THREADS);
      disableTetherLiveGate();
      logForDebugging(
        "[tether] server rejected the message-threads beta header \u2014 dropping it and threading for this session",
        {
          level: "warn",
        },
      );
      return tetherDelta?.resolveRetry(error) ?? "retry:tether-header";
    }
    return tetherDelta?.resolveRetry(error);
  };
  let toolResultClearingPlan = planToolResultClearingAfterIdle(
    messages,
    options.querySource,
    options.model,
    options.agentId,
    (toolName) => findToolByName(normalizeOptions.tools, toolName)?.name,
    options.forkPointUuid,
  );
  let tetherDecision;
  if (toolResultClearingPlan)
    try {
      tetherDecision = turnTokenSizing(messages, options.model, bytesPerTokenForModel(options.model));
    } catch (error) {
      logIdleClearingFailure(error, "sad", "sizing_history_before_clearing_threw");
    }
  let contextManagementEligible = false;
  let sentMessages = [];
  let wireIndexMap = [];
  let sourceIndexOf = (messageIndex) => {
    if (wireIndexMap.length === 0) return messageIndex;
    for (let i = wireIndexMap.length - 2; i >= 0; i--) if (wireIndexMap[i] === messageIndex) return i;
    return;
  };
  let pinnedSystem = undefined;
  let pinnedTools = undefined;
  let systemOverridden = false;
  let threadSliced = false;
  let threadSliceFrom = 0;
  let threadType = "none";
  let pinnedSystemValue = false;
  let currentThreadBody = () => ({
    messages: sentMessages,
    system: pinnedSystem,
    tools: pinnedTools,
  });
  {
    let agentType = threadSourceKind(options.querySource);
    if (agentType !== null && isTetherLive()) {
      deferredFilteredTools ??= tools_2.filter(
        (pinnedTools) => !("defer_loading" in pinnedTools && pinnedTools.defer_loading),
      );
      betaHeaderList ??= betaHeaderValues(betaList);
      let previousMessageId = lastAssistantMessageId(messages);
      let dangerousToolUse =
        isBetaSent(conversation_2, BETA_DANGEROUS_TOOL_USE) ||
        (options.serverClassifier === true &&
          options.autoModeServerContext !== undefined &&
          canUseServerClassifier() &&
          !isBetaRejected_2(conversation_2, BETA_DANGEROUS_TOOL_USE) &&
          !isThirdPartyServerClassifierRefused());
      let engine = logTetherDecisionSafely({
        querySource: options.querySource,
        agentId: options.agentId,
        model: options.model,
        modelHeldStateless,
        relayHeldStateless,
        classifierHeldStateless,
        creditRetryStateless: creditMintedStateless,
        dropHeldStateless,
        system: systemBlocks,
        toolSchemas: deferredFilteredTools,
        betas: betaHeaderList,
        latchedHeaders: {
          fastMode: speedBetaOn,
          autoMode: afkModeOn,
          cacheTtl1h: ttlChoice === "1h",
          evictOnComplete: isBetaSent(conversation_2, BETA_PROMPT_CACHING_EVICT),
          cacheDiagnosis: cacheDiagnosisOn(),
          cacheKeepalive: keepaliveHeaderOn,
          dangerousToolUse,
        },
        thinkingConfig: betas,
        toolChoice: options.toolChoice,
        effortValue: effortFromConfig,
        extraBodyParams: extraBodyParamsForLog(),
        getMessageHashes,
        previousMessageId,
      });
      if (isSubagentOrUnknown(agentType, options.agentId)) {
        let tetherEchoAudit = auditTetherEchoSafely(messages, messagesForAPI_2);
        tetherDelta = buildTetherDelta({
          engine,
          previousMessageId,
          anchorRewritten:
            tetherEchoAudit !== null && hasStructuralEchoDiff(tetherEchoAudit, previousMessageId),
          messages: messagesForAPI_2,
          agentId: options.agentId,
          model: options.model,
          modelHeldStateless,
          relayHeldStateless,
          classifierHeldStateless,
          creditRetryStateless: creditMintedStateless,
          dropHeldStateless,
          toolResultClearingHeldStateless: toolResultClearingPlan !== undefined,
          clock,
        });
        if (tetherEchoAudit !== null)
          logTetherEchoAudit(tetherEchoAudit, {
            sourceCategory: agentType,
            messageCount: messagesForAPI_2.length,
            anchorMessageId: previousMessageId,
          });
      }
    }
  }
  let tracingMetadata = isBetaTracingEnabled()
    ? {
        systemPrompt: systemPrompt.join(`

`),
        userSystemPrompt: options.userSystemPrompt,
        querySource: options.querySource,
        tools: jsonStringify(stripToolAnnotations(tools_2)),
      }
    : undefined;
  let memoMemoryKeys;
  let accountMemoryKeys = () => (memoMemoryKeys ??= memoryToolNames(messages, tools));
  let llmRequestSpan = startLLMRequestSpan(
    options.model,
    options.agentContext,
    tracingMetadata,
    messagesForAPI_2,
    fastModeActive,
    options.querySource,
    accountMemoryKeys,
  );
  let requestStartAt = clock.monotonicNow();
  let attemptStartAt = clock.monotonicNow();
  let attemptNumber = 0;
  let attemptStartTimes = [];
  let activeStream = undefined;
  let responseRequestId = undefined;
  let classifierOnRequest = false;
  let classifierSession;
  let noteClassifierUnsupported = (unsupported) => {
    if (
      unsupported !== undefined &&
      getClassifierProviderKind() === "thirdParty" &&
      isServerClassifierUnsupported(unsupported) &&
      !isThirdPartyServerClassifierRefused() &&
      !isArbiterWithFallbackActive()
    ) {
      markThirdPartyServerClassifierRefused();
      logForDebugging(
        `[server-classifier] the platform gave no classification for this request (${unsupported.why}); treating that as this deployment's answer: auto mode classifies locally for the rest of this session and stops sending the classifier context`,
      );
    }
  };
  let settleClassifier = (session, payload, blocks) => {
    let callIds = blocks.flatMap((block) =>
      block.type === "tool_use" && typeof block.id === "string" ? [block.id] : [],
    );
    noteClassifierUnsupported(settleServerClassifierResult(session, payload, callIds));
  };
  let cacheMarkable = false;
  let toolRefs = false;
  let clearAtOnWire = false;
  let clearAtProbeState = "idle";
  let clearAtProbeRequestId;
  let threadsProbeState = "idle";
  let threadsProbeRequestId;
  let threadsProbePlannerBacked = false;
  let thinkingDisplayProbeState = "idle";
  let thinkingTokenProbeState = "idle";
  let midConvProbeState = "idle";
  let systemMessagesState = "idle";
  let contextBetaState = "idle";
  let contextBetaRefused = () => contextBetaState !== "idle" && contextBetaState !== "spent";
  let longContextRequested = false;
  let firstAttemptRequestId = undefined;
  let healOutcome = undefined;
  let healRequestId;
  let recordRequestBodies = (params, stream) => {
    prepareSendParams(params);
    let snapshottedParams = stripUrlsFromAnnotations(applyThreadBody(params, currentThreadBody()));
    let healState = stripUrlsFromAnnotations(params);
    if (snapshottedParams === undefined || healState === undefined) {
      healOutcome = undefined;
      healRequestId = undefined;
      return;
    }
    captureAPIRequest(snapshottedParams, options.querySource, isMainAgent(options.agentContext));
    healOutcome = logApiRequestBody(
      {
        ...healState,
        stream,
      },
      options.querySource,
      accountMemoryKeys,
      snapshottedParams.messages,
      options.agentContext,
    );
    healRequestId = replayTranscriptRequest({
      params: snapshottedParams,
      querySource: options.querySource,
      agentId: options.agentId,
      storageV5: options.storageV5,
      conversation: messages,
      stickyBetas: conversation_2,
      readInjectedBody: () => getExtraBodyParams(),
      markAddresses: countWithheldUrls(snapshottedParams),
    });
  };
  let clientRequestId = undefined;
  let responseBody = undefined;
  let streamResponse;
  let isLowPriority = false;
  let lowPriorityWait = emptySuspendState();
  let headersReceivedAt = undefined;
  let responseMeta;
  let limitsAccountEpoch = getLimitsAccountEpoch();
  let onQuotaWindowWait = (rejection, retryPlan) => {
    let requestRouteKind = getRequestRouteKind(options);
    if (!options.leavesLimitStateAlone)
      extractQuotaStatusFromError(
        rejection,
        requestRouteKind,
        clock.now(),
        limitsAccountEpoch,
        options.storageV5,
      );
    return beginUsageLimitWait({
      route: requestRouteKind,
      querySource: options.querySource,
      model: options.model,
      rateLimitType: applyMockHeaders(rejection).rateLimitType,
      retryAtMs: retryPlan.retryAtMs,
      attempt: retryPlan.attempt,
      maxRetries: retryPlan.maxRetries,
    });
  };
  let isUsageLimitLifted = (rejection) =>
    preflightRateLimit({
      rejection,
      nowMs: clock.now(),
      credentials: options.credentials,
      stop: signal,
    });
  let firstByteTimer = null;
  function cancelFirstByteTimer() {
    if (firstByteTimer !== null) {
      firstByteTimer();
      firstByteTimer = null;
    }
  }
  function releaseStreamResources() {
    cancelFirstByteTimer();
    cleanupStream(activeStream);
    activeStream = undefined;
    if (responseBody) {
      responseBody.body?.cancel().catch(() => {});
      responseBody = undefined;
    }
  }
  let sentBetaHeaders = [];
  let betasToDrop = false;
  let serverUrlBetaTried = [];
  let thinkingTokenCountState = undefined;
  let sentThinkingDisplay = undefined;
  let requestedDisplayField = undefined;
  let solicited = false;
  let prefixMismatchBehavior;
  let thinkingType = "disabled";
  let responseDiagFlag = false;
  let hasOutputFormat = false;
  let fastModelUsed;
  let thinkingAlreadyStripped = false;
  let serverFallbackExplicit = false;
  let serverFallbackMode = "none";
  let serverFallbackWithBlocks = false;
  let categoryBetaRefused = false;
  if (options.fallbackCreditCode !== undefined && (!canMintCredit || toolMoveReport !== undefined))
    logEvent("tengu_fallback_credit_skipped", {
      reason: canMintCredit ? lit_2("tool_changes_dropped") : lit_2("backend_unknown_or_mismatch"),
      ...(toolMoveReport && {
        ...toolMoveReport,
        late_tools_inlined: inlinedCount,
      }),
      mint_request_id: sanitizeMarkName(options.fallbackCreditMintRequestId),
      mint_model: telemetrySafeModelName(options.fallbackCreditMintModel),
      model: telemetrySafeModelName(options.model),
      query_source: agentTypeForTelemetry(options.querySource),
    });
  let fallbackCreditCode =
    canMintCredit && toolMoveReport === undefined ? options.fallbackCreditCode : undefined;
  let redactFallbackCreditCode = (text) =>
    (options.fallbackCreditCode ? text.split(options.fallbackCreditCode).join("[FCT_REDACTED]") : text).slice(
      0,
      600,
    );
  let creditMintedStream = false;
  let creditEchoedStream = false;
  let creditStripped = false;
  let creditHeaderRefused = false;
  let creditBetaOnWire = false;
  let creditOutcomeLogged = false;
  let creditLogged = false;
  let logCreditOutcome = (outcome, requestId, usage) => {
    if (!creditMintedStream || creditOutcomeLogged) return;
    creditOutcomeLogged = true;
    let effort = sentEffort;
    logEvent("tengu_fallback_credit_outcome", {
      outcome: fromEnum(outcome),
      mint_request_id: sanitizeMarkName(options.fallbackCreditMintRequestId),
      mint_model: telemetrySafeModelName(options.fallbackCreditMintModel),
      request_id: sanitizeMarkName(requestId),
      client_request_id: sanitizeMarkName(clientRequestId),
      model: telemetrySafeModelName(options.model),
      query_source: agentTypeForTelemetry(options.querySource),
      carried_effort_level: fromEnumOpt(carriedEffortReport?.level),
      carried_effort_outcome: fromEnumOpt(carriedEffortReport?.outcome),
      effort_level: fromEnumOpt(effort),
      ...(usage !== null && {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
        cache_creation_5m_input_tokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
        cache_creation_1h_input_tokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
        service_tier: fromEnumOpt(usage.service_tier),
        speed: fromEnumOpt(usage.speed),
      }),
    });
  };
  let thinkingSanitized = false;
  let malformedRepaired = false;
  let effortClampedLogged = false;
  let buildRequestParamsGuarded = (context, allowClassifier = true) =>
    runGuarded(() => buildRequestParams(context, allowClassifier));
  let buildRequestParams = (context, allowClassifierRetry) => {
    let withClassifier = allowClassifierRetry && isTopLevelMain;
    if (messagesForAPI_2 !== lastLoggedMessages) {
      lastLoggedMessages = messagesForAPI_2;
      messageHashes = undefined;
      recordMessageHistory({
        querySource: options.querySource,
        agentId: options.agentId,
        getMessageHashes,
        messages: messagesForAPI_2,
      });
    }
    let isRejectedBeta = (beta) => !KNOWN_BETAS.has(beta) && isBetaRejected_2(conversation_2, beta);
    let betas_2 = betaList.filter((beta) => beta !== BETA_LONG_CONTEXT || !contextBetaRefused());
    if (
      !betas_2.includes(BETA_LONG_CONTEXT) &&
      !contextBetaRefused() &&
      getSonnet46ContextWindowOverride(context.model) !== null
    )
      betas_2.push(BETA_LONG_CONTEXT);
    let provider = getProviderForModel(context.model);
    if (betas_2.includes(BETA_CCR_TOOL_PROVENANCE) && !isFirstPartyCreditEndpoint(provider))
      betas_2.splice(betas_2.indexOf(BETA_CCR_TOOL_PROVENANCE), 1);
    if (
      (ARTIFACT_OUTPUT_SOURCE_QUERIES.has(options.querySource) || options.sendSideQueryBeta === true) &&
      provider === "firstParty" &&
      canSendFirstPartyBetas() &&
      isFirstPartyAnthropicBaseUrl() &&
      isFirstPartyCreditEndpoint(provider) &&
      !env.ANTHROPIC_UNIX_SOCKET &&
      !betas_2.includes(BETA_CLAUDE_CODE_SIDE_QUERY)
    )
      betas_2.push(BETA_CLAUDE_CODE_SIDE_QUERY);
    if (
      options.querySource === "generate_session_title" &&
      provider === "firstParty" &&
      canSendFirstPartyBetas() &&
      isFirstPartyAnthropicBaseUrl() &&
      isFirstPartyCreditEndpoint(provider) &&
      !env.ANTHROPIC_UNIX_SOCKET &&
      !betas_2.includes(BETA_CLAUDE_CODE_SIDE_QUERY)
    )
      betas_2.push(BETA_CLAUDE_CODE_SIDE_QUERY);
    let afkBetaViaBody =
      provider === "bedrock" && BETA_AFK_MODE && afkModeOn && isAgenticQuery && isAutoMode3POptIn();
    if (afkBetaViaBody)
      logForDebugging(
        `auto-mode 3P: sending afk-mode beta '${BETA_AFK_MODE?.header}' to bedrock via body.anthropic_beta`,
      );
    let betaHeaders =
      provider === "bedrock"
        ? [
            ...getBedrockExtraBodyParamsBetas(context.model).filter(
              (header) => header !== BETA_LONG_CONTEXT || !contextBetaRefused(),
            ),
            ...(toolSearchBeta ? [toolSearchBeta] : []),
            ...(afkBetaViaBody && BETA_AFK_MODE ? [BETA_AFK_MODE] : []),
          ].filter((header) => !isRejectedBeta(header))
        : [];
    let extraBodyParams = getExtraBodyParams(betaHeaders);
    addBetaToBodyAnthropicBeta(
      extraBodyParams,
      BETA_THINKING_TOKEN_COUNT,
      provider === "bedrock" && betas_2.includes(BETA_THINKING_TOKEN_COUNT),
    );
    let outputConfigSlots = {
      ...(extraBodyParams.output_config ?? {}),
    };
    delete extraBodyParams.output_config;
    applyEffortToOutputConfig(effortValue, outputConfigSlots, extraBodyParams, betas_2, resolvedModel);
    responseDiagFlag = alwaysFalseResponseDiag(extraBodyParams, context.model, provider);
    configureTaskBudgetParams(options.taskBudget, outputConfigSlots, betas_2);
    if (isRejectedBeta(BETA_EFFORT)) delete outputConfigSlots.effort;
    if (isRejectedBeta(BETA_TASK_BUDGETS) && "task_budget" in outputConfigSlots)
      delete outputConfigSlots.task_budget;
    hasOutputFormat = hasStringFormat(options.outputFormat, outputConfigSlots, betas_2, options.model);
    let silentArmActive = options.refusalFallbackSilentArmActive === true;
    let serverFallbackPlanResult = serverFallbackPlan(
      options.serverRefusalFallback,
      context.model,
      betas_2,
      conversation_2,
      silentArmActive,
      allowsNoTransientReminders,
    );
    applyRefusalFallbackBeta(
      options.fallbackCreditLaneArmed === true || options.fallbackCreditCode !== undefined,
      betas_2,
      conversation_2,
      silentArmActive,
      provider === "bedrock" ? extraBodyParams : undefined,
    );
    creditBetaOnWire = betas_2.includes(BETA_FALLBACK_CREDIT);
    let serverClassifierEligible =
      systemMessagesState === "idle" && thirdPartyAcceptsDangerousToolUseBeta(provider, resolvedModel);
    let classifierContext = withClassifier ? performance.now() : 0;
    let serverReminders =
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
    let classifierContext_2 =
      options.serverClassifier === true && options.autoModeServerContext !== undefined
        ? buildServerClassifierRequestContext({
            autoModeServerContext: options.autoModeServerContext,
            priorTurnContext: collectPriorServerContexts(messages),
            systemReminders: serverReminders,
            textProvenance: buildContextSectionsMessage(messages, messagesForAPI_2, attachmentToMessages),
          })
        : undefined;
    if (withClassifier) noteSentBuildSpan("safety_context", classifierContext);
    let includeClassifier =
      options.serverClassifier === true &&
      classifierContext_2 !== undefined &&
      serverClassifierEligible &&
      canUseServerClassifier() &&
      !isBetaRejected_2(conversation_2, BETA_DANGEROUS_TOOL_USE) &&
      !isThirdPartyServerClassifierRefused();
    if (includeClassifier) {
      markBetaSent(conversation_2, BETA_DANGEROUS_TOOL_USE);
      checkInsertedTextShed(serverReminders, classifierContext_2?.system_reminders ?? []);
    }
    if (
      serverClassifierEligible &&
      isBetaSent(conversation_2, BETA_DANGEROUS_TOOL_USE) &&
      !betas_2.includes(BETA_DANGEROUS_TOOL_USE)
    )
      betas_2.push(BETA_DANGEROUS_TOOL_USE);
    addBetaToBodyAnthropicBeta(
      extraBodyParams,
      BETA_DANGEROUS_TOOL_USE,
      provider === "bedrock" && betas_2.includes(BETA_DANGEROUS_TOOL_USE),
    );
    let min = Math.min(
      context?.maxTokensOverride || options.maxOutputTokensOverride || modelFacts_2.maxOutputTokens,
      modelFacts_2.maxOutputTokens,
    );
    let CLAUDE_CODE_DISABLE_THINKING = env.CLAUDE_CODE_DISABLE_THINKING;
    let thinkingEnabled = betas.type !== "disabled" && !CLAUDE_CODE_DISABLE_THINKING;
    let rejectsDisabledThinking = () =>
      modelFacts_2.thinking.rejectsDisabled ||
      (creditMintModel !== undefined && modelRejectsDisabledThinking(creditMintModel));
    let sendThinkingDisplay =
      thinkingEnabled &&
      shouldSendInterleavedThinkingBeta(resolvedModel) &&
      !isBetaRejected_2(conversation_2, THINKING_DISPLAY_NAMED_BETA) &&
      (thinkingDisplayProbeState === "idle" || thinkingDisplayProbeState === "withoutUpdates");
    let thinkingDisplay = !sendThinkingDisplay
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
        let budgetTokens = maxOutputTokensMinusOne(resolvedModel);
        if (betas.type === "enabled" && betas.budgetTokens !== undefined) budgetTokens = betas.budgetTokens;
        budgetTokens = Math.max(1024, Math.min(min - 1, budgetTokens));
        thinking = {
          budget_tokens: budgetTokens,
          type: "enabled",
          display: thinkingDisplay,
        };
      }
    } else if (
      betas.type === "disabled" &&
      getAPIProvider() === "firstParty" &&
      !CLAUDE_CODE_DISABLE_THINKING &&
      modelFacts_2.thinking.supported &&
      !rejectsDisabledThinking()
    )
      thinking = {
        type: "disabled",
      };
    let blockBinding;
    if (thinkingBindingOn) {
      if (!betas_2.includes(BETA_THINKING_BINDING_CONTROLS)) betas_2.push(BETA_THINKING_BINDING_CONTROLS);
      addBetaToBodyAnthropicBeta(extraBodyParams, BETA_THINKING_BINDING_CONTROLS, provider === "bedrock");
      if (
        dewdropMode !== undefined &&
        (thinking?.type === "adaptive" || thinking?.type === "enabled") &&
        !("thinking" in extraBodyParams)
      ) {
        thinking = {
          ...thinking,
          block_binding: {
            prefix_mismatch_behavior: dewdropMode,
          },
        };
        blockBinding = dewdropMode;
      }
    }
    let activeThinking = betas.type === "disabled" ? undefined : betas;
    let display = activeThinking?.display;
    let displayMode = "none";
    try {
      displayMode = thinkingDisplayMode(
        display,
        activeThinking?.displayExplicit ?? getThinkingDisplayExplicit(),
      );
    } catch (error) {
      logError(error);
    }
    let dropRedactedBeta = () => {
      let index = betas_2.indexOf(BETA_REDACT_THINKING);
      if (index !== -1) betas_2.splice(index, 1);
    };
    if (thinking && thinkingDisplay) dropRedactedBeta();
    switch (displayMode) {
      case "thinking_and_connector_text":
      case "none":
        break;
      case "connector_text": {
        if (
          (thinking?.type === "adaptive" || thinking?.type === "enabled") &&
          sendThinkingDisplay &&
          !("thinking" in extraBodyParams) &&
          !isBetaRejected_2(conversation_2, BETA_THINKING_DISPLAY_UPDATES) &&
          thinkingDisplayProbeState === "idle" &&
          !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE
        ) {
          thinking = {
            ...thinking,
            display: "updates",
          };
          if (!betas_2.includes(BETA_THINKING_DISPLAY_UPDATES)) betas_2.push(BETA_THINKING_DISPLAY_UPDATES);
          addBetaToBodyAnthropicBeta(extraBodyParams, BETA_THINKING_DISPLAY_UPDATES, provider === "bedrock");
          dropRedactedBeta();
        }
        break;
      }
    }
    if (canResumeThinking(resolvedModel) && !betas_2.includes(BETA_THINKING_RESUMPTION))
      betas_2.push(BETA_THINKING_RESUMPTION);
    let thinkingActive =
      thinking?.type === "enabled" ||
      thinking?.type === "adaptive" ||
      (thinking === undefined && rejectsDisabledThinking());
    let toolChoice = options.toolChoice;
    if (toolChoice?.type === "tool" && thinkingActive) {
      logForDebugging(
        `tool_choice {type:'tool', name:'${toolChoice.name}'} demoted to auto: extended thinking is active`,
      );
      toolChoice = {
        type: "auto",
      };
    }
    let mechanicalDisabled = betas.type === "disabled" && betas.mechanical === true;
    if (
      thinking?.type === "disabled" &&
      (mechanicalDisabled || modelFacts_2.thinking.capsEffortWhenDisabled) &&
      typeof outputConfigSlots.effort === "string" &&
      isAboveHighEffort(outputConfigSlots.effort)
    ) {
      if (!effortClampedLogged) {
        effortClampedLogged = true;
        logForDebugging(
          `output_config.effort '${outputConfigSlots.effort}' clamped to '${THINKING_DISABLED_EFFORT_CAP}': thinking is ${mechanicalDisabled ? "mechanically " : ""}disabled for this request, and this model rejects higher effort when thinking is disabled`,
        );
      }
      if (
        !mechanicalDisabled &&
        classifyQuerySource(options.querySource) === "main" &&
        streamFallbackWarning().once("effort_thinking_disabled_clamp")
      )
        logEvent("tengu_effort_clamped_thinking_disabled", {
          from: fromEnum(outputConfigSlots.effort),
          to: fromEnum(THINKING_DISABLED_EFFORT_CAP),
          query_source: agentTypeForTelemetry(options.querySource),
        });
      outputConfigSlots.effort = THINKING_DISABLED_EFFORT_CAP;
    }
    let apiContextManagement = getAPIContextManagement({
      hasThinking: thinkingEnabled,
      toolClearing: toolResultClearingPlan?.edit,
    });
    let promptCachingEnabled =
      options.enablePromptCaching ?? getPromptCachingEnabled(creditMintModel ?? context.model);
    let speedValue;
    let fastModeEligibleRetry =
      isFastModeEnabled() &&
      runGuarded(() => isFastModeAvailable()) &&
      !isFastModeCooldown() &&
      runGuarded(() => supportsFastMode(effectiveModel)) &&
      !!context.fastMode &&
      !isRejectedBeta(BETA_SPEED) &&
      !isFallbackModelFastRejected(context.model);
    if (fastModeEligibleRetry) speedValue = "fast";
    fastModelUsed = fastModeEligibleRetry ? context.model : undefined;
    if (speedBetaOn && !betas_2.includes(BETA_SPEED)) betas_2.push(BETA_SPEED);
    if (
      BETA_AFK_MODE &&
      afkModeOn &&
      afkBetaAllowed() &&
      isAgenticQuery &&
      !betas_2.includes(BETA_AFK_MODE)
    ) {
      betas_2.push(BETA_AFK_MODE);
      if (isAutoMode3POptIn())
        logForDebugging(
          `auto-mode 3P: sending afk-mode beta '${BETA_AFK_MODE.header}' to ${provider} via betas header`,
        );
    }
    if (ttlChoice === "1h" && canSendFirstPartyBetas() && !betas_2.includes(BETA_EXTENDED_CACHE_TTL))
      betas_2.push(BETA_EXTENDED_CACHE_TTL);
    let contextHintBody = null;
    let contextHintParams = contextHintController?.buildRequestParams(messagesForAPI_2);
    if (contextHintParams) {
      betas_2.push(contextHintParams.beta);
      contextHintBody = contextHintParams.body;
    }
    let evictBody = null;
    if (isBetaSent(conversation_2, BETA_PROMPT_CACHING_EVICT) && promptCachingEnabled) {
      if (!betas_2.includes(BETA_PROMPT_CACHING_EVICT)) betas_2.push(BETA_PROMPT_CACHING_EVICT);
      evictBody = {
        cache_control: {
          type: "ephemeral",
          ...(messagesTtl && {
            ttl: messagesTtl,
          }),
          evict_on_complete: true,
        },
      };
    }
    if (cacheDiagnosisOn() && !betas_2.includes(BETA_CACHE_DIAGNOSIS)) betas_2.push(BETA_CACHE_DIAGNOSIS);
    if (keepaliveHeaderOn && !betas_2.includes(BETA_CACHE_KEEPALIVE)) betas_2.push(BETA_CACHE_KEEPALIVE);
    let CLAUDE_CODE_SIMULATE_PROXY_USAGE = env.CLAUDE_CODE_SIMULATE_PROXY_USAGE;
    let clearAtEligible =
      keptRemindersOn &&
      hasBetas &&
      !CLAUDE_CODE_SIMULATE_PROXY_USAGE &&
      filterBetasForProvider(betas_2).includes(BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
    let threadPlan =
      tetherDelta !== null && !CLAUDE_CODE_SIMULATE_PROXY_USAGE
        ? tetherDelta.plan(messagesForAPI_2, clearAtEligible)
        : null;
    let threadsOff =
      BETA_MESSAGE_THREADS !== null &&
      (isBetaRejected_2(conversation_2, BETA_MESSAGE_THREADS) || threadsProbeState !== "idle");
    let threadPlanActive = threadsOff ? null : threadPlan;
    if (BETA_MESSAGE_THREADS !== null) {
      if (threadPlanActive !== null) markBetaSent(conversation_2, BETA_MESSAGE_THREADS);
      if (threadsOff) {
        for (let idx = betas_2.length - 1; idx >= 0; idx--)
          if (betas_2[idx] === BETA_MESSAGE_THREADS) betas_2.splice(idx, 1);
      } else if (
        (threadPlanActive !== null ||
          isBetaSent(conversation_2, BETA_MESSAGE_THREADS) ||
          (options.querySource === "resume_cache_warm" &&
            canUseNoTransientReminders("sdk", undefined, options.model) &&
            !needsTetherChannel(messagesForAPI_2))) &&
        !betas_2.includes(BETA_MESSAGE_THREADS)
      )
        betas_2.push(BETA_MESSAGE_THREADS);
    }
    if (options.querySource === "resume_cache_warm" && !betas_2.includes(BETA_CLAUDE_CODE_SIDE_QUERY))
      betas_2.push(BETA_CLAUDE_CODE_SIDE_QUERY);
    let betas_3 = betas_2.filter(
      (beta) => !isRejectedBeta(beta) && (!CLAUDE_CODE_SIMULATE_PROXY_USAGE || beta === BETA_OAUTH_AUTH),
    );
    if (CLAUDE_CODE_SIMULATE_PROXY_USAGE)
      logForDebugging(
        `[API:client] SIMULATE_PROXY_USAGE: stripping ${betas_2.length - betas_3.length} beta headers from request (keeping ${betaHeaderValues(betas_3).join(", ") || "none"}): ${betaHeaderValues(betas_2).join(", ")}`,
      );
    let temperature =
      !thinkingEnabled && modelFacts_2.acceptsTemperature ? (options.temperatureOverride ?? 1) : undefined;
    sentBetaHeaders = betaHeaderValues(betas_3);
    serverUrlBetaTried = betaHeaderValues(betaHeaders);
    longContextRequested = betas_3.includes(BETA_LONG_CONTEXT) || betaHeaders.includes(BETA_LONG_CONTEXT);
    sentThinkingDisplay =
      thinking !== undefined && "display" in thinking && !("thinking" in extraBodyParams)
        ? (thinking.display ?? undefined)
        : undefined;
    solicited = thinking !== undefined && "block_binding" in thinking;
    prefixMismatchBehavior = blockBinding;
    let betaHeaderValues_2 = filterBetasForProvider(betas_3);
    let sendBetas =
      hasBetas &&
      (!CLAUDE_CODE_SIMULATE_PROXY_USAGE || betas_3.length > 0) &&
      betaHeaderValues(betaHeaderValues_2).length > 0;
    let programUseCaseId = sendBetas ? programUseCaseBody(betaHeaderValues_2, options.model) : {};
    thinkingTokenCountState = programUseCaseId.program_use_case_id;
    toolRefs = clearAtEligible;
    clearAtOnWire = false;
    let fallbackBetaOnWire =
      sendBetas &&
      (betaHeaderValues_2.includes(BETA_SERVER_SIDE_FALLBACK) ||
        (BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
          betaHeaderValues_2.includes(BETA_SERVER_SIDE_FALLBACK_CATEGORY)));
    serverFallbackWithBlocks = fallbackBetaOnWire && hasFallbackBlocks(messagesForAPI_2);
    let fallbackBody =
      sendBetas &&
      (serverFallbackPlanResult.fallbacks === "default"
        ? BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
          betaHeaderValues_2.includes(BETA_SERVER_SIDE_FALLBACK_CATEGORY)
        : betaHeaderValues_2.includes(BETA_SERVER_SIDE_FALLBACK))
        ? serverFallbackPlanResult
        : {};
    serverFallbackExplicit = fallbackBody.fallbacks !== undefined;
    serverFallbackMode =
      fallbackBody.fallbacks === "default" ? "default" : serverFallbackExplicit ? "explicit" : "none";
    if (!fallbackBetaOnWire && hasFallbackBlocks(messagesForAPI_2)) {
      retryCause = "error_recovery";
      retryKeepsHeal = false;
    }
    let markable = false;
    cacheMarkable = markable;
    let wireIndexOut = [];
    uncoveredTailReport = undefined;
    let messageCachingOn = promptCachingEnabled && !options.skipMessageCacheMarkers;
    let topLevelCacheControl =
      (!CLAUDE_CODE_SIMULATE_PROXY_USAGE && evictBody !== null) || extraBodyParams.cache_control != null;
    let messageMarkersWanted = withClassifier ? performance.now() : 0;
    let effort = withServerUrlHeader(
      conversation_2,
      sendBetas && betaHeaderValues_2.includes(BETA_CCR_TOOL_PROVENANCE),
    );
    betasToDrop = effort.header && effort.serverUrls;
    let cacheMessages = buildEchoedMessages(messagesForAPI_2, fallbackBetaOnWire, markable);
    let parentReplyPlan =
      allowClassifierRetry && promptEndMarkState === "idle"
        ? parentReplyMarkPlan({
            querySource: options.querySource,
            model: creditMintModel ?? context.model,
            isKeepaliveHeaderOnWire: sendBetas && betaHeaderValues_2.includes(BETA_CACHE_KEEPALIVE),
            hasSecondMarkerSlot:
              messageCachingOn && !topLevelCacheControl && options.divergesAtMessageId === undefined,
            messages: cacheMessages,
          })
        : undefined;
    let messagesWithCacheMarks = addCacheBreakpoints(
      cacheMessages,
      messageCachingOn,
      messagesTtl,
      options.skipCacheWrite,
      options.forkPointUuid,
      isBetaRejected_2(conversation_2, BETA_MID_CONV_CACHE_PROMOTION_LATCH) ||
        isMidConvCachePromotionRejected(),
      provider,
      threadPlanActive !== null,
      topLevelCacheControl,
      clearAtEligible,
      wireIndexOut,
      options.divergesAtMessageId,
      {
        skipMessageCacheMarkers: options.skipMessageCacheMarkers === true,
        report: (report) => {
          uncoveredTailReport = report;
        },
      },
      isExtractMemoriesSkipCacheWrite(options.querySource, options.skipCacheWrite === true),
      allowClassifierRetry,
      parentReplyPlan,
    );
    let apiMessages = (sentMessages = annotateMessageContentsWithFallback(
      messagesWithCacheMarks,
      effort,
      toolCoverage,
    ));
    wireIndexMap = wireIndexOut.some((entry, index) => entry !== index) ? wireIndexOut : [];
    if (allowClassifierRetry && options.onWrittenPdfReadSent)
      try {
        options.onWrittenPdfReadSent(findToolResultFirstBlock(apiMessages));
      } catch (error) {
        logError(toError(error));
      }
    let hasCacheControl = (apiMessage) =>
      Array.isArray(apiMessage.content) &&
      apiMessage.content.some(
        (block) =>
          typeof block === "object" &&
          block !== null &&
          "cache_control" in block &&
          block.cache_control != null,
      );
    apiSystemHasCacheControl = apiMessages.some(
      (apiMessage) => apiMessage.role === "system" && hasCacheControl(apiMessage),
    );
    anyCacheControl = apiMessages.some(hasCacheControl);
    let lastMarkedIndex =
      parentReplyPlan?.isMarkWanted === true ? apiMessages.findLastIndex(hasCacheControl) : -1;
    sideRequestMarked =
      lastMarkedIndex > 0 &&
      apiMessages.some((apiMessage, messagePos) => {
        let role = apiMessage.role;
        return messagePos < lastMarkedIndex && role === "system" && hasCacheControl(apiMessage);
      });
    if (withClassifier) noteSentBuildSpan("cache_breakpoints", messageMarkersWanted);
    classifierOnRequest =
      includeClassifier &&
      hasBetas &&
      !CLAUDE_CODE_SIMULATE_PROXY_USAGE &&
      filterBetasForProvider(betas_3).includes(BETA_DANGEROUS_TOOL_USE);
    if (allowClassifierRetry) {
      if (classifierSession !== undefined) settleServerStreamEnded(classifierSession);
      classifierSession = classifierOnRequest
        ? createServerClassifierResult(randomUUID(), {
            artifacts: classifierContext_2?.artifacts,
            thread: threadPlanActive !== null,
            exactMcpAllowRules: classifierContext_2 && getExactMcpAllowRules(classifierContext_2),
            judgeOnlyTools: options.autoModeServerContext?.judgeOnlyTools,
            agentId: options.agentId,
          })
        : undefined;
      if (classifierSession !== undefined && classifierContext_2 !== undefined)
        recordClassifierRequest(classifierSession.key, pickPriorTurnContext(classifierContext_2));
    }
    let toolsForRequest = stripUnsupportedFoundryCapabilities(tools_2, options.model);
    toolsForRequest = annotateToolsWithFallback(
      applyRefusedToolSchemas(toolsForRequest, conversation_2),
      effort,
      toolCoverage,
    );
    let shapedRequest =
      tetherDelta !== null
        ? tetherDelta.shapeInheritedFields(threadPlanActive, {
            system: systemBlocks,
            tools: toolsForRequest,
          })
        : {
            system: systemBlocks,
            tools: toolsForRequest,
          };
    pinnedSystem = systemBlocks;
    pinnedTools = toolsForRequest;
    systemOverridden = shapedRequest.system !== systemBlocks;
    threadSliced = threadPlanActive !== null;
    threadSliceFrom = threadPlanActive?.sliceFrom ?? 0;
    threadType = threadPlanActive?.thread.type ?? "none";
    pinnedSystemValue = threadPlanActive?.reason === "thread_presumed_expired";
    let requestParams = {
      model: toProviderWireModelId(options.model),
      messages:
        threadPlanActive !== null && threadPlanActive.sliceFrom > 0
          ? apiMessages.slice(wireIndexOut[threadPlanActive.sliceFrom])
          : apiMessages,
      system: shapedRequest.system,
      ...(shapedRequest.tools !== undefined && {
        tools: shapedRequest.tools,
      }),
      tool_choice: toolChoice,
      ...(sendBetas && betasRequestParam(betaHeaderValues_2)),
      metadata: getAPIMetadata({
        agentContext: options.agentContext,
      }),
      max_tokens: min,
      thinking,
      ...(temperature !== undefined && {
        temperature,
      }),
      ...(apiContextManagement &&
        hasBetas &&
        betas_2.includes(BETA_CONTEXT_MANAGEMENT) && {
          context_management: apiContextManagement,
        }),
      ...programUseCaseId,
      ...(classifierOnRequest &&
        classifierContext_2 !== undefined && {
          safeguards: [
            {
              type: DANGEROUS_TOOL_USE_2,
              classifier_context: classifierContext_2,
            },
          ],
        }),
      ...(!CLAUDE_CODE_SIMULATE_PROXY_USAGE && contextHintBody ? contextHintBody : {}),
      ...(!CLAUDE_CODE_SIMULATE_PROXY_USAGE && evictBody ? evictBody : {}),
      ...fallbackBody,
      ...extraBodyParams,
      ...{},
      ...(Object.keys(outputConfigSlots).length > 0 && {
        output_config: outputConfigSlots,
      }),
      ...(speedValue !== undefined && {
        speed: speedValue,
      }),
      ...(threadPlanActive !== null && {
        thread: threadPlanActive.thread,
      }),
      ...(cacheDiagnosisOn() &&
        (isAgenticQuery || options.forkPointUuid !== undefined) &&
        hasBetas &&
        !CLAUDE_CODE_SIMULATE_PROXY_USAGE && {
          diagnostics: {
            previous_message_id: lastAssistantId ?? null,
          },
        }),
    };
    if (options.noServerToolCalls !== undefined) {
      let llmSpan = serverToolChoice(
        requestParams.tools ?? toolsForRequest,
        options.advisorActive,
        messages,
        requestParams.mcp_servers !== undefined && requestParams.mcp_servers !== null,
      );
      if (llmSpan !== undefined) {
        requestParams = {
          ...requestParams,
          tool_choice: llmSpan,
        };
        options.noServerToolCalls.onForcedNone();
      }
    }
    contextManagementEligible =
      toolResultClearingPlan !== undefined && requestParams.context_management === apiContextManagement;
    clearAtOnWire =
      clearAtEligible && requestParams.messages.some((message) => message.clear_at !== undefined);
    let sanitizedThinking = sanitizeDisabledThinking(
      requestParams.thinking,
      options.querySource,
      !thinkingSanitized,
    );
    if (sanitizedThinking !== requestParams.thinking) {
      thinkingSanitized = true;
      requestParams.thinking = sanitizedThinking;
    }
    {
      let thinking = requestParams.thinking;
      thinkingType =
        thinking?.type === "adaptive" || thinking?.type === "enabled" ? thinking.type : "disabled";
      requestedDisplayField = readDisplayField(thinking);
    }
    let requestedDisplay = withClassifier ? performance.now() : 0;
    if (allowClassifierRetry && containsMalformedStringDeep(requestParams)) {
      try {
        requestParams = clone(requestParams);
      } catch {}
      repairMalformedStringsDeep(requestParams);
      if (!malformedRepaired) {
        malformedRepaired = true;
        logEvent("tengu_lone_surrogate_sanitized", {
          source: lit_2("queryModel"),
        });
      }
    }
    if (withClassifier) noteSentBuildSpan("surrogate_scan", requestedDisplay);
    let effort_2 = requestParams.output_config?.effort;
    sentEffort = typeof effort_2 === "string" && isEffortLevel(effort_2) ? effort_2 : undefined;
    let lastConfig = lastOutputConfig(messagesForAPI_2);
    perTurnEffortValue = lastConfig.effort ?? null;
    perTurnNowValue = lastConfig.now;
    return requestParams;
  };
  if (isTopLevelMain) markRequestBuildPart("plans");
  let apiQueryLogged = false;
  let logApiQueryOnce = (perTurnStamp) => {
    if (apiQueryLogged) return;
    apiQueryLogged = true;
    let betas = hasBetas ? (perTurnStamp.betas ?? []) : [];
    let thinkingType = perTurnStamp.thinking?.type ?? "disabled";
    let messagesLength = messagesForAPI_2.length;
    let thinkingPrefixMismatchBehavior = prefixMismatchBehavior;
    let effortValue = normalizedEffort;
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
        fastMode: fastModeActive,
        previousRequestId: previousRequestId_2,
      });
    });
  };
  let apiQueryLoggedFallback = false;
  let logApiQueryOnError = () => {
    if (apiQueryLogged || apiQueryLoggedFallback) return;
    apiQueryLoggedFallback = true;
    try {
      logApiQueryOnce(
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
  let yieldedMessages = [];
  let ttftMs = 0;
  let firstContentMs;
  let streamEventCount = 0;
  let sentAtMonotonic = 0;
  let sentAtWall = 0;
  let profileHandle = false;
  let requestedEffort;
  let effortLevel = false;
  let queryOverheadMs;
  let dispatchedAt = 0;
  let partialMessage = undefined;
  let blocks = [];
  let usage = EMPTY_USAGE;
  let creditState = null;
  let creditBytes = null;
  let costUSD = 0;
  let reason = null;
  let complete = false;
  let costState = "none";
  function creditCostOnce() {
    if (costState === "credited") return;
    costState = "credited";
    costUSD += addToTotalSessionCost(
      calculateUSDCost(resolvedModel, usage),
      usage,
      options.model,
      options.querySource,
      effortLevelNormalized,
      options.spawnedBySkill,
      options.activeSkill,
      options.activeMcpServer,
      options.activeMcpTool,
    );
  }
  let fellBackToNonStreaming = false;
  let nonStreamingFallbackSkipped = false;
  let nonStreamingAssistant;
  let fallbackTriggered = false;
  let maxOutputTokens = 0;
  let responseHeaders = undefined;
  let streamStarted = undefined;
  let cacheMissReason;
  let fallbackActive = fastModeActive;
  let advisorToolInFlight = false;
  let isReplMainThread =
    isMainAgent(options.agentContext) && options.querySource.startsWith("repl_main_thread");
  let responseDone = undefined;
  let mediaStripErrors = new Map();
  let lastMediaStripLimit = 3;
  let lastMediaStripCount = {
    value: 0,
  };
  let maxLastMediaStrips = lastMediaStripLimit;
  let mediaStripAttempts = new Map();
  let retryStatusShown = false;
  let watchdogGaveUp = false;
  let idleTimeoutError;
  let attemptOutcome;
  let noResponseRetryLedgerState = {
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
  let dispatchEscalated = false;
  let sentDispatch = null;
  let firstParty = false;
  let stampDispatchHeader = (headers, isRetrying) => {
    sentDispatch = null;
    firstParty = isFirstPartyApiBackend();
    if (dispatchEscalated) {
      if (firstParty) {
        headers[ANTHROPIC_DISPATCH_ID] = V2P;
        sentDispatch = fromEnum(V2P);
        logForDebugging(`[dispatch] sent ${ANTHROPIC_DISPATCH_ID}=${V2P}`);
      }
      return;
    }
    if (!isRetrying && firstParty) {
      let dispatchVersion = getDispatchVersion(classifyQuerySource(options.querySource));
      if (dispatchVersion !== null) {
        headers[ANTHROPIC_DISPATCH_ID] = dispatchVersion;
        sentDispatch = fromEnum(dispatchVersion);
        logForDebugging(`[dispatch] sent ${ANTHROPIC_DISPATCH_ID}=${dispatchVersion}`);
      }
    }
  };
  let handleDispatchError = async (error) => {
    if (dispatchEscalated || findRouteTurnError(error) !== undefined) return;
    let status = error instanceof APIError ? error.status : undefined;
    let is5xx = status !== undefined && status >= 500;
    let isConnErr = error instanceof APIConnectionError;
    if (!(sentDispatch !== null ? is5xx || isConnErr : firstParty && status === 503)) return;
    dispatchEscalated = true;
    logForDebugging(
      `[dispatch] ${is5xx ? `HTTP ${status}` : "connection error"} with ${sentDispatch === null ? `no ${ANTHROPIC_DISPATCH_ID}` : `${ANTHROPIC_DISPATCH_ID}=${sentDispatch}`}; retrying once with ${ANTHROPIC_DISPATCH_ID}=${V2P}`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_dispatch_header_fallback", {
      model: telemetrySafeModelName(options.model),
      dispatch: sentDispatch ?? lit_2("none"),
      resend_dispatch: fromEnum(V2P),
      reason: sentDispatch === null ? headerlessDeclineKind(error) : is5xx ? lit_2("5xx") : lit_2("conn_err"),
      status: status !== undefined ? fromNumber(status) : lit_2("none"),
      query_source: agentTypeForTelemetry(options.querySource),
      request_id: sanitizeMarkName(error instanceof APIError ? error.requestID : undefined),
    });
    if (sentDispatch === null) {
      let delayMs = headerlessDeclineRetryDelay(error);
      if (delayMs > 0)
        await sleep(delayMs, signal, {
          clock,
        });
    }
    return "retry:dispatch-header-strip";
  };
  let fallbackBetaRefused = false;
  let serverFallbackUsed = false;
  let fallbackAnnounced = false;
  let iterations;
  let handleFallbackRejection = (error, transport) => {
    if (!(error instanceof APIError) || error.status !== 400) return;
    let included = error.message.includes("`fallback-credit-");
    let mentionsCategory =
      BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
      error.message.includes(`\`${BETA_SERVER_SIDE_FALLBACK_CATEGORY.header}`);
    let matches = (
      BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null
        ? new RegExp(`\`server-side-fallback-(?!${BETA_SERVER_SIDE_FALLBACK_CATEGORY.header.slice(21)})`)
        : /`server-side-fallback-/
    ).test(error.message);
    let logStripped = (shape) => {
      logForDebugging(`[server-fallback] 400 attributed (${shape}) \u2014 stripping and retrying`, {
        level: "warn",
      });
      let mode = serverFallbackMode;
      logEvent("tengu_rotunda_pennant_strip", {
        shape: fromEnum(shape),
        mode: fromEnum(mode),
        non_streaming: transport === "sync",
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
    let creditClass = classifyFallbackCreditError(error);
    if (creditClass !== undefined && !creditStripped) {
      creditStripped = true;
      fallbackCreditCode = undefined;
      if (creditClass === "credit_beta_header") {
        markBetaRejected(conversation_2, BETA_FALLBACK_CREDIT);
        if (mentionsCategory && BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null) {
          markBetaRejected(conversation_2, BETA_SERVER_SIDE_FALLBACK_CATEGORY);
          categoryBetaRefused = true;
        }
        if (matches) {
          markBetaRejected(conversation_2, BETA_SERVER_SIDE_FALLBACK);
          fallbackBetaRefused = true;
        }
        if (
          mentionsCategory &&
          serverFallbackWithBlocks &&
          !isBetaRejected_2(conversation_2, BETA_SERVER_SIDE_FALLBACK)
        )
          markBetaSent(conversation_2, BETA_SERVER_SIDE_FALLBACK);
      }
      if (transport === "stream") logCreditOutcome(creditClass, error.requestID ?? null, null);
      logStripped(creditClass);
      return "retry:fallback-credit-strip";
    }
    let fallbackClass = classifyServerFallbackError(error);
    if (
      BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
      (fallbackClass === "category_beta_header" ||
        (fallbackClass === "default_unconfigured" && serverFallbackExplicit)) &&
      !categoryBetaRefused
    ) {
      categoryBetaRefused = true;
      markBetaRejected(conversation_2, BETA_SERVER_SIDE_FALLBACK_CATEGORY);
      if (included) {
        markBetaRejected(conversation_2, BETA_FALLBACK_CREDIT);
        creditStripped = true;
        fallbackCreditCode = undefined;
      }
      if (matches) {
        markBetaRejected(conversation_2, BETA_SERVER_SIDE_FALLBACK);
        fallbackBetaRefused = true;
      }
      if (serverFallbackWithBlocks && !isBetaRejected_2(conversation_2, BETA_SERVER_SIDE_FALLBACK))
        markBetaSent(conversation_2, BETA_SERVER_SIDE_FALLBACK);
      logStripped(fallbackClass);
      return "retry:server-fallback-category-strip";
    }
    if (
      fallbackClass !== undefined &&
      (serverFallbackExplicit || fallbackClass === "beta_header") &&
      !fallbackBetaRefused
    ) {
      fallbackBetaRefused = true;
      markBetaRejected(conversation_2, BETA_SERVER_SIDE_FALLBACK);
      if (fallbackClass === "beta_header" && included) {
        markBetaRejected(conversation_2, BETA_FALLBACK_CREDIT);
        creditStripped = true;
        fallbackCreditCode = undefined;
      }
      logStripped(fallbackClass);
      return "retry:server-fallback-strip";
    }
    if (isAdvisorModelMismatchError(error)) return;
    if (isMidConversationSystemRejected(error)) return;
    if (isWebSearchContentRejected(error) || isCodeExecutionOutputRejected(error)) return;
    if (alwaysFalseD(error)) return;
    if (alwaysFalseB(error)) return;
    if (isInvalidEffortError(error) && serverFallbackMode !== "explicit") return;
    if (isBetaRejected(error, BETA_CLAUDE_CODE_SIDE_QUERY)) return;
    if (isFastModeNotEnabledError(error) || parseMaxTokensContextOverflowError(error) !== undefined) return;
    if (isSpeedUnsupported(error)) {
      if (transport === "stream" && creditEchoedStream && !creditStripped)
        fallbackCreditCode = options.fallbackCreditCode;
      return;
    }
    if (options.resumeIncompleteThinking) return;
    if (transport === "sync" && isUnrecoverableError(error)) return;
    if (creditClass === undefined && fallbackClass === undefined) {
      let recovered = probeClearAt(error);
      if (recovered !== undefined) return recovered;
      let threadRecovery = maybeRetryThreads(error);
      if (threadRecovery !== undefined) return threadRecovery;
      let hintRecovery = classifyHintRecovery(error);
      if (hintRecovery !== undefined) return hintRecovery;
    }
    if (transport === "stream" && creditMintedStream && !creditStripped) {
      creditStripped = true;
      logCreditOutcome("unattributed_400_dropped", error.requestID ?? null, null);
      logStripped("unattributed");
      return "retry:fallback-credit-unattributed";
    }
    if ((serverFallbackExplicit || serverFallbackWithBlocks) && !fallbackBetaRefused) {
      fallbackBetaRefused = true;
      markBetaRejected(conversation_2, BETA_SERVER_SIDE_FALLBACK);
      if (BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null)
        markBetaRejected(conversation_2, BETA_SERVER_SIDE_FALLBACK_CATEGORY);
      logStripped("unattributed");
      return "retry:server-fallback-strip";
    }
    if (creditBetaOnWire && !creditHeaderRefused) {
      creditHeaderRefused = true;
      markBetaRejected(conversation_2, BETA_FALLBACK_CREDIT);
      droppedBetas.push(BETA_FALLBACK_CREDIT);
      logStripped("unattributed");
      return "retry:fallback-credit-header-strip";
    }
    return;
  };
  let isUnrecoverableError = (error) =>
    classifyProviderErrorForModel(options.model, error) === "refused" ||
    isAfkModeBetaRejected(error) ||
    isAdvisorResultUnprocessable(error) ||
    isAdvisorUnavailableError(error) ||
    isWebSearchContentRejected(error) ||
    isCodeExecutionOutputRejected(error) ||
    getMediaErrorFromApiError(error) !== undefined ||
    getRejectedBetas(error, betaHeaderValues(BETA_REJECTION_MATCHER_KEYS)).length > 0 ||
    isCacheKeepaliveBetaRejected(error) ||
    isProgramUseCaseBetaRejected(error) ||
    isProgramUseCaseNotHeldError(error) ||
    isThinkingResumptionBetaRejected(error) ||
    isThinkingBindingRejected(error) ||
    getRejectedThinkingType(error) !== null ||
    isInvalidThinkingSignatureError(error) ||
    isMidConversationSystemRejected(error) ||
    isToolChangeRejected(error) ||
    isInlineToolDefinitionRejected(error) ||
    isCacheControlFieldRejected(error) ||
    isOutputConfigRejected(error) ||
    isOutputTimingRejected(error) ||
    isEffortUnsupportedError(error) ||
    isStructuredOutputsUnsupported(error);
  let inlineLateTools = () => {
    if (toolChangeMode === "tool_search") return;
    try {
      let lateCount = 0;
      if (toolChangeMode === undefined) tools_2 = tools_2.slice();
      else
        tools_2 = tools_2.flatMap((lateSchema) => {
          if (!("input_schema" in lateSchema)) return [lateSchema];
          if (!tools.some((poolTool) => matchesToolName(poolTool, lateSchema.name))) return [];
          if (lateSchema.defer_loading !== true) return [lateSchema];
          lateCount++;
          let { defer_loading: deferLoading, ...rest } = lateSchema;
          return [rest];
        });
      let presentNames = new Set(
        tools_2.flatMap((lateSchema) => ("name" in lateSchema ? [lateSchema.name] : [])),
      );
      let indexByName = new Map(tools.map((poolTool, index) => [poolTool.name, index]));
      for (let schema of lateToolSchemas_2) {
        if (!("name" in schema) || presentNames.has(schema.name)) continue;
        let insertBefore = indexByName.get(schema.name) ?? 1 / 0;
        let index = tools_2.findIndex(
          (schema_2) =>
            !("input_schema" in schema_2) || (indexByName.get(schema_2.name) ?? -1) > insertBefore,
        );
        if (index === -1) index = tools_2.length;
        tools_2.splice(index, 0, schema);
        presentNames.add(schema.name);
        lateCount++;
      }
      if (toolChangeMode === "tool_addition") {
        deferredSchemasSent?.splice(0, deferredSchemasSent.length);
        resetDeclaredTools(conversation_2);
        markDeclaredToolsDecided(conversation_2);
      } else if (lateCount === 0) return;
      else {
        let sliced = requestTools.slice();
        for (let poolTool of tools) {
          if (!presentNames.has(poolTool.name) || !byValueNames.has(poolTool.name)) continue;
          let insertBefore = indexByName.get(poolTool.name) ?? 1 / 0;
          let index = sliced.findIndex((entry) => (indexByName.get(entry.name) ?? -1) > insertBefore);
          if (index === -1) index = sliced.length;
          sliced.splice(index, 0, poolTool);
        }
        noChannelTools = cacheNoChannelTools(conversation_2, false, () =>
          buildDeclaredToolSet(
            hideCodeModeOnlyTools(sliced),
            tools,
            pendingMcpResult ?? noChannelTools?.recordedOnly,
          ),
        );
      }
      retryCause = "error_recovery";
      retryKeepsHeal = false;
      logForDebugging(
        `[late-tool-additions] no ToolSearch on this request: ${lateCount} late tool(s) go inline from this request on`,
        {
          level: "warn",
        },
      );
    } catch (error) {
      logError(toError(error));
    }
  };
  let wrapFallbacksAdvisorDrop = () => {
    let fallback = getToolChangeFallback;
    if (fallback) getToolChangeFallback = () => dropAdvisorFromApiSystem(stripAdvisorBlocks(fallback()));
    let midConv = getMidConvFallback;
    if (midConv) getMidConvFallback = () => dropAdvisorFromApiSystem(stripAdvisorBlocks(midConv()));
    let inline = getInlineToolsFallback;
    if (inline) getInlineToolsFallback = () => dropAdvisorFromApiSystem(stripAdvisorBlocks(inline()));
  };
  let wrapFallbacksAdvisorStrip = () => {
    let fallback = getToolChangeFallback;
    if (fallback) getToolChangeFallback = () => stripAdvisorBlocks(fallback());
    let midConv = getMidConvFallback;
    if (midConv) getMidConvFallback = () => stripAdvisorBlocks(midConv());
    let inline = getInlineToolsFallback;
    if (inline) getInlineToolsFallback = () => stripAdvisorBlocks(inline());
  };
  let dropAdvisorBeta = () => {
    if (!isAdvisorToolEnabled()) betaList = betaList.filter((beta) => beta !== BETA_ADVISOR_TOOL);
  };
  let advisorRefused = false;
  let handleAdvisorUnavailable = (error) => {
    if (advisorRefused || !isAdvisorUnavailableError(error)) return;
    let isAdvisorEntry = (schema) =>
      !("input_schema" in schema) && "name" in schema && schema.name === ADVISOR_TOOL_NAME;
    let any = tools_2.some(isAdvisorEntry);
    let betaRefused = sentBetaHeaders.includes(BETA_ADVISOR_TOOL.header) && isAdvisorBetaRejected(error);
    if (!any && !betaRefused) return;
    advisorRefused = true;
    try {
      if (any) {
        tools_2 = tools_2.filter((schema) => !isAdvisorEntry(schema));
        messagesForAPI_2 = recoverMessages(
          dropAdvisorFromApiSystem(stripAdvisorBlocks(messagesForAPI_2)),
          "error_recovery",
        );
        wrapFallbacksAdvisorDrop();
        retryCause = "error_recovery";
        retryKeepsHeal = false;
      }
      conversation_2.advisorHeld = {
        model: undefined,
        viaToolChange: conversation_2.advisorHeld?.viaToolChange ?? false,
        refused: true,
      };
      let thinkingBudget = getAdvisorRefusalScope(error);
      if (thinkingBudget === "process") markAdvisorRefusedForProcess();
      else if (thinkingBudget === "host") markAdvisorRefusedForHost();
      dropAdvisorBeta();
      logForDebugging(
        `[advisor] the server refused the advisor ${betaRefused ? "beta header" : "entry"} (scope: ${thinkingBudget}); retrying once without the advisor`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_advisor_entry_refused_retry", {
        query_source: agentTypeForTelemetry(options.querySource),
        organization_wide: thinkingBudget === "process",
        host_wide: thinkingBudget === "host",
        beta_header_refused: betaRefused,
      });
    } catch (error) {
      logError(toError(error));
    }
    return "retry:advisor-entry-refused";
  };
  let wireCache = new ToolSchemaWireCache(conversation_2);
  let recoverViaWireCache = (error) => {
    try {
      let resolved = wireCache.resolve(error, pinnedTools, tools, options.querySource);
      if (resolved !== undefined) {
        retryCause = "error_recovery";
        retryKeepsHeal = false;
      }
      return resolved;
    } catch (error) {
      logError(toError(error));
      return;
    }
  };
  let recoverFromHintError = (error) => {
    return;
  };
  let advisorState = "idle";
  let classifyHintRecovery = (error) => {
    return;
  };
  let inlineAdvisorEntry = () => {
    try {
      let foundDeferred = false;
      let advisorActive = options.advisorActive !== false;
      tools_2 = tools_2.flatMap((schema) => {
        if (
          "input_schema" in schema ||
          !("defer_loading" in schema) ||
          schema.defer_loading !== true ||
          schema.name !== ADVISOR_TOOL_NAME
        )
          return [schema];
        foundDeferred = true;
        if (!advisorActive) return [];
        let { defer_loading: deferLoading, ...rest } = schema;
        return [rest];
      });
      if (foundDeferred) {
        if (!advisorActive) {
          messagesForAPI_2 = recoverMessages(
            dropAdvisorFromApiSystem(stripAdvisorBlocks(messagesForAPI_2)),
            "error_recovery",
          );
          wrapFallbacksAdvisorDrop();
          dropAdvisorBeta();
        }
        if (advisorActive && conversation_2.advisorHeld?.viaToolChange === true)
          conversation_2.advisorHeld = {
            ...conversation_2.advisorHeld,
            inFallback: true,
          };
        retryCause = "error_recovery";
        retryKeepsHeal = false;
      }
    } catch (error) {
      logError(toError(error));
    }
  };
  let wrapFallbacksWebSearchStrip = () => {
    let fallback = getToolChangeFallback;
    if (fallback) getToolChangeFallback = () => stripWebSearchBlocks(fallback()).messages;
    let midConv = getMidConvFallback;
    if (midConv) getMidConvFallback = () => stripWebSearchBlocks(midConv()).messages;
    let inline = getInlineToolsFallback;
    if (inline) getInlineToolsFallback = () => stripWebSearchBlocks(inline()).messages;
  };
  let handleWebSearchRejected = (error, transport) => {
    if (!isWebSearchContentRejected(error)) return;
    let { messages, removed } = stripWebSearchBlocks(messagesForAPI_2);
    if (messages === messagesForAPI_2) return;
    messagesForAPI_2 = recoverMessages(messages, "error_recovery");
    markWebSearchHistoryRejected(conversation_2);
    wrapFallbacksWebSearchStrip();
    logForDebugging(
      `[web-search-strip] The API could not decrypt web search content in this conversation's history: removed ${removed.toolUses} ${plural(removed.toolUses, "search call")}, ${removed.results} ${plural(removed.results, "result block")} and ${removed.citations} ${plural(removed.citations, "citation")} from the request; retrying once. Later requests in this conversation leave them out too.`,
      {
        level: "warn",
      },
    );
    logFeatureSad("api_request", "api_request_web_search_stripped", {
      query_source: agentTypeForTelemetry(options.querySource),
      transport: fromEnum(transport),
      tool_uses: removed.toolUses,
      results: removed.results,
      citations: removed.citations,
      placeholders: removed.placeholders,
    });
    return "retry:web-search-strip";
  };
  let mediaLimitStep;
  let handleUnprocessableMedia = (error) => {
    let mediaCap = mediaItemCapForModel(conversation_2, effectiveModel);
    if (!isUnprocessableRequest(error) || mediaCap?.gaveUp) return;
    try {
      let mediaCount = countMediaItems(messagesForAPI_2);
      let min = Math.min(mediaCount, mediaLimitStep?.limit ?? 1 / 0);
      let maxMediaItems = MEDIA_ITEM_COUNT_FALLBACKS.find((candidateLimit) => candidateLimit < min);
      if (maxMediaItems === undefined) {
        if (mediaLimitStep !== undefined) {
          let { steps, refusedAt } = mediaLimitStep;
          mediaLimitStep = undefined;
          setMediaItemCap(conversation_2, {
            model: effectiveModel,
            limit: mediaCap?.limit,
            gaveUp: true,
          });
          logForDebugging(
            `[media-item-limit] The model still refuses this request as unprocessable with ${mediaCount} images and documents left. Not removing any more.`,
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
      let stripToLimit = (messagesToStrip) =>
        stripExcessMediaItems(messagesToStrip, maxMediaItems, MEDIA_BYTES_PER_ITEM_SLACK);
      messagesForAPI_2 = recoverMessages(stripToLimit(messagesForAPI_2), "error_recovery");
      let toolChangeFallback = getToolChangeFallback;
      if (toolChangeFallback) getToolChangeFallback = () => stripToLimit(toolChangeFallback());
      let midConvFallback = getMidConvFallback;
      if (midConvFallback) getMidConvFallback = () => stripToLimit(midConvFallback());
      let inlineFallback = getInlineToolsFallback;
      if (inlineFallback) getInlineToolsFallback = () => stripToLimit(inlineFallback());
      mediaLimitStep = {
        limit: maxMediaItems,
        steps: (mediaLimitStep?.steps ?? 0) + 1,
        refusedAt: mediaLimitStep?.refusedAt ?? mediaCount,
      };
      logForDebugging(
        `[media-item-limit] The model refused this request as unprocessable. It held ${mediaCount} images and documents; the oldest were removed to fit a limit of ${maxMediaItems}, and it is being sent again. If it is answered, this conversation keeps that limit.`,
        {
          level: "warn",
        },
      );
      return `retry:media-item-limit:${maxMediaItems}`;
    } catch (error) {
      logError(toError(error));
      return;
    }
  };
  let recordMediaLimitSuccess = () => {
    try {
      let mediaCap = mediaItemCapForModel(conversation_2, effectiveModel);
      if (mediaLimitStep === undefined) {
        if (mediaCap?.gaveUp && mediaCap.limit === undefined) clearMediaItemCap(conversation_2);
        else if (mediaCap?.gaveUp)
          setMediaItemCap(conversation_2, {
            ...mediaCap,
            gaveUp: false,
          });
        return;
      }
      let { limit, steps, refusedAt } = mediaLimitStep;
      mediaLimitStep = undefined;
      setMediaItemCap(conversation_2, {
        model: effectiveModel,
        limit: Math.min(limit, mediaCap?.limit ?? 1 / 0),
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
  let probePromptEndMark = (error) => {
    {
      let is400 = error instanceof APIError && error.status === 400;
      if (promptEndMarkState === "retrying") {
        if (is400) promptEndMarkState = "spent";
        return;
      }
      if (
        promptEndMarkState === "idle" &&
        sideRequestMarked &&
        is400 &&
        error.message.includes("cache_control")
      ) {
        promptEndMarkState = "retrying";
        return "retry:prompt-end-mark";
      }
    }
    return;
  };
  let settlePromptEndMark = () => {
    if (promptEndMarkState !== "retrying") return;
    promptEndMarkState = "spent";
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
  let recoverToolChange = (error, unclaimed = false) => {
    let inlineClass =
      betaList.includes(BETA_INLINE_TOOLS) &&
      !isMidConversationSystemRejected(error) &&
      classifyToolChangeError(error) !== "header_rejected"
        ? classifyInlineToolDefinitionError(error)
        : undefined;
    if (inlineClass !== undefined) {
      if (getInlineToolsFallback) {
        let inlineFallbackMessages = getInlineToolsFallback();
        messagesForAPI_2 = recoverMessages(
          !betaList.includes(BETA_PER_MESSAGE_EFFORT)
            ? stripOutputConfigs(inlineFallbackMessages)
            : !betaList.includes(BETA_PER_TURN_TIMING)
              ? dropTimingFromOutputConfigs(inlineFallbackMessages)
              : inlineFallbackMessages,
          "error_recovery",
        );
        thinkingWasStripped = thinkingStripMarked;
        addNameOnlyAnnouncements(conversation_2, byValueAnnouncements);
        if (toolChangeMode === undefined) inlineLateTools();
      }
      getInlineToolsFallback = null;
      betaList = betaList.filter((beta) => beta !== BETA_INLINE_TOOLS);
      handleInlineToolsRejection(conversation_2, inlineClass);
      emitPromptHead();
      logEvent("tengu_inline_tools_refused_retry", {
        cause: fromEnum(inlineClass),
      });
      return "retry:inline-tools-strip";
    }
    let toolChangeClass =
      betaList.includes(BETA_MID_CONV_TOOL_CHANGE) && !isMidConversationSystemRejected(error)
        ? classifyToolChangeError(error)
        : undefined;
    if (toolChangeClass !== undefined) {
      if (getToolChangeFallback) {
        let toolChangeFallbackMessages = getToolChangeFallback();
        messagesForAPI_2 = recoverMessages(
          !betaList.includes(BETA_PER_MESSAGE_EFFORT)
            ? stripOutputConfigs(toolChangeFallbackMessages)
            : !betaList.includes(BETA_PER_TURN_TIMING)
              ? dropTimingFromOutputConfigs(toolChangeFallbackMessages)
              : toolChangeFallbackMessages,
          "error_recovery",
        );
        thinkingWasStripped = thinkingStripMarked;
      }
      getToolChangeFallback = null;
      let inlineHeaderRejected =
        betaList.includes(BETA_INLINE_TOOLS) &&
        classifyInlineToolDefinitionError(error) === "header_rejected";
      betaList = betaList.filter((beta) => beta !== BETA_MID_CONV_TOOL_CHANGE && beta !== BETA_INLINE_TOOLS);
      classifyToolAdditionRejection(conversation_2, toolChangeClass, options.model, inlineHeaderRejected);
      emitPromptHead();
      inlineLateTools();
      inlineAdvisorEntry();
      return "retry:tool-change-strip";
    }
    let midConvCandidate = unclaimed || isMidConversationSystemRejected(error);
    let midConvSystemRejection = getMidConvSystemRejection(error);
    let effortRejected =
      betaList.includes(BETA_PER_MESSAGE_EFFORT) &&
      isOutputConfigRejected(error) &&
      !isEffortUnsupportedError(error);
    let included = betaList.includes(BETA_PER_TURN_TIMING);
    if (included && isOutputTimingRejected(error) && !midConvCandidate && !effortRejected) {
      messagesForAPI_2 = recoverMessages(dropTimingFromOutputConfigs(messagesForAPI_2), "error_recovery");
      betaList = betaList.filter((beta) => beta !== BETA_PER_TURN_TIMING);
      markBetaRejected(conversation_2, BETA_PER_TURN_TIMING);
      logForDebugging(
        `[per-turn-timing] the server refused the current-time statement (${errorMessage(error)}); leaving it out for the rest of this conversation (until /clear or /compact)`,
        {
          level: "warn",
        },
      );
      return "retry:per-turn-timing-strip";
    }
    if (getMidConvFallback && (midConvCandidate || effortRejected)) {
      if (
        midConvSystemRejection !== null &&
        !sentMessages.some((message) => message.role === "system" && message.content.length > 0)
      )
        return;
      let contextBetaWasActive = hasContextBeta(conversation_2);
      let wireCount = sentMessages.length;
      let messageCount = messagesForAPI_2.length;
      let mismatchDetail =
        midConvSystemRejection === null
          ? undefined
          : midConvSystemRejection.messageIndex === undefined
            ? `${wireCount} messages on the wire`
            : midConvSystemRejection.messageIndex >= wireCount
              ? `messages[${midConvSystemRejection.messageIndex}], beyond the ${wireCount} this request sent`
              : `messages[${midConvSystemRejection.messageIndex}] of ${wireCount} on the wire; conversation entry ${sourceIndexOf(midConvSystemRejection.messageIndex) ?? "none of ours (a clear_at reminder slot)"} of ${messageCount}`;
      messagesForAPI_2 = recoverMessages(
        midConvCandidate ? getMidConvFallback() : stripOutputConfigs(messagesForAPI_2),
        "error_recovery",
      );
      getMidConvFallback = null;
      if (included) betaList = betaList.filter((beta) => beta !== BETA_PER_TURN_TIMING);
      if (midConvCandidate) {
        thinkingWasStripped = thinkingStripMarked;
        betaList = betaList.filter(
          (beta) =>
            beta !== BETA_MID_CONVERSATION_SYSTEM &&
            beta !== BETA_PER_MESSAGE_EFFORT &&
            beta !== BETA_MID_CONV_TOOL_CHANGE &&
            beta !== BETA_INLINE_TOOLS &&
            beta !== BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT,
        );
        markBetaRejected(conversation_2, BETA_MID_CONVERSATION_SYSTEM);
        dropToolChangeState(conversation_2);
        emitPromptHead();
        inlineLateTools();
        inlineAdvisorEntry();
        if (getToolChangeFallback !== null) {
          logFeatureSad("mcp_late_tool_additions", "rejected_with_mid_conv_system");
          getToolChangeFallback = null;
        }
      }
      if (effortRejected) {
        betaList = betaList.filter((beta) => beta !== BETA_PER_MESSAGE_EFFORT);
        latchBetaRefused(BETA_PER_MESSAGE_EFFORT, isPerTurnEffortRejected(error));
        if (perTurnEffortValue !== null) logFeatureSad("api_per_turn_effort", "server_rejected");
      }
      if (options.stickyBetas === undefined)
        notifyPerTurnEffortInactive(conversation_2, contextBetaWasActive);
      logForDebugging(
        mismatchDetail !== undefined
          ? `[mid-conv-system] API refused where a system message sits (${mismatchDetail}) \u2014 retrying once without system messages; off for this conversation until /clear or /compact`
          : effortRejected
            ? "[per-turn-control] server rejected the per-turn statements \u2014 resending without them"
            : unclaimed
              ? "[mid-conv-system] an HTTP 400 or 422 that nothing else recognises answered a request on which system turns were enabled; guessing the platform refuses them and resending without system messages; if that goes through they stay off until /clear or /compact"
              : '[mid-conv-system] server rejected role:"system" \u2014 falling back to a body with no {role:"system"} turn, sticky-rejecting the beta until /clear or /compact',
        {
          level: "warn",
        },
      );
      logEvent("tengu_mid_conv_system_fallback_retry", {
        per_turn_effort: effortRejected,
        ...(unclaimed && {
          unclaimed,
        }),
        misplaced: midConvSystemRejection !== null,
        ...(midConvSystemRejection !== null && {
          misplaced_index: midConvSystemRejection.messageIndex ?? -1,
          wire_message_count: wireCount,
          message_count: messageCount,
        }),
      });
      return "retry:mid-conv-system";
    }
    if (
      apiSystemHasCacheControl &&
      !isBetaRejected_2(conversation_2, BETA_MID_CONV_CACHE_PROMOTION_LATCH) &&
      isCacheControlFieldRejected(error)
    ) {
      markBetaRejected(conversation_2, BETA_MID_CONV_CACHE_PROMOTION_LATCH);
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
  let noteCacheCoverageUsage = (usage) => {
    if (
      apiSystemHasCacheControl &&
      !sideRequestMarked &&
      !isBetaRejected_2(conversation_2, BETA_MID_CONV_CACHE_PROMOTION_LATCH) &&
      !isBetaRejected_2(conversation_2, BETA_MID_CONV_CACHE_PROMOTION_OK_LATCH)
    ) {
      let inputTokens = usage?.input_tokens ?? 0;
      let cacheReadInputTokens = usage?.cache_read_input_tokens ?? 0;
      let creationTokens =
        (usage?.cache_creation_input_tokens ?? 0) +
        (usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
        (usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0);
      let hasAnyTokens = inputTokens + cacheReadInputTokens + creationTokens > 0;
      let proxyStripped = creationTokens > 0 && inputTokens < PROXY_STRIPPED_INPUT_TOKEN_THRESHOLD;
      if (hasAnyTokens && !proxyStripped) return;
      markBetaRejected(conversation_2, BETA_MID_CONV_CACHE_PROMOTION_OK_LATCH);
      logFeatureOk("api_midconv_cache_proxy");
    }
  };
  let noteCacheCoverageSustained = (usage) => {
    if (!anyCacheControl || options.skipCacheWrite || !isCustomEndpoint(getProviderForModel(options.model)))
      return;
    let coverageDecision = decideStreamFallbackWarning(
      streamFallbackWarning().cacheCoverage,
      conversation_2,
      usage,
    );
    if (coverageDecision.kind === "confirm") {
      logFeatureOk("api_prompt_cache_coverage", {
        provider: fromEnum(getProviderForModel(options.model)),
      });
      return;
    }
    if (coverageDecision.kind !== "fire") return;
    logForDebugging(
      "[cache-coverage] sustained uncovered input with a cache breakpoint on the wire through a custom endpoint \u2014 no cache-billing evidence visible at the client (the endpoint may be silently stripping cache_control)",
      {
        level: "warn",
      },
    );
    logFeatureSad("api_prompt_cache_coverage", "cache_coverage_loss", {
      api_system_marker: apiSystemHasCacheControl,
      consecutive_turns: coverageDecision.consecutive,
      input_tokens: coverageDecision.inputTokens,
      cache_read_input_tokens: coverageDecision.cacheReadTokens,
      cache_creation_input_tokens: coverageDecision.cacheCreationTokens,
      provider: fromEnum(getProviderForModel(options.model)),
    });
  };
  let notePerTurnEffortOk = () => {
    if (!isPerTurnEffortOkEmitted() && perTurnEffortValue !== null) {
      markPerTurnEffortOkEmitted();
      logFeatureOk("api_per_turn_effort");
    }
  };
  let noteLateToolsOk = () => {
    if (!isLateToolAdditionsOkEmitted() && getToolChangeFallback !== null) {
      markLateToolAdditionsOkEmitted();
      logFeatureOk("mcp_late_tool_additions");
    }
    if (
      !isInlineToolsOkEmitted() &&
      getToolChangeFallback !== null &&
      betaList.includes(BETA_INLINE_TOOLS) &&
      messagesForAPI_2.some(
        (message) => message.type === "api_system" && message.toolDefinitions !== undefined,
      )
    ) {
      markInlineToolsOkEmitted();
      logFeatureOk("mcp_inline_tools");
    }
  };
  let noopAfterSend = () => {};
  let noopAfterSuccess = () => {};
  let settleHealsAtSuccess = () => {
    if (threadsProbeState === "retrying") {
      threadsProbeState = "spent";
      try {
        if (BETA_MESSAGE_THREADS !== null) markBetaRejected(conversation_2, BETA_MESSAGE_THREADS);
        if (threadsProbePlannerBacked) disableTetherLiveGate();
        logEvent("tengu_tether_unrecognised_400", {
          phase: lit_2("healed"),
          planner_backed: threadsProbePlannerBacked,
          query_source: agentTypeForTelemetry(options.querySource),
        });
        logForDebugging(
          `[tether] a request carrying the message-threads header got an HTTP 400 that Claude Code does not recognise (request id ${threadsProbeRequestId ?? "unknown"}), and a later attempt without the header succeeded. ${threadsProbePlannerBacked ? "Message Threads stays off for the rest of this session." : "The header stays off for this conversation."}`,
          {
            level: "warn",
          },
        );
      } catch (error) {
        logError(error);
      }
    }
    if (toolRefs) logKeptReminderOk();
    if (clearAtProbeState === "retrying") {
      clearAtProbeState = "spent";
      markBetaRejected(conversation_2, BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT);
      retireKeptReminder();
      emitPromptHead();
      logFeatureSad("api_kept_reminder_clear_at", "unrecognised_400");
      logForDebugging(
        `[reminders] a request carrying a clear_at message got an HTTP 400 that Claude Code does not recognise (request id ${clearAtProbeRequestId ?? "unknown"}), and the same request without clear_at succeeded. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.`,
        {
          level: "warn",
        },
      );
    }
  };
  let recoverOrgEffortCap = (error) => {
    if (
      !isInvalidEffortError(error) ||
      serverFallbackMode === "explicit" ||
      isAutoModeQuerySource(options.querySource)
    )
      return null;
    try {
      let attemptedEffort = effortInPlay(sentEffort, messagesForAPI_2);
      let lowerLevel =
        attemptedEffort === undefined ? undefined : lowerLearnedEffortCap(resolvedModel, attemptedEffort);
      if (lowerLevel === undefined) {
        logFeatureBad("api_org_effort_cap_retry", "no_lower_level");
        return null;
      }
      effortValue = lowerEffort(effortFromConfig, learnedEffortCapFn());
      if (perTurnEffortValue !== null)
        messagesForAPI_2 = recoverMessages(
          attachPerTurnOutputConfig(stripOutputConfigs(messagesForAPI_2), {
            effort: explicitEffortFields,
            parent: tool,
            effortCap: learnedEffortCapFn(),
            now: perTurnNowValue,
          }),
          "error_recovery",
        );
      logForDebugging(
        `[effort] the API refused effort '${attemptedEffort}' as above the organization's cap for model ${options.model}. Sending the request again at no more than '${lowerLevel}', as later requests to this model will be.`,
        {
          level: "warn",
        },
      );
      return `retry:org-effort-cap:${lowerLevel}`;
    } catch (error) {
      logError(toError(error));
      return null;
    }
  };
  function* orgEffortNotice() {
    if (!isMainThread) return;
    let notice;
    try {
      let cappedLevel = lowerEffort(resolvedEffort, learnedEffortCapFn());
      if (cappedLevel !== resolvedEffort && takeEffortCapNotice(resolvedModel)) {
        logFeatureOk("api_org_effort_cap_retry");
        notice = createInformationalSystemMessage(
          `Your organization limits effort for ${renderModelName(resolvedModel)}, so Claude Code is using '${cappedLevel}' instead of '${resolvedEffort}'. Your effort setting is unchanged.`,
          "warning",
        );
      }
    } catch (error) {
      logError(toError(error));
    }
    if (notice) yield notice;
  }
  let handleEffortUnsupported = (error) => {
    if (!isEffortUnsupportedError(error)) return recoverOrgEffortCap(error);
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
  let handleStructuredOutputs = (error) => {
    if (!hasOutputFormat || !isStructuredOutputsUnsupported(error)) return null;
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
  let noRecovery = (error) => null;
  let handleThinkingHighlights = (error) => {
    if (sentThinkingDisplay === "highlights" && isThinkingDisplayRejected(error)) {
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
  let recoverThinkingBinding = (error, unclaimed = false) => {
    if (!thinkingBindingOn || !sentBetaHeaders.includes(BETA_THINKING_BINDING_CONTROLS.header)) return null;
    let betaRejected =
      isThinkingBindingRejected(error) ||
      (!shouldIncludeFirstPartyOnlyBetas() && mentionsThinkingBindingBeta(error));
    let unclaimed400 =
      !shouldIncludeFirstPartyOnlyBetas() &&
      (isInvalidBetaFlagError(error) ||
        (unclaimed &&
          error instanceof APIError &&
          error.status === 400 &&
          !isUnrecoverable(error) &&
          !isUnrecoverableError(error)));
    if (!betaRejected && !unclaimed400) return null;
    thinkingBindingOn = false;
    dewdropMode = undefined;
    betaList = betaList.filter((beta) => beta !== BETA_THINKING_BINDING_CONTROLS);
    markBetaRejected(conversation_2, BETA_THINKING_BINDING_CONTROLS);
    logForDebugging(
      betaRejected
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
  let recoverThinkingTokenCountBeta = (error) => {
    if (!sentBetaHeaders.includes(BETA_THINKING_TOKEN_COUNT.header)) return null;
    if (tokenCountBetaBlocked() || !isInvalidBetaFlagError(error)) return null;
    betaList = betaList.filter((beta) => beta !== BETA_THINKING_TOKEN_COUNT);
    markBetaRejected(conversation_2, BETA_THINKING_TOKEN_COUNT);
    droppedBetas.push(BETA_THINKING_TOKEN_COUNT);
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
  let recoverMentionedBetas = (error) => {
    if (!handleServerUrlRefused(conversation_2, betasToDrop, isToolProvenanceServerUrlError(error))) return;
    return "retry:tool-provenance-server-url";
  };
  let recoverRejectedBetas = (error) => {
    try {
      let rejectedBetas = getRejectedBetas(error, [...sentBetaHeaders, ...serverUrlBetaTried]);
      if (rejectedBetas.length === 0) return;
      let refusedSet = new Set(rejectedBetas);
      betaList = betaList.filter((beta) => !refusedSet.has(beta));
      if (refusedSet.has(BETA_CCR_TOOL_PROVENANCE)) logFeatureBad("api_tool_provenance", "refused");
      for (let beta of rejectedBetas) {
        let onlyMentioned = isBetaHeaderRejected(error, beta);
        latchBetaRefused(beta, onlyMentioned);
        logEvent("tengu_beta_400_healed", {
          beta: hashToolNames([beta.header]),
          model: telemetrySafeModelName(options.model),
          provider: getAPIProviderForAnalytics(),
          status: error instanceof APIError ? error.status : undefined,
          only_mentioned: !onlyMentioned && !isBetaListedAsUnexpected(error, beta),
        });
      }
      if (refusedSet.has(BETA_PROMPT_CACHING_SCOPE)) systemBlocks = buildSystemBlocks();
      if (refusedSet.has(BETA_SPEED) && fastModelUsed !== undefined)
        markFallbackModelFastRejected(fastModelUsed);
      return `retry:beta-rejected:${rejectedBetas.map((beta) => beta.name).join(",")}`;
    } catch (error) {
      logError(error);
      return;
    }
  };
  let probeContext1mBeta = (error) => {
    if (!(error instanceof APIError) || error.status !== 400) return null;
    try {
      let readsAsBetaReject = isContext1mBetaRejected(error);
      let invalidFlag = !readsAsBetaReject && isInvalidBetaFlagError(error);
      if (contextBetaState === "spent") return null;
      if (contextBetaState !== "idle") {
        contextBetaState = contextBetaState === "guessing" && invalidFlag ? "spent" : "unproven";
        logForDebugging(
          `[betas] the resend without ${BETA_LONG_CONTEXT.header} also got an HTTP 400, so the backend is not recorded as rejecting it; ${contextBetaState === "spent" ? 'both said "invalid beta flag", so it is sent again from the next attempt' : "it stays off for the remaining attempts of this request and is sent again on the next request"}`,
          {
            level: "warn",
          },
        );
        return null;
      }
      if (
        !longContextRequested ||
        hitsAnthropicBackend(getProviderForModel(options.model)) ||
        !(readsAsBetaReject || (invalidFlag && !tokenCountBetaBlocked()))
      )
        return null;
      contextBetaState = readsAsBetaReject ? "retrying" : "guessing";
      logForDebugging(
        `[betas] an HTTP 400 ${readsAsBetaReject ? "reads as the backend rejecting" : 'says "invalid beta flag", which may be about'} ${BETA_LONG_CONTEXT.header}; resending once without it`,
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
  let settleContext1mProbe = () => {
    if (contextBetaState !== "retrying" && contextBetaState !== "guessing") return;
    let unnamed = contextBetaState === "guessing";
    contextBetaState = "spent";
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
  let recoverProgramUseCaseBeta = (error) => {
    if (!sentBetaHeaders.includes(BETA_PROGRAM_USE_CASE_IDS.header) || !isProgramUseCaseBetaRejected(error))
      return null;
    markBetaHeaderRefused(BETA_PROGRAM_USE_CASE_IDS);
    betaList = betaList.filter((beta) => beta !== BETA_PROGRAM_USE_CASE_IDS);
    logForDebugging(
      "[program-use-case] server rejected the program-use-case-ids beta header; the use case is not named again in this process",
      {
        level: "warn",
      },
    );
    logFeatureSad("api_program_use_case", "header_rejected");
    return "retry:program-use-case-beta";
  };
  let recoverProgramUseCaseNotHeld = (error) => {
    let turnUseCaseNotFound =
      thinkingTokenCountState !== undefined && isProgramUseCaseTurnScoped() && isNotFoundApiError(error);
    if (
      !sentBetaHeaders.includes(BETA_PROGRAM_USE_CASE_IDS.header) ||
      !(isProgramUseCaseNotHeldError(error) || turnUseCaseNotFound)
    )
      return null;
    betaList = betaList.filter((beta) => beta !== BETA_PROGRAM_USE_CASE_IDS);
    if (turnUseCaseNotFound) {
      dropProgramUseCaseId(options.model);
      logForDebugging(
        "[program-use-case] a request naming the turn's use case got a 404; this turn names nothing on that model",
        {
          level: "warn",
        },
      );
      logFeatureSad("api_program_use_case", "not_found");
      return "retry:program-use-case-not-held";
    }
    forgetRefusedProgramUseCase(options, thinkingTokenCountState);
    logForDebugging("[program-use-case] server refused the use case this process holds; dropped it", {
      level: "warn",
    });
    logFeatureSad("api_program_use_case", "not_held");
    return "retry:program-use-case-not-held";
  };
  let recoverThinkingResumptionBeta = (error) => {
    if (
      !sentBetaHeaders.includes(BETA_THINKING_RESUMPTION.header) ||
      !isThinkingResumptionBetaRejected(error)
    )
      return null;
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
    return resumeIncompleteThinking ? "surface:resume-prefill" : "retry:thinking-resumption-beta";
  };
  let pendingNotice;
  let isPrefixLockError = (error) => error instanceof APIError && isConversationBindingError(error);
  let prefixLockAttempts = 0;
  let stopReason = null;
  let stripScope = "all";
  let recordStripScope = (from) => {
    if (!thinkingWasStripped) stripScope = from;
    else if (
      stripScope !== "all" &&
      (from === "all" ||
        from.messageIndex < stripScope.messageIndex ||
        (from.messageIndex === stripScope.messageIndex && from.thinkingIndex < stripScope.thinkingIndex))
    )
      stripScope = from;
    thinkingWasStripped = true;
  };
  let locateThinkingBlock = (block) => {
    if (thinkingAlreadyStripped) return;
    let blockRef = sentMessages[block.messageIndex];
    if (blockRef?.role !== "assistant" || !Array.isArray(blockRef.content)) return;
    let thinkingBlockKey = getThinkingBlockKey(blockRef.content[block.blockIndex]);
    if (thinkingBlockKey === undefined) return;
    let foundBlock;
    let thinkingCounts = new Map();
    for (let idx = 0; idx < messagesForAPI_2.length; idx++) {
      let message = messagesForAPI_2[idx];
      if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
      let id = message.message.id;
      let thinkingIndex = thinkingCounts.get(id) ?? 0;
      for (let block of message.message.content) {
        if (block.type !== "thinking" && block.type !== "redacted_thinking") continue;
        if (getThinkingBlockKey(block) === thinkingBlockKey) {
          if (foundBlock !== undefined) return;
          foundBlock = {
            messageIndex: idx,
            indexInMessage: thinkingIndex - (thinkingCounts.get(id) ?? 0),
            thinkingIndex,
            messageId: id,
          };
        }
        thinkingIndex++;
      }
      thinkingCounts.set(id, thinkingIndex);
    }
    return typeof foundBlock?.messageId === "string" ? foundBlock : undefined;
  };
  let recoverPrefixLock = (error) => {
    try {
      if (!isPrefixLockError(error)) return;
      prefixLockAttempts++;
      let chainRequestId = error.requestID || error.error?.request_id || null;
      if (prefixLockAttempts === 1) stopReason = chainRequestId;
      let thinkingPrefixMismatchHeader = parseThinkingPrefixMismatchHeader(error);
      let currentMessages = messagesForAPI_2;
      let stripResult = (() => {
        if (options.resumeIncompleteThinking) return;
        let located =
          thinkingPrefixMismatchHeader?.block !== undefined &&
          prefixLockAttempts <= MAX_SIGNATURE_STRIP_ATTEMPTS
            ? locateThinkingBlock(thinkingPrefixMismatchHeader.block)
            : undefined;
        if (located !== undefined) {
          let strippedPartial = stripThinkingFromPoint(currentMessages, {
            messageIndex: located.messageIndex,
            thinkingIndex: located.indexInMessage,
          });
          if (strippedPartial !== currentMessages)
            return {
              scope: "partial",
              stripped: strippedPartial,
              from: located,
            };
        }
        let strippedAll = stripAllThinking(currentMessages);
        return strippedAll !== currentMessages
          ? {
              scope: "all",
              stripped: strippedAll,
              from: "all",
            }
          : undefined;
      })();
      if (stripResult === undefined && !thinkingWasStripped) markPrefixLockHealDeclined(error);
      let scope = stripResult?.scope ?? "none";
      let stripSummary = summarizeThinkingStrip(currentMessages, stripResult?.stripped ?? currentMessages);
      if (stripResult !== undefined) {
        messagesForAPI_2 = recoverMessages(stripResult.stripped, "error_recovery", true);
        recordStripScope(stripResult.from);
      }
      logForDebugging(
        stripResult === undefined
          ? "[thinking] prefix-lock rejection: nothing to strip; the error is returned."
          : `[thinking] prefix-lock rejection: stripped ${stripSummary.blocksStripped} of ${stripSummary.blocksSent} thinking block(s) (${scope}) and retrying.`,
        {
          level: "warn",
        },
      );
      let pendingChangeSummary = getPendingChangeSummary(options.querySource, options.agentId);
      logEvent("tengu_strict_prefix_lock_400_surfaced", {
        query_source: agentTypeForTelemetry(options.querySource),
        model: telemetrySafeModelName(options.model),
        request_id: traceValueOrUnknown(chainRequestId),
        chain_request_id: traceValueOrUnknown(stopReason),
        client_request_id: sanitizeMarkName(clientRequestId),
        solicited,
        mismatch_kind: sanitizeMarkName(thinkingPrefixMismatchHeader?.kind),
        failing_message_index: thinkingPrefixMismatchHeader?.block?.messageIndex,
        failing_block_index: thinkingPrefixMismatchHeader?.block?.blockIndex,
        thinking_blocks_sent: stripSummary.blocksSent,
        thinking_turns_sent: stripSummary.turnsSent,
        strip_scope: fromEnum(scope),
        stripped_block_count: stripSummary.blocksStripped,
        stripped_turn_count: stripSummary.turnsStripped,
        attempt: prefixLockAttempts,
        client_change_kinds: pendingChangeSummary.kinds,
        first_changed_message_index: pendingChangeSummary.firstChangedMessageIndex,
        client_baseline: pendingChangeSummary.baseline,
        call_number: pendingChangeSummary.callNumber,
      });
      return stripResult === undefined
        ? undefined
        : stripResult.scope === "partial"
          ? `retry:prefix-lock-strip-${prefixLockAttempts}`
          : `retry:prefix-lock-strip-all-${prefixLockAttempts}`;
    } catch (error) {
      logError(error);
    }
    return;
  };
  let recoverPrefixLockAndForeign = (error) => {
    let recovered = recoverPrefixLock(error);
    if (keptForeignSignatures && isInvalidThinkingSignatureError(error))
      dropForeignThinkingKeep(recovered !== undefined ? "rejected_healed" : "rejected_surfaced");
    return recovered;
  };
  function* emptyStream() {}
  function* yieldEffortNotice() {
    if (pendingNotice !== undefined) {
      let notice;
      try {
      } catch (error) {
        logError(error);
      }
      pendingNotice = undefined;
      if (notice) yield notice;
    }
  }
  let thinkingStripAttachmentSent = false;
  function thinkingStripAttachment() {
    let relayStopped = guardReturning(
      () =>
        builtForRelay &&
        !thinkingStripAttachmentSent &&
        (thinkingRelayModuleClaude?.relayStoppedInLastDispatch() ?? false),
      false,
    );
    if (relayStopped) {
      let stripPlanSize = guardReturning(() => thinkingStripAllPlan(messages).size > 0, undefined);
      if (stripPlanSize === true) {
        thinkingWasStripped = true;
        stripScope = "all";
        thinkingStripMarked = true;
      } else if (stripPlanSize === false) nothingToStrip = true;
    }
    if (nothingToStrip && !thinkingWasStripped && !thinkingStripAttachmentSent) {
      thinkingStripAttachmentSent = true;
      guardReturning(
        () => thinkingRelayModuleClaude?.markRelayThinkingStripRecorded("no_thinking"),
        undefined,
      );
      return createAttachmentMessage_2({
        type: "thinking_stripped",
        scope: "all",
      });
    }
    if (!thinkingWasStripped || thinkingStripAttachmentSent) return;
    thinkingStripAttachmentSent = true;
    if (thinkingStripMarked)
      guardReturning(
        () =>
          thinkingRelayModuleClaude?.markRelayThinkingStripRecorded(
            relayStopped ? "marker_same_request" : "marker",
          ),
        undefined,
      );
    return createAttachmentMessage_2(
      stripScope === "all"
        ? {
            type: "thinking_stripped",
            scope: "all",
          }
        : {
            type: "thinking_stripped",
            scope: "partial",
            from: {
              messageId: stripScope.messageId,
              thinkingIndex: stripScope.thinkingIndex,
            },
          },
    );
  }
  async function* queryModelCore() {}
  function blockKeyAt({ messageIndex, blockIndex }) {
    let message = sentMessages[messageIndex];
    return message?.role === "assistant" && Array.isArray(message.content)
      ? getThinkingBlockKey(message.content[blockIndex])
      : undefined;
  }
  function checkTetherPrefix(body) {
    try {
      if (
        !isTetherLive() ||
        thinkingAlreadyStripped ||
        pinnedSystemValue ||
        sawApiError ||
        retryRequested ||
        retryCause !== undefined
      )
        return;
      checkTetherPrefixMismatch({
        body,
        blockKeyAt,
        replyHolding: (messageIndex, blockKey) => {
          let sourceIndex = sourceIndexOf(messageIndex);
          let message = sourceIndex === undefined ? undefined : messagesForAPI_2[sourceIndex];
          return sourceIndex !== undefined &&
            message?.type === "assistant" &&
            Array.isArray(message.message.content) &&
            message.message.content.some((block) => getThinkingBlockKey(block) === blockKey)
            ? {
                messageId: message.message.id,
                messageIndex: sourceIndex,
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
          toolSchemas,
          thinkingConfig: betas,
          getMessageHashes,
        }),
      });
    } catch (error) {
      logError(toError(error));
    }
  }
  let thinkingDropAttachment = (body) => {
    if (thinkingAlreadyStripped) return;
    let dropReport = reportThinkingDrop({
      body,
      blockKeyAt,
      carriedBlockHashes: () => collectDroppedThinkingHashes(messages),
      countThinkingSent: () => summarizeThinkingStrip(messagesForAPI_2, messagesForAPI_2),
      querySource: options.querySource,
      agentId: options.agentId,
      model: options.model,
      requestId: responseRequestId,
      solicited,
      contextCompactedKind,
    });
    try {
      return (
        dropReport &&
        createAttachmentMessage_2(
          buildThinkingDropAttachment(dropReport, {
            requestId: responseRequestId,
            model: options.model,
            querySource: options.querySource,
            requestedBehavior: prefixMismatchBehavior,
          }),
        )
      );
    } catch (error) {
      logError(error);
      return;
    }
  };
  let parseMessageStop = (message) => {
    let fallbackIndex =
      options.serverRefusalFallback !== undefined
        ? (message.content ?? []).reduce(
            (acc, block, index) => (isFallbackNotification(block) ? index : acc),
            -1,
          )
        : -1;
    let isRefusal = message.stop_reason === "refusal";
    let lastHop;
    let droppedCount = 0;
    let hadToolUse = false;
    let content = [];
    for (let [index, block] of (message.content ?? []).entries()) {
      if (!isFallbackNotification(block)) {
        if ((index < fallbackIndex && block.type !== "text") || (isRefusal && fallbackIndex >= 0)) {
          droppedCount++;
          hadToolUse ||= block.type === "tool_use";
          continue;
        }
        content.push(block);
        continue;
      }
      let block_2 = parseFallbackMessage(block);
      if (block_2 === undefined) {
        logForDiagnosticsNoPII("warn", "cli_malformed_fallback_block");
        logEvent("tengu_rotunda_pennant_malformed", {
          block_index: index,
          non_streaming: true,
        });
        logFeatureSad("refusal_fallback", "malformed_fallback_block", {
          non_streaming: true,
        });
        continue;
      }
      content.push(fallbackNotification(block_2));
      lastHop = block_2;
      let fallbackMode = serverFallbackMode;
      logEvent("tengu_rotunda_pennant_materialized", {
        armed: options.serverRefusalFallback !== undefined,
        mode: fromEnum(fallbackMode),
        block_index: index,
        non_streaming: true,
      });
      if (block_2.reason === "refusal")
        logApiRefusal({
          model: resolvedModel,
          requestId: responseRequestId || undefined,
          querySource: options.querySource,
          effort: effortLevelNormalized,
          fastMode: fallbackActive,
          attempt: attemptNumber,
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
    if (content.length === 0 && (message.content ?? []).length > 0)
      content.push({
        type: "text",
        text: NO_CONTENT_MESSAGE,
        citations: [],
      });
    let stopIterations =
      options.serverRefusalFallback !== undefined ? parseUsageIterations(message.usage) : undefined;
    serverFallbackUsed =
      stopIterations?.servedFallbackModel !== undefined ||
      (options.serverRefusalFallback !== undefined && lastHop !== undefined);
    fallbackAnnounced = false;
    creditLogged = false;
    iterations = stopIterations;
    if (droppedCount > 0)
      logEvent("tengu_rotunda_pennant_sync_dropped", {
        dropped_count: droppedCount,
        had_tool_use: hadToolUse,
        chain_exhausted: isRefusal,
      });
    return {
      content,
      lastHop,
      iterations: stopIterations,
    };
  };
  function* handleStopEvents(parsed, message, creditCode) {
    if (creditCode !== undefined && !creditLogged) {
      creditLogged = true;
      let usage = mergeUsageFromDelta(EMPTY_USAGE, message.usage);
      logEvent("tengu_fallback_credit_minted", {
        request_id: sanitizeMarkName(responseRequestId),
        model: telemetrySafeModelName(options.model),
        fallback_target_model: telemetrySafeModelName(
          options.refusalFallbackModel ??
            (options.serverRefusalFallback !== undefined && !serverFallbackUsed
              ? options.serverRefusalFallback.model
              : undefined),
        ),
        token_length: creditCode.length,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens,
        cache_creation_5m_input_tokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
        cache_creation_1h_input_tokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
        service_tier: fromEnumOpt(usage.service_tier),
        speed: fromEnumOpt(usage.speed),
        query_source: agentTypeForTelemetry(options.querySource),
        ...(options.queryTracking && {
          query_chain_id: sanitizeMarkName(options.queryTracking.chainId),
          query_depth: options.queryTracking.depth,
        }),
      });
    }
    let servedModel =
      options.serverRefusalFallback !== undefined
        ? (parsed.lastHop?.model ?? parsed.iterations?.servedFallbackModel)
        : undefined;
    if (!fallbackAnnounced && servedModel !== undefined) {
      fallbackAnnounced = true;
      yield {
        type: "server_fallback",
        fromModel: parsed.lastHop?.fromModel ?? options.model,
        toModel: servedModel,
        reason: parsed.lastHop !== undefined ? "refusal" : "sticky",
        apiRefusalCategory: parsed.lastHop?.category ?? null,
        midStream: false,
        requestId: responseRequestId ?? null,
        refusedEffort: refusedEffortInfo(),
        discardedMessages: [],
        retainedMessages: [],
        retainedText: "",
        finalStopReason: message.stop_reason,
      };
    }
    let silentLane = options.refusalFallbackModelLane === "silent";
    let armedFallback = !silentLane
      ? (options.refusalFallbackModel ??
        (options.serverRefusalFallback !== undefined && !serverFallbackUsed
          ? options.serverRefusalFallback.model
          : undefined))
      : undefined;
    let refusalFallbackCascadeHop = options.refusalFallbackCascadeHop;
    let route =
      message.stop_reason === "refusal" &&
      armedFallback !== undefined &&
      refusalFallbackCascadeHop === undefined
        ? resolveRefusalFallbackRoute({
            originalModelCanonical: getCanonicalName(options.model),
            armedFallbackModel: armedFallback,
            apiRefusalCategory: message.stop_details?.category ?? null,
            armedTargetIsRefusingModel: isSameModel(options.model, armedFallback),
            resolveTarget: (mappedTarget) =>
              pickFallbackModel({
                mappedTarget,
                armedFallbackModel: armedFallback,
                refusingModel: options.model,
                triedModels: [canonicalModelKey(options.model)],
              }),
            routesOverride: noopDialogHost(),
          })
        : undefined;
    let fallbackModel = route !== undefined ? route.model : armedFallback;
    if (route !== undefined)
      logFallbackRouteOutcome({
        route,
        model: options.model,
        armedFallbackModel: armedFallback,
        apiRefusalCategory: message.stop_details?.category,
        requestId: responseRequestId,
      });
    if (message.stop_reason === "refusal" && fallbackModel !== undefined) {
      recordMediaLimitSuccess();
      fallbackTriggered = true;
      let cyberVerification = cyberVerificationOf(message.stop_details);
      yield {
        type: "fallback_request",
        trigger: "refusal",
        originalModel: options.model,
        fallbackModel,
        requestId: responseRequestId ?? null,
        refusedEffort: refusedEffortInfo(),
        apiRefusalCategory: message.stop_details?.category ?? null,
        apiRefusalExplanation: message.stop_details?.explanation ?? null,
        ...(cyberVerification !== undefined && {
          apiRefusalCyberVerification: cyberVerification,
        }),
        creditCode: creditCode ?? null,
        mintedStateless: !threadSliced,
        ...describeFallbackRoute(route, refusalFallbackCascadeHop),
      };
      return true;
    }
    let refusalMessage = getRefusalMessage(
      message.stop_reason,
      message.stop_details,
      responseRequestId,
      servedModel ?? options.model,
      message.id,
    );
    if (refusalMessage) {
      let latchActive = hasRefusalFallbackOccurred() || getRefusalFallbackModelLatch() !== undefined;
      if (
        armedFallback !== undefined ||
        options.refusalFallbackModel !== undefined ||
        (hasRefusalFallbackTarget(options.model) && isRefusalFallbackEnabled()) ||
        hasFallbackLatch() ||
        latchActive
      )
        logFeatureBad(
          "refusal_fallback",
          route?.matched === "none"
            ? "route_declined"
            : silentLane
              ? "sync_silent_stood"
              : servedModel !== undefined
                ? "server_chain_exhausted"
                : latchActive
                  ? "client_chain_exhausted"
                  : hasRefusalFallbackTarget(options.model) && isSwitchModelsOnFlagDisabled()
                    ? "disabled_by_config"
                    : "not_armed",
          {
            convolute_arcades: hasConvoluteArcadesFlag(),
            arm_source: fromEnum(getFallbackLatchKind()),
            armed: armedFallback !== undefined,
            model_scope: fromEnum(classifyFallbackOrigin(options.model)),
          },
        );
      yield {
        type: "refusal_no_fallback",
        originalModel: options.model,
        requestId: responseRequestId ?? null,
        apiRefusalCategory: message.stop_details?.category ?? null,
        apiRefusalExplanation: message.stop_details?.explanation ?? null,
      };
      yield refusalMessage;
    }
    let maxTokensMsg = maxTokensStopMessageFor(message);
    if (maxTokensMsg !== undefined) yield maxTokensMsg;
    return false;
  }
  function maxTokensStopMessageFor(message) {
    try {
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_vast_sunset", true)) return;
      return getMaxTokensStopMessage(
        message.stop_reason,
        Math.min(maxOutputTokens, MAX_OUTPUT_TOKENS_CAP_2),
        message.usage?.output_tokens ?? 0,
        maxOutputTokens >= MAX_OUTPUT_TOKENS_CAP_2,
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
  let hintClears = [];
  function recordHintClears(clearedIds, clearedContent) {
    if (clearedIds.size > 0)
      hintClears.push({
        type: "hint_clears",
        ids: [...clearedIds],
        contentById: Object.fromEntries(clearedContent),
      });
  }
  function* drainHintClears() {
    yield* hintClears.splice(0);
  }
  async function* runNonStreamingFallback(originatingRequestId, failedStreamOutlastedTimeout) {
    let { message, requestId, headers, creditCode } = yield* executeNonStreamingRequest(
      {
        model: options.model,
        fetchOverride: options.fetchOverride,
        source: options.querySource,
        requestClass: options.requestClass,
        agentContext: options.agentContext,
        promptId: requestPromptId,
        ccsSender: key,
        permissionContext,
        toolNames,
        credentials: options.credentials,
        storageV5: options.storageV5,
        clock,
        queryTracking: options.queryTracking,
        leavesLimitStateAlone: options.leavesLimitStateAlone,
        llmSpan: llmRequestSpan,
        contextCompactedKindForWire: contextCompactedKind,
        compactionRequestKindForWire: compactionRequestKind,
        prevToolDurationsForWire: prevToolDurations,
      },
      {
        model: options.model,
        fallbackModel: options.fallbackModel,
        accessFallbackModel: accessFallbackModel_2,
        toolFreeHelper: options.toolFreeHelper,
        ...(isFastModeEnabled() && {
          fastMode: fastModeActive,
        }),
        modelIsRefusalFallbackTarget: options.modelIsRefusalFallbackTarget,
        signal,
        initialConsecutive529Errors: retryBudget.counts().overloaded,
        querySource: options.querySource,
        maxRetries: retryBudget.retriesLeft(),
        modelCallRetries: retryBudget,
        clock,
        random: options.random,
        isResumePrefillRequest: resumeIncompleteThinking,
        failedStreamOutlastedTimeout,
        onRetryStatus: options.onRetryStatus,
        subscribeRetryWake: options.subscribeRetryWake,
        onQuotaWindowWait,
        isUsageLimitLifted,
        lowPriorityWait,
        stampDispatchHeader,
        onApiError: async (error) => {
          let keptReminderRetry = handleKeptReminderRejection(error);
          if (keptReminderRetry !== undefined) return keptReminderRetry;
          let dispatchRetry = await handleDispatchError(error);
          if (dispatchRetry !== undefined) return dispatchRetry;
          let hookRetry = recoverHookRetry(error);
          if (hookRetry !== undefined) return hookRetry;
          let classifierRetry = handleDangerousToolUseRejection(error);
          if (classifierRetry !== undefined) return classifierRetry;
          let recovered = noRecovery(error);
          if (recovered !== null) return recovered;
          let webSearchRetry = handleWebSearchRejected(error, "sync");
          if (webSearchRetry !== undefined) return webSearchRetry;
          let mediaRetry = handleUnprocessableMedia(error);
          if (mediaRetry !== undefined) return mediaRetry;
          let foundryRetryDirective = getFoundryRetryDirective(error, options.model, options.querySource);
          if (foundryRetryDirective === FAIL_FOUNDRY_PURPOSE_REQUEST) return;
          if (foundryRetryDirective !== null) return foundryRetryDirective;
          let structuredRetry = handleStructuredOutputs(error);
          if (structuredRetry !== null) return structuredRetry;
          let promptEndRetry = probePromptEndMark(error);
          if (promptEndRetry) return promptEndRetry;
          let toolChangeRetry = recoverToolChange(error);
          if (toolChangeRetry) return toolChangeRetry;
          let effortRetry = handleEffortUnsupported(error);
          if (effortRetry !== null) return effortRetry;
          let programUseCaseRetry = recoverProgramUseCaseBeta(error) ?? recoverProgramUseCaseNotHeld(error);
          if (programUseCaseRetry !== null) return programUseCaseRetry;
          let resumptionRetry = recoverThinkingResumptionBeta(error);
          if (resumptionRetry === "surface:resume-prefill") return;
          if (resumptionRetry !== null) return resumptionRetry;
          let highlightsRetry = handleThinkingHighlights(error);
          if (highlightsRetry !== null) return highlightsRetry;
          let tokenCountProbe = recoverThinkingTokenCountBeta(error);
          if (tokenCountProbe !== null) return tokenCountProbe;
          let mentionedBetasRetry = recoverMentionedBetas(error) ?? recoverRejectedBetas(error);
          if (mentionedBetasRetry !== undefined) return mentionedBetasRetry;
          maybeRefuseToolSearch(error);
          let context1mRetry = probeContext1mBeta(error);
          if (context1mRetry !== null) return context1mRetry;
          let bindingRetry = recoverThinkingBinding(error);
          if (bindingRetry !== null) return bindingRetry;
          let prefixLockRetry = recoverPrefixLockAndForeign(error);
          if (prefixLockRetry !== undefined) return prefixLockRetry;
          return (
            recoverViaWireCache(error) ??
            handleAdvisorUnavailable(error) ??
            recoverFromHintError(error) ??
            probeThinkingTokenCount(error, false) ??
            handleFallbackRejection(error, "sync") ??
            probeClearAt(error) ??
            maybeRetryThreads(error) ??
            classifyHintRecovery(error) ??
            probeThinkingDisplay(error) ??
            recoverUnclaimedBeta(error) ??
            maybeRefuseToolSearchFinal(error)
          );
        },
      },
      buildRequestParamsGuarded,
      (attemptedAt, attemptStart, attemptMaxTokens) => {
        attemptNumber = attemptedAt;
        maxOutputTokens = attemptMaxTokens;
        dispatchedAt = attemptStart;
      },
      (params) => recordRequestBodies(params, false),
      originatingRequestId,
    );
    responseRequestId = requestId;
    noteResponse(requestId, headers, true);
    checkTetherPrefix(message);
    tetherDelta?.settle(
      {
        kind: "ok",
      },
      responseRequestId,
      message.id,
    );
    try {
      noteCacheCoverageUsage(message.usage);
      noteCacheCoverageSustained(message.usage);
    } catch {}
    notePerTurnEffortOk();
    noteLateToolsOk();
    noopAfterSend();
    noopAfterSuccess();
    settleHealsAtSuccess();
    settleTokenCountState();
    settleMidConvState();
    settleProbeState();
    healState();
    settleContext1mProbe();
    probeState();
    settlePromptEndMark();
    logEvent("tengu_nonstreaming_fallback_success", {
      model: telemetrySafeModelName(options.model),
      request_id: traceValueOrUnknown(requestId),
      originating_request_id: traceValueOrUnknown(firstAttemptRequestId),
      fallback_cause: fromEnum(originatingRequestId.cause),
      attempt: attemptNumber,
    });
    yield* yieldEffortNotice();
    yield* emptyStream();
    yield* orgEffortNotice();
    cacheMissReason = message.diagnostics?.cache_miss_reason ?? undefined;
    let parsed = parseMessageStop(message);
    let wireInputs = wireInputsEchoed ? captureWireToolInputs(parsed.content) : undefined;
    if (wireInputs?.degraded) logWireToolInputParseFailure();
    let inputs = wireInputs?.inputs;
    let ingestContext = wireIngestContextStamps(parsed.content, inputs);
    let { content, batchToolUses } = isBatchToolsUse(
      normalizeContentFromAPI(
        parsed.content,
        tools,
        options.agentId,
        {
          requestId: responseRequestId ?? undefined,
          messageId: message.id,
        },
        options.storageV5,
      ),
      tools,
      (item, index) => normalizeToolInput_2(item, index, options.agentId, options.storageV5),
    );
    if (classifierSession !== undefined) settleClassifier(classifierSession, message, message.content);
    responseHeaders = headers;
    let dropAttachment = thinkingDropAttachment(message);
    let stripAttachment = thinkingStripAttachment();
    if (stripAttachment) yield stripAttachment;
    let advisorStrippedMsg = advisorStrippedMessage();
    if (advisorStrippedMsg) yield advisorStrippedMsg;
    if (dropAttachment) yield dropAttachment;
    let usage_2 = mergeUsageFromDelta(EMPTY_USAGE, message.usage);
    let assistantMessage = {
      message: {
        ...message,
        content,
        usage: usage_2,
        ...(contextManagementEligible &&
          message.context_management && {
            context_management: addClientEstimatedClearedTokens(
              message.context_management,
              toolResultClearingPlan?.edit,
              sentMessages,
              tetherDecision,
              usage_2,
            ),
          }),
      },
      ...(batchToolUses.length > 0 && {
        batchToolUses,
      }),
      ...(inputs !== undefined && {
        wireToolInputs: inputs,
      }),
      ...(ingestContext !== undefined && {
        wireIngestContext: ingestContext,
      }),
      ...(classifierSession !== undefined && classifierResultPayload(classifierSession)),
      apiBlockIndex: 0,
      requestId: responseRequestId ?? undefined,
      requestRef: healRequestId,
      requestedModel: options.model,
      promptCacheRequested,
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
      ...(advisorModelForQuery && {
        advisorModel: advisorModelForQuery,
      }),
      ...(sentEffort !== undefined && {
        effort: sentEffort,
      }),
      perTurnEffort: perTurnEffortValue,
      perTurnTiming: perTurnNowValue,
      ...{},
    };
    noopNotice(conversation_2, assistantMessage);
    yieldedMessages.push(assistantMessage);
    nonStreamingAssistant = assistantMessage;
    usageRecorded = false;
    yield assistantMessage;
    return yield* handleStopEvents(parsed, message, creditCode);
  }
  let suppressedByFallback = false;
  let blockMessages = new Map();
  let malformedBlocks = new Set();
  let fallbackBlockIndices = new Set();
  let pendingFallback;
  let backgroundAgentId =
    getBackgroundAgentId(options.agentContext) ?? (options.isBackgroundAgent ? options.agentId : undefined);
  let contextCompactedKind =
    classifyQuerySource(options.querySource) === "main" &&
    isMainQueryCompaction(options.querySource, options.agentId)
      ? consumePendingContextCompacted()
      : undefined;
  let compactionRequestKind = options.compactionRequestKind;
  let prevToolDurations =
    options.prevToolDurations !== undefined
      ? formatToolDurationsHeader(options.prevToolDurations)
      : undefined;
  try {
    startSessionActivity("api_call", backgroundAgentId);
    e: for (;;) {
      let clearStreamTimers = function () {
        if (streamIdleTimer !== null) {
          streamIdleTimer();
          streamIdleTimer = null;
        }
        if (stallNotified) {
          stallNotified = false;
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
      let armStallWatcher = function () {
        if (!options.onRetryStatus || !chunkTimes) return;
        let lastAt = chunkTimes.lastAt;
        let lastEventAt = clock.monotonicNow();
        streamIdleTimer = clock.setTimeout(
          () => {
            if (clock.monotonicNow() - lastEventAt < streamStallMarginMs / 2) return;
            if (chunkTimes.lastAt > lastAt) {
              armStallWatcher();
              return;
            }
            let idleMs = clock.monotonicNow() - chunkTimes.lastAt;
            if (advisorToolInFlight && idleMs < min_2) {
              armStallWatcher();
              return;
            }
            let lastEventAgeMs = chunkTimes.lastAt === 0 ? clock.monotonicNow() - stallWindowStart : idleMs;
            stallNotified = true;
            options.onRetryStatus?.({
              kind: "stalled",
              deadline: clock.now() + Math.max(0, min - lastEventAgeMs),
            });
          },
          streamStallMarginMs,
          {
            unref: true,
          },
        );
      };
      let armStreamWatchdogs = function () {
        if (
          idleTimeoutBaseMs > 0 &&
          streamIdleWarningTimer !== null &&
          !idleTimedOut &&
          suspendedError === undefined &&
          slackStillFresh(clock, lastWatchdogArmMonotonicMs, lastWatchdogArmWallMs, idleTimeoutBaseMs)
        )
          return;
        clearStreamTimers();
        armStallWatcher();
        if (!CLAUDE_ENABLE_STREAM_WATCHDOG) return;
        let armedAt = clock.monotonicNow();
        let warningThresholdMs = clock.now();
        lastWatchdogArmMonotonicMs = armedAt;
        lastWatchdogArmWallMs = warningThresholdMs;
        let warningMs = warningThresholdMs_2;
        streamWatchdogFiredAt = clock.setTimeout(() => {
          if (clock.monotonicNow() - armedAt < warningMs) return;
          logForDebugging(`Streaming idle warning: no chunks received for ${warningMs / 1000}s`, {
            level: "warn",
          });
          logForDiagnosticsNoPII("warn", "cli_streaming_idle_warning");
        }, warningThresholdMs_2);
        streamIdleWarningTimer = clock.setTimeout(() => {
          suspendedError = checkSuspendedStreamIdle(clock, {
            armedAt,
            wallArmedAt: warningThresholdMs,
            idleMs: streamIdleTimeoutMs,
          });
          if (suspendedError !== undefined) {
            releaseStreamResources();
            return;
          }
          idleTimedOut = true;
          idleTimeoutAt = clock.monotonicNow();
          logForDebugging(
            `Streaming idle timeout: no chunks received for ${streamIdleTimeoutMs / 1000}s, aborting stream`,
            {
              level: "error",
            },
          );
          logForDiagnosticsNoPII("error", "cli_streaming_idle_timeout", {
            rearm_slack_ms: idleTimeoutBaseMs,
          });
          logEvent("tengu_streaming_idle_timeout", {
            model: telemetrySafeModelName(options.model),
            request_id: traceValueOrUnknown(responseRequestId),
            timeout_ms: streamIdleTimeoutMs,
            tier: lit_2("event"),
          });
          releaseStreamResources();
        }, streamIdleTimeoutMs);
      };
      responseMeta = undefined;
      queryCheckpoint("query_client_creation_start");
      if (isTopLevelMain) {
        markRequestBuildPart("retry_setup");
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
            promptId: requestPromptId,
            ccsSender: key,
            permissionContext,
            toolNames,
            credentials: options.credentials,
            storageV5: options.storageV5,
            signal,
            clock,
            noResponseRetryLedger: noResponseRetryLedgerState,
          }),
        async (anthropic, attempt, context) => {
          if (fallbackCreditCode === undefined)
            logCreditOutcome("attempt_errored", responseRequestId ?? null, null);
          attemptNumber = attempt;
          fallbackActive = context.fastMode ?? false;
          attemptStartAt = clock.monotonicNow();
          responseMeta = undefined;
          attemptStartTimes.push(attemptStartAt);
          queryCheckpoint("query_client_creation_end");
          if (isTopLevelMain) {
            endProfilePhase("client_creation");
            startProfilePhase("request_build");
          }
          let params = buildRequestParamsGuarded(context);
          if (isTopLevelMain) markRequestBuildPart("sent_build");
          try {
            logApiQueryOnce(params);
          } catch (error) {
            logError(toError(error));
          }
          logApiRequestDetail(params);
          recordRequestBodies(params, true);
          maxOutputTokens = params.max_tokens;
          if (attempt === 1 && isMainThread && !options.agentId) {
            let requestParams = awaitCacheWarmIfAny(options.model, signal);
            if (requestParams !== undefined) {
              await requestParams;
              attemptStartAt = clock.monotonicNow();
              attemptStartTimes[attemptStartTimes.length - 1] = attemptStartAt;
            }
          }
          queryCheckpoint("query_api_request_sent");
          logForDebugging(
            `[API:timing] dispatching to ${getProviderForModel(options.model)} model=${options.model}`,
          );
          dispatchedAt = clock.now();
          if (queryOverheadMs === undefined && options.queryTracking?.roundStartedAtMs !== undefined) {
            options.queryTracking.firstDispatchedAtMs ??= performance.now();
            queryOverheadMs = Math.round(
              options.queryTracking.firstDispatchedAtMs - options.queryTracking.roundStartedAtMs,
            );
          }
          if (!options.agentId) {
            if (isMainThread) headlessProfilerCheckpoint("api_request_sent");
            if (isTopLevelMain) {
              markRequestBuildPart("record_attempt");
              endProfilePhase("request_build");
              requestedEffort ??= openFirstEventWait(!effortLevel);
              effortLevel = true;
            }
            if (attempt === 1 && !sentAtMonotonic) {
              sentAtMonotonic = clock.monotonicNow();
              sentAtWall = clock.now();
              if (isMainThread) recordApiRequestSentFromSpawn();
              if (isTopLevelMain) profileHandle = closeProfile(sentAtMonotonic);
            }
            if (isMainThread)
              try {
                markRootRequestSent();
              } catch (error) {
                logError(toError(error));
              }
          }
          cancelFirstByteTimer();
          let slowFirstByteMs = parseIntLoose(process.env.CLAUDE_SLOW_FIRST_BYTE_MS) || 30000;
          firstByteTimer = clock.setTimeout(() => {
            firstByteTimer = null;
            let elapsedMs = clock.monotonicNow() - attemptStartAt;
            logForDebugging(
              `Slow first byte: no stream chunk ${(elapsedMs / 1000).toFixed(1)}s after request sent (attempt ${attempt})`,
              {
                level: "warn",
              },
            );
            logEvent("tengu_api_slow_first_byte", {
              model: telemetrySafeModelName(options.model),
              provider: getAPIProviderForAnalytics(),
              attempt,
              elapsed_ms: Math.round(elapsedMs),
            });
          }, slowFirstByteMs);
          let requestTraceHeaders = buildRequestTraceHeaders(llmRequestSpan, attemptStartTimes.length);
          clientRequestId = requestTraceHeaders.clientRequestId;
          let headers = requestTraceHeaders.headers;
          isLowPriority = isFirstPartyApiBackend() && isLowPriorityActiveSafe();
          if (isLowPriority) headers[ANTHROPIC_USAGE_LIMIT] = SLOW;
          if (shouldSendExtendedUsageLimitHeader(options, isLowPriority, isSessionTask || earlyToolCap.asks))
            headers[ANTHROPIC_USAGE_LIMIT] = "extended";
          stampDispatchHeader(headers, isLowPriority);
          if (
            options.fallbackStampFromModel !== undefined &&
            getAPIProvider() === "firstParty" &&
            isFirstPartyAnthropicBaseUrl()
          )
            for (let [headerName, headerValue] of [
              [X_CC_FALLBACK_FROM_MODEL, options.fallbackStampFromModel],
              [X_CC_FALLBACK_CATEGORY, options.fallbackStampCategory],
              [X_CC_FALLBACK_TRIGGER, options.fallbackStampTrigger],
              [X_CC_ORIGINAL_REQUEST_ID, options.fallbackStampOriginalRequestId],
            ]) {
              let sanitizedValue = sanitizeHeaderValue_2(headerValue);
              if (sanitizedValue !== undefined) headers[headerName] = sanitizedValue;
            }
          setCompactionHeaders(headers, contextCompactedKind, compactionRequestKind);
          setPrevToolDurationsHeader(headers, prevToolDurations);
          let creditToken = fallbackCreditCode;
          creditEchoedStream = creditToken !== undefined;
          if (creditToken !== undefined) {
            fallbackCreditCode = undefined;
            creditMintedStream = true;
          }
          limitsAccountEpoch = getLimitsAccountEpoch();
          if (clientRequestId !== undefined) {
            armFirstByteWatchdog(clientRequestId, {
              escalated: noResponseRetryLedgerState.count > 0,
            });
            takeDispatchAtGzip(clientRequestId, performance.now());
          }
          if (classifyQuerySource(options.querySource) === "main") setTimeout(warmHarnessPatterns, 0);
          setTimeout(flushMessageOutlines, 0, options.querySource, options.agentId);
          let streamRequestBody = {
            ...inlineToolReferences(deferredToolNameOf(params)),
            ...(creditToken !== undefined && {
              fallback_credit_token: creditToken,
            }),
            stream: true,
          };
          let incrementalBody = takesRequestBodyBytes(options.fetchOverride)
            ? checkIncrementalRequestBody(streamRequestBody, options)
            : undefined;
          let responseWithMeta = await reportIncrementalBodyMismatch(incrementalBody, streamRequestBody, () =>
            anthropic.beta.messages
              .create(streamRequestBody, {
                signal,
                ...(incrementalBody === undefined
                  ? Object.keys(headers).length > 0 && {
                      headers,
                    }
                  : {
                      body: incrementalBody,
                      headers: {
                        ...headers,
                        "content-type": "application/json",
                      },
                    }),
              })
              .withResponse(),
          ).catch((error) => {
            cancelFirstByteTimer();
            throw error;
          });
          queryCheckpoint("query_response_headers_received");
          responseRequestId = amazonRequestId(
            responseWithMeta.request_id,
            responseWithMeta.response?.headers,
          );
          responseBody = responseWithMeta.response;
          headersReceivedAt = clock.now();
          earlyToolCap.noteServed();
          noteResponse(responseRequestId, responseWithMeta.response?.headers, false);
          responseMeta = responseWithMeta.response && {
            status: responseWithMeta.response.status,
            headers: responseWithMeta.response.headers,
            latencyMs: Math.round(clock.monotonicNow() - attemptStartAt),
          };
          logApiRouteObserved(responseMeta, incrementalBody !== undefined);
          if (creditToken !== undefined)
            logEvent("tengu_rotunda_pennant_credit_echoed", {
              mint_request_id: sanitizeMarkName(options.fallbackCreditMintRequestId),
              mint_model: telemetrySafeModelName(options.fallbackCreditMintModel),
              request_id: sanitizeMarkName(responseRequestId),
              client_request_id: sanitizeMarkName(clientRequestId),
              model: telemetrySafeModelName(options.model),
              token_length: creditToken.length,
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
                fastMode: fastModeActive,
              }
            : false),
          modelIsRefusalFallbackTarget: options.modelIsRefusalFallbackTarget,
          signal,
          initialConsecutive529Errors: retryBudget.counts().overloaded,
          maxRetries: retryBudget.retriesLeft(),
          noResponseRetryLedger: noResponseRetryLedgerState,
          modelCallRetries: retryBudget,
          clock,
          random: options.random,
          isResumePrefillRequest: resumeIncompleteThinking,
          querySource: options.querySource,
          onRetryStatus: options.onRetryStatus,
          subscribeRetryWake: options.subscribeRetryWake,
          onQuotaWindowWait,
          isUsageLimitLifted,
          lowPriorityWait,
          onError: async (error) => {
            logApiQueryOnError();
            let recovered = handleKeptReminderRejection(error);
            if (recovered !== undefined) return recovered;
            if (
              earlyToolCap.takeAfter(error, () =>
                shouldSendExtendedUsageLimitHeader(options, isLowPriority, true),
              )
            )
              return "retry:usage-limit-grace";
            let hookRetry = recoverHookRetry(error);
            if (hookRetry !== undefined) return hookRetry;
            let classifierRetry = handleDangerousToolUseRejection(error);
            if (classifierRetry !== undefined) return classifierRetry;
            let recoveredResult = noRecovery(error);
            if (recoveredResult !== null) return recoveredResult;
            if (afkModeOn && isAfkModeBetaRejected(error)) {
              afkModeOn = false;
              if (BETA_AFK_MODE) markBetaRejected(conversation_2, BETA_AFK_MODE);
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
            let dispatchRetry = await handleDispatchError(error);
            if (dispatchRetry !== undefined) return dispatchRetry;
            if (isAdvisorResultUnprocessable(error)) {
              let originalMessages = messagesForAPI_2;
              let strippedMessages = stripAdvisorBlocks(originalMessages);
              let index = originalMessages.findIndex((message, index) => strippedMessages[index] !== message);
              let reduced = originalMessages.reduce(
                (acc, message, index) => (strippedMessages[index] !== message ? acc + 1 : acc),
                0,
              );
              let recordStrip = isFoamySpringWireOn() && index !== -1;
              let stripFrom;
              if (recordStrip && !options.resumeIncompleteThinking && thinkingType !== "enabled")
                try {
                  let index_2 = originalMessages.findIndex(
                    (message, stripIndexOf) => stripIndexOf >= index && hasAdvisorBlocks(message),
                  );
                  let firstWithAdvisor = index_2 === -1 ? undefined : originalMessages[index_2];
                  if (firstWithAdvisor?.type === "assistant") {
                    let afterStripMessages = stripThinkingFromPoint(strippedMessages, {
                      messageIndex: index_2,
                      thinkingIndex: 0,
                    });
                    if (afterStripMessages !== strippedMessages) {
                      strippedMessages = afterStripMessages;
                      let id = firstWithAdvisor.message.id;
                      if (typeof id === "string") {
                        let thinkingIndex = 0;
                        for (let idx = 0; idx < index_2; idx++) {
                          let message = originalMessages[idx];
                          if (
                            message.type === "assistant" &&
                            message.message.id === id &&
                            Array.isArray(message.message.content)
                          )
                            thinkingIndex += countWhere(
                              message.message.content,
                              (block) => block.type === "thinking" || block.type === "redacted_thinking",
                            );
                        }
                        stripFrom = {
                          messageIndex: index_2,
                          indexInMessage: 0,
                          thinkingIndex,
                          messageId: id,
                        };
                      } else {
                        strippedMessages = stripAllThinking(strippedMessages);
                        stripFrom = "all";
                      }
                    }
                  }
                } catch (error) {
                  logError(toError(error));
                  strippedMessages = stripAdvisorBlocks(originalMessages);
                  stripFrom = undefined;
                }
              messagesForAPI_2 = recoverMessages(strippedMessages, "error_recovery");
              wrapFallbacksAdvisorStrip();
              if (recordStrip) {
                shouldNotifyAdvisorStripped = true;
                if (stripFrom !== undefined) recordStripScope(stripFrom);
              }
              logForDebugging(
                reduced === 0
                  ? "[advisor] the server could not process an advisor result sent earlier in this conversation; nothing to remove, retrying as sent."
                  : `[advisor] the server could not process an advisor result sent earlier in this conversation; retrying with the advisor blocks removed from ${reduced} message(s)${stripFrom === "all" ? " and all thinking removed" : stripFrom !== undefined ? " and the thinking after them removed" : ""}${recordStrip ? "; recorded, so later requests leave them out too." : "; not recorded, so the next request sends them again."}`,
                {
                  level: "warn",
                },
              );
              logEvent("tengu_advisor_strip_retry", {
                query_source: agentTypeForTelemetry(options.querySource),
                strip_recorded: recordStrip,
                stripped_message_count: reduced,
                thinking_also_stripped: stripFrom !== undefined,
              });
              return "retry:advisor-strip";
            }
            let webSearchRetry = handleWebSearchRejected(error, "stream");
            if (webSearchRetry !== undefined) return webSearchRetry;
            let streamWatchdogEnabled = handleUnprocessableMedia(error);
            if (streamWatchdogEnabled !== undefined) return streamWatchdogEnabled;
            let foundryRetryDirective = getFoundryRetryDirective(error, options.model, options.querySource);
            if (foundryRetryDirective === FAIL_FOUNDRY_PURPOSE_REQUEST) return;
            if (foundryRetryDirective !== null) return foundryRetryDirective;
            let structuredRetry = handleStructuredOutputs(error);
            if (structuredRetry !== null) return structuredRetry;
            {
              let mediaErrorFromApiError = getMediaErrorFromApiError(error);
              if (mediaErrorFromApiError) {
                let errorMessage = error instanceof Error ? error.message : String(error);
                let strippedImages = isBase64ImageBlock(messagesForAPI_2, errorMessage);
                if (strippedImages !== messagesForAPI_2) {
                  messagesForAPI_2 = recoverMessages(strippedImages, "error_recovery");
                  mediaStripErrors.set(mediaErrorFromApiError.kind, errorMessage);
                  notifyMediaStripped(options, mediaErrorFromApiError.kind, errorMessage);
                  logEvent("tengu_media_block_strip_retry", {
                    kind: fromEnum(mediaErrorFromApiError.kind),
                    targeted: 1,
                  });
                  return "retry:media-strip-over-dimension-limit";
                }
                let sourceIndex =
                  mediaErrorFromApiError.messageIdx !== undefined
                    ? sourceIndexOf(mediaErrorFromApiError.messageIdx)
                    : undefined;
                if (
                  mediaErrorFromApiError.messageIdx !== undefined &&
                  sourceIndex !== undefined &&
                  mediaErrorFromApiError.contentIdx !== undefined
                ) {
                  let attemptKey = `${mediaErrorFromApiError.messageIdx}.${mediaErrorFromApiError.contentIdx}`;
                  let attempts = mediaStripAttempts.get(attemptKey) ?? 0;
                  let nestedContentIdx =
                    mediaErrorFromApiError.nestedContentIdx !== undefined && attempts < maxLastMediaStrips
                      ? mediaErrorFromApiError.nestedContentIdx
                      : undefined;
                  let replaced = replaceUnsupportedMediaAt(
                    messagesForAPI_2,
                    {
                      messageIdx: sourceIndex,
                      contentIdx: mediaErrorFromApiError.contentIdx,
                      nestedContentIdx,
                      kind: mediaErrorFromApiError.kind,
                    },
                    errorMessage,
                  );
                  if (replaced !== messagesForAPI_2) {
                    messagesForAPI_2 = recoverMessages(replaced, "error_recovery");
                    mediaStripErrors.set(mediaErrorFromApiError.kind, errorMessage);
                    notifyMediaStripped(options, mediaErrorFromApiError.kind, errorMessage);
                    if (nestedContentIdx !== undefined) mediaStripAttempts.set(attemptKey, attempts + 1);
                    let pathPrefix = `messages.${mediaErrorFromApiError.messageIdx}.content.${mediaErrorFromApiError.contentIdx}`;
                    let mediaPath =
                      nestedContentIdx !== undefined
                        ? `${pathPrefix}.tool_result.content.${nestedContentIdx}`
                        : mediaErrorFromApiError.nestedContentIdx !== undefined
                          ? `${pathPrefix}.tool_result.content.*`
                          : pathPrefix;
                    logForDebugging(
                      `Removed unprocessable ${mediaErrorFromApiError.kind} at ${mediaPath}; retrying.`,
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
                    return `retry:media-strip:${mediaErrorFromApiError.kind}:${mediaPath}`;
                  }
                }
                let replacedLatest =
                  lastMediaStripCount.value < lastMediaStripLimit
                    ? replaceLastUnsupportedMedia(messagesForAPI_2, mediaErrorFromApiError.kind, errorMessage)
                    : undefined;
                if (replacedLatest) {
                  lastMediaStripCount.value++;
                  messagesForAPI_2 = recoverMessages(replacedLatest.messages, "error_recovery");
                  mediaStripErrors.set(mediaErrorFromApiError.kind, errorMessage);
                  notifyMediaStripped(options, mediaErrorFromApiError.kind, errorMessage);
                  logForDebugging(
                    `Removed base64 ${mediaErrorFromApiError.kind} blocks from carrier ${replacedLatest.carrierIdx} (API 400 had no usable path); retrying.`,
                    {
                      level: "warn",
                    },
                  );
                  logEvent("tengu_media_block_strip_retry", {
                    kind: fromEnum(mediaErrorFromApiError.kind),
                    targeted: 0,
                    carrier_idx: replacedLatest.carrierIdx,
                  });
                  return `retry:media-strip-latest:${mediaErrorFromApiError.kind}:${replacedLatest.carrierIdx}`;
                }
              }
            }
            if (keepaliveHeaderOn && isCacheKeepaliveBetaRejected(error)) {
              keepaliveHeaderOn = false;
              onKeepaliveHeaderRejected(conversation_2, limitsAccountEpoch, isMainThread);
              return "retry:cache-keepalive-beta";
            }
            let body = recoverProgramUseCaseBeta(error) ?? recoverProgramUseCaseNotHeld(error);
            if (body !== null) return body;
            let resumptionRetry = recoverThinkingResumptionBeta(error);
            if (resumptionRetry === "surface:resume-prefill") return;
            if (resumptionRetry !== null) return resumptionRetry;
            {
              let rejectedThinkingType = getRejectedThinkingType(error);
              if (rejectedThinkingType) {
                let fallbackType = rejectedThinkingType === "enabled" ? "adaptive" : "enabled";
                setThinkingTypeOverride(options.model, fallbackType);
                logForDebugging(
                  `[thinking] model rejected thinking.type=${rejectedThinkingType}; retrying with ${fallbackType}. For Bedrock application-inference-profile ARNs with bearer-token auth, granting bedrock:GetInferenceProfile to the token avoids this round-trip.`,
                  {
                    level: "warn",
                  },
                );
                return "retry:thinking-type";
              }
            }
            let effortRetry = handleEffortUnsupported(error);
            if (effortRetry !== null) return effortRetry;
            let highlightsRetry = handleThinkingHighlights(error);
            if (highlightsRetry !== null) return highlightsRetry;
            let tokenCountRetry = recoverThinkingTokenCountBeta(error);
            if (tokenCountRetry !== null) return tokenCountRetry;
            let mentionedBetasRetry = recoverMentionedBetas(error) ?? recoverRejectedBetas(error);
            if (mentionedBetasRetry !== undefined) return mentionedBetasRetry;
            maybeRefuseToolSearch(error);
            let context1mRetry = probeContext1mBeta(error);
            if (context1mRetry !== null) return context1mRetry;
            let bindingRetry = recoverThinkingBinding(error);
            if (bindingRetry !== null) return bindingRetry;
            {
              let prefixLockRetry = recoverPrefixLock(error);
              if (prefixLockRetry !== undefined) {
                if (keptForeignSignatures && isInvalidThinkingSignatureError(error))
                  dropForeignThinkingKeep("rejected_healed");
                return prefixLockRetry;
              }
            }
            if (!options.resumeIncompleteThinking && isInvalidThinkingSignatureError(error)) {
              let signedCount = 0;
              let unsignedCount = 0;
              for (let message of messagesForAPI_2) {
                if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
                for (let block of message.message.content)
                  if (block.type === "redacted_thinking") signedCount++;
                  else if (block.type === "thinking")
                    if ("signature" in block && block.signature) signedCount++;
                    else unsignedCount++;
              }
              let strippedAll = stripAllThinking(messagesForAPI_2);
              if (strippedAll !== messagesForAPI_2) {
                messagesForAPI_2 = recoverMessages(strippedAll, "error_recovery");
                recordStripScope("all");
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
                  stripped_signed_count: signedCount,
                  stripped_unsigned_count: unsignedCount,
                });
                return "retry:thinking-signature-strip";
              }
            }
            if (keptForeignSignatures && isInvalidThinkingSignatureError(error))
              dropForeignThinkingKeep("rejected_surfaced");
            {
              let promptEndRetry = probePromptEndMark(error);
              if (promptEndRetry) return promptEndRetry;
            }
            {
              let toolChangeRetry = recoverToolChange(error);
              if (toolChangeRetry) return toolChangeRetry;
            }
            {
              let advisorRetry = handleAdvisorUnavailable(error);
              if (advisorRetry !== undefined) return advisorRetry;
            }
            {
              let hintRecovery = await contextHintController?.onRequestError(error, messagesForAPI_2);
              if (hintRecovery) {
                messagesForAPI_2 = recoverMessages(hintRecovery.messages, "microcompact");
                recordHintClears(hintRecovery.clearedIds, hintRecovery.clearedContent);
                return "retry:context-hint";
              }
            }
            return (
              recoverViaWireCache(error) ??
              recoverFromHintError(error) ??
              probeThinkingTokenCount(error, creditEchoedStream) ??
              handleFallbackRejection(error, "stream") ??
              probeClearAt(error) ??
              maybeRetryThreads(error) ??
              classifyHintRecovery(error) ??
              probeThinkingDisplay(error) ??
              recoverUnclaimedBeta(error) ??
              maybeRefuseToolSearchFinal(error)
            );
          },
        },
      );
      let next;
      do {
        next = await generator.next();
        yield* drainHintClears();
        if (!("controller" in next.value)) yield next.value;
      } while (!next.done);
      activeStream = next.value;
      notePerTurnEffortOk();
      noteLateToolsOk();
      noopAfterSend();
      noopAfterSuccess();
      settleHealsAtSuccess();
      settleTokenCountState();
      settleMidConvState();
      settlePromptEndMark();
      if (retryStatusShown) {
        retryStatusShown = false;
        options.onRetryStatus?.(null);
      }
      for (let [mediaKind, mediaMessage] of mediaStripErrors)
        yield createApiErrorMessage({
          ...buildMediaRemovedError(mediaKind, mediaMessage),
          error: "invalid_request",
          errorDetails: mediaMessage,
        });
      mediaStripErrors.clear();
      yield* yieldEffortNotice();
      yield* emptyStream();
      yield* orgEffortNotice();
      let chunkTimes = responseBody ? (responseBody._chunkTimes ?? undefined) : undefined;
      if (
        chunkTimes === undefined &&
        responseBody !== undefined &&
        getAPIProvider() === "bedrock" &&
        shouldUseBodyIdleWatchdog("bedrock")
      )
        logForDebugging(
          "wire-heartbeat: _chunkTimes absent on a Bedrock stream with the byte watchdog enabled \u2014 heartbeat side-channel unavailable for this stream (bedrock-sdk \u22650.32.0 eventstream\u2192SSE transcode drops it; also expected if the response was not vnd.amazon.eventstream, e.g. behind a header-rewriting proxy)",
        );
      let stallWindowStart = clock.monotonicNow();
      yieldedMessages.length = 0;
      ttftMs = 0;
      firstContentMs = undefined;
      streamEventCount = 0;
      partialMessage = undefined;
      blocks.length = 0;
      serverFallbackUsed = false;
      fallbackAnnounced = false;
      suppressedByFallback = false;
      blockMessages.clear();
      malformedBlocks.clear();
      fallbackBlockIndices.clear();
      pendingFallback = undefined;
      creditLogged = false;
      usage = EMPTY_USAGE;
      creditState = null;
      creditBytes = null;
      reason = null;
      complete = false;
      costState = "none";
      let refusalLogged = false;
      usageRecorded = false;
      advisorToolInFlight = false;
      let anyEventYielded = false;
      let anyBlockFinished = false;
      let anyOutputShown = false;
      let openBlockIndex = null;
      let weakSet = new WeakSet();
      let weakMap = new WeakMap();
      let envelopeOpen = false;
      let stopEventsPending = false;
      let openContentBlockIndex = null;
      let openBlockIsToolUse = false;
      let apiMessageId = null;
      let nextBlockIndex = 0;
      function* emitStopEvents({ responseUnfinished }) {
        if (!stopEventsPending) return;
        let closeIndex = openBlockIsToolUse ? null : openContentBlockIndex;
        stopEventsPending = false;
        openContentBlockIndex = null;
        openBlockIsToolUse = false;
        let apiMessageIdField =
          apiMessageId !== null
            ? {
                apiMessageId,
              }
            : undefined;
        if (closeIndex !== null)
          yield {
            type: "stream_event",
            event: {
              type: "content_block_stop",
              index: closeIndex,
            },
            ...apiMessageIdField,
          };
        yield {
          type: "stream_event",
          event: {
            type: "message_stop",
          },
          ...apiMessageIdField,
          ...(responseUnfinished && apiMessageId !== null && Number.isSafeInteger(nextBlockIndex)
            ? {
                abandonedBlocks: {
                  apiMessageId,
                  fromBlockIndex: nextBlockIndex,
                },
              }
            : undefined),
        };
      }
      let lastEventAt = null;
      let stallCount = 0;
      let stallTotalMs = 0;
      let msToFirstEvent = null;
      let firstEventType = null;
      let lastEventType = null;
      let completedBlockCount = 0;
      let wireInputDegraded = false;
      let CLAUDE_ENABLE_STREAM_WATCHDOG = env.CLAUDE_ENABLE_STREAM_WATCHDOG ?? true;
      let streamIdleTimeoutMs = getStreamIdleTimeoutMs();
      let warningThresholdMs_2 = streamIdleTimeoutMs / 2;
      let streamStallMarginMs = getStreamStallMarginMs();
      let byteIdleTimeoutForProvider = getByteIdleTimeoutForProvider(getAPIProvider());
      let min = Math.min(
        byteIdleTimeoutForProvider,
        CLAUDE_ENABLE_STREAM_WATCHDOG ? streamIdleTimeoutMs : 1 / 0,
      );
      let streamWatchdogEnabled = streamTimerSlackMs();
      let idleTimeoutBaseMs = byteWatchdogSlackMs(
        streamWatchdogEnabled,
        streamIdleTimeoutMs,
        byteIdleTimeoutForProvider,
        options.onRetryStatus !== undefined,
      );
      let min_2 = Math.min(MAX_STREAM_STALL_MS, min - streamStallMarginMs);
      let idleTimedOut = false;
      let suspendedError;
      let idleTimeoutAt = null;
      let streamWatchdogFiredAt = null;
      let streamIdleWarningTimer = null;
      let streamIdleTimer = null;
      let stallNotified = false;
      let lastWatchdogArmMonotonicMs = 0;
      let lastWatchdogArmWallMs = 0;
      armStreamWatchdogs();
      let partialOnAbortMessage = () => {
        if (options.querySource !== "sdk" && options.keepPartialMessageOnAbort !== true) return;
        if (suppressedByFallback) return;
        let partialBlock = blocks[yieldedMessages.length];
        if (
          partialBlock?.type !== "text" ||
          weakSet.has(partialBlock) ||
          !partialBlock.text.trim() ||
          !partialMessage
        )
          return;
        return {
          message: {
            ...partialMessage,
            content: normalizeContentFromAPI(
              [partialBlock],
              tools,
              options.agentId,
              {
                requestId: responseRequestId ?? undefined,
                messageId: partialMessage.id,
              },
              options.storageV5,
            ),
          },
          apiBlockIndex: yieldedMessages.length,
          requestId: responseRequestId ?? undefined,
          requestRef: healRequestId,
          requestedModel: options.model,
          promptCacheRequested,
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
          ...(sentEffort !== undefined && {
            effort: sentEffort,
          }),
          perTurnEffort: perTurnEffortValue,
          perTurnTiming: perTurnNowValue,
        };
      };
      let serverFallbackEvent = () => {
        if (pendingFallback === undefined || fallbackAnnounced) return;
        let pendingFallbackBlock = pendingFallback;
        pendingFallback = undefined;
        fallbackAnnounced = true;
        return {
          type: "server_fallback",
          fromModel: pendingFallbackBlock.fromModel,
          toModel: pendingFallbackBlock.model,
          reason: pendingFallbackBlock.reason,
          apiRefusalCategory: pendingFallbackBlock.category,
          midStream: false,
          requestId: responseRequestId ?? null,
          refusedEffort: refusedEffortInfo(),
          discardedMessages: [],
          retainedMessages: [],
          retainedText: "",
          finalStopReason: null,
        };
      };
      function* clearStreamIdleTimers() {
        logCreditOutcome("aborted", responseRequestId ?? null, null);
        let fallbackEvent = serverFallbackEvent();
        if (fallbackEvent) yield fallbackEvent;
        let partialMessageOnAbort = partialOnAbortMessage();
        if (partialMessageOnAbort) yield partialMessageOnAbort;
        if (advisorToolInFlight)
          logEvent("tengu_advisor_tool_interrupted", {
            model: telemetrySafeModelName(options.model),
            advisor_model: telemetrySafeModelName(advisorModelForQuery ?? "unknown"),
            query_source: agentTypeForTelemetry(options.querySource),
          });
      }
      let finishProfile;
      try {
        let isFirstEvent = true;
        let STALL_THRESHOLD_MS = 30000;
        let pingCount = 0;
        let events = isDirectFirstPartyApi() ? activeStream : fixGuardrailStrayText(activeStream, signal);
        let counter = {
          count: 0,
        };
        for await (let event of withStreamHeartbeat(
          chunkTimes !== undefined && isDeltaFoldEnabled()
            ? foldStreamDeltas(events, chunkTimes, counter, signal)
            : events,
          chunkTimes,
          STREAM_HEARTBEAT_MS,
          clock,
          streamWatchdogEnabled,
        )) {
          if (isPingStreamEvent(event)) {
            pingCount++;
            if (pingCount <= MAX_PING_EVENTS_RESETTING_IDLE) armStreamWatchdogs();
            else if (!CLAUDE_ENABLE_STREAM_WATCHDOG || idleTimedOut || suspendedError !== undefined) continue;
            yield {
              type: "stream_event",
              event,
            };
            continue;
          }
          pingCount = 0;
          armStreamWatchdogs();
          streamEventCount += 1 + counter.count;
          counter.count = 0;
          msToFirstEvent ??= Math.round(clock.monotonicNow() - attemptStartAt);
          firstEventType ??= event.type;
          lastEventType = event.type;
          let now = clock.now();
          if (lastEventAt !== null) {
            let gapMs = now - lastEventAt;
            if (gapMs > STALL_THRESHOLD_MS) {
              stallCount++;
              stallTotalMs += gapMs;
              logForDebugging(
                `Streaming stall detected: ${(gapMs / 1000).toFixed(1)}s gap between events (stall #${stallCount})`,
                {
                  level: "warn",
                },
              );
              logEvent("tengu_streaming_stall", {
                stall_duration_ms: gapMs,
                stall_count: stallCount,
                total_stall_time_ms: stallTotalMs,
                event_type: fromEnum(normalizeStreamEventType(event.type)),
                model: telemetrySafeModelName(options.model),
                request_id: traceValueOrUnknown(responseRequestId),
              });
            }
          }
          lastEventAt = now;
          if (isFirstEvent) {
            cancelFirstByteTimer();
            logForDebugging("Stream started - received first chunk");
            logForDebugging(
              `[API:timing] first byte after ${Math.round(clock.monotonicNow() - attemptStartAt)}ms`,
            );
            queryCheckpoint("query_first_chunk_received");
            if (!options.agentId && isMainThread) headlessProfilerCheckpoint("first_chunk");
            finishProfile = isTopLevelMain ? openProfileStream() : openProfileWindow("side_stream");
            requestedEffort?.();
            requestedEffort = undefined;
            endQueryProfile();
            isFirstEvent = false;
          }
          let block = parseFallbackBlockStart(event);
          let unreadableFallback = !block && isUnreadableFallbackBlock(event);
          if (block || unreadableFallback) advisorToolInFlight = false;
          if (block) {
            fallbackBlockIndices.add(block.index);
            blocks[block.index] = fallbackNotification(block);
            let fallbackMode = serverFallbackMode;
            logEvent("tengu_rotunda_pennant_materialized", {
              armed: options.serverRefusalFallback !== undefined,
              mode: fromEnum(fallbackMode),
              block_index: block.index,
              non_streaming: false,
            });
            if (block.reason === "refusal")
              logApiRefusal({
                model: resolvedModel,
                requestId: responseRequestId || undefined,
                querySource: options.querySource,
                effort: effortLevelNormalized,
                fastMode: fallbackActive,
                attempt: attemptNumber,
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
            if (isFallbackReason(block.reason)) serverFallbackUsed = true;
            if (partialMessage !== undefined)
              partialMessage = {
                ...partialMessage,
                model: block.model,
              };
            for (let message of blockMessages.values()) message.message.model = block.model;
            if (blockMessages.size === 0) pendingFallback = block;
            else if (!isFallbackReason(block.reason)) {
              fallbackAnnounced = true;
              yield {
                type: "server_fallback",
                fromModel: block.fromModel,
                toModel: block.model,
                reason: block.reason,
                apiRefusalCategory: block.category,
                midStream: true,
                requestId: responseRequestId ?? null,
                refusedEffort: refusedEffortInfo(),
                discardedMessages: [],
                retainedMessages: [],
                retainedText: "",
                finalStopReason: null,
              };
            } else {
              fallbackAnnounced = true;
              let discarded = [];
              for (let [index, blockMessage] of blockMessages)
                if (hasNonTextContent(blockMessage)) {
                  discarded.push(blockMessage);
                  blockMessages.delete(index);
                  delete blocks[index];
                }
              if (discarded.length > 0) {
                let discardedSet = new Set(discarded);
                for (let idx = yieldedMessages.length - 1; idx >= 0; idx--)
                  if (discardedSet.has(yieldedMessages[idx])) yieldedMessages.splice(idx, 1);
                suppressedByFallback = true;
              }
              let mapped = [...blockMessages.entries()]
                .sort((left, right) => left[0] - right[0])
                .map(([, message]) => message);
              let retainedText = mapped
                .map((message) =>
                  message.message.content.map((block) => (block.type === "text" ? block.text : "")).join(""),
                )
                .join("");
              yield {
                type: "server_fallback",
                fromModel: block.fromModel,
                toModel: block.model,
                reason: block.reason,
                apiRefusalCategory: block.category,
                midStream: true,
                requestId: responseRequestId ?? null,
                refusedEffort: refusedEffortInfo(),
                discardedMessages: discarded,
                retainedMessages: mapped,
                retainedText,
                finalStopReason: null,
              };
            }
            continue;
          }
          if (unreadableFallback) {
            let index = event.index;
            malformedBlocks.add(index);
            suppressedByFallback = true;
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
          if (event.type === "content_block_stop" && malformedBlocks.has(event.index)) continue;
          switch (event.type) {
            case "message_start": {
              assertStreamPart(
                typeof event.message === "object" && event.message !== null,
                event,
                lit_2("message_start_without_message"),
              );
              envelopeOpen = true;
              settleProbeState();
              healState();
              settleContext1mProbe();
              probeState();
              partialMessage = event.message;
              if (partialMessage !== undefined && "resumable" in partialMessage) {
                let { resumable, ...rest } = partialMessage;
                partialMessage = rest;
              }
              ttftMs = Math.max(0, Math.round(clock.monotonicNow() - attemptStartAt));
              usage = mergeUsageFromDelta(usage, event.message?.usage);
              if (event.message?.model)
                recordServedModel(stripAnyVersatileSuffix(options.model), event.message.model);
              cacheMissReason = event.message.diagnostics?.cache_miss_reason ?? undefined;
              checkTetherPrefix(event.message);
              let dropAttachment = thinkingDropAttachment(event.message);
              let stripAttachment = thinkingStripAttachment();
              if (stripAttachment) yield stripAttachment;
              let advisorStrippedMsg = advisorStrippedMessage();
              if (advisorStrippedMsg) yield advisorStrippedMsg;
              if (dropAttachment) yield dropAttachment;
              break;
            }
            case "content_block_start": {
              let hasContentBlock = typeof event.content_block === "object" && event.content_block !== null;
              if (!hasContentBlock) complete = false;
              assertStreamPart(hasContentBlock, event, lit_2("content_block_start_without_content_block"));
              if (
                isRestartedBlock({
                  previous: blocks[event.index],
                  closedContentBlocks: weakSet,
                  started: event.content_block,
                })
              ) {
                logEvent("tengu_streaming_error", {
                  error_type: lit_2("content_block_closed_start"),
                  part_type: fromEnum(event.type),
                  part_index: blockIndexOf(event),
                });
                throw new StreamMalformedEventError("closed");
              }
              switch (
                ((complete = false),
                (firstContentMs ??= Math.max(0, Math.round(clock.monotonicNow() - attemptStartAt))),
                event.content_block.type)
              ) {
                case "tool_use":
                  event.content_block.name = internalName(event.content_block.name);
                  blocks[event.index] = {
                    ...event.content_block,
                    input: "",
                  };
                  break;
                case "server_tool_use":
                  blocks[event.index] = {
                    ...event.content_block,
                    input: "",
                  };
                  if (event.content_block.name === ADVISOR_TOOL_NAME) {
                    advisorToolInFlight = true;
                    logForDebugging("[AdvisorTool] Advisor tool called");
                    logEvent("tengu_advisor_tool_call", {
                      model: telemetrySafeModelName(options.model),
                      advisor_model: telemetrySafeModelName(advisorModelForQuery ?? "unknown"),
                      query_source: agentTypeForTelemetry(options.querySource),
                    });
                  }
                  break;
                case "text":
                  blocks[event.index] = {
                    ...event.content_block,
                    text: "",
                  };
                  break;
                case "thinking": {
                  let thinkingBlock = {
                    ...event.content_block,
                    thinking: "",
                    signature: "",
                  };
                  blocks[event.index] = thinkingBlock;
                  recordMonotonicTime(weakMap, thinkingBlock, clock);
                  break;
                }
                default:
                  blocks[event.index] = {
                    ...event.content_block,
                  };
                  if (event.content_block.type === "advisor_tool_result") {
                    advisorToolInFlight = false;
                    logForDebugging("[AdvisorTool] Advisor tool result received");
                    let advisorToolError = parseAdvisorToolError(event.content_block);
                    if (advisorToolError !== undefined) {
                      logForDebugging(`[AdvisorTool] Advisor tool result error: ${advisorToolError}`);
                      logEvent("tengu_advisor_tool_error", {
                        model: telemetrySafeModelName(options.model),
                        advisor_model: telemetrySafeModelName(advisorModelForQuery ?? "unknown"),
                        error_code: fromEnum(advisorToolError),
                        query_source: agentTypeForTelemetry(options.querySource),
                      });
                    } else
                      logEvent("tengu_advisor_tool_result", {
                        model: telemetrySafeModelName(options.model),
                        advisor_model: telemetrySafeModelName(advisorModelForQuery ?? "unknown"),
                        query_source: agentTypeForTelemetry(options.querySource),
                        stop_reason: fromEnumOpt(parseAdvisorResult(event.content_block)) ?? lit_2("none"),
                      });
                  }
                  break;
              }
              openBlockIndex = event.index;
              if (
                event.content_block.type !== "thinking" &&
                event.content_block.type !== "redacted_thinking" &&
                !isFallbackMessage(event.content_block)
              )
                anyOutputShown = true;
              break;
            }
            case "content_block_delta": {
              let block = blocks[event.index];
              let delta = event.delta;
              if (!block || !weakSet.has(block)) complete = false;
              if (!block || weakSet.has(block)) {
                logEvent("tengu_streaming_error", {
                  error_type: block
                    ? lit_2("content_block_closed_delta")
                    : lit_2("content_block_not_found_delta"),
                  part_type: fromEnum(event.type),
                  part_index: blockIndexOf(event),
                });
                throw new StreamMalformedEventError(block ? "closed" : "unstarted");
              }
              switch (
                (assertStreamPart(
                  typeof delta === "object" && delta !== null,
                  event,
                  lit_2("content_block_delta_without_delta"),
                ),
                assertStreamPart(
                  typeof delta.type === "string",
                  event,
                  lit_2("content_block_delta_without_delta_type"),
                ),
                delta.type)
              ) {
                case "citations_delta":
                  if (block.type !== "text") break;
                  assertStreamPart(
                    typeof delta.citation === "object" && delta.citation !== null,
                    event,
                    lit_2("citations_delta_without_citation"),
                  );
                  block.citations = [...(block.citations ?? []), delta.citation];
                  break;
                case "input_json_delta":
                  if (block.type !== "tool_use" && block.type !== "server_tool_use") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_type_mismatch_input_json"),
                      expected_type: lit_2("tool_use"),
                      actual_type: fromEnum(block.type),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  if (typeof block.input !== "string") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_input_not_string"),
                      input_type: fromEnum(typeof block.input),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  assertStreamPart(
                    typeof delta.partial_json === "string",
                    event,
                    lit_2("input_json_delta_without_partial_json"),
                  );
                  block.input += delta.partial_json;
                  break;
                case "text_delta":
                  if (block.type !== "text") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_type_mismatch_text"),
                      expected_type: lit_2("text"),
                      actual_type: fromEnum(block.type),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  assertStreamPart(typeof delta.text === "string", event, lit_2("text_delta_without_text"));
                  block.text += delta.text;
                  break;
                case "signature_delta":
                  if (block.type !== "thinking") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_type_mismatch_thinking_signature"),
                      expected_type: lit_2("thinking"),
                      actual_type: fromEnum(block.type),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  assertStreamPart(
                    typeof delta.signature === "string",
                    event,
                    lit_2("signature_delta_without_signature"),
                  );
                  block.signature = delta.signature;
                  break;
                case "thinking_delta":
                  if (block.type === "redacted_thinking") break;
                  if (block.type !== "thinking") {
                    logEvent("tengu_streaming_error", {
                      error_type: lit_2("content_block_type_mismatch_thinking_delta"),
                      expected_type: lit_2("thinking"),
                      actual_type: fromEnum(block.type),
                    });
                    throw new StreamMalformedEventError("unreadable");
                  }
                  assertStreamPart(
                    typeof delta.thinking === "string",
                    event,
                    lit_2("thinking_delta_without_thinking"),
                  );
                  block.thinking += delta.thinking;
                  break;
              }
              break;
            }
            case "content_block_stop": {
              let block = blocks[event.index];
              if (!block || !weakSet.has(block)) complete = false;
              if (!block || weakSet.has(block)) {
                logEvent("tengu_streaming_error", {
                  error_type: block
                    ? lit_2("content_block_closed_stop")
                    : lit_2("content_block_not_found_stop"),
                  part_type: fromEnum(event.type),
                  part_index: blockIndexOf(event),
                });
                throw new StreamMalformedEventError(block ? "closed" : "unstarted");
              }
              openBlockIndex = null;
              if (!partialMessage) {
                logEvent("tengu_streaming_error", {
                  error_type: lit_2("partial_message_not_found"),
                  part_type: fromEnum(event.type),
                });
                throw Error("Message not found");
              }
              let { content, batchToolUses } = isBatchToolsUse(
                normalizeContentFromAPI(
                  [block],
                  tools,
                  options.agentId,
                  {
                    requestId: responseRequestId ?? undefined,
                    messageId: partialMessage.id,
                  },
                  options.storageV5,
                ),
                tools,
                (item, index) => normalizeToolInput_2(item, index, options.agentId, options.storageV5),
              );
              let wireInputs = wireInputsEchoed ? captureWireToolInputs([block]) : undefined;
              wireInputDegraded ||= wireInputs?.degraded === true;
              let inputs = wireInputs?.inputs;
              let ingestContext = wireIngestContextStamps([block], inputs);
              let thinkingDurationMs = elapsedSinceMs(weakMap, block, clock);
              let thinkingDisplay = THINKING_BARE_WIDTH(block, requestedDisplayField);
              let assistantMessage = {
                message: {
                  ...partialMessage,
                  content,
                },
                ...(thinkingDurationMs !== undefined && {
                  thinkingDurationMs,
                }),
                ...(thinkingDisplay !== undefined && {
                  thinkingDisplay,
                }),
                ...(batchToolUses.length > 0 && {
                  batchToolUses,
                }),
                ...(inputs !== undefined && {
                  wireToolInputs: inputs,
                }),
                ...(ingestContext !== undefined && {
                  wireIngestContext: ingestContext,
                }),
                ...(ingestContext !== undefined && {
                  wireIngestContext: ingestContext,
                }),
                ...(classifierSession !== undefined && classifierResultPayload(classifierSession)),
                apiBlockIndex: event.index,
                requestId: responseRequestId ?? undefined,
                requestRef: healRequestId,
                requestedModel: options.model,
                promptCacheRequested,
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
                ...(advisorModelForQuery && {
                  advisorModel: advisorModelForQuery,
                }),
                ...(sentEffort !== undefined && {
                  effort: sentEffort,
                }),
                perTurnEffort: perTurnEffortValue,
                perTurnTiming: perTurnNowValue,
                ...{},
              };
              noopNotice(conversation_2, assistantMessage);
              yieldedMessages.push(assistantMessage);
              completedBlockCount++;
              blockMessages.set(event.index, assistantMessage);
              nextBlockIndex = Math.max(
                nextBlockIndex,
                Number.isSafeInteger(event.index) && event.index >= 0 ? event.index + 1 : Number.NaN,
              );
              weakSet.add(block);
              if (assistantMessage.message.content.some((block) => !isFallbackMessage(block))) {
                anyBlockFinished = true;
                if (
                  assistantMessage.message.content.some(
                    (block) =>
                      block.type !== "thinking" &&
                      block.type !== "redacted_thinking" &&
                      !isFallbackMessage(block),
                  )
                )
                  anyOutputShown = true;
              }
              yield assistantMessage;
              break;
            }
            case "message_delta": {
              usage = mergeUsageFromDelta(usage, event.usage);
              creditState = event.context_management ?? creditState;
              assertStreamPart(
                typeof event.delta === "object" && event.delta !== null,
                event,
                lit_2("message_delta_without_delta"),
              );
              if (
                classifierSession !== undefined &&
                typeof event.delta === "object" &&
                event.delta !== null &&
                "safeguard_results" in event.delta
              )
                settleClassifier(classifierSession, event.delta, blocks);
              let iterations =
                options.serverRefusalFallback !== undefined ? parseUsageIterations(usage) : undefined;
              if (iterations?.servedFallbackModel !== undefined) {
                serverFallbackUsed = true;
                usage = addResponseUsageAttributes(usage, event.usage);
              }
              let fallbackCreditToken = readFallbackCreditToken(event.delta.stop_details);
              {
                let stopDetails = event.delta.stop_details;
                if (stopDetails && "fallback_credit_token" in stopDetails)
                  delete stopDetails.fallback_credit_token;
              }
              if (fallbackCreditToken !== undefined && !creditLogged) {
                creditLogged = true;
                logEvent("tengu_fallback_credit_minted", {
                  request_id: sanitizeMarkName(responseRequestId),
                  model: telemetrySafeModelName(options.model),
                  fallback_target_model: telemetrySafeModelName(
                    options.refusalFallbackModel ??
                      (options.serverRefusalFallback !== undefined && !serverFallbackUsed
                        ? options.serverRefusalFallback.model
                        : undefined),
                  ),
                  token_length: fallbackCreditToken.length,
                  input_tokens: usage.input_tokens,
                  output_tokens: usage.output_tokens,
                  cache_read_input_tokens: usage.cache_read_input_tokens,
                  cache_creation_input_tokens: usage.cache_creation_input_tokens,
                  cache_creation_5m_input_tokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
                  cache_creation_1h_input_tokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
                  service_tier: fromEnumOpt(usage.service_tier),
                  speed: fromEnumOpt(usage.speed),
                  query_source: agentTypeForTelemetry(options.querySource),
                  ...(options.queryTracking && {
                    query_chain_id: sanitizeMarkName(options.queryTracking.chainId),
                    query_depth: options.queryTracking.depth,
                  }),
                });
              }
              let stopReason = typeof event.delta.stop_reason === "string" ? event.delta.stop_reason : null;
              if (stopReason !== null) {
                reason = stopReason;
                complete = true;
              }
              let delta = event.delta;
              if (delta.diagnostics?.cache_miss_reason) cacheMissReason = delta.diagnostics.cache_miss_reason;
              let resumable = getResumableFlag(event.delta) ?? getResumableFlag(event);
              let contextManagementUpdate =
                contextManagementEligible && creditState
                  ? addClientEstimatedClearedTokens(
                      creditState,
                      toolResultClearingPlan?.edit,
                      sentMessages,
                      tetherDecision,
                      usage,
                    )
                  : null;
              creditBytes = contextManagementUpdate;
              for (let msg of yieldedMessages) {
                msg.message.usage = usage;
                msg.message.stop_reason = reason;
                if (stopReason !== null || reason === null)
                  msg.message.stop_details = event.delta.stop_details ?? null;
                if (contextManagementUpdate) msg.message.context_management = contextManagementUpdate;
                if (resumable !== undefined) msg.message.resumable = resumable;
              }
              if (reason !== null && costState !== "credited") {
                costState = "credited";
                let servedFallbackModel = iterations?.servedFallbackModel;
                let servedFallback = iterations !== undefined && servedFallbackModel !== undefined;
                let cost = servedFallback
                  ? fallbackMessagesCost(
                      iterations.entries,
                      {
                        speed: usage.speed,
                        inferenceGeo: usage.inference_geo,
                        serverToolUse: usage.server_tool_use,
                      },
                      reason,
                    )
                  : calculateUSDCost(resolvedModel, usage);
                let costModel = servedFallback
                  ? preferSameModel(options.serverRefusalFallback?.model, servedFallbackModel)
                  : options.model;
                costUSD += addToTotalSessionCost(
                  cost,
                  usage,
                  costModel,
                  options.querySource,
                  effortLevelNormalized,
                  options.spawnedBySkill,
                  options.activeSkill,
                  options.activeMcpServer,
                  options.activeMcpTool,
                );
              } else if (costState === "none") costState = "pending";
              if (stopReason === "refusal" && !refusalLogged) {
                refusalLogged = true;
                logApiRefusal({
                  model: resolvedModel,
                  requestId: responseRequestId || undefined,
                  querySource: options.querySource,
                  effort: effortLevelNormalized,
                  fastMode: fallbackActive,
                  attempt: attemptNumber,
                  attribution: buildAttribution(
                    options.querySource,
                    options.spawnedBySkill,
                    options.activeSkill,
                    options.activeMcpServer,
                    options.activeMcpTool,
                  ),
                  serverFallbackHop: false,
                  stopDetails: event.delta.stop_details ?? null,
                  agentContext: options.agentContext,
                });
              }
              if (options.serverRefusalFallback !== undefined) {
                let fallbackPending = pendingFallback;
                pendingFallback = undefined;
                if (fallbackPending !== undefined) {
                  if (!fallbackAnnounced) {
                    fallbackAnnounced = true;
                    yield {
                      type: "server_fallback",
                      fromModel: fallbackPending.fromModel,
                      toModel: fallbackPending.model,
                      reason: fallbackPending.reason,
                      apiRefusalCategory: fallbackPending.category,
                      midStream: false,
                      requestId: responseRequestId ?? null,
                      refusedEffort: refusedEffortInfo(),
                      discardedMessages: [],
                      retainedMessages: [],
                      retainedText: "",
                      finalStopReason: reason,
                    };
                  }
                } else if (!fallbackAnnounced && iterations?.servedFallbackModel !== undefined) {
                  fallbackAnnounced = true;
                  yield {
                    type: "server_fallback",
                    fromModel: options.model,
                    toModel: iterations.servedFallbackModel,
                    reason: "sticky",
                    apiRefusalCategory: null,
                    midStream: false,
                    requestId: responseRequestId ?? null,
                    refusedEffort: refusedEffortInfo(),
                    discardedMessages: [],
                    retainedMessages: [],
                    retainedText: "",
                    finalStopReason: reason,
                  };
                }
              }
              let armedFallback =
                options.refusalFallbackModel ??
                (options.serverRefusalFallback !== undefined && !serverFallbackUsed
                  ? options.serverRefusalFallback.model
                  : undefined);
              let silentLane = options.refusalFallbackModelLane === "silent";
              let refusalFallbackCascadeHop = options.refusalFallbackCascadeHop;
              let route =
                stopReason === "refusal" &&
                armedFallback !== undefined &&
                !silentLane &&
                refusalFallbackCascadeHop === undefined
                  ? resolveRefusalFallbackRoute({
                      originalModelCanonical: getCanonicalName(options.model),
                      armedFallbackModel: armedFallback,
                      apiRefusalCategory: event.delta.stop_details?.category ?? null,
                      armedTargetIsRefusingModel: isSameModel(options.model, armedFallback),
                      resolveTarget: (mappedTarget) =>
                        pickFallbackModel({
                          mappedTarget,
                          armedFallbackModel: armedFallback,
                          refusingModel: options.model,
                          triedModels: [canonicalModelKey(options.model)],
                        }),
                      routesOverride: noopDialogHost(),
                    })
                  : undefined;
              let fallbackModel = route !== undefined ? route.model : armedFallback;
              if (route !== undefined)
                logFallbackRouteOutcome({
                  route,
                  model: options.model,
                  armedFallbackModel: armedFallback,
                  apiRefusalCategory: event.delta.stop_details?.category,
                  requestId: responseRequestId,
                });
              let routeDeclinedBio =
                route?.matched === "none" &&
                event.delta.stop_details?.category === "bio" &&
                !hasRefusalFallbackOccurred();
              let silentRearm =
                stopReason === "refusal" && (armedFallback === undefined || routeDeclinedBio)
                  ? options.refusalFallbackSilentRearm?.(
                      routeDeclinedBio,
                      event.delta.stop_details?.category ?? null,
                      hasTenderQuiltHeader(responseBody?.headers),
                    )
                  : undefined;
              let fallbackModelChosen = fallbackModel ?? silentRearm;
              if (stopReason === "refusal" && fallbackModelChosen !== undefined) {
                recordMediaLimitSuccess();
                fallbackTriggered = true;
                let fallbackModel = cyberVerificationOf(event.delta.stop_details);
                yield {
                  type: "fallback_request",
                  trigger: "refusal",
                  originalModel: options.model,
                  fallbackModel: fallbackModelChosen,
                  requestId: responseRequestId ?? null,
                  refusedEffort: refusedEffortInfo(),
                  apiRefusalCategory: event.delta.stop_details?.category ?? null,
                  apiRefusalExplanation: event.delta.stop_details?.explanation ?? null,
                  ...(fallbackModel !== undefined && {
                    apiRefusalCyberVerification: fallbackModel,
                  }),
                  creditCode: fallbackCreditToken ?? null,
                  mintedStateless: !threadSliced,
                  ...(silentRearm !== undefined && {
                    silentArmAtTrigger: true,
                  }),
                  ...describeFallbackRoute(route, refusalFallbackCascadeHop),
                };
                return;
              }
              let refusalMessage = getRefusalMessage(
                stopReason,
                event.delta.stop_details,
                responseRequestId,
                serverFallbackUsed
                  ? (iterations?.servedFallbackModel ?? partialMessage?.model ?? options.model)
                  : options.model,
                partialMessage?.id,
              );
              if (refusalMessage) {
                let latchActive =
                  hasRefusalFallbackOccurred() || getRefusalFallbackModelLatch() !== undefined;
                if (
                  armedFallback !== undefined ||
                  options.refusalFallbackModel !== undefined ||
                  (hasRefusalFallbackTarget(options.model) && isRefusalFallbackEnabled()) ||
                  hasFallbackLatch() ||
                  latchActive
                )
                  logFeatureBad(
                    "refusal_fallback",
                    route?.matched === "none"
                      ? "route_declined"
                      : serverFallbackUsed
                        ? "server_chain_exhausted"
                        : latchActive
                          ? "client_chain_exhausted"
                          : hasRefusalFallbackTarget(options.model) && isSwitchModelsOnFlagDisabled()
                            ? "disabled_by_config"
                            : "not_armed",
                    {
                      convolute_arcades: hasConvoluteArcadesFlag(),
                      arm_source: fromEnum(getFallbackLatchKind()),
                      armed: armedFallback !== undefined,
                      model_scope: fromEnum(classifyFallbackOrigin(options.model)),
                    },
                  );
                yield {
                  type: "refusal_no_fallback",
                  originalModel: options.model,
                  requestId: responseRequestId ?? null,
                  apiRefusalCategory: event.delta.stop_details?.category ?? null,
                  apiRefusalExplanation: event.delta.stop_details?.explanation ?? null,
                };
                yield refusalMessage;
              }
              let maxTokensStopMessage = getMaxTokensStopMessage(
                stopReason,
                maxOutputTokens,
                usage.output_tokens,
              );
              if (maxTokensStopMessage !== undefined) yield maxTokensStopMessage;
              break;
            }
            case "message_stop":
              envelopeOpen = false;
              if (classifierSession !== undefined)
                noteClassifierUnsupported(settleServerNoResult(classifierSession));
              if (wireInputDegraded) logWireToolInputParseFailure();
              if (costState === "pending") creditCostOnce();
              logCreditOutcome("stream_completed", responseRequestId ?? null, usage);
              break;
          }
          if (event.type === "content_block_stop" && fallbackBlockIndices.has(event.index)) continue;
          anyEventYielded = true;
          let costUSDForPart = thinkingStartTime(event, requestedDisplayField);
          let apiMessageIdWanted = stopEventsPending || event.type === "message_start";
          if (event.type === "message_start") {
            stopEventsPending = true;
            openContentBlockIndex = null;
            openBlockIsToolUse = false;
            apiMessageId =
              typeof event.message.id === "string" && event.message.id !== "" ? event.message.id : null;
          } else if (event.type === "content_block_start") {
            openContentBlockIndex = event.index;
            openBlockIsToolUse = TOOL_USE_BLOCK_TYPES.has(event.content_block.type);
          } else if (event.type === "content_block_stop") {
            openContentBlockIndex = null;
            openBlockIsToolUse = false;
          } else if (event.type === "message_stop") {
            stopEventsPending = false;
            openContentBlockIndex = null;
            openBlockIsToolUse = false;
          }
          let streamEvent = {
            type: "stream_event",
            event,
            ...(event.type === "message_start"
              ? {
                  ttftMs,
                  ...(sentEffort !== undefined && {
                    sentEffort,
                  }),
                  ...(options.turnEffort !== undefined && {
                    turnEffort: options.turnEffort,
                  }),
                  ...(sentAtMonotonic
                    ? {
                        requestSentAtMs: sentAtMonotonic,
                      }
                    : undefined),
                  ...(sentAtWall
                    ? {
                        requestSentWallMs: sentAtWall,
                      }
                    : undefined),
                }
              : undefined),
            ...(costUSDForPart !== undefined
              ? {
                  thinkingDisplay: costUSDForPart,
                }
              : undefined),
            ...(apiMessageIdWanted && apiMessageId !== null
              ? {
                  apiMessageId,
                }
              : undefined),
          };
          if (
            emitPlainDelta === undefined ||
            !isTextOrJsonDeltaEvent(streamEvent) ||
            !emitPlainDelta(streamEvent, true)
          )
            yield streamEvent;
        }
        clearStreamTimers();
        finishProfile?.(streamEventCount, chunkTimes?.chunks);
        if (signal.aborted) {
          yield* clearStreamIdleTimers();
          return;
        }
        if (idleTimedOut) {
          let exitDelayMs = idleTimeoutAt !== null ? Math.round(clock.monotonicNow() - idleTimeoutAt) : -1;
          logForDiagnosticsNoPII("info", "cli_stream_loop_exited_after_watchdog_clean");
          logEvent("tengu_stream_loop_exited_after_watchdog", {
            request_id: traceValueOrUnknown(responseRequestId),
            exit_delay_ms: exitDelayMs,
            exit_path: lit_2("clean"),
            model: telemetrySafeModelName(options.model),
          });
          idleTimeoutAt = null;
          throw Error("Stream idle timeout - no chunks received");
        }
        if (suspendedError !== undefined) throw suspendedError;
        if (envelopeOpen && openBlockIndex !== null) {
          logForDebugging(
            `Stream ended cleanly inside open block ${openBlockIndex} (stop_reason=${reason}) \u2014 treating as a dropped connection`,
            {
              level: "error",
            },
          );
          throw new StreamTruncatedError();
        }
        if (!partialMessage || (yieldedMessages.length === 0 && !reason)) {
          logForDebugging(
            !partialMessage
              ? "Stream completed without receiving message_start event - triggering non-streaming fallback"
              : "Stream completed with message_start but no content blocks completed - triggering non-streaming fallback",
            {
              level: "error",
            },
          );
          logEvent("tengu_stream_no_events", {
            model: telemetrySafeModelName(options.model),
            request_id: traceValueOrUnknown(responseRequestId),
            ...responseDiagnosticFields(undefined, responseMeta),
            ms_since_request: Math.round(clock.monotonicNow() - attemptStartAt),
          });
          throw new StreamNoEventsError();
        }
        if (envelopeOpen && !(reason !== null && complete)) {
          logForDebugging(
            `Stream ended cleanly mid-response (stop_reason=${reason}, terminal=${complete}) \u2014 treating as a dropped connection`,
            {
              level: "error",
            },
          );
          throw new StreamTruncatedError();
        }
        try {
          let warningState = streamFallbackWarning();
          let textDeliveryBad = warningState.hasFired("stream_text_delivery_bad");
          let textDeliveryOk = warningState.hasFired("stream_text_delivery_ok");
          if (reason !== null && !suppressedByFallback && (!textDeliveryBad || !textDeliveryOk)) {
            if (!textDeliveryBad)
              for (let [index, block] of blocks.entries()) {
                if (!block || block.type !== "text") continue;
                if (
                  block.text.trim().length > 0 &&
                  !blockMessages.has(index) &&
                  !malformedBlocks.has(index)
                ) {
                  warningState.markFired("stream_text_delivery_bad");
                  logFeatureBad("api_stream_text_delivery", "text_block_unyielded", {
                    had_tool_use: blocks.some((block) => block?.type === "tool_use"),
                    dropped_block_index: index,
                  });
                  break;
                }
              }
            if (!textDeliveryOk) {
              let any = blocks.some(
                (block, index) =>
                  block?.type === "text" && block.text.trim().length > 0 && blockMessages.has(index),
              );
              let any_2 = blocks.some(
                (block, index) => block?.type === "tool_use" && blockMessages.has(index),
              );
              if (any && any_2) {
                warningState.markFired("stream_text_delivery_ok");
                logFeatureOk("api_stream_text_delivery");
              }
            }
          }
          if (reason !== null) noteCacheCoverageUsage(usage);
          noteCacheCoverageSustained(usage);
        } catch {}
        if (stallCount > 0) {
          logForDebugging(
            `Streaming completed with ${stallCount} stall(s), total stall time: ${(stallTotalMs / 1000).toFixed(1)}s`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_streaming_stall_summary", {
            stall_count: stallCount,
            total_stall_time_ms: stallTotalMs,
            model: telemetrySafeModelName(options.model),
            request_id: traceValueOrUnknown(responseRequestId),
          });
        }
        recordIdleClearingServerReport({
          returnAfterIdle: contextManagementEligible ? toolResultClearingPlan?.returnAfterIdle : undefined,
          contextManagement: creditBytes,
          usage,
          querySource: options.querySource,
          agentId: options.agentId,
        });
        checkResponseForCacheBreak(
          options.querySource,
          usage.cache_read_input_tokens,
          usage.cache_creation_input_tokens,
          messages,
          options.agentId,
          responseRequestId,
          lastAssistantId,
          isMainThread,
        );
        let response = responseBody;
        if (response) {
          recordLowPriorityServed(lowPriorityWait, headersReceivedAt);
          extractGraceStatusFromHeaders(
            response.headers,
            classifyQuerySource(options.querySource) !== "auxiliary" && !options.leavesLimitStateAlone,
            headersReceivedAt,
            limitsAccountEpoch,
          );
          let longContext =
            (has1mSuffix_2(options.model) || modelHasNative1MContext(options.model)) &&
            usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens >
              SECONDARY_CONTEXT_WINDOW;
          let longContextInUse = options.leavesLimitStateAlone
            ? null
            : extractQuotaStatusFromHeaders(
                response.headers,
                options.model,
                longContext,
                headersReceivedAt,
                limitsAccountEpoch,
                options.storageV5,
              );
          if (longContextInUse && options.queryTracking) {
            options.queryTracking.answeredQuerySource = options.querySource;
            options.queryTracking.billedToUsageCredits = longContextInUse.overageInUse === true;
            options.queryTracking.longContextBilled = longContext;
          }
          refetchStaleClientData(response.headers, options, fallbackActive);
          responseHeaders = response.headers;
        }
      } catch (streamingError) {
        let streamError =
          suspendedError !== undefined &&
          !idleTimedOut &&
          !signal.aborted &&
          streamingError instanceof APIUserAbortError
            ? suspendedError
            : streamingError;
        clearStreamTimers();
        if (isTopLevelMain && !signal.aborted) requestedEffort ??= openFirstEventWait(false);
        finishProfile?.(streamEventCount, chunkTimes?.chunks);
        cancelFirstByteTimer();
        {
          let fallbackEvent = serverFallbackEvent();
          if (fallbackEvent) yield fallbackEvent;
        }
        if (!idleTimedOut && streamError instanceof StreamIdleTimeoutError) {
          idleTimedOut = true;
          idleTimeoutAt = clock.monotonicNow();
          logForDebugging(`Streaming idle timeout (byte-level): ${streamError.message}, aborting stream`, {
            level: "error",
          });
          logForDiagnosticsNoPII("error", "cli_streaming_idle_timeout");
          logEvent("tengu_streaming_idle_timeout", {
            model: telemetrySafeModelName(options.model),
            request_id: traceValueOrUnknown(responseRequestId),
            timeout_ms: streamError.idleMs,
            tier: lit_2("byte"),
            bytes_received_before_stall: streamError.bytesReceived,
            time_to_first_byte_ms: streamError.ttfbMs,
            body_read_pending: streamError.bodyReadPending,
            slept_ms: streamError.sleptMs,
            cf_ray: sanitizeMarkName(streamError.cfRay),
          });
        }
        if (idleTimedOut && idleTimeoutAt !== null) {
          let exitDelayMs = Math.round(clock.monotonicNow() - idleTimeoutAt);
          logForDiagnosticsNoPII("info", "cli_stream_loop_exited_after_watchdog_error");
          logEvent("tengu_stream_loop_exited_after_watchdog", {
            request_id: traceValueOrUnknown(responseRequestId),
            exit_delay_ms: exitDelayMs,
            exit_path: lit_2("error"),
            error_name:
              streamError instanceof Error
                ? (sanitizedErrorNameForTelemetry(streamError) ?? lit_2("Error"))
                : lit_2("unknown"),
            model: telemetrySafeModelName(options.model),
          });
        }
        let stallInfo = {
          events_received: streamEventCount,
          ms_to_first_event: msToFirstEvent,
          ms_since_last_event: lastEventAt === null ? null : clock.now() - lastEventAt,
        };
        let logStreamFailure = (fallbackCause, failureError) =>
          logForDiagnosticsNoPII("warn", "cli_stream_failed", () => ({
            ...classifyApiErrorKind(failureError, classifyAPIError(failureError), responseMeta),
            fallback_cause: fallbackCause,
            watchdog_fired: idleTimedOut,
            slept_ms:
              streamError instanceof StreamIdleTimeoutError || streamError instanceof StreamSuspendedError
                ? streamError.sleptMs
                : null,
            client_request_id: sanitizeMarkName(clientRequestId) ?? null,
            model: telemetrySafeModelName(options.model) ?? null,
            stream: {
              ...stallInfo,
              first_event_type: firstEventType === null ? null : normalizeStreamEventType(firstEventType),
              last_event_type: lastEventType === null ? null : normalizeStreamEventType(lastEventType),
              message_envelope_open: envelopeOpen,
              stop_reason_received: reason !== null,
              content_blocks_completed: completedBlockCount,
              any_event_yielded: anyEventYielded,
              ms_since_request: Math.round(clock.monotonicNow() - attemptStartAt),
              ms_to_headers: responseMeta?.latencyMs ?? null,
              stalls_over_30s: stallCount,
              stall_ms_total: stallTotalMs,
            },
            route: connectionSetupFacts(),
          }));
        if (streamError instanceof APIUserAbortError) {
          if (signal.aborted) {
            yield* clearStreamIdleTimers();
            logForDebugging(`Streaming aborted by user: ${errorMessage(streamError)}`);
            throw streamError;
          } else if (!idleTimedOut) {
            logForDebugging(`Streaming timeout (SDK abort): ${streamError.message}`, {
              level: "error",
            });
            let timeoutError = new APIConnectionTimeoutError({
              message: "Request timed out",
            });
            logStreamFailure("sdk_timeout", timeoutError);
            throw timeoutError;
          }
        }
        let connectionErrorDetails = extractConnectionErrorDetails(streamError);
        let isStaleConnection =
          connectionErrorDetails !== null && TRANSIENT_SOCKET_CODES.has(connectionErrorDetails.code);
        let connectionBroken =
          connectionErrorDetails !== null &&
          (isStaleConnection || UNREACHABLE_ERROR_CODES.has(connectionErrorDetails.code));
        let isContextHintSse = contextHintController?.classifyStreamError(streamError) ?? false;
        let malformed =
          streamError instanceof StreamMalformedEventError || streamError instanceof SyntaxError;
        let unstartedBlock =
          streamError instanceof StreamMalformedEventError && streamError.blockState === "unstarted";
        let malformedReason = unstartedBlock
          ? "event referenced an unstarted content block"
          : streamError instanceof StreamMalformedEventError && streamError.blockState === "closed"
            ? "event referenced an already-closed content block"
            : "event could not be read";
        let fallbackCause = classifyStreamError({
          connDetails: connectionErrorDetails,
          isStaleConnection,
          isContextHintSse,
          streamIdleAborted: idleTimedOut,
          noEvents: streamError instanceof StreamNoEventsError,
          malformedStream: streamError instanceof StreamMalformedEventError,
        });
        let errorName = sanitizedErrorNameForTelemetry(streamError) ?? null;
        let connectionCode = sanitizedConnectionCodeForTelemetry(connectionErrorDetails?.code) ?? null;
        let errorName_2 =
          streamError instanceof Error ? (errorName ?? lit_2("none")) : fromEnum(typeof streamError);
        let errorConstructor =
          streamError instanceof Error
            ? (sanitizedClassNameForTelemetry(streamError.constructor?.name) ?? lit_2("none"))
            : lit_2("none");
        let errorCode = connectionCode ?? lit_2("none");
        let fallbackDisabled =
          ((getFeatureValue_CACHED_MAY_BE_STALE("tengu_watchdog_skip_nonstreaming_fallback", false) ||
            env.CLAUDE_CODE_REMOTE) &&
            idleTimedOut) ||
          env.CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK ||
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_disable_streaming_to_non_streaming_fallback", false);
        if (idleTimedOut)
          idleTimeoutError = Error(
            yieldedMessages.length > 0
              ? "Stream idle timeout - partial response received"
              : "Stream idle timeout - no chunks received",
          );
        let effectiveError = idleTimedOut ? idleTimeoutError : streamError;
        let error =
          effectiveError instanceof Error
            ? (sanitizedErrorNameForTelemetry(effectiveError) ?? lit_2("Error"))
            : fromEnum(typeof effectiveError);
        logStreamFailure(
          fallbackCause,
          streamError instanceof APIUserAbortError ? effectiveError : streamError,
        );
        if (isToolUseBlockCutOffError(streamError)) {
          for (let yieldedMessage of yieldedMessages) {
            yieldedMessage.message.usage = usage;
            yieldedMessage.message.stop_reason = "max_tokens";
          }
          tetherDelta?.noteClientTruncated(yieldedMessages[0]?.message.id);
          if (envelopeOpen) creditCostOnce();
          yield* emitStopEvents({
            responseUnfinished: true,
          });
          throw streamError;
        }
        let isServerError =
          is529Error(streamError) ||
          isNon529ServerError(streamError) ||
          (streamError instanceof APIError &&
            (streamError.type === "api_error" || streamError.type === "timeout_error"));
        let terminalKind;
        if (isDlpRequestDenied(streamError)) terminalKind = "dlpDenied";
        else if (alwaysFalseErrors(streamError)) terminalKind = "escapeMonitor";
        let outputFiltered = isRequestTooLargeError_2(streamError);
        let dispatchRecovery =
          sentDispatch !== null && !dispatchEscalated && connectionErrorDetails !== null && !anyEventYielded;
        let failure = classifyStreamFailure({
          error: streamError,
          isServerError,
          stalled: idleTimedOut,
          isConnectionError: connectionBroken || dispatchRecovery,
          suspended: isStreamSuspendedError(streamError),
          truncated: connectionErrorDetails?.code === "StreamTruncated",
          malformed,
          denied: terminalKind !== undefined,
          outputFiltered,
          anyEvent: anyEventYielded,
          anyBlockFinished,
          anyOutputShown,
          stopReasonReceived: reason !== null,
          outlastedNonStreamingTimeout:
            clock.monotonicNow() - attemptStartAt >= getNonStreamingRequestTimeoutMs(),
          complete: reason !== null && complete && openBlockIndex === null,
        });
        let decision =
          failure === undefined ? "keepPartial" : retryBudget.onStreamFailed(failure, !fallbackDisabled);
        let retryCounts = retryBudget.counts();
        let thinkingOnlyOverloaded =
          failure?.progress === "thinkingOnly" &&
          failure.cause === "overloaded" &&
          !failure.stopReasonReceived;
        if (
          decision === "useFallbackModel" &&
          (failure?.cause === "serverError" || failure?.cause === "timedOut") &&
          options.fallbackModel
        ) {
          if (!anyOutputShown) markAbandonedThinking(yieldedMessages, resolvedModel);
          if (envelopeOpen) {
            creditCostOnce();
            recordUsageOnce();
          }
          logEvent("tengu_api_model_not_found_fallback_triggered", {
            original_model: telemetrySafeModelName(options.model),
            fallback_model: telemetrySafeModelName(options.fallbackModel),
            provider: getAPIProviderForAnalytics(),
            reason: failure.cause === "timedOut" ? lit_2("timed_out") : lit_2("server_error"),
            source: lit_2("mid_stream"),
          });
          throw new FallbackTriggeredError(options.model, options.fallbackModel, "server_error", streamError);
        }
        if (
          failure === undefined ||
          failure.progress === "output" ||
          (failure.progress === "thinkingOnly" && !thinkingOnlyOverloaded)
        ) {
          let serverErrorWithOutput = isServerError && anyOutputShown;
          let serverErrorRetry = isServerError && decision === "retry";
          if (decision !== "fail") {
            releaseStreamResources();
            let wasWatchdog = idleTimedOut;
            let wasIdleTimedOut = hasToolUse(yieldedMessages);
            if (decision === "retry") {
              if (!anyOutputShown) markAbandonedThinking(yieldedMessages, resolvedModel);
              if (wasWatchdog) {
                logForDebugging(
                  `Stream idle timeout after thinking-only yield \u2014 retrying streaming (${retryCounts.stalls}/${RETRY_POLICY_CONST_1})`,
                  {
                    level: "warn",
                  },
                );
                logEvent("tengu_streaming_watchdog_retry", {
                  model: telemetrySafeModelName(options.model),
                  retry_attempt: retryCounts.stalls,
                  request_id: sanitizeMarkName(responseRequestId),
                  after_thinking_only: true,
                });
              } else {
                logForDebugging(
                  `Stream ${malformed ? malformedReason : serverErrorRetry ? "server error" : `connection closed (${connectionErrorDetails?.code})`} after thinking-only yield \u2014 retrying streaming (${retryCounts.afterThinkingOnly}/${failure?.cause === "timedOut" ? RETRY_POLICY_CONST_HYN : MAX_OUTPUT_FILTERED_RETRIES})`,
                  {
                    level: "warn",
                  },
                );
                logEvent("tengu_streaming_stale_connection_retry", {
                  model: telemetrySafeModelName(options.model),
                  error_code: malformed
                    ? lit_2("malformed_stream")
                    : serverErrorRetry
                      ? failure?.cause === "timedOut"
                        ? lit_2("timed_out")
                        : lit_2("server_error")
                      : reducibleErrorCode(connectionErrorDetails?.code ?? ""),
                  retry_attempt: retryCounts.afterThinkingOnly,
                  request_id: sanitizeMarkName(responseRequestId),
                  after_thinking_only: true,
                });
              }
              logCreditOutcome("attempt_errored", responseRequestId ?? null, null);
              creditCostOnce();
              recordUsageOnce();
              yield* emitStopEvents({
                responseUnfinished: true,
              });
              responseRequestId = null;
              if (serverErrorRetry)
                await sleep(
                  getRetryDelay(retryCounts.afterThinkingOnly, undefined, undefined, options.random),
                  signal,
                  {
                    clock,
                  },
                );
              else if (!wasWatchdog)
                await sleep(100 * retryCounts.afterThinkingOnly, signal, {
                  clock,
                });
              continue e;
            }
            let hasStopReason = reason !== null;
            let suspended = connectionErrorDetails?.code === "StreamSuspended";
            let computerSlept = suspended && !isDisklessProcess();
            let cutCause = wasWatchdog
              ? "watchdog"
              : serverErrorWithOutput
                ? streamError instanceof APIError && streamError.type === "timeout_error"
                  ? "timed_out"
                  : "server_error"
                : malformed
                  ? "malformed_stream"
                  : suspended
                    ? "stream_suspended"
                    : connectionErrorDetails?.code === "StreamTruncated"
                      ? "stream_truncated"
                      : connectionErrorDetails !== null &&
                          UNREACHABLE_ERROR_CODES.has(connectionErrorDetails.code)
                        ? "network_down"
                        : "stale_connection";
            let cause = fromEnum(cutCause);
            if (hasStopReason && complete && openBlockIndex === null) {
              logForDebugging(
                `Stream ${wasWatchdog ? "stalled" : `connection closed (${connectionErrorDetails?.code ?? "unknown"})`} after message_delta (stop_reason=${reason}) \u2014 response already complete, no truncation`,
                {
                  level: "info",
                },
              );
              logEvent("tengu_streaming_close_after_complete", {
                model: telemetrySafeModelName(options.model),
                blocks_yielded: yieldedMessages.length,
                cause,
                error_code: connectionErrorDetails
                  ? reducibleErrorCode(connectionErrorDetails.code)
                  : lit_2("none"),
                request_id: sanitizeMarkName(responseRequestId),
              });
              logCreditOutcome("stream_completed", responseRequestId ?? null, usage);
              yield* emitStopEvents({
                responseUnfinished: false,
              });
              break e;
            }
            let synthesizedStopReason = wasIdleTimedOut ? "tool_use" : "end_turn";
            reason = synthesizedStopReason;
            for (let message of yieldedMessages) {
              message.message.usage = usage;
              message.message.stop_reason = synthesizedStopReason;
            }
            tetherDelta?.noteClientTruncated(yieldedMessages[0]?.message.id);
            logForDebugging(
              wasWatchdog
                ? `Stream idle timeout after ${yieldedMessages.length} block(s) yielded \u2014 finalizing partial response`
                : serverErrorWithOutput
                  ? `Mid-stream server error after ${yieldedMessages.length} block(s) yielded \u2014 finalizing partial response`
                  : malformed
                    ? `Stream ${malformedReason} after ${yieldedMessages.length} block(s) yielded \u2014 finalizing partial response`
                    : `Stream connection closed (${connectionErrorDetails?.code}) after ${yieldedMessages.length} block(s) yielded \u2014 finalizing partial response`,
              {
                level: "warn",
              },
            );
            logEvent("tengu_streaming_partial_finalized", {
              model: telemetrySafeModelName(options.model),
              blocks_yielded: yieldedMessages.length,
              has_output: anyOutputShown,
              synthesized_stop_reason: fromEnum(synthesizedStopReason),
              cause,
              request_id: sanitizeMarkName(responseRequestId),
            });
            creditCostOnce();
            yield* emitStopEvents({
              responseUnfinished: true,
            });
            let apiErrorMessage = createApiErrorMessage({
              content: anyOutputShown
                ? wasWatchdog
                  ? `${API_ERROR_MESSAGE_PREFIX}: The response stopped arriving. The response above may be incomplete.`
                  : serverErrorWithOutput
                    ? `${API_ERROR_MESSAGE_PREFIX}: Server error mid-response. The response above may be incomplete.`
                    : malformed
                      ? unstartedBlock
                        ? `${API_ERROR_MESSAGE_PREFIX}: Part of the response never arrived. The response above may be incomplete.`
                        : `${API_ERROR_MESSAGE_PREFIX}: The response stream was malformed. The response above may be incomplete.`
                      : computerSlept
                        ? `${API_ERROR_MESSAGE_PREFIX}: Your computer went to sleep mid-response. The response above may be incomplete.`
                        : `${API_ERROR_MESSAGE_PREFIX}: Connection lost mid-response. The response above may be incomplete.`
                : wasWatchdog
                  ? `${API_ERROR_MESSAGE_PREFIX}: The response stalled before a response was produced. Try again.`
                  : malformed
                    ? unstartedBlock
                      ? `${API_ERROR_MESSAGE_PREFIX}: Part of the response never arrived and no response was produced. Try again.`
                      : `${API_ERROR_MESSAGE_PREFIX}: The response stream was malformed and no response was produced. Try again.`
                    : computerSlept
                      ? `${API_ERROR_MESSAGE_PREFIX}: Your computer went to sleep before a response was produced. Try again.`
                      : `${API_ERROR_MESSAGE_PREFIX}: Connection lost before a response was produced. Try again.`,
              error: "server_error",
              apiError: signal.aborted
                ? undefined
                : wasWatchdog
                  ? "stream_idle_timeout"
                  : computerSlept
                    ? "computer_slept"
                    : isConnectionError(streamError)
                      ? "connection_failed"
                      : undefined,
              truncatedAfterOutput: anyOutputShown && !wasIdleTimedOut ? true : undefined,
            });
            apiErrorMessage.streamCutCause = cutCause;
            if (wasWatchdog && !anyOutputShown) apiErrorMessage.streamWatchdogGaveUp = true;
            yield apiErrorMessage;
            break e;
          }
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error,
            attemptNumber,
            maxOutputTokens,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: fallbackDisabled,
            request_id: traceValueOrUnknown(responseRequestId),
            fallback_cause: lit_2("partial_yield"),
            any_stream_event_yielded: anyEventYielded,
            has_output: anyOutputShown,
            died_of: fromEnum(failure?.cause ?? "complete"),
          });
          throw effectiveError;
        }
        if (failure?.cause === "outputFiltered") {
          if (envelopeOpen) creditCostOnce();
          if (decision === "retry") {
            logForDebugging(
              `Output content filter stopped the response before any of the answer was shown: retrying streaming (${retryCounts.outputFiltered}/${RETRY_POLICY_CONST_JEE})`,
              {
                level: "warn",
              },
            );
            logEvent("tengu_streaming_output_filter_retry", {
              model: telemetrySafeModelName(options.model),
              retry_attempt: retryCounts.outputFiltered,
              request_id: traceValueOrUnknown(responseRequestId),
              first_stop_progress: fromEnum(failure.progress),
            });
            attemptOutcome = {
              firstStopProgress: failure.progress,
              msToFirstStop: Math.round(clock.monotonicNow() - attemptStartAt),
              startedAt: clock.monotonicNow(),
              ended: undefined,
            };
            releaseStreamResources();
            logCreditOutcome("attempt_errored", responseRequestId ?? null, null);
            if (envelopeOpen) recordUsageOnce();
            yield* emitStopEvents({
              responseUnfinished: true,
            });
            responseRequestId = null;
            continue e;
          }
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error: lit_2("output_content_filtered"),
            attemptNumber,
            maxOutputTokens,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: true,
            request_id: traceValueOrUnknown(responseRequestId),
            fallback_cause: lit_2("output_content_filtered"),
            any_stream_event_yielded: anyEventYielded,
          });
          throw streamError;
        }
        if (dispatchRecovery) {
          dispatchEscalated = true;
          logForDebugging(
            `[dispatch] Stream connection error (${connectionErrorDetails.code}) with ${ANTHROPIC_DISPATCH_ID}=${sentDispatch} before first event; ${decision === "retry" ? "retrying once" : "going on"} with ${ANTHROPIC_DISPATCH_ID}=${V2P}`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_dispatch_header_fallback", {
            model: telemetrySafeModelName(options.model),
            dispatch: sentDispatch ?? undefined,
            resend_dispatch: fromEnum(V2P),
            reason: lit_2("body_phase"),
            status: lit_2("none"),
            error_code: reducibleErrorCode(connectionErrorDetails.code),
            query_source: agentTypeForTelemetry(options.querySource),
            request_id: sanitizeMarkName(responseRequestId),
          });
          if (decision === "retry") {
            releaseStreamResources();
            logCreditOutcome("attempt_errored", responseRequestId ?? null, null);
            responseRequestId = null;
            continue e;
          }
        }
        let retryPlan =
          connectionBroken && connectionErrorDetails !== null
            ? {
                label: `connection error (${connectionErrorDetails.code})`,
                errorCode: reducibleErrorCode(connectionErrorDetails.code),
                error: new APIConnectionError({
                  cause: streamError instanceof Error ? streamError : undefined,
                }),
                attempt: Math.max(1, retryCounts.retries),
                limit: maxRetriesFromEnv,
              }
            : failure?.cause === "serverError" && streamError instanceof APIError
              ? {
                  label: "server error",
                  errorCode: lit_2("server_error"),
                  error: streamError,
                  attempt: retryCounts.afterThinkingOnly,
                  limit: MAX_OUTPUT_FILTERED_RETRIES,
                }
              : undefined;
        if (decision === "retry" && retryPlan !== undefined) {
          let attempt = retryPlan.attempt;
          logForDebugging(
            `Stream ${retryPlan.label} \u2014 retrying streaming (${attempt}/${retryPlan.limit})`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_streaming_stale_connection_retry", {
            model: telemetrySafeModelName(options.model),
            error_code: retryPlan.errorCode,
            retry_attempt: attempt,
            request_id: traceValueOrUnknown(responseRequestId),
          });
          releaseStreamResources();
          logCreditOutcome("attempt_errored", responseRequestId ?? null, null);
          if (envelopeOpen) recordUsageOnce();
          if (envelopeOpen && costState !== "credited") {
            creditCostOnce();
            yield* emitStopEvents({
              responseUnfinished: true,
            });
          }
          responseRequestId = null;
          let retryDelay = getRetryDelay(attempt, undefined, undefined, options.random);
          let errorSummary = {
            ...summarizeApiError(retryPlan.error),
            rateLimits: null,
          };
          retryStatusShown = true;
          options.onRetryStatus?.({
            kind: "retrying",
            error: errorSummary,
            attempt,
            maxRetries: retryPlan.limit,
            retryInMs: retryDelay,
            deadline: clock.now() + retryDelay,
          });
          yield createSystemAPIErrorMessage(
            errorSummary,
            retryDelay,
            attempt,
            retryPlan.limit,
            "connection_retry",
          );
          await sleep(retryDelay, signal, {
            clock,
          });
          continue e;
        }
        if (connectionBroken && reason === null && envelopeOpen) creditCostOnce();
        if (idleTimedOut && decision === "retry") {
          logForDebugging(
            `Stream idle timeout before first event \u2014 retrying streaming (${retryCounts.stalls}/${RETRY_POLICY_CONST_1})`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_streaming_watchdog_retry", {
            model: telemetrySafeModelName(options.model),
            retry_attempt: retryCounts.stalls,
            request_id: traceValueOrUnknown(responseRequestId),
          });
          releaseStreamResources();
          logCreditOutcome("attempt_errored", responseRequestId ?? null, null);
          responseRequestId = null;
          continue e;
        }
        if (
          !anyOutputShown &&
          reason === null &&
          !retryBudget.outOfApiAttempts() &&
          handleUnprocessableMedia(streamError) !== undefined
        ) {
          retryBudget.undoLastCount();
          if (envelopeOpen) {
            creditCostOnce();
            recordUsageOnce();
          }
          releaseStreamResources();
          logCreditOutcome("attempt_errored", responseRequestId ?? null, null);
          yield* emitStopEvents({
            responseUnfinished: true,
          });
          responseRequestId = null;
          continue e;
        }
        if (terminalKind === "dlpDenied") {
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error: lit_2(DLP_REQUEST_DENIED),
            attemptNumber,
            maxOutputTokens,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: true,
            request_id: traceValueOrUnknown(responseRequestId),
            fallback_cause: lit_2(DLP_REQUEST_DENIED),
            any_stream_event_yielded: anyEventYielded,
          });
          throw streamError;
        }
        if (terminalKind === "escapeMonitor") {
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error: lit_2(SAFETY_MONITOR_BLOCKED),
            attemptNumber,
            maxOutputTokens,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: true,
            request_id: traceValueOrUnknown(responseRequestId),
            fallback_cause: lit_2(SAFETY_MONITOR_BLOCKED),
            any_stream_event_yielded: anyEventYielded,
          });
          throw streamError;
        }
        if (streamError instanceof APIError && is529Error(streamError)) {
          let lowPriorityPlan = anyOutputShown
            ? null
            : planLowPriorityRetry(streamError, {
                markedAtDispatch: isLowPriority,
                querySource: options.querySource,
                wait: lowPriorityWait,
              });
          let plan = retryBudget.outOfApiAttempts() ? null : lowPriorityPlan;
          if (!anyOutputShown) {
            if (envelopeOpen) {
              creditCostOnce();
              recordUsageOnce();
            }
            let overloaded = retryCounts.overloaded;
            if (plan !== null || decision === "retry") {
              markAbandonedThinking(yieldedMessages, resolvedModel);
              logForDebugging(
                plan !== null
                  ? `Mid-stream 529 before content at lower priority \u2014 waiting ${plan.delayMs}ms for capacity (attempt ${plan.attempt})`
                  : `Mid-stream 529 before content \u2014 retrying streaming (${overloaded}/${MAX_529_RETRIES})`,
                {
                  level: "warn",
                },
              );
              if (plan !== null) retryBudget.undoLastCount();
              logEvent("tengu_streaming_529_retry", {
                model: telemetrySafeModelName(options.model),
                retry_attempt: plan !== null ? plan.attempt : overloaded,
                request_id: sanitizeMarkName(responseRequestId),
                ...(plan !== null && {
                  is_low_priority: true,
                }),
              });
              releaseStreamResources();
              logCreditOutcome("attempt_errored", responseRequestId ?? null, null);
              yield* emitStopEvents({
                responseUnfinished: true,
              });
              responseRequestId = null;
              retryStatusShown = true;
              let retryDelay =
                plan?.delayMs ?? getRetryDelay(overloaded, undefined, undefined, options.random);
              options.onRetryStatus?.(
                plan !== null
                  ? {
                      kind: "low_priority_waiting",
                      attempt: plan.attempt,
                      retryInMs: retryDelay,
                      deadline: clock.now() + retryDelay,
                    }
                  : {
                      kind: "retrying",
                      error: {
                        ...summarizeApiError(streamError),
                        rateLimits: null,
                      },
                      attempt: overloaded,
                      maxRetries: MAX_529_RETRIES - 1,
                      retryInMs: retryDelay,
                      deadline: clock.now() + retryDelay,
                    },
              );
              await sleep(retryDelay, signal, {
                clock,
              });
              continue e;
            }
            if (options.fallbackModel && decision === "useFallbackModel") {
              markAbandonedThinking(yieldedMessages, resolvedModel);
              logEvent("tengu_api_opus_fallback_triggered", {
                original_model: telemetrySafeModelName(options.model),
                fallback_model: telemetrySafeModelName(options.fallbackModel),
                provider: getAPIProviderForAnalytics(),
                source: lit_2("mid_stream"),
              });
              logFeatureSad("api_request", "api_request_fallback_triggered");
              throw new FallbackTriggeredError(
                options.model,
                options.fallbackModel,
                "overloaded",
                streamError,
              );
            }
          }
        }
        if (decision === "fail") {
          logForDebugging(
            `Error streaming (non-streaming fallback disabled): ${errorMessage(effectiveError)}`,
            {
              level: "error",
            },
          );
          logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error,
            attemptNumber,
            maxOutputTokens,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: true,
            request_id: traceValueOrUnknown(responseRequestId),
            fallback_cause: fromEnum(fallbackCause),
            error_name: errorName_2,
            error_constructor: errorConstructor,
            error_code: errorCode,
            any_stream_event_yielded: anyEventYielded,
          });
          nonStreamingFallbackSkipped = true;
          watchdogGaveUp = idleTimedOut;
          throw effectiveError;
        }
        if (!anyOutputShown) markAbandonedThinking(yieldedMessages, resolvedModel);
        logForDebugging(
          `Error streaming, falling back to non-streaming mode: ${errorMessage(effectiveError)}`,
          {
            level: "error",
          },
        );
        fellBackToNonStreaming = true;
        if (profileHandle) noteRedrive("non_streaming");
        if (partialMessage !== undefined) recordUsageOnce();
        dispatchedAt = clock.now();
        {
          let hintResult = await contextHintController?.onStreamFallback(
            messagesForAPI_2,
            responseRequestId ?? undefined,
          );
          if (hintResult) {
            messagesForAPI_2 = recoverMessages(hintResult.messages, "microcompact");
            recordHintClears(hintResult.clearedIds, hintResult.clearedContent);
          }
        }
        logEvent("tengu_streaming_fallback_to_non_streaming", {
          model: telemetrySafeModelName(options.model),
          error,
          attemptNumber,
          maxOutputTokens,
          thinkingType: fromEnum(betas.type),
          fallback_disabled: false,
          request_id: traceValueOrUnknown(responseRequestId),
          fallback_cause: fromEnum(fallbackCause),
          error_name: errorName_2,
          error_constructor: errorConstructor,
          error_code: errorCode,
          any_stream_event_yielded: anyEventYielded,
        });
        logForDiagnosticsNoPII("info", "cli_nonstreaming_fallback_started");
        logEvent("tengu_nonstreaming_fallback_started", {
          request_id: traceValueOrUnknown(responseRequestId),
          model: telemetrySafeModelName(options.model),
          fallback_cause: fromEnum(fallbackCause),
        });
        logCreditOutcome("attempt_errored", responseRequestId ?? null, null);
        firstAttemptRequestId = responseRequestId;
        responseRequestId = null;
        yield* emitStopEvents({
          responseUnfinished: true,
        });
        yield* drainHintClears();
        yield {
          type: "streaming_fallback_began",
          cause: fallbackCause,
        };
        if (
          yield* runNonStreamingFallback(
            {
              requestId: requestIdFromHeaders(firstAttemptRequestId),
              analyticsRequestId: traceValueOrUnknown(firstAttemptRequestId),
              cause: fallbackCause,
              errorName,
              connectionCode,
              stall: stallInfo,
            },
            isServerError && (failure?.outlastedNonStreamingTimeout ?? false),
          )
        )
          return;
      } finally {
        clearStreamTimers();
        finishProfile?.(streamEventCount, chunkTimes?.chunks);
        if (classifierSession !== undefined) settleServerStreamEnded(classifierSession);
      }
      logCreditOutcome("stream_completed", responseRequestId ?? null, reason !== null ? usage : null);
      yield* emitStopEvents({
        responseUnfinished: false,
      });
      break e;
    }
    tetherDelta?.settle(
      {
        kind: "ok",
      },
      responseRequestId,
      partialMessage?.id,
    );
    if (attemptOutcome !== undefined) attemptOutcome.ended = "completed";
  } catch (fallbackError) {
    logApiQueryOnError();
    yield* drainHintClears();
    logCreditOutcome(signal.aborted ? "aborted" : "attempt_errored", responseRequestId ?? null, null);
    if (fallbackError instanceof FallbackTriggeredError) {
      retryBudget.reportHttpFailure(fallbackError.originalError, "useFallbackModel", {
        fallbackModelCouldHelp: fallbackError.reason !== "overloaded",
      });
      tetherDelta?.settle(
        {
          kind: "error",
          error: fallbackError,
        },
        responseRequestId,
      );
      fallbackTriggered = true;
      throw fallbackError;
    }
    let originalError = fallbackError instanceof CannotRetryError ? fallbackError.originalError : undefined;
    let retryWithoutStreaming =
      (originalError === undefined ? "fail" : retryBudget.onWithRetryGaveUp(originalError)) ===
      "retryWithoutStreaming";
    let failure = fallbackError;
    let fallbackSucceeded = false;
    if (retryWithoutStreaming) {
      let requestId = (originalError instanceof APIError ? originalError.requestID : undefined) ?? "unknown";
      logForDebugging("Streaming endpoint returned 404, falling back to non-streaming mode", {
        level: "warn",
      });
      fellBackToNonStreaming = true;
      dispatchedAt = clock.now();
      contextHintController?.strip();
      logEvent("tengu_streaming_fallback_to_non_streaming", {
        model: telemetrySafeModelName(options.model),
        error: lit_2("404_stream_creation"),
        attemptNumber,
        maxOutputTokens,
        thinkingType: fromEnum(betas.type),
        request_id: traceValueOrUnknown(requestId),
        fallback_cause: lit_2("404_stream_creation"),
        any_stream_event_yielded: false,
      });
      logForDiagnosticsNoPII("info", "cli_nonstreaming_fallback_started");
      logEvent("tengu_nonstreaming_fallback_started", {
        request_id: sanitizeMarkName(requestId),
        model: telemetrySafeModelName(options.model),
        fallback_cause: lit_2("404_stream_creation"),
      });
      if (profileHandle) noteRedrive("non_streaming");
      yield {
        type: "streaming_fallback_began",
        cause: "404_stream_creation",
      };
      try {
        firstAttemptRequestId = responseRequestId ?? (requestId !== "unknown" ? requestId : null);
        if (
          yield* runNonStreamingFallback(
            {
              requestId: requestIdFromHeaders(requestId),
              analyticsRequestId: traceValueOrUnknown(requestId),
              cause: "404_stream_creation",
              errorName: null,
              connectionCode: null,
              stall: null,
            },
            false,
          )
        )
          return;
        fallbackSucceeded = true;
        if (attemptOutcome !== undefined) attemptOutcome.ended = "completed";
      } catch (error) {
        if (error instanceof FallbackTriggeredError) {
          tetherDelta?.settle(
            {
              kind: "error",
              error,
            },
            responseRequestId,
          );
          fallbackTriggered = true;
          throw error;
        }
        failure = error;
      }
    }
    if (!fallbackSucceeded) {
      if (
        wasUndecided &&
        (failure instanceof ToolSearchRefusedError || options.toolSearchRefusal !== undefined)
      )
        resetDeclaredTools(conversation_2);
      if (failure instanceof ToolSearchRefusedError) {
        deferredSchemasSent?.splice(0, deferredSchemasSent.length);
        throw failure;
      }
      logForDebugging(
        `${retryWithoutStreaming ? "Non-streaming fallback also failed" : "Error in API request"}: ${errorMessage(failure)}`,
        {
          level: "error",
        },
      );
      let surfaceError = failure;
      let errorModel = options.model;
      if (failure instanceof CannotRetryError) {
        surfaceError = failure.originalError;
        errorModel = failure.retryContext.model;
      }
      if (surfaceError instanceof APIUserAbortError) {
        tetherDelta?.settle(
          {
            kind: "aborted",
          },
          retryWithoutStreaming ? null : responseRequestId,
          retryWithoutStreaming ? undefined : partialMessage?.id,
        );
        releaseStreamResources();
        return;
      }
      if (attemptOutcome !== undefined && isRequestTooLargeError_2(surfaceError))
        attemptOutcome.ended = "filtered_again";
      if (surfaceError instanceof APIError && !options.leavesLimitStateAlone)
        extractQuotaStatusFromError(
          surfaceError,
          getRequestRouteKind(options),
          clock.now(),
          limitsAccountEpoch,
          options.storageV5,
        );
      let requestId =
        responseRequestId ||
        (surfaceError instanceof APIError
          ? amazonRequestId(surfaceError.requestID || surfaceError.error?.request_id, surfaceError.headers)
          : undefined);
      tetherDelta?.settle(
        {
          kind: "error",
          error: surfaceError,
        },
        requestId,
      );
      logAPIError({
        isLowPriority,
        dispatch: sentDispatch,
        error: surfaceError,
        model: errorModel,
        messageCount: messagesForAPI_2.length,
        messageTokens: tokenCountFromLastAPIResponse(messagesForAPI_2),
        durationMs: Math.max(0, Math.round(clock.monotonicNow() - attemptStartAt)),
        durationMsIncludingRetries: Math.max(0, Math.round(clock.monotonicNow() - requestStartAt)),
        attempt: attemptNumber,
        requestId,
        clientRequestId,
        didFallBackToNonStreaming: fellBackToNonStreaming,
        nonStreamingFallbackSkipped,
        observedResponse: fellBackToNonStreaming ? undefined : responseMeta,
        queryTracking: options.queryTracking,
        querySource: options.querySource,
        accountMemoryKeys,
        messageClientPlatform: options.messageClientPlatform,
        llmSpan: llmRequestSpan,
        fastMode: fallbackActive,
        previousRequestId: previousRequestId_2,
        effort: effortLevelNormalized,
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
      let assistantMessageFromApiError = getAssistantMessageFromApiError(surfaceError, errorModel, {
        messages,
        messagesForAPI: messagesForAPI_2,
        requestId,
      });
      let assistantMessage = {
        ...assistantMessageFromApiError,
        ...(signal.aborted &&
          (assistantMessageFromApiError.apiError === "connection_failed" ||
            assistantMessageFromApiError.apiError === "computer_slept") && {
            apiError: undefined,
          }),
        ...(idleTimeoutError !== undefined &&
          surfaceError === idleTimeoutError &&
          !signal.aborted && {
            apiError: "stream_idle_timeout",
          }),
        perTurnEffort: perTurnEffortValue,
        perTurnTiming: perTurnNowValue,
        ...(watchdogGaveUp && {
          streamWatchdogGaveUp: true,
        }),
        ...failedResponseStamp(yieldedMessages, signal.aborted),
        ...((isNonFallbackError(surfaceError) ||
          alwaysFalseErrors(surfaceError) ||
          isVerificationRequiredError(surfaceError) ||
          (surfaceError instanceof APIError && surfaceError.type === "billing_error")) && {
          resendCannotCure: true,
        }),
      };
      if (isRegimeRefusal(surfaceError) && !retryBudget.outOfApiAttempts()) return assistantMessage;
      yield assistantMessage;
      releaseStreamResources();
      return;
    }
  } finally {
    if (isMainThread) onMainResponseEnd(requestId, complete, Date.now());
    try {
      if (classifierSession !== undefined) settleServerStreamEnded(classifierSession);
    } catch (error) {
      logError(toError(error));
    }
    requestedEffort?.();
    endActivity("api_call", backgroundAgentId);
    noteMidConvGuessWrong();
    flushMessageOutlines(options.querySource, options.agentId);
    if (retryStatusShown) options.onRetryStatus?.(null);
    if (attemptOutcome !== undefined)
      classifyAttemptOutcome(attemptOutcome, {
        now: clock.monotonicNow(),
        stopReason: nonStreamingAssistant?.message.stop_reason ?? reason,
        aborted: signal.aborted,
        model: options.model,
        querySource: options.querySource,
        clientRequestId: fellBackToNonStreaming ? undefined : clientRequestId,
      });
    logCreditOutcome(signal.aborted ? "aborted" : "attempt_errored", responseRequestId ?? null, null);
    tetherDelta?.settle(
      reason !== null && responseRequestId
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
      responseRequestId,
      partialMessage?.id,
    );
    releaseStreamResources();
    if (nonStreamingAssistant) {
      let fallbackUsage = nonStreamingAssistant.message.usage;
      usage = mergeUsageFromDelta(EMPTY_USAGE, fallbackUsage);
      reason = nonStreamingAssistant.message.stop_reason;
      if (reason === "refusal")
        logApiRefusal({
          model: resolvedModel,
          requestId: responseRequestId || undefined,
          querySource: options.querySource,
          effort: effortLevelNormalized,
          fastMode: fallbackActive,
          attempt: attemptNumber,
          attribution: buildAttribution(
            options.querySource,
            options.spawnedBySkill,
            options.activeSkill,
            options.activeMcpServer,
            options.activeMcpTool,
          ),
          serverFallbackHop: false,
          stopDetails: nonStreamingAssistant.message.stop_details ?? null,
          agentContext: options.agentContext,
        });
      let servedFallbackModel = iterations?.servedFallbackModel;
      let servedFallback = servedFallbackModel !== undefined;
      if (!serverFallbackUsed)
        recordServedModel(stripAnyVersatileSuffix(options.model), nonStreamingAssistant.message.model);
      let cost =
        servedFallback && iterations !== undefined
          ? fallbackMessagesCost(
              iterations.entries,
              {
                speed: usage.speed,
                inferenceGeo: usage.inference_geo,
                serverToolUse: usage.server_tool_use,
              },
              reason,
            )
          : calculateUSDCost(resolvedModel, usage);
      costUSD += addToTotalSessionCost(
        cost,
        usage,
        servedFallback
          ? preferSameModel(options.serverRefusalFallback?.model, servedFallbackModel)
          : options.model,
        options.querySource,
        effortLevelNormalized,
        options.spawnedBySkill,
        options.activeSkill,
        options.activeMcpServer,
        options.activeMcpTool,
      );
    }
    if (partialMessage !== undefined || nonStreamingAssistant !== undefined) {
      recordUsageOnce();
      if (isMainThread && !fallbackTriggered) forgetResponseBeforeCompaction();
    }
  }
  if (responseRequestId && isMainThread)
    setLastMainRequestId(responseRequestId, {
      messageId: yieldedMessages.at(-1)?.message.id ?? partialMessage?.id,
      turnPosition,
    });
  if (isMainThread) setLastMainThreadContextTokens(totalTokensOf(usage));
  if (recordsConversationSize)
    recordConversationSize(agentId, () => {
      let estimate = lazyTokenEstimate();
      let usageTotal = totalTokensOf(usage);
      return Number.isFinite(estimate)
        ? Math.max(estimate + usage.output_tokens, usageTotal)
        : usageTotal || estimate;
    });
  noopRecordRequest(conversation_2, {
    isMainConversation: isMainThread,
  });
  recordMediaLimitSuccess();
  if (mediaTakenOut !== undefined) recordUnsentMedia(options.agentId, mediaTakenOut);
  wireCache.served();
  if (cacheDiagnosisOn() && cacheMissReason)
    logCacheDiagnosisReceived(cacheMissReason, {
      requestId: responseRequestId,
      previousMessageId: lastAssistantId,
      model: options.model,
      is1hCacheTTL: messagesTtl === "1h",
      querySource: options.querySource,
      queryDepth: options.queryTracking?.depth,
    });
  let logMessageCount = messagesForAPI_2.length;
  let logMessageTokens = tokenCountFromLastAPIResponse(messagesForAPI_2);
  let requestContentTelemetry = isFirstPartyTelemetryBlocked()
    ? undefined
    : safeRequestContentStats(messagesForAPI_2, options.model);
  let imageTelemetry = isFirstPartyTelemetryBlocked()
    ? undefined
    : sentImageStats(messagesForAPI_2, threadSliceFrom);
  let prefixStats = isFirstPartyTelemetryBlocked()
    ? undefined
    : requestPrefixStats(systemBlocks, tools_2, getToolNameKinds(tools, deferralPlaceholderSchema));
  let carriedEffortEnded = isMainThread ? takeRefusalFallbackCarriedEffortEnd() : undefined;
  options
    .getToolPermissionContext()
    .then((permissionContext) => {
      logAPISuccessAndDuration({
        isLowPriority,
        dispatch: sentDispatch,
        uncoveredTail: uncoveredTailReport,
        model: yieldedMessages[0]?.message.model ?? partialMessage?.model ?? options.model,
        preNormalizedModel: options.model,
        usage,
        start: attemptStartAt,
        startIncludingRetries: requestStartAt,
        attempt: attemptNumber,
        messageCount: logMessageCount,
        messageTokens: logMessageTokens,
        requestId: responseRequestId ?? null,
        rawRequestBodyId: healOutcome,
        accountMemoryKeys,
        clientRequestId: fellBackToNonStreaming ? undefined : clientRequestId,
        firstAttemptRequestId: firstAttemptRequestId ?? null,
        stopReason: reason,
        ttftMs,
        firstContentMs: fellBackToNonStreaming ? null : (firstContentMs ?? null),
        streamEventCount: fellBackToNonStreaming ? undefined : streamEventCount,
        queryOverheadMs,
        didFallBackToNonStreaming: fellBackToNonStreaming,
        querySource: options.querySource,
        promptCacheTtl: enablePromptCaching ? cacheTtlChoice : undefined,
        promptCacheMessagesTtl:
          enablePromptCaching && !options.skipMessageCacheMarkers && ttlOverridden ? "5m" : undefined,
        messageClientPlatform: options.messageClientPlatform,
        headers: responseHeaders,
        extraEventFields: {
          ...{},
          ...emptyObject(conversation_2),
        },
        costUSD,
        isDefaultModel: isMainThread ? options.isDefaultModel : undefined,
        defaultModel: isMainThread ? options.defaultModel : undefined,
        ...defaultEffortFields(sentEffort),
        carriedEffort: carriedEffortReport,
        carriedEffortEnded,
        queryTracking: options.queryTracking,
        permissionMode: permissionContext.mode,
        proactivityLevel: options.proactivityLevel,
        newMessages: yieldedMessages,
        requestContentTelemetry,
        sentBody: imageTelemetry && {
          ...imageTelemetry,
          threadType,
        },
        requestPrefixTelemetry: prefixStats && {
          ...prefixStats,
          systemPromptSource: fromEnumOpt(options.systemPromptSource),
          snapshotHash: options.systemPromptSnapshotHash,
        },
        llmSpan: llmRequestSpan,
        globalCacheStrategy,
        requestSetupMs: attemptStartAt - requestStartAt,
        attemptStartTimes,
        fastMode: fallbackActive,
        previousRequestId: previousRequestId_2,
        betas: sentBetaHeaders,
        thinkingPrefixMismatchBehavior: prefixMismatchBehavior,
        echoWireToolInputs,
        effort: sentEffort,
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
//@ chunk-5xgkngpb.js:2867697-2867791 fingerprint (2.1.88 match: cleanupStream, 1)
/**
 * 中止尚未结束的 SDK 流（释放连接）。
 */
function cleanupStream(stream) {
  if (!stream) return;
  try {
    if (!stream.controller.signal.aborted) stream.controller.abort();
  } catch {}
}
//@ chunk-5xgkngpb.js:2870854-2870867 affinity
var PROXY_STRIPPED_INPUT_TOKEN_THRESHOLD = 1024;
//@ chunk-5xgkngpb.js:2870867-2872888 callgraph-fingerprint (2.1.88 match: addCacheBreakpoints, 0.234)
/**
 * 给 API 消息加 cache_control 断点：kun() 选出标记位置（最后一条消息、fork 点、api_system 等），记 tengu_api_cache_breakpoints，再把内部消息转成 MessageParam（user/assistant/api_system）。
 */
function addCacheBreakpoints(
  messages,
  enablePromptCaching,
  querySource,
  skipCacheWrite = false,
  forkPointUuid,
  midConvCacheDemoted = false,
  provider = getAPIProvider(),
  threadActive = false,
  topLevelCacheControl = false,
  clearAtNextUser = false,
  wireIndexOf,
  divergesAtMessageId,
  tailAuditSink,
  extractMemoriesSkipCacheWrite = false,
  logCacheBreakpoints = true,
  parentReplyMarkPlan,
) {
  let experimentalBetasDisabled = areExperimentalBetasDisabled();
  let CLAUDE_CODE_SIMULATE_PROXY_USAGE = env.CLAUDE_CODE_SIMULATE_PROXY_USAGE;
  let canMarkApiSystem =
    !midConvCacheDemoted && !experimentalBetasDisabled && !CLAUDE_CODE_SIMULATE_PROXY_USAGE;
  let whitespaceUnstampable = isStellarDriftEnabled();
  let basaltSpurEnabled = !threadActive && isBasaltSpurEnabled();
  let markerPlan = pickCacheMarkerIndices({
    messages,
    enablePromptCaching,
    skipCacheWrite,
    forkPointUuid,
    canMarkApiSystem,
    forkCachePin: basaltSpurEnabled || (extractMemoriesSkipCacheWrite && !threadActive),
    whitespaceTextUnstampable: whitespaceUnstampable,
    topLevelCacheControl,
    isForkPinStepBackEnabled: () => basaltSpurEnabled && isBasaltScarpEnabled(),
    divergesAtMessageId: threadActive ? undefined : divergesAtMessageId,
    parentReplyId:
      parentReplyMarkPlan?.isMarkWanted === true && !threadActive
        ? parentReplyMarkPlan.parentReplyId
        : undefined,
    tailAuditTerms: {
      proxyDemoted: midConvCacheDemoted,
      experimentalBetasDisabled,
      simulateProxyUsage: CLAUDE_CODE_SIMULATE_PROXY_USAGE,
      skipMessageCacheMarkers: tailAuditSink?.skipMessageCacheMarkers ?? false,
    },
  });
  let { markerIndices, forkPointPinned, parentPromptEndMarked, auditTail } = markerPlan;
  if (tailAuditSink !== undefined)
    try {
      tailAuditSink.report(auditTail());
    } catch (error) {
      logError(error);
    }
  if (logCacheBreakpoints)
    logEvent("tengu_api_cache_breakpoints", {
      totalMessageCount: messages.length,
      cachingEnabled: enablePromptCaching,
      skipCacheWrite,
      forkPointPinned,
      markerCount: markerIndices.size,
      ...(parentReplyMarkPlan !== undefined &&
        !threadActive && {
          querySource: agentTypeForTelemetry(parentReplyMarkPlan.querySource),
          ...(parentReplyMarkPlan.isMarkWanted && {
            parentPromptEndMarked,
          }),
        }),
    });
  let liftResult;
  try {
    liftResult = liftEphemeralReminders(messages, clearAtNextUser);
  } catch (error) {
    logError(error);
  }
  let messages_2 = (liftResult?.messages ?? messages).map((message, messageIndex) => {
    let addCache = markerIndices.has(messageIndex);
    if (message.type === "user")
      return userMessageToMessageParam(message, addCache, enablePromptCaching, querySource);
    if (message.type === "api_system") {
      let markCacheControl = addCache && enablePromptCaching && canMarkApiSystem;
      let markerIndex = message.ephemeralSuffix
        ? [
            {
              type: "text",
              text: message.ephemeralSuffix,
            },
          ]
        : [];
      if (
        (message.toolAdditions && message.toolAdditions.length > 0) ||
        (message.toolRemovals && message.toolRemovals.length > 0)
      )
        return {
          role: "system",
          content: [
            ...buildToolRemovalBlocks(
              message.message.content,
              message.toolAdditions ?? [],
              markCacheControl
                ? getCacheControl({
                    ttl: querySource,
                  })
                : undefined,
              message.toolRemovals ?? [],
              message.toolDefinitions,
            ),
            ...markerIndex,
          ],
          ...(message.outputConfig && {
            output_config: message.outputConfig,
          }),
        };
      let joinedText = joinParts(message.message.content, message.ephemeralSuffix ?? "");
      return {
        role: "system",
        content: markCacheControl
          ? [
              {
                type: "text",
                text: message.message.content,
                cache_control: getCacheControl({
                  ttl: querySource,
                }),
              },
              ...markerIndex,
            ]
          : joinedText || [],
        ...(message.outputConfig && {
          output_config: message.outputConfig,
        }),
      };
    }
    return assistantMessageToMessageParam(
      message,
      addCache,
      enablePromptCaching,
      querySource,
      whitespaceUnstampable,
    );
  });
  if (liftResult !== undefined)
    try {
      let wireWithClearAt = buildWireWithClearAt(messages_2, liftResult);
      wireIndexOf?.push(...wireWithClearAt.wireIndexOf);
      return wireWithClearAt.wire;
    } catch (error) {
      logError(error);
      let dropBase = liftResult.dropBase;
      let keptParams = [];
      messages_2.forEach((msg, index) => {
        wireIndexOf?.push(keptParams.length);
        if (!dropBase.has(index)) keptParams.push(msg);
      });
      wireIndexOf?.push(keptParams.length);
      return keptParams;
    }
  wireIndexOf?.push(...messages_2.keys(), messages_2.length);
  return messages_2;
}
//@ chunk-5xgkngpb.js:2873131-2873377 fingerprint (2.1.88 match: buildSystemPromptBlocks, 0.618)
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
//@ chunk-5xgkngpb.js:2873377-2873819 layout
/**
 * 小模型查询：按小模型 fallback 链依次尝试，只在 permission_denied 时换下一个。
 */
async function queryHaikuWithFallback(options) {
  let smallModel = unlessManagedDeniedModel(getSmallFastModel());
  let chain =
    options.options.fallbackModel === undefined &&
    !sessionHasOwnFallback() &&
    env.ANTHROPIC_SMALL_FAST_MODEL === undefined &&
    !(nonEmptyOrUndefined(env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION) && hasDedicatedSmallFastModel())
      ? buildAvailabilityFallbackChain(smallModel, undefined)
      : [];
  let limit = 1;
  while (
    limit < chain.length &&
    resolveFallbackModel(chain[limit - 1], chain[limit], isRefusedOrSentModel).accessFallbackModel !==
      undefined
  )
    limit++;
  let models = chain.length > 0 ? chain.slice(0, limit) : [smallModel];
  for (let idx = 0; ; idx++)
    try {
      return await queryWithModel(options, models[idx], models[idx + 1]);
    } catch (error) {
      if (
        !(error instanceof FallbackTriggeredError) ||
        error.reason !== "permission_denied" ||
        idx + 1 >= models.length
      )
        throw error;
    }
}
//@ chunk-5xgkngpb.js:2873819-2874410 callgraph-witnessed (2.1.88 match: queryWithModel, 0.749)
/**
 * 单轮无工具辅助查询（指定模型、可带 fallback）：用 VCR 包装，thinking 机械关闭，默认不开缓存。
 */
async function queryWithModel(
  {
    systemPrompt = asSystemPrompt([]),
    userPrompt,
    outputFormat,
    signal,
    options: { helperEffortFor, ...baseOptions },
  },
  model,
  fallbackModel,
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
              ...baseOptions,
              ...helperEffortFor?.(model),
              stickyBetas: baseOptions.stickyBetas ?? forkStickyBetaLatches(getStickyBetas()),
              agentContext: baseOptions.agentContext,
              model,
              fallbackModel: fallbackModel ?? baseOptions.fallbackModel,
              enablePromptCaching: baseOptions.enablePromptCaching ?? false,
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
//@ chunk-5xgkngpb.js:2874410-2874942 fingerprint (2.1.88 match: queryHaiku, 0.838)
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
//@ chunk-5xgkngpb.js:2874942-2875694 layout
/**
 * stop_reason 为 max_tokens / model_context_window_exceeded 时生成 API 错误消息（提示 CLAUDE_CODE_MAX_OUTPUT_TOKENS）。
 */
function getMaxTokensStopMessage(stopReason, maxTokens, outputTokens, withoutStreaming = false) {
  if (stopReason === "max_tokens") {
    logEvent("tengu_max_tokens_reached", {
      max_tokens: maxTokens,
    });
    return createApiErrorMessage({
      content: withoutStreaming
        ? `${API_ERROR_MESSAGE_PREFIX}: Claude's response exceeded the ${maxTokens} output token maximum for a request sent without streaming. The CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable cannot raise this limit.`
        : `${API_ERROR_MESSAGE_PREFIX}: Claude's response exceeded the ${maxTokens} output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable.`,
      apiError: "max_output_tokens",
      error: "max_output_tokens",
    });
  }
  if (stopReason === "model_context_window_exceeded") {
    logEvent("tengu_context_window_exceeded", {
      max_tokens: maxTokens,
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
//@ chunk-5xgkngpb.js:2875694-2875916 fingerprint (2.1.88 match: adjustParamsForNonStreaming, 1)
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
//@ chunk-5xgkngpb.js:2875916-2876005 layout
/**
 * 消息上布尔 resumable 字段（未完成思考可续写）。
 */
function getResumableFlag(message) {
  return "resumable" in message && typeof message.resumable === "boolean" ? message.resumable : undefined;
}
//@ chunk-5xgkngpb.js:2876005-2876144 placement
function assertStreamPart(ok, part, errorType) {
  if (ok) return;
  logEvent("tengu_streaming_error", {
    error_type: errorType,
    part_type: fromEnum(part.type),
    part_index: blockIndexOf(part),
  });
  throw new StreamMalformedEventError("unreadable");
}
//@ chunk-5xgkngpb.js:2876144-2876220 placement
function blockIndexOf(event) {
  return "index" in event && typeof event.index === "number" ? event.index : undefined;
}
//@ chunk-5xgkngpb.js:2876220-2876340 placement
function isRestartedBlock({ previous, closedContentBlocks, started }) {
  return (
    previous !== undefined &&
    closedContentBlocks.has(previous) &&
    "id" in previous &&
    "id" in started &&
    previous.id === started.id
  );
}
//@ chunk-5xgkngpb.js:2876340-2876408 placement
function recordMonotonicTime(weakMap, block, clock) {
  try {
    weakMap.set(block, clock.monotonicNow());
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-5xgkngpb.js:2876408-2876543 placement
function elapsedSinceMs(weakMap, block, clock) {
  try {
    let startedAt = weakMap.get(block);
    if (startedAt === undefined) return;
    return Math.max(1, Math.round(clock.monotonicNow() - startedAt));
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2876543-2876552 placement
// deferred: uses setAdvisorBaseUrlGetter (../../utils/advisor.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2876543", () => {
  setAdvisorBaseUrlGetter(getApiBaseUrl);
});
//@ chunk-n7kzs9r0.js:13296-13399 placement
var UPGRADE_RELAY_USAGE_LIMIT = "upgrade_relay_usage_limit";
var UPGRADE_RELAY_REQUEST_CLASS = "upgrade_relay_request_class";
var UPGRADE_RELAY_INHERITED_TOOLS = "upgrade_relay_inherited_tools";
//@ chunk-n7kzs9r0.js:13529-13550 placement
/**
 * 60000 / 15000：非流式回退超时常量；getNonstreamingFallbackTimeoutMs 用 15s 或 API_TIMEOUT_MS/2 的较小者。
 */
var NON_STREAMING_FALLBACK_LONG_TIMEOUT_MS = 60000;
var NON_STREAMING_FALLBACK_TIMEOUT_MS = 15000;
//@ chunk-n7kzs9r0.js:13550-13640 fingerprint (2.1.88 match: getNonstreamingFallbackTimeoutMs, 0.77)
/**
 * 非流式回退请求超时：15s，设置 API_TIMEOUT_MS 时取其一半与 15s 的较小值。
 */
function getNonstreamingFallbackTimeoutMs() {
  let API_TIMEOUT_MS = env.API_TIMEOUT_MS;
  return API_TIMEOUT_MS !== undefined && API_TIMEOUT_MS > 0
    ? Math.min(NON_STREAMING_FALLBACK_TIMEOUT_MS, Math.floor(API_TIMEOUT_MS / 2))
    : NON_STREAMING_FALLBACK_TIMEOUT_MS;
}
//@ chunk-1hnjmk23.js:1378844-1379459 fingerprint (2.1.88 match: updateUsage, 0.876)
/**
 * 把内部 usage 规整成 SDK/外部格式：缓存细分、server_tool_use 只保留 web_search、speed 只认 fast，其余置 null。旧版名 updateUsage 为错配。
 */
function toSdkUsage(rawUsage) {
  return {
    output_tokens_details: null,
    input_tokens: rawUsage.input_tokens,
    output_tokens: rawUsage.output_tokens,
    cache_creation_input_tokens: rawUsage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: rawUsage.cache_read_input_tokens ?? 0,
    cache_creation: rawUsage.cache_creation
      ? {
          ephemeral_5m_input_tokens: rawUsage.cache_creation.ephemeral_5m_input_tokens ?? 0,
          ephemeral_1h_input_tokens: rawUsage.cache_creation.ephemeral_1h_input_tokens ?? 0,
        }
      : null,
    server_tool_use: {
      web_search_requests: rawUsage.server_tool_use?.web_search_requests ?? 0,
      web_fetch_requests: 0,
    },
    service_tier: null,
    inference_geo: null,
    iterations: null,
    speed: rawUsage.speed === "fast" ? "fast" : null,
    fallback_credit: null,
  };
}
export {
  hasMediaContent,
  collectBlockFieldsByType,
  queryModelWithoutStreaming,
  shouldSendInterleavedThinkingBeta,
  canonicalNameOrUndefined,
  ultrathinkEffectiveSafely,
  resolveModelAlias,
  computeDeclaredToolSet,
  promptIdForRequest,
  getExtraBodyParams,
  getPromptCachingEnabled,
  toSdkUsage,
  isToolResultOnlyUserMessage,
  queryHaikuWithFallback,
  isMidConvSystemForced,
  notifyPerTurnEffortInactive,
  isRealApiResponse,
  getMaxOutputTokensForModel,
  isOneHourCacheTtl,
  getCacheControl,
  isInvalidEffortError,
  queryModelWithStreaming,
  should1hCacheTTL,
  isStructuredOutputsUnsupportedClaude,
  logUnrecognizedModel,
  lowerEffort,
  learnedEffortCap,
  applyEffortToOutputConfig,
  getAPIMetadata,
  getDispatchVersion,
  V2P,
  ANTHROPIC_DISPATCH_ID,
  markStructuredOutputsUnsupportedClaude,
  buildContextTokensFields,
  isBasaltSpurEnabled,
  queryHaiku,
  getControlRequestInfo,
  verifyApiKey,
  watchSessionSwitchForThinkingKeep,
  NON_STREAMING_FALLBACK_LONG_TIMEOUT_MS,
  getNonstreamingFallbackTimeoutMs,
  UPGRADE_RELAY_USAGE_LIMIT,
  UPGRADE_RELAY_REQUEST_CLASS,
  UPGRADE_RELAY_INHERITED_TOOLS,
};
