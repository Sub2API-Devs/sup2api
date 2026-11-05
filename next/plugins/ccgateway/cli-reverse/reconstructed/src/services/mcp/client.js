/**
 * services/mcp/client.ts
 *
 * 并入已有模块：MCP 客户端
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/client.ts
 * pieces: chunk-0cf4tfjz.js (1), chunk-4wmswyss.js (4), chunk-5xgkngpb.js (21), chunk-br8c6c8g.js (2), chunk-czq1j3j2.js (1), chunk-dh16zjm4.js (1), chunk-eeh1dqm6.js (3), chunk-fmy4vc7c.js (5), chunk-h44h5gdv.js (79), chunk-sywnjtqb.js (216)
 * attribution: fingerprint 21, placement 273, layout 35, callgraph-fingerprint 2, callgraph-witnessed 1, file-local 1
 */
import { createHash, randomUUID } from "crypto";
import { dirname } from "path";
import { pathToFileURL } from "url";
import { Readable } from "stream";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedFeatureErrorCodeForTelemetry,
  errorMessage,
  getErrnoCode,
  sanitizedErrorClassNameForTelemetry,
  AbortError,
  toError,
  isAbortError,
} from "../../utils/errors.js";
import { getPlatform } from "../../utils/platform.js";
import { env } from "../../utils/env.js";
import {
  getMcpClientsFromAccessor,
  getRootSession,
  getToolsMachine,
  getOriginalCwdOrNull,
  isDiskless,
  getSessionId,
  getProjectConfigRoot,
  getProjectRoot,
  getConnectedClientWiring,
  getEnsureConnectedClient,
  setEnsureConnectedClient,
  getPermissionPromptToolName,
  getTeammateAgentId,
  getIsNonInteractiveSession,
  isPrintInputClosed,
  isSingleShotPrintSession,
} from "../../bootstrap/state.js";
import { CLAUDE_ARTIFACTS, REMOTE_DEVICES, officeBridgeListingState } from "./firstPartyServerIds.js";
import { hasLiveState, getLiveState } from "../liveReplica/liveReplica.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../analytics/growthbook.js";
import { findServersByName, CLAUDEAI_SERVER_PREFIX } from "./normalization.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import {
  firstLineOf,
  urlPatternToRegex as urlPatternToRegex_2,
  truncateToLength,
  plural,
} from "../../utils/stringUtils.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../../utils/computerUse/common.js";
import {
  registerCliOwnedConfig,
  getCliOwnedState,
  runBeforeRequestHook,
  resolveBearerTokenFor,
  withheldBearerRefusalFor,
  cliOwnedRequestHeaders,
  isCredentialRequestHeader,
  notifyResponseObserver,
  shouldResendRequest,
  hasCliOwnedBearer,
  isCliOwnedConfig,
} from "./cliOwnedClients.js";
import { READ_ONLY_CU_ACTIONS } from "../../utils/computerUse/toolRendering.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import {
  safeOrigin,
  ccrProxyTargetHost,
  isCcrInjectedMcpUrl,
  isCcrMcpPath,
  isSameOriginAsCcr,
} from "./ccrMcpUrls.js";
import {
  getLoggingSafeMcpBaseUrl,
  isFileUploadServer,
  buildMcpToolPermissionOverrides,
  FILE_UPLOAD_TOOLS,
  ANTHROPIC_HOSTASKSPERUPLOADEDFILE,
} from "./utils.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  MAX_STRUCTURED_RESULT_CHARS,
  MAX_CALL_MARK_CHARS,
  CLAUDECODE_CALLMARK,
  BEFORE_HANDLER,
  sanitizeCallMark,
  INTERRUPTED_CALL_NOTICE,
  describeUnansweredCall,
  QUESTION_UNANSWERED_CODE,
  ANSWER_STREAM_GRACE_MS_2,
  MCP_CALL_UNANSWERED,
  CALL_OUTCOME_UNKNOWN_NOTICE,
  QUESTION_UNANSWERED_TEXT,
  MCP_QUESTION_UNANSWERED,
  MCP_CALL_NOT_SENT_AGAIN,
} from "./mcpCallConstants.js";
import { logEvent } from "../analytics/index.js";
import {
  loggableMcpToolName,
  toolNameForTelemetry,
  isToolDetailsLoggingEnabled,
  THIRD_PARTY,
  restrictRemoteRepoCalls,
  sanitizeVersion,
  filterRemoteRepoTools,
  isMcpServerLoggableInAnalytics,
  isRunnerDynamicServer,
  isOwnCcrMcpServer,
  isOwnArtifactMcpTool,
  markMcpServerLoggable,
} from "../analytics/metadata.js";
import {
  mcpNameForAnalytics_GATE_EVALUATED,
  fromEnum,
  lit,
  fromEnumOpt,
  fromNumber,
} from "../analytics/safeMetadata.js";
import { logMCPDebug, logMCPError, keepsMCPDebug, logError } from "../../utils/log.js";
import { isDiscoveryCacheOn, isDiscoveryCacheUsable, isUnresolved } from "./mcpAccountKey.js";
import { decorateMcpTools, withDisplayName, dynamicServerConnectorId } from "./mcpToolDecoration.js";
import { identityId, identityId2 } from "../../types/ids.js";
import {
  SdkHttpError,
  SdkErrorCode,
  ProtocolError,
  SdkError,
  ProtocolErrorCode,
  isJSONRPCRequest,
  isJSONRPCErrorResponse as isJSONRPCErrorResponse_2,
  isInitializeMessage,
  isInitializedNotification,
  createFetchWithInit,
  isJSONRPCResultResponse,
  OAuthError,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import {
  isListAuthError_2,
  isClaudeAiBearerRejectedError_2,
  isListAuthError,
  isClaudeAiBearerRejectedError,
} from "./listAuthError.js";
import {
  IssuerEchoCrossOriginError,
  usesNonOAuthAuth,
  hasStoredRefreshToken,
  isDesignMcpUrl,
  configHasAuthorizationHeader,
  isFirstPartyMcpUrl,
  rethrowRedactedFetchError,
  describeErrorBrief,
  hasAuthorizationHeader,
  ClaudeAuthProvider_2,
  wrapFetchWithStepUpDetection_2,
  redactHeaders,
  describeConnectError,
  rethrowRedactedConnectError,
  performMCPOAuthFlow_2,
  clearMcpOAuthStubIfTokenless_2,
  redactSensitiveUrlParams,
  ClaudeAuthProvider,
  wrapFetchWithStepUpDetection,
  clearMcpOAuthStubIfTokenless,
} from "./auth.js";
import {
  HttpBodyOverflowError_2,
  createBoundedFetch,
  BoundedStdioClientTransport,
  StdoutOverflowError_2,
  MCP_BODY_LIMIT,
  STOPPED_READING_NOTE_2,
} from "./boundedTransports.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import {
  readNeedsAuthCache,
  getConnectionCache,
  needsAuthCacheSpace,
  needsAuthCachePath,
  clearAuthCacheRead,
  memoizeWithExternalCache,
  AUTH_MESSAGES,
  memoizeWithLRU,
  hasLapsedCcrSignIn,
  mcpAuthToolsFor,
} from "./needsAuthCache.js";
import {
  isCcrHostedConfig,
  isWithdrawnBuiltinPluginServer,
  withdrawnBuiltinPluginServerError,
  isMcpServerBlockedAtConnectTime,
  isMcpServerDisabled,
  isMcpDialBlockedByPolicy,
  getAllMcpConfigs,
} from "./config.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getFileReader } from "../../utils/fileStore.js";
import {
  noteIdentityChanged,
  bumpIdentityEpoch,
  isCurrentIdentityEpoch,
  identityEpoch,
  getMcpIdentitySnapshot,
} from "./identityChange.js";
import { retainCacheKeys } from "../../utils/memoize.js";
import { parsePluginIdentifier_2, parsePluginIdentifier } from "../../utils/plugins/pluginIdentifier.js";
import {
  isAnthropicPluginSource,
  getTelemetryPluginScope,
  pluginIdHash,
  buildPluginSourceFields,
  buildPluginEventFieldsFromId,
  recordPluginUsage,
} from "../../utils/telemetry/pluginTelemetry.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { ZodError } from "../../../vendor/zod/v4/classic/errors.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  flushDiscoveryCache,
  deleteDiscoveryCache,
  recordPresentedHeaderSecrets,
  clearDiscoveryPathMemo,
  writeDiscoveryCache,
  mergeDiscoveryTools,
  isDiscoveryCacheEligible,
  isCacheableServer,
  cacheGrantLeg,
  readDiscoveryCache,
  recordRefreshFailureStrike,
  acquireDiscoveryRefreshLock,
} from "./discoveryCache.js";
import { mcpSdkGeneration } from "./mcpSdkGeneration.js";
import {
  UnauthorizedError as UnauthorizedError_2,
  StreamableHTTPClientTransport as StreamableHTTPClientTransport_2,
  SSEClientTransport as SSEClientTransport_2,
  Client as Client_2,
  SseError as SseError_2,
} from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import {
  recordTokenlessRejection,
  handleRejectedToken,
  connectWithSignedOutFallback,
  shouldTryTokenless,
  isSignedOutFallbackEnabled,
} from "./signedOutFallback.js";
import { sanitizeErrorDetail, normalizeMcpServerName } from "../api/deferredToolsState.js";
import { redactMcpErrorDetail, describeMcpServerOrigin } from "./mcpServerOrigin.js";
import {
  stripRedirectLocation,
  startClockSnapshot,
  wrapFetchSkipListenGet,
  isSereneTeapotEnabled,
  NO_OP_SCHEMA_VALIDATOR,
  formatConnectElapsed,
  NOTHING_SENT_ERROR_CODES,
  trackToolCallSends,
  closeStdioServer,
  suspendedConnectMessage,
  CONNECT_SUSPENDED,
  redialAfterSuspend,
  oauthAccountIdentity,
  createListChangedRefetcher,
  withOverlapSlots,
  memoryChainMeta,
  rememberMemoryChain,
  wireFileInputs,
  contentOverStructuredResult,
  didCallRunNothing,
} from "./connectionLifecycle.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import {
  getPresentedCredentialLog,
  setEraResolver,
  hasAccountResolver,
  setAccountResolver,
  isRemoteMcpTransport,
} from "./discoveryIdentity.js";
import { getCurrentCallId, X_CCR_TURN_ID } from "./ccrTurnId.js";
import {
  objectSchema,
  stringSchema,
  literal,
  array,
  record,
  unknown,
  looseObject,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../utils/json.js";
import { shortHash } from "../../utils/shortHash.js";
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokensAsync,
  getClaudeAIOAuthTokens,
  handleOAuth401Error,
  readFreshOAuthAccessToken,
} from "../../utils/auth.js";
import {
  getScaffoldResolver,
  noteScopeExpansion,
  peekScopeExpansionNotice,
  FirstPartyDesignNeedsConsentError,
  checkConsent,
} from "./firstPartyDesignConsent.js";
import {
  MEMBERSHIP_METHODS,
  clearApprovedPlans,
  clearPlansForProject,
  clearVerifiedProjectGrant,
  markRecardProject,
  DesignGateState,
} from "./designPlanGate.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { isFirstPartyProvider, shouldPropagateTraceContext } from "../../utils/model/providers.js";
import { getMCPUserAgent } from "../../utils/http.js";
import {
  SUPPORTED_IMAGE_TYPES_4,
  sniffImageMediaType,
  SUPPORTED_IMAGE_TYPES_2,
} from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import {
  getActiveSpanId,
  turnTraceContextsOf,
  isPerfettoTracingEnabled,
  truncateContentForTelemetry,
  withToolExecutionSpan,
} from "../../utils/telemetry/sessionTracing.js";
import {
  requestTimeoutForBody,
  proxyFillsListing,
  fileReferenceToolToFill,
  wrapFileReferenceTool,
  filledCallRequestMeta,
  fileReferenceToolForRecords,
  withholdsFileReferenceArguments,
  withholdsFileReferenceErrorText,
  withheldFileReferenceErrorForLog,
} from "./fileReference/wrapFileReferenceTool.js";
import { pluginToolStagingRoot } from "../../utils/tempDir.js";
import { logForDebugging } from "../../utils/debug.js";
import { getAnnouncedDirectories } from "../../utils/announcedDirectories.js";
import { AjvJsonSchemaValidator } from "../../../vendor/@modelcontextprotocol/client/dist/ajvProvider-BIwGVY6G.mjs";
import {
  clientCapabilitiesFor,
  stripTasksCapability,
  discoverProjectionPrior,
  clientCapabilitiesForSdk,
  clientCapabilitiesWithElicitation,
} from "./mcpClientCapabilities.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  getCachedDiscoverResult,
  isStatelessClaudeAiProxy_2,
  answerGetStreamLocally_2,
  getCachedInitializeResult_2,
  getLocalDiscoverAnswer,
  answerHandshakeLocally_2,
  trackCallInProgress,
  incrementCallsInProgress,
  decrementCallsInProgress,
} from "./claudeaiCachedInit.js";
import {
  getDiscoverVerdictKey,
  forgetDiscoverVerdict,
  isRememberedLegacyPeer,
  discoverErrorCode,
  wrapFetchDetectDiscoverMethodNotFound,
  createHandshakeTrace,
  wrapFetchWithHandshakeTrace,
  resetHandshakeTrace,
  markConnectEnded,
  handshakeTraceTelemetry,
  rememberLegacyPeer,
  armFirstToolsListReport,
  reportFirstToolsList,
} from "./serverDiscover.js";
import { isStdioConfig, isClaudeAiProxyServer } from "./builtinServerNames.js";
import {
  setAheadPage,
  takeAheadPage,
  armAheadExpiry,
  noteListChangedAhead_2,
  armToolsListAhead,
  toolsListAheadFields,
  markHandlerRegistered,
  noteListChangedAhead,
  takeAheadPage_2,
  noteFirstPageMark,
} from "./toolsListAhead.js";
import { armRequestTimeout } from "../api/errors.js";
import { systemClock, sleep, withDeadline } from "../../utils/sleep.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { getMcpServerHeaders } from "./headersHelper.js";
import { mcpProxyFetchOptions } from "./agentProxyFallback.js";
import { redactUrlSecrets } from "../../utils/urlRedaction.js";
import { getWebSocketTLSOptions } from "../../utils/mtls.js";
import { getWebSocketProxyUrl, getProxyFetchOptions } from "../../utils/proxy.js";
import { WebSocketTransport } from "../../utils/mcpWebSocketTransport.js";
import {
  JSONRPCMessageSchema as JSONRPCMessageSchema_2,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListPromptsResultSchema,
  ElicitRequestURLParamsSchema as ElicitRequestURLParamsSchema_2,
  ListToolsResultSchema,
  ToolSchema as ToolSchema_2,
  ImplementationSchema as ImplementationSchema_2,
  ServerCapabilitiesSchema as ServerCapabilitiesSchema_2,
  PromptSchema as PromptSchema_2,
  ResourceSchema as ResourceSchema_2,
  ResourceTemplateSchema as ResourceTemplateSchema_2,
  CompatibilityCallToolResultSchema as CompatibilityCallToolResultSchema_2,
  ResultSchema,
  ElicitRequestParamsSchema,
  InitializeResultSchema,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { redactUrlsInText } from "../../utils/redaction/urlRedaction.js";
import { hostedWorkerFetch } from "./hostedWorkerTrust.js";
import { issuerKey_3 } from "./xaaIdpLogin.js";
import { getRequestTimingStore } from "../tools/toolExecution.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { isClaudeInChromeMCPServer } from "../../utils/claudeInChrome/common.js";
import { BLOCKED_BY_POLICY_REASON, DISABLED_IN_MCP_REASON } from "./redactMcpErrors.js";
import { assertProgramLaunchAllowed } from "../../utils/disklessSession.js";
import {
  shouldUseMcpAllowlistEnv,
  agentProxyEnv,
  subprocessEnv,
  dropEmptyBedrockBearer,
} from "../../utils/subprocessEnv.js";
import { getDefaultEnvironment_2 } from "../../../vendor/@modelcontextprotocol/client/dist/stdio.mjs";
import { runWithPluginWriteScope } from "../../utils/plugins/pluginScopedWrite.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { isMcpServerBackingToolHook, releaseMcpToolCgroup } from "../../utils/hooks/mcpToolHookCgroup.js";
import { wrapCommandInCgroup, parkPendingPid } from "../../utils/toolCgroup.js";
import { isPolicyAllowed, policyDeniedReason } from "../policyLimits/policyVerdicts.js";
import { checkPluginBunOptions } from "../../utils/permissions/protectedSettingsPaths.js";
import {
  shouldRestrictRemoteHost,
  makeStepUpDialog,
  stepUpResultMessage,
  markStepUpExhausted,
  isStepUpAuthDialogEnabled,
  grantedScopesCover,
  isStepUpExhausted,
  runStepUpReauth,
} from "./stepUpAuth.js";
import { HTTPS_CLAUDE_COM_CLAUDE_CODE } from "../../constants/product.js";
import { isDisklessContext } from "../../utils/pollEvents.js";
import { guardTransportSend, hostedDesktopRefusal_2, base64URLEncode } from "./mcpWireUtils.js";
import {
  listChangedCapabilities,
  ensureListenSubscription,
  recordListChangedRefetcher,
} from "./listenStream.js";
import {
  installModernResultBackfill,
  shouldPauseForQuestions,
  isProbeAllowed,
  installQuestionPause,
} from "./resultNormalization.js";
import { registerChildMemory } from "../../utils/telemetry/memorySummary.js";
import { isCleanupStarted, registerCleanup } from "../../utils/cleanupRegistry.js";
import {
  officialPluginPromptOverrides,
  serverInstructionsOverride,
  isClientWithoutTransport,
  applyParamDescriptionOverrides,
} from "./officialPluginPromptOverrides.js";
import { toolTimeoutForServer } from "./mcpTimeouts.js";
import { maybeNotifyIDEConnected } from "../../utils/ide.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { SSL_CERT_ERROR_CODES, sanitizableErrorCode } from "../api/errorUtils.js";
import { protocolVersionLiteral } from "../../../vendor/@modelcontextprotocol/core/dist/schemas-DscsoNZN.mjs";
import { scrubErrorText } from "../../utils/accessibility/screenReader.js";
import {
  postedEndpointErrorText,
  classifyMcpErrorSourceCategory,
  CCR_NEEDS_APPROVAL_CODE,
  isTruncatedBodyError,
  McpToolResultNotReadError,
  isMalformedAfterAuthChallenge,
  McpResponseSchemaError,
} from "./mcpResultErrors.js";
import { registrationStatusFields } from "./registrationStatus.js";
import { primeDiscoveryCacheFlag, MCP_URL_ELICITATION_DIALOG } from "./elicitationDialogs.js";
import {
  CACHED_ADOPT_SIGNAL,
  CACHED_DIAL_FAILED_SIGNAL,
  REAUTH_RECONNECT_SIGNAL,
} from "./connectionFlags.js";
import { mcpGateError, reservedAddressRefusalText } from "./mcpToggleMessages.js";
import { isSameConnectedClient, listToolsWithMemo, settleToolListingMemo } from "./toolSchemaValidation.js";
import { judgeGate } from "../analytics/growthbookGates.js";
import { boundDial } from "./dialFailureLatch.js";
import { hasChannelCapability } from "./channelNotification.js";
import { toolUiMeta, describeHiddenMcpTool } from "./toolNameLimits.js";
import { requiresConnectorGrant, connectorServerId, recordClaudeAiMcpConnected } from "./claudeai.js";
import {
  ownsLegacyKey,
  isLegacyKeyUnclaimed,
  mayRecordServerOwner,
  isServerIdentityActive,
  isLegacyKeyRefused,
  isLegacyKeyOwnedElsewhere,
  enforcesGrants,
} from "./serverIdentity.js";
import { MCPTool } from "../../tools/MCPTool/MCPTool.js";
import {
  refuseNonMainAccountMemoryWrite,
  applyMemoryCallerMeta,
} from "../accountMemory/accountMemoryServer.js";
import { MAX_MCP_RESULT_CHARS } from "../../constants/outputLimits.js";
import {
  addComputerUseActionSummary,
  addActionSummaryToSchema,
} from "../../utils/permissions/actionSummary.js";
import { REMOTE_BROWSER_SERVER_NAME } from "./remoteBrowserServer.js";
import { isRemoteBrowserModeFloorOn } from "../../utils/permissions/remoteBrowser.js";
import {
  createStreamingListingSanitizer,
  listingTruncatedNote,
} from "../../tools/WebFetchTool/sanitizeListing.js";
import { applyBlockedToolPolicy } from "./blockedServers.js";
import { judgeToolSchemaSendability } from "./toolSchemaSendability.js";
import { joinDescription } from "../../remote/tools/inputSchemaFlatten.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { countByAlias } from "../../../vendor/lodash-es/countBy.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import {
  isMemoryToolServer,
  isMemoryToolServer_2,
  isMemoryServerConnection,
  isAccountMemoryServer,
  raiseMemoryErrorCap,
  describeRedactedMcpError,
} from "../../memdir/memoryTool.js";
import { isDocsConnectorClient, isDocsConnectorServer } from "../../tools/ArtifactTool/docsConnector.js";
import { mcpServerSource, chromeUploadMaxBytes } from "./fileReference/fileReferencePolicy.js";
import {
  isStandardKeyActive,
  getServerIdentityKey,
  isIdentityTrackedServer,
  isRemoteTransport,
  registerConfiguredMcpServers,
} from "./mcpStandardKeys.js";
import { serverProvenanceOf } from "../api/toolProvenance.js";
import { stripIgnorables } from "../../utils/sanitization.js";
import {
  createChromePermissionHandler,
  readTabUrl,
  judgedSiteMeta,
  chromeSiteFromError,
  chromeSiteDenyCheck,
  chromeSiteAsk,
  CLAUDECODE_CHROMESITE,
} from "../../utils/claudeInChrome/chromePermissions.js";
import { IMAGE_LIMITS } from "../../utils/mediaLimits.js";
import { isSlackSendToolName, createSlackSendToolUi } from "../../tools/MCPTool/slackSend.js";
import { isClaudeTestWriteCall } from "../../plugins/bundled/claudeTest/constants.js";
import { claudeTestWriteToolOverrides } from "./claudeTestWriteTool.js";
import {
  stripHostMetaUnlessCcrScoped,
  rewriteAnthropicSourcesForCcr,
} from "../../bridge/bridgePermissionCallbacks.js";
import { consumeMcpApprovalTicket, consumeTicketIntoInput } from "../../bridge/mcpApprovalTickets.js";
import { requestIdMeta } from "./resultContent.js";
import { isHearthbotRelayServer } from "../projectsRelay/relayConfig.js";
import { ccrTurnEventHeaders } from "../../utils/telemetry/ccrTraceContext.js";
import { agentRequestMeta } from "./agentRequestMeta.js";
import { parkOnUser } from "../../utils/sessionActivity.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { getBackgroundAgentId } from "../../utils/agentContext.js";
import { logPrCreateOperation, zipOperationFields } from "../../utils/git/gitOperationTelemetry.js";
import { chromeNoBrowserAnswer } from "../../utils/claudeInChrome/chromePermissionRules.js";
import { stripAnthropicMeta, anthropicResourceLinks } from "./anthropicMeta.js";
import {
  isMcpTasksEnabled,
  isTaskBackgroundDisabled,
  MCP_TASK_POLL_MS,
  isTaskWorkerWakeEnabled,
} from "./mcpTaskWorker.js";
import { isBrowserUnavailable } from "../../utils/browser.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { noteHearthDegraded } from "./hearthDegraded.js";
import {
  markRefusedByCcrProxy,
  GET_TASK,
  isToolboxServer,
  isTaskWriteMethod,
  findPendingTaskFilesForArgs,
  discardTaskFiles,
  registerDiscarder,
  isRefusedByCcrProxy,
  unregisterDiscarder,
  markTaskFilesSent,
  isToolboxMcpServer,
  isApprovalMismatchMessage,
  runDiscarder,
} from "./agentTaskFiles.js";
import { UNLIMITED_RATE_LIMITER } from "../../tasks/taskLoopRegistry.js";
import { isLiveMemoryTool } from "./memoryServerVerification.js";
import { foregroundCallRegistrySlots } from "../tools/detachedToolCalls.js";
import { wrapHoldAware } from "../../plugins/functionHooks/inputHold.js";
import { resolveSdkUrl } from "../../cli/transports/sdkUrlValidation.js";
import { ANTHROPIC_FILEINPUTS } from "../mcpServe/fileInputs.js";
import { recordPluginActivity } from "../../utils/pluginActivity.js";
import { countWhere } from "../../utils/collections.js";
import { logChromeToolsAdded } from "../../utils/claudeInChrome/telemetry.js";
import { listAllPages_2, listToolsModern } from "./listPagination.js";
import { getMcpInfoFromConnection } from "./types.js";
import { recordToolUsed } from "../compact/keptTools.js";
import { checkCommandListable } from "../../utils/commandPredicates.js";
import { RESERVED_SKILL_NAMESPACE_REASON } from "../../skills/reservedSkillNames.js";
import { createAbortController } from "../../utils/abortController.js";
import { clearKeychainCache } from "../../utils/secureStorage/macOsKeychainHelpers.js";
import { applyMcpServerConfig } from "../../components/mcp/MCPListPanel.js";
import { ListMcpResourcesTool } from "../../tools/ListMcpResourcesTool/ListMcpResourcesTool.js";
import { ReadMcpResourceTool } from "../../tools/ReadMcpResourceTool/ReadMcpResourceTool.js";
import { matchesToolName } from "../../Tool.js";
import { listDirectoryResourceTool } from "./skillDirectoryResource.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { isIneligibleClaudeAiProxy } from "./claudeAiEligibility.js";
import { readMcpOAuthStore } from "./credentialStoreRead.js";
import {
  toStoredMcpContent,
  persistBinaryContent,
  binaryNotSavedNotice,
  getBinaryBlobSavedMessage,
  dropExtraDocumentBlocks,
  getFormatDescription,
  getLargeOutputInstructions,
} from "../../utils/mcpOutputStorage.js";
import {
  toolResultStoreOrNull,
  noteResult,
  persistToolResult,
  toolResultsDir,
  isPersistError,
} from "../../utils/toolResultStorage.js";
import { addToHistory_2, addToHistory } from "../../history.js";
import { maybeResizeAndDownsampleImageBlock, createImageMetadataText } from "../../utils/imageResizer.js";
import {
  unreadOutcome,
  attachmentNoteFor,
  textResultToolUseId,
  noteGmailAttachmentNotRead,
  noteGmailAttachmentShown,
} from "./googleConnectorAttachments.js";
import {
  stripTextBlockMeta,
  mcpContentNeedsTruncation,
  getContentSizeEstimate,
  truncateMcpContentIfNeeded,
  truncateMcpContent,
} from "../../utils/mcpValidation.js";
import { notRecordedLength } from "../../utils/telemetry/accountMemoryRedaction.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  runElicitationHooks,
  runElicitationResultHooks,
  handleElicitationRequest,
  runElicitationHooks_2,
  runElicitationResultHooks_2,
} from "./elicitationHandler.js";
import { hasMcpInboundDoor } from "./mcpInboundDoor.js";
import {
  CLIENT_CAPABILITIES_META_KEY,
  SUPPORTED_PROTOCOL_VERSIONS as SUPPORTED_PROTOCOL_VERSIONS_2,
} from "../../../vendor/@modelcontextprotocol/core/dist/schemas-lGLjBX8n.cjs";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { shortTaskLabel } from "./mcpTaskCapability.js";
import { detectCodeIndexingFromMcpServerName } from "../../utils/codeIndexing.js";
import { SdkControlClientTransport } from "./SdkControlTransport.js";
import {
  McpError,
  ErrorCode,
  isJSONRPCErrorResponse,
  JSONRPCMessageSchema,
  ListRootsRequestSchema,
  ElicitRequestSchema,
  ElicitRequestURLParamsSchema,
  ImplementationSchema,
  ServerCapabilitiesSchema,
  ToolSchema,
  PromptSchema,
  ResourceSchema,
  ResourceTemplateSchema,
  CompatibilityCallToolResultSchema,
  CallToolResultSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import {
  StreamableHTTPError,
  StreamableHTTPClientTransport,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js";
import {
  HttpBodyOverflowError,
  boundedFetch,
  isStatelessClaudeAiProxy,
  answerGetStreamLocally,
  BoundedStdioTransport,
  getCachedInitializeResult,
  cachedDiscoverOutcome,
  answerHandshakeLocally,
  StdoutOverflowError,
  HTTP_BODY_LIMITS,
  STOPPED_READING_NOTE,
  netModule,
} from "./transportGuards.js";
import {
  listMcpTools,
  fetchCommandsForClient_2,
  fetchResourcesForClient_2,
  fetchResourceTemplatesForClient_2,
  sanitizeConnectErrorCodeForTelemetry_2,
  persistLiveListing_2,
  buildCachedClientTools_2,
  applyCapabilityServeTimeMiss_2,
  buildMcpPromptCommands_2,
  isSupersededDial_2,
  getDiscoveryFetchError_2,
  isSupersededCacheEntry_2,
  persistDiscovery,
  isDiscoveryCacheMissRecoverable_2,
  discoverySourceLabel_2,
  recordRawResourcesForResult_2,
} from "./discovery.js";
import {
  primeEnsureConnectedClient,
  clearDiscoveryForServer_2,
  clearServerCache_3,
  detachAndCloseConnection_2,
  isLegacyProtocolEra,
  hasLiveConnection_2,
  refuseCachedRowV1,
  emitCachedAdoptSignal,
  recordCachedDialFailureV1,
  settleDialOrUndefined,
} from "./connectionRegistry.js";
import { createFetchWithDefaults } from "../../utils/fetchWithDefaults.js";
import {
  wrapFetchWithFirstPartyAuth_2,
  mergeRequestHeaders_2,
  wrapFetchWithCcrSessionAuth_2,
  wrapFetchWithCliOwnedBearer_2,
  createClaudeAiProxyFetch,
  isAuthFailure_2,
  handleRemoteConnectAuthError_2,
  handleRemoteAuthFailure,
  logMcpConnectionOtelEvent_2,
} from "./connectAuth.js";
import {
  SSEClientTransport,
  SseError,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/sse.js";
import { getDefaultEnvironment } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { Client } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { UnauthorizedError } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { validateHostManifest_2, logManifestOutcomeV1 } from "./sdkManifest.js";
import { listSubagentTranscripts } from "../../utils/subagentTranscripts.js";
import { isSafeIdSegment } from "../../utils/agentId.js";
import {
  readAgentMetaFiles,
  MAX_META_READ_CONCURRENCY,
  buildAgentTree,
} from "../../tasks/LocalAgentTask/agentMetaFiles.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmy4vc7c.js:825-1064 fingerprint (2.1.88 match: McpAuthError, 0.526)
/**
 * McpAuthError：MCP 认证错误（带服务器名）。
 */
class McpAuthError extends Error {
  authErrorKind;
  firstPartyBearer;
  requestedScope;
  serverName;
  constructor(serverName, message, authErrorKind = "token_expired", firstPartyBearer, requestedScope) {
    super(message);
    this.authErrorKind = authErrorKind;
    this.firstPartyBearer = firstPartyBearer;
    this.requestedScope = requestedScope;
    this.name = "McpAuthError";
    this.serverName = serverName;
  }
}
//@ chunk-fmy4vc7c.js:1064-1159 layout
/**
 * McpToolFileInputRejectedError：MCP 工具文件输入被拒绝。
 */
let McpToolFileInputRejectedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmy4vc7c.js:1064", () => {
  McpToolFileInputRejectedError = class McpToolFileInputRejectedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    code;
    constructor(error, code) {
      super(error, "MCP tool file input rejected");
      this.code = code;
    }
  };
});
//@ chunk-fmy4vc7c.js:1159-1807 fingerprint (2.1.88 match: McpSessionExpiredError, 0.409)
/**
 * McpSessionExpiredError：HTTP 会话过期（404）或连接关闭时抛出，expiryKind 区分原因。
 */
let McpSessionExpiredError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmy4vc7c.js:1159", () => {
  McpSessionExpiredError = class McpSessionExpiredError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    expiryKind;
    constructor(serverName, expiryKind = "session_expired_404") {
      super(
        expiryKind === "connection_closed_http"
          ? `MCP server "${serverName}" connection closed before the tool call was answered. The tool may have run: check whether it did before running it again.`
          : expiryKind === "connection_closed_call_not_run"
            ? `MCP server "${serverName}" connection closed before the tool call ran`
            : `MCP server "${serverName}" session expired`,
        "MCP session expired",
      );
      this.expiryKind = expiryKind;
      this.name = "McpSessionExpiredError";
    }
    get mayHaveRun() {
      switch (this.expiryKind) {
        case "session_expired_404":
        case "connection_closed_call_refused":
        case "connection_closed_call_not_run":
          return false;
        case "connection_closed_http":
          return true;
      }
    }
  };
});
//@ chunk-fmy4vc7c.js:1807-2432 layout
/**
 * McpCredentialStoreUnavailableError：凭证存储读不了（如 macOS 钥匙串锁定）时抛出，消息给出处理办法。
 */
let McpCredentialStoreUnavailableError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmy4vc7c.js:1807", () => {
  McpCredentialStoreUnavailableError = class McpCredentialStoreUnavailableError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    code;
    constructor(serverName, reason = "unreadable") {
      if (reason === "unreadable")
        super(
          `Couldn't read the stored credentials for MCP server "${serverName}", so the request didn't run. ${getPlatform() === "macos" ? "If your Mac's keychain is locked, unlock it, then try again." : "Try again."}`,
          "MCP credential store could not be read",
        );
      else
        super(
          `A request to MCP server "${serverName}" was sent without your stored credentials, so the server rejected it. The credentials are available now. Try again.`,
          "MCP credentials were read only after a request went out without them",
        );
      this.code = "CREDENTIAL_STORE_UNAVAILABLE";
      this.name = "McpCredentialStoreUnavailableError";
    }
  };
});
//@ chunk-fmy4vc7c.js:2432-2538 fingerprint (2.1.88 match: McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, 0.82)
/**
 * MCP 工具调用失败的错误类（name 为 McpToolCallError），在通用错误基础上携带服务器返回的 `_meta`（mcpMeta），供遥测与结果展示。
 */
let McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmy4vc7c.js:2432", () => {
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS = class McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    mcpMeta;
    constructor(message, telemetryMessage, mcpMeta, cause) {
      super(message, telemetryMessage, cause);
      this.mcpMeta = mcpMeta;
      this.name = "McpToolCallError";
    }
  };
});
//@ chunk-eeh1dqm6.js:226-303 fingerprint (2.1.88 match: getConnectionTimeoutMs, 1)
/**
 * MCP 连接超时：env `MCP_TIMEOUT`（>0，上限 2^31-1）否则默认 30000ms。
 */
function getConnectionTimeoutMs() {
  let MCP_TIMEOUT = env.MCP_TIMEOUT;
  return MCP_TIMEOUT && MCP_TIMEOUT > 0 ? Math.min(MCP_TIMEOUT, 2147483647) : 30000;
}
//@ chunk-eeh1dqm6.js:303-391 placement
/**
 * 连接超时（MCP_CONNECT_TIMEOUT_MS，默认 5000）。
 */
function getConnectTimeoutMs() {
  let MCP_CONNECT_TIMEOUT_MS = env.MCP_CONNECT_TIMEOUT_MS;
  return MCP_CONNECT_TIMEOUT_MS && MCP_CONNECT_TIMEOUT_MS > 0
    ? Math.min(MCP_CONNECT_TIMEOUT_MS, 2147483647)
    : 5000;
}
//@ chunk-eeh1dqm6.js:391-421 placement
/**
 * 短暂重试间隔（500 毫秒）。
 */
var TRANSPORT_FALLBACK_TIMEOUT_MS = 2000;
var REMOTE_CONNECT_TIMEOUT_MS = 8000;
var SHORT_RETRY_MS = 500;
//@ chunk-4wmswyss.js:302-360 placement
/**
 * MCP 服务器不被允许时的错误文案。
 */
var MCP_SERVER_NOT_ALLOWED_MESSAGE = "Error POSTing to endpoint: MCP server not allowed";
//@ chunk-4wmswyss.js:667-722 placement
/**
 * 取 artifacts 的 MCP 客户端。
 */
function artifactsMcpClient() {
  return (getMcpClientsFromAccessor() ?? []).find((client) => client.name === CLAUDE_ARTIFACTS);
}
//@ chunk-4wmswyss.js:722-780 placement
/**
 * 取“该行未被服务”的记录。
 */
function getMcpEntryRowNotServed() {
  return hasLiveState() ? getLiveState().mcpEntryRowNotServed : null;
}
//@ chunk-4wmswyss.js:780-813 placement
/**
 * 判断某行是否正是未服务的记录。
 */
function isEntryRowNotServed(entryRow) {
  return getMcpEntryRowNotServed() === entryRow;
}
//@ chunk-5xgkngpb.js:2199195-2199305 placement
/**
 * 判断 MCP 输出截断时是否使用子代理提示（环境变量覆盖优先，否则看开关）。
 */
function useSubagentTruncationPrompt() {
  let MCP_TRUNCATION_PROMPT_OVERRIDE = env.MCP_TRUNCATION_PROMPT_OVERRIDE;
  return MCP_TRUNCATION_PROMPT_OVERRIDE
    ? MCP_TRUNCATION_PROMPT_OVERRIDE !== "legacy"
    : getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_subagent_prompt", false);
}
//@ chunk-5xgkngpb.js:3375076-3375460 fingerprint (2.1.88 match: ensureConnectedClient, 0.345)
/**
 * ensureConnectedClient：按名字找客户端并确认已连接，找不到列出可用服务器名报错。
 */
function ensureConnectedClient_2(clients, serverName) {
  let [client] = findServersByName(clients, serverName);
  if (!client)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Server "${serverName}" not found. Available servers: ${clients.map((client) => client.name).join(", ")}`,
      "MCP server not found",
    );
  if (!isConnectedOrCached(client))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Server "${client.name}" is not connected`,
      "MCP server not connected",
    );
  if (!client.capabilities?.resources)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Server "${client.name}" does not support resources`,
      "MCP server has no resources capability",
    );
  return client;
}
//@ chunk-5xgkngpb.js:3903909-3904012 placement
/**
 * 判断 MCP 配置的 URL 是否为空（未配置）。
 */
function isUnconfiguredUrl(serverRef) {
  return (
    serverRef.configErrorReason === "url_empty" ||
    (!serverRef.configError && "url" in serverRef && serverRef.url.trim() === "")
  );
}
//@ chunk-5xgkngpb.js:3904012-3905109 placement
/**
 * 生成 MCP 服务器配置的规范化 JSON 指纹：去掉来源/缓存/资格等元字段，stdio 补默认 type 与 args，URL 查询参数排序，对象键排序，未配置的 URL 标记 unconfigured。
 */
function canonicalMcpConfigKey(config) {
  let {
    scope,
    pluginSource,
    pluginPath,
    relayed,
    pluginEndpointTemplated,
    pluginOfficialSourceVouched,
    agentSource,
    declaredIn,
    configError,
    configErrorReason,
    expandedFromEnv,
    configuredCommand,
    redialToRelearnRegistration,
    ...rest
  } = config;
  let canonical = rest;
  delete canonical.tools;
  delete canonical.discoveryCache;
  delete canonical.cachedInitResponse;
  delete canonical.cachedDiscoverResponse;
  delete canonical.discoverSupport;
  delete canonical.eligible;
  delete canonical.ineligibleReason;
  delete canonical.enterpriseManaged;
  if (canonical.type !== "claudeai-proxy") delete canonical.displayName;
  if (canonical.type === "stdio" || (canonical.type === undefined && "command" in canonical)) {
    canonical.type = "stdio";
    canonical.args = canonical.args ?? [];
  }
  let urlParts =
    typeof canonical.url === "string" && URL.canParse(canonical.url)
      ? /^([^?#]*\?)([^#]*)(.*)$/s.exec(canonical.url)
      : null;
  if (urlParts) {
    let [, urlPrefix = "", query = "", hashAndRest = ""] = urlParts;
    canonical.url =
      urlPrefix +
      query
        .split("&")
        .sort((paramA, paramB) => {
          let keyA = firstLineOf(paramA, "=");
          let keyB = firstLineOf(paramB, "=");
          return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
        })
        .join("&") +
      hashAndRest;
  }
  if (isUnconfiguredUrl(config)) canonical.unconfigured = true;
  if (agentSource !== undefined) canonical.agentSource = agentSource;
  return jsonStringify(canonical, (key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      let object = value;
      let sorted = Object.create(null);
      for (let key of Object.keys(object).sort()) sorted[key] = object[key];
      return sorted;
    }
    return value;
  });
}
//@ chunk-5xgkngpb.js:3905109-3905186 placement
/**
 * 配置内容的 SHA-256 前 16 位（缓存键）。
 */
function configHash(config) {
  return createHash("sha256").update(canonicalMcpConfigKey(config)).digest("hex").slice(0, 16);
}
//@ chunk-5xgkngpb.js:3905186-3905225 placement
/**
 * 服务器缓存键（名字 + 配置哈希）。
 */
function serverCacheKey(serverName, config) {
  return `${serverName}-${configHash(config)}`;
}
//@ chunk-5xgkngpb.js:3905340-3905361 placement
var CU_DESKTOP_BINARY_NAME = "cu-desktop";
//@ chunk-5xgkngpb.js:3905361-3905515 placement
/**
 * 托管桌面会话的 computer-use 接入：mcpConfig {"computer-use": stdio /opt/cu-desktop/cu-desktop mcp, scope dynamic}，并把只读动作加入允许列表。
 */
function getHostedDesktopComputerUseConfig() {
  return {
    mcpConfig: {
      [COMPUTER_USE_MCP_SERVER_NAME]: registerCliOwnedConfig({
        type: "stdio",
        command: `/opt/${CU_DESKTOP_BINARY_NAME}/${CU_DESKTOP_BINARY_NAME}`,
        args: ["mcp"],
        scope: "dynamic",
      }),
    },
    allowedTools: READ_ONLY_CU_ACTIONS.map((actionName) =>
      buildMcpToolName(COMPUTER_USE_MCP_SERVER_NAME, actionName),
    ),
  };
}
//@ chunk-5xgkngpb.js:3905515-3905628 placement (2.1.88 match: getServerCommandArray, 1)
function isDesktopComputerUseCommand(config) {
  return (
    (config.type === undefined || config.type === "stdio") &&
    [config.command, ...(config.args ?? [])].some((arg) => arg?.includes(CU_DESKTOP_BINARY_NAME))
  );
}
//@ chunk-5xgkngpb.js:3972916-3972949 placement
/**
 * 取可安全记录进日志的服务器源地址。
 */
function loggingSafeOrigin(serverConfig) {
  return safeOrigin(getLoggingSafeMcpBaseUrl(serverConfig));
}
//@ chunk-5xgkngpb.js:3972949-3972973 placement
/**
 * 按宿主保存的回合调度器映射。
 */
var turnsByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3972949", () => {
  turnsByHost = new HostScoped(() => ({}));
});
//@ chunk-5xgkngpb.js:3972973-3973080 placement
/**
 * 在当前回合调度器中映射执行（没有调度器时直接映射）。
 */
async function mapInTurns(items, mapper) {
  let { turns } = turnsByHost.of(getRootSession().host);
  return turns === undefined ? items.map((item) => mapper(item)) : turns.mapInTurns(items, mapper);
}
//@ chunk-5xgkngpb.js:3973080-3973159 placement
/**
 * 工具描述的最大长度（环境变量可覆盖）。
 */
function maxDescriptionLength(forLoadedDescription = false) {
  return (
    env.CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH ??
    (forLoadedDescription ? MAX_STRUCTURED_RESULT_CHARS : MAX_CALL_MARK_CHARS)
  );
}
//@ chunk-5xgkngpb.js:3973159-3973608 placement
/**
 * 检测工具描述中工具调用 XML 的标记：invoke 标签与常见 HTML 标签名（不视为参数名）。
 */
var INVOKE_TAG_MARKERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COMMON_HTML_TAGS;
deferInit("chunk-5xgkngpb.js:3973159", () => {
  INVOKE_TAG_MARKERS = [
    "<invoke>",
    "<invoke ",
    "<invoke\t",
    `<invoke
`,
    "</invoke>",
  ];
  COMMON_HTML_TAGS = new Set([
    "address",
    "area",
    "article",
    "audio",
    "base",
    "body",
    "button",
    "cite",
    "code",
    "data",
    "details",
    "dialog",
    "figure",
    "footer",
    "form",
    "head",
    "header",
    "html",
    "image",
    "input",
    "label",
    "link",
    "main",
    "mark",
    "menu",
    "meta",
    "object",
    "option",
    "output",
    "path",
    "picture",
    "script",
    "section",
    "select",
    "slot",
    "source",
    "span",
    "style",
    "summary",
    "table",
    "template",
    "text",
    "time",
    "title",
    "video",
  ]);
});
//@ chunk-5xgkngpb.js:3973608-3974199 placement
/**
 * 检查 MCP 工具描述与参数描述中是否含工具调用式 XML：invoke 标签，或以参数名为标签名的标记。
 */
function detectToolCallXml(tool, maxDescChars) {
  let properties = tool.inputSchema?.properties ?? {};
  let propertyNames = Object.keys(properties);
  let texts = [];
  if (tool.description) texts.push(tool.description.slice(0, maxDescChars));
  for (let propertyName of propertyNames) {
    let propertySchema = properties[propertyName];
    let description =
      propertySchema && typeof propertySchema === "object" && "description" in propertySchema
        ? propertySchema.description
        : undefined;
    if (typeof description === "string") texts.push(description);
  }
  if (texts.length === 0) return;
  let joined = texts.join(`
`);
  if (!joined.includes("<")) return;
  let lower = joined.toLowerCase();
  if (INVOKE_TAG_MARKERS.some((marker) => lower.includes(marker))) return "invoke";
  let paramTags = new Set();
  for (let propertyName of propertyNames) {
    let lower = propertyName.toLowerCase();
    if (propertyName.length >= 4 && !COMMON_HTML_TAGS.has(lower)) paramTags.add(lower);
  }
  for (let [, tagName = ""] of lower.matchAll(/<([^<>]*)>/g))
    if (paramTags.has(tagName) || (tagName.startsWith("/") && paramTags.has(tagName.slice(1))))
      return "param";
  return;
}
//@ chunk-5xgkngpb.js:3974199-3974698 placement
/**
 * 统计并上报 MCP 服务器工具描述与说明中含工具调用式 XML 的情况。
 */
async function logToolCallXmlInDescriptions(tools, name, loggable, serverBaseUrl, instructions) {
  let maxDescChars = maxDescriptionLength(true);
  let invokeCount = 0;
  let paramCount = 0;
  let sampleToolName;
  let matches = await mapInTurns(tools, (tool) => detectToolCallXml(tool, maxDescChars));
  for (let [index, matchKind] of matches.entries()) {
    if (matchKind === undefined) continue;
    if (matchKind === "invoke") invokeCount++;
    else paramCount++;
    sampleToolName ??= tools[index]?.name;
  }
  let lower = instructions?.slice(0, maxDescriptionLength()).toLowerCase();
  let instructionsMatch = lower !== undefined && INVOKE_TAG_MARKERS.some((marker) => lower.includes(marker));
  let matchedCount = invokeCount + paramCount;
  if (matchedCount === 0 && !instructionsMatch) return;
  logEvent("tengu_mcp_description_contains_toolcall_xml", {
    matchedToolCount: matchedCount,
    invokeCount,
    paramCount,
    instructionsMatch,
    sampleToolName: sampleToolName ? loggableMcpToolName(name, sampleToolName, loggable) : undefined,
    mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(name, loggable),
    ...(serverBaseUrl && {
      mcpServerBaseUrl: serverBaseUrl,
    }),
  });
}
//@ chunk-5xgkngpb.js:3974698-3974726 placement
/**
 * 类似标签名的最大长度（256）。
 */
var INVOKE_CLOSE_TAG = "</invoke>";
var MAX_URL_LIKE_TAG_CHARS = 256;
//@ chunk-5xgkngpb.js:3974726-3974822 placement
function mcpToolInputToAutoClassifierInput_2(input, toolName) {
  return (
    input.length >= toolName.length && input.slice(-toolName.length).toLowerCase() === toolName.toLowerCase()
  );
}
//@ chunk-5xgkngpb.js:3974822-3975730 placement
/**
 * 去掉 MCP 工具参数末尾多余的 invoke 结束标签。
 */
function stripTrailingInvokeSuffix(
  input,
  name,
  name_2,
  loggable,
  featureValue_CACHED_MAY_BE_STALE,
  serverBaseUrl,
) {
  let result = input;
  for (let [key, value] of Object.entries(input)) {
    if (typeof value !== "string") continue;
    let endIndex = value.length - 1;
    while (
      endIndex >= 0 &&
      (value.charCodeAt(endIndex) === 32 ||
        value.charCodeAt(endIndex) === 9 ||
        value.charCodeAt(endIndex) === 10 ||
        value.charCodeAt(endIndex) === 13)
    )
      endIndex--;
    if (endIndex >= 0) {
      let code = value.charCodeAt(endIndex);
      if (code >= 33 && code <= 126 && code !== 62) continue;
    }
    let trimmed = value.trimEnd();
    if (!mcpToolInputToAutoClassifierInput_2(trimmed, INVOKE_CLOSE_TAG)) continue;
    trimmed = trimmed.slice(0, -INVOKE_CLOSE_TAG.length).trimEnd();
    let toolName = `</${key}>`;
    let hasParamClose = mcpToolInputToAutoClassifierInput_2(trimmed, toolName);
    if (hasParamClose) trimmed = trimmed.slice(0, -toolName.length).trimEnd();
    let looksLikeUrl =
      hasParamClose &&
      (key.length > MAX_URL_LIKE_TAG_CHARS ||
        new RegExp(`<${urlPatternToRegex_2(key)}[\\s>/]`, "i").test(value));
    let missKind = !hasParamClose ? lit("param_close") : looksLikeUrl ? lit("open_guard") : undefined;
    logEvent("tengu_mcp_arg_trailing_invoke_suffix", {
      wouldStrip: missKind === undefined,
      missKind,
      flagOn: featureValue_CACHED_MAY_BE_STALE,
      paramNameLen: key.length,
      strippedToLen: trimmed.length,
      mcpToolName: loggableMcpToolName(name_2, name, loggable),
      mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(name_2, loggable),
      ...(serverBaseUrl && {
        mcpServerBaseUrl: serverBaseUrl,
      }),
    });
    if (missKind !== undefined || !featureValue_CACHED_MAY_BE_STALE) continue;
    if (result === input)
      result = {
        ...input,
      };
    result[key] = trimmed;
    logMCPDebug(name_2, `stripped trailing </${key}></invoke> from ${name}.${key} (model emission artifact)`);
  }
  return result;
}
//@ chunk-5xgkngpb.js:3975730-3976621 placement
/**
 * 工具输入缺少必填参数时收集诊断：必填数、缺失数、已有键数、最长字符串长度，以及字符串值里是否残留 </parameter>、</invoke> 或参数名闭合标签之类伪标签碎片。
 */
function describeMissingRequiredArgs(input, schema) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input) || schema === undefined)
      return null;
    let required = schema.required;
    if (!Array.isArray(required) || required.length === 0) return null;
    let filtered = required.filter((requiredName) => typeof requiredName === "string");
    if (filtered.length === 0) return null;
    let inputObject = input;
    let reduced = filtered.reduce(
      (acc, requiredName) => acc + (Object.hasOwn(inputObject, requiredName) ? 0 : 1),
      0,
    );
    if (reduced === 0) return null;
    let tagCandidates = new Set(
      [...Object.keys(schema.properties ?? {}), ...filtered]
        .filter((name) => name.length >= 4 && !COMMON_HTML_TAGS.has(name.toLowerCase()))
        .map((name) => name.toLowerCase()),
    );
    let longestValueLength = 0;
    let hasToolCallMarkup = false;
    for (let value of Object.values(inputObject)) {
      if (typeof value !== "string") continue;
      if (value.length > longestValueLength) longestValueLength = value.length;
      if (hasToolCallMarkup) continue;
      let lower = value.toLowerCase();
      if (
        lower.includes("</parameter>") ||
        lower.includes("<parameter name=") ||
        lower.includes("</invoke>")
      ) {
        hasToolCallMarkup = true;
        continue;
      }
      for (let [, tagName = ""] of lower.matchAll(/<\/([^<>]*)>/g))
        if (tagCandidates.has(tagName)) {
          hasToolCallMarkup = true;
          break;
        }
    }
    return {
      requiredCount: filtered.length,
      missingCount: reduced,
      presentKeyCount: Object.keys(inputObject).length,
      maxStringValueLen: longestValueLength,
      hasPseudoTagDebris: hasToolCallMarkup,
    };
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:4447022-4447100 fingerprint (2.1.88 match: getMcpAuthCache, 1)
function getMcpAuthCache(value) {
  return typeof value === "string" ? value : Buffer.from(value).toString("utf-8");
}
//@ chunk-br8c6c8g.js:303-372 placement
/**
 * 懒加载 MCP 客户端模块。
 */
function mcpClientModule() {
  return require("./emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-br8c6c8g.js:372-1387 placement
async function refreshMcpServerTools(client, setServerTools, storageV5) {
  let cacheKey = serverCacheKey(client.name, client.config);
  let {
    captureDiscoveryGrantLeg,
    ensureDiscoveryCacheAccount,
    getMcpIdentityEpoch,
    persistRefreshedToolsIfPresent,
  } = mcpClientModule();
  ensureDiscoveryCacheAccount();
  let grantLegPromise = isDiscoveryCacheOn()
    ? captureDiscoveryGrantLeg(client.name, client.config)
    : undefined;
  let toolRefreshSequences = getCliOwnedState().toolRefreshSequences;
  let sequence = toolRefreshSequences.get(client) ?? {
    started: 0,
    applied: 0,
  };
  toolRefreshSequences.set(client, sequence);
  sequence.started += 1;
  let started = sequence.started;
  let { fetchToolsForClient } = mcpClientModule();
  let previousToolsPromise = fetchToolsForClient.cache.get(cacheKey);
  let identityEpoch = getMcpIdentityEpoch();
  fetchToolsForClient.cache.delete(cacheKey);
  let toolsForClient = await fetchToolsForClient(client, storageV5);
  let toolsListErrorForResult = mcpClientModule().getToolsListErrorForResult(toolsForClient);
  if (toolsListErrorForResult)
    return {
      status: "kept-previous",
      error: toolsListErrorForResult,
    };
  if (client.discoveryAuthFailure && toolsForClient.length === 0)
    return {
      status: "kept-previous",
      error:
        "the server rejected tool discovery as unauthorized \u2014 the user needs to authorize this connector (e.g. via /mcp) before its tools are available",
    };
  if (sequence.applied > started)
    return {
      status: "kept-previous",
      error:
        "superseded by a newer concurrent refresh of this server \u2014 the newer refresh result is the one applied",
    };
  sequence.applied = started;
  setServerTools(client.name, decorateMcpTools(client, toolsForClient));
  if (grantLegPromise)
    grantLegPromise.then((grantLeg) =>
      persistRefreshedToolsIfPresent(client, toolsForClient, {
        identityEpoch,
        grantLeg,
      }),
    );
  return {
    status: "refreshed",
    newTools: toolsForClient,
    previousToolsPromise,
  };
}
//@ chunk-0cf4tfjz.js:284-480 fingerprint (2.1.88 match: setupSdkMcpClients, 0.425)
/**
 * 用于吞掉异常的特殊 Symbol。
 */
var EMPTY_CAPABILITIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CLAUDE_CODE_SERVER_INFO;
var SWALLOW_SYMBOL;
deferInit("chunk-0cf4tfjz.js:284", () => {
  EMPTY_CAPABILITIES = Object.freeze({});
  CLAUDE_CODE_SERVER_INFO = Object.freeze({
    name: "claude-code",
    title: "Claude Code",
    description: "Anthropic's agentic coding tool",
    websiteUrl: "https://claude.com/claude-code",
  });
  SWALLOW_SYMBOL = Symbol("swallow");
});
//@ chunk-sywnjtqb.js:45908-45937 placement
/**
 * 取客户端的服务器 id。
 */
function clientServerId(server) {
  return identityId(server);
}
//@ chunk-sywnjtqb.js:45937-45965 placement
/**
 * 取客户端对应的 SDK 客户端（包装 oa）。
 */
function clientOf(client) {
  return identityId2(client);
}
//@ chunk-sywnjtqb.js:45965-46139 placement
var mcpTaskPersistenceModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var mcpTasksModule;
var mcpTaskDriveModule;
var workerWakesModule;
var mcpAutoBackgroundModule;
deferInit("chunk-sywnjtqb.js:45965", () => {
  mcpTaskPersistenceModule = require("./mcpTaskPersistence.js");
  mcpTasksModule = require("./buildSep2663EndingNotice.lazy.js");
  mcpTaskDriveModule = require("./mcpTaskDrive.js");
  workerWakesModule = require("./workerWakes.js");
  mcpAutoBackgroundModule = require("./callMcpToolWithAutoBackground.lazy.js");
});
//@ chunk-sywnjtqb.js:46139-46270 placement
function isSseOpenFailure(error) {
  return (
    error instanceof SdkHttpError &&
    (error.code === SdkErrorCode.ClientHttpFailedToOpenStream ||
      error.message.includes("Failed to open SSE stream"))
  );
}
//@ chunk-sywnjtqb.js:46270-46535 placement (2.1.88 match: isConnectionError, 1)
/**
 * MCP Streamable HTTP：错误是否表示会话失效需要重新初始化（McpSessionExpiredError、非 SSE 打开失败的 404、特定 400 消息）。与 bridge 无关。
 */
function isMcpSessionExpiredError(err) {
  if (err instanceof McpSessionExpiredError) return true;
  if (err instanceof ProtocolError) return false;
  let statusOrCode = err instanceof SdkHttpError ? err.status : "code" in err ? err.code : undefined;
  if (statusOrCode === 404) return !isSseOpenFailure(err);
  return (
    statusOrCode === 400 &&
    /Server not initialized|No valid session ID|Mcp-Session-Id header is required/i.test(err.message)
  );
}
//@ chunk-sywnjtqb.js:46535-46613 placement
function truncateServerInstructions(instructions, serverName, maxLength = maxDescriptionLength()) {
  if (!instructions) return instructions;
  return truncateDescription_2(instructions, "Server instructions", serverName, maxLength);
}
//@ chunk-sywnjtqb.js:46613-46766 placement
function truncateDescription_2(description, label, serverName, maxLength = maxDescriptionLength()) {
  if (description.length <= maxLength) return description;
  if (serverName !== undefined)
    logMCPDebug(serverName, `${label} truncated from ${description.length} to ${maxLength} chars`);
  return truncateToLength(description, maxLength) + "\u2026 [truncated]";
}
//@ chunk-sywnjtqb.js:46766-46944 placement
/**
 * 匹配 “Error POSTing to endpoint (HTTP xxx)” 的正则。
 */
var TRANSIENT_NETWORK_ERROR_CODES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TRANSIENT_ERROR_CODES;
var POST_HTTP_STATUS_RE;
deferInit("chunk-sywnjtqb.js:46766", () => {
  TRANSIENT_NETWORK_ERROR_CODES_2 = ["ECONNRESET", "ETIMEDOUT", "EPIPE", "EHOSTUNREACH", "ECONNREFUSED"];
  TRANSIENT_ERROR_CODES = new Set([
    ...TRANSIENT_NETWORK_ERROR_CODES_2,
    "ConnectionRefused",
    "ConnectionClosed",
  ]);
  POST_HTTP_STATUS_RE = /^Error POSTing to endpoint \(HTTP (\d+)\)/;
});
//@ chunk-sywnjtqb.js:46944-47002 placement
/**
 * 判断数值是否为合法 HTTP 状态码。
 */
function isValidHttpStatus(status) {
  return typeof status === "number" && status >= 100 && status <= 599;
}
//@ chunk-sywnjtqb.js:47002-47456 placement
function isTransientMcpError(error) {
  if (error.name === "AbortError") return true;
  let code = "code" in error ? error.code : undefined;
  let status = "status" in error ? error.status : undefined;
  let statusFromMessage = POST_HTTP_STATUS_RE.exec(error.message)?.[1];
  if (
    isValidHttpStatus(status) ||
    isValidHttpStatus(code) ||
    (typeof code === "number" && code < 0) ||
    (statusFromMessage !== undefined && isValidHttpStatus(Number(statusFromMessage)))
  )
    return false;
  if (typeof code === "string" && TRANSIENT_ERROR_CODES.has(code)) return true;
  let message = error.message;
  return (
    TRANSIENT_NETWORK_ERROR_CODES_2.some((fragment) => message.includes(fragment)) ||
    message.includes("Body Timeout Error") ||
    /\bterminated\b/.test(message) ||
    message.includes("SSE stream disconnected") ||
    message.includes("Failed to reconnect SSE stream")
  );
}
//@ chunk-sywnjtqb.js:47456-47491 placement
/**
 * 分页请求之间的退避序列（250/500/1000 毫秒）。
 */
var DEFAULT_TOOL_TIMEOUT_MS = 1e8;
var MAX_LIST_PAGES = 20;
var LIST_PAGE_DELAYS_MS = [250, 500, 1000];
//@ chunk-sywnjtqb.js:47491-48173 placement
function isRetryableListError(error) {
  if (isListAuthError_2(error)) return false;
  if (error instanceof IssuerEchoCrossOriginError) return false;
  if (isClaudeAiBearerRejectedError_2(error)) return false;
  if (error instanceof DOMException && error.name === "TimeoutError") return false;
  if (error instanceof HttpBodyOverflowError_2) return false;
  if (error instanceof SdkHttpError && error.status >= 400 && error.status < 500) return false;
  if (
    error instanceof Error &&
    !(error instanceof ProtocolError) &&
    "code" in error &&
    typeof error.code === "number" &&
    error.code >= 400 &&
    error.code < 500
  )
    return false;
  if (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout) return false;
  if (error instanceof SdkError && error.code === SdkErrorCode.ListPaginationExceeded) return false;
  if (error instanceof ProtocolError)
    return (
      error.code !== -32001 &&
      error.code !== ProtocolErrorCode.MethodNotFound &&
      error.code !== ProtocolErrorCode.InvalidRequest &&
      error.code !== ProtocolErrorCode.InvalidParams &&
      error.code !== ProtocolErrorCode.UnsupportedProtocolVersion &&
      error.code !== ProtocolErrorCode.MissingRequiredClientCapability
    );
  return true;
}
//@ chunk-sywnjtqb.js:48173-48325 placement
function isTimeoutError(error) {
  return (
    (error instanceof DOMException && error.name === "TimeoutError") ||
    (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout) ||
    (error instanceof ProtocolError && error.code === -32001)
  );
}
//@ chunk-sywnjtqb.js:48325-48384 placement
function hasNoTransport(client) {
  return "transport" in client && client.transport === undefined;
}
//@ chunk-sywnjtqb.js:53607-53745 placement (2.1.88 match: getMcpToolTimeoutMs, 1)
/**
 * getMcpToolTimeoutMs：工具调用总超时：配置 timeout（≥1000）> MCP_TOOL_TIMEOUT > 默认约 27.8 小时，夹在 [1000, 上限]。
 */
function getMcpToolTimeoutMs_3(config) {
  let timeoutMs =
    (config?.timeout !== undefined && config.timeout >= 1000 ? config.timeout : undefined) ??
    env.MCP_TOOL_TIMEOUT ??
    DEFAULT_TOOL_TIMEOUT_MS;
  return Math.min(Math.max(timeoutMs, 1000), MAX_TIMER_DELAY_MS);
}
//@ chunk-sywnjtqb.js:53745-53809 placement
var REMOTE_TOOL_IDLE_TIMEOUT_MS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STDIO_TOOL_IDLE_TIMEOUT_MS_2;
var NO_IDLE_TIMEOUT_TRANSPORTS_2;
deferInit("chunk-sywnjtqb.js:53745", () => {
  REMOTE_TOOL_IDLE_TIMEOUT_MS_2 = 300000;
  STDIO_TOOL_IDLE_TIMEOUT_MS_2 = 1800000;
  NO_IDLE_TIMEOUT_TRANSPORTS_2 = new Set(["sse-ide", "ws-ide", "sdk"]);
});
//@ chunk-sywnjtqb.js:53809-54046 placement
/**
 * getMcpToolIdleTimeoutMs：工具调用空闲超时（无响应也无进度）：CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT 或 stdio 30 分钟/远程 5 分钟，sse-ide/ws-ide/sdk 不设；不小于配置 timeout，不超过总超时。
 */
function getMcpToolIdleTimeoutMs_2(config) {
  let transportType = config?.type ?? "stdio";
  if (NO_IDLE_TIMEOUT_TRANSPORTS_2.has(transportType)) return 0;
  let idleTimeoutMs =
    env.CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT ??
    (transportType === "stdio" ? STDIO_TOOL_IDLE_TIMEOUT_MS_2 : REMOTE_TOOL_IDLE_TIMEOUT_MS_2);
  if (idleTimeoutMs <= 0) return 0;
  let timeout = config?.timeout !== undefined && config.timeout >= 1000 ? config.timeout : 0;
  return Math.min(Math.max(idleTimeoutMs, timeout, 1000), getMcpToolTimeoutMs_3(config));
}
//@ chunk-sywnjtqb.js:54046-54088 placement
/**
 * 懒加载 needs-auth 缓存模块。
 */
var needsAuthCacheModule = () => require("../../utils/claudeInChrome/toolRendering.js");
//@ chunk-sywnjtqb.js:54088-54254 placement
/**
 * needs-auth 缓存常量与懒加载模块：缓存版本 v2、TTL 15 分钟（默认）/4 小时（claude.ai 代理与插件远程）/90 秒（有 refresh token）、时钟偏差容忍 1 分钟。
 */
var artifactPermissionRulesModule = () => require("../../tools/ArtifactTool/artifactPermissionRules.js");
var artifactsMcpLaptopModule = () => require("../artifacts/artifactsMcpLaptop.js");
var claudeDocsWakeModule = () => require("../../tools/ArtifactTool/docsCreateWake.js");
var AUTH_CACHE_VERSION_2 = "v2";
var NEEDS_AUTH_CACHE_TTL_MS_2 = 900000;
var NEEDS_AUTH_CACHE_LONG_TTL_MS_2 = 14400000;
var NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS_2 = 90000;
var AUTH_CACHE_CLOCK_SKEW_MS_2 = 60000;
//@ chunk-sywnjtqb.js:54254-54854 placement
/**
 * isMcpAuthCached：needs-auth 缓存命中：claude.ai 代理按 id、插件 stdio 按配置哈希；TTL 默认 15 分钟，claude.ai 代理与插件远程服务器 4 小时，有 refresh token 时 90 秒。
 */
async function isMcpAuthCached_2(serverName, config, storageV5) {
  let cacheEntry = (await readNeedsAuthCache(storageV5))[serverName];
  if (!cacheEntry) return false;
  if (config.type === "claudeai-proxy" && cacheEntry.id !== config.id) return false;
  if ((config.type === "stdio" || config.type === undefined) && config.pluginSource === undefined)
    return false;
  if (
    (config.type === "stdio" || config.type === undefined) &&
    config.pluginSource !== undefined &&
    cacheEntry.id !== configHash(config)
  )
    return false;
  if (
    (config.type === "http" || config.type === "sse") &&
    config.pluginSource !== undefined &&
    cacheEntry.id !== undefined
  )
    return false;
  let usesLongTtl =
    config.type === "claudeai-proxy" ||
    (config.pluginSource !== undefined &&
      (config.type === "http" || config.type === "sse") &&
      !usesNonOAuthAuth(config));
  let ttlMs = cacheEntry.ttlMs ?? (usesLongTtl ? NEEDS_AUTH_CACHE_LONG_TTL_MS_2 : NEEDS_AUTH_CACHE_TTL_MS_2);
  let ageMs = Date.now() - cacheEntry.timestamp;
  let isFresh = ageMs > -AUTH_CACHE_CLOCK_SKEW_MS_2 && ageMs < ttlMs;
  let lapsedCcrSignInKey = isFresh && isCcrHostedConfig(config) ? cacheEntry.lapsedCcrSignInKey : undefined;
  getConnectionCache().restoreLapsed(lapsedCcrSignInKey, serverCacheKey(serverName, config));
  return isFresh;
}
//@ chunk-sywnjtqb.js:54854-55028 placement
async function writeAuthCacheV5_2(storage, cache) {
  let writeResult = await storage.write(needsAuthCacheSpace(), jsonStringify(cache), {
    publishDiscipline: "inPlace",
  });
  if (!writeResult.ok)
    logMCPDebug("auth-cache", `needs-auth cache v5 write failed: ${formatStorageError(writeResult.error)}`);
  return writeResult.ok;
}
//@ chunk-sywnjtqb.js:55028-55369 placement
/**
 * setMcpAuthCacheEntry：写 needs-auth 缓存条目 {timestamp, id?, ttlMs?}（v5 存储或 mcp-needs-auth-cache.json），串行写链。
 */
function isMcpAuthCached_3(serverName, serverId, cacheKey, storageV5, cacheKey_2) {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.authCacheWriteChain = cliOwnedState.authCacheWriteChain
    .then(async () => {
      let cache = await readNeedsAuthCache(storageV5);
      cache[serverName] = {
        timestamp: Date.now(),
        ...(serverId && {
          id: serverId,
        }),
        ...(cacheKey !== undefined && {
          ttlMs: cacheKey,
        }),
        ...(cacheKey_2 && {
          lapsedCcrSignInKey: cacheKey_2,
        }),
      };
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        if (!(await writeAuthCacheV5_2(storageV5, cache))) return;
      } else {
        let fileReader = getFileReader();
        let writeEntry = needsAuthCachePath();
        await fileReader.mkdir(dirname(writeEntry));
        await fileReader.write(writeEntry, jsonStringify(cache));
      }
      clearAuthCacheRead();
    })
    .catch(() => {});
}
//@ chunk-sywnjtqb.js:55369-55621 placement
/**
 * clearMcpAuthCacheEntry：删除 needs-auth 缓存条目。
 */
function clearMcpAuthCacheEntry_2(name, storageV5) {
  let cliOwnedState = getCliOwnedState();
  let writePromise = cliOwnedState.authCacheWriteChain
    .then(async () => {
      let cache = await readNeedsAuthCache(storageV5);
      if (!(name in cache)) return;
      delete cache[name];
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        if (!(await writeAuthCacheV5_2(storageV5, cache))) return;
      } else await getFileReader().write(needsAuthCachePath(), jsonStringify(cache));
      clearAuthCacheRead();
    })
    .catch(() => {});
  cliOwnedState.authCacheWriteChain = writePromise;
  return writePromise;
}
//@ chunk-sywnjtqb.js:55621-55864 placement
/**
 * clearMcpDiscoveryCaches：清空连接、工具、提示词、资源、资源模板的记忆化缓存（保留指定键）。
 */
function clearMcpDiscoveryCaches_2(preservedKeys = new Set(), notifyIdentityChange = true) {
  if (!isDiscoveryCacheOn()) return;
  if (notifyIdentityChange) noteIdentityChanged();
  bumpIdentityEpoch();
  let retainKeys = (cache) => {
    if (cache) retainCacheKeys(cache, preservedKeys);
  };
  if (!getCliOwnedState().holdStaleReauthEntryForTest) getConnectionCache().reauthInFlight.clear();
  getConnectionCache().lapsedCcrSignIns.clear();
  retainKeys(connectToServer.cache);
  retainKeys(fetchToolsForClient.cache);
  retainKeys(fetchCommandsForClient.cache);
  retainKeys(fetchResourcesForClient.cache);
  retainKeys(fetchResourceTemplatesForClient.cache);
}
//@ chunk-sywnjtqb.js:55864-55971 placement
/**
 * mcpBaseUrlAnalytics：遥测字段 mcpServerBaseUrl 与 mcpServerKeyHash。
 */
function mcpServerKeyHashEntry(serverName, name) {
  let extra = loggingSafeOrigin(serverName);
  let serverFields = name
    ? {
        mcpServerKeyHash: toolNameForTelemetry(name),
      }
    : {};
  if (extra)
    return {
      mcpServerBaseUrl: extra,
      ...serverFields,
    };
  return serverFields;
}
//@ chunk-sywnjtqb.js:55971-56430 placement
/**
 * logMcpConnectionOtelEvent：发出 mcp_server_connection OTel 事件（状态、传输、作用域、耗时、插件信息、错误码）。
 */
function logMcpConnectionOtelEvent(serverName, serverRef, result) {
  let detailsLogging = isToolDetailsLoggingEnabled();
  let pluginId = serverRef.pluginSource ? parsePluginIdentifier_2(serverRef.pluginSource) : undefined;
  let isAnthropicPlugin =
    pluginId &&
    (isAnthropicPluginSource(getTelemetryPluginScope(pluginId.name, pluginId.marketplace, null)) ||
      detailsLogging);
  logOTelEvent("mcp_server_connection", {
    status: result.status,
    transport_type: serverRef.type ?? "stdio",
    server_scope: serverRef.scope,
    duration_ms: String(Math.round(result.durationMs)),
    is_plugin: pluginId !== undefined,
    ...(pluginId && {
      plugin_id_hash: pluginIdHash(pluginId.name, pluginId.marketplace),
      "plugin.name": isAnthropicPlugin ? pluginId.name : THIRD_PARTY,
    }),
    ...(result.errorCode && {
      error_code: String(sanitizeConnectErrorCodeForTelemetry(result.errorCode)),
    }),
    ...(detailsLogging && {
      server_name: serverName,
      ...(result.error && {
        error: result.error,
      }),
    }),
  });
}
//@ chunk-sywnjtqb.js:56430-57106 placement
/**
 * handleRemoteAuthFailure：远程服务器需要认证：记录 tengu_mcp_server_needs_auth，写 needs-auth 缓存，清理发现缓存，返回 needs-auth 连接。
 */
async function connectWithRetry(
  name,
  serverRef,
  transportType,
  error,
  isRefreshPath401,
  roundEpoch,
  negotiation,
  storageV5,
) {
  primeClientResolvers();
  let isZodError = error instanceof ZodError;
  let firstIssue = isZodError ? error.issues[0] : undefined;
  let error_2 = firstIssue
    ? `Server OAuth metadata invalid: ${firstIssue.path.join(".") || "(root)"} \u2014 ${firstIssue.message}`
    : undefined;
  logEvent("tengu_mcp_server_needs_auth", {
    transportType: fromEnum(transportType),
    ...(negotiation ?? {}),
    ...(isZodError && {
      cause: lit("discovery_schema"),
    }),
    ...mcpServerKeyHashEntry(serverRef, name),
  });
  logMCPDebug(
    name,
    `Authentication required for ${
      {
        sse: "SSE",
        http: "HTTP",
        "claudeai-proxy": "claude.ai proxy",
      }[transportType]
    } server`,
  );
  let canRefresh =
    isRefreshPath401 &&
    (serverRef.type === "http" || serverRef.type === "sse") &&
    (await hasStoredRefreshToken(name, serverRef));
  if (roundEpoch === undefined || isCurrentIdentityEpoch(roundEpoch))
    isMcpAuthCached_3(
      name,
      serverRef.type === "claudeai-proxy" ? serverRef.id : undefined,
      canRefresh ? NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS_2 : undefined,
      storageV5,
      getConnectionCache().lapsedSignInKey(serverCacheKey(name, serverRef)),
    );
  await purgeDiscoveryCacheOnAuthFailure(name, serverRef, roundEpoch);
  logFeatureSad("mcp_connect", "mcp_connect_needs_auth");
  return {
    name,
    type: "needs-auth",
    config: serverRef,
    error: error_2,
  };
}
//@ chunk-sywnjtqb.js:57106-57339 placement
async function purgeDiscoveryCacheOnAuthFailure(serverName, serverRef, roundEpoch) {
  let identityCurrent = roundEpoch === undefined || isCurrentIdentityEpoch(roundEpoch);
  if (isDiscoveryCacheUsable())
    if (identityCurrent) await flushDiscoveryCache(deleteDiscoveryCache(serverName, serverRef));
    else
      logMCPDebug(
        serverName,
        "Discovery cache 401/403 purge skipped: identity changed since this connect round started (the current entry belongs to the new principal)",
      );
}
//@ chunk-sywnjtqb.js:57339-57744 placement
var AUTH_REJECTION_SEVERITY = {
  AUTH_HEADER_REJECTED: {
    severity: "bad",
    featureErrorCode: "mcp_connect_auth_header_rejected",
  },
  HEADERS_HELPER_AUTH_REJECTED: {
    severity: "bad",
    featureErrorCode: "mcp_connect_headers_helper_auth_rejected",
  },
  CLI_OWNED_BEARER_REJECTED: {
    severity: "bad",
    featureErrorCode: "mcp_connect_cli_owned_bearer_rejected",
  },
  FIRST_PARTY_AUTH_REJECTED: {
    severity: "sad",
    featureErrorCode: "mcp_connect_first_party_auth_rejected",
  },
};
//@ chunk-sywnjtqb.js:57744-58508 placement
/**
 * failWithAuthRejection：记录连接失败遥测并返回带错误码（AUTH_HEADER_REJECTED 等）的 failed 连接。
 */
function failWithAuthRejection({
  name: serverName,
  serverRef,
  transportType,
  errorCode,
  message,
  negotiation,
  displayDetail,
}) {
  logEvent("tengu_mcp_server_connection_failed", {
    transportType: fromEnum(transportType),
    errorCode: fromEnum(errorCode),
    sdkGeneration: fromEnum(mcpSdkGeneration()),
    negotiationMode: negotiation.negotiationMode,
    probeFellBack: negotiation.probeFellBack,
    listenSuppressed: negotiation.listenSuppressed,
    negotiationDenylisted: negotiation.negotiationDenylisted,
    discoverSource: negotiation.discoverSource,
    listingPriorBurned: negotiation.listingPriorBurned,
    toolsListAhead: negotiation.toolsListAhead,
    toolsListAheadListed: negotiation.toolsListAheadListed,
    toolsListAheadFlagSource: negotiation.toolsListAheadFlagSource,
    ...mcpServerKeyHashEntry(serverRef, serverName),
    ...buildPluginSourceFields(serverRef),
  });
  let { severity, featureErrorCode } = AUTH_REJECTION_SEVERITY[errorCode];
  if (severity === "bad") logFeatureBad("mcp_connect", featureErrorCode);
  else logFeatureSad("mcp_connect", featureErrorCode);
  logMCPError(serverName, message);
  return {
    name: serverName,
    type: "failed",
    config: serverRef,
    error: message,
    ...(displayDetail !== undefined && {
      displayDetail,
    }),
    errorCode,
  };
}
//@ chunk-sywnjtqb.js:58508-60093 placement
/**
 * failFirstPartyAuthRejected：一方服务器拒绝 claude.ai 登录/Design 凭证时生成具体提示（/login、/design-login）。
 */
function failFirstPartyAuthRejected(credentialKind, name, serverRef, transportType, statusCode, negotiation) {
  let host = "api.anthropic.com";
  try {
    if ("url" in serverRef) host = new URL(serverRef.url).host;
  } catch {}
  let statusLabel = `HTTP ${statusCode ?? 401}`;
  let isDesignServer = isDesignServerConfig(serverRef);
  let message;
  switch (credentialKind) {
    case "design_credential":
      message =
        statusCode === 403
          ? `${host} rejected your /design-login credential (HTTP 403). Check that your account has access to Claude Design, or run /design-login to re-authorize it and retry.`
          : `${host} rejected your /design-login credential (${statusLabel}). Run /design-login to re-authorize it and retry.`;
      break;
    case "none":
      message = `${host} needs a claude.ai sign-in and Claude Code had no usable credential to send (${statusLabel}). Run ${isDesignServer ? "/design-login" : "/login"} and retry.`;
      break;
    case "design_scoped_login":
    case "login": {
      if (statusCode === 403 && isDesignServer)
        message =
          credentialKind === "design_scoped_login"
            ? `${host} rejected your claude.ai login for Claude Design (HTTP 403) even though that login already includes Claude Design permissions, so this is most likely an account or project access problem. Check that your account has access to Claude Design; if it does, run /design-login and retry.`
            : `${host} rejected your claude.ai login for Claude Design (HTTP 403), most likely because a /login token carries no Claude Design access. Run /design-login and retry, or check that your account has access to Claude Design.`;
      else
        message =
          statusCode === 403
            ? `${host} rejected your claude.ai login (HTTP 403). Check that your account has access to this server. If it does, your ` +
              `token may be missing a scope \u2014 run ${"/login"} and retry.`
            : `${host} rejected your claude.ai login (${statusLabel}). Run /login and retry.`;
      break;
    }
    default:
      return credentialKind;
  }
  return failWithAuthRejection({
    name,
    serverRef,
    transportType,
    errorCode: "FIRST_PARTY_AUTH_REJECTED",
    message,
    negotiation,
  });
}
//@ chunk-sywnjtqb.js:60093-60173 placement
function isAuthFailure(error, statusCode, sawAuthChallenge) {
  return (
    error instanceof UnauthorizedError_2 ||
    (error instanceof ZodError && sawAuthChallenge) ||
    statusCode === 401 ||
    statusCode === 403
  );
}
//@ chunk-sywnjtqb.js:60173-61839 placement
/**
 * handleRemoteConnectAuthError：SSE/HTTP 连接认证失败分类：配置的 Authorization 头被拒、headersHelper 头被拒、CLI 自有令牌被拒、一方登录被拒，或交给 OAuth 刷新/needs-auth。
 */
async function handleRemoteConnectAuthError({
  name: serverName,
  serverRef,
  transportType,
  error,
  statusCode,
  sawAuthChallenge,
  hasUserAuthHeader,
  helperMintsAuthHeader,
  cliOwnedBearer,
  useFirstPartyAuth,
  firstPartyBearer,
  authProvider,
  negotiation,
  roundEpoch,
  storageV5,
}) {
  await recordTokenlessRejection(serverName, serverRef, authProvider);
  if (!isAuthFailure(error, statusCode, sawAuthChallenge)) return;
  if (hasUserAuthHeader) {
    let errorDetail = sanitizeErrorDetail(
      redactMcpErrorDetail(
        serverName,
        serverRef,
        error instanceof SdkHttpError && typeof error.data?.text === "string"
          ? error.data.text
          : error.message,
      ),
    );
    return failWithAuthRejection({
      name: serverName,
      serverRef,
      transportType,
      negotiation,
      errorCode: "AUTH_HEADER_REJECTED",
      message:
        `Server rejected the configured Authorization header (HTTP ${statusCode ?? 401}). ` +
        "Check that the token is valid for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when headers.Authorization is set.",
      ...(errorDetail !== "" && {
        displayDetail: `Error detail: ${errorDetail}`,
      }),
    });
  }
  if (helperMintsAuthHeader) {
    let errorDetail = sanitizeErrorDetail(redactMcpErrorDetail(serverName, serverRef, error.message));
    return failWithAuthRejection({
      name: serverName,
      serverRef,
      transportType,
      negotiation,
      errorCode: "HEADERS_HELPER_AUTH_REJECTED",
      message:
        `Server rejected the Authorization header minted by the configured headersHelper (HTTP ${statusCode ?? 401}). ` +
        "Check that the helper command returns a valid credential for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when the helper supplies Authorization.",
      ...(errorDetail !== "" && {
        displayDetail: `Error detail: ${errorDetail}`,
      }),
    });
  }
  if (cliOwnedBearer)
    return failWithAuthRejection({
      name: serverName,
      serverRef,
      transportType,
      negotiation,
      errorCode: "CLI_OWNED_BEARER_REJECTED",
      message: `Server rejected the session credential (HTTP ${statusCode ?? 401}). It will be retried when the session credential is refreshed.`,
    });
  if (useFirstPartyAuth)
    return failFirstPartyAuthRejected(
      firstPartyBearer ?? "none",
      serverName,
      serverRef,
      transportType,
      statusCode,
      negotiation,
    );
  let isRefreshPath401 = error instanceof UnauthorizedError_2 || statusCode === 401;
  let rejectedTokenResult = await handleRejectedToken({
    name: serverName,
    serverRef,
    authProvider,
    isRefreshPath401,
    needsAuth: () =>
      connectWithRetry(
        serverName,
        serverRef,
        transportType,
        error,
        isRefreshPath401,
        roundEpoch,
        negotiation,
        storageV5,
      ),
  });
  if (rejectedTokenResult !== undefined) {
    await purgeDiscoveryCacheOnAuthFailure(serverName, serverRef, roundEpoch);
    return rejectedTokenResult;
  }
  return connectWithRetry(
    serverName,
    serverRef,
    transportType,
    error,
    isRefreshPath401,
    roundEpoch,
    negotiation,
    storageV5,
  );
}
//@ chunk-sywnjtqb.js:61839-62407 placement
/**
 * wrapFetchWithCcrSessionAuth：CCR 代理请求补会话令牌、会话头、拨号工具 ID（X-CCR-Dial-Tool-Use-Id），并记录 CCR ticket。
 */
function wrapFetchWithCcrSessionAuth(fetchFn, dialOptions, connectionKey) {
  fetchFn = stripRedirectLocation(fetchFn);
  return async (url, init) => {
    let headers = new Headers(init?.headers);
    if (!headers.has("Authorization")) {
      let sessionIngressAuthToken = getSessionIngressAuthToken();
      if (sessionIngressAuthToken) {
        getPresentedCredentialLog().record(sessionIngressAuthToken);
        headers.set("Authorization", `Bearer ${sessionIngressAuthToken}`);
      }
    }
    let currentCallId = getCurrentCallId();
    headers.delete(X_CCR_TURN_ID);
    if (currentCallId) headers.set(X_CCR_TURN_ID, currentCallId);
    headers.delete(X_CCR_DIAL_TOOL_USE_ID);
    if (dialOptions?.toolUseId !== undefined) {
      let handshakeKind = classifyHandshakeRequest(init);
      if (handshakeKind === "handshake" || (handshakeKind === "listing" && dialOptions.withListings))
        headers.set(X_CCR_DIAL_TOOL_USE_ID, dialOptions.toolUseId);
    }
    let redirect = init?.redirect === "error" ? "error" : "manual";
    let response = await fetchFn(url, {
      ...init,
      headers,
      redirect,
    });
    let connectionCache = getConnectionCache();
    connectionCache.noteHostDraining(url, response);
    if (
      connectionKey !== undefined &&
      (response.status === 401 || connectionCache.lapsedCcrSignIns.has(connectionKey)) &&
      classifyHandshakeRequest(init) !== undefined
    )
      connectionCache.noteCcrDialAnswer(connectionKey, response);
    return response;
  };
}
//@ chunk-sywnjtqb.js:62407-62664 placement
/**
 * classifyHandshakeRequest：POST 体方法为 initialize/notifications/initialized 返回 handshake，tools/list 返回 listing。
 */
function classifyHandshakeRequest(init) {
  if (init?.method?.toUpperCase() !== "POST" || typeof init.body !== "string") return;
  let method = objectSchema({
    method: stringSchema(),
  }).safeParse(safeParseJSON(init.body, false)).data?.method;
  if (method === "initialize" || method === "notifications/initialized") return "handshake";
  return method === "tools/list" ? "listing" : undefined;
}
//@ chunk-sywnjtqb.js:62664-62729 placement
var X_CCR_DIAL_TOOL_USE_ID = "X-CCR-Dial-Tool-Use-Id";
var TOOL_USE_ID_PATTERN = /^toolu_[A-Za-z0-9_-]{1,64}$/;
//@ chunk-sywnjtqb.js:62729-63679 placement
/**
 * wrapFetchWithCliOwnedBearer：给 CLI 自有服务器的请求附加会话 bearer（被扣留时不发请求）。
 */
function wrapFetchWithCliOwnedBearer(fetchFn, config) {
  let attemptRequest = async (...[url, init]) => {
    let requestMeta = {
      method: (init?.method ?? "GET").toUpperCase(),
      body: init?.body,
    };
    await runBeforeRequestHook(config, requestMeta);
    let headers = new Headers(init?.headers);
    let bearerFingerprint = null;
    let isBearerWithheld = false;
    if (!headers.has("Authorization")) {
      let bearerTokenFor = await resolveBearerTokenFor(config);
      if (bearerTokenFor) {
        getPresentedCredentialLog().record(bearerTokenFor);
        headers.set("Authorization", `Bearer ${bearerTokenFor}`);
        bearerFingerprint = shortHash(bearerTokenFor);
      } else {
        isBearerWithheld = true;
        let refusalMessage = withheldBearerRefusalFor(config);
        if (refusalMessage !== undefined)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            refusalMessage,
            "CLI-owned MCP request not sent: its bearer was withheld",
          );
      }
    }
    let ownedHeaders = {};
    for (let [key, value] of Object.entries(cliOwnedRequestHeaders(config, requestMeta)))
      if (
        !headers.has(key) &&
        key.toLowerCase() !== "authorization" &&
        !(isBearerWithheld && isCredentialRequestHeader(config, key))
      ) {
        headers.set(key, value);
        ownedHeaders[key] = value;
      }
    let response = await fetchFn(url, {
      ...init,
      headers,
      redirect: "error",
    });
    notifyResponseObserver(config, {
      method: requestMeta.method,
      status: response.status,
      headers: response.headers,
      requestHeaders: {
        get: (headerName) =>
          headerName.toLowerCase() === "authorization" || isCredentialRequestHeader(config, headerName)
            ? null
            : headers.get(headerName),
      },
      bearerFingerprint,
    });
    return {
      response,
      owned: ownedHeaders,
    };
  };
  return async (url, init) => {
    let { response, owned } = await attemptRequest(url, init);
    if (!(await shouldResendRequest(config, response, owned))) return response;
    await response.body?.cancel().catch(() => {});
    let retryResult = await attemptRequest(url, init);
    shouldResendRequest(config, retryResult.response, retryResult.owned);
    return retryResult.response;
  };
}
//@ chunk-sywnjtqb.js:63679-63941 placement
/**
 * ClaudeAiProxyBearerRejectedError：claude.ai 代理拒绝会话令牌（可能缺连接器作用域），错误码 CLAUDEAI_BEARER_REJECTED。
 */
class ClaudeAiProxyBearerRejectedError extends Error {
  code = "CLAUDEAI_BEARER_REJECTED";
  reasonCode = "claudeai_bearer_rejected";
  constructor() {
    super(
      "claude.ai rejected the session token \u2014 it may lack connector scopes or be invalid. Run /login.",
    );
    this.name = "ClaudeAiProxyBearerRejectedError";
  }
}
//@ chunk-sywnjtqb.js:63941-65118 placement
/**
 * createClaudeAiProxyFetch：claude.ai 代理 fetch：附加 OAuth 访问令牌，401 时刷新令牌重试一次，仍被拒抛 ClaudeAiProxyBearerRejectedError。
 */
function withProxyBearerRefresh(fetchFn, credentials) {
  fetchFn = stripRedirectLocation(fetchFn);
  return async (url, init) => {
    let doRequest = async () => {
      await checkAndRefreshOAuthTokenIfNeeded({
        credentials,
      });
      let currentTokens =
        isStorageV5Enabled() && credentials !== undefined
          ? await getClaudeAIOAuthTokensAsync(credentials)
          : getClaudeAIOAuthTokens();
      if (!currentTokens) throw Error("No claude.ai OAuth token available");
      let headers = new Headers(init?.headers);
      getPresentedCredentialLog().record(currentTokens.accessToken);
      headers.set("Authorization", `Bearer ${currentTokens.accessToken}`);
      let redirect = init?.redirect === "error" ? "error" : "manual";
      return {
        response: await fetchFn(url, {
          ...init,
          headers,
          redirect,
        }),
        sentToken: currentTokens.accessToken,
      };
    };
    async function normalizeErrorResponse(response) {
      if (response.status >= 400 && response.headers.get("content-type")?.includes("text/event-stream")) {
        let text = await response.text();
        let found = text
          .split(
            `
`,
          )
          .find((line) => line.startsWith("data: "));
        return new Response(found ? found.slice(6) : text, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
      return response;
    }
    let { response, sentToken } = await doRequest();
    if (response.status !== 401) return normalizeErrorResponse(response);
    let proxyErrorCode = response.headers.get("X-Mcp-Error-Code") ?? undefined;
    if (proxyErrorCode) {
      logEvent("tengu_mcp_claudeai_proxy_401", {
        tokenChanged: false,
        proxyErrorCode: sanitizedFeatureErrorCodeForTelemetry(proxyErrorCode),
      });
      return response;
    }
    let proxyCode = await handleOAuth401Error(sentToken, credentials).catch(() => false);
    logEvent("tengu_mcp_claudeai_proxy_401", {
      tokenChanged: proxyCode,
    });
    if (!proxyCode) {
      let now =
        isStorageV5Enabled() && credentials !== undefined
          ? await readFreshOAuthAccessToken(credentials)
          : getClaudeAIOAuthTokens()?.accessToken;
      if (!now || now === sentToken) throw new ClaudeAiProxyBearerRejectedError();
    }
    let response_2 = (await doRequest()).response;
    if (response_2.status === 401 && !response_2.headers.get("X-Mcp-Error-Code"))
      throw new ClaudeAiProxyBearerRejectedError();
    return normalizeErrorResponse(response_2);
  };
}
//@ chunk-sywnjtqb.js:65118-65630 placement
/**
 * expandFirstPartyDesignScopes：Design 连接器需要时为 claude.ai 登录追加 user:design:read/write 作用域。
 */
async function expandFirstPartyDesignScopes(url, credentials) {
  if (isDesignMcpUrl(url)) {
    let scaffoldResult = await getScaffoldResolver()?.(credentials);
    if (scaffoldResult?.ok) {
      if (scaffoldResult.expanded) {
        noteScopeExpansion(
          "Added user:design:read and user:design:write to your claude.ai login (for the Design MCP connector).",
        );
        logEvent("tengu_mcp_first_party_scope_expanded", {
          pathPrefix: lit("/v1/design/"),
        });
      }
      return {
        accessToken: scaffoldResult.accessToken,
        bearer: scaffoldResult.bearer,
      };
    }
  }
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials,
  });
  let tokens =
    isStorageV5Enabled() && credentials !== undefined
      ? await getClaudeAIOAuthTokensAsync(credentials)
      : getClaudeAIOAuthTokens();
  if (!tokens?.accessToken) return;
  return {
    accessToken: tokens.accessToken,
    bearer: tokens.scopes?.includes("user:design:read") ? "design_scoped_login" : "login",
  };
}
//@ chunk-sywnjtqb.js:65630-65859 placement
/**
 * readNeedsConsentBit：Design 服务器响应体为 {error:"needs_consent", consent} 时返回 consent 位。
 */
async function readNeedsConsentBit(response) {
  let notice = peekScopeExpansionNotice();
  if (notice === null) return null;
  let body;
  try {
    body = await response.clone().json();
  } catch {
    return null;
  }
  if (body == null || typeof body !== "object" || body.error !== "needs_consent") return null;
  let consent = body.consent;
  return notice.isConsentBit(consent) ? consent : null;
}
//@ chunk-sywnjtqb.js:65859-65996 placement
function noteDesignProjectId(designSession, isDesignServer, name, payload) {
  if (!isDesignServer || !MEMBERSHIP_METHODS.has(name)) return;
  let projectId = payload.project_id;
  if (typeof projectId === "string" && projectId.length > 0) {
    clearApprovedPlans(designSession, projectId);
    clearPlansForProject(designSession, projectId);
    clearVerifiedProjectGrant(designSession, projectId);
    markRecardProject(designSession, projectId);
  }
}
//@ chunk-sywnjtqb.js:65996-66061 placement
var DESIGN_WRITE_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sywnjtqb.js:65996", () => {
  DESIGN_WRITE_TOOLS = new Set(["write_files", "create_support_js", "copy_files"]);
});
//@ chunk-sywnjtqb.js:66061-66588 placement
/**
 * gateDesignWriteWithoutPlanToken：Design 写工具缺 plan_token 时拒绝（只允许原生 Claude Design 工具无令牌写）。
 */
function gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, name, input) {
  if (!isFirstPartyDesignServer || !DESIGN_WRITE_TOOLS.has(name)) return null;
  let planToken = input?.plan_token;
  if (typeof planToken === "string" && planToken.length > 0) return null;
  return {
    behavior: "deny",
    message: `${name}: writing without a plan_token is available only through the native Claude Design tool \u2014 call finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "tokenless design writes are native-tool-only \u2014 this connector surface has no reserved-path or grant-approval flow",
      classifierApprovable: false,
    },
  };
}
//@ chunk-sywnjtqb.js:66588-66650 placement
var DESIGN_PLAN_TOOLS; // deferred: uses DESIGN_WRITE_TOOLS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sywnjtqb.js:66588", () => {
  DESIGN_PLAN_TOOLS = new Set([
    ...DESIGN_WRITE_TOOLS,
    "finalize_plan",
    "delete_files",
    ...MEMBERSHIP_METHODS,
  ]);
});
//@ chunk-sywnjtqb.js:66650-66687 placement
function isDesignGatedTool(isFirstPartyDesignServer, name) {
  return isFirstPartyDesignServer && DESIGN_PLAN_TOOLS.has(name);
}
//@ chunk-sywnjtqb.js:66687-66979 placement
/**
 * askDesignConsent：生成 Design 同意请求的权限结果（ask，附 __consentNonce，仅本地显示，不可被分类器批准）。
 */
function askDesignConsent(message, input, __consentNonce) {
  return {
    behavior: "ask",
    message,
    updatedInput: {
      ...input,
      __consentNonce,
    },
    localDisplayOnly: true,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "design agent consent \u2014 approving records a server-side grant for Claude agents to write your design projects",
      classifierApprovable: false,
    },
  };
}
//@ chunk-sywnjtqb.js:66979-67053 placement
function isDesignServerConfig(config) {
  return (
    (config.type === "sse" || config.type === "http") &&
    isDesignMcpUrl(config.url) &&
    !configHasAuthorizationHeader(config)
  );
}
//@ chunk-sywnjtqb.js:67053-67207 placement
/**
 * canAskDesignConsent：交互会话且不在 bypass 模式时可以弹 Design 同意请求。
 */
function canAskDesignConsent(tool) {
  let toolPermissionContext = getToolPermissionContext(tool);
  return (
    !tool.options.isNonInteractiveSession &&
    toolPermissionContext.mode !== "bypassPermissions" &&
    !(toolPermissionContext.mode === "plan" && toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-sywnjtqb.js:67207-67379 placement
/**
 * canPromptForPermission：非 bypass/dontAsk 且未要求避免权限提示。
 */
function canPromptForPermission(tool) {
  let toolPermissionContext = getToolPermissionContext(tool);
  return (
    toolPermissionContext.mode !== "bypassPermissions" &&
    toolPermissionContext.mode !== "dontAsk" &&
    !(toolPermissionContext.mode === "plan" && toolPermissionContext.isBypassPermissionsModeAvailable) &&
    !toolPermissionContext.shouldAvoidPermissionPrompts
  );
}
//@ chunk-sywnjtqb.js:67379-67390 placement
var MAX_DESIGN_CONSENT_ASKS = 100;
//@ chunk-sywnjtqb.js:67390-67662 placement
/**
 * rememberDesignConsentAsk：按 toolUseId 记录待确认的 consent 位与 nonce（最多 100 条）。
 */
function rememberDesignConsentAsk(toolUseId, consentBit, askReachesUser) {
  let firstPartyDesignConsentAsks = getCliOwnedState().firstPartyDesignConsentAsks;
  let existingAsk = firstPartyDesignConsentAsks.get(toolUseId);
  let sameBit = existingAsk !== undefined && existingAsk.bit === consentBit;
  let nonce = sameBit ? existingAsk.nonce : randomUUID();
  firstPartyDesignConsentAsks.delete(toolUseId);
  firstPartyDesignConsentAsks.set(toolUseId, {
    bit: consentBit,
    nonce,
    askReachesUser: sameBit ? existingAsk.askReachesUser && askReachesUser : askReachesUser,
  });
  while (firstPartyDesignConsentAsks.size > MAX_DESIGN_CONSENT_ASKS) {
    let oldestToolUseId = firstPartyDesignConsentAsks.keys().next().value;
    if (oldestToolUseId === undefined) break;
    firstPartyDesignConsentAsks.delete(oldestToolUseId);
  }
  return nonce;
}
//@ chunk-sywnjtqb.js:67662-67872 placement
/**
 * takeDesignConsentAsk：取出并删除 toolUseId 对应的同意记录，nonce 必须一致。
 */
function takeDesignConsentAsk(toolUseId, nonce) {
  if (toolUseId === undefined) return null;
  let firstPartyDesignConsentAsks = getCliOwnedState().firstPartyDesignConsentAsks;
  let ask = firstPartyDesignConsentAsks.get(toolUseId) ?? null;
  firstPartyDesignConsentAsks.delete(toolUseId);
  if (ask === null || nonce === undefined || ask.nonce !== nonce) return null;
  return {
    bit: ask.bit,
    askReachesUser: ask.askReachesUser,
  };
}
//@ chunk-sywnjtqb.js:67872-68705 placement
/**
 * wrapCallWithDesignConsent：Design 工具调用遇 needs_consent 时：已批准的位直接提交同意并重试，否则提示用户重试或运行 /design consent。
 */
function wrapCallWithDesignConsent(callTool, options) {
  let { designSession, approvedConsentBit, consentAskReachesUser, credentials } = options;
  return async (requestOptions) => {
    let notice = peekScopeExpansionNotice();
    try {
      let result = await callTool(requestOptions);
      if (approvedConsentBit !== null && !requestOptions.aborted)
        notice?.seedDesignConsentBit(designSession, approvedConsentBit, true);
      return result;
    } catch (error) {
      if (!(error instanceof FirstPartyDesignNeedsConsentError) || !notice) throw error;
      let consent = error.consent;
      if (consent !== approvedConsentBit) {
        notice.seedDesignConsentBit(designSession, consent, false);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${notice.consentPromptFor(consent)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
          "first-party design MCP needs_consent (not shown)",
        );
      }
      if (!consentAskReachesUser) {
        notice.seedDesignConsentBit(designSession, consent, false);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${notice.consentPromptFor(consent)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
          "first-party design MCP needs_consent (no prompt)",
        );
      }
      await notice.postDesignConsent(designSession, consent, credentials);
      return callTool(requestOptions);
    }
  };
}
//@ chunk-sywnjtqb.js:68705-69599 placement
/**
 * wrapFetchWithFirstPartyAuth：一方 MCP 服务器请求附加 claude.ai 登录 bearer，记录最后使用的凭证类型。
 */
function wrapFetchWithFirstPartyAuth(fetchFn, credentials, bearerTracker) {
  fetchFn = stripRedirectLocation(fetchFn);
  return async (url, init) => {
    let headers = new Headers(init?.headers);
    let redirect = init?.redirect === "error" ? "error" : "manual";
    if (headers.has("Authorization") || !isFirstPartyMcpUrl(url) || !isFirstPartyProvider())
      return fetchFn(url, {
        ...init,
        redirect,
      });
    let sendWithAuth = async () => {
      let designAuth = await expandFirstPartyDesignScopes(url, credentials);
      bearerTracker.last = designAuth?.bearer ?? "none";
      if (!designAuth)
        return {
          response: await fetchFn(url, {
            ...init,
            redirect,
          }),
          sentToken: undefined,
        };
      let accessToken = designAuth.accessToken;
      getPresentedCredentialLog().record(accessToken);
      let headers = {
        ...Object.fromEntries(new Headers(init?.headers)),
        Authorization: `Bearer ${accessToken}`,
      };
      return {
        response: await fetchFn(url, {
          ...init,
          headers,
          redirect,
        }),
        sentToken: accessToken,
      };
    };
    let checkConsent = async (attempt) => {
      if (attempt.response.status === 403 && attempt.sentToken && isDesignMcpUrl(url)) {
        let consent = await readNeedsConsentBit(attempt.response);
        if (consent !== null) throw new FirstPartyDesignNeedsConsentError(consent);
      }
    };
    let firstAttempt = await sendWithAuth();
    await checkConsent(firstAttempt);
    let { response, sentToken } = firstAttempt;
    if (response.status !== 401 || !sentToken) return response;
    if (!(await handleOAuth401Error(sentToken, credentials).catch(() => false))) {
      let freshToken =
        isStorageV5Enabled() && credentials !== undefined
          ? await readFreshOAuthAccessToken(credentials)
          : getClaudeAIOAuthTokens()?.accessToken;
      if (!freshToken || freshToken === sentToken) return response;
    }
    let retryAttempt;
    try {
      retryAttempt = await sendWithAuth();
    } catch {
      return response;
    }
    await checkConsent(retryAttempt);
    return retryAttempt.response;
  };
}
//@ chunk-sywnjtqb.js:69599-69822 placement
/**
 * mergeRequestHeaders：合并请求头，固定 User-Agent 与 Accept-Encoding: identity。
 */
function mergeRequestHeaders(headers, baseHeaders, extraHeaders) {
  let headers_2 = new Headers({
    "User-Agent": getMCPUserAgent(),
    "Accept-Encoding": "identity",
    ...baseHeaders,
  });
  new Headers(headers).forEach((value, key) => headers_2.set(key, value));
  for (let [key, value] of Object.entries(extraHeaders)) headers_2.set(key, value);
  headers_2.set("Accept", "text/event-stream");
  return headers_2;
}
//@ chunk-sywnjtqb.js:69890-70003 placement
function normalizeImageMimeType_2(mimeType) {
  if (!mimeType) return false;
  let lower = firstLineOf(mimeType, ";").trim().toLowerCase();
  return SUPPORTED_IMAGE_TYPES_4.has(lower === "image/jpg" ? "image/jpeg" : lower);
}
//@ chunk-sywnjtqb.js:70003-70042 placement
/**
 * 工具调用超时的下限（60 秒）。
 */
var RETRYABLE_HTTP_STATUSES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MIN_TOOL_TIMEOUT_MS;
deferInit("chunk-sywnjtqb.js:70003", () => {
  RETRYABLE_HTTP_STATUSES = new Set([500, 502, 504]);
  MIN_TOOL_TIMEOUT_MS = 60000;
});
//@ chunk-sywnjtqb.js:70042-70188 placement (2.1.88 match: getMcpToolTimeoutMs, 1)
/**
 * MCP 工具调用总超时：配置 timeout（≥1000ms 才算）优先，其次 env `MCP_TOOL_TIMEOUT`，再夹在下限与上限之间；都没有用默认值。（v2）
 */
function getMcpToolTimeoutMs_4(config) {
  let timeoutMs =
    (config?.timeout !== undefined && config.timeout >= 1000 ? config.timeout : undefined) ??
    env.MCP_TOOL_TIMEOUT;
  return timeoutMs !== undefined
    ? Math.min(Math.max(timeoutMs, MIN_TOOL_TIMEOUT_MS), MAX_TIMER_DELAY_MS)
    : MIN_TOOL_TIMEOUT_MS;
}
//@ chunk-sywnjtqb.js:70188-70231 placement
/**
 * MCP 普通请求超时：取工具超时与连接超时（MCP_TIMEOUT）两者的较大值。（v2）
 */
function getMcpRequestTimeoutMs_2(config) {
  return Math.max(getMcpToolTimeoutMs_4(config), getConnectionTimeoutMs());
}
//@ chunk-sywnjtqb.js:70231-70276 placement (2.1.88 match: MCP_STREAMABLE_HTTP_ACCEPT, 1)
var MCP_STREAMABLE_HTTP_ACCEPT_2 = "application/json, text/event-stream";
//@ chunk-sywnjtqb.js:70276-70354 placement
function wrapFetchNoop(fetchWithInit) {
  return async (url, init) => {
    try {
      return await fetchWithInit(url, init);
    } catch (error) {
      rethrowRedactedFetchError(error, url);
    }
  };
}
//@ chunk-sywnjtqb.js:70354-70912 placement (2.1.88 match: wrapFetchWithTimeout, 0.761)
/**
 * wrapFetchWithTimeout：非 GET 请求加超时（按服务器配置），补 Accept: application/json, text/event-stream 与 traceparent。
 */
function wrapFetchWithTimeout_2(fetchFn, config) {
  let mcpRequestTimeoutMs = getMcpRequestTimeoutMs_2(config);
  return async (url, init) => {
    if ((init?.method ?? "GET").toUpperCase() === "GET") return fetchFn(url, init);
    let headers = new Headers(init?.headers);
    if (!headers.has("accept")) headers.set("accept", MCP_STREAMABLE_HTTP_ACCEPT_2);
    if (shouldPropagateTraceContext()) {
      let activeSpanId = getActiveSpanId();
      if (activeSpanId && !headers.has("traceparent")) headers.set("traceparent", activeSpanId);
    }
    let controller = new AbortController();
    let timer = setTimeout(
      (controller) => controller.abort(new DOMException("The operation timed out.", "TimeoutError")),
      requestTimeoutForBody(mcpRequestTimeoutMs, init?.body),
      controller,
    );
    timer.unref?.();
    let signal = init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal;
    try {
      return await fetchFn(url, {
        ...init,
        headers,
        signal,
        ...(getMcpToolTimeoutMs_4(config) > 300000 && {
          timeout: false,
        }),
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
//@ chunk-sywnjtqb.js:70912-70971 placement (2.1.88 match: getMcpServerConnectionBatchSize, 1)
/**
 * 本地 MCP 服务器（stdio/sdk）并发连接批大小：env `MCP_SERVER_CONNECTION_BATCH_SIZE`，默认 3。（v2）
 */
function getMcpServerConnectionBatchSize_2() {
  return env.MCP_SERVER_CONNECTION_BATCH_SIZE ?? 3;
}
//@ chunk-sywnjtqb.js:70971-71038 placement (2.1.88 match: getRemoteMcpServerConnectionBatchSize, 1)
/**
 * 远程 MCP 服务器并发连接批大小：env `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE`，默认 20。（v2）
 */
function getRemoteMcpServerConnectionBatchSize_2() {
  return env.MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE ?? 20;
}
//@ chunk-sywnjtqb.js:71038-71101 placement (2.1.88 match: isLocalMcpServer, 1)
/**
 * 判断是否本地服务器：未写 type、stdio 或 sdk。决定连接批次与是否自动重连。（v2）
 */
function isLocalMcpServer_2(config) {
  return !config.type || config.type === "stdio" || config.type === "sdk";
}
//@ chunk-sywnjtqb.js:71101-71161 placement (2.1.88 match: ALLOWED_IDE_TOOLS, 1)
var ALLOWED_IDE_TOOLS_2 = ["mcp__ide__executeCode", "mcp__ide__getDiagnostics"];
//@ chunk-sywnjtqb.js:71161-71226 placement (2.1.88 match: isIncludedMcpTool, 1)
function isIncludedMcpTool_3(tool) {
  return !tool.startsWith("mcp__ide__") || ALLOWED_IDE_TOOLS_2.includes(tool);
}
//@ chunk-sywnjtqb.js:71226-71259 placement
function isIdeServer_2(serverRef) {
  return isIncludedMcpTool_3(serverRef.name);
}
//@ chunk-sywnjtqb.js:71259-71297 placement
/**
 * 判断服务器地址是否命中某开关的主机列表。
 */
function featureHostListMatches(gateFeature, serverRef) {
  return matchesHostList(getFeatureValue_CACHED_MAY_BE_STALE(gateFeature, []), serverRef);
}
//@ chunk-sywnjtqb.js:71297-71683 placement
/**
 * 判断 MCP 服务器地址的主机（或 CCR 代理目标主机）是否匹配主机列表（支持 * 与子域）。
 */
function matchesHostList(hosts, serverRef) {
  if (!Array.isArray(hosts) || hosts.length === 0) return false;
  if (hosts.includes("*")) return true;
  if (!("url" in serverRef) || typeof serverRef.url !== "string") return false;
  let flattened = [
    URL.canParse(serverRef.url) ? new URL(serverRef.url).hostname.toLowerCase() : undefined,
    ccrProxyTargetHost(serverRef.url),
  ].flatMap((host) => (host === undefined ? [] : [host]));
  return hosts.some((listedHost) => {
    if (typeof listedHost !== "string" || listedHost === "") return false;
    let lower = listedHost.toLowerCase();
    return flattened.some((host) => host === lower || host.endsWith(`.${lower}`));
  });
}
//@ chunk-sywnjtqb.js:71683-71762 placement
/**
 * 该服务器是否在 elicitation 拒绝名单里。
 */
function isElicitationDenylisted(serverRef) {
  return featureHostListMatches("tengu_mcp_legacy_url_elicitation_server_denylist", serverRef);
}
//@ chunk-sywnjtqb.js:71762-71829 placement
function shouldNormalizeRootCombinators_2(config) {
  return featureHostListMatches("tengu_mcp_normalize_root_combinators", config);
}
//@ chunk-sywnjtqb.js:71829-71895 placement
function shouldDropInvalidToolSchemas_2(config) {
  return featureHostListMatches("tengu_mcp_drop_invalid_tool_schemas", config);
}
//@ chunk-sywnjtqb.js:71895-72009 placement
/**
 * 测试专用：设置是否保留过期的重新认证条目（非测试调用时抛错）。
 */
function setHoldStaleReauthEntryForTest_2(enabled) {
  if (enabled) throw Error("setHoldStaleReauthEntryForTest is test-only");
  getCliOwnedState().holdStaleReauthEntryForTest = enabled;
}
//@ chunk-sywnjtqb.js:72009-72057 placement
/**
 * 测试用：设置重新认证决策的接收器。
 */
function setReauthDecisionSinkForTest(reauthDecisionSinkForTest) {
  getCliOwnedState().reauthDecisionSinkForTest = reauthDecisionSinkForTest;
}
//@ chunk-sywnjtqb.js:72057-72367 placement
/**
 * getMcpRoots（v2 副本）。
 */
function getMcpRoots_2(includeStagingRoot = false) {
  let extraRoots = [];
  if (includeStagingRoot)
    try {
      extraRoots = [pluginToolStagingRoot()];
    } catch (error) {
      logForDebugging(`MCP: staging root unavailable, omitted from roots/list: ${errorMessage(error)}`);
    }
  let seenUris = new Set();
  let roots = [];
  let toolsMachine = getToolsMachine();
  let workingDirectory = toolsMachine ? (toolsMachine.directory?.path ?? null) : getOriginalCwdOrNull();
  for (let directoryPath of [
    ...(workingDirectory === null ? [] : [workingDirectory]),
    ...getAnnouncedDirectories(),
    ...extraRoots,
  ]) {
    let href = pathToFileURL(directoryPath).href;
    if (seenUris.has(href)) continue;
    seenUris.add(href);
    roots.push({
      uri: href,
    });
  }
  return {
    roots,
  };
}
//@ chunk-sywnjtqb.js:72367-72397 placement
var ROOTLESS_PLUGIN_NAMES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sywnjtqb.js:72367", () => {
  ROOTLESS_PLUGIN_NAMES_2 = new Set(["documents"]);
});
//@ chunk-sywnjtqb.js:72397-72541 placement
function isDocumentsPluginServer_2(serverRef) {
  if (getPlatform() === "windows") return false;
  if (!serverRef.pluginSource) return false;
  try {
    return ROOTLESS_PLUGIN_NAMES_2.has(parsePluginIdentifier(serverRef.pluginSource).name.toLowerCase());
  } catch {
    return false;
  }
}
//@ chunk-sywnjtqb.js:72541-72678 placement
function notifyRootsListChanged_2() {
  for (let liveClient of getConnectionCache().liveClients)
    liveClient.sendRootsListChanged().catch((error) => {
      logForDebugging(`MCP: failed to send roots/list_changed: ${describeErrorBrief(error)}`);
    });
}
//@ chunk-sywnjtqb.js:72678-73133 placement
/**
 * MCP SDK 错误码集合与可识别的 JSON Schema 草案地址集合。
 */
var MCP_SDK_ERROR_CODES; // deferred: uses OAuthErrorCode (../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs) of its import cycle while loading; runs once the cycle is complete
var KNOWN_JSON_SCHEMA_DIALECTS;
deferInit("chunk-sywnjtqb.js:72678", () => {
  MCP_SDK_ERROR_CODES = new Set(Object.values(SdkErrorCode));
  KNOWN_JSON_SCHEMA_DIALECTS = new Set([
    "http://json-schema.org/draft-04/schema",
    "https://json-schema.org/draft-04/schema",
    "http://json-schema.org/draft-06/schema",
    "https://json-schema.org/draft-06/schema",
    "http://json-schema.org/draft-07/schema",
    "https://json-schema.org/draft-07/schema",
    "http://json-schema.org/draft/2019-09/schema",
    "https://json-schema.org/draft/2019-09/schema",
    "http://json-schema.org/schema",
    "https://json-schema.org/schema",
  ]);
});
//@ chunk-sywnjtqb.js:73133-73322 placement
/**
 * JSON Schema 校验器包装：工具 schema 的 $schema 是已知草案（draft-04/06/07/2019-09）时先去掉该字段再交给内层校验器，避免因方言声明报错。
 */
class LegacyDialectToleratingValidator {
  inner = new AjvJsonSchemaValidator();
  getValidator(schema) {
    let $schema = schema.$schema;
    if ($schema !== undefined && KNOWN_JSON_SCHEMA_DIALECTS.has($schema.replace(/#$/, ""))) {
      let { $schema, ...schemaWithoutDialect } = schema;
      return this.inner.getValidator(schemaWithoutDialect);
    }
    return this.inner.getValidator(schema);
  }
}
//@ chunk-sywnjtqb.js:73322-73798 placement
/**
 * 常见连接错误码对应的人类可读提示。
 */
var CONNECTION_ERROR_HINTS_2 = [
  ["ECONNRESET", "Connection reset - server may have crashed or restarted"],
  ["ETIMEDOUT", "Connection timeout - network issue or server unresponsive"],
  ["ECONNREFUSED", "Connection refused - server may be down"],
  ["EPIPE", "Broken pipe - server closed connection unexpectedly"],
  ["EHOSTUNREACH", "Host unreachable - network connectivity issue"],
  ["ESRCH", "Process not found - stdio server process terminated"],
  ["spawn", "Failed to spawn process - check command and permissions"],
];
//@ chunk-sywnjtqb.js:73798-73810 placement
/**
 * stdio 探测的默认超时（3000 毫秒）。
 */
var DEFAULT_STDIO_PROBE_TIMEOUT_MS = 3000;
//@ chunk-sywnjtqb.js:73810-73931 placement
/**
 * 测试专用：设置 stdio 探测超时（非测试调用时抛错）。
 */
function setStdioProbeTimeoutMsForTest(timeoutMs) {
  if (timeoutMs !== undefined) throw Error("setStdioProbeTimeoutMsForTest is test-only");
  getCliOwnedState().stdioProbeTimeoutMsForTest = timeoutMs;
}
//@ chunk-sywnjtqb.js:73931-73988 placement
function getStdioProbeTimeoutMs() {
  return getCliOwnedState().stdioProbeTimeoutMsForTest ?? DEFAULT_STDIO_PROBE_TIMEOUT_MS;
}
//@ chunk-sywnjtqb.js:73988-74066 placement
/**
 * 默认握手超时（5000 毫秒）。
 */
var REMOTE_PROBE_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_HANDSHAKE_TIMEOUT_MS;
var NEGOTIABLE_TRANSPORTS;
deferInit("chunk-sywnjtqb.js:73988", () => {
  REMOTE_PROBE_TIMEOUT_MS = 5000;
  DEFAULT_HANDSHAKE_TIMEOUT_MS = 5000;
  NEGOTIABLE_TRANSPORTS = new Set(["http", "claudeai-proxy", "ccr-proxy", "stdio"]);
});
//@ chunk-sywnjtqb.js:74066-74132 placement
function getHandshakeTimeoutMs(probeReserveMs = DEFAULT_HANDSHAKE_TIMEOUT_MS) {
  let connectionTimeoutMs = getConnectionTimeoutMs();
  return Math.max(connectionTimeoutMs - probeReserveMs, Math.floor(connectionTimeoutMs / 3));
}
//@ chunk-sywnjtqb.js:74132-74470 placement
/**
 * classifyTransportKind：in-process/ccr-toolport/ccr-proxy/http/sse/ws/ide/claudeai-proxy/sdk-control/stdio。
 */
function classifyTransportKind(type, { inProcess, ccrProxy, ccrToolport }) {
  if (inProcess) return "in-process";
  switch (type) {
    case "http":
      return ccrToolport ? "ccr-toolport" : ccrProxy ? "ccr-proxy" : "http";
    case "sse":
      return "sse";
    case "ws":
      return "ws";
    case "sse-ide":
    case "ws-ide":
      return "ide";
    case "claudeai-proxy":
      return "claudeai-proxy";
    case "sdk":
      return "sdk-control";
    case "stdio":
    case undefined:
      return "stdio";
  }
}
//@ chunk-sywnjtqb.js:74470-74705 placement
function rewriteInitializeCapabilities(client, serverRef, stripTasks) {
  let originalSend = client.send.bind(client);
  client.send = (message, requestOptions) => {
    if (
      isJSONRPCRequest(message) &&
      message.method === "initialize" &&
      message.params?.capabilities !== undefined
    ) {
      let capabilities = clientCapabilitiesFor(serverRef, {
        denylisted: isElicitationDenylisted(serverRef),
      });
      return originalSend(
        {
          ...message,
          params: {
            ...message.params,
            capabilities: stripTasks ? stripTasksCapability(capabilities) : capabilities,
          },
        },
        requestOptions,
      );
    }
    return originalSend(message, requestOptions);
  };
}
//@ chunk-sywnjtqb.js:74705-74773 placement
/**
 * isNegotiationDenylisted：服务器主机在 tengu_mcp_negotiation_server_denylist 中。
 */
function isNegotiationDenylisted(serverRef) {
  return featureHostListMatches("tengu_mcp_negotiation_server_denylist", serverRef);
}
//@ chunk-sywnjtqb.js:74773-74836 placement
/**
 * isListenDenylisted：服务器主机在 tengu_mcp_listen_server_denylist 中（不发 subscriptions/listen）。
 */
function isListenDenylisted(serverRef) {
  return featureHostListMatches("tengu_mcp_listen_server_denylist", serverRef);
}
//@ chunk-sywnjtqb.js:74836-74935 placement
/**
 * 按 tengu_tender_truffle 名单判断服务器是否命中。
 */
function tenderTruffleMatch(serverRef) {
  let { value: listedValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    "tengu_tender_truffle",
    [],
  );
  return {
    listed: matchesHostList(listedValue, serverRef),
    source,
  };
}
//@ chunk-sywnjtqb.js:74935-76364 placement
/**
 * resolveVersionNegotiation：决定协议版本协商模式。MCP_PROTOCOL_NEGOTIATION=legacy|auto 优先；否则按传输查 GrowthBook tengu_mcp_protocol_negotiation_http/_claudeai/_stdio/_ccr（默认 true → auto），sse/ws/ide/进程内/sdk 一律 legacy；命中 tengu_mcp_negotiation_server_denylist 也回 legacy。auto 带探测超时（远程 5 秒，stdio 可测试覆盖，均不超过连接超时的 1/3）。
 */
function resolveVersionNegotiation(transportKind, config, denylisted) {
  let MCP_PROTOCOL_NEGOTIATION = env.MCP_PROTOCOL_NEGOTIATION;
  let requestedMode =
    MCP_PROTOCOL_NEGOTIATION === "legacy" || MCP_PROTOCOL_NEGOTIATION === "auto"
      ? MCP_PROTOCOL_NEGOTIATION
      : undefined;
  if (MCP_PROTOCOL_NEGOTIATION !== undefined && requestedMode === undefined)
    logForDebugging(
      `MCP_PROTOCOL_NEGOTIATION=${MCP_PROTOCOL_NEGOTIATION} is invalid; expected 'legacy' or 'auto' \u2014 ignoring`,
      {
        level: "warn",
      },
    );
  if (requestedMode === "legacy")
    return {
      mode: "legacy",
    };
  let probe = {
    timeoutMs: Math.min(REMOTE_PROBE_TIMEOUT_MS, Math.floor(getConnectionTimeoutMs() / 3)),
  };
  let probe_2 = {
    timeoutMs: Math.min(getStdioProbeTimeoutMs(), Math.floor(getConnectionTimeoutMs() / 3)),
  };
  if (requestedMode === "auto") {
    if (!NEGOTIABLE_TRANSPORTS.has(transportKind))
      return {
        mode: "legacy",
      };
    return transportKind === "stdio"
      ? {
          mode: "auto",
          probe: probe_2,
        }
      : {
          mode: "auto",
          probe,
        };
  }
  let modeChoice = (() => {
    switch (transportKind) {
      case "http":
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_protocol_negotiation_http", true) === false
          ? {
              mode: "legacy",
            }
          : {
              mode: "auto",
              probe,
            };
      case "claudeai-proxy":
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_protocol_negotiation_claudeai", true) === false
          ? {
              mode: "legacy",
            }
          : {
              mode: "auto",
              probe,
            };
      case "stdio":
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_protocol_negotiation_stdio", true) === false
          ? {
              mode: "legacy",
            }
          : {
              mode: "auto",
              probe: probe_2,
            };
      case "ccr-proxy":
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_protocol_negotiation_ccr", true) === false
          ? {
              mode: "legacy",
            }
          : {
              mode: "auto",
              probe,
            };
      case "sse":
      case "ws":
      case "ide":
      case "ccr-toolport":
      case "in-process":
      case "sdk-control":
        return {
          mode: "legacy",
        };
    }
  })();
  if (modeChoice.mode === "auto" && config !== undefined && (denylisted ?? isNegotiationDenylisted(config))) {
    let denylistedLabel = "a url-less server (the '*' entry)";
    if ("url" in config && typeof config.url === "string") {
      try {
        denylistedLabel = new URL(config.url).hostname;
      } catch {
        denylistedLabel = "a server with an unparseable url";
      }
      let proxyTargetHost = ccrProxyTargetHost(config.url);
      if (proxyTargetHost !== undefined)
        denylistedLabel = `the proxy host ${denylistedLabel} or the mcp_url host ${proxyTargetHost}`;
    }
    logForDebugging(`MCP era negotiation denylist matched ${denylistedLabel}; the legacy handshake applies`);
    return {
      mode: "legacy",
    };
  }
  return modeChoice;
}
//@ chunk-sywnjtqb.js:76364-76762 placement
/**
 * Java MCP SDK 拒绝 elicitation 能力的错误识别：错误正则、错误体 schema、读取上限与给用户的修复提示。
 */
var JAVA_ELICITATION_REJECT_REGEX; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var javaErrorBodySchema;
var MAX_JAVA_ERROR_BODY;
var JAVA_SDK_ELICITATION_HINT;
deferInit("chunk-sywnjtqb.js:76364", () => {
  JAVA_ELICITATION_REJECT_REGEX =
    /Unrecognized field \\?"(?:form|url)\\?" \(class [\w.$]*ClientCapabilities\$Elicitation\)/;
  javaErrorBodySchema = DoctorLazy(() =>
    objectSchema({
      message: literal("Invalid message format"),
      stackTrace: array(
        objectSchema({
          className: stringSchema(),
        }),
      ),
    }),
  );
  MAX_JAVA_ERROR_BODY = 262144;
  JAVA_SDK_ELICITATION_HINT = `This server (Java MCP SDK 0.17.0 or older) rejected Claude Code's elicitation capability. Set "bareElicitationCapability": true for it, or upgrade to Java MCP SDK 0.17.1+ (Spring AI 1.0.7+ or 1.1.6+).`;
});
//@ chunk-sywnjtqb.js:76762-77002 placement
function isJavaSdkElicitationRejection(error, serverRef, transport) {
  let usesModernProtocol =
    transport instanceof StreamableHTTPClientTransport_2 && transport.protocolVersion !== undefined;
  return (
    (((error instanceof ProtocolError || error instanceof SdkHttpError) &&
      JAVA_ELICITATION_REJECT_REGEX.test(error.message)) ||
      (error instanceof SdkHttpError &&
        error.status === 400 &&
        !usesModernProtocol &&
        isJavaSdkStackTraceBody(error.data.text))) &&
    clientCapabilitiesFor(serverRef, {
      denylisted: isElicitationDenylisted(serverRef),
    }).elicitation?.url !== undefined
  );
}
//@ chunk-sywnjtqb.js:77002-77208 placement
function isJavaSdkStackTraceBody(text) {
  if (typeof text !== "string" || text.length > MAX_JAVA_ERROR_BODY) return false;
  let parseResult = javaErrorBodySchema().safeParse(safeParseJSON(text, false));
  return (
    parseResult.success &&
    parseResult.data.stackTrace.some((stackFrame) =>
      stackFrame.className.startsWith("io.modelcontextprotocol.server.transport."),
    )
  );
}
//@ chunk-sywnjtqb.js:77208-77388 placement
function isNonJsonRpcClientError(error) {
  if (!(error instanceof SdkHttpError)) return false;
  let status = error.status;
  if (!(status >= 400 && status < 500) || status === 401 || status === 403 || status === 429) return false;
  let text = error.data.text;
  if (typeof text !== "string") return true;
  return !isJsonRpcErrorBody_2(text);
}
//@ chunk-sywnjtqb.js:77388-77576 placement
function isJsonRpcErrorBody_2(text) {
  let found = text.split(/\r?\n/).find((line) => line.startsWith("data:"));
  let payload = safeParseJSON(found === undefined ? text : found.slice(5), false);
  return isJSONRPCErrorResponse_2(
    typeof payload === "object" && payload !== null && "id" in payload && payload.id === null
      ? {
          ...payload,
          id: undefined,
        }
      : payload,
  );
}
//@ chunk-sywnjtqb.js:77576-77901 placement
/**
 * getListingDiscoverPrior：claudeai-proxy（非 stateless）的 discover 先验：discoverSupport=legacy → legacy；supported 且开关 all → 用 /v1/mcp_servers 投影的 DiscoverResult 作为 modern 先验，省去线上 server/discover。
 */
function getListingDiscoverPrior(serverRef) {
  if (serverRef.type !== "claudeai-proxy" || serverRef.stateless === true) return;
  let projectionPrior = discoverProjectionPrior();
  if (projectionPrior === "off") return;
  if (getCliOwnedState().burnedListingDiscoverPriors.has(serverRef.id)) return;
  if (serverRef.discoverSupport === "legacy")
    return {
      kind: "legacy",
    };
  if (projectionPrior !== "all" || serverRef.discoverSupport !== "supported") return;
  let cachedDiscoverResult = getCachedDiscoverResult(serverRef);
  return cachedDiscoverResult === undefined
    ? undefined
    : {
        kind: "modern",
        discover: cachedDiscoverResult,
      };
}
//@ chunk-sywnjtqb.js:77901-78012 placement
/**
 * burnDiscoverPrior：基于先验的连接被拒后，本进程内不再使用该先验；legacy 先验同时删除持久判定。
 */
function burnDiscoverPrior(serverRef, kind, storageV5) {
  let discoverVerdictKey = getDiscoverVerdictKey(serverRef);
  if (discoverVerdictKey !== undefined) {
    getCliOwnedState().burnedListingDiscoverPriors.add(discoverVerdictKey);
    if (kind === "legacy") forgetDiscoverVerdict(serverRef, storageV5);
  }
}
//@ chunk-sywnjtqb.js:78012-78278 placement
/**
 * getRememberedLegacyPrior：可记键的服务器若判定表记为 legacy peer，返回 {kind:'legacy'} 先验。
 */
async function getRememberedLegacyPrior(config, storageV5) {
  let discoverVerdictKey = getDiscoverVerdictKey(config);
  if (
    discoverVerdictKey === undefined ||
    (config.type === "claudeai-proxy" &&
      (config.stateless === true || config.discoverSupport === "supported")) ||
    (isStdioConfig(config) && env.MCP_PROTOCOL_NEGOTIATION === "auto") ||
    getCliOwnedState().burnedListingDiscoverPriors.has(discoverVerdictKey)
  )
    return;
  return (await isRememberedLegacyPeer(config, storageV5))
    ? {
        kind: "legacy",
      }
    : undefined;
}
//@ chunk-sywnjtqb.js:78278-78335 placement (2.1.88 match: initializeAgentMemorySnapshots, 0.502)
/**
 * MCP initialize / tools/list 方法判定（MCP 客户端代码，切分误归）。
 */
function isSessionHandshakeMethod(agents) {
  return agents === "initialize" || agents === "tools/list";
}
//@ chunk-sywnjtqb.js:78335-78527 placement
/**
 * MCP JSON-RPC 错误码分类（rpc_era / rpc_session）。
 */
function classifyMcpRpcErrorCode(code, method) {
  if (
    code === ProtocolErrorCode.UnsupportedProtocolVersion ||
    code === ProtocolErrorCode.MissingRequiredClientCapability
  )
    return "rpc_era";
  if (
    code === ProtocolErrorCode.InvalidRequest ||
    (code === ProtocolErrorCode.MethodNotFound && isSessionHandshakeMethod(method))
  )
    return "rpc_session";
  return;
}
//@ chunk-sywnjtqb.js:78527-78686 placement
/**
 * MCP 连接错误分类（ProtocolError / SdkHttpError）。
 */
function classifyMcpConnectError(error, method) {
  if (error instanceof ProtocolError) return classifyMcpRpcErrorCode(error.code, method);
  if (error instanceof SdkHttpError) {
    if (
      error.status === 400 ||
      ((error.status === 404 || error.status === 405) && isSessionHandshakeMethod(method))
    )
      return "http_4xx";
  }
  return;
}
//@ chunk-sywnjtqb.js:78686-78882 placement
/**
 * HTTP 400 且响应体是 JSON-RPC 错误码 UnsupportedProtocolVersion / MissingRequiredClientCapability 时为真；握手分类用来判断"协议代际不符"。
 */
function isUnsupportedVersionHttp400(error) {
  if (!(error instanceof SdkHttpError) || error.status !== 400 || typeof error.data.text !== "string")
    return false;
  let errorCode = discoverErrorCode(error.data.text);
  return (
    errorCode === ProtocolErrorCode.UnsupportedProtocolVersion ||
    errorCode === ProtocolErrorCode.MissingRequiredClientCapability
  );
}
//@ chunk-sywnjtqb.js:78882-79038 placement
/**
 * makeConnectTimeoutError（v2 副本）。
 */
function makeConnectTimeoutError_2(message) {
  let error = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    message,
    "MCP connection timeout",
  );
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_timeout_retry", true))
    return Object.assign(error, {
      code: "CONNECT_TIMEOUT",
    });
  return error;
}
//@ chunk-sywnjtqb.js:79038-79142 placement (2.1.88 match: getServerCommandArray, 0.781)
/**
 * 插件来源的 stdio 服务器连接失败时，按服务器签名在认证/失败缓存文件里写一条带时间戳的记录（经 authCacheWriteChain 串行化写入），下次可跳过。
 */
function recordPluginStdioServerFailure(serverName, config, storageV5) {
  if ((config.type === "stdio" || config.type === undefined) && config.pluginSource !== undefined)
    isMcpAuthCached_3(serverName, configHash(config), undefined, storageV5);
}
//@ chunk-sywnjtqb.js:79142-79980 placement
/**
 * 包装传输 send：initialize 请求发出后立刻预发 tools/list（超时取 2×连接超时与上限的较小者），减少一次往返；出错时撤销包装，结果记入连接统计 sentAhead。
 */
async function pipelineEarlyToolsList(client, transport, connectionTimeoutMs, aheadState, windowed, server) {
  let send = transport.send;
  let initializePromise;
  let toolsListPromise;
  let pageController;
  function startAheadPage() {
    let startTime = performance.now();
    pageController = new AbortController();
    toolsListPromise = client.request(
      {
        method: "tools/list",
      },
      server,
      {
        timeout: Math.min(2 * getConnectionTimeoutMs(), MAX_TIMER_DELAY_MS),
        signal: pageController.signal,
      },
    );
    toolsListPromise.catch(() => {});
    aheadState.sentAhead = true;
    setAheadPage(aheadState, toolsListPromise, startTime);
  }
  let sendWrapper = (message, requestOptions) => {
    if (windowed && isInitializeMessage(message)) {
      let sentPromise = send.call(transport, message, requestOptions);
      startAheadPage();
      return sentPromise;
    }
    if (initializePromise !== undefined || !isInitializedNotification(message))
      return send.call(transport, message, requestOptions);
    if (transport.send === sendWrapper) transport.send = send;
    initializePromise = send.call(transport, message, requestOptions);
    initializePromise.catch(() => {});
    return Promise.resolve();
  };
  transport.send = sendWrapper;
  let onerror = client.onerror;
  client.onerror = (error) => {
    takeAheadPage(aheadState);
    onerror?.(error);
  };
  function apptAbort() {
    takeAheadPage(aheadState);
    client.close().catch(() => {});
  }
  try {
    await client.connect(transport, {
      timeout: connectionTimeoutMs,
    });
    if (initializePromise === undefined) return;
    if (windowed) {
      let timer = setTimeout(apptAbort, connectionTimeoutMs);
      timer.unref?.();
      initializePromise.catch(apptAbort).finally(() => clearTimeout(timer));
    } else {
      if (client.getServerCapabilities()?.tools !== undefined) startAheadPage();
      try {
        await initializePromise;
      } catch (error) {
        apptAbort();
        throw error;
      }
    }
  } finally {
    client.onerror = onerror;
    if (transport.send === sendWrapper) transport.send = send;
  }
  if (toolsListPromise !== undefined && pageController !== undefined)
    armRequestTimeout(toolsListPromise, pageController);
  armAheadExpiry(aheadState);
}
//@ chunk-sywnjtqb.js:79980-80016 placement
/**
 * 2×连接超时不超过该服务器的有效工具超时时才允许预发 tools/list。
 */
function hasBudgetForEarlyToolsList(config) {
  return 2 * getConnectionTimeoutMs() <= getMcpRequestTimeoutMs_2(config);
}
//@ chunk-sywnjtqb.js:80198-80210 placement
/**
 * 记录消息流结果前的固定延迟（2000 毫秒）。
 */
var INITIALIZED_EVENT_DELAY_MS = 2000;
//@ chunk-sywnjtqb.js:80210-80592 placement
/**
 * 在 initialized 通知应答后的固定延迟时记录消息流结果事件。
 */
function scheduleMessageStreamOutcomeLog(client, name, traceState, events) {
  let answeredAtMs =
    traceState.initializedNotificationAnsweredAtMs ??
    (traceState.pendingMethod === "notifications/initialized" ? performance.now() : undefined);
  if (answeredAtMs === undefined) return;
  setTimeout(
    (clientArg, serverNameArg, traceStateArg, eventsArg) =>
      logEvent("tengu_mcp_message_stream_outcome", {
        ...eventsArg,
        messageStreamGetOutcome: hasNoTransport(clientArg)
          ? lit("client_closed")
          : fromEnum(traceStateArg.messageStreamGetOutcome),
        mcpServerKeyHash: toolNameForTelemetry(serverNameArg),
      }),
    Math.max(0, answeredAtMs + INITIALIZED_EVENT_DELAY_MS - performance.now()),
    client,
    name,
    traceState,
    events,
  ).unref?.();
}
//@ chunk-sywnjtqb.js:80592-120383 placement
/**
 * connectToServer（v2）：按 name+config 记忆化的连接入口。建传输（sse/sse-ide/ws-ide/ws/http/claudeai-proxy/进程内 Chrome/stdio），组装 fetch 包装（超时、OAuth、头、一方登录、CCR 认证、discover -32601 侦测、握手计时）；按 resolveVersionNegotiation 决定 auto（先 server/discover 再按结果 modern 或 legacy initialize）或 legacy；处理 listing 先验、记住的 legacy 判定、stateless 代理本地应答、探测超时/拒绝后的重启与回退、HTTP→SSE 回退；成功后注册 roots/list、elicitation、onclose/onerror 清理与 list_changed 订阅，失败分类为 failed/needs-auth。
 */
var connectToServer; // deferred: uses memoizeWithExternalCache (./needsAuthCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sywnjtqb.js:80592", () => {
  connectToServer = memoizeWithExternalCache(
    async (name, serverRef, serverStats, storageV5, credentials, dialOptions, connectOptions) => {
      primeEnsureConnected();
      let now = Date.now();
      let clockSnapshot = startClockSnapshot(connectOptions?.clock ?? systemClock);
      let activeClockSnapshot;
      let roundEpoch = identityEpoch();
      let announcedDirectories = getAnnouncedDirectories();
      let transport = serverRef.type ?? "stdio";
      logForDiagnosticsNoPII("info", "mcp_connect_starting", {
        transport,
      });
      if (isUnconfiguredUrl(serverRef)) {
        let configError = serverRef.configError ?? "No URL configured for this server";
        logMCPDebug(name, configError);
        logForDiagnosticsNoPII("info", "mcp_connect_skipped", {
          transport,
          reason: "unconfigured",
        });
        return {
          name,
          type: "failed",
          config: serverRef,
          error: configError,
          errorCode: "UNCONFIGURED",
        };
      }
      {
        let configError = serverRef.configError;
        if (!configError && "url" in serverRef)
          try {
            new URL(serverRef.url);
          } catch {
            configError = "'url' is not a valid URL. Update the server's config and reconnect.";
          }
        if (configError) {
          logEvent("tengu_mcp_server_config_invalid", {
            transportType: fromEnum(serverRef.type ?? "stdio"),
            field: lit("url"),
            source: lit(serverRef.configError ? "loader" : "connect"),
          });
          logMCPDebug(name, configError);
          logMCPError(name, configError);
          logForDiagnosticsNoPII("warn", "mcp_connect_failed", {
            transport,
            duration_ms: Date.now() - now,
            reason: "invalid_config",
          });
          logFeatureBad("mcp_connect", "mcp_connect_invalid_config");
          return {
            name,
            type: "failed",
            config: serverRef,
            error: configError,
            errorCode: "INVALID_CONFIG",
          };
        }
      }
      let inProcessServer;
      let authProvider;
      let stdioPendingCgroup = false;
      let stdioCgroupCapped = false;
      let transport_2;
      let processUptimeAtConnectStartMs = isDiskless() ? undefined : Math.round(process.uptime() * 1000);
      let handshakeTrace;
      let legacySseTransportFactory;
      let stdioTransportOptions;
      let modernTransportFactory;
      let sseTransportFactory;
      let retriedWithoutElicitation = false;
      let probeFallbackReason;
      let options = false;
      let connectionState = false;
      let discoverPrior;
      let discoverSource;
      let discoverSourceEnum;
      let setDiscoverSource = (sourceValue) => {
        discoverSource = sourceValue;
        discoverSourceEnum = fromEnumOpt(sourceValue);
      };
      let listingPriorBurned = false;
      let usedRememberedLegacy = false;
      let discoverMethodNotFound = false;
      let discoverPriorLabel = () =>
        usedRememberedLegacy ? "the remembered legacy verdict" : "the /v1/mcp_servers discover projection";
      let wireReprobe = false;
      let negotiation;
      let connectBudgetExpired = false;
      let toolsListAheadState;
      let listenDenylisted = isListenDenylisted(serverRef);
      let negotiationDenylisted = isNegotiationDenylisted(serverRef);
      let classifyProbeEvidence = () => {
        if (negotiation?.mode !== "auto" || probeFallbackReason !== undefined) return;
        let _anthropicProbeLegacyEvidence = transport_2?._anthropicProbeLegacyEvidence;
        if (_anthropicProbeLegacyEvidence === "id-mismatch") probeFallbackReason = lit("probe_id_mismatch");
        else if (_anthropicProbeLegacyEvidence === "malformed") probeFallbackReason = lit("probe_malformed");
        else if (_anthropicProbeLegacyEvidence === "stream-end")
          probeFallbackReason = lit("probe_stream_end");
        if (probeFallbackReason !== undefined)
          logMCPDebug(
            name,
            `era probe classified the server legacy in-SDK (${String(_anthropicProbeLegacyEvidence)}); the 2025 handshake was used for this connect attempt`,
          );
      };
      try {
        let armWatchdogs = function () {
          let armedAt = Date.now();
          for (let activeCallWatchdog of transportErrorState.activeCallWatchdogs)
            if (activeCallWatchdog.armedAt === 0) activeCallWatchdog.armedAt = armedAt;
        };
        let isCcrInjectedUrl = isCcrInjectedMcpUrl(name, serverRef);
        let hasCliBearer = hasCliOwnedBearer(serverRef);
        let configHasAuthHeader =
          (serverRef.type === "sse" || serverRef.type === "http") && configHasAuthorizationHeader(serverRef);
        let serverHeaders =
          serverRef.type === "sse" || serverRef.type === "http" || serverRef.type === "ws"
            ? await getMcpServerHeaders(name, serverRef)
            : {};
        let helperMintsAuthHeader =
          (serverRef.type === "sse" || serverRef.type === "http") &&
          !!serverRef.headersHelper &&
          hasAuthorizationHeader(serverHeaders);
        let useFirstPartyAuth =
          (serverRef.type === "sse" || serverRef.type === "http") &&
          !configHasAuthHeader &&
          !helperMintsAuthHeader &&
          !hasCliBearer &&
          !isCcrInjectedUrl &&
          isFirstPartyMcpUrl(serverRef.url) &&
          isFirstPartyProvider() &&
          (!!(
            isStorageV5Enabled() && credentials !== undefined
              ? await getClaudeAIOAuthTokensAsync(credentials)
              : getClaudeAIOAuthTokens()
          )?.accessToken ||
            (isDesignMcpUrl(serverRef.url) && (await checkConsent(credentials))));
        if (useFirstPartyAuth)
          logEvent("tengu_mcp_first_party_auto_auth", {
            transportType: fromEnum(serverRef.type),
            ...mcpServerKeyHashEntry(serverRef, name),
          });
        let firstPartyBearerState = {};
        if (serverRef.type === "sse") {
          recordPresentedHeaderSecrets(serverRef.headers, serverHeaders);
          let authProvider_2 =
            configHasAuthHeader || helperMintsAuthHeader || useFirstPartyAuth || hasCliBearer
              ? undefined
              : new ClaudeAuthProvider_2(name, serverRef);
          authProvider = authProvider_2;
          let sseProxyOptions = await mcpProxyFetchOptions(serverRef.url);
          let fetchFn = createBoundedFetch(wrapFetchNoop(createFetchWithInit(undefined, sseProxyOptions)));
          if (authProvider_2) fetchFn = wrapFetchWithStepUpDetection_2(fetchFn, authProvider_2);
          fetchFn = wrapFetchWithTimeout_2(fetchFn, serverRef);
          if (useFirstPartyAuth)
            fetchFn = wrapFetchWithFirstPartyAuth(fetchFn, credentials, firstPartyBearerState);
          let sseTransportOptions = {
            authProvider: authProvider_2,
            skipIssuerMetadataValidation: true,
            fetch: fetchFn,
            requestInit: {
              ...sseProxyOptions,
              headers: {
                "User-Agent": getMCPUserAgent(),
                "Accept-Encoding": "identity",
                ...serverHeaders,
              },
            },
          };
          let fetchFn_2 = wrapFetchNoop(async (url, init) => {
            let authHeaders = {};
            let tokens = await authProvider_2?.tokens();
            if (tokens) authHeaders.Authorization = `Bearer ${tokens.access_token}`;
            let proxyOptions = await mcpProxyFetchOptions(String(url));
            return fetch(url, {
              ...init,
              ...proxyOptions,
              headers: mergeRequestHeaders(init?.headers, authHeaders, serverHeaders),
            });
          });
          sseTransportOptions.eventSourceInit = {
            fetch: createBoundedFetch(
              authProvider_2
                ? wrapFetchWithStepUpDetection_2(fetchFn_2, authProvider_2)
                : useFirstPartyAuth
                  ? wrapFetchWithFirstPartyAuth(fetchFn_2, credentials, firstPartyBearerState)
                  : fetchFn_2,
            ),
          };
          sseTransportFactory = () => new SSEClientTransport_2(new URL(serverRef.url), sseTransportOptions);
          transport_2 = sseTransportFactory();
          logMCPDebug(name, "SSE transport initialized, awaiting connection");
        } else if (serverRef.type === "sse-ide") {
          logMCPDebug(name, `Setting up SSE-IDE transport to ${redactUrlSecrets(serverRef.url)}`);
          let sseIdeOptions = {
            fetch: createBoundedFetch(globalThis.fetch),
            requestInit: {
              headers: {
                "User-Agent": getMCPUserAgent(),
                "Accept-Encoding": "identity",
              },
            },
          };
          transport_2 = new SSEClientTransport_2(new URL(serverRef.url), sseIdeOptions);
        } else if (serverRef.type === "ws-ide") {
          let webSocketTLSOptions = getWebSocketTLSOptions(serverRef.url);
          getPresentedCredentialLog().record(serverRef.authToken);
          let headers = {
            "User-Agent": getMCPUserAgent(),
            ...(serverRef.authToken && {
              "X-Claude-Code-Ide-Authorization": serverRef.authToken,
            }),
          };
          let webSocket = new globalThis.WebSocket(serverRef.url, {
            protocols: ["mcp"],
            headers,
            proxy: getWebSocketProxyUrl(serverRef.url),
            tls: webSocketTLSOptions || undefined,
          });
          transport_2 = new WebSocketTransport(webSocket, (data) => JSONRPCMessageSchema_2.parse(data));
        } else if (serverRef.type === "ws") {
          recordPresentedHeaderSecrets(serverRef.headers, serverHeaders);
          logMCPDebug(name, `Initializing WebSocket transport to ${redactUrlSecrets(serverRef.url)}`);
          let webSocketTLSOptions = getWebSocketTLSOptions(serverRef.url);
          let sessionAuthToken = isCcrInjectedUrl ? getSessionIngressAuthToken() : null;
          getPresentedCredentialLog().record(sessionAuthToken ?? undefined);
          let wsHeaders = {
            "User-Agent": getMCPUserAgent(),
            ...(sessionAuthToken && {
              Authorization: `Bearer ${sessionAuthToken}`,
            }),
            ...serverHeaders,
          };
          let headers = redactHeaders(wsHeaders);
          logMCPDebug(
            name,
            `WebSocket transport options: ${jsonStringify({
              url: redactUrlSecrets(serverRef.url),
              headers,
              hasSessionAuth: !!sessionAuthToken,
            })}`,
          );
          let webSocket = new globalThis.WebSocket(serverRef.url, {
            protocols: ["mcp"],
            headers: wsHeaders,
            proxy: getWebSocketProxyUrl(serverRef.url),
            tls: webSocketTLSOptions || undefined,
          });
          transport_2 = new WebSocketTransport(webSocket, (data) => JSONRPCMessageSchema_2.parse(data));
        } else if (serverRef.type === "http") {
          recordPresentedHeaderSecrets(serverRef.headers, serverHeaders);
          if (keepsMCPDebug()) {
            logMCPDebug(name, `Initializing HTTP transport to ${redactUrlSecrets(serverRef.url)}`);
            logMCPDebug(name, `Node version: ${process.version}, Platform: linux`);
            logMCPDebug(
              name,
              `Environment: ${jsonStringify({
                NODE_OPTIONS: env.NODE_OPTIONS || "not set",
                UV_THREADPOOL_SIZE: env.UV_THREADPOOL_SIZE || "default",
                HTTP_PROXY: redactUrlsInText(env.HTTP_PROXY || "not set"),
                HTTPS_PROXY: redactUrlsInText(env.HTTPS_PROXY || "not set"),
                NO_PROXY: env.NO_PROXY || "not set",
              })}`,
            );
          }
          let authProvider_2 =
            configHasAuthHeader ||
            helperMintsAuthHeader ||
            useFirstPartyAuth ||
            hasCliBearer ||
            isCcrInjectedUrl
              ? undefined
              : new ClaudeAuthProvider_2(name, serverRef);
          authProvider = authProvider_2;
          let httpProxyOptions = await mcpProxyFetchOptions(serverRef.url);
          let fetchFn = createBoundedFetch(
            wrapFetchNoop(
              createFetchWithInit(isCcrInjectedUrl ? hostedWorkerFetch : undefined, httpProxyOptions),
            ),
            {
              refusesCodings: issuerKey_3(serverRef.url),
            },
          );
          if (authProvider_2) fetchFn = wrapFetchWithStepUpDetection_2(fetchFn, authProvider_2);
          fetchFn = wrapFetchWithTimeout_2(fetchFn, serverRef);
          if (useFirstPartyAuth)
            fetchFn = wrapFetchWithFirstPartyAuth(fetchFn, credentials, firstPartyBearerState);
          if (isCcrInjectedUrl)
            fetchFn = wrapFetchSkipListenGet(
              wrapFetchWithCcrSessionAuth(fetchFn, dialOptions, serverCacheKey(name, serverRef)),
              name,
              serverRef.url,
            );
          fetchFn = restrictRemoteRepoCalls(fetchFn, serverRef);
          if (issuerKey_3(serverRef.url)) {
            let innerFetch = fetchFn;
            fetchFn = (url, init) => {
              let finishTiming = init?.method === "POST" ? getRequestTimingStore()?.mark("own") : undefined;
              return innerFetch(url, init).finally(finishTiming);
            };
          }
          if (hasCliBearer) fetchFn = wrapFetchWithCliOwnedBearer(fetchFn, serverRef);
          if (getDiscoverVerdictKey(serverRef) !== undefined)
            fetchFn = wrapFetchDetectDiscoverMethodNotFound(fetchFn, () => {
              discoverMethodNotFound = true;
            });
          let handshakeTrace_2 = createHandshakeTrace({
            mcpUrl: serverRef.url,
            keepAliveDisabled: httpProxyOptions.keepalive === false,
            getAnsweredLocally: false,
            statelessGated: false,
          });
          handshakeTrace = handshakeTrace_2;
          fetchFn = wrapFetchWithHandshakeTrace(fetchFn, handshakeTrace_2);
          let httpTransportOptions = {
            authProvider: authProvider_2,
            skipIssuerMetadataValidation: true,
            fetch: fetchFn,
            requestInit: {
              ...httpProxyOptions,
              headers: {
                "User-Agent": getMCPUserAgent(),
                "Accept-Encoding": "identity",
                ...serverHeaders,
              },
            },
          };
          if (keepsMCPDebug()) {
            let headers = httpTransportOptions.requestInit?.headers
              ? redactHeaders(httpTransportOptions.requestInit.headers)
              : undefined;
            logMCPDebug(
              name,
              `HTTP transport options: ${jsonStringify({
                url: redactUrlSecrets(serverRef.url),
                headers,
                hasAuthProvider: !!authProvider_2,
                timeoutMs: getMcpRequestTimeoutMs_2(serverRef),
              })}`,
            );
          }
          modernTransportFactory = () => {
            resetHandshakeTrace(handshakeTrace_2);
            return new StreamableHTTPClientTransport_2(new URL(serverRef.url), httpTransportOptions);
          };
          transport_2 = modernTransportFactory();
          logMCPDebug(name, "HTTP transport created successfully");
          if (!isCcrHostedConfig(serverRef) && !isFirstPartyMcpUrl(serverRef.url) && !hasCliBearer)
            legacySseTransportFactory = ({ postMethodNotAllowed, dialSignal, dialConnected }) => {
              let withDialSignal = (init) =>
                dialConnected()
                  ? init
                  : {
                      ...init,
                      signal: init?.signal ? AbortSignal.any([init.signal, dialSignal]) : dialSignal,
                    };
              let sawNonOk = false;
              let eventSourceFetch = async (url, init) => {
                let response = await fetchFn(url, withDialSignal(init));
                if (!postMethodNotAllowed && !sawNonOk) {
                  if (response.status === 401) {
                    await response.body?.cancel().catch(() => {});
                    throw Error(
                      "legacy HTTP+SSE stream GET answered 401 after the initialize POST was not a 405; not starting OAuth against this URL",
                    );
                  }
                  sawNonOk = response.ok;
                }
                return response;
              };
              let transportFetch = (url, init) =>
                init?.body instanceof URLSearchParams && init.body.has("grant_type")
                  ? fetchFn(url, init)
                  : fetchFn(url, withDialSignal(init));
              return new SSEClientTransport_2(new URL(serverRef.url), {
                authProvider: authProvider_2,
                skipIssuerMetadataValidation: true,
                fetch: transportFetch,
                eventSourceInit: {
                  fetch: eventSourceFetch,
                },
                requestInit: httpTransportOptions.requestInit,
              });
            };
        } else if (serverRef.type === "sdk") throw Error("SDK servers should be handled in print.ts");
        else if (serverRef.type === "claudeai-proxy") {
          if (!isFirstPartyProvider())
            throw Error("claude.ai MCP proxy is not available on third-party providers");
          logMCPDebug(name, `Initializing claude.ai proxy transport for server ${serverRef.id}`);
          if (
            !(isStorageV5Enabled() && credentials !== undefined
              ? await getClaudeAIOAuthTokensAsync(credentials)
              : getClaudeAIOAuthTokens())
          )
            throw Error("No claude.ai OAuth token found");
          let oauthConfig = getOauthConfig();
          let proxyUrl = `${oauthConfig.MCP_PROXY_URL}${oauthConfig.MCP_PROXY_PATH.replace("{server_id}", serverRef.id)}`;
          logMCPDebug(name, `Using claude.ai proxy at ${proxyUrl}`);
          let proxyFetchOptions = getProxyFetchOptions({
            url: proxyUrl,
          });
          let proxyClient = withProxyBearerRefresh(
            createBoundedFetch(createFetchWithInit(undefined, proxyFetchOptions)),
            credentials,
          );
          let streamDisabled = isSereneTeapotEnabled();
          let answeredLocally = streamDisabled || isStatelessClaudeAiProxy_2(serverRef);
          if (answeredLocally)
            logMCPDebug(
              name,
              streamDisabled
                ? "GET notification stream disabled for claude.ai connectors; a GET the SDK sends to the proxy URL is answered locally with 405"
                : "GET notification stream disabled (stateless connector); if the SDK requests it, it gets a local 405",
            );
          let handshakeTrace_2 = createHandshakeTrace({
            mcpUrl: proxyUrl,
            keepAliveDisabled: proxyFetchOptions.keepalive === false,
            getAnsweredLocally: answeredLocally,
            statelessGated: isStatelessClaudeAiProxy_2(serverRef),
          });
          handshakeTrace = handshakeTrace_2;
          let proxyTransportOptions = {
            fetch: wrapFetchWithHandshakeTrace(
              wrapFetchDetectDiscoverMethodNotFound(
                answeredLocally
                  ? answerGetStreamLocally_2(wrapFetchWithTimeout_2(proxyClient, serverRef), proxyUrl)
                  : wrapFetchWithTimeout_2(proxyClient, serverRef),
                () => {
                  discoverMethodNotFound = true;
                },
              ),
              handshakeTrace_2,
            ),
            requestInit: {
              ...proxyFetchOptions,
              headers: {
                "User-Agent": getMCPUserAgent(),
                "Accept-Encoding": "identity",
                "X-Mcp-Client-Session-Id": getSessionId(),
              },
            },
          };
          modernTransportFactory = () => {
            resetHandshakeTrace(handshakeTrace_2);
            return new StreamableHTTPClientTransport_2(new URL(proxyUrl), proxyTransportOptions);
          };
          transport_2 = modernTransportFactory();
          logMCPDebug(name, "claude.ai proxy transport created successfully");
        } else if (isStdioConfig(serverRef) && isClaudeInChromeMCPServer(name)) {
          let { isClaudeInChromeAllowed } = await import("../../utils/claudeInChrome/setup.js");
          if (!isClaudeInChromeAllowed()) {
            logMCPDebug(name, "Skipping connection (Claude in Chrome is blocked by org policy)");
            return {
              name,
              type: "failed",
              config: serverRef,
              error: BLOCKED_BY_POLICY_REASON,
              errorCode: "POLICY_BLOCKED",
            };
          }
          let { createChromeContext } = await import("../../utils/claudeInChrome/mcpServer.js");
          let { createChromeSocketClient, createClaudeForChromeMcpServer } =
            env.CLAUDE_CODE_CHROME_LATE_MCP_SERVER === true
              ? await import("../../utils/claudeInChrome/chromeSocketMcpServer.js")
              : await import("../../utils/claudeInChrome/BROWSER_TOOLS.lazy.js");
          let { createLinkedTransportPair } = await import("./InProcessTransport.js");
          let { setChromeBinding } = await import("../../utils/claudeInChrome/permissionOverrides.js");
          let { registerChromeTabGroupCleanup } =
            await import("../../utils/claudeInChrome/closeSessionTabGroup.lazy.js");
          let chromeContext = createChromeContext(serverRef.env, {
            availabilityFunnel: true,
            credentials,
            bearerGate: async () => isClaudeInChromeAllowed(),
          });
          let chromeSocketClient = createChromeSocketClient(chromeContext);
          setChromeBinding(chromeContext, chromeSocketClient);
          registerChromeTabGroupCleanup();
          inProcessServer = createClaudeForChromeMcpServer(chromeContext, chromeSocketClient);
          let [localTransport, clientSideTransport] = createLinkedTransportPair();
          await inProcessServer.connect(clientSideTransport);
          transport_2 = localTransport;
          logMCPDebug(name, "In-process Chrome MCP server started");
        } else if (serverRef.type === "stdio" || !serverRef.type) {
          assertProgramLaunchAllowed();
          let buildStdioEnv = () => ({
            shellPrefix: env.CLAUDE_CODE_SHELL_PREFIX,
            baseEnv: shouldUseMcpAllowlistEnv()
              ? {
                  ...getDefaultEnvironment_2(),
                  ...agentProxyEnv(),
                }
              : {
                  ...subprocessEnv(),
                },
          });
          let { shellPrefix, baseEnv } = runWithPluginWriteScope(serverRef, buildStdioEnv);
          let commandLine = shellPrefix || serverRef.command;
          let commandArgs = shellPrefix
            ? [shellQuoteArgs([serverRef.command, ...serverRef.args])]
            : serverRef.args;
          let { command, args, pending, capped } = isMcpServerBackingToolHook(name)
            ? {
                command: commandLine,
                args: commandArgs,
                pending: false,
                capped: false,
              }
            : wrapCommandInCgroup("mcp", commandLine, commandArgs);
          stdioPendingCgroup = pending;
          stdioCgroupCapped = capped;
          let { CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_CHROME_MCP_ORG_DENIED, ...envWithoutChromeFlags } =
            baseEnv;
          let projectConfigRoot = getProjectConfigRoot();
          let stdioEnv = {
            ...envWithoutChromeFlags,
            CLAUDE_PROJECT_DIR: projectConfigRoot ?? getProjectRoot(),
            CLAUDE_CODE_SESSION_ID: getSessionId(),
            CLAUDECODE: "1",
            ...serverRef.env,
            ...(!isPolicyAllowed("allow_claude_browser_extension") && {
              CLAUDE_CODE_CHROME_MCP_ORG_DENIED: "1",
            }),
          };
          checkPluginBunOptions(serverRef.pluginSource, stdioEnv, envWithoutChromeFlags);
          dropEmptyBedrockBearer(stdioEnv);
          stdioTransportOptions = {
            command,
            args,
            env: stdioEnv,
            stderr: "pipe",
            ...(projectConfigRoot !== null && {
              cwd: projectConfigRoot,
            }),
          };
          transport_2 = new BoundedStdioClientTransport(stdioTransportOptions);
        } else throw Error(`Unsupported server type: ${serverRef.type}`);
        let stderrDataHandler;
        let stderrStream;
        let stderrBuffer = "";
        let attachStderrCollector = () => {
          if (serverRef.type === "stdio" || !serverRef.type) {
            let stdioTransport = transport_2;
            if (stdioTransport.stderr instanceof Readable) {
              stderrStream = stdioTransport.stderr;
              stderrDataHandler = (chunk) => {
                if (stderrBuffer.length < 67108864)
                  try {
                    stderrBuffer += chunk.toString();
                  } catch {}
              };
              stderrStream.on("data", stderrDataHandler);
            }
          }
        };
        attachStderrCollector();
        let transportKind = classifyTransportKind(serverRef.type, {
          inProcess: inProcessServer !== undefined,
          ccrProxy: isCcrHostedConfig(serverRef),
          ccrToolport: serverRef.type === "http" && isCcrMcpPath(serverRef.url),
        });
        negotiation = resolveVersionNegotiation(transportKind, serverRef, negotiationDenylisted);
        if (negotiation.mode === "auto") {
          discoverPrior = getListingDiscoverPrior(serverRef);
          if (discoverPrior === undefined) {
            discoverPrior = await getRememberedLegacyPrior(serverRef, storageV5);
            usedRememberedLegacy = discoverPrior !== undefined;
          }
        }
        let restrictRemoteHost = shouldRestrictRemoteHost(serverRef);
        let createClient = (negotiationArg) => {
          let capabilities = retriedWithoutElicitation
            ? clientCapabilitiesForSdk()
            : negotiationArg.mode === "auto"
              ? clientCapabilitiesWithElicitation()
              : clientCapabilitiesFor(serverRef, {
                  denylisted: isElicitationDenylisted(serverRef),
                });
          let clientInstance = new Client_2(
            {
              name: "claude-code",
              title: "Claude Code",
              version:
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.318",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-11-03T18:52:53Z",
                  GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION ?? "unknown",
              description: "Anthropic's agentic coding tool",
              websiteUrl: HTTPS_CLAUDE_COM_CLAUDE_CODE,
            },
            {
              capabilities: restrictRemoteHost ? stripTasksCapability(capabilities) : capabilities,
              jsonSchemaValidator: isDisklessContext()
                ? NO_OP_SCHEMA_VALIDATOR
                : new LegacyDialectToleratingValidator(),
              responseCacheStore: makeStepUpDialog(name),
              versionNegotiation: negotiationArg,
              ...(listenDenylisted
                ? {}
                : {
                    listChanged: {
                      tools: {
                        autoRefresh: false,
                        debounceMs: 0,
                        onChanged: () => noteListChangedAhead_2(clientInstance),
                      },
                      prompts: {
                        autoRefresh: false,
                        debounceMs: 0,
                        onChanged: () => {},
                      },
                      resources: {
                        autoRefresh: false,
                        debounceMs: 0,
                        onChanged: () => {},
                      },
                    },
                  }),
            },
          );
          clientInstance.setRequestHandler("roots/list", async () => {
            logMCPDebug(name, "Received ListRoots request from server");
            return getMcpRoots_2(isDocumentsPluginServer_2(serverRef));
          });
          if (restrictRemoteHost)
            getCliOwnedState().clientTasksDeclaredBeforeServerList.set(clientInstance, capabilities);
          return clientInstance;
        };
        let client = createClient(negotiation);
        logMCPDebug(name, `Starting connection with timeout of ${getConnectionTimeoutMs()}ms`);
        if (serverRef.type === "http" && keepsMCPDebug()) {
          logMCPDebug(name, `Testing basic HTTP connectivity to ${redactUrlSecrets(serverRef.url)}`);
          try {
            let parsedUrl = new URL(serverRef.url);
            let redactedHref = redactUrlSecrets(parsedUrl.href);
            let sanitizedUrl = URL.canParse(redactedHref) ? new URL(redactedHref) : undefined;
            logMCPDebug(
              name,
              sanitizedUrl
                ? `Parsed URL: host=${sanitizedUrl.hostname}, port=${sanitizedUrl.port || "default"}, protocol=${sanitizedUrl.protocol}`
                : `Parsed URL: ${redactedHref}`,
            );
            if (parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost")
              logMCPDebug(name, `Using loopback address: ${parsedUrl.hostname}`);
          } catch {
            logMCPDebug(name, `Failed to parse URL: ${redactUrlSecrets(serverRef.url)}`);
          }
        }
        let cachedInitialize = getCachedInitializeResult_2(serverRef);
        let discoverAnswer = getLocalDiscoverAnswer(serverRef);
        if (isStatelessClaudeAiProxy_2(serverRef)) {
          logMCPDebug(
            name,
            cachedInitialize
              ? "Stateless claudeai-proxy \u2014 resolving MCP initialize from cached projection"
              : "Stateless claudeai-proxy \u2014 no cached projection; real initialize, GET SSE suppressed",
          );
          if (discoverAnswer !== undefined)
            logMCPDebug(
              name,
              discoverAnswer === "method-not-found"
                ? "Stateless claudeai-proxy \u2014 server/discover resolved locally as legacy (method-not-found)"
                : "Stateless claudeai-proxy \u2014 resolving server/discover from cached projection",
            );
          answerHandshakeLocally_2(transport_2, cachedInitialize, discoverAnswer);
        }
        guardTransportSend(
          {
            name,
          },
          transport_2,
        );
        let isAuthError = (error) => {
          let status = error instanceof SdkHttpError ? error.status : undefined;
          return (
            error instanceof UnauthorizedError_2 ||
            (error instanceof Error && error.name === "UnauthorizedError") ||
            (error instanceof ZodError && authProvider?.sawAuthChallenge === true) ||
            error instanceof IssuerEchoCrossOriginError ||
            (serverRef.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error)) ||
            status === 401 ||
            status === 403
          );
        };
        if (negotiation.mode === "auto")
          setDiscoverSource(
            discoverPrior !== undefined
              ? usedRememberedLegacy
                ? "remembered_legacy"
                : discoverPrior.kind === "modern"
                  ? "listing_body"
                  : "listing_legacy"
              : isStatelessClaudeAiProxy_2(serverRef) &&
                  (discoverAnswer !== undefined || cachedInitialize !== undefined)
                ? "stateless_local"
                : "wire",
          );
        let listenResult;
        let connectWithPrior = async (discoverPrior, transportArg) => {
          logMCPDebug(
            name,
            discoverPrior.kind === "modern"
              ? "claude.ai proxy \u2014 adopting the /v1/mcp_servers discover projection (2026-07-28 era; no server/discover round trip)"
              : usedRememberedLegacy
                ? "remembered as a legacy peer from an earlier connect (its server/discover probe was answered method-not-found or not at all); skipping the probe"
                : "claude.ai proxy \u2014 /v1/mcp_servers projects a legacy peer; skipping the server/discover probe",
          );
          await client.connect(transportArg, {
            timeout:
              transportArg instanceof BoundedStdioClientTransport
                ? getConnectionTimeoutMs()
                : getHandshakeTimeoutMs(),
            prior: discoverPrior,
          });
          if (discoverPrior.kind !== "modern" || listenDenylisted) return;
          let listenCapabilities = listChangedCapabilities(client);
          if (listenCapabilities === undefined) return;
          try {
            let listenResultInner = await client.listen(listenCapabilities, {
              timeout: getHandshakeTimeoutMs(),
            });
            if (client.transport === undefined) return;
            listenResult = listenResultInner;
          } catch (error) {
            if (isAuthError(error) || classifyMcpConnectError(error, "subscriptions/listen") !== undefined)
              throw error;
            logMCPDebug(
              name,
              `connect-time subscriptions/listen did not establish (${truncateToLength(describeConnectError(error, serverRef), 200)}); proceeding without it`,
            );
          }
        };
        let withConnectTimeout = (connectFn, transportArg, timeoutMs) => {
          activeClockSnapshot ??= startClockSnapshot(clockSnapshot.clock);
          let connectPromise = connectFn();
          let promise = new Promise((resolve, reject) => {
            let finish = clockSnapshot.clock.setTimeout(() => {
              logMCPDebug(
                name,
                `Connection timeout triggered after ${formatConnectElapsed(clockSnapshot)} (limit: ${timeoutMs}ms)`,
              );
              if (inProcessServer) inProcessServer.close().catch(() => {});
              transportArg.close().catch(() => {});
              connectBudgetExpired = true;
              reject(
                makeConnectTimeoutError_2(
                  `MCP server "${name}" connection timed out after ${getConnectionTimeoutMs()}ms`,
                ),
              );
            }, timeoutMs);
            connectPromise.then(finish, finish);
          });
          return Promise.race([connectPromise, promise]);
        };
        let connectWithRetries = async (transport, negotiation_2) => {
          if (negotiation_2.mode === "auto") {
            rewriteInitializeCapabilities(transport, serverRef, restrictRemoteHost);
            installModernResultBackfill(transport, name);
          }
          let discoverTimedOut = false;
          let transportClosed = false;
          let toolsListFirstRequested = connectOptions?.toolsListFirst === true && name === REMOTE_DEVICES;
          let toolsListAheadSpec =
            (toolsListFirstRequested || connectOptions?.toolsListAhead === true) &&
            transportKind === "ccr-proxy" &&
            negotiation_2.mode === "legacy" &&
            discoverPrior === undefined &&
            !listenDenylisted &&
            transport instanceof StreamableHTTPClientTransport_2
              ? toolsListFirstRequested
                ? {
                    listed: true,
                    source: undefined,
                  }
                : tenderTruffleMatch(serverRef)
              : undefined;
          let toolsListAhead =
            toolsListAheadSpec === undefined
              ? undefined
              : armToolsListAhead(
                  client,
                  toolsListAheadSpec.source,
                  negotiationDenylisted,
                  toolsListAheadSpec.listed,
                );
          toolsListAheadState = toolsListAhead;
          try {
            await withConnectTimeout(
              () =>
                discoverPrior !== undefined
                  ? connectWithPrior(discoverPrior, transport)
                  : toolsListAhead !== undefined &&
                      toolsListAheadSpec?.listed &&
                      hasBudgetForEarlyToolsList(serverRef)
                    ? pipelineEarlyToolsList(
                        client,
                        transport,
                        getConnectionTimeoutMs(),
                        toolsListAhead,
                        toolsListFirstRequested,
                        isHTTPConfig(serverRef),
                      )
                    : client.connect(transport, {
                        timeout:
                          negotiation_2.mode === "auto"
                            ? getHandshakeTimeoutMs(
                                transport instanceof BoundedStdioClientTransport
                                  ? negotiation_2.probe?.timeoutMs
                                  : undefined,
                              )
                            : getConnectionTimeoutMs(),
                      }),
              transport,
              getConnectionTimeoutMs(),
            );
            if (
              transport instanceof BoundedStdioClientTransport &&
              client.autoOpenedSubscription !== undefined
            )
              try {
                await client.discover({
                  timeout: negotiation_2.probe?.timeoutMs ?? getStdioProbeTimeoutMs(),
                });
              } catch (error) {
                if (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout) {
                  discoverTimedOut = true;
                  throw error;
                }
                if (client.transport === undefined) {
                  transportClosed = true;
                  throw error;
                }
                logMCPDebug(
                  name,
                  `server/discover sent after the subscriptions/listen acknowledgement got an error (${truncateToLength(describeConnectError(error, serverRef), 200)}); the server still reads requests, so it is not restarted`,
                );
              }
          } catch (error) {
            let eraNegotiationFailed =
              negotiation?.mode === "auto" &&
              error instanceof SdkError &&
              error.code === SdkErrorCode.EraNegotiationFailed;
            let probeTimedOutError =
              !discoverTimedOut &&
              negotiation?.mode === "auto" &&
              error instanceof SdkError &&
              error.code === SdkErrorCode.RequestTimeout &&
              transport_2?._anthropicProbeTimedOut === true;
            let closedAfterProbeTimeout =
              !transportClosed &&
              negotiation?.mode === "auto" &&
              error instanceof SdkError &&
              error.code === SdkErrorCode.ConnectionClosed &&
              transport_2 instanceof BoundedStdioClientTransport &&
              transport_2._anthropicProbeTimedOut === true;
            let protocolErrorAfterProbeTimeout =
              negotiation?.mode === "auto" &&
              error instanceof ProtocolError &&
              transport_2 instanceof BoundedStdioClientTransport &&
              transport_2._anthropicProbeTimedOut === true &&
              !isJavaSdkElicitationRejection(error, serverRef, transport);
            let unsupportedVersionAfterProbe =
              protocolErrorAfterProbeTimeout &&
              error instanceof ProtocolError &&
              error.code === ProtocolErrorCode.UnsupportedProtocolVersion;
            let _anthropicRediscoverError = protocolErrorAfterProbeTimeout
              ? transport_2._anthropicRediscoverError
              : undefined;
            let stdioOverflow =
              transport_2 instanceof BoundedStdioClientTransport && transport_2.overflowError !== undefined;
            if (eraNegotiationFailed) {
              let errorData = error.data;
              let cause =
                typeof errorData === "object" && errorData !== null && "cause" in errorData
                  ? errorData.cause
                  : error.cause;
              if (cause instanceof IssuerEchoCrossOriginError) throw error;
              if (
                typeof cause === "object" &&
                cause !== null &&
                "code" in cause &&
                cause.code === "ERR_PROXY_TUNNEL" &&
                "status" in cause &&
                cause.status === 403
              )
                throw cause;
            }
            let retryPriorConnect =
              discoverPrior !== undefined &&
              modernTransportFactory !== undefined &&
              !connectBudgetExpired &&
              !isAuthError(error);
            let rememberedLegacyRejected =
              discoverPrior !== undefined &&
              usedRememberedLegacy &&
              stdioTransportOptions !== undefined &&
              error instanceof ProtocolError &&
              !isJavaSdkElicitationRejection(error, serverRef, transport);
            let timedOut =
              discoverPrior !== undefined &&
              usedRememberedLegacy &&
              stdioTransportOptions !== undefined &&
              !connectBudgetExpired &&
              error instanceof SdkError &&
              error.code === SdkErrorCode.ConnectionClosed;
            let retryNegotiation = {
              mode: "legacy",
            };
            let stdioRestartOptions = stdioTransportOptions;
            let makeFreshTransport =
              stdioRestartOptions !== undefined
                ? () => new BoundedStdioClientTransport(stdioRestartOptions)
                : (modernTransportFactory ?? sseTransportFactory);
            let restartStdioTransport = (options, stderrNote) => {
              if (stderrDataHandler && stderrStream) stderrStream.off("data", stderrDataHandler);
              if (stderrBuffer) {
                logMCPDebug(name, `${stderrNote}: ${stderrBuffer}`);
                stderrBuffer = "";
              }
              transport_2 = new BoundedStdioClientTransport(options);
              attachStderrCollector();
              return transport_2;
            };
            let restartTransportFactory =
              modernTransportFactory ??
              (stdioRestartOptions !== undefined
                ? () =>
                    restartStdioTransport(
                      stdioRestartOptions,
                      "stderr of the stdio server that answered the legacy initialize of the remembered dial with an error, before restarting it",
                    )
                : undefined);
            let reconnectWithoutElicitation = async (failedTransport, transportFactory) => {
              retriedWithoutElicitation = true;
              await failedTransport.close().catch(() => {});
              if (stderrDataHandler && stderrStream) stderrStream.off("data", stderrDataHandler);
              if (stderrBuffer) {
                logMCPDebug(
                  name,
                  `stderr of the stdio server that refused elicitation form and url, before restarting it: ${stderrBuffer}`,
                );
                stderrBuffer = "";
              }
              transport_2 = transportFactory();
              attachStderrCollector();
              return transport_2;
            };
            if (
              discoverPrior !== undefined &&
              (retryPriorConnect || rememberedLegacyRejected) &&
              restartTransportFactory !== undefined
            ) {
              let failureKind =
                classifyMcpConnectError(
                  error,
                  discoverPrior.kind === "modern" ? "subscriptions/listen" : "initialize",
                ) ??
                (error instanceof SdkError && error.code === SdkErrorCode.EraNegotiationFailed
                  ? "rpc_era"
                  : rememberedLegacyRejected
                    ? "rpc_other"
                    : undefined);
              let errorText = truncateToLength(describeConnectError(error, serverRef), 200);
              if (failureKind !== undefined) {
                logMCPDebug(
                  name,
                  stdioRestartOptions !== undefined
                    ? `the stdio server answered the initialize of a connect built from ${discoverPriorLabel()} with an error (${errorText}); discarding it and restarting the server once with the server/discover probe`
                    : `the upstream rejected a connect built from ${discoverPriorLabel()} (${errorText}); discarding it for this connector and re-probing server/discover on a fresh transport`,
                );
                burnDiscoverPrior(serverRef, discoverPrior.kind, storageV5);
                listingPriorBurned = true;
                logEvent("tengu_mcp_listing_prior_rejected", {
                  phase: lit("connect"),
                  priorKind: fromEnum(discoverPrior.kind),
                  priorSource: discoverSourceEnum,
                  reason: fromEnum(failureKind),
                  transportType: fromEnum(serverRef.type ?? "stdio"),
                  ...mcpServerKeyHashEntry(serverRef, name),
                });
              } else
                logMCPDebug(
                  name,
                  `connect built from ${discoverPriorLabel()} failed (${errorText}); retrying this dial with a wire probe, prior kept`,
                );
              wireReprobe = true;
              discoverPrior = undefined;
              setDiscoverSource("wire");
              listenResult = undefined;
              retryNegotiation = negotiation ?? retryNegotiation;
              await transport.close().catch(() => {});
              transport_2 = restartTransportFactory();
            } else if (
              (eraNegotiationFailed ||
                closedAfterProbeTimeout ||
                protocolErrorAfterProbeTimeout ||
                discoverTimedOut ||
                transportClosed ||
                timedOut) &&
              (serverRef.type === "stdio" || !serverRef.type) &&
              stdioTransportOptions !== undefined &&
              !stdioOverflow
            ) {
              logMCPDebug(
                name,
                timedOut
                  ? "stdio server remembered as a legacy peer exited during initialize, with no probe sent; restarting it once, again without the probe, within the remaining connect budget"
                  : protocolErrorAfterProbeTimeout && error instanceof ProtocolError
                    ? `stdio server rejected initialize with JSON-RPC error ${error.code} (${truncateToLength(describeConnectError(error, serverRef), 200)}) after the version negotiation probe timed out (likely a slow-starting server that read the stale probe first), and a second server/discover on the same process ${_anthropicRediscoverError === undefined ? "was not attempted (the error named only protocol versions this client lacks)" : `got no usable answer (${truncateToLength(describeConnectError(_anthropicRediscoverError, serverRef), 200)})`}; restarting it once without the probe, within the remaining connect budget`
                    : closedAfterProbeTimeout
                      ? "stdio server exited during initialize after the version negotiation probe timed out (likely a slow-starting server that exits on requests before initialize); restarting it once without the probe, within the remaining connect budget"
                      : discoverTimedOut
                        ? `stdio server negotiated ${client.getNegotiatedProtocolVersion()} and acknowledged subscriptions/listen, then did not answer a follow-up server/discover within ${negotiation_2.probe?.timeoutMs ?? getStdioProbeTimeoutMs()}ms (a server that stops reading requests while it holds the listen, as mark3labs/mcp-go 1.x before 1.1.1 does); restarting it once with the legacy handshake, which sends no listen, within the remaining connect budget`
                        : transportClosed
                          ? `stdio server acknowledged subscriptions/listen and then exited before answering a follow-up server/discover (${truncateToLength(describeConnectError(error, serverRef), 200)}); restarting it once with the legacy handshake, which sends no server/discover and no listen, within the remaining connect budget`
                          : "version negotiation probe closed the stdio server (rmcp-class pre-init hard close); respawning pinned legacy",
              );
              probeFallbackReason = timedOut
                ? lit("closed_on_remembered_dial")
                : unsupportedVersionAfterProbe
                  ? lit("era_locked_after_probe_timeout")
                  : protocolErrorAfterProbeTimeout
                    ? lit("rejected_after_probe_timeout")
                    : closedAfterProbeTimeout
                      ? lit("closed_after_probe_timeout")
                      : discoverTimedOut
                        ? lit("stalled_after_listen")
                        : transportClosed
                          ? lit("closed_after_listen")
                          : lit("closed");
              await transport.close().catch(() => {});
              options = eraNegotiationFailed || closedAfterProbeTimeout;
              connectionState =
                transport instanceof BoundedStdioClientTransport && transport.answeredProbeLate;
              transport_2 = restartStdioTransport(
                stdioTransportOptions,
                "stderr of the stdio server before restarting it",
              );
            } else if ((eraNegotiationFailed || probeTimedOutError) && modernTransportFactory !== undefined) {
              logMCPDebug(
                name,
                probeTimedOutError
                  ? `version negotiation probe timed out on the ${serverRef.type ?? "http"} transport; reconnecting pinned legacy within the remaining budget`
                  : `version negotiation probe failed on the ${serverRef.type ?? "http"} transport; reconnecting pinned legacy`,
              );
              probeFallbackReason = probeTimedOutError ? lit("probe_timeout") : lit("probe_failed");
              await transport.close().catch(() => {});
              transport_2 = modernTransportFactory();
              if (isStatelessClaudeAiProxy_2(serverRef))
                answerHandshakeLocally_2(transport_2, cachedInitialize);
            } else if (
              !isAuthError(error) &&
              isJavaSdkElicitationRejection(error, serverRef, transport) &&
              makeFreshTransport !== undefined
            ) {
              logMCPDebug(
                name,
                "server rejected elicitation form and url at initialize (Java MCP SDK 0.17.0 or older); reconnecting once without elicitation form and url",
              );
              transport_2 = await reconnectWithoutElicitation(transport, makeFreshTransport);
            } else throw error;
            client = createClient(retryNegotiation);
            guardTransportSend(
              {
                name,
              },
              transport_2,
            );
            if (retryNegotiation.mode === "auto") {
              rewriteInitializeCapabilities(transport_2, serverRef, restrictRemoteHost);
              installModernResultBackfill(transport_2, name);
            }
            let max = Math.max(
              1000,
              getConnectionTimeoutMs() - (clockSnapshot.clock.monotonicNow() - clockSnapshot.awakeStart),
            );
            let retryConnectPromise = client.connect(transport_2, {
              timeout: retryNegotiation.mode === "auto" ? Math.min(max, getHandshakeTimeoutMs()) : max,
            });
            let retryTransport = transport_2;
            let retryTimedOut = false;
            try {
              await Promise.race([
                retryConnectPromise,
                new Promise((resolve, reject) => {
                  let timer = setTimeout(
                    (transportArg, reject, serverName) => {
                      retryTimedOut = true;
                      transportArg.close().catch(() => {});
                      reject(
                        makeConnectTimeoutError_2(
                          `MCP server "${serverName}" connection timed out after ${getConnectionTimeoutMs()}ms`,
                        ),
                      );
                    },
                    max,
                    retryTransport,
                    reject,
                    name,
                  );
                  retryConnectPromise.then(
                    () => clearTimeout(timer),
                    () => clearTimeout(timer),
                  );
                }),
              ]);
            } catch (error_2) {
              let timedOut_2 = retryTimedOut;
              let isAuthFailureResult = isAuthError(error_2);
              if (
                !retriedWithoutElicitation &&
                !isAuthFailureResult &&
                !timedOut_2 &&
                makeFreshTransport !== undefined &&
                isJavaSdkElicitationRejection(error_2, serverRef, retryTransport)
              ) {
                logMCPDebug(
                  name,
                  "server rejected elicitation form and url on the reconnect (Java MCP SDK 0.17.0 or older); reconnecting once more without elicitation form and url",
                );
                let elicitationRetryTransport = await reconnectWithoutElicitation(
                  retryTransport,
                  makeFreshTransport,
                );
                guardTransportSend(
                  {
                    name,
                  },
                  elicitationRetryTransport,
                );
                client = createClient({
                  mode: "legacy",
                });
                let max = Math.max(1000, getConnectionTimeoutMs() - (Date.now() - now));
                connectBudgetExpired = false;
                try {
                  await withConnectTimeout(
                    () =>
                      client.connect(elicitationRetryTransport, {
                        timeout: max,
                      }),
                    elicitationRetryTransport,
                    max,
                  );
                  return;
                } catch (error_2) {
                  if (timedOut) {
                    forgetDiscoverVerdict(serverRef, storageV5);
                    throw error;
                  }
                  if (probeTimedOutError && !connectBudgetExpired && !isAuthError(error_2)) {
                    logMCPDebug(
                      name,
                      `the dial without elicitation form and url after the probe timeout failed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); keeping the probe timeout as the error so the connect can be retried`,
                    );
                    throw error;
                  }
                  throw error_2;
                }
              }
              if (timedOut) forgetDiscoverVerdict(serverRef, storageV5);
              if (timedOut || rememberedLegacyRejected) throw error;
              if (probeTimedOutError && !isAuthFailureResult && !timedOut_2) {
                let retryErrorText = truncateToLength(describeConnectError(error_2, serverRef), 200);
                logMCPDebug(
                  name,
                  `pinned-legacy retry after the probe timeout failed typed (${retryErrorText}); preserving the timeout classification so the connect stays ladder-retryable`,
                );
                throw error;
              }
              let probeTimeoutAfterRetry =
                error_2 instanceof SdkError &&
                error_2.code === SdkErrorCode.RequestTimeout &&
                retryTransport._anthropicProbeTimedOut === true;
              if (
                wireReprobe &&
                !isAuthFailureResult &&
                !timedOut_2 &&
                error_2 instanceof SdkError &&
                (error_2.code === SdkErrorCode.EraNegotiationFailed || probeTimeoutAfterRetry)
              ) {
                if (!listingPriorBurned) throw error;
                logMCPDebug(
                  name,
                  `wire probe after discarding ${discoverPriorLabel()} failed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); booking a retryable connect timeout so the next dial re-probes prior-free with the legacy rescue`,
                );
                throw makeConnectTimeoutError_2(
                  `MCP server "${name}" connection timed out after ${getConnectionTimeoutMs()}ms`,
                );
              }
              throw error_2;
            }
          }
        };
        try {
          try {
            await connectWithRetries(transport_2, negotiation);
          } catch (error) {
            if (
              legacySseTransportFactory === undefined ||
              (transport_2 instanceof StreamableHTTPClientTransport_2 &&
                transport_2.protocolVersion !== undefined) ||
              !isNonJsonRpcClientError(error) ||
              !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_legacy_sse_fallback", true)
            )
              throw error;
            logMCPDebug(
              name,
              `initialize POST rejected (${truncateToLength(describeConnectError(error, serverRef), 200)}); trying legacy HTTP+SSE`,
            );
            let postMethodNotAllowed = error.status === 405;
            await transport_2.close().catch(() => {});
            let savedHandshakeTrace = handshakeTrace;
            markConnectEnded(savedHandshakeTrace);
            handshakeTrace = undefined;
            let abortController = new AbortController();
            let legacySseConnected = false;
            let legacySseTransport = legacySseTransportFactory({
              postMethodNotAllowed,
              dialSignal: abortController.signal,
              dialConnected: () => legacySseConnected,
            });
            transport_2 = legacySseTransport;
            guardTransportSend(
              {
                name,
              },
              legacySseTransport,
            );
            client = createClient({
              mode: "legacy",
            });
            let sawAuthChallengeBefore = authProvider?.sawAuthChallenge === true;
            let min = Math.min(
              REMOTE_PROBE_TIMEOUT_MS,
              Math.max(1000, getConnectionTimeoutMs() - (Date.now() - now)),
            );
            connectBudgetExpired = false;
            try {
              await withConnectTimeout(
                () =>
                  client.connect(legacySseTransport, {
                    timeout: min,
                  }),
                legacySseTransport,
                min,
              );
            } catch (error_2) {
              await legacySseTransport.close().catch(() => {});
              abortController.abort();
              let sawAuthChallengeAfter = !sawAuthChallengeBefore && authProvider?.sawAuthChallenge === true;
              let authFailure = isAuthFailure(
                error_2,
                error_2 instanceof SseError_2 ? error_2.code : undefined,
                sawAuthChallengeAfter,
              );
              if (connectBudgetExpired && postMethodNotAllowed && sawAuthChallengeAfter) {
                logMCPDebug(
                  name,
                  "legacy HTTP+SSE stream GET answered with an auth challenge; its auth flow outran the fallback budget, so routing to needs-auth",
                );
                throw new UnauthorizedError_2(
                  `MCP server "${name}" requires authorization: its legacy HTTP+SSE stream answered with an auth challenge and the authorization flow did not finish within the connect budget`,
                );
              }
              if (
                connectBudgetExpired ||
                (error_2 instanceof SseError_2 && !authFailure) ||
                (authFailure && !postMethodNotAllowed)
              ) {
                logMCPDebug(
                  name,
                  `legacy HTTP+SSE not confirmed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); surfacing the POST failure`,
                );
                handshakeTrace = savedHandshakeTrace;
                throw error;
              }
              throw error_2;
            }
            legacySseConnected = true;
            logMCPDebug(name, "connected over legacy HTTP+SSE");
          }
          classifyProbeEvidence();
          if (
            negotiation?.mode === "auto" &&
            probeFallbackReason === undefined &&
            transport_2 instanceof BoundedStdioClientTransport &&
            transport_2._anthropicProbeTimedOut === true &&
            client.getProtocolEra() === "modern"
          ) {
            probeFallbackReason = lit("rediscovered_after_probe_timeout");
            logMCPDebug(
              name,
              `stdio server rejected initialize after the version negotiation probe timed out, then answered a second server/discover on the same process; connected on ${client.getNegotiatedProtocolVersion()} without restarting it`,
            );
          }
          if (stderrBuffer) {
            logMCPError(name, `Server stderr: ${stderrBuffer}`);
            stderrBuffer = "";
          }
          if (stderrDataHandler && stderrStream) {
            stderrStream.off("data", stderrDataHandler);
            stderrStream.resume();
          }
          let connectDurationMs = Date.now() - now;
          logMCPDebug(
            name,
            `Successfully connected (transport: ${serverRef.type || "stdio"}) in ${connectDurationMs}ms`,
          );
          if (listenDenylisted) {
            if (client.getProtocolEra?.() === "modern")
              logMCPDebug(
                name,
                "subscriptions/listen suppressed by the listen denylist; list_changed delivery is off for this connection",
              );
          } else ensureListenSubscription(client, name, serverRef, listenResult, discoverSource);
          if (
            (serverRef.type === "stdio" || !serverRef.type) &&
            transport_2 instanceof BoundedStdioClientTransport &&
            transport_2.pid
          ) {
            registerChildMemory("mcp_stdio", transport_2.pid);
            if (stdioPendingCgroup)
              parkPendingPid("mcp", transport_2.pid, () => isMcpServerBackingToolHook(name));
            if (stdioCgroupCapped || stdioPendingCgroup) releaseMcpToolCgroup(name, transport_2.pid);
          }
        } catch (error) {
          classifyProbeEvidence();
          let connectError = error;
          if (connectError instanceof SdkError && connectError.code === SdkErrorCode.EraNegotiationFailed) {
            let errorData = connectError.data;
            let cause =
              typeof errorData === "object" && errorData !== null && "cause" in errorData
                ? errorData.cause
                : connectError.cause;
            if (cause != null) connectError = cause;
          }
          let failureDurationMs = Date.now() - now;
          let negotiation_2 = {
            negotiationMode: fromEnumOpt(negotiation?.mode),
            probeFellBack: probeFallbackReason,
            listenSuppressed: listenDenylisted,
            negotiationDenylisted,
            discoverSource: discoverSourceEnum,
            listingPriorBurned,
            ...toolsListAheadFields(toolsListAheadState),
          };
          if (transport_2 instanceof BoundedStdioClientTransport && transport_2.overflowError) {
            logMCPError(name, transport_2.overflowError.message);
            if (stderrBuffer) logMCPError(name, `Server stderr: ${stderrBuffer}`);
            throw transport_2.overflowError;
          }
          if (serverRef.type === "sse" && connectError instanceof Error) {
            logMCPDebug(
              name,
              `SSE Connection failed after ${failureDurationMs}ms: ${jsonStringify({
                url: redactUrlSecrets(serverRef.url),
                error: describeConnectError(connectError, serverRef),
                errorType: connectError.constructor.name,
                stack:
                  rethrowRedactedConnectError(connectError, serverRef) === connectError
                    ? connectError.stack
                    : undefined,
              })}`,
            );
            logMCPError(name, rethrowRedactedConnectError(connectError, serverRef));
            let sseFailureResult = await handleRemoteConnectAuthError({
              name,
              serverRef,
              transportType: "sse",
              error: connectError,
              statusCode: connectError instanceof SdkHttpError ? connectError.status : connectError.code,
              sawAuthChallenge: authProvider?.sawAuthChallenge === true,
              hasUserAuthHeader: configHasAuthHeader,
              helperMintsAuthHeader,
              cliOwnedBearer: hasCliBearer,
              useFirstPartyAuth,
              firstPartyBearer: firstPartyBearerState.last,
              authProvider,
              negotiation: negotiation_2,
              roundEpoch,
              storageV5,
            });
            if (sseFailureResult) return sseFailureResult;
          } else if (serverRef.type === "http" && connectError instanceof Error) {
            let httpError = connectError;
            logMCPDebug(
              name,
              `HTTP Connection failed after ${failureDurationMs}ms: ${describeConnectError(connectError, serverRef)} (code: ${httpError.code || "none"}, errno: ${httpError.errno || "none"})`,
            );
            logMCPError(name, rethrowRedactedConnectError(connectError, serverRef));
            let httpFailureResult = await handleRemoteConnectAuthError({
              name,
              serverRef,
              transportType: "http",
              error: connectError,
              statusCode: connectError instanceof SdkHttpError ? connectError.status : connectError.code,
              sawAuthChallenge: authProvider?.sawAuthChallenge === true,
              hasUserAuthHeader: configHasAuthHeader,
              helperMintsAuthHeader,
              cliOwnedBearer: hasCliBearer,
              useFirstPartyAuth,
              firstPartyBearer: firstPartyBearerState.last,
              authProvider,
              negotiation: negotiation_2,
              roundEpoch,
              storageV5,
            });
            if (httpFailureResult) return httpFailureResult;
          } else if (serverRef.type === "claudeai-proxy" && connectError instanceof Error) {
            logMCPDebug(
              name,
              `claude.ai proxy connection failed after ${failureDurationMs}ms: ${describeConnectError(connectError, serverRef)}`,
            );
            if (!isClaudeAiBearerRejectedError_2(connectError))
              logMCPError(name, rethrowRedactedConnectError(connectError, serverRef));
            let proxyStatus = connectError instanceof SdkHttpError ? connectError.status : connectError.code;
            if (isClaudeAiBearerRejectedError_2(connectError)) {
              markConnectEnded(handshakeTrace);
              logEvent("tengu_mcp_server_connection_failed", {
                processUptimeAtConnectStartMs,
                ...handshakeTraceTelemetry(handshakeTrace),
                transportType: lit("claudeai-proxy"),
                errorCode: lit("CLAUDEAI_BEARER_REJECTED"),
                sdkGeneration: fromEnum(mcpSdkGeneration()),
                negotiationMode: negotiation_2.negotiationMode,
                probeFellBack: negotiation_2.probeFellBack,
                listenSuppressed: negotiation_2.listenSuppressed,
                negotiationDenylisted: negotiation_2.negotiationDenylisted,
                discoverSource: negotiation_2.discoverSource,
                listingPriorBurned: negotiation_2.listingPriorBurned,
                ...mcpServerKeyHashEntry(serverRef, name),
                ...buildPluginSourceFields(serverRef),
              });
              logFeatureSad("mcp_connect", "mcp_connect_claudeai_bearer_rejected");
              let cacheKey = serverCacheKey(name, serverRef);
              let failedResult = {
                name,
                type: "failed",
                config: serverRef,
                error: connectError.message,
                errorCode: "CLAUDEAI_BEARER_REJECTED",
              };
              let cachedPromise = getConnectionCache().connections.get(cacheKey);
              if (cachedPromise)
                cachedPromise.then(
                  (cachedResult) => {
                    if (
                      cachedResult === failedResult &&
                      getConnectionCache().connections.get(cacheKey) === cachedPromise
                    )
                      getConnectionCache().connections.delete(cacheKey);
                  },
                  () => {},
                );
              return failedResult;
            }
            if (proxyStatus === 401 || proxyStatus === 403)
              return connectWithRetry(
                name,
                serverRef,
                "claudeai-proxy",
                undefined,
                false,
                roundEpoch,
                negotiation_2,
                storageV5,
              );
          } else if (serverRef.type === "sse-ide" || serverRef.type === "ws-ide")
            logEvent("tengu_mcp_ide_server_connection_failed", {
              connectionDurationMs: failureDurationMs,
            });
          if (inProcessServer) inProcessServer.close().catch(() => {});
          transport_2.close().catch(() => {});
          if (stderrBuffer && !isCleanupStarted()) logMCPError(name, `Server stderr: ${stderrBuffer}`);
          throw connectError;
        }
        let serverCapabilities = client.getServerCapabilities();
        let serverVersion = client.getServerVersion();
        let promptOverrides = officialPluginPromptOverrides(serverRef);
        let instructionsOverride =
          serverInstructionsOverride(promptOverrides, name) ?? client.getInstructions();
        let instructionsLimit = toolTimeoutForServer(serverRef);
        let instructions = truncateServerInstructions(instructionsOverride, name, instructionsLimit);
        logMCPDebug(
          name,
          `Connection established with capabilities: ${jsonStringify({
            hasTools: !!serverCapabilities?.tools,
            hasPrompts: !!serverCapabilities?.prompts,
            hasResources: !!serverCapabilities?.resources,
            hasResourceSubscribe: !!serverCapabilities?.resources?.subscribe,
            serverVersion: serverVersion || "unknown",
            protocolEra: client.getProtocolEra(),
            negotiatedProtocolVersion: client.getNegotiatedProtocolVersion(),
          })}`,
        );
        logForDebugging(
          `[MCP] Server "${name}" connected with subscribe=${!!serverCapabilities?.resources?.subscribe}`,
        );
        client.setRequestHandler("elicitation/create", async (request) => {
          logMCPDebug(name, `Elicitation request received during initialization: ${jsonStringify(request)}`);
          return {
            action: "cancel",
          };
        });
        if (serverRef.type === "sse-ide" || serverRef.type === "ws-ide") {
          let connectionDurationMs = Date.now() - now;
          logEvent("tengu_mcp_ide_server_connection_succeeded", {
            connectionDurationMs,
            serverVersion: sanitizeVersion(serverVersion?.version),
          });
          maybeNotifyIDEConnected(client).catch((error) => {
            logMCPError(
              name,
              `Failed to send ide_connected notification: ${describeConnectError(error, serverRef)}`,
            );
          });
        }
        let now_2 = Date.now();
        let sawTransportError = false;
        let onerror = client.onerror;
        let onclose = client.onclose;
        let maxConsecutiveErrors = 3;
        let probeStart =
          serverRef.type === "http" &&
          isCcrMcpPath(serverRef.url) &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_snug_mist_enabled", false);
        let transportErrorState = {
          consecutiveErrors: 0,
          activeCallWatchdogs: new Set(),
          callsInProgress: 0,
          pendingElicitations: 0,
          lastElicitationClosedAt: 0,
          dialledUnder: getRequestTimingStore(),
        };
        let closeStarted = false;
        let closeTransport = (reason) => {
          if (closeStarted) return;
          closeStarted = true;
          transportErrorState.closeReason = reason;
          logMCPDebug(name, `Closing transport (${reason})`);
          client.close().catch((error) => {
            logMCPDebug(name, `Error during close: ${describeConnectError(error, serverRef)}`);
          });
        };
        let kind = discoverPrior?.kind;
        let fromRememberedLegacy = kind !== undefined && usedRememberedLegacy;
        let trackHandshakeMethods = kind !== undefined;
        let pendingPriorRpcEra = fromRememberedLegacy;
        let pendingMethodsById = new Map();
        let sawSessionHandshake = false;
        let pendingToolsListTimer;
        let clearPendingWatch = () => {
          trackHandshakeMethods = false;
          pendingMethodsById.clear();
          if (pendingToolsListTimer !== undefined) {
            clearTimeout(pendingToolsListTimer);
            pendingToolsListTimer = undefined;
          }
        };
        let classifyPriorRejection = (rejectionKindInput) =>
          kind === "modern" || rejectionKindInput === "rpc_era" ? rejectionKindInput : undefined;
        let schedulePriorDiscardClose = () => {
          if ((transportErrorState.callsInProgress ?? 0) > 0)
            transportErrorState.onCallsIdle = schedulePriorDiscardClose;
          else if (client.transport !== undefined) closeTransport("discover prior rejected");
        };
        let discardPriorAfterRejection = (reason, method, discardKind, postWindow = false) => {
          clearPendingWatch();
          pendingPriorRpcEra = false;
          burnDiscoverPrior(serverRef, kind, storageV5);
          logMCPDebug(
            name,
            `${method} on a connection built from ${discoverPriorLabel()} was rejected (${discardKind}); discarding it for this server \u2014 this connection closes once no tool call or background task is using it, and the next dial probes server/discover on the wire`,
          );
          logEvent("tengu_mcp_listing_prior_rejected", {
            phase: postWindow ? lit("post_window") : lit("post_connect"),
            priorKind: fromEnumOpt(kind),
            priorSource: discoverSourceEnum,
            reason: fromEnum(reason),
            transportType: fromEnum(serverRef.type ?? "stdio"),
            ...mcpServerKeyHashEntry(serverRef, name),
          });
          setTimeout(schedulePriorDiscardClose, 0);
        };
        let armToolsListWatchdog = () => {
          if (pendingToolsListTimer !== undefined) clearTimeout(pendingToolsListTimer);
          pendingToolsListTimer = setTimeout(() => {
            clearPendingWatch();
            if (fromRememberedLegacy && sawSessionHandshake && client.transport !== undefined) {
              logMCPDebug(
                name,
                `tools/list on a connection built from ${discoverPriorLabel()} got no result in time; forgetting the verdict, so the next dial probes server/discover`,
              );
              forgetDiscoverVerdict(serverRef, storageV5);
            }
          }, getConnectionTimeoutMs());
          pendingToolsListTimer.unref();
        };
        let noteSessionHandshakeRefusal = (method, retryable, kind) => {
          if (isSessionHandshakeMethod(method) && !retryable) {
            clearPendingWatch();
            if (fromRememberedLegacy && kind !== undefined) {
              logMCPDebug(
                name,
                `${method} on a connection built from ${discoverPriorLabel()} was refused (${kind}); forgetting the verdict, so the next dial probes server/discover`,
              );
              forgetDiscoverVerdict(serverRef, storageV5);
            }
          }
        };
        if (trackHandshakeMethods && client.transport) {
          armToolsListWatchdog();
          let transport = client.transport;
          let sendOriginal = transport.send.bind(transport);
          transport.send = async (message, options) => {
            let request = trackHandshakeMethods && isJSONRPCRequest(message) ? message : undefined;
            if (request !== undefined) {
              pendingMethodsById.set(request.id, request.method);
              if (isSessionHandshakeMethod(request.method)) {
                sawSessionHandshake = true;
                armToolsListWatchdog();
              }
            }
            try {
              await sendOriginal(message, options);
            } catch (error) {
              if (request !== undefined && trackHandshakeMethods) {
                let method = request.method;
                pendingMethodsById.delete(request.id);
                let rejectionKind =
                  fromRememberedLegacy &&
                  isSessionHandshakeMethod(method) &&
                  isUnsupportedVersionHttp400(error)
                    ? "rpc_era"
                    : classifyMcpConnectError(error, method);
                let priorReason = classifyPriorRejection(rejectionKind);
                if (priorReason !== undefined)
                  discardPriorAfterRejection(
                    priorReason,
                    method,
                    truncateToLength(describeConnectError(error, serverRef), 200),
                  );
                else noteSessionHandshakeRefusal(method, isRetryableListError(error), rejectionKind);
              }
              throw error;
            }
          };
        }
        client.onerror = (error) => {
          let transportType = serverRef.type || "stdio";
          if (transportType === "stdio" && error instanceof SyntaxError) {
            logMCPError(name, `Ignoring non-JSON line on stdout: ${error.message}`);
            return;
          }
          if (error instanceof FirstPartyDesignNeedsConsentError) return;
          if (transportType === "stdio" && error instanceof StdoutOverflowError_2) {
            logMCPError(name, error.message);
            sawTransportError = true;
            closeTransport("stdout overflow");
            if (onerror) onerror(error);
            return;
          }
          if (
            (transportType === "http" || transportType === "claudeai-proxy") &&
            error instanceof HttpBodyOverflowError_2
          ) {
            logMCPError(
              name,
              `sent a response larger than ${Math.round(MCP_BODY_LIMIT / 1024 / 1024)}MB. Claude Code stopped reading it and failed the request it answered; the connection stays open.`,
            );
            if (onerror) onerror(error);
            return;
          }
          if (
            (transportType === "sse" ||
              transportType === "sse-ide" ||
              transportType === "http" ||
              transportType === "claudeai-proxy") &&
            error.message.includes(STOPPED_READING_NOTE_2)
          ) {
            logMCPError(name, error.message);
            sawTransportError = true;
            closeTransport("http body overflow");
            if (onerror) onerror(error);
            return;
          }
          if (
            (transportType === "sse" || transportType === "http" || transportType === "claudeai-proxy") &&
            error instanceof SyntaxError
          ) {
            sawTransportError = true;
            armWatchdogs();
            closeTransport(
              authProvider?.authChallengeOpen === true && transportErrorState.activeCallWatchdogs.size <= 1
                ? "malformed message after an auth challenge"
                : "malformed JSON-RPC message (response truncated)",
            );
            if (onerror) onerror(error);
            return;
          }
          let uptimeMs = Date.now() - now_2;
          sawTransportError = true;
          logMCPDebug(
            name,
            `${transportType.toUpperCase()} connection dropped after ${Math.floor(uptimeMs / 1000)}s uptime`,
          );
          if (error.message) {
            let hint = CONNECTION_ERROR_HINTS_2.find(([needle]) => error.message.includes(needle))?.[1];
            logMCPDebug(name, hint ?? `Connection error: ${describeConnectError(error, serverRef)}`);
          }
          if (
            (transportType === "http" || transportType === "claudeai-proxy") &&
            client.transport?.sessionId !== undefined &&
            isMcpSessionExpiredError(error)
          ) {
            logMCPDebug(
              name,
              "MCP session expired (server no longer recognizes session ID), triggering reconnection",
            );
            closeTransport("session expired");
            if (onerror) onerror(error);
            return;
          }
          if (
            (transportType === "http" || transportType === "claudeai-proxy") &&
            client.transport?.sessionId !== undefined &&
            error instanceof SdkHttpError &&
            error.status === 404 &&
            isSseOpenFailure(error)
          )
            logFeatureSad("mcp_session_recovery", "get_stream_404_not_reinit");
          if (transportType === "sse" || transportType === "http" || transportType === "claudeai-proxy") {
            if (error.message.includes("Maximum reconnection attempts")) {
              logMCPDebug(
                name,
                "SSE GET-stream reconnection exhausted; leaving transport up (POST still works)",
              );
              transportErrorState.consecutiveErrors = 0;
              armWatchdogs();
              if (onerror) onerror(error);
              return;
            }
            if (isTransientMcpError(error)) {
              transportErrorState.consecutiveErrors += probeStart ? 0 : 1;
              armWatchdogs();
              logMCPDebug(
                name,
                `Terminal connection error ${transportErrorState.consecutiveErrors}/${maxConsecutiveErrors}`,
              );
              if (transportErrorState.consecutiveErrors >= maxConsecutiveErrors) {
                transportErrorState.consecutiveErrors = 0;
                closeTransport("max consecutive terminal errors");
              }
            } else transportErrorState.consecutiveErrors = 0;
          }
          if (onerror) onerror(error);
        };
        let isCcrToolport = serverRef.type === "http" && isCcrMcpPath(serverRef.url);
        if (isCcrToolport && client.transport) {
          let transport = client.transport;
          let sendOriginal = transport.send.bind(transport);
          transport.send = async (message, options) => {
            let _meta =
              isJSONRPCRequest(message) && message.method === "tools/call"
                ? message.params?._meta
                : undefined;
            let toolUseId = _meta?.["claudecode/toolUseId"];
            let callMark = _meta?.[CLAUDECODE_CALLMARK];
            let sanitizedMessage =
              isJSONRPCRequest(message) && _meta !== undefined && callMark !== undefined
                ? {
                    ...message,
                    params: {
                      ...message.params,
                      _meta: omitKeys(_meta, CLAUDECODE_CALLMARK),
                    },
                  }
                : message;
            let watchdog =
              toolUseId !== undefined
                ? [...transportErrorState.activeCallWatchdogs].find(
                    (activeCallWatchdog) => activeCallWatchdog.toolUseId === toolUseId,
                  )
                : callMark !== undefined
                  ? [...transportErrorState.activeCallWatchdogs].find(
                      (activeCallWatchdog) => activeCallWatchdog.mark === callMark,
                    )
                  : undefined;
            if (!isJSONRPCRequest(message) || watchdog === undefined)
              return sendOriginal(sanitizedMessage, options);
            let { id } = message;
            watchdog.requestSent?.(id);
            try {
              await sendOriginal(sanitizedMessage, {
                ...options,
                onRequestStreamEnd: () => {
                  options?.onRequestStreamEnd?.();
                  watchdog.answerStreamEnded?.(id);
                },
              });
            } catch (error) {
              if (
                error instanceof Error &&
                (isMcpSessionExpiredError(error) ||
                  NOTHING_SENT_ERROR_CODES.has(getErrnoCode(error) ?? "") ||
                  SSL_CERT_ERROR_CODES.has(getErrnoCode(error) ?? ""))
              )
                watchdog.requestNotRun?.(id);
              throw error;
            }
            watchdog.requestTaken?.(id);
          };
        }
        if ((serverRef.type === "http" || serverRef.type === "claudeai-proxy") && client.transport)
          transportErrorState.toolCallSends = trackToolCallSends(
            client.transport,
            isMcpSessionExpiredError,
            transportErrorState.activeCallWatchdogs,
          );
        if (client.transport) {
          let onmessage = client.transport.onmessage;
          client.transport.onmessage = (message, extra) => {
            if (transportErrorState.consecutiveErrors !== 0) transportErrorState.consecutiveErrors = 0;
            if (
              isCcrToolport &&
              (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse_2(message)) &&
              message.id !== undefined
            )
              for (let activeCallWatchdog of transportErrorState.activeCallWatchdogs)
                activeCallWatchdog.requestAnswered?.(message.id);
            if (
              trackHandshakeMethods &&
              (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse_2(message)) &&
              message.id !== undefined
            ) {
              let pendingMethod = pendingMethodsById.get(message.id);
              if (pendingMethod !== undefined) {
                pendingMethodsById.delete(message.id);
                if (isJSONRPCResultResponse(message)) {
                  if (isSessionHandshakeMethod(pendingMethod)) clearPendingWatch();
                } else {
                  let errorKind = classifyMcpRpcErrorCode(message.error.code, pendingMethod);
                  let priorReason = classifyPriorRejection(errorKind);
                  if (priorReason !== undefined) {
                    onmessage?.(message, extra);
                    discardPriorAfterRejection(priorReason, pendingMethod, `JSON-RPC ${message.error.code}`);
                    return;
                  }
                  noteSessionHandshakeRefusal(
                    pendingMethod,
                    isRetryableListError(new ProtocolError(message.error.code, message.error.message)),
                    errorKind,
                  );
                }
              }
            } else if (
              pendingPriorRpcEra &&
              client.transport !== undefined &&
              isJSONRPCErrorResponse_2(message) &&
              message.id !== undefined &&
              classifyMcpRpcErrorCode(message.error.code, "") === "rpc_era"
            ) {
              onmessage?.(message, extra);
              discardPriorAfterRejection(
                "rpc_era",
                "a later request",
                `JSON-RPC ${message.error.code}`,
                true,
              );
              return;
            }
            onmessage?.(message, extra);
          };
        }
        client.onclose = () => {
          let uptimeMs = Date.now() - now_2;
          let transportType = serverRef.type ?? "unknown";
          logMCPDebug(
            name,
            `${transportType.toUpperCase()} connection closed after ${Math.floor(uptimeMs / 1000)}s (${sawTransportError ? "with errors" : "cleanly"})`,
          );
          logMcpConnectionOtelEvent(name, serverRef, {
            status: "disconnected",
            durationMs: uptimeMs,
          });
          let cacheKey = serverCacheKey(name, serverRef);
          getConnectionCache().liveClients.delete(client);
          getConnectionCache().toolLists.delete(cacheKey);
          getConnectionCache().resourceLists.delete(cacheKey);
          getConnectionCache().resourceTemplateLists.delete(cacheKey);
          getConnectionCache().commandLists.delete(cacheKey);
          getConnectionCache().connections.delete(cacheKey);
          logMCPDebug(name, "Cleared connection cache for reconnection");
          if (onclose) onclose();
        };
        let closeConnection = async () => {
          if (inProcessServer) {
            try {
              await inProcessServer.close();
            } catch (error) {
              logMCPDebug(name, `Error closing in-process server: ${error}`);
            }
            try {
              await client.close();
            } catch (error) {
              logMCPDebug(name, `Error closing client: ${describeConnectError(error, serverRef)}`);
            }
            return;
          }
          if (transport_2 instanceof BoundedStdioClientTransport)
            try {
              let pid = transport_2.pid;
              if (transport_2.serverProcess && getPlatform() === "windows") {
                logMCPDebug(name, "Closing MCP server stdin");
                await closeStdioServer(transport_2.serverProcess);
              } else if (pid) {
                logMCPDebug(name, "Sending SIGINT to MCP server process");
                try {
                  process.kill(pid, "SIGINT");
                } catch (error) {
                  logMCPDebug(name, `Error sending SIGINT: ${error}`);
                  return;
                }
                await new Promise(async (resolve) => {
                  let settled = false;
                  let finish = () => {
                    if (settled) return;
                    settled = true;
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve();
                  };
                  let isAlive = (pid) => {
                    try {
                      process.kill(pid, 0);
                      return true;
                    } catch {
                      return false;
                    }
                  };
                  let interval = setInterval(
                    (isAlive, pid, debugName, done) => {
                      if (!isAlive(pid)) {
                        logMCPDebug(debugName, "MCP server process exited cleanly");
                        done();
                      }
                    },
                    50,
                    isAlive,
                    pid,
                    name,
                    finish,
                  );
                  let timer = setTimeout(
                    (debugName, done) => {
                      logMCPDebug(debugName, "Cleanup timeout reached, stopping process monitoring");
                      done();
                    },
                    600,
                    name,
                    finish,
                  );
                  try {
                    await sleep(100);
                    if (!settled) {
                      if (!isAlive(pid)) {
                        finish();
                        return;
                      }
                      logMCPDebug(name, "SIGINT failed, sending SIGTERM to MCP server process");
                      try {
                        process.kill(pid, "SIGTERM");
                      } catch (error) {
                        logMCPDebug(name, `Error sending SIGTERM: ${error}`);
                        finish();
                        return;
                      }
                      await sleep(400);
                      if (!settled)
                        if (!isAlive(pid)) finish();
                        else {
                          logMCPDebug(name, "SIGTERM failed, sending SIGKILL to MCP server process");
                          try {
                            process.kill(pid, "SIGKILL");
                          } catch (error) {
                            logMCPDebug(name, `Error sending SIGKILL: ${error}`);
                          }
                        }
                    }
                    finish();
                  } catch {
                    finish();
                  }
                });
              }
            } catch (error) {
              logMCPDebug(name, `Error terminating process: ${error}`);
            }
          try {
            await client.close();
          } catch (error) {
            logMCPDebug(name, `Error closing client: ${describeConnectError(error, serverRef)}`);
          }
        };
        let unregisterCleanup = registerCleanup(closeConnection);
        if (transport_2 instanceof BoundedStdioClientTransport) transport_2.handOffExitCleanup();
        let cleanup = async () => {
          getConnectionCache().liveClients.delete(client);
          unregisterCleanup?.();
          await closeConnection();
        };
        getConnectionCache().liveClients.add(client);
        if (getAnnouncedDirectories() !== announcedDirectories) client.sendRootsListChanged().catch(() => {});
        let discoverVerdictKey = getDiscoverVerdictKey(serverRef);
        if (discoverSource === "wire" && client.getProtocolEra() === "modern")
          forgetDiscoverVerdict(serverRef, storageV5);
        let probeTimedOut =
          transport_2 instanceof BoundedStdioClientTransport && transport_2._anthropicProbeTimedOut === true;
        let probeAnsweredLate =
          connectionState ||
          (transport_2 instanceof BoundedStdioClientTransport && transport_2.answeredProbeLate);
        if (
          discoverVerdictKey !== undefined &&
          !(serverRef.type === "claudeai-proxy" && serverRef.stateless === true) &&
          discoverSource === "wire" &&
          (options || ((discoverMethodNotFound || probeTimedOut) && probeFallbackReason === undefined)) &&
          client.getProtocolEra() === "legacy" &&
          !getCliOwnedState().burnedListingDiscoverPriors.has(discoverVerdictKey)
        ) {
          if (probeAnsweredLate) {
            logMCPDebug(
              name,
              "stdio server answered the server/discover probe after its bound, so it was only slow to start and speaks the new protocol; not remembering it as a legacy peer",
            );
            forgetDiscoverVerdict(serverRef, storageV5);
          } else {
            rememberLegacyPeer(serverRef, storageV5);
            if (probeTimedOut && transport_2 instanceof BoundedStdioClientTransport)
              transport_2.onAnsweredProbeLate = () => {
                logMCPDebug(
                  name,
                  "stdio server answered the server/discover probe after it had connected legacy; it speaks the new protocol, so forgetting it as a legacy peer",
                );
                forgetDiscoverVerdict(serverRef, storageV5);
              };
          }
        }
        let connectDurationMs = Date.now() - now;
        logMcpConnectionOtelEvent(name, serverRef, {
          status: "connected",
          durationMs: connectDurationMs,
        });
        let instructionsLength = instructionsOverride?.length ?? 0;
        markConnectEnded(handshakeTrace);
        logEvent("tengu_mcp_server_connection_succeeded", {
          connectionDurationMs: connectDurationMs,
          processUptimeAtConnectStartMs,
          ...handshakeTraceTelemetry(handshakeTrace),
          instructionsLength,
          instructionsTruncated: instructionsLength > instructionsLimit,
          transportType: fromEnum(serverRef.type ?? "stdio"),
          negotiatedLegacySse: serverRef.type === "http" && transport_2 instanceof SSEClientTransport_2,
          sdkGeneration: fromEnum(mcpSdkGeneration()),
          negotiationMode: fromEnumOpt(negotiation?.mode),
          scope: fromEnum(serverRef.scope),
          protocolEra: fromEnumOpt(client.getProtocolEra()),
          negotiatedProtocolVersion: protocolVersionLiteral(client.getNegotiatedProtocolVersion()),
          probeFellBack: probeFallbackReason,
          bareElicitationRetry: retriedWithoutElicitation,
          discoverSource: discoverSourceEnum,
          listingPriorBurned,
          listenSuppressed: listenDenylisted,
          negotiationDenylisted,
          ...toolsListAheadFields(toolsListAheadState),
          isPlugin: serverRef.pluginSource !== undefined,
          ...buildPluginSourceFields(serverRef),
          totalServers: serverStats?.totalServers,
          stdioCount: serverStats?.stdioCount,
          sseCount: serverStats?.sseCount,
          httpCount: serverStats?.httpCount,
          sseIdeCount: serverStats?.sseIdeCount,
          wsIdeCount: serverStats?.wsIdeCount,
          ...mcpServerKeyHashEntry(serverRef, name),
        });
        if (toolsListAheadState !== undefined && !getCliOwnedState().toolsListAhead.has(client))
          armToolsListAhead(
            client,
            toolsListAheadState.flagSource,
            negotiationDenylisted,
            toolsListAheadState.listed,
          );
        if (handshakeTrace !== undefined) {
          let trace = handshakeTrace;
          let protocolEra = client.getProtocolEra();
          let aheadState = getCliOwnedState().toolsListAhead.get(client);
          armFirstToolsListReport(client, (report) => {
            logEvent("tengu_mcp_first_tools_list", {
              ...report,
              messageStreamGetOutcome: fromEnum(trace.messageStreamGetOutcome),
              processUptimeAtConnectStartMs,
              keepAliveDisabled: trace.keepAliveDisabled,
              transportType: fromEnum(serverRef.type ?? "stdio"),
              sdkGeneration: fromEnum(mcpSdkGeneration()),
              protocolEra: fromEnumOpt(protocolEra),
              negotiationDenylisted,
              ...toolsListAheadFields(aheadState),
              mcpServerKeyHash: toolNameForTelemetry(name),
            });
          });
          if (aheadState !== undefined)
            scheduleMessageStreamOutcomeLog(client, name, trace, {
              ...toolsListAheadFields(aheadState),
              negotiationDenylisted,
            });
        }
        logFeatureOk("mcp_connect");
        logForDiagnosticsNoPII("info", "mcp_connect_complete", {
          transport,
          duration_ms: connectDurationMs,
        });
        if (authProvider) getCliOwnedState().clientAuthProviders.set(client, authProvider);
        getCliOwnedState().clientFirstPartyBearers.set(client, firstPartyBearerState);
        let connection = {
          name,
          client: clientServerId(client),
          type: "connected",
          capabilities: serverCapabilities ?? {},
          serverInfo: serverVersion,
          instructions,
          negotiatedProtocolVersion: client.getNegotiatedProtocolVersion(),
          protocolEra: client.getProtocolEra(),
          config: serverRef,
          cleanup,
          transportErrorState,
        };
        clearDiscoveryPathMemo(name);
        try {
          getConnectedClientWiring()?.(connection);
        } catch (error) {
          logMCPError(
            name,
            `connected-client wiring failed (placeholder retained, adoption will retry): ${errorMessage(error)}`,
          );
        }
        return connection;
      } catch (error) {
        let abandonedAfterMs = Date.now() - now;
        if (isCleanupStarted()) {
          logMCPDebug(
            name,
            `Connection abandoned after ${abandonedAfterMs}ms (Claude Code is shutting down)`,
          );
          if (inProcessServer) inProcessServer.close().catch(() => {});
          return {
            name,
            type: "failed",
            config: serverRef,
            error: "Claude Code is shutting down",
            errorCode: "SHUTTING_DOWN",
          };
        }
        let errorDetail = describeConnectError(error, serverRef);
        let cause = error instanceof Error ? error.cause : undefined;
        let rawErrorCode =
          (error instanceof SdkHttpError ? error.status : undefined) ??
          (error && typeof error === "object" && "code" in error ? error.code : undefined) ??
          (cause && typeof cause === "object" && "code" in cause ? cause.code : undefined);
        let failureCode =
          error instanceof IssuerEchoCrossOriginError
            ? "ISSUER_ECHO_DENIED"
            : rawErrorCode !== undefined
              ? String(rawErrorCode)
              : undefined;
        if (
          error instanceof SdkError &&
          error.code === SdkErrorCode.RequestTimeout &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_timeout_retry", true)
        )
          failureCode = "CONNECT_TIMEOUT";
        if (
          serverRef.type === "http" &&
          failureCode === "404" &&
          transport_2?.sessionId === undefined &&
          !isCcrHostedConfig(serverRef)
        ) {
          failureCode = "ENDPOINT_NOT_FOUND";
          errorDetail = `MCP endpoint not found at ${
            describeMcpServerOrigin(name, serverRef, {
              detail: "origin",
            }) ?? "(unparseable url)"
          }. Check the URL in your MCP config.`;
        }
        let suspendedMessage =
          failureCode === "CONNECT_TIMEOUT" && activeClockSnapshot !== undefined
            ? suspendedConnectMessage(name, activeClockSnapshot)
            : undefined;
        if (suspendedMessage !== undefined) {
          failureCode = CONNECT_SUSPENDED;
          errorDetail = suspendedMessage;
        }
        errorDetail = redactMcpErrorDetail(name, serverRef, errorDetail);
        if (!retriedWithoutElicitation && isJavaSdkElicitationRejection(error, serverRef, transport_2))
          errorDetail = JAVA_SDK_ELICITATION_HINT;
        logMcpConnectionOtelEvent(name, serverRef, {
          status: "failed",
          durationMs: abandonedAfterMs,
          errorCode: failureCode,
          error: errorDetail,
        });
        let featureErrorId =
          failureCode === "ENOENT" && (serverRef.type === "stdio" || serverRef.type === undefined)
            ? "mcp_connect_spawn_enoent"
            : failureCode === "ENDPOINT_NOT_FOUND"
              ? "mcp_connect_endpoint_not_found"
              : undefined;
        if (featureErrorId !== undefined) logFeatureBad("mcp_connect", featureErrorId);
        else {
          let featureSadId =
            failureCode === "ECONNREFUSED"
              ? "mcp_connect_refused"
              : failureCode === CONNECT_SUSPENDED
                ? "mcp_connect_suspended"
                : errorDetail.includes("timed out")
                  ? "mcp_connect_timeout"
                  : "mcp_connect_failed";
          logFeatureSad("mcp_connect", `${featureSadId}_${serverRef.type ?? "stdio"}`);
        }
        markConnectEnded(handshakeTrace);
        logEvent("tengu_mcp_server_connection_failed", {
          connectionDurationMs: abandonedAfterMs,
          processUptimeAtConnectStartMs,
          ...handshakeTraceTelemetry(handshakeTrace),
          negotiationMode: fromEnumOpt(negotiation?.mode),
          listenSuppressed: listenDenylisted,
          negotiationDenylisted,
          probeFellBack: probeFallbackReason,
          bareElicitationRetry: retriedWithoutElicitation,
          discoverSource: discoverSourceEnum,
          listingPriorBurned,
          ...toolsListAheadFields(toolsListAheadState),
          errorCode: sanitizeConnectErrorCodeForTelemetry(failureCode),
          errorClassName: sanitizedErrorClassNameForTelemetry(error),
          errorMessageHash: shortHash(scrubErrorText(errorDetail)),
          totalServers: serverStats?.totalServers || 1,
          stdioCount: serverStats?.stdioCount || (serverRef.type === "stdio" ? 1 : 0),
          sseCount: serverStats?.sseCount || (serverRef.type === "sse" ? 1 : 0),
          httpCount: serverStats?.httpCount || (serverRef.type === "http" ? 1 : 0),
          sseIdeCount: serverStats?.sseIdeCount || (serverRef.type === "sse-ide" ? 1 : 0),
          wsIdeCount: serverStats?.wsIdeCount || (serverRef.type === "ws-ide" ? 1 : 0),
          transportType: fromEnum(serverRef.type ?? "stdio"),
          sdkGeneration: fromEnum(mcpSdkGeneration()),
          scope: fromEnum(serverRef.scope),
          isPlugin: serverRef.pluginSource !== undefined,
          ...buildPluginSourceFields(serverRef),
          ...mcpServerKeyHashEntry(serverRef, name),
        });
        logMCPDebug(
          name,
          `Connection failed after ${formatConnectElapsed(clockSnapshot)}${failureCode !== undefined ? ` (${failureCode})` : ""}: ${errorDetail}`,
        );
        logMCPError(
          name,
          `Connection failed${failureCode !== undefined ? ` (${failureCode})` : ""}: ${errorDetail}`,
        );
        logForDiagnosticsNoPII("error", "mcp_connect_failed", {
          transport,
          duration_ms: abandonedAfterMs,
          ...(failureCode === "CONNECT_TIMEOUT" && {
            reason: "timeout",
          }),
          ...(failureCode === CONNECT_SUSPENDED && {
            reason: "suspended",
          }),
        });
        if (inProcessServer) inProcessServer.close().catch(() => {});
        let discoverVerdictKey = getDiscoverVerdictKey(serverRef);
        if (
          discoverVerdictKey !== undefined &&
          negotiation?.mode === "auto" &&
          discoverSource === "wire" &&
          transport_2 instanceof BoundedStdioClientTransport &&
          transport_2._anthropicProbeTimedOut === true &&
          (connectBudgetExpired ||
            (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout)) &&
          failureCode !== CONNECT_SUSPENDED &&
          !getCliOwnedState().burnedListingDiscoverPriors.has(discoverVerdictKey)
        )
          if (transport_2.answeredProbeLate)
            logMCPDebug(
              name,
              "stdio server answered the server/discover probe after its bound but not initialize; it speaks the new protocol, so not remembering it as a legacy peer",
            );
          else rememberLegacyPeer(serverRef, storageV5);
        if (failureCode !== CONNECT_SUSPENDED) recordPluginStdioServerFailure(name, serverRef, storageV5);
        let proxyConnectStatus =
          failureCode === "ERR_PROXY_TUNNEL"
            ? [error, cause]
                .map((candidate) =>
                  candidate && typeof candidate === "object" && "status" in candidate
                    ? candidate.status
                    : undefined,
                )
                .find((statusValue) => typeof statusValue === "number")
            : undefined;
        return {
          name,
          type: "failed",
          config: serverRef,
          error: errorDetail,
          errorCode: failureCode,
          notForwardedMessage:
            "url" in serverRef && issuerKey_3(serverRef.url)
              ? redactMcpErrorDetail(name, serverRef, postedEndpointErrorText(error) ?? "") || undefined
              : undefined,
          ...(proxyConnectStatus !== undefined && {
            proxyConnectStatus,
          }),
          ...(failureCode === undefined &&
            authProvider?.sawAuthChallenge === true &&
            (await registrationStatusFields(name, serverRef, now))),
        };
      }
    },
    serverCacheKey,
    () => getConnectionCache().connections,
    (name, serverRef, [cacheName, cacheServerRef, , storageV5]) =>
      connectWithSignedOutFallback(
        () =>
          redialAfterSuspend(name, serverRef, () =>
            recordPluginStdioServerFailure(cacheName, cacheServerRef, storageV5),
          ),
        serverRef,
        cacheName,
        cacheServerRef,
      ),
  );
});
//@ chunk-sywnjtqb.js:120383-120447 placement
/**
 * 按 http 传输决定协议时代（modern/legacy）。
 */
function eraResolver() {
  return resolveVersionNegotiation("http").mode === "auto" ? "modern" : "legacy";
}
//@ chunk-sywnjtqb.js:120447-120500 placement
/**
 * 初始化客户端侧的解析器（发现缓存开关、身份与账号来源）。
 */
function primeClientResolvers() {
  primeDiscoveryCacheFlag();
  setEraResolver(eraResolver);
  if (hasAccountResolver()) return;
  setAccountResolver(oauthAccountIdentity);
}
//@ chunk-sywnjtqb.js:120500-120538 placement
/**
 * 注册 ensureConnectedClient 实现（一次）。
 */
function primeEnsureConnected() {
  if (getEnsureConnectedClient()) return;
  setEnsureConnectedClient(ensureConnectedClient);
}
//@ chunk-sywnjtqb.js:120538-120634 placement
/**
 * 发出“缓存行被采纳”信号。
 */
function emitCachedAdopt(name, config) {
  try {
    CACHED_ADOPT_SIGNAL.emit(name, config);
  } catch (error) {
    logMCPDebug(name, `cached-row adopt subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-sywnjtqb.js:120634-120870 placement
function recordCachedDialFailure(failure, ownStrike) {
  if (ownStrike) logFeatureSad("mcp_discovery_cache", "lazy_dial_failed");
  getConnectionCache().settledCachedDialFailures.set(serverCacheKey(failure.name, failure.config), {
    failure,
    ownStrike,
  });
  try {
    CACHED_DIAL_FAILED_SIGNAL.emit(failure, ownStrike);
  } catch (error) {
    logMCPDebug(failure.name, `cached-row dial-failed subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-sywnjtqb.js:120870-120966 placement
/**
 * 取出并删除某服务器已结算的缓存拨号失败记录。
 */
function takeSettledCachedDialFailure(name, config) {
  let settledCachedDialFailures = getConnectionCache().settledCachedDialFailures;
  let cacheKey = serverCacheKey(name, config);
  let failure = settledCachedDialFailures.get(cacheKey);
  settledCachedDialFailures.delete(cacheKey);
  return failure;
}
//@ chunk-sywnjtqb.js:120966-121060 placement
/**
 * 缓存失败是否已被清理（测试用判断）。
 */
async function hasClearedCachedFailure(name, config) {
  let cachedConnection = connectToServer.cache?.get?.(serverCacheKey(name, config));
  return cachedConnection !== undefined && (await clearMcpAuthCache(cachedConnection)) === undefined;
}
//@ chunk-sywnjtqb.js:121060-121314 placement
function refuseCachedRow(name, config, reason) {
  let cacheKey = serverCacheKey(name, config);
  if (getConnectionCache().refusedCachedRows.has(cacheKey)) return;
  getConnectionCache().refusedCachedRows.add(cacheKey);
  if (reason === "policy") clearDiscoveryForServer(name, config).catch(() => {});
  recordCachedDialFailure(
    {
      name,
      type: "failed",
      config,
      ...(reason === "policy"
        ? mcpGateError("managed-policy", name, config)
        : {
            error: DISABLED_IN_MCP_REASON,
            errorCode: "DISABLED",
          }),
    },
    false,
  );
}
//@ chunk-sywnjtqb.js:121314-121481 placement
/**
 * 判断服务器是否有已连接且没有正在后台刷新的连接。
 */
async function hasLiveConnection(name, config) {
  let cacheKey = serverCacheKey(name, config);
  let pendingConnection = getConnectionCache().connections.get(cacheKey);
  if (!pendingConnection) return false;
  if ((await clearMcpAuthCache(pendingConnection))?.type !== "connected") return false;
  return !getCliOwnedState().swrRefreshDialsInFlight.has(pendingConnection);
}
//@ chunk-sywnjtqb.js:121481-121676 placement
/**
 * 服务时清除失败的连接记忆（已连接或未结算的保留）。
 */
async function evictStaleFailedConnectMemoForServe(name, config) {
  let cacheKey = serverCacheKey(name, config);
  let pendingConnection = getConnectionCache().connections.get(cacheKey);
  if (!pendingConnection) return;
  let connection = await clearMcpAuthCache(pendingConnection);
  if (connection === undefined || connection.type === "connected") return;
  if (getConnectionCache().connections.get(cacheKey) === pendingConnection)
    getConnectionCache().connections.delete(cacheKey);
}
//@ chunk-sywnjtqb.js:121676-121732 placement
async function clearMcpAuthCache(connectionPromise) {
  return withDeadline(
    connectionPromise.catch(() => {
      return;
    }),
    0,
  );
}
//@ chunk-sywnjtqb.js:121732-121817 placement
/**
 * 清理某服务器缓存中的失败连接。
 */
async function clearCachedFailureFor(name, config) {
  let cachedConnection = connectToServer.cache?.get?.(serverCacheKey(name, config));
  return cachedConnection === undefined ? undefined : clearMcpAuthCache(cachedConnection);
}
//@ chunk-sywnjtqb.js:121817-121978 placement
function clearConnectionCaches(cacheKey) {
  getConnectionCache().connections.delete(cacheKey);
  getConnectionCache().toolLists.delete(cacheKey);
  getConnectionCache().resourceLists.delete(cacheKey);
  getConnectionCache().resourceTemplateLists.delete(cacheKey);
  getConnectionCache().commandLists.delete(cacheKey);
}
//@ chunk-sywnjtqb.js:121978-122357 placement
/**
 * 清除服务器的连接缓存：有活动调用时保留连接，否则关闭已连接的客户端并删除记忆。
 */
async function clearServerCache(name, config, options) {
  primeClientResolvers();
  let cacheKey = serverCacheKey(name, config);
  let pendingConnection = getConnectionCache().connections.get(cacheKey);
  if (pendingConnection) {
    let connection = await clearMcpAuthCache(pendingConnection);
    if (connection === undefined) disposeServerConnectionDetached(name, config, pendingConnection);
    else if (connection.type === "connected") {
      if (
        options !== undefined &&
        getConnectionCache().connections.get(cacheKey) === pendingConnection &&
        clientOf(connection.client).transport !== undefined &&
        (connection.transportErrorState?.activeCallWatchdogs.size ?? 0) > 0
      ) {
        options.connection = connection;
        return;
      }
      await detachAndCloseConnection(connection);
    }
    let currentConnection = getConnectionCache().connections.get(cacheKey);
    if (currentConnection !== undefined && currentConnection !== pendingConnection) return;
  }
  clearConnectionCaches(cacheKey);
}
//@ chunk-sywnjtqb.js:122357-122564 placement
/**
 * 解除连接的 onclose 并关闭连接，必要时清理对应的连接记忆。
 */
function detachAndCloseConnection(connection) {
  clientOf(connection.client).onclose = undefined;
  if (isDiscoveryCacheOn()) {
    let cacheKey = serverCacheKey(connection.name, connection.config);
    let cachedConnection = connectToServer.cache?.get?.(cacheKey);
    if (cachedConnection !== undefined)
      clearMcpAuthCache(cachedConnection).then((settledConnection) => {
        if (
          isSameConnectedClient(settledConnection, connection) &&
          connectToServer.cache?.get?.(cacheKey) === cachedConnection
        )
          clearConnectionCaches(cacheKey);
      });
  }
  return connection.cleanup().catch(() => {});
}
//@ chunk-sywnjtqb.js:122564-122759 placement
/**
 * 在后台丢弃服务器连接：标记为被取代，删除记忆，结算后关闭已连接的客户端。
 */
function disposeServerConnectionDetached(name, config, expectedConnection) {
  primeClientResolvers();
  let cacheKey = serverCacheKey(name, config);
  let pendingConnection = getConnectionCache().connections.get(cacheKey);
  if (expectedConnection !== undefined && pendingConnection !== expectedConnection) return;
  if (pendingConnection) getCliOwnedState().supersededDials.add(pendingConnection);
  clearConnectionCaches(cacheKey);
  if (pendingConnection)
    pendingConnection.then(
      (connection) => {
        if (connection.type !== "connected") return;
        detachAndCloseConnection(connection);
      },
      () => {},
    );
}
//@ chunk-sywnjtqb.js:122759-122802 placement
/**
 * 清理服务器缓存并删除发现缓存。
 */
async function clearDiscoveryForServer(name, config) {
  primeClientResolvers();
  await deleteDiscoveryCache(name, config);
}
//@ chunk-sywnjtqb.js:122802-123070 placement
/**
 * 丢弃已结束且未连接的连接记忆，返回是否删除。
 */
async function discardMemoizedConnectResult(name, config) {
  let cacheKey = serverCacheKey(name, config);
  if (!isDiscoveryCacheOn()) {
    getConnectionCache().connections.delete(cacheKey);
    return true;
  }
  let pendingConnection = getConnectionCache().connections.get(cacheKey);
  if (pendingConnection !== undefined) {
    let connection = await clearMcpAuthCache(pendingConnection);
    if (connection === undefined || connection.type === "connected") return false;
    if (getConnectionCache().connections.get(cacheKey) !== pendingConnection) return false;
  }
  getConnectionCache().connections.delete(cacheKey);
  return true;
}
//@ chunk-sywnjtqb.js:123070-123177 placement
/**
 * 清除服务器的资源与资源模板列表缓存。
 */
function invalidateMcpResourceListCaches(server) {
  let cacheKey = serverCacheKey(server.name, server.config);
  getConnectionCache().resourceLists.delete(cacheKey);
  getConnectionCache().resourceTemplateLists.delete(cacheKey);
}
//@ chunk-sywnjtqb.js:123177-123284 placement
/**
 * 注册 MCP elicitation/create 请求处理器。
 */
function onMcpElicitRequest(server, onElicit) {
  clientOf(server.client).setRequestHandler("elicitation/create", (request, extra) =>
    onElicit(request, {
      signal: extra.mcpReq.signal,
    }),
  );
}
//@ chunk-sywnjtqb.js:123284-123406 placement
/**
 * 注册 elicitation 完成通知处理器。
 */
function onMcpElicitationComplete(server, onComplete) {
  clientOf(server.client).setNotificationHandler("notifications/elicitation/complete", (notification) =>
    onComplete(notification.params.elicitationId),
  );
}
//@ chunk-sywnjtqb.js:123406-123579 placement
/**
 * 注册工具列表变化通知处理器（处理器注册前已收到的变化会补发一次）。
 */
function onMcpToolListChanged(server, refetch) {
  let client = clientOf(server.client);
  recordListChangedRefetcher(client, "tools", refetch);
  let listChangedRefetcher = createListChangedRefetcher(server, refetch);
  client.setNotificationHandler("notifications/tools/list_changed", (notification) => {
    noteListChangedAhead_2(client);
    return listChangedRefetcher(notification);
  });
  if (markHandlerRegistered(client) && !isClientWithoutTransport(server))
    listChangedRefetcher(BEFORE_HANDLER);
}
//@ chunk-sywnjtqb.js:123579-123705 placement
/**
 * 注册提示词列表变化通知处理器。
 */
function onMcpPromptListChanged(server, refetch) {
  let client = clientOf(server.client);
  recordListChangedRefetcher(client, "prompts", refetch);
  client.setNotificationHandler(
    "notifications/prompts/list_changed",
    createListChangedRefetcher(server, refetch),
  );
}
//@ chunk-sywnjtqb.js:123705-123835 placement
/**
 * 注册资源列表变化通知处理器。
 */
function onMcpResourceListChanged(server, refetch) {
  let client = clientOf(server.client);
  recordListChangedRefetcher(client, "resources", refetch);
  client.setNotificationHandler(
    "notifications/resources/list_changed",
    createListChangedRefetcher(server, refetch),
  );
}
//@ chunk-sywnjtqb.js:123835-124321 placement
/**
 * 为 MCP 连接注册自定义通知处理器（新版协议连接不支持未请求的自定义通知，跳过并警告）。
 */
function onMcpNotification(server, schema, handler) {
  let method = schema.shape.method.value;
  let client = clientOf(server.client);
  if (client.getProtocolEra?.() === "modern") {
    let negotiatedProtocolVersion = client.getNegotiatedProtocolVersion?.();
    let protocolLabel =
      negotiatedProtocolVersion === undefined ? undefined : sanitizeCallMark(negotiatedProtocolVersion);
    logForDebugging(
      `[MCP] ${server.name}: skipping ${method} handler registration \u2014 this connection negotiated ${protocolLabel ? `protocol revision ${protocolLabel}` : "a modern-era protocol revision"}, which has no delivery path for unsolicited custom notifications`,
      {
        level: "warn",
      },
    );
    return;
  }
  client.setNotificationHandler(
    method,
    {
      params: schema.shape.params,
    },
    (params) =>
      handler({
        method,
        params,
      }),
  );
}
//@ chunk-sywnjtqb.js:124321-126042 placement
/**
 * 确保某 MCP 服务器已连接再用：SDK 服务器直接返回；被撤回的内置插件服务器、托管策略阻止、已禁用的服务器报错；否则拨号（可带 toolUseId），按超时/中止等待结果，needs-auth 与失败分别抛带来源分类的错误。
 */
async function ensureConnectedClient(server, options) {
  if (server.type === "connected" && server.config.type === "sdk") return server;
  if (isWithdrawnBuiltinPluginServer(server.name, server.config))
    throw withdrawnBuiltinPluginServerError(server.name);
  if (isMcpServerBlockedAtConnectTime(server.name, server.config)) {
    if (server.type === "cached") refuseCachedRow(server.name, server.config, "policy");
    if (judgeGate(server.name, server.config))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        reservedAddressRefusalText(server.name),
        "MCP server refused at a reserved address",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${server.name}" is blocked by managed policy`,
      "MCP server blocked by policy",
    );
  }
  if (
    isMcpServerDisabled(server.name) &&
    (await clearCachedFailureFor(server.name, server.config))?.type !== "connected"
  ) {
    if (server.type === "cached") refuseCachedRow(server.name, server.config, "disabled");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${server.name}" is disabled \u2014 re-enable it via /mcp to use its tools`,
      "MCP server disabled",
    );
  }
  let epochAtDial = identityEpoch();
  let toolUseBinding =
    server.type === "cached" &&
    options?.toolUseId !== undefined &&
    TOOL_USE_ID_PATTERN.test(options.toolUseId)
      ? {
          toolUseId: options.toolUseId,
          withListings: options.toolUseIdWithListingsUntil !== undefined,
        }
      : undefined;
  let dial =
    toolUseBinding === undefined
      ? connectToServer(server.name, server.config)
      : connectToServer(server.name, server.config, undefined, undefined, undefined, toolUseBinding);
  if (toolUseBinding !== undefined) {
    let clearBinding = () => {
      toolUseBinding.toolUseId = undefined;
    };
    (options?.toolUseIdWithListingsUntil ?? dial).then(clearBinding, clearBinding);
  }
  if (server.type === "cached")
    dial.then(
      (connected) => runCachedFirstDialArms(connected, dial, epochAtDial),
      () => {},
    );
  let connection = await boundDial(dial, {
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
    serverName: server.name,
    context: options?.context ?? "MCP connection",
  });
  if (connection.type !== "connected") {
    if (connection.type === "needs-auth")
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          AUTH_MESSAGES.dialNeedsAuth(server.name, server.config),
          "MCP server needs authentication",
        ),
        {
          mcpErrorSource: "user_auth",
        },
      );
    let errorCode = connection.type === "failed" ? connection.errorCode : undefined;
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        AUTH_MESSAGES.dialNotConnected(
          server.name,
          isDiscoveryCacheOn() && connection.type === "failed" && connection.error
            ? `: ${normalizeMcpServerName(connection.error)}`
            : "",
        ),
        "MCP server not connected",
      ),
      {
        mcpErrorSource: classifyMcpErrorSourceCategory(
          Object.assign(Error("MCP dial failed"), {
            code: errorCode !== undefined && /^-?\d+$/.test(errorCode) ? Number(errorCode) : errorCode,
          }),
        ),
        mcpDialCode: errorCode,
        mcpDialNotForwarded: connection.type === "failed" ? connection.notForwardedMessage : undefined,
      },
    );
  }
  if (isWithdrawnBuiltinPluginServer(server.name, server.config)) {
    await detachAndCloseConnection(connection);
    throw withdrawnBuiltinPluginServerError(server.name);
  }
  return connection;
}
//@ chunk-sywnjtqb.js:126042-126122 placement
/**
 * 判断缓存条目是否已被新拨号取代。
 */
function isSupersededCacheEntry(cacheEntry, name, config) {
  let cache = connectToServer.cache;
  if (!cache?.get) return false;
  return cache.get(serverCacheKey(name, config)) !== cacheEntry;
}
//@ chunk-sywnjtqb.js:126122-126172 placement
/**
 * 判断该次拨号是否已被取代。
 */
function isSupersededDial(dial) {
  return getCliOwnedState().supersededDials.has(dial);
}
//@ chunk-sywnjtqb.js:126172-126578 placement
/**
 * 缓存首次拨号结束后的处理（每个结果只运行一次）：身份变化或被取代时关闭，连接成功或需认证时记录，失败时删除记忆并上报。
 */
function runCachedFirstDialArms(result, dial, epochAtDial) {
  let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
  if (cachedFirstDialArmsRan.has(result)) return;
  cachedFirstDialArmsRan.add(result);
  let cacheKey = serverCacheKey(result.name, result.config);
  let currentDial = getConnectionCache().connections.get(cacheKey);
  let identityChanged = identityEpoch() !== epochAtDial;
  let isStaleAdopt = currentDial === undefined && identityChanged;
  if (isSupersededDial(dial) || (currentDial !== undefined && currentDial !== dial) || isStaleAdopt) {
    if (!isSupersededDial(dial) && identityChanged && result.type === "connected")
      detachAndCloseConnection(result);
    return;
  }
  if (result.type === "connected" || result.type === "needs-auth") {
    emitCachedAdopt(result.name, result.config);
    return;
  }
  getConnectionCache().connections.delete(cacheKey);
  if (result.type === "failed")
    recordCachedDialFailure(result, !getCliOwnedState().swrRefreshDialsInFlight.has(dial));
}
//@ chunk-sywnjtqb.js:126578-126616 placement
/**
 * 判断两个配置的指纹是否相同。
 */
function sameConfigHash(configA, configB) {
  return configHash(configA) === configHash(configB);
}
//@ chunk-sywnjtqb.js:126616-127684 placement
/**
 * 可上报的 MCP 连接错误码白名单（OAuth 错误、连接/认证/配置错误、SDK 错误等）。
 */
var KNOWN_CONNECT_ERROR_CODES = [
  "invalid_request",
  "invalid_client",
  "invalid_grant",
  "unauthorized_client",
  "access_denied",
  "unsupported_grant_type",
  "invalid_scope",
  "server_error",
  "temporarily_unavailable",
  "ENDPOINT_NOT_FOUND",
  "AUTH_HEADER_REJECTED",
  "HEADERS_HELPER_AUTH_REJECTED",
  "CONNECT_TIMEOUT",
  "CONNECT_SUSPENDED",
  "CREDENTIAL_STORE_UNAVAILABLE",
  "ISSUER_ECHO_DENIED",
  "CLAUDEAI_BEARER_REJECTED",
  "CLI_OWNED_BEARER_REJECTED",
  "FIRST_PARTY_AUTH_REJECTED",
  "INVALID_CONFIG",
  "UNCONFIGURED",
  "ENOENT",
  "EACCES",
  "EPERM",
  "EADDRINUSE",
  "ERR_INVALID_URL",
  "ABORT_ERR",
  "UNKNOWN_CERTIFICATE_VERIFICATION_ERROR",
  "NOT_CONNECTED",
  "ALREADY_CONNECTED",
  "NOT_INITIALIZED",
  "CAPABILITY_NOT_SUPPORTED",
  "REQUEST_TIMEOUT",
  "CONNECTION_CLOSED",
  "SEND_FAILED",
  "INVALID_RESULT",
  "UNSUPPORTED_RESULT_TYPE",
  "INPUT_REQUIRED_ROUNDS_EXCEEDED",
  "LIST_PAGINATION_EXCEEDED",
  "METHOD_NOT_SUPPORTED_BY_PROTOCOL_VERSION",
  "ERA_NEGOTIATION_FAILED",
  "CLIENT_HTTP_NOT_IMPLEMENTED",
  "CLIENT_HTTP_AUTHENTICATION",
  "CLIENT_HTTP_FORBIDDEN",
  "CLIENT_HTTP_UNEXPECTED_CONTENT",
  "CLIENT_HTTP_FAILED_TO_OPEN_STREAM",
  "CLIENT_HTTP_FAILED_TO_TERMINATE_SESSION",
];
//@ chunk-sywnjtqb.js:127684-127853 placement
/**
 * 把连接错误码收敛为可上报值：数字码、白名单码或 other。
 */
function sanitizeConnectErrorCodeForTelemetry(code) {
  if (code === undefined) return lit("missing");
  if (/^-?\d+$/.test(code)) return fromNumber(Number(code));
  let found = KNOWN_CONNECT_ERROR_CODES.find((knownCode) => knownCode === code);
  if (found !== undefined) return fromEnum(found);
  return sanitizableErrorCode(code) ?? lit("other");
}
//@ chunk-sywnjtqb.js:127853-128258 placement
/**
 * MCP 列表请求失败的错误码到原因名的映射。
 */
var LIST_FAILURE_REASONS; // deferred: uses OAuthErrorCode (../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sywnjtqb.js:127853", () => {
  LIST_FAILURE_REASONS = {
    [SdkErrorCode.ConnectionClosed]: "connection_closed",
    [SdkErrorCode.RequestTimeout]: "request_timeout",
    [SdkErrorCode.ListPaginationExceeded]: "list_pagination_exceeded",
    [-32000]: "connection_closed",
    [-32001]: "request_timeout",
    [CCR_NEEDS_APPROVAL_CODE]: "ccr_needs_approval",
    [ProtocolErrorCode.ParseError]: "parse_error",
    [ProtocolErrorCode.InvalidRequest]: "invalid_request",
    [ProtocolErrorCode.MethodNotFound]: "method_not_found",
    [ProtocolErrorCode.InvalidParams]: "invalid_params",
    [ProtocolErrorCode.InternalError]: "internal_error",
  };
});
//@ chunk-sywnjtqb.js:128258-128441 placement
/**
 * 把 MCP 工具输入转换为自动模式分类器的输入文本（key=value，空输入时用工具名）。
 */
function mcpToolInputToAutoClassifierInput(input, name) {
  let keys = Object.keys(input);
  if (keys.length === 0) return name;
  return keys
    .map((key) => {
      let value = input[key];
      let text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
      return `${key}=${text}`;
    })
    .join(" ");
}
//@ chunk-sywnjtqb.js:128441-128584 placement
function beginDroppedToolsRound(connection) {
  let droppedToolsSeqByConnection = getCliOwnedState().droppedToolsSeqByConnection;
  let sequence = droppedToolsSeqByConnection.get(connection) ?? {
    started: 0,
    applied: 0,
  };
  droppedToolsSeqByConnection.set(connection, sequence);
  sequence.started += 1;
  return {
    seq: sequence.started,
    state: sequence,
  };
}
//@ chunk-sywnjtqb.js:128584-128641 placement
/**
 * 取服务器的 tools/list 错误记录。
 */
function getToolsListError(toolsResult) {
  return getCliOwnedState().toolsListErrorByResult.get(toolsResult);
}
//@ chunk-sywnjtqb.js:128641-128696 placement
/**
 * 取服务器的发现阶段请求错误。
 */
function getDiscoveryFetchError(templatesResult) {
  return getCliOwnedState().discoveryFetchErrors.get(templatesResult);
}
//@ chunk-sywnjtqb.js:128696-128756 placement
/**
 * 当前身份令牌（未解析时 undefined）。
 */
function currentIdentityToken() {
  primeClientResolvers();
  let target = getMcpIdentitySnapshot();
  return isUnresolved(target) ? undefined : target.token;
}
//@ chunk-sywnjtqb.js:128756-128888 placement
/**
 * 首次时记录 MCP 身份基线。
 */
function seedMcpIdentityCheck() {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.identitySeedAttempted) return;
  cliOwnedState.identitySeedAttempted = true;
  let identityToken = currentIdentityToken();
  if (identityToken !== undefined) cliOwnedState.identityBaseline = identityToken;
}
//@ chunk-sywnjtqb.js:128888-129098 placement
/**
 * 判断 MCP 身份自上次检查以来是否变化，并更新基线。
 */
function mcpIdentityChangedSinceLastCheck() {
  let identityToken = currentIdentityToken();
  let cliOwnedState = getCliOwnedState();
  if (identityToken === undefined) {
    cliOwnedState.identityBaseline = undefined;
    return true;
  }
  if (cliOwnedState.identityBaseline === undefined) {
    cliOwnedState.identityBaseline = identityToken;
    return true;
  }
  if (cliOwnedState.identityBaseline === identityToken) return false;
  cliOwnedState.identityBaseline = identityToken;
  return true;
}
//@ chunk-sywnjtqb.js:129098-129211 placement
/**
 * 记录原始工具列表与拉取时间，供发现缓存写回。
 */
function recordRawToolsForResult(result, rawTools) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawToolsByResult.set(result, rawTools);
  cliOwnedState.rawFetchedAtByResult.set(result, Date.now());
}
//@ chunk-sywnjtqb.js:129211-129327 placement
/**
 * 记录原始命令列表与拉取时间，供发现缓存写回。
 */
function recordRawCommandsForResult(result, rawCommands) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawCommandsByResult.set(result, rawCommands);
  cliOwnedState.rawFetchedAtByResult.set(result, Date.now());
}
//@ chunk-sywnjtqb.js:129327-129444 placement
/**
 * 记录原始资源列表与拉取时间，供发现缓存写回。
 */
function recordRawResourcesForResult(result, rawResources) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawResourcesByResult.set(result, rawResources);
  cliOwnedState.rawFetchedAtByResult.set(result, Date.now());
}
//@ chunk-sywnjtqb.js:129444-129496 placement
/**
 * 记录服务器的发现阶段请求错误。
 */
function setDiscoveryFetchError(result, error) {
  getCliOwnedState().discoveryFetchErrors.set(result, error);
}
//@ chunk-sywnjtqb.js:129496-129649 placement
/**
 * 发现缓存命中但服务器具备频道能力时，改为未命中。
 */
function applyCapabilityServeTimeMiss(probe) {
  if (probe.kind !== "fresh" && probe.kind !== "stale") return probe;
  let capabilities = probe.entry.capabilities;
  if (hasChannelCapability(capabilities))
    return {
      kind: "miss",
      reason: "channel-capable",
    };
  return probe;
}
//@ chunk-sywnjtqb.js:129649-131236 placement
/**
 * 把一次发现回合拿到的原始工具/命令/资源/模板写入发现缓存：已写过或身份纪元已变时跳过；写入后清掉暂存；瞬时失败时放回暂存以便重试，终止性失败返回 false。
 */
async function persistRawDiscoveryIfComplete(connection, round) {
  primeClientResolvers();
  let state = getCliOwnedState();
  if (state.persistedDiscoveryRounds.has(round.tools)) return true;
  if (!isCurrentIdentityEpoch(round.identityEpoch)) return true;
  let rawTools = state.rawToolsByResult.get(round.tools);
  let rawCommands = state.rawCommandsByResult.get(round.commands);
  let rawResources = state.rawResourcesByResult.get(round.resources);
  if (
    rawTools === undefined ||
    rawCommands === undefined ||
    rawResources === undefined ||
    round.templates === undefined
  )
    return false;
  let min = Math.min(
    state.rawFetchedAtByResult.get(round.tools) ?? Number.POSITIVE_INFINITY,
    state.rawFetchedAtByResult.get(round.commands) ?? Number.POSITIVE_INFINITY,
    state.rawFetchedAtByResult.get(round.resources) ?? Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(min)) return true;
  let now = min;
  let mapped = [round.tools, round.commands, round.resources].map((resultKey) => [
    resultKey,
    state.rawFetchedAtByResult.get(resultKey),
  ]);
  state.rawToolsByResult.delete(round.tools);
  state.rawCommandsByResult.delete(round.commands);
  state.rawResourcesByResult.delete(round.resources);
  state.rawFetchedAtByResult.delete(round.tools);
  state.rawFetchedAtByResult.delete(round.commands);
  state.rawFetchedAtByResult.delete(round.resources);
  state.persistedDiscoveryRounds.add(round.tools);
  let writeResult = await writeDiscoveryCache(
    connection.name,
    connection.config,
    {
      ...(connection.serverInfo && {
        serverInfo: {
          name: connection.serverInfo.name,
          version: connection.serverInfo.version,
        },
      }),
      ...(connection.protocolEra !== undefined && {
        negotiatedEra: connection.protocolEra,
      }),
      capabilities: connection.capabilities,
      tools: rawTools,
      commands: rawCommands,
      resources: rawResources,
      templates: round.templates.map(({ server, ...templateRest }) => templateRest),
    },
    {
      identityEpoch: round.identityEpoch,
      grantLeg: round.grantLeg,
      now,
    },
  );
  if (writeResult === "terminal") {
    state.persistedDiscoveryRounds.delete(round.tools);
    return false;
  }
  if (writeResult === "transient") {
    state.rawToolsByResult.set(round.tools, rawTools);
    state.rawCommandsByResult.set(round.commands, rawCommands);
    state.rawResourcesByResult.set(round.resources, rawResources);
    for (let [resultKey, fetchedAt] of mapped)
      if (fetchedAt !== undefined) state.rawFetchedAtByResult.set(resultKey, fetchedAt);
    state.persistedDiscoveryRounds.delete(round.tools);
  }
  return true;
}
//@ chunk-sywnjtqb.js:131236-131494 placement
/**
 * 身份未变化时把刷新得到的工具列表合并写入发现缓存。
 */
async function persistRefreshedToolsIfPresent(server, toolsResult, options) {
  primeClientResolvers();
  if (!isCurrentIdentityEpoch(options.identityEpoch)) return;
  let cliOwnedState = getCliOwnedState();
  let tools = cliOwnedState.rawToolsByResult.get(toolsResult);
  let fetchedAt = cliOwnedState.rawFetchedAtByResult.get(toolsResult);
  if (tools === undefined || fetchedAt === undefined) return;
  await mergeDiscoveryTools(server.name, server.config, tools, {
    identityEpoch: options.identityEpoch,
    grantLeg: options.grantLeg,
    fetchedAt,
  });
}
//@ chunk-sywnjtqb.js:131494-131879 placement
/**
 * 把实时连接得到的列表写入发现缓存：需要时拉取资源模板，写入前确认连接未变且服务器未被禁用或拦截。
 */
async function persistLiveListing(connection, listing) {
  if (
    !isDiscoveryCacheOn() ||
    !isDiscoveryCacheEligible(connection.config) ||
    isMcpServerDisabled(connection.name) ||
    isMcpServerBlockedAtConnectTime(connection.name, connection.config)
  )
    return;
  try {
    let hasResources = !!connection.capabilities?.resources;
    if (!hasResources) recordRawResourcesForResult(listing.resources, []);
    let templates =
      hasResources && isCacheableServer(connection.config)
        ? await fetchResourceTemplatesForClient(connection)
        : [];
    if (
      (await clearCachedFailureFor(connection.name, connection.config)) !== connection ||
      isMcpServerDisabled(connection.name) ||
      isMcpServerBlockedAtConnectTime(connection.name, connection.config)
    )
      return;
    await persistRawDiscoveryIfComplete(connection, {
      ...listing,
      templates: getDiscoveryFetchError(templates) === undefined ? templates : undefined,
    });
  } catch (error) {
    logMCPDebug(connection.name, `Discovery cache write-through skipped: ${errorMessage(error)}`);
  }
}
//@ chunk-sywnjtqb.js:131879-132172 placement
/**
 * isDiscoveryCacheMissRecoverable：发现缓存未命中原因是否需要重写缓存（absent/expired/corrupt 等为 true）。
 */
function isDiscoveryCacheMissRecoverable(probe) {
  switch (probe.reason) {
    case "absent":
    case "expired":
    case "corrupt":
    case "strike-threshold":
    case "no-fingerprint":
    case "unsealed":
      return true;
    case "disabled":
    case "key-unavailable":
    case "transport":
    case "live-connection":
    case "skills-capable":
    case "channel-capable":
      return false;
    default:
      return probe.reason;
  }
}
//@ chunk-sywnjtqb.js:132172-132699 placement
/**
 * discoverySourceLabel：发现缓存查询结果到遥测标签（live、miss_expired、miss_corrupt 等）。
 */
function discoverySourceLabel(probe) {
  if (probe.kind !== "miss") return "live";
  switch (probe.reason) {
    case "disabled":
      return "miss_disabled";
    case "key-unavailable":
      return "miss_disabled";
    case "unsealed":
      return "miss_corrupt";
    case "transport":
      return "live";
    case "absent":
      return "live";
    case "expired":
      return "miss_expired";
    case "corrupt":
      return "miss_corrupt";
    case "strike-threshold":
      return "miss_strike";
    case "no-fingerprint":
      return "miss_no_fingerprint";
    case "live-connection":
      return "live";
    case "skills-capable":
      return "live";
    case "channel-capable":
      return "live";
    default:
      return probe.reason;
  }
}
//@ chunk-sywnjtqb.js:132699-132823 placement
function getMaxResultSizeCharsMeta(tool) {
  let maxResultSizeChars = tool._meta?.["anthropic/maxResultSizeChars"];
  return typeof maxResultSizeChars === "number" &&
    Number.isFinite(maxResultSizeChars) &&
    maxResultSizeChars > 0
    ? maxResultSizeChars
    : undefined;
}
//@ chunk-sywnjtqb.js:132823-137499 placement
/**
 * buildMcpTool：把一个 MCP 工具定义包装成 CLI Tool：名字 mcp__<server>__<tool>（SDK 可去前缀）；描述按 CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH（默认 4096，经 ToolSearch 加载时 16384）截断；注解映射 isReadOnly/isDestructive/isOpenWorld/isConcurrencySafe；_meta 支持 anthropic/maxResultSizeChars、searchHint、alwaysLoad、requiresUserInteraction；checkPermissions 默认 passthrough 并建议写 localSettings allow 规则。
 */
function buildMcpTool({
  serverName,
  scope,
  pluginSource,
  serverType,
  source,
  skipPrefix,
  standardKey,
  denyKey,
  legacyGrantRefused = false,
  toolNameShared = false,
  legacyGrantRebindable = false,
  serverAlwaysLoad,
  serverDefersAllTools = false,
  effectiveMaxPermission,
  promptOverrides,
  isFirstPartyDesignServer,
  maxDescriptionLength: maxDescriptionLength_2 = maxDescriptionLength(),
  maxLoadedDescriptionLength = maxDescriptionLength(true),
  pluginTelemetry,
  cliOwned,
  accountMemory = false,
  accountMemoryServer = false,
  sdkDocsConnector = false,
  displayName,
  serverId,
  serverIdStamp,
  serverProvenance,
  serverUrl,
  iconUrl,
  serverInfoName,
  role,
  listed,
  call,
  overrides,
}) {
  let mcpToolName = buildMcpToolName(serverName, listed.name);
  let maxResultSizeCharsMeta = getMaxResultSizeCharsMeta(listed);
  let hasMaxResultSizeCap = maxResultSizeCharsMeta !== undefined;
  let requiresUserInteraction = listed._meta?.["anthropic/requiresUserInteraction"] === true;
  let announcements = toolUiMeta(listed._meta);
  let descriptionText = promptOverrides?.tools?.[listed.name] ?? listed.description ?? "";
  let truncatedDescription = truncateDescription_2(
    descriptionText,
    `Tool "${listed.name}" description`,
    serverName,
    maxDescriptionLength_2,
  );
  let truncatedLoadedDescription = truncateDescription_2(
    descriptionText,
    `Tool "${listed.name}" description`,
    serverName,
    maxLoadedDescriptionLength,
  );
  let searchHint =
    promptOverrides?.search_hints?.[listed.name] ??
    (typeof listed._meta?.["anthropic/searchHint"] === "string"
      ? listed._meta["anthropic/searchHint"]
      : undefined);
  let callWithOverlapSlots = withOverlapSlots(serverName, listed.name, call);
  let refuses = requiresConnectorGrant(serverName, {
    scope,
    pluginSource,
  });
  let requiresConnectorGrant_2 = refuses || legacyGrantRefused || toolNameShared;
  let canRebindLegacyGrant =
    legacyGrantRefused &&
    !toolNameShared &&
    legacyGrantRebindable &&
    !requiresUserInteraction &&
    effectiveMaxPermission !== "ask" &&
    overrides?.suppressesAlwaysAllowRule === undefined &&
    overrides?.requiresUserInteraction === undefined &&
    !isDesignGatedTool(isFirstPartyDesignServer, listed.name);
  let suppressesAllowRules =
    requiresConnectorGrant_2 || isDesignGatedTool(isFirstPartyDesignServer, listed.name);
  let ignoresWholeToolAllowRule = () =>
    refuses ||
    toolNameShared ||
    (legacyGrantRefused &&
      !ownsLegacyKey({
        serverName,
        serverType,
        serverId,
      })) ||
    isLegacyKeyUnclaimed({
      serverName,
      serverType,
      serverId,
    }) ||
    mayRecordServerOwner({
      serverName,
      serverType,
      serverId,
    });
  if (requiresConnectorGrant_2)
    logMCPDebug(
      serverName,
      refuses
        ? "Allow rules do not apply: this server's name starts like a claude.ai connector's. To use allow rules, the server needs another name, and the rules must use that name."
        : legacyGrantRefused
          ? "Allow rules do not apply: another MCP server already uses this name, or the name could not be recorded in the config file. Give this server a different name and write the rules for that name, or reconnect if the config file was busy."
          : `Allow rules do not apply to "${listed.name}": another tool of this server gets the same name in Claude Code. To use allow rules, the server must rename one of them.`,
    );
  return {
    ...MCPTool,
    name: skipPrefix ? listed.name : mcpToolName,
    mcpInfo: {
      serverName,
      scope,
      ...(pluginSource !== undefined && {
        pluginSource,
      }),
      serverType,
      ...(source !== undefined && {
        source,
      }),
      ...(pluginTelemetry && {
        pluginTelemetry,
      }),
      displayName,
      serverId,
      ...(serverIdStamp !== undefined && {
        serverIdStamp,
      }),
      ...(serverProvenance !== undefined && {
        serverProvenance,
      }),
      ...(serverUrl !== undefined && {
        serverUrl,
      }),
      iconUrl,
      serverInfoName,
      ...(cliOwned && {
        cliOwned: true,
      }),
      ...(standardKey !== undefined && {
        standardKey,
      }),
      ...(legacyGrantRefused && {
        legacyGrantRefused,
      }),
      ...(toolNameShared && {
        toolNameShared,
      }),
      ...(canRebindLegacyGrant && {
        legacyGrantRebindable,
      }),
      ...(denyKey !== undefined && {
        denyKey,
      }),
      ...(accountMemory && {
        accountMemory: true,
      }),
      ...(accountMemoryServer && {
        accountMemoryServer: true,
      }),
      ...(sdkDocsConnector && {
        sdkDocsConnector: true,
      }),
      toolName: listed.name,
      title: listed.annotations?.title?.replace(/\s+/g, " ").trim() || undefined,
      execution: listed.execution,
      role,
      effectiveMaxPermission,
      ...(announcements && {
        uiMeta: announcements,
      }),
      ...(describeHiddenMcpTool(listed._meta, serverName, listed.name) && {
        hiddenFromModel: true,
      }),
    },
    isMcp: true,
    searchHint: searchHint?.replace(/\s+/g, " ").trim() || undefined,
    alwaysLoad:
      !serverDefersAllTools &&
      ((serverAlwaysLoad && !(scope === "dynamic" && listed._meta?.["anthropic/alwaysLoad"] === false)) ||
        listed._meta?.["anthropic/alwaysLoad"] === true),
    async description() {
      return descriptionText;
    },
    async prompt({ loadedThroughToolSearch }) {
      return loadedThroughToolSearch ? truncatedLoadedDescription : truncatedDescription;
    },
    isConcurrencySafe() {
      return callWithOverlapSlots.mayOverlap || (listed.annotations?.readOnlyHint ?? false);
    },
    isReadOnly() {
      return listed.annotations?.readOnlyHint ?? false;
    },
    readOnlyHint: listed.annotations?.readOnlyHint,
    openWorldHint: listed.annotations?.openWorldHint,
    toAutoClassifierInput(input) {
      return mcpToolInputToAutoClassifierInput(input, listed.name);
    },
    isDestructive() {
      return listed.annotations?.destructiveHint ?? false;
    },
    isOpenWorld() {
      return listed.annotations?.openWorldHint ?? false;
    },
    requiresUserInteraction() {
      return requiresUserInteraction;
    },
    async validateInput(input, context) {
      let refusalMessage = refuseNonMainAccountMemoryWrite(accountMemoryServer, listed.name, context);
      if (refusalMessage === undefined)
        return {
          result: true,
        };
      logEvent("tengu_account_memory_spawned_write_refused", {
        caller: fromEnumOpt(context.memoryCaller) ?? lit("unmarked"),
      });
      return {
        result: false,
        message: refusalMessage,
        errorCode: 1,
      };
    },
    suppressesAlwaysAllowRule: (input, hasAlwaysAllowRule) =>
      requiresUserInteraction ||
      (effectiveMaxPermission === "ask" && !hasAlwaysAllowRule) ||
      ignoresWholeToolAllowRule() ||
      isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    ...((requiresConnectorGrant_2 || isServerIdentityActive()) && {
      ignoresWholeToolAllowRule,
    }),
    maxResultSizeChars: hasMaxResultSizeCap
      ? Math.min(maxResultSizeCharsMeta, MAX_MCP_RESULT_CHARS)
      : MCPTool.maxResultSizeChars,
    persistenceThresholdCeiling: hasMaxResultSizeCap ? MAX_MCP_RESULT_CHARS : undefined,
    inputJSONSchema: addComputerUseActionSummary(
      addActionSummaryToSchema(
        applyParamDescriptionOverrides(
          listed.inputSchema,
          promptOverrides?.param_descriptions?.[listed.name],
        ),
        mcpToolName,
      ),
      mcpToolName,
    ),
    async checkPermissions(input, context) {
      let planTokenDenial = gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, listed.name, input);
      if (planTokenDenial) return planTokenDenial;
      if (isFirstPartyDesignServer) {
        let notice = peekScopeExpansionNotice();
        let neededConsentBit =
          (await notice?.wouldNeedDesignConsent(
            context.toolState.get(DesignGateState),
            context.credentials,
          )) ?? null;
        if (neededConsentBit !== null && notice && context.toolUseId) {
          let consentNonce = rememberDesignConsentAsk(
            context.toolUseId,
            neededConsentBit,
            canAskDesignConsent(context),
          );
          return askDesignConsent(notice.consentPromptFor(neededConsentBit), input, consentNonce);
        }
      }
      if (requiresUserInteraction)
        return {
          behavior: "ask",
          message: "MCPTool requires permission.",
          suggestions: [],
          suppressAlwaysAllowRule: true,
        };
      return {
        behavior: "passthrough",
        message: "MCPTool requires permission.",
        suggestions: suppressesAllowRules
          ? []
          : [
              {
                type: "addRules",
                rules: [
                  {
                    toolName: mcpToolName,
                    ruleContent: undefined,
                  },
                ],
                behavior: "allow",
                destination:
                  serverName === REMOTE_BROWSER_SERVER_NAME && isRemoteBrowserModeFloorOn()
                    ? "session"
                    : "localSettings",
              },
            ],
      };
    },
    call: callWithOverlapSlots.call,
    userFacingName() {
      let trimmed = (listed.annotations?.title || listed.name).replace(/\s+/g, " ").trim();
      return `${serverName} - ${trimmed} (MCP)`;
    },
    ...overrides,
  };
}
//@ chunk-sywnjtqb.js:137499-137782 placement
/**
 * buildCachedClientTools：用发现缓存条目构造 type=cached 的客户端与工具（不连线）。
 */
async function buildCachedClientTools({ name, config, capabilities, serverInfo, savedAt, tools }) {
  primeEnsureConnected();
  await evictStaleFailedConnectMemoForServe(name, config);
  let cachedClient = {
    name,
    type: "cached",
    config,
    capabilities,
    ...(serverInfo && {
      serverInfo: {
        name: serverInfo.name,
        version: serverInfo.version,
      },
    }),
    cacheSavedAt: savedAt,
  };
  return {
    client: cachedClient,
    tools: await buildMcpToolsForClient(
      cachedClient,
      tools,
      Date.now(),
      "cache",
      beginDroppedToolsRound(cachedClient),
    ),
  };
}
//@ chunk-sywnjtqb.js:137782-155610 placement
/**
 * buildMcpToolsForClient：处理 tools/list 结果：校验/修正 inputSchema、数量上限、toolPermissions 与工具策略、IDE 工具白名单、角色等，逐个 buildMcpTool，并记录降级与 tengu_mcp_tools_listed 遥测。
 */
async function buildMcpToolsForClient(client, listedTools, startedAtMs, discoverySource, listingState) {
  listedTools = filterRemoteRepoTools(client.config, listedTools);
  let originalCount = listedTools.length;
  let streamingListingSanitizer = createStreamingListingSanitizer();
  let sanitizedTools = (
    await mapInTurns(listedTools, (tool) => streamingListingSanitizer(tool) ?? [])
  ).flat();
  listedTools = [];
  let loggableOrigin = loggingSafeOrigin(client.config);
  let baseAnalytics = mcpServerKeyHashEntry(client.config, client.name);
  let mcpServerName = mcpNameForAnalytics_GATE_EVALUATED(
    CLAUDEAI_SERVER_PREFIX(client.name),
    isMcpServerLoggableInAnalytics(client.name, client.config),
  );
  let truncatedCount = originalCount - sanitizedTools.length;
  if (truncatedCount > 0) {
    logMCPError(client.name, listingTruncatedNote("tools", truncatedCount, originalCount));
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_listing_over_limit"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: truncatedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  }
  if (originalCount === 0 && discoverySource === "live")
    logEvent("tengu_mcp_degraded", {
      reason: lit("connected_zero_tools"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      mcpServerName,
      ...baseAnalytics,
    });
  let CLAUDE_AGENT_SDK_MCP_NO_PREFIX = client.config.type === "sdk" && env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX;
  let toolPermissions =
    client.config.type === "claudeai-proxy" || client.config.type === "http" || client.config.type === "sse"
      ? client.config.toolPermissions
      : undefined;
  let effectiveToolPermissions = isRunnerDynamicServer(client.config)
    ? applyBlockedToolPolicy(toolPermissions)
    : toolPermissions;
  if (effectiveToolPermissions) {
    let permissionCount = Object.keys(effectiveToolPermissions).length;
    if (
      permissionCount > 0 &&
      !sanitizedTools.some((tool) => effectiveToolPermissions[tool.name] !== undefined)
    )
      logForDebugging(
        `[claudeai-mcp] ${client.name}: toolPermissions has ${permissionCount} entries but none matched upstream tool names \u2014 backend name drift?`,
        {
          level: "warn",
        },
      );
  }
  let normalizeEnabled = shouldNormalizeRootCombinators_2(client.config);
  let apiValidateEnabled = shouldDropInvalidToolSchemas_2(client.config);
  let normalizedCount = 0;
  let normalizeGatedCount = 0;
  let unsupportedCount = 0;
  let invalidMetaCount = 0;
  let invalidPropKeyCount = 0;
  let droppedTools = [];
  let invalidGatedCount = 0;
  let propKeyGatedCount = 0;
  let judgedTools = await mapInTurns(sanitizedTools, (tool) => {
    let judgment = judgeToolSchemaSendability(tool.inputSchema, {
      normalizeEnabled,
      apiValidateEnabled,
    });
    if (judgment.verdict === "drop" && judgment.cause !== "api_invalid") {
      if (judgment.cause === "normalize_gated") normalizeGatedCount++;
      else unsupportedCount++;
      logMCPError(
        client.name,
        `Skipping tool "${tool.name}": ${judgment.reason}. Other tools from this server remain available.`,
      );
      return [];
    }
    if (judgment.normalized) {
      normalizedCount++;
      logMCPDebug(
        client.name,
        `Normalized input schema for tool "${tool.name}" (flattened top-level ${judgment.normalized.combinators.join("/")})`,
      );
    }
    if (judgment.verdict === "drop") {
      if (judgment.rejection.check === "meta") invalidMetaCount++;
      else invalidPropKeyCount++;
      if (
        effectiveToolPermissions?.[tool.name] !== "blocked" &&
        isIncludedMcpTool_3(
          CLAUDE_AGENT_SDK_MCP_NO_PREFIX ? tool.name : buildMcpToolName(client.name, tool.name),
        )
      )
        droppedTools.push({
          toolName: tool.name,
          reason: judgment.rejection.detail,
        });
      logMCPError(
        client.name,
        `Skipping tool "${tool.name}": its input schema would be rejected by the Anthropic API (${judgment.rejection.detail}). Other tools from this server remain available.`,
      );
      return [];
    }
    if (judgment.apiWouldReject) {
      if (judgment.apiWouldReject.check === "meta") invalidGatedCount++;
      else propKeyGatedCount++;
      logMCPDebug(
        client.name,
        `Tool "${tool.name}" input schema would be rejected by the Anthropic API (${judgment.apiWouldReject.detail}); requests that include it may fail`,
      );
    }
    return judgment.normalized
      ? [
          {
            ...tool,
            inputSchema: judgment.normalized.schema,
            description: joinDescription(judgment.normalized.note, tool.description),
          },
        ]
      : [tool];
  });
  let keptTools = uniqByExport(judgedTools.flat(), "name");
  let schema = countByAlias(uniqByExport(sanitizedTools, "name"), (tool) =>
    buildMcpToolName(client.name, tool.name),
  );
  if (listingState.seq > listingState.state.applied) {
    listingState.state.applied = listingState.seq;
    client.droppedTools = uniqByExport(droppedTools, "toolName");
  }
  if (normalizedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalized"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      normalizedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (normalizeGatedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalize_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: normalizeGatedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (unsupportedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_unsupported"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: unsupportedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (invalidMetaCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: invalidMetaCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (invalidPropKeyCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: invalidPropKeyCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (invalidGatedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      keptCount: invalidGatedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  if (propKeyGatedCount > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      keptCount: propKeyGatedCount,
      mcpServerName,
      ...baseAnalytics,
    });
  let isLoggable = () => isMcpServerLoggableInAnalytics(client.name, client.config);
  let maxDescriptionLength = toolTimeoutForServer(client.config);
  let maxLoadedDescriptionLength = toolTimeoutForServer(client.config, true);
  await logToolCallXmlInDescriptions(
    keptTools,
    client.name,
    isLoggable(),
    loggableOrigin,
    client.instructions,
  );
  let isDesignServer = isDesignServerConfig(client.config);
  let promptOverrides = officialPluginPromptOverrides(client.config);
  let pluginTelemetry = client.config.pluginSource
    ? buildPluginEventFieldsFromId(client.config.pluginSource, policyEnabledPluginNameSet())
    : undefined;
  let cliOwned = isCliOwnedConfig(client.config);
  let isArtifactsServer = cliOwned && client.name === CLAUDE_ARTIFACTS;
  let wrapArtifactsPublishing = isArtifactsServer || isOwnCcrMcpServer(client.config);
  let unusedFlag = false;
  let toolsForBuild = keptTools;
  let memoryServer =
    sanitizedTools.some((tool) => isMemoryToolServer(client, tool.name)) ||
    toolsForBuild.some((tool) => isMemoryToolServer(client, tool.name)) ||
    (truncatedCount > 0 && isMemoryToolServer_2(client));
  let toolOptions = {
    serverName: client.name,
    scope: client.config.scope,
    pluginSource: client.config.pluginSource,
    serverType: client.config.type ?? "stdio",
    sdkDocsConnector: isDocsConnectorClient(client),
    source: mcpServerSource(client.name, client.config),
    skipPrefix: CLAUDE_AGENT_SDK_MCP_NO_PREFIX,
    serverAlwaysLoad: client.config.alwaysLoad === true,
    serverDefersAllTools: client.config.alwaysLoad === false,
    promptOverrides,
    isFirstPartyDesignServer: isDesignServer,
    maxDescriptionLength,
    maxLoadedDescriptionLength,
    pluginTelemetry,
    cliOwned,
    displayName: withDisplayName(client.config),
    standardKey: isStandardKeyActive()
      ? getServerIdentityKey(client.name, client.config, cliOwned === true)
      : undefined,
    legacyGrantRefused:
      isStandardKeyActive() &&
      (await isLegacyKeyRefused(
        {
          serverName: client.name,
          serverType: client.config.type ?? "stdio",
          serverId: connectorServerId(client.config),
        },
        requiresConnectorGrant(client.name, client.config),
        isIdentityTrackedServer(client.name, client.config),
      )),
    legacyGrantRebindable:
      isStandardKeyActive() &&
      !requiresConnectorGrant(client.name, client.config) &&
      isIdentityTrackedServer(client.name, client.config) &&
      isLegacyKeyOwnedElsewhere({
        serverName: client.name,
        serverType: client.config.type ?? "stdio",
        serverId: connectorServerId(client.config),
      }),
    denyKey: isStandardKeyActive() ? isRemoteTransport(client.config) : undefined,
    serverId: connectorServerId(client.config),
    serverIdStamp: dynamicServerConnectorId(client.name, client.config),
    ...serverProvenanceOf(client),
    iconUrl: "iconUrl" in client.config ? client.config.iconUrl : undefined,
    serverInfoName: stripIgnorables(client.serverInfo?.name ?? "") || undefined,
    role: "role" in client.config ? client.config.role : undefined,
  };
  let isClaudeInChrome = isClaudeInChromeMCPServer(client.name);
  let isDocsConnector = isDocsConnectorServer(client);
  let entries = proxyFillsListing(sanitizedTools);
  let filtered = (
    await mapInTurns(toolsForBuild, (listedTool) => {
      let mcpToolName = buildMcpToolName(client.name, listedTool.name);
      let hasResultSizeAnnotation = getMaxResultSizeCharsMeta(listedTool) !== undefined;
      let overrides = {
        ...(isClaudeInChrome &&
          isStdioConfig(client.config) && {
            ...needsAuthCacheModule().getClaudeInChromeMCPToolOverrides(listedTool.name),
            builtinRenderFamily: "claude-in-chrome",
          }),
        ...(isClaudeInChrome &&
          isClaudeAiProxyServer(client.config) && {
            ...createChromePermissionHandler(listedTool.name, listedTool._meta, (tool, args) =>
              readTabUrl(
                async (tool, args, signal) =>
                  (
                    await callMCPTool({
                      client: await ensureConnectedClient(client, {
                        context: "MCP tool call",
                        signal,
                      }),
                      tool,
                      args,
                      signal,
                      resultNotForModel: true,
                      imageLimits: IMAGE_LIMITS,
                      storageV5: undefined,
                      credentials: undefined,
                    })
                  ).content,
                tool,
                args,
              ),
            ),
          }),
        ...(client.name === REMOTE_BROWSER_SERVER_NAME && {
          excludedFromModeBypassAllow: isRemoteBrowserModeFloorOn,
        }),
        ...false,
        ...(client.config.type === "sdk" && isFileUploadServer(client.name)
          ? buildMcpToolPermissionOverrides(
              client.name,
              listedTool.name,
              listedTool.inputSchema.properties,
              mcpToolInputToAutoClassifierInput,
            )
          : {}),
        ...(isSlackSendToolName(listedTool.name) ? createSlackSendToolUi() : {}),
        ...(isClaudeTestWriteCall(client.name, client.config.pluginSource, listedTool.name)
          ? claudeTestWriteToolOverrides()
          : {}),
        ...{},
        ...(isArtifactsServer
          ? artifactsMcpLaptopModule()?.artifactsMcpLaptopToolOverridesFor(client.config)
          : {}),
        ...(isRunnerDynamicServer(client.config) && {
          skipAggregateToolResultBudget: true,
        }),
      };
      let tool = buildMcpTool({
        ...toolOptions,
        accountMemory: isMemoryServerConnection(client, listedTool.name),
        accountMemoryServer: memoryServer,
        effectiveMaxPermission: effectiveToolPermissions?.[listedTool.name],
        toolNameShared: enforcesGrants() && (schema[mcpToolName] ?? 0) > 1,
        listed: listedTool,
        overrides,
        async call(args, context, canUseTool, parentMessage, onProgress, callOptions) {
          let toolUseId = context.toolUseId ?? getFirstToolUseId(parentMessage);
          let refusal = refuseNonMainAccountMemoryWrite(memoryServer, listedTool.name, context);
          if (refusal !== undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              refusal,
              "account memory write from a spawned loop",
            );
          let callMeta = {
            ...stripHostMetaUnlessCcrScoped(client.config, context.mcpRequestMeta),
            ...callOptions?.mcpCallMeta,
            ...(toolUseId && {
              "claudecode/toolUseId": toolUseId,
            }),
            ...consumeMcpApprovalTicket(context.session, context.toolUseId, client.name, client.config),
            ...(isClaudeInChromeMCPServer(client.name) &&
              isClaudeAiProxyServer(client.config) &&
              judgedSiteMeta(context)),
            ...((isDocsConnectorServer(client) || isOwnArtifactMcpTool(client.name, client.config)) &&
              requestIdMeta(parentMessage.requestId)),
            ...(isHearthbotRelayServer(client) && ccrTurnEventHeaders(turnTraceContextsOf())),
            ...agentRequestMeta(client, context),
            ...(isAccountMemoryServer(client) &&
              memoryChainMeta(context.toolState, parentMessage.message.id)),
          };
          let backgrounded = false;
          function reportProgress(data) {
            if (!onProgress || !toolUseId || backgrounded) return;
            onProgress({
              type: "progress",
              toolUseID: toolUseId,
              data,
            });
          }
          reportProgress({
            type: "mcp_progress",
            status: "started",
            serverName: client.name,
            toolName: listedTool.name,
          });
          let now = Date.now();
          let currentClient = client;
          let awaitingUserInput = false;
          let stopApprovalTiming;
          let releasePark = null;
          let __consentNonce = typeof args.__consentNonce === "string" ? args.__consentNonce : undefined;
          if ("__consentNonce" in args) {
            let { __consentNonce, ...restArgs } = args;
            args = restArgs;
          }
          let consentAsk = isDesignServer ? takeDesignConsentAsk(toolUseId, __consentNonce) : null;
          if (isDesignServer)
            noteDesignProjectId(
              context.toolState.get(DesignGateState),
              isDesignServer,
              listedTool.name,
              args,
            );
          let taskBackground;
          let setAwaitingUserInput = (waiting) => {
            awaitingUserInput = waiting;
            if (waiting) {
              stopApprovalTiming ??= callOptions?.timing?.mark("approval");
              if (!backgrounded && tool.name !== getPermissionPromptToolName() && releasePark === null)
                releasePark = parkOnUser();
            } else {
              stopApprovalTiming?.();
              stopApprovalTiming = undefined;
              releasePark?.();
              releasePark = null;
            }
          };
          let firstAttempt = true;
          let invokeTool = async (signal) => {
            let stepUpRetried = false;
            let stepUpScope;
            for (let idx = 0; ; idx++)
              try {
                let toolUseId_2 = firstAttempt ? toolUseId : undefined;
                firstAttempt = false;
                let stopTiming = callOptions?.timing?.mark(
                  client.config.type === "http" && issuerKey_3(client.config.url) ? "own" : "external",
                );
                let toolClient = await ensureConnectedClient(client, {
                  context: "MCP tool call",
                  toolUseId: toolUseId_2,
                }).finally(stopTiming);
                currentClient = toolClient;
                applyMemoryCallerMeta(callMeta, memoryServer, context, toolClient);
                let result = await callMCPToolWithUrlElicitationRetry({
                  client: toolClient,
                  clientConnection: client,
                  tool: listedTool.name,
                  args,
                  meta: callMeta,
                  signal,
                  imageLimits: imageLimitsForModel(context.options.mainLoopModel),
                  taskRegistry: context.taskRegistry,
                  toolUseId,
                  onProgress: onProgress && toolUseId ? reportProgress : undefined,
                  requestDialog: context.requestDialog,
                  storageV5: context.storageV5,
                  credentials: context.credentials,
                  hasResultSizeAnnotation: hasResultSizeAnnotation || context.innerCall === true,
                  onAwaitingUserInput: setAwaitingUserInput,
                  timing: callOptions?.timing,
                  offCriticalPath:
                    (getBackgroundAgentId(context.agentContext) ??
                      (context.isBackgroundAgent ? context.agentId : undefined)) !== undefined,
                  taskBackground,
                  disallowTasks:
                    context.agentId !== undefined ||
                    (context.options.isNonInteractiveSession && taskBackground === undefined),
                  ccrNeedsApprovalRetry:
                    "url" in client.config &&
                    isSameOriginAsCcr(client.config.url) &&
                    canPromptForPermission(context) &&
                    !(getPermissionPromptToolName() && getPermissionPromptToolName() !== "stdio")
                      ? {
                          canUseTool,
                          tool,
                          fullyQualifiedName: mcpToolName,
                          toolUseContext: context,
                          parentMessage,
                        }
                      : undefined,
                });
                if (result.interrupted) throw new AbortError(INTERRUPTED_CALL_NOTICE);
                reportProgress({
                  type: "mcp_progress",
                  status: "completed",
                  serverName: client.name,
                  toolName: listedTool.name,
                  elapsedTimeMs: Date.now() - now,
                });
                if (!result.isError) {
                  logPrCreateOperation(listedTool.name);
                  if (isAccountMemoryServer(client))
                    rememberMemoryChain(context.toolState, parentMessage.message.id, result._meta);
                  if (
                    !backgrounded &&
                    isClaudeInChromeMCPServer(client.name) &&
                    isClaudeAiProxyServer(client.config)
                  )
                    result.content = chromeNoBrowserAnswer(result.content, result._meta, context);
                }
                if (idx > 0) logFeatureOk("mcp_session_recovery");
                let rewrittenMeta = rewriteAnthropicSourcesForCcr(
                  client.config,
                  stripAnthropicMeta(result._meta),
                );
                let taskMeta = isMcpTasksEnabled()
                  ? mcpTaskDriveModule.sdkAgentTaskMeta(result._meta)
                  : undefined;
                let mergedMeta =
                  rewrittenMeta || taskMeta
                    ? {
                        ...rewrittenMeta,
                        ...taskMeta,
                      }
                    : undefined;
                return {
                  data:
                    stepUpScope === undefined
                      ? result.content
                      : stepUpResultMessage(result.content, client.name, stepUpScope),
                  ...(result.urlElicitationDeclined && {
                    urlElicitationDeclined: result.urlElicitationDeclined,
                  }),
                  ...((mergedMeta || result.structuredContent || result.resourceLinks) && {
                    mcpMeta: {
                      ...(mergedMeta && {
                        _meta: mergedMeta,
                      }),
                      ...(result.structuredContent && {
                        structuredContent: result.structuredContent,
                      }),
                      ...(result.resourceLinks && {
                        resourceLinks: result.resourceLinks,
                      }),
                    },
                  }),
                };
              } catch (error) {
                if (
                  stepUpScope !== undefined &&
                  error instanceof McpAuthError &&
                  error.requestedScope !== undefined &&
                  client.config.type === "http"
                )
                  markStepUpExhausted(client.name, client.config, stepUpScope, error.requestedScope);
                if (
                  !stepUpRetried &&
                  error instanceof McpAuthError &&
                  error.requestedScope !== undefined &&
                  isStepUpAuthDialogEnabled() &&
                  client.config.type === "http" &&
                  client.config.oauth?.xaa !== true &&
                  grantedScopesCover(client.config, error.requestedScope) &&
                  !isStepUpExhausted(client.name, client.config, error.requestedScope) &&
                  canPromptForPermission(context) &&
                  context.agentId === undefined &&
                  tool.name !== getPermissionPromptToolName() &&
                  !context.options.isNonInteractiveSession &&
                  !isBrowserUnavailable() &&
                  !isUnattendedBgSession() &&
                  getTeammateAgentId() === undefined &&
                  !isMcpServerDisabled(client.name) &&
                  !isMcpDialBlockedByPolicy(client.name, client.config)
                ) {
                  let config = client.config;
                  setAwaitingUserInput(true);
                  let stepUpResult;
                  try {
                    stepUpResult = await runStepUpReauth({
                      serverName: client.name,
                      config,
                      requestedScope: error.requestedScope,
                      canUseTool,
                      toolUseContext: context,
                      signal,
                      performOAuthFlow: performMCPOAuthFlow_2,
                      reconnect: (name, config) =>
                        proxyRequest(name, config, context.storageV5, context.credentials),
                      discard: (name, config) => clearServerCache(name, config),
                      isPermitted: (name, config) =>
                        !isMcpServerDisabled(name) && !isMcpDialBlockedByPolicy(name, config),
                    });
                  } finally {
                    setAwaitingUserInput(false);
                  }
                  if (stepUpResult === "reauthenticated") {
                    stepUpRetried = true;
                    stepUpScope = error.requestedScope;
                    logMCPDebug(
                      client.name,
                      `Retrying tool '${listedTool.name}' after the consented step-up re-auth`,
                    );
                    idx -= 1;
                    continue;
                  }
                }
                if (
                  error instanceof McpSessionExpiredError &&
                  idx < 1 &&
                  (!error.mayHaveRun ||
                    tool.isConcurrencySafe(args) ||
                    listedTool.annotations?.idempotentHint === true)
                ) {
                  logFeatureSad("mcp_session_recovery", error.expiryKind);
                  logMCPDebug(client.name, `Retrying tool '${listedTool.name}' after session recovery`);
                  continue;
                }
                if (error instanceof McpSessionExpiredError)
                  logFeatureBad(
                    "mcp_session_recovery",
                    idx < 1 ? "may_have_run_no_retry" : "session_retry_exhausted",
                  );
                else if (idx > 0 && !signal.aborted)
                  logFeatureBad("mcp_session_recovery", "retry_failed_other");
                reportProgress({
                  type: "mcp_progress",
                  status: "failed",
                  serverName: client.name,
                  toolName: listedTool.name,
                  elapsedTimeMs: Date.now() - now,
                });
                if (!signal.aborted) noteHearthDegraded(client.name, error);
                if (
                  error instanceof Error &&
                  !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
                ) {
                  let errorName = error.constructor.name;
                  let sourceCategory = () =>
                    signal.aborted ? "other" : classifyMcpErrorSourceCategory(error);
                  if (errorName === "Error") {
                    let message = describeConnectError(error, client.config);
                    throw Object.assign(
                      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                        message,
                        message.slice(0, 200),
                      ),
                      {
                        mcpErrorSource: sourceCategory(),
                      },
                    );
                  }
                  if (
                    "code" in error &&
                    (((errorName === "McpError" || errorName === "ProtocolError") &&
                      typeof error.code === "number") ||
                      ((errorName === "SdkError" || errorName === "SdkHttpError") &&
                        (typeof error.code === "number" ||
                          (typeof error.code === "string" && MCP_SDK_ERROR_CODES.has(error.code)))))
                  ) {
                    let merged = Object.assign(
                      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                        error.message,
                        `${errorName} ${error.code}`,
                      ),
                      {
                        mcpErrorSource: sourceCategory(),
                      },
                    );
                    throw isNeedsApprovalOrExpiredSession(error) ? markRefusedByCcrProxy(merged) : merged;
                  }
                }
                raiseMemoryErrorCap(error, client, listedTool.name);
                throw error;
              }
          };
          let callImpl = invokeTool;
          if (isDesignServer)
            callImpl = wrapCallWithDesignConsent(invokeTool, {
              designSession: context.toolState.get(DesignGateState),
              approvedConsentBit: consentAsk?.bit ?? null,
              consentAskReachesUser: (consentAsk?.askReachesUser ?? false) && canAskDesignConsent(context),
              credentials: context.credentials,
            });
          if (listedTool.name === GET_TASK && isToolboxServer(client)) {
            let { withTaskFilesRemembered } =
              await import("../../tools/SaveTaskFilesTool/addTaskFileSaves.lazy.js");
            callImpl = withTaskFilesRemembered(callImpl, {
              client,
              args,
              session: context.session,
            });
          }
          let canAutoBackground =
            !context.agentId &&
            context.taskRegistry !== UNLIMITED_RATE_LIMITER &&
            tool.name !== getPermissionPromptToolName();
          if (mcpAutoBackgroundModule && canAutoBackground) {
            let mcpAutoBackgroundMs = mcpAutoBackgroundModule.getMcpAutoBackgroundMs(client.config, {
              isNonInteractiveSession: context.options.isNonInteractiveSession,
            });
            let movableWithoutTimer =
              mcpAutoBackgroundMs === 0 &&
              mcpAutoBackgroundModule.isMcpCallMovableWithoutTimer(client.config, {
                isNonInteractiveSession: context.options.isNonInteractiveSession,
                isInnerCall: context.innerCall === true,
              });
            if (mcpAutoBackgroundMs > 0 || movableWithoutTimer) {
              let share = {
                becameTask: false,
              };
              if (!movableWithoutTimer && isMcpTasksEnabled() && !isTaskBackgroundDisabled())
                taskBackground = {
                  share,
                  session: context.session,
                  storageV5: context.storageV5,
                  credentials: context.credentials,
                  onBackgrounded: () => {
                    backgrounded = true;
                  },
                };
              return mcpAutoBackgroundModule.callMcpToolWithAutoBackground({
                run: callImpl,
                serverName: client.name,
                toolName: listedTool.name,
                accountMemoryTool: isLiveMemoryTool(tool),
                toolUseId,
                parentAbortController: context.abortController,
                taskRegistry: context.taskRegistry,
                autoBackgroundMs: movableWithoutTimer ? null : mcpAutoBackgroundMs,
                storageV5: context.storageV5,
                credentials: context.credentials,
                hasPendingElicitation: () =>
                  awaitingUserInput ||
                  ((currentClient.type === "connected"
                    ? currentClient.transportErrorState?.pendingElicitations
                    : undefined) ?? 0) > 0,
                onBackgrounded: () => {
                  backgrounded = true;
                },
                share,
                foregroundCalls: context.innerCall
                  ? undefined
                  : foregroundCallRegistrySlots.of(context.session),
                noticeGate: wrapHoldAware({
                  hookCaller: context.hookCaller,
                  hookServesModel: context.hookServesModel,
                  pluginUnnamed: context.pluginUnnamed,
                }),
              });
            }
          }
          if (
            canAutoBackground &&
            isMcpTasksEnabled() &&
            !isTaskBackgroundDisabled() &&
            env.CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS !== 0 &&
            (!getIsNonInteractiveSession() || env.CLAUDE_AUTO_BACKGROUND_TASKS === true) &&
            !isPrintInputClosed()
          )
            taskBackground = {
              share: {
                becameTask: false,
              },
              session: context.session,
              storageV5: context.storageV5,
              credentials: context.credentials,
              onBackgrounded: () => {
                backgrounded = true;
              },
            };
          return callImpl(context.abortController.signal);
        },
      });
      if (isClaudeInChrome && (listedTool.name === "file_upload" || listedTool.name === "browser_batch")) {
        let CLAUDE_CODE_IS_COWORK =
          !isStdioConfig(client.config) && !env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_IS_COWORK;
        let originalCall = tool.call;
        tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
          let {
            FILE_UPLOAD_MAX_TOTAL_BYTES,
            passThroughChromeFileUploadInput,
            prepareChromeFileUploadInput,
          } = await import("../../utils/claudeInChrome/fileUpload.js");
          let prepared = CLAUDE_CODE_IS_COWORK
            ? await passThroughChromeFileUploadInput(
                listedTool.name,
                input ?? {},
                getToolPermissionContext(context),
              )
            : await prepareChromeFileUploadInput(
                listedTool.name,
                input ?? {},
                getToolPermissionContext(context),
                isClaudeAiProxyServer(client.config)
                  ? {
                      maxTotalBytes: chromeUploadMaxBytes(listedTool._meta, FILE_UPLOAD_MAX_TOTAL_BYTES),
                      hosted: {
                        session: context.session,
                        signal: context.abortController.signal,
                      },
                    }
                  : undefined,
              );
          if (prepared.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              prepared.error,
              "Claude in Chrome file_upload path rejected",
            );
          return originalCall(
            prepared.input ?? input,
            context,
            canUseTool,
            parentMessage,
            onProgress,
            prepared.callMeta
              ? {
                  ...callOptions,
                  mcpCallMeta: prepared.callMeta,
                }
              : callOptions,
          );
        };
      }
      if (
        client.config.type === "sdk" &&
        isFileUploadServer(client.name) &&
        FILE_UPLOAD_TOOLS.includes(listedTool.name) &&
        !env.CLAUDE_CODE_REMOTE &&
        !env.CLAUDE_CODE_IS_COWORK &&
        resolveSdkUrl().status === "absent"
      ) {
        let hostAsksUpload = listedTool._meta?.[ANTHROPIC_HOSTASKSPERUPLOADEDFILE] === true;
        let originalCall = tool.call;
        tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
          let paneModule = await import("../../utils/claudeInChrome/paneFileUploadCall.lazy.js");
          let prepared = await paneModule.paneFileUploadCall(
            input,
            getToolPermissionContext(context),
            context.mcpRequestMeta,
            hostAsksUpload,
            context.autoModeClassified === true,
          );
          return originalCall(
            prepared.input,
            {
              ...context,
              mcpRequestMeta: prepared.mcpRequestMeta,
            },
            canUseTool,
            parentMessage,
            onProgress,
            callOptions && {
              ...callOptions,
              mcpCallMeta: {},
            },
          );
        };
      }
      if (isTaskWriteMethod(listedTool.name)) {
        let toolName = listedTool.name;
        let validateInput = tool.validateInput;
        tool.validateInput = async (input, context) => {
          let validation = validateInput
            ? await validateInput(input, context)
            : {
                result: true,
              };
          if (!validation.result) return validation;
          let { startTaskInputRefusal } = await import("../taskFiles/startTaskFiles.js");
          let taskInputRefusal = startTaskInputRefusal(
            client,
            toolName,
            input,
            tool.inputJSONSchema,
            context.session,
          );
          return taskInputRefusal === undefined
            ? validation
            : {
                result: false,
                message: taskInputRefusal,
                errorCode: 2,
              };
        };
        let prompt = tool.prompt;
        tool.prompt = async (input) => {
          let basePrompt = await prompt(input);
          let toolPermissionContext = await input.getToolPermissionContext();
          if (toolPermissionContext.isRemoteMode !== true) return basePrompt;
          let { startTaskFilesPromptNote } = await import("../taskFiles/startTaskFiles.js");
          let taskFilesPromptNote = startTaskFilesPromptNote(client, toolName, toolPermissionContext);
          return taskFilesPromptNote === undefined
            ? basePrompt
            : `${basePrompt}

${taskFilesPromptNote}`;
        };
        let originalCall = tool.call;
        tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
          let args = input ?? {};
          if (!Array.isArray(args.files) || args.files.length === 0)
            return originalCall(input, context, canUseTool, parentMessage, onProgress, callOptions);
          let {
            prepareStartTaskFileInputs,
            removeStartTaskUploadsFor,
            startTaskInputRefusal,
            startTaskSendRefusal,
          } = await import("../taskFiles/startTaskFiles.js");
          let toolUseId = context.toolUseId;
          let pendingTaskFilesForArgs = findPendingTaskFilesForArgs(context.session, toolUseId, args.files);
          if (pendingTaskFilesForArgs !== undefined && toolUseId !== undefined) {
            let taskSendRefusal = startTaskSendRefusal(pendingTaskFilesForArgs.uploadStartedAt, toolName);
            if (taskSendRefusal !== undefined) {
              await discardTaskFiles(context.session, pendingTaskFilesForArgs);
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                taskSendRefusal,
                "start_task files not sent after the approval",
              );
            }
            pendingTaskFilesForArgs.state = "sending";
            registerDiscarder(context.session, toolUseId, () =>
              startTaskSendRefusal(pendingTaskFilesForArgs.uploadStartedAt, toolName),
            );
            try {
              return await originalCall(input, context, canUseTool, parentMessage, onProgress, callOptions);
            } catch (error) {
              if (isRefusedByCcrProxy(error)) {
                pendingTaskFilesForArgs.state = "pending";
                await discardTaskFiles(context.session, pendingTaskFilesForArgs);
              }
              throw error;
            } finally {
              unregisterDiscarder(context.session, toolUseId);
              markTaskFilesSent(context.session, pendingTaskFilesForArgs);
            }
          }
          let taskInputRefusal = startTaskInputRefusal(
            client,
            toolName,
            args,
            tool.inputJSONSchema,
            context.session,
          );
          if (taskInputRefusal !== undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              taskInputRefusal,
              "start_task input refused",
            );
          let now = Date.now();
          let startTaskFileInputs = await prepareStartTaskFileInputs(
            client,
            toolName,
            args,
            getToolPermissionContext(context),
            context.abortController.signal,
            context.session,
          );
          if (startTaskFileInputs.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              startTaskFileInputs.error,
              "start_task file input rejected",
            );
          if (startTaskFileInputs.input === undefined || toolUseId === undefined)
            return originalCall(
              startTaskFileInputs.input ?? input,
              context,
              canUseTool,
              parentMessage,
              onProgress,
              callOptions,
            );
          registerDiscarder(context.session, toolUseId, () => startTaskSendRefusal(now, toolName));
          try {
            return await originalCall(
              startTaskFileInputs.input,
              context,
              canUseTool,
              parentMessage,
              onProgress,
              callOptions,
            );
          } catch (error) {
            if (isRefusedByCcrProxy(error))
              await removeStartTaskUploadsFor(client, context.session, startTaskFileInputs.input.files);
            throw error;
          } finally {
            unregisterDiscarder(context.session, toolUseId);
          }
        };
        if (isToolboxMcpServer(client))
          tool.askInputPreparer = async (input, context, overrides) => {
            if (!Array.isArray(input.files) || input.files.length === 0) return;
            let { startTaskAskInputPreparer, startTaskInputRefusal } =
              await import("../taskFiles/startTaskFiles.js");
            let taskAskInputPreparer = startTaskAskInputPreparer(
              client,
              toolName,
              input,
              getToolPermissionContext(context),
              context.abortController.signal,
              context.session,
              overrides,
            );
            return (
              taskAskInputPreparer && {
                prepare: () => {
                  let taskInputRefusal = startTaskInputRefusal(
                    client,
                    toolName,
                    input,
                    tool.inputJSONSchema,
                    context.session,
                  );
                  return taskInputRefusal === undefined
                    ? taskAskInputPreparer.prepare()
                    : Promise.resolve({
                        error: taskInputRefusal,
                      });
                },
              }
            );
          };
      }
      let { validateInput, call: originalCall, askInputPreparer } = tool;
      if (listedTool._meta?.[ANTHROPIC_FILEINPUTS] !== undefined)
        wireFileInputs(
          tool,
          {
            client,
            name: listedTool.name,
            meta: listedTool._meta,
            schema: tool.inputJSONSchema,
          },
          (context) => async (tool, args) =>
            (
              await callMCPTool({
                client: await ensureConnectedClient(client, {
                  context: "MCP tool call",
                }),
                tool,
                args,
                signal: context.abortController.signal,
                imageLimits: imageLimitsForModel(context.options.mainLoopModel),
                hasResultSizeAnnotation: true,
                storageV5: context.storageV5,
                credentials: context.credentials,
              })
            ).structuredContent,
        );
      {
        let refToolName = fileReferenceToolToFill(client, listedTool.name, entries);
        if (refToolName !== undefined)
          wrapFileReferenceTool(
            tool,
            refToolName,
            {
              validateInput,
              call: originalCall,
              askInputPreparer,
            },
            getFirstToolUseId,
            filledCallRequestMeta(client),
          );
      }
      if (tool.mcpInfo !== undefined && fileReferenceToolForRecords(client, listedTool.name) !== undefined)
        tool.mcpInfo = {
          ...tool.mcpInfo,
          fileReference: true,
        };
      if (isArtifactsServer || isRunnerDynamicServer(client.config))
        artifactPermissionRulesModule()?.applyArtifactRules(client.config, tool);
      if (wrapArtifactsPublishing)
        artifactsMcpLaptopModule()?.wrapArtifactsMcpLaptopPublishing(client.config, tool);
      if (isDocsConnector) claudeDocsWakeModule()?.wrapClaudeDocsCreateWake(tool);
      if (isClaudeInChrome && client.config.type !== "sdk") {
        let originalCall = tool.call;
        tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
          let deniedReason = policyDeniedReason("allow_claude_browser_extension", "Claude in Chrome", "is");
          if (deniedReason !== null)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              deniedReason,
              "Claude in Chrome call refused by org policy",
            );
          return originalCall(input, context, canUseTool, parentMessage, onProgress, callOptions);
        };
      }
      let finalOriginalCall = tool.call;
      tool.call = async (input, context, canUseTool, parentMessage, onProgress, callOptions) => {
        context.options.activeMcpServer = client.name;
        context.options.activeMcpTool = listedTool.name;
        if (client.config.pluginSource) {
          recordPluginUsage(client.config.pluginSource);
          recordPluginActivity(client.config.pluginSource, "mcp", {
            kind: "mcp-server",
            name: client.name,
          });
        }
        let loggable = isLoggable();
        if (loggable) markMcpServerLoggable(client.name);
        let keepInput =
          (isTaskWriteMethod(listedTool.name) &&
            findPendingTaskFilesForArgs(context.session, context.toolUseId, input?.files) !== undefined) ||
          (listedTool._meta?.[ANTHROPIC_FILEINPUTS] !== undefined
            ? (await import("./fileGrants.js")).hasFileGrants(context.session, context.toolUseId)
            : false);
        return finalOriginalCall(
          keepInput
            ? input
            : stripTrailingInvokeSuffix(
                input,
                listedTool.name,
                client.name,
                loggable,
                getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_strip_trailing_xml_tags", false),
                loggableOrigin,
              ),
          context,
          canUseTool,
          parentMessage,
          onProgress,
          callOptions,
        );
      };
      return tool;
    })
  ).filter(isIdeServer_2);
  let mapped = keptTools.map(
    (tool) => (promptOverrides?.tools?.[tool.name] ?? tool.description ?? "").length,
  );
  let reduced = mapped.reduce((acc, length) => acc + length, 0);
  logEvent("tengu_mcp_tools_listed", {
    transportType: fromEnum(client.config.type ?? "stdio"),
    listDurationMs: Date.now() - startedAtMs,
    toolCount: filtered.length,
    alwaysLoadCount: countWhere(filtered, (tool) => tool.alwaysLoad === true),
    descriptionTotalLength: reduced,
    descriptionMaxLength: mapped.reduce((acc, length) => Math.max(acc, length), 0),
    descriptionMeanLength: mapped.length ? Math.round(reduced / mapped.length) : 0,
    descriptionOverLimitCount: countWhere(mapped, (length) => length > maxDescriptionLength),
    discoverySource: fromEnum(discoverySource),
    ...baseAnalytics,
    mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
      CLAUDEAI_SERVER_PREFIX(client.name),
      isMcpServerLoggableInAnalytics(client.name, client.config),
    ),
  });
  if (discoverySource === "live") logFeatureOk("mcp_list_tools");
  if (isStdioConfig(client.config) && isClaudeInChromeMCPServer(client.name))
    logChromeToolsAdded(filtered.length, discoverySource);
  if (isToolboxServer(client)) {
    let { addTaskFileSaves } = await import("../../tools/SaveTaskFilesTool/addTaskFileSaves.lazy.js");
    addTaskFileSaves(filtered, {
      client,
      listed: toolsForBuild,
      compose: (listed, call, overrides, effectiveMaxPermission) =>
        buildMcpTool({
          ...toolOptions,
          accountMemoryServer: memoryServer,
          effectiveMaxPermission,
          listed,
          call,
          overrides,
        }),
    });
  }
  return filtered;
}
//@ chunk-sywnjtqb.js:155610-155880 placement
async function awaitToolsListAhead(client, aheadPage) {
  let settledPage = await aheadPage.page.then(
    (result) => ({
      result,
    }),
    () => {
      return;
    },
  );
  if (settledPage === undefined) return aheadPage;
  let listingState =
    typeof settledPage.result === "object" && settledPage.result !== null
      ? officeBridgeListingState(settledPage.result)
      : undefined;
  noteListChangedAhead(
    client,
    listingState === "live" ? "used" : listingState === "stub" ? "dropped_stub" : "dropped_unmarked",
  );
  return listingState === "live" ? aheadPage : undefined;
}
//@ chunk-sywnjtqb.js:155880-157928 placement
/**
 * fetchToolsForClient：按 name+config 记忆化的 tools/list（modern 协议走 listTools 聚合，legacy 翻页），结果交给 buildMcpToolsForClient；401/403 时标记 needs-auth。
 */
var fetchToolsForClient; // deferred: uses memoizeWithLRU (./needsAuthCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sywnjtqb.js:155880", () => {
  fetchToolsForClient = memoizeWithLRU(
    async (client, storageV5, rawOnly) => {
      if (client.type !== "connected") return [];
      let epochAtStart = identityEpoch();
      let droppedToolsRound = beginDroppedToolsRound(client);
      try {
        if (!client.capabilities?.tools) {
          let rawTools = [];
          recordRawToolsForResult(rawTools, []);
          return rawTools;
        }
        let now = Date.now();
        let sdkClient = clientOf(client.client);
        let aheadPage = hasNoTransport(sdkClient) ? undefined : takeAheadPage_2(sdkClient);
        let usedAheadPage;
        let listFromPage = (page) =>
          listAllPages_2(
            sdkClient,
            client.name,
            client.config,
            "tools/list",
            isHTTPConfig(client.config),
            (page) => page.tools,
            page,
            (page) => noteFirstPageMark(sdkClient, page),
          );
        let listedTools = await reportFirstToolsList(
          sdkClient,
          sdkClient.getProtocolEra?.() === "modern"
            ? listToolsModern(sdkClient, client.name, client.config)
            : aheadPage === undefined
              ? listFromPage(undefined)
              : awaitToolsListAhead(sdkClient, aheadPage).then((aheadResult) => {
                  usedAheadPage = aheadResult;
                  return listFromPage(aheadResult?.page);
                }),
          () => usedAheadPage?.sentAtMs,
        );
        client.toolsListError = undefined;
        client.discoveryAuthFailure = undefined;
        let initialTools = listedTools;
        if (rawOnly === true) {
          let rawTools = [];
          recordRawToolsForResult(rawTools, initialTools);
          return rawTools;
        }
        let memoResult = listToolsWithMemo(client, initialTools, epochAtStart, droppedToolsRound, () => ({
          normalizeEnabled: shouldNormalizeRootCombinators_2(client.config),
          apiValidateEnabled: shouldDropInvalidToolSchemas_2(client.config),
        }));
        if (memoResult?.reuse !== undefined) {
          recordRawToolsForResult(memoResult.reuse, initialTools);
          return memoResult.reuse;
        }
        let tools = await buildMcpToolsForClient(client, initialTools, now, "live", droppedToolsRound);
        if (droppedToolsRound.seq === droppedToolsRound.state.started) {
          client.toolsListError = undefined;
          client.discoveryAuthFailure = undefined;
        }
        recordRawToolsForResult(tools, initialTools);
        settleToolListingMemo(client, memoResult, tools, droppedToolsRound);
        return tools;
      } catch (error) {
        let errorDetail = redactMcpErrorDetail(
          client.name,
          client.config,
          describeConnectError(error, client.config),
        );
        if (client.config.type === "claudeai-proxy" && isListAuthError_2(error)) {
          logEvent("tengu_mcp_server_needs_auth", {
            transportType: lit("claudeai-proxy"),
            cause: lit("discovery_tools_list"),
            ...mcpServerKeyHashEntry(client.config, client.name),
          });
          if (isCurrentIdentityEpoch(epochAtStart))
            isMcpAuthCached_3(client.name, client.config.id, undefined, storageV5);
          logFeatureSad("mcp_list_tools", "mcp_list_tools_needs_auth");
          logMCPDebug(client.name, "tools/list 401/403 on claude.ai proxy \u2014 flagging needs-auth");
          client.discoveryAuthFailure = true;
          getConnectionCache().toolLists.delete(serverCacheKey(client.name, client.config));
          return [];
        }
        if (isListAuthError_2(error) && hasLapsedCcrSignIn(client.name, client.config))
          client.discoveryAuthFailure = true;
        let isBearerRejected =
          client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error);
        let failureMetric = isBearerRejected
          ? "mcp_list_tools_claudeai_bearer_rejected"
          : (error instanceof ProtocolError || error instanceof SdkError) && !(error instanceof SdkHttpError)
            ? `mcp_list_tools_${LIST_FAILURE_REASONS[error.code] ?? "mcperr_other"}`
            : errorDetail.includes("timed out")
              ? "mcp_list_tools_timeout"
              : "mcp_list_tools_failed";
        logFeatureSad("mcp_list_tools", failureMetric);
        (isBearerRejected ? logMCPDebug : logMCPError)(client.name, `Failed to fetch tools: ${errorDetail}`);
        client.toolsListError = errorDetail;
        if (isBearerRejected) client.discoveryBearerRejected = true;
        let emptyTools = [];
        getCliOwnedState().toolsListErrorByResult.set(emptyTools, errorDetail);
        if (!isBearerRejected) {
          let serverFields = mcpServerKeyHashEntry(client.config, client.name);
          logEvent("tengu_mcp_degraded", {
            reason: lit("tools_list_failed"),
            transportType: fromEnum(client.config.type ?? "stdio"),
            ...serverFields,
            mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
              CLAUDEAI_SERVER_PREFIX(client.name),
              isMcpServerLoggableInAnalytics(client.name, client.config),
            ),
          });
        }
        getConnectionCache().toolLists.delete(serverCacheKey(client.name, client.config));
        return emptyTools;
      }
    },
    (client) => serverCacheKey(client.name, client.config),
    () => getConnectionCache().toolLists,
  );
});
//@ chunk-sywnjtqb.js:157928-158511 placement
/**
 * reportListFailure：列表请求失败的指标分类（needs_auth、bearer_rejected、MCP 错误码、timeout、failed）与 tengu_mcp_degraded 遥测。
 */
function reportListFailure(client, error, metricName, logMetric, degradedReason, listKind) {
  let errorDetail = describeConnectError(error, client.config);
  let needsAuth = client.config.type === "claudeai-proxy" && isListAuthError_2(error);
  let isBearerRejected = client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error);
  if (isBearerRejected) client.discoveryBearerRejected = true;
  let failureMetric = needsAuth
    ? `${metricName}_needs_auth`
    : isBearerRejected
      ? `${metricName}_claudeai_bearer_rejected`
      : (error instanceof ProtocolError || error instanceof SdkError) && !(error instanceof SdkHttpError)
        ? `${metricName}_${LIST_FAILURE_REASONS[error.code] ?? "mcperr_other"}`
        : errorDetail.includes("timed out")
          ? `${metricName}_timeout`
          : `${metricName}_failed`;
  logMetric(failureMetric);
  (needsAuth || isBearerRejected ? logMCPDebug : logMCPError)(
    client.name,
    `Failed to fetch ${listKind}: ${errorDetail}`,
  );
  if (!needsAuth && !isBearerRejected)
    logEvent("tengu_mcp_degraded", {
      reason: degradedReason,
      transportType: fromEnum(client.config.type ?? "stdio"),
      ...mcpServerKeyHashEntry(client.config, client.name),
      mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
        CLAUDEAI_SERVER_PREFIX(client.name),
        isMcpServerLoggableInAnalytics(client.name, client.config),
      ),
    });
}
//@ chunk-sywnjtqb.js:158511-159750 placement
/**
 * fetchResourcesForClient / fetchResourceTemplatesForClient：记忆化 resources/list 与 resources/templates/list，MethodNotFound 视为空。
 */
var fetchResourcesForClient; // deferred: uses memoizeWithLRU (./needsAuthCache.js) of its import cycle while loading; runs once the cycle is complete
var fetchResourceTemplatesForClient;
deferInit("chunk-sywnjtqb.js:158511", () => {
  fetchResourcesForClient = memoizeWithLRU(
    async (client) => {
      if (client.type !== "connected") return [];
      try {
        if (!client.capabilities?.resources) {
          let rawResources = [];
          recordRawResourcesForResult(rawResources, []);
          return rawResources;
        }
        let listedResources = await listAllPages_2(
          clientOf(client.client),
          client.name,
          client.config,
          "resources/list",
          ListResourcesResultSchema,
          (page) => page.resources,
        );
        logFeatureOk("mcp_list_resources");
        let mapped = listedResources.map((resource) => ({
          ...resource,
          server: client.name,
        }));
        recordRawResourcesForResult(mapped, listedResources);
        return mapped;
      } catch (error) {
        reportListFailure(
          client,
          error,
          "mcp_list_resources",
          (metric) => logFeatureSad("mcp_list_resources", metric),
          lit("resources_list_failed"),
          "resources",
        );
        getConnectionCache().resourceLists.delete(serverCacheKey(client.name, client.config));
        let errorHolder = [];
        if (error instanceof ProtocolError && error.code === ProtocolErrorCode.MethodNotFound)
          recordRawResourcesForResult(errorHolder, []);
        else getCliOwnedState().discoveryFetchErrors.set(errorHolder, toError(error));
        return errorHolder;
      }
    },
    (client) => serverCacheKey(client.name, client.config),
    () => getConnectionCache().resourceLists,
  );
  fetchResourceTemplatesForClient = memoizeWithLRU(
    async (client) => {
      if (client.type !== "connected") return [];
      try {
        if (!client.capabilities?.resources) return [];
        let listedTemplates = await listAllPages_2(
          clientOf(client.client),
          client.name,
          client.config,
          "resources/templates/list",
          ListResourceTemplatesResultSchema,
          (page) => page.resourceTemplates,
        );
        logEvent("tengu_mcp_resource_templates_fetched", {
          template_count: listedTemplates.length,
        });
        logFeatureOk("mcp_list_resource_templates");
        return listedTemplates.map((template) => ({
          ...template,
          server: client.name,
        }));
      } catch (error) {
        getConnectionCache().resourceTemplateLists.delete(serverCacheKey(client.name, client.config));
        logMCPDebug(
          client.name,
          `Failed to fetch resource templates: ${describeConnectError(error, client.config)}`,
        );
        let errorHolder = [];
        if (!(error instanceof ProtocolError && error.code === ProtocolErrorCode.MethodNotFound))
          getCliOwnedState().discoveryFetchErrors.set(errorHolder, toError(error));
        return errorHolder;
      }
    },
    (client) => serverCacheKey(client.name, client.config),
    () => getConnectionCache().resourceTemplateLists,
  );
});
//@ chunk-sywnjtqb.js:159750-159921 placement
/**
 * fetchResourceTemplatesForClients：对尚无模板记录的已连接客户端并发拉资源模板。
 */
function fetchResourceTemplatesForClients(clients, alreadyFetched) {
  let pending = [];
  for (let client of clients) {
    if (client.type !== "connected") continue;
    if (client.name in alreadyFetched) continue;
    pending.push(
      fetchResourceTemplatesForClient(client).then((templates) => ({
        client,
        templates,
      })),
    );
  }
  return Promise.all(pending);
}
//@ chunk-sywnjtqb.js:159921-160371 placement
/**
 * completeResourceTemplateArgument：调用 completion/complete（ref/resource）补全资源模板参数。
 */
async function completeResourceTemplateArgument(client, uri, argumentName, argumentValue, contextArguments) {
  if (!client.capabilities?.completions) return [];
  try {
    let completionResult = await clientOf(client.client).complete({
      ref: {
        type: "ref/resource",
        uri,
      },
      argument: {
        name: argumentName,
        value: argumentValue,
      },
      context:
        Object.keys(contextArguments).length > 0
          ? {
              arguments: contextArguments,
            }
          : undefined,
    });
    logFeatureOk("mcp_complete_resource_template");
    return completionResult.completion.values;
  } catch (error) {
    logFeatureBad("mcp_complete_resource_template", "mcp_complete_resource_template_failed");
    logMCPDebug(
      client.name,
      `Failed to complete resource template: ${describeConnectError(error, client.config)}`,
    );
    return [];
  }
}
//@ chunk-sywnjtqb.js:160371-160932 placement
/**
 * fetchCommandsForClient：记忆化 prompts/list 并转成斜杠命令。
 */
var fetchCommandsForClient; // deferred: uses memoizeWithLRU (./needsAuthCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sywnjtqb.js:160371", () => {
  fetchCommandsForClient = memoizeWithLRU(
    async (client) => {
      if (client.type !== "connected") return [];
      try {
        if (!client.capabilities?.prompts) {
          let rawCommands = [];
          recordRawCommandsForResult(rawCommands, []);
          return rawCommands;
        }
        let promptList = await listAllPages_2(
          clientOf(client.client),
          client.name,
          client.config,
          "prompts/list",
          ListPromptsResultSchema,
          (page) => page.prompts,
        );
        logFeatureOk("mcp_list_prompts");
        let result = buildMcpPromptCommands(client, promptList);
        recordRawCommandsForResult(result, promptList);
        return result;
      } catch (error) {
        reportListFailure(
          client,
          error,
          "mcp_list_prompts",
          (metric) => logFeatureSad("mcp_list_prompts", metric),
          lit("prompts_list_failed"),
          "commands",
        );
        getConnectionCache().commandLists.delete(serverCacheKey(client.name, client.config));
        let errorHolder = [];
        if (error instanceof ProtocolError && error.code === ProtocolErrorCode.MethodNotFound)
          recordRawCommandsForResult(errorHolder, []);
        else getCliOwnedState().discoveryFetchErrors.set(errorHolder, toError(error));
        return errorHolder;
      }
    },
    (client) => serverCacheKey(client.name, client.config),
    () => getConnectionCache().commandLists,
  );
});
//@ chunk-sywnjtqb.js:160932-162717 placement
/**
 * buildMcpPromptCommands：MCP 提示词转为 prompt 命令 mcp__<server>__<prompt>（显示为 server:prompt (MCP)），执行时按空格切参数、检查必填、getPrompt 并转换内容。
 */
function buildMcpPromptCommands(client, prompts) {
  let streamingListingSanitizer = createStreamingListingSanitizer();
  let flattened = prompts.flatMap((prompt) => streamingListingSanitizer(prompt) ?? []);
  let droppedCount = prompts.length - flattened.length;
  if (droppedCount > 0)
    logMCPError(client.name, listingTruncatedNote("prompts", droppedCount, prompts.length));
  let config = client.config;
  let isDesignServer = (config.type === "http" || config.type === "sse") && isDesignMcpUrl(config.url);
  let unmatchedPromptCount = officialPluginPromptOverrides(client.config);
  let commands = flattened.map((prompts) => {
    let values = Object.values(prompts.arguments ?? {});
    let mapped = values.map((prompt) => prompt.name);
    let descriptionOverride = unmatchedPromptCount?.prompts?.[prompts.name] ?? prompts.description;
    return {
      type: "prompt",
      name: "mcp__" + CLAUDEAI_SERVER_PREFIX(client.name) + "__" + prompts.name,
      description: descriptionOverride ?? "",
      hasUserSpecifiedDescription: !!descriptionOverride,
      contentLength: 0,
      isEnabled: () => true,
      isHidden: false,
      isMcp: true,
      mcpInfo: getMcpInfoFromConnection(client),
      progressMessage: "running",
      userFacingName() {
        return isDesignServer ? prompts.name : `${client.name}:${prompts.name} (MCP)`;
      },
      aliases: isDesignServer
        ? [`${client.name}:${prompts.name}`, `${client.name}:${prompts.name} (MCP)`]
        : undefined,
      argNames: mapped,
      source: "mcp",
      async getPromptForCommand(args, context) {
        let trimmed = args.trim();
        let argValues = trimmed ? trimmed.split(/\s+/) : [];
        let desktopRefusal = hostedDesktopRefusal_2(client);
        if (desktopRefusal) throw desktopRefusal;
        try {
          let mapped_2 = values
            .filter((argument, index) => argument.required && argValues[index] === undefined)
            .map((argument) => argument.name);
          if (mapped_2.length > 0)
            throw Error(
              `Missing required ${plural(mapped_2.length, "argument")}: ${mapped_2.join(", ")}. Usage: /mcp__${CLAUDEAI_SERVER_PREFIX(client.name)}__${prompts.name} ${mapped.join(" ")}`,
            );
          let connectedClient = await ensureConnectedClient(client, {
            signal: context.abortController.signal,
            context: "MCP prompt command",
          });
          let prompt = await clientOf(connectedClient.client).getPrompt({
            name: prompts.name,
            arguments: zipOperationFields(mapped, argValues),
          });
          let promptResult = imageLimitsForModel(context.options.mainLoopModel);
          let results = await Promise.all(
            prompt.messages.map((message) =>
              transformResultContent_2(
                message.content,
                connectedClient.name,
                promptResult,
                context.storageV5,
              ),
            ),
          );
          logFeatureOk("mcp_get_prompt");
          recordToolUsed(buildMcpToolName(client.name, prompts.name));
          return results.flat();
        } catch (error) {
          if (!isAbortError(error))
            if (client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError_2(error)) {
              logFeatureSad("mcp_get_prompt", "mcp_get_prompt_claudeai_bearer_rejected");
              logMCPDebug(
                client.name,
                `Error running command '${prompts.name}': ${describeConnectError(error, client.config)}`,
              );
            } else {
              logFeatureBad("mcp_get_prompt", "mcp_get_prompt_failed");
              logMCPError(
                client.name,
                `Error running command '${prompts.name}': ${describeConnectError(error, client.config)}`,
              );
            }
          throw error;
        }
      },
    };
  });
  return checkCommandListable(commands, (unlistableCommand) =>
    logMCPDebug(
      client.name,
      `Prompt '${unlistableCommand.name}' not listed: the server name ${RESERVED_SKILL_NAMESPACE_REASON}. Rename the server in your MCP configuration to list its prompts.`,
    ),
  );
}
//@ chunk-sywnjtqb.js:162717-162879 placement
/**
 * callIdeTool：直接调用 IDE MCP 工具并返回 content。
 */
async function callIdeTool_2(tool, args, client) {
  return (
    await callMCPTool({
      client,
      tool,
      args,
      signal: createAbortController().signal,
      imageLimits: IMAGE_LIMITS,
      idleTimeoutMs: 0,
      storageV5: undefined,
      credentials: undefined,
    })
  ).content;
}
//@ chunk-sywnjtqb.js:162879-163137 placement
/**
 * identityChangedReconnectResult：账号身份在重连过程中变化时的 failed 结果（errorCode IDENTITY_CHANGED）。
 */
function identityChangedReconnectResult_2(name, config) {
  logFeatureSad("mcp_reconnect", "mcp_reconnect_identity_changed");
  return {
    client: {
      name,
      type: "failed",
      config,
      error: "Reconnect cancelled: the account changed while connecting. Choose Reconnect again.",
      errorCode: "IDENTITY_CHANGED",
    },
    tools: [],
    commands: [],
  };
}
//@ chunk-sywnjtqb.js:163137-163275 placement
/**
 * reconnectMcpServer：必要时先清 OAuth 发现状态，再调用 reconnectMcpServerImpl。
 */
async function reconnectMcpServer_2(name, config, storageV5, credentials) {
  if (!isDiscoveryCacheUsable()) return proxyRequest(name, config, storageV5, credentials);
  let epochAtStart = identityEpoch();
  await flushDiscoveryCache(clearDiscoveryForServer(name, config));
  if (isRemoteMcpTransport(config) && identityEpoch() !== epochAtStart)
    return identityChangedReconnectResult_2(name, config);
  return proxyRequest(name, config, storageV5, credentials);
}
//@ chunk-sywnjtqb.js:163275-165202 placement
/**
 * reconnectMcpServerImpl：清缓存后重新 connectToServer 并拉取工具/命令/资源；needs-auth 时清缓存再试一次；身份变化返回 IDENTITY_CHANGED。
 */
async function proxyRequest(name, config, storageV5, credentials, options = {}) {
  let epochAtStart = identityEpoch();
  let isRemote = isRemoteMcpTransport(config);
  let identityChanged = () => isRemote && identityEpoch() !== epochAtStart;
  let identityChangedResult = () => identityChangedReconnectResult_2(name, config);
  try {
    clearKeychainCache();
    let keepOptions = options.keepConnectionInUse ? {} : undefined;
    await (keepOptions === undefined
      ? clearServerCache(name, config)
      : clearServerCache(name, config, keepOptions));
    if (identityChanged()) return identityChangedResult();
    let dial = connectToServer(name, config, undefined, storageV5, credentials);
    let connection = await dial;
    if (connection.type === "needs-auth") {
      logMCPDebug(name, "Reconnect returned 'needs-auth'; retrying once after cache clear");
      if (identityChanged()) return identityChangedResult();
      let cacheKey = serverCacheKey(name, config);
      if (getConnectionCache().connections.get(cacheKey) === dial)
        getConnectionCache().connections.delete(cacheKey);
      connection = await connectToServer(name, config, undefined, storageV5, credentials);
    }
    if (identityChanged()) {
      if (connection.type === "connected") await detachAndCloseConnection(connection);
      return identityChangedResult();
    }
    if (connection.type !== "connected") {
      logFeatureSad("mcp_reconnect", "mcp_reconnect_not_connected");
      return applyMcpServerConfig(config, {
        client: connection,
        tools: [],
        commands: [],
      });
    }
    if (config.type !== "claudeai-proxy") clearMcpAuthCacheEntry_2(name, storageV5);
    if (config.type === "http" || config.type === "sse") await clearMcpOAuthStubIfTokenless_2(name, config);
    clearDiscoveryPathMemo(name);
    let grantLeg;
    if (isDiscoveryCacheOn()) grantLeg = await cacheGrantLeg(name, config);
    if (identityChanged()) {
      await detachAndCloseConnection(connection);
      return identityChangedResult();
    }
    let discoveryBearer = !!connection.capabilities?.resources;
    let [toolsForClient, commandsForClient, hasResources, tools] = await Promise.all([
      fetchToolsForClient(connection, storageV5),
      fetchCommandsForClient(connection),
      Promise.resolve([]),
      discoveryBearer ? fetchResourcesForClient(connection) : Promise.resolve([]),
    ]);
    if (identityChanged()) {
      await detachAndCloseConnection(connection);
      return identityChangedResult();
    }
    if (connection.discoveryAuthFailure) {
      logFeatureSad("mcp_reconnect", "mcp_reconnect_needs_auth_discovery");
      return {
        client: {
          name,
          type: "needs-auth",
          config,
        },
        tools: [],
        commands: [],
      };
    }
    if (config.type === "claudeai-proxy" && !connection.discoveryBearerRejected)
      clearMcpAuthCacheEntry_2(name, storageV5);
    if (config.type === "claudeai-proxy" && !connection.toolsListError && !connection.discoveryBearerRejected)
      recordClaudeAiMcpConnected(name, storageV5);
    persistLiveListing(connection, {
      tools: toolsForClient,
      commands: commandsForClient,
      resources: tools,
      identityEpoch: epochAtStart,
      grantLeg,
    });
    let commands = [...commandsForClient, ...hasResources];
    let allCommands = [];
    if (discoveryBearer) {
      if (
        ![ListMcpResourcesTool, ReadMcpResourceTool].some((builtinCommands) =>
          toolsForClient.some((builtin) => matchesToolName(builtin, builtinCommands.name)),
        )
      )
        allCommands.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
    }
    if (connection.discoveryBearerRejected) logFeatureSad("mcp_reconnect", "mcp_reconnect_bearer_rejected");
    else if (connection.toolsListError) logFeatureSad("mcp_reconnect", "mcp_reconnect_tools_list_failed");
    else logFeatureOk("mcp_reconnect");
    return applyMcpServerConfig(config, {
      client: connection,
      tools: [...toolsForClient, ...allCommands],
      commands,
      resources: tools.length > 0 ? tools : undefined,
      resourceTemplates: [],
      ...(keepOptions?.connection !== undefined &&
        connection === keepOptions.connection && {
          keptConnectionInUse: true,
        }),
    });
  } catch (error) {
    logFeatureBad("mcp_reconnect", "mcp_reconnect_failed");
    logMCPError(name, `Error during reconnection: ${describeConnectError(error, config)}`);
    return {
      client: {
        name,
        type: "failed",
        config,
      },
      tools: [],
      commands: [],
    };
  }
}
//@ chunk-sywnjtqb.js:165202-165257 placement (2.1.88 match: processBatched, 1)
async function processBatched_3(items, concurrency, processor) {
  await pMap(items, processor, {
    concurrency,
  });
}
//@ chunk-sywnjtqb.js:165257-165522 placement
/**
 * countUnsettledByDeadline：等待一组 promise 到期限，返回仍未完成的个数。
 */
async function countUnsettledByDeadline_2(promises, timeoutMs) {
  if (promises.length === 0) return 0;
  let timer;
  let promise = new Promise((resolve) => {
    timer = setTimeout((resolve) => resolve("deadline"), timeoutMs, resolve);
  });
  try {
    let results = await Promise.all(
      promises.map((promise_2) =>
        Promise.race([
          promise_2.then(
            () => "settled",
            () => "settled",
          ),
          promise,
        ]),
      ),
    );
    return countWhere(results, (outcome) => outcome === "deadline");
  } finally {
    clearTimeout(timer);
  }
}
//@ chunk-sywnjtqb.js:165522-173073 placement
/**
 * getMcpToolsCommandsAndResources：批量连接所有服务器（本地按 MCP_SERVER_CONNECTION_BATCH_SIZE 默认 3、远程按 MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE 默认 20 并发），逐个检查禁用、策略、needs-auth 缓存、插件失败缓存与发现缓存（fresh/stale 直接出结果，stale 后台刷新），再连接并拉取工具/命令/资源，结果通过回调逐个上报。
 */
async function callToolWithTimers(
  onConnectionAttempt,
  mcpConfigs,
  storageV5,
  credentials,
  preloadedTools,
  streamResources,
  listOptions,
  connectOptions,
) {
  let epochAtStart = identityEpoch();
  let identityChangedForRemote = (config) => identityEpoch() !== epochAtStart && isRemoteMcpTransport(config);
  let emitResult = (result) => {
    if (!identityChangedForRemote(result.client.config))
      onConnectionAttempt({
        ...result,
        attemptEpoch: epochAtStart,
      });
  };
  primeClientResolvers();
  let resourceToolsAdded = false;
  let entries = Object.entries(mcpConfigs ?? (await getAllMcpConfigs()).servers);
  let enabledEntries = [];
  for (let disabled of entries)
    if (isMcpServerDisabled(disabled[0]))
      emitResult({
        client: {
          name: disabled[0],
          type: "disabled",
          config: disabled[1],
        },
        tools: [],
        commands: [],
      });
    else enabledEntries.push(disabled);
  registerConfiguredMcpServers(Object.fromEntries(enabledEntries));
  let totalServers = enabledEntries.length;
  let stdioCount = countWhere(enabledEntries, ([name, config]) => config.type === "stdio");
  let sseCount = countWhere(enabledEntries, ([name, config]) => config.type === "sse");
  let httpCount = countWhere(enabledEntries, ([name, config]) => config.type === "http");
  let sseIdeCount = countWhere(enabledEntries, ([name, config]) => config.type === "sse-ide");
  let wsIdeCount = countWhere(enabledEntries, ([name, config]) => config.type === "ws-ide");
  let filtered = enabledEntries.filter(([name, config]) => isLocalMcpServer_2(config));
  let filtered_2 = enabledEntries.filter(([name, config]) => !isLocalMcpServer_2(config));
  let counts = {
    totalServers,
    stdioCount,
    sseCount,
    httpCount,
    sseIdeCount,
    wsIdeCount,
  };
  let pendingTasks = [];
  let connectOne = async ([serverName, config]) => {
    try {
      if (isCleanupStarted()) {
        logMCPDebug(serverName, "Skipping connection (Claude Code is shutting down)");
        return;
      }
      if (isMcpServerDisabled(serverName)) {
        emitResult({
          client: {
            name: serverName,
            type: "disabled",
            config,
          },
          tools: [],
          commands: [],
        });
        return;
      }
      if (isMcpServerBlockedAtConnectTime(serverName, config)) {
        logMCPDebug(serverName, "Skipping connection (blocked by managed policy)");
        emitResult({
          client: {
            name: serverName,
            type: "failed",
            config,
            error: mcpGateError("managed-policy", serverName, config).error,
          },
          tools: [],
          commands: [],
        });
        return;
      }
      if (isIneligibleClaudeAiProxy(config)) {
        emitResult({
          client: {
            name: serverName,
            type: "needs-auth",
            config,
          },
          tools: mcpAuthToolsFor(serverName, config),
          commands: [],
        });
        return;
      }
      if (
        (config.type === "claudeai-proxy" || config.type === "http" || config.type === "sse") &&
        !isCliOwnedConfig(config) &&
        ((await isMcpAuthCached_2(serverName, config, storageV5)) ||
          ((config.type === "http" || config.type === "sse") &&
            shouldTryTokenless(
              serverName,
              config,
              await readMcpOAuthStore({
                serverName,
                serverConfig: config,
                challenged: false,
              }),
            )))
      ) {
        if (config.type !== "claudeai-proxy" && config.pluginSource === undefined)
          logMCPDebug(serverName, "Skipping connection (cached needs-auth)");
        emitResult({
          client: {
            name: serverName,
            type: "needs-auth",
            config,
            ...(await registrationStatusFields(serverName, config)),
          },
          tools: mcpAuthToolsFor(serverName, config),
          commands: [],
        });
        return;
      }
      if (
        (config.type === "stdio" || config.type === undefined) &&
        config.pluginSource !== undefined &&
        (await isMcpAuthCached_2(serverName, config, storageV5))
      ) {
        emitResult({
          client: {
            name: serverName,
            type: "failed",
            config,
            error:
              "Skipping connection (recent failure cached; retries automatically in 15 min, or edit the plugin config to retry now)",
          },
          tools: [],
          commands: [],
        });
        return;
      }
      let refreshLock = await hasLiveConnection(serverName, config);
      let config_2 =
        preloadedTools !== undefined && Object.hasOwn(preloadedTools, serverName)
          ? preloadedTools[serverName]
          : undefined;
      if (config_2 !== undefined && !refreshLock) {
        let { client, tools } = await buildCachedClientTools({
          name: serverName,
          config,
          capabilities: {
            tools: {},
          },
          serverInfo: undefined,
          savedAt: Date.now(),
          tools: config_2,
        });
        emitResult({
          client,
          tools,
          commands: [],
        });
        return;
      }
      let cacheServe = refreshLock
        ? {
            kind: "miss",
            reason: "live-connection",
          }
        : await readDiscoveryCache(serverName, config);
      let cacheProbe = applyCapabilityServeTimeMiss(cacheServe);
      if (cacheProbe.kind === "fresh" || cacheProbe.kind === "stale") {
        let { entry, ageMs } = cacheProbe;
        let { client, tools } = await buildCachedClientTools({
          name: serverName,
          config,
          capabilities: entry.capabilities,
          serverInfo: entry.serverInfo,
          savedAt: entry.savedAt,
          tools: entry.tools,
        });
        let commands = buildMcpPromptCommands(client, entry.commands);
        let mapped = entry.resources.map((resource) => ({
          ...resource,
          server: serverName,
        }));
        let mapped_2 = (entry.templates ?? []).map((resourceTools) => ({
          ...resourceTools,
          server: serverName,
        }));
        let cachedHasResources = !!entry.capabilities.resources || mapped.length > 0;
        let cachedTools = [];
        if (cachedHasResources && !resourceToolsAdded) {
          resourceToolsAdded = true;
          cachedTools.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
        }
        logEvent("tengu_mcp_discovery_source", {
          source: lit(cacheProbe.kind === "fresh" ? "cache_fresh" : "cache_stale"),
          transportType: fromEnum(config.type ?? "stdio"),
          entryAgeMs: ageMs,
          ...mcpServerKeyHashEntry(config, serverName),
        });
        logFeatureOk("mcp_discovery_cache");
        getConnectionCache().settledCachedDialFailures.delete(serverCacheKey(serverName, config));
        getConnectionCache().refusedCachedRows.delete(serverCacheKey(serverName, config));
        emitResult({
          client,
          tools: [...tools, ...cachedTools],
          commands,
          resources: mapped.length > 0 ? mapped : undefined,
          resourceTemplates: mapped_2.length > 0 ? mapped_2 : undefined,
        });
        if (cacheProbe.kind === "stale")
          (async () => {
            let grantLeg = await cacheGrantLeg(serverName, config);
            let refreshDial;
            let recordStrike = async () => {
              if (
                (refreshDial !== undefined && isSupersededDial(refreshDial)) ||
                identityEpoch() !== epochAtStart
              )
                return;
              logFeatureSad("mcp_discovery_cache", "strike");
              await recordRefreshFailureStrike(serverName, config, {
                identityEpoch: epochAtStart,
                grantLeg,
              });
            };
            let discoveryRefreshLock = await acquireDiscoveryRefreshLock(serverName, config);
            if (!discoveryRefreshLock) return;
            if (isMcpServerDisabled(serverName)) {
              await discoveryRefreshLock().catch(() => {});
              refuseCachedRow(serverName, config, "disabled");
              return;
            }
            if (isMcpServerBlockedAtConnectTime(serverName, config)) {
              await discoveryRefreshLock().catch(() => {});
              refuseCachedRow(serverName, config, "policy");
              return;
            }
            let handleRefreshResult = (result) => {
              if (!(
                !(refreshDial !== undefined && isSupersededDial(refreshDial)) &&
                identityEpoch() === epochAtStart
              ))
                return;
              if (result.type !== "needs-auth")
                getConnectionCache().connections.delete(serverCacheKey(serverName, config));
              let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
              if (cachedFirstDialArmsRan.has(result)) return;
              cachedFirstDialArmsRan.add(result);
              if (result.type === "needs-auth") emitCachedAdopt(serverName, config);
              else if (result.type === "failed") recordCachedDialFailure(result, false);
            };
            let emitAdopt = (result) => {
              let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
              if (cachedFirstDialArmsRan.has(result)) return;
              cachedFirstDialArmsRan.add(result);
              emitCachedAdopt(serverName, config);
            };
            let dialSettled = false;
            try {
              refreshDial = connectToServer(serverName, config, counts, storageV5, credentials);
              getCliOwnedState().swrRefreshDialsInFlight.add(refreshDial);
              refreshDial.then(
                () => {
                  dialSettled = true;
                },
                () => {
                  dialSettled = true;
                },
              );
              let result = await boundDial(refreshDial, {
                serverName,
                context: "MCP discovery-cache stale refresh",
              });
              if (result.type !== "connected") {
                handleRefreshResult(result);
                await recordStrike();
                return;
              }
              if (isSupersededDial(refreshDial) || identityEpoch() !== epochAtStart) return;
              if (
                entry.negotiatedEra !== undefined &&
                result.protocolEra !== undefined &&
                result.protocolEra !== entry.negotiatedEra
              ) {
                logMCPDebug(
                  serverName,
                  "Discovery cache entry dropped: server negotiated a different protocol era on revalidation",
                );
                await clearDiscoveryForServer(serverName, config).catch(() => {});
                if (!isSupersededDial(refreshDial) && identityEpoch() === epochAtStart) emitAdopt(result);
                return;
              }
              let refreshHasResources = !!result.capabilities?.resources;
              clearDiscoveryPathMemo(serverName);
              let grantLeg = await cacheGrantLeg(serverName, config);
              if (isSupersededDial(refreshDial) || identityEpoch() !== epochAtStart) return;
              let [toolsForClient, commandsForClient, resourcesForClient, templatesPromise] =
                await Promise.all([
                  fetchToolsForClient(result, storageV5),
                  fetchCommandsForClient(result),
                  fetchResourcesForClient(result),
                  refreshHasResources && isCacheableServer(config)
                    ? fetchResourceTemplatesForClient(result)
                    : Promise.resolve([]),
                ]);
              let templates =
                getDiscoveryFetchError(templatesPromise) === undefined ? templatesPromise : undefined;
              if (
                isSupersededDial(refreshDial) ||
                isSupersededCacheEntry(refreshDial, serverName, config) ||
                identityEpoch() !== epochAtStart
              )
                return;
              if (!isMcpServerDisabled(serverName) && !isMcpServerBlockedAtConnectTime(serverName, config)) {
                if (
                  !(await persistRawDiscoveryIfComplete(result, {
                    tools: toolsForClient,
                    commands: commandsForClient,
                    resources: resourcesForClient,
                    templates,
                    identityEpoch: epochAtStart,
                    grantLeg,
                  }))
                )
                  await recordStrike();
              }
              if (
                !(refreshDial !== undefined && isSupersededDial(refreshDial)) &&
                !(refreshDial !== undefined && isSupersededCacheEntry(refreshDial, serverName, config)) &&
                identityEpoch() === epochAtStart
              )
                emitAdopt(result);
            } catch {
              if (refreshDial !== undefined && !dialSettled) {
                let pendingDial = refreshDial;
                pendingDial.then(
                  (lateResult) => {
                    if (lateResult.type !== "connected") {
                      handleRefreshResult(lateResult);
                      recordStrike().catch(() => {});
                    } else {
                      getCliOwnedState().swrRefreshDialsInFlight.delete(pendingDial);
                      (entry.negotiatedEra !== undefined &&
                      lateResult.protocolEra !== undefined &&
                      lateResult.protocolEra !== entry.negotiatedEra
                        ? clearDiscoveryForServer(serverName, config).catch(() => {})
                        : Promise.resolve()
                      ).then(() => {
                        if (!isSupersededDial(pendingDial) && identityEpoch() === epochAtStart)
                          emitAdopt(lateResult);
                      });
                    }
                  },
                  () => {
                    recordStrike().catch(() => {});
                  },
                );
              } else await recordStrike();
            } finally {
              if (refreshDial !== undefined && dialSettled)
                getCliOwnedState().swrRefreshDialsInFlight.delete(refreshDial);
              await discoveryRefreshLock().catch(() => {});
            }
          })();
        return;
      }
      let dial = connectToServer(
        serverName,
        config,
        counts,
        storageV5,
        credentials,
        undefined,
        connectOptions,
      );
      let connection = await dial;
      let isLatestDial = connectToServer.cache?.get?.(serverCacheKey(serverName, config)) === dial;
      if (isDiscoveryCacheOn() && isDiscoveryCacheMissRecoverable(cacheProbe))
        logEvent("tengu_mcp_discovery_source", {
          source: lit(discoverySourceLabel(cacheProbe)),
          transportType: fromEnum(config.type ?? "stdio"),
          ...mcpServerKeyHashEntry(config, serverName),
        });
      if (isSupersededDial(dial)) return;
      if (identityChangedForRemote(config)) {
        if (connection.type === "connected" && isSupersededCacheEntry(dial, serverName, config))
          detachAndCloseConnection(connection);
        return;
      }
      if (connection.type !== "connected") {
        emitResult(
          applyMcpServerConfig(config, {
            client: connection,
            tools: connection.type === "needs-auth" ? mcpAuthToolsFor(serverName, config) : [],
            commands: [],
          }),
        );
        return;
      }
      connection.discoveryBearerRejected = undefined;
      if (config.type !== "claudeai-proxy") clearMcpAuthCacheEntry_2(serverName, storageV5);
      if (config.type === "http" || config.type === "sse")
        await clearMcpOAuthStubIfTokenless_2(serverName, config);
      pendingTasks.push(
        (async () => {
          let published = false;
          try {
            let connectionPromise = !!connection.capabilities?.resources;
            clearDiscoveryPathMemo(serverName);
            let grantLeg = await cacheGrantLeg(serverName, config);
            if (isDiscoveryCacheOn() && (isSupersededDial(dial) || identityChangedForRemote(config))) {
              if (!isSupersededDial(dial) && isSupersededCacheEntry(dial, serverName, config))
                detachAndCloseConnection(connection);
              return;
            }
            let results = Promise.all([
              fetchToolsForClient(connection, storageV5, listOptions),
              fetchCommandsForClient(connection),
              Promise.resolve([]),
            ]);
            let skipResources =
              streamResources === true &&
              (config.type === "claudeai-proxy"
                ? !!connection.capabilities?.tools || !!connection.capabilities?.prompts
                : config.type === "http" &&
                  isSameOriginAsCcr(config.url) &&
                  !isDiscoveryCacheEligible(config));
            let results_2 = Promise.all([
              connectionPromise && !skipResources ? fetchResourcesForClient(connection) : Promise.resolve([]),
              connectionPromise && isCacheableServer(connection.config)
                ? fetchResourceTemplatesForClient(connection)
                : Promise.resolve([]),
            ]);
            let parallelResources =
              streamResources === true &&
              connectionPromise &&
              (config.type === "http" || config.type === "sse") &&
              !isDiscoveryCacheOn();
            if (parallelResources) results_2.catch(() => {});
            let [[tools, commands, extraCommands], resourceResults] = await Promise.all([
              results,
              parallelResources ? undefined : results_2,
            ]);
            if (identityChangedForRemote(config)) {
              if (isSupersededCacheEntry(dial, serverName, config)) detachAndCloseConnection(connection);
              return;
            }
            if (isDiscoveryCacheOn() && isSupersededDial(dial)) return;
            if (isDiscoveryCacheOn() && isLatestDial && isSupersededCacheEntry(dial, serverName, config)) {
              if (
                connectToServer.cache?.get?.(serverCacheKey(serverName, config)) === undefined &&
                clientOf(connection.client).onclose !== undefined
              ) {
                detachAndCloseConnection(connection);
                emitResult({
                  client: {
                    name: serverName,
                    type: "failed",
                    config,
                    error: "Connection closed during discovery",
                    errorCode: "ConnectionClosed",
                  },
                  tools: [],
                  commands: [],
                });
              }
              return;
            }
            if (connection.discoveryAuthFailure) {
              emitResult({
                client: {
                  name: serverName,
                  type: "needs-auth",
                  config,
                },
                tools: mcpAuthToolsFor(serverName, config),
                commands: [],
              });
              return;
            }
            if (config.type === "claudeai-proxy" && !connection.discoveryBearerRejected)
              clearMcpAuthCacheEntry_2(serverName, storageV5);
            if (
              config.type === "claudeai-proxy" &&
              !connection.toolsListError &&
              !connection.discoveryBearerRejected
            )
              recordClaudeAiMcpConnected(serverName, storageV5);
            let commands_2 = [...commands, ...extraCommands];
            let publishConnection = (resources) => {
              let templatesResult = [];
              if (connectionPromise && !resourceToolsAdded) {
                resourceToolsAdded = true;
                templatesResult.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
              }
              emitResult(
                applyMcpServerConfig(config, {
                  client: connection,
                  tools: [...tools, ...templatesResult],
                  commands: commands_2,
                  resources: resources.length > 0 ? resources : undefined,
                  resourceTemplates: undefined,
                }),
              );
            };
            if (parallelResources) {
              publishConnection([]);
              published = true;
            }
            let [resources, templatesResult] = resourceResults ?? (await results_2);
            if (!connectionPromise) recordRawResourcesForResult(resources, []);
            let templates =
              getDiscoveryFetchError(templatesResult) === undefined ? templatesResult : undefined;
            let persistPromise =
              !isDiscoveryCacheOn() ||
              isSupersededDial(dial) ||
              isSupersededCacheEntry(dial, serverName, config) ||
              identityEpoch() !== epochAtStart ||
              isMcpServerDisabled(serverName) ||
              isMcpServerBlockedAtConnectTime(serverName, config)
                ? undefined
                : persistRawDiscoveryIfComplete(connection, {
                    tools,
                    commands,
                    resources,
                    templates,
                    identityEpoch: epochAtStart,
                    grantLeg,
                  });
            if (!parallelResources) publishConnection(resources);
            await persistPromise;
          } catch (error) {
            logMCPError(
              serverName,
              `Error fetching tools/commands/resources: ${describeConnectError(error, config)}`,
            );
            if (published) return;
            emitResult({
              client: {
                name: serverName,
                type: "failed",
                config,
              },
              tools: [],
              commands: [],
            });
          }
        })(),
      );
    } catch (error) {
      logMCPError(
        serverName,
        `Error fetching tools/commands/resources: ${describeConnectError(error, config)}`,
      );
      emitResult({
        client: {
          name: serverName,
          type: "failed",
          config,
        },
        tools: [],
        commands: [],
      });
    }
  };
  await Promise.all([
    processBatched_3(filtered, getMcpServerConnectionBatchSize_2(), connectOne),
    processBatched_3(filtered_2, getRemoteMcpServerConnectionBatchSize_2(), connectOne),
  ]);
  await Promise.all(pendingTasks);
}
//@ chunk-sywnjtqb.js:173073-173737 placement (2.1.88 match: prefetchAllMcpResources, 1)
/**
 * prefetchAllMcpResources：非交互模式下一次性连接全部服务器并收集 clients/tools/commands。
 */
function prefetchAllMcpResources_2(mcpConfigs, storageV5, credentials) {
  return new Promise((resolve) => {
    let pendingCount = 0;
    let settledCount = 0;
    pendingCount = Object.keys(mcpConfigs).length;
    if (pendingCount === 0) {
      resolve({
        clients: [],
        tools: [],
        commands: [],
      });
      return;
    }
    let clients = [];
    let tools = [];
    let commands = [];
    let done = false;
    let finish = () => {
      if (done) return;
      done = true;
      let commandsMetadataLength = commands.reduce((sum, command) => {
        let commandMetadataLength =
          command.name.length + (command.description ?? "").length + (command.argumentHint ?? "").length;
        return sum + commandMetadataLength;
      }, 0);
      logEvent("tengu_mcp_tools_commands_loaded", {
        tools_count: tools.length,
        commands_count: commands.length,
        commands_metadata_length: commandsMetadataLength,
      });
      resolve({
        clients,
        tools,
        commands,
      });
    };
    callToolWithTimers(
      (error) => {
        clients.push(error.client);
        tools.push(...error.tools);
        commands.push(...error.commands);
        settledCount++;
        if (settledCount >= pendingCount) finish();
      },
      mcpConfigs,
      storageV5,
      credentials,
    )
      .then(finish)
      .catch((error) => {
        logMCPError("prefetchAllMcpResources", `Failed to get MCP resources: ${errorMessage(error)}`);
        resolve({
          clients: [],
          tools: [],
          commands: [],
        });
      });
  });
}
//@ chunk-sywnjtqb.js:173737-174743 placement (2.1.88 match: transformResultContent, 0.81)
/**
 * transformResultContent：把 MCP 内容块转成 API 内容：text、image（压缩/尺寸限制）、audio、resource（文本或 blob 落盘）、resource_link。
 */
async function transformResultContent_2(
  resultContent,
  serverName,
  limits,
  storageV5,
  keepMeta = false,
  callback,
) {
  switch (resultContent.type) {
    case "text": {
      let textBlock = {
        type: "text",
        text: resultContent.text,
      };
      if (keepMeta) {
        let _meta = resultContent._meta;
        if (_meta) textBlock._meta = _meta;
      }
      return [textBlock];
    }
    case "audio": {
      let audioData = resultContent;
      return await transformBlobResult(
        Buffer.from(audioData.data, "base64"),
        audioData.mimeType,
        serverName,
        `[Audio from ${serverName}] `,
        storageV5,
      );
    }
    case "image": {
      if (normalizeImageMimeType_2(resultContent.mimeType))
        return await saveImageResult(
          Buffer.from(String(resultContent.data), "base64"),
          resultContent.mimeType,
          serverName,
          limits,
          storageV5,
        );
      return await transformBlobResult(
        Buffer.from(String(resultContent.data), "base64"),
        resultContent.mimeType,
        serverName,
        `[Image from ${serverName}] `,
        storageV5,
      );
    }
    case "resource": {
      let resource = resultContent.resource;
      let prefix = `[Resource from ${serverName} at ${resource.uri}] `;
      if ("text" in resource)
        return [
          {
            type: "text",
            text: `${prefix}${resource.text}`,
          },
        ];
      else if ("blob" in resource)
        if (normalizeImageMimeType_2(resource.mimeType)) {
          let saved = await saveImageResult(
            Buffer.from(resource.blob, "base64"),
            resource.mimeType,
            serverName,
            limits,
            storageV5,
            callback,
          );
          let content = [];
          if (prefix)
            content.push({
              type: "text",
              text: prefix,
            });
          content.push(...saved);
          return content;
        } else {
          let imageBuffer = Buffer.from(resource.blob, "base64");
          let storedMcpContent = toStoredMcpContent(imageBuffer, resource.mimeType, serverName);
          if (storedMcpContent) return [storedMcpContent];
          return await transformBlobResult(
            imageBuffer,
            resource.mimeType,
            serverName,
            prefix,
            storageV5,
            callback,
          );
        }
      return [];
    }
    case "resource_link": {
      let resourceLink = resultContent;
      let text = `[Resource link: ${resourceLink.name}] ${resourceLink.uri}`;
      if (resourceLink.description) text += ` (${resourceLink.description})`;
      return [
        {
          type: "text",
          text,
        },
      ];
    }
    default:
      return [];
  }
}
//@ chunk-sywnjtqb.js:174743-174839 placement
/**
 * 生成二进制内容落盘的随机文件名。
 */
function blobFileName(serverName) {
  return `mcp-${CLAUDEAI_SERVER_PREFIX(serverName)}-blob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
//@ chunk-sywnjtqb.js:174839-175621 placement
async function saveImageResult(data, mimeType, serverName, limits, storageV5, bytes) {
  if (toolResultStoreOrNull() === undefined && addToHistory_2()) {
    logFeatureSad("mcp_image_result_file", "persistence_off");
    let { block } = await maybeResizeAndDownsampleImageBlock({
      data,
      mediaType: mimeType,
      limits,
    });
    bytes?.(block.type === "image" ? "shown" : unreadOutcome(), data.length);
    return [block];
  }
  let [{ block: imageBlock, dimensions }, persistResult] = await Promise.all([
    maybeResizeAndDownsampleImageBlock({
      data,
      mediaType: mimeType,
      limits,
    }),
    persistBinaryContent(
      data,
      sniffImageMediaType(data) ?? mimeType,
      blobFileName(serverName),
      undefined,
      storageV5,
    ).catch((error) => {
      logError(error);
      return {
        error: "not saved",
      };
    }),
  ]);
  if ("error" in persistResult) {
    logFeatureSad("mcp_image_result_file", "not_saved");
    bytes?.(imageBlock.type === "image" ? "shown" : unreadOutcome(), data.length);
    return [imageBlock];
  }
  logFeatureOk("mcp_image_result_file");
  let shrinker = toolResultStoreOrNull();
  let blockInfo = (imageBlock.type === "image" && shrinker?.wantsPictureShrunk?.(data) !== true
    ? null
    : await shrinker?.readPicture?.(persistResult.filepath, data)) ?? {
    block: imageBlock,
    dimensions,
  };
  bytes?.(blockInfo.block.type === "image" ? "shown" : "saved", data.length);
  let imageMetadataText = createImageMetadataText(blockInfo.dimensions ?? {}, persistResult.filepath);
  return imageMetadataText === null
    ? [blockInfo.block]
    : [
        blockInfo.block,
        {
          type: "text",
          text: imageMetadataText,
        },
      ];
}
//@ chunk-sywnjtqb.js:175682-176092 placement
/**
 * persistBlobToTextBlock：二进制资源落盘后返回说明文本块。
 */
async function transformBlobResult(bytes, mimeType, serverName, mime, storageV5, callback) {
  let saved = await persistBinaryContent(
    bytes,
    mimeType,
    blobFileName(serverName),
    undefined,
    storageV5,
  ).catch((error) => {
    callback?.(unreadOutcome(), bytes.length);
    throw error;
  });
  if ("error" in saved) {
    callback?.(unreadOutcome(), bytes.length);
    if (toolResultStoreOrNull() !== undefined)
      return [
        {
          type: "text",
          text: binaryNotSavedNotice(mimeType, bytes.length),
        },
      ];
    return [
      {
        type: "text",
        text: `${mime}Binary content (${mimeType || "unknown type"}, ${bytes.length} bytes) could not be saved to disk: ${saved.error}`,
      },
    ];
  }
  callback?.("saved", bytes.length);
  return [
    {
      type: "text",
      text: getBinaryBlobSavedMessage(saved.filepath, mimeType, saved.size, mime),
    },
  ];
}
//@ chunk-sywnjtqb.js:176092-176411 placement (2.1.88 match: inferCompactSchema, 1)
/**
 * inferCompactSchema：从 JSON 值推断紧凑的结构描述（深度 2），用于大结果说明。
 */
function inferCompactSchema_2(value, depth = 2) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${inferCompactSchema_2(value[0], depth - 1)}]`;
  }
  if (typeof value === "object") {
    if (depth <= 0) return "{...}";
    let props = Object.entries(value)
      .slice(0, 10)
      .map(([k, v]) => `${k}: ${inferCompactSchema_2(v, depth - 1)}`);
    let suffix = Object.keys(value).length > 10 ? ", ..." : "";
    return `{${props.join(", ")}${suffix}}`;
  }
  return typeof value;
}
//@ chunk-sywnjtqb.js:176411-176559 placement
async function transformContentArray_2(content, serverName, limits, storageV5, callback) {
  let blocks = (
    await Promise.all(
      content.map((block) => transformResultContent_2(block, serverName, limits, storageV5, true, callback)),
    )
  ).flat();
  return {
    content: blocks,
    type: "contentArray",
    schema: inferCompactSchema_2(stripTextBlockMeta(blocks)),
  };
}
//@ chunk-sywnjtqb.js:176559-177581 placement (2.1.88 match: transformMCPResult, 0.902)
/**
 * transformMCPResult：把 callTool 结果分为 toolResult / structuredContent / contentArray 三类并转换内容。
 */
async function transformMCPResult_2(result, tool, name, limits, storageV5, callback) {
  if (result && typeof result === "object") {
    if ("toolResult" in result)
      return {
        content: String(result.toolResult),
        type: "toolResult",
      };
    if ("structuredContent" in result && result.structuredContent !== undefined) {
      if ("content" in result && Array.isArray(result.content)) {
        let contentResult = await contentOverStructuredResult(result.content, (blocks) =>
          transformContentArray_2(blocks, name, limits, storageV5),
        );
        if (contentResult !== undefined) return contentResult;
      }
      let base64Text = base64URLEncode(result.structuredContent);
      let text = base64Text ?? jsonStringify(result.structuredContent);
      let schema = base64Text === undefined ? inferCompactSchema_2(result.structuredContent) : undefined;
      if ("content" in result && Array.isArray(result.content)) {
        let filtered = result.content.filter(
          (block) => block && typeof block === "object" && "type" in block && block.type !== "text",
        );
        if (filtered.length > 0) {
          let transformedContent = (
            await Promise.all(
              filtered.map((item) => transformResultContent_2(item, name, limits, storageV5, true)),
            )
          ).flat();
          if (transformedContent.length > 0) {
            let contentWithText = [
              ...transformedContent,
              {
                type: "text",
                text,
              },
            ];
            return {
              content: contentWithText,
              type: "contentArray",
              schema: inferCompactSchema_2(stripTextBlockMeta(contentWithText)),
            };
          }
        }
      }
      return {
        content: text,
        type: "structuredContent",
        schema,
      };
    }
    if ("content" in result && Array.isArray(result.content))
      return transformContentArray_2(result.content, name, limits, storageV5, callback);
  }
  let errorMessage = `MCP server "${name}" tool "${tool}": unexpected response format`;
  logMCPError(name, errorMessage);
  throw Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      errorMessage,
      "MCP tool unexpected response format",
    ),
    {
      mcpErrorSource: "downstream_error",
    },
  );
}
//@ chunk-sywnjtqb.js:177581-177690 placement (2.1.88 match: isMedia, 1)
function isMedia_2(block) {
  if (!block || typeof block === "string") return false;
  return block.some((block) => block.type === "image" || block.type === "document");
}
//@ chunk-sywnjtqb.js:177690-179902 placement
/**
 * processMCPResult：处理工具结果：超过 MCP 输出上限时（ENABLE_MCP_LARGE_OUTPUT_FILES 未关闭且不含图片）把全文写入 tool-results 文件并返回 getLargeOutputInstructions 说明，否则截断；记录 tengu_mcp_large_result_handled。
 */
async function transformResult(
  result,
  tool,
  name,
  limits,
  hasResultSizeAnnotation,
  storageV5,
  credentials,
  resultNotForModel,
  serverName,
  toolName,
) {
  if (
    resultNotForModel &&
    result !== null &&
    typeof result === "object" &&
    !("toolResult" in result) &&
    "content" in result &&
    Array.isArray(result.content)
  )
    return result.content;
  let transformed = await transformMCPResult_2(result, tool, name, limits, storageV5, serverName);
  let { type, schema } = transformed;
  let content = dropExtraDocumentBlocks(transformed.content);
  if (name === "ide") return content;
  if (resultNotForModel || (hasResultSizeAnnotation && !isMedia_2(content))) {
    noteResult(toolName, "kept_in_conversation", content);
    return content;
  }
  if (!(await mcpContentNeedsTruncation(content, credentials))) {
    noteResult(toolName, "kept_in_conversation", content);
    return content;
  }
  let sizeEstimateTokens = getContentSizeEstimate(content);
  if (env.ENABLE_MCP_LARGE_OUTPUT_FILES === false) {
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("env_disabled"),
      sizeEstimateTokens,
    });
    noteResult(toolName, "cut_not_saved", content);
    return await truncateMcpContentIfNeeded(content, credentials);
  }
  if (!content) return content;
  if (isMedia_2(content)) {
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("contains_images"),
      sizeEstimateTokens,
    });
    return await truncateMcpContentIfNeeded(content, credentials);
  }
  let now = Date.now();
  let resultId = `mcp-${CLAUDEAI_SERVER_PREFIX(name)}-${CLAUDEAI_SERVER_PREFIX(tool)}-${now}`;
  let contentWithoutMeta = stripTextBlockMeta(content);
  let canUnwrapSingleton =
    useSubagentTruncationPrompt() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_singleton_unwrap", true);
  let blockCount = Array.isArray(contentWithoutMeta) ? contentWithoutMeta.length : undefined;
  let text =
    canUnwrapSingleton &&
    Array.isArray(contentWithoutMeta) &&
    contentWithoutMeta.length === 1 &&
    contentWithoutMeta[0]?.type === "text" &&
    !("annotations" in contentWithoutMeta[0]) &&
    !("_meta" in contentWithoutMeta[0])
      ? contentWithoutMeta[0].text
      : undefined;
  let textForFile =
    typeof contentWithoutMeta === "string"
      ? contentWithoutMeta
      : (text ?? jsonStringify(contentWithoutMeta, null, 2));
  let countsAsText = type === "toolResult" || text !== undefined;
  let persistedFormat = countsAsText ? "text" : "json";
  let lineStats;
  if (countsAsText) {
    let lines = textForFile.split(`
`);
    if (lines.length > 1 && lines.at(-1) === "") lines.pop();
    let maxLineLength = 0;
    for (let line of lines) if (line.length > maxLineLength) maxLineLength = line.length;
    lineStats = {
      count: lines.length,
      maxLen: maxLineLength,
    };
  }
  let persistResult = await persistToolResult(textForFile, resultId, toolResultsDir(), storageV5);
  if (isPersistError(persistResult)) {
    if (toolResultStoreOrNull() !== undefined) {
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("not_stored"),
        sizeEstimateTokens,
      });
      noteResult(toolName, "cut_not_saved", content);
      return await truncateMcpContent(content);
    }
    let keptCount = textForFile.length;
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("persist_failed"),
      sizeEstimateTokens,
    });
    noteResult(toolName, "save_failed", content);
    return `Error: result (${keptCount.toLocaleString()} characters) exceeds maximum allowed tokens. Failed to save output to file: ${persistResult.error}. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data.`;
  }
  logEvent("tengu_mcp_large_result_handled", {
    outcome: lit("persisted"),
    reason: lit("file_saved"),
    sizeEstimateTokens,
    persistedSizeChars: persistResult.originalSize,
    truncatedAtCap: persistResult.truncatedAtBytes !== undefined,
    resultType: fromEnum(type),
    blockCount,
    persistedAs: fromEnum(persistedFormat),
  });
  noteResult(toolName, "saved_as_text", content);
  let formatDescription =
    text !== undefined ? getFormatDescription("toolResult") : getFormatDescription(type, schema);
  return getLargeOutputInstructions(
    persistResult.filepath,
    persistResult.originalSize,
    formatDescription,
    undefined,
    lineStats,
    persistResult.truncatedAtBytes,
  );
}
//@ chunk-sywnjtqb.js:179902-180074 placement
/**
 * 从 -32042（URL elicitation required）错误的 data.elicitations 中取出通过 schema 校验的 elicitation 列表，格式不对返回空数组。
 */
function parseUrlElicitationRequiredError_2(error) {
  let errorData = error.data;
  return (
    errorData != null &&
    typeof errorData === "object" &&
    "elicitations" in errorData &&
    Array.isArray(errorData.elicitations)
      ? errorData.elicitations
      : []
  ).filter((elicitation) => ElicitRequestURLParamsSchema_2.safeParse(elicitation).success);
}
//@ chunk-sywnjtqb.js:180074-180345 placement
/**
 * 把工具调用失败归类为认证问题：401、Unauthorized、OAuth 形状错误、带 headersHelper 的 403、或有待定 step-up scope 的 403 才算；有 step-up scope 且不是真 401 时返回 step_up，否则 credential_rejected，不是认证问题返回 undefined。
 */
function classifyToolCallAuthError_2({
  errorCode,
  message,
  isUnauthorizedError,
  isOAuthShapedAuthError,
  hasHeadersHelper,
  pendingStepUpScope,
}) {
  let hasPendingStepUp = pendingStepUpScope !== undefined;
  if (!(
    errorCode === 401 ||
    isUnauthorizedError ||
    isOAuthShapedAuthError ||
    (errorCode === 403 && hasHeadersHelper) ||
    (hasPendingStepUp && errorCode === 403)
  ))
    return;
  return hasPendingStepUp && errorCode !== 401 && !(isOAuthShapedAuthError && /^HTTP 401\b/.test(message))
    ? "step_up"
    : "credential_rejected";
}
//@ chunk-sywnjtqb.js:180345-180570 placement
function isNeedsApprovalOrExpiredSession(error) {
  if (isRefusedByCcrProxy(error)) return true;
  if (!(error instanceof Error) || !("code" in error)) return false;
  if (error.code === CCR_NEEDS_APPROVAL_CODE) {
    let errorData = "data" in error ? error.data : undefined;
    return typeof errorData === "object" && errorData !== null && "args_sha256" in errorData;
  }
  return error.code === -32000 && isApprovalMismatchMessage(error.message);
}
//@ chunk-sywnjtqb.js:180570-185513 placement
/**
 * 带重试的 MCP 工具调用外层：可选 OTel span；CCR 代理返回 -32003 needs_approval 时弹事后审批卡（Chrome 域被 deny 规则覆盖则直接拒绝，编辑过参数的批准不重放），批准后重试；遇 URL elicitation 要求时处理后重试。
 */
async function callMCPToolWithUrlElicitationRetry({
  client,
  clientConnection,
  tool,
  args,
  meta,
  signal,
  onProgress,
  callToolFn = callMCPTool,
  requestDialog,
  hasResultSizeAnnotation = false,
  resultNotForModel = false,
  imageLimits,
  taskRegistry,
  toolUseId,
  onAwaitingUserInput,
  timing,
  ccrNeedsApprovalRetry,
  storageV5,
  credentials,
  offCriticalPath,
  taskBackground,
  disallowTasks,
}) {
  let retriedApproval = false;
  let isRetryableNeedsApproval = (error) =>
    error.code === CCR_NEEDS_APPROVAL_CODE &&
    typeof error.data === "object" &&
    error.data !== null &&
    "args_sha256" in error.data &&
    !!ccrNeedsApprovalRetry &&
    !!toolUseId &&
    !retriedApproval &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_proxy_needs_approval_retry", true);
  using callTrack = trackCallInProgress(client.transportErrorState);
  for (let idx = 0; ; idx++)
    try {
      let invokeCallTool = () =>
        callToolFn({
          client,
          tool,
          args,
          meta,
          offCriticalPath,
          signal,
          onProgress,
          hasResultSizeAnnotation,
          resultNotForModel,
          imageLimits,
          timing,
          taskRegistry,
          toolUseId,
          storageV5,
          credentials,
          requestDialog,
          taskBackground,
          disallowTasks,
        });
      let callResult;
      if (!isPerfettoTracingEnabled()) callResult = await invokeCallTool();
      else {
        let argsForTelemetry;
        try {
          argsForTelemetry = truncateContentForTelemetry(jsonStringify(args)).content;
        } catch {
          argsForTelemetry = undefined;
        }
        let isMemoryServer = isMemoryServerConnection(client, tool);
        let fileReferenceTool = fileReferenceToolForRecords(client, tool);
        let withholdArgs = isMemoryServer || withholdsFileReferenceArguments(fileReferenceTool, toolUseId);
        let withholdErrorText = withholdsFileReferenceErrorText(fileReferenceTool, toolUseId);
        if (withholdArgs && argsForTelemetry !== undefined)
          argsForTelemetry = notRecordedLength(argsForTelemetry);
        callResult = await withToolExecutionSpan(
          "claude_code.mcp.rpc",
          {
            spanType: "mcp.rpc",
            attrs: {
              "rpc.system": "mcp",
              "rpc.service": client.name,
              "rpc.method": "tools/call",
              mcp_tool: tool,
              attempt: idx,
            },
            ...(argsForTelemetry !== undefined && {
              contentAttrs: {
                mcp_args: argsForTelemetry,
              },
            }),
            withholdErrorText: (spanError) =>
              withholdErrorText ||
              (isMemoryServer &&
                spanError instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS),
            isExpectedError: (spanError) =>
              spanError instanceof ProtocolError &&
              (spanError.code === ProtocolErrorCode.UrlElicitationRequired ||
                isRetryableNeedsApproval(spanError)),
          },
          invokeCallTool,
        );
      }
      if (retriedApproval) logFeatureOk("mcp_ccr_needs_approval");
      return callResult;
    } catch (error) {
      if (!(error instanceof ProtocolError)) {
        if (retriedApproval && !(error instanceof McpSessionExpiredError))
          logFeatureBad("mcp_ccr_needs_approval", "retry_failed");
        throw error;
      }
      if (isRetryableNeedsApproval(error) && ccrNeedsApprovalRetry && toolUseId) {
        retriedApproval = true;
        let errorData = error.data;
        let toolName =
          typeof errorData === "object" &&
          errorData !== null &&
          "tool_name" in errorData &&
          typeof errorData.tool_name === "string"
            ? errorData.tool_name
            : undefined;
        let {
          canUseTool,
          tool: tool_2,
          fullyQualifiedName,
          toolUseContext,
          parentMessage,
        } = ccrNeedsApprovalRetry;
        let chromeSite = chromeSiteFromError(client, error.data);
        let denyCheck =
          chromeSite && chromeSiteDenyCheck(chromeSite, getToolPermissionContext(toolUseContext));
        if (denyCheck) {
          let siteUnreadable = chromeSite?.kind === "unreadable";
          logMCPDebug(
            client.name,
            `Tool '${tool}' returned -32003 needs_approval ${siteUnreadable ? "naming a site this session cannot read, and the session has ClaudeInChromeDomain deny rules" : "for a site a ClaudeInChromeDomain deny rule covers"}: failing the call with no approval card`,
          );
          if (siteUnreadable) logFeatureBad("chrome_permission_prompt", "hosted_site_unreadable");
          else logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
          await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, denyCheck);
          toolUseContext.onPermissionDenial?.(tool_2, toolUseId, args);
          throw markRefusedByCcrProxy(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              denyCheck.message,
              "ccr_proxy_needs_approval_chrome_site_denied",
            ),
          );
        }
        logMCPDebug(
          client.name,
          `Tool '${tool}' returned -32003 needs_approval (tool_name=${toolName}) \u2014 surfacing retroactive ` +
            "approval card",
        );
        logEvent("tengu_mcp_proxy_needs_approval_retry", {
          attempt: idx,
        });
        onAwaitingUserInput?.(true);
        let genericAsk = {
          behavior: "ask",
          suppressAlwaysAllowRule: true,
          message: `The ${fullyQualifiedName} connector requires approval for this call.`,
          decisionReason: {
            type: "other",
            reason: "This connector call requires your approval to proceed.",
          },
        };
        let chromeAsk = chromeSite && chromeSiteAsk(chromeSite, tool, args, toolUseContext);
        let askRequest = chromeAsk ?? genericAsk;
        let approval;
        try {
          approval = await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, askRequest);
        } finally {
          onAwaitingUserInput?.(false);
        }
        if (signal.aborted) throw markRefusedByCcrProxy(new AbortError());
        if (approval.behavior === "allow") {
          if (approval.updatedInput !== undefined && !import_sortedIndex_2(approval.updatedInput, args)) {
            logFeatureSad("mcp_ccr_needs_approval", "edited_input");
            throw markRefusedByCcrProxy(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `The approval for ${fullyQualifiedName} was conditioned on edited arguments, which can't be applied on this retroactive card. To run with different arguments, deny and re-issue the call.`,
                "ccr_proxy_needs_approval_edited_input",
              ),
            );
          }
          let resendRefusal = runDiscarder(toolUseContext.session, toolUseId);
          if (resendRefusal !== undefined)
            throw markRefusedByCcrProxy(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                resendRefusal,
                "ccr_proxy_needs_approval_resend_refused",
              ),
            );
          if (chromeSite?.kind === "named" && chromeAsk && meta)
            meta[CLAUDECODE_CHROMESITE] = chromeSite.site;
          if (meta)
            consumeTicketIntoInput(
              meta,
              toolUseContext.session,
              toolUseContext.toolUseId,
              client.name,
              client.config,
            );
          continue;
        }
        if (approval === askRequest) {
          logFeatureSad("mcp_ccr_needs_approval", "no_prompt_surface");
          throw markRefusedByCcrProxy(error);
        }
        logFeatureOk("mcp_ccr_needs_approval");
        throw markRefusedByCcrProxy(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            approval.message || `Approval denied for ${fullyQualifiedName}`,
            "ccr_proxy_needs_approval_denied",
          ),
        );
      }
      if (error.code !== ProtocolErrorCode.UrlElicitationRequired) {
        if (retriedApproval) logFeatureBad("mcp_ccr_needs_approval", "retry_failed");
        else if (error.code === CCR_NEEDS_APPROVAL_CODE && ccrNeedsApprovalRetry)
          logFeatureBad("mcp_ccr_needs_approval", "arm_not_fired");
        throw error;
      }
      if (hostedDesktopRefusal_2(clientConnection) !== undefined) throw error;
      if (idx - (retriedApproval ? 1 : 0) >= 3) throw error;
      let urlElicitationRequiredError = parseUrlElicitationRequiredError_2(error);
      let serverName = clientConnection.name;
      if (urlElicitationRequiredError.length === 0) {
        logMCPDebug(serverName, `Tool '${tool}' returned -32042 but no valid elicitations in error data`);
        throw error;
      }
      logMCPDebug(
        serverName,
        `Tool '${tool}' requires URL elicitation (error -32042, attempt ${idx + 1}), processing ${urlElicitationRequiredError.length} elicitation(s)`,
      );
      for (let elicitation of urlElicitationRequiredError) {
        let { elicitationId } = elicitation;
        let hookResult = await runElicitationHooks(serverName, elicitation, signal);
        if (hookResult) {
          logMCPDebug(
            serverName,
            `URL elicitation ${elicitationId} resolved by hook: ${jsonStringify(hookResult)}`,
          );
          if (hookResult.action !== "accept")
            return {
              content: `URL elicitation was ${hookResult.action === "decline" ? "declined" : hookResult.action + "ed"} by a hook. The tool "${tool}" could not complete because it requires the user to open a URL.`,
              urlElicitationDeclined: {
                url: elicitation.url,
              },
              isError: true,
            };
          continue;
        }
        let result;
        onAwaitingUserInput?.(true);
        try {
          result = requestDialog
            ? await requestDialog(
                MCP_URL_ELICITATION_DIALOG,
                {
                  serverName,
                  params: elicitation,
                },
                {
                  signal,
                },
              )
            : {
                action: "cancel",
              };
        } finally {
          onAwaitingUserInput?.(false);
        }
        let userResult = await runElicitationResultHooks(serverName, result, signal, "url", elicitationId);
        if (userResult.action !== "accept") {
          logMCPDebug(
            serverName,
            `User ${userResult.action === "decline" ? "declined" : userResult.action + "ed"} URL elicitation ${elicitationId}`,
          );
          return {
            content: `URL elicitation was ${userResult.action === "decline" ? "declined" : userResult.action + "ed"} by the user. The tool "${tool}" could not complete because it requires the user to open a URL.`,
            urlElicitationDeclined: {
              url: elicitation.url,
            },
            isError: true,
          };
        }
        logMCPDebug(serverName, `Elicitation ${elicitationId} completed, retrying tool call`);
      }
    }
}
//@ chunk-sywnjtqb.js:185513-186041 placement
function toolErrorResultText_2(result, serverName, redactErrorForLog) {
  if (!result.isError) return;
  let errorText = "Unknown error";
  if (Array.isArray(result.content) && result.content.length > 0) {
    let flattened = result.content.flatMap((block) => {
      if (block == null || typeof block !== "object") return [];
      if ("text" in block) return [String(block.text)];
      if (block.type === "resource_link") {
        let link = block;
        let linkText = `[Resource link: ${link.name}] ${link.uri}`;
        if (link.description) linkText += ` (${link.description})`;
        return [linkText];
      }
      return [];
    });
    if (flattened.length > 0)
      errorText = flattened.join(`
`);
  } else if ("error" in result) errorText = String(result.error);
  logMCPError(serverName, redactErrorForLog === undefined ? errorText : redactErrorForLog(errorText));
  let meta = stripAnthropicMeta(result._meta);
  throw new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    errorText,
    "MCP tool returned error",
    meta
      ? {
          _meta: meta,
        }
      : undefined,
  );
}
//@ chunk-sywnjtqb.js:186041-186171 layout
var CALL_TOOL_RESULT_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sywnjtqb.js:186041", () => {
  CALL_TOOL_RESULT_SCHEMA = DoctorLazy(() =>
    ListToolsResultSchema.extend({
      tools: array(
        ToolSchema_2.extend({
          inputSchema: ToolSchema_2.shape.inputSchema.extend({
            properties: record(stringSchema(), unknown()).optional(),
          }),
        }),
      ),
    }),
  );
});
//@ chunk-sywnjtqb.js:186171-186224 layout (2.1.88 match: isHTTPConfig, 1)
function isHTTPConfig(config) {
  return config.type === "http" && hasMcpInboundDoor() ? CALL_TOOL_RESULT_SCHEMA() : ListToolsResultSchema;
}
//@ chunk-sywnjtqb.js:186224-186401 placement
/**
 * 构造 SEP-2663（MCP Tasks）所需的 schema 绑定对象：implementation、serverCapabilities、tool、prompt、resource、resourceTemplate 与 contentBlock 的 zod schema，交给 SDK 的任务支持使用。（v2）
 */
function buildSep2663TaskBinding_2() {
  return {
    implementation: ImplementationSchema_2,
    serverCapabilities: ServerCapabilitiesSchema_2,
    tool: ToolSchema_2,
    prompt: PromptSchema_2,
    resource: ResourceSchema_2,
    resourceTemplate: ResourceTemplateSchema_2,
    contentBlock: CompatibilityCallToolResultSchema_2.options[0].shape.content.unwrap().element,
  };
}
//@ chunk-sywnjtqb.js:186401-186492 placement
/**
 * 绕过缓存执行 tools/list。
 */
function listToolsBypassCache(connection, options) {
  return clientOf(connection).request(
    {
      method: "tools/list",
    },
    ListToolsResultSchema,
    {
      ...options,
      cacheMode: "bypass",
    },
  );
}
//@ chunk-sywnjtqb.js:186492-186572 placement
/**
 * 绕过缓存读取资源。
 */
function readResourceBypassCache(connection, uri, options) {
  return clientOf(connection).readResource(
    {
      uri,
    },
    {
      ...options,
      cacheMode: "bypass",
    },
  );
}
//@ chunk-sywnjtqb.js:186572-186705 placement
/**
 * 调用工具 `tools/call` 的底层封装：协议时代为 modern 时在 `_meta` 里附上客户端任务能力声明，legacy 原样调用。（v2）
 */
function invokeToolRaw(connection, params, options) {
  let sdkClient = clientOf(connection);
  let callParams =
    sdkClient.getProtocolEra?.() === "modern"
      ? {
          ...params,
          _meta: {
            ...params._meta,
            [CLIENT_CAPABILITIES_META_KEY]: stripTasksCapability(clientCapabilitiesWithElicitation()),
          },
        }
      : params;
  return sdkClient.callTool(callParams, options);
}
//@ chunk-sywnjtqb.js:186705-186736 placement
/**
 * 任务请求的附加选项（allowTask）。
 */
var TASK_REQUEST_TIMEOUT_MS = 60000;
var TASK_REQUEST_OPTIONS = {
  allowTask: true,
};
//@ chunk-sywnjtqb.js:186736-186898 placement
function withDeclaredClientTasks(client, params) {
  let declaredTasks = getCliOwnedState().clientTasksDeclaredBeforeServerList.get(client);
  let _meta = params._meta;
  return declaredTasks === undefined || client.getProtocolEra?.() !== "modern"
    ? params
    : {
        ...params,
        _meta: {
          ..._meta,
          [CLIENT_CAPABILITIES_META_KEY]: declaredTasks,
        },
      };
}
//@ chunk-sywnjtqb.js:186898-186990 placement
/**
 * 任务 id schema（1–1024 字符、无控制字符）。
 */
var taskResultSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var taskIdSchema;
deferInit("chunk-sywnjtqb.js:186898", () => {
  taskResultSchema = DoctorLazy(() =>
    looseObject({
      resultType: literal("task"),
    }),
  );
  taskIdSchema = DoctorLazy(() =>
    stringSchema()
      .min(1)
      .max(1024)
      .regex(/^\P{Cc}+$/u),
  );
});
//@ chunk-sywnjtqb.js:186990-187305 placement
/**
 * 为 MCP 任务（Tasks）构造请求通道：request 发任意方法（带签名头与超时），resolveInputRequest 把任务中途的输入请求（elicitation 等）交给对话框处理。（v2）
 */
function createSep2663TaskBinding(connection, { taskId, requestDialog }) {
  let client = clientOf(connection.client);
  return {
    request: (method, params, options) =>
      client.request(
        {
          method,
          params: withDeclaredClientTasks(client, params),
        },
        ResultSchema,
        {
          ...TASK_REQUEST_OPTIONS,
          signal: options.signal,
          headers: options.headers,
          timeout: TASK_REQUEST_TIMEOUT_MS,
        },
      ),
    resolveInputRequest: (key, inputRequest, signal) =>
      resolveTaskInputRequest({
        key,
        inputRequest,
        task: {
          taskId,
        },
        connected: connection,
        signal,
        requestDialog,
        transportErrorState: undefined,
      }),
  };
}
//@ chunk-sywnjtqb.js:187305-187358 placement
/**
 * 任务中途输入请求的 schema。
 */
var taskInputRequestSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sywnjtqb.js:187305", () => {
  taskInputRequestSchema = DoctorLazy(() =>
    union([
      ElicitRequestParamsSchema,
      ElicitRequestURLParamsSchema_2.omit({
        elicitationId: true,
      }),
    ]),
  );
});
//@ chunk-sywnjtqb.js:187358-188408 placement
/**
 * 处理 MCP 任务的输入请求：elicitation/create 校验参数后在交互会话中弹对话框（URL 模式被关闭或非交互时取消任务），roots/list 返回根目录，其它方法不支持。
 */
async function resolveTaskInputRequest({
  key,
  inputRequest,
  task,
  connected,
  signal,
  requestDialog,
  transportErrorState,
}) {
  let serverName = connected.name;
  switch (inputRequest.method) {
    case "elicitation/create": {
      let parseResult = taskInputRequestSchema().safeParse(inputRequest.params);
      if (!parseResult.success) {
        logMCPDebug(
          serverName,
          `Task ${task.taskId}: input request '${key}' carries invalid elicitation params: ${parseResult.error.message}`,
        );
        return;
      }
      if (
        parseResult.data.mode === "url" &&
        clientCapabilitiesWithElicitation().elicitation?.url === undefined
      ) {
        logMCPDebug(
          serverName,
          `Task ${task.taskId}: input request '${key}' asks for URL elicitation, which is switched off (tengu_mcp_url_elicitation); the task will be cancelled`,
        );
        return;
      }
      if (requestDialog && !getIsNonInteractiveSession())
        return handleElicitationRequest({
          connected,
          params: parseResult.data,
          signal,
          requestDialog,
          transportErrorState,
        });
      logMCPDebug(
        serverName,
        `Task ${task.taskId}: cannot show input request '${key}' (${requestDialog ? "this session is non-interactive" : "no dialog was passed to this call"}); the task will be cancelled`,
      );
      throw new mcpTaskDriveModule.TaskInputUnservableError(
        `task ${task.taskId} input request '${key}' cannot be surfaced in this session`,
      );
    }
    case "roots/list":
      return getMcpRoots_2(isDocumentsPluginServer_2(connected.config));
    default:
      logMCPDebug(
        serverName,
        `Task ${task.taskId}: input request '${key}' has unsupported method ${inputRequest.method}`,
      );
      return;
  }
}
//@ chunk-sywnjtqb.js:188408-204263 placement
/**
 * 发 tools/call 并监护整次调用：总超时、空闲超时（进度通知或 elicitation 关闭会重置）、传输断开 90 秒后判定响应丢失、答复流提前结束；modern 服务器支持任务化（转后台或轮询）；认证失败时触发重新认证并按需重试，结果交给 processMCPResult。
 */
async function callMCPTool({
  client,
  tool,
  args,
  meta,
  signal,
  onProgress,
  offCriticalPath = false,
  hasResultSizeAnnotation = false,
  resultNotForModel = false,
  imageLimits,
  timing,
  taskRegistry,
  toolUseId,
  idleTimeoutMs,
  isAuthRetry = false,
  storageV5,
  credentials,
  requestDialog,
  taskBackground,
  disallowTasks,
}) {
  let { client: client_2, name: serverName, config, transportErrorState } = client;
  let sdkClient = clientOf(client_2);
  let fileRefTool = fileReferenceToolForRecords(client, tool);
  let withheldFileRef = withholdsFileReferenceErrorText(fileRefTool, toolUseId) ? fileRefTool : undefined;
  let redactErrorForLog = isMemoryServerConnection(client, tool)
    ? describeRedactedMcpError
    : withheldFileRef !== undefined
      ? (redact) => withheldFileReferenceErrorForLog(withheldFileRef, redact)
      : undefined;
  let now = Date.now();
  let startEpoch = identityEpoch();
  let freshTransport = sdkClient.transport?.sessionId === undefined;
  let progressTimer;
  let toolUseIdMeta = meta?.["claudecode/toolUseId"];
  let hasToolUseId = typeof toolUseIdMeta === "string";
  let watchdog = {
    armedAt: 0,
    offCriticalPath,
    toolUseId: hasToolUseId ? toolUseIdMeta : undefined,
    mark:
      toolUseIdMeta === undefined &&
      config.type === "http" &&
      isCcrMcpPath(config.url) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_rippling_map", true)
        ? randomUUID()
        : undefined,
    ownSends: {
      started: 0,
      ranNothing: 0,
    },
    timing: timing ?? getRequestTimingStore(),
  };
  transportErrorState?.activeCallWatchdogs.add(watchdog);
  let started = transportErrorState?.toolCallSends?.started;
  let sentRequests = new Map();
  let requestStates = hasToolUseId ? sentRequests : new Map();
  let ranNothing = false;
  let answerStreamTimer;
  try {
    incrementCallsInProgress(transportErrorState);
    logMCPDebug(serverName, `Calling MCP tool: ${tool}`);
    let resolvedIdleTimeoutMs = idleTimeoutMs ?? getMcpToolIdleTimeoutMs_2(config);
    let lastActivityAt = now;
    let rejectIdle;
    let promise = new Promise((resolve, reject) => {
      rejectIdle = reject;
    });
    watchdog.requestSent = (id) => {
      requestStates.set(String(id), "sent");
      ranNothing = false;
    };
    watchdog.requestTaken = (id) => {
      if (requestStates.has(String(id))) requestStates.set(String(id), "taken");
    };
    watchdog.requestAnswered = (id) => {
      requestStates.delete(String(id));
    };
    watchdog.requestNotRun = (id) => {
      requestStates.delete(String(id));
      ranNothing = hasToolUseId;
    };
    let isTracked = (id) =>
      requestStates.has(String(id)) && transportErrorState?.activeCallWatchdogs.has(watchdog) === true;
    watchdog.answerStreamEnded = (id) => {
      if (!isTracked(id)) return;
      clearTimeout(answerStreamTimer);
      answerStreamTimer = setTimeout(() => {
        if (!isTracked(id)) return;
        logMCPDebug(serverName, `Tool '${tool}' aborting: its answer stream ended with no answer`);
        rejectIdle(
          Object.assign(
            hasToolUseId
              ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  describeUnansweredCall(serverName, tool),
                  "MCP answer stream ended mid-call",
                  QUESTION_UNANSWERED_CODE,
                )
              : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `MCP server "${serverName}": the answer stream for tool "${tool}" ended with no answer`,
                  "MCP answer stream ended mid-call",
                ),
            {
              mcpErrorSource: "downstream_unreachable",
            },
          ),
        );
      }, ANSWER_STREAM_GRACE_MS_2);
    };
    progressTimer = setInterval(() => {
      let floored = Math.floor((Date.now() - now) / 1000);
      logMCPDebug(serverName, `Tool '${tool}' still running (${floored}s elapsed)`);
      if (watchdog.armedAt > 0 && Date.now() - watchdog.armedAt > 90000) {
        logMCPDebug(
          serverName,
          `Tool '${tool}' aborting: transport error ${Math.floor((Date.now() - watchdog.armedAt) / 1000)}s ago, response presumed lost`,
        );
        let answered = sentRequests.size > 0;
        rejectIdle(
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              answered
                ? describeUnansweredCall(serverName, tool)
                : `MCP server "${serverName}" transport dropped mid-call; response for tool "${tool}" was lost`,
              "MCP transport lost mid-call",
              answered ? MCP_CALL_UNANSWERED : undefined,
            ),
            {
              mcpErrorSource: "downstream_unreachable",
            },
          ),
        );
        return;
      }
      if (transportErrorState?.pendingElicitations) lastActivityAt = Date.now();
      else if (transportErrorState && transportErrorState.lastElicitationClosedAt > lastActivityAt)
        lastActivityAt = transportErrorState.lastElicitationClosedAt;
      if (resolvedIdleTimeoutMs > 0 && Date.now() - lastActivityAt > resolvedIdleTimeoutMs) {
        let floored = Math.floor((Date.now() - lastActivityAt) / 1000);
        logMCPDebug(
          serverName,
          `Tool '${tool}' aborting: no response or progress notification for ${floored}s (idle timeout ${Math.floor(resolvedIdleTimeoutMs / 1000)}s)`,
        );
        let message = `MCP server "${serverName}" tool "${tool}" sent no response or progress for ${floored}s; aborting. If this server is configured in your MCP settings, set a per-server "timeout" (ms) to allow longer silent runs for just this server; otherwise set CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT (ms) globally (0 disables).`;
        let unknownOutcome = sentRequests.size > 0;
        rejectIdle(
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              unknownOutcome ? `${message} ${CALL_OUTCOME_UNKNOWN_NOTICE}` : message,
              "MCP tool idle timeout",
              unknownOutcome ? MCP_CALL_UNANSWERED : undefined,
            ),
            {
              mcpErrorSource: "downstream_unreachable",
            },
          ),
        );
      }
    }, 30000);
    let callTimeoutMs = getMcpToolTimeoutMs_3(config);
    let callTimeoutTimer;
    let rejectTimeout;
    let promise_2 = new Promise((resolve, reject) => {
      rejectTimeout = reject;
    });
    let armCallTimeout = (callTimeoutMs, callTimeoutMs_2) => {
      clearTimeout(callTimeoutTimer);
      callTimeoutTimer = setTimeout(
        (reject, serverName, toolName, timeoutMs, sentRequests, watchdog) => {
          let message = `MCP server "${serverName}" tool "${toolName}" timed out after ${Math.floor(timeoutMs / 1000)}s`;
          let unanswered = sentRequests.size > 0;
          let openQuestions = (watchdog.openQuestions ?? 0) > 0;
          let notices = [
            ...(openQuestions ? [QUESTION_UNANSWERED_TEXT] : []),
            ...(unanswered ? [CALL_OUTCOME_UNKNOWN_NOTICE] : []),
          ];
          reject(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                notices.length > 0 ? `${message}. ${notices.join(" ")}` : message,
                "MCP tool timeout",
                unanswered ? MCP_CALL_UNANSWERED : openQuestions ? MCP_QUESTION_UNANSWERED : undefined,
              ),
              {
                mcpErrorSource: "downstream_unreachable",
              },
            ),
          );
        },
        callTimeoutMs,
        rejectTimeout,
        serverName,
        tool,
        callTimeoutMs_2,
        sentRequests,
        watchdog,
      );
    };
    armCallTimeout(callTimeoutMs, callTimeoutMs);
    let pauseForQuestions = shouldPauseForQuestions(config, callTimeoutMs);
    let callWatchdog = isProbeAllowed(config);
    if (pauseForQuestions || callWatchdog > 0)
      installQuestionPause(watchdog, {
        inFlight: transportErrorState?.activeCallWatchdogs,
        timeoutMs: callTimeoutMs,
        pauses: pauseForQuestions,
        questionBoundMs: callWatchdog,
        armTimeout: armCallTimeout,
        timedOut: promise_2,
      });
    let cleanupTimers = () => {
      if (callTimeoutTimer) clearTimeout(callTimeoutTimer);
      clearTimeout(answerStreamTimer);
      if (progressTimer !== undefined) {
        clearInterval(progressTimer);
        progressTimer = undefined;
      }
      transportErrorState?.activeCallWatchdogs.delete(watchdog);
    };
    let noTasks =
      disallowTasks === true ||
      isSingleShotPrintSession() ||
      (getIsNonInteractiveSession() && taskBackground === undefined);
    let reportProgress = (status, progressMessage, progress) => {
      watchdog.armedAt = 0;
      lastActivityAt = Date.now();
      onProgress?.({
        type: "mcp_progress",
        status,
        serverName,
        toolName: tool,
        progress,
        progressMessage,
      });
    };
    let runCall = async () => {
      let tasksEnabled = isMcpTasksEnabled();
      let canUseTasks = tasksEnabled && !noTasks && !shouldRestrictRemoteHost(config);
      if (tasksEnabled && !noTasks && !canUseTasks)
        logMCPDebug(
          serverName,
          "Tasks are off for this server: the tengu_gleaming_creek server list shuts it out, so its tool calls run without Tasks",
        );
      let modernEra = sdkClient.getProtocolEra?.() === "modern";
      let useTasks = canUseTasks && modernEra;
      let taskRequestOptions = useTasks ? TASK_REQUEST_OPTIONS : {};
      let declaredCapabilities = getCliOwnedState().clientTasksDeclaredBeforeServerList.get(sdkClient);
      let callMeta =
        !canUseTasks && modernEra
          ? {
              ...meta,
              [CLIENT_CAPABILITIES_META_KEY]: stripTasksCapability(
                declaredCapabilities ?? clientCapabilitiesWithElicitation(),
              ),
            }
          : meta;
      let result = await sdkClient.callTool(
        {
          name: tool,
          arguments: args,
          _meta:
            watchdog.mark === undefined
              ? callMeta
              : {
                  ...callMeta,
                  [CLAUDECODE_CALLMARK]: watchdog.mark,
                },
        },
        {
          ...taskRequestOptions,
          signal:
            pauseForQuestions || callWatchdog > 0
              ? AbortSignal.any([signal, abortController.signal])
              : signal,
          timeout: pauseForQuestions ? MAX_TIMER_DELAY_MS : callTimeoutMs,
          onprogress: (progressEvent) => {
            watchdog.armedAt = 0;
            lastActivityAt = Date.now();
            mcpAutoBackgroundModule?.reportBackgroundProgress(signal, progressEvent);
            if (onProgress)
              onProgress({
                type: "mcp_progress",
                status: "progress",
                serverName,
                toolName: tool,
                progress: progressEvent.progress,
                total: progressEvent.total,
                progressMessage: progressEvent.message,
              });
          },
        },
      );
      if (useTasks) {
        let cancelTask = (taskId) => {
          sdkClient
            .request(
              {
                method: "tasks/cancel",
                params: {
                  taskId,
                },
              },
              ResultSchema,
              {
                signal: AbortSignal.timeout(MCP_TASK_POLL_MS),
              },
            )
            .catch(() => {});
        };
        let taskParse = mcpTaskDriveModule.CreateTaskResultSchema().safeParse(result);
        if (taskParse.success) {
          if (abortController.signal.aborted) {
            cancelTask(taskParse.data.taskId);
            return result;
          }
          if (taskBackground && taskRegistry) {
            placeholder = backgroundTask(taskParse.data, taskBackground, taskRegistry);
            return result;
          }
          return pollInline(taskParse.data);
        }
        let handleParse = taskResultSchema().safeParse(result);
        if (handleParse.success) {
          logMCPDebug(
            serverName,
            `Tool '${tool}' returned a malformed task handle: ${taskParse.error.message.slice(0, 200)}`,
          );
          let taskIdParse = taskIdSchema().safeParse(handleParse.data.taskId);
          if (taskIdParse.success) cancelTask(taskIdParse.data);
          return {
            content: [
              {
                type: "text",
                text: `MCP server "${serverName}" returned a malformed task handle for tool "${tool}", so Claude Code cannot track the task or get its result. ${taskIdParse.success ? "It tried to cancel the task, but the" : "The"} server may still be running it. Calling the tool again may start another task.`,
              },
            ],
            isError: true,
            _meta: undefined,
            structuredContent: undefined,
          };
        }
        let agentTaskMeta = mcpTaskDriveModule.parseAgentTaskMeta(result._meta);
        if (agentTaskMeta?.merged === true && agentTaskMeta.taskId && taskRegistry) {
          if (
            mcpTasksModule.noteMergedIntoTask(
              taskRegistry,
              serverName,
              mcpTasksModule.mcpTransportFingerprint(client.config),
              agentTaskMeta.taskId,
            )
          )
            logMCPDebug(
              serverName,
              `Tool '${tool}' merged a message into running task ${agentTaskMeta.taskId}`,
            );
        }
      }
      return result;
    };
    let placeholder;
    let backgroundTask = (task, taskBackground, taskRegistry) => {
      let transportFingerprint = mcpTasksModule.mcpTransportFingerprint(client.config);
      let registration = mcpTasksModule.registerOrAdoptSep2663Task({
        taskRegistry,
        task,
        serverName,
        toolName: tool,
        toolUseId,
        transportFingerprint,
        adoptRegistryId: taskBackground.share.registryId,
        storageV5: taskBackground.storageV5,
      });
      let { registryId, driveAbort, ttlExpiresAt, killed } = registration;
      taskBackground.share.becameTask = true;
      taskBackground.onBackgrounded();
      logMCPDebug(
        serverName,
        killed
          ? `Tool '${tool}' returned task ${task.taskId} after background task ${registryId} was stopped; cancelling it`
          : `Tool '${tool}' returned task ${task.taskId} (${task.status}); backgrounded as ${registryId}`,
      );
      if (!registration.killed && taskBackground.session !== undefined && isTaskWorkerWakeEnabled())
        workerWakesModule.mcpTaskWorkerWakeKeepers.of(taskBackground.session).taskBackgrounded({
          taskRegistry,
          record: registration.sidecarRecord,
          storageV5: taskBackground.storageV5,
        });
      let makeBinding = (connection, taskId) =>
        createSep2663TaskBinding(connection, {
          taskId,
          requestDialog,
        });
      mcpTasksModule.startSep2663BackgroundDrive({
        taskRegistry,
        registryId,
        serverName,
        toolName: tool,
        mcpTaskId: task.taskId,
        pollIntervalMs: task.pollIntervalMs,
        ttlExpiresAt,
        driveAbort,
        initialBinding: makeBinding(client, task.taskId),
        initialConfig: client.config,
        bindingFactory: makeBinding,
        transportFingerprint,
        storageV5: taskBackground.storageV5,
        credentials: taskBackground.credentials,
      });
      let agentMeta = isPlainObject(task._meta)
        ? task._meta[mcpTaskDriveModule.AGENT_TASK_META_KEY]
        : undefined;
      return {
        ...mcpTasksModule.buildSep2663PlaceholderResult({
          serverName,
          toolName: tool,
          registryId,
          mcpTaskId: task.taskId,
          stopped: killed,
          modelImmediateResponse: mcpTaskDriveModule.parseAgentTaskMeta(task._meta)?.modelImmediateResponse,
        }),
        ...(!killed &&
          agentMeta !== undefined && {
            _meta: {
              [mcpTaskDriveModule.AGENT_TASK_META_KEY]: agentMeta,
            },
          }),
      };
    };
    let pollInline = async (task) => {
      logMCPDebug(serverName, `Tool '${tool}' returned task ${task.taskId} (${task.status}); polling inline`);
      reportProgress(
        "progress",
        mcpTaskPersistenceModule.boundMcpStatusMessage(task.statusMessage) ??
          `Task ${shortTaskLabel(task.taskId)} ${task.status}`,
        0,
      );
      let progress = 0;
      let outcome = await mcpTaskDriveModule.driveMcpTask({
        errorText: (errorText) => describeConnectError(errorText, config),
        task,
        signal: abortController.signal,
        log: (logLine) => logMCPDebug(serverName, logLine),
        request: (method, params, options) =>
          sdkClient.request(
            {
              method,
              params,
            },
            ResultSchema,
            {
              ...TASK_REQUEST_OPTIONS,
              signal: options.signal,
              headers: options.headers,
              timeout: TASK_REQUEST_TIMEOUT_MS,
            },
          ),
        onStatus: (status) => {
          progress += 1;
          reportProgress(
            "progress",
            mcpTaskPersistenceModule.boundMcpStatusMessage(status.statusMessage) ??
              `Task ${shortTaskLabel(status.taskId)} ${status.status.replace("_", " ")}`,
            progress,
          );
        },
        resolveInputRequest: (key, inputRequest) =>
          resolveTaskInputRequest({
            key,
            inputRequest,
            task,
            connected: client,
            signal: abortController.signal,
            requestDialog,
            transportErrorState,
          }),
      });
      if (outcome.status === "completed") {
        logMCPDebug(serverName, `Task ${task.taskId} completed`);
        return CompatibilityCallToolResultSchema_2.parse(outcome.result);
      }
      let message = mcpTaskPersistenceModule.boundMcpStatusMessage(outcome.error.message) ?? "";
      logMCPDebug(
        serverName,
        `Task ${task.taskId} ended without a result: ${outcome.error.kind} \u2014 ${message}`,
      );
      if (signal.aborted) throw new AbortError();
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `MCP server "${serverName}" task for tool "${tool}" ${outcome.error.kind === "cancelled" || outcome.error.kind === "input_unservable" ? "was cancelled" : "failed"}: ${message}`,
        "MCP task did not complete",
      );
    };
    let abortController = new AbortController();
    let abortCall = () => abortController.abort();
    signal.addEventListener("abort", abortCall, {
      once: true,
    });
    let stopTiming = timing?.mark("external");
    let callResult = await Promise.race([runCall(), promise_2, promise]).finally(() => {
      signal.removeEventListener("abort", abortCall);
      abortCall();
      cleanupTimers();
      stopTiming?.();
    });
    watchdog.returned?.();
    if (placeholder) {
      noteHearthDegraded(serverName, undefined);
      return placeholder;
    }
    toolErrorResultText_2(callResult, serverName, redactErrorForLog);
    let elapsedMs = Date.now() - now;
    let elapsedText =
      elapsedMs < 1000
        ? `${elapsedMs}ms`
        : elapsedMs < 60000
          ? `${Math.floor(elapsedMs / 1000)}s`
          : `${Math.floor(elapsedMs / 60000)}m ${Math.floor((elapsedMs % 60000) / 1000)}s`;
    logMCPDebug(serverName, `Tool '${tool}' completed successfully in ${elapsedText}`);
    let codeIndexingFromMcpServerName = detectCodeIndexingFromMcpServerName(serverName);
    if (codeIndexingFromMcpServerName)
      logEvent("tengu_code_indexing_tool_used", {
        tool: fromEnum(codeIndexingFromMcpServerName),
        source: lit("mcp"),
        success: true,
      });
    let content = await transformResult(
      callResult,
      tool,
      serverName,
      imageLimits,
      hasResultSizeAnnotation,
      storageV5,
      credentials,
      resultNotForModel,
      attachmentNoteFor(client, tool),
      textResultToolUseId(client, tool, toolUseId, callResult),
    );
    noteHearthDegraded(serverName, undefined);
    return {
      content,
      _meta: callResult._meta,
      structuredContent: callResult.structuredContent,
      resourceLinks: anthropicResourceLinks(callResult.content),
    };
  } catch (error) {
    if (!signal.aborted) noteHearthDegraded(serverName, error);
    if (progressTimer !== undefined) clearInterval(progressTimer);
    clearTimeout(answerStreamTimer);
    transportErrorState?.activeCallWatchdogs.delete(watchdog);
    let failedAfterMs = Date.now() - now;
    if (signal?.aborted !== true && error instanceof Error && error.name !== "AbortError")
      logMCPDebug(
        serverName,
        `Tool '${tool}' failed after ${Math.floor(failedAfterMs / 1000)}s: ${redactErrorForLog !== undefined && error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? redactErrorForLog(error.message) : withheldFileRef !== undefined ? withheldFileReferenceErrorForLog(withheldFileRef, error.message, error.name) : describeConnectError(error, config)}`,
      );
    if (error instanceof Error) {
      let errorCode =
        error instanceof ProtocolError
          ? undefined
          : error instanceof SdkHttpError
            ? error.status
            : "code" in error && typeof error.code === "number"
              ? error.code
              : undefined;
      let hasHelper =
        (config.type === "http" || config.type === "sse" || config.type === "ws") && !!config.headersHelper;
      let cliBearer = hasCliOwnedBearer(config);
      let oauthCode =
        error instanceof OAuthError
          ? error.code
          : "errorCode" in error && typeof error.errorCode === "string"
            ? error.errorCode
            : undefined;
      let isOAuthShapedAuthError =
        oauthCode !== undefined &&
        !["invalid_grant", "invalid_client", "unauthorized_client"].includes(oauthCode) &&
        /^HTTP 40[13]\b/.test(error.message);
      let pendingStepUpScope = getCliOwnedState().clientAuthProviders.get(
        clientOf(client_2),
      )?.pendingStepUpScope;
      let authKind = classifyToolCallAuthError_2({
        errorCode,
        message: error.message,
        isUnauthorizedError: error instanceof UnauthorizedError_2,
        isOAuthShapedAuthError,
        hasHeadersHelper: hasHelper,
        pendingStepUpScope,
      });
      let reconnectConfig =
        (config.type === "http" || config.type === "sse") &&
        !config.headersHelper &&
        !configHasAuthorizationHeader(config)
          ? config
          : undefined;
      let canReauth =
        !isAuthRetry && authKind === "credential_rejected" && !hasHelper && reconnectConfig !== undefined;
      let refreshTokenStored = canReauth && (await hasStoredRefreshToken(serverName, reconnectConfig));
      let signedOutFallback =
        refreshTokenStored ||
        (canReauth &&
          isSignedOutFallbackEnabled() &&
          getCliOwnedState().clientAuthProviders.get(clientOf(client_2))?.lastAuthRejection?.status === 401 &&
          getCliOwnedState().clientAuthProviders.get(clientOf(client_2))?.lastAuthRejection?.accessToken !==
            undefined);
      if ((hasHelper || cliBearer || reconnectConfig !== undefined) && !isAuthRetry) {
        let cacheKey = serverCacheKey(serverName, config);
        if (identityEpoch() !== startEpoch)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `MCP tool call to server "${serverName}" was aborted: the account changed before re-authentication`,
            "MCP tool call aborted: account changed before reauth",
          );
        let reauthInFlight = getConnectionCache().reauthInFlight;
        let cliOwnedState = getCliOwnedState();
        let existing = reauthInFlight.get(cacheKey);
        let promise = existing !== undefined && existing.epoch === startEpoch ? existing.promise : undefined;
        cliOwnedState.reauthDecisionSinkForTest?.(
          promise !== undefined ? "joined" : existing !== undefined ? "stale_refused" : "started",
        );
        let collateral =
          promise !== undefined &&
          ((error instanceof SdkError && error.code === SdkErrorCode.ConnectionClosed) ||
            (error instanceof ProtocolError && error.code === -32000)) &&
          !isTruncatedBodyError(transportErrorState?.closeReason);
        if (
          (collateral ||
            (authKind === "credential_rejected" && hasHelper) ||
            (authKind === "credential_rejected" && cliBearer) ||
            signedOutFallback) &&
          !isMcpServerDisabled(serverName) &&
          !isMcpServerBlockedAtConnectTime(serverName, config)
        ) {
          logMCPDebug(
            serverName,
            hasHelper
              ? `Tool '${tool}' returned ${errorCode ?? 401}; re-running headersHelper and retrying once`
              : cliBearer
                ? `Tool '${tool}' returned ${errorCode ?? 401}; session credential rejected \u2014 reconnecting and retrying once`
                : collateral
                  ? `Tool '${tool}' failed because a reconnect in progress closed its connection; retrying once on the new connection`
                  : `Tool '${tool}' returned ${errorCode ?? 401}; ${refreshTokenStored ? "refresh token stored" : "stored sign-in rejected, no refresh token"} \u2014 reconnecting and retrying once`,
          );
          if (collateral)
            logFeatureSad(hasHelper ? "mcp_headers_helper" : "mcp_oauth_refresh", "collateral_rejoin");
          if (!promise) {
            logFeatureSad(
              hasHelper
                ? "mcp_headers_helper"
                : signedOutFallback && !refreshTokenStored
                  ? "mcp_signed_out_fallback"
                  : "mcp_oauth_refresh",
              "reauth_retry",
            );
            sdkClient.onclose = undefined;
            let epoch = startEpoch;
            promise = (async () => {
              await clearServerCache(serverName, config);
              return connectToServer(serverName, config, undefined, undefined, credentials);
            })();
            let entry = {
              promise,
              epoch,
            };
            reauthInFlight.set(cacheKey, entry);
            promise
              .then((reconnected) => {
                if (reconnected.type === "connected" && identityEpoch() === epoch)
                  REAUTH_RECONNECT_SIGNAL.emit(serverName, config);
              })
              .finally(() => {
                if (reauthInFlight.get(cacheKey) === entry && !cliOwnedState.holdStaleReauthEntryForTest)
                  reauthInFlight.delete(cacheKey);
              })
              .catch(() => {});
          }
          let reconnected = await promise;
          if (identityEpoch() !== startEpoch) {
            if (reconnected.type === "connected") await detachAndCloseConnection(reconnected);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP tool call to server "${serverName}" was aborted: the account changed during re-authentication`,
              "MCP tool call aborted: account changed during reauth",
            );
          }
          if (
            reconnected.type === "connected" &&
            (isMcpServerDisabled(serverName) || isMcpServerBlockedAtConnectTime(serverName, config))
          )
            await clearServerCache(serverName, config);
          else if (reconnected.type === "connected")
            return callMCPTool({
              client: reconnected,
              tool,
              args,
              meta,
              signal,
              onProgress,
              offCriticalPath,
              hasResultSizeAnnotation,
              resultNotForModel,
              timing,
              imageLimits,
              taskRegistry,
              requestDialog,
              taskBackground,
              toolUseId,
              idleTimeoutMs,
              isAuthRetry: true,
              storageV5,
              credentials,
              disallowTasks,
            });
          logMCPDebug(
            serverName,
            `Auth reconnect returned '${reconnected.type}'; falling through to needs-auth`,
          );
          if (isDiscoveryCacheOn() && reconnected.type !== "needs-auth") {
            let cached = connectToServer.cache?.get?.(cacheKey);
            if (
              cached !== undefined &&
              (await clearMcpAuthCache(cached)) === reconnected &&
              connectToServer.cache?.get?.(cacheKey) === cached
            )
              getConnectionCache().connections.delete(cacheKey);
          }
        }
      }
      if (authKind === "credential_rejected" && cliBearer) {
        await clearServerCache(serverName, config);
        logMCPDebug(
          serverName,
          `Tool '${tool}' rejected the session credential (${errorCode ?? 401}); failing the call and clearing the connection for a fresh retry later`,
        );
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            AUTH_MESSAGES.sessionCredentialRejected(serverName, errorCode ?? 401),
            "MCP server rejected the session credential",
          ),
          {
            mcpErrorSource: "other",
          },
        );
      }
      if (authKind !== undefined) {
        let notConnected = config.type === "claudeai-proxy" && config.eligible === false;
        let authErrorKind = notConnected
          ? "not_connected"
          : authKind === "step_up"
            ? "insufficient_scope"
            : "token_expired";
        logMCPDebug(
          serverName,
          authErrorKind === "insufficient_scope"
            ? `Tool call returned 403 insufficient_scope (scope: ${redactSensitiveUrlParams("scope", pendingStepUpScope ?? "")})`
            : "Tool call returned 401 Unauthorized - token may have expired",
        );
        let analytics = mcpServerKeyHashEntry(config, serverName);
        let loggable = isMcpServerLoggableInAnalytics(serverName, config);
        logEvent("tengu_mcp_tool_call_auth_error", {
          errorCode: fromNumber(errorCode ?? (authKind === "step_up" ? 403 : 401)),
          transportType: fromEnum(config.type ?? "stdio"),
          authErrorKind: fromEnum(authErrorKind),
          ...analytics,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(CLAUDEAI_SERVER_PREFIX(serverName), loggable),
          mcpToolName: loggableMcpToolName(
            CLAUDEAI_SERVER_PREFIX(serverName),
            CLAUDEAI_SERVER_PREFIX(tool),
            loggable,
          ),
        });
        let headerRejected =
          (config.type === "http" || config.type === "sse") && configHasAuthorizationHeader(config);
        throw new McpAuthError(
          serverName,
          notConnected
            ? AUTH_MESSAGES.notConnected(serverName)
            : authErrorKind === "insufficient_scope"
              ? AUTH_MESSAGES.stepUp(serverName, pendingStepUpScope)
              : hasHelper
                ? AUTH_MESSAGES.helperRejected(serverName)
                : headerRejected
                  ? AUTH_MESSAGES.headerRejected(serverName)
                  : AUTH_MESSAGES.signInAgain(serverName, config),
          authErrorKind,
          getCliOwnedState().clientFirstPartyBearers.get(clientOf(client_2))?.last,
          authErrorKind === "insufficient_scope" ? pendingStepUpScope : undefined,
        );
      }
      let sessionExpired =
        !(config.type === "http" && errorCode === 404 && freshTransport) && isMcpSessionExpiredError(error);
      let connectionClosed =
        ((error instanceof SdkError && error.code === SdkErrorCode.ConnectionClosed) ||
          (error instanceof ProtocolError &&
            error.code === -32000 &&
            error.message.includes("Connection closed"))) &&
        (config.type === "http" || config.type === "claudeai-proxy");
      if (error instanceof HttpBodyOverflowError_2) {
        noteGmailAttachmentNotRead(client, tool, "too_large");
        noteGmailAttachmentShown(client, tool, "http body overflow");
        throw new McpToolResultNotReadError(serverName, tool, {
          kind: "too_large",
          capBytes: MCP_BODY_LIMIT,
        });
      }
      if (connectionClosed && isTruncatedBodyError(transportErrorState?.closeReason)) {
        noteGmailAttachmentNotRead(client, tool, "connection_closed");
        noteGmailAttachmentShown(client, tool, transportErrorState?.closeReason);
        throw new McpToolResultNotReadError(serverName, tool, {
          kind: "connection_closed",
        });
      }
      let states = [...sentRequests.values()];
      if (connectionClosed && states.length > 0) {
        logMCPDebug(
          serverName,
          `Tool '${tool}' not sent again: the connection closed before the call was answered`,
        );
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            describeUnansweredCall(serverName, tool),
            "MCP call not sent again after connection closed",
            MCP_CALL_NOT_SENT_AGAIN,
          ),
          {
            mcpErrorSource: "downstream_unreachable",
          },
        );
      }
      if (
        states.includes("sent") &&
        !sessionExpired &&
        (errorCode === undefined || error.name === "TimeoutError"
          ? !(
              error instanceof SdkError ||
              error instanceof ProtocolError ||
              error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
            )
          : RETRYABLE_HTTP_STATUSES.has(errorCode))
      ) {
        logMCPDebug(
          serverName,
          `Tool '${tool}' failed: its POST does not show whether the server got the call`,
        );
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            describeUnansweredCall(serverName, tool),
            "MCP call went out and got no answer",
            MCP_CALL_UNANSWERED,
          ),
          {
            mcpErrorSource: "downstream_unreachable",
          },
        );
      }
      if (sessionExpired || connectionClosed) {
        logMCPDebug(
          serverName,
          `MCP session expired during tool call (${sessionExpired ? "stale session" : "connection closed"}), clearing connection cache for re-initialization`,
        );
        let analytics = mcpServerKeyHashEntry(config, serverName);
        let loggable = isMcpServerLoggableInAnalytics(serverName, config);
        let mcpToolName = loggableMcpToolName(
          CLAUDEAI_SERVER_PREFIX(serverName),
          CLAUDEAI_SERVER_PREFIX(tool),
          loggable,
        );
        logEvent("tengu_mcp_session_expired", {
          errorCode: errorCode !== undefined ? fromNumber(errorCode) : undefined,
          transportType: fromEnum(config.type ?? "stdio"),
          ...analytics,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(CLAUDEAI_SERVER_PREFIX(serverName), loggable),
          mcpToolName,
        });
        await clearServerCache(serverName, config);
        let callerRanNothing = didCallRunNothing(
          transportErrorState?.toolCallSends,
          started,
          watchdog.ownSends,
        );
        throw new McpSessionExpiredError(
          serverName,
          sessionExpired
            ? "session_expired_404"
            : isMalformedAfterAuthChallenge(transportErrorState?.closeReason) ||
                (transportErrorState?.closeReason === "session expired" && callerRanNothing)
              ? "connection_closed_call_refused"
              : ranNothing || (!isAuthRetry && callerRanNothing)
                ? "connection_closed_call_not_run"
                : "connection_closed_http",
        );
      }
    }
    let original = error;
    if (
      (error instanceof SdkError && error.code === SdkErrorCode.InvalidResult) ||
      error instanceof ZodError ||
      ((original?.name === "ZodError" || original?.name === "$ZodError") && Array.isArray(original?.issues))
    )
      throw new McpResponseSchemaError(serverName, error);
    if (
      !(error instanceof Error && error.name === "AbortError") &&
      !(signal?.aborted === true && error instanceof SdkError)
    )
      throw error;
    return {
      content: INTERRUPTED_CALL_NOTICE,
      interrupted: true,
      isError: true,
    };
  } finally {
    if (progressTimer !== undefined) clearInterval(progressTimer);
    decrementCallsInProgress(transportErrorState);
  }
}
//@ chunk-sywnjtqb.js:204263-204359 placement
function getFirstToolUseId(message) {
  if (message.message.content[0]?.type !== "tool_use") return;
  return message.message.content[0].id;
}
//@ chunk-sywnjtqb.js:204359-205335 placement
/**
 * 校验 SDK 宿主提供的 MCP 清单：initializeResult 不合法或协议版本不支持时放弃清单改走控制通道握手；tools/list 结果不合法同样放弃；分页的 tools/list 只回放 initialize。
 */
function validateHostManifest(serverName, manifest) {
  if (manifest === undefined) return;
  let parseResult = InitializeResultSchema.safeParse(manifest.initializeResult);
  if (
    !parseResult.success ||
    !SUPPORTED_PROTOCOL_VERSIONS_2.includes(parseResult.data.protocolVersion) ||
    !isJsonRpcResult(manifest.initializeResult)
  ) {
    logMCPDebug(
      serverName,
      "Host manifest initializeResult is not a valid InitializeResult for this client \u2014 handshaking over the control channel instead",
    );
    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_invalid_initialize");
    return;
  }
  if (
    manifest.toolsListResult !== undefined &&
    (!ListToolsResultSchema.safeParse(manifest.toolsListResult).success ||
      !isJsonRpcResult(manifest.toolsListResult))
  ) {
    logMCPDebug(
      serverName,
      "Host manifest toolsListResult is not a valid ListToolsResult \u2014 handshaking over the control channel instead",
    );
    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_invalid_tools_list");
    return;
  }
  if (manifest.toolsListResult !== undefined && manifest.toolsListResult.nextCursor !== undefined) {
    logMCPDebug(
      serverName,
      "Host manifest toolsListResult is paginated (nextCursor) \u2014 replaying initialize only and listing tools over the control channel",
    );
    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_paginated_tools_list");
    return {
      initializeResult: manifest.initializeResult,
    };
  }
  return manifest;
}
//@ chunk-sywnjtqb.js:205335-205410 placement
/**
 * 校验对象是否是合法的 JSON-RPC 结果。
 */
function isJsonRpcResult(result) {
  return JSONRPCMessageSchema_2.safeParse({
    jsonrpc: "2.0",
    id: 0,
    result,
  }).success;
}
//@ chunk-sywnjtqb.js:205410-205747 placement
/**
 * 记录 SDK 宿主 MCP 清单的结果：重放成功或失败，以及协议版本不符、声明了客户端能力、结果格式不对等情况。
 */
function logManifestOutcome(manifestOutcome, ok) {
  switch (manifestOutcome) {
    case "none":
    case "pending":
      return;
    case "replayed":
      if (ok) logFeatureOk("mcp_sdk_manifest");
      else logFeatureBad("mcp_sdk_manifest", "mcp_sdk_manifest_replay_failed");
      return;
    case "protocol_version_mismatch":
    case "client_capabilities_declared":
    case "malformed_result":
    case "unexpected_message":
      logFeatureSad("mcp_sdk_manifest", `mcp_sdk_manifest_${manifestOutcome}`);
      return;
  }
}
//@ chunk-sywnjtqb.js:205747-207814 placement
/**
 * 连接 SDK 宿主注册的进程内 MCP 服务器：每个建控制通道传输与客户端（sdk-control 协商），带连接超时；成功则拉取工具，失败标记 failed；有资源能力时补上资源列表/读取工具。
 */
async function setupSdkMcpClients(servers, sendControlRequest, manifests, toolContext) {
  let clients = [];
  let tools = [];
  let commands = [];
  primeEnsureConnected();
  let settled = await Promise.allSettled(
    Object.entries(servers).map(async ([key, value]) => {
      let transport = new SdkControlClientTransport(
        key,
        sendControlRequest,
        validateHostManifest(key, manifests?.get(key)),
      );
      guardTransportSend(
        {
          name: key,
        },
        transport,
      );
      let client = new Client_2(
        {
          ...CLAUDE_CODE_SERVER_INFO,
          version:
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION ?? "unknown",
        },
        {
          capabilities: EMPTY_CAPABILITIES,
          jsonSchemaValidator: isDisklessContext()
            ? NO_OP_SCHEMA_VALIDATOR
            : new LegacyDialectToleratingValidator(),
          versionNegotiation: resolveVersionNegotiation("sdk-control"),
        },
      );
      let timedOut = false;
      try {
        let connectPromise = client.connect(transport, {
          timeout: getConnectionTimeoutMs(),
        });
        if (
          !(await withDeadline(
            connectPromise.then(() => true),
            getConnectionTimeoutMs(),
          ))
        ) {
          connectPromise.catch(() => {});
          transport.close().catch(() => {});
          timedOut = true;
          throw makeConnectTimeoutError_2(
            `SDK MCP server "${key}" connection timed out after ${getConnectionTimeoutMs()}ms`,
          );
        }
        let serverCapabilities = client.getServerCapabilities();
        let instructions = client.getInstructions();
        let instructions_2 = truncateServerInstructions(instructions, key);
        let connection = {
          type: "connected",
          serverInfo: client.getServerVersion(),
          name: key,
          capabilities: serverCapabilities || {},
          instructions: instructions_2,
          negotiatedProtocolVersion: client.getNegotiatedProtocolVersion(),
          protocolEra: client.getProtocolEra(),
          client: clientServerId(client),
          config: {
            ...value,
            scope: "dynamic",
          },
          cleanup: async () => {
            await client.close();
          },
        };
        let cacheKey = serverCacheKey(connection.name, connection.config);
        getConnectionCache().toolLists.delete(cacheKey);
        let tools = [];
        if (serverCapabilities?.tools) {
          let toolsForClient = await fetchToolsForClient(connection, toolContext);
          tools.push(...toolsForClient);
        }
        let commands = [];
        logFeatureOk("mcp_sdk_connect");
        logManifestOutcome(transport.manifestOutcome, true);
        return {
          client: connection,
          tools,
          commands,
        };
      } catch (error) {
        logFeatureBad("mcp_sdk_connect", timedOut ? "mcp_sdk_connect_timeout" : "mcp_sdk_connect_failed");
        logManifestOutcome(transport.manifestOutcome, false);
        logMCPError(key, `Failed to connect SDK MCP server: ${error}`);
        return {
          client: {
            type: "failed",
            name: key,
            config: {
              ...value,
              scope: "user",
            },
          },
          tools: [],
          commands: [],
        };
      }
    }),
  );
  for (let outcome of settled)
    if (outcome.status === "fulfilled") {
      clients.push(outcome.value.client);
      tools.push(...outcome.value.tools);
      commands.push(...outcome.value.commands);
    }
  if (clients.some((client) => client.type === "connected" && !!client.capabilities?.resources)) {
    if (
      ![ListMcpResourcesTool, ReadMcpResourceTool].some((resourceTool) =>
        tools.some((tool) => matchesToolName(tool, resourceTool.name)),
      )
    )
      tools.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
  }
  return {
    clients,
    tools,
    commands,
  };
}
//@ chunk-sywnjtqb.js:207814-208003 placement
/**
 * clearServerCache：断开并清除某服务器的连接与所有记忆化列表缓存。
 */
async function closeAllClients(clients) {
  await Promise.all(
    clients.map(async (client) => {
      if (client.type !== "connected") return;
      try {
        await client.cleanup();
      } catch (error) {
        logForDebugging(`MCP client cleanup failed for ${client.name}: ${error}`, {
          level: "error",
        });
      }
    }),
  );
}
//@ chunk-h44h5gdv.js:42981-43281 callgraph-fingerprint (2.1.88 match: isMcpSessionExpiredError, 0.544)
/**
 * isMcpSessionExpiredError：HTTP 404 + JSON-RPC -32001 一类"会话不存在"错误判定，触发重新建立会话。
 */
function isMcpSessionExpiredError_2(error) {
  if (error instanceof McpSessionExpiredError) return true;
  if (error instanceof McpError) return false;
  let httpStatus = "code" in error ? error.code : undefined;
  if (httpStatus === 404)
    return !(error instanceof StreamableHTTPError && error.message.includes("Failed to open SSE stream"));
  return (
    httpStatus === 400 &&
    /Server not initialized|No valid session ID|Mcp-Session-Id header is required/i.test(error.message)
  );
}
//@ chunk-h44h5gdv.js:43281-43359 layout
/**
 * 截断服务器 instructions（超过上限按描述截断规则处理，标注 `Server instructions`）；空值原样返回。（v1）
 */
function truncateServerInstructions_2(instructions, serverName, maxLength = maxDescriptionLength()) {
  if (!instructions) return instructions;
  return truncateDescription(instructions, "Server instructions", serverName, maxLength);
}
//@ chunk-h44h5gdv.js:43359-43512 layout
function truncateDescription(description, label, serverName, maxLength = maxDescriptionLength()) {
  if (description.length <= maxLength) return description;
  if (serverName !== undefined)
    logMCPDebug(serverName, `${label} truncated from ${description.length} to ${maxLength} chars`);
  return truncateToLength(description, maxLength) + "\u2026 [truncated]";
}
//@ chunk-h44h5gdv.js:43512-43690 layout
/**
 * 匹配 HTTP 状态错误的正则（旧客户端副本）。
 */
var TRANSIENT_NETWORK_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TRANSIENT_ERROR_CODES_V1;
var POST_HTTP_STATUS_RE_V1;
deferInit("chunk-h44h5gdv.js:43512", () => {
  TRANSIENT_NETWORK_ERROR_CODES = ["ECONNRESET", "ETIMEDOUT", "EPIPE", "EHOSTUNREACH", "ECONNREFUSED"];
  TRANSIENT_ERROR_CODES_V1 = new Set([
    ...TRANSIENT_NETWORK_ERROR_CODES,
    "ConnectionRefused",
    "ConnectionClosed",
  ]);
  POST_HTTP_STATUS_RE_V1 = /^Error POSTing to endpoint \(HTTP (\d+)\)/;
});
//@ chunk-h44h5gdv.js:43690-43748 layout
/**
 * 判断数值是否为合法 HTTP 状态码（旧副本）。
 */
function isValidHttpStatusV1(status) {
  return typeof status === "number" && status >= 100 && status <= 599;
}
//@ chunk-h44h5gdv.js:43748-44202 layout
/**
 * isTransientMcpError：AbortError、瞬时网络错误码或 5xx 视为可重试。
 */
function isTransientMcpError_2(msg) {
  if (msg.name === "AbortError") return true;
  let code = "code" in msg ? msg.code : undefined;
  let status = "status" in msg ? msg.status : undefined;
  let statusFromMessage = POST_HTTP_STATUS_RE_V1.exec(msg.message)?.[1];
  if (
    isValidHttpStatusV1(status) ||
    isValidHttpStatusV1(code) ||
    (typeof code === "number" && code < 0) ||
    (statusFromMessage !== undefined && isValidHttpStatusV1(Number(statusFromMessage)))
  )
    return false;
  if (typeof code === "string" && TRANSIENT_ERROR_CODES_V1.has(code)) return true;
  let message = msg.message;
  return (
    TRANSIENT_NETWORK_ERROR_CODES.some((fragment) => message.includes(fragment)) ||
    message.includes("Body Timeout Error") ||
    /\bterminated\b/.test(message) ||
    message.includes("SSE stream disconnected") ||
    message.includes("Failed to reconnect SSE stream")
  );
}
//@ chunk-h44h5gdv.js:44202-44237 layout
/**
 * 分页退避序列（旧副本）。
 */
var DEFAULT_TOOL_TIMEOUT_MS_V1 = 1e8;
var MAX_LIST_PAGES_V1 = 20;
var LIST_PAGE_DELAYS_MS_V1 = [250, 500, 1000];
//@ chunk-h44h5gdv.js:44237-44640 layout
/**
 * 判断旧客户端的列表错误是否可重试。
 */
function isRetryableListErrorV1(error) {
  if (isListAuthError(error)) return false;
  if (isClaudeAiBearerRejectedError(error)) return false;
  if (error instanceof DOMException && error.name === "TimeoutError") return false;
  if (error instanceof HttpBodyOverflowError) return false;
  if (
    error instanceof Error &&
    !(error instanceof McpError) &&
    "code" in error &&
    typeof error.code === "number" &&
    error.code >= 400 &&
    error.code < 500
  )
    return false;
  if (error instanceof McpError)
    return (
      error.code !== ErrorCode.RequestTimeout &&
      error.code !== ErrorCode.MethodNotFound &&
      error.code !== ErrorCode.InvalidRequest &&
      error.code !== ErrorCode.InvalidParams
    );
  return true;
}
//@ chunk-h44h5gdv.js:44640-45350 layout
async function listAllPages(connection, name, config, method, requestOptions, extractItems) {
  let hasLoggedError = false;
  for (let j = 0; ; j++) {
    let items = [];
    let seenCursors = new Set();
    let cursor;
    let pageCount = 0;
    let stopReason;
    try {
      do {
        let page = await connection.request(
          {
            method,
            ...(cursor && {
              params: {
                cursor,
              },
            }),
          },
          requestOptions,
          {
            timeout: getConnectionTimeoutMs(),
          },
        );
        pageCount++;
        let pageItems = extractItems(page);
        if (pageItems) items.push(...pageItems);
        if (cursor) seenCursors.add(cursor);
        cursor = page.nextCursor;
        if (cursor && seenCursors.has(cursor)) {
          stopReason = "repeated_cursor";
          break;
        }
        if (cursor && pageCount >= MAX_LIST_PAGES_V1) {
          stopReason = "capped";
          break;
        }
      } while (cursor);
      if (stopReason === "repeated_cursor")
        logMCPDebug(
          name,
          `${method} returned a nextCursor already sent in this walk (page ${pageCount}); stopping`,
        );
      if (stopReason === "capped")
        logMCPDebug(name, `${method} still returning nextCursor after ${MAX_LIST_PAGES_V1} pages; stopping`);
      if (pageCount > 1) logListPagination(method, pageCount, items.length, stopReason ?? "complete");
      return items;
    } catch (error) {
      if (pageCount > 0 && !hasLoggedError) {
        hasLoggedError = true;
        logListPagination(method, pageCount, items.length, "error");
      }
      let retryDelayMs = LIST_PAGE_DELAYS_MS_V1[j];
      if (retryDelayMs === undefined || !isRetryableListErrorV1(error)) throw error;
      logMCPDebug(
        name,
        `${method} failed (${describeConnectError(error, config)}); retrying in ${retryDelayMs}ms`,
      );
      await sleep(retryDelayMs);
    }
  }
}
//@ chunk-h44h5gdv.js:45350-45452 layout
function logListPagination(method, pageCount, itemCount, outcome) {
  logEvent("tengu_mcp_list_paginated", {
    method: fromEnum(method),
    pageCount,
    itemCount,
    outcome: fromEnum(outcome),
  });
}
//@ chunk-h44h5gdv.js:45452-45590 fingerprint (2.1.88 match: getMcpToolTimeoutMs, 1)
/**
 * MCP 工具调用总超时（v1 副本）：配置 timeout ≥1000 优先，其次 MCP_TOOL_TIMEOUT，再默认值，夹在 1000ms 与上限之间。
 */
function getMcpToolTimeoutMs(config) {
  let timeoutMs =
    (config?.timeout !== undefined && config.timeout >= 1000 ? config.timeout : undefined) ??
    env.MCP_TOOL_TIMEOUT ??
    DEFAULT_TOOL_TIMEOUT_MS_V1;
  return Math.min(Math.max(timeoutMs, 1000), MAX_TIMER_DELAY_MS);
}
//@ chunk-h44h5gdv.js:45590-45654 layout
var REMOTE_TOOL_IDLE_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STDIO_TOOL_IDLE_TIMEOUT_MS;
var NO_IDLE_TIMEOUT_TRANSPORTS;
deferInit("chunk-h44h5gdv.js:45590", () => {
  REMOTE_TOOL_IDLE_TIMEOUT_MS = 300000;
  STDIO_TOOL_IDLE_TIMEOUT_MS = 1800000;
  NO_IDLE_TIMEOUT_TRANSPORTS = new Set(["sse-ide", "ws-ide", "sdk"]);
});
//@ chunk-h44h5gdv.js:45654-45891 layout
/**
 * getMcpToolIdleTimeoutMs（v1 副本）。
 */
function getMcpToolIdleTimeoutMs(config) {
  let transportType = config?.type ?? "stdio";
  if (NO_IDLE_TIMEOUT_TRANSPORTS.has(transportType)) return 0;
  let idleTimeoutMs =
    env.CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT ??
    (transportType === "stdio" ? STDIO_TOOL_IDLE_TIMEOUT_MS : REMOTE_TOOL_IDLE_TIMEOUT_MS);
  if (idleTimeoutMs <= 0) return 0;
  let timeout = config?.timeout !== undefined && config.timeout >= 1000 ? config.timeout : 0;
  return Math.min(Math.max(idleTimeoutMs, timeout, 1000), getMcpToolTimeoutMs(config));
}
//@ chunk-h44h5gdv.js:45891-45933 layout
/**
 * 懒加载 needs-auth 缓存模块（旧副本）。
 */
var needsAuthCacheModuleV1 = () => require("../../utils/claudeInChrome/toolRendering.js");
//@ chunk-h44h5gdv.js:45933-46099 layout
/**
 * needs-auth 缓存常量与懒加载模块（v1 副本）：TTL 15 分钟 / 4 小时 / 90 秒、时钟偏差 1 分钟。
 */
var artifactPermissionRulesModuleV1 = () => require("../../tools/ArtifactTool/artifactPermissionRules.js");
var artifactsMcpLaptopModuleV1 = () => require("../artifacts/artifactsMcpLaptop.js");
var claudeDocsWakeModuleV1 = () => require("../../tools/ArtifactTool/docsCreateWake.js");
var AUTH_CACHE_VERSION = "v1";
var NEEDS_AUTH_CACHE_TTL_MS = 900000;
var NEEDS_AUTH_CACHE_LONG_TTL_MS = 14400000;
var NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS = 90000;
var AUTH_CACHE_CLOCK_SKEW_MS = 60000;
//@ chunk-h44h5gdv.js:46099-46699 layout
/**
 * isMcpAuthCached（v1 副本）。
 */
async function isMcpAuthCached(serverName, config, storage) {
  let cacheEntry = (await readNeedsAuthCache(storage))[serverName];
  if (!cacheEntry) return false;
  if (config.type === "claudeai-proxy" && cacheEntry.id !== config.id) return false;
  if ((config.type === "stdio" || config.type === undefined) && config.pluginSource === undefined)
    return false;
  if (
    (config.type === "stdio" || config.type === undefined) &&
    config.pluginSource !== undefined &&
    cacheEntry.id !== configHash(config)
  )
    return false;
  if (
    (config.type === "http" || config.type === "sse") &&
    config.pluginSource !== undefined &&
    cacheEntry.id !== undefined
  )
    return false;
  let usesLongTtl =
    config.type === "claudeai-proxy" ||
    (config.pluginSource !== undefined &&
      (config.type === "http" || config.type === "sse") &&
      !usesNonOAuthAuth(config));
  let ttlMs = cacheEntry.ttlMs ?? (usesLongTtl ? NEEDS_AUTH_CACHE_LONG_TTL_MS : NEEDS_AUTH_CACHE_TTL_MS);
  let ageMs = Date.now() - cacheEntry.timestamp;
  let isFresh = ageMs > -AUTH_CACHE_CLOCK_SKEW_MS && ageMs < ttlMs;
  let lapsedCcrSignInKey = isFresh && isCcrHostedConfig(config) ? cacheEntry.lapsedCcrSignInKey : undefined;
  getConnectionCache().restoreLapsed(lapsedCcrSignInKey, serverCacheKey(serverName, config));
  return isFresh;
}
//@ chunk-h44h5gdv.js:46699-46873 layout
async function writeAuthCacheV5(storage, cache) {
  let writeResult = await storage.write(needsAuthCacheSpace(), jsonStringify(cache), {
    publishDiscipline: "inPlace",
  });
  if (!writeResult.ok)
    logMCPDebug("auth-cache", `needs-auth cache v5 write failed: ${formatStorageError(writeResult.error)}`);
  return writeResult.ok;
}
//@ chunk-h44h5gdv.js:46873-47214 callgraph-witnessed (2.1.88 match: setMcpAuthCacheEntry, 0.215)
function setMcpAuthCacheEntry(serverId, id, state, storage, storageArg) {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.authCacheWriteChain = cliOwnedState.authCacheWriteChain
    .then(async () => {
      let cache = await readNeedsAuthCache(storage);
      cache[serverId] = {
        timestamp: Date.now(),
        ...(id && {
          id,
        }),
        ...(state !== undefined && {
          ttlMs: state,
        }),
        ...(storageArg && {
          lapsedCcrSignInKey: storageArg,
        }),
      };
      if (isStorageV5Enabled() && storage !== undefined) {
        if (!(await writeAuthCacheV5(storage, cache))) return;
      } else {
        let fileReader = getFileReader();
        let cachePath = needsAuthCachePath();
        await fileReader.mkdir(dirname(cachePath));
        await fileReader.write(cachePath, jsonStringify(cache));
      }
      clearAuthCacheRead();
    })
    .catch(() => {});
}
//@ chunk-h44h5gdv.js:47214-47466 placement
/**
 * clearMcpAuthCacheEntry（v1 副本）。
 */
function clearMcpAuthCacheEntry(serverName, storage) {
  let cliOwnedState = getCliOwnedState();
  let writePromise = cliOwnedState.authCacheWriteChain
    .then(async () => {
      let cache = await readNeedsAuthCache(storage);
      if (!(serverName in cache)) return;
      delete cache[serverName];
      if (isStorageV5Enabled() && storage !== undefined) {
        if (!(await writeAuthCacheV5(storage, cache))) return;
      } else await getFileReader().write(needsAuthCachePath(), jsonStringify(cache));
      clearAuthCacheRead();
    })
    .catch(() => {});
  cliOwnedState.authCacheWriteChain = writePromise;
  return writePromise;
}
//@ chunk-h44h5gdv.js:47466-47709 placement
/**
 * clearMcpDiscoveryCaches（v1 副本）。
 */
function clearMcpDiscoveryCaches(preservedKeys = new Set(), notifyIdentityChange = true) {
  if (!isDiscoveryCacheOn()) return;
  if (notifyIdentityChange) noteIdentityChanged();
  bumpIdentityEpoch();
  let retainKeys = (cache) => {
    if (cache) retainCacheKeys(cache, preservedKeys);
  };
  if (!getCliOwnedState().holdStaleReauthEntryForTest) getConnectionCache().reauthInFlight.clear();
  getConnectionCache().lapsedCcrSignIns.clear();
  retainKeys(connectToServer_2.cache);
  retainKeys(listMcpTools.cache);
  retainKeys(fetchCommandsForClient_2.cache);
  retainKeys(fetchResourcesForClient_2.cache);
  retainKeys(fetchResourceTemplatesForClient_2.cache);
}
//@ chunk-h44h5gdv.js:47709-47816 placement (2.1.88 match: mcpBaseUrlAnalytics, 0.65)
function mcpBaseUrlAnalytics(url, serverName) {
  let origin = loggingSafeOrigin(url);
  let serverFields = serverName
    ? {
        mcpServerKeyHash: toolNameForTelemetry(serverName),
      }
    : {};
  if (origin)
    return {
      mcpServerBaseUrl: origin,
      ...serverFields,
    };
  return serverFields;
}
//@ chunk-h44h5gdv.js:61207-61320 placement
function normalizeImageMimeType(mimeType) {
  if (!mimeType) return false;
  let lower = firstLineOf(mimeType, ";").trim().toLowerCase();
  return SUPPORTED_IMAGE_TYPES_2.has(lower === "image/jpg" ? "image/jpeg" : lower);
}
//@ chunk-h44h5gdv.js:61320-61333 placement
/**
 * 工具调用超时下限（旧副本）。
 */
var MIN_TOOL_TIMEOUT_MS_V1 = 60000;
//@ chunk-h44h5gdv.js:61333-61479 placement (2.1.88 match: getMcpToolTimeoutMs, 1)
function getMcpToolTimeoutMs_2(config) {
  let timeoutMs =
    (config?.timeout !== undefined && config.timeout >= 1000 ? config.timeout : undefined) ??
    env.MCP_TOOL_TIMEOUT;
  return timeoutMs !== undefined
    ? Math.min(Math.max(timeoutMs, MIN_TOOL_TIMEOUT_MS_V1), MAX_TIMER_DELAY_MS)
    : MIN_TOOL_TIMEOUT_MS_V1;
}
//@ chunk-h44h5gdv.js:61479-61522 placement
function getMcpRequestTimeoutMs(config) {
  return Math.max(getMcpToolTimeoutMs_2(config), getConnectionTimeoutMs());
}
//@ chunk-h44h5gdv.js:61522-61567 placement (2.1.88 match: MCP_STREAMABLE_HTTP_ACCEPT, 1)
var MCP_STREAMABLE_HTTP_ACCEPT = "application/json, text/event-stream";
//@ chunk-h44h5gdv.js:61567-61645 placement
/**
 * 包装 fetch：出错时抛脱敏错误。
 */
function wrapFetchRethrowRedacted(fetchWithDefaults) {
  return async (url, init) => {
    try {
      return await fetchWithDefaults(url, init);
    } catch (error) {
      rethrowRedactedFetchError(error, url);
    }
  };
}
//@ chunk-h44h5gdv.js:61645-62203 placement (2.1.88 match: wrapFetchWithTimeout, 0.761)
/**
 * wrapFetchWithTimeout（v1 副本）。
 */
function wrapFetchWithTimeout(baseFetch, config) {
  let mcpRequestTimeoutMs = getMcpRequestTimeoutMs(config);
  return async (url, init) => {
    if ((init?.method ?? "GET").toUpperCase() === "GET") return baseFetch(url, init);
    let headers = new Headers(init?.headers);
    if (!headers.has("accept")) headers.set("accept", MCP_STREAMABLE_HTTP_ACCEPT);
    if (shouldPropagateTraceContext()) {
      let activeSpanId = getActiveSpanId();
      if (activeSpanId && !headers.has("traceparent")) headers.set("traceparent", activeSpanId);
    }
    let controller = new AbortController();
    let timer = setTimeout(
      (controller) => controller.abort(new DOMException("The operation timed out.", "TimeoutError")),
      requestTimeoutForBody(mcpRequestTimeoutMs, init?.body),
      controller,
    );
    timer.unref?.();
    let signal = init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal;
    try {
      return await baseFetch(url, {
        ...init,
        headers,
        signal,
        ...(getMcpToolTimeoutMs_2(config) > 300000 && {
          timeout: false,
        }),
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
//@ chunk-h44h5gdv.js:62203-62262 placement (2.1.88 match: getMcpServerConnectionBatchSize, 1)
function getMcpServerConnectionBatchSize() {
  return env.MCP_SERVER_CONNECTION_BATCH_SIZE ?? 3;
}
//@ chunk-h44h5gdv.js:62262-62329 placement (2.1.88 match: getRemoteMcpServerConnectionBatchSize, 1)
function getRemoteMcpServerConnectionBatchSize() {
  return env.MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE ?? 20;
}
//@ chunk-h44h5gdv.js:62329-62392 placement (2.1.88 match: isLocalMcpServer, 1)
function isLocalMcpServer(config) {
  return !config.type || config.type === "stdio" || config.type === "sdk";
}
//@ chunk-h44h5gdv.js:62392-62452 placement (2.1.88 match: ALLOWED_IDE_TOOLS, 1)
var ALLOWED_IDE_TOOLS = ["mcp__ide__executeCode", "mcp__ide__getDiagnostics"];
//@ chunk-h44h5gdv.js:62452-62517 placement (2.1.88 match: isIncludedMcpTool, 1)
function isIncludedMcpTool_2(tool) {
  return !tool.startsWith("mcp__ide__") || ALLOWED_IDE_TOOLS.includes(tool);
}
//@ chunk-h44h5gdv.js:62517-62550 placement
function isIdeServer(serverRef) {
  return isIncludedMcpTool_2(serverRef.name);
}
//@ chunk-h44h5gdv.js:62550-62885 placement (2.1.88 match: getServerUrl, 0.793)
function isServerHostInGateList(gateFeature, serverRef) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(gateFeature, []);
  if (!Array.isArray(featureValue_CACHED_MAY_BE_STALE) || featureValue_CACHED_MAY_BE_STALE.length === 0)
    return false;
  if (featureValue_CACHED_MAY_BE_STALE.includes("*")) return true;
  if (!("url" in serverRef) || typeof serverRef.url !== "string") return false;
  try {
    let lower = new URL(serverRef.url).hostname.toLowerCase();
    return featureValue_CACHED_MAY_BE_STALE.some((gateHost) => {
      if (typeof gateHost !== "string" || gateHost === "") return false;
      let lower_2 = gateHost.toLowerCase();
      return lower === lower_2 || lower.endsWith(`.${lower_2}`);
    });
  } catch {
    return false;
  }
}
//@ chunk-h44h5gdv.js:62885-62952 placement
function shouldNormalizeRootCombinators(serverRef) {
  return isServerHostInGateList("tengu_mcp_normalize_root_combinators", serverRef);
}
//@ chunk-h44h5gdv.js:62952-63018 placement
function shouldDropInvalidToolSchemas(serverRef) {
  return isServerHostInGateList("tengu_mcp_drop_invalid_tool_schemas", serverRef);
}
//@ chunk-h44h5gdv.js:63018-63132 placement
/**
 * 测试专用：设置是否保留过期的重新认证条目（v1 副本）。
 */
function setHoldStaleReauthEntryForTest(enabled) {
  if (enabled) throw Error("setHoldStaleReauthEntryForTest is test-only");
  getCliOwnedState().holdStaleReauthEntryForTest = enabled;
}
//@ chunk-h44h5gdv.js:63132-63180 placement
/**
 * 测试用：设置重新认证决策接收器（旧副本）。
 */
function setReauthDecisionSinkForTestV1(reauthDecisionSinkForTest) {
  getCliOwnedState().reauthDecisionSinkForTest = reauthDecisionSinkForTest;
}
//@ chunk-h44h5gdv.js:63180-63490 placement
/**
 * getMcpRoots：roots/list 响应：项目根（或会话目录）、额外工作目录与可选 staging 根，转成去重的 file:// URI。
 */
function getMcpRoots(includeStagingRoot = false) {
  let extraRoots = [];
  if (includeStagingRoot)
    try {
      extraRoots = [pluginToolStagingRoot()];
    } catch (error) {
      logForDebugging(`MCP: staging root unavailable, omitted from roots/list: ${errorMessage(error)}`);
    }
  let seenUris = new Set();
  let roots = [];
  let toolsMachine = getToolsMachine();
  let workingDirectory = toolsMachine ? (toolsMachine.directory?.path ?? null) : getOriginalCwdOrNull();
  for (let directoryPath of [
    ...(workingDirectory === null ? [] : [workingDirectory]),
    ...getAnnouncedDirectories(),
    ...extraRoots,
  ]) {
    let href = pathToFileURL(directoryPath).href;
    if (seenUris.has(href)) continue;
    seenUris.add(href);
    roots.push({
      uri: href,
    });
  }
  return {
    roots,
  };
}
//@ chunk-h44h5gdv.js:63490-63520 placement
var ROOTLESS_PLUGIN_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h44h5gdv.js:63490", () => {
  ROOTLESS_PLUGIN_NAMES = new Set(["documents"]);
});
//@ chunk-h44h5gdv.js:63520-63664 placement
function isDocumentsPluginServer(serverRef) {
  if (getPlatform() === "windows") return false;
  if (!serverRef.pluginSource) return false;
  try {
    return ROOTLESS_PLUGIN_NAMES.has(parsePluginIdentifier(serverRef.pluginSource).name.toLowerCase());
  } catch {
    return false;
  }
}
//@ chunk-h44h5gdv.js:63664-63801 placement
function notifyRootsListChanged() {
  for (let liveClient of getConnectionCache().liveClients)
    liveClient.sendRootsListChanged().catch((error) => {
      logForDebugging(`MCP: failed to send roots/list_changed: ${describeErrorBrief(error)}`);
    });
}
//@ chunk-h44h5gdv.js:63801-64310 placement
var CONNECTION_ERROR_HINTS = [
  ["ECONNRESET", "Connection reset - server may have crashed or restarted"],
  ["ETIMEDOUT", "Connection timeout - network issue or server unresponsive"],
  ["ECONNREFUSED", "Connection refused - server may be down"],
  ["EPIPE", "Broken pipe - server closed connection unexpectedly"],
  ["EHOSTUNREACH", "Host unreachable - network connectivity issue"],
  ["ESRCH", "Process not found - stdio server process terminated"],
  ["spawn", "Failed to spawn process - check command and permissions"],
];
var POST_ERROR_PREFIX = "Error POSTing to endpoint: ";
//@ chunk-h44h5gdv.js:64310-64516 placement
function isNonJsonRpc4xxPostError(error) {
  if (!(error instanceof StreamableHTTPError)) return false;
  let code = error.code ?? 0;
  if (!(code >= 400 && code < 500) || code === 401 || code === 403 || code === 429) return false;
  let index = error.message.indexOf(POST_ERROR_PREFIX);
  if (index === -1) return true;
  return !isJsonRpcErrorBody(error.message.slice(index + POST_ERROR_PREFIX.length));
}
//@ chunk-h44h5gdv.js:64516-64704 placement
function isJsonRpcErrorBody(body) {
  let found = body.split(/\r?\n/).find((line) => line.startsWith("data:"));
  let payload = safeParseJSON(found === undefined ? body : found.slice(5), false);
  return isJSONRPCErrorResponse(
    typeof payload === "object" && payload !== null && "id" in payload && payload.id === null
      ? {
          ...payload,
          id: undefined,
        }
      : payload,
  );
}
//@ chunk-h44h5gdv.js:64704-64716 placement
/**
 * 探测超时上限（5000 毫秒）。
 */
var PROBE_TIMEOUT_CAP_MS = 5000;
//@ chunk-h44h5gdv.js:64716-64872 placement
/**
 * makeConnectTimeoutError：连接超时错误，开关 tengu_mcp_connect_timeout_retry 打开时带 code CONNECT_TIMEOUT 以便重试。
 */
function makeConnectTimeoutError(message) {
  let error = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    message,
    "MCP connection timeout",
  );
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_timeout_retry", true))
    return Object.assign(error, {
      code: "CONNECT_TIMEOUT",
    });
  return error;
}
//@ chunk-h44h5gdv.js:64872-64976 layout (2.1.88 match: getServerCommandArray, 0.781)
function getServerCommandArray(serverId, config, storage) {
  if ((config.type === "stdio" || config.type === undefined) && config.pluginSource !== undefined)
    setMcpAuthCacheEntry(serverId, configHash(config), undefined, storage);
}
//@ chunk-h44h5gdv.js:64976-86955 fingerprint (2.1.88 match: connectToServer, 0.605)
/**
 * connectToServer（v1）：同 v2 的连接入口，但客户端为旧 SDK（只有 initialize 握手，server/discover 只在 stateless claude.ai 代理本地应答中出现）。
 */
var connectToServer_2; // deferred: uses memoizeWithExternalCache (./needsAuthCache.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h44h5gdv.js:64976", () => {
  connectToServer_2 = memoizeWithExternalCache(
    async (name, serverRef, serverStats, storageV5, credentials, dialOptions, connectOptions) => {
      primeEnsureConnectedClient();
      let connectStartTime = Date.now();
      let clockSnapshot = startClockSnapshot(connectOptions?.clock ?? systemClock);
      let activeClockSnapshot;
      let roundEpoch = identityEpoch();
      let announcedDirectories = getAnnouncedDirectories();
      let transport = serverRef.type ?? "stdio";
      logForDiagnosticsNoPII("info", "mcp_connect_starting", {
        transport,
      });
      if (isUnconfiguredUrl(serverRef)) {
        let configError = serverRef.configError ?? "No URL configured for this server";
        logMCPDebug(name, configError);
        logForDiagnosticsNoPII("info", "mcp_connect_skipped", {
          transport,
          reason: "unconfigured",
        });
        return {
          name,
          type: "failed",
          config: serverRef,
          error: configError,
          errorCode: "UNCONFIGURED",
        };
      }
      {
        let configError = serverRef.configError;
        if (!configError && "url" in serverRef)
          try {
            new URL(serverRef.url);
          } catch {
            configError = "'url' is not a valid URL. Update the server's config and reconnect.";
          }
        if (configError) {
          logEvent("tengu_mcp_server_config_invalid", {
            transportType: fromEnum(serverRef.type ?? "stdio"),
            field: lit("url"),
            source: lit(serverRef.configError ? "loader" : "connect"),
          });
          logMCPDebug(name, configError);
          logMCPError(name, configError);
          logForDiagnosticsNoPII("warn", "mcp_connect_failed", {
            transport,
            duration_ms: Date.now() - connectStartTime,
            reason: "invalid_config",
          });
          logFeatureBad("mcp_connect", "mcp_connect_invalid_config");
          return {
            name,
            type: "failed",
            config: serverRef,
            error: configError,
            errorCode: "INVALID_CONFIG",
          };
        }
      }
      let inProcessServer;
      let authProvider;
      let stdioPendingCgroup = false;
      let stdioCgroupCapped = false;
      let serverTransport;
      let legacySseTransportFactory;
      try {
        let armWatchdogs = function () {
          let armedAt = Date.now();
          for (let activeCallWatchdog of transportErrorState.activeCallWatchdogs)
            if (activeCallWatchdog.armedAt === 0) activeCallWatchdog.armedAt = armedAt;
        };
        let isCcrInjectedUrl = isCcrInjectedMcpUrl(name, serverRef);
        let hasCliBearer = hasCliOwnedBearer(serverRef);
        let configHasAuthHeader =
          (serverRef.type === "sse" || serverRef.type === "http") && configHasAuthorizationHeader(serverRef);
        let serverHeaders =
          serverRef.type === "sse" || serverRef.type === "http" || serverRef.type === "ws"
            ? await getMcpServerHeaders(name, serverRef)
            : {};
        let helperMintsAuthHeader =
          (serverRef.type === "sse" || serverRef.type === "http") &&
          !!serverRef.headersHelper &&
          hasAuthorizationHeader(serverHeaders);
        let useFirstPartyAuth =
          (serverRef.type === "sse" || serverRef.type === "http") &&
          !configHasAuthHeader &&
          !helperMintsAuthHeader &&
          !hasCliBearer &&
          !isCcrInjectedUrl &&
          isFirstPartyMcpUrl(serverRef.url) &&
          isFirstPartyProvider() &&
          (!!(
            isStorageV5Enabled() && credentials !== undefined
              ? await getClaudeAIOAuthTokensAsync(credentials)
              : getClaudeAIOAuthTokens()
          )?.accessToken ||
            (isDesignMcpUrl(serverRef.url) && (await checkConsent(credentials))));
        if (useFirstPartyAuth)
          logEvent("tengu_mcp_first_party_auto_auth", {
            transportType: fromEnum(serverRef.type),
            ...mcpBaseUrlAnalytics(serverRef, name),
          });
        let firstPartyBearerState = {};
        if (serverRef.type === "sse") {
          recordPresentedHeaderSecrets(serverRef.headers, serverHeaders);
          let authProvider_2 =
            configHasAuthHeader || helperMintsAuthHeader || useFirstPartyAuth || hasCliBearer
              ? undefined
              : new ClaudeAuthProvider(name, serverRef);
          authProvider = authProvider_2;
          let sseProxyOptions = await mcpProxyFetchOptions(serverRef.url);
          let fetchFn = boundedFetch(
            wrapFetchRethrowRedacted(createFetchWithDefaults(undefined, sseProxyOptions)),
          );
          if (authProvider_2) fetchFn = wrapFetchWithStepUpDetection(fetchFn, authProvider_2);
          fetchFn = wrapFetchWithTimeout(fetchFn, serverRef);
          if (useFirstPartyAuth)
            fetchFn = wrapFetchWithFirstPartyAuth_2(fetchFn, credentials, firstPartyBearerState);
          let transportOptions = {
            authProvider: authProvider_2,
            fetch: fetchFn,
            requestInit: {
              ...sseProxyOptions,
              headers: {
                "User-Agent": getMCPUserAgent(),
                "Accept-Encoding": "identity",
                ...serverHeaders,
              },
            },
          };
          let fetchFn_2 = wrapFetchRethrowRedacted(async (url, init) => {
            let authHeaders = {};
            let tokens = await authProvider_2?.tokens();
            if (tokens) authHeaders.Authorization = `Bearer ${tokens.access_token}`;
            let proxyOptions = await mcpProxyFetchOptions(String(url));
            return fetch(url, {
              ...init,
              ...proxyOptions,
              headers: mergeRequestHeaders_2(init?.headers, authHeaders, serverHeaders),
            });
          });
          transportOptions.eventSourceInit = {
            fetch: boundedFetch(
              authProvider_2
                ? wrapFetchWithStepUpDetection(fetchFn_2, authProvider_2)
                : useFirstPartyAuth
                  ? wrapFetchWithFirstPartyAuth_2(fetchFn_2, credentials, firstPartyBearerState)
                  : fetchFn_2,
            ),
          };
          serverTransport = new SSEClientTransport(new URL(serverRef.url), transportOptions);
          logMCPDebug(name, "SSE transport initialized, awaiting connection");
        } else if (serverRef.type === "sse-ide") {
          logMCPDebug(name, `Setting up SSE-IDE transport to ${redactUrlSecrets(serverRef.url)}`);
          let opts = {
            fetch: boundedFetch(globalThis.fetch),
            requestInit: {
              headers: {
                "User-Agent": getMCPUserAgent(),
                "Accept-Encoding": "identity",
              },
            },
          };
          serverTransport = new SSEClientTransport(new URL(serverRef.url), opts);
        } else if (serverRef.type === "ws-ide") {
          let tlsOptions = getWebSocketTLSOptions(serverRef.url);
          getPresentedCredentialLog().record(serverRef.authToken);
          let wsHeaders = {
            "User-Agent": getMCPUserAgent(),
            ...(serverRef.authToken && {
              "X-Claude-Code-Ide-Authorization": serverRef.authToken,
            }),
          };
          let webSocket = new globalThis.WebSocket(serverRef.url, {
            protocols: ["mcp"],
            headers: wsHeaders,
            proxy: getWebSocketProxyUrl(serverRef.url),
            tls: tlsOptions || undefined,
          });
          serverTransport = new WebSocketTransport(webSocket, (data) => JSONRPCMessageSchema.parse(data));
        } else if (serverRef.type === "ws") {
          recordPresentedHeaderSecrets(serverRef.headers, serverHeaders);
          logMCPDebug(name, `Initializing WebSocket transport to ${redactUrlSecrets(serverRef.url)}`);
          let webSocketTLSOptions = getWebSocketTLSOptions(serverRef.url);
          let sessionAuthToken = isCcrInjectedUrl ? getSessionIngressAuthToken() : null;
          getPresentedCredentialLog().record(sessionAuthToken ?? undefined);
          let wsHeaders = {
            "User-Agent": getMCPUserAgent(),
            ...(sessionAuthToken && {
              Authorization: `Bearer ${sessionAuthToken}`,
            }),
            ...serverHeaders,
          };
          let wsHeadersForLogging = redactHeaders(wsHeaders);
          logMCPDebug(
            name,
            `WebSocket transport options: ${jsonStringify({
              url: redactUrlSecrets(serverRef.url),
              headers: wsHeadersForLogging,
              hasSessionAuth: !!sessionAuthToken,
            })}`,
          );
          let webSocket = new globalThis.WebSocket(serverRef.url, {
            protocols: ["mcp"],
            headers: wsHeaders,
            proxy: getWebSocketProxyUrl(serverRef.url),
            tls: webSocketTLSOptions || undefined,
          });
          serverTransport = new WebSocketTransport(webSocket, (data) => JSONRPCMessageSchema.parse(data));
        } else if (serverRef.type === "http") {
          recordPresentedHeaderSecrets(serverRef.headers, serverHeaders);
          if (keepsMCPDebug()) {
            logMCPDebug(name, `Initializing HTTP transport to ${redactUrlSecrets(serverRef.url)}`);
            logMCPDebug(name, `Node version: ${process.version}, Platform: linux`);
            logMCPDebug(
              name,
              `Environment: ${jsonStringify({
                NODE_OPTIONS: env.NODE_OPTIONS || "not set",
                UV_THREADPOOL_SIZE: env.UV_THREADPOOL_SIZE || "default",
                HTTP_PROXY: redactUrlsInText(env.HTTP_PROXY || "not set"),
                HTTPS_PROXY: redactUrlsInText(env.HTTPS_PROXY || "not set"),
                NO_PROXY: env.NO_PROXY || "not set",
              })}`,
            );
          }
          let authProvider_2 =
            configHasAuthHeader ||
            helperMintsAuthHeader ||
            useFirstPartyAuth ||
            hasCliBearer ||
            isCcrInjectedUrl
              ? undefined
              : new ClaudeAuthProvider(name, serverRef);
          authProvider = authProvider_2;
          let httpProxyOptions = await mcpProxyFetchOptions(serverRef.url);
          let wsHeadersForLogging = boundedFetch(
            wrapFetchRethrowRedacted(
              createFetchWithDefaults(isCcrInjectedUrl ? hostedWorkerFetch : undefined, httpProxyOptions),
            ),
            {
              refusesCodings: issuerKey_3(serverRef.url),
            },
          );
          if (authProvider_2)
            wsHeadersForLogging = wrapFetchWithStepUpDetection(wsHeadersForLogging, authProvider_2);
          wsHeadersForLogging = wrapFetchWithTimeout(wsHeadersForLogging, serverRef);
          if (useFirstPartyAuth)
            wsHeadersForLogging = wrapFetchWithFirstPartyAuth_2(
              wsHeadersForLogging,
              credentials,
              firstPartyBearerState,
            );
          if (isCcrInjectedUrl)
            wsHeadersForLogging = wrapFetchSkipListenGet(
              wrapFetchWithCcrSessionAuth_2(
                wsHeadersForLogging,
                dialOptions,
                serverCacheKey(name, serverRef),
              ),
              name,
              serverRef.url,
            );
          wsHeadersForLogging = restrictRemoteRepoCalls(wsHeadersForLogging, serverRef);
          if (issuerKey_3(serverRef.url)) {
            let innerFetch = wsHeadersForLogging;
            wsHeadersForLogging = (value, key) => {
              let finishTiming = key?.method === "POST" ? getRequestTimingStore()?.mark("own") : undefined;
              return innerFetch(value, key).finally(finishTiming);
            };
          }
          if (hasCliBearer)
            wsHeadersForLogging = wrapFetchWithCliOwnedBearer_2(wsHeadersForLogging, serverRef);
          let transportOptions = {
            authProvider: authProvider_2,
            fetch: wsHeadersForLogging,
            requestInit: {
              ...httpProxyOptions,
              headers: {
                "User-Agent": getMCPUserAgent(),
                "Accept-Encoding": "identity",
                ...serverHeaders,
              },
            },
          };
          if (keepsMCPDebug()) {
            let headersForLogging = transportOptions.requestInit?.headers
              ? redactHeaders(transportOptions.requestInit.headers)
              : undefined;
            logMCPDebug(
              name,
              `HTTP transport options: ${jsonStringify({
                url: redactUrlSecrets(serverRef.url),
                headers: headersForLogging,
                hasAuthProvider: !!authProvider_2,
                timeoutMs: getMcpRequestTimeoutMs(serverRef),
              })}`,
            );
          }
          serverTransport = new StreamableHTTPClientTransport(new URL(serverRef.url), transportOptions);
          logMCPDebug(name, "HTTP transport created successfully");
          if (!isCcrHostedConfig(serverRef) && !isFirstPartyMcpUrl(serverRef.url) && !hasCliBearer)
            legacySseTransportFactory = ({ postMethodNotAllowed, dialSignal, dialConnected }) => {
              let withDialSignal = (init) =>
                dialConnected()
                  ? init
                  : {
                      ...init,
                      signal: init?.signal ? AbortSignal.any([init.signal, dialSignal]) : dialSignal,
                    };
              let sawNonOk = false;
              let eventSourceFetch = async (value, key) => {
                let response = await wsHeadersForLogging(value, withDialSignal(key));
                if (!postMethodNotAllowed && !sawNonOk) {
                  if (response.status === 401) {
                    await response.body?.cancel().catch(() => {});
                    throw Error(
                      "legacy HTTP+SSE stream GET answered 401 after the initialize POST was not a 405; not starting OAuth against this URL",
                    );
                  }
                  sawNonOk = response.ok;
                }
                return response;
              };
              let url = (init, initWithDial) =>
                initWithDial?.body instanceof URLSearchParams && initWithDial.body.has("grant_type")
                  ? wsHeadersForLogging(init, initWithDial)
                  : wsHeadersForLogging(init, withDialSignal(initWithDial));
              return new SSEClientTransport(new URL(serverRef.url), {
                authProvider: authProvider_2,
                fetch: url,
                eventSourceInit: {
                  fetch: eventSourceFetch,
                },
                requestInit: transportOptions.requestInit,
              });
            };
        } else if (serverRef.type === "sdk") throw Error("SDK servers should be handled in print.ts");
        else if (serverRef.type === "claudeai-proxy") {
          if (!isFirstPartyProvider())
            throw Error("claude.ai MCP proxy is not available on third-party providers");
          logMCPDebug(name, `Initializing claude.ai proxy transport for server ${serverRef.id}`);
          if (
            !(isStorageV5Enabled() && credentials !== undefined
              ? await getClaudeAIOAuthTokensAsync(credentials)
              : getClaudeAIOAuthTokens())
          )
            throw Error("No claude.ai OAuth token found");
          let oauthConfig = getOauthConfig();
          let proxyUrl = `${oauthConfig.MCP_PROXY_URL}${oauthConfig.MCP_PROXY_PATH.replace("{server_id}", serverRef.id)}`;
          logMCPDebug(name, `Using claude.ai proxy at ${proxyUrl}`);
          let fetchWithAuth = getProxyFetchOptions({
            url: proxyUrl,
          });
          let claudeAiProxyFetch = createClaudeAiProxyFetch(
            boundedFetch(createFetchWithDefaults(undefined, fetchWithAuth)),
            credentials,
          );
          let proxyOptions = isSereneTeapotEnabled();
          let answeredLocally = proxyOptions || isStatelessClaudeAiProxy(serverRef);
          if (answeredLocally)
            logMCPDebug(
              name,
              proxyOptions
                ? "GET notification stream disabled for claude.ai connectors; a GET the SDK sends to the proxy URL is answered locally with 405"
                : "GET notification stream disabled (stateless connector); if the SDK requests it, it gets a local 405",
            );
          let transportOptions = {
            fetch: answeredLocally
              ? answerGetStreamLocally(wrapFetchWithTimeout(claudeAiProxyFetch, serverRef), proxyUrl)
              : wrapFetchWithTimeout(claudeAiProxyFetch, serverRef),
            requestInit: {
              ...fetchWithAuth,
              headers: {
                "User-Agent": getMCPUserAgent(),
                "Accept-Encoding": "identity",
                "X-Mcp-Client-Session-Id": getSessionId(),
              },
            },
          };
          serverTransport = new StreamableHTTPClientTransport(new URL(proxyUrl), transportOptions);
          logMCPDebug(name, "claude.ai proxy transport created successfully");
        } else if (isStdioConfig(serverRef) && isClaudeInChromeMCPServer(name)) {
          let { isClaudeInChromeAllowed } = await import("../../utils/claudeInChrome/setup.js");
          if (!isClaudeInChromeAllowed()) {
            logMCPDebug(name, "Skipping connection (Claude in Chrome is blocked by org policy)");
            return {
              name,
              type: "failed",
              config: serverRef,
              error: BLOCKED_BY_POLICY_REASON,
              errorCode: "POLICY_BLOCKED",
            };
          }
          let { createChromeContext } = await import("../../utils/claudeInChrome/mcpServer.js");
          let { createChromeSocketClient, createClaudeForChromeMcpServer } =
            await import("../../utils/claudeInChrome/BROWSER_TOOLS.lazy.js");
          let { createLinkedTransportPair } = await import("./InProcessTransport.js");
          let { setChromeBinding } = await import("../../utils/claudeInChrome/permissionOverrides.js");
          let { registerChromeTabGroupCleanup } =
            await import("../../utils/claudeInChrome/closeSessionTabGroup.lazy.js");
          let chromeContext = createChromeContext(serverRef.env, {
            availabilityFunnel: true,
            credentials,
            bearerGate: async () => isClaudeInChromeAllowed(),
          });
          let context = createChromeSocketClient(chromeContext);
          setChromeBinding(chromeContext, context);
          registerChromeTabGroupCleanup();
          inProcessServer = createClaudeForChromeMcpServer(chromeContext, context);
          let [clientTransport, serverTransport_2] = createLinkedTransportPair();
          await inProcessServer.connect(serverTransport_2);
          serverTransport = clientTransport;
          logMCPDebug(name, "In-process Chrome MCP server started");
        } else if (serverRef.type === "stdio" || !serverRef.type) {
          assertProgramLaunchAllowed();
          let buildStdioEnv = () => ({
            shellPrefix: env.CLAUDE_CODE_SHELL_PREFIX,
            baseEnv: shouldUseMcpAllowlistEnv()
              ? {
                  ...getDefaultEnvironment(),
                  ...agentProxyEnv(),
                }
              : {
                  ...subprocessEnv(),
                },
          });
          let { shellPrefix, baseEnv } = runWithPluginWriteScope(serverRef, buildStdioEnv);
          let commandLine = shellPrefix || serverRef.command;
          let commandArgs = shellPrefix
            ? [shellQuoteArgs([serverRef.command, ...serverRef.args])]
            : serverRef.args;
          let { command, args, pending, capped } = isMcpServerBackingToolHook(name)
            ? {
                command: commandLine,
                args: commandArgs,
                pending: false,
                capped: false,
              }
            : wrapCommandInCgroup("mcp", commandLine, commandArgs);
          stdioPendingCgroup = pending;
          stdioCgroupCapped = capped;
          let { CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_CHROME_MCP_ORG_DENIED, ...envWithoutChromeFlags } =
            baseEnv;
          let projectConfigRoot = getProjectConfigRoot();
          let stdioEnv = {
            ...envWithoutChromeFlags,
            CLAUDE_PROJECT_DIR: projectConfigRoot ?? getProjectRoot(),
            CLAUDE_CODE_SESSION_ID: getSessionId(),
            CLAUDECODE: "1",
            ...serverRef.env,
            ...(!isPolicyAllowed("allow_claude_browser_extension") && {
              CLAUDE_CODE_CHROME_MCP_ORG_DENIED: "1",
            }),
          };
          checkPluginBunOptions(serverRef.pluginSource, stdioEnv, envWithoutChromeFlags);
          dropEmptyBedrockBearer(stdioEnv);
          serverTransport = new BoundedStdioTransport({
            command,
            args,
            env: stdioEnv,
            stderr: "pipe",
            ...(projectConfigRoot !== null && {
              cwd: projectConfigRoot,
            }),
          });
        } else throw Error(`Unsupported server type: ${serverRef.type}`);
        let stderrDataHandler;
        let stderrStream;
        let stderrOutput = "";
        if (serverRef.type === "stdio" || !serverRef.type) {
          let stdioTransport = serverTransport;
          if (stdioTransport.stderr instanceof Readable) {
            stderrStream = stdioTransport.stderr;
            stderrDataHandler = (data) => {
              if (stderrOutput.length < 67108864)
                try {
                  stderrOutput += data.toString();
                } catch {}
            };
            stderrStream.on("data", stderrDataHandler);
          }
        }
        let createClient = () => {
          let client = new Client(
            {
              name: "claude-code",
              title: "Claude Code",
              version:
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.318",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-11-03T18:52:53Z",
                  GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION ?? "unknown",
              description: "Anthropic's agentic coding tool",
              websiteUrl: HTTPS_CLAUDE_COM_CLAUDE_CODE,
            },
            {
              capabilities: clientCapabilitiesFor(serverRef, {
                denylisted: isServerHostInGateList(
                  "tengu_mcp_legacy_url_elicitation_server_denylist",
                  serverRef,
                ),
              }),
              ...(isDisklessContext() && {
                jsonSchemaValidator: NO_OP_SCHEMA_VALIDATOR,
              }),
            },
          );
          client.setRequestHandler(ListRootsRequestSchema, async () => {
            logMCPDebug(name, "Received ListRoots request from server");
            return getMcpRoots(isDocumentsPluginServer(serverRef));
          });
          return client;
        };
        let client = createClient();
        logMCPDebug(name, `Starting connection with timeout of ${getConnectionTimeoutMs()}ms`);
        if (serverRef.type === "http" && keepsMCPDebug()) {
          logMCPDebug(name, `Testing basic HTTP connectivity to ${redactUrlSecrets(serverRef.url)}`);
          try {
            let testUrl = new URL(serverRef.url);
            let redactedHref = redactUrlSecrets(testUrl.href);
            let sanitizedUrl = URL.canParse(redactedHref) ? new URL(redactedHref) : undefined;
            logMCPDebug(
              name,
              sanitizedUrl
                ? `Parsed URL: host=${sanitizedUrl.hostname}, port=${sanitizedUrl.port || "default"}, protocol=${sanitizedUrl.protocol}`
                : `Parsed URL: ${redactedHref}`,
            );
            if (testUrl.hostname === "127.0.0.1" || testUrl.hostname === "localhost")
              logMCPDebug(name, `Using loopback address: ${testUrl.hostname}`);
          } catch {
            logMCPDebug(name, `Failed to parse URL: ${redactUrlSecrets(serverRef.url)}`);
          }
        }
        let cachedInitialize = getCachedInitializeResult(serverRef);
        let discoverAnswer = cachedDiscoverOutcome(serverRef);
        if (isStatelessClaudeAiProxy(serverRef)) {
          logMCPDebug(
            name,
            cachedInitialize
              ? "Stateless claudeai-proxy \u2014 resolving MCP initialize from cached projection"
              : "Stateless claudeai-proxy \u2014 no cached projection; real initialize, GET SSE suppressed",
          );
          if (discoverAnswer !== undefined)
            logMCPDebug(
              name,
              discoverAnswer === "method-not-found"
                ? "Stateless claudeai-proxy \u2014 server/discover resolved locally as legacy (method-not-found)"
                : "Stateless claudeai-proxy \u2014 resolving server/discover from cached projection",
            );
          answerHandshakeLocally(serverTransport, cachedInitialize, discoverAnswer);
        }
        guardTransportSend(
          {
            name,
          },
          serverTransport,
        );
        let connectBudgetExpired = false;
        let withConnectTimeout = (clientArg, transportArg, timeoutMs) => {
          activeClockSnapshot ??= startClockSnapshot(clockSnapshot.clock);
          let connectPromise = clientArg.connect(transportArg, {
            timeout: timeoutMs,
          });
          let timeoutPromise = new Promise((resolve, reject) => {
            let timer = clockSnapshot.clock.setTimeout(() => {
              logMCPDebug(
                name,
                `Connection timeout triggered after ${formatConnectElapsed(clockSnapshot)} (limit: ${timeoutMs}ms)`,
              );
              if (inProcessServer) inProcessServer.close().catch(() => {});
              transportArg.close().catch(() => {});
              connectBudgetExpired = true;
              reject(
                makeConnectTimeoutError(
                  `MCP server "${name}" connection timed out after ${getConnectionTimeoutMs()}ms`,
                ),
              );
            }, timeoutMs);
            connectPromise.then(timer, timer);
          });
          return Promise.race([connectPromise, timeoutPromise]);
        };
        try {
          try {
            await withConnectTimeout(client, serverTransport, getConnectionTimeoutMs());
          } catch (error) {
            if (
              legacySseTransportFactory === undefined ||
              (serverTransport instanceof StreamableHTTPClientTransport &&
                serverTransport.protocolVersion !== undefined) ||
              !isNonJsonRpc4xxPostError(error) ||
              !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_legacy_sse_fallback", true)
            )
              throw error;
            logMCPDebug(
              name,
              `initialize POST rejected (${truncateToLength(describeConnectError(error, serverRef), 200)}); trying legacy HTTP+SSE`,
            );
            let postMethodNotAllowed = error.code === 405;
            await serverTransport.close().catch(() => {});
            let abortController = new AbortController();
            let legacySseConnected = false;
            let legacySseTransport = legacySseTransportFactory({
              postMethodNotAllowed,
              dialSignal: abortController.signal,
              dialConnected: () => legacySseConnected,
            });
            serverTransport = legacySseTransport;
            guardTransportSend(
              {
                name,
              },
              legacySseTransport,
            );
            client = createClient();
            let sawAuthChallengeBefore = authProvider?.sawAuthChallenge === true;
            connectBudgetExpired = false;
            try {
              await withConnectTimeout(
                client,
                legacySseTransport,
                Math.min(
                  PROBE_TIMEOUT_CAP_MS,
                  Math.max(1000, getConnectionTimeoutMs() - (Date.now() - connectStartTime)),
                ),
              );
            } catch (error_2) {
              await legacySseTransport.close().catch(() => {});
              abortController.abort();
              let sawAuthChallengeAfter = !sawAuthChallengeBefore && authProvider?.sawAuthChallenge === true;
              let authFailure = isAuthFailure_2(
                error_2,
                error_2 instanceof SseError ? error_2.code : undefined,
                sawAuthChallengeAfter,
              );
              if (connectBudgetExpired && postMethodNotAllowed && sawAuthChallengeAfter) {
                logMCPDebug(
                  name,
                  "legacy HTTP+SSE stream GET answered with an auth challenge; its auth flow outran the fallback budget, so routing to needs-auth",
                );
                throw new UnauthorizedError(
                  `MCP server "${name}" requires authorization: its legacy HTTP+SSE stream answered with an auth challenge and the authorization flow did not finish within the connect budget`,
                );
              }
              if (
                connectBudgetExpired ||
                (error_2 instanceof SseError && !authFailure) ||
                (authFailure && !postMethodNotAllowed)
              ) {
                logMCPDebug(
                  name,
                  `legacy HTTP+SSE not confirmed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); surfacing the POST failure`,
                );
                throw error;
              }
              throw error_2;
            }
            legacySseConnected = true;
            logMCPDebug(name, "connected over legacy HTTP+SSE");
          }
          if (stderrOutput) {
            logMCPError(name, `Server stderr: ${stderrOutput}`);
            stderrOutput = "";
          }
          if (stderrDataHandler && stderrStream) {
            stderrStream.off("data", stderrDataHandler);
            stderrStream.resume();
          }
          let elapsed = Date.now() - connectStartTime;
          logMCPDebug(
            name,
            `Successfully connected (transport: ${serverRef.type || "stdio"}) in ${elapsed}ms`,
          );
          if (
            (serverRef.type === "stdio" || !serverRef.type) &&
            serverTransport instanceof BoundedStdioTransport &&
            serverTransport.pid
          ) {
            registerChildMemory("mcp_stdio", serverTransport.pid);
            if (stdioPendingCgroup)
              parkPendingPid("mcp", serverTransport.pid, () => isMcpServerBackingToolHook(name));
            if (stdioCgroupCapped || stdioPendingCgroup) releaseMcpToolCgroup(name, serverTransport.pid);
          }
        } catch (error) {
          let elapsed = Date.now() - connectStartTime;
          if (serverTransport instanceof BoundedStdioTransport && serverTransport.overflowError) {
            logMCPError(name, serverTransport.overflowError.message);
            if (stderrOutput) logMCPError(name, `Server stderr: ${stderrOutput}`);
            throw serverTransport.overflowError;
          }
          if (serverRef.type === "sse" && error instanceof Error) {
            logMCPDebug(
              name,
              `SSE Connection failed after ${elapsed}ms: ${jsonStringify({
                url: redactUrlSecrets(serverRef.url),
                error: describeConnectError(error, serverRef),
                errorType: error.constructor.name,
                stack: rethrowRedactedConnectError(error, serverRef) === error ? error.stack : undefined,
              })}`,
            );
            logMCPError(name, rethrowRedactedConnectError(error, serverRef));
            let sseFailureResult = await handleRemoteConnectAuthError_2({
              name,
              serverRef,
              transportType: "sse",
              error,
              statusCode: error.code,
              sawAuthChallenge: authProvider?.sawAuthChallenge === true,
              hasUserAuthHeader: configHasAuthHeader,
              helperMintsAuthHeader,
              cliOwnedBearer: hasCliBearer,
              useFirstPartyAuth,
              firstPartyBearer: firstPartyBearerState.last,
              authProvider,
              roundEpoch,
              storageV5,
            });
            if (sseFailureResult) return sseFailureResult;
          } else if (serverRef.type === "http" && error instanceof Error) {
            let errorObj = error;
            logMCPDebug(
              name,
              `HTTP Connection failed after ${elapsed}ms: ${describeConnectError(error, serverRef)} (code: ${errorObj.code || "none"}, errno: ${errorObj.errno || "none"})`,
            );
            logMCPError(name, rethrowRedactedConnectError(error, serverRef));
            let httpFailureResult = await handleRemoteConnectAuthError_2({
              name,
              serverRef,
              transportType: "http",
              error,
              statusCode: error.code,
              sawAuthChallenge: authProvider?.sawAuthChallenge === true,
              hasUserAuthHeader: configHasAuthHeader,
              helperMintsAuthHeader,
              cliOwnedBearer: hasCliBearer,
              useFirstPartyAuth,
              firstPartyBearer: firstPartyBearerState.last,
              authProvider,
              roundEpoch,
              storageV5,
            });
            if (httpFailureResult) return httpFailureResult;
          } else if (serverRef.type === "claudeai-proxy" && error instanceof Error) {
            logMCPDebug(
              name,
              `claude.ai proxy connection failed after ${elapsed}ms: ${describeConnectError(error, serverRef)}`,
            );
            if (!isClaudeAiBearerRejectedError(error))
              logMCPError(name, rethrowRedactedConnectError(error, serverRef));
            let errorCode = error.code;
            if (isClaudeAiBearerRejectedError(error)) {
              logEvent("tengu_mcp_server_connection_failed", {
                transportType: lit("claudeai-proxy"),
                errorCode: lit("CLAUDEAI_BEARER_REJECTED"),
                sdkGeneration: fromEnum(mcpSdkGeneration()),
                ...mcpBaseUrlAnalytics(serverRef, name),
                ...buildPluginSourceFields(serverRef),
              });
              logFeatureSad("mcp_connect", "mcp_connect_claudeai_bearer_rejected");
              let cacheKey = serverCacheKey(name, serverRef);
              let failedResult = {
                name,
                type: "failed",
                config: serverRef,
                error: error.message,
                errorCode: "CLAUDEAI_BEARER_REJECTED",
              };
              let cachedPromise = getConnectionCache().connections.get(cacheKey);
              if (cachedPromise)
                cachedPromise.then(
                  (cachedResult) => {
                    if (
                      cachedResult === failedResult &&
                      getConnectionCache().connections.get(cacheKey) === cachedPromise
                    )
                      getConnectionCache().connections.delete(cacheKey);
                  },
                  () => {},
                );
              return failedResult;
            }
            if (errorCode === 401 || errorCode === 403)
              return handleRemoteAuthFailure(
                name,
                serverRef,
                "claudeai-proxy",
                undefined,
                false,
                roundEpoch,
                storageV5,
              );
          } else if (serverRef.type === "sse-ide" || serverRef.type === "ws-ide")
            logEvent("tengu_mcp_ide_server_connection_failed", {
              connectionDurationMs: elapsed,
            });
          if (inProcessServer) inProcessServer.close().catch(() => {});
          serverTransport.close().catch(() => {});
          if (stderrOutput && !isCleanupStarted()) logMCPError(name, `Server stderr: ${stderrOutput}`);
          throw error;
        }
        let capabilities = client.getServerCapabilities();
        let serverVersion = client.getServerVersion();
        let promptOverrides = officialPluginPromptOverrides(serverRef);
        let instructionsOverride =
          serverInstructionsOverride(promptOverrides, name) ?? client.getInstructions();
        let instructionsLimit = toolTimeoutForServer(serverRef);
        let instructions = truncateServerInstructions_2(instructionsOverride, name, instructionsLimit);
        logMCPDebug(
          name,
          `Connection established with capabilities: ${jsonStringify({
            hasTools: !!capabilities?.tools,
            hasPrompts: !!capabilities?.prompts,
            hasResources: !!capabilities?.resources,
            hasResourceSubscribe: !!capabilities?.resources?.subscribe,
            serverVersion: serverVersion || "unknown",
          })}`,
        );
        logForDebugging(
          `[MCP] Server "${name}" connected with subscribe=${!!capabilities?.resources?.subscribe}`,
        );
        client.setRequestHandler(ElicitRequestSchema, async (request) => {
          logMCPDebug(name, `Elicitation request received during initialization: ${jsonStringify(request)}`);
          return {
            action: "cancel",
          };
        });
        if (serverRef.type === "sse-ide" || serverRef.type === "ws-ide") {
          let ideConnectionDurationMs = Date.now() - connectStartTime;
          logEvent("tengu_mcp_ide_server_connection_succeeded", {
            connectionDurationMs: ideConnectionDurationMs,
            serverVersion: sanitizeVersion(serverVersion?.version),
          });
          maybeNotifyIDEConnected(client).catch((error) => {
            logMCPError(
              name,
              `Failed to send ide_connected notification: ${describeConnectError(error, serverRef)}`,
            );
          });
        }
        let connectionStartTime = Date.now();
        let sawTransportError = false;
        let originalOnerror = client.onerror;
        let originalOnclose = client.onclose;
        let MAX_ERRORS_BEFORE_RECONNECT = 3;
        let transportErrorState = {
          consecutiveErrors: 0,
          activeCallWatchdogs: new Set(),
          pendingElicitations: 0,
          lastElicitationClosedAt: 0,
        };
        let hasTriggeredClose = false;
        let closeTransportAndRejectPending = (reason) => {
          if (hasTriggeredClose) return;
          hasTriggeredClose = true;
          transportErrorState.closeReason = reason;
          logMCPDebug(name, `Closing transport (${reason})`);
          client.close().catch((e) => {
            logMCPDebug(name, `Error during close: ${describeConnectError(e, serverRef)}`);
          });
        };
        client.onerror = (msg) => {
          let transportType = serverRef.type || "stdio";
          if (transportType === "stdio" && msg instanceof SyntaxError) {
            logMCPError(name, `Ignoring non-JSON line on stdout: ${msg.message}`);
            return;
          }
          if (msg instanceof FirstPartyDesignNeedsConsentError) return;
          if (transportType === "stdio" && msg instanceof StdoutOverflowError) {
            logMCPError(name, msg.message);
            sawTransportError = true;
            closeTransportAndRejectPending("stdout overflow");
            if (originalOnerror) originalOnerror(msg);
            return;
          }
          if (
            (transportType === "http" || transportType === "claudeai-proxy") &&
            msg instanceof HttpBodyOverflowError
          ) {
            logMCPError(
              name,
              `sent a response larger than ${Math.round(HTTP_BODY_LIMITS / 1024 / 1024)}MB. Claude Code stopped reading it and failed the request it answered; the connection stays open.`,
            );
            if (originalOnerror) originalOnerror(msg);
            return;
          }
          if (
            (transportType === "sse" ||
              transportType === "sse-ide" ||
              transportType === "http" ||
              transportType === "claudeai-proxy") &&
            msg.message.includes(STOPPED_READING_NOTE)
          ) {
            logMCPError(name, msg.message);
            sawTransportError = true;
            closeTransportAndRejectPending("http body overflow");
            if (originalOnerror) originalOnerror(msg);
            return;
          }
          if (
            (transportType === "sse" || transportType === "http" || transportType === "claudeai-proxy") &&
            msg instanceof SyntaxError
          ) {
            sawTransportError = true;
            armWatchdogs();
            closeTransportAndRejectPending(
              authProvider?.authChallengeOpen === true && transportErrorState.activeCallWatchdogs.size <= 1
                ? "malformed message after an auth challenge"
                : "malformed JSON-RPC message (response truncated)",
            );
            if (originalOnerror) originalOnerror(msg);
            return;
          }
          let uptime = Date.now() - connectionStartTime;
          sawTransportError = true;
          logMCPDebug(
            name,
            `${transportType.toUpperCase()} connection dropped after ${Math.floor(uptime / 1000)}s uptime`,
          );
          if (msg.message) {
            let hint = CONNECTION_ERROR_HINTS.find(([needle]) => msg.message.includes(needle))?.[1];
            logMCPDebug(name, hint ?? `Connection error: ${describeConnectError(msg, serverRef)}`);
          }
          if (
            (transportType === "http" || transportType === "claudeai-proxy") &&
            client.transport?.sessionId !== undefined &&
            isMcpSessionExpiredError_2(msg)
          ) {
            logMCPDebug(
              name,
              "MCP session expired (server no longer recognizes session ID), triggering reconnection",
            );
            closeTransportAndRejectPending("session expired");
            if (originalOnerror) originalOnerror(msg);
            return;
          }
          if (
            (transportType === "http" || transportType === "claudeai-proxy") &&
            client.transport?.sessionId !== undefined &&
            msg instanceof StreamableHTTPError &&
            msg.code === 404 &&
            msg.message.includes("Failed to open SSE stream")
          )
            logFeatureSad("mcp_session_recovery", "get_stream_404_not_reinit");
          if (transportType === "sse" || transportType === "http" || transportType === "claudeai-proxy") {
            if (msg.message.includes("Maximum reconnection attempts")) {
              logMCPDebug(
                name,
                "SSE GET-stream reconnection exhausted; leaving transport up (POST still works)",
              );
              transportErrorState.consecutiveErrors = 0;
              armWatchdogs();
              if (originalOnerror) originalOnerror(msg);
              return;
            }
            if (isTransientMcpError_2(msg)) {
              transportErrorState.consecutiveErrors++;
              armWatchdogs();
              logMCPDebug(
                name,
                `Terminal connection error ${transportErrorState.consecutiveErrors}/${MAX_ERRORS_BEFORE_RECONNECT}`,
              );
              if (transportErrorState.consecutiveErrors >= MAX_ERRORS_BEFORE_RECONNECT) {
                transportErrorState.consecutiveErrors = 0;
                closeTransportAndRejectPending("max consecutive terminal errors");
              }
            } else transportErrorState.consecutiveErrors = 0;
          }
          if (originalOnerror) originalOnerror(msg);
        };
        if ((serverRef.type === "http" || serverRef.type === "claudeai-proxy") && client.transport)
          transportErrorState.toolCallSends = trackToolCallSends(
            client.transport,
            isMcpSessionExpiredError_2,
            transportErrorState.activeCallWatchdogs,
          );
        if (client.transport) {
          let onmessage = client.transport.onmessage;
          client.transport.onmessage = (message, extra) => {
            if (transportErrorState.consecutiveErrors !== 0) transportErrorState.consecutiveErrors = 0;
            onmessage?.(message, extra);
          };
        }
        client.onclose = () => {
          let uptime = Date.now() - connectionStartTime;
          let transportType = serverRef.type ?? "unknown";
          logMCPDebug(
            name,
            `${transportType.toUpperCase()} connection closed after ${Math.floor(uptime / 1000)}s (${sawTransportError ? "with errors" : "cleanly"})`,
          );
          logMcpConnectionOtelEvent_2(name, serverRef, {
            status: "disconnected",
            durationMs: uptime,
          });
          let key = serverCacheKey(name, serverRef);
          getConnectionCache().liveClients.delete(client);
          getConnectionCache().toolLists.delete(key);
          getConnectionCache().resourceLists.delete(key);
          getConnectionCache().resourceTemplateLists.delete(key);
          getConnectionCache().commandLists.delete(key);
          getConnectionCache().connections.delete(key);
          logMCPDebug(name, "Cleared connection cache for reconnection");
          if (originalOnclose) originalOnclose();
        };
        let cleanup = async () => {
          if (inProcessServer) {
            try {
              await inProcessServer.close();
            } catch (error) {
              logMCPDebug(name, `Error closing in-process server: ${error}`);
            }
            try {
              await client.close();
            } catch (error) {
              logMCPDebug(name, `Error closing client: ${describeConnectError(error, serverRef)}`);
            }
            return;
          }
          if (serverTransport instanceof BoundedStdioTransport)
            try {
              let childPid = serverTransport.pid;
              if (serverTransport.serverProcess && getPlatform() === "windows") {
                logMCPDebug(name, "Closing MCP server stdin");
                await closeStdioServer(serverTransport.serverProcess);
              } else if (childPid) {
                logMCPDebug(name, "Sending SIGINT to MCP server process");
                try {
                  process.kill(childPid, "SIGINT");
                } catch (error) {
                  logMCPDebug(name, `Error sending SIGINT: ${error}`);
                  return;
                }
                await new Promise(async (resolve) => {
                  let settled = false;
                  let finish = () => {
                    if (settled) return;
                    settled = true;
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve();
                  };
                  let isAlive = (childPid) => {
                    try {
                      process.kill(childPid, 0);
                      return true;
                    } catch {
                      return false;
                    }
                  };
                  let interval = setInterval(
                    (isAlive, childPid, debugName, done) => {
                      if (!isAlive(childPid)) {
                        logMCPDebug(debugName, "MCP server process exited cleanly");
                        done();
                      }
                    },
                    50,
                    isAlive,
                    childPid,
                    name,
                    finish,
                  );
                  let timer = setTimeout(
                    (debugName, done) => {
                      logMCPDebug(debugName, "Cleanup timeout reached, stopping process monitoring");
                      done();
                    },
                    600,
                    name,
                    finish,
                  );
                  try {
                    await sleep(100);
                    if (!settled) {
                      if (!isAlive(childPid)) {
                        finish();
                        return;
                      }
                      logMCPDebug(name, "SIGINT failed, sending SIGTERM to MCP server process");
                      try {
                        process.kill(childPid, "SIGTERM");
                      } catch (termError) {
                        logMCPDebug(name, `Error sending SIGTERM: ${termError}`);
                        finish();
                        return;
                      }
                      await sleep(400);
                      if (!settled)
                        if (!isAlive(childPid)) finish();
                        else {
                          logMCPDebug(name, "SIGTERM failed, sending SIGKILL to MCP server process");
                          try {
                            process.kill(childPid, "SIGKILL");
                          } catch (killError) {
                            logMCPDebug(name, `Error sending SIGKILL: ${killError}`);
                          }
                        }
                    }
                    finish();
                  } catch {
                    finish();
                  }
                });
              }
            } catch (processError) {
              logMCPDebug(name, `Error terminating process: ${processError}`);
            }
          try {
            await client.close();
          } catch (error) {
            logMCPDebug(name, `Error closing client: ${describeConnectError(error, serverRef)}`);
          }
        };
        let cleanupUnregister = registerCleanup(cleanup);
        if (serverTransport instanceof BoundedStdioTransport) serverTransport.handOffExitCleanup();
        let wrappedCleanup = async () => {
          getConnectionCache().liveClients.delete(client);
          cleanupUnregister?.();
          await cleanup();
        };
        getConnectionCache().liveClients.add(client);
        if (getAnnouncedDirectories() !== announcedDirectories) client.sendRootsListChanged().catch(() => {});
        let connectDurationMs = Date.now() - connectStartTime;
        logMcpConnectionOtelEvent_2(name, serverRef, {
          status: "connected",
          durationMs: connectDurationMs,
        });
        let instructionsLength = instructionsOverride?.length ?? 0;
        logEvent("tengu_mcp_server_connection_succeeded", {
          connectionDurationMs: connectDurationMs,
          instructionsLength,
          instructionsTruncated: instructionsLength > instructionsLimit,
          transportType: fromEnum(serverRef.type ?? "stdio"),
          negotiatedLegacySse: serverRef.type === "http" && serverTransport instanceof SSEClientTransport,
          sdkGeneration: fromEnum(mcpSdkGeneration()),
          scope: fromEnum(serverRef.scope),
          isPlugin: serverRef.pluginSource !== undefined,
          ...buildPluginSourceFields(serverRef),
          totalServers: serverStats?.totalServers,
          stdioCount: serverStats?.stdioCount,
          sseCount: serverStats?.sseCount,
          httpCount: serverStats?.httpCount,
          sseIdeCount: serverStats?.sseIdeCount,
          wsIdeCount: serverStats?.wsIdeCount,
          ...mcpBaseUrlAnalytics(serverRef, name),
        });
        logFeatureOk("mcp_connect");
        logForDiagnosticsNoPII("info", "mcp_connect_complete", {
          transport,
          duration_ms: connectDurationMs,
        });
        if (authProvider) getCliOwnedState().clientAuthProviders.set(client, authProvider);
        getCliOwnedState().clientFirstPartyBearers.set(client, firstPartyBearerState);
        let connection = {
          name,
          client: identityId(client),
          type: "connected",
          capabilities: capabilities ?? {},
          serverInfo: serverVersion,
          instructions,
          config: serverRef,
          cleanup: wrappedCleanup,
          transportErrorState,
        };
        clearDiscoveryPathMemo(name);
        try {
          getConnectedClientWiring()?.(connection);
        } catch (error) {
          logMCPError(
            name,
            `connected-client wiring failed (placeholder retained, adoption will retry): ${errorMessage(error)}`,
          );
        }
        return connection;
      } catch (error) {
        let abandonedAfterMs = Date.now() - connectStartTime;
        if (isCleanupStarted()) {
          logMCPDebug(
            name,
            `Connection abandoned after ${abandonedAfterMs}ms (Claude Code is shutting down)`,
          );
          if (inProcessServer) inProcessServer.close().catch(() => {});
          return {
            name,
            type: "failed",
            config: serverRef,
            error: "Claude Code is shutting down",
            errorCode: "SHUTTING_DOWN",
          };
        }
        let errorDetail = describeConnectError(error, serverRef);
        let cause = error instanceof Error ? error.cause : undefined;
        let rawErrorCode =
          (error && typeof error === "object" && "code" in error ? error.code : undefined) ??
          (cause && typeof cause === "object" && "code" in cause ? cause.code : undefined);
        let failureCode = rawErrorCode !== undefined ? String(rawErrorCode) : undefined;
        if (
          serverRef.type === "http" &&
          failureCode === "404" &&
          serverTransport?.sessionId === undefined &&
          !isCcrHostedConfig(serverRef)
        ) {
          failureCode = "ENDPOINT_NOT_FOUND";
          errorDetail = `MCP endpoint not found at ${
            describeMcpServerOrigin(name, serverRef, {
              detail: "origin",
            }) ?? "(unparseable url)"
          }. Check the URL in your MCP config.`;
        }
        let suspendedMessage =
          failureCode === "CONNECT_TIMEOUT" && activeClockSnapshot !== undefined
            ? suspendedConnectMessage(name, activeClockSnapshot)
            : undefined;
        if (suspendedMessage !== undefined) {
          failureCode = CONNECT_SUSPENDED;
          errorDetail = suspendedMessage;
        }
        errorDetail = redactMcpErrorDetail(name, serverRef, errorDetail);
        logMcpConnectionOtelEvent_2(name, serverRef, {
          status: "failed",
          durationMs: abandonedAfterMs,
          errorCode: failureCode,
          error: errorDetail,
        });
        let featureErrorId =
          failureCode === "ENOENT" && (serverRef.type === "stdio" || serverRef.type === undefined)
            ? "mcp_connect_spawn_enoent"
            : failureCode === "ENDPOINT_NOT_FOUND"
              ? "mcp_connect_endpoint_not_found"
              : undefined;
        if (featureErrorId !== undefined) logFeatureBad("mcp_connect", featureErrorId);
        else {
          let featureSadId =
            failureCode === "ECONNREFUSED"
              ? "mcp_connect_refused"
              : failureCode === CONNECT_SUSPENDED
                ? "mcp_connect_suspended"
                : errorDetail.includes("timed out")
                  ? "mcp_connect_timeout"
                  : "mcp_connect_failed";
          logFeatureSad("mcp_connect", `${featureSadId}_${serverRef.type ?? "stdio"}`);
        }
        logEvent("tengu_mcp_server_connection_failed", {
          connectionDurationMs: abandonedAfterMs,
          errorCode: sanitizeConnectErrorCodeForTelemetry_2(failureCode),
          errorClassName: sanitizedErrorClassNameForTelemetry(error),
          errorMessageHash: shortHash(scrubErrorText(errorDetail)),
          totalServers: serverStats?.totalServers || 1,
          stdioCount: serverStats?.stdioCount || (serverRef.type === "stdio" ? 1 : 0),
          sseCount: serverStats?.sseCount || (serverRef.type === "sse" ? 1 : 0),
          httpCount: serverStats?.httpCount || (serverRef.type === "http" ? 1 : 0),
          sseIdeCount: serverStats?.sseIdeCount || (serverRef.type === "sse-ide" ? 1 : 0),
          wsIdeCount: serverStats?.wsIdeCount || (serverRef.type === "ws-ide" ? 1 : 0),
          transportType: fromEnum(serverRef.type ?? "stdio"),
          sdkGeneration: fromEnum(mcpSdkGeneration()),
          scope: fromEnum(serverRef.scope),
          isPlugin: serverRef.pluginSource !== undefined,
          ...buildPluginSourceFields(serverRef),
          ...mcpBaseUrlAnalytics(serverRef, name),
        });
        logMCPDebug(
          name,
          `Connection failed after ${formatConnectElapsed(clockSnapshot)}${failureCode !== undefined ? ` (${failureCode})` : ""}: ${errorDetail}`,
        );
        logMCPError(
          name,
          `Connection failed${failureCode !== undefined ? ` (${failureCode})` : ""}: ${errorDetail}`,
        );
        logForDiagnosticsNoPII("error", "mcp_connect_failed", {
          transport,
          duration_ms: abandonedAfterMs,
          ...(failureCode === "CONNECT_TIMEOUT" && {
            reason: "timeout",
          }),
          ...(failureCode === CONNECT_SUSPENDED && {
            reason: "suspended",
          }),
        });
        if (inProcessServer) inProcessServer.close().catch(() => {});
        if (failureCode !== CONNECT_SUSPENDED) getServerCommandArray(name, serverRef, storageV5);
        let proxyConnectStatus =
          failureCode === "ERR_PROXY_TUNNEL"
            ? [error, cause]
                .map((candidate) =>
                  candidate && typeof candidate === "object" && "status" in candidate
                    ? candidate.status
                    : undefined,
                )
                .find((statusValue) => typeof statusValue === "number")
            : undefined;
        return {
          name,
          type: "failed",
          config: serverRef,
          error: errorDetail,
          errorCode: failureCode,
          notForwardedMessage:
            "url" in serverRef && issuerKey_3(serverRef.url)
              ? redactMcpErrorDetail(name, serverRef, postedEndpointErrorText(error) ?? "") || undefined
              : undefined,
          ...(proxyConnectStatus !== undefined && {
            proxyConnectStatus,
          }),
          ...(failureCode === undefined &&
            authProvider?.sawAuthChallenge === true &&
            (await registrationStatusFields(name, serverRef, connectStartTime))),
        };
      }
    },
    serverCacheKey,
    () => getConnectionCache().connections,
    (name, serverRef, [cacheName, cacheServerRef, , storageV5]) =>
      connectWithSignedOutFallback(
        () =>
          redialAfterSuspend(name, serverRef, () =>
            getServerCommandArray(cacheName, cacheServerRef, storageV5),
          ),
        serverRef,
        cacheName,
        cacheServerRef,
      ),
  );
});
//@ chunk-h44h5gdv.js:125916-126078 callgraph-fingerprint (2.1.88 match: callIdeRpc, 0.395)
/**
 * callIdeTool（v1 副本）。
 */
async function callIdeTool(toolName, args, client) {
  return (
    await callMCPTool_2({
      client,
      tool: toolName,
      args,
      signal: createAbortController().signal,
      imageLimits: IMAGE_LIMITS,
      idleTimeoutMs: 0,
      storageV5: undefined,
      credentials: undefined,
    })
  ).content;
}
//@ chunk-h44h5gdv.js:126078-126336 layout
/**
 * identityChangedReconnectResult（v1 副本）。
 */
function identityChangedReconnectResult(name, config) {
  logFeatureSad("mcp_reconnect", "mcp_reconnect_identity_changed");
  return {
    client: {
      name,
      type: "failed",
      config,
      error: "Reconnect cancelled: the account changed while connecting. Choose Reconnect again.",
      errorCode: "IDENTITY_CHANGED",
    },
    tools: [],
    commands: [],
  };
}
//@ chunk-h44h5gdv.js:126336-126474 layout
/**
 * 重连 MCP 服务器（v1）：需要时先等待账号身份就绪，远程服务器在等待期间账号变化则返回 IDENTITY_CHANGED 结果，否则调用 reconnectMcpServerImpl。
 */
async function reconnectMcpServer(serverName, serverRef, credentials, storageV5) {
  if (!isDiscoveryCacheUsable()) return reconnectMcpServerImpl(serverName, serverRef, credentials, storageV5);
  let epochAtStart = identityEpoch();
  await flushDiscoveryCache(clearDiscoveryForServer_2(serverName, serverRef));
  if (isRemoteMcpTransport(serverRef) && identityEpoch() !== epochAtStart)
    return identityChangedReconnectResult(serverName, serverRef);
  return reconnectMcpServerImpl(serverName, serverRef, credentials, storageV5);
}
//@ chunk-h44h5gdv.js:126474-128393 fingerprint (2.1.88 match: reconnectMcpServerImpl, 0.347)
/**
 * reconnectMcpServerImpl（v1 副本）。
 */
async function reconnectMcpServerImpl(serverName, serverRef, credentials, storageV5, options = {}) {
  let epochAtStart = identityEpoch();
  let isRemote = isRemoteMcpTransport(serverRef);
  let identityChanged = () => isRemote && identityEpoch() !== epochAtStart;
  let identityChangedResult = () => identityChangedReconnectResult(serverName, serverRef);
  try {
    clearKeychainCache();
    let keepOptions = options.keepConnectionInUse ? {} : undefined;
    await (keepOptions === undefined
      ? clearServerCache_3(serverName, serverRef)
      : clearServerCache_3(serverName, serverRef, keepOptions));
    if (identityChanged()) return identityChangedResult();
    let dial = connectToServer_2(serverName, serverRef, undefined, credentials, storageV5);
    let connection = await dial;
    if (connection.type === "needs-auth") {
      logMCPDebug(serverName, "Reconnect returned 'needs-auth'; retrying once after cache clear");
      if (identityChanged()) return identityChangedResult();
      let cacheKey = serverCacheKey(serverName, serverRef);
      if (getConnectionCache().connections.get(cacheKey) === dial)
        getConnectionCache().connections.delete(cacheKey);
      connection = await connectToServer_2(serverName, serverRef, undefined, credentials, storageV5);
    }
    if (identityChanged()) {
      if (connection.type === "connected") await detachAndCloseConnection_2(connection);
      return identityChangedResult();
    }
    if (connection.type !== "connected") {
      logFeatureSad("mcp_reconnect", "mcp_reconnect_not_connected");
      return applyMcpServerConfig(serverRef, {
        client: connection,
        tools: [],
        commands: [],
      });
    }
    if (serverRef.type !== "claudeai-proxy") clearMcpAuthCacheEntry(serverName, credentials);
    if (serverRef.type === "http" || serverRef.type === "sse")
      await clearMcpOAuthStubIfTokenless(serverName, serverRef);
    clearDiscoveryPathMemo(serverName);
    let grantLeg;
    if (isDiscoveryCacheOn()) grantLeg = await cacheGrantLeg(serverName, serverRef);
    if (identityChanged()) {
      await detachAndCloseConnection_2(connection);
      return identityChangedResult();
    }
    let hasResources = !!connection.capabilities?.resources;
    let [tools, mcpCommands, extraCommands, resources] = await Promise.all([
      listMcpTools(connection, credentials),
      fetchCommandsForClient_2(connection),
      Promise.resolve([]),
      hasResources ? fetchResourcesForClient_2(connection) : Promise.resolve([]),
    ]);
    if (identityChanged()) {
      await detachAndCloseConnection_2(connection);
      return identityChangedResult();
    }
    if (connection.discoveryAuthFailure) {
      logFeatureSad("mcp_reconnect", "mcp_reconnect_needs_auth_discovery");
      return {
        client: {
          name: serverName,
          type: "needs-auth",
          config: serverRef,
        },
        tools: [],
        commands: [],
      };
    }
    if (serverRef.type === "claudeai-proxy" && !connection.discoveryBearerRejected)
      clearMcpAuthCacheEntry(serverName, credentials);
    if (
      serverRef.type === "claudeai-proxy" &&
      !connection.toolsListError &&
      !connection.discoveryBearerRejected
    )
      recordClaudeAiMcpConnected(serverName, credentials);
    persistLiveListing_2(connection, {
      tools,
      commands: mcpCommands,
      resources,
      identityEpoch: epochAtStart,
      grantLeg,
    });
    let commands = [...mcpCommands, ...extraCommands];
    let resourceTools = [];
    if (hasResources) {
      if (
        ![ListMcpResourcesTool, ReadMcpResourceTool].some((tool) =>
          tools.some((t) => matchesToolName(t, tool.name)),
        )
      )
        resourceTools.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
    }
    if (connection.discoveryBearerRejected) logFeatureSad("mcp_reconnect", "mcp_reconnect_bearer_rejected");
    else if (connection.toolsListError) logFeatureSad("mcp_reconnect", "mcp_reconnect_tools_list_failed");
    else logFeatureOk("mcp_reconnect");
    return applyMcpServerConfig(serverRef, {
      client: connection,
      tools: [...tools, ...resourceTools],
      commands,
      resources: resources.length > 0 ? resources : undefined,
      resourceTemplates: [],
      ...(keepOptions?.connection !== undefined &&
        connection === keepOptions.connection && {
          keptConnectionInUse: true,
        }),
    });
  } catch (error) {
    logFeatureBad("mcp_reconnect", "mcp_reconnect_failed");
    logMCPError(serverName, `Error during reconnection: ${describeConnectError(error, serverRef)}`);
    return {
      client: {
        name: serverName,
        type: "failed",
        config: serverRef,
      },
      tools: [],
      commands: [],
    };
  }
}
//@ chunk-h44h5gdv.js:128393-128448 layout (2.1.88 match: processBatched, 1)
async function processBatched_2(items, concurrency, processor) {
  await pMap(items, processor, {
    concurrency,
  });
}
//@ chunk-h44h5gdv.js:128448-128713 layout
/**
 * countUnsettledByDeadline（v1 副本）。
 */
async function countUnsettledByDeadline(promises, timeoutMs) {
  if (promises.length === 0) return 0;
  let timer;
  let promise = new Promise((resolve) => {
    timer = setTimeout((resolve) => resolve("deadline"), timeoutMs, resolve);
  });
  try {
    let results = await Promise.all(
      promises.map((promise_2) =>
        Promise.race([
          promise_2.then(
            () => "settled",
            () => "settled",
          ),
          promise,
        ]),
      ),
    );
    return countWhere(results, (outcome) => outcome === "deadline");
  } finally {
    clearTimeout(timer);
  }
}
//@ chunk-h44h5gdv.js:128713-136122 fingerprint (2.1.88 match: getMcpToolsCommandsAndResources, 0.46)
/**
 * getMcpToolsCommandsAndResources（v1 副本）。
 */
async function getMcpToolsCommandsAndResources(
  publishResult,
  mcpConfigs,
  storageV5,
  credentials,
  savedToolsByServer,
  streamResources,
  listOptions,
  connectOptions,
) {
  let epochAtStart = identityEpoch();
  let identityChangedForRemote = (config) => identityEpoch() !== epochAtStart && isRemoteMcpTransport(config);
  let publishServerResult = (config) => {
    if (!identityChangedForRemote(config.client.config))
      publishResult({
        ...config,
        attemptEpoch: epochAtStart,
      });
  };
  isLegacyProtocolEra();
  let resourceToolsAdded = false;
  let allConfigEntries = Object.entries(mcpConfigs ?? (await getAllMcpConfigs()).servers);
  let enabledEntries = [];
  for (let entry of allConfigEntries)
    if (isMcpServerDisabled(entry[0]))
      publishServerResult({
        client: {
          name: entry[0],
          type: "disabled",
          config: entry[1],
        },
        tools: [],
        commands: [],
      });
    else enabledEntries.push(entry);
  registerConfiguredMcpServers(Object.fromEntries(enabledEntries));
  let totalServers = enabledEntries.length;
  let stdioCount = countWhere(enabledEntries, ([name, config]) => config.type === "stdio");
  let sseCount = countWhere(enabledEntries, ([name, config]) => config.type === "sse");
  let httpCount = countWhere(enabledEntries, ([name, config]) => config.type === "http");
  let sseIdeCount = countWhere(enabledEntries, ([name, config]) => config.type === "sse-ide");
  let wsIdeCount = countWhere(enabledEntries, ([name, config]) => config.type === "ws-ide");
  let localServers = enabledEntries.filter(([name, config]) => isLocalMcpServer(config));
  let remoteServers = enabledEntries.filter(([name, config]) => !isLocalMcpServer(config));
  let transportCounts = {
    totalServers,
    stdioCount,
    sseCount,
    httpCount,
    sseIdeCount,
    wsIdeCount,
  };
  let pendingDiscoveryTasks = [];
  let processServer = async ([serverName, config]) => {
    try {
      if (isCleanupStarted()) {
        logMCPDebug(serverName, "Skipping connection (Claude Code is shutting down)");
        return;
      }
      if (isMcpServerDisabled(serverName)) {
        publishServerResult({
          client: {
            name: serverName,
            type: "disabled",
            config,
          },
          tools: [],
          commands: [],
        });
        return;
      }
      if (isMcpServerBlockedAtConnectTime(serverName, config)) {
        logMCPDebug(serverName, "Skipping connection (blocked by managed policy)");
        publishServerResult({
          client: {
            name: serverName,
            type: "failed",
            config,
            error: mcpGateError("managed-policy", serverName, config).error,
          },
          tools: [],
          commands: [],
        });
        return;
      }
      if (isIneligibleClaudeAiProxy(config)) {
        publishServerResult({
          client: {
            name: serverName,
            type: "needs-auth",
            config,
          },
          tools: mcpAuthToolsFor(serverName, config),
          commands: [],
        });
        return;
      }
      if (
        (config.type === "claudeai-proxy" || config.type === "http" || config.type === "sse") &&
        !isCliOwnedConfig(config) &&
        ((await isMcpAuthCached(serverName, config, storageV5)) ||
          ((config.type === "http" || config.type === "sse") &&
            shouldTryTokenless(
              serverName,
              config,
              await readMcpOAuthStore({
                serverName,
                serverConfig: config,
                challenged: false,
              }),
            )))
      ) {
        if (config.type !== "claudeai-proxy" && config.pluginSource === undefined)
          logMCPDebug(serverName, "Skipping connection (cached needs-auth)");
        publishServerResult({
          client: {
            name: serverName,
            type: "needs-auth",
            config,
            ...(await registrationStatusFields(serverName, config)),
          },
          tools: mcpAuthToolsFor(serverName, config),
          commands: [],
        });
        return;
      }
      if (
        (config.type === "stdio" || config.type === undefined) &&
        config.pluginSource !== undefined &&
        (await isMcpAuthCached(serverName, config, storageV5))
      ) {
        publishServerResult({
          client: {
            name: serverName,
            type: "failed",
            config,
            error:
              "Skipping connection (recent failure cached; retries automatically in 15 min, or edit the plugin config to retry now)",
          },
          tools: [],
          commands: [],
        });
        return;
      }
      let hasLive = await hasLiveConnection_2(serverName, config);
      let savedTools =
        savedToolsByServer !== undefined && Object.hasOwn(savedToolsByServer, serverName)
          ? savedToolsByServer[serverName]
          : undefined;
      if (savedTools !== undefined && !hasLive) {
        let { client, tools } = await buildCachedClientTools_2({
          name: serverName,
          config,
          capabilities: {
            tools: {},
          },
          serverInfo: undefined,
          savedAt: Date.now(),
          tools: savedTools,
        });
        publishServerResult({
          client,
          tools,
          commands: [],
        });
        return;
      }
      let cacheProbe = hasLive
        ? {
            kind: "miss",
            reason: "live-connection",
          }
        : await readDiscoveryCache(serverName, config);
      let cacheServe = applyCapabilityServeTimeMiss_2(cacheProbe);
      if (cacheServe.kind === "fresh" || cacheServe.kind === "stale") {
        let { entry, ageMs } = cacheServe;
        let { client, tools } = await buildCachedClientTools_2({
          name: serverName,
          config,
          capabilities: entry.capabilities,
          serverInfo: entry.serverInfo,
          savedAt: entry.savedAt,
          tools: entry.tools,
        });
        let commands = buildMcpPromptCommands_2(client, entry.commands);
        let mapped = entry.resources.map((resource) => ({
          ...resource,
          server: serverName,
        }));
        let mapped_2 = (entry.templates ?? []).map((template) => ({
          ...template,
          server: serverName,
        }));
        let cachedHasResources = !!entry.capabilities.resources || mapped.length > 0;
        let resourceTools = [];
        if (cachedHasResources && !resourceToolsAdded) {
          resourceToolsAdded = true;
          resourceTools.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
        }
        logEvent("tengu_mcp_discovery_source", {
          source: lit(cacheServe.kind === "fresh" ? "cache_fresh" : "cache_stale"),
          transportType: fromEnum(config.type ?? "stdio"),
          entryAgeMs: ageMs,
          ...mcpBaseUrlAnalytics(config, serverName),
        });
        logFeatureOk("mcp_discovery_cache");
        getConnectionCache().settledCachedDialFailures.delete(serverCacheKey(serverName, config));
        getConnectionCache().refusedCachedRows.delete(serverCacheKey(serverName, config));
        publishServerResult({
          client,
          tools: [...tools, ...resourceTools],
          commands,
          resources: mapped.length > 0 ? mapped : undefined,
          resourceTemplates: mapped_2.length > 0 ? mapped_2 : undefined,
        });
        if (cacheServe.kind === "stale")
          (async () => {
            let grantLeg = await cacheGrantLeg(serverName, config);
            let refreshDial;
            let recordStrike = async () => {
              if (
                (refreshDial !== undefined && isSupersededDial_2(refreshDial)) ||
                identityEpoch() !== epochAtStart
              )
                return;
              logFeatureSad("mcp_discovery_cache", "strike");
              await recordRefreshFailureStrike(serverName, config, {
                identityEpoch: epochAtStart,
                grantLeg,
              });
            };
            let discoveryRefreshLock = await acquireDiscoveryRefreshLock(serverName, config);
            if (!discoveryRefreshLock) return;
            if (isMcpServerDisabled(serverName)) {
              await discoveryRefreshLock().catch(() => {});
              refuseCachedRowV1(serverName, config, "disabled");
              return;
            }
            if (isMcpServerBlockedAtConnectTime(serverName, config)) {
              await discoveryRefreshLock().catch(() => {});
              refuseCachedRowV1(serverName, config, "policy");
              return;
            }
            let handleRefreshResult = (connection) => {
              if (!(
                !(refreshDial !== undefined && isSupersededDial_2(refreshDial)) &&
                identityEpoch() === epochAtStart
              ))
                return;
              if (connection.type !== "needs-auth")
                getConnectionCache().connections.delete(serverCacheKey(serverName, config));
              let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
              if (cachedFirstDialArmsRan.has(connection)) return;
              cachedFirstDialArmsRan.add(connection);
              if (connection.type === "needs-auth") emitCachedAdoptSignal(serverName, config);
              else if (connection.type === "failed") recordCachedDialFailureV1(connection, false);
            };
            let emitAdopt = (connection) => {
              let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
              if (cachedFirstDialArmsRan.has(connection)) return;
              cachedFirstDialArmsRan.add(connection);
              emitCachedAdoptSignal(serverName, config);
            };
            let dialSettled = false;
            try {
              refreshDial = connectToServer_2(serverName, config, transportCounts, storageV5, credentials);
              getCliOwnedState().swrRefreshDialsInFlight.add(refreshDial);
              refreshDial.then(
                () => {
                  dialSettled = true;
                },
                () => {
                  dialSettled = true;
                },
              );
              let refreshConnection = await boundDial(refreshDial, {
                serverName,
                context: "MCP discovery-cache stale refresh",
              });
              if (refreshConnection.type !== "connected") {
                handleRefreshResult(refreshConnection);
                await recordStrike();
                return;
              }
              if (isSupersededDial_2(refreshDial) || identityEpoch() !== epochAtStart) return;
              if (
                entry.negotiatedEra !== undefined &&
                refreshConnection.protocolEra !== undefined &&
                refreshConnection.protocolEra !== entry.negotiatedEra
              ) {
                logMCPDebug(
                  serverName,
                  "Discovery cache entry dropped: server negotiated a different protocol era on revalidation",
                );
                await clearDiscoveryForServer_2(serverName, config).catch(() => {});
                if (!isSupersededDial_2(refreshDial) && identityEpoch() === epochAtStart)
                  emitAdopt(refreshConnection);
                return;
              }
              let refreshHasResources = !!refreshConnection.capabilities?.resources;
              clearDiscoveryPathMemo(serverName);
              let grantLeg = await cacheGrantLeg(serverName, config);
              if (isSupersededDial_2(refreshDial) || identityEpoch() !== epochAtStart) return;
              let [tools, commandsForClient, resourcesForClient, templatesPromise] = await Promise.all([
                listMcpTools(refreshConnection, storageV5),
                fetchCommandsForClient_2(refreshConnection),
                fetchResourcesForClient_2(refreshConnection),
                refreshHasResources && isCacheableServer(config)
                  ? fetchResourceTemplatesForClient_2(refreshConnection)
                  : Promise.resolve([]),
              ]);
              let templates =
                getDiscoveryFetchError_2(templatesPromise) === undefined ? templatesPromise : undefined;
              if (
                isSupersededDial_2(refreshDial) ||
                isSupersededCacheEntry_2(refreshDial, serverName, config) ||
                identityEpoch() !== epochAtStart
              )
                return;
              if (!isMcpServerDisabled(serverName) && !isMcpServerBlockedAtConnectTime(serverName, config)) {
                if (
                  !(await persistDiscovery(refreshConnection, {
                    tools,
                    commands: commandsForClient,
                    resources: resourcesForClient,
                    templates,
                    identityEpoch: epochAtStart,
                    grantLeg,
                  }))
                )
                  await recordStrike();
              }
              if (
                !(refreshDial !== undefined && isSupersededDial_2(refreshDial)) &&
                !(refreshDial !== undefined && isSupersededCacheEntry_2(refreshDial, serverName, config)) &&
                identityEpoch() === epochAtStart
              )
                emitAdopt(refreshConnection);
            } catch {
              if (refreshDial !== undefined && !dialSettled) {
                let pendingDial = refreshDial;
                pendingDial.then(
                  (lateResult) => {
                    if (lateResult.type !== "connected") {
                      handleRefreshResult(lateResult);
                      recordStrike().catch(() => {});
                    } else {
                      getCliOwnedState().swrRefreshDialsInFlight.delete(pendingDial);
                      (entry.negotiatedEra !== undefined &&
                      lateResult.protocolEra !== undefined &&
                      lateResult.protocolEra !== entry.negotiatedEra
                        ? clearDiscoveryForServer_2(serverName, config).catch(() => {})
                        : Promise.resolve()
                      ).then(() => {
                        if (!isSupersededDial_2(pendingDial) && identityEpoch() === epochAtStart)
                          emitAdopt(lateResult);
                      });
                    }
                  },
                  () => {
                    recordStrike().catch(() => {});
                  },
                );
              } else await recordStrike();
            } finally {
              if (refreshDial !== undefined && dialSettled)
                getCliOwnedState().swrRefreshDialsInFlight.delete(refreshDial);
              await discoveryRefreshLock().catch(() => {});
            }
          })();
        return;
      }
      let dial = connectToServer_2(
        serverName,
        config,
        transportCounts,
        storageV5,
        credentials,
        undefined,
        connectOptions,
      );
      let connection = await dial;
      let isLatestDial = connectToServer_2.cache?.get?.(serverCacheKey(serverName, config)) === dial;
      if (isDiscoveryCacheOn() && isDiscoveryCacheMissRecoverable_2(cacheServe))
        logEvent("tengu_mcp_discovery_source", {
          source: lit(discoverySourceLabel_2(cacheServe)),
          transportType: fromEnum(config.type ?? "stdio"),
          ...mcpBaseUrlAnalytics(config, serverName),
        });
      if (isSupersededDial_2(dial)) return;
      if (identityChangedForRemote(config)) {
        if (connection.type === "connected" && isSupersededCacheEntry_2(dial, serverName, config))
          detachAndCloseConnection_2(connection);
        return;
      }
      if (connection.type !== "connected") {
        publishServerResult(
          applyMcpServerConfig(config, {
            client: connection,
            tools: connection.type === "needs-auth" ? mcpAuthToolsFor(serverName, config) : [],
            commands: [],
          }),
        );
        return;
      }
      connection.discoveryBearerRejected = undefined;
      if (config.type !== "claudeai-proxy") clearMcpAuthCacheEntry(serverName, storageV5);
      if (config.type === "http" || config.type === "sse")
        await clearMcpOAuthStubIfTokenless(serverName, config);
      pendingDiscoveryTasks.push(
        (async () => {
          let published = false;
          try {
            let hasResourceCapability = !!connection.capabilities?.resources;
            clearDiscoveryPathMemo(serverName);
            let grantLeg = await cacheGrantLeg(serverName, config);
            if (isDiscoveryCacheOn() && (isSupersededDial_2(dial) || identityChangedForRemote(config))) {
              if (!isSupersededDial_2(dial) && isSupersededCacheEntry_2(dial, serverName, config))
                detachAndCloseConnection_2(connection);
              return;
            }
            let results = Promise.all([
              listMcpTools(connection, storageV5, listOptions),
              fetchCommandsForClient_2(connection),
              Promise.resolve([]),
            ]);
            let skipResources =
              streamResources === true &&
              (config.type === "claudeai-proxy"
                ? !!connection.capabilities?.tools || !!connection.capabilities?.prompts
                : config.type === "http" &&
                  isSameOriginAsCcr(config.url) &&
                  !isDiscoveryCacheEligible(config));
            let results_2 = Promise.all([
              hasResourceCapability && !skipResources
                ? fetchResourcesForClient_2(connection)
                : Promise.resolve([]),
              hasResourceCapability && isCacheableServer(connection.config)
                ? fetchResourceTemplatesForClient_2(connection)
                : Promise.resolve([]),
            ]);
            let parallelResources =
              streamResources === true &&
              hasResourceCapability &&
              (config.type === "http" || config.type === "sse") &&
              !isDiscoveryCacheOn();
            if (parallelResources) results_2.catch(() => {});
            let [[tools, commands, extraCommands], resourceResults] = await Promise.all([
              results,
              parallelResources ? undefined : results_2,
            ]);
            if (identityChangedForRemote(config)) {
              if (isSupersededCacheEntry_2(dial, serverName, config)) detachAndCloseConnection_2(connection);
              return;
            }
            if (isDiscoveryCacheOn() && isSupersededDial_2(dial)) return;
            if (isDiscoveryCacheOn() && isLatestDial && isSupersededCacheEntry_2(dial, serverName, config)) {
              if (
                connectToServer_2.cache?.get?.(serverCacheKey(serverName, config)) === undefined &&
                identityId2(connection.client).onclose !== undefined
              ) {
                detachAndCloseConnection_2(connection);
                publishServerResult({
                  client: {
                    name: serverName,
                    type: "failed",
                    config,
                    error: "Connection closed during discovery",
                    errorCode: "ConnectionClosed",
                  },
                  tools: [],
                  commands: [],
                });
              }
              return;
            }
            if (connection.discoveryAuthFailure) {
              publishServerResult({
                client: {
                  name: serverName,
                  type: "needs-auth",
                  config,
                },
                tools: mcpAuthToolsFor(serverName, config),
                commands: [],
              });
              return;
            }
            if (config.type === "claudeai-proxy" && !connection.discoveryBearerRejected)
              clearMcpAuthCacheEntry(serverName, storageV5);
            if (
              config.type === "claudeai-proxy" &&
              !connection.toolsListError &&
              !connection.discoveryBearerRejected
            )
              recordClaudeAiMcpConnected(serverName, storageV5);
            let commands_2 = [...commands, ...extraCommands];
            let publishConnection = (resources) => {
              let extraResourceTools = [];
              if (hasResourceCapability && !resourceToolsAdded) {
                resourceToolsAdded = true;
                extraResourceTools.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
              }
              publishServerResult(
                applyMcpServerConfig(config, {
                  client: connection,
                  tools: [...tools, ...extraResourceTools],
                  commands: commands_2,
                  resources: resources.length > 0 ? resources : undefined,
                  resourceTemplates: undefined,
                }),
              );
            };
            if (parallelResources) {
              publishConnection([]);
              published = true;
            }
            let [resources, templatesResult] = resourceResults ?? (await results_2);
            if (!hasResourceCapability) recordRawResourcesForResult_2(resources, []);
            let templates =
              getDiscoveryFetchError_2(templatesResult) === undefined ? templatesResult : undefined;
            let persistPromise =
              !isDiscoveryCacheOn() ||
              isSupersededDial_2(dial) ||
              isSupersededCacheEntry_2(dial, serverName, config) ||
              identityEpoch() !== epochAtStart ||
              isMcpServerDisabled(serverName) ||
              isMcpServerBlockedAtConnectTime(serverName, config)
                ? undefined
                : persistDiscovery(connection, {
                    tools,
                    commands,
                    resources,
                    templates,
                    identityEpoch: epochAtStart,
                    grantLeg,
                  });
            if (!parallelResources) publishConnection(resources);
            await persistPromise;
          } catch (error) {
            logMCPError(
              serverName,
              `Error fetching tools/commands/resources: ${describeConnectError(error, config)}`,
            );
            if (published) return;
            publishServerResult({
              client: {
                name: serverName,
                type: "failed",
                config,
              },
              tools: [],
              commands: [],
            });
          }
        })(),
      );
    } catch (error) {
      logMCPError(
        serverName,
        `Error fetching tools/commands/resources: ${describeConnectError(error, config)}`,
      );
      publishServerResult({
        client: {
          name: serverName,
          type: "failed",
          config,
        },
        tools: [],
        commands: [],
      });
    }
  };
  await Promise.all([
    processBatched_2(localServers, getMcpServerConnectionBatchSize(), processServer),
    processBatched_2(remoteServers, getRemoteMcpServerConnectionBatchSize(), processServer),
  ]);
  await Promise.all(pendingDiscoveryTasks);
}
//@ chunk-h44h5gdv.js:136122-136784 fingerprint (2.1.88 match: prefetchAllMcpResources, 1)
/**
 * prefetchAllMcpResources（v1 副本）。
 */
function prefetchAllMcpResources(mcpConfigs, storageV5, credentials) {
  return new Promise((resolve) => {
    let pendingCount = 0;
    let settledCount = 0;
    pendingCount = Object.keys(mcpConfigs).length;
    if (pendingCount === 0) {
      resolve({
        clients: [],
        tools: [],
        commands: [],
      });
      return;
    }
    let clients = [];
    let tools = [];
    let commands = [];
    let done = false;
    let finish = () => {
      if (done) return;
      done = true;
      let commandsMetadataLength = commands.reduce((sum, command) => {
        let commandMetadataLength =
          command.name.length + (command.description ?? "").length + (command.argumentHint ?? "").length;
        return sum + commandMetadataLength;
      }, 0);
      logEvent("tengu_mcp_tools_commands_loaded", {
        tools_count: tools.length,
        commands_count: commands.length,
        commands_metadata_length: commandsMetadataLength,
      });
      resolve({
        clients,
        tools,
        commands,
      });
    };
    getMcpToolsCommandsAndResources(
      (error) => {
        clients.push(error.client);
        tools.push(...error.tools);
        commands.push(...error.commands);
        settledCount++;
        if (settledCount >= pendingCount) finish();
      },
      mcpConfigs,
      storageV5,
      credentials,
    )
      .then(finish)
      .catch((error) => {
        logMCPError("prefetchAllMcpResources", `Failed to get MCP resources: ${errorMessage(error)}`);
        resolve({
          clients: [],
          tools: [],
          commands: [],
        });
      });
  });
}
//@ chunk-h44h5gdv.js:136784-137790 fingerprint (2.1.88 match: transformResultContent, 0.81)
/**
 * transformResultContent（v1 副本）。
 */
async function transformResultContent(
  resultContent,
  serverName,
  imageLimits,
  storageV5,
  keepMeta = false,
  block,
) {
  switch (resultContent.type) {
    case "text": {
      let textBlock = {
        type: "text",
        text: resultContent.text,
      };
      if (keepMeta) {
        let _meta = resultContent._meta;
        if (_meta) textBlock._meta = _meta;
      }
      return [textBlock];
    }
    case "audio": {
      let audioData = resultContent;
      return await persistBlobToTextBlock(
        Buffer.from(audioData.data, "base64"),
        audioData.mimeType,
        serverName,
        `[Audio from ${serverName}] `,
        storageV5,
      );
    }
    case "image": {
      if (normalizeImageMimeType(resultContent.mimeType))
        return await imageResultBlocks(
          Buffer.from(String(resultContent.data), "base64"),
          resultContent.mimeType,
          serverName,
          imageLimits,
          storageV5,
        );
      return await persistBlobToTextBlock(
        Buffer.from(String(resultContent.data), "base64"),
        resultContent.mimeType,
        serverName,
        `[Image from ${serverName}] `,
        storageV5,
      );
    }
    case "resource": {
      let resource = resultContent.resource;
      let prefix = `[Resource from ${serverName} at ${resource.uri}] `;
      if ("text" in resource)
        return [
          {
            type: "text",
            text: `${prefix}${resource.text}`,
          },
        ];
      else if ("blob" in resource)
        if (normalizeImageMimeType(resource.mimeType)) {
          let text_2 = await imageResultBlocks(
            Buffer.from(resource.blob, "base64"),
            resource.mimeType,
            serverName,
            imageLimits,
            storageV5,
            block,
          );
          let content = [];
          if (prefix)
            content.push({
              type: "text",
              text: prefix,
            });
          content.push(...text_2);
          return content;
        } else {
          let imageBuffer = Buffer.from(resource.blob, "base64");
          let storedMcpContent = toStoredMcpContent(imageBuffer, resource.mimeType, serverName);
          if (storedMcpContent) return [storedMcpContent];
          return await persistBlobToTextBlock(
            imageBuffer,
            resource.mimeType,
            serverName,
            prefix,
            storageV5,
            block,
          );
        }
      return [];
    }
    case "resource_link": {
      let resourceLink = resultContent;
      let text = `[Resource link: ${resourceLink.name}] ${resourceLink.uri}`;
      if (resourceLink.description) text += ` (${resourceLink.description})`;
      return [
        {
          type: "text",
          text,
        },
      ];
    }
    default:
      return [];
  }
}
//@ chunk-h44h5gdv.js:137790-137886 layout
/**
 * 生成二进制内容的随机文件名（旧副本）。
 */
function blobFileNameV1(serverName) {
  return `mcp-${CLAUDEAI_SERVER_PREFIX(serverName)}-blob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
//@ chunk-h44h5gdv.js:137886-138665 file-local
/**
 * MCP 图片结果的处理：缩放/降采样图片块，同时把原图保存成文件；保存成功时附一段带尺寸和文件路径的说明文本，历史持久化关闭或保存失败时只返回图片块。
 */
async function imageResultBlocks(base64Data, mediaType, serverName, imageLimits, storageV5, blob) {
  if (toolResultStoreOrNull() === undefined && addToHistory()) {
    logFeatureSad("mcp_image_result_file", "persistence_off");
    let { block } = await maybeResizeAndDownsampleImageBlock({
      data: base64Data,
      mediaType,
      limits: imageLimits,
    });
    blob?.(block.type === "image" ? "shown" : unreadOutcome(), base64Data.length);
    return [block];
  }
  let [{ block: imageBlock, dimensions }, saved] = await Promise.all([
    maybeResizeAndDownsampleImageBlock({
      data: base64Data,
      mediaType,
      limits: imageLimits,
    }),
    persistBinaryContent(
      base64Data,
      sniffImageMediaType(base64Data) ?? mediaType,
      blobFileNameV1(serverName),
      undefined,
      storageV5,
    ).catch((block) => {
      logError(block);
      return {
        error: "not saved",
      };
    }),
  ]);
  if ("error" in saved) {
    logFeatureSad("mcp_image_result_file", "not_saved");
    blob?.(imageBlock.type === "image" ? "shown" : unreadOutcome(), base64Data.length);
    return [imageBlock];
  }
  logFeatureOk("mcp_image_result_file");
  let persisted = toolResultStoreOrNull();
  let imageInfo = (imageBlock.type === "image" && persisted?.wantsPictureShrunk?.(base64Data) !== true
    ? null
    : await persisted?.readPicture?.(saved.filepath, base64Data)) ?? {
    block: imageBlock,
    dimensions,
  };
  blob?.(imageInfo.block.type === "image" ? "shown" : "saved", base64Data.length);
  let imageMetadataText = createImageMetadataText(imageInfo.dimensions ?? {}, saved.filepath);
  return imageMetadataText === null
    ? [imageInfo.block]
    : [
        imageInfo.block,
        {
          type: "text",
          text: imageMetadataText,
        },
      ];
}
//@ chunk-h44h5gdv.js:138726-139136 fingerprint (2.1.88 match: persistBlobToTextBlock, 0.687)
async function persistBlobToTextBlock(data, mimeType, serverName, prefixText, storageV5, resource) {
  let persistResult = await persistBinaryContent(
    data,
    mimeType,
    blobFileNameV1(serverName),
    undefined,
    storageV5,
  ).catch((error) => {
    resource?.(unreadOutcome(), data.length);
    throw error;
  });
  if ("error" in persistResult) {
    resource?.(unreadOutcome(), data.length);
    if (toolResultStoreOrNull() !== undefined)
      return [
        {
          type: "text",
          text: binaryNotSavedNotice(mimeType, data.length),
        },
      ];
    return [
      {
        type: "text",
        text: `${prefixText}Binary content (${mimeType || "unknown type"}, ${data.length} bytes) could not be saved to disk: ${persistResult.error}`,
      },
    ];
  }
  resource?.("saved", data.length);
  return [
    {
      type: "text",
      text: getBinaryBlobSavedMessage(persistResult.filepath, mimeType, persistResult.size, prefixText),
    },
  ];
}
//@ chunk-h44h5gdv.js:139136-139455 fingerprint (2.1.88 match: inferCompactSchema, 1)
/**
 * inferCompactSchema（v1 副本）。
 */
function inferCompactSchema(value, depth = 2) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${inferCompactSchema(value[0], depth - 1)}]`;
  }
  if (typeof value === "object") {
    if (depth <= 0) return "{...}";
    let props = Object.entries(value)
      .slice(0, 10)
      .map(([k, v]) => `${k}: ${inferCompactSchema(v, depth - 1)}`);
    let suffix = Object.keys(value).length > 10 ? ", ..." : "";
    return `{${props.join(", ")}${suffix}}`;
  }
  return typeof value;
}
//@ chunk-h44h5gdv.js:139455-139603 layout
async function transformContentArray(content, serverName, contents, storageV5, context) {
  let blocks = (
    await Promise.all(
      content.map((block) => transformResultContent(block, serverName, contents, storageV5, true, context)),
    )
  ).flat();
  return {
    content: blocks,
    type: "contentArray",
    schema: inferCompactSchema(stripTextBlockMeta(blocks)),
  };
}
//@ chunk-h44h5gdv.js:139603-140620 fingerprint (2.1.88 match: transformMCPResult, 0.902)
/**
 * transformMCPResult（v1 副本）。
 */
async function transformMCPResult(result, tool, name, value, storageV5, context) {
  if (result && typeof result === "object") {
    if ("toolResult" in result)
      return {
        content: String(result.toolResult),
        type: "toolResult",
      };
    if ("structuredContent" in result && result.structuredContent !== undefined) {
      if ("content" in result && Array.isArray(result.content)) {
        let contentResult = await contentOverStructuredResult(result.content, (blocks) =>
          transformContentArray(blocks, name, value, storageV5),
        );
        if (contentResult !== undefined) return contentResult;
      }
      let base64Text = base64URLEncode(result.structuredContent);
      let text = base64Text ?? jsonStringify(result.structuredContent);
      let schema = base64Text === undefined ? inferCompactSchema(result.structuredContent) : undefined;
      if ("content" in result && Array.isArray(result.content)) {
        let filtered = result.content.filter(
          (block) => block && typeof block === "object" && "type" in block && block.type !== "text",
        );
        if (filtered.length > 0) {
          let transformedContent = (
            await Promise.all(
              filtered.map((item) => transformResultContent(item, name, value, storageV5, true)),
            )
          ).flat();
          if (transformedContent.length > 0) {
            let contentWithText = [
              ...transformedContent,
              {
                type: "text",
                text,
              },
            ];
            return {
              content: contentWithText,
              type: "contentArray",
              schema: inferCompactSchema(stripTextBlockMeta(contentWithText)),
            };
          }
        }
      }
      return {
        content: text,
        type: "structuredContent",
        schema,
      };
    }
    if ("content" in result && Array.isArray(result.content))
      return transformContentArray(result.content, name, value, storageV5, context);
  }
  let errorMessage = `MCP server "${name}" tool "${tool}": unexpected response format`;
  logMCPError(name, errorMessage);
  throw Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      errorMessage,
      "MCP tool unexpected response format",
    ),
    {
      mcpErrorSource: "downstream_error",
    },
  );
}
//@ chunk-h44h5gdv.js:140620-140729 layout (2.1.88 match: isMedia, 1)
function isMedia(block) {
  if (!block || typeof block === "string") return false;
  return block.some((block) => block.type === "image" || block.type === "document");
}
//@ chunk-h44h5gdv.js:140729-142927 fingerprint (2.1.88 match: processMCPResult, 0.694)
/**
 * processMCPResult（v1 副本）。
 */
async function processMCPResult(
  result,
  tool,
  name,
  imageLimits,
  hasResultSizeAnnotation,
  storageV5,
  credentials,
  resultNotForModel,
  input,
  input_2,
) {
  if (
    resultNotForModel &&
    result !== null &&
    typeof result === "object" &&
    !("toolResult" in result) &&
    "content" in result &&
    Array.isArray(result.content)
  )
    return result.content;
  let transformed = await transformMCPResult(result, tool, name, imageLimits, storageV5, input);
  let { type, schema } = transformed;
  let content = dropExtraDocumentBlocks(transformed.content);
  if (name === "ide") return content;
  if (resultNotForModel || (hasResultSizeAnnotation && !isMedia(content))) {
    noteResult(input_2, "kept_in_conversation", content);
    return content;
  }
  if (!(await mcpContentNeedsTruncation(content, credentials))) {
    noteResult(input_2, "kept_in_conversation", content);
    return content;
  }
  let sizeEstimateTokens = getContentSizeEstimate(content);
  if (env.ENABLE_MCP_LARGE_OUTPUT_FILES === false) {
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("env_disabled"),
      sizeEstimateTokens,
    });
    noteResult(input_2, "cut_not_saved", content);
    return await truncateMcpContentIfNeeded(content, credentials);
  }
  if (!content) return content;
  if (isMedia(content)) {
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("contains_images"),
      sizeEstimateTokens,
    });
    return await truncateMcpContentIfNeeded(content, credentials);
  }
  let timestamp = Date.now();
  let persistId = `mcp-${CLAUDEAI_SERVER_PREFIX(name)}-${CLAUDEAI_SERVER_PREFIX(tool)}-${timestamp}`;
  let contentWithoutMeta = stripTextBlockMeta(content);
  let canUnwrapSingleton =
    useSubagentTruncationPrompt() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_singleton_unwrap", true);
  let blockCount = Array.isArray(contentWithoutMeta) ? contentWithoutMeta.length : undefined;
  let text =
    canUnwrapSingleton &&
    Array.isArray(contentWithoutMeta) &&
    contentWithoutMeta.length === 1 &&
    contentWithoutMeta[0]?.type === "text" &&
    !("annotations" in contentWithoutMeta[0]) &&
    !("_meta" in contentWithoutMeta[0])
      ? contentWithoutMeta[0].text
      : undefined;
  let textForFile =
    typeof contentWithoutMeta === "string"
      ? contentWithoutMeta
      : (text ?? jsonStringify(contentWithoutMeta, null, 2));
  let countsAsText = type === "toolResult" || text !== undefined;
  let persistedFormat = countsAsText ? "text" : "json";
  let lineStats;
  if (countsAsText) {
    let lines = textForFile.split(`
`);
    if (lines.length > 1 && lines.at(-1) === "") lines.pop();
    let maxLineLength = 0;
    for (let line of lines) if (line.length > maxLineLength) maxLineLength = line.length;
    lineStats = {
      count: lines.length,
      maxLen: maxLineLength,
    };
  }
  let persistResult = await persistToolResult(textForFile, persistId, toolResultsDir(), storageV5);
  if (isPersistError(persistResult)) {
    if (toolResultStoreOrNull() !== undefined) {
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("not_stored"),
        sizeEstimateTokens,
      });
      noteResult(input_2, "cut_not_saved", content);
      return await truncateMcpContent(content);
    }
    let contentLength = textForFile.length;
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("persist_failed"),
      sizeEstimateTokens,
    });
    noteResult(input_2, "save_failed", content);
    return `Error: result (${contentLength.toLocaleString()} characters) exceeds maximum allowed tokens. Failed to save output to file: ${persistResult.error}. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data.`;
  }
  logEvent("tengu_mcp_large_result_handled", {
    outcome: lit("persisted"),
    reason: lit("file_saved"),
    sizeEstimateTokens,
    persistedSizeChars: persistResult.originalSize,
    truncatedAtCap: persistResult.truncatedAtBytes !== undefined,
    resultType: fromEnum(type),
    blockCount,
    persistedAs: fromEnum(persistedFormat),
  });
  noteResult(input_2, "saved_as_text", content);
  let formatDescription =
    text !== undefined ? getFormatDescription("toolResult") : getFormatDescription(type, schema);
  return getLargeOutputInstructions(
    persistResult.filepath,
    persistResult.originalSize,
    formatDescription,
    undefined,
    lineStats,
    persistResult.truncatedAtBytes,
  );
}
//@ chunk-h44h5gdv.js:142927-143099 layout
/**
 * parseUrlElicitationRequiredError：从工具调用错误 data 中取 elicitations 数组（URL elicitation required）。
 */
function parseUrlElicitationRequiredError(error) {
  let errorData = error.data;
  return (
    errorData != null &&
    typeof errorData === "object" &&
    "elicitations" in errorData &&
    Array.isArray(errorData.elicitations)
      ? errorData.elicitations
      : []
  ).filter((elicitation) => ElicitRequestURLParamsSchema.safeParse(elicitation).success);
}
//@ chunk-h44h5gdv.js:143099-143370 layout
/**
 * classifyToolCallAuthError：把工具调用认证错误分为 step_up（insufficient_scope）或 credential_rejected。
 */
function classifyToolCallAuthError({
  errorCode,
  message,
  isUnauthorizedError,
  isOAuthShapedAuthError,
  hasHeadersHelper,
  pendingStepUpScope,
}) {
  let hasPendingStepUp = pendingStepUpScope !== undefined;
  if (!(
    errorCode === 401 ||
    isUnauthorizedError ||
    isOAuthShapedAuthError ||
    (errorCode === 403 && hasHeadersHelper) ||
    (hasPendingStepUp && errorCode === 403)
  ))
    return;
  return hasPendingStepUp && errorCode !== 401 && !(isOAuthShapedAuthError && /^HTTP 401\b/.test(message))
    ? "step_up"
    : "credential_rejected";
}
//@ chunk-h44h5gdv.js:143370-143595 layout
function isNeedsApprovalOrExpiredSessionV1(error) {
  if (isRefusedByCcrProxy(error)) return true;
  if (!(error instanceof Error) || !("code" in error)) return false;
  if (error.code === CCR_NEEDS_APPROVAL_CODE) {
    let errorData = "data" in error ? error.data : undefined;
    return typeof errorData === "object" && errorData !== null && "args_sha256" in errorData;
  }
  return error.code === -32000 && isApprovalMismatchMessage(error.message);
}
//@ chunk-h44h5gdv.js:143595-148380 fingerprint (2.1.88 match: callMCPToolWithUrlElicitationRetry, 0.41)
/**
 * callMCPToolWithUrlElicitationRetry：调用工具，遇 URL elicitation required 错误时逐个处理 elicitation（打开 URL、等待完成）后重试。
 */
async function callMCPToolWithUrlElicitationRetry_2({
  client,
  clientConnection,
  tool,
  args,
  meta,
  signal,
  onProgress,
  callToolFn = callMCPTool_2,
  requestDialog,
  hasResultSizeAnnotation = false,
  resultNotForModel = false,
  imageLimits,
  taskRegistry,
  toolUseId,
  onAwaitingUserInput,
  timing,
  ccrNeedsApprovalRetry,
  storageV5,
  credentials,
  offCriticalPath,
}) {
  let didNeedsApprovalRetry = false;
  for (let attempt = 0; ; attempt++)
    try {
      let invokeCallTool = () =>
        callToolFn({
          client,
          tool,
          args,
          meta,
          offCriticalPath,
          signal,
          onProgress,
          hasResultSizeAnnotation,
          resultNotForModel,
          imageLimits,
          timing,
          taskRegistry,
          toolUseId,
          storageV5,
          credentials,
        });
      let callResult;
      if (!isPerfettoTracingEnabled()) callResult = await invokeCallTool();
      else {
        let argsForTelemetry;
        try {
          argsForTelemetry = truncateContentForTelemetry(jsonStringify(args)).content;
        } catch {
          argsForTelemetry = undefined;
        }
        let isMemoryServer = isMemoryServerConnection(client, tool);
        let fileReferenceTool = fileReferenceToolForRecords(client, tool);
        let withholdArgs = isMemoryServer || withholdsFileReferenceArguments(fileReferenceTool, toolUseId);
        let withholdErrorText = withholdsFileReferenceErrorText(fileReferenceTool, toolUseId);
        if (withholdArgs && argsForTelemetry !== undefined)
          argsForTelemetry = notRecordedLength(argsForTelemetry);
        callResult = await withToolExecutionSpan(
          "claude_code.mcp.rpc",
          {
            spanType: "mcp.rpc",
            attrs: {
              "rpc.system": "mcp",
              "rpc.service": client.name,
              "rpc.method": "tools/call",
              mcp_tool: tool,
              attempt,
            },
            ...(argsForTelemetry !== undefined && {
              contentAttrs: {
                mcp_args: argsForTelemetry,
              },
            }),
            withholdErrorText: (spanError) =>
              withholdErrorText ||
              (isMemoryServer &&
                spanError instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS),
            isExpectedError: (spanError) =>
              spanError instanceof McpError &&
              (spanError.code === ErrorCode.UrlElicitationRequired ||
                (spanError.code === CCR_NEEDS_APPROVAL_CODE &&
                  typeof spanError.data === "object" &&
                  spanError.data !== null &&
                  "args_sha256" in spanError.data &&
                  !!ccrNeedsApprovalRetry &&
                  !!toolUseId &&
                  !didNeedsApprovalRetry &&
                  getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_proxy_needs_approval_retry", true))),
          },
          invokeCallTool,
        );
      }
      if (didNeedsApprovalRetry) logFeatureOk("mcp_ccr_needs_approval");
      return callResult;
    } catch (error) {
      if (!(error instanceof McpError)) {
        if (didNeedsApprovalRetry && !(error instanceof McpSessionExpiredError))
          logFeatureBad("mcp_ccr_needs_approval", "retry_failed");
        throw error;
      }
      if (
        error.code === CCR_NEEDS_APPROVAL_CODE &&
        typeof error.data === "object" &&
        error.data !== null &&
        "args_sha256" in error.data &&
        ccrNeedsApprovalRetry &&
        toolUseId &&
        !didNeedsApprovalRetry &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_proxy_needs_approval_retry", true)
      ) {
        didNeedsApprovalRetry = true;
        let errorData = error.data ?? {};
        let {
          canUseTool,
          tool: tool_2,
          fullyQualifiedName,
          toolUseContext,
          parentMessage,
        } = ccrNeedsApprovalRetry;
        let chromeSite = chromeSiteFromError(client, error.data);
        let denyCheck =
          chromeSite && chromeSiteDenyCheck(chromeSite, getToolPermissionContext(toolUseContext));
        if (denyCheck) {
          let siteUnreadable = chromeSite?.kind === "unreadable";
          logMCPDebug(
            client.name,
            `Tool '${tool}' returned -32003 needs_approval ${siteUnreadable ? "naming a site this session cannot read, and the session has ClaudeInChromeDomain deny rules" : "for a site a ClaudeInChromeDomain deny rule covers"}: failing the call with no approval card`,
          );
          if (siteUnreadable) logFeatureBad("chrome_permission_prompt", "hosted_site_unreadable");
          else logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
          await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, denyCheck);
          toolUseContext.onPermissionDenial?.(tool_2, toolUseId, args);
          throw markRefusedByCcrProxy(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              denyCheck.message,
              "ccr_proxy_needs_approval_chrome_site_denied",
            ),
          );
        }
        logMCPDebug(
          client.name,
          `Tool '${tool}' returned -32003 needs_approval (tool_name=${errorData.tool_name}) \u2014 surfacing retroactive ` +
            "approval card",
        );
        logEvent("tengu_mcp_proxy_needs_approval_retry", {
          attempt,
        });
        onAwaitingUserInput?.(true);
        let genericAsk = {
          behavior: "ask",
          suppressAlwaysAllowRule: true,
          message: `The ${fullyQualifiedName} connector requires approval for this call.`,
          decisionReason: {
            type: "other",
            reason: "This connector call requires your approval to proceed.",
          },
        };
        let chromeAsk = chromeSite && chromeSiteAsk(chromeSite, tool, args, toolUseContext);
        let askRequest = chromeAsk ?? genericAsk;
        let approval;
        try {
          approval = await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, askRequest);
        } finally {
          onAwaitingUserInput?.(false);
        }
        if (signal.aborted) throw markRefusedByCcrProxy(new AbortError());
        if (approval.behavior === "allow") {
          if (approval.updatedInput !== undefined && !import_sortedIndex_2(approval.updatedInput, args)) {
            logFeatureSad("mcp_ccr_needs_approval", "edited_input");
            throw markRefusedByCcrProxy(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `The approval for ${fullyQualifiedName} was conditioned on edited arguments, which can't be applied on this retroactive card. To run with different arguments, deny and re-issue the call.`,
                "ccr_proxy_needs_approval_edited_input",
              ),
            );
          }
          let resendRefusal = runDiscarder(toolUseContext.session, toolUseId);
          if (resendRefusal !== undefined)
            throw markRefusedByCcrProxy(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                resendRefusal,
                "ccr_proxy_needs_approval_resend_refused",
              ),
            );
          if (chromeSite?.kind === "named" && chromeAsk && meta)
            meta[CLAUDECODE_CHROMESITE] = chromeSite.site;
          if (meta)
            consumeTicketIntoInput(
              meta,
              toolUseContext.session,
              toolUseContext.toolUseId,
              client.name,
              client.config,
            );
          continue;
        }
        if (approval === askRequest) {
          logFeatureSad("mcp_ccr_needs_approval", "no_prompt_surface");
          throw markRefusedByCcrProxy(error);
        }
        logFeatureOk("mcp_ccr_needs_approval");
        throw markRefusedByCcrProxy(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            approval.message || `Approval denied for ${fullyQualifiedName}`,
            "ccr_proxy_needs_approval_denied",
          ),
        );
      }
      if (error.code !== ErrorCode.UrlElicitationRequired) {
        if (didNeedsApprovalRetry) logFeatureBad("mcp_ccr_needs_approval", "retry_failed");
        else if (error.code === CCR_NEEDS_APPROVAL_CODE && ccrNeedsApprovalRetry)
          logFeatureBad("mcp_ccr_needs_approval", "arm_not_fired");
        throw error;
      }
      if (hostedDesktopRefusal_2(clientConnection) !== undefined) throw error;
      if (attempt - (didNeedsApprovalRetry ? 1 : 0) >= 3) throw error;
      let urlElicitationRequiredError = parseUrlElicitationRequiredError(error);
      let serverName = clientConnection.name;
      if (urlElicitationRequiredError.length === 0) {
        logMCPDebug(serverName, `Tool '${tool}' returned -32042 but no valid elicitations in error data`);
        throw error;
      }
      logMCPDebug(
        serverName,
        `Tool '${tool}' requires URL elicitation (error -32042, attempt ${attempt + 1}), processing ${urlElicitationRequiredError.length} elicitation(s)`,
      );
      for (let elicitation of urlElicitationRequiredError) {
        let { elicitationId } = elicitation;
        let hookResponse = await runElicitationHooks_2(serverName, elicitation, signal);
        if (hookResponse) {
          logMCPDebug(
            serverName,
            `URL elicitation ${elicitationId} resolved by hook: ${jsonStringify(hookResponse)}`,
          );
          if (hookResponse.action !== "accept")
            return {
              content: `URL elicitation was ${hookResponse.action === "decline" ? "declined" : hookResponse.action + "ed"} by a hook. The tool "${tool}" could not complete because it requires the user to open a URL.`,
              urlElicitationDeclined: {
                url: elicitation.url,
              },
              isError: true,
            };
          continue;
        }
        let result;
        onAwaitingUserInput?.(true);
        try {
          result = requestDialog
            ? await requestDialog(
                MCP_URL_ELICITATION_DIALOG,
                {
                  serverName,
                  params: elicitation,
                },
                {
                  signal,
                },
              )
            : {
                action: "cancel",
              };
        } finally {
          onAwaitingUserInput?.(false);
        }
        let finalResult = await runElicitationResultHooks_2(serverName, result, signal, "url", elicitationId);
        if (finalResult.action !== "accept") {
          logMCPDebug(
            serverName,
            `User ${finalResult.action === "decline" ? "declined" : finalResult.action + "ed"} URL elicitation ${elicitationId}`,
          );
          return {
            content: `URL elicitation was ${finalResult.action === "decline" ? "declined" : finalResult.action + "ed"} by the user. The tool "${tool}" could not complete because it requires the user to open a URL.`,
            urlElicitationDeclined: {
              url: elicitation.url,
            },
            isError: true,
          };
        }
        logMCPDebug(serverName, `Elicitation ${elicitationId} completed, retrying tool call`);
      }
    }
}
//@ chunk-h44h5gdv.js:148380-148908 layout
function toolErrorResultText(result, serverName, formatForLog) {
  if (!result.isError) return;
  let errorText = "Unknown error";
  if (Array.isArray(result.content) && result.content.length > 0) {
    let flattened = result.content.flatMap((block) => {
      if (block == null || typeof block !== "object") return [];
      if ("text" in block) return [String(block.text)];
      if (block.type === "resource_link") {
        let link = block;
        let linkText = `[Resource link: ${link.name}] ${link.uri}`;
        if (link.description) linkText += ` (${link.description})`;
        return [linkText];
      }
      return [];
    });
    if (flattened.length > 0)
      errorText = flattened.join(`
`);
  } else if ("error" in result) errorText = String(result.error);
  logMCPError(serverName, formatForLog === undefined ? errorText : formatForLog(errorText));
  let meta = stripAnthropicMeta(result._meta);
  throw new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    errorText,
    "MCP tool returned error",
    meta
      ? {
          _meta: meta,
        }
      : undefined,
  );
}
//@ chunk-h44h5gdv.js:148908-149085 layout
/**
 * buildSep2663TaskBinding：SEP-2663 任务绑定（implementation、serverCapabilities 与 tool/prompt/resource 回调）。
 */
function buildSep2663TaskBinding() {
  return {
    implementation: ImplementationSchema,
    serverCapabilities: ServerCapabilitiesSchema,
    tool: ToolSchema,
    prompt: PromptSchema,
    resource: ResourceSchema,
    resourceTemplate: ResourceTemplateSchema,
    contentBlock: CompatibilityCallToolResultSchema.options[0].shape.content.unwrap().element,
  };
}
//@ chunk-h44h5gdv.js:149085-149135 layout
/**
 * 调用旧客户端的 listTools。
 */
function listToolsV1(client, requestOptions) {
  return identityId2(client).listTools(undefined, requestOptions);
}
//@ chunk-h44h5gdv.js:149135-149191 layout
/**
 * 调用旧客户端的 readResource。
 */
function readResourceV1(client, uri, requestOptions) {
  return identityId2(client).readResource(
    {
      uri,
    },
    requestOptions,
  );
}
//@ chunk-h44h5gdv.js:149191-149244 layout
/**
 * 调用旧客户端的 callTool。
 */
function callToolV1(client, params, requestOptions) {
  return identityId2(client).callTool(params, undefined, requestOptions);
}
//@ chunk-h44h5gdv.js:149244-158180 fingerprint (2.1.88 match: callMCPTool, 0.369)
/**
 * callMCPTool：真正发出 tools/call：总超时与空闲超时看门狗、进度上报、401/会话过期时刷新凭证/重连后重试一次、step-up 重新授权、错误分类与遥测，返回处理后的内容。
 */
async function callMCPTool_2({
  client,
  tool,
  args,
  meta,
  signal,
  onProgress,
  offCriticalPath = false,
  hasResultSizeAnnotation = false,
  resultNotForModel = false,
  imageLimits,
  timing,
  taskRegistry,
  toolUseId,
  idleTimeoutMs,
  isAuthRetry = false,
  storageV5,
  credentials,
}) {
  let { client: client_2, name: clientName, config, transportErrorState } = client;
  let sdkClient = identityId2(client_2);
  let fileReferenceTool = fileReferenceToolForRecords(client, tool);
  let withheldTool = withholdsFileReferenceErrorText(fileReferenceTool, toolUseId)
    ? fileReferenceTool
    : undefined;
  let formatErrorForLog = isMemoryServerConnection(client, tool)
    ? describeRedactedMcpError
    : withheldTool !== undefined
      ? (errorMessage) => withheldFileReferenceErrorForLog(withheldTool, errorMessage)
      : undefined;
  let toolStartTime = Date.now();
  let epochAtStart = identityEpoch();
  let hasNoSession = sdkClient.transport?.sessionId === undefined;
  let progressTimer;
  let metaToolUseId = meta?.["claudecode/toolUseId"];
  let watchdog = {
    armedAt: 0,
    offCriticalPath,
    toolUseId: typeof metaToolUseId === "string" ? metaToolUseId : undefined,
    ownSends: {
      started: 0,
      ranNothing: 0,
    },
  };
  transportErrorState?.activeCallWatchdogs.add(watchdog);
  let started = transportErrorState?.toolCallSends?.started;
  try {
    logMCPDebug(clientName, `Calling MCP tool: ${tool}`);
    let idleTimeout = idleTimeoutMs ?? getMcpToolIdleTimeoutMs(config);
    let lastActivityAt = toolStartTime;
    let rejectWatchdog;
    let promise = new Promise((resolve, reject) => {
      rejectWatchdog = reject;
    });
    progressTimer = setInterval(() => {
      let floored = Math.floor((Date.now() - toolStartTime) / 1000);
      logMCPDebug(clientName, `Tool '${tool}' still running (${floored}s elapsed)`);
      if (watchdog.armedAt > 0 && Date.now() - watchdog.armedAt > 90000) {
        logMCPDebug(
          clientName,
          `Tool '${tool}' aborting: transport error ${Math.floor((Date.now() - watchdog.armedAt) / 1000)}s ago, response presumed lost`,
        );
        rejectWatchdog(
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP server "${clientName}" transport dropped mid-call; response for tool "${tool}" was lost`,
              "MCP transport lost mid-call",
            ),
            {
              mcpErrorSource: "downstream_unreachable",
            },
          ),
        );
        return;
      }
      if (transportErrorState?.pendingElicitations) lastActivityAt = Date.now();
      else if (transportErrorState && transportErrorState.lastElicitationClosedAt > lastActivityAt)
        lastActivityAt = transportErrorState.lastElicitationClosedAt;
      if (idleTimeout > 0 && Date.now() - lastActivityAt > idleTimeout) {
        let elapsedSeconds = Math.floor((Date.now() - lastActivityAt) / 1000);
        logMCPDebug(
          clientName,
          `Tool '${tool}' aborting: no response or progress notification for ${elapsedSeconds}s (idle timeout ${Math.floor(idleTimeout / 1000)}s)`,
        );
        rejectWatchdog(
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP server "${clientName}" tool "${tool}" sent no response or progress for ${elapsedSeconds}s; aborting. If this server is configured in your MCP settings, set a per-server "timeout" (ms) to allow longer silent runs for just this server; otherwise set CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT (ms) globally (0 disables).`,
              "MCP tool idle timeout",
            ),
            {
              mcpErrorSource: "downstream_unreachable",
            },
          ),
        );
      }
    }, 30000);
    let mcpToolTimeoutMs = getMcpToolTimeoutMs(config);
    let timeoutTimer;
    let timeoutPromise = new Promise((resolve, reject) => {
      timeoutTimer = setTimeout(
        (reject, name, tool, timeoutMs) => {
          reject(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `MCP server "${name}" tool "${tool}" timed out after ${Math.floor(timeoutMs / 1000)}s`,
                "MCP tool timeout",
              ),
              {
                mcpErrorSource: "downstream_unreachable",
              },
            ),
          );
        },
        mcpToolTimeoutMs,
        reject,
        clientName,
        tool,
        mcpToolTimeoutMs,
      );
    });
    let cleanupTimers = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (progressTimer !== undefined) {
        clearInterval(progressTimer);
        progressTimer = undefined;
      }
      transportErrorState?.activeCallWatchdogs.delete(watchdog);
    };
    let externalMark = timing?.mark("external");
    let result = await Promise.race([
      sdkClient.callTool(
        {
          name: tool,
          arguments: args,
          _meta: meta,
        },
        CallToolResultSchema,
        {
          signal,
          timeout: mcpToolTimeoutMs,
          onprogress: (sdkProgress) => {
            watchdog.armedAt = 0;
            lastActivityAt = Date.now();
            netModule?.reportBackgroundProgress(signal, sdkProgress);
            if (onProgress)
              onProgress({
                type: "mcp_progress",
                status: "progress",
                serverName: clientName,
                toolName: tool,
                progress: sdkProgress.progress,
                total: sdkProgress.total,
                progressMessage: sdkProgress.message,
              });
          },
        },
      ),
      timeoutPromise,
      promise,
    ]).finally(() => {
      cleanupTimers();
      externalMark?.();
    });
    toolErrorResultText(result, clientName, formatErrorForLog);
    let elapsedMs = Date.now() - toolStartTime;
    let elapsedLabel =
      elapsedMs < 1000
        ? `${elapsedMs}ms`
        : elapsedMs < 60000
          ? `${Math.floor(elapsedMs / 1000)}s`
          : `${Math.floor(elapsedMs / 60000)}m ${Math.floor((elapsedMs % 60000) / 1000)}s`;
    logMCPDebug(clientName, `Tool '${tool}' completed successfully in ${elapsedLabel}`);
    let codeIndexingTool = detectCodeIndexingFromMcpServerName(clientName);
    if (codeIndexingTool)
      logEvent("tengu_code_indexing_tool_used", {
        tool: fromEnum(codeIndexingTool),
        source: lit("mcp"),
        success: true,
      });
    let content = await processMCPResult(
      result,
      tool,
      clientName,
      imageLimits,
      hasResultSizeAnnotation,
      storageV5,
      credentials,
      resultNotForModel,
      attachmentNoteFor(client, tool),
      textResultToolUseId(client, tool, toolUseId, result),
    );
    noteHearthDegraded(clientName, undefined);
    return {
      content,
      _meta: result._meta,
      structuredContent: result.structuredContent,
      resourceLinks: anthropicResourceLinks(result.content),
    };
  } catch (error) {
    if (!signal.aborted) noteHearthDegraded(clientName, error);
    if (progressTimer !== undefined) clearInterval(progressTimer);
    transportErrorState?.activeCallWatchdogs.delete(watchdog);
    let elapsedMs = Date.now() - toolStartTime;
    if (error instanceof Error && error.name !== "AbortError")
      logMCPDebug(
        clientName,
        `Tool '${tool}' failed after ${Math.floor(elapsedMs / 1000)}s: ${formatErrorForLog !== undefined && error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? formatErrorForLog(error.message) : withheldTool !== undefined ? withheldFileReferenceErrorForLog(withheldTool, error.message, error.name) : describeConnectError(error, config)}`,
      );
    if (error instanceof Error) {
      let errorCode = error instanceof McpError ? undefined : "code" in error ? error.code : undefined;
      let hasHeadersHelper =
        (config.type === "http" || config.type === "sse" || config.type === "ws") && !!config.headersHelper;
      let isSessionExpired = hasCliOwnedBearer(config);
      let isOAuthShapedAuthError =
        "errorCode" in error &&
        typeof error.errorCode === "string" &&
        !["invalid_grant", "invalid_client", "unauthorized_client"].includes(error.errorCode) &&
        /^HTTP 40[13]\b/.test(error.message);
      let pendingStepUpScope = getCliOwnedState().clientAuthProviders.get(
        identityId2(client_2),
      )?.pendingStepUpScope;
      let authErrorKind = classifyToolCallAuthError({
        errorCode,
        message: error.message,
        isUnauthorizedError: error instanceof UnauthorizedError,
        isOAuthShapedAuthError,
        hasHeadersHelper,
        pendingStepUpScope,
      });
      let oauthConfig =
        (config.type === "http" || config.type === "sse") &&
        !config.headersHelper &&
        !configHasAuthorizationHeader(config)
          ? config
          : undefined;
      let shouldReauth =
        !isAuthRetry &&
        authErrorKind === "credential_rejected" &&
        !hasHeadersHelper &&
        oauthConfig !== undefined;
      let hasRefreshTokenStored = shouldReauth && (await hasStoredRefreshToken(clientName, oauthConfig));
      let shouldRetryAuth =
        hasRefreshTokenStored ||
        (shouldReauth &&
          isSignedOutFallbackEnabled() &&
          getCliOwnedState().clientAuthProviders.get(identityId2(client_2))?.lastAuthRejection?.status ===
            401 &&
          getCliOwnedState().clientAuthProviders.get(identityId2(client_2))?.lastAuthRejection
            ?.accessToken !== undefined);
      if ((hasHeadersHelper || isSessionExpired || oauthConfig !== undefined) && !isAuthRetry) {
        let cacheKey = serverCacheKey(clientName, config);
        if (identityEpoch() !== epochAtStart)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `MCP tool call to server "${clientName}" was aborted: the account changed before re-authentication`,
            "MCP tool call aborted: account changed before reauth",
          );
        let reauthInFlight = getConnectionCache().reauthInFlight;
        let cliOwnedState = getCliOwnedState();
        let existingReauth = reauthInFlight.get(cacheKey);
        let promise =
          existingReauth !== undefined && existingReauth.epoch === epochAtStart
            ? existingReauth.promise
            : undefined;
        cliOwnedState.reauthDecisionSinkForTest?.(
          promise !== undefined ? "joined" : existingReauth !== undefined ? "stale_refused" : "started",
        );
        let isCollateralClose =
          promise !== undefined &&
          error instanceof McpError &&
          error.code === ErrorCode.ConnectionClosed &&
          !isTruncatedBodyError(transportErrorState?.closeReason);
        if (
          (isCollateralClose ||
            (authErrorKind === "credential_rejected" && hasHeadersHelper) ||
            (authErrorKind === "credential_rejected" && isSessionExpired) ||
            shouldRetryAuth) &&
          !isMcpServerDisabled(clientName) &&
          !isMcpServerBlockedAtConnectTime(clientName, config)
        ) {
          logMCPDebug(
            clientName,
            hasHeadersHelper
              ? `Tool '${tool}' returned ${errorCode ?? 401}; re-running headersHelper and retrying once`
              : isSessionExpired
                ? `Tool '${tool}' returned ${errorCode ?? 401}; session credential rejected \u2014 reconnecting and retrying once`
                : isCollateralClose
                  ? `Tool '${tool}' failed because a reconnect in progress closed its connection; retrying once on the new connection`
                  : `Tool '${tool}' returned ${errorCode ?? 401}; ${hasRefreshTokenStored ? "refresh token stored" : "stored sign-in rejected, no refresh token"} \u2014 reconnecting and retrying once`,
          );
          if (isCollateralClose)
            logFeatureSad(hasHeadersHelper ? "mcp_headers_helper" : "mcp_oauth_refresh", "collateral_rejoin");
          if (!promise) {
            logFeatureSad(
              hasHeadersHelper
                ? "mcp_headers_helper"
                : shouldRetryAuth && !hasRefreshTokenStored
                  ? "mcp_signed_out_fallback"
                  : "mcp_oauth_refresh",
              "reauth_retry",
            );
            sdkClient.onclose = undefined;
            let reauthEpoch = epochAtStart;
            promise = (async () => {
              await clearServerCache_3(clientName, config);
              return connectToServer_2(clientName, config, undefined, undefined, credentials);
            })();
            let reauthEntry = {
              promise,
              epoch: reauthEpoch,
            };
            reauthInFlight.set(cacheKey, reauthEntry);
            promise
              .then((reconnected) => {
                if (reconnected.type === "connected" && identityEpoch() === reauthEpoch)
                  REAUTH_RECONNECT_SIGNAL.emit(clientName, config);
              })
              .finally(() => {
                if (
                  reauthInFlight.get(cacheKey) === reauthEntry &&
                  !cliOwnedState.holdStaleReauthEntryForTest
                )
                  reauthInFlight.delete(cacheKey);
              })
              .catch(() => {});
          }
          let newConnection = await promise;
          if (identityEpoch() !== epochAtStart) {
            if (newConnection.type === "connected") await detachAndCloseConnection_2(newConnection);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP tool call to server "${clientName}" was aborted: the account changed during re-authentication`,
              "MCP tool call aborted: account changed during reauth",
            );
          }
          if (
            newConnection.type === "connected" &&
            (isMcpServerDisabled(clientName) || isMcpServerBlockedAtConnectTime(clientName, config))
          )
            await clearServerCache_3(clientName, config);
          else if (newConnection.type === "connected")
            return callMCPTool_2({
              client: newConnection,
              tool,
              args,
              meta,
              signal,
              onProgress,
              offCriticalPath,
              hasResultSizeAnnotation,
              resultNotForModel,
              timing,
              imageLimits,
              taskRegistry,
              toolUseId,
              idleTimeoutMs,
              isAuthRetry: true,
              storageV5,
              credentials,
            });
          logMCPDebug(
            clientName,
            `Auth reconnect returned '${newConnection.type}'; falling through to needs-auth`,
          );
          if (isDiscoveryCacheOn() && newConnection.type !== "needs-auth") {
            let cachedDial = connectToServer_2.cache?.get?.(cacheKey);
            if (
              cachedDial !== undefined &&
              (await settleDialOrUndefined(cachedDial)) === newConnection &&
              connectToServer_2.cache?.get?.(cacheKey) === cachedDial
            )
              getConnectionCache().connections.delete(cacheKey);
          }
        }
      }
      if (authErrorKind === "credential_rejected" && isSessionExpired) {
        await clearServerCache_3(clientName, config);
        logMCPDebug(
          clientName,
          `Tool '${tool}' rejected the session credential (${errorCode ?? 401}); failing the call and clearing the connection for a fresh retry later`,
        );
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            AUTH_MESSAGES.sessionCredentialRejected(clientName, errorCode ?? 401),
            "MCP server rejected the session credential",
          ),
          {
            mcpErrorSource: "other",
          },
        );
      }
      if (authErrorKind !== undefined) {
        let isIneligibleProxy = config.type === "claudeai-proxy" && config.eligible === false;
        let authErrorKind_2 = isIneligibleProxy
          ? "not_connected"
          : authErrorKind === "step_up"
            ? "insufficient_scope"
            : "token_expired";
        logMCPDebug(
          clientName,
          authErrorKind_2 === "insufficient_scope"
            ? `Tool call returned 403 insufficient_scope (scope: ${redactSensitiveUrlParams("scope", pendingStepUpScope ?? "")})`
            : "Tool call returned 401 Unauthorized - token may have expired",
        );
        let serverFields = mcpBaseUrlAnalytics(config, clientName);
        let loggable = isMcpServerLoggableInAnalytics(clientName, config);
        logEvent("tengu_mcp_tool_call_auth_error", {
          errorCode: fromNumber(errorCode ?? (authErrorKind === "step_up" ? 403 : 401)),
          transportType: fromEnum(config.type ?? "stdio"),
          authErrorKind: fromEnum(authErrorKind_2),
          ...serverFields,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(CLAUDEAI_SERVER_PREFIX(clientName), loggable),
          mcpToolName: loggableMcpToolName(
            CLAUDEAI_SERVER_PREFIX(clientName),
            CLAUDEAI_SERVER_PREFIX(tool),
            loggable,
          ),
        });
        let hasAuthHeader =
          (config.type === "http" || config.type === "sse") && configHasAuthorizationHeader(config);
        throw new McpAuthError(
          clientName,
          isIneligibleProxy
            ? AUTH_MESSAGES.notConnected(clientName)
            : authErrorKind_2 === "insufficient_scope"
              ? AUTH_MESSAGES.stepUp(clientName, pendingStepUpScope)
              : hasHeadersHelper
                ? AUTH_MESSAGES.helperRejected(clientName)
                : hasAuthHeader
                  ? AUTH_MESSAGES.headerRejected(clientName)
                  : AUTH_MESSAGES.signInAgain(clientName, config),
          authErrorKind_2,
          getCliOwnedState().clientFirstPartyBearers.get(identityId2(client_2))?.last,
          authErrorKind_2 === "insufficient_scope" ? pendingStepUpScope : undefined,
        );
      }
      let isSessionExpired_2 =
        !(config.type === "http" && errorCode === 404 && hasNoSession) && isMcpSessionExpiredError_2(error);
      let isClosedBeforeAnswer =
        "code" in error &&
        error.code === -32000 &&
        error.message.includes("Connection closed") &&
        (config.type === "http" || config.type === "claudeai-proxy");
      if (error instanceof HttpBodyOverflowError) {
        noteGmailAttachmentNotRead(client, tool, "too_large");
        noteGmailAttachmentShown(client, tool, "http body overflow");
        throw new McpToolResultNotReadError(clientName, tool, {
          kind: "too_large",
          capBytes: HTTP_BODY_LIMITS,
        });
      }
      if (isClosedBeforeAnswer && isTruncatedBodyError(transportErrorState?.closeReason)) {
        noteGmailAttachmentNotRead(client, tool, "connection_closed");
        noteGmailAttachmentShown(client, tool, transportErrorState?.closeReason);
        throw new McpToolResultNotReadError(clientName, tool, {
          kind: "connection_closed",
        });
      }
      if (isSessionExpired_2 || isClosedBeforeAnswer) {
        logMCPDebug(
          clientName,
          `MCP session expired during tool call (${isSessionExpired_2 ? "stale session" : "connection closed"}), clearing connection cache for re-initialization`,
        );
        let serverFields = mcpBaseUrlAnalytics(config, clientName);
        let loggable = isMcpServerLoggableInAnalytics(clientName, config);
        let mcpToolName = loggableMcpToolName(
          CLAUDEAI_SERVER_PREFIX(clientName),
          CLAUDEAI_SERVER_PREFIX(tool),
          loggable,
        );
        logEvent("tengu_mcp_session_expired", {
          errorCode: errorCode !== undefined ? fromNumber(errorCode) : undefined,
          transportType: fromEnum(config.type ?? "stdio"),
          ...serverFields,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(CLAUDEAI_SERVER_PREFIX(clientName), loggable),
          mcpToolName,
        });
        await clearServerCache_3(clientName, config);
        let callRanNothing = didCallRunNothing(
          transportErrorState?.toolCallSends,
          started,
          watchdog.ownSends,
        );
        throw new McpSessionExpiredError(
          clientName,
          isSessionExpired_2
            ? "session_expired_404"
            : isMalformedAfterAuthChallenge(transportErrorState?.closeReason) ||
                (transportErrorState?.closeReason === "session expired" && callRanNothing)
              ? "connection_closed_call_refused"
              : !isAuthRetry && callRanNothing
                ? "connection_closed_call_not_run"
                : "connection_closed_http",
        );
      }
    }
    let errorLike = error;
    if (
      error instanceof ZodError ||
      ((errorLike?.name === "ZodError" || errorLike?.name === "$ZodError") &&
        Array.isArray(errorLike?.issues))
    )
      throw new McpResponseSchemaError(clientName, error);
    if (!(error instanceof Error) || error.name !== "AbortError") throw error;
    return {
      content: INTERRUPTED_CALL_NOTICE,
      interrupted: true,
      isError: true,
    };
  } finally {
    if (progressTimer !== undefined) clearInterval(progressTimer);
  }
}
//@ chunk-h44h5gdv.js:159663-161586 placement
async function connectAllMcpServers(sdkConfigs, sendMcpMessage, manifests, storageV5) {
  let clients = [];
  let tools = [];
  let commands = [];
  primeEnsureConnectedClient();
  let results = await Promise.allSettled(
    Object.entries(sdkConfigs).map(async ([key, config]) => {
      let transport = new SdkControlClientTransport(
        key,
        sendMcpMessage,
        validateHostManifest_2(key, manifests?.get(key)),
      );
      guardTransportSend(
        {
          name: key,
        },
        transport,
      );
      let client = new Client(
        {
          ...CLAUDE_CODE_SERVER_INFO,
          version:
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION ?? "unknown",
        },
        {
          capabilities: EMPTY_CAPABILITIES,
          ...(isDisklessContext() && {
            jsonSchemaValidator: NO_OP_SCHEMA_VALIDATOR,
          }),
        },
      );
      let timedOut = false;
      try {
        let connectPromise = client.connect(transport, {
          timeout: getConnectionTimeoutMs(),
        });
        if (
          !(await withDeadline(
            connectPromise.then(() => true),
            getConnectionTimeoutMs(),
          ))
        ) {
          connectPromise.catch(() => {});
          transport.close().catch(() => {});
          timedOut = true;
          throw makeConnectTimeoutError(
            `SDK MCP server "${key}" connection timed out after ${getConnectionTimeoutMs()}ms`,
          );
        }
        let capabilities = client.getServerCapabilities();
        let instructions = client.getInstructions();
        let instructions_2 = truncateServerInstructions_2(instructions, key);
        let connection = {
          type: "connected",
          serverInfo: client.getServerVersion(),
          name: key,
          capabilities: capabilities || {},
          instructions: instructions_2,
          client: identityId(client),
          config: {
            ...config,
            scope: "dynamic",
          },
          cleanup: async () => {
            await client.close();
          },
        };
        let cacheKey = serverCacheKey(connection.name, connection.config);
        getConnectionCache().toolLists.delete(cacheKey);
        let tools = [];
        if (capabilities?.tools) {
          let listed = await listMcpTools(connection, storageV5);
          tools.push(...listed);
        }
        let commands = [];
        logFeatureOk("mcp_sdk_connect");
        logManifestOutcomeV1(transport.manifestOutcome, true);
        return {
          client: connection,
          tools,
          commands,
        };
      } catch (error) {
        logFeatureBad("mcp_sdk_connect", timedOut ? "mcp_sdk_connect_timeout" : "mcp_sdk_connect_failed");
        logManifestOutcomeV1(transport.manifestOutcome, false);
        logMCPError(key, `Failed to connect SDK MCP server: ${error}`);
        return {
          client: {
            type: "failed",
            name: key,
            config: {
              ...config,
              scope: "user",
            },
          },
          tools: [],
          commands: [],
        };
      }
    }),
  );
  for (let outcome of results)
    if (outcome.status === "fulfilled") {
      clients.push(outcome.value.client);
      tools.push(...outcome.value.tools);
      commands.push(...outcome.value.commands);
    }
  if (clients.some((client) => client.type === "connected" && !!client.capabilities?.resources)) {
    if (
      ![ListMcpResourcesTool, ReadMcpResourceTool].some((resourceTool) =>
        tools.some((tool) => matchesToolName(tool, resourceTool.name)),
      )
    )
      tools.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
  }
  return {
    clients,
    tools,
    commands,
  };
}
//@ chunk-h44h5gdv.js:161586-161775 placement (2.1.88 match: clearServerCache, 0.581)
async function clearServerCache_2(clients) {
  await Promise.all(
    clients.map(async (client) => {
      if (client.type !== "connected") return;
      try {
        await client.cleanup();
      } catch (error) {
        logForDebugging(`MCP client cleanup failed for ${client.name}: ${error}`, {
          level: "error",
        });
      }
    }),
  );
}
//@ chunk-czq1j3j2.js:703312-703474 fingerprint (2.1.88 match: processBatched, 1)
async function processBatched(sessionSubagentsDir, timeWindow) {
  let transcripts = await listSubagentTranscripts(sessionSubagentsDir, timeWindow);
  let agentMetas = await pMap(
    transcripts.filter((transcript) => isSafeIdSegment(transcript.agentId)),
    (transcript) => readAgentMetaFiles(sessionSubagentsDir, transcript, timeWindow),
    {
      concurrency: MAX_META_READ_CONCURRENCY,
    },
  );
  return buildAgentTree(agentMetas.filter((agentMeta) => agentMeta !== null));
}
//@ chunk-dh16zjm4.js:17820-17877 fingerprint (2.1.88 match: isIncludedMcpTool, 1)
function isIncludedMcpTool(tool) {
  return !tool.name?.startsWith("mcp__ide__");
}
export {
  isEntryRowNotServed,
  refreshMcpServerTools,
  serverCacheKey,
  getMcpEntryRowNotServed,
  TRANSPORT_FALLBACK_TIMEOUT_MS,
  getConnectTimeoutMs,
  McpAuthError,
  McpSessionExpiredError,
  artifactsMcpClient,
  SWALLOW_SYMBOL,
  getConnectionTimeoutMs,
  REMOTE_CONNECT_TIMEOUT_MS,
  SHORT_RETRY_MS,
  useSubagentTruncationPrompt,
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  MCP_SERVER_NOT_ALLOWED_MESSAGE,
  isDesktopComputerUseCommand,
  isIncludedMcpTool,
  maxDescriptionLength,
  describeMissingRequiredArgs,
  configHash,
  getMcpAuthCache,
  McpToolFileInputRejectedError,
  loggingSafeOrigin,
  McpCredentialStoreUnavailableError,
  getHostedDesktopComputerUseConfig,
  processBatched,
  mcpBaseUrlAnalytics,
  setMcpAuthCacheEntry,
  NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS,
  connectToServer_2,
  truncateDescription,
  mapInTurns,
  shouldNormalizeRootCombinators,
  shouldDropInvalidToolSchemas,
  isIncludedMcpTool_2,
  logToolCallXmlInDescriptions,
  needsAuthCacheModuleV1,
  callMCPTool_2,
  artifactsMcpLaptopModuleV1,
  callMCPToolWithUrlElicitationRetry_2,
  isNeedsApprovalOrExpiredSessionV1,
  artifactPermissionRulesModuleV1,
  claudeDocsWakeModuleV1,
  stripTrailingInvokeSuffix,
  isIdeServer,
  listAllPages,
  transformResultContent,
  canonicalMcpConfigKey,
  hasNoTransport,
  isTimeoutError,
  MAX_LIST_PAGES,
  LIST_PAGE_DELAYS_MS,
  isRetryableListError,
  EMPTY_CAPABILITIES,
  CLAUDE_CODE_SERVER_INFO,
  ensureConnectedClient_2,
  ClaudeAiProxyBearerRejectedError,
  DESIGN_WRITE_TOOLS,
  JAVA_SDK_ELICITATION_HINT,
  LegacyDialectToleratingValidator,
  AUTH_CACHE_VERSION_2,
  applyCapabilityServeTimeMiss,
  sameConfigHash,
  countUnsettledByDeadline_2,
  askDesignConsent,
  mergeRequestHeaders,
  burnDiscoverPrior,
  callIdeTool_2,
  callMCPTool,
  callMCPToolWithUrlElicitationRetry,
  truncateServerInstructions,
  canPromptForPermission,
  classifyToolCallAuthError_2,
  closeAllClients,
  clearServerCache,
  completeResourceTemplateArgument,
  buildMcpTool,
  connectToServer,
  canAskDesignConsent,
  wrapFetchWithCcrSessionAuth,
  withProxyBearerRefresh,
  wrapFetchWithCliOwnedBearer,
  wrapFetchWithFirstPartyAuth,
  createSep2663TaskBinding,
  gateDesignWriteWithoutPlanToken,
  detachAndCloseConnection,
  discardMemoizedConnectResult,
  discoverySourceLabel,
  buildSep2663TaskBinding_2,
  disposeServerConnectionDetached,
  clearDiscoveryForServer,
  logMcpConnectionOtelEvent,
  ensureConnectedClient,
  primeClientResolvers,
  clearMcpDiscoveryCaches_2,
  evictStaleFailedConnectMemoForServe,
  parseUrlElicitationRequiredError_2,
  fetchCommandsForClient,
  fetchResourceTemplatesForClient,
  fetchResourcesForClient,
  fetchToolsForClient,
  getMcpRequestTimeoutMs_2,
  getDiscoveryFetchError,
  getListingDiscoverPrior,
  getMcpToolTimeoutMs_4,
  getMcpServerConnectionBatchSize_2,
  getMcpToolIdleTimeoutMs_2,
  getMcpToolTimeoutMs_3,
  callToolWithTimers,
  resolveVersionNegotiation,
  getRememberedLegacyPrior,
  getRemoteMcpServerConnectionBatchSize_2,
  getMcpRoots_2,
  getToolsListError,
  isUnsupportedVersionHttp400,
  hasLiveConnection,
  hasClearedCachedFailure,
  buildMcpPromptCommands,
  buildMcpToolsForClient,
  identityChangedReconnectResult_2,
  inferCompactSchema_2,
  invalidateMcpResourceListCaches,
  invokeToolRaw,
  isDiscoveryCacheMissRecoverable,
  isSupersededDial,
  isDesignServerConfig,
  isLocalMcpServer_2,
  isMcpAuthCached_2,
  isListenDenylisted,
  isNegotiationDenylisted,
  isMcpSessionExpiredError,
  shouldDropInvalidToolSchemas_2,
  shouldNormalizeRootCombinators_2,
  isTransientMcpError,
  listToolsBypassCache,
  classifyMcpConnectError,
  mcpIdentityChangedSinceLastCheck,
  mcpToolInputToAutoClassifierInput,
  notifyRootsListChanged_2,
  onMcpElicitRequest,
  onMcpElicitationComplete,
  onMcpNotification,
  onMcpPromptListChanged,
  onMcpResourceListChanged,
  onMcpToolListChanged,
  readNeedsConsentBit,
  clearCachedFailureFor,
  persistLiveListing,
  persistRawDiscoveryIfComplete,
  persistRefreshedToolsIfPresent,
  prefetchAllMcpResources_2,
  transformResult,
  readResourceBypassCache,
  reconnectMcpServer_2,
  proxyRequest,
  setDiscoveryFetchError,
  rememberDesignConsentAsk,
  recordRawCommandsForResult,
  recordRawResourcesForResult,
  recordRawToolsForResult,
  fetchResourceTemplatesForClients,
  clearMcpAuthCacheEntry_2,
  classifyTransportKind,
  runCachedFirstDialArms,
  sanitizeConnectErrorCodeForTelemetry,
  seedMcpIdentityCheck,
  isDocumentsPluginServer_2,
  setHoldStaleReauthEntryForTest_2,
  setReauthDecisionSinkForTest,
  setStdioProbeTimeoutMsForTest,
  setupSdkMcpClients,
  isDesignGatedTool,
  takeDesignConsentAsk,
  takeSettledCachedDialFailure,
  transformMCPResult_2,
  transformResultContent_2,
  wrapCallWithDesignConsent,
  noteDesignProjectId,
  wrapFetchWithTimeout_2,
  AUTH_CACHE_VERSION,
  countUnsettledByDeadline,
  callIdeTool,
  truncateServerInstructions_2,
  classifyToolCallAuthError,
  clearServerCache_2,
  buildSep2663TaskBinding,
  clearMcpDiscoveryCaches,
  parseUrlElicitationRequiredError,
  getMcpRequestTimeoutMs,
  getMcpToolTimeoutMs_2,
  getMcpServerConnectionBatchSize,
  getMcpToolIdleTimeoutMs,
  getMcpToolTimeoutMs,
  getMcpToolsCommandsAndResources,
  getRemoteMcpServerConnectionBatchSize,
  getMcpRoots,
  identityChangedReconnectResult,
  inferCompactSchema,
  callToolV1,
  isLocalMcpServer,
  isMcpAuthCached,
  isMcpSessionExpiredError_2,
  isTransientMcpError_2,
  listToolsV1,
  notifyRootsListChanged,
  prefetchAllMcpResources,
  processMCPResult,
  readResourceV1,
  reconnectMcpServer,
  reconnectMcpServerImpl,
  clearMcpAuthCacheEntry,
  isDocumentsPluginServer,
  setHoldStaleReauthEntryForTest,
  setReauthDecisionSinkForTestV1,
  connectAllMcpServers,
  transformMCPResult,
  wrapFetchWithTimeout,
};
