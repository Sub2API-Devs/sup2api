/**
 * services/api/claude.ts
 *
 * Messages API 调用核心：queryModel 构建请求体（模型、system、tools、thinking、output_config、context_management、beta）、加缓存断点、经 withRetry 发流式请求、解析 SSE 事件为 assistant 消息，以及 400 时逐级去特性的自愈重试；另含 queryHaiku/queryWithModel 等辅助查询。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/claude.ts
 * pieces: chunk-1ny7cxrt.js (1), chunk-1qpz7qcd.js (1), chunk-3xb70ww4.js (1), chunk-aepeg2w5.js (1), chunk-e6aww6q8.js (187), chunk-r1wk8q25.js (2), chunk-w5ndchqs.js (2)
 * attribution: fingerprint 21, placement 112, layout 54, callgraph-fingerprint 2, callgraph-witnessed 3, file-local 2, affinity 1
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
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
  I9e,
  matchesModelPattern,
  Eee,
} from "./promptCacheTtl.js";
import {
  Vpr,
  hasContextBeta,
  areExperimentalBetasDisabled,
  modelSupportsISP,
  shouldIncludeFirstPartyOnlyBetas,
  modelHidesThinkingByDefault,
  canSendFirstPartyBetas,
  LO,
  shouldUseMidConvSystem,
  Lb,
  MK,
  isHipaaOrg,
  isAfkModeBeta,
  betaHeaderValues,
  Cge,
  Wgr,
  getModelBetas,
  betasRequestParam,
  hitsAnthropicBackend,
  yv,
  modelTakesToolAdditions,
  tb,
  CG,
  supportsPerTurnEffort,
  Z4,
  supportsPerTurnTiming,
  getMergedBetas,
  d3e,
  AU,
  getToolSearchBeta,
  shouldUseGlobalCacheScope,
  cOe,
  willSendStructuredOutputsBeta,
  n8,
  jw,
  shouldAllowAfkModeBeta,
  tj,
  KPt,
  VPt,
  xG,
  thirdPartyAcceptsThinkingBindingBeta,
  qlt,
  DO,
  qT,
  Rge,
  als,
  PG,
  uoo,
  isAutoMode3POptIn,
  getBedrockExtraBodyParamsBetas,
  RG,
  thirdPartyAcceptsDangerousToolUseBeta,
  Txn,
  l3e,
  l9t,
  filterBetasForProvider,
  UEe,
  nj,
  Ggr,
  sle,
  sls,
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
  nRn,
  upgradeDisabledThinkingForModel,
  isThinkingAlwaysOn,
  modelRejectsDisabledThinking,
  modelSupportsAdaptiveThinking,
} from "../../utils/thinking.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import {
  _nr,
  DeclaredToolSet,
  Nrt,
  Snr,
  OYo,
  adjustToolBetas,
  shouldAnnounceDeferredTools,
  poi,
  coi,
  resolveDeclaredToolSet,
  updateDeclaredToolSet,
  kbn,
  isHipaaRestricted,
  isLateToolAdditionsEnabled,
  soi,
  markReconnectingServers,
  cacheNoChannelTools,
  buildDeclaredToolSet,
  computeLateToolAdditions,
  logDeclaredToolSetHeld,
  toolAdditionBetas,
  describeToolAdditionMoves,
  findLatestApiSystemDelta,
  uoi,
  surfaceDeferredTools,
  handleInlineToolsRejection,
  classifyToolAdditionRejection,
  NYo,
  buildToolRemovalBlocks,
} from "./declaredToolSet.js";
import { toolMatchesAnyName } from "../tools/permissionCheckGuard.js";
import { MSe } from "../mcp/mcpToolAvailability.js";
import { toolMatchesName, findToolByName, getEmptyToolPermissionContext } from "../../Tool.js";
import {
  TOOL_SEARCH_TOOL_NAME,
  isDeferredToolByEngine,
  isDeferredTool,
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
  K5,
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
  Nci,
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
import { Bn } from "../../utils/model/modelIds.js";
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
import { isEffortHigherThan } from "./_new/isEffortHigherThan.js";
import { createApiSystemMessage, sD } from "../../utils/messages/systemMessages.js";
import { getDateTimeFormat } from "../../utils/intl.js";
import { Ot, ef, Lf, fT } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import {
  extractNestedErrorMessage,
  rqe,
  Loo,
  getApiErrorCode,
  extractConnectionErrorDetails,
  LK,
  PU,
  isStreamSuspendedError,
  Thr,
  isConnectionError,
  summarizeApiError,
} from "./errorUtils.js";
import { ge } from "../../utils/identity.js";
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
import { u, T, o, tc, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { bl } from "../../utils/toolResultStorage.js";
import { Ws, aes, decideStreamFallbackWarning, formatZodErrors } from "./streamFallbackWarning.js";
import { isFirstPartyBaseUrl, getApiBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import {
  Lp,
  Xg,
  PDt,
  dLn,
  uco,
  eB,
  lT,
  IDt,
  cco,
  tLi,
  fco,
  ODt,
  addNameOnlyAnnouncements,
  forkStickyBetaLatches,
} from "../../bootstrap/stateSlices.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { fOt } from "../../utils/model/modelCatalog.js";
import { isUnresolvedInferenceProfile, getInferenceProfileBackingModel } from "../../utils/model/bedrock.js";
import { claimOnce, isVerificationRequiredError } from "./verificationRequired.js";
import { anyModelDescribed } from "../../utils/model/modelCatalog/catalogCapabilities.js";
import { logEvent } from "../analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { agentTypeForTelemetry, buildAttribution } from "../analytics/metadata.js";
import { jsonStringify, jsonParse, clone } from "../../utils/slowOperations.js";
import { writeToStderr } from "../../utils/process.js";
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";
import { WAITFORMCPSERVERS, xdn } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { ye } from "../../utils/startupMarks.js";
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
  CK,
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
  oR,
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
import { returnValue } from "./_new/returnValue.js";
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
  pRe,
  Xb,
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
  zbe,
  createSystemAPIErrorMessage,
  createUserMessage,
} from "../../utils/messages.js";
import { withStreamVCR, withVCR } from "../vcr.js";
import { recoverRegimeRefusal, U7 } from "./regimeRefusal.js";
import { hasLspEverConnected, getInitializationStatus } from "../lsp/manager.js";
import { ec } from "../../utils/timerDelayClamp.js";
import {
  getSpanId,
  getUpstreamTraceparent,
  recordLlmRequestAttempt,
  startLLMRequestSpan,
} from "../../utils/telemetry/sessionTracing.js";
import {
  shouldSendGatewayHintHeaders,
  _st,
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
  f6e,
  RK,
  Tke,
  bke,
  responseDiagnosticFields,
  Ske,
} from "./responseDiagnostics.js";
import { Aa, sleep } from "../../utils/sleep.js";
import { MMn, Whs, jhs, lOi, dOi, Alo, iOi, Bhs, aOi } from "../../utils/truncateGraphemes.js";
import {
  deferredToolNameOf,
  countToolCallsSince_2 as countToolCallsSince_2_3,
  registerMcpStandardKeys,
  seedDeferredToolReferences,
  PYo,
  jW,
  logKeptDeferredTools,
  buildDeferredToolsForRequest,
  recordDeferredToolsSent,
  restoreDeferredDefinitions,
  l$e,
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
  Ioo,
  Ooo,
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
  adt,
  _3e,
  isRequestTooLargeError_2,
  API_ERROR_MESSAGE_PREFIX,
  DLP_REQUEST_DENIED,
  SAFETY_MONITOR_BLOCKED,
} from "./errors.js";
import { has1mSuffix, modelHasNative1MContext, kmr } from "../../utils/model/contextWindow1m.js";
import {
  readFallbackCreditToken,
  pickFallbackBeta,
  TENGU_DASH_FLAME,
  TENGU_ELEGANT_POSSUM,
  serverFallbackPlan,
  applyRefusalFallbackBeta,
  hve,
  parseFallbackMessage,
  _7e,
  parseFallbackBlockStart,
  isUnreadableFallbackBlock,
  gve,
  cln,
  fallbackMessagesCost,
  uJn,
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
  rPt,
  adoptWireToolInputCopies,
  wireInputSources,
  captureWireToolInputs,
  FHe,
  countToolCallsSince_4,
} from "../../utils/wireToolInputEcho.js";
import { wsr, validateImagesInMessages, redactAccountMemory } from "../../utils/messages/accountMemory.js";
import { logSessionNoticeRender } from "../../utils/messages/ccrSessionNotice.js";
import { logDeclaredRound } from "../../utils/pollEvents/declarations.js";
import {
  isStellarDriftEnabled,
  prefetchToolDescribeHooks,
  toolToApiDefinition,
  ZSe,
  k4e,
  normalizeToolInput_2,
  n9t,
  splitSysPromptPrefix,
  logAPIPrefix,
} from "../../utils/api.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { queryCheckpoint, jS, WS, ydn, _dn, endQueryProfile, ymn } from "../../utils/queryProfiler.js";
import { Tp } from "../compact/autoCompact.js";
import { bytesPerTokenForModel, renderModelName } from "../../utils/model/modelDisplay.js";
import { stripInProgressAssistantMessage } from "../../commands/btw/btw.js";
import { rvi, ovi, resolveFallbackModel } from "../../utils/model/modelUnavailability.js";
import { B4r, DKt } from "../../utils/model/modelAccessCheck.js";
import { withCatalogSuppressed } from "../../utils/model/modelCatalog/servedCatalog.js";
import { oci } from "../../utils/model/modelErrorOverrides.js";
import { collectRecentAssistantTexts } from "../../commands/copy/copy.js";
import { jve, awaitModelConfigFetch } from "../../utils/model/dynamicModelConfig.js";
import {
  seedWireShapeFromRecord,
  threadSourceKind,
  Ucn,
  isStatelessTetherModel,
  NQe,
  FQe,
  bEe,
  canUseNoTransientReminders,
  classifyThreadError,
  Nhn,
  isSubagentOrUnknown,
  jhn,
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
import { deltaToolNames, $ri, isDeferredCustomToolDefinition } from "./toolDefinitionShape.js";
import { f4, TJ } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { hideAliasedV1Tools, isBatchToolsUse } from "../tools/batchTools.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  noteToolRedescribed,
  applyRefusedToolSchemas,
  ToolSchemaWireCache,
  v7t,
  _7t,
} from "./toolSchemaWire.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { Mts } from "../../tools/AgentTool/backgroundGates.js";
import { getDeferredToolPlaceholderSchema } from "../../tools/ToolSearchTool/deferredToolPlaceholder.js";
import { p7t, l7t, lse, prefixLedgerNotice, R4e, m7t } from "./promptPrefixLedger.js";
import { isTetherLive, vEe, khn, _hn, bhn, whn, DQe, IQe, logKeptReminderOk } from "./keptReminder.js";
import {
  resolveLoopEffort,
  classifyEffortCarryEffect,
  getRefusedEffortCarry,
} from "../../utils/permissions/permissionSetup.js";
import { vXr } from "../../utils/sessionTimeZone.js";
import { computeFingerprintFromMessages } from "../../utils/fingerprint.js";
import { getCLISyspromptPrefix, getAttributionHeader } from "../../constants/system.js";
import { isBetasSwitchSetAside } from "../../utils/permissions/serverClassifier/flags.js";
import {
  getClassifierProviderKind,
  isServerClassifierUnsupported,
  settleServerClassifierResult,
  rye,
  createServerClassifierResult,
  getExactMcpAllowRules,
  DANGEROUS_TOOL_USE,
  JGe,
  Xqt,
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
import { canUseServerClassifier, Zqt } from "../../utils/permissions/serverClassifier/arbiter.js";
import { isBetaTracingEnabled } from "../../utils/telemetry/betaSessionTracing.js";
import { logApiRequestBody } from "../../utils/telemetry/otelRawBodies.js";
import { replayTranscriptRequest } from "../../utils/transcriptRequestBlobs.js";
import { F8r, ANTHROPIC_USAGE_LIMIT, SLOW } from "../lowPriority/headers.js";
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
  vTt,
  pickPriorTurnContext,
} from "../../utils/permissions/serverClassifier/context.js";
import { checkInsertedTextShed } from "../../utils/cronFireTexts.js";
import { mvi } from "../../screens/Doctor.js";
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
  Eyn,
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
  Y8r,
  logFallbackRouteOutcome,
  describeFallbackRoute,
  hasRefusalFallbackTarget,
  isRefusalFallbackEnabled,
  Z8r,
  classifyFallbackOrigin,
} from "./refusalFallback.js";
import {
  CEn,
  AEn,
  getFallbackLatchKind,
  X_CC_FALLBACK_FROM_MODEL,
  X_CC_FALLBACK_CATEGORY,
  X_CC_FALLBACK_TRIGGER,
  X_CC_ORIGINAL_REQUEST_ID,
  sanitizeHeaderValue as sanitizeHeaderValue_2,
  hasTenderQuiltHeader,
} from "./refusalFallbackHeaders.js";
import { hfe } from "../compact/postCompactCleanup.js";
import { formatToolDurationsHeader } from "../../components/messages/SystemTextMessage.js";
import { startSessionActivity, endActivity } from "../../utils/sessionActivity.js";
import { headlessProfilerCheckpoint } from "../../utils/headlessProfiler.js";
import { cyi } from "../../utils/startupTiming.js";
import { Vci } from "./gzipRequestBody.js";
import { wdn } from "../../utils/harnessTagGate.js";
import { oGr, checkIncrementalRequestBody, reportIncrementalBodyMismatch } from "./incrementalRequestBody.js";
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
import { NON_STREAMING_FALLBACK_TIMEOUT_MS } from "../../_unattributed/chunk-r1wk8q25/part-001.js";
import { parseAttributionProject } from "../../utils/attributionProject.js";
import { sanitizeExtraMetadata, MAX_METADATA_USER_ID_LENGTH } from "./_new/sanitizeExtraMetadata.js";
import { getParentSessionId } from "../../utils/teammate.js";
import { getControlRequestSubtype_2 } from "../../bridge/attestationGate.js";
import { MUTATING_CONTROL_SUBTYPES, getControlRequestSubtype } from "../../bridge/controlRequests.js";
import { getModelMaxOutputTokens } from "../../utils/context.js";
import { validateBoundedIntEnvVar } from "../../utils/envValidation.js";

/**
 * user 消息里所有 tool_result 的 tool_use_id。旧版名 isToolResultBlock 不准确。
 */
//@ chunk-e6aww6q8.js:445621-445714 fingerprint = isToolResultBlock (0.745)
function getToolResultIds(block) {
  return block.type === "user"
    ? collectBlockFieldsByType(block.message?.content, "tool_result", "tool_use_id")
    : [];
}
/**
 * 从内容数组里取指定 type 块的某个字符串字段（如 tool_use 的 id、tool_result 的 tool_use_id）。
 */
//@ chunk-e6aww6q8.js:445714-445862 placement
function collectBlockFieldsByType(e, n, r) {
  if (!Array.isArray(e)) return [];
  let s = [];
  for (let h of e)
    if (isPlainObject_4(h) && h.type === n) {
      let y = h[r];
      if (typeof y === "string") s.push(y);
    }
  return s;
}
//@ chunk-e6aww6q8.js:2077127-2077220 placement
function F9e(e) {
  let n = getLastMainThreadContextTokens() ?? 0;
  return { context_tokens: n, prompt_cache_warm: isMainThreadSource([]), ...estimateCacheWriteCost(e, n) };
}
//@ chunk-e6aww6q8.js:2476386-2476451 placement
function x3s(e) {
  try {
    return Vpr(e, getCanonicalName(e));
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2476451-2476516 placement
function P3s(e, n) {
  try {
    return isUltrathinkEffective(e, n());
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
        per_turn_effort_active: !1,
      });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2476650-2476715 placement
function jpr() {
  return env.CLAUDE_CODE_THINKING_DISPLAY_UPDATES ?? !0;
}
//@ chunk-e6aww6q8.js:2476715-2476938 placement
function thinkingDisplayMode(e, n) {
  if (e === "summarized" || e === "highlights") return "thinking_and_connector_text";
  if (e === "omitted" && !n) return "none";
  if (e !== "omitted" && nRn()) return "thinking_and_connector_text";
  return jpr() ? "connector_text" : "none";
}
//@ chunk-e6aww6q8.js:2476938-2476991 placement
function _Jn(e) {
  return (
    !areExperimentalBetasDisabled() &&
    modelSupportsISP(e) &&
    (shouldIncludeFirstPartyOnlyBetas() || modelHidesThinkingByDefault(e))
  );
}
//@ chunk-e6aww6q8.js:2476991-2477053 placement
function Zln() {
  return (Ao().thinkingDisplayProbeFailures ?? 0) < 2;
}
//@ chunk-e6aww6q8.js:2477053-2477148 placement
function edn() {
  let e = Ao();
  e.thinkingDisplayProbeFailures = (e.thinkingDisplayProbeFailures ?? 0) + 1;
}
//@ chunk-e6aww6q8.js:2495003-2495042 placement
var cmr = require("./chunk-s5mxraj2.js");
//@ chunk-e6aww6q8.js:2495042-2495128 placement
function fmr(e) {
  return e.isMcp === !0 && e.alwaysLoad === !0 && e.mcpInfo?.scope === "claudeai";
}
/**
 * 计算本次请求声明的工具集（DeclaredToolSet）：启用 ToolSearch 时排除延迟加载的工具（CLAUDE_CODE_UPFRONT_TOOLS 中的可提前声明）；条件不满足返回 undefined。
 */
//@ chunk-e6aww6q8.js:2495128-2495583 placement
function computeDeclaredToolSet(betas, tools, isDeferred, context, upfront = !1) {
  let y = betas === getStickyBetas(),
    S = (Z) =>
      !betas.declaredToolsDecided &&
      (fmr(Z) || (y && cmr?.isLinkedComputerToolShownOnRelay(Z, betas, context) === !0)),
    w = _nr(tools, betas),
    L = w !== tools,
    G = (Z) => Z.mcpInfo?.scope !== "claudeai" && toolMatchesAnyName(Z, env.CLAUDE_CODE_UPFRONT_TOOLS ?? []),
    q = upfront && !betas.declaredToolsDecided && w.some((Z) => G(Z) && isDeferred(Z));
  if (
    (L ? betas.declaredTools !== void 0 : betas.declaredToolsDecided) ||
    !MSe() ||
    (!L && !q && !tools.some(S)) ||
    !tools.some((Z) => toolMatchesName(Z, TOOL_SEARCH_TOOL_NAME))
  )
    return;
  return new DeclaredToolSet(w.filter((Z) => (!isDeferred(Z) || (q && G(Z))) && !S(Z)));
}
//@ chunk-e6aww6q8.js:2512232-2512247 placement
var MSG = "msg_";
//@ chunk-e6aww6q8.js:2512247-2512432 placement
function isRealApiResponse(e) {
  if (e.isApiErrorMessage) return !1;
  if (e.requestId) return !0;
  if (e.isVirtual) return !1;
  let n = e.message?.id;
  return typeof n === "string" && n.startsWith(MSG) && e.message?.model !== SYNTHETIC_MODEL;
}
//@ chunk-e6aww6q8.js:2512432-2512602 placement
function lastAssistantMessageId(e) {
  try {
    for (let n = e.length - 1; n >= 0; n--) {
      let r = e[n];
      if (r.type === "assistant" && isRealApiResponse(r)) {
        let s = r.message?.id;
        if (typeof s === "string") return s;
      }
    }
  } catch (error) {
    logError(error);
  }
  return;
}
//@ chunk-e6aww6q8.js:2533632-2533686 placement
function DGt() {
  return canSendFirstPartyBetas() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_spur", !1);
}
//@ chunk-e6aww6q8.js:2533686-2533737 placement
function hun(e, n) {
  return e === "extract_memories" && n;
}
//@ chunk-e6aww6q8.js:2533737-2533792 placement
function yun() {
  return canSendFirstPartyBetas() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_basalt_scarp", !1);
}
//@ chunk-e6aww6q8.js:2533792-2533974 placement = hasThinkingContent (1)
function isRenderableContentBlock(e, n) {
  if (e.type === "text") {
    if (typeof e.text !== "string" || e.text === "") return !1;
    return !n || e.text.trim() !== "";
  }
  return e.type !== "thinking" && e.type !== "redacted_thinking" && !K5(e);
}
//@ chunk-e6aww6q8.js:2533974-2534124 placement
function lastBlockIsRenderable(e, n) {
  if (e.type !== "assistant") return !0;
  let content = e.message.content;
  if (typeof content === "string") return !0;
  let at = content.at(-1);
  return at !== void 0 && isRenderableContentBlock(at, n);
}
/**
 * 缓存标记尾部审计的默认条件、跳过 cache_control 的原因编码表和相关上限。
 */
//@ chunk-e6aww6q8.js:2534124-2534476 placement
var DEFAULT_TAIL_AUDIT_TERMS = {
    proxyDemoted: !1,
    experimentalBetasDisabled: !1,
    simulateProxyUsage: !1,
    skipMessageCacheMarkers: !1,
  },
  CACHE_SKIP_REASON_CODES = {
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
  },
  MAX_TAIL_AUDIT_ITEMS = 256;
/**
 * 计算消息上的缓存断点位置：末尾可渲染消息（可移到末尾 api_system）、分叉点/父回复前的第二个断点、fork 缓存钉；返回断点集合与审计尾部的函数。
 */
//@ chunk-e6aww6q8.js:2534476-2535974 placement
function pickCacheMarkerIndices({
  messages: messages,
  enablePromptCaching: enablePromptCaching,
  skipCacheWrite: skipCacheWrite,
  forkPointUuid: forkPointUuid,
  canMarkApiSystem: canMarkApiSystem,
  forkCachePin: forkCachePin,
  whitespaceTextUnstampable: whitespaceTextUnstampable,
  topLevelCacheControl: topLevelCacheControl,
  isForkPinStepBackEnabled: isForkPinStepBackEnabled,
  divergesAtMessageId: divergesAtMessageId,
  parentReplyId: parentReplyId,
  tailAuditTerms: tailAuditTerms = DEFAULT_TAIL_AUDIT_TERMS,
}) {
  let isRenderable = (It) => lastBlockIsRenderable(It, whitespaceTextUnstampable),
    isSkippable = (It) =>
      It.type === "api_system" || (It.type === "user" && It.ephemeral === !0) || !isRenderable(It),
    lastCacheableBefore = (It) => {
      let Yt = It;
      while (Yt >= 0 && isSkippable(messages[Yt])) Yt--;
      return Yt;
    },
    tailIndex = lastCacheableBefore(messages.length - 1);
  if (skipCacheWrite) tailIndex = lastCacheableBefore(tailIndex - 1);
  let isMarkableApiSystem = (It, Yt) => {
      let candidate = messages[It];
      return (
        candidate !== void 0 &&
        candidate.type === "api_system" &&
        !candidate.ephemeral &&
        !messages.slice(Yt + 1, It).some((Zt) => Zt.type === "user" && Zt.ephemeral === !0) &&
        typeof candidate.message.content === "string" &&
        candidate.message.content.trim() !== ""
      );
    },
    lastIndex = messages.length - 1,
    lastIsApiSystem = isMarkableApiSystem(lastIndex, tailIndex),
    tailMarkerIndex =
      canMarkApiSystem && enablePromptCaching && !skipCacheWrite && tailIndex >= 0 && lastIsApiSystem
        ? lastIndex
        : tailIndex,
    markerIndices = new Set();
  if (tailMarkerIndex >= 0) markerIndices.add(tailMarkerIndex);
  let forkPointPinned = !1,
    divergeIndex =
      divergesAtMessageId === void 0 || !enablePromptCaching
        ? -1
        : messages.findIndex((It) => It.type === "assistant" && It.message.id === divergesAtMessageId),
    parentReplyIndex =
      parentReplyId === void 0 || !enablePromptCaching
        ? -1
        : messages.findIndex((It) => It.type === "assistant" && It.message.id === parentReplyId),
    parentIndex = divergeIndex >= 0 ? divergeIndex : parentReplyIndex,
    parentPromptEnd = parentIndex <= 0 || topLevelCacheControl ? -1 : lastCacheableBefore(parentIndex - 1),
    parentMarkerIndex =
      canMarkApiSystem && parentPromptEnd >= 0 && isMarkableApiSystem(parentIndex - 1, parentPromptEnd)
        ? parentIndex - 1
        : parentPromptEnd,
    marksParent = parentMarkerIndex >= 0 && parentMarkerIndex < tailMarkerIndex;
  if (marksParent) markerIndices.add(parentMarkerIndex);
  if (forkCachePin && !topLevelCacheControl && !marksParent) {
    if (forkPointUuid) {
      let lastIndex = messages.findLastIndex((Yt) => Yt.uuid === forkPointUuid);
      if (lastIndex >= 0 && lastIndex <= tailIndex) {
        let Yt =
          skipCacheWrite && lastIndex === tailIndex && isForkPinStepBackEnabled()
            ? lastCacheableBefore(lastIndex - 1)
            : isRenderable(messages[lastIndex])
              ? lastIndex
              : lastCacheableBefore(lastIndex - 1);
        if (Yt >= 0) (markerIndices.add(Yt), (forkPointPinned = !0));
      }
    } else if (!skipCacheWrite) {
      let It = lastCacheableBefore(tailIndex - 1);
      if (It >= 0) (markerIndices.add(It), (forkPointPinned = !0));
    }
  }
  let auditTail = () =>
    explainCacheControlSkip({
      messages: messages,
      firstTailIndex: enablePromptCaching && tailMarkerIndex >= 0 ? tailMarkerIndex + 1 : 0,
      cachingOn: enablePromptCaching,
      skipCacheWrite: skipCacheWrite,
      canMarkApiSystem: canMarkApiSystem,
      terms: tailAuditTerms,
      whitespaceTextUnstampable: whitespaceTextUnstampable,
    });
  return {
    markerIndices: markerIndices,
    forkPointPinned: forkPointPinned,
    parentPromptEndMarked: parentReplyIndex === parentIndex && markerIndices.has(parentMarkerIndex),
    auditTail: auditTail,
  };
}
/**
 * 说明本次请求为何没有写入缓存标记（缓存关闭、分叉尾部、代理降级、实验 beta 关闭等）。
 */
//@ chunk-e6aww6q8.js:2535974-2537557 placement
function explainCacheControlSkip({
  messages: messages,
  firstTailIndex: firstTailIndex,
  cachingOn: cachingOn,
  skipCacheWrite: skipCacheWrite,
  canMarkApiSystem: canMarkApiSystem,
  terms: terms,
  whitespaceTextUnstampable: whitespaceTextUnstampable,
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
  let L = skipCacheWrite ? "fork_tail_skip_cache_write" : void 0,
    G = terms.proxyDemoted
      ? "proxy_demoted"
      : terms.experimentalBetasDisabled || terms.simulateProxyUsage
        ? "experimental_betas_disabled"
        : "unexcused",
    lastIndex = messages.findLastIndex((ze, lt) => lt >= firstTailIndex && ze.type === "assistant"),
    Z = 0,
    Se = 0,
    ke = 0,
    we = !1,
    Ee = "none",
    Ae = (ze) => {
      if (CACHE_SKIP_REASON_CODES[ze] > CACHE_SKIP_REASON_CODES[Ee]) Ee = ze;
    },
    Ie = (ze, lt) => {
      if (ze === 0) return;
      if (lt === "unexcused" || lt === "sent_once_oversized" || lt === "sent_once_mislabeled") ke += ze;
      Ae(lt);
    },
    Me = (ze, lt) => {
      ((Se += ze),
        Ie(
          ze,
          L ??
            (lt
              ? "sent_once_mislabeled"
              : ze > MAX_TAIL_AUDIT_ITEMS
                ? "sent_once_oversized"
                : "sent_once_text"),
        ));
    },
    We = messages[firstTailIndex - 1];
  if (We?.type === "api_system" && We.ephemeralSuffix !== void 0) Me(uQe(We.ephemeralSuffix), !1);
  for (let ze = firstTailIndex; ze <= w; ze++) {
    let lt = messages[ze];
    if (lt.type === "api_system") {
      let content = lt.message.content;
      if (
        (Me(
          uQe(lt.ephemeral ? content : (lt.ephemeralSuffix ?? "")),
          lt.ephemeral === !0 && hasFoldedAttachmentEdits(lt),
        ),
        lt.ephemeral)
      )
        continue;
      let nt = uQe(content);
      ((Z += nt),
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
        ));
    } else if (lt.type === "user" && lt.ephemeral === !0)
      ((Se += roughTokenCountEstimationForContent(lt.message.content)), (we = !0), Ae("request_scoped_user"));
    else {
      let Je = roughTokenCountEstimationForContent(lt.message.content);
      ((Z += Je),
        Ie(
          Je,
          L ??
            (lt.type === "assistant" && !lastBlockIsRenderable(lt, whitespaceTextUnstampable)
              ? "unstampable_tail"
              : "unexcused"),
        ));
    }
  }
  return {
    reason: L ?? Ee,
    messagesAfterMarker: w - firstTailIndex + 1,
    resentTailTokensEst: Z,
    sentOnceTailTokensEst: Se,
    unexcusedTailTokensEst: ke,
  };
}
//@ chunk-e6aww6q8.js:2537557-2537777 placement
function hasFoldedAttachmentEdits(e) {
  return (
    (e.foldedAttachmentSpans?.length ?? 0) > 0 ||
    (e.foldedAttachmentTypes?.length ?? 0) > 0 ||
    e.nameOnlyContent !== void 0 ||
    (e.toolAdditions?.length ?? 0) > 0 ||
    (e.toolRemovals?.length ?? 0) > 0 ||
    e.toolDefinitions !== void 0
  );
}
//@ chunk-e6aww6q8.js:2537777-2537822 placement
function uQe(e) {
  return e.trim() === "" ? 0 : roughTokenCountEstimation(e);
}
/**
 * 辅助查询（如保活）在头部开启且有第二个标记位时，找到父回复的消息 id，决定是否在父提示末尾加缓存标记。
 */
//@ chunk-e6aww6q8.js:2537822-2538195 placement
function parentReplyMarkPlan({
  querySource: querySource,
  model: model,
  isKeepaliveHeaderOnWire: isKeepaliveHeaderOnWire,
  hasSecondMarkerSlot: hasSecondMarkerSlot,
  messages: messages,
}) {
  try {
    if (
      classifyQuerySource(querySource) !== "auxiliary" ||
      !isKeepaliveHeaderOnWire ||
      !hasSecondMarkerSlot ||
      isPromptEndMarkRefused()
    )
      return;
    for (let y of keepaliveRequestIds(model)) {
      let found = messages.find((w) => w.type === "assistant" && w.requestId === y);
      if (found?.type === "assistant")
        return {
          querySource: querySource,
          parentReplyId: found.message.id,
          isMarkWanted: getFeatureValue_CACHED_MAY_BE_STALE("tengu_mellow_beacon", !1) === !0,
        };
    }
    return;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2538195-2538259 placement
function Qve(e) {
  return isStructuredOutputsMarkedUnsupported(Bn(e)) || !foundrySupportsCapability(e, "structured_outputs");
}
//@ chunk-e6aww6q8.js:2538259-2538286 placement
function Jve(e) {
  markStructuredOutputsUnsupported(Bn(e));
}
/**
 * CLAUDE_CODE_WEBSEARCH_CITATIONS 开启时，把流里相邻的带引用文本块合并成一个 assistant 消息（重算 span），并同步后续 server_fallback 里引用的消息。
 */
//@ chunk-e6aww6q8.js:2562306-2563334 placement
async function* joinWebSearchCitationTexts(stream, enabled) {
  if (!env.CLAUDE_CODE_WEBSEARCH_CITATIONS || !enabled) return yield* stream;
  let r = [],
    s = new Map();
  function* h() {
    let w = r;
    r = [];
    let at = w.at(-1);
    if (at === void 0) return;
    let G;
    try {
      G = mergeCitedTextBlocks(w.flatMap((ke) => ke.message.content));
    } catch (error) {
      (logError(error), yield* w);
      return;
    }
    if (G === void 0) {
      yield at;
      return;
    }
    let { apiBlockIndex: apiBlockIndex, ...Z } = at,
      Se = { ...Z, message: { ...at.message, content: G } };
    for (let ke of w) s.set(ke, Se);
    yield Se;
  }
  function y() {
    for (let [w, L] of s) {
      if (w.uuid !== L.uuid) continue;
      let { message: message, apiBlockIndex: apiBlockIndex, ...Z } = w;
      (Object.assign(L, Z), Object.assign(L.message, message, { content: L.message.content }));
    }
  }
  let S = (w) => uniq(w.map((L) => s.get(L) ?? L));
  try {
    for await (let w of stream) {
      if (w.type === "assistant") {
        let at = r.at(-1);
        if (at !== void 0 && !hhr(at, w)) yield* h();
        if ((r.push(w), !isSingleTextBlockMessage(w))) yield* h();
        continue;
      }
      if (!isTextStreamEvent(w)) (yield* h(), y());
      if (w.type === "server_fallback")
        yield { ...w, discardedMessages: S(w.discardedMessages), retainedMessages: S(w.retainedMessages) };
      else if (w.type === "stream_event" && w.event.type === "message_start")
        yield { ...w, textRunsJoined: !0 };
      else yield w;
    }
  } catch (error) {
    throw (yield* h(), error);
  }
  yield* h();
}
//@ chunk-e6aww6q8.js:2563334-2563448 placement
function isSingleTextBlockMessage(e) {
  return e.apiBlockIndex !== void 0 && e.message.content.length === 1 && e.message.content[0].type === "text";
}
//@ chunk-e6aww6q8.js:2563448-2563517 placement
function hhr(e, n) {
  return isSingleTextBlockMessage(n) && n.apiBlockIndex === e.apiBlockIndex + 1;
}
//@ chunk-e6aww6q8.js:2563517-2563726 placement
function isTextStreamEvent(e) {
  if (e.type !== "stream_event") return !1;
  let event = e.event,
    r = event.type;
  return (
    r === "ping" ||
    r === "content_block_delta" ||
    r === "content_block_stop" ||
    (event.type === "content_block_start" && event.content_block.type === "text")
  );
}
/**
 * 合并相邻文本块并把引用的 span 改写为合并后文本中的码点区间（网页搜索位置引用除外），没有变化时返回 undefined。
 */
//@ chunk-e6aww6q8.js:2563726-2564164 placement
function mergeCitedTextBlocks(e) {
  let n = [],
    r = !1,
    s = 0;
  for (let h of e) {
    if (h.type !== "text") {
      n.push(h);
      continue;
    }
    let at = n.at(-1),
      S = at?.type === "text" ? at : void 0,
      w = S === void 0 ? 0 : s;
    s = w + countCodePoints(h.text);
    let mapped = (h.citations ?? []).map((q) =>
      q.type === "web_search_result_location" ? q : { ...q, span_start: w, span_end: s },
    );
    if (((r ||= S !== void 0 || mapped.length > 0), S !== void 0)) n.pop();
    let G = [...(S?.citations ?? []), ...mapped];
    n.push({ ...h, text: (S?.text ?? "") + h.text, citations: G.length > 0 ? G : null });
  }
  return r ? n : void 0;
}
//@ chunk-e6aww6q8.js:2564164-2564343 placement
var WEB_SEARCH = "web_search",
  WEB_SEARCH_TOOL_RESULT = "web_search_tool_result",
  WEB_SEARCH_RESULT_LOCATION = "web_search_result_location",
  whr = "[Web search removed]",
  freeze_14 = Object.freeze({ toolUses: 0, results: 0, citations: 0, placeholders: 0 });
/**
 * 去掉历史 assistant 消息中的 web search 工具调用/结果与引用，必要时补占位块，返回新消息与删除计数。
 */
//@ chunk-e6aww6q8.js:2564343-2564824 placement
function stripWebSearchBlocks(messages) {
  if (!messages.some(hasWebSearchContent)) return { messages: messages, removed: freeze_14 };
  let mapped = messages.map((r) =>
    r.type === "assistant" && hasWebSearchContent(r) ? stripWebSearchFromContent(r.message.content) : void 0,
  );
  return {
    messages: messages.map((r, s) => {
      let h = mapped[s];
      return h === void 0 || r.type !== "assistant"
        ? r
        : { ...r, message: { ...r.message, content: h.content } };
    }),
    removed: mapped.reduce(
      (r, s) =>
        s === void 0
          ? r
          : {
              toolUses: r.toolUses + s.counts.toolUses,
              results: r.results + s.counts.results,
              citations: r.citations + s.counts.citations,
              placeholders: r.placeholders + s.counts.placeholders,
            },
      freeze_14,
    ),
  };
}
/**
 * 从助手内容中移除网页搜索相关块，必要时插入占位 thinking 块以保持思考块位置合法，并统计工具调用、结果、引用和占位数量。
 */
//@ chunk-e6aww6q8.js:2564824-2565334 placement
function stripWebSearchFromContent(blocks) {
  let keptIndices = blocks.flatMap((L, G) => (Wun(L) ? [] : [G])),
    rebuiltBlocks = keptIndices.flatMap((L, G) => {
      let q = dropSearchCitations(blocks[L]),
        lastIndex = keptIndices.slice(0, G).findLastIndex((we) => !SQe(blocks[we]));
      return (lastIndex === -1 ? 0 : L - keptIndices[lastIndex] - (G - lastIndex)) > 0 &&
        isThinkingBlockOptional(blocks[keptIndices[lastIndex]]) &&
        isThinkingBlockOptional(q)
        ? [Hun(), q]
        : [q];
    }),
    lastIndex = keptIndices.findLastIndex((L) => !SQe(blocks[L])),
    y =
      (lastIndex === -1
        ? 0
        : blocks.length - 1 - keptIndices[lastIndex] - (keptIndices.length - 1 - lastIndex)) > 0 &&
      isThinkingBlockOptional(blocks[keptIndices[lastIndex]]),
    all = rebuiltBlocks.every((L) => isThinkingBlockOptional(L) || Mhr(L) || SQe(L)),
    finalContent = y || all ? [...rebuiltBlocks, Hun()] : rebuiltBlocks;
  return {
    content: finalContent,
    counts: {
      toolUses: count(blocks, ecn),
      results: count(blocks, (L) => L?.type === WEB_SEARCH_TOOL_RESULT),
      citations: blocks.reduce((L, G) => L + countSearchCitations(G), 0),
      placeholders: finalContent.length - keptIndices.length,
    },
  };
}
//@ chunk-e6aww6q8.js:2565334-2565459 placement
function hasWebSearchContent(e) {
  return (
    e.type === "assistant" &&
    Array.isArray(e.message.content) &&
    e.message.content.some((n) => Wun(n) || countSearchCitations(n) > 0)
  );
}
//@ chunk-e6aww6q8.js:2565459-2565504 placement
function Wun(e) {
  return ecn(e) || e?.type === WEB_SEARCH_TOOL_RESULT;
}
//@ chunk-e6aww6q8.js:2565504-2565569 placement
function ecn(e) {
  return e?.type === "server_tool_use" && e.name === WEB_SEARCH;
}
//@ chunk-e6aww6q8.js:2565569-2565644 placement = hasThinkingContent (1)
function isThinkingBlockOptional(m) {
  return m?.type === "thinking" || m?.type === "redacted_thinking";
}
//@ chunk-e6aww6q8.js:2565644-2565682 placement
function SQe(e) {
  return e != null && K5(e);
}
//@ chunk-e6aww6q8.js:2565682-2565766 placement
function Mhr(e) {
  return e?.type === "text" && (typeof e.text !== "string" || !e.text.trim());
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
  return { ...e, citations: (e.citations ?? []).filter((n) => n?.type !== WEB_SEARCH_RESULT_LOCATION) };
}
//@ chunk-e6aww6q8.js:2565995-2566052 placement
function Hun() {
  return { type: "text", text: whr, citations: [] };
}
/**
 * 包装异步迭代器：超过 heartbeatMs 没有新值时产出 ping 事件（静默时长不超过 maxSilentMs 时）。
 */
//@ chunk-e6aww6q8.js:2566052-2566525 placement
async function* withHeartbeat(iterator, { maxSilentMs: maxSilentMs, heartbeatMs: heartbeatMs = 30000 }) {
  let s = iterator,
    h = Symbol("heartbeat"),
    y = null,
    S = 0,
    w;
  try {
    while (!0) {
      if (y === null) ((y = s.next()), (S = performance.now()));
      let promise = new Promise((q) => {
          ((w = setTimeout((Z, Se) => Z(Se), heartbeatMs, q, h)), w.unref?.());
        }),
        winner = await Promise.race([y, promise]);
      if ((clearTimeout(w), (w = void 0), winner === h)) {
        if (performance.now() - S < maxSilentMs) yield { type: "stream_event", event: { type: "ping" } };
        continue;
      }
      if (((y = null), winner.done)) return winner.value;
      yield winner.value;
    }
  } finally {
    (clearTimeout(w), s.return?.().catch(() => {}));
  }
}
//@ chunk-e6aww6q8.js:2566525-2566535 placement
var Ihr = 8;
/**
 * 包装流式事件：监视并修正护栏产生的游离文本事件，处理出错时停止监视并放出暂存事件，流结束且未中止时补发暂存事件。
 */
//@ chunk-e6aww6q8.js:2566535-2566885 placement
async function* fixGuardrailStrayText(e, n) {
  let r = { openTextIndex: void 0, hold: void 0, watching: !0 },
    s;
  try {
    for await (let h of e) {
      if (!r.watching) {
        yield h;
        continue;
      }
      let y;
      try {
        y = stepGuardrailHold(r, h);
      } catch (error) {
        (logError(toError(error)), (y = r.hold?.events ?? [h]), (r.hold = void 0), (r.watching = !1));
      }
      if (y === void 0) yield h;
      else yield* y;
    }
  } catch (error) {
    s = { error: error };
  }
  if (!n.aborted) yield* r.hold?.events ?? [];
  if (s !== void 0) throw s.error;
}
/**
 * 处理 Bedrock guardrail 把文本 delta 发到错误块下标的情况：暂存这些事件，若随后出现 INTERVENED 的 message_stop，就把文本移到原文本块；否则原样放出。
 */
//@ chunk-e6aww6q8.js:2566885-2568242 placement
function stepGuardrailHold(state, event) {
  let hold = state.hold;
  if (hold === void 0)
    switch (event.type) {
      case "content_block_start":
        if (event.content_block?.type === "text" && typeof event.index === "number")
          state.openTextIndex = event.index;
        return;
      case "content_block_stop":
        if (event.index === state.openTextIndex) state.openTextIndex = void 0;
        return;
      case "content_block_delta":
        if (
          event.delta?.type !== "text_delta" ||
          typeof event.index !== "number" ||
          state.openTextIndex === void 0 ||
          event.index === state.openTextIndex
        )
          return;
        return (
          (state.hold = {
            strayIndex: event.index,
            targetIndex: state.openTextIndex,
            events: [event],
            acceptsText: !0,
          }),
          []
        );
      default:
        return;
    }
  hold.events.push(event);
  let s = hold.events.length <= Ihr,
    h = !1;
  switch (event.type) {
    case "content_block_delta":
      h = hold.acceptsText && event.index === hold.strayIndex && event.delta?.type === "text_delta";
      break;
    case "content_block_stop":
      ((h = hold.acceptsText && event.index === hold.strayIndex), (hold.acceptsText = !1));
      break;
    case "message_delta":
      ((h = !0), (hold.acceptsText = !1));
      break;
    default:
      break;
  }
  if (s && h) return [];
  if (
    ((state.watching = !1),
    !s ||
      event.type !== "message_stop" ||
      !("amazon-bedrock-guardrailAction" in event) ||
      event["amazon-bedrock-guardrailAction"] !== "INTERVENED")
  )
    return ((state.hold = void 0), hold.events);
  let y = [],
    S = !1;
  for (let event of hold.events)
    if (event.type === "content_block_delta") y.push({ ...event, index: hold.targetIndex });
    else if (event.type !== "content_block_stop") {
      if (!S) (y.push({ type: "content_block_stop", index: hold.targetIndex }), (S = !0));
      y.push(event);
    }
  return (
    logForDebugging(
      `Guardrail block text addressed to block ${hold.strayIndex} moved to text block ${hold.targetIndex}`,
    ),
    (state.hold = void 0),
    y
  );
}
/**
 * user 消息是否只包含 tool_result 块。
 */
//@ chunk-e6aww6q8.js:2568242-2568443 placement = extractErrorTypeFromData (1)
function isToolResultOnlyUserMessage(message) {
  if (message.type !== "user") return !1;
  let content = message.message.content;
  if (!Array.isArray(content) || content.length === 0) return !1;
  return content.every((r) => typeof r === "object" && r !== null && "type" in r && r.type === "tool_result");
}
/**
 * 按每个回合的 effort 与时间，在用户消息后插入 api_system 的 output_config（effort、timing），相同的不重复。
 */
//@ chunk-e6aww6q8.js:2568443-2568943 placement
function attachPerTurnOutputConfig(messages, options) {
  let { levels: levels, times: times, answered: answered } = perTurnEffortLevels(messages, options),
    y = [],
    S,
    w;
  for (let [L, G] of messages.entries()) {
    if (w !== void 0 && G.type !== "user") {
      if (((S = w.effort ?? S), G.type === "api_system")) {
        (y.push({ ...G, outputConfig: w }), (w = void 0));
        continue;
      }
      (y.push(ocn(w)), (w = void 0));
    }
    if ((y.push(G), G.type === "user")) {
      let q = S !== void 0 && !answered[L] && isToolResultOnlyUserMessage(G),
        Z = levels !== void 0 && levels[L] !== S && !q ? levels[L] : w?.effort,
        Se = times?.[L];
      w =
        Z === void 0 && Se === void 0
          ? void 0
          : {
              ...(Z !== void 0 && { effort: Z }),
              ...(Se !== void 0 && { timing: { type: "now", now: Se } }),
            };
    }
  }
  if (w !== void 0) y.push(ocn(w));
  return y;
}
/**
 * 从后往前为每条消息计算生效的 effort 等级（可按上限截断）、计时信息，以及该轮是否明确指定过 effort。
 */
//@ chunk-e6aww6q8.js:2568943-2569488 placement
function perTurnEffortLevels(messages, options) {
  let levels = options.effort === void 0 ? void 0 : Array(messages.length),
    times = options.now === void 0 ? void 0 : Array(messages.length),
    answered = Array(messages.length),
    effortCap = options.effortCap,
    capFrom = effortCap === void 0 ? 0 : messages.findLastIndex(TQe);
  while (capFrom > 0 && messages[capFrom - 1].type === "user") capFrom--;
  let { effort: effort, now: now } = options,
    hasTurnEffort = !1;
  for (let index = messages.length - 1; index >= 0; index--) {
    let message = messages[index];
    if (message.type === "assistant" && !message.isApiErrorMessage) {
      let turnEffort = message.perTurnEffort === void 0 ? message.effort : message.perTurnEffort;
      ((hasTurnEffort = turnEffort != null), (effort = turnEffort ?? effort), (now = message.perTurnTiming));
    }
    if (((answered[index] = hasTurnEffort), levels !== void 0))
      levels[index] =
        effortCap !== void 0 && effort !== void 0 && index >= capFrom && isEffortHigherThan(effort, effortCap)
          ? effortCap
          : effort;
    if (times !== void 0) times[index] = now;
  }
  return { levels: levels, times: times, answered: answered };
}
//@ chunk-e6aww6q8.js:2569488-2569689 placement
function lastOutputConfig(e) {
  let n = {};
  for (let r of e)
    if (r.type === "user") n.now = void 0;
    else if (r.type === "api_system" && r.outputConfig)
      ((n.effort = r.outputConfig.effort ?? n.effort), (n.now = r.outputConfig.timing?.now));
  return n;
}
//@ chunk-e6aww6q8.js:2569689-2569786 placement
function rcn(e, n, r) {
  try {
    let { effort: effort } = lastOutputConfig(e);
    return effort === void 0 ? n : r(effort);
  } catch (error) {
    return (logError(toError(error)), n);
  }
}
//@ chunk-e6aww6q8.js:2569786-2569834 placement
function TQe(e) {
  return e.type === "user" && !isToolResultOnlyUserMessage(e);
}
//@ chunk-e6aww6q8.js:2569834-2569877 placement
function Fte(e) {
  return mapOutputConfigs(e, () => {
    return;
  });
}
//@ chunk-e6aww6q8.js:2569877-2569959 placement
function dEe(e) {
  return mapOutputConfigs(e, ({ timing: timing, ...r }) => (Object.keys(r).length > 0 ? r : void 0));
}
//@ chunk-e6aww6q8.js:2569959-2570236 placement
function mapOutputConfigs(e, n) {
  let r = [];
  for (let s of e) {
    if (s.type !== "api_system" || s.outputConfig === void 0) {
      r.push(s);
      continue;
    }
    let { outputConfig: outputConfig, ...y } = s,
      S = n(outputConfig);
    if (S !== void 0) r.push({ ...y, outputConfig: S });
    else if (y.message.content.length > 0 || (y.toolAdditions?.length ?? 0) > 0) r.push(y);
  }
  return r;
}
//@ chunk-e6aww6q8.js:2570236-2570286 placement
function ocn(e) {
  return { ...createApiSystemMessage(""), outputConfig: e };
}
//@ chunk-e6aww6q8.js:2570286-2570373 placement
var Nhr = /^(\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d)GMT([+-]\d{2}:\d{2})?$/;
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
        ),
        match = Nhr.exec(
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
  let r = (S) => String(S).padStart(2, "0"),
    s = -e.getTimezoneOffset(),
    h = s < 0 ? "-" : "+",
    abs = Math.abs(s);
  return `${e.getFullYear()}-${r(e.getMonth() + 1)}-${r(e.getDate())}T${r(e.getHours())}:${r(e.getMinutes())}:${r(e.getSeconds())}${h}${r(Math.floor(abs / 60))}:${r(abs % 60)}`;
}
//@ chunk-e6aww6q8.js:2571173-2571289 placement
function isInvalidEffortError(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    extractNestedErrorMessage(e) === "Invalid effort level" &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_eager_quilt", !1)
  );
}
//@ chunk-e6aww6q8.js:2571289-2571544 placement
function effortInPlay(e, n) {
  let r,
    s = [],
    h = !1;
  for (let y of n) {
    let S = y.type === "api_system" ? y.outputConfig?.effort : void 0;
    if (S !== void 0) ((r = S), (s = h ? [S] : [...s, S]));
    else if (y.type !== "api_system") {
      if (((h = TQe(y)), h)) s = r === void 0 ? [] : [r];
    }
  }
  return EFFORT_LEVELS.findLast((y) => y === e || s.includes(y));
}
//@ chunk-e6aww6q8.js:2571544-2571665 placement
function learnedEffortCap(e, n) {
  let r = getLearnedEffortCaps();
  if (r.size === 0 || isAutoModeQuerySource(n)) return;
  let s = r.get(getModelSettingsKey(e))?.level;
  return s === "xhigh" && !modelSupportsXhighEffort(e) ? "high" : s;
}
//@ chunk-e6aww6q8.js:2571665-2571735 placement
function yV(e, n) {
  return n !== void 0 && typeof e === "string" && isEffortHigherThan(e, n) ? n : e;
}
//@ chunk-e6aww6q8.js:2571735-2571918 placement
function lowerLearnedEffortCap(e, n) {
  let r = getLearnedEffortCaps(),
    s = getModelSettingsKey(e),
    h = r.get(s)?.level,
    y = EFFORT_LEVELS[EFFORT_LEVELS.indexOf(n) - 1];
  if (y === void 0) r.delete(s);
  else if (h === void 0 || isEffortHigherThan(h, y)) r.set(s, { level: y, told: !1 });
  else return h;
  return y;
}
//@ chunk-e6aww6q8.js:2571918-2572030 placement
function takeEffortCapNotice(e) {
  let n = getModelSettingsKey(e),
    r = getLearnedEffortCaps().get(n);
  if (r === void 0 || r.told) return !1;
  return (getLearnedEffortCaps().set(n, { ...r, told: !0 }), !0);
}
//@ chunk-e6aww6q8.js:2572030-2572120 placement
var Fhr = 8192,
  ucn = [],
  vQe = Symbol("read ended"),
  EQe = ge({ value: void 0 }, (e) => {
    e.value = void 0;
  });
//@ chunk-e6aww6q8.js:2572120-2572403 placement
function isDeltaFoldEnabled() {
  try {
    let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_toasty_giraffe", !1);
    if (e === !0 || e === !1) return ((EQe.value = void 0), e);
    if (!Object.is(e, EQe.value))
      ((EQe.value = e),
        logForDiagnosticsNoPII("warn", "stream_delta_fold_flag_ignored", {
          flag: "tengu_toasty_giraffe",
          value_type: e === null ? "null" : typeof e,
        }));
    return !1;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 合并连续的同类流式 delta（text/input_json/thinking）以减少下游事件数：同一块同一类型连续到达时暂存拼接，到下一个 tick 或类型变化时放出；出错时停止合并。
 */
//@ chunk-e6aww6q8.js:2572403-2574077 placement
async function* foldStreamDeltas(events, clock, counter, signal) {
  let h = events[Symbol.asyncIterator](),
    y = { held: void 0, folded: counter },
    S,
    w,
    L,
    G = null,
    q,
    Z,
    Se = !1;
  try {
    while (!0) {
      if (((G ??= h.next()), y.held !== void 0 && q === void 0))
        q = new Promise((Ee) => {
          Z = setImmediate(Ee, vQe);
        });
      let ke;
      try {
        ke = q === void 0 ? await G : await Promise.race([G, q]);
      } catch (error) {
        if (!signal.aborted) yield* flushHeldDelta(y);
        throw error;
      }
      if (signal.aborted) {
        if (((y.held = void 0), ke !== vQe)) return;
      }
      let we;
      if (ke === vQe) we = flushHeldDelta(y);
      else {
        if (((G = null), ke.done)) {
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
                  Ae = typeof delta.text === "string" ? delta.text : void 0;
                  break;
                case "input_json_delta":
                  Ae = typeof delta.partial_json === "string" ? delta.partial_json : void 0;
                  break;
                case "thinking_delta":
                  Ae =
                    typeof delta.thinking === "string" && typeof delta.estimated_tokens !== "number"
                      ? delta.thinking
                      : void 0;
                  break;
                case "citations_delta":
                case "signature_delta":
                case "compaction_delta":
                  break;
                default:
              }
              if ("research" in Ee) Ae = void 0;
            }
            if (Ee.type !== "content_block_delta" || Ae === void 0)
              ((S = void 0), (we = [...flushHeldDelta(y), Ee]));
            else if (Ee.index !== S || Ee.delta.type !== w || clock.lastAt !== L)
              ((S = Ee.index), (w = Ee.delta.type), (L = clock.lastAt), (we = [...flushHeldDelta(y), Ee]));
            else if (y.held === void 0) ((y.held = { last: Ee, text: Ae, deltas: 1 }), (we = ucn));
            else if (y.held.text.length + Ae.length > Fhr)
              ((we = flushHeldDelta(y)), (y.held = { last: Ee, text: Ae, deltas: 1 }));
            else ((y.held.last = Ee), (y.held.text += Ae), (y.held.deltas += 1), (we = ucn));
          } catch (error) {
            (logError(toError(error)),
              logFeatureSad("api_stream_delta_merge", "bookkeeping_threw"),
              (Se = !0),
              (we = y.held?.last === Ee ? flushHeldDelta(y) : [...flushHeldDelta(y), Ee]));
          }
      }
      if (y.held === void 0 && q !== void 0) (clearImmediate(Z), (Z = void 0), (q = void 0));
      for (let Ee of we) {
        if (signal.aborted) return;
        yield Ee;
      }
    }
  } finally {
    clearImmediate(Z);
    try {
      Promise.resolve(h.return?.(void 0)).catch(() => {});
    } catch {}
  }
}
/**
 * 放出暂存的合并增量：把多个同类 delta（文本、JSON 片段、思考）的文本合并到最后一个事件里，并累计折叠数量。
 */
//@ chunk-e6aww6q8.js:2574077-2574443 placement
function flushHeldDelta(e) {
  let held = e.held;
  if (held === void 0) return [];
  if (((e.held = void 0), (e.folded.count += held.deltas - 1), held.deltas === 1)) return [held.last];
  let { last: last, text: text } = held,
    delta = last.delta;
  switch (delta.type) {
    case "text_delta":
      return [{ ...last, delta: { ...delta, text: text } }];
    case "input_json_delta":
      return [{ ...last, delta: { ...delta, partial_json: text } }];
    case "thinking_delta":
      return [{ ...last, delta: { ...delta, thinking: text } }];
    default:
      return [last];
  }
}
//@ chunk-e6aww6q8.js:2574443-2574476 placement
var TENGU_POLISHED_DEWDROP = "tengu_polished_dewdrop";
//@ chunk-e6aww6q8.js:2574476-2574574 placement
function mcn(e) {
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
  let e = getCachedClientData()?.[TENGU_POLISHED_DEWDROP],
    n = env.CLAUDE_CODE_POLISHED_DEWDROP ?? (e === "drop" || e === "block" || e === "off" ? e : void 0);
  if (n !== void 0) return mcn(n);
  return mcn(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_POLISHED_DEWDROP, ""));
}
//@ chunk-e6aww6q8.js:2574753-2574793 placement
function hcn(e) {
  return e !== void 0 || isFirstPartyApiBackend();
}
//@ chunk-e6aww6q8.js:2579785-2580012 placement
var MAX_SEARCH_RESULTS = 6,
  SEARCH_RESULT_LOCATION_SCHEMA = DoctorLazy(() =>
    u({
      type: T("search_result_location"),
      cited_text: o(),
      source: o(),
      title: o().nullable(),
      search_result_index: tc(),
      start_block_index: tc(),
      end_block_index: tc(),
      span_start: tc().optional(),
      span_end: tc().optional(),
    }),
  );
/**
 * 发请求前整理消息列表（合并、清理系统消息），受 tengu_jolly_sparrow 开关影响。
 */
//@ chunk-e6aww6q8.js:2580012-2581746 placement
function prepareRequestMessages(e, n) {
  if (
    !env.CLAUDE_CODE_WEBSEARCH_CITATIONS ||
    !getFeatureValue_SESSION_PINNED("tengu_jolly_sparrow_enabled", !1)
  )
    return e;
  try {
    let r = new Map();
    for (let y of n) {
      if (y.type !== "assistant") continue;
      for (let S of y.message.content)
        if (S.type === "text" && S.citations?.length) {
          let w = r.get(y.message.id) ?? [];
          (r.set(y.message.id, w), w.push(S));
        }
    }
    if (r.size === 0) return e;
    let s = [],
      h = new Map();
    return e.map((y) => {
      if (y.type === "api_system" || typeof y.message.content === "string") return y;
      if (y.type === "user") {
        for (let Z of y.message.content) {
          let Se = Z.type === "tool_result" && Array.isArray(Z.content) ? Z.content : [Z];
          for (let ke of Se)
            if (bl(ke) && ke.type === "search_result" && ke.citations?.enabled) s.push(ke.source);
        }
        return y;
      }
      let id = y.message.id,
        w = r.get(id);
      if (w === void 0) return y;
      let L = (h.get(id) ?? 0) + count(y.message.content, (Z) => Z.type === "tool_use"),
        G = L,
        q = [];
      for (let Z of y.message.content) {
        let Se =
            Z.type === "text" && !Z.citations?.length && L < MAX_SEARCH_RESULTS
              ? w.findIndex((Ie) => Ie.text === Z.text)
              : -1,
          [ke] = Se === -1 ? [] : w.splice(Se, 1);
        if (Z.type !== "text" || ke === void 0) {
          q.push(Z);
          continue;
        }
        let list = Array.from(Z.text),
          Ee = new Map();
        for (let Ie of ke.citations ?? []) {
          let safeParse = SEARCH_RESULT_LOCATION_SCHEMA().safeParse(Ie);
          if (!safeParse.success) continue;
          let { span_start: span_start = 0, span_end: span_end = list.length, ...lt } = safeParse.data;
          if (s[lt.search_result_index] !== lt.source) continue;
          let Je = Ee.get(span_start) ?? { end: span_end, citations: [] };
          (Ee.set(span_start, Je), Je.citations.push(lt));
        }
        let Ae = 0;
        for (let [Ie, Me] of [...Ee].sort((We, ze) => We[0] - ze[0])) {
          if (L >= MAX_SEARCH_RESULTS || Ie < Ae || Me.end <= Ie || Me.end > list.length) continue;
          if ((L++, Ie > Ae)) q.push({ ...Z, text: list.slice(Ae, Ie).join("") });
          (q.push({ ...Z, text: list.slice(Ie, Me.end).join(""), citations: Me.citations }), (Ae = Me.end));
        }
        if (Ae === 0) q.push(Z);
        else if (Ae < list.length) q.push({ ...Z, text: list.slice(Ae).join("") });
      }
      return (h.set(id, L), L === G ? y : { ...y, message: { ...y.message, content: q } });
    });
  } catch (error) {
    return (logError(error), e);
  }
}
/**
 * 关闭用户消息与工具结果中 search_result 块的引用（citations.enabled=false），出错时记日志并原样返回。
 */
//@ chunk-e6aww6q8.js:2581746-2582303 placement
function disableSearchResultCitations(messages) {
  try {
    return messages.map((message) => {
      if (message.type !== "user" || typeof message.message.content === "string") return message;
      let content = message.message.content,
        mapped = content.map((block) => {
          if (block.type === "search_result" && block.citations?.enabled)
            return { ...block, citations: { enabled: !1 } };
          if (block.type !== "tool_result" || !Array.isArray(block.content)) return block;
          let content = block.content,
            mapped = content.map((item) =>
              bl(item) && item.type === "search_result" && item.citations?.enabled
                ? { ...item, citations: { enabled: !1 } }
                : item,
            );
          return mapped.some((w, L) => w !== content[L]) ? { ...block, content: mapped } : block;
        });
      return mapped.some((h, y) => h !== content[y])
        ? { ...message, message: { ...message.message, content: mapped } }
        : message;
    });
  } catch (error) {
    return (logError(error), messages);
  }
}
//@ chunk-e6aww6q8.js:2582303-2582458 placement = applyDisplayStyles (0.545)
function readDisplayField(e) {
  try {
    if (typeof e !== "object" || e === null || !("display" in e)) return;
    let display = e.display;
    return typeof display === "string" ? display : void 0;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2582541-2582784 placement
function thinkingStartTime(e, n) {
  try {
    if (n === void 0) return;
    return e.type === "message_start" ||
      (e.type === "content_block_start" && e.content_block?.type === "thinking") ||
      (e.type === "content_block_delta" && e.delta?.type === "thinking_delta")
      ? n
      : void 0;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2582784-2582815 placement
var TENGU_RUSTLING_PIXEL = "tengu_rustling_pixel";
//@ chunk-e6aww6q8.js:2582815-2583081 placement
function foreignThinkingKeepMode() {
  let e = Ws();
  if (e.foreignThinkingKeep === void 0) {
    if (((e.foreignThinkingKeep = resolveForeignThinkingKeep()), e.foreignThinkingKeep === "all"))
      logFeatureOk("api_keep_thinking_on_model_change");
    else if (e.foreignThinkingKeep === "upgrade") logFeatureOk("api_keep_thinking_on_upgrade");
  }
  return e.foreignThinkingKeep;
}
//@ chunk-e6aww6q8.js:2583081-2583301 placement
function dropForeignThinkingKeep(e) {
  let n = Ws();
  if (n.foreignThinkingKeep === "all") logFeatureSad("api_keep_thinking_on_model_change", e);
  else if (n.foreignThinkingKeep === "upgrade") logFeatureSad("api_keep_thinking_on_upgrade", e);
  else return;
  n.foreignThinkingKeep = "none";
}
//@ chunk-e6aww6q8.js:2583301-2583382 placement
function E8s() {
  return onSessionSwitch((e, n) => {
    if (aes.has(n)) Ws().foreignThinkingKeep = void 0;
  });
}
/**
 * 决定切换模型时保留历史 thinking 的策略（all/upgrade/none）：仅第一方后端；env CLAUDE_CODE_RUSTLING_PIXEL 优先，其次 client_data 与 GrowthBook。
 */
//@ chunk-e6aww6q8.js:2583382-2583770 placement
function resolveForeignThinkingKeep() {
  if (!isFirstPartyApiBackend()) return "none";
  if (!assumesFirstPartyBaseUrl())
    try {
      if (!isFirstPartyBaseUrl()) return "none";
    } catch (error) {
      return (logError(error), "none");
    }
  let CLAUDE_CODE_RUSTLING_PIXEL = env.CLAUDE_CODE_RUSTLING_PIXEL;
  if (CLAUDE_CODE_RUSTLING_PIXEL !== void 0) {
    if (
      CLAUDE_CODE_RUSTLING_PIXEL !== "all" &&
      CLAUDE_CODE_RUSTLING_PIXEL !== "upgrade" &&
      CLAUDE_CODE_RUSTLING_PIXEL !== "none"
    )
      logForDebugging(
        `CLAUDE_CODE_RUSTLING_PIXEL=${CLAUDE_CODE_RUSTLING_PIXEL} is not 'all', 'upgrade' or 'none'; using 'upgrade'`,
        { level: "warn" },
      );
    return PQe(CLAUDE_CODE_RUSTLING_PIXEL);
  }
  let n = getCachedClientData()?.[TENGU_RUSTLING_PIXEL];
  if (typeof n === "string") return PQe(n);
  return PQe(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RUSTLING_PIXEL, "all"));
}
//@ chunk-e6aww6q8.js:2583770-2583827 placement
function PQe(e) {
  return e === "all" || e === "none" ? e : "upgrade";
}
/**
 * 按模型、查询来源和 beta 列表计算请求特性开关：中途 system 消息、工具变更头与内联工具、保留提醒等。
 */
//@ chunk-e6aww6q8.js:2583827-2584257 placement
function requestFeatureFlags(e, n, r) {
  let s = Lp(e, LO) || hasComplianceTaint("hipaa") ? !1 : shouldUseMidConvSystem(n) || void 0,
    h = Nrt(e) ? !0 : Lp(e, Lb) || Lp(e, LO) ? !1 : void 0,
    y = r.keptOn && r.betas.includes(MK) ? !0 : Lp(e, MK) || Lp(e, LO) || r.betas.includes(LO) ? !1 : void 0,
    S;
  return {
    ...(s !== void 0 && { systemTurns: s }),
    ...(h !== void 0 && { toolChangeHeader: h, inlineTools: h && Snr(e) }),
    ...(y !== void 0 && { keptReminders: y }),
    ...(S !== void 0 && { toolResultSafeguards: S }),
    ...(e.systemMessagesAcceptedBy.has(n) && { systemTurnsAnsweredBy: n }),
  };
}
//@ chunk-e6aww6q8.js:2584257-2584360 placement
function isMidConvSystemForced(e) {
  return (
    !!env.CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM || fOt("mid_conv_system", getCanonicalName(e)) === !0
  );
}
//@ chunk-e6aww6q8.js:2647001-2647044 placement
var Z_r = "[claude-code:unrecognized_model]";
/**
 * 遇到无法识别的模型名时（每个模型只记一次）记遥测，并在 print 模式下写 stderr，否则写调试日志。
 */
//@ chunk-e6aww6q8.js:2647044-2647496 placement
function logUnrecognizedModel(e, n) {
  try {
    if (n === "model_validation") return;
    if (isUnresolvedInferenceProfile(e)) return;
    let r = Bn(e);
    if (!claimOnce().claim(`unrecognized-model-signal:${r}`)) return;
    if (isRecognizedModel(e) || isRecognizedModel(r) || anyModelDescribed(e, r, strippedCanonicalName(e)))
      return;
    logEvent("tengu_api_unrecognized_model", {
      model: telemetrySafeModelName(e),
      querySource: agentTypeForTelemetry(n),
    });
    let replaced = `${Z_r} ${jsonStringify({ model: e, query_source: n })}`.replace(
      CONTROL_CHARS_EXCEPT_WS_RE,
      "",
    );
    if (getPrintOutputFormat() !== null && env.CLAUDE_CODE_SESSION_KIND !== "bg")
      writeToStderr(`${replaced}
`);
    else logForDebugging(replaced, { level: "warn" });
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "unrecognized-model signal failed"));
  }
}
//@ chunk-e6aww6q8.js:2647496-2647535 placement
var Wte = require("./chunk-1cnesc1e.js");
//@ chunk-e6aww6q8.js:2647535-2647595 placement
function Gte(e, n) {
  try {
    return e();
  } catch (error) {
    return (logError(toError(error)), n);
  }
}
//@ chunk-e6aww6q8.js:2647595-2647688 placement
function eSr(e, n) {
  try {
    if (
      classifyQuerySource(n) === "main" &&
      isFoamySpringEnabled() &&
      e.some((r) => toolMatchesName(r, WAITFORMCPSERVERS))
    )
      xdn();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2647688-2647748 placement
var ANTHROPIC_DISPATCH_ID = "anthropic-dispatch-id",
  V2S = "v2s",
  V2D = "v2d",
  V2P = "v2p";
//@ chunk-e6aww6q8.js:2647748-2647790 placement
function vh(e) {
  return ye(e) ?? lit_2("unknown");
}
/**
 * 2：思考签名错误时按错误定位剥离单个 thinking 块的最多尝试次数，超过后整体剥离。
 */
//@ chunk-e6aww6q8.js:2647790-2647800 layout
var MAX_SIGNATURE_STRIP_ATTEMPTS = 2;
/**
 * thinking/redacted_thinking 块的稳定键（type:signature 或 type:data）。
 */
//@ chunk-e6aww6q8.js:2647800-2648004 layout = hasThinkingContent (0.876)
function getThinkingBlockKey(m) {
  if (typeof m !== "object" || m === null) return;
  let n = m,
    r = n.type === "thinking" ? n.signature : n.type === "redacted_thinking" ? n.data : void 0;
  return typeof r === "string" && r.length > 0 ? `${n.type}:${r}` : void 0;
}
/**
 * assistant 消息里 thinking/redacted_thinking 块数。
 */
//@ chunk-e6aww6q8.js:2648004-2648185 layout = hasThinkingContent (1)
function countThinkingBlocks(m) {
  let n = 0;
  if (m?.type === "assistant" && Array.isArray(m.message.content)) {
    for (let r of m.message.content) if (r.type === "thinking" || r.type === "redacted_thinking") n++;
  }
  return n;
}
/**
 * 比较剥离前后消息：发送/剥离的思考块数与轮数。
 */
//@ chunk-e6aww6q8.js:2648185-2648418 layout
function summarizeThinkingStrip(e, n) {
  let r = { blocksSent: 0, turnsSent: 0, blocksStripped: 0, turnsStripped: 0 };
  for (let s = 0; s < e.length; s++) {
    let h = countThinkingBlocks(e[s]),
      y = h - countThinkingBlocks(n[s]);
    ((r.blocksSent += h),
      (r.turnsSent += h > 0 ? 1 : 0),
      (r.blocksStripped += y),
      (r.turnsStripped += y > 0 ? 1 : 0));
  }
  return r;
}
/**
 * 解析 CLAUDE_CODE_EXTRA_BODY（JSON 对象）作为请求体附加字段：组织禁用实验 beta 时忽略；去掉 afk-mode beta；metadata.user_id 里的 tk 去掉；合并 Bedrock 要放进 body 的 anthropic_beta。
 */
//@ chunk-e6aww6q8.js:2648418-2649540 fingerprint = getExtraBodyParams (0.442)
function getExtraBodyParams(betaHeaders) {
  let extraBodyStr = process.env.CLAUDE_CODE_EXTRA_BODY,
    result = {};
  if (extraBodyStr && isHipaaOrg())
    logForDebugging(
      "CLAUDE_CODE_EXTRA_BODY ignored: experimental betas are disabled by your organization's policy",
      { level: "debug" },
    );
  else if (extraBodyStr)
    try {
      let parsed = safeParseJSON(extraBodyStr);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) result = { ...parsed };
      else
        logForDebugging(
          `CLAUDE_CODE_EXTRA_BODY env var must be a JSON object, but was given ${extraBodyStr}`,
          { level: "error" },
        );
    } catch (error) {
      logForDebugging(`Error parsing CLAUDE_CODE_EXTRA_BODY: ${errorMessage(error)}`, { level: "error" });
    }
  for (let h of ["betas", "anthropic_beta"]) {
    if (!(h in result)) continue;
    let filtered = String(result[h])
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean),
      filtered_2 = filtered.filter((w) => !isAfkModeBeta(w));
    if (filtered_2.length === filtered.length) continue;
    if (
      (logForDebugging(
        `CLAUDE_CODE_EXTRA_BODY ${h}: dropped afk-mode \u2014 only auto mode itself sends that beta`,
        { level: "warn" },
      ),
      filtered_2.length > 0)
    )
      result[h] = filtered_2;
    else delete result[h];
  }
  let metadata = result.metadata;
  if (isPlainObject_4(metadata) && typeof metadata.user_id === "string") {
    let h = safeParseJSON(metadata.user_id, !1);
    if (isPlainObject_4(h) && "tk" in h) {
      let { tk: tk, ...S } = h;
      result.metadata = { ...metadata, user_id: jsonStringify(S) };
    }
  }
  if (betaHeaders && betaHeaders.length > 0) {
    let h = betaHeaderValues(betaHeaders);
    if (result.anthropic_beta && Array.isArray(result.anthropic_beta)) {
      let existingHeaders = result.anthropic_beta,
        newHeaders = h.filter((header) => !existingHeaders.includes(header));
      result.anthropic_beta = [...existingHeaders, ...newHeaders];
    } else result.anthropic_beta = h;
  }
  return result;
}
/**
 * Bedrock 等把 beta 放进请求体 anthropic_beta 数组时，追加该 beta 头（已有则不加）。
 */
//@ chunk-e6aww6q8.js:2649540-2649672 layout
function addBetaToBodyAnthropicBeta(e, n, r) {
  if (!r) return;
  let anthropic_beta = e.anthropic_beta;
  if (Array.isArray(anthropic_beta) && !anthropic_beta.includes(n.header))
    e.anthropic_beta = [...anthropic_beta, n.header];
}
/**
 * 是否启用提示词缓存：DISABLE_PROMPT_CACHING 全关；DISABLE_PROMPT_CACHING_HAIKU/SONNET/OPUS/FABLE/MYTHOS 按模型族关闭。
 */
//@ chunk-e6aww6q8.js:2649672-2650149 fingerprint = getPromptCachingEnabled (0.756)
function getPromptCachingEnabled(model) {
  if (env.DISABLE_PROMPT_CACHING) return !1;
  if (
    env.DISABLE_PROMPT_CACHING_HAIKU &&
    getCanonicalName(model, { identity: !0 }) === getCanonicalName(getDefaultHaikuModel(), { identity: !0 })
  )
    return !1;
  if (env.DISABLE_PROMPT_CACHING_HAIKU && hasDedicatedSmallFastModel()) {
    let smallFastModel = getSmallFastModel();
    if (smallFastModel !== getMainLoopModel() && model === smallFastModel) return !1;
  }
  if (env.DISABLE_PROMPT_CACHING_SONNET) {
    let defaultSonnet = getDefaultSonnetModel();
    if (model === defaultSonnet) return !1;
  }
  if (env.DISABLE_PROMPT_CACHING_OPUS) {
    let defaultOpus = getDefaultOpusModel();
    if (model === defaultOpus) return !1;
  }
  if (env.DISABLE_PROMPT_CACHING_FABLE) {
    if (isFableModelValue(model) || isPinnedFableModel(model)) return !1;
  }
  if (env.DISABLE_PROMPT_CACHING_MYTHOS) {
    if (isMythosModelValue(model)) return !1;
  }
  return !0;
}
/**
 * 生成 cache_control：{type:"ephemeral"}，可带 ttl（1h）与 scope:"global"。
 */
//@ chunk-e6aww6q8.js:2650149-2650247 fingerprint = getCacheControl (0.925)
function getCacheControl({ scope: e, ttl: n } = {}) {
  return { type: "ephemeral", ...(n && { ttl: n }), ...(e === "global" && { scope: e }) };
}
/**
 * 决定提示词缓存 TTL：代理覆盖优先；订阅用户且不在超额、模型在 tengu_prompt_cache_1h_config 白名单内用 1h，否则 5m；tengu_tidy_frost 时活跃 5m 缓存保持 5m。
 */
//@ chunk-e6aww6q8.js:2650247-2650730 fingerprint = should1hCacheTTL (0.34)
function should1hCacheTTL(e, { agentCacheTtlOverride: n, ignoreOverage: r = !1, mainThreadModel: s } = {}) {
  let userEligible = isClaudeAISubscriber(),
    y = userEligible && !r && getCurrentLimits().isUsingOverage === !0,
    S = resolvePromptCacheTtl(e, n, y);
  if (S !== void 0) return S;
  if (!userEligible || y) return { ttl: "5m", reason: "default" };
  let allowlist = getPromptCache1hAllowlist();
  if (allowlist === null)
    ((allowlist =
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_prompt_cache_1h_config", { allowlist: [...I9e] })
        .allowlist ?? []),
      setPromptCache1hAllowlist(allowlist));
  if (!matchesModelPattern(e, allowlist)) return { ttl: "5m", reason: "default" };
  if (
    s !== void 0 &&
    isLastMainThreadAskLive(CACHE_TTL_5M_MS, s) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_frost", !1)
  )
    return { ttl: "5m", reason: "live_5m_cache" };
  return { ttl: "1h", reason: "subscriber" };
}
/**
 * should1hCacheTTL(...).ttl 是否为 1h。
 */
//@ chunk-e6aww6q8.js:2650730-2650774 layout
function isOneHourCacheTtl(e, n) {
  return should1hCacheTTL(e, n).ttl === "1h";
}
/**
 * thinking.type=disabled 时去掉 display 等多余键（服务器拒收），首次记 tengu_thinking_disabled_sanitized。
 */
//@ chunk-e6aww6q8.js:2650774-2651250 layout
function sanitizeDisabledThinking(e, n, r) {
  if (e?.type !== "disabled") return e;
  let filtered = Object.keys(e).filter((h) => h !== "type");
  if (filtered.length === 0) return e;
  if (r)
    (logEvent("tengu_thinking_disabled_sanitized", {
      hadDisplay: filtered.includes("display") ? lit_2("true") : lit_2("false"),
      extraKeyCount: filtered.length,
      querySourceCategory: fromEnumOpt(classifyQuerySource(n)),
      hasExtraBodyEnv: env.CLAUDE_CODE_EXTRA_BODY ? lit_2("true") : lit_2("false"),
    }),
      logForDebugging(
        `[thinking] stripped ${filtered.length} extra key(s) from {type:'disabled'} thinking param (gh-68567)`,
        { level: "warn" },
      ));
  return { type: "disabled" };
}
/**
 * 模型不支持 effort 时删 output_config.effort；否则字符串 effort 写入 output_config.effort 并加 effort beta。
 */
//@ chunk-e6aww6q8.js:2651250-2651408 layout
function applyEffortToOutputConfig(e, n, r, s, h) {
  if (!modelSupportsEffort(h)) {
    delete n.effort;
    return;
  }
  if ("effort" in n) return;
  if (e === void 0) s.push(Cge);
  else if (typeof e === "string") ((n.effort = e), s.push(Cge));
}
/**
 * 有 taskBudget 且开关允许时写 output_config.task_budget={type:"tokens",total,remaining} 并加 task-budget beta。
 */
//@ chunk-e6aww6q8.js:2651408-2651592 fingerprint = configureTaskBudgetParams (1)
function configureTaskBudgetParams(taskBudget, outputConfig, betas) {
  if (!taskBudget || "task_budget" in outputConfig || !canSendFirstPartyBetas()) return;
  if (
    ((outputConfig.task_budget = {
      type: "tokens",
      total: taskBudget.total,
      ...(taskBudget.remaining !== void 0 && { remaining: taskBudget.remaining }),
    }),
    !betas.includes(Wgr))
  )
    betas.push(Wgr);
}
/**
 * 用一次 max_tokens=1 的 "test" 请求验证 API key（带 withRetry 重试 2 次）；跳过标志为真时直接返回 true；认证错误返回 false。
 */
//@ chunk-e6aww6q8.js:2651710-2652755 fingerprint = verifyApiKey (0.617)
async function verifyApiKey(e, n, r, s) {
  if (n) return !0;
  try {
    let model = getBareCheckModel(),
      betas = getModelBetas(model),
      S = await returnValue(
        withRetry(
          () =>
            getAnthropicClient({
              apiKey: e,
              maxRetries: 3,
              model: model,
              source: "verify_api_key",
              agentContext: mainAgentContext(),
              credentials: r,
              storageV5: s,
            }),
          async (anthropic) => {
            let messages = [{ role: "user", content: "test" }];
            return (
              await anthropic.beta.messages.create({
                model: toProviderWireModelId(model),
                max_tokens: 1,
                messages: messages,
                temperature: 1,
                ...betasRequestParam(betas),
                metadata: getAPIMetadata(),
                ...getExtraBodyParams(),
              }),
              !0
            );
          },
          { maxRetries: 2, model: model, credentials: r, storageV5: s },
        ),
      );
    return (logFeatureOk("api_key_verify"), S);
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
    )
      return (
        logForDebugging(`API key verification failed: ${errorMessage(error)}`, { level: "error" }),
        logFeatureBad("api_key_verify", "invalid_key"),
        !1
      );
    if (
      error instanceof ef ||
      (error instanceof Ot && error.status != null && error.status < 500) ||
      (error instanceof InvalidRequestHeaderValueError && error.isUserSupplied)
    )
      logForDebugging(`API key verification failed: ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    throw (logFeatureBad("api_key_verify", "network_error"), error);
  }
}
/**
 * 内部 user 消息转 API MessageParam；需要缓存断点时给最后一个块加 cache_control。
 */
//@ chunk-e6aww6q8.js:2652755-2653166 fingerprint = userMessageToMessageParam (0.665)
function userMessageToMessageParam(message, addCache = !1, enablePromptCaching, querySource) {
  if (addCache)
    if (typeof message.message.content === "string")
      return {
        role: "user",
        content: [
          {
            type: "text",
            text: message.message.content,
            ...(enablePromptCaching && { cache_control: getCacheControl({ ttl: querySource }) }),
          },
        ],
      };
    else {
      let h = dropEmptyTextBlocks(message.message.content);
      return {
        role: "user",
        content: h.map((y, S) => ({
          ...y,
          ...(S === h.length - 1
            ? enablePromptCaching
              ? { cache_control: getCacheControl({ ttl: querySource }) }
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
/**
 * 去掉空白 text 块；全空时返回一个 "(no content)" 文本块。
 */
//@ chunk-e6aww6q8.js:2653166-2653398 layout
function dropEmptyTextBlocks(e) {
  let n;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (s.type === "text" && (typeof s.text !== "string" || s.text.trim() === "")) n ??= e.slice(0, r);
    else n?.push(s);
  }
  if (n === void 0) return [...e];
  return n.length > 0 ? n : [{ type: "text", text: NO_CONTENT_MESSAGE }];
}
/**
 * echoApiBlockOrder 开启时按 API 原始块顺序重排 assistant 内容（gJe），出错记日志返回原值。
 */
//@ chunk-e6aww6q8.js:2653398-2653480 layout
function applyApiBlockOrderEcho(e, n, r) {
  if (!n) return e;
  try {
    return reorderByApiBlockIndex(e, r);
  } catch (error) {
    return (logError(toError(error)), e);
  }
}
/**
 * 内部 assistant 消息转 API MessageParam；需要缓存断点时给最后一个非 thinking 块加 cache_control。
 */
//@ chunk-e6aww6q8.js:2653480-2653865 callgraph-fingerprint = assistantMessageToMessageParam (0.411)
function assistantMessageToMessageParam(e, n = !1, r, s, h) {
  if (n)
    if (typeof e.message.content === "string")
      return {
        role: "assistant",
        content: [
          { type: "text", text: e.message.content, ...(r && { cache_control: getCacheControl({ ttl: s }) }) },
        ],
      };
    else
      return {
        role: "assistant",
        content: e.message.content.map((y, S) => ({
          ...y,
          ...(S === e.message.content.length - 1 && isRenderableContentBlock(y, h)
            ? r
              ? { cache_control: getCacheControl({ ttl: s }) }
              : {}
            : {}),
        })),
      };
  return { role: "assistant", content: e.message.content };
}
/**
 * 调用 options.onMediaStripped 观察者（媒体剥离重试时），异常只告警。
 */
//@ chunk-e6aww6q8.js:2653865-2654045 layout
function notifyMediaStripped(e, n, r) {
  if (!e.onMediaStripped) return;
  try {
    e.onMediaStripped(n, r);
  } catch (error) {
    logForDebugging(
      `onMediaStripped observer threw; continuing the media-strip retry: ${errorMessage(error)}`,
      { level: "warn" },
    );
  }
}
/**
 * 主线程主查询返回 main_thread，否则 other。
 */
//@ chunk-e6aww6q8.js:2654045-2654137 layout
function getRequestRouteKind(e) {
  return isMainAgent(e.agentContext) && classifyQuerySource(e.querySource) === "main"
    ? "main_thread"
    : "other";
}
/**
 * 非流式查询（queryHaiku/queryWithModel 等辅助查询用）：消费 queryModel 流取最后一条 assistant；网关上小模型失败时改用主模型重试。
 */
//@ chunk-e6aww6q8.js:2654137-2654648 fingerprint = queryModelWithoutStreaming (0.789)
async function queryModelWithoutStreaming({
  messages: messages,
  systemPrompt: systemPrompt,
  thinkingConfig: thinkingConfig,
  tools: tools,
  signal: signal,
  options: options,
}) {
  let S = { ...options, model: unlessManagedDeniedModel(options.model) },
    assistantMessage;
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
    if (signal.aborted) throw new Lf();
    throw Error("No assistant message found");
  }
  if (
    isResendableClientApiError(assistantMessage) &&
    getAPIProvider() === "gateway" &&
    S.model === getSmallFastModel() &&
    S.model !== getMainLoopModel()
  )
    return queryModelWithoutStreaming({
      messages: messages,
      systemPrompt: systemPrompt,
      thinkingConfig: thinkingConfig,
      tools: tools,
      signal: signal,
      options: { ...options, model: getMainLoopModel() },
    });
  return assistantMessage;
}
/**
 * 主循环的 deps.callModel：流式产出 queryModel 的事件；FallbackTriggeredError 转成 {type:"model_fallback_triggered"} 事件交给 queryLoop 换模型。
 */
//@ chunk-e6aww6q8.js:2654648-2654938 fingerprint = queryModelWithStreaming (0.532)
async function* queryModelWithStreaming({
  messages: messages,
  systemPrompt: systemPrompt,
  thinkingConfig: thinkingConfig,
  tools: tools,
  signal: signal,
  options: options,
}) {
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
    yield { type: "model_fallback_triggered", error: error };
  }
}
/**
 * LSP 工具在 LSP 尚未连接（pending/not-started）时延迟加载。
 */
//@ chunk-e6aww6q8.js:2654938-2655075 fingerprint = shouldDeferLspTool (1)
function shouldDeferLspTool(tool) {
  if (!("isLsp" in tool) || !tool.isLsp) return !1;
  if (hasLspEverConnected()) return !1;
  let status = getInitializationStatus();
  return status.status === "pending" || status.status === "not-started";
}
/**
 * 90000：带静默重试的重试生成器 maxSilentMs = 等待上限 + 此值。
 */
//@ chunk-e6aww6q8.js:2655075-2655089 layout
var SILENT_RETRY_EXTRA_MS = 90000;
/**
 * 非流式请求超时：API_TIMEOUT_MS（上限 int32）或远程 120s/本地 300s。
 */
//@ chunk-e6aww6q8.js:2655089-2655199 layout
function getNonStreamingRequestTimeoutMs() {
  let e = getApiTimeoutMs();
  if (e !== void 0 && e > 0) return Math.min(e, ec);
  return env.CLAUDE_CODE_REMOTE ? 120000 : 300000;
}
/**
 * verbose 日志级别时打印请求的 model/thinking/output_config/temperature/betas。
 */
//@ chunk-e6aww6q8.js:2655199-2655435 layout
function logApiRequestDetail(e) {
  if (getMinDebugLogLevel() !== "verbose") return;
  logForDebugging(
    `[API REQUEST DETAIL] ${jsonStringify({ model: e.model, thinking: e.thinking, output_config: e.output_config, temperature: e.temperature, betas: e.betas ?? [], anthropic_beta: e.anthropic_beta })}`,
    { level: "verbose" },
  );
}
/**
 * 生成 x-client-request-id（第一方时）和 traceparent 头，并记录本次尝试。
 */
//@ chunk-e6aww6q8.js:2655435-2655663 layout
function buildRequestTraceHeaders(e, n) {
  let r = hitsAnthropicBackend(),
    s = r ? randomUUID_16() : void 0,
    h =
      (e && (r || env.CLAUDE_CODE_PROPAGATE_TRACEPARENT) ? getSpanId(e) : void 0) ?? getUpstreamTraceparent();
  return (
    recordLlmRequestAttempt(e, { attempt: n, clientRequestId: s }),
    {
      headers: { ...(s && { [CLIENT_REQUEST_ID_HEADER]: s }), ...(h && { traceparent: h }) },
      clientRequestId: s,
    }
  );
}
/**
 * 按端点设置 x-cc-/x-claude-code- 的 context-compacted 与 compaction-request 头。
 */
//@ chunk-e6aww6q8.js:2655663-2655822 layout
function setCompactionHeaders(e, n, r) {
  if (n === void 0 && r === void 0) return;
  let s = isFirstPartyApiBackend(),
    h = shouldSendGatewayHintHeaders();
  if (n !== void 0) {
    if (s) e[X_CC_CONTEXT_COMPACTED] = n;
    if (h) e[X_CLAUDE_CODE_CONTEXT_COMPACTED] = n;
  }
  if (r !== void 0) {
    if (s) e[X_CC_COMPACTION_REQUEST] = r;
    if (h) e[X_CLAUDE_CODE_COMPACTION] = r;
  }
}
/**
 * 设置 x-claude-code-prev-tool-durations 头。
 */
//@ chunk-e6aww6q8.js:2655822-2655870 layout
function setPrevToolDurationsHeader(e, n) {
  if (n !== void 0 && shouldSendGatewayHintHeaders()) e[X_CLAUDE_CODE_PREV_TOOL_DURATIONS] = n;
}
/**
 * 请求分派版本：CLAUDE_CODE_DISPATCH_V2D 或 tengu_dreamy_frost → v2d；非 auxiliary 且 V2S/tengu_cedar_lattice → v2s；否则 null。
 */
//@ chunk-e6aww6q8.js:2655870-2656070 layout
function getDispatchVersion(e) {
  if (antEnv.CLAUDE_CODE_DISPATCH_V2D ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_dreamy_frost", !1))
    return V2D;
  if (e === "auxiliary") return null;
  if (antEnv.CLAUDE_CODE_DISPATCH_V2S ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_cedar_lattice", !1))
    return V2S;
  return null;
}
/**
 * 每进程一次记录 API 路由（状态、头）诊断事件。
 */
//@ chunk-e6aww6q8.js:2656070-2656268 layout
function logApiRouteObserved(e, n) {
  if (e === void 0 || !Ws().once("api_route_observed")) return;
  let { status: status, headers: headers } = e;
  logForDiagnosticsNoPII("info", "cli_api_route_observed", () => ({
    response: describeResponseHeaders(status, headers),
    route: connectionSetupFacts(),
    incremental_request_body: n,
  }));
}
/**
 * 看起来像 JSON 的字符串尝试解析，失败原样返回。
 */
//@ chunk-e6aww6q8.js:2656268-2656398 layout
function tryParseJsonString(e) {
  let n = typeof e === "string" ? e.trim() : void 0;
  if (!n || (n[0] !== "{" && n[0] !== "[")) return e;
  try {
    return jsonParse(n);
  } catch {
    return e;
  }
}
/**
 * 非流式请求执行（流式失败回退或显式非流式）：调整 max_tokens/thinking 后 create(stream:false)，带超时；返回消息与响应头。
 */
//@ chunk-e6aww6q8.js:2656398-2659669 callgraph-witnessed = executeNonStreamingRequest (0.295)
async function* executeNonStreamingRequest(
  clientOptions,
  retryOptions,
  paramsFromContext,
  onAttempt,
  captureRequest,
  originatingRequestId,
) {
  let fallbackTimeoutMs = getNonStreamingRequestTimeoutMs(),
    w = clientOptions.clock ?? Aa,
    L = 0,
    generator = withRetry(
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
      async (anthropic, attempt, context) => {
        let start = w.now(),
          Ee = getLimitsAccountEpoch(),
          retryParams = paramsFromContext(context);
        onAttempt(attempt, start, retryParams.max_tokens);
        let adjustedParams = adjustParamsForNonStreaming(retryParams, MMn);
        (logApiRequestDetail(adjustedParams), captureRequest(adjustedParams), L++);
        let { headers: headers, clientRequestId: clientRequestId } = buildRequestTraceHeaders(
          clientOptions.llmSpan,
          L,
        );
        (setCompactionHeaders(
          headers,
          clientOptions.contextCompactedKindForWire,
          clientOptions.compactionRequestKindForWire,
        ),
          setPrevToolDurationsHeader(headers, clientOptions.prevToolDurationsForWire),
          retryOptions.stampDispatchHeader?.(headers, isFirstPartyApiBackend() && _st()));
        let abortController = new AbortController(),
          lt = w.setTimeout(() => abortController.abort(), fallbackTimeoutMs, { unref: !0 });
        try {
          let withResponse = await anthropic.beta.messages
            .create(
              { ...deferredToolNameOf(adjustedParams), stream: !1 },
              {
                signal: AbortSignal.any([retryOptions.signal, abortController.signal]),
                timeout: fallbackTimeoutMs,
                ...(Object.keys(headers).length > 0 && { headers: headers }),
              },
            )
            .withResponse();
          logApiRouteObserved(withResponse.response, !1);
          let nt = tryParseJsonString(withResponse.data);
          if (nt !== withResponse.data)
            (logForDebugging(
              "Non-streaming fallback: parsed a JSON body served under a non-JSON content-type",
            ),
              logForDiagnosticsNoPII("info", "cli_nonstreaming_fallback_text_body_parsed"));
          if (!isValidAPIMessage(nt))
            throw new UnexpectedApiResponseError({
              data: nt,
              status: withResponse.response?.status,
              headers: withResponse.response?.headers,
              originating: originatingRequestId,
            });
          countToolCallsSince_2_3(nt);
          let pt = withResponse.response?.headers;
          if (retryOptions.lowPriorityWait) recordLowPriorityServed(retryOptions.lowPriorityWait);
          if (pt) {
            let yt =
                (has1mSuffix(retryOptions.model) || modelHasNative1MContext(retryOptions.model)) &&
                (nt.usage?.input_tokens ?? 0) +
                  (nt.usage?.cache_read_input_tokens ?? 0) +
                  (nt.usage?.cache_creation_input_tokens ?? 0) >
                  CK,
              gt = extractQuotaStatusFromHeaders(
                pt,
                retryOptions.model,
                yt,
                w.now(),
                Ee,
                clientOptions.storageV5,
              );
            if (gt && clientOptions.queryTracking)
              ((clientOptions.queryTracking.billedToUsageCredits = gt.overageInUse === !0),
                (clientOptions.queryTracking.longContextBilled = yt));
          }
          let Et = readFallbackCreditToken(nt.stop_details);
          {
            let stop_details = nt.stop_details;
            if (stop_details && "fallback_credit_token" in stop_details)
              delete stop_details.fallback_credit_token;
          }
          return { message: nt, requestId: rqe(withResponse.request_id, pt), headers: pt, creditCode: Et };
        } catch (err) {
          let nt =
            isAbortError(err) && abortController.signal.aborted && !retryOptions.signal.aborted
              ? new fT()
              : err;
          if (nt instanceof Lf) throw nt;
          throw (
            logForDiagnosticsNoPII("error", "cli_nonstreaming_fallback_error", () => ({
              ...classifyApiErrorKind(nt, classifyAPIError(nt)),
              attempt: attempt,
              attempt_duration_ms: w.now() - start,
              timeout_ms: fallbackTimeoutMs,
              client_request_id: ye(clientRequestId) ?? null,
              model: telemetrySafeModelName(clientOptions.model) ?? null,
              originating_request_id: originatingRequestId?.requestId ?? null,
              originating_cause: originatingRequestId?.cause ?? null,
            })),
            logEvent("tengu_nonstreaming_fallback_error", {
              model: telemetrySafeModelName(clientOptions.model),
              error:
                nt instanceof Error
                  ? (sanitizedErrorNameForTelemetry(nt) ?? lit_2("Error"))
                  : lit_2("unknown"),
              attempt: attempt,
              timeout_ms: fallbackTimeoutMs,
              request_id: originatingRequestId?.analyticsRequestId ?? lit_2("unknown"),
            }),
            nt
          );
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
        ...(isFastModeEnabled() && { fastMode: retryOptions.fastMode }),
        modelIsRefusalFallbackTarget: retryOptions.modelIsRefusalFallbackTarget,
        signal: retryOptions.signal,
        initialConsecutive529Errors: retryOptions.initialConsecutive529Errors,
        maxRetries: retryOptions.maxRetries,
        modelCallRetries: retryOptions.modelCallRetries,
        clock: retryOptions.clock,
        random: retryOptions.random,
        querySource: retryOptions.querySource,
        isNonStreamingRequest: !0,
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
    ? yield* withHeartbeat(generator, { maxSilentMs: fallbackTimeoutMs + SILENT_RETRY_EXTRA_MS })
    : yield* generator;
}
//@ chunk-e6aww6q8.js:2659812-2659842 placement
function mSr(e) {
  return getPromptId(e);
}
/**
 * 取请求所属的提示 id：优先解析自身，失败或为空时在子代理上下文中使用父提示 id。
 */
//@ chunk-e6aww6q8.js:2659842-2659965 placement
function promptIdForRequest(e, n) {
  let r;
  try {
    r = mSr(e);
  } catch (error) {
    (logError(toError(error)), (r = void 0));
  }
  return r ?? (isSubagentContext(n) && !n.isMainSession ? n.parentPromptId : void 0);
}
//@ chunk-e6aww6q8.js:2659965-2660024 placement
function gSr(e) {
  try {
    return getTurnOrigin(e);
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2660024-2660083 placement
function hSr(e) {
  try {
    return getTurnPosition(e);
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2660083-2660203 placement
function memoryToolNames(e, n) {
  return memoryRedactionIndex(
    getRootSession().host,
    e,
    new Set(n.filter((r) => isLiveMemoryTool(r) || r.mcpInfo?.accountMemory === !0).map((r) => r.name)),
  );
}
//@ chunk-e6aww6q8.js:2660203-2660356 placement
function applyThreadBody(e, n) {
  if (!("thread" in e)) return e;
  let { thread: thread, ...s } = e;
  return { ...s, messages: n.messages, system: n.system, ...(n.tools !== void 0 && { tools: n.tools }) };
}
//@ chunk-e6aww6q8.js:2660356-2660578 placement
function canSendProviderBetas() {
  if (!canSendFirstPartyBetas()) return !1;
  let e = getAPIProvider();
  switch (e) {
    case "firstParty":
      return hitsAnthropicBackend(e);
    case "anthropicGoogleCloud":
      return usesDefaultProviderEndpoint(e);
    case "anthropicAws":
    case "bedrock":
    case "vertex":
    case "foundry":
    case "mantle":
    case "gateway":
      return !1;
  }
}
//@ chunk-e6aww6q8.js:2660578-2660708 placement
function isSubagentCacheEvictEnabled() {
  if (!canSendFirstPartyBetas() || !hitsAnthropicBackend()) return !1;
  if (env.CLAUDE_CODE_SUBAGENT_CACHE_EVICT) return !0;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_subagent_cache_evict", !1);
}
/**
 * 对象块且类型为 image/document。
 */
//@ chunk-e6aww6q8.js:2660708-2660777 layout = isMedia (1)
function isMediaBlock(block) {
  return bl(block) && (block.type === "image" || block.type === "document");
}
/**
 * base64 媒体块的 data 长度，否则 0。
 */
//@ chunk-e6aww6q8.js:2660777-2660830 layout
function base64MediaLength(e) {
  return isBase64ImageBlock_3(e) ? e.source.data.length : 0;
}
/**
 * 对象块且 type=tool_result。
 */
//@ chunk-e6aww6q8.js:2660830-2660883 file-local
function isToolResultBlock(block) {
  return bl(block) && block.type === "tool_result";
}
/**
 * "[media removed: request limit]" 占位文本块。
 */
//@ chunk-e6aww6q8.js:2660883-2660956 layout
function mediaRemovedPlaceholder() {
  return { type: "text", text: "[media removed: request limit]" };
}
/**
 * 统计消息中的 image/document 块数（含 tool_result 内嵌套），用于媒体数量超限的重试。auto 名 stripExcessMediaItems 不准确。
 */
//@ chunk-e6aww6q8.js:2660956-2661155 file-local
function countMediaItems(e) {
  let toRemove = 0;
  for (let msg of e) {
    if (!Array.isArray(msg.message.content)) continue;
    for (let block of msg.message.content)
      if (isMediaBlock(block)) toRemove++;
      else if (isToolResultBlock(block) && Array.isArray(block.content))
        toRemove += count(block.content, isMediaBlock);
  }
  return toRemove;
}
/**
 * 按数量上限与总字节上限从最旧开始移除媒体块（tool_result 内的换成占位文本），用于请求媒体数量/大小限制。
 */
//@ chunk-e6aww6q8.js:2661155-2662770 layout
function stripExcessMediaItems(e, n, r = 0, s = 1 / 0, h = 0, y = 1 / 0) {
  let S = [],
    w = [];
  for (let Me of e) {
    if (!Array.isArray(Me.message.content)) continue;
    for (let We of Me.message.content)
      if (isMediaBlock(We)) (S.push(base64MediaLength(We)), w.push(We.type === "document" ? S.at(-1) : 0));
      else if (isToolResultBlock(We) && Array.isArray(We.content)) {
        for (let ze of We.content)
          if (isMediaBlock(ze))
            (S.push(base64MediaLength(ze)), w.push(ze.type === "document" ? S.at(-1) : 0));
      }
  }
  let L = new Set(),
    G = [],
    max = Math.max(0, n - r),
    Z = 0,
    Se = 0,
    ke = !1,
    we = !1,
    Ee = y > 0 && y < s;
  for (let [Me, We] of S.entries()) {
    if ((G.push(Me), (Z += We), (Se += w[Me]), G.length > n))
      for (let ze of G.splice(0, G.length - max)) (L.add(ze), (Z -= S[ze]), (Se -= w[ze]));
    if (Ee && Se > y) {
      ((ke = !0), (we = !0));
      for (let ze = 0; ze < G.length && Se > y - h;) {
        let lt = G[ze];
        if (w[lt] === 0) {
          ze++;
          continue;
        }
        (G.splice(ze, 1), L.add(lt), (Z -= S[lt]), (Se -= w[lt]));
      }
    }
    if (s > 0 && Z > s) {
      ke = !0;
      for (let ze = 0; ze < G.length && Z > s - h;) {
        let lt = G[ze];
        if (S[lt] === 0) {
          ze++;
          continue;
        }
        (G.splice(ze, 1), L.add(lt), (Z -= S[lt]), (Se -= w[lt]));
      }
    }
  }
  if (L.size === 0) return e;
  let Ae = 0,
    mapped = e.map((Me) => {
      let content = Me.message.content;
      if (!Array.isArray(content)) return Me;
      let ze = !1,
        lt = [];
      for (let Je of content)
        if (isMediaBlock(Je))
          if (L.has(Ae++)) ze = !0;
          else lt.push(Je);
        else if (isToolResultBlock(Je) && Array.isArray(Je.content)) {
          let nt = !1,
            mapped = Je.content.map((Et) => {
              if (isMediaBlock(Et) && L.has(Ae++)) return ((nt = !0), mediaRemovedPlaceholder());
              return Et;
            });
          ((ze ||= nt), lt.push(nt ? { ...Je, content: mapped } : Je));
        } else lt.push(Je);
      if (!ze) return Me;
      return { ...Me, message: { ...Me.message, content: lt.length > 0 ? lt : [mediaRemovedPlaceholder()] } };
    });
  if (ke) {
    let Me = 0,
      We = 0;
    for (let ze of L) ((Me += S[ze]), (We += w[ze]));
    logEvent("tengu_media_byte_cap_stripped", {
      totalBytes: S.reduce((ze, lt) => ze + lt, 0),
      totalDocumentBytes: w.reduce((ze, lt) => ze + lt, 0),
      byteLimit: s,
      documentByteLimit: y,
      documentCapTriggered: we,
      removedCount: L.size,
      removedBytes: Me,
      removedDocumentBytes: We,
    });
  }
  return mapped;
}
/**
 * 媒体字节上限 GrowthBook 值的 schema。
 */
//@ chunk-e6aww6q8.js:2662770-2662812 layout
var mediaByteCapSchema = DoctorLazy(() => Ue([T(0), tc().min(2 * Whs)]));
/**
 * 读 GrowthBook 数值开关并校验。
 */
//@ chunk-e6aww6q8.js:2662812-2662892 layout
function readMediaByteCapFlag(e) {
  let safeParse = mediaByteCapSchema().safeParse(getFeatureValue_CACHED_MAY_BE_STALE(e, null));
  return safeParse.success ? safeParse.data : void 0;
}
/**
 * 请求媒体总字节上限（tengu_keen_pudding / tengu_media_byte_cap）。
 */
//@ chunk-e6aww6q8.js:2662892-2663034 layout
function getMediaTotalByteCap() {
  let e = readMediaByteCapFlag("tengu_keen_pudding") || readMediaByteCapFlag("tengu_media_byte_cap");
  if (e === void 0) return hitsAnthropicBackend() ? jhs : lOi;
  return hitsAnthropicBackend() ? e : Math.min(e, jhs);
}
/**
 * 文档字节上限（tengu_golden_dove），仅 qae() 时生效。
 */
//@ chunk-e6aww6q8.js:2663034-2663105 layout
function getDocumentByteCap() {
  if (!hitsAnthropicBackend()) return 0;
  return readMediaByteCapFlag("tengu_golden_dove") || dOi;
}
/**
 * 1e4：withStreamHeartbeat 默认心跳间隔；另两个 2e4/45e3 是流停顿余量（qae() 时 20s，否则 45s）。
 */
//@ chunk-e6aww6q8.js:2663105-2663137 layout
var STREAM_HEARTBEAT_MS = 1e4,
  STREAM_STALL_MARGIN_FIRST_PARTY_MS = 20000,
  STREAM_STALL_MARGIN_MS = 45000;
/**
 * 流停顿判定余量：qae() 为 20s，否则 45s。
 */
//@ chunk-e6aww6q8.js:2663137-2663206 layout
function getStreamStallMarginMs() {
  try {
    return hitsAnthropicBackend() ? STREAM_STALL_MARGIN_FIRST_PARTY_MS : STREAM_STALL_MARGIN_MS;
  } catch (error) {
    return (logError(toError(error)), STREAM_STALL_MARGIN_FIRST_PARTY_MS);
  }
}
/**
 * tool_use/server_tool_use/mcp_tool_use。
 */
//@ chunk-e6aww6q8.js:2663206-2663286 layout
var MAX_STREAM_STALL_MS = 90000,
  MAX_PING_EVENTS_RESETTING_IDLE = 30,
  TOOL_USE_BLOCK_TYPES = new Set(["tool_use", "server_tool_use", "mcp_tool_use"]);
/**
 * 包装 SSE 迭代器：超过间隔无事件但 lastAt 前进时插入 {type:"ping"}。
 */
//@ chunk-e6aww6q8.js:2663286-2663765 layout
async function* withStreamHeartbeat(e, n, r = STREAM_HEARTBEAT_MS, s = Aa) {
  if (!n) {
    yield* e;
    return;
  }
  let h = e[Symbol.asyncIterator](),
    monotonicNow = s.monotonicNow(),
    S = null,
    w,
    L = Symbol("heartbeat");
  try {
    while (!0) {
      S ??= h.next();
      let promise = new Promise((Z) => {
          w = s.setTimeout(() => Z(L), r, { unref: !0 });
        }),
        winner = await Promise.race([S, promise]);
      if ((w?.(), (w = void 0), winner === L)) {
        if (n.lastAt > monotonicNow) ((monotonicNow = s.monotonicNow()), yield { type: "ping" });
        continue;
      }
      if (((S = null), winner.done)) return;
      ((monotonicNow = s.monotonicNow()), yield winner.value);
    }
  } finally {
    w?.();
    try {
      Promise.resolve(h.return?.(void 0)).catch(() => {});
    } catch {}
  }
}
/**
 * 非第一方/假定第一方/自定义 ANTHROPIC_BASE_URL/非 OAuth 时为真；否则看组织额度状态。用于 fallback credit 端点判断。
 */
//@ chunk-e6aww6q8.js:2663765-2663906 layout
function isFirstPartyCreditEndpoint(e = getAPIProvider()) {
  if (
    e !== "firstParty" ||
    assumesFirstPartyBaseUrl() ||
    env.ANTHROPIC_BASE_URL !== void 0 ||
    !isWIFDispatchAuth()
  )
    return !0;
  let n = getResolvedWIFBaseUrlSnapshot();
  return n === null || (n !== void 0 && isFirstPartyAnthropicHost(n));
}
/**
 * 第一方、无 ANTHROPIC_UNIX_SOCKET、api.anthropic.com 直连。
 */
//@ chunk-e6aww6q8.js:2663906-2664027 layout
function isDirectFirstPartyApi() {
  try {
    return (
      getAPIProvider() === "firstParty" &&
      env.ANTHROPIC_UNIX_SOCKET === void 0 &&
      isActualFirstPartyAnthropicBaseUrl() &&
      !isWIFDispatchAuth()
    );
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * bedrock/vertex/mantle/anthropicGoogleCloud 是否未设自定义 base URL。
 */
//@ chunk-e6aww6q8.js:2664027-2664279 layout
function usesDefaultProviderEndpoint(e) {
  switch (e) {
    case "bedrock":
      return isGenuineBedrockEndpoint();
    case "vertex":
      return env.ANTHROPIC_VERTEX_BASE_URL === void 0;
    case "mantle":
      return env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL === void 0;
    case "anthropicGoogleCloud":
      return env.ANTHROPIC_GOOGLE_CLOUD_BASE_URL === void 0;
  }
}
/**
 * 各提供商是否走自定义/网关端点。
 */
//@ chunk-e6aww6q8.js:2664279-2664552 layout
function isCustomEndpoint(e) {
  switch (e) {
    case "gateway":
      return !0;
    case "firstParty":
      return !isFirstPartyAnthropicBaseUrl() || !isFirstPartyCreditEndpoint(e);
    case "bedrock":
    case "mantle":
    case "vertex":
      return !usesDefaultProviderEndpoint(e);
    case "anthropicAws":
      return !hitsAnthropicBackend(e);
    case "foundry":
      return env.ANTHROPIC_FOUNDRY_BASE_URL !== void 0;
    case "anthropicGoogleCloud":
      return !usesDefaultProviderEndpoint(e);
  }
}
/**
 * mint 模型与请求模型同提供商且端点允许 fallback credit 时为真。
 */
//@ chunk-e6aww6q8.js:2664552-2664898 layout
function canUseFallbackCreditMintModel(e, n) {
  let r = getProviderForModel(n);
  if (getProviderForModel(e) !== r) return !1;
  switch (r) {
    case "gateway":
      return !1;
    case "firstParty": {
      if (!isFirstPartyAnthropicBaseUrl()) return !1;
      return isFirstPartyCreditEndpoint(r);
    }
    case "bedrock":
      return usesDefaultProviderEndpoint("bedrock");
    case "mantle":
      return usesDefaultProviderEndpoint("mantle");
    case "foundry":
      return !0;
    case "anthropicAws":
      return hitsAnthropicBackend(r);
    case "anthropicGoogleCloud":
      return !1;
    case "vertex":
      return (
        usesDefaultProviderEndpoint("vertex") && getVertexRegionForModel(e) === getVertexRegionForModel(n)
      );
  }
}
/**
 * 从 api_system 消息的 toolAdditions/toolRemovals 里去掉 advisor 工具。
 */
//@ chunk-e6aww6q8.js:2664898-2665281 layout
function dropAdvisorFromApiSystem(e) {
  return e.map((n) => {
    if (n.type !== "api_system") return n;
    let r = n.toolAdditions?.filter((w) => w !== ADVISOR_TOOL_NAME),
      s = n.toolRemovals?.filter((w) => w !== ADVISOR_TOOL_NAME);
    if (r?.length === n.toolAdditions?.length && s?.length === n.toolRemovals?.length) return n;
    let { toolAdditions: toolAdditions, toolRemovals: toolRemovals, ...S } = n;
    return {
      ...S,
      ...(r !== void 0 && r.length > 0 && { toolAdditions: r }),
      ...(s !== void 0 && s.length > 0 && { toolRemovals: s }),
    };
  });
}
/**
 * 消息含 advisor 相关块（sJe 计数 >0）。
 */
//@ chunk-e6aww6q8.js:2665281-2665313 layout
function hasAdvisorBlocks(e) {
  return countThinkingBlocks(e) > 0;
}
/**
 * advisorStripPlan 覆盖到本次消息里的 assistant 时记 tengu_advisor_strip_replayed。
 */
//@ chunk-e6aww6q8.js:2665313-2665503 layout
function logAdvisorStripReplayed(e, n) {
  try {
    let size = unionSets(n.advisorStripPlan, getAdvisorStrippedMessageIds(e)).size;
    if (size === 0) return;
    logEvent("tengu_advisor_strip_replayed", {
      query_source: agentTypeForTelemetry(n.querySource),
      covered_assistant_count: size,
    });
  } catch (error) {
    logError(toError(error));
  }
}
/**
 * 请求前消息规整：剥离 tool_reference/caller（无工具搜索时）、修复 tool_use/tool_result 配对、去 advisor 块、可选去 web search、媒体数量上限，然后 normalizeMessagesForAPI 并处理思考签名。返回 messagesForAPI 与多个降级回调。
 */
//@ chunk-e6aww6q8.js:2665503-2668815 layout
function normalizeMessagesForRequest(e, n) {
  let r = n.bodyModel ?? n.model,
    s = Bn(r),
    h = n.keepForeignThinking ?? "none",
    y = stripForeignModelThinking(e, s, h),
    S = makeForeignModelChecker(s),
    w =
      h !== "none" &&
      e.some(
        (pt) =>
          pt.type === "assistant" &&
          S(pt) &&
          shouldKeepForeignThinking(pt, s, h) &&
          Array.isArray(pt.message.content) &&
          pt.message.content.some(hasThinkingSignature),
      ),
    L =
      kmr(r, void 0) ||
      modelHasNative1MContext(r) ||
      n.betas.includes(yv) ||
      getSonnet46ContextWindowOverride(r) !== null ||
      antGrants1MContext(r),
    G = resolveReminderFold_2(e, n.reminderFold),
    q = shouldEchoWireToolInputs(e, n.echoWireToolInputs),
    Z = renderedAttachmentTexts(y),
    Se = (pt, Et) => {
      if (!n.useToolSearch)
        pt = pt.map((yt) => {
          switch (yt.type) {
            case "user":
              return stripToolReferenceBlocksFromUserMessage(yt);
            case "assistant":
              return stripCallerFieldFromAssistantMessage(yt);
            default:
              return yt;
          }
        });
      if (
        ((pt = ensureToolResultPairing(pt, {
          reminderFold: G,
          textsToFold: Z,
          keyedRemindersStaySiblings: Et !== void 0 && shouldUseMidConvSystem(Et),
        })),
        !n.advisorModel)
      )
        pt = stripAdvisorBlocks(pt);
      if (n.stripWebSearch) pt = stripWebSearchBlocks(pt).messages;
      return stripExcessMediaItems(
        pt,
        Math.min(L ? Alo : iOi, n.mediaItemLimit ?? 1 / 0),
        Bhs,
        getMediaTotalByteCap(),
        Whs,
        getDocumentByteCap(),
      );
    },
    ke = n.accountMemoryWithheld ?? wsr(),
    we = {
      accountMemoryWithheld: ke,
      preserveTrailingThinking: n.resumeIncompleteThinking,
      onSessionNoticeRender: logSessionNoticeRender,
      onDeclaredRoundRender: logDeclaredRound,
      echoWireToolInputs: q,
      ingestPool: n.ingestPool,
      echoApiBlockOrder: isStellarDriftEnabled(),
      ...(n.deferredToolReferencePlan && {
        keptToolNames: new Set(n.deferredToolReferencePlan.kept.keys()),
        strippedToolReferenceKeys: n.deferredToolReferencePlan.strippedReferenceKeys,
      }),
      ...(n.declaredToolNames && { declaredToolNames: n.declaredToolNames }),
      surfaceLateToolAdditions: n.betas.includes(Lb) && modelTakesToolAdditions(r),
      advisorToolChanges:
        n.advisorDeferred === !0 &&
        n.advisorModel !== void 0 &&
        n.betas.includes(Lb) &&
        modelTakesToolAdditions(r),
      deferredWireToolNames: n.deferredWireToolNames,
      nameOnlyAnnouncements: n.nameOnlyAnnouncements,
      inlineToolDefinitions:
        n.byValueNames !== void 0 &&
        n.byValueNames.size > 0 &&
        n.betas.includes(tb) &&
        modelTakesToolAdditions(r)
          ? n.byValueNames
          : void 0,
      withoutAttachmentHooks: n.withoutAttachmentHooks,
      ...(n.pollEventsAsText === !0 && { pollEventsAsText: !0 }),
      thinkingStripPlan: n.thinkingStripPlan,
      advisorStripPlan: n.advisorStripPlan,
      keptReminders: n.keptReminders === !0 && n.betas.includes(MK),
      reminderFold: G,
    },
    Ee = n.midConvLatchedOff ? void 0 : r,
    Ae = normalizeMessagesForAPI(y, n.tools, Ee, we);
  (validateImagesInMessages(Ae, imageLimitsForModel(n.model).maxBase64Size),
    queryCheckpoint("query_message_normalization_end"),
    (Ae = applyApiBlockOrderEcho(Se(Ae, Ee), we.echoApiBlockOrder, we.preserveTrailingThinking)));
  let included = n.betas.includes(CG),
    Me = getCanonicalName(r),
    We = {
      effort: included && supportsPerTurnEffort(r, Me) ? n.perTurnEffort : void 0,
      now: included && n.betas.includes(Z4) && supportsPerTurnTiming(r, Me) ? n.perTurnNow : void 0,
    },
    ze = (pt) =>
      We.effort === void 0 && We.now === void 0
        ? pt
        : attachPerTurnOutputConfig(pt, { ...We, effortCap: n.perTurnEffortCap?.() });
  Ae = ze(Ae);
  let lt = null;
  if (!n.midConvLatchedOff && (n.betas.includes(LO) || included)) {
    let pt = Ae;
    lt = pt.some((Et) => Et.type === "api_system")
      ? () =>
          applyApiBlockOrderEcho(
            Se(normalizeMessagesForAPI(y, n.tools, void 0, we), void 0),
            we.echoApiBlockOrder,
            we.preserveTrailingThinking,
          )
      : () => pt;
  }
  let Je = null;
  if (
    (we.surfaceLateToolAdditions || we.advisorToolChanges) &&
    Ae.some(
      (pt) =>
        pt.type === "api_system" &&
        ((pt.toolAdditions?.length ?? 0) > 0 || (pt.toolRemovals?.length ?? 0) > 0),
    )
  )
    Je = () =>
      ze(
        Se(
          normalizeMessagesForAPI(y, n.tools, Ee, {
            ...we,
            surfaceLateToolAdditions: !1,
            advisorToolChanges: !1,
            inlineToolDefinitions: void 0,
          }),
          Ee,
        ),
      );
  let nt = null;
  if (
    we.inlineToolDefinitions !== void 0 &&
    Ae.some((pt) => pt.type === "api_system" && pt.toolDefinitions !== void 0)
  )
    nt = () =>
      ze(
        Se(
          normalizeMessagesForAPI(y, n.tools, Ee, {
            ...we,
            inlineToolDefinitions: void 0,
            nameOnlyAnnouncements: new Set([
              ...(we.nameOnlyAnnouncements ?? []),
              ...(n.byValueAnnouncements ?? []),
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
      createMemoryServerVerifier(() => n.tools),
    ).epoch,
    midConvFallback: lt,
    toolChangeFallback: Je,
    inlineToolsFallback: nt,
    keptForeignSignatures: w,
    blocksEligible: we.surfaceLateToolAdditions === !0,
  };
}
/**
 * 何时在请求头 anthropic-usage-limit 发 extended（多个 tengu_lantern_* 开关、第一方订阅）。
 */
//@ chunk-e6aww6q8.js:2668815-2669526 layout
function shouldSendExtendedUsageLimitHeader(e, n, r) {
  if (n) return !1;
  let s = e.querySource === "web_fetch_apply";
  if (s) {
    let w = classifyQuerySource(e.callerAnsweredQuerySource);
    if (w !== "main" && w !== "subagent") return !1;
  }
  if (!s && (e.queryTracking?.depth ?? 0) === 0 && !r) return !1;
  if (classifyQuerySource(e.querySource) === "auxiliary" && e.querySource !== "compact" && !s) return !1;
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return !1;
  let cachedExtraUsageDisabledReason = getGlobalConfig().cachedExtraUsageDisabledReason,
    y =
      typeof cachedExtraUsageDisabledReason === "string" &&
      cachedExtraUsageDisabledReason !== "fetch_error" &&
      cachedExtraUsageDisabledReason !== "unknown";
  if (s && cachedExtraUsageDisabledReason !== null && !y) return !1;
  if (s && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_hinge", !1) !== !0) return !1;
  if (
    cachedExtraUsageDisabledReason === null &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_smooth_harbor", !1)
  )
    return !1;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_spool", !1)) return !1;
  let agentContext = e.agentContext;
  return !(
    isSubagentContext(agentContext) &&
    y &&
    agentContext.workflowWaitsOutUsageLimit?.(getCurrentLimits().resetsAt) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_snuffer", !1) === !0
  );
}
/**
 * GrowthBook 开关名 tengu_fizzy_bonbon。
 */
//@ chunk-e6aww6q8.js:2669526-2669555 layout
var TENGU_FIZZY_BONBON = "tengu_fizzy_bonbon";
/**
 * 惰性估算消息 token 数（失败时 +∞）。
 */
//@ chunk-e6aww6q8.js:2669555-2669683 layout
function lazyContextTokenEstimate(e, n) {
  let r;
  return () => {
    if (r === void 0)
      try {
        r = Tp(e, bytesPerTokenForModel(n)) + stripInProgressAssistantMessage(e);
      } catch (error) {
        (logError(toError(error)), (r = Number.POSITIVE_INFINITY));
      }
    return r;
  };
}
/**
 * 若当前上下文已超过 fallback 模型窗口（GCn）则不用 accessFallbackModel，返回 undefined。
 */
//@ chunk-e6aww6q8.js:2669683-2669780 layout
function resolveAccessFallbackModel(e, n, r) {
  if (n === void 0) return;
  try {
    return ladderStepLosesContext(e, n, r) ? void 0 : n;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
/**
 * 有 ladders 时记录会话大小（token 估算）。
 */
//@ chunk-e6aww6q8.js:2669780-2669840 layout
function recordConversationSize(e, n) {
  try {
    if (rvi()) ovi(e, n());
  } catch (error) {
    logError(toError(error));
  }
}
/**
 * CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL=5m 时把消息缓存 TTL 降为 5m。
 */
//@ chunk-e6aww6q8.js:2669840-2669901 layout
function applyMessagesCacheTtlOverride(e) {
  try {
    return Eee(e);
  } catch (error) {
    return (logError(toError(error)), e);
  }
}
/**
 * 消息 TTL 被降级时把主线程请求日志里的缓存 TTL 调成 5 分钟。
 */
//@ chunk-e6aww6q8.js:2669901-2669946 layout
function noteMainThreadCacheTtl5m() {
  try {
    adjustLastMainThreadCacheTtlMs(CACHE_TTL_5M_MS);
  } catch (error) {
    logError(toError(error));
  }
}
/**
 * 服务器拒绝工具搜索时抛出，携带 refusal 与是否已声明工具搜索。
 */
//@ chunk-e6aww6q8.js:2669946-2670095 layout
class ToolSearchRefusedError extends Error {
  refusal;
  declaredToolSearch;
  constructor(e, n) {
    super("tool search refused", { cause: e });
    this.refusal = e;
    this.declaredToolSearch = n;
  }
}
/**
 * 包 queryModel：捕获 ToolSearchRefusedError 后加一条 critical_system_reminder（延迟工具改为直接声明）重跑一次。
 */
//@ chunk-e6aww6q8.js:2670095-2670743 layout
async function* queryModelWithToolSearchRecovery(...e) {
  let n;
  try {
    return yield* queryModel(...e);
  } catch (error) {
    if (!(error instanceof ToolSearchRefusedError)) throw error;
    n = error;
  }
  let [r, s, h, y, S, w] = e,
    L = n.declaredToolSearch
      ? [
          createAttachmentMessage_2({
            type: "critical_system_reminder",
            content: `${TOOL_SEARCH_TOOL_NAME} is no longer available. Tools listed earlier as deferred that are still available are declared in full: call them directly.`,
          }),
        ]
      : [],
    G = !1,
    q = queryModel([...r, ...L], s, h, y, S, { ...w, toolSearchRefusal: n.refusal });
  try {
    for (let Z = await q.next(); ; Z = await q.next()) {
      if (Z.done) return Z.value;
      let Se = Z.value;
      if (
        !G &&
        (Se.type === "assistant"
          ? !Se.isApiErrorMessage
          : Se.type === "stream_event" && Se.event.type === "message_start")
      )
        ((G = !0), yield* L);
      yield Se;
    }
  } finally {
    await q.return(void 0);
  }
}
/**
 * queryModel：一次 Messages API 调用的全部逻辑（约 129KB）。依次：off-switch 与模型封锁检查 → beta 列表与模型事实 → 工具 schema 构建、工具搜索/延迟工具决策 → normalizeMessagesForRequest 规整消息 → buildSystemPromptBlocks → buildRequestParams（paramsFromContext 过滤被拒 beta、thinking/effort/output_config/context_management/speed/diagnostics、addCacheBreakpoints）→ withRetry 内 anthropic.beta.messages.create(stream:true) → 解析 SSE（message_start/content_block_*\/message_delta/message_stop）产出 stream_event 与 assistant 消息、累计 usage 与成本 → 流停顿/空闲超时/无事件时回退非流式 → onError 里按错误类型返回 "retry:<原因>"（去 beta、去 thinking.display、去媒体、降 effort 等）自愈重发。
 */
//@ chunk-e6aww6q8.js:2670743-2799701 callgraph-witnessed = queryModel (0.184)
async function* queryModel(
  messages,
  systemPrompt,
  thinkingConfig,
  tools,
  signal,
  { modelFacts: modelFacts, ...S },
) {
  let { fallbackModel: fallbackModel, accessFallbackModel: accessFallbackModel = S.accessFallbackModel } =
      resolveFallbackModel(S.model, S.fallbackModel, B4r),
    lazyTokenEstimate = lazyContextTokenEstimate(messages, S.model),
    q = resolveAccessFallbackModel(S.model, accessFallbackModel, lazyTokenEstimate),
    options = fallbackModel === S.fallbackModel ? S : { ...S, fallbackModel: fallbackModel },
    clock = options.clock ?? Aa,
    runGuarded = (Wn) => (isAutoModeQuerySource(options.querySource) ? withCatalogSuppressed(Wn) : Wn()),
    previousRequestId = runGuarded(() => getCanonicalName(options.model)),
    isTopLevelMain = classifyQuerySource(options.querySource) === "main" && !options.agentId;
  if (isTopLevelMain) jS("model_gates");
  if (
    !isClaudeAISubscriber() &&
    (isNonCustomOpusModel(previousRequestId) ||
      isNonCustomFableModel(previousRequestId) ||
      isNonCustomMythosModel(previousRequestId)) &&
    (await getDynamicConfig_BLOCKS_ON_INIT("tengu-off-switch", { activated: !1 })).activated
  ) {
    (logEvent("tengu_off_switch_query", {}),
      yield getAssistantMessageFromApiError(
        Error(isNonCustomFableModel(previousRequestId) ? FABLE_HIGH_LOAD_MESSAGE : OPUS_HIGH_LOAD_MESSAGE),
        options.model,
      ));
    return;
  }
  let Ae = null;
  try {
    Ae = await oci(previousRequestId);
  } catch (error) {
    logForDebugging(`tengu-model-error-overrides block check failed: ${error}`, { level: "error" });
  }
  if (Ae !== null) {
    if (options.fallbackModel !== void 0)
      throw (
        logEvent("tengu_off_switch_query", { tier: lit_2("per_model_block"), outcome: lit_2("fallback") }),
        new FallbackTriggeredError(options.model, options.fallbackModel, "model_blocked", void 0, Ae)
      );
    (logEvent("tengu_off_switch_query", { tier: lit_2("per_model_block") }),
      yield createApiErrorMessage({ content: Ae, error: "rate_limit" }));
    return;
  }
  let Ie = collectRecentAssistantTexts(messages),
    Me = promptIdForRequest(messages, options.agentContext),
    We = getCcrSenderAddressKey(options.agentContext, Me);
  if (We && isFirstPartyApiBackend()) await prefetchCcrSenderAddress(We);
  let ze = gSr(messages),
    lt = hSr(messages),
    Je = isSessionTaskTurn(messages),
    nt = lastAssistantMessageId(messages),
    resolvedModel =
      getAPIProvider() === "bedrock" && options.model.includes("application-inference-profile")
        ? ((await getInferenceProfileBackingModel(Bn(options.model))) ?? options.model)
        : options.model;
  if ((logUnrecognizedModel(options.model, options.querySource), jve()))
    await awaitModelConfigFetch(options.model, options.credentials, options.storageV5);
  if ((queryCheckpoint("query_tool_schema_build_start"), isTopLevelMain))
    (WS("model_gates"), jS("tool_schema_build"));
  let isAgenticQuery =
      options.querySource.startsWith("repl_main_thread") ||
      options.querySource.startsWith("agent:") ||
      options.querySource === "sdk" ||
      options.querySource === "hook_agent",
    conversation = OYo(options.stickyBetas);
  if (!conversation.declaredToolsDecided)
    runGuarded(() => seedWireShapeFromRecord(conversation, options.recordedWireShape, options.model));
  let betaList = runGuarded(() => getMergedBetas(options.model, { isAgenticQuery: isAgenticQuery })),
    At = runGuarded(() => getCanonicalName(resolvedModel)),
    modelFacts_2 =
      modelFacts?.model === resolvedModel && !isAutoModeQuerySource(options.querySource)
        ? modelFacts
        : runGuarded(() => getModelContextInfo(resolvedModel));
  if (isAdvisorEnabled() && (isAdvisorToolEnabled() || options.advisorModel !== void 0)) betaList.push(d3e);
  if (runGuarded(() => _Jn(resolvedModel)) && modelFacts_2.thinking.supported && !betaList.includes(AU))
    betaList.push(AU);
  let Yt =
      options.fallbackCreditCode !== void 0 &&
      options.fallbackCreditMintModel !== void 0 &&
      canUseFallbackCreditMintModel(options.fallbackCreditMintModel, options.model),
    creditMintModel = Yt ? options.fallbackCreditMintModel : void 0,
    effectiveModel = creditMintModel ?? options.model,
    betas = upgradeDisabledThinkingForModel(
      thinkingConfig,
      modelFacts_2.thinking.alwaysOn ||
        (creditMintModel !== void 0 && runGuarded(() => isThinkingAlwaysOn(creditMintModel))),
    ),
    pn = creditMintModel === void 0 ? toProviderWireModelId(options.model) : void 0;
  if (pn !== void 0 && !conversation.declaredToolsDecided) {
    let Wn = hasContextBeta(conversation);
    for (let pr of getRefusedBetasForModel(pn)) Xg(conversation, pr);
    if (options.stickyBetas === void 0) notifyPerTurnEffortInactive(conversation, Wn);
  }
  let latchBetaRefused = (Wn, pr) => {
    Xg(conversation, Wn);
    let Jr = "in this conversation";
    if (pr && pn !== void 0)
      (markBetaRefusedForModel(pn, Wn), (Jr += `, or by new ones on ${pn} in this process`));
    logForDebugging(`[betas] the API refused ${Wn.header}; not sent again ${Jr}`, { level: "warn" });
  };
  (registerMcpStandardKeys(tools), await awaitArtifactRosterSafe(tools));
  let hn = options.withoutToolDescribeHooks ? "engine" : "hooks",
    ho = (Wn, pr) => (hn === "engine" ? isDeferredToolByEngine(Wn, pr) : isDeferredTool(Wn, pr));
  if (!options.withoutToolDescribeHooks)
    await prefetchToolDescribeHooks(tools, (Wn) =>
      toolToApiDefinition(Wn, {
        getToolPermissionContext: options.getToolPermissionContext,
        tools: tools,
        agents: options.agents,
        allowedAgentTypes: options.allowedAgentTypes,
        model: effectiveModel,
        enginePlacement: isDeferredToolByEngine(Wn) ? "deferred" : "listed",
        querySource: options.querySource,
      }),
    );
  let yn =
      isAgenticQuery || options.forkPointUuid !== void 0
        ? runGuarded(() => getAdvisorModelForQuery(options.advisorModel, effectiveModel))
        : void 0,
    Kn =
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
      options.toolSearchRefusal === void 0,
    Xn = shouldEchoWireToolInputs(messages, options.echoWireToolInputs),
    fo = options.resumeIncompleteThinking === !0;
  betaList = runGuarded(() => adjustToolBetas(conversation, betaList, options.model));
  let To = !1;
  if (!Kn && options.toolSearchRefusal === void 0 && !isAutoModeQuerySource(options.querySource))
    try {
      To = runGuarded(() =>
        shouldAnnounceDeferredTools(conversation, effectiveModel, {
          toolSearchToolFilteredOut: toolSearchToolFilteredOut(effectiveModel, tools, conversation),
          toolPoolRefreshes: options.toolPoolRefreshes === !0,
          aheadOfRequest: !1,
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
      if (Wn !== void 0)
        seedDeferredToolReferences(messages, [...Wn.entries.values()], {
          strippedReferences: Wn.strippedReferences,
          ...((Kn || To) && Nrt(conversation) && { surfacedCarrier: conversation }),
        });
    } catch (error) {
      logError(toError(error));
    }
    try {
      let pr = Wn?.toolInputCopies;
      if (pr !== void 0 && pr.size > 0 && PYo(options.querySource) && rPt(messages, Xn))
        adoptWireToolInputCopies(messages, pr);
    } catch (error) {
      logError(toError(error));
    }
  }
  let bo = new Set(),
    vn = new Set(),
    co = !0;
  try {
    co = isToolDefinedByValueEnabled();
  } catch (error) {
    logError(toError(error));
  }
  try {
    if (betaList.includes(tb) && runGuarded(() => poi(conversation, effectiveModel)))
      ((bo = deltaToolNames(messages, conversation.nameOnlyAnnouncements)),
        (vn = $ri(messages, conversation.nameOnlyAnnouncements)));
  } catch (error) {
    logError(toError(error));
  }
  let So,
    ko = 0;
  if (Kn)
    try {
      let Wn = getNonDeferrableBuiltins(),
        pr = computeDeclaredToolSet(
          conversation,
          tools,
          (Jr) => ho(Jr, Wn),
          effectiveModel,
          !messages.some((Jr) => Jr.type === "assistant"),
        );
      if (((So = pr), pr !== void 0))
        ko = count(_nr(tools, conversation), (Jr) => pr.has(Jr.name) && ho(Jr, Wn));
    } catch (error) {
      logError(toError(error));
    }
  let un,
    ao = !conversation.declaredToolsDecided,
    advisorExperiment = coi(),
    yo = 0;
  if (Kn || To) {
    let Wn;
    if (!conversation.declaredToolsDecided)
      try {
        Wn = await options.getToolPermissionContext();
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
        { latch: !0, permissionContext: Wn },
      );
    } catch (error) {
      (logError(toError(error)), (So = void 0));
    }
  } else if (ao) conversation.declaredTools = void 0;
  PDt(conversation);
  let Ho = un ?? So,
    deferredToolNames = new Set(),
    br = 0;
  if (Kn || To)
    try {
      let Wn = getNonDeferrableBuiltins();
      for (let pr of tools) {
        let Jr = Kn && ho(pr, Wn);
        if (
          Ho === void 0
            ? To
              ? !1
              : Jr
            : isDeferredToolInConversation(pr, Ho, tools, {
                toolSearchAbsent: To,
                placements: hn,
                nonDeferrableBuiltins: Wn,
              })
        ) {
          if ((deferredToolNames.add(pr.name), !Jr)) br++;
        }
      }
    } catch (error) {
      (logError(toError(error)), (un = void 0), (Ho = void 0), deferredToolNames.clear(), (br = 0));
      let pr = getNonDeferrableBuiltins();
      for (let Jr of tools) if (Kn && ho(Jr, pr)) deferredToolNames.add(Jr.name);
    }
  let generation = jW().generation,
    Fr =
      Kn || To
        ? logKeptDeferredTools(messages, tools, options.querySource, {
            keepMcp: !f4(tools),
            surfacedOnWire: conversation.surfacedOnWire,
            ...(advisorExperiment && { declaredInline: un }),
          })
        : void 0;
  if (
    Kn &&
    deferredToolNames.size === 0 &&
    !(Ho !== void 0 && Ho === So && ko > 0) &&
    (!options.hasPendingMcpServers || f4(tools)) &&
    !Fr?.kept.size &&
    !un?.has(TOOL_SEARCH_TOOL_NAME)
  ) {
    if (
      (logForDebugging("Tool search disabled: no deferred tools available to search"),
      (Kn = !1),
      advisorExperiment && un !== void 0 && Fr !== void 0)
    )
      try {
        Fr = logKeptDeferredTools(messages, tools, options.querySource, {
          keepMcp: !f4(tools),
          surfacedOnWire: conversation.surfacedOnWire,
        });
      } catch (error) {
        logError(toError(error));
      }
  }
  let cs = Kn ? "tool_search" : To ? "tool_addition" : void 0,
    _r,
    Cr,
    Vr = 0;
  if (cs !== void 0) {
    let Wn = extractDiscoveredToolNames(messages, {
        surfaced: Nrt(conversation)
          ? { exceptAnnouncements: conversation.nameOnlyAnnouncements }
          : conversation.surfacedOnWire,
      }),
      pr = new Set();
    if (bo.size > 0)
      try {
        pr = co
          ? new Set(collectToolReferences(messages).map((Jr) => Jr.toolName))
          : extractDiscoveredToolNames(messages);
      } catch (error) {
        logError(toError(error));
      }
    _r = tools.filter((tool) => {
      if (!deferredToolNames.has(tool.name)) return !0;
      if (toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME)) return !0;
      return Wn.has(tool.name) && (!bo.has(tool.name) || pr.has(tool.name));
    });
    try {
      let Jr = updateDeclaredToolSet(_r, un ?? So);
      ((_r = Jr.tools), (yo = Jr.redeclared.length));
    } catch (error) {
      logError(toError(error));
    }
  } else {
    _r = tools.filter((pr) => {
      if (toolMatchesName(pr, TOOL_SEARCH_TOOL_NAME)) return !1;
      if (bo.has(pr.name)) return !1;
      return !0;
    });
    let Wn = kbn(conversation);
    if (Wn !== void 0)
      try {
        let pr = await isHipaaRestricted(Wn, tools, {
          mcpClients: options.mcpClients ?? [],
          getPermissionContext: options.getToolPermissionContext,
          byValue: bo,
        });
        ((Cr = bo.size === 0 ? pr.kept : pr.kept.without(bo)), (Vr = pr.unread));
        let Jr = updateDeclaredToolSet(_r, Cr);
        ((_r = Jr.tools), (yo = Jr.redeclared.length));
      } catch (error) {
        logError(toError(error));
      }
    else if (ao && options.recordedToolDescriptions === void 0)
      try {
        _r = _nr(_r, conversation);
      } catch (error) {
        logError(toError(error));
      }
  }
  let Oo = TJ(hideAliasedV1Tools(_r));
  eSr(Oo, options.querySource);
  let jr = getProviderForModel(options.model),
    Or = Kn ? getToolSearchBeta() : null;
  if (Or && jr !== "bedrock") {
    if (!betaList.includes(Or)) betaList.push(Or);
  }
  let Io,
    featureEnabled = shouldUseGlobalCacheScope(),
    rs = (Wn) => deferredToolNames.has(Wn.name) || (Kn && shouldDeferLspTool(Wn)),
    Es = (Wn) => Fr?.kept.has(Wn.name) === !0,
    Nr = !0;
  try {
    Nr =
      Oo.some((Wn) => (un?.has(Wn.name) ?? !0) && !rs(Wn) && !Es(Wn)) ||
      (un !== void 0 &&
        isLateToolAdditionsEnabled(un, {
          pool: tools,
          keptDeferred: Fr?.kept.keys() ?? [],
          keepMcp: !f4(tools),
        }).length > 0);
  } catch (error) {
    logError(toError(error));
  }
  let willDefer = (Wn) => cs !== void 0 && (rs(Wn) || (Nr && Es(Wn)));
  if (cs !== void 0 && un === void 0)
    try {
      let filtered = TJ(_r).filter((pr) => !willDefer(pr));
      if (Ho !== void 0) {
        if ((dLn(conversation, new DeclaredToolSet(filtered)), ko > 0))
          logFeatureOk("host_upfront_tools", { named: env.CLAUDE_CODE_UPFRONT_TOOLS?.length ?? 0, sent: ko });
      } else soi(conversation, filtered);
    } catch (error) {
      logError(toError(error));
    }
  let fs;
  if (
    cs === void 0 &&
    ao &&
    kbn(conversation) === void 0 &&
    (options.mcpClients ?? []).some((Wn) => Wn.type === "pending")
  )
    try {
      fs = await markReconnectingServers(options, tools, bo);
    } catch (error) {
      logError(toError(error));
    }
  try {
    Cr = cacheNoChannelTools(conversation, cs !== void 0, () =>
      buildDeclaredToolSet(TJ(_r), tools, fs ?? Cr?.recordedOnly),
    );
  } catch (error) {
    logError(toError(error));
  }
  let as = featureEnabled && Oo.some((Wn) => Wn.isMcp === !0 && !willDefer(Wn));
  if (featureEnabled && !betaList.includes(cOe)) betaList.push(cOe);
  let Vi = featureEnabled ? (as ? "none" : "system_prompt") : "none",
    ji = getNonDeferrableBuiltins(),
    Wi = options.withoutToolDescribeHooks ? void 0 : options.redescribedTools,
    toolSchemas = await Promise.all(
      Oo.map((tool) =>
        toolToApiDefinition(tool, {
          getToolPermissionContext: options.getToolPermissionContext,
          tools: tools,
          agents: options.agents,
          allowedAgentTypes: options.allowedAgentTypes,
          model: effectiveModel,
          enginePlacement: isDeferredToolByEngine(tool, ji) ? "deferred" : "listed",
          querySource: options.querySource,
          withoutToolDescribeHooks: options.withoutToolDescribeHooks,
          recordedDescription: willDefer(tool) ? void 0 : options.recordedToolDescriptions?.get(tool.name),
          recordedEntry:
            willDefer(tool) || toolMatchesName(tool, STRUCTUREDOUTPUT)
              ? void 0
              : options.recordedToolEntries?.get(tool.name),
          isRedescribed: Wi?.has(tool.name) || void 0,
          deferLoading: willDefer(tool),
          loadedThroughToolSearch: Kn && willDefer(tool) && ho(tool, ji),
        }),
      ),
    ),
    wa = isMainAgent(options.agentContext) && classifyQuerySource(options.querySource) === "main";
  if (
    (noteToolRedescribed(conversation, toolSchemas, {
      redescribed: Wi,
      recorded: options.recordedToolDescriptions,
      isMainChain: wa,
    }),
    wa)
  )
    try {
      let Wn;
      for (let pr of toolSchemas)
        if ("name" in pr && "description" in pr && toolMatchesName(pr, BASH_TOOL_NAME)) {
          Wn = pr.description;
          break;
        }
      Mts(Wn);
    } catch (error) {
      (logError(toError(error)), Mts(""));
    }
  let hr = [];
  if (cs !== "tool_search" && bo.size > 0)
    try {
      let Wn = new Set(Oo.map((Os) => Os.name)),
        filtered = tools.filter((Os) => bo.has(Os.name) && !Wn.has(Os.name)),
        Jr = new Set(TJ(hideAliasedV1Tools([..._r, ...filtered])).map((Os) => Os.name));
      hr = await Promise.all(
        filtered
          .filter((Os) => Jr.has(Os.name))
          .map((Os) =>
            toolToApiDefinition(Os, {
              getToolPermissionContext: options.getToolPermissionContext,
              tools: tools,
              agents: options.agents,
              allowedAgentTypes: options.allowedAgentTypes,
              model: effectiveModel,
              enginePlacement: isDeferredToolByEngine(Os) ? "deferred" : "listed",
              querySource: options.querySource,
              withoutToolDescribeHooks: options.withoutToolDescribeHooks,
              recordedDescription: options.recordedToolDescriptions?.get(Os.name),
              recordedEntry: options.recordedToolEntries?.get(Os.name),
              isRedescribed: Wi?.has(Os.name) || void 0,
              deferLoading: !1,
            }),
          ),
      );
    } catch (error) {
      (logError(toError(error)), (hr = []));
    }
  let mi = new Map(Oo.map((Wn, pr) => [Wn.name, { schema: toolSchemas[pr], isMcp: Wn.isMcp === !0 }])),
    Ha = cs !== void 0 ? un : Cr,
    $a = runGuarded(() => ZSe(effectiveModel)),
    nr = [];
  if (Ha !== void 0 && Ha.recordedOnly.size > 0)
    try {
      nr = computeLateToolAdditions(toolSchemas, Ha, {
        pool: tools,
        recordedEntries: options.recordedToolEntries,
        keptDeferred: Nr ? (Fr?.kept.keys() ?? []) : [],
        keepMcp: !f4(tools),
        requestCarriesStructuredOutputs: runGuarded(() => willSendStructuredOutputsBeta(effectiveModel)),
        requestDeclaresSearchCitations: $a,
      });
    } catch (error) {
      logError(toError(error));
    }
  if (
    (logDeclaredToolSetHeld({
      deferredLate: br,
      redeclared: yo,
      fromRecord: nr.length,
      queryDepth: options.queryTracking?.depth,
      toolSearchAbsent: cs === "tool_addition",
      noDeferredChannel: cs === void 0,
      unclassifiedDepartures: Vr,
    }),
    options.onInlineToolsDeclared)
  ) {
    let Wn = new Map(Oo.map((Jr) => [Jr.name, Jr])),
      pr = [];
    for (let Jr of toolSchemas) {
      if (!("input_schema" in Jr)) continue;
      let Os = Wn.get(Jr.name),
        La = Os === void 0 ? Ha?.recordedOnly.get(Jr.name) : void 0;
      if (Os !== void 0 && !willDefer(Os))
        pr.push({
          name: Jr.name,
          description: Jr.description ?? "",
          schema: Jr,
          ...(Os.mcpInfo && { server: Os.mcpInfo.serverName }),
        });
      else if (La !== void 0) {
        let Vl = options.recordedToolEntries?.get(Jr.name) ?? La.entry;
        pr.push({
          name: Jr.name,
          description: Vl.description ?? "",
          schema: Vl,
          ...(La.server !== void 0 && { server: La.server }),
        });
      }
    }
    options.onInlineToolsDeclared(pr);
  }
  if (cs !== void 0) {
    if (Fr)
      buildDeferredToolsForRequest(Fr, toolSchemas, mi, {
        requestCarriesStructuredOutputs: runGuarded(() => willSendStructuredOutputsBeta(effectiveModel)),
        requestDeclaresSearchCitations: $a,
      });
    let Wn = getDeferredToolPlaceholderSchema();
    if (
      Wn &&
      !_r.some((Jr) => toolMatchesName(Jr, DEFERREDTOOLPLACEHOLDER)) &&
      !Fr?.kept.has(DEFERREDTOOLPLACEHOLDER)
    )
      toolSchemas.splice(Math.max(toolSchemas.length - 1, 0), 0, Wn);
    let includedDeferredTools = count(_r, (Jr) => deferredToolNames.has(Jr.name));
    logForDebugging(
      `Dynamic tool loading: ${includedDeferredTools}/${deferredToolNames.size} deferred tools included`,
    );
  }
  if ((queryCheckpoint("query_tool_schema_build_end"), isTopLevelMain)) WS("tool_schema_build");
  if (
    (logEvent("tengu_api_before_normalize", { preNormalizedMessageCount: messages.length }),
    queryCheckpoint("query_message_normalization_start"),
    creditMintModel !== void 0)
  )
    logEvent("tengu_fallback_credit_strip_as_mint_model", {});
  let Ti,
    Vs = (Wn) => {
      _1 = Wn.thread?.type === "continue";
      let pr = p7t(
        conversation,
        { ...applyThreadBody(Wn, kLe()), messages: HS },
        {
          querySource: options.querySource,
          isMainThread: isMainAgent(options.agentContext),
          history: messages,
          retryCause: Ac,
          retryKeepsHeal: uh === !0,
          promptEpoch: options.promptRenderEpoch,
          accountMemoryEpoch: em,
        },
      );
      if (threadSourceKind(options.querySource) !== null && isTetherLive())
        try {
          Ucn(options.agentId, pr !== void 0);
        } catch (error) {
          logError(toError(error));
        }
      if (pr?.tools !== void 0) S$ = [...pr.tools];
      if (pr?.tools !== void 0 && Wn.tools !== void 0) {
        if (((Wn.tools = [...pr.tools]), Fr)) recordDeferredToolsSent(Fr, Wn.tools);
      }
      let Jr = Wn.tools ?? S$;
      if (Ti !== void 0 && Jr !== void 0) restoreDeferredDefinitions(Ti, Jr);
      if (pr === void 0) return;
      if (pr.system !== void 0) {
        let Os = typeof pr.system === "string" ? pr.system : [...pr.system];
        if (((vw = Os), !d1)) Wn.system = Os;
      }
      if (pr.messages !== void 0) {
        HS = [...pr.messages];
        let messagesForAPI = l7t(HS, Wn.messages.length);
        if (containsMalformedStringDeep(messagesForAPI))
          try {
            let La = clone(messagesForAPI);
            (repairMalformedStringsDeep(La), (messagesForAPI = La));
          } catch {}
        Wn.messages = messagesForAPI;
      }
    },
    _i = Lp(conversation, LO),
    jo = _i || Lp(conversation, CG),
    Qr = jo || Lp(conversation, Z4),
    fi = Lp(conversation, MK);
  if (
    ((betaList = betaList.filter(
      (msg) => !Lp(conversation, msg) && !(jo && msg === CG) && !(Qr && msg === Z4),
    )),
    creditMintModel !== void 0)
  ) {
    let fingerprint = runGuarded(() => getMergedBetas(creditMintModel, { isAgenticQuery: isAgenticQuery })),
      pr = (Jr) => {
        if (fingerprint.includes(Jr)) {
          if (!betaList.includes(Jr)) betaList.push(Jr);
        } else betaList = betaList.filter((Os) => Os !== Jr);
      };
    if (!_i) pr(LO);
    if (!jo) pr(CG);
    if (!Qr) pr(Z4);
    ((betaList = runGuarded(() => toolAdditionBetas(conversation, betaList, creditMintModel, options.model))),
      pr(n8));
  }
  let Ri =
    !isAutoModeQuerySource(options.querySource) &&
    !fi &&
    betaList.includes(LO) &&
    runGuarded(() => vEe(creditMintModel ?? options.model));
  if (Ri && !betaList.includes(MK)) betaList.push(MK);
  let Ja = runGuarded(() =>
      resolveLoopEffort(
        {
          loopEffort: options.refusalFallbackEffort,
          continuesMainConversation: isMainConversationContext(options.agentContext),
        },
        resolvedModel,
      ),
    ),
    Di = runGuarded(() =>
      resolveEffortValue(resolvedModel, options.effortValue, {
        turnEffort: options.turnEffort,
        hookEffortValue: options.hookEffortValue,
        carriedEffort: Ja,
      }),
    ),
    yr = () => learnedEffortCap(resolvedModel, options.querySource),
    Kr = yV(Di, yr()),
    Li =
      Ja === null
        ? void 0
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
              isSavedSetAside: options.effortSetAsideByHold !== void 0,
            }),
          },
    Qs = runGuarded(() =>
      modelSupportsEffort(resolvedModel) && Kr !== void 0 ? normalizeEffortLevel(Kr) : void 0,
    ),
    Hi =
      isMainAgent(options.agentContext) &&
      (options.querySource.startsWith("repl_main_thread") || options.querySource === "sdk"),
    Xa = options.querySource.startsWith("repl_main_thread") || options.querySource === "sdk",
    ta = Hi ? "foreground" : options.agentContext.agentId;
  if (Xa) recordConversationSize(ta, lazyTokenEstimate);
  let Bs;
  if (Hi)
    try {
      Bs = getTurnStartOriginKind(messages);
    } catch (error) {
      logError(toError(error));
    }
  let Ca = (Wn) => {
      if (!Hi || Wn === void 0) return {};
      try {
        let pr = getDefaultEffortLevel(resolvedModel);
        return { isDefaultEffort: Wn === pr, defaultEffortLevel: pr };
      } catch (error) {
        return (logError(toError(error)), {});
      }
    },
    tu = typeof Kr === "string" && !(betas.type === "disabled" && betas.mechanical === !0) ? Qs : void 0,
    pd = betaList.includes(Z4) ? formatLocalTimestamp(new Date(), vXr()) : void 0,
    ga =
      toolSchemas.some((Wn) => !("defer_loading" in Wn && Wn.defer_loading === !0)) ||
      (options.extraToolSchemas ?? []).some((Wn) => !("defer_loading" in Wn && Wn.defer_loading === !0)),
    Hl = options.advisorDeferred === !0 && yn !== void 0 && betaList.includes(Lb) && ga,
    hd = options.advisorDeferred === !0 && options.advisorActive === !1 && !Hl ? void 0 : yn,
    Sd = !1,
    Ld = 0;
  if (cs === "tool_addition" && !betaList.includes(Lb))
    try {
      let flattened = toolSchemas.flatMap((Jr) => {
          if (!("defer_loading" in Jr) || Jr.defer_loading !== !0) return [Jr];
          if (!("input_schema" in Jr) || !tools.some((Vl) => toolMatchesName(Vl, Jr.name))) return [];
          let { defer_loading: defer_loading, ...La } = Jr;
          return [La];
        }),
        pr = new Set(toolSchemas);
      ((Ld = count(flattened, (Jr) => !pr.has(Jr))),
        (Sd = Ld > 0 || flattened.length !== toolSchemas.length),
        toolSchemas.splice(0, toolSchemas.length, ...flattened));
    } catch (error) {
      logError(toError(error));
    }
  let vs =
      creditMintModel === void 0
        ? void 0
        : runGuarded(() =>
            describeToolAdditionMoves(conversation, messages, {
              mintModel: creditMintModel,
              retryModel: options.model,
              advisorEntryMoved: options.advisorDeferred === !0 && yn !== void 0 && ga && !Hl,
              deferredEntriesMoved: Sd,
              hasDeferredChannel: cs !== void 0,
            }),
          ),
    ol = new Set([..._r.filter(willDefer).map((Wn) => Wn.name), ...(Fr?.kept.keys() ?? [])]);
  if (
    (findLatestApiSystemDelta(conversation, messages, ol, Kn, bo),
    cs !== void 0 && options.onDeferredToolsSent && l$e())
  )
    try {
      ((Ti = toolSchemas.filter(
        (Wn) => isDeferredCustomToolDefinition(Wn) && !toolMatchesName(Wn, DEFERREDTOOLPLACEHOLDER),
      )),
        options.onDeferredToolsSent({
          entries: Ti,
          nameOnlyAnnouncements: conversation.nameOnlyAnnouncements,
          strippedReferences: strippedToolReferences(Fr),
        }));
    } catch (error) {
      logError(toError(error));
    }
  let gd = Gte(
      () => {
        let Wn = options.resumeIncompleteThinking
          ? "keep"
          : (Wte?.relayThinkingDisposition({
              mainLoop: classifyQuerySource(options.querySource) === "main" && !options.agentId,
              fetch: options.fetchOverride,
            }) ?? "keep");
        return {
          relayThinking: Wn,
          relayThinkingPlan: Wn === "keep" ? void 0 : thinkingStripAllPlan(messages),
          builtForRelay:
            !options.resumeIncompleteThinking && (Wte?.isRelayedRequest(options.fetchOverride) ?? !1),
        };
      },
      { relayThinking: "keep", relayThinkingPlan: void 0, builtForRelay: !1 },
    ),
    { relayThinking: relayThinking, relayThinkingPlan: relayThinkingPlan, builtForRelay: builtForRelay } = gd,
    normalizeOptions = {
      model: options.model,
      bodyModel: effectiveModel,
      pollEventsAsText: !1,
      accountMemoryWithheld: wsr(),
      tools: TJ(_r),
      ingestPool: {
        tools: tools,
        ...(PYo(options.querySource) && {
          ownRequest: { mcpServersPending: options.hasPendingMcpServers === !0 },
        }),
      },
      ...(advisorExperiment && { declaredToolNames: uoi(toolSchemas) }),
      betas: betaList,
      midConvLatchedOff: _i,
      keptReminders: Ri,
      useToolSearch: Kn,
      advisorModel: hd,
      advisorDeferred: Hl,
      stripWebSearch: conversation.webSearchHistoryRejected,
      mediaItemLimit: uco(conversation, effectiveModel)?.limit,
      resumeIncompleteThinking: fo,
      perTurnEffort: tu,
      perTurnEffortCap: yr,
      perTurnNow: pd,
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
        relayThinkingPlan === void 0
          ? options.thinkingStripPlan
          : mergeMinMaps(options.thinkingStripPlan, relayThinkingPlan),
      advisorStripPlan: options.advisorStripPlan,
    };
  if (isTopLevelMain) jS("message_normalization");
  let {
    messagesPreNormalize: messagesPreNormalize,
    messagesForAPI: messagesForAPI,
    accountMemoryEpoch: accountMemoryEpoch,
    midConvFallback: midConvFallback,
    toolChangeFallback: toolChangeFallback,
    inlineToolsFallback: inlineToolsFallback,
    keptForeignSignatures: keptForeignSignatures,
    blocksEligible: blocksEligible,
  } = runGuarded(() => normalizeMessagesForRequest(messages, normalizeOptions));
  if (isTopLevelMain) (WS("message_normalization"), jS("request_build"));
  let messagesForAPI_2 = messagesForAPI,
    em = accountMemoryEpoch;
  if (
    (logAdvisorStripReplayed(messages, options),
    options.onToolInputCopiesSent && normalizeOptions.ingestPool?.ownRequest !== void 0 && Xn)
  )
    try {
      let Wn = wireInputSources(messages);
      if (Wn.size > 0) options.onToolInputCopiesSent(Wn);
    } catch (error) {
      logError(toError(error));
    }
  if (
    (surfaceDeferredTools(conversation, messages, messagesForAPI_2, {
      useToolSearch: Kn,
      toolSearchAbsent: cs === "tool_addition",
      blocksEligible: blocksEligible,
      byValueNames: bo,
      byValueStaysOut: co,
    }),
    cs !== void 0)
  )
    keepDepartedDeferredTools(messages, conversation.surfacedOnWire, mi, Fr, options.querySource, generation);
  let Ac,
    tp = !1,
    Yh = !1,
    Ef = !1,
    np = () => {
      if (!Yh || Ef) return;
      return ((Ef = !0), createAttachmentMessage_2({ type: "advisor_stripped" }));
    },
    Rf = !1,
    ap = !1;
  if (relayThinking === "strip_and_mark")
    if (relayThinkingPlan !== void 0 && relayThinkingPlan.size > 0) ((tp = !0), (Rf = !0));
    else ap = !0;
  let al = isStellarDriftEnabled(),
    mf,
    rg = (Wn, pr, Jr) => {
      if (mf !== void 0 && mf.input === Wn && mf.fallbackBeta === pr && mf.marksBeta === Jr) return mf.output;
      let La = normalizeFallbackBlocks(Wn, pr),
        Vl = !1,
        system = applyApiBlockOrderEcho(La, al, fo),
        nd = prepareRequestMessages(
          runGuarded(() => k4e(effectiveModel)) ? system : disableSearchResultCitations(system),
          messages,
        );
      return ((mf = { input: Wn, fallbackBeta: pr, marksBeta: Jr, output: nd, markable: Vl }), nd);
    },
    uh,
    Kf = !1,
    ch = (Wn, pr, Jr = !1) => {
      if (((Kf = !0), pr === "microcompact")) lse(conversation, pr);
      else ((Ac = pr), (uh = (uh ?? !0) && Jr));
      return applyApiBlockOrderEcho(Wn, al, fo);
    },
    uS = midConvFallback,
    Ks = toolChangeFallback,
    kl = inlineToolsFallback,
    Yd = !1,
    xc = !1,
    Ip = "idle",
    Gc = !1,
    oc,
    hp =
      threadSourceKind(options.querySource) !== null && isTetherLive()
        ? isStatelessTetherModel(options.model)
        : !1,
    Pg = threadSourceKind(options.querySource) !== null && isTetherLive() ? NQe(options.agentId) : !1,
    Sc = threadSourceKind(options.querySource) !== null && isTetherLive() ? FQe() : !1,
    Hu = options.fallbackCreditCode !== void 0 ? options.fallbackCreditMintedStateless === !0 : !1,
    dy = threadSourceKind(options.querySource) !== null && isTetherLive() ? bEe(options.agentId) : !1,
    Hx = canUseNoTransientReminders(options.querySource, options.agentId, options.model, Hu),
    aI = Xn;
  if (hasFallbackBlocks(messagesForAPI_2)) {
    let Wn = isFirstPartyApiBackend()
        ? pickFallbackBeta({
            fromModel: lastFallbackModel(messagesForAPI_2),
            sticky: conversation,
            serverDefaultFallbacksEnabled: () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DASH_FLAME, !1),
            selfTargetDefaultFallbacksEnabled: () =>
              getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ELEGANT_POSSUM, !1),
          })
        : null,
      pr = Wn !== null && !Lp(conversation, Wn);
    if (pr) eB(conversation, Wn);
    logEvent("tengu_rotunda_pennant_replay", { echo_eligible: pr, category: Wn !== null && Wn === jw });
  }
  logEvent("tengu_api_after_normalize", {
    postNormalizedMessageCount: messagesForAPI_2.length,
    apiSystemMessageCount: count(messagesForAPI_2, (Wn) => Wn.type === "api_system"),
  });
  let uI = computeFingerprintFromMessages(messagesPreNormalize),
    cS = getCLISyspromptPrefix({
      isNonInteractive: options.isNonInteractiveSession,
      hasAppendSystemPrompt: options.hasAppendSystemPrompt,
      recorded: options.recordedCliPrefix,
    }),
    mae,
    Bx = () => {
      if (options.onPromptHeadSent)
        try {
          options.onPromptHeadSent({
            cliPrefix: cS,
            wireShape: runGuarded(() =>
              requestFeatureFlags(conversation, effectiveModel, {
                betas: betaList,
                keptOn: Ri,
                safeguards: mae,
              }),
            ),
          });
        } catch (error) {
          logError(toError(error));
        }
    };
  (Bx(),
    (systemPrompt = buildSystemWithAttribution(systemPrompt, cS, {
      fingerprint: uI,
      agentContext: options.agentContext,
      previousRequestId: Ie,
      promptId: Me,
      turnOrigin: ze,
      turnPosition: lt,
      responseBeforeCompaction: Hi ? getResponseBeforeCompaction() : void 0,
    })));
  let E5 = options.enablePromptCaching ?? getPromptCachingEnabled(effectiveModel),
    gae = options.forkPointUuid !== void 0 && isMainAgent(options.agentContext),
    gW = should1hCacheTTL(options.querySource, {
      agentCacheTtlOverride: options.agentCacheTtlOverride,
      mainThreadModel: Hi || gae ? effectiveModel : void 0,
    }),
    IW = gW.ttl === "1h" ? "1h" : void 0,
    Tw = applyMessagesCacheTtlOverride(gW.ttl) === "1h" ? "1h" : void 0,
    XF = Tw !== IW;
  if (Hi) {
    if (
      (setLastMainThreadCacheTtlMs(
        IW === "1h" ? oR : CACHE_TTL_5M_MS,
        options.model,
        gW.reason === "live_5m_cache",
      ),
      XF)
    )
      noteMainThreadCacheTtl5m();
  }
  let Ux = !1,
    xT = () => {
      if (Ux) return;
      Ux = !0;
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
    },
    cLe = () =>
      buildSystemPromptBlocks(systemPrompt, E5, {
        skipGlobalCacheForSystemPrompt: as,
        cacheTtl: IW,
        scopeRefused: Lp(conversation, cOe),
      }),
    systemBlocks = cLe(),
    JF = betaList.length > 0,
    extraToolSchemas = [...(options.extraToolSchemas ?? [])];
  if (hd)
    extraToolSchemas.push({
      type: ADVISOR_20260301,
      name: ADVISOR_TOOL_NAME,
      model: hd,
      ...(Hl && { defer_loading: !0 }),
    });
  let allTools = [...toolSchemas, ...extraToolSchemas],
    fLe = prefixLedgerNotice(
      conversation,
      {
        model: toProviderWireModelId(options.model),
        tools: allTools,
        system: systemBlocks,
        messages: messagesForAPI_2.map((Wn) => ({ role: Wn.message.role, content: Wn.message.content })),
      },
      { querySource: options.querySource, retryCause: void 0, promptEpoch: options.promptRenderEpoch },
    );
  if (fLe !== void 0) {
    let Wn = createAttachmentMessage_2({ type: "prefix_delta", text: fLe });
    yield Wn;
    let pr = runGuarded(() => normalizeMessagesForRequest([...messages, Wn], normalizeOptions));
    ((messagesForAPI_2 = pr.messagesForAPI),
      (em = pr.accountMemoryEpoch),
      surfaceDeferredTools(conversation, messages, messagesForAPI_2, {
        useToolSearch: Kn,
        toolSearchAbsent: cs === "tool_addition",
        blocksEligible: pr.blocksEligible,
        byValueNames: bo,
        byValueStaysOut: co,
      }),
      (uS = pr.midConvFallback),
      (Ks = pr.toolChangeFallback),
      (kl = pr.inlineToolsFallback));
  }
  let fI = runGuarded(() => rcn(messagesForAPI_2, Kr, (Wn) => resolveAppliedEffort(Wn, resolvedModel))),
    ZF = fI,
    CC = runGuarded(() =>
      modelSupportsEffort(resolvedModel) && fI !== void 0 ? normalizeEffortLevel(fI) : void 0,
    ),
    pLe =
      isFastModeEnabled() &&
      runGuarded(() => isFastModeAvailable()) &&
      runGuarded(() => supportsFastMode(effectiveModel)) &&
      !!options.fastMode &&
      !isFallbackModelFastRejected(options.model),
    fE = pLe && !isFastModeCooldown(),
    e$ = () =>
      shouldAllowAfkModeBeta() ||
      (isBetasSwitchSetAside() &&
        getClassifierProviderKind() === "firstParty" &&
        !isThirdPartyServerClassifierRefused()),
    _E = !1;
  if (isAgenticQuery) {
    if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FIZZY_BONBON, !1)) {
      if (isAutoModeActive() && e$()) eB(conversation, tj);
      _E = lT(conversation, tj) && e$();
    } else if (!isAutoModeCircuitBroken() && !Lp(conversation, tj))
      try {
        let toolPermissionContext = await options.getToolPermissionContext();
        _E = toolPermissionContext !== void 0 && isAutoClassifierActive(toolPermissionContext.mode) && e$();
      } catch (error) {
        logError(toError(error));
      }
  }
  let Sae;
  if (Nci())
    try {
      Sae = await options.getToolPermissionContext();
    } catch (error) {
      logError(toError(error));
    }
  let mLe;
  if (fE) eB(conversation, KPt);
  let R5 = lT(conversation, KPt) && (!isAutoModeQuerySource(options.querySource) || pLe);
  if (canSendProviderBetas()) eB(conversation, VPt);
  let t$ = () => canSendProviderBetas() && lT(conversation, VPt),
    hI = releaseKeepaliveChain(conversation, {
      isMainLoopRequest: Hi,
      continuesPrefix: options.forkPointUuid !== void 0,
      cacheTtl: E5 && !XF ? gW : void 0,
    }),
    DW = getMainChainReleaseCount(),
    LW = getModelSwitchCount(),
    HW = void 0,
    C5 = (Wn, pr, Jr) => {
      if (Hi)
        ((HW = Wn),
          evaluateCacheKeepalive({
            conversation: conversation,
            headerSent: hI,
            requestId: Wn,
            headers: pr,
            isWhole: Jr,
            chainReleaseCount: DW,
            accountEpoch: Yc,
            modelSwitchCount: LW,
            now: Date.now(),
            clientOptions: {
              model: options.model,
              credentials: options.credentials,
              storageV5: options.storageV5,
            },
          }));
    },
    AC,
    wE = !1;
  try {
    let Wn =
      !(betas.type === "disabled" && betas.mechanical === !0) &&
      !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE &&
      (!isWIFDispatchAuth() || isFirstPartyBaseUrl());
    if (Wn && canSendFirstPartyBetas()) {
      if (betas.type !== "disabled") {
        if (((AC = getPolishedDewdropMode()), hcn(AC))) eB(conversation, xG);
      }
      wE = lT(conversation, xG);
    } else if (Wn && !areExperimentalBetasDisabled()) {
      let pr = getProviderForModel(options.model);
      if (
        (pr === "bedrock" || pr === "mantle" || pr === "vertex") &&
        usesDefaultProviderEndpoint(pr) &&
        runGuarded(() => thirdPartyAcceptsThinkingBindingBeta(pr, options.model))
      ) {
        if (betas.type !== "disabled") eB(conversation, xG);
        wE = lT(conversation, xG);
      }
    }
  } catch (error) {
    (logError(error), (AC = void 0), (wE = !1));
  }
  if (!wE && !shouldIncludeFirstPartyOnlyBetas()) betaList = betaList.filter((Wn) => Wn !== xG);
  if (options.evictCacheOnComplete && options.stickyBetas !== void 0 && isSubagentCacheEvictEnabled())
    eB(conversation, qlt);
  let contextHintController = require("./chunk-gzv3xh26.js").createContextHintController({
      querySource: options.querySource,
      agentId: options.agentId,
      includeFirstPartyBetas: canSendFirstPartyBetas(),
      is529Error: is529Error,
      storageV5: options.storageV5,
    }),
    yS = void 0,
    EE = null,
    n$ = void 0,
    qx = () =>
      getRefusedEffortCarry({
        sent: yS !== void 0 && fI !== Kr ? Qs : yS,
        turnEffort: options.turnEffort,
        hookEffortValue: options.hookEffortValue,
      }),
    BW,
    yI,
    gLe,
    A5 = () => (gLe ??= fingerprintMessagesForCache(messagesForAPI_2)),
    kae = () => {
      let Wn = getExtraBodyParams();
      return (f6e(Wn, options.model, getProviderForModel(options.model)), Wn);
    },
    bae = (BW ??= allTools.filter((Wn) => !("defer_loading" in Wn && Wn.defer_loading)));
  ((yI ??= betaHeaderValues(betaList)),
    recordPromptState({
      system: systemBlocks,
      toolSchemas: BW,
      anyDeferLoading: BW.length !== allTools.length,
      querySource: options.querySource,
      model: options.model,
      agentId: options.agentId,
      fastMode: R5,
      globalCacheStrategy: Vi,
      betas: hI ? [...yI, DO.header] : yI,
      autoModeActive: _E,
      isUsingOverage: getCurrentLimits().isUsingOverage ?? !1,
      is1hCacheTTL: Tw === "1h",
      queryDepth: options.queryTracking?.depth,
      cacheDiagnosis: t$(),
      effortValue: fI,
      thinkingConfig: betas,
      extraBodyParams: kae(),
      getMessageHashes: A5,
      messages: messagesForAPI_2,
      baselineAgentId:
        options.querySource === "agent_summary" && isSubagentContext(options.agentContext)
          ? options.agentContext.agentId
          : void 0,
    }));
  let hLe = messagesForAPI_2,
    Nh = null,
    x5 = () => getClassifierProviderKind() === "thirdParty" && hb.includes(qT.header),
    WW = () => wE && !shouldIncludeFirstPartyOnlyBetas() && hb.includes(xG.header),
    nP = [],
    P5 = !1,
    M5 = (Wn) => {
      if (!lT(conversation, qT)) return;
      let pr = x5(),
        Jr = !pr && hb.includes(qT.header) && env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS,
        Os = pr || Jr,
        La = Os && Wn instanceof Ot && Wn.status === 400 && Wn.message.includes(qT.header),
        Vl = Os && !WW() && isInvalidBetaFlagError(Wn),
        Yl = pr ? (parseFoundryUnsupportedCapabilities(Wn) ?? []) : [],
        any = Yl.some((ku) => ku.includes("dangerous_tool_use") || ku.includes("safeguard"));
      if (!La && !Vl && !any && !isSafeguardsRejected(Wn)) return;
      Xg(conversation, qT);
      let Wd = pr || (Jr && isBetasSwitchSetAside());
      if (Vl && !La && !any && !isSafeguardsRejected(Wn))
        (nP.push(qT), (P5 = Wd && !isThirdPartyServerClassifierRefused()));
      if (Wd) {
        if ((markThirdPartyServerClassifierRefused(), any))
          recordFoundryUnsupportedCapabilities(options.model, Yl);
      }
      return (
        logForDebugging(
          pr
            ? "[server-classifier] the platform rejected a beta on this request (HTTP 400), most likely dangerous-tool-use, which this deployment does not know yet; it is not sent again this session and auto mode decides with the local classifier"
            : Wd
              ? "[server-classifier] a request was refused (HTTP 400), most likely because of the dangerous-tool-use beta header or the safeguards field. Claude Code sends these on a direct connection to api.anthropic.com even with CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS set. The API, or something between this machine and it, refused them. Until Claude Code restarts, it sends none of them again, nor the afk-mode beta header, and auto mode no longer asks the server to check actions. To stop sending them on this machine at all, set CLAUDE_CODE_AUTO_MODE_SERVER=0."
              : Jr
                ? "[server-classifier] a request was refused (HTTP 400), most likely because of the dangerous-tool-use beta header, which this conversation had kept sending since an earlier request. It is not sent again in this conversation. This session had already stopped asking the server to check actions, so auto mode goes on deciding as it did."
                : "[server-classifier] the server rejected the dangerous-tool-use beta header or the safeguards field (HTTP 400); neither is sent again this conversation, so every auto-mode tool use is denied as classifier-unavailable until the conversation's betas reset (/clear or /compact)",
          { level: "warn" },
        ),
        logEvent("tengu_server_classifier_beta_rejected_retry", {
          provider: getAPIProviderForAnalytics(),
          unnamed: Vl,
          foundryFeature: any,
          unclaimed: !1,
          betasSwitchSetAside: Jr,
          stopsAsking: Wd,
        }),
        "retry:safeguards"
      );
    },
    yLe = (Wn) =>
      isSpeedParameterUnsupportedError(Wn, options.model) &&
      (!!options.modelIsRefusalFallbackTarget || wasEverFastRejected(options.model)),
    PE = (Wn) => isNonFallbackError(Wn) || yLe(Wn),
    O5 = (Wn) => cs !== void 0 && dg === void 0 && Wn instanceof Ot && !options.resumeIncompleteThinking,
    wae = (Wn) => {
      let pr = normalize422To400(Wn);
      return (
        O5(Wn) &&
        (!isDirectFirstPartyApi() || /\bdefer_loading\b/.test(Wn.message)) &&
        (Wn.status === 400 || Wn.status === 422) &&
        Wn.type !== "billing_error" &&
        !PE(pr) &&
        !FI(pr)
      );
    },
    I5 = (Wn, pr, Jr) => {
      logForDebugging(
        `[ToolSearch] HTTP ${Wn.status} ${Jr}${pr ? ` (${pr.header})` : ""}; sending the request again without deferred tools. ENABLE_TOOL_SEARCH=false avoids the refused request${nP.length > 0 ? `. Dropped first and now allowed again: ${betaHeaderValues(nP).join(", ")}` : ""}`,
        { level: "warn" },
      );
      for (let Os of nP) IDt(conversation, Os);
      if (P5) releaseThirdPartyServerClassifierRefusal();
      throw new ToolSearchRefusedError(Wn, Kn);
    },
    D5 = (Wn) => {
      if (Or !== null && O5(Wn) && isBetaRejected(Wn, Or)) I5(Wn, Or, "refusing the tool search beta");
      return;
    },
    Tae = (Wn) => {
      if (wae(Wn)) I5(Wn, Or, "that no other recovery took, on a request that declared deferred tools");
      return;
    },
    i$ = !1,
    e1 = () => {
      let toolSearchRefusal = options.toolSearchRefusal;
      if (toolSearchRefusal === void 0 || i$) return;
      i$ = !0;
      try {
        let pr = getToolSearchBeta(),
          Jr = isBetaRejected(toolSearchRefusal, pr);
        if (Jr) latchBetaRefused(pr, isBetaHeaderRejected(toolSearchRefusal, pr));
        else
          (Xg(conversation, pr),
            logForDebugging(
              "[ToolSearch] the endpoint answered the request sent without tool search, so this conversation goes on without it",
            ));
        logEvent("tengu_beta_400_healed", {
          beta: hashToolNames([pr.header]),
          model: telemetrySafeModelName(options.model),
          provider: getAPIProviderForAnalytics(),
          status: toolSearchRefusal.status,
          unnamed: !Jr,
        });
      } catch (error) {
        logError(error);
      }
    },
    L5 = (Wn) => {
      let pr = NLe(Wn, !0);
      if (pr !== null) return pr;
      if (!(Wn instanceof Ot) || (Wn.status !== 400 && Wn.status !== 422)) return;
      let Jr = normalize422To400(Wn);
      if (PE(Jr) || FI(Jr)) return;
      if (Wn.status === 422 || !lT(conversation, qT) || !x5()) {
        if (shouldIncludeFirstPartyOnlyBetas() || conversation.systemMessagesAcceptedBy.has(effectiveModel))
          return;
        let Os = LLe(Wn, !0);
        if (Os !== void 0) qd = "retrying";
        return Os;
      }
      return (
        Xg(conversation, qT),
        nP.push(qT),
        logForDebugging(
          "[server-classifier] an unrecognised HTTP 400 arrived while the dangerous-tool-use beta was on the request; retrying once without it, and auto mode decides with the local classifier for the rest of this conversation",
          { level: "warn" },
        ),
        logEvent("tengu_server_classifier_beta_rejected_retry", {
          provider: getAPIProviderForAnalytics(),
          unnamed: !1,
          foundryFeature: !1,
          unclaimed: !0,
        }),
        "retry:safeguards-unclaimed"
      );
    },
    _Le = (Wn) => {
      try {
        if (!(Wn instanceof Ot) || (Wn.status !== 400 && Wn.status !== 422)) return;
        if (JS === "withoutField") {
          JS = "spent";
          let pr = L5(Wn);
          if (pr === void 0 && !PE(Wn) && !wae(Wn)) edn();
          return pr;
        }
        if (
          JS === "spent" ||
          m1 === void 0 ||
          Wn.type === "billing_error" ||
          PE(Wn) ||
          (FI(Wn) && !isThinkingDisplayRejected(Wn)) ||
          !Zln() ||
          isDirectFirstPartyApi()
        )
          return;
        return (
          (betaList = betaList.filter((pr) => pr !== Rge)),
          (JS = m1 === "updates" && betas.display !== void 0 ? "withoutUpdates" : "withoutField"),
          `retry:thinking-display-unclaimed:${JS}`
        );
      } catch (error) {
        logError(error);
        return;
      }
    },
    Rae = () => {
      if (qd === "retrying") qd = "spent";
      else if (!shouldIncludeFirstPartyOnlyBetas() && HS.some((Wn) => Wn.role === "system"))
        (conversation.systemMessagesAcceptedBy.add(effectiveModel), Bx());
    },
    SLe = () => {
      if (qd === "retrying")
        (IDt(conversation, LO),
          Bx(),
          logForDebugging(
            "[mid-conv-system] the resend without system messages was not answered either, so the guess that the platform refuses them is dropped; the next request of this conversation sends them again",
            { level: "warn" },
          ));
    },
    t1 = () => {
      if (JS === "idle" || JS === "spent") return;
      let Wn = JS === "withoutField";
      JS = Wn ? "spent" : "idle";
      try {
        if (Wn) Xg(conversation, als);
        (Xg(conversation, Rge),
          logForDebugging(
            `[thinking] a request was refused (HTTP 400 or 422) and went through when sent again ${Wn ? "without thinking.display" : "with the session's own display in place of 'updates'"}; this conversation no longer sends ${Wn ? "thinking.display" : "'updates'"}.`,
            { level: "warn" },
          ),
          logEvent("tengu_beta_400_healed", {
            beta: hashToolNames([Rge.header]),
            model: telemetrySafeModelName(options.model),
            provider: getAPIProviderForAnalytics(),
            unclaimed: !0,
          }));
      } catch (error) {
        logError(error);
      }
    },
    i1 = (Wn, pr) => {
      try {
        if (!(Wn instanceof Ot) || (Wn.status !== 400 && Wn.status !== 422)) return;
        if (ma === "resent") ma = "spent";
        let Jr = normalize422To400(Wn);
        if (
          ma !== "idle" ||
          !hb.includes(AU.header) ||
          Wn.type === "billing_error" ||
          Loo(Wn) !== void 0 ||
          isClientVersionRejected(Jr) ||
          PE(Jr) ||
          (Wn.status === 400 && pr) ||
          classifyFallbackCreditError(Wn) !== void 0 ||
          classifyServerFallbackError(Wn) !== void 0 ||
          (FI(Jr) && !Wn.message.includes(AU.header)) ||
          isDirectFirstPartyApi()
        )
          return;
        return (
          logForDebugging(
            `[thinking] HTTP ${Wn.status} that no earlier recovery took; sending the request again without the ${AU.header} beta`,
            { level: "warn" },
          ),
          (betaList = betaList.filter((Os) => Os !== AU)),
          (ma = pr ? "spent" : "resent"),
          "retry:thinking-token-count-unclaimed"
        );
      } catch (error) {
        logError(error);
        return;
      }
    },
    N5 = () => {
      if (ma !== "resent") return;
      ma = "spent";
      try {
        (latchBetaRefused(AU, !1),
          logEvent("tengu_beta_400_healed", {
            beta: hashToolNames([AU.header]),
            model: telemetrySafeModelName(options.model),
            provider: getAPIProviderForAnalytics(),
            unclaimed: !0,
          }));
      } catch (error) {
        logError(error);
      }
    },
    l$ = (Wn) => {
      return;
    },
    SI = (Wn) => {
      {
        let pr = Wn instanceof Ot && Wn.status === 400;
        if (rP === "retrying") {
          if (pr) {
            if (((rP = "spent"), !PE(Wn) && !(ME === "idle" && u$(Wn)))) khn();
          }
          return;
        }
        if (
          rP === "idle" &&
          OI &&
          betaList.includes(MK) &&
          pr &&
          Wn.type !== "billing_error" &&
          !PE(Wn) &&
          !FI(Wn) &&
          _hn()
        )
          return (
            (rP = "retrying"),
            (k$ = Wn.requestID ?? void 0),
            (betaList = betaList.filter((Jr) => Jr !== MK)),
            Nh?.forceCreate("clear_at_header_retired"),
            "retry:kept-reminder-unrecognised-400"
          );
      }
      return;
    },
    u$ = (Wn) => {
      try {
        return (
          PG !== null &&
          getAPIProvider() === "firstParty" &&
          hb.includes(PG.header) &&
          Wn instanceof Ot &&
          Wn.status === 400 &&
          Wn.type !== "billing_error" &&
          classifyAPIError(Wn) === "client_error" &&
          !options.resumeIncompleteThinking &&
          !(y3 && !iP) &&
          getApiErrorCode(Wn) === void 0 &&
          !PE(Wn) &&
          !FI(Wn) &&
          classifyThreadError(Wn) === null &&
          classifyFallbackCreditError(Wn) === void 0 &&
          classifyServerFallbackError(Wn) === void 0 &&
          bhn()
        );
      } catch (error) {
        return (logError(error), !1);
      }
    },
    oP = (Wn) => {
      try {
        if (ME === "retrying" && Wn instanceof Ot && Wn.status === 400) {
          if (((ME = "spent"), !PE(Wn))) whn();
          logEvent("tengu_tether_unrecognised_400", {
            phase: lit_2("refused"),
            planner_backed: II,
            query_source: agentTypeForTelemetry(options.querySource),
          });
        }
      } catch (error) {
        logError(error);
      }
    },
    a1 = (Wn) => {
      try {
        if ((oP(Wn), ME === "idle" && u$(Wn))) {
          let pr = Nh !== null,
            Jr = Nh?.dropForUnrecognised400();
          return (
            logEvent("tengu_tether_unrecognised_400", {
              phase: lit_2("start"),
              planner_backed: pr,
              dropped_thread: Jr !== void 0,
              query_source: agentTypeForTelemetry(options.querySource),
            }),
            (ME = "retrying"),
            (G5 = Wn.requestID ?? void 0),
            (II = pr),
            Jr ?? "retry:tether-unrecognised-400"
          );
        }
      } catch (error) {
        logError(error);
      }
      return;
    },
    Cae = !1,
    l1 = (Wn) => {
      if (Wn instanceof Ot && Wn.status !== void 0) Cae = !0;
      if ((oP(Wn), betaList.includes(MK) && isKeptReminderClearAtRejected(Wn)))
        return (
          (betaList = betaList.filter((pr) => pr !== MK)),
          Xg(conversation, MK),
          DQe(),
          Bx(),
          Nh?.forceCreate("clear_at_header_retired"),
          logFeatureSad("api_kept_reminder_clear_at", "server_rejected"),
          logForDebugging(
            "[reminders] the server rejected the clear_at beta header or field (HTTP 400); retrying without them. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.",
            { level: "warn" },
          ),
          "retry:kept-reminder-clear-at"
        );
      if (PG !== null && isTetherBetaRejected(Wn) && !Lp(conversation, PG))
        return (
          Xg(conversation, PG),
          IQe(),
          logForDebugging(
            "[tether] server rejected the message-threads beta header \u2014 dropping it and threading for this session",
            { level: "warn" },
          ),
          Nh?.resolveRetry(Wn) ?? "retry:tether-header"
        );
      return Nh?.resolveRetry(Wn);
    },
    EI = planToolResultClearingAfterIdle(
      messages,
      options.querySource,
      options.model,
      options.agentId,
      (Wn) => findToolByName(normalizeOptions.tools, Wn)?.name,
      options.forkPointUuid,
    ),
    m$ = !1,
    HS = [],
    g$ = [],
    Eh = (Wn) => {
      if (g$.length === 0) return Wn;
      for (let pr = g$.length - 2; pr >= 0; pr--) if (g$[pr] === Wn) return pr;
      return;
    },
    vw = void 0,
    S$ = void 0,
    d1 = !1,
    c1 = !1,
    F5 = 0,
    Aae = "none",
    kLe = () => ({ messages: HS, system: vw, tools: S$ });
  {
    let Wn = threadSourceKind(options.querySource);
    if (Wn !== null && isTetherLive()) {
      ((BW ??= allTools.filter((La) => !("defer_loading" in La && La.defer_loading))),
        (yI ??= betaHeaderValues(betaList)));
      let pr = lastAssistantMessageId(messages),
        Jr =
          lT(conversation, qT) ||
          (options.serverClassifier === !0 &&
            options.autoModeServerContext !== void 0 &&
            canUseServerClassifier() &&
            !Lp(conversation, qT) &&
            !isThirdPartyServerClassifierRefused()),
        Os = Nhn({
          querySource: options.querySource,
          agentId: options.agentId,
          model: options.model,
          modelHeldStateless: hp,
          relayHeldStateless: Pg,
          classifierHeldStateless: Sc,
          creditRetryStateless: Hu,
          dropHeldStateless: dy,
          system: systemBlocks,
          toolSchemas: BW,
          betas: yI,
          latchedHeaders: {
            fastMode: R5,
            autoMode: _E,
            cacheTtl1h: IW === "1h",
            evictOnComplete: lT(conversation, qlt),
            cacheDiagnosis: t$(),
            cacheKeepalive: hI,
            dangerousToolUse: Jr,
          },
          thinkingConfig: betas,
          toolChoice: options.toolChoice,
          effortValue: fI,
          extraBodyParams: kae(),
          getMessageHashes: A5,
          previousMessageId: pr,
        });
      if (isSubagentOrUnknown(Wn, options.agentId)) {
        let effort = jhn(messages, messagesForAPI_2);
        if (
          ((Nh = buildTetherDelta({
            engine: Os,
            previousMessageId: pr,
            anchorRewritten: effort !== null && hasStructuralEchoDiff(effort, pr),
            messages: messagesForAPI_2,
            agentId: options.agentId,
            model: options.model,
            modelHeldStateless: hp,
            relayHeldStateless: Pg,
            classifierHeldStateless: Sc,
            creditRetryStateless: Hu,
            dropHeldStateless: dy,
            toolResultClearingHeldStateless: EI !== void 0,
            clock: clock,
          })),
          effort !== null)
        )
          logTetherEchoAudit(effort, {
            sourceCategory: Wn,
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
      : void 0,
    Zk,
    f1 = () => (Zk ??= memoryToolNames(messages, tools)),
    H5 = startLLMRequestSpan(
      options.model,
      options.agentContext,
      $5,
      messagesForAPI_2,
      fE,
      options.querySource,
      f1,
    ),
    monotonicNow = clock.monotonicNow(),
    monotonicNow_2 = clock.monotonicNow(),
    p_ = 0,
    B5 = [],
    U5 = void 0,
    Al = void 0,
    j5 = !1,
    Qh,
    bLe = (Wn) => {
      if (
        Wn !== void 0 &&
        getClassifierProviderKind() === "thirdParty" &&
        isServerClassifierUnsupported(Wn) &&
        !isThirdPartyServerClassifierRefused() &&
        !Zqt()
      )
        (markThirdPartyServerClassifierRefused(),
          logForDebugging(
            `[server-classifier] the platform gave no classification for this request (${Wn.why}); treating that as this deployment's answer: auto mode classifies locally for the rest of this session and stops sending the classifier context`,
          ));
    },
    MI = (Wn, pr, Jr) => {
      let flattened = Jr.flatMap((La) =>
        La.type === "tool_use" && typeof La.id === "string" ? [La.id] : [],
      );
      bLe(settleServerClassifierResult(Wn, pr, flattened));
    },
    p1 = !1,
    W5 = !1,
    OI = !1,
    rP = "idle",
    k$,
    ME = "idle",
    G5,
    II = !1,
    JS = "idle",
    ma = "idle",
    qd = "idle",
    Gd = "idle",
    vu = () => Gd !== "idle" && Gd !== "spent",
    sc = !1,
    fc = void 0,
    h_ = void 0,
    Rh,
    Af = (Wn, pr) => {
      Vs(Wn);
      let Jr = applyThreadBody(Wn, kLe());
      (captureAPIRequest(Jr, options.querySource, isMainAgent(options.agentContext)),
        (h_ = logApiRequestBody(
          { ...Wn, stream: pr },
          options.querySource,
          f1,
          Jr.messages,
          options.agentContext,
        )),
        (Rh = replayTranscriptRequest({
          params: Jr,
          querySource: options.querySource,
          agentId: options.agentId,
          storageV5: options.storageV5,
          conversation: messages,
          stickyBetas: conversation,
          readInjectedBody: () => getExtraBodyParams(),
        })));
    },
    Ah = void 0,
    k_ = void 0,
    FT,
    Jh = !1,
    _S = F8r(),
    bS = void 0,
    nk,
    Yc = getLimitsAccountEpoch(),
    Zh = (Wn, pr) => {
      let Jr = getRequestRouteKind(options);
      return (
        extractQuotaStatusFromError(Wn, Jr, clock.now(), Yc, options.storageV5),
        beginUsageLimitWait({
          route: Jr,
          querySource: options.querySource,
          model: options.model,
          rateLimitType: applyMockHeaders(Wn).rateLimitType,
          retryAtMs: pr.retryAtMs,
          attempt: pr.attempt,
          maxRetries: pr.maxRetries,
        })
      );
    },
    vp = (Wn) =>
      preflightRateLimit({
        rejection: Wn,
        nowMs: clock.now(),
        credentials: options.credentials,
        stop: signal,
      }),
    $T = null;
  function OE() {
    if ($T !== null) ($T(), ($T = null));
  }
  function releaseStreamResources() {
    if ((OE(), cleanupStream(U5), (U5 = void 0), k_)) (k_.body?.cancel().catch(() => {}), (k_ = void 0));
  }
  let hb = [],
    Pae = [],
    m1 = void 0,
    z5 = void 0,
    r3 = !1,
    g1,
    Mae = "disabled",
    h1 = !1,
    s3 = !1,
    d3,
    _1 = !1,
    S1 = !1,
    w$ = "none",
    h3 = !1,
    Oae = !1;
  if (options.fallbackCreditCode !== void 0 && (!Yt || vs !== void 0))
    logEvent("tengu_fallback_credit_skipped", {
      reason: Yt ? lit_2("tool_changes_dropped") : lit_2("backend_unknown_or_mismatch"),
      ...(vs && { ...vs, late_tools_inlined: Ld }),
      mint_request_id: ye(options.fallbackCreditMintRequestId),
      mint_model: telemetrySafeModelName(options.fallbackCreditMintModel),
      model: telemetrySafeModelName(options.model),
      query_source: agentTypeForTelemetry(options.querySource),
    });
  let DI = Yt && vs === void 0 ? options.fallbackCreditCode : void 0,
    m5n = (Wn) =>
      (options.fallbackCreditCode ? Wn.split(options.fallbackCreditCode).join("[FCT_REDACTED]") : Wn).slice(
        0,
        600,
      ),
    y3 = !1,
    sP = !1,
    iP = !1,
    hgt = !1,
    ygt = !1,
    _gt = !1,
    b1 = !1,
    C_ = (Wn, pr, Jr) => {
      if (!y3 || _gt) return;
      _gt = !0;
      let Os = yS;
      logEvent("tengu_fallback_credit_outcome", {
        outcome: fromEnum(Wn),
        mint_request_id: ye(options.fallbackCreditMintRequestId),
        mint_model: telemetrySafeModelName(options.fallbackCreditMintModel),
        request_id: ye(pr),
        client_request_id: ye(Ah),
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
    },
    Sgt = !1,
    kgt = !1,
    bgt = !1,
    buildRequestParamsGuarded = (Wn, pr = !0) => runGuarded(() => buildRequestParams(Wn, pr)),
    buildRequestParams = (Wn, pr) => {
      if (messagesForAPI_2 !== hLe)
        ((hLe = messagesForAPI_2),
          (gLe = void 0),
          recordMessageHistory({
            querySource: options.querySource,
            agentId: options.agentId,
            getMessageHashes: A5,
            messages: messagesForAPI_2,
          }));
      let paramsFromContext = (retryContext) => !uoo.has(retryContext) && Lp(conversation, retryContext),
        filtered = betaList.filter((ql) => ql !== yv || !vu());
      if (!filtered.includes(yv) && !vu() && getSonnet46ContextWindowOverride(Wn.model) !== null)
        filtered.push(yv);
      let provider = getProviderForModel(Wn.model),
        Vl = provider === "bedrock" && tj && _E && isAgenticQuery && isAutoMode3POptIn();
      if (Vl)
        logForDebugging(
          `auto-mode 3P: sending afk-mode beta '${tj?.header}' to bedrock via body.anthropic_beta`,
        );
      let Yl =
          provider === "bedrock"
            ? [
                ...getBedrockExtraBodyParamsBetas(Wn.model).filter((ql) => ql !== yv || !vu()),
                ...(Or ? [Or] : []),
                ...(Vl && tj ? [tj] : []),
              ].filter((ql) => !paramsFromContext(ql))
            : [],
        extraBodyParams = getExtraBodyParams(Yl);
      addBetaToBodyAnthropicBeta(extraBodyParams, AU, provider === "bedrock" && filtered.includes(AU));
      let outputConfig = { ...(extraBodyParams.output_config ?? {}) };
      if (
        (delete extraBodyParams.output_config,
        applyEffortToOutputConfig(ZF, outputConfig, extraBodyParams, filtered, resolvedModel),
        (h1 = f6e(extraBodyParams, Wn.model, provider)),
        configureTaskBudgetParams(options.taskBudget, outputConfig, filtered),
        paramsFromContext(Cge))
      )
        delete outputConfig.effort;
      if (paramsFromContext(Wgr) && "task_budget" in outputConfig) delete outputConfig.task_budget;
      s3 = hasStringFormat(options.outputFormat, outputConfig, filtered, options.model);
      let ku = options.refusalFallbackSilentArmActive === !0,
        Np = serverFallbackPlan(options.serverRefusalFallback, Wn.model, filtered, conversation, ku, Hx);
      (applyRefusalFallbackBeta(
        options.fallbackCreditLaneArmed === !0 || options.fallbackCreditCode !== void 0,
        filtered,
        conversation,
        ku,
        provider === "bedrock" ? extraBodyParams : void 0,
      ),
        (ygt = filtered.includes(RG)));
      let serverClassifierEligible = thirdPartyAcceptsDangerousToolUseBeta(provider, resolvedModel),
        Kg =
          options.serverClassifier === !0 && options.autoModeServerContext !== void 0
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
            : [],
        cy =
          options.serverClassifier === !0 && options.autoModeServerContext !== void 0
            ? buildServerClassifierRequestContext({
                autoModeServerContext: options.autoModeServerContext,
                priorTurnContext: collectPriorServerContexts(messages),
                systemReminders: Kg,
                textProvenance: buildContextSectionsMessage(messages, messagesForAPI_2, attachmentToMessages),
              })
            : void 0,
        jT =
          options.serverClassifier === !0 &&
          cy !== void 0 &&
          serverClassifierEligible &&
          canUseServerClassifier() &&
          !Lp(conversation, qT) &&
          !isThirdPartyServerClassifierRefused();
      if (jT) (eB(conversation, qT), checkInsertedTextShed(Kg, cy?.system_reminders ?? []));
      if (serverClassifierEligible && lT(conversation, qT) && !filtered.includes(qT)) filtered.push(qT);
      addBetaToBodyAnthropicBeta(extraBodyParams, qT, provider === "bedrock" && filtered.includes(qT));
      let min = Math.min(
          Wn?.maxTokensOverride || options.maxOutputTokensOverride || modelFacts_2.maxOutputTokens,
          modelFacts_2.maxOutputTokens,
        ),
        CLAUDE_CODE_DISABLE_THINKING = env.CLAUDE_CODE_DISABLE_THINKING,
        thinkingEnabled = betas.type !== "disabled" && !CLAUDE_CODE_DISABLE_THINKING,
        Ew = () =>
          modelFacts_2.thinking.rejectsDisabled ||
          (creditMintModel !== void 0 && modelRejectsDisabledThinking(creditMintModel)),
        Aw =
          thinkingEnabled &&
          _Jn(resolvedModel) &&
          !Lp(conversation, als) &&
          (JS === "idle" || JS === "withoutUpdates"),
        thinkingDisplay = !Aw
          ? void 0
          : betas.display === "highlights" && isThinkingHighlightsRefused()
            ? "omitted"
            : betas.display,
        thinking = void 0;
      if (thinkingEnabled && modelFacts_2.thinking.supported)
        if (
          modelSupportsAdaptiveThinking({
            runtimeOverride: getThinkingTypeOverride(options.model),
            resolvedModel: resolvedModel,
            canonicalModel: At,
          }) === "adaptive"
        )
          thinking = { type: "adaptive", display: thinkingDisplay };
        else {
          let thinkingBudget = mvi(resolvedModel);
          if (betas.type === "enabled" && betas.budgetTokens !== void 0) thinkingBudget = betas.budgetTokens;
          ((thinkingBudget = Math.max(1024, Math.min(min - 1, thinkingBudget))),
            (thinking = { budget_tokens: thinkingBudget, type: "enabled", display: thinkingDisplay }));
        }
      else if (
        betas.type === "disabled" &&
        getAPIProvider() === "firstParty" &&
        !CLAUDE_CODE_DISABLE_THINKING &&
        modelFacts_2.thinking.supported &&
        !Ew()
      )
        thinking = { type: "disabled" };
      let cP;
      if (wE) {
        if (!filtered.includes(xG)) filtered.push(xG);
        if (
          (addBetaToBodyAnthropicBeta(extraBodyParams, xG, provider === "bedrock"),
          AC !== void 0 &&
            (thinking?.type === "adaptive" || thinking?.type === "enabled") &&
            !("thinking" in extraBodyParams))
        )
          ((thinking = { ...thinking, block_binding: { prefix_mismatch_behavior: AC } }), (cP = AC));
      }
      let fP = betas.type === "disabled" ? void 0 : betas,
        $I = fP?.display,
        HI = "none";
      try {
        HI = thinkingDisplayMode($I, fP?.displayExplicit ?? getThinkingDisplayExplicit());
      } catch (error) {
        logError(error);
      }
      let pP = () => {
        let index = filtered.indexOf(Txn);
        if (index !== -1) filtered.splice(index, 1);
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
            !Lp(conversation, Rge) &&
            JS === "idle" &&
            !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE
          ) {
            if (((thinking = { ...thinking, display: "updates" }), !filtered.includes(Rge)))
              filtered.push(Rge);
            (addBetaToBodyAnthropicBeta(extraBodyParams, Rge, provider === "bedrock"), pP());
          }
          break;
        }
      }
      if (canResumeThinking(resolvedModel) && !filtered.includes(l3e)) filtered.push(l3e);
      let BE = thinking?.type === "enabled" || thinking?.type === "adaptive" || (thinking === void 0 && Ew()),
        toolChoice = options.toolChoice;
      if (toolChoice?.type === "tool" && BE)
        (logForDebugging(
          `tool_choice {type:'tool', name:'${toolChoice.name}'} demoted to auto: extended thinking is active`,
        ),
          (toolChoice = { type: "auto" }));
      let UE = betas.type === "disabled" && betas.mechanical === !0;
      if (
        thinking?.type === "disabled" &&
        (UE || modelFacts_2.thinking.capsEffortWhenDisabled) &&
        typeof outputConfig.effort === "string" &&
        isAboveHighEffort(outputConfig.effort)
      ) {
        if (!bgt)
          ((bgt = !0),
            logForDebugging(
              `output_config.effort '${outputConfig.effort}' clamped to '${THINKING_DISABLED_EFFORT_CAP}': thinking is ${UE ? "mechanically " : ""}disabled for this request, and this model rejects higher effort when thinking is disabled`,
            ));
        if (
          !UE &&
          classifyQuerySource(options.querySource) === "main" &&
          Ws().once("effort_thinking_disabled_clamp")
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
        }),
        P$ = options.enablePromptCaching ?? getPromptCachingEnabled(creditMintModel ?? Wn.model),
        fh,
        Ow =
          isFastModeEnabled() &&
          runGuarded(() => isFastModeAvailable()) &&
          !isFastModeCooldown() &&
          runGuarded(() => supportsFastMode(effectiveModel)) &&
          !!Wn.fastMode &&
          !paramsFromContext(KPt) &&
          !isFallbackModelFastRejected(Wn.model);
      if (Ow) fh = "fast";
      if (((d3 = Ow ? Wn.model : void 0), R5 && !filtered.includes(KPt))) filtered.push(KPt);
      if (tj && _E && e$() && isAgenticQuery && !filtered.includes(tj)) {
        if ((filtered.push(tj), isAutoMode3POptIn()))
          logForDebugging(
            `auto-mode 3P: sending afk-mode beta '${tj.header}' to ${provider} via betas header`,
          );
      }
      if (IW === "1h" && canSendFirstPartyBetas() && !filtered.includes(l9t)) filtered.push(l9t);
      let _b = null,
        jE = contextHintController?.buildRequestParams(messagesForAPI_2);
      if (jE) (filtered.push(jE.beta), (_b = jE.body));
      let gP = null;
      if (lT(conversation, qlt) && P$) {
        if (!filtered.includes(qlt)) filtered.push(qlt);
        gP = { cache_control: { type: "ephemeral", ...(Tw && { ttl: Tw }), evict_on_complete: !0 } };
      }
      if (t$() && !filtered.includes(VPt)) filtered.push(VPt);
      if (hI && !filtered.includes(DO)) filtered.push(DO);
      let CLAUDE_CODE_SIMULATE_PROXY_USAGE = env.CLAUDE_CODE_SIMULATE_PROXY_USAGE,
        BI = Ri && JF && !CLAUDE_CODE_SIMULATE_PROXY_USAGE && filterBetasForProvider(filtered).includes(MK),
        D1 = Nh !== null && !CLAUDE_CODE_SIMULATE_PROXY_USAGE ? Nh.plan(messagesForAPI_2, BI) : null,
        L1 = PG !== null && (Lp(conversation, PG) || ME !== "idle"),
        L_ = L1 ? null : D1;
      if (PG !== null) {
        if (L_ !== null) eB(conversation, PG);
        if (L1) {
          for (let ql = filtered.length - 1; ql >= 0; ql--) if (filtered[ql] === PG) filtered.splice(ql, 1);
        } else if ((L_ !== null || lT(conversation, PG)) && !filtered.includes(PG)) filtered.push(PG);
      }
      let filtered_2 = filtered.filter(
        (ql) => !paramsFromContext(ql) && (!CLAUDE_CODE_SIMULATE_PROXY_USAGE || ql === UEe),
      );
      if (CLAUDE_CODE_SIMULATE_PROXY_USAGE)
        logForDebugging(
          `[API:client] SIMULATE_PROXY_USAGE: stripping ${filtered.length - filtered_2.length} beta headers from request (keeping ${betaHeaderValues(filtered_2).join(", ") || "none"}): ${betaHeaderValues(filtered).join(", ")}`,
        );
      let N3 =
        !thinkingEnabled && modelFacts_2.acceptsTemperature ? (options.temperatureOverride ?? 1) : void 0;
      ((hb = betaHeaderValues(filtered_2)),
        (Pae = betaHeaderValues(Yl)),
        (sc = filtered_2.includes(yv) || Yl.includes(yv)),
        (m1 =
          thinking !== void 0 && "display" in thinking && !("thinking" in extraBodyParams)
            ? (thinking.display ?? void 0)
            : void 0),
        (r3 = thinking !== void 0 && "block_binding" in thinking),
        (g1 = cP));
      let betaHeaderValues_2 = filterBetasForProvider(filtered_2),
        yP =
          JF &&
          (!CLAUDE_CODE_SIMULATE_PROXY_USAGE || filtered_2.length > 0) &&
          betaHeaderValues(betaHeaderValues_2).length > 0;
      ((W5 = BI), (OI = !1));
      let Fd = yP && (betaHeaderValues_2.includes(nj) || (jw !== null && betaHeaderValues_2.includes(jw)));
      h3 = Fd && hasFallbackBlocks(messagesForAPI_2);
      let Zg =
        yP &&
        (Np.fallbacks === "default"
          ? jw !== null && betaHeaderValues_2.includes(jw)
          : betaHeaderValues_2.includes(nj))
          ? Np
          : {};
      if (
        ((S1 = Zg.fallbacks !== void 0),
        (w$ = Zg.fallbacks === "default" ? "default" : S1 ? "explicit" : "none"),
        !Fd && hasFallbackBlocks(messagesForAPI_2))
      )
        ((Ac = "error_recovery"), (uh = !1));
      let Iy = !1;
      p1 = Iy;
      let Of = [];
      oc = void 0;
      let B_ = P$ && !options.skipMessageCacheMarkers,
        ea = (!CLAUDE_CODE_SIMULATE_PROXY_USAGE && gP !== null) || extraBodyParams.cache_control != null,
        j_ = rg(messagesForAPI_2, Fd, Iy),
        vc =
          pr && Ip === "idle"
            ? parentReplyMarkPlan({
                querySource: options.querySource,
                model: creditMintModel ?? Wn.model,
                isKeepaliveHeaderOnWire: yP && betaHeaderValues_2.includes(DO),
                hasSecondMarkerSlot: B_ && !ea && options.divergesAtMessageId === void 0,
                messages: j_,
              })
            : void 0,
        apiMessages = (HS = addCacheBreakpoints(
          j_,
          B_,
          Tw,
          options.skipCacheWrite,
          options.forkPointUuid,
          Lp(conversation, Ggr) || isMidConvCachePromotionRejected(),
          provider,
          L_ !== null,
          ea,
          BI,
          Of,
          options.divergesAtMessageId,
          {
            skipMessageCacheMarkers: options.skipMessageCacheMarkers === !0,
            report: (ql) => {
              oc = ql;
            },
          },
          hun(options.querySource, options.skipCacheWrite === !0),
          pr,
          vc,
        ));
      g$ = Of.some((ql, Ep) => ql !== Ep) ? Of : [];
      let eh = (ql) =>
        Array.isArray(ql.content) &&
        ql.content.some(
          (Ep) => typeof Ep === "object" && Ep !== null && "cache_control" in Ep && Ep.cache_control != null,
        );
      ((Yd = apiMessages.some((ql) => ql.role === "system" && eh(ql))), (Gc = apiMessages.some(eh)));
      let om = vc?.isMarkWanted === !0 ? apiMessages.findLastIndex(eh) : -1;
      if (
        ((xc =
          om > 0 &&
          apiMessages.some((ql, Ep) => {
            let role = ql.role;
            return Ep < om && role === "system" && eh(ql);
          })),
        (j5 =
          jT && JF && !CLAUDE_CODE_SIMULATE_PROXY_USAGE && filterBetasForProvider(filtered_2).includes(qT)),
        pr)
      ) {
        if (Qh !== void 0) rye(Qh);
        if (
          ((Qh = j5
            ? createServerClassifierResult(randomUUID_16(), {
                artifacts: cy?.artifacts,
                thread: L_ !== null,
                exactMcpAllowRules: cy && getExactMcpAllowRules(cy),
                judgeOnlyTools: options.autoModeServerContext?.judgeOnlyTools,
                agentId: options.agentId,
              })
            : void 0),
          Qh !== void 0 && cy !== void 0)
        )
          vTt(Qh.key, pickPriorTurnContext(cy));
      }
      let toolsForRequest = stripUnsupportedFoundryCapabilities(allTools, options.model);
      toolsForRequest = applyRefusedToolSchemas(toolsForRequest, conversation);
      let Nu =
        Nh !== null
          ? Nh.shapeInheritedFields(L_, { system: systemBlocks, tools: toolsForRequest })
          : { system: systemBlocks, tools: toolsForRequest };
      ((vw = systemBlocks),
        (S$ = toolsForRequest),
        (d1 = Nu.system !== systemBlocks),
        (c1 = L_ !== null),
        (F5 = L_?.sliceFrom ?? 0),
        (Aae = L_?.thread.type ?? "none"));
      let requestParams = {
        model: toProviderWireModelId(options.model),
        messages: L_ !== null && L_.sliceFrom > 0 ? apiMessages.slice(Of[L_.sliceFrom]) : apiMessages,
        system: Nu.system,
        ...(Nu.tools !== void 0 && { tools: Nu.tools }),
        tool_choice: toolChoice,
        ...(yP && betasRequestParam(betaHeaderValues_2)),
        metadata: getAPIMetadata({ agentContext: options.agentContext }),
        max_tokens: min,
        thinking: thinking,
        ...(N3 !== void 0 && { temperature: N3 }),
        ...(contextManagement && JF && filtered.includes(sle) && { context_management: contextManagement }),
        ...(j5 && cy !== void 0 && { safeguards: [{ type: DANGEROUS_TOOL_USE, classifier_context: cy }] }),
        ...(!CLAUDE_CODE_SIMULATE_PROXY_USAGE && _b ? _b : {}),
        ...(!CLAUDE_CODE_SIMULATE_PROXY_USAGE && gP ? gP : {}),
        ...Zg,
        ...extraBodyParams,
        ...{},
        ...(Object.keys(outputConfig).length > 0 && { output_config: outputConfig }),
        ...(fh !== void 0 && { speed: fh }),
        ...(L_ !== null && { thread: L_.thread }),
        ...(t$() &&
          (isAgenticQuery || options.forkPointUuid !== void 0) &&
          JF &&
          !CLAUDE_CODE_SIMULATE_PROXY_USAGE && { diagnostics: { previous_message_id: nt ?? null } }),
      };
      ((m$ = EI !== void 0 && requestParams.context_management === contextManagement),
        (OI = BI && requestParams.messages.some((message) => message.clear_at !== void 0)));
      let W_ = sanitizeDisabledThinking(requestParams.thinking, options.querySource, !Sgt);
      if (W_ !== requestParams.thinking) ((Sgt = !0), (requestParams.thinking = W_));
      {
        let thinking = requestParams.thinking;
        ((Mae = thinking?.type === "adaptive" || thinking?.type === "enabled" ? thinking.type : "disabled"),
          (z5 = readDisplayField(thinking)));
      }
      if (pr && containsMalformedStringDeep(requestParams)) {
        try {
          requestParams = clone(requestParams);
        } catch {}
        if ((repairMalformedStringsDeep(requestParams), !kgt))
          ((kgt = !0), logEvent("tengu_lone_surrogate_sanitized", { source: lit_2("queryModel") }));
      }
      let logEffortValue = requestParams.output_config?.effort;
      yS = typeof logEffortValue === "string" && isEffortLevel(logEffortValue) ? logEffortValue : void 0;
      let Xl = lastOutputConfig(messagesForAPI_2);
      return ((EE = Xl.effort ?? null), (n$ = Xl.now), requestParams);
    },
    TLe = !1,
    wgt = (permissionContext) => {
      if (TLe) return;
      TLe = !0;
      let pr = JF ? (permissionContext.betas ?? []) : [],
        Jr = permissionContext.thinking?.type ?? "disabled",
        Os = messagesForAPI_2.length,
        La = g1,
        Vl = Qs;
      options.getToolPermissionContext().then((Yl) => {
        logAPIQuery({
          model: options.model,
          messagesLength: Os,
          temperature: options.temperatureOverride ?? 1,
          betas: pr,
          permissionMode: Yl.mode,
          proactivityLevel: options.proactivityLevel,
          querySource: options.querySource,
          messageClientPlatform: options.messageClientPlatform,
          queryTracking: options.queryTracking,
          thinkingType: Jr,
          thinkingPrefixMismatchBehavior: La,
          effortValue: Vl,
          fastMode: fE,
          previousRequestId: Ie,
        });
      });
    },
    Tgt = !1,
    vgt = () => {
      if (TLe || Tgt) return;
      Tgt = !0;
      try {
        wgt(buildRequestParamsGuarded({ model: options.model }, !1));
      } catch (error) {
        logError(toError(error));
      }
    },
    Cm = [],
    Iae = 0,
    vLe,
    v$ = 0,
    _3 = 0,
    ELe = 0,
    RLe = !1,
    CLe,
    S3 = 0,
    dg = void 0,
    A_ = [],
    Iu = EMPTY_USAGE,
    T1 = null,
    Dae = 0,
    lm = null,
    FE = !1,
    aP = "none";
  function lP() {
    if (aP === "credited") return;
    ((aP = "credited"),
      (Dae += addToTotalSessionCost(
        calculateUSDCost(resolvedModel, Iu),
        Iu,
        options.model,
        options.querySource,
        CC,
        options.spawnedBySkill,
        options.activeSkill,
        options.activeMcpServer,
        options.activeMcpTool,
      )));
  }
  let dP = !1,
    Egt = !1,
    LI,
    k3 = !1,
    BT = 0,
    ALe = void 0,
    NMs = void 0,
    b3,
    NI = fE,
    E1 = !1,
    FMs = isMainAgent(options.agentContext) && options.querySource.startsWith("repl_main_thread"),
    $Ms = void 0,
    w3 = new Map(),
    Rgt = 3,
    Cgt = { value: 0 },
    h5n = Rgt,
    Agt = new Map(),
    T3 = !1,
    xgt = !1,
    Lae,
    uP,
    xLe = { count: 0 },
    PLe = getMaxRetriesFromEnv(),
    retryBudget = decideAttemptOutcome(
      {
        maxRetries: PLe,
        maxSleptThrough: getMaxSleptThrough(PLe),
        maxReconnects: getMaxReconnects(options.querySource),
        maxOverloaded: MAX_529_RETRIES,
        maxOutputFiltered: Eyn(),
        hasFallbackModel: Boolean(options.fallbackModel),
        persistent: pRe(),
        persistentCapacityOnly: pRe() && !Xb(),
        background: !isMainOrAgentQuerySource(options.querySource),
      },
      options.apiAttemptsLeft,
    ),
    E3 = !1,
    yb = null,
    $ae = !1,
    Pgt = (Wn, pr) => {
      if (((yb = null), ($ae = isFirstPartyApiBackend()), E3)) {
        if ($ae)
          ((Wn[ANTHROPIC_DISPATCH_ID] = V2P),
            (yb = fromEnum(V2P)),
            logForDebugging(`[dispatch] sent ${ANTHROPIC_DISPATCH_ID}=${V2P}`));
        return;
      }
      if (!pr && $ae) {
        let Jr = getDispatchVersion(classifyQuerySource(options.querySource));
        if (Jr !== null)
          ((Wn[ANTHROPIC_DISPATCH_ID] = Jr),
            (yb = fromEnum(Jr)),
            logForDebugging(`[dispatch] sent ${ANTHROPIC_DISPATCH_ID}=${Jr}`));
      }
    },
    Mgt = async (Wn) => {
      if (E3) return;
      let pr = Wn instanceof Ot ? Wn.status : void 0,
        Jr = pr !== void 0 && pr >= 500,
        Os = Wn instanceof ef;
      if (!(yb !== null ? Jr || Os : $ae && pr === 503)) return;
      if (
        ((E3 = !0),
        logForDebugging(
          `[dispatch] ${Jr ? `HTTP ${pr}` : "connection error"} with ${yb === null ? `no ${ANTHROPIC_DISPATCH_ID}` : `${ANTHROPIC_DISPATCH_ID}=${yb}`}; retrying once with ${ANTHROPIC_DISPATCH_ID}=${V2P}`,
          { level: "warn" },
        ),
        logEvent("tengu_dispatch_header_fallback", {
          model: telemetrySafeModelName(options.model),
          dispatch: yb ?? lit_2("none"),
          resend_dispatch: fromEnum(V2P),
          reason: yb === null ? Ioo(Wn) : Jr ? lit_2("5xx") : lit_2("conn_err"),
          status: pr !== void 0 ? fromNumber(pr) : lit_2("none"),
          query_source: agentTypeForTelemetry(options.querySource),
          request_id: ye(Wn instanceof Ot ? Wn.requestID : void 0),
        }),
        yb === null)
      ) {
        let Vl = Ooo(Wn);
        if (Vl > 0) await sleep(Vl, signal, { clock: clock });
      }
      return "retry:dispatch-header-strip";
    },
    M1 = !1,
    $E = !1,
    UT = !1,
    Hae,
    Ogt = (Wn, pr) => {
      if (!(Wn instanceof Ot) || Wn.status !== 400) return;
      let included = Wn.message.includes("`fallback-credit-"),
        Os = jw !== null && Wn.message.includes(`\`${jw.header}`),
        matches = (
          jw !== null
            ? new RegExp(`\`server-side-fallback-(?!${jw.header.slice(21)})`)
            : /`server-side-fallback-/
        ).test(Wn.message),
        Vl = (Wd) => {
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
              options.stickyBetas === void 0
                ? lit_2("session")
                : classifyQuerySource(options.querySource) === "main"
                  ? lit_2("detached_main")
                  : classifyQuerySource(options.querySource) === "subagent"
                    ? lit_2("agent")
                    : lit_2("aux"),
          });
        },
        Yl = classifyFallbackCreditError(Wn);
      if (Yl !== void 0 && !iP) {
        if (((iP = !0), (DI = void 0), Yl === "credit_beta_header")) {
          if ((Xg(conversation, RG), Os && jw !== null)) (Xg(conversation, jw), (Oae = !0));
          if (matches) (Xg(conversation, nj), (M1 = !0));
          if (Os && h3 && !Lp(conversation, nj)) eB(conversation, nj);
        }
        if (pr === "stream") C_(Yl, Wn.requestID ?? null, null);
        return (Vl(Yl), "retry:fallback-credit-strip");
      }
      let nd = classifyServerFallbackError(Wn);
      if (jw !== null && (nd === "category_beta_header" || (nd === "default_unconfigured" && S1)) && !Oae) {
        if (((Oae = !0), Xg(conversation, jw), included)) (Xg(conversation, RG), (iP = !0), (DI = void 0));
        if (matches) (Xg(conversation, nj), (M1 = !0));
        if (h3 && !Lp(conversation, nj)) eB(conversation, nj);
        return (Vl(nd), "retry:server-fallback-category-strip");
      }
      if (nd !== void 0 && (S1 || nd === "beta_header") && !M1) {
        if (((M1 = !0), Xg(conversation, nj), nd === "beta_header" && included))
          (Xg(conversation, RG), (iP = !0), (DI = void 0));
        return (Vl(nd), "retry:server-fallback-strip");
      }
      if (isAdvisorModelMismatchError(Wn)) return;
      if (isMidConversationSystemRejected(Wn)) return;
      if (isWebSearchContentRejected(Wn) || isCodeExecutionOutputRejected(Wn)) return;
      if (RK(Wn)) return;
      if (Tke(Wn)) return;
      if (isInvalidEffortError(Wn) && w$ !== "explicit") return;
      if (isFastModeNotEnabledError(Wn) || parseMaxTokensContextOverflowError(Wn) !== void 0) return;
      if (yLe(Wn)) {
        if (pr === "stream" && sP && !iP) DI = options.fallbackCreditCode;
        return;
      }
      if (options.resumeIncompleteThinking) return;
      if (pr === "sync" && FI(Wn)) return;
      if (Yl === void 0 && nd === void 0) {
        let Wd = SI(Wn);
        if (Wd !== void 0) return Wd;
        let ku = a1(Wn);
        if (ku !== void 0) return ku;
        let Np = OLe(Wn);
        if (Np !== void 0) return Np;
      }
      if (pr === "stream" && y3 && !iP)
        return (
          (iP = !0),
          C_("unattributed_400_dropped", Wn.requestID ?? null, null),
          Vl("unattributed"),
          "retry:fallback-credit-unattributed"
        );
      if ((S1 || h3) && !M1) {
        if (((M1 = !0), Xg(conversation, nj), jw !== null)) Xg(conversation, jw);
        return (Vl("unattributed"), "retry:server-fallback-strip");
      }
      if (ygt && !hgt)
        return (
          (hgt = !0),
          Xg(conversation, RG),
          nP.push(RG),
          Vl("unattributed"),
          "retry:fallback-credit-header-strip"
        );
      return;
    },
    FI = (Wn) =>
      DKt(options.model, Wn) === "refused" ||
      isAfkModeBetaRejected(Wn) ||
      isAdvisorResultUnprocessable(Wn) ||
      isAdvisorUnavailableError(Wn) ||
      isWebSearchContentRejected(Wn) ||
      isCodeExecutionOutputRejected(Wn) ||
      getMediaErrorFromApiError(Wn) !== void 0 ||
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
      isStructuredOutputsUnsupported(Wn),
    MLe = () => {
      if (cs === "tool_search") return;
      try {
        let Wn = 0;
        if (cs === void 0) allTools = allTools.slice();
        else
          allTools = allTools.flatMap((Os) => {
            if (!("input_schema" in Os)) return [Os];
            if (!tools.some((Yl) => toolMatchesName(Yl, Os.name))) return [];
            if (Os.defer_loading !== !0) return [Os];
            Wn++;
            let { defer_loading: defer_loading, ...Vl } = Os;
            return [Vl];
          });
        let pr = new Set(allTools.flatMap((Os) => ("name" in Os ? [Os.name] : []))),
          Jr = new Map(tools.map((Os, La) => [Os.name, La]));
        for (let Os of hr) {
          if (!("name" in Os) || pr.has(Os.name)) continue;
          let La = Jr.get(Os.name) ?? 1 / 0,
            index = allTools.findIndex((Yl) => !("input_schema" in Yl) || (Jr.get(Yl.name) ?? -1) > La);
          if (index === -1) index = allTools.length;
          (allTools.splice(index, 0, Os), pr.add(Os.name), Wn++);
        }
        if (cs === "tool_addition") (Ti?.splice(0, Ti.length), cco(conversation), PDt(conversation));
        else if (Wn === 0) return;
        else {
          let sliced = _r.slice();
          for (let La of tools) {
            if (!pr.has(La.name) || !bo.has(La.name)) continue;
            let Vl = Jr.get(La.name) ?? 1 / 0,
              index = sliced.findIndex((nd) => (Jr.get(nd.name) ?? -1) > Vl);
            if (index === -1) index = sliced.length;
            sliced.splice(index, 0, La);
          }
          Cr = cacheNoChannelTools(conversation, !1, () =>
            buildDeclaredToolSet(TJ(sliced), tools, fs ?? Cr?.recordedOnly),
          );
        }
        ((Ac = "error_recovery"),
          (uh = !1),
          logForDebugging(
            `[late-tool-additions] no ToolSearch on this request: ${Wn} late tool(s) go inline from this request on`,
            { level: "warn" },
          ));
      } catch (error) {
        logError(toError(error));
      }
    },
    Igt = () => {
      let Wn = Ks;
      if (Wn) Ks = () => dropAdvisorFromApiSystem(stripAdvisorBlocks(Wn()));
      let pr = uS;
      if (pr) uS = () => dropAdvisorFromApiSystem(stripAdvisorBlocks(pr()));
      let Jr = kl;
      if (Jr) kl = () => dropAdvisorFromApiSystem(stripAdvisorBlocks(Jr()));
    },
    y5n = () => {
      let Wn = Ks;
      if (Wn) Ks = () => stripAdvisorBlocks(Wn());
      let pr = uS;
      if (pr) uS = () => stripAdvisorBlocks(pr());
      let Jr = kl;
      if (Jr) kl = () => stripAdvisorBlocks(Jr());
    },
    Dgt = () => {
      if (!isAdvisorToolEnabled()) betaList = betaList.filter((Wn) => Wn !== d3e);
    },
    Lgt = !1,
    Ngt = (Wn) => {
      if (Lgt || !isAdvisorUnavailableError(Wn)) return;
      let pr = (La) => !("input_schema" in La) && "name" in La && La.name === ADVISOR_TOOL_NAME,
        any = allTools.some(pr),
        Os = hb.includes(d3e.header) && isAdvisorBetaRejected(Wn);
      if (!any && !Os) return;
      Lgt = !0;
      try {
        if (any)
          ((allTools = allTools.filter((Vl) => !pr(Vl))),
            (messagesForAPI_2 = ch(
              dropAdvisorFromApiSystem(stripAdvisorBlocks(messagesForAPI_2)),
              "error_recovery",
            )),
            Igt(),
            (Ac = "error_recovery"),
            (uh = !1));
        conversation.advisorHeld = {
          model: void 0,
          viaToolChange: conversation.advisorHeld?.viaToolChange ?? !1,
          refused: !0,
        };
        let La = getAdvisorRefusalScope(Wn);
        if (La === "process") markAdvisorRefusedForProcess();
        else if (La === "host") markAdvisorRefusedForHost();
        (Dgt(),
          logForDebugging(
            `[advisor] the server refused the advisor ${Os ? "beta header" : "entry"} (scope: ${La}); retrying once without the advisor`,
            { level: "warn" },
          ),
          logEvent("tengu_advisor_entry_refused_retry", {
            query_source: agentTypeForTelemetry(options.querySource),
            organization_wide: La === "process",
            host_wide: La === "host",
            beta_header_refused: Os,
          }));
      } catch (error) {
        logError(toError(error));
      }
      return "retry:advisor-entry-refused";
    },
    Fgt = new ToolSchemaWireCache(conversation),
    $gt = (Wn) => {
      try {
        let resolved = Fgt.resolve(Wn, S$, tools, options.querySource);
        if (resolved !== void 0) ((Ac = "error_recovery"), (uh = !1));
        return resolved;
      } catch (error) {
        logError(toError(error));
        return;
      }
    },
    Hgt = (Wn) => {
      return;
    },
    HMs = "idle",
    OLe = (Wn) => {
      return;
    },
    Bgt = () => {
      try {
        let Wn = !1,
          pr = options.advisorActive !== !1;
        if (
          ((allTools = allTools.flatMap((Jr) => {
            if (
              "input_schema" in Jr ||
              !("defer_loading" in Jr) ||
              Jr.defer_loading !== !0 ||
              Jr.name !== ADVISOR_TOOL_NAME
            )
              return [Jr];
            if (((Wn = !0), !pr)) return [];
            let { defer_loading: defer_loading, ...La } = Jr;
            return [La];
          })),
          Wn)
        ) {
          if (!pr)
            ((messagesForAPI_2 = ch(
              dropAdvisorFromApiSystem(stripAdvisorBlocks(messagesForAPI_2)),
              "error_recovery",
            )),
              Igt(),
              Dgt());
          if (pr && conversation.advisorHeld?.viaToolChange === !0)
            conversation.advisorHeld = { ...conversation.advisorHeld, inFallback: !0 };
          ((Ac = "error_recovery"), (uh = !1));
        }
      } catch (error) {
        logError(toError(error));
      }
    },
    _5n = () => {
      let Wn = Ks;
      if (Wn) Ks = () => stripWebSearchBlocks(Wn()).messages;
      let pr = uS;
      if (pr) uS = () => stripWebSearchBlocks(pr()).messages;
      let Jr = kl;
      if (Jr) kl = () => stripWebSearchBlocks(Jr()).messages;
    },
    Ugt = (Wn, pr) => {
      if (!isWebSearchContentRejected(Wn)) return;
      let { messages: messages, removed: removed } = stripWebSearchBlocks(messagesForAPI_2);
      if (messages === messagesForAPI_2) return;
      return (
        (messagesForAPI_2 = ch(messages, "error_recovery")),
        tLi(conversation),
        _5n(),
        logForDebugging(
          `[web-search-strip] The API could not decrypt web search content in this conversation's history: removed ${removed.toolUses} ${plural(removed.toolUses, "search call")}, ${removed.results} ${plural(removed.results, "result block")} and ${removed.citations} ${plural(removed.citations, "citation")} from the request; retrying once. Later requests in this conversation leave them out too.`,
          { level: "warn" },
        ),
        logFeatureSad("api_request", "api_request_web_search_stripped", {
          query_source: agentTypeForTelemetry(options.querySource),
          transport: fromEnum(pr),
          tool_uses: removed.toolUses,
          results: removed.results,
          citations: removed.citations,
          placeholders: removed.placeholders,
        }),
        "retry:web-search-strip"
      );
    },
    xC,
    ILe = (Wn) => {
      let pr = uco(conversation, effectiveModel);
      if (!isUnprocessableRequest(Wn) || pr?.gaveUp) return;
      try {
        let Jr = countMediaItems(messagesForAPI_2),
          min = Math.min(Jr, xC?.limit ?? 1 / 0),
          found = aOi.find((ku) => ku < min);
        if (found === void 0) {
          if (xC !== void 0) {
            let { steps: steps, refusedAt: refusedAt } = xC;
            ((xC = void 0),
              fco(conversation, { model: effectiveModel, limit: pr?.limit, gaveUp: !0 }),
              logForDebugging(
                `[media-item-limit] The model still refuses this request as unprocessable with ${Jr} images and documents left. Not removing any more.`,
                { level: "warn" },
              ),
              logFeatureSad("api_request", "api_request_media_limit_gave_up", {
                query_source: agentTypeForTelemetry(options.querySource),
                media_items_refused: refusedAt,
                steps: steps,
              }));
          }
          return;
        }
        let Vl = (ku) => stripExcessMediaItems(ku, found, Bhs);
        messagesForAPI_2 = ch(Vl(messagesForAPI_2), "error_recovery");
        let Yl = Ks;
        if (Yl) Ks = () => Vl(Yl());
        let nd = uS;
        if (nd) uS = () => Vl(nd());
        let Wd = kl;
        if (Wd) kl = () => Vl(Wd());
        return (
          (xC = { limit: found, steps: (xC?.steps ?? 0) + 1, refusedAt: xC?.refusedAt ?? Jr }),
          logForDebugging(
            `[media-item-limit] The model refused this request as unprocessable. It held ${Jr} images and documents; the oldest were removed to fit a limit of ${found}, and it is being sent again. If it is answered, this conversation keeps that limit.`,
            { level: "warn" },
          ),
          `retry:media-item-limit:${found}`
        );
      } catch (error) {
        logError(toError(error));
        return;
      }
    },
    DLe = () => {
      try {
        let Wn = uco(conversation, effectiveModel);
        if (xC === void 0) {
          if (Wn?.gaveUp && Wn.limit === void 0) ODt(conversation);
          else if (Wn?.gaveUp) fco(conversation, { ...Wn, gaveUp: !1 });
          return;
        }
        let { limit: limit, steps: steps, refusedAt: refusedAt } = xC;
        ((xC = void 0),
          fco(conversation, {
            model: effectiveModel,
            limit: Math.min(limit, Wn?.limit ?? 1 / 0),
            gaveUp: !1,
          }),
          logFeatureSad("api_request", "api_request_media_limit_lowered", {
            query_source: agentTypeForTelemetry(options.querySource),
            media_items_refused: refusedAt,
            media_item_limit: limit,
            steps: steps,
          }));
      } catch (error) {
        logError(toError(error));
      }
    },
    jgt = (Wn) => {
      {
        let pr = Wn instanceof Ot && Wn.status === 400;
        if (Ip === "retrying") {
          if (pr) Ip = "spent";
          return;
        }
        if (Ip === "idle" && xc && pr && Wn.message.includes("cache_control"))
          return ((Ip = "retrying"), "retry:prompt-end-mark");
      }
      return;
    },
    Wgt = () => {
      if (Ip !== "retrying") return;
      if (((Ip = "spent"), creditMintModel !== void 0)) return;
      try {
        (markPromptEndMarkRefused(),
          logForDebugging(
            "[cache-breakpoints] a side request that marked a system message before its last marker drew a 400 that names cache_control, and went through without that marker; no later side request carries it",
            { level: "warn" },
          ),
          logFeatureSad("api_prompt_end_mark", "server_rejected"));
      } catch (error) {
        logError(error);
      }
    },
    LLe = (Wn, pr = !1) => {
      let Jr =
        betaList.includes(tb) &&
        !isMidConversationSystemRejected(Wn) &&
        classifyToolChangeError(Wn) !== "header_rejected"
          ? classifyInlineToolDefinitionError(Wn)
          : void 0;
      if (Jr !== void 0) {
        if (kl) {
          let Wd = kl();
          if (
            ((messagesForAPI_2 = ch(
              !betaList.includes(CG) ? Fte(Wd) : !betaList.includes(Z4) ? dEe(Wd) : Wd,
              "error_recovery",
            )),
            (tp = Rf),
            addNameOnlyAnnouncements(conversation, vn),
            cs === void 0)
          )
            MLe();
        }
        return (
          (kl = null),
          (betaList = betaList.filter((Wd) => Wd !== tb)),
          handleInlineToolsRejection(conversation, Jr),
          Bx(),
          logEvent("tengu_inline_tools_refused_retry", { cause: fromEnum(Jr) }),
          "retry:inline-tools-strip"
        );
      }
      let Os =
        betaList.includes(Lb) && !isMidConversationSystemRejected(Wn) ? classifyToolChangeError(Wn) : void 0;
      if (Os !== void 0) {
        if (Ks) {
          let ku = Ks();
          ((messagesForAPI_2 = ch(
            !betaList.includes(CG) ? Fte(ku) : !betaList.includes(Z4) ? dEe(ku) : ku,
            "error_recovery",
          )),
            (tp = Rf));
        }
        Ks = null;
        let Wd = betaList.includes(tb) && classifyInlineToolDefinitionError(Wn) === "header_rejected";
        return (
          (betaList = betaList.filter((ku) => ku !== Lb && ku !== tb)),
          classifyToolAdditionRejection(conversation, Os, options.model, Wd),
          Bx(),
          MLe(),
          Bgt(),
          "retry:tool-change-strip"
        );
      }
      let La = pr || isMidConversationSystemRejected(Wn),
        Vl = getMidConvSystemRejection(Wn),
        Yl = betaList.includes(CG) && isOutputConfigRejected(Wn) && !isEffortUnsupportedError(Wn),
        included = betaList.includes(Z4);
      if (included && isOutputTimingRejected(Wn) && !La && !Yl)
        return (
          (messagesForAPI_2 = ch(dEe(messagesForAPI_2), "error_recovery")),
          (betaList = betaList.filter((Wd) => Wd !== Z4)),
          Xg(conversation, Z4),
          logForDebugging(
            `[per-turn-timing] the server refused the current-time statement (${errorMessage(Wn)}); leaving it out for the rest of this conversation (until /clear or /compact)`,
            { level: "warn" },
          ),
          "retry:per-turn-timing-strip"
        );
      if (uS && (La || Yl)) {
        if (Vl !== null && !HS.some((Kg) => Kg.role === "system" && Kg.content.length > 0)) return;
        let Wd = hasContextBeta(conversation),
          ku = HS.length,
          Np = messagesForAPI_2.length,
          hf =
            Vl === null
              ? void 0
              : Vl.messageIndex === void 0
                ? `${ku} messages on the wire`
                : Vl.messageIndex >= ku
                  ? `messages[${Vl.messageIndex}], beyond the ${ku} this request sent`
                  : `messages[${Vl.messageIndex}] of ${ku} on the wire; conversation entry ${Eh(Vl.messageIndex) ?? "none of ours (a clear_at reminder slot)"} of ${Np}`;
        if (
          ((messagesForAPI_2 = ch(La ? uS() : Fte(messagesForAPI_2), "error_recovery")),
          (uS = null),
          included)
        )
          betaList = betaList.filter((Kg) => Kg !== Z4);
        if (La) {
          if (
            ((tp = Rf),
            (betaList = betaList.filter(
              (Kg) => Kg !== LO && Kg !== CG && Kg !== Lb && Kg !== tb && Kg !== MK,
            )),
            Xg(conversation, LO),
            NYo(conversation),
            Bx(),
            MLe(),
            Bgt(),
            Ks !== null)
          )
            (logFeatureSad("mcp_late_tool_additions", "rejected_with_mid_conv_system"), (Ks = null));
        }
        if (Yl) {
          if (
            ((betaList = betaList.filter((Kg) => Kg !== CG)),
            latchBetaRefused(CG, isPerTurnEffortRejected(Wn)),
            EE !== null)
          )
            logFeatureSad("api_per_turn_effort", "server_rejected");
        }
        if (options.stickyBetas === void 0) notifyPerTurnEffortInactive(conversation, Wd);
        return (
          logForDebugging(
            hf !== void 0
              ? `[mid-conv-system] API refused where a system message sits (${hf}) \u2014 retrying once without system messages; off for this conversation until /clear or /compact`
              : Yl
                ? "[per-turn-control] server rejected the per-turn statements \u2014 resending without them"
                : pr
                  ? "[mid-conv-system] an HTTP 400 or 422 that nothing else recognises answered a request on which system turns were enabled; guessing the platform refuses them and resending without system messages; if that goes through they stay off until /clear or /compact"
                  : '[mid-conv-system] server rejected role:"system" \u2014 falling back to a body with no {role:"system"} turn, sticky-rejecting the beta until /clear or /compact',
            { level: "warn" },
          ),
          logEvent("tengu_mid_conv_system_fallback_retry", {
            per_turn_effort: Yl,
            ...(pr && { unclaimed: pr }),
            misplaced: Vl !== null,
            ...(Vl !== null && {
              misplaced_index: Vl.messageIndex ?? -1,
              wire_message_count: ku,
              message_count: Np,
            }),
          }),
          "retry:mid-conv-system"
        );
      }
      if (Yd && !Lp(conversation, Ggr) && isCacheControlFieldRejected(Wn))
        return (
          Xg(conversation, Ggr),
          markMidConvCachePromotionRejected(),
          logForDebugging(
            "[mid-conv-system] proxy rejected cache_control on the api_system tail \u2014 demoting the breakpoint to the trailing message for this conversation",
            { level: "warn" },
          ),
          logFeatureSad("api_midconv_cache_proxy", "proxy_rejected"),
          "retry:api-system-cache-demote"
        );
      return;
    },
    Ggt = (Wn) => {
      if (Yd && !xc && !Lp(conversation, Ggr) && !Lp(conversation, sls)) {
        let pr = Wn?.input_tokens ?? 0,
          Jr = Wn?.cache_read_input_tokens ?? 0,
          Os =
            (Wn?.cache_creation_input_tokens ?? 0) +
            (Wn?.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
            (Wn?.cache_creation?.ephemeral_1h_input_tokens ?? 0),
          La = pr + Jr + Os > 0,
          Vl = Os > 0 && pr < MIDCONV_CACHE_PROXY_READ_THRESHOLD;
        if (La && !Vl) return;
        (Xg(conversation, sls), logFeatureOk("api_midconv_cache_proxy"));
      }
    },
    zgt = (Wn) => {
      if (!Gc || options.skipCacheWrite || !isCustomEndpoint(getProviderForModel(options.model))) return;
      let pr = decideStreamFallbackWarning(Ws().cacheCoverage, conversation, Wn);
      if (pr.kind === "confirm") {
        logFeatureOk("api_prompt_cache_coverage", { provider: fromEnum(getProviderForModel(options.model)) });
        return;
      }
      if (pr.kind !== "fire") return;
      (logForDebugging(
        "[cache-coverage] sustained uncovered input with a cache breakpoint on the wire through a custom endpoint \u2014 no cache-billing evidence visible at the client (the endpoint may be silently stripping cache_control)",
        { level: "warn" },
      ),
        logFeatureSad("api_prompt_cache_coverage", "cache_coverage_loss", {
          api_system_marker: Yd,
          consecutive_turns: pr.consecutive,
          input_tokens: pr.inputTokens,
          cache_read_input_tokens: pr.cacheReadTokens,
          cache_creation_input_tokens: pr.cacheCreationTokens,
          provider: fromEnum(getProviderForModel(options.model)),
        }));
    },
    qgt = () => {
      if (!isPerTurnEffortOkEmitted() && EE !== null)
        (markPerTurnEffortOkEmitted(), logFeatureOk("api_per_turn_effort"));
    },
    Kgt = () => {
      if (!isLateToolAdditionsOkEmitted() && Ks !== null)
        (markLateToolAdditionsOkEmitted(), logFeatureOk("mcp_late_tool_additions"));
      if (
        !isInlineToolsOkEmitted() &&
        Ks !== null &&
        betaList.includes(tb) &&
        messagesForAPI_2.some((Wn) => Wn.type === "api_system" && Wn.toolDefinitions !== void 0)
      )
        (markInlineToolsOkEmitted(), logFeatureOk("mcp_inline_tools"));
    },
    Vgt = () => {},
    Ygt = () => {},
    Xgt = () => {
      if (ME === "retrying") {
        ME = "spent";
        try {
          if (PG !== null) Xg(conversation, PG);
          if (II) IQe();
          (logEvent("tengu_tether_unrecognised_400", {
            phase: lit_2("healed"),
            planner_backed: II,
            query_source: agentTypeForTelemetry(options.querySource),
          }),
            logForDebugging(
              `[tether] a request carrying the message-threads header got an HTTP 400 that Claude Code does not recognise (request id ${G5 ?? "unknown"}), and a later attempt without the header succeeded. ${II ? "Message Threads stays off for the rest of this session." : "The header stays off for this conversation."}`,
              { level: "warn" },
            ));
        } catch (error) {
          logError(error);
        }
      }
      if (W5) logKeptReminderOk();
      if (rP === "retrying")
        ((rP = "spent"),
          Xg(conversation, MK),
          DQe(),
          Bx(),
          logFeatureSad("api_kept_reminder_clear_at", "unrecognised_400"),
          logForDebugging(
            `[reminders] a request carrying a clear_at message got an HTTP 400 that Claude Code does not recognise (request id ${k$ ?? "unknown"}), and the same request without clear_at succeeded. For the rest of this session earlier reminders are not re-sent, and requests that can use a Message Threads thread get no reminder.`,
            { level: "warn" },
          ));
    },
    S5n = (Wn) => {
      if (!isInvalidEffortError(Wn) || w$ === "explicit" || isAutoModeQuerySource(options.querySource))
        return null;
      try {
        let pr = effortInPlay(yS, messagesForAPI_2),
          Jr = pr === void 0 ? void 0 : lowerLearnedEffortCap(resolvedModel, pr);
        if (Jr === void 0) return (logFeatureBad("api_org_effort_cap_retry", "no_lower_level"), null);
        if (((ZF = yV(fI, yr())), EE !== null))
          messagesForAPI_2 = ch(
            attachPerTurnOutputConfig(Fte(messagesForAPI_2), { effort: tu, effortCap: yr(), now: n$ }),
            "error_recovery",
          );
        return (
          logForDebugging(
            `[effort] the API refused effort '${pr}' as above the organization's cap for model ${options.model}. Sending the request again at no more than '${Jr}', as later requests to this model will be.`,
            { level: "warn" },
          ),
          `retry:org-effort-cap:${Jr}`
        );
      } catch (error) {
        return (logError(toError(error)), null);
      }
    };
  function* Qgt() {
    if (!Hi) return;
    let Wn;
    try {
      let pr = yV(Di, yr());
      if (pr !== Di && takeEffortCapNotice(resolvedModel))
        (logFeatureOk("api_org_effort_cap_retry"),
          (Wn = createInformationalSystemMessage(
            `Your organization limits effort for ${renderModelName(resolvedModel)}, so Claude Code is using '${pr}' instead of '${Di}'. Your effort setting is unchanged.`,
            "warning",
          )));
    } catch (error) {
      logError(toError(error));
    }
    if (Wn) yield Wn;
  }
  let Jgt = (Wn) => {
      if (!isEffortUnsupportedError(Wn)) return S5n(Wn);
      if ((markEffortUnsupported(options.model), resolvedModel !== options.model))
        markEffortUnsupported(resolvedModel);
      return (
        logForDebugging(
          `[effort] the server refused effort for model ${options.model} (the output_config.effort field or the anthropic-beta value ${Cge.header}). Sending the request again without either; this Claude Code process will not send either to this model again.`,
          { level: "warn" },
        ),
        logEvent("tengu_effort_unsupported_retry", { model: telemetrySafeModelName(options.model) }),
        "retry:effort-unsupported"
      );
    },
    Zgt = (Wn) => {
      if (!s3 || !isStructuredOutputsUnsupported(Wn)) return null;
      try {
        return (
          Jve(options.model),
          logForDebugging(
            `[structured-outputs] model ${options.model} rejected output_config.format; latching unsupported and retrying without it.`,
            { level: "warn" },
          ),
          logEvent("tengu_structured_outputs_unsupported_retry", {
            model: telemetrySafeModelName(options.model),
          }),
          "retry:structured-outputs-unsupported"
        );
      } catch (error) {
        return (logError(toError(error)), null);
      }
    },
    eht = (Wn) => null,
    tht = (Wn) => {
      if (m1 === "highlights" && isThinkingDisplayRejected(Wn))
        return (
          markThinkingHighlightsRefused(),
          logForDebugging(
            "[thinking] server rejected thinking.display highlights; asking for omitted for the rest of this process and retrying.",
            { level: "warn" },
          ),
          logEvent("tengu_thinking_display_highlights_rejected_retry", {
            model: telemetrySafeModelName(options.model),
          }),
          "retry:thinking-display-highlights"
        );
      return null;
    },
    NLe = (Wn, pr = !1) => {
      if (!wE || !hb.includes(xG.header)) return null;
      let Jr =
          isThinkingBindingRejected(Wn) ||
          (!shouldIncludeFirstPartyOnlyBetas() && mentionsThinkingBindingBeta(Wn)),
        Os =
          !shouldIncludeFirstPartyOnlyBetas() &&
          (isInvalidBetaFlagError(Wn) || (pr && Wn instanceof Ot && Wn.status === 400 && !PE(Wn) && !FI(Wn)));
      if (!Jr && !Os) return null;
      return (
        (wE = !1),
        (AC = void 0),
        (betaList = betaList.filter((La) => La !== xG)),
        Xg(conversation, xG),
        logForDebugging(
          Jr
            ? "[thinking] server rejected the thinking-binding-controls beta; dropping the header and the block_binding value for this conversation and retrying."
            : "[thinking] an HTTP 400 that does not name the thinking-binding-controls beta arrived on a request that carried it; guessing the platform refuses that beta, so retrying once without it and leaving it off for this conversation. The only loss is the API's list of the thinking blocks it dropped.",
          { level: "warn" },
        ),
        logEvent("tengu_thinking_binding_rejected_retry", { model: telemetrySafeModelName(options.model) }),
        "retry:thinking-binding-controls"
      );
    },
    nht = (Wn) => {
      if (!hb.includes(AU.header)) return null;
      if (WW() || !isInvalidBetaFlagError(Wn)) return null;
      return (
        (betaList = betaList.filter((pr) => pr !== AU)),
        Xg(conversation, AU),
        nP.push(AU),
        logForDebugging(
          "[thinking-token-count] server rejected the beta; dropping it for this conversation and retrying.",
          { level: "warn" },
        ),
        logEvent("tengu_thinking_token_count_rejected_retry", {
          model: telemetrySafeModelName(options.model),
          provider: getAPIProviderForAnalytics(),
          unnamed: !0,
        }),
        "retry:thinking-token-count-beta"
      );
    },
    oht = (Wn) => {
      try {
        let pr = getRejectedBetas(Wn, [...hb, ...Pae]);
        if (pr.length === 0) return;
        let Jr = new Set(pr);
        betaList = betaList.filter((Os) => !Jr.has(Os));
        for (let Os of pr) {
          let La = isBetaHeaderRejected(Wn, Os);
          (latchBetaRefused(Os, La),
            logEvent("tengu_beta_400_healed", {
              beta: hashToolNames([Os.header]),
              model: telemetrySafeModelName(options.model),
              provider: getAPIProviderForAnalytics(),
              status: Wn instanceof Ot ? Wn.status : void 0,
              only_mentioned: !La && !isBetaListedAsUnexpected(Wn, Os),
            }));
        }
        if (Jr.has(cOe)) systemBlocks = cLe();
        if (Jr.has(KPt) && d3 !== void 0) markFallbackModelFastRejected(d3);
        return `retry:beta-rejected:${pr.map((Os) => Os.name).join(",")}`;
      } catch (error) {
        logError(error);
        return;
      }
    },
    rht = (Wn) => {
      if (!(Wn instanceof Ot) || Wn.status !== 400) return null;
      try {
        let pr = isContext1mBetaRejected(Wn),
          Jr = !pr && isInvalidBetaFlagError(Wn);
        if (Gd === "spent") return null;
        if (Gd !== "idle")
          return (
            (Gd = Gd === "guessing" && Jr ? "spent" : "unproven"),
            logForDebugging(
              `[betas] the resend without ${yv.header} also got an HTTP 400, so the backend is not recorded as rejecting it; ${Gd === "spent" ? 'both said "invalid beta flag", so it is sent again from the next attempt' : "it stays off for the remaining attempts of this request and is sent again on the next request"}`,
              { level: "warn" },
            ),
            null
          );
        if (!sc || hitsAnthropicBackend(getProviderForModel(options.model)) || !(pr || (Jr && !WW())))
          return null;
        return (
          (Gd = pr ? "retrying" : "guessing"),
          logForDebugging(
            `[betas] an HTTP 400 ${pr ? "reads as the backend rejecting" : 'says "invalid beta flag", which may be about'} ${yv.header}; resending once without it`,
            { level: "warn" },
          ),
          "retry:context-1m-beta"
        );
      } catch (error) {
        return (logError(error), null);
      }
    },
    sht = () => {
      if (Gd !== "retrying" && Gd !== "guessing") return;
      let Wn = Gd === "guessing";
      Gd = "spent";
      try {
        ((betaList = betaList.filter((pr) => pr !== yv)),
          rejectContextBetaForModel(options.model),
          logEvent("tengu_beta_400_healed", {
            beta: hashToolNames([yv.header]),
            model: telemetrySafeModelName(options.model),
            provider: getAPIProviderForAnalytics(),
            status: 400,
            unnamed: Wn,
          }));
      } catch (error) {
        logError(error);
      }
    },
    iht = (Wn) => {
      if (!hb.includes(l3e.header) || !isThinkingResumptionBetaRejected(Wn)) return null;
      return (
        markThinkingResumptionRefused(),
        markBetaHeaderRefused(l3e),
        (betaList = betaList.filter((pr) => pr !== l3e)),
        logForDebugging(
          "[thinking-resumption] server rejected the thinking-resumption beta header; disabled for this process",
          { level: "warn" },
        ),
        logFeatureSad("query_thinking_block_resumption", "header_rejected"),
        fo ? "surface:resume-prefill" : "retry:thinking-resumption-beta"
      );
    },
    aht,
    k5n = (Wn) => Wn instanceof Ot && isConversationBindingError(Wn),
    I1 = 0,
    stopReason = null,
    PC = "all",
    FLe = (Wn) => {
      if (!tp) PC = Wn;
      else if (
        PC !== "all" &&
        (Wn === "all" ||
          Wn.messageIndex < PC.messageIndex ||
          (Wn.messageIndex === PC.messageIndex && Wn.thinkingIndex < PC.thinkingIndex))
      )
        PC = Wn;
      tp = !0;
    },
    b5n = (Wn) => {
      if (_1) return;
      let pr = HS[Wn.messageIndex];
      if (pr?.role !== "assistant" || !Array.isArray(pr.content)) return;
      let Jr = getThinkingBlockKey(pr.content[Wn.blockIndex]);
      if (Jr === void 0) return;
      let Os,
        La = new Map();
      for (let Vl = 0; Vl < messagesForAPI_2.length; Vl++) {
        let Yl = messagesForAPI_2[Vl];
        if (Yl.type !== "assistant" || !Array.isArray(Yl.message.content)) continue;
        let id = Yl.message.id,
          Wd = La.get(id) ?? 0;
        for (let ku of Yl.message.content) {
          if (ku.type !== "thinking" && ku.type !== "redacted_thinking") continue;
          if (getThinkingBlockKey(ku) === Jr) {
            if (Os !== void 0) return;
            Os = {
              messageIndex: Vl,
              indexInMessage: Wd - (La.get(id) ?? 0),
              thinkingIndex: Wd,
              messageId: id,
            };
          }
          Wd++;
        }
        La.set(id, Wd);
      }
      return typeof Os?.messageId === "string" ? Os : void 0;
    },
    dht = (Wn) => {
      try {
        if (!k5n(Wn)) return;
        I1++;
        let pr = Wn.requestID || Wn.error?.request_id || null;
        if (I1 === 1) stopReason = pr;
        let Jr = parseThinkingPrefixMismatchHeader(Wn),
          Os = messagesForAPI_2,
          La = (() => {
            if (options.resumeIncompleteThinking) return;
            let Wd = Jr?.block !== void 0 && I1 <= MAX_SIGNATURE_STRIP_ATTEMPTS ? b5n(Jr.block) : void 0;
            if (Wd !== void 0) {
              let Np = stripThinkingFromPoint(Os, {
                messageIndex: Wd.messageIndex,
                thinkingIndex: Wd.indexInMessage,
              });
              if (Np !== Os) return { scope: "partial", stripped: Np, from: Wd };
            }
            let ku = stripAllThinking(Os);
            return ku !== Os ? { scope: "all", stripped: ku, from: "all" } : void 0;
          })();
        if (La === void 0 && !tp) markPrefixLockHealDeclined(Wn);
        let Vl = La?.scope ?? "none",
          Yl = summarizeThinkingStrip(Os, La?.stripped ?? Os);
        if (La !== void 0) ((messagesForAPI_2 = ch(La.stripped, "error_recovery", !0)), FLe(La.from));
        logForDebugging(
          La === void 0
            ? "[thinking] prefix-lock rejection: nothing to strip; the error is returned."
            : `[thinking] prefix-lock rejection: stripped ${Yl.blocksStripped} of ${Yl.blocksSent} thinking block(s) (${Vl}) and retrying.`,
          { level: "warn" },
        );
        let nd = getPendingChangeSummary(options.querySource, options.agentId);
        return (
          logEvent("tengu_strict_prefix_lock_400_surfaced", {
            query_source: agentTypeForTelemetry(options.querySource),
            model: telemetrySafeModelName(options.model),
            request_id: vh(pr),
            chain_request_id: vh(stopReason),
            client_request_id: ye(Ah),
            solicited: r3,
            mismatch_kind: ye(Jr?.kind),
            failing_message_index: Jr?.block?.messageIndex,
            failing_block_index: Jr?.block?.blockIndex,
            thinking_blocks_sent: Yl.blocksSent,
            thinking_turns_sent: Yl.turnsSent,
            strip_scope: fromEnum(Vl),
            stripped_block_count: Yl.blocksStripped,
            stripped_turn_count: Yl.turnsStripped,
            attempt: I1,
            client_change_kinds: nd.kinds,
            first_changed_message_index: nd.firstChangedMessageIndex,
            client_baseline: nd.baseline,
            call_number: nd.callNumber,
          }),
          La === void 0
            ? void 0
            : La.scope === "partial"
              ? `retry:prefix-lock-strip-${I1}`
              : `retry:prefix-lock-strip-all-${I1}`
        );
      } catch (error) {
        logError(error);
      }
      return;
    },
    w5n = (Wn) => {
      let pr = dht(Wn);
      if (keptForeignSignatures && isInvalidThinkingSignatureError(Wn))
        dropForeignThinkingKeep(pr !== void 0 ? "rejected_healed" : "rejected_surfaced");
      return pr;
    };
  function* uht() {}
  function* cht() {
    if (aht !== void 0) {
      let Wn;
      try {
      } catch (error) {
        logError(error);
      }
      if (((aht = void 0), Wn)) yield Wn;
    }
  }
  let M3 = !1;
  function fht() {
    let Wn = Gte(() => builtForRelay && !M3 && (Wte?.relayStoppedInLastDispatch() ?? !1), !1);
    if (Wn) {
      let pr = Gte(() => thinkingStripAllPlan(messages).size > 0, void 0);
      if (pr === !0) ((tp = !0), (PC = "all"), (Rf = !0));
      else if (pr === !1) ap = !0;
    }
    if (ap && !tp && !M3)
      return (
        (M3 = !0),
        Gte(() => Wte?.markRelayThinkingStripRecorded("no_thinking"), void 0),
        createAttachmentMessage_2({ type: "thinking_stripped", scope: "all" })
      );
    if (!tp || M3) return;
    if (((M3 = !0), Rf))
      Gte(() => Wte?.markRelayThinkingStripRecorded(Wn ? "marker_same_request" : "marker"), void 0);
    return createAttachmentMessage_2(
      PC === "all"
        ? { type: "thinking_stripped", scope: "all" }
        : {
            type: "thinking_stripped",
            scope: "partial",
            from: { messageId: PC.messageId, thinkingIndex: PC.thinkingIndex },
          },
    );
  }
  async function* BMs() {}
  function pht({ messageIndex: messageIndex, blockIndex: blockIndex }) {
    let Jr = HS[messageIndex];
    return Jr?.role === "assistant" && Array.isArray(Jr.content)
      ? getThinkingBlockKey(Jr.content[blockIndex])
      : void 0;
  }
  function mht(Wn) {
    try {
      if (!isTetherLive() || _1 || Cae || Kf || Ac !== void 0) return;
      checkTetherPrefixMismatch({
        body: Wn,
        blockKeyAt: pht,
        replyHolding: (pr, Jr) => {
          let Os = Eh(pr),
            La = Os === void 0 ? void 0 : messagesForAPI_2[Os];
          return Os !== void 0 &&
            La?.type === "assistant" &&
            Array.isArray(La.message.content) &&
            La.message.content.some((Vl) => getThinkingBlockKey(Vl) === Jr)
            ? { messageId: La.message.id, messageIndex: Os }
            : void 0;
        },
        carrier: {
          key: threadSourceKind(options.querySource) !== null ? formatZodErrors(options.agentId) : void 0,
          querySource: options.querySource,
        },
        sentThreadPrefix: createSentPrefixChecker({
          model: options.model,
          system: systemBlocks,
          toolSchemas: bae,
          thinkingConfig: betas,
          getMessageHashes: A5,
        }),
      });
    } catch (error) {
      logError(toError(error));
    }
  }
  let ght = (Wn) => {
      if (_1) return;
      let pr = reportThinkingDrop({
        body: Wn,
        blockKeyAt: pht,
        carriedBlockHashes: () => collectDroppedThinkingHashes(messages),
        countThinkingSent: () => summarizeThinkingStrip(messagesForAPI_2, messagesForAPI_2),
        querySource: options.querySource,
        agentId: options.agentId,
        model: options.model,
        requestId: Al,
        solicited: r3,
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
    },
    T5n = (Wn) => {
      let pr =
          options.serverRefusalFallback !== void 0
            ? (Wn.content ?? []).reduce((Wd, ku, Np) => (hve(ku) ? Np : Wd), -1)
            : -1,
        Jr = Wn.stop_reason === "refusal",
        Os,
        La = 0,
        Vl = !1,
        Yl = [];
      for (let [Wd, ku] of (Wn.content ?? []).entries()) {
        if (!hve(ku)) {
          if ((Wd < pr && ku.type !== "text") || (Jr && pr >= 0)) {
            (La++, (Vl ||= ku.type === "tool_use"));
            continue;
          }
          Yl.push(ku);
          continue;
        }
        let Np = parseFallbackMessage(ku);
        if (Np === void 0) {
          (logForDiagnosticsNoPII("warn", "cli_malformed_fallback_block"),
            logEvent("tengu_rotunda_pennant_malformed", { block_index: Wd, non_streaming: !0 }),
            logFeatureSad("refusal_fallback", "malformed_fallback_block", { non_streaming: !0 }));
          continue;
        }
        (Yl.push(_7e(Np)), (Os = Np));
        let hf = w$;
        if (
          (logEvent("tengu_rotunda_pennant_materialized", {
            armed: options.serverRefusalFallback !== void 0,
            mode: fromEnum(hf),
            block_index: Wd,
            non_streaming: !0,
          }),
          Np.reason === "refusal")
        )
          logApiRefusal({
            model: resolvedModel,
            requestId: Al || void 0,
            querySource: options.querySource,
            effort: CC,
            fastMode: NI,
            attempt: p_,
            attribution: buildAttribution(
              options.querySource,
              options.spawnedBySkill,
              options.activeSkill,
              options.activeMcpServer,
              options.activeMcpTool,
            ),
            serverFallbackHop: !0,
            agentContext: options.agentContext,
          });
      }
      if (Yl.length === 0 && (Wn.content ?? []).length > 0)
        Yl.push({ type: "text", text: NO_CONTENT_MESSAGE, citations: [] });
      let nd = options.serverRefusalFallback !== void 0 ? parseUsageIterations(Wn.usage) : void 0;
      if (
        (($E =
          nd?.servedFallbackModel !== void 0 || (options.serverRefusalFallback !== void 0 && Os !== void 0)),
        (UT = !1),
        (b1 = !1),
        (Hae = nd),
        La > 0)
      )
        logEvent("tengu_rotunda_pennant_sync_dropped", {
          dropped_count: La,
          had_tool_use: Vl,
          chain_exhausted: Jr,
        });
      return { content: Yl, lastHop: Os, iterations: nd };
    };
  function* v5n(Wn, pr, Jr) {
    if (Jr !== void 0 && !b1) {
      b1 = !0;
      let hf = mRe(EMPTY_USAGE, pr.usage);
      logEvent("tengu_fallback_credit_minted", {
        request_id: ye(Al),
        model: telemetrySafeModelName(options.model),
        fallback_target_model: telemetrySafeModelName(
          options.refusalFallbackModel ??
            (options.serverRefusalFallback !== void 0 && !$E ? options.serverRefusalFallback.model : void 0),
        ),
        token_length: Jr.length,
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
          query_chain_id: ye(options.queryTracking.chainId),
          query_depth: options.queryTracking.depth,
        }),
      });
    }
    let Os =
      options.serverRefusalFallback !== void 0
        ? (Wn.lastHop?.model ?? Wn.iterations?.servedFallbackModel)
        : void 0;
    if (!UT && Os !== void 0)
      ((UT = !0),
        yield {
          type: "server_fallback",
          fromModel: Wn.lastHop?.fromModel ?? options.model,
          toModel: Os,
          reason: Wn.lastHop !== void 0 ? "refusal" : "sticky",
          apiRefusalCategory: Wn.lastHop?.category ?? null,
          midStream: !1,
          requestId: Al ?? null,
          refusedEffort: qx(),
          discardedMessages: [],
          retainedMessages: [],
          retainedText: "",
          finalStopReason: pr.stop_reason,
        });
    let La = options.refusalFallbackModelLane === "silent",
      Vl = !La
        ? (options.refusalFallbackModel ??
          (options.serverRefusalFallback !== void 0 && !$E ? options.serverRefusalFallback.model : void 0))
        : void 0,
      refusalFallbackCascadeHop = options.refusalFallbackCascadeHop,
      nd =
        pr.stop_reason === "refusal" && Vl !== void 0 && refusalFallbackCascadeHop === void 0
          ? resolveRefusalFallbackRoute({
              originalModelCanonical: getCanonicalName(options.model),
              armedFallbackModel: Vl,
              apiRefusalCategory: pr.stop_details?.category ?? null,
              armedTargetIsRefusingModel: isSameModel(options.model, Vl),
              resolveTarget: (hf) =>
                pickFallbackModel({
                  mappedTarget: hf,
                  armedFallbackModel: Vl,
                  refusingModel: options.model,
                  triedModels: [canonicalModelKey(options.model)],
                }),
              routesOverride: Y8r(),
            })
          : void 0,
      Wd = nd !== void 0 ? nd.model : Vl;
    if (nd !== void 0)
      logFallbackRouteOutcome({
        route: nd,
        model: options.model,
        armedFallbackModel: Vl,
        apiRefusalCategory: pr.stop_details?.category,
        requestId: Al,
      });
    if (pr.stop_reason === "refusal" && Wd !== void 0)
      return (
        DLe(),
        (k3 = !0),
        yield {
          type: "fallback_request",
          trigger: "refusal",
          originalModel: options.model,
          fallbackModel: Wd,
          requestId: Al ?? null,
          refusedEffort: qx(),
          apiRefusalCategory: pr.stop_details?.category ?? null,
          apiRefusalExplanation: pr.stop_details?.explanation ?? null,
          creditCode: Jr ?? null,
          mintedStateless: !c1,
          ...describeFallbackRoute(nd, refusalFallbackCascadeHop),
        },
        !0
      );
    let ku = getRefusalMessage(pr.stop_reason, pr.stop_details, Al, Os ?? options.model, pr.id);
    if (ku) {
      let hf = hasRefusalFallbackOccurred() || getRefusalFallbackModelLatch() !== void 0;
      if (
        Vl !== void 0 ||
        options.refusalFallbackModel !== void 0 ||
        (hasRefusalFallbackTarget(options.model) && isRefusalFallbackEnabled()) ||
        CEn() ||
        hf
      )
        logFeatureBad(
          "refusal_fallback",
          nd?.matched === "none"
            ? "route_declined"
            : La
              ? "sync_silent_stood"
              : Os !== void 0
                ? "server_chain_exhausted"
                : hf
                  ? "client_chain_exhausted"
                  : hasRefusalFallbackTarget(options.model) && Z8r()
                    ? "disabled_by_config"
                    : "not_armed",
          {
            convolute_arcades: AEn(),
            arm_source: fromEnum(getFallbackLatchKind()),
            armed: Vl !== void 0,
            model_scope: fromEnum(classifyFallbackOrigin(options.model)),
          },
        );
      (yield {
        type: "refusal_no_fallback",
        originalModel: options.model,
        requestId: Al ?? null,
        apiRefusalCategory: pr.stop_details?.category ?? null,
        apiRefusalExplanation: pr.stop_details?.explanation ?? null,
      },
        yield ku);
    }
    let Np = E5n(pr);
    if (Np !== void 0) yield Np;
    return !1;
  }
  function E5n(Wn) {
    try {
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_vast_sunset", !0)) return;
      return getMaxTokensStopMessage(
        Wn.stop_reason,
        Math.min(BT, MMn),
        Wn.usage?.output_tokens ?? 0,
        BT >= MMn,
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
  function yht(Wn, pr) {
    if (Wn.size > 0) hht.push({ type: "hint_clears", ids: [...Wn], contentById: Object.fromEntries(pr) });
  }
  function* $Le() {
    yield* hht.splice(0);
  }
  async function* _ht(Wn, pr) {
    let {
      message: message,
      requestId: requestId,
      headers: headers,
      creditCode: creditCode,
    } = yield* executeNonStreamingRequest(
      {
        model: options.model,
        fetchOverride: options.fetchOverride,
        source: options.querySource,
        requestClass: options.requestClass,
        agentContext: options.agentContext,
        promptId: Me,
        ccsSender: We,
        permissionContext: Sae,
        toolNames: mLe,
        credentials: options.credentials,
        storageV5: options.storageV5,
        clock: clock,
        queryTracking: options.queryTracking,
        llmSpan: H5,
        contextCompactedKindForWire: BLe,
        compactionRequestKindForWire: compactionRequestKind,
        prevToolDurationsForWire: bht,
      },
      {
        model: options.model,
        fallbackModel: options.fallbackModel,
        accessFallbackModel: q,
        toolFreeHelper: options.toolFreeHelper,
        ...(isFastModeEnabled() && { fastMode: fE }),
        modelIsRefusalFallbackTarget: options.modelIsRefusalFallbackTarget,
        signal: signal,
        initialConsecutive529Errors: retryBudget.counts().overloaded,
        querySource: options.querySource,
        maxRetries: retryBudget.retriesLeft(),
        modelCallRetries: retryBudget,
        clock: clock,
        random: options.random,
        isResumePrefillRequest: fo,
        failedStreamOutlastedTimeout: pr,
        onRetryStatus: options.onRetryStatus,
        subscribeRetryWake: options.subscribeRetryWake,
        onQuotaWindowWait: Zh,
        isUsageLimitLifted: vp,
        lowPriorityWait: _S,
        stampDispatchHeader: Pgt,
        onApiError: async (Pc) => {
          let ey = l1(Pc);
          if (ey !== void 0) return ey;
          let Ew = await Mgt(Pc);
          if (Ew !== void 0) return Ew;
          let Aw = l$(Pc);
          if (Aw !== void 0) return Aw;
          let VT = M5(Pc);
          if (VT !== void 0) return VT;
          let Am = eht(Pc);
          if (Am !== null) return Am;
          let cP = Ugt(Pc, "sync");
          if (cP !== void 0) return cP;
          let fP = ILe(Pc);
          if (fP !== void 0) return fP;
          let $I = getFoundryRetryDirective(Pc, options.model, options.querySource);
          if ($I === FAIL_FOUNDRY_PURPOSE_REQUEST) return;
          if ($I !== null) return $I;
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
          if (fh !== void 0) return fh;
          D5(Pc);
          let Ow = rht(Pc);
          if (Ow !== null) return Ow;
          let _b = NLe(Pc);
          if (_b !== null) return _b;
          let jE = w5n(Pc);
          if (jE !== void 0) return jE;
          return (
            $gt(Pc) ??
            Ngt(Pc) ??
            Hgt(Pc) ??
            i1(Pc, !1) ??
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
        ((p_ = Pc), (BT = Ew), (S3 = ey));
      },
      (Pc) => Af(Pc, !1),
      Wn,
    );
    ((Al = requestId), C5(requestId, headers, !0), mht(message), Nh?.settle({ kind: "ok" }, Al, message.id));
    try {
      (Ggt(message.usage), zgt(message.usage));
    } catch {}
    (qgt(),
      Kgt(),
      Vgt(),
      Ygt(),
      Xgt(),
      N5(),
      t1(),
      Rae(),
      sht(),
      e1(),
      Wgt(),
      logEvent("tengu_nonstreaming_fallback_success", {
        model: telemetrySafeModelName(options.model),
        request_id: vh(requestId),
        originating_request_id: vh(fc),
        fallback_cause: fromEnum(Wn.cause),
        attempt: p_,
      }),
      yield* cht(),
      yield* uht(),
      yield* Qgt(),
      (b3 = message.diagnostics?.cache_miss_reason ?? void 0));
    let Yl = T5n(message),
      nd = aI ? captureWireToolInputs(Yl.content) : void 0;
    if (nd?.degraded) FHe();
    let Wd = nd?.inputs,
      ku = countToolCallsSince_4(Yl.content, Wd),
      { content: content, batchToolUses: batchToolUses } = isBatchToolsUse(
        normalizeContentFromAPI(
          Yl.content,
          tools,
          options.agentId,
          { requestId: Al ?? void 0, messageId: message.id },
          options.storageV5,
        ),
        tools,
        (Pc, ey) => normalizeToolInput_2(Pc, ey, options.agentId, options.storageV5),
      );
    if (Qh !== void 0) MI(Qh, message, message.content);
    ALe = headers;
    let Kg = ght(message),
      cy = fht();
    if (cy) yield cy;
    let jT = np();
    if (jT) yield jT;
    if (Kg) yield Kg;
    let pk = {
      message: {
        ...message,
        content: content,
        usage: mRe(EMPTY_USAGE, message.usage),
        ...(m$ &&
          message.context_management && {
            context_management: addClientEstimatedClearedTokens(message.context_management, EI?.edit, HS),
          }),
      },
      ...(batchToolUses.length > 0 && { batchToolUses: batchToolUses }),
      ...(Wd !== void 0 && { wireToolInputs: Wd }),
      ...(ku !== void 0 && { wireIngestContext: ku }),
      ...(Qh !== void 0 && JGe(Qh)),
      apiBlockIndex: 0,
      requestId: Al ?? void 0,
      requestRef: Rh,
      requestedModel: options.model,
      ...buildAttribution(
        options.querySource,
        options.spawnedBySkill,
        options.activeSkill,
        options.activeMcpServer,
        options.activeMcpTool,
      ),
      type: "assistant",
      uuid: randomUUID_16(),
      timestamp: new Date().toISOString(),
      ...!1,
      ...(yn && { advisorModel: yn }),
      ...(yS !== void 0 && { effort: yS }),
      perTurnEffort: EE,
      perTurnTiming: n$,
      ...{},
    };
    return (
      R4e(conversation, pk),
      Cm.push(pk),
      (LI = pk),
      (Ux = !1),
      yield pk,
      yield* v5n(Yl, message, creditCode)
    );
  }
  let D3 = !1,
    MC = new Map(),
    Bae = new Set(),
    HLe = new Set(),
    E$,
    Sht =
      getBackgroundAgentId(options.agentContext) ?? (options.isBackgroundAgent ? options.agentId : void 0),
    BLe =
      classifyQuerySource(options.querySource) === "main" && hfe(options.querySource, options.agentId)
        ? consumePendingContextCompacted()
        : void 0,
    compactionRequestKind = options.compactionRequestKind,
    bht =
      options.prevToolDurations !== void 0 ? formatToolDurationsHeader(options.prevToolDurations) : void 0;
  try {
    startSessionActivity("api_call", Sht);
    e: for (;;) {
      let D1 = function () {
          if (streamIdleTimer !== null) (streamIdleTimer(), (streamIdleTimer = null));
          if (BI) ((BI = !1), options.onRetryStatus?.(null));
          if (streamWatchdogFiredAt !== null) (streamWatchdogFiredAt(), (streamWatchdogFiredAt = null));
          if (streamIdleWarningTimer !== null) (streamIdleWarningTimer(), (streamIdleWarningTimer = null));
        },
        L1 = function () {
          if (!options.onRetryStatus || !Jr) return;
          let lastAt = Jr.lastAt,
            monotonicNow = clock.monotonicNow();
          streamIdleTimer = clock.setTimeout(
            () => {
              if (clock.monotonicNow() - monotonicNow < UE / 2) return;
              if (Jr.lastAt > lastAt) {
                L1();
                return;
              }
              let Zg = clock.monotonicNow() - Jr.lastAt;
              if (E1 && Zg < min_2) {
                L1();
                return;
              }
              let Iy = Jr.lastAt === 0 ? clock.monotonicNow() - monotonicNow_3 : Zg;
              ((BI = !0),
                options.onRetryStatus?.({ kind: "stalled", deadline: clock.now() + Math.max(0, min - Iy) }));
            },
            UE,
            { unref: !0 },
          );
        },
        L_ = function () {
          if ((D1(), L1(), !pP)) return;
          let monotonicNow = clock.monotonicNow(),
            now = clock.now(),
            Zg = OC;
          ((streamWatchdogFiredAt = clock.setTimeout(() => {
            if (clock.monotonicNow() - monotonicNow < Zg) return;
            (logForDebugging(`Streaming idle warning: no chunks received for ${Zg / 1000}s`, {
              level: "warn",
            }),
              logForDiagnosticsNoPII("warn", "cli_streaming_idle_warning"));
          }, OC)),
            (streamIdleWarningTimer = clock.setTimeout(() => {
              if (
                ((Ow = checkSuspendedStreamIdle(clock, {
                  armedAt: monotonicNow,
                  wallArmedAt: now,
                  idleMs: BE,
                })),
                Ow !== void 0)
              ) {
                releaseStreamResources();
                return;
              }
              ((fh = !0),
                (_b = clock.monotonicNow()),
                logForDebugging(
                  `Streaming idle timeout: no chunks received for ${BE / 1000}s, aborting stream`,
                  { level: "error" },
                ),
                logForDiagnosticsNoPII("error", "cli_streaming_idle_timeout"),
                logEvent("tengu_streaming_idle_timeout", {
                  model: telemetrySafeModelName(options.model),
                  request_id: vh(Al),
                  timeout_ms: BE,
                  tier: lit_2("event"),
                }),
                releaseStreamResources());
            }, BE)));
        };
      if (((nk = void 0), queryCheckpoint("query_client_creation_start"), isTopLevelMain))
        (WS("request_build"), jS("client_creation"));
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
              ccsSender: We,
              permissionContext: Sae,
              toolNames: mLe,
              credentials: options.credentials,
              storageV5: options.storageV5,
              signal: signal,
              clock: clock,
              noResponseRetryLedger: xLe,
            }),
          async (anthropic, attempt, context) => {
            if (DI === void 0) C_("attempt_errored", Al ?? null, null);
            if (
              ((p_ = attempt),
              (NI = context.fastMode ?? !1),
              (monotonicNow_2 = clock.monotonicNow()),
              (nk = void 0),
              B5.push(monotonicNow_2),
              queryCheckpoint("query_client_creation_end"),
              isTopLevelMain)
            )
              (WS("client_creation"), jS("request_build"));
            let params = buildRequestParamsGuarded(context);
            try {
              wgt(params);
            } catch (error) {
              logError(toError(error));
            }
            if (
              (logApiRequestDetail(params),
              Af(params, !0),
              (BT = params.max_tokens),
              queryCheckpoint("query_api_request_sent"),
              logForDebugging(
                `[API:timing] dispatching to ${getProviderForModel(options.model)} model=${options.model}`,
              ),
              (S3 = clock.now()),
              CLe === void 0 && options.queryTracking?.roundStartedAtMs !== void 0)
            )
              ((options.queryTracking.firstDispatchedAtMs ??= performance.now()),
                (CLe = Math.round(
                  options.queryTracking.firstDispatchedAtMs - options.queryTracking.roundStartedAtMs,
                )));
            if (!options.agentId) {
              if (Hi) headlessProfilerCheckpoint("api_request_sent");
              if (isTopLevelMain) WS("request_build");
              if (attempt === 1 && !_3) {
                if (((_3 = clock.monotonicNow()), (ELe = clock.now()), Hi)) cyi();
                if (isTopLevelMain) RLe = ydn(_3);
              }
              if (Hi)
                try {
                  n9t();
                } catch (error) {
                  logError(toError(error));
                }
            }
            OE();
            let Of = parseIntLoose(process.env.CLAUDE_SLOW_FIRST_BYTE_MS) || 30000;
            $T = clock.setTimeout(() => {
              $T = null;
              let Ql = clock.monotonicNow() - monotonicNow_2;
              (logForDebugging(
                `Slow first byte: no stream chunk ${(Ql / 1000).toFixed(1)}s after request sent (attempt ${attempt})`,
                { level: "warn" },
              ),
                logEvent("tengu_api_slow_first_byte", {
                  model: telemetrySafeModelName(options.model),
                  provider: getAPIProviderForAnalytics(),
                  attempt: attempt,
                  elapsed_ms: Math.round(Ql),
                }));
            }, Of);
            let B_ = buildRequestTraceHeaders(H5, B5.length);
            Ah = B_.clientRequestId;
            let headers = B_.headers;
            if (((Jh = isFirstPartyApiBackend() && _st()), Jh)) headers[ANTHROPIC_USAGE_LIMIT] = SLOW;
            if (shouldSendExtendedUsageLimitHeader(options, Jh, Je))
              headers[ANTHROPIC_USAGE_LIMIT] = "extended";
            if (
              (Pgt(headers, Jh),
              options.fallbackStampFromModel !== void 0 &&
                getAPIProvider() === "firstParty" &&
                isFirstPartyAnthropicBaseUrl())
            )
              for (let [Ql, Nu] of [
                [X_CC_FALLBACK_FROM_MODEL, options.fallbackStampFromModel],
                [X_CC_FALLBACK_CATEGORY, options.fallbackStampCategory],
                [X_CC_FALLBACK_TRIGGER, options.fallbackStampTrigger],
                [X_CC_ORIGINAL_REQUEST_ID, options.fallbackStampOriginalRequestId],
              ]) {
                let Qc = sanitizeHeaderValue_2(Nu);
                if (Qc !== void 0) headers[Ql] = Qc;
              }
            (setCompactionHeaders(headers, BLe, compactionRequestKind),
              setPrevToolDurationsHeader(headers, bht));
            let vc = DI;
            if (((sP = vc !== void 0), vc !== void 0)) ((DI = void 0), (y3 = !0));
            if (((Yc = getLimitsAccountEpoch()), Ah !== void 0))
              (armFirstByteWatchdog(Ah, { escalated: xLe.count > 0 }), Vci(Ah, performance.now()));
            if (classifyQuerySource(options.querySource) === "main") setTimeout(wdn, 0);
            setTimeout(flushMessageOutlines, 0, options.querySource, options.agentId);
            let streamRequestBody = {
                ...deferredToolNameOf(params),
                ...(vc !== void 0 && { fallback_credit_token: vc }),
                stream: !0,
              },
              eh = oGr(options.fetchOverride)
                ? checkIncrementalRequestBody(
                    streamRequestBody,
                    classifyQuerySource(options.querySource) === "main" && options.agentId === void 0,
                  )
                : void 0,
              responseWithMeta = await reportIncrementalBodyMismatch(eh, streamRequestBody, () =>
                anthropic.beta.messages
                  .create(streamRequestBody, {
                    signal: signal,
                    ...(eh === void 0
                      ? Object.keys(headers).length > 0 && { headers: headers }
                      : { body: eh, headers: { ...headers, "content-type": "application/json" } }),
                  })
                  .withResponse(),
              ).catch((Ql) => {
                throw (OE(), Ql);
              });
            if (
              (queryCheckpoint("query_response_headers_received"),
              (Al = rqe(responseWithMeta.request_id, responseWithMeta.response?.headers)),
              (k_ = responseWithMeta.response),
              (bS = clock.now()),
              C5(Al, responseWithMeta.response?.headers, !1),
              (nk = responseWithMeta.response && {
                status: responseWithMeta.response.status,
                headers: responseWithMeta.response.headers,
                latencyMs: Math.round(clock.monotonicNow() - monotonicNow_2),
              }),
              logApiRouteObserved(nk, eh !== void 0),
              vc !== void 0)
            )
              logEvent("tengu_rotunda_pennant_credit_echoed", {
                mint_request_id: ye(options.fallbackCreditMintRequestId),
                mint_model: telemetrySafeModelName(options.fallbackCreditMintModel),
                request_id: ye(Al),
                client_request_id: ye(Ah),
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
            accessFallbackModel: q,
            toolFreeHelper: options.toolFreeHelper,
            ...(isFastModeEnabled() ? { fastMode: fE } : !1),
            modelIsRefusalFallbackTarget: options.modelIsRefusalFallbackTarget,
            signal: signal,
            initialConsecutive529Errors: retryBudget.counts().overloaded,
            maxRetries: retryBudget.retriesLeft(),
            noResponseRetryLedger: xLe,
            modelCallRetries: retryBudget,
            clock: clock,
            random: options.random,
            isResumePrefillRequest: fo,
            querySource: options.querySource,
            onRetryStatus: options.onRetryStatus,
            subscribeRetryWake: options.subscribeRetryWake,
            onQuotaWindowWait: Zh,
            isUsageLimitLifted: vp,
            lowPriorityWait: _S,
            onError: async (Fd) => {
              vgt();
              let od = l1(Fd);
              if (od !== void 0) return od;
              let Zg = l$(Fd);
              if (Zg !== void 0) return Zg;
              let Iy = M5(Fd);
              if (Iy !== void 0) return Iy;
              let Of = eht(Fd);
              if (Of !== null) return Of;
              if (_E && isAfkModeBetaRejected(Fd)) {
                if (((_E = !1), tj)) Xg(conversation, tj);
                return (
                  setAutoModeActive(!1),
                  setAutoModeCircuitBroken(!0),
                  logForDebugging(
                    "[auto-mode] server rejected afk-mode beta \u2014 dropping header and circuit-breaking auto for this session",
                    { level: "warn" },
                  ),
                  "retry:afk-beta"
                );
              }
              let B_ = await Mgt(Fd);
              if (B_ !== void 0) return B_;
              if (isAdvisorResultUnprocessable(Fd)) {
                let Xl = messagesForAPI_2,
                  ql = stripAdvisorBlocks(Xl),
                  index = Xl.findIndex((ty, fp) => ql[fp] !== ty),
                  reduced = Xl.reduce((ty, fp, th) => (ql[th] !== fp ? ty + 1 : ty), 0),
                  Nf = v7t() && index !== -1,
                  G_;
                if (Nf && !options.resumeIncompleteThinking && Mae !== "enabled")
                  try {
                    let index_2 = Xl.findIndex((th, Fg) => Fg >= index && hasAdvisorBlocks(th)),
                      fp = index_2 === -1 ? void 0 : Xl[index_2];
                    if (fp?.type === "assistant") {
                      let th = stripThinkingFromPoint(ql, { messageIndex: index_2, thinkingIndex: 0 });
                      if (th !== ql) {
                        ql = th;
                        let id = fp.message.id;
                        if (typeof id === "string") {
                          let DC = 0;
                          for (let Hf = 0; Hf < index_2; Hf++) {
                            let pp = Xl[Hf];
                            if (
                              pp.type === "assistant" &&
                              pp.message.id === id &&
                              Array.isArray(pp.message.content)
                            )
                              DC += count(
                                pp.message.content,
                                (Om) => Om.type === "thinking" || Om.type === "redacted_thinking",
                              );
                          }
                          G_ = { messageIndex: index_2, indexInMessage: 0, thinkingIndex: DC, messageId: id };
                        } else ((ql = stripAllThinking(ql)), (G_ = "all"));
                      }
                    }
                  } catch (error) {
                    (logError(toError(error)), (ql = stripAdvisorBlocks(Xl)), (G_ = void 0));
                  }
                if (((messagesForAPI_2 = ch(ql, "error_recovery")), y5n(), Nf)) {
                  if (((Yh = !0), G_ !== void 0)) FLe(G_);
                }
                return (
                  logForDebugging(
                    reduced === 0
                      ? "[advisor] the server could not process an advisor result sent earlier in this conversation; nothing to remove, retrying as sent."
                      : `[advisor] the server could not process an advisor result sent earlier in this conversation; retrying with the advisor blocks removed from ${reduced} message(s)${G_ === "all" ? " and all thinking removed" : G_ !== void 0 ? " and the thinking after them removed" : ""}${Nf ? "; recorded, so later requests leave them out too." : "; not recorded, so the next request sends them again."}`,
                    { level: "warn" },
                  ),
                  logEvent("tengu_advisor_strip_retry", {
                    query_source: agentTypeForTelemetry(options.querySource),
                    strip_recorded: Nf,
                    stripped_message_count: reduced,
                    thinking_also_stripped: G_ !== void 0,
                  }),
                  "retry:advisor-strip"
                );
              }
              let ea = Ugt(Fd, "stream");
              if (ea !== void 0) return ea;
              let streamWatchdogEnabled = ILe(Fd);
              if (streamWatchdogEnabled !== void 0) return streamWatchdogEnabled;
              let vc = getFoundryRetryDirective(Fd, options.model, options.querySource);
              if (vc === FAIL_FOUNDRY_PURPOSE_REQUEST) return;
              if (vc !== null) return vc;
              let Mg = Zgt(Fd);
              if (Mg !== null) return Mg;
              {
                let Xl = getMediaErrorFromApiError(Fd);
                if (Xl) {
                  let ql = Fd instanceof Error ? Fd.message : String(Fd),
                    Ep = isBase64ImageBlock(messagesForAPI_2, ql);
                  if (Ep !== messagesForAPI_2)
                    return (
                      (messagesForAPI_2 = ch(Ep, "error_recovery")),
                      w3.set(Xl.kind, ql),
                      notifyMediaStripped(options, Xl.kind, ql),
                      logEvent("tengu_media_block_strip_retry", { kind: fromEnum(Xl.kind), targeted: 1 }),
                      "retry:media-strip-over-dimension-limit"
                    );
                  let cg = Xl.messageIdx !== void 0 ? Eh(Xl.messageIdx) : void 0;
                  if (Xl.messageIdx !== void 0 && cg !== void 0 && Xl.contentIdx !== void 0) {
                    let G_ = `${Xl.messageIdx}.${Xl.contentIdx}`,
                      ty = Agt.get(G_) ?? 0,
                      fp = Xl.nestedContentIdx !== void 0 && ty < h5n ? Xl.nestedContentIdx : void 0,
                      th = replaceUnsupportedMediaAt(
                        messagesForAPI_2,
                        { messageIdx: cg, contentIdx: Xl.contentIdx, nestedContentIdx: fp, kind: Xl.kind },
                        ql,
                      );
                    if (th !== messagesForAPI_2) {
                      if (
                        ((messagesForAPI_2 = ch(th, "error_recovery")),
                        w3.set(Xl.kind, ql),
                        notifyMediaStripped(options, Xl.kind, ql),
                        fp !== void 0)
                      )
                        Agt.set(G_, ty + 1);
                      let Fg = `messages.${Xl.messageIdx}.content.${Xl.contentIdx}`,
                        DC =
                          fp !== void 0
                            ? `${Fg}.tool_result.content.${fp}`
                            : Xl.nestedContentIdx !== void 0
                              ? `${Fg}.tool_result.content.*`
                              : Fg;
                      return (
                        logForDebugging(`Removed unprocessable ${Xl.kind} at ${DC}; retrying.`, {
                          level: "warn",
                        }),
                        logEvent("tengu_media_block_strip_retry", {
                          kind: fromEnum(Xl.kind),
                          message_idx: Xl.messageIdx,
                          content_idx: Xl.contentIdx,
                          targeted: 1,
                        }),
                        `retry:media-strip:${Xl.kind}:${DC}`
                      );
                    }
                  }
                  let Nf =
                    Cgt.value < Rgt ? replaceLastUnsupportedMedia(messagesForAPI_2, Xl.kind, ql) : void 0;
                  if (Nf)
                    return (
                      Cgt.value++,
                      (messagesForAPI_2 = ch(Nf.messages, "error_recovery")),
                      w3.set(Xl.kind, ql),
                      notifyMediaStripped(options, Xl.kind, ql),
                      logForDebugging(
                        `Removed base64 ${Xl.kind} blocks from carrier ${Nf.carrierIdx} (API 400 had no usable path); retrying.`,
                        { level: "warn" },
                      ),
                      logEvent("tengu_media_block_strip_retry", {
                        kind: fromEnum(Xl.kind),
                        targeted: 0,
                        carrier_idx: Nf.carrierIdx,
                      }),
                      `retry:media-strip-latest:${Xl.kind}:${Nf.carrierIdx}`
                    );
                }
              }
              if (hI && isCacheKeepaliveBetaRejected(Fd))
                return (
                  (hI = !1),
                  onKeepaliveHeaderRejected(conversation, Yc, Hi),
                  "retry:cache-keepalive-beta"
                );
              let eh = iht(Fd);
              if (eh === "surface:resume-prefill") return;
              if (eh !== null) return eh;
              {
                let Xl = getRejectedThinkingType(Fd);
                if (Xl) {
                  let ql = Xl === "enabled" ? "adaptive" : "enabled";
                  return (
                    setThinkingTypeOverride(options.model, ql),
                    logForDebugging(
                      `[thinking] model rejected thinking.type=${Xl}; retrying with ${ql}. For Bedrock application-inference-profile ARNs with bearer-token auth, granting bedrock:GetInferenceProfile to the token avoids this round-trip.`,
                      { level: "warn" },
                    ),
                    "retry:thinking-type"
                  );
                }
              }
              let om = Jgt(Fd);
              if (om !== null) return om;
              let Ql = tht(Fd);
              if (Ql !== null) return Ql;
              let Nu = nht(Fd);
              if (Nu !== null) return Nu;
              let Qc = oht(Fd);
              if (Qc !== void 0) return Qc;
              D5(Fd);
              let W_ = rht(Fd);
              if (W_ !== null) return W_;
              let pm = NLe(Fd);
              if (pm !== null) return pm;
              {
                let Xl = dht(Fd);
                if (Xl !== void 0) {
                  if (keptForeignSignatures && isInvalidThinkingSignatureError(Fd))
                    dropForeignThinkingKeep("rejected_healed");
                  return Xl;
                }
              }
              if (!options.resumeIncompleteThinking && isInvalidThinkingSignatureError(Fd)) {
                let Xl = 0,
                  ql = 0;
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
                  if (((messagesForAPI_2 = ch(Ep, "error_recovery")), FLe("all"), keptForeignSignatures))
                    dropForeignThinkingKeep("rejected_fell_back");
                  return (
                    logForDebugging(
                      "[thinking] server rejected a thinking block; stripping all thinking blocks and retrying.",
                      { level: "warn" },
                    ),
                    logEvent("tengu_thinking_signature_strip_retry", {
                      query_source: agentTypeForTelemetry(options.querySource),
                      model: telemetrySafeModelName(options.model),
                      stripped_signed_count: Xl,
                      stripped_unsigned_count: ql,
                    }),
                    "retry:thinking-signature-strip"
                  );
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
                if (Xl !== void 0) return Xl;
              }
              {
                let Xl = await contextHintController?.onRequestError(Fd, messagesForAPI_2);
                if (Xl)
                  return (
                    (messagesForAPI_2 = ch(Xl.messages, "microcompact")),
                    yht(Xl.clearedIds, Xl.clearedContent),
                    "retry:context-hint"
                  );
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
        ),
        pr;
      do if (((pr = await generator.next()), yield* $Le(), !("controller" in pr.value))) yield pr.value;
      while (!pr.done);
      if (((U5 = pr.value), qgt(), Kgt(), Vgt(), Ygt(), Xgt(), N5(), t1(), Wgt(), T3))
        ((T3 = !1), options.onRetryStatus?.(null));
      for (let [Fd, od] of w3)
        yield createApiErrorMessage({
          ...buildMediaRemovedError(Fd, od),
          error: "invalid_request",
          errorDetails: od,
        });
      (w3.clear(), yield* cht(), yield* uht(), yield* Qgt());
      let Jr = k_ ? (k_._chunkTimes ?? void 0) : void 0;
      if (
        Jr === void 0 &&
        k_ !== void 0 &&
        getAPIProvider() === "bedrock" &&
        shouldUseBodyIdleWatchdog("bedrock")
      )
        logForDebugging(
          "wire-heartbeat: _chunkTimes absent on a Bedrock stream with the byte watchdog enabled \u2014 heartbeat side-channel unavailable for this stream (bedrock-sdk \u22650.32.0 eventstream\u2192SSE transcode drops it; also expected if the response was not vnd.amazon.eventstream, e.g. behind a header-rewriting proxy)",
        );
      let monotonicNow_3 = clock.monotonicNow();
      ((Cm.length = 0),
        (Iae = 0),
        (vLe = void 0),
        (v$ = 0),
        (dg = void 0),
        (A_.length = 0),
        ($E = !1),
        (UT = !1),
        (D3 = !1),
        MC.clear(),
        Bae.clear(),
        HLe.clear(),
        (E$ = void 0),
        (b1 = !1),
        (Iu = EMPTY_USAGE),
        (T1 = null),
        (lm = null),
        (FE = !1),
        (aP = "none"));
      let La = !1;
      ((Ux = !1), (E1 = !1));
      let Vl = !1,
        Yl = !1,
        nd = !1,
        Wd = null,
        weakSet = new WeakSet(),
        weakMap = new WeakMap(),
        hf = !1,
        Kg = !1,
        cy = null,
        jT = !1,
        pk = null,
        Pc = 0;
      function* ey({ responseUnfinished: responseUnfinished }) {
        if (!Kg) return;
        let od = jT ? null : cy;
        ((Kg = !1), (cy = null), (jT = !1));
        let Zg = pk !== null ? { apiMessageId: pk } : void 0;
        if (od !== null)
          yield { type: "stream_event", event: { type: "content_block_stop", index: od }, ...Zg };
        yield {
          type: "stream_event",
          event: { type: "message_stop" },
          ...Zg,
          ...(responseUnfinished && pk !== null && Number.isSafeInteger(Pc)
            ? { abandonedBlocks: { apiMessageId: pk, fromBlockIndex: Pc } }
            : void 0),
        };
      }
      let Ew = null,
        Aw = 0,
        VT = 0,
        Am = null,
        cP = null,
        fP = null,
        $I = 0,
        HI = !1,
        pP = env.CLAUDE_ENABLE_STREAM_WATCHDOG ?? !0,
        BE = getStreamIdleTimeoutMs(),
        OC = BE / 2,
        UE = getStreamStallMarginMs(),
        min = Math.min(getByteIdleTimeoutForProvider(getAPIProvider()), pP ? BE : 1 / 0),
        min_2 = Math.min(MAX_STREAM_STALL_MS, min - UE),
        fh = !1,
        Ow,
        _b = null,
        streamWatchdogFiredAt = null,
        streamIdleWarningTimer = null,
        streamIdleTimer = null,
        BI = !1;
      L_();
      let hP = () => {
          if (options.querySource !== "sdk" && options.keepPartialMessageOnAbort !== !0) return;
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
                { requestId: Al ?? void 0, messageId: dg.id },
                options.storageV5,
              ),
            },
            apiBlockIndex: Cm.length,
            requestId: Al ?? void 0,
            requestRef: Rh,
            requestedModel: options.model,
            ...buildAttribution(
              options.querySource,
              options.spawnedBySkill,
              options.activeSkill,
              options.activeMcpServer,
              options.activeMcpTool,
            ),
            type: "assistant",
            uuid: randomUUID_16(),
            timestamp: new Date().toISOString(),
            isAbortedMidStream: !0,
            ...void 0,
            ...(yS !== void 0 && { effort: yS }),
            perTurnEffort: EE,
            perTurnTiming: n$,
          };
        },
        N3 = () => {
          if (E$ === void 0 || UT) return;
          let Fd = E$;
          return (
            (E$ = void 0),
            (UT = !0),
            {
              type: "server_fallback",
              fromModel: Fd.fromModel,
              toModel: Fd.model,
              reason: Fd.reason,
              apiRefusalCategory: Fd.category,
              midStream: !1,
              requestId: Al ?? null,
              refusedEffort: qx(),
              discardedMessages: [],
              retainedMessages: [],
              retainedText: "",
              finalStopReason: null,
            }
          );
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
        let Fd = !0,
          STALL_THRESHOLD_MS = 30000,
          Zg = 0,
          Iy = fixGuardrailStrayText(U5, signal),
          Of = { count: 0 };
        for await (let ea of withStreamHeartbeat(
          Jr !== void 0 && isDeltaFoldEnabled() ? foldStreamDeltas(Iy, Jr, Of, signal) : Iy,
          Jr,
          STREAM_HEARTBEAT_MS,
          clock,
        )) {
          if (zbe(ea)) {
            if ((Zg++, Zg <= MAX_PING_EVENTS_RESETTING_IDLE)) L_();
            else if (!pP || fh || Ow !== void 0) continue;
            yield { type: "stream_event", event: ea };
            continue;
          }
          ((Zg = 0),
            L_(),
            (v$ += 1 + Of.count),
            (Of.count = 0),
            (Am ??= Math.round(clock.monotonicNow() - monotonicNow_2)),
            (cP ??= ea.type),
            (fP = ea.type));
          let now = clock.now();
          if (Ew !== null) {
            let Ql = now - Ew;
            if (Ql > STALL_THRESHOLD_MS)
              (Aw++,
                (VT += Ql),
                logForDebugging(
                  `Streaming stall detected: ${(Ql / 1000).toFixed(1)}s gap between events (stall #${Aw})`,
                  { level: "warn" },
                ),
                logEvent("tengu_streaming_stall", {
                  stall_duration_ms: Ql,
                  stall_count: Aw,
                  total_stall_time_ms: VT,
                  event_type: fromEnum(bke(ea.type)),
                  model: telemetrySafeModelName(options.model),
                  request_id: vh(Al),
                }));
          }
          if (((Ew = now), Fd)) {
            if (
              (OE(),
              logForDebugging("Stream started - received first chunk"),
              logForDebugging(
                `[API:timing] first byte after ${Math.round(clock.monotonicNow() - monotonicNow_2)}ms`,
              ),
              queryCheckpoint("query_first_chunk_received"),
              !options.agentId && Hi)
            )
              headlessProfilerCheckpoint("first_chunk");
            if (isTopLevelMain) yP = _dn();
            (endQueryProfile(), (Fd = !1));
          }
          let vc = parseFallbackBlockStart(ea),
            Mg = !vc && isUnreadableFallbackBlock(ea);
          if (vc || Mg) E1 = !1;
          if (vc) {
            (HLe.add(vc.index), (A_[vc.index] = _7e(vc)));
            let Ql = w$;
            if (
              (logEvent("tengu_rotunda_pennant_materialized", {
                armed: options.serverRefusalFallback !== void 0,
                mode: fromEnum(Ql),
                block_index: vc.index,
                non_streaming: !1,
              }),
              vc.reason === "refusal")
            )
              logApiRefusal({
                model: resolvedModel,
                requestId: Al || void 0,
                querySource: options.querySource,
                effort: CC,
                fastMode: NI,
                attempt: p_,
                attribution: buildAttribution(
                  options.querySource,
                  options.spawnedBySkill,
                  options.activeSkill,
                  options.activeMcpServer,
                  options.activeMcpTool,
                ),
                serverFallbackHop: !0,
                agentContext: options.agentContext,
              });
            if (options.serverRefusalFallback === void 0) continue;
            if (gve(vc.reason)) $E = !0;
            if (dg !== void 0) dg = { ...dg, model: vc.model };
            for (let Nu of MC.values()) Nu.message.model = vc.model;
            if (MC.size === 0) E$ = vc;
            else if (!gve(vc.reason))
              ((UT = !0),
                yield {
                  type: "server_fallback",
                  fromModel: vc.fromModel,
                  toModel: vc.model,
                  reason: vc.reason,
                  apiRefusalCategory: vc.category,
                  midStream: !0,
                  requestId: Al ?? null,
                  refusedEffort: qx(),
                  discardedMessages: [],
                  retainedMessages: [],
                  retainedText: "",
                  finalStopReason: null,
                });
            else {
              UT = !0;
              let Nu = [];
              for (let [pm, Xl] of MC) if (cln(Xl)) (Nu.push(Xl), MC.delete(pm), delete A_[pm]);
              if (Nu.length > 0) {
                let pm = new Set(Nu);
                for (let Xl = Cm.length - 1; Xl >= 0; Xl--) if (pm.has(Cm[Xl])) Cm.splice(Xl, 1);
                D3 = !0;
              }
              let mapped = [...MC.entries()].sort((pm, Xl) => pm[0] - Xl[0]).map(([, pm]) => pm),
                joined = mapped
                  .map((pm) => pm.message.content.map((Xl) => (Xl.type === "text" ? Xl.text : "")).join(""))
                  .join("");
              yield {
                type: "server_fallback",
                fromModel: vc.fromModel,
                toModel: vc.model,
                reason: vc.reason,
                apiRefusalCategory: vc.category,
                midStream: !0,
                requestId: Al ?? null,
                refusedEffort: qx(),
                discardedMessages: Nu,
                retainedMessages: mapped,
                retainedText: joined,
                finalStopReason: null,
              };
            }
            continue;
          }
          if (Mg) {
            let index = ea.index;
            (Bae.add(index),
              (D3 = !0),
              logForDiagnosticsNoPII("warn", "cli_malformed_fallback_block"),
              logEvent("tengu_rotunda_pennant_malformed", { block_index: index, non_streaming: !1 }),
              logFeatureSad("refusal_fallback", "malformed_fallback_block", { non_streaming: !1 }));
            continue;
          }
          if (ea.type === "content_block_stop" && Bae.has(ea.index)) continue;
          switch (ea.type) {
            case "message_start": {
              if (
                (assertStreamPart(
                  typeof ea.message === "object" && ea.message !== null,
                  ea,
                  lit_2("message_start_without_message"),
                ),
                (hf = !0),
                Rae(),
                sht(),
                e1(),
                (dg = ea.message),
                dg !== void 0 && "resumable" in dg)
              ) {
                let { resumable: resumable, ...pm } = dg;
                dg = pm;
              }
              if (
                ((Iae = Math.max(0, Math.round(clock.monotonicNow() - monotonicNow_2))),
                (Iu = mRe(Iu, ea.message?.usage)),
                ea.message?.model)
              )
                recordServedModel(Bn(options.model), ea.message.model);
              ((b3 = ea.message.diagnostics?.cache_miss_reason ?? void 0), mht(ea.message));
              let Ql = ght(ea.message),
                Nu = fht();
              if (Nu) yield Nu;
              let Qc = np();
              if (Qc) yield Qc;
              if (Ql) yield Ql;
              break;
            }
            case "content_block_start": {
              let Ql = typeof ea.content_block === "object" && ea.content_block !== null;
              if (!Ql) FE = !1;
              if (
                (assertStreamPart(Ql, ea, lit_2("content_block_start_without_content_block")),
                isRestartedBlock({
                  previous: A_[ea.index],
                  closedContentBlocks: weakSet,
                  started: ea.content_block,
                }))
              )
                throw (
                  logEvent("tengu_streaming_error", {
                    error_type: lit_2("content_block_closed_start"),
                    part_type: fromEnum(ea.type),
                    part_index: YEe(ea),
                  }),
                  new StreamMalformedEventError("closed")
                );
              switch (
                ((FE = !1),
                (vLe ??= Math.max(0, Math.round(clock.monotonicNow() - monotonicNow_2))),
                ea.content_block.type)
              ) {
                case "tool_use":
                  ((ea.content_block.name = internalName(ea.content_block.name)),
                    (A_[ea.index] = { ...ea.content_block, input: "" }));
                  break;
                case "server_tool_use":
                  if (
                    ((A_[ea.index] = { ...ea.content_block, input: "" }),
                    ea.content_block.name === ADVISOR_TOOL_NAME)
                  )
                    ((E1 = !0),
                      logForDebugging("[AdvisorTool] Advisor tool called"),
                      logEvent("tengu_advisor_tool_call", {
                        model: telemetrySafeModelName(options.model),
                        advisor_model: telemetrySafeModelName(yn ?? "unknown"),
                        query_source: agentTypeForTelemetry(options.querySource),
                      }));
                  break;
                case "text":
                  A_[ea.index] = { ...ea.content_block, text: "" };
                  break;
                case "thinking": {
                  let Nu = { ...ea.content_block, thinking: "", signature: "" };
                  ((A_[ea.index] = Nu), okr(weakMap, Nu, clock));
                  break;
                }
                default:
                  if (
                    ((A_[ea.index] = { ...ea.content_block }),
                    ea.content_block.type === "advisor_tool_result")
                  ) {
                    ((E1 = !1), logForDebugging("[AdvisorTool] Advisor tool result received"));
                    let Nu = parseAdvisorToolError(ea.content_block);
                    if (Nu !== void 0)
                      (logForDebugging(`[AdvisorTool] Advisor tool result error: ${Nu}`),
                        logEvent("tengu_advisor_tool_error", {
                          model: telemetrySafeModelName(options.model),
                          advisor_model: telemetrySafeModelName(yn ?? "unknown"),
                          error_code: fromEnum(Nu),
                          query_source: agentTypeForTelemetry(options.querySource),
                        }));
                    else
                      logEvent("tengu_advisor_tool_result", {
                        model: telemetrySafeModelName(options.model),
                        advisor_model: telemetrySafeModelName(yn ?? "unknown"),
                        query_source: agentTypeForTelemetry(options.querySource),
                        stop_reason: fromEnumOpt(parseAdvisorResult(ea.content_block)) ?? lit_2("none"),
                      });
                  }
                  break;
              }
              if (
                ((Wd = ea.index),
                ea.content_block.type !== "thinking" &&
                  ea.content_block.type !== "redacted_thinking" &&
                  !K5(ea.content_block))
              )
                nd = !0;
              break;
            }
            case "content_block_delta": {
              let Ql = A_[ea.index],
                delta = ea.delta;
              if (!Ql || !weakSet.has(Ql)) FE = !1;
              if (!Ql || weakSet.has(Ql))
                throw (
                  logEvent("tengu_streaming_error", {
                    error_type: Ql
                      ? lit_2("content_block_closed_delta")
                      : lit_2("content_block_not_found_delta"),
                    part_type: fromEnum(ea.type),
                    part_index: YEe(ea),
                  }),
                  new StreamMalformedEventError(Ql ? "closed" : "unstarted")
                );
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
                  (assertStreamPart(
                    typeof delta.citation === "object" && delta.citation !== null,
                    ea,
                    lit_2("citations_delta_without_citation"),
                  ),
                    (Ql.citations = [...(Ql.citations ?? []), delta.citation]));
                  break;
                case "input_json_delta":
                  if (Ql.type !== "tool_use" && Ql.type !== "server_tool_use")
                    throw (
                      logEvent("tengu_streaming_error", {
                        error_type: lit_2("content_block_type_mismatch_input_json"),
                        expected_type: lit_2("tool_use"),
                        actual_type: fromEnum(Ql.type),
                      }),
                      new StreamMalformedEventError("unreadable")
                    );
                  if (typeof Ql.input !== "string")
                    throw (
                      logEvent("tengu_streaming_error", {
                        error_type: lit_2("content_block_input_not_string"),
                        input_type: fromEnum(typeof Ql.input),
                      }),
                      new StreamMalformedEventError("unreadable")
                    );
                  (assertStreamPart(
                    typeof delta.partial_json === "string",
                    ea,
                    lit_2("input_json_delta_without_partial_json"),
                  ),
                    (Ql.input += delta.partial_json));
                  break;
                case "text_delta":
                  if (Ql.type !== "text")
                    throw (
                      logEvent("tengu_streaming_error", {
                        error_type: lit_2("content_block_type_mismatch_text"),
                        expected_type: lit_2("text"),
                        actual_type: fromEnum(Ql.type),
                      }),
                      new StreamMalformedEventError("unreadable")
                    );
                  (assertStreamPart(typeof delta.text === "string", ea, lit_2("text_delta_without_text")),
                    (Ql.text += delta.text));
                  break;
                case "signature_delta":
                  if (Ql.type !== "thinking")
                    throw (
                      logEvent("tengu_streaming_error", {
                        error_type: lit_2("content_block_type_mismatch_thinking_signature"),
                        expected_type: lit_2("thinking"),
                        actual_type: fromEnum(Ql.type),
                      }),
                      new StreamMalformedEventError("unreadable")
                    );
                  (assertStreamPart(
                    typeof delta.signature === "string",
                    ea,
                    lit_2("signature_delta_without_signature"),
                  ),
                    (Ql.signature = delta.signature));
                  break;
                case "thinking_delta":
                  if (Ql.type === "redacted_thinking") break;
                  if (Ql.type !== "thinking")
                    throw (
                      logEvent("tengu_streaming_error", {
                        error_type: lit_2("content_block_type_mismatch_thinking_delta"),
                        expected_type: lit_2("thinking"),
                        actual_type: fromEnum(Ql.type),
                      }),
                      new StreamMalformedEventError("unreadable")
                    );
                  (assertStreamPart(
                    typeof delta.thinking === "string",
                    ea,
                    lit_2("thinking_delta_without_thinking"),
                  ),
                    (Ql.thinking += delta.thinking));
                  break;
              }
              break;
            }
            case "content_block_stop": {
              let Ql = A_[ea.index];
              if (!Ql || !weakSet.has(Ql)) FE = !1;
              if (!Ql || weakSet.has(Ql))
                throw (
                  logEvent("tengu_streaming_error", {
                    error_type: Ql
                      ? lit_2("content_block_closed_stop")
                      : lit_2("content_block_not_found_stop"),
                    part_type: fromEnum(ea.type),
                    part_index: YEe(ea),
                  }),
                  new StreamMalformedEventError(Ql ? "closed" : "unstarted")
                );
              if (((Wd = null), !dg))
                throw (
                  logEvent("tengu_streaming_error", {
                    error_type: lit_2("partial_message_not_found"),
                    part_type: fromEnum(ea.type),
                  }),
                  Error("Message not found")
                );
              let { content: content, batchToolUses: batchToolUses } = isBatchToolsUse(
                  normalizeContentFromAPI(
                    [Ql],
                    tools,
                    options.agentId,
                    { requestId: Al ?? void 0, messageId: dg.id },
                    options.storageV5,
                  ),
                  tools,
                  (Nf, G_) => normalizeToolInput_2(Nf, G_, options.agentId, options.storageV5),
                ),
                W_ = aI ? captureWireToolInputs([Ql]) : void 0;
              HI ||= W_?.degraded === !0;
              let pm = W_?.inputs,
                Xl = countToolCallsSince_4([Ql], pm),
                ql = elapsedSinceMs(weakMap, Ql, clock),
                Ep = THINKING_BARE_WIDTH(Ql, z5),
                cg = {
                  message: { ...dg, content: content },
                  ...(ql !== void 0 && { thinkingDurationMs: ql }),
                  ...(Ep !== void 0 && { thinkingDisplay: Ep }),
                  ...(batchToolUses.length > 0 && { batchToolUses: batchToolUses }),
                  ...(pm !== void 0 && { wireToolInputs: pm }),
                  ...(Xl !== void 0 && { wireIngestContext: Xl }),
                  ...(Xl !== void 0 && { wireIngestContext: Xl }),
                  ...(Qh !== void 0 && JGe(Qh)),
                  apiBlockIndex: ea.index,
                  requestId: Al ?? void 0,
                  requestRef: Rh,
                  requestedModel: options.model,
                  ...buildAttribution(
                    options.querySource,
                    options.spawnedBySkill,
                    options.activeSkill,
                    options.activeMcpServer,
                    options.activeMcpTool,
                  ),
                  type: "assistant",
                  uuid: randomUUID_16(),
                  timestamp: new Date().toISOString(),
                  ...!1,
                  ...(yn && { advisorModel: yn }),
                  ...(yS !== void 0 && { effort: yS }),
                  perTurnEffort: EE,
                  perTurnTiming: n$,
                  ...{},
                };
              if (
                (R4e(conversation, cg),
                Cm.push(cg),
                $I++,
                MC.set(ea.index, cg),
                (Pc = Math.max(
                  Pc,
                  Number.isSafeInteger(ea.index) && ea.index >= 0 ? ea.index + 1 : Number.NaN,
                )),
                weakSet.add(Ql),
                cg.message.content.some((Nf) => !K5(Nf)))
              ) {
                if (
                  ((Yl = !0),
                  cg.message.content.some(
                    (Nf) => Nf.type !== "thinking" && Nf.type !== "redacted_thinking" && !K5(Nf),
                  ))
                )
                  nd = !0;
              }
              yield cg;
              break;
            }
            case "message_delta": {
              if (
                ((Iu = mRe(Iu, ea.usage)),
                (T1 = ea.context_management ?? T1),
                assertStreamPart(
                  typeof ea.delta === "object" && ea.delta !== null,
                  ea,
                  lit_2("message_delta_without_delta"),
                ),
                Qh !== void 0 &&
                  typeof ea.delta === "object" &&
                  ea.delta !== null &&
                  "safeguard_results" in ea.delta)
              )
                MI(Qh, ea.delta, A_);
              let Ql = options.serverRefusalFallback !== void 0 ? parseUsageIterations(Iu) : void 0;
              if (Ql?.servedFallbackModel !== void 0) (($E = !0), (Iu = $jo(Iu, ea.usage)));
              let Nu = readFallbackCreditToken(ea.delta.stop_details);
              {
                let stop_details = ea.delta.stop_details;
                if (stop_details && "fallback_credit_token" in stop_details)
                  delete stop_details.fallback_credit_token;
              }
              if (Nu !== void 0 && !b1)
                ((b1 = !0),
                  logEvent("tengu_fallback_credit_minted", {
                    request_id: ye(Al),
                    model: telemetrySafeModelName(options.model),
                    fallback_target_model: telemetrySafeModelName(
                      options.refusalFallbackModel ??
                        (options.serverRefusalFallback !== void 0 && !$E
                          ? options.serverRefusalFallback.model
                          : void 0),
                    ),
                    token_length: Nu.length,
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
                      query_chain_id: ye(options.queryTracking.chainId),
                      query_depth: options.queryTracking.depth,
                    }),
                  }));
              let Qc = typeof ea.delta.stop_reason === "string" ? ea.delta.stop_reason : null;
              if (Qc !== null) ((lm = Qc), (FE = !0));
              let delta = ea.delta;
              if (delta.diagnostics?.cache_miss_reason) b3 = delta.diagnostics.cache_miss_reason;
              let pm = getResumableFlag(ea.delta) ?? getResumableFlag(ea),
                Xl = m$ && T1 ? addClientEstimatedClearedTokens(T1, EI?.edit, HS) : null;
              for (let msg of Cm) {
                if (((msg.message.usage = Iu), (msg.message.stop_reason = lm), Qc !== null || lm === null))
                  msg.message.stop_details = ea.delta.stop_details ?? null;
                if (Xl) msg.message.context_management = Xl;
                if (pm !== void 0) msg.message.resumable = pm;
              }
              if (lm !== null && aP !== "credited") {
                aP = "credited";
                let Hf = Ql?.servedFallbackModel,
                  pp = Ql !== void 0 && Hf !== void 0,
                  Om = pp
                    ? fallbackMessagesCost(
                        Ql.entries,
                        {
                          speed: Iu.speed,
                          inferenceGeo: Iu.inference_geo,
                          serverToolUse: Iu.server_tool_use,
                        },
                        lm,
                      )
                    : calculateUSDCost(resolvedModel, Iu),
                  Dy = pp ? uJn(options.serverRefusalFallback?.model, Hf) : options.model;
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
              if (Qc === "refusal" && !La)
                ((La = !0),
                  logApiRefusal({
                    model: resolvedModel,
                    requestId: Al || void 0,
                    querySource: options.querySource,
                    effort: CC,
                    fastMode: NI,
                    attempt: p_,
                    attribution: buildAttribution(
                      options.querySource,
                      options.spawnedBySkill,
                      options.activeSkill,
                      options.activeMcpServer,
                      options.activeMcpTool,
                    ),
                    serverFallbackHop: !1,
                    stopDetails: ea.delta.stop_details ?? null,
                    agentContext: options.agentContext,
                  }));
              if (options.serverRefusalFallback !== void 0) {
                let Hf = E$;
                if (((E$ = void 0), Hf !== void 0)) {
                  if (!UT)
                    ((UT = !0),
                      yield {
                        type: "server_fallback",
                        fromModel: Hf.fromModel,
                        toModel: Hf.model,
                        reason: Hf.reason,
                        apiRefusalCategory: Hf.category,
                        midStream: !1,
                        requestId: Al ?? null,
                        refusedEffort: qx(),
                        discardedMessages: [],
                        retainedMessages: [],
                        retainedText: "",
                        finalStopReason: lm,
                      });
                } else if (!UT && Ql?.servedFallbackModel !== void 0)
                  ((UT = !0),
                    yield {
                      type: "server_fallback",
                      fromModel: options.model,
                      toModel: Ql.servedFallbackModel,
                      reason: "sticky",
                      apiRefusalCategory: null,
                      midStream: !1,
                      requestId: Al ?? null,
                      refusedEffort: qx(),
                      discardedMessages: [],
                      retainedMessages: [],
                      retainedText: "",
                      finalStopReason: lm,
                    });
              }
              let ql =
                  options.refusalFallbackModel ??
                  (options.serverRefusalFallback !== void 0 && !$E
                    ? options.serverRefusalFallback.model
                    : void 0),
                Ep = options.refusalFallbackModelLane === "silent",
                refusalFallbackCascadeHop = options.refusalFallbackCascadeHop,
                Nf =
                  Qc === "refusal" && ql !== void 0 && !Ep && refusalFallbackCascadeHop === void 0
                    ? resolveRefusalFallbackRoute({
                        originalModelCanonical: getCanonicalName(options.model),
                        armedFallbackModel: ql,
                        apiRefusalCategory: ea.delta.stop_details?.category ?? null,
                        armedTargetIsRefusingModel: isSameModel(options.model, ql),
                        resolveTarget: (Hf) =>
                          pickFallbackModel({
                            mappedTarget: Hf,
                            armedFallbackModel: ql,
                            refusingModel: options.model,
                            triedModels: [canonicalModelKey(options.model)],
                          }),
                        routesOverride: Y8r(),
                      })
                    : void 0,
                G_ = Nf !== void 0 ? Nf.model : ql;
              if (Nf !== void 0)
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
                  !hasRefusalFallbackOccurred(),
                fp =
                  Qc === "refusal" && (ql === void 0 || ty)
                    ? options.refusalFallbackSilentRearm?.(
                        ty,
                        ea.delta.stop_details?.category ?? null,
                        hasTenderQuiltHeader(k_?.headers),
                      )
                    : void 0,
                th = G_ ?? fp;
              if (Qc === "refusal" && th !== void 0) {
                (DLe(),
                  (k3 = !0),
                  yield {
                    type: "fallback_request",
                    trigger: "refusal",
                    originalModel: options.model,
                    fallbackModel: th,
                    requestId: Al ?? null,
                    refusedEffort: qx(),
                    apiRefusalCategory: ea.delta.stop_details?.category ?? null,
                    apiRefusalExplanation: ea.delta.stop_details?.explanation ?? null,
                    creditCode: Nu ?? null,
                    mintedStateless: !c1,
                    ...(fp !== void 0 && { silentArmAtTrigger: !0 }),
                    ...describeFallbackRoute(Nf, refusalFallbackCascadeHop),
                  });
                return;
              }
              let Fg = getRefusalMessage(
                Qc,
                ea.delta.stop_details,
                Al,
                $E ? (Ql?.servedFallbackModel ?? dg?.model ?? options.model) : options.model,
                dg?.id,
              );
              if (Fg) {
                let Hf = hasRefusalFallbackOccurred() || getRefusalFallbackModelLatch() !== void 0;
                if (
                  ql !== void 0 ||
                  options.refusalFallbackModel !== void 0 ||
                  (hasRefusalFallbackTarget(options.model) && isRefusalFallbackEnabled()) ||
                  CEn() ||
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
                          : hasRefusalFallbackTarget(options.model) && Z8r()
                            ? "disabled_by_config"
                            : "not_armed",
                    {
                      convolute_arcades: AEn(),
                      arm_source: fromEnum(getFallbackLatchKind()),
                      armed: ql !== void 0,
                      model_scope: fromEnum(classifyFallbackOrigin(options.model)),
                    },
                  );
                (yield {
                  type: "refusal_no_fallback",
                  originalModel: options.model,
                  requestId: Al ?? null,
                  apiRefusalCategory: ea.delta.stop_details?.category ?? null,
                  apiRefusalExplanation: ea.delta.stop_details?.explanation ?? null,
                },
                  yield Fg);
              }
              let DC = getMaxTokensStopMessage(Qc, BT, Iu.output_tokens);
              if (DC !== void 0) yield DC;
              break;
            }
            case "message_stop":
              if (((hf = !1), Qh !== void 0)) bLe(Xqt(Qh));
              if (HI) FHe();
              if (aP === "pending") lP();
              C_("stream_completed", Al ?? null, Iu);
              break;
          }
          if (ea.type === "content_block_stop" && HLe.has(ea.index)) continue;
          Vl = !0;
          let costUSDForPart = thinkingStartTime(ea, z5),
            om = Kg || ea.type === "message_start";
          if (ea.type === "message_start")
            ((Kg = !0),
              (cy = null),
              (jT = !1),
              (pk = typeof ea.message.id === "string" && ea.message.id !== "" ? ea.message.id : null));
          else if (ea.type === "content_block_start")
            ((cy = ea.index), (jT = TOOL_USE_BLOCK_TYPES.has(ea.content_block.type)));
          else if (ea.type === "content_block_stop") ((cy = null), (jT = !1));
          else if (ea.type === "message_stop") ((Kg = !1), (cy = null), (jT = !1));
          yield {
            type: "stream_event",
            event: ea,
            ...(ea.type === "message_start"
              ? {
                  ttftMs: Iae,
                  ...(yS !== void 0 && { sentEffort: yS }),
                  ...(options.turnEffort !== void 0 && { turnEffort: options.turnEffort }),
                  ...(_3 ? { requestSentAtMs: _3 } : void 0),
                  ...(ELe ? { requestSentWallMs: ELe } : void 0),
                }
              : void 0),
            ...(costUSDForPart !== void 0 ? { thinkingDisplay: costUSDForPart } : void 0),
            ...(om && pk !== null ? { apiMessageId: pk } : void 0),
          };
        }
        if ((D1(), yP?.(v$, Jr?.chunks), signal.aborted)) {
          yield* clearStreamIdleTimers();
          return;
        }
        if (fh) {
          let ea = _b !== null ? Math.round(clock.monotonicNow() - _b) : -1;
          throw (
            logForDiagnosticsNoPII("info", "cli_stream_loop_exited_after_watchdog_clean"),
            logEvent("tengu_stream_loop_exited_after_watchdog", {
              request_id: vh(Al),
              exit_delay_ms: ea,
              exit_path: lit_2("clean"),
              model: telemetrySafeModelName(options.model),
            }),
            (_b = null),
            Error("Stream idle timeout - no chunks received")
          );
        }
        if (Ow !== void 0) throw Ow;
        if (hf && Wd !== null)
          throw (
            logForDebugging(
              `Stream ended cleanly inside open block ${Wd} (stop_reason=${lm}) \u2014 treating as a dropped connection`,
              { level: "error" },
            ),
            new StreamTruncatedError()
          );
        if (!dg || (Cm.length === 0 && !lm))
          throw (
            logForDebugging(
              !dg
                ? "Stream completed without receiving message_start event - triggering non-streaming fallback"
                : "Stream completed with message_start but no content blocks completed - triggering non-streaming fallback",
              { level: "error" },
            ),
            logEvent("tengu_stream_no_events", {
              model: telemetrySafeModelName(options.model),
              request_id: vh(Al),
              ...responseDiagnosticFields(void 0, nk),
              ms_since_request: Math.round(clock.monotonicNow() - monotonicNow_2),
            }),
            new StreamNoEventsError()
          );
        if (hf && !(lm !== null && FE))
          throw (
            logForDebugging(
              `Stream ended cleanly mid-response (stop_reason=${lm}, terminal=${FE}) \u2014 treating as a dropped connection`,
              { level: "error" },
            ),
            new StreamTruncatedError()
          );
        try {
          let ea = Ws(),
            hasFired = ea.hasFired("stream_text_delivery_bad"),
            hasFired_2 = ea.hasFired("stream_text_delivery_ok");
          if (lm !== null && !D3 && (!hasFired || !hasFired_2)) {
            if (!hasFired)
              for (let [Mg, eh] of A_.entries()) {
                if (!eh || eh.type !== "text") continue;
                if (eh.text.trim().length > 0 && !MC.has(Mg) && !Bae.has(Mg)) {
                  (ea.markFired("stream_text_delivery_bad"),
                    logFeatureBad("api_stream_text_delivery", "text_block_unyielded", {
                      had_tool_use: A_.some((om) => om?.type === "tool_use"),
                      dropped_block_index: Mg,
                    }));
                  break;
                }
              }
            if (!hasFired_2) {
              let any = A_.some((om, Ql) => om?.type === "text" && om.text.trim().length > 0 && MC.has(Ql)),
                any_2 = A_.some((om, Ql) => om?.type === "tool_use" && MC.has(Ql));
              if (any && any_2)
                (ea.markFired("stream_text_delivery_ok"), logFeatureOk("api_stream_text_delivery"));
            }
          }
          if (lm !== null) Ggt(Iu);
          zgt(Iu);
        } catch {}
        if (Aw > 0)
          (logForDebugging(
            `Streaming completed with ${Aw} stall(s), total stall time: ${(VT / 1000).toFixed(1)}s`,
            { level: "warn" },
          ),
            logEvent("tengu_streaming_stall_summary", {
              stall_count: Aw,
              total_stall_time_ms: VT,
              model: telemetrySafeModelName(options.model),
              request_id: vh(Al),
            }));
        (recordIdleClearingServerReport({
          returnAfterIdle: m$ ? EI?.returnAfterIdle : void 0,
          contextManagement: T1,
          usage: Iu,
          querySource: options.querySource,
          agentId: options.agentId,
        }),
          checkResponseForCacheBreak(
            options.querySource,
            Iu.cache_read_input_tokens,
            Iu.cache_creation_input_tokens,
            messages,
            options.agentId,
            Al,
            nt,
            Hi,
          ));
        let B_ = k_;
        if (B_) {
          (recordLowPriorityServed(_S, bS),
            extractGraceStatusFromHeaders(
              B_.headers,
              classifyQuerySource(options.querySource) !== "auxiliary",
              bS,
              Yc,
            ));
          let ea =
              (has1mSuffix(options.model) || modelHasNative1MContext(options.model)) &&
              Iu.input_tokens + Iu.cache_read_input_tokens + Iu.cache_creation_input_tokens > CK,
            j_ = extractQuotaStatusFromHeaders(B_.headers, options.model, ea, bS, Yc, options.storageV5);
          if (j_ && options.queryTracking)
            ((options.queryTracking.answeredQuerySource = options.querySource),
              (options.queryTracking.billedToUsageCredits = j_.overageInUse === !0),
              (options.queryTracking.longContextBilled = ea));
          (refetchStaleClientData(B_.headers, options, NI), (ALe = B_.headers));
        }
      } catch (streamingError) {
        let od =
          Ow !== void 0 && !fh && !signal.aborted && streamingError instanceof Lf ? Ow : streamingError;
        (D1(), yP?.(v$, Jr?.chunks), OE());
        {
          let pp = N3();
          if (pp) yield pp;
        }
        if (!fh && od instanceof StreamIdleTimeoutError)
          ((fh = !0),
            (_b = clock.monotonicNow()),
            logForDebugging(`Streaming idle timeout (byte-level): ${od.message}, aborting stream`, {
              level: "error",
            }),
            logForDiagnosticsNoPII("error", "cli_streaming_idle_timeout"),
            logEvent("tengu_streaming_idle_timeout", {
              model: telemetrySafeModelName(options.model),
              request_id: vh(Al),
              timeout_ms: od.idleMs,
              tier: lit_2("byte"),
              bytes_received_before_stall: od.bytesReceived,
              time_to_first_byte_ms: od.ttfbMs,
              body_read_pending: od.bodyReadPending,
              slept_ms: od.sleptMs,
              cf_ray: ye(od.cfRay),
            }));
        if (fh && _b !== null) {
          let exitDelayMs = Math.round(clock.monotonicNow() - _b);
          (logForDiagnosticsNoPII("info", "cli_stream_loop_exited_after_watchdog_error"),
            logEvent("tengu_stream_loop_exited_after_watchdog", {
              request_id: vh(Al),
              exit_delay_ms: exitDelayMs,
              exit_path: lit_2("error"),
              error_name:
                od instanceof Error
                  ? (sanitizedErrorNameForTelemetry(od) ?? lit_2("Error"))
                  : lit_2("unknown"),
              model: telemetrySafeModelName(options.model),
            }));
        }
        let Zg = {
            events_received: v$,
            ms_to_first_event: Am,
            ms_since_last_event: Ew === null ? null : clock.now() - Ew,
          },
          Iy = (pp, Om) =>
            logForDiagnosticsNoPII("warn", "cli_stream_failed", () => ({
              ...classifyApiErrorKind(Om, classifyAPIError(Om), nk),
              fallback_cause: pp,
              watchdog_fired: fh,
              slept_ms:
                od instanceof StreamIdleTimeoutError || od instanceof StreamSuspendedError
                  ? od.sleptMs
                  : null,
              client_request_id: ye(Ah) ?? null,
              model: telemetrySafeModelName(options.model) ?? null,
              stream: {
                ...Zg,
                first_event_type: cP === null ? null : bke(cP),
                last_event_type: fP === null ? null : bke(fP),
                message_envelope_open: hf,
                stop_reason_received: lm !== null,
                content_blocks_completed: $I,
                any_event_yielded: Vl,
                ms_since_request: Math.round(clock.monotonicNow() - monotonicNow_2),
                ms_to_headers: nk?.latencyMs ?? null,
                stalls_over_30s: Aw,
                stall_ms_total: VT,
              },
              route: connectionSetupFacts(),
            }));
        if (od instanceof Lf) {
          if (signal.aborted)
            throw (
              yield* clearStreamIdleTimers(),
              logForDebugging(`Streaming aborted by user: ${errorMessage(od)}`),
              od
            );
          else if (!fh) {
            logForDebugging(`Streaming timeout (SDK abort): ${od.message}`, { level: "error" });
            let pp = new fT({ message: "Request timed out" });
            throw (Iy("sdk_timeout", pp), pp);
          }
        }
        let Of = extractConnectionErrorDetails(od),
          B_ = Of !== null && LK.has(Of.code),
          ea = Of !== null && (B_ || PU.has(Of.code)),
          j_ = contextHintController?.classifyStreamError(od) ?? !1,
          vc = od instanceof StreamMalformedEventError || od instanceof SyntaxError,
          Mg = od instanceof StreamMalformedEventError && od.blockState === "unstarted",
          eh = Mg
            ? "event referenced an unstarted content block"
            : od instanceof StreamMalformedEventError && od.blockState === "closed"
              ? "event referenced an already-closed content block"
              : "event could not be read",
          om = classifyStreamError({
            connDetails: Of,
            isStaleConnection: B_,
            isContextHintSse: j_,
            streamIdleAborted: fh,
            noEvents: od instanceof StreamNoEventsError,
            malformedStream: od instanceof StreamMalformedEventError,
          }),
          Ql = sanitizedErrorNameForTelemetry(od) ?? null,
          Nu = sanitizedConnectionCodeForTelemetry(Of?.code) ?? null,
          Qc = od instanceof Error ? (Ql ?? lit_2("none")) : fromEnum(typeof od),
          W_ =
            od instanceof Error
              ? (sanitizedClassNameForTelemetry(od.constructor?.name) ?? lit_2("none"))
              : lit_2("none"),
          pm = Nu ?? lit_2("none"),
          Xl =
            ((getFeatureValue_CACHED_MAY_BE_STALE("tengu_watchdog_skip_nonstreaming_fallback", !1) ||
              env.CLAUDE_CODE_REMOTE) &&
              fh) ||
            env.CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK ||
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_disable_streaming_to_non_streaming_fallback", !1);
        if (fh)
          Lae = Error(
            Cm.length > 0
              ? "Stream idle timeout - partial response received"
              : "Stream idle timeout - no chunks received",
          );
        let ql = fh ? Lae : od,
          Ep =
            ql instanceof Error
              ? (sanitizedErrorNameForTelemetry(ql) ?? lit_2("Error"))
              : fromEnum(typeof ql);
        Iy(om, od instanceof Lf ? ql : od);
        let cg =
            is529Error(od) ||
            isNon529ServerError(od) ||
            (od instanceof Ot && (od.type === "api_error" || od.type === "timeout_error")),
          Nf;
        if (adt(od)) Nf = "dlpDenied";
        else if (_3e(od)) Nf = "escapeMonitor";
        let G_ = isRequestTooLargeError_2(od),
          ty = yb !== null && !E3 && Of !== null && !Vl,
          fp = classifyStreamFailure({
            error: od,
            isServerError: cg,
            stalled: fh,
            isConnectionError: ea || ty,
            suspended: isStreamSuspendedError(od),
            truncated: Of?.code === "StreamTruncated",
            malformed: vc,
            denied: Nf !== void 0,
            outputFiltered: G_,
            anyEvent: Vl,
            anyBlockFinished: Yl,
            anyOutputShown: nd,
            stopReasonReceived: lm !== null,
            outlastedNonStreamingTimeout:
              clock.monotonicNow() - monotonicNow_2 >= getNonStreamingRequestTimeoutMs(),
            complete: lm !== null && FE && Wd === null,
          }),
          th = fp === void 0 ? "keepPartial" : retryBudget.onStreamFailed(fp, !Xl),
          counts = retryBudget.counts(),
          DC = fp?.progress === "thinkingOnly" && fp.cause === "overloaded" && !fp.stopReasonReceived;
        if (
          th === "useFallbackModel" &&
          (fp?.cause === "serverError" || fp?.cause === "timedOut") &&
          options.fallbackModel
        ) {
          if (!nd) markAbandonedThinking(Cm, resolvedModel);
          if (hf) (lP(), xT());
          throw (
            logEvent("tengu_api_model_not_found_fallback_triggered", {
              original_model: telemetrySafeModelName(options.model),
              fallback_model: telemetrySafeModelName(options.fallbackModel),
              provider: getAPIProviderForAnalytics(),
              reason: fp.cause === "timedOut" ? lit_2("timed_out") : lit_2("server_error"),
              source: lit_2("mid_stream"),
            }),
            new FallbackTriggeredError(options.model, options.fallbackModel, "server_error", od)
          );
        }
        if (fp === void 0 || fp.progress === "output" || (fp.progress === "thinkingOnly" && !DC)) {
          let pp = cg && nd,
            Om = cg && th === "retry";
          if (th !== "fail") {
            releaseStreamResources();
            let Dy = fh,
              any = Cm.some((Uae) => Uae.message.content.some((params) => params.type === "tool_use"));
            if (th === "retry") {
              if (!nd) markAbandonedThinking(Cm, resolvedModel);
              if (Dy)
                (logForDebugging(
                  `Stream idle timeout after thinking-only yield \u2014 retrying streaming (${counts.stalls}/${RETRY_POLICY_CONST_1})`,
                  { level: "warn" },
                ),
                  logEvent("tengu_streaming_watchdog_retry", {
                    model: telemetrySafeModelName(options.model),
                    retry_attempt: counts.stalls,
                    request_id: ye(Al),
                    after_thinking_only: !0,
                  }));
              else
                (logForDebugging(
                  `Stream ${vc ? eh : Om ? "server error" : `connection closed (${Of?.code})`} after thinking-only yield \u2014 retrying streaming (${counts.afterThinkingOnly}/${fp?.cause === "timedOut" ? RETRY_POLICY_CONST_HYN : MAX_OUTPUT_FILTERED_RETRIES})`,
                  { level: "warn" },
                ),
                  logEvent("tengu_streaming_stale_connection_retry", {
                    model: telemetrySafeModelName(options.model),
                    error_code: vc
                      ? lit_2("malformed_stream")
                      : Om
                        ? fp?.cause === "timedOut"
                          ? lit_2("timed_out")
                          : lit_2("server_error")
                        : Thr(Of?.code ?? ""),
                    retry_attempt: counts.afterThinkingOnly,
                    request_id: ye(Al),
                    after_thinking_only: !0,
                  }));
              if (
                (C_("attempt_errored", Al ?? null, null),
                lP(),
                xT(),
                yield* ey({ responseUnfinished: !0 }),
                (Al = null),
                Om)
              )
                await sleep(getRetryDelay(counts.afterThinkingOnly, void 0, void 0, options.random), signal, {
                  clock: clock,
                });
              else if (!Dy) await sleep(100 * counts.afterThinkingOnly, signal, { clock: clock });
              continue e;
            }
            let P5n = lm !== null,
              vht = Of?.code === "StreamSuspended",
              ULe = vht && !isDisklessProcess(),
              Eht = Dy
                ? "watchdog"
                : pp
                  ? od instanceof Ot && od.type === "timeout_error"
                    ? "timed_out"
                    : "server_error"
                  : vc
                    ? "malformed_stream"
                    : vht
                      ? "stream_suspended"
                      : Of?.code === "StreamTruncated"
                        ? "stream_truncated"
                        : Of !== null && PU.has(Of.code)
                          ? "network_down"
                          : "stale_connection",
              Rht = fromEnum(Eht);
            if (P5n && FE && Wd === null) {
              (logForDebugging(
                `Stream ${Dy ? "stalled" : `connection closed (${Of?.code ?? "unknown"})`} after message_delta (stop_reason=${lm}) \u2014 response already complete, no truncation`,
                { level: "info" },
              ),
                logEvent("tengu_streaming_close_after_complete", {
                  model: telemetrySafeModelName(options.model),
                  blocks_yielded: Cm.length,
                  cause: Rht,
                  error_code: Of ? Thr(Of.code) : lit_2("none"),
                  request_id: ye(Al),
                }),
                C_("stream_completed", Al ?? null, Iu),
                yield* ey({ responseUnfinished: !1 }));
              break e;
            }
            let jLe = any ? "tool_use" : "end_turn";
            lm = jLe;
            for (let Uae of Cm) ((Uae.message.usage = Iu), (Uae.message.stop_reason = jLe));
            (Nh?.noteClientTruncated(Cm[0]?.message.id),
              logForDebugging(
                Dy
                  ? `Stream idle timeout after ${Cm.length} block(s) yielded \u2014 finalizing partial response`
                  : pp
                    ? `Mid-stream server error after ${Cm.length} block(s) yielded \u2014 finalizing partial response`
                    : vc
                      ? `Stream ${eh} after ${Cm.length} block(s) yielded \u2014 finalizing partial response`
                      : `Stream connection closed (${Of?.code}) after ${Cm.length} block(s) yielded \u2014 finalizing partial response`,
                { level: "warn" },
              ),
              logEvent("tengu_streaming_partial_finalized", {
                model: telemetrySafeModelName(options.model),
                blocks_yielded: Cm.length,
                has_output: nd,
                synthesized_stop_reason: fromEnum(jLe),
                cause: Rht,
                request_id: ye(Al),
              }),
              lP(),
              yield* ey({ responseUnfinished: !0 }));
            let WLe = createApiErrorMessage({
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
                ? void 0
                : Dy
                  ? "stream_idle_timeout"
                  : ULe
                    ? "computer_slept"
                    : isConnectionError(od)
                      ? "connection_failed"
                      : void 0,
              truncatedAfterOutput: nd && !any ? !0 : void 0,
            });
            if (((WLe.streamCutCause = Eht), Dy && !nd)) WLe.streamWatchdogGaveUp = !0;
            yield WLe;
            break e;
          }
          throw (
            logEvent("tengu_streaming_fallback_to_non_streaming", {
              model: telemetrySafeModelName(options.model),
              error: Ep,
              attemptNumber: p_,
              maxOutputTokens: BT,
              thinkingType: fromEnum(betas.type),
              fallback_disabled: Xl,
              request_id: vh(Al),
              fallback_cause: lit_2("partial_yield"),
              any_stream_event_yielded: Vl,
              has_output: nd,
              died_of: fromEnum(fp?.cause ?? "complete"),
            }),
            ql
          );
        }
        if (fp?.cause === "outputFiltered") {
          if (hf) lP();
          if (th === "retry") {
            if (
              (logForDebugging(
                `Output content filter stopped the response before any of the answer was shown: retrying streaming (${counts.outputFiltered}/${RETRY_POLICY_CONST_JEE})`,
                { level: "warn" },
              ),
              logEvent("tengu_streaming_output_filter_retry", {
                model: telemetrySafeModelName(options.model),
                retry_attempt: counts.outputFiltered,
                request_id: vh(Al),
                first_stop_progress: fromEnum(fp.progress),
              }),
              (uP = {
                firstStopProgress: fp.progress,
                msToFirstStop: Math.round(clock.monotonicNow() - monotonicNow_2),
                startedAt: clock.monotonicNow(),
                ended: void 0,
              }),
              releaseStreamResources(),
              C_("attempt_errored", Al ?? null, null),
              hf)
            )
              xT();
            (yield* ey({ responseUnfinished: !0 }), (Al = null));
            continue e;
          }
          throw (
            logEvent("tengu_streaming_fallback_to_non_streaming", {
              model: telemetrySafeModelName(options.model),
              error: lit_2("output_content_filtered"),
              attemptNumber: p_,
              maxOutputTokens: BT,
              thinkingType: fromEnum(betas.type),
              fallback_disabled: !0,
              request_id: vh(Al),
              fallback_cause: lit_2("output_content_filtered"),
              any_stream_event_yielded: Vl,
            }),
            od
          );
        }
        if (ty) {
          if (
            ((E3 = !0),
            logForDebugging(
              `[dispatch] Stream connection error (${Of.code}) with ${ANTHROPIC_DISPATCH_ID}=${yb} before first event; ${th === "retry" ? "retrying once" : "going on"} with ${ANTHROPIC_DISPATCH_ID}=${V2P}`,
              { level: "warn" },
            ),
            logEvent("tengu_dispatch_header_fallback", {
              model: telemetrySafeModelName(options.model),
              dispatch: yb ?? void 0,
              resend_dispatch: fromEnum(V2P),
              reason: lit_2("body_phase"),
              status: lit_2("none"),
              error_code: Thr(Of.code),
              query_source: agentTypeForTelemetry(options.querySource),
              request_id: ye(Al),
            }),
            th === "retry")
          ) {
            (releaseStreamResources(), C_("attempt_errored", Al ?? null, null), (Al = null));
            continue e;
          }
        }
        let Hf =
          ea && Of !== null
            ? {
                label: `connection error (${Of.code})`,
                errorCode: Thr(Of.code),
                error: new ef({ cause: od instanceof Error ? od : void 0 }),
                attempt: Math.max(1, counts.retries),
                limit: PLe,
              }
            : fp?.cause === "serverError" && od instanceof Ot
              ? {
                  label: "server error",
                  errorCode: lit_2("server_error"),
                  error: od,
                  attempt: counts.afterThinkingOnly,
                  limit: MAX_OUTPUT_FILTERED_RETRIES,
                }
              : void 0;
        if (th === "retry" && Hf !== void 0) {
          let attempt = Hf.attempt;
          if (
            (logForDebugging(`Stream ${Hf.label} \u2014 retrying streaming (${attempt}/${Hf.limit})`, {
              level: "warn",
            }),
            logEvent("tengu_streaming_stale_connection_retry", {
              model: telemetrySafeModelName(options.model),
              error_code: Hf.errorCode,
              retry_attempt: attempt,
              request_id: vh(Al),
            }),
            releaseStreamResources(),
            C_("attempt_errored", Al ?? null, null),
            hf)
          )
            xT();
          if (hf && aP !== "credited") (lP(), yield* ey({ responseUnfinished: !0 }));
          Al = null;
          let Om = getRetryDelay(attempt, void 0, void 0, options.random),
            Dy = { ...summarizeApiError(Hf.error), rateLimits: null };
          ((T3 = !0),
            options.onRetryStatus?.({
              kind: "retrying",
              error: Dy,
              attempt: attempt,
              maxRetries: Hf.limit,
              retryInMs: Om,
              deadline: clock.now() + Om,
            }),
            yield createSystemAPIErrorMessage(Dy, Om, attempt, Hf.limit, "connection_retry"),
            await sleep(Om, signal, { clock: clock }));
          continue e;
        }
        if (ea && lm === null && hf) lP();
        if (fh && th === "retry") {
          (logForDebugging(
            `Stream idle timeout before first event \u2014 retrying streaming (${counts.stalls}/${RETRY_POLICY_CONST_1})`,
            { level: "warn" },
          ),
            logEvent("tengu_streaming_watchdog_retry", {
              model: telemetrySafeModelName(options.model),
              retry_attempt: counts.stalls,
              request_id: vh(Al),
            }),
            releaseStreamResources(),
            C_("attempt_errored", Al ?? null, null),
            (Al = null));
          continue e;
        }
        if (!nd && lm === null && !retryBudget.outOfApiAttempts() && ILe(od) !== void 0) {
          if ((retryBudget.undoLastCount(), hf)) (lP(), xT());
          (releaseStreamResources(),
            C_("attempt_errored", Al ?? null, null),
            yield* ey({ responseUnfinished: !0 }),
            (Al = null));
          continue e;
        }
        if (Nf === "dlpDenied")
          throw (
            logEvent("tengu_streaming_fallback_to_non_streaming", {
              model: telemetrySafeModelName(options.model),
              error: lit_2(DLP_REQUEST_DENIED),
              attemptNumber: p_,
              maxOutputTokens: BT,
              thinkingType: fromEnum(betas.type),
              fallback_disabled: !0,
              request_id: vh(Al),
              fallback_cause: lit_2(DLP_REQUEST_DENIED),
              any_stream_event_yielded: Vl,
            }),
            od
          );
        if (Nf === "escapeMonitor")
          throw (
            logEvent("tengu_streaming_fallback_to_non_streaming", {
              model: telemetrySafeModelName(options.model),
              error: lit_2(SAFETY_MONITOR_BLOCKED),
              attemptNumber: p_,
              maxOutputTokens: BT,
              thinkingType: fromEnum(betas.type),
              fallback_disabled: !0,
              request_id: vh(Al),
              fallback_cause: lit_2(SAFETY_MONITOR_BLOCKED),
              any_stream_event_yielded: Vl,
            }),
            od
          );
        if (od instanceof Ot && is529Error(od)) {
          let pp = nd
              ? null
              : planLowPriorityRetry(od, {
                  markedAtDispatch: Jh,
                  querySource: options.querySource,
                  wait: _S,
                }),
            Om = retryBudget.outOfApiAttempts() ? null : pp;
          if (!nd) {
            if (hf) (lP(), xT());
            let overloaded = counts.overloaded;
            if (Om !== null || th === "retry") {
              if (
                (markAbandonedThinking(Cm, resolvedModel),
                logForDebugging(
                  Om !== null
                    ? `Mid-stream 529 before content at lower priority \u2014 waiting ${Om.delayMs}ms for capacity (attempt ${Om.attempt})`
                    : `Mid-stream 529 before content \u2014 retrying streaming (${overloaded}/${MAX_529_RETRIES})`,
                  { level: "warn" },
                ),
                Om !== null)
              )
                retryBudget.undoLastCount();
              (logEvent("tengu_streaming_529_retry", {
                model: telemetrySafeModelName(options.model),
                retry_attempt: Om !== null ? Om.attempt : overloaded,
                request_id: ye(Al),
                ...(Om !== null && { is_low_priority: !0 }),
              }),
                releaseStreamResources(),
                C_("attempt_errored", Al ?? null, null),
                yield* ey({ responseUnfinished: !0 }),
                (Al = null),
                (T3 = !0));
              let UI = Om?.delayMs ?? getRetryDelay(overloaded, void 0, void 0, options.random);
              (options.onRetryStatus?.(
                Om !== null
                  ? {
                      kind: "low_priority_waiting",
                      attempt: Om.attempt,
                      retryInMs: UI,
                      deadline: clock.now() + UI,
                    }
                  : {
                      kind: "retrying",
                      error: { ...summarizeApiError(od), rateLimits: null },
                      attempt: overloaded,
                      maxRetries: MAX_529_RETRIES - 1,
                      retryInMs: UI,
                      deadline: clock.now() + UI,
                    },
              ),
                await sleep(UI, signal, { clock: clock }));
              continue e;
            }
            if (options.fallbackModel && th === "useFallbackModel")
              throw (
                markAbandonedThinking(Cm, resolvedModel),
                logEvent("tengu_api_opus_fallback_triggered", {
                  original_model: telemetrySafeModelName(options.model),
                  fallback_model: telemetrySafeModelName(options.fallbackModel),
                  provider: getAPIProviderForAnalytics(),
                  source: lit_2("mid_stream"),
                }),
                logFeatureSad("api_request", "api_request_fallback_triggered"),
                new FallbackTriggeredError(options.model, options.fallbackModel, "overloaded", od)
              );
          }
        }
        if (th === "fail")
          throw (
            logForDebugging(`Error streaming (non-streaming fallback disabled): ${errorMessage(ql)}`, {
              level: "error",
            }),
            logEvent("tengu_streaming_fallback_to_non_streaming", {
              model: telemetrySafeModelName(options.model),
              error: Ep,
              attemptNumber: p_,
              maxOutputTokens: BT,
              thinkingType: fromEnum(betas.type),
              fallback_disabled: !0,
              request_id: vh(Al),
              fallback_cause: fromEnum(om),
              error_name: Qc,
              error_constructor: W_,
              error_code: pm,
              any_stream_event_yielded: Vl,
            }),
            (Egt = !0),
            (xgt = fh),
            ql
          );
        if (!nd) markAbandonedThinking(Cm, resolvedModel);
        if (
          (logForDebugging(`Error streaming, falling back to non-streaming mode: ${errorMessage(ql)}`, {
            level: "error",
          }),
          (dP = !0),
          RLe)
        )
          ymn("non_streaming");
        if (dg !== void 0) xT();
        S3 = clock.now();
        {
          let pp = await contextHintController?.onStreamFallback(messagesForAPI_2, Al ?? void 0);
          if (pp)
            ((messagesForAPI_2 = ch(pp.messages, "microcompact")), yht(pp.clearedIds, pp.clearedContent));
        }
        if (
          (logEvent("tengu_streaming_fallback_to_non_streaming", {
            model: telemetrySafeModelName(options.model),
            error: Ep,
            attemptNumber: p_,
            maxOutputTokens: BT,
            thinkingType: fromEnum(betas.type),
            fallback_disabled: !1,
            request_id: vh(Al),
            fallback_cause: fromEnum(om),
            error_name: Qc,
            error_constructor: W_,
            error_code: pm,
            any_stream_event_yielded: Vl,
          }),
          logForDiagnosticsNoPII("info", "cli_nonstreaming_fallback_started"),
          logEvent("tengu_nonstreaming_fallback_started", {
            request_id: vh(Al),
            model: telemetrySafeModelName(options.model),
            fallback_cause: fromEnum(om),
          }),
          C_("attempt_errored", Al ?? null, null),
          (fc = Al),
          (Al = null),
          yield* ey({ responseUnfinished: !0 }),
          yield* $Le(),
          yield { type: "streaming_fallback_began", cause: om },
          yield* _ht(
            {
              requestId: Ske(fc),
              analyticsRequestId: vh(fc),
              cause: om,
              errorName: Ql,
              connectionCode: Nu,
              stall: Zg,
            },
            cg && (fp?.outlastedNonStreamingTimeout ?? !1),
          ))
        )
          return;
      } finally {
        if ((D1(), yP?.(v$, Jr?.chunks), Qh !== void 0)) rye(Qh);
      }
      (C_("stream_completed", Al ?? null, lm !== null ? Iu : null), yield* ey({ responseUnfinished: !1 }));
      break e;
    }
    if ((Nh?.settle({ kind: "ok" }, Al, dg?.id), uP !== void 0)) uP.ended = "completed";
  } catch (fallbackError) {
    if (
      (vgt(),
      yield* $Le(),
      C_(signal.aborted ? "aborted" : "attempt_errored", Al ?? null, null),
      fallbackError instanceof FallbackTriggeredError)
    )
      throw (
        retryBudget.reportHttpFailure(fallbackError.originalError, "useFallbackModel", {
          fallbackModelCouldHelp: fallbackError.reason !== "overloaded",
        }),
        Nh?.settle({ kind: "error", error: fallbackError }, Al),
        (k3 = !0),
        fallbackError
      );
    let pr = fallbackError instanceof CannotRetryError ? fallbackError.originalError : void 0,
      Os = (pr === void 0 ? "fail" : retryBudget.onWithRetryGaveUp(pr)) === "retryWithoutStreaming",
      La = fallbackError,
      Vl = !1;
    if (Os) {
      let Yl = (pr instanceof Ot ? pr.requestID : void 0) ?? "unknown";
      if (
        (logForDebugging("Streaming endpoint returned 404, falling back to non-streaming mode", {
          level: "warn",
        }),
        (dP = !0),
        (S3 = clock.now()),
        contextHintController?.strip(),
        logEvent("tengu_streaming_fallback_to_non_streaming", {
          model: telemetrySafeModelName(options.model),
          error: lit_2("404_stream_creation"),
          attemptNumber: p_,
          maxOutputTokens: BT,
          thinkingType: fromEnum(betas.type),
          request_id: vh(Yl),
          fallback_cause: lit_2("404_stream_creation"),
          any_stream_event_yielded: !1,
        }),
        logForDiagnosticsNoPII("info", "cli_nonstreaming_fallback_started"),
        logEvent("tengu_nonstreaming_fallback_started", {
          request_id: ye(Yl),
          model: telemetrySafeModelName(options.model),
          fallback_cause: lit_2("404_stream_creation"),
        }),
        RLe)
      )
        ymn("non_streaming");
      yield { type: "streaming_fallback_began", cause: "404_stream_creation" };
      try {
        if (
          ((fc = Al ?? (Yl !== "unknown" ? Yl : null)),
          yield* _ht(
            {
              requestId: Ske(Yl),
              analyticsRequestId: vh(Yl),
              cause: "404_stream_creation",
              errorName: null,
              connectionCode: null,
              stall: null,
            },
            !1,
          ))
        )
          return;
        if (((Vl = !0), uP !== void 0)) uP.ended = "completed";
      } catch (error) {
        if (error instanceof FallbackTriggeredError)
          throw (Nh?.settle({ kind: "error", error: error }, Al), (k3 = !0), error);
        La = error;
      }
    }
    if (!Vl) {
      if (ao && (La instanceof ToolSearchRefusedError || options.toolSearchRefusal !== void 0))
        cco(conversation);
      if (La instanceof ToolSearchRefusedError) throw (Ti?.splice(0, Ti.length), La);
      logForDebugging(
        `${Os ? "Non-streaming fallback also failed" : "Error in API request"}: ${errorMessage(La)}`,
        { level: "error" },
      );
      let Yl = La,
        errorModel = options.model;
      if (La instanceof CannotRetryError) ((Yl = La.originalError), (errorModel = La.retryContext.model));
      if (Yl instanceof Lf) {
        (Nh?.settle({ kind: "aborted" }, Os ? null : Al, Os ? void 0 : dg?.id), releaseStreamResources());
        return;
      }
      if (uP !== void 0 && isRequestTooLargeError_2(Yl)) uP.ended = "filtered_again";
      if (Yl instanceof Ot)
        extractQuotaStatusFromError(Yl, getRequestRouteKind(options), clock.now(), Yc, options.storageV5);
      let Wd = Al || (Yl instanceof Ot ? rqe(Yl.requestID || Yl.error?.request_id, Yl.headers) : void 0);
      (Nh?.settle({ kind: "error", error: Yl }, Wd),
        logAPIError({
          isLowPriority: Jh,
          dispatch: yb,
          error: Yl,
          model: errorModel,
          messageCount: messagesForAPI_2.length,
          messageTokens: tokenCountFromLastAPIResponse(messagesForAPI_2),
          durationMs: Math.max(0, Math.round(clock.monotonicNow() - monotonicNow_2)),
          durationMsIncludingRetries: Math.max(0, Math.round(clock.monotonicNow() - monotonicNow)),
          attempt: p_,
          requestId: Wd,
          clientRequestId: Ah,
          didFallBackToNonStreaming: dP,
          nonStreamingFallbackSkipped: Egt,
          observedResponse: dP ? void 0 : nk,
          queryTracking: options.queryTracking,
          querySource: options.querySource,
          accountMemoryKeys: f1,
          messageClientPlatform: options.messageClientPlatform,
          llmSpan: H5,
          fastMode: NI,
          previousRequestId: Ie,
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
        }));
      let ku = getAssistantMessageFromApiError(Yl, errorModel, {
          messages: messages,
          messagesForAPI: messagesForAPI_2,
          requestId: Wd,
        }),
        Np = {
          ...ku,
          ...(signal.aborted &&
            (ku.apiError === "connection_failed" || ku.apiError === "computer_slept") && {
              apiError: void 0,
            }),
          ...(Lae !== void 0 && Yl === Lae && !signal.aborted && { apiError: "stream_idle_timeout" }),
          perTurnEffort: EE,
          perTurnTiming: n$,
          ...(xgt && { streamWatchdogGaveUp: !0 }),
          ...((isNonFallbackError(Yl) ||
            _3e(Yl) ||
            isVerificationRequiredError(Yl) ||
            (Yl instanceof Ot && Yl.type === "billing_error")) && { resendCannotCure: !0 }),
        };
      if (U7(Yl) && !retryBudget.outOfApiAttempts()) return Np;
      (yield Np, releaseStreamResources());
      return;
    }
  } finally {
    if (Hi) onMainResponseEnd(HW, FE, Date.now());
    try {
      if (Qh !== void 0) rye(Qh);
    } catch (error) {
      logError(toError(error));
    }
    if ((endActivity("api_call", Sht), SLe(), flushMessageOutlines(options.querySource, options.agentId), T3))
      options.onRetryStatus?.(null);
    if (uP !== void 0)
      classifyAttemptOutcome(uP, {
        now: clock.monotonicNow(),
        stopReason: LI?.message.stop_reason ?? lm,
        aborted: signal.aborted,
        model: options.model,
        querySource: options.querySource,
        clientRequestId: dP ? void 0 : Ah,
      });
    if (
      (C_(signal.aborted ? "aborted" : "attempt_errored", Al ?? null, null),
      Nh?.settle(
        lm !== null && Al ? { kind: "ok" } : signal.aborted ? { kind: "aborted" } : { kind: "other_exit" },
        Al,
        dg?.id,
      ),
      releaseStreamResources(),
      LI)
    ) {
      let fallbackUsage = LI.message.usage;
      if (((Iu = mRe(EMPTY_USAGE, fallbackUsage)), (lm = LI.message.stop_reason), lm === "refusal"))
        logApiRefusal({
          model: resolvedModel,
          requestId: Al || void 0,
          querySource: options.querySource,
          effort: CC,
          fastMode: NI,
          attempt: p_,
          attribution: buildAttribution(
            options.querySource,
            options.spawnedBySkill,
            options.activeSkill,
            options.activeMcpServer,
            options.activeMcpTool,
          ),
          serverFallbackHop: !1,
          stopDetails: LI.message.stop_details ?? null,
          agentContext: options.agentContext,
        });
      let pr = Hae?.servedFallbackModel,
        Jr = pr !== void 0;
      if (!$E) recordServedModel(Bn(options.model), LI.message.model);
      let Os =
        Jr && Hae !== void 0
          ? fallbackMessagesCost(
              Hae.entries,
              { speed: Iu.speed, inferenceGeo: Iu.inference_geo, serverToolUse: Iu.server_tool_use },
              lm,
            )
          : calculateUSDCost(resolvedModel, Iu);
      Dae += addToTotalSessionCost(
        Os,
        Iu,
        Jr ? uJn(options.serverRefusalFallback?.model, pr) : options.model,
        options.querySource,
        CC,
        options.spawnedBySkill,
        options.activeSkill,
        options.activeMcpServer,
        options.activeMcpTool,
      );
    }
    if (dg !== void 0 || LI !== void 0) {
      if ((xT(), Hi && !k3)) forgetResponseBeforeCompaction();
    }
  }
  if (Al && Hi) setLastMainRequestId(Al, { messageId: Cm.at(-1)?.message.id ?? dg?.id, turnPosition: lt });
  if (Hi) setLastMainThreadContextTokens(totalTokensOf(Iu));
  if (Xa)
    recordConversationSize(ta, () => {
      let Wn = lazyTokenEstimate(),
        pr = totalTokensOf(Iu);
      return Number.isFinite(Wn) ? Math.max(Wn + Iu.output_tokens, pr) : pr || Wn;
    });
  if ((m7t(conversation, { isMainConversation: Hi }), DLe(), Fgt.served(), t$() && b3))
    logCacheDiagnosisReceived(b3, {
      requestId: Al,
      previousMessageId: nt,
      model: options.model,
      is1hCacheTTL: Tw === "1h",
      querySource: options.querySource,
      queryDepth: options.queryTracking?.depth,
    });
  let logMessageCount = messagesForAPI_2.length,
    logMessageTokens = tokenCountFromLastAPIResponse(messagesForAPI_2),
    A5n = isFirstPartyTelemetryBlocked() ? void 0 : safeRequestContentStats(messagesForAPI_2, options.model),
    wht = isFirstPartyTelemetryBlocked() ? void 0 : sentImageStats(messagesForAPI_2, F5),
    Tht = isFirstPartyTelemetryBlocked()
      ? void 0
      : requestPrefixStats(systemBlocks, allTools, getToolNameKinds(tools, extraToolSchemas)),
    x5n = Hi ? takeRefusalFallbackCarriedEffortEnd() : void 0;
  (options
    .getToolPermissionContext()
    .then((permissionContext) => {
      logAPISuccessAndDuration({
        isLowPriority: Jh,
        dispatch: yb,
        uncoveredTail: oc,
        model: Cm[0]?.message.model ?? dg?.model ?? options.model,
        preNormalizedModel: options.model,
        usage: Iu,
        start: monotonicNow_2,
        startIncludingRetries: monotonicNow,
        attempt: p_,
        messageCount: logMessageCount,
        messageTokens: logMessageTokens,
        requestId: Al ?? null,
        rawRequestBodyId: h_,
        accountMemoryKeys: f1,
        clientRequestId: dP ? void 0 : Ah,
        firstAttemptRequestId: fc ?? null,
        stopReason: lm,
        ttftMs: Iae,
        firstContentMs: dP ? null : (vLe ?? null),
        streamEventCount: dP ? void 0 : v$,
        queryOverheadMs: CLe,
        didFallBackToNonStreaming: dP,
        querySource: options.querySource,
        promptCacheTtl: E5 ? gW : void 0,
        promptCacheMessagesTtl: E5 && !options.skipMessageCacheMarkers && XF ? "5m" : void 0,
        messageClientPlatform: options.messageClientPlatform,
        headers: ALe,
        extraEventFields: { ...{}, ..._7t(conversation) },
        costUSD: Dae,
        isDefaultModel: Hi ? options.isDefaultModel : void 0,
        defaultModel: Hi ? options.defaultModel : void 0,
        ...Ca(yS),
        carriedEffort: Li,
        carriedEffortEnded: x5n,
        queryTracking: options.queryTracking,
        permissionMode: permissionContext.mode,
        proactivityLevel: options.proactivityLevel,
        newMessages: Cm,
        requestContentTelemetry: A5n,
        sentBody: wht && { ...wht, threadType: Aae },
        requestPrefixTelemetry: Tht && {
          ...Tht,
          systemPromptSource: fromEnumOpt(options.systemPromptSource),
          snapshotHash: options.systemPromptSnapshotHash,
        },
        llmSpan: H5,
        globalCacheStrategy: Vi,
        requestSetupMs: monotonicNow_2 - monotonicNow,
        attemptStartTimes: B5,
        fastMode: NI,
        previousRequestId: Ie,
        betas: hb,
        thinkingPrefixMismatchBehavior: g1,
        echoWireToolInputs: Xn,
        effort: yS,
        turnOrigin: Bs,
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
    .catch((Wn) => logError(withTelemetryMessage(toError(Wn), "api success logging failed"))),
    releaseStreamResources());
}
/**
 * 中止尚未结束的 SDK 流（释放连接）。
 */
//@ chunk-e6aww6q8.js:2799701-2799795 fingerprint = cleanupStream (1)
function cleanupStream(stream) {
  if (!stream) return;
  try {
    if (!stream.controller.signal.aborted) stream.controller.abort();
  } catch {}
}
/**
 * 1024：中途 system 消息缓存代理判定阈值（cache read 小于此值）。
 */
//@ chunk-e6aww6q8.js:2802858-2802871 affinity
var MIDCONV_CACHE_PROXY_READ_THRESHOLD = 1024;
/**
 * 给 API 消息加 cache_control 断点：kun() 选出标记位置（最后一条消息、fork 点、api_system 等），记 tengu_api_cache_breakpoints，再把内部消息转成 MessageParam（user/assistant/api_system）。
 */
//@ chunk-e6aww6q8.js:2802871-2804890 callgraph-fingerprint = addCacheBreakpoints (0.234)
function addCacheBreakpoints(
  e,
  n,
  r,
  s = !1,
  h,
  y = !1,
  S = getAPIProvider(),
  w = !1,
  L = !1,
  G = !1,
  q,
  Z,
  Se,
  ke = !1,
  we = !0,
  Ee,
) {
  let Ae = areExperimentalBetasDisabled(),
    CLAUDE_CODE_SIMULATE_PROXY_USAGE = env.CLAUDE_CODE_SIMULATE_PROXY_USAGE,
    Me = !y && !Ae && !CLAUDE_CODE_SIMULATE_PROXY_USAGE,
    We = isStellarDriftEnabled(),
    ze = !w && DGt(),
    lt = pickCacheMarkerIndices({
      messages: e,
      enablePromptCaching: n,
      skipCacheWrite: s,
      forkPointUuid: h,
      canMarkApiSystem: Me,
      forkCachePin: ze || (ke && !w),
      whitespaceTextUnstampable: We,
      topLevelCacheControl: L,
      isForkPinStepBackEnabled: () => ze && yun(),
      divergesAtMessageId: w ? void 0 : Z,
      parentReplyId: Ee?.isMarkWanted === !0 && !w ? Ee.parentReplyId : void 0,
      tailAuditTerms: {
        proxyDemoted: y,
        experimentalBetasDisabled: Ae,
        simulateProxyUsage: CLAUDE_CODE_SIMULATE_PROXY_USAGE,
        skipMessageCacheMarkers: Se?.skipMessageCacheMarkers ?? !1,
      },
    }),
    {
      markerIndices: markerIndices,
      forkPointPinned: forkPointPinned,
      parentPromptEndMarked: parentPromptEndMarked,
      auditTail: auditTail,
    } = lt;
  if (Se !== void 0)
    try {
      Se.report(auditTail());
    } catch (error) {
      logError(error);
    }
  if (we)
    logEvent("tengu_api_cache_breakpoints", {
      totalMessageCount: e.length,
      cachingEnabled: n,
      skipCacheWrite: s,
      forkPointPinned: forkPointPinned,
      markerCount: markerIndices.size,
      ...(Ee !== void 0 &&
        !w && {
          querySource: agentTypeForTelemetry(Ee.querySource),
          ...(Ee.isMarkWanted && { parentPromptEndMarked: parentPromptEndMarked }),
        }),
    });
  let yt;
  try {
    yt = liftEphemeralReminders(e, G);
  } catch (error) {
    logError(error);
  }
  let mapped = (yt?.messages ?? e).map((At, It) => {
    let Yt = markerIndices.has(It);
    if (At.type === "user") return userMessageToMessageParam(At, Yt, n, r);
    if (At.type === "api_system") {
      let qt = Yt && n && Me,
        markerIndex = At.ephemeralSuffix ? [{ type: "text", text: At.ephemeralSuffix }] : [];
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
              qt ? getCacheControl({ ttl: r }) : void 0,
              At.toolRemovals ?? [],
              At.toolDefinitions,
            ),
            ...markerIndex,
          ],
          ...(At.outputConfig && { output_config: At.outputConfig }),
        };
      let rn = sD(At.message.content, At.ephemeralSuffix ?? "");
      return {
        role: "system",
        content: qt
          ? [
              { type: "text", text: At.message.content, cache_control: getCacheControl({ ttl: r }) },
              ...markerIndex,
            ]
          : rn || [],
        ...(At.outputConfig && { output_config: At.outputConfig }),
      };
    }
    return assistantMessageToMessageParam(At, Yt, n, r, We);
  });
  if (yt !== void 0)
    try {
      let At = buildWireWithClearAt(mapped, yt);
      return (q?.push(...At.wireIndexOf), At.wire);
    } catch (error) {
      logError(error);
      let dropBase = yt.dropBase,
        Yt = [];
      return (
        mapped.forEach((msg, index) => {
          if ((q?.push(Yt.length), !dropBase.has(index))) Yt.push(msg);
        }),
        q?.push(Yt.length),
        Yt
      );
    }
  return (q?.push(...mapped.keys(), mapped.length), mapped);
}
/**
 * 把 system 提示词数组切成带缓存范围的块（s2o），每块转成 {type:"text",text,cache_control?}；cacheScope=global 时带 scope:"global"。
 */
//@ chunk-e6aww6q8.js:2805133-2805379 fingerprint = buildSystemPromptBlocks (0.617)
function buildSystemPromptBlocks(systemPrompt, enablePromptCaching, options) {
  return splitSysPromptPrefix(systemPrompt, {
    skipGlobalCacheForSystemPrompt: options?.skipGlobalCacheForSystemPrompt,
  }).map((block) => ({
    type: "text",
    text: block.text,
    ...(enablePromptCaching &&
      block.cacheScope !== null && {
        cache_control: getCacheControl({
          scope: options?.scopeRefused ? void 0 : block.cacheScope,
          ttl: options?.cacheTtl,
        }),
      }),
  }));
}
/**
 * 小模型查询：按小模型 fallback 链依次尝试，只在 permission_denied 时换下一个。
 */
//@ chunk-e6aww6q8.js:2805379-2805821 layout
async function queryHaikuWithFallback(e) {
  let n = unlessManagedDeniedModel(getSmallFastModel()),
    r =
      e.options.fallbackModel === void 0 &&
      !sessionHasOwnFallback() &&
      env.ANTHROPIC_SMALL_FAST_MODEL === void 0 &&
      !(nonEmptyOrUndefined(env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION) && hasDedicatedSmallFastModel())
        ? buildAvailabilityFallbackChain(n, void 0)
        : [],
    s = 1;
  while (s < r.length && resolveFallbackModel(r[s - 1], r[s], B4r).accessFallbackModel !== void 0) s++;
  let h = r.length > 0 ? r.slice(0, s) : [n];
  for (let y = 0; ; y++)
    try {
      return await queryWithModel(e, h[y], h[y + 1]);
    } catch (error) {
      if (
        !(error instanceof FallbackTriggeredError) ||
        error.reason !== "permission_denied" ||
        y + 1 >= h.length
      )
        throw error;
    }
}
/**
 * 单轮无工具辅助查询（指定模型、可带 fallback）：用 VCR 包装，thinking 机械关闭，默认不开缓存。
 */
//@ chunk-e6aww6q8.js:2805821-2806412 callgraph-witnessed = queryWithModel (0.749)
async function queryWithModel(
  {
    systemPrompt: systemPrompt = asSystemPrompt([]),
    userPrompt: userPrompt,
    outputFormat: outputFormat,
    signal: signal,
    options: { helperEffortFor: h, ...y },
  },
  S,
  w,
) {
  return (
    await withVCR(
      [
        createUserMessage({ content: systemPrompt.map((text) => ({ type: "text", text: text })) }),
        createUserMessage({ content: userPrompt }),
      ],
      async () => {
        let messages = [createUserMessage({ content: userPrompt })];
        return [
          await queryModelWithoutStreaming({
            messages: messages,
            systemPrompt: systemPrompt,
            thinkingConfig: { type: "disabled", mechanical: !0 },
            tools: [],
            signal: signal,
            options: {
              ...y,
              ...h?.(S),
              stickyBetas: y.stickyBetas ?? forkStickyBetaLatches(getStickyBetas()),
              agentContext: y.agentContext,
              model: S,
              fallbackModel: w ?? y.fallbackModel,
              enablePromptCaching: y.enablePromptCaching ?? !1,
              outputFormat: outputFormat,
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
/**
 * 小模型（Haiku）辅助查询：单条用户消息、无工具、thinking 默认机械关闭，走 queryModelWithoutStreaming，VCR 可录放。
 */
//@ chunk-e6aww6q8.js:2806412-2806944 fingerprint = queryHaiku (0.838)
async function queryHaiku({
  systemPrompt: systemPrompt = asSystemPrompt([]),
  userPrompt: userPrompt,
  outputFormat: outputFormat,
  signal: signal,
  options: options,
  thinkingConfig: thinkingConfig = { type: "disabled", mechanical: !0 },
}) {
  return (
    await withVCR(
      [
        createUserMessage({ content: systemPrompt.map((text) => ({ type: "text", text: text })) }),
        createUserMessage({ content: userPrompt }),
      ],
      async () => {
        let messages = [createUserMessage({ content: userPrompt })];
        return [
          await queryModelWithoutStreaming({
            messages: messages,
            systemPrompt: systemPrompt,
            thinkingConfig: thinkingConfig,
            tools: [],
            signal: signal,
            options: {
              ...options,
              stickyBetas: options.stickyBetas ?? forkStickyBetaLatches(getStickyBetas()),
              agentContext: options.agentContext,
              enablePromptCaching: options.enablePromptCaching ?? !1,
              outputFormat: outputFormat,
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
/**
 * stop_reason 为 max_tokens / model_context_window_exceeded 时生成 API 错误消息（提示 CLAUDE_CODE_MAX_OUTPUT_TOKENS）。
 */
//@ chunk-e6aww6q8.js:2806944-2807696 layout
function getMaxTokensStopMessage(e, n, r, s = !1) {
  if (e === "max_tokens")
    return (
      logEvent("tengu_max_tokens_reached", { max_tokens: n }),
      createApiErrorMessage({
        content: s
          ? `${API_ERROR_MESSAGE_PREFIX}: Claude's response exceeded the ${n} output token maximum for a request sent without streaming. The CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable cannot raise this limit.`
          : `${API_ERROR_MESSAGE_PREFIX}: Claude's response exceeded the ${n} output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable.`,
        apiError: "max_output_tokens",
        error: "max_output_tokens",
      })
    );
  if (e === "model_context_window_exceeded")
    return (
      logEvent("tengu_context_window_exceeded", { max_tokens: n, output_tokens: r }),
      createApiErrorMessage({
        content: `${API_ERROR_MESSAGE_PREFIX}: The model has reached its context window limit.`,
        apiError: "max_output_tokens",
        error: "max_output_tokens",
      })
    );
  return;
}
/**
 * 非流式回退时把 max_tokens 限到上限，并把 thinking.budget_tokens 限到 max_tokens-1。
 */
//@ chunk-e6aww6q8.js:2807696-2807918 fingerprint = adjustParamsForNonStreaming (1)
function adjustParamsForNonStreaming(params, maxTokensCap) {
  let cappedMaxTokens = Math.min(params.max_tokens, maxTokensCap),
    adjustedParams = { ...params };
  if (adjustedParams.thinking?.type === "enabled" && adjustedParams.thinking.budget_tokens)
    adjustedParams.thinking = {
      ...adjustedParams.thinking,
      budget_tokens: Math.min(adjustedParams.thinking.budget_tokens, cappedMaxTokens - 1),
    };
  return { ...adjustedParams, max_tokens: cappedMaxTokens };
}
/**
 * 消息上布尔 resumable 字段（未完成思考可续写）。
 */
//@ chunk-e6aww6q8.js:2807918-2808007 layout
function getResumableFlag(e) {
  return "resumable" in e && typeof e.resumable === "boolean" ? e.resumable : void 0;
}
//@ chunk-e6aww6q8.js:2808007-2808146 placement
function assertStreamPart(e, n, r) {
  if (e) return;
  throw (
    logEvent("tengu_streaming_error", { error_type: r, part_type: fromEnum(n.type), part_index: YEe(n) }),
    new StreamMalformedEventError("unreadable")
  );
}
//@ chunk-e6aww6q8.js:2808146-2808222 placement
function YEe(e) {
  return "index" in e && typeof e.index === "number" ? e.index : void 0;
}
//@ chunk-e6aww6q8.js:2808222-2808342 placement
function isRestartedBlock({
  previous: previous,
  closedContentBlocks: closedContentBlocks,
  started: started,
}) {
  return (
    previous !== void 0 &&
    closedContentBlocks.has(previous) &&
    "id" in previous &&
    "id" in started &&
    previous.id === started.id
  );
}
//@ chunk-e6aww6q8.js:2808342-2808410 placement
function okr(e, n, r) {
  try {
    e.set(n, r.monotonicNow());
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2808410-2808545 placement
function elapsedSinceMs(e, n, r) {
  try {
    let s = e.get(n);
    if (s === void 0) return;
    return Math.max(1, Math.round(r.monotonicNow() - s));
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-e6aww6q8.js:2808545-2808554 placement
setAdvisorBaseUrlGetter(getApiBaseUrl);
//@ chunk-r1wk8q25.js:12135-12238 placement
var UPGRADE_RELAY_USAGE_LIMIT = "upgrade_relay_usage_limit",
  UPGRADE_RELAY_REQUEST_CLASS = "upgrade_relay_request_class",
  UPGRADE_RELAY_INHERITED_TOOLS = "upgrade_relay_inherited_tools";
/**
 * 非流式回退请求超时：15s，设置 API_TIMEOUT_MS 时取其一半与 15s 的较小值。
 */
//@ chunk-r1wk8q25.js:12389-12479 fingerprint = getNonstreamingFallbackTimeoutMs (0.768)
function getNonstreamingFallbackTimeoutMs() {
  let API_TIMEOUT_MS = env.API_TIMEOUT_MS;
  return API_TIMEOUT_MS !== void 0 && API_TIMEOUT_MS > 0
    ? Math.min(NON_STREAMING_FALLBACK_TIMEOUT_MS, Math.floor(API_TIMEOUT_MS / 2))
    : NON_STREAMING_FALLBACK_TIMEOUT_MS;
}
/**
 * 构造请求 system：计费/归因头、额外前缀与原 system 依次拼接（去掉空项），并记录 API 前缀。
 */
//@ chunk-w5ndchqs.js:3172-3418 placement
function buildSystemWithAttribution(systemPrompt, prefix, options) {
  let s = getAttributionHeader(
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
    ),
    d = asSystemPrompt([s, prefix, ...systemPrompt].filter(Boolean));
  return (logAPIPrefix(d), d);
}
/**
 * 请求体 metadata：user_id 为 JSON 字符串 {device_id, account_uuid, session_id, parent_session_id?, tk?}，可合并 CLAUDE_CODE_EXTRA_METADATA（超长时丢弃附加字段）。
 */
//@ chunk-w5ndchqs.js:5496-6185 fingerprint = getAPIMetadata (0.694)
function getAPIMetadata({ agentContext: e, servedSessionMode: n } = {}) {
  let r = {},
    extraStr = process.env.CLAUDE_CODE_EXTRA_METADATA;
  if (extraStr) {
    let parsed = safeParseJSON(extraStr, !1);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) r = sanitizeExtraMetadata(parsed);
    else
      logForDebugging(`CLAUDE_CODE_EXTRA_METADATA env var must be a JSON object, but was given ${extraStr}`, {
        level: "error",
      });
  }
  let d = {},
    m,
    h = getParentSessionId(),
    y = isEnvTruthy(env.CLAUDE_CODE_REMOTE) && isFirstPartyProvider() ? turnAttributionKeyFor(e) : void 0,
    w = {
      ...(m && { ti: m }),
      device_id: getOrCreateUserID(),
      account_uuid:
        (isEnvTruthy(env.CLAUDE_CODE_REMOTE) && env.CLAUDE_CODE_ACCOUNT_UUID) ||
        getAuthenticatedAccountInfo()?.accountUuid ||
        getOauthAccountInfo()?.accountUuid ||
        "",
      session_id: getSessionId(),
      ...(h && { parent_session_id: h }),
      ...(y && { tk: y }),
    },
    L = { ...d, ...r, ...w };
  if (
    (Object.keys(r).length > 0 || Object.keys(d).length > 0) &&
    jsonStringify(L).length > MAX_METADATA_USER_ID_LENGTH
  ) {
    if (((L = { ...d, ...w }), jsonStringify(L).length > MAX_METADATA_USER_ID_LENGTH)) L = w;
  }
  return { user_id: jsonStringify(L) };
}
/**
 * 把内部 usage 规整成 SDK/外部格式：缓存细分、server_tool_use 只保留 web_search、speed 只认 fast，其余置 null。旧版名 updateUsage 为错配。
 */
//@ chunk-1ny7cxrt.js:1377013-1377628 fingerprint = updateUsage (0.876)
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
/**
 * 控制请求子类型在白名单内时返回 {subtype, requestId}。旧版名 getPreviousRequestIdFromMessages 为错配。
 */
//@ chunk-1qpz7qcd.js:30432-30552 fingerprint = getPreviousRequestIdFromMessages (0.653)
function getControlRequestInfo(messages) {
  let r = getControlRequestSubtype_2(messages);
  if (r === void 0 || !MUTATING_CONTROL_SUBTYPES.has(r)) return;
  return { subtype: r, requestId: messages.payload ? getControlRequestSubtype(messages.payload) : void 0 };
}
/**
 * text/image/document：contentBlockStableKeys 不为这几类生成键。旧版名 isMedia 为错配。
 */
//@ chunk-3xb70ww4.js:2887-2932 fingerprint = isMedia (1)
var KEYLESS_BLOCK_TYPES = new Set(["text", "image", "document"]);
/**
 * 主循环模型的 max_tokens：模型默认值，可用 CLAUDE_CODE_MAX_OUTPUT_TOKENS 在模型上限内调整。
 */
//@ chunk-aepeg2w5.js:474942-475090 fingerprint = getMaxOutputTokensForModel (1)
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
  _Jn,
  promptIdForRequest,
  getPromptCachingEnabled,
  isOneHourCacheTtl,
  verifyApiKey,
  queryHaikuWithFallback,
  Qve,
  x3s,
  P3s,
  computeDeclaredToolSet,
  KEYLESS_BLOCK_TYPES,
  toSdkUsage,
  getControlRequestInfo,
  getCacheControl,
  getExtraBodyParams,
  queryModelWithoutStreaming,
  getMaxOutputTokensForModel,
  E8s,
  isInvalidEffortError,
  queryModelWithStreaming,
  isRealApiResponse,
  should1hCacheTTL,
  isMidConvSystemForced,
  notifyPerTurnEffortInactive,
  logUnrecognizedModel,
  yV,
  learnedEffortCap,
  applyEffortToOutputConfig,
  getDispatchVersion,
  V2P,
  ANTHROPIC_DISPATCH_ID,
  Jve,
  F9e,
  getNonstreamingFallbackTimeoutMs,
  UPGRADE_RELAY_USAGE_LIMIT,
  UPGRADE_RELAY_REQUEST_CLASS,
  UPGRADE_RELAY_INHERITED_TOOLS,
  DGt,
};
