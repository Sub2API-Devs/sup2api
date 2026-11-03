/**
 * services/mcp/client.ts
 *
 * 并入已有模块：MCP 客户端
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/client.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-23fm9f0d.js (1), chunk-3pdgd98q.js (3), chunk-5bdzenzx.js (1), chunk-7zr1t9gr.js (4), chunk-8t8n4kdh.js (214), chunk-cyj440je.js (5), chunk-e6aww6q8.js (21), chunk-mdk8a5r0.js (1), chunk-qsdkv90t.js (2), chunk-z1n5m6nf.js (80)
 * attribution: fingerprint 35, placement 76, layout 177, callgraph-fingerprint 3, sole-consumer 37, affinity 2, file-local 3
 */
import { dirname, join } from "path";
import { randomUUID, createHash } from "crypto";
import { pathToFileURL } from "url";
import { Readable } from "stream";
import { identityId, identityId2 } from "../../types/ids.js";
import {
  SdkHttpError,
  SdkErrorCode,
  ProtocolError,
  SdkError,
  ProtocolErrorCode,
  isJSONRPCRequest,
  isJSONRPCErrorResponse,
  lYn,
  qNr,
  createFetchWithInit,
  isJSONRPCResultResponse,
  OAuthError,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { logMCPDebug, logMCPError, keepsMCPDebug, logError } from "../../utils/log.js";
import {
  truncateToLength,
  firstLineOf,
  plural,
  urlPatternToRegex as urlPatternToRegex_2,
} from "../../utils/stringUtils.js";
import {
  isListAuthError,
  isClaudeAiBearerRejectedError,
  isListAuthError_2,
  isClaudeAiBearerRejectedError_2,
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
  HttpBodyOverflowError,
  createBoundedFetch,
  BoundedStdioClientTransport,
  StdoutOverflowError,
  MCP_BODY_LIMIT,
  STOPPED_READING_NOTE,
} from "./boundedTransports.js";
import { env } from "../../utils/env.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import {
  readNeedsAuthCache,
  needsAuthCacheSpace,
  needsAuthCachePath,
  clearAuthCacheRead,
  getConnectionCache,
  memoizeWithExternalCache,
  AUTH_MESSAGES,
  memoizeWithLRU,
  hasLapsedCcrSignIn,
  mcpAuthToolsFor,
} from "./needsAuthCache.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import {
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
  registerCliOwnedConfig,
} from "./cliOwnedClients.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getFileReader } from "../../utils/fileStore.js";
import { isDiscoveryCacheOn, isDiscoveryCacheUsable, isUnresolved } from "./mcpAccountKey.js";
import {
  noteIdentityChanged,
  bumpIdentityEpoch,
  isCurrentIdentityEpoch,
  identityEpoch,
  getMcpIdentitySnapshot,
} from "./identityChange.js";
import { retainCacheKeys } from "../../utils/memoize.js";
import {
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
  loggableMcpToolName,
} from "../analytics/metadata.js";
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
import { logEvent } from "../analytics/index.js";
import {
  fromEnum,
  lit,
  fromEnumOpt,
  fromNumber,
  mcpNameForAnalytics_GATE_EVALUATED,
} from "../analytics/safeMetadata.js";
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
import { u, string, literal, array, looseObject, union } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../utils/json.js";
import { shortHash } from "../../utils/shortHash.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedFeatureErrorCodeForTelemetry,
  errorMessage,
  getErrnoCode,
  sanitizedErrorClassNameForTelemetry,
  AbortError,
  toError,
  isAbortError,
  isENOENT,
} from "../../utils/errors.js";
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
  SUPPORTED_IMAGE_TYPES,
  Ph,
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
  fileReferenceToolToFill,
  wrapFileReferenceTool,
  filledCallRequestMeta,
  fileReferenceToolForRecords,
  withholdsFileReferenceArguments,
  withholdsFileReferenceErrorText,
  withheldFileReferenceErrorForLog,
} from "./fileReference/wrapFileReferenceTool.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../analytics/growthbook.js";
import {
  ccrProxyTargetHost,
  isCcrInjectedMcpUrl,
  isCcrMcpPath,
  isSameOriginAsCcr,
  safeOrigin,
} from "./ccrMcpUrls.js";
import { pluginToolStagingRoot } from "../../utils/tempDir.js";
import { logForDebugging } from "../../utils/debug.js";
import {
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
  isSessionPersistenceDisabled,
  getRootSession,
  getMcpClientsFromAccessor,
} from "../../bootstrap/state.js";
import { getAnnouncedDirectories } from "../../utils/announcedDirectories.js";
import { getPlatform } from "../../utils/platform.js";
import { Udn } from "../../../vendor/@modelcontextprotocol/client/dist/ajvProvider-BIwGVY6G.mjs";
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
  isStatelessClaudeAiProxy,
  answerGetStreamLocally,
  getCachedInitializeResult,
  getLocalDiscoverAnswer,
  answerHandshakeLocally,
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
  ListToolsResultSchema,
  fZe,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListPromptsResultSchema,
  ElicitRequestURLParamsSchema,
  ImplementationSchema,
  ServerCapabilitiesSchema,
  ToolSchema,
  PromptSchema,
  ResourceSchema,
  ResourceTemplateSchema,
  CompatibilityCallToolResultSchema,
  CLIENT_CAPABILITIES_META_KEY,
  ResultSchema,
  ElicitRequestParamsSchema,
  InitializeResultSchema,
  SUPPORTED_PROTOCOL_VERSIONS as SUPPORTED_PROTOCOL_VERSIONS_2,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
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
import { redactUrlsInText } from "../../utils/redaction/urlRedaction.js";
import { hostedWorkerFetch } from "./hostedWorkerTrust.js";
import { issuerKey_3 } from "./xaaIdpLogin.js";
import { getRequestTimingStore } from "../tools/toolExecution.js";
import {
  isCcrHostedConfig,
  isWithdrawnBuiltinPluginServer,
  withdrawnBuiltinPluginServerError,
  isMcpServerBlockedAtConnectTime,
  isMcpServerDisabled,
  isMcpDialBlockedByPolicy,
  getAllMcpConfigs,
} from "./config.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { isClaudeInChromeMCPServer } from "../../utils/claudeInChrome/common.js";
import { BLOCKED_BY_POLICY_REASON, DISABLED_IN_MCP_REASON } from "./redactMcpErrors.js";
import { assertProgramLaunchAllowed } from "../../utils/disklessSession.js";
import { shouldUseMcpAllowlistEnv, agentProxyEnv, subprocessEnv } from "../../utils/subprocessEnv.js";
import { getDefaultEnvironment } from "../../../vendor/@modelcontextprotocol/client/dist/stdio.mjs";
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
  installQuestionPause,
} from "./resultNormalization.js";
import { REMOTE_DEVICES, CLAUDE_ARTIFACTS, officeBridgeListingState } from "./firstPartyServerIds.js";
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
import {
  CLAUDECODE_CALLMARK,
  BEFORE_HANDLER,
  sanitizeCallMark,
  INTERRUPTED_CALL_NOTICE,
  describeUnansweredCall,
  MCP_ANSWER_STREAM_ENDED,
  ANSWER_STREAM_GRACE_MS_2,
  MCP_CALL_UNANSWERED,
  CALL_OUTCOME_UNKNOWN_NOTICE,
  QUESTION_UNANSWERED_TEXT,
  MCP_QUESTION_UNANSWERED,
  MCP_CALL_NOT_SENT_AGAIN,
  MAX_STRUCTURED_RESULT_CHARS,
  MAX_CALL_MARK_CHARS,
} from "./mcpCallConstants.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { SSL_CERT_ERROR_CODES, sanitizableErrorCode } from "../api/errorUtils.js";
import { iu } from "../../../vendor/@modelcontextprotocol/core/dist/schemas-DscsoNZN.mjs";
import { scrubErrorText } from "../../utils/accessibility/screenReader.js";
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
import {
  classifyMcpErrorSourceCategory,
  CCR_NEEDS_APPROVAL_CODE,
  isTruncatedBodyError,
  McpToolResultNotReadError,
  isMalformedAfterAuthChallenge,
  McpResponseSchemaError,
} from "./mcpResultErrors.js";
import { hasChannelCapability } from "./channelNotification.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { toolUiMeta, describeHiddenMcpTool } from "./toolNameLimits.js";
import { requiresConnectorGrant, connectorServerId, recordClaudeAiMcpConnected } from "./claudeai.js";
import {
  ownsLegacyKey,
  isLegacyKeyUnclaimed,
  mayRecordServerOwner,
  isServerIdentityActive,
  isLegacyKeyRefused,
  isLegacyKeyOwnedElsewhere,
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
import { normalizeNameForMCP, findServersByName } from "./normalization.js";
import { applyBlockedToolPolicy } from "./blockedServers.js";
import { judgeToolSchemaSendability } from "./toolSchemaSendability.js";
import { joinDescription } from "../../remote/tools/inputSchemaFlatten.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
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
import { dynamicServerConnectorId, decorateMcpTools } from "./mcpToolDecoration.js";
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
import { IMAGE_LIMITS } from "../../utils/truncateGraphemes.js";
import {
  isFileUploadServer,
  buildMcpToolPermissionOverrides,
  FILE_UPLOAD_TOOLS,
  ANTHROPIC_HOSTASKSPERUPLOADEDFILE,
  getLoggingSafeMcpBaseUrl,
} from "./utils.js";
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
import { count } from "../../utils/collections.js";
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
import { toolMatchesName } from "../../Tool.js";
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
  persistToolResult,
  toolResultsDir,
  isPersistError,
} from "../../utils/toolResultStorage.js";
import { addToHistory_2 } from "../../history.js";
import { maybeResizeAndDownsampleImageBlock, createImageMetadataText } from "../../utils/imageResizer.js";
import {
  stripTextBlockMeta,
  mcpContentNeedsTruncation,
  getContentSizeEstimate,
  truncateMcpContentIfNeeded,
  truncateMcpContent,
} from "../../utils/mcpValidation.js";
import { notRecordedLength } from "../../utils/telemetry/accountMemoryRedaction.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  runElicitationHooks_2,
  runElicitationResultHooks_2,
  handleElicitationRequest_2,
  runElicitationHooks,
  runElicitationResultHooks,
} from "./elicitationHandler.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { shortTaskLabel } from "./mcpTaskCapability.js";
import { detectCodeIndexingFromMcpServerName } from "../../utils/codeIndexing.js";
import { SdkControlClientTransport } from "./SdkControlTransport.js";
import {
  McpError,
  ErrorCode,
  isJSONRPCErrorResponse as isJSONRPCErrorResponse_2,
  JSONRPCMessageSchema,
  ListRootsRequestSchema,
  ElicitRequestSchema,
  ElicitRequestURLParamsSchema as ElicitRequestURLParamsSchema_2,
  ImplementationSchema as ImplementationSchema_2,
  ServerCapabilitiesSchema as ServerCapabilitiesSchema_2,
  ToolSchema as ToolSchema_2,
  PromptSchema as PromptSchema_2,
  ResourceSchema as ResourceSchema_2,
  ResourceTemplateSchema as ResourceTemplateSchema_2,
  CompatibilityCallToolResultSchema as CompatibilityCallToolResultSchema_2,
  CallToolResultSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import {
  StreamableHTTPError,
  StreamableHTTPClientTransport,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js";
import {
  HttpBodyOverflowError_2,
  boundedFetch,
  isStatelessClaudeAiProxy_2,
  answerGetStreamLocally_2,
  BoundedStdioTransport,
  getCachedInitializeResult_2,
  cachedDiscoverOutcome,
  answerHandshakeLocally_2,
  StdoutOverflowError_2,
  HTTP_BODY_LIMITS,
  STOPPED_READING_NOTE_2,
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
  clearServerCache_4,
  detachAndCloseConnection_2,
  isLegacyProtocolEra,
  hasLiveConnection_2,
  refuseCachedRowV1,
  emitCachedAdoptSignal,
  recordCachedDialFailureV1,
  settleWithinDeadline,
} from "./connectionRegistry.js";
import { createFetchWithDefaults } from "../../utils/fetchWithDefaults.js";
import {
  wrapFetchWithFirstPartyAuth_2,
  mergeRequestHeaders_2,
  wrapFetchWithCcrSessionAuth_2,
  wrapFetchWithCliOwnedBearer_2,
  createClaudeAiProxyFetch_2,
  isAuthFailure_2,
  handleRemoteConnectAuthError_2,
  handleRemoteAuthFailure_2,
  logMcpConnectionOtelEvent_2,
} from "./connectAuth.js";
import {
  SSEClientTransport,
  SseError,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/sse.js";
import { getDefaultEnvironment_2 } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { Client } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { UnauthorizedError } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { validateHostManifest_2, logManifestOutcomeV1 } from "./sdkManifest.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../../utils/computerUse/common.js";
import { READ_ONLY_CU_ACTIONS } from "../../utils/computerUse/toolRendering.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { hasLiveState, getLiveState } from "../liveReplica/liveReplica.js";
import { listSubagentTranscripts } from "../../utils/subagentTranscripts.js";
import { isSafeIdSegment } from "../../utils/agentId.js";
import {
  readAgentMetaFiles,
  MAX_META_READ_CONCURRENCY,
  buildAgentTree,
} from "../../tasks/LocalAgentTask/agentMetaFiles.js";
import {
  emptyCleanupResult,
  getCutoffDate,
  unlinkIfOld,
  isCleanupQuietFsErrno,
} from "../../utils/cleanup.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getFsImplementation } from "../../utils/fsOperations.js";

//@ chunk-8t8n4kdh.js:45888-45917 placement
/**
 * 取客户端的服务器 id。
 */
function clientServerId(e) {
  return identityId(e);
}
//@ chunk-8t8n4kdh.js:45917-45945 placement
/**
 * 取客户端对应的 SDK 客户端（包装 oa）。
 */
function clientOf(client) {
  return identityId2(client);
}
//@ chunk-8t8n4kdh.js:45945-46119 placement
var mcpTaskPersistenceModule = require("./chunk-mzh22y2k.js");
var mcpTasksModule = require("./chunk-g25jqyhb.js");
var mcpTaskDriveModule = require("./chunk-e7xds3sf.js");
var workerWakesModule = require("./chunk-1w450km7.js");
var mcpAutoBackgroundModule = require("./chunk-tn4j580p.js");
//@ chunk-8t8n4kdh.js:46119-46250 placement
function isSseOpenFailure(error) {
  return (
    error instanceof SdkHttpError &&
    (error.code === SdkErrorCode.ClientHttpFailedToOpenStream ||
      error.message.includes("Failed to open SSE stream"))
  );
}
//@ chunk-8t8n4kdh.js:46250-46515 placement = isConnectionError (1)
/**
 * MCP Streamable HTTP：错误是否表示会话失效需要重新初始化（McpSessionExpiredError、非 SSE 打开失败的 404、特定 400 消息）。与 bridge 无关。
 */
function isMcpSessionExpiredError(err) {
  if (err instanceof McpSessionExpiredError) return true;
  if (err instanceof ProtocolError) return false;
  let n = err instanceof SdkHttpError ? err.status : "code" in err ? err.code : undefined;
  if (n === 404) return !isSseOpenFailure(err);
  return (
    n === 400 &&
    /Server not initialized|No valid session ID|Mcp-Session-Id header is required/i.test(err.message)
  );
}
//@ chunk-8t8n4kdh.js:46515-46593 placement
function truncateServerInstructions(e, n, r = maxDescriptionLength()) {
  if (!e) return e;
  return truncateDescription(e, "Server instructions", n, r);
}
//@ chunk-8t8n4kdh.js:46593-46747 placement
function truncateDescription(e, n, serverName, s = maxDescriptionLength()) {
  if (e.length <= s) return e;
  if (serverName !== undefined) logMCPDebug(serverName, `${n} truncated from ${e.length} to ${s} chars`);
  return truncateToLength(e, s) + "\u2026 [truncated]";
}
//@ chunk-8t8n4kdh.js:46747-46925 placement
/**
 * 匹配 “Error POSTing to endpoint (HTTP xxx)” 的正则。
 */
var TRANSIENT_NETWORK_ERROR_CODES = ["ECONNRESET", "ETIMEDOUT", "EPIPE", "EHOSTUNREACH", "ECONNREFUSED"];
var TRANSIENT_ERROR_CODES = new Set([
  ...TRANSIENT_NETWORK_ERROR_CODES,
  "ConnectionRefused",
  "ConnectionClosed",
]);
var POST_HTTP_STATUS_RE = /^Error POSTing to endpoint \(HTTP (\d+)\)/;
//@ chunk-8t8n4kdh.js:46925-46983 placement
/**
 * 判断数值是否为合法 HTTP 状态码。
 */
function isValidHttpStatus(e) {
  return typeof e === "number" && e >= 100 && e <= 599;
}
//@ chunk-8t8n4kdh.js:46983-47437 placement
function isTransientMcpError(e) {
  if (e.name === "AbortError") return true;
  let code = "code" in e ? e.code : undefined;
  let status = "status" in e ? e.status : undefined;
  let s = POST_HTTP_STATUS_RE.exec(e.message)?.[1];
  if (
    isValidHttpStatus(status) ||
    isValidHttpStatus(code) ||
    (typeof code === "number" && code < 0) ||
    (s !== undefined && isValidHttpStatus(Number(s)))
  )
    return false;
  if (typeof code === "string" && TRANSIENT_ERROR_CODES.has(code)) return true;
  let message = e.message;
  return (
    TRANSIENT_NETWORK_ERROR_CODES.some((y) => message.includes(y)) ||
    message.includes("Body Timeout Error") ||
    /\bterminated\b/.test(message) ||
    message.includes("SSE stream disconnected") ||
    message.includes("Failed to reconnect SSE stream")
  );
}
//@ chunk-8t8n4kdh.js:47437-47472 placement
/**
 * 分页请求之间的退避序列（250/500/1000 毫秒）。
 */
var DEFAULT_TOOL_TIMEOUT_MS = 1e8;
var MAX_LIST_PAGES = 20;
var LIST_PAGE_DELAYS_MS = [250, 500, 1000];
//@ chunk-8t8n4kdh.js:47472-48154 placement
function isRetryableListError(error) {
  if (isListAuthError(error)) return false;
  if (error instanceof IssuerEchoCrossOriginError) return false;
  if (isClaudeAiBearerRejectedError(error)) return false;
  if (error instanceof DOMException && error.name === "TimeoutError") return false;
  if (error instanceof HttpBodyOverflowError) return false;
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
//@ chunk-8t8n4kdh.js:48154-48306 placement
function isTimeoutError(error) {
  return (
    (error instanceof DOMException && error.name === "TimeoutError") ||
    (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout) ||
    (error instanceof ProtocolError && error.code === -32001)
  );
}
//@ chunk-8t8n4kdh.js:48306-48365 placement
function hasNoTransport(e) {
  return "transport" in e && e.transport === undefined;
}
//@ chunk-8t8n4kdh.js:53597-53735 fingerprint = getMcpToolTimeoutMs (1)
/**
 * getMcpToolTimeoutMs：工具调用总超时：配置 timeout（≥1000）> MCP_TOOL_TIMEOUT > 默认约 27.8 小时，夹在 [1000, 上限]。
 */
function getMcpToolTimeoutMs(e) {
  let r =
    (e?.timeout !== undefined && e.timeout >= 1000 ? e.timeout : undefined) ??
    env.MCP_TOOL_TIMEOUT ??
    DEFAULT_TOOL_TIMEOUT_MS;
  return Math.min(Math.max(r, 1000), MAX_TIMER_DELAY_MS);
}
//@ chunk-8t8n4kdh.js:53735-53799 layout
var REMOTE_TOOL_IDLE_TIMEOUT_MS = 300000;
var STDIO_TOOL_IDLE_TIMEOUT_MS = 1800000;
var NO_IDLE_TIMEOUT_TRANSPORTS = new Set(["sse-ide", "ws-ide", "sdk"]);
//@ chunk-8t8n4kdh.js:53799-54036 layout
/**
 * getMcpToolIdleTimeoutMs：工具调用空闲超时（无响应也无进度）：CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT 或 stdio 30 分钟/远程 5 分钟，sse-ide/ws-ide/sdk 不设；不小于配置 timeout，不超过总超时。
 */
function getMcpToolIdleTimeoutMs(config) {
  let n = config?.type ?? "stdio";
  if (NO_IDLE_TIMEOUT_TRANSPORTS.has(n)) return 0;
  let r =
    env.CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT ??
    (n === "stdio" ? STDIO_TOOL_IDLE_TIMEOUT_MS : REMOTE_TOOL_IDLE_TIMEOUT_MS);
  if (r <= 0) return 0;
  let timeout = config?.timeout !== undefined && config.timeout >= 1000 ? config.timeout : 0;
  return Math.min(Math.max(r, timeout, 1000), getMcpToolTimeoutMs(config));
}
//@ chunk-8t8n4kdh.js:54036-54078 layout
/**
 * 懒加载 needs-auth 缓存模块。
 */
var needsAuthCacheModule = () => require("./chunk-3k33hyyp.js");
//@ chunk-8t8n4kdh.js:54078-54244 layout
/**
 * needs-auth 缓存常量与懒加载模块：缓存版本 v2、TTL 15 分钟（默认）/4 小时（claude.ai 代理与插件远程）/90 秒（有 refresh token）、时钟偏差容忍 1 分钟。
 */
var artifactPermissionRulesModule = () => require("./chunk-p5cstt88.js");
var artifactsMcpLaptopModule = () => require("./chunk-d5fbj7hf.js");
var claudeDocsWakeModule = () => require("./chunk-t6p2wq66.js");
var AUTH_CACHE_VERSION = "v2";
var NEEDS_AUTH_CACHE_TTL_MS = 900000;
var NEEDS_AUTH_CACHE_LONG_TTL_MS = 14400000;
var NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS = 90000;
var AUTH_CACHE_CLOCK_SKEW_MS = 60000;
//@ chunk-8t8n4kdh.js:54244-54769 layout
/**
 * isMcpAuthCached：needs-auth 缓存命中：claude.ai 代理按 id、插件 stdio 按配置哈希；TTL 默认 15 分钟，claude.ai 代理与插件远程服务器 4 小时，有 refresh token 时 90 秒。
 */
async function isMcpAuthCached(serverName, config, storageV5) {
  let h = (await readNeedsAuthCache(storageV5))[serverName];
  if (!h) return false;
  if (config.type === "claudeai-proxy" && h.id !== config.id) return false;
  if ((config.type === "stdio" || config.type === undefined) && config.pluginSource === undefined)
    return false;
  if (
    (config.type === "stdio" || config.type === undefined) &&
    config.pluginSource !== undefined &&
    h.id !== configHash(config)
  )
    return false;
  if (
    (config.type === "http" || config.type === "sse") &&
    config.pluginSource !== undefined &&
    h.id !== undefined
  )
    return false;
  let y =
    config.type === "claudeai-proxy" ||
    (config.pluginSource !== undefined &&
      (config.type === "http" || config.type === "sse") &&
      !usesNonOAuthAuth(config));
  let S = h.ttlMs ?? (y ? NEEDS_AUTH_CACHE_LONG_TTL_MS : NEEDS_AUTH_CACHE_TTL_MS);
  let w = Date.now() - h.timestamp;
  return w > -AUTH_CACHE_CLOCK_SKEW_MS && w < S;
}
//@ chunk-8t8n4kdh.js:54769-54943 layout
async function writeAuthCacheV5(e, n) {
  let r = await e.write(needsAuthCacheSpace(), jsonStringify(n), {
    publishDiscipline: "inPlace",
  });
  if (!r.ok) logMCPDebug("auth-cache", `needs-auth cache v5 write failed: ${formatStorageError(r.error)}`);
  return r.ok;
}
//@ chunk-8t8n4kdh.js:54943-55253 callgraph-fingerprint = setMcpAuthCacheEntry (0.268)
/**
 * setMcpAuthCacheEntry：写 needs-auth 缓存条目 {timestamp, id?, ttlMs?}（v5 存储或 mcp-needs-auth-cache.json），串行写链。
 */
function setMcpAuthCacheEntry(serverName, serverId, ttlMs, storageV5) {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.authCacheWriteChain = cliOwnedState.authCacheWriteChain
    .then(async () => {
      let cache = await readNeedsAuthCache(storageV5);
      cache[serverName] = {
        timestamp: Date.now(),
        ...(serverId && {
          id: serverId,
        }),
        ...(ttlMs !== undefined && {
          ttlMs,
        }),
      };
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        if (!(await writeAuthCacheV5(storageV5, cache))) return;
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
//@ chunk-8t8n4kdh.js:55253-55505 layout
/**
 * clearMcpAuthCacheEntry：删除 needs-auth 缓存条目。
 */
function clearMcpAuthCacheEntry(name, storageV5) {
  let cliOwnedState = getCliOwnedState();
  let s = cliOwnedState.authCacheWriteChain
    .then(async () => {
      let needsAuthCache = await readNeedsAuthCache(storageV5);
      if (!(name in needsAuthCache)) return;
      delete needsAuthCache[name];
      if (isStorageV5Enabled() && storageV5 !== undefined) {
        if (!(await writeAuthCacheV5(storageV5, needsAuthCache))) return;
      } else await getFileReader().write(needsAuthCachePath(), jsonStringify(needsAuthCache));
      clearAuthCacheRead();
    })
    .catch(() => {});
  cliOwnedState.authCacheWriteChain = s;
  return s;
}
//@ chunk-8t8n4kdh.js:55505-55748 layout
/**
 * clearMcpDiscoveryCaches：清空连接、工具、提示词、资源、资源模板的记忆化缓存（保留指定键）。
 */
function clearMcpDiscoveryCaches(e = new Set(), n = true) {
  if (!isDiscoveryCacheOn()) return;
  if (n) noteIdentityChanged();
  bumpIdentityEpoch();
  let r = (cache) => {
    if (cache) retainCacheKeys(cache, e);
  };
  if (!getCliOwnedState().holdStaleReauthEntryForTest) getConnectionCache().reauthInFlight.clear();
  getConnectionCache().lapsedCcrSignIns.clear();
  r(connectToServer.cache);
  r(fetchToolsForClient.cache);
  r(fetchCommandsForClient.cache);
  r(fetchResourcesForClient.cache);
  r(fetchResourceTemplatesForClient.cache);
}
//@ chunk-8t8n4kdh.js:55748-55855 fingerprint = mcpBaseUrlAnalytics (0.65)
/**
 * mcpBaseUrlAnalytics：遥测字段 mcpServerBaseUrl 与 mcpServerKeyHash。
 */
function mcpBaseUrlAnalytics_2(serverRef, name) {
  let url = loggingSafeOrigin(serverRef);
  let s = name
    ? {
        mcpServerKeyHash: toolNameForTelemetry(name),
      }
    : {};
  if (url)
    return {
      mcpServerBaseUrl: url,
      ...s,
    };
  return s;
}
//@ chunk-8t8n4kdh.js:55855-56314 layout
/**
 * logMcpConnectionOtelEvent：发出 mcp_server_connection OTel 事件（状态、传输、作用域、耗时、插件信息、错误码）。
 */
function logMcpConnectionOtelEvent(serverName, serverRef, r) {
  let s = isToolDetailsLoggingEnabled();
  let h = serverRef.pluginSource ? parsePluginIdentifier_2(serverRef.pluginSource) : undefined;
  let y = h && (isAnthropicPluginSource(getTelemetryPluginScope(h.name, h.marketplace, null)) || s);
  logOTelEvent("mcp_server_connection", {
    status: r.status,
    transport_type: serverRef.type ?? "stdio",
    server_scope: serverRef.scope,
    duration_ms: String(Math.round(r.durationMs)),
    is_plugin: h !== undefined,
    ...(h && {
      plugin_id_hash: pluginIdHash(h.name, h.marketplace),
      "plugin.name": y ? h.name : THIRD_PARTY,
    }),
    ...(r.errorCode && {
      error_code: String(sanitizeConnectErrorCodeForTelemetry(r.errorCode)),
    }),
    ...(s && {
      server_name: serverName,
      ...(r.error && {
        error: r.error,
      }),
    }),
  });
}
//@ chunk-8t8n4kdh.js:56314-56960 fingerprint = handleRemoteAuthFailure (0.726)
/**
 * handleRemoteAuthFailure：远程服务器需要认证：记录 tengu_mcp_server_needs_auth，写 needs-auth 缓存，清理发现缓存，返回 needs-auth 连接。
 */
async function handleRemoteAuthFailure(
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
  let P = error instanceof ZodError;
  let M = P ? error.issues[0] : undefined;
  let error_2 = M
    ? `Server OAuth metadata invalid: ${M.path.join(".") || "(root)"} \u2014 ${M.message}`
    : undefined;
  logEvent("tengu_mcp_server_needs_auth", {
    transportType: fromEnum(transportType),
    ...(negotiation ?? {}),
    ...(P && {
      cause: lit("discovery_schema"),
    }),
    ...mcpBaseUrlAnalytics_2(serverRef, name),
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
  let ce =
    isRefreshPath401 &&
    (serverRef.type === "http" || serverRef.type === "sse") &&
    (await hasStoredRefreshToken(name, serverRef));
  if (roundEpoch === undefined || isCurrentIdentityEpoch(roundEpoch))
    setMcpAuthCacheEntry(
      name,
      serverRef.type === "claudeai-proxy" ? serverRef.id : undefined,
      ce ? NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS : undefined,
      storageV5,
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
//@ chunk-8t8n4kdh.js:56960-57192 layout
async function purgeDiscoveryCacheOnAuthFailure(e, serverRef, roundEpoch) {
  let s = roundEpoch === undefined || isCurrentIdentityEpoch(roundEpoch);
  if (isDiscoveryCacheUsable())
    if (s) await flushDiscoveryCache(deleteDiscoveryCache(e, serverRef));
    else
      logMCPDebug(
        e,
        "Discovery cache 401/403 purge skipped: identity changed since this connect round started (the current entry belongs to the new principal)",
      );
}
//@ chunk-8t8n4kdh.js:57192-57597 layout
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
//@ chunk-8t8n4kdh.js:57597-58361 layout
/**
 * failWithAuthRejection：记录连接失败遥测并返回带错误码（AUTH_HEADER_REJECTED 等）的 failed 连接。
 */
function failWithAuthRejection({
  name: e,
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
    ...mcpBaseUrlAnalytics_2(serverRef, e),
    ...buildPluginSourceFields(serverRef),
  });
  let { severity, featureErrorCode } = AUTH_REJECTION_SEVERITY[errorCode];
  if (severity === "bad") logFeatureBad("mcp_connect", featureErrorCode);
  else logFeatureSad("mcp_connect", featureErrorCode);
  logMCPError(e, message);
  return {
    name: e,
    type: "failed",
    config: serverRef,
    error: message,
    ...(displayDetail !== undefined && {
      displayDetail,
    }),
    errorCode,
  };
}
//@ chunk-8t8n4kdh.js:58361-59946 layout
/**
 * failFirstPartyAuthRejected：一方服务器拒绝 claude.ai 登录/Design 凭证时生成具体提示（/login、/design-login）。
 */
function failFirstPartyAuthRejected(credentialKind, name, serverRef, transportType, statusCode, negotiation) {
  let S = "api.anthropic.com";
  try {
    if ("url" in serverRef) S = new URL(serverRef.url).host;
  } catch {}
  let w = `HTTP ${statusCode ?? 401}`;
  let P = isDesignServerConfig(serverRef);
  let M;
  switch (credentialKind) {
    case "design_credential":
      M =
        statusCode === 403
          ? `${S} rejected your /design-login credential (HTTP 403). Check that your account has access to Claude Design, or run /design-login to re-authorize it and retry.`
          : `${S} rejected your /design-login credential (${w}). Run /design-login to re-authorize it and retry.`;
      break;
    case "none":
      M = `${S} needs a claude.ai sign-in and Claude Code had no usable credential to send (${w}). Run ${P ? "/design-login" : "/login"} and retry.`;
      break;
    case "design_scoped_login":
    case "login": {
      if (statusCode === 403 && P)
        M =
          credentialKind === "design_scoped_login"
            ? `${S} rejected your claude.ai login for Claude Design (HTTP 403) even though that login already includes Claude Design permissions, so this is most likely an account or project access problem. Check that your account has access to Claude Design; if it does, run /design-login and retry.`
            : `${S} rejected your claude.ai login for Claude Design (HTTP 403), most likely because a /login token carries no Claude Design access. Run /design-login and retry, or check that your account has access to Claude Design.`;
      else
        M =
          statusCode === 403
            ? `${S} rejected your claude.ai login (HTTP 403). Check that your account has access to this server. If it does, your ` +
              `token may be missing a scope \u2014 run ${"/login"} and retry.`
            : `${S} rejected your claude.ai login (${w}). Run /login and retry.`;
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
    message: M,
    negotiation,
  });
}
//@ chunk-8t8n4kdh.js:59946-60026 layout
function isAuthFailure(error, n, r) {
  return error instanceof UnauthorizedError_2 || (error instanceof ZodError && r) || n === 401 || n === 403;
}
//@ chunk-8t8n4kdh.js:60026-61695 layout
/**
 * handleRemoteConnectAuthError：SSE/HTTP 连接认证失败分类：配置的 Authorization 头被拒、headersHelper 头被拒、CLI 自有令牌被拒、一方登录被拒，或交给 OAuth 刷新/needs-auth。
 */
async function handleRemoteConnectAuthError({
  name,
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
  await recordTokenlessRejection(name, serverRef, authProvider);
  if (!isAuthFailure(error, statusCode, sawAuthChallenge)) return;
  if (hasUserAuthHeader) {
    let G = sanitizeErrorDetail(
      redactMcpErrorDetail(
        name,
        serverRef,
        error instanceof SdkHttpError && typeof error.data?.text === "string"
          ? error.data.text
          : error.message,
      ),
    );
    return failWithAuthRejection({
      name,
      serverRef,
      transportType,
      negotiation,
      errorCode: "AUTH_HEADER_REJECTED",
      message:
        `Server rejected the configured Authorization header (HTTP ${statusCode ?? 401}). ` +
        "Check that the token is valid for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when headers.Authorization is set.",
      ...(G !== "" && {
        displayDetail: `Error detail: ${G}`,
      }),
    });
  }
  if (helperMintsAuthHeader) {
    let G = sanitizeErrorDetail(redactMcpErrorDetail(name, serverRef, error.message));
    return failWithAuthRejection({
      name,
      serverRef,
      transportType,
      negotiation,
      errorCode: "HEADERS_HELPER_AUTH_REJECTED",
      message:
        `Server rejected the Authorization header minted by the configured headersHelper (HTTP ${statusCode ?? 401}). ` +
        "Check that the helper command returns a valid credential for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when the helper supplies Authorization.",
      ...(G !== "" && {
        displayDetail: `Error detail: ${G}`,
      }),
    });
  }
  if (cliOwnedBearer)
    return failWithAuthRejection({
      name,
      serverRef,
      transportType,
      negotiation,
      errorCode: "CLI_OWNED_BEARER_REJECTED",
      message: `Server rejected the session credential (HTTP ${statusCode ?? 401}). It will be retried when the session credential is refreshed.`,
    });
  if (useFirstPartyAuth)
    return failFirstPartyAuthRejected(
      firstPartyBearer ?? "none",
      name,
      serverRef,
      transportType,
      statusCode,
      negotiation,
    );
  let ge = error instanceof UnauthorizedError_2 || statusCode === 401;
  let Ie = await handleRejectedToken({
    name,
    serverRef,
    authProvider,
    isRefreshPath401: ge,
    needsAuth: () =>
      handleRemoteAuthFailure(name, serverRef, transportType, error, ge, roundEpoch, negotiation, storageV5),
  });
  if (Ie !== undefined) {
    await purgeDiscoveryCacheOnAuthFailure(name, serverRef, roundEpoch);
    return Ie;
  }
  return handleRemoteAuthFailure(
    name,
    serverRef,
    transportType,
    error,
    ge,
    roundEpoch,
    negotiation,
    storageV5,
  );
}
//@ chunk-8t8n4kdh.js:61695-62288 layout
/**
 * wrapFetchWithCcrSessionAuth：CCR 代理请求补会话令牌、会话头、拨号工具 ID（X-CCR-Dial-Tool-Use-Id），并记录 CCR ticket。
 */
function wrapFetchWithCcrSessionAuth(fetchFn, dialOptions, connectionKey) {
  fetchFn = stripRedirectLocation(fetchFn);
  return async (s, h) => {
    let headers = new Headers(h?.headers);
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
      let j = classifyHandshakeRequest(h);
      if (j === "handshake" || (j === "listing" && dialOptions.withListings))
        headers.set(X_CCR_DIAL_TOOL_USE_ID, dialOptions.toolUseId);
    }
    getConnectionCache().attachCcrTicket(s, headers);
    let redirect = h?.redirect === "error" ? "error" : "manual";
    let P = await fetchFn(s, {
      ...h,
      headers,
      redirect,
    });
    let connectionCache = getConnectionCache();
    connectionCache.noteCcrTicket(s, headers, P);
    if (
      connectionKey !== undefined &&
      (P.status === 401 || connectionCache.lapsedCcrSignIns.has(connectionKey)) &&
      classifyHandshakeRequest(h) !== undefined
    )
      connectionCache.noteCcrDialAnswer(connectionKey, P);
    return P;
  };
}
//@ chunk-8t8n4kdh.js:62288-62545 layout
/**
 * classifyHandshakeRequest：POST 体方法为 initialize/notifications/initialized 返回 handshake，tools/list 返回 listing。
 */
function classifyHandshakeRequest(e) {
  if (e?.method?.toUpperCase() !== "POST" || typeof e.body !== "string") return;
  let method = u({
    method: string(),
  }).safeParse(safeParseJSON(e.body, false)).data?.method;
  if (method === "initialize" || method === "notifications/initialized") return "handshake";
  return method === "tools/list" ? "listing" : undefined;
}
//@ chunk-8t8n4kdh.js:62545-62610 layout
var X_CCR_DIAL_TOOL_USE_ID = "X-CCR-Dial-Tool-Use-Id";
var TOOL_USE_ID_PATTERN = /^toolu_[A-Za-z0-9_-]{1,64}$/;
//@ chunk-8t8n4kdh.js:62610-63560 layout
/**
 * wrapFetchWithCliOwnedBearer：给 CLI 自有服务器的请求附加会话 bearer（被扣留时不发请求）。
 */
function wrapFetchWithCliOwnedBearer(fetchFn, config) {
  let r = async (...[s, h]) => {
    let y = {
      method: (h?.method ?? "GET").toUpperCase(),
      body: h?.body,
    };
    await runBeforeRequestHook(config, y);
    let headers = new Headers(h?.headers);
    let bearerFingerprint = null;
    let P = false;
    if (!headers.has("Authorization")) {
      let bearerTokenFor = await resolveBearerTokenFor(config);
      if (bearerTokenFor) {
        getPresentedCredentialLog().record(bearerTokenFor);
        headers.set("Authorization", `Bearer ${bearerTokenFor}`);
        bearerFingerprint = shortHash(bearerTokenFor);
      } else {
        P = true;
        let ce = withheldBearerRefusalFor(config);
        if (ce !== undefined)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            ce,
            "CLI-owned MCP request not sent: its bearer was withheld",
          );
      }
    }
    let M = {};
    for (let [key, value] of Object.entries(cliOwnedRequestHeaders(config, y)))
      if (
        !headers.has(key) &&
        key.toLowerCase() !== "authorization" &&
        !(P && isCredentialRequestHeader(config, key))
      ) {
        headers.set(key, value);
        M[key] = value;
      }
    let j = await fetchFn(s, {
      ...h,
      headers,
      redirect: "error",
    });
    notifyResponseObserver(config, {
      method: y.method,
      status: j.status,
      headers: j.headers,
      requestHeaders: {
        get: (R) =>
          R.toLowerCase() === "authorization" || isCredentialRequestHeader(config, R) ? null : headers.get(R),
      },
      bearerFingerprint,
    });
    return {
      response: j,
      owned: M,
    };
  };
  return async (s, h) => {
    let { response, owned } = await r(s, h);
    if (!(await shouldResendRequest(config, response, owned))) return response;
    await response.body?.cancel().catch(() => {});
    let w = await r(s, h);
    shouldResendRequest(config, w.response, w.owned);
    return w.response;
  };
}
//@ chunk-8t8n4kdh.js:63560-63822 layout
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
//@ chunk-8t8n4kdh.js:63822-65001 fingerprint = createClaudeAiProxyFetch (0.634)
/**
 * createClaudeAiProxyFetch：claude.ai 代理 fetch：附加 OAuth 访问令牌，401 时刷新令牌重试一次，仍被拒抛 ClaudeAiProxyBearerRejectedError。
 */
function createClaudeAiProxyFetch(fetchFn, credentials) {
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
    async function y(response) {
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
    if (response.status !== 401) return y(response);
    let P = response.headers.get("X-Mcp-Error-Code") ?? undefined;
    if (P) {
      logEvent("tengu_mcp_claudeai_proxy_401", {
        tokenChanged: false,
        proxyErrorCode: sanitizedFeatureErrorCodeForTelemetry(P),
      });
      return response;
    }
    let tokenChanged = await handleOAuth401Error(sentToken, credentials).catch(() => false);
    logEvent("tengu_mcp_claudeai_proxy_401", {
      tokenChanged,
    });
    if (!tokenChanged) {
      let now =
        isStorageV5Enabled() && credentials !== undefined
          ? await readFreshOAuthAccessToken(credentials)
          : getClaudeAIOAuthTokens()?.accessToken;
      if (!now || now === sentToken) throw new ClaudeAiProxyBearerRejectedError();
    }
    let response_2 = (await doRequest()).response;
    if (response_2.status === 401 && !response_2.headers.get("X-Mcp-Error-Code"))
      throw new ClaudeAiProxyBearerRejectedError();
    return y(response_2);
  };
}
//@ chunk-8t8n4kdh.js:65001-65513 sole-consumer
/**
 * expandFirstPartyDesignScopes：Design 连接器需要时为 claude.ai 登录追加 user:design:read/write 作用域。
 */
async function expandFirstPartyDesignScopes(e, credentials) {
  if (isDesignMcpUrl(e)) {
    let s = await getScaffoldResolver()?.(credentials);
    if (s?.ok) {
      if (s.expanded) {
        noteScopeExpansion(
          "Added user:design:read and user:design:write to your claude.ai login (for the Design MCP connector).",
        );
        logEvent("tengu_mcp_first_party_scope_expanded", {
          pathPrefix: lit("/v1/design/"),
        });
      }
      return {
        accessToken: s.accessToken,
        bearer: s.bearer,
      };
    }
  }
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials,
  });
  let r =
    isStorageV5Enabled() && credentials !== undefined
      ? await getClaudeAIOAuthTokensAsync(credentials)
      : getClaudeAIOAuthTokens();
  if (!r?.accessToken) return;
  return {
    accessToken: r.accessToken,
    bearer: r.scopes?.includes("user:design:read") ? "design_scoped_login" : "login",
  };
}
//@ chunk-8t8n4kdh.js:65513-65742 sole-consumer
/**
 * readNeedsConsentBit：Design 服务器响应体为 {error:"needs_consent", consent} 时返回 consent 位。
 */
async function readNeedsConsentBit(response) {
  let n = peekScopeExpansionNotice();
  if (n === null) return null;
  let r;
  try {
    r = await response.clone().json();
  } catch {
    return null;
  }
  if (r == null || typeof r !== "object" || r.error !== "needs_consent") return null;
  let consent = r.consent;
  return n.isConsentBit(consent) ? consent : null;
}
//@ chunk-8t8n4kdh.js:65742-65879 sole-consumer
function noteDesignProjectId(e, n, name, s) {
  if (!n || !MEMBERSHIP_METHODS.has(name)) return;
  let projectId = s.project_id;
  if (typeof projectId === "string" && projectId.length > 0) {
    clearApprovedPlans(e, projectId);
    clearPlansForProject(e, projectId);
    clearVerifiedProjectGrant(e, projectId);
    markRecardProject(e, projectId);
  }
}
//@ chunk-8t8n4kdh.js:65879-65944 sole-consumer
var DESIGN_WRITE_TOOLS = new Set(["write_files", "create_support_js", "copy_files"]);
//@ chunk-8t8n4kdh.js:65944-66471 sole-consumer
/**
 * gateDesignWriteWithoutPlanToken：Design 写工具缺 plan_token 时拒绝（只允许原生 Claude Design 工具无令牌写）。
 */
function gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, name, r) {
  if (!isFirstPartyDesignServer || !DESIGN_WRITE_TOOLS.has(name)) return null;
  let planToken = r?.plan_token;
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
//@ chunk-8t8n4kdh.js:66471-66533 sole-consumer
var DESIGN_PLAN_TOOLS = new Set([
  ...DESIGN_WRITE_TOOLS,
  "finalize_plan",
  "delete_files",
  ...MEMBERSHIP_METHODS,
]);
//@ chunk-8t8n4kdh.js:66533-66570 sole-consumer
function isDesignGatedTool(isFirstPartyDesignServer, name) {
  return isFirstPartyDesignServer && DESIGN_PLAN_TOOLS.has(name);
}
//@ chunk-8t8n4kdh.js:66570-66862 sole-consumer
/**
 * askDesignConsent：生成 Design 同意请求的权限结果（ask，附 __consentNonce，仅本地显示，不可被分类器批准）。
 */
function askDesignConsent(message, n, __consentNonce) {
  return {
    behavior: "ask",
    message,
    updatedInput: {
      ...n,
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
//@ chunk-8t8n4kdh.js:66862-66936 sole-consumer
function isDesignServerConfig(config) {
  return (
    (config.type === "sse" || config.type === "http") &&
    isDesignMcpUrl(config.url) &&
    !configHasAuthorizationHeader(config)
  );
}
//@ chunk-8t8n4kdh.js:66936-67090 sole-consumer
/**
 * canAskDesignConsent：交互会话且不在 bypass 模式时可以弹 Design 同意请求。
 */
function canAskDesignConsent(e) {
  let toolPermissionContext = getToolPermissionContext(e);
  return (
    !e.options.isNonInteractiveSession &&
    toolPermissionContext.mode !== "bypassPermissions" &&
    !(toolPermissionContext.mode === "plan" && toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-8t8n4kdh.js:67090-67262 sole-consumer
/**
 * canPromptForPermission：非 bypass/dontAsk 且未要求避免权限提示。
 */
function canPromptForPermission(e) {
  let toolPermissionContext = getToolPermissionContext(e);
  return (
    toolPermissionContext.mode !== "bypassPermissions" &&
    toolPermissionContext.mode !== "dontAsk" &&
    !(toolPermissionContext.mode === "plan" && toolPermissionContext.isBypassPermissionsModeAvailable) &&
    !toolPermissionContext.shouldAvoidPermissionPrompts
  );
}
//@ chunk-8t8n4kdh.js:67262-67273 sole-consumer
var MAX_DESIGN_CONSENT_ASKS = 100;
//@ chunk-8t8n4kdh.js:67273-67545 sole-consumer
/**
 * rememberDesignConsentAsk：按 toolUseId 记录待确认的 consent 位与 nonce（最多 100 条）。
 */
function rememberDesignConsentAsk(toolUseId, n, r) {
  let firstPartyDesignConsentAsks = getCliOwnedState().firstPartyDesignConsentAsks;
  let h = firstPartyDesignConsentAsks.get(toolUseId);
  let y = h !== undefined && h.bit === n;
  let S = y ? h.nonce : randomUUID();
  firstPartyDesignConsentAsks.delete(toolUseId);
  firstPartyDesignConsentAsks.set(toolUseId, {
    bit: n,
    nonce: S,
    askReachesUser: y ? h.askReachesUser && r : r,
  });
  while (firstPartyDesignConsentAsks.size > MAX_DESIGN_CONSENT_ASKS) {
    let w = firstPartyDesignConsentAsks.keys().next().value;
    if (w === undefined) break;
    firstPartyDesignConsentAsks.delete(w);
  }
  return S;
}
//@ chunk-8t8n4kdh.js:67545-67755 sole-consumer
/**
 * takeDesignConsentAsk：取出并删除 toolUseId 对应的同意记录，nonce 必须一致。
 */
function takeDesignConsentAsk(e, n) {
  if (e === undefined) return null;
  let firstPartyDesignConsentAsks = getCliOwnedState().firstPartyDesignConsentAsks;
  let s = firstPartyDesignConsentAsks.get(e) ?? null;
  firstPartyDesignConsentAsks.delete(e);
  if (s === null || n === undefined || s.nonce !== n) return null;
  return {
    bit: s.bit,
    askReachesUser: s.askReachesUser,
  };
}
//@ chunk-8t8n4kdh.js:67755-68588 sole-consumer
/**
 * wrapCallWithDesignConsent：Design 工具调用遇 needs_consent 时：已批准的位直接提交同意并重试，否则提示用户重试或运行 /design consent。
 */
function wrapCallWithDesignConsent(e, n) {
  let { designSession, approvedConsentBit, consentAskReachesUser, credentials } = n;
  return async (S) => {
    let w = peekScopeExpansionNotice();
    try {
      let P = await e(S);
      if (approvedConsentBit !== null && !S.aborted)
        w?.seedDesignConsentBit(designSession, approvedConsentBit, true);
      return P;
    } catch (error) {
      if (!(error instanceof FirstPartyDesignNeedsConsentError) || !w) throw error;
      let consent = error.consent;
      if (consent !== approvedConsentBit) {
        w.seedDesignConsentBit(designSession, consent, false);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${w.consentPromptFor(consent)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
          "first-party design MCP needs_consent (not shown)",
        );
      }
      if (!consentAskReachesUser) {
        w.seedDesignConsentBit(designSession, consent, false);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${w.consentPromptFor(consent)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
          "first-party design MCP needs_consent (no prompt)",
        );
      }
      await w.postDesignConsent(designSession, consent, credentials);
      return e(S);
    }
  };
}
//@ chunk-8t8n4kdh.js:68588-69493 sole-consumer
/**
 * wrapFetchWithFirstPartyAuth：一方 MCP 服务器请求附加 claude.ai 登录 bearer，记录最后使用的凭证类型。
 */
function wrapFetchWithFirstPartyAuth(fetchFn, credentials, r) {
  fetchFn = stripRedirectLocation(fetchFn);
  return async (s, h) => {
    let headers = new Headers(h?.headers);
    let redirect = h?.redirect === "error" ? "error" : "manual";
    if (headers.has("Authorization") || !isFirstPartyMcpUrl(s) || !isFirstPartyProvider())
      return fetchFn(s, {
        ...h,
        redirect,
      });
    let w = async () => {
      let ie = await expandFirstPartyDesignScopes(s, credentials);
      r.last = ie?.bearer ?? "none";
      if (!ie)
        return {
          response: await fetchFn(s, {
            ...h,
            redirect,
          }),
          sentToken: undefined,
        };
      let accessToken = ie.accessToken;
      getPresentedCredentialLog().record(accessToken);
      let headers = {
        ...Object.fromEntries(new Headers(h?.headers)),
        Authorization: `Bearer ${accessToken}`,
      };
      return {
        response: await fetchFn(s, {
          ...h,
          headers,
          redirect,
        }),
        sentToken: accessToken,
      };
    };
    let P = async (ie) => {
      if (ie.response.status === 403 && ie.sentToken && isDesignMcpUrl(s)) {
        let consent = await readNeedsConsentBit(ie.response);
        if (consent !== null) throw new FirstPartyDesignNeedsConsentError(consent);
      }
    };
    let M = await w();
    await P(M);
    let { response, sentToken } = M;
    if (response.status !== 401 || !sentToken) return response;
    if (!(await handleOAuth401Error(sentToken, credentials).catch(() => false))) {
      let ie =
        isStorageV5Enabled() && credentials !== undefined
          ? await readFreshOAuthAccessToken(credentials)
          : getClaudeAIOAuthTokens()?.accessToken;
      if (!ie || ie === sentToken) return response;
    }
    let Q;
    try {
      Q = await w();
    } catch {
      return response;
    }
    await P(Q);
    return Q.response;
  };
}
//@ chunk-8t8n4kdh.js:69493-69716 sole-consumer
/**
 * mergeRequestHeaders：合并请求头，固定 User-Agent 与 Accept-Encoding: identity。
 */
function mergeRequestHeaders(headers, n, r) {
  let headers_2 = new Headers({
    "User-Agent": getMCPUserAgent(),
    "Accept-Encoding": "identity",
    ...n,
  });
  new Headers(headers).forEach((h, y) => headers_2.set(y, h));
  for (let [key, value] of Object.entries(r)) headers_2.set(key, value);
  headers_2.set("Accept", "text/event-stream");
  return headers_2;
}
//@ chunk-8t8n4kdh.js:69784-69897 sole-consumer
function normalizeImageMimeType(mimeType) {
  if (!mimeType) return false;
  let lower = firstLineOf(mimeType, ";").trim().toLowerCase();
  return SUPPORTED_IMAGE_TYPES.has(lower === "image/jpg" ? "image/jpeg" : lower);
}
//@ chunk-8t8n4kdh.js:69897-69936 sole-consumer
/**
 * 工具调用超时的下限（60 秒）。
 */
var RETRYABLE_HTTP_STATUSES = new Set([500, 502, 504]);
var MIN_TOOL_TIMEOUT_MS = 60000;
//@ chunk-8t8n4kdh.js:69936-70082 sole-consumer = getMcpToolTimeoutMs (1)
/**
 * MCP 工具调用总超时：配置 timeout（≥1000ms 才算）优先，其次 env `MCP_TOOL_TIMEOUT`，再夹在下限与上限之间；都没有用默认值。（v2）
 */
function getMcpToolTimeoutMs_2(e) {
  let r = (e?.timeout !== undefined && e.timeout >= 1000 ? e.timeout : undefined) ?? env.MCP_TOOL_TIMEOUT;
  return r !== undefined
    ? Math.min(Math.max(r, MIN_TOOL_TIMEOUT_MS), MAX_TIMER_DELAY_MS)
    : MIN_TOOL_TIMEOUT_MS;
}
//@ chunk-8t8n4kdh.js:70082-70125 affinity
/**
 * MCP 普通请求超时：取工具超时与连接超时（MCP_TIMEOUT）两者的较大值。（v2）
 */
function getMcpRequestTimeoutMs(e) {
  return Math.max(getMcpToolTimeoutMs_2(e), getConnectionTimeoutMs());
}
//@ chunk-8t8n4kdh.js:70125-70170 fingerprint = MCP_STREAMABLE_HTTP_ACCEPT (1)
var MCP_STREAMABLE_HTTP_ACCEPT = "application/json, text/event-stream";
//@ chunk-8t8n4kdh.js:70170-70248 layout
function wrapFetchNoop(fetchWithInit) {
  return async (n, r) => {
    try {
      return await fetchWithInit(n, r);
    } catch (error) {
      rethrowRedactedFetchError(error, n);
    }
  };
}
//@ chunk-8t8n4kdh.js:70248-70806 fingerprint = wrapFetchWithTimeout (0.76)
/**
 * wrapFetchWithTimeout：非 GET 请求加超时（按服务器配置），补 Accept: application/json, text/event-stream 与 traceparent。
 */
function wrapFetchWithTimeout(fetchFn, config) {
  let mcpRequestTimeoutMs = getMcpRequestTimeoutMs(config);
  return async (url, init) => {
    if ((init?.method ?? "GET").toUpperCase() === "GET") return fetchFn(url, init);
    let headers = new Headers(init?.headers);
    if (!headers.has("accept")) headers.set("accept", MCP_STREAMABLE_HTTP_ACCEPT);
    if (shouldPropagateTraceContext()) {
      let activeSpanId = getActiveSpanId();
      if (activeSpanId && !headers.has("traceparent")) headers.set("traceparent", activeSpanId);
    }
    let controller = new AbortController();
    let timer = setTimeout(
      (j) => j.abort(new DOMException("The operation timed out.", "TimeoutError")),
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
        ...(getMcpToolTimeoutMs_2(config) > 300000 && {
          timeout: false,
        }),
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
//@ chunk-8t8n4kdh.js:70806-70865 fingerprint = getMcpServerConnectionBatchSize (1)
/**
 * 本地 MCP 服务器（stdio/sdk）并发连接批大小：env `MCP_SERVER_CONNECTION_BATCH_SIZE`，默认 3。（v2）
 */
function getMcpServerConnectionBatchSize() {
  return env.MCP_SERVER_CONNECTION_BATCH_SIZE ?? 3;
}
//@ chunk-8t8n4kdh.js:70865-70932 fingerprint = getRemoteMcpServerConnectionBatchSize (1)
/**
 * 远程 MCP 服务器并发连接批大小：env `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE`，默认 20。（v2）
 */
function getRemoteMcpServerConnectionBatchSize() {
  return env.MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE ?? 20;
}
//@ chunk-8t8n4kdh.js:70932-70995 fingerprint = isLocalMcpServer (1)
/**
 * 判断是否本地服务器：未写 type、stdio 或 sdk。决定连接批次与是否自动重连。（v2）
 */
function isLocalMcpServer(config) {
  return !config.type || config.type === "stdio" || config.type === "sdk";
}
//@ chunk-8t8n4kdh.js:70995-71055 fingerprint = ALLOWED_IDE_TOOLS (1)
var ALLOWED_IDE_TOOLS = ["mcp__ide__executeCode", "mcp__ide__getDiagnostics"];
//@ chunk-8t8n4kdh.js:71055-71120 layout = isIncludedMcpTool (1)
function isIncludedMcpTool_2(tool) {
  return !tool.startsWith("mcp__ide__") || ALLOWED_IDE_TOOLS.includes(tool);
}
//@ chunk-8t8n4kdh.js:71120-71153 layout
function isIdeServer(e) {
  return isIncludedMcpTool_2(e.name);
}
//@ chunk-8t8n4kdh.js:71153-71191 layout
/**
 * 判断服务器地址是否命中某开关的主机列表。
 */
function featureHostListMatches(e, n) {
  return matchesHostList(getFeatureValue_CACHED_MAY_BE_STALE(e, []), n);
}
//@ chunk-8t8n4kdh.js:71191-71577 layout
/**
 * 判断 MCP 服务器地址的主机（或 CCR 代理目标主机）是否匹配主机列表（支持 * 与子域）。
 */
function matchesHostList(e, n) {
  if (!Array.isArray(e) || e.length === 0) return false;
  if (e.includes("*")) return true;
  if (!("url" in n) || typeof n.url !== "string") return false;
  let flattened = [
    URL.canParse(n.url) ? new URL(n.url).hostname.toLowerCase() : undefined,
    ccrProxyTargetHost(n.url),
  ].flatMap((s) => (s === undefined ? [] : [s]));
  return e.some((s) => {
    if (typeof s !== "string" || s === "") return false;
    let lower = s.toLowerCase();
    return flattened.some((y) => y === lower || y.endsWith(`.${lower}`));
  });
}
//@ chunk-8t8n4kdh.js:71577-71656 layout
/**
 * 该服务器是否在 elicitation 拒绝名单里。
 */
function isElicitationDenylisted(e) {
  return featureHostListMatches("tengu_mcp_legacy_url_elicitation_server_denylist", e);
}
//@ chunk-8t8n4kdh.js:71656-71723 layout
function shouldNormalizeRootCombinators(config) {
  return featureHostListMatches("tengu_mcp_normalize_root_combinators", config);
}
//@ chunk-8t8n4kdh.js:71723-71789 layout
function shouldDropInvalidToolSchemas(config) {
  return featureHostListMatches("tengu_mcp_drop_invalid_tool_schemas", config);
}
//@ chunk-8t8n4kdh.js:71789-71903 layout
/**
 * 测试专用：设置是否保留过期的重新认证条目（非测试调用时抛错）。
 */
function setHoldStaleReauthEntryForTest(e) {
  if (e) throw Error("setHoldStaleReauthEntryForTest is test-only");
  getCliOwnedState().holdStaleReauthEntryForTest = e;
}
//@ chunk-8t8n4kdh.js:71903-71951 layout
/**
 * 测试用：设置重新认证决策的接收器。
 */
function setReauthDecisionSinkForTest(reauthDecisionSinkForTest) {
  getCliOwnedState().reauthDecisionSinkForTest = reauthDecisionSinkForTest;
}
//@ chunk-8t8n4kdh.js:71951-72261 layout
/**
 * getMcpRoots（v2 副本）。
 */
function getMcpRoots(e = false) {
  let n = [];
  if (e)
    try {
      n = [pluginToolStagingRoot()];
    } catch (error) {
      logForDebugging(`MCP: staging root unavailable, omitted from roots/list: ${errorMessage(error)}`);
    }
  let r = new Set();
  let s = [];
  let toolsMachine = getToolsMachine();
  let y = toolsMachine ? (toolsMachine.directory?.path ?? null) : getOriginalCwdOrNull();
  for (let S of [...(y === null ? [] : [y]), ...getAnnouncedDirectories(), ...n]) {
    let href = pathToFileURL(S).href;
    if (r.has(href)) continue;
    r.add(href);
    s.push({
      uri: href,
    });
  }
  return {
    roots: s,
  };
}
//@ chunk-8t8n4kdh.js:72261-72291 layout
var ROOTLESS_PLUGIN_NAMES = new Set(["documents"]);
//@ chunk-8t8n4kdh.js:72291-72435 layout
function isDocumentsPluginServer(e) {
  if (getPlatform() === "windows") return false;
  if (!e.pluginSource) return false;
  try {
    return ROOTLESS_PLUGIN_NAMES.has(parsePluginIdentifier(e.pluginSource).name.toLowerCase());
  } catch {
    return false;
  }
}
//@ chunk-8t8n4kdh.js:72435-72572 layout
function notifyRootsListChanged() {
  for (let liveClient of getConnectionCache().liveClients)
    liveClient.sendRootsListChanged().catch((error) => {
      logForDebugging(`MCP: failed to send roots/list_changed: ${describeErrorBrief(error)}`);
    });
}
//@ chunk-8t8n4kdh.js:72572-73027 layout
/**
 * MCP SDK 错误码集合与可识别的 JSON Schema 草案地址集合。
 */
var MCP_SDK_ERROR_CODES = new Set(Object.values(SdkErrorCode));
var KNOWN_JSON_SCHEMA_DIALECTS = new Set([
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
//@ chunk-8t8n4kdh.js:73027-73216 layout
/**
 * JSON Schema 校验器包装：工具 schema 的 $schema 是已知草案（draft-04/06/07/2019-09）时先去掉该字段再交给内层校验器，避免因方言声明报错。
 */
class LegacyDialectToleratingValidator {
  inner = new Udn();
  getValidator(e) {
    let $schema = e.$schema;
    if ($schema !== undefined && KNOWN_JSON_SCHEMA_DIALECTS.has($schema.replace(/#$/, ""))) {
      let { $schema, ...s } = e;
      return this.inner.getValidator(s);
    }
    return this.inner.getValidator(e);
  }
}
//@ chunk-8t8n4kdh.js:73216-73692 layout
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
//@ chunk-8t8n4kdh.js:73692-73704 layout
/**
 * stdio 探测的默认超时（3000 毫秒）。
 */
var DEFAULT_STDIO_PROBE_TIMEOUT_MS = 3000;
//@ chunk-8t8n4kdh.js:73704-73825 layout
/**
 * 测试专用：设置 stdio 探测超时（非测试调用时抛错）。
 */
function setStdioProbeTimeoutMsForTest(e) {
  if (e !== undefined) throw Error("setStdioProbeTimeoutMsForTest is test-only");
  getCliOwnedState().stdioProbeTimeoutMsForTest = e;
}
//@ chunk-8t8n4kdh.js:73825-73882 layout
function getStdioProbeTimeoutMs() {
  return getCliOwnedState().stdioProbeTimeoutMsForTest ?? DEFAULT_STDIO_PROBE_TIMEOUT_MS;
}
//@ chunk-8t8n4kdh.js:73882-73960 layout
/**
 * 默认握手超时（5000 毫秒）。
 */
var REMOTE_PROBE_TIMEOUT_MS = 5000;
var DEFAULT_HANDSHAKE_TIMEOUT_MS = 5000;
var NEGOTIABLE_TRANSPORTS = new Set(["http", "claudeai-proxy", "ccr-proxy", "stdio"]);
//@ chunk-8t8n4kdh.js:73960-74026 layout
function getHandshakeTimeoutMs(e = DEFAULT_HANDSHAKE_TIMEOUT_MS) {
  let connectionTimeoutMs = getConnectionTimeoutMs();
  return Math.max(connectionTimeoutMs - e, Math.floor(connectionTimeoutMs / 3));
}
//@ chunk-8t8n4kdh.js:74026-74364 layout
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
//@ chunk-8t8n4kdh.js:74364-74598 layout
function rewriteInitializeCapabilities(e, serverRef, r) {
  let s = e.send.bind(e);
  e.send = (h, y) => {
    if (isJSONRPCRequest(h) && h.method === "initialize" && h.params?.capabilities !== undefined) {
      let S = clientCapabilitiesFor(serverRef, {
        denylisted: isElicitationDenylisted(serverRef),
      });
      return s(
        {
          ...h,
          params: {
            ...h.params,
            capabilities: r ? stripTasksCapability(S) : S,
          },
        },
        y,
      );
    }
    return s(h, y);
  };
}
//@ chunk-8t8n4kdh.js:74598-74666 layout
/**
 * isNegotiationDenylisted：服务器主机在 tengu_mcp_negotiation_server_denylist 中。
 */
function isNegotiationDenylisted(e) {
  return featureHostListMatches("tengu_mcp_negotiation_server_denylist", e);
}
//@ chunk-8t8n4kdh.js:74666-74729 layout
/**
 * isListenDenylisted：服务器主机在 tengu_mcp_listen_server_denylist 中（不发 subscriptions/listen）。
 */
function isListenDenylisted(serverRef) {
  return featureHostListMatches("tengu_mcp_listen_server_denylist", serverRef);
}
//@ chunk-8t8n4kdh.js:74729-74828 layout
/**
 * 按 tengu_tender_truffle 名单判断服务器是否命中。
 */
function tenderTruffleMatch(serverRef) {
  let { value: n, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_tender_truffle", []);
  return {
    listed: matchesHostList(n, serverRef),
    source,
  };
}
//@ chunk-8t8n4kdh.js:74828-76257 layout
/**
 * resolveVersionNegotiation：决定协议版本协商模式。MCP_PROTOCOL_NEGOTIATION=legacy|auto 优先；否则按传输查 GrowthBook tengu_mcp_protocol_negotiation_http/_claudeai/_stdio/_ccr（默认 true → auto），sse/ws/ide/进程内/sdk 一律 legacy；命中 tengu_mcp_negotiation_server_denylist 也回 legacy。auto 带探测超时（远程 5 秒，stdio 可测试覆盖，均不超过连接超时的 1/3）。
 */
function resolveVersionNegotiation(transportKind, config, denylisted) {
  let MCP_PROTOCOL_NEGOTIATION = env.MCP_PROTOCOL_NEGOTIATION;
  let h =
    MCP_PROTOCOL_NEGOTIATION === "legacy" || MCP_PROTOCOL_NEGOTIATION === "auto"
      ? MCP_PROTOCOL_NEGOTIATION
      : undefined;
  if (MCP_PROTOCOL_NEGOTIATION !== undefined && h === undefined)
    logForDebugging(
      `MCP_PROTOCOL_NEGOTIATION=${MCP_PROTOCOL_NEGOTIATION} is invalid; expected 'legacy' or 'auto' \u2014 ignoring`,
      {
        level: "warn",
      },
    );
  if (h === "legacy")
    return {
      mode: "legacy",
    };
  let probe = {
    timeoutMs: Math.min(REMOTE_PROBE_TIMEOUT_MS, Math.floor(getConnectionTimeoutMs() / 3)),
  };
  let probe_2 = {
    timeoutMs: Math.min(getStdioProbeTimeoutMs(), Math.floor(getConnectionTimeoutMs() / 3)),
  };
  if (h === "auto") {
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
  let w = (() => {
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
  if (w.mode === "auto" && config !== undefined && (denylisted ?? isNegotiationDenylisted(config))) {
    let P = "a url-less server (the '*' entry)";
    if ("url" in config && typeof config.url === "string") {
      try {
        P = new URL(config.url).hostname;
      } catch {
        P = "a server with an unparseable url";
      }
      let M = ccrProxyTargetHost(config.url);
      if (M !== undefined) P = `the proxy host ${P} or the mcp_url host ${M}`;
    }
    logForDebugging(`MCP era negotiation denylist matched ${P}; the legacy handshake applies`);
    return {
      mode: "legacy",
    };
  }
  return w;
}
//@ chunk-8t8n4kdh.js:76257-76655 layout
/**
 * Java MCP SDK 拒绝 elicitation 能力的错误识别：错误正则、错误体 schema、读取上限与给用户的修复提示。
 */
var JAVA_ELICITATION_REJECT_REGEX =
  /Unrecognized field \\?"(?:form|url)\\?" \(class [\w.$]*ClientCapabilities\$Elicitation\)/;
var javaErrorBodySchema = DoctorLazy(() =>
  u({
    message: literal("Invalid message format"),
    stackTrace: array(
      u({
        className: string(),
      }),
    ),
  }),
);
var MAX_JAVA_ERROR_BODY = 262144;
var JAVA_SDK_ELICITATION_HINT = `This server (Java MCP SDK 0.17.0 or older) rejected Claude Code's elicitation capability. Set "bareElicitationCapability": true for it, or upgrade to Java MCP SDK 0.17.1+ (Spring AI 1.0.7+ or 1.1.6+).`;
//@ chunk-8t8n4kdh.js:76655-76895 layout
function isJavaSdkElicitationRejection(error, serverRef, r) {
  let s = r instanceof StreamableHTTPClientTransport_2 && r.protocolVersion !== undefined;
  return (
    (((error instanceof ProtocolError || error instanceof SdkHttpError) &&
      JAVA_ELICITATION_REJECT_REGEX.test(error.message)) ||
      (error instanceof SdkHttpError &&
        error.status === 400 &&
        !s &&
        isJavaSdkStackTraceBody(error.data.text))) &&
    clientCapabilitiesFor(serverRef, {
      denylisted: isElicitationDenylisted(serverRef),
    }).elicitation?.url !== undefined
  );
}
//@ chunk-8t8n4kdh.js:76895-77101 layout
function isJavaSdkStackTraceBody(text) {
  if (typeof text !== "string" || text.length > MAX_JAVA_ERROR_BODY) return false;
  let n = javaErrorBodySchema().safeParse(safeParseJSON(text, false));
  return (
    n.success &&
    n.data.stackTrace.some((r) => r.className.startsWith("io.modelcontextprotocol.server.transport."))
  );
}
//@ chunk-8t8n4kdh.js:77101-77281 layout
function isNonJsonRpcClientError(error) {
  if (!(error instanceof SdkHttpError)) return false;
  let status = error.status;
  if (!(status >= 400 && status < 500) || status === 401 || status === 403 || status === 429) return false;
  let text = error.data.text;
  if (typeof text !== "string") return true;
  return !isJsonRpcErrorBody(text);
}
//@ chunk-8t8n4kdh.js:77281-77469 layout
function isJsonRpcErrorBody(text) {
  let found = text.split(/\r?\n/).find((line) => line.startsWith("data:"));
  let r = safeParseJSON(found === undefined ? text : found.slice(5), false);
  return isJSONRPCErrorResponse(
    typeof r === "object" && r !== null && "id" in r && r.id === null
      ? {
          ...r,
          id: undefined,
        }
      : r,
  );
}
//@ chunk-8t8n4kdh.js:77469-77794 layout
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
//@ chunk-8t8n4kdh.js:77794-77905 layout
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
//@ chunk-8t8n4kdh.js:77905-78171 layout
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
//@ chunk-8t8n4kdh.js:78171-78228 placement = initializeAgentMemorySnapshots (0.502)
/**
 * MCP initialize / tools/list 方法判定（MCP 客户端代码，切分误归）。
 */
function isSessionHandshakeMethod(agents) {
  return agents === "initialize" || agents === "tools/list";
}
//@ chunk-8t8n4kdh.js:78228-78420 placement
/**
 * MCP JSON-RPC 错误码分类（rpc_era / rpc_session）。
 */
function classifyMcpRpcErrorCode(code, n) {
  if (
    code === ProtocolErrorCode.UnsupportedProtocolVersion ||
    code === ProtocolErrorCode.MissingRequiredClientCapability
  )
    return "rpc_era";
  if (
    code === ProtocolErrorCode.InvalidRequest ||
    (code === ProtocolErrorCode.MethodNotFound && isSessionHandshakeMethod(n))
  )
    return "rpc_session";
  return;
}
//@ chunk-8t8n4kdh.js:78420-78579 placement
/**
 * MCP 连接错误分类（ProtocolError / SdkHttpError）。
 */
function classifyMcpConnectError(error, n) {
  if (error instanceof ProtocolError) return classifyMcpRpcErrorCode(error.code, n);
  if (error instanceof SdkHttpError) {
    if (
      error.status === 400 ||
      ((error.status === 404 || error.status === 405) && isSessionHandshakeMethod(n))
    )
      return "http_4xx";
  }
  return;
}
//@ chunk-8t8n4kdh.js:78579-78775 sole-consumer
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
//@ chunk-8t8n4kdh.js:78775-78931 sole-consumer
/**
 * makeConnectTimeoutError（v2 副本）。
 */
function makeConnectTimeoutError_2(e) {
  let n = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(e, "MCP connection timeout");
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_timeout_retry", true))
    return Object.assign(n, {
      code: "CONNECT_TIMEOUT",
    });
  return n;
}
//@ chunk-8t8n4kdh.js:78931-79035 sole-consumer = getServerCommandArray (0.781)
/**
 * 插件来源的 stdio 服务器连接失败时，按服务器签名在认证/失败缓存文件里写一条带时间戳的记录（经 authCacheWriteChain 串行化写入），下次可跳过。
 */
function recordPluginStdioServerFailure(serverName, n, storageV5) {
  if ((n.type === "stdio" || n.type === undefined) && n.pluginSource !== undefined)
    setMcpAuthCacheEntry(serverName, configHash(n), undefined, storageV5);
}
//@ chunk-8t8n4kdh.js:79035-79874 sole-consumer
/**
 * 包装传输 send：initialize 请求发出后立刻预发 tools/list（超时取 2×连接超时与上限的较小者），减少一次往返；出错时撤销包装，结果记入连接统计 sentAhead。
 */
async function pipelineEarlyToolsList(client, n, connectionTimeoutMs, s, h) {
  let send = n.send;
  let S;
  let page;
  let P;
  function M() {
    let startTime = performance.now();
    P = new AbortController();
    page = client.request(
      {
        method: "tools/list",
      },
      ListToolsResultSchema,
      {
        timeout: Math.min(2 * getConnectionTimeoutMs(), MAX_TIMER_DELAY_MS),
        signal: P.signal,
      },
    );
    page.catch(() => {});
    s.sentAhead = true;
    setAheadPage(s, page, startTime);
  }
  let j = (Q, ie) => {
    if (h && lYn(Q)) {
      let ge = send.call(n, Q, ie);
      M();
      return ge;
    }
    if (S !== undefined || !qNr(Q)) return send.call(n, Q, ie);
    if (n.send === j) n.send = send;
    S = send.call(n, Q, ie);
    S.catch(() => {});
    return Promise.resolve();
  };
  n.send = j;
  let onerror = client.onerror;
  client.onerror = (Q) => {
    takeAheadPage(s);
    onerror?.(Q);
  };
  function ce() {
    takeAheadPage(s);
    client.close().catch(() => {});
  }
  try {
    await client.connect(n, {
      timeout: connectionTimeoutMs,
    });
    if (S === undefined) return;
    if (h) {
      let timer = setTimeout(ce, connectionTimeoutMs);
      timer.unref?.();
      S.catch(ce).finally(() => clearTimeout(timer));
    } else {
      if (client.getServerCapabilities()?.tools !== undefined) M();
      try {
        await S;
      } catch (error) {
        ce();
        throw error;
      }
    }
  } finally {
    client.onerror = onerror;
    if (n.send === j) n.send = send;
  }
  if (page !== undefined && P !== undefined) armRequestTimeout(page, P);
  armAheadExpiry(s);
}
//@ chunk-8t8n4kdh.js:79874-79910 sole-consumer
/**
 * 2×连接超时不超过该服务器的有效工具超时时才允许预发 tools/list。
 */
function hasBudgetForEarlyToolsList(serverRef) {
  return 2 * getConnectionTimeoutMs() <= getMcpRequestTimeoutMs(serverRef);
}
//@ chunk-8t8n4kdh.js:80092-80104 sole-consumer
/**
 * 记录消息流结果前的固定延迟（2000 毫秒）。
 */
var INITIALIZED_EVENT_DELAY_MS = 2000;
//@ chunk-8t8n4kdh.js:80104-80486 sole-consumer
/**
 * 在 initialized 通知应答后的固定延迟时记录消息流结果事件。
 */
function scheduleMessageStreamOutcomeLog(client, name, r, s) {
  let h =
    r.initializedNotificationAnsweredAtMs ??
    (r.pendingMethod === "notifications/initialized" ? performance.now() : undefined);
  if (h === undefined) return;
  setTimeout(
    (S, w, P, M) =>
      logEvent("tengu_mcp_message_stream_outcome", {
        ...M,
        messageStreamGetOutcome: hasNoTransport(S)
          ? lit("client_closed")
          : fromEnum(P.messageStreamGetOutcome),
        mcpServerKeyHash: toolNameForTelemetry(w),
      }),
    Math.max(0, h + INITIALIZED_EVENT_DELAY_MS - performance.now()),
    client,
    name,
    r,
    s,
  ).unref?.();
}
//@ chunk-8t8n4kdh.js:80486-119566 sole-consumer
/**
 * connectToServer（v2）：按 name+config 记忆化的连接入口。建传输（sse/sse-ide/ws-ide/ws/http/claudeai-proxy/进程内 Chrome/stdio），组装 fetch 包装（超时、OAuth、头、一方登录、CCR 认证、discover -32601 侦测、握手计时）；按 resolveVersionNegotiation 决定 auto（先 server/discover 再按结果 modern 或 legacy initialize）或 legacy；处理 listing 先验、记住的 legacy 判定、stateless 代理本地应答、探测超时/拒绝后的重启与回退、HTTP→SSE 回退；成功后注册 roots/list、elicitation、onclose/onerror 清理与 list_changed 订阅，失败分类为 failed/needs-auth。
 */
var connectToServer = memoizeWithExternalCache(
  async (name, serverRef, serverStats, storageV5, credentials, dialOptions, connectOptions) => {
    primeEnsureConnected();
    let now = Date.now();
    let clockSnapshot = startClockSnapshot(connectOptions?.clock ?? systemClock);
    let M;
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
    let ge = false;
    let Ie = false;
    let transport_2;
    let processUptimeAtConnectStartMs = isDiskless() ? undefined : Math.round(process.uptime() * 1000);
    let handshakeTrace;
    let nt;
    let ee;
    let he;
    let Ae;
    let yt = false;
    let q;
    let discoverPrior;
    let discoverSource;
    let Ee;
    let Tt = (Te) => {
      discoverSource = Te;
      Ee = fromEnumOpt(Te);
    };
    let Qe = false;
    let usedRememberedLegacy = false;
    let discoverMethodNotFound = false;
    let wt = () =>
      usedRememberedLegacy ? "the remembered legacy verdict" : "the /v1/mcp_servers discover projection";
    let Se = false;
    let negotiation;
    let At = false;
    let ft;
    let Ot = isListenDenylisted(serverRef);
    let vt = isNegotiationDenylisted(serverRef);
    let me = () => {
      if (negotiation?.mode !== "auto" || q !== undefined) return;
      let _anthropicProbeLegacyEvidence = transport_2?._anthropicProbeLegacyEvidence;
      if (_anthropicProbeLegacyEvidence === "id-mismatch") q = lit("probe_id_mismatch");
      else if (_anthropicProbeLegacyEvidence === "malformed") q = lit("probe_malformed");
      else if (_anthropicProbeLegacyEvidence === "stream-end") q = lit("probe_stream_end");
      if (q !== undefined)
        logMCPDebug(
          name,
          `era probe classified the server legacy in-SDK (${String(_anthropicProbeLegacyEvidence)}); the 2025 handshake was used for this connect attempt`,
        );
    };
    try {
      let Bt = function () {
        let armedAt = Date.now();
        for (let activeCallWatchdog of We.activeCallWatchdogs)
          if (activeCallWatchdog.armedAt === 0) activeCallWatchdog.armedAt = armedAt;
      };
      let Te = isCcrInjectedMcpUrl(name, serverRef);
      let Ve = hasCliOwnedBearer(serverRef);
      let De =
        (serverRef.type === "sse" || serverRef.type === "http") && configHasAuthorizationHeader(serverRef);
      let Le =
        serverRef.type === "sse" || serverRef.type === "http" || serverRef.type === "ws"
          ? await getMcpServerHeaders(name, serverRef)
          : {};
      let re =
        (serverRef.type === "sse" || serverRef.type === "http") &&
        !!serverRef.headersHelper &&
        hasAuthorizationHeader(Le);
      let ue =
        (serverRef.type === "sse" || serverRef.type === "http") &&
        !De &&
        !re &&
        !Ve &&
        !Te &&
        isFirstPartyMcpUrl(serverRef.url) &&
        isFirstPartyProvider() &&
        (!!(
          isStorageV5Enabled() && credentials !== undefined
            ? await getClaudeAIOAuthTokensAsync(credentials)
            : getClaudeAIOAuthTokens()
        )?.accessToken ||
          (isDesignMcpUrl(serverRef.url) && (await checkConsent(credentials))));
      if (ue)
        logEvent("tengu_mcp_first_party_auto_auth", {
          transportType: fromEnum(serverRef.type),
          ...mcpBaseUrlAnalytics_2(serverRef, name),
        });
      let ot = {};
      if (serverRef.type === "sse") {
        recordPresentedHeaderSecrets(serverRef.headers, Le);
        let authProvider_2 = De || re || ue || Ve ? undefined : new ClaudeAuthProvider_2(name, serverRef);
        authProvider = authProvider_2;
        let U = await mcpProxyFetchOptions(serverRef.url);
        let fetchFn = createBoundedFetch(wrapFetchNoop(createFetchWithInit(undefined, U)));
        if (authProvider_2) fetchFn = wrapFetchWithStepUpDetection_2(fetchFn, authProvider_2);
        fetchFn = wrapFetchWithTimeout(fetchFn, serverRef);
        if (ue) fetchFn = wrapFetchWithFirstPartyAuth(fetchFn, credentials, ot);
        let fe = {
          authProvider: authProvider_2,
          skipIssuerMetadataValidation: true,
          fetch: fetchFn,
          requestInit: {
            ...U,
            headers: {
              "User-Agent": getMCPUserAgent(),
              "Accept-Encoding": "identity",
              ...Le,
            },
          },
        };
        let fetchFn_2 = wrapFetchNoop(async (Je, le) => {
          let dt = {};
          let Et = await authProvider_2?.tokens();
          if (Et) dt.Authorization = `Bearer ${Et.access_token}`;
          let It = await mcpProxyFetchOptions(String(Je));
          return fetch(Je, {
            ...le,
            ...It,
            headers: mergeRequestHeaders(le?.headers, dt, Le),
          });
        });
        fe.eventSourceInit = {
          fetch: createBoundedFetch(
            authProvider_2
              ? wrapFetchWithStepUpDetection_2(fetchFn_2, authProvider_2)
              : ue
                ? wrapFetchWithFirstPartyAuth(fetchFn_2, credentials, ot)
                : fetchFn_2,
          ),
        };
        Ae = () => new SSEClientTransport_2(new URL(serverRef.url), fe);
        transport_2 = Ae();
        logMCPDebug(name, "SSE transport initialized, awaiting connection");
      } else if (serverRef.type === "sse-ide") {
        logMCPDebug(name, `Setting up SSE-IDE transport to ${redactUrlSecrets(serverRef.url)}`);
        let x = {
          fetch: createBoundedFetch(globalThis.fetch),
          requestInit: {
            headers: {
              "User-Agent": getMCPUserAgent(),
              "Accept-Encoding": "identity",
            },
          },
        };
        transport_2 = new SSEClientTransport_2(new URL(serverRef.url), x);
      } else if (serverRef.type === "ws-ide") {
        let webSocketTLSOptions = getWebSocketTLSOptions(serverRef.url);
        getPresentedCredentialLog().record(serverRef.authToken);
        let headers = {
          "User-Agent": getMCPUserAgent(),
          ...(serverRef.authToken && {
            "X-Claude-Code-Ide-Authorization": serverRef.authToken,
          }),
        };
        let Z = new globalThis.WebSocket(serverRef.url, {
          protocols: ["mcp"],
          headers,
          proxy: getWebSocketProxyUrl(serverRef.url),
          tls: webSocketTLSOptions || undefined,
        });
        transport_2 = new WebSocketTransport(Z, (fe) => fZe.parse(fe));
      } else if (serverRef.type === "ws") {
        recordPresentedHeaderSecrets(serverRef.headers, Le);
        logMCPDebug(name, `Initializing WebSocket transport to ${redactUrlSecrets(serverRef.url)}`);
        let webSocketTLSOptions = getWebSocketTLSOptions(serverRef.url);
        let U = Te ? getSessionIngressAuthToken() : null;
        getPresentedCredentialLog().record(U ?? undefined);
        let Z = {
          "User-Agent": getMCPUserAgent(),
          ...(U && {
            Authorization: `Bearer ${U}`,
          }),
          ...Le,
        };
        let headers = redactHeaders(Z);
        logMCPDebug(
          name,
          `WebSocket transport options: ${jsonStringify({
            url: redactUrlSecrets(serverRef.url),
            headers,
            hasSessionAuth: !!U,
          })}`,
        );
        let ve = new globalThis.WebSocket(serverRef.url, {
          protocols: ["mcp"],
          headers: Z,
          proxy: getWebSocketProxyUrl(serverRef.url),
          tls: webSocketTLSOptions || undefined,
        });
        transport_2 = new WebSocketTransport(ve, (Ne) => fZe.parse(Ne));
      } else if (serverRef.type === "http") {
        recordPresentedHeaderSecrets(serverRef.headers, Le);
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
          De || re || ue || Ve || Te ? undefined : new ClaudeAuthProvider_2(name, serverRef);
        authProvider = authProvider_2;
        let U = await mcpProxyFetchOptions(serverRef.url);
        let fetchFn = createBoundedFetch(
          wrapFetchNoop(createFetchWithInit(Te ? hostedWorkerFetch : undefined, U)),
          {
            refusesCodings: issuerKey_3(serverRef.url),
          },
        );
        if (authProvider_2) fetchFn = wrapFetchWithStepUpDetection_2(fetchFn, authProvider_2);
        fetchFn = wrapFetchWithTimeout(fetchFn, serverRef);
        if (ue) fetchFn = wrapFetchWithFirstPartyAuth(fetchFn, credentials, ot);
        if (Te)
          fetchFn = wrapFetchSkipListenGet(
            wrapFetchWithCcrSessionAuth(fetchFn, dialOptions, serverCacheKey(name, serverRef)),
            name,
            serverRef.url,
          );
        fetchFn = restrictRemoteRepoCalls(fetchFn, serverRef);
        if (issuerKey_3(serverRef.url)) {
          let Ne = fetchFn;
          fetchFn = (Je, le) => {
            let dt = le?.method === "POST" ? getRequestTimingStore()?.mark("own") : undefined;
            return Ne(Je, le).finally(dt);
          };
        }
        if (Ve) fetchFn = wrapFetchWithCliOwnedBearer(fetchFn, serverRef);
        if (getDiscoverVerdictKey(serverRef) !== undefined)
          fetchFn = wrapFetchDetectDiscoverMethodNotFound(fetchFn, () => {
            discoverMethodNotFound = true;
          });
        let handshakeTrace_2 = createHandshakeTrace({
          mcpUrl: serverRef.url,
          keepAliveDisabled: U.keepalive === false,
          getAnsweredLocally: false,
          statelessGated: false,
        });
        handshakeTrace = handshakeTrace_2;
        fetchFn = wrapFetchWithHandshakeTrace(fetchFn, handshakeTrace_2);
        let ve = {
          authProvider: authProvider_2,
          skipIssuerMetadataValidation: true,
          fetch: fetchFn,
          requestInit: {
            ...U,
            headers: {
              "User-Agent": getMCPUserAgent(),
              "Accept-Encoding": "identity",
              ...Le,
            },
          },
        };
        if (keepsMCPDebug()) {
          let headers = ve.requestInit?.headers ? redactHeaders(ve.requestInit.headers) : undefined;
          logMCPDebug(
            name,
            `HTTP transport options: ${jsonStringify({
              url: redactUrlSecrets(serverRef.url),
              headers,
              hasAuthProvider: !!authProvider_2,
              timeoutMs: getMcpRequestTimeoutMs(serverRef),
            })}`,
          );
        }
        he = () => {
          resetHandshakeTrace(handshakeTrace_2);
          return new StreamableHTTPClientTransport_2(new URL(serverRef.url), ve);
        };
        transport_2 = he();
        logMCPDebug(name, "HTTP transport created successfully");
        if (!isCcrHostedConfig(serverRef) && !isFirstPartyMcpUrl(serverRef.url) && !Ve)
          nt = ({ postMethodNotAllowed, dialSignal, dialConnected }) => {
            let dt = (Gt) =>
              dialConnected()
                ? Gt
                : {
                    ...Gt,
                    signal: Gt?.signal ? AbortSignal.any([Gt.signal, dialSignal]) : dialSignal,
                  };
            let Et = false;
            let It = async (Gt, tn) => {
              let An = await fetchFn(Gt, dt(tn));
              if (!postMethodNotAllowed && !Et) {
                if (An.status === 401) {
                  await An.body?.cancel().catch(() => {});
                  throw Error(
                    "legacy HTTP+SSE stream GET answered 401 after the initialize POST was not a 405; not starting OAuth against this URL",
                  );
                }
                Et = An.ok;
              }
              return An;
            };
            let Zt = (Gt, tn) =>
              tn?.body instanceof URLSearchParams && tn.body.has("grant_type")
                ? fetchFn(Gt, tn)
                : fetchFn(Gt, dt(tn));
            return new SSEClientTransport_2(new URL(serverRef.url), {
              authProvider: authProvider_2,
              skipIssuerMetadataValidation: true,
              fetch: Zt,
              eventSourceInit: {
                fetch: It,
              },
              requestInit: ve.requestInit,
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
        let Z = `${oauthConfig.MCP_PROXY_URL}${oauthConfig.MCP_PROXY_PATH.replace("{server_id}", serverRef.id)}`;
        logMCPDebug(name, `Using claude.ai proxy at ${Z}`);
        let proxyFetchOptions = getProxyFetchOptions({
          url: Z,
        });
        let claudeAiProxyFetch = createClaudeAiProxyFetch(
          createBoundedFetch(createFetchWithInit(undefined, proxyFetchOptions)),
          credentials,
        );
        let Ne = isSereneTeapotEnabled();
        let Je = Ne || isStatelessClaudeAiProxy(serverRef);
        if (Je)
          logMCPDebug(
            name,
            Ne
              ? "GET notification stream disabled for claude.ai connectors; a GET the SDK sends to the proxy URL is answered locally with 405"
              : "GET notification stream disabled (stateless connector); if the SDK requests it, it gets a local 405",
          );
        let handshakeTrace_2 = createHandshakeTrace({
          mcpUrl: Z,
          keepAliveDisabled: proxyFetchOptions.keepalive === false,
          getAnsweredLocally: Je,
          statelessGated: isStatelessClaudeAiProxy(serverRef),
        });
        handshakeTrace = handshakeTrace_2;
        let Et = {
          fetch: wrapFetchWithHandshakeTrace(
            wrapFetchDetectDiscoverMethodNotFound(
              Je
                ? answerGetStreamLocally(wrapFetchWithTimeout(claudeAiProxyFetch, serverRef), Z)
                : wrapFetchWithTimeout(claudeAiProxyFetch, serverRef),
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
        he = () => {
          resetHandshakeTrace(handshakeTrace_2);
          return new StreamableHTTPClientTransport_2(new URL(Z), Et);
        };
        transport_2 = he();
        logMCPDebug(name, "claude.ai proxy transport created successfully");
      } else if (isStdioConfig(serverRef) && isClaudeInChromeMCPServer(name)) {
        let { isClaudeInChromeAllowed } = await import("./chunk-2jvt0tn4.js");
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
        let { createChromeContext } = await import("./chunk-ztt2k9pv.js");
        let { createChromeSocketClient, createClaudeForChromeMcpServer } =
          env.CLAUDE_CODE_CHROME_LATE_MCP_SERVER === true
            ? await import("./chunk-t8hkp4g3.js")
            : await import("./chunk-3ewc7v9f.js");
        let { createLinkedTransportPair } = await import("./chunk-qa6ep5c8.js");
        let { setChromeBinding } = await import("./chunk-yx8pxhkm.js");
        let { registerChromeTabGroupCleanup } = await import("./chunk-9a6n2431.js");
        let chromeContext = createChromeContext(serverRef.env, {
          availabilityFunnel: true,
          credentials,
          bearerGate: async () => isClaudeInChromeAllowed(),
        });
        let chromeSocketClient = createChromeSocketClient(chromeContext);
        setChromeBinding(chromeContext, chromeSocketClient);
        registerChromeTabGroupCleanup();
        inProcessServer = createClaudeForChromeMcpServer(chromeContext, chromeSocketClient);
        let [Et, It] = createLinkedTransportPair();
        await inProcessServer.connect(It);
        transport_2 = Et;
        logMCPDebug(name, "In-process Chrome MCP server started");
      } else if (serverRef.type === "stdio" || !serverRef.type) {
        assertProgramLaunchAllowed();
        let x = () => ({
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
        let { shellPrefix, baseEnv } = runWithPluginWriteScope(serverRef, x);
        let fe = shellPrefix || serverRef.command;
        let ve = shellPrefix ? [shellQuoteArgs([serverRef.command, ...serverRef.args])] : serverRef.args;
        let { command, args, pending, capped } = isMcpServerBackingToolHook(name)
          ? {
              command: fe,
              args: ve,
              pending: false,
              capped: false,
            }
          : wrapCommandInCgroup("mcp", fe, ve);
        ge = pending;
        Ie = capped;
        let { CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_CHROME_MCP_ORG_DENIED, ...Zt } = baseEnv;
        let projectConfigRoot = getProjectConfigRoot();
        let tn = {
          ...Zt,
          CLAUDE_PROJECT_DIR: projectConfigRoot ?? getProjectRoot(),
          CLAUDE_CODE_SESSION_ID: getSessionId(),
          CLAUDECODE: "1",
          ...serverRef.env,
          ...(!isPolicyAllowed("allow_claude_browser_extension") && {
            CLAUDE_CODE_CHROME_MCP_ORG_DENIED: "1",
          }),
        };
        checkPluginBunOptions(serverRef.pluginSource, tn, Zt);
        ee = {
          command,
          args,
          env: tn,
          stderr: "pipe",
          ...(projectConfigRoot !== null && {
            cwd: projectConfigRoot,
          }),
        };
        transport_2 = new BoundedStdioClientTransport(ee);
      } else throw Error(`Unsupported server type: ${serverRef.type}`);
      let it;
      let ye;
      let be = "";
      let ct = () => {
        if (serverRef.type === "stdio" || !serverRef.type) {
          let x = transport_2;
          if (x.stderr instanceof Readable) {
            ye = x.stderr;
            it = (U) => {
              if (be.length < 67108864)
                try {
                  be += U.toString();
                } catch {}
            };
            ye.on("data", it);
          }
        }
      };
      ct();
      let transportKind = classifyTransportKind(serverRef.type, {
        inProcess: inProcessServer !== undefined,
        ccrProxy: isCcrHostedConfig(serverRef),
        ccrToolport: serverRef.type === "http" && isCcrMcpPath(serverRef.url),
      });
      negotiation = resolveVersionNegotiation(transportKind, serverRef, vt);
      if (negotiation.mode === "auto") {
        discoverPrior = getListingDiscoverPrior(serverRef);
        if (discoverPrior === undefined) {
          discoverPrior = await getRememberedLegacyPrior(serverRef, storageV5);
          usedRememberedLegacy = discoverPrior !== undefined;
        }
      }
      let Vt = shouldRestrictRemoteHost(serverRef);
      let Fe = (x) => {
        let U = yt
          ? clientCapabilitiesForSdk()
          : x.mode === "auto"
            ? clientCapabilitiesWithElicitation()
            : clientCapabilitiesFor(serverRef, {
                denylisted: isElicitationDenylisted(serverRef),
              });
        let Z = new Client_2(
          {
            name: "claude-code",
            title: "Claude Code",
            version:
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION ?? "unknown",
            description: "Anthropic's agentic coding tool",
            websiteUrl: HTTPS_CLAUDE_COM_CLAUDE_CODE,
          },
          {
            capabilities: Vt ? stripTasksCapability(U) : U,
            jsonSchemaValidator: isDisklessContext()
              ? NO_OP_SCHEMA_VALIDATOR
              : new LegacyDialectToleratingValidator(),
            responseCacheStore: makeStepUpDialog(name),
            versionNegotiation: x,
            ...(Ot
              ? {}
              : {
                  listChanged: {
                    tools: {
                      autoRefresh: false,
                      debounceMs: 0,
                      onChanged: () => noteListChangedAhead_2(Z),
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
        Z.setRequestHandler("roots/list", async () => {
          logMCPDebug(name, "Received ListRoots request from server");
          return getMcpRoots(isDocumentsPluginServer(serverRef));
        });
        if (Vt) getCliOwnedState().clientTasksDeclaredBeforeServerList.set(Z, U);
        return Z;
      };
      let client = Fe(negotiation);
      logMCPDebug(name, `Starting connection with timeout of ${getConnectionTimeoutMs()}ms`);
      if (serverRef.type === "http" && keepsMCPDebug()) {
        logMCPDebug(name, `Testing basic HTTP connectivity to ${redactUrlSecrets(serverRef.url)}`);
        try {
          let x = new URL(serverRef.url);
          let U = redactUrlSecrets(x.href);
          let Z = URL.canParse(U) ? new URL(U) : undefined;
          logMCPDebug(
            name,
            Z
              ? `Parsed URL: host=${Z.hostname}, port=${Z.port || "default"}, protocol=${Z.protocol}`
              : `Parsed URL: ${U}`,
          );
          if (x.hostname === "127.0.0.1" || x.hostname === "localhost")
            logMCPDebug(name, `Using loopback address: ${x.hostname}`);
        } catch {
          logMCPDebug(name, `Failed to parse URL: ${redactUrlSecrets(serverRef.url)}`);
        }
      }
      let cachedInitialize = getCachedInitializeResult(serverRef);
      let discoverAnswer = getLocalDiscoverAnswer(serverRef);
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
        answerHandshakeLocally(transport_2, cachedInitialize, discoverAnswer);
      }
      guardTransportSend(
        {
          name,
        },
        transport_2,
      );
      let Oe = (error) => {
        let status = error instanceof SdkHttpError ? error.status : undefined;
        return (
          error instanceof UnauthorizedError_2 ||
          (error instanceof Error && error.name === "UnauthorizedError") ||
          (error instanceof ZodError && authProvider?.sawAuthChallenge === true) ||
          error instanceof IssuerEchoCrossOriginError ||
          (serverRef.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error)) ||
          status === 401 ||
          status === 403
        );
      };
      if (negotiation.mode === "auto")
        Tt(
          discoverPrior !== undefined
            ? usedRememberedLegacy
              ? "remembered_legacy"
              : discoverPrior.kind === "modern"
                ? "listing_body"
                : "listing_legacy"
            : isStatelessClaudeAiProxy(serverRef) &&
                (discoverAnswer !== undefined || cachedInitialize !== undefined)
              ? "stateless_local"
              : "wire",
        );
      let we;
      let Ke = async (discoverPrior, U) => {
        logMCPDebug(
          name,
          discoverPrior.kind === "modern"
            ? "claude.ai proxy \u2014 adopting the /v1/mcp_servers discover projection (2026-07-28 era; no server/discover round trip)"
            : usedRememberedLegacy
              ? "remembered as a legacy peer from an earlier connect (its server/discover probe was answered method-not-found or not at all); skipping the probe"
              : "claude.ai proxy \u2014 /v1/mcp_servers projects a legacy peer; skipping the server/discover probe",
        );
        await client.connect(U, {
          timeout:
            U instanceof BoundedStdioClientTransport ? getConnectionTimeoutMs() : getHandshakeTimeoutMs(),
          prior: discoverPrior,
        });
        if (discoverPrior.kind !== "modern" || Ot) return;
        let Z = listChangedCapabilities(client);
        if (Z === undefined) return;
        try {
          let fe = await client.listen(Z, {
            timeout: getHandshakeTimeoutMs(),
          });
          if (client.transport === undefined) return;
          we = fe;
        } catch (error) {
          if (Oe(error) || classifyMcpConnectError(error, "subscriptions/listen") !== undefined) throw error;
          logMCPDebug(
            name,
            `connect-time subscriptions/listen did not establish (${truncateToLength(describeConnectError(error, serverRef), 200)}); proceeding without it`,
          );
        }
      };
      let He = (x, U, Z) => {
        M ??= startClockSnapshot(clockSnapshot.clock);
        let fe = x();
        let promise = new Promise((resolve, reject) => {
          let le = clockSnapshot.clock.setTimeout(() => {
            logMCPDebug(
              name,
              `Connection timeout triggered after ${formatConnectElapsed(clockSnapshot)} (limit: ${Z}ms)`,
            );
            if (inProcessServer) inProcessServer.close().catch(() => {});
            U.close().catch(() => {});
            At = true;
            reject(
              makeConnectTimeoutError_2(
                `MCP server "${name}" connection timed out after ${getConnectionTimeoutMs()}ms`,
              ),
            );
          }, Z);
          fe.then(le, le);
        });
        return Promise.race([fe, promise]);
      };
      let tt = async (transport, negotiation_2) => {
        if (negotiation_2.mode === "auto") {
          rewriteInitializeCapabilities(transport, serverRef, Vt);
          installModernResultBackfill(transport, name);
        }
        let Z = false;
        let fe = false;
        let ve = connectOptions?.toolsListFirst === true && name === REMOTE_DEVICES;
        let Ne =
          (ve || connectOptions?.toolsListAhead === true) &&
          transportKind === "ccr-proxy" &&
          negotiation_2.mode === "legacy" &&
          discoverPrior === undefined &&
          !Ot &&
          transport instanceof StreamableHTTPClientTransport_2
            ? ve
              ? {
                  listed: true,
                  source: undefined,
                }
              : tenderTruffleMatch(serverRef)
            : undefined;
        let Je = Ne === undefined ? undefined : armToolsListAhead(client, Ne.source, vt, Ne.listed);
        ft = Je;
        try {
          await He(
            () =>
              discoverPrior !== undefined
                ? Ke(discoverPrior, transport)
                : Je !== undefined && Ne?.listed && hasBudgetForEarlyToolsList(serverRef)
                  ? pipelineEarlyToolsList(client, transport, getConnectionTimeoutMs(), Je, ve)
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
          if (transport instanceof BoundedStdioClientTransport && client.autoOpenedSubscription !== undefined)
            try {
              await client.discover({
                timeout: negotiation_2.probe?.timeoutMs ?? getStdioProbeTimeoutMs(),
              });
            } catch (error) {
              if (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout) {
                Z = true;
                throw error;
              }
              if (client.transport === undefined) {
                fe = true;
                throw error;
              }
              logMCPDebug(
                name,
                `server/discover sent after the subscriptions/listen acknowledgement got an error (${truncateToLength(describeConnectError(error, serverRef), 200)}); the server still reads requests, so it is not restarted`,
              );
            }
        } catch (error) {
          let dt =
            negotiation?.mode === "auto" &&
            error instanceof SdkError &&
            error.code === SdkErrorCode.EraNegotiationFailed;
          let Et =
            !Z &&
            negotiation?.mode === "auto" &&
            error instanceof SdkError &&
            error.code === SdkErrorCode.RequestTimeout &&
            transport_2?._anthropicProbeTimedOut === true;
          let It =
            !fe &&
            negotiation?.mode === "auto" &&
            error instanceof SdkError &&
            error.code === SdkErrorCode.ConnectionClosed &&
            transport_2 instanceof BoundedStdioClientTransport &&
            transport_2._anthropicProbeTimedOut === true;
          let Zt =
            negotiation?.mode === "auto" &&
            error instanceof ProtocolError &&
            transport_2 instanceof BoundedStdioClientTransport &&
            transport_2._anthropicProbeTimedOut === true &&
            !isJavaSdkElicitationRejection(error, serverRef, transport);
          let Gt =
            Zt &&
            error instanceof ProtocolError &&
            error.code === ProtocolErrorCode.UnsupportedProtocolVersion;
          let _anthropicRediscoverError = Zt ? transport_2._anthropicRediscoverError : undefined;
          let An =
            transport_2 instanceof BoundedStdioClientTransport && transport_2.overflowError !== undefined;
          if (dt) {
            let xt = error.data;
            let cause = typeof xt === "object" && xt !== null && "cause" in xt ? xt.cause : error.cause;
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
          let Xi = discoverPrior !== undefined && he !== undefined && !At && !Oe(error);
          let Nr =
            discoverPrior !== undefined &&
            usedRememberedLegacy &&
            ee !== undefined &&
            error instanceof ProtocolError &&
            !isJavaSdkElicitationRejection(error, serverRef, transport);
          let Un = {
            mode: "legacy",
          };
          let $n = ee;
          let Qn = $n !== undefined ? () => new BoundedStdioClientTransport($n) : (he ?? Ae);
          let Fr = (xt, Ut) => {
            if (it && ye) ye.off("data", it);
            if (be) {
              logMCPDebug(name, `${Ut}: ${be}`);
              be = "";
            }
            transport_2 = new BoundedStdioClientTransport(xt);
            ct();
            return transport_2;
          };
          let xr =
            he ??
            ($n !== undefined
              ? () =>
                  Fr(
                    $n,
                    "stderr of the stdio server that answered the legacy initialize of the remembered dial with an error, before restarting it",
                  )
              : undefined);
          let Ur = async (xt, Ut) => {
            yt = true;
            await xt.close().catch(() => {});
            if (it && ye) ye.off("data", it);
            if (be) {
              logMCPDebug(
                name,
                `stderr of the stdio server that refused elicitation form and url, before restarting it: ${be}`,
              );
              be = "";
            }
            transport_2 = Ut();
            ct();
            return transport_2;
          };
          if (discoverPrior !== undefined && (Xi || Nr) && xr !== undefined) {
            let xt =
              classifyMcpConnectError(
                error,
                discoverPrior.kind === "modern" ? "subscriptions/listen" : "initialize",
              ) ??
              (error instanceof SdkError && error.code === SdkErrorCode.EraNegotiationFailed
                ? "rpc_era"
                : Nr
                  ? "rpc_other"
                  : undefined);
            let Ut = truncateToLength(describeConnectError(error, serverRef), 200);
            if (xt !== undefined) {
              logMCPDebug(
                name,
                $n !== undefined
                  ? `the stdio server answered the initialize of a connect built from ${wt()} with an error (${Ut}); discarding it and restarting the server once with the server/discover probe`
                  : `the upstream rejected a connect built from ${wt()} (${Ut}); discarding it for this connector and re-probing server/discover on a fresh transport`,
              );
              burnDiscoverPrior(serverRef, discoverPrior.kind, storageV5);
              Qe = true;
              logEvent("tengu_mcp_listing_prior_rejected", {
                phase: lit("connect"),
                priorKind: fromEnum(discoverPrior.kind),
                priorSource: Ee,
                reason: fromEnum(xt),
                transportType: fromEnum(serverRef.type ?? "stdio"),
                ...mcpBaseUrlAnalytics_2(serverRef, name),
              });
            } else
              logMCPDebug(
                name,
                `connect built from ${wt()} failed (${Ut}); retrying this dial with a wire probe, prior kept`,
              );
            Se = true;
            discoverPrior = undefined;
            Tt("wire");
            we = undefined;
            Un = negotiation ?? Un;
            await transport.close().catch(() => {});
            transport_2 = xr();
          } else if (
            (dt || It || Zt || Z || fe) &&
            (serverRef.type === "stdio" || !serverRef.type) &&
            ee !== undefined &&
            !An
          ) {
            logMCPDebug(
              name,
              Zt && error instanceof ProtocolError
                ? `stdio server rejected initialize with JSON-RPC error ${error.code} (${truncateToLength(describeConnectError(error, serverRef), 200)}) after the version negotiation probe timed out (likely a slow-starting server that read the stale probe first), and a second server/discover on the same process ${_anthropicRediscoverError === undefined ? "was not attempted (the error named only protocol versions this client lacks)" : `got no usable answer (${truncateToLength(describeConnectError(_anthropicRediscoverError, serverRef), 200)})`}; restarting it once without the probe, within the remaining connect budget`
                : It
                  ? "stdio server exited during initialize after the version negotiation probe timed out (likely a slow-starting server that exits on requests before initialize); restarting it once without the probe, within the remaining connect budget"
                  : Z
                    ? `stdio server negotiated ${client.getNegotiatedProtocolVersion()} and acknowledged subscriptions/listen, then did not answer a follow-up server/discover within ${negotiation_2.probe?.timeoutMs ?? getStdioProbeTimeoutMs()}ms (a server that stops reading requests while it holds the listen, as mark3labs/mcp-go 1.x before 1.1.1 does); restarting it once with the legacy handshake, which sends no listen, within the remaining connect budget`
                    : fe
                      ? `stdio server acknowledged subscriptions/listen and then exited before answering a follow-up server/discover (${truncateToLength(describeConnectError(error, serverRef), 200)}); restarting it once with the legacy handshake, which sends no server/discover and no listen, within the remaining connect budget`
                      : "version negotiation probe closed the stdio server (rmcp-class pre-init hard close); respawning pinned legacy",
            );
            q = Gt
              ? lit("era_locked_after_probe_timeout")
              : Zt
                ? lit("rejected_after_probe_timeout")
                : It
                  ? lit("closed_after_probe_timeout")
                  : Z
                    ? lit("stalled_after_listen")
                    : fe
                      ? lit("closed_after_listen")
                      : lit("closed");
            await transport.close().catch(() => {});
            transport_2 = Fr(ee, "stderr of the stdio server before restarting it");
          } else if ((dt || Et) && he !== undefined) {
            logMCPDebug(
              name,
              Et
                ? `version negotiation probe timed out on the ${serverRef.type ?? "http"} transport; reconnecting pinned legacy within the remaining budget`
                : `version negotiation probe failed on the ${serverRef.type ?? "http"} transport; reconnecting pinned legacy`,
            );
            q = Et ? lit("probe_timeout") : lit("probe_failed");
            await transport.close().catch(() => {});
            transport_2 = he();
            if (isStatelessClaudeAiProxy(serverRef)) answerHandshakeLocally(transport_2, cachedInitialize);
          } else if (
            !Oe(error) &&
            isJavaSdkElicitationRejection(error, serverRef, transport) &&
            Qn !== undefined
          ) {
            logMCPDebug(
              name,
              "server rejected elicitation form and url at initialize (Java MCP SDK 0.17.0 or older); reconnecting once without elicitation form and url",
            );
            transport_2 = await Ur(transport, Qn);
          } else throw error;
          client = Fe(Un);
          guardTransportSend(
            {
              name,
            },
            transport_2,
          );
          if (Un.mode === "auto") {
            rewriteInitializeCapabilities(transport_2, serverRef, Vt);
            installModernResultBackfill(transport_2, name);
          }
          let max = Math.max(
            1000,
            getConnectionTimeoutMs() - (clockSnapshot.clock.monotonicNow() - clockSnapshot.awakeStart),
          );
          let $r = client.connect(transport_2, {
            timeout: Un.mode === "auto" ? Math.min(max, getHandshakeTimeoutMs()) : max,
          });
          let Zn = transport_2;
          let Br = false;
          try {
            await Promise.race([
              $r,
              new Promise((resolve, reject) => {
                let timer = setTimeout(
                  (bo, hn, eo) => {
                    Br = true;
                    bo.close().catch(() => {});
                    hn(
                      makeConnectTimeoutError_2(
                        `MCP server "${eo}" connection timed out after ${getConnectionTimeoutMs()}ms`,
                      ),
                    );
                  },
                  max,
                  Zn,
                  reject,
                  name,
                );
                $r.then(
                  () => clearTimeout(timer),
                  () => clearTimeout(timer),
                );
              }),
            ]);
          } catch (error_2) {
            let Ut = Br;
            let On = Oe(error_2);
            if (
              !yt &&
              !On &&
              !Ut &&
              Qn !== undefined &&
              isJavaSdkElicitationRejection(error_2, serverRef, Zn)
            ) {
              logMCPDebug(
                name,
                "server rejected elicitation form and url on the reconnect (Java MCP SDK 0.17.0 or older); reconnecting once more without elicitation form and url",
              );
              let hn = await Ur(Zn, Qn);
              guardTransportSend(
                {
                  name,
                },
                hn,
              );
              client = Fe({
                mode: "legacy",
              });
              let max = Math.max(1000, getConnectionTimeoutMs() - (Date.now() - now));
              At = false;
              try {
                await He(
                  () =>
                    client.connect(hn, {
                      timeout: max,
                    }),
                  hn,
                  max,
                );
                return;
              } catch (error_2) {
                if (Et && !At && !Oe(error_2)) {
                  logMCPDebug(
                    name,
                    `the dial without elicitation form and url after the probe timeout failed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); keeping the probe timeout as the error so the connect can be retried`,
                  );
                  throw error;
                }
                throw error_2;
              }
            }
            if (Et && !On && !Ut) {
              let hn = truncateToLength(describeConnectError(error_2, serverRef), 200);
              logMCPDebug(
                name,
                `pinned-legacy retry after the probe timeout failed typed (${hn}); preserving the timeout classification so the connect stays ladder-retryable`,
              );
              throw error;
            }
            let bo =
              error_2 instanceof SdkError &&
              error_2.code === SdkErrorCode.RequestTimeout &&
              Zn._anthropicProbeTimedOut === true;
            if (
              Se &&
              !On &&
              !Ut &&
              error_2 instanceof SdkError &&
              (error_2.code === SdkErrorCode.EraNegotiationFailed || bo)
            ) {
              if (!Qe) throw error;
              logMCPDebug(
                name,
                `wire probe after discarding ${wt()} failed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); booking a retryable connect timeout so the next dial re-probes prior-free with the legacy rescue`,
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
          await tt(transport_2, negotiation);
        } catch (error) {
          if (
            nt === undefined ||
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
          let Z = error.status === 405;
          await transport_2.close().catch(() => {});
          let fe = handshakeTrace;
          markConnectEnded(fe);
          handshakeTrace = undefined;
          let abortController = new AbortController();
          let Ne = false;
          let Je = nt({
            postMethodNotAllowed: Z,
            dialSignal: abortController.signal,
            dialConnected: () => Ne,
          });
          transport_2 = Je;
          guardTransportSend(
            {
              name,
            },
            Je,
          );
          client = Fe({
            mode: "legacy",
          });
          let le = authProvider?.sawAuthChallenge === true;
          let min = Math.min(
            REMOTE_PROBE_TIMEOUT_MS,
            Math.max(1000, getConnectionTimeoutMs() - (Date.now() - now)),
          );
          At = false;
          try {
            await He(
              () =>
                client.connect(Je, {
                  timeout: min,
                }),
              Je,
              min,
            );
          } catch (error_2) {
            await Je.close().catch(() => {});
            abortController.abort();
            let It = !le && authProvider?.sawAuthChallenge === true;
            let Zt = isAuthFailure(error_2, error_2 instanceof SseError_2 ? error_2.code : undefined, It);
            if (At && Z && It) {
              logMCPDebug(
                name,
                "legacy HTTP+SSE stream GET answered with an auth challenge; its auth flow outran the fallback budget, so routing to needs-auth",
              );
              throw new UnauthorizedError_2(
                `MCP server "${name}" requires authorization: its legacy HTTP+SSE stream answered with an auth challenge and the authorization flow did not finish within the connect budget`,
              );
            }
            if (At || (error_2 instanceof SseError_2 && !Zt) || (Zt && !Z)) {
              logMCPDebug(
                name,
                `legacy HTTP+SSE not confirmed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); surfacing the POST failure`,
              );
              handshakeTrace = fe;
              throw error;
            }
            throw error_2;
          }
          Ne = true;
          logMCPDebug(name, "connected over legacy HTTP+SSE");
        }
        me();
        if (
          negotiation?.mode === "auto" &&
          q === undefined &&
          transport_2 instanceof BoundedStdioClientTransport &&
          transport_2._anthropicProbeTimedOut === true &&
          client.getProtocolEra() === "modern"
        ) {
          q = lit("rediscovered_after_probe_timeout");
          logMCPDebug(
            name,
            `stdio server rejected initialize after the version negotiation probe timed out, then answered a second server/discover on the same process; connected on ${client.getNegotiatedProtocolVersion()} without restarting it`,
          );
        }
        if (be) {
          logMCPError(name, `Server stderr: ${be}`);
          be = "";
        }
        if (it && ye) {
          ye.off("data", it);
          ye.resume();
        }
        let x = Date.now() - now;
        logMCPDebug(name, `Successfully connected (transport: ${serverRef.type || "stdio"}) in ${x}ms`);
        if (Ot) {
          if (client.getProtocolEra?.() === "modern")
            logMCPDebug(
              name,
              "subscriptions/listen suppressed by the listen denylist; list_changed delivery is off for this connection",
            );
        } else ensureListenSubscription(client, name, serverRef, we, discoverSource);
        if (
          (serverRef.type === "stdio" || !serverRef.type) &&
          transport_2 instanceof BoundedStdioClientTransport &&
          transport_2.pid
        ) {
          registerChildMemory("mcp_stdio", transport_2.pid);
          if (ge) parkPendingPid("mcp", transport_2.pid, () => isMcpServerBackingToolHook(name));
          if (Ie || ge) releaseMcpToolCgroup(name, transport_2.pid);
        }
      } catch (error) {
        me();
        let U = error;
        if (U instanceof SdkError && U.code === SdkErrorCode.EraNegotiationFailed) {
          let ve = U.data;
          let cause = typeof ve === "object" && ve !== null && "cause" in ve ? ve.cause : U.cause;
          if (cause != null) U = cause;
        }
        let Z = Date.now() - now;
        let negotiation_2 = {
          negotiationMode: fromEnumOpt(negotiation?.mode),
          probeFellBack: q,
          listenSuppressed: Ot,
          negotiationDenylisted: vt,
          discoverSource: Ee,
          listingPriorBurned: Qe,
          ...toolsListAheadFields(ft),
        };
        if (transport_2 instanceof BoundedStdioClientTransport && transport_2.overflowError) {
          logMCPError(name, transport_2.overflowError.message);
          if (be) logMCPError(name, `Server stderr: ${be}`);
          throw transport_2.overflowError;
        }
        if (serverRef.type === "sse" && U instanceof Error) {
          logMCPDebug(
            name,
            `SSE Connection failed after ${Z}ms: ${jsonStringify({
              url: redactUrlSecrets(serverRef.url),
              error: describeConnectError(U, serverRef),
              errorType: U.constructor.name,
              stack: rethrowRedactedConnectError(U, serverRef) === U ? U.stack : undefined,
            })}`,
          );
          logMCPError(name, rethrowRedactedConnectError(U, serverRef));
          let ve = await handleRemoteConnectAuthError({
            name,
            serverRef,
            transportType: "sse",
            error: U,
            statusCode: U instanceof SdkHttpError ? U.status : U.code,
            sawAuthChallenge: authProvider?.sawAuthChallenge === true,
            hasUserAuthHeader: De,
            helperMintsAuthHeader: re,
            cliOwnedBearer: Ve,
            useFirstPartyAuth: ue,
            firstPartyBearer: ot.last,
            authProvider,
            negotiation: negotiation_2,
            roundEpoch,
            storageV5,
          });
          if (ve) return ve;
        } else if (serverRef.type === "http" && U instanceof Error) {
          let ve = U;
          logMCPDebug(
            name,
            `HTTP Connection failed after ${Z}ms: ${describeConnectError(U, serverRef)} (code: ${ve.code || "none"}, errno: ${ve.errno || "none"})`,
          );
          logMCPError(name, rethrowRedactedConnectError(U, serverRef));
          let Ne = await handleRemoteConnectAuthError({
            name,
            serverRef,
            transportType: "http",
            error: U,
            statusCode: U instanceof SdkHttpError ? U.status : U.code,
            sawAuthChallenge: authProvider?.sawAuthChallenge === true,
            hasUserAuthHeader: De,
            helperMintsAuthHeader: re,
            cliOwnedBearer: Ve,
            useFirstPartyAuth: ue,
            firstPartyBearer: ot.last,
            authProvider,
            negotiation: negotiation_2,
            roundEpoch,
            storageV5,
          });
          if (Ne) return Ne;
        } else if (serverRef.type === "claudeai-proxy" && U instanceof Error) {
          logMCPDebug(
            name,
            `claude.ai proxy connection failed after ${Z}ms: ${describeConnectError(U, serverRef)}`,
          );
          if (!isClaudeAiBearerRejectedError(U)) logMCPError(name, rethrowRedactedConnectError(U, serverRef));
          let ve = U instanceof SdkHttpError ? U.status : U.code;
          if (isClaudeAiBearerRejectedError(U)) {
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
              ...mcpBaseUrlAnalytics_2(serverRef, name),
              ...buildPluginSourceFields(serverRef),
            });
            logFeatureSad("mcp_connect", "mcp_connect_claudeai_bearer_rejected");
            let Ne = serverCacheKey(name, serverRef);
            let Je = {
              name,
              type: "failed",
              config: serverRef,
              error: U.message,
              errorCode: "CLAUDEAI_BEARER_REJECTED",
            };
            let le = getConnectionCache().connections.get(Ne);
            if (le)
              le.then(
                (dt) => {
                  if (dt === Je && getConnectionCache().connections.get(Ne) === le)
                    getConnectionCache().connections.delete(Ne);
                },
                () => {},
              );
            return Je;
          }
          if (ve === 401 || ve === 403)
            return handleRemoteAuthFailure(
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
            connectionDurationMs: Z,
          });
        if (inProcessServer) inProcessServer.close().catch(() => {});
        transport_2.close().catch(() => {});
        if (be && !isCleanupStarted()) logMCPError(name, `Server stderr: ${be}`);
        throw U;
      }
      let serverCapabilities = client.getServerCapabilities();
      let serverVersion = client.getServerVersion();
      let Ft = officialPluginPromptOverrides(serverRef);
      let Me = serverInstructionsOverride(Ft, name) ?? client.getInstructions();
      let Ye = toolTimeoutForServer(serverRef);
      let instructions = truncateServerInstructions(Me, name, Ye);
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
      client.setRequestHandler("elicitation/create", async (x) => {
        logMCPDebug(name, `Elicitation request received during initialization: ${jsonStringify(x)}`);
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
      let at = false;
      let onerror = client.onerror;
      let onclose = client.onclose;
      let Lt = 3;
      let We = {
        consecutiveErrors: 0,
        activeCallWatchdogs: new Set(),
        callsInProgress: 0,
        pendingElicitations: 0,
        lastElicitationClosedAt: 0,
        dialledUnder: getRequestTimingStore(),
      };
      let Kt = false;
      let zt = (x) => {
        if (Kt) return;
        Kt = true;
        We.closeReason = x;
        logMCPDebug(name, `Closing transport (${x})`);
        client.close().catch((error) => {
          logMCPDebug(name, `Error during close: ${describeConnectError(error, serverRef)}`);
        });
      };
      let kind = discoverPrior?.kind;
      let sn = kind !== undefined && usedRememberedLegacy;
      let an = kind !== undefined;
      let un = sn;
      let en = new Map();
      let ut = false;
      let qt;
      let Qt = () => {
        an = false;
        en.clear();
        if (qt !== undefined) {
          clearTimeout(qt);
          qt = undefined;
        }
      };
      let lt = (x) => (kind === "modern" || x === "rpc_era" ? x : undefined);
      let cn = () => {
        if ((We.callsInProgress ?? 0) > 0) We.onCallsIdle = cn;
        else if (client.transport !== undefined) zt("discover prior rejected");
      };
      let vn = (x, U, Z, fe = false) => {
        Qt();
        un = false;
        burnDiscoverPrior(serverRef, kind, storageV5);
        logMCPDebug(
          name,
          `${U} on a connection built from ${wt()} was rejected (${Z}); discarding it for this server \u2014 this connection closes once no tool call or background task is using it, and the next dial probes server/discover on the wire`,
        );
        logEvent("tengu_mcp_listing_prior_rejected", {
          phase: fe ? lit("post_window") : lit("post_connect"),
          priorKind: fromEnumOpt(kind),
          priorSource: Ee,
          reason: fromEnum(x),
          transportType: fromEnum(serverRef.type ?? "stdio"),
          ...mcpBaseUrlAnalytics_2(serverRef, name),
        });
        setTimeout(cn, 0);
      };
      let kn = () => {
        if (qt !== undefined) clearTimeout(qt);
        qt = setTimeout(() => {
          Qt();
          if (sn && ut && client.transport !== undefined) {
            logMCPDebug(
              name,
              `tools/list on a connection built from ${wt()} got no result in time; forgetting the verdict, so the next dial probes server/discover`,
            );
            forgetDiscoverVerdict(serverRef, storageV5);
          }
        }, getConnectionTimeoutMs());
        qt.unref();
      };
      let vr = (x, U, Z) => {
        if (isSessionHandshakeMethod(x) && !U) {
          Qt();
          if (sn && Z !== undefined) {
            logMCPDebug(
              name,
              `${x} on a connection built from ${wt()} was refused (${Z}); forgetting the verdict, so the next dial probes server/discover`,
            );
            forgetDiscoverVerdict(serverRef, storageV5);
          }
        }
      };
      if (an && client.transport) {
        kn();
        let transport = client.transport;
        let U = transport.send.bind(transport);
        transport.send = async (Z, fe) => {
          let ve = an && isJSONRPCRequest(Z) ? Z : undefined;
          if (ve !== undefined) {
            en.set(ve.id, ve.method);
            if (isSessionHandshakeMethod(ve.method)) {
              ut = true;
              kn();
            }
          }
          try {
            await U(Z, fe);
          } catch (error) {
            if (ve !== undefined && an) {
              let method = ve.method;
              en.delete(ve.id);
              let le =
                sn && isSessionHandshakeMethod(method) && isUnsupportedVersionHttp400(error)
                  ? "rpc_era"
                  : classifyMcpConnectError(error, method);
              let dt = lt(le);
              if (dt !== undefined)
                vn(dt, method, truncateToLength(describeConnectError(error, serverRef), 200));
              else vr(method, isRetryableListError(error), le);
            }
            throw error;
          }
        };
      }
      client.onerror = (x) => {
        let U = serverRef.type || "stdio";
        if (U === "stdio" && x instanceof SyntaxError) {
          logMCPError(name, `Ignoring non-JSON line on stdout: ${x.message}`);
          return;
        }
        if (x instanceof FirstPartyDesignNeedsConsentError) return;
        if (U === "stdio" && x instanceof StdoutOverflowError) {
          logMCPError(name, x.message);
          at = true;
          zt("stdout overflow");
          if (onerror) onerror(x);
          return;
        }
        if ((U === "http" || U === "claudeai-proxy") && x instanceof HttpBodyOverflowError) {
          logMCPError(
            name,
            `sent a response larger than ${Math.round(MCP_BODY_LIMIT / 1024 / 1024)}MB. Claude Code stopped reading it and failed the request it answered; the connection stays open.`,
          );
          if (onerror) onerror(x);
          return;
        }
        if (
          (U === "sse" || U === "sse-ide" || U === "http" || U === "claudeai-proxy") &&
          x.message.includes(STOPPED_READING_NOTE)
        ) {
          logMCPError(name, x.message);
          at = true;
          zt("http body overflow");
          if (onerror) onerror(x);
          return;
        }
        if ((U === "sse" || U === "http" || U === "claudeai-proxy") && x instanceof SyntaxError) {
          at = true;
          Bt();
          zt(
            authProvider?.authChallengeOpen === true && We.activeCallWatchdogs.size <= 1
              ? "malformed message after an auth challenge"
              : "malformed JSON-RPC message (response truncated)",
          );
          if (onerror) onerror(x);
          return;
        }
        let Z = Date.now() - now_2;
        at = true;
        logMCPDebug(name, `${U.toUpperCase()} connection dropped after ${Math.floor(Z / 1000)}s uptime`);
        if (x.message) {
          let fe = CONNECTION_ERROR_HINTS_2.find(([ve]) => x.message.includes(ve))?.[1];
          logMCPDebug(name, fe ?? `Connection error: ${describeConnectError(x, serverRef)}`);
        }
        if (
          (U === "http" || U === "claudeai-proxy") &&
          client.transport?.sessionId !== undefined &&
          isMcpSessionExpiredError(x)
        ) {
          logMCPDebug(
            name,
            "MCP session expired (server no longer recognizes session ID), triggering reconnection",
          );
          zt("session expired");
          if (onerror) onerror(x);
          return;
        }
        if (
          (U === "http" || U === "claudeai-proxy") &&
          client.transport?.sessionId !== undefined &&
          x instanceof SdkHttpError &&
          x.status === 404 &&
          isSseOpenFailure(x)
        )
          logFeatureSad("mcp_session_recovery", "get_stream_404_not_reinit");
        if (U === "sse" || U === "http" || U === "claudeai-proxy") {
          if (x.message.includes("Maximum reconnection attempts")) {
            logMCPDebug(
              name,
              "SSE GET-stream reconnection exhausted; leaving transport up (POST still works)",
            );
            We.consecutiveErrors = 0;
            Bt();
            if (onerror) onerror(x);
            return;
          }
          if (isTransientMcpError(x)) {
            We.consecutiveErrors++;
            Bt();
            logMCPDebug(name, `Terminal connection error ${We.consecutiveErrors}/${Lt}`);
            if (We.consecutiveErrors >= Lt) {
              We.consecutiveErrors = 0;
              zt("max consecutive terminal errors");
            }
          } else We.consecutiveErrors = 0;
        }
        if (onerror) onerror(x);
      };
      let Rr = serverRef.type === "http" && isCcrMcpPath(serverRef.url);
      if (Rr && client.transport) {
        let transport = client.transport;
        let U = transport.send.bind(transport);
        transport.send = async (Z, fe) => {
          let _meta = isJSONRPCRequest(Z) && Z.method === "tools/call" ? Z.params?._meta : undefined;
          let Ne = _meta?.["claudecode/toolUseId"];
          let Je = _meta?.[CLAUDECODE_CALLMARK];
          let le =
            isJSONRPCRequest(Z) && _meta !== undefined && Je !== undefined
              ? {
                  ...Z,
                  params: {
                    ...Z.params,
                    _meta: omitKeys(_meta, CLAUDECODE_CALLMARK),
                  },
                }
              : Z;
          let dt =
            Ne !== undefined
              ? [...We.activeCallWatchdogs].find((activeCallWatchdog) => activeCallWatchdog.toolUseId === Ne)
              : Je !== undefined
                ? [...We.activeCallWatchdogs].find((activeCallWatchdog) => activeCallWatchdog.mark === Je)
                : undefined;
          if (!isJSONRPCRequest(Z) || dt === undefined) return U(le, fe);
          let { id } = Z;
          dt.requestSent?.(id);
          try {
            await U(le, {
              ...fe,
              onRequestStreamEnd: () => {
                fe?.onRequestStreamEnd?.();
                dt.answerStreamEnded?.(id);
              },
            });
          } catch (error) {
            if (
              error instanceof Error &&
              (isMcpSessionExpiredError(error) ||
                NOTHING_SENT_ERROR_CODES.has(getErrnoCode(error) ?? "") ||
                SSL_CERT_ERROR_CODES.has(getErrnoCode(error) ?? ""))
            )
              dt.requestNotRun?.(id);
            throw error;
          }
          dt.requestTaken?.(id);
        };
      }
      if ((serverRef.type === "http" || serverRef.type === "claudeai-proxy") && client.transport)
        We.toolCallSends = trackToolCallSends(
          client.transport,
          isMcpSessionExpiredError,
          We.activeCallWatchdogs,
        );
      if (client.transport) {
        let onmessage = client.transport.onmessage;
        client.transport.onmessage = (U, Z) => {
          if (We.consecutiveErrors !== 0) We.consecutiveErrors = 0;
          if (Rr && (isJSONRPCResultResponse(U) || isJSONRPCErrorResponse(U)) && U.id !== undefined)
            for (let activeCallWatchdog of We.activeCallWatchdogs) activeCallWatchdog.requestAnswered?.(U.id);
          if (an && (isJSONRPCResultResponse(U) || isJSONRPCErrorResponse(U)) && U.id !== undefined) {
            let fe = en.get(U.id);
            if (fe !== undefined) {
              en.delete(U.id);
              if (isJSONRPCResultResponse(U)) {
                if (isSessionHandshakeMethod(fe)) Qt();
              } else {
                let ve = classifyMcpRpcErrorCode(U.error.code, fe);
                let Ne = lt(ve);
                if (Ne !== undefined) {
                  onmessage?.(U, Z);
                  vn(Ne, fe, `JSON-RPC ${U.error.code}`);
                  return;
                }
                vr(fe, isRetryableListError(new ProtocolError(U.error.code, U.error.message)), ve);
              }
            }
          } else if (
            un &&
            client.transport !== undefined &&
            isJSONRPCErrorResponse(U) &&
            U.id !== undefined &&
            classifyMcpRpcErrorCode(U.error.code, "") === "rpc_era"
          ) {
            onmessage?.(U, Z);
            vn("rpc_era", "a later request", `JSON-RPC ${U.error.code}`, true);
            return;
          }
          onmessage?.(U, Z);
        };
      }
      client.onclose = () => {
        let x = Date.now() - now_2;
        let U = serverRef.type ?? "unknown";
        logMCPDebug(
          name,
          `${U.toUpperCase()} connection closed after ${Math.floor(x / 1000)}s (${at ? "with errors" : "cleanly"})`,
        );
        logMcpConnectionOtelEvent(name, serverRef, {
          status: "disconnected",
          durationMs: x,
        });
        let Z = serverCacheKey(name, serverRef);
        getConnectionCache().liveClients.delete(client);
        getConnectionCache().toolLists.delete(Z);
        getConnectionCache().resourceLists.delete(Z);
        getConnectionCache().resourceTemplateLists.delete(Z);
        getConnectionCache().commandLists.delete(Z);
        getConnectionCache().connections.delete(Z);
        logMCPDebug(name, "Cleared connection cache for reconnection");
        if (onclose) onclose();
      };
      let kr = async () => {
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
                let Z = false;
                let fe = () => {
                  if (Z) return;
                  Z = true;
                  clearInterval(interval);
                  clearTimeout(timer);
                  resolve();
                };
                let ve = (pid) => {
                  try {
                    process.kill(pid, 0);
                    return true;
                  } catch {
                    return false;
                  }
                };
                let interval = setInterval(
                  (le, dt, Et, It) => {
                    if (!le(dt)) {
                      logMCPDebug(Et, "MCP server process exited cleanly");
                      It();
                    }
                  },
                  50,
                  ve,
                  pid,
                  name,
                  fe,
                );
                let timer = setTimeout(
                  (le, dt) => {
                    logMCPDebug(le, "Cleanup timeout reached, stopping process monitoring");
                    dt();
                  },
                  600,
                  name,
                  fe,
                );
                try {
                  await sleep(100);
                  if (!Z) {
                    if (!ve(pid)) {
                      fe();
                      return;
                    }
                    logMCPDebug(name, "SIGINT failed, sending SIGTERM to MCP server process");
                    try {
                      process.kill(pid, "SIGTERM");
                    } catch (error) {
                      logMCPDebug(name, `Error sending SIGTERM: ${error}`);
                      fe();
                      return;
                    }
                    await sleep(400);
                    if (!Z)
                      if (!ve(pid)) fe();
                      else {
                        logMCPDebug(name, "SIGTERM failed, sending SIGKILL to MCP server process");
                        try {
                          process.kill(pid, "SIGKILL");
                        } catch (error) {
                          logMCPDebug(name, `Error sending SIGKILL: ${error}`);
                        }
                      }
                  }
                  fe();
                } catch {
                  fe();
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
      let Wi = registerCleanup(kr);
      if (transport_2 instanceof BoundedStdioClientTransport) transport_2.handOffExitCleanup();
      let cleanup = async () => {
        getConnectionCache().liveClients.delete(client);
        Wi?.();
        await kr();
      };
      getConnectionCache().liveClients.add(client);
      if (getAnnouncedDirectories() !== announcedDirectories) client.sendRootsListChanged().catch(() => {});
      let discoverVerdictKey = getDiscoverVerdictKey(serverRef);
      if (discoverSource === "wire" && client.getProtocolEra() === "modern")
        forgetDiscoverVerdict(serverRef, storageV5);
      let Ir =
        transport_2 instanceof BoundedStdioClientTransport && transport_2._anthropicProbeTimedOut === true;
      let answeredProbeLate =
        transport_2 instanceof BoundedStdioClientTransport && transport_2.answeredProbeLate;
      if (
        discoverVerdictKey !== undefined &&
        !(serverRef.type === "claudeai-proxy" && serverRef.stateless === true) &&
        discoverSource === "wire" &&
        (discoverMethodNotFound || Ir) &&
        q === undefined &&
        client.getProtocolEra() === "legacy" &&
        !getCliOwnedState().burnedListingDiscoverPriors.has(discoverVerdictKey)
      ) {
        if (answeredProbeLate) {
          logMCPDebug(
            name,
            "stdio server answered the server/discover probe after its bound, so it was only slow to start and speaks the new protocol; not remembering it as a legacy peer",
          );
          forgetDiscoverVerdict(serverRef, storageV5);
        } else {
          rememberLegacyPeer(serverRef, storageV5);
          if (Ir && transport_2 instanceof BoundedStdioClientTransport)
            transport_2.onAnsweredProbeLate = () => {
              logMCPDebug(
                name,
                "stdio server answered the server/discover probe after it had connected legacy; it speaks the new protocol, so forgetting it as a legacy peer",
              );
              forgetDiscoverVerdict(serverRef, storageV5);
            };
        }
      }
      let Mo = Date.now() - now;
      logMcpConnectionOtelEvent(name, serverRef, {
        status: "connected",
        durationMs: Mo,
      });
      let Lr = Me?.length ?? 0;
      markConnectEnded(handshakeTrace);
      logEvent("tengu_mcp_server_connection_succeeded", {
        connectionDurationMs: Mo,
        processUptimeAtConnectStartMs,
        ...handshakeTraceTelemetry(handshakeTrace),
        instructionsLength: Lr,
        instructionsTruncated: Lr > Ye,
        transportType: fromEnum(serverRef.type ?? "stdio"),
        negotiatedLegacySse: serverRef.type === "http" && transport_2 instanceof SSEClientTransport_2,
        sdkGeneration: fromEnum(mcpSdkGeneration()),
        negotiationMode: fromEnumOpt(negotiation?.mode),
        scope: fromEnum(serverRef.scope),
        protocolEra: fromEnumOpt(client.getProtocolEra()),
        negotiatedProtocolVersion: iu(client.getNegotiatedProtocolVersion()),
        probeFellBack: q,
        bareElicitationRetry: yt,
        discoverSource: Ee,
        listingPriorBurned: Qe,
        listenSuppressed: Ot,
        negotiationDenylisted: vt,
        ...toolsListAheadFields(ft),
        isPlugin: serverRef.pluginSource !== undefined,
        ...buildPluginSourceFields(serverRef),
        totalServers: serverStats?.totalServers,
        stdioCount: serverStats?.stdioCount,
        sseCount: serverStats?.sseCount,
        httpCount: serverStats?.httpCount,
        sseIdeCount: serverStats?.sseIdeCount,
        wsIdeCount: serverStats?.wsIdeCount,
        ...mcpBaseUrlAnalytics_2(serverRef, name),
      });
      if (ft !== undefined && !getCliOwnedState().toolsListAhead.has(client))
        armToolsListAhead(client, ft.flagSource, vt, ft.listed);
      if (handshakeTrace !== undefined) {
        let x = handshakeTrace;
        let protocolEra = client.getProtocolEra();
        let Z = getCliOwnedState().toolsListAhead.get(client);
        armFirstToolsListReport(client, (fe) => {
          logEvent("tengu_mcp_first_tools_list", {
            ...fe,
            messageStreamGetOutcome: fromEnum(x.messageStreamGetOutcome),
            processUptimeAtConnectStartMs,
            keepAliveDisabled: x.keepAliveDisabled,
            transportType: fromEnum(serverRef.type ?? "stdio"),
            sdkGeneration: fromEnum(mcpSdkGeneration()),
            protocolEra: fromEnumOpt(protocolEra),
            negotiationDenylisted: vt,
            ...toolsListAheadFields(Z),
            mcpServerKeyHash: toolNameForTelemetry(name),
          });
        });
        if (Z !== undefined)
          scheduleMessageStreamOutcomeLog(client, name, x, {
            ...toolsListAheadFields(Z),
            negotiationDenylisted: vt,
          });
      }
      logFeatureOk("mcp_connect");
      logForDiagnosticsNoPII("info", "mcp_connect_complete", {
        transport,
        duration_ms: Mo,
      });
      if (authProvider) getCliOwnedState().clientAuthProviders.set(client, authProvider);
      getCliOwnedState().clientFirstPartyBearers.set(client, ot);
      let Dr = {
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
        transportErrorState: We,
      };
      clearDiscoveryPathMemo(name);
      try {
        getConnectedClientWiring()?.(Dr);
      } catch (error) {
        logMCPError(
          name,
          `connected-client wiring failed (placeholder retained, adoption will retry): ${errorMessage(error)}`,
        );
      }
      return Dr;
    } catch (error) {
      let Ve = Date.now() - now;
      if (isCleanupStarted()) {
        logMCPDebug(name, `Connection abandoned after ${Ve}ms (Claude Code is shutting down)`);
        if (inProcessServer) inProcessServer.close().catch(() => {});
        return {
          name,
          type: "failed",
          config: serverRef,
          error: "Claude Code is shutting down",
          errorCode: "SHUTTING_DOWN",
        };
      }
      let De = describeConnectError(error, serverRef);
      let cause = error instanceof Error ? error.cause : undefined;
      let re =
        (error instanceof SdkHttpError ? error.status : undefined) ??
        (error && typeof error === "object" && "code" in error ? error.code : undefined) ??
        (cause && typeof cause === "object" && "code" in cause ? cause.code : undefined);
      let ue =
        error instanceof IssuerEchoCrossOriginError
          ? "ISSUER_ECHO_DENIED"
          : re !== undefined
            ? String(re)
            : undefined;
      if (
        error instanceof SdkError &&
        error.code === SdkErrorCode.RequestTimeout &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_timeout_retry", true)
      )
        ue = "CONNECT_TIMEOUT";
      if (
        serverRef.type === "http" &&
        ue === "404" &&
        transport_2?.sessionId === undefined &&
        !isCcrHostedConfig(serverRef)
      ) {
        ue = "ENDPOINT_NOT_FOUND";
        De = `MCP endpoint not found at ${
          describeMcpServerOrigin(name, serverRef, {
            detail: "origin",
          }) ?? "(unparseable url)"
        }. Check the URL in your MCP config.`;
      }
      let ot = ue === "CONNECT_TIMEOUT" && M !== undefined ? suspendedConnectMessage(name, M) : undefined;
      if (ot !== undefined) {
        ue = CONNECT_SUSPENDED;
        De = ot;
      }
      De = redactMcpErrorDetail(name, serverRef, De);
      if (!yt && isJavaSdkElicitationRejection(error, serverRef, transport_2)) De = JAVA_SDK_ELICITATION_HINT;
      logMcpConnectionOtelEvent(name, serverRef, {
        status: "failed",
        durationMs: Ve,
        errorCode: ue,
        error: De,
      });
      let it =
        ue === "ENOENT" && (serverRef.type === "stdio" || serverRef.type === undefined)
          ? "mcp_connect_spawn_enoent"
          : ue === "ENDPOINT_NOT_FOUND"
            ? "mcp_connect_endpoint_not_found"
            : undefined;
      if (it !== undefined) logFeatureBad("mcp_connect", it);
      else {
        let ct =
          ue === "ECONNREFUSED"
            ? "mcp_connect_refused"
            : ue === CONNECT_SUSPENDED
              ? "mcp_connect_suspended"
              : De.includes("timed out")
                ? "mcp_connect_timeout"
                : "mcp_connect_failed";
        logFeatureSad("mcp_connect", `${ct}_${serverRef.type ?? "stdio"}`);
      }
      markConnectEnded(handshakeTrace);
      logEvent("tengu_mcp_server_connection_failed", {
        connectionDurationMs: Ve,
        processUptimeAtConnectStartMs,
        ...handshakeTraceTelemetry(handshakeTrace),
        negotiationMode: fromEnumOpt(negotiation?.mode),
        listenSuppressed: Ot,
        negotiationDenylisted: vt,
        probeFellBack: q,
        bareElicitationRetry: yt,
        discoverSource: Ee,
        listingPriorBurned: Qe,
        ...toolsListAheadFields(ft),
        errorCode: sanitizeConnectErrorCodeForTelemetry(ue),
        errorClassName: sanitizedErrorClassNameForTelemetry(error),
        errorMessageHash: shortHash(scrubErrorText(De)),
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
        ...mcpBaseUrlAnalytics_2(serverRef, name),
      });
      logMCPDebug(
        name,
        `Connection failed after ${formatConnectElapsed(clockSnapshot)}${ue !== undefined ? ` (${ue})` : ""}: ${De}`,
      );
      logMCPError(name, `Connection failed${ue !== undefined ? ` (${ue})` : ""}: ${De}`);
      logForDiagnosticsNoPII("error", "mcp_connect_failed", {
        transport,
        duration_ms: Ve,
        ...(ue === "CONNECT_TIMEOUT" && {
          reason: "timeout",
        }),
        ...(ue === CONNECT_SUSPENDED && {
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
        (At || (error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout)) &&
        ue !== CONNECT_SUSPENDED &&
        !getCliOwnedState().burnedListingDiscoverPriors.has(discoverVerdictKey)
      )
        if (transport_2.answeredProbeLate)
          logMCPDebug(
            name,
            "stdio server answered the server/discover probe after its bound but not initialize; it speaks the new protocol, so not remembering it as a legacy peer",
          );
        else rememberLegacyPeer(serverRef, storageV5);
      if (ue !== CONNECT_SUSPENDED) recordPluginStdioServerFailure(name, serverRef, storageV5);
      let be =
        ue === "ERR_PROXY_TUNNEL"
          ? [error, cause]
              .map((ct) => (ct && typeof ct === "object" && "status" in ct ? ct.status : undefined))
              .find((ct) => typeof ct === "number")
          : undefined;
      return {
        name,
        type: "failed",
        config: serverRef,
        error: De,
        errorCode: ue,
        ...(be !== undefined && {
          proxyConnectStatus: be,
        }),
        ...(ue === undefined &&
          authProvider?.sawAuthChallenge === true &&
          (await registrationStatusFields(name, serverRef, now))),
      };
    }
  },
  serverCacheKey,
  () => getConnectionCache().connections,
  (e, n, [r, s, , h]) =>
    connectWithSignedOutFallback(
      () => redialAfterSuspend(e, n, () => recordPluginStdioServerFailure(r, s, h)),
      n,
      r,
      s,
    ),
);
//@ chunk-8t8n4kdh.js:119566-119630 sole-consumer
/**
 * 按 http 传输决定协议时代（modern/legacy）。
 */
function eraResolver() {
  return resolveVersionNegotiation("http").mode === "auto" ? "modern" : "legacy";
}
//@ chunk-8t8n4kdh.js:119630-119683 sole-consumer
/**
 * 初始化客户端侧的解析器（发现缓存开关、身份与账号来源）。
 */
function primeClientResolvers() {
  primeDiscoveryCacheFlag();
  setEraResolver(eraResolver);
  if (hasAccountResolver()) return;
  setAccountResolver(oauthAccountIdentity);
}
//@ chunk-8t8n4kdh.js:119683-119720 sole-consumer
/**
 * 注册 ensureConnectedClient 实现（一次）。
 */
function primeEnsureConnected() {
  if (getEnsureConnectedClient()) return;
  setEnsureConnectedClient(ensureConnectedClient);
}
//@ chunk-8t8n4kdh.js:119720-119816 sole-consumer
/**
 * 发出“缓存行被采纳”信号。
 */
function emitCachedAdopt(e, n) {
  try {
    CACHED_ADOPT_SIGNAL.emit(e, n);
  } catch (error) {
    logMCPDebug(e, `cached-row adopt subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-8t8n4kdh.js:119816-120052 sole-consumer
function recordCachedDialFailure(e, n) {
  if (n) logFeatureSad("mcp_discovery_cache", "lazy_dial_failed");
  getConnectionCache().settledCachedDialFailures.set(serverCacheKey(e.name, e.config), {
    failure: e,
    ownStrike: n,
  });
  try {
    CACHED_DIAL_FAILED_SIGNAL.emit(e, n);
  } catch (error) {
    logMCPDebug(e.name, `cached-row dial-failed subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-8t8n4kdh.js:120052-120148 sole-consumer
/**
 * 取出并删除某服务器已结算的缓存拨号失败记录。
 */
function takeSettledCachedDialFailure(e, n) {
  let settledCachedDialFailures = getConnectionCache().settledCachedDialFailures;
  let s = serverCacheKey(e, n);
  let h = settledCachedDialFailures.get(s);
  settledCachedDialFailures.delete(s);
  return h;
}
//@ chunk-8t8n4kdh.js:120148-120242 sole-consumer
/**
 * 缓存失败是否已被清理（测试用判断）。
 */
async function hasClearedCachedFailure(e, n) {
  let r = connectToServer.cache?.get?.(serverCacheKey(e, n));
  return r !== undefined && (await clearMcpAuthCache(r)) === undefined;
}
//@ chunk-8t8n4kdh.js:120242-120496 sole-consumer
function refuseCachedRow(name, config, r) {
  let s = serverCacheKey(name, config);
  if (getConnectionCache().refusedCachedRows.has(s)) return;
  getConnectionCache().refusedCachedRows.add(s);
  if (r === "policy") clearDiscoveryForServer(name, config).catch(() => {});
  recordCachedDialFailure(
    {
      name,
      type: "failed",
      config,
      ...(r === "policy"
        ? mcpGateError("managed-policy", name, config)
        : {
            error: DISABLED_IN_MCP_REASON,
            errorCode: "DISABLED",
          }),
    },
    false,
  );
}
//@ chunk-8t8n4kdh.js:120496-120663 sole-consumer
/**
 * 判断服务器是否有已连接且没有正在后台刷新的连接。
 */
async function hasLiveConnection(e, n) {
  let r = serverCacheKey(e, n);
  let s = getConnectionCache().connections.get(r);
  if (!s) return false;
  if ((await clearMcpAuthCache(s))?.type !== "connected") return false;
  return !getCliOwnedState().swrRefreshDialsInFlight.has(s);
}
//@ chunk-8t8n4kdh.js:120663-120858 affinity
/**
 * 服务时清除失败的连接记忆（已连接或未结算的保留）。
 */
async function evictStaleFailedConnectMemoForServe(e, config) {
  let r = serverCacheKey(e, config);
  let s = getConnectionCache().connections.get(r);
  if (!s) return;
  let h = await clearMcpAuthCache(s);
  if (h === undefined || h.type === "connected") return;
  if (getConnectionCache().connections.get(r) === s) getConnectionCache().connections.delete(r);
}
//@ chunk-8t8n4kdh.js:120858-120914 file-local
async function clearMcpAuthCache(e) {
  return withDeadline(
    e.catch(() => {
      return;
    }),
    0,
  );
}
//@ chunk-8t8n4kdh.js:120914-120999 layout
/**
 * 清理某服务器缓存中的失败连接。
 */
async function clearCachedFailureFor(name, config) {
  let r = connectToServer.cache?.get?.(serverCacheKey(name, config));
  return r === undefined ? undefined : clearMcpAuthCache(r);
}
//@ chunk-8t8n4kdh.js:120999-121160 layout
function clearConnectionCaches(e) {
  getConnectionCache().connections.delete(e);
  getConnectionCache().toolLists.delete(e);
  getConnectionCache().resourceLists.delete(e);
  getConnectionCache().resourceTemplateLists.delete(e);
  getConnectionCache().commandLists.delete(e);
}
//@ chunk-8t8n4kdh.js:121160-121539 layout
/**
 * 清除服务器的连接缓存：有活动调用时保留连接，否则关闭已连接的客户端并删除记忆。
 */
async function clearServerCache(e, config, r) {
  primeClientResolvers();
  let s = serverCacheKey(e, config);
  let h = getConnectionCache().connections.get(s);
  if (h) {
    let y = await clearMcpAuthCache(h);
    if (y === undefined) disposeServerConnectionDetached(e, config, h);
    else if (y.type === "connected") {
      if (
        r !== undefined &&
        getConnectionCache().connections.get(s) === h &&
        clientOf(y.client).transport !== undefined &&
        (y.transportErrorState?.activeCallWatchdogs.size ?? 0) > 0
      ) {
        r.connection = y;
        return;
      }
      await detachAndCloseConnection(y);
    }
    let S = getConnectionCache().connections.get(s);
    if (S !== undefined && S !== h) return;
  }
  clearConnectionCaches(s);
}
//@ chunk-8t8n4kdh.js:121539-121746 layout
/**
 * 解除连接的 onclose 并关闭连接，必要时清理对应的连接记忆。
 */
function detachAndCloseConnection(e) {
  clientOf(e.client).onclose = undefined;
  if (isDiscoveryCacheOn()) {
    let n = serverCacheKey(e.name, e.config);
    let r = connectToServer.cache?.get?.(n);
    if (r !== undefined)
      clearMcpAuthCache(r).then((s) => {
        if (isSameConnectedClient(s, e) && connectToServer.cache?.get?.(n) === r) clearConnectionCaches(n);
      });
  }
  return e.cleanup().catch(() => {});
}
//@ chunk-8t8n4kdh.js:121746-121941 layout
/**
 * 在后台丢弃服务器连接：标记为被取代，删除记忆，结算后关闭已连接的客户端。
 */
function disposeServerConnectionDetached(e, n, r) {
  primeClientResolvers();
  let s = serverCacheKey(e, n);
  let h = getConnectionCache().connections.get(s);
  if (r !== undefined && h !== r) return;
  if (h) getCliOwnedState().supersededDials.add(h);
  clearConnectionCaches(s);
  if (h)
    h.then(
      (y) => {
        if (y.type !== "connected") return;
        detachAndCloseConnection(y);
      },
      () => {},
    );
}
//@ chunk-8t8n4kdh.js:121941-121984 layout
/**
 * 清理服务器缓存并删除发现缓存。
 */
async function clearDiscoveryForServer(e, n) {
  primeClientResolvers();
  await deleteDiscoveryCache(e, n);
}
//@ chunk-8t8n4kdh.js:121984-122252 layout
/**
 * 丢弃已结束且未连接的连接记忆，返回是否删除。
 */
async function discardMemoizedConnectResult(e, n) {
  let r = serverCacheKey(e, n);
  if (!isDiscoveryCacheOn()) {
    getConnectionCache().connections.delete(r);
    return true;
  }
  let s = getConnectionCache().connections.get(r);
  if (s !== undefined) {
    let h = await clearMcpAuthCache(s);
    if (h === undefined || h.type === "connected") return false;
    if (getConnectionCache().connections.get(r) !== s) return false;
  }
  getConnectionCache().connections.delete(r);
  return true;
}
//@ chunk-8t8n4kdh.js:122252-122359 layout
/**
 * 清除服务器的资源与资源模板列表缓存。
 */
function invalidateMcpResourceListCaches(e) {
  let n = serverCacheKey(e.name, e.config);
  getConnectionCache().resourceLists.delete(n);
  getConnectionCache().resourceTemplateLists.delete(n);
}
//@ chunk-8t8n4kdh.js:122359-122466 layout
/**
 * 注册 MCP elicitation/create 请求处理器。
 */
function onMcpElicitRequest(e, n) {
  clientOf(e.client).setRequestHandler("elicitation/create", (r, s) =>
    n(r, {
      signal: s.mcpReq.signal,
    }),
  );
}
//@ chunk-8t8n4kdh.js:122466-122588 layout
/**
 * 注册 elicitation 完成通知处理器。
 */
function onMcpElicitationComplete(e, n) {
  clientOf(e.client).setNotificationHandler("notifications/elicitation/complete", (r) =>
    n(r.params.elicitationId),
  );
}
//@ chunk-8t8n4kdh.js:122588-122761 layout
/**
 * 注册工具列表变化通知处理器（处理器注册前已收到的变化会补发一次）。
 */
function onMcpToolListChanged(e, n) {
  let r = clientOf(e.client);
  recordListChangedRefetcher(r, "tools", n);
  let listChangedRefetcher = createListChangedRefetcher(e, n);
  r.setNotificationHandler("notifications/tools/list_changed", (h) => {
    noteListChangedAhead_2(r);
    return listChangedRefetcher(h);
  });
  if (markHandlerRegistered(r) && !isClientWithoutTransport(e)) listChangedRefetcher(BEFORE_HANDLER);
}
//@ chunk-8t8n4kdh.js:122761-122887 layout
/**
 * 注册提示词列表变化通知处理器。
 */
function onMcpPromptListChanged(e, n) {
  let r = clientOf(e.client);
  recordListChangedRefetcher(r, "prompts", n);
  r.setNotificationHandler("notifications/prompts/list_changed", createListChangedRefetcher(e, n));
}
//@ chunk-8t8n4kdh.js:122887-123017 layout
/**
 * 注册资源列表变化通知处理器。
 */
function onMcpResourceListChanged(e, n) {
  let r = clientOf(e.client);
  recordListChangedRefetcher(r, "resources", n);
  r.setNotificationHandler("notifications/resources/list_changed", createListChangedRefetcher(e, n));
}
//@ chunk-8t8n4kdh.js:123017-123503 layout
/**
 * 为 MCP 连接注册自定义通知处理器（新版协议连接不支持未请求的自定义通知，跳过并警告）。
 */
function onMcpNotification(e, n, r) {
  let s = n.shape.method.value;
  let h = clientOf(e.client);
  if (h.getProtocolEra?.() === "modern") {
    let negotiatedProtocolVersion = h.getNegotiatedProtocolVersion?.();
    let S = negotiatedProtocolVersion === undefined ? undefined : sanitizeCallMark(negotiatedProtocolVersion);
    logForDebugging(
      `[MCP] ${e.name}: skipping ${s} handler registration \u2014 this connection negotiated ${S ? `protocol revision ${S}` : "a modern-era protocol revision"}, which has no delivery path for unsolicited custom notifications`,
      {
        level: "warn",
      },
    );
    return;
  }
  h.setNotificationHandler(
    s,
    {
      params: n.shape.params,
    },
    (params) =>
      r({
        method: s,
        params,
      }),
  );
}
//@ chunk-8t8n4kdh.js:123503-125148 layout
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
    let S = () => {
      toolUseBinding.toolUseId = undefined;
    };
    (options?.toolUseIdWithListingsUntil ?? dial).then(S, S);
  }
  if (server.type === "cached")
    dial.then(
      (S) => runCachedFirstDialArms(S, dial, epochAtDial),
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
          AUTH_MESSAGES.dialNeedsAuth(server.name),
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
      },
    );
  }
  if (isWithdrawnBuiltinPluginServer(server.name, server.config)) {
    await detachAndCloseConnection(connection);
    throw withdrawnBuiltinPluginServerError(server.name);
  }
  return connection;
}
//@ chunk-8t8n4kdh.js:125148-125228 layout
/**
 * 判断缓存条目是否已被新拨号取代。
 */
function isSupersededCacheEntry(e, n, r) {
  let cache = connectToServer.cache;
  if (!cache?.get) return false;
  return cache.get(serverCacheKey(n, r)) !== e;
}
//@ chunk-8t8n4kdh.js:125228-125278 layout
/**
 * 判断该次拨号是否已被取代。
 */
function isSupersededDial(e) {
  return getCliOwnedState().supersededDials.has(e);
}
//@ chunk-8t8n4kdh.js:125278-125684 layout
/**
 * 缓存首次拨号结束后的处理（每个结果只运行一次）：身份变化或被取代时关闭，连接成功或需认证时记录，失败时删除记忆并上报。
 */
function runCachedFirstDialArms(e, dial, epochAtDial) {
  let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
  if (cachedFirstDialArmsRan.has(e)) return;
  cachedFirstDialArmsRan.add(e);
  let h = serverCacheKey(e.name, e.config);
  let y = getConnectionCache().connections.get(h);
  let S = identityEpoch() !== epochAtDial;
  let w = y === undefined && S;
  if (isSupersededDial(dial) || (y !== undefined && y !== dial) || w) {
    if (!isSupersededDial(dial) && S && e.type === "connected") detachAndCloseConnection(e);
    return;
  }
  if (e.type === "connected" || e.type === "needs-auth") {
    emitCachedAdopt(e.name, e.config);
    return;
  }
  getConnectionCache().connections.delete(h);
  if (e.type === "failed") recordCachedDialFailure(e, !getCliOwnedState().swrRefreshDialsInFlight.has(dial));
}
//@ chunk-8t8n4kdh.js:125684-125722 layout
/**
 * 判断两个配置的指纹是否相同。
 */
function sameConfigHash(e, n) {
  return configHash(e) === configHash(n);
}
//@ chunk-8t8n4kdh.js:125722-126790 layout
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
//@ chunk-8t8n4kdh.js:126790-126959 layout
/**
 * 把连接错误码收敛为可上报值：数字码、白名单码或 other。
 */
function sanitizeConnectErrorCodeForTelemetry(e) {
  if (e === undefined) return lit("missing");
  if (/^-?\d+$/.test(e)) return fromNumber(Number(e));
  let found = KNOWN_CONNECT_ERROR_CODES.find((r) => r === e);
  if (found !== undefined) return fromEnum(found);
  return sanitizableErrorCode(e) ?? lit("other");
}
//@ chunk-8t8n4kdh.js:126959-127364 layout
/**
 * MCP 列表请求失败的错误码到原因名的映射。
 */
var LIST_FAILURE_REASONS = {
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
//@ chunk-8t8n4kdh.js:127364-127547 layout
/**
 * 把 MCP 工具输入转换为自动模式分类器的输入文本（key=value，空输入时用工具名）。
 */
function mcpToolInputToAutoClassifierInput(e, name) {
  let keys = Object.keys(e);
  if (keys.length === 0) return name;
  return keys
    .map((s) => {
      let h = e[s];
      let y = typeof h === "object" && h !== null ? JSON.stringify(h) : String(h);
      return `${s}=${y}`;
    })
    .join(" ");
}
//@ chunk-8t8n4kdh.js:127547-127690 layout
function beginDroppedToolsRound(e) {
  let droppedToolsSeqByConnection = getCliOwnedState().droppedToolsSeqByConnection;
  let r = droppedToolsSeqByConnection.get(e) ?? {
    started: 0,
    applied: 0,
  };
  droppedToolsSeqByConnection.set(e, r);
  r.started += 1;
  return {
    seq: r.started,
    state: r,
  };
}
//@ chunk-8t8n4kdh.js:127690-127747 layout
/**
 * 取服务器的 tools/list 错误记录。
 */
function getToolsListError(e) {
  return getCliOwnedState().toolsListErrorByResult.get(e);
}
//@ chunk-8t8n4kdh.js:127747-127802 layout
/**
 * 取服务器的发现阶段请求错误。
 */
function getDiscoveryFetchError(e) {
  return getCliOwnedState().discoveryFetchErrors.get(e);
}
//@ chunk-8t8n4kdh.js:127802-127862 layout
/**
 * 当前身份令牌（未解析时 undefined）。
 */
function currentIdentityToken() {
  primeClientResolvers();
  let target = getMcpIdentitySnapshot();
  return isUnresolved(target) ? undefined : target.token;
}
//@ chunk-8t8n4kdh.js:127862-127994 layout
/**
 * 首次时记录 MCP 身份基线。
 */
function seedMcpIdentityCheck() {
  let cliOwnedState = getCliOwnedState();
  if (cliOwnedState.identitySeedAttempted) return;
  cliOwnedState.identitySeedAttempted = true;
  let n = currentIdentityToken();
  if (n !== undefined) cliOwnedState.identityBaseline = n;
}
//@ chunk-8t8n4kdh.js:127994-128204 layout
/**
 * 判断 MCP 身份自上次检查以来是否变化，并更新基线。
 */
function mcpIdentityChangedSinceLastCheck() {
  let e = currentIdentityToken();
  let cliOwnedState = getCliOwnedState();
  if (e === undefined) {
    cliOwnedState.identityBaseline = undefined;
    return true;
  }
  if (cliOwnedState.identityBaseline === undefined) {
    cliOwnedState.identityBaseline = e;
    return true;
  }
  if (cliOwnedState.identityBaseline === e) return false;
  cliOwnedState.identityBaseline = e;
  return true;
}
//@ chunk-8t8n4kdh.js:128204-128317 layout
/**
 * 记录原始工具列表与拉取时间，供发现缓存写回。
 */
function recordRawToolsForResult(e, n) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawToolsByResult.set(e, n);
  cliOwnedState.rawFetchedAtByResult.set(e, Date.now());
}
//@ chunk-8t8n4kdh.js:128317-128433 layout
/**
 * 记录原始命令列表与拉取时间，供发现缓存写回。
 */
function recordRawCommandsForResult(e, n) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawCommandsByResult.set(e, n);
  cliOwnedState.rawFetchedAtByResult.set(e, Date.now());
}
//@ chunk-8t8n4kdh.js:128433-128550 layout
/**
 * 记录原始资源列表与拉取时间，供发现缓存写回。
 */
function recordRawResourcesForResult(e, n) {
  if (!isDiscoveryCacheOn()) return;
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.rawResourcesByResult.set(e, n);
  cliOwnedState.rawFetchedAtByResult.set(e, Date.now());
}
//@ chunk-8t8n4kdh.js:128550-128602 layout
/**
 * 记录服务器的发现阶段请求错误。
 */
function setDiscoveryFetchError(e, n) {
  getCliOwnedState().discoveryFetchErrors.set(e, n);
}
//@ chunk-8t8n4kdh.js:128602-128755 layout
/**
 * 发现缓存命中但服务器具备频道能力时，改为未命中。
 */
function applyCapabilityServeTimeMiss(e) {
  if (e.kind !== "fresh" && e.kind !== "stale") return e;
  let capabilities = e.entry.capabilities;
  if (hasChannelCapability(capabilities))
    return {
      kind: "miss",
      reason: "channel-capable",
    };
  return e;
}
//@ chunk-8t8n4kdh.js:128755-130342 layout
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
  let mapped = [round.tools, round.commands, round.resources].map((j) => [
    j,
    state.rawFetchedAtByResult.get(j),
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
      templates: round.templates.map(({ server, ...R }) => R),
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
    for (let [j, R] of mapped) if (R !== undefined) state.rawFetchedAtByResult.set(j, R);
    state.persistedDiscoveryRounds.delete(round.tools);
  }
  return true;
}
//@ chunk-8t8n4kdh.js:130342-130600 layout
/**
 * 身份未变化时把刷新得到的工具列表合并写入发现缓存。
 */
async function persistRefreshedToolsIfPresent(e, n, r) {
  primeClientResolvers();
  if (!isCurrentIdentityEpoch(r.identityEpoch)) return;
  let cliOwnedState = getCliOwnedState();
  let tools = cliOwnedState.rawToolsByResult.get(n);
  let y = cliOwnedState.rawFetchedAtByResult.get(n);
  if (tools === undefined || y === undefined) return;
  await mergeDiscoveryTools(e.name, e.config, tools, {
    identityEpoch: r.identityEpoch,
    grantLeg: r.grantLeg,
    fetchedAt: y,
  });
}
//@ chunk-8t8n4kdh.js:130600-130985 layout
/**
 * 把实时连接得到的列表写入发现缓存：需要时拉取资源模板，写入前确认连接未变且服务器未被禁用或拦截。
 */
async function persistLiveListing(connection, n) {
  if (
    !isDiscoveryCacheOn() ||
    !isDiscoveryCacheEligible(connection.config) ||
    isMcpServerDisabled(connection.name) ||
    isMcpServerBlockedAtConnectTime(connection.name, connection.config)
  )
    return;
  try {
    let r = !!connection.capabilities?.resources;
    if (!r) recordRawResourcesForResult(n.resources, []);
    let s =
      r && isCacheableServer(connection.config) ? await fetchResourceTemplatesForClient(connection) : [];
    if (
      (await clearCachedFailureFor(connection.name, connection.config)) !== connection ||
      isMcpServerDisabled(connection.name) ||
      isMcpServerBlockedAtConnectTime(connection.name, connection.config)
    )
      return;
    await persistRawDiscoveryIfComplete(connection, {
      ...n,
      templates: getDiscoveryFetchError(s) === undefined ? s : undefined,
    });
  } catch (error) {
    logMCPDebug(connection.name, `Discovery cache write-through skipped: ${errorMessage(error)}`);
  }
}
//@ chunk-8t8n4kdh.js:130985-131278 layout
/**
 * isDiscoveryCacheMissRecoverable：发现缓存未命中原因是否需要重写缓存（absent/expired/corrupt 等为 true）。
 */
function isDiscoveryCacheMissRecoverable(e) {
  switch (e.reason) {
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
      return e.reason;
  }
}
//@ chunk-8t8n4kdh.js:131278-131805 layout
/**
 * discoverySourceLabel：发现缓存查询结果到遥测标签（live、miss_expired、miss_corrupt 等）。
 */
function discoverySourceLabel(e) {
  if (e.kind !== "miss") return "live";
  switch (e.reason) {
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
      return e.reason;
  }
}
//@ chunk-8t8n4kdh.js:131805-131929 layout
function getMaxResultSizeCharsMeta(e) {
  let n = e._meta?.["anthropic/maxResultSizeChars"];
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
}
//@ chunk-8t8n4kdh.js:131929-136285 fingerprint = fetchToolsForClient (0.385)
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
  iconUrl,
  serverInfoName,
  role,
  listed,
  call: Tt,
  overrides,
}) {
  let mcpToolName = buildMcpToolName(serverName, listed.name);
  let maxResultSizeCharsMeta = getMaxResultSizeCharsMeta(listed);
  let wt = maxResultSizeCharsMeta !== undefined;
  let Se = listed._meta?.["anthropic/requiresUserInteraction"] === true;
  let toolsToProcess = toolUiMeta(listed._meta);
  let At = promptOverrides?.tools?.[listed.name] ?? listed.description ?? "";
  let ft = truncateDescription(At, `Tool "${listed.name}" description`, serverName, maxDescriptionLength_2);
  let Ot = truncateDescription(
    At,
    `Tool "${listed.name}" description`,
    serverName,
    maxLoadedDescriptionLength,
  );
  let vt =
    promptOverrides?.search_hints?.[listed.name] ??
    (typeof listed._meta?.["anthropic/searchHint"] === "string"
      ? listed._meta["anthropic/searchHint"]
      : undefined);
  let me = withOverlapSlots(serverName, listed.name, Tt);
  let fullyQualifiedName = requiresConnectorGrant(serverName, {
    scope,
    pluginSource,
  });
  let Ve = fullyQualifiedName || legacyGrantRefused;
  let De =
    legacyGrantRefused &&
    legacyGrantRebindable &&
    !Se &&
    effectiveMaxPermission !== "ask" &&
    overrides?.suppressesAlwaysAllowRule === undefined &&
    overrides?.requiresUserInteraction === undefined &&
    !isDesignGatedTool(isFirstPartyDesignServer, listed.name);
  let Le = Ve || isDesignGatedTool(isFirstPartyDesignServer, listed.name);
  let re = () =>
    fullyQualifiedName ||
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
  if (Ve)
    logMCPDebug(
      serverName,
      fullyQualifiedName
        ? "Allow rules do not apply: this server's name starts like a claude.ai connector's. To use allow rules, the server needs another name, and the rules must use that name."
        : "Allow rules do not apply: another MCP server already uses this name, or the name could not be recorded in the config file. Give this server a different name and write the rules for that name, or reconnect if the config file was busy.",
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
      ...(De && {
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
      ...(toolsToProcess && {
        uiMeta: toolsToProcess,
      }),
      ...(describeHiddenMcpTool(listed._meta, serverName, listed.name) && {
        hiddenFromModel: true,
      }),
    },
    isMcp: true,
    searchHint: vt?.replace(/\s+/g, " ").trim() || undefined,
    alwaysLoad:
      !serverDefersAllTools &&
      ((serverAlwaysLoad && !(scope === "dynamic" && listed._meta?.["anthropic/alwaysLoad"] === false)) ||
        listed._meta?.["anthropic/alwaysLoad"] === true),
    async description() {
      return At;
    },
    async prompt({ loadedThroughToolSearch }) {
      return loadedThroughToolSearch ? Ot : ft;
    },
    isConcurrencySafe() {
      return me.mayOverlap || (listed.annotations?.readOnlyHint ?? false);
    },
    isReadOnly() {
      return listed.annotations?.readOnlyHint ?? false;
    },
    readOnlyHint: listed.annotations?.readOnlyHint,
    openWorldHint: listed.annotations?.openWorldHint,
    toAutoClassifierInput(ue) {
      return mcpToolInputToAutoClassifierInput(ue, listed.name);
    },
    isDestructive() {
      return listed.annotations?.destructiveHint ?? false;
    },
    isOpenWorld() {
      return listed.annotations?.openWorldHint ?? false;
    },
    requiresUserInteraction() {
      return Se;
    },
    async validateInput(ue, ot) {
      let it = refuseNonMainAccountMemoryWrite(accountMemoryServer, listed.name, ot);
      if (it === undefined)
        return {
          result: true,
        };
      logEvent("tengu_account_memory_spawned_write_refused", {
        caller: fromEnumOpt(ot.memoryCaller) ?? lit("unmarked"),
      });
      return {
        result: false,
        message: it,
        errorCode: 1,
      };
    },
    suppressesAlwaysAllowRule: (ue, ot) =>
      Se ||
      (effectiveMaxPermission === "ask" && !ot) ||
      re() ||
      isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    ...((Ve || isServerIdentityActive()) && {
      ignoresWholeToolAllowRule: re,
    }),
    maxResultSizeChars: wt
      ? Math.min(maxResultSizeCharsMeta, MAX_MCP_RESULT_CHARS)
      : MCPTool.maxResultSizeChars,
    persistenceThresholdCeiling: wt ? MAX_MCP_RESULT_CHARS : undefined,
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
    async checkPermissions(ue, ot) {
      let it = gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, listed.name, ue);
      if (it) return it;
      if (isFirstPartyDesignServer) {
        let ye = peekScopeExpansionNotice();
        let be =
          (await ye?.wouldNeedDesignConsent(ot.toolState.get(DesignGateState), ot.credentials)) ?? null;
        if (be !== null && ye && ot.toolUseId) {
          let ct = rememberDesignConsentAsk(ot.toolUseId, be, canAskDesignConsent(ot));
          return askDesignConsent(ye.consentPromptFor(be), ue, ct);
        }
      }
      if (Se)
        return {
          behavior: "ask",
          message: "MCPTool requires permission.",
          suggestions: [],
          suppressAlwaysAllowRule: true,
        };
      return {
        behavior: "passthrough",
        message: "MCPTool requires permission.",
        suggestions: Le
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
    call: me.call,
    userFacingName() {
      let trimmed = (listed.annotations?.title || listed.name).replace(/\s+/g, " ").trim();
      return `${serverName} - ${trimmed} (MCP)`;
    },
    ...overrides,
  };
}
//@ chunk-8t8n4kdh.js:136285-136568 layout
/**
 * buildCachedClientTools：用发现缓存条目构造 type=cached 的客户端与工具（不连线）。
 */
async function buildCachedClientTools({ name: e, config, capabilities, serverInfo, savedAt, tools }) {
  primeEnsureConnected();
  await evictStaleFailedConnectMemoForServe(e, config);
  let client = {
    name: e,
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
    client,
    tools: await buildMcpToolsForClient(client, tools, Date.now(), "cache", beginDroppedToolsRound(client)),
  };
}
//@ chunk-8t8n4kdh.js:136568-154333 layout
/**
 * buildMcpToolsForClient：处理 tools/list 结果：校验/修正 inputSchema、数量上限、toolPermissions 与工具策略、IDE 工具白名单、角色等，逐个 buildMcpTool，并记录降级与 tengu_mcp_tools_listed 遥测。
 */
async function buildMcpToolsForClient(client, listedTools, startedAtMs, discoverySource, h) {
  listedTools = filterRemoteRepoTools(client.config, listedTools);
  let y = listedTools.length;
  let streamingListingSanitizer = createStreamingListingSanitizer();
  let w = (await mapInTurns(listedTools, (re) => streamingListingSanitizer(re) ?? [])).flat();
  listedTools = [];
  let P = loggingSafeOrigin(client.config);
  let M = mcpBaseUrlAnalytics_2(client.config, client.name);
  let mcpServerName = mcpNameForAnalytics_GATE_EVALUATED(
    normalizeNameForMCP(client.name),
    isMcpServerLoggableInAnalytics(client.name, client.config),
  );
  let R = y - w.length;
  if (R > 0) {
    logMCPError(client.name, listingTruncatedNote("tools", R, y));
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_listing_over_limit"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: R,
      mcpServerName,
      ...M,
    });
  }
  if (y === 0 && discoverySource === "live")
    logEvent("tengu_mcp_degraded", {
      reason: lit("connected_zero_tools"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      mcpServerName,
      ...M,
    });
  let CLAUDE_AGENT_SDK_MCP_NO_PREFIX = client.config.type === "sdk" && env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX;
  let toolPermissions =
    client.config.type === "claudeai-proxy" || client.config.type === "http" || client.config.type === "sse"
      ? client.config.toolPermissions
      : undefined;
  let ie = isRunnerDynamicServer(client.config) ? applyBlockedToolPolicy(toolPermissions) : toolPermissions;
  if (ie) {
    let re = Object.keys(ie).length;
    if (re > 0 && !w.some((ue) => ie[ue.name] !== undefined))
      logForDebugging(
        `[claudeai-mcp] ${client.name}: toolPermissions has ${re} entries but none matched upstream tool names \u2014 backend name drift?`,
        {
          level: "warn",
        },
      );
  }
  let normalizeEnabled = shouldNormalizeRootCombinators(client.config);
  let apiValidateEnabled = shouldDropInvalidToolSchemas(client.config);
  let G = 0;
  let Pe = 0;
  let ke = 0;
  let nt = 0;
  let ee = 0;
  let he = [];
  let Ae = 0;
  let yt = 0;
  let q = await mapInTurns(w, (re) => {
    let ue = judgeToolSchemaSendability(re.inputSchema, {
      normalizeEnabled,
      apiValidateEnabled,
    });
    if (ue.verdict === "drop" && ue.cause !== "api_invalid") {
      if (ue.cause === "normalize_gated") Pe++;
      else ke++;
      logMCPError(
        client.name,
        `Skipping tool "${re.name}": ${ue.reason}. Other tools from this server remain available.`,
      );
      return [];
    }
    if (ue.normalized) {
      G++;
      logMCPDebug(
        client.name,
        `Normalized input schema for tool "${re.name}" (flattened top-level ${ue.normalized.combinators.join("/")})`,
      );
    }
    if (ue.verdict === "drop") {
      if (ue.rejection.check === "meta") nt++;
      else ee++;
      if (
        ie?.[re.name] !== "blocked" &&
        isIncludedMcpTool_2(CLAUDE_AGENT_SDK_MCP_NO_PREFIX ? re.name : buildMcpToolName(client.name, re.name))
      )
        he.push({
          toolName: re.name,
          reason: ue.rejection.detail,
        });
      logMCPError(
        client.name,
        `Skipping tool "${re.name}": its input schema would be rejected by the Anthropic API (${ue.rejection.detail}). Other tools from this server remain available.`,
      );
      return [];
    }
    if (ue.apiWouldReject) {
      if (ue.apiWouldReject.check === "meta") Ae++;
      else yt++;
      logMCPDebug(
        client.name,
        `Tool "${re.name}" input schema would be rejected by the Anthropic API (${ue.apiWouldReject.detail}); requests that include it may fail`,
      );
    }
    return ue.normalized
      ? [
          {
            ...re,
            inputSchema: ue.normalized.schema,
            description: joinDescription(ue.normalized.note, re.description),
          },
        ]
      : [re];
  });
  let H = Ji(q.flat(), "name");
  if (h.seq > h.state.applied) {
    h.state.applied = h.seq;
    client.droppedTools = Ji(he, "toolName");
  }
  if (G > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalized"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      normalizedCount: G,
      mcpServerName,
      ...M,
    });
  if (Pe > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalize_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: Pe,
      mcpServerName,
      ...M,
    });
  if (ke > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_unsupported"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: ke,
      mcpServerName,
      ...M,
    });
  if (nt > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: nt,
      mcpServerName,
      ...M,
    });
  if (ee > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: ee,
      mcpServerName,
      ...M,
    });
  if (Ae > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      keptCount: Ae,
      mcpServerName,
      ...M,
    });
  if (yt > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      keptCount: yt,
      mcpServerName,
      ...M,
    });
  let Xe = () => isMcpServerLoggableInAnalytics(client.name, client.config);
  let Ee = toolTimeoutForServer(client.config);
  let maxLoadedDescriptionLength = toolTimeoutForServer(client.config, true);
  await logToolCallXmlInDescriptions(H, client.name, Xe(), P, client.instructions);
  let Qe = isDesignServerConfig(client.config);
  let Be = officialPluginPromptOverrides(client.config);
  let pluginTelemetry = client.config.pluginSource
    ? buildPluginEventFieldsFromId(client.config.pluginSource, policyEnabledPluginNameSet())
    : undefined;
  let wt = isCliOwnedConfig(client.config);
  let Se = wt && client.name === CLAUDE_ARTIFACTS;
  let ze = Se || isOwnCcrMcpServer(client.config);
  let At = false;
  let ft = H;
  let Ot =
    w.some((re) => isMemoryToolServer(client, re.name)) ||
    ft.some((re) => isMemoryToolServer(client, re.name)) ||
    (R > 0 && isMemoryToolServer_2(client));
  let vt = {
    serverName: client.name,
    scope: client.config.scope,
    pluginSource: client.config.pluginSource,
    serverType: client.config.type ?? "stdio",
    sdkDocsConnector: isDocsConnectorClient(client),
    source: mcpServerSource(client.name, client.config),
    skipPrefix: CLAUDE_AGENT_SDK_MCP_NO_PREFIX,
    serverAlwaysLoad: client.config.alwaysLoad === true,
    serverDefersAllTools: client.config.alwaysLoad === false,
    promptOverrides: Be,
    isFirstPartyDesignServer: Qe,
    maxDescriptionLength: Ee,
    maxLoadedDescriptionLength,
    pluginTelemetry,
    cliOwned: wt,
    displayName: "displayName" in client.config ? client.config.displayName : undefined,
    standardKey: isStandardKeyActive()
      ? getServerIdentityKey(client.name, client.config, wt === true)
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
    iconUrl: "iconUrl" in client.config ? client.config.iconUrl : undefined,
    serverInfoName: stripIgnorables(client.serverInfo?.name ?? "") || undefined,
    role: "role" in client.config ? client.config.role : undefined,
  };
  let me = isClaudeInChromeMCPServer(client.name);
  let Te = isDocsConnectorServer(client);
  let filtered = (
    await mapInTurns(ft, (re) => {
      let fullyQualifiedName = buildMcpToolName(client.name, re.name);
      let ot = getMaxResultSizeCharsMeta(re) !== undefined;
      let overrides = {
        ...(me &&
          isStdioConfig(client.config) && {
            ...needsAuthCacheModule().getClaudeInChromeMCPToolOverrides(re.name),
            builtinRenderFamily: "claude-in-chrome",
          }),
        ...(me &&
          isClaudeAiProxyServer(client.config) && {
            ...createChromePermissionHandler(re.name, re._meta, (Fe, L) =>
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
                Fe,
                L,
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
              re.name,
              re.inputSchema.properties,
              mcpToolInputToAutoClassifierInput,
            )
          : {}),
        ...(isSlackSendToolName(re.name) ? createSlackSendToolUi() : {}),
        ...(isClaudeTestWriteCall(client.name, client.config.pluginSource, re.name)
          ? claudeTestWriteToolOverrides()
          : {}),
        ...{},
        ...(Se ? artifactsMcpLaptopModule()?.artifactsMcpLaptopToolOverridesFor(client.config) : {}),
        ...(isRunnerDynamicServer(client.config) && {
          skipAggregateToolResultBudget: true,
        }),
      };
      let tool = buildMcpTool({
        ...vt,
        accountMemory: isMemoryServerConnection(client, re.name),
        accountMemoryServer: Ot,
        effectiveMaxPermission: ie?.[re.name],
        listed: re,
        overrides,
        async call(Fe, L, canUseTool, et, Oe, we) {
          let Ke = L.toolUseId ?? getFirstToolUseId(et);
          let He = refuseNonMainAccountMemoryWrite(Ot, re.name, L);
          if (He !== undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              He,
              "account memory write from a spawned loop",
            );
          let tt = {
            ...stripHostMetaUnlessCcrScoped(client.config, L.mcpRequestMeta),
            ...we?.mcpCallMeta,
            ...(Ke && {
              "claudecode/toolUseId": Ke,
            }),
            ...consumeMcpApprovalTicket(L.session, L.toolUseId, client.name, client.config),
            ...(isClaudeInChromeMCPServer(client.name) &&
              isClaudeAiProxyServer(client.config) &&
              judgedSiteMeta(L)),
            ...((isDocsConnectorServer(client) || isOwnArtifactMcpTool(client.name, client.config)) &&
              requestIdMeta(et.requestId)),
            ...(isHearthbotRelayServer(client) && ccrTurnEventHeaders(turnTraceContextsOf())),
            ...agentRequestMeta(client, L),
            ...(isAccountMemoryServer(client) && memoryChainMeta(L.toolState, et.message.id)),
          };
          let gt = false;
          function Nt(data) {
            if (!Oe || !Ke || gt) return;
            Oe({
              type: "progress",
              toolUseID: Ke,
              data,
            });
          }
          Nt({
            type: "mcp_progress",
            status: "started",
            serverName: client.name,
            toolName: re.name,
          });
          let now = Date.now();
          let Me = client;
          let Ye = false;
          let _t;
          let Mt = null;
          let __consentNonce = typeof Fe.__consentNonce === "string" ? Fe.__consentNonce : undefined;
          if ("__consentNonce" in Fe) {
            let { __consentNonce, ...sn } = Fe;
            Fe = sn;
          }
          let pt = Qe ? takeDesignConsentAsk(Ke, __consentNonce) : null;
          if (Qe) noteDesignProjectId(L.toolState.get(DesignGateState), Qe, re.name, Fe);
          let jt;
          let Lt = (Ct) => {
            Ye = Ct;
            if (Ct) {
              _t ??= we?.timing?.mark("approval");
              if (!gt && tool.name !== getPermissionPromptToolName() && Mt === null) Mt = parkOnUser();
            } else {
              _t?.();
              _t = undefined;
              Mt?.();
              Mt = null;
            }
          };
          let We = true;
          let Bt = async (Ct) => {
            let an = false;
            let un;
            for (let idx = 0; ; idx++)
              try {
                let toolUseId = We ? Ke : undefined;
                We = false;
                let qt = we?.timing?.mark(
                  client.config.type === "http" && issuerKey_3(client.config.url) ? "own" : "external",
                );
                let Qt = await ensureConnectedClient(client, {
                  context: "MCP tool call",
                  toolUseId,
                }).finally(qt);
                Me = Qt;
                applyMemoryCallerMeta(tt, Ot, L, Qt);
                let lt = await callMCPToolWithUrlElicitationRetry({
                  client: Qt,
                  clientConnection: client,
                  tool: re.name,
                  args: Fe,
                  meta: tt,
                  signal: Ct,
                  imageLimits: imageLimitsForModel(L.options.mainLoopModel),
                  taskRegistry: L.taskRegistry,
                  toolUseId: Ke,
                  onProgress: Oe && Ke ? Nt : undefined,
                  requestDialog: L.requestDialog,
                  storageV5: L.storageV5,
                  credentials: L.credentials,
                  hasResultSizeAnnotation: ot || L.innerCall === true,
                  onAwaitingUserInput: Lt,
                  timing: we?.timing,
                  offCriticalPath:
                    (getBackgroundAgentId(L.agentContext) ??
                      (L.isBackgroundAgent ? L.agentId : undefined)) !== undefined,
                  taskBackground: jt,
                  disallowTasks:
                    L.agentId !== undefined || (L.options.isNonInteractiveSession && jt === undefined),
                  ccrNeedsApprovalRetry:
                    "url" in client.config &&
                    isSameOriginAsCcr(client.config.url) &&
                    canPromptForPermission(L) &&
                    !(getPermissionPromptToolName() && getPermissionPromptToolName() !== "stdio")
                      ? {
                          canUseTool,
                          tool,
                          fullyQualifiedName,
                          toolUseContext: L,
                          parentMessage: et,
                        }
                      : undefined,
                });
                if (lt.interrupted) throw new AbortError(INTERRUPTED_CALL_NOTICE);
                Nt({
                  type: "mcp_progress",
                  status: "completed",
                  serverName: client.name,
                  toolName: re.name,
                  elapsedTimeMs: Date.now() - now,
                });
                if (!lt.isError) {
                  logPrCreateOperation(re.name);
                  if (isAccountMemoryServer(client))
                    rememberMemoryChain(L.toolState, et.message.id, lt._meta);
                  if (!gt && isClaudeInChromeMCPServer(client.name) && isClaudeAiProxyServer(client.config))
                    lt.content = chromeNoBrowserAnswer(lt.content, lt._meta, L);
                }
                if (idx > 0) logFeatureOk("mcp_session_recovery");
                let cn = rewriteAnthropicSourcesForCcr(client.config, stripAnthropicMeta(lt._meta));
                let vn = isMcpTasksEnabled() ? mcpTaskDriveModule.sdkAgentTaskMeta(lt._meta) : undefined;
                let kn =
                  cn || vn
                    ? {
                        ...cn,
                        ...vn,
                      }
                    : undefined;
                return {
                  data: un === undefined ? lt.content : stepUpResultMessage(lt.content, client.name, un),
                  ...(lt.urlElicitationDeclined && {
                    urlElicitationDeclined: lt.urlElicitationDeclined,
                  }),
                  ...((kn || lt.structuredContent || lt.resourceLinks) && {
                    mcpMeta: {
                      ...(kn && {
                        _meta: kn,
                      }),
                      ...(lt.structuredContent && {
                        structuredContent: lt.structuredContent,
                      }),
                      ...(lt.resourceLinks && {
                        resourceLinks: lt.resourceLinks,
                      }),
                    },
                  }),
                };
              } catch (error) {
                if (
                  un !== undefined &&
                  error instanceof McpAuthError &&
                  error.requestedScope !== undefined &&
                  client.config.type === "http"
                )
                  markStepUpExhausted(client.name, client.config, un, error.requestedScope);
                if (
                  !an &&
                  error instanceof McpAuthError &&
                  error.requestedScope !== undefined &&
                  isStepUpAuthDialogEnabled() &&
                  client.config.type === "http" &&
                  client.config.oauth?.xaa !== true &&
                  grantedScopesCover(client.config, error.requestedScope) &&
                  !isStepUpExhausted(client.name, client.config, error.requestedScope) &&
                  canPromptForPermission(L) &&
                  L.agentId === undefined &&
                  tool.name !== getPermissionPromptToolName() &&
                  !L.options.isNonInteractiveSession &&
                  !isBrowserUnavailable() &&
                  !isUnattendedBgSession() &&
                  getTeammateAgentId() === undefined &&
                  !isMcpServerDisabled(client.name) &&
                  !isMcpDialBlockedByPolicy(client.name, client.config)
                ) {
                  let config = client.config;
                  Lt(true);
                  let Qt;
                  try {
                    Qt = await runStepUpReauth({
                      serverName: client.name,
                      config,
                      requestedScope: error.requestedScope,
                      canUseTool,
                      toolUseContext: L,
                      signal: Ct,
                      performOAuthFlow: performMCPOAuthFlow_2,
                      reconnect: (name, config) =>
                        reconnectMcpServerImpl_2(name, config, L.storageV5, L.credentials),
                      discard: (lt, cn) => clearServerCache(lt, cn),
                      isPermitted: (lt, cn) => !isMcpServerDisabled(lt) && !isMcpDialBlockedByPolicy(lt, cn),
                    });
                  } finally {
                    Lt(false);
                  }
                  if (Qt === "reauthenticated") {
                    an = true;
                    un = error.requestedScope;
                    logMCPDebug(
                      client.name,
                      `Retrying tool '${re.name}' after the consented step-up re-auth`,
                    );
                    idx -= 1;
                    continue;
                  }
                }
                if (
                  error instanceof McpSessionExpiredError &&
                  idx < 1 &&
                  (!error.mayHaveRun || tool.isConcurrencySafe(Fe) || re.annotations?.idempotentHint === true)
                ) {
                  logFeatureSad("mcp_session_recovery", error.expiryKind);
                  logMCPDebug(client.name, `Retrying tool '${re.name}' after session recovery`);
                  continue;
                }
                if (error instanceof McpSessionExpiredError)
                  logFeatureBad(
                    "mcp_session_recovery",
                    idx < 1 ? "may_have_run_no_retry" : "session_retry_exhausted",
                  );
                else if (idx > 0 && !Ct.aborted) logFeatureBad("mcp_session_recovery", "retry_failed_other");
                Nt({
                  type: "mcp_progress",
                  status: "failed",
                  serverName: client.name,
                  toolName: re.name,
                  elapsedTimeMs: Date.now() - now,
                });
                if (!Ct.aborted) noteHearthDegraded(client.name, error);
                if (
                  error instanceof Error &&
                  !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
                ) {
                  let qt = error.constructor.name;
                  let Qt = () => (Ct.aborted ? "other" : classifyMcpErrorSourceCategory(error));
                  if (qt === "Error") {
                    let lt = describeConnectError(error, client.config);
                    throw Object.assign(
                      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(lt, lt.slice(0, 200)),
                      {
                        mcpErrorSource: Qt(),
                      },
                    );
                  }
                  if (
                    "code" in error &&
                    (((qt === "McpError" || qt === "ProtocolError") && typeof error.code === "number") ||
                      ((qt === "SdkError" || qt === "SdkHttpError") &&
                        (typeof error.code === "number" ||
                          (typeof error.code === "string" && MCP_SDK_ERROR_CODES.has(error.code)))))
                  ) {
                    let merged = Object.assign(
                      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                        error.message,
                        `${qt} ${error.code}`,
                      ),
                      {
                        mcpErrorSource: Qt(),
                      },
                    );
                    throw isNeedsApprovalOrExpiredSession(error) ? markRefusedByCcrProxy(merged) : merged;
                  }
                }
                raiseMemoryErrorCap(error, client, re.name);
                throw error;
              }
          };
          let Kt = Bt;
          if (Qe)
            Kt = wrapCallWithDesignConsent(Bt, {
              designSession: L.toolState.get(DesignGateState),
              approvedConsentBit: pt?.bit ?? null,
              consentAskReachesUser: (pt?.askReachesUser ?? false) && canAskDesignConsent(L),
              credentials: L.credentials,
            });
          if (re.name === GET_TASK && isToolboxServer(client)) {
            let { withTaskFilesRemembered } = await import("./chunk-h33h7b0z.js");
            Kt = withTaskFilesRemembered(Kt, {
              client,
              args: Fe,
              session: L.session,
            });
          }
          let zt =
            !L.agentId &&
            L.taskRegistry !== UNLIMITED_RATE_LIMITER &&
            tool.name !== getPermissionPromptToolName();
          if (mcpAutoBackgroundModule && zt) {
            let mcpAutoBackgroundMs = mcpAutoBackgroundModule.getMcpAutoBackgroundMs(client.config, {
              isNonInteractiveSession: L.options.isNonInteractiveSession,
            });
            let sn =
              mcpAutoBackgroundMs === 0 &&
              mcpAutoBackgroundModule.isMcpCallMovableWithoutTimer(client.config, {
                isNonInteractiveSession: L.options.isNonInteractiveSession,
                isInnerCall: L.innerCall === true,
              });
            if (mcpAutoBackgroundMs > 0 || sn) {
              let share = {
                becameTask: false,
              };
              if (!sn && isMcpTasksEnabled() && !isTaskBackgroundDisabled())
                jt = {
                  share,
                  session: L.session,
                  storageV5: L.storageV5,
                  credentials: L.credentials,
                  onBackgrounded: () => {
                    gt = true;
                  },
                };
              return mcpAutoBackgroundModule.callMcpToolWithAutoBackground({
                run: Kt,
                serverName: client.name,
                toolName: re.name,
                accountMemoryTool: isLiveMemoryTool(tool),
                toolUseId: Ke,
                parentAbortController: L.abortController,
                taskRegistry: L.taskRegistry,
                autoBackgroundMs: sn ? null : mcpAutoBackgroundMs,
                storageV5: L.storageV5,
                credentials: L.credentials,
                hasPendingElicitation: () =>
                  Ye ||
                  ((Me.type === "connected" ? Me.transportErrorState?.pendingElicitations : undefined) ?? 0) >
                    0,
                onBackgrounded: () => {
                  gt = true;
                },
                share,
                foregroundCalls: L.innerCall ? undefined : foregroundCallRegistrySlots.of(L.session),
                noticeGate: wrapHoldAware({
                  hookCaller: L.hookCaller,
                  hookServesModel: L.hookServesModel,
                  pluginUnnamed: L.pluginUnnamed,
                }),
              });
            }
          }
          if (
            zt &&
            isMcpTasksEnabled() &&
            !isTaskBackgroundDisabled() &&
            env.CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS !== 0 &&
            (!getIsNonInteractiveSession() || env.CLAUDE_AUTO_BACKGROUND_TASKS === true) &&
            !isPrintInputClosed()
          )
            jt = {
              share: {
                becameTask: false,
              },
              session: L.session,
              storageV5: L.storageV5,
              credentials: L.credentials,
              onBackgrounded: () => {
                gt = true;
              },
            };
          return Kt(L.abortController.signal);
        },
      });
      if (me && (re.name === "file_upload" || re.name === "browser_batch")) {
        let CLAUDE_CODE_IS_COWORK =
          !isStdioConfig(client.config) && !env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_IS_COWORK;
        let L = tool.call;
        tool.call = async (mt, et, Oe, we, Ke, He) => {
          let {
            FILE_UPLOAD_MAX_TOTAL_BYTES,
            passThroughChromeFileUploadInput,
            prepareChromeFileUploadInput,
          } = await import("./chunk-f11kwnvn.js");
          let Ft = CLAUDE_CODE_IS_COWORK
            ? await passThroughChromeFileUploadInput(re.name, mt ?? {}, getToolPermissionContext(et))
            : await prepareChromeFileUploadInput(
                re.name,
                mt ?? {},
                getToolPermissionContext(et),
                isClaudeAiProxyServer(client.config)
                  ? {
                      maxTotalBytes: chromeUploadMaxBytes(re._meta, FILE_UPLOAD_MAX_TOTAL_BYTES),
                      hosted: {
                        session: et.session,
                        signal: et.abortController.signal,
                      },
                    }
                  : undefined,
              );
          if (Ft.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              Ft.error,
              "Claude in Chrome file_upload path rejected",
            );
          return L(
            Ft.input ?? mt,
            et,
            Oe,
            we,
            Ke,
            Ft.callMeta
              ? {
                  ...He,
                  mcpCallMeta: Ft.callMeta,
                }
              : He,
          );
        };
      }
      if (
        client.config.type === "sdk" &&
        isFileUploadServer(client.name) &&
        FILE_UPLOAD_TOOLS.includes(re.name) &&
        !env.CLAUDE_CODE_REMOTE &&
        !env.CLAUDE_CODE_IS_COWORK &&
        resolveSdkUrl().status === "absent"
      ) {
        let Fe = re._meta?.[ANTHROPIC_HOSTASKSPERUPLOADEDFILE] === true;
        let L = tool.call;
        tool.call = async (mt, et, Oe, we, Ke, He) => {
          let tt = await import("./chunk-v64arqfj.js");
          let gt = await tt.paneFileUploadCall(
            mt,
            getToolPermissionContext(et),
            et.mcpRequestMeta,
            Fe,
            et.autoModeClassified === true,
          );
          return L(
            gt.input,
            {
              ...et,
              mcpRequestMeta: gt.mcpRequestMeta,
            },
            Oe,
            we,
            Ke,
            He && {
              ...He,
              mcpCallMeta: {},
            },
          );
        };
      }
      if (isTaskWriteMethod(re.name)) {
        let Fe = re.name;
        let validateInput = tool.validateInput;
        tool.validateInput = async (Oe, we) => {
          let Ke = validateInput
            ? await validateInput(Oe, we)
            : {
                result: true,
              };
          if (!Ke.result) return Ke;
          let { startTaskInputRefusal } = await import("./chunk-d40fm320.js");
          let taskInputRefusal = startTaskInputRefusal(client, Fe, Oe, tool.inputJSONSchema, we.session);
          return taskInputRefusal === undefined
            ? Ke
            : {
                result: false,
                message: taskInputRefusal,
                errorCode: 2,
              };
        };
        let prompt = tool.prompt;
        tool.prompt = async (Oe) => {
          let we = await prompt(Oe);
          let toolPermissionContext = await Oe.getToolPermissionContext();
          if (toolPermissionContext.isRemoteMode !== true) return we;
          let { startTaskFilesPromptNote } = await import("./chunk-d40fm320.js");
          let taskFilesPromptNote = startTaskFilesPromptNote(client, Fe, toolPermissionContext);
          return taskFilesPromptNote === undefined
            ? we
            : `${we}

${taskFilesPromptNote}`;
        };
        let et = tool.call;
        tool.call = async (Oe, we, Ke, He, tt, gt) => {
          let Nt = Oe ?? {};
          if (!Array.isArray(Nt.files) || Nt.files.length === 0) return et(Oe, we, Ke, He, tt, gt);
          let {
            prepareStartTaskFileInputs,
            removeStartTaskUploadsFor,
            startTaskInputRefusal,
            startTaskSendRefusal,
          } = await import("./chunk-d40fm320.js");
          let toolUseId = we.toolUseId;
          let pendingTaskFilesForArgs = findPendingTaskFilesForArgs(we.session, toolUseId, Nt.files);
          if (pendingTaskFilesForArgs !== undefined && toolUseId !== undefined) {
            let taskSendRefusal = startTaskSendRefusal(pendingTaskFilesForArgs.uploadStartedAt, Fe);
            if (taskSendRefusal !== undefined) {
              await discardTaskFiles(we.session, pendingTaskFilesForArgs);
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                taskSendRefusal,
                "start_task files not sent after the approval",
              );
            }
            pendingTaskFilesForArgs.state = "sending";
            registerDiscarder(we.session, toolUseId, () =>
              startTaskSendRefusal(pendingTaskFilesForArgs.uploadStartedAt, Fe),
            );
            try {
              return await et(Oe, we, Ke, He, tt, gt);
            } catch (error) {
              if (isRefusedByCcrProxy(error)) {
                pendingTaskFilesForArgs.state = "pending";
                await discardTaskFiles(we.session, pendingTaskFilesForArgs);
              }
              throw error;
            } finally {
              unregisterDiscarder(we.session, toolUseId);
              markTaskFilesSent(we.session, pendingTaskFilesForArgs);
            }
          }
          let taskInputRefusal = startTaskInputRefusal(client, Fe, Nt, tool.inputJSONSchema, we.session);
          if (taskInputRefusal !== undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              taskInputRefusal,
              "start_task input refused",
            );
          let now = Date.now();
          let startTaskFileInputs = await prepareStartTaskFileInputs(
            client,
            Fe,
            Nt,
            getToolPermissionContext(we),
            we.abortController.signal,
            we.session,
          );
          if (startTaskFileInputs.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              startTaskFileInputs.error,
              "start_task file input rejected",
            );
          if (startTaskFileInputs.input === undefined || toolUseId === undefined)
            return et(startTaskFileInputs.input ?? Oe, we, Ke, He, tt, gt);
          registerDiscarder(we.session, toolUseId, () => startTaskSendRefusal(now, Fe));
          try {
            return await et(startTaskFileInputs.input, we, Ke, He, tt, gt);
          } catch (error) {
            if (isRefusedByCcrProxy(error))
              await removeStartTaskUploadsFor(client, we.session, startTaskFileInputs.input.files);
            throw error;
          } finally {
            unregisterDiscarder(we.session, toolUseId);
          }
        };
        if (isToolboxMcpServer(client))
          tool.askInputPreparer = async (Oe, we, Ke) => {
            if (!Array.isArray(Oe.files) || Oe.files.length === 0) return;
            let { startTaskAskInputPreparer, startTaskInputRefusal } = await import("./chunk-d40fm320.js");
            let taskAskInputPreparer = startTaskAskInputPreparer(
              client,
              Fe,
              Oe,
              getToolPermissionContext(we),
              we.abortController.signal,
              we.session,
              Ke,
            );
            return (
              taskAskInputPreparer && {
                prepare: () => {
                  let taskInputRefusal = startTaskInputRefusal(
                    client,
                    Fe,
                    Oe,
                    tool.inputJSONSchema,
                    we.session,
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
      let { validateInput, call: ct, askInputPreparer } = tool;
      if (re._meta?.[ANTHROPIC_FILEINPUTS] !== undefined)
        wireFileInputs(
          tool,
          {
            client,
            name: re.name,
            meta: re._meta,
            schema: tool.inputJSONSchema,
          },
          (Fe) => async (tool, args) =>
            (
              await callMCPTool({
                client: await ensureConnectedClient(client, {
                  context: "MCP tool call",
                }),
                tool,
                args,
                signal: Fe.abortController.signal,
                imageLimits: imageLimitsForModel(Fe.options.mainLoopModel),
                hasResultSizeAnnotation: true,
                storageV5: Fe.storageV5,
                credentials: Fe.credentials,
              })
            ).structuredContent,
        );
      {
        let Fe = fileReferenceToolToFill(client, re.name);
        if (Fe !== undefined)
          wrapFileReferenceTool(
            tool,
            Fe,
            {
              validateInput,
              call: ct,
              askInputPreparer,
            },
            getFirstToolUseId,
            filledCallRequestMeta(client),
          );
      }
      if (tool.mcpInfo !== undefined && fileReferenceToolForRecords(client, re.name) !== undefined)
        tool.mcpInfo = {
          ...tool.mcpInfo,
          fileReference: true,
        };
      if (Se || isRunnerDynamicServer(client.config))
        artifactPermissionRulesModule()?.applyArtifactRules(client.config, tool);
      if (ze) artifactsMcpLaptopModule()?.wrapArtifactsMcpLaptopPublishing(client.config, tool);
      if (Te) claudeDocsWakeModule()?.wrapClaudeDocsCreateWake(tool);
      if (me && client.config.type !== "sdk") {
        let Fe = tool.call;
        tool.call = async (L, mt, et, Oe, we, Ke) => {
          let He = policyDeniedReason("allow_claude_browser_extension", "Claude in Chrome", "is");
          if (He !== null)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              He,
              "Claude in Chrome call refused by org policy",
            );
          return Fe(L, mt, et, Oe, we, Ke);
        };
      }
      let Vt = tool.call;
      tool.call = async (Fe, L, mt, et, Oe, we) => {
        L.options.activeMcpServer = client.name;
        L.options.activeMcpTool = re.name;
        if (client.config.pluginSource) {
          recordPluginUsage(client.config.pluginSource);
          recordPluginActivity(client.config.pluginSource, "mcp", {
            kind: "mcp-server",
            name: client.name,
          });
        }
        let Ke = Xe();
        if (Ke) markMcpServerLoggable(client.name);
        let He =
          (isTaskWriteMethod(re.name) &&
            findPendingTaskFilesForArgs(L.session, L.toolUseId, Fe?.files) !== undefined) ||
          (re._meta?.[ANTHROPIC_FILEINPUTS] !== undefined
            ? (await import("./chunk-bk2cbdc2.js")).hasFileGrants(L.session, L.toolUseId)
            : false);
        return Vt(
          He
            ? Fe
            : stripTrailingInvokeSuffix(
                Fe,
                re.name,
                client.name,
                Ke,
                getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_strip_trailing_xml_tags", false),
                P,
              ),
          L,
          mt,
          et,
          Oe,
          we,
        );
      };
      return tool;
    })
  ).filter(isIdeServer);
  let mapped = H.map((re) => (Be?.tools?.[re.name] ?? re.description ?? "").length);
  let reduced = mapped.reduce((acc, ue) => acc + ue, 0);
  logEvent("tengu_mcp_tools_listed", {
    transportType: fromEnum(client.config.type ?? "stdio"),
    listDurationMs: Date.now() - startedAtMs,
    toolCount: filtered.length,
    alwaysLoadCount: count(filtered, (re) => re.alwaysLoad === true),
    descriptionTotalLength: reduced,
    descriptionMaxLength: mapped.reduce((acc, ue) => Math.max(acc, ue), 0),
    descriptionMeanLength: mapped.length ? Math.round(reduced / mapped.length) : 0,
    descriptionOverLimitCount: count(mapped, (re) => re > Ee),
    discoverySource: fromEnum(discoverySource),
    ...M,
    mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
      normalizeNameForMCP(client.name),
      isMcpServerLoggableInAnalytics(client.name, client.config),
    ),
  });
  if (discoverySource === "live") logFeatureOk("mcp_list_tools");
  if (isStdioConfig(client.config) && isClaudeInChromeMCPServer(client.name))
    logChromeToolsAdded(filtered.length, discoverySource);
  if (isToolboxServer(client)) {
    let { addTaskFileSaves } = await import("./chunk-h33h7b0z.js");
    addTaskFileSaves(filtered, {
      client,
      listed: ft,
      compose: (listed, call, overrides, effectiveMaxPermission) =>
        buildMcpTool({
          ...vt,
          accountMemoryServer: Ot,
          effectiveMaxPermission,
          listed,
          call,
          overrides,
        }),
    });
  }
  return filtered;
}
//@ chunk-8t8n4kdh.js:154333-154603 layout
async function awaitToolsListAhead(e, n) {
  let r = await n.page.then(
    (result) => ({
      result,
    }),
    () => {
      return;
    },
  );
  if (r === undefined) return n;
  let s = typeof r.result === "object" && r.result !== null ? officeBridgeListingState(r.result) : undefined;
  noteListChangedAhead(e, s === "live" ? "used" : s === "stub" ? "dropped_stub" : "dropped_unmarked");
  return s === "live" ? n : undefined;
}
//@ chunk-8t8n4kdh.js:154603-156653 layout
/**
 * fetchToolsForClient：按 name+config 记忆化的 tools/list（modern 协议走 listTools 聚合，legacy 翻页），结果交给 buildMcpToolsForClient；401/403 时标记 needs-auth。
 */
var fetchToolsForClient = memoizeWithLRU(
  async (client, storageV5, r) => {
    if (client.type !== "connected") return [];
    let s = identityEpoch();
    let h = beginDroppedToolsRound(client);
    try {
      if (!client.capabilities?.tools) {
        let ie = [];
        recordRawToolsForResult(ie, []);
        return ie;
      }
      let now = Date.now();
      let S = clientOf(client.client);
      let w = hasNoTransport(S) ? undefined : takeAheadPage_2(S);
      let P;
      let M = (page) =>
        listAllPages_2(
          S,
          client.name,
          client.config,
          "tools/list",
          ListToolsResultSchema,
          (ge) => ge.tools,
          page,
          (ge) => noteFirstPageMark(S, ge),
        );
      let j = await reportFirstToolsList(
        S,
        S.getProtocolEra?.() === "modern"
          ? listToolsModern(S, client.name, client.config)
          : w === undefined
            ? M(undefined)
            : awaitToolsListAhead(S, w).then((ie) => {
                P = ie;
                return M(ie?.page);
              }),
        () => P?.sentAtMs,
      );
      client.toolsListError = undefined;
      client.discoveryAuthFailure = undefined;
      let listedTools = j;
      if (r === true) {
        let ie = [];
        recordRawToolsForResult(ie, listedTools);
        return ie;
      }
      let ce = listToolsWithMemo(client, listedTools, s, h, () => ({
        normalizeEnabled: shouldNormalizeRootCombinators(client.config),
        apiValidateEnabled: shouldDropInvalidToolSchemas(client.config),
      }));
      if (ce?.reuse !== undefined) {
        recordRawToolsForResult(ce.reuse, listedTools);
        return ce.reuse;
      }
      let mcpToolsForClient = await buildMcpToolsForClient(client, listedTools, now, "live", h);
      if (h.seq === h.state.started) {
        client.toolsListError = undefined;
        client.discoveryAuthFailure = undefined;
      }
      recordRawToolsForResult(mcpToolsForClient, listedTools);
      settleToolListingMemo(client, ce, mcpToolsForClient, h);
      return mcpToolsForClient;
    } catch (error) {
      let S = redactMcpErrorDetail(client.name, client.config, describeConnectError(error, client.config));
      if (client.config.type === "claudeai-proxy" && isListAuthError(error)) {
        logEvent("tengu_mcp_server_needs_auth", {
          transportType: lit("claudeai-proxy"),
          cause: lit("discovery_tools_list"),
          ...mcpBaseUrlAnalytics_2(client.config, client.name),
        });
        if (isCurrentIdentityEpoch(s))
          setMcpAuthCacheEntry(client.name, client.config.id, undefined, storageV5);
        logFeatureSad("mcp_list_tools", "mcp_list_tools_needs_auth");
        logMCPDebug(client.name, "tools/list 401/403 on claude.ai proxy \u2014 flagging needs-auth");
        client.discoveryAuthFailure = true;
        getConnectionCache().toolLists.delete(serverCacheKey(client.name, client.config));
        return [];
      }
      if (isListAuthError(error) && hasLapsedCcrSignIn(client.name, client.config))
        client.discoveryAuthFailure = true;
      let w = client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error);
      let P = w
        ? "mcp_list_tools_claudeai_bearer_rejected"
        : (error instanceof ProtocolError || error instanceof SdkError) && !(error instanceof SdkHttpError)
          ? `mcp_list_tools_${LIST_FAILURE_REASONS[error.code] ?? "mcperr_other"}`
          : S.includes("timed out")
            ? "mcp_list_tools_timeout"
            : "mcp_list_tools_failed";
      logFeatureSad("mcp_list_tools", P);
      (w ? logMCPDebug : logMCPError)(client.name, `Failed to fetch tools: ${S}`);
      client.toolsListError = S;
      if (w) client.discoveryBearerRejected = true;
      let j = [];
      getCliOwnedState().toolsListErrorByResult.set(j, S);
      if (!w) {
        let R = mcpBaseUrlAnalytics_2(client.config, client.name);
        logEvent("tengu_mcp_degraded", {
          reason: lit("tools_list_failed"),
          transportType: fromEnum(client.config.type ?? "stdio"),
          ...R,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
            normalizeNameForMCP(client.name),
            isMcpServerLoggableInAnalytics(client.name, client.config),
          ),
        });
      }
      getConnectionCache().toolLists.delete(serverCacheKey(client.name, client.config));
      return j;
    }
  },
  (e) => serverCacheKey(e.name, e.config),
  () => getConnectionCache().toolLists,
);
//@ chunk-8t8n4kdh.js:156653-157236 layout
/**
 * reportListFailure：列表请求失败的指标分类（needs_auth、bearer_rejected、MCP 错误码、timeout、failed）与 tengu_mcp_degraded 遥测。
 */
function reportListFailure(client, error, metricName, s, degradedReason, listKind) {
  let S = describeConnectError(error, client.config);
  let w = client.config.type === "claudeai-proxy" && isListAuthError(error);
  let P = client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error);
  if (P) client.discoveryBearerRejected = true;
  let M = w
    ? `${metricName}_needs_auth`
    : P
      ? `${metricName}_claudeai_bearer_rejected`
      : (error instanceof ProtocolError || error instanceof SdkError) && !(error instanceof SdkHttpError)
        ? `${metricName}_${LIST_FAILURE_REASONS[error.code] ?? "mcperr_other"}`
        : S.includes("timed out")
          ? `${metricName}_timeout`
          : `${metricName}_failed`;
  s(M);
  (w || P ? logMCPDebug : logMCPError)(client.name, `Failed to fetch ${listKind}: ${S}`);
  if (!w && !P)
    logEvent("tengu_mcp_degraded", {
      reason: degradedReason,
      transportType: fromEnum(client.config.type ?? "stdio"),
      ...mcpBaseUrlAnalytics_2(client.config, client.name),
      mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
        normalizeNameForMCP(client.name),
        isMcpServerLoggableInAnalytics(client.name, client.config),
      ),
    });
}
//@ chunk-8t8n4kdh.js:157236-158475 fingerprint = fetchResourcesForClient (0.347)
/**
 * fetchResourcesForClient / fetchResourceTemplatesForClient：记忆化 resources/list 与 resources/templates/list，MethodNotFound 视为空。
 */
var fetchResourcesForClient = memoizeWithLRU(
  async (client) => {
    if (client.type !== "connected") return [];
    try {
      if (!client.capabilities?.resources) {
        let s = [];
        recordRawResourcesForResult(s, []);
        return s;
      }
      let n = await listAllPages_2(
        clientOf(client.client),
        client.name,
        client.config,
        "resources/list",
        ListResourcesResultSchema,
        (s) => s.resources,
      );
      logFeatureOk("mcp_list_resources");
      let mapped = n.map((s) => ({
        ...s,
        server: client.name,
      }));
      recordRawResourcesForResult(mapped, n);
      return mapped;
    } catch (error) {
      reportListFailure(
        client,
        error,
        "mcp_list_resources",
        (s) => logFeatureSad("mcp_list_resources", s),
        lit("resources_list_failed"),
        "resources",
      );
      getConnectionCache().resourceLists.delete(serverCacheKey(client.name, client.config));
      let r = [];
      if (error instanceof ProtocolError && error.code === ProtocolErrorCode.MethodNotFound)
        recordRawResourcesForResult(r, []);
      else getCliOwnedState().discoveryFetchErrors.set(r, toError(error));
      return r;
    }
  },
  (e) => serverCacheKey(e.name, e.config),
  () => getConnectionCache().resourceLists,
);
var fetchResourceTemplatesForClient = memoizeWithLRU(
  async (e) => {
    if (e.type !== "connected") return [];
    try {
      if (!e.capabilities?.resources) return [];
      let n = await listAllPages_2(
        clientOf(e.client),
        e.name,
        e.config,
        "resources/templates/list",
        ListResourceTemplatesResultSchema,
        (r) => r.resourceTemplates,
      );
      logEvent("tengu_mcp_resource_templates_fetched", {
        template_count: n.length,
      });
      logFeatureOk("mcp_list_resource_templates");
      return n.map((r) => ({
        ...r,
        server: e.name,
      }));
    } catch (error) {
      getConnectionCache().resourceTemplateLists.delete(serverCacheKey(e.name, e.config));
      logMCPDebug(e.name, `Failed to fetch resource templates: ${describeConnectError(error, e.config)}`);
      let r = [];
      if (!(error instanceof ProtocolError && error.code === ProtocolErrorCode.MethodNotFound))
        getCliOwnedState().discoveryFetchErrors.set(r, toError(error));
      return r;
    }
  },
  (e) => serverCacheKey(e.name, e.config),
  () => getConnectionCache().resourceTemplateLists,
);
//@ chunk-8t8n4kdh.js:158475-158646 layout
/**
 * fetchResourceTemplatesForClients：对尚无模板记录的已连接客户端并发拉资源模板。
 */
function fetchResourceTemplatesForClients(e, n) {
  let r = [];
  for (let s of e) {
    if (s.type !== "connected") continue;
    if (s.name in n) continue;
    r.push(
      fetchResourceTemplatesForClient(s).then((templates) => ({
        client: s,
        templates,
      })),
    );
  }
  return Promise.all(r);
}
//@ chunk-8t8n4kdh.js:158646-159096 layout
/**
 * completeResourceTemplateArgument：调用 completion/complete（ref/resource）补全资源模板参数。
 */
async function completeResourceTemplateArgument(client, uri, argumentName, argumentValue, contextArguments) {
  if (!client.capabilities?.completions) return [];
  try {
    let y = await clientOf(client.client).complete({
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
    return y.completion.values;
  } catch (error) {
    logFeatureBad("mcp_complete_resource_template", "mcp_complete_resource_template_failed");
    logMCPDebug(
      client.name,
      `Failed to complete resource template: ${describeConnectError(error, client.config)}`,
    );
    return [];
  }
}
//@ chunk-8t8n4kdh.js:159096-159657 layout
/**
 * fetchCommandsForClient：记忆化 prompts/list 并转成斜杠命令。
 */
var fetchCommandsForClient = memoizeWithLRU(
  async (client) => {
    if (client.type !== "connected") return [];
    try {
      if (!client.capabilities?.prompts) {
        let s = [];
        recordRawCommandsForResult(s, []);
        return s;
      }
      let prompts = await listAllPages_2(
        clientOf(client.client),
        client.name,
        client.config,
        "prompts/list",
        ListPromptsResultSchema,
        (s) => s.prompts,
      );
      logFeatureOk("mcp_list_prompts");
      let mcpPromptCommands = buildMcpPromptCommands(client, prompts);
      recordRawCommandsForResult(mcpPromptCommands, prompts);
      return mcpPromptCommands;
    } catch (error) {
      reportListFailure(
        client,
        error,
        "mcp_list_prompts",
        (s) => logFeatureSad("mcp_list_prompts", s),
        lit("prompts_list_failed"),
        "commands",
      );
      getConnectionCache().commandLists.delete(serverCacheKey(client.name, client.config));
      let r = [];
      if (error instanceof ProtocolError && error.code === ProtocolErrorCode.MethodNotFound)
        recordRawCommandsForResult(r, []);
      else getCliOwnedState().discoveryFetchErrors.set(r, toError(error));
      return r;
    }
  },
  (e) => serverCacheKey(e.name, e.config),
  () => getConnectionCache().commandLists,
);
//@ chunk-8t8n4kdh.js:159657-161446 fingerprint = fetchCommandsForClient (0.539)
/**
 * buildMcpPromptCommands：MCP 提示词转为 prompt 命令 mcp__<server>__<prompt>（显示为 server:prompt (MCP)），执行时按空格切参数、检查必填、getPrompt 并转换内容。
 */
function buildMcpPromptCommands(client, prompts) {
  let streamingListingSanitizer = createStreamingListingSanitizer();
  let flattened = prompts.flatMap((prompt) => streamingListingSanitizer(prompt) ?? []);
  let h = prompts.length - flattened.length;
  if (h > 0) logMCPError(client.name, listingTruncatedNote("prompts", h, prompts.length));
  let config = client.config;
  let S = (config.type === "http" || config.type === "sse") && isDesignMcpUrl(config.url);
  let promptsToProcess = officialPluginPromptOverrides(client.config);
  let commands = flattened.map((prompt) => {
    let values = Object.values(prompt.arguments ?? {});
    let argNames = values.map((k) => k.name);
    let ce = promptsToProcess?.prompts?.[prompt.name] ?? prompt.description;
    return {
      type: "prompt",
      name: "mcp__" + normalizeNameForMCP(client.name) + "__" + prompt.name,
      description: ce ?? "",
      hasUserSpecifiedDescription: !!ce,
      contentLength: 0,
      isEnabled: () => true,
      isHidden: false,
      isMcp: true,
      mcpInfo: getMcpInfoFromConnection(client),
      progressMessage: "running",
      userFacingName() {
        return S ? prompt.name : `${client.name}:${prompt.name} (MCP)`;
      },
      aliases: S ? [`${client.name}:${prompt.name}`, `${client.name}:${prompt.name} (MCP)`] : undefined,
      argNames,
      source: "mcp",
      async getPromptForCommand(args, context) {
        let trimmed = args.trim();
        let Ie = trimmed ? trimmed.split(/\s+/) : [];
        let G = hostedDesktopRefusal_2(client);
        if (G) throw G;
        try {
          let mapped = values.filter((Ae, yt) => Ae.required && Ie[yt] === undefined).map((Ae) => Ae.name);
          if (mapped.length > 0)
            throw Error(
              `Missing required ${plural(mapped.length, "argument")}: ${mapped.join(", ")}. Usage: /mcp__${normalizeNameForMCP(client.name)}__${prompt.name} ${argNames.join(" ")}`,
            );
          let connectedClient = await ensureConnectedClient(client, {
            signal: context.abortController.signal,
            context: "MCP prompt command",
          });
          let result = await clientOf(connectedClient.client).getPrompt({
            name: prompt.name,
            arguments: zipOperationFields(argNames, Ie),
          });
          let imageBuffer = imageLimitsForModel(context.options.mainLoopModel);
          let transformed = await Promise.all(
            result.messages.map((message) =>
              transformResultContent(message.content, connectedClient.name, imageBuffer, context.storageV5),
            ),
          );
          logFeatureOk("mcp_get_prompt");
          recordToolUsed(buildMcpToolName(client.name, prompt.name));
          return transformed.flat();
        } catch (error) {
          if (!isAbortError(error))
            if (client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error)) {
              logFeatureSad("mcp_get_prompt", "mcp_get_prompt_claudeai_bearer_rejected");
              logMCPDebug(
                client.name,
                `Error running command '${prompt.name}': ${describeConnectError(error, client.config)}`,
              );
            } else {
              logFeatureBad("mcp_get_prompt", "mcp_get_prompt_failed");
              logMCPError(
                client.name,
                `Error running command '${prompt.name}': ${describeConnectError(error, client.config)}`,
              );
            }
          throw error;
        }
      },
    };
  });
  return checkCommandListable(commands, (M) =>
    logMCPDebug(
      client.name,
      `Prompt '${M.name}' not listed: the server name ${RESERVED_SKILL_NAMESPACE_REASON}. Rename the server in your MCP configuration to list its prompts.`,
    ),
  );
}
//@ chunk-8t8n4kdh.js:161446-161608 layout
/**
 * callIdeTool：直接调用 IDE MCP 工具并返回 content。
 */
async function callIdeTool(toolName, args, client) {
  return (
    await callMCPTool({
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
//@ chunk-8t8n4kdh.js:161608-161866 layout
/**
 * identityChangedReconnectResult：账号身份在重连过程中变化时的 failed 结果（errorCode IDENTITY_CHANGED）。
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
//@ chunk-8t8n4kdh.js:161866-162003 layout
/**
 * reconnectMcpServer：必要时先清 OAuth 发现状态，再调用 reconnectMcpServerImpl。
 */
async function reconnectMcpServer(name, config, storageV5, credentials) {
  if (!isDiscoveryCacheUsable()) return reconnectMcpServerImpl_2(name, config, storageV5, credentials);
  let h = identityEpoch();
  await flushDiscoveryCache(clearDiscoveryForServer(name, config));
  if (isRemoteMcpTransport(config) && identityEpoch() !== h)
    return identityChangedReconnectResult(name, config);
  return reconnectMcpServerImpl_2(name, config, storageV5, credentials);
}
//@ chunk-8t8n4kdh.js:162003-163934 fingerprint = reconnectMcpServerImpl (0.346)
/**
 * reconnectMcpServerImpl：清缓存后重新 connectToServer 并拉取工具/命令/资源；needs-auth 时清缓存再试一次；身份变化返回 IDENTITY_CHANGED。
 */
async function reconnectMcpServerImpl_2(name, config, storageV5, credentials, options = {}) {
  let y = identityEpoch();
  let S = isRemoteMcpTransport(config);
  let w = () => S && identityEpoch() !== y;
  let P = () => identityChangedReconnectResult(name, config);
  try {
    clearKeychainCache();
    let M = options.keepConnectionInUse ? {} : undefined;
    await (M === undefined ? clearServerCache(name, config) : clearServerCache(name, config, M));
    if (w()) return P();
    let j = connectToServer(name, config, undefined, storageV5, credentials);
    let R = await j;
    if (R.type === "needs-auth") {
      logMCPDebug(name, "Reconnect returned 'needs-auth'; retrying once after cache clear");
      if (w()) return P();
      let nt = serverCacheKey(name, config);
      if (getConnectionCache().connections.get(nt) === j) getConnectionCache().connections.delete(nt);
      R = await connectToServer(name, config, undefined, storageV5, credentials);
    }
    if (w()) {
      if (R.type === "connected") await detachAndCloseConnection(R);
      return P();
    }
    if (R.type !== "connected") {
      logFeatureSad("mcp_reconnect", "mcp_reconnect_not_connected");
      return applyMcpServerConfig(config, {
        client: R,
        tools: [],
        commands: [],
      });
    }
    if (config.type !== "claudeai-proxy") clearMcpAuthCacheEntry(name, storageV5);
    if (config.type === "http" || config.type === "sse") await clearMcpOAuthStubIfTokenless_2(name, config);
    clearDiscoveryPathMemo(name);
    let grantLeg;
    if (isDiscoveryCacheOn()) grantLeg = await cacheGrantLeg(name, config);
    if (w()) {
      await detachAndCloseConnection(R);
      return P();
    }
    let supportsResources = !!R.capabilities?.resources;
    let [tools, mcpCommands, mcpSkills, resources] = await Promise.all([
      fetchToolsForClient(R, storageV5),
      fetchCommandsForClient(R),
      Promise.resolve([]),
      supportsResources ? fetchResourcesForClient(R) : Promise.resolve([]),
    ]);
    if (w()) {
      await detachAndCloseConnection(R);
      return P();
    }
    if (R.discoveryAuthFailure) {
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
    if (config.type === "claudeai-proxy" && !R.discoveryBearerRejected)
      clearMcpAuthCacheEntry(name, storageV5);
    if (config.type === "claudeai-proxy" && !R.toolsListError && !R.discoveryBearerRejected)
      recordClaudeAiMcpConnected(name, storageV5);
    persistLiveListing(R, {
      tools,
      commands: mcpCommands,
      resources,
      identityEpoch: y,
      grantLeg,
    });
    let commands = [...mcpCommands, ...mcpSkills];
    let resourceTools = [];
    if (supportsResources) {
      if (
        ![ListMcpResourcesTool, ReadMcpResourceTool].some((tool) =>
          tools.some((t) => toolMatchesName(t, tool.name)),
        )
      )
        resourceTools.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
    }
    if (R.discoveryBearerRejected) logFeatureSad("mcp_reconnect", "mcp_reconnect_bearer_rejected");
    else if (R.toolsListError) logFeatureSad("mcp_reconnect", "mcp_reconnect_tools_list_failed");
    else logFeatureOk("mcp_reconnect");
    return applyMcpServerConfig(config, {
      client: R,
      tools: [...tools, ...resourceTools],
      commands,
      resources: resources.length > 0 ? resources : undefined,
      resourceTemplates: [],
      ...(M?.connection !== undefined &&
        R === M.connection && {
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
//@ chunk-8t8n4kdh.js:163934-163989 layout = processBatched (1)
async function processBatched_2(items, concurrency, processor) {
  await pMap(items, processor, {
    concurrency,
  });
}
//@ chunk-8t8n4kdh.js:163989-164254 layout
/**
 * countUnsettledByDeadline：等待一组 promise 到期限，返回仍未完成的个数。
 */
async function countUnsettledByDeadline(e, n) {
  if (e.length === 0) return 0;
  let r;
  let promise = new Promise((resolve) => {
    r = setTimeout((y) => y("deadline"), n, resolve);
  });
  try {
    let results = await Promise.all(
      e.map((y) =>
        Promise.race([
          y.then(
            () => "settled",
            () => "settled",
          ),
          promise,
        ]),
      ),
    );
    return count(results, (y) => y === "deadline");
  } finally {
    clearTimeout(r);
  }
}
//@ chunk-8t8n4kdh.js:164254-171714 fingerprint = getMcpToolsCommandsAndResources (0.46)
/**
 * getMcpToolsCommandsAndResources：批量连接所有服务器（本地按 MCP_SERVER_CONNECTION_BATCH_SIZE 默认 3、远程按 MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE 默认 20 并发），逐个检查禁用、策略、needs-auth 缓存、插件失败缓存与发现缓存（fresh/stale 直接出结果，stale 后台刷新），再连接并拉取工具/命令/资源，结果通过回调逐个上报。
 */
async function getMcpToolsCommandsAndResources_2(
  onConnectionAttempt,
  mcpConfigs,
  storageV5,
  s,
  preloadedTools,
  y,
  S,
  w,
) {
  let P = identityEpoch();
  let M = (q) => identityEpoch() !== P && isRemoteMcpTransport(q);
  let emitResult = (q) => {
    if (!M(q.client.config))
      onConnectionAttempt({
        ...q,
        attemptEpoch: P,
      });
  };
  primeClientResolvers();
  let R = false;
  let allConfigEntries = Object.entries(mcpConfigs ?? (await getAllMcpConfigs()).servers);
  let enabledEntries = [];
  for (let entry of allConfigEntries)
    if (isMcpServerDisabled(entry[0]))
      emitResult({
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
  let stdioCount = count(enabledEntries, ([q, H]) => H.type === "stdio");
  let sseCount = count(enabledEntries, ([q, H]) => H.type === "sse");
  let httpCount = count(enabledEntries, ([q, H]) => H.type === "http");
  let sseIdeCount = count(enabledEntries, ([q, H]) => H.type === "sse-ide");
  let wsIdeCount = count(enabledEntries, ([q, H]) => H.type === "ws-ide");
  let localServers = enabledEntries.filter(([q, config]) => isLocalMcpServer(config));
  let remoteServers = enabledEntries.filter(([q, config]) => !isLocalMcpServer(config));
  let serverStats = {
    totalServers,
    stdioCount,
    sseCount,
    httpCount,
    sseIdeCount,
    wsIdeCount,
  };
  let Ae = [];
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
        (await isMcpAuthCached(serverName, config, storageV5))
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
      let Xe = await hasLiveConnection(serverName, config);
      let Ee =
        preloadedTools !== undefined && Object.hasOwn(preloadedTools, serverName)
          ? preloadedTools[serverName]
          : undefined;
      if (Ee !== undefined && !Xe) {
        let { client, tools } = await buildCachedClientTools({
          name: serverName,
          config,
          capabilities: {
            tools: {},
          },
          serverInfo: undefined,
          savedAt: Date.now(),
          tools: Ee,
        });
        emitResult({
          client,
          tools,
          commands: [],
        });
        return;
      }
      let Tt = Xe
        ? {
            kind: "miss",
            reason: "live-connection",
          }
        : await readDiscoveryCache(serverName, config);
      let Qe = applyCapabilityServeTimeMiss(Tt);
      if (Qe.kind === "fresh" || Qe.kind === "stale") {
        let { entry, ageMs } = Qe;
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
        let mapped_2 = (entry.templates ?? []).map((De) => ({
          ...De,
          server: serverName,
        }));
        let Te = !!entry.capabilities.resources || mapped.length > 0;
        let Ve = [];
        if (Te && !R) {
          R = true;
          Ve.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
        }
        logEvent("tengu_mcp_discovery_source", {
          source: lit(Qe.kind === "fresh" ? "cache_fresh" : "cache_stale"),
          transportType: fromEnum(config.type ?? "stdio"),
          entryAgeMs: ageMs,
          ...mcpBaseUrlAnalytics_2(config, serverName),
        });
        logFeatureOk("mcp_discovery_cache");
        getConnectionCache().settledCachedDialFailures.delete(serverCacheKey(serverName, config));
        getConnectionCache().refusedCachedRows.delete(serverCacheKey(serverName, config));
        emitResult({
          client,
          tools: [...tools, ...Ve],
          commands,
          resources: mapped.length > 0 ? mapped : undefined,
          resourceTemplates: mapped_2.length > 0 ? mapped_2 : undefined,
        });
        if (Qe.kind === "stale")
          (async () => {
            let grantLeg = await cacheGrantLeg(serverName, config);
            let Le;
            let re = async () => {
              if ((Le !== undefined && isSupersededDial(Le)) || identityEpoch() !== P) return;
              logFeatureSad("mcp_discovery_cache", "strike");
              await recordRefreshFailureStrike(serverName, config, {
                identityEpoch: P,
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
            let ot = (be) => {
              if (!(!(Le !== undefined && isSupersededDial(Le)) && identityEpoch() === P)) return;
              if (be.type !== "needs-auth")
                getConnectionCache().connections.delete(serverCacheKey(serverName, config));
              let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
              if (cachedFirstDialArmsRan.has(be)) return;
              cachedFirstDialArmsRan.add(be);
              if (be.type === "needs-auth") emitCachedAdopt(serverName, config);
              else if (be.type === "failed") recordCachedDialFailure(be, false);
            };
            let it = (be) => {
              let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
              if (cachedFirstDialArmsRan.has(be)) return;
              cachedFirstDialArmsRan.add(be);
              emitCachedAdopt(serverName, config);
            };
            let ye = false;
            try {
              Le = connectToServer(serverName, config, serverStats, storageV5, s);
              getCliOwnedState().swrRefreshDialsInFlight.add(Le);
              Le.then(
                () => {
                  ye = true;
                },
                () => {
                  ye = true;
                },
              );
              let connection = await boundDial(Le, {
                serverName,
                context: "MCP discovery-cache stale refresh",
              });
              if (connection.type !== "connected") {
                ot(connection);
                await re();
                return;
              }
              if (isSupersededDial(Le) || identityEpoch() !== P) return;
              if (
                entry.negotiatedEra !== undefined &&
                connection.protocolEra !== undefined &&
                connection.protocolEra !== entry.negotiatedEra
              ) {
                logMCPDebug(
                  serverName,
                  "Discovery cache entry dropped: server negotiated a different protocol era on revalidation",
                );
                await clearDiscoveryForServer(serverName, config).catch(() => {});
                if (!isSupersededDial(Le) && identityEpoch() === P) it(connection);
                return;
              }
              let ct = !!connection.capabilities?.resources;
              clearDiscoveryPathMemo(serverName);
              let grantLeg = await cacheGrantLeg(serverName, config);
              if (isSupersededDial(Le) || identityEpoch() !== P) return;
              let [toolsForClient, commandsForClient, resourcesForClient, mt] = await Promise.all([
                fetchToolsForClient(connection, storageV5),
                fetchCommandsForClient(connection),
                fetchResourcesForClient(connection),
                ct && isCacheableServer(config)
                  ? fetchResourceTemplatesForClient(connection)
                  : Promise.resolve([]),
              ]);
              let templates = getDiscoveryFetchError(mt) === undefined ? mt : undefined;
              if (
                isSupersededDial(Le) ||
                isSupersededCacheEntry(Le, serverName, config) ||
                identityEpoch() !== P
              )
                return;
              if (!isMcpServerDisabled(serverName) && !isMcpServerBlockedAtConnectTime(serverName, config)) {
                if (
                  !(await persistRawDiscoveryIfComplete(connection, {
                    tools: toolsForClient,
                    commands: commandsForClient,
                    resources: resourcesForClient,
                    templates,
                    identityEpoch: P,
                    grantLeg,
                  }))
                )
                  await re();
              }
              if (
                !(Le !== undefined && isSupersededDial(Le)) &&
                !(Le !== undefined && isSupersededCacheEntry(Le, serverName, config)) &&
                identityEpoch() === P
              )
                it(connection);
            } catch {
              if (Le !== undefined && !ye) {
                let be = Le;
                be.then(
                  (ct) => {
                    if (ct.type !== "connected") {
                      ot(ct);
                      re().catch(() => {});
                    } else {
                      getCliOwnedState().swrRefreshDialsInFlight.delete(be);
                      (entry.negotiatedEra !== undefined &&
                      ct.protocolEra !== undefined &&
                      ct.protocolEra !== entry.negotiatedEra
                        ? clearDiscoveryForServer(serverName, config).catch(() => {})
                        : Promise.resolve()
                      ).then(() => {
                        if (!isSupersededDial(be) && identityEpoch() === P) it(ct);
                      });
                    }
                  },
                  () => {
                    re().catch(() => {});
                  },
                );
              } else await re();
            } finally {
              if (Le !== undefined && ye) getCliOwnedState().swrRefreshDialsInFlight.delete(Le);
              await discoveryRefreshLock().catch(() => {});
            }
          })();
        return;
      }
      let Be = connectToServer(serverName, config, serverStats, storageV5, s, undefined, w);
      let connection = await Be;
      let wt = connectToServer.cache?.get?.(serverCacheKey(serverName, config)) === Be;
      if (isDiscoveryCacheOn() && isDiscoveryCacheMissRecoverable(Qe))
        logEvent("tengu_mcp_discovery_source", {
          source: lit(discoverySourceLabel(Qe)),
          transportType: fromEnum(config.type ?? "stdio"),
          ...mcpBaseUrlAnalytics_2(config, serverName),
        });
      if (isSupersededDial(Be)) return;
      if (M(config)) {
        if (connection.type === "connected" && isSupersededCacheEntry(Be, serverName, config))
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
      if (config.type !== "claudeai-proxy") clearMcpAuthCacheEntry(serverName, storageV5);
      if (config.type === "http" || config.type === "sse")
        await clearMcpOAuthStubIfTokenless_2(serverName, config);
      Ae.push(
        (async () => {
          let Se = false;
          try {
            let supportsResources = !!connection.capabilities?.resources;
            clearDiscoveryPathMemo(serverName);
            let grantLeg = await cacheGrantLeg(serverName, config);
            if (isDiscoveryCacheOn() && (isSupersededDial(Be) || M(config))) {
              if (!isSupersededDial(Be) && isSupersededCacheEntry(Be, serverName, config))
                detachAndCloseConnection(connection);
              return;
            }
            let results = Promise.all([
              fetchToolsForClient(connection, storageV5, S),
              fetchCommandsForClient(connection),
              Promise.resolve([]),
            ]);
            let Ot =
              y === true &&
              (config.type === "claudeai-proxy"
                ? !!connection.capabilities?.tools || !!connection.capabilities?.prompts
                : config.type === "http" &&
                  isSameOriginAsCcr(config.url) &&
                  !isDiscoveryCacheEligible(config));
            let results_2 = Promise.all([
              supportsResources && !Ot ? fetchResourcesForClient(connection) : Promise.resolve([]),
              supportsResources && isCacheableServer(connection.config)
                ? fetchResourceTemplatesForClient(connection)
                : Promise.resolve([]),
            ]);
            let me =
              y === true &&
              supportsResources &&
              (config.type === "http" || config.type === "sse") &&
              !isDiscoveryCacheOn();
            if (me) results_2.catch(() => {});
            let [[Te, Ve, De], Le] = await Promise.all([results, me ? undefined : results_2]);
            if (M(config)) {
              if (isSupersededCacheEntry(Be, serverName, config)) detachAndCloseConnection(connection);
              return;
            }
            if (isDiscoveryCacheOn() && isSupersededDial(Be)) return;
            if (isDiscoveryCacheOn() && wt && isSupersededCacheEntry(Be, serverName, config)) {
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
              clearMcpAuthCacheEntry(serverName, storageV5);
            if (
              config.type === "claudeai-proxy" &&
              !connection.toolsListError &&
              !connection.discoveryBearerRejected
            )
              recordClaudeAiMcpConnected(serverName, storageV5);
            let commands = [...Ve, ...De];
            let ue = ($t) => {
              let Vt = [];
              if (supportsResources && !R) {
                R = true;
                Vt.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
              }
              emitResult(
                applyMcpServerConfig(config, {
                  client: connection,
                  tools: [...Te, ...Vt],
                  commands,
                  resources: $t.length > 0 ? $t : undefined,
                  resourceTemplates: undefined,
                }),
              );
            };
            if (me) {
              ue([]);
              Se = true;
            }
            let [ot, it] = Le ?? (await results_2);
            if (!supportsResources) recordRawResourcesForResult(ot, []);
            let templates = getDiscoveryFetchError(it) === undefined ? it : undefined;
            let ct =
              !isDiscoveryCacheOn() ||
              isSupersededDial(Be) ||
              isSupersededCacheEntry(Be, serverName, config) ||
              identityEpoch() !== P ||
              isMcpServerDisabled(serverName) ||
              isMcpServerBlockedAtConnectTime(serverName, config)
                ? undefined
                : persistRawDiscoveryIfComplete(connection, {
                    tools: Te,
                    commands: Ve,
                    resources: ot,
                    templates,
                    identityEpoch: P,
                    grantLeg,
                  });
            if (!me) ue(ot);
            await ct;
          } catch (error) {
            logMCPError(
              serverName,
              `Error fetching tools/commands/resources: ${describeConnectError(error, config)}`,
            );
            if (Se) return;
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
    processBatched_2(localServers, getMcpServerConnectionBatchSize(), connectOne),
    processBatched_2(remoteServers, getRemoteMcpServerConnectionBatchSize(), connectOne),
  ]);
  await Promise.all(Ae);
}
//@ chunk-8t8n4kdh.js:171714-172380 fingerprint = prefetchAllMcpResources (1)
/**
 * prefetchAllMcpResources：非交互模式下一次性连接全部服务器并收集 clients/tools/commands。
 */
function prefetchAllMcpResources(mcpConfigs, storageV5, r) {
  return new Promise((resolve) => {
    let pendingCount = 0;
    let y = 0;
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
    let M = false;
    let j = () => {
      if (M) return;
      M = true;
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
    getMcpToolsCommandsAndResources_2(
      (error) => {
        clients.push(error.client);
        tools.push(...error.tools);
        commands.push(...error.commands);
        y++;
        if (y >= pendingCount) j();
      },
      mcpConfigs,
      storageV5,
      r,
    )
      .then(j)
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
//@ chunk-8t8n4kdh.js:172380-173380 fingerprint = transformResultContent (0.81)
/**
 * transformResultContent：把 MCP 内容块转成 API 内容：text、image（压缩/尺寸限制）、audio、resource（文本或 blob 落盘）、resource_link。
 */
async function transformResultContent(resultContent, serverName, imageBuffer, s, h = false) {
  switch (resultContent.type) {
    case "text": {
      let y = {
        type: "text",
        text: resultContent.text,
      };
      if (h) {
        let _meta = resultContent._meta;
        if (_meta) y._meta = _meta;
      }
      return [y];
    }
    case "audio": {
      let audioData = resultContent;
      return await persistBlobToTextBlock_2(
        Buffer.from(audioData.data, "base64"),
        audioData.mimeType,
        serverName,
        `[Audio from ${serverName}] `,
        s,
      );
    }
    case "image": {
      if (normalizeImageMimeType(resultContent.mimeType))
        return await contentContainsImages(
          Buffer.from(String(resultContent.data), "base64"),
          resultContent.mimeType,
          serverName,
          imageBuffer,
          s,
        );
      return await persistBlobToTextBlock_2(
        Buffer.from(String(resultContent.data), "base64"),
        resultContent.mimeType,
        serverName,
        `[Image from ${serverName}] `,
        s,
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
          let imageBuffer_2 = await contentContainsImages(
            Buffer.from(resource.blob, "base64"),
            resource.mimeType,
            serverName,
            imageBuffer,
            s,
          );
          let content = [];
          if (prefix)
            content.push({
              type: "text",
              text: prefix,
            });
          content.push(...imageBuffer_2);
          return content;
        } else {
          let imageBuffer = Buffer.from(resource.blob, "base64");
          let storedMcpContent = toStoredMcpContent(imageBuffer, resource.mimeType, serverName);
          if (storedMcpContent) return [storedMcpContent];
          return await persistBlobToTextBlock_2(imageBuffer, resource.mimeType, serverName, prefix, s);
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
//@ chunk-8t8n4kdh.js:173380-173476 layout
/**
 * 生成二进制内容落盘的随机文件名。
 */
function blobFileName(e) {
  return `mcp-${normalizeNameForMCP(e)}-blob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
//@ chunk-8t8n4kdh.js:173476-174068 file-local
async function contentContainsImages(e, mimeType, serverName, limits, h) {
  if (toolResultStoreOrNull() === undefined && addToHistory_2()) {
    logFeatureSad("mcp_image_result_file", "persistence_off");
    let { block } = await maybeResizeAndDownsampleImageBlock({
      data: e,
      mediaType: mimeType,
      limits,
    });
    return [block];
  }
  let [{ block: y, dimensions: S }, w] = await Promise.all([
    maybeResizeAndDownsampleImageBlock({
      data: e,
      mediaType: mimeType,
      limits,
    }),
    persistBinaryContent(e, Ph(e) ?? mimeType, blobFileName(serverName), undefined, h).catch((block) => {
      logError(block);
      return {
        error: "not saved",
      };
    }),
  ]);
  if ("error" in w) {
    logFeatureSad("mcp_image_result_file", "not_saved");
    return [y];
  }
  logFeatureOk("mcp_image_result_file");
  let M = (y.type === "image" ? null : await toolResultStoreOrNull()?.readPicture?.(w.filepath, e)) ?? {
    block: y,
    dimensions: S,
  };
  let imageMetadataText = createImageMetadataText(M.dimensions ?? {}, w.filepath);
  return imageMetadataText === null
    ? [M.block]
    : [
        M.block,
        {
          type: "text",
          text: imageMetadataText,
        },
      ];
}
//@ chunk-8t8n4kdh.js:174129-174452 fingerprint = persistBlobToTextBlock (0.744)
/**
 * persistBlobToTextBlock：二进制资源落盘后返回说明文本块。
 */
async function persistBlobToTextBlock_2(bytes, mimeType, serverName, sourceDescription, h) {
  let result = await persistBinaryContent(bytes, mimeType, blobFileName(serverName), undefined, h);
  if ("error" in result) {
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
        text: `${sourceDescription}Binary content (${mimeType || "unknown type"}, ${bytes.length} bytes) could not be saved to disk: ${result.error}`,
      },
    ];
  }
  return [
    {
      type: "text",
      text: getBinaryBlobSavedMessage(result.filepath, mimeType, result.size, sourceDescription),
    },
  ];
}
//@ chunk-8t8n4kdh.js:174452-174771 fingerprint = inferCompactSchema (1)
/**
 * inferCompactSchema：从 JSON 值推断紧凑的结构描述（深度 2），用于大结果说明。
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
//@ chunk-8t8n4kdh.js:174771-174915 layout
async function transformContentArray(e, serverName, imageBuffer, s) {
  let h = (
    await Promise.all(e.map((y) => transformResultContent(y, serverName, imageBuffer, s, true)))
  ).flat();
  return {
    content: h,
    type: "contentArray",
    schema: inferCompactSchema(stripTextBlockMeta(h)),
  };
}
//@ chunk-8t8n4kdh.js:174915-175928 fingerprint = transformMCPResult (0.902)
/**
 * transformMCPResult：把 callTool 结果分为 toolResult / structuredContent / contentArray 三类并转换内容。
 */
async function transformMCPResult(e, tool, name, imageBuffer, h) {
  if (e && typeof e === "object") {
    if ("toolResult" in e)
      return {
        content: String(e.toolResult),
        type: "toolResult",
      };
    if ("structuredContent" in e && e.structuredContent !== undefined) {
      if ("content" in e && Array.isArray(e.content)) {
        let M = await contentOverStructuredResult(e.content, (j) =>
          transformContentArray(j, name, imageBuffer, h),
        );
        if (M !== undefined) return M;
      }
      let S = base64URLEncode(e.structuredContent);
      let w = S ?? jsonStringify(e.structuredContent);
      let schema = S === undefined ? inferCompactSchema(e.structuredContent) : undefined;
      if ("content" in e && Array.isArray(e.content)) {
        let filtered = e.content.filter(
          (j) => j && typeof j === "object" && "type" in j && j.type !== "text",
        );
        if (filtered.length > 0) {
          let transformedContent = (
            await Promise.all(
              filtered.map((item) => transformResultContent(item, name, imageBuffer, h, true)),
            )
          ).flat();
          if (transformedContent.length > 0) {
            let R = [
              ...transformedContent,
              {
                type: "text",
                text: w,
              },
            ];
            return {
              content: R,
              type: "contentArray",
              schema: inferCompactSchema(stripTextBlockMeta(R)),
            };
          }
        }
      }
      return {
        content: w,
        type: "structuredContent",
        schema,
      };
    }
    if ("content" in e && Array.isArray(e.content))
      return transformContentArray(e.content, name, imageBuffer, h);
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
//@ chunk-8t8n4kdh.js:175928-176037 layout = isMedia (1)
function isMedia(block) {
  if (!block || typeof block === "string") return false;
  return block.some((n) => n.type === "image" || n.type === "document");
}
//@ chunk-8t8n4kdh.js:176037-178083 fingerprint = processMCPResult (0.755)
/**
 * processMCPResult：处理工具结果：超过 MCP 输出上限时（ENABLE_MCP_LARGE_OUTPUT_FILES 未关闭且不含图片）把全文写入 tool-results 文件并返回 getLargeOutputInstructions 说明，否则截断；记录 tengu_mcp_large_result_handled。
 */
async function processMCPResult(
  e,
  tool,
  name,
  imageLimits,
  hasResultSizeAnnotation,
  storageV5,
  credentials,
  resultNotForModel,
) {
  if (
    resultNotForModel &&
    e !== null &&
    typeof e === "object" &&
    !("toolResult" in e) &&
    "content" in e &&
    Array.isArray(e.content)
  )
    return e.content;
  let P = await transformMCPResult(e, tool, name, imageLimits, storageV5);
  let { type, schema } = P;
  let R = dropExtraDocumentBlocks(P.content);
  if (name === "ide") return R;
  if (resultNotForModel || (hasResultSizeAnnotation && !isMedia(R))) return R;
  if (!(await mcpContentNeedsTruncation(R, credentials))) return R;
  let sizeEstimateTokens = getContentSizeEstimate(R);
  if (env.ENABLE_MCP_LARGE_OUTPUT_FILES === false) {
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("env_disabled"),
      sizeEstimateTokens,
    });
    return await truncateMcpContentIfNeeded(R, credentials);
  }
  if (!R) return R;
  if (isMedia(R)) {
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("contains_images"),
      sizeEstimateTokens,
    });
    return await truncateMcpContentIfNeeded(R, credentials);
  }
  let timestamp = Date.now();
  let persistId = `mcp-${normalizeNameForMCP(name)}-${normalizeNameForMCP(tool)}-${timestamp}`;
  let ge = stripTextBlockMeta(R);
  let Ie =
    useSubagentTruncationPrompt() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_singleton_unwrap", true);
  let blockCount = Array.isArray(ge) ? ge.length : undefined;
  let text =
    Ie &&
    Array.isArray(ge) &&
    ge.length === 1 &&
    ge[0]?.type === "text" &&
    !("annotations" in ge[0]) &&
    !("_meta" in ge[0])
      ? ge[0].text
      : undefined;
  let ke = typeof ge === "string" ? ge : (text ?? jsonStringify(ge, null, 2));
  let nt = type === "toolResult" || text !== undefined;
  let ee = nt ? "text" : "json";
  let lineStats;
  if (nt) {
    let lines = ke.split(`
`);
    if (lines.length > 1 && lines.at(-1) === "") lines.pop();
    let H = 0;
    for (let line of lines) if (line.length > H) H = line.length;
    lineStats = {
      count: lines.length,
      maxLen: H,
    };
  }
  let Ae = await persistToolResult(ke, persistId, toolResultsDir(), storageV5);
  if (isPersistError(Ae)) {
    if (toolResultStoreOrNull() !== undefined) {
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("not_stored"),
        sizeEstimateTokens,
      });
      return await truncateMcpContent(R);
    }
    let contentLength = ke.length;
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("persist_failed"),
      sizeEstimateTokens,
    });
    return `Error: result (${contentLength.toLocaleString()} characters) exceeds maximum allowed tokens. Failed to save output to file: ${Ae.error}. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data.`;
  }
  logEvent("tengu_mcp_large_result_handled", {
    outcome: lit("persisted"),
    reason: lit("file_saved"),
    sizeEstimateTokens,
    persistedSizeChars: Ae.originalSize,
    truncatedAtCap: Ae.truncatedAtBytes !== undefined,
    resultType: fromEnum(type),
    blockCount,
    persistedAs: fromEnum(ee),
  });
  let formatDescription =
    text !== undefined ? getFormatDescription("toolResult") : getFormatDescription(type, schema);
  return getLargeOutputInstructions(
    Ae.filepath,
    Ae.originalSize,
    formatDescription,
    undefined,
    lineStats,
    Ae.truncatedAtBytes,
  );
}
//@ chunk-8t8n4kdh.js:178083-178255 layout
/**
 * 从 -32042（URL elicitation required）错误的 data.elicitations 中取出通过 schema 校验的 elicitation 列表，格式不对返回空数组。
 */
function parseUrlElicitationRequiredError(error) {
  let n = error.data;
  return (
    n != null && typeof n === "object" && "elicitations" in n && Array.isArray(n.elicitations)
      ? n.elicitations
      : []
  ).filter((s) => ElicitRequestURLParamsSchema.safeParse(s).success);
}
//@ chunk-8t8n4kdh.js:178255-178526 layout
/**
 * 把工具调用失败归类为认证问题：401、Unauthorized、OAuth 形状错误、带 headersHelper 的 403、或有待定 step-up scope 的 403 才算；有 step-up scope 且不是真 401 时返回 step_up，否则 credential_rejected，不是认证问题返回 undefined。
 */
function classifyToolCallAuthError({
  errorCode,
  message,
  isUnauthorizedError,
  isOAuthShapedAuthError,
  hasHeadersHelper,
  pendingStepUpScope,
}) {
  let S = pendingStepUpScope !== undefined;
  if (!(
    errorCode === 401 ||
    isUnauthorizedError ||
    isOAuthShapedAuthError ||
    (errorCode === 403 && hasHeadersHelper) ||
    (S && errorCode === 403)
  ))
    return;
  return S && errorCode !== 401 && !(isOAuthShapedAuthError && /^HTTP 401\b/.test(message))
    ? "step_up"
    : "credential_rejected";
}
//@ chunk-8t8n4kdh.js:178526-178751 layout
function isNeedsApprovalOrExpiredSession(error) {
  if (isRefusedByCcrProxy(error)) return true;
  if (!(error instanceof Error) || !("code" in error)) return false;
  if (error.code === CCR_NEEDS_APPROVAL_CODE) {
    let n = "data" in error ? error.data : undefined;
    return typeof n === "object" && n !== null && "args_sha256" in n;
  }
  return error.code === -32000 && isApprovalMismatchMessage(error.message);
}
//@ chunk-8t8n4kdh.js:178751-183698 layout
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
  let isRetryableNeedsApproval = (H) =>
    H.code === CCR_NEEDS_APPROVAL_CODE &&
    typeof H.data === "object" &&
    H.data !== null &&
    "args_sha256" in H.data &&
    !!ccrNeedsApprovalRetry &&
    !!toolUseId &&
    !retriedApproval &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_proxy_needs_approval_retry", true);
  using q = trackCallInProgress(client.transportErrorState);
  for (let idx = 0; ; idx++)
    try {
      let Xe = () =>
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
      let Ee;
      if (!isPerfettoTracingEnabled()) Ee = await Xe();
      else {
        let Tt;
        try {
          Tt = truncateContentForTelemetry(jsonStringify(args)).content;
        } catch {
          Tt = undefined;
        }
        let Qe = isMemoryServerConnection(client, tool);
        let Be = fileReferenceToolForRecords(client, tool);
        let xe = Qe || withholdsFileReferenceArguments(Be, toolUseId);
        let wt = withholdsFileReferenceErrorText(Be, toolUseId);
        if (xe && Tt !== undefined) Tt = notRecordedLength(Tt);
        Ee = await withToolExecutionSpan(
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
            ...(Tt !== undefined && {
              contentAttrs: {
                mcp_args: Tt,
              },
            }),
            withholdErrorText: (Se) =>
              wt || (Qe && Se instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS),
            isExpectedError: (Se) =>
              Se instanceof ProtocolError &&
              (Se.code === ProtocolErrorCode.UrlElicitationRequired || isRetryableNeedsApproval(Se)),
          },
          Xe,
        );
      }
      if (retriedApproval) logFeatureOk("mcp_ccr_needs_approval");
      return Ee;
    } catch (error) {
      if (!(error instanceof ProtocolError)) {
        if (retriedApproval && !(error instanceof McpSessionExpiredError))
          logFeatureBad("mcp_ccr_needs_approval", "retry_failed");
        throw error;
      }
      if (isRetryableNeedsApproval(error) && ccrNeedsApprovalRetry && toolUseId) {
        retriedApproval = true;
        let Qe = error.data;
        let toolName =
          typeof Qe === "object" && Qe !== null && "tool_name" in Qe && typeof Qe.tool_name === "string"
            ? Qe.tool_name
            : undefined;
        let {
          canUseTool,
          tool: tool_2,
          fullyQualifiedName,
          toolUseContext,
          parentMessage,
        } = ccrNeedsApprovalRetry;
        let ft = chromeSiteFromError(client, error.data);
        let Ot = ft && chromeSiteDenyCheck(ft, getToolPermissionContext(toolUseContext));
        if (Ot) {
          let De = ft?.kind === "unreadable";
          logMCPDebug(
            client.name,
            `Tool '${tool}' returned -32003 needs_approval ${De ? "naming a site this session cannot read, and the session has ClaudeInChromeDomain deny rules" : "for a site a ClaudeInChromeDomain deny rule covers"}: failing the call with no approval card`,
          );
          if (De) logFeatureBad("chrome_permission_prompt", "hosted_site_unreadable");
          else logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
          await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, Ot);
          toolUseContext.onPermissionDenial?.(tool_2, toolUseId, args);
          throw markRefusedByCcrProxy(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              Ot.message,
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
        let vt = {
          behavior: "ask",
          suppressAlwaysAllowRule: true,
          message: `The ${fullyQualifiedName} connector requires approval for this call.`,
          decisionReason: {
            type: "other",
            reason: "This connector call requires your approval to proceed.",
          },
        };
        let me = ft && chromeSiteAsk(ft, tool, args, toolUseContext);
        let Te = me ?? vt;
        let Ve;
        try {
          Ve = await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, Te);
        } finally {
          onAwaitingUserInput?.(false);
        }
        if (signal.aborted) throw markRefusedByCcrProxy(new AbortError());
        if (Ve.behavior === "allow") {
          if (Ve.updatedInput !== undefined && !En(Ve.updatedInput, args)) {
            logFeatureSad("mcp_ccr_needs_approval", "edited_input");
            throw markRefusedByCcrProxy(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `The approval for ${fullyQualifiedName} was conditioned on edited arguments, which can't be applied on this retroactive card. To run with different arguments, deny and re-issue the call.`,
                "ccr_proxy_needs_approval_edited_input",
              ),
            );
          }
          let De = runDiscarder(toolUseContext.session, toolUseId);
          if (De !== undefined)
            throw markRefusedByCcrProxy(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                De,
                "ccr_proxy_needs_approval_resend_refused",
              ),
            );
          if (ft?.kind === "named" && me && meta) meta[CLAUDECODE_CHROMESITE] = ft.site;
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
        if (Ve === Te) {
          logFeatureSad("mcp_ccr_needs_approval", "no_prompt_surface");
          throw markRefusedByCcrProxy(error);
        }
        logFeatureOk("mcp_ccr_needs_approval");
        throw markRefusedByCcrProxy(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            Ve.message || `Approval denied for ${fullyQualifiedName}`,
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
      let urlElicitationRequiredError = parseUrlElicitationRequiredError(error);
      let serverName = clientConnection.name;
      if (urlElicitationRequiredError.length === 0) {
        logMCPDebug(serverName, `Tool '${tool}' returned -32042 but no valid elicitations in error data`);
        throw error;
      }
      logMCPDebug(
        serverName,
        `Tool '${tool}' requires URL elicitation (error -32042, attempt ${idx + 1}), processing ${urlElicitationRequiredError.length} elicitation(s)`,
      );
      for (let Qe of urlElicitationRequiredError) {
        let { elicitationId } = Qe;
        let xe = await runElicitationHooks_2(serverName, Qe, signal);
        if (xe) {
          logMCPDebug(serverName, `URL elicitation ${elicitationId} resolved by hook: ${jsonStringify(xe)}`);
          if (xe.action !== "accept")
            return {
              content: `URL elicitation was ${xe.action === "decline" ? "declined" : xe.action + "ed"} by a hook. The tool "${tool}" could not complete because it requires the user to open a URL.`,
              urlElicitationDeclined: {
                url: Qe.url,
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
                  params: Qe,
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
        let Se = await runElicitationResultHooks_2(serverName, result, signal, "url", elicitationId);
        if (Se.action !== "accept") {
          logMCPDebug(
            serverName,
            `User ${Se.action === "decline" ? "declined" : Se.action + "ed"} URL elicitation ${elicitationId}`,
          );
          return {
            content: `URL elicitation was ${Se.action === "decline" ? "declined" : Se.action + "ed"} by the user. The tool "${tool}" could not complete because it requires the user to open a URL.`,
            urlElicitationDeclined: {
              url: Qe.url,
            },
            isError: true,
          };
        }
        logMCPDebug(serverName, `Elicitation ${elicitationId} completed, retrying tool call`);
      }
    }
}
//@ chunk-8t8n4kdh.js:183698-184226 layout
function toolErrorResultText(e, serverName, redactErrorForLog) {
  if (!e.isError) return;
  let s = "Unknown error";
  if (Array.isArray(e.content) && e.content.length > 0) {
    let flattened = e.content.flatMap((S) => {
      if (S == null || typeof S !== "object") return [];
      if ("text" in S) return [String(S.text)];
      if (S.type === "resource_link") {
        let w = S;
        let P = `[Resource link: ${w.name}] ${w.uri}`;
        if (w.description) P += ` (${w.description})`;
        return [P];
      }
      return [];
    });
    if (flattened.length > 0)
      s = flattened.join(`
`);
  } else if ("error" in e) s = String(e.error);
  logMCPError(serverName, redactErrorForLog === undefined ? s : redactErrorForLog(s));
  let h = stripAnthropicMeta(e._meta);
  throw new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    s,
    "MCP tool returned error",
    h
      ? {
          _meta: h,
        }
      : undefined,
  );
}
//@ chunk-8t8n4kdh.js:184226-184403 layout
/**
 * 构造 SEP-2663（MCP Tasks）所需的 schema 绑定对象：implementation、serverCapabilities、tool、prompt、resource、resourceTemplate 与 contentBlock 的 zod schema，交给 SDK 的任务支持使用。（v2）
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
//@ chunk-8t8n4kdh.js:184403-184494 layout
/**
 * 绕过缓存执行 tools/list。
 */
function listToolsBypassCache(e, n) {
  return clientOf(e).request(
    {
      method: "tools/list",
    },
    ListToolsResultSchema,
    {
      ...n,
      cacheMode: "bypass",
    },
  );
}
//@ chunk-8t8n4kdh.js:184494-184574 layout
/**
 * 绕过缓存读取资源。
 */
function readResourceBypassCache(e, uri, r) {
  return clientOf(e).readResource(
    {
      uri,
    },
    {
      ...r,
      cacheMode: "bypass",
    },
  );
}
//@ chunk-8t8n4kdh.js:184574-184707 layout
/**
 * 调用工具 `tools/call` 的底层封装：协议时代为 modern 时在 `_meta` 里附上客户端任务能力声明，legacy 原样调用。（v2）
 */
function invokeToolRaw(e, n, r) {
  let s = clientOf(e);
  let h =
    s.getProtocolEra?.() === "modern"
      ? {
          ...n,
          _meta: {
            ...n._meta,
            [CLIENT_CAPABILITIES_META_KEY]: stripTasksCapability(clientCapabilitiesWithElicitation()),
          },
        }
      : n;
  return s.callTool(h, r);
}
//@ chunk-8t8n4kdh.js:184707-184738 layout
/**
 * 任务请求的附加选项（allowTask）。
 */
var TASK_REQUEST_TIMEOUT_MS = 60000;
var TASK_REQUEST_OPTIONS = {
  allowTask: true,
};
//@ chunk-8t8n4kdh.js:184738-184900 layout
function withDeclaredClientTasks(e, n) {
  let r = getCliOwnedState().clientTasksDeclaredBeforeServerList.get(e);
  let _meta = n._meta;
  return r === undefined || e.getProtocolEra?.() !== "modern"
    ? n
    : {
        ...n,
        _meta: {
          ..._meta,
          [CLIENT_CAPABILITIES_META_KEY]: r,
        },
      };
}
//@ chunk-8t8n4kdh.js:184900-184992 layout
/**
 * 任务 id schema（1–1024 字符、无控制字符）。
 */
var taskResultSchema = DoctorLazy(() =>
  looseObject({
    resultType: literal("task"),
  }),
);
var taskIdSchema = DoctorLazy(() =>
  string()
    .min(1)
    .max(1024)
    .regex(/^\P{Cc}+$/u),
);
//@ chunk-8t8n4kdh.js:184992-185307 layout
/**
 * 为 MCP 任务（Tasks）构造请求通道：request 发任意方法（带签名头与超时），resolveInputRequest 把任务中途的输入请求（elicitation 等）交给对话框处理。（v2）
 */
function createSep2663TaskBinding(e, { taskId, requestDialog }) {
  let s = clientOf(e.client);
  return {
    request: (method, S, w) =>
      s.request(
        {
          method,
          params: withDeclaredClientTasks(s, S),
        },
        ResultSchema,
        {
          ...TASK_REQUEST_OPTIONS,
          signal: w.signal,
          headers: w.headers,
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
        connected: e,
        signal,
        requestDialog,
        transportErrorState: undefined,
      }),
  };
}
//@ chunk-8t8n4kdh.js:185307-185360 layout
/**
 * 任务中途输入请求的 schema。
 */
var taskInputRequestSchema = DoctorLazy(() =>
  union([
    ElicitRequestParamsSchema,
    ElicitRequestURLParamsSchema.omit({
      elicitationId: true,
    }),
  ]),
);
//@ chunk-8t8n4kdh.js:185360-186410 layout
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
  let w = connected.name;
  switch (inputRequest.method) {
    case "elicitation/create": {
      let P = taskInputRequestSchema().safeParse(inputRequest.params);
      if (!P.success) {
        logMCPDebug(
          w,
          `Task ${task.taskId}: input request '${key}' carries invalid elicitation params: ${P.error.message}`,
        );
        return;
      }
      if (P.data.mode === "url" && clientCapabilitiesWithElicitation().elicitation?.url === undefined) {
        logMCPDebug(
          w,
          `Task ${task.taskId}: input request '${key}' asks for URL elicitation, which is switched off (tengu_mcp_url_elicitation); the task will be cancelled`,
        );
        return;
      }
      if (requestDialog && !getIsNonInteractiveSession())
        return handleElicitationRequest_2({
          connected,
          params: P.data,
          signal,
          requestDialog,
          transportErrorState,
        });
      logMCPDebug(
        w,
        `Task ${task.taskId}: cannot show input request '${key}' (${requestDialog ? "this session is non-interactive" : "no dialog was passed to this call"}); the task will be cancelled`,
      );
      throw new mcpTaskDriveModule.TaskInputUnservableError(
        `task ${task.taskId} input request '${key}' cannot be surfaced in this session`,
      );
    }
    case "roots/list":
      return getMcpRoots(isDocumentsPluginServer(connected.config));
    default:
      logMCPDebug(
        w,
        `Task ${task.taskId}: input request '${key}' has unsupported method ${inputRequest.method}`,
      );
      return;
  }
}
//@ chunk-8t8n4kdh.js:186410-202078 layout
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
  let q = fileReferenceToolForRecords(client, tool);
  let withheldFileRef = withholdsFileReferenceErrorText(q, toolUseId) ? q : undefined;
  let redactErrorForLog = isMemoryServerConnection(client, tool)
    ? describeRedactedMcpError
    : withheldFileRef !== undefined
      ? (me) => withheldFileReferenceErrorForLog(withheldFileRef, me)
      : undefined;
  let now = Date.now();
  let startEpoch = identityEpoch();
  let Qe = sdkClient.transport?.sessionId === undefined;
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
    let me = idleTimeoutMs ?? getMcpToolIdleTimeoutMs(config);
    let lastActivityAt = now;
    let rejectIdle;
    let promise = new Promise((resolve, reject) => {
      rejectIdle = reject;
    });
    watchdog.requestSent = (Me) => {
      requestStates.set(String(Me), "sent");
      ranNothing = false;
    };
    watchdog.requestTaken = (Me) => {
      if (requestStates.has(String(Me))) requestStates.set(String(Me), "taken");
    };
    watchdog.requestAnswered = (Me) => {
      requestStates.delete(String(Me));
    };
    watchdog.requestNotRun = (Me) => {
      requestStates.delete(String(Me));
      ranNothing = hasToolUseId;
    };
    let Le = (Me) =>
      requestStates.has(String(Me)) && transportErrorState?.activeCallWatchdogs.has(watchdog) === true;
    watchdog.answerStreamEnded = (Me) => {
      if (!Le(Me)) return;
      clearTimeout(answerStreamTimer);
      answerStreamTimer = setTimeout(() => {
        if (!Le(Me)) return;
        logMCPDebug(serverName, `Tool '${tool}' aborting: its answer stream ended with no answer`);
        rejectIdle(
          Object.assign(
            hasToolUseId
              ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  describeUnansweredCall(serverName, tool),
                  "MCP answer stream ended mid-call",
                  MCP_ANSWER_STREAM_ENDED,
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
        let Ye = sentRequests.size > 0;
        rejectIdle(
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              Ye
                ? describeUnansweredCall(serverName, tool)
                : `MCP server "${serverName}" transport dropped mid-call; response for tool "${tool}" was lost`,
              "MCP transport lost mid-call",
              Ye ? MCP_CALL_UNANSWERED : undefined,
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
      if (me > 0 && Date.now() - lastActivityAt > me) {
        let floored = Math.floor((Date.now() - lastActivityAt) / 1000);
        logMCPDebug(
          serverName,
          `Tool '${tool}' aborting: no response or progress notification for ${floored}s (idle timeout ${Math.floor(me / 1000)}s)`,
        );
        let _t = `MCP server "${serverName}" tool "${tool}" sent no response or progress for ${floored}s; aborting. If this server is configured in your MCP settings, set a per-server "timeout" (ms) to allow longer silent runs for just this server; otherwise set CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT (ms) globally (0 disables).`;
        let Mt = sentRequests.size > 0;
        rejectIdle(
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              Mt ? `${_t} ${CALL_OUTCOME_UNKNOWN_NOTICE}` : _t,
              "MCP tool idle timeout",
              Mt ? MCP_CALL_UNANSWERED : undefined,
            ),
            {
              mcpErrorSource: "downstream_unreachable",
            },
          ),
        );
      }
    }, 30000);
    let callTimeoutMs = getMcpToolTimeoutMs(config);
    let callTimeoutTimer;
    let ot;
    let promise_2 = new Promise((resolve, reject) => {
      ot = reject;
    });
    let ye = (callTimeoutMs, callTimeoutMs_2) => {
      clearTimeout(callTimeoutTimer);
      callTimeoutTimer = setTimeout(
        (_t, Mt, at, pt, jt, Lt) => {
          let We = `MCP server "${Mt}" tool "${at}" timed out after ${Math.floor(pt / 1000)}s`;
          let Bt = jt.size > 0;
          let Kt = (Lt.openQuestions ?? 0) > 0;
          let zt = [...(Kt ? [QUESTION_UNANSWERED_TEXT] : []), ...(Bt ? [CALL_OUTCOME_UNKNOWN_NOTICE] : [])];
          _t(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                zt.length > 0 ? `${We}. ${zt.join(" ")}` : We,
                "MCP tool timeout",
                Bt ? MCP_CALL_UNANSWERED : Kt ? MCP_QUESTION_UNANSWERED : undefined,
              ),
              {
                mcpErrorSource: "downstream_unreachable",
              },
            ),
          );
        },
        callTimeoutMs,
        ot,
        serverName,
        tool,
        callTimeoutMs_2,
        sentRequests,
        watchdog,
      );
    };
    ye(callTimeoutMs, callTimeoutMs);
    let be = shouldPauseForQuestions(config, callTimeoutMs);
    if (be)
      installQuestionPause(watchdog, {
        inFlight: transportErrorState?.activeCallWatchdogs,
        timeoutMs: callTimeoutMs,
        armTimeout: ye,
        timedOut: promise_2,
      });
    let ct = () => {
      if (callTimeoutTimer) clearTimeout(callTimeoutTimer);
      clearTimeout(answerStreamTimer);
      if (progressTimer !== undefined) {
        clearInterval(progressTimer);
        progressTimer = undefined;
      }
      transportErrorState?.activeCallWatchdogs.delete(watchdog);
    };
    let $t =
      disallowTasks === true ||
      isSingleShotPrintSession() ||
      (getIsNonInteractiveSession() && taskBackground === undefined);
    let Vt = (status, progressMessage, progress) => {
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
    let Fe = async () => {
      let Me = isMcpTasksEnabled();
      let Ye = Me && !$t && !shouldRestrictRemoteHost(config);
      if (Me && !$t && !Ye)
        logMCPDebug(
          serverName,
          "Tasks are off for this server: the tengu_gleaming_creek server list shuts it out, so its tool calls run without Tasks",
        );
      let _t = sdkClient.getProtocolEra?.() === "modern";
      let Mt = Ye && _t;
      let at = Mt ? TASK_REQUEST_OPTIONS : {};
      let pt = getCliOwnedState().clientTasksDeclaredBeforeServerList.get(sdkClient);
      let jt =
        !Ye && _t
          ? {
              ...meta,
              [CLIENT_CAPABILITIES_META_KEY]: stripTasksCapability(pt ?? clientCapabilitiesWithElicitation()),
            }
          : meta;
      let Lt = await sdkClient.callTool(
        {
          name: tool,
          arguments: args,
          _meta:
            watchdog.mark === undefined
              ? jt
              : {
                  ...jt,
                  [CLAUDECODE_CALLMARK]: watchdog.mark,
                },
        },
        {
          ...at,
          signal: be ? AbortSignal.any([signal, abortController.signal]) : signal,
          timeout: be ? MAX_TIMER_DELAY_MS : callTimeoutMs,
          onprogress: (We) => {
            watchdog.armedAt = 0;
            lastActivityAt = Date.now();
            mcpAutoBackgroundModule?.reportBackgroundProgress(signal, We);
            if (onProgress)
              onProgress({
                type: "mcp_progress",
                status: "progress",
                serverName,
                toolName: tool,
                progress: We.progress,
                total: We.total,
                progressMessage: We.message,
              });
          },
        },
      );
      if (Mt) {
        let We = (taskId) => {
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
        let Bt = mcpTaskDriveModule.CreateTaskResultSchema().safeParse(Lt);
        if (Bt.success) {
          if (abortController.signal.aborted) {
            We(Bt.data.taskId);
            return Lt;
          }
          if (taskBackground && taskRegistry) {
            L = mt(Bt.data, taskBackground, taskRegistry);
            return Lt;
          }
          return et(Bt.data);
        }
        let Kt = taskResultSchema().safeParse(Lt);
        if (Kt.success) {
          logMCPDebug(
            serverName,
            `Tool '${tool}' returned a malformed task handle: ${Bt.error.message.slice(0, 200)}`,
          );
          let Ct = taskIdSchema().safeParse(Kt.data.taskId);
          if (Ct.success) We(Ct.data);
          return {
            content: [
              {
                type: "text",
                text: `MCP server "${serverName}" returned a malformed task handle for tool "${tool}", so Claude Code cannot track the task or get its result. ${Ct.success ? "It tried to cancel the task, but the" : "The"} server may still be running it. Calling the tool again may start another task.`,
              },
            ],
            isError: true,
            _meta: undefined,
            structuredContent: undefined,
          };
        }
        let agentTaskMeta = mcpTaskDriveModule.parseAgentTaskMeta(Lt._meta);
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
      return Lt;
    };
    let L;
    let mt = (Me, taskBackground, taskRegistry) => {
      let transportFingerprint = mcpTasksModule.mcpTransportFingerprint(client.config);
      let at = mcpTasksModule.registerOrAdoptSep2663Task({
        taskRegistry,
        task: Me,
        serverName,
        toolName: tool,
        toolUseId,
        transportFingerprint,
        adoptRegistryId: taskBackground.share.registryId,
        storageV5: taskBackground.storageV5,
      });
      let { registryId, driveAbort, ttlExpiresAt, killed } = at;
      taskBackground.share.becameTask = true;
      taskBackground.onBackgrounded();
      logMCPDebug(
        serverName,
        killed
          ? `Tool '${tool}' returned task ${Me.taskId} after background task ${registryId} was stopped; cancelling it`
          : `Tool '${tool}' returned task ${Me.taskId} (${Me.status}); backgrounded as ${registryId}`,
      );
      if (!at.killed && taskBackground.session !== undefined && isTaskWorkerWakeEnabled())
        workerWakesModule.mcpTaskWorkerWakeKeepers.of(taskBackground.session).taskBackgrounded({
          taskRegistry,
          record: at.sidecarRecord,
          storageV5: taskBackground.storageV5,
        });
      let Bt = (client, taskId) =>
        createSep2663TaskBinding(client, {
          taskId,
          requestDialog,
        });
      mcpTasksModule.startSep2663BackgroundDrive({
        taskRegistry,
        registryId,
        serverName,
        toolName: tool,
        mcpTaskId: Me.taskId,
        pollIntervalMs: Me.pollIntervalMs,
        ttlExpiresAt,
        driveAbort,
        initialBinding: Bt(client, Me.taskId),
        initialConfig: client.config,
        bindingFactory: Bt,
        transportFingerprint,
        storageV5: taskBackground.storageV5,
        credentials: taskBackground.credentials,
      });
      let Kt = isPlainObject(Me._meta) ? Me._meta[mcpTaskDriveModule.AGENT_TASK_META_KEY] : undefined;
      return {
        ...mcpTasksModule.buildSep2663PlaceholderResult({
          serverName,
          toolName: tool,
          registryId,
          mcpTaskId: Me.taskId,
          stopped: killed,
          modelImmediateResponse: mcpTaskDriveModule.parseAgentTaskMeta(Me._meta)?.modelImmediateResponse,
        }),
        ...(!killed &&
          Kt !== undefined && {
            _meta: {
              [mcpTaskDriveModule.AGENT_TASK_META_KEY]: Kt,
            },
          }),
      };
    };
    let et = async (Me) => {
      logMCPDebug(serverName, `Tool '${tool}' returned task ${Me.taskId} (${Me.status}); polling inline`);
      Vt(
        "progress",
        mcpTaskPersistenceModule.boundMcpStatusMessage(Me.statusMessage) ??
          `Task ${shortTaskLabel(Me.taskId)} ${Me.status}`,
        0,
      );
      let progress = 0;
      let _t = await mcpTaskDriveModule.driveMcpTask({
        errorText: (at) => describeConnectError(at, config),
        task: Me,
        signal: abortController.signal,
        log: (at) => logMCPDebug(serverName, at),
        request: (method, params, jt) =>
          sdkClient.request(
            {
              method,
              params,
            },
            ResultSchema,
            {
              ...TASK_REQUEST_OPTIONS,
              signal: jt.signal,
              headers: jt.headers,
              timeout: TASK_REQUEST_TIMEOUT_MS,
            },
          ),
        onStatus: (at) => {
          progress += 1;
          Vt(
            "progress",
            mcpTaskPersistenceModule.boundMcpStatusMessage(at.statusMessage) ??
              `Task ${shortTaskLabel(at.taskId)} ${at.status.replace("_", " ")}`,
            progress,
          );
        },
        resolveInputRequest: (key, inputRequest) =>
          resolveTaskInputRequest({
            key,
            inputRequest,
            task: Me,
            connected: client,
            signal: abortController.signal,
            requestDialog,
            transportErrorState,
          }),
      });
      if (_t.status === "completed") {
        logMCPDebug(serverName, `Task ${Me.taskId} completed`);
        return CompatibilityCallToolResultSchema.parse(_t.result);
      }
      let Mt = mcpTaskPersistenceModule.boundMcpStatusMessage(_t.error.message) ?? "";
      logMCPDebug(serverName, `Task ${Me.taskId} ended without a result: ${_t.error.kind} \u2014 ${Mt}`);
      if (signal.aborted) throw new AbortError();
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `MCP server "${serverName}" task for tool "${tool}" ${_t.error.kind === "cancelled" || _t.error.kind === "input_unservable" ? "was cancelled" : "failed"}: ${Mt}`,
        "MCP task did not complete",
      );
    };
    let abortController = new AbortController();
    let we = () => abortController.abort();
    signal.addEventListener("abort", we, {
      once: true,
    });
    let Ke = timing?.mark("external");
    let He = await Promise.race([Fe(), promise_2, promise]).finally(() => {
      signal.removeEventListener("abort", we);
      we();
      ct();
      Ke?.();
    });
    watchdog.returned?.();
    if (L) {
      noteHearthDegraded(serverName, undefined);
      return L;
    }
    toolErrorResultText(He, serverName, redactErrorForLog);
    let tt = Date.now() - now;
    let gt =
      tt < 1000
        ? `${tt}ms`
        : tt < 60000
          ? `${Math.floor(tt / 1000)}s`
          : `${Math.floor(tt / 60000)}m ${Math.floor((tt % 60000) / 1000)}s`;
    logMCPDebug(serverName, `Tool '${tool}' completed successfully in ${gt}`);
    let codeIndexingFromMcpServerName = detectCodeIndexingFromMcpServerName(serverName);
    if (codeIndexingFromMcpServerName)
      logEvent("tengu_code_indexing_tool_used", {
        tool: fromEnum(codeIndexingFromMcpServerName),
        source: lit("mcp"),
        success: true,
      });
    let content = await processMCPResult(
      He,
      tool,
      serverName,
      imageLimits,
      hasResultSizeAnnotation,
      storageV5,
      credentials,
      resultNotForModel,
    );
    noteHearthDegraded(serverName, undefined);
    return {
      content,
      _meta: He._meta,
      structuredContent: He.structuredContent,
      resourceLinks: anthropicResourceLinks(He.content),
    };
  } catch (error) {
    if (!signal.aborted) noteHearthDegraded(serverName, error);
    if (progressTimer !== undefined) clearInterval(progressTimer);
    clearTimeout(answerStreamTimer);
    transportErrorState?.activeCallWatchdogs.delete(watchdog);
    let Te = Date.now() - now;
    if (signal?.aborted !== true && error instanceof Error && error.name !== "AbortError")
      logMCPDebug(
        serverName,
        `Tool '${tool}' failed after ${Math.floor(Te / 1000)}s: ${redactErrorForLog !== undefined && error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? redactErrorForLog(error.message) : withheldFileRef !== undefined ? withheldFileReferenceErrorForLog(withheldFileRef, error.message, error.name) : describeConnectError(error, config)}`,
      );
    if (error instanceof Error) {
      let De =
        error instanceof ProtocolError
          ? undefined
          : error instanceof SdkHttpError
            ? error.status
            : "code" in error && typeof error.code === "number"
              ? error.code
              : undefined;
      let Le =
        (config.type === "http" || config.type === "sse" || config.type === "ws") && !!config.headersHelper;
      let re = hasCliOwnedBearer(config);
      let ue =
        error instanceof OAuthError
          ? error.code
          : "errorCode" in error && typeof error.errorCode === "string"
            ? error.errorCode
            : undefined;
      let isOAuthShapedAuthError =
        ue !== undefined &&
        !["invalid_grant", "invalid_client", "unauthorized_client"].includes(ue) &&
        /^HTTP 40[13]\b/.test(error.message);
      let pendingStepUpScope = getCliOwnedState().clientAuthProviders.get(
        clientOf(client_2),
      )?.pendingStepUpScope;
      let ye = classifyToolCallAuthError({
        errorCode: De,
        message: error.message,
        isUnauthorizedError: error instanceof UnauthorizedError_2,
        isOAuthShapedAuthError,
        hasHeadersHelper: Le,
        pendingStepUpScope,
      });
      let be =
        (config.type === "http" || config.type === "sse") &&
        !config.headersHelper &&
        !configHasAuthorizationHeader(config)
          ? config
          : undefined;
      let ct = !isAuthRetry && ye === "credential_rejected" && !Le && be !== undefined;
      let $t = ct && (await hasStoredRefreshToken(serverName, be));
      let Vt =
        $t ||
        (ct &&
          isSignedOutFallbackEnabled() &&
          getCliOwnedState().clientAuthProviders.get(clientOf(client_2))?.lastAuthRejection?.status === 401 &&
          getCliOwnedState().clientAuthProviders.get(clientOf(client_2))?.lastAuthRejection?.accessToken !==
            undefined);
      if ((Le || re || be !== undefined) && !isAuthRetry) {
        let Oe = serverCacheKey(serverName, config);
        if (identityEpoch() !== startEpoch)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `MCP tool call to server "${serverName}" was aborted: the account changed before re-authentication`,
            "MCP tool call aborted: account changed before reauth",
          );
        let reauthInFlight = getConnectionCache().reauthInFlight;
        let cliOwnedState = getCliOwnedState();
        let He = reauthInFlight.get(Oe);
        let promise = He !== undefined && He.epoch === startEpoch ? He.promise : undefined;
        cliOwnedState.reauthDecisionSinkForTest?.(
          promise !== undefined ? "joined" : He !== undefined ? "stale_refused" : "started",
        );
        let gt =
          promise !== undefined &&
          ((error instanceof SdkError && error.code === SdkErrorCode.ConnectionClosed) ||
            (error instanceof ProtocolError && error.code === -32000)) &&
          !isTruncatedBodyError(transportErrorState?.closeReason);
        if (
          (gt || (ye === "credential_rejected" && Le) || (ye === "credential_rejected" && re) || Vt) &&
          !isMcpServerDisabled(serverName) &&
          !isMcpServerBlockedAtConnectTime(serverName, config)
        ) {
          logMCPDebug(
            serverName,
            Le
              ? `Tool '${tool}' returned ${De ?? 401}; re-running headersHelper and retrying once`
              : re
                ? `Tool '${tool}' returned ${De ?? 401}; session credential rejected \u2014 reconnecting and retrying once`
                : gt
                  ? `Tool '${tool}' failed because a reconnect in progress closed its connection; retrying once on the new connection`
                  : `Tool '${tool}' returned ${De ?? 401}; ${$t ? "refresh token stored" : "stored sign-in rejected, no refresh token"} \u2014 reconnecting and retrying once`,
          );
          if (gt) logFeatureSad(Le ? "mcp_headers_helper" : "mcp_oauth_refresh", "collateral_rejoin");
          if (!promise) {
            logFeatureSad(
              Le ? "mcp_headers_helper" : Vt && !$t ? "mcp_signed_out_fallback" : "mcp_oauth_refresh",
              "reauth_retry",
            );
            sdkClient.onclose = undefined;
            let Me = startEpoch;
            promise = (async () => {
              await clearServerCache(serverName, config);
              return connectToServer(serverName, config, undefined, undefined, credentials);
            })();
            let Ye = {
              promise,
              epoch: Me,
            };
            reauthInFlight.set(Oe, Ye);
            promise
              .then((_t) => {
                if (_t.type === "connected" && identityEpoch() === Me)
                  REAUTH_RECONNECT_SIGNAL.emit(serverName, config);
              })
              .finally(() => {
                if (reauthInFlight.get(Oe) === Ye && !cliOwnedState.holdStaleReauthEntryForTest)
                  reauthInFlight.delete(Oe);
              })
              .catch(() => {});
          }
          let Ft = await promise;
          if (identityEpoch() !== startEpoch) {
            if (Ft.type === "connected") await detachAndCloseConnection(Ft);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP tool call to server "${serverName}" was aborted: the account changed during re-authentication`,
              "MCP tool call aborted: account changed during reauth",
            );
          }
          if (
            Ft.type === "connected" &&
            (isMcpServerDisabled(serverName) || isMcpServerBlockedAtConnectTime(serverName, config))
          )
            await clearServerCache(serverName, config);
          else if (Ft.type === "connected")
            return callMCPTool({
              client: Ft,
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
          logMCPDebug(serverName, `Auth reconnect returned '${Ft.type}'; falling through to needs-auth`);
          if (isDiscoveryCacheOn() && Ft.type !== "needs-auth") {
            let Me = connectToServer.cache?.get?.(Oe);
            if (
              Me !== undefined &&
              (await clearMcpAuthCache(Me)) === Ft &&
              connectToServer.cache?.get?.(Oe) === Me
            )
              getConnectionCache().connections.delete(Oe);
          }
        }
      }
      if (ye === "credential_rejected" && re) {
        await clearServerCache(serverName, config);
        logMCPDebug(
          serverName,
          `Tool '${tool}' rejected the session credential (${De ?? 401}); failing the call and clearing the connection for a fresh retry later`,
        );
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            AUTH_MESSAGES.sessionCredentialRejected(serverName, De ?? 401),
            "MCP server rejected the session credential",
          ),
          {
            mcpErrorSource: "other",
          },
        );
      }
      if (ye !== undefined) {
        let Oe = config.type === "claudeai-proxy" && config.eligible === false;
        let authErrorKind = Oe ? "not_connected" : ye === "step_up" ? "insufficient_scope" : "token_expired";
        logMCPDebug(
          serverName,
          authErrorKind === "insufficient_scope"
            ? `Tool call returned 403 insufficient_scope (scope: ${redactSensitiveUrlParams("scope", pendingStepUpScope ?? "")})`
            : "Tool call returned 401 Unauthorized - token may have expired",
        );
        let Ke = mcpBaseUrlAnalytics_2(config, serverName);
        let He = isMcpServerLoggableInAnalytics(serverName, config);
        logEvent("tengu_mcp_tool_call_auth_error", {
          errorCode: fromNumber(De ?? (ye === "step_up" ? 403 : 401)),
          transportType: fromEnum(config.type ?? "stdio"),
          authErrorKind: fromEnum(authErrorKind),
          ...Ke,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(normalizeNameForMCP(serverName), He),
          mcpToolName: loggableMcpToolName(normalizeNameForMCP(serverName), normalizeNameForMCP(tool), He),
        });
        let tt = (config.type === "http" || config.type === "sse") && configHasAuthorizationHeader(config);
        throw new McpAuthError(
          serverName,
          Oe
            ? AUTH_MESSAGES.notConnected(serverName)
            : authErrorKind === "insufficient_scope"
              ? AUTH_MESSAGES.stepUp(serverName, pendingStepUpScope)
              : Le
                ? AUTH_MESSAGES.helperRejected(serverName)
                : tt
                  ? AUTH_MESSAGES.headerRejected(serverName)
                  : AUTH_MESSAGES.signInAgain(serverName),
          authErrorKind,
          getCliOwnedState().clientFirstPartyBearers.get(clientOf(client_2))?.last,
          authErrorKind === "insufficient_scope" ? pendingStepUpScope : undefined,
        );
      }
      let L = !(config.type === "http" && De === 404 && Qe) && isMcpSessionExpiredError(error);
      let mt =
        ((error instanceof SdkError && error.code === SdkErrorCode.ConnectionClosed) ||
          (error instanceof ProtocolError &&
            error.code === -32000 &&
            error.message.includes("Connection closed"))) &&
        (config.type === "http" || config.type === "claudeai-proxy");
      if (error instanceof HttpBodyOverflowError)
        throw new McpToolResultNotReadError(serverName, tool, {
          kind: "too_large",
          capBytes: MCP_BODY_LIMIT,
        });
      if (mt && isTruncatedBodyError(transportErrorState?.closeReason))
        throw new McpToolResultNotReadError(serverName, tool, {
          kind: "connection_closed",
        });
      let et = [...sentRequests.values()];
      if (mt && et.length > 0) {
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
        et.includes("sent") &&
        !L &&
        (De === undefined || error.name === "TimeoutError"
          ? !(
              error instanceof SdkError ||
              error instanceof ProtocolError ||
              error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
            )
          : RETRYABLE_HTTP_STATUSES.has(De))
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
      if (L || mt) {
        logMCPDebug(
          serverName,
          `MCP session expired during tool call (${L ? "stale session" : "connection closed"}), clearing connection cache for re-initialization`,
        );
        let Oe = mcpBaseUrlAnalytics_2(config, serverName);
        let we = isMcpServerLoggableInAnalytics(serverName, config);
        let mcpToolName = loggableMcpToolName(normalizeNameForMCP(serverName), normalizeNameForMCP(tool), we);
        logEvent("tengu_mcp_session_expired", {
          errorCode: De !== undefined ? fromNumber(De) : undefined,
          transportType: fromEnum(config.type ?? "stdio"),
          ...Oe,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(normalizeNameForMCP(serverName), we),
          mcpToolName,
        });
        await clearServerCache(serverName, config);
        let He = didCallRunNothing(transportErrorState?.toolCallSends, started, watchdog.ownSends);
        throw new McpSessionExpiredError(
          serverName,
          L
            ? "session_expired_404"
            : isMalformedAfterAuthChallenge(transportErrorState?.closeReason) ||
                (transportErrorState?.closeReason === "session expired" && He)
              ? "connection_closed_call_refused"
              : ranNothing || (!isAuthRetry && He)
                ? "connection_closed_call_not_run"
                : "connection_closed_http",
        );
      }
    }
    let Ve = error;
    if (
      (error instanceof SdkError && error.code === SdkErrorCode.InvalidResult) ||
      error instanceof ZodError ||
      ((Ve?.name === "ZodError" || Ve?.name === "$ZodError") && Array.isArray(Ve?.issues))
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
//@ chunk-8t8n4kdh.js:202078-202174 layout = countToolCallsSince (1)
function getFirstToolUseId(e) {
  if (e.message.content[0]?.type !== "tool_use") return;
  return e.message.content[0].id;
}
//@ chunk-8t8n4kdh.js:202174-203150 layout
/**
 * 校验 SDK 宿主提供的 MCP 清单：initializeResult 不合法或协议版本不支持时放弃清单改走控制通道握手；tools/list 结果不合法同样放弃；分页的 tools/list 只回放 initialize。
 */
function validateHostManifest(serverName, manifest) {
  if (manifest === undefined) return;
  let r = InitializeResultSchema.safeParse(manifest.initializeResult);
  if (
    !r.success ||
    !SUPPORTED_PROTOCOL_VERSIONS_2.includes(r.data.protocolVersion) ||
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
//@ chunk-8t8n4kdh.js:203150-203225 layout
/**
 * 校验对象是否是合法的 JSON-RPC 结果。
 */
function isJsonRpcResult(result) {
  return fZe.safeParse({
    jsonrpc: "2.0",
    id: 0,
    result,
  }).success;
}
//@ chunk-8t8n4kdh.js:203225-203562 layout
/**
 * 记录 SDK 宿主 MCP 清单的结果：重放成功或失败，以及协议版本不符、声明了客户端能力、结果格式不对等情况。
 */
function logManifestOutcome(manifestOutcome, n) {
  switch (manifestOutcome) {
    case "none":
    case "pending":
      return;
    case "replayed":
      if (n) logFeatureOk("mcp_sdk_manifest");
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
//@ chunk-8t8n4kdh.js:203562-205634 layout
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
      let R = new SdkControlClientTransport(
        key,
        sendControlRequest,
        validateHostManifest(key, manifests?.get(key)),
      );
      guardTransportSend(
        {
          name: key,
        },
        R,
      );
      let ce = new Client_2(
        {
          ...A_t,
          version:
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION ?? "unknown",
        },
        {
          capabilities: T_t,
          jsonSchemaValidator: isDisklessContext()
            ? NO_OP_SCHEMA_VALIDATOR
            : new LegacyDialectToleratingValidator(),
          versionNegotiation: resolveVersionNegotiation("sdk-control"),
        },
      );
      let Q = false;
      try {
        let ie = ce.connect(R, {
          timeout: getConnectionTimeoutMs(),
        });
        if (
          !(await withDeadline(
            ie.then(() => true),
            getConnectionTimeoutMs(),
          ))
        ) {
          ie.catch(() => {});
          R.close().catch(() => {});
          Q = true;
          throw makeConnectTimeoutError_2(
            `SDK MCP server "${key}" connection timed out after ${getConnectionTimeoutMs()}ms`,
          );
        }
        let serverCapabilities = ce.getServerCapabilities();
        let instructions = ce.getInstructions();
        let instructions_2 = truncateServerInstructions(instructions, key);
        let ke = {
          type: "connected",
          serverInfo: ce.getServerVersion(),
          name: key,
          capabilities: serverCapabilities || {},
          instructions: instructions_2,
          negotiatedProtocolVersion: ce.getNegotiatedProtocolVersion(),
          protocolEra: ce.getProtocolEra(),
          client: clientServerId(ce),
          config: {
            ...value,
            scope: "dynamic",
          },
          cleanup: async () => {
            await ce.close();
          },
        };
        let nt = serverCacheKey(ke.name, ke.config);
        getConnectionCache().toolLists.delete(nt);
        let ee = [];
        if (serverCapabilities?.tools) {
          let toolsForClient = await fetchToolsForClient(ke, toolContext);
          ee.push(...toolsForClient);
        }
        let commands = [];
        logFeatureOk("mcp_sdk_connect");
        logManifestOutcome(R.manifestOutcome, true);
        return {
          client: ke,
          tools: ee,
          commands,
        };
      } catch (error) {
        logFeatureBad("mcp_sdk_connect", Q ? "mcp_sdk_connect_timeout" : "mcp_sdk_connect_failed");
        logManifestOutcome(R.manifestOutcome, false);
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
  for (let M of settled)
    if (M.status === "fulfilled") {
      clients.push(M.value.client);
      tools.push(...M.value.tools);
      commands.push(...M.value.commands);
    }
  if (clients.some((client) => client.type === "connected" && !!client.capabilities?.resources)) {
    if (
      ![ListMcpResourcesTool, ReadMcpResourceTool].some((j) =>
        tools.some((tool) => toolMatchesName(tool, j.name)),
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
//@ chunk-8t8n4kdh.js:205634-205823 fingerprint = clearServerCache (0.581)
/**
 * clearServerCache：断开并清除某服务器的连接与所有记忆化列表缓存。
 */
async function clearServerCache_3(e) {
  await Promise.all(
    e.map(async (n) => {
      if (n.type !== "connected") return;
      try {
        await n.cleanup();
      } catch (error) {
        logForDebugging(`MCP client cleanup failed for ${n.name}: ${error}`, {
          level: "error",
        });
      }
    }),
  );
}
//@ chunk-z1n5m6nf.js:41559-41859 callgraph-fingerprint = isMcpSessionExpiredError (0.543)
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
//@ chunk-z1n5m6nf.js:41859-41937 layout
/**
 * 截断服务器 instructions（超过上限按描述截断规则处理，标注 `Server instructions`）；空值原样返回。（v1）
 */
function truncateServerInstructions_2(e, r, n = maxDescriptionLength()) {
  if (!e) return e;
  return truncateDescription_2(e, "Server instructions", r, n);
}
//@ chunk-z1n5m6nf.js:41937-42091 layout
function truncateDescription_2(e, r, serverName, s = maxDescriptionLength()) {
  if (e.length <= s) return e;
  if (serverName !== undefined) logMCPDebug(serverName, `${r} truncated from ${e.length} to ${s} chars`);
  return truncateToLength(e, s) + "\u2026 [truncated]";
}
//@ chunk-z1n5m6nf.js:42091-42269 layout
/**
 * 匹配 HTTP 状态错误的正则（旧客户端副本）。
 */
var TRANSIENT_NETWORK_ERROR_CODES_2 = ["ECONNRESET", "ETIMEDOUT", "EPIPE", "EHOSTUNREACH", "ECONNREFUSED"];
var TRANSIENT_ERROR_CODES_V1 = new Set([
  ...TRANSIENT_NETWORK_ERROR_CODES_2,
  "ConnectionRefused",
  "ConnectionClosed",
]);
var POST_HTTP_STATUS_RE_V1 = /^Error POSTing to endpoint \(HTTP (\d+)\)/;
//@ chunk-z1n5m6nf.js:42269-42327 layout
/**
 * 判断数值是否为合法 HTTP 状态码（旧副本）。
 */
function isValidHttpStatusV1(e) {
  return typeof e === "number" && e >= 100 && e <= 599;
}
//@ chunk-z1n5m6nf.js:42327-42781 layout
/**
 * isTransientMcpError：AbortError、瞬时网络错误码或 5xx 视为可重试。
 */
function isTransientMcpError_2(msg) {
  if (msg.name === "AbortError") return true;
  let code = "code" in msg ? msg.code : undefined;
  let status = "status" in msg ? msg.status : undefined;
  let s = POST_HTTP_STATUS_RE_V1.exec(msg.message)?.[1];
  if (
    isValidHttpStatusV1(status) ||
    isValidHttpStatusV1(code) ||
    (typeof code === "number" && code < 0) ||
    (s !== undefined && isValidHttpStatusV1(Number(s)))
  )
    return false;
  if (typeof code === "string" && TRANSIENT_ERROR_CODES_V1.has(code)) return true;
  let message = msg.message;
  return (
    TRANSIENT_NETWORK_ERROR_CODES_2.some((y) => message.includes(y)) ||
    message.includes("Body Timeout Error") ||
    /\bterminated\b/.test(message) ||
    message.includes("SSE stream disconnected") ||
    message.includes("Failed to reconnect SSE stream")
  );
}
//@ chunk-z1n5m6nf.js:42781-42816 layout
/**
 * 分页退避序列（旧副本）。
 */
var DEFAULT_TOOL_TIMEOUT_MS_V1 = 1e8;
var MAX_LIST_PAGES_V1 = 20;
var LIST_PAGE_DELAYS_MS_V1 = [250, 500, 1000];
//@ chunk-z1n5m6nf.js:42816-43219 layout
/**
 * 判断旧客户端的列表错误是否可重试。
 */
function isRetryableListErrorV1(error) {
  if (isListAuthError_2(error)) return false;
  if (isClaudeAiBearerRejectedError_2(error)) return false;
  if (error instanceof DOMException && error.name === "TimeoutError") return false;
  if (error instanceof HttpBodyOverflowError_2) return false;
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
//@ chunk-z1n5m6nf.js:43219-43929 layout
async function listAllPages(e, name, config, s, h, y) {
  let S = false;
  for (let j = 0; ; j++) {
    let M = [];
    let w = new Set();
    let R;
    let pageCount = 0;
    let Q;
    try {
      do {
        let H = await e.request(
          {
            method: s,
            ...(R && {
              params: {
                cursor: R,
              },
            }),
          },
          h,
          {
            timeout: getConnectionTimeoutMs(),
          },
        );
        pageCount++;
        let U = y(H);
        if (U) M.push(...U);
        if (R) w.add(R);
        R = H.nextCursor;
        if (R && w.has(R)) {
          Q = "repeated_cursor";
          break;
        }
        if (R && pageCount >= MAX_LIST_PAGES_V1) {
          Q = "capped";
          break;
        }
      } while (R);
      if (Q === "repeated_cursor")
        logMCPDebug(
          name,
          `${s} returned a nextCursor already sent in this walk (page ${pageCount}); stopping`,
        );
      if (Q === "capped")
        logMCPDebug(name, `${s} still returning nextCursor after ${MAX_LIST_PAGES_V1} pages; stopping`);
      if (pageCount > 1) logListPagination(s, pageCount, M.length, Q ?? "complete");
      return M;
    } catch (error) {
      if (pageCount > 0 && !S) {
        S = true;
        logListPagination(s, pageCount, M.length, "error");
      }
      let U = LIST_PAGE_DELAYS_MS_V1[j];
      if (U === undefined || !isRetryableListErrorV1(error)) throw error;
      logMCPDebug(name, `${s} failed (${describeConnectError(error, config)}); retrying in ${U}ms`);
      await sleep(U);
    }
  }
}
//@ chunk-z1n5m6nf.js:43929-44031 layout
function logListPagination(e, pageCount, itemCount, s) {
  logEvent("tengu_mcp_list_paginated", {
    method: fromEnum(e),
    pageCount,
    itemCount,
    outcome: fromEnum(s),
  });
}
//@ chunk-z1n5m6nf.js:44031-44169 layout = getMcpToolTimeoutMs (1)
/**
 * MCP 工具调用总超时（v1 副本）：配置 timeout ≥1000 优先，其次 MCP_TOOL_TIMEOUT，再默认值，夹在 1000ms 与上限之间。
 */
function getMcpToolTimeoutMs_3(e) {
  let n =
    (e?.timeout !== undefined && e.timeout >= 1000 ? e.timeout : undefined) ??
    env.MCP_TOOL_TIMEOUT ??
    DEFAULT_TOOL_TIMEOUT_MS_V1;
  return Math.min(Math.max(n, 1000), MAX_TIMER_DELAY_MS);
}
//@ chunk-z1n5m6nf.js:44169-44233 layout
var REMOTE_TOOL_IDLE_TIMEOUT_MS_2 = 300000;
var STDIO_TOOL_IDLE_TIMEOUT_MS_2 = 1800000;
var NO_IDLE_TIMEOUT_TRANSPORTS_2 = new Set(["sse-ide", "ws-ide", "sdk"]);
//@ chunk-z1n5m6nf.js:44233-44470 layout
/**
 * getMcpToolIdleTimeoutMs（v1 副本）。
 */
function getMcpToolIdleTimeoutMs_2(config) {
  let r = config?.type ?? "stdio";
  if (NO_IDLE_TIMEOUT_TRANSPORTS_2.has(r)) return 0;
  let n =
    env.CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT ??
    (r === "stdio" ? STDIO_TOOL_IDLE_TIMEOUT_MS_2 : REMOTE_TOOL_IDLE_TIMEOUT_MS_2);
  if (n <= 0) return 0;
  let timeout = config?.timeout !== undefined && config.timeout >= 1000 ? config.timeout : 0;
  return Math.min(Math.max(n, timeout, 1000), getMcpToolTimeoutMs_3(config));
}
//@ chunk-z1n5m6nf.js:44470-44512 layout
/**
 * 懒加载 needs-auth 缓存模块（旧副本）。
 */
var needsAuthCacheModuleV1 = () => require("./chunk-3k33hyyp.js");
//@ chunk-z1n5m6nf.js:44512-44678 layout
/**
 * needs-auth 缓存常量与懒加载模块（v1 副本）：TTL 15 分钟 / 4 小时 / 90 秒、时钟偏差 1 分钟。
 */
var artifactPermissionRulesModuleV1 = () => require("./chunk-p5cstt88.js");
var artifactsMcpLaptopModuleV1 = () => require("./chunk-d5fbj7hf.js");
var claudeDocsWakeModuleV1 = () => require("./chunk-t6p2wq66.js");
var AUTH_CACHE_VERSION_2 = "v1";
var NEEDS_AUTH_CACHE_TTL_MS_2 = 900000;
var NEEDS_AUTH_CACHE_LONG_TTL_MS_2 = 14400000;
var NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS_2 = 90000;
var AUTH_CACHE_CLOCK_SKEW_MS_2 = 60000;
//@ chunk-z1n5m6nf.js:44678-45203 layout
/**
 * isMcpAuthCached（v1 副本）。
 */
async function isMcpAuthCached_2(e, r, n) {
  let h = (await readNeedsAuthCache(n))[e];
  if (!h) return false;
  if (r.type === "claudeai-proxy" && h.id !== r.id) return false;
  if ((r.type === "stdio" || r.type === undefined) && r.pluginSource === undefined) return false;
  if ((r.type === "stdio" || r.type === undefined) && r.pluginSource !== undefined && h.id !== configHash(r))
    return false;
  if ((r.type === "http" || r.type === "sse") && r.pluginSource !== undefined && h.id !== undefined)
    return false;
  let y =
    r.type === "claudeai-proxy" ||
    (r.pluginSource !== undefined && (r.type === "http" || r.type === "sse") && !usesNonOAuthAuth(r));
  let S = h.ttlMs ?? (y ? NEEDS_AUTH_CACHE_LONG_TTL_MS_2 : NEEDS_AUTH_CACHE_TTL_MS_2);
  let T = Date.now() - h.timestamp;
  return T > -AUTH_CACHE_CLOCK_SKEW_MS_2 && T < S;
}
//@ chunk-z1n5m6nf.js:45203-45377 layout
async function writeAuthCacheV5_2(e, r) {
  let n = await e.write(needsAuthCacheSpace(), jsonStringify(r), {
    publishDiscipline: "inPlace",
  });
  if (!n.ok) logMCPDebug("auth-cache", `needs-auth cache v5 write failed: ${formatStorageError(n.error)}`);
  return n.ok;
}
//@ chunk-z1n5m6nf.js:45377-45687 file-local
function isMcpAuthCached_3(serverId, r, n, s) {
  let cliOwnedState = getCliOwnedState();
  cliOwnedState.authCacheWriteChain = cliOwnedState.authCacheWriteChain
    .then(async () => {
      let cache = await readNeedsAuthCache(s);
      cache[serverId] = {
        timestamp: Date.now(),
        ...(r && {
          id: r,
        }),
        ...(n !== undefined && {
          ttlMs: n,
        }),
      };
      if (isStorageV5Enabled() && s !== undefined) {
        if (!(await writeAuthCacheV5_2(s, cache))) return;
      } else {
        let fileReader = getFileReader();
        let T = needsAuthCachePath();
        await fileReader.mkdir(dirname(T));
        await fileReader.write(T, jsonStringify(cache));
      }
      clearAuthCacheRead();
    })
    .catch(() => {});
}
//@ chunk-z1n5m6nf.js:45687-45939 placement
/**
 * clearMcpAuthCacheEntry（v1 副本）。
 */
function clearMcpAuthCacheEntry_2(e, r) {
  let cliOwnedState = getCliOwnedState();
  let s = cliOwnedState.authCacheWriteChain
    .then(async () => {
      let needsAuthCache = await readNeedsAuthCache(r);
      if (!(e in needsAuthCache)) return;
      delete needsAuthCache[e];
      if (isStorageV5Enabled() && r !== undefined) {
        if (!(await writeAuthCacheV5_2(r, needsAuthCache))) return;
      } else await getFileReader().write(needsAuthCachePath(), jsonStringify(needsAuthCache));
      clearAuthCacheRead();
    })
    .catch(() => {});
  cliOwnedState.authCacheWriteChain = s;
  return s;
}
//@ chunk-z1n5m6nf.js:45939-46182 placement
/**
 * clearMcpDiscoveryCaches（v1 副本）。
 */
function clearMcpDiscoveryCaches_2(e = new Set(), r = true) {
  if (!isDiscoveryCacheOn()) return;
  if (r) noteIdentityChanged();
  bumpIdentityEpoch();
  let n = (cache) => {
    if (cache) retainCacheKeys(cache, e);
  };
  if (!getCliOwnedState().holdStaleReauthEntryForTest) getConnectionCache().reauthInFlight.clear();
  getConnectionCache().lapsedCcrSignIns.clear();
  n(connectToServer_2.cache);
  n(listMcpTools.cache);
  n(fetchCommandsForClient_2.cache);
  n(fetchResourcesForClient_2.cache);
  n(fetchResourceTemplatesForClient_2.cache);
}
//@ chunk-z1n5m6nf.js:46182-46289 placement
function mcpBaseUrlAnalytics(e, name) {
  let n = loggingSafeOrigin(e);
  let s = name
    ? {
        mcpServerKeyHash: toolNameForTelemetry(name),
      }
    : {};
  if (n)
    return {
      mcpServerBaseUrl: n,
      ...s,
    };
  return s;
}
//@ chunk-z1n5m6nf.js:59674-59787 placement
function normalizeImageMimeType_2(mimeType) {
  if (!mimeType) return false;
  let lower = firstLineOf(mimeType, ";").trim().toLowerCase();
  return SUPPORTED_IMAGE_TYPES_2.has(lower === "image/jpg" ? "image/jpeg" : lower);
}
//@ chunk-z1n5m6nf.js:59787-59800 placement
/**
 * 工具调用超时下限（旧副本）。
 */
var MIN_TOOL_TIMEOUT_MS_V1 = 60000;
//@ chunk-z1n5m6nf.js:59800-59946 placement = getMcpToolTimeoutMs (1)
function getMcpToolTimeoutMs_4(e) {
  let n = (e?.timeout !== undefined && e.timeout >= 1000 ? e.timeout : undefined) ?? env.MCP_TOOL_TIMEOUT;
  return n !== undefined
    ? Math.min(Math.max(n, MIN_TOOL_TIMEOUT_MS_V1), MAX_TIMER_DELAY_MS)
    : MIN_TOOL_TIMEOUT_MS_V1;
}
//@ chunk-z1n5m6nf.js:59946-59989 placement
function getMcpRequestTimeoutMs_2(e) {
  return Math.max(getMcpToolTimeoutMs_4(e), getConnectionTimeoutMs());
}
//@ chunk-z1n5m6nf.js:59989-60034 placement = MCP_STREAMABLE_HTTP_ACCEPT (1)
var MCP_STREAMABLE_HTTP_ACCEPT_2 = "application/json, text/event-stream";
//@ chunk-z1n5m6nf.js:60034-60112 placement
/**
 * 包装 fetch：出错时抛脱敏错误。
 */
function wrapFetchRethrowRedacted(fetchWithDefaults) {
  return async (r, n) => {
    try {
      return await fetchWithDefaults(r, n);
    } catch (error) {
      rethrowRedactedFetchError(error, r);
    }
  };
}
//@ chunk-z1n5m6nf.js:60112-60670 placement = wrapFetchWithTimeout (0.76)
/**
 * wrapFetchWithTimeout（v1 副本）。
 */
function wrapFetchWithTimeout_2(baseFetch, serverRef) {
  let mcpRequestTimeoutMs = getMcpRequestTimeoutMs_2(serverRef);
  return async (url, init) => {
    if ((init?.method ?? "GET").toUpperCase() === "GET") return baseFetch(url, init);
    let headers = new Headers(init?.headers);
    if (!headers.has("accept")) headers.set("accept", MCP_STREAMABLE_HTTP_ACCEPT_2);
    if (shouldPropagateTraceContext()) {
      let activeSpanId = getActiveSpanId();
      if (activeSpanId && !headers.has("traceparent")) headers.set("traceparent", activeSpanId);
    }
    let controller = new AbortController();
    let timer = setTimeout(
      (R) => R.abort(new DOMException("The operation timed out.", "TimeoutError")),
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
        ...(getMcpToolTimeoutMs_4(serverRef) > 300000 && {
          timeout: false,
        }),
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
//@ chunk-z1n5m6nf.js:60670-60729 placement = getMcpServerConnectionBatchSize (1)
function getMcpServerConnectionBatchSize_2() {
  return env.MCP_SERVER_CONNECTION_BATCH_SIZE ?? 3;
}
//@ chunk-z1n5m6nf.js:60729-60796 placement = getRemoteMcpServerConnectionBatchSize (1)
function getRemoteMcpServerConnectionBatchSize_2() {
  return env.MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE ?? 20;
}
//@ chunk-z1n5m6nf.js:60796-60859 placement = isLocalMcpServer (1)
function isLocalMcpServer_2(config) {
  return !config.type || config.type === "stdio" || config.type === "sdk";
}
//@ chunk-z1n5m6nf.js:60859-60919 placement = ALLOWED_IDE_TOOLS (1)
var ALLOWED_IDE_TOOLS_2 = ["mcp__ide__executeCode", "mcp__ide__getDiagnostics"];
//@ chunk-z1n5m6nf.js:60919-60984 placement = isIncludedMcpTool (1)
function isIncludedMcpTool_3(tool) {
  return !tool.startsWith("mcp__ide__") || ALLOWED_IDE_TOOLS_2.includes(tool);
}
//@ chunk-z1n5m6nf.js:60984-61017 placement
function isIdeServer_2(e) {
  return isIncludedMcpTool_3(e.name);
}
//@ chunk-z1n5m6nf.js:61017-61352 placement = getServerUrl (0.793)
function isServerHostInGateList(e, r) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(e, []);
  if (!Array.isArray(featureValue_CACHED_MAY_BE_STALE) || featureValue_CACHED_MAY_BE_STALE.length === 0)
    return false;
  if (featureValue_CACHED_MAY_BE_STALE.includes("*")) return true;
  if (!("url" in r) || typeof r.url !== "string") return false;
  try {
    let lower = new URL(r.url).hostname.toLowerCase();
    return featureValue_CACHED_MAY_BE_STALE.some((h) => {
      if (typeof h !== "string" || h === "") return false;
      let lower_2 = h.toLowerCase();
      return lower === lower_2 || lower.endsWith(`.${lower_2}`);
    });
  } catch {
    return false;
  }
}
//@ chunk-z1n5m6nf.js:61352-61419 placement
function shouldNormalizeRootCombinators_2(config) {
  return isServerHostInGateList("tengu_mcp_normalize_root_combinators", config);
}
//@ chunk-z1n5m6nf.js:61419-61485 placement
function shouldDropInvalidToolSchemas_2(config) {
  return isServerHostInGateList("tengu_mcp_drop_invalid_tool_schemas", config);
}
//@ chunk-z1n5m6nf.js:61485-61599 placement
/**
 * 测试专用：设置是否保留过期的重新认证条目（v1 副本）。
 */
function setHoldStaleReauthEntryForTest_2(e) {
  if (e) throw Error("setHoldStaleReauthEntryForTest is test-only");
  getCliOwnedState().holdStaleReauthEntryForTest = e;
}
//@ chunk-z1n5m6nf.js:61599-61647 placement
/**
 * 测试用：设置重新认证决策接收器（旧副本）。
 */
function setReauthDecisionSinkForTestV1(reauthDecisionSinkForTest) {
  getCliOwnedState().reauthDecisionSinkForTest = reauthDecisionSinkForTest;
}
//@ chunk-z1n5m6nf.js:61647-61957 placement
/**
 * getMcpRoots：roots/list 响应：项目根（或会话目录）、额外工作目录与可选 staging 根，转成去重的 file:// URI。
 */
function getMcpRoots_2(e = false) {
  let r = [];
  if (e)
    try {
      r = [pluginToolStagingRoot()];
    } catch (error) {
      logForDebugging(`MCP: staging root unavailable, omitted from roots/list: ${errorMessage(error)}`);
    }
  let n = new Set();
  let s = [];
  let toolsMachine = getToolsMachine();
  let y = toolsMachine ? (toolsMachine.directory?.path ?? null) : getOriginalCwdOrNull();
  for (let S of [...(y === null ? [] : [y]), ...getAnnouncedDirectories(), ...r]) {
    let href = pathToFileURL(S).href;
    if (n.has(href)) continue;
    n.add(href);
    s.push({
      uri: href,
    });
  }
  return {
    roots: s,
  };
}
//@ chunk-z1n5m6nf.js:61957-61987 placement
var ROOTLESS_PLUGIN_NAMES_2 = new Set(["documents"]);
//@ chunk-z1n5m6nf.js:61987-62131 placement
function isDocumentsPluginServer_2(serverRef) {
  if (getPlatform() === "windows") return false;
  if (!serverRef.pluginSource) return false;
  try {
    return ROOTLESS_PLUGIN_NAMES_2.has(parsePluginIdentifier(serverRef.pluginSource).name.toLowerCase());
  } catch {
    return false;
  }
}
//@ chunk-z1n5m6nf.js:62131-62268 placement
function notifyRootsListChanged_2() {
  for (let liveClient of getConnectionCache().liveClients)
    liveClient.sendRootsListChanged().catch((error) => {
      logForDebugging(`MCP: failed to send roots/list_changed: ${describeErrorBrief(error)}`);
    });
}
//@ chunk-z1n5m6nf.js:62268-62777 placement
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
//@ chunk-z1n5m6nf.js:62777-62983 placement
function isNonJsonRpc4xxPostError(error) {
  if (!(error instanceof StreamableHTTPError)) return false;
  let code = error.code ?? 0;
  if (!(code >= 400 && code < 500) || code === 401 || code === 403 || code === 429) return false;
  let index = error.message.indexOf(POST_ERROR_PREFIX);
  if (index === -1) return true;
  return !isJsonRpcErrorBody_2(error.message.slice(index + POST_ERROR_PREFIX.length));
}
//@ chunk-z1n5m6nf.js:62983-63171 placement
function isJsonRpcErrorBody_2(e) {
  let found = e.split(/\r?\n/).find((line) => line.startsWith("data:"));
  let n = safeParseJSON(found === undefined ? e : found.slice(5), false);
  return isJSONRPCErrorResponse_2(
    typeof n === "object" && n !== null && "id" in n && n.id === null
      ? {
          ...n,
          id: undefined,
        }
      : n,
  );
}
//@ chunk-z1n5m6nf.js:63171-63183 placement
/**
 * 探测超时上限（5000 毫秒）。
 */
var PROBE_TIMEOUT_CAP_MS = 5000;
//@ chunk-z1n5m6nf.js:63183-63339 placement
/**
 * makeConnectTimeoutError：连接超时错误，开关 tengu_mcp_connect_timeout_retry 打开时带 code CONNECT_TIMEOUT 以便重试。
 */
function makeConnectTimeoutError(e) {
  let r = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(e, "MCP connection timeout");
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_timeout_retry", true))
    return Object.assign(r, {
      code: "CONNECT_TIMEOUT",
    });
  return r;
}
//@ chunk-z1n5m6nf.js:63339-63443 layout = getServerCommandArray (0.781)
function getServerCommandArray(serverId, r, n) {
  if ((r.type === "stdio" || r.type === undefined) && r.pluginSource !== undefined)
    isMcpAuthCached_3(serverId, configHash(r), undefined, n);
}
//@ chunk-z1n5m6nf.js:63443-85309 fingerprint = connectToServer (0.606)
/**
 * connectToServer（v1）：同 v2 的连接入口，但客户端为旧 SDK（只有 initialize 握手，server/discover 只在 stateless claude.ai 代理本地应答中出现）。
 */
var connectToServer_2 = memoizeWithExternalCache(
  async (name, serverRef, serverStats, storageV5, credentials, y, S) => {
    primeEnsureConnectedClient();
    let connectStartTime = Date.now();
    let clockSnapshot = startClockSnapshot(S?.clock ?? systemClock);
    let w;
    let R = identityEpoch();
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
    let H;
    let U;
    let re = false;
    let he = false;
    let transport_2;
    let q;
    try {
      let Pe = function () {
        let armedAt = Date.now();
        for (let activeCallWatchdog of te.activeCallWatchdogs)
          if (activeCallWatchdog.armedAt === 0) activeCallWatchdog.armedAt = armedAt;
      };
      let j = isCcrInjectedMcpUrl(name, serverRef);
      let fe = hasCliOwnedBearer(serverRef);
      let pe =
        (serverRef.type === "sse" || serverRef.type === "http") && configHasAuthorizationHeader(serverRef);
      let ge =
        serverRef.type === "sse" || serverRef.type === "http" || serverRef.type === "ws"
          ? await getMcpServerHeaders(name, serverRef)
          : {};
      let ce =
        (serverRef.type === "sse" || serverRef.type === "http") &&
        !!serverRef.headersHelper &&
        hasAuthorizationHeader(ge);
      let le =
        (serverRef.type === "sse" || serverRef.type === "http") &&
        !pe &&
        !ce &&
        !fe &&
        !j &&
        isFirstPartyMcpUrl(serverRef.url) &&
        isFirstPartyProvider() &&
        (!!(
          isStorageV5Enabled() && credentials !== undefined
            ? await getClaudeAIOAuthTokensAsync(credentials)
            : getClaudeAIOAuthTokens()
        )?.accessToken ||
          (isDesignMcpUrl(serverRef.url) && (await checkConsent(credentials))));
      if (le)
        logEvent("tengu_mcp_first_party_auto_auth", {
          transportType: fromEnum(serverRef.type),
          ...mcpBaseUrlAnalytics(serverRef, name),
        });
      let k = {};
      if (serverRef.type === "sse") {
        recordPresentedHeaderSecrets(serverRef.headers, ge);
        let authProvider = pe || ce || le || fe ? undefined : new ClaudeAuthProvider(name, serverRef);
        U = authProvider;
        let x = await mcpProxyFetchOptions(serverRef.url);
        let fetchFn = boundedFetch(wrapFetchRethrowRedacted(createFetchWithDefaults(undefined, x)));
        if (authProvider) fetchFn = wrapFetchWithStepUpDetection(fetchFn, authProvider);
        fetchFn = wrapFetchWithTimeout_2(fetchFn, serverRef);
        if (le) fetchFn = wrapFetchWithFirstPartyAuth_2(fetchFn, credentials, k);
        let transportOptions = {
          authProvider,
          fetch: fetchFn,
          requestInit: {
            ...x,
            headers: {
              "User-Agent": getMCPUserAgent(),
              "Accept-Encoding": "identity",
              ...ge,
            },
          },
        };
        let fetchFn_2 = wrapFetchRethrowRedacted(async (url, init) => {
          let authHeaders = {};
          let tokens = await authProvider?.tokens();
          if (tokens) authHeaders.Authorization = `Bearer ${tokens.access_token}`;
          let proxyOptions = await mcpProxyFetchOptions(String(url));
          return fetch(url, {
            ...init,
            ...proxyOptions,
            headers: mergeRequestHeaders_2(init?.headers, authHeaders, ge),
          });
        });
        transportOptions.eventSourceInit = {
          fetch: boundedFetch(
            authProvider
              ? wrapFetchWithStepUpDetection(fetchFn_2, authProvider)
              : le
                ? wrapFetchWithFirstPartyAuth_2(fetchFn_2, credentials, k)
                : fetchFn_2,
          ),
        };
        transport_2 = new SSEClientTransport(new URL(serverRef.url), transportOptions);
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
        transport_2 = new SSEClientTransport(new URL(serverRef.url), opts);
      } else if (serverRef.type === "ws-ide") {
        let tlsOptions = getWebSocketTLSOptions(serverRef.url);
        getPresentedCredentialLog().record(serverRef.authToken);
        let wsHeaders = {
          "User-Agent": getMCPUserAgent(),
          ...(serverRef.authToken && {
            "X-Claude-Code-Ide-Authorization": serverRef.authToken,
          }),
        };
        let D = new globalThis.WebSocket(serverRef.url, {
          protocols: ["mcp"],
          headers: wsHeaders,
          proxy: getWebSocketProxyUrl(serverRef.url),
          tls: tlsOptions || undefined,
        });
        transport_2 = new WebSocketTransport(D, (z) => JSONRPCMessageSchema.parse(z));
      } else if (serverRef.type === "ws") {
        recordPresentedHeaderSecrets(serverRef.headers, ge);
        logMCPDebug(name, `Initializing WebSocket transport to ${redactUrlSecrets(serverRef.url)}`);
        let webSocketTLSOptions = getWebSocketTLSOptions(serverRef.url);
        let x = j ? getSessionIngressAuthToken() : null;
        getPresentedCredentialLog().record(x ?? undefined);
        let wsHeaders = {
          "User-Agent": getMCPUserAgent(),
          ...(x && {
            Authorization: `Bearer ${x}`,
          }),
          ...ge,
        };
        let wsHeadersForLogging = redactHeaders(wsHeaders);
        logMCPDebug(
          name,
          `WebSocket transport options: ${jsonStringify({
            url: redactUrlSecrets(serverRef.url),
            headers: wsHeadersForLogging,
            hasSessionAuth: !!x,
          })}`,
        );
        let ie = new globalThis.WebSocket(serverRef.url, {
          protocols: ["mcp"],
          headers: wsHeaders,
          proxy: getWebSocketProxyUrl(serverRef.url),
          tls: webSocketTLSOptions || undefined,
        });
        transport_2 = new WebSocketTransport(ie, (ue) => JSONRPCMessageSchema.parse(ue));
      } else if (serverRef.type === "http") {
        recordPresentedHeaderSecrets(serverRef.headers, ge);
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
        let authProvider = pe || ce || le || fe || j ? undefined : new ClaudeAuthProvider(name, serverRef);
        U = authProvider;
        let x = await mcpProxyFetchOptions(serverRef.url);
        let wsHeadersForLogging = boundedFetch(
          wrapFetchRethrowRedacted(createFetchWithDefaults(j ? hostedWorkerFetch : undefined, x)),
          {
            refusesCodings: issuerKey_3(serverRef.url),
          },
        );
        if (authProvider)
          wsHeadersForLogging = wrapFetchWithStepUpDetection(wsHeadersForLogging, authProvider);
        wsHeadersForLogging = wrapFetchWithTimeout_2(wsHeadersForLogging, serverRef);
        if (le) wsHeadersForLogging = wrapFetchWithFirstPartyAuth_2(wsHeadersForLogging, credentials, k);
        if (j)
          wsHeadersForLogging = wrapFetchSkipListenGet(
            wrapFetchWithCcrSessionAuth_2(wsHeadersForLogging, y, serverCacheKey(name, serverRef)),
            name,
            serverRef.url,
          );
        wsHeadersForLogging = restrictRemoteRepoCalls(wsHeadersForLogging, serverRef);
        if (issuerKey_3(serverRef.url)) {
          let ie = wsHeadersForLogging;
          wsHeadersForLogging = (value, key) => {
            let me = key?.method === "POST" ? getRequestTimingStore()?.mark("own") : undefined;
            return ie(value, key).finally(me);
          };
        }
        if (fe) wsHeadersForLogging = wrapFetchWithCliOwnedBearer_2(wsHeadersForLogging, serverRef);
        let transportOptions = {
          authProvider,
          fetch: wsHeadersForLogging,
          requestInit: {
            ...x,
            headers: {
              "User-Agent": getMCPUserAgent(),
              "Accept-Encoding": "identity",
              ...ge,
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
              hasAuthProvider: !!authProvider,
              timeoutMs: getMcpRequestTimeoutMs_2(serverRef),
            })}`,
          );
        }
        transport_2 = new StreamableHTTPClientTransport(new URL(serverRef.url), transportOptions);
        logMCPDebug(name, "HTTP transport created successfully");
        if (!isCcrHostedConfig(serverRef) && !isFirstPartyMcpUrl(serverRef.url) && !fe)
          q = ({ postMethodNotAllowed, dialSignal, dialConnected }) => {
            let me = (Je) =>
              dialConnected()
                ? Je
                : {
                    ...Je,
                    signal: Je?.signal ? AbortSignal.any([Je.signal, dialSignal]) : dialSignal,
                  };
            let Me = false;
            let Be = async (value, key) => {
              let We = await wsHeadersForLogging(value, me(key));
              if (!postMethodNotAllowed && !Me) {
                if (We.status === 401) {
                  await We.body?.cancel().catch(() => {});
                  throw Error(
                    "legacy HTTP+SSE stream GET answered 401 after the initialize POST was not a 405; not starting OAuth against this URL",
                  );
                }
                Me = We.ok;
              }
              return We;
            };
            let et = (Je, Ye) =>
              Ye?.body instanceof URLSearchParams && Ye.body.has("grant_type")
                ? wsHeadersForLogging(Je, Ye)
                : wsHeadersForLogging(Je, me(Ye));
            return new SSEClientTransport(new URL(serverRef.url), {
              authProvider,
              fetch: et,
              eventSourceInit: {
                fetch: Be,
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
        let claudeAiProxyFetch = createClaudeAiProxyFetch_2(
          boundedFetch(createFetchWithDefaults(undefined, fetchWithAuth)),
          credentials,
        );
        let proxyOptions = isSereneTeapotEnabled();
        let Se = proxyOptions || isStatelessClaudeAiProxy_2(serverRef);
        if (Se)
          logMCPDebug(
            name,
            proxyOptions
              ? "GET notification stream disabled for claude.ai connectors; a GET the SDK sends to the proxy URL is answered locally with 405"
              : "GET notification stream disabled (stateless connector); if the SDK requests it, it gets a local 405",
          );
        let transportOptions = {
          fetch: Se
            ? answerGetStreamLocally_2(wrapFetchWithTimeout_2(claudeAiProxyFetch, serverRef), proxyUrl)
            : wrapFetchWithTimeout_2(claudeAiProxyFetch, serverRef),
          requestInit: {
            ...fetchWithAuth,
            headers: {
              "User-Agent": getMCPUserAgent(),
              "Accept-Encoding": "identity",
              "X-Mcp-Client-Session-Id": getSessionId(),
            },
          },
        };
        transport_2 = new StreamableHTTPClientTransport(new URL(proxyUrl), transportOptions);
        logMCPDebug(name, "claude.ai proxy transport created successfully");
      } else if (isStdioConfig(serverRef) && isClaudeInChromeMCPServer(name)) {
        let { isClaudeInChromeAllowed } = await import("./chunk-2jvt0tn4.js");
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
        let { createChromeContext } = await import("./chunk-ztt2k9pv.js");
        let { createChromeSocketClient, createClaudeForChromeMcpServer } =
          await import("./chunk-3ewc7v9f.js");
        let { createLinkedTransportPair } = await import("./chunk-qa6ep5c8.js");
        let { setChromeBinding } = await import("./chunk-yx8pxhkm.js");
        let { registerChromeTabGroupCleanup } = await import("./chunk-9a6n2431.js");
        let chromeContext = createChromeContext(serverRef.env, {
          availabilityFunnel: true,
          credentials,
          bearerGate: async () => isClaudeInChromeAllowed(),
        });
        let context = createChromeSocketClient(chromeContext);
        setChromeBinding(chromeContext, context);
        registerChromeTabGroupCleanup();
        H = createClaudeForChromeMcpServer(chromeContext, context);
        let [clientTransport, serverTransport] = createLinkedTransportPair();
        await H.connect(serverTransport);
        transport_2 = clientTransport;
        logMCPDebug(name, "In-process Chrome MCP server started");
      } else if (serverRef.type === "stdio" || !serverRef.type) {
        assertProgramLaunchAllowed();
        let P = () => ({
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
        let { shellPrefix, baseEnv } = runWithPluginWriteScope(serverRef, P);
        let z = shellPrefix || serverRef.command;
        let ie = shellPrefix ? [shellQuoteArgs([serverRef.command, ...serverRef.args])] : serverRef.args;
        let { command, args, pending, capped } = isMcpServerBackingToolHook(name)
          ? {
              command: z,
              args: ie,
              pending: false,
              capped: false,
            }
          : wrapCommandInCgroup("mcp", z, ie);
        re = pending;
        he = capped;
        let { CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_CHROME_MCP_ORG_DENIED, ...Je } = baseEnv;
        let projectConfigRoot = getProjectConfigRoot();
        let We = {
          ...Je,
          CLAUDE_PROJECT_DIR: projectConfigRoot ?? getProjectRoot(),
          CLAUDE_CODE_SESSION_ID: getSessionId(),
          CLAUDECODE: "1",
          ...serverRef.env,
          ...(!isPolicyAllowed("allow_claude_browser_extension") && {
            CLAUDE_CODE_CHROME_MCP_ORG_DENIED: "1",
          }),
        };
        checkPluginBunOptions(serverRef.pluginSource, We, Je);
        transport_2 = new BoundedStdioTransport({
          command,
          args,
          env: We,
          stderr: "pipe",
          ...(projectConfigRoot !== null && {
            cwd: projectConfigRoot,
          }),
        });
      } else throw Error(`Unsupported server type: ${serverRef.type}`);
      let L;
      let be;
      let stderrOutput = "";
      if (serverRef.type === "stdio" || !serverRef.type) {
        let P = transport_2;
        if (P.stderr instanceof Readable) {
          be = P.stderr;
          L = (data) => {
            if (stderrOutput.length < 67108864)
              try {
                stderrOutput += data.toString();
              } catch {}
          };
          be.on("data", L);
        }
      }
      let ze = () => {
        let client = new Client(
          {
            name: "claude-code",
            title: "Claude Code",
            version:
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
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
          return getMcpRoots_2(isDocumentsPluginServer_2(serverRef));
        });
        return client;
      };
      let client = ze();
      logMCPDebug(name, `Starting connection with timeout of ${getConnectionTimeoutMs()}ms`);
      if (serverRef.type === "http" && keepsMCPDebug()) {
        logMCPDebug(name, `Testing basic HTTP connectivity to ${redactUrlSecrets(serverRef.url)}`);
        try {
          let testUrl = new URL(serverRef.url);
          let x = redactUrlSecrets(testUrl.href);
          let D = URL.canParse(x) ? new URL(x) : undefined;
          logMCPDebug(
            name,
            D
              ? `Parsed URL: host=${D.hostname}, port=${D.port || "default"}, protocol=${D.protocol}`
              : `Parsed URL: ${x}`,
          );
          if (testUrl.hostname === "127.0.0.1" || testUrl.hostname === "localhost")
            logMCPDebug(name, `Using loopback address: ${testUrl.hostname}`);
        } catch {
          logMCPDebug(name, `Failed to parse URL: ${redactUrlSecrets(serverRef.url)}`);
        }
      }
      let cachedInitialize = getCachedInitializeResult_2(serverRef);
      let discoverAnswer = cachedDiscoverOutcome(serverRef);
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
      let Ne = false;
      let Te = (P, x, D) => {
        w ??= startClockSnapshot(clockSnapshot.clock);
        let z = P.connect(x, {
          timeout: D,
        });
        let timeoutPromise = new Promise((resolve, reject) => {
          let me = clockSnapshot.clock.setTimeout(() => {
            logMCPDebug(
              name,
              `Connection timeout triggered after ${formatConnectElapsed(clockSnapshot)} (limit: ${D}ms)`,
            );
            if (H) H.close().catch(() => {});
            x.close().catch(() => {});
            Ne = true;
            reject(
              makeConnectTimeoutError(
                `MCP server "${name}" connection timed out after ${getConnectionTimeoutMs()}ms`,
              ),
            );
          }, D);
          z.then(me, me);
        });
        return Promise.race([z, timeoutPromise]);
      };
      try {
        try {
          await Te(client, transport_2, getConnectionTimeoutMs());
        } catch (error) {
          if (
            q === undefined ||
            (transport_2 instanceof StreamableHTTPClientTransport &&
              transport_2.protocolVersion !== undefined) ||
            !isNonJsonRpc4xxPostError(error) ||
            !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_legacy_sse_fallback", true)
          )
            throw error;
          logMCPDebug(
            name,
            `initialize POST rejected (${truncateToLength(describeConnectError(error, serverRef), 200)}); trying legacy HTTP+SSE`,
          );
          let D = error.code === 405;
          await transport_2.close().catch(() => {});
          let abortController = new AbortController();
          let ie = false;
          let ue = q({
            postMethodNotAllowed: D,
            dialSignal: abortController.signal,
            dialConnected: () => ie,
          });
          transport_2 = ue;
          guardTransportSend(
            {
              name,
            },
            ue,
          );
          client = ze();
          let Se = U?.sawAuthChallenge === true;
          Ne = false;
          try {
            await Te(
              client,
              ue,
              Math.min(
                PROBE_TIMEOUT_CAP_MS,
                Math.max(1000, getConnectionTimeoutMs() - (Date.now() - connectStartTime)),
              ),
            );
          } catch (error_2) {
            await ue.close().catch(() => {});
            abortController.abort();
            let Me = !Se && U?.sawAuthChallenge === true;
            let Be = isAuthFailure_2(error_2, error_2 instanceof SseError ? error_2.code : undefined, Me);
            if (Ne && D && Me) {
              logMCPDebug(
                name,
                "legacy HTTP+SSE stream GET answered with an auth challenge; its auth flow outran the fallback budget, so routing to needs-auth",
              );
              throw new UnauthorizedError(
                `MCP server "${name}" requires authorization: its legacy HTTP+SSE stream answered with an auth challenge and the authorization flow did not finish within the connect budget`,
              );
            }
            if (Ne || (error_2 instanceof SseError && !Be) || (Be && !D)) {
              logMCPDebug(
                name,
                `legacy HTTP+SSE not confirmed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); surfacing the POST failure`,
              );
              throw error;
            }
            throw error_2;
          }
          ie = true;
          logMCPDebug(name, "connected over legacy HTTP+SSE");
        }
        if (stderrOutput) {
          logMCPError(name, `Server stderr: ${stderrOutput}`);
          stderrOutput = "";
        }
        if (L && be) {
          be.off("data", L);
          be.resume();
        }
        let elapsed = Date.now() - connectStartTime;
        logMCPDebug(name, `Successfully connected (transport: ${serverRef.type || "stdio"}) in ${elapsed}ms`);
        if (
          (serverRef.type === "stdio" || !serverRef.type) &&
          transport_2 instanceof BoundedStdioTransport &&
          transport_2.pid
        ) {
          registerChildMemory("mcp_stdio", transport_2.pid);
          if (re) parkPendingPid("mcp", transport_2.pid, () => isMcpServerBackingToolHook(name));
          if (he || re) releaseMcpToolCgroup(name, transport_2.pid);
        }
      } catch (error) {
        let elapsed = Date.now() - connectStartTime;
        if (transport_2 instanceof BoundedStdioTransport && transport_2.overflowError) {
          logMCPError(name, transport_2.overflowError.message);
          if (stderrOutput) logMCPError(name, `Server stderr: ${stderrOutput}`);
          throw transport_2.overflowError;
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
          let D = await handleRemoteConnectAuthError_2({
            name,
            serverRef,
            transportType: "sse",
            error,
            statusCode: error.code,
            sawAuthChallenge: U?.sawAuthChallenge === true,
            hasUserAuthHeader: pe,
            helperMintsAuthHeader: ce,
            cliOwnedBearer: fe,
            useFirstPartyAuth: le,
            firstPartyBearer: k.last,
            authProvider: U,
            roundEpoch: R,
            storageV5,
          });
          if (D) return D;
        } else if (serverRef.type === "http" && error instanceof Error) {
          let errorObj = error;
          logMCPDebug(
            name,
            `HTTP Connection failed after ${elapsed}ms: ${describeConnectError(error, serverRef)} (code: ${errorObj.code || "none"}, errno: ${errorObj.errno || "none"})`,
          );
          logMCPError(name, rethrowRedactedConnectError(error, serverRef));
          let z = await handleRemoteConnectAuthError_2({
            name,
            serverRef,
            transportType: "http",
            error,
            statusCode: error.code,
            sawAuthChallenge: U?.sawAuthChallenge === true,
            hasUserAuthHeader: pe,
            helperMintsAuthHeader: ce,
            cliOwnedBearer: fe,
            useFirstPartyAuth: le,
            firstPartyBearer: k.last,
            authProvider: U,
            roundEpoch: R,
            storageV5,
          });
          if (z) return z;
        } else if (serverRef.type === "claudeai-proxy" && error instanceof Error) {
          logMCPDebug(
            name,
            `claude.ai proxy connection failed after ${elapsed}ms: ${describeConnectError(error, serverRef)}`,
          );
          if (!isClaudeAiBearerRejectedError_2(error))
            logMCPError(name, rethrowRedactedConnectError(error, serverRef));
          let errorCode = error.code;
          if (isClaudeAiBearerRejectedError_2(error)) {
            logEvent("tengu_mcp_server_connection_failed", {
              transportType: lit("claudeai-proxy"),
              errorCode: lit("CLAUDEAI_BEARER_REJECTED"),
              sdkGeneration: fromEnum(mcpSdkGeneration()),
              ...mcpBaseUrlAnalytics(serverRef, name),
              ...buildPluginSourceFields(serverRef),
            });
            logFeatureSad("mcp_connect", "mcp_connect_claudeai_bearer_rejected");
            let z = serverCacheKey(name, serverRef);
            let ie = {
              name,
              type: "failed",
              config: serverRef,
              error: error.message,
              errorCode: "CLAUDEAI_BEARER_REJECTED",
            };
            let ue = getConnectionCache().connections.get(z);
            if (ue)
              ue.then(
                (Se) => {
                  if (Se === ie && getConnectionCache().connections.get(z) === ue)
                    getConnectionCache().connections.delete(z);
                },
                () => {},
              );
            return ie;
          }
          if (errorCode === 401 || errorCode === 403)
            return handleRemoteAuthFailure_2(
              name,
              serverRef,
              "claudeai-proxy",
              undefined,
              false,
              R,
              storageV5,
            );
        } else if (serverRef.type === "sse-ide" || serverRef.type === "ws-ide")
          logEvent("tengu_mcp_ide_server_connection_failed", {
            connectionDurationMs: elapsed,
          });
        if (H) H.close().catch(() => {});
        transport_2.close().catch(() => {});
        if (stderrOutput && !isCleanupStarted()) logMCPError(name, `Server stderr: ${stderrOutput}`);
        throw error;
      }
      let capabilities = client.getServerCapabilities();
      let serverVersion = client.getServerVersion();
      let De = officialPluginPromptOverrides(serverRef);
      let xe = serverInstructionsOverride(De, name) ?? client.getInstructions();
      let He = toolTimeoutForServer(serverRef);
      let instructions = truncateServerInstructions_2(xe, name, He);
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
      let Ie = false;
      let originalOnerror = client.onerror;
      let originalOnclose = client.onclose;
      let MAX_ERRORS_BEFORE_RECONNECT = 3;
      let te = {
        consecutiveErrors: 0,
        activeCallWatchdogs: new Set(),
        pendingElicitations: 0,
        lastElicitationClosedAt: 0,
      };
      let hasTriggeredClose = false;
      let closeTransportAndRejectPending = (reason) => {
        if (hasTriggeredClose) return;
        hasTriggeredClose = true;
        te.closeReason = reason;
        logMCPDebug(name, `Closing transport (${reason})`);
        client.close().catch((e) => {
          logMCPDebug(name, `Error during close: ${describeConnectError(e, serverRef)}`);
        });
      };
      client.onerror = (msg) => {
        let x = serverRef.type || "stdio";
        if (x === "stdio" && msg instanceof SyntaxError) {
          logMCPError(name, `Ignoring non-JSON line on stdout: ${msg.message}`);
          return;
        }
        if (msg instanceof FirstPartyDesignNeedsConsentError) return;
        if (x === "stdio" && msg instanceof StdoutOverflowError_2) {
          logMCPError(name, msg.message);
          Ie = true;
          closeTransportAndRejectPending("stdout overflow");
          if (originalOnerror) originalOnerror(msg);
          return;
        }
        if ((x === "http" || x === "claudeai-proxy") && msg instanceof HttpBodyOverflowError_2) {
          logMCPError(
            name,
            `sent a response larger than ${Math.round(HTTP_BODY_LIMITS / 1024 / 1024)}MB. Claude Code stopped reading it and failed the request it answered; the connection stays open.`,
          );
          if (originalOnerror) originalOnerror(msg);
          return;
        }
        if (
          (x === "sse" || x === "sse-ide" || x === "http" || x === "claudeai-proxy") &&
          msg.message.includes(STOPPED_READING_NOTE_2)
        ) {
          logMCPError(name, msg.message);
          Ie = true;
          closeTransportAndRejectPending("http body overflow");
          if (originalOnerror) originalOnerror(msg);
          return;
        }
        if ((x === "sse" || x === "http" || x === "claudeai-proxy") && msg instanceof SyntaxError) {
          Ie = true;
          Pe();
          closeTransportAndRejectPending(
            U?.authChallengeOpen === true && te.activeCallWatchdogs.size <= 1
              ? "malformed message after an auth challenge"
              : "malformed JSON-RPC message (response truncated)",
          );
          if (originalOnerror) originalOnerror(msg);
          return;
        }
        let uptime = Date.now() - connectionStartTime;
        Ie = true;
        logMCPDebug(name, `${x.toUpperCase()} connection dropped after ${Math.floor(uptime / 1000)}s uptime`);
        if (msg.message) {
          let z = CONNECTION_ERROR_HINTS.find(([ie]) => msg.message.includes(ie))?.[1];
          logMCPDebug(name, z ?? `Connection error: ${describeConnectError(msg, serverRef)}`);
        }
        if (
          (x === "http" || x === "claudeai-proxy") &&
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
          (x === "http" || x === "claudeai-proxy") &&
          client.transport?.sessionId !== undefined &&
          msg instanceof StreamableHTTPError &&
          msg.code === 404 &&
          msg.message.includes("Failed to open SSE stream")
        )
          logFeatureSad("mcp_session_recovery", "get_stream_404_not_reinit");
        if (x === "sse" || x === "http" || x === "claudeai-proxy") {
          if (msg.message.includes("Maximum reconnection attempts")) {
            logMCPDebug(
              name,
              "SSE GET-stream reconnection exhausted; leaving transport up (POST still works)",
            );
            te.consecutiveErrors = 0;
            Pe();
            if (originalOnerror) originalOnerror(msg);
            return;
          }
          if (isTransientMcpError_2(msg)) {
            te.consecutiveErrors++;
            Pe();
            logMCPDebug(
              name,
              `Terminal connection error ${te.consecutiveErrors}/${MAX_ERRORS_BEFORE_RECONNECT}`,
            );
            if (te.consecutiveErrors >= MAX_ERRORS_BEFORE_RECONNECT) {
              te.consecutiveErrors = 0;
              closeTransportAndRejectPending("max consecutive terminal errors");
            }
          } else te.consecutiveErrors = 0;
        }
        if (originalOnerror) originalOnerror(msg);
      };
      if ((serverRef.type === "http" || serverRef.type === "claudeai-proxy") && client.transport)
        te.toolCallSends = trackToolCallSends(
          client.transport,
          isMcpSessionExpiredError_2,
          te.activeCallWatchdogs,
        );
      if (client.transport) {
        let onmessage = client.transport.onmessage;
        client.transport.onmessage = (x, D) => {
          if (te.consecutiveErrors !== 0) te.consecutiveErrors = 0;
          onmessage?.(x, D);
        };
      }
      client.onclose = () => {
        let uptime = Date.now() - connectionStartTime;
        let transportType = serverRef.type ?? "unknown";
        logMCPDebug(
          name,
          `${transportType.toUpperCase()} connection closed after ${Math.floor(uptime / 1000)}s (${Ie ? "with errors" : "cleanly"})`,
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
        if (H) {
          try {
            await H.close();
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
        if (transport_2 instanceof BoundedStdioTransport)
          try {
            let childPid = transport_2.pid;
            if (transport_2.serverProcess && getPlatform() === "windows") {
              logMCPDebug(name, "Closing MCP server stdin");
              await closeStdioServer(transport_2.serverProcess);
            } else if (childPid) {
              logMCPDebug(name, "Sending SIGINT to MCP server process");
              try {
                process.kill(childPid, "SIGINT");
              } catch (error) {
                logMCPDebug(name, `Error sending SIGINT: ${error}`);
                return;
              }
              await new Promise(async (resolve) => {
                let D = false;
                let z = () => {
                  if (D) return;
                  D = true;
                  clearInterval(interval);
                  clearTimeout(timer);
                  resolve();
                };
                let ie = (childPid) => {
                  try {
                    process.kill(childPid, 0);
                    return true;
                  } catch {
                    return false;
                  }
                };
                let interval = setInterval(
                  (me, Me, Be, et) => {
                    if (!me(Me)) {
                      logMCPDebug(Be, "MCP server process exited cleanly");
                      et();
                    }
                  },
                  50,
                  ie,
                  childPid,
                  name,
                  z,
                );
                let timer = setTimeout(
                  (me, Me) => {
                    logMCPDebug(me, "Cleanup timeout reached, stopping process monitoring");
                    Me();
                  },
                  600,
                  name,
                  z,
                );
                try {
                  await sleep(100);
                  if (!D) {
                    if (!ie(childPid)) {
                      z();
                      return;
                    }
                    logMCPDebug(name, "SIGINT failed, sending SIGTERM to MCP server process");
                    try {
                      process.kill(childPid, "SIGTERM");
                    } catch (termError) {
                      logMCPDebug(name, `Error sending SIGTERM: ${termError}`);
                      z();
                      return;
                    }
                    await sleep(400);
                    if (!D)
                      if (!ie(childPid)) z();
                      else {
                        logMCPDebug(name, "SIGTERM failed, sending SIGKILL to MCP server process");
                        try {
                          process.kill(childPid, "SIGKILL");
                        } catch (killError) {
                          logMCPDebug(name, `Error sending SIGKILL: ${killError}`);
                        }
                      }
                  }
                  z();
                } catch {
                  z();
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
      if (transport_2 instanceof BoundedStdioTransport) transport_2.handOffExitCleanup();
      let wrappedCleanup = async () => {
        getConnectionCache().liveClients.delete(client);
        cleanupUnregister?.();
        await cleanup();
      };
      getConnectionCache().liveClients.add(client);
      if (getAnnouncedDirectories() !== announcedDirectories) client.sendRootsListChanged().catch(() => {});
      let ot = Date.now() - connectStartTime;
      logMcpConnectionOtelEvent_2(name, serverRef, {
        status: "connected",
        durationMs: ot,
      });
      let _e = xe?.length ?? 0;
      logEvent("tengu_mcp_server_connection_succeeded", {
        connectionDurationMs: ot,
        instructionsLength: _e,
        instructionsTruncated: _e > He,
        transportType: fromEnum(serverRef.type ?? "stdio"),
        negotiatedLegacySse: serverRef.type === "http" && transport_2 instanceof SSEClientTransport,
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
        duration_ms: ot,
      });
      if (U) getCliOwnedState().clientAuthProviders.set(client, U);
      getCliOwnedState().clientFirstPartyBearers.set(client, k);
      let ee = {
        name,
        client: identityId(client),
        type: "connected",
        capabilities: capabilities ?? {},
        serverInfo: serverVersion,
        instructions,
        config: serverRef,
        cleanup: wrappedCleanup,
        transportErrorState: te,
      };
      clearDiscoveryPathMemo(name);
      try {
        getConnectedClientWiring()?.(ee);
      } catch (error) {
        logMCPError(
          name,
          `connected-client wiring failed (placeholder retained, adoption will retry): ${errorMessage(error)}`,
        );
      }
      return ee;
    } catch (error) {
      let fe = Date.now() - connectStartTime;
      if (isCleanupStarted()) {
        logMCPDebug(name, `Connection abandoned after ${fe}ms (Claude Code is shutting down)`);
        if (H) H.close().catch(() => {});
        return {
          name,
          type: "failed",
          config: serverRef,
          error: "Claude Code is shutting down",
          errorCode: "SHUTTING_DOWN",
        };
      }
      let pe = describeConnectError(error, serverRef);
      let cause = error instanceof Error ? error.cause : undefined;
      let ce =
        (error && typeof error === "object" && "code" in error ? error.code : undefined) ??
        (cause && typeof cause === "object" && "code" in cause ? cause.code : undefined);
      let le = ce !== undefined ? String(ce) : undefined;
      if (
        serverRef.type === "http" &&
        le === "404" &&
        transport_2?.sessionId === undefined &&
        !isCcrHostedConfig(serverRef)
      ) {
        le = "ENDPOINT_NOT_FOUND";
        pe = `MCP endpoint not found at ${
          describeMcpServerOrigin(name, serverRef, {
            detail: "origin",
          }) ?? "(unparseable url)"
        }. Check the URL in your MCP config.`;
      }
      let k = le === "CONNECT_TIMEOUT" && w !== undefined ? suspendedConnectMessage(name, w) : undefined;
      if (k !== undefined) {
        le = CONNECT_SUSPENDED;
        pe = k;
      }
      pe = redactMcpErrorDetail(name, serverRef, pe);
      logMcpConnectionOtelEvent_2(name, serverRef, {
        status: "failed",
        durationMs: fe,
        errorCode: le,
        error: pe,
      });
      let L =
        le === "ENOENT" && (serverRef.type === "stdio" || serverRef.type === undefined)
          ? "mcp_connect_spawn_enoent"
          : le === "ENDPOINT_NOT_FOUND"
            ? "mcp_connect_endpoint_not_found"
            : undefined;
      if (L !== undefined) logFeatureBad("mcp_connect", L);
      else {
        let W =
          le === "ECONNREFUSED"
            ? "mcp_connect_refused"
            : le === CONNECT_SUSPENDED
              ? "mcp_connect_suspended"
              : pe.includes("timed out")
                ? "mcp_connect_timeout"
                : "mcp_connect_failed";
        logFeatureSad("mcp_connect", `${W}_${serverRef.type ?? "stdio"}`);
      }
      logEvent("tengu_mcp_server_connection_failed", {
        connectionDurationMs: fe,
        errorCode: sanitizeConnectErrorCodeForTelemetry_2(le),
        errorClassName: sanitizedErrorClassNameForTelemetry(error),
        errorMessageHash: shortHash(scrubErrorText(pe)),
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
        `Connection failed after ${formatConnectElapsed(clockSnapshot)}${le !== undefined ? ` (${le})` : ""}: ${pe}`,
      );
      logMCPError(name, `Connection failed${le !== undefined ? ` (${le})` : ""}: ${pe}`);
      logForDiagnosticsNoPII("error", "mcp_connect_failed", {
        transport,
        duration_ms: fe,
        ...(le === "CONNECT_TIMEOUT" && {
          reason: "timeout",
        }),
        ...(le === CONNECT_SUSPENDED && {
          reason: "suspended",
        }),
      });
      if (H) H.close().catch(() => {});
      if (le !== CONNECT_SUSPENDED) getServerCommandArray(name, serverRef, storageV5);
      let be =
        le === "ERR_PROXY_TUNNEL"
          ? [error, cause]
              .map((W) => (W && typeof W === "object" && "status" in W ? W.status : undefined))
              .find((W) => typeof W === "number")
          : undefined;
      return {
        name,
        type: "failed",
        config: serverRef,
        error: pe,
        errorCode: le,
        ...(be !== undefined && {
          proxyConnectStatus: be,
        }),
        ...(le === undefined &&
          U?.sawAuthChallenge === true &&
          (await registrationStatusFields(name, serverRef, connectStartTime))),
      };
    }
  },
  serverCacheKey,
  () => getConnectionCache().connections,
  (e, r, [n, s, , h]) =>
    connectWithSignedOutFallback(
      () => redialAfterSuspend(e, r, () => getServerCommandArray(n, s, h)),
      r,
      n,
      s,
    ),
);
//@ chunk-z1n5m6nf.js:123802-123964 callgraph-fingerprint = callIdeRpc (0.394)
/**
 * callIdeTool（v1 副本）。
 */
async function callIdeTool_2(toolName, args, client) {
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
//@ chunk-z1n5m6nf.js:123964-124222 layout
/**
 * identityChangedReconnectResult（v1 副本）。
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
//@ chunk-z1n5m6nf.js:124222-124359 layout
/**
 * 重连 MCP 服务器（v1）：需要时先等待账号身份就绪，远程服务器在等待期间账号变化则返回 IDENTITY_CHANGED 结果，否则调用 reconnectMcpServerImpl。
 */
async function reconnectMcpServer_2(name, config, n, s) {
  if (!isDiscoveryCacheUsable()) return reconnectMcpServerImpl(name, config, n, s);
  let h = identityEpoch();
  await flushDiscoveryCache(clearDiscoveryForServer_2(name, config));
  if (isRemoteMcpTransport(config) && identityEpoch() !== h)
    return identityChangedReconnectResult_2(name, config);
  return reconnectMcpServerImpl(name, config, n, s);
}
//@ chunk-z1n5m6nf.js:124359-126278 layout
/**
 * reconnectMcpServerImpl（v1 副本）。
 */
async function reconnectMcpServerImpl(name, config, n, s, h = {}) {
  let y = identityEpoch();
  let S = isRemoteMcpTransport(config);
  let T = () => S && identityEpoch() !== y;
  let M = () => identityChangedReconnectResult_2(name, config);
  try {
    clearKeychainCache();
    let w = h.keepConnectionInUse ? {} : undefined;
    await (w === undefined ? clearServerCache_4(name, config) : clearServerCache_4(name, config, w));
    if (T()) return M();
    let R = connectToServer_2(name, config, undefined, n, s);
    let E = await R;
    if (E.type === "needs-auth") {
      logMCPDebug(name, "Reconnect returned 'needs-auth'; retrying once after cache clear");
      if (T()) return M();
      let fe = serverCacheKey(name, config);
      if (getConnectionCache().connections.get(fe) === R) getConnectionCache().connections.delete(fe);
      E = await connectToServer_2(name, config, undefined, n, s);
    }
    if (T()) {
      if (E.type === "connected") await detachAndCloseConnection_2(E);
      return M();
    }
    if (E.type !== "connected") {
      logFeatureSad("mcp_reconnect", "mcp_reconnect_not_connected");
      return applyMcpServerConfig(config, {
        client: E,
        tools: [],
        commands: [],
      });
    }
    if (config.type !== "claudeai-proxy") clearMcpAuthCacheEntry_2(name, n);
    if (config.type === "http" || config.type === "sse") await clearMcpOAuthStubIfTokenless(name, config);
    clearDiscoveryPathMemo(name);
    let grantLeg;
    if (isDiscoveryCacheOn()) grantLeg = await cacheGrantLeg(name, config);
    if (T()) {
      await detachAndCloseConnection_2(E);
      return M();
    }
    let H = !!E.capabilities?.resources;
    let [U, commandsForClient, he, G] = await Promise.all([
      listMcpTools(E, n),
      fetchCommandsForClient_2(E),
      Promise.resolve([]),
      H ? fetchResourcesForClient_2(E) : Promise.resolve([]),
    ]);
    if (T()) {
      await detachAndCloseConnection_2(E);
      return M();
    }
    if (E.discoveryAuthFailure) {
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
    if (config.type === "claudeai-proxy" && !E.discoveryBearerRejected) clearMcpAuthCacheEntry_2(name, n);
    if (config.type === "claudeai-proxy" && !E.toolsListError && !E.discoveryBearerRejected)
      recordClaudeAiMcpConnected(name, n);
    persistLiveListing_2(E, {
      tools: U,
      commands: commandsForClient,
      resources: G,
      identityEpoch: y,
      grantLeg,
    });
    let commands = [...commandsForClient, ...he];
    let j = [];
    if (H) {
      if (
        ![ListMcpResourcesTool, ReadMcpResourceTool].some((tool) =>
          U.some((t) => toolMatchesName(t, tool.name)),
        )
      )
        j.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
    }
    if (E.discoveryBearerRejected) logFeatureSad("mcp_reconnect", "mcp_reconnect_bearer_rejected");
    else if (E.toolsListError) logFeatureSad("mcp_reconnect", "mcp_reconnect_tools_list_failed");
    else logFeatureOk("mcp_reconnect");
    return applyMcpServerConfig(config, {
      client: E,
      tools: [...U, ...j],
      commands,
      resources: G.length > 0 ? G : undefined,
      resourceTemplates: [],
      ...(w?.connection !== undefined &&
        E === w.connection && {
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
//@ chunk-z1n5m6nf.js:126278-126333 layout = processBatched (1)
async function processBatched_3(items, concurrency, processor) {
  await pMap(items, processor, {
    concurrency,
  });
}
//@ chunk-z1n5m6nf.js:126333-126598 layout
/**
 * countUnsettledByDeadline（v1 副本）。
 */
async function countUnsettledByDeadline_2(e, r) {
  if (e.length === 0) return 0;
  let n;
  let promise = new Promise((resolve) => {
    n = setTimeout((y) => y("deadline"), r, resolve);
  });
  try {
    let results = await Promise.all(
      e.map((y) =>
        Promise.race([
          y.then(
            () => "settled",
            () => "settled",
          ),
          promise,
        ]),
      ),
    );
    return count(results, (y) => y === "deadline");
  } finally {
    clearTimeout(n);
  }
}
//@ chunk-z1n5m6nf.js:126598-134003 layout
/**
 * getMcpToolsCommandsAndResources（v1 副本）。
 */
async function getMcpToolsCommandsAndResources(e, mcpConfigs, n, s, h, y, S, T) {
  let M = identityEpoch();
  let w = (k) => identityEpoch() !== M && isRemoteMcpTransport(k);
  let R = (k) => {
    if (!w(k.client.config))
      e({
        ...k,
        attemptEpoch: M,
      });
  };
  isLegacyProtocolEra();
  let E = false;
  let entries = Object.entries(mcpConfigs ?? (await getAllMcpConfigs()).servers);
  let H = [];
  for (let k of entries)
    if (isMcpServerDisabled(k[0]))
      R({
        client: {
          name: k[0],
          type: "disabled",
          config: k[1],
        },
        tools: [],
        commands: [],
      });
    else H.push(k);
  registerConfiguredMcpServers(Object.fromEntries(H));
  let totalServers = H.length;
  let stdioCount = count(H, ([k, L]) => L.type === "stdio");
  let sseCount = count(H, ([k, L]) => L.type === "sse");
  let httpCount = count(H, ([k, L]) => L.type === "http");
  let sseIdeCount = count(H, ([k, L]) => L.type === "sse-ide");
  let wsIdeCount = count(H, ([k, L]) => L.type === "ws-ide");
  let filtered = H.filter(([k, config]) => isLocalMcpServer_2(config));
  let filtered_2 = H.filter(([k, config]) => !isLocalMcpServer_2(config));
  let ge = {
    totalServers,
    stdioCount,
    sseCount,
    httpCount,
    sseIdeCount,
    wsIdeCount,
  };
  let ce = [];
  let processor = async ([serverName, L]) => {
    try {
      if (isCleanupStarted()) {
        logMCPDebug(serverName, "Skipping connection (Claude Code is shutting down)");
        return;
      }
      if (isMcpServerDisabled(serverName)) {
        R({
          client: {
            name: serverName,
            type: "disabled",
            config: L,
          },
          tools: [],
          commands: [],
        });
        return;
      }
      if (isMcpServerBlockedAtConnectTime(serverName, L)) {
        logMCPDebug(serverName, "Skipping connection (blocked by managed policy)");
        R({
          client: {
            name: serverName,
            type: "failed",
            config: L,
            error: mcpGateError("managed-policy", serverName, L).error,
          },
          tools: [],
          commands: [],
        });
        return;
      }
      if (isIneligibleClaudeAiProxy(L)) {
        R({
          client: {
            name: serverName,
            type: "needs-auth",
            config: L,
          },
          tools: mcpAuthToolsFor(serverName, L),
          commands: [],
        });
        return;
      }
      if (
        (L.type === "claudeai-proxy" || L.type === "http" || L.type === "sse") &&
        !isCliOwnedConfig(L) &&
        ((await isMcpAuthCached_2(serverName, L, n)) ||
          ((L.type === "http" || L.type === "sse") &&
            shouldTryTokenless(
              serverName,
              L,
              await readMcpOAuthStore({
                serverName,
                serverConfig: L,
                challenged: false,
              }),
            )))
      ) {
        if (L.type !== "claudeai-proxy" && L.pluginSource === undefined)
          logMCPDebug(serverName, "Skipping connection (cached needs-auth)");
        R({
          client: {
            name: serverName,
            type: "needs-auth",
            config: L,
            ...(await registrationStatusFields(serverName, L)),
          },
          tools: mcpAuthToolsFor(serverName, L),
          commands: [],
        });
        return;
      }
      if (
        (L.type === "stdio" || L.type === undefined) &&
        L.pluginSource !== undefined &&
        (await isMcpAuthCached_2(serverName, L, n))
      ) {
        R({
          client: {
            name: serverName,
            type: "failed",
            config: L,
            error:
              "Skipping connection (recent failure cached; retries automatically in 15 min, or edit the plugin config to retry now)",
          },
          tools: [],
          commands: [],
        });
        return;
      }
      let be = await hasLiveConnection_2(serverName, L);
      let W = h !== undefined && Object.hasOwn(h, serverName) ? h[serverName] : undefined;
      if (W !== undefined && !be) {
        let { client, tools } = await buildCachedClientTools_2({
          name: serverName,
          config: L,
          capabilities: {
            tools: {},
          },
          serverInfo: undefined,
          savedAt: Date.now(),
          tools: W,
        });
        R({
          client,
          tools,
          commands: [],
        });
        return;
      }
      let ze = be
        ? {
            kind: "miss",
            reason: "live-connection",
          }
        : await readDiscoveryCache(serverName, L);
      let X = applyCapabilityServeTimeMiss_2(ze);
      if (X.kind === "fresh" || X.kind === "stale") {
        let { entry, ageMs } = X;
        let { client, tools } = await buildCachedClientTools_2({
          name: serverName,
          config: L,
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
        let mapped_2 = (entry.templates ?? []).map((ve) => ({
          ...ve,
          server: serverName,
        }));
        let Ue = !!entry.capabilities.resources || mapped.length > 0;
        let Ie = [];
        if (Ue && !E) {
          E = true;
          Ie.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
        }
        logEvent("tengu_mcp_discovery_source", {
          source: lit(X.kind === "fresh" ? "cache_fresh" : "cache_stale"),
          transportType: fromEnum(L.type ?? "stdio"),
          entryAgeMs: ageMs,
          ...mcpBaseUrlAnalytics(L, serverName),
        });
        logFeatureOk("mcp_discovery_cache");
        getConnectionCache().settledCachedDialFailures.delete(serverCacheKey(serverName, L));
        getConnectionCache().refusedCachedRows.delete(serverCacheKey(serverName, L));
        R({
          client,
          tools: [...tools, ...Ie],
          commands,
          resources: mapped.length > 0 ? mapped : undefined,
          resourceTemplates: mapped_2.length > 0 ? mapped_2 : undefined,
        });
        if (X.kind === "stale")
          (async () => {
            let grantLeg = await cacheGrantLeg(serverName, L);
            let Ee;
            let B = async () => {
              if ((Ee !== undefined && isSupersededDial_2(Ee)) || identityEpoch() !== M) return;
              logFeatureSad("mcp_discovery_cache", "strike");
              await recordRefreshFailureStrike(serverName, L, {
                identityEpoch: M,
                grantLeg,
              });
            };
            let discoveryRefreshLock = await acquireDiscoveryRefreshLock(serverName, L);
            if (!discoveryRefreshLock) return;
            if (isMcpServerDisabled(serverName)) {
              await discoveryRefreshLock().catch(() => {});
              refuseCachedRowV1(serverName, L, "disabled");
              return;
            }
            if (isMcpServerBlockedAtConnectTime(serverName, L)) {
              await discoveryRefreshLock().catch(() => {});
              refuseCachedRowV1(serverName, L, "policy");
              return;
            }
            let Pe = (ye) => {
              if (!(!(Ee !== undefined && isSupersededDial_2(Ee)) && identityEpoch() === M)) return;
              if (ye.type !== "needs-auth")
                getConnectionCache().connections.delete(serverCacheKey(serverName, L));
              let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
              if (cachedFirstDialArmsRan.has(ye)) return;
              cachedFirstDialArmsRan.add(ye);
              if (ye.type === "needs-auth") emitCachedAdoptSignal(serverName, L);
              else if (ye.type === "failed") recordCachedDialFailureV1(ye, false);
            };
            let ke = (ye) => {
              let cachedFirstDialArmsRan = getCliOwnedState().cachedFirstDialArmsRan;
              if (cachedFirstDialArmsRan.has(ye)) return;
              cachedFirstDialArmsRan.add(ye);
              emitCachedAdoptSignal(serverName, L);
            };
            let oe = false;
            try {
              Ee = connectToServer_2(serverName, L, ge, n, s);
              getCliOwnedState().swrRefreshDialsInFlight.add(Ee);
              Ee.then(
                () => {
                  oe = true;
                },
                () => {
                  oe = true;
                },
              );
              let ye = await boundDial(Ee, {
                serverName,
                context: "MCP discovery-cache stale refresh",
              });
              if (ye.type !== "connected") {
                Pe(ye);
                await B();
                return;
              }
              if (isSupersededDial_2(Ee) || identityEpoch() !== M) return;
              if (
                entry.negotiatedEra !== undefined &&
                ye.protocolEra !== undefined &&
                ye.protocolEra !== entry.negotiatedEra
              ) {
                logMCPDebug(
                  serverName,
                  "Discovery cache entry dropped: server negotiated a different protocol era on revalidation",
                );
                await clearDiscoveryForServer_2(serverName, L).catch(() => {});
                if (!isSupersededDial_2(Ee) && identityEpoch() === M) ke(ye);
                return;
              }
              let Ae = !!ye.capabilities?.resources;
              clearDiscoveryPathMemo(serverName);
              let grantLeg = await cacheGrantLeg(serverName, L);
              if (isSupersededDial_2(Ee) || identityEpoch() !== M) return;
              let [ot, commandsForClient, resourcesForClient, P] = await Promise.all([
                listMcpTools(ye, n),
                fetchCommandsForClient_2(ye),
                fetchResourcesForClient_2(ye),
                Ae && isCacheableServer(L) ? fetchResourceTemplatesForClient_2(ye) : Promise.resolve([]),
              ]);
              let templates = getDiscoveryFetchError_2(P) === undefined ? P : undefined;
              if (
                isSupersededDial_2(Ee) ||
                isSupersededCacheEntry_2(Ee, serverName, L) ||
                identityEpoch() !== M
              )
                return;
              if (!isMcpServerDisabled(serverName) && !isMcpServerBlockedAtConnectTime(serverName, L)) {
                if (
                  !(await persistDiscovery(ye, {
                    tools: ot,
                    commands: commandsForClient,
                    resources: resourcesForClient,
                    templates,
                    identityEpoch: M,
                    grantLeg,
                  }))
                )
                  await B();
              }
              if (
                !(Ee !== undefined && isSupersededDial_2(Ee)) &&
                !(Ee !== undefined && isSupersededCacheEntry_2(Ee, serverName, L)) &&
                identityEpoch() === M
              )
                ke(ye);
            } catch {
              if (Ee !== undefined && !oe) {
                let ye = Ee;
                ye.then(
                  (Ae) => {
                    if (Ae.type !== "connected") {
                      Pe(Ae);
                      B().catch(() => {});
                    } else {
                      getCliOwnedState().swrRefreshDialsInFlight.delete(ye);
                      (entry.negotiatedEra !== undefined &&
                      Ae.protocolEra !== undefined &&
                      Ae.protocolEra !== entry.negotiatedEra
                        ? clearDiscoveryForServer_2(serverName, L).catch(() => {})
                        : Promise.resolve()
                      ).then(() => {
                        if (!isSupersededDial_2(ye) && identityEpoch() === M) ke(Ae);
                      });
                    }
                  },
                  () => {
                    B().catch(() => {});
                  },
                );
              } else await B();
            } finally {
              if (Ee !== undefined && oe) getCliOwnedState().swrRefreshDialsInFlight.delete(Ee);
              await discoveryRefreshLock().catch(() => {});
            }
          })();
        return;
      }
      let Le = connectToServer_2(serverName, L, ge, n, s, undefined, T);
      let Z = await Le;
      let Ne = connectToServer_2.cache?.get?.(serverCacheKey(serverName, L)) === Le;
      if (isDiscoveryCacheOn() && isDiscoveryCacheMissRecoverable_2(X))
        logEvent("tengu_mcp_discovery_source", {
          source: lit(discoverySourceLabel_2(X)),
          transportType: fromEnum(L.type ?? "stdio"),
          ...mcpBaseUrlAnalytics(L, serverName),
        });
      if (isSupersededDial_2(Le)) return;
      if (w(L)) {
        if (Z.type === "connected" && isSupersededCacheEntry_2(Le, serverName, L))
          detachAndCloseConnection_2(Z);
        return;
      }
      if (Z.type !== "connected") {
        R(
          applyMcpServerConfig(L, {
            client: Z,
            tools: Z.type === "needs-auth" ? mcpAuthToolsFor(serverName, L) : [],
            commands: [],
          }),
        );
        return;
      }
      Z.discoveryBearerRejected = undefined;
      if (L.type !== "claudeai-proxy") clearMcpAuthCacheEntry_2(serverName, n);
      if (L.type === "http" || L.type === "sse") await clearMcpOAuthStubIfTokenless(serverName, L);
      ce.push(
        (async () => {
          let Te = false;
          try {
            let we = !!Z.capabilities?.resources;
            clearDiscoveryPathMemo(serverName);
            let grantLeg = await cacheGrantLeg(serverName, L);
            if (isDiscoveryCacheOn() && (isSupersededDial_2(Le) || w(L))) {
              if (!isSupersededDial_2(Le) && isSupersededCacheEntry_2(Le, serverName, L))
                detachAndCloseConnection_2(Z);
              return;
            }
            let results = Promise.all([
              listMcpTools(Z, n, S),
              fetchCommandsForClient_2(Z),
              Promise.resolve([]),
            ]);
            let xe =
              y === true &&
              (L.type === "claudeai-proxy"
                ? !!Z.capabilities?.tools || !!Z.capabilities?.prompts
                : L.type === "http" && isSameOriginAsCcr(L.url) && !isDiscoveryCacheEligible(L));
            let results_2 = Promise.all([
              we && !xe ? fetchResourcesForClient_2(Z) : Promise.resolve([]),
              we && isCacheableServer(Z.config) ? fetchResourceTemplatesForClient_2(Z) : Promise.resolve([]),
            ]);
            let Fe = y === true && we && (L.type === "http" || L.type === "sse") && !isDiscoveryCacheOn();
            if (Fe) results_2.catch(() => {});
            let [[Ue, Ie, ve], Ee] = await Promise.all([results, Fe ? undefined : results_2]);
            if (w(L)) {
              if (isSupersededCacheEntry_2(Le, serverName, L)) detachAndCloseConnection_2(Z);
              return;
            }
            if (isDiscoveryCacheOn() && isSupersededDial_2(Le)) return;
            if (isDiscoveryCacheOn() && Ne && isSupersededCacheEntry_2(Le, serverName, L)) {
              if (
                connectToServer_2.cache?.get?.(serverCacheKey(serverName, L)) === undefined &&
                identityId2(Z.client).onclose !== undefined
              ) {
                detachAndCloseConnection_2(Z);
                R({
                  client: {
                    name: serverName,
                    type: "failed",
                    config: L,
                    error: "Connection closed during discovery",
                    errorCode: "ConnectionClosed",
                  },
                  tools: [],
                  commands: [],
                });
              }
              return;
            }
            if (Z.discoveryAuthFailure) {
              R({
                client: {
                  name: serverName,
                  type: "needs-auth",
                  config: L,
                },
                tools: mcpAuthToolsFor(serverName, L),
                commands: [],
              });
              return;
            }
            if (L.type === "claudeai-proxy" && !Z.discoveryBearerRejected)
              clearMcpAuthCacheEntry_2(serverName, n);
            if (L.type === "claudeai-proxy" && !Z.toolsListError && !Z.discoveryBearerRejected)
              recordClaudeAiMcpConnected(serverName, n);
            let commands = [...Ie, ...ve];
            let te = ($e) => {
              let ot = [];
              if (we && !E) {
                E = true;
                ot.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
              }
              R(
                applyMcpServerConfig(L, {
                  client: Z,
                  tools: [...Ue, ...ot],
                  commands,
                  resources: $e.length > 0 ? $e : undefined,
                  resourceTemplates: undefined,
                }),
              );
            };
            if (Fe) {
              te([]);
              Te = true;
            }
            let [Pe, ke] = Ee ?? (await results_2);
            if (!we) recordRawResourcesForResult_2(Pe, []);
            let templates = getDiscoveryFetchError_2(ke) === undefined ? ke : undefined;
            let Ae =
              !isDiscoveryCacheOn() ||
              isSupersededDial_2(Le) ||
              isSupersededCacheEntry_2(Le, serverName, L) ||
              identityEpoch() !== M ||
              isMcpServerDisabled(serverName) ||
              isMcpServerBlockedAtConnectTime(serverName, L)
                ? undefined
                : persistDiscovery(Z, {
                    tools: Ue,
                    commands: Ie,
                    resources: Pe,
                    templates,
                    identityEpoch: M,
                    grantLeg,
                  });
            if (!Fe) te(Pe);
            await Ae;
          } catch (error) {
            logMCPError(
              serverName,
              `Error fetching tools/commands/resources: ${describeConnectError(error, L)}`,
            );
            if (Te) return;
            R({
              client: {
                name: serverName,
                type: "failed",
                config: L,
              },
              tools: [],
              commands: [],
            });
          }
        })(),
      );
    } catch (error) {
      logMCPError(serverName, `Error fetching tools/commands/resources: ${describeConnectError(error, L)}`);
      R({
        client: {
          name: serverName,
          type: "failed",
          config: L,
        },
        tools: [],
        commands: [],
      });
    }
  };
  await Promise.all([
    processBatched_3(filtered, getMcpServerConnectionBatchSize_2(), processor),
    processBatched_3(filtered_2, getRemoteMcpServerConnectionBatchSize_2(), processor),
  ]);
  await Promise.all(ce);
}
//@ chunk-z1n5m6nf.js:134003-134665 layout = prefetchAllMcpResources (1)
/**
 * prefetchAllMcpResources（v1 副本）。
 */
function prefetchAllMcpResources_2(mcpConfigs, r, n) {
  return new Promise((resolve) => {
    let pendingCount = 0;
    let y = 0;
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
    let w = false;
    let R = () => {
      if (w) return;
      w = true;
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
        y++;
        if (y >= pendingCount) R();
      },
      mcpConfigs,
      r,
      n,
    )
      .then(R)
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
//@ chunk-z1n5m6nf.js:134665-135665 layout = transformResultContent (0.81)
/**
 * transformResultContent（v1 副本）。
 */
async function transformResultContent_2(resultContent, serverName, imageBuffer, storageV5, h = false) {
  switch (resultContent.type) {
    case "text": {
      let y = {
        type: "text",
        text: resultContent.text,
      };
      if (h) {
        let _meta = resultContent._meta;
        if (_meta) y._meta = _meta;
      }
      return [y];
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
      if (normalizeImageMimeType_2(resultContent.mimeType))
        return await imageResultBlocks(
          Buffer.from(String(resultContent.data), "base64"),
          resultContent.mimeType,
          serverName,
          imageBuffer,
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
        if (normalizeImageMimeType_2(resource.mimeType)) {
          let imageBuffer_2 = await imageResultBlocks(
            Buffer.from(resource.blob, "base64"),
            resource.mimeType,
            serverName,
            imageBuffer,
            storageV5,
          );
          let content = [];
          if (prefix)
            content.push({
              type: "text",
              text: prefix,
            });
          content.push(...imageBuffer_2);
          return content;
        } else {
          let imageBuffer = Buffer.from(resource.blob, "base64");
          let storedMcpContent = toStoredMcpContent(imageBuffer, resource.mimeType, serverName);
          if (storedMcpContent) return [storedMcpContent];
          return await persistBlobToTextBlock(imageBuffer, resource.mimeType, serverName, prefix, storageV5);
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
//@ chunk-z1n5m6nf.js:135665-135761 layout
/**
 * 生成二进制内容的随机文件名（旧副本）。
 */
function blobFileNameV1(e) {
  return `mcp-${normalizeNameForMCP(e)}-blob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
//@ chunk-z1n5m6nf.js:135761-136353 layout
/**
 * MCP 图片结果的处理：缩放/降采样图片块，同时把原图保存成文件；保存成功时附一段带尺寸和文件路径的说明文本，历史持久化关闭或保存失败时只返回图片块。
 */
async function imageResultBlocks(base64Data, mediaType, serverName, imageLimits, storageV5) {
  if (toolResultStoreOrNull() === undefined && addToHistory()) {
    logFeatureSad("mcp_image_result_file", "persistence_off");
    let { block } = await maybeResizeAndDownsampleImageBlock({
      data: base64Data,
      mediaType,
      limits: imageLimits,
    });
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
      Ph(base64Data) ?? mediaType,
      blobFileNameV1(serverName),
      undefined,
      storageV5,
    ).catch((error) => {
      logError(error);
      return {
        error: "not saved",
      };
    }),
  ]);
  if ("error" in saved) {
    logFeatureSad("mcp_image_result_file", "not_saved");
    return [imageBlock];
  }
  logFeatureOk("mcp_image_result_file");
  let w = (imageBlock.type === "image"
    ? null
    : await toolResultStoreOrNull()?.readPicture?.(saved.filepath, base64Data)) ?? {
    block: imageBlock,
    dimensions,
  };
  let imageMetadataText = createImageMetadataText(w.dimensions ?? {}, saved.filepath);
  return imageMetadataText === null
    ? [w.block]
    : [
        w.block,
        {
          type: "text",
          text: imageMetadataText,
        },
      ];
}
//@ chunk-z1n5m6nf.js:136353-136414 layout = addToHistory (1)
function addToHistory() {
  return isSessionPersistenceDisabled() || env.CLAUDE_CODE_SKIP_PROMPT_HISTORY;
}
//@ chunk-z1n5m6nf.js:136414-136737 layout
async function persistBlobToTextBlock(e, mimeType, serverName, s, h) {
  let y = await persistBinaryContent(e, mimeType, blobFileNameV1(serverName), undefined, h);
  if ("error" in y) {
    if (toolResultStoreOrNull() !== undefined)
      return [
        {
          type: "text",
          text: binaryNotSavedNotice(mimeType, e.length),
        },
      ];
    return [
      {
        type: "text",
        text: `${s}Binary content (${mimeType || "unknown type"}, ${e.length} bytes) could not be saved to disk: ${y.error}`,
      },
    ];
  }
  return [
    {
      type: "text",
      text: getBinaryBlobSavedMessage(y.filepath, mimeType, y.size, s),
    },
  ];
}
//@ chunk-z1n5m6nf.js:136737-137056 layout = inferCompactSchema (1)
/**
 * inferCompactSchema（v1 副本）。
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
//@ chunk-z1n5m6nf.js:137056-137200 layout
async function transformContentArray_2(e, serverName, imageBuffer, s) {
  let h = (
    await Promise.all(e.map((y) => transformResultContent_2(y, serverName, imageBuffer, s, true)))
  ).flat();
  return {
    content: h,
    type: "contentArray",
    schema: inferCompactSchema_2(stripTextBlockMeta(h)),
  };
}
//@ chunk-z1n5m6nf.js:137200-138213 layout = transformMCPResult (0.902)
/**
 * transformMCPResult（v1 副本）。
 */
async function transformMCPResult_2(e, tool, name, imageBuffer, h) {
  if (e && typeof e === "object") {
    if ("toolResult" in e)
      return {
        content: String(e.toolResult),
        type: "toolResult",
      };
    if ("structuredContent" in e && e.structuredContent !== undefined) {
      if ("content" in e && Array.isArray(e.content)) {
        let w = await contentOverStructuredResult(e.content, (R) =>
          transformContentArray_2(R, name, imageBuffer, h),
        );
        if (w !== undefined) return w;
      }
      let S = base64URLEncode(e.structuredContent);
      let T = S ?? jsonStringify(e.structuredContent);
      let schema = S === undefined ? inferCompactSchema_2(e.structuredContent) : undefined;
      if ("content" in e && Array.isArray(e.content)) {
        let filtered = e.content.filter(
          (R) => R && typeof R === "object" && "type" in R && R.type !== "text",
        );
        if (filtered.length > 0) {
          let transformedContent = (
            await Promise.all(
              filtered.map((item) => transformResultContent_2(item, name, imageBuffer, h, true)),
            )
          ).flat();
          if (transformedContent.length > 0) {
            let E = [
              ...transformedContent,
              {
                type: "text",
                text: T,
              },
            ];
            return {
              content: E,
              type: "contentArray",
              schema: inferCompactSchema_2(stripTextBlockMeta(E)),
            };
          }
        }
      }
      return {
        content: T,
        type: "structuredContent",
        schema,
      };
    }
    if ("content" in e && Array.isArray(e.content))
      return transformContentArray_2(e.content, name, imageBuffer, h);
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
//@ chunk-z1n5m6nf.js:138213-138322 layout = isMedia (1)
function isMedia_2(block) {
  if (!block || typeof block === "string") return false;
  return block.some((r) => r.type === "image" || r.type === "document");
}
//@ chunk-z1n5m6nf.js:138322-140352 layout = processMCPResult (0.755)
/**
 * processMCPResult（v1 副本）。
 */
async function processMCPResult_2(
  result,
  tool,
  name,
  imageLimits,
  hasResultSizeAnnotation,
  storageV5,
  credentials,
  resultNotForModel,
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
  let M = await transformMCPResult_2(result, tool, name, imageLimits, storageV5);
  let { type, schema } = M;
  let E = dropExtraDocumentBlocks(M.content);
  if (name === "ide") return E;
  if (resultNotForModel || (hasResultSizeAnnotation && !isMedia_2(E))) return E;
  if (!(await mcpContentNeedsTruncation(E, credentials))) return E;
  let sizeEstimateTokens = getContentSizeEstimate(E);
  if (env.ENABLE_MCP_LARGE_OUTPUT_FILES === false) {
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("env_disabled"),
      sizeEstimateTokens,
    });
    return await truncateMcpContentIfNeeded(E, credentials);
  }
  if (!E) return E;
  if (isMedia_2(E)) {
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("contains_images"),
      sizeEstimateTokens,
    });
    return await truncateMcpContentIfNeeded(E, credentials);
  }
  let timestamp = Date.now();
  let persistId = `mcp-${normalizeNameForMCP(name)}-${normalizeNameForMCP(tool)}-${timestamp}`;
  let re = stripTextBlockMeta(E);
  let he =
    useSubagentTruncationPrompt() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_singleton_unwrap", true);
  let blockCount = Array.isArray(re) ? re.length : undefined;
  let text =
    he &&
    Array.isArray(re) &&
    re.length === 1 &&
    re[0]?.type === "text" &&
    !("annotations" in re[0]) &&
    !("_meta" in re[0])
      ? re[0].text
      : undefined;
  let j = typeof re === "string" ? re : (text ?? jsonStringify(re, null, 2));
  let fe = type === "toolResult" || text !== undefined;
  let pe = fe ? "text" : "json";
  let lineStats;
  if (fe) {
    let lines = j.split(`
`);
    if (lines.length > 1 && lines.at(-1) === "") lines.pop();
    let L = 0;
    for (let line of lines) if (line.length > L) L = line.length;
    lineStats = {
      count: lines.length,
      maxLen: L,
    };
  }
  let ce = await persistToolResult(j, persistId, toolResultsDir(), storageV5);
  if (isPersistError(ce)) {
    if (toolResultStoreOrNull() !== undefined) {
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("not_stored"),
        sizeEstimateTokens,
      });
      return await truncateMcpContent(E);
    }
    let contentLength = j.length;
    logEvent("tengu_mcp_large_result_handled", {
      outcome: lit("truncated"),
      reason: lit("persist_failed"),
      sizeEstimateTokens,
    });
    return `Error: result (${contentLength.toLocaleString()} characters) exceeds maximum allowed tokens. Failed to save output to file: ${ce.error}. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data.`;
  }
  logEvent("tengu_mcp_large_result_handled", {
    outcome: lit("persisted"),
    reason: lit("file_saved"),
    sizeEstimateTokens,
    persistedSizeChars: ce.originalSize,
    truncatedAtCap: ce.truncatedAtBytes !== undefined,
    resultType: fromEnum(type),
    blockCount,
    persistedAs: fromEnum(pe),
  });
  let formatDescription =
    text !== undefined ? getFormatDescription("toolResult") : getFormatDescription(type, schema);
  return getLargeOutputInstructions(
    ce.filepath,
    ce.originalSize,
    formatDescription,
    undefined,
    lineStats,
    ce.truncatedAtBytes,
  );
}
//@ chunk-z1n5m6nf.js:140352-140524 layout
/**
 * parseUrlElicitationRequiredError：从工具调用错误 data 中取 elicitations 数组（URL elicitation required）。
 */
function parseUrlElicitationRequiredError_2(error) {
  let r = error.data;
  return (
    r != null && typeof r === "object" && "elicitations" in r && Array.isArray(r.elicitations)
      ? r.elicitations
      : []
  ).filter((s) => ElicitRequestURLParamsSchema_2.safeParse(s).success);
}
//@ chunk-z1n5m6nf.js:140524-140795 layout
/**
 * classifyToolCallAuthError：把工具调用认证错误分为 step_up（insufficient_scope）或 credential_rejected。
 */
function classifyToolCallAuthError_2({
  errorCode,
  message,
  isUnauthorizedError,
  isOAuthShapedAuthError,
  hasHeadersHelper,
  pendingStepUpScope,
}) {
  let S = pendingStepUpScope !== undefined;
  if (!(
    errorCode === 401 ||
    isUnauthorizedError ||
    isOAuthShapedAuthError ||
    (errorCode === 403 && hasHeadersHelper) ||
    (S && errorCode === 403)
  ))
    return;
  return S && errorCode !== 401 && !(isOAuthShapedAuthError && /^HTTP 401\b/.test(message))
    ? "step_up"
    : "credential_rejected";
}
//@ chunk-z1n5m6nf.js:140795-141020 layout
function isNeedsApprovalOrExpiredSessionV1(error) {
  if (isRefusedByCcrProxy(error)) return true;
  if (!(error instanceof Error) || !("code" in error)) return false;
  if (error.code === CCR_NEEDS_APPROVAL_CODE) {
    let r = "data" in error ? error.data : undefined;
    return typeof r === "object" && r !== null && "args_sha256" in r;
  }
  return error.code === -32000 && isApprovalMismatchMessage(error.message);
}
//@ chunk-z1n5m6nf.js:141020-145793 fingerprint = callMCPToolWithUrlElicitationRetry (0.408)
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
  let pe = false;
  for (let attempt = 0; ; attempt++)
    try {
      let ce = () =>
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
      let le;
      if (!isPerfettoTracingEnabled()) le = await ce();
      else {
        let k;
        try {
          k = truncateContentForTelemetry(jsonStringify(args)).content;
        } catch {
          k = undefined;
        }
        let L = isMemoryServerConnection(client, tool);
        let be = fileReferenceToolForRecords(client, tool);
        let W = L || withholdsFileReferenceArguments(be, toolUseId);
        let ze = withholdsFileReferenceErrorText(be, toolUseId);
        if (W && k !== undefined) k = notRecordedLength(k);
        le = await withToolExecutionSpan(
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
            ...(k !== undefined && {
              contentAttrs: {
                mcp_args: k,
              },
            }),
            withholdErrorText: (X) =>
              ze || (L && X instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS),
            isExpectedError: (X) =>
              X instanceof McpError &&
              (X.code === ErrorCode.UrlElicitationRequired ||
                (X.code === CCR_NEEDS_APPROVAL_CODE &&
                  typeof X.data === "object" &&
                  X.data !== null &&
                  "args_sha256" in X.data &&
                  !!ccrNeedsApprovalRetry &&
                  !!toolUseId &&
                  !pe &&
                  getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_proxy_needs_approval_retry", true))),
          },
          ce,
        );
      }
      if (pe) logFeatureOk("mcp_ccr_needs_approval");
      return le;
    } catch (error) {
      if (!(error instanceof McpError)) {
        if (pe && !(error instanceof McpSessionExpiredError))
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
        !pe &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_proxy_needs_approval_retry", true)
      ) {
        pe = true;
        let L = error.data ?? {};
        let {
          canUseTool,
          tool: tool_2,
          fullyQualifiedName,
          toolUseContext,
          parentMessage,
        } = ccrNeedsApprovalRetry;
        let Z = chromeSiteFromError(client, error.data);
        let Ne = Z && chromeSiteDenyCheck(Z, getToolPermissionContext(toolUseContext));
        if (Ne) {
          let xe = Z?.kind === "unreadable";
          logMCPDebug(
            client.name,
            `Tool '${tool}' returned -32003 needs_approval ${xe ? "naming a site this session cannot read, and the session has ClaudeInChromeDomain deny rules" : "for a site a ClaudeInChromeDomain deny rule covers"}: failing the call with no approval card`,
          );
          if (xe) logFeatureBad("chrome_permission_prompt", "hosted_site_unreadable");
          else logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
          await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, Ne);
          toolUseContext.onPermissionDenial?.(tool_2, toolUseId, args);
          throw markRefusedByCcrProxy(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              Ne.message,
              "ccr_proxy_needs_approval_chrome_site_denied",
            ),
          );
        }
        logMCPDebug(
          client.name,
          `Tool '${tool}' returned -32003 needs_approval (tool_name=${L.tool_name}) \u2014 surfacing retroactive ` +
            "approval card",
        );
        logEvent("tengu_mcp_proxy_needs_approval_retry", {
          attempt,
        });
        onAwaitingUserInput?.(true);
        let Te = {
          behavior: "ask",
          suppressAlwaysAllowRule: true,
          message: `The ${fullyQualifiedName} connector requires approval for this call.`,
          decisionReason: {
            type: "other",
            reason: "This connector call requires your approval to proceed.",
          },
        };
        let we = Z && chromeSiteAsk(Z, tool, args, toolUseContext);
        let Oe = we ?? Te;
        let De;
        try {
          De = await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, Oe);
        } finally {
          onAwaitingUserInput?.(false);
        }
        if (signal.aborted) throw markRefusedByCcrProxy(new AbortError());
        if (De.behavior === "allow") {
          if (De.updatedInput !== undefined && !En(De.updatedInput, args)) {
            logFeatureSad("mcp_ccr_needs_approval", "edited_input");
            throw markRefusedByCcrProxy(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `The approval for ${fullyQualifiedName} was conditioned on edited arguments, which can't be applied on this retroactive card. To run with different arguments, deny and re-issue the call.`,
                "ccr_proxy_needs_approval_edited_input",
              ),
            );
          }
          let xe = runDiscarder(toolUseContext.session, toolUseId);
          if (xe !== undefined)
            throw markRefusedByCcrProxy(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                xe,
                "ccr_proxy_needs_approval_resend_refused",
              ),
            );
          if (Z?.kind === "named" && we && meta) meta[CLAUDECODE_CHROMESITE] = Z.site;
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
        if (De === Oe) {
          logFeatureSad("mcp_ccr_needs_approval", "no_prompt_surface");
          throw markRefusedByCcrProxy(error);
        }
        logFeatureOk("mcp_ccr_needs_approval");
        throw markRefusedByCcrProxy(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            De.message || `Approval denied for ${fullyQualifiedName}`,
            "ccr_proxy_needs_approval_denied",
          ),
        );
      }
      if (error.code !== ErrorCode.UrlElicitationRequired) {
        if (pe) logFeatureBad("mcp_ccr_needs_approval", "retry_failed");
        else if (error.code === CCR_NEEDS_APPROVAL_CODE && ccrNeedsApprovalRetry)
          logFeatureBad("mcp_ccr_needs_approval", "arm_not_fired");
        throw error;
      }
      if (hostedDesktopRefusal_2(clientConnection) !== undefined) throw error;
      if (attempt - (pe ? 1 : 0) >= 3) throw error;
      let urlElicitationRequiredError = parseUrlElicitationRequiredError_2(error);
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
        let hookResponse = await runElicitationHooks(serverName, elicitation, signal);
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
        let finalResult = await runElicitationResultHooks(serverName, result, signal, "url", elicitationId);
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
//@ chunk-z1n5m6nf.js:145793-146321 layout
function toolErrorResultText_2(result, r, n) {
  if (!result.isError) return;
  let s = "Unknown error";
  if (Array.isArray(result.content) && result.content.length > 0) {
    let flattened = result.content.flatMap((S) => {
      if (S == null || typeof S !== "object") return [];
      if ("text" in S) return [String(S.text)];
      if (S.type === "resource_link") {
        let T = S;
        let M = `[Resource link: ${T.name}] ${T.uri}`;
        if (T.description) M += ` (${T.description})`;
        return [M];
      }
      return [];
    });
    if (flattened.length > 0)
      s = flattened.join(`
`);
  } else if ("error" in result) s = String(result.error);
  logMCPError(r, n === undefined ? s : n(s));
  let h = stripAnthropicMeta(result._meta);
  throw new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    s,
    "MCP tool returned error",
    h
      ? {
          _meta: h,
        }
      : undefined,
  );
}
//@ chunk-z1n5m6nf.js:146321-146498 layout
/**
 * buildSep2663TaskBinding：SEP-2663 任务绑定（implementation、serverCapabilities 与 tool/prompt/resource 回调）。
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
//@ chunk-z1n5m6nf.js:146498-146548 layout
/**
 * 调用旧客户端的 listTools。
 */
function listToolsV1(e, r) {
  return identityId2(e).listTools(undefined, r);
}
//@ chunk-z1n5m6nf.js:146548-146604 layout
/**
 * 调用旧客户端的 readResource。
 */
function readResourceV1(e, uri, n) {
  return identityId2(e).readResource(
    {
      uri,
    },
    n,
  );
}
//@ chunk-z1n5m6nf.js:146604-146657 layout
/**
 * 调用旧客户端的 callTool。
 */
function callToolV1(e, r, n) {
  return identityId2(e).callTool(r, undefined, n);
}
//@ chunk-z1n5m6nf.js:146657-155462 fingerprint = callMCPTool (0.37)
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
  let { client: client_2, name: q, config, transportErrorState } = client;
  let pe = identityId2(client_2);
  let ge = fileReferenceToolForRecords(client, tool);
  let ce = withholdsFileReferenceErrorText(ge, toolUseId) ? ge : undefined;
  let le = isMemoryServerConnection(client, tool)
    ? describeRedactedMcpError
    : ce !== undefined
      ? (Z) => withheldFileReferenceErrorForLog(ce, Z)
      : undefined;
  let toolStartTime = Date.now();
  let L = identityEpoch();
  let be = pe.transport?.sessionId === undefined;
  let W;
  let ze = meta?.["claudecode/toolUseId"];
  let X = {
    armedAt: 0,
    offCriticalPath,
    toolUseId: typeof ze === "string" ? ze : undefined,
    ownSends: {
      started: 0,
      ranNothing: 0,
    },
  };
  transportErrorState?.activeCallWatchdogs.add(X);
  let started = transportErrorState?.toolCallSends?.started;
  try {
    logMCPDebug(q, `Calling MCP tool: ${tool}`);
    let Z = idleTimeoutMs ?? getMcpToolIdleTimeoutMs_2(config);
    let Ne = toolStartTime;
    let Te;
    let promise = new Promise((resolve, reject) => {
      Te = reject;
    });
    W = setInterval(() => {
      let floored = Math.floor((Date.now() - toolStartTime) / 1000);
      logMCPDebug(q, `Tool '${tool}' still running (${floored}s elapsed)`);
      if (X.armedAt > 0 && Date.now() - X.armedAt > 90000) {
        logMCPDebug(
          q,
          `Tool '${tool}' aborting: transport error ${Math.floor((Date.now() - X.armedAt) / 1000)}s ago, response presumed lost`,
        );
        Te(
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP server "${q}" transport dropped mid-call; response for tool "${tool}" was lost`,
              "MCP transport lost mid-call",
            ),
            {
              mcpErrorSource: "downstream_unreachable",
            },
          ),
        );
        return;
      }
      if (transportErrorState?.pendingElicitations) Ne = Date.now();
      else if (transportErrorState && transportErrorState.lastElicitationClosedAt > Ne)
        Ne = transportErrorState.lastElicitationClosedAt;
      if (Z > 0 && Date.now() - Ne > Z) {
        let elapsedSeconds = Math.floor((Date.now() - Ne) / 1000);
        logMCPDebug(
          q,
          `Tool '${tool}' aborting: no response or progress notification for ${elapsedSeconds}s (idle timeout ${Math.floor(Z / 1000)}s)`,
        );
        Te(
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP server "${q}" tool "${tool}" sent no response or progress for ${elapsedSeconds}s; aborting. If this server is configured in your MCP settings, set a per-server "timeout" (ms) to allow longer silent runs for just this server; otherwise set CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT (ms) globally (0 disables).`,
              "MCP tool idle timeout",
            ),
            {
              mcpErrorSource: "downstream_unreachable",
            },
          ),
        );
      }
    }, 30000);
    let mcpToolTimeoutMs = getMcpToolTimeoutMs_3(config);
    let De;
    let timeoutPromise = new Promise((resolve, reject) => {
      De = setTimeout(
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
        q,
        tool,
        mcpToolTimeoutMs,
      );
    });
    let He = () => {
      if (De) clearTimeout(De);
      if (W !== undefined) {
        clearInterval(W);
        W = undefined;
      }
      transportErrorState?.activeCallWatchdogs.delete(X);
    };
    let Fe = timing?.mark("external");
    let result = await Promise.race([
      pe.callTool(
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
            X.armedAt = 0;
            Ne = Date.now();
            netModule?.reportBackgroundProgress(signal, sdkProgress);
            if (onProgress)
              onProgress({
                type: "mcp_progress",
                status: "progress",
                serverName: q,
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
      He();
      Fe?.();
    });
    toolErrorResultText_2(result, q, le);
    let Ie = Date.now() - toolStartTime;
    let ve =
      Ie < 1000
        ? `${Ie}ms`
        : Ie < 60000
          ? `${Math.floor(Ie / 1000)}s`
          : `${Math.floor(Ie / 60000)}m ${Math.floor((Ie % 60000) / 1000)}s`;
    logMCPDebug(q, `Tool '${tool}' completed successfully in ${ve}`);
    let codeIndexingTool = detectCodeIndexingFromMcpServerName(q);
    if (codeIndexingTool)
      logEvent("tengu_code_indexing_tool_used", {
        tool: fromEnum(codeIndexingTool),
        source: lit("mcp"),
        success: true,
      });
    let content = await processMCPResult_2(
      result,
      tool,
      q,
      imageLimits,
      hasResultSizeAnnotation,
      storageV5,
      credentials,
      resultNotForModel,
    );
    noteHearthDegraded(q, undefined);
    return {
      content,
      _meta: result._meta,
      structuredContent: result.structuredContent,
      resourceLinks: anthropicResourceLinks(result.content),
    };
  } catch (error) {
    if (!signal.aborted) noteHearthDegraded(q, error);
    if (W !== undefined) clearInterval(W);
    transportErrorState?.activeCallWatchdogs.delete(X);
    let Ne = Date.now() - toolStartTime;
    if (error instanceof Error && error.name !== "AbortError")
      logMCPDebug(
        q,
        `Tool '${tool}' failed after ${Math.floor(Ne / 1000)}s: ${le !== undefined && error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? le(error.message) : ce !== undefined ? withheldFileReferenceErrorForLog(ce, error.message, error.name) : describeConnectError(error, config)}`,
      );
    if (error instanceof Error) {
      let we = error instanceof McpError ? undefined : "code" in error ? error.code : undefined;
      let Oe =
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
      let Fe = classifyToolCallAuthError_2({
        errorCode: we,
        message: error.message,
        isUnauthorizedError: error instanceof UnauthorizedError,
        isOAuthShapedAuthError,
        hasHeadersHelper: Oe,
        pendingStepUpScope,
      });
      let Ue =
        (config.type === "http" || config.type === "sse") &&
        !config.headersHelper &&
        !configHasAuthorizationHeader(config)
          ? config
          : undefined;
      let Ie = !isAuthRetry && Fe === "credential_rejected" && !Oe && Ue !== undefined;
      let ve = Ie && (await hasStoredRefreshToken(q, Ue));
      let Ee =
        ve ||
        (Ie &&
          isSignedOutFallbackEnabled() &&
          getCliOwnedState().clientAuthProviders.get(identityId2(client_2))?.lastAuthRejection?.status ===
            401 &&
          getCliOwnedState().clientAuthProviders.get(identityId2(client_2))?.lastAuthRejection
            ?.accessToken !== undefined);
      if ((Oe || isSessionExpired || Ue !== undefined) && !isAuthRetry) {
        let ke = serverCacheKey(q, config);
        if (identityEpoch() !== L)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `MCP tool call to server "${q}" was aborted: the account changed before re-authentication`,
            "MCP tool call aborted: account changed before reauth",
          );
        let reauthInFlight = getConnectionCache().reauthInFlight;
        let cliOwnedState = getCliOwnedState();
        let Ae = reauthInFlight.get(ke);
        let promise = Ae !== undefined && Ae.epoch === L ? Ae.promise : undefined;
        cliOwnedState.reauthDecisionSinkForTest?.(
          promise !== undefined ? "joined" : Ae !== undefined ? "stale_refused" : "started",
        );
        let ot =
          promise !== undefined &&
          error instanceof McpError &&
          error.code === ErrorCode.ConnectionClosed &&
          !isTruncatedBodyError(transportErrorState?.closeReason);
        if (
          (ot ||
            (Fe === "credential_rejected" && Oe) ||
            (Fe === "credential_rejected" && isSessionExpired) ||
            Ee) &&
          !isMcpServerDisabled(q) &&
          !isMcpServerBlockedAtConnectTime(q, config)
        ) {
          logMCPDebug(
            q,
            Oe
              ? `Tool '${tool}' returned ${we ?? 401}; re-running headersHelper and retrying once`
              : isSessionExpired
                ? `Tool '${tool}' returned ${we ?? 401}; session credential rejected \u2014 reconnecting and retrying once`
                : ot
                  ? `Tool '${tool}' failed because a reconnect in progress closed its connection; retrying once on the new connection`
                  : `Tool '${tool}' returned ${we ?? 401}; ${ve ? "refresh token stored" : "stored sign-in rejected, no refresh token"} \u2014 reconnecting and retrying once`,
          );
          if (ot) logFeatureSad(Oe ? "mcp_headers_helper" : "mcp_oauth_refresh", "collateral_rejoin");
          if (!promise) {
            logFeatureSad(
              Oe ? "mcp_headers_helper" : Ee && !ve ? "mcp_signed_out_fallback" : "mcp_oauth_refresh",
              "reauth_retry",
            );
            pe.onclose = undefined;
            let P = L;
            promise = (async () => {
              await clearServerCache_4(q, config);
              return connectToServer_2(q, config, undefined, undefined, credentials);
            })();
            let x = {
              promise,
              epoch: P,
            };
            reauthInFlight.set(ke, x);
            promise
              .then((D) => {
                if (D.type === "connected" && identityEpoch() === P) REAUTH_RECONNECT_SIGNAL.emit(q, config);
              })
              .finally(() => {
                if (reauthInFlight.get(ke) === x && !cliOwnedState.holdStaleReauthEntryForTest)
                  reauthInFlight.delete(ke);
              })
              .catch(() => {});
          }
          let ee = await promise;
          if (identityEpoch() !== L) {
            if (ee.type === "connected") await detachAndCloseConnection_2(ee);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP tool call to server "${q}" was aborted: the account changed during re-authentication`,
              "MCP tool call aborted: account changed during reauth",
            );
          }
          if (
            ee.type === "connected" &&
            (isMcpServerDisabled(q) || isMcpServerBlockedAtConnectTime(q, config))
          )
            await clearServerCache_4(q, config);
          else if (ee.type === "connected")
            return callMCPTool_2({
              client: ee,
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
          logMCPDebug(q, `Auth reconnect returned '${ee.type}'; falling through to needs-auth`);
          if (isDiscoveryCacheOn() && ee.type !== "needs-auth") {
            let P = connectToServer_2.cache?.get?.(ke);
            if (
              P !== undefined &&
              (await settleWithinDeadline(P)) === ee &&
              connectToServer_2.cache?.get?.(ke) === P
            )
              getConnectionCache().connections.delete(ke);
          }
        }
      }
      if (Fe === "credential_rejected" && isSessionExpired) {
        await clearServerCache_4(q, config);
        logMCPDebug(
          q,
          `Tool '${tool}' rejected the session credential (${we ?? 401}); failing the call and clearing the connection for a fresh retry later`,
        );
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            AUTH_MESSAGES.sessionCredentialRejected(q, we ?? 401),
            "MCP server rejected the session credential",
          ),
          {
            mcpErrorSource: "other",
          },
        );
      }
      if (Fe !== undefined) {
        let ke = config.type === "claudeai-proxy" && config.eligible === false;
        let authErrorKind = ke ? "not_connected" : Fe === "step_up" ? "insufficient_scope" : "token_expired";
        logMCPDebug(
          q,
          authErrorKind === "insufficient_scope"
            ? `Tool call returned 403 insufficient_scope (scope: ${redactSensitiveUrlParams("scope", pendingStepUpScope ?? "")})`
            : "Tool call returned 401 Unauthorized - token may have expired",
        );
        let ye = mcpBaseUrlAnalytics(config, q);
        let Ae = isMcpServerLoggableInAnalytics(q, config);
        logEvent("tengu_mcp_tool_call_auth_error", {
          errorCode: fromNumber(we ?? (Fe === "step_up" ? 403 : 401)),
          transportType: fromEnum(config.type ?? "stdio"),
          authErrorKind: fromEnum(authErrorKind),
          ...ye,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(normalizeNameForMCP(q), Ae),
          mcpToolName: loggableMcpToolName(normalizeNameForMCP(q), normalizeNameForMCP(tool), Ae),
        });
        let $e = (config.type === "http" || config.type === "sse") && configHasAuthorizationHeader(config);
        throw new McpAuthError(
          q,
          ke
            ? AUTH_MESSAGES.notConnected(q)
            : authErrorKind === "insufficient_scope"
              ? AUTH_MESSAGES.stepUp(q, pendingStepUpScope)
              : Oe
                ? AUTH_MESSAGES.helperRejected(q)
                : $e
                  ? AUTH_MESSAGES.headerRejected(q)
                  : AUTH_MESSAGES.signInAgain(q),
          authErrorKind,
          getCliOwnedState().clientFirstPartyBearers.get(identityId2(client_2))?.last,
          authErrorKind === "insufficient_scope" ? pendingStepUpScope : undefined,
        );
      }
      let te = !(config.type === "http" && we === 404 && be) && isMcpSessionExpiredError_2(error);
      let Pe =
        "code" in error &&
        error.code === -32000 &&
        error.message.includes("Connection closed") &&
        (config.type === "http" || config.type === "claudeai-proxy");
      if (error instanceof HttpBodyOverflowError_2)
        throw new McpToolResultNotReadError(q, tool, {
          kind: "too_large",
          capBytes: HTTP_BODY_LIMITS,
        });
      if (Pe && isTruncatedBodyError(transportErrorState?.closeReason))
        throw new McpToolResultNotReadError(q, tool, {
          kind: "connection_closed",
        });
      if (te || Pe) {
        logMCPDebug(
          q,
          `MCP session expired during tool call (${te ? "stale session" : "connection closed"}), clearing connection cache for re-initialization`,
        );
        let ke = mcpBaseUrlAnalytics(config, q);
        let oe = isMcpServerLoggableInAnalytics(q, config);
        let mcpToolName = loggableMcpToolName(normalizeNameForMCP(q), normalizeNameForMCP(tool), oe);
        logEvent("tengu_mcp_session_expired", {
          errorCode: we !== undefined ? fromNumber(we) : undefined,
          transportType: fromEnum(config.type ?? "stdio"),
          ...ke,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(normalizeNameForMCP(q), oe),
          mcpToolName,
        });
        await clearServerCache_4(q, config);
        let Ae = didCallRunNothing(transportErrorState?.toolCallSends, started, X.ownSends);
        throw new McpSessionExpiredError(
          q,
          te
            ? "session_expired_404"
            : isMalformedAfterAuthChallenge(transportErrorState?.closeReason) ||
                (transportErrorState?.closeReason === "session expired" && Ae)
              ? "connection_closed_call_refused"
              : !isAuthRetry && Ae
                ? "connection_closed_call_not_run"
                : "connection_closed_http",
        );
      }
    }
    let Te = error;
    if (
      error instanceof ZodError ||
      ((Te?.name === "ZodError" || Te?.name === "$ZodError") && Array.isArray(Te?.issues))
    )
      throw new McpResponseSchemaError(q, error);
    if (!(error instanceof Error) || error.name !== "AbortError") throw error;
    return {
      content: INTERRUPTED_CALL_NOTICE,
      interrupted: true,
      isError: true,
    };
  } finally {
    if (W !== undefined) clearInterval(W);
  }
}
//@ chunk-z1n5m6nf.js:156945-158868 placement
async function connectAllMcpServers(e, sendMcpMessage, n, s) {
  let h = [];
  let y = [];
  let S = [];
  primeEnsureConnectedClient();
  let settled = await Promise.allSettled(
    Object.entries(e).map(async ([key, value]) => {
      let E = new SdkControlClientTransport(key, sendMcpMessage, validateHostManifest_2(key, n?.get(key)));
      guardTransportSend(
        {
          name: key,
        },
        E,
      );
      let Q = new Client(
        {
          ...A_t,
          version:
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION ?? "unknown",
        },
        {
          capabilities: T_t,
          ...(isDisklessContext() && {
            jsonSchemaValidator: NO_OP_SCHEMA_VALIDATOR,
          }),
        },
      );
      let H = false;
      try {
        let U = Q.connect(E, {
          timeout: getConnectionTimeoutMs(),
        });
        if (
          !(await withDeadline(
            U.then(() => true),
            getConnectionTimeoutMs(),
          ))
        ) {
          U.catch(() => {});
          E.close().catch(() => {});
          H = true;
          throw makeConnectTimeoutError(
            `SDK MCP server "${key}" connection timed out after ${getConnectionTimeoutMs()}ms`,
          );
        }
        let serverCapabilities = Q.getServerCapabilities();
        let instructions = Q.getInstructions();
        let instructions_2 = truncateServerInstructions_2(instructions, key);
        let j = {
          type: "connected",
          serverInfo: Q.getServerVersion(),
          name: key,
          capabilities: serverCapabilities || {},
          instructions: instructions_2,
          client: identityId(Q),
          config: {
            ...value,
            scope: "dynamic",
          },
          cleanup: async () => {
            await Q.close();
          },
        };
        let fe = serverCacheKey(j.name, j.config);
        getConnectionCache().toolLists.delete(fe);
        let pe = [];
        if (serverCapabilities?.tools) {
          let ce = await listMcpTools(j, s);
          pe.push(...ce);
        }
        let commands = [];
        logFeatureOk("mcp_sdk_connect");
        logManifestOutcomeV1(E.manifestOutcome, true);
        return {
          client: j,
          tools: pe,
          commands,
        };
      } catch (error) {
        logFeatureBad("mcp_sdk_connect", H ? "mcp_sdk_connect_timeout" : "mcp_sdk_connect_failed");
        logManifestOutcomeV1(E.manifestOutcome, false);
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
  for (let w of settled)
    if (w.status === "fulfilled") {
      h.push(w.value.client);
      y.push(...w.value.tools);
      S.push(...w.value.commands);
    }
  if (h.some((w) => w.type === "connected" && !!w.capabilities?.resources)) {
    if (![ListMcpResourcesTool, ReadMcpResourceTool].some((R) => y.some((E) => toolMatchesName(E, R.name))))
      y.push(ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool);
  }
  return {
    clients: h,
    tools: y,
    commands: S,
  };
}
//@ chunk-z1n5m6nf.js:158868-159057 placement
async function clearServerCache_2(e) {
  await Promise.all(
    e.map(async (r) => {
      if (r.type !== "connected") return;
      try {
        await r.cleanup();
      } catch (error) {
        logForDebugging(`MCP client cleanup failed for ${r.name}: ${error}`, {
          level: "error",
        });
      }
    }),
  );
}
//@ chunk-e6aww6q8.js:2145813-2145923 placement
/**
 * 判断 MCP 输出截断时是否使用子代理提示（环境变量覆盖优先，否则看开关）。
 */
function useSubagentTruncationPrompt() {
  let MCP_TRUNCATION_PROMPT_OVERRIDE = env.MCP_TRUNCATION_PROMPT_OVERRIDE;
  return MCP_TRUNCATION_PROMPT_OVERRIDE
    ? MCP_TRUNCATION_PROMPT_OVERRIDE !== "legacy"
    : getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_subagent_prompt", false);
}
//@ chunk-e6aww6q8.js:3289283-3289667 fingerprint = ensureConnectedClient (0.344)
/**
 * ensureConnectedClient：按名字找客户端并确认已连接，找不到列出可用服务器名报错。
 */
function ensureConnectedClient_2(clients, serverName) {
  let [r] = findServersByName(clients, serverName);
  if (!r)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Server "${serverName}" not found. Available servers: ${clients.map((client) => client.name).join(", ")}`,
      "MCP server not found",
    );
  if (!isConnectedOrCached(r))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Server "${r.name}" is not connected`,
      "MCP server not connected",
    );
  if (!r.capabilities?.resources)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Server "${r.name}" does not support resources`,
      "MCP server has no resources capability",
    );
  return r;
}
//@ chunk-e6aww6q8.js:3806756-3806859 placement
/**
 * 判断 MCP 配置的 URL 是否为空（未配置）。
 */
function isUnconfiguredUrl(e) {
  return e.configErrorReason === "url_empty" || (!e.configError && "url" in e && e.url.trim() === "");
}
//@ chunk-e6aww6q8.js:3806859-3807903 placement
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
    ...we
  } = config;
  let canonical = we;
  delete canonical.tools;
  delete canonical.discoveryCache;
  delete canonical.cachedInitResponse;
  delete canonical.cachedDiscoverResponse;
  delete canonical.discoverSupport;
  delete canonical.eligible;
  delete canonical.ineligibleReason;
  delete canonical.enterpriseManaged;
  if (canonical.type === "stdio" || (canonical.type === undefined && "command" in canonical)) {
    canonical.type = "stdio";
    canonical.args = canonical.args ?? [];
  }
  let urlParts =
    typeof canonical.url === "string" && URL.canParse(canonical.url)
      ? /^([^?#]*\?)([^#]*)(.*)$/s.exec(canonical.url)
      : null;
  if (urlParts) {
    let [, Me = "", We = "", ze = ""] = urlParts;
    canonical.url =
      Me +
      We.split("&")
        .sort((lt, Je) => {
          let nt = firstLineOf(lt, "=");
          let pt = firstLineOf(Je, "=");
          return nt < pt ? -1 : nt > pt ? 1 : 0;
        })
        .join("&") +
      ze;
  }
  if (isUnconfiguredUrl(config)) canonical.unconfigured = true;
  if (agentSource !== undefined) canonical.agentSource = agentSource;
  return jsonStringify(canonical, (Me, We) => {
    if (We && typeof We === "object" && !Array.isArray(We)) {
      let ze = We;
      let lt = Object.create(null);
      for (let key of Object.keys(ze).sort()) lt[key] = ze[key];
      return lt;
    }
    return We;
  });
}
//@ chunk-e6aww6q8.js:3807903-3807980 placement
/**
 * 配置内容的 SHA-256 前 16 位（缓存键）。
 */
function configHash(config) {
  return createHash("sha256").update(canonicalMcpConfigKey(config)).digest("hex").slice(0, 16);
}
//@ chunk-e6aww6q8.js:3807980-3808019 placement
/**
 * 服务器缓存键（名字 + 配置哈希）。
 */
function serverCacheKey(e, config) {
  return `${e}-${configHash(config)}`;
}
//@ chunk-e6aww6q8.js:3808134-3808155 placement
var CU_DESKTOP_BINARY_NAME = "cu-desktop";
//@ chunk-e6aww6q8.js:3808155-3808308 placement
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
    allowedTools: READ_ONLY_CU_ACTIONS.map((e) => buildMcpToolName(COMPUTER_USE_MCP_SERVER_NAME, e)),
  };
}
//@ chunk-e6aww6q8.js:3808308-3808421 placement = getServerCommandArray (1)
function isDesktopComputerUseCommand(config) {
  return (
    (config.type === undefined || config.type === "stdio") &&
    [config.command, ...(config.args ?? [])].some((n) => n?.includes(CU_DESKTOP_BINARY_NAME))
  );
}
//@ chunk-e6aww6q8.js:3874164-3874197 placement
/**
 * 取可安全记录进日志的服务器源地址。
 */
function loggingSafeOrigin(serverConfig) {
  return safeOrigin(getLoggingSafeMcpBaseUrl(serverConfig));
}
//@ chunk-e6aww6q8.js:3874197-3874221 placement
/**
 * 按宿主保存的回合调度器映射。
 */
var turnsByHost = new HostScoped(() => ({}));
//@ chunk-e6aww6q8.js:3874221-3874328 placement
/**
 * 在当前回合调度器中映射执行（没有调度器时直接映射）。
 */
async function mapInTurns(e, n) {
  let { turns } = turnsByHost.of(getRootSession().host);
  return turns === undefined ? e.map((s) => n(s)) : turns.mapInTurns(e, n);
}
//@ chunk-e6aww6q8.js:3874328-3874407 placement
/**
 * 工具描述的最大长度（环境变量可覆盖）。
 */
function maxDescriptionLength(e = false) {
  return (
    env.CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH ?? (e ? MAX_STRUCTURED_RESULT_CHARS : MAX_CALL_MARK_CHARS)
  );
}
//@ chunk-e6aww6q8.js:3874407-3874856 placement
/**
 * 检测工具描述中工具调用 XML 的标记：invoke 标签与常见 HTML 标签名（不视为参数名）。
 */
var INVOKE_TAG_MARKERS = [
  "<invoke>",
  "<invoke ",
  "<invoke\t",
  `<invoke
`,
  "</invoke>",
];
var COMMON_HTML_TAGS = new Set([
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
//@ chunk-e6aww6q8.js:3874856-3875447 placement
/**
 * 检查 MCP 工具描述与参数描述中是否含工具调用式 XML：invoke 标签，或以参数名为标签名的标记。
 */
function detectToolCallXml(tool, maxDescChars) {
  let properties = tool.inputSchema?.properties ?? {};
  let propertyNames = Object.keys(properties);
  let texts = [];
  if (tool.description) texts.push(tool.description.slice(0, maxDescChars));
  for (let propertyName of propertyNames) {
    let G = properties[propertyName];
    let description = G && typeof G === "object" && "description" in G ? G.description : undefined;
    if (typeof description === "string") texts.push(description);
  }
  if (texts.length === 0) return;
  let joined = texts.join(`
`);
  if (!joined.includes("<")) return;
  let lower = joined.toLowerCase();
  if (INVOKE_TAG_MARKERS.some((L) => lower.includes(L))) return "invoke";
  let paramTags = new Set();
  for (let propertyName of propertyNames) {
    let lower = propertyName.toLowerCase();
    if (propertyName.length >= 4 && !COMMON_HTML_TAGS.has(lower)) paramTags.add(lower);
  }
  for (let [, L = ""] of lower.matchAll(/<([^<>]*)>/g))
    if (paramTags.has(L) || (L.startsWith("/") && paramTags.has(L.slice(1)))) return "param";
  return;
}
//@ chunk-e6aww6q8.js:3875447-3875943 placement
/**
 * 统计并上报 MCP 服务器工具描述与说明中含工具调用式 XML 的情况。
 */
async function logToolCallXmlInDescriptions(e, name, r, s, instructions) {
  let maxDescChars = maxDescriptionLength(true);
  let S = 0;
  let w = 0;
  let L;
  let G = await mapInTurns(e, (tool) => detectToolCallXml(tool, maxDescChars));
  for (let [ke, we] of G.entries()) {
    if (we === undefined) continue;
    if (we === "invoke") S++;
    else w++;
    L ??= e[ke]?.name;
  }
  let lower = instructions?.slice(0, maxDescriptionLength()).toLowerCase();
  let Z = lower !== undefined && INVOKE_TAG_MARKERS.some((ke) => lower.includes(ke));
  let Se = S + w;
  if (Se === 0 && !Z) return;
  logEvent("tengu_mcp_description_contains_toolcall_xml", {
    matchedToolCount: Se,
    invokeCount: S,
    paramCount: w,
    instructionsMatch: Z,
    sampleToolName: L ? loggableMcpToolName(name, L, r) : undefined,
    mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(name, r),
    ...(s && {
      mcpServerBaseUrl: s,
    }),
  });
}
//@ chunk-e6aww6q8.js:3875943-3875971 placement
/**
 * 类似标签名的最大长度（256）。
 */
var INVOKE_CLOSE_TAG = "</invoke>";
var MAX_URL_LIKE_TAG_CHARS = 256;
//@ chunk-e6aww6q8.js:3875971-3876067 placement
function mcpToolInputToAutoClassifierInput_2(input, toolName) {
  return (
    input.length >= toolName.length && input.slice(-toolName.length).toLowerCase() === toolName.toLowerCase()
  );
}
//@ chunk-e6aww6q8.js:3876067-3876972 placement
/**
 * 去掉 MCP 工具参数末尾多余的 invoke 结束标签。
 */
function stripTrailingInvokeSuffix(e, name, name_2, s, featureValue_CACHED_MAY_BE_STALE, y) {
  let S = e;
  for (let [key, value] of Object.entries(e)) {
    if (typeof value !== "string") continue;
    let G = value.length - 1;
    while (
      G >= 0 &&
      (value.charCodeAt(G) === 32 ||
        value.charCodeAt(G) === 9 ||
        value.charCodeAt(G) === 10 ||
        value.charCodeAt(G) === 13)
    )
      G--;
    if (G >= 0) {
      let code = value.charCodeAt(G);
      if (code >= 33 && code <= 126 && code !== 62) continue;
    }
    let q = value.trimEnd();
    if (!mcpToolInputToAutoClassifierInput_2(q, INVOKE_CLOSE_TAG)) continue;
    q = q.slice(0, -INVOKE_CLOSE_TAG.length).trimEnd();
    let toolName = `</${key}>`;
    let Se = mcpToolInputToAutoClassifierInput_2(q, toolName);
    if (Se) q = q.slice(0, -toolName.length).trimEnd();
    let ke =
      Se &&
      (key.length > MAX_URL_LIKE_TAG_CHARS ||
        new RegExp(`<${urlPatternToRegex_2(key)}[\\s>/]`, "i").test(value));
    let we = !Se ? lit("param_close") : ke ? lit("open_guard") : undefined;
    logEvent("tengu_mcp_arg_trailing_invoke_suffix", {
      wouldStrip: we === undefined,
      missKind: we,
      flagOn: featureValue_CACHED_MAY_BE_STALE,
      paramNameLen: key.length,
      strippedToLen: q.length,
      mcpToolName: loggableMcpToolName(name_2, name, s),
      mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(name_2, s),
      ...(y && {
        mcpServerBaseUrl: y,
      }),
    });
    if (we !== undefined || !featureValue_CACHED_MAY_BE_STALE) continue;
    if (S === e)
      S = {
        ...e,
      };
    S[key] = q;
    logMCPDebug(name_2, `stripped trailing </${key}></invoke> from ${name}.${key} (model emission artifact)`);
  }
  return S;
}
//@ chunk-e6aww6q8.js:3876972-3877861 placement
/**
 * 工具输入缺少必填参数时收集诊断：必填数、缺失数、已有键数、最长字符串长度，以及字符串值里是否残留 </parameter>、</invoke> 或参数名闭合标签之类伪标签碎片。
 */
function describeMissingRequiredArgs(input, schema) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input) || schema === undefined)
      return null;
    let required = schema.required;
    if (!Array.isArray(required) || required.length === 0) return null;
    let filtered = required.filter((G) => typeof G === "string");
    if (filtered.length === 0) return null;
    let h = input;
    let reduced = filtered.reduce((acc, q) => acc + (Object.hasOwn(h, q) ? 0 : 1), 0);
    if (reduced === 0) return null;
    let S = new Set(
      [...Object.keys(schema.properties ?? {}), ...filtered]
        .filter((G) => G.length >= 4 && !COMMON_HTML_TAGS.has(G.toLowerCase()))
        .map((G) => G.toLowerCase()),
    );
    let w = 0;
    let L = false;
    for (let G of Object.values(h)) {
      if (typeof G !== "string") continue;
      if (G.length > w) w = G.length;
      if (L) continue;
      let lower = G.toLowerCase();
      if (
        lower.includes("</parameter>") ||
        lower.includes("<parameter name=") ||
        lower.includes("</invoke>")
      ) {
        L = true;
        continue;
      }
      for (let [, Z = ""] of lower.matchAll(/<\/([^<>]*)>/g))
        if (S.has(Z)) {
          L = true;
          break;
        }
    }
    return {
      requiredCount: filtered.length,
      missingCount: reduced,
      presentKeyCount: Object.keys(h).length,
      maxStringValueLen: w,
      hasPseudoTagDebris: L,
    };
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:4340451-4340529 fingerprint = getMcpAuthCache (1)
function getMcpAuthCache(e) {
  return typeof e === "string" ? e : Buffer.from(e).toString("utf-8");
}
//@ chunk-cyj440je.js:715-954 fingerprint = McpAuthError (0.526)
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
//@ chunk-cyj440je.js:954-1049 layout
/**
 * McpToolFileInputRejectedError：MCP 工具文件输入被拒绝。
 */
class McpToolFileInputRejectedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  constructor(error, code) {
    super(error, "MCP tool file input rejected");
    this.code = code;
  }
}
//@ chunk-cyj440je.js:1049-1697 fingerprint = McpSessionExpiredError (0.409)
/**
 * McpSessionExpiredError：HTTP 会话过期（404）或连接关闭时抛出，expiryKind 区分原因。
 */
class McpSessionExpiredError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  expiryKind;
  constructor(e, r = "session_expired_404") {
    super(
      r === "connection_closed_http"
        ? `MCP server "${e}" connection closed before the tool call was answered. The tool may have run: check whether it did before running it again.`
        : r === "connection_closed_call_not_run"
          ? `MCP server "${e}" connection closed before the tool call ran`
          : `MCP server "${e}" session expired`,
      "MCP session expired",
    );
    this.expiryKind = r;
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
}
//@ chunk-cyj440je.js:1697-2321 layout
/**
 * McpCredentialStoreUnavailableError：凭证存储读不了（如 macOS 钥匙串锁定）时抛出，消息给出处理办法。
 */
class McpCredentialStoreUnavailableError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  constructor(serverName, r = "unreadable") {
    if (r === "unreadable")
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
}
//@ chunk-cyj440je.js:2321-2427 fingerprint = McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (0.82)
/**
 * MCP 工具调用失败的错误类（name 为 McpToolCallError），在通用错误基础上携带服务器返回的 `_meta`（mcpMeta），供遥测与结果展示。
 */
class McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  mcpMeta;
  constructor(message, telemetryMessage, mcpMeta, n) {
    super(message, telemetryMessage, n);
    this.mcpMeta = mcpMeta;
    this.name = "McpToolCallError";
  }
}
//@ chunk-7zr1t9gr.js:302-360 placement
/**
 * MCP 服务器不被允许时的错误文案。
 */
var MCP_SERVER_NOT_ALLOWED_MESSAGE = "Error POSTing to endpoint: MCP server not allowed";
//@ chunk-7zr1t9gr.js:667-722 placement
/**
 * 取 artifacts 的 MCP 客户端。
 */
function artifactsMcpClient() {
  return (getMcpClientsFromAccessor() ?? []).find((t) => t.name === CLAUDE_ARTIFACTS);
}
//@ chunk-7zr1t9gr.js:722-780 placement
/**
 * 取“该行未被服务”的记录。
 */
function getMcpEntryRowNotServed() {
  return hasLiveState() ? getLiveState().mcpEntryRowNotServed : null;
}
//@ chunk-7zr1t9gr.js:780-813 placement
/**
 * 判断某行是否正是未服务的记录。
 */
function isEntryRowNotServed(t) {
  return getMcpEntryRowNotServed() === t;
}
//@ chunk-3pdgd98q.js:226-303 fingerprint = getConnectionTimeoutMs (1)
/**
 * MCP 连接超时：env `MCP_TIMEOUT`（>0，上限 2^31-1）否则默认 30000ms。
 */
function getConnectionTimeoutMs() {
  let MCP_TIMEOUT = env.MCP_TIMEOUT;
  return MCP_TIMEOUT && MCP_TIMEOUT > 0 ? Math.min(MCP_TIMEOUT, 2147483647) : 30000;
}
//@ chunk-3pdgd98q.js:303-391 placement
/**
 * 连接超时（MCP_CONNECT_TIMEOUT_MS，默认 5000）。
 */
function getConnectTimeoutMs() {
  let MCP_CONNECT_TIMEOUT_MS = env.MCP_CONNECT_TIMEOUT_MS;
  return MCP_CONNECT_TIMEOUT_MS && MCP_CONNECT_TIMEOUT_MS > 0
    ? Math.min(MCP_CONNECT_TIMEOUT_MS, 2147483647)
    : 5000;
}
//@ chunk-3pdgd98q.js:391-421 placement
/**
 * 短暂重试间隔（500 毫秒）。
 */
var TRANSPORT_FALLBACK_TIMEOUT_MS = 2000;
var REMOTE_CONNECT_TIMEOUT_MS = 8000;
var SHORT_RETRY_MS = 500;
//@ chunk-qsdkv90t.js:302-371 placement
/**
 * 懒加载 MCP 客户端模块。
 */
function mcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-qsdkv90t.js:371-1385 placement
async function refreshMcpServerTools(e, c, storageV5) {
  let i = serverCacheKey(e.name, e.config);
  let {
    captureDiscoveryGrantLeg,
    ensureDiscoveryCacheAccount,
    getMcpIdentityEpoch,
    persistRefreshedToolsIfPresent,
  } = mcpClientModule();
  ensureDiscoveryCacheAccount();
  let a = isDiscoveryCacheOn() ? captureDiscoveryGrantLeg(e.name, e.config) : undefined;
  let toolRefreshSequences = getCliOwnedState().toolRefreshSequences;
  let r = toolRefreshSequences.get(e) ?? {
    started: 0,
    applied: 0,
  };
  toolRefreshSequences.set(e, r);
  r.started += 1;
  let started = r.started;
  let { fetchToolsForClient } = mcpClientModule();
  let previousToolsPromise = fetchToolsForClient.cache.get(i);
  let identityEpoch = getMcpIdentityEpoch();
  fetchToolsForClient.cache.delete(i);
  let toolsForClient = await fetchToolsForClient(e, storageV5);
  let toolsListErrorForResult = mcpClientModule().getToolsListErrorForResult(toolsForClient);
  if (toolsListErrorForResult)
    return {
      status: "kept-previous",
      error: toolsListErrorForResult,
    };
  if (e.discoveryAuthFailure && toolsForClient.length === 0)
    return {
      status: "kept-previous",
      error:
        "the server rejected tool discovery as unauthorized \u2014 the user needs to authorize this connector (e.g. via /mcp) before its tools are available",
    };
  if (r.applied > started)
    return {
      status: "kept-previous",
      error:
        "superseded by a newer concurrent refresh of this server \u2014 the newer refresh result is the one applied",
    };
  r.applied = started;
  c(e.name, decorateMcpTools(e, toolsForClient));
  if (a)
    a.then((grantLeg) =>
      persistRefreshedToolsIfPresent(e, toolsForClient, {
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
//@ chunk-18hwfzwa.js:682582-682744 fingerprint = processBatched (1)
async function processBatched(sessionSubagentsDir, x) {
  let D = await listSubagentTranscripts(sessionSubagentsDir, x);
  let L = await pMap(
    D.filter((ee) => isSafeIdSegment(ee.agentId)),
    (ee) => readAgentMetaFiles(sessionSubagentsDir, ee, x),
    {
      concurrency: MAX_META_READ_CONCURRENCY,
    },
  );
  return buildAgentTree(L.filter((ee) => ee !== null));
}
//@ chunk-23fm9f0d.js:17344-17604 fingerprint = getMcpAuthCachePath (0.644)
/**
 * getMcpAuthCachePath：needs-auth 缓存文件路径（<配置目录>/mcp-needs-auth-cache.json）。
 */
async function getMcpAuthCachePath() {
  let e = emptyCleanupResult();
  let cutoffDate = getCutoffDate();
  if (cutoffDate === null) return e;
  let s = join(getClaudeConfigDir(), "mcp-needs-auth-cache.json");
  try {
    if (await unlinkIfOld(s, cutoffDate, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error)) {
      e.errors++;
      if (isCleanupQuietFsErrno(error))
        logForDebugging(`cleanup mcp-auth-cache failed: ${error.code}`, {
          level: "error",
        });
      else logError(error);
    }
  }
  return e;
}
//@ chunk-5bdzenzx.js:16639-16696 fingerprint = isIncludedMcpTool (1)
function isIncludedMcpTool(tool) {
  return !tool.name?.startsWith("mcp__ide__");
}
//@ chunk-mdk8a5r0.js:284-480 fingerprint = setupSdkMcpClients (0.425)
/**
 * 用于吞掉异常的特殊 Symbol。
 */
var T_t = Object.freeze({});
var A_t = Object.freeze({
  name: "claude-code",
  title: "Claude Code",
  description: "Anthropic's agentic coding tool",
  websiteUrl: "https://claude.com/claude-code",
});
var SWALLOW_SYMBOL = Symbol("swallow");
export {
  isDesktopComputerUseCommand,
  serverCacheKey,
  processBatched,
  refreshMcpServerTools,
  getMcpEntryRowNotServed,
  TRANSPORT_FALLBACK_TIMEOUT_MS,
  getConnectTimeoutMs,
  McpAuthError,
  McpSessionExpiredError,
  loggingSafeOrigin,
  McpCredentialStoreUnavailableError,
  getHostedDesktopComputerUseConfig,
  configHash,
  getMcpAuthCachePath,
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getConnectionTimeoutMs,
  isIncludedMcpTool,
  artifactsMcpClient,
  MCP_SERVER_NOT_ALLOWED_MESSAGE,
  hasNoTransport,
  isTimeoutError,
  MAX_LIST_PAGES,
  LIST_PAGE_DELAYS_MS,
  isRetryableListError,
  ensureConnectedClient_2,
  mapInTurns,
  isEntryRowNotServed,
  useSubagentTruncationPrompt,
  describeMissingRequiredArgs,
  canonicalMcpConfigKey,
  maxDescriptionLength,
  getMcpAuthCache,
  McpToolFileInputRejectedError,
  SWALLOW_SYMBOL,
  REMOTE_CONNECT_TIMEOUT_MS,
  SHORT_RETRY_MS,
  T_t,
  A_t,
  mcpBaseUrlAnalytics,
  isMcpAuthCached_3,
  NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS_2,
  connectToServer_2,
  truncateDescription_2,
  shouldNormalizeRootCombinators_2,
  shouldDropInvalidToolSchemas_2,
  isIncludedMcpTool_3,
  logToolCallXmlInDescriptions,
  needsAuthCacheModuleV1,
  callMCPTool_2,
  artifactsMcpLaptopModuleV1,
  callMCPToolWithUrlElicitationRetry_2,
  isNeedsApprovalOrExpiredSessionV1,
  artifactPermissionRulesModuleV1,
  claudeDocsWakeModuleV1,
  stripTrailingInvokeSuffix,
  isIdeServer_2,
  listAllPages,
  transformResultContent_2,
};
