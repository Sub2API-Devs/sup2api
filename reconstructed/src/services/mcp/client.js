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
import { dirname, dirname as dirname_2, join, join as join_2, join as join_3 } from "path";
import {
  randomUUID,
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
import { pathToFileURL } from "url";
import { Readable } from "stream";
import { GPn, oa } from "../../types/ids.js";
import {
  SdkHttpError,
  Ti,
  ProtocolError,
  SdkError,
  ma,
  fZ,
  zAe,
  lYn,
  qNr,
  MBt,
  GAe,
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
  JHe,
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
  Ao,
} from "./boundedTransports.js";
import { env } from "../../utils/env.js";
import { ec } from "../../utils/timerDelayClamp.js";
import {
  readNeedsAuthCache,
  _Bt,
  needsAuthCachePath,
  bBt,
  getConnectionCache,
  memoizeWithExternalCache,
  fW,
  memoizeWithLRU,
  yBt,
  mcpAuthToolsFor,
} from "./needsAuthCache.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import {
  ht,
  runBeforeRequestHook,
  resolveBearerTokenFor,
  withheldBearerRefusalFor,
  cliOwnedRequestHeaders,
  isCredentialRequestHeader,
  notifyResponseObserver,
  shouldResendRequest,
  hasCliOwnedBearer,
  Zl,
  registerCliOwnedConfig,
} from "./cliOwnedClients.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getFileReader } from "../../utils/fileStore.js";
import { fd, IM, isUnresolved } from "./mcpAccountKey.js";
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
  nxn,
  Cgr,
  loggableMcpToolName,
} from "../analytics/metadata.js";
import { parsePluginIdentifier_2, parsePluginIdentifier } from "../../utils/plugins/pluginIdentifier.js";
import {
  isAnthropicPluginSource,
  getTelemetryPluginScope,
  lx,
  buildPluginSourceFields,
  buildPluginEventFieldsFromId,
  recordPluginUsage,
} from "../../utils/telemetry/pluginTelemetry.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { kR } from "../../../vendor/zod/v4/classic/errors.js";
import { logEvent } from "../analytics/index.js";
import {
  fromEnum,
  lit,
  fromEnumOpt,
  fromNumber,
  mcpNameForAnalytics_GATE_EVALUATED,
  lit as lit_2,
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
  cZe,
  oq,
  readDiscoveryCache,
  recordRefreshFailureStrike,
  acquireDiscoveryRefreshLock,
} from "./discoveryCache.js";
import { mcpSdkGeneration } from "./mcpSdkGeneration.js";
import {
  UnauthorizedError,
  Bdn,
  dYn,
  cLo,
  ZNr,
} from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import {
  recordTokenlessRejection,
  handleRejectedToken,
  connectWithSignedOutFallback,
  shouldTryTokenless,
  dZe,
} from "./signedOutFallback.js";
import { sanitizeErrorDetail, normalizeMcpServerName } from "../api/deferredToolsState.js";
import { redactMcpErrorDetail, describeMcpServerOrigin } from "./mcpServerOrigin.js";
import {
  stripRedirectLocation,
  pBt,
  wrapFetchSkipListenGet,
  t4n,
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
  Ny,
  setEraResolver,
  hasAccountResolver,
  setAccountResolver,
  isRemoteMcpTransport,
} from "./discoveryIdentity.js";
import { getCurrentCallId, X_CCR_TURN_ID } from "./ccrTurnId.js";
import { u, o, T, A, kt, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../utils/json.js";
import { gn } from "../../utils/shortHash.js";
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
  kYn,
  noteScopeExpansion,
  SZe,
  FirstPartyDesignNeedsConsentError,
  Foe,
} from "./firstPartyDesignConsent.js";
import {
  $ze,
  clearApprovedPlans,
  clearPlansForProject,
  clearVerifiedProjectGrant,
  F_t,
  DesignGateState,
} from "./designPlanGate.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { isFirstPartyProvider, shouldPropagateTraceContext } from "../../utils/model/providers.js";
import { getMCPUserAgent } from "../../utils/http.js";
import { Yc, Ph, qn } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import {
  getActiveSpanId,
  Rnr,
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
  LSn,
  HSn,
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
  ds,
  wrapFetchDetectDiscoverMethodNotFound,
  createHandshakeTrace,
  wrapFetchWithHandshakeTrace,
  resetHandshakeTrace,
  zn,
  handshakeTraceTelemetry,
  rememberLegacyPeer,
  hs,
  reportFirstToolsList,
} from "./serverDiscover.js";
import { isStdioConfig, isClaudeAiProxyServer } from "./builtinServerNames.js";
import {
  extend_44,
  fZe,
  extend_19,
  extend_21,
  extend_37,
  extend_58,
  extend_4,
  ABt,
  RBt,
  Hdn,
  CBt,
  Ddn,
  or as or_2,
  IHe,
  vM,
  Fdn,
  extend_7,
  P_t,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import {
  WGs,
  WDo,
  GGs,
  noteListChangedAhead,
  armToolsListAhead,
  toolsListAheadFields,
  markHandlerRegistered,
  VGs,
  takeAheadPage,
  noteFirstPageMark,
} from "./toolsListAhead.js";
import { armRequestTimeout } from "../api/errors.js";
import { Aa, sleep, withDeadline } from "../../utils/sleep.js";
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
import { BLOCKED_BY_POLICY_REASON, wkt } from "./redactMcpErrors.js";
import { CR } from "../../utils/disklessSession.js";
import { shouldUseMcpAllowlistEnv, agentProxyEnv, subprocessEnv } from "../../utils/subprocessEnv.js";
import { ko } from "../../../vendor/@modelcontextprotocol/client/dist/stdio.mjs";
import { runWithPluginWriteScope } from "../../utils/plugins/pluginScopedWrite.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { isMcpServerBackingToolHook, releaseMcpToolCgroup } from "../../utils/hooks/mcpToolHookCgroup.js";
import { wrapCommandInCgroup, parkPendingPid } from "../../utils/toolCgroup.js";
import { isPolicyAllowed, policyDeniedReason } from "../policyLimits/policyVerdicts.js";
import { checkPluginBunOptions } from "../../utils/permissions/protectedSettingsPaths.js";
import {
  shouldRestrictRemoteHost,
  Es,
  stepUpResultMessage,
  markStepUpExhausted,
  isStepUpAuthDialogEnabled,
  grantedScopesCover,
  Rs,
  runStepUpReauth,
} from "./stepUpAuth.js";
import { HTTPS_CLAUDE_COM_CLAUDE_CODE } from "../../constants/product.js";
import { MPe } from "../../utils/pollEvents.js";
import { guardTransportSend, hostedDesktopRefusal, base64URLEncode } from "./mcpWireUtils.js";
import { listChangedCapabilities, ensureListenSubscription, _r } from "./listenStream.js";
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
  $Ae,
  applyParamDescriptionOverrides,
} from "./officialPluginPromptOverrides.js";
import { TB } from "./mcpTimeouts.js";
import { maybeNotifyIDEConnected } from "../../utils/ide.js";
import {
  CLAUDECODE_CALLMARK,
  BEFORE_HANDLER,
  HPe,
  INTERRUPTED_CALL_NOTICE,
  olr,
  MCP_ANSWER_STREAM_ENDED,
  ANSWER_STREAM_GRACE_MS,
  MCP_CALL_UNANSWERED,
  CALL_OUTCOME_UNKNOWN_NOTICE,
  bfi,
  MCP_QUESTION_UNANSWERED,
  MCP_CALL_NOT_SENT_AGAIN,
  MAX_STRUCTURED_RESULT_CHARS,
  MAX_CALL_MARK_CHARS,
} from "./mcpCallConstants.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { SSL_CERT_ERROR_CODES, oIt } from "../api/errorUtils.js";
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
  rY,
  CCR_NEEDS_APPROVAL_CODE,
  isTruncatedBodyError,
  McpToolResultNotReadError,
  bhr,
  McpResponseSchemaError,
} from "./mcpResultErrors.js";
import { hasChannelCapability } from "./channelNotification.js";
import { buildMcpToolName } from "./mcpStringUtils.js";
import { toolUiMeta, describeHiddenMcpTool } from "./toolNameLimits.js";
import { qq, gH, recordClaudeAiMcpConnected } from "./claudeai.js";
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
import { Tle } from "../../constants/outputLimits.js";
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
import { l6n } from "./blockedServers.js";
import { judgeToolSchemaSendability } from "./toolSchemaSendability.js";
import { joinDescription } from "../../remote/tools/inputSchemaFlatten.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { af } from "../../utils/plugins/pluginPolicy.js";
import {
  $Pt,
  isMemoryToolServer,
  isMemoryServerConnection,
  isAccountMemoryServer,
  raiseMemoryErrorCap,
  describeRedactedMcpError,
} from "../../memdir/memoryTool.js";
import { Sdn, isDocsConnectorServer } from "../../tools/ArtifactTool/docsConnector.js";
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
import { k4n, createSlackSendToolUi } from "../../tools/MCPTool/slackSend.js";
import { u8n } from "../../plugins/bundled/claudeTest/constants.js";
import { claudeTestWriteToolOverrides } from "./claudeTestWriteTool.js";
import { mYn, gYn } from "../../bridge/bridgePermissionCallbacks.js";
import { consumeMcpApprovalTicket, yYn } from "../../bridge/mcpApprovalTickets.js";
import { tor } from "./resultContent.js";
import { isHearthbotRelayServer } from "../projectsRelay/relayConfig.js";
import { ccrTurnEventHeaders } from "../../utils/telemetry/ccrTraceContext.js";
import { agentRequestMeta } from "./agentRequestMeta.js";
import { parkOnUser } from "../../utils/sessionActivity.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { getBackgroundAgentId } from "../../utils/agentContext.js";
import { logPrCreateOperation, Yqn } from "../../utils/git/gitOperationTelemetry.js";
import { chromeNoBrowserAnswer } from "../../utils/claudeInChrome/chromePermissionRules.js";
import { stripAnthropicMeta, anthropicResourceLinks } from "./anthropicMeta.js";
import { isMcpTasksEnabled, u3o, MCP_TASK_POLL_MS, qSn } from "./mcpTaskWorker.js";
import { isBrowserUnavailable } from "../../utils/browser.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { noteHearthDegraded } from "./hearthDegraded.js";
import {
  z9,
  GET_TASK,
  UBt,
  FBt,
  findPendingTaskFilesForArgs,
  discardTaskFiles,
  NBt,
  yZe,
  $Bt,
  cYn,
  isToolboxMcpServer,
  uYn,
  fYn,
} from "./agentTaskFiles.js";
import { u2 } from "../../tasks/taskLoopRegistry.js";
import { isLiveMemoryTool } from "./memoryServerVerification.js";
import { Q_e } from "../tools/detachedToolCalls.js";
import { I3n } from "../../plugins/functionHooks/inputHold.js";
import { resolveSdkUrl } from "../../cli/transports/sdkUrlValidation.js";
import { ANTHROPIC_FILEINPUTS } from "../mcpServe/fileInputs.js";
import { recordPluginActivity } from "../../utils/pluginActivity.js";
import { count } from "../../utils/collections.js";
import { logChromeToolsAdded } from "../../utils/claudeInChrome/telemetry.js";
import { listAllPages_2, listToolsModern } from "./listPagination.js";
import { getMcpInfoFromConnection } from "./types.js";
import { Uv } from "../compact/keptTools.js";
import { checkCommandListable } from "../../utils/commandPredicates.js";
import { RESERVED_SKILL_NAMESPACE_REASON } from "../../skills/reservedSkillNames.js";
import { createAbortController } from "../../utils/abortController.js";
import { clearKeychainCache } from "../../utils/secureStorage/macOsKeychainHelpers.js";
import { applyMcpServerConfig } from "../../components/mcp/MCPListPanel.js";
import { ListMcpResourcesTool } from "../../tools/ListMcpResourcesTool/ListMcpResourcesTool.js";
import { ReadMcpResourceTool } from "../../tools/ReadMcpResourceTool/ReadMcpResourceTool.js";
import { toolMatchesName } from "../../Tool.js";
import { H5 } from "./skillDirectoryResource.js";
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
import { dy, persistToolResult, toolResultsDir, isPersistError } from "../../utils/toolResultStorage.js";
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
import { Tue, zYn } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js";
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
  oo,
  lt,
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
  tt,
  To,
  gt,
  persistDiscovery,
  isDiscoveryCacheMissRecoverable_2,
  discoverySourceLabel_2,
  recordRawResourcesForResult_2,
} from "./discovery.js";
import {
  Po,
  Vt,
  clearServerCache_4,
  detachAndCloseConnection_2,
  isLegacyProtocolEra,
  hasLiveConnection_2,
  refuseCachedRowV1,
  So_2,
  recordCachedDialFailureV1,
  pt,
} from "./connectionRegistry.js";
import { createFetchWithDefaults } from "../../utils/fetchWithDefaults.js";
import {
  wrapFetchWithFirstPartyAuth_2,
  mergeRequestHeaders_2,
  wrapFetchWithCcrSessionAuth_2,
  wrapFetchWithCliOwnedBearer_2,
  createClaudeAiProxyFetch_2,
  mr,
  handleRemoteConnectAuthError_2,
  handleRemoteAuthFailure_2,
  logMcpConnectionOtelEvent_2,
} from "./connectAuth.js";
import { _t, Mt } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/sse.js";
import { eo } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { Bt } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { AM } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { validateHostManifest_2, logManifestOutcomeV1 } from "./sdkManifest.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../../utils/computerUse/common.js";
import { READ_ONLY_CU_ACTIONS } from "../../utils/computerUse/toolRendering.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { hasLiveState, getLiveState } from "../liveReplica/liveReplica.js";
import { listSubagentTranscripts } from "../../utils/subagentTranscripts.js";
import { G$ } from "../../utils/agentId.js";
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
function si(e) {
  return GPn(e);
}
//@ chunk-8t8n4kdh.js:45917-45945 placement
function Dt(e) {
  return oa(e);
}
//@ chunk-8t8n4kdh.js:45945-46119 placement
var mcpTaskPersistenceModule = require("./chunk-mzh22y2k.js"),
  mcpTasksModule = require("./chunk-g25jqyhb.js"),
  mcpTaskDriveModule = require("./chunk-e7xds3sf.js"),
  workerWakesModule = require("./chunk-1w450km7.js"),
  mcpAutoBackgroundModule = require("./chunk-tn4j580p.js");
//@ chunk-8t8n4kdh.js:46119-46250 placement
function isSseOpenFailure(error) {
  return (
    error instanceof SdkHttpError &&
    (error.code === Ti.ClientHttpFailedToOpenStream || error.message.includes("Failed to open SSE stream"))
  );
}
/**
 * MCP Streamable HTTP：错误是否表示会话失效需要重新初始化（McpSessionExpiredError、非 SSE 打开失败的 404、特定 400 消息）。与 bridge 无关。
 */
//@ chunk-8t8n4kdh.js:46250-46515 placement = isConnectionError (1)
function isMcpSessionExpiredError(err) {
  if (err instanceof McpSessionExpiredError) return !0;
  if (err instanceof ProtocolError) return !1;
  let n = err instanceof SdkHttpError ? err.status : "code" in err ? err.code : void 0;
  if (n === 404) return !isSseOpenFailure(err);
  return (
    n === 400 &&
    /Server not initialized|No valid session ID|Mcp-Session-Id header is required/i.test(err.message)
  );
}
//@ chunk-8t8n4kdh.js:46515-46593 placement
function truncateServerInstructions(e, n, r = vF()) {
  if (!e) return e;
  return truncateDescription(e, "Server instructions", n, r);
}
//@ chunk-8t8n4kdh.js:46593-46747 placement
function truncateDescription(e, n, r, s = vF()) {
  if (e.length <= s) return e;
  if (r !== void 0) logMCPDebug(r, `${n} truncated from ${e.length} to ${s} chars`);
  return truncateToLength(e, s) + "\u2026 [truncated]";
}
//@ chunk-8t8n4kdh.js:46747-46925 placement
var TRANSIENT_NETWORK_ERROR_CODES = ["ECONNRESET", "ETIMEDOUT", "EPIPE", "EHOSTUNREACH", "ECONNREFUSED"],
  oc = new Set([...TRANSIENT_NETWORK_ERROR_CODES, "ConnectionRefused", "ConnectionClosed"]),
  rc = /^Error POSTing to endpoint \(HTTP (\d+)\)/;
//@ chunk-8t8n4kdh.js:46925-46983 placement
function Xo(e) {
  return typeof e === "number" && e >= 100 && e <= 599;
}
//@ chunk-8t8n4kdh.js:46983-47437 placement
function isTransientMcpError(e) {
  if (e.name === "AbortError") return !0;
  let n = "code" in e ? e.code : void 0,
    r = "status" in e ? e.status : void 0,
    s = rc.exec(e.message)?.[1];
  if (Xo(r) || Xo(n) || (typeof n === "number" && n < 0) || (s !== void 0 && Xo(Number(s)))) return !1;
  if (typeof n === "string" && oc.has(n)) return !0;
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
var ic = 1e8,
  Fs = 20,
  ui = [250, 500, 1000];
//@ chunk-8t8n4kdh.js:47472-48154 placement
function isRetryableListError(e) {
  if (isListAuthError(e)) return !1;
  if (e instanceof IssuerEchoCrossOriginError) return !1;
  if (isClaudeAiBearerRejectedError(e)) return !1;
  if (e instanceof DOMException && e.name === "TimeoutError") return !1;
  if (e instanceof HttpBodyOverflowError) return !1;
  if (e instanceof SdkHttpError && e.status >= 400 && e.status < 500) return !1;
  if (
    e instanceof Error &&
    !(e instanceof ProtocolError) &&
    "code" in e &&
    typeof e.code === "number" &&
    e.code >= 400 &&
    e.code < 500
  )
    return !1;
  if (e instanceof SdkError && e.code === Ti.RequestTimeout) return !1;
  if (e instanceof SdkError && e.code === Ti.ListPaginationExceeded) return !1;
  if (e instanceof ProtocolError)
    return (
      e.code !== -32001 &&
      e.code !== ma.MethodNotFound &&
      e.code !== ma.InvalidRequest &&
      e.code !== ma.InvalidParams &&
      e.code !== ma.UnsupportedProtocolVersion &&
      e.code !== ma.MissingRequiredClientCapability
    );
  return !0;
}
//@ chunk-8t8n4kdh.js:48154-48306 placement
function isTimeoutError(e) {
  return (
    (e instanceof DOMException && e.name === "TimeoutError") ||
    (e instanceof SdkError && e.code === Ti.RequestTimeout) ||
    (e instanceof ProtocolError && e.code === -32001)
  );
}
//@ chunk-8t8n4kdh.js:48306-48365 placement
function hasNoTransport(e) {
  return "transport" in e && e.transport === void 0;
}
/**
 * getMcpToolTimeoutMs：工具调用总超时：配置 timeout（≥1000）> MCP_TOOL_TIMEOUT > 默认约 27.8 小时，夹在 [1000, 上限]。
 */
//@ chunk-8t8n4kdh.js:53597-53735 fingerprint = getMcpToolTimeoutMs (1)
function getMcpToolTimeoutMs(e) {
  let r = (e?.timeout !== void 0 && e.timeout >= 1000 ? e.timeout : void 0) ?? env.MCP_TOOL_TIMEOUT ?? ic;
  return Math.min(Math.max(r, 1000), ec);
}
//@ chunk-8t8n4kdh.js:53735-53799 layout
var REMOTE_TOOL_IDLE_TIMEOUT_MS = 300000,
  STDIO_TOOL_IDLE_TIMEOUT_MS = 1800000,
  NO_IDLE_TIMEOUT_TRANSPORTS = new Set(["sse-ide", "ws-ide", "sdk"]);
/**
 * getMcpToolIdleTimeoutMs：工具调用空闲超时（无响应也无进度）：CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT 或 stdio 30 分钟/远程 5 分钟，sse-ide/ws-ide/sdk 不设；不小于配置 timeout，不超过总超时。
 */
//@ chunk-8t8n4kdh.js:53799-54036 layout
function getMcpToolIdleTimeoutMs(e) {
  let n = e?.type ?? "stdio";
  if (NO_IDLE_TIMEOUT_TRANSPORTS.has(n)) return 0;
  let r =
    env.CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT ??
    (n === "stdio" ? STDIO_TOOL_IDLE_TIMEOUT_MS : REMOTE_TOOL_IDLE_TIMEOUT_MS);
  if (r <= 0) return 0;
  let s = e?.timeout !== void 0 && e.timeout >= 1000 ? e.timeout : 0;
  return Math.min(Math.max(r, s, 1000), getMcpToolTimeoutMs(e));
}
//@ chunk-8t8n4kdh.js:54036-54078 layout
var Mc = () => require("./chunk-3k33hyyp.js");
/**
 * needs-auth 缓存常量与懒加载模块：缓存版本 v2、TTL 15 分钟（默认）/4 小时（claude.ai 代理与插件远程）/90 秒（有 refresh token）、时钟偏差容忍 1 分钟。
 */
//@ chunk-8t8n4kdh.js:54078-54244 layout
var artifactPermissionRulesModule = () => require("./chunk-p5cstt88.js"),
  artifactsMcpLaptopModule = () => require("./chunk-d5fbj7hf.js"),
  claudeDocsWakeModule = () => require("./chunk-t6p2wq66.js"),
  AUTH_CACHE_VERSION = "v2",
  NEEDS_AUTH_CACHE_TTL_MS = 900000,
  NEEDS_AUTH_CACHE_LONG_TTL_MS = 14400000,
  NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS = 90000,
  AUTH_CACHE_CLOCK_SKEW_MS = 60000;
/**
 * isMcpAuthCached：needs-auth 缓存命中：claude.ai 代理按 id、插件 stdio 按配置哈希；TTL 默认 15 分钟，claude.ai 代理与插件远程服务器 4 小时，有 refresh token 时 90 秒。
 */
//@ chunk-8t8n4kdh.js:54244-54769 layout
async function isMcpAuthCached(serverName, config, storageV5) {
  let h = (await readNeedsAuthCache(storageV5))[serverName];
  if (!h) return !1;
  if (config.type === "claudeai-proxy" && h.id !== config.id) return !1;
  if ((config.type === "stdio" || config.type === void 0) && config.pluginSource === void 0) return !1;
  if (
    (config.type === "stdio" || config.type === void 0) &&
    config.pluginSource !== void 0 &&
    h.id !== Yz(config)
  )
    return !1;
  if ((config.type === "http" || config.type === "sse") && config.pluginSource !== void 0 && h.id !== void 0)
    return !1;
  let y =
      config.type === "claudeai-proxy" ||
      (config.pluginSource !== void 0 &&
        (config.type === "http" || config.type === "sse") &&
        !usesNonOAuthAuth(config)),
    S = h.ttlMs ?? (y ? NEEDS_AUTH_CACHE_LONG_TTL_MS : NEEDS_AUTH_CACHE_TTL_MS),
    w = Date.now() - h.timestamp;
  return w > -AUTH_CACHE_CLOCK_SKEW_MS && w < S;
}
//@ chunk-8t8n4kdh.js:54769-54943 layout
async function writeAuthCacheV5(e, n) {
  let write = await e.write(_Bt(), jsonStringify(n), { publishDiscipline: "inPlace" });
  if (!write.ok)
    logMCPDebug("auth-cache", `needs-auth cache v5 write failed: ${formatStorageError(write.error)}`);
  return write.ok;
}
/**
 * setMcpAuthCacheEntry：写 needs-auth 缓存条目 {timestamp, id?, ttlMs?}（v5 存储或 mcp-needs-auth-cache.json），串行写链。
 */
//@ chunk-8t8n4kdh.js:54943-55253 callgraph-fingerprint = setMcpAuthCacheEntry (0.268)
function setMcpAuthCacheEntry(serverName, serverId, ttlMs, storageV5) {
  let h = ht();
  h.authCacheWriteChain = h.authCacheWriteChain
    .then(async () => {
      let y = await readNeedsAuthCache(storageV5);
      if (
        ((y[serverName] = {
          timestamp: Date.now(),
          ...(serverId && { id: serverId }),
          ...(ttlMs !== void 0 && { ttlMs: ttlMs }),
        }),
        isStorageV5Enabled() && storageV5 !== void 0)
      ) {
        if (!(await writeAuthCacheV5(storageV5, y))) return;
      } else {
        let S = getFileReader(),
          cachePath = needsAuthCachePath();
        (await S.mkdir(dirname_2(cachePath)), await S.write(cachePath, jsonStringify(y)));
      }
      bBt();
    })
    .catch(() => {});
}
/**
 * clearMcpAuthCacheEntry：删除 needs-auth 缓存条目。
 */
//@ chunk-8t8n4kdh.js:55253-55505 layout
function clearMcpAuthCacheEntry(e, n) {
  let r = ht(),
    s = r.authCacheWriteChain
      .then(async () => {
        let h = await readNeedsAuthCache(n);
        if (!(e in h)) return;
        if ((delete h[e], isStorageV5Enabled() && n !== void 0)) {
          if (!(await writeAuthCacheV5(n, h))) return;
        } else await getFileReader().write(needsAuthCachePath(), jsonStringify(h));
        bBt();
      })
      .catch(() => {});
  return ((r.authCacheWriteChain = s), s);
}
/**
 * clearMcpDiscoveryCaches：清空连接、工具、提示词、资源、资源模板的记忆化缓存（保留指定键）。
 */
//@ chunk-8t8n4kdh.js:55505-55748 layout
function clearMcpDiscoveryCaches(e = new Set(), n = !0) {
  if (!fd()) return;
  if (n) noteIdentityChanged();
  bumpIdentityEpoch();
  let r = (s) => {
    if (s) retainCacheKeys(s, e);
  };
  if (!ht().holdStaleReauthEntryForTest) getConnectionCache().reauthInFlight.clear();
  (getConnectionCache().lapsedCcrSignIns.clear(),
    r(connectToServer.cache),
    r(fetchToolsForClient.cache),
    r(fetchCommandsForClient.cache),
    r(fetchResourcesForClient.cache),
    r(fetchResourceTemplatesForClient.cache));
}
/**
 * mcpBaseUrlAnalytics：遥测字段 mcpServerBaseUrl 与 mcpServerKeyHash。
 */
//@ chunk-8t8n4kdh.js:55748-55855 fingerprint = mcpBaseUrlAnalytics (0.65)
function mcpBaseUrlAnalytics_2(e, n) {
  let url = ET(e),
    s = n ? { mcpServerKeyHash: toolNameForTelemetry(n) } : {};
  if (url) return { mcpServerBaseUrl: url, ...s };
  return s;
}
/**
 * logMcpConnectionOtelEvent：发出 mcp_server_connection OTel 事件（状态、传输、作用域、耗时、插件信息、错误码）。
 */
//@ chunk-8t8n4kdh.js:55855-56314 layout
function logMcpConnectionOtelEvent(e, n, r) {
  let s = isToolDetailsLoggingEnabled(),
    h = n.pluginSource ? parsePluginIdentifier_2(n.pluginSource) : void 0,
    y = h && (isAnthropicPluginSource(getTelemetryPluginScope(h.name, h.marketplace, null)) || s);
  logOTelEvent("mcp_server_connection", {
    status: r.status,
    transport_type: n.type ?? "stdio",
    server_scope: n.scope,
    duration_ms: String(Math.round(r.durationMs)),
    is_plugin: h !== void 0,
    ...(h && { plugin_id_hash: lx(h.name, h.marketplace), "plugin.name": y ? h.name : THIRD_PARTY }),
    ...(r.errorCode && { error_code: String(sanitizeConnectErrorCodeForTelemetry(r.errorCode)) }),
    ...(s && { server_name: e, ...(r.error && { error: r.error }) }),
  });
}
/**
 * handleRemoteAuthFailure：远程服务器需要认证：记录 tengu_mcp_server_needs_auth，写 needs-auth 缓存，清理发现缓存，返回 needs-auth 连接。
 */
//@ chunk-8t8n4kdh.js:56314-56960 fingerprint = handleRemoteAuthFailure (0.726)
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
  fn();
  let P = error instanceof kR,
    M = P ? error.issues[0] : void 0,
    j = M ? `Server OAuth metadata invalid: ${M.path.join(".") || "(root)"} \u2014 ${M.message}` : void 0;
  (logEvent("tengu_mcp_server_needs_auth", {
    transportType: fromEnum(transportType),
    ...(negotiation ?? {}),
    ...(P && { cause: lit("discovery_schema") }),
    ...mcpBaseUrlAnalytics_2(serverRef, name),
  }),
    logMCPDebug(
      name,
      `Authentication required for ${{ sse: "SSE", http: "HTTP", "claudeai-proxy": "claude.ai proxy" }[transportType]} server`,
    ));
  let ce =
    isRefreshPath401 &&
    (serverRef.type === "http" || serverRef.type === "sse") &&
    (await hasStoredRefreshToken(name, serverRef));
  if (roundEpoch === void 0 || isCurrentIdentityEpoch(roundEpoch))
    setMcpAuthCacheEntry(
      name,
      serverRef.type === "claudeai-proxy" ? serverRef.id : void 0,
      ce ? NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS : void 0,
      storageV5,
    );
  return (
    await purgeDiscoveryCacheOnAuthFailure(name, serverRef, roundEpoch),
    logFeatureSad("mcp_connect", "mcp_connect_needs_auth"),
    { name: name, type: "needs-auth", config: serverRef, error: j }
  );
}
//@ chunk-8t8n4kdh.js:56960-57192 layout
async function purgeDiscoveryCacheOnAuthFailure(e, n, r) {
  let s = r === void 0 || isCurrentIdentityEpoch(r);
  if (IM())
    if (s) await flushDiscoveryCache(deleteDiscoveryCache(e, n));
    else
      logMCPDebug(
        e,
        "Discovery cache 401/403 purge skipped: identity changed since this connect round started (the current entry belongs to the new principal)",
      );
}
//@ chunk-8t8n4kdh.js:57192-57597 layout
var AUTH_REJECTION_SEVERITY = {
  AUTH_HEADER_REJECTED: { severity: "bad", featureErrorCode: "mcp_connect_auth_header_rejected" },
  HEADERS_HELPER_AUTH_REJECTED: {
    severity: "bad",
    featureErrorCode: "mcp_connect_headers_helper_auth_rejected",
  },
  CLI_OWNED_BEARER_REJECTED: { severity: "bad", featureErrorCode: "mcp_connect_cli_owned_bearer_rejected" },
  FIRST_PARTY_AUTH_REJECTED: { severity: "sad", featureErrorCode: "mcp_connect_first_party_auth_rejected" },
};
/**
 * failWithAuthRejection：记录连接失败遥测并返回带错误码（AUTH_HEADER_REJECTED 等）的 failed 连接。
 */
//@ chunk-8t8n4kdh.js:57597-58361 layout
function failWithAuthRejection({
  name: e,
  serverRef: serverRef,
  transportType: transportType,
  errorCode: errorCode,
  message: message,
  negotiation: negotiation,
  displayDetail: displayDetail,
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
  let { severity: severity, featureErrorCode: featureErrorCode } = AUTH_REJECTION_SEVERITY[errorCode];
  if (severity === "bad") logFeatureBad("mcp_connect", featureErrorCode);
  else logFeatureSad("mcp_connect", featureErrorCode);
  return (
    logMCPError(e, message),
    {
      name: e,
      type: "failed",
      config: serverRef,
      error: message,
      ...(displayDetail !== void 0 && { displayDetail: displayDetail }),
      errorCode: errorCode,
    }
  );
}
/**
 * failFirstPartyAuthRejected：一方服务器拒绝 claude.ai 登录/Design 凭证时生成具体提示（/login、/design-login）。
 */
//@ chunk-8t8n4kdh.js:58361-59946 layout
function failFirstPartyAuthRejected(credentialKind, name, serverRef, transportType, statusCode, y) {
  let S = "api.anthropic.com";
  try {
    if ("url" in serverRef) S = new URL(serverRef.url).host;
  } catch {}
  let w = `HTTP ${statusCode ?? 401}`,
    P = isDesignServerConfig(serverRef),
    M;
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
    name: name,
    serverRef: serverRef,
    transportType: transportType,
    errorCode: "FIRST_PARTY_AUTH_REJECTED",
    message: M,
    negotiation: y,
  });
}
//@ chunk-8t8n4kdh.js:59946-60026 layout
function isAuthFailure(e, n, r) {
  return e instanceof UnauthorizedError || (e instanceof kR && r) || n === 401 || n === 403;
}
/**
 * handleRemoteConnectAuthError：SSE/HTTP 连接认证失败分类：配置的 Authorization 头被拒、headersHelper 头被拒、CLI 自有令牌被拒、一方登录被拒，或交给 OAuth 刷新/needs-auth。
 */
//@ chunk-8t8n4kdh.js:60026-61695 layout
async function handleRemoteConnectAuthError({
  name: e,
  serverRef: serverRef,
  transportType: transportType,
  error: error,
  statusCode: statusCode,
  sawAuthChallenge: sawAuthChallenge,
  hasUserAuthHeader: hasUserAuthHeader,
  helperMintsAuthHeader: helperMintsAuthHeader,
  cliOwnedBearer: cliOwnedBearer,
  useFirstPartyAuth: useFirstPartyAuth,
  firstPartyBearer: firstPartyBearer,
  authProvider: authProvider,
  negotiation: negotiation,
  roundEpoch: roundEpoch,
  storageV5: storageV5,
}) {
  if (
    (await recordTokenlessRejection(e, serverRef, authProvider),
    !isAuthFailure(error, statusCode, sawAuthChallenge))
  )
    return;
  if (hasUserAuthHeader) {
    let G = sanitizeErrorDetail(
      redactMcpErrorDetail(
        e,
        serverRef,
        error instanceof SdkHttpError && typeof error.data?.text === "string"
          ? error.data.text
          : error.message,
      ),
    );
    return failWithAuthRejection({
      name: e,
      serverRef: serverRef,
      transportType: transportType,
      negotiation: negotiation,
      errorCode: "AUTH_HEADER_REJECTED",
      message:
        `Server rejected the configured Authorization header (HTTP ${statusCode ?? 401}). ` +
        "Check that the token is valid for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when headers.Authorization is set.",
      ...(G !== "" && { displayDetail: `Error detail: ${G}` }),
    });
  }
  if (helperMintsAuthHeader) {
    let G = sanitizeErrorDetail(redactMcpErrorDetail(e, serverRef, error.message));
    return failWithAuthRejection({
      name: e,
      serverRef: serverRef,
      transportType: transportType,
      negotiation: negotiation,
      errorCode: "HEADERS_HELPER_AUTH_REJECTED",
      message:
        `Server rejected the Authorization header minted by the configured headersHelper (HTTP ${statusCode ?? 401}). ` +
        "Check that the helper command returns a valid credential for this MCP endpoint \u2014 OAuth fallback is " +
        "disabled when the helper supplies Authorization.",
      ...(G !== "" && { displayDetail: `Error detail: ${G}` }),
    });
  }
  if (cliOwnedBearer)
    return failWithAuthRejection({
      name: e,
      serverRef: serverRef,
      transportType: transportType,
      negotiation: negotiation,
      errorCode: "CLI_OWNED_BEARER_REJECTED",
      message: `Server rejected the session credential (HTTP ${statusCode ?? 401}). It will be retried when the session credential is refreshed.`,
    });
  if (useFirstPartyAuth)
    return failFirstPartyAuthRejected(
      firstPartyBearer ?? "none",
      e,
      serverRef,
      transportType,
      statusCode,
      negotiation,
    );
  let ge = error instanceof UnauthorizedError || statusCode === 401,
    Ie = await handleRejectedToken({
      name: e,
      serverRef: serverRef,
      authProvider: authProvider,
      isRefreshPath401: ge,
      needsAuth: () =>
        handleRemoteAuthFailure(e, serverRef, transportType, error, ge, roundEpoch, negotiation, storageV5),
    });
  if (Ie !== void 0) return (await purgeDiscoveryCacheOnAuthFailure(e, serverRef, roundEpoch), Ie);
  return handleRemoteAuthFailure(e, serverRef, transportType, error, ge, roundEpoch, negotiation, storageV5);
}
/**
 * wrapFetchWithCcrSessionAuth：CCR 代理请求补会话令牌、会话头、拨号工具 ID（X-CCR-Dial-Tool-Use-Id），并记录 CCR ticket。
 */
//@ chunk-8t8n4kdh.js:61695-62288 layout
function wrapFetchWithCcrSessionAuth(fetchFn, dialOptions, connectionKey) {
  return (
    (fetchFn = stripRedirectLocation(fetchFn)),
    async (s, h) => {
      let headers = new Headers(h?.headers);
      if (!headers.has("Authorization")) {
        let j = getSessionIngressAuthToken();
        if (j) (Ny().record(j), headers.set("Authorization", `Bearer ${j}`));
      }
      let S = getCurrentCallId();
      if ((headers.delete(X_CCR_TURN_ID), S)) headers.set(X_CCR_TURN_ID, S);
      if ((headers.delete(X_CCR_DIAL_TOOL_USE_ID), dialOptions?.toolUseId !== void 0)) {
        let j = classifyHandshakeRequest(h);
        if (j === "handshake" || (j === "listing" && dialOptions.withListings))
          headers.set(X_CCR_DIAL_TOOL_USE_ID, dialOptions.toolUseId);
      }
      getConnectionCache().attachCcrTicket(s, headers);
      let w = h?.redirect === "error" ? "error" : "manual",
        P = await fetchFn(s, { ...h, headers: headers, redirect: w }),
        M = getConnectionCache();
      if (
        (M.noteCcrTicket(s, headers, P),
        connectionKey !== void 0 &&
          (P.status === 401 || M.lapsedCcrSignIns.has(connectionKey)) &&
          classifyHandshakeRequest(h) !== void 0)
      )
        M.noteCcrDialAnswer(connectionKey, P);
      return P;
    }
  );
}
/**
 * classifyHandshakeRequest：POST 体方法为 initialize/notifications/initialized 返回 handshake，tools/list 返回 listing。
 */
//@ chunk-8t8n4kdh.js:62288-62545 layout
function classifyHandshakeRequest(e) {
  if (e?.method?.toUpperCase() !== "POST" || typeof e.body !== "string") return;
  let n = u({ method: o() }).safeParse(safeParseJSON(e.body, !1)).data?.method;
  if (n === "initialize" || n === "notifications/initialized") return "handshake";
  return n === "tools/list" ? "listing" : void 0;
}
//@ chunk-8t8n4kdh.js:62545-62610 layout
var X_CCR_DIAL_TOOL_USE_ID = "X-CCR-Dial-Tool-Use-Id",
  TOOL_USE_ID_PATTERN = /^toolu_[A-Za-z0-9_-]{1,64}$/;
/**
 * wrapFetchWithCliOwnedBearer：给 CLI 自有服务器的请求附加会话 bearer（被扣留时不发请求）。
 */
//@ chunk-8t8n4kdh.js:62610-63560 layout
function wrapFetchWithCliOwnedBearer(fetchFn, config) {
  let r = async (...[s, h]) => {
    let y = { method: (h?.method ?? "GET").toUpperCase(), body: h?.body };
    await runBeforeRequestHook(config, y);
    let headers = new Headers(h?.headers),
      w = null,
      P = !1;
    if (!headers.has("Authorization")) {
      let R = await resolveBearerTokenFor(config);
      if (R) (Ny().record(R), headers.set("Authorization", `Bearer ${R}`), (w = gn(R)));
      else {
        P = !0;
        let ce = withheldBearerRefusalFor(config);
        if (ce !== void 0)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            ce,
            "CLI-owned MCP request not sent: its bearer was withheld",
          );
      }
    }
    let M = {};
    for (let [R, ce] of Object.entries(cliOwnedRequestHeaders(config, y)))
      if (
        !headers.has(R) &&
        R.toLowerCase() !== "authorization" &&
        !(P && isCredentialRequestHeader(config, R))
      )
        (headers.set(R, ce), (M[R] = ce));
    let j = await fetchFn(s, { ...h, headers: headers, redirect: "error" });
    return (
      notifyResponseObserver(config, {
        method: y.method,
        status: j.status,
        headers: j.headers,
        requestHeaders: {
          get: (R) =>
            R.toLowerCase() === "authorization" || isCredentialRequestHeader(config, R)
              ? null
              : headers.get(R),
        },
        bearerFingerprint: w,
      }),
      { response: j, owned: M }
    );
  };
  return async (s, h) => {
    let { response: response, owned: owned } = await r(s, h);
    if (!(await shouldResendRequest(config, response, owned))) return response;
    await response.body?.cancel().catch(() => {});
    let w = await r(s, h);
    return (shouldResendRequest(config, w.response, w.owned), w.response);
  };
}
/**
 * ClaudeAiProxyBearerRejectedError：claude.ai 代理拒绝会话令牌（可能缺连接器作用域），错误码 CLAUDEAI_BEARER_REJECTED。
 */
//@ chunk-8t8n4kdh.js:63560-63822 layout
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
/**
 * createClaudeAiProxyFetch：claude.ai 代理 fetch：附加 OAuth 访问令牌，401 时刷新令牌重试一次，仍被拒抛 ClaudeAiProxyBearerRejectedError。
 */
//@ chunk-8t8n4kdh.js:63822-65001 fingerprint = createClaudeAiProxyFetch (0.634)
function createClaudeAiProxyFetch(fetchFn, credentials) {
  return (
    (fetchFn = stripRedirectLocation(fetchFn)),
    async (url, init) => {
      let doRequest = async () => {
        await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials });
        let R =
          isStorageV5Enabled() && credentials !== void 0
            ? await getClaudeAIOAuthTokensAsync(credentials)
            : getClaudeAIOAuthTokens();
        if (!R) throw Error("No claude.ai OAuth token available");
        let headers = new Headers(init?.headers);
        (Ny().record(R.accessToken), headers.set("Authorization", `Bearer ${R.accessToken}`));
        let Q = init?.redirect === "error" ? "error" : "manual";
        return {
          response: await fetchFn(url, { ...init, headers: headers, redirect: Q }),
          sentToken: R.accessToken,
        };
      };
      async function y(R) {
        if (R.status >= 400 && R.headers.get("content-type")?.includes("text/event-stream")) {
          let text = await R.text(),
            found = text
              .split(
                `
`,
              )
              .find((ie) => ie.startsWith("data: "));
          return new Response(found ? found.slice(6) : text, {
            status: R.status,
            statusText: R.statusText,
            headers: R.headers,
          });
        }
        return R;
      }
      let { response: response, sentToken: sentToken } = await doRequest();
      if (response.status !== 401) return y(response);
      let P = response.headers.get("X-Mcp-Error-Code") ?? void 0;
      if (P)
        return (
          logEvent("tengu_mcp_claudeai_proxy_401", {
            tokenChanged: !1,
            proxyErrorCode: sanitizedFeatureErrorCodeForTelemetry(P),
          }),
          response
        );
      let tokenChanged = await handleOAuth401Error(sentToken, credentials).catch(() => !1);
      if ((logEvent("tengu_mcp_claudeai_proxy_401", { tokenChanged: tokenChanged }), !tokenChanged)) {
        let R =
          isStorageV5Enabled() && credentials !== void 0
            ? await readFreshOAuthAccessToken(credentials)
            : getClaudeAIOAuthTokens()?.accessToken;
        if (!R || R === sentToken) throw new ClaudeAiProxyBearerRejectedError();
      }
      let response_2 = (await doRequest()).response;
      if (response_2.status === 401 && !response_2.headers.get("X-Mcp-Error-Code"))
        throw new ClaudeAiProxyBearerRejectedError();
      return y(response_2);
    }
  );
}
/**
 * expandFirstPartyDesignScopes：Design 连接器需要时为 claude.ai 登录追加 user:design:read/write 作用域。
 */
//@ chunk-8t8n4kdh.js:65001-65513 sole-consumer
async function expandFirstPartyDesignScopes(e, n) {
  if (isDesignMcpUrl(e)) {
    let s = await kYn()?.(n);
    if (s?.ok) {
      if (s.expanded)
        (noteScopeExpansion(
          "Added user:design:read and user:design:write to your claude.ai login (for the Design MCP connector).",
        ),
          logEvent("tengu_mcp_first_party_scope_expanded", { pathPrefix: lit("/v1/design/") }));
      return { accessToken: s.accessToken, bearer: s.bearer };
    }
  }
  await checkAndRefreshOAuthTokenIfNeeded({ credentials: n });
  let r =
    isStorageV5Enabled() && n !== void 0 ? await getClaudeAIOAuthTokensAsync(n) : getClaudeAIOAuthTokens();
  if (!r?.accessToken) return;
  return {
    accessToken: r.accessToken,
    bearer: r.scopes?.includes("user:design:read") ? "design_scoped_login" : "login",
  };
}
/**
 * readNeedsConsentBit：Design 服务器响应体为 {error:"needs_consent", consent} 时返回 consent 位。
 */
//@ chunk-8t8n4kdh.js:65513-65742 sole-consumer
async function readNeedsConsentBit(e) {
  let n = SZe();
  if (n === null) return null;
  let r;
  try {
    r = await e.clone().json();
  } catch {
    return null;
  }
  if (r == null || typeof r !== "object" || r.error !== "needs_consent") return null;
  let consent = r.consent;
  return n.isConsentBit(consent) ? consent : null;
}
//@ chunk-8t8n4kdh.js:65742-65879 sole-consumer
function noteDesignProjectId(e, n, r, s) {
  if (!n || !$ze.has(r)) return;
  let project_id = s.project_id;
  if (typeof project_id === "string" && project_id.length > 0)
    (clearApprovedPlans(e, project_id),
      clearPlansForProject(e, project_id),
      clearVerifiedProjectGrant(e, project_id),
      F_t(e, project_id));
}
//@ chunk-8t8n4kdh.js:65879-65944 sole-consumer
var DESIGN_WRITE_TOOLS = new Set(["write_files", "create_support_js", "copy_files"]);
/**
 * gateDesignWriteWithoutPlanToken：Design 写工具缺 plan_token 时拒绝（只允许原生 Claude Design 工具无令牌写）。
 */
//@ chunk-8t8n4kdh.js:65944-66471 sole-consumer
function gateDesignWriteWithoutPlanToken(e, n, r) {
  if (!e || !DESIGN_WRITE_TOOLS.has(n)) return null;
  let s = r?.plan_token;
  if (typeof s === "string" && s.length > 0) return null;
  return {
    behavior: "deny",
    message: `${n}: writing without a plan_token is available only through the native Claude Design tool \u2014 call finalize_plan with writes (and deletes if needed), then pass the returned plan_token.`,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "tokenless design writes are native-tool-only \u2014 this connector surface has no reserved-path or grant-approval flow",
      classifierApprovable: !1,
    },
  };
}
//@ chunk-8t8n4kdh.js:66471-66533 sole-consumer
var DESIGN_PLAN_TOOLS = new Set([...DESIGN_WRITE_TOOLS, "finalize_plan", "delete_files", ...$ze]);
//@ chunk-8t8n4kdh.js:66533-66570 sole-consumer
function isDesignGatedTool(e, n) {
  return e && DESIGN_PLAN_TOOLS.has(n);
}
/**
 * askDesignConsent：生成 Design 同意请求的权限结果（ask，附 __consentNonce，仅本地显示，不可被分类器批准）。
 */
//@ chunk-8t8n4kdh.js:66570-66862 sole-consumer
function askDesignConsent(e, n, r) {
  return {
    behavior: "ask",
    message: e,
    updatedInput: { ...n, __consentNonce: r },
    localDisplayOnly: !0,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "design agent consent \u2014 approving records a server-side grant for Claude agents to write your design projects",
      classifierApprovable: !1,
    },
  };
}
//@ chunk-8t8n4kdh.js:66862-66936 sole-consumer
function isDesignServerConfig(e) {
  return (e.type === "sse" || e.type === "http") && isDesignMcpUrl(e.url) && !configHasAuthorizationHeader(e);
}
/**
 * canAskDesignConsent：交互会话且不在 bypass 模式时可以弹 Design 同意请求。
 */
//@ chunk-8t8n4kdh.js:66936-67090 sole-consumer
function canAskDesignConsent(e) {
  let n = getToolPermissionContext(e);
  return (
    !e.options.isNonInteractiveSession &&
    n.mode !== "bypassPermissions" &&
    !(n.mode === "plan" && n.isBypassPermissionsModeAvailable)
  );
}
/**
 * canPromptForPermission：非 bypass/dontAsk 且未要求避免权限提示。
 */
//@ chunk-8t8n4kdh.js:67090-67262 sole-consumer
function canPromptForPermission(e) {
  let n = getToolPermissionContext(e);
  return (
    n.mode !== "bypassPermissions" &&
    n.mode !== "dontAsk" &&
    !(n.mode === "plan" && n.isBypassPermissionsModeAvailable) &&
    !n.shouldAvoidPermissionPrompts
  );
}
//@ chunk-8t8n4kdh.js:67262-67273 sole-consumer
var MAX_DESIGN_CONSENT_ASKS = 100;
/**
 * rememberDesignConsentAsk：按 toolUseId 记录待确认的 consent 位与 nonce（最多 100 条）。
 */
//@ chunk-8t8n4kdh.js:67273-67545 sole-consumer
function rememberDesignConsentAsk(e, n, r) {
  let firstPartyDesignConsentAsks = ht().firstPartyDesignConsentAsks,
    h = firstPartyDesignConsentAsks.get(e),
    y = h !== void 0 && h.bit === n,
    S = y ? h.nonce : randomUUID();
  (firstPartyDesignConsentAsks.delete(e),
    firstPartyDesignConsentAsks.set(e, { bit: n, nonce: S, askReachesUser: y ? h.askReachesUser && r : r }));
  while (firstPartyDesignConsentAsks.size > MAX_DESIGN_CONSENT_ASKS) {
    let w = firstPartyDesignConsentAsks.keys().next().value;
    if (w === void 0) break;
    firstPartyDesignConsentAsks.delete(w);
  }
  return S;
}
/**
 * takeDesignConsentAsk：取出并删除 toolUseId 对应的同意记录，nonce 必须一致。
 */
//@ chunk-8t8n4kdh.js:67545-67755 sole-consumer
function takeDesignConsentAsk(e, n) {
  if (e === void 0) return null;
  let firstPartyDesignConsentAsks = ht().firstPartyDesignConsentAsks,
    s = firstPartyDesignConsentAsks.get(e) ?? null;
  if ((firstPartyDesignConsentAsks.delete(e), s === null || n === void 0 || s.nonce !== n)) return null;
  return { bit: s.bit, askReachesUser: s.askReachesUser };
}
/**
 * wrapCallWithDesignConsent：Design 工具调用遇 needs_consent 时：已批准的位直接提交同意并重试，否则提示用户重试或运行 /design consent。
 */
//@ chunk-8t8n4kdh.js:67755-68588 sole-consumer
function wrapCallWithDesignConsent(e, n) {
  let {
    designSession: designSession,
    approvedConsentBit: approvedConsentBit,
    consentAskReachesUser: consentAskReachesUser,
    credentials: credentials,
  } = n;
  return async (S) => {
    let w = SZe();
    try {
      let P = await e(S);
      if (approvedConsentBit !== null && !S.aborted)
        w?.seedDesignConsentBit(designSession, approvedConsentBit, !0);
      return P;
    } catch (error) {
      if (!(error instanceof FirstPartyDesignNeedsConsentError) || !w) throw error;
      let consent = error.consent;
      if (consent !== approvedConsentBit)
        throw (
          w.seedDesignConsentBit(designSession, consent, !1),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${w.consentPromptFor(consent)} The user hasn't granted this yet \u2014 ask them to retry (the prompt will show on the next call) or run /design consent.`,
            "first-party design MCP needs_consent (not shown)",
          )
        );
      if (!consentAskReachesUser)
        throw (
          w.seedDesignConsentBit(designSession, consent, !1),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${w.consentPromptFor(consent)} The user hasn't granted this \u2014 run /design consent to grant it (it can't be approved automatically in this permission mode).`,
            "first-party design MCP needs_consent (no prompt)",
          )
        );
      return (await w.postDesignConsent(designSession, consent, credentials), e(S));
    }
  };
}
/**
 * wrapFetchWithFirstPartyAuth：一方 MCP 服务器请求附加 claude.ai 登录 bearer，记录最后使用的凭证类型。
 */
//@ chunk-8t8n4kdh.js:68588-69493 sole-consumer
function wrapFetchWithFirstPartyAuth(fetchFn, credentials, r) {
  return (
    (fetchFn = stripRedirectLocation(fetchFn)),
    async (s, h) => {
      let headers = new Headers(h?.headers),
        S = h?.redirect === "error" ? "error" : "manual";
      if (headers.has("Authorization") || !isFirstPartyMcpUrl(s) || !isFirstPartyProvider())
        return fetchFn(s, { ...h, redirect: S });
      let w = async () => {
          let ie = await expandFirstPartyDesignScopes(s, credentials);
          if (((r.last = ie?.bearer ?? "none"), !ie))
            return { response: await fetchFn(s, { ...h, redirect: S }), sentToken: void 0 };
          let accessToken = ie.accessToken;
          Ny().record(accessToken);
          let Ie = { ...Object.fromEntries(new Headers(h?.headers)), Authorization: `Bearer ${accessToken}` };
          return { response: await fetchFn(s, { ...h, headers: Ie, redirect: S }), sentToken: accessToken };
        },
        P = async (ie) => {
          if (ie.response.status === 403 && ie.sentToken && isDesignMcpUrl(s)) {
            let ge = await readNeedsConsentBit(ie.response);
            if (ge !== null) throw new FirstPartyDesignNeedsConsentError(ge);
          }
        },
        M = await w();
      await P(M);
      let { response: response, sentToken: sentToken } = M;
      if (response.status !== 401 || !sentToken) return response;
      if (!(await handleOAuth401Error(sentToken, credentials).catch(() => !1))) {
        let ie =
          isStorageV5Enabled() && credentials !== void 0
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
      return (await P(Q), Q.response);
    }
  );
}
/**
 * mergeRequestHeaders：合并请求头，固定 User-Agent 与 Accept-Encoding: identity。
 */
//@ chunk-8t8n4kdh.js:69493-69716 sole-consumer
function mergeRequestHeaders(e, n, r) {
  let headers = new Headers({ "User-Agent": getMCPUserAgent(), "Accept-Encoding": "identity", ...n });
  new Headers(e).forEach((h, y) => headers.set(y, h));
  for (let [h, y] of Object.entries(r)) headers.set(h, y);
  return (headers.set("Accept", "text/event-stream"), headers);
}
//@ chunk-8t8n4kdh.js:69784-69897 sole-consumer
function normalizeImageMimeType(e) {
  if (!e) return !1;
  let lower = firstLineOf(e, ";").trim().toLowerCase();
  return Yc.has(lower === "image/jpg" ? "image/jpeg" : lower);
}
//@ chunk-8t8n4kdh.js:69897-69936 sole-consumer
var RETRYABLE_HTTP_STATUSES = new Set([500, 502, 504]),
  qs = 60000;
/**
 * MCP 工具调用总超时：配置 timeout（≥1000ms 才算）优先，其次 env `MCP_TOOL_TIMEOUT`，再夹在下限与上限之间；都没有用默认值。（v2）
 */
//@ chunk-8t8n4kdh.js:69936-70082 sole-consumer = getMcpToolTimeoutMs (1)
function getMcpToolTimeoutMs_2(e) {
  let r = (e?.timeout !== void 0 && e.timeout >= 1000 ? e.timeout : void 0) ?? env.MCP_TOOL_TIMEOUT;
  return r !== void 0 ? Math.min(Math.max(r, qs), ec) : qs;
}
/**
 * MCP 普通请求超时：取工具超时与连接超时（MCP_TIMEOUT）两者的较大值。（v2）
 */
//@ chunk-8t8n4kdh.js:70082-70125 affinity
function getMcpRequestTimeoutMs(e) {
  return Math.max(getMcpToolTimeoutMs_2(e), getConnectionTimeoutMs());
}
//@ chunk-8t8n4kdh.js:70125-70170 fingerprint = MCP_STREAMABLE_HTTP_ACCEPT (1)
var MCP_STREAMABLE_HTTP_ACCEPT = "application/json, text/event-stream";
//@ chunk-8t8n4kdh.js:70170-70248 layout
function wrapFetchNoop(e) {
  return async (n, r) => {
    try {
      return await e(n, r);
    } catch (error) {
      rethrowRedactedFetchError(error, n);
    }
  };
}
/**
 * wrapFetchWithTimeout：非 GET 请求加超时（按服务器配置），补 Accept: application/json, text/event-stream 与 traceparent。
 */
//@ chunk-8t8n4kdh.js:70248-70806 fingerprint = wrapFetchWithTimeout (0.76)
function wrapFetchWithTimeout(fetchFn, config) {
  let r = getMcpRequestTimeoutMs(config);
  return async (url, init) => {
    if ((init?.method ?? "GET").toUpperCase() === "GET") return fetchFn(url, init);
    let headers = new Headers(init?.headers);
    if (!headers.has("accept")) headers.set("accept", MCP_STREAMABLE_HTTP_ACCEPT);
    if (shouldPropagateTraceContext()) {
      let j = getActiveSpanId();
      if (j && !headers.has("traceparent")) headers.set("traceparent", j);
    }
    let controller = new AbortController(),
      timer = setTimeout(
        (j) => j.abort(new DOMException("The operation timed out.", "TimeoutError")),
        requestTimeoutForBody(r, init?.body),
        controller,
      );
    timer.unref?.();
    let M = init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal;
    try {
      return await fetchFn(url, {
        ...init,
        headers: headers,
        signal: M,
        ...(getMcpToolTimeoutMs_2(config) > 300000 && { timeout: !1 }),
      });
    } finally {
      clearTimeout(timer);
    }
  };
}
/**
 * 本地 MCP 服务器（stdio/sdk）并发连接批大小：env `MCP_SERVER_CONNECTION_BATCH_SIZE`，默认 3。（v2）
 */
//@ chunk-8t8n4kdh.js:70806-70865 fingerprint = getMcpServerConnectionBatchSize (1)
function getMcpServerConnectionBatchSize() {
  return env.MCP_SERVER_CONNECTION_BATCH_SIZE ?? 3;
}
/**
 * 远程 MCP 服务器并发连接批大小：env `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE`，默认 20。（v2）
 */
//@ chunk-8t8n4kdh.js:70865-70932 fingerprint = getRemoteMcpServerConnectionBatchSize (1)
function getRemoteMcpServerConnectionBatchSize() {
  return env.MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE ?? 20;
}
/**
 * 判断是否本地服务器：未写 type、stdio 或 sdk。决定连接批次与是否自动重连。（v2）
 */
//@ chunk-8t8n4kdh.js:70932-70995 fingerprint = isLocalMcpServer (1)
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
function Xn(e, n) {
  return matchesHostList(getFeatureValue_CACHED_MAY_BE_STALE(e, []), n);
}
/**
 * 判断 MCP 服务器地址的主机（或 CCR 代理目标主机）是否匹配主机列表（支持 * 与子域）。
 */
//@ chunk-8t8n4kdh.js:71191-71577 layout
function matchesHostList(e, n) {
  if (!Array.isArray(e) || e.length === 0) return !1;
  if (e.includes("*")) return !0;
  if (!("url" in n) || typeof n.url !== "string") return !1;
  let flattened = [
    URL.canParse(n.url) ? new URL(n.url).hostname.toLowerCase() : void 0,
    ccrProxyTargetHost(n.url),
  ].flatMap((s) => (s === void 0 ? [] : [s]));
  return e.some((s) => {
    if (typeof s !== "string" || s === "") return !1;
    let lower = s.toLowerCase();
    return flattened.some((y) => y === lower || y.endsWith(`.${lower}`));
  });
}
//@ chunk-8t8n4kdh.js:71577-71656 layout
function Sr(e) {
  return Xn("tengu_mcp_legacy_url_elicitation_server_denylist", e);
}
//@ chunk-8t8n4kdh.js:71656-71723 layout
function shouldNormalizeRootCombinators(e) {
  return Xn("tengu_mcp_normalize_root_combinators", e);
}
//@ chunk-8t8n4kdh.js:71723-71789 layout
function shouldDropInvalidToolSchemas(e) {
  return Xn("tengu_mcp_drop_invalid_tool_schemas", e);
}
/**
 * 测试专用：设置是否保留过期的重新认证条目（非测试调用时抛错）。
 */
//@ chunk-8t8n4kdh.js:71789-71903 layout
function setHoldStaleReauthEntryForTest(e) {
  if (e) throw Error("setHoldStaleReauthEntryForTest is test-only");
  ht().holdStaleReauthEntryForTest = e;
}
//@ chunk-8t8n4kdh.js:71903-71951 layout
function Lg(e) {
  ht().reauthDecisionSinkForTest = e;
}
/**
 * getMcpRoots（v2 副本）。
 */
//@ chunk-8t8n4kdh.js:71951-72261 layout
function getMcpRoots(e = !1) {
  let n = [];
  if (e)
    try {
      n = [pluginToolStagingRoot()];
    } catch (error) {
      logForDebugging(`MCP: staging root unavailable, omitted from roots/list: ${errorMessage(error)}`);
    }
  let r = new Set(),
    s = [],
    h = getToolsMachine(),
    y = h ? (h.directory?.path ?? null) : getOriginalCwdOrNull();
  for (let S of [...(y === null ? [] : [y]), ...getAnnouncedDirectories(), ...n]) {
    let href = pathToFileURL(S).href;
    if (r.has(href)) continue;
    (r.add(href), s.push({ uri: href }));
  }
  return { roots: s };
}
//@ chunk-8t8n4kdh.js:72261-72291 layout
var ROOTLESS_PLUGIN_NAMES = new Set(["documents"]);
//@ chunk-8t8n4kdh.js:72291-72435 layout
function isDocumentsPluginServer(e) {
  if (getPlatform() === "windows") return !1;
  if (!e.pluginSource) return !1;
  try {
    return ROOTLESS_PLUGIN_NAMES.has(parsePluginIdentifier(e.pluginSource).name.toLowerCase());
  } catch {
    return !1;
  }
}
//@ chunk-8t8n4kdh.js:72435-72572 layout
function notifyRootsListChanged() {
  for (let liveClient of getConnectionCache().liveClients)
    liveClient.sendRootsListChanged().catch((n) => {
      logForDebugging(`MCP: failed to send roots/list_changed: ${describeErrorBrief(n)}`);
    });
}
/**
 * MCP SDK 错误码集合与可识别的 JSON Schema 草案地址集合。
 */
//@ chunk-8t8n4kdh.js:72572-73027 layout
var MCP_SDK_ERROR_CODES = new Set(Object.values(Ti)),
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
/**
 * JSON Schema 校验器包装：工具 schema 的 $schema 是已知草案（draft-04/06/07/2019-09）时先去掉该字段再交给内层校验器，避免因方言声明报错。
 */
//@ chunk-8t8n4kdh.js:73027-73216 layout
class LegacyDialectToleratingValidator {
  inner = new Udn();
  getValidator(e) {
    let $schema = e.$schema;
    if ($schema !== void 0 && KNOWN_JSON_SCHEMA_DIALECTS.has($schema.replace(/#$/, ""))) {
      let { $schema: $schema, ...s } = e;
      return this.inner.getValidator(s);
    }
    return this.inner.getValidator(e);
  }
}
/**
 * 常见连接错误码对应的人类可读提示。
 */
//@ chunk-8t8n4kdh.js:73216-73692 layout
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
var ad = 3000;
/**
 * 测试专用：设置 stdio 探测超时（非测试调用时抛错）。
 */
//@ chunk-8t8n4kdh.js:73704-73825 layout
function setStdioProbeTimeoutMsForTest(e) {
  if (e !== void 0) throw Error("setStdioProbeTimeoutMsForTest is test-only");
  ht().stdioProbeTimeoutMsForTest = e;
}
//@ chunk-8t8n4kdh.js:73825-73882 layout
function getStdioProbeTimeoutMs() {
  return ht().stdioProbeTimeoutMsForTest ?? ad;
}
//@ chunk-8t8n4kdh.js:73882-73960 layout
var REMOTE_PROBE_TIMEOUT_MS = 5000,
  cd = 5000,
  NEGOTIABLE_TRANSPORTS = new Set(["http", "claudeai-proxy", "ccr-proxy", "stdio"]);
//@ chunk-8t8n4kdh.js:73960-74026 layout
function getHandshakeTimeoutMs(e = cd) {
  let n = getConnectionTimeoutMs();
  return Math.max(n - e, Math.floor(n / 3));
}
/**
 * classifyTransportKind：in-process/ccr-toolport/ccr-proxy/http/sse/ws/ide/claudeai-proxy/sdk-control/stdio。
 */
//@ chunk-8t8n4kdh.js:74026-74364 layout
function classifyTransportKind(e, { inProcess: inProcess, ccrProxy: ccrProxy, ccrToolport: ccrToolport }) {
  if (inProcess) return "in-process";
  switch (e) {
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
    case void 0:
      return "stdio";
  }
}
//@ chunk-8t8n4kdh.js:74364-74598 layout
function rewriteInitializeCapabilities(e, n, r) {
  let s = e.send.bind(e);
  e.send = (h, y) => {
    if (fZ(h) && h.method === "initialize" && h.params?.capabilities !== void 0) {
      let S = clientCapabilitiesFor(n, { denylisted: Sr(n) });
      return s({ ...h, params: { ...h.params, capabilities: r ? stripTasksCapability(S) : S } }, y);
    }
    return s(h, y);
  };
}
/**
 * isNegotiationDenylisted：服务器主机在 tengu_mcp_negotiation_server_denylist 中。
 */
//@ chunk-8t8n4kdh.js:74598-74666 layout
function isNegotiationDenylisted(e) {
  return Xn("tengu_mcp_negotiation_server_denylist", e);
}
/**
 * isListenDenylisted：服务器主机在 tengu_mcp_listen_server_denylist 中（不发 subscriptions/listen）。
 */
//@ chunk-8t8n4kdh.js:74666-74729 layout
function isListenDenylisted(e) {
  return Xn("tengu_mcp_listen_server_denylist", e);
}
//@ chunk-8t8n4kdh.js:74729-74828 layout
function pd(e) {
  let { value: n, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    "tengu_tender_truffle",
    [],
  );
  return { listed: matchesHostList(n, e), source: source };
}
/**
 * resolveVersionNegotiation：决定协议版本协商模式。MCP_PROTOCOL_NEGOTIATION=legacy|auto 优先；否则按传输查 GrowthBook tengu_mcp_protocol_negotiation_http/_claudeai/_stdio/_ccr（默认 true → auto），sse/ws/ide/进程内/sdk 一律 legacy；命中 tengu_mcp_negotiation_server_denylist 也回 legacy。auto 带探测超时（远程 5 秒，stdio 可测试覆盖，均不超过连接超时的 1/3）。
 */
//@ chunk-8t8n4kdh.js:74828-76257 layout
function resolveVersionNegotiation(transportKind, config, denylisted) {
  let MCP_PROTOCOL_NEGOTIATION = env.MCP_PROTOCOL_NEGOTIATION,
    h =
      MCP_PROTOCOL_NEGOTIATION === "legacy" || MCP_PROTOCOL_NEGOTIATION === "auto"
        ? MCP_PROTOCOL_NEGOTIATION
        : void 0;
  if (MCP_PROTOCOL_NEGOTIATION !== void 0 && h === void 0)
    logForDebugging(
      `MCP_PROTOCOL_NEGOTIATION=${MCP_PROTOCOL_NEGOTIATION} is invalid; expected 'legacy' or 'auto' \u2014 ignoring`,
      { level: "warn" },
    );
  if (h === "legacy") return { mode: "legacy" };
  let y = { timeoutMs: Math.min(REMOTE_PROBE_TIMEOUT_MS, Math.floor(getConnectionTimeoutMs() / 3)) },
    S = { timeoutMs: Math.min(getStdioProbeTimeoutMs(), Math.floor(getConnectionTimeoutMs() / 3)) };
  if (h === "auto") {
    if (!NEGOTIABLE_TRANSPORTS.has(transportKind)) return { mode: "legacy" };
    return transportKind === "stdio" ? { mode: "auto", probe: S } : { mode: "auto", probe: y };
  }
  let w = (() => {
    switch (transportKind) {
      case "http":
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_protocol_negotiation_http", !0) === !1
          ? { mode: "legacy" }
          : { mode: "auto", probe: y };
      case "claudeai-proxy":
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_protocol_negotiation_claudeai", !0) === !1
          ? { mode: "legacy" }
          : { mode: "auto", probe: y };
      case "stdio":
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_protocol_negotiation_stdio", !0) === !1
          ? { mode: "legacy" }
          : { mode: "auto", probe: S };
      case "ccr-proxy":
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_protocol_negotiation_ccr", !0) === !1
          ? { mode: "legacy" }
          : { mode: "auto", probe: y };
      case "sse":
      case "ws":
      case "ide":
      case "ccr-toolport":
      case "in-process":
      case "sdk-control":
        return { mode: "legacy" };
    }
  })();
  if (w.mode === "auto" && config !== void 0 && (denylisted ?? isNegotiationDenylisted(config))) {
    let P = "a url-less server (the '*' entry)";
    if ("url" in config && typeof config.url === "string") {
      try {
        P = new URL(config.url).hostname;
      } catch {
        P = "a server with an unparseable url";
      }
      let M = ccrProxyTargetHost(config.url);
      if (M !== void 0) P = `the proxy host ${P} or the mcp_url host ${M}`;
    }
    return (
      logForDebugging(`MCP era negotiation denylist matched ${P}; the legacy handshake applies`),
      { mode: "legacy" }
    );
  }
  return w;
}
/**
 * Java MCP SDK 拒绝 elicitation 能力的错误识别：错误正则、错误体 schema、读取上限与给用户的修复提示。
 */
//@ chunk-8t8n4kdh.js:76257-76655 layout
var JAVA_ELICITATION_REJECT_REGEX =
    /Unrecognized field \\?"(?:form|url)\\?" \(class [\w.$]*ClientCapabilities\$Elicitation\)/,
  javaErrorBodySchema = DoctorLazy(() =>
    u({ message: T("Invalid message format"), stackTrace: A(u({ className: o() })) }),
  ),
  MAX_JAVA_ERROR_BODY = 262144,
  JAVA_SDK_ELICITATION_HINT = `This server (Java MCP SDK 0.17.0 or older) rejected Claude Code's elicitation capability. Set "bareElicitationCapability": true for it, or upgrade to Java MCP SDK 0.17.1+ (Spring AI 1.0.7+ or 1.1.6+).`;
//@ chunk-8t8n4kdh.js:76655-76895 layout
function isJavaSdkElicitationRejection(e, n, r) {
  let s = r instanceof Bdn && r.protocolVersion !== void 0;
  return (
    (((e instanceof ProtocolError || e instanceof SdkHttpError) &&
      JAVA_ELICITATION_REJECT_REGEX.test(e.message)) ||
      (e instanceof SdkHttpError && e.status === 400 && !s && isJavaSdkStackTraceBody(e.data.text))) &&
    clientCapabilitiesFor(n, { denylisted: Sr(n) }).elicitation?.url !== void 0
  );
}
//@ chunk-8t8n4kdh.js:76895-77101 layout
function isJavaSdkStackTraceBody(e) {
  if (typeof e !== "string" || e.length > MAX_JAVA_ERROR_BODY) return !1;
  let safeParse = javaErrorBodySchema().safeParse(safeParseJSON(e, !1));
  return (
    safeParse.success &&
    safeParse.data.stackTrace.some((r) => r.className.startsWith("io.modelcontextprotocol.server.transport."))
  );
}
//@ chunk-8t8n4kdh.js:77101-77281 layout
function isNonJsonRpcClientError(e) {
  if (!(e instanceof SdkHttpError)) return !1;
  let status = e.status;
  if (!(status >= 400 && status < 500) || status === 401 || status === 403 || status === 429) return !1;
  let text = e.data.text;
  if (typeof text !== "string") return !0;
  return !isJsonRpcErrorBody(text);
}
//@ chunk-8t8n4kdh.js:77281-77469 layout
function isJsonRpcErrorBody(e) {
  let found = e.split(/\r?\n/).find((s) => s.startsWith("data:")),
    r = safeParseJSON(found === void 0 ? e : found.slice(5), !1);
  return zAe(typeof r === "object" && r !== null && "id" in r && r.id === null ? { ...r, id: void 0 } : r);
}
/**
 * getListingDiscoverPrior：claudeai-proxy（非 stateless）的 discover 先验：discoverSupport=legacy → legacy；supported 且开关 all → 用 /v1/mcp_servers 投影的 DiscoverResult 作为 modern 先验，省去线上 server/discover。
 */
//@ chunk-8t8n4kdh.js:77469-77794 layout
function getListingDiscoverPrior(e) {
  if (e.type !== "claudeai-proxy" || e.stateless === !0) return;
  let n = discoverProjectionPrior();
  if (n === "off") return;
  if (ht().burnedListingDiscoverPriors.has(e.id)) return;
  if (e.discoverSupport === "legacy") return { kind: "legacy" };
  if (n !== "all" || e.discoverSupport !== "supported") return;
  let r = getCachedDiscoverResult(e);
  return r === void 0 ? void 0 : { kind: "modern", discover: r };
}
/**
 * burnDiscoverPrior：基于先验的连接被拒后，本进程内不再使用该先验；legacy 先验同时删除持久判定。
 */
//@ chunk-8t8n4kdh.js:77794-77905 layout
function burnDiscoverPrior(e, n, r) {
  let s = getDiscoverVerdictKey(e);
  if (s !== void 0) {
    if ((ht().burnedListingDiscoverPriors.add(s), n === "legacy")) forgetDiscoverVerdict(e, r);
  }
}
/**
 * getRememberedLegacyPrior：可记键的服务器若判定表记为 legacy peer，返回 {kind:'legacy'} 先验。
 */
//@ chunk-8t8n4kdh.js:77905-78171 layout
async function getRememberedLegacyPrior(e, n) {
  let r = getDiscoverVerdictKey(e);
  if (
    r === void 0 ||
    (e.type === "claudeai-proxy" && (e.stateless === !0 || e.discoverSupport === "supported")) ||
    (isStdioConfig(e) && env.MCP_PROTOCOL_NEGOTIATION === "auto") ||
    ht().burnedListingDiscoverPriors.has(r)
  )
    return;
  return (await isRememberedLegacyPeer(e, n)) ? { kind: "legacy" } : void 0;
}
/**
 * MCP initialize / tools/list 方法判定（MCP 客户端代码，切分误归）。
 */
//@ chunk-8t8n4kdh.js:78171-78228 placement = initializeAgentMemorySnapshots (0.502)
function isSessionHandshakeMethod(agents) {
  return agents === "initialize" || agents === "tools/list";
}
/**
 * MCP JSON-RPC 错误码分类（rpc_era / rpc_session）。
 */
//@ chunk-8t8n4kdh.js:78228-78420 placement
function classifyMcpRpcErrorCode(e, n) {
  if (e === ma.UnsupportedProtocolVersion || e === ma.MissingRequiredClientCapability) return "rpc_era";
  if (e === ma.InvalidRequest || (e === ma.MethodNotFound && isSessionHandshakeMethod(n)))
    return "rpc_session";
  return;
}
/**
 * MCP 连接错误分类（ProtocolError / SdkHttpError）。
 */
//@ chunk-8t8n4kdh.js:78420-78579 placement
function classifyMcpConnectError(e, n) {
  if (e instanceof ProtocolError) return classifyMcpRpcErrorCode(e.code, n);
  if (e instanceof SdkHttpError) {
    if (e.status === 400 || ((e.status === 404 || e.status === 405) && isSessionHandshakeMethod(n)))
      return "http_4xx";
  }
  return;
}
/**
 * HTTP 400 且响应体是 JSON-RPC 错误码 UnsupportedProtocolVersion / MissingRequiredClientCapability 时为真；握手分类用来判断"协议代际不符"。
 */
//@ chunk-8t8n4kdh.js:78579-78775 sole-consumer
function isUnsupportedVersionHttp400(e) {
  if (!(e instanceof SdkHttpError) || e.status !== 400 || typeof e.data.text !== "string") return !1;
  let n = ds(e.data.text);
  return n === ma.UnsupportedProtocolVersion || n === ma.MissingRequiredClientCapability;
}
/**
 * makeConnectTimeoutError（v2 副本）。
 */
//@ chunk-8t8n4kdh.js:78775-78931 sole-consumer
function makeConnectTimeoutError_2(e) {
  let n = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(e, "MCP connection timeout");
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_timeout_retry", !0))
    return Object.assign(n, { code: "CONNECT_TIMEOUT" });
  return n;
}
/**
 * 插件来源的 stdio 服务器连接失败时，按服务器签名在认证/失败缓存文件里写一条带时间戳的记录（经 authCacheWriteChain 串行化写入），下次可跳过。
 */
//@ chunk-8t8n4kdh.js:78931-79035 sole-consumer = getServerCommandArray (0.781)
function recordPluginStdioServerFailure(e, n, r) {
  if ((n.type === "stdio" || n.type === void 0) && n.pluginSource !== void 0)
    setMcpAuthCacheEntry(e, Yz(n), void 0, r);
}
/**
 * 包装传输 send：initialize 请求发出后立刻预发 tools/list（超时取 2×连接超时与上限的较小者），减少一次往返；出错时撤销包装，结果记入连接统计 sentAhead。
 */
//@ chunk-8t8n4kdh.js:79035-79874 sole-consumer
async function pipelineEarlyToolsList(e, n, r, s, h) {
  let send = n.send,
    S,
    w,
    P;
  function M() {
    let startTime = performance.now();
    ((P = new AbortController()),
      (w = e.request({ method: "tools/list" }, extend_44, {
        timeout: Math.min(2 * getConnectionTimeoutMs(), ec),
        signal: P.signal,
      })),
      w.catch(() => {}),
      (s.sentAhead = !0),
      WGs(s, w, startTime));
  }
  let j = (Q, ie) => {
    if (h && lYn(Q)) {
      let ge = send.call(n, Q, ie);
      return (M(), ge);
    }
    if (S !== void 0 || !qNr(Q)) return send.call(n, Q, ie);
    if (n.send === j) n.send = send;
    return ((S = send.call(n, Q, ie)), S.catch(() => {}), Promise.resolve());
  };
  n.send = j;
  let onerror = e.onerror;
  e.onerror = (Q) => {
    (WDo(s), onerror?.(Q));
  };
  function ce() {
    (WDo(s), e.close().catch(() => {}));
  }
  try {
    if ((await e.connect(n, { timeout: r }), S === void 0)) return;
    if (h) {
      let Q = setTimeout(ce, r);
      (Q.unref?.(), S.catch(ce).finally(() => clearTimeout(Q)));
    } else {
      if (e.getServerCapabilities()?.tools !== void 0) M();
      try {
        await S;
      } catch (error) {
        throw (ce(), error);
      }
    }
  } finally {
    if (((e.onerror = onerror), n.send === j)) n.send = send;
  }
  if (w !== void 0 && P !== void 0) armRequestTimeout(w, P);
  GGs(s);
}
/**
 * 2×连接超时不超过该服务器的有效工具超时时才允许预发 tools/list。
 */
//@ chunk-8t8n4kdh.js:79874-79910 sole-consumer
function hasBudgetForEarlyToolsList(e) {
  return 2 * getConnectionTimeoutMs() <= getMcpRequestTimeoutMs(e);
}
//@ chunk-8t8n4kdh.js:80092-80104 sole-consumer
var kd = 2000;
/**
 * 在 initialized 通知应答后的固定延迟时记录消息流结果事件。
 */
//@ chunk-8t8n4kdh.js:80104-80486 sole-consumer
function scheduleMessageStreamOutcomeLog(e, n, r, s) {
  let h =
    r.initializedNotificationAnsweredAtMs ??
    (r.pendingMethod === "notifications/initialized" ? performance.now() : void 0);
  if (h === void 0) return;
  setTimeout(
    (S, w, P, M) =>
      logEvent("tengu_mcp_message_stream_outcome", {
        ...M,
        messageStreamGetOutcome: hasNoTransport(S)
          ? lit("client_closed")
          : fromEnum(P.messageStreamGetOutcome),
        mcpServerKeyHash: toolNameForTelemetry(w),
      }),
    Math.max(0, h + kd - performance.now()),
    e,
    n,
    r,
    s,
  ).unref?.();
}
/**
 * connectToServer（v2）：按 name+config 记忆化的连接入口。建传输（sse/sse-ide/ws-ide/ws/http/claudeai-proxy/进程内 Chrome/stdio），组装 fetch 包装（超时、OAuth、头、一方登录、CCR 认证、discover -32601 侦测、握手计时）；按 resolveVersionNegotiation 决定 auto（先 server/discover 再按结果 modern 或 legacy initialize）或 legacy；处理 listing 先验、记住的 legacy 判定、stateless 代理本地应答、探测超时/拒绝后的重启与回退、HTTP→SSE 回退；成功后注册 roots/list、elicitation、onclose/onerror 清理与 list_changed 订阅，失败分类为 failed/needs-auth。
 */
//@ chunk-8t8n4kdh.js:80486-119566 sole-consumer
var connectToServer = memoizeWithExternalCache(
  async (name, serverRef, serverStats, storageV5, credentials, dialOptions, connectOptions) => {
    Er();
    let now = Date.now(),
      P = pBt(connectOptions?.clock ?? Aa),
      M,
      j = identityEpoch(),
      R = getAnnouncedDirectories(),
      ce = serverRef.type ?? "stdio";
    if (
      (logForDiagnosticsNoPII("info", "mcp_connect_starting", { transport: ce }),
      isUnconfiguredUrl(serverRef))
    ) {
      let Te = serverRef.configError ?? "No URL configured for this server";
      return (
        logMCPDebug(name, Te),
        logForDiagnosticsNoPII("info", "mcp_connect_skipped", { transport: ce, reason: "unconfigured" }),
        { name: name, type: "failed", config: serverRef, error: Te, errorCode: "UNCONFIGURED" }
      );
    }
    {
      let configError = serverRef.configError;
      if (!configError && "url" in serverRef)
        try {
          new URL(serverRef.url);
        } catch {
          configError = "'url' is not a valid URL. Update the server's config and reconnect.";
        }
      if (configError)
        return (
          logEvent("tengu_mcp_server_config_invalid", {
            transportType: fromEnum(serverRef.type ?? "stdio"),
            field: lit("url"),
            source: lit(serverRef.configError ? "loader" : "connect"),
          }),
          logMCPDebug(name, configError),
          logMCPError(name, configError),
          logForDiagnosticsNoPII("warn", "mcp_connect_failed", {
            transport: ce,
            duration_ms: Date.now() - now,
            reason: "invalid_config",
          }),
          logFeatureBad("mcp_connect", "mcp_connect_invalid_config"),
          { name: name, type: "failed", config: serverRef, error: configError, errorCode: "INVALID_CONFIG" }
        );
    }
    let inProcessServer,
      authProvider,
      ge = !1,
      Ie = !1,
      transport,
      Pe = isDiskless() ? void 0 : Math.round(process.uptime() * 1000),
      handshakeTrace,
      nt,
      ee,
      he,
      Ae,
      yt = !1,
      q,
      discoverPrior,
      discoverSource,
      Ee,
      Tt = (Te) => {
        ((discoverSource = Te), (Ee = fromEnumOpt(Te)));
      },
      Qe = !1,
      usedRememberedLegacy = !1,
      discoverMethodNotFound = !1,
      wt = () =>
        usedRememberedLegacy ? "the remembered legacy verdict" : "the /v1/mcp_servers discover projection",
      Se = !1,
      negotiation,
      At = !1,
      ft,
      Ot = isListenDenylisted(serverRef),
      vt = isNegotiationDenylisted(serverRef),
      me = () => {
        if (negotiation?.mode !== "auto" || q !== void 0) return;
        let Te = transport?._anthropicProbeLegacyEvidence;
        if (Te === "id-mismatch") q = lit("probe_id_mismatch");
        else if (Te === "malformed") q = lit("probe_malformed");
        else if (Te === "stream-end") q = lit("probe_stream_end");
        if (q !== void 0)
          logMCPDebug(
            name,
            `era probe classified the server legacy in-SDK (${String(Te)}); the 2025 handshake was used for this connect attempt`,
          );
      };
    try {
      let Bt = function () {
          let now = Date.now();
          for (let activeCallWatchdog of We.activeCallWatchdogs)
            if (activeCallWatchdog.armedAt === 0) activeCallWatchdog.armedAt = now;
        },
        Te = isCcrInjectedMcpUrl(name, serverRef),
        Ve = hasCliOwnedBearer(serverRef),
        De =
          (serverRef.type === "sse" || serverRef.type === "http") && configHasAuthorizationHeader(serverRef),
        Le =
          serverRef.type === "sse" || serverRef.type === "http" || serverRef.type === "ws"
            ? await getMcpServerHeaders(name, serverRef)
            : {},
        re =
          (serverRef.type === "sse" || serverRef.type === "http") &&
          !!serverRef.headersHelper &&
          hasAuthorizationHeader(Le),
        ue =
          (serverRef.type === "sse" || serverRef.type === "http") &&
          !De &&
          !re &&
          !Ve &&
          !Te &&
          isFirstPartyMcpUrl(serverRef.url) &&
          isFirstPartyProvider() &&
          (!!(
            isStorageV5Enabled() && credentials !== void 0
              ? await getClaudeAIOAuthTokensAsync(credentials)
              : getClaudeAIOAuthTokens()
          )?.accessToken ||
            (isDesignMcpUrl(serverRef.url) && (await Foe(credentials))));
      if (ue)
        logEvent("tengu_mcp_first_party_auto_auth", {
          transportType: fromEnum(serverRef.type),
          ...mcpBaseUrlAnalytics_2(serverRef, name),
        });
      let ot = {};
      if (serverRef.type === "sse") {
        recordPresentedHeaderSecrets(serverRef.headers, Le);
        let x = De || re || ue || Ve ? void 0 : new ClaudeAuthProvider_2(name, serverRef);
        authProvider = x;
        let U = await mcpProxyFetchOptions(serverRef.url),
          Z = createBoundedFetch(wrapFetchNoop(MBt(void 0, U)));
        if (x) Z = wrapFetchWithStepUpDetection_2(Z, x);
        if (((Z = wrapFetchWithTimeout(Z, serverRef)), ue))
          Z = wrapFetchWithFirstPartyAuth(Z, credentials, ot);
        let fe = {
            authProvider: x,
            skipIssuerMetadataValidation: !0,
            fetch: Z,
            requestInit: {
              ...U,
              headers: { "User-Agent": getMCPUserAgent(), "Accept-Encoding": "identity", ...Le },
            },
          },
          Ne = wrapFetchNoop(async (Je, le) => {
            let dt = {},
              Et = await x?.tokens();
            if (Et) dt.Authorization = `Bearer ${Et.access_token}`;
            let It = await mcpProxyFetchOptions(String(Je));
            return fetch(Je, { ...le, ...It, headers: mergeRequestHeaders(le?.headers, dt, Le) });
          });
        ((fe.eventSourceInit = {
          fetch: createBoundedFetch(
            x
              ? wrapFetchWithStepUpDetection_2(Ne, x)
              : ue
                ? wrapFetchWithFirstPartyAuth(Ne, credentials, ot)
                : Ne,
          ),
        }),
          (Ae = () => new dYn(new URL(serverRef.url), fe)),
          (transport = Ae()),
          logMCPDebug(name, "SSE transport initialized, awaiting connection"));
      } else if (serverRef.type === "sse-ide") {
        logMCPDebug(name, `Setting up SSE-IDE transport to ${redactUrlSecrets(serverRef.url)}`);
        let x = {
          fetch: createBoundedFetch(globalThis.fetch),
          requestInit: { headers: { "User-Agent": getMCPUserAgent(), "Accept-Encoding": "identity" } },
        };
        transport = new dYn(new URL(serverRef.url), x);
      } else if (serverRef.type === "ws-ide") {
        let x = getWebSocketTLSOptions(serverRef.url);
        Ny().record(serverRef.authToken);
        let U = {
            "User-Agent": getMCPUserAgent(),
            ...(serverRef.authToken && { "X-Claude-Code-Ide-Authorization": serverRef.authToken }),
          },
          Z = new globalThis.WebSocket(serverRef.url, {
            protocols: ["mcp"],
            headers: U,
            proxy: getWebSocketProxyUrl(serverRef.url),
            tls: x || void 0,
          });
        transport = new WebSocketTransport(Z, (fe) => fZe.parse(fe));
      } else if (serverRef.type === "ws") {
        (recordPresentedHeaderSecrets(serverRef.headers, Le),
          logMCPDebug(name, `Initializing WebSocket transport to ${redactUrlSecrets(serverRef.url)}`));
        let x = getWebSocketTLSOptions(serverRef.url),
          U = Te ? getSessionIngressAuthToken() : null;
        Ny().record(U ?? void 0);
        let Z = { "User-Agent": getMCPUserAgent(), ...(U && { Authorization: `Bearer ${U}` }), ...Le },
          fe = redactHeaders(Z);
        logMCPDebug(
          name,
          `WebSocket transport options: ${jsonStringify({ url: redactUrlSecrets(serverRef.url), headers: fe, hasSessionAuth: !!U })}`,
        );
        let ve = new globalThis.WebSocket(serverRef.url, {
          protocols: ["mcp"],
          headers: Z,
          proxy: getWebSocketProxyUrl(serverRef.url),
          tls: x || void 0,
        });
        transport = new WebSocketTransport(ve, (Ne) => fZe.parse(Ne));
      } else if (serverRef.type === "http") {
        if ((recordPresentedHeaderSecrets(serverRef.headers, Le), keepsMCPDebug()))
          (logMCPDebug(name, `Initializing HTTP transport to ${redactUrlSecrets(serverRef.url)}`),
            logMCPDebug(name, `Node version: ${process.version}, Platform: linux`),
            logMCPDebug(
              name,
              `Environment: ${jsonStringify({ NODE_OPTIONS: env.NODE_OPTIONS || "not set", UV_THREADPOOL_SIZE: env.UV_THREADPOOL_SIZE || "default", HTTP_PROXY: redactUrlsInText(env.HTTP_PROXY || "not set"), HTTPS_PROXY: redactUrlsInText(env.HTTPS_PROXY || "not set"), NO_PROXY: env.NO_PROXY || "not set" })}`,
            ));
        let x = De || re || ue || Ve || Te ? void 0 : new ClaudeAuthProvider_2(name, serverRef);
        authProvider = x;
        let U = await mcpProxyFetchOptions(serverRef.url),
          Z = createBoundedFetch(wrapFetchNoop(MBt(Te ? hostedWorkerFetch : void 0, U)), {
            refusesCodings: issuerKey_3(serverRef.url),
          });
        if (x) Z = wrapFetchWithStepUpDetection_2(Z, x);
        if (((Z = wrapFetchWithTimeout(Z, serverRef)), ue))
          Z = wrapFetchWithFirstPartyAuth(Z, credentials, ot);
        if (Te)
          Z = wrapFetchSkipListenGet(
            wrapFetchWithCcrSessionAuth(Z, dialOptions, ir(name, serverRef)),
            name,
            serverRef.url,
          );
        if (((Z = restrictRemoteRepoCalls(Z, serverRef)), issuerKey_3(serverRef.url))) {
          let Ne = Z;
          Z = (Je, le) => {
            let dt = le?.method === "POST" ? getRequestTimingStore()?.mark("own") : void 0;
            return Ne(Je, le).finally(dt);
          };
        }
        if (Ve) Z = wrapFetchWithCliOwnedBearer(Z, serverRef);
        if (getDiscoverVerdictKey(serverRef) !== void 0)
          Z = wrapFetchDetectDiscoverMethodNotFound(Z, () => {
            discoverMethodNotFound = !0;
          });
        let fe = createHandshakeTrace({
          mcpUrl: serverRef.url,
          keepAliveDisabled: U.keepalive === !1,
          getAnsweredLocally: !1,
          statelessGated: !1,
        });
        ((handshakeTrace = fe), (Z = wrapFetchWithHandshakeTrace(Z, fe)));
        let ve = {
          authProvider: x,
          skipIssuerMetadataValidation: !0,
          fetch: Z,
          requestInit: {
            ...U,
            headers: { "User-Agent": getMCPUserAgent(), "Accept-Encoding": "identity", ...Le },
          },
        };
        if (keepsMCPDebug()) {
          let Ne = ve.requestInit?.headers ? redactHeaders(ve.requestInit.headers) : void 0;
          logMCPDebug(
            name,
            `HTTP transport options: ${jsonStringify({ url: redactUrlSecrets(serverRef.url), headers: Ne, hasAuthProvider: !!x, timeoutMs: getMcpRequestTimeoutMs(serverRef) })}`,
          );
        }
        if (
          ((he = () => (resetHandshakeTrace(fe), new Bdn(new URL(serverRef.url), ve))),
          (transport = he()),
          logMCPDebug(name, "HTTP transport created successfully"),
          !isCcrHostedConfig(serverRef) && !isFirstPartyMcpUrl(serverRef.url) && !Ve)
        )
          nt = ({
            postMethodNotAllowed: postMethodNotAllowed,
            dialSignal: dialSignal,
            dialConnected: dialConnected,
          }) => {
            let dt = (Gt) =>
                dialConnected()
                  ? Gt
                  : { ...Gt, signal: Gt?.signal ? AbortSignal.any([Gt.signal, dialSignal]) : dialSignal },
              Et = !1,
              It = async (Gt, tn) => {
                let An = await Z(Gt, dt(tn));
                if (!postMethodNotAllowed && !Et) {
                  if (An.status === 401)
                    throw (
                      await An.body?.cancel().catch(() => {}),
                      Error(
                        "legacy HTTP+SSE stream GET answered 401 after the initialize POST was not a 405; not starting OAuth against this URL",
                      )
                    );
                  Et = An.ok;
                }
                return An;
              },
              Zt = (Gt, tn) =>
                tn?.body instanceof URLSearchParams && tn.body.has("grant_type") ? Z(Gt, tn) : Z(Gt, dt(tn));
            return new dYn(new URL(serverRef.url), {
              authProvider: x,
              skipIssuerMetadataValidation: !0,
              fetch: Zt,
              eventSourceInit: { fetch: It },
              requestInit: ve.requestInit,
            });
          };
      } else if (serverRef.type === "sdk") throw Error("SDK servers should be handled in print.ts");
      else if (serverRef.type === "claudeai-proxy") {
        if (!isFirstPartyProvider())
          throw Error("claude.ai MCP proxy is not available on third-party providers");
        if (
          (logMCPDebug(name, `Initializing claude.ai proxy transport for server ${serverRef.id}`),
          !(isStorageV5Enabled() && credentials !== void 0
            ? await getClaudeAIOAuthTokensAsync(credentials)
            : getClaudeAIOAuthTokens()))
        )
          throw Error("No claude.ai OAuth token found");
        let U = getOauthConfig(),
          Z = `${U.MCP_PROXY_URL}${U.MCP_PROXY_PATH.replace("{server_id}", serverRef.id)}`;
        logMCPDebug(name, `Using claude.ai proxy at ${Z}`);
        let fe = getProxyFetchOptions({ url: Z }),
          ve = createClaudeAiProxyFetch(createBoundedFetch(MBt(void 0, fe)), credentials),
          Ne = t4n(),
          Je = Ne || isStatelessClaudeAiProxy(serverRef);
        if (Je)
          logMCPDebug(
            name,
            Ne
              ? "GET notification stream disabled for claude.ai connectors; a GET the SDK sends to the proxy URL is answered locally with 405"
              : "GET notification stream disabled (stateless connector); if the SDK requests it, it gets a local 405",
          );
        let le = createHandshakeTrace({
          mcpUrl: Z,
          keepAliveDisabled: fe.keepalive === !1,
          getAnsweredLocally: Je,
          statelessGated: isStatelessClaudeAiProxy(serverRef),
        });
        handshakeTrace = le;
        let Et = {
          fetch: wrapFetchWithHandshakeTrace(
            wrapFetchDetectDiscoverMethodNotFound(
              Je
                ? answerGetStreamLocally(wrapFetchWithTimeout(ve, serverRef), Z)
                : wrapFetchWithTimeout(ve, serverRef),
              () => {
                discoverMethodNotFound = !0;
              },
            ),
            le,
          ),
          requestInit: {
            ...fe,
            headers: {
              "User-Agent": getMCPUserAgent(),
              "Accept-Encoding": "identity",
              "X-Mcp-Client-Session-Id": getSessionId(),
            },
          },
        };
        ((he = () => (resetHandshakeTrace(le), new Bdn(new URL(Z), Et))),
          (transport = he()),
          logMCPDebug(name, "claude.ai proxy transport created successfully"));
      } else if (isStdioConfig(serverRef) && isClaudeInChromeMCPServer(name)) {
        let { isClaudeInChromeAllowed: isClaudeInChromeAllowed } = await import("./chunk-2jvt0tn4.js");
        if (!isClaudeInChromeAllowed())
          return (
            logMCPDebug(name, "Skipping connection (Claude in Chrome is blocked by org policy)"),
            {
              name: name,
              type: "failed",
              config: serverRef,
              error: BLOCKED_BY_POLICY_REASON,
              errorCode: "POLICY_BLOCKED",
            }
          );
        let { createChromeContext: createChromeContext } = await import("./chunk-ztt2k9pv.js"),
          {
            createChromeSocketClient: createChromeSocketClient,
            createClaudeForChromeMcpServer: createClaudeForChromeMcpServer,
          } =
            env.CLAUDE_CODE_CHROME_LATE_MCP_SERVER === !0
              ? await import("./chunk-t8hkp4g3.js")
              : await import("./chunk-3ewc7v9f.js"),
          { createLinkedTransportPair: createLinkedTransportPair } = await import("./chunk-qa6ep5c8.js"),
          { setChromeBinding: setChromeBinding } = await import("./chunk-yx8pxhkm.js"),
          { registerChromeTabGroupCleanup: registerChromeTabGroupCleanup } =
            await import("./chunk-9a6n2431.js"),
          le = createChromeContext(serverRef.env, {
            availabilityFunnel: !0,
            credentials: credentials,
            bearerGate: async () => isClaudeInChromeAllowed(),
          }),
          dt = createChromeSocketClient(le);
        (setChromeBinding(le, dt),
          registerChromeTabGroupCleanup(),
          (inProcessServer = createClaudeForChromeMcpServer(le, dt)));
        let [Et, It] = createLinkedTransportPair();
        (await inProcessServer.connect(It),
          (transport = Et),
          logMCPDebug(name, "In-process Chrome MCP server started"));
      } else if (serverRef.type === "stdio" || !serverRef.type) {
        CR();
        let x = () => ({
            shellPrefix: env.CLAUDE_CODE_SHELL_PREFIX,
            baseEnv: shouldUseMcpAllowlistEnv() ? { ...ko(), ...agentProxyEnv() } : { ...subprocessEnv() },
          }),
          { shellPrefix: shellPrefix, baseEnv: baseEnv } = runWithPluginWriteScope(serverRef, x),
          fe = shellPrefix || serverRef.command,
          ve = shellPrefix ? [shellQuoteArgs([serverRef.command, ...serverRef.args])] : serverRef.args,
          {
            command: command,
            args: args,
            pending: pending,
            capped: capped,
          } = isMcpServerBackingToolHook(name)
            ? { command: fe, args: ve, pending: !1, capped: !1 }
            : wrapCommandInCgroup("mcp", fe, ve);
        ((ge = pending), (Ie = capped));
        let {
            CLAUDE_CODE_CHILD_SESSION: CLAUDE_CODE_CHILD_SESSION,
            CLAUDE_CODE_CHROME_MCP_ORG_DENIED: CLAUDE_CODE_CHROME_MCP_ORG_DENIED,
            ...Zt
          } = baseEnv,
          Gt = getProjectConfigRoot(),
          tn = {
            ...Zt,
            CLAUDE_PROJECT_DIR: Gt ?? getProjectRoot(),
            CLAUDE_CODE_SESSION_ID: getSessionId(),
            CLAUDECODE: "1",
            ...serverRef.env,
            ...(!isPolicyAllowed("allow_claude_browser_extension") && {
              CLAUDE_CODE_CHROME_MCP_ORG_DENIED: "1",
            }),
          };
        (checkPluginBunOptions(serverRef.pluginSource, tn, Zt),
          (ee = { command: command, args: args, env: tn, stderr: "pipe", ...(Gt !== null && { cwd: Gt }) }),
          (transport = new BoundedStdioClientTransport(ee)));
      } else throw Error(`Unsupported server type: ${serverRef.type}`);
      let it,
        ye,
        be = "",
        ct = () => {
          if (serverRef.type === "stdio" || !serverRef.type) {
            let x = transport;
            if (x.stderr instanceof Readable)
              ((ye = x.stderr),
                (it = (U) => {
                  if (be.length < 67108864)
                    try {
                      be += U.toString();
                    } catch {}
                }),
                ye.on("data", it));
          }
        };
      ct();
      let $t = classifyTransportKind(serverRef.type, {
        inProcess: inProcessServer !== void 0,
        ccrProxy: isCcrHostedConfig(serverRef),
        ccrToolport: serverRef.type === "http" && isCcrMcpPath(serverRef.url),
      });
      if (((negotiation = resolveVersionNegotiation($t, serverRef, vt)), negotiation.mode === "auto")) {
        if (((discoverPrior = getListingDiscoverPrior(serverRef)), discoverPrior === void 0))
          ((discoverPrior = await getRememberedLegacyPrior(serverRef, storageV5)),
            (usedRememberedLegacy = discoverPrior !== void 0));
      }
      let Vt = shouldRestrictRemoteHost(serverRef),
        Fe = (x) => {
          let U = yt
              ? LSn()
              : x.mode === "auto"
                ? HSn()
                : clientCapabilitiesFor(serverRef, { denylisted: Sr(serverRef) }),
            Z = new cLo(
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
                jsonSchemaValidator: MPe() ? NO_OP_SCHEMA_VALIDATOR : new LegacyDialectToleratingValidator(),
                responseCacheStore: Es(name),
                versionNegotiation: x,
                ...(Ot
                  ? {}
                  : {
                      listChanged: {
                        tools: { autoRefresh: !1, debounceMs: 0, onChanged: () => noteListChangedAhead(Z) },
                        prompts: { autoRefresh: !1, debounceMs: 0, onChanged: () => {} },
                        resources: { autoRefresh: !1, debounceMs: 0, onChanged: () => {} },
                      },
                    }),
              },
            );
          if (
            (Z.setRequestHandler(
              "roots/list",
              async () => (
                logMCPDebug(name, "Received ListRoots request from server"),
                getMcpRoots(isDocumentsPluginServer(serverRef))
              ),
            ),
            Vt)
          )
            ht().clientTasksDeclaredBeforeServerList.set(Z, U);
          return Z;
        },
        client = Fe(negotiation);
      if (
        (logMCPDebug(name, `Starting connection with timeout of ${getConnectionTimeoutMs()}ms`),
        serverRef.type === "http" && keepsMCPDebug())
      ) {
        logMCPDebug(name, `Testing basic HTTP connectivity to ${redactUrlSecrets(serverRef.url)}`);
        try {
          let x = new URL(serverRef.url),
            U = redactUrlSecrets(x.href),
            Z = URL.canParse(U) ? new URL(U) : void 0;
          if (
            (logMCPDebug(
              name,
              Z
                ? `Parsed URL: host=${Z.hostname}, port=${Z.port || "default"}, protocol=${Z.protocol}`
                : `Parsed URL: ${U}`,
            ),
            x.hostname === "127.0.0.1" || x.hostname === "localhost")
          )
            logMCPDebug(name, `Using loopback address: ${x.hostname}`);
        } catch {
          logMCPDebug(name, `Failed to parse URL: ${redactUrlSecrets(serverRef.url)}`);
        }
      }
      let mt = getCachedInitializeResult(serverRef),
        et = getLocalDiscoverAnswer(serverRef);
      if (isStatelessClaudeAiProxy(serverRef)) {
        if (
          (logMCPDebug(
            name,
            mt
              ? "Stateless claudeai-proxy \u2014 resolving MCP initialize from cached projection"
              : "Stateless claudeai-proxy \u2014 no cached projection; real initialize, GET SSE suppressed",
          ),
          et !== void 0)
        )
          logMCPDebug(
            name,
            et === "method-not-found"
              ? "Stateless claudeai-proxy \u2014 server/discover resolved locally as legacy (method-not-found)"
              : "Stateless claudeai-proxy \u2014 resolving server/discover from cached projection",
          );
        answerHandshakeLocally(transport, mt, et);
      }
      guardTransportSend({ name: name }, transport);
      let Oe = (x) => {
        let U = x instanceof SdkHttpError ? x.status : void 0;
        return (
          x instanceof UnauthorizedError ||
          (x instanceof Error && x.name === "UnauthorizedError") ||
          (x instanceof kR && authProvider?.sawAuthChallenge === !0) ||
          x instanceof IssuerEchoCrossOriginError ||
          (serverRef.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(x)) ||
          U === 401 ||
          U === 403
        );
      };
      if (negotiation.mode === "auto")
        Tt(
          discoverPrior !== void 0
            ? usedRememberedLegacy
              ? "remembered_legacy"
              : discoverPrior.kind === "modern"
                ? "listing_body"
                : "listing_legacy"
            : isStatelessClaudeAiProxy(serverRef) && (et !== void 0 || mt !== void 0)
              ? "stateless_local"
              : "wire",
        );
      let we,
        Ke = async (x, U) => {
          if (
            (logMCPDebug(
              name,
              x.kind === "modern"
                ? "claude.ai proxy \u2014 adopting the /v1/mcp_servers discover projection (2026-07-28 era; no server/discover round trip)"
                : usedRememberedLegacy
                  ? "remembered as a legacy peer from an earlier connect (its server/discover probe was answered method-not-found or not at all); skipping the probe"
                  : "claude.ai proxy \u2014 /v1/mcp_servers projects a legacy peer; skipping the server/discover probe",
            ),
            await client.connect(U, {
              timeout:
                U instanceof BoundedStdioClientTransport ? getConnectionTimeoutMs() : getHandshakeTimeoutMs(),
              prior: x,
            }),
            x.kind !== "modern" || Ot)
          )
            return;
          let Z = listChangedCapabilities(client);
          if (Z === void 0) return;
          try {
            let listen = await client.listen(Z, { timeout: getHandshakeTimeoutMs() });
            if (client.transport === void 0) return;
            we = listen;
          } catch (error) {
            if (Oe(error) || classifyMcpConnectError(error, "subscriptions/listen") !== void 0) throw error;
            logMCPDebug(
              name,
              `connect-time subscriptions/listen did not establish (${truncateToLength(describeConnectError(error, serverRef), 200)}); proceeding without it`,
            );
          }
        },
        He = (x, U, Z) => {
          M ??= pBt(P.clock);
          let fe = x(),
            promise = new Promise((Ne, Je) => {
              let le = P.clock.setTimeout(() => {
                if (
                  (logMCPDebug(
                    name,
                    `Connection timeout triggered after ${formatConnectElapsed(P)} (limit: ${Z}ms)`,
                  ),
                  inProcessServer)
                )
                  inProcessServer.close().catch(() => {});
                (U.close().catch(() => {}),
                  (At = !0),
                  Je(
                    makeConnectTimeoutError_2(
                      `MCP server "${name}" connection timed out after ${getConnectionTimeoutMs()}ms`,
                    ),
                  ));
              }, Z);
              fe.then(le, le);
            });
          return Promise.race([fe, promise]);
        },
        tt = async (x, U) => {
          if (U.mode === "auto")
            (rewriteInitializeCapabilities(x, serverRef, Vt), installModernResultBackfill(x, name));
          let Z = !1,
            fe = !1,
            ve = connectOptions?.toolsListFirst === !0 && name === REMOTE_DEVICES,
            Ne =
              (ve || connectOptions?.toolsListAhead === !0) &&
              $t === "ccr-proxy" &&
              U.mode === "legacy" &&
              discoverPrior === void 0 &&
              !Ot &&
              x instanceof Bdn
                ? ve
                  ? { listed: !0, source: void 0 }
                  : pd(serverRef)
                : void 0,
            Je = Ne === void 0 ? void 0 : armToolsListAhead(client, Ne.source, vt, Ne.listed);
          ft = Je;
          try {
            if (
              (await He(
                () =>
                  discoverPrior !== void 0
                    ? Ke(discoverPrior, x)
                    : Je !== void 0 && Ne?.listed && hasBudgetForEarlyToolsList(serverRef)
                      ? pipelineEarlyToolsList(client, x, getConnectionTimeoutMs(), Je, ve)
                      : client.connect(x, {
                          timeout:
                            U.mode === "auto"
                              ? getHandshakeTimeoutMs(
                                  x instanceof BoundedStdioClientTransport ? U.probe?.timeoutMs : void 0,
                                )
                              : getConnectionTimeoutMs(),
                        }),
                x,
                getConnectionTimeoutMs(),
              ),
              x instanceof BoundedStdioClientTransport && client.autoOpenedSubscription !== void 0)
            )
              try {
                await client.discover({ timeout: U.probe?.timeoutMs ?? getStdioProbeTimeoutMs() });
              } catch (error) {
                if (error instanceof SdkError && error.code === Ti.RequestTimeout) throw ((Z = !0), error);
                if (client.transport === void 0) throw ((fe = !0), error);
                logMCPDebug(
                  name,
                  `server/discover sent after the subscriptions/listen acknowledgement got an error (${truncateToLength(describeConnectError(error, serverRef), 200)}); the server still reads requests, so it is not restarted`,
                );
              }
          } catch (error) {
            let dt =
                negotiation?.mode === "auto" &&
                error instanceof SdkError &&
                error.code === Ti.EraNegotiationFailed,
              Et =
                !Z &&
                negotiation?.mode === "auto" &&
                error instanceof SdkError &&
                error.code === Ti.RequestTimeout &&
                transport?._anthropicProbeTimedOut === !0,
              It =
                !fe &&
                negotiation?.mode === "auto" &&
                error instanceof SdkError &&
                error.code === Ti.ConnectionClosed &&
                transport instanceof BoundedStdioClientTransport &&
                transport._anthropicProbeTimedOut === !0,
              Zt =
                negotiation?.mode === "auto" &&
                error instanceof ProtocolError &&
                transport instanceof BoundedStdioClientTransport &&
                transport._anthropicProbeTimedOut === !0 &&
                !isJavaSdkElicitationRejection(error, serverRef, x),
              Gt = Zt && error instanceof ProtocolError && error.code === ma.UnsupportedProtocolVersion,
              tn = Zt ? transport._anthropicRediscoverError : void 0,
              An = transport instanceof BoundedStdioClientTransport && transport.overflowError !== void 0;
            if (dt) {
              let xt = error.data,
                Ut = typeof xt === "object" && xt !== null && "cause" in xt ? xt.cause : error.cause;
              if (Ut instanceof IssuerEchoCrossOriginError) throw error;
              if (
                typeof Ut === "object" &&
                Ut !== null &&
                "code" in Ut &&
                Ut.code === "ERR_PROXY_TUNNEL" &&
                "status" in Ut &&
                Ut.status === 403
              )
                throw Ut;
            }
            let Xi = discoverPrior !== void 0 && he !== void 0 && !At && !Oe(error),
              Nr =
                discoverPrior !== void 0 &&
                usedRememberedLegacy &&
                ee !== void 0 &&
                error instanceof ProtocolError &&
                !isJavaSdkElicitationRejection(error, serverRef, x),
              Un = { mode: "legacy" },
              $n = ee,
              Qn = $n !== void 0 ? () => new BoundedStdioClientTransport($n) : (he ?? Ae),
              Fr = (xt, Ut) => {
                if (it && ye) ye.off("data", it);
                if (be) (logMCPDebug(name, `${Ut}: ${be}`), (be = ""));
                return ((transport = new BoundedStdioClientTransport(xt)), ct(), transport);
              },
              xr =
                he ??
                ($n !== void 0
                  ? () =>
                      Fr(
                        $n,
                        "stderr of the stdio server that answered the legacy initialize of the remembered dial with an error, before restarting it",
                      )
                  : void 0),
              Ur = async (xt, Ut) => {
                if (((yt = !0), await xt.close().catch(() => {}), it && ye)) ye.off("data", it);
                if (be)
                  (logMCPDebug(
                    name,
                    `stderr of the stdio server that refused elicitation form and url, before restarting it: ${be}`,
                  ),
                    (be = ""));
                return ((transport = Ut()), ct(), transport);
              };
            if (discoverPrior !== void 0 && (Xi || Nr) && xr !== void 0) {
              let xt =
                  classifyMcpConnectError(
                    error,
                    discoverPrior.kind === "modern" ? "subscriptions/listen" : "initialize",
                  ) ??
                  (error instanceof SdkError && error.code === Ti.EraNegotiationFailed
                    ? "rpc_era"
                    : Nr
                      ? "rpc_other"
                      : void 0),
                Ut = truncateToLength(describeConnectError(error, serverRef), 200);
              if (xt !== void 0)
                (logMCPDebug(
                  name,
                  $n !== void 0
                    ? `the stdio server answered the initialize of a connect built from ${wt()} with an error (${Ut}); discarding it and restarting the server once with the server/discover probe`
                    : `the upstream rejected a connect built from ${wt()} (${Ut}); discarding it for this connector and re-probing server/discover on a fresh transport`,
                ),
                  burnDiscoverPrior(serverRef, discoverPrior.kind, storageV5),
                  (Qe = !0),
                  logEvent("tengu_mcp_listing_prior_rejected", {
                    phase: lit("connect"),
                    priorKind: fromEnum(discoverPrior.kind),
                    priorSource: Ee,
                    reason: fromEnum(xt),
                    transportType: fromEnum(serverRef.type ?? "stdio"),
                    ...mcpBaseUrlAnalytics_2(serverRef, name),
                  }));
              else
                logMCPDebug(
                  name,
                  `connect built from ${wt()} failed (${Ut}); retrying this dial with a wire probe, prior kept`,
                );
              ((Se = !0),
                (discoverPrior = void 0),
                Tt("wire"),
                (we = void 0),
                (Un = negotiation ?? Un),
                await x.close().catch(() => {}),
                (transport = xr()));
            } else if (
              (dt || It || Zt || Z || fe) &&
              (serverRef.type === "stdio" || !serverRef.type) &&
              ee !== void 0 &&
              !An
            )
              (logMCPDebug(
                name,
                Zt && error instanceof ProtocolError
                  ? `stdio server rejected initialize with JSON-RPC error ${error.code} (${truncateToLength(describeConnectError(error, serverRef), 200)}) after the version negotiation probe timed out (likely a slow-starting server that read the stale probe first), and a second server/discover on the same process ${tn === void 0 ? "was not attempted (the error named only protocol versions this client lacks)" : `got no usable answer (${truncateToLength(describeConnectError(tn, serverRef), 200)})`}; restarting it once without the probe, within the remaining connect budget`
                  : It
                    ? "stdio server exited during initialize after the version negotiation probe timed out (likely a slow-starting server that exits on requests before initialize); restarting it once without the probe, within the remaining connect budget"
                    : Z
                      ? `stdio server negotiated ${client.getNegotiatedProtocolVersion()} and acknowledged subscriptions/listen, then did not answer a follow-up server/discover within ${U.probe?.timeoutMs ?? getStdioProbeTimeoutMs()}ms (a server that stops reading requests while it holds the listen, as mark3labs/mcp-go 1.x before 1.1.1 does); restarting it once with the legacy handshake, which sends no listen, within the remaining connect budget`
                      : fe
                        ? `stdio server acknowledged subscriptions/listen and then exited before answering a follow-up server/discover (${truncateToLength(describeConnectError(error, serverRef), 200)}); restarting it once with the legacy handshake, which sends no server/discover and no listen, within the remaining connect budget`
                        : "version negotiation probe closed the stdio server (rmcp-class pre-init hard close); respawning pinned legacy",
              ),
                (q = Gt
                  ? lit("era_locked_after_probe_timeout")
                  : Zt
                    ? lit("rejected_after_probe_timeout")
                    : It
                      ? lit("closed_after_probe_timeout")
                      : Z
                        ? lit("stalled_after_listen")
                        : fe
                          ? lit("closed_after_listen")
                          : lit("closed")),
                await x.close().catch(() => {}),
                (transport = Fr(ee, "stderr of the stdio server before restarting it")));
            else if ((dt || Et) && he !== void 0) {
              if (
                (logMCPDebug(
                  name,
                  Et
                    ? `version negotiation probe timed out on the ${serverRef.type ?? "http"} transport; reconnecting pinned legacy within the remaining budget`
                    : `version negotiation probe failed on the ${serverRef.type ?? "http"} transport; reconnecting pinned legacy`,
                ),
                (q = Et ? lit("probe_timeout") : lit("probe_failed")),
                await x.close().catch(() => {}),
                (transport = he()),
                isStatelessClaudeAiProxy(serverRef))
              )
                answerHandshakeLocally(transport, mt);
            } else if (!Oe(error) && isJavaSdkElicitationRejection(error, serverRef, x) && Qn !== void 0)
              (logMCPDebug(
                name,
                "server rejected elicitation form and url at initialize (Java MCP SDK 0.17.0 or older); reconnecting once without elicitation form and url",
              ),
                (transport = await Ur(x, Qn)));
            else throw error;
            if (((client = Fe(Un)), guardTransportSend({ name: name }, transport), Un.mode === "auto"))
              (rewriteInitializeCapabilities(transport, serverRef, Vt),
                installModernResultBackfill(transport, name));
            let max = Math.max(1000, getConnectionTimeoutMs() - (P.clock.monotonicNow() - P.awakeStart)),
              connect = client.connect(transport, {
                timeout: Un.mode === "auto" ? Math.min(max, getHandshakeTimeoutMs()) : max,
              }),
              Zn = transport,
              Br = !1;
            try {
              await Promise.race([
                connect,
                new Promise((xt, Ut) => {
                  let On = setTimeout(
                    (bo, hn, eo) => {
                      ((Br = !0),
                        bo.close().catch(() => {}),
                        hn(
                          makeConnectTimeoutError_2(
                            `MCP server "${eo}" connection timed out after ${getConnectionTimeoutMs()}ms`,
                          ),
                        ));
                    },
                    max,
                    Zn,
                    Ut,
                    name,
                  );
                  connect.then(
                    () => clearTimeout(On),
                    () => clearTimeout(On),
                  );
                }),
              ]);
            } catch (error_2) {
              let Ut = Br,
                On = Oe(error_2);
              if (
                !yt &&
                !On &&
                !Ut &&
                Qn !== void 0 &&
                isJavaSdkElicitationRejection(error_2, serverRef, Zn)
              ) {
                logMCPDebug(
                  name,
                  "server rejected elicitation form and url on the reconnect (Java MCP SDK 0.17.0 or older); reconnecting once more without elicitation form and url",
                );
                let hn = await Ur(Zn, Qn);
                (guardTransportSend({ name: name }, hn), (client = Fe({ mode: "legacy" })));
                let max = Math.max(1000, getConnectionTimeoutMs() - (Date.now() - now));
                At = !1;
                try {
                  await He(() => client.connect(hn, { timeout: max }), hn, max);
                  return;
                } catch (error_2) {
                  if (Et && !At && !Oe(error_2))
                    throw (
                      logMCPDebug(
                        name,
                        `the dial without elicitation form and url after the probe timeout failed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); keeping the probe timeout as the error so the connect can be retried`,
                      ),
                      error
                    );
                  throw error_2;
                }
              }
              if (Et && !On && !Ut) {
                let hn = truncateToLength(describeConnectError(error_2, serverRef), 200);
                throw (
                  logMCPDebug(
                    name,
                    `pinned-legacy retry after the probe timeout failed typed (${hn}); preserving the timeout classification so the connect stays ladder-retryable`,
                  ),
                  error
                );
              }
              let bo =
                error_2 instanceof SdkError &&
                error_2.code === Ti.RequestTimeout &&
                Zn._anthropicProbeTimedOut === !0;
              if (
                Se &&
                !On &&
                !Ut &&
                error_2 instanceof SdkError &&
                (error_2.code === Ti.EraNegotiationFailed || bo)
              ) {
                if (!Qe) throw error;
                throw (
                  logMCPDebug(
                    name,
                    `wire probe after discarding ${wt()} failed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); booking a retryable connect timeout so the next dial re-probes prior-free with the legacy rescue`,
                  ),
                  makeConnectTimeoutError_2(
                    `MCP server "${name}" connection timed out after ${getConnectionTimeoutMs()}ms`,
                  )
                );
              }
              throw error_2;
            }
          }
        };
      try {
        try {
          await tt(transport, negotiation);
        } catch (error) {
          if (
            nt === void 0 ||
            (transport instanceof Bdn && transport.protocolVersion !== void 0) ||
            !isNonJsonRpcClientError(error) ||
            !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_legacy_sse_fallback", !0)
          )
            throw error;
          logMCPDebug(
            name,
            `initialize POST rejected (${truncateToLength(describeConnectError(error, serverRef), 200)}); trying legacy HTTP+SSE`,
          );
          let Z = error.status === 405;
          await transport.close().catch(() => {});
          let fe = handshakeTrace;
          (zn(fe), (handshakeTrace = void 0));
          let abortController = new AbortController(),
            Ne = !1,
            Je = nt({ postMethodNotAllowed: Z, dialSignal: abortController.signal, dialConnected: () => Ne });
          ((transport = Je), guardTransportSend({ name: name }, Je), (client = Fe({ mode: "legacy" })));
          let le = authProvider?.sawAuthChallenge === !0,
            min = Math.min(
              REMOTE_PROBE_TIMEOUT_MS,
              Math.max(1000, getConnectionTimeoutMs() - (Date.now() - now)),
            );
          At = !1;
          try {
            await He(() => client.connect(Je, { timeout: min }), Je, min);
          } catch (error_2) {
            (await Je.close().catch(() => {}), abortController.abort());
            let It = !le && authProvider?.sawAuthChallenge === !0,
              Zt = isAuthFailure(error_2, error_2 instanceof ZNr ? error_2.code : void 0, It);
            if (At && Z && It)
              throw (
                logMCPDebug(
                  name,
                  "legacy HTTP+SSE stream GET answered with an auth challenge; its auth flow outran the fallback budget, so routing to needs-auth",
                ),
                new UnauthorizedError(
                  `MCP server "${name}" requires authorization: its legacy HTTP+SSE stream answered with an auth challenge and the authorization flow did not finish within the connect budget`,
                )
              );
            if (At || (error_2 instanceof ZNr && !Zt) || (Zt && !Z))
              throw (
                logMCPDebug(
                  name,
                  `legacy HTTP+SSE not confirmed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); surfacing the POST failure`,
                ),
                (handshakeTrace = fe),
                error
              );
            throw error_2;
          }
          ((Ne = !0), logMCPDebug(name, "connected over legacy HTTP+SSE"));
        }
        if (
          (me(),
          negotiation?.mode === "auto" &&
            q === void 0 &&
            transport instanceof BoundedStdioClientTransport &&
            transport._anthropicProbeTimedOut === !0 &&
            client.getProtocolEra() === "modern")
        )
          ((q = lit("rediscovered_after_probe_timeout")),
            logMCPDebug(
              name,
              `stdio server rejected initialize after the version negotiation probe timed out, then answered a second server/discover on the same process; connected on ${client.getNegotiatedProtocolVersion()} without restarting it`,
            ));
        if (be) (logMCPError(name, `Server stderr: ${be}`), (be = ""));
        if (it && ye) (ye.off("data", it), ye.resume());
        let x = Date.now() - now;
        if (
          (logMCPDebug(name, `Successfully connected (transport: ${serverRef.type || "stdio"}) in ${x}ms`),
          Ot)
        ) {
          if (client.getProtocolEra?.() === "modern")
            logMCPDebug(
              name,
              "subscriptions/listen suppressed by the listen denylist; list_changed delivery is off for this connection",
            );
        } else ensureListenSubscription(client, name, serverRef, we, discoverSource);
        if (
          (serverRef.type === "stdio" || !serverRef.type) &&
          transport instanceof BoundedStdioClientTransport &&
          transport.pid
        ) {
          if ((registerChildMemory("mcp_stdio", transport.pid), ge))
            parkPendingPid("mcp", transport.pid, () => isMcpServerBackingToolHook(name));
          if (Ie || ge) releaseMcpToolCgroup(name, transport.pid);
        }
      } catch (error) {
        me();
        let U = error;
        if (U instanceof SdkError && U.code === Ti.EraNegotiationFailed) {
          let ve = U.data,
            Ne = typeof ve === "object" && ve !== null && "cause" in ve ? ve.cause : U.cause;
          if (Ne != null) U = Ne;
        }
        let Z = Date.now() - now,
          fe = {
            negotiationMode: fromEnumOpt(negotiation?.mode),
            probeFellBack: q,
            listenSuppressed: Ot,
            negotiationDenylisted: vt,
            discoverSource: Ee,
            listingPriorBurned: Qe,
            ...toolsListAheadFields(ft),
          };
        if (transport instanceof BoundedStdioClientTransport && transport.overflowError) {
          if ((logMCPError(name, transport.overflowError.message), be))
            logMCPError(name, `Server stderr: ${be}`);
          throw transport.overflowError;
        }
        if (serverRef.type === "sse" && U instanceof Error) {
          (logMCPDebug(
            name,
            `SSE Connection failed after ${Z}ms: ${jsonStringify({ url: redactUrlSecrets(serverRef.url), error: describeConnectError(U, serverRef), errorType: U.constructor.name, stack: JHe(U, serverRef) === U ? U.stack : void 0 })}`,
          ),
            logMCPError(name, JHe(U, serverRef)));
          let ve = await handleRemoteConnectAuthError({
            name: name,
            serverRef: serverRef,
            transportType: "sse",
            error: U,
            statusCode: U instanceof SdkHttpError ? U.status : U.code,
            sawAuthChallenge: authProvider?.sawAuthChallenge === !0,
            hasUserAuthHeader: De,
            helperMintsAuthHeader: re,
            cliOwnedBearer: Ve,
            useFirstPartyAuth: ue,
            firstPartyBearer: ot.last,
            authProvider: authProvider,
            negotiation: fe,
            roundEpoch: j,
            storageV5: storageV5,
          });
          if (ve) return ve;
        } else if (serverRef.type === "http" && U instanceof Error) {
          let ve = U;
          (logMCPDebug(
            name,
            `HTTP Connection failed after ${Z}ms: ${describeConnectError(U, serverRef)} (code: ${ve.code || "none"}, errno: ${ve.errno || "none"})`,
          ),
            logMCPError(name, JHe(U, serverRef)));
          let Ne = await handleRemoteConnectAuthError({
            name: name,
            serverRef: serverRef,
            transportType: "http",
            error: U,
            statusCode: U instanceof SdkHttpError ? U.status : U.code,
            sawAuthChallenge: authProvider?.sawAuthChallenge === !0,
            hasUserAuthHeader: De,
            helperMintsAuthHeader: re,
            cliOwnedBearer: Ve,
            useFirstPartyAuth: ue,
            firstPartyBearer: ot.last,
            authProvider: authProvider,
            negotiation: fe,
            roundEpoch: j,
            storageV5: storageV5,
          });
          if (Ne) return Ne;
        } else if (serverRef.type === "claudeai-proxy" && U instanceof Error) {
          if (
            (logMCPDebug(
              name,
              `claude.ai proxy connection failed after ${Z}ms: ${describeConnectError(U, serverRef)}`,
            ),
            !isClaudeAiBearerRejectedError(U))
          )
            logMCPError(name, JHe(U, serverRef));
          let ve = U instanceof SdkHttpError ? U.status : U.code;
          if (isClaudeAiBearerRejectedError(U)) {
            (zn(handshakeTrace),
              logEvent("tengu_mcp_server_connection_failed", {
                processUptimeAtConnectStartMs: Pe,
                ...handshakeTraceTelemetry(handshakeTrace),
                transportType: lit("claudeai-proxy"),
                errorCode: lit("CLAUDEAI_BEARER_REJECTED"),
                sdkGeneration: fromEnum(mcpSdkGeneration()),
                negotiationMode: fe.negotiationMode,
                probeFellBack: fe.probeFellBack,
                listenSuppressed: fe.listenSuppressed,
                negotiationDenylisted: fe.negotiationDenylisted,
                discoverSource: fe.discoverSource,
                listingPriorBurned: fe.listingPriorBurned,
                ...mcpBaseUrlAnalytics_2(serverRef, name),
                ...buildPluginSourceFields(serverRef),
              }),
              logFeatureSad("mcp_connect", "mcp_connect_claudeai_bearer_rejected"));
            let Ne = ir(name, serverRef),
              Je = {
                name: name,
                type: "failed",
                config: serverRef,
                error: U.message,
                errorCode: "CLAUDEAI_BEARER_REJECTED",
              },
              le = getConnectionCache().connections.get(Ne);
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
            return handleRemoteAuthFailure(name, serverRef, "claudeai-proxy", void 0, !1, j, fe, storageV5);
        } else if (serverRef.type === "sse-ide" || serverRef.type === "ws-ide")
          logEvent("tengu_mcp_ide_server_connection_failed", { connectionDurationMs: Z });
        if (inProcessServer) inProcessServer.close().catch(() => {});
        if ((transport.close().catch(() => {}), be && !isCleanupStarted()))
          logMCPError(name, `Server stderr: ${be}`);
        throw U;
      }
      let serverCapabilities = client.getServerCapabilities(),
        serverVersion = client.getServerVersion(),
        Ft = officialPluginPromptOverrides(serverRef),
        Me = serverInstructionsOverride(Ft, name) ?? client.getInstructions(),
        Ye = TB(serverRef),
        _t = truncateServerInstructions(Me, name, Ye);
      if (
        (logMCPDebug(
          name,
          `Connection established with capabilities: ${jsonStringify({ hasTools: !!serverCapabilities?.tools, hasPrompts: !!serverCapabilities?.prompts, hasResources: !!serverCapabilities?.resources, hasResourceSubscribe: !!serverCapabilities?.resources?.subscribe, serverVersion: serverVersion || "unknown", protocolEra: client.getProtocolEra(), negotiatedProtocolVersion: client.getNegotiatedProtocolVersion() })}`,
        ),
        logForDebugging(
          `[MCP] Server "${name}" connected with subscribe=${!!serverCapabilities?.resources?.subscribe}`,
        ),
        client.setRequestHandler(
          "elicitation/create",
          async (x) => (
            logMCPDebug(name, `Elicitation request received during initialization: ${jsonStringify(x)}`),
            { action: "cancel" }
          ),
        ),
        serverRef.type === "sse-ide" || serverRef.type === "ws-ide")
      ) {
        let x = Date.now() - now;
        (logEvent("tengu_mcp_ide_server_connection_succeeded", {
          connectionDurationMs: x,
          serverVersion: sanitizeVersion(serverVersion?.version),
        }),
          maybeNotifyIDEConnected(client).catch((U) => {
            logMCPError(
              name,
              `Failed to send ide_connected notification: ${describeConnectError(U, serverRef)}`,
            );
          }));
      }
      let now_2 = Date.now(),
        at = !1,
        onerror = client.onerror,
        onclose = client.onclose,
        Lt = 3,
        We = {
          consecutiveErrors: 0,
          activeCallWatchdogs: new Set(),
          callsInProgress: 0,
          pendingElicitations: 0,
          lastElicitationClosedAt: 0,
          dialledUnder: getRequestTimingStore(),
        },
        Kt = !1,
        zt = (x) => {
          if (Kt) return;
          ((Kt = !0),
            (We.closeReason = x),
            logMCPDebug(name, `Closing transport (${x})`),
            client.close().catch((U) => {
              logMCPDebug(name, `Error during close: ${describeConnectError(U, serverRef)}`);
            }));
        },
        Ct = discoverPrior?.kind,
        sn = Ct !== void 0 && usedRememberedLegacy,
        an = Ct !== void 0,
        un = sn,
        en = new Map(),
        ut = !1,
        qt,
        Qt = () => {
          if (((an = !1), en.clear(), qt !== void 0)) (clearTimeout(qt), (qt = void 0));
        },
        lt = (x) => (Ct === "modern" || x === "rpc_era" ? x : void 0),
        cn = () => {
          if ((We.callsInProgress ?? 0) > 0) We.onCallsIdle = cn;
          else if (client.transport !== void 0) zt("discover prior rejected");
        },
        vn = (x, U, Z, fe = !1) => {
          (Qt(),
            (un = !1),
            burnDiscoverPrior(serverRef, Ct, storageV5),
            logMCPDebug(
              name,
              `${U} on a connection built from ${wt()} was rejected (${Z}); discarding it for this server \u2014 this connection closes once no tool call or background task is using it, and the next dial probes server/discover on the wire`,
            ),
            logEvent("tengu_mcp_listing_prior_rejected", {
              phase: fe ? lit("post_window") : lit("post_connect"),
              priorKind: fromEnumOpt(Ct),
              priorSource: Ee,
              reason: fromEnum(x),
              transportType: fromEnum(serverRef.type ?? "stdio"),
              ...mcpBaseUrlAnalytics_2(serverRef, name),
            }),
            setTimeout(cn, 0));
        },
        kn = () => {
          if (qt !== void 0) clearTimeout(qt);
          ((qt = setTimeout(() => {
            if ((Qt(), sn && ut && client.transport !== void 0))
              (logMCPDebug(
                name,
                `tools/list on a connection built from ${wt()} got no result in time; forgetting the verdict, so the next dial probes server/discover`,
              ),
                forgetDiscoverVerdict(serverRef, storageV5));
          }, getConnectionTimeoutMs())),
            qt.unref());
        },
        vr = (x, U, Z) => {
          if (isSessionHandshakeMethod(x) && !U) {
            if ((Qt(), sn && Z !== void 0))
              (logMCPDebug(
                name,
                `${x} on a connection built from ${wt()} was refused (${Z}); forgetting the verdict, so the next dial probes server/discover`,
              ),
                forgetDiscoverVerdict(serverRef, storageV5));
          }
        };
      if (an && client.transport) {
        kn();
        let transport = client.transport,
          U = transport.send.bind(transport);
        transport.send = async (Z, fe) => {
          let ve = an && fZ(Z) ? Z : void 0;
          if (ve !== void 0) {
            if ((en.set(ve.id, ve.method), isSessionHandshakeMethod(ve.method))) ((ut = !0), kn());
          }
          try {
            await U(Z, fe);
          } catch (error) {
            if (ve !== void 0 && an) {
              let method = ve.method;
              en.delete(ve.id);
              let le =
                  sn && isSessionHandshakeMethod(method) && isUnsupportedVersionHttp400(error)
                    ? "rpc_era"
                    : classifyMcpConnectError(error, method),
                dt = lt(le);
              if (dt !== void 0)
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
          if ((logMCPError(name, x.message), (at = !0), zt("stdout overflow"), onerror)) onerror(x);
          return;
        }
        if ((U === "http" || U === "claudeai-proxy") && x instanceof HttpBodyOverflowError) {
          if (
            (logMCPError(
              name,
              `sent a response larger than ${Math.round(MCP_BODY_LIMIT / 1024 / 1024)}MB. Claude Code stopped reading it and failed the request it answered; the connection stays open.`,
            ),
            onerror)
          )
            onerror(x);
          return;
        }
        if (
          (U === "sse" || U === "sse-ide" || U === "http" || U === "claudeai-proxy") &&
          x.message.includes(Ao)
        ) {
          if ((logMCPError(name, x.message), (at = !0), zt("http body overflow"), onerror)) onerror(x);
          return;
        }
        if ((U === "sse" || U === "http" || U === "claudeai-proxy") && x instanceof SyntaxError) {
          if (
            ((at = !0),
            Bt(),
            zt(
              authProvider?.authChallengeOpen === !0 && We.activeCallWatchdogs.size <= 1
                ? "malformed message after an auth challenge"
                : "malformed JSON-RPC message (response truncated)",
            ),
            onerror)
          )
            onerror(x);
          return;
        }
        let Z = Date.now() - now_2;
        if (
          ((at = !0),
          logMCPDebug(name, `${U.toUpperCase()} connection dropped after ${Math.floor(Z / 1000)}s uptime`),
          x.message)
        ) {
          let fe = CONNECTION_ERROR_HINTS_2.find(([ve]) => x.message.includes(ve))?.[1];
          logMCPDebug(name, fe ?? `Connection error: ${describeConnectError(x, serverRef)}`);
        }
        if (
          (U === "http" || U === "claudeai-proxy") &&
          client.transport?.sessionId !== void 0 &&
          isMcpSessionExpiredError(x)
        ) {
          if (
            (logMCPDebug(
              name,
              "MCP session expired (server no longer recognizes session ID), triggering reconnection",
            ),
            zt("session expired"),
            onerror)
          )
            onerror(x);
          return;
        }
        if (
          (U === "http" || U === "claudeai-proxy") &&
          client.transport?.sessionId !== void 0 &&
          x instanceof SdkHttpError &&
          x.status === 404 &&
          isSseOpenFailure(x)
        )
          logFeatureSad("mcp_session_recovery", "get_stream_404_not_reinit");
        if (U === "sse" || U === "http" || U === "claudeai-proxy") {
          if (x.message.includes("Maximum reconnection attempts")) {
            if (
              (logMCPDebug(
                name,
                "SSE GET-stream reconnection exhausted; leaving transport up (POST still works)",
              ),
              (We.consecutiveErrors = 0),
              Bt(),
              onerror)
            )
              onerror(x);
            return;
          }
          if (isTransientMcpError(x)) {
            if (
              (We.consecutiveErrors++,
              Bt(),
              logMCPDebug(name, `Terminal connection error ${We.consecutiveErrors}/${Lt}`),
              We.consecutiveErrors >= Lt)
            )
              ((We.consecutiveErrors = 0), zt("max consecutive terminal errors"));
          } else We.consecutiveErrors = 0;
        }
        if (onerror) onerror(x);
      };
      let Rr = serverRef.type === "http" && isCcrMcpPath(serverRef.url);
      if (Rr && client.transport) {
        let transport = client.transport,
          U = transport.send.bind(transport);
        transport.send = async (Z, fe) => {
          let ve = fZ(Z) && Z.method === "tools/call" ? Z.params?._meta : void 0,
            Ne = ve?.["claudecode/toolUseId"],
            Je = ve?.[CLAUDECODE_CALLMARK],
            le =
              fZ(Z) && ve !== void 0 && Je !== void 0
                ? { ...Z, params: { ...Z.params, _meta: omitKeys(ve, CLAUDECODE_CALLMARK) } }
                : Z,
            dt =
              Ne !== void 0
                ? [...We.activeCallWatchdogs].find((It) => It.toolUseId === Ne)
                : Je !== void 0
                  ? [...We.activeCallWatchdogs].find((It) => It.mark === Je)
                  : void 0;
          if (!fZ(Z) || dt === void 0) return U(le, fe);
          let { id: id } = Z;
          dt.requestSent?.(id);
          try {
            await U(le, {
              ...fe,
              onRequestStreamEnd: () => {
                (fe?.onRequestStreamEnd?.(), dt.answerStreamEnded?.(id));
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
          if (Rr && (GAe(U) || zAe(U)) && U.id !== void 0)
            for (let activeCallWatchdog of We.activeCallWatchdogs) activeCallWatchdog.requestAnswered?.(U.id);
          if (an && (GAe(U) || zAe(U)) && U.id !== void 0) {
            let fe = en.get(U.id);
            if (fe !== void 0)
              if ((en.delete(U.id), GAe(U))) {
                if (isSessionHandshakeMethod(fe)) Qt();
              } else {
                let ve = classifyMcpRpcErrorCode(U.error.code, fe),
                  Ne = lt(ve);
                if (Ne !== void 0) {
                  (onmessage?.(U, Z), vn(Ne, fe, `JSON-RPC ${U.error.code}`));
                  return;
                }
                vr(fe, isRetryableListError(new ProtocolError(U.error.code, U.error.message)), ve);
              }
          } else if (
            un &&
            client.transport !== void 0 &&
            zAe(U) &&
            U.id !== void 0 &&
            classifyMcpRpcErrorCode(U.error.code, "") === "rpc_era"
          ) {
            (onmessage?.(U, Z), vn("rpc_era", "a later request", `JSON-RPC ${U.error.code}`, !0));
            return;
          }
          onmessage?.(U, Z);
        };
      }
      client.onclose = () => {
        let x = Date.now() - now_2,
          U = serverRef.type ?? "unknown";
        (logMCPDebug(
          name,
          `${U.toUpperCase()} connection closed after ${Math.floor(x / 1000)}s (${at ? "with errors" : "cleanly"})`,
        ),
          logMcpConnectionOtelEvent(name, serverRef, { status: "disconnected", durationMs: x }));
        let Z = ir(name, serverRef);
        if (
          (getConnectionCache().liveClients.delete(client),
          getConnectionCache().toolLists.delete(Z),
          getConnectionCache().resourceLists.delete(Z),
          getConnectionCache().resourceTemplateLists.delete(Z),
          getConnectionCache().commandLists.delete(Z),
          getConnectionCache().connections.delete(Z),
          logMCPDebug(name, "Cleared connection cache for reconnection"),
          onclose)
        )
          onclose();
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
          if (transport instanceof BoundedStdioClientTransport)
            try {
              let pid = transport.pid;
              if (transport.serverProcess && getPlatform() === "windows")
                (logMCPDebug(name, "Closing MCP server stdin"),
                  await closeStdioServer(transport.serverProcess));
              else if (pid) {
                logMCPDebug(name, "Sending SIGINT to MCP server process");
                try {
                  process.kill(pid, "SIGINT");
                } catch (error) {
                  logMCPDebug(name, `Error sending SIGINT: ${error}`);
                  return;
                }
                await new Promise(async (U) => {
                  let Z = !1,
                    fe = () => {
                      if (Z) return;
                      ((Z = !0), clearInterval(Ne), clearTimeout(Je), U());
                    },
                    ve = (le) => {
                      try {
                        return (process.kill(le, 0), !0);
                      } catch {
                        return !1;
                      }
                    },
                    Ne = setInterval(
                      (le, dt, Et, It) => {
                        if (!le(dt)) (logMCPDebug(Et, "MCP server process exited cleanly"), It());
                      },
                      50,
                      ve,
                      pid,
                      name,
                      fe,
                    ),
                    Je = setTimeout(
                      (le, dt) => {
                        (logMCPDebug(le, "Cleanup timeout reached, stopping process monitoring"), dt());
                      },
                      600,
                      name,
                      fe,
                    );
                  try {
                    if ((await sleep(100), !Z)) {
                      if (!ve(pid)) {
                        fe();
                        return;
                      }
                      logMCPDebug(name, "SIGINT failed, sending SIGTERM to MCP server process");
                      try {
                        process.kill(pid, "SIGTERM");
                      } catch (error) {
                        (logMCPDebug(name, `Error sending SIGTERM: ${error}`), fe());
                        return;
                      }
                      if ((await sleep(400), !Z))
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
        },
        Wi = registerCleanup(kr);
      if (transport instanceof BoundedStdioClientTransport) transport.handOffExitCleanup();
      let Gi = async () => {
        (getConnectionCache().liveClients.delete(client), Wi?.(), await kr());
      };
      if ((getConnectionCache().liveClients.add(client), getAnnouncedDirectories() !== R))
        client.sendRootsListChanged().catch(() => {});
      let Ar = getDiscoverVerdictKey(serverRef);
      if (discoverSource === "wire" && client.getProtocolEra() === "modern")
        forgetDiscoverVerdict(serverRef, storageV5);
      let Ir = transport instanceof BoundedStdioClientTransport && transport._anthropicProbeTimedOut === !0,
        Yi = transport instanceof BoundedStdioClientTransport && transport.answeredProbeLate;
      if (
        Ar !== void 0 &&
        !(serverRef.type === "claudeai-proxy" && serverRef.stateless === !0) &&
        discoverSource === "wire" &&
        (discoverMethodNotFound || Ir) &&
        q === void 0 &&
        client.getProtocolEra() === "legacy" &&
        !ht().burnedListingDiscoverPriors.has(Ar)
      ) {
        if (Yi)
          (logMCPDebug(
            name,
            "stdio server answered the server/discover probe after its bound, so it was only slow to start and speaks the new protocol; not remembering it as a legacy peer",
          ),
            forgetDiscoverVerdict(serverRef, storageV5));
        else if (
          (rememberLegacyPeer(serverRef, storageV5), Ir && transport instanceof BoundedStdioClientTransport)
        )
          transport.onAnsweredProbeLate = () => {
            (logMCPDebug(
              name,
              "stdio server answered the server/discover probe after it had connected legacy; it speaks the new protocol, so forgetting it as a legacy peer",
            ),
              forgetDiscoverVerdict(serverRef, storageV5));
          };
      }
      let Mo = Date.now() - now;
      logMcpConnectionOtelEvent(name, serverRef, { status: "connected", durationMs: Mo });
      let Lr = Me?.length ?? 0;
      if (
        (zn(handshakeTrace),
        logEvent("tengu_mcp_server_connection_succeeded", {
          connectionDurationMs: Mo,
          processUptimeAtConnectStartMs: Pe,
          ...handshakeTraceTelemetry(handshakeTrace),
          instructionsLength: Lr,
          instructionsTruncated: Lr > Ye,
          transportType: fromEnum(serverRef.type ?? "stdio"),
          negotiatedLegacySse: serverRef.type === "http" && transport instanceof dYn,
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
          isPlugin: serverRef.pluginSource !== void 0,
          ...buildPluginSourceFields(serverRef),
          totalServers: serverStats?.totalServers,
          stdioCount: serverStats?.stdioCount,
          sseCount: serverStats?.sseCount,
          httpCount: serverStats?.httpCount,
          sseIdeCount: serverStats?.sseIdeCount,
          wsIdeCount: serverStats?.wsIdeCount,
          ...mcpBaseUrlAnalytics_2(serverRef, name),
        }),
        ft !== void 0 && !ht().toolsListAhead.has(client))
      )
        armToolsListAhead(client, ft.flagSource, vt, ft.listed);
      if (handshakeTrace !== void 0) {
        let x = handshakeTrace,
          protocolEra = client.getProtocolEra(),
          Z = ht().toolsListAhead.get(client);
        if (
          (hs(client, (fe) => {
            logEvent("tengu_mcp_first_tools_list", {
              ...fe,
              messageStreamGetOutcome: fromEnum(x.messageStreamGetOutcome),
              processUptimeAtConnectStartMs: Pe,
              keepAliveDisabled: x.keepAliveDisabled,
              transportType: fromEnum(serverRef.type ?? "stdio"),
              sdkGeneration: fromEnum(mcpSdkGeneration()),
              protocolEra: fromEnumOpt(protocolEra),
              negotiationDenylisted: vt,
              ...toolsListAheadFields(Z),
              mcpServerKeyHash: toolNameForTelemetry(name),
            });
          }),
          Z !== void 0)
        )
          scheduleMessageStreamOutcomeLog(client, name, x, {
            ...toolsListAheadFields(Z),
            negotiationDenylisted: vt,
          });
      }
      if (
        (logFeatureOk("mcp_connect"),
        logForDiagnosticsNoPII("info", "mcp_connect_complete", { transport: ce, duration_ms: Mo }),
        authProvider)
      )
        ht().clientAuthProviders.set(client, authProvider);
      ht().clientFirstPartyBearers.set(client, ot);
      let Dr = {
        name: name,
        client: si(client),
        type: "connected",
        capabilities: serverCapabilities ?? {},
        serverInfo: serverVersion,
        instructions: _t,
        negotiatedProtocolVersion: client.getNegotiatedProtocolVersion(),
        protocolEra: client.getProtocolEra(),
        config: serverRef,
        cleanup: Gi,
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
        if (
          (logMCPDebug(name, `Connection abandoned after ${Ve}ms (Claude Code is shutting down)`),
          inProcessServer)
        )
          inProcessServer.close().catch(() => {});
        return {
          name: name,
          type: "failed",
          config: serverRef,
          error: "Claude Code is shutting down",
          errorCode: "SHUTTING_DOWN",
        };
      }
      let De = describeConnectError(error, serverRef),
        Le = error instanceof Error ? error.cause : void 0,
        re =
          (error instanceof SdkHttpError ? error.status : void 0) ??
          (error && typeof error === "object" && "code" in error ? error.code : void 0) ??
          (Le && typeof Le === "object" && "code" in Le ? Le.code : void 0),
        ue =
          error instanceof IssuerEchoCrossOriginError
            ? "ISSUER_ECHO_DENIED"
            : re !== void 0
              ? String(re)
              : void 0;
      if (
        error instanceof SdkError &&
        error.code === Ti.RequestTimeout &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_timeout_retry", !0)
      )
        ue = "CONNECT_TIMEOUT";
      if (
        serverRef.type === "http" &&
        ue === "404" &&
        transport?.sessionId === void 0 &&
        !isCcrHostedConfig(serverRef)
      )
        ((ue = "ENDPOINT_NOT_FOUND"),
          (De = `MCP endpoint not found at ${describeMcpServerOrigin(name, serverRef, { detail: "origin" }) ?? "(unparseable url)"}. Check the URL in your MCP config.`));
      let ot = ue === "CONNECT_TIMEOUT" && M !== void 0 ? suspendedConnectMessage(name, M) : void 0;
      if (ot !== void 0) ((ue = CONNECT_SUSPENDED), (De = ot));
      if (
        ((De = redactMcpErrorDetail(name, serverRef, De)),
        !yt && isJavaSdkElicitationRejection(error, serverRef, transport))
      )
        De = JAVA_SDK_ELICITATION_HINT;
      logMcpConnectionOtelEvent(name, serverRef, {
        status: "failed",
        durationMs: Ve,
        errorCode: ue,
        error: De,
      });
      let it =
        ue === "ENOENT" && (serverRef.type === "stdio" || serverRef.type === void 0)
          ? "mcp_connect_spawn_enoent"
          : ue === "ENDPOINT_NOT_FOUND"
            ? "mcp_connect_endpoint_not_found"
            : void 0;
      if (it !== void 0) logFeatureBad("mcp_connect", it);
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
      if (
        (zn(handshakeTrace),
        logEvent("tengu_mcp_server_connection_failed", {
          connectionDurationMs: Ve,
          processUptimeAtConnectStartMs: Pe,
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
          errorMessageHash: gn(scrubErrorText(De)),
          totalServers: serverStats?.totalServers || 1,
          stdioCount: serverStats?.stdioCount || (serverRef.type === "stdio" ? 1 : 0),
          sseCount: serverStats?.sseCount || (serverRef.type === "sse" ? 1 : 0),
          httpCount: serverStats?.httpCount || (serverRef.type === "http" ? 1 : 0),
          sseIdeCount: serverStats?.sseIdeCount || (serverRef.type === "sse-ide" ? 1 : 0),
          wsIdeCount: serverStats?.wsIdeCount || (serverRef.type === "ws-ide" ? 1 : 0),
          transportType: fromEnum(serverRef.type ?? "stdio"),
          sdkGeneration: fromEnum(mcpSdkGeneration()),
          scope: fromEnum(serverRef.scope),
          isPlugin: serverRef.pluginSource !== void 0,
          ...buildPluginSourceFields(serverRef),
          ...mcpBaseUrlAnalytics_2(serverRef, name),
        }),
        logMCPDebug(
          name,
          `Connection failed after ${formatConnectElapsed(P)}${ue !== void 0 ? ` (${ue})` : ""}: ${De}`,
        ),
        logMCPError(name, `Connection failed${ue !== void 0 ? ` (${ue})` : ""}: ${De}`),
        logForDiagnosticsNoPII("error", "mcp_connect_failed", {
          transport: ce,
          duration_ms: Ve,
          ...(ue === "CONNECT_TIMEOUT" && { reason: "timeout" }),
          ...(ue === CONNECT_SUSPENDED && { reason: "suspended" }),
        }),
        inProcessServer)
      )
        inProcessServer.close().catch(() => {});
      let ye = getDiscoverVerdictKey(serverRef);
      if (
        ye !== void 0 &&
        negotiation?.mode === "auto" &&
        discoverSource === "wire" &&
        transport instanceof BoundedStdioClientTransport &&
        transport._anthropicProbeTimedOut === !0 &&
        (At || (error instanceof SdkError && error.code === Ti.RequestTimeout)) &&
        ue !== CONNECT_SUSPENDED &&
        !ht().burnedListingDiscoverPriors.has(ye)
      )
        if (transport.answeredProbeLate)
          logMCPDebug(
            name,
            "stdio server answered the server/discover probe after its bound but not initialize; it speaks the new protocol, so not remembering it as a legacy peer",
          );
        else rememberLegacyPeer(serverRef, storageV5);
      if (ue !== CONNECT_SUSPENDED) recordPluginStdioServerFailure(name, serverRef, storageV5);
      let be =
        ue === "ERR_PROXY_TUNNEL"
          ? [error, Le]
              .map((ct) => (ct && typeof ct === "object" && "status" in ct ? ct.status : void 0))
              .find((ct) => typeof ct === "number")
          : void 0;
      return {
        name: name,
        type: "failed",
        config: serverRef,
        error: De,
        errorCode: ue,
        ...(be !== void 0 && { proxyConnectStatus: be }),
        ...(ue === void 0 &&
          authProvider?.sawAuthChallenge === !0 &&
          (await registrationStatusFields(name, serverRef, now))),
      };
    }
  },
  ir,
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
function Od() {
  return resolveVersionNegotiation("http").mode === "auto" ? "modern" : "legacy";
}
//@ chunk-8t8n4kdh.js:119630-119683 sole-consumer
function fn() {
  if ((primeDiscoveryCacheFlag(), setEraResolver(Od), hasAccountResolver())) return;
  setAccountResolver(oauthAccountIdentity);
}
//@ chunk-8t8n4kdh.js:119683-119720 sole-consumer
function Er() {
  if (getEnsureConnectedClient()) return;
  setEnsureConnectedClient(ensureConnectedClient);
}
//@ chunk-8t8n4kdh.js:119720-119816 sole-consumer
function pr(e, n) {
  try {
    CACHED_ADOPT_SIGNAL.emit(e, n);
  } catch (error) {
    logMCPDebug(e, `cached-row adopt subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-8t8n4kdh.js:119816-120052 sole-consumer
function recordCachedDialFailure(e, n) {
  if (n) logFeatureSad("mcp_discovery_cache", "lazy_dial_failed");
  getConnectionCache().settledCachedDialFailures.set(ir(e.name, e.config), { failure: e, ownStrike: n });
  try {
    CACHED_DIAL_FAILED_SIGNAL.emit(e, n);
  } catch (error) {
    logMCPDebug(e.name, `cached-row dial-failed subscriber threw: ${errorMessage(error)}`);
  }
}
//@ chunk-8t8n4kdh.js:120052-120148 sole-consumer
function Fg(e, n) {
  let settledCachedDialFailures = getConnectionCache().settledCachedDialFailures,
    s = ir(e, n),
    h = settledCachedDialFailures.get(s);
  return (settledCachedDialFailures.delete(s), h);
}
//@ chunk-8t8n4kdh.js:120148-120242 sole-consumer
async function xg(e, n) {
  let r = connectToServer.cache?.get?.(ir(e, n));
  return r !== void 0 && (await clearMcpAuthCache(r)) === void 0;
}
//@ chunk-8t8n4kdh.js:120242-120496 sole-consumer
function refuseCachedRow(e, n, r) {
  let s = ir(e, n);
  if (getConnectionCache().refusedCachedRows.has(s)) return;
  if ((getConnectionCache().refusedCachedRows.add(s), r === "policy")) So(e, n).catch(() => {});
  recordCachedDialFailure(
    {
      name: e,
      type: "failed",
      config: n,
      ...(r === "policy" ? mcpGateError("managed-policy", e, n) : { error: wkt, errorCode: "DISABLED" }),
    },
    !1,
  );
}
/**
 * 判断服务器是否有已连接且没有正在后台刷新的连接。
 */
//@ chunk-8t8n4kdh.js:120496-120663 sole-consumer
async function hasLiveConnection(e, n) {
  let r = ir(e, n),
    s = getConnectionCache().connections.get(r);
  if (!s) return !1;
  if ((await clearMcpAuthCache(s))?.type !== "connected") return !1;
  return !ht().swrRefreshDialsInFlight.has(s);
}
/**
 * 服务时清除失败的连接记忆（已连接或未结算的保留）。
 */
//@ chunk-8t8n4kdh.js:120663-120858 affinity
async function evictStaleFailedConnectMemoForServe(e, n) {
  let r = ir(e, n),
    s = getConnectionCache().connections.get(r);
  if (!s) return;
  let h = await clearMcpAuthCache(s);
  if (h === void 0 || h.type === "connected") return;
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
async function Ai(e, n) {
  let r = connectToServer.cache?.get?.(ir(e, n));
  return r === void 0 ? void 0 : clearMcpAuthCache(r);
}
//@ chunk-8t8n4kdh.js:120999-121160 layout
function clearConnectionCaches(e) {
  (getConnectionCache().connections.delete(e),
    getConnectionCache().toolLists.delete(e),
    getConnectionCache().resourceLists.delete(e),
    getConnectionCache().resourceTemplateLists.delete(e),
    getConnectionCache().commandLists.delete(e));
}
/**
 * 清除服务器的连接缓存：有活动调用时保留连接，否则关闭已连接的客户端并删除记忆。
 */
//@ chunk-8t8n4kdh.js:121160-121539 layout
async function clearServerCache(e, n, r) {
  fn();
  let s = ir(e, n),
    h = getConnectionCache().connections.get(s);
  if (h) {
    let y = await clearMcpAuthCache(h);
    if (y === void 0) disposeServerConnectionDetached(e, n, h);
    else if (y.type === "connected") {
      if (
        r !== void 0 &&
        getConnectionCache().connections.get(s) === h &&
        Dt(y.client).transport !== void 0 &&
        (y.transportErrorState?.activeCallWatchdogs.size ?? 0) > 0
      ) {
        r.connection = y;
        return;
      }
      await detachAndCloseConnection(y);
    }
    let S = getConnectionCache().connections.get(s);
    if (S !== void 0 && S !== h) return;
  }
  clearConnectionCaches(s);
}
/**
 * 解除连接的 onclose 并关闭连接，必要时清理对应的连接记忆。
 */
//@ chunk-8t8n4kdh.js:121539-121746 layout
function detachAndCloseConnection(e) {
  if (((Dt(e.client).onclose = void 0), fd())) {
    let n = ir(e.name, e.config),
      r = connectToServer.cache?.get?.(n);
    if (r !== void 0)
      clearMcpAuthCache(r).then((s) => {
        if (isSameConnectedClient(s, e) && connectToServer.cache?.get?.(n) === r) clearConnectionCaches(n);
      });
  }
  return e.cleanup().catch(() => {});
}
/**
 * 在后台丢弃服务器连接：标记为被取代，删除记忆，结算后关闭已连接的客户端。
 */
//@ chunk-8t8n4kdh.js:121746-121941 layout
function disposeServerConnectionDetached(e, n, r) {
  fn();
  let s = ir(e, n),
    h = getConnectionCache().connections.get(s);
  if (r !== void 0 && h !== r) return;
  if (h) ht().supersededDials.add(h);
  if ((clearConnectionCaches(s), h))
    h.then(
      (y) => {
        if (y.type !== "connected") return;
        detachAndCloseConnection(y);
      },
      () => {},
    );
}
//@ chunk-8t8n4kdh.js:121941-121984 layout
async function So(e, n) {
  (fn(), await deleteDiscoveryCache(e, n));
}
/**
 * 丢弃已结束且未连接的连接记忆，返回是否删除。
 */
//@ chunk-8t8n4kdh.js:121984-122252 layout
async function discardMemoizedConnectResult(e, n) {
  let r = ir(e, n);
  if (!fd()) return (getConnectionCache().connections.delete(r), !0);
  let s = getConnectionCache().connections.get(r);
  if (s !== void 0) {
    let h = await clearMcpAuthCache(s);
    if (h === void 0 || h.type === "connected") return !1;
    if (getConnectionCache().connections.get(r) !== s) return !1;
  }
  return (getConnectionCache().connections.delete(r), !0);
}
/**
 * 清除服务器的资源与资源模板列表缓存。
 */
//@ chunk-8t8n4kdh.js:122252-122359 layout
function invalidateMcpResourceListCaches(e) {
  let n = ir(e.name, e.config);
  (getConnectionCache().resourceLists.delete(n), getConnectionCache().resourceTemplateLists.delete(n));
}
/**
 * 注册 MCP elicitation/create 请求处理器。
 */
//@ chunk-8t8n4kdh.js:122359-122466 layout
function onMcpElicitRequest(e, n) {
  Dt(e.client).setRequestHandler("elicitation/create", (r, s) => n(r, { signal: s.mcpReq.signal }));
}
/**
 * 注册 elicitation 完成通知处理器。
 */
//@ chunk-8t8n4kdh.js:122466-122588 layout
function onMcpElicitationComplete(e, n) {
  Dt(e.client).setNotificationHandler("notifications/elicitation/complete", (r) => n(r.params.elicitationId));
}
/**
 * 注册工具列表变化通知处理器（处理器注册前已收到的变化会补发一次）。
 */
//@ chunk-8t8n4kdh.js:122588-122761 layout
function onMcpToolListChanged(e, n) {
  let r = Dt(e.client);
  _r(r, "tools", n);
  let s = createListChangedRefetcher(e, n);
  if (
    (r.setNotificationHandler("notifications/tools/list_changed", (h) => (noteListChangedAhead(r), s(h))),
    markHandlerRegistered(r) && !$Ae(e))
  )
    s(BEFORE_HANDLER);
}
/**
 * 注册提示词列表变化通知处理器。
 */
//@ chunk-8t8n4kdh.js:122761-122887 layout
function onMcpPromptListChanged(e, n) {
  let r = Dt(e.client);
  (_r(r, "prompts", n),
    r.setNotificationHandler("notifications/prompts/list_changed", createListChangedRefetcher(e, n)));
}
/**
 * 注册资源列表变化通知处理器。
 */
//@ chunk-8t8n4kdh.js:122887-123017 layout
function onMcpResourceListChanged(e, n) {
  let r = Dt(e.client);
  (_r(r, "resources", n),
    r.setNotificationHandler("notifications/resources/list_changed", createListChangedRefetcher(e, n)));
}
/**
 * 为 MCP 连接注册自定义通知处理器（新版协议连接不支持未请求的自定义通知，跳过并警告）。
 */
//@ chunk-8t8n4kdh.js:123017-123503 layout
function onMcpNotification(e, n, r) {
  let s = n.shape.method.value,
    h = Dt(e.client);
  if (h.getProtocolEra?.() === "modern") {
    let y = h.getNegotiatedProtocolVersion?.(),
      S = y === void 0 ? void 0 : HPe(y);
    logForDebugging(
      `[MCP] ${e.name}: skipping ${s} handler registration \u2014 this connection negotiated ${S ? `protocol revision ${S}` : "a modern-era protocol revision"}, which has no delivery path for unsolicited custom notifications`,
      { level: "warn" },
    );
    return;
  }
  h.setNotificationHandler(s, { params: n.shape.params }, (y) => r({ method: s, params: y }));
}
/**
 * 确保某 MCP 服务器已连接再用：SDK 服务器直接返回；被撤回的内置插件服务器、托管策略阻止、已禁用的服务器报错；否则拨号（可带 toolUseId），按超时/中止等待结果，needs-auth 与失败分别抛带来源分类的错误。
 */
//@ chunk-8t8n4kdh.js:123503-125148 layout
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
  if (isMcpServerDisabled(server.name) && (await Ai(server.name, server.config))?.type !== "connected") {
    if (server.type === "cached") refuseCachedRow(server.name, server.config, "disabled");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${server.name}" is disabled \u2014 re-enable it via /mcp to use its tools`,
      "MCP server disabled",
    );
  }
  let epochAtDial = identityEpoch(),
    toolUseBinding =
      server.type === "cached" && options?.toolUseId !== void 0 && TOOL_USE_ID_PATTERN.test(options.toolUseId)
        ? { toolUseId: options.toolUseId, withListings: options.toolUseIdWithListingsUntil !== void 0 }
        : void 0,
    dial =
      toolUseBinding === void 0
        ? connectToServer(server.name, server.config)
        : connectToServer(server.name, server.config, void 0, void 0, void 0, toolUseBinding);
  if (toolUseBinding !== void 0) {
    let S = () => {
      toolUseBinding.toolUseId = void 0;
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
          fW.dialNeedsAuth(server.name),
          "MCP server needs authentication",
        ),
        { mcpErrorSource: "user_auth" },
      );
    let S = connection.type === "failed" ? connection.errorCode : void 0;
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        fW.dialNotConnected(
          server.name,
          fd() && connection.type === "failed" && connection.error
            ? `: ${normalizeMcpServerName(connection.error)}`
            : "",
        ),
        "MCP server not connected",
      ),
      {
        mcpErrorSource: rY(
          Object.assign(Error("MCP dial failed"), {
            code: S !== void 0 && /^-?\d+$/.test(S) ? Number(S) : S,
          }),
        ),
        mcpDialCode: S,
      },
    );
  }
  if (isWithdrawnBuiltinPluginServer(server.name, server.config))
    throw (await detachAndCloseConnection(connection), withdrawnBuiltinPluginServerError(server.name));
  return connection;
}
//@ chunk-8t8n4kdh.js:125148-125228 layout
function Tn(e, n, r) {
  let cache = connectToServer.cache;
  if (!cache?.get) return !1;
  return cache.get(ir(n, r)) !== e;
}
//@ chunk-8t8n4kdh.js:125228-125278 layout
function Xt(e) {
  return ht().supersededDials.has(e);
}
/**
 * 缓存首次拨号结束后的处理（每个结果只运行一次）：身份变化或被取代时关闭，连接成功或需认证时记录，失败时删除记忆并上报。
 */
//@ chunk-8t8n4kdh.js:125278-125684 layout
function runCachedFirstDialArms(e, n, r) {
  let cachedFirstDialArmsRan = ht().cachedFirstDialArmsRan;
  if (cachedFirstDialArmsRan.has(e)) return;
  cachedFirstDialArmsRan.add(e);
  let h = ir(e.name, e.config),
    y = getConnectionCache().connections.get(h),
    S = identityEpoch() !== r,
    w = y === void 0 && S;
  if (Xt(n) || (y !== void 0 && y !== n) || w) {
    if (!Xt(n) && S && e.type === "connected") detachAndCloseConnection(e);
    return;
  }
  if (e.type === "connected" || e.type === "needs-auth") {
    pr(e.name, e.config);
    return;
  }
  if ((getConnectionCache().connections.delete(h), e.type === "failed"))
    recordCachedDialFailure(e, !ht().swrRefreshDialsInFlight.has(n));
}
//@ chunk-8t8n4kdh.js:125684-125722 layout
function Kg(e, n) {
  return Yz(e) === Yz(n);
}
/**
 * 可上报的 MCP 连接错误码白名单（OAuth 错误、连接/认证/配置错误、SDK 错误等）。
 */
//@ chunk-8t8n4kdh.js:125722-126790 layout
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
/**
 * 把连接错误码收敛为可上报值：数字码、白名单码或 other。
 */
//@ chunk-8t8n4kdh.js:126790-126959 layout
function sanitizeConnectErrorCodeForTelemetry(e) {
  if (e === void 0) return lit("missing");
  if (/^-?\d+$/.test(e)) return fromNumber(Number(e));
  let found = KNOWN_CONNECT_ERROR_CODES.find((r) => r === e);
  if (found !== void 0) return fromEnum(found);
  return oIt(e) ?? lit("other");
}
/**
 * MCP 列表请求失败的错误码到原因名的映射。
 */
//@ chunk-8t8n4kdh.js:126959-127364 layout
var LIST_FAILURE_REASONS = {
  [Ti.ConnectionClosed]: "connection_closed",
  [Ti.RequestTimeout]: "request_timeout",
  [Ti.ListPaginationExceeded]: "list_pagination_exceeded",
  [-32000]: "connection_closed",
  [-32001]: "request_timeout",
  [CCR_NEEDS_APPROVAL_CODE]: "ccr_needs_approval",
  [ma.ParseError]: "parse_error",
  [ma.InvalidRequest]: "invalid_request",
  [ma.MethodNotFound]: "method_not_found",
  [ma.InvalidParams]: "invalid_params",
  [ma.InternalError]: "internal_error",
};
/**
 * 把 MCP 工具输入转换为自动模式分类器的输入文本（key=value，空输入时用工具名）。
 */
//@ chunk-8t8n4kdh.js:127364-127547 layout
function mcpToolInputToAutoClassifierInput(e, n) {
  let keys = Object.keys(e);
  if (keys.length === 0) return n;
  return keys
    .map((s) => {
      let h = e[s],
        y = typeof h === "object" && h !== null ? JSON.stringify(h) : String(h);
      return `${s}=${y}`;
    })
    .join(" ");
}
//@ chunk-8t8n4kdh.js:127547-127690 layout
function beginDroppedToolsRound(e) {
  let droppedToolsSeqByConnection = ht().droppedToolsSeqByConnection,
    r = droppedToolsSeqByConnection.get(e) ?? { started: 0, applied: 0 };
  return (droppedToolsSeqByConnection.set(e, r), (r.started += 1), { seq: r.started, state: r });
}
//@ chunk-8t8n4kdh.js:127690-127747 layout
function Wg(e) {
  return ht().toolsListErrorByResult.get(e);
}
//@ chunk-8t8n4kdh.js:127747-127802 layout
function fr(e) {
  return ht().discoveryFetchErrors.get(e);
}
//@ chunk-8t8n4kdh.js:127802-127862 layout
function Ni() {
  fn();
  let e = getMcpIdentitySnapshot();
  return isUnresolved(e) ? void 0 : e.token;
}
/**
 * 首次时记录 MCP 身份基线。
 */
//@ chunk-8t8n4kdh.js:127862-127994 layout
function seedMcpIdentityCheck() {
  let e = ht();
  if (e.identitySeedAttempted) return;
  e.identitySeedAttempted = !0;
  let n = Ni();
  if (n !== void 0) e.identityBaseline = n;
}
/**
 * 判断 MCP 身份自上次检查以来是否变化，并更新基线。
 */
//@ chunk-8t8n4kdh.js:127994-128204 layout
function mcpIdentityChangedSinceLastCheck() {
  let e = Ni(),
    n = ht();
  if (e === void 0) return ((n.identityBaseline = void 0), !0);
  if (n.identityBaseline === void 0) return ((n.identityBaseline = e), !0);
  if (n.identityBaseline === e) return !1;
  return ((n.identityBaseline = e), !0);
}
/**
 * 记录原始工具列表与拉取时间，供发现缓存写回。
 */
//@ chunk-8t8n4kdh.js:128204-128317 layout
function recordRawToolsForResult(e, n) {
  if (!fd()) return;
  let r = ht();
  (r.rawToolsByResult.set(e, n), r.rawFetchedAtByResult.set(e, Date.now()));
}
/**
 * 记录原始命令列表与拉取时间，供发现缓存写回。
 */
//@ chunk-8t8n4kdh.js:128317-128433 layout
function recordRawCommandsForResult(e, n) {
  if (!fd()) return;
  let r = ht();
  (r.rawCommandsByResult.set(e, n), r.rawFetchedAtByResult.set(e, Date.now()));
}
/**
 * 记录原始资源列表与拉取时间，供发现缓存写回。
 */
//@ chunk-8t8n4kdh.js:128433-128550 layout
function recordRawResourcesForResult(e, n) {
  if (!fd()) return;
  let r = ht();
  (r.rawResourcesByResult.set(e, n), r.rawFetchedAtByResult.set(e, Date.now()));
}
//@ chunk-8t8n4kdh.js:128550-128602 layout
function Jg(e, n) {
  ht().discoveryFetchErrors.set(e, n);
}
/**
 * 发现缓存命中但服务器具备频道能力时，改为未命中。
 */
//@ chunk-8t8n4kdh.js:128602-128755 layout
function applyCapabilityServeTimeMiss(e) {
  if (e.kind !== "fresh" && e.kind !== "stale") return e;
  let capabilities = e.entry.capabilities;
  if (hasChannelCapability(capabilities)) return { kind: "miss", reason: "channel-capable" };
  return e;
}
/**
 * 把一次发现回合拿到的原始工具/命令/资源/模板写入发现缓存：已写过或身份纪元已变时跳过；写入后清掉暂存；瞬时失败时放回暂存以便重试，终止性失败返回 false。
 */
//@ chunk-8t8n4kdh.js:128755-130342 layout
async function persistRawDiscoveryIfComplete(connection, round) {
  fn();
  let state = ht();
  if (state.persistedDiscoveryRounds.has(round.tools)) return !0;
  if (!isCurrentIdentityEpoch(round.identityEpoch)) return !0;
  let rawTools = state.rawToolsByResult.get(round.tools),
    rawCommands = state.rawCommandsByResult.get(round.commands),
    rawResources = state.rawResourcesByResult.get(round.resources);
  if (rawTools === void 0 || rawCommands === void 0 || rawResources === void 0 || round.templates === void 0)
    return !1;
  let min = Math.min(
    state.rawFetchedAtByResult.get(round.tools) ?? Number.POSITIVE_INFINITY,
    state.rawFetchedAtByResult.get(round.commands) ?? Number.POSITIVE_INFINITY,
    state.rawFetchedAtByResult.get(round.resources) ?? Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(min)) return !0;
  let w = min,
    mapped = [round.tools, round.commands, round.resources].map((j) => [
      j,
      state.rawFetchedAtByResult.get(j),
    ]);
  (state.rawToolsByResult.delete(round.tools),
    state.rawCommandsByResult.delete(round.commands),
    state.rawResourcesByResult.delete(round.resources),
    state.rawFetchedAtByResult.delete(round.tools),
    state.rawFetchedAtByResult.delete(round.commands),
    state.rawFetchedAtByResult.delete(round.resources),
    state.persistedDiscoveryRounds.add(round.tools));
  let writeResult = await writeDiscoveryCache(
    connection.name,
    connection.config,
    {
      ...(connection.serverInfo && {
        serverInfo: { name: connection.serverInfo.name, version: connection.serverInfo.version },
      }),
      ...(connection.protocolEra !== void 0 && { negotiatedEra: connection.protocolEra }),
      capabilities: connection.capabilities,
      tools: rawTools,
      commands: rawCommands,
      resources: rawResources,
      templates: round.templates.map(({ server: server, ...R }) => R),
    },
    { identityEpoch: round.identityEpoch, grantLeg: round.grantLeg, now: w },
  );
  if (writeResult === "terminal") return (state.persistedDiscoveryRounds.delete(round.tools), !1);
  if (writeResult === "transient") {
    (state.rawToolsByResult.set(round.tools, rawTools),
      state.rawCommandsByResult.set(round.commands, rawCommands),
      state.rawResourcesByResult.set(round.resources, rawResources));
    for (let [j, R] of mapped) if (R !== void 0) state.rawFetchedAtByResult.set(j, R);
    state.persistedDiscoveryRounds.delete(round.tools);
  }
  return !0;
}
/**
 * 身份未变化时把刷新得到的工具列表合并写入发现缓存。
 */
//@ chunk-8t8n4kdh.js:130342-130600 layout
async function persistRefreshedToolsIfPresent(e, n, r) {
  if ((fn(), !isCurrentIdentityEpoch(r.identityEpoch))) return;
  let s = ht(),
    h = s.rawToolsByResult.get(n),
    y = s.rawFetchedAtByResult.get(n);
  if (h === void 0 || y === void 0) return;
  await mergeDiscoveryTools(e.name, e.config, h, {
    identityEpoch: r.identityEpoch,
    grantLeg: r.grantLeg,
    fetchedAt: y,
  });
}
/**
 * 把实时连接得到的列表写入发现缓存：需要时拉取资源模板，写入前确认连接未变且服务器未被禁用或拦截。
 */
//@ chunk-8t8n4kdh.js:130600-130985 layout
async function persistLiveListing(e, n) {
  if (
    !fd() ||
    !isDiscoveryCacheEligible(e.config) ||
    isMcpServerDisabled(e.name) ||
    isMcpServerBlockedAtConnectTime(e.name, e.config)
  )
    return;
  try {
    let r = !!e.capabilities?.resources;
    if (!r) recordRawResourcesForResult(n.resources, []);
    let s = r && cZe(e.config) ? await fetchResourceTemplatesForClient(e) : [];
    if (
      (await Ai(e.name, e.config)) !== e ||
      isMcpServerDisabled(e.name) ||
      isMcpServerBlockedAtConnectTime(e.name, e.config)
    )
      return;
    await persistRawDiscoveryIfComplete(e, { ...n, templates: fr(s) === void 0 ? s : void 0 });
  } catch (error) {
    logMCPDebug(e.name, `Discovery cache write-through skipped: ${errorMessage(error)}`);
  }
}
/**
 * isDiscoveryCacheMissRecoverable：发现缓存未命中原因是否需要重写缓存（absent/expired/corrupt 等为 true）。
 */
//@ chunk-8t8n4kdh.js:130985-131278 layout
function isDiscoveryCacheMissRecoverable(e) {
  switch (e.reason) {
    case "absent":
    case "expired":
    case "corrupt":
    case "strike-threshold":
    case "no-fingerprint":
    case "unsealed":
      return !0;
    case "disabled":
    case "key-unavailable":
    case "transport":
    case "live-connection":
    case "skills-capable":
    case "channel-capable":
      return !1;
    default:
      return e.reason;
  }
}
/**
 * discoverySourceLabel：发现缓存查询结果到遥测标签（live、miss_expired、miss_corrupt 等）。
 */
//@ chunk-8t8n4kdh.js:131278-131805 layout
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
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : void 0;
}
/**
 * buildMcpTool：把一个 MCP 工具定义包装成 CLI Tool：名字 mcp__<server>__<tool>（SDK 可去前缀）；描述按 CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH（默认 4096，经 ToolSearch 加载时 16384）截断；注解映射 isReadOnly/isDestructive/isOpenWorld/isConcurrencySafe；_meta 支持 anthropic/maxResultSizeChars、searchHint、alwaysLoad、requiresUserInteraction；checkPermissions 默认 passthrough 并建议写 localSettings allow 规则。
 */
//@ chunk-8t8n4kdh.js:131929-136285 fingerprint = fetchToolsForClient (0.385)
function buildMcpTool({
  serverName: serverName,
  scope: scope,
  pluginSource: pluginSource,
  serverType: serverType,
  source: source,
  skipPrefix: skipPrefix,
  standardKey: standardKey,
  denyKey: denyKey,
  legacyGrantRefused: legacyGrantRefused = !1,
  legacyGrantRebindable: legacyGrantRebindable = !1,
  serverAlwaysLoad: serverAlwaysLoad,
  serverDefersAllTools: serverDefersAllTools = !1,
  effectiveMaxPermission: effectiveMaxPermission,
  promptOverrides: promptOverrides,
  isFirstPartyDesignServer: isFirstPartyDesignServer,
  maxDescriptionLength: maxDescriptionLength = vF(),
  maxLoadedDescriptionLength: maxLoadedDescriptionLength = vF(!0),
  pluginTelemetry: pluginTelemetry,
  cliOwned: cliOwned,
  accountMemory: accountMemory = !1,
  accountMemoryServer: accountMemoryServer = !1,
  sdkDocsConnector: sdkDocsConnector = !1,
  displayName: displayName,
  serverId: serverId,
  serverIdStamp: serverIdStamp,
  iconUrl: iconUrl,
  serverInfoName: serverInfoName,
  role: role,
  listed: listed,
  call: Tt,
  overrides: overrides,
}) {
  let Be = buildMcpToolName(serverName, listed.name),
    xe = getMaxResultSizeCharsMeta(listed),
    wt = xe !== void 0,
    Se = listed._meta?.["anthropic/requiresUserInteraction"] === !0,
    toolsToProcess = toolUiMeta(listed._meta),
    At = promptOverrides?.tools?.[listed.name] ?? listed.description ?? "",
    ft = truncateDescription(At, `Tool "${listed.name}" description`, serverName, maxDescriptionLength),
    Ot = truncateDescription(At, `Tool "${listed.name}" description`, serverName, maxLoadedDescriptionLength),
    vt =
      promptOverrides?.search_hints?.[listed.name] ??
      (typeof listed._meta?.["anthropic/searchHint"] === "string"
        ? listed._meta["anthropic/searchHint"]
        : void 0),
    me = withOverlapSlots(serverName, listed.name, Tt),
    fullyQualifiedName = qq(serverName, { scope: scope, pluginSource: pluginSource }),
    Ve = fullyQualifiedName || legacyGrantRefused,
    De =
      legacyGrantRefused &&
      legacyGrantRebindable &&
      !Se &&
      effectiveMaxPermission !== "ask" &&
      overrides?.suppressesAlwaysAllowRule === void 0 &&
      overrides?.requiresUserInteraction === void 0 &&
      !isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    Le = Ve || isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    re = () =>
      fullyQualifiedName ||
      (legacyGrantRefused &&
        !ownsLegacyKey({ serverName: serverName, serverType: serverType, serverId: serverId })) ||
      isLegacyKeyUnclaimed({ serverName: serverName, serverType: serverType, serverId: serverId }) ||
      mayRecordServerOwner({ serverName: serverName, serverType: serverType, serverId: serverId });
  if (Ve)
    logMCPDebug(
      serverName,
      fullyQualifiedName
        ? "Allow rules do not apply: this server's name starts like a claude.ai connector's. To use allow rules, the server needs another name, and the rules must use that name."
        : "Allow rules do not apply: another MCP server already uses this name, or the name could not be recorded in the config file. Give this server a different name and write the rules for that name, or reconnect if the config file was busy.",
    );
  return {
    ...MCPTool,
    name: skipPrefix ? listed.name : Be,
    mcpInfo: {
      serverName: serverName,
      scope: scope,
      ...(pluginSource !== void 0 && { pluginSource: pluginSource }),
      serverType: serverType,
      ...(source !== void 0 && { source: source }),
      ...(pluginTelemetry && { pluginTelemetry: pluginTelemetry }),
      displayName: displayName,
      serverId: serverId,
      ...(serverIdStamp !== void 0 && { serverIdStamp: serverIdStamp }),
      iconUrl: iconUrl,
      serverInfoName: serverInfoName,
      ...(cliOwned && { cliOwned: !0 }),
      ...(standardKey !== void 0 && { standardKey: standardKey }),
      ...(legacyGrantRefused && { legacyGrantRefused: legacyGrantRefused }),
      ...(De && { legacyGrantRebindable: legacyGrantRebindable }),
      ...(denyKey !== void 0 && { denyKey: denyKey }),
      ...(accountMemory && { accountMemory: !0 }),
      ...(accountMemoryServer && { accountMemoryServer: !0 }),
      ...(sdkDocsConnector && { sdkDocsConnector: !0 }),
      toolName: listed.name,
      title: listed.annotations?.title?.replace(/\s+/g, " ").trim() || void 0,
      execution: listed.execution,
      role: role,
      effectiveMaxPermission: effectiveMaxPermission,
      ...(toolsToProcess && { uiMeta: toolsToProcess }),
      ...(describeHiddenMcpTool(listed._meta, serverName, listed.name) && { hiddenFromModel: !0 }),
    },
    isMcp: !0,
    searchHint: vt?.replace(/\s+/g, " ").trim() || void 0,
    alwaysLoad:
      !serverDefersAllTools &&
      ((serverAlwaysLoad && !(scope === "dynamic" && listed._meta?.["anthropic/alwaysLoad"] === !1)) ||
        listed._meta?.["anthropic/alwaysLoad"] === !0),
    async description() {
      return At;
    },
    async prompt({ loadedThroughToolSearch: ue }) {
      return ue ? Ot : ft;
    },
    isConcurrencySafe() {
      return me.mayOverlap || (listed.annotations?.readOnlyHint ?? !1);
    },
    isReadOnly() {
      return listed.annotations?.readOnlyHint ?? !1;
    },
    readOnlyHint: listed.annotations?.readOnlyHint,
    openWorldHint: listed.annotations?.openWorldHint,
    toAutoClassifierInput(ue) {
      return mcpToolInputToAutoClassifierInput(ue, listed.name);
    },
    isDestructive() {
      return listed.annotations?.destructiveHint ?? !1;
    },
    isOpenWorld() {
      return listed.annotations?.openWorldHint ?? !1;
    },
    requiresUserInteraction() {
      return Se;
    },
    async validateInput(ue, ot) {
      let it = refuseNonMainAccountMemoryWrite(accountMemoryServer, listed.name, ot);
      if (it === void 0) return { result: !0 };
      return (
        logEvent("tengu_account_memory_spawned_write_refused", {
          caller: fromEnumOpt(ot.memoryCaller) ?? lit("unmarked"),
        }),
        { result: !1, message: it, errorCode: 1 }
      );
    },
    suppressesAlwaysAllowRule: (ue, ot) =>
      Se ||
      (effectiveMaxPermission === "ask" && !ot) ||
      re() ||
      isDesignGatedTool(isFirstPartyDesignServer, listed.name),
    ...((Ve || isServerIdentityActive()) && { ignoresWholeToolAllowRule: re }),
    maxResultSizeChars: wt ? Math.min(xe, Tle) : MCPTool.maxResultSizeChars,
    persistenceThresholdCeiling: wt ? Tle : void 0,
    inputJSONSchema: addComputerUseActionSummary(
      addActionSummaryToSchema(
        applyParamDescriptionOverrides(
          listed.inputSchema,
          promptOverrides?.param_descriptions?.[listed.name],
        ),
        Be,
      ),
      Be,
    ),
    async checkPermissions(ue, ot) {
      let it = gateDesignWriteWithoutPlanToken(isFirstPartyDesignServer, listed.name, ue);
      if (it) return it;
      if (isFirstPartyDesignServer) {
        let ye = SZe(),
          be = (await ye?.wouldNeedDesignConsent(ot.toolState.get(DesignGateState), ot.credentials)) ?? null;
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
          suppressAlwaysAllowRule: !0,
        };
      return {
        behavior: "passthrough",
        message: "MCPTool requires permission.",
        suggestions: Le
          ? []
          : [
              {
                type: "addRules",
                rules: [{ toolName: Be, ruleContent: void 0 }],
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
/**
 * buildCachedClientTools：用发现缓存条目构造 type=cached 的客户端与工具（不连线）。
 */
//@ chunk-8t8n4kdh.js:136285-136568 layout
async function buildCachedClientTools({
  name: e,
  config: config,
  capabilities: capabilities,
  serverInfo: serverInfo,
  savedAt: savedAt,
  tools: tools,
}) {
  (Er(), await evictStaleFailedConnectMemoForServe(e, config));
  let S = {
    name: e,
    type: "cached",
    config: config,
    capabilities: capabilities,
    ...(serverInfo && { serverInfo: { name: serverInfo.name, version: serverInfo.version } }),
    cacheSavedAt: savedAt,
  };
  return {
    client: S,
    tools: await buildMcpToolsForClient(S, tools, Date.now(), "cache", beginDroppedToolsRound(S)),
  };
}
/**
 * buildMcpToolsForClient：处理 tools/list 结果：校验/修正 inputSchema、数量上限、toolPermissions 与工具策略、IDE 工具白名单、角色等，逐个 buildMcpTool，并记录降级与 tengu_mcp_tools_listed 遥测。
 */
//@ chunk-8t8n4kdh.js:136568-154333 layout
async function buildMcpToolsForClient(client, listedTools, startedAtMs, discoverySource, h) {
  listedTools = filterRemoteRepoTools(client.config, listedTools);
  let y = listedTools.length,
    S = createStreamingListingSanitizer(),
    flat = (await mapInTurns(listedTools, (re) => S(re) ?? [])).flat();
  listedTools = [];
  let P = ET(client.config),
    M = mcpBaseUrlAnalytics_2(client.config, client.name),
    j = mcpNameForAnalytics_GATE_EVALUATED(
      normalizeNameForMCP(client.name),
      isMcpServerLoggableInAnalytics(client.name, client.config),
    ),
    R = y - flat.length;
  if (R > 0)
    (logMCPError(client.name, listingTruncatedNote("tools", R, y)),
      logEvent("tengu_mcp_degraded", {
        reason: lit("tool_listing_over_limit"),
        transportType: fromEnum(client.config.type ?? "stdio"),
        skippedCount: R,
        mcpServerName: j,
        ...M,
      }));
  if (y === 0 && discoverySource === "live")
    logEvent("tengu_mcp_degraded", {
      reason: lit("connected_zero_tools"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      mcpServerName: j,
      ...M,
    });
  let ce = client.config.type === "sdk" && env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX,
    Q =
      client.config.type === "claudeai-proxy" || client.config.type === "http" || client.config.type === "sse"
        ? client.config.toolPermissions
        : void 0,
    ie = isRunnerDynamicServer(client.config) ? l6n(Q) : Q;
  if (ie) {
    let re = Object.keys(ie).length;
    if (re > 0 && !flat.some((ue) => ie[ue.name] !== void 0))
      logForDebugging(
        `[claudeai-mcp] ${client.name}: toolPermissions has ${re} entries but none matched upstream tool names \u2014 backend name drift?`,
        { level: "warn" },
      );
  }
  let ge = shouldNormalizeRootCombinators(client.config),
    Ie = shouldDropInvalidToolSchemas(client.config),
    G = 0,
    Pe = 0,
    ke = 0,
    nt = 0,
    ee = 0,
    he = [],
    Ae = 0,
    yt = 0,
    q = await mapInTurns(flat, (re) => {
      let ue = judgeToolSchemaSendability(re.inputSchema, { normalizeEnabled: ge, apiValidateEnabled: Ie });
      if (ue.verdict === "drop" && ue.cause !== "api_invalid") {
        if (ue.cause === "normalize_gated") Pe++;
        else ke++;
        return (
          logMCPError(
            client.name,
            `Skipping tool "${re.name}": ${ue.reason}. Other tools from this server remain available.`,
          ),
          []
        );
      }
      if (ue.normalized)
        (G++,
          logMCPDebug(
            client.name,
            `Normalized input schema for tool "${re.name}" (flattened top-level ${ue.normalized.combinators.join("/")})`,
          ));
      if (ue.verdict === "drop") {
        if (ue.rejection.check === "meta") nt++;
        else ee++;
        if (
          ie?.[re.name] !== "blocked" &&
          isIncludedMcpTool_2(ce ? re.name : buildMcpToolName(client.name, re.name))
        )
          he.push({ toolName: re.name, reason: ue.rejection.detail });
        return (
          logMCPError(
            client.name,
            `Skipping tool "${re.name}": its input schema would be rejected by the Anthropic API (${ue.rejection.detail}). Other tools from this server remain available.`,
          ),
          []
        );
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
    }),
    H = Ji(q.flat(), "name");
  if (h.seq > h.state.applied) ((h.state.applied = h.seq), (client.droppedTools = Ji(he, "toolName")));
  if (G > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalized"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      normalizedCount: G,
      mcpServerName: j,
      ...M,
    });
  if (Pe > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_normalize_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: Pe,
      mcpServerName: j,
      ...M,
    });
  if (ke > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_unsupported"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: ke,
      mcpServerName: j,
      ...M,
    });
  if (nt > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: nt,
      mcpServerName: j,
      ...M,
    });
  if (ee > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      skippedCount: ee,
      mcpServerName: j,
      ...M,
    });
  if (Ae > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_schema_invalid_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      keptCount: Ae,
      mcpServerName: j,
      ...M,
    });
  if (yt > 0)
    logEvent("tengu_mcp_degraded", {
      reason: lit("tool_property_key_invalid_gated"),
      transportType: fromEnum(client.config.type ?? "stdio"),
      keptCount: yt,
      mcpServerName: j,
      ...M,
    });
  let Xe = () => isMcpServerLoggableInAnalytics(client.name, client.config),
    Ee = TB(client.config),
    Tt = TB(client.config, !0);
  await logToolCallXmlInDescriptions(H, client.name, Xe(), P, client.instructions);
  let Qe = isDesignServerConfig(client.config),
    Be = officialPluginPromptOverrides(client.config),
    xe = client.config.pluginSource ? buildPluginEventFieldsFromId(client.config.pluginSource, af()) : void 0,
    wt = Zl(client.config),
    Se = wt && client.name === CLAUDE_ARTIFACTS,
    ze = Se || isOwnCcrMcpServer(client.config),
    At = !1,
    ft = H,
    Ot =
      flat.some((re) => $Pt(client, re.name)) ||
      ft.some((re) => $Pt(client, re.name)) ||
      (R > 0 && isMemoryToolServer(client)),
    vt = {
      serverName: client.name,
      scope: client.config.scope,
      pluginSource: client.config.pluginSource,
      serverType: client.config.type ?? "stdio",
      sdkDocsConnector: Sdn(client),
      source: mcpServerSource(client.name, client.config),
      skipPrefix: ce,
      serverAlwaysLoad: client.config.alwaysLoad === !0,
      serverDefersAllTools: client.config.alwaysLoad === !1,
      promptOverrides: Be,
      isFirstPartyDesignServer: Qe,
      maxDescriptionLength: Ee,
      maxLoadedDescriptionLength: Tt,
      pluginTelemetry: xe,
      cliOwned: wt,
      displayName: "displayName" in client.config ? client.config.displayName : void 0,
      standardKey: isStandardKeyActive()
        ? getServerIdentityKey(client.name, client.config, wt === !0)
        : void 0,
      legacyGrantRefused:
        isStandardKeyActive() &&
        (await isLegacyKeyRefused(
          { serverName: client.name, serverType: client.config.type ?? "stdio", serverId: gH(client.config) },
          qq(client.name, client.config),
          isIdentityTrackedServer(client.name, client.config),
        )),
      legacyGrantRebindable:
        isStandardKeyActive() &&
        !qq(client.name, client.config) &&
        isIdentityTrackedServer(client.name, client.config) &&
        isLegacyKeyOwnedElsewhere({
          serverName: client.name,
          serverType: client.config.type ?? "stdio",
          serverId: gH(client.config),
        }),
      denyKey: isStandardKeyActive() ? isRemoteTransport(client.config) : void 0,
      serverId: gH(client.config),
      serverIdStamp: dynamicServerConnectorId(client.name, client.config),
      iconUrl: "iconUrl" in client.config ? client.config.iconUrl : void 0,
      serverInfoName: stripIgnorables(client.serverInfo?.name ?? "") || void 0,
      role: "role" in client.config ? client.config.role : void 0,
    },
    me = isClaudeInChromeMCPServer(client.name),
    Te = isDocsConnectorServer(client),
    filtered = (
      await mapInTurns(ft, (re) => {
        let ue = buildMcpToolName(client.name, re.name),
          ot = getMaxResultSizeCharsMeta(re) !== void 0,
          it = {
            ...(me &&
              isStdioConfig(client.config) && {
                ...Mc().getClaudeInChromeMCPToolOverrides(re.name),
                builtinRenderFamily: "claude-in-chrome",
              }),
            ...(me &&
              isClaudeAiProxyServer(client.config) && {
                ...createChromePermissionHandler(re.name, re._meta, (Fe, L) =>
                  readTabUrl(
                    async (mt, et, Oe) =>
                      (
                        await callMCPTool({
                          client: await ensureConnectedClient(client, {
                            context: "MCP tool call",
                            signal: Oe,
                          }),
                          tool: mt,
                          args: et,
                          signal: Oe,
                          resultNotForModel: !0,
                          imageLimits: IMAGE_LIMITS,
                          storageV5: void 0,
                          credentials: void 0,
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
            ...!1,
            ...(client.config.type === "sdk" && isFileUploadServer(client.name)
              ? buildMcpToolPermissionOverrides(
                  client.name,
                  re.name,
                  re.inputSchema.properties,
                  mcpToolInputToAutoClassifierInput,
                )
              : {}),
            ...(k4n(re.name) ? createSlackSendToolUi() : {}),
            ...(u8n(client.name, client.config.pluginSource, re.name) ? claudeTestWriteToolOverrides() : {}),
            ...{},
            ...(Se ? artifactsMcpLaptopModule()?.artifactsMcpLaptopToolOverridesFor(client.config) : {}),
            ...(isRunnerDynamicServer(client.config) && { skipAggregateToolResultBudget: !0 }),
          },
          ye = buildMcpTool({
            ...vt,
            accountMemory: isMemoryServerConnection(client, re.name),
            accountMemoryServer: Ot,
            effectiveMaxPermission: ie?.[re.name],
            listed: re,
            overrides: it,
            async call(Fe, L, mt, et, Oe, we) {
              let Ke = L.toolUseId ?? getFirstToolUseId(et),
                He = refuseNonMainAccountMemoryWrite(Ot, re.name, L);
              if (He !== void 0)
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  He,
                  "account memory write from a spawned loop",
                );
              let tt = {
                  ...mYn(client.config, L.mcpRequestMeta),
                  ...we?.mcpCallMeta,
                  ...(Ke && { "claudecode/toolUseId": Ke }),
                  ...consumeMcpApprovalTicket(L.session, L.toolUseId, client.name, client.config),
                  ...(isClaudeInChromeMCPServer(client.name) &&
                    isClaudeAiProxyServer(client.config) &&
                    judgedSiteMeta(L)),
                  ...((isDocsConnectorServer(client) || nxn(client.name, client.config)) &&
                    tor(et.requestId)),
                  ...(isHearthbotRelayServer(client) && ccrTurnEventHeaders(Rnr())),
                  ...agentRequestMeta(client, L),
                  ...(isAccountMemoryServer(client) && memoryChainMeta(L.toolState, et.message.id)),
                },
                gt = !1;
              function Nt(Ct) {
                if (!Oe || !Ke || gt) return;
                Oe({ type: "progress", toolUseID: Ke, data: Ct });
              }
              Nt({ type: "mcp_progress", status: "started", serverName: client.name, toolName: re.name });
              let now = Date.now(),
                Me = client,
                Ye = !1,
                _t,
                Mt = null,
                at = typeof Fe.__consentNonce === "string" ? Fe.__consentNonce : void 0;
              if ("__consentNonce" in Fe) {
                let { __consentNonce: __consentNonce, ...sn } = Fe;
                Fe = sn;
              }
              let pt = Qe ? takeDesignConsentAsk(Ke, at) : null;
              if (Qe) noteDesignProjectId(L.toolState.get(DesignGateState), Qe, re.name, Fe);
              let jt,
                Lt = (Ct) => {
                  if (((Ye = Ct), Ct)) {
                    if (
                      ((_t ??= we?.timing?.mark("approval")),
                      !gt && ye.name !== getPermissionPromptToolName() && Mt === null)
                    )
                      Mt = parkOnUser();
                  } else (_t?.(), (_t = void 0), Mt?.(), (Mt = null));
                },
                We = !0,
                Bt = async (Ct) => {
                  let an = !1,
                    un;
                  for (let en = 0; ; en++)
                    try {
                      let ut = We ? Ke : void 0;
                      We = !1;
                      let qt = we?.timing?.mark(
                          client.config.type === "http" && issuerKey_3(client.config.url)
                            ? "own"
                            : "external",
                        ),
                        Qt = await ensureConnectedClient(client, {
                          context: "MCP tool call",
                          toolUseId: ut,
                        }).finally(qt);
                      ((Me = Qt), applyMemoryCallerMeta(tt, Ot, L, Qt));
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
                        onProgress: Oe && Ke ? Nt : void 0,
                        requestDialog: L.requestDialog,
                        storageV5: L.storageV5,
                        credentials: L.credentials,
                        hasResultSizeAnnotation: ot || L.innerCall === !0,
                        onAwaitingUserInput: Lt,
                        timing: we?.timing,
                        offCriticalPath:
                          (getBackgroundAgentId(L.agentContext) ??
                            (L.isBackgroundAgent ? L.agentId : void 0)) !== void 0,
                        taskBackground: jt,
                        disallowTasks:
                          L.agentId !== void 0 || (L.options.isNonInteractiveSession && jt === void 0),
                        ccrNeedsApprovalRetry:
                          "url" in client.config &&
                          isSameOriginAsCcr(client.config.url) &&
                          canPromptForPermission(L) &&
                          !(getPermissionPromptToolName() && getPermissionPromptToolName() !== "stdio")
                            ? {
                                canUseTool: mt,
                                tool: ye,
                                fullyQualifiedName: ue,
                                toolUseContext: L,
                                parentMessage: et,
                              }
                            : void 0,
                      });
                      if (lt.interrupted) throw new AbortError(INTERRUPTED_CALL_NOTICE);
                      if (
                        (Nt({
                          type: "mcp_progress",
                          status: "completed",
                          serverName: client.name,
                          toolName: re.name,
                          elapsedTimeMs: Date.now() - now,
                        }),
                        !lt.isError)
                      ) {
                        if ((logPrCreateOperation(re.name), isAccountMemoryServer(client)))
                          rememberMemoryChain(L.toolState, et.message.id, lt._meta);
                        if (
                          !gt &&
                          isClaudeInChromeMCPServer(client.name) &&
                          isClaudeAiProxyServer(client.config)
                        )
                          lt.content = chromeNoBrowserAnswer(lt.content, lt._meta, L);
                      }
                      if (en > 0) logFeatureOk("mcp_session_recovery");
                      let cn = gYn(client.config, stripAnthropicMeta(lt._meta)),
                        vn = isMcpTasksEnabled() ? mcpTaskDriveModule.sdkAgentTaskMeta(lt._meta) : void 0,
                        kn = cn || vn ? { ...cn, ...vn } : void 0;
                      return {
                        data: un === void 0 ? lt.content : stepUpResultMessage(lt.content, client.name, un),
                        ...(lt.urlElicitationDeclined && {
                          urlElicitationDeclined: lt.urlElicitationDeclined,
                        }),
                        ...((kn || lt.structuredContent || lt.resourceLinks) && {
                          mcpMeta: {
                            ...(kn && { _meta: kn }),
                            ...(lt.structuredContent && { structuredContent: lt.structuredContent }),
                            ...(lt.resourceLinks && { resourceLinks: lt.resourceLinks }),
                          },
                        }),
                      };
                    } catch (error) {
                      if (
                        un !== void 0 &&
                        error instanceof McpAuthError &&
                        error.requestedScope !== void 0 &&
                        client.config.type === "http"
                      )
                        markStepUpExhausted(client.name, client.config, un, error.requestedScope);
                      if (
                        !an &&
                        error instanceof McpAuthError &&
                        error.requestedScope !== void 0 &&
                        isStepUpAuthDialogEnabled() &&
                        client.config.type === "http" &&
                        client.config.oauth?.xaa !== !0 &&
                        grantedScopesCover(client.config, error.requestedScope) &&
                        !Rs(client.name, client.config, error.requestedScope) &&
                        canPromptForPermission(L) &&
                        L.agentId === void 0 &&
                        ye.name !== getPermissionPromptToolName() &&
                        !L.options.isNonInteractiveSession &&
                        !isBrowserUnavailable() &&
                        !isUnattendedBgSession() &&
                        getTeammateAgentId() === void 0 &&
                        !isMcpServerDisabled(client.name) &&
                        !isMcpDialBlockedByPolicy(client.name, client.config)
                      ) {
                        let config = client.config;
                        Lt(!0);
                        let Qt;
                        try {
                          Qt = await runStepUpReauth({
                            serverName: client.name,
                            config: config,
                            requestedScope: error.requestedScope,
                            canUseTool: mt,
                            toolUseContext: L,
                            signal: Ct,
                            performOAuthFlow: performMCPOAuthFlow_2,
                            reconnect: (lt, cn) =>
                              reconnectMcpServerImpl_2(lt, cn, L.storageV5, L.credentials),
                            discard: (lt, cn) => clearServerCache(lt, cn),
                            isPermitted: (lt, cn) =>
                              !isMcpServerDisabled(lt) && !isMcpDialBlockedByPolicy(lt, cn),
                          });
                        } finally {
                          Lt(!1);
                        }
                        if (Qt === "reauthenticated") {
                          ((an = !0),
                            (un = error.requestedScope),
                            logMCPDebug(
                              client.name,
                              `Retrying tool '${re.name}' after the consented step-up re-auth`,
                            ),
                            (en -= 1));
                          continue;
                        }
                      }
                      if (
                        error instanceof McpSessionExpiredError &&
                        en < 1 &&
                        (!error.mayHaveRun ||
                          ye.isConcurrencySafe(Fe) ||
                          re.annotations?.idempotentHint === !0)
                      ) {
                        (logFeatureSad("mcp_session_recovery", error.expiryKind),
                          logMCPDebug(client.name, `Retrying tool '${re.name}' after session recovery`));
                        continue;
                      }
                      if (error instanceof McpSessionExpiredError)
                        logFeatureBad(
                          "mcp_session_recovery",
                          en < 1 ? "may_have_run_no_retry" : "session_retry_exhausted",
                        );
                      else if (en > 0 && !Ct.aborted)
                        logFeatureBad("mcp_session_recovery", "retry_failed_other");
                      if (
                        (Nt({
                          type: "mcp_progress",
                          status: "failed",
                          serverName: client.name,
                          toolName: re.name,
                          elapsedTimeMs: Date.now() - now,
                        }),
                        !Ct.aborted)
                      )
                        noteHearthDegraded(client.name, error);
                      if (
                        error instanceof Error &&
                        !(error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
                      ) {
                        let qt = error.constructor.name,
                          Qt = () => (Ct.aborted ? "other" : rY(error));
                        if (qt === "Error") {
                          let lt = describeConnectError(error, client.config);
                          throw Object.assign(
                            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                              lt,
                              lt.slice(0, 200),
                            ),
                            { mcpErrorSource: Qt() },
                          );
                        }
                        if (
                          "code" in error &&
                          (((qt === "McpError" || qt === "ProtocolError") &&
                            typeof error.code === "number") ||
                            ((qt === "SdkError" || qt === "SdkHttpError") &&
                              (typeof error.code === "number" ||
                                (typeof error.code === "string" && MCP_SDK_ERROR_CODES.has(error.code)))))
                        ) {
                          let merged = Object.assign(
                            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                              error.message,
                              `${qt} ${error.code}`,
                            ),
                            { mcpErrorSource: Qt() },
                          );
                          throw isNeedsApprovalOrExpiredSession(error) ? z9(merged) : merged;
                        }
                      }
                      throw (raiseMemoryErrorCap(error, client, re.name), error);
                    }
                },
                Kt = Bt;
              if (Qe)
                Kt = wrapCallWithDesignConsent(Bt, {
                  designSession: L.toolState.get(DesignGateState),
                  approvedConsentBit: pt?.bit ?? null,
                  consentAskReachesUser: (pt?.askReachesUser ?? !1) && canAskDesignConsent(L),
                  credentials: L.credentials,
                });
              if (re.name === GET_TASK && UBt(client)) {
                let { withTaskFilesRemembered: withTaskFilesRemembered } =
                  await import("./chunk-h33h7b0z.js");
                Kt = withTaskFilesRemembered(Kt, { client: client, args: Fe, session: L.session });
              }
              let zt = !L.agentId && L.taskRegistry !== u2 && ye.name !== getPermissionPromptToolName();
              if (mcpAutoBackgroundModule && zt) {
                let mcpAutoBackgroundMs = mcpAutoBackgroundModule.getMcpAutoBackgroundMs(client.config, {
                    isNonInteractiveSession: L.options.isNonInteractiveSession,
                  }),
                  sn =
                    mcpAutoBackgroundMs === 0 &&
                    mcpAutoBackgroundModule.isMcpCallMovableWithoutTimer(client.config, {
                      isNonInteractiveSession: L.options.isNonInteractiveSession,
                      isInnerCall: L.innerCall === !0,
                    });
                if (mcpAutoBackgroundMs > 0 || sn) {
                  let an = { becameTask: !1 };
                  if (!sn && isMcpTasksEnabled() && !u3o())
                    jt = {
                      share: an,
                      session: L.session,
                      storageV5: L.storageV5,
                      credentials: L.credentials,
                      onBackgrounded: () => {
                        gt = !0;
                      },
                    };
                  return mcpAutoBackgroundModule.callMcpToolWithAutoBackground({
                    run: Kt,
                    serverName: client.name,
                    toolName: re.name,
                    accountMemoryTool: isLiveMemoryTool(ye),
                    toolUseId: Ke,
                    parentAbortController: L.abortController,
                    taskRegistry: L.taskRegistry,
                    autoBackgroundMs: sn ? null : mcpAutoBackgroundMs,
                    storageV5: L.storageV5,
                    credentials: L.credentials,
                    hasPendingElicitation: () =>
                      Ye ||
                      ((Me.type === "connected" ? Me.transportErrorState?.pendingElicitations : void 0) ??
                        0) > 0,
                    onBackgrounded: () => {
                      gt = !0;
                    },
                    share: an,
                    foregroundCalls: L.innerCall ? void 0 : Q_e.of(L.session),
                    noticeGate: I3n({
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
                !u3o() &&
                env.CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS !== 0 &&
                (!getIsNonInteractiveSession() || env.CLAUDE_AUTO_BACKGROUND_TASKS === !0) &&
                !isPrintInputClosed()
              )
                jt = {
                  share: { becameTask: !1 },
                  session: L.session,
                  storageV5: L.storageV5,
                  credentials: L.credentials,
                  onBackgrounded: () => {
                    gt = !0;
                  },
                };
              return Kt(L.abortController.signal);
            },
          });
        if (me && (re.name === "file_upload" || re.name === "browser_batch")) {
          let Fe = !isStdioConfig(client.config) && !env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_IS_COWORK,
            L = ye.call;
          ye.call = async (mt, et, Oe, we, Ke, He) => {
            let {
                FILE_UPLOAD_MAX_TOTAL_BYTES: FILE_UPLOAD_MAX_TOTAL_BYTES,
                passThroughChromeFileUploadInput: passThroughChromeFileUploadInput,
                prepareChromeFileUploadInput: prepareChromeFileUploadInput,
              } = await import("./chunk-f11kwnvn.js"),
              Ft = Fe
                ? await passThroughChromeFileUploadInput(re.name, mt ?? {}, getToolPermissionContext(et))
                : await prepareChromeFileUploadInput(
                    re.name,
                    mt ?? {},
                    getToolPermissionContext(et),
                    isClaudeAiProxyServer(client.config)
                      ? {
                          maxTotalBytes: chromeUploadMaxBytes(re._meta, FILE_UPLOAD_MAX_TOTAL_BYTES),
                          hosted: { session: et.session, signal: et.abortController.signal },
                        }
                      : void 0,
                  );
            if (Ft.error)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                Ft.error,
                "Claude in Chrome file_upload path rejected",
              );
            return L(Ft.input ?? mt, et, Oe, we, Ke, Ft.callMeta ? { ...He, mcpCallMeta: Ft.callMeta } : He);
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
          let Fe = re._meta?.[ANTHROPIC_HOSTASKSPERUPLOADEDFILE] === !0,
            L = ye.call;
          ye.call = async (mt, et, Oe, we, Ke, He) => {
            let tt = await import("./chunk-v64arqfj.js"),
              paneFileUploadCall = await tt.paneFileUploadCall(
                mt,
                getToolPermissionContext(et),
                et.mcpRequestMeta,
                Fe,
                et.autoModeClassified === !0,
              );
            return L(
              paneFileUploadCall.input,
              { ...et, mcpRequestMeta: paneFileUploadCall.mcpRequestMeta },
              Oe,
              we,
              Ke,
              He && { ...He, mcpCallMeta: {} },
            );
          };
        }
        if (FBt(re.name)) {
          let Fe = re.name,
            validateInput = ye.validateInput;
          ye.validateInput = async (Oe, we) => {
            let Ke = validateInput ? await validateInput(Oe, we) : { result: !0 };
            if (!Ke.result) return Ke;
            let { startTaskInputRefusal: startTaskInputRefusal } = await import("./chunk-d40fm320.js"),
              tt = startTaskInputRefusal(client, Fe, Oe, ye.inputJSONSchema, we.session);
            return tt === void 0 ? Ke : { result: !1, message: tt, errorCode: 2 };
          };
          let prompt = ye.prompt;
          ye.prompt = async (Oe) => {
            let we = await prompt(Oe),
              toolPermissionContext = await Oe.getToolPermissionContext();
            if (toolPermissionContext.isRemoteMode !== !0) return we;
            let { startTaskFilesPromptNote: startTaskFilesPromptNote } = await import("./chunk-d40fm320.js"),
              tt = startTaskFilesPromptNote(client, Fe, toolPermissionContext);
            return tt === void 0
              ? we
              : `${we}

${tt}`;
          };
          let et = ye.call;
          if (
            ((ye.call = async (Oe, we, Ke, He, tt, gt) => {
              let Nt = Oe ?? {};
              if (!Array.isArray(Nt.files) || Nt.files.length === 0) return et(Oe, we, Ke, He, tt, gt);
              let {
                  prepareStartTaskFileInputs: prepareStartTaskFileInputs,
                  removeStartTaskUploadsFor: removeStartTaskUploadsFor,
                  startTaskInputRefusal: startTaskInputRefusal,
                  startTaskSendRefusal: startTaskSendRefusal,
                } = await import("./chunk-d40fm320.js"),
                toolUseId = we.toolUseId,
                at = findPendingTaskFilesForArgs(we.session, toolUseId, Nt.files);
              if (at !== void 0 && toolUseId !== void 0) {
                let We = startTaskSendRefusal(at.uploadStartedAt, Fe);
                if (We !== void 0)
                  throw (
                    await discardTaskFiles(we.session, at),
                    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      We,
                      "start_task files not sent after the approval",
                    )
                  );
                ((at.state = "sending"),
                  NBt(we.session, toolUseId, () => startTaskSendRefusal(at.uploadStartedAt, Fe)));
                try {
                  return await et(Oe, we, Ke, He, tt, gt);
                } catch (error) {
                  if (yZe(error)) ((at.state = "pending"), await discardTaskFiles(we.session, at));
                  throw error;
                } finally {
                  ($Bt(we.session, toolUseId), cYn(we.session, at));
                }
              }
              let pt = startTaskInputRefusal(client, Fe, Nt, ye.inputJSONSchema, we.session);
              if (pt !== void 0)
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  pt,
                  "start_task input refused",
                );
              let now = Date.now(),
                Lt = await prepareStartTaskFileInputs(
                  client,
                  Fe,
                  Nt,
                  getToolPermissionContext(we),
                  we.abortController.signal,
                  we.session,
                );
              if (Lt.error)
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  Lt.error,
                  "start_task file input rejected",
                );
              if (Lt.input === void 0 || toolUseId === void 0) return et(Lt.input ?? Oe, we, Ke, He, tt, gt);
              NBt(we.session, toolUseId, () => startTaskSendRefusal(now, Fe));
              try {
                return await et(Lt.input, we, Ke, He, tt, gt);
              } catch (error) {
                if (yZe(error)) await removeStartTaskUploadsFor(client, we.session, Lt.input.files);
                throw error;
              } finally {
                $Bt(we.session, toolUseId);
              }
            }),
            isToolboxMcpServer(client))
          )
            ye.askInputPreparer = async (Oe, we, Ke) => {
              if (!Array.isArray(Oe.files) || Oe.files.length === 0) return;
              let {
                  startTaskAskInputPreparer: startTaskAskInputPreparer,
                  startTaskInputRefusal: startTaskInputRefusal,
                } = await import("./chunk-d40fm320.js"),
                gt = startTaskAskInputPreparer(
                  client,
                  Fe,
                  Oe,
                  getToolPermissionContext(we),
                  we.abortController.signal,
                  we.session,
                  Ke,
                );
              return (
                gt && {
                  prepare: () => {
                    let Nt = startTaskInputRefusal(client, Fe, Oe, ye.inputJSONSchema, we.session);
                    return Nt === void 0 ? gt.prepare() : Promise.resolve({ error: Nt });
                  },
                }
              );
            };
        }
        let { validateInput: validateInput, call: ct, askInputPreparer: askInputPreparer } = ye;
        if (re._meta?.[ANTHROPIC_FILEINPUTS] !== void 0)
          wireFileInputs(
            ye,
            { client: client, name: re.name, meta: re._meta, schema: ye.inputJSONSchema },
            (Fe) => async (L, mt) =>
              (
                await callMCPTool({
                  client: await ensureConnectedClient(client, { context: "MCP tool call" }),
                  tool: L,
                  args: mt,
                  signal: Fe.abortController.signal,
                  imageLimits: imageLimitsForModel(Fe.options.mainLoopModel),
                  hasResultSizeAnnotation: !0,
                  storageV5: Fe.storageV5,
                  credentials: Fe.credentials,
                })
              ).structuredContent,
          );
        {
          let Fe = fileReferenceToolToFill(client, re.name);
          if (Fe !== void 0)
            wrapFileReferenceTool(
              ye,
              Fe,
              { validateInput: validateInput, call: ct, askInputPreparer: askInputPreparer },
              getFirstToolUseId,
              filledCallRequestMeta(client),
            );
        }
        if (ye.mcpInfo !== void 0 && fileReferenceToolForRecords(client, re.name) !== void 0)
          ye.mcpInfo = { ...ye.mcpInfo, fileReference: !0 };
        if (Se || isRunnerDynamicServer(client.config))
          artifactPermissionRulesModule()?.applyArtifactRules(client.config, ye);
        if (ze) artifactsMcpLaptopModule()?.wrapArtifactsMcpLaptopPublishing(client.config, ye);
        if (Te) claudeDocsWakeModule()?.wrapClaudeDocsCreateWake(ye);
        if (me && client.config.type !== "sdk") {
          let Fe = ye.call;
          ye.call = async (L, mt, et, Oe, we, Ke) => {
            let He = policyDeniedReason("allow_claude_browser_extension", "Claude in Chrome", "is");
            if (He !== null)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                He,
                "Claude in Chrome call refused by org policy",
              );
            return Fe(L, mt, et, Oe, we, Ke);
          };
        }
        let Vt = ye.call;
        return (
          (ye.call = async (Fe, L, mt, et, Oe, we) => {
            if (
              ((L.options.activeMcpServer = client.name),
              (L.options.activeMcpTool = re.name),
              client.config.pluginSource)
            )
              (recordPluginUsage(client.config.pluginSource),
                recordPluginActivity(client.config.pluginSource, "mcp", {
                  kind: "mcp-server",
                  name: client.name,
                }));
            let Ke = Xe();
            if (Ke) Cgr(client.name);
            let He =
              (FBt(re.name) && findPendingTaskFilesForArgs(L.session, L.toolUseId, Fe?.files) !== void 0) ||
              (re._meta?.[ANTHROPIC_FILEINPUTS] !== void 0
                ? (await import("./chunk-bk2cbdc2.js")).hasFileGrants(L.session, L.toolUseId)
                : !1);
            return Vt(
              He
                ? Fe
                : stripTrailingInvokeSuffix(
                    Fe,
                    re.name,
                    client.name,
                    Ke,
                    getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_strip_trailing_xml_tags", !1),
                    P,
                  ),
              L,
              mt,
              et,
              Oe,
              we,
            );
          }),
          ye
        );
      })
    ).filter(isIdeServer),
    mapped = H.map((re) => (Be?.tools?.[re.name] ?? re.description ?? "").length),
    reduced = mapped.reduce((re, ue) => re + ue, 0);
  if (
    (logEvent("tengu_mcp_tools_listed", {
      transportType: fromEnum(client.config.type ?? "stdio"),
      listDurationMs: Date.now() - startedAtMs,
      toolCount: filtered.length,
      alwaysLoadCount: count(filtered, (re) => re.alwaysLoad === !0),
      descriptionTotalLength: reduced,
      descriptionMaxLength: mapped.reduce((re, ue) => Math.max(re, ue), 0),
      descriptionMeanLength: mapped.length ? Math.round(reduced / mapped.length) : 0,
      descriptionOverLimitCount: count(mapped, (re) => re > Ee),
      discoverySource: fromEnum(discoverySource),
      ...M,
      mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(
        normalizeNameForMCP(client.name),
        isMcpServerLoggableInAnalytics(client.name, client.config),
      ),
    }),
    discoverySource === "live")
  )
    logFeatureOk("mcp_list_tools");
  if (isStdioConfig(client.config) && isClaudeInChromeMCPServer(client.name))
    logChromeToolsAdded(filtered.length, discoverySource);
  if (UBt(client)) {
    let { addTaskFileSaves: addTaskFileSaves } = await import("./chunk-h33h7b0z.js");
    addTaskFileSaves(filtered, {
      client: client,
      listed: ft,
      compose: (ue, ot, it, ye) =>
        buildMcpTool({
          ...vt,
          accountMemoryServer: Ot,
          effectiveMaxPermission: ye,
          listed: ue,
          call: ot,
          overrides: it,
        }),
    });
  }
  return filtered;
}
//@ chunk-8t8n4kdh.js:154333-154603 layout
async function awaitToolsListAhead(e, n) {
  let r = await n.page.then(
    (h) => ({ result: h }),
    () => {
      return;
    },
  );
  if (r === void 0) return n;
  let s = typeof r.result === "object" && r.result !== null ? officeBridgeListingState(r.result) : void 0;
  return (
    VGs(e, s === "live" ? "used" : s === "stub" ? "dropped_stub" : "dropped_unmarked"),
    s === "live" ? n : void 0
  );
}
/**
 * fetchToolsForClient：按 name+config 记忆化的 tools/list（modern 协议走 listTools 聚合，legacy 翻页），结果交给 buildMcpToolsForClient；401/403 时标记 needs-auth。
 */
//@ chunk-8t8n4kdh.js:154603-156653 layout
var fetchToolsForClient = memoizeWithLRU(
  async (client, storageV5, r) => {
    if (client.type !== "connected") return [];
    let s = identityEpoch(),
      h = beginDroppedToolsRound(client);
    try {
      if (!client.capabilities?.tools) {
        let ie = [];
        return (recordRawToolsForResult(ie, []), ie);
      }
      let now = Date.now(),
        S = Dt(client.client),
        w = hasNoTransport(S) ? void 0 : takeAheadPage(S),
        P,
        M = (ie) =>
          listAllPages_2(
            S,
            client.name,
            client.config,
            "tools/list",
            extend_44,
            (ge) => ge.tools,
            ie,
            (ge) => noteFirstPageMark(S, ge),
          ),
        j = await reportFirstToolsList(
          S,
          S.getProtocolEra?.() === "modern"
            ? listToolsModern(S, client.name, client.config)
            : w === void 0
              ? M(void 0)
              : awaitToolsListAhead(S, w).then((ie) => ((P = ie), M(ie?.page))),
          () => P?.sentAtMs,
        );
      ((client.toolsListError = void 0), (client.discoveryAuthFailure = void 0));
      let R = j;
      if (r === !0) {
        let ie = [];
        return (recordRawToolsForResult(ie, R), ie);
      }
      let ce = listToolsWithMemo(client, R, s, h, () => ({
        normalizeEnabled: shouldNormalizeRootCombinators(client.config),
        apiValidateEnabled: shouldDropInvalidToolSchemas(client.config),
      }));
      if (ce?.reuse !== void 0) return (recordRawToolsForResult(ce.reuse, R), ce.reuse);
      let Q = await buildMcpToolsForClient(client, R, now, "live", h);
      if (h.seq === h.state.started)
        ((client.toolsListError = void 0), (client.discoveryAuthFailure = void 0));
      return (recordRawToolsForResult(Q, R), settleToolListingMemo(client, ce, Q, h), Q);
    } catch (error) {
      let S = redactMcpErrorDetail(client.name, client.config, describeConnectError(error, client.config));
      if (client.config.type === "claudeai-proxy" && isListAuthError(error)) {
        if (
          (logEvent("tengu_mcp_server_needs_auth", {
            transportType: lit("claudeai-proxy"),
            cause: lit("discovery_tools_list"),
            ...mcpBaseUrlAnalytics_2(client.config, client.name),
          }),
          isCurrentIdentityEpoch(s))
        )
          setMcpAuthCacheEntry(client.name, client.config.id, void 0, storageV5);
        return (
          logFeatureSad("mcp_list_tools", "mcp_list_tools_needs_auth"),
          logMCPDebug(client.name, "tools/list 401/403 on claude.ai proxy \u2014 flagging needs-auth"),
          (client.discoveryAuthFailure = !0),
          getConnectionCache().toolLists.delete(ir(client.name, client.config)),
          []
        );
      }
      if (isListAuthError(error) && yBt(client.name, client.config)) client.discoveryAuthFailure = !0;
      let w = client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error),
        P = w
          ? "mcp_list_tools_claudeai_bearer_rejected"
          : (error instanceof ProtocolError || error instanceof SdkError) && !(error instanceof SdkHttpError)
            ? `mcp_list_tools_${LIST_FAILURE_REASONS[error.code] ?? "mcperr_other"}`
            : S.includes("timed out")
              ? "mcp_list_tools_timeout"
              : "mcp_list_tools_failed";
      if (
        (logFeatureSad("mcp_list_tools", P),
        (w ? logMCPDebug : logMCPError)(client.name, `Failed to fetch tools: ${S}`),
        (client.toolsListError = S),
        w)
      )
        client.discoveryBearerRejected = !0;
      let j = [];
      if ((ht().toolsListErrorByResult.set(j, S), !w)) {
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
      return (getConnectionCache().toolLists.delete(ir(client.name, client.config)), j);
    }
  },
  (e) => ir(e.name, e.config),
  () => getConnectionCache().toolLists,
);
/**
 * reportListFailure：列表请求失败的指标分类（needs_auth、bearer_rejected、MCP 错误码、timeout、failed）与 tengu_mcp_degraded 遥测。
 */
//@ chunk-8t8n4kdh.js:156653-157236 layout
function reportListFailure(client, error, metricName, s, degradedReason, listKind) {
  let S = describeConnectError(error, client.config),
    w = client.config.type === "claudeai-proxy" && isListAuthError(error),
    P = client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error);
  if (P) client.discoveryBearerRejected = !0;
  let M = w
    ? `${metricName}_needs_auth`
    : P
      ? `${metricName}_claudeai_bearer_rejected`
      : (error instanceof ProtocolError || error instanceof SdkError) && !(error instanceof SdkHttpError)
        ? `${metricName}_${LIST_FAILURE_REASONS[error.code] ?? "mcperr_other"}`
        : S.includes("timed out")
          ? `${metricName}_timeout`
          : `${metricName}_failed`;
  if (
    (s(M), (w || P ? logMCPDebug : logMCPError)(client.name, `Failed to fetch ${listKind}: ${S}`), !w && !P)
  )
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
/**
 * fetchResourcesForClient / fetchResourceTemplatesForClient：记忆化 resources/list 与 resources/templates/list，MethodNotFound 视为空。
 */
//@ chunk-8t8n4kdh.js:157236-158475 fingerprint = fetchResourcesForClient (0.347)
var fetchResourcesForClient = memoizeWithLRU(
    async (e) => {
      if (e.type !== "connected") return [];
      try {
        if (!e.capabilities?.resources) {
          let s = [];
          return (recordRawResourcesForResult(s, []), s);
        }
        let n = await listAllPages_2(
          Dt(e.client),
          e.name,
          e.config,
          "resources/list",
          extend_19,
          (s) => s.resources,
        );
        logFeatureOk("mcp_list_resources");
        let mapped = n.map((s) => ({ ...s, server: e.name }));
        return (recordRawResourcesForResult(mapped, n), mapped);
      } catch (error) {
        (reportListFailure(
          e,
          error,
          "mcp_list_resources",
          (s) => logFeatureSad("mcp_list_resources", s),
          lit("resources_list_failed"),
          "resources",
        ),
          getConnectionCache().resourceLists.delete(ir(e.name, e.config)));
        let r = [];
        if (error instanceof ProtocolError && error.code === ma.MethodNotFound)
          recordRawResourcesForResult(r, []);
        else ht().discoveryFetchErrors.set(r, toError(error));
        return r;
      }
    },
    (e) => ir(e.name, e.config),
    () => getConnectionCache().resourceLists,
  ),
  fetchResourceTemplatesForClient = memoizeWithLRU(
    async (e) => {
      if (e.type !== "connected") return [];
      try {
        if (!e.capabilities?.resources) return [];
        let n = await listAllPages_2(
          Dt(e.client),
          e.name,
          e.config,
          "resources/templates/list",
          extend_21,
          (r) => r.resourceTemplates,
        );
        return (
          logEvent("tengu_mcp_resource_templates_fetched", { template_count: n.length }),
          logFeatureOk("mcp_list_resource_templates"),
          n.map((r) => ({ ...r, server: e.name }))
        );
      } catch (error) {
        (getConnectionCache().resourceTemplateLists.delete(ir(e.name, e.config)),
          logMCPDebug(
            e.name,
            `Failed to fetch resource templates: ${describeConnectError(error, e.config)}`,
          ));
        let r = [];
        if (!(error instanceof ProtocolError && error.code === ma.MethodNotFound))
          ht().discoveryFetchErrors.set(r, toError(error));
        return r;
      }
    },
    (e) => ir(e.name, e.config),
    () => getConnectionCache().resourceTemplateLists,
  );
/**
 * fetchResourceTemplatesForClients：对尚无模板记录的已连接客户端并发拉资源模板。
 */
//@ chunk-8t8n4kdh.js:158475-158646 layout
function fetchResourceTemplatesForClients(e, n) {
  let r = [];
  for (let s of e) {
    if (s.type !== "connected") continue;
    if (s.name in n) continue;
    r.push(fetchResourceTemplatesForClient(s).then((h) => ({ client: s, templates: h })));
  }
  return Promise.all(r);
}
/**
 * completeResourceTemplateArgument：调用 completion/complete（ref/resource）补全资源模板参数。
 */
//@ chunk-8t8n4kdh.js:158646-159096 layout
async function completeResourceTemplateArgument(client, uri, argumentName, argumentValue, contextArguments) {
  if (!client.capabilities?.completions) return [];
  try {
    let complete = await Dt(client.client).complete({
      ref: { type: "ref/resource", uri: uri },
      argument: { name: argumentName, value: argumentValue },
      context: Object.keys(contextArguments).length > 0 ? { arguments: contextArguments } : void 0,
    });
    return (logFeatureOk("mcp_complete_resource_template"), complete.completion.values);
  } catch (error) {
    return (
      logFeatureBad("mcp_complete_resource_template", "mcp_complete_resource_template_failed"),
      logMCPDebug(
        client.name,
        `Failed to complete resource template: ${describeConnectError(error, client.config)}`,
      ),
      []
    );
  }
}
/**
 * fetchCommandsForClient：记忆化 prompts/list 并转成斜杠命令。
 */
//@ chunk-8t8n4kdh.js:159096-159657 layout
var fetchCommandsForClient = memoizeWithLRU(
  async (e) => {
    if (e.type !== "connected") return [];
    try {
      if (!e.capabilities?.prompts) {
        let s = [];
        return (recordRawCommandsForResult(s, []), s);
      }
      let n = await listAllPages_2(
        Dt(e.client),
        e.name,
        e.config,
        "prompts/list",
        extend_37,
        (s) => s.prompts,
      );
      logFeatureOk("mcp_list_prompts");
      let r = buildMcpPromptCommands(e, n);
      return (recordRawCommandsForResult(r, n), r);
    } catch (error) {
      (reportListFailure(
        e,
        error,
        "mcp_list_prompts",
        (s) => logFeatureSad("mcp_list_prompts", s),
        lit("prompts_list_failed"),
        "commands",
      ),
        getConnectionCache().commandLists.delete(ir(e.name, e.config)));
      let r = [];
      if (error instanceof ProtocolError && error.code === ma.MethodNotFound)
        recordRawCommandsForResult(r, []);
      else ht().discoveryFetchErrors.set(r, toError(error));
      return r;
    }
  },
  (e) => ir(e.name, e.config),
  () => getConnectionCache().commandLists,
);
/**
 * buildMcpPromptCommands：MCP 提示词转为 prompt 命令 mcp__<server>__<prompt>（显示为 server:prompt (MCP)），执行时按空格切参数、检查必填、getPrompt 并转换内容。
 */
//@ chunk-8t8n4kdh.js:159657-161446 fingerprint = fetchCommandsForClient (0.539)
function buildMcpPromptCommands(client, prompts) {
  let r = createStreamingListingSanitizer(),
    flattened = prompts.flatMap((M) => r(M) ?? []),
    h = prompts.length - flattened.length;
  if (h > 0) logMCPError(client.name, listingTruncatedNote("prompts", h, prompts.length));
  let config = client.config,
    S = (config.type === "http" || config.type === "sse") && isDesignMcpUrl(config.url),
    promptsToProcess = officialPluginPromptOverrides(client.config),
    mapped = flattened.map((prompt) => {
      let values = Object.values(prompt.arguments ?? {}),
        argNames = values.map((Q) => Q.name),
        ce = promptsToProcess?.prompts?.[prompt.name] ?? prompt.description;
      return {
        type: "prompt",
        name: "mcp__" + normalizeNameForMCP(client.name) + "__" + prompt.name,
        description: ce ?? "",
        hasUserSpecifiedDescription: !!ce,
        contentLength: 0,
        isEnabled: () => !0,
        isHidden: !1,
        isMcp: !0,
        mcpInfo: getMcpInfoFromConnection(client),
        progressMessage: "running",
        userFacingName() {
          return S ? prompt.name : `${client.name}:${prompt.name} (MCP)`;
        },
        aliases: S ? [`${client.name}:${prompt.name}`, `${client.name}:${prompt.name} (MCP)`] : void 0,
        argNames: argNames,
        source: "mcp",
        async getPromptForCommand(args, context) {
          let trimmed = args.trim(),
            Ie = trimmed ? trimmed.split(/\s+/) : [],
            G = hostedDesktopRefusal(client);
          if (G) throw G;
          try {
            let mapped = values.filter((Ae, yt) => Ae.required && Ie[yt] === void 0).map((Ae) => Ae.name);
            if (mapped.length > 0)
              throw Error(
                `Missing required ${plural(mapped.length, "argument")}: ${mapped.join(", ")}. Usage: /mcp__${normalizeNameForMCP(client.name)}__${prompt.name} ${argNames.join(" ")}`,
              );
            let ke = await ensureConnectedClient(client, {
                signal: context.abortController.signal,
                context: "MCP prompt command",
              }),
              result = await Dt(ke.client).getPrompt({ name: prompt.name, arguments: Yqn(argNames, Ie) }),
              ee = imageLimitsForModel(context.options.mainLoopModel),
              transformed = await Promise.all(
                result.messages.map((message) =>
                  transformResultContent(message.content, ke.name, ee, context.storageV5),
                ),
              );
            return (
              logFeatureOk("mcp_get_prompt"),
              Uv(buildMcpToolName(client.name, prompt.name)),
              transformed.flat()
            );
          } catch (error) {
            if (!isAbortError(error))
              if (client.config.type === "claudeai-proxy" && isClaudeAiBearerRejectedError(error))
                (logFeatureSad("mcp_get_prompt", "mcp_get_prompt_claudeai_bearer_rejected"),
                  logMCPDebug(
                    client.name,
                    `Error running command '${prompt.name}': ${describeConnectError(error, client.config)}`,
                  ));
              else
                (logFeatureBad("mcp_get_prompt", "mcp_get_prompt_failed"),
                  logMCPError(
                    client.name,
                    `Error running command '${prompt.name}': ${describeConnectError(error, client.config)}`,
                  ));
            throw error;
          }
        },
      };
    });
  return checkCommandListable(mapped, (M) =>
    logMCPDebug(
      client.name,
      `Prompt '${M.name}' not listed: the server name ${RESERVED_SKILL_NAMESPACE_REASON}. Rename the server in your MCP configuration to list its prompts.`,
    ),
  );
}
/**
 * callIdeTool：直接调用 IDE MCP 工具并返回 content。
 */
//@ chunk-8t8n4kdh.js:161446-161608 layout
async function callIdeTool(e, n, r) {
  return (
    await callMCPTool({
      client: r,
      tool: e,
      args: n,
      signal: createAbortController().signal,
      imageLimits: IMAGE_LIMITS,
      idleTimeoutMs: 0,
      storageV5: void 0,
      credentials: void 0,
    })
  ).content;
}
/**
 * identityChangedReconnectResult：账号身份在重连过程中变化时的 failed 结果（errorCode IDENTITY_CHANGED）。
 */
//@ chunk-8t8n4kdh.js:161608-161866 layout
function identityChangedReconnectResult(e, n) {
  return (
    logFeatureSad("mcp_reconnect", "mcp_reconnect_identity_changed"),
    {
      client: {
        name: e,
        type: "failed",
        config: n,
        error: "Reconnect cancelled: the account changed while connecting. Choose Reconnect again.",
        errorCode: "IDENTITY_CHANGED",
      },
      tools: [],
      commands: [],
    }
  );
}
/**
 * reconnectMcpServer：必要时先清 OAuth 发现状态，再调用 reconnectMcpServerImpl。
 */
//@ chunk-8t8n4kdh.js:161866-162003 layout
async function reconnectMcpServer(e, n, r, s) {
  if (!IM()) return reconnectMcpServerImpl_2(e, n, r, s);
  let h = identityEpoch();
  if ((await flushDiscoveryCache(So(e, n)), isRemoteMcpTransport(n) && identityEpoch() !== h))
    return identityChangedReconnectResult(e, n);
  return reconnectMcpServerImpl_2(e, n, r, s);
}
/**
 * reconnectMcpServerImpl：清缓存后重新 connectToServer 并拉取工具/命令/资源；needs-auth 时清缓存再试一次；身份变化返回 IDENTITY_CHANGED。
 */
//@ chunk-8t8n4kdh.js:162003-163934 fingerprint = reconnectMcpServerImpl (0.346)
async function reconnectMcpServerImpl_2(name, config, storageV5, credentials, options = {}) {
  let y = identityEpoch(),
    S = isRemoteMcpTransport(config),
    w = () => S && identityEpoch() !== y,
    P = () => identityChangedReconnectResult(name, config);
  try {
    clearKeychainCache();
    let M = options.keepConnectionInUse ? {} : void 0;
    if ((await (M === void 0 ? clearServerCache(name, config) : clearServerCache(name, config, M)), w()))
      return P();
    let j = connectToServer(name, config, void 0, storageV5, credentials),
      R = await j;
    if (R.type === "needs-auth") {
      if ((logMCPDebug(name, "Reconnect returned 'needs-auth'; retrying once after cache clear"), w()))
        return P();
      let nt = ir(name, config);
      if (getConnectionCache().connections.get(nt) === j) getConnectionCache().connections.delete(nt);
      R = await connectToServer(name, config, void 0, storageV5, credentials);
    }
    if (w()) {
      if (R.type === "connected") await detachAndCloseConnection(R);
      return P();
    }
    if (R.type !== "connected")
      return (
        logFeatureSad("mcp_reconnect", "mcp_reconnect_not_connected"),
        applyMcpServerConfig(config, { client: R, tools: [], commands: [] })
      );
    if (config.type !== "claudeai-proxy") clearMcpAuthCacheEntry(name, storageV5);
    if (config.type === "http" || config.type === "sse") await clearMcpOAuthStubIfTokenless_2(name, config);
    clearDiscoveryPathMemo(name);
    let ce;
    if (fd()) ce = await oq(name, config);
    if (w()) return (await detachAndCloseConnection(R), P());
    let supportsResources = !!R.capabilities?.resources,
      [ie, ge, Ie, G] = await Promise.all([
        fetchToolsForClient(R, storageV5),
        fetchCommandsForClient(R),
        Promise.resolve([]),
        supportsResources ? fetchResourcesForClient(R) : Promise.resolve([]),
      ]);
    if (w()) return (await detachAndCloseConnection(R), P());
    if (R.discoveryAuthFailure)
      return (
        logFeatureSad("mcp_reconnect", "mcp_reconnect_needs_auth_discovery"),
        { client: { name: name, type: "needs-auth", config: config }, tools: [], commands: [] }
      );
    if (config.type === "claudeai-proxy" && !R.discoveryBearerRejected)
      clearMcpAuthCacheEntry(name, storageV5);
    if (config.type === "claudeai-proxy" && !R.toolsListError && !R.discoveryBearerRejected)
      recordClaudeAiMcpConnected(name, storageV5);
    persistLiveListing(R, { tools: ie, commands: ge, resources: G, identityEpoch: y, grantLeg: ce });
    let commands = [...ge, ...Ie],
      resourceTools = [];
    if (supportsResources) {
      if (
        ![ListMcpResourcesTool, ReadMcpResourceTool].some((tool) =>
          ie.some((he) => toolMatchesName(he, tool.name)),
        )
      )
        resourceTools.push(ListMcpResourcesTool, ReadMcpResourceTool, H5);
    }
    if (R.discoveryBearerRejected) logFeatureSad("mcp_reconnect", "mcp_reconnect_bearer_rejected");
    else if (R.toolsListError) logFeatureSad("mcp_reconnect", "mcp_reconnect_tools_list_failed");
    else logFeatureOk("mcp_reconnect");
    return applyMcpServerConfig(config, {
      client: R,
      tools: [...ie, ...resourceTools],
      commands: commands,
      resources: G.length > 0 ? G : void 0,
      resourceTemplates: [],
      ...(M?.connection !== void 0 && R === M.connection && { keptConnectionInUse: !0 }),
    });
  } catch (error) {
    return (
      logFeatureBad("mcp_reconnect", "mcp_reconnect_failed"),
      logMCPError(name, `Error during reconnection: ${describeConnectError(error, config)}`),
      { client: { name: name, type: "failed", config: config }, tools: [], commands: [] }
    );
  }
}
//@ chunk-8t8n4kdh.js:163934-163989 layout = processBatched (1)
async function processBatched_2(items, concurrency, processor) {
  await pMap(items, processor, { concurrency: concurrency });
}
/**
 * countUnsettledByDeadline：等待一组 promise 到期限，返回仍未完成的个数。
 */
//@ chunk-8t8n4kdh.js:163989-164254 layout
async function countUnsettledByDeadline(e, n) {
  if (e.length === 0) return 0;
  let r,
    promise = new Promise((h) => {
      r = setTimeout((y) => y("deadline"), n, h);
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
/**
 * getMcpToolsCommandsAndResources：批量连接所有服务器（本地按 MCP_SERVER_CONNECTION_BATCH_SIZE 默认 3、远程按 MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE 默认 20 并发），逐个检查禁用、策略、needs-auth 缓存、插件失败缓存与发现缓存（fresh/stale 直接出结果，stale 后台刷新），再连接并拉取工具/命令/资源，结果通过回调逐个上报。
 */
//@ chunk-8t8n4kdh.js:164254-171714 fingerprint = getMcpToolsCommandsAndResources (0.46)
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
  let P = identityEpoch(),
    M = (q) => identityEpoch() !== P && isRemoteMcpTransport(q),
    emitResult = (q) => {
      if (!M(q.client.config)) onConnectionAttempt({ ...q, attemptEpoch: P });
    };
  fn();
  let R = !1,
    allConfigEntries = Object.entries(mcpConfigs ?? (await getAllMcpConfigs()).servers),
    enabledEntries = [];
  for (let entry of allConfigEntries)
    if (isMcpServerDisabled(entry[0]))
      emitResult({ client: { name: entry[0], type: "disabled", config: entry[1] }, tools: [], commands: [] });
    else enabledEntries.push(entry);
  registerConfiguredMcpServers(Object.fromEntries(enabledEntries));
  let totalServers = enabledEntries.length,
    stdioCount = count(enabledEntries, ([q, H]) => H.type === "stdio"),
    sseCount = count(enabledEntries, ([q, H]) => H.type === "sse"),
    httpCount = count(enabledEntries, ([q, H]) => H.type === "http"),
    sseIdeCount = count(enabledEntries, ([q, H]) => H.type === "sse-ide"),
    wsIdeCount = count(enabledEntries, ([q, H]) => H.type === "ws-ide"),
    localServers = enabledEntries.filter(([q, H]) => isLocalMcpServer(H)),
    remoteServers = enabledEntries.filter(([q, H]) => !isLocalMcpServer(H)),
    serverStats = {
      totalServers: totalServers,
      stdioCount: stdioCount,
      sseCount: sseCount,
      httpCount: httpCount,
      sseIdeCount: sseIdeCount,
      wsIdeCount: wsIdeCount,
    },
    Ae = [],
    connectOne = async ([q, H]) => {
      try {
        if (isCleanupStarted()) {
          logMCPDebug(q, "Skipping connection (Claude Code is shutting down)");
          return;
        }
        if (isMcpServerDisabled(q)) {
          emitResult({ client: { name: q, type: "disabled", config: H }, tools: [], commands: [] });
          return;
        }
        if (isMcpServerBlockedAtConnectTime(q, H)) {
          (logMCPDebug(q, "Skipping connection (blocked by managed policy)"),
            emitResult({
              client: {
                name: q,
                type: "failed",
                config: H,
                error: mcpGateError("managed-policy", q, H).error,
              },
              tools: [],
              commands: [],
            }));
          return;
        }
        if (isIneligibleClaudeAiProxy(H)) {
          emitResult({
            client: { name: q, type: "needs-auth", config: H },
            tools: mcpAuthToolsFor(q, H),
            commands: [],
          });
          return;
        }
        if (
          (H.type === "claudeai-proxy" || H.type === "http" || H.type === "sse") &&
          !Zl(H) &&
          ((await isMcpAuthCached(q, H, storageV5)) ||
            ((H.type === "http" || H.type === "sse") &&
              shouldTryTokenless(
                q,
                H,
                await readMcpOAuthStore({ serverName: q, serverConfig: H, challenged: !1 }),
              )))
        ) {
          if (H.type !== "claudeai-proxy" && H.pluginSource === void 0)
            logMCPDebug(q, "Skipping connection (cached needs-auth)");
          emitResult({
            client: { name: q, type: "needs-auth", config: H, ...(await registrationStatusFields(q, H)) },
            tools: mcpAuthToolsFor(q, H),
            commands: [],
          });
          return;
        }
        if (
          (H.type === "stdio" || H.type === void 0) &&
          H.pluginSource !== void 0 &&
          (await isMcpAuthCached(q, H, storageV5))
        ) {
          emitResult({
            client: {
              name: q,
              type: "failed",
              config: H,
              error:
                "Skipping connection (recent failure cached; retries automatically in 15 min, or edit the plugin config to retry now)",
            },
            tools: [],
            commands: [],
          });
          return;
        }
        let Xe = await hasLiveConnection(q, H),
          Ee = preloadedTools !== void 0 && Object.hasOwn(preloadedTools, q) ? preloadedTools[q] : void 0;
        if (Ee !== void 0 && !Xe) {
          let { client: client, tools: tools } = await buildCachedClientTools({
            name: q,
            config: H,
            capabilities: { tools: {} },
            serverInfo: void 0,
            savedAt: Date.now(),
            tools: Ee,
          });
          emitResult({ client: client, tools: tools, commands: [] });
          return;
        }
        let Tt = Xe ? { kind: "miss", reason: "live-connection" } : await readDiscoveryCache(q, H),
          Qe = applyCapabilityServeTimeMiss(Tt);
        if (Qe.kind === "fresh" || Qe.kind === "stale") {
          let { entry: entry, ageMs: ageMs } = Qe,
            { client: client, tools: tools } = await buildCachedClientTools({
              name: q,
              config: H,
              capabilities: entry.capabilities,
              serverInfo: entry.serverInfo,
              savedAt: entry.savedAt,
              tools: entry.tools,
            }),
            Ot = buildMcpPromptCommands(client, entry.commands),
            mapped = entry.resources.map((resource) => ({ ...resource, server: q })),
            mapped_2 = (entry.templates ?? []).map((De) => ({ ...De, server: q })),
            Te = !!entry.capabilities.resources || mapped.length > 0,
            Ve = [];
          if (Te && !R) ((R = !0), Ve.push(ListMcpResourcesTool, ReadMcpResourceTool, H5));
          if (
            (logEvent("tengu_mcp_discovery_source", {
              source: lit(Qe.kind === "fresh" ? "cache_fresh" : "cache_stale"),
              transportType: fromEnum(H.type ?? "stdio"),
              entryAgeMs: ageMs,
              ...mcpBaseUrlAnalytics_2(H, q),
            }),
            logFeatureOk("mcp_discovery_cache"),
            getConnectionCache().settledCachedDialFailures.delete(ir(q, H)),
            getConnectionCache().refusedCachedRows.delete(ir(q, H)),
            emitResult({
              client: client,
              tools: [...tools, ...Ve],
              commands: Ot,
              resources: mapped.length > 0 ? mapped : void 0,
              resourceTemplates: mapped_2.length > 0 ? mapped_2 : void 0,
            }),
            Qe.kind === "stale")
          )
            (async () => {
              let De = await oq(q, H),
                Le,
                re = async () => {
                  if ((Le !== void 0 && Xt(Le)) || identityEpoch() !== P) return;
                  (logFeatureSad("mcp_discovery_cache", "strike"),
                    await recordRefreshFailureStrike(q, H, { identityEpoch: P, grantLeg: De }));
                },
                ue = await acquireDiscoveryRefreshLock(q, H);
              if (!ue) return;
              if (isMcpServerDisabled(q)) {
                (await ue().catch(() => {}), refuseCachedRow(q, H, "disabled"));
                return;
              }
              if (isMcpServerBlockedAtConnectTime(q, H)) {
                (await ue().catch(() => {}), refuseCachedRow(q, H, "policy"));
                return;
              }
              let ot = (be) => {
                  if (!(!(Le !== void 0 && Xt(Le)) && identityEpoch() === P)) return;
                  if (be.type !== "needs-auth") getConnectionCache().connections.delete(ir(q, H));
                  let cachedFirstDialArmsRan = ht().cachedFirstDialArmsRan;
                  if (cachedFirstDialArmsRan.has(be)) return;
                  if ((cachedFirstDialArmsRan.add(be), be.type === "needs-auth")) pr(q, H);
                  else if (be.type === "failed") recordCachedDialFailure(be, !1);
                },
                it = (be) => {
                  let cachedFirstDialArmsRan = ht().cachedFirstDialArmsRan;
                  if (cachedFirstDialArmsRan.has(be)) return;
                  (cachedFirstDialArmsRan.add(be), pr(q, H));
                },
                ye = !1;
              try {
                ((Le = connectToServer(q, H, serverStats, storageV5, s)),
                  ht().swrRefreshDialsInFlight.add(Le),
                  Le.then(
                    () => {
                      ye = !0;
                    },
                    () => {
                      ye = !0;
                    },
                  ));
                let be = await boundDial(Le, { serverName: q, context: "MCP discovery-cache stale refresh" });
                if (be.type !== "connected") {
                  (ot(be), await re());
                  return;
                }
                if (Xt(Le) || identityEpoch() !== P) return;
                if (
                  entry.negotiatedEra !== void 0 &&
                  be.protocolEra !== void 0 &&
                  be.protocolEra !== entry.negotiatedEra
                ) {
                  if (
                    (logMCPDebug(
                      q,
                      "Discovery cache entry dropped: server negotiated a different protocol era on revalidation",
                    ),
                    await So(q, H).catch(() => {}),
                    !Xt(Le) && identityEpoch() === P)
                  )
                    it(be);
                  return;
                }
                let ct = !!be.capabilities?.resources;
                clearDiscoveryPathMemo(q);
                let $t = await oq(q, H);
                if (Xt(Le) || identityEpoch() !== P) return;
                let [Vt, Fe, L, mt] = await Promise.all([
                    fetchToolsForClient(be, storageV5),
                    fetchCommandsForClient(be),
                    fetchResourcesForClient(be),
                    ct && cZe(H) ? fetchResourceTemplatesForClient(be) : Promise.resolve([]),
                  ]),
                  et = fr(mt) === void 0 ? mt : void 0;
                if (Xt(Le) || Tn(Le, q, H) || identityEpoch() !== P) return;
                if (!isMcpServerDisabled(q) && !isMcpServerBlockedAtConnectTime(q, H)) {
                  if (
                    !(await persistRawDiscoveryIfComplete(be, {
                      tools: Vt,
                      commands: Fe,
                      resources: L,
                      templates: et,
                      identityEpoch: P,
                      grantLeg: $t,
                    }))
                  )
                    await re();
                }
                if (!(Le !== void 0 && Xt(Le)) && !(Le !== void 0 && Tn(Le, q, H)) && identityEpoch() === P)
                  it(be);
              } catch {
                if (Le !== void 0 && !ye) {
                  let be = Le;
                  be.then(
                    (ct) => {
                      if (ct.type !== "connected") (ot(ct), re().catch(() => {}));
                      else
                        (ht().swrRefreshDialsInFlight.delete(be),
                          (entry.negotiatedEra !== void 0 &&
                          ct.protocolEra !== void 0 &&
                          ct.protocolEra !== entry.negotiatedEra
                            ? So(q, H).catch(() => {})
                            : Promise.resolve()
                          ).then(() => {
                            if (!Xt(be) && identityEpoch() === P) it(ct);
                          }));
                    },
                    () => {
                      re().catch(() => {});
                    },
                  );
                } else await re();
              } finally {
                if (Le !== void 0 && ye) ht().swrRefreshDialsInFlight.delete(Le);
                await ue().catch(() => {});
              }
            })();
          return;
        }
        let Be = connectToServer(q, H, serverStats, storageV5, s, void 0, w),
          xe = await Be,
          wt = connectToServer.cache?.get?.(ir(q, H)) === Be;
        if (fd() && isDiscoveryCacheMissRecoverable(Qe))
          logEvent("tengu_mcp_discovery_source", {
            source: lit(discoverySourceLabel(Qe)),
            transportType: fromEnum(H.type ?? "stdio"),
            ...mcpBaseUrlAnalytics_2(H, q),
          });
        if (Xt(Be)) return;
        if (M(H)) {
          if (xe.type === "connected" && Tn(Be, q, H)) detachAndCloseConnection(xe);
          return;
        }
        if (xe.type !== "connected") {
          emitResult(
            applyMcpServerConfig(H, {
              client: xe,
              tools: xe.type === "needs-auth" ? mcpAuthToolsFor(q, H) : [],
              commands: [],
            }),
          );
          return;
        }
        if (((xe.discoveryBearerRejected = void 0), H.type !== "claudeai-proxy"))
          clearMcpAuthCacheEntry(q, storageV5);
        if (H.type === "http" || H.type === "sse") await clearMcpOAuthStubIfTokenless_2(q, H);
        Ae.push(
          (async () => {
            let Se = !1;
            try {
              let supportsResources = !!xe.capabilities?.resources;
              clearDiscoveryPathMemo(q);
              let At = await oq(q, H);
              if (fd() && (Xt(Be) || M(H))) {
                if (!Xt(Be) && Tn(Be, q, H)) detachAndCloseConnection(xe);
                return;
              }
              let results = Promise.all([
                  fetchToolsForClient(xe, storageV5, S),
                  fetchCommandsForClient(xe),
                  Promise.resolve([]),
                ]),
                Ot =
                  y === !0 &&
                  (H.type === "claudeai-proxy"
                    ? !!xe.capabilities?.tools || !!xe.capabilities?.prompts
                    : H.type === "http" && isSameOriginAsCcr(H.url) && !isDiscoveryCacheEligible(H)),
                results_2 = Promise.all([
                  supportsResources && !Ot ? fetchResourcesForClient(xe) : Promise.resolve([]),
                  supportsResources && cZe(xe.config)
                    ? fetchResourceTemplatesForClient(xe)
                    : Promise.resolve([]),
                ]),
                me = y === !0 && supportsResources && (H.type === "http" || H.type === "sse") && !fd();
              if (me) results_2.catch(() => {});
              let [[Te, Ve, De], Le] = await Promise.all([results, me ? void 0 : results_2]);
              if (M(H)) {
                if (Tn(Be, q, H)) detachAndCloseConnection(xe);
                return;
              }
              if (fd() && Xt(Be)) return;
              if (fd() && wt && Tn(Be, q, H)) {
                if (connectToServer.cache?.get?.(ir(q, H)) === void 0 && Dt(xe.client).onclose !== void 0)
                  (detachAndCloseConnection(xe),
                    emitResult({
                      client: {
                        name: q,
                        type: "failed",
                        config: H,
                        error: "Connection closed during discovery",
                        errorCode: "ConnectionClosed",
                      },
                      tools: [],
                      commands: [],
                    }));
                return;
              }
              if (xe.discoveryAuthFailure) {
                emitResult({
                  client: { name: q, type: "needs-auth", config: H },
                  tools: mcpAuthToolsFor(q, H),
                  commands: [],
                });
                return;
              }
              if (H.type === "claudeai-proxy" && !xe.discoveryBearerRejected)
                clearMcpAuthCacheEntry(q, storageV5);
              if (H.type === "claudeai-proxy" && !xe.toolsListError && !xe.discoveryBearerRejected)
                recordClaudeAiMcpConnected(q, storageV5);
              let commands = [...Ve, ...De],
                ue = ($t) => {
                  let Vt = [];
                  if (supportsResources && !R)
                    ((R = !0), Vt.push(ListMcpResourcesTool, ReadMcpResourceTool, H5));
                  emitResult(
                    applyMcpServerConfig(H, {
                      client: xe,
                      tools: [...Te, ...Vt],
                      commands: commands,
                      resources: $t.length > 0 ? $t : void 0,
                      resourceTemplates: void 0,
                    }),
                  );
                };
              if (me) (ue([]), (Se = !0));
              let [ot, it] = Le ?? (await results_2);
              if (!supportsResources) recordRawResourcesForResult(ot, []);
              let ye = fr(it) === void 0 ? it : void 0,
                ct =
                  !fd() ||
                  Xt(Be) ||
                  Tn(Be, q, H) ||
                  identityEpoch() !== P ||
                  isMcpServerDisabled(q) ||
                  isMcpServerBlockedAtConnectTime(q, H)
                    ? void 0
                    : persistRawDiscoveryIfComplete(xe, {
                        tools: Te,
                        commands: Ve,
                        resources: ot,
                        templates: ye,
                        identityEpoch: P,
                        grantLeg: At,
                      });
              if (!me) ue(ot);
              await ct;
            } catch (error) {
              if (
                (logMCPError(q, `Error fetching tools/commands/resources: ${describeConnectError(error, H)}`),
                Se)
              )
                return;
              emitResult({ client: { name: q, type: "failed", config: H }, tools: [], commands: [] });
            }
          })(),
        );
      } catch (error) {
        (logMCPError(q, `Error fetching tools/commands/resources: ${describeConnectError(error, H)}`),
          emitResult({ client: { name: q, type: "failed", config: H }, tools: [], commands: [] }));
      }
    };
  (await Promise.all([
    processBatched_2(localServers, getMcpServerConnectionBatchSize(), connectOne),
    processBatched_2(remoteServers, getRemoteMcpServerConnectionBatchSize(), connectOne),
  ]),
    await Promise.all(Ae));
}
/**
 * prefetchAllMcpResources：非交互模式下一次性连接全部服务器并收集 clients/tools/commands。
 */
//@ chunk-8t8n4kdh.js:171714-172380 fingerprint = prefetchAllMcpResources (1)
function prefetchAllMcpResources(e, n, r) {
  return new Promise((resolve) => {
    let h = 0,
      y = 0;
    if (((h = Object.keys(e).length), h === 0)) {
      resolve({ clients: [], tools: [], commands: [] });
      return;
    }
    let S = [],
      w = [],
      P = [],
      M = !1,
      j = () => {
        if (M) return;
        M = !0;
        let commandsMetadataLength = P.reduce((sum, command) => {
          let commandMetadataLength =
            command.name.length + (command.description ?? "").length + (command.argumentHint ?? "").length;
          return sum + commandMetadataLength;
        }, 0);
        (logEvent("tengu_mcp_tools_commands_loaded", {
          tools_count: w.length,
          commands_count: P.length,
          commands_metadata_length: commandsMetadataLength,
        }),
          resolve({ clients: S, tools: w, commands: P }));
      };
    getMcpToolsCommandsAndResources_2(
      (error) => {
        if ((S.push(error.client), w.push(...error.tools), P.push(...error.commands), y++, y >= h)) j();
      },
      e,
      n,
      r,
    )
      .then(j)
      .catch((R) => {
        (logMCPError("prefetchAllMcpResources", `Failed to get MCP resources: ${errorMessage(R)}`),
          resolve({ clients: [], tools: [], commands: [] }));
      });
  });
}
/**
 * transformResultContent：把 MCP 内容块转成 API 内容：text、image（压缩/尺寸限制）、audio、resource（文本或 blob 落盘）、resource_link。
 */
//@ chunk-8t8n4kdh.js:172380-173380 fingerprint = transformResultContent (0.81)
async function transformResultContent(resultContent, serverName, r, s, h = !1) {
  switch (resultContent.type) {
    case "text": {
      let y = { type: "text", text: resultContent.text };
      if (h) {
        let _meta = resultContent._meta;
        if (_meta) y._meta = _meta;
      }
      return [y];
    }
    case "audio": {
      let y = resultContent;
      return await persistBlobToTextBlock_2(
        Buffer.from(y.data, "base64"),
        y.mimeType,
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
          r,
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
      let resource = resultContent.resource,
        prefix = `[Resource from ${serverName} at ${resource.uri}] `;
      if ("text" in resource) return [{ type: "text", text: `${prefix}${resource.text}` }];
      else if ("blob" in resource)
        if (normalizeImageMimeType(resource.mimeType)) {
          let P = await contentContainsImages(
              Buffer.from(resource.blob, "base64"),
              resource.mimeType,
              serverName,
              r,
              s,
            ),
            M = [];
          if (prefix) M.push({ type: "text", text: prefix });
          return (M.push(...P), M);
        } else {
          let imageBuffer = Buffer.from(resource.blob, "base64"),
            M = toStoredMcpContent(imageBuffer, resource.mimeType, serverName);
          if (M) return [M];
          return await persistBlobToTextBlock_2(imageBuffer, resource.mimeType, serverName, prefix, s);
        }
      return [];
    }
    case "resource_link": {
      let y = resultContent,
        text = `[Resource link: ${y.name}] ${y.uri}`;
      if (y.description) text += ` (${y.description})`;
      return [{ type: "text", text: text }];
    }
    default:
      return [];
  }
}
//@ chunk-8t8n4kdh.js:173380-173476 layout
function qi(e) {
  return `mcp-${normalizeNameForMCP(e)}-blob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
//@ chunk-8t8n4kdh.js:173476-174068 file-local
async function contentContainsImages(e, n, r, s, h) {
  if (dy() === void 0 && addToHistory_2()) {
    logFeatureSad("mcp_image_result_file", "persistence_off");
    let { block: block } = await maybeResizeAndDownsampleImageBlock({ data: e, mediaType: n, limits: s });
    return [block];
  }
  let [{ block: y, dimensions: S }, w] = await Promise.all([
    maybeResizeAndDownsampleImageBlock({ data: e, mediaType: n, limits: s }),
    persistBinaryContent(e, Ph(e) ?? n, qi(r), void 0, h).catch(
      (block) => (logError(block), { error: "not saved" }),
    ),
  ]);
  if ("error" in w) return (logFeatureSad("mcp_image_result_file", "not_saved"), [y]);
  logFeatureOk("mcp_image_result_file");
  let M = (y.type === "image" ? null : await dy()?.readPicture?.(w.filepath, e)) ?? {
      block: y,
      dimensions: S,
    },
    j = createImageMetadataText(M.dimensions ?? {}, w.filepath);
  return j === null ? [M.block] : [M.block, { type: "text", text: j }];
}
/**
 * persistBlobToTextBlock：二进制资源落盘后返回说明文本块。
 */
//@ chunk-8t8n4kdh.js:174129-174452 fingerprint = persistBlobToTextBlock (0.744)
async function persistBlobToTextBlock_2(e, n, r, s, h) {
  let y = await persistBinaryContent(e, n, qi(r), void 0, h);
  if ("error" in y) {
    if (dy() !== void 0) return [{ type: "text", text: binaryNotSavedNotice(n, e.length) }];
    return [
      {
        type: "text",
        text: `${s}Binary content (${n || "unknown type"}, ${e.length} bytes) could not be saved to disk: ${y.error}`,
      },
    ];
  }
  return [{ type: "text", text: getBinaryBlobSavedMessage(y.filepath, n, y.size, s) }];
}
/**
 * inferCompactSchema：从 JSON 值推断紧凑的结构描述（深度 2），用于大结果说明。
 */
//@ chunk-8t8n4kdh.js:174452-174771 fingerprint = inferCompactSchema (1)
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
        .map(([y, S]) => `${y}: ${inferCompactSchema(S, depth - 1)}`),
      suffix = Object.keys(value).length > 10 ? ", ..." : "";
    return `{${props.join(", ")}${suffix}}`;
  }
  return typeof value;
}
//@ chunk-8t8n4kdh.js:174771-174915 layout
async function transformContentArray(e, n, r, s) {
  let flat = (await Promise.all(e.map((y) => transformResultContent(y, n, r, s, !0)))).flat();
  return { content: flat, type: "contentArray", schema: inferCompactSchema(stripTextBlockMeta(flat)) };
}
/**
 * transformMCPResult：把 callTool 结果分为 toolResult / structuredContent / contentArray 三类并转换内容。
 */
//@ chunk-8t8n4kdh.js:174915-175928 fingerprint = transformMCPResult (0.902)
async function transformMCPResult(e, n, r, s, h) {
  if (e && typeof e === "object") {
    if ("toolResult" in e) return { content: String(e.toolResult), type: "toolResult" };
    if ("structuredContent" in e && e.structuredContent !== void 0) {
      if ("content" in e && Array.isArray(e.content)) {
        let M = await contentOverStructuredResult(e.content, (j) => transformContentArray(j, r, s, h));
        if (M !== void 0) return M;
      }
      let S = base64URLEncode(e.structuredContent),
        w = S ?? jsonStringify(e.structuredContent),
        P = S === void 0 ? inferCompactSchema(e.structuredContent) : void 0;
      if ("content" in e && Array.isArray(e.content)) {
        let filtered = e.content.filter(
          (j) => j && typeof j === "object" && "type" in j && j.type !== "text",
        );
        if (filtered.length > 0) {
          let transformedContent = (
            await Promise.all(filtered.map((item) => transformResultContent(item, r, s, h, !0)))
          ).flat();
          if (transformedContent.length > 0) {
            let R = [...transformedContent, { type: "text", text: w }];
            return { content: R, type: "contentArray", schema: inferCompactSchema(stripTextBlockMeta(R)) };
          }
        }
      }
      return { content: w, type: "structuredContent", schema: P };
    }
    if ("content" in e && Array.isArray(e.content)) return transformContentArray(e.content, r, s, h);
  }
  let errorMessage = `MCP server "${r}" tool "${n}": unexpected response format`;
  throw (
    logMCPError(r, errorMessage),
    Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        errorMessage,
        "MCP tool unexpected response format",
      ),
      { mcpErrorSource: "downstream_error" },
    )
  );
}
//@ chunk-8t8n4kdh.js:175928-176037 layout = isMedia (1)
function isMedia(block) {
  if (!block || typeof block === "string") return !1;
  return block.some((n) => n.type === "image" || n.type === "document");
}
/**
 * processMCPResult：处理工具结果：超过 MCP 输出上限时（ENABLE_MCP_LARGE_OUTPUT_FILES 未关闭且不含图片）把全文写入 tool-results 文件并返回 getLargeOutputInstructions 说明，否则截断；记录 tengu_mcp_large_result_handled。
 */
//@ chunk-8t8n4kdh.js:176037-178083 fingerprint = processMCPResult (0.755)
async function processMCPResult(e, n, r, s, h, y, S, w) {
  if (
    w &&
    e !== null &&
    typeof e === "object" &&
    !("toolResult" in e) &&
    "content" in e &&
    Array.isArray(e.content)
  )
    return e.content;
  let P = await transformMCPResult(e, n, r, s, y),
    { type: M, schema: schema } = P,
    R = dropExtraDocumentBlocks(P.content);
  if (r === "ide") return R;
  if (w || (h && !isMedia(R))) return R;
  if (!(await mcpContentNeedsTruncation(R, S))) return R;
  let sizeEstimateTokens = getContentSizeEstimate(R);
  if (env.ENABLE_MCP_LARGE_OUTPUT_FILES === !1)
    return (
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("env_disabled"),
        sizeEstimateTokens: sizeEstimateTokens,
      }),
      await truncateMcpContentIfNeeded(R, S)
    );
  if (!R) return R;
  if (isMedia(R))
    return (
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("contains_images"),
        sizeEstimateTokens: sizeEstimateTokens,
      }),
      await truncateMcpContentIfNeeded(R, S)
    );
  let timestamp = Date.now(),
    persistId = `mcp-${normalizeNameForMCP(r)}-${normalizeNameForMCP(n)}-${timestamp}`,
    ge = stripTextBlockMeta(R),
    Ie =
      useSubagentTruncationPrompt() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_singleton_unwrap", !0),
    G = Array.isArray(ge) ? ge.length : void 0,
    Pe =
      Ie &&
      Array.isArray(ge) &&
      ge.length === 1 &&
      ge[0]?.type === "text" &&
      !("annotations" in ge[0]) &&
      !("_meta" in ge[0])
        ? ge[0].text
        : void 0,
    ke = typeof ge === "string" ? ge : (Pe ?? jsonStringify(ge, null, 2)),
    nt = M === "toolResult" || Pe !== void 0,
    ee = nt ? "text" : "json",
    he;
  if (nt) {
    let parts = ke.split(`
`);
    if (parts.length > 1 && parts.at(-1) === "") parts.pop();
    let H = 0;
    for (let Xe of parts) if (Xe.length > H) H = Xe.length;
    he = { count: parts.length, maxLen: H };
  }
  let Ae = await persistToolResult(ke, persistId, toolResultsDir(), y);
  if (isPersistError(Ae)) {
    if (dy() !== void 0)
      return (
        logEvent("tengu_mcp_large_result_handled", {
          outcome: lit("truncated"),
          reason: lit("not_stored"),
          sizeEstimateTokens: sizeEstimateTokens,
        }),
        await truncateMcpContent(R)
      );
    let contentLength = ke.length;
    return (
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("persist_failed"),
        sizeEstimateTokens: sizeEstimateTokens,
      }),
      `Error: result (${contentLength.toLocaleString()} characters) exceeds maximum allowed tokens. Failed to save output to file: ${Ae.error}. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data.`
    );
  }
  logEvent("tengu_mcp_large_result_handled", {
    outcome: lit("persisted"),
    reason: lit("file_saved"),
    sizeEstimateTokens: sizeEstimateTokens,
    persistedSizeChars: Ae.originalSize,
    truncatedAtCap: Ae.truncatedAtBytes !== void 0,
    resultType: fromEnum(M),
    blockCount: G,
    persistedAs: fromEnum(ee),
  });
  let yt = Pe !== void 0 ? getFormatDescription("toolResult") : getFormatDescription(M, schema);
  return getLargeOutputInstructions(Ae.filepath, Ae.originalSize, yt, void 0, he, Ae.truncatedAtBytes);
}
/**
 * 从 -32042（URL elicitation required）错误的 data.elicitations 中取出通过 schema 校验的 elicitation 列表，格式不对返回空数组。
 */
//@ chunk-8t8n4kdh.js:178083-178255 layout
function parseUrlElicitationRequiredError(e) {
  let n = e.data;
  return (
    n != null && typeof n === "object" && "elicitations" in n && Array.isArray(n.elicitations)
      ? n.elicitations
      : []
  ).filter((s) => extend_58.safeParse(s).success);
}
/**
 * 把工具调用失败归类为认证问题：401、Unauthorized、OAuth 形状错误、带 headersHelper 的 403、或有待定 step-up scope 的 403 才算；有 step-up scope 且不是真 401 时返回 step_up，否则 credential_rejected，不是认证问题返回 undefined。
 */
//@ chunk-8t8n4kdh.js:178255-178526 layout
function classifyToolCallAuthError({
  errorCode: errorCode,
  message: message,
  isUnauthorizedError: isUnauthorizedError,
  isOAuthShapedAuthError: isOAuthShapedAuthError,
  hasHeadersHelper: hasHeadersHelper,
  pendingStepUpScope: pendingStepUpScope,
}) {
  let S = pendingStepUpScope !== void 0;
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
function isNeedsApprovalOrExpiredSession(e) {
  if (yZe(e)) return !0;
  if (!(e instanceof Error) || !("code" in e)) return !1;
  if (e.code === CCR_NEEDS_APPROVAL_CODE) {
    let n = "data" in e ? e.data : void 0;
    return typeof n === "object" && n !== null && "args_sha256" in n;
  }
  return e.code === -32000 && uYn(e.message);
}
/**
 * 带重试的 MCP 工具调用外层：可选 OTel span；CCR 代理返回 -32003 needs_approval 时弹事后审批卡（Chrome 域被 deny 规则覆盖则直接拒绝，编辑过参数的批准不重放），批准后重试；遇 URL elicitation 要求时处理后重试。
 */
//@ chunk-8t8n4kdh.js:178751-183698 layout
async function callMCPToolWithUrlElicitationRetry({
  client: client,
  clientConnection: clientConnection,
  tool: tool,
  args: args,
  meta: meta,
  signal: signal,
  onProgress: onProgress,
  callToolFn: callToolFn = callMCPTool,
  requestDialog: requestDialog,
  hasResultSizeAnnotation: hasResultSizeAnnotation = !1,
  resultNotForModel: resultNotForModel = !1,
  imageLimits: imageLimits,
  taskRegistry: taskRegistry,
  toolUseId: toolUseId,
  onAwaitingUserInput: onAwaitingUserInput,
  timing: timing,
  ccrNeedsApprovalRetry: ccrNeedsApprovalRetry,
  storageV5: storageV5,
  credentials: credentials,
  offCriticalPath: offCriticalPath,
  taskBackground: taskBackground,
  disallowTasks: disallowTasks,
}) {
  let retriedApproval = !1,
    isRetryableNeedsApproval = (H) =>
      H.code === CCR_NEEDS_APPROVAL_CODE &&
      typeof H.data === "object" &&
      H.data !== null &&
      "args_sha256" in H.data &&
      !!ccrNeedsApprovalRetry &&
      !!toolUseId &&
      !retriedApproval &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_proxy_needs_approval_retry", !0);
  using q = trackCallInProgress(client.transportErrorState);
  for (let H = 0; ; H++)
    try {
      let Xe = () =>
          callToolFn({
            client: client,
            tool: tool,
            args: args,
            meta: meta,
            offCriticalPath: offCriticalPath,
            signal: signal,
            onProgress: onProgress,
            hasResultSizeAnnotation: hasResultSizeAnnotation,
            resultNotForModel: resultNotForModel,
            imageLimits: imageLimits,
            timing: timing,
            taskRegistry: taskRegistry,
            toolUseId: toolUseId,
            storageV5: storageV5,
            credentials: credentials,
            requestDialog: requestDialog,
            taskBackground: taskBackground,
            disallowTasks: disallowTasks,
          }),
        Ee;
      if (!isPerfettoTracingEnabled()) Ee = await Xe();
      else {
        let Tt;
        try {
          Tt = truncateContentForTelemetry(jsonStringify(args)).content;
        } catch {
          Tt = void 0;
        }
        let Qe = isMemoryServerConnection(client, tool),
          Be = fileReferenceToolForRecords(client, tool),
          xe = Qe || withholdsFileReferenceArguments(Be, toolUseId),
          wt = withholdsFileReferenceErrorText(Be, toolUseId);
        if (xe && Tt !== void 0) Tt = notRecordedLength(Tt);
        Ee = await withToolExecutionSpan(
          "claude_code.mcp.rpc",
          {
            spanType: "mcp.rpc",
            attrs: {
              "rpc.system": "mcp",
              "rpc.service": client.name,
              "rpc.method": "tools/call",
              mcp_tool: tool,
              attempt: H,
            },
            ...(Tt !== void 0 && { contentAttrs: { mcp_args: Tt } }),
            withholdErrorText: (Se) =>
              wt || (Qe && Se instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS),
            isExpectedError: (Se) =>
              Se instanceof ProtocolError &&
              (Se.code === ma.UrlElicitationRequired || isRetryableNeedsApproval(Se)),
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
        retriedApproval = !0;
        let Qe = error.data,
          Be =
            typeof Qe === "object" && Qe !== null && "tool_name" in Qe && typeof Qe.tool_name === "string"
              ? Qe.tool_name
              : void 0,
          {
            canUseTool: canUseTool,
            tool: tool_2,
            fullyQualifiedName: fullyQualifiedName,
            toolUseContext: toolUseContext,
            parentMessage: parentMessage,
          } = ccrNeedsApprovalRetry,
          ft = chromeSiteFromError(client, error.data),
          Ot = ft && chromeSiteDenyCheck(ft, getToolPermissionContext(toolUseContext));
        if (Ot) {
          let De = ft?.kind === "unreadable";
          if (
            (logMCPDebug(
              client.name,
              `Tool '${tool}' returned -32003 needs_approval ${De ? "naming a site this session cannot read, and the session has ClaudeInChromeDomain deny rules" : "for a site a ClaudeInChromeDomain deny rule covers"}: failing the call with no approval card`,
            ),
            De)
          )
            logFeatureBad("chrome_permission_prompt", "hosted_site_unreadable");
          else logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
          throw (
            await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, Ot),
            toolUseContext.onPermissionDenial?.(tool_2, toolUseId, args),
            z9(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                Ot.message,
                "ccr_proxy_needs_approval_chrome_site_denied",
              ),
            )
          );
        }
        (logMCPDebug(
          client.name,
          `Tool '${tool}' returned -32003 needs_approval (tool_name=${Be}) \u2014 surfacing retroactive ` +
            "approval card",
        ),
          logEvent("tengu_mcp_proxy_needs_approval_retry", { attempt: H }),
          onAwaitingUserInput?.(!0));
        let vt = {
            behavior: "ask",
            suppressAlwaysAllowRule: !0,
            message: `The ${fullyQualifiedName} connector requires approval for this call.`,
            decisionReason: {
              type: "other",
              reason: "This connector call requires your approval to proceed.",
            },
          },
          me = ft && chromeSiteAsk(ft, tool, args, toolUseContext),
          Te = me ?? vt,
          Ve;
        try {
          Ve = await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, Te);
        } finally {
          onAwaitingUserInput?.(!1);
        }
        if (signal.aborted) throw z9(new AbortError());
        if (Ve.behavior === "allow") {
          if (Ve.updatedInput !== void 0 && !En(Ve.updatedInput, args))
            throw (
              logFeatureSad("mcp_ccr_needs_approval", "edited_input"),
              z9(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `The approval for ${fullyQualifiedName} was conditioned on edited arguments, which can't be applied on this retroactive card. To run with different arguments, deny and re-issue the call.`,
                  "ccr_proxy_needs_approval_edited_input",
                ),
              )
            );
          let De = fYn(toolUseContext.session, toolUseId);
          if (De !== void 0)
            throw z9(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                De,
                "ccr_proxy_needs_approval_resend_refused",
              ),
            );
          if (ft?.kind === "named" && me && meta) meta[CLAUDECODE_CHROMESITE] = ft.site;
          if (meta) yYn(meta, toolUseContext.session, toolUseContext.toolUseId, client.name, client.config);
          continue;
        }
        if (Ve === Te) throw (logFeatureSad("mcp_ccr_needs_approval", "no_prompt_surface"), z9(error));
        throw (
          logFeatureOk("mcp_ccr_needs_approval"),
          z9(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              Ve.message || `Approval denied for ${fullyQualifiedName}`,
              "ccr_proxy_needs_approval_denied",
            ),
          )
        );
      }
      if (error.code !== ma.UrlElicitationRequired) {
        if (retriedApproval) logFeatureBad("mcp_ccr_needs_approval", "retry_failed");
        else if (error.code === CCR_NEEDS_APPROVAL_CODE && ccrNeedsApprovalRetry)
          logFeatureBad("mcp_ccr_needs_approval", "arm_not_fired");
        throw error;
      }
      if (hostedDesktopRefusal(clientConnection) !== void 0) throw error;
      if (H - (retriedApproval ? 1 : 0) >= 3) throw error;
      let Ee = parseUrlElicitationRequiredError(error),
        Tt = clientConnection.name;
      if (Ee.length === 0)
        throw (
          logMCPDebug(Tt, `Tool '${tool}' returned -32042 but no valid elicitations in error data`),
          error
        );
      logMCPDebug(
        Tt,
        `Tool '${tool}' requires URL elicitation (error -32042, attempt ${H + 1}), processing ${Ee.length} elicitation(s)`,
      );
      for (let Qe of Ee) {
        let { elicitationId: elicitationId } = Qe,
          xe = await runElicitationHooks_2(Tt, Qe, signal);
        if (xe) {
          if (
            (logMCPDebug(Tt, `URL elicitation ${elicitationId} resolved by hook: ${jsonStringify(xe)}`),
            xe.action !== "accept")
          )
            return {
              content: `URL elicitation was ${xe.action === "decline" ? "declined" : xe.action + "ed"} by a hook. The tool "${tool}" could not complete because it requires the user to open a URL.`,
              urlElicitationDeclined: { url: Qe.url },
              isError: !0,
            };
          continue;
        }
        let wt;
        onAwaitingUserInput?.(!0);
        try {
          wt = requestDialog
            ? await requestDialog(
                MCP_URL_ELICITATION_DIALOG,
                { serverName: Tt, params: Qe },
                { signal: signal },
              )
            : { action: "cancel" };
        } finally {
          onAwaitingUserInput?.(!1);
        }
        let Se = await runElicitationResultHooks_2(Tt, wt, signal, "url", elicitationId);
        if (Se.action !== "accept")
          return (
            logMCPDebug(
              Tt,
              `User ${Se.action === "decline" ? "declined" : Se.action + "ed"} URL elicitation ${elicitationId}`,
            ),
            {
              content: `URL elicitation was ${Se.action === "decline" ? "declined" : Se.action + "ed"} by the user. The tool "${tool}" could not complete because it requires the user to open a URL.`,
              urlElicitationDeclined: { url: Qe.url },
              isError: !0,
            }
          );
        logMCPDebug(Tt, `Elicitation ${elicitationId} completed, retrying tool call`);
      }
    }
}
//@ chunk-8t8n4kdh.js:183698-184226 layout
function toolErrorResultText(e, n, r) {
  if (!e.isError) return;
  let s = "Unknown error";
  if (Array.isArray(e.content) && e.content.length > 0) {
    let flattened = e.content.flatMap((S) => {
      if (S == null || typeof S !== "object") return [];
      if ("text" in S) return [String(S.text)];
      if (S.type === "resource_link") {
        let w = S,
          P = `[Resource link: ${w.name}] ${w.uri}`;
        if (w.description) P += ` (${w.description})`;
        return [P];
      }
      return [];
    });
    if (flattened.length > 0)
      s = flattened.join(`
`);
  } else if ("error" in e) s = String(e.error);
  logMCPError(n, r === void 0 ? s : r(s));
  let h = stripAnthropicMeta(e._meta);
  throw new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    s,
    "MCP tool returned error",
    h ? { _meta: h } : void 0,
  );
}
/**
 * 构造 SEP-2663（MCP Tasks）所需的 schema 绑定对象：implementation、serverCapabilities、tool、prompt、resource、resourceTemplate 与 contentBlock 的 zod schema，交给 SDK 的任务支持使用。（v2）
 */
//@ chunk-8t8n4kdh.js:184226-184403 layout
function buildSep2663TaskBinding() {
  return {
    implementation: extend_4,
    serverCapabilities: ABt,
    tool: RBt,
    prompt: Hdn,
    resource: CBt,
    resourceTemplate: Ddn,
    contentBlock: or_2.options[0].shape.content.unwrap().element,
  };
}
/**
 * 绕过 SDK 响应缓存直接请求 `tools/list`（cacheMode: bypass），用于强制刷新工具列表。（v2）
 */
//@ chunk-8t8n4kdh.js:184403-184494 layout
function s_(e, n) {
  return Dt(e).request({ method: "tools/list" }, extend_44, { ...n, cacheMode: "bypass" });
}
/**
 * 绕过响应缓存读取资源 `resources/read`。（v2）
 */
//@ chunk-8t8n4kdh.js:184494-184574 layout
function i_(e, n, r) {
  return Dt(e).readResource({ uri: n }, { ...r, cacheMode: "bypass" });
}
/**
 * 调用工具 `tools/call` 的底层封装：协议时代为 modern 时在 `_meta` 里附上客户端任务能力声明，legacy 原样调用。（v2）
 */
//@ chunk-8t8n4kdh.js:184574-184707 layout
function invokeToolRaw(e, n, r) {
  let s = Dt(e),
    h =
      s.getProtocolEra?.() === "modern"
        ? { ...n, _meta: { ...n._meta, [IHe]: stripTasksCapability(HSn()) } }
        : n;
  return s.callTool(h, r);
}
//@ chunk-8t8n4kdh.js:184707-184738 layout
var Vi = 60000,
  gr = { allowTask: !0 };
//@ chunk-8t8n4kdh.js:184738-184900 layout
function withDeclaredClientTasks(e, n) {
  let r = ht().clientTasksDeclaredBeforeServerList.get(e),
    _meta = n._meta;
  return r === void 0 || e.getProtocolEra?.() !== "modern" ? n : { ...n, _meta: { ..._meta, [IHe]: r } };
}
//@ chunk-8t8n4kdh.js:184900-184992 layout
var eu = DoctorLazy(() => kt({ resultType: T("task") })),
  tu = DoctorLazy(() =>
    o()
      .min(1)
      .max(1024)
      .regex(/^\P{Cc}+$/u),
  );
/**
 * 为 MCP 任务（Tasks）构造请求通道：request 发任意方法（带签名头与超时），resolveInputRequest 把任务中途的输入请求（elicitation 等）交给对话框处理。（v2）
 */
//@ chunk-8t8n4kdh.js:184992-185307 layout
function createSep2663TaskBinding(e, { taskId: taskId, requestDialog: requestDialog }) {
  let s = Dt(e.client);
  return {
    request: (y, S, w) =>
      s.request({ method: y, params: withDeclaredClientTasks(s, S) }, vM, {
        ...gr,
        signal: w.signal,
        headers: w.headers,
        timeout: Vi,
      }),
    resolveInputRequest: (y, S, w) =>
      resolveTaskInputRequest({
        key: y,
        inputRequest: S,
        task: { taskId: taskId },
        connected: e,
        signal: w,
        requestDialog: requestDialog,
        transportErrorState: void 0,
      }),
  };
}
//@ chunk-8t8n4kdh.js:185307-185360 layout
var ou = DoctorLazy(() => Ue([Fdn, extend_58.omit({ elicitationId: !0 })]));
/**
 * 处理 MCP 任务的输入请求：elicitation/create 校验参数后在交互会话中弹对话框（URL 模式被关闭或非交互时取消任务），roots/list 返回根目录，其它方法不支持。
 */
//@ chunk-8t8n4kdh.js:185360-186410 layout
async function resolveTaskInputRequest({
  key: key,
  inputRequest: inputRequest,
  task: task,
  connected: connected,
  signal: signal,
  requestDialog: requestDialog,
  transportErrorState: transportErrorState,
}) {
  let w = connected.name;
  switch (inputRequest.method) {
    case "elicitation/create": {
      let safeParse = ou().safeParse(inputRequest.params);
      if (!safeParse.success) {
        logMCPDebug(
          w,
          `Task ${task.taskId}: input request '${key}' carries invalid elicitation params: ${safeParse.error.message}`,
        );
        return;
      }
      if (safeParse.data.mode === "url" && HSn().elicitation?.url === void 0) {
        logMCPDebug(
          w,
          `Task ${task.taskId}: input request '${key}' asks for URL elicitation, which is switched off (tengu_mcp_url_elicitation); the task will be cancelled`,
        );
        return;
      }
      if (requestDialog && !getIsNonInteractiveSession())
        return handleElicitationRequest_2({
          connected: connected,
          params: safeParse.data,
          signal: signal,
          requestDialog: requestDialog,
          transportErrorState: transportErrorState,
        });
      throw (
        logMCPDebug(
          w,
          `Task ${task.taskId}: cannot show input request '${key}' (${requestDialog ? "this session is non-interactive" : "no dialog was passed to this call"}); the task will be cancelled`,
        ),
        new mcpTaskDriveModule.TaskInputUnservableError(
          `task ${task.taskId} input request '${key}' cannot be surfaced in this session`,
        )
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
/**
 * 发 tools/call 并监护整次调用：总超时、空闲超时（进度通知或 elicitation 关闭会重置）、传输断开 90 秒后判定响应丢失、答复流提前结束；modern 服务器支持任务化（转后台或轮询）；认证失败时触发重新认证并按需重试，结果交给 processMCPResult。
 */
//@ chunk-8t8n4kdh.js:186410-202078 layout
async function callMCPTool({
  client: client,
  tool: tool,
  args: args,
  meta: meta,
  signal: signal,
  onProgress: onProgress,
  offCriticalPath: offCriticalPath = !1,
  hasResultSizeAnnotation: hasResultSizeAnnotation = !1,
  resultNotForModel: resultNotForModel = !1,
  imageLimits: imageLimits,
  timing: timing,
  taskRegistry: taskRegistry,
  toolUseId: toolUseId,
  idleTimeoutMs: idleTimeoutMs,
  isAuthRetry: isAuthRetry = !1,
  storageV5: storageV5,
  credentials: credentials,
  requestDialog: requestDialog,
  taskBackground: taskBackground,
  disallowTasks: disallowTasks,
}) {
  let {
      client: client_2,
      name: serverName,
      config: config,
      transportErrorState: transportErrorState,
    } = client,
    sdkClient = Dt(client_2),
    q = fileReferenceToolForRecords(client, tool),
    withheldFileRef = withholdsFileReferenceErrorText(q, toolUseId) ? q : void 0,
    redactErrorForLog = isMemoryServerConnection(client, tool)
      ? describeRedactedMcpError
      : withheldFileRef !== void 0
        ? (me) => withheldFileReferenceErrorForLog(withheldFileRef, me)
        : void 0,
    now = Date.now(),
    startEpoch = identityEpoch(),
    Qe = sdkClient.transport?.sessionId === void 0,
    progressTimer,
    toolUseIdMeta = meta?.["claudecode/toolUseId"],
    hasToolUseId = typeof toolUseIdMeta === "string",
    watchdog = {
      armedAt: 0,
      offCriticalPath: offCriticalPath,
      toolUseId: hasToolUseId ? toolUseIdMeta : void 0,
      mark:
        toolUseIdMeta === void 0 &&
        config.type === "http" &&
        isCcrMcpPath(config.url) &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_rippling_map", !0)
          ? randomUUID()
          : void 0,
      ownSends: { started: 0, ranNothing: 0 },
      timing: timing ?? getRequestTimingStore(),
    };
  transportErrorState?.activeCallWatchdogs.add(watchdog);
  let ze = transportErrorState?.toolCallSends?.started,
    sentRequests = new Map(),
    requestStates = hasToolUseId ? sentRequests : new Map(),
    ranNothing = !1,
    answerStreamTimer;
  try {
    (incrementCallsInProgress(transportErrorState), logMCPDebug(serverName, `Calling MCP tool: ${tool}`));
    let me = idleTimeoutMs ?? getMcpToolIdleTimeoutMs(config),
      lastActivityAt = now,
      rejectIdle,
      promise = new Promise((Me, Ye) => {
        rejectIdle = Ye;
      });
    ((watchdog.requestSent = (Me) => {
      (requestStates.set(String(Me), "sent"), (ranNothing = !1));
    }),
      (watchdog.requestTaken = (Me) => {
        if (requestStates.has(String(Me))) requestStates.set(String(Me), "taken");
      }),
      (watchdog.requestAnswered = (Me) => {
        requestStates.delete(String(Me));
      }),
      (watchdog.requestNotRun = (Me) => {
        (requestStates.delete(String(Me)), (ranNothing = hasToolUseId));
      }));
    let Le = (Me) =>
      requestStates.has(String(Me)) && transportErrorState?.activeCallWatchdogs.has(watchdog) === !0;
    ((watchdog.answerStreamEnded = (Me) => {
      if (!Le(Me)) return;
      (clearTimeout(answerStreamTimer),
        (answerStreamTimer = setTimeout(() => {
          if (!Le(Me)) return;
          (logMCPDebug(serverName, `Tool '${tool}' aborting: its answer stream ended with no answer`),
            rejectIdle(
              Object.assign(
                hasToolUseId
                  ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      olr(serverName, tool),
                      "MCP answer stream ended mid-call",
                      MCP_ANSWER_STREAM_ENDED,
                    )
                  : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      `MCP server "${serverName}": the answer stream for tool "${tool}" ended with no answer`,
                      "MCP answer stream ended mid-call",
                    ),
                { mcpErrorSource: "downstream_unreachable" },
              ),
            ));
        }, ANSWER_STREAM_GRACE_MS)));
    }),
      (progressTimer = setInterval(() => {
        let floored = Math.floor((Date.now() - now) / 1000);
        if (
          (logMCPDebug(serverName, `Tool '${tool}' still running (${floored}s elapsed)`),
          watchdog.armedAt > 0 && Date.now() - watchdog.armedAt > 90000)
        ) {
          logMCPDebug(
            serverName,
            `Tool '${tool}' aborting: transport error ${Math.floor((Date.now() - watchdog.armedAt) / 1000)}s ago, response presumed lost`,
          );
          let Ye = sentRequests.size > 0;
          rejectIdle(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                Ye
                  ? olr(serverName, tool)
                  : `MCP server "${serverName}" transport dropped mid-call; response for tool "${tool}" was lost`,
                "MCP transport lost mid-call",
                Ye ? MCP_CALL_UNANSWERED : void 0,
              ),
              { mcpErrorSource: "downstream_unreachable" },
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
          let _t = `MCP server "${serverName}" tool "${tool}" sent no response or progress for ${floored}s; aborting. If this server is configured in your MCP settings, set a per-server "timeout" (ms) to allow longer silent runs for just this server; otherwise set CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT (ms) globally (0 disables).`,
            Mt = sentRequests.size > 0;
          rejectIdle(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                Mt ? `${_t} ${CALL_OUTCOME_UNKNOWN_NOTICE}` : _t,
                "MCP tool idle timeout",
                Mt ? MCP_CALL_UNANSWERED : void 0,
              ),
              { mcpErrorSource: "downstream_unreachable" },
            ),
          );
        }
      }, 30000)));
    let callTimeoutMs = getMcpToolTimeoutMs(config),
      callTimeoutTimer,
      ot,
      promise_2 = new Promise((Me, Ye) => {
        ot = Ye;
      }),
      ye = (Me, Ye) => {
        (clearTimeout(callTimeoutTimer),
          (callTimeoutTimer = setTimeout(
            (_t, Mt, at, pt, jt, Lt) => {
              let We = `MCP server "${Mt}" tool "${at}" timed out after ${Math.floor(pt / 1000)}s`,
                Bt = jt.size > 0,
                Kt = (Lt.openQuestions ?? 0) > 0,
                zt = [...(Kt ? [bfi] : []), ...(Bt ? [CALL_OUTCOME_UNKNOWN_NOTICE] : [])];
              _t(
                Object.assign(
                  new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                    zt.length > 0 ? `${We}. ${zt.join(" ")}` : We,
                    "MCP tool timeout",
                    Bt ? MCP_CALL_UNANSWERED : Kt ? MCP_QUESTION_UNANSWERED : void 0,
                  ),
                  { mcpErrorSource: "downstream_unreachable" },
                ),
              );
            },
            Me,
            ot,
            serverName,
            tool,
            Ye,
            sentRequests,
            watchdog,
          )));
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
        if ((clearTimeout(answerStreamTimer), progressTimer !== void 0))
          (clearInterval(progressTimer), (progressTimer = void 0));
        transportErrorState?.activeCallWatchdogs.delete(watchdog);
      },
      $t =
        disallowTasks === !0 ||
        isSingleShotPrintSession() ||
        (getIsNonInteractiveSession() && taskBackground === void 0),
      Vt = (Me, Ye, _t) => {
        ((watchdog.armedAt = 0),
          (lastActivityAt = Date.now()),
          onProgress?.({
            type: "mcp_progress",
            status: Me,
            serverName: serverName,
            toolName: tool,
            progress: _t,
            progressMessage: Ye,
          }));
      },
      Fe = async () => {
        let Me = isMcpTasksEnabled(),
          Ye = Me && !$t && !shouldRestrictRemoteHost(config);
        if (Me && !$t && !Ye)
          logMCPDebug(
            serverName,
            "Tasks are off for this server: the tengu_gleaming_creek server list shuts it out, so its tool calls run without Tasks",
          );
        let _t = sdkClient.getProtocolEra?.() === "modern",
          Mt = Ye && _t,
          at = Mt ? gr : {},
          pt = ht().clientTasksDeclaredBeforeServerList.get(sdkClient),
          jt = !Ye && _t ? { ...meta, [IHe]: stripTasksCapability(pt ?? HSn()) } : meta,
          callTool = await sdkClient.callTool(
            {
              name: tool,
              arguments: args,
              _meta: watchdog.mark === void 0 ? jt : { ...jt, [CLAUDECODE_CALLMARK]: watchdog.mark },
            },
            {
              ...at,
              signal: be ? AbortSignal.any([signal, abortController.signal]) : signal,
              timeout: be ? ec : callTimeoutMs,
              onprogress: (We) => {
                if (
                  ((watchdog.armedAt = 0),
                  (lastActivityAt = Date.now()),
                  mcpAutoBackgroundModule?.reportBackgroundProgress(signal, We),
                  onProgress)
                )
                  onProgress({
                    type: "mcp_progress",
                    status: "progress",
                    serverName: serverName,
                    toolName: tool,
                    progress: We.progress,
                    total: We.total,
                    progressMessage: We.message,
                  });
              },
            },
          );
        if (Mt) {
          let We = (Ct) => {
              sdkClient
                .request({ method: "tasks/cancel", params: { taskId: Ct } }, vM, {
                  signal: AbortSignal.timeout(MCP_TASK_POLL_MS),
                })
                .catch(() => {});
            },
            safeParse = mcpTaskDriveModule.CreateTaskResultSchema().safeParse(callTool);
          if (safeParse.success) {
            if (abortController.signal.aborted) return (We(safeParse.data.taskId), callTool);
            if (taskBackground && taskRegistry)
              return ((L = mt(safeParse.data, taskBackground, taskRegistry)), callTool);
            return et(safeParse.data);
          }
          let safeParse_2 = eu().safeParse(callTool);
          if (safeParse_2.success) {
            logMCPDebug(
              serverName,
              `Tool '${tool}' returned a malformed task handle: ${safeParse.error.message.slice(0, 200)}`,
            );
            let safeParse_3 = tu().safeParse(safeParse_2.data.taskId);
            if (safeParse_3.success) We(safeParse_3.data);
            return {
              content: [
                {
                  type: "text",
                  text: `MCP server "${serverName}" returned a malformed task handle for tool "${tool}", so Claude Code cannot track the task or get its result. ${safeParse_3.success ? "It tried to cancel the task, but the" : "The"} server may still be running it. Calling the tool again may start another task.`,
                },
              ],
              isError: !0,
              _meta: void 0,
              structuredContent: void 0,
            };
          }
          let agentTaskMeta = mcpTaskDriveModule.parseAgentTaskMeta(callTool._meta);
          if (agentTaskMeta?.merged === !0 && agentTaskMeta.taskId && taskRegistry) {
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
        return callTool;
      },
      L,
      mt = (Me, Ye, _t) => {
        let mcpTransportFingerprint = mcpTasksModule.mcpTransportFingerprint(client.config),
          registerOrAdoptSep2663Task = mcpTasksModule.registerOrAdoptSep2663Task({
            taskRegistry: _t,
            task: Me,
            serverName: serverName,
            toolName: tool,
            toolUseId: toolUseId,
            transportFingerprint: mcpTransportFingerprint,
            adoptRegistryId: Ye.share.registryId,
            storageV5: Ye.storageV5,
          }),
          {
            registryId: registryId,
            driveAbort: driveAbort,
            ttlExpiresAt: ttlExpiresAt,
            killed: killed,
          } = registerOrAdoptSep2663Task;
        if (
          ((Ye.share.becameTask = !0),
          Ye.onBackgrounded(),
          logMCPDebug(
            serverName,
            killed
              ? `Tool '${tool}' returned task ${Me.taskId} after background task ${registryId} was stopped; cancelling it`
              : `Tool '${tool}' returned task ${Me.taskId} (${Me.status}); backgrounded as ${registryId}`,
          ),
          !registerOrAdoptSep2663Task.killed && Ye.session !== void 0 && qSn())
        )
          workerWakesModule.mcpTaskWorkerWakeKeepers
            .of(Ye.session)
            .taskBackgrounded({
              taskRegistry: _t,
              record: registerOrAdoptSep2663Task.sidecarRecord,
              storageV5: Ye.storageV5,
            });
        let Bt = (zt, Ct) => createSep2663TaskBinding(zt, { taskId: Ct, requestDialog: requestDialog });
        mcpTasksModule.startSep2663BackgroundDrive({
          taskRegistry: _t,
          registryId: registryId,
          serverName: serverName,
          toolName: tool,
          mcpTaskId: Me.taskId,
          pollIntervalMs: Me.pollIntervalMs,
          ttlExpiresAt: ttlExpiresAt,
          driveAbort: driveAbort,
          initialBinding: Bt(client, Me.taskId),
          initialConfig: client.config,
          bindingFactory: Bt,
          transportFingerprint: mcpTransportFingerprint,
          storageV5: Ye.storageV5,
          credentials: Ye.credentials,
        });
        let Kt = isPlainObject(Me._meta) ? Me._meta[mcpTaskDriveModule.AGENT_TASK_META_KEY] : void 0;
        return {
          ...mcpTasksModule.buildSep2663PlaceholderResult({
            serverName: serverName,
            toolName: tool,
            registryId: registryId,
            mcpTaskId: Me.taskId,
            stopped: killed,
            modelImmediateResponse: mcpTaskDriveModule.parseAgentTaskMeta(Me._meta)?.modelImmediateResponse,
          }),
          ...(!killed && Kt !== void 0 && { _meta: { [mcpTaskDriveModule.AGENT_TASK_META_KEY]: Kt } }),
        };
      },
      et = async (Me) => {
        (logMCPDebug(serverName, `Tool '${tool}' returned task ${Me.taskId} (${Me.status}); polling inline`),
          Vt(
            "progress",
            mcpTaskPersistenceModule.boundMcpStatusMessage(Me.statusMessage) ??
              `Task ${shortTaskLabel(Me.taskId)} ${Me.status}`,
            0,
          ));
        let Ye = 0,
          driveMcpTask = await mcpTaskDriveModule.driveMcpTask({
            errorText: (at) => describeConnectError(at, config),
            task: Me,
            signal: abortController.signal,
            log: (at) => logMCPDebug(serverName, at),
            request: (at, pt, jt) =>
              sdkClient.request({ method: at, params: pt }, vM, {
                ...gr,
                signal: jt.signal,
                headers: jt.headers,
                timeout: Vi,
              }),
            onStatus: (at) => {
              ((Ye += 1),
                Vt(
                  "progress",
                  mcpTaskPersistenceModule.boundMcpStatusMessage(at.statusMessage) ??
                    `Task ${shortTaskLabel(at.taskId)} ${at.status.replace("_", " ")}`,
                  Ye,
                ));
            },
            resolveInputRequest: (at, pt) =>
              resolveTaskInputRequest({
                key: at,
                inputRequest: pt,
                task: Me,
                connected: client,
                signal: abortController.signal,
                requestDialog: requestDialog,
                transportErrorState: transportErrorState,
              }),
          });
        if (driveMcpTask.status === "completed")
          return (logMCPDebug(serverName, `Task ${Me.taskId} completed`), or_2.parse(driveMcpTask.result));
        let Mt = mcpTaskPersistenceModule.boundMcpStatusMessage(driveMcpTask.error.message) ?? "";
        if (
          (logMCPDebug(
            serverName,
            `Task ${Me.taskId} ended without a result: ${driveMcpTask.error.kind} \u2014 ${Mt}`,
          ),
          signal.aborted)
        )
          throw new AbortError();
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `MCP server "${serverName}" task for tool "${tool}" ${driveMcpTask.error.kind === "cancelled" || driveMcpTask.error.kind === "input_unservable" ? "was cancelled" : "failed"}: ${Mt}`,
          "MCP task did not complete",
        );
      },
      abortController = new AbortController(),
      we = () => abortController.abort();
    signal.addEventListener("abort", we, { once: !0 });
    let Ke = timing?.mark("external"),
      He = await Promise.race([Fe(), promise_2, promise]).finally(() => {
        (signal.removeEventListener("abort", we), we(), ct(), Ke?.());
      });
    if ((watchdog.returned?.(), L)) return (noteHearthDegraded(serverName, void 0), L);
    toolErrorResultText(He, serverName, redactErrorForLog);
    let tt = Date.now() - now,
      gt =
        tt < 1000
          ? `${tt}ms`
          : tt < 60000
            ? `${Math.floor(tt / 1000)}s`
            : `${Math.floor(tt / 60000)}m ${Math.floor((tt % 60000) / 1000)}s`;
    logMCPDebug(serverName, `Tool '${tool}' completed successfully in ${gt}`);
    let Nt = detectCodeIndexingFromMcpServerName(serverName);
    if (Nt)
      logEvent("tengu_code_indexing_tool_used", { tool: fromEnum(Nt), source: lit("mcp"), success: !0 });
    let Ft = await processMCPResult(
      He,
      tool,
      serverName,
      imageLimits,
      hasResultSizeAnnotation,
      storageV5,
      credentials,
      resultNotForModel,
    );
    return (
      noteHearthDegraded(serverName, void 0),
      {
        content: Ft,
        _meta: He._meta,
        structuredContent: He.structuredContent,
        resourceLinks: anthropicResourceLinks(He.content),
      }
    );
  } catch (error) {
    if (!signal.aborted) noteHearthDegraded(serverName, error);
    if (progressTimer !== void 0) clearInterval(progressTimer);
    (clearTimeout(answerStreamTimer), transportErrorState?.activeCallWatchdogs.delete(watchdog));
    let Te = Date.now() - now;
    if (signal?.aborted !== !0 && error instanceof Error && error.name !== "AbortError")
      logMCPDebug(
        serverName,
        `Tool '${tool}' failed after ${Math.floor(Te / 1000)}s: ${redactErrorForLog !== void 0 && error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? redactErrorForLog(error.message) : withheldFileRef !== void 0 ? withheldFileReferenceErrorForLog(withheldFileRef, error.message, error.name) : describeConnectError(error, config)}`,
      );
    if (error instanceof Error) {
      let De =
          error instanceof ProtocolError
            ? void 0
            : error instanceof SdkHttpError
              ? error.status
              : "code" in error && typeof error.code === "number"
                ? error.code
                : void 0,
        Le =
          (config.type === "http" || config.type === "sse" || config.type === "ws") && !!config.headersHelper,
        re = hasCliOwnedBearer(config),
        ue =
          error instanceof OAuthError
            ? error.code
            : "errorCode" in error && typeof error.errorCode === "string"
              ? error.errorCode
              : void 0,
        ot =
          ue !== void 0 &&
          !["invalid_grant", "invalid_client", "unauthorized_client"].includes(ue) &&
          /^HTTP 40[13]\b/.test(error.message),
        it = ht().clientAuthProviders.get(Dt(client_2))?.pendingStepUpScope,
        ye = classifyToolCallAuthError({
          errorCode: De,
          message: error.message,
          isUnauthorizedError: error instanceof UnauthorizedError,
          isOAuthShapedAuthError: ot,
          hasHeadersHelper: Le,
          pendingStepUpScope: it,
        }),
        be =
          (config.type === "http" || config.type === "sse") &&
          !config.headersHelper &&
          !configHasAuthorizationHeader(config)
            ? config
            : void 0,
        ct = !isAuthRetry && ye === "credential_rejected" && !Le && be !== void 0,
        $t = ct && (await hasStoredRefreshToken(serverName, be)),
        Vt =
          $t ||
          (ct &&
            dZe() &&
            ht().clientAuthProviders.get(Dt(client_2))?.lastAuthRejection?.status === 401 &&
            ht().clientAuthProviders.get(Dt(client_2))?.lastAuthRejection?.accessToken !== void 0);
      if ((Le || re || be !== void 0) && !isAuthRetry) {
        let Oe = ir(serverName, config);
        if (identityEpoch() !== startEpoch)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `MCP tool call to server "${serverName}" was aborted: the account changed before re-authentication`,
            "MCP tool call aborted: account changed before reauth",
          );
        let reauthInFlight = getConnectionCache().reauthInFlight,
          Ke = ht(),
          He = reauthInFlight.get(Oe),
          tt = He !== void 0 && He.epoch === startEpoch ? He.promise : void 0;
        Ke.reauthDecisionSinkForTest?.(
          tt !== void 0 ? "joined" : He !== void 0 ? "stale_refused" : "started",
        );
        let gt =
          tt !== void 0 &&
          ((error instanceof SdkError && error.code === Ti.ConnectionClosed) ||
            (error instanceof ProtocolError && error.code === -32000)) &&
          !isTruncatedBodyError(transportErrorState?.closeReason);
        if (
          (gt || (ye === "credential_rejected" && Le) || (ye === "credential_rejected" && re) || Vt) &&
          !isMcpServerDisabled(serverName) &&
          !isMcpServerBlockedAtConnectTime(serverName, config)
        ) {
          if (
            (logMCPDebug(
              serverName,
              Le
                ? `Tool '${tool}' returned ${De ?? 401}; re-running headersHelper and retrying once`
                : re
                  ? `Tool '${tool}' returned ${De ?? 401}; session credential rejected \u2014 reconnecting and retrying once`
                  : gt
                    ? `Tool '${tool}' failed because a reconnect in progress closed its connection; retrying once on the new connection`
                    : `Tool '${tool}' returned ${De ?? 401}; ${$t ? "refresh token stored" : "stored sign-in rejected, no refresh token"} \u2014 reconnecting and retrying once`,
            ),
            gt)
          )
            logFeatureSad(Le ? "mcp_headers_helper" : "mcp_oauth_refresh", "collateral_rejoin");
          if (!tt) {
            (logFeatureSad(
              Le ? "mcp_headers_helper" : Vt && !$t ? "mcp_signed_out_fallback" : "mcp_oauth_refresh",
              "reauth_retry",
            ),
              (sdkClient.onclose = void 0));
            let Me = startEpoch;
            tt = (async () => (
              await clearServerCache(serverName, config),
              connectToServer(serverName, config, void 0, void 0, credentials)
            ))();
            let Ye = { promise: tt, epoch: Me };
            (reauthInFlight.set(Oe, Ye),
              tt
                .then((_t) => {
                  if (_t.type === "connected" && identityEpoch() === Me)
                    REAUTH_RECONNECT_SIGNAL.emit(serverName, config);
                })
                .finally(() => {
                  if (reauthInFlight.get(Oe) === Ye && !Ke.holdStaleReauthEntryForTest)
                    reauthInFlight.delete(Oe);
                })
                .catch(() => {}));
          }
          let Ft = await tt;
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
              tool: tool,
              args: args,
              meta: meta,
              signal: signal,
              onProgress: onProgress,
              offCriticalPath: offCriticalPath,
              hasResultSizeAnnotation: hasResultSizeAnnotation,
              resultNotForModel: resultNotForModel,
              timing: timing,
              imageLimits: imageLimits,
              taskRegistry: taskRegistry,
              requestDialog: requestDialog,
              taskBackground: taskBackground,
              toolUseId: toolUseId,
              idleTimeoutMs: idleTimeoutMs,
              isAuthRetry: !0,
              storageV5: storageV5,
              credentials: credentials,
              disallowTasks: disallowTasks,
            });
          if (
            (logMCPDebug(serverName, `Auth reconnect returned '${Ft.type}'; falling through to needs-auth`),
            fd() && Ft.type !== "needs-auth")
          ) {
            let Me = connectToServer.cache?.get?.(Oe);
            if (
              Me !== void 0 &&
              (await clearMcpAuthCache(Me)) === Ft &&
              connectToServer.cache?.get?.(Oe) === Me
            )
              getConnectionCache().connections.delete(Oe);
          }
        }
      }
      if (ye === "credential_rejected" && re)
        throw (
          await clearServerCache(serverName, config),
          logMCPDebug(
            serverName,
            `Tool '${tool}' rejected the session credential (${De ?? 401}); failing the call and clearing the connection for a fresh retry later`,
          ),
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              fW.sessionCredentialRejected(serverName, De ?? 401),
              "MCP server rejected the session credential",
            ),
            { mcpErrorSource: "other" },
          )
        );
      if (ye !== void 0) {
        let Oe = config.type === "claudeai-proxy" && config.eligible === !1,
          we = Oe ? "not_connected" : ye === "step_up" ? "insufficient_scope" : "token_expired";
        logMCPDebug(
          serverName,
          we === "insufficient_scope"
            ? `Tool call returned 403 insufficient_scope (scope: ${redactSensitiveUrlParams("scope", it ?? "")})`
            : "Tool call returned 401 Unauthorized - token may have expired",
        );
        let Ke = mcpBaseUrlAnalytics_2(config, serverName),
          He = isMcpServerLoggableInAnalytics(serverName, config);
        logEvent("tengu_mcp_tool_call_auth_error", {
          errorCode: fromNumber(De ?? (ye === "step_up" ? 403 : 401)),
          transportType: fromEnum(config.type ?? "stdio"),
          authErrorKind: fromEnum(we),
          ...Ke,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(normalizeNameForMCP(serverName), He),
          mcpToolName: loggableMcpToolName(normalizeNameForMCP(serverName), normalizeNameForMCP(tool), He),
        });
        let tt = (config.type === "http" || config.type === "sse") && configHasAuthorizationHeader(config);
        throw new McpAuthError(
          serverName,
          Oe
            ? fW.notConnected(serverName)
            : we === "insufficient_scope"
              ? fW.stepUp(serverName, it)
              : Le
                ? fW.helperRejected(serverName)
                : tt
                  ? fW.headerRejected(serverName)
                  : fW.signInAgain(serverName),
          we,
          ht().clientFirstPartyBearers.get(Dt(client_2))?.last,
          we === "insufficient_scope" ? it : void 0,
        );
      }
      let L = !(config.type === "http" && De === 404 && Qe) && isMcpSessionExpiredError(error),
        mt =
          ((error instanceof SdkError && error.code === Ti.ConnectionClosed) ||
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
        throw new McpToolResultNotReadError(serverName, tool, { kind: "connection_closed" });
      let et = [...sentRequests.values()];
      if (mt && et.length > 0)
        throw (
          logMCPDebug(
            serverName,
            `Tool '${tool}' not sent again: the connection closed before the call was answered`,
          ),
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              olr(serverName, tool),
              "MCP call not sent again after connection closed",
              MCP_CALL_NOT_SENT_AGAIN,
            ),
            { mcpErrorSource: "downstream_unreachable" },
          )
        );
      if (
        et.includes("sent") &&
        !L &&
        (De === void 0 || error.name === "TimeoutError"
          ? !(
              error instanceof SdkError ||
              error instanceof ProtocolError ||
              error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
            )
          : RETRYABLE_HTTP_STATUSES.has(De))
      )
        throw (
          logMCPDebug(
            serverName,
            `Tool '${tool}' failed: its POST does not show whether the server got the call`,
          ),
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              olr(serverName, tool),
              "MCP call went out and got no answer",
              MCP_CALL_UNANSWERED,
            ),
            { mcpErrorSource: "downstream_unreachable" },
          )
        );
      if (L || mt) {
        logMCPDebug(
          serverName,
          `MCP session expired during tool call (${L ? "stale session" : "connection closed"}), clearing connection cache for re-initialization`,
        );
        let Oe = mcpBaseUrlAnalytics_2(config, serverName),
          we = isMcpServerLoggableInAnalytics(serverName, config),
          Ke = loggableMcpToolName(normalizeNameForMCP(serverName), normalizeNameForMCP(tool), we);
        (logEvent("tengu_mcp_session_expired", {
          errorCode: De !== void 0 ? fromNumber(De) : void 0,
          transportType: fromEnum(config.type ?? "stdio"),
          ...Oe,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(normalizeNameForMCP(serverName), we),
          mcpToolName: Ke,
        }),
          await clearServerCache(serverName, config));
        let He = didCallRunNothing(transportErrorState?.toolCallSends, ze, watchdog.ownSends);
        throw new McpSessionExpiredError(
          serverName,
          L
            ? "session_expired_404"
            : bhr(transportErrorState?.closeReason) ||
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
      (error instanceof SdkError && error.code === Ti.InvalidResult) ||
      error instanceof kR ||
      ((Ve?.name === "ZodError" || Ve?.name === "$ZodError") && Array.isArray(Ve?.issues))
    )
      throw new McpResponseSchemaError(serverName, error);
    if (
      !(error instanceof Error && error.name === "AbortError") &&
      !(signal?.aborted === !0 && error instanceof SdkError)
    )
      throw error;
    return { content: INTERRUPTED_CALL_NOTICE, interrupted: !0, isError: !0 };
  } finally {
    if (progressTimer !== void 0) clearInterval(progressTimer);
    decrementCallsInProgress(transportErrorState);
  }
}
//@ chunk-8t8n4kdh.js:202078-202174 layout = countToolCallsSince (1)
function getFirstToolUseId(e) {
  if (e.message.content[0]?.type !== "tool_use") return;
  return e.message.content[0].id;
}
/**
 * 校验 SDK 宿主提供的 MCP 清单：initializeResult 不合法或协议版本不支持时放弃清单改走控制通道握手；tools/list 结果不合法同样放弃；分页的 tools/list 只回放 initialize。
 */
//@ chunk-8t8n4kdh.js:202174-203150 layout
function validateHostManifest(serverName, manifest) {
  if (manifest === void 0) return;
  let safeParse = extend_7.safeParse(manifest.initializeResult);
  if (!safeParse.success || !P_t.includes(safeParse.data.protocolVersion) || !ni(manifest.initializeResult)) {
    (logMCPDebug(
      serverName,
      "Host manifest initializeResult is not a valid InitializeResult for this client \u2014 handshaking over the control channel instead",
    ),
      logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_invalid_initialize"));
    return;
  }
  if (
    manifest.toolsListResult !== void 0 &&
    (!extend_44.safeParse(manifest.toolsListResult).success || !ni(manifest.toolsListResult))
  ) {
    (logMCPDebug(
      serverName,
      "Host manifest toolsListResult is not a valid ListToolsResult \u2014 handshaking over the control channel instead",
    ),
      logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_invalid_tools_list"));
    return;
  }
  if (manifest.toolsListResult !== void 0 && manifest.toolsListResult.nextCursor !== void 0)
    return (
      logMCPDebug(
        serverName,
        "Host manifest toolsListResult is paginated (nextCursor) \u2014 replaying initialize only and listing tools over the control channel",
      ),
      logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_paginated_tools_list"),
      { initializeResult: manifest.initializeResult }
    );
  return manifest;
}
//@ chunk-8t8n4kdh.js:203150-203225 layout
function ni(e) {
  return fZe.safeParse({ jsonrpc: "2.0", id: 0, result: e }).success;
}
/**
 * 记录 SDK 宿主 MCP 清单的结果：重放成功或失败，以及协议版本不符、声明了客户端能力、结果格式不对等情况。
 */
//@ chunk-8t8n4kdh.js:203225-203562 layout
function logManifestOutcome(e, n) {
  switch (e) {
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
      logFeatureSad("mcp_sdk_manifest", `mcp_sdk_manifest_${e}`);
      return;
  }
}
/**
 * 连接 SDK 宿主注册的进程内 MCP 服务器：每个建控制通道传输与客户端（sdk-control 协商），带连接超时；成功则拉取工具，失败标记 failed；有资源能力时补上资源列表/读取工具。
 */
//@ chunk-8t8n4kdh.js:203562-205634 layout
async function setupSdkMcpClients(servers, sendControlRequest, manifests, toolContext) {
  let clients = [],
    tools = [],
    commands = [];
  Er();
  let settled = await Promise.allSettled(
    Object.entries(servers).map(async ([M, j]) => {
      let R = new SdkControlClientTransport(
        M,
        sendControlRequest,
        validateHostManifest(M, manifests?.get(M)),
      );
      guardTransportSend({ name: M }, R);
      let ce = new cLo(
          {
            ...freeze_2,
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
          },
          {
            capabilities: freeze,
            jsonSchemaValidator: MPe() ? NO_OP_SCHEMA_VALIDATOR : new LegacyDialectToleratingValidator(),
            versionNegotiation: resolveVersionNegotiation("sdk-control"),
          },
        ),
        Q = !1;
      try {
        let connect = ce.connect(R, { timeout: getConnectionTimeoutMs() });
        if (
          !(await withDeadline(
            connect.then(() => !0),
            getConnectionTimeoutMs(),
          ))
        )
          throw (
            connect.catch(() => {}),
            R.close().catch(() => {}),
            (Q = !0),
            makeConnectTimeoutError_2(
              `SDK MCP server "${M}" connection timed out after ${getConnectionTimeoutMs()}ms`,
            )
          );
        let serverCapabilities = ce.getServerCapabilities(),
          instructions = ce.getInstructions(),
          Pe = truncateServerInstructions(instructions, M),
          ke = {
            type: "connected",
            serverInfo: ce.getServerVersion(),
            name: M,
            capabilities: serverCapabilities || {},
            instructions: Pe,
            negotiatedProtocolVersion: ce.getNegotiatedProtocolVersion(),
            protocolEra: ce.getProtocolEra(),
            client: si(ce),
            config: { ...j, scope: "dynamic" },
            cleanup: async () => {
              await ce.close();
            },
          },
          nt = ir(ke.name, ke.config);
        getConnectionCache().toolLists.delete(nt);
        let ee = [];
        if (serverCapabilities?.tools) {
          let Ae = await fetchToolsForClient(ke, toolContext);
          ee.push(...Ae);
        }
        let he = [];
        return (
          logFeatureOk("mcp_sdk_connect"),
          logManifestOutcome(R.manifestOutcome, !0),
          { client: ke, tools: ee, commands: he }
        );
      } catch (error) {
        return (
          logFeatureBad("mcp_sdk_connect", Q ? "mcp_sdk_connect_timeout" : "mcp_sdk_connect_failed"),
          logManifestOutcome(R.manifestOutcome, !1),
          logMCPError(M, `Failed to connect SDK MCP server: ${error}`),
          { client: { type: "failed", name: M, config: { ...j, scope: "user" } }, tools: [], commands: [] }
        );
      }
    }),
  );
  for (let M of settled)
    if (M.status === "fulfilled")
      (clients.push(M.value.client), tools.push(...M.value.tools), commands.push(...M.value.commands));
  if (clients.some((M) => M.type === "connected" && !!M.capabilities?.resources)) {
    if (
      ![ListMcpResourcesTool, ReadMcpResourceTool].some((j) => tools.some((R) => toolMatchesName(R, j.name)))
    )
      tools.push(ListMcpResourcesTool, ReadMcpResourceTool, H5);
  }
  return { clients: clients, tools: tools, commands: commands };
}
/**
 * clearServerCache：断开并清除某服务器的连接与所有记忆化列表缓存。
 */
//@ chunk-8t8n4kdh.js:205634-205823 fingerprint = clearServerCache (0.581)
async function clearServerCache_3(e) {
  await Promise.all(
    e.map(async (n) => {
      if (n.type !== "connected") return;
      try {
        await n.cleanup();
      } catch (error) {
        logForDebugging(`MCP client cleanup failed for ${n.name}: ${error}`, { level: "error" });
      }
    }),
  );
}
/**
 * isMcpSessionExpiredError：HTTP 404 + JSON-RPC -32001 一类"会话不存在"错误判定，触发重新建立会话。
 */
//@ chunk-z1n5m6nf.js:41559-41859 callgraph-fingerprint = isMcpSessionExpiredError (0.543)
function isMcpSessionExpiredError_2(error) {
  if (error instanceof McpSessionExpiredError) return !0;
  if (error instanceof McpError) return !1;
  let httpStatus = "code" in error ? error.code : void 0;
  if (httpStatus === 404)
    return !(error instanceof Tue && error.message.includes("Failed to open SSE stream"));
  return (
    httpStatus === 400 &&
    /Server not initialized|No valid session ID|Mcp-Session-Id header is required/i.test(error.message)
  );
}
/**
 * 截断服务器 instructions（超过上限按描述截断规则处理，标注 `Server instructions`）；空值原样返回。（v1）
 */
//@ chunk-z1n5m6nf.js:41859-41937 layout
function truncateServerInstructions_2(e, r, n = vF()) {
  if (!e) return e;
  return truncateDescription_2(e, "Server instructions", r, n);
}
//@ chunk-z1n5m6nf.js:41937-42091 layout
function truncateDescription_2(e, r, n, s = vF()) {
  if (e.length <= s) return e;
  if (n !== void 0) logMCPDebug(n, `${r} truncated from ${e.length} to ${s} chars`);
  return truncateToLength(e, s) + "\u2026 [truncated]";
}
//@ chunk-z1n5m6nf.js:42091-42269 layout
var TRANSIENT_NETWORK_ERROR_CODES_2 = ["ECONNRESET", "ETIMEDOUT", "EPIPE", "EHOSTUNREACH", "ECONNREFUSED"],
  Zr = new Set([...TRANSIENT_NETWORK_ERROR_CODES_2, "ConnectionRefused", "ConnectionClosed"]),
  Qr = /^Error POSTing to endpoint \(HTTP (\d+)\)/;
//@ chunk-z1n5m6nf.js:42269-42327 layout
function ro(e) {
  return typeof e === "number" && e >= 100 && e <= 599;
}
/**
 * isTransientMcpError：AbortError、瞬时网络错误码或 5xx 视为可重试。
 */
//@ chunk-z1n5m6nf.js:42327-42781 layout
function isTransientMcpError_2(e) {
  if (e.name === "AbortError") return !0;
  let r = "code" in e ? e.code : void 0,
    n = "status" in e ? e.status : void 0,
    s = Qr.exec(e.message)?.[1];
  if (ro(n) || ro(r) || (typeof r === "number" && r < 0) || (s !== void 0 && ro(Number(s)))) return !1;
  if (typeof r === "string" && Zr.has(r)) return !0;
  let message = e.message;
  return (
    TRANSIENT_NETWORK_ERROR_CODES_2.some((y) => message.includes(y)) ||
    message.includes("Body Timeout Error") ||
    /\bterminated\b/.test(message) ||
    message.includes("SSE stream disconnected") ||
    message.includes("Failed to reconnect SSE stream")
  );
}
//@ chunk-z1n5m6nf.js:42781-42816 layout
var tn = 1e8,
  Uo = 20,
  on = [250, 500, 1000];
//@ chunk-z1n5m6nf.js:42816-43219 layout
function rn(e) {
  if (isListAuthError_2(e)) return !1;
  if (isClaudeAiBearerRejectedError_2(e)) return !1;
  if (e instanceof DOMException && e.name === "TimeoutError") return !1;
  if (e instanceof HttpBodyOverflowError_2) return !1;
  if (
    e instanceof Error &&
    !(e instanceof McpError) &&
    "code" in e &&
    typeof e.code === "number" &&
    e.code >= 400 &&
    e.code < 500
  )
    return !1;
  if (e instanceof McpError)
    return (
      e.code !== ErrorCode.RequestTimeout &&
      e.code !== ErrorCode.MethodNotFound &&
      e.code !== ErrorCode.InvalidRequest &&
      e.code !== ErrorCode.InvalidParams
    );
  return !0;
}
//@ chunk-z1n5m6nf.js:43219-43929 layout
async function listAllPages(e, r, n, s, h, y) {
  let S = !1;
  for (let T = 0; ; T++) {
    let M = [],
      w = new Set(),
      R,
      E = 0,
      Q;
    try {
      do {
        let request = await e.request({ method: s, ...(R && { params: { cursor: R } }) }, h, {
          timeout: getConnectionTimeoutMs(),
        });
        E++;
        let U = y(request);
        if (U) M.push(...U);
        if (R) w.add(R);
        if (((R = request.nextCursor), R && w.has(R))) {
          Q = "repeated_cursor";
          break;
        }
        if (R && E >= Uo) {
          Q = "capped";
          break;
        }
      } while (R);
      if (Q === "repeated_cursor")
        logMCPDebug(r, `${s} returned a nextCursor already sent in this walk (page ${E}); stopping`);
      if (Q === "capped") logMCPDebug(r, `${s} still returning nextCursor after ${Uo} pages; stopping`);
      if (E > 1) logListPagination(s, E, M.length, Q ?? "complete");
      return M;
    } catch (error) {
      if (E > 0 && !S) ((S = !0), logListPagination(s, E, M.length, "error"));
      let U = on[T];
      if (U === void 0 || !rn(error)) throw error;
      (logMCPDebug(r, `${s} failed (${describeConnectError(error, n)}); retrying in ${U}ms`), await sleep(U));
    }
  }
}
//@ chunk-z1n5m6nf.js:43929-44031 layout
function logListPagination(e, r, n, s) {
  logEvent("tengu_mcp_list_paginated", {
    method: fromEnum(e),
    pageCount: r,
    itemCount: n,
    outcome: fromEnum(s),
  });
}
/**
 * MCP 工具调用总超时（v1 副本）：配置 timeout ≥1000 优先，其次 MCP_TOOL_TIMEOUT，再默认值，夹在 1000ms 与上限之间。
 */
//@ chunk-z1n5m6nf.js:44031-44169 layout = getMcpToolTimeoutMs (1)
function getMcpToolTimeoutMs_3(e) {
  let n = (e?.timeout !== void 0 && e.timeout >= 1000 ? e.timeout : void 0) ?? env.MCP_TOOL_TIMEOUT ?? tn;
  return Math.min(Math.max(n, 1000), ec);
}
//@ chunk-z1n5m6nf.js:44169-44233 layout
var REMOTE_TOOL_IDLE_TIMEOUT_MS_2 = 300000,
  STDIO_TOOL_IDLE_TIMEOUT_MS_2 = 1800000,
  NO_IDLE_TIMEOUT_TRANSPORTS_2 = new Set(["sse-ide", "ws-ide", "sdk"]);
/**
 * getMcpToolIdleTimeoutMs（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:44233-44470 layout
function getMcpToolIdleTimeoutMs_2(e) {
  let r = e?.type ?? "stdio";
  if (NO_IDLE_TIMEOUT_TRANSPORTS_2.has(r)) return 0;
  let n =
    env.CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT ??
    (r === "stdio" ? STDIO_TOOL_IDLE_TIMEOUT_MS_2 : REMOTE_TOOL_IDLE_TIMEOUT_MS_2);
  if (n <= 0) return 0;
  let s = e?.timeout !== void 0 && e.timeout >= 1000 ? e.timeout : 0;
  return Math.min(Math.max(n, s, 1000), getMcpToolTimeoutMs_3(e));
}
//@ chunk-z1n5m6nf.js:44470-44512 layout
var ln = () => require("./chunk-3k33hyyp.js");
/**
 * needs-auth 缓存常量与懒加载模块（v1 副本）：TTL 15 分钟 / 4 小时 / 90 秒、时钟偏差 1 分钟。
 */
//@ chunk-z1n5m6nf.js:44512-44678 layout
var artifactPermissionRulesModuleV1 = () => require("./chunk-p5cstt88.js"),
  artifactsMcpLaptopModuleV1 = () => require("./chunk-d5fbj7hf.js"),
  claudeDocsWakeModuleV1 = () => require("./chunk-t6p2wq66.js"),
  AUTH_CACHE_VERSION_2 = "v1",
  NEEDS_AUTH_CACHE_TTL_MS_2 = 900000,
  NEEDS_AUTH_CACHE_LONG_TTL_MS_2 = 14400000,
  NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS_2 = 90000,
  AUTH_CACHE_CLOCK_SKEW_MS_2 = 60000;
/**
 * isMcpAuthCached（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:44678-45203 layout
async function isMcpAuthCached_2(e, r, n) {
  let h = (await readNeedsAuthCache(n))[e];
  if (!h) return !1;
  if (r.type === "claudeai-proxy" && h.id !== r.id) return !1;
  if ((r.type === "stdio" || r.type === void 0) && r.pluginSource === void 0) return !1;
  if ((r.type === "stdio" || r.type === void 0) && r.pluginSource !== void 0 && h.id !== Yz(r)) return !1;
  if ((r.type === "http" || r.type === "sse") && r.pluginSource !== void 0 && h.id !== void 0) return !1;
  let y =
      r.type === "claudeai-proxy" ||
      (r.pluginSource !== void 0 && (r.type === "http" || r.type === "sse") && !usesNonOAuthAuth(r)),
    S = h.ttlMs ?? (y ? NEEDS_AUTH_CACHE_LONG_TTL_MS_2 : NEEDS_AUTH_CACHE_TTL_MS_2),
    T = Date.now() - h.timestamp;
  return T > -AUTH_CACHE_CLOCK_SKEW_MS_2 && T < S;
}
//@ chunk-z1n5m6nf.js:45203-45377 layout
async function writeAuthCacheV5_2(e, r) {
  let write = await e.write(_Bt(), jsonStringify(r), { publishDiscipline: "inPlace" });
  if (!write.ok)
    logMCPDebug("auth-cache", `needs-auth cache v5 write failed: ${formatStorageError(write.error)}`);
  return write.ok;
}
//@ chunk-z1n5m6nf.js:45377-45687 file-local
function isMcpAuthCached_3(e, r, n, s) {
  let h = ht();
  h.authCacheWriteChain = h.authCacheWriteChain
    .then(async () => {
      let y = await readNeedsAuthCache(s);
      if (
        ((y[e] = { timestamp: Date.now(), ...(r && { id: r }), ...(n !== void 0 && { ttlMs: n }) }),
        isStorageV5Enabled() && s !== void 0)
      ) {
        if (!(await writeAuthCacheV5_2(s, y))) return;
      } else {
        let S = getFileReader(),
          T = needsAuthCachePath();
        (await S.mkdir(dirname(T)), await S.write(T, jsonStringify(y)));
      }
      bBt();
    })
    .catch(() => {});
}
/**
 * clearMcpAuthCacheEntry（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:45687-45939 placement
function clearMcpAuthCacheEntry_2(e, r) {
  let n = ht(),
    s = n.authCacheWriteChain
      .then(async () => {
        let h = await readNeedsAuthCache(r);
        if (!(e in h)) return;
        if ((delete h[e], isStorageV5Enabled() && r !== void 0)) {
          if (!(await writeAuthCacheV5_2(r, h))) return;
        } else await getFileReader().write(needsAuthCachePath(), jsonStringify(h));
        bBt();
      })
      .catch(() => {});
  return ((n.authCacheWriteChain = s), s);
}
/**
 * clearMcpDiscoveryCaches（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:45939-46182 placement
function clearMcpDiscoveryCaches_2(e = new Set(), r = !0) {
  if (!fd()) return;
  if (r) noteIdentityChanged();
  bumpIdentityEpoch();
  let n = (s) => {
    if (s) retainCacheKeys(s, e);
  };
  if (!ht().holdStaleReauthEntryForTest) getConnectionCache().reauthInFlight.clear();
  (getConnectionCache().lapsedCcrSignIns.clear(),
    n(connectToServer_2.cache),
    n(listMcpTools.cache),
    n(fetchCommandsForClient_2.cache),
    n(fetchResourcesForClient_2.cache),
    n(fetchResourceTemplatesForClient_2.cache));
}
//@ chunk-z1n5m6nf.js:46182-46289 placement
function mcpBaseUrlAnalytics(e, r) {
  let n = ET(e),
    s = r ? { mcpServerKeyHash: toolNameForTelemetry(r) } : {};
  if (n) return { mcpServerBaseUrl: n, ...s };
  return s;
}
//@ chunk-z1n5m6nf.js:59674-59787 placement
function normalizeImageMimeType_2(e) {
  if (!e) return !1;
  let lower = firstLineOf(e, ";").trim().toLowerCase();
  return qn.has(lower === "image/jpg" ? "image/jpeg" : lower);
}
//@ chunk-z1n5m6nf.js:59787-59800 placement
var Vo = 60000;
//@ chunk-z1n5m6nf.js:59800-59946 placement = getMcpToolTimeoutMs (1)
function getMcpToolTimeoutMs_4(e) {
  let n = (e?.timeout !== void 0 && e.timeout >= 1000 ? e.timeout : void 0) ?? env.MCP_TOOL_TIMEOUT;
  return n !== void 0 ? Math.min(Math.max(n, Vo), ec) : Vo;
}
//@ chunk-z1n5m6nf.js:59946-59989 placement
function getMcpRequestTimeoutMs_2(e) {
  return Math.max(getMcpToolTimeoutMs_4(e), getConnectionTimeoutMs());
}
//@ chunk-z1n5m6nf.js:59989-60034 placement = MCP_STREAMABLE_HTTP_ACCEPT (1)
var MCP_STREAMABLE_HTTP_ACCEPT_2 = "application/json, text/event-stream";
//@ chunk-z1n5m6nf.js:60034-60112 placement
function ao(e) {
  return async (r, n) => {
    try {
      return await e(r, n);
    } catch (error) {
      rethrowRedactedFetchError(error, r);
    }
  };
}
/**
 * wrapFetchWithTimeout（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:60112-60670 placement = wrapFetchWithTimeout (0.76)
function wrapFetchWithTimeout_2(e, r) {
  let n = getMcpRequestTimeoutMs_2(r);
  return async (url, init) => {
    if ((init?.method ?? "GET").toUpperCase() === "GET") return e(url, init);
    let headers = new Headers(init?.headers);
    if (!headers.has("accept")) headers.set("accept", MCP_STREAMABLE_HTTP_ACCEPT_2);
    if (shouldPropagateTraceContext()) {
      let R = getActiveSpanId();
      if (R && !headers.has("traceparent")) headers.set("traceparent", R);
    }
    let controller = new AbortController(),
      timer = setTimeout(
        (R) => R.abort(new DOMException("The operation timed out.", "TimeoutError")),
        requestTimeoutForBody(n, init?.body),
        controller,
      );
    timer.unref?.();
    let w = init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal;
    try {
      return await e(url, {
        ...init,
        headers: headers,
        signal: w,
        ...(getMcpToolTimeoutMs_4(r) > 300000 && { timeout: !1 }),
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
  let n = getFeatureValue_CACHED_MAY_BE_STALE(e, []);
  if (!Array.isArray(n) || n.length === 0) return !1;
  if (n.includes("*")) return !0;
  if (!("url" in r) || typeof r.url !== "string") return !1;
  try {
    let lower = new URL(r.url).hostname.toLowerCase();
    return n.some((h) => {
      if (typeof h !== "string" || h === "") return !1;
      let lower_2 = h.toLowerCase();
      return lower === lower_2 || lower.endsWith(`.${lower_2}`);
    });
  } catch {
    return !1;
  }
}
//@ chunk-z1n5m6nf.js:61352-61419 placement
function shouldNormalizeRootCombinators_2(e) {
  return isServerHostInGateList("tengu_mcp_normalize_root_combinators", e);
}
//@ chunk-z1n5m6nf.js:61419-61485 placement
function shouldDropInvalidToolSchemas_2(e) {
  return isServerHostInGateList("tengu_mcp_drop_invalid_tool_schemas", e);
}
/**
 * 测试专用：设置是否保留过期的重新认证条目（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:61485-61599 placement
function setHoldStaleReauthEntryForTest_2(e) {
  if (e) throw Error("setHoldStaleReauthEntryForTest is test-only");
  ht().holdStaleReauthEntryForTest = e;
}
//@ chunk-z1n5m6nf.js:61599-61647 placement
function Hl(e) {
  ht().reauthDecisionSinkForTest = e;
}
/**
 * getMcpRoots：roots/list 响应：项目根（或会话目录）、额外工作目录与可选 staging 根，转成去重的 file:// URI。
 */
//@ chunk-z1n5m6nf.js:61647-61957 placement
function getMcpRoots_2(e = !1) {
  let r = [];
  if (e)
    try {
      r = [pluginToolStagingRoot()];
    } catch (error) {
      logForDebugging(`MCP: staging root unavailable, omitted from roots/list: ${errorMessage(error)}`);
    }
  let n = new Set(),
    s = [],
    h = getToolsMachine(),
    y = h ? (h.directory?.path ?? null) : getOriginalCwdOrNull();
  for (let S of [...(y === null ? [] : [y]), ...getAnnouncedDirectories(), ...r]) {
    let href = pathToFileURL(S).href;
    if (n.has(href)) continue;
    (n.add(href), s.push({ uri: href }));
  }
  return { roots: s };
}
//@ chunk-z1n5m6nf.js:61957-61987 placement
var ROOTLESS_PLUGIN_NAMES_2 = new Set(["documents"]);
//@ chunk-z1n5m6nf.js:61987-62131 placement
function isDocumentsPluginServer_2(e) {
  if (getPlatform() === "windows") return !1;
  if (!e.pluginSource) return !1;
  try {
    return ROOTLESS_PLUGIN_NAMES_2.has(parsePluginIdentifier(e.pluginSource).name.toLowerCase());
  } catch {
    return !1;
  }
}
//@ chunk-z1n5m6nf.js:62131-62268 placement
function notifyRootsListChanged_2() {
  for (let liveClient of getConnectionCache().liveClients)
    liveClient.sendRootsListChanged().catch((r) => {
      logForDebugging(`MCP: failed to send roots/list_changed: ${describeErrorBrief(r)}`);
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
  ],
  POST_ERROR_PREFIX = "Error POSTing to endpoint: ";
//@ chunk-z1n5m6nf.js:62777-62983 placement
function isNonJsonRpc4xxPostError(e) {
  if (!(e instanceof Tue)) return !1;
  let r = e.code ?? 0;
  if (!(r >= 400 && r < 500) || r === 401 || r === 403 || r === 429) return !1;
  let index = e.message.indexOf(POST_ERROR_PREFIX);
  if (index === -1) return !0;
  return !isJsonRpcErrorBody_2(e.message.slice(index + POST_ERROR_PREFIX.length));
}
//@ chunk-z1n5m6nf.js:62983-63171 placement
function isJsonRpcErrorBody_2(e) {
  let found = e.split(/\r?\n/).find((s) => s.startsWith("data:")),
    n = safeParseJSON(found === void 0 ? e : found.slice(5), !1);
  return isJSONRPCErrorResponse(
    typeof n === "object" && n !== null && "id" in n && n.id === null ? { ...n, id: void 0 } : n,
  );
}
//@ chunk-z1n5m6nf.js:63171-63183 placement
var ts = 5000;
/**
 * makeConnectTimeoutError：连接超时错误，开关 tengu_mcp_connect_timeout_retry 打开时带 code CONNECT_TIMEOUT 以便重试。
 */
//@ chunk-z1n5m6nf.js:63183-63339 placement
function makeConnectTimeoutError(e) {
  let r = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(e, "MCP connection timeout");
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_connect_timeout_retry", !0))
    return Object.assign(r, { code: "CONNECT_TIMEOUT" });
  return r;
}
//@ chunk-z1n5m6nf.js:63339-63443 layout = getServerCommandArray (0.781)
function getServerCommandArray(e, r, n) {
  if ((r.type === "stdio" || r.type === void 0) && r.pluginSource !== void 0)
    isMcpAuthCached_3(e, Yz(r), void 0, n);
}
/**
 * connectToServer（v1）：同 v2 的连接入口，但客户端为旧 SDK（只有 initialize 握手，server/discover 只在 stateless claude.ai 代理本地应答中出现）。
 */
//@ chunk-z1n5m6nf.js:63443-85309 fingerprint = connectToServer (0.606)
var connectToServer_2 = memoizeWithExternalCache(
  async (name, serverRef, serverStats, storageV5, credentials, y, S) => {
    Po();
    let connectStartTime = Date.now(),
      M = pBt(S?.clock ?? Aa),
      w,
      R = identityEpoch(),
      E = getAnnouncedDirectories(),
      Q = serverRef.type ?? "stdio";
    if (
      (logForDiagnosticsNoPII("info", "mcp_connect_starting", { transport: Q }), isUnconfiguredUrl(serverRef))
    ) {
      let j = serverRef.configError ?? "No URL configured for this server";
      return (
        logMCPDebug(name, j),
        logForDiagnosticsNoPII("info", "mcp_connect_skipped", { transport: Q, reason: "unconfigured" }),
        { name: name, type: "failed", config: serverRef, error: j, errorCode: "UNCONFIGURED" }
      );
    }
    {
      let configError = serverRef.configError;
      if (!configError && "url" in serverRef)
        try {
          new URL(serverRef.url);
        } catch {
          configError = "'url' is not a valid URL. Update the server's config and reconnect.";
        }
      if (configError)
        return (
          logEvent("tengu_mcp_server_config_invalid", {
            transportType: fromEnum(serverRef.type ?? "stdio"),
            field: lit("url"),
            source: lit(serverRef.configError ? "loader" : "connect"),
          }),
          logMCPDebug(name, configError),
          logMCPError(name, configError),
          logForDiagnosticsNoPII("warn", "mcp_connect_failed", {
            transport: Q,
            duration_ms: Date.now() - connectStartTime,
            reason: "invalid_config",
          }),
          logFeatureBad("mcp_connect", "mcp_connect_invalid_config"),
          { name: name, type: "failed", config: serverRef, error: configError, errorCode: "INVALID_CONFIG" }
        );
    }
    let H,
      U,
      re = !1,
      he = !1,
      G,
      q;
    try {
      let Pe = function () {
          let now = Date.now();
          for (let activeCallWatchdog of te.activeCallWatchdogs)
            if (activeCallWatchdog.armedAt === 0) activeCallWatchdog.armedAt = now;
        },
        j = isCcrInjectedMcpUrl(name, serverRef),
        fe = hasCliOwnedBearer(serverRef),
        pe =
          (serverRef.type === "sse" || serverRef.type === "http") && configHasAuthorizationHeader(serverRef),
        ge =
          serverRef.type === "sse" || serverRef.type === "http" || serverRef.type === "ws"
            ? await getMcpServerHeaders(name, serverRef)
            : {},
        ce =
          (serverRef.type === "sse" || serverRef.type === "http") &&
          !!serverRef.headersHelper &&
          hasAuthorizationHeader(ge),
        le =
          (serverRef.type === "sse" || serverRef.type === "http") &&
          !pe &&
          !ce &&
          !fe &&
          !j &&
          isFirstPartyMcpUrl(serverRef.url) &&
          isFirstPartyProvider() &&
          (!!(
            isStorageV5Enabled() && credentials !== void 0
              ? await getClaudeAIOAuthTokensAsync(credentials)
              : getClaudeAIOAuthTokens()
          )?.accessToken ||
            (isDesignMcpUrl(serverRef.url) && (await Foe(credentials))));
      if (le)
        logEvent("tengu_mcp_first_party_auto_auth", {
          transportType: fromEnum(serverRef.type),
          ...mcpBaseUrlAnalytics(serverRef, name),
        });
      let k = {};
      if (serverRef.type === "sse") {
        recordPresentedHeaderSecrets(serverRef.headers, ge);
        let P = pe || ce || le || fe ? void 0 : new ClaudeAuthProvider(name, serverRef);
        U = P;
        let x = await mcpProxyFetchOptions(serverRef.url),
          D = boundedFetch(ao(createFetchWithDefaults(void 0, x)));
        if (P) D = wrapFetchWithStepUpDetection(D, P);
        if (((D = wrapFetchWithTimeout_2(D, serverRef)), le))
          D = wrapFetchWithFirstPartyAuth_2(D, credentials, k);
        let transportOptions = {
            authProvider: P,
            fetch: D,
            requestInit: {
              ...x,
              headers: { "User-Agent": getMCPUserAgent(), "Accept-Encoding": "identity", ...ge },
            },
          },
          ue = ao(async (url, init) => {
            let Me = {},
              Be = await P?.tokens();
            if (Be) Me.Authorization = `Bearer ${Be.access_token}`;
            let et = await mcpProxyFetchOptions(String(url));
            return fetch(url, { ...init, ...et, headers: mergeRequestHeaders_2(init?.headers, Me, ge) });
          });
        ((transportOptions.eventSourceInit = {
          fetch: boundedFetch(
            P
              ? wrapFetchWithStepUpDetection(ue, P)
              : le
                ? wrapFetchWithFirstPartyAuth_2(ue, credentials, k)
                : ue,
          ),
        }),
          (G = new _t(new URL(serverRef.url), transportOptions)),
          logMCPDebug(name, "SSE transport initialized, awaiting connection"));
      } else if (serverRef.type === "sse-ide") {
        logMCPDebug(name, `Setting up SSE-IDE transport to ${redactUrlSecrets(serverRef.url)}`);
        let P = {
          fetch: boundedFetch(globalThis.fetch),
          requestInit: { headers: { "User-Agent": getMCPUserAgent(), "Accept-Encoding": "identity" } },
        };
        G = new _t(new URL(serverRef.url), P);
      } else if (serverRef.type === "ws-ide") {
        let P = getWebSocketTLSOptions(serverRef.url);
        Ny().record(serverRef.authToken);
        let x = {
            "User-Agent": getMCPUserAgent(),
            ...(serverRef.authToken && { "X-Claude-Code-Ide-Authorization": serverRef.authToken }),
          },
          D = new globalThis.WebSocket(serverRef.url, {
            protocols: ["mcp"],
            headers: x,
            proxy: getWebSocketProxyUrl(serverRef.url),
            tls: P || void 0,
          });
        G = new WebSocketTransport(D, (z) => JSONRPCMessageSchema.parse(z));
      } else if (serverRef.type === "ws") {
        (recordPresentedHeaderSecrets(serverRef.headers, ge),
          logMCPDebug(name, `Initializing WebSocket transport to ${redactUrlSecrets(serverRef.url)}`));
        let P = getWebSocketTLSOptions(serverRef.url),
          x = j ? getSessionIngressAuthToken() : null;
        Ny().record(x ?? void 0);
        let wsHeaders = {
            "User-Agent": getMCPUserAgent(),
            ...(x && { Authorization: `Bearer ${x}` }),
            ...ge,
          },
          z = redactHeaders(wsHeaders);
        logMCPDebug(
          name,
          `WebSocket transport options: ${jsonStringify({ url: redactUrlSecrets(serverRef.url), headers: z, hasSessionAuth: !!x })}`,
        );
        let ie = new globalThis.WebSocket(serverRef.url, {
          protocols: ["mcp"],
          headers: wsHeaders,
          proxy: getWebSocketProxyUrl(serverRef.url),
          tls: P || void 0,
        });
        G = new WebSocketTransport(ie, (ue) => JSONRPCMessageSchema.parse(ue));
      } else if (serverRef.type === "http") {
        if ((recordPresentedHeaderSecrets(serverRef.headers, ge), keepsMCPDebug()))
          (logMCPDebug(name, `Initializing HTTP transport to ${redactUrlSecrets(serverRef.url)}`),
            logMCPDebug(name, `Node version: ${process.version}, Platform: linux`),
            logMCPDebug(
              name,
              `Environment: ${jsonStringify({ NODE_OPTIONS: env.NODE_OPTIONS || "not set", UV_THREADPOOL_SIZE: env.UV_THREADPOOL_SIZE || "default", HTTP_PROXY: redactUrlsInText(env.HTTP_PROXY || "not set"), HTTPS_PROXY: redactUrlsInText(env.HTTPS_PROXY || "not set"), NO_PROXY: env.NO_PROXY || "not set" })}`,
            ));
        let P = pe || ce || le || fe || j ? void 0 : new ClaudeAuthProvider(name, serverRef);
        U = P;
        let x = await mcpProxyFetchOptions(serverRef.url),
          wsHeadersForLogging = boundedFetch(ao(createFetchWithDefaults(j ? hostedWorkerFetch : void 0, x)), {
            refusesCodings: issuerKey_3(serverRef.url),
          });
        if (P) wsHeadersForLogging = wrapFetchWithStepUpDetection(wsHeadersForLogging, P);
        if (((wsHeadersForLogging = wrapFetchWithTimeout_2(wsHeadersForLogging, serverRef)), le))
          wsHeadersForLogging = wrapFetchWithFirstPartyAuth_2(wsHeadersForLogging, credentials, k);
        if (j)
          wsHeadersForLogging = wrapFetchSkipListenGet(
            wrapFetchWithCcrSessionAuth_2(wsHeadersForLogging, y, ir(name, serverRef)),
            name,
            serverRef.url,
          );
        if (
          ((wsHeadersForLogging = restrictRemoteRepoCalls(wsHeadersForLogging, serverRef)),
          issuerKey_3(serverRef.url))
        ) {
          let ie = wsHeadersForLogging;
          wsHeadersForLogging = (value, key) => {
            let me = key?.method === "POST" ? getRequestTimingStore()?.mark("own") : void 0;
            return ie(value, key).finally(me);
          };
        }
        if (fe) wsHeadersForLogging = wrapFetchWithCliOwnedBearer_2(wsHeadersForLogging, serverRef);
        let transportOptions = {
          authProvider: P,
          fetch: wsHeadersForLogging,
          requestInit: {
            ...x,
            headers: { "User-Agent": getMCPUserAgent(), "Accept-Encoding": "identity", ...ge },
          },
        };
        if (keepsMCPDebug()) {
          let ie = transportOptions.requestInit?.headers
            ? redactHeaders(transportOptions.requestInit.headers)
            : void 0;
          logMCPDebug(
            name,
            `HTTP transport options: ${jsonStringify({ url: redactUrlSecrets(serverRef.url), headers: ie, hasAuthProvider: !!P, timeoutMs: getMcpRequestTimeoutMs_2(serverRef) })}`,
          );
        }
        if (
          ((G = new zYn(new URL(serverRef.url), transportOptions)),
          logMCPDebug(name, "HTTP transport created successfully"),
          !isCcrHostedConfig(serverRef) && !isFirstPartyMcpUrl(serverRef.url) && !fe)
        )
          q = ({
            postMethodNotAllowed: postMethodNotAllowed,
            dialSignal: dialSignal,
            dialConnected: dialConnected,
          }) => {
            let me = (Je) =>
                dialConnected()
                  ? Je
                  : { ...Je, signal: Je?.signal ? AbortSignal.any([Je.signal, dialSignal]) : dialSignal },
              Me = !1,
              Be = async (value, key) => {
                let We = await wsHeadersForLogging(value, me(key));
                if (!postMethodNotAllowed && !Me) {
                  if (We.status === 401)
                    throw (
                      await We.body?.cancel().catch(() => {}),
                      Error(
                        "legacy HTTP+SSE stream GET answered 401 after the initialize POST was not a 405; not starting OAuth against this URL",
                      )
                    );
                  Me = We.ok;
                }
                return We;
              },
              et = (Je, Ye) =>
                Ye?.body instanceof URLSearchParams && Ye.body.has("grant_type")
                  ? wsHeadersForLogging(Je, Ye)
                  : wsHeadersForLogging(Je, me(Ye));
            return new _t(new URL(serverRef.url), {
              authProvider: P,
              fetch: et,
              eventSourceInit: { fetch: Be },
              requestInit: transportOptions.requestInit,
            });
          };
      } else if (serverRef.type === "sdk") throw Error("SDK servers should be handled in print.ts");
      else if (serverRef.type === "claudeai-proxy") {
        if (!isFirstPartyProvider())
          throw Error("claude.ai MCP proxy is not available on third-party providers");
        if (
          (logMCPDebug(name, `Initializing claude.ai proxy transport for server ${serverRef.id}`),
          !(isStorageV5Enabled() && credentials !== void 0
            ? await getClaudeAIOAuthTokensAsync(credentials)
            : getClaudeAIOAuthTokens()))
        )
          throw Error("No claude.ai OAuth token found");
        let tokens = getOauthConfig(),
          proxyUrl = `${tokens.MCP_PROXY_URL}${tokens.MCP_PROXY_PATH.replace("{server_id}", serverRef.id)}`;
        logMCPDebug(name, `Using claude.ai proxy at ${proxyUrl}`);
        let fetchWithAuth = getProxyFetchOptions({ url: proxyUrl }),
          ie = createClaudeAiProxyFetch_2(
            boundedFetch(createFetchWithDefaults(void 0, fetchWithAuth)),
            credentials,
          ),
          proxyOptions = t4n(),
          Se = proxyOptions || isStatelessClaudeAiProxy_2(serverRef);
        if (Se)
          logMCPDebug(
            name,
            proxyOptions
              ? "GET notification stream disabled for claude.ai connectors; a GET the SDK sends to the proxy URL is answered locally with 405"
              : "GET notification stream disabled (stateless connector); if the SDK requests it, it gets a local 405",
          );
        let transportOptions = {
          fetch: Se
            ? answerGetStreamLocally_2(wrapFetchWithTimeout_2(ie, serverRef), proxyUrl)
            : wrapFetchWithTimeout_2(ie, serverRef),
          requestInit: {
            ...fetchWithAuth,
            headers: {
              "User-Agent": getMCPUserAgent(),
              "Accept-Encoding": "identity",
              "X-Mcp-Client-Session-Id": getSessionId(),
            },
          },
        };
        ((G = new zYn(new URL(proxyUrl), transportOptions)),
          logMCPDebug(name, "claude.ai proxy transport created successfully"));
      } else if (isStdioConfig(serverRef) && isClaudeInChromeMCPServer(name)) {
        let { isClaudeInChromeAllowed: isClaudeInChromeAllowed } = await import("./chunk-2jvt0tn4.js");
        if (!isClaudeInChromeAllowed())
          return (
            logMCPDebug(name, "Skipping connection (Claude in Chrome is blocked by org policy)"),
            {
              name: name,
              type: "failed",
              config: serverRef,
              error: BLOCKED_BY_POLICY_REASON,
              errorCode: "POLICY_BLOCKED",
            }
          );
        let { createChromeContext: createChromeContext } = await import("./chunk-ztt2k9pv.js"),
          {
            createChromeSocketClient: createChromeSocketClient,
            createClaudeForChromeMcpServer: createClaudeForChromeMcpServer,
          } = await import("./chunk-3ewc7v9f.js"),
          { createLinkedTransportPair: createLinkedTransportPair } = await import("./chunk-qa6ep5c8.js"),
          { setChromeBinding: setChromeBinding } = await import("./chunk-yx8pxhkm.js"),
          { registerChromeTabGroupCleanup: registerChromeTabGroupCleanup } =
            await import("./chunk-9a6n2431.js"),
          me = createChromeContext(serverRef.env, {
            availabilityFunnel: !0,
            credentials: credentials,
            bearerGate: async () => isClaudeInChromeAllowed(),
          }),
          context = createChromeSocketClient(me);
        (setChromeBinding(me, context),
          registerChromeTabGroupCleanup(),
          (H = createClaudeForChromeMcpServer(me, context)));
        let [Be, et] = createLinkedTransportPair();
        (await H.connect(et), (G = Be), logMCPDebug(name, "In-process Chrome MCP server started"));
      } else if (serverRef.type === "stdio" || !serverRef.type) {
        CR();
        let P = () => ({
            shellPrefix: env.CLAUDE_CODE_SHELL_PREFIX,
            baseEnv: shouldUseMcpAllowlistEnv() ? { ...eo(), ...agentProxyEnv() } : { ...subprocessEnv() },
          }),
          { shellPrefix: shellPrefix, baseEnv: baseEnv } = runWithPluginWriteScope(serverRef, P),
          z = shellPrefix || serverRef.command,
          ie = shellPrefix ? [shellQuoteArgs([serverRef.command, ...serverRef.args])] : serverRef.args,
          {
            command: command,
            args: args,
            pending: pending,
            capped: capped,
          } = isMcpServerBackingToolHook(name)
            ? { command: z, args: ie, pending: !1, capped: !1 }
            : wrapCommandInCgroup("mcp", z, ie);
        ((re = pending), (he = capped));
        let {
            CLAUDE_CODE_CHILD_SESSION: CLAUDE_CODE_CHILD_SESSION,
            CLAUDE_CODE_CHROME_MCP_ORG_DENIED: CLAUDE_CODE_CHROME_MCP_ORG_DENIED,
            ...Je
          } = baseEnv,
          Ye = getProjectConfigRoot(),
          We = {
            ...Je,
            CLAUDE_PROJECT_DIR: Ye ?? getProjectRoot(),
            CLAUDE_CODE_SESSION_ID: getSessionId(),
            CLAUDECODE: "1",
            ...serverRef.env,
            ...(!isPolicyAllowed("allow_claude_browser_extension") && {
              CLAUDE_CODE_CHROME_MCP_ORG_DENIED: "1",
            }),
          };
        (checkPluginBunOptions(serverRef.pluginSource, We, Je),
          (G = new BoundedStdioTransport({
            command: command,
            args: args,
            env: We,
            stderr: "pipe",
            ...(Ye !== null && { cwd: Ye }),
          })));
      } else throw Error(`Unsupported server type: ${serverRef.type}`);
      let L,
        be,
        stderrOutput = "";
      if (serverRef.type === "stdio" || !serverRef.type) {
        let P = G;
        if (P.stderr instanceof Readable)
          ((be = P.stderr),
            (L = (data) => {
              if (stderrOutput.length < 67108864)
                try {
                  stderrOutput += data.toString();
                } catch {}
            }),
            be.on("data", L));
      }
      let ze = () => {
          let client = new Bt(
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
              ...(MPe() && { jsonSchemaValidator: NO_OP_SCHEMA_VALIDATOR }),
            },
          );
          return (
            client.setRequestHandler(
              ListRootsRequestSchema,
              async () => (
                logMCPDebug(name, "Received ListRoots request from server"),
                getMcpRoots_2(isDocumentsPluginServer_2(serverRef))
              ),
            ),
            client
          );
        },
        X = ze();
      if (
        (logMCPDebug(name, `Starting connection with timeout of ${getConnectionTimeoutMs()}ms`),
        serverRef.type === "http" && keepsMCPDebug())
      ) {
        logMCPDebug(name, `Testing basic HTTP connectivity to ${redactUrlSecrets(serverRef.url)}`);
        try {
          let testUrl = new URL(serverRef.url),
            x = redactUrlSecrets(testUrl.href),
            D = URL.canParse(x) ? new URL(x) : void 0;
          if (
            (logMCPDebug(
              name,
              D
                ? `Parsed URL: host=${D.hostname}, port=${D.port || "default"}, protocol=${D.protocol}`
                : `Parsed URL: ${x}`,
            ),
            testUrl.hostname === "127.0.0.1" || testUrl.hostname === "localhost")
          )
            logMCPDebug(name, `Using loopback address: ${testUrl.hostname}`);
        } catch {
          logMCPDebug(name, `Failed to parse URL: ${redactUrlSecrets(serverRef.url)}`);
        }
      }
      let Le = getCachedInitializeResult_2(serverRef),
        Z = cachedDiscoverOutcome(serverRef);
      if (isStatelessClaudeAiProxy_2(serverRef)) {
        if (
          (logMCPDebug(
            name,
            Le
              ? "Stateless claudeai-proxy \u2014 resolving MCP initialize from cached projection"
              : "Stateless claudeai-proxy \u2014 no cached projection; real initialize, GET SSE suppressed",
          ),
          Z !== void 0)
        )
          logMCPDebug(
            name,
            Z === "method-not-found"
              ? "Stateless claudeai-proxy \u2014 server/discover resolved locally as legacy (method-not-found)"
              : "Stateless claudeai-proxy \u2014 resolving server/discover from cached projection",
          );
        answerHandshakeLocally_2(G, Le, Z);
      }
      guardTransportSend({ name: name }, G);
      let Ne = !1,
        Te = (P, x, D) => {
          w ??= pBt(M.clock);
          let connect = P.connect(x, { timeout: D }),
            timeoutPromise = new Promise((ue, reject) => {
              let me = M.clock.setTimeout(() => {
                if (
                  (logMCPDebug(
                    name,
                    `Connection timeout triggered after ${formatConnectElapsed(M)} (limit: ${D}ms)`,
                  ),
                  H)
                )
                  H.close().catch(() => {});
                (x.close().catch(() => {}),
                  (Ne = !0),
                  reject(
                    makeConnectTimeoutError(
                      `MCP server "${name}" connection timed out after ${getConnectionTimeoutMs()}ms`,
                    ),
                  ));
              }, D);
              connect.then(me, me);
            });
          return Promise.race([connect, timeoutPromise]);
        };
      try {
        try {
          await Te(X, G, getConnectionTimeoutMs());
        } catch (error) {
          if (
            q === void 0 ||
            (G instanceof zYn && G.protocolVersion !== void 0) ||
            !isNonJsonRpc4xxPostError(error) ||
            !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_legacy_sse_fallback", !0)
          )
            throw error;
          logMCPDebug(
            name,
            `initialize POST rejected (${truncateToLength(describeConnectError(error, serverRef), 200)}); trying legacy HTTP+SSE`,
          );
          let D = error.code === 405;
          await G.close().catch(() => {});
          let abortController = new AbortController(),
            ie = !1,
            ue = q({ postMethodNotAllowed: D, dialSignal: abortController.signal, dialConnected: () => ie });
          ((G = ue), guardTransportSend({ name: name }, ue), (X = ze()));
          let Se = U?.sawAuthChallenge === !0;
          Ne = !1;
          try {
            await Te(
              X,
              ue,
              Math.min(ts, Math.max(1000, getConnectionTimeoutMs() - (Date.now() - connectStartTime))),
            );
          } catch (error_2) {
            (await ue.close().catch(() => {}), abortController.abort());
            let Me = !Se && U?.sawAuthChallenge === !0,
              Be = mr(error_2, error_2 instanceof Mt ? error_2.code : void 0, Me);
            if (Ne && D && Me)
              throw (
                logMCPDebug(
                  name,
                  "legacy HTTP+SSE stream GET answered with an auth challenge; its auth flow outran the fallback budget, so routing to needs-auth",
                ),
                new AM(
                  `MCP server "${name}" requires authorization: its legacy HTTP+SSE stream answered with an auth challenge and the authorization flow did not finish within the connect budget`,
                )
              );
            if (Ne || (error_2 instanceof Mt && !Be) || (Be && !D))
              throw (
                logMCPDebug(
                  name,
                  `legacy HTTP+SSE not confirmed (${truncateToLength(describeConnectError(error_2, serverRef), 200)}); surfacing the POST failure`,
                ),
                error
              );
            throw error_2;
          }
          ((ie = !0), logMCPDebug(name, "connected over legacy HTTP+SSE"));
        }
        if (stderrOutput) (logMCPError(name, `Server stderr: ${stderrOutput}`), (stderrOutput = ""));
        if (L && be) (be.off("data", L), be.resume());
        let P = Date.now() - connectStartTime;
        if (
          (logMCPDebug(name, `Successfully connected (transport: ${serverRef.type || "stdio"}) in ${P}ms`),
          (serverRef.type === "stdio" || !serverRef.type) && G instanceof BoundedStdioTransport && G.pid)
        ) {
          if ((registerChildMemory("mcp_stdio", G.pid), re))
            parkPendingPid("mcp", G.pid, () => isMcpServerBackingToolHook(name));
          if (he || re) releaseMcpToolCgroup(name, G.pid);
        }
      } catch (error) {
        let x = Date.now() - connectStartTime;
        if (G instanceof BoundedStdioTransport && G.overflowError) {
          if ((logMCPError(name, G.overflowError.message), stderrOutput))
            logMCPError(name, `Server stderr: ${stderrOutput}`);
          throw G.overflowError;
        }
        if (serverRef.type === "sse" && error instanceof Error) {
          (logMCPDebug(
            name,
            `SSE Connection failed after ${x}ms: ${jsonStringify({ url: redactUrlSecrets(serverRef.url), error: describeConnectError(error, serverRef), errorType: error.constructor.name, stack: JHe(error, serverRef) === error ? error.stack : void 0 })}`,
          ),
            logMCPError(name, JHe(error, serverRef)));
          let D = await handleRemoteConnectAuthError_2({
            name: name,
            serverRef: serverRef,
            transportType: "sse",
            error: error,
            statusCode: error.code,
            sawAuthChallenge: U?.sawAuthChallenge === !0,
            hasUserAuthHeader: pe,
            helperMintsAuthHeader: ce,
            cliOwnedBearer: fe,
            useFirstPartyAuth: le,
            firstPartyBearer: k.last,
            authProvider: U,
            roundEpoch: R,
            storageV5: storageV5,
          });
          if (D) return D;
        } else if (serverRef.type === "http" && error instanceof Error) {
          let D = error;
          (logMCPDebug(
            name,
            `HTTP Connection failed after ${x}ms: ${describeConnectError(error, serverRef)} (code: ${D.code || "none"}, errno: ${D.errno || "none"})`,
          ),
            logMCPError(name, JHe(error, serverRef)));
          let z = await handleRemoteConnectAuthError_2({
            name: name,
            serverRef: serverRef,
            transportType: "http",
            error: error,
            statusCode: error.code,
            sawAuthChallenge: U?.sawAuthChallenge === !0,
            hasUserAuthHeader: pe,
            helperMintsAuthHeader: ce,
            cliOwnedBearer: fe,
            useFirstPartyAuth: le,
            firstPartyBearer: k.last,
            authProvider: U,
            roundEpoch: R,
            storageV5: storageV5,
          });
          if (z) return z;
        } else if (serverRef.type === "claudeai-proxy" && error instanceof Error) {
          if (
            (logMCPDebug(
              name,
              `claude.ai proxy connection failed after ${x}ms: ${describeConnectError(error, serverRef)}`,
            ),
            !isClaudeAiBearerRejectedError_2(error))
          )
            logMCPError(name, JHe(error, serverRef));
          let errorCode = error.code;
          if (isClaudeAiBearerRejectedError_2(error)) {
            (logEvent("tengu_mcp_server_connection_failed", {
              transportType: lit("claudeai-proxy"),
              errorCode: lit("CLAUDEAI_BEARER_REJECTED"),
              sdkGeneration: fromEnum(mcpSdkGeneration()),
              ...mcpBaseUrlAnalytics(serverRef, name),
              ...buildPluginSourceFields(serverRef),
            }),
              logFeatureSad("mcp_connect", "mcp_connect_claudeai_bearer_rejected"));
            let z = ir(name, serverRef),
              ie = {
                name: name,
                type: "failed",
                config: serverRef,
                error: error.message,
                errorCode: "CLAUDEAI_BEARER_REJECTED",
              },
              ue = getConnectionCache().connections.get(z);
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
            return handleRemoteAuthFailure_2(name, serverRef, "claudeai-proxy", void 0, !1, R, storageV5);
        } else if (serverRef.type === "sse-ide" || serverRef.type === "ws-ide")
          logEvent("tengu_mcp_ide_server_connection_failed", { connectionDurationMs: x });
        if (H) H.close().catch(() => {});
        if ((G.close().catch(() => {}), stderrOutput && !isCleanupStarted()))
          logMCPError(name, `Server stderr: ${stderrOutput}`);
        throw error;
      }
      let capabilities = X.getServerCapabilities(),
        serverVersion = X.getServerVersion(),
        De = officialPluginPromptOverrides(serverRef),
        xe = serverInstructionsOverride(De, name) ?? X.getInstructions(),
        He = TB(serverRef),
        Fe = truncateServerInstructions_2(xe, name, He);
      if (
        (logMCPDebug(
          name,
          `Connection established with capabilities: ${jsonStringify({ hasTools: !!capabilities?.tools, hasPrompts: !!capabilities?.prompts, hasResources: !!capabilities?.resources, hasResourceSubscribe: !!capabilities?.resources?.subscribe, serverVersion: serverVersion || "unknown" })}`,
        ),
        logForDebugging(
          `[MCP] Server "${name}" connected with subscribe=${!!capabilities?.resources?.subscribe}`,
        ),
        X.setRequestHandler(
          ElicitRequestSchema,
          async (request) => (
            logMCPDebug(
              name,
              `Elicitation request received during initialization: ${jsonStringify(request)}`,
            ),
            { action: "cancel" }
          ),
        ),
        serverRef.type === "sse-ide" || serverRef.type === "ws-ide")
      ) {
        let P = Date.now() - connectStartTime;
        (logEvent("tengu_mcp_ide_server_connection_succeeded", {
          connectionDurationMs: P,
          serverVersion: sanitizeVersion(serverVersion?.version),
        }),
          maybeNotifyIDEConnected(X).catch((x) => {
            logMCPError(
              name,
              `Failed to send ide_connected notification: ${describeConnectError(x, serverRef)}`,
            );
          }));
      }
      let connectionStartTime = Date.now(),
        Ie = !1,
        originalOnerror = X.onerror,
        originalOnclose = X.onclose,
        MAX_ERRORS_BEFORE_RECONNECT = 3,
        te = {
          consecutiveErrors: 0,
          activeCallWatchdogs: new Set(),
          pendingElicitations: 0,
          lastElicitationClosedAt: 0,
        },
        ke = !1,
        closeTransportAndRejectPending = (reason) => {
          if (ke) return;
          ((ke = !0),
            (te.closeReason = reason),
            logMCPDebug(name, `Closing transport (${reason})`),
            X.close().catch((x) => {
              logMCPDebug(name, `Error during close: ${describeConnectError(x, serverRef)}`);
            }));
        };
      if (
        ((X.onerror = (msg) => {
          let x = serverRef.type || "stdio";
          if (x === "stdio" && msg instanceof SyntaxError) {
            logMCPError(name, `Ignoring non-JSON line on stdout: ${msg.message}`);
            return;
          }
          if (msg instanceof FirstPartyDesignNeedsConsentError) return;
          if (x === "stdio" && msg instanceof StdoutOverflowError_2) {
            if (
              (logMCPError(name, msg.message),
              (Ie = !0),
              closeTransportAndRejectPending("stdout overflow"),
              originalOnerror)
            )
              originalOnerror(msg);
            return;
          }
          if ((x === "http" || x === "claudeai-proxy") && msg instanceof HttpBodyOverflowError_2) {
            if (
              (logMCPError(
                name,
                `sent a response larger than ${Math.round(HTTP_BODY_LIMITS / 1024 / 1024)}MB. Claude Code stopped reading it and failed the request it answered; the connection stays open.`,
              ),
              originalOnerror)
            )
              originalOnerror(msg);
            return;
          }
          if (
            (x === "sse" || x === "sse-ide" || x === "http" || x === "claudeai-proxy") &&
            msg.message.includes(oo)
          ) {
            if (
              (logMCPError(name, msg.message),
              (Ie = !0),
              closeTransportAndRejectPending("http body overflow"),
              originalOnerror)
            )
              originalOnerror(msg);
            return;
          }
          if ((x === "sse" || x === "http" || x === "claudeai-proxy") && msg instanceof SyntaxError) {
            if (
              ((Ie = !0),
              Pe(),
              closeTransportAndRejectPending(
                U?.authChallengeOpen === !0 && te.activeCallWatchdogs.size <= 1
                  ? "malformed message after an auth challenge"
                  : "malformed JSON-RPC message (response truncated)",
              ),
              originalOnerror)
            )
              originalOnerror(msg);
            return;
          }
          let D = Date.now() - connectionStartTime;
          if (
            ((Ie = !0),
            logMCPDebug(name, `${x.toUpperCase()} connection dropped after ${Math.floor(D / 1000)}s uptime`),
            msg.message)
          ) {
            let z = CONNECTION_ERROR_HINTS.find(([ie]) => msg.message.includes(ie))?.[1];
            logMCPDebug(name, z ?? `Connection error: ${describeConnectError(msg, serverRef)}`);
          }
          if (
            (x === "http" || x === "claudeai-proxy") &&
            X.transport?.sessionId !== void 0 &&
            isMcpSessionExpiredError_2(msg)
          ) {
            if (
              (logMCPDebug(
                name,
                "MCP session expired (server no longer recognizes session ID), triggering reconnection",
              ),
              closeTransportAndRejectPending("session expired"),
              originalOnerror)
            )
              originalOnerror(msg);
            return;
          }
          if (
            (x === "http" || x === "claudeai-proxy") &&
            X.transport?.sessionId !== void 0 &&
            msg instanceof Tue &&
            msg.code === 404 &&
            msg.message.includes("Failed to open SSE stream")
          )
            logFeatureSad("mcp_session_recovery", "get_stream_404_not_reinit");
          if (x === "sse" || x === "http" || x === "claudeai-proxy") {
            if (msg.message.includes("Maximum reconnection attempts")) {
              if (
                (logMCPDebug(
                  name,
                  "SSE GET-stream reconnection exhausted; leaving transport up (POST still works)",
                ),
                (te.consecutiveErrors = 0),
                Pe(),
                originalOnerror)
              )
                originalOnerror(msg);
              return;
            }
            if (isTransientMcpError_2(msg)) {
              if (
                (te.consecutiveErrors++,
                Pe(),
                logMCPDebug(
                  name,
                  `Terminal connection error ${te.consecutiveErrors}/${MAX_ERRORS_BEFORE_RECONNECT}`,
                ),
                te.consecutiveErrors >= MAX_ERRORS_BEFORE_RECONNECT)
              )
                ((te.consecutiveErrors = 0),
                  closeTransportAndRejectPending("max consecutive terminal errors"));
            } else te.consecutiveErrors = 0;
          }
          if (originalOnerror) originalOnerror(msg);
        }),
        (serverRef.type === "http" || serverRef.type === "claudeai-proxy") && X.transport)
      )
        te.toolCallSends = trackToolCallSends(
          X.transport,
          isMcpSessionExpiredError_2,
          te.activeCallWatchdogs,
        );
      if (X.transport) {
        let onmessage = X.transport.onmessage;
        X.transport.onmessage = (x, D) => {
          if (te.consecutiveErrors !== 0) te.consecutiveErrors = 0;
          onmessage?.(x, D);
        };
      }
      X.onclose = () => {
        let P = Date.now() - connectionStartTime,
          x = serverRef.type ?? "unknown";
        (logMCPDebug(
          name,
          `${x.toUpperCase()} connection closed after ${Math.floor(P / 1000)}s (${Ie ? "with errors" : "cleanly"})`,
        ),
          logMcpConnectionOtelEvent_2(name, serverRef, { status: "disconnected", durationMs: P }));
        let key = ir(name, serverRef);
        if (
          (getConnectionCache().liveClients.delete(X),
          getConnectionCache().toolLists.delete(key),
          getConnectionCache().resourceLists.delete(key),
          getConnectionCache().resourceTemplateLists.delete(key),
          getConnectionCache().commandLists.delete(key),
          getConnectionCache().connections.delete(key),
          logMCPDebug(name, "Cleared connection cache for reconnection"),
          originalOnclose)
        )
          originalOnclose();
      };
      let cleanup = async () => {
          if (H) {
            try {
              await H.close();
            } catch (error) {
              logMCPDebug(name, `Error closing in-process server: ${error}`);
            }
            try {
              await X.close();
            } catch (error) {
              logMCPDebug(name, `Error closing client: ${describeConnectError(error, serverRef)}`);
            }
            return;
          }
          if (G instanceof BoundedStdioTransport)
            try {
              let childPid = G.pid;
              if (G.serverProcess && getPlatform() === "windows")
                (logMCPDebug(name, "Closing MCP server stdin"), await closeStdioServer(G.serverProcess));
              else if (childPid) {
                logMCPDebug(name, "Sending SIGINT to MCP server process");
                try {
                  process.kill(childPid, "SIGINT");
                } catch (error) {
                  logMCPDebug(name, `Error sending SIGINT: ${error}`);
                  return;
                }
                await new Promise(async (resolve) => {
                  let D = !1,
                    z = () => {
                      if (D) return;
                      ((D = !0), clearInterval(ue), clearTimeout(Se), resolve());
                    },
                    ie = (me) => {
                      try {
                        return (process.kill(me, 0), !0);
                      } catch {
                        return !1;
                      }
                    },
                    ue = setInterval(
                      (me, Me, Be, et) => {
                        if (!me(Me)) (logMCPDebug(Be, "MCP server process exited cleanly"), et());
                      },
                      50,
                      ie,
                      childPid,
                      name,
                      z,
                    ),
                    Se = setTimeout(
                      (me, Me) => {
                        (logMCPDebug(me, "Cleanup timeout reached, stopping process monitoring"), Me());
                      },
                      600,
                      name,
                      z,
                    );
                  try {
                    if ((await sleep(100), !D)) {
                      if (!ie(childPid)) {
                        z();
                        return;
                      }
                      logMCPDebug(name, "SIGINT failed, sending SIGTERM to MCP server process");
                      try {
                        process.kill(childPid, "SIGTERM");
                      } catch (termError) {
                        (logMCPDebug(name, `Error sending SIGTERM: ${termError}`), z());
                        return;
                      }
                      if ((await sleep(400), !D))
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
            await X.close();
          } catch (error) {
            logMCPDebug(name, `Error closing client: ${describeConnectError(error, serverRef)}`);
          }
        },
        cleanupUnregister = registerCleanup(cleanup);
      if (G instanceof BoundedStdioTransport) G.handOffExitCleanup();
      let wrappedCleanup = async () => {
        (getConnectionCache().liveClients.delete(X), cleanupUnregister?.(), await cleanup());
      };
      if ((getConnectionCache().liveClients.add(X), getAnnouncedDirectories() !== E))
        X.sendRootsListChanged().catch(() => {});
      let ot = Date.now() - connectStartTime;
      logMcpConnectionOtelEvent_2(name, serverRef, { status: "connected", durationMs: ot });
      let _e = xe?.length ?? 0;
      if (
        (logEvent("tengu_mcp_server_connection_succeeded", {
          connectionDurationMs: ot,
          instructionsLength: _e,
          instructionsTruncated: _e > He,
          transportType: fromEnum(serverRef.type ?? "stdio"),
          negotiatedLegacySse: serverRef.type === "http" && G instanceof _t,
          sdkGeneration: fromEnum(mcpSdkGeneration()),
          scope: fromEnum(serverRef.scope),
          isPlugin: serverRef.pluginSource !== void 0,
          ...buildPluginSourceFields(serverRef),
          totalServers: serverStats?.totalServers,
          stdioCount: serverStats?.stdioCount,
          sseCount: serverStats?.sseCount,
          httpCount: serverStats?.httpCount,
          sseIdeCount: serverStats?.sseIdeCount,
          wsIdeCount: serverStats?.wsIdeCount,
          ...mcpBaseUrlAnalytics(serverRef, name),
        }),
        logFeatureOk("mcp_connect"),
        logForDiagnosticsNoPII("info", "mcp_connect_complete", { transport: Q, duration_ms: ot }),
        U)
      )
        ht().clientAuthProviders.set(X, U);
      ht().clientFirstPartyBearers.set(X, k);
      let ee = {
        name: name,
        client: GPn(X),
        type: "connected",
        capabilities: capabilities ?? {},
        serverInfo: serverVersion,
        instructions: Fe,
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
        if ((logMCPDebug(name, `Connection abandoned after ${fe}ms (Claude Code is shutting down)`), H))
          H.close().catch(() => {});
        return {
          name: name,
          type: "failed",
          config: serverRef,
          error: "Claude Code is shutting down",
          errorCode: "SHUTTING_DOWN",
        };
      }
      let pe = describeConnectError(error, serverRef),
        ge = error instanceof Error ? error.cause : void 0,
        ce =
          (error && typeof error === "object" && "code" in error ? error.code : void 0) ??
          (ge && typeof ge === "object" && "code" in ge ? ge.code : void 0),
        le = ce !== void 0 ? String(ce) : void 0;
      if (
        serverRef.type === "http" &&
        le === "404" &&
        G?.sessionId === void 0 &&
        !isCcrHostedConfig(serverRef)
      )
        ((le = "ENDPOINT_NOT_FOUND"),
          (pe = `MCP endpoint not found at ${describeMcpServerOrigin(name, serverRef, { detail: "origin" }) ?? "(unparseable url)"}. Check the URL in your MCP config.`));
      let k = le === "CONNECT_TIMEOUT" && w !== void 0 ? suspendedConnectMessage(name, w) : void 0;
      if (k !== void 0) ((le = CONNECT_SUSPENDED), (pe = k));
      ((pe = redactMcpErrorDetail(name, serverRef, pe)),
        logMcpConnectionOtelEvent_2(name, serverRef, {
          status: "failed",
          durationMs: fe,
          errorCode: le,
          error: pe,
        }));
      let L =
        le === "ENOENT" && (serverRef.type === "stdio" || serverRef.type === void 0)
          ? "mcp_connect_spawn_enoent"
          : le === "ENDPOINT_NOT_FOUND"
            ? "mcp_connect_endpoint_not_found"
            : void 0;
      if (L !== void 0) logFeatureBad("mcp_connect", L);
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
      if (
        (logEvent("tengu_mcp_server_connection_failed", {
          connectionDurationMs: fe,
          errorCode: sanitizeConnectErrorCodeForTelemetry_2(le),
          errorClassName: sanitizedErrorClassNameForTelemetry(error),
          errorMessageHash: gn(scrubErrorText(pe)),
          totalServers: serverStats?.totalServers || 1,
          stdioCount: serverStats?.stdioCount || (serverRef.type === "stdio" ? 1 : 0),
          sseCount: serverStats?.sseCount || (serverRef.type === "sse" ? 1 : 0),
          httpCount: serverStats?.httpCount || (serverRef.type === "http" ? 1 : 0),
          sseIdeCount: serverStats?.sseIdeCount || (serverRef.type === "sse-ide" ? 1 : 0),
          wsIdeCount: serverStats?.wsIdeCount || (serverRef.type === "ws-ide" ? 1 : 0),
          transportType: fromEnum(serverRef.type ?? "stdio"),
          sdkGeneration: fromEnum(mcpSdkGeneration()),
          scope: fromEnum(serverRef.scope),
          isPlugin: serverRef.pluginSource !== void 0,
          ...buildPluginSourceFields(serverRef),
          ...mcpBaseUrlAnalytics(serverRef, name),
        }),
        logMCPDebug(
          name,
          `Connection failed after ${formatConnectElapsed(M)}${le !== void 0 ? ` (${le})` : ""}: ${pe}`,
        ),
        logMCPError(name, `Connection failed${le !== void 0 ? ` (${le})` : ""}: ${pe}`),
        logForDiagnosticsNoPII("error", "mcp_connect_failed", {
          transport: Q,
          duration_ms: fe,
          ...(le === "CONNECT_TIMEOUT" && { reason: "timeout" }),
          ...(le === CONNECT_SUSPENDED && { reason: "suspended" }),
        }),
        H)
      )
        H.close().catch(() => {});
      if (le !== CONNECT_SUSPENDED) getServerCommandArray(name, serverRef, storageV5);
      let be =
        le === "ERR_PROXY_TUNNEL"
          ? [error, ge]
              .map((W) => (W && typeof W === "object" && "status" in W ? W.status : void 0))
              .find((W) => typeof W === "number")
          : void 0;
      return {
        name: name,
        type: "failed",
        config: serverRef,
        error: pe,
        errorCode: le,
        ...(be !== void 0 && { proxyConnectStatus: be }),
        ...(le === void 0 &&
          U?.sawAuthChallenge === !0 &&
          (await registrationStatusFields(name, serverRef, connectStartTime))),
      };
    }
  },
  ir,
  () => getConnectionCache().connections,
  (e, r, [n, s, , h]) =>
    connectWithSignedOutFallback(
      () => redialAfterSuspend(e, r, () => getServerCommandArray(n, s, h)),
      r,
      n,
      s,
    ),
);
/**
 * callIdeTool（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:123802-123964 callgraph-fingerprint = callIdeRpc (0.394)
async function callIdeTool_2(toolName, args, client) {
  return (
    await callMCPTool_2({
      client: client,
      tool: toolName,
      args: args,
      signal: createAbortController().signal,
      imageLimits: IMAGE_LIMITS,
      idleTimeoutMs: 0,
      storageV5: void 0,
      credentials: void 0,
    })
  ).content;
}
/**
 * identityChangedReconnectResult（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:123964-124222 layout
function identityChangedReconnectResult_2(e, r) {
  return (
    logFeatureSad("mcp_reconnect", "mcp_reconnect_identity_changed"),
    {
      client: {
        name: e,
        type: "failed",
        config: r,
        error: "Reconnect cancelled: the account changed while connecting. Choose Reconnect again.",
        errorCode: "IDENTITY_CHANGED",
      },
      tools: [],
      commands: [],
    }
  );
}
/**
 * 重连 MCP 服务器（v1）：需要时先等待账号身份就绪，远程服务器在等待期间账号变化则返回 IDENTITY_CHANGED 结果，否则调用 reconnectMcpServerImpl。
 */
//@ chunk-z1n5m6nf.js:124222-124359 layout
async function reconnectMcpServer_2(e, r, n, s) {
  if (!IM()) return reconnectMcpServerImpl(e, r, n, s);
  let h = identityEpoch();
  if ((await flushDiscoveryCache(Vt(e, r)), isRemoteMcpTransport(r) && identityEpoch() !== h))
    return identityChangedReconnectResult_2(e, r);
  return reconnectMcpServerImpl(e, r, n, s);
}
/**
 * reconnectMcpServerImpl（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:124359-126278 layout
async function reconnectMcpServerImpl(e, r, n, s, h = {}) {
  let y = identityEpoch(),
    S = isRemoteMcpTransport(r),
    T = () => S && identityEpoch() !== y,
    M = () => identityChangedReconnectResult_2(e, r);
  try {
    clearKeychainCache();
    let w = h.keepConnectionInUse ? {} : void 0;
    if ((await (w === void 0 ? clearServerCache_4(e, r) : clearServerCache_4(e, r, w)), T())) return M();
    let R = connectToServer_2(e, r, void 0, n, s),
      E = await R;
    if (E.type === "needs-auth") {
      if ((logMCPDebug(e, "Reconnect returned 'needs-auth'; retrying once after cache clear"), T()))
        return M();
      let fe = ir(e, r);
      if (getConnectionCache().connections.get(fe) === R) getConnectionCache().connections.delete(fe);
      E = await connectToServer_2(e, r, void 0, n, s);
    }
    if (T()) {
      if (E.type === "connected") await detachAndCloseConnection_2(E);
      return M();
    }
    if (E.type !== "connected")
      return (
        logFeatureSad("mcp_reconnect", "mcp_reconnect_not_connected"),
        applyMcpServerConfig(r, { client: E, tools: [], commands: [] })
      );
    if (r.type !== "claudeai-proxy") clearMcpAuthCacheEntry_2(e, n);
    if (r.type === "http" || r.type === "sse") await clearMcpOAuthStubIfTokenless(e, r);
    clearDiscoveryPathMemo(e);
    let Q;
    if (fd()) Q = await oq(e, r);
    if (T()) return (await detachAndCloseConnection_2(E), M());
    let H = !!E.capabilities?.resources,
      [U, re, he, G] = await Promise.all([
        listMcpTools(E, n),
        fetchCommandsForClient_2(E),
        Promise.resolve([]),
        H ? fetchResourcesForClient_2(E) : Promise.resolve([]),
      ]);
    if (T()) return (await detachAndCloseConnection_2(E), M());
    if (E.discoveryAuthFailure)
      return (
        logFeatureSad("mcp_reconnect", "mcp_reconnect_needs_auth_discovery"),
        { client: { name: e, type: "needs-auth", config: r }, tools: [], commands: [] }
      );
    if (r.type === "claudeai-proxy" && !E.discoveryBearerRejected) clearMcpAuthCacheEntry_2(e, n);
    if (r.type === "claudeai-proxy" && !E.toolsListError && !E.discoveryBearerRejected)
      recordClaudeAiMcpConnected(e, n);
    persistLiveListing_2(E, { tools: U, commands: re, resources: G, identityEpoch: y, grantLeg: Q });
    let q = [...re, ...he],
      j = [];
    if (H) {
      if (
        ![ListMcpResourcesTool, ReadMcpResourceTool].some((pe) =>
          U.some((ge) => toolMatchesName(ge, pe.name)),
        )
      )
        j.push(ListMcpResourcesTool, ReadMcpResourceTool, H5);
    }
    if (E.discoveryBearerRejected) logFeatureSad("mcp_reconnect", "mcp_reconnect_bearer_rejected");
    else if (E.toolsListError) logFeatureSad("mcp_reconnect", "mcp_reconnect_tools_list_failed");
    else logFeatureOk("mcp_reconnect");
    return applyMcpServerConfig(r, {
      client: E,
      tools: [...U, ...j],
      commands: q,
      resources: G.length > 0 ? G : void 0,
      resourceTemplates: [],
      ...(w?.connection !== void 0 && E === w.connection && { keptConnectionInUse: !0 }),
    });
  } catch (error) {
    return (
      logFeatureBad("mcp_reconnect", "mcp_reconnect_failed"),
      logMCPError(e, `Error during reconnection: ${describeConnectError(error, r)}`),
      { client: { name: e, type: "failed", config: r }, tools: [], commands: [] }
    );
  }
}
//@ chunk-z1n5m6nf.js:126278-126333 layout = processBatched (1)
async function processBatched_3(items, concurrency, processor) {
  await pMap(items, processor, { concurrency: concurrency });
}
/**
 * countUnsettledByDeadline（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:126333-126598 layout
async function countUnsettledByDeadline_2(e, r) {
  if (e.length === 0) return 0;
  let n,
    promise = new Promise((h) => {
      n = setTimeout((y) => y("deadline"), r, h);
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
/**
 * getMcpToolsCommandsAndResources（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:126598-134003 layout
async function getMcpToolsCommandsAndResources(e, r, n, s, h, y, S, T) {
  let M = identityEpoch(),
    w = (k) => identityEpoch() !== M && isRemoteMcpTransport(k),
    R = (k) => {
      if (!w(k.client.config)) e({ ...k, attemptEpoch: M });
    };
  isLegacyProtocolEra();
  let E = !1,
    entries = Object.entries(r ?? (await getAllMcpConfigs()).servers),
    H = [];
  for (let k of entries)
    if (isMcpServerDisabled(k[0]))
      R({ client: { name: k[0], type: "disabled", config: k[1] }, tools: [], commands: [] });
    else H.push(k);
  registerConfiguredMcpServers(Object.fromEntries(H));
  let U = H.length,
    re = count(H, ([k, L]) => L.type === "stdio"),
    he = count(H, ([k, L]) => L.type === "sse"),
    G = count(H, ([k, L]) => L.type === "http"),
    q = count(H, ([k, L]) => L.type === "sse-ide"),
    j = count(H, ([k, L]) => L.type === "ws-ide"),
    filtered = H.filter(([k, L]) => isLocalMcpServer_2(L)),
    filtered_2 = H.filter(([k, L]) => !isLocalMcpServer_2(L)),
    ge = { totalServers: U, stdioCount: re, sseCount: he, httpCount: G, sseIdeCount: q, wsIdeCount: j },
    ce = [],
    le = async ([k, L]) => {
      try {
        if (isCleanupStarted()) {
          logMCPDebug(k, "Skipping connection (Claude Code is shutting down)");
          return;
        }
        if (isMcpServerDisabled(k)) {
          R({ client: { name: k, type: "disabled", config: L }, tools: [], commands: [] });
          return;
        }
        if (isMcpServerBlockedAtConnectTime(k, L)) {
          (logMCPDebug(k, "Skipping connection (blocked by managed policy)"),
            R({
              client: {
                name: k,
                type: "failed",
                config: L,
                error: mcpGateError("managed-policy", k, L).error,
              },
              tools: [],
              commands: [],
            }));
          return;
        }
        if (isIneligibleClaudeAiProxy(L)) {
          R({
            client: { name: k, type: "needs-auth", config: L },
            tools: mcpAuthToolsFor(k, L),
            commands: [],
          });
          return;
        }
        if (
          (L.type === "claudeai-proxy" || L.type === "http" || L.type === "sse") &&
          !Zl(L) &&
          ((await isMcpAuthCached_2(k, L, n)) ||
            ((L.type === "http" || L.type === "sse") &&
              shouldTryTokenless(
                k,
                L,
                await readMcpOAuthStore({ serverName: k, serverConfig: L, challenged: !1 }),
              )))
        ) {
          if (L.type !== "claudeai-proxy" && L.pluginSource === void 0)
            logMCPDebug(k, "Skipping connection (cached needs-auth)");
          R({
            client: { name: k, type: "needs-auth", config: L, ...(await registrationStatusFields(k, L)) },
            tools: mcpAuthToolsFor(k, L),
            commands: [],
          });
          return;
        }
        if (
          (L.type === "stdio" || L.type === void 0) &&
          L.pluginSource !== void 0 &&
          (await isMcpAuthCached_2(k, L, n))
        ) {
          R({
            client: {
              name: k,
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
        let be = await hasLiveConnection_2(k, L),
          W = h !== void 0 && Object.hasOwn(h, k) ? h[k] : void 0;
        if (W !== void 0 && !be) {
          let { client: client, tools: tools } = await buildCachedClientTools_2({
            name: k,
            config: L,
            capabilities: { tools: {} },
            serverInfo: void 0,
            savedAt: Date.now(),
            tools: W,
          });
          R({ client: client, tools: tools, commands: [] });
          return;
        }
        let ze = be ? { kind: "miss", reason: "live-connection" } : await readDiscoveryCache(k, L),
          X = applyCapabilityServeTimeMiss_2(ze);
        if (X.kind === "fresh" || X.kind === "stale") {
          let { entry: entry, ageMs: ageMs } = X,
            { client: client, tools: tools } = await buildCachedClientTools_2({
              name: k,
              config: L,
              capabilities: entry.capabilities,
              serverInfo: entry.serverInfo,
              savedAt: entry.savedAt,
              tools: entry.tools,
            }),
            xe = buildMcpPromptCommands_2(client, entry.commands),
            mapped = entry.resources.map((resource) => ({ ...resource, server: k })),
            mapped_2 = (entry.templates ?? []).map((ve) => ({ ...ve, server: k })),
            Ue = !!entry.capabilities.resources || mapped.length > 0,
            Ie = [];
          if (Ue && !E) ((E = !0), Ie.push(ListMcpResourcesTool, ReadMcpResourceTool, H5));
          if (
            (logEvent("tengu_mcp_discovery_source", {
              source: lit(X.kind === "fresh" ? "cache_fresh" : "cache_stale"),
              transportType: fromEnum(L.type ?? "stdio"),
              entryAgeMs: ageMs,
              ...mcpBaseUrlAnalytics(L, k),
            }),
            logFeatureOk("mcp_discovery_cache"),
            getConnectionCache().settledCachedDialFailures.delete(ir(k, L)),
            getConnectionCache().refusedCachedRows.delete(ir(k, L)),
            R({
              client: client,
              tools: [...tools, ...Ie],
              commands: xe,
              resources: mapped.length > 0 ? mapped : void 0,
              resourceTemplates: mapped_2.length > 0 ? mapped_2 : void 0,
            }),
            X.kind === "stale")
          )
            (async () => {
              let ve = await oq(k, L),
                Ee,
                B = async () => {
                  if ((Ee !== void 0 && tt(Ee)) || identityEpoch() !== M) return;
                  (logFeatureSad("mcp_discovery_cache", "strike"),
                    await recordRefreshFailureStrike(k, L, { identityEpoch: M, grantLeg: ve }));
                },
                te = await acquireDiscoveryRefreshLock(k, L);
              if (!te) return;
              if (isMcpServerDisabled(k)) {
                (await te().catch(() => {}), refuseCachedRowV1(k, L, "disabled"));
                return;
              }
              if (isMcpServerBlockedAtConnectTime(k, L)) {
                (await te().catch(() => {}), refuseCachedRowV1(k, L, "policy"));
                return;
              }
              let Pe = (ye) => {
                  if (!(!(Ee !== void 0 && tt(Ee)) && identityEpoch() === M)) return;
                  if (ye.type !== "needs-auth") getConnectionCache().connections.delete(ir(k, L));
                  let cachedFirstDialArmsRan = ht().cachedFirstDialArmsRan;
                  if (cachedFirstDialArmsRan.has(ye)) return;
                  if ((cachedFirstDialArmsRan.add(ye), ye.type === "needs-auth")) So_2(k, L);
                  else if (ye.type === "failed") recordCachedDialFailureV1(ye, !1);
                },
                ke = (ye) => {
                  let cachedFirstDialArmsRan = ht().cachedFirstDialArmsRan;
                  if (cachedFirstDialArmsRan.has(ye)) return;
                  (cachedFirstDialArmsRan.add(ye), So_2(k, L));
                },
                oe = !1;
              try {
                ((Ee = connectToServer_2(k, L, ge, n, s)),
                  ht().swrRefreshDialsInFlight.add(Ee),
                  Ee.then(
                    () => {
                      oe = !0;
                    },
                    () => {
                      oe = !0;
                    },
                  ));
                let ye = await boundDial(Ee, { serverName: k, context: "MCP discovery-cache stale refresh" });
                if (ye.type !== "connected") {
                  (Pe(ye), await B());
                  return;
                }
                if (tt(Ee) || identityEpoch() !== M) return;
                if (
                  entry.negotiatedEra !== void 0 &&
                  ye.protocolEra !== void 0 &&
                  ye.protocolEra !== entry.negotiatedEra
                ) {
                  if (
                    (logMCPDebug(
                      k,
                      "Discovery cache entry dropped: server negotiated a different protocol era on revalidation",
                    ),
                    await Vt(k, L).catch(() => {}),
                    !tt(Ee) && identityEpoch() === M)
                  )
                    ke(ye);
                  return;
                }
                let Ae = !!ye.capabilities?.resources;
                clearDiscoveryPathMemo(k);
                let $e = await oq(k, L);
                if (tt(Ee) || identityEpoch() !== M) return;
                let [ot, _e, ee, P] = await Promise.all([
                    listMcpTools(ye, n),
                    fetchCommandsForClient_2(ye),
                    fetchResourcesForClient_2(ye),
                    Ae && cZe(L) ? fetchResourceTemplatesForClient_2(ye) : Promise.resolve([]),
                  ]),
                  x = To(P) === void 0 ? P : void 0;
                if (tt(Ee) || gt(Ee, k, L) || identityEpoch() !== M) return;
                if (!isMcpServerDisabled(k) && !isMcpServerBlockedAtConnectTime(k, L)) {
                  if (
                    !(await persistDiscovery(ye, {
                      tools: ot,
                      commands: _e,
                      resources: ee,
                      templates: x,
                      identityEpoch: M,
                      grantLeg: $e,
                    }))
                  )
                    await B();
                }
                if (!(Ee !== void 0 && tt(Ee)) && !(Ee !== void 0 && gt(Ee, k, L)) && identityEpoch() === M)
                  ke(ye);
              } catch {
                if (Ee !== void 0 && !oe) {
                  let ye = Ee;
                  ye.then(
                    (Ae) => {
                      if (Ae.type !== "connected") (Pe(Ae), B().catch(() => {}));
                      else
                        (ht().swrRefreshDialsInFlight.delete(ye),
                          (entry.negotiatedEra !== void 0 &&
                          Ae.protocolEra !== void 0 &&
                          Ae.protocolEra !== entry.negotiatedEra
                            ? Vt(k, L).catch(() => {})
                            : Promise.resolve()
                          ).then(() => {
                            if (!tt(ye) && identityEpoch() === M) ke(Ae);
                          }));
                    },
                    () => {
                      B().catch(() => {});
                    },
                  );
                } else await B();
              } finally {
                if (Ee !== void 0 && oe) ht().swrRefreshDialsInFlight.delete(Ee);
                await te().catch(() => {});
              }
            })();
          return;
        }
        let Le = connectToServer_2(k, L, ge, n, s, void 0, T),
          Z = await Le,
          Ne = connectToServer_2.cache?.get?.(ir(k, L)) === Le;
        if (fd() && isDiscoveryCacheMissRecoverable_2(X))
          logEvent("tengu_mcp_discovery_source", {
            source: lit(discoverySourceLabel_2(X)),
            transportType: fromEnum(L.type ?? "stdio"),
            ...mcpBaseUrlAnalytics(L, k),
          });
        if (tt(Le)) return;
        if (w(L)) {
          if (Z.type === "connected" && gt(Le, k, L)) detachAndCloseConnection_2(Z);
          return;
        }
        if (Z.type !== "connected") {
          R(
            applyMcpServerConfig(L, {
              client: Z,
              tools: Z.type === "needs-auth" ? mcpAuthToolsFor(k, L) : [],
              commands: [],
            }),
          );
          return;
        }
        if (((Z.discoveryBearerRejected = void 0), L.type !== "claudeai-proxy"))
          clearMcpAuthCacheEntry_2(k, n);
        if (L.type === "http" || L.type === "sse") await clearMcpOAuthStubIfTokenless(k, L);
        ce.push(
          (async () => {
            let Te = !1;
            try {
              let we = !!Z.capabilities?.resources;
              clearDiscoveryPathMemo(k);
              let Oe = await oq(k, L);
              if (fd() && (tt(Le) || w(L))) {
                if (!tt(Le) && gt(Le, k, L)) detachAndCloseConnection_2(Z);
                return;
              }
              let results = Promise.all([
                  listMcpTools(Z, n, S),
                  fetchCommandsForClient_2(Z),
                  Promise.resolve([]),
                ]),
                xe =
                  y === !0 &&
                  (L.type === "claudeai-proxy"
                    ? !!Z.capabilities?.tools || !!Z.capabilities?.prompts
                    : L.type === "http" && isSameOriginAsCcr(L.url) && !isDiscoveryCacheEligible(L)),
                results_2 = Promise.all([
                  we && !xe ? fetchResourcesForClient_2(Z) : Promise.resolve([]),
                  we && cZe(Z.config) ? fetchResourceTemplatesForClient_2(Z) : Promise.resolve([]),
                ]),
                Fe = y === !0 && we && (L.type === "http" || L.type === "sse") && !fd();
              if (Fe) results_2.catch(() => {});
              let [[Ue, Ie, ve], Ee] = await Promise.all([results, Fe ? void 0 : results_2]);
              if (w(L)) {
                if (gt(Le, k, L)) detachAndCloseConnection_2(Z);
                return;
              }
              if (fd() && tt(Le)) return;
              if (fd() && Ne && gt(Le, k, L)) {
                if (connectToServer_2.cache?.get?.(ir(k, L)) === void 0 && oa(Z.client).onclose !== void 0)
                  (detachAndCloseConnection_2(Z),
                    R({
                      client: {
                        name: k,
                        type: "failed",
                        config: L,
                        error: "Connection closed during discovery",
                        errorCode: "ConnectionClosed",
                      },
                      tools: [],
                      commands: [],
                    }));
                return;
              }
              if (Z.discoveryAuthFailure) {
                R({
                  client: { name: k, type: "needs-auth", config: L },
                  tools: mcpAuthToolsFor(k, L),
                  commands: [],
                });
                return;
              }
              if (L.type === "claudeai-proxy" && !Z.discoveryBearerRejected) clearMcpAuthCacheEntry_2(k, n);
              if (L.type === "claudeai-proxy" && !Z.toolsListError && !Z.discoveryBearerRejected)
                recordClaudeAiMcpConnected(k, n);
              let B = [...Ie, ...ve],
                te = ($e) => {
                  let ot = [];
                  if (we && !E) ((E = !0), ot.push(ListMcpResourcesTool, ReadMcpResourceTool, H5));
                  R(
                    applyMcpServerConfig(L, {
                      client: Z,
                      tools: [...Ue, ...ot],
                      commands: B,
                      resources: $e.length > 0 ? $e : void 0,
                      resourceTemplates: void 0,
                    }),
                  );
                };
              if (Fe) (te([]), (Te = !0));
              let [Pe, ke] = Ee ?? (await results_2);
              if (!we) recordRawResourcesForResult_2(Pe, []);
              let oe = To(ke) === void 0 ? ke : void 0,
                Ae =
                  !fd() ||
                  tt(Le) ||
                  gt(Le, k, L) ||
                  identityEpoch() !== M ||
                  isMcpServerDisabled(k) ||
                  isMcpServerBlockedAtConnectTime(k, L)
                    ? void 0
                    : persistDiscovery(Z, {
                        tools: Ue,
                        commands: Ie,
                        resources: Pe,
                        templates: oe,
                        identityEpoch: M,
                        grantLeg: Oe,
                      });
              if (!Fe) te(Pe);
              await Ae;
            } catch (error) {
              if (
                (logMCPError(k, `Error fetching tools/commands/resources: ${describeConnectError(error, L)}`),
                Te)
              )
                return;
              R({ client: { name: k, type: "failed", config: L }, tools: [], commands: [] });
            }
          })(),
        );
      } catch (error) {
        (logMCPError(k, `Error fetching tools/commands/resources: ${describeConnectError(error, L)}`),
          R({ client: { name: k, type: "failed", config: L }, tools: [], commands: [] }));
      }
    };
  (await Promise.all([
    processBatched_3(filtered, getMcpServerConnectionBatchSize_2(), le),
    processBatched_3(filtered_2, getRemoteMcpServerConnectionBatchSize_2(), le),
  ]),
    await Promise.all(ce));
}
/**
 * prefetchAllMcpResources（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:134003-134665 layout = prefetchAllMcpResources (1)
function prefetchAllMcpResources_2(e, r, n) {
  return new Promise((resolve) => {
    let h = 0,
      y = 0;
    if (((h = Object.keys(e).length), h === 0)) {
      resolve({ clients: [], tools: [], commands: [] });
      return;
    }
    let S = [],
      T = [],
      M = [],
      w = !1,
      R = () => {
        if (w) return;
        w = !0;
        let commandsMetadataLength = M.reduce((sum, command) => {
          let commandMetadataLength =
            command.name.length + (command.description ?? "").length + (command.argumentHint ?? "").length;
          return sum + commandMetadataLength;
        }, 0);
        (logEvent("tengu_mcp_tools_commands_loaded", {
          tools_count: T.length,
          commands_count: M.length,
          commands_metadata_length: commandsMetadataLength,
        }),
          resolve({ clients: S, tools: T, commands: M }));
      };
    getMcpToolsCommandsAndResources(
      (error) => {
        if ((S.push(error.client), T.push(...error.tools), M.push(...error.commands), y++, y >= h)) R();
      },
      e,
      r,
      n,
    )
      .then(R)
      .catch((E) => {
        (logMCPError("prefetchAllMcpResources", `Failed to get MCP resources: ${errorMessage(E)}`),
          resolve({ clients: [], tools: [], commands: [] }));
      });
  });
}
/**
 * transformResultContent（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:134665-135665 layout = transformResultContent (0.81)
async function transformResultContent_2(e, r, n, s, h = !1) {
  switch (e.type) {
    case "text": {
      let y = { type: "text", text: e.text };
      if (h) {
        let _meta = e._meta;
        if (_meta) y._meta = _meta;
      }
      return [y];
    }
    case "audio": {
      let y = e;
      return await persistBlobToTextBlock(
        Buffer.from(y.data, "base64"),
        y.mimeType,
        r,
        `[Audio from ${r}] `,
        s,
      );
    }
    case "image": {
      if (normalizeImageMimeType_2(e.mimeType))
        return await imageResultBlocks(Buffer.from(String(e.data), "base64"), e.mimeType, r, n, s);
      return await persistBlobToTextBlock(
        Buffer.from(String(e.data), "base64"),
        e.mimeType,
        r,
        `[Image from ${r}] `,
        s,
      );
    }
    case "resource": {
      let resource = e.resource,
        prefix = `[Resource from ${r} at ${resource.uri}] `;
      if ("text" in resource) return [{ type: "text", text: `${prefix}${resource.text}` }];
      else if ("blob" in resource)
        if (normalizeImageMimeType_2(resource.mimeType)) {
          let M = await imageResultBlocks(Buffer.from(resource.blob, "base64"), resource.mimeType, r, n, s),
            w = [];
          if (prefix) w.push({ type: "text", text: prefix });
          return (w.push(...M), w);
        } else {
          let imageBuffer = Buffer.from(resource.blob, "base64"),
            w = toStoredMcpContent(imageBuffer, resource.mimeType, r);
          if (w) return [w];
          return await persistBlobToTextBlock(imageBuffer, resource.mimeType, r, prefix, s);
        }
      return [];
    }
    case "resource_link": {
      let y = e,
        text = `[Resource link: ${y.name}] ${y.uri}`;
      if (y.description) text += ` (${y.description})`;
      return [{ type: "text", text: text }];
    }
    default:
      return [];
  }
}
//@ chunk-z1n5m6nf.js:135665-135761 layout
function Fr(e) {
  return `mcp-${normalizeNameForMCP(e)}-blob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
/**
 * MCP 图片结果的处理：缩放/降采样图片块，同时把原图保存成文件；保存成功时附一段带尺寸和文件路径的说明文本，历史持久化关闭或保存失败时只返回图片块。
 */
//@ chunk-z1n5m6nf.js:135761-136353 layout
async function imageResultBlocks(base64Data, mediaType, serverName, imageLimits, storageV5) {
  if (dy() === void 0 && addToHistory()) {
    logFeatureSad("mcp_image_result_file", "persistence_off");
    let { block: block } = await maybeResizeAndDownsampleImageBlock({
      data: base64Data,
      mediaType: mediaType,
      limits: imageLimits,
    });
    return [block];
  }
  let [{ block: imageBlock, dimensions: dimensions }, saved] = await Promise.all([
    maybeResizeAndDownsampleImageBlock({ data: base64Data, mediaType: mediaType, limits: imageLimits }),
    persistBinaryContent(base64Data, Ph(base64Data) ?? mediaType, Fr(serverName), void 0, storageV5).catch(
      (E) => (logError(E), { error: "not saved" }),
    ),
  ]);
  if ("error" in saved) return (logFeatureSad("mcp_image_result_file", "not_saved"), [imageBlock]);
  logFeatureOk("mcp_image_result_file");
  let w = (imageBlock.type === "image" ? null : await dy()?.readPicture?.(saved.filepath, base64Data)) ?? {
      block: imageBlock,
      dimensions: dimensions,
    },
    R = createImageMetadataText(w.dimensions ?? {}, saved.filepath);
  return R === null ? [w.block] : [w.block, { type: "text", text: R }];
}
//@ chunk-z1n5m6nf.js:136353-136414 layout = addToHistory (1)
function addToHistory() {
  return isSessionPersistenceDisabled() || env.CLAUDE_CODE_SKIP_PROMPT_HISTORY;
}
//@ chunk-z1n5m6nf.js:136414-136737 layout
async function persistBlobToTextBlock(e, r, n, s, h) {
  let y = await persistBinaryContent(e, r, Fr(n), void 0, h);
  if ("error" in y) {
    if (dy() !== void 0) return [{ type: "text", text: binaryNotSavedNotice(r, e.length) }];
    return [
      {
        type: "text",
        text: `${s}Binary content (${r || "unknown type"}, ${e.length} bytes) could not be saved to disk: ${y.error}`,
      },
    ];
  }
  return [{ type: "text", text: getBinaryBlobSavedMessage(y.filepath, r, y.size, s) }];
}
/**
 * inferCompactSchema（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:136737-137056 layout = inferCompactSchema (1)
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
        .map(([y, S]) => `${y}: ${inferCompactSchema_2(S, depth - 1)}`),
      suffix = Object.keys(value).length > 10 ? ", ..." : "";
    return `{${props.join(", ")}${suffix}}`;
  }
  return typeof value;
}
//@ chunk-z1n5m6nf.js:137056-137200 layout
async function transformContentArray_2(e, r, n, s) {
  let flat = (await Promise.all(e.map((y) => transformResultContent_2(y, r, n, s, !0)))).flat();
  return { content: flat, type: "contentArray", schema: inferCompactSchema_2(stripTextBlockMeta(flat)) };
}
/**
 * transformMCPResult（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:137200-138213 layout = transformMCPResult (0.902)
async function transformMCPResult_2(e, r, n, s, h) {
  if (e && typeof e === "object") {
    if ("toolResult" in e) return { content: String(e.toolResult), type: "toolResult" };
    if ("structuredContent" in e && e.structuredContent !== void 0) {
      if ("content" in e && Array.isArray(e.content)) {
        let w = await contentOverStructuredResult(e.content, (R) => transformContentArray_2(R, n, s, h));
        if (w !== void 0) return w;
      }
      let S = base64URLEncode(e.structuredContent),
        T = S ?? jsonStringify(e.structuredContent),
        M = S === void 0 ? inferCompactSchema_2(e.structuredContent) : void 0;
      if ("content" in e && Array.isArray(e.content)) {
        let filtered = e.content.filter(
          (R) => R && typeof R === "object" && "type" in R && R.type !== "text",
        );
        if (filtered.length > 0) {
          let transformedContent = (
            await Promise.all(filtered.map((item) => transformResultContent_2(item, n, s, h, !0)))
          ).flat();
          if (transformedContent.length > 0) {
            let E = [...transformedContent, { type: "text", text: T }];
            return { content: E, type: "contentArray", schema: inferCompactSchema_2(stripTextBlockMeta(E)) };
          }
        }
      }
      return { content: T, type: "structuredContent", schema: M };
    }
    if ("content" in e && Array.isArray(e.content)) return transformContentArray_2(e.content, n, s, h);
  }
  let errorMessage = `MCP server "${n}" tool "${r}": unexpected response format`;
  throw (
    logMCPError(n, errorMessage),
    Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        errorMessage,
        "MCP tool unexpected response format",
      ),
      { mcpErrorSource: "downstream_error" },
    )
  );
}
//@ chunk-z1n5m6nf.js:138213-138322 layout = isMedia (1)
function isMedia_2(block) {
  if (!block || typeof block === "string") return !1;
  return block.some((r) => r.type === "image" || r.type === "document");
}
/**
 * processMCPResult（v1 副本）。
 */
//@ chunk-z1n5m6nf.js:138322-140352 layout = processMCPResult (0.755)
async function processMCPResult_2(e, r, n, s, h, y, S, T) {
  if (
    T &&
    e !== null &&
    typeof e === "object" &&
    !("toolResult" in e) &&
    "content" in e &&
    Array.isArray(e.content)
  )
    return e.content;
  let M = await transformMCPResult_2(e, r, n, s, y),
    { type: w, schema: schema } = M,
    E = dropExtraDocumentBlocks(M.content);
  if (n === "ide") return E;
  if (T || (h && !isMedia_2(E))) return E;
  if (!(await mcpContentNeedsTruncation(E, S))) return E;
  let sizeEstimateTokens = getContentSizeEstimate(E);
  if (env.ENABLE_MCP_LARGE_OUTPUT_FILES === !1)
    return (
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("env_disabled"),
        sizeEstimateTokens: sizeEstimateTokens,
      }),
      await truncateMcpContentIfNeeded(E, S)
    );
  if (!E) return E;
  if (isMedia_2(E))
    return (
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("contains_images"),
        sizeEstimateTokens: sizeEstimateTokens,
      }),
      await truncateMcpContentIfNeeded(E, S)
    );
  let timestamp = Date.now(),
    persistId = `mcp-${normalizeNameForMCP(n)}-${normalizeNameForMCP(r)}-${timestamp}`,
    re = stripTextBlockMeta(E),
    he =
      useSubagentTruncationPrompt() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_singleton_unwrap", !0),
    G = Array.isArray(re) ? re.length : void 0,
    q =
      he &&
      Array.isArray(re) &&
      re.length === 1 &&
      re[0]?.type === "text" &&
      !("annotations" in re[0]) &&
      !("_meta" in re[0])
        ? re[0].text
        : void 0,
    j = typeof re === "string" ? re : (q ?? jsonStringify(re, null, 2)),
    fe = w === "toolResult" || q !== void 0,
    pe = fe ? "text" : "json",
    ge;
  if (fe) {
    let parts = j.split(`
`);
    if (parts.length > 1 && parts.at(-1) === "") parts.pop();
    let L = 0;
    for (let be of parts) if (be.length > L) L = be.length;
    ge = { count: parts.length, maxLen: L };
  }
  let ce = await persistToolResult(j, persistId, toolResultsDir(), y);
  if (isPersistError(ce)) {
    if (dy() !== void 0)
      return (
        logEvent("tengu_mcp_large_result_handled", {
          outcome: lit("truncated"),
          reason: lit("not_stored"),
          sizeEstimateTokens: sizeEstimateTokens,
        }),
        await truncateMcpContent(E)
      );
    let contentLength = j.length;
    return (
      logEvent("tengu_mcp_large_result_handled", {
        outcome: lit("truncated"),
        reason: lit("persist_failed"),
        sizeEstimateTokens: sizeEstimateTokens,
      }),
      `Error: result (${contentLength.toLocaleString()} characters) exceeds maximum allowed tokens. Failed to save output to file: ${ce.error}. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data.`
    );
  }
  logEvent("tengu_mcp_large_result_handled", {
    outcome: lit("persisted"),
    reason: lit("file_saved"),
    sizeEstimateTokens: sizeEstimateTokens,
    persistedSizeChars: ce.originalSize,
    truncatedAtCap: ce.truncatedAtBytes !== void 0,
    resultType: fromEnum(w),
    blockCount: G,
    persistedAs: fromEnum(pe),
  });
  let le = q !== void 0 ? getFormatDescription("toolResult") : getFormatDescription(w, schema);
  return getLargeOutputInstructions(ce.filepath, ce.originalSize, le, void 0, ge, ce.truncatedAtBytes);
}
/**
 * parseUrlElicitationRequiredError：从工具调用错误 data 中取 elicitations 数组（URL elicitation required）。
 */
//@ chunk-z1n5m6nf.js:140352-140524 layout
function parseUrlElicitationRequiredError_2(e) {
  let r = e.data;
  return (
    r != null && typeof r === "object" && "elicitations" in r && Array.isArray(r.elicitations)
      ? r.elicitations
      : []
  ).filter((s) => ElicitRequestURLParamsSchema.safeParse(s).success);
}
/**
 * classifyToolCallAuthError：把工具调用认证错误分为 step_up（insufficient_scope）或 credential_rejected。
 */
//@ chunk-z1n5m6nf.js:140524-140795 layout
function classifyToolCallAuthError_2({
  errorCode: errorCode,
  message: message,
  isUnauthorizedError: isUnauthorizedError,
  isOAuthShapedAuthError: isOAuthShapedAuthError,
  hasHeadersHelper: hasHeadersHelper,
  pendingStepUpScope: pendingStepUpScope,
}) {
  let S = pendingStepUpScope !== void 0;
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
function isNeedsApprovalOrExpiredSessionV1(e) {
  if (yZe(e)) return !0;
  if (!(e instanceof Error) || !("code" in e)) return !1;
  if (e.code === CCR_NEEDS_APPROVAL_CODE) {
    let r = "data" in e ? e.data : void 0;
    return typeof r === "object" && r !== null && "args_sha256" in r;
  }
  return e.code === -32000 && uYn(e.message);
}
/**
 * callMCPToolWithUrlElicitationRetry：调用工具，遇 URL elicitation required 错误时逐个处理 elicitation（打开 URL、等待完成）后重试。
 */
//@ chunk-z1n5m6nf.js:141020-145793 fingerprint = callMCPToolWithUrlElicitationRetry (0.408)
async function callMCPToolWithUrlElicitationRetry_2({
  client: client,
  clientConnection: clientConnection,
  tool: tool,
  args: args,
  meta: meta,
  signal: signal,
  onProgress: onProgress,
  callToolFn: callToolFn = callMCPTool_2,
  requestDialog: requestDialog,
  hasResultSizeAnnotation: hasResultSizeAnnotation = !1,
  resultNotForModel: resultNotForModel = !1,
  imageLimits: imageLimits,
  taskRegistry: taskRegistry,
  toolUseId: toolUseId,
  onAwaitingUserInput: onAwaitingUserInput,
  timing: timing,
  ccrNeedsApprovalRetry: ccrNeedsApprovalRetry,
  storageV5: storageV5,
  credentials: credentials,
  offCriticalPath: offCriticalPath,
}) {
  let pe = !1;
  for (let attempt = 0; ; attempt++)
    try {
      let ce = () =>
          callToolFn({
            client: client,
            tool: tool,
            args: args,
            meta: meta,
            offCriticalPath: offCriticalPath,
            signal: signal,
            onProgress: onProgress,
            hasResultSizeAnnotation: hasResultSizeAnnotation,
            resultNotForModel: resultNotForModel,
            imageLimits: imageLimits,
            timing: timing,
            taskRegistry: taskRegistry,
            toolUseId: toolUseId,
            storageV5: storageV5,
            credentials: credentials,
          }),
        le;
      if (!isPerfettoTracingEnabled()) le = await ce();
      else {
        let k;
        try {
          k = truncateContentForTelemetry(jsonStringify(args)).content;
        } catch {
          k = void 0;
        }
        let L = isMemoryServerConnection(client, tool),
          be = fileReferenceToolForRecords(client, tool),
          W = L || withholdsFileReferenceArguments(be, toolUseId),
          ze = withholdsFileReferenceErrorText(be, toolUseId);
        if (W && k !== void 0) k = notRecordedLength(k);
        le = await withToolExecutionSpan(
          "claude_code.mcp.rpc",
          {
            spanType: "mcp.rpc",
            attrs: {
              "rpc.system": "mcp",
              "rpc.service": client.name,
              "rpc.method": "tools/call",
              mcp_tool: tool,
              attempt: attempt,
            },
            ...(k !== void 0 && { contentAttrs: { mcp_args: k } }),
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
                  getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_proxy_needs_approval_retry", !0))),
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
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_proxy_needs_approval_retry", !0)
      ) {
        pe = !0;
        let L = error.data ?? {},
          {
            canUseTool: canUseTool,
            tool: tool_2,
            fullyQualifiedName: fullyQualifiedName,
            toolUseContext: toolUseContext,
            parentMessage: parentMessage,
          } = ccrNeedsApprovalRetry,
          Z = chromeSiteFromError(client, error.data),
          Ne = Z && chromeSiteDenyCheck(Z, getToolPermissionContext(toolUseContext));
        if (Ne) {
          let xe = Z?.kind === "unreadable";
          if (
            (logMCPDebug(
              client.name,
              `Tool '${tool}' returned -32003 needs_approval ${xe ? "naming a site this session cannot read, and the session has ClaudeInChromeDomain deny rules" : "for a site a ClaudeInChromeDomain deny rule covers"}: failing the call with no approval card`,
            ),
            xe)
          )
            logFeatureBad("chrome_permission_prompt", "hosted_site_unreadable");
          else logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
          throw (
            await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, Ne),
            toolUseContext.onPermissionDenial?.(tool_2, toolUseId, args),
            z9(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                Ne.message,
                "ccr_proxy_needs_approval_chrome_site_denied",
              ),
            )
          );
        }
        (logMCPDebug(
          client.name,
          `Tool '${tool}' returned -32003 needs_approval (tool_name=${L.tool_name}) \u2014 surfacing retroactive ` +
            "approval card",
        ),
          logEvent("tengu_mcp_proxy_needs_approval_retry", { attempt: attempt }),
          onAwaitingUserInput?.(!0));
        let Te = {
            behavior: "ask",
            suppressAlwaysAllowRule: !0,
            message: `The ${fullyQualifiedName} connector requires approval for this call.`,
            decisionReason: {
              type: "other",
              reason: "This connector call requires your approval to proceed.",
            },
          },
          we = Z && chromeSiteAsk(Z, tool, args, toolUseContext),
          Oe = we ?? Te,
          De;
        try {
          De = await canUseTool(tool_2, args, toolUseContext, parentMessage, toolUseId, Oe);
        } finally {
          onAwaitingUserInput?.(!1);
        }
        if (signal.aborted) throw z9(new AbortError());
        if (De.behavior === "allow") {
          if (De.updatedInput !== void 0 && !En(De.updatedInput, args))
            throw (
              logFeatureSad("mcp_ccr_needs_approval", "edited_input"),
              z9(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `The approval for ${fullyQualifiedName} was conditioned on edited arguments, which can't be applied on this retroactive card. To run with different arguments, deny and re-issue the call.`,
                  "ccr_proxy_needs_approval_edited_input",
                ),
              )
            );
          let xe = fYn(toolUseContext.session, toolUseId);
          if (xe !== void 0)
            throw z9(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                xe,
                "ccr_proxy_needs_approval_resend_refused",
              ),
            );
          if (Z?.kind === "named" && we && meta) meta[CLAUDECODE_CHROMESITE] = Z.site;
          if (meta) yYn(meta, toolUseContext.session, toolUseContext.toolUseId, client.name, client.config);
          continue;
        }
        if (De === Oe) throw (logFeatureSad("mcp_ccr_needs_approval", "no_prompt_surface"), z9(error));
        throw (
          logFeatureOk("mcp_ccr_needs_approval"),
          z9(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              De.message || `Approval denied for ${fullyQualifiedName}`,
              "ccr_proxy_needs_approval_denied",
            ),
          )
        );
      }
      if (error.code !== ErrorCode.UrlElicitationRequired) {
        if (pe) logFeatureBad("mcp_ccr_needs_approval", "retry_failed");
        else if (error.code === CCR_NEEDS_APPROVAL_CODE && ccrNeedsApprovalRetry)
          logFeatureBad("mcp_ccr_needs_approval", "arm_not_fired");
        throw error;
      }
      if (hostedDesktopRefusal(clientConnection) !== void 0) throw error;
      if (attempt - (pe ? 1 : 0) >= 3) throw error;
      let le = parseUrlElicitationRequiredError_2(error),
        k = clientConnection.name;
      if (le.length === 0)
        throw (
          logMCPDebug(k, `Tool '${tool}' returned -32042 but no valid elicitations in error data`),
          error
        );
      logMCPDebug(
        k,
        `Tool '${tool}' requires URL elicitation (error -32042, attempt ${attempt + 1}), processing ${le.length} elicitation(s)`,
      );
      for (let elicitation of le) {
        let { elicitationId: elicitationId } = elicitation,
          hookResponse = await runElicitationHooks(k, elicitation, signal);
        if (hookResponse) {
          if (
            (logMCPDebug(
              k,
              `URL elicitation ${elicitationId} resolved by hook: ${jsonStringify(hookResponse)}`,
            ),
            hookResponse.action !== "accept")
          )
            return {
              content: `URL elicitation was ${hookResponse.action === "decline" ? "declined" : hookResponse.action + "ed"} by a hook. The tool "${tool}" could not complete because it requires the user to open a URL.`,
              urlElicitationDeclined: { url: elicitation.url },
              isError: !0,
            };
          continue;
        }
        let ze;
        onAwaitingUserInput?.(!0);
        try {
          ze = requestDialog
            ? await requestDialog(
                MCP_URL_ELICITATION_DIALOG,
                { serverName: k, params: elicitation },
                { signal: signal },
              )
            : { action: "cancel" };
        } finally {
          onAwaitingUserInput?.(!1);
        }
        let finalResult = await runElicitationResultHooks(k, ze, signal, "url", elicitationId);
        if (finalResult.action !== "accept")
          return (
            logMCPDebug(
              k,
              `User ${finalResult.action === "decline" ? "declined" : finalResult.action + "ed"} URL elicitation ${elicitationId}`,
            ),
            {
              content: `URL elicitation was ${finalResult.action === "decline" ? "declined" : finalResult.action + "ed"} by the user. The tool "${tool}" could not complete because it requires the user to open a URL.`,
              urlElicitationDeclined: { url: elicitation.url },
              isError: !0,
            }
          );
        logMCPDebug(k, `Elicitation ${elicitationId} completed, retrying tool call`);
      }
    }
}
//@ chunk-z1n5m6nf.js:145793-146321 layout
function toolErrorResultText_2(e, r, n) {
  if (!e.isError) return;
  let s = "Unknown error";
  if (Array.isArray(e.content) && e.content.length > 0) {
    let flattened = e.content.flatMap((S) => {
      if (S == null || typeof S !== "object") return [];
      if ("text" in S) return [String(S.text)];
      if (S.type === "resource_link") {
        let T = S,
          M = `[Resource link: ${T.name}] ${T.uri}`;
        if (T.description) M += ` (${T.description})`;
        return [M];
      }
      return [];
    });
    if (flattened.length > 0)
      s = flattened.join(`
`);
  } else if ("error" in e) s = String(e.error);
  logMCPError(r, n === void 0 ? s : n(s));
  let h = stripAnthropicMeta(e._meta);
  throw new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    s,
    "MCP tool returned error",
    h ? { _meta: h } : void 0,
  );
}
/**
 * buildSep2663TaskBinding：SEP-2663 任务绑定（implementation、serverCapabilities 与 tool/prompt/resource 回调）。
 */
//@ chunk-z1n5m6nf.js:146321-146498 layout
function buildSep2663TaskBinding_2() {
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
/**
 * 调用 SDK `listTools`（v1 客户端）。
 */
//@ chunk-z1n5m6nf.js:146498-146548 layout
function fu(e, r) {
  return oa(e).listTools(void 0, r);
}
/**
 * 调用 SDK `readResource`（v1 客户端）。
 */
//@ chunk-z1n5m6nf.js:146548-146604 layout
function hu(e, r, n) {
  return oa(e).readResource({ uri: r }, n);
}
/**
 * 调用 SDK `callTool`（v1 客户端，不传结果 schema）。
 */
//@ chunk-z1n5m6nf.js:146604-146657 layout
function gu(e, r, n) {
  return oa(e).callTool(r, void 0, n);
}
/**
 * callMCPTool：真正发出 tools/call：总超时与空闲超时看门狗、进度上报、401/会话过期时刷新凭证/重连后重试一次、step-up 重新授权、错误分类与遥测，返回处理后的内容。
 */
//@ chunk-z1n5m6nf.js:146657-155462 fingerprint = callMCPTool (0.37)
async function callMCPTool_2({
  client: client,
  tool: tool,
  args: args,
  meta: meta,
  signal: signal,
  onProgress: onProgress,
  offCriticalPath: offCriticalPath = !1,
  hasResultSizeAnnotation: hasResultSizeAnnotation = !1,
  resultNotForModel: resultNotForModel = !1,
  imageLimits: imageLimits,
  timing: timing,
  taskRegistry: taskRegistry,
  toolUseId: toolUseId,
  idleTimeoutMs: idleTimeoutMs,
  isAuthRetry: isAuthRetry = !1,
  storageV5: storageV5,
  credentials: credentials,
}) {
  let { client: client_2, name: q, config: config, transportErrorState: transportErrorState } = client,
    pe = oa(client_2),
    ge = fileReferenceToolForRecords(client, tool),
    ce = withholdsFileReferenceErrorText(ge, toolUseId) ? ge : void 0,
    le = isMemoryServerConnection(client, tool)
      ? describeRedactedMcpError
      : ce !== void 0
        ? (Z) => withheldFileReferenceErrorForLog(ce, Z)
        : void 0,
    toolStartTime = Date.now(),
    L = identityEpoch(),
    be = pe.transport?.sessionId === void 0,
    W,
    ze = meta?.["claudecode/toolUseId"],
    X = {
      armedAt: 0,
      offCriticalPath: offCriticalPath,
      toolUseId: typeof ze === "string" ? ze : void 0,
      ownSends: { started: 0, ranNothing: 0 },
    };
  transportErrorState?.activeCallWatchdogs.add(X);
  let Le = transportErrorState?.toolCallSends?.started;
  try {
    logMCPDebug(q, `Calling MCP tool: ${tool}`);
    let Z = idleTimeoutMs ?? getMcpToolIdleTimeoutMs_2(config),
      Ne = toolStartTime,
      Te,
      promise = new Promise((te, Pe) => {
        Te = Pe;
      });
    W = setInterval(() => {
      let floored = Math.floor((Date.now() - toolStartTime) / 1000);
      if (
        (logMCPDebug(q, `Tool '${tool}' still running (${floored}s elapsed)`),
        X.armedAt > 0 && Date.now() - X.armedAt > 90000)
      ) {
        (logMCPDebug(
          q,
          `Tool '${tool}' aborting: transport error ${Math.floor((Date.now() - X.armedAt) / 1000)}s ago, response presumed lost`,
        ),
          Te(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `MCP server "${q}" transport dropped mid-call; response for tool "${tool}" was lost`,
                "MCP transport lost mid-call",
              ),
              { mcpErrorSource: "downstream_unreachable" },
            ),
          ));
        return;
      }
      if (transportErrorState?.pendingElicitations) Ne = Date.now();
      else if (transportErrorState && transportErrorState.lastElicitationClosedAt > Ne)
        Ne = transportErrorState.lastElicitationClosedAt;
      if (Z > 0 && Date.now() - Ne > Z) {
        let elapsedSeconds = Math.floor((Date.now() - Ne) / 1000);
        (logMCPDebug(
          q,
          `Tool '${tool}' aborting: no response or progress notification for ${elapsedSeconds}s (idle timeout ${Math.floor(Z / 1000)}s)`,
        ),
          Te(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `MCP server "${q}" tool "${tool}" sent no response or progress for ${elapsedSeconds}s; aborting. If this server is configured in your MCP settings, set a per-server "timeout" (ms) to allow longer silent runs for just this server; otherwise set CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT (ms) globally (0 disables).`,
                "MCP tool idle timeout",
              ),
              { mcpErrorSource: "downstream_unreachable" },
            ),
          ));
      }
    }, 30000);
    let Oe = getMcpToolTimeoutMs_3(config),
      De,
      timeoutPromise = new Promise((te, reject) => {
        De = setTimeout(
          (reject, name, tool, timeoutMs) => {
            reject(
              Object.assign(
                new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `MCP server "${name}" tool "${tool}" timed out after ${Math.floor(timeoutMs / 1000)}s`,
                  "MCP tool timeout",
                ),
                { mcpErrorSource: "downstream_unreachable" },
              ),
            );
          },
          Oe,
          reject,
          q,
          tool,
          Oe,
        );
      }),
      He = () => {
        if (De) clearTimeout(De);
        if (W !== void 0) (clearInterval(W), (W = void 0));
        transportErrorState?.activeCallWatchdogs.delete(X);
      },
      Fe = timing?.mark("external"),
      result = await Promise.race([
        pe.callTool({ name: tool, arguments: args, _meta: meta }, CallToolResultSchema, {
          signal: signal,
          timeout: Oe,
          onprogress: (sdkProgress) => {
            if (
              ((X.armedAt = 0),
              (Ne = Date.now()),
              lt?.reportBackgroundProgress(signal, sdkProgress),
              onProgress)
            )
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
        }),
        timeoutPromise,
        promise,
      ]).finally(() => {
        (He(), Fe?.());
      });
    toolErrorResultText_2(result, q, le);
    let Ie = Date.now() - toolStartTime,
      ve =
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
        success: !0,
      });
    let B = await processMCPResult_2(
      result,
      tool,
      q,
      imageLimits,
      hasResultSizeAnnotation,
      storageV5,
      credentials,
      resultNotForModel,
    );
    return (
      noteHearthDegraded(q, void 0),
      {
        content: B,
        _meta: result._meta,
        structuredContent: result.structuredContent,
        resourceLinks: anthropicResourceLinks(result.content),
      }
    );
  } catch (error) {
    if (!signal.aborted) noteHearthDegraded(q, error);
    if (W !== void 0) clearInterval(W);
    transportErrorState?.activeCallWatchdogs.delete(X);
    let Ne = Date.now() - toolStartTime;
    if (error instanceof Error && error.name !== "AbortError")
      logMCPDebug(
        q,
        `Tool '${tool}' failed after ${Math.floor(Ne / 1000)}s: ${le !== void 0 && error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? le(error.message) : ce !== void 0 ? withheldFileReferenceErrorForLog(ce, error.message, error.name) : describeConnectError(error, config)}`,
      );
    if (error instanceof Error) {
      let we = error instanceof McpError ? void 0 : "code" in error ? error.code : void 0,
        Oe =
          (config.type === "http" || config.type === "sse" || config.type === "ws") && !!config.headersHelper,
        isSessionExpired = hasCliOwnedBearer(config),
        xe =
          "errorCode" in error &&
          typeof error.errorCode === "string" &&
          !["invalid_grant", "invalid_client", "unauthorized_client"].includes(error.errorCode) &&
          /^HTTP 40[13]\b/.test(error.message),
        He = ht().clientAuthProviders.get(oa(client_2))?.pendingStepUpScope,
        Fe = classifyToolCallAuthError_2({
          errorCode: we,
          message: error.message,
          isUnauthorizedError: error instanceof AM,
          isOAuthShapedAuthError: xe,
          hasHeadersHelper: Oe,
          pendingStepUpScope: He,
        }),
        Ue =
          (config.type === "http" || config.type === "sse") &&
          !config.headersHelper &&
          !configHasAuthorizationHeader(config)
            ? config
            : void 0,
        Ie = !isAuthRetry && Fe === "credential_rejected" && !Oe && Ue !== void 0,
        ve = Ie && (await hasStoredRefreshToken(q, Ue)),
        Ee =
          ve ||
          (Ie &&
            dZe() &&
            ht().clientAuthProviders.get(oa(client_2))?.lastAuthRejection?.status === 401 &&
            ht().clientAuthProviders.get(oa(client_2))?.lastAuthRejection?.accessToken !== void 0);
      if ((Oe || isSessionExpired || Ue !== void 0) && !isAuthRetry) {
        let ke = ir(q, config);
        if (identityEpoch() !== L)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `MCP tool call to server "${q}" was aborted: the account changed before re-authentication`,
            "MCP tool call aborted: account changed before reauth",
          );
        let reauthInFlight = getConnectionCache().reauthInFlight,
          ye = ht(),
          Ae = reauthInFlight.get(ke),
          $e = Ae !== void 0 && Ae.epoch === L ? Ae.promise : void 0;
        ye.reauthDecisionSinkForTest?.(
          $e !== void 0 ? "joined" : Ae !== void 0 ? "stale_refused" : "started",
        );
        let ot =
          $e !== void 0 &&
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
          if (
            (logMCPDebug(
              q,
              Oe
                ? `Tool '${tool}' returned ${we ?? 401}; re-running headersHelper and retrying once`
                : isSessionExpired
                  ? `Tool '${tool}' returned ${we ?? 401}; session credential rejected \u2014 reconnecting and retrying once`
                  : ot
                    ? `Tool '${tool}' failed because a reconnect in progress closed its connection; retrying once on the new connection`
                    : `Tool '${tool}' returned ${we ?? 401}; ${ve ? "refresh token stored" : "stored sign-in rejected, no refresh token"} \u2014 reconnecting and retrying once`,
            ),
            ot)
          )
            logFeatureSad(Oe ? "mcp_headers_helper" : "mcp_oauth_refresh", "collateral_rejoin");
          if (!$e) {
            (logFeatureSad(
              Oe ? "mcp_headers_helper" : Ee && !ve ? "mcp_signed_out_fallback" : "mcp_oauth_refresh",
              "reauth_retry",
            ),
              (pe.onclose = void 0));
            let P = L;
            $e = (async () => (
              await clearServerCache_4(q, config),
              connectToServer_2(q, config, void 0, void 0, credentials)
            ))();
            let x = { promise: $e, epoch: P };
            (reauthInFlight.set(ke, x),
              $e
                .then((D) => {
                  if (D.type === "connected" && identityEpoch() === P)
                    REAUTH_RECONNECT_SIGNAL.emit(q, config);
                })
                .finally(() => {
                  if (reauthInFlight.get(ke) === x && !ye.holdStaleReauthEntryForTest)
                    reauthInFlight.delete(ke);
                })
                .catch(() => {}));
          }
          let ee = await $e;
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
              tool: tool,
              args: args,
              meta: meta,
              signal: signal,
              onProgress: onProgress,
              offCriticalPath: offCriticalPath,
              hasResultSizeAnnotation: hasResultSizeAnnotation,
              resultNotForModel: resultNotForModel,
              timing: timing,
              imageLimits: imageLimits,
              taskRegistry: taskRegistry,
              toolUseId: toolUseId,
              idleTimeoutMs: idleTimeoutMs,
              isAuthRetry: !0,
              storageV5: storageV5,
              credentials: credentials,
            });
          if (
            (logMCPDebug(q, `Auth reconnect returned '${ee.type}'; falling through to needs-auth`),
            fd() && ee.type !== "needs-auth")
          ) {
            let P = connectToServer_2.cache?.get?.(ke);
            if (P !== void 0 && (await pt(P)) === ee && connectToServer_2.cache?.get?.(ke) === P)
              getConnectionCache().connections.delete(ke);
          }
        }
      }
      if (Fe === "credential_rejected" && isSessionExpired)
        throw (
          await clearServerCache_4(q, config),
          logMCPDebug(
            q,
            `Tool '${tool}' rejected the session credential (${we ?? 401}); failing the call and clearing the connection for a fresh retry later`,
          ),
          Object.assign(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              fW.sessionCredentialRejected(q, we ?? 401),
              "MCP server rejected the session credential",
            ),
            { mcpErrorSource: "other" },
          )
        );
      if (Fe !== void 0) {
        let ke = config.type === "claudeai-proxy" && config.eligible === !1,
          oe = ke ? "not_connected" : Fe === "step_up" ? "insufficient_scope" : "token_expired";
        logMCPDebug(
          q,
          oe === "insufficient_scope"
            ? `Tool call returned 403 insufficient_scope (scope: ${redactSensitiveUrlParams("scope", He ?? "")})`
            : "Tool call returned 401 Unauthorized - token may have expired",
        );
        let ye = mcpBaseUrlAnalytics(config, q),
          Ae = isMcpServerLoggableInAnalytics(q, config);
        logEvent("tengu_mcp_tool_call_auth_error", {
          errorCode: fromNumber(we ?? (Fe === "step_up" ? 403 : 401)),
          transportType: fromEnum(config.type ?? "stdio"),
          authErrorKind: fromEnum(oe),
          ...ye,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(normalizeNameForMCP(q), Ae),
          mcpToolName: loggableMcpToolName(normalizeNameForMCP(q), normalizeNameForMCP(tool), Ae),
        });
        let $e = (config.type === "http" || config.type === "sse") && configHasAuthorizationHeader(config);
        throw new McpAuthError(
          q,
          ke
            ? fW.notConnected(q)
            : oe === "insufficient_scope"
              ? fW.stepUp(q, He)
              : Oe
                ? fW.helperRejected(q)
                : $e
                  ? fW.headerRejected(q)
                  : fW.signInAgain(q),
          oe,
          ht().clientFirstPartyBearers.get(oa(client_2))?.last,
          oe === "insufficient_scope" ? He : void 0,
        );
      }
      let te = !(config.type === "http" && we === 404 && be) && isMcpSessionExpiredError_2(error),
        Pe =
          "code" in error &&
          error.code === -32000 &&
          error.message.includes("Connection closed") &&
          (config.type === "http" || config.type === "claudeai-proxy");
      if (error instanceof HttpBodyOverflowError_2)
        throw new McpToolResultNotReadError(q, tool, { kind: "too_large", capBytes: HTTP_BODY_LIMITS });
      if (Pe && isTruncatedBodyError(transportErrorState?.closeReason))
        throw new McpToolResultNotReadError(q, tool, { kind: "connection_closed" });
      if (te || Pe) {
        logMCPDebug(
          q,
          `MCP session expired during tool call (${te ? "stale session" : "connection closed"}), clearing connection cache for re-initialization`,
        );
        let ke = mcpBaseUrlAnalytics(config, q),
          oe = isMcpServerLoggableInAnalytics(q, config),
          ye = loggableMcpToolName(normalizeNameForMCP(q), normalizeNameForMCP(tool), oe);
        (logEvent("tengu_mcp_session_expired", {
          errorCode: we !== void 0 ? fromNumber(we) : void 0,
          transportType: fromEnum(config.type ?? "stdio"),
          ...ke,
          mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(normalizeNameForMCP(q), oe),
          mcpToolName: ye,
        }),
          await clearServerCache_4(q, config));
        let Ae = didCallRunNothing(transportErrorState?.toolCallSends, Le, X.ownSends);
        throw new McpSessionExpiredError(
          q,
          te
            ? "session_expired_404"
            : bhr(transportErrorState?.closeReason) ||
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
      error instanceof kR ||
      ((Te?.name === "ZodError" || Te?.name === "$ZodError") && Array.isArray(Te?.issues))
    )
      throw new McpResponseSchemaError(q, error);
    if (!(error instanceof Error) || error.name !== "AbortError") throw error;
    return { content: INTERRUPTED_CALL_NOTICE, interrupted: !0, isError: !0 };
  } finally {
    if (W !== void 0) clearInterval(W);
  }
}
//@ chunk-z1n5m6nf.js:156945-158868 placement
async function connectAllMcpServers(e, r, n, s) {
  let h = [],
    y = [],
    S = [];
  Po();
  let settled = await Promise.allSettled(
    Object.entries(e).map(async ([w, R]) => {
      let E = new SdkControlClientTransport(w, r, validateHostManifest_2(w, n?.get(w)));
      guardTransportSend({ name: w }, E);
      let Q = new Bt(
          {
            ...freeze_2,
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
          },
          { capabilities: freeze, ...(MPe() && { jsonSchemaValidator: NO_OP_SCHEMA_VALIDATOR }) },
        ),
        H = !1;
      try {
        let connect = Q.connect(E, { timeout: getConnectionTimeoutMs() });
        if (
          !(await withDeadline(
            connect.then(() => !0),
            getConnectionTimeoutMs(),
          ))
        )
          throw (
            connect.catch(() => {}),
            E.close().catch(() => {}),
            (H = !0),
            makeConnectTimeoutError(
              `SDK MCP server "${w}" connection timed out after ${getConnectionTimeoutMs()}ms`,
            )
          );
        let serverCapabilities = Q.getServerCapabilities(),
          instructions = Q.getInstructions(),
          q = truncateServerInstructions_2(instructions, w),
          j = {
            type: "connected",
            serverInfo: Q.getServerVersion(),
            name: w,
            capabilities: serverCapabilities || {},
            instructions: q,
            client: GPn(Q),
            config: { ...R, scope: "dynamic" },
            cleanup: async () => {
              await Q.close();
            },
          },
          fe = ir(j.name, j.config);
        getConnectionCache().toolLists.delete(fe);
        let pe = [];
        if (serverCapabilities?.tools) {
          let ce = await listMcpTools(j, s);
          pe.push(...ce);
        }
        let ge = [];
        return (
          logFeatureOk("mcp_sdk_connect"),
          logManifestOutcomeV1(E.manifestOutcome, !0),
          { client: j, tools: pe, commands: ge }
        );
      } catch (error) {
        return (
          logFeatureBad("mcp_sdk_connect", H ? "mcp_sdk_connect_timeout" : "mcp_sdk_connect_failed"),
          logManifestOutcomeV1(E.manifestOutcome, !1),
          logMCPError(w, `Failed to connect SDK MCP server: ${error}`),
          { client: { type: "failed", name: w, config: { ...R, scope: "user" } }, tools: [], commands: [] }
        );
      }
    }),
  );
  for (let w of settled)
    if (w.status === "fulfilled")
      (h.push(w.value.client), y.push(...w.value.tools), S.push(...w.value.commands));
  if (h.some((w) => w.type === "connected" && !!w.capabilities?.resources)) {
    if (![ListMcpResourcesTool, ReadMcpResourceTool].some((R) => y.some((E) => toolMatchesName(E, R.name))))
      y.push(ListMcpResourcesTool, ReadMcpResourceTool, H5);
  }
  return { clients: h, tools: y, commands: S };
}
//@ chunk-z1n5m6nf.js:158868-159057 placement
async function clearServerCache_2(e) {
  await Promise.all(
    e.map(async (r) => {
      if (r.type !== "connected") return;
      try {
        await r.cleanup();
      } catch (error) {
        logForDebugging(`MCP client cleanup failed for ${r.name}: ${error}`, { level: "error" });
      }
    }),
  );
}
/**
 * 判断 MCP 输出截断时是否使用子代理提示（环境变量覆盖优先，否则看开关）。
 */
//@ chunk-e6aww6q8.js:2145813-2145923 placement
function useSubagentTruncationPrompt() {
  let MCP_TRUNCATION_PROMPT_OVERRIDE = env.MCP_TRUNCATION_PROMPT_OVERRIDE;
  return MCP_TRUNCATION_PROMPT_OVERRIDE
    ? MCP_TRUNCATION_PROMPT_OVERRIDE !== "legacy"
    : getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_subagent_prompt", !1);
}
/**
 * ensureConnectedClient：按名字找客户端并确认已连接，找不到列出可用服务器名报错。
 */
//@ chunk-e6aww6q8.js:3289283-3289667 fingerprint = ensureConnectedClient (0.344)
function ensureConnectedClient_2(clients, serverName) {
  let [r] = findServersByName(clients, serverName);
  if (!r)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Server "${serverName}" not found. Available servers: ${clients.map((s) => s.name).join(", ")}`,
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
/**
 * 判断 MCP 配置的 URL 是否为空（未配置）。
 */
//@ chunk-e6aww6q8.js:3806756-3806859 placement
function isUnconfiguredUrl(e) {
  return e.configErrorReason === "url_empty" || (!e.configError && "url" in e && e.url.trim() === "");
}
/**
 * 生成 MCP 服务器配置的规范化 JSON 指纹：去掉来源/缓存/资格等元字段，stdio 补默认 type 与 args，URL 查询参数排序，对象键排序，未配置的 URL 标记 unconfigured。
 */
//@ chunk-e6aww6q8.js:3806859-3807903 placement
function canonicalMcpConfigKey(config) {
  let {
      scope: scope,
      pluginSource: pluginSource,
      pluginPath: pluginPath,
      relayed: relayed,
      pluginEndpointTemplated: pluginEndpointTemplated,
      pluginOfficialSourceVouched: pluginOfficialSourceVouched,
      agentSource: agentSource,
      declaredIn: declaredIn,
      configError: configError,
      configErrorReason: configErrorReason,
      expandedFromEnv: expandedFromEnv,
      configuredCommand: configuredCommand,
      redialToRelearnRegistration: redialToRelearnRegistration,
      ...we
    } = config,
    canonical = we;
  if (
    (delete canonical.tools,
    delete canonical.discoveryCache,
    delete canonical.cachedInitResponse,
    delete canonical.cachedDiscoverResponse,
    delete canonical.discoverSupport,
    delete canonical.eligible,
    delete canonical.ineligibleReason,
    delete canonical.enterpriseManaged,
    canonical.type === "stdio" || (canonical.type === void 0 && "command" in canonical))
  )
    ((canonical.type = "stdio"), (canonical.args = canonical.args ?? []));
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
          let nt = firstLineOf(lt, "="),
            pt = firstLineOf(Je, "=");
          return nt < pt ? -1 : nt > pt ? 1 : 0;
        })
        .join("&") +
      ze;
  }
  if (isUnconfiguredUrl(config)) canonical.unconfigured = !0;
  if (agentSource !== void 0) canonical.agentSource = agentSource;
  return jsonStringify(canonical, (Me, We) => {
    if (We && typeof We === "object" && !Array.isArray(We)) {
      let ze = We,
        create = Object.create(null);
      for (let Je of Object.keys(ze).sort()) create[Je] = ze[Je];
      return create;
    }
    return We;
  });
}
//@ chunk-e6aww6q8.js:3807903-3807980 placement
function Yz(e) {
  return createHash_19("sha256").update(canonicalMcpConfigKey(e)).digest("hex").slice(0, 16);
}
//@ chunk-e6aww6q8.js:3807980-3808019 placement
function ir(e, n) {
  return `${e}-${Yz(n)}`;
}
//@ chunk-e6aww6q8.js:3808134-3808155 placement
var CU_DESKTOP_BINARY_NAME = "cu-desktop";
/**
 * 托管桌面会话的 computer-use 接入：mcpConfig {"computer-use": stdio /opt/cu-desktop/cu-desktop mcp, scope dynamic}，并把只读动作加入允许列表。
 */
//@ chunk-e6aww6q8.js:3808155-3808308 placement
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
    (config.type === void 0 || config.type === "stdio") &&
    [config.command, ...(config.args ?? [])].some((n) => n?.includes(CU_DESKTOP_BINARY_NAME))
  );
}
//@ chunk-e6aww6q8.js:3874164-3874197 placement
function ET(e) {
  return safeOrigin(getLoggingSafeMcpBaseUrl(e));
}
//@ chunk-e6aww6q8.js:3874197-3874221 placement
var X6r = new HostScoped(() => ({}));
/**
 * 在当前回合调度器中映射执行（没有调度器时直接映射）。
 */
//@ chunk-e6aww6q8.js:3874221-3874328 placement
async function mapInTurns(e, n) {
  let { turns: turns } = X6r.of(getRootSession().host);
  return turns === void 0 ? e.map((s) => n(s)) : turns.mapInTurns(e, n);
}
//@ chunk-e6aww6q8.js:3874328-3874407 placement
function vF(e = !1) {
  return (
    env.CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH ?? (e ? MAX_STRUCTURED_RESULT_CHARS : MAX_CALL_MARK_CHARS)
  );
}
/**
 * 检测工具描述中工具调用 XML 的标记：invoke 标签与常见 HTML 标签名（不视为参数名）。
 */
//@ chunk-e6aww6q8.js:3874407-3874856 placement
var INVOKE_TAG_MARKERS = [
    "<invoke>",
    "<invoke ",
    "<invoke\t",
    `<invoke
`,
    "</invoke>",
  ],
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
/**
 * 检查 MCP 工具描述与参数描述中是否含工具调用式 XML：invoke 标签，或以参数名为标签名的标记。
 */
//@ chunk-e6aww6q8.js:3874856-3875447 placement
function detectToolCallXml(tool, maxDescChars) {
  let properties = tool.inputSchema?.properties ?? {},
    propertyNames = Object.keys(properties),
    texts = [];
  if (tool.description) texts.push(tool.description.slice(0, maxDescChars));
  for (let L of propertyNames) {
    let G = properties[L],
      q = G && typeof G === "object" && "description" in G ? G.description : void 0;
    if (typeof q === "string") texts.push(q);
  }
  if (texts.length === 0) return;
  let joined = texts.join(`
`);
  if (!joined.includes("<")) return;
  let lower = joined.toLowerCase();
  if (INVOKE_TAG_MARKERS.some((L) => lower.includes(L))) return "invoke";
  let paramTags = new Set();
  for (let L of propertyNames) {
    let lower = L.toLowerCase();
    if (L.length >= 4 && !COMMON_HTML_TAGS.has(lower)) paramTags.add(lower);
  }
  for (let [, L = ""] of lower.matchAll(/<([^<>]*)>/g))
    if (paramTags.has(L) || (L.startsWith("/") && paramTags.has(L.slice(1)))) return "param";
  return;
}
/**
 * 统计并上报 MCP 服务器工具描述与说明中含工具调用式 XML 的情况。
 */
//@ chunk-e6aww6q8.js:3875447-3875943 placement
async function logToolCallXmlInDescriptions(e, n, r, s, h) {
  let y = vF(!0),
    S = 0,
    w = 0,
    L,
    G = await mapInTurns(e, (ke) => detectToolCallXml(ke, y));
  for (let [ke, we] of G.entries()) {
    if (we === void 0) continue;
    if (we === "invoke") S++;
    else w++;
    L ??= e[ke]?.name;
  }
  let q = h?.slice(0, vF()).toLowerCase(),
    Z = q !== void 0 && INVOKE_TAG_MARKERS.some((ke) => q.includes(ke)),
    Se = S + w;
  if (Se === 0 && !Z) return;
  logEvent("tengu_mcp_description_contains_toolcall_xml", {
    matchedToolCount: Se,
    invokeCount: S,
    paramCount: w,
    instructionsMatch: Z,
    sampleToolName: L ? loggableMcpToolName(n, L, r) : void 0,
    mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(n, r),
    ...(s && { mcpServerBaseUrl: s }),
  });
}
//@ chunk-e6aww6q8.js:3875943-3875971 placement
var m$n = "</invoke>",
  J6r = 256;
//@ chunk-e6aww6q8.js:3875971-3876067 placement
function mcpToolInputToAutoClassifierInput_2(input, toolName) {
  return (
    input.length >= toolName.length && input.slice(-toolName.length).toLowerCase() === toolName.toLowerCase()
  );
}
/**
 * 去掉 MCP 工具参数末尾多余的 invoke 结束标签。
 */
//@ chunk-e6aww6q8.js:3876067-3876972 placement
function stripTrailingInvokeSuffix(e, n, r, s, h, y) {
  let S = e;
  for (let [w, L] of Object.entries(e)) {
    if (typeof L !== "string") continue;
    let G = L.length - 1;
    while (
      G >= 0 &&
      (L.charCodeAt(G) === 32 || L.charCodeAt(G) === 9 || L.charCodeAt(G) === 10 || L.charCodeAt(G) === 13)
    )
      G--;
    if (G >= 0) {
      let code = L.charCodeAt(G);
      if (code >= 33 && code <= 126 && code !== 62) continue;
    }
    let trimEnd = L.trimEnd();
    if (!mcpToolInputToAutoClassifierInput_2(trimEnd, m$n)) continue;
    trimEnd = trimEnd.slice(0, -m$n.length).trimEnd();
    let Z = `</${w}>`,
      Se = mcpToolInputToAutoClassifierInput_2(trimEnd, Z);
    if (Se) trimEnd = trimEnd.slice(0, -Z.length).trimEnd();
    let ke = Se && (w.length > J6r || new RegExp(`<${urlPatternToRegex_2(w)}[\\s>/]`, "i").test(L)),
      we = !Se ? lit_2("param_close") : ke ? lit_2("open_guard") : void 0;
    if (
      (logEvent("tengu_mcp_arg_trailing_invoke_suffix", {
        wouldStrip: we === void 0,
        missKind: we,
        flagOn: h,
        paramNameLen: w.length,
        strippedToLen: trimEnd.length,
        mcpToolName: loggableMcpToolName(r, n, s),
        mcpServerName: mcpNameForAnalytics_GATE_EVALUATED(r, s),
        ...(y && { mcpServerBaseUrl: y }),
      }),
      we !== void 0 || !h)
    )
      continue;
    if (S === e) S = { ...e };
    ((S[w] = trimEnd),
      logMCPDebug(r, `stripped trailing </${w}></invoke> from ${n}.${w} (model emission artifact)`));
  }
  return S;
}
/**
 * 工具输入缺少必填参数时收集诊断：必填数、缺失数、已有键数、最长字符串长度，以及字符串值里是否残留 </parameter>、</invoke> 或参数名闭合标签之类伪标签碎片。
 */
//@ chunk-e6aww6q8.js:3876972-3877861 placement
function describeMissingRequiredArgs(input, schema) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input) || schema === void 0) return null;
    let required = schema.required;
    if (!Array.isArray(required) || required.length === 0) return null;
    let filtered = required.filter((G) => typeof G === "string");
    if (filtered.length === 0) return null;
    let h = input,
      reduced = filtered.reduce((G, q) => G + (Object.hasOwn(h, q) ? 0 : 1), 0);
    if (reduced === 0) return null;
    let S = new Set(
        [...Object.keys(schema.properties ?? {}), ...filtered]
          .filter((G) => G.length >= 4 && !COMMON_HTML_TAGS.has(G.toLowerCase()))
          .map((G) => G.toLowerCase()),
      ),
      w = 0,
      L = !1;
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
        L = !0;
        continue;
      }
      for (let [, Z = ""] of lower.matchAll(/<\/([^<>]*)>/g))
        if (S.has(Z)) {
          L = !0;
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
/**
 * McpAuthError：MCP 认证错误（带服务器名）。
 */
//@ chunk-cyj440je.js:715-954 fingerprint = McpAuthError (0.526)
class McpAuthError extends Error {
  authErrorKind;
  firstPartyBearer;
  requestedScope;
  serverName;
  constructor(e, r, o = "token_expired", n, a) {
    super(r);
    this.authErrorKind = o;
    this.firstPartyBearer = n;
    this.requestedScope = a;
    ((this.name = "McpAuthError"), (this.serverName = e));
  }
}
/**
 * McpToolFileInputRejectedError：MCP 工具文件输入被拒绝。
 */
//@ chunk-cyj440je.js:954-1049 layout
class McpToolFileInputRejectedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  constructor(e, r) {
    super(e, "MCP tool file input rejected");
    this.code = r;
  }
}
/**
 * McpSessionExpiredError：HTTP 会话过期（404）或连接关闭时抛出，expiryKind 区分原因。
 */
//@ chunk-cyj440je.js:1049-1697 fingerprint = McpSessionExpiredError (0.409)
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
        return !1;
      case "connection_closed_http":
        return !0;
    }
  }
}
/**
 * McpCredentialStoreUnavailableError：凭证存储读不了（如 macOS 钥匙串锁定）时抛出，消息给出处理办法。
 */
//@ chunk-cyj440je.js:1697-2321 layout
class McpCredentialStoreUnavailableError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  constructor(e, r = "unreadable") {
    if (r === "unreadable")
      super(
        `Couldn't read the stored credentials for MCP server "${e}", so the request didn't run. ${getPlatform() === "macos" ? "If your Mac's keychain is locked, unlock it, then try again." : "Try again."}`,
        "MCP credential store could not be read",
      );
    else
      super(
        `A request to MCP server "${e}" was sent without your stored credentials, so the server rejected it. The credentials are available now. Try again.`,
        "MCP credentials were read only after a request went out without them",
      );
    ((this.code = "CREDENTIAL_STORE_UNAVAILABLE"), (this.name = "McpCredentialStoreUnavailableError"));
  }
}
/**
 * MCP 工具调用失败的错误类（name 为 McpToolCallError），在通用错误基础上携带服务器返回的 `_meta`（mcpMeta），供遥测与结果展示。
 */
//@ chunk-cyj440je.js:2321-2427 fingerprint = McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (0.82)
class McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  mcpMeta;
  constructor(e, r, o, n) {
    super(e, r, n);
    this.mcpMeta = o;
    this.name = "McpToolCallError";
  }
}
//@ chunk-7zr1t9gr.js:302-360 placement
var n = "Error POSTing to endpoint: MCP server not allowed";
//@ chunk-7zr1t9gr.js:667-722 placement
function USn() {
  return (getMcpClientsFromAccessor() ?? []).find((t) => t.name === CLAUDE_ARTIFACTS);
}
//@ chunk-7zr1t9gr.js:722-780 placement
function G6o() {
  return hasLiveState() ? getLiveState().mcpEntryRowNotServed : null;
}
//@ chunk-7zr1t9gr.js:780-813 placement
function n4e(t) {
  return G6o() === t;
}
/**
 * MCP 连接超时：env `MCP_TIMEOUT`（>0，上限 2^31-1）否则默认 30000ms。
 */
//@ chunk-3pdgd98q.js:226-303 fingerprint = getConnectionTimeoutMs (1)
function getConnectionTimeoutMs() {
  let MCP_TIMEOUT = env.MCP_TIMEOUT;
  return MCP_TIMEOUT && MCP_TIMEOUT > 0 ? Math.min(MCP_TIMEOUT, 2147483647) : 30000;
}
//@ chunk-3pdgd98q.js:303-391 placement
function A4e() {
  let MCP_CONNECT_TIMEOUT_MS = env.MCP_CONNECT_TIMEOUT_MS;
  return MCP_CONNECT_TIMEOUT_MS && MCP_CONNECT_TIMEOUT_MS > 0
    ? Math.min(MCP_CONNECT_TIMEOUT_MS, 2147483647)
    : 5000;
}
//@ chunk-3pdgd98q.js:391-421 placement
var Npe = 2000,
  Qai = 8000,
  Zai = 500;
//@ chunk-qsdkv90t.js:302-371 placement
function s() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-qsdkv90t.js:371-1385 placement
async function refreshMcpServerTools(e, c, d) {
  let i = ir(e.name, e.config),
    {
      captureDiscoveryGrantLeg: captureDiscoveryGrantLeg,
      ensureDiscoveryCacheAccount: ensureDiscoveryCacheAccount,
      getMcpIdentityEpoch: getMcpIdentityEpoch,
      persistRefreshedToolsIfPresent: persistRefreshedToolsIfPresent,
    } = s();
  ensureDiscoveryCacheAccount();
  let a = fd() ? captureDiscoveryGrantLeg(e.name, e.config) : void 0,
    toolRefreshSequences = ht().toolRefreshSequences,
    r = toolRefreshSequences.get(e) ?? { started: 0, applied: 0 };
  (toolRefreshSequences.set(e, r), (r.started += 1));
  let started = r.started,
    { fetchToolsForClient: fetchToolsForClient } = s(),
    v = fetchToolsForClient.cache.get(i),
    g = getMcpIdentityEpoch();
  fetchToolsForClient.cache.delete(i);
  let o = await fetchToolsForClient(e, d),
    toolsListErrorForResult = s().getToolsListErrorForResult(o);
  if (toolsListErrorForResult) return { status: "kept-previous", error: toolsListErrorForResult };
  if (e.discoveryAuthFailure && o.length === 0)
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
  if (((r.applied = started), c(e.name, decorateMcpTools(e, o)), a))
    a.then((y) => persistRefreshedToolsIfPresent(e, o, { identityEpoch: g, grantLeg: y }));
  return { status: "refreshed", newTools: o, previousToolsPromise: v };
}
//@ chunk-18hwfzwa.js:682582-682744 fingerprint = processBatched (1)
async function processBatched(h, x) {
  let D = await listSubagentTranscripts(h, x),
    L = await pMap(
      D.filter((ee) => G$(ee.agentId)),
      (ee) => readAgentMetaFiles(h, ee, x),
      { concurrency: MAX_META_READ_CONCURRENCY },
    );
  return buildAgentTree(L.filter((ee) => ee !== null));
}
/**
 * getMcpAuthCachePath：needs-auth 缓存文件路径（<配置目录>/mcp-needs-auth-cache.json）。
 */
//@ chunk-23fm9f0d.js:17344-17604 fingerprint = getMcpAuthCachePath (0.644)
async function getMcpAuthCachePath() {
  let e = emptyCleanupResult(),
    r = getCutoffDate();
  if (r === null) return e;
  let s = join(getClaudeConfigDir(), "mcp-needs-auth-cache.json");
  try {
    if (await unlinkIfOld(s, r, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error))
      if ((e.errors++, isCleanupQuietFsErrno(error)))
        logForDebugging(`cleanup mcp-auth-cache failed: ${error.code}`, { level: "error" });
      else logError(error);
  }
  return e;
}
//@ chunk-5bdzenzx.js:16639-16696 fingerprint = isIncludedMcpTool (1)
function isIncludedMcpTool(tool) {
  return !tool.name?.startsWith("mcp__ide__");
}
/**
 * MCP 客户端 clientInfo（v2 副本所在模块）。
 */
//@ chunk-mdk8a5r0.js:284-480 fingerprint = setupSdkMcpClients (0.425)
var freeze = Object.freeze({}),
  freeze_2 = Object.freeze({
    name: "claude-code",
    title: "Claude Code",
    description: "Anthropic's agentic coding tool",
    websiteUrl: "https://claude.com/claude-code",
  }),
  n_mdk8 = Symbol("swallow");

export {
  isDesktopComputerUseCommand,
  ir,
  processBatched,
  refreshMcpServerTools,
  G6o,
  Npe,
  A4e,
  McpAuthError,
  McpSessionExpiredError,
  ET,
  McpCredentialStoreUnavailableError,
  getHostedDesktopComputerUseConfig,
  Yz,
  getMcpAuthCachePath,
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getConnectionTimeoutMs,
  isIncludedMcpTool,
  USn,
  n,
  hasNoTransport,
  isTimeoutError,
  Fs,
  ui,
  isRetryableListError,
  ensureConnectedClient_2,
  mapInTurns,
  n4e,
  useSubagentTruncationPrompt,
  describeMissingRequiredArgs,
  canonicalMcpConfigKey,
  vF,
  getMcpAuthCache,
  McpToolFileInputRejectedError,
  n_mdk8,
  Qai,
  Zai,
  freeze,
  freeze_2,
  mcpBaseUrlAnalytics,
  isMcpAuthCached_3,
  NEEDS_AUTH_CACHE_REFRESHABLE_TTL_MS_2,
  connectToServer_2,
  truncateDescription_2,
  shouldNormalizeRootCombinators_2,
  shouldDropInvalidToolSchemas_2,
  isIncludedMcpTool_3,
  logToolCallXmlInDescriptions,
  ln,
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
